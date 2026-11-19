// ===== ใยชั้น 3: 🌌 High Wizard (Wizard Awakening · RO High Wizard: Mystical Amplification + Gravitation Field) (docs/design/awakening-last-four-v1.md) =====
// 3 branches x 4 nodes (tier 1-3 + ★). Ids are save data: never rename. Caps / shared numbers live in KIT3.
// ⚔️ ตำนาน = legacy: the more points the hero put in the 2nd-job web (ใยชั้น 2), the more these give (hero-stats.ts reads branch points).
import { node, type ClassTree } from '../tree-types'
import { KIT3 } from '../skill-math'

const P = KIT3.highwizard, C = KIT3.common
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`

export const tree3: ClassTree = {
  branches: [
    { id: 'hw_l', job: 'mage', job2: 'wizard', name: 'ตำนาน', icon: '⚔️', blurb: 'แต้มในสายธาตุที่ลงมากสุดของใยชั้น 2 ยิ่งเยอะยิ่งแรง' },
    { id: 'hw_g', job: 'mage', job2: 'wizard', name: 'แรงโน้มถ่วง', icon: '🌌', blurb: 'Gravitation Field: ดูด Mana · ทะลุ M.DEF · ระลอกเพิ่ม' },
    { id: 'hw_a', job: 'mage', job2: 'wizard', name: 'ขยายเวท', icon: '🔮', blurb: 'เปิดไฟต์ · Energy Coat · Amplify แรงขึ้น · Safety Wall' },
  ],
  nodes: [
    node('hw_l1', 'hw_l', 1, '☄️', 'คัมภีร์บรรพชน', 3, (lv) => `มหาเวทธาตุ / Gravitation +${pct(0.005 * lv)} ต่อแต้มในสายธาตุที่ลงมากสุด (สูงสุด +${pct(P.leg.crossCap)})`, (lv) => ({ j3LegCross: 0.005 * lv })),
    node('hw_l2', 'hw_l', 2, '🛡️', 'ผนึกบรรพชน', 3, (lv) => `M.DEF +${pct(0.002 * lv)} ต่อแต้มในสายธาตุที่ลงมากสุด (สูงสุด +${pct(P.leg.guardCap)})`, (lv) => ({ j3LegGuard: 0.002 * lv })),
    node('hw_l3', 'hw_l', 3, '❤️', 'กายบรรพชน', 3, (lv) => `HP สูงสุด +${pct(0.003 * lv)} ต่อแต้มในสายธาตุที่ลงมากสุด (สูงสุด +${pct(P.leg.hpCap)})`, (lv) => ({ j3LegHp: 0.003 * lv })),
    node('hw_l4', 'hw_l', 4, '👑', 'สืบสาน', 1, () => `สายของ variant ≥ ${P.heirNeed} แต้ม: ❄️ Frost Nova +${P.varA.heirHits} ฮิตอีก · ⚡ Jupitel Thunder ลูกสุดท้ายมึน (บอส/มินิ: ผลักเกจ x2)`, () => ({ j3Heir: 1 })),
    node('hw_g1', 'hw_g', 1, '💧', 'Soul Drain', 3, (lv) => `Gravitation โดน 1 ตัว = Mana +${lv * 3}`, (lv) => ({ j3HwDrain: 3 * lv })),
    node('hw_g2', 'hw_g', 2, '🌅', 'พรหลังศึก', 3, (lv) => `Ult จบ → ${C.afterTurns} เทิร์น ดาเมจ +${lv * 5}%`, (lv) => ({ j3AfterBless: 0.05 * lv })),
    node('hw_g3', 'hw_g', 3, '🕳️', 'Ganbantein', 2, (lv) => `Gravitation ข้าม M.DEF เพิ่ม ${lv * 15}% (รวม ${Math.round((P.gravPierce + 0.15 * lv) * 100)}%)`, (lv) => ({ j3Pierce: 0.15 * lv })),
    node('hw_g4', 'hw_g', 4, '🪐', 'หลุมดำ', 1, () => 'Gravitation Field บดเพิ่มอีก 1 ระลอก', () => ({ j3GospelField: 1 })),
    node('hw_a1', 'hw_a', 1, '🔥', 'Fire Pillar', 3, (lv) => `เทิร์นแรกของไฟต์ เสาเพลิงใส่ทุกตัว ${(0.5 * lv).toFixed(1)}x Pm + ติดไฟ 1 stack`, (lv) => ({ j3EarthDrive: 0.5 * lv })),
    node('hw_a2', 'hw_a', 2, '🧥', 'Energy Coat', 3, (lv) => `ดาเมจเข้า −${lv * 2}% ต่อมอนที่ยังอยู่ (นับสูงสุด ${C.bandingMax} ตัว)`, (lv) => ({ j3Banding: 0.02 * lv })),
    node('hw_a3', 'hw_a', 3, '🔮', 'Amplify เข้มข้น', 3, (lv) => `Amplify ดาเมจเวท +${lv * 4}% (รวม ${Math.round((P.amp + 0.04 * lv) * 100)}%)`, (lv) => ({ j3HwAmp: 0.04 * lv })),
    node('hw_a4', 'hw_a', 4, '🧱', 'Safety Wall', 1, () => `1 ครั้ง/ไฟต์ HP < ${C.inspireAt * 100}%: ${C.inspireTurns} เทิร์น กำแพงบล็อกการโจมตีกายภาพ ${C.inspireGuard * 100}% + บล็อกฮีล ${C.inspireHeal * 100}%`, () => ({ j3Inspire: 1 })),
  ],
  talents: [],
}
