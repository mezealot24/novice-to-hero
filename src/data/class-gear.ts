// 2nd / 3rd job headgear + accessories (v125, Q 2026-11-08: "เพิ่ม Gear Class 2 / 3 หมวก/เครื่องประดับ + option เฉพาะคลาส").
// Every piece is a forge recipe (like the 2nd-job weapons in data/craft.ts) locked to ONE 2nd job (`j2`) or 3rd job (`j3`):
//  - stats  = the main stats of that class + generic mods + the class's own j2* / j3* flags (the same numbers the ใยชั้น 2 / 3 nodes give per level)
//  - grade  = ★3 / ★5 unlock `craft.bonus`, which is class-only too (the "อัพขั้น" options)
//  - random = refine +5 / +7 / +10 lines and the option gacha also roll class-only lines for that class (data/refine.ts CLASS_LINES)
// Item ids are save data: never rename or remove one. All numbers are first guesses (not bot-tuned): tune after a playtest.
import type { Item } from './meta'
import type { JobId } from './jobs'

const SW: JobId[] = ['swordsman'], TH: JobId[] = ['thief'], CL: JobId[] = ['cleric'], AR: JobId[] = ['archer'], MG: JobId[] = ['mage']
/** 2nd-job gear costs the same as the 2nd-job weapons (D5 recipe). */
const D5 = { dg: 'd5', common: 18, boss: 4, zeny: 2500 }
/** 3rd-job gear is a D10 recipe: the 3rd job itself needs a D10 clear. */
const D10 = { dg: 'd10', common: 24, boss: 6, zeny: 6000 }

