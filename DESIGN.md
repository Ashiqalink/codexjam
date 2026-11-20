# COUP D'ÉTAT, BABY! Design record

This file is the source of truth. `CINEMATICS.md` and the Unity scripts in `Assets/` are older and superseded.

Status tags:
- **LOCKED**: decided by the user.
- **PROPOSED**: Kiro's default, waiting for a yes or a change.
- **OPEN**: not decided yet.

---

## 1. Vision
- **LOCKED** Visual style matches `mockup/intro_shot2.png`: bright flat-shaded low-poly, hex colors, warm sun with shadows, black letterbox with a yellow italic caption.
- **LOCKED** A nobody washes up on a corrupt island. He steals, finds each politician's secret, and blackmails them one by one until they all let him run for President.
- **LOCKED** The writing is comedy. The mechanics are serious. The ending has a serious twist.
- **LOCKED** Three.js with WebGPU (WebGL2 fallback). The engine can change if it does not look good.
- **LOCKED** It should feel open-world, with optional places to go.
- **PROPOSED** A full run takes 25 to 35 minutes.

## 2. Screenplay

### Act 1: The wreck (tutorial, about 3 minutes)
- **LOCKED** The player arrives through a shipwreck. Wreck debris near the ship is the first source of resources.
- **PROPOSED** The ship is the cargo ship *SS Opportunity*, wrecked in a storm.
- **PROPOSED** The player is a deckhand with no name and no money.
- **PROPOSED** The wreck teaches one thing per stop, in this order:
  1. Loot crates on the sand (E). This gives the starting cash of about 40.
  2. Climb over a broken hull section (Space).
  3. Crouch past a beach patrol guard (crouch).
  4. Take down that guard from behind. This is optional, and the guard drops cash.
  5. Follow the noise to the market.
- **PROPOSED** The wreck stays on the map for the whole game. A few crates respawn there slowly, as a fallback cash source.

### Act 2: The beach tier
- **LOCKED** The two beach-area buildings can be done in either order. Both must be done before the mid level opens.
- **PROPOSED** The beach tier is the DMV (1 floor) and the Sanitation Dept. (2 floors).

### Act 3: The mid tier
- **PROPOSED** The mid tier is the Tax Office (2 floors) and the Propaganda Tower (3 floors), done in either order. Both must be done to reach 80%.

### Act 4: The Palace
- **LOCKED** The Palace unlocks at 80% clout.
- **PROPOSED** It has 3 floors, and President El Stupido is on Floor 2.
- **PROPOSED** Blackmailing him gives the last 20%. The election then reports 102%.

### After each blackmail: the cover-up
- **LOCKED** The government tries to bury each hijacking with blatant lies. A few caption lines are enough.
- **PROPOSED** The lies show as a "State News" ticker on the HUD for about 10 seconds. Draft lines:
  - DMV: "The DMV has not been hijacked. That banner has always been there. Since 1802."
  - Sanitation: "Reports of a stranger in a dumpster are false. That was the Minister, relaxing."
  - Tax Office: "The Tax Office is operating normally. Taxes are now optional, as always."
  - Propaganda Tower: "This broadcast is not being hijacked. Please stop listening."
  - Palace: "The President has resigned for health reasons. He is healthy. Do not ask."

