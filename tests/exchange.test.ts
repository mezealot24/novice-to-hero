import test from 'node:test'
import assert from 'node:assert/strict'
import { gemsToZeny, zenyCostOf, zenyToGems } from '../src/data/exchange'
import { GEM_BUY_PACKS, ZENY_COST_PER_GEM, ZENY_PACKS, ZENY_PER_GEM } from '../src/data/meta'

test('zeny -> gems: pays the price, grants the gems, refuses when short', () => {
  const w = { zeny: zenyCostOf(5), gems: 0 }
  assert.equal(zenyToGems(w, 5), 5)
  assert.deepEqual(w, { zeny: 0, gems: 5 })
  assert.equal(zenyToGems(w, 5), 0)
  assert.deepEqual(w, { zeny: 0, gems: 5 })
})

test('gems -> zeny: refuses when short', () => {
  const w = { zeny: 0, gems: 3 }
  assert.equal(gemsToZeny(w, 10), 0)
  assert.deepEqual(w, { zeny: 0, gems: 3 })
})

test('bad pack sizes never move the wallet', () => {
  const w = { zeny: 1e9, gems: 1e9 }
  for (const n of [0, -5, 1.5, NaN]) {
    assert.equal(zenyToGems(w, n), 0)
    assert.equal(gemsToZeny(w, n), 0)
  }
  assert.deepEqual(w, { zeny: 1e9, gems: 1e9 })
})

test('no arbitrage: buying a gem costs more zeny than selling it gives', () => {
  assert.ok(ZENY_COST_PER_GEM > ZENY_PER_GEM)
})

test('no arbitrage: looping every pack 100x never gains gems or zeny', () => {
  const w = { zeny: 100_000, gems: 1_000 }
  const start = { ...w }
  for (let i = 0; i < 100; i++) {
    for (const g of ZENY_PACKS) gemsToZeny(w, g)
    for (const g of GEM_BUY_PACKS) zenyToGems(w, g)
    for (const g of GEM_BUY_PACKS) zenyToGems(w, g)
  }
  const value = (x: typeof w) => x.zeny + x.gems * ZENY_PER_GEM // value gems at the sell rate
  assert.ok(value(w) <= value(start))
  assert.ok(w.zeny >= 0 && w.gems >= 0)
})
