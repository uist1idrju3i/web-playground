function available(value, detail) {
  return value
    ? { status: 'supported', detail }
    : { status: 'unsupported', detail: 'This browser does not expose the required API.' };
}

function capability(id, name, category, detect, options = {}) {
  return {
    id,
    name,
    category,
    detect,
    requiresSecureContext: options.requiresSecureContext ?? false,
    chromiumOnly: options.chromiumOnly ?? false,
    web_features_id: options.web_features_id ?? null,
    permissionsPolicyFeature: options.permissionsPolicyFeature ?? null,
  };
}

function uniqueProbeId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function storageFailure(error, label) {
  const reason = error?.name ?? 'StorageError';
  const detail =
    reason === 'SecurityError'
      ? `${label} is blocked by the browser or its storage policy.`
      : reason === 'QuotaExceededError'
        ? `${label} is blocked because its storage quota is exhausted.`
        : `${label} probe failed with ${reason}.`;
  return { status: 'unsupported', reason, detail };
}

function probeKeyValueStorage(storageName, label) {
  let storage;
  let key;
  let removed = false;
  let roundTrip;
  let failure;
  try {
    storage = globalThis[storageName];
    if (!storage) return available(false, `${label} is not exposed.`);
    key = `__wp_probe_${uniqueProbeId()}`;
    const value = `wp_probe_value_${uniqueProbeId()}`;
    storage.setItem(key, value);
    const readValue = storage.getItem(key);
    storage.removeItem(key);
    removed = true;
    roundTrip = readValue === value;
  } catch (error) {
    failure = error;
  } finally {
    if (storage && key && !removed) {
      try {
        storage.removeItem(key);
      } catch (error) {
        failure ??= error;
      }
    }
  }
  if (failure) return storageFailure(failure, label);
  return roundTrip
    ? available(true, `${label} completed a set/get/remove round-trip.`)
    : storageFailure({ name: 'RoundTripMismatch' }, label);
}

function indexedDBRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

async function probeIndexedDB() {
  if (!globalThis.indexedDB) return available(false, 'IndexedDB is not exposed.');
  const databaseName = `wp-probe-${uniqueProbeId()}`;
  let database;
  let failure;
  try {
    const request = globalThis.indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('probe');
    database = await indexedDBRequest(request);
    await new Promise((resolve, reject) => {
      const transaction = database.transaction('probe', 'readwrite');
      const store = transaction.objectStore('probe');
      const value = `wp-probe-${uniqueProbeId()}`;
      store.put(value, 'probe');
      const readRequest = store.get('probe');
      let readValue;
      readRequest.onsuccess = () => {
        readValue = readRequest.result;
      };
      transaction.oncomplete = () =>
        readValue === value
          ? resolve()
          : reject(new Error('IndexedDB probe value did not round-trip.'));
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
    });
  } catch (error) {
    failure = error;
  }
  try {
    database?.close();
    await new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('IndexedDB cleanup failed.'));
      request.onblocked = () => reject(new Error('IndexedDB cleanup was blocked.'));
    });
  } catch (error) {
    failure ??= error;
  }
  return failure
    ? storageFailure(failure, 'IndexedDB')
    : available(true, 'IndexedDB completed a write/read/delete probe.');
}

async function probeCookies() {
  const name = `__wp_probe_${uniqueProbeId()}`;
  const value = `wp_probe_${uniqueProbeId()}`;
  let cookieEnabled = false;
  let error;
  let roundTrip = false;
  try {
    cookieEnabled = navigator.cookieEnabled === true;
    document.cookie = `${name}=${value}; path=/; SameSite=Strict`;
    roundTrip = document.cookie.split(';').some((part) => part.trim() === `${name}=${value}`);
  } catch (caught) {
    error = caught;
  } finally {
    try {
      document.cookie = `${name}=; path=/; max-age=0; SameSite=Strict`;
    } catch (caught) {
      error ??= caught;
    }
  }
  if (error) return storageFailure(error, 'Cookies');
  return cookieEnabled && roundTrip
    ? available(true, 'Cookies are enabled and completed a set/read/expire round-trip.')
    : {
        status: 'unsupported',
        reason: 'CookiesBlocked',
        detail: `Cookies could not complete a round-trip (navigator.cookieEnabled: ${cookieEnabled}).`,
      };
}

