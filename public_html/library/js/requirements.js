import { capabilityById, detectCapability } from './capabilities.js';
import { getBrowserEnvironment } from './environment.js';
import { probeFeature } from './feature-probe.js';

const reasonMessages = {
  'insecure-context': 'This feature needs a secure context such as HTTPS or localhost.',
  'ios-webkit':
    'All browsers on iOS and iPadOS use WebKit, so this Chromium-only feature is unavailable.',
  'needs-flag-or-origin-trial': 'This experimental feature needs a browser flag or Origin Trial.',
  'blocked-by-permissions-policy': 'The embedding page policy blocks this feature.',
  'unsupported-browser': 'This browser does not support this feature.',
  unknown: 'The availability of this feature could not be determined.',
};

async function getFeatureData() {
  const response = await fetch('/library/data/web-features.json');
  if (!response.ok) throw new Error('Feature support data could not be loaded.');
  return response.json();
}

function classifyReason({ item, detection, environment }) {
  if (item?.requiresSecureContext && !environment.secureContext) return 'insecure-context';
  if (item?.chromiumOnly && environment.isIOS) return 'ios-webkit';
  if (detection.reason === 'needs-flag-or-origin-trial' || item?.id === 'webmcp') {
    return 'needs-flag-or-origin-trial';
  }
  if (
    item?.permissionsPolicyFeature &&
    environment.permissionsPolicy?.length &&
    !environment.permissionsPolicy.includes(item.permissionsPolicyFeature)
  ) {
    return 'blocked-by-permissions-policy';
  }
  if (item?.chromiumOnly && environment.engine !== 'Blink') return 'unsupported-browser';
  if (detection.status === 'unsupported') return 'unsupported-browser';
  return 'unknown';
}

function humanizeReason(code) {
  return reasonMessages[code] ?? reasonMessages.unknown;
}

function featureFor(id, item, data) {
  const key = item?.web_features_id ?? id;
  return data?.features?.find((feature) => feature.id === key);
}

function browserSupport(feature) {
  return {
    chrome: feature?.support?.chrome ?? null,
    safari: feature?.support?.safari ?? null,
  };
}

function renderBanner(container, results) {
  if (!container) return;
  const missingRequired = results.filter(
    (result) => result.required && result.status !== 'supported',
  );
  const missingOptional = results.filter(
    (result) => !result.required && result.status !== 'supported',
  );
  container.replaceChildren();
  const appendBanner = (missing, required) => {
    if (!missing.length) return;
    const banner = document.createElement('section');
    banner.className = `requirement-banner ${required ? 'is-required' : 'is-optional'}`;
    banner.setAttribute('role', required ? 'alert' : 'status');
    const heading = document.createElement('h2');
    heading.textContent = required
      ? 'Required browser features are missing'
      : 'Optional enhancements are unavailable';
    banner.append(heading);
    const list = document.createElement('ul');
    for (const result of missing) {
      const row = document.createElement('li');
      const link = document.createElement('a');
      link.href = `/browser-features/#${encodeURIComponent(result.id)}`;
      link.textContent = result.name;
      row.append(link, ` — ${humanizeReason(result.reason)}`);
      const support = document.createElement('span');
      support.className = 'requirement-support';
      support.textContent = ` Chrome: ${result.support.chrome ?? '—'} · Safari: ${result.support.safari ?? '—'}`;
      row.append(support);
      list.append(row);
    }
    banner.append(list);
    container.append(banner);
  };
  appendBanner(missingRequired, true);
  appendBanner(missingOptional, false);
}

export async function checkRequirements(
  { required = [], optional = [], container, render = true } = {},
  dependencies = {},
) {
  const environment =
    dependencies.environment ?? (await (dependencies.getEnvironment ?? getBrowserEnvironment)());
  const data =
    dependencies.featureData ??
    (await (dependencies.getFeatureData ?? getFeatureData)().catch(() => null));
  const capabilities = dependencies.capabilities ?? capabilityById;
  const runDetection = dependencies.detectCapability ?? detectCapability;
  const runProbe = dependencies.probeFeature ?? probeFeature;
  const ids = [...new Set([...required, ...optional])];
  const results = await Promise.all(
    ids.map(async (id) => {
      const isRequired = required.includes(id);
      const item = capabilities instanceof Map ? capabilities.get(id) : capabilities[id];
      let detection;
      let feature = featureFor(id, item, data);

      if (item) {
        detection = await runDetection(item);
      } else if (feature) {
        const probed = runProbe(feature);
        detection = {
          status:
            probed.status === 'supported' || probed.status.startsWith('partial(')
              ? 'supported'
              : 'unsupported',
          detail: probed.status,
        };
      } else {
        detection = {
          status: 'untestable',
          detail: 'No capability or feature data matches this identifier.',
        };
      }

      if (
        detection.status === 'supported' &&
        item?.requiresSecureContext &&
        !environment.secureContext
      ) {
        detection = { ...detection, status: 'unsupported' };
      }
      if (detection.status === 'supported' && item?.chromiumOnly && environment.isIOS) {
        detection = { ...detection, status: 'unsupported' };
      }

      const reason =
        detection.status === 'supported' ? null : classifyReason({ item, detection, environment });
      return {
        id,
        name: item?.name ?? feature?.name ?? id,
        required: isRequired,
        status: detection.status,
        reason,
        detail: detection.detail ?? '',
        support: browserSupport(feature),
      };
    }),
  );

  const ok = results.every((result) => !result.required || result.status === 'supported');
  if (render) renderBanner(container, results);
  return { ok, results };
}

export { classifyReason, humanizeReason };
