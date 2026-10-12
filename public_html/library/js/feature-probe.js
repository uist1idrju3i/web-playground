const globalMemberInterfaces = new Set([
  'DedicatedWorkerGlobalScope',
  'GlobalEventHandlers',
  'SharedWorkerGlobalScope',
  'ServiceWorkerGlobalScope',
  'Window',
  'WindowEventHandlers',
  'WindowOrWorkerGlobalScope',
  'WorkerGlobalScope',
  'WorkletGlobalScope',
]);

const globalAttributeIDLNames = {
  accesskey: 'accessKey',
  class: 'className',
  contenteditable: 'contentEditable',
  enterkeyhint: 'enterKeyHint',
  exportparts: 'exportParts',
  inputmode: 'inputMode',
  itemid: 'itemId',
  itemprop: 'itemProp',
  itemref: 'itemRef',
  itemscope: 'itemScope',
  itemtype: 'itemType',
  tabindex: 'tabIndex',
  virtualkeyboardpolicy: 'virtualKeyboardPolicy',
  writingsuggestions: 'writingSuggestions',
};

const functionalSelectorQueries = {
  dir: 'selector(:dir(ltr))',
  has: 'selector(:has(*))',
  'has-slotted': 'selector(:has-slotted)',
  'host-context': 'selector(:host-context(*))',
  is: 'selector(:is(a))',
  lang: 'selector(:lang(en))',
  'nth-child': 'selector(:nth-child(1))',
  'nth-last-child': 'selector(:nth-last-child(1))',
  'nth-last-of-type': 'selector(:nth-last-of-type(a))',
  'nth-of-type': 'selector(:nth-of-type(a))',
  not: 'selector(:not(a))',
  part: 'selector(::part(probe))',
  slotted: 'selector(::slotted(*))',
  state: 'selector(:state(probe))',
  where: 'selector(:where(a))',
};

const nonGlobalJavaScriptBuiltins = new Set([
  'AsyncFunction',
  'AsyncGenerator',
  'AsyncGeneratorFunction',
  'AsyncIterator',
  'Generator',
  'GeneratorFunction',
]);

function result(key, status, detail) {
  return { key, status, detail };
}

function isPresent(object, name) {
  return object != null && name in Object(object);
}

