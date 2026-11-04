// ===== Status tab texts: what each base stat does, generic lines + lines for the CURRENT class only (Q 2026-11-04). =====
// Numbers come from PER_POINT (meta.ts), so a balance change updates the text too. Novice sees generic lines only.
// A line gets the stat's total (b) and points above the start (d) so it can show what the hero gets right now.
import { PER_POINT, type BaseStat } from './meta'
import type { JobId } from './jobs'

type Line = string | ((b: number, d: number) => string)
export interface StatInfo { generic: Line[]; byClass: Partial<Record<JobId, Line[]>> }

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
  },
  wis: {
    generic: [(b) => `ฮีล/โล่แรง +${f1(P.wis.healAmp * 100)}%/แต้ม (ตอนนี้ +${Math.round(P.wis.healAmp * 100 * b)}%)`, (b) => `M.DEF ${pctK(b, P.wis.mdefK)} · ต้านทาน ${pctK(b, P.wis.tenacityK)}`],
    byClass: { swordsman: [manaRegen], mage: [manaRegen], cleric: [manaRegen, 'ฮีลทุกท่าคิดจาก M.ATK แล้วคูณฮีลแรงนี้'] },
  },
  dex: {
    generic: [`Hit +${P.dex.hit}/แต้ม`, `P.ATK ขั้นต่ำ +${f1(P.dex.minPct * 100)}%/แต้ม (ดาเมจนิ่งขึ้น)`],
    byClass: {
      archer: [(_b, d) => `P.ATK +${P.str.atk}/แต้ม (ตอนนี้ +${P.str.atk * d})`],
      swordsman: [(_b, d) => `สวนกลับ +${f1(P.off.swordDexCounter * 100)}%/แต้ม (ตอนนี้ +${f1(P.off.swordDexCounter * 100 * d)}%)`],
      cleric: [(_b, d) => `หอกแสง +${P.off.clericDexSpear}x M.ATK/แต้ม (ตอนนี้ +${(P.off.clericDexSpear * d).toFixed(2)}x)`],
    },
  },
  int: {
    generic: [(_b, d) => `M.ATK +${P.int.matk}/แต้ม (ตอนนี้ +${P.int.matk * d})`],
    byClass: {
      swordsman: [maxMana], mage: [maxMana, 'ดาเมจเวททุกท่ามาจาก M.ATK'], cleric: [maxMana, 'เวท + ฮีลทั้งหมดใช้ M.ATK: แสงศักดิ์สิทธิ์ · หอกแสง · Holy Light · ฮีล · ฟื้นฟู · ไฟชำระ'],
      thief: [(_b, d) => `ดาเมจพิษ +0.1/stack/แต้ม (ตอนนี้ +${f1(0.1 * d)})`],
    },
  },
  luk: {
    generic: [`หลบโชคดี · พรตำนาน · อีเวนต์หายาก · ดรอปหายาก`],
    byClass: {
      novice: [(b) => `คริ +1% ต่อ 3 แต้ม (ตอนนี้ ${f1(P.luk.crit * 100 * b)}%)`],
      swordsman: [(b) => `คริ +1% ต่อ 3 แต้ม (ตอนนี้ ${f1(P.luk.crit * 100 * b)}%)`],
      archer: [(b) => `คริ +1% ต่อ 3 แต้ม (ตอนนี้ ${f1(P.luk.crit * 100 * b)}%)`],
      thief: [(b) => `คริ +1% ต่อ 3 แต้ม (ตอนนี้ ${f1(P.luk.crit * 100 * b)}%)`],
      mage: [(b) => `คริเวท +1% ต่อ 6 แต้ม (ตอนนี้ ${f1(P.off.mageLukSpellCrit * 100 * b)}%)`],
      cleric: [(b) => `คริ +1% ต่อ 3 แต้ม (ตอนนี้ ${f1(P.luk.crit * 100 * b)}%)`, (b) => `เรียกหอกแสง ${f1(P.luk.spear * 100)}%/แต้ม ต่อเทิร์น (ตอนนี้ ${f1(Math.min(P.luk.spearCap, P.luk.spear * b) * 100)}%, สูงสุด ${P.luk.spearCap * 100}%)`],
    },
  },
  agi: {
    generic: [`ความเร็วเทิร์น +${f1(P.agi.aspdPct * 100)}%/แต้ม (ตีบ่อยขึ้น)`, `Flee +${P.agi.flee}/แต้ม`, (_b, d) => `คอมโบ ${pctK(d, P.agi.comboK)}`],
    byClass: { thief: [(_b, d) => `เงาพริ้วแรง +2%/แต้ม (ตอนนี้ +${2 * d}%)`] },
  },
}

/** Lines for this stat and class, already filled with the hero's numbers. */
export function statLines(stat: BaseStat, job: JobId, total: number) {
  const info = STAT_INFO[stat], d = Math.max(0, total - 1)
  const fill = (l: Line) => (typeof l === 'string' ? l : l(total, d))
  return { generic: info.generic.map(fill), cls: (info.byClass[job] ?? []).map(fill) }
}
