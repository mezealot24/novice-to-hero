import test from 'node:test'
import assert from 'node:assert/strict'
import { heroStats, statPool, thiefUltAgiBonus, STAT_RULES, type StatsInput } from '../src/data/meta'
import { KIT } from '../src/data/skill-math'

// Q 2026-11-19 Ratio AGI: เงาพริ้ว bonus = K x (AGI above start / stat pool), share capped. Same all-in bonus at every Base Lv.
const P = STAT_RULES.pointsPerLevel

test('all-in AGI gives K at every Base Lv (early not weaker, late not runaway)', () => {
  for (const lv of [10, 20, 40, 80, 99]) assert.equal(thiefUltAgiBonus(P * lv, P * lv), KIT.thiefUltAgiK, `Lv ${lv}`)
})

test('half AGI = half bonus · no AGI = 0 · share capped (gear AGI past the pool)', () => {
  assert.equal(thiefUltAgiBonus(120, 240), KIT.thiefUltAgiK * 0.5)
  assert.equal(thiefUltAgiBonus(0, 240), 0)
  assert.equal(thiefUltAgiBonus(-5, 240), 0)
  assert.equal(thiefUltAgiBonus(10_000, 240), KIT.thiefUltAgiK * KIT.thiefUltAgiShareCap)
  assert.ok(Number.isFinite(thiefUltAgiBonus(30, 0)), 'empty pool never divides by 0')
})

test("Q's Lv 80 Rogue (AGI 238): was x5.74 per stab, now x3.0", () => {
  assert.ok(Math.abs(1 + thiefUltAgiBonus(237, P * 80) - 3) < 0.05)
})

const hero = (baseLevel: number | undefined, agi: number): StatsInput => ({
  race: 'human', stats: { str: 1, vit: 1, wis: 1, dex: 1, int: 1, luk: 1, agi }, equipped: {}, skills: {} as StatsInput['skills'], job: 'thief', baseLevel,
})

test('statPool: Base Lv when known, else the allocated points', () => {
  assert.equal(statPool(hero(50, 1)), P * 50)
  assert.equal(statPool(hero(undefined, 41)), 40)
})

test('heroStats wires it for Thieves only', () => {
  const t = heroStats(hero(20, 31))
  assert.ok(t.thUltAgi > 0 && t.thUltAgi <= KIT.thiefUltAgiK * KIT.thiefUltAgiShareCap)
  assert.equal(heroStats({ ...hero(20, 31), job: 'archer' }).thUltAgi, 0)
})
