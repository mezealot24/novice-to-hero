// Forge: craft dungeon gear from materials, and raise any item's grade (design/item-acquisition-v1.md).
// Crafting and grade-ups always succeed. Gems are never used here (refine + gem repair come in phase 2).
// Crafted item ids are save data: never rename or remove one.
import type { Stats } from './game-data'
import type { JobId } from './jobs'
import type { BaseStat, Item } from './meta'
import { matOf } from './materials'

/** Recipe + grade bonuses of a crafted item. Recipe unlocks after the first win over `dg`'s boss. */
export interface CraftInfo { dg: string; common: number; boss: number; zeny: number; bonus: [Partial<Stats>, Partial<Stats>] }

export const GRADE = {
  max: 5,
  names: ['', 'ธรรมดา', 'ขัดเงา', 'ชำนาญ', 'ปรมาจารย์', 'ตำนาน'],
  colors: ['#ffffff', '#e8e6f5', '#7fe39a', '#6fc6ff', '#c08cff', '#ffb347'],
  pct: [0, 0, 0.15, 0.3, 0.45, 0.6], // whole-item stat bonus at each grade
  /** cost to reach grade n, in the item's own dungeon materials */
  cost: { 2: { common: 3, boss: 0, zeny: 100 }, 3: { common: 6, boss: 1, zeny: 250 }, 4: { common: 10, boss: 2, zeny: 500 }, 5: { common: 15, boss: 4, zeny: 1000 } } as Record<number, { common: number; boss: number; zeny: number }>,
  slotAt: 4, // grade 4+: one more card slot...
  slotMax: 2, // ...up to this many per item
  bonusAt: [3, 5], // crafted items unlock bonus 1 / 2 here
}

// Stats that grow with grade. Flags, counts and the luck/economy stats stay as they are.
const SCALES = new Set<keyof Stats>(['maxHp', 'atk', 'matk', 'pskill', 'def', 'mdef', 'tenacity', 'healAmp', 'shieldAmp', 'hit', 'flee', 'maxRes', 'resRegen', 'aspd', 'crit', 'spellCrit', 'critMul', 'guard', 'lifesteal', 'regen', 'counter', 'combo', 'dodgeHeal', 'waveShield', 'debuffRes', 'poisonDmg', 'burnDps'])

const FLAT = new Set<keyof Stats>(['maxHp', 'atk', 'matk', 'def', 'hit', 'flee', 'maxRes'])
const SW: JobId[] = ['swordsman'], AR: JobId[] = ['archer'], MG: JobId[] = ['mage'], CL: JobId[] = ['cleric'], TH: JobId[] = ['thief']
const ALL7 = (n: number) => ({ str: n, vit: n, wis: n, dex: n, int: n, luk: n, agi: n })

