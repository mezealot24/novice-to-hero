// v86 Cleric talent row II แสงรุ่งอรุณ (Q 2026-11-06): replaces the 3 ult talents, 4 ranks. Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { heroStats } from '../src/data/meta'
import { KIT } from '../src/data/skill-math'
import { talentFree, talentsOf } from '../src/data/tree'
import { migrateHiddenTalents, newSave } from '../src/save'

const base = { race: 'human', stats: { str: 5, vit: 5, wis: 5, dex: 5, int: 5, luk: 5, agi: 5 }, equipped: {}, skills: {}, job: 'cleric', jobLevel: 40 } as never
const withTal = (rank: number) => ({ ...(base as object), jobTalents: { 2: { id: 'cleric_t2_dawnlight', rank } } }) as never

test('row II is only แสงรุ่งอรุณ (4 ranks), the old ult talents are hidden', () => {
  const row = talentsOf('cleric', 2)
  assert.deepEqual(row.map((x) => x.id), ['cleric_t2_dawnlight'])
  assert.equal(row[0].max, 4)
  for (let r = 1; r <= 4; r++) assert.match(row[0].desc(r), /STR \+ WIS/)
})

test('rank sets clDawn; numbers climb by rank', () => {
  assert.equal(heroStats(base).clDawn, 0)
  for (let r = 1; r <= 4; r++) assert.equal(heroStats(withTal(r)).clDawn, r)
  const D = KIT.clericTree.dawn
  assert.equal(D.every, 3)
  for (let i = 1; i < 4; i++) { assert.ok(D.crit[i] > D.crit[i - 1]); assert.ok(D.heal[i] > D.heal[i - 1]) }
  assert.ok(D.weak > 0 && D.weak < 1)
})

test('save: old row II picks are dropped (their TP come back), other rows stay', () => {
  const s = newSave('t', 'human')
  s.job = 'cleric'; s.jobLevel = 40
  s.jobTalents = { 1: { id: 'cleric_t1_focus', rank: 2 }, 2: { id: 'cleric_t2_holy', rank: 2 } }
  assert.equal(talentFree(s.jobTalents, 40), 4)
  migrateHiddenTalents(s)
  assert.deepEqual(Object.keys(s.jobTalents), ['1'])
  assert.equal(talentFree(s.jobTalents, 40), 6)
})
