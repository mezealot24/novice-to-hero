// 🏹 Archer skill tree + talents. Owned by the archer design thread; edit freely, only this file.
// Spec: design/skill-tree-archer.md. Node ids are save data: never rename or remove a shipped id.
// Behaviour flags (ar*, pierce, lockOn, dodgeStrike) live in Stats (game-data.ts) and are read in BattleScene.
import { lvAt, node as n, talent as t, type ClassTree } from '../tree-types'
import { KIT } from '../skill-math'

const r2 = (rank: number, a: number, b: number) => (rank >= 2 ? b : a)
const A = KIT.archerTree, pc = (x: number) => `${Math.round(x * 100)}%`
/** Per-level table value (lv 1..n; v83: straight line between levels for stretched nodes). */
const at = lvAt

export const tree: ClassTree = {
  branches: [
    { id: 'archer_a', job: 'archer', name: 'ซุ่มยิง', icon: '🎯', blurb: 'ฆ่าบอส · คริแรง · ยิงสวนท่าชาร์จ' },
    { id: 'archer_b', job: 'archer', name: 'พริ้วไหว', icon: '🍃', blurb: 'คอมโบ · หลบแล้วได้โล่ · ยิงสวน' },
    // v82: ARCHER ATTACH in data/tree.ts: archer_c under ทักษะ 1, archer_d under Ult
    { id: 'archer_c', job: 'archer', name: 'ศรพิษ', icon: '🧪', blurb: 'ยิงคู่ติดพิษ · ตีตัวติดพิษแรง · ศรเด้ง · ★ พิษลาม' },
    { id: 'archer_d', job: 'archer', name: 'ล่าหัว', icon: '🏷️', blurb: 'ศรทะลวงหมายหัว · ฆ่าแล้วเร่ง ult · ★ ประหาร' },
  ],
  nodes: [
    n('archer_a1', 'archer_a', 1, '🦅', 'สายตาพราน', 3, (lv) => `คริ +${lv * 4}%`, (lv) => ({ crit: 0.04 * lv })),
    n('archer_a2', 'archer_a', 2, '💥', 'จุดตาย', 3, (lv) => `ดาเมจคริ +${lv * 20}%`, (lv) => ({ critMul: 0.2 * lv })),
    n('archer_a3', 'archer_a', 3, '🔩', 'ทะลวงเกราะ', 3, (lv) => `ศรทะลวงไม่สน P.DEF ${lv * 25}% · ยิงบอสที่กำลังชาร์จแรงขึ้น +${lv * 15}%`, (lv) => ({ pierce: 0.25 * lv, arUltBreak: 0.15 * lv })),
    n('archer_a4', 'archer_a', 4, '🎯', 'ล็อกเป้า', 1, () => 'ยิงตัวเดิมติดกัน ดาเมจ +8%/ชั้น (สูงสุด 5) · ยิงคู่ยิงตัวที่ล็อก · ฆ่าตัวที่ล็อกได้ = หลบแน่นอน 1 ครั้ง', () => ({ lockOn: 1 })),
    n('archer_b1', 'archer_b', 1, '🏹', 'ยิงรัว', 3, (lv) => `คอมโบ +${lv * 5}%`, (lv) => ({ combo: 0.05 * lv })),
    n('archer_b2', 'archer_b', 2, '🍃', 'ฝีเท้าลม', 3, (lv) => `Flee +${lv * 4} · หลบโชคดี +${lv * 2}%`, (lv) => ({ flee: 4 * lv, luckyDodge: 0.02 * lv })),
    n('archer_b3', 'archer_b', 3, '🌬️', 'โล่ลม', 3, (lv) => `หลบได้แล้วได้โล่ ${lv * 3}% ของ HP สูงสุด (สะสมได้ 3 เท่า)`, (lv) => ({ arDodgeShield: 0.03 * lv })),
    n('archer_b4', 'archer_b', 4, '↪️', 'ยิงถอย', 1, () => 'หลบได้แล้วยิงสวน 0.8x ทันที + Energy +5', () => ({ dodgeStrike: 1, arDodgeRes: 5 })),
    n('archer_c1', 'archer_c', 1, '🧪', 'ศรอาบพิษ', 3, (lv) => `ยิงคู่ทุกดอก ${pc(at(A.poisonArrow, lv))} ติดพิษ +${A.poisonArrowStacks} stack`, (lv) => ({ arPoisonArrow: at(A.poisonArrow, lv) })),
    n('archer_c2', 'archer_c', 2, '🩸', 'ซ้ำแผล', 3, (lv) => `ตีตัวที่ติดพิษ +${pc(A.vsPoison * lv)}`, (lv) => ({ vsPoison: A.vsPoison * lv })),
    n('archer_c3', 'archer_c', 3, '🍃', 'ศรเด้ง', 3, (lv) => `ยิงคู่ฆ่าได้ → ศรเด้งไปตัวถัดไปฟรี ${at(A.ricochet, lv)}x`, (lv) => ({ arRicochet: at(A.ricochet, lv) })),
    n('archer_c4', 'archer_c', 4, '🌫️', 'หมอกพิษ', 1, () => 'ตัวติดพิษตาย → พิษครึ่งหนึ่งลามไปตัวอื่น · ฝนธนู / กับดัก ติดพิษ +1 stack', () => ({ poisonSpread: 1, arPoisonS2: 1 })),
    n('archer_d1', 'archer_d', 1, '🏷️', 'หมายหัว', 3, (lv) => `ศรทะลวงหมายหัวเป้า ${A.markTurns} เทิร์น: โดนทุกฮิตแรงขึ้น +${pc(A.markAmp * lv)}`, (lv) => ({ arMark: A.markAmp * lv })),
    n('archer_d2', 'archer_d', 2, '⚡', 'ไล่ล่า', 3, (lv) => `ฆ่าตัวที่หมายหัว → Energy +${A.markJumpRes * lv} · หมายหัวกระโดดไปตัวหน้าสุด`, (lv) => ({ arMarkJump: A.markJumpRes * lv })),
    n('archer_d3', 'archer_d', 3, '⏳', 'ล่าต่อ', 3, (lv) => `ฆ่าได้ ${pc(at(A.killCd, lv))} คูลดาวน์ ult −${A.killCdCut}`, (lv) => ({ arKillCd: at(A.killCd, lv) })),
    n('archer_d4', 'archer_d', 4, '💀', 'ศรประหาร', 1, () => `ศรทะลวงใส่ตัวที่ HP < ${pc(A.execBelow)}: มอนธรรมดาตายทันที · บอส/มินิ +${pc(A.execBig)}`, () => ({ arExecute: 1 })),
  ],
  talents: [
    // row 1 (Job Lv 5): basic shot
    t('ar_t1a', 1, '🍃', 'ศรนำทาง', 2, (r) => `Hit +${r2(r, 10, 18)}`, (r) => ({ hit: r2(r, 10, 18) })),
    t('ar_t1b', 1, '🏃', 'ก้าวถอย', 2, (r) => `เริ่มทุกเวฟด้วยหลบแน่นอน 1 ครั้ง${r >= 2 ? ' · Flee +6' : ''}`, (r) => ({ arWaveDodge: 1, flee: r2(r, 0, 6) })),
    t('ar_t1c', 1, '🩸', 'เก็บตัวเปราะ', 2, (r) => `ยิงปกติเล็งตัวที่ HP ต่ำสุด${r >= 2 ? ' · ดาเมจใส่ตัวที่ HP < 50% +15%' : ''}`, (r) => ({ arSnipeLow: 1, arLowHpBonus: r2(r, 0, 0.15) })),
    // row 2 (Job Lv 10): ยิงคู่ (auto)
    t('ar_t2a', 2, '🏹', 'ศรสามดอก', 2, (r) => `ยิงคู่ → 3 ดอก ดอกละ ${r2(r, 0.65, 0.75)}x (เวฟฝูง)`, (r) => ({ arVolley: r2(r, 0.65, 0.75) })),
    t('ar_t2b', 2, '🎯', 'ศรเล็ง', 2, (r) => `ยิงคู่ใส่ตัวหน้าสุด ดอกละ ${r2(r, 1, 1.1)}x · คริ +${r2(r, 15, 25)}% (บอส)`, (r) => ({ arAim: r2(r, 1, 1.1), arAimCrit: r2(r, 0.15, 0.25) })),
    t('ar_t2c', 2, '⚡', 'ศรเบา', 2, (r) => `ยิงคู่ใช้ Energy ${r2(r, 30, 25)} แทน 40`, (r) => ({ autoCostCut: r2(r, 10, 15) })),
    // row 3 (Job Lv 20): ศรทะลวง (ult)
    t('ar_t3a', 3, '💥', 'ศรเจาะทะลุ', 2, (r) => `ศรทะลวงโดนตัวอื่นทุกตัวด้วย ${r2(r, 1.5, 2)}x`, (r) => ({ arUltSplash: r2(r, 1.5, 2) })),
    t('ar_t3b', 3, '💨', 'ถอยยาว', 2, (r) => `ศรทะลวงหลบแน่นอน 2 ครั้ง แต่ดาเมจ ${r2(r, 4, 4.5)}x`, (r) => ({ arUltDodge: 1, arUltMulCut: r2(r, 1, 0.5) })),
    t('ar_t3c', 3, '🔨', 'ศรบั่น', 2, (r) => `ศรทะลวงใส่บอสที่กำลังชาร์จ x${r2(r, 1.6, 2)}`, (r) => ({ arUltBreak: r2(r, 0.6, 1) })),
    // row 4 (Job Lv 30): identity
    t('ar_t4a', 4, '🦅', 'เหยี่ยวคู่ใจ', 2, (r) => `ทุก 3 เทิร์นเหยี่ยวจิกตัวสุ่ม ${r2(r, 0.6, 0.9)}x (ไม่พลาด)`, (r) => ({ arHawk: r2(r, 0.6, 0.9) })),
    t('ar_t4b', 4, '🌬️', 'สมาธิพราน', 2, (r) => `เริ่มทุกเวฟด้วย Energy เต็ม${r >= 2 ? ' · Energy +5/เทิร์น' : ''}`, (r) => ({ arStartFull: 1, arTurnRes: r2(r, 0, 5) })),
    t('ar_t4c', 4, '🍀', 'ลมหายใจนักล่า', 2, (r) => `คริแล้วได้ Energy +${r2(r, 6, 10)}`, (r) => ({ arCritRes: r2(r, 6, 10) })),
  ],
}
