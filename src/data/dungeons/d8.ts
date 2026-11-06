// ===== D8 (v78 scaffold stub) — filled in by its own pack: see docs/design/dungeon-6-10-stat-monsters.md §4 =====
// Only `import type` here (see dungeons/pack.ts).
import type { DungeonPack } from './pack'

/** Every monster id of this dungeon (a union of string literals). */
export type D8Kind = never
/** Its mini bosses (MonsterDef.mini). */
export type D8Mini = never

export const D8: DungeonPack<D8Kind> = {
  monsters: {},
  dungeon: null,
  cards: [],
  mats: [],
  miniRelics: {},
  miniHints: {},
  holyFoes: [],
  monSpeed: {},
}
