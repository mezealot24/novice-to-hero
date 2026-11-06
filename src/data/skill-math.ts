// ===== Skill math: the ONE place hero skill numbers live (BattleScene casts with these, CharacterScene shows them). =====
// BattleScene adds run-only effects on top (relics, run picks, berserk, weaken, monster DEF/flee), so the
// numbers shown in the skill detail panel are "before monster DEF, without run picks".
// พร v2 (Q 2026-11-04, design/skills-v2.md): every hero magic HIT uses magic power Pm = 70% M.ATK + 30% P.ATK
// (LoL feel: physical builds still get something from magic procs). Heals and shields stay on M.ATK.
import { BATTLE, PLAYER, type MonsterKind, type Stats } from './game-data'
import { CLERIC_KIT, JOBS, MAGE_SPELL, SPELL_VAMP, SWORD_MANA, type JobDef, type JobId } from './jobs'
import type { Skill2Def } from './skill2'
import { PACKS } from './dungeons'

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
export const MAGE_CAST = { breakBase: 0.25, breakDex: 0.012, breakMinHp: 0.06, breakRefund: 0.6, fireMul: 1, ultMul: 1.3, brokenUltCd: 2, boltMana: 6 }
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
  archerAuto: 0.9, archerAutoShots: 2, archerVolleyShots: 3, archerUlt: 5,
  mageFire: 2, mageFireStacks: 3, mageIce: 1.6, mageIceChill: 3, mageLightHits: 6, mageLightLo: 0.3, mageLightHi: 1.2,
  clericHealBelow: 0.75, clericSmiteTargets: 2, clericJudge: 2.2, clericJudgeEvery: 3,
  // v58 Priest Ult web (Q 2026-11-04), linear per level: พรคุ้มครอง Lv5 = ult P.ATK +50% · พรอุ่นไอ Lv5 = counter +12.5%, Holy Light 3 -> 8 · เกราะแสง Lv3 = 6% shield per spear volley
  clericUltAtkLv: 0.1, clericWarmCounterLv: 0.025, clericWarmLightLv: 1, clericSpearShieldLv: 0.02,
  spearBase: 0.3, spearMax: 8,
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
    faithMax: 5, faithHeal: 2, faithCast: 1, faith: 0.4, // สวดภาวนา: Skill 1 cast +1 / skill heal +2 Faith · full = burst every monster x Pm per lv
    faithOver: 0.2, overMin: 0.03, faithHealPer: 0.01, // ล้นศรัทธา: overheal >= 3% max HP: chance/lv of +1 Faith · พรเกื้อ: burst heals max HP share per stack per lv
    overBurst: 1.5, overCap: 0.25, // ★ แสงล้นฟ้า: overheal x this as holy damage to the front monster (overheal counted up to 25% max HP per heal)
    wardTurns: 2, ward: 0.06, emergencyAt: 0.3, emergency: 0.08, mend: 0.1, // ม่านพร: after ult −dmg taken/lv N hero turns · ฉุกเฉิน: under 30% HP heal max HP share/lv (1/wave) · ชุบชีวา: ult heals missing HP share/lv
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
    guard: 0.1, guardVit: 0.002, guardCap: 0.4, // 🛡️ Auto Guard: block chance + per VIT point over the start (no off-hand = KIT2.knight.guardShieldless)
    holyVs: 0.25, holyFoes: ['skeleton', 'wisp', 'deathknight', 'hellknight', 'imp', 'necropriest', 'wraith', 'maiden', 'lich', 'bonepriest', 'mummy', 'dunewraith', 'pharaoh', 'gargoyle', ...PACKS.flatMap((p) => p.holyFoes)] as MonsterKind[], // ศรัทธา: undead / demons take +25%
    crossCost: 22, crossCd: 2, crossHits: 2, crossMul: 1, blindTurns: 2, blindHit: 0.2, // ✝️ Holy Cross: per hit P.ATK + Pm on the front monster · blind = its Hit -20%
    gcPay: 0.2, gcPm: 2.5, gcAtk: 1, gcRefund: 0.5, gcRefundAt: 3, // ✨ Grand Cross: pay 20% current HP · all monsters · 3+ hit = half the HP back
    martyrShield: 0.2, // ★ ผู้พลีชีพ: shield share of max HP (Reflect Shield is capped by BATTLE.reflectCap)
    mastery: { atkPct: 0.05, def: 6 }, // mace / sword
  },
  monk: {
    combo: 0.1, chargeMax: 5, chargePerSwing: 1, chargePerCombo: 1, // 👊 หมัดกระแส: power charges from every swing + every combo hit (doc: combo hits only; Priest combo rate is low)
    thunderCost: 0, thunderCd: 2, thunderMin: 2, thunderPm: 0.8, thunderPer: 0.4, // ⚡ Falling Thunder: all charges, all monsters 0.8x Pm x (1 + 40% per charge)
    bellHp: 0.15, bellTaunt: 0.5, bellTurns: 3, bellRing: 0.5, bellBoom: 2, // 🔔 Tempest Bell (Ally 'object'): hero swing rings AoE 0.5x Pm · broken = 2x Pm burst
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
    secondPow: 0.5, // 2 ★ owned = a second pet at this power
    hawkChance: 0.15, hawkLuk: 0.004, hawkCap: 0.6, hawkMul: 0.6, hawkHits: 1, hawkHitsMax: 3, // 🦅 Blitz Beat per hero swing: chance + per LUK (capped), 1..N random targets, never misses
    hawkEvoMul: 0.5, hawkEvoHits: 1, // ★ เหยี่ยวทอง
    boarHp: 0.4, boarTaunt: 0.6, boarEvery: 3, boarMul: 0.8, boarPush: 30, // 🐗 HP = share of hero max HP (VIT) · pulls hits · every N hero turns charges the front (loses its turn; boss: gauge push)
    boarEvoHp: 0.5, boarEvoEvery: 2, // ★ หมูป่าเกราะ: + HP share, charges more often
    wolfSpeed: 0.8, wolfMul: 0.7, wolfBleed: 2, // 🐺 own turn at this share of hero speed (AGI) · bite + bleed (poison stacks) · follows hero combo hits
    wolfEvoMul: 0.5, wolfEvoSpeed: 0.3, // ★ ราชาหมาป่า
    cmdCost: 30, cmdCd: 3, cmdHawkHits: 3, cmdBoarShield: 0.15, cmdPack: 2, cmdPackTurns: 2, cmdPackPow: 0.6, // 📯 สั่งลุย per pet
    ultHawk: 1.2, ultBoar: 1, ultWolf: 1.5, // 🐾 Stampede: all 3 pets hit once (then the base archer pierce shot)
    mastery: { atkPct: 0.05, hit: 8 }, // bow
    // v82 ใยชั้น 2: 🤝 ผูกพัน + 🌿 สัญชาตญาณ, first guesses (design/second-jobs-v1.md §4 v82)
    tree: { petPow: 0.08, petRes: 1, cmdCut: 5, pack3Pow: 0.35, packLead: 0.04, petHeal: 0.005, roar: 10 },
  },
  innovator: {
    traps: 1, mineMul: 1.5, snarePush: 30, freezeMul: 0.6, freezeChill: 2, // 🧰 wave-start trap (random of 3) fires when a monster acts: 💣 Land Mine · 🪤 Ankle Snare (boss: gauge -30) · ❄️ Freezing Trap
    boxCost: 35, boxCd: 3, rareLuk: 0.01, rareLukCap: 1.5, // 🎲 กล่องสุ่ม: rare gadget weight x (1 + LUK x this, capped)
    chickenSoaks: 2, rocketMul: 3, turretMul: 0.6, turretTurns: 3, magnetZeny: 0.3, mirrorCap: 1, colaMul: 1, colaChill: 2, wetTurns: 3, wetAmp: 0.25, // gadgets (☁️ wet: +25% from every hero hit, doc: lightning x1.5 — archers have no lightning)
    ultBoxes: 3, // 🛠️ สิ่งประดิษฐ์สุดเพี้ยน: 3 boxes + every trap + the base archer pierce shot
    mastery: { atkPct: 0.05, crit: 0.02 }, // bow
  },
}

