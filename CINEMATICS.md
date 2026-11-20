# Story and cinematic beats

**Arc:** a nobody steals his way to money, finds each politician's secret, and blackmails them into backing him. By the end every one of them lets him run for President.

**Gameplay loop per building:** sneak in, steal from safes and desks (`Lootable`, cash), reach the top floor, find the official's secret (a `Lootable` with `holdsSecret`), stand at the banner spot and press E to blackmail. The official endorses you, the banner goes up, you get a perk and clout.

**Tone:** captions are the jokes. The camera and pacing stay serious (slow pushes, held silence). Each shot has one line at most. Shots run 1.5 to 3 seconds.

## Secrets (suggested, change freely)
| Official | Secret | Why it is funny |
|---|---|---|
| DMV Director | Sold 400 fake licenses to a goat | "Licensed to drive. Is a goat." |
| Sanitation Chief | Dumps the island's trash into the president's pool | Pool is brown. |
| Tax Minister | Pays zero tax, keeps two sets of books, both blank | "Audit passed." |
| Propaganda Chief | Every "election win" was a recording of the same crowd | Crowd has one guy in a hat. |
| President El Stupido | Has not signed a law in 31 years, his wife does | The serious one. See finale. |

## Sequences
| Beat | Shots (focus, size, caption) |
|---|---|
| **Intro** | 1. Wide of island, size 12: "Population: 41,000. Jobs: 3." 2. Player on the beach with an empty pocket turned out, size 3: "Your net worth: a flip-flop." 3. Palace on the hill, size 6, drift: "His: everything." 4. Player lifts head, size 3, no caption. |
| **Secret found** (generic) | 1. Dossier open, size 2.5, one-line caption naming the secret. 2. Player's face, size 2.5, no caption. |
| **DMV endorsed** | 1. Director signs with a shaking hand, size 2.5: "He endorses you. Warmly." 2. Banner on the roof, size 7: "Clout: 20%". |
| **Sanitation endorsed** | 1. Chief holds a campaign sign, size 3. 2. Banner over the depot, size 6: "Smells like support." |
| **Tax endorsed** | 1. Vendor's price board flips to half, size 3: "Weapons: 50% off." 2. Banner, size 6: "Clout: 50%". |
| **Propaganda endorsed** | 1. Tower lights up, size 8. 2. Guards freeze mid-patrol, size 5: "Please enjoy this message." 3. Banner on tower, size 7: "Clout: 80%". |
| **Palace unlocked** | 1. Four endorsement banners in one wide shot, size 10. 2. Palace gates open, size 6. 3. Player looks up, size 3, `Serious`: "Nobody refused. That should worry you." |
| **Finale** | 1. President, secret in hand, size 3: "He signs the paper. The paper says you may run." 2. Four officials stand behind you on the balcony, size 6. 3. Crowd, size 9: "Votes counted: 102%." 4. Player at the podium, size 3, `Serious`: "You own all of them now." 5. Slow pull out, size 10, `Serious`: twist, see below. |

## Twist options (a text change only)
- Every secret you found was planted for you to find. The regime wanted a puppet it could also blackmail.
- You now keep a dossier on each of them, and the camera finds a dossier on you, too.
- The player becomes what he exposed. The last shot is him locking a drawer.

## Scene setup
1. Add `GameState`, `CinematicDirector`, `CinematicTriggers`, `Broadcast` to an empty `Systems` object.
2. Main Camera: `CameraRig` with `followTarget` set to the player.
3. Canvas with two bars (top, bottom, stretched horizontally) and a TMP caption. Assign them on `CinematicDirector`.
4. In each building: put a `Lootable` (holdsSecret on, `secretOf` set) on the top floor, plus a banner spot and a `Building` component. Add a few cash-only `Lootable` safes on other floors.
5. Create an empty Transform marker for each shot's camera target.
