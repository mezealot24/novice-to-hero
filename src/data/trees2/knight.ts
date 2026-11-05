// 🐴 Knight ใยชั้น 2 (design/second-jobs-v1.md §4). Node ids are save data: never rename.
import { node as n, type ClassTree } from '../tree-types'

export const tree2: ClassTree = {
  branches: [
    { id: 'kn_p', job: 'swordsman', job2: 'knight', name: 'หอกทะลวง', icon: '🗡️', blurb: 'Pierce · Spear Boomerang' },
    { id: 'kn_g', job: 'swordsman', job2: 'knight', name: 'ป้อม', icon: '🛡️', blurb: 'Auto Guard · เกราะเป็นแรง' },
    { id: 'kn_c', job: 'swordsman', job2: 'knight', name: 'เปโก', icon: '🐦', blurb: 'ความเร็ว · Charge Attack' },
  ],
  nodes: [
    n('kn_p1', 'kn_p', 1, '🔱', 'หอกหนัก', 3, (lv) => `สกิลหอกบวกดาเมจ HP สูงสุดอีก +${lv}%`, (lv) => ({ j2HpDmg: 0.01 * lv })),
    n('kn_p2', 'kn_p', 2, '🎯', 'Pierce+', 1, () => 'Pierce แทงเพิ่ม 1 ฮิต', () => ({ j2PierceHits: 1 })),
    n('kn_p3', 'kn_p', 3, '🪃', 'Spear Boomerang', 1, () => 'ต้นเทิร์น ถ้ามีมอนกำลังชาร์จ: ปาหอกใส่ 0.8x + HP สูงสุด แล้วขัดการชาร์จ (1 ครั้ง/เวฟ)', () => ({ j2Boomerang: 1 })),
    n('kn_p4', 'kn_p', 4, '🌀', 'Spiral Pierce', 1, () => 'Ult ข้าม DEF มอน 50%', () => ({ j2Spiral: 0.5 })),
    n('kn_g1', 'kn_g', 1, '🛡️', 'Auto Guard', 3, (lv) => `โอกาสบล็อกการโจมตีกายภาพ ${lv * 4}% (ไม่มีโล่ = ครึ่งเดียว)`, (lv) => ({ j2Guard: 0.04 * lv })),
    n('kn_g2', 'kn_g', 2, '⚙️', 'เกราะเป็นแรง', 3, (lv) => `P.ATK + P.DEF x ${(lv * 0.15).toFixed(2)}`, (lv) => ({ j2DefAtk: 0.15 * lv })),
    n('kn_g3', 'kn_g', 3, '🏰', 'ยืนตระหง่าน', 3, (lv) => `HP สูงสุด +${lv * 4}%`, (lv) => ({ j2HpPct: 0.04 * lv })),
    n('kn_g4', 'kn_g', 4, '↩️', 'Counter Attack', 1, () => 'สวนกลับคริทุกครั้ง', () => ({ j2CounterCrit: 1 })),
    n('kn_c1', 'kn_c', 1, '💨', 'เร่งเปโก', 3, (lv) => `ความเร็ว +${lv * 4}%`, (lv) => ({ aspd: 0.064 * lv })),
    n('kn_c2', 'kn_c', 2, '🐎', 'Charge Attack', 3, (lv) => `ฟันแรกของทุกเวฟ +${lv * 30}%`, (lv) => ({ j2Charge: 0.3 * lv })),
    n('kn_c3', 'kn_c', 3, '🦵', 'ขาเปโกแกร่ง', 3, (lv) => `Flee +${lv * 4} · Hit +${lv * 4}`, (lv) => ({ flee: 4 * lv, hit: 4 * lv })),
    n('kn_c4', 'kn_c', 4, '🚀', 'ทะยาน', 1, () => 'ทุกเวฟได้เทิร์นก่อนเสมอ และฟันแรก x3', () => ({ j2ChargeFirst: 1 })),
  ],
  talents: [],
}
