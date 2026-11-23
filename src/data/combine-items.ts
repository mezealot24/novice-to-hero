// 🧬 Combine items (Q 2026-11-24, spec "ระบบผสมไอเทม — Spec v1"): two owned forge pieces + a core (boss mats + zeny) fuse into
// one item that carries a Unique Passive (LoL / Dota2 build path). P1 = one tier-2 recipe per base class, D3-D4 pieces.
// Stats are written by hand: about the main piece + ~40% of the second one, never the full sum (mechanics over stats).
// The `craft` entry is the core cost (common 0) so grade, refine, ascend and salvage work as on any crafted piece.
// Only TYPE imports (meta/items.ts imports this file). Item ids are save data: never rename or remove one.
import type { Item } from './meta/item-types'

/** Core cost rules (the boss mats + zeny on top of the two pieces). */
export const COMBINE = {
  coreBoss: 3, // boss mats of the recipe dungeon (the dearer piece's dungeon)
  idPrefix: 'cb_',
}

export const COMBINE_ITEMS: Item[] = [
  { id: 'cb_rendblade', slot: 'weapon', name: 'ดาบกัดกร่อนวีรชน', icon: '🩸', price: 0, slots: 2, jobs: ['swordsman'],
    desc: 'ผสมจากดาบตราวีรชน + กำไลกรงเล็บจ่าฝูง · ทุกการตีปกติกัดกร่อน HP ปัจจุบันของเป้าหมาย',
    base: { str: 7, dex: 1 }, mod: { atk: 19, pskill: 0.1, crit: 0.02 },
    effects: [{ id: 'rend_current', power: 0.03, threshold: 2.5 }],
    combine: { tier: 2, from: ['c_herosword', 'c_alphaclaw'] },
    craft: { dg: 'd3', common: 0, boss: 3, zeny: 900, bonus: [{ lifesteal: 0.04 }, { critMul: 0.1 }] } },
  { id: 'cb_ragebow', wtype: 'bow', slot: 'weapon', name: 'ธนูคลั่งสะสมศึก', icon: '🏹', price: 0, slots: 2, jobs: ['archer'],
    desc: 'ผสมจากธนูตราผนึก + กระบอกธนูเงาจันทร์ · ยิ่งสู้นาน ยิ่งยิงแรง',
    base: { dex: 7 }, mod: { atk: 15, hit: 9, crit: 0.04 },
    effects: [{ id: 'ramp_stack', power: 0.04, threshold: 8 }],
    combine: { tier: 2, from: ['c_sealbow', 'c_moonquiver'] },
    craft: { dg: 'd3', common: 0, boss: 3, zeny: 900, bonus: [{ critMul: 0.15 }, { crit: 0.03 }] } },
  { id: 'cb_tormentstaff', wtype: 'staff', slot: 'weapon', name: 'คทาเพลิงทรมาน', icon: '🔥', price: 0, slots: 2, jobs: ['mage'],
    desc: 'ผสมจากคทาผนึกวิญญาณ + ลูกแก้วตราผนึก · สกิลที่โดนเป้าหมายจุดไฟเผาตาม Max HP',
    base: { int: 7 }, mod: { matk: 23, resRegen: 1, maxRes: 5 },
    effects: [{ id: 'skill_burn', power: 0.008, threshold: 1.5 }],
    combine: { tier: 2, from: ['c_sealstaff', 'c_sealorb'] },
    craft: { dg: 'd3', common: 0, boss: 3, zeny: 900, bonus: [{ spellCrit: 0.05 }, { mgUltAmp: 0.1 }] } },
  { id: 'cb_rampfang', wtype: 'dagger', slot: 'weapon', name: 'มีดสะสมศึกเกล็ดหนอง', icon: '🗡️', price: 0, slots: 2, jobs: ['thief'],
    desc: 'ผสมจากมีดสนิมเงา + มีดปัดเกล็ดหนอง · ยิ่งสู้นาน ยิ่งแทงแรง',
    base: { agi: 7 }, mod: { atk: 12, combo: 0.08, skillCrit: 0.06, flee: 3 },
    effects: [{ id: 'ramp_stack', power: 0.04, threshold: 8 }],
    combine: { tier: 2, from: ['c_rustfang', 'c_venomgauche'] },
    craft: { dg: 'd4', common: 0, boss: 3, zeny: 1500, bonus: [{ dodgeHeal: 0.02 }, { skillCrit: 0.04, critMul: 0.1 }] } },
  { id: 'cb_pyremace', wtype: 'mace', slot: 'weapon', name: 'คทาไฟชำระอรุณ', icon: '🌅', price: 0, slots: 2, jobs: ['cleric'],
    desc: 'ผสมจากคทาแสงอรุณ + โล่ขนเงาจันทร์ · สกิลที่โดนเป้าหมายจุดไฟชำระตาม Max HP',
    base: { str: 3, wis: 3, vit: 1 }, mod: { atk: 17, matk: 13, healAmp: 0.18, maxHp: 16 },
    effects: [{ id: 'skill_burn', power: 0.008, threshold: 1.5 }],
    combine: { tier: 2, from: ['c_dawnmace', 'c_moonshield'] },
    craft: { dg: 'd3', common: 0, boss: 3, zeny: 900, bonus: [{ shieldAmp: 0.1 }, { healAmp: 0.08 }] } },
]
