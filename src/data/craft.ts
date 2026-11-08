// Forge: craft dungeon gear from materials, and raise any item's grade (design/item-acquisition-v1.md).
// Crafting and grade-ups always succeed. Gems are never used here (refine + gem repair come in phase 2).
// Crafted item ids are save data: never rename or remove one.
import type { Stats } from './game-data'
import type { JobId } from './jobs'
import type { BaseStat, Item } from './meta'
import { matOf } from './materials'

/** Recipe + grade bonuses of a crafted item. Recipe unlocks after the first win over `dg`'s boss. */
export interface CraftInfo {
  dg: string; common: number; boss: number; zeny: number; bonus: [Partial<Stats>, Partial<Stats>]
  /** Cardforge (v98): bag cards eaten by the recipe, by card id. */
  cards?: Record<string, number>
  /** Cardforge signature: added AFTER grade / refine scaling and never scaled itself (so ★5 +10 gives the same sig as ★1). */
  sig?: Partial<Stats>
}

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
  { id: 'c_jellcoat', slot: 'armor', name: 'เสื้อคลุมเยลลี่', icon: '💧', price: 0, slots: 1, desc: 'นุ่มแต่หนึบ กันได้ทั้งกายภาพและเวท', base: { vit: 2 }, mod: { maxHp: 60, def: 10, mdef: 0.05 },
    craft: { dg: 'd1', common: 8, boss: 2, zeny: 250, bonus: [{ tenacity: 0.06 }, { regen: 0.4, maxHp: 30 }] } },
  { id: 'c_jellhood', slot: 'head', name: 'หมวกเมือกใส', icon: '🐙', price: 0, slots: 1, desc: 'หมวกหนึบ ๆ กันเวทได้นิด', mod: { maxHp: 30, mdef: 0.03 },
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
  { id: 'c_venomgauche', wtype: 'dagger', slot: 'offhand', name: 'มีดปัดเกล็ดหนอง', icon: '🧵', price: 0, slots: 1, desc: 'ปัดป้องแล้วแทงพิษ', base: { agi: 2 }, mod: { flee: 8 }, jobs: TH,
    craft: { dg: 'd4', common: 14, boss: 3, zeny: 1500, bonus: [{ poison: 1 }, { dodgeHeal: 0.03 }] } },
  // ----- d5 บัลลังก์อเวจี -----
  { id: 'c_lichring', slot: 'acc', name: 'แหวนผลึกลิช', icon: '💀', price: 0, slots: 1, desc: 'ทุกค่าสถานะ +3 ท่าไม้ตายแรงขึ้น', base: ALL7(3), mod: { maxHp: 30 },
    craft: { dg: 'd5', common: 16, boss: 4, zeny: 2500, bonus: [{ ultAmp: 0.15 }, { smashCd: -1500 }] } },
  // ----- 2nd Jobs Crafted Gear (d5 บัลลังก์อเวจี) -----
  { id: 'c_berserkcleaver', wtype: 'twohand', slot: 'weapon', name: 'ขวานสังหารโลหิตคลั่ง', icon: '🪓', price: 0, twoHand: true, slots: 2,
    desc: 'ของคราฟอาชีพขั้น 2 · อาวุธ 2 มือ (เบอร์เซิร์กเกอร์): Frenzy สูงสุด +2 · คริแรง · ดาเมจสกิลกายภาพ +15%',
    base: { str: 8, agi: 3 }, mod: { atk: 28, crit: 0.08, aspd: -0.05, pskill: 0.15, j2FrenzyMax: 2 }, jobs: SW, req: 'job2',
    craft: { dg: 'd5', common: 18, boss: 4, zeny: 2500, bonus: [{ critMul: 0.2 }, { lifesteal: 0.04, j2Duel: 0.1 }] } },
  { id: 'c_dragonspear', wtype: 'spear', slot: 'weapon', name: 'หอกทะลวงมังกร', icon: '🔱', price: 0, slots: 2,
    desc: 'ของคราฟอาชีพขั้น 2 · หอก (อัศวิน): ถึกเป็นแรง เพิ่มดาเมจสกิลหอกตาม Max HP · เจาะเกราะและแม่นยำ',
    base: { str: 4, vit: 6 }, mod: { atk: 22, maxHp: 80, hit: 10, pskill: 0.12, j2HpDmg: 0.02 }, jobs: SW, req: 'job2',
    craft: { dg: 'd5', common: 18, boss: 4, zeny: 2500, bonus: [{ j2PierceHits: 1 }, { pierce: 0.3, def: 10 }] } },
  { id: 'c_shadowdaggers', wtype: 'dagger', slot: 'weapon', name: 'กริชเงาพันเล่ม', icon: '🗡️', price: 0, slots: 2,
    desc: 'ของคราฟอาชีพขั้น 2 · มีด (โร้ก): คอมโบติดรัว ปามีดบินแรงขึ้น +25% · มีดบิน +1 เล่มทุกการปา',
    base: { agi: 7, luk: 4 }, mod: { atk: 16, combo: 0.12, crit: 0.06, j2KnifeMul: 0.25, j2KnifeAdd: 1 }, jobs: TH, req: 'job2',
    craft: { dg: 'd5', common: 18, boss: 4, zeny: 2500, bonus: [{ critMul: 0.2 }, { combo: 0.06, dodgeHeal: 0.03 }] } },
  { id: 'c_blackledger', wtype: 'dagger', slot: 'offhand', name: 'สมุดบัญชีเลือด', icon: '🩸', price: 0, slots: 2,
    desc: 'ของคราฟอาชีพขั้น 2 · มือรอง (มาเฟีย): พิษแรง stack สูง · เกณฑ์ปลิดชีพ Execute เพิ่ม +4% HP',
    base: { str: 4, int: 5, luk: 3 }, mod: { atk: 10, poison: 1, poisonDmg: 2, poisonCap: 3, j2ExecAdd: 0.04, debuffRes: 0.15 }, jobs: TH, req: 'job2',
    craft: { dg: 'd5', common: 18, boss: 4, zeny: 2500, bonus: [{ vsPoison: 0.1 }, { j2DebuffTurns: 1, poisonSpread: 1 }] } },
  { id: 'c_paladinblade', wtype: 'sword', slot: 'weapon', name: 'ดาบพิทักษ์วิสุทธิ์', icon: '✝️', price: 0, slots: 2,
    desc: 'ของคราฟอาชีพขั้น 2 · ดาบ 1 มือ (ครูเซเดอร์): STR+VIT+INT กางเขนแรง +15% · บล็อกได้เกราะ +5% HP',
    base: { str: 5, vit: 5, int: 5 }, mod: { atk: 20, matk: 18, def: 10, j2CrossAdd: 0.15, j2Guard: 0.04, j2BlockShield: 0.05 }, jobs: CL, req: 'job2',
    craft: { dg: 'd5', common: 18, boss: 4, zeny: 2500, bonus: [{ j2CrossAdd: 0.1, spellVamp: 0.05 }, { j2PayCut: 0.15, def: 12 }] } },
  { id: 'c_vajraknuckle', wtype: 'fist', slot: 'weapon', name: 'สนับมือวชิระอัสนี', icon: '🥊', price: 0, slots: 2,
    desc: 'ของคราฟอาชีพขั้น 2 · สนับมือ (มังค์): ต่อยไว คอมโบรัว · สะสมลูกพลังได้สูงสุด +2 ลูก และสายฟ้าแรง +15%/ลูก',
    base: { agi: 6, str: 4, wis: 3 }, mod: { atk: 20, aspd: 0.2, combo: 0.12, matk: 14, j2ChargeMax: 2, j2ThunderPer: 0.15 }, jobs: CL, req: 'job2',
    craft: { dg: 'd5', common: 18, boss: 4, zeny: 2500, bonus: [{ combo: 0.06, crit: 0.04 }, { critMul: 0.2, lifesteal: 0.03 }] } },
  { id: 'c_archonstaff', wtype: 'staff', slot: 'weapon', name: 'คทามหาจอมเวทพายุ', icon: '🌩️', price: 0, slots: 2,
    desc: 'ของคราฟอาชีพขั้น 2 · ไม้เท้า (วิซาร์ด): เวทแรงจัด Mana มหาศาล · Storm Gust แรงขึ้น +25% ต่อฮิต',
    base: { int: 9, wis: 4 }, mod: { matk: 36, maxRes: 30, resRegen: 2, spellCrit: 0.06, j2GustMul: 0.25 }, jobs: MG, req: 'job2',
    craft: { dg: 'd5', common: 18, boss: 4, zeny: 2500, bonus: [{ mgUltAmp: 0.25 }, { spellCrit: 0.08, mdef: 0.08 }] } },
  { id: 'c_elementalgrimoire', wtype: 'book', slot: 'weapon', name: 'คัมภีร์ธาตุบรรจบ', icon: '📖', price: 0, slots: 2,
    desc: 'ของคราฟอาชีพขั้น 2 · หนังสือ (เซจ): ผสานฟันและเวท · โอกาส Auto Spell +10% · Auto Spell ยิง +1 ลูก',
    base: { int: 6, str: 6, dex: 3 }, mod: { atk: 22, matk: 24, maxRes: 20, aspd: 0.1, j2AutoChance: 0.1, j2AutoBolts: 1 }, jobs: MG, req: 'job2',
    craft: { dg: 'd5', common: 18, boss: 4, zeny: 2500, bonus: [{ j2EndowAmp: 0.2 }, { spellCrit: 0.06, counter: 0.08 }] } },
  { id: 'c_beastlordbow', wtype: 'bow', slot: 'weapon', name: 'ธนูราชันพงไพร', icon: '🏹', price: 0, slots: 2,
    desc: 'ของคราฟอาชีพขั้น 2 · ธนู (บีสต์มาสเตอร์): แม่นยำสูง ยิงไว · พลังโจมตีของสัตว์เลี้ยงทุกตัวแรงขึ้น +20%',
    base: { dex: 7, luk: 5, agi: 4 }, mod: { atk: 24, hit: 14, crit: 0.06, aspd: 0.1, j2PetPow: 0.2 }, jobs: AR, req: 'job2',
    craft: { dg: 'd5', common: 18, boss: 4, zeny: 2500, bonus: [{ j2HawkMul: 0.25 }, { critMul: 0.2, hit: 10 }] } },
  { id: 'c_clockworkcrossbow', wtype: 'bow', slot: 'weapon', name: 'หน้าไม้กลจักรพันกลอง', icon: '🔧', price: 0, slots: 2,
    desc: 'ของคราฟอาชีพขั้น 2 · ธนู (อินโนเวเตอร์): อัจฉริยะนักประดิษฐ์ · ดาเมจกับดักแรง +25% · น้ำหนักของหายากในกล่องสุ่ม x1.5',
    base: { dex: 6, luk: 8 }, mod: { atk: 24, crit: 0.08, critMul: 0.15, hit: 10, j2TrapMul: 0.25, j2BoxLuck: 0.5 }, jobs: AR, req: 'job2',
    craft: { dg: 'd5', common: 18, boss: 4, zeny: 2500, bonus: [{ dropChance: 0.06, crit: 0.05 }, { smashCd: -1500, critMul: 0.25 }] } },
]

