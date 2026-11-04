// ===== Post-wave events v2 (design/roadmap-and-events-v1.md). After every cleared wave except the boss, one event. =====
// Order of the roll:
//   1. Fortune meter (save.fortune, kept across runs) full? -> a JACKPOT, picked by the hero's LUK.
//   2. "Is it rare?" (hero eventChance: base 10%, +0.5%/LUK, cap 30%) -> RARE table, else COMMON table.
// Stat checks: some options roll a stat (STR / AGI / DEX / INT / WIS). LUK can stand in for any of them at lower odds.
// Everything here is pure data + pure functions; the scene side lives in scenes/battle-events.ts.

export type EventId =
  // common
  | 'camp' | 'chest' | 'shrine' | 'merchant' | 'spring' | 'slots' | 'cursed' | 'door' | 'trap' | 'runes' | 'blood' | 'fork' | 'traveler'
  // rare
  | 'goldchest' | 'fairy' | 'goldjellop' | 'goddess' | 'market' | 'ghost'
  // rare, พร v2 🌈 immortal cards (only while the run has none)
  | 'altar' | 'darkmirror' | 'nest'
  // jackpot (only from a full Fortune meter)
  | 'vault' | 'mimicking' | 'clover' | 'stars'
export type EventTier = 'common' | 'rare' | 'jackpot'
export interface EventDef {
  id: EventId; name: string; icon: string; desc: string; weight: number; tier: EventTier
  /** kept for the panel colour: rare and jackpot panels are gold */
  rare: boolean
  minTier?: number // dungeon tier needed (d1 = 1)
  minLuk?: number // jackpot only: LUK needed
}

const ev = (id: EventId, tier: EventTier, weight: number, icon: string, name: string, desc: string, extra: Partial<EventDef> = {}): EventDef =>
  ({ id, tier, weight, icon, name, desc, rare: tier !== 'common', ...extra })

