// 👊 Monk ใยชั้น 2 (RO Combo · M.DEF/HP Haymaker (Sett) · Asura Strike). Node ids are save data: never rename.
import { node as n, rk, talent as t, type ClassTree } from '../tree-types'

export const tree2: ClassTree = {
  branches: [
    { id: 'mk_c', job: 'cleric', job2: 'monk', name: 'คอมโบ', icon: '👊', blurb: 'สายคอมโบ RO · ไต่ระดับ · ปิดฉาก' },
    { id: 'mk_h', job: 'cleric', job2: 'monk', name: 'หมัดแค้น', icon: '🥊', blurb: 'M.DEF / Max HP → หมัดแค้น Sett' },
    { id: 'mk_a', job: 'cleric', job2: 'monk', name: 'อสุรา', icon: '💥', blurb: 'ปราณ Mana · อาชูร่าสไตรก์' },
    { id: 'mk_i', job: 'cleric', job2: 'monk', name: 'Invoker', icon: '💠', blurb: 'Energy Shield · ธาตุ · สายฟ้า' },
    { id: 'mk_d', job: 'cleric', job2: 'monk', name: 'Chayula', icon: '🌑', blurb: 'Darkness แทนฮีล · กลืนเงา' },
  ],
  nodes: [
    // Root sub-nodes (under Falling Thunder & Ult)
    n('mk_s1', 'monk_s3', 1, '🥊', 'หมัดอัสนี', 3, (lv) => `Falling Thunder / ฟ้าฟาดคอมโบ +${Math.round(lv * 25)}% P.ATK`, (lv) => ({ j2ThunderAtk: 0.25 * lv })),
    n('mk_s2', 'monk_s3', 2, '⚡', 'ฟ้าฟาดคอมโบ', 1, () => 'คอมโบ ≥3 ฮิต (มี ≥2 🔵): ปล่อยสายฟ้าทุกตัวฟรี (0 CD ไม่เสีย 🔵)', () => ({ j2ComboThunder: 1 })),
    n('mk_u1', 'monk_u2', 1, '🔔', 'กังวานเหล็ก', 3, (lv) => `Tempest Bell & อาชูร่า แรงขึ้นจาก M.DEF (+${Math.round(lv * 40)}%×M.DEF)`, (lv) => ({ j2BellMdef: 0.4 * lv })),

    // 👊 Branch 1: RO Combo
    n('mk_c1', 'mk_c', 1, '👊', 'หมัดไว', 3, (lv) => `โอกาสคอมโบ +${lv * 3}%`, (lv) => ({ combo: 0.03 * lv })),
    n('mk_c2', 'mk_c', 2, '💢', 'ท่าสับต่อเนื่อง', 3, (lv) => `ฮิตคอมโบแรง +${lv * 5}% · ไต่ระดับ +${lv * 4}%/ฮิต`, (lv) => ({ comboDmg: 0.05 * lv, j2ComboRamp: 0.04 * lv })),
    n('mk_c3', 'mk_c', 3, '🔵', 'ลูกพลังล้น', 2, (lv) => `ลูกพลังสูงสุด +${lv}`, (lv) => ({ j2ChargeMax: lv })),
    n('mk_c4', 'mk_c', 4, '🌪️', 'พายุหมัดปิดฉาก', 1, () => 'Combo +1 ฮิต · ปิดคอมโบ (≥2 ฮิต) ใช้ 1 🔵 ซัดปิดฉาก + เกราะแตก + ดันเกจ/มึน + ลด CD -1', () => ({ comboCount: 1, j2ComboFinish: 1 })),

    // 🥊 Branch 2: M.DEF / HP Scaling + Haymaker (Sett)
    n('mk_h1', 'mk_h', 1, '🛡️', 'ปราณเหล็กใน', 3, (lv) => `M.DEF +${lv * 3}% · ตีกายภาพ ×(1 + ${Math.round(lv * 40)}%×M.DEF)`, (lv) => ({ mdef: 0.03 * lv, j2MdefDmg: 0.4 * lv })),
    n('mk_h2', 'mk_h', 2, '🩸', 'หมัดเลือดนักสู้', 3, (lv) => `HP สูงสุด +${lv * 4}% · ตีกายภาพ +${(lv * 0.8).toFixed(1)}% Max HP`, (lv) => ({ j2HpPct: 0.04 * lv, j2HpPunch: 0.008 * lv })),
    n('mk_h3', 'mk_h', 3, '🥊', 'สะสมโทสะ', 3, (lv) => `โดนตี (ก่อนหักโล่) เก็บ ${lv * 25}% เป็น Grit · ถึง 25% HP ปล่อยหมัดแค้น True Dmg + โล่ 60% Grit`, (lv) => ({ j2GritRate: 0.25 * lv })),
    n('mk_h4', 'mk_h', 4, '🔥', 'หมัดพิพากษา Sett', 1, () => 'เพดาน Grit 75% HP · ออก 15% · โล่ 100% Grit · กวาด True Dmg ทุกตัว + ผลักบอส -20 · ถือ Grit ลดดาเมจ -10%', () => ({ j2HaymakerStar: 1 })),

    // 💥 Branch 3: Asura Strike + Exhaust
    n('mk_a1', 'mk_a', 1, '💧', 'บ่อปราณอสุรา', 3, (lv) => `Max Mana +${lv * 15} · ฟื้น Mana +${(lv * 1.2).toFixed(1)}/เทิร์น`, (lv) => ({ maxRes: 15 * lv, resRegen: 0.4 * lv })),
    n('mk_a2', 'mk_a', 2, '🔱', 'เจาะเกราะปราณ', 3, (lv) => `Ult ทะลุเกราะ +${lv * 12}% · อาชูร่าบวกสเกล M.DEF×HP +${lv * 10}%`, (lv) => ({ ultPierce: 0.12 * lv, j2AsuraMdef: 0.1 * lv })),
    n('mk_a3', 'mk_a', 3, '😤', 'ตั้งจิตอสุรา', 3, (lv) => `อาชูร่าสไตรก์แรง +${lv * 20}%`, (lv) => ({ j2AsuraPow: 0.2 * lv })),
    n('mk_a4', 'mk_a', 4, '💥', 'อาชูร่าสไตรก์', 1, () => 'Ult เปลี่ยนเป็น Asura Strike: ≥3 🔵 เผา 🔵+Mana ทั้งหมด ต่อยทะลุ DEF 100% · หลังใช้ติด 😵 ง่อยแดก 3 เทิร์น', () => ({ j2Asura: 1 })),

    // 💠 Branch 4: Invoker
    n('mk_i1', 'mk_i', 1, '💠', 'Meditate', 3, (lv) => `Energy Shield: เทิร์นที่ไม่โดนตี ได้โล่ ${lv * 3}% HP สูงสุด`, (lv) => ({ j2Es: 0.03 * lv })),
    n('mk_i2', 'mk_i', 2, '❄️', 'ฝ่ามือธาตุ', 3, (lv) => `ตีธรรมดา/คอมโบ ${lv * 10}% ติดช้า`, (lv) => ({ j2Chill: 0.1 * lv })),
    n('mk_i3', 'mk_i', 3, '⚡', 'สายฟ้าฟาด', 3, (lv) => `Falling Thunder +${lv * 10}% ต่อลูกพลัง`, (lv) => ({ j2ThunderPer: 0.1 * lv })),
    n('mk_i4', 'mk_i', 4, '🌩️', 'Instill', 1, () => 'ลูกพลังเต็ม = ตีธรรมดา/คอมโบทุกครั้งยิงสายฟ้า 0.5x Pm ใส่ตัวสุ่ม', () => ({ j2Instill: 1 })),

    // 🌑 Branch 5: Chayula
    n('mk_d1', 'mk_d', 1, '🌑', 'Darkness', 3, (lv) => `ต้นเทิร์นได้โล่มืด ${lv * 2}% HP สูงสุด`, (lv) => ({ j2Dark: 0.02 * lv })),
    n('mk_d2', 'mk_d', 2, '🕳️', 'กลืนเงา', 3, (lv) => `ฆ่ามอน ฮีล ${lv * 2}% HP สูงสุด`, (lv) => ({ killHeal: 0.02 * lv })),
    n('mk_d3', 'mk_d', 3, '👻', 'เงาพลิ้ว', 3, (lv) => `FLEE +${lv * 4}`, (lv) => ({ flee: 4 * lv })),
    n('mk_d4', 'mk_d', 4, '🖤', 'ไร้แสง', 1, () => 'ฮีลเกิน HP เต็ม = โล่มืด 150% (ไม่เกิน 50% HP)', () => ({ j2NoLight: 1 })),
  ],
  talents: [
    // v119 ทาเลนต์ชั้น 2 · I stats · II Ult วิวัฒน์ · III ทักษะ 3 · IV ตัวตน
    t('mk_t1_combo', 1, '👊', 'หมัดต่อเนื่อง', 2, (r) => `โอกาสคอมโบ +${rk(r, 3, 5)}%`, (r) => ({ combo: rk(r, 0.03, 0.05) })),
    t('mk_t1_heavy', 1, '💢', 'หมัดหนัก', 2, (r) => `ฮิตคอมโบแรง +${rk(r, 6, 10)}%`, (r) => ({ comboDmg: rk(r, 0.06, 0.1) })),
    t('mk_t1_flee', 1, '👻', 'พริ้วต้านเวท', 2, (r) => `FLEE +${rk(r, 5, 9)} · M.DEF +${rk(r, 3, 5)}%`, (r) => ({ flee: rk(r, 5, 9), mdef: rk(r, 0.03, 0.05) })),
    t('mk_t2_ult', 2, '🔔', 'ระฆัง & อสุรา', 2, (r) => `Tempest Bell / อาชูร่า แรง +${rk(r, 15, 25)}%`, (r) => ({ ult2Pow: rk(r, 0.15, 0.25) })),
    t('mk_t2_es', 2, '💠', 'สมาธิคุ้มกาย', 2, (r) => `เทิร์นที่ไม่โดนตี ได้โล่ ${rk(r, 2, 3.5)}% HP สูงสุด`, (r) => ({ j2Es: rk(r, 0.02, 0.035) })),
    t('mk_t2_kill', 2, '🕳️', 'กลืนพลังชีวิต', 2, (r) => `HP สูงสุด +${rk(r, 4, 8)}% · ฆ่ามอนฮีล ${rk(r, 2, 3)}%`, (r) => ({ j2HpPct: rk(r, 0.04, 0.08), killHeal: rk(r, 0.02, 0.03) })),
    t('mk_t3_thunder', 3, '⚡', 'ฟ้าผ่ากลางใจ', 2, (r) => `Falling Thunder แรง +${rk(r, 15, 25)}%`, (r) => ({ s3Pow: rk(r, 0.15, 0.25) })),
    t('mk_t3_per', 3, '🔵', 'ลูกพลังเข้ม', 2, (r) => `Falling Thunder +${rk(r, 8, 14)}% ต่อลูกพลัง`, (r) => ({ j2ThunderPer: rk(r, 0.08, 0.14) })),
    t('mk_t3_max', 3, '🔮', 'ลูกพลังล้น', 2, (r) => `ลูกพลังสูงสุด +${rk(r, 1, 2)}`, (r) => ({ j2ChargeMax: rk(r, 1, 2) })),
    t('mk_t4_dark', 4, '🌑', 'เงาคุ้มภัย', 2, (r) => `ต้นเทิร์นได้โล่มืด ${rk(r, 1, 2)}% HP สูงสุด`, (r) => ({ j2Dark: rk(r, 0.01, 0.02) })),
    t('mk_t4_chill', 4, '❄️', 'ฝ่ามือเยือกแข็ง', 2, (r) => `ตีธรรมดา/คอมโบ ${rk(r, 8, 14)}% ติดช้า`, (r) => ({ j2Chill: rk(r, 0.08, 0.14) })),
    t('mk_t4_leech', 4, '🧘', 'ปราณดูดกลืน', 2, (r) => `ดูดเลือด +${rk(r, 2, 4)}% · Max Mana +${rk(r, 15, 30)}`, (r) => ({ lifesteal: rk(r, 0.02, 0.04), maxRes: rk(r, 15, 30) })),
  ],
}
