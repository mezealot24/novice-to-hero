// ===== Status tab texts: what each base stat does, generic lines + lines for the CURRENT class only (Q 2026-11-04). =====
// Numbers come from PER_POINT (meta.ts), so a balance change updates the text too. Novice sees generic lines only.
// A line gets the stat's total (b) and points above the start (d) so it can show what the hero gets right now.
import { COMBO } from './game-data'
import { critShieldOf, PER_POINT, thiefUltAgiBonus, type BaseStat } from './meta'
import type { JobId } from './jobs'
import type { Job2Id } from './jobs2'
import type { Job3Id } from './jobs3'
import { tankBulk } from './tank-scale'
import { breakChance, KIT, KIT2, MAGE_CAST } from './skill-math'
import { shadowWard } from './thief-offmeta'

type Line = string | ((b: number, d: number, pool: number) => string) // pool = stat points from Base Lv (statPool)
export interface StatInfo { generic: Line[]; byClass: Partial<Record<JobId, Line[]>>; byJob2?: Partial<Record<string, Line[]>> }

const P = PER_POINT
const f1 = (n: number) => (Math.round(n * 10) / 10).toString()
const pctK = (x: number, k: number) => `${Math.round((x / (x + k)) * 100)}%`
const meleeAtk: Line = (_b, d) => `P.ATK +${P.str.atk}/แต้ม (ตอนนี้ +${P.str.atk * d})`
const manaRegen: Line = (b) => `ฟื้น Mana +${f1(P.wis.resRegen * 3)}/เทิร์น/แต้ม (ตอนนี้ +${f1(P.wis.resRegen * 3 * b)})`
const maxMana: Line = (_b, d) => `Max Mana +${P.int.maxRes}/แต้ม (ตอนนี้ +${P.int.maxRes * d})`

