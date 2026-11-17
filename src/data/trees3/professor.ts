// ===== ใยชั้น 3: 🎓 Professor (Sage Awakening · element marks + reactions, design/awakening-professor-v1.md) =====
// 3 branches x 4 nodes (tier 1-3 + ★). Ids are save data: never rename. Caps / shared numbers live in KIT3.professor.
// Rule (Q 2026-11-17): no raw-stat node. Every node returns a j3Pf* mechanic key (tests/jobs3.test.ts enforces it).
// ⚔️ ตำนาน = legacy: the more points the hero put in the Sage perk branches (ใยชั้น 2), the more these give (BattleScene reads branch points).
import { node, type ClassTree } from '../tree-types'
import { KIT2, KIT3 } from '../skill-math'

const P = KIT3.professor
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`

export const tree3: ClassTree = {
  branches: [
    { id: 'pf_l', job: 'mage', job2: 'sage', name: 'ตำนาน', icon: '⚔️', blurb: 'แต้ม perk ในใยชั้น 2 ยิ่งเยอะ reaction ยิ่งแรง' },
    { id: 'pf_r', job: 'mage', job2: 'sage', name: 'ลูกโซ่', icon: '⚗️', blurb: 'ตราติดทน · ส่งต่อตรา · reaction คริ · สมการตรีธาตุ' },
    { id: 'pf_p', job: 'mage', job2: 'sage', name: 'ศาสตราจารย์', icon: '📚', blurb: 'Soul Change · Memorize · Double Casting ลึก · Foresight' },
  ],
  nodes: [
    node('pf_l1', 'pf_l', 1, '🔥', 'ตำราเพลิง', 3, (lv) => `reaction ที่มี 🔥 ทิ้งเผา +1 ต่อ ${P.legFireStep} แต้มในสาย 🔥 Fire Bolt (สูงสุด +${lv})`, (lv) => ({ j3PfLegFire: lv })),
    node('pf_l2', 'pf_l', 2, '⚡', 'ตำราอัสนี', 2, (lv) => `reaction ที่มี ⚡ ชิ่ง +1 เป้า ต่อ ${P.legLightStep} แต้มในสาย ⚡ Chain Lightning (สูงสุด +${lv})`, (lv) => ({ j3PfLegLight: lv })),
    node('pf_l3', 'pf_l', 3, '❄️', 'ตำราเยือกแข็ง', 3, (lv) => `reaction ที่มี ❄️ ซ้อน Permafrost +1 ต่อ ${P.legIceStep} แต้มในสาย ❄️ Permafrost (สูงสุด +${lv})`, (lv) => ({ j3PfLegIce: lv })),
    node('pf_l4', 'pf_l', 4, '👑', 'สืบสาน', 1, () => `สายของ variant ≥ ${P.heirNeed} แต้ม: 👊 Spell Fist ฮิตที่ 3 คริแน่ · 🌋 Field แปะตรา 2 ชั้น (จุดได้ 2 ครั้ง)`, () => ({ j3Heir: 1 })),
    node('pf_r1', 'pf_r', 1, '🏷️', 'ตราฝังลึก', 3, (lv) => `ตราธาตุนาน +1 เทิร์น · ${lv * 25}% ตราไม่หายหลังจุด reaction`, (lv) => ({ j3PfMarkTurns: 1, j3PfResidue: 0.25 * lv })),
    node('pf_r2', 'pf_r', 2, '💥', 'ลูกโซ่ธาตุ', 1, () => 'มอนตายจาก reaction → ส่งตราธาตุไปตัวข้างๆ', () => ({ j3PfChain: 1 })),
    node('pf_r3', 'pf_r', 3, '🎯', 'จุดอ่อนธาตุ', 3, (lv) => `reaction ใช้ดาเมจคริ On-Hit (procCritMul) · reaction คริคืน Mana +${lv * 3}`, (lv) => ({ j3PfCritMana: 3 * lv })),
    node('pf_r4', 'pf_r', 4, '🔺', 'สมการตรีธาตุ', 1, () => `ครบ 3 reaction ในเวฟเดียว → Convergence ฟาดทุกตัว ${P.convergeMul}x Pm + reaction แรง +${pct(P.convergeAmp)} จนจบเวฟ`, () => ({ j3PfTrinity: 1 })),
    node('pf_p1', 'pf_p', 1, '💧', 'Soul Change', 3, (lv) => `Mana ล้นเต็ม → แปลงเป็นโล่เวท (1 Mana = โล่ ${Math.round(KIT2.sage.rodVitShield * P.soulChangePer * lv * 10) / 10})`, (lv) => ({ j3PfSoulChange: lv })),
    node('pf_p2', 'pf_p', 2, '📜', 'Memorize', 2, (lv) => `ต้นเวฟบอสร่าย Endow ฟรี (ไม่กิน CD)${lv >= 2 ? ' · Endow ไม่ใช้ Mana ทั้งเวฟบอส' : ''}`, (lv) => ({ j3PfMemorize: lv })),
    node('pf_p3', 'pf_p', 3, '🔁', 'Double Casting ลึก', 2, (lv) => `เกณฑ์ร่ายซ้ำ ${pct(P.dcAt)} → ${pct(P.dcAt - 0.1 * lv)} · ยิงซ้ำแรง +${lv * 15}%`, (lv) => ({ j3PfDcAt: 0.1 * lv, j3PfDcMul: 0.15 * lv })),
    node('pf_p4', 'pf_p', 4, '🔮', 'Foresight', 1, () => `Soul Burst เหลือ Mana ${pct(P.foresightKeep)} · ใช้ตอน Mana ≥ ${pct(P.foresightAt)} → คูลดาวน์ −1`, () => ({ j3PfForesight: 1 })),
  ],
  talents: [],
}
