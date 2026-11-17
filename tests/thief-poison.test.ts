// ☠️ Thief-line poison rebalance (Q 2026-11-17): per stack = flat Stats.poisonDmg + KIT.poison.atkPer x P.ATK, admin kit knobs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { KIT, poisonCapOf, poisonDefCut, thiefPoisonPerStack } from '../src/data/skill-math'
import { applyPatch, fieldFor, guardsFor } from '../src/data/patch'

test('poison per stack = flat + atkPer x P.ATK', () => {
  assert.equal(thiefPoisonPerStack({ poisonDmg: 2, atk: 0, matk: 0 }), 2)
  assert.equal(thiefPoisonPerStack({ poisonDmg: 2, atk: 400, matk: 100 }), 2 + KIT.poison.atkPer * 400 + KIT.poison.matkPer * 100)
  assert.ok(thiefPoisonPerStack({ poisonDmg: 2, atk: 400, matk: 0 }) > thiefPoisonPerStack({ poisonDmg: 2, atk: 60, matk: 0 }), 'poison grows with P.ATK')
  assert.ok(thiefPoisonPerStack({ poisonDmg: 2, atk: 100, matk: 200 }) > thiefPoisonPerStack({ poisonDmg: 2, atk: 100, matk: 20 }), 'poison grows with M.ATK (INT)')
})

test('poison cap = baseCap + poisonCap', () => {
  assert.equal(poisonCapOf({ poisonCap: 0 }), KIT.poison.baseCap)
  assert.equal(poisonCapOf({ poisonCap: 9 }), KIT.poison.baseCap + 9)
})

test('poison shreds DEF per stack, capped', () => {
  assert.equal(poisonDefCut(0), 0)
  assert.equal(poisonDefCut(10), Math.min(KIT.poison.defCap, KIT.poison.defPer * 10))
  assert.equal(poisonDefCut(999), KIT.poison.defCap)
})

test('admin kit table exposes poison.* and thiefUltAgi knobs', () => {
  for (const p of ['poison.atkPer', 'poison.matkPer', 'poison.intPer', 'poison.burstKeep', 'poison.defPer', 'poison.defCap', 'poison.baseCap', 'thiefUltAgi']) assert.ok(fieldFor('kit', p), p)
  const patch = { kit: { 'poison.atkPer': 0, 'poison.matkPer': 0 } }
  const r = applyPatch(patch, guardsFor(patch))
  try {
    assert.ok(r.ok, JSON.stringify(r.errors))
    assert.equal(thiefPoisonPerStack({ poisonDmg: 3, atk: 500, matk: 200 }), 3, 'atkPer + matkPer 0 = old flat poison')
  } finally { r.revert() }
})
