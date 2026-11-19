// ===== ใยชั้น 3: 🤖 Mechanic (Innovator Awakening · RO Mechanic: Overclock + Arm Cannon) (docs/design/awakening-last-four-v1.md) =====
// 3 branches x 4 nodes (tier 1-3 + ★). Ids are save data: never rename. Caps / shared numbers live in KIT3.
// ⚔️ ตำนาน = legacy: the more points the hero put in the 2nd-job web (ใยชั้น 2), the more these give (hero-stats.ts reads branch points).
import { node, type ClassTree } from '../tree-types'
import { KIT3 } from '../skill-math'

const P = KIT3.mechanic, C = KIT3.common
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`

export const tree3: ClassTree = {
  branches: [
    { id: 'mc_l', job: 'archer', job2: 'innovator', name: 'ตำนาน', icon: '⚔️', blurb: 'แต้มในใยชั้น 2 ยิ่งเยอะยิ่งแรง' },
    { id: 'mc_c', job: 'archer', job2: 'innovator', name: 'ปืนใหญ่', icon: '🚀', blurb: 'Arm Cannon: ซ่อมตัว · หัวรบเจาะเกราะ · มิสไซล์เพิ่ม' },
    { id: 'mc_o', job: 'archer', job2: 'innovator', name: 'Overclock', icon: '⚙️', blurb: 'วางกับดักเปิดไฟต์ · Neutral Barrier · เร่งเครื่อง · Auto-Repair' },
  ],
  nodes: [
    node('mc_l1', 'mc_l', 1, '🎲', 'พิมพ์เขียวบรรพชน', 3, (lv) => `สิ่งประดิษฐ์สุดเพี้ยน / Arm Cannon +${pct(0.005 * lv)} ต่อแต้มในสาย 🎲 ประดิษฐ์ (สูงสุด +${pct(P.leg.crossCap)})`, (lv) => ({ j3LegCross: 0.005 * lv })),
    node('mc_l2', 'mc_l', 2, '💣', 'ดินปืนบรรพชน', 3, (lv) => `กับดักแรง +${pct(0.01 * lv)} ต่อแต้มในสาย 💣 กับดัก (สูงสุด +${pct(P.leg.guardCap)})`, (lv) => ({ j3LegGuard: 0.01 * lv })),
    node('mc_l3', 'mc_l', 3, '🤖', 'โครงเหล็กบรรพชน', 3, (lv) => `HP สูงสุด +${pct(0.003 * lv)} ต่อแต้มในสาย 🤖 ป้อมปืน (สูงสุด +${pct(P.leg.hpCap)})`, (lv) => ({ j3LegHp: 0.003 * lv })),
    node('mc_l4', 'mc_l', 4, '👑', 'สืบสาน', 1, () => `สายของ variant ≥ ${P.heirNeed} แต้ม: 🚀 Rocket Barrage +${P.varA.heirRockets} ลูก · 🏰 Fortress Mode หุ่นจิ๋ว +${P.varB.heirTurrets} ตัว`, () => ({ j3Heir: 1 })),
    node('mc_c1', 'mc_c', 1, '🔧', 'Repair', 3, (lv) => `มิสไซล์ทุกลูกที่โดน ฮีล ${lv}% HP สูงสุด (นับสูงสุด ${P.gospelHealMax} ลูก)`, (lv) => ({ j3GospelHeal: 0.01 * lv })),
    node('mc_c2', 'mc_c', 2, '🌅', 'พรหลังศึก', 3, (lv) => `Ult จบ → ${C.afterTurns} เทิร์น ดาเมจ +${lv * 5}%`, (lv) => ({ j3AfterBless: 0.05 * lv })),
    node('mc_c3', 'mc_c', 3, '🧨', 'หัวรบเจาะเกราะ', 2, (lv) => `มิสไซล์และจรวด ข้าม DEF ${lv * 15}%`, (lv) => ({ j3Pierce: 0.15 * lv })),
    node('mc_c4', 'mc_c', 4, '🛰️', 'ยิงถล่ม', 1, () => 'Arm Cannon ยิงมิสไซล์เพิ่มอีก 2 ลูก', () => ({ j3GospelField: 2 })),
    node('mc_o1', 'mc_o', 1, '🪤', 'Deploy', 3, (lv) => `เทิร์นแรกของไฟต์ วางกับดักเพิ่ม ${lv} อัน (สุ่ม)`, (lv) => ({ j3EarthDrive: lv })),
    node('mc_o2', 'mc_o', 2, '🫧', 'Neutral Barrier', 3, (lv) => `ดาเมจเข้า −${lv * 2}% ต่อมอนที่ยังอยู่ (นับสูงสุด ${C.bandingMax} ตัว)`, (lv) => ({ j3Banding: 0.02 * lv })),
    node('mc_o3', 'mc_o', 3, '⚙️', 'เร่งเครื่อง', 3, (lv) => `Overclock ความเร็ว +${lv * 5}% (รวม ${Math.round((P.overAspd + 0.05 * lv) * 100)}%)`, (lv) => ({ j3McOver: 0.05 * lv })),
    node('mc_o4', 'mc_o', 4, '🛠️', 'Auto-Repair', 1, () => `1 ครั้ง/ไฟต์ HP < ${C.inspireAt * 100}%: ${C.inspireTurns} เทิร์น บล็อก ${C.inspireGuard * 100}% + บล็อกฮีล ${C.inspireHeal * 100}%`, () => ({ j3Inspire: 1 })),
  ],
  talents: [],
}
