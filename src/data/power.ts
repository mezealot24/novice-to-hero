// ===== Hero Power (v59, Q 2026-11-04): ONE number for how strong the hero is, used to scale monsters. =====
// Read straight off the derived Stats (meta.ts heroStats = Lv, stat points, gear, refine, cards, talents, skill web),
// so it never duplicates the stat math. In-run picks and relics are NOT in it: modes snapshot it at run start.
//
//   offense  = expected damage per hero-time vs a reference monster (P.ATK or M.ATK by class, crit, combo,
//              Double Strike, attack speed, hit chance, skill power)
//   survival = effective HP vs a reference monster (max HP through DEF / M.DEF, flee + lucky dodge, guard,
//              sustain from lifesteal / spell vamp / regen / heal amp, counters)
//   power    = K * sqrt(offense * survival)  -> doubles when both sides double, so "monster x(P / P_ref)" on
//              HP and ATK keeps a fight exactly as hard as it was at P_ref.
import { afterDef, BATTLE, COMBO, comboExtra, doubleAtkChance, hitChance, PLAYER, type Stats } from './game-data'
import type { JobId } from './jobs'
import type { Job2Id } from './jobs2'
import { activeJob3, type Job3Id } from './jobs3'
import { blessBase, heroStats, type StatsInput } from './meta'
import { S2N } from './skill-math'
import { skill2ById } from './skill2'

/** The reference monster the score is measured against (a mid-game wave monster). */
export const POWER_REF = { def: 20, flee: 15, hit: 30, magicShare: 0.3, K: 0.55, fightHits: 15 }

/** Class calibration: what the raw formula misses (Priest heals / shields, Mage AoE + never-miss spells, Thief poison,
 * Swordsman's big HP pool counted twice by DEF). Set so the same bot build tier scores the same for every class (v59 bot).
 * v78 mage 1.2 -> 1.1 (chant risk); v85 back to 1.2: fireball is instant again and the ult chant breaks far less (min hit 6% HP, 25% base, Mana refund) - a guess, not bot-measured. */
export const CLASS_K: Partial<Record<JobId, number>> = { swordsman: 0.8, archer: 1, mage: 1.2, cleric: 1.8, thief: 1.15 }

/** Magic share of a class's damage (Priest v58: mace smash + holy light / spears). */
const MAGIC_SHARE: Partial<Record<JobId, number>> = { mage: 1, cleric: 0.35 }

/** 2nd jobs (design/second-jobs-v1.md): what the derived Stats miss — Berserker Frenzy / บ้าระห่ำ double swings,
 *  Knight ถึกเป็นแรง (HP share in skills) + Auto Guard + Pierce. Multiplies the class K. First guess, recheck with the bot (JOB2=). */
export const JOB2_K: Partial<Record<Job2Id, number>> = { berserker: 1.15, knight: 1, rogue: 1.1, mobster: 1.1, crusader: 1.05, monk: 1.1 } // rogue / mobster / monk: first guess, no bot run yet · crusader 1.05 kept after a bot check (2026-11-08, D6 HARD n=6: 6/6 wins, minHp 21%, vs Knight K=1 5/6, 35%; within noise) · bot D6 shop gear: fresh Knight counts +25% power but wins like the base class (HP is overcounted)
Object.assign(JOB2_K, { wizard: 1.1, sage: 1 }) // Phase 5 Mage: first guess, no bot run yet (Wizard: big AoE blasts · Sage: Auto Spell on top of melee)
Object.assign(JOB2_K, { beastmaster: 1.15, innovator: 1.1 }) // Phase 4 Archer: first guess, no bot run yet (allies the Stats miss: pet hits / boar soaking hits · traps, gadgets, turret)
// v82: Archer (archer_c/d) and Beastmaster (bm_k/s) webs got more spendable points (53 / 54 vs pool 48 / 49): archer CLASS_K and beastmaster JOB2_K may need lowering after playtest.
// v84: Swordsman / Cleric (swordsman_c/d, cleric_c/d) and Knight (kn_o/kn_r) got 2 new branches each (79 / 79 / 79 spendable vs pool 48 / 48 / 49): no K change yet, recheck swordsman 0.8 / cleric 1.8 / knight 1 after playtest.
/** 3rd jobs (design/awakening-crusader-v1.md §7): what the Stats miss on top of class K x JOB2_K. 1.0 until P7 calibrates it
 *  (target: Job3 Lv 30 with a full ใยชั้น 3 ≈ +20% Hero Power over the same 2nd job). */
