import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import binaryen from 'binaryen';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputDirectory = resolve(root, 'wasm/probes');
const outputDirectory = resolve(root, 'public_html/library/wasm/probes');

await mkdir(outputDirectory, { recursive: true });
for (const filename of (await readdir(inputDirectory)).filter((file) => file.endsWith('.wat'))) {
  const module = binaryen.parseText(await readFile(resolve(inputDirectory, filename), 'utf8'));
  module.setFeatures(binaryen.Features.All);
  if (!module.validate()) throw new Error(`Invalid WebAssembly probe: ${filename}`);
  await writeFile(
    resolve(outputDirectory, filename.replace(/\.wat$/, '.wasm')),
    module.emitBinary(),
  );
  module.dispose();
}