/** Skill 2 numbers by "+" level (Stats.s2Lv) and ★ (Stats.s2Star). data/skill2.ts texts and BattleScene.castSkill2 read these. */
export const S2N = {
  guardCut: (lv: number) => 0.4 + 0.05 * lv, guardTurns: (star: boolean) => (star ? 3 : 2), guardCounters: (star: boolean) => (star ? 2 : 1),
  bloodVamp: (lv: number) => 0.15 + 0.05 * lv, bloodTurns: 3, bloodAtk: 0.15,
  tauntWeak: (lv: number) => 0.2 + 0.05 * lv, tauntTurns: (star: boolean) => (star ? 3 : 2),
  rainMul: (lv: number) => 0.8 + 0.15 * lv, rainWaves: (star: boolean) => (star ? 2 : 1),
  hawkCrit: (lv: number) => 0.2 + 0.05 * lv, hawkTurns: 3, hawkCritDmg: 0.3,
  trapMul: 0.6, trapPush: (lv: number) => 30 + 10 * lv,
  mshieldTake: (lv: number) => 0.4 + 0.05 * lv, mshieldTurns: (star: boolean) => (star ? 5 : 3),
  novaMul: (lv: number) => 0.8 + 0.15 * lv, novaChill: (star: boolean) => 2 + (star ? 1 : 0), novaPush: 15,
  arcaneMul: (lv: number) => 0.6 + 0.1 * lv, arcaneHits: (star: boolean) => 3 + (star ? 2 : 0),
  renewHeal: (lv: number) => 0.3 + 0.05 * lv, renewTurns: (star: boolean) => (star ? 6 : 4), // heal x M.ATK per turn (Q 2026-11-04: Priest heals scale with M.ATK; was 6% +1%/lv max HP)
  // v77 Q 2026-11-06: Priest ทักษะ 2 พรแสง = active Blessing (Mana 30 · cd 4 in skill2.ts). 3 hero turns: STR/DEX/INT/WIS +15 + cleanse 1 debuff on cast
  // · "+" 🛡️ Kyrie Eleison: barrier 5%/lv max HP (Lv3 = 15%), breaks after 3 hits · ★ ✨ Gloria: LUK +30 while blessed
  blessTurns: 3, blessStat: 15, blessCleanse: 1, kyrieHp: (lv: number) => 0.05 * lv, kyrieHits: 3, gloriaLuk: 30,
  spearPlus: (lv: number) => 0.03 * lv, spearCount: (star: boolean) => (star ? 4 : 2), // หอกคม: +10%/lv of the 0.3x base
  smokeHeal: (lv: number) => 0.03 * lv, smokeDodges: (star: boolean) => (star ? 2 : 1),
  pickMul: (star: boolean) => (star ? 1.6 : 1), pickRes: (lv: number) => 15 + 5 * lv, pickPoison: 3,
  woundMul: (star: boolean) => (star ? 2 : 1.2), woundPoison: (lv: number) => 4 + Math.round(lv), // stacks: whole numbers (v83 s2Lv can be fractional)
}