export const EVENTS: EventDef[] = [
  // ----- common -----
  ev('camp', 'common', 18, '🏕️', 'กองไฟพักแรม', 'นั่งพักสักหน่อยไหม หรือจะซ้อมดาบต่อ?'),
  ev('chest', 'common', 18, '🎁', 'หีบไม้ข้างทาง', 'หีบเก่าๆ วางอยู่... หวังว่าจะไม่ใช่มิมิคนะ'),
  ev('shrine', 'common', 13, '⛩️', 'ศาลเจ้าเล็กๆ', 'ขอพรได้ 1 อย่าง (ติดตัวทั้งรอบนี้)'),
  ev('merchant', 'common', 11, '🧙', 'พ่อค้าเร่', 'ขายของด้วย zeny ที่เก็บมาในรอบนี้ (LUK สูง = ได้ส่วนลด)'),
  ev('spring', 'common', 10, '⛲', 'น้ำพุลึกลับ', 'น้ำเรืองแสงแปลกๆ ดื่มดีไหม? (LUK สูง = โชคดีบ่อยขึ้น)'),
  ev('slots', 'common', 11, '🎰', 'ตู้หมุนเจลล็อป', 'ตู้เสี่ยงโชคเก่าๆ หยอด zeny แล้วหมุน 3 ช่อง!'),
  ev('cursed', 'common', 9, '⚰️', 'หีบต้องสาป', 'ของในหีบส่องแสงม่วง... เปิดแล้วอาจติดคำสาปจนจบรอบ'),
  ev('door', 'common', 10, '🚪', 'ประตูหินปิดตาย', 'หลังประตูมีห้องลับ แต่มันหนักมาก'),
  ev('trap', 'common', 10, '🪤', 'ทางเดินกับดัก', 'มีของตกอยู่กลางทางเดินที่เต็มไปด้วยกับดัก'),
  ev('runes', 'common', 10, '📜', 'แท่นรูนโบราณ', 'อักษรโบราณเรืองแสง ถ้าอ่านออกจะได้พลังพิเศษ'),
  ev('blood', 'common', 7, '🩸', 'แท่นบูชาเลือด', 'ถวายเลือดเพื่อแลกพร... ไม่ลุ้น แลกกันตรงๆ'),
  ev('fork', 'common', 9, '🔀', 'ทางแยก', 'ทางซ้ายเงียบสงบ ทางขวามีเสียงคำราม (และกลิ่นสมบัติ)'),
  ev('traveler', 'common', 7, '🧑‍🦯', 'นักเดินทางบาดเจ็บ', 'มีคนนอนบาดเจ็บข้างทาง ช่วยเขาไหม?'),
  // ----- rare -----
  ev('goldchest', 'rare', 30, '🌟', 'หีบทองคำ', 'อีเวนต์หายาก! หีบทองส่องแสงวิบวับ มีลิ้นชักลับด้านล่างด้วย'),
  ev('fairy', 'rare', 25, '🧚', 'ภูตหลงทาง', 'อีเวนต์หายาก! ภูตน้อยมอบพรตำนานให้ 1 ใบ'),
  ev('goldjellop', 'rare', 25, '✨', 'เจลล็อปทองคำ', 'อีเวนต์หายาก! เจลล็อปทองวิ่งผ่านมา ตีให้แตกก่อนมันหนี!', { minTier: 2 }),
  ev('goddess', 'rare', 20, '🃏', 'เทพีแห่งโชค', 'อีเวนต์หายาก! การ์ดคว่ำ 3 ใบ เลือกได้ 1 ใบ (LUK สูง = แอบดูได้)', { minTier: 2 }),
  ev('market', 'rare', 15, '🕶️', 'ตลาดมืด', 'อีเวนต์หายาก! ของดีราคาแพง (LUK สูง = ต่อราคาได้)', { minTier: 3 }),
  ev('ghost', 'rare', 15, '👻', 'วิญญาณนักรบเร่ร่อน', 'อีเวนต์หายาก! วิญญาณขอดวลอีกครั้ง ชนะได้การ์ดของมัน', { minTier: 3 }),
  ev('altar', 'rare', 8, '👼', 'แท่นบูชาแสง', 'อีเวนต์หายาก! แสงสีรุ้งส่องลงมา... ถวายเครื่องบูชาเพื่อรับ 🌈 พรอมตะ', { minTier: 2 }),
  ev('darkmirror', 'rare', 8, '🪞', 'กระจกเงาปีศาจ', 'อีเวนต์หายาก! เงาในกระจกยิ้มให้... ยื่นมือเข้าไปเพื่อรับ 🌈 พรอมตะ', { minTier: 2 }),
  ev('nest', 'rare', 8, '🪺', 'รังนกยักษ์', 'อีเวนต์หายาก! มีไข่ทองคำในรังนกยักษ์ แต่แม่นกเฝ้าอยู่', { minTier: 2 }),
  // ----- jackpot (Fortune meter full; the best one the hero's LUK reaches) -----
  ev('vault', 'jackpot', 1, '🏦', 'ห้องสมบัติลับ', 'JACKPOT! มาตรดวงเต็ม เจอห้องสมบัติลับ เลือกได้ 2 อย่าง', { minLuk: 0 }),
  ev('mimicking', 'jackpot', 1, '👑', 'หีบมิมิคราชา', 'JACKPOT! หีบยักษ์มีมงกุฎ... มันขยับ! ชนะได้การ์ดแน่นอน', { minLuk: 20 }),
  ev('clover', 'jackpot', 1, '🍀', 'โคลเวอร์สี่แฉก', 'JACKPOT! โชคเข้าข้างสุดๆ ทั้งรอบนี้', { minLuk: 35 }),
  ev('stars', 'jackpot', 1, '🌠', 'ดาวเจ็ดดวงเรียงตัว 777', 'JACKPOT สูงสุด! ดวงดาวเรียงตัว พลังโชคล้นหลาม', { minLuk: 50 }),
]
export const eventById = (id: EventId) => EVENTS.find((e) => e.id === id)!

