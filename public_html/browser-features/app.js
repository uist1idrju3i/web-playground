import { capabilities, detectCapability } from '/library/js/capabilities.js';
import { getBrowserEnvironment } from '/library/js/environment.js';
import { probeFeature } from '/library/js/feature-probe.js';
import { checkRequirements } from '/library/js/requirements.js';
import { probeResizableMemoryBuffer } from '/library/js/wasm-probes.js';
import { runWasmToolchains } from '/library/js/wasm-toolchains.js';
import { registerTools } from '/library/js/webmcp.js';

const featureDataResponse = await fetch('/library/data/web-features.json');
if (!featureDataResponse.ok) throw new Error('Feature data could not be loaded.');
const featureData = await featureDataResponse.json();
const environment = await getBrowserEnvironment();
const resizableMemoryBufferResult = probeResizableMemoryBuffer();
const requirementState = await checkRequirements({
  required: ['fetch', 'es-modules'],
  optional: ['webmcp'],
  container: document.querySelector('#requirements'),
});
const capabilityResults = await Promise.all(
  capabilities.map(async (capability) => ({
    capability,
    result: await detectCapability(capability),
  })),
);
const layerOneResults = new Map(
  capabilityResults
    .filter(({ capability }) => capability.id.startsWith('wasm-'))
    .map(({ capability, result }) => [capability.id, result]),
);
const wasmToolchainResults = await runWasmToolchains(layerOneResults);
const featureRows = featureData.features.map((feature) => ({
  feature,
  probe: probeFeature(feature),
}));
function text(element, value) {
  element.textContent = value ?? '—';
}

function renderEnvironment() {
  const rows = [
    [
      'Browser',
      `${environment.browser}${environment.browserVersion ? ` ${environment.browserVersion}` : ''}`,
    ],
    ['Engine', environment.isIOS ? 'WebKit · iOS/iPadOS browser' : environment.engine],
    ['Operating system', environment.os],
    ['Secure context', environment.secureContext ? 'Yes' : 'No'],
    ['Cross-origin isolated', environment.crossOriginIsolated ? 'Yes' : 'No'],
    [
      'Screen',
      `${environment.screen.width} × ${environment.screen.height} · DPR ${environment.screen.devicePixelRatio}`,
    ],
    [
      'Color',
      `${environment.screen.colorGamut}${environment.screen.hdr ? ' · HDR' : ''} · ${environment.screen.colorDepth}-bit`,
    ],
    [
      'Input',
      `${environment.input.pointer.join(', ') || 'unknown'} pointer · ${environment.input.maxTouchPoints} touch points`,
    ],
    [
      'Network',
      environment.network
        ? `${environment.network.effectiveType ?? 'unknown'} · ${environment.network.downlink ?? '?'} Mbps`
        : 'Not exposed',
    ],
    [
      'Storage estimate',
      environment.storage?.quota
        ? `${(environment.storage.quota / 1024 / 1024 / 1024).toFixed(1)} GB quota`
        : 'Not exposed',
    ],
    [
      'Permissions Policy',
      environment.permissionsPolicy.length
        ? environment.permissionsPolicy.join(', ')
        : 'No feature list exposed',
    ],
    [
      'UA Client Hints',
      environment.userAgentData.platform
        ? `${environment.userAgentData.platform}${environment.userAgentData.platformVersion ? ` ${environment.userAgentData.platformVersion}` : ''}`
        : 'Not exposed',
    ],
  ];
  const grid = document.querySelector('#environment-grid');
  grid.replaceChildren(
    ...rows.map(([label, value]) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'environment-item';
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      if (label === 'Permissions Policy') {
        wrapper.classList.add('permissions-policy-item');
        const details = document.createElement('details');
        details.className = 'permissions-policy-details';
        const summary = document.createElement('summary');
        summary.textContent = environment.permissionsPolicy.length
          ? `${environment.permissionsPolicy.length} allowed features`
          : 'No feature list exposed';
        const featureList = document.createElement('ul');
        featureList.className = 'permissions-policy-features';
        for (const feature of environment.permissionsPolicy) {
          const item = document.createElement('li');
          item.textContent = feature;
          featureList.append(item);
        }
        details.append(summary, featureList);
        details.addEventListener('toggle', () => {
          wrapper.classList.toggle('is-expanded', details.open);
        });
        description.append(details);
      } else {
        description.textContent = value;
      }
      wrapper.append(term, description);
      return wrapper;
    }),
  );
}

