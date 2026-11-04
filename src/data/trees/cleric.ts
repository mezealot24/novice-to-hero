// ✨ Cleric (Priest) skill tree + talents — design/skill-tree-priest.md ("healing is damage" + light spears).
// Owned by the cleric design thread; edit freely, only this file. Ids are save data: the free reset refunds
// ids that are gone, so v1 ids that changed meaning got new ids instead of being reused.
import { node as n, talent as t, type ClassTree } from '../tree-types'
import { KIT } from '../skill-math'
import { CLERIC_KIT } from '../jobs'


export const tree: ClassTree = {
  branches: [
    { id: 'cleric_a', job: 'cleric', name: 'แสงคุ้มครอง', icon: '🛡️', blurb: 'ยืนนาน · โล่และฮีลกลายเป็นดาเมจ' },
    { id: 'cleric_b', job: 'cleric', name: 'ตัดสิน', icon: '⚖️', blurb: 'แสงตีหลายตัว · ฮีลน้อยครั้งแต่ก้อนใหญ่' },
  ],
  nodes: [
    // A: Sanctuary
    // v58 melee hybrid (Q 2026-11-04): the Ult column. Old ids kept so saved points stay; meanings changed.
    n('cleric_a1', 'cleric_a', 1, '💗', 'พรอุ่นไอ', 5, (lv) => `สวนกลับ +${+(lv * KIT.clericWarmCounterLv * 100).toFixed(1)}% · Ult Holy Light ${CLERIC_KIT.ultLights + lv * KIT.clericWarmLightLv} ลูก`, (lv) => ({ counter: KIT.clericWarmCounterLv * lv, clUltLights: KIT.clericWarmLightLv * lv })),
    n('cleric_a2', 'cleric_a', 2, '🔰', 'เกราะแสง', 3, (lv) => `หอกแสงยิงแล้วได้โล่ ${Math.round(lv * KIT.clericSpearShieldLv * 100)}% HP (ต่อชุดหอก)`, (lv) => ({ clSpearShield: KIT.clericSpearShieldLv * lv })),
    n('cleric_a3t', 'cleric_a', 3, '✴️', 'หนามแสง', 3, (lv) => `โล่รับดาเมจแล้วสะท้อน ${lv * 25}% ใส่ตัวที่ตี`, (lv) => ({ thorns: 0.25 * lv })),
    n('cleric_a4x', 'cleric_a', 4, '🔆', 'ไฟชำระ', 1, () => `Ult ล้างดีบัฟบนตัวทั้งหมด + ฮีล ${Math.round(CLERIC_KIT.purifyHeal * 100)}% M.ATK`, () => ({ clPurify: 1 })),
    // B: Judgement
    n('cleric_b1', 'cleric_b', 1, '🌟', 'แสงคม', 3, (lv) => `M.ATK +${lv * 5}`, (lv) => ({ matk: 5 * lv })),
    n('cleric_b2', 'cleric_b', 2, '⚖️', 'ตัดสินหมู่', 3, (lv) => `แสงยิง ${2 + Math.min(lv, 2)} ตัว${lv >= 3 ? ' · ดาเมจแสง +15%' : ''}`, (lv) => ({ smiteTargets: Math.min(lv, 2), smiteMul: lv >= 3 ? 0.15 : 0 })),
    n('cleric_b3s', 'cleric_b', 3, '🧘', 'ใจนิ่ง', 3, (lv) => `ฮีลเมื่อ HP < ${75 - lv * 10}% · ฮีลแรง +${lv * 10}%`, (lv) => ({ healAt: 0.1 * lv, healAmp: 0.1 * lv })),
    n('cleric_b4j', 'cleric_b', 4, '⚖️', 'วันพิพากษา', 1, () => 'แสงครั้งที่ 3 ทุกรอบ = พิพากษา: ใส่ทุกตัว 2.2x + ตราบาป (รับดาเมจ +15% 2 เทิร์น)', () => ({ judge: 1 })),
  ],
  talents: [
    // Row I · Job Lv 5
    t('cleric_t1_focus', 1, '💧', 'สมาธิ', 2, (r) => `ฟื้น Mana +${r === 1 ? 6 : 10}/เทิร์น`, (r) => ({ resRegen: r === 1 ? 2 : 3.4 })),
    t('cleric_t1_spear', 1, '🔱', 'หอกเปิดศึก', 2, (r) => `เริ่มทุกไฟต์ด้วยหอกแสง ${r === 1 ? 2 : 3} เล่ม (เล่มละ 30% M.ATK ใส่ทุกตัว)`, (r) => ({ spearStart: r === 1 ? 2 : 3 })),
    t('cleric_t1_ward', 1, '🛡️', 'ร่างพร', 2, (r) => `เริ่มไฟต์บอสด้วยโล่ ${r === 1 ? 12 : 20}% HP`, (r) => ({ bossShield: r === 1 ? 0.12 : 0.2 })),
    // Row II · Job Lv 10 (ult "พรคุ้มครอง")
    t('cleric_t2_regen', 2, '🌿', 'พรยืนยาว', 2, (r) => `ult แถมฟื้น ${r === 1 ? 2 : 3}% HP/เทิร์น 3 เทิร์น`, (r) => ({ ultRegen: r === 1 ? 0.02 : 0.03 })),
    t('cleric_t2_holy', 2, '☀️', 'แสงลงทัณฑ์', 2, (r) => `ult แถมดาเมจ ${r === 1 ? '1.0' : '1.6'}x M.ATK ใส่ทุกตัว`, (r) => ({ ultHoly: r === 1 ? 1 : 1.6 })),
    t('cleric_t2_wing', 2, '🕊️', 'ใต้ปีกเทพ', 2, (r) => `กด ult ตอนบอสชาร์จ: โล่ x${r === 1 ? '1.5' : '2'}`, (r) => ({ ultChargeShield: r === 1 ? 0.5 : 1 })),
    // Row III · Job Lv 20 (auto skill)
    t('cleric_t3_spear', 3, '🔱', 'หอกรายเทิร์น', 2, (r) => `ได้หอกแสง 1 เล่ม${r === 1 ? 'ทุก 2 เทิร์น' : 'ทุกเทิร์น'}`, (r) => ({ spearRate: r === 1 ? 0.5 : 1 })),
    t('cleric_t3_miracle', 3, '🍀', 'ปาฏิหาริย์', 2, (r) => `แสงและหอกแสงคริได้ ${r === 1 ? 10 : 18}% (ดาเมจคริตามค่าคริของเกม)`, (r) => ({ spellCrit: r === 1 ? 0.1 : 0.18 })),
    t('cleric_t3_vamp', 3, '🌟', 'แสงชุบชีวิต', 2, (r) => `แสงฮีลตัวเอง ${r === 1 ? 6 : 10}% ของดาเมจ`, (r) => ({ smiteVamp: r === 1 ? 0.06 : 0.1 })),
    // Row IV · Job Lv 30 (identity)
    t('cleric_t4_angel', 4, '👼', 'เทวดาคุ้มครอง', 2, (r) => `ล้มแล้วลุกใหม่ 1 ครั้ง/รอบ HP ${r === 1 ? 25 : 40}% (นับรวมกับพรฟีนิกซ์)`, (r) => ({ revive: 1, reviveHp: r === 1 ? 0.25 : 0.4 })),
    t('cleric_t4_spear', 4, '🔱', 'หอกศักดิ์สิทธิ์', 2, (r) => `หอกแสงแรง ${r === 1 ? 45 : 60}% M.ATK · หอกแต่ละเล่มฮีล ${r === 1 ? '0.5' : '1'}% HP`, (r) => ({ spearMul: r === 1 ? 0.15 : 0.3, spearHeal: r === 1 ? 0.005 : 0.01 })),
    t('cleric_t4_dawn', 4, '🌅', 'อรุณรุ่ง', 2, (r) => `ตั้งแต่เทิร์น 12 ของไฟต์ ดาเมจ +${r === 1 ? 18 : 30}%`, (r) => ({ lateDmg: r === 1 ? 0.18 : 0.3 })),
  ],
}
