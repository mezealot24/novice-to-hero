import test from 'node:test'
import assert from 'node:assert/strict'
import { addXp, changeJob2, changeJob3, job3Lock, job3Ready, job3SwapCost, newSave, setJob3Path, setJob3Variant, setSave, type SaveData } from '../src/save'
import { activeJob3, JOB3, JOB3_RULES } from '../src/data/jobs3'
import { JOB2, JOB2_RULES } from '../src/data/jobs2'
import { heroPower } from '../src/data/power'

/** A Crusader at Job2 Lv 50 with ดัน 10 cleared (Master Trial not yet won). */
function crusader(): SaveData {
  const s = newSave('t', 'human')
  Object.assign(s, { job: 'cleric', jobLevel: 40, job2: 'crusader', job2Level: JOB2_RULES.maxJobLevel, job2Xp: 0, job2Points: 0, job2Tree: {}, gems: 100,
    clearsBy: { d1: 1, d5: 1, d10: 1 }, clears: 10 })
  setSave(s)
  return s
}

test('Paladin is the Crusader 3rd job; the unlock needs Job2 Lv 50 + ดัน 10 + the Master Trial', () => {
  assert.equal(JOB3.paladin.parent, 'crusader')
  const s = crusader()
  assert.equal(job3Ready(s, 'paladin'), false)
  assert.equal(job3Lock(s, 'paladin'), 'ชนะ Master Trial')
  assert.equal(changeJob3('paladin'), false)
  s.job2Level = 49; s.clearsBy = { d5: 1 }
  assert.equal(job3Lock(s, 'paladin'), 'Job2 Lv 49/50 · เคลียร์ดัน 10 · ชนะ Master Trial')
  s.job2 = 'monk'
  assert.equal(job3Lock(s, 'paladin'), `ต้องเป็น ${JOB2.crusader.name}`)
})

test('awakening starts at Job3 Lv 1 (pure, variant A) and Job EXP then goes to Job3, not Job2', () => {
  const s = crusader(); s.job3Trial = { paladin: 1 }
  assert.equal(changeJob3('paladin'), true)
  assert.deepEqual([s.job3, s.job3Level, s.job3Points, s.job3Path, s.job3Var], ['paladin', 1, 0, 'pure', 'a'])
  assert.equal(changeJob3('paladin'), false, 'already on')
  const r = addXp(100_000)
  assert.equal(s.job3Level, JOB3_RULES.maxJobLevel)
  assert.equal(s.job3Points, JOB3_RULES.maxJobLevel - 1, '1 web point per Job3 Lv')
  assert.equal(s.job3Xp, 0)
  assert.equal(s.job2Level, 50); assert.equal(s.job2Points, 0, 'Job2 untouched')
  assert.ok(r.job >= 29)
})

test('a 2nd job re-pick parks the 3rd job (kept, off); coming back turns it on with everything kept', () => {
  const s = crusader(); s.job3Trial = { paladin: 1 }
  changeJob3('paladin'); s.job3Level = 12; s.job3Tree = { pa_x: 3 }
  assert.equal(changeJob2('monk', 30), true)
  assert.equal(s.job3, 'paladin'); assert.equal(activeJob3(s), undefined)
  addXp(500)
  assert.equal(s.job3Level, 12, 'parked 3rd job gets no EXP')
  s.gems = 100; assert.equal(changeJob2('crusader', 30), true)
  assert.equal(activeJob3(s), 'paladin'); assert.deepEqual(s.job3Tree, { pa_x: 3 })
})

test('path swap: free once a week (web points back), else 💎30; variant swap is free', () => {
  const s = crusader(); s.job3Trial = { paladin: 1 }; changeJob3('paladin')
  s.job3Tree = { pa_a: 2, pa_b: 1 }; s.job3Points = 4
  assert.equal(setJob3Path('hybrid', '2026-11-08'), true)
  assert.deepEqual([s.job3Path, s.job3Points, s.gems, s.job3SwapAt], ['hybrid', 7, 100, '2026-11-08'])
  assert.equal(job3SwapCost(s, '2026-11-10'), JOB3_RULES.pathSwapGems)
  assert.equal(setJob3Path('pure', '2026-11-10'), true)
  assert.equal(s.gems, 100 - JOB3_RULES.pathSwapGems)
  assert.equal(job3SwapCost(s, '2026-11-15'), 0, '7 days after the free swap')
  s.gems = 0; s.job3SwapAt = '2026-11-14'
  assert.equal(setJob3Path('hybrid', '2026-11-15'), false, 'short on 💎: nothing happens')
  assert.equal(setJob3Variant('b'), true); assert.equal(s.job3Var, 'b')
})

test('P1 adds no power yet: JOB3_K starts at 1.0', () => {
  const s = crusader(), before = heroPower(s)
  Object.assign(s, { job3: 'paladin', job3Level: 30, job3Trial: { paladin: 1 } })
  assert.equal(heroPower(s), before)
})
