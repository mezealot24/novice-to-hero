// 🗡️ Thief skill tree + talents. Owned by the thief design thread; edit freely, only this file.
// Spec: design/skill-tree-thief.md. Identity: "the more you dodge, the stronger you get" + poison to melt bosses.
// Class passive เงาบาง (fleeFloor 0.1 in JOBS.thief.mod): monsters hit the Thief at least 70% instead of 80%.
// Node and talent ids are save data: never rename or remove a shipped id (retire it by leaving it out of the UI instead).
import { node as n, talent as t, type ClassTree } from '../tree-types'
import { doubleAtkChance } from '../game-data'

// Q 2026-11-03: RO style Double Strike gates ทักษะ 2 (max 5, Lv 5 = 60%; the extra hit CAN crit, unlike RO).
// Must be 5/5 before picking ม่านควัน / ล้วงกระเป๋า / แผลลึก. Id kept from v36 (was a 10-level core node; save.ts refunds the extra).
const s2Gate = n('thief_core1', 'thief_s2', 0, '🗡️', 'D.Strike', 5, (lv) => `Double Strike: ตีปกติ + แทงพิษ มีโอกาส ${Math.round(doubleAtkChance(lv) * 100)}% ตีเพิ่ม 1 ที (คริได้) · เป้าเดียว · เต็ม 5 แล้วเลือกทักษะ 2 ได้`, (lv) => ({ doubleAtk: lv }))

export const tree: ClassTree = {
  s2Gate,
  branches: [
    { id: 'thief_a', job: 'thief', name: 'พิษ', icon: '☠️', blurb: 'พิษซ้อนหนา ล้มบอสช้าแต่ชัวร์ · ระเบิดพิษ' },
    { id: 'thief_b', job: 'thief', name: 'เงา', icon: '👤', blurb: 'หลบ · หลบแล้วฟื้น · หลบแล้วสวน' },
    // Q 2026-11-03 rework: two new core columns (no ATTACH in data/tree.ts)
    { id: 'thief_crit', job: 'thief', name: 'คริ', icon: '🎯', blurb: 'คริบ่อย คริแรง · เก็บตัวใกล้ตาย' },
    { id: 'thief_blood', job: 'thief', name: 'ดูดเลือด', icon: '🩸', blurb: 'ตีแล้วฟื้น · พิษฮีล · ฆ่าแล้วฟื้น' },
  ],
  nodes: [
    n('thief_a1', 'thief_a', 1, '🧪', 'เคลือบพิษ', 3, (lv) => `พิษ +${lv} stack ต่อ hit`, (lv) => ({ poison: lv })),
    n('thief_a2', 'thief_a', 2, '☠️', 'พิษเข้มข้น', 3, (lv) => `ดาเมจพิษ +${lv}/stack (INT ทุก 10 แต้มก็ +1/stack)`, (lv) => ({ poisonDmg: lv })),
    n('thief_a3', 'thief_a', 3, '🫙', 'พิษสะสม', 3, (lv) => `เพดานพิษ 12 → ${12 + lv * 3} stack`, (lv) => ({ poisonCap: 3 * lv })),
    n('thief_a4', 'thief_a', 4, '💣', 'ระเบิดพิษ', 1, () => 'มอนตาย: พิษครึ่งหนึ่งกระจายไปทุกตัวที่เหลือ', () => ({ poisonSpread: 1 })),
    n('thief_b1', 'thief_b', 1, '🌫️', 'ย่องเบา', 3, (lv) => `Flee +${lv * 4} · มอนตีโดนขั้นต่ำ −${lv * 2}%`, (lv) => ({ flee: 4 * lv, fleeFloor: 0.02 * lv })),
    n('thief_b2', 'thief_b', 2, '🌙', 'หายใจในเงา', 3, (lv) => `หลบได้แล้วฟื้น ${lv * 2}% HP สูงสุด`, (lv) => ({ dodgeHeal: 0.02 * lv })),
    n('thief_b3', 'thief_crit', 1, '🔪', 'มีดคู่', 3, (lv) => `คอมโบ +${lv * 5}% · คริ +${lv * 3}%`, (lv) => ({ combo: 0.05 * lv, crit: 0.03 * lv })),
    n('thief_c2', 'thief_crit', 2, '💀', 'จุดตาย', 3, (lv) => `ดาเมจคริ +${lv * 10}%`, (lv) => ({ critMul: 0.1 * lv })),
    n('thief_c3', 'thief_crit', 3, '⚡', 'คริชาร์จ', 3, (lv) => `คริแล้ว Energy +${lv * 5}`, (lv) => ({ arCritRes: 5 * lv })),
    n('thief_c4', 'thief_crit', 4, '🪓', 'เพชฌฆาต', 1, () => 'คริใส่มอนที่ HP ต่ำกว่า 30% แรง ×1.5', () => ({ thExecute: 1 })),
    n('thief_l1', 'thief_blood', 1, '🩸', 'คมเลือด', 3, (lv) => `ดูดเลือด +${lv * 3}% (ตีปกติ + คอมโบ · D.Strike ได้ 33%)`, (lv) => ({ lifesteal: 0.03 * lv })),
    n('thief_l2', 'thief_blood', 2, '🧪', 'เลือดพิษ', 3, (lv) => `พิษบนมอนทำดาเมจแล้ว ฮีลเรา ${lv * 10}% ของดาเมจพิษ`, (lv) => ({ poisonLeech: 0.1 * lv })),
    n('thief_l3', 'thief_blood', 3, '🦇', 'กระหายเลือด', 3, (lv) => `ฆ่ามอนได้ ฟื้น ${lv * 2}% HP สูงสุด`, (lv) => ({ killHeal: 0.02 * lv })),
    n('thief_l4', 'thief_blood', 4, '👑', 'ราชันย์โลหิต', 1, () => 'HP ต่ำกว่า 40%: ดูดเลือด ×2', () => ({ bloodKing: 1 })),
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