### Ending
- **OPEN** The twist. Options:
  - **A. Cycle (Kiro's recommendation).** The final shot holds on the beach. A new ship wrecks, and a new nobody washes up. It ties back to the opening and needs no extra explanation.
  - **B. Planted secrets.** The regime planted every secret for you to find. They wanted a puppet they could also blackmail.
  - **C. Dossier.** You now keep a file on each of them, and the camera finds a file on you too.

### Naming
- **OPEN** Island name. Ideas: *Isla Corrupta*, *San Kleptó*, *Banana Republica*.
- **OPEN** Player name, or no name at all.
- **LOCKED** President El Stupido.
- **OPEN** Names for the 4 officials.

## 3. World

### Layout
- **PROPOSED** Map sketch (north is up, about 200 by 200 units, 1 character in the art is about 1 unit wide):

```
                    [ PALACE ]  (north, behind gates and gardens)
                         |
      LIGHTHOUSE        road
       (NW)              |
  [TAX OFFICE] ---- VILLAGE ---- [PROPAGANDA TOWER]     <- mid tier
                   (houses,                (hidden cove, E)
                    church,
                    water tower)
                         |
  [SANITATION] ---- MARKET ---- [DMV]                  <- beach tier
         \          (barber,       \
          \          tailor,      beach bar + fishing pier
           \         stalls)
          SHIPWRECK BEACH  (spawn, SW)
```

- **PROPOSED** Distances, at a walking speed of 4.5 units/sec:
  - Wreck to market: about 40 units, 9 seconds.
  - Market to each beach-tier building: about 45 units, 10 seconds.
  - Beach tier to mid tier: about 70 units, 15 seconds, through the village.
  - Village to the Palace: about 60 units, 13 seconds.
- **PROPOSED** Dirt roads connect the zones and guide the player, but walking off-road is allowed everywhere.
- **PROPOSED** The Palace is the tallest object and can be seen from everywhere, so the player always knows the goal.
- **OPEN** The GDD says the Palace is "on the hill", but the terrain is flat. Kiro proposes a wide stepped stone plinth, about 1.5 units high, used only as visual decoration. The player walks up it on fixed stair triggers.
- **PROPOSED** 6 to 10 civilians walk simple loops in the market and village. They never react to the player.
- **OPEN** Navigation help: a map screen (M), a compass on the HUD, or nothing.
- **LOCKED** There are no map locks. The whole island is walkable from the start. Only mission locks apply.
- **LOCKED** Government buildings sit far apart, with nature and non-interactive buildings in between.
- **PROPOSED** Locked buildings have a closed door and a funny sign, such as "Closed for lunch (since 1994)".
- **PROPOSED** The island is about 200 by 200 units, flat. It is divided into zones:

| Zone | Contents |
|---|---|
| Shipwreck Beach | Spawn, wreck, debris, the first guard |
| Beach Market | Shops, barber, tailor, noisy crowd |
| Beach tier | DMV, Sanitation Dept., dumpsters |
| Village (between tiers) | Houses, church, water tower, palms |
| Mid tier | Tax Office, Propaganda Tower |
| Hill | Palace, gates, gardens |

### Filler assets
- **LOCKED** Non-interactive buildings and natural assets come from 3D credits, Hyper3D first.
- **PROPOSED** Natural assets: 3 palm trees, 2 bushes, 3 rocks, mangroves, flowers, a fishing boat.
- **PROPOSED** Non-interactive buildings: 3 house variants, a church, a lighthouse, a water tower, 2 shacks, a fish stall.

### Optional places
- **LOCKED** Optional places to visit, including a haircut and a dress change.
- **PROPOSED** Barber: haircut styles.
- **PROPOSED** Tailor: outfits.
- **OPEN** Extra optional spots. Ideas:
  - A lighthouse with a view and a hidden cash stash.
  - A hidden cove with a second wreck.
  - A beach bar with a rumor that hints at a secret.
  - A fishing pier.

## 4. Camera
- **LOCKED** Orthographic iso: 45° down, 35° yaw.
- **LOCKED** The camera can change per building interior if a layout needs it.
- **LOCKED** Cinematic shots do not move around. Every shot is a precise, held frame.
- **PROPOSED** Drift is off by default. Cuts are hard cuts.

## 5. Controls
| Action | Key | Status |
|---|---|---|
| Move | WASD | PROPOSED |
| Interact, loot, blackmail | E | PROPOSED |
| Attack | Left mouse button or F | LOCKED |
| Jump or climb (rare, only at marked spots) | Space | LOCKED |
| Crouch | C or Ctrl | PROPOSED (crouch itself is LOCKED) |
| Sprint | Shift | PROPOSED |
| Broadcast perk | B | PROPOSED |
| Map | M | OPEN |
| Pause | Esc | PROPOSED |

## 6. Movement
- **LOCKED** Movement must feel perfect. A dedicated tuning pass happens only when the user asks for it.
- **PROPOSED** Speeds: walk 4.5, sprint 7, crouch 2.5 units/sec.
- **PROPOSED** Short acceleration and deceleration (under 0.1s). Fast turns. Walls slide instead of stopping the player.
- **PROPOSED** Climbing works only at marked ledges, such as crates, the wreck hull, and one Palace balcony.
- **PROPOSED** Jump has a fixed arc with a short grace window after leaving a ledge.

## 7. Stealth
- **LOCKED** A guard checks the vision cone only when it is on the same floor as the player.
- **PROPOSED** Standing: a 90° cone, 7 units long. Crouched: 4 units long, with silent footsteps.
- **PROPOSED** Sprinting makes noise within 5 units, and guards turn toward it.
- **PROPOSED** The detection timer is 1.5 seconds. The DMV perk doubles it.
- **PROPOSED** Takedown: press attack within 1.5 units behind an unaware guard. It is instant and drops cash.
- **PROPOSED** Hiding in dumpsters works only after the Sanitation perk.

## 8. Combat
- **LOCKED** Brawls are allowed. When detection turns into a fight, the game switches to weapon melee.
- **LOCKED** Use the 4 weapons Kiro suggested.
- **PROPOSED** An awake guard takes 3 hits with fists.
- **PROPOSED** Weapon stats:

| Weapon | Price | Effect |
|---|---|---|
| Rubber Chicken | 20 | Fast, loud squeak, 2 hits to knock out |
| Stale Baguette | 35 | Longer reach |
| Folding Chair | 60 | Slow, stuns, 1 hit to knock out |
| Golden Briefcase | 120 | Heavy, guards drop double cash |

- **PROPOSED** Health is 3 hearts. At zero hearts, the player wakes up on the beach and loses half his cash.
- **PROPOSED** A brawl ends when the guards lose the player for 8 seconds.

## 9. Economy and market
- **LOCKED** The market is where the player spends money.
- **OPEN** What the market sells. Ideas:
  - Weapons.
  - Haircuts and outfits.
  - Consumables: a coconut that can be thrown as a distraction, a banana peel that trips a chasing guard, and a health snack.
  - Fake ID. In one building, guards see the player at a shorter distance.
- **OPEN** Do outfits only change looks, or does one act as a disguise?
- **LOCKED** Bribery stays in the game. Where it is used is still open.
- **OPEN** Bribery uses. Ideas:
  - Pay a door guard to unlock a shortcut.
  - Pay to clear a detection.
  - Pay market cops so they ignore you.
  - Pay a clerk to reveal where a secret is hidden.
- **PROPOSED** Cash sources: wreck crates, guard drops of 10 to 25, desks of 20 to 40, safes of 50 to 150.

## 10. Buildings
- **LOCKED** Each building has its own template.
- **LOCKED** Floors inside a building reuse that building's template, with 1 or 2 major changes per floor.
- **LOCKED** Floor-change and roof-hiding work as a dollhouse cutaway.
- **LOCKED** Stairs are deterministic triggers.
- **PROPOSED** Building themes:

| Building | Floors | Theme | Major change per floor |
|---|---|---|---|
| DMV | 0 | Endless queue, ticket machine | Not applicable |
| Sanitation | 0 to 1 | Trash depot, garbage trucks | Floor 1: offices, compactor room |
| Tax Office | 0 to 1 | Filing cabinets, paper mountains | Floor 1: vault |
| Propaganda Tower | 0 to 2 | Studio sets, cameras | Floor 1: control room. Floor 2: antenna roof |
| Palace | 0 to 2 | Gold, red carpet, portraits | Floor 1: ballroom. Floor 2: President's office |

## 11. Officials and blackmail
- **LOCKED** Knocking out the official is the player's choice. Blackmail works either way.
- **PROPOSED** If the official is knocked out, the player gets their cash, and the cinematic changes one line, such as "He woke up already endorsing you."
- **PROPOSED** Each secret is a dossier on the official's top floor. The player picks it up, then stands at the banner spot and presses E.
- **OPEN** Secrets. Earlier drafts:
  - DMV: sold licenses to a goat.
  - Sanitation: dumps trash in the President's pool.
  - Tax Office: two sets of books, both blank.
  - Propaganda Tower: every "crowd" is the same recording.
  - President: has not signed a law in 31 years.

## 12. Perks and clout
- **LOCKED** The Palace unlocks at 80% clout.
- **PROPOSED** Clout: DMV 20, Sanitation 15, Tax Office 15, Tower 30. The total is 80.
- **PROPOSED** Perks:
  - DMV: detection takes twice as long.
  - Sanitation: dumpster hiding.
  - Tax Office: weapons half price.
  - Tower: Broadcast stuns guards.

## 13. Cinematics
- **LOCKED** Short, meaningful scenes. Held, precise frames.
- **PROPOSED** Sequences: intro (wreck), each secret found, each endorsement (with a cover-up ticker after it), Palace unlocked, and the finale.
- **PROPOSED** All of them can be skipped.
### 2.5D staging rules
- **PROPOSED** Scenes read through silhouette, pose, scale contrast, color and light. Faces and hands carry nothing.
- **PROPOSED** The tightest framing is ortho size 3, which is about one character plus a prop. Low-poly breaks up at closer sizes.
- **PROPOSED** All motion is a simple transform (move, rotate, squash) or a hard cut between two poses. Nothing needs skeletal animation.
- **PROPOSED** Words appear only in captions or on large in-world signs and floating stamped icons. No small readable text in the scene.
- **PROPOSED** Mood changes come from light. Lightning is an ambient flash, the serious turn is desaturation, and night is a dark blue fog.
- **OPEN** Camera angle. Either all shots stay at the gameplay iso angle (Kiro's recommendation), or 2 to 3 character shots use a lower front angle.

### Shot lists (2.5D-checked)
| Sequence | Shots |
|---|---|
| Intro | 1. Night, dark blue fog. The ship's silhouette is tilted 20°, and a lightning flash lights it: "The SS Opportunity. Capacity: 200. Lifeboats: 1." 2. Morning beach, debris scattered, player face-down: "You survived. Your luggage did not." 3. Island wide, Palace on the hill: "[Island]. Population: 41,000. Jobs: 3." 4. Hard cut to the player sitting up. No caption. |
| Secret found | 1. Big stamped dossier icon pops above the player with the secret's caption. 2. Hard cut to the official, who squashes in shock with a sweat-drop icon. |
| Endorsement | 1. The official stands slumped, holding a campaign sign. 2. The banner slides up the roof, with the clout caption. 3. State News ticker runs the cover-up line. |
| Tower endorsement | Adds 1 shot: guards stop and tilt mid-patrol: "Please enjoy this message." |
| Palace unlocked | 1. Wide shot with all 4 banners visible. 2. Palace gates swing open. 3. Tiny player in front of the huge gates, desaturated: "Nobody refused. That should worry you." |
| Finale | 1. El Stupido, slumped, holds your sign. 2. The 4 officials stand in a row behind you on the balcony. 3. Crowd of simple instanced figures: "Votes counted: 102%." 4. Player at the podium, desaturated: "You own all of them now." 5. Twist shot (see Ending). For the cycle twist: the beach at night, a new ship silhouette tilts in a lightning flash. |

## 14. HUD
- **LOCKED** The HUD has a fun style, not a generic one.
- **PROPOSED** Campaign-poster look. Each element:
  - Clout is a vote-o-meter thermometer.
  - Cash is a soggy wallet.
  - Detection is a sweat-drop icon over the player.
  - Lies scroll on a State News ticker.
  - Prompts are hand-stamped stickers.
- **OPEN** Font and color palette.

## 15. Audio (fal)
- **LOCKED** Water, footsteps, NPCs. The market is noisy.
- **PROPOSED** Positional audio (`THREE.PositionalAudio`), so the market gets louder as the player gets close.
- **PROPOSED** Ambience: waves, wind in palms, seagulls, ship creak at the wreck, market crowd, office hum indoors.
- **PROPOSED** Footsteps on sand, wood, tile and concrete, plus soft crouch versions.
- **PROPOSED** NPC lines:
  - Guards: "Hey!", "Must be the wind", grunts.
  - Vendors call out.
  - The crowd murmurs.
- **PROPOSED** SFX: takedown, chicken squeak, cash, detection sting, loot, secret, banner, buy, Broadcast, crowd cheer.
- **PROPOSED** Music: beach, stealth, Palace, serious finale.
- **OPEN** Announcer voice.

## 16. Assets
- **LOCKED** Hyper3D is the first choice for 3D. Meshy is the backup, with 1,010 credits.
- **PROPOSED** Characters: player, guard, 4 officials, President, vendor, and 2 to 3 civilians.
- **PROPOSED** Every asset has a primitive stand-in. Materials are overridden to flat colors if the styles clash.
- **OPEN** Rigged animation for the player.

## 17. Technical
- **LOCKED** Three.js `WebGPURenderer`, built with Vite.
- **OPEN** JavaScript or TypeScript. Kiro proposes JavaScript.
- **PROPOSED** No physics engine. Collision is box-based.
- **PROPOSED** No save system, because the run is short.

## 18. Housekeeping
- **OPEN** Should the old Unity `Assets/` folder be deleted?
