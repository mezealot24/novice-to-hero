// ⇧ Ascension "ยกขั้นของเก่า": re-forge an OLD crafted / unique piece with higher-zone materials. The piece keeps its item id
// (so it still counts for its set, its cards, grade, refine and lines stay), and its stats scale up to the new zone.
// Gear zones by dungeon number: 0 = D1-D5, 1 = D6-D10, 2 = D11-D14. Home dungeon = craft.dg, or unique.dg for uniques; rift and
// shop gear have no home zone and never ascend. Pure rules + save actions (kept out of the UI so the bot and tests can use them).
// Money rule: ascension only spends zeny and mats, it never gives any back.
import type { SaveData } from '../save'
import { NO_ASCEND, type AscendScale } from './craft'
import { matOf } from './materials'
import { gradeOf, isBroken, isTainted, type Item } from './meta'
import { spend, type ForgeCost } from './refine'

/** One ascension step INTO a zone: the dungeon whose mats it eats, how many, the zeny, and the stat multipliers it adds. */
export interface AscendStep extends AscendScale { dg: string; common: number; boss: number; zeny: number }

/** All ascension tuning.
 *
 * Multipliers (measured 2026-11-19 over CRAFT_ITEMS + CLASS_CRAFT_ITEMS + AWAKENED_CRAFT_ITEMS, zone by craft.dg, positive values only):
 *   stat (slot)          D1-D5 -> D6-D10 -> D11-D14   step 1   step 2
 *   weapon atk           19.4     38.7      41.0       x1.99    x1.06
 *   weapon matk          20.7     37.0      46.0       x1.79    x1.24
 *   -> geometric mean                                  x1.89    x1.15      => atk   1.9 / 1.15  (P.ATK / M.ATK)
 *   armor maxHp          78.8    192.9     390.0       x2.45    x2.02
 *   armor def             7.8     15.9      27.3       x2.05    x1.72
 *   -> geometric mean                                  x2.24    x1.87      => flat  2.2 / 1.85 (maxHp, def, hit, flee, maxRes)
 *   base stats per piece  7.3     12.7      15.9       x1.73    x1.25      => base  1.7 / 1.25
 *   ratio stats (crit, combo, critMul, mdef, aspd, pskill, spellCrit, healAmp, resRegen, lifesteal, elemDmg, physPen):
 *   geometric mean of the per-stat averages            x1.25    x1.15      => ratio 1.25 / 1.15
 * One multiplier for all four (x2.06 / x1.46 overall) misses badly: native weapon P.ATK hardly grows past D10 (D11+ weapons get
 * effects / conversions instead) while armor HP doubles, so a single x1.5 gave ascended weapons ~+50% P.ATK over native D11+ ones
 * and ascended armor ~-35% HP. Ratio and base stats barely grow between zones: x2 on crit / combo would beat every native piece.
 * With the split, an average old piece lands within ~20% of a native one of its new zone on each of the four; recheck after playtest.
 *
 * Cost of a step: mats of one mid dungeon of the target zone (D8 / D12), about one native craft of that dungeon (D8 22/5/4500z,
 * D12 22/6/9200z) plus the zeny of a ★5 grade-up (GRADE.cost[5] 1000z), since the piece arrives already ★5. Crafting a native
 * piece and taking it to ★5 costs more (D8: 56 common, 12 boss, 6350z), but that one also brings its own effects. */
export const ASCEND = {
  /** Gate: only a ★5 piece can ascend (end-of-zone investment). */
  minGrade: 5,
  /** Highest dungeon number of each zone (index = zone). */
  zoneTop: [5, 10, 14],
  zoneNames: ['D1-D5', 'D6-D10', 'D11-D14'],
  /** step[z] = one step into zone z. */
  step: {
    1: { dg: 'd8', common: 24, boss: 6, zeny: 5500, atk: 1.9, flat: 2.2, ratio: 1.25, base: 1.7 },
    2: { dg: 'd12', common: 26, boss: 7, zeny: 10200, atk: 1.15, flat: 1.85, ratio: 1.15, base: 1.25 },
  } as Record<number, AscendStep>,
}
/** The top zone (D11-D14). */
export const TOP_ZONE = ASCEND.zoneTop.length - 1

