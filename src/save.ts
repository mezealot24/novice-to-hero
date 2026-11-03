// One save slot in localStorage. Every read/write is guarded: private windows and sandboxed hosts
// may throw or start empty, and the game must still run (it just won't remember).
import { JOB_CHANGE, type JobId } from './data/jobs'
import { FREE_GEMS, JOB_RULES, RACES, STAT_RULES, type BaseStat, type RaceId, type SkillId, EMPTY_ITEM, type EquipSlot, itemById, slotKind } from './data/meta'

export interface SaveData {
  v: 1
  name: string
  race: RaceId
  baseLevel: number
  baseXp: number
  statPoints: number
  jobLevel: number
  jobXp: number
  skillPoints: number
  skills: Record<SkillId, number>
  job: JobId
  jobSkills: { auto: number; ult: number } // retired in skill web v1 (always 1/1): power now comes from the web's +power nodes
  jobTree?: Record<string, number> // skill web node -> level (data/tree.ts, design/skill-web-v1.md), current job only
  web?: 1 // save migrated to the skill web (v27)
  webRefund?: number // skill points refunded by that migration, shown once in town
  jobTalents?: Record<string, { id: string; rank: number }> // talent row "1".."4" -> pick + rank; Talent Points are derived from Job Lv (data/tree.ts)
  stats: Record<BaseStat, number>
  zeny: number
  gems: number
  owned: string[] // item ids
  equipped: Record<EquipSlot, string> // head / offhand / acc2 added in the equipment-screen update (filled on load)
  costumes: string[]
  costume: string
  supporter: boolean
  clears: number
  bestRoom: number
  clearsBy?: Record<string, number> // per dungeon id (d1, d2, ...)
  cards?: Record<string, number> // equipment cards in the bag (not slotted), by card id (data/cards.ts)
  sockets?: Record<string, string[]> // item id -> card ids slotted in it
  cardPity?: Record<string, number> // kills of that card's monster since its last drop
  cardSeen?: string[] // card book: every card ever found
  lastDaily: string // yyyy-mm-dd of last free daily gems
  muted: boolean
  lowShake?: boolean // settings: ลดจอสั่น (camera shake x1/3)
}

const KEY = 'novice-to-hero.save.v1'
let cache: SaveData | null = null

export function newSave(name: string, race: RaceId): SaveData {
  const s = STAT_RULES.start
  return {
    v: 1, web: 1, name, race, baseLevel: 1, baseXp: 0, statPoints: 3,
    jobLevel: 1, jobXp: 0, skillPoints: 0, skills: { smash: 1, firstaid: 0, tough: 0 }, job: 'novice', jobSkills: { auto: 1, ult: 1 },
    stats: { str: s, vit: s, wis: s, dex: s, int: s, luk: s, agi: s },
    zeny: 100, gems: 0,
    owned: ['knife', 'cloth', 'none', 'none_head', 'none_off'], equipped: { weapon: 'knife', armor: 'cloth', acc: 'none', head: 'none_head', offhand: 'none_off', acc2: 'none' },
    costumes: ['default'], costume: 'default', supporter: false,
    clears: 0, bestRoom: 0, lastDaily: '', muted: false,
  }
}

export function hasSave(): boolean {
  if (cache) return true
  try { return !!localStorage.getItem(KEY) } catch { return false }
}

export function load(): SaveData | null {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as SaveData
    if (s.v !== 1 || !RACES[s.race]) return null
    if (s.stats.wis === undefined) s.stats.wis = STAT_RULES.start // saves from before WIS existed
    if (!s.job) { s.job = 'novice'; s.jobSkills = { auto: 1, ult: 1 } }
    if (!s.web) migrateToWeb(s)
    migrateGear(s)
    cache = s
    return s
  } catch { return null }
}

/** Saves from before the 6-slot equipment screen only had weapon / armor / acc: add the new empty slots.
 * Additive only (nothing is removed), so it is safe to run on every load. Card sockets are keyed by item
 * id, so they need no change. */
function migrateGear(s: SaveData) {
  const eq = (s.equipped ??= { weapon: 'knife', armor: 'cloth', acc: 'none', head: 'none_head', offhand: 'none_off', acc2: 'none' })
  eq.head ??= 'none_head'; eq.offhand ??= 'none_off'; eq.acc2 ??= 'none'
  eq.acc ??= 'none'
  for (const id of ['none', 'none_head', 'none_off']) if (!s.owned.includes(id)) s.owned.push(id)
  if (eq.acc2 !== 'none' && eq.acc2 === eq.acc) eq.acc2 = 'none' // one copy of each item: never worn twice
}

/** Wear an item. Accessories: `slot` picks the side; with no side it fills an empty side first. The same
 * accessory can't be on both sides (one copy per id), so it moves over instead. */
