// ===== ใยชั้น 3: 🪶 Ranger (Beastmaster Awakening, design/awakening-beastmaster-v1.md §4.1) =====
// 3 branches x 4 nodes (tier 1-3 + ★). Ids are save data: never rename. Caps / shared numbers live in KIT3.
// 🦅 ตำนาน = legacy: reads points spent in the Beastmaster web (ใยชั้น 2) via meta/hero-stats.ts.
import { node, type ClassTree } from '../tree-types'
import { KIT3 } from '../skill-math'

const P = KIT3.ranger, C = KIT3.common
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`

export const tree3: ClassTree = {
  branches: [
    { id: 'rn_l', job: 'archer', job2: 'beastmaster', name: 'ตำนาน', icon: '🦅', blurb: 'แต้มในใยชั้น 2 ยิ่งเยอะยิ่งแรง' },
    { id: 'rn_g', job: 'archer', job2: 'beastmaster', name: 'พายุฝูง', icon: '🐾', blurb: 'Primal Stampede: ฮีล · พรหลังศึก · ทะลวงเกราะ · รอบเพิ่ม' },
    { id: 'rn_r', job: 'archer', job2: 'beastmaster', name: 'จ้าวพนา', icon: '🎭', blurb: 'ซุ่มยิงเปิดฉาก · Banding · Arrow Ambush · Camouflage' },
  ],
  nodes: [
    node('rn_l1', 'rn_l', 1, '🐾', 'สายใยบรรพชน', 3, (lv) => `Awakening / Primal Stampede +${pct(0.005 * lv)} ต่อแต้มในสาย 🤝 ผูกพัน (สูงสุด +${pct(P.leg.crossCap)})`, (lv) => ({ j3LegCross: 0.005 * lv })),
    node('rn_l2', 'rn_l', 2, '🐗', 'หนังศิลาบรรพชน', 3, (lv) => `หมูป่ารับดาเมจแทน +${pct(0.002 * lv)} ต่อแต้มในสาย 🐗 ป่า (สูงสุด +${pct(P.leg.guardCap)})`, (lv) => ({ j3LegGuard: 0.002 * lv })),
    node('rn_l3', 'rn_l', 3, '🌿', 'สัญชาตญาณบรรพชน', 3, (lv) => `HP สูงสุด +${pct(0.003 * lv)} ต่อแต้มในสาย 🌿 สัญชาตญาณ (สูงสุด +${pct(P.leg.hpCap)})`, (lv) => ({ j3LegHp: 0.003 * lv })),
    node('rn_l4', 'rn_l', 4, '👑', 'สืบสาน', 1, () => `สายของ variant ≥ ${P.heirNeed} แต้ม: 🌩️ ฝนธนูเพิ่มลมกรด 🙈 ทุกตัว · 🎯 Aimed ยิง 2 นัด + หมาป่าขย้ำคริ 100%`, () => ({ j3Heir: 1 })),
    node('rn_g1', 'rn_g', 1, '💚', 'สายเลือดผสาน', 3, (lv) => `ทุกรอบ Primal Stampede ฮีลฮีโร่และหมูป่า ${lv}% Max HP`, (lv) => ({ j3GospelHeal: 0.01 * lv })),
    node('rn_g2', 'rn_g', 2, '🌅', 'พรหลังศึก', 3, (lv) => `Awakening จบ → ${C.afterTurns} เทิร์น ฮีโร่และสัตว์แรง +${lv * 5}%`, (lv) => ({ j3AfterBless: 0.05 * lv })),
    node('rn_g3', 'rn_g', 3, '🪶', 'ศรทะลวงวิญญาณ', 2, (lv) => `ระหว่าง Awakening + Stampede ข้าม DEF มอนเพิ่ม ${lv * 10}%`, (lv) => ({ j2Spiral: 0.1 * lv })),
    node('rn_g4', 'rn_g', 4, '🌪️', 'พายุสรรพสัตว์', 1, () => 'Primal Stampede ปลดปล่อยฝูงสัตว์เพิ่มอีก +1 รอบ', () => ({ j3GospelField: 1 })),
    node('rn_r1', 'rn_r', 1, '🏹', 'ซุ่มยิงเปิดฉาก', 3, (lv) => `ยิงแรกของทุกเวฟแรง +${lv * 20}%`, (lv) => ({ j2Charge: 0.2 * lv })),
    node('rn_r2', 'rn_r', 2, '🤝', 'Banding', 3, (lv) => `ดาเมจเข้า −${lv * 2}% ต่อมอนที่ยังอยู่ (นับสูงสุด ${C.bandingMax} ตัว)`, (lv) => ({ j3Banding: 0.02 * lv })),
    node('rn_r3', 'rn_r', 3, '💥', 'Arrow Ambush', 3, (lv) => `เทิร์นแรกของไฟต์ ยิงฝูงทุกตัว P.ATK × ${(0.4 * lv).toFixed(1)} + เกราะแตก 1 เทิร์น`, (lv) => ({ j3EarthDrive: 0.4 * lv })),
    node('rn_r4', 'rn_r', 4, '🎭', 'พรางตัว', 1, () => `1 ครั้ง/ไฟต์ HP < ${C.inspireAt * 100}%: ${C.inspireTurns} เทิร์น หลบหลีกพิเศษ ${C.inspireGuard * 100}% + หลบฮีล ${C.inspireHeal * 100}%`, () => ({ j3Inspire: 1 })),
  ],
  talents: [],
}
