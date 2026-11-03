// 🔮 Mage skill tree + talents. Owned by the mage design thread; edit freely, only this file.
// Spec: design/skill-tree-mage.md. Node ids are save data: never rename or remove a shipped id.
// Element nodes only matter on runs with that ult element (BattleScene reads them inside the element's code).
import { node as n, talent as t, type ClassTree } from '../tree-types'

export const tree: ClassTree = {
  branches: [
    { id: 'mage_core', job: 'mage', name: 'แก่นเวท', icon: '🔷', blurb: 'ใช้ได้ทุกธาตุ' },
    { id: 'mage_l', job: 'mage', name: 'สายฟ้า', icon: '⚡', blurb: 'เป้าเดียว ฮิตเยอะ ฆ่าบอส' },
    { id: 'mage_f', job: 'mage', name: 'ไฟ', icon: '🔥', blurb: 'เผาซ้อน · ลามไปตัวอื่น' },
    { id: 'mage_i', job: 'mage', name: 'น้ำแข็ง', icon: '❄️', blurb: 'ช้า · บาเรียหนา · หักบอส' },
  ],
  nodes: [
    n('mage_core1', 'mage_core', 0, '🔷', 'แก่นเวท', 3, (lv) => `Max Mana +${lv * 8}`, (lv) => ({ maxRes: 8 * lv })), // v21: was Mana Shield (removed)
    n('mage_core2', 'mage_core', 0, '🧘', 'สมาธิ', 3, (lv) => `ฟื้น Mana +${lv * 2}/เทิร์น`, (lv) => ({ resRegen: (2 / 3) * lv })),
    n('mage_core3', 'mage_core', 0, '💪', 'กายสู่เวท', 3, (lv) => `STR ${[30, 60, 100][lv - 1]}% นับเป็น INT ด้วย (M.ATK + Max Mana)`, (lv) => ({ strToInt: [0.3, 0.6, 1][lv - 1] })), // Q 2026-11-03: off-stat STR is useful for Mage
    n('mage_l1', 'mage_l', 1, '⚡', 'กระแสแรง', 3, (lv) => `ult สายฟ้า +${lv} ฮิต`, (lv) => ({ lightHits: lv })),
    n('mage_l2', 'mage_l', 2, '🌩️', 'ฟ้าแตกแขนง', 3, (lv) => `ทุกฮิตสายฟ้า ${lv * 8}% แตกเป็นฮิตเพิ่มใส่ตัวสุ่ม`, (lv) => ({ lightChain: 0.08 * lv })),
    n('mage_l3', 'mage_l', 3, '✴️', 'ประจุ', 3, (lv) => `M.ATK +${lv * 4}`, (lv) => ({ matk: 4 * lv })),
    n('mage_l4', 'mage_l', 4, '🔱', 'ฟ้าลิขิต', 1, () => 'ทุกฮิตสายฟ้าทอย 2 ครั้ง เอาค่าสูง · ฮิต ≥1x คืน Mana 3', () => ({ lightLuck: 1, overload: 3 })),
    n('mage_f1', 'mage_f', 1, '🪵', 'เชื้อเพลิง', 3, (lv) => `เพดานเผา +${lv * 2} stack`, (lv) => ({ burnCap: 2 * lv })),
    n('mage_f2', 'mage_f', 2, '🔥', 'ลูกไฟติดเชื้อ', 3, (lv) => `ลูกไฟระเบิด (สกิลออโต้) ติดเผา ${lv} stack`, (lv) => ({ autoBurn: lv })),
    n('mage_f3', 'mage_f', 3, '♨️', 'เปลวร้อน', 3, (lv) => `เผาแรงขึ้น +${lv}% M.ATK ต่อ stack`, (lv) => ({ burnTick: 0.01 * lv })),
    n('mage_f4', 'mage_f', 4, '☄️', 'เถ้าลุกลาม', 1, () => 'มอนตาย: stack เผาครึ่งหนึ่งลามไปทุกตัว', () => ({ fireSpread: 1 })),
    n('mage_i1', 'mage_i', 1, '🧊', 'หนาวลึก', 3, (lv) => `มอนที่ช้าอยู่ ช้าลงอีก ${lv * 5}%`, (lv) => ({ chillSlow: 0.05 * lv })),
    n('mage_i2', 'mage_i', 2, '💠', 'เปราะ', 3, (lv) => `มอนที่ช้าอยู่รับดาเมจ +${lv * 6}%`, (lv) => ({ brittle: 0.06 * lv })),
    n('mage_i3', 'mage_i', 3, '🛡️', 'เกราะน้ำแข็ง', 3, (lv) => `บาเรีย ult น้ำแข็ง +${(lv * 0.3).toFixed(1)}x M.ATK`, (lv) => ({ iceBarrier: 0.3 * lv })),
    n('mage_i4', 'mage_i', 4, '❄️', 'ผลึกแตก', 1, () => 'แช่แข็งแล้วแตก 1.5x (ตัวอื่น 0.75x)', () => ({ shatter: 1 })),
  ],
  talents: [
    // row 1 (Job Lv 5): ธาตุถนัด
    t('mg_t0a', 1, '⚡', 'ลูกศิษย์สายฟ้า', 2, (r) => r === 1 ? 'พรเลเวลอัปครั้งแรกมี Lightning Bolt เสมอ · ult สายฟ้า +10%' : 'พรแรกมี Lightning Bolt · ult สายฟ้า +20% · Bolt +1 ฮิต', (r) => ({ mgFirstCard: 1, mgLightAmp: 0.1 * r, boltHits: r === 2 ? 1 : 0 })),
    t('mg_t0b', 1, '🔥', 'ลูกศิษย์เปลวไฟ', 2, (r) => r === 1 ? 'พรเลเวลอัปครั้งแรกมี "ลูกไฟ" เสมอ · ult ไฟ +10%' : 'พรแรกมี "ลูกไฟ" · ult ไฟ +20% · ult เผา +1 stack', (r) => ({ mgFirstCard: 2, mgFireAmp: 0.1 * r, mgFireStack: r === 2 ? 1 : 0 })),
    t('mg_t0c', 1, '❄️', 'ลูกศิษย์น้ำแข็ง', 2, (r) => `เริ่มทุกเวฟด้วยบาเรีย ${r === 1 ? '1' : '1.6'}x M.ATK · ult น้ำแข็ง +${r * 10}%`, (r) => ({ mgWaveBarrier: r === 1 ? 1 : 1.6, mgIceAmp: 0.1 * r })),
    // row 2 (Job Lv 10): สไตล์ Mana
    t('mg_t1a', 2, '🏺', 'คลังมานา', 2, (r) => `Max Mana +${r === 1 ? 25 : 45} · ฟื้น Mana −20%`, (r) => ({ maxRes: r === 1 ? 25 : 45, resRegenCut: 0.2 })), // v21: was ปราการมานา (Mana Shield removed)
    t('mg_t1b', 2, '💨', 'ร่ายไว', 2, (r) => `สกิลออโต้ใช้ Mana −${r === 1 ? 7 : 13} · Max Mana −15`, (r) => ({ autoCostCut: r === 1 ? 7 : 13, maxRes: -15 })),
    t('mg_t1c', 2, '🔄', 'วงล้อธาตุ', 2, (r) => `ธาตุ ult หมุนเองทุกครั้งที่ร่าย ⚡→🔥→❄️ · ult +${r * 10}%`, (r) => ({ elemWheel: 1, mgUltAmp: 0.1 * r })),
    // row 3 (Job Lv 20): รอดตอนคับขัน
    t('mg_t2a', 3, '💥', 'บาเรียระเบิด', 2, (r) => r === 1 ? 'บาเรียแตก → ระเบิด 1x M.ATK ใส่ทุกตัว · บาเรีย −20%' : 'บาเรียแตก → ระเบิด 1.6x ใส่ทุกตัว + ผลักเทิร์น · บาเรีย −20%', (r) => ({ barrierBoom: r === 1 ? 1 : 1.6, mgBarrierCut: 0.2 })),
    t('mg_t2b', 3, '✨', 'พริบตา', 2, (r) => `หลบ ${r} ครั้งแรกของทุกเวฟแน่นอน · HP −15`, (r) => ({ waveDodge: r, maxHp: -15 })),
    t('mg_t2c', 3, '🔷', 'มานาฉุกเฉิน', 2, (r) => r === 1 ? 'HP < 30% ครั้งแรก → Mana เต็ม · Max Mana −8' : 'HP < 30% ครั้งแรก → Mana เต็ม + บาเรีย 2x M.ATK · Max Mana −8', (r) => ({ mgEmergency: r, maxRes: -8 })),
    // row 4 (Job Lv 30): สไตล์ ult
    t('mg_t3a', 4, '👯', 'ร่ายคู่', 2, (r) => `ult ร่าย 2 ครั้ง ครั้งละ ${r === 1 ? 60 : 70}% · คูลดาวน์ +1`, (r) => ({ mgDoubleCast: r === 1 ? 0.6 : 0.7, mgUltCd: 1 })),
    t('mg_t3b', 4, '⏩', 'สมาธิสูง', 2, (r) => r === 1 ? 'คูลดาวน์ ult −1 · ult −15%' : 'คูลดาวน์ ult −1 · ร่าย ult ได้ Mana 20 · ult −15%', (r) => ({ mgUltCd: -1, mgUltAmp: -0.15, mgUltMana: r === 2 ? 20 : 0 })),
    t('mg_t3c', 4, '🌊', 'พลังล้น', 2, (r) => `ต้นเทิร์น Mana ≥ 90% → สกิลออโต้ ${r === 1 ? '1.5' : '1.8'}x`, (r) => ({ mgOverflow: r === 1 ? 1.5 : 1.8 })),
  ],
}
