// 📈 Job bonus stat (Q 2026-11-08, design/job-bonus-stat-v1.md): +1 per listed stat every 10 Job Lv, base class + 2nd job stack.
// Run: node tools/test.mjs job-bonus
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { jobBonusBase, jobUpText, JOB2_BONUS_STATS, JOB_BONUS_STATS } from '../src/data/meta'

test('novice gets nothing', () => {
  assert.deepEqual(Object.values(jobBonusBase({ job: 'novice', jobLevel: 10 })), [0, 0, 0, 0, 0, 0, 0])
})

test('base class: floor(Job Lv / 10) on its 2 stats, capped at Job Lv 40', () => {
  assert.equal(jobBonusBase({ job: 'swordsman', jobLevel: 9 }).str, 0)
  assert.equal(jobBonusBase({ job: 'swordsman', jobLevel: 10 }).str, 1)
  const b = jobBonusBase({ job: 'swordsman', jobLevel: 40 })
  assert.equal(b.str, 4); assert.equal(b.vit, 4); assert.equal(b.int, 0)
  assert.equal(jobBonusBase({ job: 'swordsman', jobLevel: 99 }).str, 4)
})

test('crusader Job2 Lv 50 stacks with the cleric bonus', () => {
  const b = jobBonusBase({ job: 'cleric', jobLevel: 40, job2: 'crusader', job2Level: 50 })
  assert.equal(b.str, 5) // crusader only
  assert.equal(b.vit, 5) // crusader only
  assert.equal(b.int, 4 + 5) // cleric + crusader
  assert.equal(b.wis, 4) // cleric only
})

test('every class lists 2 stats, every 2nd job 3 distinct stats', () => {
  for (const [id, k] of Object.entries(JOB_BONUS_STATS)) assert.equal(new Set(k).size, id === 'novice' ? 0 : 2, id)
  for (const [id, k] of Object.entries(JOB2_BONUS_STATS)) assert.equal(new Set(k).size, 3, id)
})

test('level-up line shows the bonus only when a 10 is crossed', () => {
  assert.match(jobUpText({ job: 'swordsman', jobLevel: 10 }, 1), /Job Lv 10!.*STR VIT \+1/)
  assert.doesNotMatch(jobUpText({ job: 'swordsman', jobLevel: 11 }, 1), /📈/)
  assert.match(jobUpText({ job: 'cleric', jobLevel: 40, job2: 'crusader', job2Level: 20 }, 1), /Job2 Lv 20!.*STR VIT INT \+1/)
})
