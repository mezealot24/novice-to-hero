// ===== Skill math: the ONE place hero skill numbers live (BattleScene casts with these, CharacterScene shows them). =====
// BattleScene adds run-only effects on top (relics, run picks, berserk, weaken, monster DEF/flee), so the
// numbers shown in the skill detail panel are "before monster DEF, without run picks".
// พร v2 (Q 2026-11-04, design/skills-v2.md): every hero magic HIT uses magic power Pm = 70% M.ATK + 30% P.ATK
// (LoL feel: physical builds still get something from magic procs). Heals and shields stay on M.ATK.
import { BATTLE, PLAYER, type MonsterKind, type Stats } from './game-data'
import { CRIT_RULES } from './battle-rules'
import { CLERIC_KIT, JOBS, MAGE_SPELL, SPELL_VAMP, SWORD_MANA, SWORD_S1, swordCoatPct, swordExecMul, swordS1Lv, swordUltLv, swordS1Raw, swordAwakenUlt, type JobDef, type JobId } from './jobs'
import type { Skill2Def } from './skill2'
import { PACKS } from './dungeons'
import { STAT_RULES } from './meta/stat-spec'
import { MON_CAST } from './mon-cast'

/** Q 2026-11-04 rule: magic damage = 70% M.ATK + 30% P.ATK for ALL hero magic (Mage/Priest class skills too). */
export const MAGIC_MIX = { matk: 0.7, atk: 0.3 }
/** Magic power (Pm): what magic hits, burn stacks, Hellfire and Lightning Wrath scale with. */
export const magicPower = (st: Stats) => st.matk * MAGIC_MIX.matk + st.atk * MAGIC_MIX.atk
/** Multiplier converting `magicPower(st)` units into raw M.ATK units for `BattleScene.strike(..., magic=true)`. */
export const matkToPmRatio = (st: Stats) => st.matk / Math.max(1, magicPower(st))
/** Magic hit base before the skill multiplier: Pm 0.9–1.1x (a crit uses the top). */
export const magicBase = (st: Stats) => { const pm = magicPower(st); return { lo: pm * 0.9, hi: pm * 1.1 } }
/** Physical hit base: P.ATK minPct–1x (DEX raises the floor; a crit uses the top, DEF still applies). */
export const physBase = (st: Stats) => ({ lo: st.atk * st.minPct, hi: st.atk })
export const hitBase = (st: Stats, magic: boolean) => (magic ? magicBase(st) : physBase(st))

/** v78 Mage cast time (Q 2026-11-06, design/mage-cast-focus-v78.md), softened in v85 (playtest: "punishes too much").
 *  Only the base Mage element ult chants (1 turn); ลูกไฟระเบิด is instant again (fireMul x Pm, can't break). Wizard keeps ร่ายใหญ่ (never breaks).
 *  A hit that reaches HP while chanting may break it: it must deal >= breakMinHp of max HP, then breakChance rolls (DoT never breaks).
 *  Broken: refund breakRefund of the Mana paid, ult waits brokenUltCd turns (not the full cd), and the NEXT chant can't break (steady).
 *  The release IS the next turn's action (Wizard's stays free). ultMul x the chanted ult. Numbers are guesses (v85). */
// Q 2026-11-19: breakDex 0.012 -> 0.005 (DEX 21 -> DEX 50 to never break, before tenacity)
export const MAGE_CAST = { breakBase: 0.25, breakDex: 0.005, breakMinHp: 0.06, breakRefund: 0.6, fireMul: 0.45, ultMul: 1.3, brokenUltCd: 2, boltMana: 6 } // fireMul: 1 -> 0.45 in the 2026-11-13 auto rework (cost 36 -> 5, cast nearly every turn)
/** 2026-11-13 Mage auto rework (Q): ลูกไฟระเบิด scales 90% M.ATK : 10% P.ATK (the shared hit mix stays 70 : 30 for every other magic hit). */
export const MAGE_AUTO_MIX = { matk: 0.9, atk: 0.1 }
/** 2026-11-13 Mage core passives (the "แก่นเวท" column, always on, no pick): 🕯️ มนต์ถดถอย (debuff) · 🔮 ออร่าเวท (buff). Numbers are first guesses.
 *  Node levels are per OLD level (max 3); data/tree.ts stretches them to 5 and calls the formula with lv x 3/5, so Lv 5 = `x3` below. */
export const MAGE_PASSIVE = {
  hex: { weakPer: 0.12, cap: 0.45, turns: 3 }, // ลูกไฟระเบิด hit -> the monster's own hits lose weakPer x lv (cap) for `turns` of its turns (the stronger / longer one wins, never stacks)
  aura: { ampPer: 0.15, turns: 5 }, // first `turns` hero turns of every wave: ลูกไฟระเบิด + ult damage +ampPer x lv (not shields)
  ablaze: { stacksNeeded: 3, consumeStacks: 3, spreadStacks: 1, hpPct: 0.08, matkMul: 1.2, bossCapMul: 6, manaGain: 12 }, // Brand-style 3-stack detonation + Mana on blast/burn-kill
}
/** ☄️ Brand-style Ablaze detonation damage: 8% target Max HP + 1.2x M.ATK (capped at 6x M.ATK vs bosses). */
export const ablazeBlastDmg = (targetMaxHp: number, matk: number, isBoss: boolean) => {
  const raw = targetMaxHp * MAGE_PASSIVE.ablaze.hpPct + matk * MAGE_PASSIVE.ablaze.matkMul
  return Math.max(1, Math.round(isBoss ? Math.min(raw, matk * MAGE_PASSIVE.ablaze.bossCapMul) : raw))
}
/** 🕯️ share of damage a hexed monster loses. */
export const hexWeak = (lv: number) => Math.min(MAGE_PASSIVE.hex.cap, MAGE_PASSIVE.hex.weakPer * Math.max(0, lv))
/** 🔮 damage bonus while the aura lasts. */
export const auraAmp = (lv: number) => MAGE_PASSIVE.aura.ampPer * Math.max(0, lv)
/** Multiplier that turns "x Pm" (70 : 30) into "x the 90 : 10 mix" for ลูกไฟระเบิด: strike() always multiplies Pm, so we scale the skill mul by this. */
export const mageAutoRatio = (st: Stats) => (st.matk * MAGE_AUTO_MIX.matk + st.atk * MAGE_AUTO_MIX.atk) / Math.max(1, magicPower(st))
/** ลูกไฟระเบิด multiplier in Pm units (base `mul` x the 90 : 10 mix). */
export const mageAutoMul = (st: Stats, mul: number) => mul * mageAutoRatio(st)
/** RO Falconer Blitz Beat damage mix (v2.1): 85% M.ATK + 15% P.ATK (scales primarily with INT/M.ATK, ~5.67:1 INT:DEX ratio). */
export const FALCON_MIX = { matk: 0.85, atk: 0.15 } as const
/** Effective Falcon Power per Blitz Beat hit before multiplier: 85% M.ATK + 15% P.ATK + Steel Crow (INT) + Hawk Stance DEX resonance. */
export const falconPower = (st: Stats, int: number, dex: number) =>
  st.matk * FALCON_MIX.matk +
  st.atk * FALCON_MIX.atk +
  st.j2HawkIntAdd * Math.max(0, int) +
  Math.floor(st.j2HawkDexToMatk * Math.max(0, dex))
/** Multiplier converting `magicPower(st)` units into Falcon Power units for `BattleScene.strike()`. */
export const falconRatio = (st: Stats, int: number, dex: number) => falconPower(st, int, dex) / Math.max(1, magicPower(st))
/** Blitz Beat multiplier in `magicPower(st)` units (base `mul` x Falcon Power / Pm). */
export const falconMul = (st: Stats, mul: number, int: number, dex: number) => mul * falconRatio(st, int, dex)
/** v78: does a released chant use up the hero's turn? Base Mage / Sage yes, Wizard no (its edge). */
export const castUsesTurn = (job2?: string) => job2 !== 'wizard'
/** Chance one hit breaks the chant: 25% − 0.5%/DEX − tenacity, never below 0 (🧘 Poise = 0). */
export const breakChance = (dex: number, tenacity: number, poise = false) =>
  poise ? 0 : Math.max(0, MAGE_CAST.breakBase - MAGE_CAST.breakDex * dex - tenacity)
/** v85: only a hit of >= breakMinHp of max HP (after shields) may roll for a break at all. */
export const breaksOn = (dmg: number, maxHp: number) => maxHp > 0 && dmg >= maxHp * MAGE_CAST.breakMinHp
/** v85: Mana given back when a chant breaks (breakRefund of what was paid). */
export const breakRefundMana = (paid: number) => Math.floor(Math.max(0, paid) * MAGE_CAST.breakRefund)

