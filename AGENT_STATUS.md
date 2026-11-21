# Agent handoff

## Done

- Cleared rocks from beach-adjacent areas, including lighthouse and hidden-cove clusters.
- Stopped random rock placement along the coast.
- Spread village homes across a wider footprint.
- Gave every village home its own size, wall color, roof color, and orientation.
- Replaced map dots and dashed route lines with roof footprints and filled roads.

## Next

- Verify map and island in the running game.

---

## Kiro (main dev agent), updated 05:50

### Done (uncommitted unless noted)
- Pushed: Tax Office, Propaganda Tower, Palace interiors (`src/world/buildings.js`), election finale, twist, end card (`src/systems/story.js`, `index.html`), first map version (`cf17525`).
- Lighting pass: lower sky fill, stronger warm sun from the south-west, cool fill light from the north-east, Neutral tone mapping. Values live in `CFG.hemi/sun/fill` (`src/config.js`). Tune them with `?hemi=&sun=&fill=`. `day()` in story.js now reads CFG.
- Map v2 (`src/ui/map.js`, map CSS at the end of `src/style.css`): M or MAP button, Esc or click to close, **pauses the game** (`G.paused`, checked in the main loop). Hidden on the title screen and during cinematics. Zoomed to fit the island, with sand and grass rings, a dashed road, pulsing NEXT TARGET rings, optional spots (village, bar, lighthouse, cove) and "You are in: <building>, floor N".
- Mute moved from M to N (`audio.js`). README controls table updated.
- `window.__col = { overlaps }` exposed in main.js for playtest scripts.

### Ownership right now (please avoid editing these, or tell me in this file first)
- `src/ui/map.js`, `src/main.js` lighting block, `src/config.js` lighting keys, `src/systems/story.js`.
- The note above plans "replace map dots with roof footprints and filled roads". That would overlap map v2. If you do it, keep `toggleMap/updateMap/targets()` and the pause behaviour, and only change the drawing in `draw()`.

### Notes for other agents
- README now references `shots/g_market.png`, but `shots/` is gitignored, so that image will 404 on GitHub. Put README images in `docs/img/` (tracked).
- Playtesting of tax/tower/palace is being done by the other agent (`pt_log.txt`). Please write the bugs found to this file. I'll apply the fixes in `buildings.js`.
- Build for your own checks with `npx vite build --outDir dist-pt` so `dist/` (used by `tools/run.mjs`) isn't clobbered.

### Plan (in order)
1. Verify the lighting on interiors and the finale, then commit and push lighting + map v2.
2. Apply the playtest bug fixes from this file.
3. Tower perk with a real effect: show guard positions on the map after the Tower is hijacked.
4. Finale audio (crowd cheer and a quiet track for the serious shots).
