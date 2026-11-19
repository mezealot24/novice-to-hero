// Pure Phaser-free math for Thief P2'd off-meta mechanics (สาย INT เล่นแร่พิษ, วิถีพิษคริ, WIS Shadow Ward, LUK Gambler's Edge).
import { CRIT_RULES } from './battle-rules'
import { KIT, poisonAt } from './skill-math'

/** Whether Contaminate (thief_v2 ระเบิดสารพิษ) can trigger on this target right now. */
export const canDetonate = (used: boolean, poison: number, poisonCap: number, thDetonate: number): boolean =>
  thDetonate > 0 && !used && poison >= poisonAt(KIT.thiefDetAtShare, poisonCap)

/** Poison stacks consumed by Contaminate (at least thiefDetMin, capped at current stacks). */
export const detonateStacks = (poison: number): number =>
  Math.min(Math.max(0, poison), Math.max(KIT.thiefDetMin, Math.floor(Math.max(0, poison) * KIT.thiefDetShare)))

/** Contaminate raw damage before dotMul and B1/B5 amps (M.ATK already enters poisonDmg via KIT.poison.matkPer). */
export const detonateDmg = (det: number, poisonDmg: number, x: number): number =>
  Math.max(0, det) * Math.max(0, poisonDmg) * (KIT.thiefDetPoisonBase + KIT.thiefDetPoisonLv * Math.max(0, x))

/** thief_v3 เลือดพิษ: total poison leech share (node x INT scale + gear poisonLeech, capped at thiefLeechCap). */
export const leechRate = (x: number, intEff: number, gear: number): number =>
  x <= 0
    ? Math.min(KIT.thiefLeechCap, Math.max(0, gear))
    : Math.min(KIT.thiefLeechCap, KIT.thiefLeechLv * x * (1 + KIT.thiefLeechInt * Math.max(0, intEff)) + Math.max(0, gear))

/** thief_v4 ★: Contaminate crit chance from skillCrit + spellCrit, under CRIT_RULES skill cap. */
export const contaminateCritChance = (skillCrit: number, spellCrit: number): number =>
  Math.min(CRIT_RULES.cap.skillCrit, Math.max(0, skillCrit) + Math.max(0, spellCrit))

/** Share of เลือดพิษ leech rate active on Contaminate damage (100% with ★, thiefDetLeechShare otherwise). */
export const contaminateLeechShare = (star: boolean): number => (star ? 1 : KIT.thiefDetLeechShare)

/** thief_v4 ★: poison stacks refunded onto a boss / mini-boss after Contaminate consumes `det` stacks. */
export const contaminateBossRefund = (det: number): number => Math.ceil(Math.max(0, det) * KIT.thiefDetBossRefund)

/** th_t4b วิถีพิษคริ (Perfect Agony): converts critMul above thiefAgonyFrom into flat poison bonus (cap thiefAgonyCap). */
export const agonyBonus = (critMul: number, rate: number): number =>
  rate <= 0 ? 0 : Math.min(KIT.thiefAgonyCap, Math.max(0, critMul - KIT.thiefAgonyFrom) * rate)

/** B5 Poison power bracket (R4.6): Perfect Agony + vsPoison (Contaminate only) share one cap thiefAgonyCap. */
export const poisonPowerBonus = (agony: number, vsPoison: number): number =>
  Math.min(KIT.thiefAgonyCap, Math.max(0, agony) + Math.max(0, vsPoison))

/** Perfect Agony never multiplies crits (e.g. Contaminate ★ crit) or Mobster ทวงหนี้ burst. */
export const paApplies = (crit: boolean, debtBursting: boolean): boolean => !crit && !debtBursting

/** Poison tick total: Perfect Agony multiplies ONLY flat poison (never %HP bite or Wolf %HP bleed). */
export const poisonTickTotal = (flatPoison: number, paBonus: number, hpBite: number, dotMul: number, hpBleed = 0): number =>
  Math.max(1, Math.round((flatPoison * (1 + Math.max(0, paBonus)) + hpBite) * dotMul) + hpBleed)
