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

test('1st-class shop gear climbs D1 -> D3 -> D5 (Q 2026-11-08: เมือกใสหายาก late game)', () => {
  const jobItems = ITEMS.filter((it) => it.req === 'job')
  assert.ok(jobItems.length > 0)
  const dg = (c: { mats: Record<string, number> }) => [...new Set(Object.keys(c.mats).map((id) => id.slice(2)))]
  for (const it of jobItems) {
    assert.deepEqual(dg(refineCost(it, 1)), ['d1'], it.id)
    assert.deepEqual(dg(refineCost(it, 6)), ['d3'], it.id)
    assert.deepEqual(dg(refineCost(it, 9)), ['d5'], it.id)
    assert.deepEqual([2, 3, 4].map((g) => dg(gradeCost(it, g))[0]), ['d1', 'd3', 'd5'], it.id)
    for (const c of [refineCost(it, 9), repairCost(it, 9), gradeCost(it, 4)]) for (const id of Object.keys(c.mats)) assert.ok(matById(id), `${it.id}: ${id}`)
  }
})

test('plain shop gear and dungeon gear keep their old mats', () => {
  const plain = ITEMS.find((it) => it.price > 0 && !it.req && !it.jobs && !it.craft && !it.unique)!
  assert.deepEqual(Object.keys(refineCost(plain, 9).mats).map((id) => id.slice(2)), ['d1', 'd1'])
  const d3 = ITEMS.find((it) => it.req === 'd3')!
  assert.ok(Object.keys(refineCost(d3, 9).mats).every((id) => id.endsWith('_d3')))
})