/** Class kit multipliers that used to sit inline in BattleScene (SWORD_MANA / MAGE_SPELL / CLERIC_KIT live in jobs.ts). */
export const KIT = {
  cast: MAGE_CAST, // v78: tunable as kit `cast.*`
  monCast: MON_CAST, // Q 2026-11-20: boss / mini-boss cast break (data/mon-cast.ts), tunable as kit `monCast.*`
  cleric: CLERIC_KIT, // v86: reference (defined in jobs.ts to avoid a jobs <-> skill-math import cycle), tunable as kit `cleric.*`
  archerAuto: 0.9, archerAutoShots: 2, archerVolleyShots: 3, archerUlt: 5,
  mageFire: 2, mageFireStacks: 3, mageIce: 1.6, mageIceChill: 3, mageLightHits: 6, mageLightLo: 0.3, mageLightHi: 1.2,
  clericHealBelow: 0.75, clericSmiteTargets: 2, clericJudge: 2.2, clericJudgeEvery: 3,
  // v58 Priest Ult web (Q 2026-11-04), linear per level: พรคุ้มครอง (v92 Q 2026-11-07) = ult smash 150% + 50%/Lv P.ATK, Lv5 = 400% · พรอุ่นไอ Lv5 = counter +12.5%, Holy Light 3 -> 8 · เกราะแสง Lv3 = 6% shield per spear volley
  clericUltAtkLv: 0.15, // v108 (Q: Ult back to v58): root พรคุ้มครอง smash +0.15x P.ATK per Lv = 150% x (1 + 10%/Lv) · v104 0.2 per 🌄 Lv · v92 0.5 per root Lv
  clericWarmCounterLv: 0.025, clericWarmLightLv: 1, clericSpearShieldLv: 0.02,
  spearBase: 0.3, spearMax: 8, spearSplash: 0.5, // v120 Q 2026-11-11: หอกแสง = random target (Priest lights: their own target) + the monster on each side x spearSplash
  thiefAuto: 1, thiefAutoPoison: 3, // Q 2026-11-19: แทงพิษ now x (1 + pskill) like other STR skills; 1.6 -> 1 keeps Q's Lv 80 (STR 121, pskill +60.5%) the same
  thiefUlt: 0.7, thiefUltHits: 4, thiefUltDodge: 2,
  // Q 2026-11-19 Ratio AGI: เงาพริ้ว +thiefUltAgiK x (AGI above start / stat points the Base Lv gives), share capped at thiefUltAgiShareCap.
  // Was +thiefUltAgi 2% per AGI point (uncapped): Lv 80 all-AGI = x5.74 per stab, early game weak (P.ATK x AGI grew with level squared). Now all-in = x3 at every Lv.
  thiefUltAgiK: 2, thiefUltAgiShareCap: 1.2,
  // Q 2026-11-19 playtest: Lv 4 with race + gear AGI already hit the share cap (+227%). The pool never counts as fewer than this many points (= Lv 20), so early free AGI is a small share.
  thiefUltAgiPoolMin: 60,
  // P2'a (design/p2/MAIN-VS-REV4.md §4, R4.7.2 minus the keys §2 drops): แทงพิษ floor · D.Strike Energy / leech · thief_core (c1 / c3 / c4) · th_t2b
  thiefAutoMinCost: 30, thiefStrikeRes: 4, thiefStrikeLs: 0.33,
  thiefKindsAt: 2, thiefCondLeechMulti: 1.5,
  thiefKillRes: 10, thiefKillPoisonHeal: 0.005, thiefKillPoisonHealCap: 0.12, thiefBossCritLeech: 0.375, thiefBossCritRes: 8,
  thiefBloodKingBelow: 0.45, thiefBloodKingMul: 1.75, thiefBloodKingStrikeLs: 0.66,
  thiefStackCritTalMax: 14,
  // P2'b (MAIN-VS-REV4 §4 + §5.1 #3, R4.6 B1): one additive "damage taken" bracket under thiefTakenCap · stack thresholds are a share of the
  // hero's poison cap (poisonMax()), not flat stacks (cap 20 + พิษสะสม made the old 8 / 10 always on) · th_t1c counts up to thiefStackHpMax stacks
  thiefTakenCap: 0.6, thiefPrivShare: 0.6, thiefPoisonAmpShare: 0.5, thiefStackHpMax: 20,
  // P2'c Ult x เกจเงา (MAIN-VS-REV4 §4 + §5.2, Q2: ceiling = live เงาพริ้ว incl. ร่างเงา sure crits): thief_u / th_t3* numbers, cut so
  // thiefUltBudget() stays <= the live best build (th_t3b R2 = 7 stabs) with the gauge off AND on (tests/thief-p2c.test.ts)
  thiefUltCondCap: 0.15, // Ult-own conditional crit dmg (thief_u1 kinds + thief_u3 / th_t3a low HP), summed, before the B3 cap
  thiefUltKindsMax: 3, // thief_u1: debuff kinds that count
  thiefExecBelow: 0.35, thiefUltExecBelow: 0.5, // thief_u3 / th_t3a: target HP share under which they add crit dmg
  thiefOnHitBase: 0.38, thiefOnHitCap: 0.55, // On-Hit share (thief_u2 / th_t3b): base + node + talent, capped
  thiefFinisherAt: 3, thiefFinisherMul: 0.2, // thief_u4 ★: crits in one cast for the closing stab · its power x one stab (sure crit)
  thiefUltCritResCap: 12, // thief_u3: Energy from Ult crits, at most this per cast
  // Global Ult CD cap (Rev 3 §5.1): every Thief-line Ult CD cut (th_t2a, thief_b3, Rogue Kill Reset) shares thiefUltCdCutCap turns per hero
  // turn, and in the turn the Ult was cast the CD never drops below thiefUltCdFloor (2 = at least one hero turn between two casts)
  thiefUltCdCutCap: 2, thiefUltCdFloor: 2,
  // R4.6 B3: conditional crit dmg (Shroud ★, Rogue rg_x2 ใจสลาย, Ult-own, thief_u3 on basic / combo, th_t1b R2) ADDS into critMul, one cap
  thiefCondCritDmgCap: 0.75,
  thiefShadowShieldHpCap: 0.2, // thief_b2: the ร่างเงา shield is at most this share of max HP
  thiefDodgeFleeTurns: 2, // th_t1a: hero turns the Flee after a dodge lasts (refreshed, never stacks)
  thiefOpenCritDmg: 0.25, // th_t1b R2: crit dmg + on the wave's sure-crit opener (B3)
  // P2'd off-meta (สาย INT / WIS Shadow Ward / LUK Gambler's Edge)
  thiefVenomBasicShare: 0.58, // thief_v1 แทงฉาบอาคม: share of the S1 M.ATK hit that basic attacks also deal
  thiefDetAtShare: 0.5, thiefDetShare: 0.4, thiefDetMin: 3, // thief_v2 ระเบิดสารพิษ: threshold share of poisonMax(), consume 40% (min 3 stacks)
  thiefDetPoisonBase: 1.5, thiefDetPoisonLv: 0.5, thiefDetSplash: 0.5, thiefDetLeechShare: 0.5, // Contaminate damage per consumed stack, AoE share, leech share without ★
  thiefLeechLv: 0.08, thiefLeechInt: 0.015, thiefLeechCap: 0.6, thiefLeechTurnCap: 0.25, // thief_v3 เลือดพิษ: base/lv, INT scale, total rate cap, max HP heal cap/turn
  thiefDetBossRefund: 0.25, // thief_v4 ★: stacks refunded vs boss / mini-boss after Contaminate
  thiefAgonyFrom: 1.4, thiefAgonyCap: 1, thiefAgonyHitCut: 0.15, // th_t4b วิถีพิษคริ (B5): critMul floor, cap (shared with vsPoison), non-crit physical cut
  thiefWardPer: 0.003, thiefWardCap: 0.15, // WIS Shadow Ward: DR per WIS above start (cap 15%) vs magic / monHit >= 999 / trueSight
  thiefLuckyRes: 6, // LUK Gambler's Edge: Energy on LUCKY! dodge (1/hero turn)
  // PoE Passive Tree Phase 1 (Thief-Line Constellation, data/passives/thief.ts)
  thiefDeathMarkTurns: 2, // Death Mark Keystone: hero turns the mark records non-DoT hero net HP damage
  thiefDeathMarkAt: 0.15, // Death Mark Keystone: early detonation HP threshold (15% max HP)
  thiefDeathMarkEcho: 0.35, // Death Mark Keystone: share of recorded net HP dmg echoed as pure B6 burst
  thiefMistDr: 0.25, // Mistwalker Keystone: DR vs magic / monHit >= 999 / trueSight
  thiefMistDefCut: 0.3, // Mistwalker Keystone downside: -30% P.DEF & -30% shields gained
  thiefFlurryDmgCut: 0.1, // Blade Flurry Keystone downside: -10% Ult per-hit multiplier
  thiefMobFlurryMul: 0.5, // Blade Flurry Keystone Mobster bonus: extra ทวงหนี้ slash multiplier
  thiefOverhealCap: 0.2, // Eldritch Venom Keystone: Toxic Overheal shield cap (% max HP)
  thiefEldritchMatkShare: 0.5, // Eldritch Venom Keystone: extra M.ATK -> flat poison scaling share (x KIT.poison.matkPer)
  thiefPhysLeechCut: 0.5, // Eldritch Venom Keystone downside: -50% normal physical lifesteal
  thiefLuckyPoison: 2, // Lucky Reprisal Notable: poison stacks Mobster applies on LUCKY! dodge
  // PoE Passive Tree Phase 2 (Swordsman-Line Constellation, data/passives/swordsman.ts)
  swordS1CdCut: 1, // Judgment Keystone: ดาบสยบมนตร์ cooldown cut (turns)
  swordS3BreakTurns: 2, // Armor Breaker Notable: Armor Break turns applied by Skill 1 & Skill 3
  swordIronDr: 0.15, // Iron Fortress Keystone: multiplicative incoming damage reduction
  swordIronAspdCut: 0.15, // Iron Fortress Keystone downside: ASPD multiplier cut
  swordCounterDefMul: 1.2, // Thorned Aegis Keystone: flat counter bonus damage = P.DEF x this
  swordCleaveTaken: 0.1, // Cleavestorm Keystone downside: incoming damage taken +this
  swordExecBonus: 0.5, // Judgment Keystone: execute maxAdd bonus across Swordsman-line ults
  swordBloodFuryAt: 0.6, // Blood Fury Pact Keystone: HP threshold (< 60% max HP)
  swordBloodFuryDmg: 0.3, // Blood Fury Pact Keystone: physical hit damage bonus below threshold
  swordBloodFurySelf: 0.04, // Blood Fury Pact Keystone downside: current HP paid on S1 / S3 / Ult cast
  swordVampDmgCut: 0.2, // Immortal Sanguine Keystone downside: skill / ult damage cut
  // ☠️ Thief-line poison (Q 2026-11-17 rebalance): admin table `kit` · poison.*. Per stack per monster turn = Stats.poisonDmg (flat)
  // + atkPer x P.ATK + matkPer x M.ATK (Thief / Rogue / Mobster only), so poison keeps up with monster HP late. atkPer 0 = the old flat poison.
  // 💰 Thief ทักษะ 2 ล้วงกระเป๋า (Q 2026-11-18, GW2 Steal): what you steal depends on the front monster's top stat. admin `kit` · thiefSteal.*
  thiefSteal: {
    turns: 3, // hero turns the stolen buff lasts (ATK / crit)
    atk: 0.2, // STR monster (bruiser): P.ATK +20%
    res: 20, // AGI monster (skirmisher): Energy back at once
    poison: 4, // INT monster (caster): steals a vial -> poison stacks on it
    brkTurns: 2, // VIT monster (tank): armor break turns (DEF −KIT2.mobster.armorBrk)
    heal: 0.08, // WIS monster (support): heal share of max HP
    crit: 0.15, // LUK / DEX monster: crit +15%
  },
  // 👤 Thief เกจเงา (Q 2026-11-18, Lost Ark Persona / D4 Inner Sight): dodge / DOUBLE / ult fill it, full = ร่างเงา: physical hits sure crit + Skill 1 free
  thiefShadow: {
    max: 5, // gauge to fill
    turns: 2, // hero turns of ร่างเงา
    dodge: 1, double: 1, ult: 2, // gauge per dodge / DOUBLE proc / เงาพริ้ว cast
  },
  // 🔻 Thief หมายหัว (node thief_c2, GW2 Deadeye's Mark + Malice): the highest-HP monster is marked, Thief-line hits on it build Malice,
  // full Malice = next hit on it is a sure crit x(1 + dmg x node Lv), then Malice resets. A dead mark jumps to the next highest-HP monster.
  thiefMark: { max: 5, dmg: 0.3 },
  poison: {
    atkPer: 0.04, // + P.ATK share per stack (Lv100 P.ATK ~400 -> +16/stack)
    matkPer: 0.04, // + M.ATK share per stack (Q 2026-11-17: INT / M.ATK from gear, cards, buffs also feed poison)
    intPer: 0.1, // Thief flat poison +this per INT point over the start (was hardcoded)
    baseCap: 20, // max stacks before poisonCap nodes / gear (Q 2026-11-18: 12 -> 20, every poison source)
    defPer: 0.01, defCap: 0.4, // 🦴 Q 2026-11-17: each poison stack on a monster = its DEF −defPer vs Thief-line hits, at most defCap
    slowAt: 10, slowStep: 2, slowTurns: 2, // 🐌 พิษชา (node thief_a2): a monster with >= slowAt − slowStep x (Lv − 1) stacks is chilled slowTurns on each poison tick
    overflowMul: 2, // 💥 พิษล้น (node mb_p4): stacks pushed over the cap burst at once, x per-stack x this
    // 🩸 Q 2026-11-18 %HP bite (every hero poison): while the monster is above hpAbove of its max HP, each stack also takes
    // (hpPct + hpPctInt per 10 INT) x its max HP + hpFlat per tick
    hpAbove: 0.5, hpPct: 0.005, hpPctInt: 0.001, hpFlat: 2,
    // 💣 ระเบิดพิษ (★ thief_a4, Q 2026-11-18 buff): a dying monster passes spreadShare of its stacks to every other monster
    // and blasts each of them for its stacks x per-stack x spreadBurst at once (kills can chain)
    spreadShare: 1, spreadBurst: 1.5,
    burstKeep: 0.5, // 💀 Mobster ทวงหนี้: share of stacks left after the burst (0 = cleared, the old rule)
  },
  // v82 Archer web: 🧪 ศรพิษ (under ทักษะ 1) + 🏷️ ล่าหัว (under Ult), first guesses (design/skill-tree-archer.md v82)
  archerTree: {
    poisonArrow: [0.2, 0.35, 0.5], poisonArrowStacks: 1, vsPoison: 0.06, ricochet: [0.5, 0.7, 0.9], // ศรอาบพิษ chance per arrow · ซ้ำแผล per lv · ศรเด้ง shot mul
    markTurns: 3, markAmp: 0.05, markJumpRes: 8, killCd: [0.5, 0.75, 1], killCdCut: 1, killCdRes: 12, // หมายหัว per lv · ไล่ล่า Energy per lv · ล่าต่อ chance + Energy on kill
    execBelow: 0.25, execBig: 0.6, // ★ ศรประหาร: normal monster under 25% HP dies · boss / mini +60%
  },
  // ⚔️ ดาบสยบมนตร์ web (Q 2026-11-21, swordsman_b left = Defensive, swordsman_c right = Utility + Dmg), per OLD level (max 3, stretched to 5)
  swordS1Tree: {
    shield: 0.04, tenacity: 0.05, guardTurns: 1, muteWeak: 0.06, counters: 2, // 🛡️ ตั้งรับ shield/lv · ใจไม่หวั่น tenacity/lv + CC guard turns · ปิดปาก silenced monster dmg cut/lv · ★ สวนเงียบ sure counters
    vsMute: 0.1, refund: 4, splash: 0.2, starHit: 0.6, // 🎯 เจาะจังหวะ dmg/lv vs casting / silenced · ⏳ ตัดจังหวะ Mana/lv on a cut cast (+ CD -1) · 🌀 ฟันเฉือน share/lv · ★ 2nd cut share
  },
  // 🗡️ ดาบพิพากษา web (Q 2026-11-21, ult side: swordsman_a left = Defensive while awakened, swordsman_d right = Utility + Dmg), per OLD level (max 3, stretched to 5)
  swordUltTree: {
    dr: 0.05, leech: 0.03, ctr: 0.06, waveShield: 0.3, waveShieldCap: 0.25, // 🛡️ ใจดาบ dmg taken cut/lv while awakened · 🩸 ดาบกระหายเลือด basic/cleave leech/lv · 🔁 ตื่นสวน counter/lv · ★ ปราการคลื่น wave dmg share as shield (cap of max HP)
    execAdd: 0.2, cleave: 0.15, reChance: 1 / 3, awAtk: 0.5, // Q 2026-11-22: d2 = 🌊 คลื่นซ้ำ chance/old lv (full 100%) · d4 ★ = P.ATK +awAtk while awakened (waveAmp removed 2026-11-24: unused) // ⚖️ คมพิพากษา execute max +/lv · 🌊 คลื่นคม wave dmg/lv · ⚔️ ฟันกวาดตื่น cleave share/lv · ★ คลื่นซ้ำ reload once on a wave kill
  },
  // Swordsman core column (swordsman_core, tier 0, always open): Defend VIT/DEF/M.DEF/Regen passives
  swordCore: {
    vitPer: 4, defPer: 3, hpPctPer: 0.02, // 🛡️ กายเหล็ก
    mdefPer: 0.03, vitToMdefPer: 0.0008, vitToMdefCap: 0.25, tenacityPer: 0.03, // 💠 เกราะจิตอึด
    regenPer: 0.2, healAmpPer: 0.05, lowHpAt: 0.5, lowHpRegenPer: 0.5 / 3, // ❤️‍🩹 ฟื้นฟูนักรบ
  },
  // 💪 Mage กายสู่เวท (mage_core3, node gives % per step via Stats.strToInt): admin table `kit` · mageCore.*
  mageCore: {
    regenStep: 20, // STR per step for the Mana regen part
    regenMissing: 1, // 1 = % of MISSING Mana per turn (Q 2026-11-17 nerf) · 0 = % of Max Mana per turn (old)
    matkStep: 10, matkPer: 300, // STR per step for the M.ATK part · M.ATK = node share x this per step (Lv 3 = +15)
  },
  // v84 Priest web: 🙏 ศรัทธา (under ทักษะ 1) + ⛪ ฟื้นคืน (under Ult), first guesses (design/skill-tree-priest.md v84)
  clericTree: {
    faithMax: 5, faithHeal: 2, faithCast: 1, faith: 0.4, faithHealAmp: 0.06, // v120 Q: each held Faith = heal +6% // สวดภาวนา: Skill 1 cast +1 / skill heal +2 Faith · full = burst every monster x Pm per lv
    faithOver: 0.2, overMin: 0.03, faithHealPer: 0.01, // ล้นศรัทธา: overheal >= 3% max HP: chance/lv of +1 Faith · พรเกื้อ: burst heals max HP share per stack per lv
    overBurst: 1.5, overCap: 0.25, // ★ แสงล้นฟ้า: overheal x this as holy damage to the front monster (overheal counted up to 25% max HP per heal)
    wardTurns: 2, ward: 0.06, emergencyAt: 0.3, emergency: 0.08, mend: 0.1, // ม่านพร: after ult −dmg taken/lv N hero turns · ฉุกเฉิน: under 30% HP heal max HP share/lv (1/wave) · ชุบชีวา: ult heals missing HP share/lv
    // v86 web 🌄 รุ่งอรุณ (Q 2026-11-06, replaces ⛪ ฟื้นคืน; its numbers above stay for the old code paths). Per OLD level (max 3):
    // v93 (Q 2026-11-07): share 1/3 -> 2/3 per old lv (Lv5 = 200% of the base, was 100%): +16 per point instead of +8, Lv5 about +35% of the Ult smash.
    // v92 (Q 2026-11-07) แสงรุ่งอรุณ: the Ult smash adds bonus MAGIC damage (STR + WIS + matk x M.ATK) to each monster it hits, x share/lv
    // (full at old lv 3 = Lv5) · อรุณสมานแผล: heal/lv of the bonus dealt to the front monster (normal monsters x weak)
    // · v102 แสงแตก (max 3, not stretched): the bonus hitting gives WIS = wis[lv-1] x the bonus/target for wisTurns[lv-1] hero turns · ★ อรุณพิทักษ์: the bonus is a sure crit, crit dmg +crit. (v86 every-3-basics smash removed.)
    // v86 core column 💠 แก่นศรัทธา (Q 2026-11-06, Mana for the Priest). Per OLD level (max 3, stretched to 5) unless noted:
    // จิตสงบ: STR + WIS +base/lv · Mana regen +regen/lv (resRegen units, x3 per turn) per 10 points of the lower of STR / WIS
    // ศรัทธาสู่กาย (max 3, not stretched): every intPer[lv-1] INT = +1 STR, v102 also every intPer[lv-1] WIS = +1 VIT · มานาพิทักษ์: damage taken (shield absorb too)
    // -> guard/lv of it as Mana (x (1 + WIS x wisAmp)) · Mana spent -> heal of it as HP · wave start shield = shield/lv x Max Mana
    core: { base: 5, regen: 1 / 6, intPer: [7, 6, 5], guard: 0.05, wisAmp: 0.005, heal: 0.2, shield: 0.25 / 3 },
    dawn: { every: 3, matk: 0.1, share: 2 / 3, heal: 0.1, wis: [0.25, 0.3, 0.35], wisTurns: [3, 4, 5], crit: 0.5, weak: 0.6 }, // v108: passive, every Nth basic / combo hit (Dawnbreaker Luminosity)
    reviveHp: 0.5, reviveShield: 0.2, // ★ คืนชีพ: 1/run lethal hit -> back at 50% HP + 20% shield, debuffs cleared
  },
}

/** ☠️ Thief-line poison damage per stack per monster turn: flat Stats.poisonDmg + atkPer x P.ATK + matkPer x M.ATK. */
export const thiefPoisonPerStack = (st: Pick<Stats, 'poisonDmg' | 'atk' | 'matk'>) =>
  st.poisonDmg + KIT.poison.atkPer * Math.max(0, st.atk) + KIT.poison.matkPer * Math.max(0, st.matk)
/** 🦴 Thief-line poison DEF shred: share of the monster's DEF removed by its poison stacks (KIT.poison.defPer per stack, capped at defCap). */
export const poisonDefCut = (stacks: number) => Math.min(KIT.poison.defCap, KIT.poison.defPer * Math.max(0, stacks))
/** 🐌 พิษชา: stacks a monster needs to be chilled by poison at node Lv (KIT.poison.slowAt − slowStep x (Lv − 1), never below 1). */
export const slowAtLv = (lv: number) => Math.max(1, Math.round(KIT.poison.slowAt - KIT.poison.slowStep * (Math.max(1, lv) - 1)))
/** Max poison stacks on a monster (KIT.poison.baseCap + Stats.poisonCap). */
export const poisonCapOf = (st: Pick<Stats, 'poisonCap'>) => KIT.poison.baseCap + st.poisonCap

