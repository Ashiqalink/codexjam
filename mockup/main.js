// Throwaway mockup of one cinematic frame (intro shot 2). Primitives only, no generated assets.
import * as THREE from 'three/webgpu';

const W = 1600, H = 900;
const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setSize(W, H, false);
renderer.domElement.style.cssText = 'width:100vw;height:100vh;display:block';
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color('#7cc6de');

// Fixed iso camera: 45 deg down, 35 deg yaw. Shot framing = focus + ortho size only.
const focus = new THREE.Vector3(0, 0, 0);
const size = 5.8;
const aspect = W / H;
const cam = new THREE.OrthographicCamera(-size * aspect, size * aspect, size, -size, 0.1, 200);
const pitch = THREE.MathUtils.degToRad(45), yaw = THREE.MathUtils.degToRad(35);
cam.position.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(50).add(focus);
cam.lookAt(focus);

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85, ...o });
const add = (geo, m, x, y, z, parent = scene) => {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};
const jitter = (geo, amt) => {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + (Math.random() - 0.5) * amt);
  geo.computeVertexNormals();
  return geo;
};

// Lights: warm low morning sun, cool sky fill.
scene.add(new THREE.HemisphereLight('#cdeeff', '#e9c98f', 1.4));
const sun = new THREE.DirectionalLight('#ffe3b8', 3.2);
sun.position.set(-12, 14, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 });
scene.add(sun);

// Everything placed in a world group rotated so the shoreline runs diagonally across the frame.
const world = new THREE.Group();
world.rotation.y = THREE.MathUtils.degToRad(50);
scene.add(world);

// Water (faceted) and sand.
const water = add(jitter(new THREE.PlaneGeometry(80, 80, 60, 60), 0.18), mat('#2a9ec7', { roughness: 0.35 }), 0, -0.25, -30, world);
water.rotation.x = -Math.PI / 2; water.castShadow = false;
const shallow = add(jitter(new THREE.PlaneGeometry(60, 5, 40, 4), 0.08), mat('#5cc6d8', { roughness: 0.4 }), 0, -0.15, -3.2, world);
shallow.rotation.x = -Math.PI / 2; shallow.castShadow = false;
const foam = add(new THREE.PlaneGeometry(60, 0.35), mat('#f4fbff'), 0, -0.05, -0.75, world);
foam.rotation.x = -Math.PI / 2; foam.castShadow = false;
const wet = add(new THREE.PlaneGeometry(60, 1.4), mat('#c9a66b'), 0, -0.03, 0, world);
wet.rotation.x = -Math.PI / 2; wet.castShadow = false;
const sand = add(jitter(new THREE.PlaneGeometry(60, 30, 50, 25), 0.12), mat('#f0d29a'), 0, -0.06, 15.6, world);
sand.rotation.x = -Math.PI / 2; sand.castShadow = false;

// Wreck: broken hull tilted in the shallows.
const wreck = new THREE.Group();
wreck.position.set(-4.2, 0, -4.6);
wreck.rotation.set(0.05, -0.5, THREE.MathUtils.degToRad(-20));
world.add(wreck);
add(new THREE.BoxGeometry(7, 1.8, 2.6), mat('#9c3b2e'), 0, 0.3, 0, wreck);
add(new THREE.BoxGeometry(7.05, 0.35, 2.65), mat('#f2efe6'), 0, 1.1, 0, wreck);
add(new THREE.BoxGeometry(6.6, 0.12, 2.3), mat('#b88a5a'), 0, 1.3, 0, wreck);
add(new THREE.BoxGeometry(2, 1.4, 1.8), mat('#e8e2d0'), -1.6, 2.0, 0, wreck);
add(new THREE.BoxGeometry(2.1, 0.15, 1.9), mat('#9c3b2e'), -1.6, 2.75, 0, wreck);
const mast = add(new THREE.CylinderGeometry(0.1, 0.12, 4.5, 6), mat('#6e4a2c'), 1.2, 3.4, 0, wreck);
mast.rotation.z = 0.35;
const stern = add(new THREE.BoxGeometry(1.8, 1.2, 2.4), mat('#7d2f25'), 4.3, -0.3, 0.4, wreck);
stern.rotation.set(0.2, 0.3, 0.6);

