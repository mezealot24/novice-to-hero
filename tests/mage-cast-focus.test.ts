import test from 'node:test'
import assert from 'node:assert/strict'
import { FOCUS_RULES, JOB_LINES, OUTSIDE_CAP, overflowShare, perkById } from '../src/data/perks'
import { breakChance, breakRefundMana, breaksOn, castUsesTurn, KIT, MAGE_CAST } from '../src/data/skill-math'
import { TABLES } from '../src/data/tunables'

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)

test('v85 breakChance: 25% at DEX 0, 0 clamp from DEX 21, tenacity lowers it, never negative, Poise = 0', () => {
  near(breakChance(0, 0), 0.25)
  near(breakChance(10, 0), 0.13)
  near(breakChance(10, 0.05), 0.08)
  assert.equal(breakChance(30, 0), 0) // 0.25 - 0.36 clamps
  assert.ok(breakChance(5, 0.1) < breakChance(5, 0))
  assert.equal(breakChance(99, 0), 0)
  assert.equal(breakChance(0, 1), 0)
  assert.equal(breakChance(0, 0, true), 0)
})

test('v85 breaksOn: a hit must deal >= 6% of max HP to roll for a break', () => {
  assert.equal(breaksOn(5, 100), false)
  assert.equal(breaksOn(5.99, 100), false)
  assert.equal(breaksOn(6, 100), true)
  assert.equal(breaksOn(60, 1000), true)
  assert.equal(breaksOn(59, 1000), false)
  assert.equal(breaksOn(10, 0), false) // no max HP: never
})

test('v85 breakRefundMana: 60% of the Mana paid comes back, rounded down, never negative', () => {
  assert.equal(breakRefundMana(30), 18)
  assert.equal(breakRefundMana(25), 15)
  assert.equal(breakRefundMana(11), 6)
  assert.equal(breakRefundMana(0), 0)
  assert.equal(breakRefundMana(-5), 0)
})

test('v78 / v85 MAGE_CAST numbers live in one place and are tunable as kit cast.*', () => {
  assert.deepEqual(MAGE_CAST, { breakBase: 0.25, breakDex: 0.012, breakMinHp: 0.06, breakRefund: 0.6, fireMul: 1, ultMul: 1.3, brokenUltCd: 2, boltMana: 6 })
  assert.equal(KIT.cast, MAGE_CAST)
  const pats = TABLES.kit.fields.map(([p]) => p).join(' ')
  for (const k of Object.keys(MAGE_CAST)) assert.ok(pats.includes(k), `kit table misses cast.${k}`)
})

test('v78 release rule: a Mage / Sage chant uses up the release turn, Wizard releases for free', () => {
  assert.equal(castUsesTurn(undefined), true) // base Mage
  assert.equal(castUsesTurn('sage'), true)
  assert.equal(castUsesTurn('wizard'), false)
  assert.ok(MAGE_CAST.fireMul >= 0.9) // v85: ลูกไฟระเบิด is instant again (no chant), at least the pre-v78 0.9x
})

test('v78 focus fallbacks: full bar -> shield / heal, empty bar -> resource, Novice -> all shield / heal', () => {
  assert.equal(overflowShare(40, 0), 1) // full bar
  assert.equal(overflowShare(40, 100), 0) // empty bar: all of it fits
  near(overflowShare(40, 30), 0.25) // 10 of 40 spills
  assert.equal(overflowShare(40, -5), 1) // over the cap already
  assert.equal(overflowShare(6, 0, false), 1) // Novice: no resource
  assert.equal(overflowShare(0, 10), 0)
  // what the cards give at a full bar / for a Novice
  const wake = perkById('foc_wake')!, pray = perkById('foc_pray')!
  near(160 * (wake.pk![0].wakeShield ?? 0) * overflowShare(40, 0), 32) // 20% of 160 max HP
  near(200 * (pray.pk![1].prayHeal ?? 0) * overflowShare(10, 0, false), 10) // "+": 5% of 200 max HP
})

test('v78 focus cards match the table', () => {
  const calm = perkById('foc_calm')!, bone = perkById('foc_bone')!, wake = perkById('foc_wake')!, pray = perkById('foc_pray')!, l1 = perkById('foc_L1')!
  assert.equal(calm.max, 1)
  assert.deepEqual(calm.mod![0], { poise: 1, flee: 12 })
  assert.equal(calm.mod![0].smashCd, undefined)
  assert.deepEqual(bone.mod, [{ ultAmp: 0.75, smashMul: 2.25, ultPierce: 0.3 }, { ultAmp: 1.2, smashMul: 3.6, ultPierce: 0.3 }])
  assert.deepEqual(wake.proc!.amt, [40, 60])
  assert.deepEqual(wake.pk, [{ wakeShield: 0.2 }, { wakeShield: 0.3 }])
  assert.deepEqual(pray.pk, [{ resTurn: 6, prayHeal: 0.03 }, { resTurn: 10, prayHeal: 0.05 }])
  assert.ok(!wake.needsRes && !pray.needsRes)
  assert.deepEqual(l1.pk, [{ ultBoost: 1, zen: 1 }, { ultBoost: 1.5, zen: 1 }])
  assert.deepEqual(FOCUS_RULES, { zenTurns: 3, zenCritDmg: 0.3 })
  assert.equal(OUTSIDE_CAP.resTurn, 20) // follows the new "+" value (2 x 10)
  assert.ok(JOB_LINES.thief.includes('focus'))
})