async function probeCacheStorage() {
  const cacheStorage = globalThis.caches;
  if (!cacheStorage) return available(false, 'Cache Storage is not exposed.');
  const cacheName = `wp-probe-${uniqueProbeId()}`;
  try {
    await cacheStorage.open(cacheName);
    const deleted = await cacheStorage.delete(cacheName);
    return deleted
      ? available(true, 'Cache Storage opened and deleted a probe cache.')
      : storageFailure({ name: 'CleanupFailed' }, 'Cache Storage');
  } catch (error) {
    let failure = error;
    try {
      await cacheStorage.delete(cacheName);
    } catch (cleanupError) {
      failure ??= cleanupError;
    }
    return storageFailure(failure, 'Cache Storage');
  }
}

async function probeOPFS() {
  const storage = navigator.storage;
  if (!storage?.getDirectory)
    return available(false, 'The Origin Private File System is not exposed.');
  const fileName = `wp-probe-${uniqueProbeId()}`;
  let root;
  let writable;
  let failure;
  try {
    root = await storage.getDirectory();
    const file = await root.getFileHandle(fileName, { create: true });
    writable = await file.createWritable();
    const value = `wp-probe-${uniqueProbeId()}`;
    await writable.write(value);
    await writable.close();
    writable = null;
    const readValue = await (await file.getFile()).text();
    if (readValue !== value) failure = { name: 'RoundTripMismatch' };
  } catch (error) {
    failure = error;
  } finally {
    if (writable?.abort) {
      try {
        await writable.abort();
      } catch (error) {
        failure ??= error;
      }
    }
    if (root) {
      try {
        await root.removeEntry(fileName);
      } catch (error) {
        if (error?.name !== 'NotFoundError') failure ??= error;
      }
    }
  }
  return failure
    ? storageFailure(failure, 'Origin Private File System')
    : available(true, 'The Origin Private File System completed a write/read/remove round-trip.');
}

function formatStorageBytes(value) {
  return Number.isFinite(value) ? `${(value / (1024 * 1024)).toFixed(1)} MiB` : 'unknown';
}

