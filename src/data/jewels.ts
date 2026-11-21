// 💎 Jewels (Q 2026-11-20): PoE-style jewels slotted into passive-tree socket nodes. Cards are the only material:
// 3 cards make a jewel, then every card fed in adds its stats to the jewel's pool and acts like an orb by tier
// (🃏 reroll every line · 💠 add a line · 👑 lift the lowest line one tier). Line tiers are the forge's (line-tier.ts).
// Pure rules + save actions on a structural save type, so tests and the bot can use them without Phaser.
import type { Stats } from './stats'
import type { BaseStat } from './meta/stat-spec'
import type { RefineLine } from './craft'
import { cardById, type CardTier, type EquipCard } from './cards'
import { lineTier, LINE_TIER_MAX, makeLine, rollTier, type LineTier } from './line-tier'
import { normalizePassiveNodes, passiveNodeById } from './passive-tree'
import type { JobId } from './jobs'

export const JEWEL = {
  makeCards: 3, // cards to make one jewel
  startLines: 2, // lines on a new jewel
  maxLines: 4,
  share: 0.5, // a line's base value = this share of the card's value
  maxOwned: 30,
  lockCost: 1, // 🔒 extra copies of the 🃏 card per line kept through a reroll
}
/** Stats that count something (stacks, revives, extra hits) never join a jewel pool; neither do downsides. */
export const JEWEL_SKIP = new Set(['resTurn', 'poison', 'revive', 'holyCounter', 'ultPoison', 'ultDodge', 'ultHits', 'mgUltCd'])
const BASES = new Set<string>(['str', 'vit', 'wis', 'dex', 'int', 'luk', 'agi'])
const PCT: Record<string, 'hpPct' | 'atkPct' | 'matkPct'> = { maxHp: 'hpPct', atk: 'atkPct', matk: 'matkPct' }
const PCT_BACK: Record<string, 'maxHp' | 'atk' | 'matk'> = { hpPct: 'maxHp', atkPct: 'atk', matkPct: 'matk' }
const r3 = (n: number) => Math.round(n * 1000) / 1000

/** One pool entry: the base value a line of this stat starts from, and whether it is a whole number. */
export interface PoolStat { base: number; whole: boolean }
export interface Jewel {
  id: string
  lines: RefineLine[]
  /** stat key -> base value (the biggest card that fed it). Line stats use RefineLine keys (base stats, Stats keys, hpPct / atkPct / matkPct). */
  pool: Record<string, PoolStat>
}
export interface JewelSave {
  cards?: Record<string, number>
  jewels?: Jewel[]
  jewelSock?: Record<string, string> // socket node id -> jewel id
  jewelSeq?: number
  job?: JobId
  passiveNodes?: string[]
}

/** The stats a card puts into a pool (positive, not a count), with base = card value x share. */
export function cardPool(cd: EquipCard): Record<string, PoolStat> {
  const out: Record<string, PoolStat> = {}
  const put = (stat: string, v: number) => {
    if (!(v > 0) || JEWEL_SKIP.has(stat)) return
    const whole = Number.isInteger(v)
    const base = whole ? Math.max(1, Math.round(v * JEWEL.share)) : r3(v * JEWEL.share)
    if (!out[stat] || out[stat].base < base) out[stat] = { base, whole }
  }
  for (const [k, v] of Object.entries(cd.mod)) put(k, v as number)
  for (const [k, v] of Object.entries(cd.base ?? {})) put(k, v as number)
  for (const [k, v] of Object.entries(cd.pct ?? {})) put(PCT[k], v as number)
  return out
}
function mergePool(into: Record<string, PoolStat>, add: Record<string, PoolStat>) {
  for (const [k, p] of Object.entries(add)) if (!into[k] || into[k].base < p.base) into[k] = p
}
/** Roll one line from the pool, skipping stats the jewel already has. */
function rollJewelLine(pool: Record<string, PoolStat>, taken: Set<string>, rnd: () => number): RefineLine | null {
  const keys = Object.keys(pool).filter((k) => !taken.has(k))
  if (!keys.length) return null
  const stat = keys[Math.min(keys.length - 1, Math.floor(rnd() * keys.length))]
  return makeLine(stat, pool[stat].base, rollTier(rnd), pool[stat].whole)
}
function rollLines(pool: Record<string, PoolStat>, n: number, rnd: () => number, keep: RefineLine[] = []): RefineLine[] {
  const out: RefineLine[] = [], taken = new Set<string>(keep.map((l) => l.stat))
  for (let i = 0; i < n; i++) {
    const l = rollJewelLine(pool, taken, rnd)
    if (!l) break
    out.push(l); taken.add(l.stat)
  }
  return out
}