function statusClass(status) {
  if (status === 'supported') return 'status-supported';
  if (status === 'partial' || status.startsWith('partial(')) return 'status-partial';
  if (status === 'untestable') return 'status-untestable';
  return 'status-unsupported';
}

function statusLabel(status) {
  if (status.startsWith('partial(')) return `Partial ${status.slice('partial('.length, -1)}`;
  return status[0].toUpperCase() + status.slice(1);
}

function chip(status) {
  const badge = document.createElement('span');
  badge.className = `status-chip ${statusClass(status)}`;
  badge.textContent = statusLabel(status);
  return badge;
}

const requestedCapabilityCount = 10;

function capabilityItem({ capability, result }, index) {
  const item = document.createElement('li');
  item.className = 'capability-item';
  item.id = capability.id;
  item.dataset.capabilityId = capability.id;
  const number = document.createElement('span');
  number.className = 'capability-number';
  number.textContent = String(index + 1).padStart(2, '0');
  const copy = document.createElement('div');
  copy.className = 'capability-copy';
  const title = document.createElement('h4');
  title.textContent = capability.name;
  const detail = document.createElement('p');
  detail.textContent = result.detail;
  const category = document.createElement('span');
  category.className = 'capability-category';
  category.textContent = capability.category;
  copy.append(title, detail, category);
  item.append(number, copy, chip(result.status));
  return item;
}

function renderCapabilities() {
  const container = document.querySelector('#capability-list');
  // WebAssembly probes are shown with their execution details in the WebAssembly section.
  const shown = capabilityResults.filter(({ capability }) => !capability.id.startsWith('wasm-'));
  const groups = new Map([['Requested capabilities', shown.slice(0, requestedCapabilityCount)]]);
  for (const entry of shown.slice(requestedCapabilityCount)) {
    const name = entry.capability.category;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(entry);
  }
  let index = 0;
  const sections = [...groups].map(([name, entries]) => {
    const group = document.createElement('details');
    group.className = 'capability-group';
    group.open = true;
    const summary = document.createElement('summary');
    const heading = document.createElement('h3');
    heading.textContent = name;
    const supported = entries.filter(({ result }) => result.status === 'supported').length;
    const count = document.createElement('span');
    count.className = 'capability-group-count';
    count.textContent = `${supported} of ${entries.length} supported`;
    summary.append(heading, count);
    const list = document.createElement('ol');
    list.className = 'capability-list';
    for (const entry of entries) list.append(capabilityItem(entry, index++));
    group.append(summary, list);
    return group;
  });
  container.replaceChildren(...sections);
  text(document.querySelector('#capability-count'), `${shown.length} read-only checks`);
}

function renderWasmProbes() {
  const probes = [
    ...capabilityResults.filter(({ capability }) => capability.id.startsWith('wasm-')),
    {
      capability: { id: 'wasm-resizable-buffer', name: 'Resizable WebAssembly memory buffer' },
      result: resizableMemoryBufferResult,
    },
  ];
  const list = document.querySelector('#wasm-probe-list');
  list.replaceChildren(
    ...probes.map(({ capability, result }) => {
      const item = document.createElement('li');
      item.className = 'capability-item';
      item.dataset.wasmProbeId = capability.id;
      const copy = document.createElement('div');
      copy.className = 'capability-copy';
      const title = document.createElement('h3');
      title.textContent = capability.name;
      const detail = document.createElement('p');
      detail.textContent = result.detail;
      copy.append(title, detail);
      item.append(copy, chip(result.status));
      return item;
    }),
  );
  text(document.querySelector('#wasm-count'), `${probes.length} executable probes`);
}

function renderWasmToolchains() {
  const list = document.querySelector('#wasm-toolchain-list');
  list.replaceChildren();
  if (wasmToolchainResults.error) {
    const item = document.createElement('li');
    item.className = 'loading-state';
    item.textContent = wasmToolchainResults.error;
    list.append(item);
    return;
  }
  for (const profile of wasmToolchainResults.profiles) {
    const item = document.createElement('li');
    item.className = 'capability-item';
    item.dataset.wasmToolchainId = profile.id;
    const copy = document.createElement('div');
    copy.className = 'capability-copy';
    const title = document.createElement('h3');
    title.textContent = profile.id;
    const detail = document.createElement('p');
    detail.textContent = profile.detail;
    copy.append(title, detail);
    const mark = document.createElement('span');
    mark.className = `status-chip ${statusClass(profile.status)}`;
    mark.textContent = profile.status === 'supported' ? '○' : '×';
    mark.setAttribute(
      'aria-label',
      profile.status === 'supported' ? 'Profile passed' : 'Profile failed',
    );
    item.append(copy, mark);
    list.append(item);
  }
}

