// Salvage (v98, design/craft-rules-v2.md 3): melt a forge-crafted piece back into half of the materials that went in.
// Economy: NEVER returns zeny, cards, refine mats, fodder or reroll costs, and always charges a zeny fee. Only a zeny sink.
// refineGems is kept (forgetForge does not touch it), so craft -> salvage -> craft never pays the +7 / +10 gems twice.
import { craftCost, gradeCost } from './craft'
import { gradeOf, isBroken, isTainted, type Item } from './meta'
import { addMat, forgetForge, isWorn, unsocketAll, type SaveData } from '../save'

export const SALVAGE = {
  matReturn: 0.5, // share of the mats put in (build + every grade-up), floored per material
  taintedReturn: 0.25, // a Corrupted piece (Q 2026-11-07)
  cardReturn: 0, // Cardforge cards are never given back (cards sell for zeny)
  feeBase: 50, feePerGrade: 50, feePerRefine: 25, // zeny sink
}

export interface SalvageResult { mats: Record<string, number>; fee: number; cards: string[] /* socketed cards that go back to the bag */ }
export type SalvageWhy = 'notOwned' | 'notCraft' | 'unique' | 'worn' | 'broken'

/** Mats that went into the piece: the build recipe + every grade-up from 2 to `grade`. */
export function investedMats(it: Item, grade: number): Record<string, number> {
  const out: Record<string, number> = { ...craftCost(it).mats }
  for (let g = 2; g <= grade; g++) for (const [id, n] of Object.entries(gradeCost(it, g).mats)) out[id] = (out[id] ?? 0) + n
  return out
}

export function salvageable(s: SaveData, it: Item): { ok: true } | { ok: false; why: SalvageWhy } {
  if (!s.owned.includes(it.id)) return { ok: false, why: 'notOwned' }
  if (it.unique) return { ok: false, why: 'unique' }
  if (!it.craft) return { ok: false, why: 'notCraft' } // shop gear sells; starter gear is not forged
  if (isWorn(s, it.id)) return { ok: false, why: 'worn' }
  if (isBroken(s, it.id)) return { ok: false, why: 'broken' } // repair first: salvage must not dodge the repair bill
  return { ok: true }
}

export const salvageFee = (grade: number, refine: number) => SALVAGE.feeBase + SALVAGE.feePerGrade * (grade - 1) + SALVAGE.feePerRefine * refine

/** What salvaging would give / cost right now (pure). */
export function salvagePreview(s: SaveData, it: Item): SalvageResult {
  const grade = gradeOf(s, it.id), share = isTainted(s, it.id) ? SALVAGE.taintedReturn : SALVAGE.matReturn
  const mats: Record<string, number> = {}
  for (const [id, n] of Object.entries(investedMats(it, grade))) { const back = Math.floor(n * share); if (back > 0) mats[id] = back }
  return { mats, fee: salvageFee(grade, s.refine?.[it.id] ?? 0), cards: [...(s.sockets?.[it.id] ?? [])] }
}

/** Pay the fee, unsocket the cards, give the mats, forget the forge state, drop the piece. Null (nothing changes) when not allowed or the fee is short. */
export function salvage(s: SaveData, it: Item): SalvageResult | null {
  if (!salvageable(s, it).ok) return null
  const res = salvagePreview(s, it)
  if (s.zeny < res.fee) return null
  s.zeny -= res.fee
  unsocketAll(s, it.id)
  for (const [id, n] of Object.entries(res.mats)) addMat(s, id, n)
  forgetForge(s, it.id)
  s.owned = s.owned.filter((x) => x !== it.id)
  return res
}
