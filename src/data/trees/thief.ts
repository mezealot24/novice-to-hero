// 🗡️ Thief skill tree + talents. Owned by the thief design thread; edit freely, only this file.
// Spec: design/skill-tree-thief.md. Identity: "the more you dodge, the stronger you get" + poison to melt bosses.
// Class passive เงาบาง (fleeFloor 0.1 in JOBS.thief.mod): monsters hit the Thief at least 70% instead of 80%.
// Node and talent ids are save data: never rename or remove a shipped id (retire it by leaving it out of the UI instead).
import { node as n, talent as t, type ClassTree } from '../tree-types'
import { doubleAtkChance, doubleSlash } from '../game-data'

export const tree: ClassTree = {
  branches: [
    { id: 'thief_a', job: 'thief', name: 'พิษ', icon: '☠️', blurb: 'พิษซ้อนหนา ล้มบอสช้าแต่ชัวร์ · ระเบิดพิษ' },
    { id: 'thief_b', job: 'thief', name: 'เงา', icon: '👤', blurb: 'หลบ · หลบแล้วฟื้น · หลบแล้วสวน' },
    { id: 'thief_core', job: 'thief', name: 'แก่นโจร', icon: '🗡️', blurb: 'Double Strike → Double Slash (สายตีหมู่)' }, // no ATTACH -> core column
  ],
  nodes: [
    n('thief_a1', 'thief_a', 1, '🧪', 'เคลือบพิษ', 3, (lv) => `พิษ +${lv} stack ต่อ hit`, (lv) => ({ poison: lv })),
    n('thief_a2', 'thief_a', 2, '☠️', 'พิษเข้มข้น', 3, (lv) => `ดาเมจพิษ +${lv}/stack`, (lv) => ({ poisonDmg: lv })),
    n('thief_a3', 'thief_a', 3, '🫙', 'พิษสะสม', 3, (lv) => `เพดานพิษ 12 → ${12 + lv * 3} stack`, (lv) => ({ poisonCap: 3 * lv })),
    n('thief_a4', 'thief_a', 4, '💣', 'ระเบิดพิษ', 1, () => 'มอนตาย: พิษครึ่งหนึ่งกระจายไปทุกตัวที่เหลือ', () => ({ poisonSpread: 1 })),
    n('thief_b1', 'thief_b', 1, '🌫️', 'ย่องเบา', 3, (lv) => `Flee +${lv * 4} · มอนตีโดนขั้นต่ำ −${lv * 2}%`, (lv) => ({ flee: 4 * lv, fleeFloor: 0.02 * lv })),
    n('thief_b2', 'thief_b', 2, '🌙', 'หายใจในเงา', 3, (lv) => `หลบได้แล้วฟื้น ${lv * 2}% HP สูงสุด`, (lv) => ({ dodgeHeal: 0.02 * lv })),
    n('thief_b3', 'thief_b', 3, '🔪', 'มีดคู่', 3, (lv) => `คอมโบ +${lv * 5}% · คริ +${lv * 3}%`, (lv) => ({ combo: 0.05 * lv, crit: 0.03 * lv })),
    // Q 2026-11-03, RO style: Double Strike (RO Double Attack: Lv 1 20% ... Lv 9 52%, Lv 10 60%; the extra hit CAN crit, unlike RO)
    // -> Double Slash (needs Double Strike Lv 5): ทักษะ 1 แทงพิษ becomes a 2-hit AoE on the front monster + up to 3 more.
    n('thief_core1', 'thief_core', 0, '🗡️', 'D.Strike', 10, (lv) => `Double Strike: ตีปกติ + Double Slash มีโอกาส ${Math.round(doubleAtkChance(lv) * 100)}% ตีเพิ่ม 1 ที (คริได้) · เป้าเดียว`, (lv) => ({ doubleAtk: lv })),
    { ...n('thief_core2', 'thief_core', 1, '⚔️', 'D.Slash', 10, (lv) => { const d = doubleSlash(lv); return `Double Slash: ทักษะ 1 เปลี่ยนเป็นฟันหมู่: 2 ที ทีละ ${Math.round(d.mul * 100)}% +${d.flat} ใส่ตัวหน้า + รอบข้างอีก 3 ตัว · ติด Double Strike ได้` }, (lv) => ({ dSlash: lv })), parentLv: 5 },
    n('thief_b4', 'thief_b', 4, '👤', 'เงาสวน', 1, () => 'หลบได้ทุกครั้ง = แทงสวน 0.8x (ติดพิษได้)', () => ({ dodgeStrike: 1 })),
  ],
  talents: [
    // ----- row 1 · Job Lv 5 · ตั้งตัว -----
    t('th_t1a', 1, '🐈', 'ฝีเท้าแมว', 2, (r) => `Flee +${r === 1 ? 8 : 14} · หลบโชคดี +${r === 1 ? 3 : 5}%`, (r) => ({ flee: r === 1 ? 8 : 14, luckyDodge: r === 1 ? 0.03 : 0.05 })),
    t('th_t1b', 1, '💨', 'ม่านควัน', 2, (r) => `เริ่มทุกเวฟ หลบแน่นอน ${r} ครั้ง`, (r) => ({ waveDodge: r })),
    t('th_t1c', 1, '🩸', 'หนังหนา', 2, (r) => `HP สูงสุด +${r === 1 ? 40 : 80}`, (r) => ({ maxHp: r === 1 ? 40 : 80 })),
    // ----- row 2 · Job Lv 10 · จังหวะ -----
    t('th_t2a', 2, '⚡', 'ขโมยจังหวะ', 2, (r) => `หลบได้ → Energy +${r === 1 ? 15 : 25}`, (r) => ({ dodgeEnergy: r === 1 ? 15 : 25 })),
    t('th_t2b', 2, '🎯', 'จุดบอด', 2, (r) => `คริ +${r === 1 ? 6 : 10}% (คริไม่พลาด ทะลุ DEF)`, (r) => ({ crit: r === 1 ? 0.06 : 0.1 })),
    t('th_t2c', 2, '🧪', 'ซองพิษ', 2, (r) => `แทงพิษใช้ Energy 40 → ${r === 1 ? 30 : 24}`, (r) => ({ autoCostCut: r === 1 ? 10 : 16 })),
    // ----- row 3 · Job Lv 20 · เงาพริ้ว (ult) -----
    t('th_t3a', 3, '👥', 'เงาซ้อน', 2, (r) => `เงาพริ้ว หลบแน่นอน 2 → ${2 + r} ครั้ง`, (r) => ({ ultDodge: r })),
    t('th_t3b', 3, '🌪️', 'พายุมีด', 2, (r) => `เงาพริ้ว แทง 4 → ${r === 1 ? 6 : 7} ที`, (r) => ({ ultHits: r === 1 ? 2 : 3 })),
    t('th_t3c', 3, '☠️', 'มีดอาบพิษ', 2, (r) => `เงาพริ้ว แต่ละทีติดพิษ +${r === 1 ? 2 : 3} stack`, (r) => ({ ultPoison: r === 1 ? 2 : 3 })),
    // ----- row 4 · Job Lv 30 · ล้มบอส -----
    t('th_t4a', 4, '🧫', 'กัดกร่อน', 2, (r) => `มอนที่ติดพิษ ≥ 10 stack รับดาเมจ +${r === 1 ? 15 : 25}%`, (r) => ({ poisonAmp: r === 1 ? 0.15 : 0.25 })),
    t('th_t4b', 4, '🗡️', 'นักฆ่า', 2, (r) => `ดาเมจคริ +${r === 1 ? 30 : 50}%`, (r) => ({ critMul: r === 1 ? 0.3 : 0.5 })),
    t('th_t4c', 4, '🌑', 'ร่างเงา', 2, (r) => `มอนตีโดนขั้นต่ำ −${r === 1 ? 5 : 8}% (ต่ำสุด 60%)`, (r) => ({ fleeFloor: r === 1 ? 0.05 : 0.08 })),
  ],
}
