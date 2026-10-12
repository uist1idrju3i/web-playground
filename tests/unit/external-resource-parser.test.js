import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkExternalResources } from '../../scripts/check-external-resources.mjs';

const goodFixture = fileURLToPath(new URL('./fixtures/external-resources/good/', import.meta.url));
const badFixture = fileURLToPath(new URL('./fixtures/external-resources/bad/', import.meta.url));

test('allows same-origin resources and compliant version-pinned cdnjs resources', async () => {
  assert.deepEqual(await checkExternalResources(goodFixture), []);
});

test('allows image data URLs and same-origin manifest icons', async () => {
  const root = await mkdtemp(join(tmpdir(), 'web-playground-good-manifest-'));
  try {
    await writeFile(
      join(root, 'index.html'),
      '<link rel="icon" href="data:image/svg+xml,%3Csvg%3E">\n' +
        '<img src="data:image/png;base64,aGVsbG8=">\n' +
        '<link rel="manifest" href="/manifest.webmanifest">',
    );
    await writeFile(
      join(root, 'manifest.webmanifest'),
      JSON.stringify({
        icons: [{ src: '/icons/site.png' }, { src: 'data:image/png;base64,aGVsbG8=' }],
      }),
    );
    assert.deepEqual(await checkExternalResources(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects non-image data URLs even on image elements', async () => {
  const root = await mkdtemp(join(tmpdir(), 'web-playground-bad-data-url-'));
  try {
    await writeFile(join(root, 'index.html'), '<img src="data:text/html,not-an-image">');
    assert.deepEqual(await checkExternalResources(root), [
      {
        file: 'index.html',
        line: 1,
        message: 'data: img resources must use an image MIME type.',
      },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects external origins, unpinned cdnjs, and missing SRI', async () => {
  const violations = await checkExternalResources(badFixture);
  const messages = violations.map(({ message }) => message);

  assert.ok(messages.includes('Resource origin is not allowed: https://example.com.'));
  assert.ok(messages.includes('cdnjs URL must use an exact /ajax/libs/<name>/<x.y.z>/ version.'));
  assert.ok(messages.includes('cdnjs link must include sha384 or sha512 integrity.'));
  assert.ok(messages.includes('cdnjs link must set crossorigin="anonymous".'));
  assert.ok(messages.includes('Resource origin is not allowed: https://example.org.'));
  assert.ok(messages.includes('Resource origin is not allowed: https://fonts.googleapis.com.'));
  assert.ok(!messages.includes('Resource origin is not allowed: https://developer.mozilla.org.'));
});

test('flags every supported HTML loading attribute and parses tricky script endings', async () => {
  const cases = [
    ['script src', '<script src="https://evil.example/a.js"></script>'],
    ['stylesheet link', '<link rel="stylesheet" href="https://evil.example/a.css">'],
    ['modulepreload link', '<link rel="modulepreload" href="https://evil.example/a.js">'],
    ['preload link', '<link rel="preload" href="https://evil.example/a.js">'],
    ['prefetch link', '<link rel="prefetch" href="https://evil.example/a.js">'],
    ['icon link', '<link rel="icon" href="https://evil.example/a.svg">'],
    ['manifest link', '<link rel="manifest" href="https://evil.example/a.webmanifest">'],
    ['img src', '<img src="https://evil.example/a.png">'],
    ['img srcset', '<img srcset="https://evil.example/a.png 1x, //evil.example/b.png 2x">'],
    ['source src', '<picture><source src="https://evil.example/a.webp"></picture>'],
    ['source srcset', '<picture><source srcset="HTTP://evil.example/a.webp 1x"></picture>'],
    [
      'video src and poster',
      '<video src="https://evil.example/a.mp4" poster="https://evil.example/p.png"></video>',
    ],
    [
      'audio src and poster',
      '<audio src="https://evil.example/a.mp3" poster="https://evil.example/p.png"></audio>',
    ],
    ['track src', '<video><track src="https://evil.example/a.vtt"></video>'],
    ['iframe src', '<iframe src="https://evil.example/"></iframe>'],
    ['frame src', '<frameset><frame src="https://evil.example/"></frameset>'],
    ['embed src', '<embed src="https://evil.example/a.swf">'],
    ['object data', '<object data="https://evil.example/a.bin"></object>'],
    ['input image src', '<input type="image" src="https://evil.example/a.png">'],
    ['svg image href', '<svg><image href="https://evil.example/a.svg"></image></svg>'],
    ['svg use xlink href', '<svg><use xlink:href="https://evil.example/a.svg#icon"></use></svg>'],
    ['svg script href', '<svg><script href="https://evil.example/a.js"></script></svg>'],
    ['svg feImage href', '<svg><feImage href="https://evil.example/a.png"></feImage></svg>'],
    ['meta refresh', '<meta http-equiv="refresh" content="0; url=https://evil.example/">'],
    ['form action', '<form action="https://evil.example/"></form>'],
    ['base href', '<base href="https://evil.example/">'],
    ['inline style', '<div style="background:url(https://evil.example/a.png)"></div>'],
    ['style element', '<style>@import "https://evil.example/a.css";</style>'],
  ];
  const root = await mkdtemp(join(tmpdir(), 'web-playground-resources-'));
  try {
    for (const [name, markup] of cases) {
      await writeFile(join(root, 'case.html'), `<!doctype html>\n${markup}\n`);
      const violations = await checkExternalResources(root);
      const expectedCount = ['audio src and poster', 'img srcset', 'video src and poster'].includes(
        name,
      )
        ? 2
        : 1;
      assert.equal(violations.length, expectedCount, name);
      const expectedOrigin =
        name === 'source srcset' ? 'http://evil.example' : 'https://evil.example';
      assert.ok(
        violations.every(
          ({ file, line, message }) =>
            file === 'case.html' &&
            line === 2 &&
            message === `Resource origin is not allowed: ${expectedOrigin}.`,
        ),
        name,
      );
    }

    await writeFile(
      join(root, 'case.html'),
      '<script>const text = "safe";</script\n  ignored>\n<script src="https://evil.example/after.js"></script>',
    );
    assert.deepEqual(await checkExternalResources(root), [
      {
        file: 'case.html',
        line: 3,
        message: 'Resource origin is not allowed: https://evil.example.',
      },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('flags JavaScript URL sinks and parses HTML inserted as a static string', async () => {
  const cases = [
    ['import', `import 'https://evil.example/a.js';`],
    ['export-from', `export { value } from 'https://evil.example/a.js';`],
    ['import()', `import('https://evil.example/a.js');`],
    ['fetch', `fetch('https://evil.example/a');`],
    ['importScripts', `importScripts('https://evil.example/a.js');`],
    ['Worker', `new Worker('https://evil.example/a.js');`],
    ['SharedWorker', `new SharedWorker('https://evil.example/a.js');`],
    ['WebSocket', `new WebSocket('https://evil.example/socket');`],
    ['EventSource', `new EventSource('https://evil.example/events');`],
    ['WebTransport', `new WebTransport('https://evil.example/transport');`],
    ['URL', `new URL('https://evil.example/a');`],
    ['service worker', `navigator.serviceWorker.register('https://evil.example/sw.js');`],
    ['sendBeacon', `navigator.sendBeacon('https://evil.example/collect');`],
    [
      'XMLHttpRequest.open',
      `const xhr = new XMLHttpRequest(); xhr.open('GET', 'https://evil.example/data');`,
    ],
    [
      'XMLHttpRequest.open optional call',
      `const xhr = new XMLHttpRequest(); xhr?.open('GET', 'https://evil.example/data');`,
    ],
    ['src assignment', `element.src = 'https://evil.example/a';`],
    ['href assignment', `element.href = 'https://evil.example/a';`],
    ['srcset assignment', `element.srcset = 'https://evil.example/a 1x, //evil.example/b 2x';`],
    ['data assignment', `element.data = 'https://evil.example/a';`],
    ['action assignment', `element.action = 'https://evil.example/a';`],
    ['src setAttribute', `element.setAttribute('src', 'https://evil.example/a');`],
    ['href setAttribute', `element.setAttribute('href', 'https://evil.example/a');`],
    [
      'srcset setAttribute',
      `element.setAttribute('srcset', 'https://evil.example/a 1x, //evil.example/b 2x');`,
    ],
    ['data setAttribute', `element.setAttribute('data', 'https://evil.example/a');`],
    ['action setAttribute', `element.setAttribute('action', 'https://evil.example/a');`],
    ['poster setAttribute', `element.setAttribute('poster', 'https://evil.example/a');`],
    [
      'insertAdjacentHTML',
      `element.insertAdjacentHTML('beforeend', '<img src="https://evil.example/a">');`,
    ],
    ['innerHTML', `element.innerHTML = '<iframe src="https://evil.example/a"></iframe>';`],
    ['outerHTML', `element.outerHTML = '<img src="https://evil.example/a">';`],
  ];
  const root = await mkdtemp(join(tmpdir(), 'web-playground-js-sinks-'));
  try {
    for (const [name, source] of cases) {
      await writeFile(join(root, 'case.js'), source);
      const violations = await checkExternalResources(root);
      const expectedCount = ['srcset assignment', 'srcset setAttribute'].includes(name) ? 2 : 1;
      assert.equal(violations.length, expectedCount, name);
      assert.ok(
        violations.every(
          ({ file, line, message }) =>
            file === 'case.js' &&
            line === 1 &&
            message === 'Resource origin is not allowed: https://evil.example.',
        ),
        name,
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('parses numeric member access and optional call chains without false violations', async () => {
  const root = await mkdtemp(join(tmpdir(), 'web-playground-safe-chains-'));
  try {
    await writeFile(join(root, 'case.js'), 'const a = [1]; a[0]; foo?.bar?.();');
    assert.deepEqual(await checkExternalResources(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects external CSS URLs, unsafe module imports, weak cdnjs markup, and parse failures', async () => {
  const root = await mkdtemp(join(tmpdir(), 'web-playground-resource-errors-'));
  try {
    await writeFile(
      join(root, 'case.css'),
      '@import url(//evil.example/a.css);\n.bad{background:url(HTTP://evil.example/a.png)}',
    );
    const cssViolations = await checkExternalResources(root);
    assert.deepEqual(
      cssViolations.map(({ file, line, message }) => ({ file, line, message })),
      [
        {
          file: 'case.css',
          line: 1,
          message: 'Resource origin is not allowed: https://evil.example.',
        },
        {
          file: 'case.css',
          line: 2,
          message: 'Resource origin is not allowed: http://evil.example.',
        },
      ],
    );
    await rm(join(root, 'case.css'));

    await writeFile(
      join(root, 'case.html'),
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/example/1.2.3/example.js"></script>',
    );
    const cdnViolations = await checkExternalResources(root);
    assert.deepEqual(
      cdnViolations.map(({ message }) => message),
      [
        'cdnjs script must include sha384 or sha512 integrity.',
        'cdnjs script must set crossorigin="anonymous".',
      ],
    );

    const moduleUrl = 'https://cdnjs.cloudflare.com/ajax/libs/example/1.2.3/example.js';
    await writeFile(
      join(root, 'case.html'),
      `<script type="module">import '${moduleUrl}';</script>`,
    );
    const moduleViolations = await checkExternalResources(root);
    assert.deepEqual(
      moduleViolations.map(({ message }) => message),
      ['cdnjs resources are not allowed for module import.'],
    );

    await writeFile(
      join(root, 'case.html'),
      `<script type="importmap">{"imports":{"example":"${moduleUrl}"},"integrity":{"${moduleUrl}":"sha384-${'a'.repeat(64)}"}}</script>\n<script type="module">import 'example';</script>`,
    );
    assert.deepEqual(await checkExternalResources(root), []);

    await writeFile(join(root, 'case.js'), 'const = ;');
    const parseViolations = await checkExternalResources(root);
    assert.equal(parseViolations.length, 1);
    assert.match(parseViolations[0].message, /^JavaScript parse failed:/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
