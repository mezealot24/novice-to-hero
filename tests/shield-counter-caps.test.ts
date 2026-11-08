// 🛡️ Shield cap + counter floor + common card buff (Q 2026-11-08, design/shield-counter-caps-v1.md).
// Run: node tools/test.mjs shield-counter
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COUNTER_RULES, counterRate, shieldGain, soft } from '../src/data/stack-math'
import { BATTLE, COMBO, COMMON_PERKS } from '../src/data/game-data'
import { PERKS_V2 } from '../src/data/perks'
import { heroStats } from '../src/data/meta'

test('soft: ~linear when small, never above its cap', () => {
  assert.equal(soft(0, 1.5), 0)
  assert.equal(soft(-3, 1.5), 0)
  assert.ok(Math.abs(soft(0.01, 1.5) - 0.01) < 1e-3)
  assert.ok(soft(1000, 1.5) <= 1.5)
  assert.ok(soft(2, 1.5) > soft(1, 1.5)) // still rising
  assert.ok(soft(2, 1.5) - soft(1, 1.5) < soft(1, 1.5) - soft(0, 1.5)) // but each step adds less
})

test('shieldGain: the fuller the shield, the less a new shield adds', () => {
  const cap = 1000
  assert.equal(shieldGain(0, 100, cap), 100) // empty: full value
  assert.equal(shieldGain(500, 100, cap), 50) // half full: half
  assert.equal(shieldGain(800, 100, cap), 20)
  assert.equal(shieldGain(1000, 100, cap), 0) // full: nothing
  assert.equal(shieldGain(1200, 100, cap), 0) // over cap (should not happen): nothing, never negative
  assert.equal(shieldGain(0, 5000, cap), 1000) // one huge shield still stops at the cap
})

test('shieldGain: 1,000 stacked shields never pass the cap (the Knight shield-only tower run)', () => {
  const maxHp = 600, cap = Math.round(maxHp * BATTLE.shieldCap)
  let shield = 0
  for (let i = 0; i < 1000; i++) shield += shieldGain(shield, Math.round(maxHp * 0.15), cap)
  assert.ok(shield <= cap, `${shield} > ${cap}`)
  assert.ok(shield >= cap * 0.9, `should get close to the cap, got ${shield}`) // taper, not a wall: it still fills up
})

test('shieldGain: a negative add passes through and a zero cap blocks gains', () => {
  assert.equal(shieldGain(100, -20, 1000), -20)
  assert.equal(shieldGain(0, 50, 0), 0)
})

test('counterRate: floor for every class, perks multiply a % of the base', () => {
  const cap = COMBO.rateCap
  assert.equal(counterRate(0, 0, cap), COUNTER_RULES.min) // base 0 class
  assert.ok(Math.abs(counterRate(0, 0.8, cap) - COUNTER_RULES.min * (1 + soft(0.8, COUNTER_RULES.pctSoftCap))) < 1e-9)
  assert.ok(counterRate(0, 0.8, cap) < 0.2) // 0 -> not the old flat +24%/+? explosion: stays small
  assert.equal(counterRate(0.2, 0, cap), 0.2) // a real base is untouched without perks
  assert.ok(counterRate(0.2, 0.8, cap) > counterRate(0.2, 0, cap)) // rich get richer, but bounded:
  assert.ok(counterRate(0.2, 99, cap) <= 0.2 * (1 + COUNTER_RULES.pctSoftCap) + 1e-9)
})

test('counterRate: many counter picks cannot pass COMBO.rateCap', () => {
  assert.ok(counterRate(1.4, 99, COMBO.rateCap) <= COMBO.rateCap)
})

test('heroStats: every class gets the counter floor', () => {
  for (const job of ['novice', 'swordsman', 'archer', 'mage', 'thief', 'cleric'] as const) {
    const st = heroStats({ race: 'human', stats: { str: 5, vit: 5, wis: 5, dex: 5, int: 5, luk: 5, agi: 5 }, equipped: {}, skills: {}, job } as never)
    assert.ok(st.counter >= COUNTER_RULES.min, `${job} counter ${st.counter}`)
  }
})

test('wpn_ctr + c_ctr are now % of base (counterPct), not flat counter', () => {
  const ctr = PERKS_V2.find((p) => p.id === 'wpn_ctr')!
  assert.equal(ctr.mod?.[0].counter, undefined)
  assert.equal(ctr.mod?.[0].counterPct, 0.5)
  assert.equal(ctr.mod?.[1].counterPct, 0.8)
  const c = COMMON_PERKS.find((p) => p.id === 'c_ctr')!
  assert.equal(c.mod.counter, undefined)
  assert.equal(c.mod.counterPct, 0.25)
})

test('common cards: v1 numbers buffed (hp/atk half flat + half %)', () => {
  const by = (id: string) => COMMON_PERKS.find((p) => p.id === id)!.mod
  assert.deepEqual(by('c_hp'), { maxHp: 30, pickHpPct: 0.02 })
  assert.deepEqual(by('c_atk'), { atk: 3, matk: 3, pickAtkPct: 0.02, pickMatkPct: 0.02 })
  assert.equal(by('c_def').def, 12)
  assert.equal(by('c_hit').hit, 10)
  assert.equal(by('c_hit').crit, 0.03) // crit has no cap yet: not buffed
  assert.equal(by('c_flee').flee, 10)
  assert.equal(by('c_mdef').mdef, 0.08)
  assert.equal(by('c_revive').revive, 1)
})
