// ===== Monster cast (Q 2026-11-20 "เปลี่ยนระบบ Charge > Casting"): the boss / mini-boss wind-up is a chant the hero can BREAK. =====
// Mirrors the hero Mage chant (skill-math.ts MAGE_CAST): only a direct hit that reached HP and is >= breakMinHp of the monster's
// max HP rolls a break; DoT / reflected ticks never break. A broken cast: no release, gauge pushed back by pushGauge, and its NEXT
// cast can't break (steady = 1, the same pity rule as the hero). The released attack keeps its formula (slamMul, stun).
// Guaranteed counters (chargeCounter, Dispell, Spear Boomerang, หักท่า) still cancel any cast. Pure data: no Phaser. First-pass numbers.
// Q 2026-11-21 "Boss ที่สกิลเวทย์แรงๆ ควรร่ายทั้งหมด": a boss / mini boss's strong magic skill (bolt or magic strike, base pow x hits
// >= skillMinPow) is cast too: the telegraph names it, the next turn releases it; breakable by the same rules. A steady (pity) cast
// after a break hits for steadyDmg of its damage (charge release and skill release alike).
import type { MonTier } from './mon-stats'
import type { MonSkill } from './monsters'

export const MON_CAST = {
  breakBase: 0.25, // chance one qualifying hit breaks the cast
  breakMinHp: 0.015, // a hit must deal >= this share of the monster's max HP (after its shield) to roll at all
  resist: { normal: 0, mini: 0.05, boss: 0.1 } as Record<MonTier, number>, // subtracted from breakBase per tier
  hardResist: 0.05, // extra resist in hard / hell / tower-hell
  pushGauge: 30, // turn gauge the caster loses on a break (clamped at 0)
  steady: 1, // 1 = after a break its next cast can't break (pity), 0 = off
  steadyDmg: 0.5, // x damage of that steady cast's released hit(s) (Q 2026-11-21: "ร่ายรอบใหม่จะเบาลง 50%")
  skillMinPow: 1, // a boss magic skill whose base pow x hits >= this is cast (ร่าย) instead of fired at once
  skillFreeTurn: 0, // 1 = a skill cast also grants the hero an answering turn like the charge cast; 0 = off (Q 2026-11-21)
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

/** Damage multiplier of a released cast: steadyDmg when it was the steady (pity) cast after a break, else 1. */
export const monCastDmgMul = (steady: boolean) => (steady ? Math.max(0, MON_CAST.steadyDmg) : 1)
/** A monster skill that hits the hero as magic: a bolt, or a strike with `magic`. */
export const monSkillIsMagicHit = (sk: Pick<MonSkill, 'kind' | 'magic'>) => sk.kind === 'bolt' || (sk.kind === 'strike' && !!sk.magic)
/** Base power of a damaging skill before level scaling: pow (or the kind's default `dfltPow`, mon-stats POW_DEFAULT) x hits (default 1). */
export const monSkillPower = (sk: Pick<MonSkill, 'pow' | 'hits'>, dfltPow = 0) => (sk.pow ?? dfltPow) * (sk.hits ?? 1)
/** Is this a strong magic skill a boss / mini boss must cast (ร่าย) first? `dfltPow` = the kind's default pow when it sets none. */
export const monSkillCasts = (sk: Pick<MonSkill, 'kind' | 'magic' | 'pow' | 'hits'>, dfltPow = 0) =>
  monSkillIsMagicHit(sk) && monSkillPower(sk, dfltPow) >= MON_CAST.skillMinPow
