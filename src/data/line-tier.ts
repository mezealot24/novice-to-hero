// Q 2026-11-20: option-line tiers, shared by forge option lines and jewels.
// ⚪ Normal · 🔵 Magic · 🟡 Rare · 🟠 Legendary · 🩷 Mythic. Weights + multipliers live in REFINE (craft.ts).
import { REFINE, type RefineLine } from './craft'

export type LineTier = 0 | 1 | 2 | 3 | 4
export const LINE_TIER_MAX: LineTier = 4
export const LINE_TIER_NAME = ['Normal', 'Magic', 'Rare', 'Legendary', 'Mythic'] as const
export const LINE_TIER_ICON = ['', '🔵', '🟡', '🟠', '🩷'] as const
export const LINE_TIER_COLOR = ['#e6e8f2', '#6fb3ff', '#ffd84d', '#ff9a3c', '#ff7ad9'] as const

/** Tier of a line: its own `tier`, or Rare for an old gold line, else Normal. */
export const lineTier = (l: Pick<RefineLine, 'tier' | 'gold'>): LineTier => (l.tier ?? (l.gold ? 2 : 0)) as LineTier
/** Roll a tier from REFINE.lineTierW. */
export function rollTier(rnd: () => number = Math.random): LineTier {
  const w = REFINE.lineTierW, total = w.reduce((a, x) => a + x, 0)
  let r = rnd() * total
  for (let t = 0; t < w.length; t++) { r -= w[t]; if (r < 0) return t as LineTier }
  return 0
}
/** A value at a tier: whole-number stats round, the rest keep 3 decimals. */
export function tierVal(base: number, tier: LineTier, whole: boolean): number {
  const v = base * REFINE.lineTierMul[tier]
  return whole ? Math.max(1, Math.round(v)) : Math.round(v * 1000) / 1000
}
/** The line's value before its tier multiplier. */
export const lineBase = (l: RefineLine) => l.base ?? l.val / REFINE.lineTierMul[lineTier(l)]
/** Build a line at a tier (drops the legacy gold flag). */
export function makeLine(stat: string, base: number, tier: LineTier, whole: boolean): RefineLine {
  return { stat, val: tierVal(base, tier, whole), ...(tier ? { tier: tier as 1 | 2 | 3 | 4 } : {}), base }
}
