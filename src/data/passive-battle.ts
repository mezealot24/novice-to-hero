// Pure Phaser-free combat math for PoE Passive Tree BattleScene hooks (Phase 1: Thief-Line, Phase 2: Swordsman-Line).
// BattleScene.ts calls these helpers directly; tests/passive-battle.test.ts verifies exact formulas & edge cases.
import { SWORD_S1 } from './jobs'
import { KIT } from './skill-math'

// ---------- 1. Death Mark (Keystone 💀 ตราความตาย — pure B6 echo, zero double-dip) ----------

export interface DeathMarkCandidate {
  dead: boolean
  hp: number
}

/** Pick highest-HP alive monster, preferring targets that are not guarded (e.g. Drainer's Summon Maiden). */
export function pickDeathMarkTarget<T extends DeathMarkCandidate>(
  mons: readonly T[],
  isGuarded: (m: T) => boolean,
): T | undefined {
  const live = mons.filter((m) => !m.dead)
  if (!live.length) return undefined
  const unguarded = live.filter((m) => !isGuarded(m))
  const pool = unguarded.length ? unguarded : live
  let best = pool[0]
  for (let i = 1; i < pool.length; i++) {
    if (pool[i].hp > best.hp) best = pool[i]
  }
  return best
}

/** Apply or refresh Death Mark turns. Refreshing an already-marked target preserves recorded damage (guards echo_double). */
export function applyDeathMarkState(
  curTurns: number,
  curDmg: number,
  turns: number = KIT.thiefDeathMarkTurns,
): { turns: number; dmg: number } {
  const nextTurns = Math.max(1, Math.round(turns))
  return curTurns > 0 ? { turns: nextTurns, dmg: Math.max(0, curDmg) } : { turns: nextTurns, dmg: 0 }
}

export interface DeathMarkRecordCheck {
  dot: boolean
  pure: boolean
  allyHitting: boolean
  popping: boolean
  mobExecuting: boolean
  markTurns: number
  ratio: number
}

/** Only active non-DoT hero hits record damage into Death Mark (never DoT, allies, echo pops, or instant executes). */
export const shouldRecordDeathMark = (c: DeathMarkRecordCheck): boolean =>
  !c.dot && !c.pure && !c.allyHitting && !c.popping && !c.mobExecuting && c.markTurns > 0 && c.ratio > 0

/** Net HP lost by the target (post-shield, clamped to >= 0, excludes overkill below 0 HP). */
export const deathMarkNetHpDmg = (hpBefore: number, hpAfter: number): number =>
  Math.max(0, Math.max(0, hpBefore) - Math.max(0, hpAfter))

/** Pure B6 echo damage from recorded net HP damage. `ratio` is `Stats.thDeathMark` (already KIT.thiefDeathMarkEcho). */
export const deathMarkEchoDmg = (recordedDmg: number, ratio: number): number =>
  recordedDmg > 0 && ratio > 0 ? Math.max(1, Math.round(recordedDmg * ratio)) : 0

/** Early detonation when a marked monster survives a hit below `KIT.thiefDeathMarkAt` HP with recorded damage. */
export const deathMarkEarlyPop = (
  hp: number,
  maxHp: number,
  markTurns: number,
  recordedDmg: number,
  atShare: number = KIT.thiefDeathMarkAt,
): boolean => hp > 0 && maxHp > 0 && markTurns > 0 && recordedDmg > 0 && hp < maxHp * atShare

// ---------- 2. Mistwalker (Keystone 🌑 หมอกลวงตา — DR + shield cut) ----------

/** Multiplicative DR step after WIS Shadow Ward vs magic / monHit >= 999 / trueSight (min 1 dmg). */
export function applyMistDr(dmg: number, mistDr: number): number {
  if (dmg <= 0) return 0
  const dr = Math.min(0.9, Math.max(0, mistDr))
  return dr > 0 ? Math.max(1, Math.ceil(dmg * (1 - dr))) : dmg
}

/** Shield gain multiplier for `Stats.thDefShieldCut` (DEF cut is already applied in heroBuild). */
export const shieldCutMul = (defShieldCut: number): number =>
  Math.max(0, 1 - Math.max(0, defShieldCut))

// ---------- 3. Blade Flurry (Keystone 🌪️ คมมีดประสาน — Shadow Dance cut + Mobster extra slash) ----------

/** Per-stab multiplier in `shadowDance()` matching `thiefUltBudget()` / `ultInfo()`. */
export const flurryStabMul = (hitPow: number, thUltAgi: number, thFlurryDmgCut: number): number =>
  KIT.thiefUlt * Math.max(0, 1 - Math.max(0, thFlurryDmgCut)) * hitPow * (1 + thUltAgi)

/** Extra AoE slash multiplier in Mobster `ทวงหนี้`. `thMobFlurry` is a flag (1), multiplied by `KIT.thiefMobFlurryMul` (0.5). */
export const mobsterFlurrySlashMul = (h2: number, pskill: number, thMobFlurry: number): number =>
  thMobFlurry > 0 ? KIT.thiefMobFlurryMul * h2 * (1 + pskill) : 0

// ---------- 4. Eldritch Venom (Keystone ⚗️ สัญญาเล่นแร่ — Toxic Overheal shield + physical leech cut) ----------

/** Convert poison-leech overheal into shield capped at `capShare` of maxHp, respecting `defShieldCut` and never shrinking existing shield. */
export function applyToxicOverheal(
  curShield: number,
  overheal: number,
  maxHp: number,
  capShare: number = KIT.thiefOverhealCap,
  defShieldCut = 0,
): number {
  if (overheal <= 0 || maxHp <= 0 || capShare <= 0) return curShield
  const cap = Math.ceil(maxHp * capShare)
  if (curShield >= cap) return curShield
  const add = overheal * shieldCutMul(defShieldCut)
  return Math.min(cap, curShield + add)
}

