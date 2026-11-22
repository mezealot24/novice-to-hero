// ===== Jobs (classes). Novice -> one of 5 base classes after beating the first dungeon's boss. =====
// Each job: a stat focus, a resource that drives its automatic skill, a tap-to-use ultimate on a
// turn cooldown, and the card tags it draws at level-up (plus one common card every time).
import type { Resource, Stats, Tag } from './game-data'

export type JobId = 'novice' | 'swordsman' | 'archer' | 'mage' | 'cleric' | 'thief'
export type AttackStyle = 'melee' | 'ranged' | 'magic'

export interface JobSkill { name: string; icon: string; desc: string }
export interface JobDef {
  id: JobId; name: string; icon: string; tex: string; blurb: string; focus: string
  resource: Resource | null; attack: AttackStyle; tags: Tag[]; mod: Partial<Stats>
  auto: JobSkill & { cost: number }; ult: JobSkill & { cd: number; cost?: number } // ult cost: Mana (Mage, Swordsman)
}

/** repickGems (Q 2026-11-04): a class can switch to another base class for gems. Pure respec: Job Lv/EXP stay,
 *  the skill web refunds every point, talents clear (re-place them free). Gems are earnable free, so this stays cheap. */
export const JOB_CHANGE = { needClears: 1, classMaxJobLevel: 40, repickGems: 30 }
export const RES_RULES = {
  rageMax: 100, rageOnHit: 12, rageOnHurt: 8,
  energyMax: 100, energyPerTurn: 25,
  manaPerTurnMul: 3, // resRegen (3 + WIS) x this, per hero turn
}
/** Mage (Q 2026-11-03): no Mana Shield; every spell costs Mana, the basic attack is a weak free magic bolt. */
export const MAGE_SPELL = {
  autoMul: 0.4, // Wizard ลูกไฟระเบิด x Pm (0.9 until the 2026-11-13 auto rework: cost 36 -> 5, so Mage fireMul 1 -> 0.45 and the Wizard keeps its 0.9 : 1 ratio)
  barrier: 1.5, // ult barrier x M.ATK (2 until the class rebalance)
  basicMul: 0.6, // basic attack: magic projectile 0.6x M.ATK, free
  boltPerHit: 2, // card Lightning Bolt: Mana per hit, cast only when Mana covers every hit
  fireBolt: 8, // card ลูกไฟ: Mana per fireball, skipped when Mana is short
}

/** Swordsman (Q 2026-11-03): Rage is gone, the knight runs on a small Mana pool like RO (design/swordsman-mana-nerf.md).
 *  A STR/VIT build gets only the base pool and regen, so skills are rationed and the basic swing + counters carry the fight. */
export const SWORD_MANA = {
  auto: 20, // old ฟันพายุ cost, unused since ดาบสยบมนตร์ (SWORD_S1.mana, flat; Berserker pays JOB2 autoCost Rage)
  ult: 25, // ดาบพิพากษา (plus its turn cooldown; booked ult waits for Mana like the Mage's)
  autoMul: 1.25, // ฟันพายุ x P.ATK (1.3 before the class rebalance 2026-11-03, 1.15 in v40, 1.25 after the lifesteal cut 2026-11-04)
  ultMul: 1.5, // ดาบพิพากษา 🌊 คลื่นดาบ x P.ATK on every monster (Q 2026-11-21 Riven-style rework; was 1.2 instant, 1.4 before the class rebalance)
  // ⚔️ ปลุกดาบ (Q 2026-11-21, picked "2 steps: awaken + auto wave"): the ult wakes the blade for awakenTurns hero turns
  // (P.ATK +awakenAtk, every basic swing also cuts the next monster for cleaveShare), then 🌊 คลื่นดาบ fires on its own
  // the first time a monster is under execLow HP, or on the last awakened turn. Job1 Swordsman + Knight (🔱 Pierce of Judgement, Q 2026-11-23: one boss-first thrust instead of the AoE wave); Berserker keeps its ult.
  awakenTurns: 3, awakenAtk: 0, cleaveShare: 0.5, // awakenAtk 0.2 -> 0 (Q 2026-11-22: replaced by the STR buff + ✨ เคลือบดาบสวรรค์)
  // Q 2026-11-22: ปลุกดาบ gives STR +awakenStr[ult Lv] (P.ATK via PER_POINT.str.atk) and ✨ เคลือบดาบสวรรค์: every physical hit while awakened
  // adds hpPct + strPer[ult Lv] per 10 total STR (incl. the buff) of the target's CURRENT HP. Boss / mini take awakenBigShare of it.
  awakenStr: [20, 25, 30, 35, 50], awakenHpPct: 0.025, awakenStrPer: [0.005, 0.006, 0.007, 0.008, 0.01], awakenBigShare: 0.5,
  ultShield: 0.2, // Job1 ดาบพิพากษา no longer reads this (Q 2026-11-22: no shield on cast; talents / cards ultShieldAdd still give one). Unused since the Knight got 🔱 Pierce of Judgement (Q 2026-11-23); kept so old admin overrides still validate.
  // (history) ดาบพิพากษา shield, share of max HP (reworked 0.15 -> 0.20 so pumping VIT translates into a meaningful barrier)
  // ⚖️ คำพิพากษา (Q 2026-11-21, execute curve Q sent): an ult hit deals + execMax x (missing HP / execCapMiss), capped at execCapMiss missing
  // (2.667% per 1% missing, +200% at 75% missing). A multiplier on our P.ATK hit (not % of the monster's HP), so the x4/x10 boss HP of PR #160
  // can't blow it up; bosses / minis take execBigShare of the bonus. Full curve on 🌊 คลื่นดาบ; the 2nd / 3rd job ults (Knight, Lord Knight,
  // Berserker, Warlord) take execLineShare of it (they hit far more often).
  execMax: 2, // + damage at execCapMiss missing HP
  execCapMiss: 0.75, // missing HP share where the bonus caps
  execLow: 0.3, // 🌊 fires on its own once a monster is under this HP share
  execBigShare: 0.5, // boss / mini: share of the bonus they take
  execLineShare: 0.25, // 2nd / 3rd job ults: share of the bonus (+50% max)
}

