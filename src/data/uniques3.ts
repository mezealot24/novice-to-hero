// ===== 3rd Job "Awakening" Unique Items (data/uniques3.ts) =====
// Unique headgear, armor, and accessories for 3rd Job Awakening classes (Paladin, Lord Knight, and shared Awakening).
// - Unique items follow the unique rules: max 2 equipped at once (save.ts), price 0 (not sold in shop),
//   refinable up to grade ★5 using D10 materials (matDungeon = 'd10').
// - Locked to 3rd Job via `req: 'job3'` and class locks (`j3`, `jobs`).
// - Item ids are save data: never rename or remove one.

import type { Item } from './meta'
import type { Job3Id } from './jobs3'
import type { UniqueDrop } from './uniques'
import { UNIQUE } from './uniques'
import { matOf } from './materials'
import { HELL_MODE } from './hell'

// ⚜️ Paladin (Crusader Awakening): holy tank, block, Gospel Cross, Shield Press, Banding
export const PALADIN_UNIQUES: Item[] = [
  {
    id: 'u_pl_aegiscrown',
    slot: 'head',
    name: 'มงกุฎแสงพระวรสาร',
    icon: '👑',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    jobs: ['cleric'],
    j2: ['crusader'],
    j3: ['paladin'],
    req: 'job3',
    desc: 'ยูนีคพาลาดิน · หมวก: พระวรสารฮีลแรงขึ้น บล็อกสวนแรงด้วย Shield Press แต่ฟันช้าลงนิด',
    base: { vit: 8, wis: 6 },
    mod: { maxHp: 200, def: 18, mdef: 0.08, j3GospelHeal: 0.015, j3Press: 0.35, aspd: -0.08 },
    pct: { maxHp: 0.10 },
  },
  {
    id: 'u_pl_sanctumplate',
    slot: 'armor',
    name: 'เกราะศักดิ์สิทธิ์กำแพงสวรรค์',
    icon: '🛡️',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    jobs: ['cleric'],
    j2: ['crusader'],
    j3: ['paladin'],
    req: 'job3',
    desc: 'ยูนีคพาลาดิน · เกราะ: Banding ลดดาเมจเข้มข้น โล่สะท้อนหนาม และได้รับโล่ต้นเวฟ',
    base: { vit: 10, wis: 5 },
    mod: { maxHp: 300, def: 28, mdef: 0.06, j3Banding: 0.03, waveShield: 0.06, thorns: 0.25, flee: -10 },
    pct: { maxHp: 0.15 },
    effects: [{ id: 'guardian_pulse', power: 0.14, cd: 2 }],
  },
  {
    id: 'u_pl_gospelrelic',
    slot: 'acc',
    name: 'ตราสารพระวรสารนิรันดร์',
    icon: '📿',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    jobs: ['cleric'],
    j2: ['crusader'],
    j3: ['paladin'],
    req: 'job3',
    desc: 'ยูนีคพาลาดิน · เครื่องประดับ: พรหลัง Grand Cross รุนแรง ฮีลเกินเป็นโล่ บล็อกแล้วฮีล',
    base: { wis: 8, vit: 6, str: 4 },
    mod: { maxHp: 160, healAmp: 0.20, overhealShield: 1, j3AfterBless: 0.08, j2BlockHeal: 0.02 },
    conversions: [{ from: 'def', to: 'matk', ratio: 0.35, cap: 140, label: '35% P.DEF → M.ATK (สูงสุด +140)' }],
  },
]

