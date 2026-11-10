// ===== Class-Specific Craft Gear (data/class-craft.ts) =====
// Expands forging so EVERY class path has distinct, identity-defining crafted gear from D6 through D10:
//   1. D6  — Job-2 class-specific Armors (10 distinct pieces, locked by `j2` + `jobs`)
//   2. D7  — Frost/Survival class gear for all 5 base classes
//   3. D8  — Pyro/Offensive class weapons & offhands for all 5 base classes
//   4. D9  — Sky Fortress endgame head/accessories for all 5 base classes
//   5. D10 — 3rd Job Awakening crafted gear (Lord Knight full set + Paladin armor & shield)
// Note: D6 pieces intentionally omit `req: 'job2'` because `job2-item-mats.test.ts` pins `req === 'job2'` to D5 mats.
//       Class restriction on D6 pieces is still strictly enforced via `j2` and `jobs` in `canWear` / `canWearAs`.
// Item ids are save data: never rename or remove one.

import type { Item } from './meta'
import type { JobId } from './jobs'

const SW: JobId[] = ['swordsman']
const TH: JobId[] = ['thief']
const CL: JobId[] = ['cleric']
const AR: JobId[] = ['archer']
const MG: JobId[] = ['mage']

const D6 = { dg: 'd6', common: 18, boss: 4, zeny: 3200 }
const D7 = { dg: 'd7', common: 20, boss: 5, zeny: 3800 }
const D8 = { dg: 'd8', common: 22, boss: 5, zeny: 4500 }
const D9 = { dg: 'd9', common: 23, boss: 6, zeny: 5200 }
const D10 = { dg: 'd10', common: 24, boss: 6, zeny: 6000 }

