// ===== Skill math: the ONE place hero skill numbers live (BattleScene casts with these, CharacterScene shows them). =====
// BattleScene adds run-only effects on top (relics, run picks, berserk, weaken, monster DEF/flee), so the
// numbers shown in the skill detail panel are "before monster DEF, without run picks".
// พร v2 (Q 2026-11-04, design/skills-v2.md): every hero magic HIT uses magic power Pm = 70% M.ATK + 30% P.ATK
// (LoL feel: physical builds still get something from magic procs). Heals and shields stay on M.ATK.
import { BATTLE, PLAYER, type MonsterKind, type Stats } from './game-data'
import { CLERIC_KIT, JOBS, MAGE_SPELL, SPELL_VAMP, SWORD_MANA, type JobDef, type JobId } from './jobs'
import type { Skill2Def } from './skill2'
import { PACKS } from './dungeons'
import { STAT_RULES } from './meta/stat-spec'

/** Q 2026-11-04 rule: magic damage = 70% M.ATK + 30% P.ATK for ALL hero magic (Mage/Priest class skills too). */
export const MAGIC_MIX = { matk: 0.7, atk: 0.3 }
/** Magic power (Pm): what magic hits, burn stacks, Hellfire and Lightning Wrath scale with. */
export const magicPower = (st: Stats) => st.matk * MAGIC_MIX.matk + st.atk * MAGIC_MIX.atk
/** Magic hit base before the skill multiplier: Pm 0.9–1.1x (a crit uses the top). */
export const magicBase = (st: Stats) => { const pm = magicPower(st); return { lo: pm * 0.9, hi: pm * 1.1 } }
/** Physical hit base: P.ATK minPct–1x (DEX raises the floor; a crit uses the top and skips DEF). */
export const physBase = (st: Stats) => ({ lo: st.atk * st.minPct, hi: st.atk })
export const hitBase = (st: Stats, magic: boolean) => (magic ? magicBase(st) : physBase(st))

/** v78 Mage cast time (Q 2026-11-06, design/mage-cast-focus-v78.md), softened in v85 (playtest: "punishes too much").
 *  Only the base Mage element ult chants (1 turn); ลูกไฟระเบิด is instant again (fireMul x Pm, can't break). Wizard keeps ร่ายใหญ่ (never breaks).
 *  A hit that reaches HP while chanting may break it: it must deal >= breakMinHp of max HP, then breakChance rolls (DoT never breaks).
 *  Broken: refund breakRefund of the Mana paid, ult waits brokenUltCd turns (not the full cd), and the NEXT chant can't break (steady).
 *  The release IS the next turn's action (Wizard's stays free). ultMul x the chanted ult. Numbers are guesses (v85). */
export const MAGE_CAST = { breakBase: 0.25, breakDex: 0.012, breakMinHp: 0.06, breakRefund: 0.6, fireMul: 0.45, ultMul: 1.3, brokenUltCd: 2, boltMana: 6 } // fireMul: 1 -> 0.45 in the 2026-11-13 auto rework (cost 36 -> 5, cast nearly every turn)
/** 2026-11-13 Mage auto rework (Q): ลูกไฟระเบิด scales 90% M.ATK : 10% P.ATK (the shared hit mix stays 70 : 30 for every other magic hit). */
export const MAGE_AUTO_MIX = { matk: 0.9, atk: 0.1 }
/** 2026-11-13 Mage core passives (the "แก่นเวท" column, always on, no pick): 🕯️ มนต์ถดถอย (debuff) · 🔮 ออร่าเวท (buff). Numbers are first guesses.
 *  Node levels are per OLD level (max 3); data/tree.ts stretches them to 5 and calls the formula with lv x 3/5, so Lv 5 = `x3` below. */