function mdnUrl(compatKey) {
  const [family, ...rest] = compatKey.split('.');
  const segment = rest
    .map((part) => part.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase())
    .join('/');
  const section = family === 'api' ? 'Web/API' : family === 'css' ? 'Web/CSS' : 'Web/HTML';
  return `https://developer.mozilla.org/docs/${section}/${segment}`;
}

function createFeatureCard({ feature, probe }) {
  const details = document.createElement('details');
  details.className = 'feature-card';
  details.id = feature.id;
  const summary = document.createElement('summary');
  const name = document.createElement('span');
  const featureName = document.createElement('span');
  featureName.className = 'feature-name';
  featureName.textContent = feature.name;
  const featureId = document.createElement('span');
  featureId.className = 'feature-id';
  featureId.textContent = feature.id;
  name.append(featureName, featureId);
  const chrome = document.createElement('span');
  chrome.className = 'feature-version';
  chrome.textContent = `Chrome ${feature.support.chrome ?? '—'}`;
  const safari = document.createElement('span');
  safari.className = 'feature-version';
  safari.textContent = `Safari ${feature.support.safari ?? '—'}`;
  const baseline = document.createElement('span');
  baseline.className = 'feature-version';
  baseline.textContent = `Baseline ${feature.baseline.status}`;
  summary.append(name, chrome, safari, baseline, chip(probe.status));

  const content = document.createElement('div');
  content.className = 'feature-detail';
  const description = document.createElement('p');
  description.textContent = feature.description || 'No summary is available for this feature.';
  const probes = document.createElement('ul');
  probes.className = 'probe-list';
  const entries = probe.results.length
    ? probe.results
    : [
        {
          key: 'No compatibility keys',
          status: 'untestable',
          detail: 'No key can be probed at runtime.',
        },
      ];
  for (const entry of entries) {
    const row = document.createElement('li');
    const key = document.createElement('span');
    key.className = 'probe-key';
    key.textContent = entry.key;
    const result = document.createElement('span');
    result.textContent = `${statusLabel(entry.status)} · ${entry.detail}`;
    row.append(key, result);
    probes.append(row);
  }
  const links = document.createElement('div');
  links.className = 'feature-links';
  if (feature.compat_features[0]) {
    const mdn = document.createElement('a');
    mdn.href = mdnUrl(feature.compat_features[0]);
    mdn.target = '_blank';
    mdn.rel = 'noreferrer';
    mdn.textContent = 'MDN reference';
    links.append(mdn);
  }
  for (const [index, spec] of feature.spec.entries()) {
    const link = document.createElement('a');
    link.href = spec;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = feature.spec.length > 1 ? `Specification ${index + 1}` : 'Specification';
    links.append(link);
  }
  content.append(description, probes, links);
  details.append(summary, content);
  return details;
}

const pageSize = 48;
let visibleLimit = pageSize;
let filteredRows = featureRows;

function populateGroups() {
  const groups = [...new Set(featureData.features.map((feature) => feature.group))].sort();
  const select = document.querySelector('#group-filter');
  for (const group of groups) {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = group;
    select.append(option);
  }
}

function renderFeatures() {
  const search = document.querySelector('#feature-search').value.trim().toLowerCase();
  const status = document.querySelector('#status-filter').value;
  const group = document.querySelector('#group-filter').value;
  const baseline = document.querySelector('#baseline-filter').value;
  filteredRows = featureRows.filter(({ feature, probe }) => {
    if (
      search &&
      !`${feature.name} ${feature.id} ${feature.description}`.toLowerCase().includes(search)
    )
      return false;
    if (
      status &&
      (status === 'partial' ? !probe.status.startsWith('partial(') : probe.status !== status)
    )
      return false;
    if (group && feature.group !== group) return false;
    return !baseline || feature.baseline.status === baseline;
  });

  const list = document.querySelector('#feature-list');
  list.replaceChildren(...filteredRows.slice(0, visibleLimit).map(createFeatureCard));
  const moreButton = document.querySelector('#load-more');
  moreButton.hidden = filteredRows.length <= visibleLimit;
  text(
    document.querySelector('#filter-summary'),
    `Showing ${Math.min(filteredRows.length, visibleLimit)} of ${filteredRows.length} matching features`,
  );
  text(
    document.querySelector('#feature-count'),
    `${featureRows.length.toLocaleString()} in dataset`,
  );
}

