// ===== D7-D10 dungeon packs (v78 scaffold, docs/design/dungeon-6-10-stat-monsters.md §4 phase 2-3) =====
// Each level dungeon after D6 lives in its own file (dungeons/dN.ts + gfx/tex/dN.ts) so they can be built in parallel
// without touching the shared tables. game-data / cards / materials / relics / skill-math / BattleScene spread the packs in.
// RULE: pack files use `import type` only (game-data imports the packs as values; a value import back = import cycle).
import type { DungeonDef, MonsterDef } from '../game-data'
import type { EquipCard } from '../cards'
import type { Mat } from '../materials'
import type { RelicId } from '../relics'

export interface DungeonPack<K extends string> {
  /** Every monster of the dungeon (normals, support, minis, boss, summons). Stat monsters: hp / dmg = 1 + bonuses, like D6. */
  monsters: Record<K, MonsterDef>
  /** null = not built yet (the dungeon stays out of DUNGEONS). */
  dungeon: DungeonDef | null
  /** 9 cards: 6 normal / 2 mini / 1 boss (ids are save data: never rename). */
  cards: EquipCard[]
  /** m_dN (normal) + b_dN (boss) materials (ids are save data). */
  mats: Mat[]
  /** Mini boss -> its two signature relics (data/relics.ts MINI_RELICS). */
  miniRelics: Partial<Record<K, [RelicId, RelicId]>>
  /** Mini boss -> duel banner hint (BattleScene MINI_HINT). */
  miniHints: Partial<Record<K, string>>
  /** Undead / demons: Crusader ศรัทธา +25% (skill-math KIT2.crusader.holyFoes). */
  holyFoes: K[]
  /** BATTLE.monSpeed fallback (stat monsters use their AGI speed; this is only read if that is missing). */
  monSpeed: Record<K, number>
}