export const STAT_INFO: Record<BaseStat, StatInfo> = {
  str: {
    generic: [(b) => `ดาเมจสกิลกายภาพ +${f1(P.str.pskill * 100)}%/แต้ม (ตอนนี้ +${f1(P.str.pskill * 100 * b)}%)`],
    byClass: {
      novice: [meleeAtk], swordsman: [meleeAtk], cleric: [meleeAtk, 'ตีปกติ (ทุบประชิด) + Ult ทุบทุกตัว ใช้ P.ATK'], thief: [meleeAtk],
      archer: ['ไม่เพิ่ม P.ATK (นักธนูใช้ DEX)', (_b, d) => `ศรทะลวงแรง +${f1(P.off.archerStrUlt * 100)}%/แต้ม (ตอนนี้ +${f1(P.off.archerStrUlt * 100 * d)}%)`],
      mage: [meleeAtk, 'โหนด "กายสู่เวท": STR นับเป็น INT ด้วย'],
    },
  },
  vit: {
    generic: [`HP +${P.vit.maxHp} และ +${f1(P.vit.maxHpPct * 100)}%/แต้ม`, `P.DEF +${P.vit.def}/แต้ม`, `ฟื้น HP เล็กน้อย`, (_b, d) => `สวนกลับ ${pctK(d, P.vit.counterK)}`],
    byClass: { cleric: ['โล่นักบวชคิดจาก Max HP (อยู่ 3 เทิร์น รวมไม่เกิน 50% HP)'] },
    byJob2: { sage: [(_b) => `Magic Rod ดูดเวทคืน Mana เพิ่ม +${f1(KIT2.sage.rodVitMana)}/VIT + โล่ ${f1(KIT2.sage.rodVitShield)}/VIT`] },
  },
  wis: {
    generic: [(b) => `ฮีล/โล่แรง +${f1(P.wis.healAmp * 100)}%/แต้ม (ตอนนี้ +${Math.round(P.wis.healAmp * 100 * b)}%)`, (b) => `M.DEF ${pctK(b, P.wis.mdefK)} · ต้านทาน ${pctK(b, P.wis.tenacityK)}`],
    byClass: { swordsman: [manaRegen], mage: [manaRegen], cleric: [manaRegen, 'ฮีลทุกท่าคิดจาก M.ATK แล้วคูณฮีลแรงนี้'], thief: [(_b, d) => `Shadow Ward: ลดดาเมจเวท/ตาเหยี่ยว/ตีโดนแน่ ${Math.round(shadowWard(d) * 100)}% (สูงสุด ${Math.round(KIT.thiefWardCap * 100)}%)`] },
    byJob2: { sage: [(_b, d) => `ดาเมจธาตุ +${f1(KIT2.sage.wisElemDmg * 100)}%/แต้ม (สูงสุด +${Math.round(KIT2.sage.wisElemCap * 100)}%, ตอนนี้ +${f1(Math.min(KIT2.sage.wisElemCap, KIT2.sage.wisElemDmg * d) * 100)}%)`] },
  },
  dex: {
    generic: [`Hit +${P.dex.hit}/แต้ม`, `P.ATK ขั้นต่ำ +${f1(P.dex.minPct * 100)}%/แต้ม (ดาเมจนิ่งขึ้น)`],
    byClass: {
      archer: [(_b, d) => `P.ATK +${P.str.atk}/แต้ม (ตอนนี้ +${P.str.atk * d})`],
      swordsman: [(_b, d) => `สวนกลับ +${f1(P.off.swordDexCounter * 100)}%/แต้ม (ตอนนี้ +${f1(P.off.swordDexCounter * 100 * d)}%)`],
      cleric: [(_b, d) => `หอกแสง +${P.off.clericDexSpear}x M.ATK/แต้ม (ตอนนี้ +${(P.off.clericDexSpear * d).toFixed(2)}x)`],
      mage: [(b) => `ลดโอกาสร่ายแตก ${f1(MAGE_CAST.breakDex * 100)}%/แต้ม (ตอนนี้แตก ${f1(breakChance(b, 0) * 100)}% ต่อครั้งที่โดนตีแรง ≥ ${f1(MAGE_CAST.breakMinHp * 100)}% HP ก่อนต้านทาน · เฉพาะ ult)`],
    },
    byJob2: { sage: [(_b, d) => `สกิลคริ +${f1(KIT2.sage.dexSkillCrit * 100)}%/แต้ม (สูงสุด ${Math.round(KIT2.sage.dexSkillCritCap * 100)}%) · คอมโบ +${f1(KIT2.sage.dexCombo * 100)}%/แต้ม`] },
  },
  int: {
    generic: [(_b, d) => `M.ATK +${P.int.matk}/แต้ม (ตอนนี้ +${P.int.matk * d})`],
    byClass: {
      swordsman: [maxMana], mage: [maxMana, 'ดาเมจเวททุกท่ามาจาก M.ATK'], cleric: [maxMana, 'เวท + ฮีลทั้งหมดใช้ M.ATK: หอกแสง · ฮีล · ฟื้นฟู · ไฟชำระ'],
      thief: [(_b, d) => `ดาเมจพิษ +0.1/stack/แต้ม (ตอนนี้ +${f1(0.1 * d)})`],
    },
    byJob2: { sage: [(b) => `Auto Spell +${f1(KIT2.sage.autoInt * 100)}%/INT · On-Hit Perk +${f1(KIT2.sage.perk.fireInt * 100)}%/INT (ตอน ${b} INT)`] },
  },
  luk: {
    generic: [`หลบโชคดี · พรตำนาน · อีเวนต์หายาก · ดรอปหายาก`, (b) => `ลดโอกาสคริของมอน 1% ต่อ ${f1(0.01 / P.luk.critShield)} แต้ม (สูงสุด ${Math.round(COMBO.critShieldCap * 100)}%, ตอนนี้ ${f1(critShieldOf(b) * 100)}%)`, `เวทคริ (หอก/สายฟ้า/ไฟ/น้ำแข็ง) ได้จากของ · perk · tree เท่านั้น LUK ช่วยเฉพาะ Mage`],
    byClass: {
      novice: [(b) => `คริ +1% ต่อ 3 แต้ม (ตอนนี้ ${f1(P.luk.crit * 100 * b)}%)`],
      swordsman: [(b) => `คริ +1% ต่อ 3 แต้ม (ตอนนี้ ${f1(P.luk.crit * 100 * b)}%)`],
      archer: [(b) => `คริ +1% ต่อ 3 แต้ม (ตอนนี้ ${f1(P.luk.crit * 100 * b)}%)`],
      thief: [(b) => `คริ +1% ต่อ 3 แต้ม (ตอนนี้ ${f1(P.luk.crit * 100 * b)}%)`, () => `หลบโชคดี (LUCKY!) +${KIT.thiefLuckyRes} Energy (1 ครั้ง/เทิร์น)`],
      mage: [(b) => `คริเวท +1% ต่อ 6 แต้ม (ตอนนี้ ${f1(P.off.mageLukSpellCrit * 100 * b)}%)`, (b) => `สกิลคริ +1% ต่อ 10 แต้ม (สูงสุด ${Math.round(P.off.mageLukSkillCritCap * 100)}%, ตอนนี้ ${f1(Math.min(P.off.mageLukSkillCritCap, P.off.mageLukSkillCrit * b) * 100)}%)`],
      cleric: [(b) => `คริ +1% ต่อ 3 แต้ม (ตอนนี้ ${f1(P.luk.crit * 100 * b)}%)`, (b) => `เรียกหอกแสง ${f1(P.luk.spear * 100)}%/แต้ม ต่อเทิร์น (ตอนนี้ ${f1(Math.min(P.luk.spearCap, P.luk.spear * b) * 100)}%, สูงสุด ${P.luk.spearCap * 100}%)`],
    },
    byJob2: { sage: [(_b, d) => `คริ On-hit/Auto Spell แรง +${f1(KIT2.sage.lukProcCritMul * 100)}%/แต้ม (สูงสุด +${Math.round(KIT2.sage.lukProcCritCap * 100)}%, ตอนนี้ +${f1(Math.min(KIT2.sage.lukProcCritCap, KIT2.sage.lukProcCritMul * d) * 100)}%)`] },
  },
  agi: {
    generic: [
      (_b, d) => `ความเร็วเทิร์น +${f1(P.agi.aspdPct * 100)}%/แต้ม (ตอนนี้ +${f1(P.agi.aspdPct * 100 * d)}% · เติมเกจ ATB 100 ไวขึ้น ออกเทิร์นถี่ขึ้น)`,
      (b) => `Flee +${P.agi.flee}/แต้ม (ตอนนี้ +${P.agi.flee * b})`,
      (_b, d) => `คอมโบ ${pctK(d, P.agi.comboK)} (ตีซ้ำในเทิร์นเดิม) · กันมอนคอมโบ ${pctK(d, COMBO.defK)}`,
    ],
    byClass: { thief: [(_b, d, pool) => `เงาพริ้วแรงตามสัดส่วน AGI ต่อแต้มทั้งหมด: ลงเต็ม = +${Math.round(KIT.thiefUltAgiK * 100)}% (สูงสุด +${Math.round(KIT.thiefUltAgiK * KIT.thiefUltAgiShareCap * 100)}%, ตอนนี้ +${Math.round(thiefUltAgiBonus(d, pool) * 100)}%)`] },
  },
}

