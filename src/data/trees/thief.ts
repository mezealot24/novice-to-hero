// 🗡️ Thief skill tree + talents. Owned by the thief design thread; edit freely, only this file.
// Spec: design/thief-rogue-rework-v1.md (Rev 4) + design/p2/P2a-spec.md. Identity: poison that sticks + dodge tempo + conditional leech / crit (no flat-stat filler).
// Class passive เงาบาง (fleeFloor 0.1 in JOBS.thief.mod): monsters hit the Thief at least 70% instead of 80%.
// Node and talent ids are save data: P2a reuses thief_c2/c3/c4 with new meanings, gated by save.ts migrateThiefRogueRework (jobTree reset).
// Node mods are written per OLD level 1..3 (★ = 1): stretchNode() (data/tree.ts) shows 5 levels. INT_FIELDS nodes (poison / poisonCap): desc uses Math.round only.
import { node as n, rk, talent as t, type ClassTree } from '../tree-types'
import { doubleAtkChance } from '../game-data'
import { KIT } from '../skill-math'

// Q 2026-11-03: RO style Double Strike gates ทักษะ 2 (max 5, Lv 5 = 60%; the extra hit CAN crit, unlike RO).
// Must be 5/5 before picking ม่านควัน / ล้วงกระเป๋า / แผลลึก. Id kept from v36 (was a 10-level core node; save.ts refunds the extra).
const s2Gate = n('thief_core1', 'thief_s2', 0, '🗡️', 'D.Strike', 5, (lv) => `Double Strike: ตีปกติ + แทงพิษ มีโอกาส ${Math.round(doubleAtkChance(lv) * 100)}% ตีเพิ่ม 1 ที (คริได้) · เป้าเดียว · เต็ม 5 แล้วเลือกทักษะ 2 ได้`, (lv) => ({ doubleAtk: lv }))

