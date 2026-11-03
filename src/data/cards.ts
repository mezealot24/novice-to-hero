// RO-style monster cards (design/equipment-cards.md). Every monster drops its own card; cards are kept
// forever and slot into gear (weapon / armor / accessory cards fit only that slot type). Card ids are save
// data: never rename or remove one. Effects use the same `base` + `mod` shape as items, plus `pct` for
// the few "% of max HP / ATK" cards (applied after everything else is added up).
import { MONSTERS, type MonsterKind, type Stats } from './game-data'
import type { BaseStat, Slot } from './meta'

export type CardTier = 'normal' | 'mini' | 'boss'
export interface CardPct { maxHp?: number; atk?: number; matk?: number }
export interface EquipCard { id: string; monster: MonsterKind; slot: Slot; tier: CardTier; dungeon: string; base?: Partial<Record<BaseStat, number>>; mod: Partial<Stats>; pct?: CardPct }

export const CARD_RULES = {
  rate: { normal: 0.015, mini: 0.08, boss: 0.05 } as Record<CardTier, number>,
  pity: { normal: 80, mini: 12, boss: 20 } as Record<CardTier, number>, // kills of that monster without its card -> guaranteed
  sell: { normal: 30, mini: 150, boss: 300 } as Record<CardTier, number>,
}
export const TIER_NAME: Record<CardTier, string> = { normal: 'การ์ด', mini: 'การ์ดมินิบอส', boss: 'การ์ด MVP' }
export const TIER_COLOR: Record<CardTier, string> = { normal: '#c9c9d6', mini: '#b48cff', boss: '#f2b84b' }

const c = (id: string, monster: MonsterKind, slot: Slot, tier: CardTier, dungeon: string, mod: Partial<Stats>, base?: Partial<Record<BaseStat, number>>, pct?: CardPct): EquipCard =>
  ({ id, monster, slot, tier, dungeon, mod, base, pct })

export const EQUIP_CARDS: EquipCard[] = [
  // ----- d1 ทุ่งเจลล็อป -----
  c('card_jellop', 'jellop', 'armor', 'normal', 'd1', { maxHp: 40 }),
  c('card_wolf', 'wolf', 'weapon', 'normal', 'd1', { atk: 4, hit: 3 }),
  c('card_king', 'king', 'armor', 'boss', 'd1', { regen: 0.67, flee: -5 }, undefined, { maxHp: 0.12 }),
  // ----- d2 ป่าหมาป่าเงา -----
  c('card_bat', 'bat', 'weapon', 'normal', 'd2', { lifesteal: 0.04 }),
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
  c('card_drainer', 'drainer', 'acc', 'mini', 'd3', { maxRes: 20, resRegen: 1 }),
  c('card_deathknight', 'deathknight', 'armor', 'boss', 'd3', { waveShield: 0.08, def: 5, aspd: -0.1 }),
  // ----- d4 บึงพิษมรกต -----
  c('card_toad', 'toad', 'weapon', 'normal', 'd4', { poison: 1 }),
  c('card_lizardshaman', 'lizardshaman', 'acc', 'normal', 'd4', { healAmp: 0.08, shieldAmp: 0.08 }),
  c('card_hornet', 'hornet', 'weapon', 'normal', 'd4', { hit: 8, crit: 0.03 }),
  c('card_turtleguard', 'turtleguard', 'armor', 'normal', 'd4', { def: 8, tenacity: 0.06 }),
  c('card_bloater', 'bloater', 'armor', 'normal', 'd4', { maxHp: 70 }),
  c('card_venomqueen', 'venomqueen', 'weapon', 'mini', 'd4', { poisonDmg: 2, hit: -5 }),
  c('card_frostgiant', 'frostgiant', 'armor', 'mini', 'd4', { mdef: 0.1, guard: 0.05 }, { agi: -3 }),
  c('card_hydra', 'hydra', 'weapon', 'boss', 'd4', { healAmp: -0.1 }, undefined, { atk: 0.08, matk: 0.08 }),
  // ----- d5 บัลลังก์อเวจี -----
  c('card_hellknight', 'hellknight', 'weapon', 'normal', 'd5', { atk: 7 }, { str: 1 }),
  c('card_imp', 'imp', 'acc', 'normal', 'd5', { combo: 0.06 }),
  c('card_hexwitch', 'hexwitch', 'weapon', 'normal', 'd5', { matk: 9, spellCrit: 0.03 }),
  c('card_necropriest', 'necropriest', 'armor', 'normal', 'd5', { regen: 0.67, healAmp: 0.06 }),
  c('card_wraith', 'wraith', 'armor', 'normal', 'd5', { flee: 8, dodgeHeal: 0.01 }),
  c('card_mirage', 'mirage', 'acc', 'mini', 'd5', { luckyDodge: 0.04 }, { luk: 3 }),
  c('card_warlord', 'warlord', 'weapon', 'mini', 'd5', { crit: 0.05, def: -6 }, { str: 4 }),
  c('card_lich', 'lich', 'acc', 'boss', 'd5', { revive: 1 }, undefined, { maxHp: -0.1 }),
]

export const cardById = (id: string) => EQUIP_CARDS.find((x) => x.id === id)
export const cardOfMonster = (kind: MonsterKind) => EQUIP_CARDS.find((x) => x.monster === kind)
export const cardName = (cd: EquipCard) => `${TIER_NAME[cd.tier]}${MONSTERS[cd.monster].name}`
export const cardIcon = (cd: EquipCard) => cd.tier === 'boss' ? '👑' : cd.tier === 'mini' ? '💠' : '🃏'
