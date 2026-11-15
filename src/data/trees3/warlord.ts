// ===== ใยชั้น 3: 🪓 Warlord (Berserker Awakening · Tryndamere + PoE Berserker + Warlord) =====
// 3 branches x 4 nodes (tier 1-3 + ★). Ids are save data: never rename. Caps / shared numbers live in KIT3.
// ⚔️ ตำนาน = legacy: the more points the hero put in the Berserker web (ใยชั้น 2), the more these give (hero-stats.ts reads branch points).
import { node, type ClassTree } from '../tree-types'
import { KIT3 } from '../skill-math'

const P = KIT3.warlord, C = KIT3.common
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`

export const tree3: ClassTree = {
  branches: [
    { id: 'wl_l', job: 'swordsman', job2: 'berserker', name: 'ตำนาน', icon: '⚔️', blurb: 'แต้มในใยชั้น 2 ยิ่งเยอะยิ่งแรง' },
    { id: 'wl_u', job: 'swordsman', job2: 'berserker', name: 'อมตะคลั่ง', icon: '🩸', blurb: 'Undying Rage · Bloodlust ฮีลจบศึก · Banding' },
    { id: 'wl_b', job: 'swordsman', job2: 'berserker', name: 'จ้าวสงคราม', icon: '🪓', blurb: 'Blitz Charges · Warcry · Rite of Ruin' },
  ],
  nodes: [
    node('wl_l1', 'wl_l', 1, '🪓', 'ขวานบรรพชน', 3, (lv) => `คลื่นดาบ / Ult +${pct(0.005 * lv)} ต่อแต้มในสาย 🪓 สับ (สูงสุด +${pct(P.leg.crossCap)})`, (lv) => ({ j3LegCross: 0.005 * lv })),
    node('wl_l2', 'wl_l', 2, '🛡️', 'เลือดนักสู้', 3, (lv) => `Auto Guard +${pct(0.002 * lv)} ต่อแต้มในสาย ⚔️ ดวล (สูงสุด +${pct(P.leg.guardCap)})`, (lv) => ({ j3LegGuard: 0.002 * lv })),
    node('wl_l3', 'wl_l', 3, '🩸', 'กายาคลั่ง', 3, (lv) => `HP สูงสุด +${pct(0.003 * lv)} ต่อแต้มในสาย 👹 คลั่ง (สูงสุด +${pct(P.leg.hpCap)})`, (lv) => ({ j3LegHp: 0.003 * lv })),
    node('wl_l4', 'wl_l', 4, '👑', 'สืบสาน', 1, () => `สายของ variant ≥ ${P.heirNeed} แต้ม: ⚔️ Guillotine คริแน่นอน + โดนทุกตัวข้างๆ · 📣 Warcry ฟาด 2 รอบ + ช้าทุกตัว`, () => ({ j3Heir: 1 })),
    node('wl_u1', 'wl_u', 1, '🩸', 'กระหายเลือดไร้พ่าย', 3, (lv) => `จบช่วงอมตะ (Ult / ไม่รู้สึกเจ็บ) ฟื้น HP เพิ่ม +${lv * 3}% HP สูงสุด`, (lv) => ({ j3GospelHeal: 0.03 * lv })),
    node('wl_u2', 'wl_u', 2, '🌅', 'คลั่งต่อเนื่อง', 3, (lv) => `Ult จบ → ${C.afterTurns} เทิร์น ดาเมจ +${lv * 5}%`, (lv) => ({ j3AfterBless: 0.05 * lv })),
    node('wl_u3', 'wl_u', 3, '🤝', 'Banding', 2, (lv) => `ดาเมจเข้า −${lv * 2}% ต่อมอนที่ยังอยู่ (นับสูงสุด ${C.bandingMax} ตัว)`, (lv) => ({ j3Banding: 0.02 * lv })),
    node('wl_u4', 'wl_u', 4, '🔥', 'ราชาอมตะ', 1, () => `Undying Bloodlust อมตะนานขึ้น +1 เทิร์น · คริระหว่าง Ult ได้ Rage +${P.ultFuryCritRage} + ฟื้น HP ${pct(P.ultFuryCritHeal)}`, () => ({ j3GospelField: 1 })),
    node('wl_b1', 'wl_b', 1, '⚡', 'Blitz Charges', 3, (lv) => `ASPD +${lv * 6}% · Frenzy ทุก 1 ขั้นเพิ่มคริ +${lv}%`, (lv) => ({ aspd: 0.06 * lv * 1.6, j3WlBlitz: 0.01 * lv })),
    node('wl_b2', 'wl_b', 2, '📣', 'คำรามทลายทัพ', 3, (lv) => `เทิร์นแรกของไฟต์ คำรามฟาดทุกตัว P.ATK x${(1.2 * lv).toFixed(1)} + เกราะแตก 1 เทิร์น + Rage +${P.warcryRage}`, (lv) => ({ j3EarthDrive: 1.2 * lv })),
    node('wl_b3', 'wl_b', 3, '💀', 'Rite of Ruin', 3, (lv) => `ดาเมจคริ +${lv * 12}% · เจาะเกราะกายภาพ +${lv * 6}%`, (lv) => ({ critMul: 0.12 * lv, physPen: 0.06 * lv })),
    node('wl_b4', 'wl_b', 4, '🦁', 'Bloodscent Parrying', 1, () => `1 ครั้ง/ไฟต์ HP < ${C.inspireAt * 100}%: ${C.inspireTurns} เทิร์น บล็อก ${C.inspireGuard * 100}% + ฮีล ${C.inspireHeal * 100}% + Rage +${P.ultRageGain}`, () => ({ j3Inspire: 1 })),
  ],
  talents: [],
}
