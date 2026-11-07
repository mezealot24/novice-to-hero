// ✝️ Crusader ใยชั้น 2 (design/second-jobs-v1.md §4). Node ids are save data: never rename.
import { node as n, rk, talent as t, type ClassTree } from '../tree-types'
import { KIT2 } from '../skill-math'

const C = KIT2.crusader

export const tree2: ClassTree = {
  branches: [
    { id: 'cr_c', job: 'cleric', job2: 'crusader', name: 'กางเขน', icon: '✝️', blurb: 'Holy Cross / Grand Cross แรงขึ้น จ่าย HP น้อยลง' },
    { id: 'cr_s', job: 'cleric', job2: 'crusader', name: 'โล่ศักดิ์สิทธิ์', icon: '🛡️', blurb: 'บล็อก · ปาโล่ · สะท้อน' },
    { id: 'cr_d', job: 'cleric', job2: 'crusader', name: 'อุทิศ', icon: '🙏', blurb: 'HP · บล็อกแล้วฟื้น · ไม่ยอมล้ม' },
  ],
  nodes: [
    n('cr_c1', 'cr_c', 1, '✝️', 'กางเขนแรง', 3, (lv) => `Holy Cross / Grand Cross แรง +${lv * 10}%`, (lv) => ({ j2CrossAdd: 0.1 * lv })),
    n('cr_c2', 'cr_c', 2, '🩸', 'ศรัทธาแท้', 3, (lv) => `Grand Cross จ่าย HP น้อยลง ${lv * 10}%`, (lv) => ({ j2PayCut: 0.1 * lv })),
    n('cr_c3', 'cr_c', 3, '🙈', 'แสงบาดตา', 2, (lv) => `ตาบอดจาก Holy Cross นาน +${lv} เทิร์น`, (lv) => ({ j2BlindAdd: lv })),
    n('cr_c4', 'cr_c', 4, '✨', 'Grand Cross ซ้อน', 1, () => 'Grand Cross ทุก pulse ยิง 2 ครั้ง (ครั้งที่ 2 ไม่มีโบนัสเผา)', () => ({ j2GcTwice: 1 })),
    n('cr_s1', 'cr_s', 1, '🛡️', 'Auto Guard+', 3, (lv) => `โอกาสบล็อก +${lv * 3}%`, (lv) => ({ j2Guard: 0.03 * lv })),
    n('cr_s2', 'cr_s', 2, '↩️', 'Shield Boomerang', 3, (lv) => `Holy Cross ปาโล่ใส่ตัวสุ่ม P.DEF x ${+(lv * 0.6).toFixed(2)} (ต้องถือมือรอง)`, (lv) => ({ j2ShieldBoom: 0.6 * lv })),
    n('cr_s3', 'cr_s', 3, '🔁', 'Reflect Shield', 3, (lv) => `โดนตีกายภาพ สะท้อน ${lv * 5}% กลับ (ไม่เกินเพดานสะท้อน)`, (lv) => ({ j2Reflect: 0.05 * lv })),
    n('cr_s4', 'cr_s', 4, '🏰', 'ป้อมศรัทธา', 1, () => 'บล็อกได้ = โล่ 5% HP สูงสุด', () => ({ j2BlockShield: 0.05 })),
    n('cr_d1', 'cr_d', 1, '❤️', 'อุทิศกาย', 3, (lv) => `HP สูงสุด +${lv * 4}%`, (lv) => ({ j2HpPct: 0.04 * lv })),
    n('cr_d2', 'cr_d', 2, '💚', 'บล็อกฟื้นฟู', 3, (lv) => `บล็อกได้ = ฮีล ${lv * 2}% HP สูงสุด`, (lv) => ({ j2BlockHeal: 0.02 * lv })),
    n('cr_d3', 'cr_d', 3, '⛰️', 'ใจเหล็ก', 3, (lv) => `P.DEF +${lv * 4} · M.DEF +${lv * 2}%`, (lv) => ({ def: 4 * lv, mdef: 0.02 * lv })),
    // v119 (Q 2026-11-08): tank nodes hanging under the two roots (branch = the root's own column, data/tree.ts ROOT_LINES)
    // ✨ under Grand Cross: Guardian Angel DR fades as the pulses run out · shield per pulse · Auto Guard while it lasts
    n('cr_u1', 'crusader_u2', 1, '🪽', 'Guardian Angel', 5, (lv) => `ระหว่าง Grand Cross: ลดดาเมจ ${lv}% ต่อ pulse ที่เหลือ (สูงสุด ${Math.round(C.angelCap * 100)}%) · pulse หมด = ผลหาย`, (lv) => ({ j2GcAngel: 0.01 * lv })),
    n('cr_u2', 'crusader_u2', 2, '🛡️', 'กางเขนคุ้มกาย', 3, (lv) => `Grand Cross ทุก pulse ได้โล่ ${lv}% HP สูงสุด`, (lv) => ({ j2GcShield: 0.01 * lv })),
    n('cr_u3', 'crusader_u2', 3, '⛪', 'ศรัทธาไม่คลอน', 3, (lv) => `ระหว่าง Grand Cross: โอกาสบล็อก +${lv * 3}%`, (lv) => ({ j2GcGuard: 0.03 * lv })),
    // ✝️ under Holy Cross: every cast that lands = VIT stack
    n('cr_h1', 'crusader_s3', 1, '💪', 'กางเขนหล่อกาย', 5, (lv) => `Holy Cross ทำดาเมจได้ = VIT +${C.hcVit} (สะสม สูงสุด ${lv * 5} stack = VIT +${lv * 5 * C.hcVit}) · หายถ้าไม่ร่ายต่อ ${C.hcVitGrace} เทิร์นหลังคูลดาวน์หมด`, (lv) => ({ j2HcVit: 5 * lv })),
    n('cr_d4', 'cr_d', 4, '🕊️', 'ผู้พลีชีพ', 1, () => 'ครั้งแรกต่อเวฟที่โดนตีจนตาย: เหลือ 1 HP + โล่ 20%', () => ({ j2Martyr: 1 })),
  ],
  talents: [
    // v119 (Q 2026-11-08) ทาเลนต์ชั้น 2 · I stats · II Ult วิวัฒน์ · III ทักษะ 3 · IV ตัวตน (สายถึก)
    t('cr_t1_guard', 1, '🛡️', 'โล่ศรัทธา', 2, (r) => `โอกาสบล็อก +${rk(r, 3, 5)}%`, (r) => ({ j2Guard: rk(r, 0.03, 0.05) })),
    t('cr_t1_hp', 1, '❤️', 'กายอุทิศ', 2, (r) => `HP สูงสุด +${rk(r, 4, 7)}%`, (r) => ({ j2HpPct: rk(r, 0.04, 0.07) })),
    t('cr_t1_mana', 1, '💧', 'บ่อศรัทธา', 2, (r) => `Mana สูงสุด +${rk(r, 10, 18)} (Grand Cross เผาได้มากขึ้น)`, (r) => ({ maxRes: rk(r, 10, 18) })),
    t('cr_t2_ult', 2, '✨', 'กางเขนใหญ่', 2, (r) => `Grand Cross แรง +${rk(r, 15, 25)}%`, (r) => ({ ult2Pow: rk(r, 0.15, 0.25) })),
    t('cr_t2_pay', 2, '🩸', 'พลีน้อย', 2, (r) => `Grand Cross จ่าย HP น้อยลง ${rk(r, 10, 18)}%`, (r) => ({ j2PayCut: rk(r, 0.1, 0.18) })),
    t('cr_t2_angel', 2, '🪽', 'ปีกพิทักษ์', 2, (r) => `ระหว่าง Grand Cross: ลดดาเมจ ${rk(r, 1, 2)}% ต่อ pulse ที่เหลือ`, (r) => ({ j2GcAngel: rk(r, 0.01, 0.02) })),
    t('cr_t3_cross', 3, '✝️', 'Holy Cross หนัก', 2, (r) => `Holy Cross แรง +${rk(r, 15, 25)}%`, (r) => ({ s3Pow: rk(r, 0.15, 0.25) })),
    t('cr_t3_blind', 3, '🙈', 'แสงจ้า', 2, (r) => `ตาบอดจาก Holy Cross นาน +${rk(r, 1, 2)} เทิร์น`, (r) => ({ j2BlindAdd: rk(r, 1, 2) })),
    t('cr_t3_boom', 3, '↩️', 'โล่บิน', 2, (r) => `Holy Cross ปาโล่ใส่ตัวสุ่ม P.DEF x ${rk(r, 0.3, 0.5)} (ต้องถือมือรอง)`, (r) => ({ j2ShieldBoom: rk(r, 0.3, 0.5) })),
    t('cr_t4_heal', 4, '💚', 'บล็อกแล้วฟื้น', 2, (r) => `บล็อกได้ = ฮีล ${rk(r, 1, 2)}% HP สูงสุด`, (r) => ({ j2BlockHeal: rk(r, 0.01, 0.02) })),
    t('cr_t4_reflect', 4, '🔁', 'สะท้อนบาป', 2, (r) => `โดนตีกายภาพ สะท้อน ${rk(r, 4, 7)}% กลับ (ไม่เกินเพดานสะท้อน)`, (r) => ({ j2Reflect: rk(r, 0.04, 0.07) })),
    t('cr_t4_wall', 4, '🏰', 'กำแพงศักดิ์สิทธิ์', 2, (r) => `บล็อกได้ = โล่ ${rk(r, 2, 3.5)}% HP สูงสุด`, (r) => ({ j2BlockShield: rk(r, 0.02, 0.035) })),
  ],
}