export const JOB3_K: Partial<Record<Job3Id, number>> = { paladin: 1 }
/** 2nd jobs that change the class magic share: Sage hits in melee (P.ATK) + Auto Spell / Endow (Pm 70/30), about half magic. */
const MAGIC_SHARE2: Partial<Record<Job2Id, number>> = { sage: 0.5 }

export interface PowerParts { offense: number; survival: number; power: number }

export function powerParts(st: Stats, job: JobId = 'novice', job2?: Job2Id, job3?: Job3Id): PowerParts {
  const R = POWER_REF, m = (job2 ? MAGIC_SHARE2[job2] : undefined) ?? MAGIC_SHARE[job] ?? 0
  // ---- offense ----
  const phys = afterDef(st.atk * (1 + st.minPct) / 2, R.def) * hitChance(st.hit, R.flee) * (1 + Math.min(1, st.crit) * (st.critMul - 1))
  const magic = st.matk * (1 + Math.min(1, st.spellCrit) * (st.critMul - 1))
  const perHit = phys * (1 - m) + magic * m
  const chain = (1 + comboExtra(st.combo, COMBO.baseCount + st.comboCount) * (1 + st.comboDmg)) * (1 + doubleAtkChance(st.doubleAtk))
  const skill = 1 + 0.5 * (st.pskill * (1 - m) + st.s1Pow + st.ultPow + st.ultAmp) - 0.5 * st.skillDmgCut
  const offense = perHit * chain * (st.aspd / PLAYER.aspd) * Math.max(0.3, skill)
  // ---- survival ----
  const physTaken = (100 / (100 + st.def)) * (1 - st.guard)
  const magicTaken = (1 - st.mdef) * (1 - st.guard)
  const land = hitChance(R.hit, st.flee, 0.8 - st.fleeFloor) * (1 - st.luckyDodge) // same floor as BattleScene.hurtHero
  const taken = physTaken * land * (1 - R.magicShare) + magicTaken * R.magicShare
  // sustain over a ~15-attack fight: lifesteal / vamp, regen (%/turn), dodge heals (Thief gear: every dodge heals)
  const sustain = 1 + st.lifesteal + 0.5 * st.spellVamp + st.regen * BATTLE.regenPerTurn * 0.15 + 0.5 * st.healAmp + 0.5 * st.counter
    + st.dodgeHeal * (1 - land) * (1 - R.magicShare) * R.fightHits + (job === 'cleric' ? 0.3 : 0)
  const c = Math.sqrt((CLASS_K[job] ?? 1) * (job2 ? JOB2_K[job2] ?? 1 : 1) * (job3 ? JOB3_K[job3] ?? 1 : 1))
  const o = offense * c, sv = (st.maxHp / Math.max(0.05, taken)) * sustain * c
  return { offense: o, survival: sv, power: Math.round(R.K * Math.sqrt(o * sv)) }
}