export function equip(s: SaveData, itemId: string, slot?: EquipSlot) {
  const kind = itemById(itemId).slot
  let at: EquipSlot = slot ?? kind
  if (kind === 'acc' && !slot) at = s.equipped.acc === 'none' || s.equipped.acc2 !== 'none' ? 'acc' : 'acc2'
  if (slotKind(at) !== kind) return
  if (kind === 'acc' && itemId !== 'none') {
    const other: EquipSlot = at === 'acc' ? 'acc2' : 'acc'
    if (s.equipped[other] === itemId) s.equipped[other] = 'none'
  }
  s.equipped[at] = itemId
}
/** Is this item worn in any slot? */
export const isWorn = (s: SaveData, itemId: string) => Object.values(s.equipped).includes(itemId)
/** Take an item off (back to the empty item of that slot; weapon/armor have none, so they stay). */
export function unequip(s: SaveData, slot: EquipSlot) {
  const empty = EMPTY_ITEM[slotKind(slot)]
  if (empty) s.equipped[slot] = empty
}

/** The current save; scenes after the title can rely on it existing. */
export function save(): SaveData {
  if (!cache) cache = load() ?? newSave('โนวิส', 'human')
  return cache
}

export function setSave(s: SaveData) { cache = s; persist() }

export function persist() {
  if (!cache) return
  try { localStorage.setItem(KEY, JSON.stringify(cache)) } catch { /* storage blocked: keep playing in memory */ }
}

/** v27 skill web: class skill levels and the old tree become web nodes with new rules, so refund every point once. */
function migrateToWeb(s: SaveData) {
  const back = s.job === 'novice' ? 0 : Math.max(0, (s.jobSkills?.auto ?? 1) - 1) + Math.max(0, (s.jobSkills?.ult ?? 1) - 1) + resetTree(s)
  s.skillPoints += back
  if (back > 0) s.webRefund = back
  s.jobSkills = { auto: 1, ult: 1 }
  s.web = 1
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export function wipe() {
  cache = null
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

/** Adds Base + Job EXP; returns how many Base / Job levels were gained. */
export function addXp(n: number): { base: number; job: number } {
  const s = save()
  let ups = 0, jobUps = 0
  const maxJob = s.job === 'novice' ? JOB_RULES.maxJobLevel : JOB_CHANGE.classMaxJobLevel
  n = Math.round(n * RACES[s.race].expMul)
  s.baseXp += n
  if (s.jobLevel < maxJob) s.jobXp += n
  while (s.jobLevel < maxJob && s.jobXp >= JOB_RULES.jobXpNeed(s.jobLevel)) {
    s.jobXp -= JOB_RULES.jobXpNeed(s.jobLevel)
    s.jobLevel++
    s.skillPoints++
    jobUps++
  }
  if (s.jobLevel >= maxJob) s.jobXp = 0
  while (s.baseLevel < STAT_RULES.maxBaseLevel && s.baseXp >= STAT_RULES.baseXpNeed(s.baseLevel)) {
    s.baseXp -= STAT_RULES.baseXpNeed(s.baseLevel)
    s.baseLevel++
    s.statPoints += STAT_RULES.pointsPerLevel
    s.gems += FREE_GEMS.levelUp
    ups++
  }
  return { base: ups, job: jobUps }
}

export const today = () => new Date().toISOString().slice(0, 10)

export const canChangeJob = (s: SaveData) => s.job === 'novice' && s.clears >= JOB_CHANGE.needClears

/** Become a base class. Job Lv restarts at 1; the skill web starts empty. Novice skill points carry over. */
export function changeJob(job: JobId) {
  const s = save()
  s.skillPoints += resetTree(s) // the skill web holds every class point (refund on a re-pick)
  s.jobTalents = {}
  s.job = job
  s.jobLevel = 1; s.jobXp = 0
  s.jobSkills = { auto: 1, ult: 1 }
  persist()
}

/** Free skill tree reset: clears the tree and returns the points it held (not yet added back). */
export function resetTree(s: SaveData): number {
  const n = Object.values(s.jobTree ?? {}).reduce((a, v) => a + v, 0)
  s.jobTree = {}
  return n
}

// ---------- equipment cards (data/cards.ts, design/equipment-cards.md) ----------
export function addCard(s: SaveData, id: string, n = 1) {
  const bag = (s.cards ??= {})
  bag[id] = (bag[id] ?? 0) + n
  const seen = (s.cardSeen ??= [])
  if (!seen.includes(id)) seen.push(id)
}
/** Put a card from the bag into the first free slot of an item. */
export function socketCard(s: SaveData, itemId: string, cardId: string, max: number): boolean {
  const bag = (s.cards ??= {}), sock = ((s.sockets ??= {})[itemId] ??= [])
  if ((bag[cardId] ?? 0) <= 0 || sock.length >= max) return false
  bag[cardId]--
  if (bag[cardId] <= 0) delete bag[cardId]
  sock.push(cardId)
  return true
}
/** Take one card out (free, the card goes back to the bag). */
export function unsocketCard(s: SaveData, itemId: string, index: number) {
  const sock = s.sockets?.[itemId]
  if (!sock || index >= sock.length) return
  const [id] = sock.splice(index, 1)
  addCard(s, id)
  if (!sock.length) delete s.sockets![itemId]
}
/** Every card in an item back to the bag (before the item is sold). */
export function unsocketAll(s: SaveData, itemId: string) {
  while (s.sockets?.[itemId]?.length) unsocketCard(s, itemId, 0)
}