/** 2nd jobs (design/second-jobs-v1.md, data/jobs2.ts): signature / ทักษะ 3 / Ult วิวัฒน์ numbers. BattleScene + jobs2 texts read these. */
export const KIT2 = {
  berserker: {
    frenzyMax: 5, frenzyAspd: 0.06, frenzyCritDmg: 0.08, frenzyKeep: 2, // คลั่งเลือด: per stack, lost after this many hero turns without a crit
    waveCost: 30, waveCd: 3, waveFront: 1.8, waveBack: 1.2, waveCrit: 0.2, waveOffWeapon: 0.7, // 🌊 คลื่นดาบ (x0.7 without a 2-hand weapon)
    ultMul: 1.2, ultTurns: 3, ultCrit: 0.3, ultTaken: 0.2, // 👹 บ้าระห่ำ: swing all, then N turns of double swings + crit, taking more damage
    mastery: { atkPct: 0.08, crit: 0.03 }, // 2-hand weapon
    stormCost: 35, // ฟันพายุ in Rage (Rage refills fast: at 20 it fired every turn, bot D6 fresh Berserker 0/8 -> 6/8)
    ignorePainTurns: 3, ignorePainRegenTurns: 2, ignorePainRegenPct: 0.3, // ★ ไม่รู้สึกเจ็บ: 3 turns immortal at 1 HP, then 2 turns regen 30% of dmg dealt
  },
  knight: {
    hpPct: 0.1, aspdPct: 0.05, hpDmg: 0.03, // 🐦 ขี่เปโก + ถึกเป็นแรง (spear skills add max HP share)
    brandCost: 20, brandCd: 3, brandMul: 1.5, brandTargets: 3, brandPush: 15, // 🌀 Brandish Spear
    pierceHits: 3, pierceBigHits: 4, pierceMul: 1.2, waveMul: 2, ultMana: 50, // ultMana: Pierce of Judgement Mana (Q 2026-11-23, job1 ult is SWORD_MANA.ult) · 🔱 Pierce of Judgement (Q 2026-11-23): 🎯 Pierce on cast = this many hits on ONE target (boss > mini > front; boss / mini one more), x P.ATK per hit (+ max HP share), then ⚔️ ปลุกหอก; the 🔱 คลื่นทะลวง later = ONE thrust waveMul x wave power. Crit only with skillCrit. Bowling Bash is gone (bashMul removed)
    boomerang: 0.8, chargeFirst: 3, chargeFirstGauge: 35, chargeFirstRes: 15, guardShieldless: 0.5, // Spear Boomerang mul · ★ ทะยาน · Auto Guard without an off-hand
    mastery: { atkPct: 0.05, hit: 10 }, // spear
    // v84 ใยชั้น 2: 🚩 ธงศึก + 🌀 กวาดทวน (reworked Peco & Banner). Per-lv = per OLD level (max 3).
    tree: {
      banner: 0.08, provokeAt: 0.5, provoke: 0.1, bannerKill: 0.08, bannerKillRes: 10, bannerKillGauge: 20, // ปักธง wave-start shield/lv (stacks) · ข่มขวัญ: monster hits −5%/lv (x2 under 50% HP) · ธงชัย: kill shield/lv + gauge + res (half on block)
      auraHeal: 0.05, auraRes: 10, auraGuard: 0.08, // ★ ธงอมตะ: every block heals + Mana/Rage · + Auto Guard chance
      sweepEvery: 3, sweep: 0.3, sweepPush: 5, sweepGauge: 15, sweepHitGauge: 3, // ทวนวน: every Nth hero turn sweep all x P.ATK/lv (+ max HP share) · เหวี่ยง gauge −/lv · ทวนเร็ว hero gauge +/lv per sweep kill (+ hit)
      sweepBreak: 2, sweepStun: 0.25, // ★ พายุทวน: sweep breaks armor N turns + stun chance (boss / mini: gauge push)
    },
    // Q 2026-11-24 Skill 4 🌀 Spiral Pierce (Rell Q + Serpent's Fang): one target (boss > mini > front), unlocks at Job2 Lv unlockLv, takes the hero turn.
    // Shatters the target's monster shield first (boss phase shield: bossShield share) -> the thrust hits +shatterAmp · normal / mini lose a turn, a boss loses its cast + bossGauge.
    // 🐍 Fang: once unlocked, every hero hit drains monster shields x(1 + fang). Lord Knight: lkHits thrusts of lkMul, the last ignores lkPierce of DEF.
    // ⛓️ Break (Q 2026-11-24, Dota 2 Silver Edge style): the target's passives are off for breakTurns hero turns (data/skill4.ts BREAK_OFF).
    s4: { cost: 20, cd: 4, unlockLv: 20, mul: 2, shatterAmp: 0.3, bossShield: 0.5, bossGauge: 30, fang: 0.5, lkHits: 3, lkMul: 0.8, lkPierce: 0.5, breakTurns: 2 },
  },
  rogue: {
    knifeMul: 0.4, knifePerCombo: 1, dualKnife: 1, // 🔪 มีดบิน: each extra combo hit throws knives at random monsters (+1 with a dagger off-hand) · no lifesteal
    stabCost: 30, stabCd: 3, stabMul: 2.2, // 🗡️ Back Stab: sure crit on the most-marked monster (ties: highest HP), P3'a
    stabCpMax: 5, stabCpPer: 0.2, // 🔁 Combo Point (Q 2026-11-18, WoW / D4 builder-finisher): each combo hit +1 point (max cpMax), Back Stab spends all for +cpPer x points
    ultKnives: 8, ultKnifeMul: 0.5, // 🌪️ พายุมีด: shadow dance + knives spread over every monster
    ultKnifeJ2Share: 0.75, // 🌪️ พายุมีด knives get this share of j2KnifeMul (มีดคม / ใบมีดลับคม) · Q 2026-11-19 fix: before, the storm ignored it
    mastery: { atkPct: 0.05, skillCrit: 0.05 }, // dagger · P3'a: skillCrit (physical skills crit only with it since the crit rework), was crit 0.03
    // ----- P3'a (design/thief-rogue-rework-v1.md §3.2 + R4.7.4): 🔪 Dagger Mark + Voracity -----
    knifePskillShare: 0.5, // มีดบิน (combo / crit / free knives, not the storm) x (1 + pskill x this)
    markMax: 3, markTurns: 2, markFocus: 0.3, // ตราคมมีด: a landed knife = +1 Mark (max, lasts N monster turns, refreshed) · chance a knife picks a monster under the cap
    markSteelMul: 0.35, markSteelSplash: 0.6, markRes: 6, markCp: 1, // เก็บมีด (basic / combo / แทงพิษ / Back Stab on a marked monster): swing x P.ATK per Mark (others take the splash share) · Energy per Mark · Combo Point per pickup
    markKillKnives: 2, // Kill Reset (1 per hero turn): kill with a knife / kill a marked monster -> Back Stab + Ult CD -1 and free knives at the lowest HP monster
    stabPickupAt: 2, stabPickupCdCut: 1, // a pickup of this many Marks cuts Back Stab CD (1 per hero turn)
    stabMarkAmp: 0.15, stabMarkTurns: 2, // 🗡️ Backstab Mark: + damage taken from hits (B1 Taken, R4.6), monster turns
    stabStrip: 0.2, stabStripTurns: 2, // 🗡️ Strip Armor: P.DEF -share, monster turns
    stabAmbushMul: 0.25, stabAmbushRes: 15, stabAmpCap: 0.75, // 🗡️ Shadow Ambush (in Shroud or dodged since the last hero turn): + Back Stab dmg, Energy · B4 cap of every conditional Back Stab amp (Combo Point is outside it)
    knifeBounce: 0.65, knifeBounceAt: 2, // rg_k2 มีดชิ่ง: base share of the bounce · Marks the target needs (or the knife kills it)
    comboTempoMax: 5, comboDebuffMax: 4, comboDodgeEvery: 3, comboDodgeIcdTurns: 2, // rg_c1 Tempo stacks per wave · rg_c2 debuff kinds counted · rg_c3 dodge every N combo hits, ICD hero turns
    comboShadowMul: 0.45, comboShadowAt: 3, // rg_c4 ★ Living Shadow: share of a Back Stab · chain hits needed
    critAmbushHi: 0.7, critAmbushLo: 0.35, critLeechResMax: 12, critKnifeMul: 1.2, // rg_x1 HP at / above · below · rg_x3 Energy cap per hero turn · rg_x4 ★ crit knife x P.ATK
    // ----- 🧤 rg_d สายปลด (Strip line, Q 2026-11-21 "Rogue ควรมีสาย strip ตัดกำลังศัตรู"): every strip is paid in Marks on the Back Stab target -----
    divest: {
      marks: 2, // Back Stab target needs >= this many Marks (before the pickup) for ปลดอาวุธ / ฉกบัฟ
      weak: 0.1, weakPer: 0.05, turns: 2, // rg_d1 ปลดอาวุธ: hits weaker (weak) base + per lv, monster turns
      disarm: 0.5, // rg_d1: its next turn hits x(1 - this)
      stripPer: 0.05, exposedPct: 0.2, exposedTurns: 2, // rg_d2 ถอดเกราะเปลือย: Strip Armor P.DEF cut + per lv · full Marks -> Exposed (same share as ม่านควัน)
      snatchBase: 0.2, snatchPer: 0.2, snatchAmpCap: 0.3, snatchShieldCap: 0.15, snatchTurns: 2, snatchCd: 3, // rg_d3 ฉกบัฟ: share of the stolen buff the hero keeps (base + per lv) · ATK-buff cap · shield cap (max HP) · hero turns · monster turns before the same monster can be robbed again
      breakMarks: 2, breakPush: 40, breakImmune: 3, // rg_d4 ★ ตัดจังหวะ: Marks a casting monster needs · boss / mini gauge pushed back · monster turns it can't be cut again
      bossMul: 0.5, resTurns: 2, resMul: 0.5, // boss / mini take x bossMul of every strip · stripped again within resTurns monster turns: x resMul more (Slay the Spire Artifact style)
    },
  },
  mobster: {
    execBase: 0.08, execPer: 0.03, bossExecMul: 2, // 📒 สมุดหนี้: Execute under (base + per x debt) HP · boss / mini take x this instead (doc 3x)
    cutCost: 30, cutCd: 3, cutTurns: 3, cutMul: 1, armorBrk: 0.25, // ⛓️ ตัดเส้นเอ็น: hit + DEF -25% + chill
    ultSlash: 0.6, burstTurns: 3, burstMul: 1.5, ultCdRefund: 1, // 💀 ทวงหนี้: slash all 0.6x, then poison left (stacks x dmg x turns x mul) bursts at once · a kill refunds ult cooldown
    mastery: { atkPct: 0.05, poisonDmg: 1 }, // dagger
  },
  crusader: {
    guard: 0.1, guardVit: 0.002, guardCap: 0.4, guardOverMul: 2, // v116: each 1% over the cap = block shield / heal +2% · 🛡️ Auto Guard: block chance + per VIT point over the start (no off-hand = KIT2.knight.guardShieldless)
    holyVs: 0.25, holyFoes: ['skeleton', 'wisp', 'deathknight', 'hellknight', 'imp', 'necropriest', 'wraith', 'maiden', 'lich', 'bonepriest', 'mummy', 'dunewraith', 'pharaoh', 'gargoyle', ...PACKS.flatMap((p) => p.holyFoes)] as MonsterKind[], // ศรัทธา: undead / demons take +25%
    crossCost: 22, crossCd: 2, crossHits: 2, crossMul: 1, blindTurns: 2, blindHit: 0.2, // ✝️ Holy Cross: per hit P.ATK + Pm on the front monster · blind = its Hit -20%
    gcPay: 0.2, gcPm: 0.5, gcAtk: 0.6, gcStr: 0.8, gcPulses: [2, 2, 2, 3, 4, 4], gcRefund: 0.5, gcRefundAt: 3, gcBurn: 1, // v119 (Q 2026-11-08): spell vamp removed (the HP refund already heals) · v109 (Q): PER PULSE gcPm x Pm (magic) + gcAtk x P.ATK + gcStr x STR (physical), pulses by Ult วิวัฒน์ Lv 0..5; burn bonus + root P.ATK split over the pulses · // ✨ Grand Cross: pay 20% current HP · all monsters · 3+ hit = half the HP back · v106 (Q 2026-11-07): back to the v102 cross (no Mana cost, no Cleric ult) + burns ALL Mana left: bonus magic dmg/target = gcBurn x (Mana burnt + HP paid) · Cleric Ult-web node buffs apply (root Ult +12%/Lv, 🌄 P.ATK + Dawn Light, ไฟชำระ, talents)
    angelCap: 0.25, hcVit: 2, hcVitGrace: 2, // v119 (Q 2026-11-08): 🪽 Guardian Angel DR cap · ✝️ Holy Cross VIT per stack, turns it lasts after Holy Cross is ready again
    martyrShield: 0.2, // ★ ผู้พลีชีพ: shield share of max HP (Reflect Shield is capped by BATTLE.reflectCap)
    mastery: { atkPct: 0.05, def: 6 }, // mace / sword
  },
  monk: {
    combo: 0.1, chargeMax: 5, chargePerSwing: 1, chargePerCombo: 1, // 👊 หมัดกระแส: power charges from every swing + every combo hit
    thunderCost: 0, thunderCd: 2, thunderMin: 2, thunderPm: 0.8, thunderPer: 0.4, // ⚡ Falling Thunder: all charges, all monsters 0.8x Pm x (1 + 40% per charge)
    comboThunderHits: 3, comboThunderMul: 0.6, // ⚡ ฟ้าฟาดคอมโบ: >=3-hit chain + >=2 charges -> free AoE lightning
    comboFinishMul: 1.4, comboFinishPerHit: 0.35, comboFinishBreakTurns: 2, comboFinishStunChance: 0.35, comboFinishPush: 15, comboFinishCdCut: 1, // 💥 ★ พายุหมัดปิดฉาก
    bellHp: 0.3, bellWis: 0.008, bellTaunt: 0.5, bellTurns: 3, bellRing: 0.5, bellBoom: 2, // 🔔 Tempest Bell (Ally 'object'): hero swing rings AoE 0.5x Pm · broken = 2x Pm burst · HP scales with WIS
    haymakerAt: 0.25, haymakerCap: 0.5, haymakerShield: 0.6, haymakerGritMul: 0.9, haymakerMdefHp: 0.14, // 🥊 หมัดแค้น (base)
    haymakerStarAt: 0.15, haymakerStarCap: 0.75, haymakerStarShield: 1, haymakerStarGritMul: 1.25, haymakerStarMdefHp: 0.24, haymakerSplash: 0.65, haymakerPush: 20, haymakerDr: 0.1, // 🥊 ★ หมัดพิพากษา
    asuraMinAt: 3, asuraAtk: 3.5, asuraPerCharge: 0.6, asuraMana: 2.2, asuraMdefHp: 0.16, asuraExhaustTurns: 3, asuraSlow: 0.4, asuraWeak: 0.35, // 💥 ★ อาชูร่าสไตรก์ + 😵 ง่อยแดก
    instillMul: 0.5, chillTurns: 2, noLightMul: 1.5, darkCap: 0.5, // ★ Instill bolt · ฝ่ามือธาตุ chill · ★ ไร้แสง overheal -> Darkness shield (cap of max HP)
    mastery: { atkPct: 0.05, combo: 0.03 }, // fist / staff
  },
  // ----- Phase 5 Mage: Wizard / Sage -----
  wizard: {
    castTaken: 0.15, quickMana: 0.8, // 🔮 ร่ายใหญ่: damage taken while a big spell charges · ★ Quagmire: no charge at Mana >= this share
    gustCost: 40, gustCd: 4, gustHits: 3, gustMul: 0.6, gustChill: 2, gustPush: 15, // ❄️ Storm Gust: every monster, 3 hits x Pm, the 3rd freezes (boss: chill + gauge push)
    meteors: 5, meteorMul: 1.2, meteorBurn: 2, // ☄️ Meteor Storm (fire): random meteors + burn stacks
    lovHits: 4, lovMul: 0.5, lovStun: 0.1, lovPush: 20, // ⚡ Lord of Vermilion (lightning): every monster, stun chance per hit (boss: gauge push)
    iceBarrier: 1.5, // ❄️ ult: a free Storm Gust + barrier x this
    mastery: { matk: 10, spellCrit: 0.03 }, // staff
  },
  sage: {
    basicMul: 1, // 📖 melee basic x P.ATK (base Mage: 0.6x magic bolt)
    s1Cost: 12, s1InfuseBonus: 0.5, // 📖 Spellstrike (passive Skill 1): basic/combo hits spend Mana to deal +50% melee & guarantee Auto Spell + On-Hit Perks
    autoChance: 0.38, autoInt: 0.0025, autoCap: 0.75, autoMul: 0.9, // Auto Spell per basic: chance + per INT (capped), a run-element bolt x Pm
    endowCost: 22, endowCd: 5, endowTurns: 3, endowAmp: 0.25, endowPerkChance: 0.1, // 🗡️ Endow: melee + Auto Spell + Perks +25% & +10% proc chance
    ultCost: 25, ultAtk: 2.2, ultPm: 1.2, ultMana: 20, ultBreakTurns: 2, // 🚫 Dispell + Spell Breaker
    rodBlockMana: 24, rodVitMana: 0.35, rodVitShield: 2.2, // 🛡️ Magic Rod + VIT scaling (Mana + ward)
    dexSkillCrit: 0.0025, dexSkillCritCap: 0.15, dexCombo: 0.002, dexComboCap: 0.12, // DEX -> skillCrit + combo
    wisElemDmg: 0.003, wisElemCap: 0.3, // WIS -> elemental dmg
    lukProcCritMul: 0.006, lukProcCritCap: 0.6, // LUK -> extra proc/Auto Spell crit dmg
    perk: {
      offMul: 0.65, // off-element perk benefit (main runElement = 1.0)
      fireChance: 0.35, firePerLv: 0.07, fireInt: 0.002, fireCap: 0.85,
      fireMul: 0.7, fireDmgPerLv: 0.12, fireBurn: 1, fireMaxBolts: 3,
      fireNovaMul: 1.5, fireNovaBurn: 2, // ★ Inferno Overdrive
      lightChance: 0.35, lightPerLv: 0.07, lightInt: 0.002, lightCap: 0.85,
      lightMul: 0.85, lightDmgPerLv: 0.12, lightDecay: 0.2,
      lightTargetsBase: 2, lightStunPerLv: 0.03, lightPush: 12,
      lightCritMana: 6, // ★ Overload Tempest
      iceChance: 0.6, icePerLv: 0.15, iceMax: 4, // Permafrost (Sejuani E): 4 stacks -> freeze + burst
      iceMul: 1.65, iceDmgPerLv: 0.15, iceCritBonus: 0.2, iceCritPerLv: 0.05,
      iceBossPush: 25, iceStarPush: 25, iceStarMul: 1.3, // ★ Absolute Permafrost
    },
    mastery: { atkPct: 0.05, matk: 8 }, // book / staff
  },
  // ----- Phase 4 Archer: Beastmaster / Innovator (Ally pets / traps / turrets: battle/allies.ts) -----
  beastmaster: {
    packPow: 0.7, // rework v2.1: all 3 pets every wave, each at this power (x ใจเดียวกัน, x ฝูงพันธมิตร)
    hawkChance: 0.05, hawkLuk: 0.004, hawkCap: 0.6, hawkMul: 0.6, hawkHits: 1, hawkHitsMax: 3, // 🦅 RO Blitz Beat per hero swing: 5% base + 0.4%/LUK (cap 60%, 75% in Hawk Stance)
    hawkEvoMul: 0.5, hawkEvoHits: 1, // ★ เหยี่ยวทอง
    preyMark: 0.1, preyTurns: 2, // 🏷️ Prey Mark: every Blitz Beat hit marks (shares Archer huntMark: damage taken + max(arMark, this))
    gustEvery: 3, gustBlind: 2, blindHit: 20, // 🪶 Razor Gust (bm_h3): every Nth Blitz Beat blinds targets for 2 hero turns (Hit -20)
    spotCrit: 0.05, // 👁️ ★ Apex Spotter (bm_h4): hero crit + · a newly marked target sends the wolf in now
    boarHp: 0.6, boarEvery: 3, boarMul: 0.8, boarPush: 30, // 🐗 HP = share of hero max HP (VIT) · every N hero turns charges the front (boss: gauge push)
    boarShare: 0.35, boarCut: 0.3, boarRageK: 140, boarRecoverTurns: 3, boarDown: 3, // 🐗 Guardian: share absorbed + cut + Grit Rage gain + down recovery turns
    boarEvoHp: 0.5, boarEvoEvery: 2, boarEvoShare: 0.1, boarEvoDown: 2, boarReviveShield: 0.15, boarGuardHpPct: 0.5, // ★ หมูป่าเกราะ + Guard thresholds
    wolfSpeed: 0.8, wolfMul: 0.7, wolfBleed: 2, // 🐺 own turn at this share of hero speed (AGI) · bite + bleed stacks · follows hero combo hits
    wolfEvoMul: 0.5, wolfEvoSpeed: 0.3, // ★ ราชาหมาป่า
    frenzyCap: 5, frenzySpd: 0.01, // 🩸 Bloodscent Frenzy (bm_w3): hero/wolf speed + this x Lv per bleed stack on front monster (capped at 5; 7 in Wolf Stance)
    crunchEvery: 3, crunchLow: 0.35, crunchHeal: 0.1, // 🦷 ★ Savage Crunch: every 3rd bite / Prey Mark / < 35% HP -> sure crit, heals hero + boar 10% of dmg
    harmonyWolf: 0.25, harmonyBoarHeal: 0.08, // 🤝 ★ Tri-Beast Harmony (bm_k4): wolf deals +25% vs Prey Mark & heals boar 8% boar max HP
    wolfBleedCap: 1.5, // 🐺 IV talent: % Max HP bleed tick cap = this x P.ATK
    cmdCost: 30, cmdMinCost: 10, cmdCd: 3, cmdHawkHits: 2, cmdBoarShield: 0.15, cmdPack: 2, cmdPackTurns: 2, cmdPackPow: 0.3, // 📯 สั่งลุย per pet
    ultAwakenTurns: 3, ultBoarShare: 0.7, ultReflect: 0.5, ultEndShield: 0.4, ultEndShieldMin: 0.1, // 🐾 Primeval Awakening
    petHealLowHp: 0.35, roarWeakenTurns: 2, // 🩹 emergency double heal < 35% HP · 🐺 opening weaken 2 monster turns
    mastery: { atkPct: 0.05, hit: 8 }, // bow
    tree: {
      hawkChance: 0.05, hawkHit: 8, markPierceFlee: 0.15,
      hawkMul: 0.15, hawkIntAdd: 0.5, preyMarkAdd: 0.03, preyTurnsAtLv: 3,
      boarHp: 0.15, boarShare: 0.03, boarCut: 0.05, boarMul: 0.2, boarRageK: 20, boarShield: 0.05, boarGuardDr: 0.04, boarDownCut: 1,
      wolfMul: 0.1, wolfPierceBleed: 0.1, wolfBleed: 1, bleedDmg: 0.08, wolfSpeed: 0.1,
      petPow: 0.08, petStatScale: 0.1, petRes: 1, wolfRallyStep: 5, cmdCut: 5, cmdHawkLv: 3, pack3Pow: 0.2,
      packLead: 0.04, petHeal: 0.005, petHealLow: 1, roar: 10, roarWeaken: 0.05,
    },
  },
  innovator: {
    traps: 1, mineMul: 1.5, snarePush: 30, freezeMul: 0.6, freezeChill: 2, // 🧰 wave-start trap (random of 3) fires when a monster acts: 💣 Land Mine · 🕳️ Ankle Snare (boss: gauge -30) · ❄️ Freezing Trap
    boxCost: 35, boxCd: 3, rareLuk: 0.01, rareLukCap: 1.5, // 🎲 กล่องสุ่ม: rare gadget weight x (1 + LUK x this, capped)
    chickenSoaks: 2, rocketMul: 3, turretMul: 0.6, turretTurns: 3, magnetZeny: 0.3, mirrorCap: 1, colaMul: 1, colaChill: 2, wetTurns: 3, wetAmp: 0.25, // gadgets (☁️ wet: +25% from every hero hit, doc: lightning x1.5 — archers have no lightning)
    ultBoxes: 3, // 🛠️ สิ่งประดิษฐ์สุดเพี้ยน: 3 boxes + every trap + the base archer pierce shot
    mastery: { atkPct: 0.05, crit: 0.02 }, // bow
  },
}

