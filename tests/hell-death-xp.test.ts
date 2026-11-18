import test from 'node:test'
import assert from 'node:assert/strict'
import { loseXp, newSave, setSave } from '../src/save'
import { JOB_RULES, STAT_RULES } from '../src/data/meta/stat-spec'
import { RULES } from '../src/data/stats'
import { HELL_MODE } from '../src/data/hell'

test('😈 hell death: loses 5% Base / 10% Job of the current bar, floored at 0, never de-levels', () => {
  assert.equal(RULES.hellDeathBase, 0.05); assert.equal(RULES.hellDeathJob, 0.1); assert.equal(HELL_MODE.bossCardMul, 2)
  const s = newSave('t', 'human')
  Object.assign(s, { baseLevel: 30, baseXp: STAT_RULES.baseXpNeed(30) / 2, jobLevel: 20, jobXp: 3 })
  setSave(s)
  const lost = loseXp(RULES.hellDeathBase, RULES.hellDeathJob)
  assert.equal(lost.base, Math.round(0.05 * STAT_RULES.baseXpNeed(30)))
  assert.equal(lost.job, 3) // only 3 in the bar: floors at 0
  assert.equal(s.jobXp, 0); assert.equal(s.jobLevel, 20); assert.equal(s.baseLevel, 30)
  assert.ok(JOB_RULES.jobXpNeed(20) * 0.1 > 3)
})
