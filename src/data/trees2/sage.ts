// 📖 Sage ใยชั้น 2 (design/second-jobs-v1.md §5 คู่ A). Node ids are save data: never rename.
import { node as n, type ClassTree } from '../tree-types'

export const tree2: ClassTree = {
  branches: [
    { id: 'sg_a', job: 'mage', job2: 'sage', name: 'ร่ายอัตโนมัติ', icon: '📖', blurb: 'Auto Spell ติดบ่อย / หลายลูก · ★ Hindsight' },
    { id: 'sg_e', job: 'mage', job2: 'sage', name: 'ธาตุอาวุธ', icon: '🗡️', blurb: 'Endow นานขึ้น / แรงขึ้น · ตีใกล้' },
    { id: 'sg_r', job: 'mage', job2: 'sage', name: 'ต้านเวท', icon: '🛡️', blurb: 'Magic Rod: โดนเวทได้ Mana · M.DEF' },
  ],
  nodes: [
    n('sg_a1', 'sg_a', 1, '📖', 'ร่ายไว', 3, (lv) => `Auto Spell โอกาส +${lv * 5}%`, (lv) => ({ j2AutoChance: 0.05 * lv })),
    n('sg_a2', 'sg_a', 2, '🔮', 'พลังเวท', 3, (lv) => `M.ATK +${lv * 4}`, (lv) => ({ matk: 4 * lv })),
    n('sg_a3', 'sg_a', 3, '✨', 'Bolt คู่', 1, () => 'Auto Spell ยิง +1 ลูก', () => ({ j2AutoBolts: 1 })),
    n('sg_a4', 'sg_a', 4, '👁️', 'Hindsight', 1, () => 'Auto Spell ติดได้ทั้งตอนคอมโบและสวนกลับ', () => ({ j2Hindsight: 1 })),
    n('sg_e1', 'sg_e', 1, '🗡️', 'ธาตุคม', 3, (lv) => `Endow แรงขึ้นอีก +${lv * 5}%`, (lv) => ({ j2EndowAmp: 0.05 * lv })),
    n('sg_e2', 'sg_e', 2, '💪', 'แขนปราชญ์', 3, (lv) => `P.ATK +${lv * 4}`, (lv) => ({ atk: 4 * lv })),
    n('sg_e3', 'sg_e', 3, '⏳', 'ติดทน', 2, (lv) => `Endow +${lv} เทิร์น`, (lv) => ({ j2EndowTurns: lv })),
    n('sg_e4', 'sg_e', 4, '♾️', 'อาวุธธาตุ', 1, () => 'Endow อยู่ทั้งเวฟ', () => ({ j2EndowWave: 1 })),
    n('sg_r1', 'sg_r', 1, '🔮', 'Magic Rod', 3, (lv) => `โดนเวท = Mana +${lv * 3}`, (lv) => ({ j2MagicRod: 3 * lv })),
    n('sg_r2', 'sg_r', 2, '🛡️', 'ผนึกเวท', 3, (lv) => `M.DEF +${lv * 3}%`, (lv) => ({ mdef: 0.03 * lv })),
    n('sg_r3', 'sg_r', 3, '❤️', 'กายปราชญ์', 3, (lv) => `HP สูงสุด +${lv * 30}`, (lv) => ({ maxHp: 30 * lv })),
    n('sg_r4', 'sg_r', 4, '🌀', 'Magic Rod เต็มขั้น', 1, () => 'เวทลูกแรกของทุกเวฟถูกดูดหาย (ไม่โดน) + Mana', () => ({ j2RodBlock: 1 })),
  ],
  talents: [],
}
