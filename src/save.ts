// One save slot in localStorage. Every read/write is guarded: private windows and sandboxed hosts
// may throw or start empty, and the game must still run (it just won't remember).
import { JOB_CHANGE, type JobId } from './data/jobs'
import { JOB2, JOB2_RULES, type Job2Id, type PetId } from './data/jobs2'
import type { RefineLine } from './data/craft'
import type { ModeRecord } from './data/modes'
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
  job2?: Job2Id // 2nd job on top of `job` (design/second-jobs-v1.md); undefined = not yet
  job2Level?: number // Job2 Lv 1..JOB2_RULES.maxJobLevel (kept on a re-pick)
  job2Xp?: number
  job2Points?: number // free ใยชั้น 2 points (1 per Job2 Lv)
  job2Tree?: Record<string, number> // ใยชั้น 2 node -> level (data/tree.ts TREE2)
  pet?: PetId // 🐺 Beastmaster companion (picked in town, free to change); undefined = hawk
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
  hardClearsBy?: Record<string, number> // hard-mode clears per dungeon id (v47)
  cards?: Record<string, number> // equipment cards in the bag (not slotted), by card id (data/cards.ts)
  sockets?: Record<string, string[]> // item id -> card ids slotted in it
  cardPity?: Record<string, number> // kills of that card's monster since its last drop
  cardSeen?: string[] // card book: every card ever found
  mats?: Record<string, number> // forge materials by id (data/materials.ts)
  grade?: Record<string, number> // item id -> forge grade 2..5 (missing = 1, data/craft.ts)
  refine?: Record<string, number> // item id -> refine +1..+10 (missing = +0, data/refine.ts)
  broken?: string[] // item ids broken by a failed refine: no stats / cards until repaired
  refinePity?: Record<string, number> // item id -> failed refines in a row
  refineLines?: Record<string, RefineLine[]> // item id -> bonus lines from +5 / +7 / +10 (index 0 / 1 / 2)
  refineGems?: string[] // "itemId:7" / "itemId:10": free refine gems already paid out (kept after selling)
  reroll?: { item: string; idx: number; line: RefineLine } // a rerolled line waiting for keep-old / take-new
  fodder?: Record<string, number> // basic shop items kept as forge fodder, by item id (counts)
  modes?: Record<string, ModeRecord> // game modes v51 (data/modes.ts): tower bestFloor / clears, daily lastSeed (YYYYMMDD) / clears
  fortune?: number // Fortune meter 0..100 (data/events.ts FORTUNE), kept across runs: full = the next event is a JACKPOT
  lastDaily: string // yyyy-mm-dd of last free daily gems
  muted: boolean
  lowShake?: boolean // settings: ลดจอสั่น (camera shake x1/3)
  autoUlt?: 'auto' | 'manual' // v55 settings: ult casts itself (default) or waits for the ult button
}

/** v55: ult mode, default auto (Q found the manual ult button confusing). */
export function ultMode(s: SaveData = save()): 'auto' | 'manual' { return s.autoUlt ?? 'auto' }

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
    migrateThiefWeb(s)
    migrateGear(s)
    s.modes ??= {} // v51 game modes: additive, old saves start with no records
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
  hooks.persist?.()
}

/** Cloud sync (cloud.ts) listens here so save.ts never imports the network layer. localStorage stays the cache + offline fallback. */
const hooks: { persist?: () => void; wipe?: () => void } = {}
export function setSaveHooks(h: typeof hooks) { Object.assign(hooks, h) }
/** The raw JSON of this device's save (what would be uploaded), or null. */
export function localJson(): string | null { try { return localStorage.getItem(KEY) } catch { return null } }
/** Replace this device's save with a cloud copy: write it, then load() it again so the migrations run. */
export function adopt(data: unknown): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { return false }
  cache = null
  return load() !== null
}

/** v42 Thief rework (Q 2026-11-03): D.Strike max 10 -> 5 and gates ทักษะ 2. Refund the extra D.Strike points, and the ทักษะ 2 points of a save that took one before D.Strike was full. */
function migrateThiefWeb(s: SaveData) {
  const t = s.jobTree
  if (s.job !== 'thief' || !t) return
  let back = 0
  if ((t.thief_core1 ?? 0) > 5) { back += t.thief_core1 - 5; t.thief_core1 = 5 }
  if ((t.thief_core1 ?? 0) < 5) for (const id of Object.keys(t)) if (/^th_(smoke|pick|wound)/.test(id) && t[id] > 0) { back += t[id]; delete t[id] }
  s.skillPoints += back
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
  hooks.wipe?.()
}

