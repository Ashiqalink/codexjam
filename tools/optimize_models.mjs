// Shrinks generated GLBs for the web: keeps only the base colour texture (the game uses flat
// lighting, no normal/metal maps), resizes it to 512px WebP, and prunes unused data.
// Originals are kept in assets_src/models. Usage: node tools/optimize_models.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, textureCompress } from '@gltf-transform/functions';

const dir = 'public/assets/models';
const src = 'assets_src/models';
fs.mkdirSync(src, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.glb'))) {
  const orig = path.join(src, f);
  if (!fs.existsSync(orig)) fs.copyFileSync(path.join(dir, f), orig);
  const doc = await io.read(orig);
  for (const m of doc.getRoot().listMaterials()) {
    m.setNormalTexture(null);
    m.setMetallicRoughnessTexture(null);
    m.setOcclusionTexture(null);
    m.setEmissiveTexture(null);
    m.setMetallicFactor(0);
    m.setRoughnessFactor(0.85);
  }
  await doc.transform(
    prune(),
    dedup(),
    weld(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 82 }),
  );
  await io.write(path.join(dir, f), doc);
  const kb = fs.statSync(path.join(dir, f)).size / 1024;
  console.log(f, `${(fs.statSync(orig).size / 1048576).toFixed(1)}MB -> ${kb.toFixed(0)}KB`);
}
