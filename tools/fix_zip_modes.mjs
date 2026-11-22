// electron-builder creates the Linux zip on Windows with mode 0666 on every
// entry, so the game binary is not executable after extraction. Patch the
// central directory in place: set the Unix mode of the binaries to 755.
import fs from 'node:fs';
import path from 'node:path';

const EXEC = new Set(['coup-detat-baby', 'chrome-sandbox', 'chrome_crashpad_handler']);

let files = process.argv.slice(2);
if (!files.length) {
  const dir = path.join(process.cwd(), 'release');
  files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.zip')).map((f) => path.join(dir, f)) : [];
}

for (const file of files) {
  const buf = fs.readFileSync(file);
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('not a zip: ' + file);
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  let patched = 0;
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad entry at ' + p);
    const nameLen = buf.readUInt16LE(p + 28);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen).split('/').pop();
    if (EXEC.has(name)) {
      buf.writeUInt16LE((3 << 8) | 20, p + 4); // made by: Unix
      buf.writeUInt32LE(0o100755 * 0x10000, p + 38); // -rwxr-xr-x
      patched++;
    }
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  fs.writeFileSync(file, buf);
  console.log(`fixed modes on ${patched} entries in ${file}`);
}
