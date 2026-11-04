// Refine +1..+10, repair and random bonus lines (design/item-acquisition-v1.md 3.5 / 3.5.1 / 3.6 / 3.7).
// Pure rules + save actions, kept out of the UI so the bot and tests can use them.
// Gem rule (Q 2026-11-03): gems may ONLY repair. Never success rate, break protection, mats, fodder or rerolls,
// and the material repair is always the cheaper way.
import type { SaveData } from '../save'
import type { Stats } from './game-data'
import type { JobId } from './jobs'
import { matOf } from './materials'
import { matDungeon, REFINE, refinable, refineFee, refineRate, type RefineLine } from './craft'
import { BASE_NAME, isBroken, itemStatLine, ITEMS, linesOf, refineOf, type BaseStat, type Item, type Slot } from './meta'

// ---------- fodder: basic shop items (no job lock, no unlock, not crafted) ----------
export const isFodder = (it: Item) => it.price > 0 && !it.jobs && !it.req && !it.craft
export const FODDER: Item[] = ITEMS.filter(isFodder)
/** Refine tiers: +1~+4 / +5~+7 / +8~+10. */
export const refineTier = (n: number) => (n <= 4 ? 0 : n <= 7 ? 1 : 2)
// Fodder / mats per tier. Zeny is the per-step curve refineFee(n) in craft.ts (v53: was 10/20/40 x n per tier).
// Bot income is ~46z per ดัน1 run and ~213z per ดัน3 run.
const TIER = [
  { fodderMin: 0, common: 2, boss: 0 },
  { fodderMin: 0, common: 4, boss: 0 },
  { fodderMin: 200, common: 6, boss: 1 },
]
/** Cheapest fodder price a tier asks for. A slot whose dearest basic item is cheaper (off-hand: buckler 180z)
 * takes its dearest one instead, so every slot can reach +10. */
export function fodderMin(slot: Slot, tier: number) {
  const top = Math.max(0, ...FODDER.filter((f) => f.slot === slot).map((f) => f.price))
  return Math.min(TIER[tier].fodderMin, top)
}
export interface FodderNeed { slot: Slot; min: number }
export interface ForgeCost { mats: Record<string, number>; zeny: number; fodder?: FodderNeed; gems?: number }
/** The cheapest fodder in the stash that fits (same slot, price >= min). */
export function pickFodder(stash: Record<string, number> | undefined, need: FodderNeed): Item | undefined {
  return FODDER.filter((f) => f.slot === need.slot && f.price >= need.min && (stash?.[f.id] ?? 0) > 0).sort((a, b) => a.price - b.price)[0]
}
/** Fodder items that fit a need (for the "buy one" hint). */
export const fodderFits = (need: FodderNeed) => FODDER.filter((f) => f.slot === need.slot && f.price >= need.min).sort((a, b) => a.price - b.price)

/** Cost of one try at +n. */
export function refineCost(it: Item, n: number): ForgeCost {
  const t = TIER[refineTier(n)], dg = matDungeon(it)
  return { mats: { [matOf(dg, false)]: t.common, ...(t.boss ? { [matOf(dg, true)]: t.boss } : {}) }, zeny: refineFee(n), fodder: { slot: it.slot, min: fodderMin(it.slot, refineTier(n)) } }
}
/** Material repair: any fodder of the same slot + 2 common materials + half the fee of the item's current +.
 * Always cheaper than gems (worst case +9: 185z + cheapest fodder). */
export const repairCost = (it: Item, r = 0): ForgeCost => ({ mats: { [matOf(matDungeon(it), false)]: 2 }, zeny: Math.round((refineFee(r) * REFINE.repairFee) / 5) * 5, fodder: { slot: it.slot, min: 0 } })
export const gemRepairCost: ForgeCost = { mats: {}, zeny: 0, gems: REFINE.repairGems }
/** Reroll one bonus line (idx 0 / 1 / 2 = the +5 / +7 / +10 line). Never gems. */
export function rerollCost(it: Item, idx: number): ForgeCost {
  const dg = matDungeon(it), c = [{ common: 4, boss: 0, zeny: 200 }, { common: 6, boss: 1, zeny: 400 }, { common: 8, boss: 2, zeny: 800 }][idx]
  return { mats: { [matOf(dg, false)]: c.common, ...(c.boss ? { [matOf(dg, true)]: c.boss } : {}) }, zeny: c.zeny }
}

