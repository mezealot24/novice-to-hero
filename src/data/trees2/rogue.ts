// 🔪 Rogue ใยชั้น 2 (design/second-jobs-v1.md §4). Node ids are save data: never rename.
import { node as n, type ClassTree } from '../tree-types'

export const tree2: ClassTree = {
  branches: [
    { id: 'rg_k', job: 'thief', job2: 'rogue', name: 'มีด', icon: '🔪', blurb: 'มีดบิน แรงขึ้น / เยอะขึ้น' },
    { id: 'rg_c', job: 'thief', job2: 'rogue', name: 'คอมโบ', icon: '🔁', blurb: 'คอมโบติดบ่อย = มีดบินบ่อย' },
    { id: 'rg_x', job: 'thief', job2: 'rogue', name: 'คริ', icon: '💥', blurb: 'คริ · ดาเมจคริ · คริแล้วปามีด' },
  ],
  nodes: [
    n('rg_k1', 'rg_k', 1, '🔪', 'มีดคม', 3, (lv) => `มีดบินแรง +${lv * 10}% P.ATK`, (lv) => ({ j2KnifeMul: 0.1 * lv })),
    n('rg_k2', 'rg_k', 2, '🎯', 'ปาแม่น', 3, (lv) => `HIT +${lv * 4}`, (lv) => ({ hit: 4 * lv })),
    n('rg_k3', 'rg_k', 3, '🗡️', 'คมเหล็ก', 3, (lv) => `P.ATK +${lv * 4}`, (lv) => ({ atk: 4 * lv })),
    n('rg_k4', 'rg_k', 4, '🌠', 'ห่ามีด', 1, () => 'มีดบิน +1 เล่ม ทุกครั้งที่ปา', () => ({ j2KnifeAdd: 1 })),
    n('rg_c1', 'rg_c', 1, '🔁', 'มือไว', 3, (lv) => `โอกาสคอมโบ +${lv * 3}%`, (lv) => ({ combo: 0.03 * lv })),
    n('rg_c2', 'rg_c', 2, '💢', 'แทงรัว', 3, (lv) => `ฮิตคอมโบแรง +${lv * 5}%`, (lv) => ({ comboDmg: 0.05 * lv })),
    n('rg_c3', 'rg_c', 3, '💨', 'เงาพริ้ว', 3, (lv) => `FLEE +${lv * 4}`, (lv) => ({ flee: 4 * lv })),
    n('rg_c4', 'rg_c', 4, '⛓️', 'คอมโบไม่จบ', 1, () => 'Combo Count +1', () => ({ comboCount: 1 })),
    n('rg_x1', 'rg_x', 1, '🎯', 'จุดตาย', 3, (lv) => `คริ +${lv * 3}%`, (lv) => ({ crit: 0.03 * lv })),
    n('rg_x2', 'rg_x', 2, '🩸', 'แผลลึก', 3, (lv) => `ดาเมจคริ +${lv * 10}%`, (lv) => ({ critMul: 0.1 * lv })),
    n('rg_x3', 'rg_x', 3, '🧛', 'ดื่มเลือด', 3, (lv) => `ดูดเลือด +${lv}% (ตีธรรมดา + คอมโบ)`, (lv) => ({ lifesteal: 0.01 * lv })),
    n('rg_x4', 'rg_x', 4, '✨', 'คริเป็นมีด', 1, () => 'ตีธรรมดา/คอมโบคริ = มีดบิน +1 เล่ม', () => ({ j2KnifeCrit: 1 })),
  ],
  talents: [],
}
