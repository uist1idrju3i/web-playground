// Downloads the pinned servoshell nightly build and verifies its sha256.
// Pin lives in tests/servo/servo-version.json; binaries land in tests/servo/bin/.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const servoDir = fileURLToPath(new URL('../tests/servo/', import.meta.url));
const binDir = join(servoDir, 'bin');
const pin = JSON.parse(readFileSync(join(servoDir, 'servo-version.json'), 'utf8'));
const markerPath = join(binDir, '.pin');
const binaryPath = join(binDir, 'servo', 'servoshell');
const base = `https://github.com/servo/servo-nightly-builds/releases/download/${pin.tag}`;

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

if (
  existsSync(binaryPath) &&
  existsSync(markerPath) &&
  readFileSync(markerPath, 'utf8') === `${pin.tag}:${pin.sha256}`
) {
  console.log(`servoshell ${pin.tag} already present at ${binaryPath}`);
  process.exit(0);
}

console.log(`Fetching ${pin.asset} @ ${pin.tag} ...`);
const tarball = Buffer.from(await (await fetch(`${base}/${pin.asset}`)).arrayBuffer());
const sidecar = (await (await fetch(`${base}/${pin.asset}.sha256`)).text()).trim();
const expectedSidecarHash = sidecar.split(/\s+/)[0];
const actual = sha256(tarball);
if (actual !== pin.sha256 || actual !== expectedSidecarHash) {
  console.error(
    `sha256 mismatch: pin=${pin.sha256} sidecar=${expectedSidecarHash} actual=${actual}`,
  );
  process.exit(1);
}

rmSync(binDir, { recursive: true, force: true });
mkdirSync(binDir, { recursive: true });
writeFileSync(join(binDir, pin.asset), tarball);
execFileSync('tar', ['xzf', join(binDir, pin.asset)], { cwd: binDir, stdio: 'inherit' });
rmSync(join(binDir, pin.asset));
if (!existsSync(binaryPath)) {
  console.error(`Extracted archive did not contain servoshell at ${binaryPath}`);
  process.exit(1);
}
writeFileSync(markerPath, `${pin.tag}:${pin.sha256}`);
console.log(`servoshell ${pin.tag} ready at ${binaryPath}`);
