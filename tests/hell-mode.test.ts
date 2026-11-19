import test from 'node:test'
import assert from 'node:assert/strict'
import { HELL, HELL_MODE, hellify, hellLvCap, hellOpen, hellXpMul } from '../src/data/hell'
import { buildRun } from '../src/data/modes'
import { DUNGEONS } from '../src/data/game-data'
import { newSave } from '../src/save'
import { rollUniqueDrop, UNIQUE } from '../src/data/uniques'

const di = (id: string) => DUNGEONS.findIndex((d) => d.id === id)

test('😈 hell mode opens per level dungeon (v129: D1-D5 too) after a 🔥 hard clear of it', () => {
  const s = newSave('t', 'human')
  const d6 = DUNGEONS[di('d6')], d3 = DUNGEONS[di('d3')]
  assert.equal(hellOpen(s, d6), false)
  assert.equal(hellOpen(s, d3), false)
  s.hardClearsBy = { d6: 1, d3: 4 }
  assert.equal(hellOpen(s, d6), true)
  assert.equal(hellOpen(s, d3), true, 'D1-D5 open after their own hard clear')
  assert.equal(hellOpen(s, DUNGEONS[di('d7')]), false, 'only the dungeon that was cleared on hard')
  assert.equal(hellOpen(s, DUNGEONS[di('d1')]), false)
})

test('a hell run is a hard run flagged hell (tag 😈) on D1-D5 and D6+', () => {
  const s = newSave('t', 'human')
  const r = buildRun(s, { d: di('d8'), hard: true, hell: true, seed: 7 })
  assert.equal(r.modeId, 'hard'); assert.equal(r.hell, true); assert.equal(r.tag, '😈')
  assert.ok(r.corrupt, 'keeps the hard corruption roll')
  for (const id of ['d1', 'd2', 'd3', 'd4', 'd5']) {
    const h = buildRun(s, { d: di(id), hard: true, hell: true, seed: 3 })
    assert.equal(h.hell, true, id); assert.equal(h.tag, '😈'); assert.ok(h.corrupt, `${id} keeps the corruption roll`)
  }
  assert.equal(buildRun(s, { d: di('d8'), hard: true, seed: 7 }).hell, false)
  assert.equal(buildRun(s, { d: di('d2'), hell: true }).hell, false, 'hell needs hard')
})

test('😈 D1-D5 hell: a hero above the Hell band (top room Lv + HELL_MODE.lv) banks 1% EXP; D6+ no cap', () => {
  for (const id of ['d1', 'd2', 'd3', 'd4', 'd5']) {
    const d = DUNGEONS[di(id)], cap = hellLvCap(d)
    assert.equal(cap, d.level![1] + HELL_MODE.lv, id)
    assert.equal(hellXpMul(d, cap), 1, `${id}: at the cap = full EXP`)
    assert.equal(hellXpMul(d, cap + 1), HELL_MODE.overLvXp, `${id}: above the cap = 1%`)
  }
  assert.equal(HELL_MODE.overLvXp, 0.01)
  assert.equal(hellLvCap(DUNGEONS[di('d6')]), Infinity)
  assert.equal(hellXpMul(DUNGEONS[di('d6')], 99), 1)
})

test('😈 D1-D5 hell drops at the normal hell rates (unique pool, same rate as D6+)', () => {
  const r = (x: number) => () => x
  const at = (UNIQUE.dropRateHard + HELL_MODE.uniqueRate) / 2
  for (const id of ['d1', 'd2', 'd3', 'd4', 'd5']) {
    assert.equal(rollUniqueDrop(id, true, [], r(at)).kind, 'none', id)
    assert.notEqual(rollUniqueDrop(id, 'hell', [], r(at)).kind, 'none', id)
  }
})

test('hellify makes a stronger, richer copy and never touches the original; hell uniques drop more often', () => {
  const base = { name: 'x', hp: 1000, dmg: 50, xp: 100, ai: 'boss' } as Parameters<typeof hellify>[0]
  const h = hellify(base, 0.5)
  assert.equal(h.hp, Math.round(1000 * HELL.hp)); assert.equal(h.xp, Math.round(100 * HELL.xp)); assert.ok(h.hellish)
  assert.equal(base.hp, 1000)
  assert.ok(HELL_MODE.uniqueRate > UNIQUE.dropRateHard)
  const r = (x: number) => () => x
  const at = (UNIQUE.dropRateHard + HELL_MODE.uniqueRate) / 2 // between the two rates
  assert.equal(rollUniqueDrop('d8', true, [], r(at)).kind, 'none')
  assert.notEqual(rollUniqueDrop('d8', 'hell', [], r(at)).kind, 'none')
})
