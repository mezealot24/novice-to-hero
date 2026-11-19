// ⬆⬇ Material conversion (Q 2026-11-19: up 5:1, cross-zone 10:1, down 1:3): trade a dungeon's material for the next / previous dungeon's one in the forge stash.
// Only m_dN / b_dN of D1-D14, one dungeon step at a time, common stays common and boss stays boss. ผลึกโลกันตร์ and Rift mats never convert.
//
// Why these rates (measured 2026-11-19 from dungeon-defs): every dungeon pays about the same per normal run (~7 common + 3 boss;
// 🔥 hard x1.5, 😈 hell x3). Higher dungeons are worth more only because their recipes are bigger and their runs harder. So:
//   up 5 -> 1 inside a zone, 10 -> 1 across a zone edge (D5->D6, D10->D11): a converted D(n+1) piece costs ~5x a native one
//     (D11 craft 20/5 from D10 = 200/50, ~28 D10 runs vs ~3 D11 runs; ⇧ ascend D8 24/6 from D7 ~17 runs vs ~3.3 D8 runs;
//     a 😈 Hell D5 run (x3) crossed into D6 at 10:1 gives ~2 D6 common vs a normal D6 run's ~7). Up = top up a small shortfall only.
//   down 1 -> 3: tops up old-dungeon mats late game (เมือกใส etc.).
//   up then down always loses (5 -> 1 -> 3), so there is no loop to farm. Up costs a zeny fee (sink), down is free.
import { addMat } from '../save'
import { matById } from './materials'

export const CONVERT = {
  up: 5, // in -> 1 out, one dungeon up inside a zone
  upCross: 10, // in -> 1 out, across a zone edge
  down: 3, // 1 in -> this many out, one dungeon down
  zoneTop: [5, 10], // last dungeon of each zone below the top one (D1-D5 | D6-D10 | D11-D14)
  feeCommon: 10, feeBoss: 40, // zeny per piece made going up, x the target dungeon number
  minDg: 1, maxDg: 14,
}

export type ConvertDir = 'up' | 'down'
export interface ConvertQuote { from: string; to: string; spend: number; get: number; zeny: number }

const parse = (id: string) => {
  const m = /^([mb])_d(\d+)$/.exec(id)
  return m ? { boss: m[1] === 'b', n: Number(m[2]) } : null
}

/** The material a step in `dir` gives, or null (not convertible / already at the end). */
export function convertTarget(id: string, dir: ConvertDir): string | null {
  const p = parse(id)
  if (!p || !matById(id)) return null
  const n = p.n + (dir === 'up' ? 1 : -1)
  if (n < CONVERT.minDg || n > CONVERT.maxDg) return null
  const to = `${p.boss ? 'b' : 'm'}_d${n}`
  return matById(to) ? to : null
}

/** In-pieces per one out-piece going up from dungeon number n (5, or 10 across a zone edge). */
export const upRate = (n: number) => (CONVERT.zoneTop.includes(n) ? CONVERT.upCross : CONVERT.up)

/** What `times` conversions cost and give (times = pieces made going up, pieces spent going down). Null = not convertible. */
export function convertQuote(id: string, dir: ConvertDir, times = 1): ConvertQuote | null {
  const to = convertTarget(id, dir), p = parse(id)
  if (!to || !p || !Number.isInteger(times) || times < 1) return null
  if (dir === 'down') return { from: id, to, spend: times, get: times * CONVERT.down, zeny: 0 }
  return { from: id, to, spend: times * upRate(p.n), get: times, zeny: times * (p.boss ? CONVERT.feeBoss : CONVERT.feeCommon) * (p.n + 1) }
}

type Bag = { zeny: number; mats?: Record<string, number> }
/** Most conversions the bag can pay for in one go (0 = none). */
export function convertMax(s: Bag, id: string, dir: ConvertDir): number {
  const q = convertQuote(id, dir, 1)
  if (!q) return 0
  const byMats = Math.floor((s.mats?.[id] ?? 0) / q.spend)
  return q.zeny ? Math.min(byMats, Math.floor(s.zeny / q.zeny)) : byMats
}

/** Convert: pay the mats + fee, add the target mat. Null (nothing changes) when not allowed or short. */
export function convertMat(s: Bag, id: string, dir: ConvertDir, times = 1): ConvertQuote | null {
  const q = convertQuote(id, dir, times)
  if (!q || (s.mats?.[id] ?? 0) < q.spend || s.zeny < q.zeny) return null
  s.zeny -= q.zeny
  s.mats![id] -= q.spend
  if (s.mats![id] <= 0) delete s.mats![id]
  addMat(s as never, q.to, q.get)
  return q
}