type Wallet = Pick<SaveData, 'zeny' | 'gems' | 'mats' | 'fodder'>
export function canAfford(s: Wallet, c: ForgeCost) {
  return s.zeny >= c.zeny && s.gems >= (c.gems ?? 0) && Object.entries(c.mats).every(([id, n]) => (s.mats?.[id] ?? 0) >= n) && (!c.fodder || !!pickFodder(s.fodder, c.fodder))
}
/** Spend a cost (fodder: the cheapest one that fits). Returns the fodder used, or false when short (nothing spent). */
export function spend(s: Wallet, c: ForgeCost): Item | null | false {
  if (!canAfford(s, c)) return false
  const f = c.fodder ? pickFodder(s.fodder, c.fodder)! : null
  s.zeny -= c.zeny
  s.gems -= c.gems ?? 0
  for (const [id, n] of Object.entries(c.mats)) { s.mats![id] -= n; if (s.mats![id] <= 0) delete s.mats![id] }
  if (f) { s.fodder![f.id]--; if (s.fodder![f.id] <= 0) delete s.fodder![f.id] }
  return f
}

// ---------- auto-buy fodder (Q 2026-11-04: no trip to the shop) ----------
/** The fodder that would be bought for a cost: the cheapest that fits, only when the stash has none. */
export function fodderToBuy(s: Wallet, c: ForgeCost): Item | undefined {
  if (!c.fodder || pickFodder(s.fodder, c.fodder)) return undefined
  return fodderFits(c.fodder)[0]
}
/** Zeny a press really takes: the fee plus the fodder bought at shop price. */
export const totalZeny = (s: Wallet, c: ForgeCost) => c.zeny + (fodderToBuy(s, c)?.price ?? 0)
/** Zeny still missing for a press (0 = enough). */
export const zenyShort = (s: Wallet, c: ForgeCost) => Math.max(0, totalZeny(s, c) - s.zeny)
/** canAfford, counting a fodder bought on the spot. */
export function canAffordAuto(s: Wallet, c: ForgeCost) {
  if (!c.fodder || pickFodder(s.fodder, c.fodder)) return canAfford(s, c)
  return !!fodderToBuy(s, c) && canAfford(s, { ...c, fodder: undefined, zeny: totalZeny(s, c) })
}
/** Buy the missing fodder (all or nothing, only when the whole press is affordable). Returns what was bought. */
function buyMissing(s: Wallet, c: ForgeCost): Item | null | false {
  if (!canAffordAuto(s, c)) return false
  const f = fodderToBuy(s, c)
  if (!f) return null
  s.zeny -= f.price
  const bag = (s.fodder ??= {})
  bag[f.id] = (bag[f.id] ?? 0) + 1
  return f
}