// ----- P3'a Rogue pure helpers (BattleScene reads these · tests/rogue-p3a.test.ts) -----
/** มีดบิน x P.ATK: (base + j2KnifeMul) x (1 + pskill x knifePskillShare). The storm keeps its own formula. */
export const rogueKnifeMul = (st: Pick<Stats, 'j2KnifeMul' | 'pskill'>, base: number = KIT2.rogue.knifeMul) => (base + st.j2KnifeMul) * (1 + Math.max(0, st.pskill) * KIT2.rogue.knifePskillShare)
/** 🔪 เก็บมีด Sinister Steel x P.ATK on the picked-up monster (the others take x markSteelSplash). */
export const rogueSteelMul = (marks: number, pskill: number) => KIT2.rogue.markSteelMul * Math.max(0, marks) * (1 + Math.max(0, pskill))
/** Back Stab B4 (R4.6): conditional amps add under stabAmpCap. Combo Point is a separate multiplier outside it (MAIN-VS-REV4 R1). */
export const rogueStabAmp = (ambush: boolean) => Math.min(KIT2.rogue.stabAmpCap, ambush ? KIT2.rogue.stabAmbushMul : 0)
/** rg_c2: combo dmg + per debuff kind / Mark on the target, at most comboDebuffMax kinds. */
export const rogueComboDebuff = (st: Pick<Stats, 'j2ComboDebuff'>, kinds: number) => Math.max(0, st.j2ComboDebuff) * Math.min(KIT2.rogue.comboDebuffMax, Math.max(0, kinds))
/** rg_x1: + crit / skillCrit vs a monster at HP share >= critAmbushHi, < critAmbushLo, or Exposed. */
export const rogueAmbushCrit = (st: Pick<Stats, 'j2AmbushCrit'>, hpShare: number, exposed: boolean) =>
  st.j2AmbushCrit > 0 && (hpShare >= KIT2.rogue.critAmbushHi || hpShare < KIT2.rogue.critAmbushLo || exposed) ? st.j2AmbushCrit : 0

/** Beastmaster Partner Passive Stances (`save.pet = 'hawk' | 'boar' | 'wolf'`, rework v2.1). */
export const BM_STANCE = {
  hawk: {
    luk: 15,
    capAdd: 0.15, // 60% -> 75% Auto-Blitz cap
    hitFlat: 15,
    hitPerDex: 0.25,
    critBase: 0.06,
    critPerLuk: 0.0005,
    critCap: 0.15,
    dexToMatk: 0.2, // floor(0.20 * DEX) bonus to Falcon Power
    preyMarkAdd: 0.05,
    markPierceFlee: 1.0, // ignore enemy Flee 100% on Prey Mark targets
    markCritDmg: 0.18,
  },
  boar: {
    defBasePct: 0.15,
    defPerVit: 0.35,
    shareAdd: 0.1, // 35% -> 45% base damage share
    shieldAmp: 0.2,
    gritShield: 0.08, // 8% Hero Max HP barrier when Boar Rage reaches 100
  },
  wolf: {
    atkBasePct: 0.1,
    atkPerAgi: 0.3,
    bleedDmgAdd: 0.25,
    woundLeech: 0.04, // 4% lifesteal when attacking Bleed >= woundMinStacks
    woundMinStacks: 3,
    frenzyCapAdd: 2, // 5 -> 7 max Bloodscent Frenzy stacks
  },
} as const

/** Beastmaster `bm_s4` ★ Hunter's Instinct crit-counterattack constants per partner pet (rework v2.1). */
export const BM_CRIT_COUNTER = {
  hawk: { mul: 1.0, markTurns: 2 },
  boar: { mul: 0.8, push: 20, shieldPct: 0.05, shieldTurns: 2 },
  wolf: { mul: 0.7, bleed: 2, gaugeGain: 50 },
} as const

/** Beastmaster rework v2.1 shared derivation helpers (read by `battle/allies.ts`, `BattleScene.ts`, UI dossier, and tests). */
export const hawkChance = (st: Stats, luk: number) =>
  Math.min(KIT2.beastmaster.hawkCap + st.j2HawkCapAdd + (st.j3Rn > 0 ? KIT3.ranger.hawkCapAdd : 0), KIT2.beastmaster.hawkChance + KIT2.beastmaster.hawkLuk * Math.max(0, luk) + st.j2HawkChance)
export const hawkBlitzMul = (st: Stats) =>
  KIT2.beastmaster.hawkMul + st.j2HawkMul + (st.j2HawkEvo ? KIT2.beastmaster.hawkEvoMul : 0)
export const frenzyCapOf = (st: Stats) => KIT2.beastmaster.frenzyCap + st.j2FrenzyCapAdd
export const boarShareOf = (st: Stats) => KIT2.beastmaster.boarShare + st.j2BoarShare
export const boarCutOf = (st: Stats) => KIT2.beastmaster.boarCut + st.j2BoarCut
export const boarRageKOf = (st: Stats) => KIT2.beastmaster.boarRageK + st.j2BoarRageK
export const boarRecoverTurnsOf = (st: Stats) => Math.max(1, KIT2.beastmaster.boarRecoverTurns - st.j2BoarDownCut)
export const preyMarkOf = (st: Stats) => KIT2.beastmaster.preyMark + st.j2PreyMarkAdd
export const preyTurnsOf = (st: Stats) => KIT2.beastmaster.preyTurns + st.j2PreyTurns

/** Skill 2 linear "+" numbers: base + per x Stats.s2Lv. Plain numbers so the admin can tune them (skills `s2p.<key>.base|per`);
 *  the S2N functions below read them on every call. Defaults are the v83 values. */
export const S2P = {
  guardCut: { base: 0.4, per: 0.05 }, guardBack: { base: 0.5, per: 0.1 }, guardDef: { base: 2, per: 0.5 }, // Q 2026-11-22 ตั้งการ์ด counter: % of dmg taken this turn + P.DEF x
  bloodVamp: { base: 0.2, per: 0.05 }, tauntWeak: { base: 0.2, per: 0.05 },
  rainMul: { base: 0.8, per: 0.15 }, hawkCrit: { base: 0.2, per: 0.05 }, trapPush: { base: 30, per: 10 },
  mshieldTake: { base: 0.4, per: 0.05 }, novaMul: { base: 0.8, per: 0.15 }, arcaneMul: { base: 0.6, per: 0.1 },
  renewHeal: { base: 0.3, per: 0.05 }, kyrieHp: { base: 0, per: 0.05 }, spearPlus: { base: 0, per: 0.03 },
  smokeHeal: { base: 0, per: 0.03 }, pickRes: { base: 15, per: 5 },
  smokeRes: { base: 10, per: 5 }, woundMax: { base: 6, per: 2 / 3 }, // P2'b: ควันหอม Energy (rounded) · แผลฉีก Wound cap (floored)
}
const lin = (k: { base: number; per: number }, lv: number) => k.base + k.per * lv
/** Caps for Skill 2 numbers that would run away past the old s2Lv 3 (class-1 skill cap 10 / 15, Q 2026-11-24): s2Lv 3 values stay below them. */
export const S2CAP = { guardCut: 0.6, tauntWeak: 0.4, hawkCrit: 0.45, mshieldTake: 0.65 }

/** Skill 2 numbers by "+" level (Stats.s2Lv) and ★ (Stats.s2Star). data/skill2.ts texts and BattleScene.castSkill2 read these. */
export const S2N = {
  guardCut: (lv: number) => Math.min(S2CAP.guardCut, lin(S2P.guardCut, lv)), guardTurns: (star: boolean) => (star ? 3 : 2), guardCounters: (star: boolean) => (star ? 2 : 1),
  guardShield: (star: boolean) => (star ? 0.18 : 0.1),
  guardBack: (lv: number, star: boolean) => lin(S2P.guardBack, lv) + (star ? 0.3 : 0), guardDef: (lv: number) => lin(S2P.guardDef, lv),
  bloodVamp: (lv: number) => lin(S2P.bloodVamp, lv), bloodTurns: 3, bloodAtk: 0.2,
  tauntWeak: (lv: number) => Math.min(S2CAP.tauntWeak, lin(S2P.tauntWeak, lv)), tauntTurns: (star: boolean) => (star ? 3 : 2),
  tauntBreakTurns: (star: boolean) => (star ? 2 : 1), tauntStarRes: 15, tauntStarShield: 0.08,
  rainMul: (lv: number) => lin(S2P.rainMul, lv), rainWaves: (star: boolean) => (star ? 2 : 1),
  hawkCrit: (lv: number) => Math.min(S2CAP.hawkCrit, lin(S2P.hawkCrit, lv)), hawkTurns: 3, hawkCritDmg: 0.3,
  trapMul: 0.6, trapPush: (lv: number) => lin(S2P.trapPush, lv),
  mshieldTake: (lv: number) => Math.min(S2CAP.mshieldTake, lin(S2P.mshieldTake, lv)), mshieldTurns: (star: boolean) => (star ? 5 : 3),
  novaMul: (lv: number) => lin(S2P.novaMul, lv), novaChill: (star: boolean) => 2 + (star ? 1 : 0), novaPush: 15,
  arcaneMul: (lv: number) => lin(S2P.arcaneMul, lv), arcaneHits: (star: boolean) => 3 + (star ? 2 : 0),
  renewHeal: (lv: number) => lin(S2P.renewHeal, lv), renewTurns: (star: boolean) => (star ? 6 : 4), // heal x M.ATK per turn (Q 2026-11-04: Priest heals scale with M.ATK; was 6% +1%/lv max HP)
  // v77 Q 2026-11-06: Priest ทักษะ 2 พรแสง = active Blessing (Mana 30 · cd 4 in skill2.ts). 3 hero turns: STR/DEX/INT/WIS +15 + cleanse 1 debuff on cast
  // · "+" 🛡️ Kyrie Eleison: barrier 5%/lv max HP (Lv3 = 15%), breaks after 3 hits · ★ ✨ Gloria: LUK +30 while blessed
  blessTurns: 3, blessStat: 15, blessCleanse: 1, kyrieHp: (lv: number) => lin(S2P.kyrieHp, lv), kyrieHits: 3, gloriaLuk: 30,
  spearPlus: (lv: number) => lin(S2P.spearPlus, lv), spearCount: (star: boolean) => (star ? 4 : 2), // หอกคม: +10%/lv of the 0.3x base
  smokeHeal: (lv: number) => lin(S2P.smokeHeal, lv), smokeDodges: (star: boolean) => (star ? 2 : 1),
  pickMul: (star: boolean) => (star ? 1.6 : 1), pickRes: (lv: number) => lin(S2P.pickRes, lv), pickPoison: 3,
  woundMul: (star: boolean) => (star ? 2 : 1.2), woundPoison: (lv: number) => 4 + Math.round(lv), // stacks: whole numbers (v83 s2Lv can be fractional)
  // P2'b (MAIN-VS-REV4 §4, R4.7.3 minus ล้วงกระเป๋า: main's steal stays): plain numbers so the admin can tune them (skills `s2n.<key>`)
  // ม่านควัน: Shroud (FLEE x(1 + smokeFlee), skillCrit +, ★ Crit Dmg + in B3) · first active hit = Sightless Raid + Exposed (B1) + Blind (KIT2.crusader.blindHit)
  smokeTurns: 2, smokeFlee: 0.25, smokeSkillCrit: 0.15, smokeCritDmg: 0.25, raidMul: 1.2,
  exposedPct: 0.2, exposedStar: 0.3, exposedTurns: 2, smokeBlindTurns: 2,
  smokeRes: (lv: number) => Math.round(lin(S2P.smokeRes, lv)), // whole Energy (s2Lv can be fractional)
  // แผลลึก: Wound stacks (hero turns, refreshed on every add) · Blade's End at bladeAt Wound (1 / turn / target) · Privileged +woundPriv in B1
  woundStacks: 2, woundStarStacks: 3, woundTurns: 3, woundStrikeChance: 0.5,
  bladeAt: 3, bladeMul: 1.8, bladeHealCut: 0.4, bladeCutTurns: 2, woundPriv: 0.12,
  woundMax: (lv: number) => Math.floor(lin(S2P.woundMax, lv)), // whole stacks (s2Lv can be fractional)
}

// ---------- costs / cooldowns ----------
// floor 10, unless the class's own cost is lower (Mage 5, 2026-11-13) · P2'a: Thief (Rogue / Mobster too) floor KIT.thiefAutoMinCost
export const autoCost = (job: JobDef, st: Stats) => {
  if (swordS1On(job) && job.resource === 'mana') return Math.max(SWORD_S1.mana, SWORD_S1.mana - st.autoCostCut) // ⚔️ ดาบสยบมนตร์: flat Mana at every Lv, autoCostCut can't lower it (Berserker: its flat Rage cost below)
  return Math.max(job.id === 'thief' ? KIT.thiefAutoMinCost : Math.min(10, job.auto.cost), job.auto.cost - st.autoCostCut)
}
/** ⚔️ ดาบสยบมนตร์ is this job's Skill 1: the whole Swordsman line (Q 2026-11-21: Berserker too, paying its flat Rage cost). */
export const swordS1On = (job: JobDef) => job.id === 'swordsman'

// ---------- P2'a Thief pure helpers (numbers only, no Mon / Phaser: tests call them directly) ----------
/** สลับคม: after แทงพิษ the next hero turn is a basic attack · Q3: not inside 👤 ร่างเงา (free Skill 1 spam stays). */
export const thiefS1Woven = (jobId: string, weave: boolean, inShadow: boolean): boolean => jobId === 'thief' && weave && !inShadow
/** th_t2b: crit / skillCrit from poison + Wound stacks on the target (counts up to KIT.thiefStackCritTalMax). */
export const thiefStackCritAdd = (st: Stats, stacks: number): number => st.thStackCritTal * Math.min(Math.max(0, stacks), KIT.thiefStackCritTalMax)
/** thief_c1: lifesteal from status kinds on the target. */
export const thiefCondLeechAdd = (st: Stats, kinds: number): number =>
  kinds < 1 ? 0 : st.thCondLeech * (kinds >= KIT.thiefKindsAt ? KIT.thiefCondLeechMulti : 1)
/** thief_c3: kill heal share of max HP (poison on the corpse adds, only with the node). */
export const thiefKillHeal = (st: Stats, poisonOnCorpse: number): number =>
  st.thKillLeech > 0 ? st.thKillLeech + Math.min(KIT.thiefKillPoisonHealCap, Math.max(0, poisonOnCorpse) * KIT.thiefKillPoisonHeal) : 0
/** thief_c3: first crit on a boss / mini each turn heals this share of max HP. */
export const thiefBossCritHeal = (st: Stats): number => st.thKillLeech * KIT.thiefBossCritLeech
/** thief_c4 ★ ราชันย์โลหิต: on below KIT.thiefBloodKingBelow of max HP, or inside ม่านควัน Shroud (P2'b). */
export const thiefBloodKingOn = (st: Stats, hp: number, maxHp: number, inShroud: boolean): boolean => st.thBloodKing > 0 && (inShroud || hp < maxHp * KIT.thiefBloodKingBelow)
// ---------- P2'b Thief status layer (B1 Taken, R4.6) ----------
/** Stacks needed for a "share of the poison cap" threshold (P2'b): ceil(share x cap), at least 1. cap = the hero's poisonMax(). */
export const poisonAt = (share: number, cap: number): number => Math.max(1, Math.ceil(share * Math.max(0, cap) - 1e-9))
/** B1: the debuffs one monster carries; the Scene fills it, the math stays Phaser-free. */
export interface DebuffFlags { poison: boolean; wound: boolean; exposed: boolean; chill: boolean; stabMark: boolean; blind: boolean; armorBrk: boolean; weak: boolean }
/** How many different debuff kinds. `wide` = the th_t4a list (8 kinds); otherwise the thief_c1 list (poison / Wound / Exposed / chill). */
export const debuffKinds = (f: DebuffFlags, wide: boolean): number =>
  (f.poison ? 1 : 0) + (f.wound ? 1 : 0) + (f.exposed ? 1 : 0) + (f.chill ? 1 : 0) +
  (wide ? (f.stabMark ? 1 : 0) + (f.blind ? 1 : 0) + (f.armorBrk ? 1 : 0) + (f.weak ? 1 : 0) : 0)
/** B1 inputs: each term is already 0 when its own filter fails (Exposed: hits only, Privileged: its condition ...). stabMark = P3 Rogue. */
export interface TakenIn { exposed: number; stabMark: number; woundPriv: number; privileged: number; poisonAmp: number }
/** B1 Taken (R4.6): the terms ADD, one cap (KIT.thiefTakenCap). Damage x (1 + this). */
export const takenAmp = (i: TakenIn): number =>
  Math.max(0, Math.min(KIT.thiefTakenCap, i.exposed + i.stabMark + i.woundPriv + i.privileged + i.poisonAmp))
// ---------- P2'c Thief Ult (เงาพริ้ว) pure math: BattleScene and the budget test read the same functions ----------
export type UltSt = Pick<Stats, 'ultHits' | 'thUltCrit' | 'thUltExecCrit' | 'thUltCondCritDmg' | 'thExecUlt' | 'thUltExecDmg' | 'thUltFinisher' | 'thUltKillFinisher' | 'thUltOnHit' | 'thUltOnHitTal'> & Partial<Pick<Stats, 'thFlurryDmgCut'>>
/** Stabs of one เงาพริ้ว (Rogue พายุมีด runs the same dance). */
export const thiefUltHitCount = (st: UltSt): number => KIT.thiefUltHits + Math.max(0, st.ultHits)
/** Ult-only skillCrit from thief_u1 / th_t3a (it counts as skillCrit: a physical Ult with only this can crit). */
export const thiefUltCritAdd = (st: UltSt): number => Math.max(0, st.thUltCrit) + Math.max(0, st.thUltExecCrit)
/** Crit chance of an Ult stab outside ร่างเงา: (skillCrit + Ult bonus), none at 0 (Q 2026-11-19 crit rework), CRIT_RULES skill cap. */
export const thiefUltCritRate = (skillCrit: number, st: UltSt): number => {
  const s = skillCrit + thiefUltCritAdd(st)
  return s <= 0 ? 0 : Math.min(CRIT_RULES.cap.skillCrit, s)
}
/** B3 Ult-own crit dmg (added to critMul, never to mul): thief_u1 per debuff kind + thief_u3 / th_t3a vs low HP, one cap KIT.thiefUltCondCap. */
export const thiefUltCondCritDmg = (st: UltSt, kinds: number, hpShare: number): number => {
  const k = Math.max(0, kinds)
  const sum = st.thUltCondCritDmg * Math.min(k, KIT.thiefUltKindsMax)
    + (hpShare < KIT.thiefExecBelow ? st.thExecUlt : 0)
    + (hpShare < KIT.thiefUltExecBelow || k >= KIT.thiefKindsAt ? st.thUltExecDmg : 0)
  return Math.max(0, Math.min(KIT.thiefUltCondCap, sum))
}
/** On-Hit share of Ult stabs (thief_u2 / th_t3b): 0 without a source, else base + node + talent under KIT.thiefOnHitCap. */
export const thiefOnHitEff = (st: UltSt): number =>
  st.thUltOnHit > 0 || st.thUltOnHitTal > 0 ? Math.min(KIT.thiefOnHitCap, KIT.thiefOnHitBase + Math.max(0, st.thUltOnHit) + Math.max(0, st.thUltOnHitTal)) : 0
/** The one closing stab after the dance: th_t3a always (rolls crit), thief_u4 ★ at KIT.thiefFinisherAt crits (sure crit); the bigger x. */
export const thiefUltFinisher = (st: UltSt, crits: number): { mul: number; sure: boolean } => {
  const star = st.thUltFinisher > 0 && crits >= KIT.thiefFinisherAt
  return { mul: Math.max(Math.max(0, st.thUltKillFinisher), star ? KIT.thiefFinisherMul : 0), sure: star }
}
/** R4.6 B3 Crit Dmg: conditional crit-dmg terms add (never x mul), one cap KIT.thiefCondCritDmgCap. */
export const condCritB3 = (parts: readonly number[]): number =>
  Math.min(KIT.thiefCondCritDmgCap, parts.reduce((a, b) => a + Math.max(0, b), 0))