/** Forge-only gear. Price 0 = not sold in the shop. */
export const CRAFT_ITEMS: Item[] = [
  // ----- d1 ทุ่งเจลล็อป -----
  { id: 'c_jellring', slot: 'acc', name: 'แหวนเมือกใส', icon: '💧', price: 0, slots: 1, desc: 'ตีจากเมือกเจลล็อป ฟื้นตัวทุกเทิร์น', base: { vit: 1 }, mod: { maxHp: 40, regen: 0.3 },
    craft: { dg: 'd1', common: 8, boss: 2, zeny: 200, bonus: [{ waveShield: 0.03 }, { regen: 0.3, tenacity: 0.05 }] } },
  { id: 'c_jellcoat', slot: 'armor', name: 'เสื้อคลุมเยลลี่', icon: '🫧', price: 0, slots: 1, desc: 'นุ่มแต่หนึบ กันได้ทั้งกายภาพและเวท', base: { vit: 2 }, mod: { maxHp: 60, def: 10, mdef: 0.05 },
    craft: { dg: 'd1', common: 8, boss: 2, zeny: 250, bonus: [{ tenacity: 0.06 }, { regen: 0.4, maxHp: 30 }] } },
  { id: 'c_jellhood', slot: 'head', name: 'หมวกเมือกใส', icon: '🪼', price: 0, slots: 1, desc: 'หมวกหนึบ ๆ กันเวทได้นิด', mod: { maxHp: 30, mdef: 0.03 },
    craft: { dg: 'd1', common: 6, boss: 2, zeny: 200, bonus: [{ waveShield: 0.03 }, { regen: 0.3 }] } },
  // ----- d2 ป่าหมาป่าเงา -----
  { id: 'c_moonfur', slot: 'armor', name: 'ผ้าคลุมขนเงาจันทร์', icon: '🌙', price: 0, slots: 1, desc: 'เบา หลบง่าย', base: { agi: 3 }, mod: { maxHp: 60, def: 6, flee: 8 },
    craft: { dg: 'd2', common: 10, boss: 2, zeny: 500, bonus: [{ dodgeHeal: 0.02 }, { combo: 0.05 }] } },
  { id: 'c_alphaclaw', slot: 'acc', name: 'กำไลกรงเล็บจ่าฝูง', icon: '🐾', price: 0, slots: 1, desc: 'คมเหมือนกรงเล็บ คริบ่อย', base: { str: 2, dex: 2 }, mod: { atk: 4, crit: 0.03 },
    craft: { dg: 'd2', common: 10, boss: 3, zeny: 600, bonus: [{ critMul: 0.1 }, { combo: 0.03, crit: 0.02 }] } },
  { id: 'c_moonshield', slot: 'offhand', name: 'โล่ขนเงาจันทร์', icon: '🛡️', price: 0, slots: 1, desc: 'โล่บุขนหมาป่า สวนกลับบ่อย', base: { vit: 2 }, mod: { maxHp: 40, def: 8 }, jobs: ['swordsman', 'cleric'],
    craft: { dg: 'd2', common: 10, boss: 2, zeny: 600, bonus: [{ counter: 0.06 }, { ctrAoe: 1 }] } },
  { id: 'c_moonquiver', slot: 'offhand', name: 'กระบอกธนูเงาจันทร์', icon: '🌒', price: 0, slots: 1, desc: 'ลูกธนูคมเงียบ แม่นขึ้น', base: { dex: 2 }, mod: { hit: 8 }, jobs: AR,
    craft: { dg: 'd2', common: 10, boss: 2, zeny: 600, bonus: [{ crit: 0.04 }, { critMul: 0.2 }] } },
  // ----- d3 ซากป้อมวีรชน: one weapon per class -----
  { id: 'c_herosword', slot: 'weapon', name: 'ดาบตราวีรชน', icon: '⚔️', price: 0, slots: 2, desc: 'ดาบของวีรชนในป้อม ฟันหนัก', base: { str: 6 }, mod: { atk: 17, pskill: 0.1 }, jobs: SW,
    craft: { dg: 'd3', common: 12, boss: 3, zeny: 900, bonus: [{ lifesteal: 0.04 }, { berserk: 1 }] } },
  { id: 'c_sealbow', wtype: 'bow', slot: 'weapon', name: 'ธนูตราผนึก', icon: '🏹', price: 0, slots: 2, desc: 'แม่น คริแรง', base: { dex: 6 }, mod: { atk: 13, hit: 6, crit: 0.04 }, jobs: AR,
    craft: { dg: 'd3', common: 12, boss: 3, zeny: 900, bonus: [{ critMul: 0.15 }, { pierce: 0.25 }] } },
  { id: 'c_sealstaff', wtype: 'staff', slot: 'weapon', name: 'คทาผนึกวิญญาณ', icon: '🔮', price: 0, slots: 2, desc: 'เวทแรง Mana ฟื้นไว', base: { int: 6 }, mod: { matk: 20, resRegen: 1 }, jobs: MG,
    craft: { dg: 'd3', common: 12, boss: 3, zeny: 900, bonus: [{ spellCrit: 0.05 }, { mgUltAmp: 0.15 }] } },
  { id: 'c_dawnmace', wtype: 'mace', slot: 'weapon', name: 'คทาแสงอรุณ', icon: '🌅', price: 0, slots: 2, desc: 'ทุบแรง ฮีลแรง โล่หนา', base: { str: 3, wis: 3 }, mod: { atk: 16, matk: 12, healAmp: 0.18 }, jobs: CL,
    craft: { dg: 'd3', common: 12, boss: 3, zeny: 900, bonus: [{ shieldAmp: 0.1 }, { overhealShield: 1 }] } },
  { id: 'c_rustfang', wtype: 'dagger', slot: 'weapon', name: 'มีดสนิมเงา', icon: '🗡️', price: 0, slots: 2, desc: 'แทงรัว พิษติด', base: { agi: 6 }, mod: { atk: 11, combo: 0.08, poison: 1 }, jobs: TH,
    craft: { dg: 'd3', common: 12, boss: 3, zeny: 900, bonus: [{ dodgeHeal: 0.02 }, { poisonAmp: 0.15 }] } },
  { id: 'c_sealorb', slot: 'offhand', name: 'ลูกแก้วตราผนึก', icon: '💠', price: 0, slots: 1, desc: 'ลูกแก้วผนึกวิญญาณ เวทแรง', base: { int: 3 }, mod: { matk: 8, maxRes: 10 }, jobs: MG,
    craft: { dg: 'd3', common: 12, boss: 3, zeny: 900, bonus: [{ resRegen: 1 }, { spellCrit: 0.05 }] } },
  // ----- d4 บึงพิษมรกต -----
  { id: 'c_emeraldmail', slot: 'armor', name: 'เสื้อเกล็ดมรกต', icon: '🐊', price: 0, slots: 1, desc: 'ถึก กันพิษ', base: { vit: 4 }, mod: { maxHp: 140, def: 10, debuffRes: 0.15 },
    craft: { dg: 'd4', common: 14, boss: 3, zeny: 1500, bonus: [{ regen: 0.5 }, { debuffRes: 0.15, waveShield: 0.05 }] } },
  { id: 'c_venomgauche', wtype: 'dagger', slot: 'offhand', name: 'มีดปัดเกล็ดหนอง', icon: '🪡', price: 0, slots: 1, desc: 'ปัดป้องแล้วแทงพิษ', base: { agi: 2 }, mod: { flee: 8 }, jobs: TH,
    craft: { dg: 'd4', common: 14, boss: 3, zeny: 1500, bonus: [{ poison: 1 }, { dodgeHeal: 0.03 }] } },
  // ----- d5 บัลลังก์อเวจี -----
  { id: 'c_lichring', slot: 'acc', name: 'แหวนผลึกลิช', icon: '💀', price: 0, slots: 1, desc: 'ทุกค่าสถานะ +3 ท่าไม้ตายแรงขึ้น', base: ALL7(3), mod: { maxHp: 30 },
    craft: { dg: 'd5', common: 16, boss: 4, zeny: 2500, bonus: [{ ultAmp: 0.15 }, { smashCd: -1500 }] } },
]