function probeApiKey(key, global) {
  const parts = key.split('.');
  const isBuiltin = key.startsWith('javascript.builtins.');
  const path = isBuiltin ? parts.slice(2) : parts.slice(1);
  if (!path[0]) return result(key, 'untestable', 'No global name was provided.');

  if (isBuiltin) {
    if (parts.length !== 3)
      return result(key, 'untestable', 'Nested JavaScript built-ins are not probed.');
    if (nonGlobalJavaScriptBuiltins.has(path[0]) && !isPresent(global, path[0]))
      return result(key, 'untestable', `${path[0]} is not exposed as a global property.`);
    const supported = isPresent(global, path[0]);
    return result(
      key,
      supported ? 'supported' : 'unsupported',
      supported ? `${path[0]} is present on the global object.` : `${path[0]} is unavailable.`,
    );
  }

  if (parts.length === 2) {
    const supported = isPresent(global, path[0]);
    if (
      !supported &&
      !isBuiltin &&
      (/^(?:ANGLE|EXT|OES|WEBGL)_/.test(path[0]) || /^WebGL.*OES$/.test(path[0]))
    ) {
      return result(
        key,
        'untestable',
        'WebGL extension interfaces are exposed through getExtension(), not as global properties.',
      );
    }
    return result(
      key,
      supported ? 'supported' : 'unsupported',
      supported ? `${path[0]} is present on the global object.` : `${path[0]} is unavailable.`,
    );
  }
  if (parts.length > 3)
    return result(key, 'untestable', 'Nested API features cannot be tested generically.');

  const [interfaceName, memberKey] = path;
  if (memberKey === 'ecmascript_modules')
    return result(key, 'untestable', 'Worklet module support is not exposed as a runtime member.');
  const constructor = global?.[interfaceName];
  if (memberKey === interfaceName) {
    const supported = typeof constructor === 'function';
    return result(
      key,
      supported ? 'supported' : 'unsupported',
      supported
        ? `${interfaceName} is a global constructor.`
        : `${interfaceName} is not exposed as a constructor.`,
    );
  }

  if (memberKey.endsWith('_event')) {
    const eventName = memberKey.slice(0, -'_event'.length);
    const prototype = constructor?.prototype;
    if (!prototype)
      return result(key, 'untestable', `${interfaceName} has no inspectable prototype.`);
    const handler = `on${eventName}`;
    return isPresent(prototype, handler)
      ? result(key, 'supported', `${handler} is present on ${interfaceName}.`)
      : result(key, 'untestable', `${handler} is not exposed on ${interfaceName}.`);
  }

  const staticMember = memberKey.endsWith('_static');
  const member = staticMember ? memberKey.slice(0, -'_static'.length) : memberKey;
  if (globalMemberInterfaces.has(interfaceName) || interfaceName.endsWith('GlobalScope')) {
    if (isPresent(global, member))
      return result(key, 'supported', `${member} is present on the global object.`);
    if (interfaceName.endsWith('GlobalScope') && !isPresent(global, interfaceName))
      return result(key, 'untestable', `${interfaceName} is not the active global scope.`);
    return result(key, 'unsupported', `${member} is not present on the global object.`);
  }

  if (!isPresent(global, interfaceName))
    return result(
      key,
      'untestable',
      `${interfaceName} has no inspectable constructor in this context.`,
    );
  if (member === '@@iterator') {
    const iterable =
      isPresent(constructor?.prototype, Symbol.iterator) || isPresent(constructor, Symbol.iterator);
    return result(
      key,
      iterable ? 'supported' : 'unsupported',
      iterable
        ? `${interfaceName} exposes its iterator method.`
        : `${interfaceName} does not expose an iterator method.`,
    );
  }
  if (member.includes('_'))
    return result(
      key,
      'untestable',
      `${member} is a compatibility subfeature, not a runtime member.`,
    );
  const prototype = constructor?.prototype;
  const supported = isPresent(prototype, member) || isPresent(constructor, member);
  return result(
    key,
    supported ? 'supported' : 'unsupported',
    supported
      ? `${member} is present on ${interfaceName} or its prototype.`
      : `${member} is not present on ${interfaceName} or its prototype.`,
  );
}

function cssSupports(global, query, value) {
  try {
    return Boolean(global.CSS?.supports?.(query, value));
  } catch {
    return false;
  }
}

