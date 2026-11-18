# Novice to Hero: Godot slice

Real-time roguelike ARPG prototype on **Godot 4.7** (GDScript, Forward+ renderer). The web game
(Phaser, repo root) is unchanged; this folder is self-contained.

What is in the slice: the **Rogue** fighting through **D1 ทุ่งเจลล็อป** (3 rooms + boss) with a
MOBA-style camera and click-to-move controls, a toon / cel look with dark outlines, and a
late-afternoon meadow (swaying grass, dirt path, warm sun with cool shadows, tilt-shift depth of
field, bloom, floating dust).

## Open and play
Godot Project Manager → **Import** → pick `godot/project.godot` → **F5**.

| Input | Action |
|---|---|
| Right or left click (hold to steer) | Walk there / attack the monster under the cursor |
| **Q** ปามีด | Fan of 3 knives toward the cursor. Each hit = +1 Combo Point |
| **W** เงาพริ้ว | Dash toward the cursor, untouchable on the way; next basic hit is a sure crit |
| **E** Back Stab | Blink behind a monster, sure crit; spends all Combo Points (+20 % each) |
| **R** พายุมีด | Knives rain on everything nearby for 2.4 s; the last knife hits hardest |
| S | Stop |
| Y / Space / wheel | Camera lock toggle / snap to hero (hold) / zoom |
| F9 | New run |

Passive: basic hits build Combo Points (max 5); every 3rd hit throws a flying knife.
Every monster attack shows a red marker on the ground first: walk (or W) out of it to dodge.

## Art
Everything on screen is built from code (primitive meshes + shaders), so there are no art files yet.
Drop a model whose file name contains `rogue` (for example `Rogue.glb` from the CC0 KayKit
Adventurers pack) into `assets/` and it replaces the placeholder hero: see `assets/README.txt`.
Only CC0 / own assets. Nothing from Trickster or any other commercial game.

## Layout
| Path | What |
|---|---|
| `scenes/game.gd` | Main scene: input → orders, dungeon flow (room → portal → boss → win / death) |
| `actors/` | `Arena` (simulation step), `Hero` (Rogue kit), `Monster` + `Hopper` / `Dasher` / `BossKing` AI, `Knife` |
| `visual/` | Placeholder chibi Rogue, model loader, jelly and wolf looks |
| `world/meadow.gd` | Ground, grass, scenery, light, environment, dust |
| `camera/moba_camera.gd` | Follow / free camera, zoom, shake, depth of field |
| `ui/` | HUD, skill slots, HP bars and damage numbers |
| `fx/fx.gd` | Telegraphs, slashes, sparks |
| `shaders/` | `toon` + `outline` (cel look), `grass`, `ground`, effect shaders |
| `core/combat.gd` | Damage roll, finisher, XP curve, sub-seeds (pure functions) |
| `run/` | `RunState` (rooms, seeded spawns), `Bot` (autoplay) |
| `autoload/` | `GameData` (JSON), `Feedback` (hit-stop, shake, sparks) |

## Data
- `data/monsters.json`, `data/dungeons.json`: exported from the web game's `src/data/`, which stays
  the single source of truth. After changing it run `npm run export:godot` (repo root) and commit.
- `data/slice.json`: numbers only the real-time game needs (hero, Rogue kit, AI timings, arena).
  Tune here, not in scripts.

When exporting a build, add `*.json` to the export preset's non-resource filter.

## Tests (headless)
```bash
godot --headless --path godot --import                          # once per fresh checkout
godot --headless --path godot --script res://tests/run_tests.gd # exit code 1 on failure
godot --headless --path godot --script res://tests/compile_shaders.gd 2>&1 | grep "SHADER ERROR"   # no output = pass
```
On Windows use the console build, e.g. `Godot_v4.7.2-stable_win64_console.exe`.
The suite covers data, damage maths, seeded spawns, camera smoothing, hit-stop, each skill, dodging,
the boss phase, and full runs played by the bot.

Autoplay / fixed seed (also handy for recording): `godot --path godot -- --autoplay --seed=42 --room=4`