/** Highest grade an item can reach: starters 1, plain shop gear 3, class shop gear 4, dungeon + crafted gear 5. */
export function gradeCap(it: Item): number {
  if (it.craft || (it.req && it.req !== 'job')) return 5
  if (it.price === 0) return 1
  if (it.jobs || it.req === 'job') return 4
  return 3
}
/** Which dungeon's materials an item uses for grade-ups. */
export const matDungeon = (it: Item) => it.craft?.dg ?? (it.req && it.req !== 'job' ? it.req : 'd1')
/** Materials + zeny to raise `it` from grade g-1 to g. */
export function gradeCost(it: Item, g: number) {
  const c = GRADE.cost[g], dg = matDungeon(it)
  return { mats: { [matOf(dg, false)]: c.common, ...(c.boss ? { [matOf(dg, true)]: c.boss } : {}) } as Record<string, number>, zeny: c.zeny }
}
export function craftCost(it: Item) {
  const c = it.craft!
  return { mats: { [matOf(c.dg, false)]: c.common, [matOf(c.dg, true)]: c.boss } as Record<string, number>, zeny: c.zeny }
}

const r3 = (n: number) => Math.round(n * 1000) / 1000

// ---------- refine +1..+10 (phase 2, design 3.5 / 3.5.1 / 3.6) ----------
/** Refine rules. Gems only ever repair (Q 2026-11-03): never rate, break protection, mats, fodder or rerolls. */
export const REFINE = {
  max: 10,
  pct: 0.05, // whole-item stats per +, added to the grade % (grade 5 +10 = x2.1)
  rate: [1, 1, 1, 1, 1, 0.7, 0.55, 0.4, 0.3, 0.2, 0.12], // success chance to reach +n (index n)
  pity: 0.1, // +10% per failed try in a row on the same item (reset on success)
  lineAt: [5, 7, 10], // first time at these + : one random bonus line (small / mid / big)
  gemsAt: { 7: 5, 10: 15 } as Record<number, number>, // free gems, first time per item id, ever
  repairGems: 10,
  goldRate: 0.1, // a line comes out gold this often...
  goldMul: 1.5, // ...worth this much more
  // Zeny fee per try climbs every step (Q 2026-11-04 "แพงขึ้นเรื่อยๆ ต่อขั้น"): fee(n) = feeBase x feeGrowth^(n-1), rounded to 5z.
  // 25 35 50 70 95 135 190 265 370 515. Expected total incl. fodder + repairs (sim, weapon): +5 ~500z (2-3 ดัน3 runs),
  // +7 ~1.2k, +10 ~8.7k (late game; the old flat 10/20/40 x n table was ~7.3k with a jump at +8).
  feeBase: 25,
  feeGrowth: 1.4,
  repairFee: 0.5, // material repair also costs this share of the fee for the item's current +
}
/** Zeny fee for one try at +n. */
export const refineFee = (n: number) => (n <= 0 ? 0 : Math.round((REFINE.feeBase * REFINE.feeGrowth ** (n - 1)) / 5) * 5)
/** Starter gear and the empty slots can't be refined; crafted gear (price 0) can. */
export const refinable = (it: Item) => it.price > 0 || !!it.craft
/** Chance to reach +n after `pity` fails in a row. */
export const refineRate = (n: number, pity = 0) => Math.min(1, (REFINE.rate[n] ?? 0) + pity * REFINE.pity)

