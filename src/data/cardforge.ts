// Cardforge (v98, design/craft-rules-v2.md 2): turn spare bag cards + dungeon materials + zeny into odd forge-only gear.
// Each piece carries a "signature" (a Stats flag BattleScene already reads for every class) plus a small downside.
// Economy: pure zeny sink. These items have price 0 (not sold, not shown in the shop); nothing here pays zeny out.
// Item ids are save data: never rename or remove one. Only TYPE imports from meta (meta imports this file).
import type { Stats } from './game-data'
import { CRAFT_ITEMS, craftCost, type CraftInfo } from './craft'
import type { Item } from './meta'
import type { SaveData } from '../save'

export const CARDFORGE = {
  zenyMul: 1.5, // x the dearest classic recipe of the same dungeon, rounded to 100
  cardsNeed: { normal: 3, mini: 2, boss: 1 } as Record<'normal' | 'mini' | 'boss', number>,
  idPrefix: 'cf_',
}

const zenyFor = (dg: string) => Math.round((Math.max(...CRAFT_ITEMS.filter((i) => i.craft?.dg === dg).map((i) => i.craft!.zeny)) * CARDFORGE.zenyMul) / 100) * 100

type Row = Omit<Item, 'price' | 'slots' | 'craft'> & { dg: string; common: number; boss: number; cards: Record<string, number>; sig: Partial<Stats>; bonus: CraftInfo['bonus'] }
const row = (r: Row): Item => {
  const { dg, common, boss, cards, sig, bonus, ...item } = r
  return { ...item, price: 0, slots: 1, craft: { dg, common, boss, zeny: zenyFor(dg), bonus, cards, sig } }
}

/** The 8 MVP pieces (rules doc 2.3). Wearable by every class (Q 2026-11-07). */
export const CARDFORGE_ITEMS: Item[] = [
  row({ id: 'cf_jellthorn', slot: 'armor', name: 'เกราะหนามเยลลี่', icon: '🌵', desc: 'โล่กันคลื่นแรก + สะท้อนหนาม · ✦ ต้องมีโล่ถึงจะสะท้อน', mod: { maxHp: 50, def: 6, flee: -3 }, dg: 'd1', common: 8, boss: 2, cards: { card_jellop: 3, card_king: 1 }, sig: { waveShield: 0.04, thorns: 0.15 }, bonus: [{ regen: 0.3 }, { thorns: 0.05 }] }),
  row({ id: 'cf_shadowfang', slot: 'acc', name: 'จี้เขี้ยวเงา', icon: '🌑', desc: '✦ หลบได้แล้วตีสวน · เสีย DEF', base: { agi: 2 }, mod: { flee: 5, def: -4 }, dg: 'd2', common: 10, boss: 2, cards: { card_shadowwolf: 3, card_bat: 3 }, sig: { dodgeStrike: 1 }, bonus: [{ dodgeHeal: 0.02 }, { flee: 6 }] }),
  row({ id: 'cf_boarhelm', slot: 'head', name: 'หมวกเขี้ยวหมูป่า', icon: '🐗', desc: '✦ ฆ่าศัตรูแล้วฟื้น 2% HP', mod: { maxHp: 40, def: 5 }, dg: 'd2', common: 10, boss: 2, cards: { card_boar: 3, card_shroom: 3 }, sig: { killHeal: 0.02 }, bonus: [{ tenacity: 0.05 }, { killHeal: 0.01 }] }),
  row({ id: 'cf_duelband', slot: 'acc', name: 'ปลอกแขนนักดวล', icon: '🤺', desc: '✦ สวนกลับโดนศัตรูทุกตัว · เสีย DEF', mod: { counter: 0.05, hit: 4, def: -5 }, dg: 'd3', common: 12, boss: 3, cards: { card_duelist: 2, card_skeleton: 3 }, sig: { ctrAoe: 1 }, bonus: [{ counterDmg: 0.05 }, { counter: 0.04 }] }),
  row({ id: 'cf_deathplate', slot: 'armor', name: 'เกราะอัศวินมรณะ', icon: '💀', desc: '✦ HP ต่ำกว่า 30% ATK +40% ดูดเลือด x2 · ตีช้าลง', mod: { maxHp: 90, def: 8, aspd: -0.1 }, dg: 'd3', common: 12, boss: 3, cards: { card_deathknight: 1, card_gargoyle: 3 }, sig: { berserk: 1 }, bonus: [{ lifesteal: 0.03 }, { maxHp: 40 }] }),
  row({ id: 'cf_plaguecharm', slot: 'acc', name: 'เครื่องรางพิษลาม', icon: '☠️', desc: '✦ ศัตรูตายแล้วพิษลามไปตัวอื่น (มีพิษในตัวเอง) · ฮีลอ่อนลง', mod: { poison: 1, poisonDmg: 1, healAmp: -0.08 }, dg: 'd4', common: 14, boss: 3, cards: { card_toad: 3, card_venomqueen: 2 }, sig: { poisonSpread: 1 }, bonus: [{ vsPoison: 0.04 }, { poisonCap: 2 }] }),
  row({ id: 'cf_lichveil', slot: 'head', name: 'ผ้าคลุมวิญญาณลิช', icon: '👻', desc: '✦ ฮีลเกิน HP เต็มกลายเป็นโล่ · HP สูงสุดลด', mod: { mdef: 0.05, maxRes: 10 }, pct: { maxHp: -0.06 }, dg: 'd5', common: 16, boss: 4, cards: { card_lich: 1, card_wraith: 3 }, sig: { overhealShield: 1 }, bonus: [{ healAmp: 0.06 }, { regen: 0.4 }] }),
  row({ id: 'cf_emberring', slot: 'acc', name: 'แหวนเถ้าอเวจี', icon: '🔥', desc: '✦ ไฟลุกลามไปตัวอื่นเมื่อศัตรูตาย (ต้องมีแหล่งไฟ) · M.DEF ลด', base: { int: 2 }, mod: { vsBurn: 0.04, mdef: -0.03 }, dg: 'd5', common: 16, boss: 4, cards: { card_imp: 3, card_hexwitch: 3 }, sig: { fireSpread: 1 }, bonus: [{ burnDps: 2 }, { vsBurn: 0.04 }] }),
]

