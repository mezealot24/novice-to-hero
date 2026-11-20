import test from 'node:test'
import assert from 'node:assert/strict'
import { REFINE } from '../src/data/craft'
import { lineBase, lineTier, makeLine, rollTier } from '../src/data/line-tier'
import { lineText } from '../src/data/refine'

// Q 2026-11-20: option lines have 5 tiers (Normal / Magic / Rare / Legendary / Mythic).
test('tier table: 5 tiers, weights sum to 100, multipliers climb', () => {
  assert.deepEqual(REFINE.lineTierW, [55, 28, 12, 4, 1])
  assert.deepEqual(REFINE.lineTierMul, [1, 1.25, 1.5, 1.8, 2.2])
})

test('rollTier follows the weights', () => {
  assert.equal(rollTier(() => 0), 0)
  assert.equal(rollTier(() => 0.56), 1)
  assert.equal(rollTier(() => 0.84), 2)
  assert.equal(rollTier(() => 0.96), 3)
  assert.equal(rollTier(() => 0.995), 4)
})

test('old saves: a gold line reads as Rare with its value unchanged, a plain line as Normal', () => {
  const gold = { stat: 'crit', val: 0.03, gold: 1 as const }
  assert.equal(lineTier(gold), 2)
  assert.equal(lineBase(gold), 0.02)
  assert.equal(lineTier({ stat: 'def', val: 5 }), 0)
})

test('makeLine scales by tier; whole stats round; text shows the tier icon', () => {
  assert.deepEqual(makeLine('def', 5, 4, true), { stat: 'def', val: 11, tier: 4, base: 5 })
  assert.deepEqual(makeLine('crit', 0.02, 0, false), { stat: 'crit', val: 0.02, base: 0.02 })
  assert.ok(lineText(makeLine('def', 5, 4, true)).startsWith('🩷'))
  assert.ok(!lineText(makeLine('def', 5, 0, true)).startsWith('🩷'))
})
