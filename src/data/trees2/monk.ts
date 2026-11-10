// 👊 Monk ใยชั้น 2 (RO Combo · M.DEF/HP หมัดแค้น · Asura Strike). Node ids are save data: never rename.
import { node as n, rk, talent as t, type ClassTree } from '../tree-types'

export const tree2: ClassTree = {
  branches: [
    { id: 'mk_c', job: 'cleric', job2: 'monk', name: 'คอมโบ', icon: '👊', blurb: 'สายคอมโบ RO · ไต่ระดับ · ปิดฉาก' },
    { id: 'mk_h', job: 'cleric', job2: 'monk', name: 'หมัดแค้น', icon: '🥊', blurb: 'M.DEF / Max HP → หมัดแค้น & หมัดพิพากษา' },
    { id: 'mk_a', job: 'cleric', job2: 'monk', name: 'อสุรา', icon: '💥', blurb: 'ปราณ Mana · อาชูร่าสไตรก์' },
  ],
  nodes: [
    // Root sub-nodes (under Falling Thunder & Ult)
    n('mk_s1', 'monk_s3', 1, '🥊', 'หมัดอัสนี', 3, (lv) => `Falling Thunder / ฟ้าฟาดคอมโบ +${Math.round(lv * 25)}% P.ATK`, (lv) => ({ j2ThunderAtk: 0.25 * lv })),
    n('mk_s2', 'monk_s3', 2, '⚡', 'ฟ้าฟาดคอมโบ', 1, () => 'คอมโบ ≥3 ฮิต (มี ≥2 🔵): ปล่อยสายฟ้าทุกตัวฟรี (0 CD ไม่เสีย 🔵) + ชะลอศัตรู', () => ({ j2ComboThunder: 1, j2Chill: 0.15 })),
    n('mk_u1', 'monk_u2', 1, '🔔', 'กังวานเหล็ก', 3, (lv) => `Tempest Bell & อาชูร่า แรงขึ้นจาก M.DEF (+${Math.round(lv * 40)}%×M.DEF)`, (lv) => ({ j2BellMdef: 0.4 * lv })),

    // 👊 Branch 1: RO Combo
    n('mk_c1', 'mk_c', 1, '👊', 'หมัดไว', 3, (lv) => `โอกาสคอมโบ +${lv * 3}%`, (lv) => ({ combo: 0.03 * lv })),
    n('mk_c2', 'mk_c', 2, '💢', 'ท่าสับต่อเนื่อง', 3, (lv) => `ฮิตคอมโบแรง +${lv * 5}% · ไต่ระดับ +${lv * 4}%/ฮิต`, (lv) => ({ comboDmg: 0.05 * lv, j2ComboRamp: 0.04 * lv })),
    n('mk_c3', 'mk_c', 3, '🔵', 'ลูกพลังล้น', 2, (lv) => `ลูกพลังสูงสุด +${lv}`, (lv) => ({ j2ChargeMax: lv })),
    n('mk_c4', 'mk_c', 4, '🌪️', 'พายุหมัดปิดฉาก', 1, () => 'Combo +1 ฮิต · ปิดคอมโบ (≥2 ฮิต) ใช้ 1 🔵 ซัดปิดฉาก + เกราะแตก + ดันเกจ/มึน + ลด CD -1', () => ({ comboCount: 1, j2ComboFinish: 1 })),

    // 🥊 Branch 2: M.DEF / HP Scaling + หมัดแค้น / หมัดพิพากษา
    n('mk_h1', 'mk_h', 1, '🛡️', 'ปราณเหล็กใน', 3, (lv) => `M.DEF +${lv * 3}% · ตีกายภาพ ×(1 + ${Math.round(lv * 40)}%×M.DEF)`, (lv) => ({ mdef: 0.03 * lv, j2MdefDmg: 0.4 * lv })),
    n('mk_h2', 'mk_h', 2, '🩸', 'หมัดเลือดนักสู้', 3, (lv) => `HP สูงสุด +${lv * 4}% · ตีกายภาพ +${(lv * 0.8).toFixed(1)}% Max HP`, (lv) => ({ j2HpPct: 0.04 * lv, j2HpPunch: 0.008 * lv })),
    n('mk_h3', 'mk_h', 3, '🥊', 'สะสมแรงฮึด', 3, (lv) => `โดนตี (ก่อนหักโล่) สะสม ${lv * 25}% เป็นแรงฮึด · ครบ 25% HP ปล่อยหมัดแค้น True Dmg + โล่ 60% แรงฮึด`, (lv) => ({ j2GritRate: 0.25 * lv })),
    n('mk_h4', 'mk_h', 4, '🔥', 'หมัดพิพากษา', 1, () => 'เพดานแรงฮึด 75% HP · ออกที่ 15% · โล่ 100% แรงฮึด · กวาด True Dmg ทุกตัว + ผลักบอส -20 · ถือแรงฮึดลดดาเมจ -10%', () => ({ j2HaymakerStar: 1 })),

    // 💥 Branch 3: Asura Strike + Exhaust
    n('mk_a1', 'mk_a', 1, '💧', 'บ่อปราณอสุรา', 3, (lv) => `Max Mana +${lv * 15} · ฟื้น Mana +${(lv * 1.2).toFixed(1)}/เทิร์น`, (lv) => ({ maxRes: 15 * lv, resRegen: 0.4 * lv })),
    n('mk_a2', 'mk_a', 2, '🔱', 'เจาะเกราะปราณ', 3, (lv) => `Ult ทะลุเกราะ +${lv * 12}% · อาชูร่าบวกสเกล M.DEF×HP +${lv * 10}%`, (lv) => ({ ultPierce: 0.12 * lv, j2AsuraMdef: 0.1 * lv })),
    n('mk_a3', 'mk_a', 3, '😤', 'ตั้งจิตอสุรา', 3, (lv) => `อาชูร่าสไตรก์แรง +${lv * 20}%`, (lv) => ({ j2AsuraPow: 0.2 * lv })),
    n('mk_a4', 'mk_a', 4, '💥', 'อาชูร่าสไตรก์', 1, () => 'Ult เปลี่ยนเป็น Asura Strike: ≥3 🔵 เผา 🔵+Mana ทั้งหมด ต่อยทะลุ DEF 100% · หลังใช้ติด 😵 ง่อยแดก 3 เทิร์น', () => ({ j2Asura: 1 })),
  ],
  talents: [
    // v119 ทาเลนต์ชั้น 2 · I stats · II Ult วิวัฒน์ · III ทักษะ 3 · IV ตัวตน
    t('mk_t1_combo', 1, '👊', 'หมัดต่อเนื่อง', 2, (r) => `โอกาสคอมโบ +${rk(r, 3, 5)}%`, (r) => ({ combo: rk(r, 0.03, 0.05) })),
    t('mk_t1_heavy', 1, '💢', 'หมัดหนัก', 2, (r) => `ฮิตคอมโบแรง +${rk(r, 6, 10)}%`, (r) => ({ comboDmg: rk(r, 0.06, 0.1) })),
    t('mk_t1_flee', 1, '👻', 'พริ้วต้านเวท', 2, (r) => `FLEE +${rk(r, 5, 9)} · M.DEF +${rk(r, 3, 5)}%`, (r) => ({ flee: rk(r, 5, 9), mdef: rk(r, 0.03, 0.05) })),
    t('mk_t2_ult', 2, '🔔', 'ระฆัง & อสุรา', 2, (r) => `Tempest Bell / อาชูร่า แรง +${rk(r, 15, 25)}%`, (r) => ({ ult2Pow: rk(r, 0.15, 0.25) })),
    t('mk_t2_es', 2, '🔔', 'ปราณระฆังทอง', 2, (r) => `Tempest Bell & อาชูร่า รับผล M.DEF +${rk(r, 20, 35)}% · M.DEF +${rk(r, 3, 5)}%`, (r) => ({ j2BellMdef: rk(r, 0.2, 0.35), mdef: rk(r, 0.03, 0.05) })),
    t('mk_t2_kill', 2, '🥊', 'ปราณฮึดสู้', 2, (r) => `HP สูงสุด +${rk(r, 5, 8)}% · สะสมแรงฮึด +${rk(r, 15, 25)}%`, (r) => ({ j2HpPct: rk(r, 0.05, 0.08), j2GritRate: rk(r, 0.15, 0.25) })),
    t('mk_t3_thunder', 3, '⚡', 'ฟ้าผ่ากลางใจ', 2, (r) => `Falling Thunder แรง +${rk(r, 15, 25)}%`, (r) => ({ s3Pow: rk(r, 0.15, 0.25) })),
    t('mk_t3_per', 3, '🔵', 'ลูกพลังเข้ม', 2, (r) => `Falling Thunder +${rk(r, 8, 14)}% ต่อลูกพลัง`, (r) => ({ j2ThunderPer: rk(r, 0.08, 0.14) })),
    t('mk_t3_max', 3, '🔮', 'ลูกพลังล้น', 2, (r) => `ลูกพลังสูงสุด +${rk(r, 1, 2)}`, (r) => ({ j2ChargeMax: rk(r, 1, 2) })),
    t('mk_t4_dark', 4, '🔥', 'หมัดแค้นสะท้าน', 2, (r) => `หมัดแค้นแรงขึ้นจาก M.DEF +${rk(r, 20, 35)}% · โบนัสหมัด HP +${(rk(r, 0.003, 0.005) * 100).toFixed(1)}%`, (r) => ({ j2MdefDmg: rk(r, 0.2, 0.35), j2HpPunch: rk(r, 0.003, 0.005) })),
    t('mk_t4_chill', 4, '💥', 'ปราณอสุราคลั่ง', 2, (r) => `อาชูร่าแรง +${rk(r, 20, 35)}% · Ult เจาะเกราะ +${rk(r, 10, 20)}%`, (r) => ({ j2AsuraPow: rk(r, 0.2, 0.35), ultPierce: rk(r, 0.1, 0.2) })),
    t('mk_t4_leech', 4, '🧘', 'ปราณดูดกลืน', 2, (r) => `ดูดเลือด +${rk(r, 2, 4)}% · Max Mana +${rk(r, 15, 30)}`, (r) => ({ lifesteal: rk(r, 0.02, 0.04), maxRes: rk(r, 15, 30) })),
  ],
}