/** What a card does when fed to a jewel, by tier. */
export type JewelOrb = 'reroll' | 'addLine' | 'tierUp'
export const ORB_OF: Record<CardTier, JewelOrb> = { normal: 'reroll', mini: 'addLine', boss: 'tierUp' }
export const ORB_TEXT: Record<JewelOrb, string> = { reroll: '🎲 สุ่มทุกบรรทัดใหม่', addLine: '➕ เพิ่ม 1 บรรทัด', tierUp: '⬆️ บรรทัดเลเวลต่ำสุด +1 เลเวล' }

function takeCard(s: JewelSave, cardId: string, n = 1): boolean {
  const bag = (s.cards ??= {})
  if ((bag[cardId] ?? 0) < n) return false
  bag[cardId] -= n
  if (bag[cardId] <= 0) delete bag[cardId]
  return true
}

export type MakeResult = { ok: true; jewel: Jewel } | { ok: false; why: 'count' | 'short' | 'full' | 'empty' }
/** Make a jewel from exactly JEWEL.makeCards cards (ids may repeat). Nothing is spent unless it works. */
export function makeJewel(s: JewelSave, cardIds: string[], rnd: () => number = Math.random): MakeResult {
  if (cardIds.length !== JEWEL.makeCards) return { ok: false, why: 'count' }
  if ((s.jewels?.length ?? 0) >= JEWEL.maxOwned) return { ok: false, why: 'full' }
  const need: Record<string, number> = {}
  for (const id of cardIds) need[id] = (need[id] ?? 0) + 1
  if (Object.entries(need).some(([id, n]) => !cardById(id) || (s.cards?.[id] ?? 0) < n)) return { ok: false, why: 'short' }
  const pool: Record<string, PoolStat> = {}
  for (const id of cardIds) mergePool(pool, cardPool(cardById(id)!))
  if (!Object.keys(pool).length) return { ok: false, why: 'empty' }
  for (const [id, n] of Object.entries(need)) takeCard(s, id, n)
  s.jewelSeq = (s.jewelSeq ?? 0) + 1
  const jewel: Jewel = { id: `jw${s.jewelSeq}`, lines: rollLines(pool, JEWEL.startLines, rnd), pool }
  ;(s.jewels ??= []).push(jewel)
  return { ok: true, jewel }
}

export type FeedResult = { ok: true; orb: JewelOrb; jewel: Jewel } | { ok: false; why: 'short' | 'noJewel' | 'max' }
/** Can this card do something to this jewel? ('max' = add a line at 4 lines, or every line already Mythic.) */
/** 🔒 Locked stats that are really on this jewel. Only a 🃏 reroll uses them, and at least one line must stay open. */
export const liveLocks = (j: Jewel, locks: readonly string[] = []) => locks.filter((k) => j.lines.some((l) => l.stat === k))
/** Cards of this kind a feed takes: 1, plus JEWEL.lockCost per locked line on a 🃏 reroll. */
export const feedCost = (j: Jewel, cd: EquipCard, locks: readonly string[] = []) =>
  ORB_OF[cd.tier] === 'reroll' ? 1 + liveLocks(j, locks).length * JEWEL.lockCost : 1
