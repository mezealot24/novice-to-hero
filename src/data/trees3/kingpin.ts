// ===== ใยชั้น 3: 🎩 Kingpin (Mobster Awakening · loan shark boss: debts pay interest) (docs/design/awakening-last-four-v1.md) =====
// 3 branches x 4 nodes (tier 1-3 + ★). Ids are save data: never rename. Caps / shared numbers live in KIT3.
// ⚔️ ตำนาน = legacy: the more points the hero put in the 2nd-job web (ใยชั้น 2), the more these give (hero-stats.ts reads branch points).
import { node, type ClassTree } from '../tree-types'
import { KIT3 } from '../skill-math'

const P = KIT3.kingpin, C = KIT3.common
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`

export const tree3: ClassTree = {
  branches: [
    { id: 'kp_l', job: 'thief', job2: 'mobster', name: 'ตำนาน', icon: '⚔️', blurb: 'แต้มในใยชั้น 2 ยิ่งเยอะยิ่งแรง' },
    { id: 'kp_t', job: 'thief', job2: 'mobster', name: 'ยึดกิจการ', icon: '🏦', blurb: 'Hostile Takeover: ฮีล · ดอกเบี้ย · ฟันเพิ่ม' },
    { id: 'kp_f', job: 'thief', job2: 'mobster', name: 'แก๊ง', icon: '🕴️', blurb: 'ค่าคุ้มครองเปิดไฟต์ · บอดี้การ์ด · Untouchable' },
  ],
  nodes: [
    node('kp_l1', 'kp_l', 1, '🧪', 'พิษบรรพชน', 3, (lv) => `ทวงหนี้ / Hostile Takeover +${pct(0.005 * lv)} ต่อแต้มในสาย 🧪 พิษ (สูงสุด +${pct(P.leg.crossCap)})`, (lv) => ({ j3LegCross: 0.005 * lv })),
    node('kp_l2', 'kp_l', 2, '⚰️', 'บัญชีบรรพชน', 3, (lv) => `เกณฑ์ Execute +${pct(0.001 * lv)} ต่อแต้มในสาย ⚰️ เก็บงาน (สูงสุด +${pct(P.leg.guardCap)})`, (lv) => ({ j3LegGuard: 0.001 * lv })),
    node('kp_l3', 'kp_l', 3, '⛓️', 'กายบรรพชน', 3, (lv) => `HP สูงสุด +${pct(0.003 * lv)} ต่อแต้มในสาย ⛓️ ดีบัฟ (สูงสุด +${pct(P.leg.hpCap)})`, (lv) => ({ j3LegHp: 0.003 * lv })),
    node('kp_l4', 'kp_l', 4, '👑', 'สืบสาน', 1, () => `สายของ variant ≥ ${P.heirNeed} แต้ม: 💰 Shakedown + อ่อนแรงทุกตัว −${pct(P.varA.heirWeak)} · 📜 Hit Contract ฟัน 2 ครั้ง`, () => ({ j3Heir: 1 })),
    node('kp_t1', 'kp_t', 1, '💵', 'เก็บส่วย', 3, (lv) => `ฟันรอบ 2 โดน 1 ตัว ฮีล ${lv}% HP สูงสุด (นับสูงสุด ${P.gospelHealMax} ตัว)`, (lv) => ({ j3GospelHeal: 0.01 * lv })),
    node('kp_t2', 'kp_t', 2, '🌅', 'พรหลังศึก', 3, (lv) => `Ult จบ → ${C.afterTurns} เทิร์น ดาเมจ +${lv * 5}%`, (lv) => ({ j3AfterBless: 0.05 * lv })),
    node('kp_t3', 'kp_t', 3, '📈', 'ดอกเบี้ยรายวัน', 2, (lv) => `Loan Shark: ดาเมจต่อหนี้ +${pct(0.0075 * lv)} (รวม ${pct(P.debtAmp + 0.0075 * lv)}/ก้อน)`, (lv) => ({ j3KpDebtAmp: 0.0075 * lv })),
    node('kp_t4', 'kp_t', 4, '🏚️', 'ล้มละลาย', 1, () => 'Hostile Takeover ฟันเพิ่มอีก 1 รอบ', () => ({ j3GospelField: 1 })),
    node('kp_f1', 'kp_f', 1, '🧾', 'ค่าคุ้มครอง', 3, (lv) => `เทิร์นแรกของไฟต์ มอนทุกตัวติดพิษ ${lv * 2} stack + ช้า ${P.openerChill} เทิร์น (เริ่มมีหนี้ 2 ก้อนทันที)`, (lv) => ({ j3EarthDrive: 2 * lv })),
    node('kp_f2', 'kp_f', 2, '🤝', 'บอดี้การ์ด', 3, (lv) => `ดาเมจเข้า −${lv * 2}% ต่อมอนที่ยังอยู่ (นับสูงสุด ${C.bandingMax} ตัว)`, (lv) => ({ j3Banding: 0.02 * lv })),
    node('kp_f3', 'kp_f', 3, '☠️', 'พิษเข้ากระแสเลือด', 3, (lv) => `ตีมอนติดพิษ ดาเมจ +${lv * 4}% · ดาเมจคริ +${lv * 8}%`, (lv) => ({ vsPoison: 0.04 * lv, critMul: 0.08 * lv })),
    node('kp_f4', 'kp_f', 4, '🎩', 'Untouchable', 1, () => `1 ครั้ง/ไฟต์ HP < ${C.inspireAt * 100}%: ${C.inspireTurns} เทิร์น บล็อก ${C.inspireGuard * 100}% + บล็อกฮีล ${C.inspireHeal * 100}%`, () => ({ j3Inspire: 1 })),
  ],
  talents: [],
}