// =========================================================================
// 1. D6: 2nd-Job Exclusive Armors (10 distinct armors, 1 per 2nd job)
// =========================================================================
export const JOB2_ARMORS: Item[] = [
  // ⚔️ Swordsman -> Berserker
  {
    id: 'cc_bz_plate', slot: 'armor', name: 'เกราะคลั่งโลหิตเดือด', icon: '🩸', price: 0, slots: 1,
    jobs: SW, j2: ['berserker'],
    desc: 'เกราะเฉพาะเบอร์เซิร์กเกอร์ · เลือดยิ่งน้อยยิ่งตีแรง ดูดเลือด และพร้อมคลั่ง',
    base: { str: 5, vit: 5 },
    mod: { maxHp: 180, def: 14, atk: 12, lifesteal: 0.03, j2LowHp: 0.1 },
    craft: { ...D6, bonus: [{ critMul: 0.2 }, { berserk: 1, j2Duel: 0.12 }] },
  },
  // ⚔️ Swordsman -> Knight
  {
    id: 'cc_kn_barding', slot: 'armor', name: 'เกราะอัศวินหุ้มเหล็กเปโก', icon: '🐴', price: 0, slots: 1,
    jobs: SW, j2: ['knight'],
    desc: 'เกราะเฉพาะอัศวิน · ถึกเป็นกำแพง บล็อกบ่อย และสกิลหอกแรงตาม HP สูงสุด',
    base: { vit: 7, str: 3 },
    mod: { maxHp: 240, def: 22, j2Guard: 0.04, j2HpDmg: 0.015 },
    craft: { ...D6, bonus: [{ tenacity: 0.1 }, { j2Banner: 0.05, def: 15 }] },
  },
  // 🗡️ Thief -> Rogue
  {
    id: 'cc_rg_garb', slot: 'armor', name: 'ชุดคลุมเงาใบมีด', icon: '🥷', price: 0, slots: 1,
    jobs: TH, j2: ['rogue'],
    desc: 'เกราะเฉพาะโร้ก · คล่องแคล่วหลบหลีกสูง ปามีดบินแรง คอมโบรัว',
    base: { agi: 6, luk: 4 },
    mod: { maxHp: 130, def: 10, flee: 16, combo: 0.05, j2KnifeMul: 0.15 },
    craft: { ...D6, bonus: [{ dodgeHeal: 0.03 }, { dodgeStrike: 1, crit: 0.05 }] },
  },
  // 🗡️ Thief -> Mobster
  {
    id: 'cc_mb_trench', slot: 'armor', name: 'เสื้อโค้ทเจ้าหนี้อเวจี', icon: '🕴️', price: 0, slots: 1,
    jobs: TH, j2: ['mobster'],
    desc: 'เกราะเฉพาะมาเฟีย · พิษแรงเข้มข้น ขยายเกณฑ์ Execute และแพร่พิษ',
    base: { luk: 5, int: 4, str: 2 },
    mod: { maxHp: 150, def: 12, poison: 1, j2ExecAdd: 0.02 },
    craft: { ...D6, bonus: [{ vsPoison: 0.1 }, { poisonSpread: 1, j2DebuffTurns: 1 }] },
  },
  // ✨ Cleric -> Crusader
  {
    id: 'cc_cr_sanctum', slot: 'armor', name: 'เกราะศักดิ์สิทธิ์กางเขนทอง', icon: '✝️', price: 0, slots: 1,
    jobs: CL, j2: ['crusader'],
    desc: 'เกราะเฉพาะครูเซเดอร์ · กันกายภาพและเวท กางเขนแรง บล็อกแล้วฟื้นตัว',
    base: { vit: 6, wis: 5 },
    mod: { maxHp: 220, def: 18, mdef: 0.08, j2CrossAdd: 0.12 },
    craft: { ...D6, bonus: [{ j2BlockHeal: 0.02 }, { overhealShield: 1, j2Guard: 0.04 }] },
  },
  // ✨ Cleric -> Monk
  {
    id: 'cc_mk_gi', slot: 'armor', name: 'ชุดนักพรตสายฟ้าอัสนี', icon: '👊', price: 0, slots: 1,
    jobs: CL, j2: ['monk'],
    desc: 'เกราะเฉพาะมังค์ · คอมโบรัว สายฟ้าแรงตามลูกพลัง ปราณคุ้มกายและฝ่ามือเยือกแข็ง',
    base: { wis: 5, agi: 5 },
    mod: { maxHp: 160, def: 12, matk: 14, combo: 0.06, j2ThunderPer: 0.12, j2Es: 0.03 },
    craft: { ...D6, bonus: [{ j2Dark: 0.03, j2Chill: 0.12 }, { j2ChargeMax: 1, j2Instill: 1 }] },
  },
  // 🔮 Mage -> Wizard
  {
    id: 'cc_wz_robe', slot: 'armor', name: 'เสื้อคลุมมหาจอมเวทพายุ', icon: '🌩️', price: 0, slots: 1,
    jobs: MG, j2: ['wizard'],
    desc: 'เกราะเฉพาะวิซาร์ด · M.ATK และ Mana มหาศาล พายุและอุกกาบาตทำลายล้าง',
    base: { int: 8, wis: 4 },
    mod: { maxHp: 120, def: 10, matk: 24, maxRes: 30, j2GustMul: 0.15 },
    craft: { ...D6, bonus: [{ spellCrit: 0.05 }, { mgUltAmp: 0.15, j2MeteorMul: 0.15 }] },
  },
  // 🔮 Mage -> Sage
  {
    id: 'cc_sg_vestment', slot: 'armor', name: 'ชุดปราชญ์บรรจบธาตุ', icon: '📖', price: 0, slots: 1,
    jobs: MG, j2: ['sage'],
    desc: 'เกราะเฉพาะเซจ · ร่ายอัตโนมัติถี่ เสริมพลัง Endow และดูดเวทคืน Mana',
    base: { int: 6, str: 5 },
    mod: { maxHp: 150, def: 12, atk: 14, matk: 18, j2AutoChance: 0.06 },
    craft: { ...D6, bonus: [{ j2EndowAmp: 0.12 }, { j2MagicRod: 5, aspd: 0.12 }] },
  },
  // 🏹 Archer -> Beastmaster
  {
    id: 'cc_bm_pelt', slot: 'armor', name: 'ชุดหนังราชันจ่าฝูง', icon: '🐺', price: 0, slots: 1,
    jobs: AR, j2: ['beastmaster'],
    desc: 'เกราะเฉพาะบีสต์มาสเตอร์ · สัตว์เลี้ยงดุร้ายขึ้นและช่วยฟื้นฟูเจ้านาย',
    base: { dex: 6, luk: 5 },
    mod: { maxHp: 150, def: 12, hit: 12, j2PetPow: 0.12 },
    craft: { ...D6, bonus: [{ j2PetHeal: 0.008 }, { j2WolfMul: 0.2, j2HawkMul: 0.2 }] },
  },
  // 🏹 Archer -> Innovator
  {
    id: 'cc_in_apron', slot: 'armor', name: 'ชุดช่างกลประดิษฐ์เวท', icon: '🔧', price: 0, slots: 1,
    jobs: AR, j2: ['innovator'],
    desc: 'เกราะเฉพาะอินโนเวเตอร์ · กับดักและป้อมปืนรุนแรง กล่องสุ่มออกของหายากง่าย',
    base: { dex: 5, luk: 6 },
    mod: { maxHp: 140, def: 12, crit: 0.05, j2TrapMul: 0.18, j2TurretMul: 0.15 },
    craft: { ...D6, bonus: [{ j2BoxLuck: 0.25 }, { dropChance: 0.06, j2BoxMul: 0.15 }] },
  },
]