/** Derived combat penetration & elemental caps surfaced in tooltips / stats screen. */
export const DERIVED_STAT_CAPS = {
  physPen: { label: 'เจาะเกราะกายภาพ', cap: 0.75, desc: 'ลด P.DEF เป้าหมายเมื่อคิดดาเมจกายภาพ (สูงสุด 75%)' },
  magPen: { label: 'เจาะต้านเวท', cap: 0.75, desc: 'เจาะ M.DEF เป้าหมายเมื่อคิดดาเมจเวท/ธาตุ (สูงสุด 75%)' },
  elemDmg: { label: 'ดาเมจธาตุ', cap: 2.0, desc: 'คูณดาเมจธาตุจากเวท สกิลธาตุ และเอฟเฟกต์อาวุธ (สูงสุด +200%)' },
} as const

/** Lines for this stat and class, already filled with the hero's numbers. */
export function statLines(stat: BaseStat, job: JobId, total: number, job2?: string, pool = 0, job3?: Job3Id) {
  const info = STAT_INFO[stat], d = Math.max(0, total - 1)
  const fill = (l: Line) => (typeof l === 'string' ? l : l(total, d, pool))
  const j2Lines = job2 && info.byJob2?.[job2] ? info.byJob2[job2]!.map(fill) : []
  const tank = stat === 'vit' ? tankBulk(job, job2 as Job2Id | undefined, job3) : undefined // 🛡️ tank class bulk (data/tank-scale.ts)
  const tankLines = tank ? [`🛡️ ${tank.name}: HP +${tank.vitHp}/VIT เพิ่ม (ตอนนี้ +${tank.vitHp * d}) · ลดดาเมจ ${Math.round(tank.dr * 100)}% · ลดดาเมจสกิลมอน อีก ${Math.round(tank.skillDr * 100)}%`] : []
  return { generic: info.generic.map(fill), cls: [...(info.byClass[job] ?? []).map(fill), ...j2Lines, ...tankLines] }
}