export function feedCheck(j: Jewel, cd: EquipCard, locks: readonly string[] = []): 'ok' | 'max' {
  const orb = ORB_OF[cd.tier]
  if (orb === 'reroll' && j.lines.length && liveLocks(j, locks).length >= j.lines.length) return 'max'
  if (orb === 'addLine') {
    const pool = { ...j.pool }; mergePool(pool, cardPool(cd))
    if (j.lines.length >= JEWEL.maxLines || Object.keys(pool).every((k) => j.lines.some((l) => l.stat === k))) return 'max'
  }
  if (orb === 'tierUp' && j.lines.every((l) => lineTier(l) >= LINE_TIER_MAX)) return 'max'
  return 'ok'
}
/** What feeding this card would do to this jewel, for the UI (no randomness, nothing changes). */
export interface FeedPreview {
  orb: JewelOrb
  max: boolean
  /** Stats this card brings that the jewel's pool does not have yet. */
  newStats: string[]
  /** 🃏: how many lines get re-rolled (locked lines stay). */
  rerollN: number
  /** 🃏: lines kept by 🔒. */
  locked: number
  /** Cards of this kind the feed takes. */
  cost: number
  /** 💠: stats the new line can be (pool after the feed, minus stats already on the jewel). */
  addable: string[]
  /** 👑: the line that goes up, before and after. */
  tierUp?: { from: RefineLine; to: RefineLine }
}
export function feedPreview(j: Jewel, cd: EquipCard, locks: readonly string[] = []): FeedPreview {
  const orb = ORB_OF[cd.tier]
  const add = cardPool(cd)
  const pool = { ...j.pool }; mergePool(pool, add)
  const onJewel = new Set(j.lines.map((l) => l.stat))
  const out: FeedPreview = {
    orb,
    max: feedCheck(j, cd, locks) === 'max',
    newStats: Object.keys(add).filter((k) => !j.pool[k]),
    rerollN: Math.max(1, j.lines.length - (orb === 'reroll' ? liveLocks(j, locks).length : 0)),
    locked: orb === 'reroll' ? liveLocks(j, locks).length : 0,
    cost: feedCost(j, cd, locks),
    addable: Object.keys(pool).filter((k) => !onJewel.has(k)),
  }
  if (orb === 'tierUp' && !out.max && j.lines.length) {
    let lo = 0
    j.lines.forEach((l, i) => { if (lineTier(l) < lineTier(j.lines[lo])) lo = i })
    const l = j.lines[lo], p = pool[l.stat]
    out.tierUp = { from: l, to: makeLine(l.stat, p?.base ?? l.base ?? l.val, (lineTier(l) + 1) as LineTier, p?.whole ?? Number.isInteger(l.val)) }
  }
  return out
}
/** Feed one card to a jewel: its stats join the pool, then it acts by tier.
 *  🔒 locks (stat keys) only matter for a 🃏 reroll: those lines stay as they are and cost JEWEL.lockCost more cards each. */