/** Highest grade an item can reach: starters 1, plain shop gear 3, class shop gear 4, dungeon + crafted gear 5. */
export function gradeCap(it: Item): number {
  if (it.craft || it.unique || (it.req && it.req !== 'job')) return 5
  if (it.price === 0) return 1
  if (it.jobs || it.req === 'job') return 4
  return 3
}
/** Which dungeon's materials an item uses for grade-ups. */
// v114 fix: `req: 'job2'` is not a dungeon id (it built the unobtainable m_job2 / b_job2). 2nd-job gear uses D5 mats, the dungeon that unlocks the 2nd job (JOB2_RULES.unlockClear).
const REQ_DG: Partial<Record<NonNullable<Item['req']>, string>> = { job2: 'd5' }
export const matDungeon = (it: Item) => it.craft?.dg ?? it.unique?.dg ?? (it.req && it.req !== 'job' ? REQ_DG[it.req] ?? it.req : 'd1')
/** v114 (Q 2026-11-08): 2nd-job gear climbs the deep dungeons step by step, so it is not cheap on D5 mats alone.
 * refine = by refine tier (+1-4 / +5-7 / +8-10), grade = by target ★, reroll = by line count (lines exist from +5). */
export interface StepMats { refine: string[]; grade: Record<number, string>; reroll: string[] }
export const JOB2_MATS: StepMats = { refine: ['d5', 'd7', 'd9'], grade: { 2: 'd5', 3: 'd6', 4: 'd8', 5: 'd10' }, reroll: ['d7', 'd9'] }
/** v116 (Q 2026-11-08 "เมือกใสหายาก late game"): 1st-class shop gear (cap ★4) used D1 mats at every step, and D1 is the only
 * source of them. It now climbs D1 -> D3 -> D5 like 2nd-job gear (D3 / D5 also drop in the tower). */