function exportSnapshot() {
  return {
    meta: featureData.meta,
    environment,
    requirements: requirementState,
    capabilities: capabilityResults.map(({ capability, result }) => ({
      id: capability.id,
      name: capability.name,
      category: capability.category,
      ...result,
    })),
    features: featureRows.map(({ feature, probe }) => ({
      id: feature.id,
      name: feature.name,
      status: probe.status,
      support: feature.support,
      baseline: feature.baseline,
    })),
  };
}

async function copyToClipboard(value) {
  document.querySelector('#export-output').value = value;
  try {
    await navigator.clipboard?.writeText(value);
    text(document.querySelector('#export-status'), 'Copied to clipboard.');
  } catch {
    text(
      document.querySelector('#export-status'),
      'Export preview is ready. Select and copy the text if clipboard access is unavailable.',
    );
  }
}

async function initialize() {
  renderEnvironment();
  renderCapabilities();
  renderWasmProbes();
  renderWasmToolchains();
  populateGroups();
  renderFeatures();
  document
    .querySelector('#feature-filters')
    .addEventListener('submit', (event) => event.preventDefault());
  for (const selector of [
    '#feature-search',
    '#status-filter',
    '#group-filter',
    '#baseline-filter',
  ]) {
    document
      .querySelector(selector)
      .addEventListener(selector === '#feature-search' ? 'input' : 'change', () => {
        visibleLimit = pageSize;
        renderFeatures();
      });
  }
  document.querySelector('#load-more').addEventListener('click', () => {
    visibleLimit += pageSize;
    renderFeatures();
  });
  document
    .querySelector('#copy-json')
    .addEventListener('click', () => copyToClipboard(JSON.stringify(exportSnapshot(), null, 2)));
  document.querySelector('#download-json').addEventListener('click', () => {
    const contents = JSON.stringify(exportSnapshot(), null, 2);
    document.querySelector('#export-output').value = contents;
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'browser-features.json';
    anchor.click();
    URL.revokeObjectURL(url);
    text(document.querySelector('#export-status'), 'JSON download started.');
  });
  document.querySelector('#copy-markdown').addEventListener('click', () => {
    const supported = capabilityResults.filter(
      ({ result }) => result.status === 'supported',
    ).length;
    const markdown = [
      '# Browser Features summary',
      '',
      `- Browser: ${environment.browser} ${environment.browserVersion ?? ''}`.trim(),
      `- Engine: ${environment.isIOS ? 'WebKit (iOS/iPadOS)' : environment.engine}`,
      `- Secure context: ${environment.secureContext ? 'Yes' : 'No'}`,
      `- Cross-origin isolated: ${environment.crossOriginIsolated ? 'Yes' : 'No'}`,
      `- Highlight capabilities supported: ${supported}/${capabilities.length}`,
    ].join('\n');
    copyToClipboard(markdown);
  });

  registerTools([
    {
      name: 'get_browser_environment',
      title: 'Get browser environment',
      description: 'Return read-only environment information for this browser.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: async () => environment,
      annotations: { readOnlyHint: true },
    },
    {
      name: 'get_feature_support',
      title: 'Get feature support',
      description: 'Look up one web feature by id or search query.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' }, id: { type: 'string' } },
        additionalProperties: false,
      },
      execute: async ({ id, query } = {}) => {
        const term = (id ?? query ?? '').toLowerCase();
        return featureRows
          .filter(
            ({ feature }) =>
              feature.id.toLowerCase() === term || feature.name.toLowerCase().includes(term),
          )
          .slice(0, 20)
          .map(({ feature, probe }) => ({
            id: feature.id,
            name: feature.name,
            status: probe.status,
            support: feature.support,
          }));
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: 'get_highlight_capabilities',
      title: 'Get highlight capabilities',
      description: 'Return read-only detection results for highlighted browser capabilities.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: async () =>
        capabilityResults.map(({ capability, result }) => ({
          id: capability.id,
          name: capability.name,
          status: result.status,
          detail: result.detail,
        })),
      annotations: { readOnlyHint: true },
    },
  ]);
  document.body.dataset.appReady = 'true';
}

try {
  await initialize();
} catch (error) {
  const loadError = document.querySelector('#load-error');
  loadError.hidden = false;
  loadError.textContent = `Browser Features could not load: ${error.message}`;
  throw error;
}