/** The hero's power from a save (or any StatsInput). Pure. */
/** v77 Priest พรแสง is an active buff: count it at its uptime (3 turns per 5-turn cycle = 60%). First guess, no bot run yet; Kyrie barrier not counted. */
export const BLESS_UPTIME = S2N.blessTurns / ((skill2ById('cl_bless')?.cd ?? 4) + 1)
export const heroParts = (s: StatsInput): PowerParts => {
  const job = s.job ?? 'novice', j3 = activeJob3(s), p = powerParts(heroStats(s), job, s.job2, j3), add = blessBase(s)
  if (!add) return p
  const q = powerParts(heroStats({ ...s, tempBase: add }), job, s.job2, j3), u = BLESS_UPTIME
  const o = p.offense * (1 - u) + q.offense * u, sv = p.survival * (1 - u) + q.survival * u
  return { offense: o, survival: sv, power: Math.round(POWER_REF.K * Math.sqrt(o * sv)) }
}
export const heroPower = (s: StatsInput): number => heroParts(s).power

// ---------- what each dungeon expects ----------
/** Offense / survival of the bot build each dungeon is balanced for (tools/bot.cjs, measured v59, class average):
 * d1 Lv5 starter · d3 Lv10 dungeon-2 gear · d4 / d5 = 85% of crafted +5 Lv15 / Lv20 (bots clear ~80%). d2 sits between. */
export const REC: Record<string, { o: number; s: number }> = {
  d1: { o: 24, s: 270 }, d2: { o: 45, s: 350 }, d3: { o: 82, s: 470 }, d4: { o: 160, s: 1170 }, d5: { o: 250, s: 1430 },
}
const recOf = (id: string) => REC[id] ?? REC.d1
export const recPower = (dungeonId: string) => { const r = recOf(dungeonId); return Math.round(POWER_REF.K * Math.sqrt(r.o * r.s)) }

/** Monster multipliers that make a dungeon as hard for this hero as it is for its reference build:
 * HP follows the hero's offense (fights last as long), ATK follows the hero's survival (hits hurt as much).
 * A hero under the reference (geometric mean < 1) is lifted to 1: scaling never makes a dungeon easier. */
export function matchScale(pp: PowerParts, dungeonId: string): { hp: number; atk: number } {
  const r = recOf(dungeonId), a = pp.offense / r.o, b = pp.survival / r.s, g = Math.sqrt(a * b)
  return g >= 1 ? { hp: a, atk: b } : { hp: a / g, atk: b / g }
}

/** 🟢 normal: over-geared heroes earn less (no free farming). */
export const OVERPOWER = { from: 1.5, min: 0.4 }
/** Drop / zeny share in a normal dungeon at this power (1 = full). */
export const overpowerMul = (power: number, dungeonId: string) => {
  const r = power / recPower(dungeonId)
  return r <= OVERPOWER.from ? 1 : Math.max(OVERPOWER.min, OVERPOWER.from / r)
}

/** 🔥 hard: monsters at `target` x the hero (matchScale), plus an anti-evasion eye on every boss / mini boss. */
export const HARD_POWER = { target: 1.1, bossSight: { after: 1, turns: 3 } }

/** 🗼 tower (v59): F1 monsters = start x matchScale, compounding per floor. Above `ref` power the scale is damped
 * (x (P/ref)^(exp-1)) so more gear still climbs higher. Enrage: after N hero turns in one fight every monster hits
 * +enragePer harder per hero turn (stacks). Calibration: Q's Thief Lv44 (Flee 159, crit 56%, combo 50%) should stall ~F40-50. */
export const TOWER_POWER = { start: 0.8, ref: 330, exp: 0.85, hpGrow: 1.04, atkGrow: 1.03, enrageWave: 12, enrageBoss: 20, enragePer: 0.08, bossHp: 0.7 }
export const towerDamp = (power: number) => (power <= TOWER_POWER.ref ? 1 : (power / TOWER_POWER.ref) ** (TOWER_POWER.exp - 1))

/** Colour + label for "แนะนำ N" lines. */
export const powerHint = (power: number, dungeonId: string) => {
  const rec = recPower(dungeonId), r = power / rec
  return { rec, low: r < 0.85, over: r > OVERPOWER.from, color: r < 0.85 ? '#ff7a7a' : r > OVERPOWER.from ? '#9fd0ff' : '#9fe3a0' }
}
