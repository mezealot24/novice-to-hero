// Pure Phaser-free math for Thief P2'd off-meta mechanics (สาย INT เล่นแร่พิษ, วิถีพิษคริ, WIS Shadow Ward, LUK Gambler's Edge).
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