// =========================================================================
// 2. D7: Frost Peak Class Craft Gear (5 base classes, distinct mechanics)
// =========================================================================
export const D7_CLASS_GEAR: Item[] = [
  {
    id: 'cc_d7_iceshield', slot: 'offhand', name: 'โล่น้ำแข็งมังกรศึก', icon: '🧊', price: 0, slots: 1,
    jobs: SW,
    desc: 'ของคราฟ D7 เฉพาะสายนักดาบ · โล่ผลึกน้ำแข็ง ต้านทานสูง ลดดาเมจมอนเย็น และสวนกลับแรง',
    base: { vit: 6, str: 3 },
    mod: { maxHp: 150, def: 22, tenacity: 0.1, chillWeak: 0.12 },
    craft: { ...D7, bonus: [{ j2Guard: 0.05 }, { counterDmg: 0.2, counter: 0.08 }] },
  },
  {
    id: 'cc_d7_frostcloak', slot: 'head', name: 'ฮู้ดน้ำค้างไร้เงา', icon: '❄️', price: 0, slots: 1,
    jobs: TH,
    desc: 'ของคราฟ D7 เฉพาะสายโจร · หลบหลีกพริ้วไหว หลบโชคดีและคริสูง',
    base: { agi: 6, luk: 4 },
    mod: { flee: 18, luckyDodge: 0.08, crit: 0.05 },
    craft: { ...D7, bonus: [{ dodgeHeal: 0.03 }, { critMul: 0.25, aspd: 0.16 }] },
  },
  {
    id: 'cc_d7_glacierrelic', slot: 'acc', name: 'ผลึกศรัทธาน้ำแข็ง', icon: '💠', price: 0, slots: 1,
    jobs: CL,
    desc: 'ของคราฟ D7 เฉพาะสายนักบวช · ฮีลและโล่หนา มานาเยอะ ต้านทานเวทสูง',
    base: { wis: 6, vit: 4 },
    mod: { maxRes: 30, healAmp: 0.15, shieldAmp: 0.15, mdef: 0.08 },
    craft: { ...D7, bonus: [{ waveShield: 0.06 }, { overhealShield: 1, resRegen: 1 }] },
  },
  {
    id: 'cc_d7_frosttome', slot: 'offhand', name: 'คัมภีร์พายุเหมันต์', icon: '📘', price: 0, slots: 1,
    jobs: MG,
    desc: 'ของคราฟ D7 เฉพาะสายจอมเวท · แช่แข็งนานขึ้น เวทน้ำแข็งแรงและได้บาเรียหนา',
    base: { int: 6, wis: 4 },
    mod: { matk: 26, spellCrit: 0.06, iceBarrier: 0.25, chillPlus: 1 },
    craft: { ...D7, bonus: [{ brittle: 0.15 }, { chillSlow: 0.15, j2GustMul: 0.15 }] },
  },
  {
    id: 'cc_d7_icequiver', slot: 'offhand', name: 'ซองธนูผลึกเหมันต์', icon: '🏹', price: 0, slots: 1,
    jobs: AR,
    desc: 'ของคราฟ D7 เฉพาะสายนักธนู · แม่นยำเฉียบคม เจาะเกราะและคริแรงใส่มอนที่เย็น',
    base: { dex: 6, luk: 4 },
    mod: { hit: 18, crit: 0.06, pierce: 0.15, vsChill: 0.15 },
    craft: { ...D7, bonus: [{ critMul: 0.25 }, { chillWeak: 0.15, atk: 12 }] },
  },
]