export const MAGE_PASSIVE = {
  hex: { weakPer: 0.07, cap: 0.35, turns: 2 }, // ลูกไฟระเบิด hit -> the monster's own hits lose weakPer x lv (cap) for `turns` of its turns (the stronger / longer one wins, never stacks)
  aura: { ampPer: 0.1, turns: 4 }, // first `turns` hero turns of every wave: ลูกไฟระเบิด + ult damage +ampPer x lv (not shields)
}
/** 🕯️ share of damage a hexed monster loses. */
export const hexWeak = (lv: number) => Math.min(MAGE_PASSIVE.hex.cap, MAGE_PASSIVE.hex.weakPer * Math.max(0, lv))
/** 🔮 damage bonus while the aura lasts. */
export const auraAmp = (lv: number) => MAGE_PASSIVE.aura.ampPer * Math.max(0, lv)
/** Multiplier that turns "x Pm" (70 : 30) into "x the 90 : 10 mix" for ลูกไฟระเบิด: strike() always multiplies Pm, so we scale the skill mul by this. */
export const mageAutoRatio = (st: Stats) => (st.matk * MAGE_AUTO_MIX.matk + st.atk * MAGE_AUTO_MIX.atk) / Math.max(1, magicPower(st))
/** ลูกไฟระเบิด multiplier in Pm units (base `mul` x the 90 : 10 mix). */
export const mageAutoMul = (st: Stats, mul: number) => mul * mageAutoRatio(st)
/** v78: does a released chant use up the hero's turn? Base Mage / Sage yes, Wizard no (its edge). */
export const castUsesTurn = (job2?: string) => job2 !== 'wizard'
/** Chance one hit breaks the chant: 25% − 1.2%/DEX − tenacity, never below 0 (🧘 Poise = 0). */
export const breakChance = (dex: number, tenacity: number, poise = false) =>
  poise ? 0 : Math.max(0, MAGE_CAST.breakBase - MAGE_CAST.breakDex * dex - tenacity)
/** v85: only a hit of >= breakMinHp of max HP (after shields) may roll for a break at all. */
export const breaksOn = (dmg: number, maxHp: number) => maxHp > 0 && dmg >= maxHp * MAGE_CAST.breakMinHp
/** v85: Mana given back when a chant breaks (breakRefund of what was paid). */
export const breakRefundMana = (paid: number) => Math.floor(Math.max(0, paid) * MAGE_CAST.breakRefund)