/** 🌊 คลื่นดาบ fires now? turnsLeft = awakened hero turns left counting this one (1 = the last). */
export function swordWaveNow(turnsLeft: number, hpFracs: number[]): boolean {
  if (turnsLeft <= 0 || !hpFracs.length) return false
  return turnsLeft === 1 || hpFracs.some((f) => f < SWORD_MANA.execLow)
}

/** ⚔️ ดาบสยบมนตร์ (Q 2026-11-21): the Skill 1 of the whole Swordsman line (Berserker pays its flat Rage cost instead of the Mana table). Lv 1-5 = the ทักษะ 1 "+" node Lv.
 *  Cleanse the hero's CC, one hit of [P.ATK x atkPct + STR x str + base x Base Lv] (option "Base Dmg x BaseLv only", the flat part
 *  turned into P.ATK units in battle), then the target is silenced silenceTurns monster turns, its cast is cut and it loses its next turn. */
export const SWORD_S1 = {
  atkPct: [1.2, 1.4, 1.6, 1.8, 2.0], str: [0.25, 0.5, 0.75, 1.0, 1.25], base: [20, 40, 60, 80, 100], mana: 15, // mana: flat Mana at every Lv (Q 2026-11-22, was 6/12/18/24/30), admin key swordS1.mana
  cd: 5, silenceTurns: 2,
}
/** Skill 1 Lv (1..5) from Stats.swS1Lv (the "+" node Lv; 0 points still casts Lv 1). */
export const swordS1Lv = (st: { swS1Lv: number }) => Math.min(SWORD_S1.atkPct.length, Math.max(1, Math.round(st.swS1Lv || 0)))
/** Ult Lv (1..5) from Stats.swUltLv (the Ult root node Lv; 0 points still casts Lv 1). */
export const swordUltLv = (st: { swUltLv: number }) => Math.min(SWORD_MANA.awakenStr.length, Math.max(1, Math.round(st.swUltLv || 0)))
/** ✨ เคลือบดาบสวรรค์ share of the target's current HP per hit, at this total STR (buff included). */
export const swordCoatPct = (lv: number, str: number) => SWORD_MANA.awakenHpPct + Math.floor(Math.max(0, str) / 10) * SWORD_MANA.awakenStrPer[lv - 1]
/** Raw damage of one ดาบสยบมนตร์ hit before DEF / crit: P.ATK x pct + STR x k + base x Base Lv. */
export function swordS1Raw(lv: number, patk: number, str: number, baseLv: number): number {
  const i = Math.min(SWORD_S1.atkPct.length, Math.max(1, Math.round(lv))) - 1
  return patk * SWORD_S1.atkPct[i] + str * SWORD_S1.str[i] + SWORD_S1.base[i] * Math.max(1, baseLv)
}

