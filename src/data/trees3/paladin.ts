// ===== ใยชั้น 3: ⚜️ Paladin (Crusader Awakening, design/awakening-crusader-v1.md §4.4) =====
// 3 branches x 4 nodes (tier 1-3 + ★). Ids are save data: never rename. Numbers here are per level; caps live in KIT3.paladin.
// ⚜️ ตำนาน = legacy: the more points the hero put in the Crusader web (ใยชั้น 2), the more these give (meta.ts reads branch points).
import { node, type ClassTree } from '../tree-types'
import { KIT3 } from '../skill-math'

const P = KIT3.paladin, C = KIT3.common
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`

export const tree3: ClassTree = {
  branches: [
    { id: 'pa_l', job: 'cleric', job2: 'crusader', name: 'ตำนาน', icon: '⚜️', blurb: 'แต้มในใยชั้น 2 ยิ่งเยอะยิ่งแรง' },
    { id: 'pa_g', job: 'cleric', job2: 'crusader', name: 'พระวรสาร', icon: '✨', blurb: 'Gospel Cross: ฮีล ศรัทธา pulse' },
    { id: 'pa_r', job: 'cleric', job2: 'crusader', name: 'ราชองครักษ์', icon: '🏰', blurb: 'บล็อกแล้วสวน · ลดดาเมจ · เปิดไฟต์' },
  ],
  nodes: [
    node('pa_l1', 'pa_l', 1, '✝️', 'รากกางเขน', 3, (lv) => `Holy Cross / Grand Cross +${pct(0.005 * lv)} ต่อแต้มในสาย ✝️ กางเขน (สูงสุด +${pct(P.leg.crossCap)})`, (lv) => ({ j3LegCross: 0.005 * lv })),
    node('pa_l2', 'pa_l', 2, '🛡️', 'โล่บรรพชน', 3, (lv) => `Auto Guard +${pct(0.002 * lv)} ต่อแต้มในสาย 🛡️ โล่ (สูงสุด +${pct(P.leg.guardCap)})`, (lv) => ({ j3LegGuard: 0.002 * lv })),
    node('pa_l3', 'pa_l', 3, '🙏', 'กายบรรพชน', 3, (lv) => `HP สูงสุด +${pct(0.003 * lv)} ต่อแต้มในสาย 🙏 อุทิศ (สูงสุด +${pct(P.leg.hpCap)})`, (lv) => ({ j3LegHp: 0.003 * lv })),
    node('pa_l4', 'pa_l', 4, '👑', 'สืบสาน', 1, () => `สายของ variant ≥ ${P.heirNeed} แต้ม: 🔗 เด้ง +1 ตัว · ⚖️ ตาบอดทุกตัว`, () => ({ j3Heir: 1 })),
    node('pa_g1', 'pa_g', 1, '💛', 'แสงพระวรสาร', 3, (lv) => `ทุก pulse ฮีล ${lv}% HP ต่อมอนที่โดน (สูงสุด ${P.gospelHealMax} ตัว)`, (lv) => ({ j3GospelHeal: 0.01 * lv })),
    node('pa_g2', 'pa_g', 2, '🌅', 'พรหลังศึก', 3, (lv) => `Grand Cross จบ → ${C.afterTurns} เทิร์น ดาเมจ +${lv * 5}%`, (lv) => ({ j3AfterBless: 0.05 * lv })),
    node('pa_g3', 'pa_g', 3, '📿', 'ศรัทธาเร่ง', 2, (lv) => `pulse ที่โดน ≥ ${P.gospelAt} ตัว ได้ศรัทธา +${lv} เพิ่ม`, (lv) => ({ j3GospelFaith: lv })),
    node('pa_g4', 'pa_g', 4, '🌟', 'สนามพระวรสาร', 1, () => 'Grand Cross pulse +1 อีกครั้ง', () => ({ j3GospelField: 1 })),
    node('pa_r1', 'pa_r', 1, '🛡️', 'Shield Press', 3, (lv) => `บล็อกได้ = ฟาดโล่ใส่ตัวที่ตี P.DEF x${(0.3 * lv).toFixed(1)}`, (lv) => ({ j3Press: 0.3 * lv })),
    node('pa_r2', 'pa_r', 2, '🤝', 'Banding', 3, (lv) => `ดาเมจเข้า −${lv * 2}% ต่อมอนที่ยังอยู่ (นับสูงสุด ${C.bandingMax} ตัว)`, (lv) => ({ j3Banding: 0.02 * lv })),
    node('pa_r3', 'pa_r', 3, '🌋', 'Earth Drive', 3, (lv) => `เทิร์นแรกของไฟต์ ฟาดทุกตัว P.DEF x${(0.4 * lv).toFixed(1)} + เกราะแตก 1 เทิร์น`, (lv) => ({ j3EarthDrive: 0.4 * lv })),
    node('pa_r4', 'pa_r', 4, '🦁', 'Inspiration', 1, () => `1 ครั้ง/ไฟต์ HP < ${C.inspireAt * 100}%: ${C.inspireTurns} เทิร์น Auto Guard เต็มเพดาน + บล็อกฮีล ${C.inspireHeal * 100}%`, () => ({ j3Inspire: 1 })),
  ],
  talents: [],
}