/** P(at least k successes in n tries of chance p). */
const atLeast = (n: number, p: number, k: number): number => {
  if (k <= 0) return 1
  if (p >= 1) return n >= k ? 1 : 0
  let below = 0
  for (let i = 0; i < Math.min(k, n + 1); i++) {
    let c = 1
    for (let j = 0; j < i; j++) c = (c * (n - j)) / (j + 1)
    below += c * p ** i * (1 - p) ** (n - i)
  }
  return Math.max(0, 1 - below)
}
/** Reference hero for the Ult budget: effective skillCrit on an Ult stab (gear / cards / mastery / th_t2b ...) and critMul. */
export interface UltHero { skillCrit: number; critMul: number; b3Other?: number } // b3Other: B3 terms outside the Ult (Shroud ★, Rogue rg_x2), both sides
/** Ult budget (MAIN-VS-REV4 §5.2, Q2) in "stab units": damage of one cast ÷ (one non-crit stab). hitPow, Ratio AGI (thUltAgi), P.ATK, DEF and the
 *  Hit roll scale every stab (finisher too) the same, so they cancel. Worst-case target (HP low, thiefUltKindsMax kinds); crit and the ★ finisher
 *  trigger are expected values. `shadow` = cast inside 👤 ร่างเงา: every physical stab is a sure crit at full crit power. */
export function thiefUltBudget(st: UltSt, hero: UltHero, shadow: boolean): number {
  const n = thiefUltHitCount(st)
  const flurryCut = Math.max(0, 1 - Math.max(0, st.thFlurryDmgCut ?? 0))
  const cd = hero.critMul + condCritB3([hero.b3Other ?? 0, thiefUltCondCritDmg(st, KIT.thiefUltKindsMax, 0)])
  const p = shadow ? 1 : thiefUltCritRate(hero.skillCrit, st)
  const per = 1 + p * (cd - 1)
  const a = Math.max(0, st.thUltKillFinisher)
  const fires = st.thUltFinisher > 0 ? atLeast(n, p, KIT.thiefFinisherAt) : 0
  const b = Math.max(a, KIT.thiefFinisherMul)
  return (n * per + (1 - fires) * a * per + fires * b * cd) * flurryCut
}
/** Global Ult CD cap: turns a wanted cut really takes (`budget` = what is left of KIT.thiefUltCdCutCap this hero turn). */
export const ultCdCut = (cdLeft: number, want: number, budget: number, justCast: boolean): number =>
  Math.max(0, Math.min(Math.max(0, want), Math.max(0, budget), cdLeft - (justCast ? KIT.thiefUltCdFloor : 0)))
/** Mana the ult costs (Mage, Swordsman, Cleric since v86); 0 for every other job. v102: pass st for the base Cleric ult (+clUltMana by Ult node Lv). */
export const ultCost = (job: JobDef, st?: Stats, job2?: string) => (job.resource === 'mana' ? job2 === 'knight' ? KIT2.knight.ultMana : (job.ult.cost ?? 0) + (job.id === 'cleric' && (job.ult.cost ?? 0) > 0 ? st?.clUltMana ?? 0 : 0) : 0)
/** Ult cooldown in hero turns before relics (gear smashCd lowers it for every job). */
export const ultCooldown = (job: JobDef, st: Stats) => {
  const cdCut = Math.round((PLAYER.smashCd - st.smashCd) / BATTLE.msPerTurn)
  return Math.max(2, job.ult.cd + st.mgUltCd + st.thUltCdAdd + st.swUltCdAdd - cdCut)
}
export const s2Cooldown = (k: Skill2Def, _st: Stats) => Math.max(1, k.cd)
/** Light spear multiplier x M.ATK (Skill 2 หอกคม adds on top at run start). */
export const spearMul = (st: Stats, s2?: Skill2Def) => KIT.spearBase + st.spearMul + (s2?.id === 'cl_spear' ? S2N.spearPlus(st.s2Lv) : 0)
/** v58 Priest: ult smash multiplier x P.ATK (before ultAmp / pskill), Holy Light count, basic smash x P.ATK. */
export const clericUltSmash = (st: Stats) => CLERIC_KIT.ultAtk + st.clUltAtk // v108: v58 again, 150% + root 15%/Lv (Lv5 225%)
/** v92 🌄 แสงรุ่งอรุณ: flat bonus magic damage per Ult smash target = (STR + WIS + matk x M.ATK) x node share (v102: แสงแตก no longer amps it). */
export const dawnBonus = (st: Stats, str: number, wis: number) =>
  st.clDawn > 0 ? (str + wis + KIT.clericTree.dawn.matk * st.matk) * st.clDawn : 0
/** v102 ☀️ แสงแตก: WIS the buff gives = share x the per-target bonus (x ult hitPow). The bonus is taken WITHOUT the buff's own WIS (no snowball). */
export const dawnWisGain = (st: Stats, bonus: number) => (st.clDawnWis > 0 ? Math.round(bonus * st.clDawnWis) : 0)
/** v109 Grand Cross pulses at this Ult วิวัฒน์ Lv. */
/** ===== 3rd job Paladin (design/awakening-crusader-v1.md §4) — every Awakening number lives here (rule v57) ===== */
export const KIT3 = {
  paladin: {
    capAdd: 0.1, blockAmp: 0.25, blockFaith: 1, // ⚜️ Prestige: Auto Guard cap 40% -> 50% · block shield / heal x1.25 · a block = Faith +1
    gospelPulse: 1, gospelAt: 3, gospelFaith: 1, // ✨ Gospel Cross: +1 pulse · a pulse that hits >= 3 monsters = Faith +1
    varA: { hits: 3, atk: 0.7, def: 0.4, noShield: 0.7, per: 0.02, cap: 0.2, branch: 'cr_s' }, // 🔗 Shield Chain: 3 hits bouncing · +2% per โล่ point
    varB: { atk: 1.6, hp: 0.04, blindAdd: 1, per: 0.02, cap: 0.2, branch: 'cr_d' }, // ⚖️ Pressure: 1 hit, no DEF · +2% per อุทิศ point
    leg: { crossCap: 0.15, guardCap: 0.06, hpCap: 0.09, cross: 'cr_c', guard: 'cr_s', hp: 'cr_d' }, heirNeed: 6, // legacy: caps + the Crusader branch each node reads
    gospelHealMax: 5,
  },
  // 🐉 Lord Knight (Knight Awakening, design/awakening-lordknight-v1.md)
  lordknight: {
    hpDmgAdd: 0.015, hpPct: 0.05, // 🐉 Aura Blade: spear skills + max HP share (on top of ถึกเป็นแรง) · HP +5%
    extraHits: 2, // ✨ Hundred Spear: Pierce +2 hits (the root + ทวนดูดเลือด act on these)
    varA: { mul: 0.8, hp: 0.03, burn: 2, burnAtk: 0.3, per: 0.02, cap: 0.2, branch: 'kn_r' }, // 🐉 Dragon Breath: fire on all · +2% per กวาดทวน point
    varB: { mul: 2.2, hp: 0.03, pierce: 0.5, per: 0.02, cap: 0.2, branch: 'kn_p' }, // 💥 Joint Beat: one heavy hit, DEF -50% · +2% per หอกทะลวง point
    leg: { crossCap: 0.15, guardCap: 0.06, hpCap: 0.09, cross: 'kn_p', guard: 'kn_g', hp: 'kn_c' }, heirNeed: 6,
  },
  // 🥊 Champion (Monk Awakening)
  champion: {
    chargeMaxAdd: 2, comboManaBonus: 0.25, gritMdefBonus: 0.1, // 🧘 Ki Translation signature
    extraHits: 1, // ✨ Supreme Asura / Tempest Bell shockwave pulse
    earthDrivePer: 0.8, // 🌋 Champion Earth Drive DEF ratio per level (scaled up for Monk light armor vs Paladin)
    varA: { mul: 2.2, hp: 0.03, stunTurns: 1, per: 0.02, cap: 0.2, branch: 'mk_c' }, // 🐅 Tiger Knuckle: single heavy strike (boss first) + stun · +2% per คอมโบ point
    varB: { mul: 1.0, mdefHp: 0.04, per: 0.02, cap: 0.2, branch: 'mk_h' }, // 💥 Chain Crush: AoE true wave · +2% per หมัดแค้น point
    leg: { crossCap: 0.15, guardCap: 0.06, hpCap: 0.09, cross: 'mk_c', guard: 'mk_h', hp: 'mk_a' }, heirNeed: 6,
  },
  // 🪶 Ranger (Beastmaster Awakening, design/awakening-beastmaster-v1.md)
  ranger: {
    petPowAdd: 0.15, critAdd: 0.04, fleeAdd: 12, hawkCapAdd: 0.10, // 🎭 Camouflage signature
    ultVolleys: 1, ultHawkMul: 0.90, ultHawkTargets: 2, ultBoarMul: 1.10, ultWolfMul: 1.35, ultWolfBleed: 2, // ✨ Primal Stampede
    varA: { arrowMul: 0.85, blindTurns: 2, per: 0.02, cap: 0.20, branch: 'bm_h' as const }, // 🌩️ Arrow Storm
    varB: { boltMul: 1.50, pierce: 0.50, wargMul: 1.10, bleedAdd: 3, boarPush: 20, per: 0.02, cap: 0.20, branch: 'bm_w' as const }, // 🎯 Aimed Warg
    leg: { crossCap: 0.15, guardCap: 0.06, hpCap: 0.09, cross: 'bm_k' as const, guard: 'bm_b' as const, hp: 'bm_s' as const },
    heirNeed: 6, gospelHealMax: 3,
  },
  // 🪓 Warlord (Berserker Awakening: Tryndamere + Warlord + PoE Berserker)
  warlord: {
    frenzyMaxAdd: 2, rageCritPer: 0.0025, rageCritDmgPer: 0.0025, carnageDmg: 0.15, carnageTaken: 0.1, // 🪓 Undying Warlord signature
    ultRageGain: 30, ultUndyingTurns: 3, ultBloodHealBase: 0.15, ultBloodHealPerRage: 0.0025, ultFuryCritRage: 5, ultFuryCritHeal: 0.02, // 🩸🔥 Undying Bloodlust
    varA: { hits: 2, mul: 1.9, critAdd: 0.3, execMax: 0.6, splashShare: 0.5, per: 0.02, cap: 0.2, branch: 'bz_c' as const }, // ⚔️ Spinning Guillotine
    varB: { mul: 1.6, weakPct: 0.25, weakTurns: 2, breakTurns: 2, push: 15, rage: 25, shield: 0.12, heirPush: 25, per: 0.02, cap: 0.2, branch: 'bz_r' as const }, // 📣 Warlord's Warcry
    leg: { crossCap: 0.15, guardCap: 0.06, hpCap: 0.09, cross: 'bz_c' as const, guard: 'bz_d' as const, hp: 'bz_r' as const },
    heirNeed: 6, warcryRage: 15,
  },
  // 🎓 Professor (Sage Awakening, design/awakening-professor-v1.md): no raw-stat nodes, every number is a mechanic on the Sage kit
  professor: {
    offMulJ3: 0.85, // 🎓 off-element perk benefit (Sage KIT2.sage.perk.offMul 0.65)
    markTurns: 2, // 🏷️ element mark lasts this many monster turns
    dcAt: 0.7, dcCost: 6, dcMul: 0.5, // 🔁 Double Casting: Mana share needed · Mana per echo · echo power share
    vapMul: 2.0, vapFrozen: 1.5, // ♨️ Vaporize 🔥+❄️: one target x Pm · x this more on a frozen target (shatters the freeze)
    ovlMul: 0.9, ovlBreak: 1, // 💥 Overload 🔥+⚡: every monster x Pm + armor break turns
    supMul: 1.0, supShred: 0.25, supTurns: 2, supPush: 15, // 🧲 Superconduct ⚡+❄️: x Pm + DEF/M.DEF shred (sunder) + boss gauge push
    burstAtk: 2.2, burstPerMana: 0.04, // 💎 Soul Burst: P.ATK smash + (this x Mana burnt) x Pm
    varA: { hits: 3, per: 0.02, cap: 0.2, branch: 'sg_a' as const }, // 👊 Spell Fist: the next N basic swings rotate 🔥→⚡→❄️
    varB: { turns: 3, per: 0.02, cap: 0.2, branch: 'byEndow' as const }, // 🌋 Elemental Field: N hero turns, marks every monster each turn start · branch = the Endow element's perk branch (battle)
    fieldBranch: { fire: 'sg_f', lightning: 'sg_l', ice: 'sg_i' } as const,
    leg: { crossCap: 0, guardCap: 0, hpCap: 0, cross: 'sg_f' as const, guard: 'sg_l' as const, hp: 'sg_i' as const }, // ⚔️ ตำนาน here is mechanics, not raw stats: caps 0 keep the shared loop inert
    legFireStep: 3, legLightStep: 4, legIceStep: 3, // ⚔️ legacy: +1 burn / +1 chain / +1 Permafrost per this many points in sg_f / sg_l / sg_i
    heirNeed: 6, convergeMul: 1.2, convergeAmp: 0.3, // 👑 สืบสาน · 🔺 Convergence: all monsters x Pm + reactions x(1 + amp) for the rest of the wave
    foresightKeep: 0.3, foresightAt: 0.9, // 🔮 Foresight: Soul Burst keeps this Mana share · cast at >= this share = Ult CD -1
    soulChangePer: 0.5, // 💧 Soul Change: Mana past max -> ward of overflow x KIT2.sage.rodVitShield x this x Lv
    chainSpread: 1, // 💥 ลูกโซ่ธาตุ: a monster killed by a reaction hands its mark to this many neighbours
  },
  // ----- the last four Awakenings (docs/design/awakening-last-four-v1.md, Q 2026-11-19) -----
  // 🥷 Stalker (Rogue Awakening): more Marks to play with, a second knife volley aimed by the Marks
  stalker: {
    markMaxAdd: 2, markTurnsAdd: 1, fullMarkRes: 3, // 🥷 Preserve: Mark cap +2 · Marks last +1 monster turn · a knife on a full-Mark monster = Energy
    phantomKnives: 3, phantomMul: 1.2, // ✨ Phantom Storm: after the storm, N aimed knives (most Marks first) x this share of a storm knife · root u3Pow multiplies them
    varA: { mul: 1.0, marks: 1, heirMarks: 2, per: 0.02, cap: 0.2, branch: 'rg_k' as const }, // 🌀 Fan of Knives: sure-crit slash on every monster + Marks · +2% per มีด point
    varB: { mul: 2.6, pierce: 0.5, heirCdCut: 1, per: 0.02, cap: 0.2, branch: 'rg_x' as const }, // 🎯 Assassinate: boss first, DEF -50%, a kill resets the cooldown · +2% per คริ point
    leg: { crossCap: 0.15, guardCap: 12, hpCap: 0.09, cross: 'rg_k' as const, guard: 'rg_c' as const, hp: 'rg_x' as const }, // legacy guard = FLEE here (flat points)
    heirNeed: 6, gospelHealMax: 5, ambushKnifeMul: 1, // opener knives use the normal flying knife x this
    // 🧤 sk_d ปลดเปลือย (Strip P2, Q 2026-11-21): the Rogue strip line pays off on the 3rd job
    divest: { preyPer: 0.03, preyCap: 4, // 🎯 เหยื่อเปลือย: + hit damage per strip kind on the target (🔓 🧤 😰 👁️ 🦴), counted up to cap
      plagPer: 0.08, plagTurns: 2, // 🎭 ลอกท่า: ⛓️ break a cast / ✋ snatch a buff -> hero damage + per Lv for N hero turns
      resPer: 0.25, // 🪝 ถอดซ้ำ: boss repeat-strip penalty x(resMul + per x Lv), up to x1
      fullWeak: 0.2, fullDisarm: 0.3, fullExposed: 0.15, fullTurns: 2 }, // 🌪️ ★ ปลดเปลือยหมดตัว: Phantom Storm strips every monster, 1/wave (x boss potency)
  },
  // 🎩 Kingpin (Mobster Awakening): debts pay interest (damage), the ult collects twice
  kingpin: {
    debtAmp: 0.025, debtCap: 6, execRes: 10, // 🎩 Loan Shark: + hit damage per debt on the target (counted up to cap) · an Execute = Energy
    takeMul: 0.5, takePerDebt: 0.1, // ✨ Hostile Takeover: after ทวงหนี้, slash every survivor again x(1 + per debt), then Execute check · root u3Pow multiplies it
    varA: { mul: 0.8, per: 0.02, cap: 0.2, branch: 'mb_d' as const, heirWeak: 0.2, heirWeakTurns: 2 }, // 💰 Shakedown: every monster + armor break + chill · +2% per ดีบัฟ point
    varB: { mul: 2.0, poison: 3, weak: 0.2, weakTurns: 2, per: 0.02, cap: 0.2, branch: 'mb_p' as const }, // 📜 Hit Contract: boss first, heavy + poison + weaken · +2% per พิษ point
    leg: { crossCap: 0.15, guardCap: 0.03, hpCap: 0.09, cross: 'mb_p' as const, guard: 'mb_e' as const, hp: 'mb_d' as const }, // legacy guard = Execute line here
    heirNeed: 6, gospelHealMax: 5, openerChill: 1, // opener: poison stacks (node) + chill turns
  },
  // 🌌 High Wizard (Wizard Awakening): a released big spell leaves Amplify, the ult drags a gravity field behind it
  highwizard: {
    amp: 0.12, ampTurns: 2, castTakenMul: 0.5, // 🌌 Mystical Amplification: after Storm Gust / the Ult lands, magic damage + for N hero turns · charge-turn damage penalty x this
    gravMul: 0.7, gravPierce: 0.3, gravPush: 10, // ✨ Gravitation Field: after the Ult, every monster x Pm through part of M.DEF + boss gauge push · root u3Pow multiplies it
    varA: { hits: 1, heirHits: 1, vsChill: 0.25, per: 0.02, cap: 0.2, branch: 'wz_i' as const }, // ❄️ Frost Nova: Storm Gust +hits · + damage on chilled / frozen monsters · +2% per พายุหิมะ point
    varB: { hits: 6, mul: 0.7, push: 6, per: 0.02, cap: 0.2, branch: 'wz_l' as const }, // ⚡ Jupitel Thunder: one target (boss first), N bolts, gauge push per bolt · +2% per สายฟ้าเทพ point
    leg: { crossCap: 0.15, guardCap: 0.06, hpCap: 0.09, cross: 'byBest' as const, guard: 'byBest' as const, hp: 'byBest' as const }, // legacy reads the Wizard element branch with the most points · guard = M.DEF here
    bestOf: ['wz_m', 'wz_l', 'wz_i'] as const,
    heirNeed: 6,
  },
  // 🤖 Mechanic (Innovator Awakening): more traps, Overclock tempo, a missile salvo behind the ult
  mechanic: {
    trapsAdd: 1, deviceMul: 0.15, overTurns: 2, overAspd: 0.15, // 🤖 Overclock: +1 wave-start trap · traps / turret + power · a box cast = hero speed + for N hero turns
    missiles: 4, missileMul: 0.9, missileVsSoaked: 0.25, // ✨ Arm Cannon: after the ult, N missiles at random monsters (wet / chilled targets take more) · root u3Pow multiplies them
    varA: { rockets: 3, heirRockets: 2, mul: 0.8, per: 0.02, cap: 0.2, branch: 'in_g' as const }, // 🚀 Rocket Barrage: the box + N rockets · +2% per ประดิษฐ์ point
    varB: { turrets: 1, heirTurrets: 1, shield: 0.1, per: 0.02, cap: 0.2, branch: 'in_r' as const }, // 🏰 Fortress Mode: the box + a turret + shield x max HP · +2% per ป้อมปืน point
    leg: { crossCap: 0.15, guardCap: 0.3, hpCap: 0.09, cross: 'in_g' as const, guard: 'in_t' as const, hp: 'in_r' as const }, // legacy guard = trap power here
    heirNeed: 6, gospelHealMax: 6,
  },
  /** shared by every 3rd job */
  common: { afterTurns: 2, bandingMax: 5, inspireAt: 0.3, inspireTurns: 3, inspireHeal: 0.03, inspireGuard: 0.5 },
}
export const gcPulses = (st: Stats) => KIT2.crusader.gcPulses[Math.max(0, Math.min(KIT2.crusader.gcPulses.length - 1, Math.round(st.j2GcLv)))]
  + (st.j3On > 0 ? KIT3.paladin.gospelPulse + st.j3GospelField : 0) // ⚜️ Paladin Gospel Cross