// ---------- random bonus lines (3.5.1) ----------
type Kind = 'atk' | 'def' | 'any'
interface LineDef { stat: string; vals: [number, number, number]; kind: Kind; w: number; off?: JobId[]; slots?: Slot[] }
// Who gets nothing from a stat (checked against BattleScene / heroStats, 2026-11-03):
const NO_MANA: JobId[] = ['archer', 'thief', 'novice'] // Energy jobs + Novice (Swordsman runs on Mana since v28)
const NO_MAGIC: JobId[] = ['swordsman', 'archer', 'thief', 'novice'] // M.ATK / spell crit
const NO_PSKILL: JobId[] = ['mage', 'cleric', 'archer', 'thief'] // pskill is read by Swordsman skills + Novice Smash only
/** The pool. `w` splits shared table rows ("M.DEF / ต้านทาน" = 0.5 each); `off` = jobs that get no use (weight x0.25). */
export const LINE_POOL: LineDef[] = [
  { stat: 'base', vals: [1, 2, 3], kind: 'any', w: 1 },
  { stat: 'hpPct', vals: [0.02, 0.03, 0.05], kind: 'def', w: 1 },
  { stat: 'atkPct', vals: [0.02, 0.03, 0.05], kind: 'atk', w: 0.5, off: ['mage'] }, // Cleric's mace hit is physical
  { stat: 'matkPct', vals: [0.02, 0.03, 0.05], kind: 'atk', w: 0.5, off: NO_MAGIC },
  { stat: 'pskill', vals: [0.02, 0.04, 0.06], kind: 'atk', w: 1, off: NO_PSKILL },
  { stat: 'def', vals: [2, 3, 5], kind: 'def', w: 1 },
  { stat: 'mdef', vals: [0.01, 0.02, 0.03], kind: 'def', w: 0.5 },
  { stat: 'tenacity', vals: [0.01, 0.02, 0.03], kind: 'def', w: 0.5 },
  { stat: 'hit', vals: [3, 5, 8], kind: 'atk', w: 0.5, off: ['mage'] },
  { stat: 'flee', vals: [3, 5, 8], kind: 'def', w: 0.5 },
  { stat: 'crit', vals: [0.01, 0.02, 0.03], kind: 'atk', w: 0.5 },
  { stat: 'spellCrit', vals: [0.01, 0.02, 0.03], kind: 'atk', w: 0.5, off: NO_MAGIC },
  { stat: 'critMul', vals: [0.05, 0.1, 0.15], kind: 'atk', w: 1 },
  { stat: 'counter', vals: [0.02, 0.03, 0.05], kind: 'def', w: 0.5 },
  { stat: 'combo', vals: [0.02, 0.03, 0.05], kind: 'atk', w: 0.5 },
  { stat: 'comboDmg', vals: [0.04, 0.06, 0.1], kind: 'atk', w: 0.3, slots: ['weapon', 'acc'] }, // combo rework: Combo DMG%
  { stat: 'regen', vals: [0.133, 0.2, 0.333], kind: 'def', w: 1 }, // 1 regen = 1.5% HP/turn: shows +0.2% / +0.3% / +0.5%
  { stat: 'healAmp', vals: [0.02, 0.04, 0.06], kind: 'def', w: 1, off: ['swordsman', 'archer', 'mage', 'thief'] },
  { stat: 'lifesteal', vals: [0.01, 0.02, 0.03], kind: 'atk', w: 1 },
  { stat: 'spellVamp', vals: [0.01, 0.02, 0.03], kind: 'atk', w: 0.5 }, // Q 2026-11-04: skill lifesteal comes from crafting / events / advanced skills
  { stat: 'maxRes', vals: [5, 8, 12], kind: 'def', w: 0.5, off: NO_MANA },
  { stat: 'resRegen', vals: [0.5, 1, 1.5], kind: 'def', w: 0.5, off: NO_MANA },
  // พร v2 numbers (Q 2026-11-04 grill): mid line ~1/4 of the card's level 1, only on these slots. Battle caps card + gear (perks.ts OUTSIDE_CAP).
  { stat: 'basicDmg', vals: [0.03, 0.05, 0.07], kind: 'atk', w: 0.3, slots: ['weapon'] },
  { stat: 'counterDmg', vals: [0.05, 0.075, 0.1], kind: 'atk', w: 0.3, slots: ['weapon'] },
  { stat: 'vsBurn', vals: [0.02, 0.04, 0.06], kind: 'atk', w: 0.3, slots: ['weapon'] },
  { stat: 'vsChill', vals: [0.02, 0.04, 0.06], kind: 'atk', w: 0.3, slots: ['weapon'] },
  { stat: 'vsPoison', vals: [0.03, 0.05, 0.07], kind: 'atk', w: 0.3, slots: ['weapon'] },
  { stat: 'chillWeak', vals: [0.02, 0.04, 0.06], kind: 'def', w: 0.3, slots: ['armor', 'offhand'] },
  { stat: 'spearShield', vals: [0.03, 0.05, 0.07], kind: 'def', w: 0.3, slots: ['armor', 'offhand'], off: ['swordsman', 'archer', 'mage', 'thief', 'novice'] }, // holy spears: Priest
  { stat: 'resTurn', vals: [0.3, 0.5, 0.8], kind: 'def', w: 0.5, slots: ['acc'], off: ['novice'] },
]
/** Base stats a job gets nothing from (x0.25 when the "base stat" row picks one). */
// STR: P.ATK for melee non-Thief + pskill · INT: M.ATK + Max Mana (Swordsman uses Mana) · LUK: crit, lucky dodge, drops for all
const BASE_OFF: Record<BaseStat, JobId[]> = { str: ['mage', 'archer', 'thief'], vit: [], wis: [], dex: ['mage'], int: ['archer', 'thief', 'novice'], luk: [], agi: [] }
const BASES: BaseStat[] = ['str', 'vit', 'wis', 'dex', 'int', 'luk', 'agi']
/** Whole-number stats (gold x1.5 rounds); everything else keeps 3 decimals (resRegen 1 -> 1.5, not 2). */
const INT_STATS = new Set<string>([...BASES, 'def', 'hit', 'flee', 'maxRes'])
const slotBias = (slot: Slot, kind: Kind) => (slot === 'weapon' ? (kind === 'atk' ? 2 : 1) : slot === 'acc' ? 1 : kind === 'def' ? 2 : 1)
const jobBias = (off: JobId[] | undefined, job: JobId) => (off?.includes(job) ? 0.25 : 1)

