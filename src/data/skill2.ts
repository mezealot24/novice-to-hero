// ===== Skill 2 (design/skill-web-v1.md, Q approved 2026-11-03) =====
// Each class picks ONE of three actives at the root of the "ทักษะ 2" line of the skill web.
// Skill 2 casts by itself at the start of the hero's turn (a free extra action) when its cooldown is
// ready, the resource covers the cost and its condition holds. BattleScene.castSkill2() runs the effect.
// Its "+" node (max 5 since v83; Stats.s2Lv = Lv x 3/5, so Lv 5 = the old Lv 3) sets Stats.s2Lv, its ★ node sets Stats.s2Star (one Skill 2 per class, so the keys are shared).
import type { JobId } from './jobs'
import { KIT, S2N } from './skill-math'

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
  plus: { icon: string; name: string; desc: (lv: number) => string } // lv = Stats.s2Lv 0..3 (v83: the "+" node has 5 levels, Lv n -> s2Lv n x 3/5, data/tree.ts)
  star: { icon: string; name: string; desc: string } // max 1, Stats.s2Star
}

/** Share -> "25%" (one decimal at most, so a fractional "+" Lv still shows the real number). */
const pc = (x: number) => `${Math.round(x * 1000) / 10}%`

const s = (id: Skill2Id, job: JobId, icon: string, name: string, cost: number, cd: number, desc: string, plus: Skill2Def['plus'], star: Skill2Def['star']): Skill2Def =>
  ({ id, job, icon, name, cost, cd, desc, plus, star })

