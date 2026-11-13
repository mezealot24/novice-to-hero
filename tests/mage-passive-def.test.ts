import test from 'node:test'
import assert from 'node:assert/strict'
import { glacialBarrierMax, glacialDue, glacialNovaMul, icdReady, MAGE_DEF, mageDefPower, moltenThornsMul, moltenWardGain, staticCounterMul, staticDodgeCharges, staticShockChance } from '../src/data/skill-math'
import { STAT_RULES } from '../src/data/meta/stat-spec'
import { tree } from '../src/data/trees/mage'
import { TREE } from '../src/data/tree'

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)

test('rank 0 is a no-op for every mage passive', () => {
  assert.equal(staticCounterMul(0), 0)
  assert.equal(staticShockChance(0), 0)
  assert.equal(moltenThornsMul(0), 0)
  assert.equal(moltenWardGain(0, 100, 1000, 0), 0)
  assert.equal(glacialBarrierMax(0, 1000, 100), 0)
  assert.equal(glacialNovaMul(0), 0)
  assert.equal(glacialDue(0, 3), false)
})

test('doc formulas at rank 1 and 5', () => {
  near(staticCounterMul(1), 0.28); near(staticCounterMul(5), 0.6)
  near(staticShockChance(1), 0.25); near(staticShockChance(5), 0.45)
  near(moltenThornsMul(1), 0.35); near(moltenThornsMul(5), 0.75)
  near(glacialNovaMul(1), 0.4); near(glacialNovaMul(5), 0.8)
  assert.equal(glacialBarrierMax(1, 1000, 100), 85) // 1000x6% + 100x25%
  assert.equal(glacialBarrierMax(5, 1000, 100), 425)
})

test('rank is clamped to 0..5', () => {
  near(staticCounterMul(99), staticCounterMul(5))
  assert.equal(glacialBarrierMax(-3, 1000, 100), 0)
})

test('Flame Ward: 5% M.ATK per rank, whole shield capped at 25% max HP', () => {
  assert.equal(moltenWardGain(2, 100, 1000, 0), 10)
  assert.equal(moltenWardGain(5, 100, 1000, 240), 10) // room left = 250 - 240
  assert.equal(moltenWardGain(5, 100, 1000, 250), 0)
  assert.equal(moltenWardGain(5, 100, 1000, 900), 0) // never negative
})

test('barrier re-raises every N hero turns, never on turn 0', () => {
  const n = MAGE_DEF.glacial.every
  assert.equal(glacialDue(3, 0), false)
  assert.equal(glacialDue(3, n), true)
  assert.equal(glacialDue(3, n + 1), false)
  assert.equal(glacialDue(3, n * 2), true)
})

test('internal cooldown in hero turns', () => {
  assert.equal(icdReady(5, -Infinity, 3), true)
  assert.equal(icdReady(5, 4, 3), false)
  assert.equal(icdReady(7, 4, 3), true)
})

test('⚡ dodges by count: sure dodges per wave, 0 at rank 0, never decreasing, clamped', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(staticDodgeCharges), [0, 1, 1, 2, 2, 3])
  assert.equal(staticDodgeCharges(99), 3); assert.equal(staticDodgeCharges(-2), 0)
  assert.ok(tree.nodes.find((x) => x.id === 'mage_l1')!.desc(5).includes('หลบแน่นอน 3 ครั้ง'))
})

test('mageDefPower: zero stats = identity (old behaviour)', () => {
  const p = mageDefPower(0, 0, 0)
  assert.deepEqual(p, { dmg: 1, shield: 1, shockAdd: 0 })
  assert.equal(staticCounterMul(3, p.dmg), staticCounterMul(3))
  assert.equal(glacialBarrierMax(3, 1000, 100, p.shield), glacialBarrierMax(3, 1000, 100))
})

test('mageDefPower: monotonic and bounded', () => {
  const S = MAGE_DEF.scale
  let prev = mageDefPower(0, 0, 0)
  for (const v of [10, 50, 150, 500, 5000]) {
    const p = mageDefPower(v, v, 0)
    assert.ok(p.dmg > prev.dmg && p.shield > prev.shield && p.shockAdd > prev.shockAdd)
    prev = p
  }
  const huge = mageDefPower(1e6, 1e6, 1e6)
  assert.ok(huge.dmg <= 1 + S.intMax + S.lvMax + 1e-9)
  assert.ok(huge.shield <= 1 + S.wisMax + S.lvMax + 1e-9)
  assert.ok(huge.shockAdd <= S.shockWisMax + 1e-9)
  near(mageDefPower(150, 0, 0).dmg, 1 + S.intMax / 2) // stat == K -> half of max
})