export const JOB_MATS: StepMats = { refine: ['d1', 'd3', 'd5'], grade: { 2: 'd1', 3: 'd3', 4: 'd5' }, reroll: ['d3', 'd5'] }
const stepMats = (it: Item): StepMats | null => {
  if (it.craft || it.unique) return null
  if (it.req === 'job2') return JOB2_MATS
  if (it.req === 'job' || (it.jobs && !it.req)) return JOB_MATS
  return null
}
/** Dungeon whose mats a refine of tier `tier` (0..2) uses. */
export const refineDungeon = (it: Item, tier: number) => stepMats(it)?.refine[Math.max(0, Math.min(2, tier))] ?? matDungeon(it)
/** Dungeon whose mats grade-up to ★g uses. */
export const gradeDungeon = (it: Item, g: number) => stepMats(it)?.grade[g] ?? matDungeon(it)
/** Dungeon whose mats an option reroll over `lines` lines uses. */
export const rerollDungeon = (it: Item, lines: number) => stepMats(it)?.reroll[lines >= 2 ? 1 : 0] ?? matDungeon(it)
/** Materials + zeny to raise `it` from grade g-1 to g. */
export function gradeCost(it: Item, g: number) {
  const c = GRADE.cost[g], dg = gradeDungeon(it, g)
  return { mats: { [matOf(dg, false)]: c.common, ...(c.boss ? { [matOf(dg, true)]: c.boss } : {}) } as Record<string, number>, zeny: c.zeny }
}
export function craftCost(it: Item) {
  const c = it.craft!
  return { mats: { [matOf(c.dg, false)]: c.common, [matOf(c.dg, true)]: c.boss } as Record<string, number>, zeny: c.zeny }
}

