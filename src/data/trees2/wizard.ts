// 🌩️ Wizard ใยชั้น 2 (design/second-jobs-v1.md §5 คู่ A). Node ids are save data: never rename.
import { node as n, type ClassTree } from '../tree-types'

export const tree2: ClassTree = {
  branches: [
    { id: 'wz_m', job: 'mage', job2: 'wizard', name: 'อุกกาบาต', icon: '🔥', blurb: 'Meteor Storm แรงขึ้น / เยอะขึ้น · ไฟ' },
    { id: 'wz_l', job: 'mage', job2: 'wizard', name: 'สายฟ้าเทพ', icon: '⚡', blurb: 'Lord of Vermilion · มึน · เวทคริ' },
    { id: 'wz_i', job: 'mage', job2: 'wizard', name: 'พายุหิมะ', icon: '❄️', blurb: 'Storm Gust · บาเรีย · ★ Quagmire ร่ายด่วน' },
  ],
  nodes: [
    n('wz_m1', 'wz_m', 1, '☄️', 'อุกกาบาตหนัก', 3, (lv) => `Meteor Storm แรง +${lv * 10}% ต่อลูก`, (lv) => ({ j2MeteorMul: 0.1 * lv })),
    n('wz_m2', 'wz_m', 2, '🔥', 'ไฟลุกโชน', 3, (lv) => `ไฟซ้อนจาก Ult +${lv} stack`, (lv) => ({ mgFireStack: lv })),
    n('wz_m3', 'wz_m', 3, '🔮', 'พลังเวท', 3, (lv) => `M.ATK +${lv * 5}`, (lv) => ({ matk: 5 * lv })),
    n('wz_m4', 'wz_m', 4, '🌠', 'ฝนดาวตก', 1, () => 'Meteor Storm +3 ลูก', () => ({ j2Meteors: 3 })),
    n('wz_l1', 'wz_l', 1, '⚡', 'สายฟ้าแรง', 3, (lv) => `Lord of Vermilion แรง +${lv * 10}% ต่อฮิต`, (lv) => ({ j2LovMul: 0.1 * lv })),
    n('wz_l2', 'wz_l', 2, '💫', 'ช็อตมึน', 3, (lv) => `LoV โอกาสมึน +${lv * 3}% ต่อฮิต`, (lv) => ({ j2LovStun: 0.03 * lv })),
    n('wz_l3', 'wz_l', 3, '🎯', 'เวทแม่น', 3, (lv) => `เวทคริ +${lv * 3}%`, (lv) => ({ spellCrit: 0.03 * lv })),
    n('wz_l4', 'wz_l', 4, '🌩️', 'ทัณฑ์สวรรค์', 1, () => 'Lord of Vermilion +2 ฮิต', () => ({ j2LovHits: 2 })),
    n('wz_i1', 'wz_i', 1, '❄️', 'พายุแรง', 3, (lv) => `Storm Gust แรง +${lv * 10}% ต่อฮิต`, (lv) => ({ j2GustMul: 0.1 * lv })),
    n('wz_i2', 'wz_i', 2, '🧊', 'บาเรียน้ำแข็ง', 3, (lv) => `บาเรียธาตุน้ำแข็ง +${Math.round(lv * 20) / 100}x M.ATK`, (lv) => ({ iceBarrier: 0.2 * lv })),
    n('wz_i3', 'wz_i', 3, '💧', 'สมาธิ', 3, (lv) => `Mana สูงสุด +${lv * 10}`, (lv) => ({ maxRes: 10 * lv })),
    n('wz_i4', 'wz_i', 4, '🌀', 'Quagmire', 1, () => 'Mana ≥ 80% ตอนร่าย = ไม่ต้องชาร์จ ระเบิดทันที', () => ({ j2QuickCast: 1 })),
  ],
  talents: [],
}