export function feedJewel(s: JewelSave, jewelId: string, cardId: string, rnd: () => number = Math.random, locks: readonly string[] = []): FeedResult {
  const j = s.jewels?.find((x) => x.id === jewelId)
  const cd = cardById(cardId)
  if (!j) return { ok: false, why: 'noJewel' }
  if (!cd) return { ok: false, why: 'short' }
  const cost = feedCost(j, cd, locks)
  if ((s.cards?.[cardId] ?? 0) < cost) return { ok: false, why: 'short' }
  if (feedCheck(j, cd, locks) === 'max') return { ok: false, why: 'max' }
  takeCard(s, cardId, cost)
  mergePool(j.pool, cardPool(cd))
  const orb = ORB_OF[cd.tier]
  if (orb === 'reroll') {
    const keep = new Set(liveLocks(j, locks))
    const kept = j.lines.filter((l) => keep.has(l.stat))
    const fresh = rollLines(j.pool, Math.max(1, j.lines.length - kept.length), rnd, kept)
    // locked lines keep their slot; new lines fill the open slots in order
    let f = 0
    j.lines = j.lines.length ? j.lines.map((l) => (keep.has(l.stat) ? l : fresh[f++])).filter((l): l is RefineLine => !!l) : fresh
  }
  else if (orb === 'addLine') {
    const l = rollJewelLine(j.pool, new Set(j.lines.map((x) => x.stat)), rnd)
    if (l) j.lines.push(l)
  } else {
    let lo = 0
    j.lines.forEach((l, i) => { if (lineTier(l) < lineTier(j.lines[lo])) lo = i })
    const l = j.lines[lo], t = (lineTier(l) + 1) as LineTier, p = j.pool[l.stat]
    j.lines[lo] = makeLine(l.stat, p?.base ?? l.base ?? l.val, t, p?.whole ?? Number.isInteger(l.val))
  }
  return { ok: true, orb, jewel: j }
}

// ---------- sockets (passive-tree nodes of kind 'socket') ----------
export const isSocketNode = (job: JobId, nodeId: string) => passiveNodeById(job, nodeId)?.kind === 'socket'
/** Which socket a jewel sits in (undefined = in the bag). */
export const socketOfJewel = (s: JewelSave, jewelId: string) => Object.entries(s.jewelSock ?? {}).find(([, j]) => j === jewelId)?.[0]
/** Put a jewel into a socket node (moves it from another socket; the jewel already there goes back to the bag). */
export function socketJewel(s: JewelSave, nodeId: string, jewelId: string): boolean {
  if (!s.job || !isSocketNode(s.job, nodeId) || !s.jewels?.some((j) => j.id === jewelId)) return false
  const sock = (s.jewelSock ??= {})
  const from = socketOfJewel(s, jewelId)
  if (from) delete sock[from]
  sock[nodeId] = jewelId
  return true
}
export function unsocketJewel(s: JewelSave, nodeId: string) {
  if (s.jewelSock) delete s.jewelSock[nodeId]
}
/** Jewels that give stats: in a socket node the hero has allocated (connected) on the current job's tree. */
export function activeJewels(s: JewelSave): Jewel[] {
  if (!s.job || !s.jewelSock) return []
  const open = new Set(normalizePassiveNodes(s.job, s.passiveNodes))
  return Object.entries(s.jewelSock)
    .filter(([node]) => open.has(node) && isSocketNode(s.job!, node))
    .map(([, id]) => s.jewels?.find((j) => j.id === id))
    .filter((j): j is Jewel => !!j)
}
/** A jewel's lines as stat patches: base stats, flat / ratio mods, and % HP / ATK / M.ATK. */
export function jewelStats(j: Jewel): { base: Partial<Record<BaseStat, number>>; mod: Partial<Stats>; pct: { maxHp?: number; atk?: number; matk?: number } } {
  const base: Partial<Record<BaseStat, number>> = {}, mod: Partial<Stats> = {}, pct: { maxHp?: number; atk?: number; matk?: number } = {}
  for (const l of j.lines) {
    if (BASES.has(l.stat)) base[l.stat as BaseStat] = (base[l.stat as BaseStat] ?? 0) + l.val
    else if (PCT_BACK[l.stat]) pct[PCT_BACK[l.stat]] = r3((pct[PCT_BACK[l.stat]] ?? 0) + l.val)
    else mod[l.stat as keyof Stats] = r3((mod[l.stat as keyof Stats] ?? 0) + l.val)
  }
  return { base, mod, pct }
}
/** Best tier on a jewel (its color in lists). */
export const jewelTier = (j: Jewel): LineTier => j.lines.reduce<LineTier>((a, l) => Math.max(a, lineTier(l)) as LineTier, 0)