/** Swordsman-line ults that run ⚔️ ปลุกดาบ + the auto wave AND take the FULL ⚖️ execute curve (+ ⚖️ คมพิพากษา): job1 ดาบพิพากษา
 *  and the Knight / Lord Knight 🔱 Pierce of Judgement (Q 2026-11-23: "ได้ผลของสาย ult swordsman ทั้งหมด · Execute 30% เท่า Swordman").
 *  Berserker / Warlord keep their own ult and take execLineShare. */
export const swordAwakenUlt = (job2?: string) => !job2 || job2 === 'knight'

/** ⚖️ คำพิพากษา: damage multiplier of a Swordsman-line ult hit on a target at hpFrac (0..1) of its max HP.
 *  share = execLineShare for the 2nd / 3rd job ults, 1 for 🌊 คลื่นดาบ. */
export function swordExecMul(hpFrac: number, big: boolean, share = 1, maxAdd = 0): number {
  const S = SWORD_MANA, f = Math.min(1, Math.max(0, Number.isFinite(hpFrac) ? hpFrac : 1))
  const bonus = Math.min(1, (1 - f) / Math.max(0.01, S.execCapMiss)) * (S.execMax + maxAdd)
  return 1 + bonus * share * (big ? S.execBigShare : 1)
}

/** Cleric kit numbers (class rebalance 2026-11-03: was heal 22%, ult shield 35% + heal 15%; gear/cards should make up the gap).
 *  v58 melee hybrid (Q 2026-11-04): basic attack = mace/book smash on P.ATK (STR); spells (light, spear, Holy Light, ไฟชำระ) on M.ATK (INT).
 *  Ult: ultAtk x P.ATK to every monster + ultLights Holy Light (ultLight x M.ATK each, random target) + shield ultShield of max HP that lasts ultShieldTurns hero turns.
 *  Q 09:50: every Priest heal = x M.ATK (heal, ฟื้นฟู, ไฟชำระ) then x (1 + ฮีลแรง from WIS); shields = x max HP, last shieldTurns hero turns, total capped at shieldCap of max HP.
 *  Per-level node numbers live in skill-math.ts KIT. */
// v108 (Q 2026-11-07): Ult back to v58: ultAtk 2 -> 1.5, root adds smash P.ATK again · ultManaLv 5 -> 0 (flat Mana 30; the v102 nerf was for the 400% Ult)
export const CLERIC_KIT = { heal: 0.7, smite: 1.4, basic: 1.1, ultAtk: 1.5, ultLights: 3, ultLight: 0.8, ultShield: 0.14, ultShieldTurns: 3, purifyHeal: 1, shieldTurns: 3, shieldCap: 0.5, ultMana: 30, ultManaLv: 0 } // ultMana: v86 Q 2026-11-06, the ult costs Mana like Mage / Swordsman · v102 nerf: +ultManaLv per Ult node Lv above 1 (30/35/40/45/50)

/** Spell vamp (Q 2026-11-04): skill lifesteal, its own stat. AoE skills heal 1/3; Skill 2 เลือดเดือด trades skill damage for it. */
export const SPELL_VAMP = { aoe: 1 / 3, bloodCut: 0.15 }

const pc0 = (n: number) => `${Math.round(n * 100)}%`
/** One line for every Swordsman-line ult desc (job1 here, Knight / Berserker in jobs2.ts). */
export const swordExecDesc = (share: number) => `⚖️ คำพิพากษา: เป้า HP ยิ่งหาย ยิ่งแรง (สูงสุด +${pc0(SWORD_MANA.execMax * share)}) · บอส/มินิ ได้ครึ่งเดียว`
export const SWORD_EXEC_DESC = swordExecDesc(SWORD_MANA.execLineShare) // 2nd / 3rd job ults