// Debris on the sand.
const crate = (x, z, r, s = 0.6) => {
  const c = add(new THREE.BoxGeometry(s, s, s), mat('#b07a43'), x, s / 2 - 0.05, z, world);
  c.rotation.y = r;
  add(new THREE.BoxGeometry(s * 1.02, s * 0.15, s * 1.02), mat('#7a5230'), 0, 0, 0, c);
  return c;
};
crate(1.5, 1.2, 0.4); crate(2.1, 1.6, 1.1, 0.5); crate(-2.6, 0.9, 0.2, 0.7);
const half = crate(3.4, -0.2, 0.9, 0.55); half.rotation.z = 0.5; half.position.y = 0.15;
const barrel = add(new THREE.CylinderGeometry(0.28, 0.28, 0.75, 8), mat('#6b4226'), -3.2, 0.25, 0.4, world);
barrel.rotation.set(Math.PI / 2, 0, 0.6);
for (const [x, z, r] of [[0.3, -0.2, 0.3], [-0.9, 0.4, 1.4], [2.8, 2.6, -0.4], [-3.6, 2.2, 0.8]]) {
  const plank = add(new THREE.BoxGeometry(1.4, 0.08, 0.22), mat('#a07448'), x, 0.0, z, world);
  plank.rotation.y = r;
}
// Burst suitcase with clothes spilled out.
const suitcase = add(new THREE.BoxGeometry(0.8, 0.22, 0.55), mat('#2f6d94'), 1.6, 0.06, 3.9, world);
suitcase.rotation.y = -0.5;
const lid = add(new THREE.BoxGeometry(0.8, 0.06, 0.55), mat('#2f6d94'), 1.25, 0.2, 3.3, world);
lid.rotation.set(0.9, -0.5, 0);
for (const [x, z, c] of [[2.3, 4.2, '#e86a92'], [2.0, 4.7, '#ffffff'], [2.7, 3.7, '#f2c14e']]) {
  const cloth = add(new THREE.BoxGeometry(0.45, 0.04, 0.35), mat(c), x, 0.0, z, world);
  cloth.rotation.y = x * 2;
}

// Player: face-down deckhand, arms spread.
const player = new THREE.Group();
player.position.set(-0.6, 0, 1.6);
player.rotation.y = 0.7;
world.add(player);
add(new THREE.BoxGeometry(0.55, 0.28, 0.75), mat('#f4f1ea'), 0, 0.14, 0, player);          // shirt
for (const dz of [-0.2, 0, 0.2]) add(new THREE.BoxGeometry(0.56, 0.29, 0.07), mat('#2e5c9e'), 0, 0.14, dz, player); // stripes
add(new THREE.BoxGeometry(0.34, 0.3, 0.32), mat('#c98c5a'), 0, 0.15, -0.55, player);       // head
add(new THREE.BoxGeometry(0.36, 0.1, 0.34), mat('#3a2418'), 0, 0.31, -0.55, player);       // hair
add(new THREE.BoxGeometry(0.55, 0.22, 0.35), mat('#d9a441'), 0, 0.11, 0.53, player);       // shorts
for (const s of [-1, 1]) {
  const arm = add(new THREE.BoxGeometry(0.16, 0.14, 0.62), mat('#c98c5a'), s * 0.48, 0.07, -0.3, player);
  arm.rotation.y = s * -0.9;
  add(new THREE.BoxGeometry(0.18, 0.16, 0.5), mat('#c98c5a'), s * 0.15, 0.08, 0.92, player); // legs
}
const flip = add(new THREE.BoxGeometry(0.16, 0.04, 0.32), mat('#e94f64'), 0.6, 0.0, 0.5, world);
flip.rotation.y = 1.2;

// Palms on the right, rocks.
const palm = (x, z, lean, h = 3.4) => {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.set(lean, x, 0);
  world.add(g);
  const segs = 5;
  for (let i = 0; i < segs; i++) {
    const s = add(new THREE.CylinderGeometry(0.14 - i * 0.012, 0.17 - i * 0.012, h / segs, 6), mat(i % 2 ? '#8a6040' : '#9b6f4a'), Math.sin(i * 0.4) * 0.15 * i, h / segs * (i + 0.5), 0, g);
    s.rotation.z = -i * 0.05;
  }
  const top = new THREE.Group();
  top.position.set(0.55, h, 0);
  g.add(top);
  for (let i = 0; i < 7; i++) {
    const leaf = add(new THREE.BoxGeometry(1.7, 0.06, 0.45), mat(i % 2 ? '#2f9e4f' : '#3fb85c'), 0, 0, 0, top);
    leaf.geometry.translate(0.85, 0, 0);
    leaf.rotation.set(0, (i / 7) * Math.PI * 2, -0.45);
  }
  add(new THREE.SphereGeometry(0.16, 5, 4), mat('#6b4a2a'), 0, -0.1, 0.1, top);
};
palm(5.2, 4.6, 0.15); palm(6.8, 2.6, -0.25, 3.0); palm(4.0, 7.0, 0.1, 3.8);
for (const [x, z, s] of [[4.5, 1.4, 0.45], [5.0, 0.9, 0.3], [-4.5, 3.6, 0.5]]) {
  const r = add(new THREE.DodecahedronGeometry(s, 0), mat('#8e8f8a'), x, s * 0.4, z, world);
  r.rotation.set(x, z, 0);
}

// Gulls.
for (const [x, z] of [[-0.5, -1.6], [0.3, -1.1]]) {
  const gull = new THREE.Group();
  gull.position.set(x, 2.4, z);
  world.add(gull);
  add(new THREE.BoxGeometry(0.2, 0.1, 0.3), mat('#ffffff'), 0, 0, 0, gull);
  for (const s of [-1, 1]) {
    const w = add(new THREE.BoxGeometry(0.45, 0.03, 0.14), mat('#e6e6e6'), s * 0.3, 0.06, 0, gull);
    w.rotation.z = s * 0.35;
  }
}

renderer.setAnimationLoop(() => renderer.render(scene, cam));