// 🐉 Lord Knight (Knight Awakening): spear master, Hundred Spear, Aura Blade, dragon force
export const LORDKNIGHT_UNIQUES: Item[] = [
  {
    id: 'u_lk_dragonhelm',
    slot: 'head',
    name: 'หมวกมังกรสงครามอัศวินราชัน',
    icon: '🐲',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    jobs: ['swordsman'],
    j2: ['knight'],
    j3: ['lordknight'],
    req: 'job3',
    desc: 'ยูนีคทัพหน้า · หมวก: Hundred Spear แทงเพิ่ม 1 ฮิต ทะลวงเกราะ แต่เสียหลบหลีก',
    base: { str: 8, vit: 6 },
    mod: { atk: 25, maxHp: 180, def: 16, hit: 15, j3GospelField: 1, j2Spiral: 0.15, flee: -12 },
    pct: { maxHp: 0.08 },
  },
  {
    id: 'u_lk_dragonscale',
    slot: 'armor',
    name: 'เกราะเกล็ดมังกรโบราณ',
    icon: '🐉',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    jobs: ['swordsman'],
    j2: ['knight'],
    j3: ['lordknight'],
    req: 'job3',
    desc: 'ยูนีคทัพหน้า · เกราะ: ถึกทนดั่งภูผา สกิลหอกบวกดาเมจ HP รุนแรง ลดดาเมจตามจำนวนมอน',
    base: { vit: 10, str: 6 },
    mod: { maxHp: 320, def: 26, tenacity: 0.15, j2HpDmg: 0.015, j3Banding: 0.02, counter: 0.08, aspd: -0.06 },
    pct: { maxHp: 0.15 },
    conversions: [{ from: 'maxHp', to: 'atk', ratio: 0.025, cap: 150, label: '2.5% Max HP → P.ATK (สูงสุด +150)' }],
  },
  {
    id: 'u_lk_warmedal',
    slot: 'acc',
    name: 'เหรียญเกียรติยศศึกมังกรคลั่ง',
    icon: '🏅',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    jobs: ['swordsman'],
    j2: ['knight'],
    j3: ['lordknight'],
    req: 'job3',
    desc: 'ยูนีคทัพหน้า · เครื่องประดับ: Hundred Spear ดูดเลือด พรหลังศึกแรง ชาร์จเปิดเวฟรุนแรง',
    base: { str: 7, vit: 5, dex: 4 },
    mod: { atk: 20, maxHp: 150, crit: 0.05, critMul: 0.15, j3GospelHeal: 0.015, j3AfterBless: 0.08, j2Charge: 0.30 },
    effects: [{ id: 'echo_double', power: 0.6, chance: 0.35, cd: 2 }],
  },
]

// ✨ Shared Awakening Uniques: usable by any 3rd job hero
export const AWAKEN_UNIQUES: Item[] = [
  {
    id: 'u_c3_awakencrown',
    slot: 'head',
    name: 'มงกุฎแห่งการตื่นรู้',
    icon: '✨',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    req: 'job3',
    desc: 'ยูนีคผู้ตื่นรู้ · หมวก: เสริมสถานะรอบด้าน คริหนัก และได้รับพรหลังศึก',
    base: { str: 3, agi: 3, vit: 3, int: 3, dex: 3, luk: 3, wis: 3 },
    mod: { maxHp: 160, def: 12, mdef: 0.05, crit: 0.04, critMul: 0.15, j3AfterBless: 0.05 },
  },
  {
    id: 'u_c3_awakenplate',
    slot: 'armor',
    name: 'เกราะพิทักษ์ผู้ตื่นรู้',
    icon: '🥋',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    req: 'job3',
    desc: 'ยูนีคผู้ตื่นรู้ · เกราะ: HP มหาศาล ต้านทานสถานะ และลดดาเมจตามจำนวนศัตรู',
    base: { vit: 8 },
    mod: { maxHp: 250, def: 22, mdef: 0.06, j3Banding: 0.02, tenacity: 0.10 },
    pct: { maxHp: 0.12 },
  },
  {
    id: 'u_c3_awakenring',
    slot: 'acc',
    name: 'แหวนผนึกจิตตื่นรู้',
    icon: '💍',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    req: 'job3',
    desc: 'ยูนีคผู้ตื่นรู้ · เครื่องประดับ: พลังโจมตีสองสาย Ult ดูดเลือด ฮีลแรง และดูดเวท',
    base: { str: 2, agi: 2, vit: 2, int: 2, dex: 2, luk: 2, wis: 2 },
    mod: { maxHp: 120, atk: 15, matk: 15, j3GospelHeal: 0.01, healAmp: 0.10, spellVamp: 0.08 },
    effects: [{ id: 'spellblade', power: 0.75, cd: 1 }],
  },
]

