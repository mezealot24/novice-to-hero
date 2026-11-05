// 🐺 Beastmaster ใยชั้น 2 (design/second-jobs-v1.md §4). Node ids are save data: never rename.
// Each ★ evolves its branch's pet · 2 ★ = a second pet at KIT2.beastmaster.secondPow (battle: BattleScene.spawnPets).
import { node as n, type ClassTree } from '../tree-types'

export const tree2: ClassTree = {
  branches: [
    { id: 'bm_h', job: 'archer', job2: 'beastmaster', name: 'ฟ้า', icon: '🦅', blurb: 'เหยี่ยว Blitz Beat บ่อย / แรง / หลายตัว · ★ เหยี่ยวทอง' },
    { id: 'bm_b', job: 'archer', job2: 'beastmaster', name: 'ป่า', icon: '🐗', blurb: 'หมูป่าถึก พุ่งชนแรง ให้โล่ · ★ หมูป่าเกราะ' },
    { id: 'bm_w', job: 'archer', job2: 'beastmaster', name: 'เขี้ยว', icon: '🐺', blurb: 'หมาป่ากัดแรง เลือดไหล ไว · ★ ราชาหมาป่า' },
  ],
  nodes: [
    n('bm_h1', 'bm_h', 1, '🦅', 'ตาเหยี่ยว', 3, (lv) => `Blitz Beat โอกาส +${lv * 5}%`, (lv) => ({ j2HawkChance: 0.05 * lv })),
    n('bm_h2', 'bm_h', 2, '🪶', 'กรงเล็บ', 3, (lv) => `เหยี่ยวแรง +${lv * 10}% P.ATK`, (lv) => ({ j2HawkMul: 0.1 * lv })),
    n('bm_h3', 'bm_h', 3, '🌪️', 'โฉบฝูง', 1, () => 'Blitz Beat ฟาดเพิ่ม +1 ตัว', () => ({ j2HawkHits: 1 })),
    n('bm_h4', 'bm_h', 4, '✨', 'เหยี่ยวทอง', 1, () => 'วิวัฒน์: เหยี่ยวแรง +50% และฟาดเพิ่ม 1 ตัว (สูงสุด 4)', () => ({ j2HawkEvo: 1 })),
    n('bm_b1', 'bm_b', 1, '🐗', 'หนังหนา', 3, (lv) => `หมูป่า HP +${lv * 10}% ของ HP ฮีโร่`, (lv) => ({ j2BoarHp: 0.1 * lv })),
    n('bm_b2', 'bm_b', 2, '💥', 'เขี้ยวงัด', 3, (lv) => `พุ่งชนแรง +${lv * 20}% P.ATK`, (lv) => ({ j2BoarMul: 0.2 * lv })),
    n('bm_b3', 'bm_b', 3, '🛡️', 'คุ้มกันนาย', 2, (lv) => `พุ่งชนแล้วฮีโร่ได้โล่ ${lv * 4}% HP`, (lv) => ({ j2BoarShield: 0.04 * lv })),
    n('bm_b4', 'bm_b', 4, '🐗', 'หมูป่าเกราะ', 1, () => 'วิวัฒน์: HP +50% ของ HP ฮีโร่ · พุ่งชนทุก 2 เทิร์น', () => ({ j2BoarEvo: 1 })),
    n('bm_w1', 'bm_w', 1, '🐺', 'เขี้ยวคม', 3, (lv) => `หมาป่ากัดแรง +${lv * 10}% P.ATK`, (lv) => ({ j2WolfMul: 0.1 * lv })),
    n('bm_w2', 'bm_w', 2, '🩸', 'แผลลึก', 3, (lv) => `เลือดไหล +${lv} stack ต่อการกัด`, (lv) => ({ j2WolfBleed: lv })),
    n('bm_w3', 'bm_w', 3, '💨', 'ฝีเท้าป่า', 3, (lv) => `หมาป่าเร็ว +${lv * 10}% (เทิร์นบ่อยขึ้น)`, (lv) => ({ j2WolfSpeed: 0.1 * lv })),
    n('bm_w4', 'bm_w', 4, '👑', 'ราชาหมาป่า', 1, () => 'วิวัฒน์: กัดแรง +50% · เร็ว +30%', () => ({ j2WolfEvo: 1 })),
  ],
  talents: [],
}