/** 🔔 Monk กังวานเหล็ก: Tempest Bell & Asura M.DEF bonus multiplier. */
export const bellMdefMul = (st: Stats) => 1 + st.mdef * st.j2BellMdef
/** 🥊 Monk หมัดแค้น / หมัดพิพากษา calculations (rawShield avoids double shieldAmp inside BattleScene.addShield). */
export function haymakerCalc(st: Stats, grit: number) {
  const O = KIT2.monk, star = st.j2HaymakerStar > 0
  const cap = Math.round(st.maxHp * (star ? O.haymakerStarCap : O.haymakerCap))
  const triggerAt = Math.round(st.maxHp * (star ? O.haymakerStarAt : O.haymakerAt))
  const rawShield = Math.round(grit * (star ? O.haymakerStarShield : O.haymakerShield))
  const shield = Math.round(rawShield * (1 + st.shieldAmp))
  const centerTrueDmg = Math.max(1, Math.round(
    grit * (star ? O.haymakerStarGritMul : O.haymakerGritMul)
    + st.mdef * st.maxHp * (star ? O.haymakerStarMdefHp : O.haymakerMdefHp),
  ))
  const splashTrueDmg = star ? Math.max(1, Math.round(centerTrueDmg * O.haymakerSplash)) : 0
  return { cap, triggerAt, rawShield, shield, centerTrueDmg, splashTrueDmg, star }
}
/** 💥 Monk Asura Strike burst damage (Sure-Hit, ignores 100% DEF/M.DEF). */
export function asuraDamage(st: Stats, charges: number, burntMana: number, hitPow2 = 1) {
  const O = KIT2.monk
  const atkPart = st.atk * (O.asuraAtk + O.asuraPerCharge * charges) * (1 + st.pskill)
  const manaPart = O.asuraMana * burntMana
  const mdefHpPart = st.mdef * st.maxHp * (O.asuraMdefHp + st.j2AsuraMdef) * bellMdefMul(st)
  return Math.max(1, Math.round((atkPart + manaPart + mdefHpPart) * hitPow2 * (1 + st.j2AsuraPow)))
}
/** v108 🌄 รุ่งอรุณ passive detail rows (every Nth basic / combo hit). */
export function dawnInfo(st: Stats, base: { str: number; wis: number }): InfoRow[] {
  if (st.clDawn <= 0) return []
  const D = KIT.clericTree.dawn, bonus = dawnBonus(st, base.str, base.wis)
  const out: InfoRow[] = [
    { label: 'ทำงานเมื่อ', value: `ตีธรรมดา / คอมโบ ครบ ${D.every} ฮิต (ฮิตที่ ${D.every})` },
    { label: `🌄 ดาเมจเวทใส่ตัวที่ตี${st.clDawnUlt > 0 ? ' · คริแน่' : ''}`, value: `+${r(bonus)}` },
  ]
  if (st.clDawnHeal > 0) out.push({ label: '💛 ฮีลตัวเอง', value: `${pct(st.clDawnHeal)} ของดาเมจ (มอนธรรมดา x${D.weak})` })
  if (st.clDawnWis > 0) out.push({ label: `☀️ แสงแตก: WIS ${st.clDawnWisTurns} เทิร์น`, value: `+${dawnWisGain(st, bonus)} WIS (${pct(st.clDawnWis)} ของ ${r(bonus)})` })
  return out
}
/** The same bonus as a magic-hit multiplier (strike() scales mul by magic power). */
export const dawnMul = (st: Stats, str: number, wis: number) => dawnBonus(st, str, wis) / Math.max(1, magicPower(st))
export const clericUltLights = (st: Stats) => CLERIC_KIT.ultLights + st.clUltLights
export const clericBasic = () => CLERIC_KIT.basic
export const manaPerTurn = (st: Stats, mul: number) => st.resRegen * mul * (1 - st.resRegenCut)

// ---------- detail rows for the skill screen ----------
export interface InfoRow { label: string; value: string }
const r = Math.round
const pct = (n: number) => `${r(n * 100)}%`
const range = (lo: number, hi: number) => (r(lo) === r(hi) ? `${r(hi)}` : `${r(lo)}–${r(hi)}`)
export const SAGE_S1 = { name: 'ศาสตราวุธธาตุ', icon: '📖' } as const
export type SagePerkElement = 'fire' | 'lightning' | 'ice'
/** 🎓 off-element perk share: Sage 65%, Professor (Double Casting) 85%. */
export const profOffMul = (st?: Pick<Stats, 'j3Pf'>) => (st && st.j3Pf > 0 ? KIT3.professor.offMulJ3 : KIT2.sage.perk.offMul)
/** Main run element gets 100% benefit; off-element perks get profOffMul (Sage 65% / Professor 85%). */
export const sageElementBenefit = (perkEl: SagePerkElement, runEl?: string | null, st?: Pick<Stats, 'j3Pf'>) =>
  perkEl === runEl ? 1 : profOffMul(st)

// ----- 🎓 Professor: element marks + reactions (pure, BattleScene calls these) -----
export type ProfReaction = 'vaporize' | 'overload' | 'superconduct'
const PROF_ELS: readonly string[] = ['fire', 'lightning', 'ice']
/** The reaction a hit of element `el` sets off on a monster carrying `mark` (same element / arcane / no mark = none). */
export function reactionOf(mark: string | null | undefined, el: string | null | undefined): ProfReaction | null {
  if (!mark || !el || mark === el || !PROF_ELS.includes(mark) || !PROF_ELS.includes(el)) return null
  const pair = new Set([mark, el])
  if (pair.has('fire') && pair.has('ice')) return 'vaporize'
  if (pair.has('fire') && pair.has('lightning')) return 'overload'
  return 'superconduct'
}
/** Reaction power x Pm (before the Convergence amp / Endow amp, which BattleScene applies). */
export function reactionMul(kind: ProfReaction, frozen = false) {
  const P = KIT3.professor
  if (kind === 'vaporize') return P.vapMul * (frozen ? P.vapFrozen : 1)
  return kind === 'overload' ? P.ovlMul : P.supMul
}
/** 🔁 Double Casting threshold (pf_p3 lowers it). */
export const doubleCastAt = (st: Pick<Stats, 'j3PfDcAt'>) => Math.max(0, KIT3.professor.dcAt - st.j3PfDcAt)
/** 🔁 Can this reaction echo? Professor only, Mana share >= threshold and enough Mana to pay. */
export const doubleCastReady = (st: Pick<Stats, 'j3Pf' | 'j3PfDcAt'>, mana: number, maxMana: number) =>
  st.j3Pf > 0 && maxMana > 0 && mana >= KIT3.professor.dcCost && mana / maxMana >= doubleCastAt(st)
/** 🔁 Echo power share (pf_p3 adds). */
export const doubleCastMul = (st: Pick<Stats, 'j3PfDcMul'>) => KIT3.professor.dcMul + st.j3PfDcMul
/** 💎 Soul Burst: Mana burnt (Foresight keeps a share) and the two smash multipliers (P.ATK hit · magic hit add-on x Pm). */
export function soulBurst(st: Pick<Stats, 'j3PfForesight'>, mana: number, maxMana: number) {
  const P = KIT3.professor, keep = st.j3PfForesight > 0 ? Math.min(Math.round(mana), Math.round(maxMana * P.foresightKeep)) : 0
  const burnt = Math.max(0, Math.round(mana) - keep)
  return { burnt, left: Math.round(mana) - burnt, atkMul: P.burstAtk, pmMul: P.burstPerMana * burnt }
}
/** 🔮 Foresight: Soul Burst cast with this much Mana (before paying the Ult) takes 1 turn off the Ult cooldown. */
export const foresightCdCut = (st: Pick<Stats, 'j3PfForesight'>, manaBefore: number, maxMana: number) =>
  st.j3PfForesight > 0 && maxMana > 0 && manaBefore / maxMana >= KIT3.professor.foresightAt ? 1 : 0
/** ⚔️ Professor legacy: extra burn / chain / Permafrost a reaction with that element adds (node Lv caps it, Sage web points feed it). */
export function profLegacy(st: Pick<Stats, 'j3PfLegFire' | 'j3PfLegLight' | 'j3PfLegIce'>, pts: { f: number; l: number; i: number }) {
  const P = KIT3.professor
  return {
    burn: Math.min(st.j3PfLegFire, Math.floor(pts.f / P.legFireStep)),
    chain: Math.min(st.j3PfLegLight, Math.floor(pts.l / P.legLightStep)),
    ice: Math.min(st.j3PfLegIce, Math.floor(pts.i / P.legIceStep)),
  }
}
/** 💧 Soul Change ward from Mana that would spill past max. */
export const soulChangeShield = (st: Pick<Stats, 'j3PfSoulChange'>, overflow: number) =>
  st.j3PfSoulChange > 0 && overflow > 0 ? Math.round(overflow * KIT2.sage.rodVitShield * KIT3.professor.soulChangePer * st.j3PfSoulChange) : 0
export const sageAutoChance = (st: Stats, int: number, endowed = false) => {
  const S = KIT2.sage
  return Math.min(1, Math.min(S.autoCap, S.autoChance + S.autoInt * Math.max(0, int)) + st.j2AutoChance + (endowed ? S.endowPerkChance : 0))
}
export const sageFireChance = (st: Stats, int: number, runEl?: string | null, endowed = false) => {
  if (st.j2FirePerk <= 0) return 0
  const P = KIT2.sage.perk
  const raw = Math.min(P.fireCap, P.fireChance + P.firePerLv * (st.j2FirePerk - 1) + P.fireInt * Math.max(0, int) + (endowed ? KIT2.sage.endowPerkChance : 0))
  return raw * sageElementBenefit('fire', runEl, st)
}
export const sageLightChance = (st: Stats, int: number, runEl?: string | null, endowed = false) => {
  if (st.j2LightPerk <= 0) return 0
  const P = KIT2.sage.perk
  const raw = Math.min(P.lightCap, P.lightChance + P.lightPerLv * (st.j2LightPerk - 1) + P.lightInt * Math.max(0, int) + (endowed ? KIT2.sage.endowPerkChance : 0))
  return raw * sageElementBenefit('lightning', runEl, st)
}
export const sageIceChance = (st: Stats, runEl?: string | null, endowed = false) => {
  if (st.j2IcePerk <= 0) return 0
  const P = KIT2.sage.perk
  const raw = Math.min(1, P.iceChance + P.icePerLv * (st.j2IcePerk - 1) + (endowed ? KIT2.sage.endowPerkChance : 0))
  return raw * sageElementBenefit('ice', runEl, st)
}
export const sageRodGain = (st: Stats, vit: number) => {
  const S = KIT2.sage
  const mana = st.j2MagicRod > 0 ? st.j2MagicRod + Math.floor(Math.max(0, vit) * S.rodVitMana) : 0
  const shield = st.j2MagicRod > 0 ? Math.round(Math.max(0, vit) * S.rodVitShield) : 0
  return { mana, shield }
}

/** Damage of one hit at `mul`, before monster DEF: "lo–hi (คริ X)". Uses CRIT_RULES split when `skill` is true. */
export function hitText(st: Stats, mul: number, magic: boolean, skill = false) {
  const b = hitBase(st, magic)
  const c = skill ? (st.skillCrit <= 0 ? 0 : Math.min(CRIT_RULES.cap.skillCrit, st.skillCrit + (magic ? st.spellCrit : st.crit * CRIT_RULES.skillFromCrit))) : (magic ? st.spellCrit : st.crit) // Q 2026-11-19: any skill crit (physical or magic) needs skillCrit
  return `${range(b.lo * mul, b.hi * mul)}${c > 0 ? ` (คริ ${r(b.hi * mul * st.critMul)})` : ''}`
}
const heal = (st: Stats, n: number) => r(n * (1 + st.healAmp))
const shield = (st: Stats, n: number) => r(n * (1 + st.shieldAmp))
const resName = (job: JobDef) => (job.resource === 'energy' ? 'Energy' : job.resource === 'rage' ? 'Rage' : 'Mana')

/** ทักษะ 1 (the auto skill) with these stats. */
export function autoInfo(jobId: JobId, st: Stats, job2?: string, base?: { str: number; baseLv: number }): InfoRow[] {
  const job = JOBS[jobId], pow = 1 + st.s1Pow
  if (jobId === 'mage' && job2 === 'sage') {
    const S = KIT2.sage, sgJob = { ...job, auto: { ...job.auto, cost: S.s1Cost } }
    const rows: InfoRow[] = [
      { label: 'รูปแบบ (ติดตัว)', value: `ตีปกติใช้ Mana ${autoCost(sgJob, st)} อัตโนมัติ (ไม่แย่งเทิร์นตี)` },
      { label: `เสริมแรงตีประชิด (+${pct(S.s1InfuseBonus * pow)})`, value: hitText(st, (S.basicMul + S.s1InfuseBonus * pow) * (1 + st.pskill), false) },
      { label: 'การันตี Auto Spell (ร่ายฟรี)', value: `${hitText(st, (S.autoMul + st.j2AutoMul) * pow * (st.mgOverflow > 0 ? st.mgOverflow : 1), true)} ×${1 + st.j2AutoBolts}` },
    ]
    if (st.j2FirePerk > 0) rows.push({ label: '🔥 On-Hit: Fire Bolt ×hit', value: `สูงสุด ${S.perk.fireMaxBolts} ลูก (ธาตุหลัก 100% / อื่น ${pct(profOffMul(st))})` })
    if (st.j2LightPerk > 0) rows.push({ label: '⚡ On-Hit: Chain Lightning', value: `ชิ่ง ${S.perk.lightTargetsBase + (st.j2LightPerk >= 3 ? 1 : 0)} เป้า (ธาตุหลัก 100% / อื่น ${pct(profOffMul(st))})` })
    if (st.j2IcePerk > 0) rows.push({ label: '❄️ On-Hit: Permafrost', value: `ครบ ${S.perk.iceMax} ขั้น แตก+แช่แข็ง (ธาตุหลัก 100% / อื่น ${pct(profOffMul(st))})` })
    return rows
  }
  const out: InfoRow[] = [{ label: 'ใช้', value: `${resName(job)} ${autoCost(job, st)}` }]
  switch (jobId) {
    case 'swordsman': { // ⚔️ ดาบสยบมนตร์: short values, labels stay the same at every Lv (the detail panel diffs rows by label)
      const lv = swordS1Lv(st), i = lv - 1
      if (base) {
        const b = hitBase(st, false), avg = Math.max(1, (b.lo + b.hi) / 2)
        const m = (swordS1Raw(lv, avg, base.str, base.baseLv) / avg) * (1 + st.pskill)
        out.push({ label: 'ดาเมจ (เป้าเดี่ยว)', value: range(b.lo * m, b.hi * m) }) // no crit text: the column is narrow
      }
      out.push({ label: 'สูตร: P.ATK', value: `${Math.round(SWORD_S1.atkPct[i] * 100)}%` })
      out.push({ label: 'สูตร: + STR', value: `x${SWORD_S1.str[i]}` })
      out.push({ label: 'สูตร: + Base Lv', value: `${SWORD_S1.base[i]} x Lv` })
      out.push({ label: 'คูลดาวน์', value: `${Math.max(2, SWORD_S1.cd - Math.max(0, Math.round(st.swS1CdCut)))} เทิร์น` })
      out.push({ label: 'เป้า', value: 'ร่าย > บอส > หน้า' })
      out.push({ label: 'ใบ้ + ขัดร่าย', value: `${SWORD_S1.silenceTurns + (st.swS1Star > 0 ? 1 : 0)} เทิร์น` })
      out.push({ label: 'ล้าง CC ตัวเรา', value: 'ใบ้ · ใย · ช้า' })
      if (st.swS1Shield > 0) out.push({ label: '🛡️ โล่เมื่อกด', value: `${shield(st, st.maxHp * st.swS1Shield)}` })
      if (st.swS1Splash > 0) out.push({ label: '🌀 เฉือนตัวอื่น', value: `${pct(st.swS1Splash)} ของฮิต` })
      if (st.swS1Star > 0) out.push({ label: '⚔️ ฟันซ้ำ', value: `${pct(KIT.swordS1Tree.starHit)} ของฮิต` })
      if (st.swCcGuard > 0) out.push({ label: '🧘 กัน CC หลังล้าง', value: `${KIT.swordS1Tree.guardTurns} เทิร์น` })
      if (st.swMuteWeak > 0) out.push({ label: '🤐 มอนติดใบ้ตีเบาลง', value: `−${pct(st.swMuteWeak)}` })
      if (st.swS1Ctr > 0) out.push({ label: '🔁 สวนแน่นอน', value: `${st.swS1Ctr} ครั้ง` })
      if (st.swVsMute > 0) out.push({ label: '🎯 ตีตัวร่าย/ติดใบ้', value: `+${pct(st.swVsMute)}` })
      if (st.swS1Refund > 0) out.push({ label: '⏳ ขัดร่ายได้: Mana', value: `+${Math.round(st.swS1Refund)} · CD −1` })
      break
    }
    case 'archer':
      if (st.arAim > 0) out.push({ label: `ศรเล็ง 2 ดอก (คริ +${pct(st.arAimCrit)})`, value: hitText(st, st.arAim * pow, false) })
      else out.push({ label: `${st.arVolley > 0 ? KIT.archerVolleyShots : KIT.archerAutoShots} ดอก ดาเมจ/ดอก`, value: hitText(st, (st.arVolley > 0 ? st.arVolley : KIT.archerAuto) * pow, false) })
      break
    case 'mage':
      out.push({ label: 'ร่าย', value: 'ทันที (ไม่มีร่ายแตก) · เฉพาะ ult ที่ต้องร่าย' })
      out.push({ label: `ไฟ/ตัว (ทุกตัว · M.ATK ${Math.round(MAGE_AUTO_MIX.matk * 100)}% : P.ATK ${Math.round(MAGE_AUTO_MIX.atk * 100)}%)`, value: hitText(st, mageAutoMul(st, MAGE_CAST.fireMul * pow), true) })
      if (st.mgOverflow > 0) out.push({ label: 'ตอน Mana ≥ 90% (พลังล้น)', value: hitText(st, mageAutoMul(st, MAGE_CAST.fireMul * pow * st.mgOverflow), true) })
      break
    case 'cleric':
      out.push({ label: '🔨 ทุบประชิด (P.ATK)', value: hitText(st, clericBasic(), false) })
      out.push({ label: `💖 ฮีล (ตอน HP < ${pct(KIT.clericHealBelow - st.healAt)})`, value: `${heal(st, st.matk * CLERIC_KIT.heal * pow)} HP` })
      out.push({ label: `🔱 หอกแสงใส่ ${KIT.clericSmiteTargets + st.smiteTargets} ตัวหน้า (ตอนไม่ฮีล) /ตัว`, value: hitText(st, CLERIC_KIT.smite * pow * (1 + st.smiteMul), true) })
      out.push({ label: '　↳ ตัวข้างๆ โดน 50%', value: hitText(st, CLERIC_KIT.smite * pow * (1 + st.smiteMul) * KIT.spearSplash, true) })
      if (st.clFaith > 0) out.push({ label: `🙏 ฮีลตอนศรัทธาเต็ม ${KIT.clericTree.faithMax}`, value: `${heal(st, st.matk * CLERIC_KIT.heal * pow * (1 + KIT.clericTree.faithHealAmp * KIT.clericTree.faithMax))} HP` })
      if (st.clFaith > 0) out.push({ label: `🙏 ระเบิดศรัทธา (ครบ ${KIT.clericTree.faithMax}) ใส่ทุกตัว`, value: hitText(st, st.clFaith * pow, true) })
      if (st.judge > 0) out.push({ label: `พิพากษา (ทุก ${KIT.clericJudgeEvery} ครั้ง)`, value: hitText(st, KIT.clericJudge * pow * (1 + st.smiteMul), true) })
      break
    case 'thief':
      out.push({ label: 'แทง 1 ที', value: hitText(st, KIT.thiefAuto * pow * (1 + st.pskill), false) })
      if (st.thS1Matk > 0) out.push({ label: 'เวทเสริม (แทงฉาบอาคม)', value: hitText(st, st.thS1Matk * matkToPmRatio(st), true) })
      out.push({ label: 'พิษ', value: `+${KIT.thiefAutoPoison} stack (${thiefPoisonPerStack(st).toFixed(1)}/stack/เทิร์น)` })
      out.push({ label: 'สลับคม', value: 'หลังแทงพิษ ตีปกติ 1 เทิร์นก่อน (ร่างเงา: แทงรัวได้)' })
      break
    default: return []
  }
  return out
}

