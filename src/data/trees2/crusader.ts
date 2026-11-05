// ✝️ Crusader ใยชั้น 2 (design/second-jobs-v1.md §4). Node ids are save data: never rename.
import { node as n, type ClassTree } from '../tree-types'

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
    n('cr_c4', 'cr_c', 4, '✨', 'Grand Cross ซ้อน', 1, () => 'Grand Cross ยิง 2 ครั้ง (ครั้งที่ 2 ไม่จ่าย HP)', () => ({ j2GcTwice: 1 })),
    n('cr_s1', 'cr_s', 1, '🛡️', 'Auto Guard+', 3, (lv) => `โอกาสบล็อก +${lv * 3}%`, (lv) => ({ j2Guard: 0.03 * lv })),
    n('cr_s2', 'cr_s', 2, '🪃', 'Shield Boomerang', 3, (lv) => `Holy Cross ปาโล่ใส่ตัวสุ่ม P.DEF x ${(lv * 0.6).toFixed(1)} (ต้องถือมือรอง)`, (lv) => ({ j2ShieldBoom: 0.6 * lv })),
    n('cr_s3', 'cr_s', 3, '🪞', 'Reflect Shield', 3, (lv) => `โดนตีกายภาพ สะท้อน ${lv * 5}% กลับ (ไม่เกินเพดานสะท้อน)`, (lv) => ({ j2Reflect: 0.05 * lv })),
    n('cr_s4', 'cr_s', 4, '🏰', 'ป้อมศรัทธา', 1, () => 'บล็อกได้ = โล่ 5% HP สูงสุด', () => ({ j2BlockShield: 0.05 })),
    n('cr_d1', 'cr_d', 1, '❤️', 'อุทิศกาย', 3, (lv) => `HP สูงสุด +${lv * 4}%`, (lv) => ({ j2HpPct: 0.04 * lv })),
    n('cr_d2', 'cr_d', 2, '💚', 'บล็อกฟื้นฟู', 3, (lv) => `บล็อกได้ = ฮีล ${lv * 2}% HP สูงสุด`, (lv) => ({ j2BlockHeal: 0.02 * lv })),
    n('cr_d3', 'cr_d', 3, '🪨', 'ใจเหล็ก', 3, (lv) => `P.DEF +${lv * 4} · M.DEF +${lv * 2}%`, (lv) => ({ def: 4 * lv, mdef: 0.02 * lv })),
    n('cr_d4', 'cr_d', 4, '🕊️', 'ผู้พลีชีพ', 1, () => 'ครั้งแรกต่อเวฟที่โดนตีจนตาย: เหลือ 1 HP + โล่ 20%', () => ({ j2Martyr: 1 })),
  ],
  talents: [],
}
