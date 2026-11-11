// ===== ใยชั้น 3: 🥊 Champion (Monk Awakening) =====
// 3 branches x 4 nodes (tier 1-3 + ★). Ids are save data: never rename. Caps / shared numbers live in KIT3.
// 👊 ตำนาน = legacy: reads points invested in Monk branches (mk_c, mk_h, mk_a).
import { node, type ClassTree } from '../tree-types'
import { KIT3 } from '../skill-math'

const P = KIT3.champion, C = KIT3.common
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`

export const tree3: ClassTree = {
  branches: [
    { id: 'ch_l', job: 'cleric', job2: 'monk', name: 'ตำนาน', icon: '👊', blurb: 'แต้มในใยชั้น 2 ยิ่งเยอะยิ่งแรง' },
    { id: 'ch_g', job: 'cleric', job2: 'monk', name: 'ปราณจิต', icon: '⚡', blurb: 'Supreme Asura: ทะลวงเกราะ · คลื่นกระแทก · พรหลังศึก' },
    { id: 'ch_r', job: 'cleric', job2: 'monk', name: 'กายาเหล็ก', icon: '🧘', blurb: 'หมัดสวน · ลดดาเมจ · สมาธิคุ้มกาย' },
  ],
  nodes: [
    node('ch_l1', 'ch_l', 1, '👊', 'หมัดบรรพชน', 3, (lv) => `คอมโบ / Tiger Knuckle +${pct(0.005 * lv)} ต่อแต้มในสาย 👊 คอมโบ (สูงสุด +${pct(P.leg.crossCap)})`, (lv) => ({ j3LegCross: 0.005 * lv })),
    node('ch_l2', 'ch_l', 2, '🛡️', 'ปราณบรรพชน', 3, (lv) => `M.DEF +${pct(0.002 * lv)} ต่อแต้มในสาย 🥊 หมัดแค้น (สูงสุด +${pct(P.leg.guardCap)})`, (lv) => ({ j3LegGuard: 0.002 * lv })),
    node('ch_l3', 'ch_l', 3, '💧', 'วิญญาณบรรพชน', 3, (lv) => `HP สูงสุด +${pct(0.003 * lv)} ต่อแต้มในสาย 💥 อสุรา (สูงสุด +${pct(P.leg.hpCap)})`, (lv) => ({ j3LegHp: 0.003 * lv })),
    node('ch_l4', 'ch_l', 4, '👑', 'สืบสาน', 1, () => `สายของ variant ≥ ${P.heirNeed} แต้ม: 🐅 Tiger สตั๊น +1 เทิร์น · 💥 Chain Crush เพิ่มสเกล Max HP`, () => ({ j3Heir: 1 })),
    node('ch_g1', 'ch_g', 1, '🩸', 'หมัดดูดชีพ', 3, (lv) => `คลื่นกระแทก Supreme Asura ฮีล ${lv}% HP`, (lv) => ({ j3GospelHeal: 0.01 * lv })),
    node('ch_g2', 'ch_g', 2, '🌅', 'พรหลังศึก', 3, (lv) => `Ult จบ → ${C.afterTurns} เทิร์น ดาเมจ +${lv * 5}%`, (lv) => ({ j3AfterBless: 0.05 * lv })),
    node('ch_g3', 'ch_g', 3, '🌪️', 'คลื่นทลวงปราณ', 2, (lv) => `Ult ข้าม DEF มอนเพิ่ม ${lv * 10}%`, (lv) => ({ j2Spiral: 0.1 * lv })),
    node('ch_g4', 'ch_g', 4, '💥', 'คลื่นสุญญากาศ', 1, () => 'Supreme Asura / Tempest Bell เพิ่มคลื่นระเบิดอีก 1 ฮิต', () => ({ j3GospelField: 1 })),
    node('ch_r1', 'ch_r', 1, '🥊', 'หมัดเคาน์เตอร์', 3, (lv) => `เทิร์นแรกของทุกเวฟ ปล่อยหมัดพุ่งชน +${lv * 20}%`, (lv) => ({ j2Charge: 0.2 * lv })),
    node('ch_r2', 'ch_r', 2, '🤝', 'Banding', 3, (lv) => `ดาเมจเข้า −${lv * 2}% ต่อมอนที่ยังอยู่ (นับสูงสุด ${C.bandingMax} ตัว)`, (lv) => ({ j3Banding: 0.02 * lv })),
    node('ch_r3', 'ch_r', 3, '🌋', 'ระเบิดปราณปฐพี', 3, (lv) => `เทิร์นแรกของไฟต์ ฟาดทุกตัว P.ATK x${(0.4 * lv).toFixed(1)} + เกราะแตก 1 เทิร์น`, (lv) => ({ j3EarthDrive: 0.4 * lv })),
    node('ch_r4', 'ch_r', 4, '🧘', 'สมาธิเหล็ก', 1, () => `1 ครั้ง/ไฟต์ HP < ${C.inspireAt * 100}%: ${C.inspireTurns} เทิร์น ป้องกัน ${C.inspireGuard * 100}% + ฮีล ${C.inspireHeal * 100}%`, () => ({ j3Inspire: 1 })),
  ],
  talents: [],
}