/** Adds Base + Job EXP; returns how many Base / Job levels were gained. */
export function addXp(n: number): { base: number; job: number } {
  const s = save()
  let ups = 0, jobUps = 0
  const maxJob = s.job === 'novice' ? JOB_RULES.maxJobLevel : JOB_CHANGE.classMaxJobLevel
  n = Math.round(n * RACES[s.race].expMul)
  s.baseXp += n
  if (s.job2) { // 2nd job: Job EXP goes to Job2 Lv (the base class is maxed)
    const lv = s.job2Level ?? 1
    if (lv < JOB2_RULES.maxJobLevel) s.job2Xp = (s.job2Xp ?? 0) + n
    while ((s.job2Level ?? 1) < JOB2_RULES.maxJobLevel && (s.job2Xp ?? 0) >= JOB_RULES.jobXpNeed(s.job2Level ?? 1)) {
      s.job2Xp! -= JOB_RULES.jobXpNeed(s.job2Level ?? 1)
      s.job2Level = (s.job2Level ?? 1) + 1
      s.job2Points = (s.job2Points ?? 0) + 1
      jobUps++
    }
    if ((s.job2Level ?? 1) >= JOB2_RULES.maxJobLevel) s.job2Xp = 0
  }
  if (!s.job2 && s.jobLevel < maxJob) s.jobXp += n
  while (!s.job2 && s.jobLevel < maxJob && s.jobXp >= JOB_RULES.jobXpNeed(s.jobLevel)) {
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

export const canRepickJob = (s: SaveData) => s.job !== 'novice'

// ---------- 2nd jobs (design/second-jobs-v1.md, Q 2026-11-05: Job Lv 40 + ดัน 5 cleared) ----------
export const job2Ready = (s: SaveData) => s.job !== 'novice' && s.jobLevel >= JOB2_RULES.unlockJobLv && (s.clearsBy?.[JOB2_RULES.unlockClear] ?? 0) > 0
export const canChangeJob2 = (s: SaveData) => job2Ready(s) && !s.job2
/** Why the 2nd job is still locked ('' = open). */
export function job2Lock(s: SaveData): string {
  if (s.job === 'novice') return 'เปลี่ยนอาชีพแรกก่อน'
  const need: string[] = []
  if (s.jobLevel < JOB2_RULES.unlockJobLv) need.push(`Job Lv ${s.jobLevel}/${JOB2_RULES.unlockJobLv}`)
  if (!((s.clearsBy?.[JOB2_RULES.unlockClear] ?? 0) > 0)) need.push('เคลียร์ดัน 5')
  return need.join(' · ')
}
/** Pick a 2nd job. First time: Job2 Lv 1, no points. A re-pick (gems, or free after a base re-pick) keeps Job2 Lv: web points come back. */
export function changeJob2(id: Job2Id, gems = 0): boolean {
  const s = save()
  if (!job2Ready(s) || JOB2[id].parent !== s.job || id === s.job2 || s.gems < gems) return false
  s.gems -= gems
  s.job2Points = (s.job2Points ?? 0) + resetTree2(s)
  s.job2 = id
  s.job2Level ??= 1; s.job2Xp ??= 0
  persist()
  return true
}
/** Free ใยชั้น 2 reset: clears it and returns the points it held (not yet added back). */
export function resetTree2(s: SaveData): number {
  const n = Object.values(s.job2Tree ?? {}).reduce((a, v) => a + v, 0)
  s.job2Tree = {}
  return n
}

/** Class -> another base class for JOB_CHANGE.repickGems (Q 2026-11-04). Unlike changeJob, Job Lv + EXP stay:
 *  skill points are earned per Job Lv, so restarting Job Lv while keeping the points would let every re-pick farm
 *  them again. Web points come back as skill points, talents clear (derived from Job Lv, re-place free).
 *  Base Lv, stat points, items, cards, zeny and the remaining gems are untouched. False (nothing spent) when short. */
export function repickJob(job: JobId): boolean {
  const s = save()
  if (!canRepickJob(s) || job === s.job || job === 'novice' || s.gems < JOB_CHANGE.repickGems) return false
  s.gems -= JOB_CHANGE.repickGems
  s.skillPoints += resetTree(s)
  s.jobTalents = {}
  if (s.job2) { s.job2Points = (s.job2Points ?? 0) + resetTree2(s); s.job2 = undefined } // the new class picks its own 2nd job free (Job2 Lv kept)
  s.job = job
  s.jobSkills = { auto: 1, ult: 1 }
  persist()
  return true
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

// ---------- forge: materials + grades (data/materials.ts, data/craft.ts) ----------
export function addMat(s: SaveData, id: string, n = 1) {
  const bag = (s.mats ??= {})
  bag[id] = (bag[id] ?? 0) + n
}
export const canPay = (s: SaveData, c: { mats: Record<string, number>; zeny: number }) =>
  s.zeny >= c.zeny && Object.entries(c.mats).every(([id, n]) => (s.mats?.[id] ?? 0) >= n)
/** Spend a forge cost; false (and nothing spent) when short. */
export function pay(s: SaveData, c: { mats: Record<string, number>; zeny: number }): boolean {
  if (!canPay(s, c)) return false
  s.zeny -= c.zeny
  for (const [id, n] of Object.entries(c.mats)) { s.mats![id] -= n; if (s.mats![id] <= 0) delete s.mats![id] }
  return true
}

/** Forge fodder (basic shop items kept as counts, design 3.7). */
export function addFodder(s: SaveData, id: string, n = 1) {
  const bag = (s.fodder ??= {})
  bag[id] = (bag[id] ?? 0) + n
  if (bag[id] <= 0) delete bag[id]
}
/** Forget every forge record of an item that leaves the bag (sold / turned into fodder). */
export function forgetForge(s: SaveData, id: string) {
  if (s.grade) delete s.grade[id]
  if (s.refine) delete s.refine[id]
  if (s.refinePity) delete s.refinePity[id]
  if (s.refineLines) delete s.refineLines[id]
  if (s.broken) s.broken = s.broken.filter((x) => x !== id)
  if (s.reroll?.item === id) delete s.reroll
}