export const tree: ClassTree = {
  s2Gate,
  branches: [
    { id: 'thief_a', job: 'thief', name: 'พิษ', icon: '☠️', blurb: 'พิษสะสม + เจาะเกราะ · พิษลามตอนมอนตาย' },
    { id: 'thief_b', job: 'thief', name: 'เงา', icon: '👤', blurb: 'หลบ · หลบแล้วฟื้น · หลบแล้วสวน' },
    // P2a: one core column (no ATTACH in data/tree.ts -> line 'core'); replaces thief_crit + thief_blood
    { id: 'thief_core', job: 'thief', name: 'เลือด·คริ', icon: '🩸', blurb: 'ดูดเลือดตามสถานะ · คริตามพิษ · ฆ่าแล้วฟื้น' },
  ],
  nodes: [
    n('thief_a1', 'thief_a', 1, '🧪', 'เคลือบพิษอาบคม', 3, (lv) => `พิษ +${Math.round(lv)} stack ต่อ hit · เป้าติดพิษ: เจาะ P.DEF ${Math.round(6 * lv)}%`, (lv) => ({ poison: lv, thPoisonPen: 0.06 * lv })),
    n('thief_a2', 'thief_a', 2, '☠️', 'พิษกัดลึก', 3, (lv) => `ดาเมจพิษ +${lv}/stack (INT ทุก 10 แต้มก็ +1/stack) · ตีมอนติดพิษแรง +${Math.round(8 * lv)}%`, (lv) => ({ poisonDmg: lv, vsPoison: 0.08 * lv })),
    n('thief_a3', 'thief_a', 3, '🏺', 'พิษทนทาน', 3, (lv) => `เพดานพิษ 12 → ${12 + Math.round(3 * lv)} stack · มอนผิวพิษลอกพิษไม่ได้ ${Math.round(25 * lv)}% · D.Strike ติด → พิษ +1`, (lv) => ({ poisonCap: 3 * lv, thToxicHold: 0.25 * lv, thStrikePoison: 1 })),
    n('thief_a4', 'thief_a', 4, '💣', 'ระเบิดพิษลาม', 1, () => `มอนตาย: พิษ ${Math.round(KIT.thiefSpreadShare * 100)}% กระจายไปทุกตัวที่เหลือ · ศพพิษ ≥ ${KIT.thiefPlagueAt} stack: ระเบิดใส่ทุกตัว = พิษ ${KIT.thiefPlagueTurns} เทิร์นของศพ`, () => ({ poisonSpread: 1, thPlagueDeath: 1 })),
    n('thief_b1', 'thief_b', 1, '🌫️', 'ย่องเบา', 3, (lv) => `Flee +${lv * 4} · มอนตีโดนขั้นต่ำ −${lv * 2}%`, (lv) => ({ flee: 4 * lv, fleeFloor: 0.02 * lv })),
    n('thief_b2', 'thief_b', 2, '🌙', 'หายใจในเงา', 3, (lv) => `หลบได้แล้วฟื้น ${lv * 2}% HP สูงสุด`, (lv) => ({ dodgeHeal: 0.02 * lv })),
    n('thief_c1', 'thief_core', 1, '🩸', 'คมเลือดซ้อนสถานะ', 3, (lv) => `ตีเป้าที่ติดสถานะ: ดูดเลือด +${Math.round(3 * lv)}% (ติด ${KIT.thiefKindsAt} ชนิดขึ้นไป ×${KIT.thiefCondLeechMulti}) · กายภาพเท่านั้น`, (lv) => ({ thCondLeech: 0.03 * lv })),
    n('thief_c2', 'thief_core', 2, '🎯', 'จุดตายสะสม', 3, (lv) => `คริ + คริสกิล +${Math.round(5 * lv)}% ที่พิษ ${KIT.thiefStackCritMax} stack บนเป้า (ไล่ตาม stack) · คริกายภาพ → พิษ +1`, (lv) => ({ thStackCrit: 0.00625 * lv, thCritPoison: 1 })),
    n('thief_c3', 'thief_core', 3, '🦇', 'กระหายเลือด', 3, (lv) => `ฆ่ามอน: ฟื้น ${Math.round(4 * lv)}% HP + พิษบนศพ ${KIT.thiefKillPoisonHeal * 100}%/stack (สูงสุด +${Math.round(KIT.thiefKillPoisonHealCap * 100)}%) · Energy +${KIT.thiefKillRes} · คริบอส/มินิครั้งแรกของเทิร์น: ฟื้น ${+(4 * lv * KIT.thiefBossCritLeech).toFixed(1)}% HP + Energy +${KIT.thiefBossCritRes}`, (lv) => ({ thKillLeech: 0.04 * lv })),
    n('thief_c4', 'thief_core', 4, '👑', 'ราชันย์โลหิต', 1, () => `HP ต่ำกว่า ${Math.round(KIT.thiefBloodKingBelow * 100)}%: ดูดเลือด ×${KIT.thiefBloodKingMul} · D.Strike ดูดเลือด ${Math.round(KIT.thiefStrikeLs * 100)}% → ${Math.round(KIT.thiefBloodKingStrikeLs * 100)}% (ไม่ซ้อนกับราชันย์โลหิตของใส่)`, () => ({ thBloodKing: 1 })),
    n('thief_b4', 'thief_b', 4, '👤', 'เงาสวน', 1, () => 'หลบได้ทุกครั้ง = แทงสวน 0.8x (ติดพิษได้)', () => ({ dodgeStrike: 1 })),
  ],
  talents: [
    // ----- row 1 · Job Lv 5 · ตั้งตัว -----
    t('th_t1a', 1, '🐈', 'ฝีเท้าแมว', 2, (r) => `Flee +${r === 1 ? 8 : 14} · หลบโชคดี +${r === 1 ? 3 : 5}%`, (r) => ({ flee: r === 1 ? 8 : 14, luckyDodge: r === 1 ? 0.03 : 0.05 })),
    t('th_t1b', 1, '💨', 'ม่านควัน', 2, (r) => `เริ่มทุกเวฟ หลบแน่นอน ${r} ครั้ง`, (r) => ({ waveDodge: r })),
    t('th_t1c', 1, '🩸', 'หนังหนา', 2, (r) => `HP สูงสุด +${r === 1 ? 40 : 80}`, (r) => ({ maxHp: r === 1 ? 40 : 80 })),
    // ----- row 2 · Job Lv 10 · จังหวะ -----
    t('th_t2a', 2, '⚡', 'ขโมยจังหวะ', 2, (r) => `หลบได้ → Energy +${rk(r, 15, 25)} · ลด CD ทักษะ 2 หรือ Ult 1 เทิร์น (ทุก ${rk(r, 3, 2)} เทิร์น)`, (r) => ({ dodgeEnergy: rk(r, 15, 25), thDodgeCdCut: 1, thDodgeCdIcd: rk(r, 3, 2) })),
    t('th_t2b', 2, '🎯', 'จุดบอดซ้อนพิษ', 2, (r) => `คริ + คริสกิล +${rk(r, 1, 1.6).toFixed(1)}% ต่อ stack พิษบนเป้า (สูงสุด ${KIT.thiefStackCritTalMax} stack)`, (r) => ({ thStackCritTal: rk(r, 0.01, 0.016) })),
    t('th_t2c', 2, '🧪', 'จังหวะสลับมีด', 2, (r) => `หลังแทงพิษ: ตีปกติถัดไปแรง +${rk(r, 25, 40)}% · Energy +${rk(r, 10, 16)}`, (r) => ({ thWeaveDmg: rk(r, 0.25, 0.4), thWeaveRes: rk(r, 10, 16) })),
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