export const JOBS: Record<JobId, JobDef> = {
  novice: {
    id: 'novice', name: 'โนวิส', icon: '🌱', tex: 'novice', blurb: 'มือใหม่ ทำได้ทุกอย่างนิดหน่อย', focus: 'อะไรก็ได้',
    resource: null, attack: 'melee', tags: ['crit', 'speed', 'guard', 'blood', 'fire', 'venom'], mod: {},
    auto: { name: '-', icon: '', cost: 0, desc: 'ยังไม่มี' }, ult: { name: 'ทุบ', icon: '💢', cd: 4, desc: 'ทุบมอนทุกตัว' },
  },
  swordsman: {
    id: 'swordsman', name: 'นักดาบ', icon: '⚔️', tex: 'hero_swordsman', blurb: 'ยืนหน้า ถึก ฟันโดนหลายตัว · Mana น้อย: สกิลออกได้จำกัด ดาเมจหลักมาจากฟันธรรมดา + สวนกลับ', focus: 'STR · VIT',
    resource: 'mana', attack: 'melee', tags: ['guard', 'blood'], mod: { maxHp: 25, def: 3, counter: 0.02 }, // HP/DEF partly back 2026-11-04 after the lifesteal cut
    auto: { name: 'ดาบสยบมนตร์', icon: '🤐', cost: SWORD_S1.mana, desc: `ล้าง CC บนตัวเรา แล้วฟันเป้าเดี่ยว (ตัวที่กำลังร่ายก่อน)\nมอนติดใบ้ ${SWORD_S1.silenceTurns} เทิร์น · โดนขัดร่าย · เสียเทิร์น\nคูลดาวน์ ${SWORD_S1.cd} · แรงขึ้นตาม Lv (ดูตารางขวา) · Mana ${SWORD_S1.mana} ทุก Lv` },
    ult: { name: 'ดาบพิพากษา', icon: '🗡️', cd: 4, cost: SWORD_MANA.ult, desc: `Mana ${SWORD_MANA.ult}: ⚔️ ปลุกดาบ ${SWORD_MANA.awakenTurns} เทิร์น\nระหว่างปลุก: STR +${SWORD_MANA.awakenStr.join('/')} (ตาม Lv) · ✨ เคลือบดาบสวรรค์: ทุกฮิตกายภาพ +${pc0(SWORD_MANA.awakenHpPct)} HP ที่เหลือของเป้า (+${SWORD_MANA.awakenStrPer.map((x) => +(x * 100).toFixed(1)).join('/')}% ต่อ 10 STR)\nตีปกติฟันตัวถัดไปด้วย · ตีโดนแน่นอนจนกว่าจะปล่อยคลื่น\n🌊 คลื่นดาบใส่ทุกตัว ปล่อยเองเมื่อมีมอน HP < ${pc0(SWORD_MANA.execLow)} (หรือเทิร์นสุดท้าย)\n${swordExecDesc(1)}` },
  },
  archer: {
    id: 'archer', name: 'นักธนู', icon: '🏹', tex: 'hero_archer', blurb: 'ยิงจากไกล แม่น เร็ว ATK โตตาม DEX · หลบแล้วได้โล่ (สายพริ้วไหว)', focus: 'DEX · AGI',
    resource: 'energy', attack: 'ranged', tags: ['crit', 'speed'], mod: { hit: 8, aspd: 0.16, maxHp: 15 },
    auto: { name: 'ยิงคู่', icon: '🎯', cost: 40, desc: 'Energy 40: ยิง 2 ดอก ดอกละ 0.9x' },
    ult: { name: 'ศรทะลวง', icon: '🎯', cd: 4, desc: 'กระโดดถอย หลบการโจมตีถัดไปแน่นอน + ยิงเป้าเดียว (บอส/ตัวที่ HP เยอะสุด) 5x' },
  },
  mage: {
    id: 'mage', name: 'จอมเวท', icon: '🔮', tex: 'hero_mage', blurb: 'เวทแรง ตีทั้งกลุ่ม ไม่มีวันพลาด แต่ตัวบาง · ตีปกติเป็นลูกเวทเบาๆ ดูด Mana · ลูกไฟ/ult ต้องร่าย 1 เทิร์น โดนตีอาจร่ายแตก (DEX ช่วย)', focus: 'INT · WIS',
    resource: 'mana', attack: 'magic', tags: ['fire', 'storm', 'crit'], mod: { maxRes: 20, maxHp: 10 },
    auto: { name: 'ลูกไฟระเบิด', icon: '🔥', cost: 5, desc: 'Mana 5: ปล่อยไฟใส่ทุกตัวทันที เบาแต่ใช้ได้เกือบทุกเทิร์น (ไม่ต้องร่าย · ไม่แตก) · ดาเมจสเกล M.ATK 90% : P.ATK 10% (ติดไฟถ้ามีพรเผาไหม้) · ตัวเลขดูในหน้าสกิล' }, // v85: instant again; numbers in skill-math MAGE_CAST (jobs.ts can't import it) · 2026-11-13 rework: cost 36 -> 5
    ult: { name: 'เวทธาตุ', icon: '☄️', cd: 5, cost: 30, desc: `Mana 30: ร่าย 1 เทิร์น แล้วปล่อยเทิร์นถัดไป (แรงขึ้น · โดนตีแรงระหว่างร่ายอาจแตก: คืน Mana บางส่วน + คูลดาวน์สั้นลง + ร่ายครั้งหน้าไม่แตก) · เลือกธาตุตอนเริ่มรอบ · ⚡ สายฟ้า เป้าเดียว 6 ฮิต (0.3–1.2x/ฮิต) · 🔥 ไฟ 2x + เผาซ้อน · ❄️ น้ำแข็ง 1.6x + ช้า/แช่แข็ง · ทุกธาตุได้บาเรีย ${MAGE_SPELL.barrier}x M.ATK` },
  },
  cleric: {
    id: 'cleric', name: 'นักบวช', icon: '✨', tex: 'hero_cleric', blurb: 'นักบวชสายบู๊: ทุบด้วยกระบอง/คัมภีร์ (STR) ร่ายแสง (INT) ฮีลตัวเอง มีโล่', focus: 'STR · INT · WIS',
    resource: 'mana', attack: 'melee', tags: ['holy', 'guard'], mod: { maxHp: 10, mdef: 0.05 },
    auto: { name: 'ฮีล / แสงศักดิ์สิทธิ์', icon: '💖', cost: 25, desc: `Mana 25 (ร่ายเพิ่มจากการทุบทุกเทิร์น): HP ต่ำกว่า 75% ฮีล ${CLERIC_KIT.heal}x M.ATK ก่อนทุบ · ไม่งั้นทุบแล้ว 🔱หอกแสงใส่ 2 ตัวหน้า ${CLERIC_KIT.smite}x M.ATK (ตัวข้างๆ 50%)` },
    ult: { name: 'พรคุ้มครอง', icon: '🙏', cd: 4, cost: CLERIC_KIT.ultMana, desc: `Mana ${CLERIC_KIT.ultManaLv ? `${CLERIC_KIT.ultMana}–${CLERIC_KIT.ultMana + 4 * CLERIC_KIT.ultManaLv} (ตาม Lv Ult)` : CLERIC_KIT.ultMana}: ทุบใส่ทุกตัว ${Math.round(CLERIC_KIT.ultAtk * 100)}% P.ATK + 🔱หอกแสง ${CLERIC_KIT.ultLights} เล่มใส่ตัวสุ่ม (${CLERIC_KIT.ultLight}x M.ATK · ตัวข้างๆ 50%) + โล่ ${Math.round(CLERIC_KIT.ultShield * 100)}% ของ HP สูงสุด ${CLERIC_KIT.ultShieldTurns} เทิร์น (โล่นักบวชรวมไม่เกิน ${Math.round(CLERIC_KIT.shieldCap * 100)}% HP)` },
  },
  thief: {
    id: 'thief', name: 'โจร', icon: '🗡️', tex: 'hero_thief', blurb: 'เร็ว หลบเก่ง แทงสองที ติดพิษ · Double Strike: มีโอกาสตีเพิ่ม 1 ที · เงาบาง: มอนตีโดนขั้นต่ำ 15% (อาชีพอื่น 20%) · 👤 เกจเงา: หลบ / DOUBLE / เงาพริ้ว เติมเกจ เต็ม = ร่างเงา (ตีคริแน่ + ทักษะ 1 ไม่ใช้ Energy)', focus: 'AGI · LUK',
    resource: 'energy', attack: 'melee', tags: ['venom', 'speed'], mod: { flee: 10, aspd: 0.24, poison: 1, fleeFloor: 0.1 },
    auto: { name: 'แทงพิษ', icon: '🧪', cost: 45, desc: 'Energy 45: แทง 1x (แรงขึ้นตาม STR ดาเมจสกิลกายภาพ) + พิษ 3 stack (ติด Double Strike ได้) แล้วตีปกติ 1 เทิร์น (สลับคม · ร่างเงาไม่ต้องสลับ)' },
    ult: { name: 'เงาพริ้ว', icon: '👤', cd: 4, desc: 'หลบ 2 ครั้งถัดไปแน่นอน + แทงสุ่ม 4 ที ทีละ 0.7x (แรงขึ้นตามสัดส่วน AGI ต่อแต้มทั้งหมด ดูเลขที่หน้าสถานะ AGI)' },
  },
}
export const BASE_JOBS: JobId[] = ['swordsman', 'archer', 'mage', 'cleric', 'thief']
/** Class skill level -> power multiplier (+10% per level above 1). */
export const skillPow = (lv: number) => 1 + 0.1 * (Math.max(1, lv) - 1)