export const CLASS_GEAR: Item[] = [
  // ===== ⚔️ Swordsman =====
  // 🪓 Berserker: crit / low-HP rage
  { id: 'c_bz_helm', slot: 'head', name: 'หมวกเขาอสูรคลั่ง', icon: '👹', price: 0, slots: 1, jobs: SW, j2: ['berserker'], req: 'job2',
    desc: 'ของคราฟเบอร์เซิร์กเกอร์ · หมวก: ยิ่งเจ็บยิ่งคลั่ง คริหนัก',
    base: { str: 4, vit: 3 }, mod: { maxHp: 70, def: 6, crit: 0.03, j2LowHp: 0.06 },
    craft: { ...D5, bonus: [{ j2Duel: 0.06 }, { j2LowHp: 0.08, critMul: 0.1 }] } },
  { id: 'c_bz_fang', slot: 'acc', name: 'สร้อยเขี้ยวโลหิตคลั่ง', icon: '🩸', price: 0, slots: 1, jobs: SW, j2: ['berserker'], req: 'job2',
    desc: 'ของคราฟเบอร์เซิร์กเกอร์ · เครื่องประดับ: ดวลบอสแรง ดูดเลือด',
    base: { str: 4, agi: 3, vit: 2 }, mod: { atk: 8, critMul: 0.1, lifesteal: 0.02, j2Duel: 0.06 },
    craft: { ...D5, bonus: [{ j2FrenzyMax: 1 }, { j2LowHp: 0.08, lifesteal: 0.02 }] } },
  // 🐴 Knight: tank, spear, banner
  { id: 'c_kn_helm', slot: 'head', name: 'หมวกเกราะอัศวินเปโก', icon: '🪖', price: 0, slots: 1, jobs: SW, j2: ['knight'], req: 'job2',
    desc: 'ของคราฟอัศวิน · หมวก: บล็อกบ่อย สกิลหอกแรงตาม HP',
    base: { vit: 5, str: 2 }, mod: { maxHp: 90, def: 10, j2Guard: 0.02, j2HpDmg: 0.01 },
    craft: { ...D5, bonus: [{ j2Provoke: 0.05 }, { j2Guard: 0.03, tenacity: 0.08 }] } },
  { id: 'c_kn_banner', slot: 'acc', name: 'ตราธงศึกอัศวิน', icon: '🚩', price: 0, slots: 1, jobs: SW, j2: ['knight'], req: 'job2',
    desc: 'ของคราฟอัศวิน · เครื่องประดับ: ปักธงได้โล่ต้นเวฟ สวนกลับ',
    base: { vit: 4, str: 3, dex: 2 }, mod: { maxHp: 60, def: 6, counter: 0.06, j2Banner: 0.03 },
    craft: { ...D5, bonus: [{ j2HpDmg: 0.01 }, { j2BannerKill: 0.03, j2Banner: 0.03 }] } },

  // ===== 🗡️ Thief =====
  // 🔪 Rogue: flying knives, combo, crit
  { id: 'c_rg_hood', slot: 'head', name: 'ฮู้ดมีดบินราตรี', icon: '🥷', price: 0, slots: 1, jobs: TH, j2: ['rogue'], req: 'job2',
    desc: 'ของคราฟโร้ก · หมวก: มีดบินแรง หลบเก่ง คริบ่อย',
    base: { agi: 4, luk: 3 }, mod: { flee: 8, crit: 0.03, j2KnifeMul: 0.1 },
    craft: { ...D5, bonus: [{ combo: 0.04 }, { j2KnifeMul: 0.12, critMul: 0.1 }] } },
  { id: 'c_rg_ring', slot: 'acc', name: 'แหวนมีดกระจกเงา', icon: '💍', price: 0, slots: 1, jobs: TH, j2: ['rogue'], req: 'job2',
    desc: 'ของคราฟโร้ก · เครื่องประดับ: คอมโบรัว มีดบินแรง',
    base: { agi: 3, str: 3, luk: 2 }, mod: { atk: 8, combo: 0.05, crit: 0.03, j2KnifeMul: 0.1 },
    craft: { ...D5, bonus: [{ critMul: 0.1 }, { j2KnifeMul: 0.15, crit: 0.03 }] } },
  // 🕴️ Mobster: poison, debt, execute
  { id: 'c_mb_fedora', slot: 'head', name: 'หมวกเฟโดร่าเจ้าหนี้', icon: '🎩', price: 0, slots: 1, jobs: TH, j2: ['mobster'], req: 'job2',
    desc: 'ของคราฟมาเฟีย · หมวก: พิษแรง เกณฑ์ปลิดชีพกว้างขึ้น',
    base: { luk: 4, int: 3 }, mod: { maxHp: 50, def: 5, poisonDmg: 1, j2ExecAdd: 0.01 },
    craft: { ...D5, bonus: [{ vsPoison: 0.06 }, { j2ExecAdd: 0.015, debuffRes: 0.1 }] } },
  { id: 'c_mb_watch', slot: 'acc', name: 'นาฬิกาพกทวงหนี้', icon: '⏱️', price: 0, slots: 1, jobs: TH, j2: ['mobster'], req: 'job2',
    desc: 'ของคราฟมาเฟีย · เครื่องประดับ: พิษซ้อนสูง ปลิดชีพแม่น',
    base: { luk: 3, agi: 3, int: 2 }, mod: { atk: 6, poison: 1, poisonCap: 2, j2ExecAdd: 0.01 },
    craft: { ...D5, bonus: [{ j2DebuffTurns: 1 }, { j2ExecAdd: 0.015, vsPoison: 0.08 }] } },

  // ===== ✨ Cleric =====
  // ✝️ Crusader: Holy / Grand Cross, block
  { id: 'c_cr_crown', slot: 'head', name: 'มงกุฎกางเขนศักดิ์สิทธิ์', icon: '✝️', price: 0, slots: 1, jobs: CL, j2: ['crusader'], req: 'job2',
    desc: 'ของคราฟครูเซเดอร์ · หมวก: กางเขนแรง HP หนา กันเวท',
    base: { vit: 4, wis: 3 }, mod: { maxHp: 80, def: 8, mdef: 0.04, j2CrossAdd: 0.08 },
    craft: { ...D5, bonus: [{ j2PayCut: 0.1 }, { j2CrossAdd: 0.1, j2Guard: 0.02 }] } },
  { id: 'c_cr_pendant', slot: 'acc', name: 'สร้อยตราศรัทธา', icon: '📿', price: 0, slots: 1, jobs: CL, j2: ['crusader'], req: 'job2',
    desc: 'ของคราฟครูเซเดอร์ · เครื่องประดับ: บล็อกแล้วฮีล',
    base: { wis: 3, vit: 3, str: 2 }, mod: { maxHp: 50, j2Guard: 0.03, j2BlockHeal: 0.01 },
    craft: { ...D5, bonus: [{ j2Reflect: 0.05 }, { j2BlockShield: 0.03, j2BlockHeal: 0.01 }] } },
  // 👊 Monk: charges, thunder, shield
  { id: 'c_mk_band', slot: 'head', name: 'ผ้าคาดหัวสายฟ้า', icon: '🧘', price: 0, slots: 1, jobs: CL, j2: ['monk'], req: 'job2',
    desc: 'ของคราฟมังค์ · หมวก: คอมโบ สายฟ้าแรงต่อลูกพลัง',
    base: { wis: 4, agi: 3 }, mod: { maxHp: 40, matk: 8, combo: 0.04, j2ThunderPer: 0.08 },
    craft: { ...D5, bonus: [{ j2Es: 0.02 }, { j2ThunderPer: 0.1, j2Dark: 0.01 }] } },
  { id: 'c_mk_beads', slot: 'acc', name: 'ลูกประคำพลังกระแส', icon: '🔵', price: 0, slots: 1, jobs: CL, j2: ['monk'], req: 'job2',
    desc: 'ของคราฟมังค์ · เครื่องประดับ: โล่ตอนไม่โดนตี คอมโบรัว',
    base: { wis: 3, str: 3, agi: 2 }, mod: { atk: 8, combo: 0.05, j2Es: 0.02, j2Dark: 0.01 },
    craft: { ...D5, bonus: [{ j2ChargeMax: 1 }, { j2ThunderPer: 0.12, combo: 0.04 }] } },

  // ===== 🔮 Mage =====
  // 🌩️ Wizard: big spells
  { id: 'c_wz_hat', slot: 'head', name: 'หมวกพ่อมดพายุ', icon: '🧙', price: 0, slots: 1, jobs: MG, j2: ['wizard'], req: 'job2',
    desc: 'ของคราฟวิซาร์ด · หมวก: Storm Gust แรง Mana เยอะ',
    base: { int: 5, wis: 2 }, mod: { matk: 10, maxRes: 20, spellCrit: 0.03, j2GustMul: 0.08 },
    craft: { ...D5, bonus: [{ j2MeteorMul: 0.08 }, { j2LovMul: 0.1, mgUltAmp: 0.08 }] } },
  { id: 'c_wz_crystal', slot: 'acc', name: 'ผลึกพายุสามธาตุ', icon: '🔮', price: 0, slots: 1, jobs: MG, j2: ['wizard'], req: 'job2',
    desc: 'ของคราฟวิซาร์ด · เครื่องประดับ: อุกกาบาตและสายฟ้าแรง',
    base: { int: 4, dex: 2, wis: 2 }, mod: { matk: 8, maxRes: 15, resRegen: 0.5, j2MeteorMul: 0.08, j2LovMul: 0.08 },
    craft: { ...D5, bonus: [{ spellCrit: 0.04 }, { j2GustMul: 0.12, mgUltAmp: 0.1 }] } },
  // 📖 Sage: auto spell, endow
  { id: 'c_sg_cap', slot: 'head', name: 'หมวกปราชญ์ร่ายอัตโนมัติ', icon: '🎓', price: 0, slots: 1, jobs: MG, j2: ['sage'], req: 'job2',
    desc: 'ของคราฟเซจ · หมวก: Auto Spell ติดบ่อย ตีใกล้แรง',
    base: { int: 4, str: 3 }, mod: { matk: 8, atk: 5, maxRes: 15, j2AutoChance: 0.04 },
    craft: { ...D5, bonus: [{ j2EndowAmp: 0.05 }, { j2AutoChance: 0.05, spellCrit: 0.03 }] } },
  { id: 'c_sg_charm', slot: 'acc', name: 'จี้ธาตุเสริมอาวุธ', icon: '🧿', price: 0, slots: 1, jobs: MG, j2: ['sage'], req: 'job2',
    desc: 'ของคราฟเซจ · เครื่องประดับ: Endow แรง ดูดเวทเป็น Mana',
    base: { int: 3, dex: 3, str: 2 }, mod: { matk: 6, atk: 6, j2EndowAmp: 0.05, j2MagicRod: 2 },
    craft: { ...D5, bonus: [{ j2AutoChance: 0.04 }, { j2MagicRod: 3, j2EndowAmp: 0.05 }] } },

  // ===== 🏹 Archer =====
  // 🐺 Beastmaster: pets
  { id: 'c_bm_feather', slot: 'head', name: 'หมวกขนเหยี่ยวจ่าฝูง', icon: '🦅', price: 0, slots: 1, jobs: AR, j2: ['beastmaster'], req: 'job2',
    desc: 'ของคราฟบีสต์มาสเตอร์ · หมวก: สัตว์เลี้ยงแรงขึ้น เล็งแม่น',
    base: { dex: 4, luk: 3 }, mod: { hit: 8, crit: 0.03, j2PetPow: 0.06 },
    craft: { ...D5, bonus: [{ j2PetHeal: 0.004 }, { j2PetPow: 0.08, j2HawkMul: 0.1 }] } },
  { id: 'c_bm_tooth', slot: 'acc', name: 'เขี้ยวสัตว์ป่าผูกพัน', icon: '🦷', price: 0, slots: 1, jobs: AR, j2: ['beastmaster'], req: 'job2',
    desc: 'ของคราฟบีสต์มาสเตอร์ · เครื่องประดับ: สัตว์ลงมือแล้วฮีล',
    base: { dex: 3, agi: 3, luk: 2 }, mod: { atk: 8, hit: 6, j2PetPow: 0.05, j2PetHeal: 0.003 },
    craft: { ...D5, bonus: [{ j2WolfMul: 0.1 }, { j2PetPow: 0.08, critMul: 0.1 }] } },
  // 🔧 Innovator: traps, turret, gadget box
  { id: 'c_in_goggles', slot: 'head', name: 'แว่นนักประดิษฐ์ชั้นเทพ', icon: '🥽', price: 0, slots: 1, jobs: AR, j2: ['innovator'], req: 'job2',
    desc: 'ของคราฟอินโนเวเตอร์ · หมวก: กับดักแรง เล็งแม่น',
    base: { dex: 3, luk: 4 }, mod: { hit: 8, crit: 0.03, j2TrapMul: 0.12 },
    craft: { ...D5, bonus: [{ j2BoxLuck: 0.15 }, { j2TurretMul: 0.15, crit: 0.03 }] } },
  { id: 'c_in_gear', slot: 'acc', name: 'เฟืองกลไกนำโชค', icon: '⚙️', price: 0, slots: 1, jobs: AR, j2: ['innovator'], req: 'job2',
    desc: 'ของคราฟอินโนเวเตอร์ · เครื่องประดับ: ป้อมปืนแรง ของหายากในกล่องออกบ่อย',
    base: { luk: 4, dex: 3, agi: 2 }, mod: { atk: 6, critMul: 0.1, j2TurretMul: 0.1, j2BoxLuck: 0.15 },
    craft: { ...D5, bonus: [{ j2TrapMul: 0.12 }, { j2BoxMul: 0.1, j2BoxLuck: 0.1 }] } },

  // ===== 3rd job "Awakening" (D10 recipes) =====
  // ⚜️ Paladin (Crusader -> Paladin): shield press, banding, gospel
  { id: 'c_pl_crown', slot: 'head', name: 'มงกุฎพาลาดินแห่งพระวรสาร', icon: '⚜️', price: 0, slots: 1, jobs: CL, j2: ['crusader'], j3: ['paladin'], req: 'job3',
    desc: 'ของคราฟพาลาดิน · หมวก: บล็อกแล้วสวนด้วยโล่ HP หนาเป็นกำแพง',
    base: { vit: 6, wis: 4, str: 3 }, mod: { maxHp: 140, def: 14, mdef: 0.06, j2Guard: 0.03, j3Press: 0.15 },
    craft: { ...D10, bonus: [{ j3Banding: 0.01 }, { j3GospelHeal: 0.005, j2CrossAdd: 0.1 }] } },
  { id: 'c_pl_brooch', slot: 'acc', name: 'เข็มกลัดตราสวรรค์พาลาดิน', icon: '🏅', price: 0, slots: 1, jobs: CL, j2: ['crusader'], j3: ['paladin'], req: 'job3',
    desc: 'ของคราฟพาลาดิน · เครื่องประดับ: บล็อกแล้วได้โล่และฮีล พรหลัง Grand Cross',
    base: { vit: 5, wis: 4, str: 3 }, mod: { maxHp: 90, def: 8, j2BlockShield: 0.03, j2BlockHeal: 0.01, j3AfterBless: 0.03 },
    craft: { ...D10, bonus: [{ j3Press: 0.15 }, { j3AfterBless: 0.04, j3Banding: 0.01 }] } },
]