test('mageDefPower: INT only moves dmg, WIS only moves shield/shock', () => {
  const i = mageDefPower(200, 0, 0), w = mageDefPower(0, 200, 0)
  assert.ok(i.dmg > 1); assert.equal(i.shield, 1); assert.equal(i.shockAdd, 0)
  assert.equal(w.dmg, 1); assert.ok(w.shield > 1); assert.ok(w.shockAdd > 0)
})

test('mageDefPower: Base Lv gives a flat bonus to dmg + shield, full at max level', () => {
  const S = MAGE_DEF.scale
  const p = mageDefPower(0, 0, STAT_RULES.maxBaseLevel)
  near(p.dmg, 1 + S.lvMax); near(p.shield, 1 + S.lvMax); assert.equal(p.shockAdd, 0)
  near(mageDefPower(0, 0, 999).dmg, 1 + S.lvMax) // clamped
})

test('mageDefPower: negatives clamp to 0', () => {
  assert.deepEqual(mageDefPower(-50, -50, -5), { dmg: 1, shield: 1, shockAdd: 0 })
})

test('scaling: shock chance never above the cap, rank 0 stays 0 with any stats', () => {
  const p = mageDefPower(1e6, 1e6, 99)
  assert.ok(staticShockChance(5, 10) <= MAGE_DEF.scale.shockCap)
  near(staticShockChance(5, 10), MAGE_DEF.scale.shockCap)
  assert.ok(staticShockChance(5, p.shockAdd) <= MAGE_DEF.scale.shockCap)
  assert.equal(staticCounterMul(0, p.dmg), 0)
  assert.equal(staticShockChance(0, p.shockAdd), 0)
  assert.equal(moltenThornsMul(0, p.dmg), 0)
  assert.equal(glacialNovaMul(0, p.dmg), 0)
  assert.equal(glacialBarrierMax(0, 1000, 100, p.shield), 0)
  assert.equal(moltenWardGain(0, 100, 1000, 0, p.shield), 0)
})

test('scaling: scaled values grow, Flame Ward still respects the shield cap', () => {
  const p = mageDefPower(300, 300, 50)
  assert.ok(staticCounterMul(3, p.dmg) > staticCounterMul(3))
  assert.ok(moltenThornsMul(3, p.dmg) > moltenThornsMul(3))
  assert.ok(glacialNovaMul(3, p.dmg) > glacialNovaMul(3))
  assert.ok(glacialBarrierMax(3, 1000, 100, p.shield) > glacialBarrierMax(3, 1000, 100))
  assert.ok(moltenWardGain(3, 100, 1000, 0, p.shield) > moltenWardGain(3, 100, 1000, 0))
  assert.equal(moltenWardGain(5, 100000, 1000, 240, p.shield), 10) // room left = 250 - 240
})

test('passives ride on the T1 node of each element line: shown level = passive rank (after the v83 stretch)', () => {
  assert.ok(!TREE.some((x) => x.branch === 'mage_def'), 'no separate mage_def branch')
  const rows = [
    ['mage_l1', 'mgStatic', null, 0],
    ['mage_f1', 'mgMolten', 'guard', 0.02],
    ['mage_i1', 'mgGlacial', 'mdef', 0.04],
  ] as const
  for (const [id, key, stat, per] of rows) {
    const nd = TREE.find((x) => x.id === id)!
    assert.ok(nd && nd.tier === 1 && nd.max === 5, `${id} is a stretched T1 node (5 levels)`)
    assert.ok(tree.nodes.some((x) => x.id === id))
    for (let lv = 1; lv <= 5; lv++) {
      const m = nd.mod(lv)
      assert.equal(m[key], lv, `${id} Lv ${lv} -> rank ${lv}`)
      if (stat) near(m[stat]!, per * lv)
      else assert.equal(m.luckyDodge ?? 0, 0, `${id}: ⚡ dodges by count, not by lucky %`)
    }
    assert.equal(nd.mod(0)[key] ?? 0, 0)
    assert.ok(nd.desc(5).includes('🛡️'), `${id} text mentions the armor`)
  }
  assert.equal(TREE.find((x) => x.id === 'mage_i1')!.mod(5).def, MAGE_DEF.glacial.defPer * 5)
})