// 🪶 Ranger (Beastmaster Awakening): Falcon + Warg + Primal Stampede D10 uniques
export const RANGER_UNIQUES: Item[] = [
  {
    id: 'u_rn_falconberet',
    slot: 'head',
    name: 'หมวกขนนกเหยี่ยวราชัน',
    icon: '🦅',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    jobs: ['archer'],
    j2: ['beastmaster'],
    j3: ['ranger'],
    req: 'job3',
    desc: 'ยูนีคเรนเจอร์ · หมวก: Primal Stampede เพิ่มรอบ โฉบเหยี่ยวและพรหลังศึกแรงขึ้น แต่ DEF ลดลงนิด',
    base: { int: 7, luk: 7, dex: 4 },
    mod: { matk: 26, hit: 18, crit: 0.05, j3GospelField: 1, j2HawkMul: 0.20, j3AfterBless: 0.06, def: -8 },
    pct: { maxHp: 0.06 },
  },
  {
    id: 'u_rn_primalhide',
    slot: 'armor',
    name: 'เกราะหนังสัตว์บรรพกาล',
    icon: '🐺',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    jobs: ['archer'],
    j2: ['beastmaster'],
    j3: ['ranger'],
    req: 'job3',
    desc: 'ยูนีคเรนเจอร์ · เกราะ: สัตว์ทุกตัวและหมาป่าไวขึ้น Banding หนา แต่ Hit ลดลงนิด',
    base: { vit: 8, agi: 6, str: 4 },
    mod: { maxHp: 260, def: 22, flee: 14, j2PetPow: 0.18, j3Banding: 0.02, j2WolfSpeed: 0.12, hit: -10 },
    pct: { maxHp: 0.12 },
  },
  {
    id: 'u_rn_wildheart',
    slot: 'acc',
    name: 'หัวใจแห่งพงไพรนิรันดร์',
    icon: '🌿',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    jobs: ['archer'],
    j2: ['beastmaster'],
    j3: ['ranger'],
    req: 'job3',
    desc: 'ยูนีคเรนเจอร์ · เครื่องประดับ: Primal Stampede ฮีลแรง ฟื้น Energy เมื่อสัตว์ลงมือ แต่ Energy สูงสุดลดลงนิด',
    base: { luk: 6, int: 5, agi: 5, dex: 4 },
    mod: { atk: 18, matk: 18, critMul: 0.18, j3GospelHeal: 0.015, j3AfterBless: 0.08, j2Charge: 0.25, j2PetRes: 1, maxRes: -10 },
  },
]

export const UNIQUE3_ITEMS: Item[] = [
  ...PALADIN_UNIQUES,
  ...LORDKNIGHT_UNIQUES,
  ...RANGER_UNIQUES,
  ...AWAKEN_UNIQUES,
]

