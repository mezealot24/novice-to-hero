// ===== ใยชั้น 3: 🐉 Lord Knight (Knight Awakening, design/awakening-lordknight-v1.md) =====
// 3 branches x 4 nodes (tier 1-3 + ★). Ids are save data: never rename. Caps / shared numbers live in KIT3.
// ⚔️ ตำนาน = legacy: the more points the hero put in the Knight web (ใยชั้น 2), the more these give (meta.ts reads branch points).
import { node, type ClassTree } from '../tree-types'
import { KIT3 } from '../skill-math'

const P = KIT3.lordknight, C = KIT3.common
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`

export const tree3: ClassTree = {
  branches: [
    { id: 'lk_l', job: 'swordsman', job2: 'knight', name: 'ตำนาน', icon: '⚔️', blurb: 'แต้มในใยชั้น 2 ยิ่งเยอะยิ่งแรง' },
    { id: 'lk_g', job: 'swordsman', job2: 'knight', name: 'มังกร', icon: '🐉', blurb: 'Hundred Spear: ดูดเลือด · ข้าม DEF · ฮิตเพิ่ม' },
    { id: 'lk_r', job: 'swordsman', job2: 'knight', name: 'ทหารม้า', icon: '🐦', blurb: 'Charge · ลดดาเมจ · เปิดไฟต์ · Parrying' },
  ],
  nodes: [
    node('lk_l1', 'lk_l', 1, '🗡️', 'ทวนบรรพชน', 3, (lv) => `Pierce / Hundred Spear +${pct(0.005 * lv)} ต่อแต้มในสาย 🗡️ หอกทะลวง (สูงสุด +${pct(P.leg.crossCap)})`, (lv) => ({ j3LegCross: 0.005 * lv })),
    node('lk_l2', 'lk_l', 2, '🛡️', 'ป้อมบรรพชน', 3, (lv) => `Auto Guard +${pct(0.002 * lv)} ต่อแต้มในสาย 🛡️ ป้อม (สูงสุด +${pct(P.leg.guardCap)})`, (lv) => ({ j3LegGuard: 0.002 * lv })),
    node('lk_l3', 'lk_l', 3, '🐦', 'เปโกบรรพชน', 3, (lv) => `HP สูงสุด +${pct(0.003 * lv)} ต่อแต้มในสาย 🐦 เปโก (สูงสุด +${pct(P.leg.hpCap)})`, (lv) => ({ j3LegHp: 0.003 * lv })),
    node('lk_l4', 'lk_l', 4, '👑', 'สืบสาน', 1, () => `สายของ variant ≥ ${P.heirNeed} แต้ม: 🐉 ไฟมังกร + เกราะแตก · 💥 Joint Beat แทง 2 ครั้ง`, () => ({ j3Heir: 1 })),
    node('lk_g1', 'lk_g', 1, '🩸', 'ทวนดูดเลือด', 3, (lv) => `ทุกฮิตที่ Hundred Spear เพิ่ม ฮีล ${lv}% HP`, (lv) => ({ j3GospelHeal: 0.01 * lv })),
    node('lk_g2', 'lk_g', 2, '🌅', 'พรหลังศึก', 3, (lv) => `Ult จบ → ${C.afterTurns} เทิร์น ดาเมจ +${lv * 5}%`, (lv) => ({ j3AfterBless: 0.05 * lv })),
    node('lk_g3', 'lk_g', 3, '🌀', 'ปลายทวนเกลียว', 2, (lv) => `Ult ข้าม DEF มอนเพิ่ม ${lv * 10}%`, (lv) => ({ j2Spiral: 0.1 * lv })),
    node('lk_g4', 'lk_g', 4, '🐲', 'มังกรคำราม', 1, () => 'Hundred Spear แทงเพิ่มอีก 1 ฮิต', () => ({ j3GospelField: 1 })),
    node('lk_r1', 'lk_r', 1, '🐎', 'ชาร์จเปโก', 3, (lv) => `ฟันแรกของทุกเวฟ +${lv * 20}%`, (lv) => ({ j2Charge: 0.2 * lv })),
    node('lk_r2', 'lk_r', 2, '🤝', 'Banding', 3, (lv) => `ดาเมจเข้า −${lv * 2}% ต่อมอนที่ยังอยู่ (นับสูงสุด ${C.bandingMax} ตัว)`, (lv) => ({ j3Banding: 0.02 * lv })),
    node('lk_r3', 'lk_r', 3, '💥', 'Ignition Break', 3, (lv) => `เทิร์นแรกของไฟต์ ฟาดทุกตัว P.DEF x${(0.4 * lv).toFixed(1)} + เกราะแตก 1 เทิร์น`, (lv) => ({ j3EarthDrive: 0.4 * lv })),
    node('lk_r4', 'lk_r', 4, '⚔️', 'Parrying', 1, () => `1 ครั้ง/ไฟต์ HP < ${C.inspireAt * 100}%: ${C.inspireTurns} เทิร์น บล็อก ${C.inspireGuard * 100}% + บล็อกฮีล ${C.inspireHeal * 100}%`, () => ({ j3Inspire: 1 })),
  ],
  talents: [],
}