/** Ult with these stats. */
export function ultInfo(jobId: JobId, st: Stats, base?: { str: number; wis: number }, job2?: string): InfoRow[] {
  const job = JOBS[jobId], pow = 1 + st.ultPow, hitPow = pow * (1 + st.ultAmp)
  const out: InfoRow[] = [{ label: 'คูลดาวน์', value: `${ultCooldown(job, st)} เทิร์น${ultCost(job, st, job2) ? ` · Mana ${ultCost(job, st, job2)}` : ''}` }]
  switch (jobId) {
    case 'swordsman':
      if (swordAwakenUlt(job2)) { // job1 ดาบพิพากษา + Knight 🔱 Pierce of Judgement (Q 2026-11-23)
        const kn = job2 === 'knight', K = KIT2.knight, aw = kn ? '⚔️ ปลุกหอก' : '⚔️ ปลุกดาบ'
        out.push({ label: aw, value: `${SWORD_MANA.awakenTurns} เทิร์น` })
        const uLv = swordUltLv(st), strAdd = SWORD_MANA.awakenStr[uLv - 1]
        out.push({ label: '⚔️ ระหว่างปลุก: STR', value: `+${strAdd}` })
        if (st.swAwAtk > 0) out.push({ label: '⚔️ ระหว่างปลุก: P.ATK', value: `+${pct(st.swAwAtk)}` })
        out.push({ label: '✨ ต่อฮิต: HP ที่เหลือเป้า', value: base ? pct(swordCoatPct(uLv, base.str + strAdd)) : `${pct(SWORD_MANA.awakenHpPct)}+` })
        out.push({ label: '✨ บอส/มินิ ได้', value: `×${SWORD_MANA.awakenBigShare}` })
        out.push({ label: '⚔️ ตีปกติฟันตัวถัดไป', value: `${Math.round((SWORD_MANA.cleaveShare + st.swAwCleave) * 100)}%` })
        if (kn) {
          const h2 = hitPow * (1 + st.ult2Pow), hits = K.pierceHits + st.j2PierceHits, bigHits = K.pierceBigHits + st.j2PierceHits
          out.push({ label: '🎯 Pierce/ฮิต (หลังปลุกหอก)', value: hitText(st, (K.pierceMul + st.ultMulAdd) * h2 * (1 + st.pskill), false, true) }) // skill hit: crit text only with skillCrit
          out.push({ label: '🎯 Pierce จำนวนฮิต', value: `${hits} (บอส/มินิ ${bigHits})${st.j3Lk > 0 ? ` +${KIT3.lordknight.extraHits + st.j3GospelField}` : ''}` })
          out.push({ label: '🔱 คลื่นทะลวง (แทงเดียว)', value: hitText(st, (K.waveMul + st.ultMulAdd) * h2 * (1 + st.pskill) * (1 + st.swWaveAmp), false, true) })
          out.push({ label: '🎯 เป้า', value: `บอส > มินิ > ตัวหน้า · คริ ${st.skillCrit > 0 ? 'ด้วย skillCrit' : 'ต้องมี skillCrit'}` })
          out.push({ label: '🔱 + HP สูงสุด/ฮิต', value: pct(K.hpDmg + st.j2HpDmg) })
          if (st.j2Spiral > 0) out.push({ label: '🌀 ข้าม DEF', value: pct(Math.min(1, st.j2Spiral)) })
          out.push({ label: '🔱 ปล่อยเองเมื่อ', value: `เป้า HP < ${Math.round(SWORD_MANA.execLow * 100)}%` })
        } else {
          out.push({ label: '🌊 คลื่นดาบ/ตัว (ทุกตัว)', value: hitText(st, (SWORD_MANA.ultMul + st.ultMulAdd) * hitPow * (1 + st.pskill) * (1 + st.swWaveAmp), false) })
          out.push({ label: '🌊 ปล่อยเองเมื่อ', value: `มอน HP < ${Math.round(SWORD_MANA.execLow * 100)}%` })
        }
        const U = KIT.swordUltTree
        out.push({ label: '🎯 ก่อนปล่อยคลื่น', value: 'ไม่พลาด' })
        if (st.swAwDr > 0) out.push({ label: '🛡️ ปลุกอยู่: โดนเบาลง', value: `−${pct(st.swAwDr)}` })
        if (st.swAwLeech > 0) out.push({ label: '🩸 ปลุกอยู่: ดูดเลือด', value: pct(st.swAwLeech) })
        if (st.swAwCtr > 0) out.push({ label: '🔁 ปลุกอยู่: สวนกลับ', value: `+${pct(st.swAwCtr)}` })
        if (st.swWaveShield > 0) out.push({ label: '🌊 โล่จากคลื่น', value: `${pct(U.waveShield)} ดาเมจ` })
        if (st.swWaveRe > 0) out.push({ label: '🌊 คลื่นซ้ำเมื่อฆ่า', value: `โอกาส ${pct(st.swWaveRe)}` })
        if (st.ultShieldAdd > 0) out.push({ label: 'โล่', value: `${shield(st, st.maxHp * st.ultShieldAdd * pow)}` })
      }
      { // ⚖️ คำพิพากษา: the multiplier at a few target HP shares (Berserker / Warlord take execLineShare)
        const full = swordAwakenUlt(job2), sh = full ? 1 : SWORD_MANA.execLineShare, add = (full ? st.swExecAdd : 0) + st.swExecBonus, x = (f: number, big: boolean) => `×${swordExecMul(f, big, sh, add).toFixed(2)}`
        out.push({ label: '⚖️ execute เป้า HP 50%', value: x(0.5, false) })
        out.push({ label: '⚖️ execute เป้า HP ≤25%', value: x(0.25, false) })
        out.push({ label: '⚖️ บอส/มินิ HP ≤25%', value: x(0.25, true) })
      }
      break
    case 'archer':
      out.push({ label: 'ศรทะลวง (เป้าเดียว)', value: hitText(st, (KIT.archerUlt - st.arUltMulCut) * hitPow, false) })
      if (st.arUltSplash > 0) out.push({ label: 'ทะลุใส่ตัวอื่น', value: hitText(st, st.arUltSplash * hitPow, false) })
      out.push({ label: 'หลบแน่นอน', value: `${1 + st.arUltDodge} ครั้ง` })
      break
    case 'mage': {
      if (job2 === 'sage') {
        const S = KIT2.sage, k = hitPow * (1 + st.ult2Pow)
        out[0] = { label: 'คูลดาวน์', value: `${ultCooldown(job, st)} เทิร์น · Mana ${S.ultCost}` }
        out.push({ label: '🚫 Dispell + ขโมย Mana', value: `ลบบัฟทุกตัว · Mana +${S.ultMana + st.j2UltMana}` })
        out.push({ label: 'ฟาด Spell Breaker (P.ATK)', value: hitText(st, (S.ultAtk + st.ultMulAdd) * k * (1 + st.pskill), false, true) })
        out.push({ label: 'ฟาด Spell Breaker (พลังเวท)', value: hitText(st, S.ultPm * k, true, true) })
        if (st.j2UltBreak > 0) out.push({ label: 'ทำลายเกราะ', value: `${st.j2UltBreak} เทิร์น` })
        break
      }
      const amp = (x: number) => hitPow * MAGE_CAST.ultMul * (1 + st.mgUltAmp + x) * (st.mgDoubleCast > 0 ? st.mgDoubleCast : 1)
      const twice = st.mgDoubleCast > 0 ? ' ×2 รอบ' : ''
      out.push({ label: 'ร่าย', value: `1 เทิร์น + เทิร์นที่ปล่อย · แรง ×${MAGE_CAST.ultMul} · แตกเมื่อโดนตีแรง ≥ ${pct(MAGE_CAST.breakMinHp)} HP (${pct(MAGE_CAST.breakBase)} − ${(MAGE_CAST.breakDex * 100).toFixed(1)}%/DEX · พิษ/ไฟไม่ทำให้แตก) · แตก = คืน Mana ${pct(MAGE_CAST.breakRefund)} + คูลดาวน์เหลือ ${MAGE_CAST.brokenUltCd} เทิร์น + ร่ายครั้งหน้าไม่แตก` })
      out.push({ label: `⚡ ${KIT.mageLightHits + st.lightHits} ฮิต ดาเมจ/ฮิต${twice}`, value: (() => { const b = magicBase(st), a = amp(st.mgLightAmp); return range(b.lo * KIT.mageLightLo * a, b.hi * KIT.mageLightHi * a) })() })
      out.push({ label: `🔥 ทุกตัว + เผา ${KIT.mageFireStacks + st.mgFireStack} stack${twice}`, value: hitText(st, KIT.mageFire * amp(st.mgFireAmp), true) })
      out.push({ label: `❄️ ทุกตัว + ช้า ${KIT.mageIceChill + st.chillPlus} เทิร์น${twice}`, value: hitText(st, KIT.mageIce * amp(st.mgIceAmp), true) })
      const bp = pow * MAGE_CAST.ultMul * (1 - st.mgBarrierCut)
      out.push({ label: 'บาเรีย (❄️ ได้เพิ่ม)', value: `${shield(st, st.matk * MAGE_SPELL.barrier * bp)}${st.iceBarrier > 0 ? ` / ❄️ ${shield(st, st.matk * (MAGE_SPELL.barrier + st.iceBarrier) * bp)}` : ''}` })
      break
    }
    case 'cleric':
      if (job2 === 'crusader') { // v106: Grand Cross + the Cleric Ult-web buffs (v108: 🌄 is a basic-attack passive now, not here)
        const C = KIT2.crusader, k = hitPow * (1 + st.ult2Pow) * (1 + st.j2CrossAdd)
        // v116 (Q 2026-11-08): short values so they fit the 112px column; labels stay the same across Lv so now/next rows pair up
        out[0] = { label: 'คูลดาวน์ (ไม่ใช้ Mana)', value: `${ultCooldown(job, st)} เทิร์น` }
        const n = gcPulses(st), atkPer = C.gcAtk + st.clUltAtk / n, strFlat = C.gcStr * (base?.str ?? 0) * k
        // v116 summary (Q 2026-11-08): one pulse = magic + P.ATK + STR (x2 with ★ ซ้อน); total = n pulses + burn (full Mana + HP paid at full HP)
        const payPct = C.gcPay * Math.max(0, 1 - st.j2PayCut), mb = hitBase(st, true), pb = hitBase(st, false)
        const mMul = C.gcPm * k, pMul = atkPer * k * (1 + st.pskill), times = st.j2GcTwice > 0 ? 2 : 1
        const perLo = (mb.lo * mMul + pb.lo * pMul + strFlat) * times, perHi = (mb.hi * mMul + pb.hi * pMul + strFlat) * times
        const burn = C.gcBurn * (st.maxRes + st.maxHp * payPct) * k
        out.push({ label: '💥 ดาเมจต่อครั้ง/ตัว', value: range(perLo, perHi) })
        out.push({ label: '💥 รวม/ตัว (ทุกครั้ง + เผา)', value: range(perLo * n + burn, perHi * n + burn) })
        out.push({ label: '💔 จ่าย HP ปัจจุบัน', value: pct(payPct) })
        out.push({ label: `↩️ คืน HP (โดน ${C.gcRefundAt}+ ตัว)`, value: `${pct(C.gcRefund)} ที่จ่าย` })
        if (st.j2GcTwice > 0) out.push({ label: '★ ยิงซ้ำทุกครั้ง', value: 'รอบ 2 ไม่มีเผา' })
        out.push({ label: '✝️ ใส่ทุกตัว (ตอนกด + ต้นเทิร์น)', value: `${n} ครั้ง` })
        out.push({ label: `· ${C.gcPm}x พลังเวท (เวท)`, value: hitText(st, C.gcPm * k, true) })
        out.push({ label: `· P.ATK (กาย${st.clUltAtk > 0 ? ' · 🙏 ราก' : ''})`, value: hitText(st, atkPer * k * (1 + st.pskill), false) })
        out.push({ label: `· ${C.gcStr}x STR (กาย)`, value: `+${r(strFlat)}` })
        out.push({ label: '🔥 โบนัสเผา/ตัว (หลอดเต็ม)', value: `+${r(burn)} รวม` })
        if (st.j2GcAngel > 0) out.push({ label: '🪽 ลดดาเมจ/pulse ที่เหลือ', value: `${pct(st.j2GcAngel)} (สูงสุด ${pct(Math.min(C.angelCap, st.j2GcAngel * (n - 1)))})` })
        if (st.j2GcShield > 0) out.push({ label: '🛡️ โล่ต่อ pulse', value: `${shield(st, st.maxHp * st.j2GcShield)}` })
        if (st.j2GcGuard > 0) out.push({ label: '⛪ บล็อกระหว่าง Grand Cross', value: `+${pct(st.j2GcGuard)}` })
        out.push({ label: `โล่ ${CLERIC_KIT.ultShieldTurns} เทิร์น`, value: `${shield(st, st.maxHp * CLERIC_KIT.ultShield * (1 + st.ultPow) * (1 + st.ult2Pow))}` })
        if (st.clPurify > 0) out.push({ label: 'ไฟชำระ: ล้างดีบัฟ + ฮีล (M.ATK)', value: `${heal(st, st.matk * CLERIC_KIT.purifyHeal)} HP` })
        if (st.ultHoly > 0) out.push({ label: 'แสงลงทัณฑ์/ตัว', value: hitText(st, st.ultHoly, true) })
        break
      }
      if (job2 === 'monk') {
        const O = KIT2.monk, h2 = hitPow * (1 + st.ult2Pow)
        if (st.j2Asura > 0) {
          out[0] = { label: `คูลดาวน์ · ต้องมี 🔵 ${O.asuraMinAt}+`, value: `${ultCooldown(job, st)} เทิร์น · เผา 🔵+Mana` }
          out.push({ label: `💥 อาชูร่า (${O.asuraMinAt} 🔵 + Mana เต็ม)`, value: `${asuraDamage(st, O.asuraMinAt, st.maxRes, h2)}` })
          out.push({ label: `💥 อาชูร่า (${O.chargeMax + st.j2ChargeMax} 🔵 + Mana เต็ม)`, value: `${asuraDamage(st, O.chargeMax + st.j2ChargeMax, st.maxRes, h2)}` })
          out.push({ label: '🛡️ ทะลุ DEF / M.DEF', value: '100% (ไม่พลาด)' })
          out.push({ label: '😵 ง่อยแดกหลังใช้', value: `${O.asuraExhaustTurns} เทิร์น (0 Mana/🔵 · ช้า ${pct(O.asuraSlow)})` })
        } else {
          const bk = h2 * bellMdefMul(st)
          out[0] = { label: 'คูลดาวน์ (ไม่ใช้ Mana)', value: `${ultCooldown(job, st)} เทิร์น` }
          out.push({ label: `🔔 HP ระฆัง (ดึงตี ${pct(O.bellTaunt)})`, value: `${r(st.maxHp * O.bellHp * bellMdefMul(st))} · ${O.bellTurns} เทิร์น` })
          out.push({ label: '🔔 สั่นทุกฮิต (ทุกตัว)', value: hitText(st, O.bellRing * bk, true) })
          out.push({ label: '💥 ระเบิดเมื่อแตก (ทุกตัว)', value: hitText(st, O.bellBoom * bk, true) })
          if (st.j2BellMdef > 0) out.push({ label: '🔔 กังวานเหล็ก (M.DEF)', value: `×${bellMdefMul(st).toFixed(2)}` })
        }
        break
      }
      out.push({ label: `ทุบทุกตัว ${pct(clericUltSmash(st))} P.ATK`, value: hitText(st, clericUltSmash(st) * hitPow * (1 + st.pskill), false) })
      out.push({ label: `🔱 หอกแสง ${clericUltLights(st)} เล่ม ตัวสุ่ม /เล่ม`, value: hitText(st, CLERIC_KIT.ultLight * hitPow, true) })
      out.push({ label: '　↳ ตัวข้างๆ โดน 50%', value: hitText(st, CLERIC_KIT.ultLight * hitPow * KIT.spearSplash, true) })
      out.push({ label: `โล่ ${CLERIC_KIT.ultShieldTurns} เทิร์น`, value: `${shield(st, st.maxHp * CLERIC_KIT.ultShield)} (รวมไม่เกิน ${r(st.maxHp * CLERIC_KIT.shieldCap)})` })
      if (st.clPurify > 0) out.push({ label: 'ไฟชำระ: ล้างดีบัฟ + ฮีล (M.ATK)', value: `${heal(st, st.matk * CLERIC_KIT.purifyHeal)} HP` })
      if (st.ultHoly > 0) out.push({ label: 'แสงลงทัณฑ์/ตัว', value: hitText(st, st.ultHoly, true) })
      break
    case 'thief': {
      const flurryCut = Math.max(0, 1 - Math.max(0, st.thFlurryDmgCut))
      const stabMul = KIT.thiefUlt * hitPow * (1 + st.thUltAgi) * flurryCut
      out.push({ label: `แทง ${thiefUltHitCount(st)} ที ดาเมจ/ที`, value: hitText(st, stabMul, false) })
      out.push({ label: 'หลบแน่นอน', value: `${Math.max(0, KIT.thiefUltDodge + st.ultDodge)} ครั้ง` })
      // P2'c thief_u / th_t3*
      if (thiefUltCritAdd(st) > 0) out.push({ label: 'สกิลคริ (เฉพาะเงาพริ้ว)', value: `+${pct(thiefUltCritAdd(st))}` })
      { const cc = thiefUltCondCritDmg(st, KIT.thiefUltKindsMax, 0); if (cc > 0) out.push({ label: 'ดาเมจคริเงื่อนไข (สูงสุด)', value: `+${pct(cc)}` }) }
      if (thiefOnHitEff(st) > 0) out.push({ label: 'On-Hit (ดูดเลือด · Wound)', value: pct(thiefOnHitEff(st)) })
      if (st.thUltKillFinisher > 0 || st.thUltFinisher > 0) out.push({ label: 'ทีปิด', value: hitText(st, stabMul * Math.max(st.thUltKillFinisher, st.thUltFinisher > 0 ? KIT.thiefFinisherMul : 0), false) })
      if (st.thDeathMark > 0) out.push({ label: 'ตราความตาย (Death Mark)', value: `เก็บดาเมจ ${KIT.thiefDeathMarkTurns} เทิร์น → ระเบิด ${pct(st.thDeathMark)} True (หรือ HP < ${pct(KIT.thiefDeathMarkAt)})` })
      break
    }
    default: return []
  }
  return out
}

