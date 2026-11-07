// 🌩️ Wizard ใยชั้น 2 (design/second-jobs-v1.md §5 คู่ A). Node ids are save data: never rename.
import { node as n, rk, talent as t, type ClassTree } from '../tree-types'

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
  talents: [
    // v119 (Q 2026-11-08) ทาเลนต์ชั้น 2 · I stats · II Ult วิวัฒน์ (เลือกธาตุ) · III ทักษะ 3 · IV ตัวตน
    t('wz_t1_mana', 1, '💧', 'คลังมานา', 2, (r) => `Mana สูงสุด +${rk(r, 10, 18)}`, (r) => ({ maxRes: rk(r, 10, 18) })),
    t('wz_t1_matk', 1, '🔮', 'พลังเวทแก่กล้า', 2, (r) => `M.ATK +${rk(r, 6, 10)}`, (r) => ({ matk: rk(r, 6, 10) })),
    t('wz_t1_crit', 1, '🎯', 'เวทแม่นยำ', 2, (r) => `เวทคริ +${rk(r, 3, 5)}%`, (r) => ({ spellCrit: rk(r, 0.03, 0.05) })),
    t('wz_t2_fire', 2, '☄️', 'ดาวตกหนัก', 2, (r) => `Meteor Storm แรง +${rk(r, 12, 20)}% ต่อลูก`, (r) => ({ j2MeteorMul: rk(r, 0.12, 0.2) })),
    t('wz_t2_bolt', 2, '⚡', 'ฟ้าคำราม', 2, (r) => `Lord of Vermilion แรง +${rk(r, 12, 20)}% ต่อฮิต`, (r) => ({ j2LovMul: rk(r, 0.12, 0.2) })),
    t('wz_t2_ice', 2, '🧊', 'ปราการน้ำแข็ง', 2, (r) => `บาเรียธาตุน้ำแข็ง +${rk(r, 0.2, 0.35)}x M.ATK`, (r) => ({ iceBarrier: rk(r, 0.2, 0.35) })),
    t('wz_t3_gust', 3, '❄️', 'พายุหิมะ', 2, (r) => `Storm Gust แรง +${rk(r, 15, 25)}%`, (r) => ({ s3Pow: rk(r, 0.15, 0.25) })),
    t('wz_t3_hit', 3, '🌨️', 'ลมเฉือน', 2, (r) => `Storm Gust แรง +${rk(r, 8, 14)}% ต่อฮิต`, (r) => ({ j2GustMul: rk(r, 0.08, 0.14) })),
    t('wz_t3_ult', 3, '🌩️', 'มหาเวทเต็มพิกัด', 2, (r) => `มหาเวทธาตุแรง +${rk(r, 12, 20)}%`, (r) => ({ ult2Pow: rk(r, 0.12, 0.2) })),
    t('wz_t4_mdef', 4, '🛡️', 'ผนึกต้านเวท', 2, (r) => `M.DEF +${rk(r, 4, 7)}%`, (r) => ({ mdef: rk(r, 0.04, 0.07) })),
    t('wz_t4_hp', 4, '❤️', 'กายจอมเวท', 2, (r) => `HP สูงสุด +${rk(r, 40, 70)}`, (r) => ({ maxHp: rk(r, 40, 70) })),
    t('wz_t4_burn', 4, '🔥', 'ไฟไม่ดับ', 2, (r) => `ไฟซ้อนจาก Ult +${rk(r, 1, 2)} stack`, (r) => ({ mgFireStack: rk(r, 1, 2) })),
  ],
}
