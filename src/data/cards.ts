// RO-style monster cards (design/equipment-cards.md). Every monster drops its own card; cards are kept
// forever and slot into gear (weapon / armor / accessory cards fit only that slot type). Card ids are save
// data: never rename or remove one. Effects use the same `base` + `mod` shape as items, plus `pct` for
// the few "% of max HP / ATK" cards (applied after everything else is added up).
import { MONSTERS, type MonsterKind, type Stats } from './game-data'
import type { BaseStat, Slot } from './meta'

export type CardTier = 'normal' | 'mini' | 'boss'
export interface CardPct { maxHp?: number; atk?: number; matk?: number }
export interface EquipCard {
  id: string; monster: MonsterKind; slot: Slot; tier: CardTier; dungeon: string; base?: Partial<Record<BaseStat, number>>; mod: Partial<Stats>; pct?: CardPct
  /** second card of a monster: class-oriented, own name, drops less often (CARD_RULES.v2Rate / v2Pity) */
  v2?: boolean; name?: string; forJobs?: string
}

export const CARD_RULES = {
  rate: { normal: 0.015, mini: 0.08, boss: 0.05 } as Record<CardTier, number>,
  pity: { normal: 80, mini: 12, boss: 20 } as Record<CardTier, number>, // kills of that monster without its card -> guaranteed
  sell: { normal: 30, mini: 150, boss: 300 } as Record<CardTier, number>,
  v2Rate: 0.5, // second cards drop at half the rate...
  v2Pity: 1.5, // ...and need 1.5x the kills for the guarantee
}
export const TIER_NAME: Record<CardTier, string> = { normal: 'การ์ด', mini: 'การ์ดมินิบอส', boss: 'การ์ด MVP' }
export const TIER_COLOR: Record<CardTier, string> = { normal: '#c9c9d6', mini: '#b48cff', boss: '#f2b84b' }

const c2 = (monster: MonsterKind, slot: Slot, tier: CardTier, dungeon: string, name: string, forJobs: string, mod: Partial<Stats>, base?: Partial<Record<BaseStat, number>>, pct?: CardPct): EquipCard =>
  ({ id: `card2_${monster}`, monster, slot, tier, dungeon, mod, base, pct, v2: true, name, forJobs })
const c = (id: string, monster: MonsterKind, slot: Slot, tier: CardTier, dungeon: string, mod: Partial<Stats>, base?: Partial<Record<BaseStat, number>>, pct?: CardPct): EquipCard =>
  ({ id, monster, slot, tier, dungeon, mod, base, pct })

