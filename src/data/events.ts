// ===== Post-wave events (Capybara Go style): after every cleared wave except the boss, one event. =====
// The roll: first "is it rare?" (hero eventChance: base 10%, +0.5%/LUK, cap 30%), then a weighted pick
// inside that table. Design + reasoning: design/dungeon-2-and-events.md. All numbers live here.

export type EventId = 'camp' | 'chest' | 'shrine' | 'merchant' | 'spring' | 'goldchest' | 'fairy'
export interface EventDef { id: EventId; name: string; icon: string; desc: string; weight: number; rare: boolean }

export const EVENTS: EventDef[] = [
  { id: 'camp', name: 'กองไฟพักแรม', icon: '🏕️', desc: 'นั่งพักสักหน่อยไหม หรือจะซ้อมดาบต่อ?', weight: 25, rare: false },
  { id: 'chest', name: 'หีบไม้ข้างทาง', icon: '🎁', desc: 'หีบเก่าๆ วางอยู่ เปิดดูเลย!', weight: 25, rare: false },
  { id: 'shrine', name: 'ศาลเจ้าเล็กๆ', icon: '⛩️', desc: 'ขอพรได้ 1 อย่าง (ติดตัวทั้งรอบนี้)', weight: 20, rare: false },
  { id: 'merchant', name: 'พ่อค้าเร่', icon: '🧙', desc: 'ขายของด้วย zeny ที่เก็บมาในรอบนี้', weight: 15, rare: false },
  { id: 'spring', name: 'น้ำพุลึกลับ', icon: '⛲', desc: 'น้ำเรืองแสงแปลกๆ ดื่มดีไหม? (LUK สูง = โชคดีบ่อยขึ้น)', weight: 15, rare: false },
  { id: 'goldchest', name: 'หีบทองคำ', icon: '🌟', desc: 'อีเวนต์หายาก! หีบทองส่องแสงวิบวับ', weight: 60, rare: true },
  { id: 'fairy', name: 'ภูตหลงทาง', icon: '🧚', desc: 'อีเวนต์หายาก! ภูตน้อยมอบพรตำนานให้ 1 ใบ', weight: 40, rare: true },
]

export const EVENT_RULES = {
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
}

/** Pick one event. `rareChance` = hero eventChance; merchant is skipped when the run has too little zeny. */
export function rollEvent(rareChance: number, canShop: boolean, rnd = Math.random): EventDef {
  const rare = rnd() < rareChance
  const pool = EVENTS.filter((e) => e.rare === rare && (canShop || e.id !== 'merchant'))
  let r = rnd() * pool.reduce((a, e) => a + e.weight, 0)
  for (const e of pool) { r -= e.weight; if (r < 0) return e }
  return pool[pool.length - 1]
}