/** Multiplier on physical lifesteal in `strike()` (never cuts magic hits or poison leech). */
export const physLeechMul = (magic: boolean, thPhysLeechCut: number): number =>
  magic ? 1 : Math.max(0, 1 - Math.max(0, thPhysLeechCut))

// ---------- 5. Shieldbreaker (Notable ⚡ ทะลุโล่พิฆาต — S3 monster shield pierce) ----------

/** Active monster-shield pierce ratio for the current hit (Skill 3 non-DoT skill hits only). */
export const s3ShieldPierceOf = (
  inS3: boolean,
  src: string,
  dot: boolean,
  thS3ShieldPierce: number,
): number => (inS3 && src === 'skill' && !dot && thS3ShieldPierce > 0 ? Math.min(1, thS3ShieldPierce) : 0)

export interface MonsterShieldSoak {
  absorbed: number
  remShield: number
  remDmg: number
}

/** Compute monster shield absorption with optional `pierce` (0..1) and `pure` (Death Mark B6 bypasses shield). */
export function resolveMonsterShieldSoak(
  shield: number,
  dmg: number,
  pierce: number,
  pure = false,
): MonsterShieldSoak {
  const safeShield = Math.max(0, shield)
  if (pure || safeShield <= 0 || dmg <= 0) {
    return { absorbed: 0, remShield: safeShield, remDmg: dmg }
  }
  const p = Math.min(1, Math.max(0, pierce))
  if (p >= 1) {
    return { absorbed: 0, remShield: safeShield, remDmg: dmg }
  }
  const soakCap = p > 0 ? Math.floor(dmg * (1 - p)) : dmg
  const absorbed = Math.min(Math.ceil(safeShield), soakCap)
  return {
    absorbed,
    remShield: Math.max(0, safeShield - absorbed),
    remDmg: dmg - absorbed,
  }
}

// ---------- 6. Lucky Reprisal (Notable 🍀 มือแห่งโชคชะตา — LUCKY! dodge counter proc) ----------

export type LuckyReprisalAction = 'knife' | 'poison' | 'none'

/** Resolve LUCKY! dodge reprisal action: Rogue/Stalker -> 1 free knife, Mobster/Kingpin -> poison stacks, Base Thief -> none. */
export function luckyReprisalAction(thLuckyKnife: number, job2Id?: string): LuckyReprisalAction {
  if (thLuckyKnife <= 0) return 'none'
  if (job2Id === 'rogue') return 'knife'
  if (job2Id === 'mobster') return 'poison'
  return 'none'
}

// ---------- 7..11. Swordsman-Line Constellation Pure Helpers ----------

/** Incoming damage multiplier from Iron Fortress DR (capped 50%) and Cleavestorm vulnerability. */
export function swordTakenMul(swIronDr: number, swCleaveTaken: number): number {
  const dr = Math.min(0.5, Math.max(0, swIronDr))
  const up = Math.max(0, swCleaveTaken)
  return (1 - dr) * (1 + up)
}

/** Flat bonus damage added to counterattacks based on hero P.DEF (Keystone ⚔️ เกราะสะท้อนคม, skips monster DEF). */
export const counterDefBonusDmg = (def: number, swCounterDefMul: number): number =>
  def > 0 && swCounterDefMul > 0 ? Math.max(1, Math.round(def * swCounterDefMul)) : 0

/** Effective cooldown of ดาบสยบมนตร์ (min 2 hero turns). */
export const swordS1Cd = (swS1CdCut: number, baseCd = SWORD_S1.cd): number =>
  Math.max(2, Math.round(baseCd - Math.max(0, Math.round(swS1CdCut))))

/** Physical hit multiplier while Blood Fury Pact is active below HP threshold (strictly < atShare). */
export const bloodFuryDmgMul = (
  hp: number,
  maxHp: number,
  swBloodFuryDmg: number,
  atShare = KIT.swordBloodFuryAt,
): number => (hp > 0 && maxHp > 0 && swBloodFuryDmg > 0 && hp < maxHp * atShare ? 1 + Math.max(0, swBloodFuryDmg) : 1)

/** Non-lethal current-HP cost on S1 / S3 / Ult cast for Blood Fury Pact (always leaves at least 1 HP). */
export function bloodFurySelfCost(hp: number, swBloodFurySelf: number): number {
  if (hp <= 1 || swBloodFurySelf <= 0) return 0
  return Math.min(hp - 1, Math.max(1, Math.floor(hp * Math.min(0.5, swBloodFurySelf))))
}

/** Armor Break turns granted by Notable 🔨 ทลายเกราะศึก when active. */
export const swordBreakTurnsOf = (swS3ArmorBreak: number, turns = KIT.swordS3BreakTurns): number =>
  swS3ArmorBreak > 0 ? Math.max(1, Math.round(turns)) : 0

/** Armor Break turns for Swordsman-line Skill 3 non-DoT `skill` hits only (0 for sub-procs / DoTs / outside S3). */
export const swordS3BreakTurns = (
  inS3: boolean,
  src: string,
  dot: boolean,
  swS3ArmorBreak: number,
  turns = KIT.swordS3BreakTurns,
): number => (inS3 && src === 'skill' && !dot ? swordBreakTurnsOf(swS3ArmorBreak, turns) : 0)