// ---------- costs / cooldowns ----------
export const autoCost = (job: JobDef, st: Stats) => Math.max(10, job.auto.cost - st.autoCostCut)
/** Mana the ult costs (Mage, Swordsman); 0 for every other job. */
export const ultCost = (job: JobDef) => (job.resource === 'mana' ? job.ult.cost ?? 0 : 0)
/** Ult cooldown in hero turns before relics (gear smashCd lowers it for every job). */
export const ultCooldown = (job: JobDef, st: Stats) => {
  const cdCut = Math.round((PLAYER.smashCd - st.smashCd) / BATTLE.msPerTurn)
  return Math.max(2, job.ult.cd + st.mgUltCd - cdCut)
}
export const s2Cooldown = (k: Skill2Def, _st: Stats) => Math.max(1, k.cd)
/** Light spear multiplier x M.ATK (Skill 2 หอกคม adds on top at run start). */
export const spearMul = (st: Stats, s2?: Skill2Def) => KIT.spearBase + st.spearMul + (s2?.id === 'cl_spear' ? S2N.spearPlus(st.s2Lv) : 0)
/** v58 Priest: ult smash multiplier x P.ATK (before ultAmp / pskill), Holy Light count, basic smash x P.ATK. */
export const clericUltSmash = (st: Stats) => CLERIC_KIT.ultAtk * (1 + st.clUltAtk)
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
      out.push({ label: 'ไฟ/ตัว (ทุกตัว)', value: hitText(st, MAGE_CAST.fireMul * pow, true) })
      if (st.mgOverflow > 0) out.push({ label: 'ตอน Mana ≥ 90% (พลังล้น)', value: hitText(st, MAGE_CAST.fireMul * pow * st.mgOverflow, true) })
      break
    case 'cleric':
      out.push({ label: 'ตีปกติ ทุบประชิด (P.ATK)', value: hitText(st, clericBasic(), false) })
      out.push({ label: `ฮีล (HP < ${pct(KIT.clericHealBelow - st.healAt)})`, value: `${heal(st, st.matk * CLERIC_KIT.heal * pow)} HP` })
      out.push({ label: `แสงหลังทุบ ${KIT.clericSmiteTargets + st.smiteTargets} ตัวหน้า ดาเมจ/ตัว`, value: hitText(st, CLERIC_KIT.smite * pow * (1 + st.smiteMul), true) })
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
export function ultInfo(jobId: JobId, st: Stats): InfoRow[] {
  const job = JOBS[jobId], pow = 1 + st.ultPow, hitPow = pow * (1 + st.ultAmp)
  const out: InfoRow[] = [{ label: 'คูลดาวน์', value: `${ultCooldown(job, st)} เทิร์น${ultCost(job) ? ` · Mana ${ultCost(job)}` : ''}` }]
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
      out.push({ label: 'ทุบทุกตัว (P.ATK)', value: hitText(st, clericUltSmash(st) * hitPow * (1 + st.pskill), false) })
      out.push({ label: `Holy Light ${clericUltLights(st)} ลูก ตัวสุ่ม (พลังเวท)`, value: hitText(st, CLERIC_KIT.ultLight * hitPow, true) })
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
    case 'cl_spear': add(`หอกแสง ${S2N.spearCount(star)} เล่ม ดาเมจ/ตัว`, hitText(st, spearMul(st, k), true)); break
    case 'th_smoke': add('หลบแน่นอน', `${S2N.smokeDodges(star)} ครั้ง`); if (lv) add('ฟื้น HP', `${heal(st, st.maxHp * S2N.smokeHeal(lv))}`); break
    case 'th_pick': add('แทงตัวหน้า', hitText(st, S2N.pickMul(star), false)); add('คืน Energy', `${S2N.pickRes(lv)}`); if (star) add('พิษ', `+${S2N.pickPoison} stack`); break
    case 'th_wound': add('แทงทะลุ DEF', hitText(st, S2N.woundMul(star), false)); add('พิษ', `+${S2N.woundPoison(lv)} stack (${st.poisonDmg.toFixed(1)}/stack/เทิร์น)`); break
  }
  return out
}