// 🪓 Warlord (Berserker Awakening): Tryndamere Undying Fury + PoE Warlord Carnage
export const WARLORD_UNIQUES: Item[] = [
  {
    id: 'u_wl_bloodcrown',
    slot: 'head',
    name: 'มงกุฎราชันย์คลั่งไร้พ่าย',
    icon: '🪓',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    jobs: ['swordsman'],
    j2: ['berserker'],
    j3: ['warlord'],
    req: 'job3',
    desc: 'ยูนีค Warlord · หมวก: Frenzy สูงสุด +2 ดาเมจคริและเจาะเกราะแรงขึ้น เพิ่มอมตะ +1 เทิร์น · P.DEF ลดเล็กน้อย',
    base: { str: 8, vit: 6, agi: 5 },
    mod: { atk: 24, crit: 0.06, critMul: 0.2, physPen: 0.1, j2FrenzyMax: 2, j3GospelField: 1, def: -8 },
  },
  {
    id: 'u_wl_carnageplate',
    slot: 'armor',
    name: 'เกราะกระหายเลือดแอสเปกต์',
    icon: '🩸',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    jobs: ['swordsman'],
    j2: ['berserker'],
    j3: ['warlord'],
    req: 'job3',
    desc: 'ยูนีค Warlord · เกราะ: แรงตอนเลือดน้อย Banding ลดดาเมจ จบอมตะฮีลแรงและดูดเลือดสูง · Flee ลด',
    base: { vit: 10, str: 6 },
    mod: { maxHp: 300, def: 22, lifesteal: 0.06, j2LowHp: 0.25, j3Banding: 0.02, j3GospelHeal: 0.04, flee: -12 },
    pct: { maxHp: 0.12 },
  },
  {
    id: 'u_wl_undyingcharm',
    slot: 'acc',
    name: 'ตราคำรามจ้าวสงคราม',
    icon: '📣',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    jobs: ['swordsman'],
    j2: ['berserker'],
    j3: ['warlord'],
    req: 'job3',
    desc: 'ยูนีค Warlord · เครื่องประดับ: เติม Rage ไว ดวลบอสคริแรง จบ Ult ดาเมจพุ่ง และเพิ่มคริต่อขั้น Frenzy',
    base: { str: 7, agi: 6, vit: 4 },
    mod: { atk: 20, crit: 0.05, rageGain: 0.25, j2BossCrit: 0.18, j3AfterBless: 0.08, j3WlBlitz: 0.01 },
  },
]

// 🥊 Champion (Monk Awakening): combo blitz, thunder orb & Asura burst
export const CHAMPION_UNIQUES: Item[] = [
  {
    id: 'u_ch_asuracrown',
    slot: 'head',
    name: 'มงกุฎหมัดอาชูร่าทลายฟ้า',
    icon: '🥊',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    jobs: ['cleric'],
    j2: ['monk'],
    j3: ['champion'],
    req: 'job3',
    desc: 'ยูนีคแชมเปี้ยน · หมวก: อาชูร่าและคอมโบแรงขึ้น เจาะเกราะกายภาพ เบิ้ลตีซ้ำ · P.DEF ลดเล็กน้อย',
    base: { str: 8, agi: 6, int: 4 },
    mod: { atk: 24, combo: 0.1, comboDmg: 0.2, physPen: 0.1, j2AsuraPow: 0.2, j2ThunderAtk: 0.15, def: -8 },
    effects: [{ id: 'echo_double', power: 0.65, chance: 0.35, cd: 2 }],
  },
  {
    id: 'u_ch_ironrobe',
    slot: 'armor',
    name: 'จีวรเหล็กกังวาน',
    icon: '🥋',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    jobs: ['cleric'],
    j2: ['monk'],
    j3: ['champion'],
    req: 'job3',
    desc: 'ยูนีคแชมเปี้ยน · เกราะ: แปลง 45% P.DEF เป็น P.ATK เสริมระฆังเหล็กและ M.DEF เป็นดาเมจ · Flee ลด',
    base: { vit: 9, wis: 6 },
    mod: { maxHp: 280, def: 24, mdef: 0.08, j2BellMdef: 0.06, j2MdefDmg: 0.35, j2GritRate: 0.05, flee: -10 },
    pct: { maxHp: 0.12 },
    conversions: [{ from: 'def', to: 'atk', ratio: 0.45, cap: 160, label: '45% P.DEF → P.ATK (สูงสุด +160)' }],
  },
  {
    id: 'u_ch_spiritband',
    slot: 'acc',
    name: 'ลูกประคำปราณอัสนี',
    icon: '📿',
    price: 0,
    slots: 1,
    unique: { dg: 'd10' },
    jobs: ['cleric'],
    j2: ['monk'],
    j3: ['champion'],
    req: 'job3',
    desc: 'ยูนีคแชมเปี้ยน · เครื่องประดับ: ลูกพลัง +2 ลูก คอมโบชิ่งสายฟ้าและพรหลังศึก',
    base: { agi: 7, str: 6, wis: 5 },
    mod: { atk: 18, maxRes: 30, aspd: 0.15, crit: 0.06, j2ChargeMax: 2, j2ComboRamp: 0.06, j3AfterBless: 0.06 },
    effects: [{ id: 'chain_lightning', power: 0.55, chance: 0.3 }],
  },
]