const r3 = (n: number) => Math.round(n * 1000) / 1000

// ---------- refine +1..+10 (phase 2, design 3.5 / 3.5.1 / 3.6) ----------
/** Refine rules. Gems only ever repair (Q 2026-11-03): never rate, break protection, mats, fodder or rerolls.
 * Two exceptions: (1) Q 2026-11-06, gems lock a bonus line during a reroll (the roll itself is always zeny + mats);
 * (2) Q 2026-11-07, gems skip Endless Tower floors (data/modes.ts TOWER.skipGems), a pure time-saver that pays nothing. */
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
  // Option gacha (Q 2026-11-06, zeny sink): one roll rerolls EVERY unlocked line at once and the new lines stay (no keep-old).
  rerollZeny: [1000, 1000, 1000], // zeny per line the item has, summed: 1000 / 2000 / 3000 (Q 2026-11-08: flat 1000 per line)
  rerollMats: [[4, 0], [6, 1], [8, 2]] as [number, number][], // [common, boss] of the item's biggest line only
  rerollStep: 0.1, // zeny +10% for every roll already made on this item...
  rerollMaxMul: 3, // ...up to x3 (kept until the item leaves the bag)
  lockGems: [10, 30], // gems per roll for the 1st / 2nd locked line; the last line can never be locked
}
/** Zeny fee for one try at +n. */
export const refineFee = (n: number) => (n <= 0 ? 0 : Math.round((REFINE.feeBase * REFINE.feeGrowth ** (n - 1)) / 5) * 5)
/** Zeny multiplier on the refine fee (Q 2026-11-08): 2nd-job (class 2) weapons cost x10 per try. */
export const REFINE_J2_WEAPON_MUL = 10
export const refineFeeMul = (it: Item) => (it.slot === 'weapon' && it.req === 'job2' ? REFINE_J2_WEAPON_MUL : 1)
/** Starter gear and the empty slots can't be refined; crafted gear (price 0) can. */
export const refinable = (it: Item) => it.price > 0 || !!it.craft || !!it.unique
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
  if (g <= 1 && r <= 0 && !lines.length && !it.craft?.sig) return it
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
  if (it.craft?.sig) for (const [s, v] of Object.entries(it.craft.sig) as [keyof Stats, number][]) mod[s] = r3((mod[s] ?? 0) + v) // v98 Cardforge signature: not scaled
  return { ...it, base, mod, ...(Object.keys(pct).length ? { pct } : {}) }
}
/** The item as worn at grade g (no refine). */
export const gradeItem = (it: Item, g = 1) => forgeItem(it, g)
/** "★2/5" */
export const gradeStars = (g: number, cap: number) => `★${g}/${cap}`
