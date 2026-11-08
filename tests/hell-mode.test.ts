import test from 'node:test'
import assert from 'node:assert/strict'
import { HELL, HELL_MODE, hellify, hellOpen } from '../src/data/hell'
import { buildRun } from '../src/data/modes'
import { DUNGEONS } from '../src/data/game-data'
import { newSave } from '../src/save'
import { rollUniqueDrop, UNIQUE } from '../src/data/uniques'

const di = (id: string) => DUNGEONS.findIndex((d) => d.id === id)

test('😈 hell mode opens per D6-D10 dungeon after a 🔥 hard clear of it; never on D1-D5', () => {
  const s = newSave('t', 'human')
  const d6 = DUNGEONS[di('d6')], d3 = DUNGEONS[di('d3')]
  assert.equal(hellOpen(s, d6), false)
  s.hardClearsBy = { d6: 1, d3: 4 }
  assert.equal(hellOpen(s, d6), true)
  assert.equal(hellOpen(s, DUNGEONS[di('d7')]), false, 'only the dungeon that was cleared on hard')
  assert.equal(hellOpen(s, d3), false, 'D1-D5 have no hell mode (no level band)')
})

test('a hell run is a hard run flagged hell (tag 😈); a hell flag on D1-D5 is ignored', () => {
  const s = newSave('t', 'human')
  const r = buildRun(s, { d: di('d8'), hard: true, hell: true, seed: 7 })
  assert.equal(r.modeId, 'hard'); assert.equal(r.hell, true); assert.equal(r.tag, '😈')
  assert.ok(r.corrupt, 'keeps the hard corruption roll')
  assert.equal(buildRun(s, { d: di('d2'), hard: true, hell: true }).hell, false)
  assert.equal(buildRun(s, { d: di('d8'), hard: true, seed: 7 }).hell, false)
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