export const EVENT_RULES = {
  // ----- old numbers (kept) -----
  chestZeny: [8, 14] as [number, number], // x dungeon tier
  chestGemChance: 3, // x hero dropChance
  campHeal: 0.3, // share of max HP
  campXp: 7, // run EXP (towards the next 1-of-3 card)
  potionCost: 15, potionHeal: 0.4, // x tier
  cardCost: 30, // x tier: buy one 1-of-3 card pick
  springGood: 0.5, // + hero eventChance (LUK) = chance the spring is good
  springHeal: 0.5, springAtk: 4, // good: heal + P.ATK/M.ATK
  springHurt: 0.15, // bad: lose this share of max HP (never kills)
  goldGems: 2, goldZeny: [30, 40] as [number, number], // x tier
  // ----- v2 -----
  merchantLukOff: 0.006, merchantOffCap: 0.3, // price cut per LUK, cap
  mimicChance: 0.15, mimicLukCut: 0.015, mimicCutCap: 0.8, // wooden chest: 15% mimic, LUK cuts it (1.5%/LUK of the 15%, max 80% off)
  slotsCost: 10, // x tier
  slotsLukNudge: 20, // LUK needed for one free re-spin of a reel that does not match
  cursedZeny: 3, // x chest zeny
  curseHpCut: 0.15, curseMonDmg: 0.1, // the two curses
  doorZeny: 2, // x chest zeny, + 1 common material
  hurtShare: 0.1, // failed door: lose this share of max HP (never kills)
  trapPoison: 3, // failed trap: poison stacks at the start of the next wave
  runesSilence: 2, // failed runes: silenced hero turns at the start of the next wave
  bloodCost: 0.2, // share of max HP paid at the blood altar (never kills)
  forkElite: { hp: 1.35, dmg: 1.15 }, forkZeny: 3, // dangerous path: next wave elite, then zeny = forkZeny x chest zeny + 1 common material
  travelerCost: 0.15, travelerBoost: 0.5, // give HP: next event is rare with this chance (+ eventChance)
  goldJellopTurns: 5, goldJellopZeny: 5, // hero turns before it runs; zeny x chest zeny on a kill
  goddessPeekPer: 15, // every 15 LUK peeks at one face-down card (max 2)
  marketPerk: 75, marketCard: 140, marketCleanse: 40, // x tier
  ghostMul: { hp: 0.5, dmg: 0.7 }, ghostTurns: 16,
  eventFightLoss: 0.35, // a lost event fight costs at most this share of max HP, then the monster runs (never kills)
  mimicTurns: 12, kingTurns: 18,
  vaultZeny: 5, vaultGems: 3, vaultShield: 0.3,
  kingZeny: 5,
  cloverCheck: 0.2, // clover jackpot: + this to every check for the rest of the run
  starsGems: 5,
  altarZeny: 35, // x tier: offering at the light altar (or pass a WIS check)
  nestTurns: 12, nestHp: 1.5, // mother bird = event mimic numbers, HP x1.5
  gemCap: 8, // most gems events can give in one run
}

// ----- stat checks -----
export type CheckStat = 'str' | 'agi' | 'dex' | 'int' | 'wis' | 'luk'
export const CHECK = { base: 0.3, per: 0.015, lukBase: 0.15, lukPer: 0.012, cap: 0.95 }
export const CHECK_NAME: Record<CheckStat, string> = { str: 'STR', agi: 'AGI', dex: 'DEX', int: 'INT', wis: 'WIS', luk: '🍀 ดวง' }
/** Chance a stat check passes. LUK is the stand-in for any check, at lower odds. `bonus` = clover jackpot. */
export function checkChance(stat: CheckStat, value: number, bonus = 0): number {
  const c = stat === 'luk' ? CHECK.lukBase + CHECK.lukPer * value : CHECK.base + CHECK.per * value
  return Math.max(0.05, Math.min(CHECK.cap, c + bonus))
}