/** One random bonus line from refining. `stat` is a base stat, a Stats key, or hpPct / atkPct / matkPct. */
export interface RefineLine { stat: string; val: number; gold?: 1 }
const PCT_LINE: Record<string, 'maxHp' | 'atk' | 'matk'> = { hpPct: 'maxHp', atkPct: 'atk', matkPct: 'matk' }
const BASE_KEYS = new Set(['str', 'vit', 'wis', 'dex', 'int', 'luk', 'agi'])

/** The item as worn: grade + refine scale its positive stats, crafted bonuses join at grade 3 / 5, refine lines add on top (unscaled). */
export function forgeItem(it: Item, g = 1, r = 0, lines: RefineLine[] = []): Item {
  g = Math.max(1, Math.min(gradeCap(it), g))
  r = refinable(it) ? Math.max(0, Math.min(REFINE.max, r)) : 0
  if (g <= 1 && r <= 0 && !lines.length) return it
  const k = (100 + Math.round(GRADE.pct[g] * 100) + Math.round(r * REFINE.pct * 100)) / 100 // whole percents: 1+.15+.15 must be 1.3, not 1.2999…
  const base: Partial<Record<BaseStat, number>> = {}
  for (const [s, v] of Object.entries(it.base ?? {}) as [BaseStat, number][]) base[s] = v > 0 ? Math.round(r3(v * k)) : v
  const mod: Partial<Stats> = {}
  for (const [s, v] of Object.entries(it.mod) as [keyof Stats, number][]) mod[s] = SCALES.has(s) && v > 0 ? (FLAT.has(s) ? Math.round(r3(v * k)) : r3(v * k)) : v
  if (it.craft) it.craft.bonus.forEach((b, i) => { if (g >= GRADE.bonusAt[i]) for (const [s, v] of Object.entries(b) as [keyof Stats, number][]) mod[s] = r3((mod[s] ?? 0) + v) })
  const pct: NonNullable<Item['pct']> = { ...(it.pct ?? {}) }
  for (const l of lines) {
    if (!l) continue
    if (BASE_KEYS.has(l.stat)) base[l.stat as BaseStat] = (base[l.stat as BaseStat] ?? 0) + l.val
    else if (PCT_LINE[l.stat]) pct[PCT_LINE[l.stat]] = r3((pct[PCT_LINE[l.stat]] ?? 0) + l.val)
    else mod[l.stat as keyof Stats] = r3((mod[l.stat as keyof Stats] ?? 0) + l.val)
  }
  return { ...it, base, mod, ...(Object.keys(pct).length ? { pct } : {}) }
}
/** The item as worn at grade g (no refine). */
export const gradeItem = (it: Item, g = 1) => forgeItem(it, g)
/** "★2/5" */
export const gradeStars = (g: number, cap: number) => `★${g}/${cap}`
