// ===== Skill 2 (design/skill-web-v1.md, Q approved 2026-11-03) =====
// Each class picks ONE of three actives at the root of the "ทักษะ 2" line of the skill web.
// Skill 2 casts by itself at the start of the hero's turn (a free extra action) when its cooldown is
// ready, the resource covers the cost and its condition holds. BattleScene.castSkill2() runs the effect.
// Its "+" node (max 3) sets Stats.s2Lv, its ★ node sets Stats.s2Star (one Skill 2 per class, so the keys are shared).
import type { JobId } from './jobs'
import { S2N } from './skill-math'

export type Skill2Id =
  | 'sw_guard' | 'sw_blood' | 'sw_taunt'
  | 'ar_rain' | 'ar_hawk' | 'ar_trap'
  | 'mg_mshield' | 'mg_nova' | 'mg_arcane'
  | 'cl_renew' | 'cl_bless' | 'cl_spear'
  | 'th_smoke' | 'th_pick' | 'th_wound'

export interface Skill2Def {
  id: Skill2Id; job: JobId; icon: string; name: string
  cost: number; cd: number // resource cost, hero turns between casts
  desc: string
  plus: { icon: string; name: string; desc: (lv: number) => string } // max 3, Stats.s2Lv
  star: { icon: string; name: string; desc: string } // max 1, Stats.s2Star
}

const s = (id: Skill2Id, job: JobId, icon: string, name: string, cost: number, cd: number, desc: string, plus: Skill2Def['plus'], star: Skill2Def['star']): Skill2Def =>
  ({ id, job, icon, name, cost, cd, desc, plus, star })