export function probeCompatKey(
  key,
  { global = globalThis, document: doc = globalThis.document } = {},
) {
  if (key.startsWith('api.') || key.startsWith('javascript.builtins.'))
    return probeApiKey(key, global);

  if (key.startsWith('css.properties.')) {
    const parts = key.slice('css.properties.'.length).split('.');
    if (parts[0] === 'custom-property')
      return result(key, 'untestable', 'Custom properties require a concrete --name to test.');
    const [property, ...valueParts] = parts;
    if (!global.CSS?.supports) return result(key, 'untestable', 'CSS.supports is unavailable.');
    if (!property || valueParts.length > 1)
      return result(key, 'untestable', 'This CSS property key is not a directly testable value.');
    if (valueParts.length) {
      const value = valueParts[0].replace(/_/g, '-');
      return cssSupports(global, property, value)
        ? result(key, 'supported', `CSS.supports recognizes ${property}: ${value}.`)
        : result(key, 'untestable', `CSS.supports cannot confirm ${property}: ${value}.`);
    }
    const supported = cssSupports(global, property, 'initial');
    return result(
      key,
      supported ? 'supported' : 'unsupported',
      supported ? `CSS.supports recognizes ${property}.` : `${property} is not supported.`,
    );
  }

  if (key.startsWith('css.at-rules.')) {
    const parts = key.slice('css.at-rules.'.length).split('.');
    if (parts.length !== 1 || !parts[0])
      return result(key, 'untestable', 'Nested at-rule features cannot be tested generically.');
    if (!global.CSS?.supports) return result(key, 'untestable', 'CSS.supports is unavailable.');
    const rule = parts[0].replace(/_/g, '-');
    if (!cssSupports(global, 'at-rule(@media)'))
      return result(key, 'untestable', 'CSS.supports at-rule conditions are unavailable.');
    const supported = cssSupports(global, `at-rule(@${rule})`);
    return result(
      key,
      supported ? 'supported' : 'unsupported',
      supported ? `CSS.supports recognizes @${rule}.` : `@${rule} is not supported.`,
    );
  }

  if (key.startsWith('css.selectors.')) {
    const parts = key.slice('css.selectors.'.length).split('.');
    if (parts.length !== 1)
      return result(key, 'untestable', 'Nested selector features cannot be tested generically.');
    const selector = parts[0].replace(/_/g, '-');
    if (!global.CSS?.supports) return result(key, 'untestable', 'CSS.supports is unavailable.');
    const classOrPseudo = cssSupports(global, `selector(:${selector})`);
    const pseudoElement = cssSupports(global, `selector(::${selector})`);
    if (
      classOrPseudo ||
      pseudoElement ||
      (functionalSelectorQueries[selector] &&
        cssSupports(global, functionalSelectorQueries[selector]))
    )
      return result(key, 'supported', `The selector ${selector} is recognized.`);
    if (!cssSupports(global, 'selector(:is(a))'))
      return result(key, 'untestable', 'This browser cannot test CSS selector support.');
    return result(key, 'unsupported', `The selector ${selector} is not recognized.`);
  }

  if (key.startsWith('html.elements.')) {
    if (!doc?.createElement) return result(key, 'untestable', 'The DOM is unavailable.');
    const parts = key.slice('html.elements.'.length).split('.');
    if (parts.length > 2 || !parts[0])
      return result(key, 'untestable', 'Nested HTML element features cannot be tested.');
    const [elementName, attribute] = parts;
    const element = doc.createElement(elementName);
    if (attribute) {
      if (element.constructor?.name === 'HTMLUnknownElement')
        return result(
          key,
          'untestable',
          `<${elementName}> is not available for attribute probing.`,
        );
      return isPresent(element, attribute)
        ? result(key, 'supported', `${attribute} is present on <${elementName}>.`)
        : result(key, 'untestable', `${attribute} cannot be confirmed on <${elementName}>.`);
    }
    const supported = element.constructor?.name !== 'HTMLUnknownElement';
    return result(
      key,
      supported ? 'supported' : 'unsupported',
      supported ? `<${elementName}> is recognized.` : `<${elementName}> is unknown.`,
    );
  }

  if (key.startsWith('html.global_attributes.')) {
    const parts = key.slice('html.global_attributes.'.length).split('.');
    if (parts.length !== 1 || !parts[0])
      return result(key, 'untestable', 'Nested global-attribute values cannot be tested.');
    const attribute = parts[0];
    const prototype = global.HTMLElement?.prototype;
    if (!prototype) return result(key, 'untestable', 'HTMLElement.prototype is unavailable.');
    const normalized = attribute.toLowerCase();
    const candidates = [
      attribute,
      normalized,
      globalAttributeIDLNames[normalized],
      normalized.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
    ].filter(Boolean);
    const match = candidates.find((candidate) => isPresent(prototype, candidate));
    return match
      ? result(key, 'supported', `${match} is present on HTMLElement.prototype.`)
      : result(
          key,
          'untestable',
          `${attribute} has no directly detectable HTMLElement.prototype property.`,
        );
  }

  return result(key, 'untestable', 'No runtime probe is defined for this compatibility key.');
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
