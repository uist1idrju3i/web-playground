function resolveApiTarget(key, target) {
  const parts = key.split('.');
  if (parts[0] === 'api') parts.shift();
  if (parts[0] === 'javascript' && parts[1] === 'builtins') parts.splice(0, 2);
  if (!parts.length) return { exists: false, reason: 'No global name was provided.' };

  let value = target;
  for (const part of parts) {
    if (value == null || !(part in Object(value))) {
      return { exists: false, reason: `${part} is not available.` };
    }
    value = value[part];
  }
  return { exists: true, value };
}

export function probeCompatKey(
  key,
  { global = globalThis, document: doc = globalThis.document } = {},
) {
  if (key.startsWith('api.') || key.startsWith('javascript.builtins.')) {
    const result = resolveApiTarget(key, global);
    if (!result.exists && key.split('.').length === 2) {
      return { key, status: 'unsupported', detail: result.reason };
    }
    if (!result.exists) {
      const parts = key.startsWith('api.')
        ? key.slice(4).split('.')
        : key.slice('javascript.builtins.'.length).split('.');
      const globalName = parts[0];
      if (!(globalName in Object(global)))
        return { key, status: 'unsupported', detail: `${globalName} is unavailable.` };
      const parent = global[globalName];
      const member = parts.at(-1);
      const prototype = parent?.prototype;
      const exists = (prototype && member in prototype) || (parent && member in Object(parent));
      return {
        key,
        status: exists ? 'supported' : 'unsupported',
        detail: exists ? `${member} is present.` : `${member} is not present on ${globalName}.`,
      };
    }
    return { key, status: 'supported', detail: 'The API key is present.' };
  }

  if (key.startsWith('css.properties.')) {
    const property = key.slice('css.properties.'.length);
    const supported = Boolean(global.CSS?.supports?.(property, 'initial'));
    return {
      key,
      status: supported ? 'supported' : 'unsupported',
      detail: supported ? `CSS.supports recognizes ${property}.` : `${property} is not supported.`,
    };
  }

  if (key.startsWith('css.selectors.')) {
    const selector = key.slice('css.selectors.'.length);
    if (!global.CSS?.supports)
      return { key, status: 'untestable', detail: 'CSS.supports is unavailable.' };
    const supported = global.CSS.supports('selector(:' + selector + ')');
    return {
      key,
      status: supported ? 'supported' : 'unsupported',
      detail: supported
        ? `The selector :${selector} is recognized.`
        : `The selector :${selector} is not recognized.`,
    };
  }

  if (key.startsWith('html.elements.')) {
    if (!doc?.createElement)
      return { key, status: 'untestable', detail: 'The DOM is unavailable.' };
    const elementName = key.slice('html.elements.'.length).split('.')[0];
    const element = doc.createElement(elementName);
    const supported = element.constructor?.name !== 'HTMLUnknownElement';
    return {
      key,
      status: supported ? 'supported' : 'unsupported',
      detail: supported ? `<${elementName}> is recognized.` : `<${elementName}> is unknown.`,
    };
  }

  if (key.startsWith('html.global_attributes.')) {
    const attribute = key.slice('html.global_attributes.'.length);
    const supported = Boolean(
      global.HTMLElement?.prototype && attribute in global.HTMLElement.prototype,
    );
    return {
      key,
      status: supported ? 'supported' : 'unsupported',
      detail: supported
        ? `${attribute} is present on HTMLElement.prototype.`
        : `${attribute} is not present.`,
    };
  }

  return {
    key,
    status: 'untestable',
    detail: 'No runtime probe is defined for this compatibility key.',
  };
}

export function summarizeFeatureProbes(results) {
  if (!results.length || results.every((result) => result.status === 'untestable'))
    return 'untestable';
  const testable = results.filter((result) => result.status !== 'untestable');
  const supported = testable.filter((result) => result.status === 'supported').length;
  if (!supported) return 'unsupported';
  if (supported === testable.length && testable.length === results.length) return 'supported';
  return `partial(${supported}/${results.length})`;
}

export function probeFeature(feature, options) {
  const results = (feature.compat_features ?? []).map((key) => probeCompatKey(key, options));
  return { status: summarizeFeatureProbes(results), results };
}