// =========================================================================
// 3. D8: Volcano Core Class Craft Gear (5 base classes, fiery offense)
// =========================================================================
export const D8_CLASS_GEAR: Item[] = [
  {
    id: 'cc_d8_magmahelm', slot: 'head', name: 'หมวกเหล็กหลอมลาวา', icon: '🌋', price: 0, slots: 1,
    jobs: SW,
    desc: 'ของคราฟ D8 เฉพาะสายนักดาบ · ตีติดไฟ ดาเมจสกิลกายภาพแรง พร้อมเข้าสู่โหมดคลั่ง',
    base: { str: 6, vit: 4 },
    mod: { atk: 24, maxHp: 120, pskill: 0.12, burnDps: 4 },
    craft: { ...D8, bonus: [{ vsBurn: 0.15 }, { berserk: 1, critMul: 0.2 }] },
  },
  {
    id: 'cc_d8_ashblade', wtype: 'dagger', slot: 'offhand', name: 'มีดสั้นเถ้าถ่านอเวจี', icon: '🗡️', price: 0, slots: 1,
    jobs: TH,
    desc: 'ของคราฟ D8 เฉพาะสายโจร · มีดมือรองคอมโบรัว เผาไหม้และดูดเลือด ไฟลามเมื่อศัตรูตาย',
    base: { agi: 6, str: 4 },
    mod: { atk: 18, combo: 0.08, lifesteal: 0.04, burnDps: 3 },
    craft: { ...D8, bonus: [{ vsBurn: 0.15 }, { fireSpread: 1, crit: 0.06 }] },
  },
  {
    id: 'cc_d8_embercenser', slot: 'offhand', name: 'กระถางธูปเพลิงสวรรค์', icon: '🔥', price: 0, slots: 1,
    jobs: CL,
    desc: 'ของคราฟ D8 เฉพาะสายนักบวช · สวนกลับเป็นเวทศักดิ์สิทธิ์ เผาศัตรูและฟื้นเลือดแรง',
    base: { wis: 6, vit: 4 },
    mod: { matk: 20, def: 16, mdef: 0.08, healAmp: 0.15, holyCounter: 1 },
    craft: { ...D8, bonus: [{ burnDps: 4 }, { counter: 0.12, ctrAoe: 1 }] },
  },
  {
    id: 'cc_d8_pyrostaff', wtype: 'staff', slot: 'weapon', name: 'คทาแก่นภูเขาไฟ', icon: '☄️', price: 0, slots: 2,
    jobs: MG,
    desc: 'ของคราฟ D8 เฉพาะสายจอมเวท · เวทไฟเผาไหม้รุนแรง ไฟลามทั้งฝูงและ Ult ธาตุแรงสุดขีด',
    base: { int: 10, wis: 4 },
    mod: { matk: 45, spellCrit: 0.08, burnDps: 6, vsBurn: 0.18 },
    craft: { ...D8, bonus: [{ fireSpread: 1 }, { mgUltAmp: 0.25, maxRes: 30 }] },
  },
  {
    id: 'cc_d8_volcanobow', wtype: 'bow', slot: 'weapon', name: 'ธนูเพลิงปะทุ', icon: '🏹', price: 0, slots: 2,
    jobs: AR,
    desc: 'ของคราฟ D8 เฉพาะสายนักธนู · ศรเพลิงเจาะเกราะ คริหนัก แม่นยำไร้พลาด',
    base: { dex: 10, luk: 4 },
    mod: { atk: 38, crit: 0.08, hit: 18, burnDps: 5, vsBurn: 0.15 },
    craft: { ...D8, bonus: [{ pierce: 0.25 }, { critMul: 0.3, fireSpread: 1 }] },
  },
]