// v63 (Q 2026-11-04 grill): 8 weak / duplicate lines swapped for พร v2 numbers at ~1/2 of the card's level 1
// (frostgiant guard→chillWeak, hellknight atk→basicDmg, wraith dodgeHeal→vsChill, drainer resRegen→resTurn,
//  imp combo→vsBurn (pairs with wisp² ignite), toad² poisonDmg→vsPoison, turtleguard² def→counterDmg, necropriest² spearMul→spearShield).
export const EQUIP_CARDS: EquipCard[] = [
  // ----- d1 ทุ่งเจลล็อป -----
  c('card_jellop', 'jellop', 'armor', 'normal', 'd1', { maxHp: 40 }),
  c('card_wolf', 'wolf', 'weapon', 'normal', 'd1', { atk: 4, hit: 3 }),
  c('card_king', 'king', 'armor', 'boss', 'd1', { regen: 0.67, flee: -5 }, undefined, { maxHp: 0.12 }),
  // ----- d2 ป่าหมาป่าเงา -----
  c('card_bat', 'bat', 'weapon', 'normal', 'd2', { lifesteal: 0.02 }),
  c('card_shroom', 'shroom', 'armor', 'normal', 'd2', { mdef: 0.05, regen: 0.33 }),
  c('card_boar', 'boar', 'armor', 'normal', 'd2', { def: 6 }, { vit: 1 }),
  c('card_shadowwolf', 'shadowwolf', 'acc', 'normal', 'd2', { flee: 4 }, { agi: 2 }),
  c('card_alpha', 'alpha', 'weapon', 'boss', 'd2', { combo: 0.1, crit: 0.04, guard: -0.05 }),
  // ----- d3 ซากป้อมวีรชน -----
  c('card_skeleton', 'skeleton', 'weapon', 'normal', 'd3', { pskill: 0.06 }, { str: 1 }),
  c('card_wisp', 'wisp', 'weapon', 'normal', 'd3', { matk: 6 }, { int: 1 }),
  c('card_gargoyle', 'gargoyle', 'armor', 'normal', 'd3', { guard: 0.05, flee: -3 }),
  c('card_duelist', 'duelist', 'acc', 'mini', 'd3', { counter: 0.1, hit: 5 }),
  c('card_hunter', 'hunter', 'weapon', 'mini', 'd3', { lifesteal: 0.08 }, undefined, { maxHp: -0.08 }),
  c('card_gunner', 'gunner', 'acc', 'mini', 'd3', { crit: 0.05 }, { dex: 3 }),
  c('card_drainer', 'drainer', 'acc', 'mini', 'd3', { maxRes: 20, resTurn: 1 }),
  c('card_deathknight', 'deathknight', 'armor', 'boss', 'd3', { waveShield: 0.08, def: 5, aspd: -0.1 }),
  // ----- d4 บึงพิษมรกต -----
  c('card_toad', 'toad', 'weapon', 'normal', 'd4', { poison: 1 }),
  c('card_lizardshaman', 'lizardshaman', 'acc', 'normal', 'd4', { healAmp: 0.08, shieldAmp: 0.08 }),
  c('card_hornet', 'hornet', 'weapon', 'normal', 'd4', { hit: 8, crit: 0.03 }),
  c('card_turtleguard', 'turtleguard', 'armor', 'normal', 'd4', { def: 8, tenacity: 0.06 }),
  c('card_bloater', 'bloater', 'armor', 'normal', 'd4', { maxHp: 70 }),
  c('card_venomqueen', 'venomqueen', 'weapon', 'mini', 'd4', { poisonDmg: 2, hit: -5 }),
  c('card_frostgiant', 'frostgiant', 'armor', 'mini', 'd4', { mdef: 0.1, chillWeak: 0.08 }, { agi: -3 }),
  c('card_hydra', 'hydra', 'weapon', 'boss', 'd4', { healAmp: -0.1 }, undefined, { atk: 0.08, matk: 0.08 }),
  // ----- d5 บัลลังก์อเวจี -----
  c('card_hellknight', 'hellknight', 'weapon', 'normal', 'd5', { basicDmg: 0.1 }, { str: 1 }),
  c('card_imp', 'imp', 'acc', 'normal', 'd5', { vsBurn: 0.08 }),
  c('card_hexwitch', 'hexwitch', 'weapon', 'normal', 'd5', { matk: 9, spellCrit: 0.03 }),
  c('card_necropriest', 'necropriest', 'armor', 'normal', 'd5', { regen: 0.67, healAmp: 0.06 }),
  c('card_wraith', 'wraith', 'armor', 'normal', 'd5', { flee: 8, vsChill: 0.08 }),
  c('card_mirage', 'mirage', 'acc', 'mini', 'd5', { luckyDodge: 0.04 }, { luk: 3 }),
  c('card_warlord', 'warlord', 'weapon', 'mini', 'd5', { crit: 0.05, def: -6 }, { str: 4 }),
  c('card_lich', 'lich', 'acc', 'boss', 'd5', { revive: 1 }, undefined, { maxHp: -0.1 }),

  // ===== second cards: one per monster, aimed at a class (design/equipment-cards.md §10) =====
  // ----- d1 -----
  c2('jellop', 'acc', 'normal', 'd1', 'เจลมานา', '🔮จอมเวท ✨นักบวช', { maxRes: 8, resRegen: 0.5 }),
  c2('wolf', 'armor', 'normal', 'd1', 'ฝีเท้าหมาป่า', '🏹นักธนู 🗡️โจร', { aspd: 0.08 }, { agi: 1 }),
  c2('king', 'weapon', 'boss', 'd1', 'มงกุฎเจลเคลือบ', '✨นักบวช', { matk: 5, healShield: 0.15, aspd: -0.08 }),
  // ----- d2 -----
  c2('bat', 'acc', 'normal', 'd2', 'เสียงสะท้อนค้างคาว', '🏹นักธนู 🗡️โจร', { dodgeEnergy: 6, flee: 2 }),
  c2('shroom', 'weapon', 'normal', 'd2', 'สปอร์เวทแตก', '🔮จอมเวท ✨นักบวช', { spellCrit: 0.03 }, { int: 1 }),
  c2('boar', 'weapon', 'normal', 'd2', 'เขี้ยวพุ่งสวน', '⚔️นักดาบ', { counterRage: 6, counter: 0.03 }),
  c2('shadowwolf', 'armor', 'normal', 'd2', 'เงาหมาป่าพลิ้ว', '🗡️โจร 🏹นักธนู', { flee: 3, dodgeHeal: 0.015 }, { agi: 1 }),
  c2('alpha', 'acc', 'boss', 'd2', 'เขี้ยวเวทจันทร์ดับ', '🔮จอมเวท', { mgUltAmp: 0.12, maxRes: -10 }),
  // ----- d3 -----
  c2('skeleton', 'acc', 'normal', 'd3', 'กระดูกร้าว', '🏹นักธนู 🗡️โจร', { critMul: 0.12 }),
  c2('wisp', 'armor', 'normal', 'd3', 'เปลวผีติดตัว', '🔮จอมเวท (สายไฟ)', { burnDps: 4 }),
  c2('gargoyle', 'armor', 'normal', 'd3', 'ผิวหินหนาม', '⚔️นักดาบ ✨นักบวช', { thorns: 0.1, shieldAmp: 0.03 }),
  c2('duelist', 'weapon', 'mini', 'd3', 'จันทราแสง', '✨นักบวช (สาย INT)', { holyCounter: 1, counter: 0.08, mdef: -0.05 }),
  c2('hunter', 'armor', 'mini', 'd3', 'เลือดคลั่ง', '⚔️นักดาบ', { rageGain: 0.15, startRage: 8 }, undefined, { maxHp: -0.05 }),
  c2('gunner', 'weapon', 'mini', 'd3', 'จรวดเจาะเกราะ', '🏹นักธนู', { pierce: 0.25, arUltBreak: 0.15, combo: -0.05 }),
  c2('drainer', 'armor', 'mini', 'd3', 'ขนกาดำดูดมานา', '🔮จอมเวท', { mgUltMana: 12, mdef: -0.05 }),
  c2('deathknight', 'weapon', 'boss', 'd3', 'ดาบอัศวินมรณะ', '⚔️นักดาบ (ult แรงขึ้นทุกสายกายภาพ)', { ultAmp: 0.15, ultShieldAdd: 0.04 }, undefined, { maxHp: -0.08 }),
  // ----- d4 -----
  c2('toad', 'armor', 'normal', 'd4', 'เมือกพิษ', '🗡️โจร', { ultPoison: 1, vsPoison: 0.1 }),
  c2('lizardshaman', 'armor', 'normal', 'd4', 'เกล็ดลม', '🏹นักธนู 🗡️โจร', { arDodgeShield: 0.025, maxHp: 20 }),
  c2('hornet', 'acc', 'normal', 'd4', 'เหล็กในเร้าใจ', '🏹นักธนู 🗡️โจร', { arCritRes: 4, crit: 0.02 }),
  c2('turtleguard', 'acc', 'normal', 'd4', 'กระดองสวนกลับ', '⚔️นักดาบ', { counterShield: 0.02, counterDmg: 0.15 }),
  c2('bloater', 'acc', 'normal', 'd4', 'ฟองบาเรีย', '🔮จอมเวท', { mgWaveBarrier: 0.4 }),
  c2('venomqueen', 'acc', 'mini', 'd4', 'ใยกัดกร่อน', '🗡️โจร', { poisonAmp: 0.1, hit: -5 }),
  c2('frostgiant', 'armor', 'mini', 'd4', 'ค้อนธารน้ำแข็ง', '⚔️นักดาบ', { ultMulAdd: 0.4, ultVsCharge: 0.25, aspd: -0.12 }),
  c2('hydra', 'armor', 'boss', 'd4', 'หัวงอกใหม่', '✨นักบวช', { ultRegen: 0.02, healAmp: 0.06, shieldAmp: -0.1 }),
  // ----- d5 -----
  c2('hellknight', 'armor', 'normal', 'd5', 'เกราะไฟนรก', '⚔️นักดาบ (ลดราคาออโต้ทุกคลาส)', { autoCostCut: 4, spellVamp: 0.05 }),
  c2('imp', 'acc', 'normal', 'd5', 'ประกายอิมพ์', 'ทุกคลาส', { aspd: 0.12 }),
  c2('hexwitch', 'acc', 'normal', 'd5', 'ตาคำสาป', '🔮จอมเวท ✨นักบวช', { spellCrit: 0.05, critMul: 0.1 }),
  c2('necropriest', 'armor', 'normal', 'd5', 'หอกวิญญาณ', '✨นักบวช', { spearRate: 0.34, spearShield: 0.1 }),
  c2('wraith', 'acc', 'normal', 'd5', 'เคียววิญญาณ', 'ทุกคลาส', { arLowHpBonus: 0.1 }),
  c2('mirage', 'armor', 'mini', 'd5', 'เงาพันหน้า', '🗡️โจร', { ultDodge: 1, ultHits: 1 }, undefined, { maxHp: -0.06 }),
  c2('warlord', 'weapon', 'mini', 'd5', 'เลือดขุนศึก', '🏹นักธนู 🗡️โจร', { critMul: 0.25, crit: 0.04, hit: -8 }),
  c2('lich', 'armor', 'boss', 'd5', 'คัมภีร์ลิช', 'ทุกคลาส (ult)', { mgUltCd: -1, resRegenCut: 0.1, aspd: -0.12 }, undefined, { maxHp: -0.05 }),
]

export const cardById = (id: string) => EQUIP_CARDS.find((x) => x.id === id)
export const cardsOfMonster = (kind: MonsterKind) => EQUIP_CARDS.filter((x) => x.monster === kind)
export const cardName = (cd: EquipCard) => `${TIER_NAME[cd.tier]}${cd.name ?? MONSTERS[cd.monster].name}`
/** drop chance / pity for one card (second cards are rarer) */
export const cardRate = (cd: EquipCard) => CARD_RULES.rate[cd.tier] * (cd.v2 ? CARD_RULES.v2Rate : 1)
export const cardPityMax = (cd: EquipCard) => Math.round(CARD_RULES.pity[cd.tier] * (cd.v2 ? CARD_RULES.v2Pity : 1))
export const cardIcon = (cd: EquipCard) => cd.tier === 'boss' ? '👑' : cd.tier === 'mini' ? '💠' : '🃏'