// 🌟 Creative Cross-Class Endgame Uniques (D11-D13 & Rift)
export const CREATIVE_UNIQUES: Item[] = [
  {
    id: 'u_c3_mjollnir',
    slot: 'head',
    name: 'มงกุฎสายฟ้าโยลเนียร์',
    icon: '⚡',
    price: 0,
    slots: 1,
    unique: { dg: 'd11' },
    req: 'job3',
    setId: 'mjollnir_tempest',
    desc: 'ยูนีค D11 · หมวกทุกอาชีพขั้น 3: สายฟ้าชิ่ง + คริร่ายเวท · Max HP ลดลง',
    base: { int: 7, agi: 6, luk: 5 },
    mod: { elemDmg: 0.22, crit: 0.06, spellCrit: 0.08, maxHp: -120 },
    effects: [
      { id: 'chain_lightning', power: 0.7, chance: 0.4 },
      { id: 'coc_cast', power: 0.8, chance: 0.4, cd: 1 },
    ],
  },
  {
    id: 'u_c3_heartsteel',
    slot: 'armor',
    name: 'เกราะหัวใจเหล็กอมตะ',
    icon: '🛡️',
    price: 0,
    slots: 1,
    unique: { dg: 'd12' },
    req: 'job3',
    setId: 'heartsteel_juggernaut',
    desc: 'ยูนีค D12 · เกราะทุกอาชีพขั้น 3: แปลง Max HP เป็น P.ATK พร้อมคลื่นโล่สเกล HP · Flee ลด',
    base: { vit: 12, str: 5 },
    mod: { maxHp: 500, def: 38, shieldAmp: 0.2, counter: 0.1, flee: -14 },
    pct: { maxHp: 0.16 },
    conversions: [{ from: 'maxHp', to: 'atk', ratio: 0.035, cap: 240, label: '3.5% Max HP → P.ATK (สูงสุด +240)' }],
    effects: [{ id: 'guardian_pulse', power: 0.24, cd: 2 }],
  },
  {
    id: 'u_c3_trinity',
    slot: 'acc',
    name: 'ตรามหาตรีเอกานุภาพ',
    icon: '⚔️',
    price: 0,
    slots: 1,
    unique: { dg: 'd13' },
    req: 'job3',
    setId: 'trinity_spellblade',
    desc: 'ยูนีค D13 · เครื่องประดับทุกอาชีพขั้น 3: Spellblade ฟาดแรงสุดขีด + เจาะเกราะสองสาย · P.DEF ลด',
    base: { str: 6, int: 6, agi: 6 },
    mod: { atk: 28, matk: 28, aspd: 0.16, physPen: 0.1, magPen: 0.1, def: -10 },
    effects: [{ id: 'spellblade', power: 1.15, cd: 1 }],
  },
  {
    id: 'u_c3_voidprism',
    slot: 'acc',
    name: 'ปริซึมอนันต์รอยแยก',
    icon: '🕳️',
    price: 0,
    slots: 1,
    unique: { dg: 'rift' },
    req: 'job3',
    setId: 'void_riftweaver',
    desc: 'ยูนีค Rift · เครื่องประดับทุกอาชีพขั้น 3: แปลง Max Mana เป็นดาเมจธาตุ + ฉีกเกราะศัตรู',
    base: { int: 9, dex: 7, wis: 6 },
    mod: { matk: 34, maxRes: 60, physPen: 0.14, magPen: 0.14, elemDmg: 0.2, tenacity: -0.05 },
    conversions: [{ from: 'maxRes', to: 'elemDmg', ratio: 0.002, cap: 0.35, label: '0.2% Max Mana → ดาเมจธาตุ (สูงสุด +35%)' }],
    effects: [
      { id: 'void_sunder', power: 0.35, cd: 1 },
      { id: 'mana_overload', power: 0.3, threshold: 0.6 },
    ],
  },
]

