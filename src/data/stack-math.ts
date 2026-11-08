// ===== Stacking math: caps + diminishing returns for stats that can pile up (design/shield-counter-caps-v1.md, Q 2026-11-08). =====
// One helper per rule, called from everywhere (never a second formula): BattleScene.addShield / counterChance, meta.ts heroStats.

/** Diminishing returns: ~sum while small, never above `cap` (soft(cap) = 63% of cap). */
export const soft = (sum: number, cap: number): number => (cap > 0 && sum > 0 ? cap * (1 - Math.exp(-sum / cap)) : 0)

/**
 * Shield that actually lands: the closer the shield already is to `cap`, the less of `raw` it gets (0% full -> 100%, 50% full -> 50%, ...).
 * Never goes past `cap`. `raw` <= 0 passes through (a negative shield add is a nerf from a node, not a gain).
 */
export function shieldGain(current: number, raw: number, cap: number): number {
  if (raw <= 0) return raw
  if (cap <= 0) return 0
  const room = Math.max(0, cap - current)
  return Math.min(room, Math.round((raw * room) / cap))
}

/**
 * Counter rate: every class has at least `min` (so a perk has something to multiply), run picks add a % OF that base
 * (diminishing, `pctSoftCap` = the most they can add: +150% of base), `cap` = COMBO.rateCap (may pass 100% vs Ignore Counter).
 */
export const COUNTER_RULES = { min: 0.08, pctSoftCap: 1.5 }
export const counterRate = (base: number, pct: number, cap: number): number =>
  Math.min(cap, Math.max(base, COUNTER_RULES.min) * (1 + soft(pct, COUNTER_RULES.pctSoftCap)))