/** Class kit multipliers that used to sit inline in BattleScene (SWORD_MANA / MAGE_SPELL / CLERIC_KIT live in jobs.ts). */
export const KIT = {
  cast: MAGE_CAST, // v78: tunable as kit `cast.*`
  cleric: CLERIC_KIT, // v86: reference (defined in jobs.ts to avoid a jobs <-> skill-math import cycle), tunable as kit `cleric.*`
  archerAuto: 0.9, archerAutoShots: 2, archerVolleyShots: 3, archerUlt: 5,
  mageFire: 2, mageFireStacks: 3, mageIce: 1.6, mageIceChill: 3, mageLightHits: 6, mageLightLo: 0.3, mageLightHi: 1.2,
  clericHealBelow: 0.75, clericSmiteTargets: 2, clericJudge: 2.2, clericJudgeEvery: 3,
  // v58 Priest Ult web (Q 2026-11-04), linear per level: พรคุ้มครอง (v92 Q 2026-11-07) = ult smash 150% + 50%/Lv P.ATK, Lv5 = 400% · พรอุ่นไอ Lv5 = counter +12.5%, Holy Light 3 -> 8 · เกราะแสง Lv3 = 6% shield per spear volley
  clericUltAtkLv: 0.15, // v108 (Q: Ult back to v58): root พรคุ้มครอง smash +0.15x P.ATK per Lv = 150% x (1 + 10%/Lv) · v104 0.2 per 🌄 Lv · v92 0.5 per root Lv
  clericWarmCounterLv: 0.025, clericWarmLightLv: 1, clericSpearShieldLv: 0.02,
  spearBase: 0.3, spearMax: 8, spearSplash: 0.5, // v120 Q 2026-11-11: หอกแสง = random target (Priest lights: their own target) + the monster on each side x spearSplash
  thiefAuto: 1.6, thiefAutoPoison: 3, thiefUlt: 0.7, thiefUltHits: 4, thiefUltDodge: 2,
  // v82 Archer web: 🧪 ศรพิษ (under ทักษะ 1) + 🏷️ ล่าหัว (under Ult), first guesses (design/skill-tree-archer.md v82)
  archerTree: {
    poisonArrow: [0.2, 0.35, 0.5], poisonArrowStacks: 1, vsPoison: 0.06, ricochet: [0.5, 0.7, 0.9], // ศรอาบพิษ chance per arrow · ซ้ำแผล per lv · ศรเด้ง shot mul
    markTurns: 3, markAmp: 0.05, markJumpRes: 8, killCd: [0.15, 0.25, 0.35], killCdCut: 1, // หมายหัว per lv · ไล่ล่า Energy per lv · ล่าต่อ chance
    execBelow: 0.25, execBig: 0.6, // ★ ศรประหาร: normal monster under 25% HP dies · boss / mini +60%
  },
  // v84 Swordsman web: ⚔️ จังหวะดาบ (under ทักษะ 1) + 🔨 ทลายเกราะ (under Ult), first guesses (design/skill-tree-swordsman.md v84).
  // Per-lv numbers are per OLD level (node max 3, v83 stretch shows 5 levels at the same full value).
  swordTree: {
    flowMax: 5, flow: 0.03, flowMana: 0.6, flowCrit: 0.01, flowBreak: 0.15, // ไหลลื่น: ฟันพายุ in a row stacks (max 5) +dmg/stack/lv · ลมหายใจ Mana/stack/lv · เฉือนคม crit/stack/lv · a hit >= 15% max HP (after shields) resets
    stormHits: 2, // ★ พันดาบ: at max stacks ฟันพายุ swings this many times, sure crit, then stacks reset
    breakTurns: 3, breakAmp: 0.04, breakLeech: 0.02, breakSpreadRes: 4, shatterPush: 30, // ทุบเกราะ: ult breaks armor (Mon.armorBrk = DEF −KIT2.mobster.armorBrk) N turns + dmg taken/lv · ซ้ำรอย heal share/lv · ร้าวลาม Mana/lv · ★ หักท่า gauge push
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
    pierceHits: 3, pierceBigHits: 4, pierceMul: 1.2, bashMul: 0.8, // 🎯 Pierce + Bowling Bash (boss / mini take one more hit)
    boomerang: 0.8, chargeFirst: 3, guardShieldless: 0.5, // Spear Boomerang mul · ★ ทะยาน · Auto Guard without an off-hand
    mastery: { atkPct: 0.05, hit: 10 }, // spear
    // v84 ใยชั้น 2: 🚩 ธงศึก + 🌀 กวาดทวน, first guesses (design/second-jobs-v1.md §4 v84). Per-lv = per OLD level (max 3).
    tree: {
      banner: 0.04, provokeAt: 0.5, provoke: 0.08, bannerKill: 0.02, // ปักธง wave-start shield/lv (tops up) · ข่มขวัญ: monster under 50% HP hits −/lv · ธงชัย: kill shield/lv
      auraHeal: 0.04, auraRes: 6, auraGuard: 0.06, // ★ ธงอมตะ: every block heals + Mana/Rage · + Auto Guard chance
      sweepEvery: 3, sweep: 0.3, sweepPush: 5, sweepGauge: 10, // ทวนวน: every Nth hero turn sweep all x P.ATK/lv (+ max HP share) · เหวี่ยง gauge −/lv · ทวนเร็ว hero gauge +/lv per sweep kill
      sweepBreak: 2, sweepStun: 0.25, // ★ พายุทวน: sweep breaks armor N turns + stun chance (boss / mini: gauge push)
    },
  },
  rogue: {
    knifeMul: 0.4, knifePerCombo: 1, dualKnife: 1, // 🔪 มีดบิน: each extra combo hit throws knives at random monsters (+1 with a dagger off-hand) · no lifesteal
    stabCost: 30, stabCd: 3, stabMul: 2.2, // 🗡️ Back Stab: sure crit on the highest-HP monster
    ultKnives: 8, ultKnifeMul: 0.5, // 🌪️ พายุมีด: shadow dance + knives spread over every monster
    mastery: { atkPct: 0.05, crit: 0.03 }, // dagger
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
    autoChance: 0.25, autoInt: 0.002, autoCap: 0.6, autoMul: 0.7, // Auto Spell per basic: chance + per INT (capped), a run-element bolt x Pm
    endowCost: 25, endowCd: 5, endowTurns: 3, endowAmp: 0.25, // 🗡️ Endow: basic + Auto Spell +25%
    ultCost: 25, ultAtk: 2, ultPm: 1, ultMana: 20, // 🚫 Dispell + Spell Breaker: strip buffs, steal Mana, hit 2x P.ATK + 1x Pm
    rodBlockMana: 15, // 🛡️ ★ Magic Rod: Mana from the absorbed spell
    mastery: { atkPct: 0.05, matk: 6 }, // book / staff
  },
  // ----- Phase 4 Archer: Beastmaster / Innovator (Ally pets / traps / turrets: battle/allies.ts) -----
  beastmaster: {
    packPow: 0.7, // rework v1 (Q 2026-11-14): all 3 pets every wave, each at this power (x ใจเดียวกัน, x ฝูงพันธมิตร)
    hawkChance: 0.15, hawkLuk: 0.004, hawkCap: 0.6, hawkMul: 0.6, hawkHits: 1, hawkHitsMax: 3, // 🦅 Blitz Beat per hero swing: chance + per LUK (capped), 1..N random targets, never misses
    hawkEvoMul: 0.5, hawkEvoHits: 1, // ★ เหยี่ยวทอง
    boarHp: 0.6, boarEvery: 3, boarMul: 0.8, boarPush: 30, // 🐗 HP = share of hero max HP (VIT) · every N hero turns charges the front (loses its turn; boss: gauge push)
    boarShare: 0.35, boarCut: 0.3, boarRageK: 140, boarDown: 3, // 🐗 Guardian: takes this share of every landed monster hit, -boarCut of it · Rage += taken / boar max HP x K, 100 = extra charge · 0 HP = down N hero turns, then back full + charges
    boarEvoHp: 0.5, boarEvoEvery: 2, boarEvoShare: 0.1, boarEvoDown: 2, // ★ หมูป่าเกราะ: + HP share, charges more often, takes more, gets up sooner
    wolfSpeed: 0.8, wolfMul: 0.7, wolfBleed: 2, // 🐺 own turn at this share of hero speed (AGI) · bite + bleed (poison stacks) · follows hero combo hits
    wolfEvoMul: 0.5, wolfEvoSpeed: 0.3, // ★ ราชาหมาป่า
    cmdCost: 30, cmdCd: 3, cmdHawkHits: 3, cmdBoarShield: 0.15, cmdPack: 2, cmdPackTurns: 2, cmdPackPow: 0.6, // 📯 สั่งลุย per pet
    ultHawk: 1.2, ultBoar: 1, ultWolf: 1.5, // 🐾 Stampede: all 3 pets hit once (then the base archer pierce shot)
    mastery: { atkPct: 0.05, hit: 8 }, // bow
    // v82 ใยชั้น 2: 🤝 ผูกพัน + 🌿 สัญชาตญาณ, first guesses (design/second-jobs-v1.md §4 v82)
    tree: { petPow: 0.08, petRes: 1, cmdCut: 5, pack3Pow: 0.2, packLead: 0.04, petHeal: 0.005, roar: 10 },
  },
  innovator: {
    traps: 1, mineMul: 1.5, snarePush: 30, freezeMul: 0.6, freezeChill: 2, // 🧰 wave-start trap (random of 3) fires when a monster acts: 💣 Land Mine · 🕳️ Ankle Snare (boss: gauge -30) · ❄️ Freezing Trap
    boxCost: 35, boxCd: 3, rareLuk: 0.01, rareLukCap: 1.5, // 🎲 กล่องสุ่ม: rare gadget weight x (1 + LUK x this, capped)
    chickenSoaks: 2, rocketMul: 3, turretMul: 0.6, turretTurns: 3, magnetZeny: 0.3, mirrorCap: 1, colaMul: 1, colaChill: 2, wetTurns: 3, wetAmp: 0.25, // gadgets (☁️ wet: +25% from every hero hit, doc: lightning x1.5 — archers have no lightning)
    ultBoxes: 3, // 🛠️ สิ่งประดิษฐ์สุดเพี้ยน: 3 boxes + every trap + the base archer pierce shot
    mastery: { atkPct: 0.05, crit: 0.02 }, // bow
  },
}