// ----- Fortune meter (kept across runs in save.fortune) -----
export const FORTUNE = { max: 100, perEvent: 5, perLuk: 0.3, failCheck: 15, risky: 10, minTier: 2 }
export const fortuneGain = (luk: number) => FORTUNE.perEvent + FORTUNE.perLuk * luk
/** The best jackpot this much LUK reaches. */
export function jackpotFor(luk: number): EventDef {
  return EVENTS.filter((e) => e.tier === 'jackpot' && luk >= (e.minLuk ?? 0)).sort((a, b) => (b.minLuk ?? 0) - (a.minLuk ?? 0))[0]
}
/** The next jackpot step above this LUK (for the hint text), if any. */
export function nextJackpot(luk: number): EventDef | undefined {
  return EVENTS.filter((e) => e.tier === 'jackpot' && luk < (e.minLuk ?? 0)).sort((a, b) => (a.minLuk ?? 0) - (b.minLuk ?? 0))[0]
}

// ----- slot machine -----
export const SLOT_FACES = ['🟢', '🪙', '⭐', '🍀', '💀'] as const
export type SlotFace = (typeof SLOT_FACES)[number]
/** What a spin pays: 3 of a kind beats 2 of a kind. */
export function slotsResult(r: SlotFace[]): 'gems' | 'legend' | 'jackpot' | 'curse' | 'pair' | 'none' {
  const [a, b, c] = r
  if (a === b && b === c) return a === '🟢' ? 'gems' : a === '💀' ? 'curse' : a === '🍀' ? 'jackpot' : 'legend'
  return a === b || b === c || a === c ? 'pair' : 'none'
}

/** Pick one event. `rareChance` = hero eventChance (+ boosts). Never the same event twice in a row. */
const IMMORTAL_EVENTS: EventId[] = ['altar', 'darkmirror', 'nest']
export function rollEvent(rareChance: number, tier: number, opts: { canShop: boolean; canSpin: boolean; canFork: boolean; canImmortal?: boolean; last?: EventId }, rnd = Math.random): EventDef {
  const want: EventTier = rnd() < rareChance ? 'rare' : 'common'
  const ok = (e: EventDef) => e.tier === want && (e.minTier ?? 1) <= tier && e.id !== opts.last
    && (opts.canShop || e.id !== 'merchant') && (opts.canSpin || e.id !== 'slots') && (opts.canFork || e.id !== 'fork')
    && (opts.canImmortal !== false || !IMMORTAL_EVENTS.includes(e.id))
  const pool = EVENTS.filter(ok)
  let r = rnd() * pool.reduce((a, e) => a + e.weight, 0)
  for (const e of pool) { r -= e.weight; if (r < 0) return e }
  return pool[pool.length - 1]
}

// ----- event monsters: stats by dungeon tier (index 1..5) -----
const MON_TABLE = {
  mimic: { hp: [60, 60, 150, 260, 330, 450], dmg: [10, 10, 20, 34, 36, 48], def: [0, 0, 10, 30, 30, 50] },
  mimicking: { hp: [360, 360, 900, 1560, 1980, 2700], dmg: [11, 11, 22, 37, 40, 53], def: [0, 0, 10, 30, 30, 50] },
  goldjellop: { hp: [100, 100, 200, 380, 520, 700], dmg: [0, 0, 0, 0, 0, 0], def: [0, 0, 0, 0, 0, 0] },
}
export type EventMonKind = keyof typeof MON_TABLE
export function eventMon(kind: EventMonKind, tier: number) {
  const t = Math.max(1, Math.min(5, tier)), m = MON_TABLE[kind]
  return { hp: m.hp[t], dmg: m.dmg[t], def: m.def[t] }
}
