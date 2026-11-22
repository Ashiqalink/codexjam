// Zip dist/ for itch.io: index.html must sit at the archive root.
import fs from 'node:fs';
import path from 'node:path';
import yazl from 'yazl';

const dist = path.join(process.cwd(), 'dist');
const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const out = path.join(process.cwd(), 'release', `CoupDetatBaby-${version}-itch-html5.zip`);

fs.mkdirSync(path.dirname(out), { recursive: true });
const zip = new yazl.ZipFile();

const walk = (dir, prefix = '') => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(full, name);
    else zip.addFile(full, name, { mtime: new Date(0), mode: 0o100644 });
  }
};
walk(dist);

zip.outputStream.pipe(fs.createWriteStream(out)).on('close', () => {
  console.log('release/' + path.basename(out), (fs.statSync(out).size / 1024 / 1024).toFixed(1) + ' MB');
});
zip.end();