// =========================================================================
// 4. D9: Sky Fortress Endgame Class Craft Gear (5 base classes)
// =========================================================================
export const D9_CLASS_GEAR: Item[] = [
  {
    id: 'cc_d9_skygauntlet', slot: 'acc', name: 'ปลอกแขนจ้าวเวหา', icon: '⚔️', price: 0, slots: 1,
    jobs: SW,
    desc: 'ของคราฟ D9 เฉพาะสายนักดาบ · เสริมพลังท่าไม้ตาย สวนกลับ และแรงปะทะกายภาพ',
    base: { str: 6, vit: 6 },
    mod: { atk: 24, maxHp: 140, counter: 0.1, ultAmp: 0.15 },
    craft: { ...D9, bonus: [{ tenacity: 0.12 }, { pskill: 0.15, critMul: 0.2 }] },
  },
  {
    id: 'cc_d9_galeboots', slot: 'acc', name: 'จี้สายลมทลายเงา', icon: '🌪️', price: 0, slots: 1,
    jobs: TH,
    desc: 'ของคราฟ D9 เฉพาะสายโจร · โจมตีไวเหนือลม คอมโบแรง หลบแล้วตีสวนและฟื้นเลือด',
    base: { agi: 7, luk: 5 },
    mod: { aspd: 0.24, comboDmg: 0.2, luckyDodge: 0.08, dodgeHeal: 0.04 },
    craft: { ...D9, bonus: [{ crit: 0.06 }, { dodgeStrike: 1, combo: 0.08 }] },
  },
  {
    id: 'cc_d9_haloring', slot: 'acc', name: 'แหวนพิรุณแสงสวรรค์', icon: '😇', price: 0, slots: 1,
    jobs: CL,
    desc: 'ของคราฟ D9 เฉพาะสายนักบวช · ฟื้นมานาไว โล่หนา ฮีลแรง และเพิ่มพลัง Ult',
    base: { wis: 7, vit: 5 },
    mod: { maxHp: 160, resRegen: 2, healAmp: 0.18, shieldAmp: 0.15 },
    craft: { ...D9, bonus: [{ overhealShield: 1 }, { ultAmp: 0.2, mdef: 0.08 }] },
  },
  {
    id: 'cc_d9_skycrown', slot: 'head', name: 'มงกุฎจอมปราชญ์เวหา', icon: '👑', price: 0, slots: 1,
    jobs: MG,
    desc: 'ของคราฟ D9 เฉพาะสายจอมเวท · ฟื้นฟู Mana ต่อเนื่อง ดูดเลือดเวทและคริเวท',
    base: { int: 8, wis: 4 },
    mod: { matk: 30, maxRes: 35, resRegen: 2.5, spellVamp: 0.08 },
    craft: { ...D9, bonus: [{ spellCrit: 0.08 }, { mgUltAmp: 0.22, ultAmp: 0.15 }] },
  },
  {
    id: 'cc_d9_eagleeye', slot: 'head', name: 'แว่นเหยี่ยวสยบฟ้า', icon: '🦅', price: 0, slots: 1,
    jobs: AR,
    desc: 'ของคราฟ D9 เฉพาะสายนักธนู · เล็งจุดตายมอนเลือดน้อย คริทะลุเกราะรุนแรง',
    base: { dex: 7, luk: 6 },
    mod: { hit: 22, crit: 0.08, critMul: 0.25, pierce: 0.2 },
    craft: { ...D9, bonus: [{ arLowHpBonus: 0.2 }, { ultAmp: 0.2, aspd: 0.16 }] },
  },
]

