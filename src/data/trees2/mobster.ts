// 🕴️ Mobster ใยชั้น 2 (design/second-jobs-v1.md §4). Node ids are save data: never rename.
import { node as n, type ClassTree } from '../tree-types'

export const tree2: ClassTree = {
  branches: [
    { id: 'mb_p', job: 'thief', job2: 'mobster', name: 'พิษ', icon: '🧪', blurb: 'พิษแรง · stack สูง' },
    { id: 'mb_d', job: 'thief', job2: 'mobster', name: 'ดีบัฟ', icon: '⛓️', blurb: 'ดีบัฟนาน · หนี้หนักขึ้น' },
    { id: 'mb_e', job: 'thief', job2: 'mobster', name: 'เก็บงาน', icon: '⚰️', blurb: 'เกณฑ์ Execute · เก็บแล้วได้เทิร์น' },
  ],
  nodes: [
    n('mb_p1', 'mb_p', 1, '🧪', 'พิษเข้ม', 3, (lv) => `ดาเมจพิษ +${lv}/stack`, (lv) => ({ poisonDmg: lv })),
    n('mb_p2', 'mb_p', 2, '🫙', 'พิษสะสม', 3, (lv) => `พิษ stack สูงสุด +${lv * 3}`, (lv) => ({ poisonCap: 3 * lv })),
    n('mb_p3', 'mb_p', 3, '☠️', 'กัดกร่อน', 3, (lv) => `ตีมอนติดพิษ ดาเมจ +${lv * 5}%`, (lv) => ({ vsPoison: 0.05 * lv })),
    n('mb_p4', 'mb_p', 4, '💉', 'พิษซ้อน', 1, () => 'ทุกฮิตติดพิษ +1 stack', () => ({ poison: 1 })),
    n('mb_d1', 'mb_d', 1, '⛓️', 'มัดแน่น', 2, (lv) => `ตัดเส้นเอ็น ดีบัฟนาน +${lv} เทิร์น`, (lv) => ({ j2DebuffTurns: lv })),
    n('mb_d2', 'mb_d', 2, '🪨', 'หนังหนา', 3, (lv) => `P.DEF +${lv * 3} · ต้านทาน +${lv * 5}%`, (lv) => ({ def: 3 * lv, tenacity: 0.05 * lv })),
    n('mb_d3', 'mb_d', 3, '🧊', 'เย็นยะเยือก', 3, (lv) => `ตีมอนติดช้า ดาเมจ +${lv * 5}%`, (lv) => ({ vsChill: 0.05 * lv })),
    n('mb_d4', 'mb_d', 4, '📒', 'ดอกเบี้ยทบต้น', 1, () => 'ดีบัฟทุกชนิดนับหนี้ x2', () => ({ j2DebtX2: 1 })),
    n('mb_e1', 'mb_e', 1, '⚰️', 'ทวงไว', 3, (lv) => `เกณฑ์ Execute +${lv}% HP`, (lv) => ({ j2ExecAdd: 0.01 * lv })),
    n('mb_e2', 'mb_e', 2, '🎯', 'เล็งจุดอ่อน', 3, (lv) => `คริ +${lv * 3}%`, (lv) => ({ crit: 0.03 * lv })),
    n('mb_e3', 'mb_e', 3, '🔪', 'มีดเพชฌฆาต', 3, (lv) => `ดาเมจคริ +${lv * 10}%`, (lv) => ({ critMul: 0.1 * lv })),
    n('mb_e4', 'mb_e', 4, '🕴️', 'งานต่อไป', 1, () => 'Execute สำเร็จ = ได้เทิร์นพิเศษทันที (1 ครั้ง/เทิร์น)', () => ({ j2ExecTurn: 1 })),
  ],
  talents: [],
}
