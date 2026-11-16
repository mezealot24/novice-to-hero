import test from 'node:test'
import assert from 'node:assert/strict'
import * as chainArc from '../src/gfx/chain-arc'
import { pickChainTargets, type ChainTargetLike } from '../src/battle/lightning-vfx'
import { DEFS, MAGE_PFX, ZAP_YELLOW, ZAP_YELLOW_SPARKS } from '../src/gfx/pixelfx'
import { clearFrame, createFrame, createFx } from '../src/vendor/pixelfx/core/index.js'

interface TestMon extends ChainTargetLike {
  id: string
  guarded?: boolean
}

function mon(id: string, slot: number, x: number, dead = false, guarded = false): TestMon {
  return { id, slot, dead, guarded, spr: { x, y: slot % 2 ? 444 : 426, displayHeight: 72 } }
}

test('pickChainTargets starts from the struck target and spreads to nearest monsters', () => {
  const m0 = mon('m0', 0, 560)
  const m1 = mon('m1', 1, 660)
  const m2 = mon('m2', 2, 760)
  const m3 = mon('m3', 3, 850)

  const fromFront = pickChainTargets(m0, [m0, m1, m2, m3], 3)
  assert.deepEqual(fromFront.chain.map((m) => m.id), ['m0', 'm1', 'm2'])
  assert.equal(fromFront.originDead, undefined)

  // Counterattacking a back-line monster spreads outward to its nearest neighbor first
  const fromBack = pickChainTargets(m2, [m0, m1, m2, m3], 3)
  assert.deepEqual(fromBack.chain.map((m) => m.id), ['m2', 'm3', 'm1'])
})

test('pickChainTargets preserves originDead when the struck target died before the chain proc', () => {
  const m0 = mon('m0', 0, 560, true)
  const m1 = mon('m1', 1, 660)
  const m2 = mon('m2', 2, 760)

  const res = pickChainTargets(m0, [m1, m2], 3)
  assert.deepEqual(res.chain.map((m) => m.id), ['m1', 'm2'])
  assert.equal(res.originDead, m0)
})

test('pickChainTargets deprioritizes Maiden-guarded monsters and respects jump cap', () => {
  const m0 = mon('m0', 0, 560)
  const boss = mon('boss', 1, 660, false, true)
  const maiden = mon('maiden', 2, 760)

  const res = pickChainTargets(m0, [m0, boss, maiden], 2, (m) => !!m.guarded)
  assert.deepEqual(res.chain.map((m) => m.id), ['m0', 'maiden'])

  // Single monster alive
  const single = pickChainTargets(m0, [m0], 3)
  assert.deepEqual(single.chain.map((m) => m.id), ['m0'])

  // No alive monsters
  const none = pickChainTargets(m0, [], 3)
  assert.deepEqual(none.chain, [])
})

test('chainArc replaces fixed chainLightning in DEFS and renders cleanly across default duration', () => {
  assert.ok(MAGE_PFX.includes('chainLightning'))
  assert.equal(DEFS.chainLightning.mod, chainArc)
  assert.equal((chainArc.meta as Record<string, unknown>).actor, undefined)

  const { size: [w, h], origin: [ox, oy], duration } = chainArc.meta
  const fx = createFx(chainArc, { x: ox, y: oy })
  const frame = createFrame(w, h)
  const dt = 0.05
  const steps = Math.round(duration / dt)
  let totalLit = 0
  let finalLit = 0

  for (let i = 0; i <= steps; i++) {
    if (i > 0) fx.update(dt)
    clearFrame(frame)
    fx.draw(frame)
    let lit = 0
    for (let k = 0; k < w * h; k++) {
      if (frame.color[k] !== 0 || frame.light[k] !== 0) lit++
    }
    totalLit += lit
    if (i === steps) finalLit = lit
  }

  assert.ok(totalLit > 500, `expected substantial lit pixels across animation, got ${totalLit}`)
  assert.ok(finalLit <= 8, `expected animation to end nearly empty at t=duration, got ${finalLit} lit pixels`)
})

test('chainArc renders dynamic node layouts: 1 target, reverse chain, dead origin, Overload Tempest, and yellow palette', () => {
  const variants: Array<{ label: string; opts: chainArc.ChainArcOpts }> = [
    {
      label: 'single-target grounding discharge',
      opts: { nodes: [{ x: 0, y: -24, groundY: 0 }] },
    },
    {
      label: 'right-to-left counter chain',
      opts: {
        nodes: [
          { x: 100, y: -26, groundY: 0 },
          { x: 50, y: -20, groundY: 7 },
          { x: 0, y: -24, groundY: 0 },
        ],
      },
    },
    {
      label: 'dead origin jumping to survivors with Overload Tempest',
      opts: {
        originNode: { x: 0, y: -22, groundY: 0 },
        nodes: [
          { x: 50, y: -26, groundY: 7 },
          { x: 100, y: -22, groundY: 0 },
        ],
        overloadBack: true,
      },
    },
    {
      label: 'yellow item-effect palette',
      opts: {
        nodes: [
          { x: 0, y: -24, groundY: 0 },
          { x: 52, y: -24, groundY: 7 },
        ],
        palette: ZAP_YELLOW,
        sparks: ZAP_YELLOW_SPARKS,
      },
    },
  ]

  for (const v of variants) {
    const fx = createFx(chainArc, { x: 80, y: 74, seed: 19, ...v.opts })
    const frame = createFrame(260, 110)
    let peak = 0
    for (let i = 0; i < 14; i++) {
      if (i > 0) fx.update(0.04)
      clearFrame(frame)
      fx.draw(frame)
      let lit = 0
      for (let k = 0; k < frame.color.length; k++) if (frame.color[k] !== 0) lit++
      if (lit > peak) peak = lit
    }
    assert.ok(peak > 40, `${v.label} should draw visible lightning pixels (got peak ${peak})`)
  }
})
