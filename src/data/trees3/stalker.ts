// ===== ใยชั้น 3: 🥷 Stalker (Rogue Awakening · RO Stalker + Katarina / Zed) (docs/design/awakening-last-four-v1.md) =====
// 3 branches x 4 nodes (tier 1-3 + ★). Ids are save data: never rename. Caps / shared numbers live in KIT3.
// ⚔️ ตำนาน = legacy: the more points the hero put in the 2nd-job web (ใยชั้น 2), the more these give (hero-stats.ts reads branch points).
import { node, type ClassTree } from '../tree-types'
import { KIT3 } from '../skill-math'

const P = KIT3.stalker, C = KIT3.common
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`

export const tree3: ClassTree = {
  branches: [
    { id: 'sk_l', job: 'thief', job2: 'rogue', name: 'ตำนาน', icon: '⚔️', blurb: 'แต้มในใยชั้น 2 ยิ่งเยอะยิ่งแรง' },
    { id: 'sk_p', job: 'thief', job2: 'rogue', name: 'ภูตมีด', icon: '👻', blurb: 'Phantom Storm: ดูดเลือด · ทะลุเกราะ · มีดเพิ่ม' },
    { id: 'sk_s', job: 'thief', job2: 'rogue', name: 'ย่องเงา', icon: '🌑', blurb: 'Ambush เปิดไฟต์ · Tunnel Drive · Hide' },
  ],
  nodes: [
    node('sk_l1', 'sk_l', 1, '🔪', 'มีดบรรพชน', 3, (lv) => `พายุมีด / Phantom Storm +${pct(0.005 * lv)} ต่อแต้มในสาย 🔪 มีด (สูงสุด +${pct(P.leg.crossCap)})`, (lv) => ({ j3LegCross: 0.005 * lv })),
    node('sk_l2', 'sk_l', 2, '💨', 'เงาบรรพชน', 3, (lv) => `FLEE +${(0.4 * lv).toFixed(1)} ต่อแต้มในสาย 🔁 คอมโบ (สูงสุด +${P.leg.guardCap})`, (lv) => ({ j3LegGuard: 0.4 * lv })),
    node('sk_l3', 'sk_l', 3, '🩸', 'กายบรรพชน', 3, (lv) => `HP สูงสุด +${pct(0.003 * lv)} ต่อแต้มในสาย 💥 คริ (สูงสุด +${pct(P.leg.hpCap)})`, (lv) => ({ j3LegHp: 0.003 * lv })),
    node('sk_l4', 'sk_l', 4, '👑', 'สืบสาน', 1, () => `สายของ variant ≥ ${P.heirNeed} แต้ม: 🌀 Fan of Knives ตรา +${P.varA.heirMarks} แทน +${P.varA.marks} และ Strip Armor ทุกตัว · 🎯 Assassinate ไม่ตายก็คูลดาวน์ -${P.varB.heirCdCut}`, () => ({ j3Heir: 1 })),
    node('sk_p1', 'sk_p', 1, '🧛', 'มีดดูดวิญญาณ', 3, (lv) => `มีดระลอก 2 ทุกเล่ม ฮีล ${lv}% HP สูงสุด (นับสูงสุด ${P.gospelHealMax} เล่ม)`, (lv) => ({ j3GospelHeal: 0.01 * lv })),
    node('sk_p2', 'sk_p', 2, '🌅', 'พรหลังศึก', 3, (lv) => `Ult จบ → ${C.afterTurns} เทิร์น ดาเมจ +${lv * 5}%`, (lv) => ({ j3AfterBless: 0.05 * lv })),
    node('sk_p3', 'sk_p', 3, '🗡️', 'มีดทะลวงเงา', 2, (lv) => `มีดบินทุกเล่ม (คอมโบ / พายุมีด / Phantom) ข้าม DEF ${lv * 10}%`, (lv) => ({ j3Pierce: 0.1 * lv })),
    node('sk_p4', 'sk_p', 4, '🌪️', 'พันเงา', 1, () => 'Phantom Storm ปามีดเพิ่มอีก 2 เล่ม', () => ({ j3GospelField: 2 })),
    node('sk_s1', 'sk_s', 1, '🥷', 'Ambush', 3, (lv) => `เทิร์นแรกของไฟต์ ปามีดบินฟรี ${lv * 2} เล่ม (ติดตราคมมีดตามปกติ)`, (lv) => ({ j3EarthDrive: 2 * lv })),
    node('sk_s2', 'sk_s', 2, '🕳️', 'Tunnel Drive', 3, (lv) => `ดาเมจเข้า −${lv * 2}% ต่อมอนที่ยังอยู่ (นับสูงสุด ${C.bandingMax} ตัว)`, (lv) => ({ j3Banding: 0.02 * lv })),
    node('sk_s3', 'sk_s', 3, '💀', 'Reject Sword', 3, (lv) => `ดาเมจคริ +${lv * 10}% · สกิลคริ +${lv * 3}%`, (lv) => ({ critMul: 0.1 * lv, skillCrit: 0.03 * lv })),
    node('sk_s4', 'sk_s', 4, '🌑', 'Hide', 1, () => `1 ครั้ง/ไฟต์ HP < ${C.inspireAt * 100}%: ${C.inspireTurns} เทิร์น หลบการโจมตีกายภาพ ${C.inspireGuard * 100}% + หลบได้ฮีล ${C.inspireHeal * 100}%`, () => ({ j3Inspire: 1 })),
  ],
  talents: [],
}
