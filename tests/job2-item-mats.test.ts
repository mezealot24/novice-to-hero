import test from 'node:test'
import assert from 'node:assert/strict'
import { gradeCost, matDungeon } from '../src/data/craft'
import { JOB2_RULES } from '../src/data/jobs2'
import { matById } from '../src/data/materials'
import { ITEMS } from '../src/data/meta'
import { refineCost, repairCost } from '../src/data/refine'

const job2Items = ITEMS.filter((it) => it.req === 'job2')

test('2nd-job gear exists', () => assert.ok(job2Items.length > 0))

test('2nd-job gear uses the mats of the dungeon that unlocks the 2nd job', () => {
  for (const it of job2Items) assert.equal(matDungeon(it), JOB2_RULES.unlockClear, it.id)
})

test('2nd-job gear climbs D5 -> D10 mats step by step (Q 2026-11-08)', () => {
  const it = job2Items[0], dg = (c: { mats: Record<string, number> }) => [...new Set(Object.keys(c.mats).map((id) => id.slice(2)))]
  assert.deepEqual(dg(refineCost(it, 1)), ['d5'])
  assert.deepEqual(dg(refineCost(it, 6)), ['d7'])
  assert.deepEqual(dg(refineCost(it, 9)), ['d9'])
  assert.deepEqual([2, 3, 4, 5].map((g) => dg(gradeCost(it, g))[0]), ['d5', 'd6', 'd8', 'd10'])
})

test('every forge cost on 2nd-job gear names a real material', () => {
  for (const it of job2Items) {
    const costs = [refineCost(it, 0), refineCost(it, 7), repairCost(it), gradeCost(it, 2), gradeCost(it, 5)]
    for (const c of costs) for (const id of Object.keys(c.mats)) assert.ok(matById(id), `${it.id}: unknown mat ${id}`)
  }
})
