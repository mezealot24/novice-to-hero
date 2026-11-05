// 🔧 Innovator ใยชั้น 2 (design/second-jobs-v1.md §4). Node ids are save data: never rename.
import { node as n, type ClassTree } from '../tree-types'

export const tree2: ClassTree = {
  branches: [
    { id: 'in_t', job: 'archer', job2: 'innovator', name: 'กับดัก', icon: '💣', blurb: 'กับดักต้นเวฟเยอะขึ้น / แรงขึ้น · ★ Claymore' },
    { id: 'in_g', job: 'archer', job2: 'innovator', name: 'ประดิษฐ์', icon: '🎲', blurb: 'กล่องสุ่มออกของหายากบ่อย / แรง · ★ ทอยใหม่' },
    { id: 'in_r', job: 'archer', job2: 'innovator', name: 'ป้อมปืน', icon: '🤖', blurb: 'หุ่นจิ๋วยิงแรง อยู่นาน · ★ อยู่ทั้งเวฟ' },
  ],
  nodes: [
    n('in_t1', 'in_t', 1, '💣', 'ดินปืนเกรดดี', 3, (lv) => `กับดักแรง +${lv * 20}% P.ATK`, (lv) => ({ j2TrapMul: 0.2 * lv })),
    n('in_t2', 'in_t', 2, '🪤', 'วางเพิ่ม', 2, (lv) => `ต้นเวฟวางกับดัก +${lv} อัน`, (lv) => ({ j2Traps: lv })),
    n('in_t3', 'in_t', 3, '🎯', 'สายลับนักล่า', 3, (lv) => `คริ +${lv * 2}%`, (lv) => ({ crit: 0.02 * lv })),
    n('in_t4', 'in_t', 4, '💥', 'Claymore Trap', 1, () => 'Land Mine ระเบิดใส่ทุกตัว', () => ({ j2Claymore: 1 })),
    n('in_g1', 'in_g', 1, '🍀', 'มือขึ้น', 3, (lv) => `ของหายาก ⭐ ออกบ่อยขึ้น +${lv * 20}%`, (lv) => ({ j2BoxLuck: 0.2 * lv })),
    n('in_g2', 'in_g', 2, '🔩', 'อัปเกรด', 3, (lv) => `ของในกล่องแรง +${lv * 15}%`, (lv) => ({ j2BoxMul: 0.15 * lv })),
    n('in_g3', 'in_g', 3, '⚡', 'แบตสำรอง', 2, (lv) => `ต้นเทิร์น Energy +${lv * 3}`, (lv) => ({ arTurnRes: 3 * lv })),
    n('in_g4', 'in_g', 4, '🎲', 'ทอยใหม่', 1, () => 'สุ่มได้ของธรรมดา = ทอยใหม่ 1 ครั้ง', () => ({ j2Reroll: 1 })),
    n('in_r1', 'in_r', 1, '🤖', 'ลำกล้องคู่', 3, (lv) => `หุ่นจิ๋วยิงแรง +${lv * 15}% P.ATK`, (lv) => ({ j2TurretMul: 0.15 * lv })),
    n('in_r2', 'in_r', 2, '🔋', 'ถ่านอึด', 2, (lv) => `หุ่นจิ๋วอยู่นาน +${lv} เทิร์น`, (lv) => ({ j2TurretTurns: lv })),
    n('in_r3', 'in_r', 3, '🛰️', 'เล็งอัตโนมัติ', 3, (lv) => `Hit +${lv * 5}`, (lv) => ({ hit: 5 * lv })),
    n('in_r4', 'in_r', 4, '🏭', 'ป้อมถาวร', 1, () => 'หุ่นจิ๋วอยู่ทั้งเวฟ · ต้นเวฟได้หุ่นจิ๋วฟรี 1 ตัว', () => ({ j2TurretWave: 1 })),
  ],
  talents: [],
}