/** Skill 2 linear "+" numbers: base + per x Stats.s2Lv. Plain numbers so the admin can tune them (skills `s2p.<key>.base|per`);
 *  the S2N functions below read them on every call. Defaults are the v83 values. */
export const S2P = {
  guardCut: { base: 0.4, per: 0.05 }, bloodVamp: { base: 0.15, per: 0.05 }, tauntWeak: { base: 0.2, per: 0.05 },
  rainMul: { base: 0.8, per: 0.15 }, hawkCrit: { base: 0.2, per: 0.05 }, trapPush: { base: 30, per: 10 },
  mshieldTake: { base: 0.4, per: 0.05 }, novaMul: { base: 0.8, per: 0.15 }, arcaneMul: { base: 0.6, per: 0.1 },
  renewHeal: { base: 0.3, per: 0.05 }, kyrieHp: { base: 0, per: 0.05 }, spearPlus: { base: 0, per: 0.03 },
  smokeHeal: { base: 0, per: 0.03 }, pickRes: { base: 15, per: 5 },
}
const lin = (k: { base: number; per: number }, lv: number) => k.base + k.per * lv

/** Skill 2 numbers by "+" level (Stats.s2Lv) and ★ (Stats.s2Star). data/skill2.ts texts and BattleScene.castSkill2 read these. */
export const S2N = {
  guardCut: (lv: number) => lin(S2P.guardCut, lv), guardTurns: (star: boolean) => (star ? 3 : 2), guardCounters: (star: boolean) => (star ? 2 : 1),
  bloodVamp: (lv: number) => lin(S2P.bloodVamp, lv), bloodTurns: 3, bloodAtk: 0.15,
  tauntWeak: (lv: number) => lin(S2P.tauntWeak, lv), tauntTurns: (star: boolean) => (star ? 3 : 2),
  rainMul: (lv: number) => lin(S2P.rainMul, lv), rainWaves: (star: boolean) => (star ? 2 : 1),
  hawkCrit: (lv: number) => lin(S2P.hawkCrit, lv), hawkTurns: 3, hawkCritDmg: 0.3,
  trapMul: 0.6, trapPush: (lv: number) => lin(S2P.trapPush, lv),
  mshieldTake: (lv: number) => lin(S2P.mshieldTake, lv), mshieldTurns: (star: boolean) => (star ? 5 : 3),
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
}

