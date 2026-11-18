import test from 'node:test'
import assert from 'node:assert/strict'
import { bankedRunXp, RULES } from '../src/data/game-data'
import { checkPatch } from '../src/data/patch'

test('💀 lost Dxx run banks only RULES.failXpMul (1/4) of the Base / Job EXP', () => {
  assert.equal(RULES.failXpMul, 0.25)
  assert.equal(bankedRunXp(400, false, true), 100)
  assert.equal(bankedRunXp(7, false, true), 2) // rounded
  assert.equal(bankedRunXp(400, true, true), 400) // a clear pays in full
  assert.equal(bankedRunXp(400, false, false), 400) // tower / rift / daily / bounty untouched
})

test('💀 failXpMul is admin-tunable (progression run.failXpMul, 0..1)', () => {
  const old = RULES.failXpMul
  try {
    RULES.failXpMul = 0.5
    assert.equal(bankedRunXp(400, false, true), 200)
  } finally { RULES.failXpMul = old }
  const ok = checkPatch({ progression: { 'run.failXpMul': 0.5 } })
  assert.equal(ok.ok, true); assert.equal(ok.count, 1); assert.equal(ok.skipped.length, 0)
  assert.equal(checkPatch({ progression: { 'run.failXpMul': 1.5 } }).ok, false) // out of [0, 1]
})
