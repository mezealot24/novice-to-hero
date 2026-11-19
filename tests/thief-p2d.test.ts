// Thief P2'd off-meta (สาย INT เล่นแร่พิษ / วิถีพิษคริ / WIS Shadow Ward / LUK Gambler's Edge). Run: node tools/test.mjs thief-p2d
import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAYER, type Stats } from '../src/data/game-data'
import { STAT_RULES, statEff } from '../src/data/meta'
import { autoInfo, KIT, magicPower, matkToPmRatio } from '../src/data/skill-math'
import { canDetonate, detonateDmg, detonateStacks } from '../src/data/thief-offmeta'
import { nodeById } from '../src/data/tree'

const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)

test('statEff: single off-meta stat door clamps below start and reads points above start', () => {
  const b = { str: 1, vit: 1, wis: 1, dex: 1, int: 41, luk: 0, agi: 1 }
  assert.equal(statEff(b, 'wis'), 0)
  assert.equal(statEff(b, 'luk'), 0, 'clamps to >= 0')
  assert.equal(statEff(b, 'int'), 41 - STAT_RULES.start)
})

test('matkToPmRatio converts M.ATK multipliers into Pm units safely at matk = 0', () => {
  const z: Stats = { ...PLAYER, matk: 0, atk: 0 }
  assert.equal(matkToPmRatio(z), 0)
  assert.ok(!Number.isNaN(matkToPmRatio(z)))
  const s: Stats = { ...PLAYER, matk: 120, atk: 40 }
  near(matkToPmRatio(s) * magicPower(s), 120, 'x Pm == exact M.ATK')
})

test('PLAYER initializes all 7 P2\'d Stats keys to 0', () => {
  for (const k of ['thS1Matk', 'thDetonate', 'thDetonateStar', 'thPoisonLeechLv', 'thPoisonLeech', 'thPerfectAgony', 'thShadowWard'] as const) {
    assert.equal(PLAYER[k], 0, k)
  }
})

test('thief_v1 แทงฉาบอาคม stretches cleanly Lv 1..5 and shows in autoInfo', () => {
  const v1 = nodeById('thief_v1')!
  assert.equal(v1.branch, 'thief_v')
  assert.equal(v1.max, 5)
  near(v1.mod(5).thS1Matk ?? 0, 1.8, 'Lv 5 == old Lv 3')
  for (let lv = 1; lv <= 5; lv++) {
    const d = v1.desc(lv)
    assert.ok(!/undefined|NaN|\d+\.\d+/.test(d), `v1 Lv ${lv}: ${d}`)
  }
  const rows = autoInfo('thief', { ...PLAYER, thS1Matk: 1.8, matk: 100, atk: 30 })
  assert.ok(rows.some((r) => r.label.includes('แทงฉาบอาคม')), 'autoInfo shows magic bonus row')
  const plainRows = autoInfo('thief', PLAYER)
  assert.ok(!plainRows.some((r) => r.label.includes('แทงฉาบอาคม')), 'hidden when thS1Matk = 0')
})

test('thief_v2 ระเบิดสารพิษ: threshold scales with poison cap, detonateStacks/Dmg & stretch Lv 1..5', () => {
  assert.equal(canDetonate(false, 9, 20, 3), false, 'below 50% of 20')
  assert.equal(canDetonate(false, 10, 20, 3), true, 'at 50% of 20 = 10')
  assert.equal(canDetonate(false, 14, 29, 3), false, 'cap 29 needs ceil(14.5) = 15')
  assert.equal(canDetonate(false, 15, 29, 3), true)
  assert.equal(canDetonate(true, 20, 20, 3), false, '1/hero turn ICD')
  assert.equal(canDetonate(false, 20, 20, 0), false, 'node off')

  assert.equal(detonateStacks(8), 3, 'min 3 when floor(3.2) = 3')
  assert.equal(detonateStacks(20), 8, 'floor(20 * 0.4) = 8')
  assert.equal(detonateStacks(2), 2, 'capped at available stacks')
  near(detonateDmg(8, 10, 3), 8 * 10 * 3.0, 'Lv 5 (x=3): 3.0x poisonDmg/stack, no extra M.ATK term')

  const v2 = nodeById('thief_v2')!
  assert.equal(v2.max, 5)
  near(v2.mod(5).thDetonate ?? 0, 3, 'Lv 5 == old Lv 3')
  for (let lv = 1; lv <= 5; lv++) {
    const d = v2.desc(lv)
    assert.ok(!/undefined|NaN/.test(d), `v2 Lv ${lv}: ${d}`)
  }
})