// ---------- costs / cooldowns ----------
export const autoCost = (job: JobDef, st: Stats) => Math.max(Math.min(10, job.auto.cost), job.auto.cost - st.autoCostCut) // floor 10, unless the class's own cost is lower (Mage 5, 2026-11-13)
/** Mana the ult costs (Mage, Swordsman, Cleric since v86); 0 for every other job. v102: pass st for the base Cleric ult (+clUltMana by Ult node Lv). */
export const ultCost = (job: JobDef, st?: Stats) => (job.resource === 'mana' ? (job.ult.cost ?? 0) + (job.id === 'cleric' && (job.ult.cost ?? 0) > 0 ? st?.clUltMana ?? 0 : 0) : 0)
/** Ult cooldown in hero turns before relics (gear smashCd lowers it for every job). */
export const ultCooldown = (job: JobDef, st: Stats) => {
  const cdCut = Math.round((PLAYER.smashCd - st.smashCd) / BATTLE.msPerTurn)
  return Math.max(2, job.ult.cd + st.mgUltCd - cdCut)
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
    varA: { mul: 2.2, hp: 0.03, stunTurns: 1, per: 0.02, cap: 0.2, branch: 'mk_c' }, // 🐅 Tiger Knuckle: single heavy strike (boss first) + stun · +2% per คอมโบ point
    varB: { mul: 1.0, mdefHp: 0.04, per: 0.02, cap: 0.2, branch: 'mk_h' }, // 💥 Chain Crush: AoE true wave · +2% per หมัดแค้น point
    leg: { crossCap: 0.15, guardCap: 0.06, hpCap: 0.09, cross: 'mk_c', guard: 'mk_h', hp: 'mk_a' }, heirNeed: 6,
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
/** Damage of one hit at `mul`, before monster DEF: "lo–hi (คริ X)". Magic crits only with spellCrit. */
export function hitText(st: Stats, mul: number, magic: boolean) {
  const b = hitBase(st, magic), c = magic ? st.spellCrit : st.crit
  return `${range(b.lo * mul, b.hi * mul)}${c > 0 ? ` (คริ ${r(b.hi * mul * st.critMul)})` : ''}`
}
const heal = (st: Stats, n: number) => r(n * (1 + st.healAmp))
const shield = (st: Stats, n: number) => r(n * (1 + st.shieldAmp))
const resName = (job: JobDef) => (job.resource === 'energy' ? 'Energy' : job.resource === 'rage' ? 'Rage' : 'Mana')

/** ทักษะ 1 (the auto skill) with these stats. */
export function autoInfo(jobId: JobId, st: Stats): InfoRow[] {
  const job = JOBS[jobId], pow = 1 + st.s1Pow
  const out: InfoRow[] = [{ label: 'ใช้', value: `${resName(job)} ${autoCost(job, st)}` }]
  switch (jobId) {
    case 'swordsman': out.push({ label: 'ดาเมจ/ตัว (ทุกตัว)', value: hitText(st, SWORD_MANA.autoMul * pow * (1 + st.pskill), false) }); break
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
      out.push({ label: 'แทง 1 ที', value: hitText(st, KIT.thiefAuto * pow, false) })
      out.push({ label: 'พิษ', value: `+${KIT.thiefAutoPoison} stack (${(st.poisonDmg).toFixed(1)}/stack/เทิร์น)` })
      break
    default: return []
  }
  return out
}

/** Ult with these stats. */
export function ultInfo(jobId: JobId, st: Stats, base?: { str: number; wis: number }, job2?: string): InfoRow[] {
  const job = JOBS[jobId], pow = 1 + st.ultPow, hitPow = pow * (1 + st.ultAmp)
  const out: InfoRow[] = [{ label: 'คูลดาวน์', value: `${ultCooldown(job, st)} เทิร์น${ultCost(job, st) ? ` · Mana ${ultCost(job, st)}` : ''}` }]
  switch (jobId) {
    case 'swordsman':
      out.push({ label: 'ดาเมจ/ตัว (ทุกตัว)', value: hitText(st, (SWORD_MANA.ultMul + st.ultMulAdd) * hitPow * (1 + st.pskill), false) })
      out.push({ label: 'โล่', value: `${shield(st, st.maxHp * Math.max(0, SWORD_MANA.ultShield + st.ultShieldAdd) * pow)}` })
      break
    case 'archer':
      out.push({ label: 'ศรทะลวง (เป้าเดียว)', value: hitText(st, (KIT.archerUlt - st.arUltMulCut) * hitPow, false) })
      if (st.arUltSplash > 0) out.push({ label: 'ทะลุใส่ตัวอื่น', value: hitText(st, st.arUltSplash * hitPow, false) })
      out.push({ label: 'หลบแน่นอน', value: `${1 + st.arUltDodge} ครั้ง` })
      break
    case 'mage': {
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
    case 'thief':
      out.push({ label: `แทง ${KIT.thiefUltHits + st.ultHits} ที ดาเมจ/ที`, value: hitText(st, KIT.thiefUlt * hitPow * (1 + st.thUltAgi), false) })
      out.push({ label: 'หลบแน่นอน', value: `${KIT.thiefUltDodge + st.ultDodge} ครั้ง` })
      break
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
    case 'sw_guard': add('ดาเมจเข้าลด', `−${pct(S2N.guardCut(lv))} · ${S2N.guardTurns(star)} เทิร์น`); add('สวนกลับแน่นอน', `${S2N.guardCounters(star)} ครั้ง`); break
    case 'sw_blood': add('ดูดเลือด + ดูดเลือดสกิล', `+${pct(S2N.bloodVamp(lv))} · ${S2N.bloodTurns} เทิร์น`); add('ดาเมจสกิล/ult', `−${pct(SPELL_VAMP.bloodCut)}${star ? ` · ATK +${pct(S2N.bloodAtk)}` : ''}`); break
    case 'sw_taunt': add('มอนตีเบาลง', `${pct(S2N.tauntWeak(lv))} · ${S2N.tauntTurns(star)} เทิร์น`); break
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
    case 'th_smoke': add('หลบแน่นอน', `${S2N.smokeDodges(star)} ครั้ง`); if (lv) add('ฟื้น HP', `${heal(st, st.maxHp * S2N.smokeHeal(lv))}`); break
    case 'th_pick': add('แทงตัวหน้า', hitText(st, S2N.pickMul(star), false)); add('คืน Energy', `${S2N.pickRes(lv)}`); if (star) add('พิษ', `+${S2N.pickPoison} stack`); break
    case 'th_wound': add('แทงทะลุ DEF', hitText(st, S2N.woundMul(star), false)); add('พิษ', `+${S2N.woundPoison(lv)} stack (${st.poisonDmg.toFixed(1)}/stack/เทิร์น)`); break
  }
  return out
}

// ===== Mage defensive passives (docs/passive_mage_3.md): ⚡ Static Mirage · 🔥 Molten Mantle · ❄️ Glacial Aegis =====
// Node ranks 0-5 land in Stats.mgStatic / mgMolten / mgGlacial (data/trees/mage.ts, branch mage_def). The always-on part
// (dodge / damage cut / DEF) is plain Stats in the node `mod`; BattleScene.hurtHeroCore reads the rest. Turn-based: the doc's seconds became hero turns.
// Counter multipliers are x the hero magic hit (Pm), like every other hero magic proc. Numbers are first guesses.
export const MAGE_DEF = {
  maxRank: 5,
  static: { dodgeCharges: [1, 1, 2, 2, 3], counterBase: 0.2, counterPer: 0.08, shockBase: 0.2, shockPer: 0.05, shockPush: 25, icdTurns: 1 }, // shock = gauge push (micro-stun) · 1 proc per hero turn
  molten: { guardPer: 0.02, thornsBase: 0.25, thornsPer: 0.1, burnStacks: 1, wardPer: 0.05, wardCap: 0.25 }, // ward: shield from burn ticks, total shield capped at 25% max HP
  glacial: { mdefPer: 0.04, defPer: 2, barrierHpPer: 0.06, barrierMatkPer: 0.25, every: 3, chillTurns: 1, novaBase: 0.3, novaPer: 0.1, novaIcdTurns: 3, freezePush: 25 }, // barrier every `every` hero turns · nova ICD in hero turns
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