/** Zone of a dungeon id (d1..d14), or -1 (rift, missing, anything else). */
export function zoneOfDungeon(dg: string | undefined): number {
  if (!dg || !/^d\d+$/.test(dg)) return -1
  const n = Number(dg.slice(1)), z = ASCEND.zoneTop.findIndex((top) => n <= top)
  return z < 0 ? TOP_ZONE : z
}
/** Home zone of an item: its craft dungeon, or its unique dungeon. -1 = no home zone (shop / starter / rift gear). */
export const homeZone = (it: Item) => (it.craft || it.unique ? zoneOfDungeon(it.craft?.dg ?? it.unique?.dg) : -1)
export const zoneName = (z: number) => ASCEND.zoneNames[Math.max(0, Math.min(TOP_ZONE, z))]
/** Ascend level of an owned item (0 = never ascended). */
export const ascendOf = (s: { ascend?: Record<string, number> }, id: string) => s.ascend?.[id] ?? 0
/** Highest ascend level an item can reach: one per zone above its home zone (0 = can't ascend). */
export function ascendMax(it: Item): number {
  const z = homeZone(it)
  return z < 0 ? 0 : Math.max(0, TOP_ZONE - z)
}
/** Zone the item stands in at ascend level `level` (its home zone + level). */
export const ascendZone = (it: Item, level: number) => homeZone(it) + Math.max(0, Math.min(ascendMax(it), level))
/** Stat multipliers of an item at ascend level `level` (every step from its home zone multiplied in). Level 0 = NO_ASCEND. */
export function ascendMul(it: Item, level: number): AscendScale {
  const n = Math.max(0, Math.min(ascendMax(it), Math.floor(level)))
  if (!n) return NO_ASCEND
  const z = homeZone(it), out = { ...NO_ASCEND }
  for (let i = 1; i <= n; i++) {
    const st = ASCEND.step[z + i]
    out.atk *= st.atk
    out.flat *= st.flat
    out.ratio *= st.ratio
    out.base *= st.base
  }
  return out
}
/** Mats + zeny for the step to ascend level `next` (null = there is no such step). */
export function ascendCost(it: Item, next: number): ForgeCost | null {
  if (next < 1 || next > ascendMax(it)) return null
  const st = ASCEND.step[homeZone(it) + next]
  return { mats: { [matOf(st.dg, false)]: st.common, [matOf(st.dg, true)]: st.boss }, zeny: st.zeny }
}

/** Why an item can't ascend: cant = no zone above (shop / rift / D11+ gear) · tainted = locked · broken = repair first ·
 * max = already in the top zone · grade = below ASCEND.minGrade. */
export type AscendWhy = 'cant' | 'tainted' | 'broken' | 'max' | 'grade'
/** Can this item ascend right now? One answer for doAscend and for the UI lock (same order as the rules). */
export function ascendCheck(s: SaveData, it: Item): { ok: true } | { ok: false; why: AscendWhy } {
  if (ascendMax(it) <= 0) return { ok: false, why: 'cant' }
  if (isTainted(s, it.id)) return { ok: false, why: 'tainted' } // a tainted item is locked, like grade / refine
  if (isBroken(s, it.id)) return { ok: false, why: 'broken' }
  if (ascendOf(s, it.id) >= ascendMax(it)) return { ok: false, why: 'max' }
  if (gradeOf(s, it.id) < ASCEND.minGrade) return { ok: false, why: 'grade' }
  return { ok: true }
}
export type AscendResult = { ok: true; level: number; zone: number } | { ok: false; why: AscendWhy | 'short' }
/** Pay and raise the item one ascend level (always succeeds once paid). Nothing is spent unless allowed and affordable. */
export function doAscend(s: SaveData, it: Item): AscendResult {
  const chk = ascendCheck(s, it)
  if (!chk.ok) return chk
  const level = ascendOf(s, it.id) + 1, cost = ascendCost(it, level)
  if (!cost || spend(s, cost) === false) return { ok: false, why: 'short' }
  ;(s.ascend ??= {})[it.id] = level
  return { ok: true, level, zone: ascendZone(it, level) }
}
