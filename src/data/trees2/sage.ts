// 📖 Sage ใยชั้น 2 (design/second-jobs-v1.md §5 คู่ A). Node ids are save data: never rename.
import { node as n, rk, talent as t, type ClassTree } from '../tree-types'

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
  talents: [
    // v119 (Q 2026-11-08) ทาเลนต์ชั้น 2 · I stats · II Ult วิวัฒน์ · III ทักษะ 3 · IV ตัวตน
    t('sg_t1_auto', 1, '📖', 'ร่ายเร็ว', 2, (r) => `Auto Spell โอกาส +${rk(r, 5, 8)}%`, (r) => ({ j2AutoChance: rk(r, 0.05, 0.08) })),
    t('sg_t1_matk', 1, '🔮', 'ปัญญาเวท', 2, (r) => `M.ATK +${rk(r, 5, 9)}`, (r) => ({ matk: rk(r, 5, 9) })),
    t('sg_t1_atk', 1, '💪', 'แขนนักปราชญ์', 2, (r) => `P.ATK +${rk(r, 5, 9)}`, (r) => ({ atk: rk(r, 5, 9) })),
    t('sg_t2_ult', 2, '🚫', 'ทำลายเวท', 2, (r) => `Dispell + Spell Breaker แรง +${rk(r, 15, 25)}%`, (r) => ({ ult2Pow: rk(r, 0.15, 0.25) })),
    t('sg_t2_rod', 2, '🔮', 'ไม้ดูดเวท', 2, (r) => `โดนเวท = Mana +${rk(r, 3, 5)}`, (r) => ({ j2MagicRod: rk(r, 3, 5) })),
    t('sg_t2_mdef', 2, '🛡️', 'ม่านปัญญา', 2, (r) => `M.DEF +${rk(r, 4, 7)}%`, (r) => ({ mdef: rk(r, 0.04, 0.07) })),
    t('sg_t3_endow', 3, '🗡️', 'Endow ลึก', 2, (r) => `Endow แรงขึ้นอีก +${rk(r, 6, 10)}%`, (r) => ({ j2EndowAmp: rk(r, 0.06, 0.1) })),
    t('sg_t3_turns', 3, '⏳', 'ธาตุติดนาน', 2, (r) => `Endow +${rk(r, 1, 2)} เทิร์น`, (r) => ({ j2EndowTurns: rk(r, 1, 2) })),
    t('sg_t3_pow', 3, '✨', 'คมธาตุ', 2, (r) => `Endow (ทักษะ 3) แรง +${rk(r, 15, 25)}%`, (r) => ({ s3Pow: rk(r, 0.15, 0.25) })),
    t('sg_t4_hp', 4, '❤️', 'กายนักรบเวท', 2, (r) => `HP สูงสุด +${rk(r, 40, 70)} · P.DEF +${rk(r, 3, 5)}`, (r) => ({ maxHp: rk(r, 40, 70), def: rk(r, 3, 5) })),
    t('sg_t4_crit', 4, '🎯', 'จังหวะเวท', 2, (r) => `เวทคริ +${rk(r, 3, 5)}%`, (r) => ({ spellCrit: rk(r, 0.03, 0.05) })),
    t('sg_t4_mana', 4, '💧', 'สมุดบันทึกมานา', 2, (r) => `Mana สูงสุด +${rk(r, 10, 18)}`, (r) => ({ maxRes: rk(r, 10, 18) })),
  ],
}
