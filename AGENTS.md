# AGENTS.md — Novice to Hero Coding & Development Rules

> **Project Stack**: Phaser 3 (pinned 3.90.0) + TypeScript (strict) + Vite (Single-file bundle target)  
> **Genre**: Web Action RPG / Roguelite (Ragnarok-inspired Novice-to-Hero progression)

---

## 🎯 Default Game Development Skills

When working on gameplay, architecture, math formulas, or bugs, prioritize using the following local skills in `.agents/skills/`:

1. `phaser-core`: Scene lifecycle, texture/asset loading, event systems.
2. `phaser-arcade-physics`: Velocity, collision masks/groups, body overlapping, projectile movement.
3. `rpg`: Stat modifiers, damage formulas, XP curves, class progression, equipment affixes.
4. `roguelike`: Dungeon crawl loops, meta-progression, floor scaling, per-run state.
5. `game-ai`: Monster behavior (hopper, dasher, boss patterns), agro distance, steering.
6. `save-systems`: Safe `localStorage` serialization, schema versioning, save migration guards.
7. `game-feel`: Juice, hit-stop, knockback, screen shake, floating combat text.
8. `game-ui-ux`: Responsive HUD, touch/joystick layouts, safe area handling.

---

## 🛡️ Core Development Standards

### 1. Type Safety & TypeScript Discipline
- **Strict Typing**: Never use `any`. Always define explicit interfaces and types.
- **Zero Typecheck Errors**: All changes must pass `npm run typecheck` (`tsc --noEmit`).
- **Tests Integrity**: Run `npm test` before concluding tasks touching game calculations or states.

### 2. Architecture & Data-Driven Balance
- **No Hardcoded Magic Numbers**:
  - Combat numbers, HP, ATK, cooldowns, and drop rates belong in `src/data/` (e.g., `src/data/game-data.ts`, `src/data/meta.ts`).
  - Do not hardcode balance values directly in Entity or Scene files.
- **Phaser 3 Version Pin**:
  - Keep APIs strictly compatible with **Phaser 3.90.0**. Do not introduce deprecated 3.x patterns or Phaser 4-only APIs.
- **Single-File Bundle Compatibility**:
  - Assets and builds must remain compatible with `vite-plugin-singlefile` (`dist/index.html` distribution).

### 3. Persistence & State Management
- **Safe Storage**:
  - Any changes to save schema (`src/save.ts`) must maintain backward compatibility or include fallback defaults.
  - Guard against corrupt or invalid JSON in storage.

