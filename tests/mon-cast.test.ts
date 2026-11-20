import test from 'node:test'
import assert from 'node:assert/strict'
import { MON_CAST, monBreakChance, monBreakGauge, monBreaksOn, monCastPity } from '../src/data/mon-cast'
import { KIT } from '../src/data/skill-math'
import { fieldFor } from '../src/data/patch'

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)

test('monBreaksOn: a hit must deal >= breakMinHp of the monster max HP (1.5%) to roll', () => {
  assert.equal(monBreaksOn(14, 1000), false)
  assert.equal(monBreaksOn(14.99, 1000), false)
  assert.equal(monBreaksOn(15, 1000), true)
  assert.equal(monBreaksOn(500, 1000), true)
  assert.equal(monBreaksOn(0, 1000), false)
  assert.equal(monBreaksOn(10, 0), false) // no max HP: never
})

test('monBreakChance: base 25% minus tier resist, minus hard resist', () => {
  near(monBreakChance('normal', false), 0.25)
  near(monBreakChance('mini', false), 0.2)
  near(monBreakChance('boss', false), 0.15)
  near(monBreakChance('normal', true), 0.2)
  near(monBreakChance('mini', true), 0.15)
  near(monBreakChance('boss', true), 0.1)
  assert.ok(monBreakChance('boss', false) < monBreakChance('mini', false))
  assert.ok(monBreakChance('boss', true) < monBreakChance('boss', false))
})

test('monBreakChance never goes below 0 (tuning clamps)', () => {
  const keep = { base: MON_CAST.breakBase, boss: MON_CAST.resist.boss }
  try {
    MON_CAST.breakBase = 0.1; MON_CAST.resist.boss = 0.2
    assert.equal(monBreakChance('boss', true), 0)
    assert.equal(monBreakChance('boss', false), 0)
    MON_CAST.breakBase = 0
    assert.equal(monBreakChance('normal', false), 0)
  } finally { MON_CAST.breakBase = keep.base; MON_CAST.resist.boss = keep.boss }
})

test('monBreakGauge pushes the gauge back pushGauge, clamped at 0', () => {
  assert.equal(monBreakGauge(100), 100 - MON_CAST.pushGauge)
  assert.equal(monBreakGauge(MON_CAST.pushGauge), 0)
  assert.equal(monBreakGauge(10), 0)
  assert.equal(monBreakGauge(0), 0)
})

test('pity is on by default and MON_CAST is live-tunable as kit monCast.*', () => {
  assert.equal(monCastPity(), true)
  assert.equal(KIT.monCast, MON_CAST)
  for (const p of ['monCast.breakBase', 'monCast.breakMinHp', 'monCast.hardResist', 'monCast.resist.normal', 'monCast.resist.mini', 'monCast.resist.boss', 'monCast.pushGauge', 'monCast.steady']) assert.ok(fieldFor('kit', p), p)
})
