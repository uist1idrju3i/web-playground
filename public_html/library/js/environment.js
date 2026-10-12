function detectIOS(platform, userAgent, maxTouchPoints) {
  return (
    /iPhone|iPad|iPod/i.test(userAgent) ||
    /iOS/i.test(platform) ||
    (platform === 'MacIntel' && maxTouchPoints > 1)
  );
}

function inferBrowser(brands, userAgent) {
  const brand = brands.map((entry) => entry.brand).join(' ');
  if (/EdgiOS/i.test(userAgent)) return 'Edge';
  if (/Microsoft Edge/i.test(brand) || /Edg\//.test(userAgent)) return 'Edge';
  if (/Opera/i.test(brand) || /OPR\//.test(userAgent)) return 'Opera';
  if (/CriOS/i.test(userAgent)) return 'Chrome';
  if (/Google Chrome|Chromium/i.test(brand) || /Chrome\//.test(userAgent)) return 'Chrome';
  // Servo's user agent contains a Firefox/ token, so it must be checked first.
  if (/Servo\//.test(userAgent)) return 'Servo';
  if (/Firefox|FxiOS/i.test(userAgent)) return 'Firefox';
  if (/Safari/i.test(userAgent)) return 'Safari';
  return 'Unknown';
}

function inferOS(platform, userAgent, isIOS) {
  if (isIOS) return /iPad/i.test(userAgent) || platform === 'MacIntel' ? 'iPadOS / iOS' : 'iOS';
  if (/Android/i.test(platform + userAgent)) return 'Android';
  if (/Windows/i.test(platform + userAgent)) return 'Windows';
  if (/Mac/i.test(platform + userAgent)) return 'macOS';
  if (/Chrome OS|CrOS/i.test(userAgent)) return 'ChromeOS';
  if (/Linux/i.test(platform + userAgent)) return 'Linux';
  return platform || 'Unknown';
}

function inferEngine(browser, isIOS, userAgent) {
  if (isIOS) return 'WebKit';
  if (browser === 'Firefox') return 'Gecko';
  if (browser === 'Servo') return 'Servo';
  if (browser === 'Chrome' || browser === 'Edge' || browser === 'Opera') return 'Blink';
  if (/AppleWebKit/i.test(userAgent)) return 'WebKit';
  return 'Unknown';
}

function readPermissionsPolicy() {
  const policy = document.permissionsPolicy ?? document.featurePolicy;
  try {
    return policy?.allowedFeatures?.() ?? [];
  } catch {
    return [];
  }
}

export async function getBrowserEnvironment() {
  const nav = navigator;
  const userAgent = nav.userAgent ?? '';
  const uaData = nav.userAgentData;
  let highEntropy = {};
  if (uaData?.getHighEntropyValues) {
    try {
      highEntropy = await uaData.getHighEntropyValues([
        'architecture',
        'bitness',
        'model',
        'platformVersion',
        'uaFullVersion',
        'fullVersionList',
      ]);
    } catch {
      highEntropy = {};
    }
  }
  const brands = highEntropy.fullVersionList ?? uaData?.brands ?? [];
  const platform = highEntropy.platform || uaData?.platform || nav.platform || '';
  const isIOS = detectIOS(platform, userAgent, nav.maxTouchPoints ?? 0);
  const browser = inferBrowser(brands, userAgent);
  let storage;
  try {
    storage = (await nav.storage?.estimate?.()) ?? null;
  } catch {
    storage = null;
  }
  const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
  const colorGamut = ['rec2020', 'p3', 'srgb'].find(
    (gamut) => matchMedia(`(color-gamut: ${gamut})`).matches,
  );
  const hdr = matchMedia('(dynamic-range: high)').matches;

  return {
    browser,
    browserVersion:
      highEntropy.uaFullVersion ??
      brands.find((item) => /Chrome|Edge|Firefox|Safari/.test(item.brand))?.version ??
      (browser === 'Servo' ? userAgent.match(/Servo\/([\d.]+)/)?.[1] : undefined) ??
      null,
    engine: inferEngine(browser, isIOS, userAgent),
    os: inferOS(platform, userAgent, isIOS),
    isIOS,
    userAgent,
    userAgentData: {
      platform,
      architecture: highEntropy.architecture ?? null,
      bitness: highEntropy.bitness ?? null,
      model: highEntropy.model ?? null,
      platformVersion: highEntropy.platformVersion ?? null,
      fullVersion: highEntropy.uaFullVersion ?? null,
    },
    secureContext: globalThis.isSecureContext,
    crossOriginIsolated: globalThis.crossOriginIsolated === true,
    screen: {
      width: screen.width,
      height: screen.height,
      availableWidth: screen.availWidth,
      availableHeight: screen.availHeight,
      devicePixelRatio: devicePixelRatio,
      colorDepth: screen.colorDepth,
      colorGamut: colorGamut ?? 'unknown',
      hdr,
    },
    input: {
      pointer: ['fine', 'coarse', 'none'].filter(
        (type) => matchMedia(`(pointer: ${type})`).matches,
      ),
      hover: ['hover', 'none'].filter((type) => matchMedia(`(hover: ${type})`).matches),
      maxTouchPoints: nav.maxTouchPoints ?? 0,
    },
    network: connection
      ? {
          effectiveType: connection.effectiveType ?? null,
          downlink: connection.downlink ?? null,
          rtt: connection.rtt ?? null,
          saveData: connection.saveData ?? null,
        }
      : null,
    storage: storage ? { quota: storage.quota ?? null, usage: storage.usage ?? null } : null,
    permissionsPolicy: readPermissionsPolicy(),
  };
}

// Exported for unit tests.
export { inferBrowser, inferEngine };
