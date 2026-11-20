// ===== Monster cast (Q 2026-11-20 "เปลี่ยนระบบ Charge > Casting"): the boss / mini-boss wind-up is a chant the hero can BREAK. =====
// Mirrors the hero Mage chant (skill-math.ts MAGE_CAST): only a direct hit that reached HP and is >= breakMinHp of the monster's
// max HP rolls a break; DoT / reflected ticks never break. A broken cast: no release, gauge pushed back by pushGauge, and its NEXT
// cast can't break (steady = 1, the same pity rule as the hero). The released attack's damage is untouched (slamMul, 999 hit, stun).
// Guaranteed counters (chargeCounter, Dispell, Spear Boomerang, หักท่า) still cancel any cast. Pure data: no Phaser. First-pass numbers.
import type { MonTier } from './mon-stats'

export const MON_CAST = {
  breakBase: 0.25, // chance one qualifying hit breaks the cast
  breakMinHp: 0.015, // a hit must deal >= this share of the monster's max HP (after its shield) to roll at all
  resist: { normal: 0, mini: 0.05, boss: 0.1 } as Record<MonTier, number>, // subtracted from breakBase per tier
  hardResist: 0.05, // extra resist in hard / hell / tower-hell
  pushGauge: 30, // turn gauge the caster loses on a break (clamped at 0)
  steady: 1, // 1 = after a break its next cast can't break (pity), 0 = off
}

/** Only a hit of >= breakMinHp of the monster's max HP may roll for a break. */
export const monBreaksOn = (dmg: number, monMaxHp: number) => monMaxHp > 0 && dmg > 0 && dmg >= monMaxHp * MON_CAST.breakMinHp
/** Chance one qualifying hit breaks a monster's cast: breakBase − tier resist (− hardResist), never below 0. */
export const monBreakChance = (tier: MonTier, hard: boolean) =>
  Math.max(0, MON_CAST.breakBase - (MON_CAST.resist[tier] ?? 0) - (hard ? MON_CAST.hardResist : 0))
/** Gauge after a break push (never below 0). */
export const monBreakGauge = (gauge: number) => Math.max(0, gauge - MON_CAST.pushGauge)
/** Does a break make the caster's next cast steady (unbreakable)? */
export const monCastPity = () => MON_CAST.steady > 0