/** Skill 2 with these stats (s2Lv / s2Star come from its "+" and ★ nodes). */
export function skill2Info(k: Skill2Def, st: Stats): InfoRow[] {
  const lv = st.s2Lv, star = st.s2Star > 0, job = JOBS[k.job]
  const out: InfoRow[] = [{ label: 'ใช้', value: `${resName(job)} ${k.cost} · คูลดาวน์ ${s2Cooldown(k, st)} เทิร์น` }]
  const add = (label: string, value: string) => out.push({ label, value })
  switch (k.id) {
    case 'sw_guard': add('โล่ทันที + ดาเมจเข้าลด', `${shield(st, st.maxHp * S2N.guardShield(star))} · −${pct(S2N.guardCut(lv))} · ${S2N.guardTurns(star)} เทิร์น`); add('สวนกลับแน่นอน', `${S2N.guardCounters(star)} ครั้ง`); add('สวน +ดาเมจที่โดน', pct(S2N.guardBack(lv, star))); add('สวน +P.DEF', `${S2N.guardDef(lv)}x = ${Math.round(st.def * S2N.guardDef(lv))}`); break
    case 'sw_blood': add('ดูดเลือด + ดูดเลือดสกิล', `+${pct(S2N.bloodVamp(lv))} · ${S2N.bloodTurns} เทิร์น`); add('ดาเมจสกิล/ult', `−${pct(SPELL_VAMP.bloodCut)}${star ? ` · ATK +${pct(S2N.bloodAtk)}` : ''}`); break
    case 'sw_taunt': add('มอนตีเบาลง + เกราะแตก', `${pct(S2N.tauntWeak(lv))} (${S2N.tauntTurns(star)} เทิร์น) · เกราะแตก ${S2N.tauntBreakTurns(star)} เทิร์น`); if (star) add('★ ท้าซ้ำ', `ฟื้น Resource +${S2N.tauntStarRes} · โล่ ${shield(st, st.maxHp * S2N.tauntStarShield)}`); break
    case 'ar_rain': add(`ดาเมจ/ตัว (ทุกตัว ×${S2N.rainWaves(star)} รอบ)`, hitText(st, S2N.rainMul(lv), false)); break
    case 'ar_hawk': add('คริเพิ่ม', `+${pct(S2N.hawkCrit(lv))} → รวม ${pct(st.crit + S2N.hawkCrit(lv))} · ${S2N.hawkTurns} เทิร์น`); if (star) add('ดาเมจคริ', `+${pct(S2N.hawkCritDmg)}`); break
    case 'ar_trap': add(star ? 'ดาเมจ/ตัว (ทุกตัว)' : 'ดาเมจตัวหน้า', hitText(st, S2N.trapMul, false)); add('ผลักเทิร์น', `${S2N.trapPush(lv)}`); break
    case 'mg_mshield': add('Mana รับดาเมจแทน', `${pct(S2N.mshieldTake(lv))} · ${S2N.mshieldTurns(star)} เทิร์น`); break
    case 'mg_nova': add('ดาเมจ/ตัว (ทุกตัว)', hitText(st, S2N.novaMul(lv), true)); add('ช้า', `${S2N.novaChill(star)} เทิร์น${star ? ` · ผลักเทิร์น ${S2N.novaPush}` : ''}`); break
    case 'mg_arcane': add(`${S2N.arcaneHits(star)} ฮิต ดาเมจ/ฮิต`, hitText(st, S2N.arcaneMul(lv), true)); break
    case 'cl_renew': { const turns = S2N.renewTurns(star), h = heal(st, st.matk * S2N.renewHeal(lv)); add('ฮีล/เทิร์น', `${h} HP × ${turns} เทิร์น = ${h * turns} HP`); break }
    case 'cl_bless':
      add('STR/DEX/INT/WIS', `+${S2N.blessStat} · ${S2N.blessTurns} เทิร์น`); add('ล้างดีบัฟ', `${S2N.blessCleanse} อย่าง ตอนร่าย`)
      if (lv) add('🛡️ Kyrie Eleison', `${shield(st, st.maxHp * S2N.kyrieHp(lv))} · แตกเมื่อโดน ${S2N.kyrieHits} ฮิต`)
      if (star) add('✨ Gloria', `LUK +${S2N.gloriaLuk}`)
      break
    case 'cl_spear': add(`หอกแสง ${S2N.spearCount(star)} เล่ม ตัวสุ่ม /เล่ม (ข้างๆ 50%)`, hitText(st, spearMul(st, k), true)); break
    case 'th_smoke':
      add('หลบแน่นอน', `${S2N.smokeDodges(star)} ครั้ง`)
      add('Shroud', `${S2N.smokeTurns} เทิร์น · FLEE +${pct(S2N.smokeFlee)} (คูณ) · skillCrit +${pct(S2N.smokeSkillCrit)}${star ? ` · ดาเมจคริ +${pct(S2N.smokeCritDmg)}` : ''}`)
      add('Sightless Raid (ฮิตแรกหลังร่าย)', hitText(st, S2N.raidMul * (1 + st.pskill), false))
      add('Exposed + Blind', `รับดาเมจ +${pct(star ? S2N.exposedStar : S2N.exposedPct)} ${S2N.exposedTurns} เทิร์น · Hit −${pct(KIT2.crusader.blindHit)} ${S2N.smokeBlindTurns} เทิร์น`)
      if (lv) add('ฟื้น HP + Energy', `${heal(st, st.maxHp * S2N.smokeHeal(lv))} · +${S2N.smokeRes(lv)}`)
      break
    case 'th_pick': { const T = KIT.thiefSteal; add('แทงตัวหน้า', hitText(st, S2N.pickMul(star), false)); add('คืน Energy', `${S2N.pickRes(lv)}`); if (star) add('พิษ', `+${S2N.pickPoison} stack`)
      add(star ? 'ขโมย 2 อย่าง (stat เด่น 1-2)' : 'ขโมยตาม stat เด่น', `STR→P.ATK +${Math.round(T.atk * 100)}% · AGI→Energy +${T.res} · INT→พิษ ${T.poison} · VIT→เกราะแตก ${T.brkTurns} · WIS→ฮีล ${Math.round(T.heal * 100)}% · LUK/DEX→คริ +${Math.round(T.crit * 100)}% (${T.turns} เทิร์น)`); break }
    case 'th_wound':
      add('แทงทะลุ DEF', hitText(st, S2N.woundMul(star), false)); add('พิษ', `+${S2N.woundPoison(lv)} stack (${thiefPoisonPerStack(st).toFixed(1)}/stack/เทิร์น)`)
      add('Wound', `+${star ? S2N.woundStarStacks : S2N.woundStacks} stack (สูงสุด ${S2N.woundMax(lv)} · ${S2N.woundTurns} เทิร์น)${lv ? ` · D.Strike ${pct(S2N.woundStrikeChance)} +1` : ''}`)
      add(`Blade's End (Wound ≥ ${S2N.bladeAt})`, `${hitText(st, S2N.bladeMul * (1 + st.pskill), false)} · ตัดฮีลมอน ${pct(S2N.bladeHealCut)} ${S2N.bladeCutTurns} เทิร์น${star ? ' · คริได้' : ''}`)
      add('Privileged (พิษ + Wound)', `รับดาเมจ +${pct(S2N.woundPriv)}`)
      break
  }
  return out
}

// ===== Mage defensive passives (docs/passive_mage_3.md): ⚡ Static Mirage · 🔥 Molten Mantle · ❄️ Glacial Aegis =====
// Node ranks 0-5 land in Stats.mgStatic / mgMolten / mgGlacial (data/trees/mage.ts, branch mage_def). The always-on part
// (dodge / damage cut / DEF) is plain Stats in the node `mod`; BattleScene.hurtHeroCore reads the rest. Turn-based: the doc's seconds became hero turns.
// Counter multipliers are x the hero magic hit (Pm), like every other hero magic proc. Numbers are first guesses.
export const MAGE_DEF = {
  maxRank: 5,
  static: { dodgeCharges: [1, 1, 2, 2, 3], counterBase: 0.35, counterPer: 0.12, shockBase: 0.3, shockPer: 0.07, shockPush: 32, icdTurns: 1 }, // shock = gauge push (micro-stun) · 1 proc per hero turn
  molten: { guardPer: 0.03, thornsBase: 0.4, thornsPer: 0.15, burnStacks: 2, wardPer: 0.08, wardCap: 0.35 }, // ward: shield from burn ticks, total shield capped at 35% max HP
  glacial: { mdefPer: 0.05, defPer: 4, barrierHpPer: 0.08, barrierMatkPer: 0.4, every: 3, chillTurns: 1, novaBase: 0.45, novaPer: 0.15, novaIcdTurns: 3, freezePush: 32 }, // barrier every `every` hero turns · nova ICD in hero turns
  // Stat scaling (round 3, first guesses): soft curve max x stat/(stat+K), same shape as WIS->M.DEF. INT -> counter damage · WIS -> barrier / ward / shock chance · Base Lv -> a small flat bonus to all three.
  scale: { intK: 150, intMax: 0.6, wisK: 150, wisMax: 0.6, shockWisMax: 0.25, shockCap: 0.9, lvMax: 0.2 },
} as const

const rank = (r: number) => Math.max(0, Math.min(MAGE_DEF.maxRank, Math.floor(r)))
const soft = (stat: number, k: number) => { const s = Math.max(0, stat); return s / (s + k) }

/** Multipliers for the mage passives. All 1 / 0 at INT 0, WIS 0, Base Lv 0 (= pre-scaling behaviour). */
export interface MageDefPower {
  /** x counter damage: ⚡ shock hit · 🔥 thorns · ❄️ Shatter Nova (INT + Base Lv). */
  dmg: number
  /** x shield size: ❄️ barrier · 🔥 Flame Ward (WIS + Base Lv). */
  shield: number
  /** added to ⚡ shock chance (WIS only; staticShockChance caps the sum). */
  shockAdd: number
}
export const MAGE_DEF_POWER_NONE: MageDefPower = { dmg: 1, shield: 1, shockAdd: 0 }
/** INT / WIS / Base Lv -> passive multipliers. Negatives clamp to 0; bounded by 1 + max + lvMax. */
export function mageDefPower(int: number, wis: number, baseLv: number): MageDefPower {
  const S = MAGE_DEF.scale
  const lv = S.lvMax * Math.min(1, Math.max(0, baseLv) / STAT_RULES.maxBaseLevel)
  const w = soft(wis, S.wisK)
  return { dmg: 1 + S.intMax * soft(int, S.intK) + lv, shield: 1 + S.wisMax * w + lv, shockAdd: S.shockWisMax * w }
}

/** ⚡ sure dodges refilled at every wave start (counted, not a %): rank 1-5 -> 1,1,2,2,3. 0 at rank 0. Each dodge also fires the counter-shock. */
export const staticDodgeCharges = (r: number) => (rank(r) > 0 ? MAGE_DEF.static.dodgeCharges[rank(r) - 1] : 0)
/** ⚡ counter-shock hit (x Pm), 0 at rank 0. `dmg` = MageDefPower.dmg. */
export const staticCounterMul = (r: number, dmg = 1) => (rank(r) > 0 ? (MAGE_DEF.static.counterBase + MAGE_DEF.static.counterPer * rank(r)) * dmg : 0)
/** ⚡ chance the counter also shocks (gauge push) the attacker. `add` = MageDefPower.shockAdd; total capped at shockCap. */
export const staticShockChance = (r: number, add = 0) =>
  rank(r) > 0 ? Math.min(MAGE_DEF.scale.shockCap, MAGE_DEF.static.shockBase + MAGE_DEF.static.shockPer * rank(r) + Math.max(0, add)) : 0
/** 🔥 thorns hit (x Pm) when a monster's hit lands. */
export const moltenThornsMul = (r: number, dmg = 1) => (rank(r) > 0 ? (MAGE_DEF.molten.thornsBase + MAGE_DEF.molten.thornsPer * rank(r)) * dmg : 0)
/** 🔥 Flame Ward: shield gained from one burn tick (x M.ATK), limited so the whole shield stays <= wardCap of max HP. */
export const moltenWardGain = (r: number, matk: number, maxHp: number, shield: number, shieldMul = 1) =>
  rank(r) > 0 ? Math.max(0, Math.min(Math.floor(matk * MAGE_DEF.molten.wardPer * rank(r) * shieldMul), Math.floor(maxHp * MAGE_DEF.molten.wardCap - shield))) : 0
/** ❄️ barrier size: maxHp x 6% x rank + M.ATK x 25% x rank (x `shieldMul` = MageDefPower.shield). */
export const glacialBarrierMax = (r: number, maxHp: number, matk: number, shieldMul = 1) =>
  rank(r) > 0 ? Math.floor((maxHp * MAGE_DEF.glacial.barrierHpPer * rank(r) + matk * MAGE_DEF.glacial.barrierMatkPer * rank(r)) * shieldMul) : 0
/** ❄️ is it time to re-raise the barrier? (heroTurns = hero turns this fight; turn 0 = fight start is handled by the wave start.) */
export const glacialDue = (r: number, heroTurns: number) => rank(r) > 0 && heroTurns > 0 && heroTurns % MAGE_DEF.glacial.every === 0
/** ❄️ Shatter Nova hit (x Pm) when the barrier breaks. */
export const glacialNovaMul = (r: number, dmg = 1) => (rank(r) > 0 ? (MAGE_DEF.glacial.novaBase + MAGE_DEF.glacial.novaPer * rank(r)) * dmg : 0)
/** Internal cooldown in hero turns: `last` = turn it last fired (use -Infinity for never). */
export const icdReady = (turn: number, last: number, icdTurns: number) => turn - last >= icdTurns

// ===== the last four Awakenings: pure math (docs/design/awakening-last-four-v1.md) =====
/** 🥷 Preserve: the ตราคมมีด cap. */
export const stalkerMarkCap = (st: Pick<Stats, 'j3Sk'>) => KIT2.rogue.markMax + (st.j3Sk > 0 ? KIT3.stalker.markMaxAdd : 0)
/** 🎩 Loan Shark: + hit damage from `debt` debts on the target (counted up to KIT3.kingpin.debtCap). */
export const kingpinDebtAmp = (st: Pick<Stats, 'j3Kp' | 'j3KpDebtAmp'>, debt: number) =>
  st.j3Kp > 0 ? Math.min(KIT3.kingpin.debtCap, Math.max(0, debt)) * (KIT3.kingpin.debtAmp + st.j3KpDebtAmp) : 0
/** 🎩 Hostile Takeover: x P.ATK of the second slash on a monster carrying `debt` debts. */
export const kingpinTakeMul = (debt: number) => KIT3.kingpin.takeMul * (1 + KIT3.kingpin.takePerDebt * Math.min(KIT3.kingpin.debtCap, Math.max(0, debt)))
/** 🔮 ร่ายใหญ่: + damage taken while a Wizard spell charges (🌌 High Wizard: half). */
export const wizCastTaken = (st: Pick<Stats, 'j3Hw'>) => KIT2.wizard.castTaken * (st.j3Hw > 0 ? KIT3.highwizard.castTakenMul : 1)

// ---------- 🧤 Rogue rg_d สายปลด (Strip line, Q 2026-11-21) ----------
/** Potency multiplier of a strip on a monster: boss / mini x bossMul, stripped again within resTurns x resMul. */
export const divestMul = (bossy: boolean, resisting: boolean, resMul: number = KIT2.rogue.divest.resMul) => {
  const D = KIT2.rogue.divest
  return (bossy ? D.bossMul : 1) * (resisting ? resMul : 1)
}
/** 🥷 sk_d3 ถอดซ้ำ: repeat-strip multiplier with `lv` (Stats.j3SkRes), capped at x1. */
export const stalkerResMul = (lv: number) => Math.min(1, KIT2.rogue.divest.resMul + KIT3.stalker.divest.resPer * Math.max(0, lv))
/** 🥷 sk_d1 เหยื่อเปลือย: damage amp for `kinds` strip kinds on the target at `per` (Stats.j3SkPrey). */
export const stalkerPreyAmp = (per: number, kinds: number) => (per > 0 ? per * Math.min(KIT3.stalker.divest.preyCap, Math.max(0, kinds)) : 0)
/** rg_d1 ปลดอาวุธ: weak share at `lv` (before divestMul). */
export const disarmWeak = (lv: number) => (lv > 0 ? KIT2.rogue.divest.weak + KIT2.rogue.divest.weakPer * lv : 0)
/** rg_d3 ฉกบัฟ: share of a stolen buff the hero keeps at `lv`. */
export const snatchShare = (lv: number) => (lv > 0 ? KIT2.rogue.divest.snatchBase + KIT2.rogue.divest.snatchPer * lv : 0)
/** rg_d2: Strip Armor P.DEF cut with ถอดเกราะเปลือย points (`plus` = Stats.j2StripPlus). */
export const rogueStripCut = (plus: number) => Math.min(0.6, KIT2.rogue.stabStrip + Math.max(0, plus))
