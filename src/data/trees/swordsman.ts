// ⚔️ Swordsman skill tree + talents. Owned by the swordsman design thread; edit freely, only this file.
// Spec: design/skill-tree-swordsman.md. Identity: "getting hit is an advantage" (counter, lifesteal). Rage left with v26: the Swordsman runs on Mana (design/swordsman-mana-nerf.md).
// Node and talent ids are save data: never rename or remove a shipped id (retire it by leaving it out of the UI instead).
import { node as n, talent as t, type ClassTree } from '../tree-types'

export const tree: ClassTree = {
  branches: [
    { id: 'swordsman_a', job: 'swordsman', name: 'ป้อมเหล็ก', icon: '🛡️', blurb: 'สวนกลับ · โล่รับแล้วสะท้อนคืน' },
    { id: 'swordsman_b', job: 'swordsman', name: 'โลหิต', icon: '🩸', blurb: 'Mana · ดูดเลือด · คลั่งตอนเลือดน้อย' },
  ],
  nodes: [
    n('swordsman_a1', 'swordsman_a', 1, '↩️', 'ท่าสวนชำนาญ', 3, (lv) => `สวนกลับ +${lv * 5}%`, (lv) => ({ counter: 0.05 * lv })),
    n('swordsman_a2', 'swordsman_a', 2, '🌵', 'โล่หนาม', 3, (lv) => `โล่รับดาเมจแล้วสะท้อนคืนตัวที่ตี ${lv * 15}%`, (lv) => ({ thorns: 0.15 * lv })),
    n('swordsman_a3', 'swordsman_a', 3, '🧱', 'ยืนหยัด', 3, (lv) => `P.DEF +${lv * 4} · ต้านทาน +${lv * 5}%`, (lv) => ({ def: 4 * lv, tenacity: 0.05 * lv })),
    n('swordsman_a4', 'swordsman_a', 4, '🌪️', 'สวนพายุ', 1, () => 'สวนกลับฟันโดนทุกตัว (ตัวอื่นโดน 0.5x)', () => ({ ctrAoe: 1 })),
    n('swordsman_b1', 'swordsman_b', 1, '🩸', 'กระหายเลือด', 3, (lv) => `ดูดเลือด +${lv * 2}% (ตีธรรมดา + คอมโบ)`, (lv) => ({ lifesteal: 0.02 * lv })),
    n('swordsman_b2', 'swordsman_b', 2, '😤', 'โทสะ', 3, (lv) => `ฟื้น Mana +${lv * 3}/เทิร์น (ช่วยมากตอนสู้บอสตัวเดียว)`, (lv) => ({ resRegen: lv })),
    n('swordsman_b3', 'swordsman_b', 3, '🗡️', 'ฟันพายุคม', 3, (lv) => `ฟันพายุใช้ Mana −${lv * 2} · ดาเมจสกิล +${lv * 5}%`, (lv) => ({ autoCostCut: 2 * lv, pskill: 0.05 * lv })),
    n('swordsman_b4', 'swordsman_b', 4, '👹', 'คลั่ง', 1, () => 'HP ต่ำกว่า 30%: ATK +40% และดูดเลือด x2', () => ({ berserk: 1 })),
  ],
  talents: [
    // ----- row 1 · Job Lv 5 · basic swing -----
    t('sw_t1a', 1, '🌀', 'ฟันกวาด', 2, (r) => `ฟันตัวที่ 2 แรงขึ้น 0.5x → ${(0.5 + 0.3 * r).toFixed(1)}x`, (r) => ({ cleaveAdd: 0.3 * r })),
    t('sw_t1b', 1, '🎯', 'ตาเพชร', 2, (r) => `Hit +${r === 1 ? 10 : 16} · คอมโบ +${r === 1 ? 8 : 12}%`, (r) => ({ hit: r === 1 ? 10 : 16, combo: r === 1 ? 0.08 : 0.12 })),
    t('sw_t1c', 1, '🛡️', 'ตั้งการ์ด', 2, (r) => `ต้นทุกเวฟได้โล่ ${r === 1 ? 5 : 8}% HP สูงสุด`, (r) => ({ waveShield: r === 1 ? 0.05 : 0.08 })),
    // ----- row 2 · Job Lv 10 · Mana rhythm (ids keep their Rage-era names: they are save data) -----
    t('sw_t2a', 2, '🔥', 'เลือดร้อน', 2, (r) => `ต้นทุกเวฟฟื้น Mana +${r === 1 ? 15 : 25}`, (r) => ({ startRage: r === 1 ? 15 : 25 })),
    t('sw_t2b', 2, '💢', 'แค้นฝังใจ', 2, (r) => `โดนตีได้ Mana +${r === 1 ? 3 : 5}`, (r) => ({ rageOnHurtAdd: r === 1 ? 3 : 5 })),
    t('sw_t2c', 2, '🌪️', 'พายุโลหิต', 2, (r) => `ดูดเลือดสกิล +${r === 1 ? 15 : 25}% (ตีหลายตัวได้ 1/3) · แลกกับดาเมจสกิล/ult −30%`, (r) => ({ spellVamp: r === 1 ? 0.15 : 0.25, skillDmgCut: 0.3 })),
    // ----- row 3 · Job Lv 20 · ดาบพิทักษ์ (ult) -----
    t('sw_t3a', 3, '🏰', 'ปราการ', 2, (r) => `ult: โล่ 15% → ${r === 1 ? 30 : 35}% · ดาเมจ 1.4x → 1.0x`, (r) => ({ ultShieldAdd: r === 1 ? 0.15 : 0.2, ultMulAdd: -0.4 })),
    t('sw_t3b', 3, '💥', 'ฟันทลาย', 2, (r) => `ult: ดาเมจ 1.4x → ${r === 1 ? '2.2' : '2.6'}x · บอสที่กำลังชาร์จโดน x1.5 · โล่ 15% → 5%`, (r) => ({ ultMulAdd: r === 1 ? 0.8 : 1.2, ultShieldAdd: -0.1, ultVsCharge: 0.5 })),
    t('sw_t3c', 3, '🔁', 'ท่าสวนพร้อม', 2, (r) => `หลังกด ult: โดนตี ${r === 1 ? 2 : 3} ครั้งถัดไป สวนกลับแน่นอน`, (r) => ({ ultCounters: r === 1 ? 2 : 3 })),
    // ----- row 4 · Job Lv 30 · keystone -----
    t('sw_t4a', 4, '💀', 'ไม่ยอมล้ม', 2, (r) => `ล้มครั้งแรกต่อรอบ ลุกขึ้นมาพร้อม HP ${r === 1 ? 40 : 60}%`, (r) => ({ revive: 1, reviveHp: r === 1 ? 0.4 : 0.6 })),
    t('sw_t4b', 4, '🩸', 'เลือดล้น', 2, (r) => `ฮีล/ดูดเลือดเกิน HP เต็ม กลายเป็นโล่${r === 2 ? ' · ดูดเลือด +5%' : ''}`, (r) => ({ overhealShield: 1, lifesteal: r === 2 ? 0.05 : 0 })),
    t('sw_t4c', 4, '⚙️', 'เหล็กกล้า', 2, (r) => `สวนกลับทุกครั้ง: Mana +${r === 1 ? 5 : 8} และโล่ ${r === 1 ? 3 : 5}% HP`, (r) => ({ counterRage: r === 1 ? 5 : 8, counterShield: r === 1 ? 0.03 : 0.05 })),
  ],
}
