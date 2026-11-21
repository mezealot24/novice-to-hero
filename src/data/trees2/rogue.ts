// 🔪 Rogue ใยชั้น 2 (design/second-jobs-v1.md §4) + 🧤 rg_d สายปลด (Strip, Q 2026-11-21). Node ids are save data: never rename.
import { node as n, rk, talent as t, type ClassTree } from '../tree-types'
import { disarmWeak, KIT2, rogueStripCut, snatchShare } from '../skill-math'

const R = KIT2.rogue, D = R.divest
const pc = (x: number) => `${Math.round(x * 100)}%`

export const tree2: ClassTree = {
  branches: [
    { id: 'rg_k', job: 'thief', job2: 'rogue', name: 'มีด', icon: '🔪', blurb: 'มีดบิน แรงขึ้น / เยอะขึ้น' },
    { id: 'rg_c', job: 'thief', job2: 'rogue', name: 'คอมโบ', icon: '🔁', blurb: 'คอมโบติดบ่อย = มีดบินบ่อย' },
    { id: 'rg_x', job: 'thief', job2: 'rogue', name: 'คริ', icon: '💥', blurb: 'คริ · ดาเมจคริ · คริแล้วปามีด' },
    { id: 'rg_d', job: 'thief', job2: 'rogue', name: 'ปลด', icon: '🧤', blurb: 'Strip: ใช้ตราคมมีดตัดกำลังศัตรู · ปลดอาวุธ · ถอดเกราะ · ฉกบัฟ · ★ ตัดจังหวะ' },
  ],
  nodes: [
    // P3'a (design/thief-rogue-rework-v1.md §3.5): mechanics instead of flat stats · ids kept (save data), save migration v3 refunds the web
    n('rg_k1', 'rg_k', 1, '🔪', 'มีดคมปักลึก', 3, (lv) => `มีดบินแรง +${lv * 10}% P.ATK · ตีปกติ/คอมโบที่เก็บมีด คริ +${lv * 6}%`, (lv) => ({ j2KnifeMul: 0.1 * lv, j2MarkCrit: 0.06 * lv })),
    n('rg_k2', 'rg_k', 2, '🎯', 'มีดชิ่งสังหาร', 3, (lv) => `มีดบินโดนตัวที่มีตรา ≥${R.knifeBounceAt} หรือฆ่าได้ = ชิ่งไปอีกตัว แรง ${Math.round((R.knifeBounce + 0.1 * lv) * 100)}% (ชิ่งครั้งเดียว)`, (lv) => ({ j2KnifeBounce: 0.1 * lv })),
    n('rg_k3', 'rg_k', 3, '🧪', 'มีดอาบสถานะ', 3, (lv) => `มีดบินโดน โอกาส ${lv * 20}%: แผลลึก +1 (ถ้าใช้แผลลึก) · ไม่งั้น Exposed +1 เทิร์น · ไม่งั้นพิษ +1 (ตัวที่ติดพิษอยู่)`, (lv) => ({ j2KnifeStatus: 0.2 * lv })),
    n('rg_k4', 'rg_k', 4, '🌠', 'ห่ามีดวนลูป', 1, () => 'มีดบิน +1 เล่ม ทุกครั้งที่ปา · เก็บมีด = CD ทักษะ 2/ทักษะ 3 -1 (1/เทิร์น) · ไม่มีตราบนสนาม = ปามีดฟรี 1 เล่มต้นเทิร์น', () => ({ j2KnifeAdd: 1, j2KnifeLoop: 1 })),
    n('rg_c1', 'rg_c', 1, '⚡', 'จังหวะเร่ง', 3, (lv) => `โอกาสคอมโบ +${lv * 3}% · ฮิตคอมโบ = Tempo +1 (สูงสุด ${R.comboTempoMax}/เวฟ) ความเร็ว +${lv * 4}%/stack`, (lv) => ({ combo: 0.03 * lv, j2Tempo: 0.04 * lv })),
    n('rg_c2', 'rg_c', 2, '💢', 'แทงรัวซ้ำแผล', 3, (lv) => `ฮิตคอมโบแรง +${lv * 5}% · +${lv * 4}% ต่อชนิดดีบัฟ/ตราบนเป้า (สูงสุด ${R.comboDebuffMax} ชนิด)`, (lv) => ({ comboDmg: 0.05 * lv, j2ComboDebuff: 0.04 * lv })),
    n('rg_c3', 'rg_c', 3, '💨', 'เงาพริ้วสลับร่าง', 3, (lv) => `ฮิตคอมโบ = FLEE +${lv * 6} จนถึงเทิร์นถัดไป · ทุก ${R.comboDodgeEvery} ฮิตคอมโบ หลบแน่ +1 (ICD ${R.comboDodgeIcdTurns} เทิร์น)`, (lv) => ({ j2ComboDodge: 6 * lv })),
    n('rg_c4', 'rg_c', 4, '⛓️', 'คอมโบไม่จบ', 1, () => `Combo Count +1 · คอมโบ ≥${R.comboShadowAt} ฮิต = 👥 เงาเลียนแบบ แทง Back Stab ${Math.round(R.comboShadowMul * 100)}% (คริแน่ · เก็บมีด)`, () => ({ comboCount: 1, j2LivingShadow: 1 })),
    n('rg_x1', 'rg_x', 1, '🎯', 'จุดตายเป้าอ่อน', 3, (lv) => `คริ + สกิลคริ +${lv * 4}% ใส่ตัวที่ HP ≥${Math.round(R.critAmbushHi * 100)}% หรือ <${Math.round(R.critAmbushLo * 100)}% หรือติด Exposed`, (lv) => ({ j2AmbushCrit: 0.04 * lv })),
    n('rg_x2', 'rg_x', 2, '🩸', 'ใจสลาย', 3, (lv) => `คริใส่ตัวที่ติดดีบัฟ (พิษ แผลลึก Exposed Strip ช้า) ดาเมจคริ +${lv * 12}%`, (lv) => ({ j2HeartRend: 0.12 * lv })),
    n('rg_x3', 'rg_x', 3, '🧛', 'ดูดเลือดจากคมคริ', 3, (lv) => `ติดคริ / เก็บมีด: ฮีล ${lv * 2}% ของดาเมจฮิตนั้น + Energy +${lv} (สูงสุด ${R.critLeechResMax}/เทิร์น)`, (lv) => ({ j2CritLeech: 0.02 * lv, j2CritEnergy: lv })),
    n('rg_x4', 'rg_x', 4, '✨', 'คริเป็นมีด', 1, () => `ตีธรรมดา/คอมโบ/Back Stab คริ = มีดบิน +1 เล่ม แรง ${R.critKnifeMul}x P.ATK (+ โบนัสมีดบิน)`, () => ({ j2KnifeCrit: 1 })),
    // 🧤 สายปลด (Q 2026-11-21 Strip line): weaken the enemy instead of more damage · every strip needs Marks on the Back Stab target
    n('rg_d1', 'rg_d', 1, '🧤', 'ปลดอาวุธ', 3, (lv) => `Back Stab ใส่ตัวที่มีตรา ≥${D.marks}: มอนอ่อนแรง −${pc(disarmWeak(lv))} (${D.turns} เทิร์นมอน) และเทิร์นถัดไปของมันตีเบาลง −${pc(D.disarm)} · บอส/มินิ: แรงครึ่งเดียว`, (lv) => ({ j2Disarm: lv })),
    n('rg_d2', 'rg_d', 2, '🔓', 'ถอดเกราะเปลือย', 3, (lv) => `Strip Armor ลด P.DEF −${pc(rogueStripCut(D.stripPer * lv))} (เดิม −${pc(R.stabStrip)}) · Back Stab ใส่ตัวที่ตราเต็ม = Exposed (รับดาเมจฮิต +${pc(D.exposedPct)} · ${D.exposedTurns} เทิร์นมอน)`, (lv) => ({ j2StripPlus: D.stripPer * lv })),
    n('rg_d3', 'rg_d', 3, '✋', 'ฉกบัฟ', 3, (lv) => `Back Stab ใส่ตัวที่มีตรา ≥${D.marks}: ขโมยบัฟ 1 อย่าง (💢 ATK ขึ้น > 🛡️ โล่ > 🔁 สะท้อน > 🖤 ความแค้น) · ได้ ${pc(snatchShare(lv))} ของมันมาใช้ ${D.snatchTurns} เทิร์น (ATK สูงสุด +${pc(D.snatchAmpCap)} · โล่สูงสุด ${pc(D.snatchShieldCap)} HP) · ตัวเดิมโดนฉกซ้ำได้ทุก ${D.snatchCd} เทิร์นมอน`, (lv) => ({ j2Snatch: lv })),
    n('rg_d4', 'rg_d', 4, '⛓️', 'ตัดจังหวะ', 1, () => `★ มีมอนกำลังร่ายและมีตรา ≥${D.breakMarks}: Back Stab แทงตัวนั้นก่อน ใช้ตราทั้งหมด (ไม่เก็บมีด) · มอนธรรมดา = เลิกร่าย · บอส/มินิ = ร่ายแตก เกจถอย ${D.breakPush} · ตัวเดิมโดนตัดซ้ำไม่ได้ ${D.breakImmune} เทิร์นมอน`, () => ({ j2BreakCast: 1 })),
  ],
  talents: [
    // v119 (Q 2026-11-08) ทาเลนต์ชั้น 2 · I stats · II Ult วิวัฒน์ · III ทักษะ 3 · IV ตัวตน
    t('rg_t1_combo', 1, '🔁', 'มือเร็ว', 2, (r) => `โอกาสคอมโบ +${rk(r, 3, 5)}%`, (r) => ({ combo: rk(r, 0.03, 0.05) })),
    t('rg_t1_crit', 1, '🎯', 'ตาเหยี่ยวมืด', 2, (r) => `คริ +${rk(r, 4, 7)}%`, (r) => ({ crit: rk(r, 0.04, 0.07) })),
    t('rg_t1_flee', 1, '💨', 'ตัวเบา', 2, (r) => `FLEE +${rk(r, 5, 9)}`, (r) => ({ flee: rk(r, 5, 9) })),
    t('rg_t2_ult', 2, '🌪️', 'พายุมีดคลั่ง', 2, (r) => `พายุมีดแรง +${rk(r, 15, 25)}%`, (r) => ({ ult2Pow: rk(r, 0.15, 0.25) })),
    t('rg_t2_knife', 2, '🔪', 'ใบมีดลับคม', 2, (r) => `มีดบินแรง +${rk(r, 10, 18)}% P.ATK`, (r) => ({ j2KnifeMul: rk(r, 0.1, 0.18) })),
    t('rg_t2_leech', 2, '🧛', 'เลือดคือเงิน', 2, (r) => `ดูดเลือด +${rk(r, 2, 4)}% (ตีธรรมดา + คอมโบ)`, (r) => ({ lifesteal: rk(r, 0.02, 0.04) })),
    t('rg_t3_stab', 3, '🗡️', 'แทงข้างหลัง', 2, (r) => `Back Stab แรง +${rk(r, 15, 25)}%`, (r) => ({ s3Pow: rk(r, 0.15, 0.25) })),
    t('rg_t3_gore', 3, '🩸', 'จุดตายลึก', 2, (r) => `ดาเมจคริ +${rk(r, 12, 20)}%`, (r) => ({ critMul: rk(r, 0.12, 0.2) })),
    t('rg_t3_atk', 3, '⚔️', 'เหล็กกล้า', 2, (r) => `P.ATK +${rk(r, 5, 9)}`, (r) => ({ atk: rk(r, 5, 9) })),
    t('rg_t4_combo', 4, '💢', 'แทงรัวไม่ยั้ง', 2, (r) => `ฮิตคอมโบแรง +${rk(r, 8, 14)}%`, (r) => ({ comboDmg: rk(r, 0.08, 0.14) })),
    t('rg_t4_kill', 4, '🕳️', 'ปลิดแล้วหาย', 2, (r) => `ฆ่ามอน ฮีล ${rk(r, 2, 4)}% HP สูงสุด`, (r) => ({ killHeal: rk(r, 0.02, 0.04) })),
    t('rg_t4_hit', 4, '🎯', 'ปาไม่พลาด', 2, (r) => `HIT +${rk(r, 6, 10)} · คริ +${rk(r, 2, 3)}%`, (r) => ({ hit: rk(r, 6, 10), crit: rk(r, 0.02, 0.03) })),
  ],
}
