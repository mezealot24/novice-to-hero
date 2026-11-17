// ☠️ Thief-line poison rebalance (Q 2026-11-17): per stack = flat Stats.poisonDmg + KIT.poison.atkPer x P.ATK, admin kit knobs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { KIT, poisonCapOf, thiefPoisonPerStack } from '../src/data/skill-math'
import { applyPatch, fieldFor, guardsFor } from '../src/data/patch'

test('poison per stack = flat + atkPer x P.ATK', () => {
  assert.equal(thiefPoisonPerStack({ poisonDmg: 2, atk: 0 }), 2)
  assert.equal(thiefPoisonPerStack({ poisonDmg: 2, atk: 400 }), 2 + KIT.poison.atkPer * 400)
  assert.ok(thiefPoisonPerStack({ poisonDmg: 2, atk: 400 }) > thiefPoisonPerStack({ poisonDmg: 2, atk: 60 }), 'poison grows with P.ATK')
})

test('poison cap = baseCap + poisonCap', () => {
  assert.equal(poisonCapOf({ poisonCap: 0 }), KIT.poison.baseCap)
  assert.equal(poisonCapOf({ poisonCap: 9 }), KIT.poison.baseCap + 9)
})

test('admin kit table exposes poison.* and thiefUltAgi knobs', () => {
  for (const p of ['poison.atkPer', 'poison.intPer', 'poison.burstKeep', 'poison.baseCap', 'thiefUltAgi']) assert.ok(fieldFor('kit', p), p)
  const patch = { kit: { 'poison.atkPer': 0 } }
  const r = applyPatch(patch, guardsFor(patch))
  try {
    assert.ok(r.ok, JSON.stringify(r.errors))
    assert.equal(thiefPoisonPerStack({ poisonDmg: 3, atk: 500 }), 3, 'atkPer 0 = old flat poison')
  } finally { r.revert() }
})
