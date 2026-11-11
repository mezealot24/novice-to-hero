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
  },
]

export const UNIQUE3_ITEMS: Item[] = [
  ...PALADIN_UNIQUES,
  ...LORDKNIGHT_UNIQUES,
  ...AWAKEN_UNIQUES,
]

export const UNIQUE3_DROPS: Record<Job3Id, string[]> = {
  paladin: ['u_pl_aegiscrown', 'u_pl_sanctumplate', 'u_pl_gospelrelic', 'u_c3_awakencrown', 'u_c3_awakenplate', 'u_c3_awakenring'],
  lordknight: ['u_lk_dragonhelm', 'u_lk_dragonscale', 'u_lk_warmedal', 'u_c3_awakencrown', 'u_c3_awakenplate', 'u_c3_awakenring'],
  champion: ['u_c3_awakencrown', 'u_c3_awakenplate', 'u_c3_awakenring'],
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
