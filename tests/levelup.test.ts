import test from 'node:test'
import assert from 'node:assert/strict'
import { gemsToLevel, jobTrackOf, levelCost, levelRoom, levelsFor } from '../src/data/levelup'
import { JOB_CHANGE } from '../src/data/jobs'
import { JOB2_RULES } from '../src/data/jobs2'
import { FREE_GEMS, JOB_RULES, LEVEL_GEM_COST, LEVEL_PACKS, STAT_RULES } from '../src/data/meta'

const mk = (over: Record<string, unknown> = {}) => ({
  gems: 1000, baseLevel: 1, baseXp: 7, statPoints: 0, job: 'novice', jobLevel: 1, jobXp: 5, skillPoints: 0,
  job2: undefined, job2Level: undefined, job2Xp: undefined, job2Points: undefined,
  job3: undefined, job3Level: undefined, job3Xp: undefined, job3Points: undefined, ...over,
}) as unknown as Parameters<typeof gemsToLevel>[0]

test('base: pays, +levels, +stat points, EXP reset', () => {
  const s = mk()
  assert.equal(gemsToLevel(s, 'base', 5), 5)
  assert.equal(s.baseLevel, 6); assert.equal(s.baseXp, 0)
  assert.equal(s.statPoints, 5 * STAT_RULES.pointsPerLevel)
  assert.equal(s.gems, 1000 - 5 * LEVEL_GEM_COST.base)
})

test('job (novice): +skill points, capped at the novice max, only fitting levels are charged', () => {
  const s = mk({ gems: 10_000 })
  assert.equal(gemsToLevel(s, 'job', 100), JOB_RULES.maxJobLevel - 1)
  assert.equal(s.jobLevel, JOB_RULES.maxJobLevel); assert.equal(s.skillPoints, JOB_RULES.maxJobLevel - 1)
  assert.equal(s.gems, 10_000 - (JOB_RULES.maxJobLevel - 1) * LEVEL_GEM_COST.job)
  assert.equal(gemsToLevel(s, 'job', 1), 0) // full
})

test('job (class) uses the class cap; job2 / job3 tracks bump their own level + points', () => {
  assert.equal(levelRoom(mk({ job: 'mage', jobLevel: 10 }), 'job'), JOB_CHANGE.classMaxJobLevel - 10)
  const j2 = mk({ job: 'mage', jobLevel: 40, job2: 'wizard', job2Level: 3 })
  assert.equal(jobTrackOf(j2), 'job2')
  assert.equal(gemsToLevel(j2, 'job', 2), 2)
  assert.equal(j2.job2Level, 5); assert.equal(j2.job2Points, 2); assert.equal(j2.jobLevel, 40)
  assert.equal(levelRoom(mk({ job2: 'wizard', job2Level: JOB2_RULES.maxJobLevel }), 'job'), 0)
})

test('cannot pay -> nothing moves', () => {
  const s = mk({ gems: LEVEL_GEM_COST.base - 1 })
  assert.equal(gemsToLevel(s, 'base', 1), 0)
  assert.equal(s.gems, LEVEL_GEM_COST.base - 1); assert.equal(s.baseLevel, 1); assert.equal(s.baseXp, 7)
})

test('bad pack sizes never move anything', () => {
  for (const n of [0, -3, 1.5, NaN]) {
    const s = mk()
    assert.equal(gemsToLevel(s, 'base', n), 0); assert.equal(gemsToLevel(s, 'job', n), 0)
    assert.equal(s.gems, 1000); assert.equal(s.baseLevel, 1); assert.equal(s.jobLevel, 1)
  }
})

test('base level never passes the max; price matches what it charges', () => {
  const s = mk({ baseLevel: STAT_RULES.maxBaseLevel - 2 })
  assert.equal(levelsFor(s, 'base', 10), 2)
  assert.equal(levelCost(s, 'base', 10), 2 * LEVEL_GEM_COST.base)
  assert.equal(gemsToLevel(s, 'base', 10), 2)
  assert.equal(s.baseLevel, STAT_RULES.maxBaseLevel)
})

test('a bought level costs more gems than a level-up pays back; packs are sane', () => {
  assert.ok(LEVEL_GEM_COST.base > FREE_GEMS.levelUp && LEVEL_GEM_COST.job > 0)
  assert.ok(LEVEL_PACKS.every((n) => Number.isInteger(n) && n > 0))
})
