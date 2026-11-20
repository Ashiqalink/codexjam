import fs from 'node:fs';
const b = fs.readFileSync(process.argv[2]);
const len = b.readUInt32LE(12); const j = JSON.parse(b.slice(20, 20 + len).toString());
console.log(JSON.stringify({ extUsed: j.extensionsUsed, extReq: j.extensionsRequired, materials: j.materials, textures: j.textures, images: j.images?.map(i => ({ mime: i.mimeType, bv: i.bufferView })), meshes: j.meshes?.length, prims: j.meshes?.map(m => m.primitives.map(p => Object.keys(p.attributes))) }, null, 1).slice(0, 2500));
