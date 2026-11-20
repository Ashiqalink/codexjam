# Coup d'État, Baby!

Low-poly 2.5D stealth-brawler for a 12-hour game jam. A nobody washes up from a shipwreck, steals, digs up each politician's secrets and blackmails his way to the presidency.

Built with Three.js (`WebGPURenderer`, WebGL2 fallback) and Vite. 3D models generated with Hyper3D Rodin, audio with fal (ElevenLabs sound effects, CassetteAI music).

## Run

```
npm install
npm run dev
```

Open http://localhost:5173.

Controls: WASD move, Shift sprint, C crouch, Space climb, Click or F attack, E interact, M mute.

## Debug URL options

- `?skip` skip title and intro
- `?at=market|dmv|sanitation|village|wreck` start in an area (`&floor=1` for upstairs)
- `?shot=0..3` hold one intro shot
- `?viewer=<asset>|all` preview generated models
- `?test` run the scripted gameplay checks (results on screen and in the console)

`node tools/run.mjs "<query>" shots/out.png` runs the build headlessly and saves a screenshot (needs `npm run build` first).

## Docs

- `DESIGN.md`: design record (locked, proposed and open decisions)
- `tools/gen_audio.mjs`: regenerates audio (needs `FAL_KEY` in `.env`, see `.env.example`)
- `tools/optimize_models.mjs`: shrinks generated GLBs for the web
- `Assets/`: early Unity C# prototype, superseded by the Three.js build
