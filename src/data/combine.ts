// 🧬 Combine rules + save action (Q 2026-11-24, spec "ระบบผสมไอเทม — Spec v1" §กฎการผสม). Data lives in combine-items.ts.
// Two owned, unworn, unbroken, untainted pieces + the core (craft cost) -> the combined item.
// Carry-over: grade = the highest grade of the two pieces; refine starts at +0 (refineGems history is kept, so no free gem twice);
// socketed cards go back to the bag; aspect / awaken / ascend of the pieces are lost with them.
// Money rule: pure zeny sink, nothing here pays zeny out. Salvage of a combined piece = the usual 50% of its core (salvage.ts).
import { COMBINE_ITEMS } from './combine-items'
import { craftCost } from './craft'
import { gradeOf, isBroken, isTainted, itemById, type Item } from './meta'
import { canPay, forgetForge, isWorn, pay, unsocketAll, type SaveData } from '../save'

export { COMBINE, COMBINE_ITEMS } from './combine-items'

export type CombineWhy = 'notCombine' | 'owned' | 'locked' | 'missing' | 'worn' | 'broken' | 'tainted' | 'short' | 'cards'
export type CombineCheck = { ok: true } | { ok: false; why: CombineWhy; piece?: string }

export const isCombine = (it: Item) => !!it.combine
/** Tier 3 Mythic: one worn at a time (save.ts mythicEquipBlocked). */
export const isMythic = (it: Item) => it.combine?.tier === 3
/** The two pieces a combined item eats. */
export const combineParts = (it: Item): Item[] => (it.combine?.from ?? []).map(itemById)
/** "ผสมต่อได้เป็น…": combined items that use this piece. */
export const buildsInto = (id: string): Item[] => COMBINE_ITEMS.filter((c) => c.combine!.from.includes(id))
/** Grade the result starts at: the highest of the pieces' grades. */
export const combineGrade = (s: SaveData, it: Item) => Math.max(1, ...(it.combine?.from ?? []).map((id) => gradeOf(s, id)))

export function canCombine(s: SaveData, it: Item): CombineCheck {
  if (!it.combine || !it.craft) return { ok: false, why: 'notCombine' }
  if (s.owned.includes(it.id)) return { ok: false, why: 'owned' }
  if (!((s.clearsBy?.[it.craft.dg] ?? 0) > 0)) return { ok: false, why: 'locked' }
  for (const id of it.combine.from) {
    if (!s.owned.includes(id)) return { ok: false, why: 'missing', piece: id }
    if (isWorn(s, id)) return { ok: false, why: 'worn', piece: id }
    if (isBroken(s, id)) return { ok: false, why: 'broken', piece: id }
    if (isTainted(s, id)) return { ok: false, why: 'tainted', piece: id }
  }
  for (const [id, n] of Object.entries(it.combine.cards ?? {})) if ((s.cards?.[id] ?? 0) < n) return { ok: false, why: 'cards', piece: id }
  if (!canPay(s, craftCost(it))) return { ok: false, why: 'short' }
  return { ok: true }
}

/** Fuse: pay the core, eat both pieces (cards back to the bag), add the result at the carried grade. False = nothing changed. */
export function combine(s: SaveData, it: Item): boolean {
  if (!canCombine(s, it).ok) return false
  const g = combineGrade(s, it)
  if (!pay(s, craftCost(it))) return false
  for (const [id, n] of Object.entries(it.combine!.cards ?? {})) { s.cards![id] -= n; if (s.cards![id] <= 0) delete s.cards![id] }
  for (const id of it.combine!.from) {
    unsocketAll(s, id)
    forgetForge(s, id)
    s.owned = s.owned.filter((x) => x !== id)
  }
  s.owned.push(it.id)
  if (g > 1) (s.grade ??= {})[it.id] = g
  return true
}
