// 👊 Monk ใยชั้น 2 (design/second-jobs-v1.md §4). Node ids are save data: never rename.
import { node as n, rk, talent as t, type ClassTree } from '../tree-types'

export const tree2: ClassTree = {
  branches: [
    { id: 'mk_c', job: 'cleric', job2: 'monk', name: 'คอมโบ', icon: '👊', blurb: 'คอมโบติดบ่อย = ลูกพลังเยอะ' },
    { id: 'mk_i', job: 'cleric', job2: 'monk', name: 'Invoker', icon: '💠', blurb: 'Energy Shield · ธาตุ · สายฟ้า' },
    { id: 'mk_d', job: 'cleric', job2: 'monk', name: 'Chayula', icon: '🌑', blurb: 'Darkness แทนฮีล · กลืนเงา' },
  ],
  nodes: [
    n('mk_c1', 'mk_c', 1, '👊', 'หมัดไว', 3, (lv) => `โอกาสคอมโบ +${lv * 3}%`, (lv) => ({ combo: 0.03 * lv })),
    n('mk_c2', 'mk_c', 2, '💢', 'หมัดหนัก', 3, (lv) => `ฮิตคอมโบแรง +${lv * 5}%`, (lv) => ({ comboDmg: 0.05 * lv })),
    n('mk_c3', 'mk_c', 3, '🔵', 'ลูกพลังล้น', 2, (lv) => `ลูกพลังสูงสุด +${lv}`, (lv) => ({ j2ChargeMax: lv })),
    n('mk_c4', 'mk_c', 4, '🌪️', 'พายุหมัด', 1, () => 'Combo Count +1', () => ({ comboCount: 1 })),
    n('mk_i1', 'mk_i', 1, '💠', 'Meditate', 3, (lv) => `Energy Shield: เทิร์นที่ไม่โดนตี ได้โล่ ${lv * 3}% HP สูงสุด`, (lv) => ({ j2Es: 0.03 * lv })),
    n('mk_i2', 'mk_i', 2, '❄️', 'ฝ่ามือธาตุ', 3, (lv) => `ตีธรรมดา/คอมโบ ${lv * 10}% ติดช้า`, (lv) => ({ j2Chill: 0.1 * lv })),
    n('mk_i3', 'mk_i', 3, '⚡', 'สายฟ้าฟาด', 3, (lv) => `Falling Thunder +${lv * 10}% ต่อลูกพลัง`, (lv) => ({ j2ThunderPer: 0.1 * lv })),
    n('mk_i4', 'mk_i', 4, '🌩️', 'Instill', 1, () => 'ลูกพลังเต็ม = ตีธรรมดา/คอมโบทุกครั้งยิงสายฟ้า 0.5x Pm ใส่ตัวสุ่ม', () => ({ j2Instill: 1 })),
    n('mk_d1', 'mk_d', 1, '🌑', 'Darkness', 3, (lv) => `ต้นเทิร์นได้โล่มืด ${lv * 2}% HP สูงสุด`, (lv) => ({ j2Dark: 0.02 * lv })),
    n('mk_d2', 'mk_d', 2, '🕳️', 'กลืนเงา', 3, (lv) => `ฆ่ามอน ฮีล ${lv * 2}% HP สูงสุด`, (lv) => ({ killHeal: 0.02 * lv })),
    n('mk_d3', 'mk_d', 3, '👻', 'เงาพลิ้ว', 3, (lv) => `FLEE +${lv * 4}`, (lv) => ({ flee: 4 * lv })),
    n('mk_d4', 'mk_d', 4, '🖤', 'ไร้แสง', 1, () => 'ฮีลเกิน HP เต็ม = โล่มืด 150% (ไม่เกิน 50% HP)', () => ({ j2NoLight: 1 })),
  ],
  talents: [
    // v119 (Q 2026-11-08) ทาเลนต์ชั้น 2 · I stats · II Ult วิวัฒน์ · III ทักษะ 3 · IV ตัวตน
    t('mk_t1_combo', 1, '👊', 'หมัดต่อเนื่อง', 2, (r) => `โอกาสคอมโบ +${rk(r, 3, 5)}%`, (r) => ({ combo: rk(r, 0.03, 0.05) })),
    t('mk_t1_heavy', 1, '💢', 'หมัดหนัก', 2, (r) => `ฮิตคอมโบแรง +${rk(r, 6, 10)}%`, (r) => ({ comboDmg: rk(r, 0.06, 0.1) })),
    t('mk_t1_flee', 1, '👻', 'ก้าวพลิ้ว', 2, (r) => `FLEE +${rk(r, 5, 9)}`, (r) => ({ flee: rk(r, 5, 9) })),
    t('mk_t2_ult', 2, '🔔', 'ระฆังกังวาน', 2, (r) => `Tempest Bell แรง +${rk(r, 15, 25)}%`, (r) => ({ ult2Pow: rk(r, 0.15, 0.25) })),
    t('mk_t2_es', 2, '💠', 'สมาธิคุ้มกาย', 2, (r) => `เทิร์นที่ไม่โดนตี ได้โล่ ${rk(r, 2, 3.5)}% HP สูงสุด`, (r) => ({ j2Es: rk(r, 0.02, 0.035) })),
    t('mk_t2_kill', 2, '🕳️', 'กลืนพลัง', 2, (r) => `ฆ่ามอน ฮีล ${rk(r, 2, 4)}% HP สูงสุด`, (r) => ({ killHeal: rk(r, 0.02, 0.04) })),
    t('mk_t3_thunder', 3, '⚡', 'ฟ้าผ่ากลางใจ', 2, (r) => `Falling Thunder แรง +${rk(r, 15, 25)}%`, (r) => ({ s3Pow: rk(r, 0.15, 0.25) })),
    t('mk_t3_per', 3, '🔵', 'ลูกพลังเข้ม', 2, (r) => `Falling Thunder +${rk(r, 8, 14)}% ต่อลูกพลัง`, (r) => ({ j2ThunderPer: rk(r, 0.08, 0.14) })),
    t('mk_t3_max', 3, '🔮', 'ลูกพลังล้น', 2, (r) => `ลูกพลังสูงสุด +${rk(r, 1, 2)}`, (r) => ({ j2ChargeMax: rk(r, 1, 2) })),
    t('mk_t4_dark', 4, '🌑', 'เงาคุ้มภัย', 2, (r) => `ต้นเทิร์นได้โล่มืด ${rk(r, 1, 2)}% HP สูงสุด`, (r) => ({ j2Dark: rk(r, 0.01, 0.02) })),
    t('mk_t4_chill', 4, '❄️', 'ฝ่ามือเยือกแข็ง', 2, (r) => `ตีธรรมดา/คอมโบ ${rk(r, 8, 14)}% ติดช้า`, (r) => ({ j2Chill: rk(r, 0.08, 0.14) })),
    t('mk_t4_leech', 4, '🧘', 'ปราณดูดกลืน', 2, (r) => `ดูดเลือด +${rk(r, 2, 4)}% (ตีธรรมดา + คอมโบ)`, (r) => ({ lifesteal: rk(r, 0.02, 0.04) })),
  ],
}
