// Build a desktop package into a temp dir, then copy the artifacts to release/.
// (Building straight into the project dir can hit EBUSY while electron-builder
// moves its unpacked Electron tree.)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const target = process.argv[2];
if (!['win', 'linux', 'mac'].includes(target)) {
  console.error('usage: node tools/package.mjs <win|linux|mac>');
  process.exit(1);
}
if (target === 'mac' && process.platform !== 'darwin') {
  console.error('macOS packages can only be built on macOS. Push a v* tag and let .github/workflows/desktop.yml build it.');
  process.exit(1);
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'coup-pack-'));
const release = path.join(process.cwd(), 'release');
const keep = /\.(zip|exe|dmg|AppImage|tar\.gz)$/;

try {
  execFileSync(npx, ['electron-builder', '--' + target, '--publish', 'never', '--config.directories.output=' + tmp], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  fs.mkdirSync(release, { recursive: true });
  for (const name of fs.readdirSync(tmp)) {
    if (!keep.test(name)) continue;
    fs.copyFileSync(path.join(tmp, name), path.join(release, name));
    console.log('release/' + name);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