async function detectModelAvailability(name, options) {
  const api = globalThis[name];
  if (!api) return available(false);
  if (typeof api.availability !== 'function') {
    return available(true, `${name} is present; no model availability query is exposed.`);
  }
  let timeoutId;
  try {
    const state = await Promise.race([
      api.availability(options),
      new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Model availability query timed out.')),
          1500,
        );
      }),
    ]);
    return available(
      true,
      `${name} is present; model availability: ${state}. No model download was started.`,
    );
  } catch {
    return available(
      true,
      `${name} is present; model availability could not be queried. No model download was started.`,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

const globals = [
  [
    'fetch',
    'Fetch',
    'Networking',
    () => available('fetch' in globalThis, 'The Fetch API is available.'),
  ],
  [
    'es-modules',
    'JavaScript modules',
    'JavaScript',
    () =>
      available(
        'noModule' in HTMLScriptElement.prototype,
        'Native JavaScript modules are supported.',
      ),
  ],
];

export const capabilities = [
  capability(
    'webmcp',
    'WebMCP',
    'AI and agents',
    () => {
      if (document.modelContext?.registerTool) {
        return { status: 'supported', detail: 'document.modelContext is available.' };
      }
      if (navigator.modelContext?.registerTool) {
        return { status: 'supported', detail: 'Legacy navigator.modelContext is available.' };
      }
      return {
        status: 'unsupported',
        reason: 'needs-flag-or-origin-trial',
        detail: 'Experimental API; a browser flag or Origin Trial may be required.',
      };
    },
    { web_features_id: 'web-mcp' },
  ),
  capability(
    'web-bluetooth',
    'Web Bluetooth',
    'Devices',
    async () => {
      if (!navigator.bluetooth) return available(false);
      if (navigator.bluetooth.getAvailability) {
        const availableNow = await navigator.bluetooth.getAvailability();
        return available(true, `Bluetooth API available; adapter availability: ${availableNow}.`);
      }
      return available(true, 'The Bluetooth API is exposed; adapter availability is unknown.');
    },
    { chromiumOnly: true, requiresSecureContext: true, web_features_id: 'web-bluetooth' },
  ),
  capability(
    'web-serial',
    'Web Serial',
    'Devices',
    () => available('serial' in navigator, 'navigator.serial is available.'),
    { chromiumOnly: true, requiresSecureContext: true, web_features_id: 'web-serial' },
  ),
  capability(
    'webusb',
    'WebUSB',
    'Devices',
    () => available('usb' in navigator, 'navigator.usb is available.'),
    { chromiumOnly: true, requiresSecureContext: true, web_features_id: 'webusb' },
  ),
  capability(
    'websocket',
    'WebSocket',
    'Networking',
    () => available('WebSocket' in globalThis, 'The WebSocket constructor is available.'),
    { web_features_id: 'websockets' },
  ),
  capability(
    'webtransport',
    'WebTransport',
    'Networking',
    () => available('WebTransport' in globalThis, 'The WebTransport constructor is available.'),
    { requiresSecureContext: true, web_features_id: 'webtransport' },
  ),
  capability(
    'webgl',
    'WebGL',
    'Graphics',
    () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      if (!context) return available(false, 'WebGL and WebGL2 contexts could not be created.');
      const version =
        globalThis.WebGL2RenderingContext && context instanceof WebGL2RenderingContext
          ? 'WebGL 2'
          : 'WebGL 1';
      const rendererExtension = context.getExtension('WEBGL_debug_renderer_info');
      const renderer = rendererExtension
        ? context.getParameter(rendererExtension.UNMASKED_RENDERER_WEBGL)
        : null;
      return {
        status: 'supported',
        detail: `${version} available${renderer ? `; renderer: ${renderer}` : '; renderer hidden by browser privacy settings'}.`,
      };
    },
    { web_features_id: 'webgl' },
  ),
  capability(
    'webrtc',
    'WebRTC',
    'Media',
    () => {
      const sender = globalThis.RTCRtpSender;
      const codecs = sender?.getCapabilities?.('audio')?.codecs ?? [];
      return available(
        'RTCPeerConnection' in globalThis,
        codecs.length
          ? `RTCPeerConnection available; audio codecs: ${codecs.map((codec) => codec.mimeType).join(', ')}.`
          : 'RTCPeerConnection is available.',
      );
    },
    { web_features_id: 'webrtc' },
  ),
  capability(
    'web-audio',
    'Web Audio',
    'Media',
    () =>
      available(
        'AudioContext' in globalThis || 'webkitAudioContext' in globalThis,
        'AudioContext is available; no audio is started.',
      ),
    { web_features_id: 'web-audio' },
  ),
  capability(
    'web-crypto',
    'Web Crypto',
    'Security',
    () =>
      available(
        Boolean(globalThis.crypto?.subtle),
        globalThis.isSecureContext
          ? 'crypto.subtle is available in this secure context.'
          : 'Web Crypto is usually restricted to secure contexts.',
      ),
    { requiresSecureContext: true, web_features_id: 'web-cryptography' },
  ),
  capability(
    'webgpu',
    'WebGPU',
    'Graphics',
    async () => {
      if (!navigator.gpu) return available(false);
      try {
        const adapter = await navigator.gpu.requestAdapter();
        const info = adapter?.info;
        const description = [info?.vendor, info?.architecture, info?.device]
          .filter(Boolean)
          .join(' / ');
        return available(
          Boolean(adapter),
          description ? `GPU adapter: ${description}.` : 'WebGPU adapter is available.',
        );
      } catch (error) {
        return { status: 'unsupported', detail: `Adapter unavailable: ${error.message}` };
      }
    },
    { requiresSecureContext: true, web_features_id: 'webgpu' },
  ),
  capability(
    'webhid',
    'WebHID',
    'Devices',
    () => available('hid' in navigator, 'navigator.hid is available.'),
    {
      chromiumOnly: true,
      requiresSecureContext: true,
      web_features_id: 'webhid',
    },
  ),
  capability(
    'web-nfc',
    'Web NFC',
    'Devices',
    () =>
      available('NDEFReader' in globalThis, 'NDEFReader is available; no NFC scan was started.'),
    {
      chromiumOnly: true,
      requiresSecureContext: true,
      web_features_id: 'web-nfc',
    },
  ),
  capability(
    'webcodecs',
    'WebCodecs',
    'Media',
    async () => {
      const videoEncoder = globalThis.VideoEncoder;
      if (!videoEncoder?.isConfigSupported) return available(false);
      const configs = await Promise.all(
        ['vp8', 'vp09.00.10.08', 'avc1.42001E'].map(async (codec) => {
          try {
            const result = await videoEncoder.isConfigSupported({
              codec,
              width: 16,
              height: 16,
              bitrate: 1000,
              framerate: 1,
            });
            return result.supported ? codec : null;
          } catch {
            return null;
          }
        }),
      );
      return available(
        true,
        `VideoEncoder available; supported sample codecs: ${configs.filter(Boolean).join(', ') || 'none detected'}.`,
      );
    },
    { web_features_id: 'webcodecs' },
  ),
  capability(
    'webxr',
    'WebXR',
    'Immersive',
    async () => {
      if (!navigator.xr?.isSessionSupported) return available(false);
      const supported = await navigator.xr.isSessionSupported('immersive-vr').catch(() => false);
      return available(
        true,
        `WebXR API available; immersive VR ${supported ? 'supported' : 'not reported as supported'}. No session was requested.`,
      );
    },
    { requiresSecureContext: true, web_features_id: 'webxr' },
  ),
  capability(
    'webauthn',
    'WebAuthn and passkeys',
    'Security',
    () =>
      available(
        'PublicKeyCredential' in globalThis,
        'PublicKeyCredential is available; no credential flow was started.',
      ),
    {
      requiresSecureContext: true,
      web_features_id: 'web-authentication',
    },
  ),
  capability(
    'translator-api',
    'Translator API',
    'AI and agents',
    () => detectModelAvailability('Translator', { sourceLanguage: 'en', targetLanguage: 'es' }),
    { chromiumOnly: true },
  ),
  capability(
    'language-detector-api',
    'Language Detector API',
    'AI and agents',
    () => detectModelAvailability('LanguageDetector'),
    { chromiumOnly: true },
  ),
  capability(
    'summarizer-api',
    'Summarizer API',
    'AI and agents',
    () => detectModelAvailability('Summarizer'),
    { chromiumOnly: true },
  ),
  capability(
    'prompt-api',
    'Prompt API',
    'AI and agents',
    () => detectModelAvailability('LanguageModel'),
    { chromiumOnly: true },
  ),
  capability('webassembly', 'WebAssembly', 'JavaScript', () => {
    if (!globalThis.WebAssembly) return available(false, 'WebAssembly is not exposed.');
    try {
      const module = new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
      new WebAssembly.Instance(module);
      return available(true, 'WebAssembly compiled and instantiated a tiny module.');
    } catch (error) {
      const reason = error?.name ?? 'CompilationError';
      return {
        status: 'unsupported',
        reason,
        detail: `WebAssembly compilation or instantiation failed with ${reason}.`,
      };
    }
  }),
  capability('wasm-simd', 'WebAssembly SIMD', 'JavaScript', () => {
    const moduleBytes = new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 22, 1, 20, 0, 253, 12, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11,
    ]);
    const supported = globalThis.WebAssembly?.validate(moduleBytes) ?? false;
    return available(
      'WebAssembly' in globalThis,
      `WebAssembly SIMD validation: ${supported ? 'supported' : 'not supported'}.`,
    );
  }),
  capability('wasm-threads', 'WebAssembly threads', 'JavaScript', () =>
    available(
      'SharedArrayBuffer' in globalThis && crossOriginIsolated,
      'SharedArrayBuffer and cross-origin isolation are required for threads.',
    ),
  ),
  capability(
    'web-share',
    'Web Share',
    'Files and storage',
    () =>
      available('share' in navigator, 'navigator.share is available; no share sheet was opened.'),
    { requiresSecureContext: true, web_features_id: 'web-share' },
  ),
  capability(
    'file-system-access',
    'File System Access',
    'Files and storage',
    () =>
      available(
        'showOpenFilePicker' in globalThis || 'showSaveFilePicker' in globalThis,
        'File System Access picker APIs are present; no picker was opened.',
      ),
    { chromiumOnly: true, requiresSecureContext: true },
  ),
  capability('opfs', 'Origin Private File System', 'Storage', probeOPFS),
  capability('storage-estimate', 'Storage estimate', 'Storage', async () => {
    if (!navigator.storage?.estimate) return available(false, 'Storage estimates are not exposed.');
    try {
      const { quota, usage } = await navigator.storage.estimate();
      return available(
        true,
        `Estimated usage: ${formatStorageBytes(usage)}; quota: ${formatStorageBytes(quota)}.`,
      );
    } catch (error) {
      return storageFailure(error, 'Storage estimate');
    }
  }),
  capability('storage-persisted', 'Storage persistence', 'Storage', async () => {
    if (!navigator.storage?.persisted)
      return available(false, 'Storage persistence status is not exposed.');
    try {
      const persisted = await navigator.storage.persisted();
      return available(
        true,
        `Storage is ${persisted ? 'already' : 'not'} persistent; no persistence request was made.`,
      );
    } catch (error) {
      return storageFailure(error, 'Storage persistence status');
    }
  }),
  capability('service-worker', 'Service Worker', 'Offline and background', () =>
    available('serviceWorker' in navigator, 'Service worker registration is available.'),
  ),
  capability(
    'push-api',
    'Push API',
    'Offline and background',
    () =>
      available(
        'PushManager' in globalThis,
        'PushManager is available; no subscription was created.',
      ),
    { requiresSecureContext: true },
  ),
  capability(
    'notifications',
    'Notifications',
    'Offline and background',
    () =>
      available(
        'Notification' in globalThis,
        `Notification permission state: ${globalThis.Notification?.permission ?? 'not applicable'}.`,
      ),
    { requiresSecureContext: true },
  ),
  capability(
    'wake-lock',
    'Wake Lock',
    'Device and sensors',
    () =>
      available('wakeLock' in navigator, 'navigator.wakeLock is available; no lock was requested.'),
    { requiresSecureContext: true },
  ),
  capability(
    'screen-capture',
    'Screen Capture',
    'Media',
    () =>
      available(
        Boolean(navigator.mediaDevices?.getDisplayMedia),
        'getDisplayMedia is available; no capture was started.',
      ),
    { requiresSecureContext: true },
  ),
  capability('web-locks', 'Web Locks', 'Offline and background', () =>
    available('locks' in navigator, 'navigator.locks is available.'),
  ),
  capability('view-transitions', 'View Transitions', 'Rendering and input', () =>
    available('startViewTransition' in document, 'document.startViewTransition is available.'),
  ),
  capability('popover', 'Popover API', 'Rendering and input', () =>
    available('popover' in HTMLElement.prototype, 'The popover attribute is available.'),
  ),
  capability(
    'compute-pressure',
    'Compute Pressure',
    'Device and sensors',
    () =>
      available(
        'PressureObserver' in globalThis,
        'PressureObserver API presence only; no observer was started.',
      ),
    { requiresSecureContext: true },
  ),
  capability(
    'idle-detection',
    'Idle Detection',
    'Device and sensors',
    () =>
      available(
        'IdleDetector' in globalThis,
        'IdleDetector API presence only; no user activity was observed.',
      ),
    { chromiumOnly: true, requiresSecureContext: true },
  ),
  capability(
    'gamepad',
    'Gamepad',
    'Device and sensors',
    () =>
      available(
        'getGamepads' in navigator,
        'Gamepad API is available; connected controllers were not inspected.',
      ),
    { web_features_id: 'gamepad' },
  ),
  capability(
    'geolocation',
    'Geolocation',
    'Device and sensors',
    () =>
      available(
        'geolocation' in navigator,
        'Geolocation API is present; no position was requested.',
      ),
    { requiresSecureContext: true, web_features_id: 'geolocation' },
  ),
  capability('web-workers', 'Web Workers', 'JavaScript', () =>
    available('Worker' in globalThis, 'Worker constructor is available.'),
  ),
  capability('shared-workers', 'Shared Workers', 'JavaScript', () =>
    available('SharedWorker' in globalThis, 'SharedWorker constructor is available.'),
  ),
  capability('broadcast-channel', 'Broadcast Channel', 'Networking', () =>
    available('BroadcastChannel' in globalThis, 'BroadcastChannel constructor is available.'),
  ),
  capability('indexeddb', 'IndexedDB', 'Storage', probeIndexedDB),
  capability('cache-storage', 'Cache Storage', 'Storage', probeCacheStorage),
  capability('local-storage', 'Local Storage', 'Storage', () =>
    probeKeyValueStorage('localStorage', 'Local Storage'),
  ),
  capability('session-storage', 'Session Storage', 'Storage', () =>
    probeKeyValueStorage('sessionStorage', 'Session Storage'),
  ),
  capability('cookies', 'Cookies', 'Storage', probeCookies),
  capability(
    'clipboard-api',
    'Clipboard API',
    'Files and storage',
    () =>
      available(
        Boolean(navigator.clipboard),
        'Clipboard API is available; clipboard contents were not read.',
      ),
    { requiresSecureContext: true },
  ),
  capability('file-api', 'File API', 'Files and storage', () =>
    available(
      'File' in globalThis && 'FileReader' in globalThis,
      'File and FileReader APIs are available.',
    ),
  ),
  capability('drag-and-drop', 'Drag and Drop', 'Rendering and input', () =>
    available(
      'ondragstart' in document.documentElement,
      'HTML drag-and-drop events are available.',
    ),
  ),
  capability('pointer-events', 'Pointer Events', 'Rendering and input', () =>
    available('PointerEvent' in globalThis, 'PointerEvent constructor is available.'),
  ),
  capability('custom-elements', 'Custom Elements', 'Rendering and input', () =>
    available(Boolean(customElements?.define), 'Custom Elements registry is available.'),
  ),
  capability('shadow-dom', 'Shadow DOM', 'Rendering and input', () =>
    available(Boolean(HTMLElement.prototype.attachShadow), 'Element.attachShadow is available.'),
  ),
  capability('css-container-queries', 'CSS Container Queries', 'Rendering and input', () =>
    available(
      CSS.supports('container-type: inline-size'),
      'CSS container-type support was checked.',
    ),
  ),
  capability('css-nesting', 'CSS Nesting', 'Rendering and input', () =>
    available(
      CSS.supports('selector(&)') || CSS.supports('color', 'revert-layer'),
      'CSS nesting support is browser-dependent.',
    ),
  ),
  capability('css-grid', 'CSS Grid', 'Rendering and input', () =>
    available(CSS.supports('display', 'grid'), 'CSS Grid is available.'),
  ),
  capability('web-animations', 'Web Animations', 'Rendering and input', () =>
    available('animate' in Element.prototype, 'Element.animate is available.'),
  ),
  capability('offscreen-canvas', 'OffscreenCanvas', 'Graphics', () =>
    available('OffscreenCanvas' in globalThis, 'OffscreenCanvas constructor is available.'),
  ),
  capability('canvas-2d', 'Canvas 2D', 'Graphics', () =>
    available(
      Boolean(document.createElement('canvas').getContext('2d')),
      'CanvasRenderingContext2D is available.',
    ),
  ),
  capability('audio-worklet', 'AudioWorklet', 'Media', () =>
    available(
      'AudioWorklet' in globalThis || 'audioWorklet' in (globalThis.AudioContext?.prototype ?? {}),
      'AudioWorklet is available; no audio context was started.',
    ),
  ),
  capability(
    'media-devices',
    'Media Devices',
    'Media',
    () =>
      available(
        Boolean(navigator.mediaDevices),
        'MediaDevices is present; no device enumeration or capture was started.',
      ),
    { requiresSecureContext: true },
  ),
  capability('media-recorder', 'MediaRecorder', 'Media', () =>
    available('MediaRecorder' in globalThis, 'MediaRecorder constructor is available.'),
  ),
  capability('eventsource', 'Server-Sent Events', 'Networking', () =>
    available('EventSource' in globalThis, 'EventSource constructor is available.'),
  ),
  capability('compression-streams', 'Compression Streams', 'Networking', () =>
    available(
      'CompressionStream' in globalThis && 'DecompressionStream' in globalThis,
      'CompressionStream and DecompressionStream are available.',
    ),
  ),
  capability('websocket-streams', 'WebSocketStream', 'Networking', () =>
    available('WebSocketStream' in globalThis, 'WebSocketStream constructor is available.'),
  ),
  capability('shared-array-buffer', 'SharedArrayBuffer', 'JavaScript', () =>
    available(
      'SharedArrayBuffer' in globalThis,
      `SharedArrayBuffer is ${crossOriginIsolated ? 'available in this isolated context' : 'hidden because this context is not cross-origin isolated'}.`,
    ),
  ),
  capability('atomics', 'Atomics', 'JavaScript', () =>
    available('Atomics' in globalThis, 'Atomics is available.'),
  ),
  capability('web-speech', 'Web Speech', 'Media', () =>
    available(
      'speechSynthesis' in globalThis,
      'SpeechSynthesis is available; no speech was played.',
    ),
  ),
  capability('media-session', 'Media Session', 'Media', () =>
    available('mediaSession' in navigator, 'navigator.mediaSession is available.'),
  ),
  capability('picture-in-picture', 'Picture-in-Picture', 'Media', () =>
    available(
      'pictureInPictureEnabled' in document,
      'Picture-in-Picture is available; no video was opened.',
    ),
  ),
  capability('fullscreen', 'Fullscreen', 'Rendering and input', () =>
    available(
      'requestFullscreen' in Element.prototype,
      'Fullscreen API is available; no fullscreen request was made.',
    ),
  ),
  capability('resize-observer', 'Resize Observer', 'Rendering and input', () =>
    available('ResizeObserver' in globalThis, 'ResizeObserver constructor is available.'),
  ),
  capability('intersection-observer', 'Intersection Observer', 'Rendering and input', () =>
    available(
      'IntersectionObserver' in globalThis,
      'IntersectionObserver constructor is available.',
    ),
  ),
  capability('mutation-observer', 'Mutation Observer', 'Rendering and input', () =>
    available('MutationObserver' in globalThis, 'MutationObserver constructor is available.'),
  ),
  capability('web-crypto-random', 'Cryptographic Randomness', 'Security', () =>
    available(Boolean(globalThis.crypto?.getRandomValues), 'crypto.getRandomValues is available.'),
  ),
  capability('permissions-api', 'Permissions API', 'Security', () =>
    available(
      'permissions' in navigator,
      'navigator.permissions is available; no permission prompt was requested.',
    ),
  ),
  ...globals.map(([id, name, category, detect]) => capability(id, name, category, detect)),
];

export const capabilityById = new Map(capabilities.map((item) => [item.id, item]));

export async function detectCapability(item) {
  try {
    const result = await item.detect();
    return { ...result, status: result.status ?? 'untestable' };
  } catch (error) {
    return { status: 'untestable', detail: error?.message ?? 'Detection could not be completed.' };
  }
}
