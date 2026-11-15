import test from 'node:test'
import assert from 'node:assert/strict'
import { COIN_FX, coinTier, splitZeny } from '../src/data/battle-rules'
import { COIN_DROP_IDS, COIN_DROP_REST, COIN_DROP_UNTIL, COIN_PFX, DEFS } from '../src/gfx/pixelfx'
import { clearFrame, createFrame, createFx } from '../src/vendor/pixelfx/core/index.js'

test('splitZeny: k shares that sum to n, larger first, never negative', () => {
  for (const [n, k] of [[0, 3], [1, 3], [2, 3], [3, 3], [7, 6], [50, 6], [920, 10], [5.7, 3]]) {
    const s = splitZeny(n, k)
    assert.equal(s.length, k)
    assert.equal(s.reduce((a, b) => a + b, 0), Math.floor(n))
    assert.ok(s.every((v) => v >= 0))
    assert.ok(s.every((v, i) => i === 0 || v <= s[i - 1]))
    assert.ok(Math.max(...s) - Math.min(...s) <= 1)
  }
})

test('coinTier: a fixed handful of coins whatever the payout (no more 1 coin per zeny)', () => {
  assert.equal(coinTier(1).coins, 3)
  assert.equal(coinTier(3).coins, 3)
  assert.equal(coinTier(4).coins, 6)
  assert.equal(coinTier(50).coins, 6)
  assert.equal(coinTier(51).coins, 10)
  assert.equal(coinTier(100000).coins, 10)
  for (const t of COIN_FX.tiers) assert.ok(COIN_DROP_IDS[t.coins], `tier ${t.coins} has a coin-drop bake`)
})

test('coin-drop bakes: every coin lies where COIN_DROP_REST says at the cut, inside the frame', () => {
  assert.equal(COIN_PFX.length, Object.keys(COIN_DROP_IDS).length)
  for (const [coins, id] of Object.entries(COIN_DROP_IDS)) {
    const rest: readonly number[] = COIN_DROP_REST[Number(coins) as keyof typeof COIN_DROP_REST]
    assert.equal(rest.length, Number(coins), `${id}: one rest spot per coin`)
    const { mod, opts } = DEFS[id] as { mod: (typeof DEFS)[typeof id]['mod']; opts?: Record<string, unknown> }
    const { size: [w, h], origin: [ox, oy] } = mod.meta
    const fx = createFx(mod, { x: ox, y: oy, ...(opts ?? {}) })
    const frame = createFrame(w, h)
    for (let t = 0; t < COIN_DROP_UNTIL - 1e-9; t += 0.05) fx.update(0.05)
    clearFrame(frame)
    fx.draw(frame)
    const lit = (x: number, y: number) => x >= 0 && x < w && y >= 0 && y < h && frame.color[y * w + x] !== 0
    // a settled coin is a flat 7 px sprite on rows -3..-1: its middle row (-2) is lit around its center
    for (const dx of rest) assert.ok([-2, -1, 0, 1, 2].some((d) => lit(ox + dx + d, oy - 2)), `${id}: a coin lies at ${dx}`)
    // nothing still in the air: no coin pixels 8+ px above the floor
    let high = 0
    for (let y = 0; y < oy - 8; y++) for (let x = 0; x < w; x++) if (lit(x, y)) high++
    assert.ok(high <= 6, `${id}: coins have settled (${high} px still high)`)
    for (let y = 0; y < h; y++) assert.ok(!lit(0, y) && !lit(w - 1, y), `${id}: not clipped by the frame edge`)
  }
})
