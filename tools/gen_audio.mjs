// Generates game audio with fal. Reads FAL_KEY from .env. Usage: node tools/gen_audio.mjs [name ...]
// Skips files that already exist. Output: public/assets/audio/<name>.<ext>
import fs from 'node:fs';
import path from 'node:path';

const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const KEY = env.FAL_KEY;
if (!KEY) throw new Error('FAL_KEY missing in .env');

const SFX = 'fal-ai/elevenlabs/sound-effects/v2';
const MUSIC = 'cassetteai/music-generator';
const sfx = (text, duration_seconds, loop = false) => ({ model: SFX, input: { text, duration_seconds, loop, prompt_influence: 0.5 } });
const music = (prompt, duration) => ({ model: MUSIC, input: { prompt, duration } });

export const JOBS = {
  // Ambience loops
  amb_waves: sfx('Gentle tropical ocean waves lapping on a sandy beach, calm, seamless ambience, no music', 20, true),
  amb_market: sfx('Busy noisy Caribbean outdoor market crowd, people chatting and laughing, vendors calling out, distant steel drum, seamless ambience', 20, true),
  amb_wind: sfx('Warm breeze rustling palm leaves with occasional seagulls in the distance, seamless ambience', 20, true),
  amb_office: sfx('Quiet government office interior, fluorescent light hum, distant typing, a phone ringing far away, seamless ambience', 20, true),
  amb_storm: sfx('Violent night storm at sea, heavy rain, howling wind, rolling thunder, wooden ship creaking', 12),
  amb_creak: sfx('Old wooden shipwreck creaking softly in shallow water, gentle waves knocking the hull, seamless ambience', 15, true),
  // Footsteps
  step_sand: sfx('Single soft footstep on dry beach sand', 0.5),
  step_wood: sfx('Single footstep on a wooden floor', 0.5),
  step_tile: sfx('Single footstep with a shoe on an office tile floor', 0.5),
  step_grass: sfx('Single footstep on grass', 0.5),
  // NPC voices
  npc_hey: sfx('Man security guard shouting Hey! surprised and angry, single short shout', 1),
  npc_huh: sfx('Man muttering a confused Huh? short', 0.8),
  npc_grunt: sfx('Man grunting in pain after a cartoon punch, short', 0.7),
  npc_ko: sfx('Cartoon man groaning and collapsing to the floor with a thud', 1.2),
  npc_vendor: sfx('Market vendor man calling out to customers in a cheerful sing-song voice, short', 2.5),
  // Player and combat
  hit_punch: sfx('Cartoon punch impact, comedic thwack', 0.5),
  hit_chicken: sfx('Rubber chicken squeak when squeezed, loud and funny', 0.7),
  hit_baguette: sfx('Hard stale bread loaf whacking someone, crunchy thwack', 0.5),
  hit_chair: sfx('Metal folding chair hitting someone, loud clang', 0.7),
  hit_briefcase: sfx('Heavy metal briefcase bonk with a bright golden ring', 0.7),
  swing: sfx('Quick whoosh of a swing through the air', 0.5),
  takedown: sfx('Comedic stealth knockout, a bonk followed by a body thud and a cartoon birds tweet', 1.5),
  hurt: sfx('Man saying Oof after getting hit, short', 0.6),
  jump: sfx('Short effort grunt and cloth whoosh while vaulting over a low wall', 0.6),
  // UI and progression
  cash: sfx('Coins and paper money pickup, cheerful jingle', 0.7),
  buy: sfx('Old cash register cha-ching', 1),
  loot: sfx('Rummaging quickly through a wooden crate and papers', 1),
  safe_open: sfx('Safe dial clicks and a heavy metal door creaking open', 1.5),
  secret: sfx('Dramatic suspenseful orchestral sting, comedic, a secret revealed', 2),
  alert: sfx('Short comedic alarm sting, brass stab, you have been spotted', 1),
  banner: sfx('Large cloth banner unrolling with a whoosh followed by a small crowd cheering', 2.5),
  ticker: sfx('Cheesy television news jingle, short', 2),
  dumpster: sfx('Metal dumpster lid opening and slamming shut', 1),
  locked: sfx('Locked door handle rattling', 0.8),
  stairs: sfx('A few quick footsteps going up stairs', 1),
  lightning: sfx('Loud close thunder crack', 2.5),
  // Music
  mus_beach: music('Laid-back Caribbean calypso, steel drums, marimba, light bongos, sunny and mischievous, loopable, instrumental. Tempo: 100 BPM. Key: F Major.', 60),
  mus_stealth: music('Sneaky comedic spy music, pizzicato strings, muted trumpet, soft bongos, tiptoe bass, tense but playful, loopable, instrumental. Tempo: 90 BPM. Key: D Minor.', 60),
  mus_title: music('Bold comedic Latin brass fanfare with timbales and steel drums, a corrupt island dictatorship anthem, instrumental. Tempo: 110 BPM. Key: Bb Major.', 30),
};

const outDir = path.resolve('public/assets/audio');
fs.mkdirSync(outDir, { recursive: true });

async function run(name, job) {
  const exists = fs.readdirSync(outDir).find((f) => f.startsWith(name + '.'));
  if (exists) return `skip ${name}`;
  const h = { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' };
  const sub = await fetch(`https://queue.fal.run/${job.model}`, { method: 'POST', headers: h, body: JSON.stringify(job.input) }).then((r) => r.json());
  if (!sub.request_id) throw new Error(`${name}: submit failed ${JSON.stringify(sub).slice(0, 200)}`);
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const st = await fetch(sub.status_url, { headers: h }).then((r) => r.json());
    if (st.status === 'COMPLETED') break;
    if (st.status === 'FAILED' || st.error) throw new Error(`${name}: ${JSON.stringify(st).slice(0, 200)}`);
  }
  const res = await fetch(sub.response_url, { headers: h }).then((r) => r.json());
  const file = res.audio || res.audio_file;
  if (!file?.url) throw new Error(`${name}: no audio ${JSON.stringify(res).slice(0, 200)}`);
  const ext = (file.url.match(/\.(mp3|wav|ogg)(\?|$)/) || [, 'mp3'])[1];
  const buf = Buffer.from(await fetch(file.url).then((r) => r.arrayBuffer()));
  fs.writeFileSync(path.join(outDir, `${name}.${ext}`), buf);
  return `ok ${name}.${ext} ${(buf.length / 1024).toFixed(0)}KB`;
}

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(JOBS);
const queue = [...names];
const workers = Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const n = queue.shift();
    try { console.log(await run(n, JOBS[n])); } catch (e) { console.log('FAIL', e.message); }
  }
});
await Promise.all(workers);