export const SKILL2: Skill2Def[] = [
  // ⚔️ Swordsman (Reworked: distinct Guard / Blood / Taunt roles + fixed resource restoration bug)
  s('sw_guard', 'swordsman', '🛡️', 'ตั้งการ์ด', 14, 4, 'ได้โล่ 10% HP + นาน 2 เทิร์น ดาเมจเข้า −40% + สวนกลับแน่นอน 1 ครั้ง\nสวนระหว่างตั้งการ์ด แรงเพิ่ม 50% ของดาเมจที่โดนในเทิร์นนั้น + P.DEF x2.5',
    { icon: '🧱', name: 'การ์ดแน่น', desc: (lv) => `ดาเมจเข้า −${pc(S2N.guardCut(lv))} · สวน +${pc(S2N.guardBack(lv, false))} ดาเมจที่โดน + P.DEF x${S2N.guardDef(lv)}` }, { icon: '⏳', name: 'การ์ดเหล็ก', desc: 'ตั้งการ์ดนาน 3 เทิร์น + โล่ 18% HP + สวนแน่นอน 2 ครั้ง + สวนคืนดาเมจที่โดน +30%' }),
  s('sw_blood', 'swordsman', '🩸', 'เลือดเดือด', 18, 4, '3 เทิร์น ดูดเลือด + ดูดเลือดสกิล +20% · แลกกับโดนตีแรงขึ้น +10% ระหว่างนั้น',
    { icon: '🍷', name: 'เลือดข้น', desc: (lv) => `ดูดเลือด + ดูดเลือดสกิล +${20 + lv * 5}%` }, { icon: '👹', name: 'คลั่งเลือด', desc: 'ระหว่างเลือดเดือด ATK +20%' }),
  s('sw_taunt', 'swordsman', '📣', 'ท้าทาย', 14, 4, 'มอนทุกตัวตีเบาลง 20% นาน 2 เทิร์นของมัน + เกราะแตก 1 เทิร์น · +20% ดาเมจสวนกลับใส่มอนที่ติดท้าทาย',
    { icon: '😠', name: 'ข่มขวัญ', desc: (lv) => `มอนตีเบาลง ${20 + lv * 5}% + เกราะแตก` }, { icon: '🔔', name: 'ท้าซ้ำ', desc: 'ท้าทายนาน 3 เทิร์น + เกราะแตก 2 เทิร์น + ฟื้น Resource 15 + โล่ 10% HP' }),
  // 🏹 Archer (Energy)
  s('ar_rain', 'archer', '🌧️', 'ฝนธนู', 50, 3, 'ยิงใส่มอนทุกตัว 0.8x',
    { icon: '🏹', name: 'ฝนหนัก', desc: (lv) => `ฝนธนู ${(0.8 + lv * 0.15).toFixed(2)}x` }, { icon: '⛈️', name: 'พายุศร', desc: 'ฝนธนูตก 2 รอบ' }),
  s('ar_hawk', 'archer', '🦅', 'ตาเหยี่ยว', 35, 4, '3 เทิร์น คริ +20%',
    { icon: '👁️', name: 'ตาคม', desc: (lv) => `คริ +${20 + lv * 5}%` }, { icon: '💥', name: 'เล็งจุดตาย', desc: 'ระหว่างตาเหยี่ยว ดาเมจคริ +30%' }),
  s('ar_trap', 'archer', '🕳️', 'กับดัก', 30, 3, 'ตัวหน้าโดน 0.6x + ผลักเทิร์นถอย 30',
    { icon: '⛓️', name: 'กับดักหนืด', desc: (lv) => `ผลักเทิร์น ${30 + lv * 10}` }, { icon: '🕸️', name: 'ตาข่าย', desc: 'กับดักโดนมอนทุกตัว' }),
  // 🔮 Mage (Mana)
  s('mg_mshield', 'mage', '🔷', 'Mana Shield', 20, 5, 'ร่ายทันที · 3 เทิร์น Mana รับดาเมจแทน 40% (1 Mana ต่อ 1 ดาเมจ)',
    { icon: '💠', name: 'โล่มานาหนา', desc: (lv) => `Mana รับแทน ${40 + lv * 5}%` }, { icon: '🔮', name: 'โล่มานาถาวร', desc: 'Mana Shield นาน 5 เทิร์น' }),
  s('mg_nova', 'mage', '❄️', 'วงน้ำแข็ง', 30, 3, 'ร่ายทันที · ทุกตัว 0.8x M.ATK + ช้า 2 เทิร์น',
    { icon: '🧊', name: 'วงหนาว', desc: (lv) => `วงน้ำแข็ง ${(0.8 + lv * 0.15).toFixed(2)}x` }, { icon: '🌨️', name: 'พายุหิมะ', desc: 'ช้านานขึ้น +1 เทิร์น และผลักเทิร์น 15' }),
  s('mg_arcane', 'mage', '✨', 'ลูกศรเวท', 15, 2, 'ร่ายทันที · เป้าเดียว (บอสก่อน) 3 ฮิต ฮิตละ 0.6x M.ATK',
    { icon: '➶', name: 'ศรคม', desc: (lv) => `ฮิตละ ${+(0.6 + lv * 0.1).toFixed(2)}x` }, { icon: '🌠', name: 'ฝนดาว', desc: 'ลูกศรเวท +2 ฮิต' }),
  // ✨ Cleric (Mana)
  s('cl_renew', 'cleric', '🌿', 'ฟื้นฟู', 40, 5, `ฮีล ${S2N.renewHeal(0).toFixed(2)}x M.ATK ทุกเทิร์น 4 เทิร์น (ร่ายเมื่อ HP ไม่เต็ม)`, // v37 Q: easier to cast, costs more
    { icon: '🍃', name: 'ฟื้นฟูลึก', desc: (lv) => `ฮีล ${S2N.renewHeal(lv).toFixed(2)}x M.ATK/เทิร์น` }, { icon: '🌳', name: 'ต้นไม้ชีวิต', desc: 'ฟื้นฟูนาน 6 เทิร์น' }),
  s('cl_bless', 'cleric', '🔆', 'พรแสง', 30, 4, `${S2N.blessTurns} เทิร์น STR/DEX/INT/WIS +${S2N.blessStat} + ล้างดีบัฟ ${S2N.blessCleanse} อย่าง (ร่ายเมื่อพรหมด)`, // v77 Q 2026-11-06: passive -> active
    { icon: '🛡️', name: 'Kyrie Eleison', desc: (lv) => `ร่ายพรแล้วได้บาเรีย ${Math.round(S2N.kyrieHp(lv) * 100)}% HP สูงสุด (แตกเมื่อโดน ${S2N.kyrieHits} ฮิต)` },
    { icon: '✨', name: 'Gloria', desc: `ระหว่างพรแสง LUK +${S2N.gloriaLuk} (คริ / หลบโชคดี / โอกาสติดผลสูงขึ้น)` }),
  s('cl_spear', 'cleric', '🔱', 'หอกแสง', 20, 3, 'เรียกหอกแสง 2 เล่ม (ตอนจบเทิร์น ใส่ตัวสุ่ม · ตัวข้างๆ 50%)',
    { icon: '⚜️', name: 'หอกคม', desc: (lv) => `หอกแรง +${lv * 10}%` }, { icon: '🌟', name: 'หอกสวรรค์', desc: 'เรียกหอก 4 เล่ม' }),
  // 🗡️ Thief (Energy)
  s('th_smoke', 'thief', '💨', 'ม่านควัน', 35, 4, `หลบแน่นอน ${S2N.smokeDodges(false)} ครั้ง + Shroud ${S2N.smokeTurns} เทิร์น (FLEE +${pc(S2N.smokeFlee)} · skillCrit +${pc(S2N.smokeSkillCrit)}) · การโจมตีครั้งแรกหลังร่าย = Sightless Raid ${S2N.raidMul}x + Exposed (รับดาเมจ +${pc(S2N.exposedPct)} ${S2N.exposedTurns} เทิร์น) + Blind ${S2N.smokeBlindTurns} เทิร์น`,
    { icon: '🌫️', name: 'ควันหอม', desc: (lv) => `ร่ายแล้วฟื้น ${pc(S2N.smokeHeal(lv))} HP + Energy ${S2N.smokeRes(lv)}` },
    { icon: '👥', name: 'ควันหนา', desc: `หลบแน่นอน ${S2N.smokeDodges(true)} ครั้ง · Exposed +${pc(S2N.exposedStar)} · ใน Shroud ดาเมจคริ +${pc(S2N.smokeCritDmg)}` }),
  s('th_pick', 'thief', '💰', 'ล้วงกระเป๋า', 30, 3, `แทงตัวหน้า 1x + คืน Energy 15 + ขโมยตาม stat เด่นของมอน: STR→P.ATK +${Math.round(KIT.thiefSteal.atk * 100)}% · AGI→Energy +${KIT.thiefSteal.res} · INT→พิษ ${KIT.thiefSteal.poison} stack · VIT→เกราะแตก ${KIT.thiefSteal.brkTurns} เทิร์น · WIS→ฮีล ${Math.round(KIT.thiefSteal.heal * 100)}% · LUK/DEX→คริ +${Math.round(KIT.thiefSteal.crit * 100)}% (บัฟ ${KIT.thiefSteal.turns} เทิร์น)`,
    { icon: '💰', name: 'มือไว', desc: (lv) => `คืน Energy ${15 + lv * 5}` }, { icon: '🎭', name: 'จอมโจร', desc: 'แทงแรง 1.6x + ติดพิษ 3 stack + ขโมย 2 อย่าง (stat เด่นอันดับ 1 และ 2)' }),
  s('th_wound', 'thief', '🩸', 'แผลลึก', 35, 3, `แทงตัวหน้า ${S2N.woundMul(false)}x ทะลุ DEF + พิษ ${S2N.woundPoison(0)} stack + Wound ${S2N.woundStacks} stack (สูงสุด ${S2N.woundMax(0)} · ${S2N.woundTurns} เทิร์น) · ตีปกติ/D.Strike/Back Stab ใส่เป้า Wound ≥ ${S2N.bladeAt} = Blade's End ${S2N.bladeMul}x ทะลุ DEF + ตัดฮีลมอน ${pc(S2N.bladeHealCut)} ${S2N.bladeCutTurns} เทิร์น (1 ครั้ง/เทิร์น/ตัว) · เป้าติดพิษ + Wound รับดาเมจ +${pc(S2N.woundPriv)}`,
    { icon: '🔪', name: 'แผลฉีก', desc: (lv) => `พิษ ${S2N.woundPoison(lv)} stack · Wound สูงสุด ${S2N.woundMax(lv)} · D.Strike ${pc(S2N.woundStrikeChance)} แปะ Wound +1` },
    { icon: '⚰️', name: 'แผลมรณะ', desc: `แทงแรง ${S2N.woundMul(true)}x ทะลุ DEF · Wound ${S2N.woundStarStacks} stack · Blade's End คริได้` }),
]
export const skill2ById = (id: string) => SKILL2.find((x) => x.id === id)
export const skill2Of = (job: JobId) => SKILL2.filter((x) => x.job === job)