// =========================================================================
// 5. D10: 3rd-Job Awakening Class Craft Gear (Lord Knight + Paladin extras)
// =========================================================================
export const JOB3_CRAFT_ITEMS: Item[] = [
  // 🐉 Lord Knight (Knight -> Lord Knight): full crafted suite
  {
    id: 'cc_lk_helm', slot: 'head', name: 'หมวกเกราะจ้าวมังกรทวนศึก', icon: '🐉', price: 0, slots: 1,
    jobs: SW, j2: ['knight'], j3: ['lordknight'], req: 'job3',
    desc: 'ของคราฟลอร์ดไนท์ · หมวก: ทะลวงเกราะมังกร ทวน Hundred Spear แรงและแม่นยำ',
    base: { str: 6, vit: 5, dex: 3 },
    mod: { maxHp: 150, def: 15, hit: 14, j2Spiral: 0.12, j3AfterBless: 0.04 },
    craft: { ...D10, bonus: [{ j3GospelField: 1 }, { j3Banding: 0.01, critMul: 0.15 }] },
  },
  {
    id: 'cc_lk_plate', slot: 'armor', name: 'เกราะศึกออร่าเบลด', icon: '🛡️', price: 0, slots: 1,
    jobs: SW, j2: ['knight'], j3: ['lordknight'], req: 'job3',
    desc: 'ของคราฟลอร์ดไนท์ · เกราะ: HP มหาศาล สกิลหอกแรงตาม HP สูงสุด และลดดาเมจแบบ Banding',
    base: { vit: 8, str: 5 },
    mod: { maxHp: 280, def: 24, tenacity: 0.12, j2HpDmg: 0.015, j3Banding: 0.02 },
    craft: { ...D10, bonus: [{ j3EarthDrive: 0.3 }, { j3Inspire: 1, def: 15 }] },
  },
  {
    id: 'cc_lk_crest', slot: 'acc', name: 'ตรามังกรพันทวน', icon: '🎖️', price: 0, slots: 1,
    jobs: SW, j2: ['knight'], j3: ['lordknight'], req: 'job3',
    desc: 'ของคราฟลอร์ดไนท์ · ประดับ: ชาร์จเปิดเวฟหนักหน่วง ทวนดูดเลือดและพรหลังศึก',
    base: { str: 5, vit: 4, dex: 3 },
    mod: { atk: 18, maxHp: 110, crit: 0.04, j2Charge: 0.2, j3GospelHeal: 0.01 },
    craft: { ...D10, bonus: [{ j3AfterBless: 0.05 }, { j2Spiral: 0.12, counter: 0.08 }] },
  },
  {
    id: 'cc_lk_lance', wtype: 'spear', slot: 'weapon', name: 'ทวนมังกรคำรามฮันเดรดสเปียร์', icon: '🔱', price: 0, slots: 2,
    jobs: SW, j2: ['knight'], j3: ['lordknight'], req: 'job3',
    desc: 'ของคราฟลอร์ดไนท์ · หอกตื่นรู้: ปลุกพลัง Hundred Spear และ Aura Blade ถึงขีดสุด',
    base: { str: 8, vit: 7, dex: 4 },
    mod: { atk: 42, maxHp: 180, hit: 16, pskill: 0.15, j2HpDmg: 0.02, j2Spiral: 0.15 },
    craft: { ...D10, bonus: [{ j3GospelField: 1 }, { j3GospelHeal: 0.015, pierce: 0.25 }] },
  },
  // ⚜️ Paladin (Crusader -> Paladin): completes armor + offhand alongside class-gear.ts head + acc
  {
    id: 'cc_pl_plate', slot: 'armor', name: 'เกราะศักดิ์สิทธิ์ราชองครักษ์', icon: '⚜️', price: 0, slots: 1,
    jobs: CL, j2: ['crusader'], j3: ['paladin'], req: 'job3',
    desc: 'ของคราฟพาลาดิน · เกราะ: กำแพงราชองครักษ์ Banding ลดดาเมจ + Auto Guard สูงสุด',
    base: { vit: 8, wis: 6 },
    mod: { maxHp: 280, def: 26, mdef: 0.08, j2Guard: 0.04, j3Banding: 0.02 },
    craft: { ...D10, bonus: [{ j3Press: 0.25 }, { j3Inspire: 1, waveShield: 0.06 }] },
  },
  {
    id: 'cc_pl_shield', slot: 'offhand', name: 'โล่เทวทูตเพรสทีจ', icon: '🛡️', price: 0, slots: 1,
    jobs: CL, j2: ['crusader'], j3: ['paladin'], req: 'job3',
    desc: 'ของคราฟพาลาดิน · มือรอง: บล็อกแล้วฟาด Shield Press + สะท้อนดาเมจ + ฟื้น HP และได้โล่',
    base: { vit: 7, wis: 5, str: 3 },
    mod: { maxHp: 200, def: 24, j2Guard: 0.04, j3Press: 0.3, j2BlockShield: 0.04 },
    craft: { ...D10, bonus: [{ j3EarthDrive: 0.35 }, { j2Reflect: 0.08, j2BlockHeal: 0.02 }] },
  },
]

export const CLASS_CRAFT_ITEMS: Item[] = [
  ...JOB2_ARMORS,
  ...D7_CLASS_GEAR,
  ...D8_CLASS_GEAR,
  ...D9_CLASS_GEAR,
  ...JOB3_CRAFT_ITEMS,
]
