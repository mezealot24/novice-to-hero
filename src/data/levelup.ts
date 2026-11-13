// 🧪 TEST ONLY: buy Base Lv / Job Lv with free gems (meta/economy.ts GEM_TO_LEVEL_TEST).
// Pure functions so the rules are unit-tested; the shop scene only calls these + persist().
// A bought level gives the same rewards as an earned one (stat / skill points) but no free-gem bonus, and resets that level's EXP.
import type { SaveData } from '../save'
import { JOB_CHANGE } from './jobs'
import { JOB2_RULES } from './jobs2'
import { activeJob3, JOB3_RULES } from './jobs3'
import { JOB_RULES, LEVEL_GEM_COST, STAT_RULES } from './meta'

export type LevelKind = 'base' | 'job'
type Wallet = Pick<SaveData, 'gems' | 'baseLevel' | 'baseXp' | 'statPoints' | 'job' | 'jobLevel' | 'jobXp' | 'skillPoints' | 'job2' | 'job2Level' | 'job2Xp' | 'job2Points' | 'job3' | 'job3Level' | 'job3Xp' | 'job3Points'>

/** Which Job Lv track earns EXP right now (same order as save.addXp: Job3 > Job2 > base class). */
export type JobTrack = 'job3' | 'job2' | 'job'
export const jobTrackOf = (s: Pick<SaveData, 'job2' | 'job3'>): JobTrack => (activeJob3(s) ? 'job3' : s.job2 ? 'job2' : 'job')

/** Levels still buyable on this track. */
export function levelRoom(s: Wallet, kind: LevelKind): number {
  if (kind === 'base') return Math.max(0, STAT_RULES.maxBaseLevel - s.baseLevel)
  const t = jobTrackOf(s)
  if (t === 'job3') return Math.max(0, JOB3_RULES.maxJobLevel - (s.job3Level ?? 1))
  if (t === 'job2') return Math.max(0, JOB2_RULES.maxJobLevel - (s.job2Level ?? 1))
  const max = s.job === 'novice' ? JOB_RULES.maxJobLevel : JOB_CHANGE.classMaxJobLevel
  return Math.max(0, max - s.jobLevel)
}

/** Levels a pack of `n` really gives (clamped to the room left). */
export const levelsFor = (s: Wallet, kind: LevelKind, n: number) => (Number.isInteger(n) && n > 0 ? Math.min(n, levelRoom(s, kind)) : 0)
/** Gem price of a pack of `n` levels (only the levels that fit are charged). */
export const levelCost = (s: Wallet, kind: LevelKind, n: number) => levelsFor(s, kind, n) * LEVEL_GEM_COST[kind]

/** Spend free gems for `n` levels. Returns the levels gained, or 0 if it could not pay / nothing to gain. */
export function gemsToLevel(s: Wallet, kind: LevelKind, n: number): number {
  const lv = levelsFor(s, kind, n), cost = lv * LEVEL_GEM_COST[kind]
  if (lv <= 0 || s.gems < cost) return 0
  s.gems -= cost
  if (kind === 'base') {
    s.baseLevel += lv; s.baseXp = 0; s.statPoints += lv * STAT_RULES.pointsPerLevel
    return lv
  }
  const t = jobTrackOf(s)
  if (t === 'job3') { s.job3Level = (s.job3Level ?? 1) + lv; s.job3Xp = 0; s.job3Points = (s.job3Points ?? 0) + lv }
  else if (t === 'job2') { s.job2Level = (s.job2Level ?? 1) + lv; s.job2Xp = 0; s.job2Points = (s.job2Points ?? 0) + lv }
  else { s.jobLevel += lv; s.jobXp = 0; s.skillPoints += lv }
  return lv
}
