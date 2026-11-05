// Phase 0 (balance devtools): XP curves read their numbers from tunable fields. Must equal the old hard-coded formulas.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RULES } from '../src/data/game-data'
import { JOB_RULES, STAT_RULES } from '../src/data/meta'
import { MON_STAT } from '../src/data/mon-stats'

test('account / job / run XP curves Lv 1-99 match the old formulas', () => {
  for (let lv = 1; lv <= 99; lv++) {
    assert.equal(STAT_RULES.baseXpNeed(lv), 25 + 15 * (lv - 1), `base ${lv}`)
    assert.equal(JOB_RULES.jobXpNeed(lv), 20 + 10 * (lv - 1), `job ${lv}`)
    assert.equal(RULES.xpNeed(lv), 4 + 3 * lv, `run ${lv}`)
  }
})

test('MON_STAT.pointsPerLv follows STAT_RULES.pointsPerLevel', () => {
  assert.equal(MON_STAT.pointsPerLv, 3)
  const old = STAT_RULES.pointsPerLevel
  try { STAT_RULES.pointsPerLevel = 5; assert.equal(MON_STAT.pointsPerLv, 5) } finally { STAT_RULES.pointsPerLevel = old }
})