export const ALL_UNIQUE3_ITEMS: Item[] = [
  ...UNIQUE3_ITEMS,
  ...CHAMPION_UNIQUES,
  ...WARLORD_UNIQUES,
  ...CREATIVE_UNIQUES,
]

export const UNIQUE3_DROPS: Record<Job3Id, string[]> = {
  paladin: ['u_pl_aegiscrown', 'u_pl_sanctumplate', 'u_pl_gospelrelic', 'u_c3_awakencrown', 'u_c3_awakenplate', 'u_c3_awakenring'],
  lordknight: ['u_lk_dragonhelm', 'u_lk_dragonscale', 'u_lk_warmedal', 'u_c3_awakencrown', 'u_c3_awakenplate', 'u_c3_awakenring'],
  champion: ['u_ch_asuracrown', 'u_ch_ironrobe', 'u_ch_spiritband', 'u_c3_awakencrown', 'u_c3_awakenplate', 'u_c3_awakenring'],
  ranger: ['u_rn_falconberet', 'u_rn_primalhide', 'u_rn_wildheart', 'u_c3_awakencrown', 'u_c3_awakenplate', 'u_c3_awakenring'],
  warlord: ['u_wl_bloodcrown', 'u_wl_carnageplate', 'u_wl_undyingcharm', 'u_c3_awakencrown', 'u_c3_awakenplate', 'u_c3_awakenring'],
  professor: ['u_c3_awakencrown', 'u_c3_awakenplate', 'u_c3_awakenring'], // 🎓 MVP: shared Awakening set only (own uniques = later)
  stalker: ['u_c3_awakencrown', 'u_c3_awakenplate', 'u_c3_awakenring'], // MVP: shared Awakening set only (own uniques = later)
  kingpin: ['u_c3_awakencrown', 'u_c3_awakenplate', 'u_c3_awakenring'], // MVP: shared Awakening set only (own uniques = later)
  highwizard: ['u_c3_awakencrown', 'u_c3_awakenplate', 'u_c3_awakenring'], // MVP: shared Awakening set only (own uniques = later)
  mechanic: ['u_c3_awakencrown', 'u_c3_awakenplate', 'u_c3_awakenring'], // MVP: shared Awakening set only (own uniques = later)
}

/** Roll drop for 3rd Job uniques at D10.
 * A duplicate pays D10 boss materials (4 pcs), identical to standard unique drops. */
export function rollUnique3Drop(
  job3: Job3Id | undefined,
  hard: boolean | 'hell',
  owned: readonly string[],
  rnd: () => number = Math.random
): UniqueDrop {
  if (!job3) return { kind: 'none' }
  const pool = UNIQUE3_DROPS[job3]
  if (!pool?.length || rnd() >= (hard === 'hell' ? HELL_MODE.uniqueRate : hard ? UNIQUE.dropRateHard : UNIQUE.dropRate)) {
    return { kind: 'none' }
  }
  const id = pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))]
  return owned.includes(id) ? { kind: 'dupe', id, mats: { [matOf('d10', true)]: UNIQUE.dupeBoss } } : { kind: 'new', id }
}

/** Roll drop for endgame D10-D13 / Rift uniques. Delegates D10 to rollUnique3Drop and D11-D13/Rift to CREATIVE_UNIQUES. */
export function rollEndgameUniqueDrop(
  dg: string,
  job3: Job3Id | undefined,
  hard: boolean | 'hell',
  owned: readonly string[],
  rnd: () => number = Math.random
): UniqueDrop {
  if (dg === 'd10') return rollUnique3Drop(job3, hard, owned, rnd)
  const pool = CREATIVE_UNIQUES.filter((u) => u.unique?.dg === dg).map((u) => u.id)
  const rate = hard === 'hell' ? HELL_MODE.uniqueRate : hard ? UNIQUE.dropRateHard : UNIQUE.dropRate
  if (!pool.length || rnd() >= rate) return { kind: 'none' }
  const id = pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))]
  return owned.includes(id)
    ? { kind: 'dupe', id, mats: { [matOf(dg, true)]: UNIQUE.dupeBoss } }
    : { kind: 'new', id }
}