export const SKILL2: Skill2Def[] = [
  // ⚔️ Swordsman (Mana since v28: pool 60, so costs are 0.6x the Rage-era 30/30/25)
  s('sw_guard', 'swordsman', '🛡️', 'ตั้งการ์ด', 18, 4, '2 เทิร์น ดาเมจเข้า −40% + สวนกลับแน่นอน 1 ครั้ง',
    { icon: '🧱', name: 'การ์ดแน่น', desc: (lv) => `ดาเมจเข้า −${40 + lv * 5}%` }, { icon: '⏳', name: 'การ์ดเหล็ก', desc: 'ตั้งการ์ดนาน 3 เทิร์น + สวนแน่นอน 2 ครั้ง' }),
  s('sw_blood', 'swordsman', '🩸', 'เลือดเดือด', 18, 4, '3 เทิร์น ดูดเลือด + ดูดเลือดสกิล +15% · แลกกับดาเมจสกิล/ult −30% ระหว่างนั้น',
    { icon: '🍷', name: 'เลือดข้น', desc: (lv) => `ดูดเลือด + ดูดเลือดสกิล +${15 + lv * 5}%` }, { icon: '👹', name: 'คลั่งเลือด', desc: 'ระหว่างเลือดเดือด ATK +15%' }),
  s('sw_taunt', 'swordsman', '📣', 'ท้าทาย', 15, 4, 'มอนทุกตัวตีเบาลง 20% 2 เทิร์นของมัน',
    { icon: '😠', name: 'ข่มขวัญ', desc: (lv) => `มอนตีเบาลง ${20 + lv * 5}%` }, { icon: '🔔', name: 'ท้าซ้ำ', desc: 'ท้าทายนาน 3 เทิร์น + ได้ Rage 15' }),
  // 🏹 Archer (Energy)
  s('ar_rain', 'archer', '🌧️', 'ฝนธนู', 50, 3, 'ยิงใส่มอนทุกตัว 0.8x',
    { icon: '🏹', name: 'ฝนหนัก', desc: (lv) => `ฝนธนู ${(0.8 + lv * 0.15).toFixed(2)}x` }, { icon: '⛈️', name: 'พายุศร', desc: 'ฝนธนูตก 2 รอบ' }),
  s('ar_hawk', 'archer', '🦅', 'ตาเหยี่ยว', 35, 4, '3 เทิร์น คริ +20%',
    { icon: '👁️', name: 'ตาคม', desc: (lv) => `คริ +${20 + lv * 5}%` }, { icon: '💥', name: 'เล็งจุดตาย', desc: 'ระหว่างตาเหยี่ยว ดาเมจคริ +30%' }),
  s('ar_trap', 'archer', '🪤', 'กับดัก', 30, 3, 'ตัวหน้าโดน 0.6x + ผลักเทิร์นถอย 30',
    { icon: '⛓️', name: 'กับดักหนืด', desc: (lv) => `ผลักเทิร์น ${30 + lv * 10}` }, { icon: '🕸️', name: 'ตาข่าย', desc: 'กับดักโดนมอนทุกตัว' }),
  // 🔮 Mage (Mana)
  s('mg_mshield', 'mage', '🔷', 'Mana Shield', 20, 5, '3 เทิร์น Mana รับดาเมจแทน 40% (1 Mana ต่อ 1 ดาเมจ)',
    { icon: '💠', name: 'โล่มานาหนา', desc: (lv) => `Mana รับแทน ${40 + lv * 5}%` }, { icon: '🔮', name: 'โล่มานาถาวร', desc: 'Mana Shield นาน 5 เทิร์น' }),
  s('mg_nova', 'mage', '❄️', 'วงน้ำแข็ง', 30, 3, 'ทุกตัว 0.8x M.ATK + ช้า 2 เทิร์น',
    { icon: '🧊', name: 'วงหนาว', desc: (lv) => `วงน้ำแข็ง ${(0.8 + lv * 0.15).toFixed(2)}x` }, { icon: '🌨️', name: 'พายุหิมะ', desc: 'ช้านานขึ้น +1 เทิร์น และผลักเทิร์น 15' }),
  s('mg_arcane', 'mage', '✨', 'ลูกศรเวท', 15, 2, 'เป้าเดียว (บอสก่อน) 3 ฮิต ฮิตละ 0.6x M.ATK',
    { icon: '➶', name: 'ศรคม', desc: (lv) => `ฮิตละ ${(0.6 + lv * 0.1).toFixed(1)}x` }, { icon: '🌠', name: 'ฝนดาว', desc: 'ลูกศรเวท +2 ฮิต' }),
  // ✨ Cleric (Mana)
  s('cl_renew', 'cleric', '🌿', 'ฟื้นฟู', 40, 5, `ฮีล ${S2N.renewHeal(0).toFixed(2)}x M.ATK ทุกเทิร์น 4 เทิร์น (ร่ายเมื่อ HP ไม่เต็ม)`, // v37 Q: easier to cast, costs more
    { icon: '🍃', name: 'ฟื้นฟูลึก', desc: (lv) => `ฮีล ${S2N.renewHeal(lv).toFixed(2)}x M.ATK/เทิร์น` }, { icon: '🌳', name: 'ต้นไม้ชีวิต', desc: 'ฟื้นฟูนาน 6 เทิร์น' }),
  s('cl_bless', 'cleric', '🔆', 'โล่แสง', 30, 4, 'โล่ 20% HP สูงสุด (อยู่ 3 เทิร์น)',
    { icon: '🔰', name: 'โล่หนา', desc: (lv) => `โล่ ${20 + lv * 4}% HP` }, { icon: '⏱️', name: 'พรไว', desc: 'คูลดาวน์ โล่แสง −1 เทิร์น' }),
  s('cl_spear', 'cleric', '🔱', 'หอกแสง', 20, 3, 'เรียกหอกแสง 2 เล่ม (ยิงทุกตัวตอนจบเทิร์น)',
    { icon: '⚜️', name: 'หอกคม', desc: (lv) => `หอกแรง +${lv * 10}%` }, { icon: '🌟', name: 'หอกสวรรค์', desc: 'เรียกหอก 4 เล่ม' }),
  // 🗡️ Thief (Energy)
  s('th_smoke', 'thief', '💨', 'ม่านควัน', 40, 4, 'หลบการโจมตีถัดไปแน่นอน 1 ครั้ง',
    { icon: '🌫️', name: 'ควันหอม', desc: (lv) => `ร่ายแล้วฟื้น ${lv * 3}% HP` }, { icon: '👥', name: 'ควันหนา', desc: 'หลบแน่นอน 2 ครั้ง' }),
  s('th_pick', 'thief', '💰', 'ล้วงกระเป๋า', 30, 3, 'แทงตัวหน้า 1x + คืน Energy 15',
    { icon: '🪙', name: 'มือไว', desc: (lv) => `คืน Energy ${15 + lv * 5}` }, { icon: '🎭', name: 'จอมโจร', desc: 'แทงแรง 1.6x + ติดพิษ 3 stack' }),
  s('th_wound', 'thief', '🩸', 'แผลลึก', 35, 3, 'แทงตัวหน้า 1.2x ทะลุ DEF + พิษ 4 stack',
    { icon: '🔪', name: 'แผลฉีก', desc: (lv) => `พิษ ${4 + lv} stack` }, { icon: '⚰️', name: 'แผลมรณะ', desc: 'แทงแรง 2x ทะลุ DEF' }),
]
export const skill2ById = (id: string) => SKILL2.find((x) => x.id === id)
export const skill2Of = (job: JobId) => SKILL2.filter((x) => x.job === job)
