// One save slot in localStorage. Every read/write is guarded: private windows and sandboxed hosts
// may throw or start empty, and the game must still run (it just won't remember).
import { JOB_CHANGE, type JobId } from './data/jobs'
import { FREE_GEMS, JOB_RULES, RACES, STAT_RULES, type BaseStat, type RaceId, type SkillId, type Slot } from './data/meta'

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
  jobSkills: { auto: number; ult: number }
  jobTree?: Record<string, number> // skill tree node -> level (data/tree.ts), current job only
  jobTalents?: Record<string, { id: string; rank: number }> // talent row "1".."4" -> pick + rank; Talent Points are derived from Job Lv (data/tree.ts)
  stats: Record<BaseStat, number>
  zeny: number
  gems: number
  owned: string[] // item ids
  equipped: Record<Slot, string>
  costumes: string[]
  costume: string
  supporter: boolean
  clears: number
  bestRoom: number
  clearsBy?: Record<string, number> // per dungeon id (d1, d2, ...)
  lastDaily: string // yyyy-mm-dd of last free daily gems
  muted: boolean
}

const KEY = 'novice-to-hero.save.v1'
let cache: SaveData | null = null

export function newSave(name: string, race: RaceId): SaveData {
  const s = STAT_RULES.start
  return {
    v: 1, name, race, baseLevel: 1, baseXp: 0, statPoints: 3,
    jobLevel: 1, jobXp: 0, skillPoints: 0, skills: { smash: 1, firstaid: 0, tough: 0 }, job: 'novice', jobSkills: { auto: 1, ult: 1 },
    stats: { str: s, vit: s, wis: s, dex: s, int: s, luk: s, agi: s },
    zeny: 100, gems: 0,
    owned: ['knife', 'cloth', 'none'], equipped: { weapon: 'knife', armor: 'cloth', acc: 'none' },
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
    cache = s
    return s
  } catch { return null }
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

/** Become a base class. Job Lv restarts at 1; class skills start at Lv 1. Novice skill points carry over. */
export function changeJob(job: JobId) {
  const s = save()
  if (s.job !== 'novice') s.skillPoints += s.jobSkills.auto - 1 + s.jobSkills.ult - 1 // refund class skills on a re-pick
  s.skillPoints += resetTree(s)
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