export interface CardforgeCost { mats: Record<string, number>; zeny: number; cards: Record<string, number> }
export const cardforgeCost = (it: Item): CardforgeCost => ({ ...craftCost(it), cards: { ...(it.craft?.cards ?? {}) } })
/** Cards in the BAG only (a card socketed in a piece of gear is not spent). */
export const bagCards = (s: Pick<SaveData, 'cards'>, id: string) => s.cards?.[id] ?? 0
export const isCardforge = (it: Item) => !!it.craft?.cards

/** What is missing right now (for the chips). ok = can press. Locked / already owned count as not ok with a reason. */
export function canCardforge(s: SaveData, it: Item): { ok: boolean; why?: 'locked' | 'owned' | 'short'; short: string[] } {
  const c = it.craft
  if (!c?.cards) return { ok: false, why: 'locked', short: [] }
  if (!((s.clearsBy?.[c.dg] ?? 0) > 0)) return { ok: false, why: 'locked', short: [] }
  if (s.owned.includes(it.id)) return { ok: false, why: 'owned', short: [] }
  const cost = cardforgeCost(it), short: string[] = []
  for (const [id, n] of Object.entries(cost.cards)) if (bagCards(s, id) < n) short.push(id)
  for (const [id, n] of Object.entries(cost.mats)) if ((s.mats?.[id] ?? 0) < n) short.push(id)
  if (s.zeny < cost.zeny) short.push('zeny')
  return short.length ? { ok: false, why: 'short', short } : { ok: true, short }
}

/** Pay cards + mats + zeny ALL OR NOTHING and add the piece. False (nothing changes) when locked, owned, or short. */
export function cardforge(s: SaveData, it: Item): boolean {
  if (!canCardforge(s, it).ok) return false
  const cost = cardforgeCost(it)
  s.zeny -= cost.zeny
  for (const [id, n] of Object.entries(cost.mats)) { s.mats![id] -= n; if (s.mats![id] <= 0) delete s.mats![id] }
  for (const [id, n] of Object.entries(cost.cards)) { s.cards![id] -= n; if (s.cards![id] <= 0) delete s.cards![id] }
  s.owned.push(it.id)
  return true
}
