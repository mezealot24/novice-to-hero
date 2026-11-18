# Godot slice (M0)

Real-time roguelike ARPG prototype on **Godot 4.7** (GDScript). Plan: `docs/design/pivot-godot-arpg-v1.md`.
The web game (Phaser, repo root) is unchanged.

## Open
Godot Project Manager → **Import** → pick `godot/project.godot` in this repo → Edit → **F5**.
WASD / arrows move the hero (yellow); D1 room 1 monsters (green) chase it. That is all M0 does.

## Data
Balance data comes from the web game's `src/data/` (single source of truth):
```bash
npm run export:godot   # writes godot/data/{monsters,dungeons,affixes}.json, commit them
```

## Tests (headless)
```bash
godot --headless --path godot --import
godot --headless --path godot -s res://tests/run_tests.gd   # exit 1 on failure
```
On Windows use the console build, e.g. `Godot_v4.7.2-stable_win64_console.exe`.
