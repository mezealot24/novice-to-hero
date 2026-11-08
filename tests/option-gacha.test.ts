import test from 'node:test'
import assert from 'node:assert/strict'
import { REFINE } from '../src/data/craft'
import { ITEMS } from '../src/data/meta'
import { lockGems, maxLocks, nextRerollCost, reroll, rerollCost, rerollMul } from '../src/data/refine'
import type { RefineLine } from '../src/data/craft'

const it = ITEMS.find((x) => x.id === 'longsword')!
const L = (stat: string, val: number): RefineLine => ({ stat, val })
/** A save with `n` bonus lines on the longsword and plenty of everything. */
function mk(n: number, zeny = 1e6, gems = 1000) {
  const lines = [L('atk', 1), L('crit', 0.01), L('maxHp', 10)].slice(0, n)
  return { job: 'swordsman', zeny, gems, mats: new Proxy({}, { get: () => 999 }) as Record<string, number>, refineLines: { [it.id]: lines } } as never as Parameters<typeof reroll>[0]
}
const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length] }

test('v84 option gacha: zeny = per-line prices summed, +10% per roll, capped at x3', () => {
  assert.equal(rerollCost(it, 1).zeny, 1000)
  assert.equal(rerollCost(it, 2).zeny, 2000)
  assert.equal(rerollCost(it, 3).zeny, 3000)
  assert.equal(rerollCost(it, 3, 5).zeny, 4500)
  assert.equal(rerollMul(100), REFINE.rerollMaxMul)
  assert.equal(rerollCost(it, 3, 100).zeny, 9000)
  assert.equal(rerollCost(it, 3).gems, undefined) // rolling never costs gems
})

test('v84 option gacha: locks cost gems only, never all lines', () => {
  assert.deepEqual([maxLocks(1), maxLocks(2), maxLocks(3)], [0, 1, 2])
  assert.deepEqual([lockGems(0), lockGems(1), lockGems(2)], [0, 10, 40])
  const c = rerollCost(it, 3, 0, 2)
  assert.equal(c.gems, 40)
  assert.equal(c.zeny, 3000) // locking does not change the zeny price
})

test('v84 option gacha: a roll replaces every unlocked line at once and keeps locked ones', () => {
  const s = mk(3) as never as { zeny: number; gems: number; rerollCount?: Record<string, number>; refineLines: Record<string, RefineLine[]> }
  const keep = s.refineLines[it.id][1]
  const out = reroll(s as never, it, [1], seq(0.99, 0.5, 0.99))
  assert.ok(out)
  assert.equal(s.refineLines[it.id][1], keep)
  assert.equal(s.gems, 1000 - 10)
  assert.equal(s.zeny, 1e6 - 3000)
  assert.equal(s.rerollCount![it.id], 1)
  assert.equal(nextRerollCost(s as never, it).zeny, 3300) // 3000 x 1.1
})

test('v84 option gacha: refuses bad locks and short wallets without spending', () => {
  const one = mk(1)
  assert.equal(reroll(one, it, [0]), null) // the only line cannot be locked
  const three = mk(3)
  assert.equal(reroll(three, it, [0, 1, 2]), null) // never all
  assert.equal(reroll(three, it, [2, 2, 2]) !== null, true) // duplicates count once
  const poor = mk(3, 100) as never as { zeny: number; refineLines: Record<string, RefineLine[]> }
  const before = JSON.stringify(poor.refineLines)
  assert.equal(reroll(poor as never, it), null)
  assert.equal(poor.zeny, 100)
  assert.equal(JSON.stringify(poor.refineLines), before)
  const noGems = mk(3, 1e6, 5)
  assert.equal(reroll(noGems, it, [0]), null) // lock needs 10 gems
})