function pickWeighted<T>(xs: T[], w: (x: T) => number, rnd: () => number): T {
  const total = xs.reduce((a, x) => a + w(x), 0)
  let r = rnd() * total
  for (const x of xs) { r -= w(x); if (r < 0) return x }
  return xs[xs.length - 1]
}
/** Roll one line for `it` (idx 0 / 1 / 2 = small / mid / big), weighted by slot and by the job refining it. */
export function rollLine(it: Item, idx: number, job: JobId, rnd: () => number = Math.random): RefineLine {
  const def = pickWeighted(LINE_POOL, (d) => (d.slots && !d.slots.includes(it.slot) ? 0 : d.w * slotBias(it.slot, d.kind) * jobBias(d.off, job)), rnd)
  const stat = def.stat === 'base' ? pickWeighted(BASES, (b) => jobBias(BASE_OFF[b], job), rnd) : def.stat
  const gold = rnd() < REFINE.goldRate
  const v = def.vals[idx]
  const val = gold ? (INT_STATS.has(stat) ? Math.round(v * REFINE.goldMul) : Math.round(v * REFINE.goldMul * 1000) / 1000) : v
  return { stat, val, ...(gold ? { gold: 1 as const } : {}) }
}
/** "✨ P.ATK +3%" */
export function lineText(l: RefineLine): string {
  const pct: Record<string, string> = { hpPct: 'maxHp', atkPct: 'atk', matkPct: 'matk' }
  const body = (BASES as string[]).includes(l.stat) ? `${BASE_NAME[l.stat as BaseStat]} +${l.val}`
    : pct[l.stat] ? itemStatLine({ mod: {}, pct: { [pct[l.stat]]: l.val } })
      : itemStatLine({ mod: { [l.stat]: l.val } as Partial<Stats> })
  return `${l.gold ? '✨' : ''}${body}`
}

// ---------- actions on the save ----------
export type RefineResult =
  | { ok: false; why: 'short' | 'broken' | 'max' | 'cant' }
  | { ok: true; success: boolean; n: number; rate: number; fodder: Item | null; bought?: Item; line?: RefineLine; gems?: number }

/** Chance shown on the button for the next try. */
export const nextRate = (s: SaveData, it: Item) => refineRate(refineOf(s, it.id) + 1, s.refinePity?.[it.id] ?? 0)

/** One refine try at +(r+1). Success: +1 (and the bonus line / free gems the first time at +5 / +7 / +10).
 * Fail: the item breaks (keeps its +, grade, cards and lines; gives nothing until repaired), pity +1. */
export function tryRefine(s: SaveData, it: Item, rnd: () => number = Math.random, autoBuy = false): RefineResult {
  if (!refinable(it)) return { ok: false, why: 'cant' }
  if (isBroken(s, it.id)) return { ok: false, why: 'broken' }
  const r = refineOf(s, it.id)
  if (r >= REFINE.max) return { ok: false, why: 'max' }
  const n = r + 1, rate = nextRate(s, it), cost = refineCost(it, n)
  const bought = autoBuy ? buyMissing(s, cost) : null
  if (bought === false) return { ok: false, why: 'short' }
  const fodder = spend(s, cost)
  if (fodder === false) return { ok: false, why: 'short' }
  const by = bought ? { bought } : {}
  if (rnd() >= rate) {
    ;(s.broken ??= []).push(it.id)
    ;(s.refinePity ??= {})[it.id] = (s.refinePity[it.id] ?? 0) + 1
    return { ok: true, success: false, n, rate, fodder, ...by }
  }
  ;(s.refine ??= {})[it.id] = n
  if (s.refinePity) delete s.refinePity[it.id]
  const out: RefineResult = { ok: true, success: true, n, rate, fodder, ...by }
  const idx = REFINE.lineAt.indexOf(n), lines = linesOf(s, it.id)
  if (idx >= 0 && !lines[idx]) {
    const arr = ((s.refineLines ??= {})[it.id] ??= [])
    arr[idx] = out.line = rollLine(it, idx, s.job, rnd)
  }
  const gems = REFINE.gemsAt[n], key = `${it.id}:${n}`
  if (gems && !(s.refineGems ??= []).includes(key)) { s.refineGems.push(key); s.gems += gems; out.gems = gems }
  return out
}
/** Repair a broken item with materials (any fodder of its slot + 2 common mats + zeny) or with gems. */
export function repair(s: SaveData, it: Item, withGems = false, autoBuy = false): boolean {
  if (!isBroken(s, it.id)) return false
  const cost = withGems ? gemRepairCost : repairCost(it, refineOf(s, it.id))
  if (autoBuy && !withGems && buyMissing(s, cost) === false) return false
  if (spend(s, cost) === false) return false
  s.broken = s.broken!.filter((x) => x !== it.id)
  return true
}
/** Pay and roll a new line; it waits in `s.reroll` until the player keeps the old or the new one. */
export function reroll(s: SaveData, it: Item, idx: number, rnd: () => number = Math.random): RefineLine | null {
  if (s.reroll || !linesOf(s, it.id)[idx]) return null
  if (spend(s, rerollCost(it, idx)) === false) return null
  const line = rollLine(it, idx, s.job, rnd)
  s.reroll = { item: it.id, idx, line }
  return line
}
/** Settle a pending reroll: keep the new line, or keep the old one. */
export function settleReroll(s: SaveData, takeNew: boolean) {
  const p = s.reroll
  if (!p) return
  if (takeNew && s.refineLines?.[p.item]?.[p.idx]) s.refineLines[p.item][p.idx] = p.line
  delete s.reroll
}
