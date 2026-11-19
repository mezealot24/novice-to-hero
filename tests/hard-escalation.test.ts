// v127 🔥 hard escalation (data/hard-escalation.ts). Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MONSTERS } from '../src/data/game-data'
import { statMonster } from '../src/data/mon-stats'
import { escalate, escalationAt, HARD_ESC, MON_BLESS_RED, MON_BLESS_YELLOW, MON_PERKS } from '../src/data/hard-escalation'

const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

test('stat points climb +10% per room; day 2 = 3 perks + HP 30%; day 3+ = 5 perks + 1 yellow; hell MVP = +50% / +50% / 1 red', () => {
  assert.equal(escalationAt(0, 1, false).pointsMul, 1)
  assert.ok(Math.abs(escalationAt(4, 1, false).pointsMul - 1.4) < 1e-9)
  assert.deepEqual([escalationAt(3, 1, false).perks, escalationAt(3, 1, false).hp], [0, 1])
  assert.deepEqual([escalationAt(6, 2, false).perks, escalationAt(6, 2, false).hp, escalationAt(6, 2, false).yellow], [3, 1.3, 0])
  for (const day of [3, 4, 6]) assert.deepEqual([escalationAt(9, day, false).perks, escalationAt(9, day, false).yellow], [5, 1], `day ${day}`)
  const mvp = escalationAt(10, 3, true)
  assert.ok(Math.abs(mvp.pointsMul - 2 * HARD_ESC.hellMvp.stat) < 1e-9 && Math.abs(mvp.hp - 1.3 * 1.5) < 1e-9 && mvp.red === 1)
})

test('more stat points = a stronger monster (pointsMul path)', () => {
  const d = MONSTERS.skeleton, a = statMonster(d, 11), b = statMonster({ ...d, pointsMul: 1.5 }, 11)
  assert.ok(b.hp > a.hp && b.dmg > a.dmg)
})

test('escalate: distinct perks, HP x, source untouched, passive skipped, no death blast on bosses', () => {
  const base = statMonster(MONSTERS.hellknight, 19), before = JSON.stringify(base)
  const r = escalate(base, escalationAt(8, 3, false), rng(7))
  assert.equal(JSON.stringify(base), before)
  assert.equal(r.def.hp, Math.round(base.hp * 1.3 * (r.names.includes('ร่างใหญ่') ? 1.15 : 1)))
  assert.equal(r.tag.match(/🟡/g)?.length, 1)
  assert.equal(r.names.split(' · ').length, 6)
  assert.equal(new Set(r.names.split(' · ')).size, 6)
  const gold = statMonster(MONSTERS.goldjellop, 3)
  assert.equal(escalate(gold, escalationAt(5, 3, false)).def, gold)
  for (let s = 1; s < 60; s++) assert.equal(escalate(statMonster(MONSTERS.lich, 21), escalationAt(9, 3, true), rng(s)).def.deathBlast, MONSTERS.lich.deathBlast)
  const mvp = escalate(statMonster(MONSTERS.lich, 21), escalationAt(9, 3, true), rng(3))
  assert.equal(mvp.tag.match(/🔴/g)?.length, 1)
  assert.ok(MON_PERKS.length >= 10 && MON_BLESS_YELLOW.length >= 4 && MON_BLESS_RED.length >= 3)
})
