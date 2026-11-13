import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFS, ZAP_YELLOW, ZAP_YELLOW_SPARKS, bake } from '../src/gfx/pixelfx'
import { createFrame, clearFrame, createFx } from '../src/vendor/pixelfx/core/index.js'
import { PROC_RULES, nextZapTarget } from '../src/data/perks'

test('PROC_RULES.zapDelayMs is 400ms (0.4s)', () => {
  assert.equal(PROC_RULES.zapDelayMs, 400)
})

test('nextZapTarget strikes every alive monster once in random order before repeating', () => {
  const alive = ['m1', 'm2', 'm3', 'm4']
  let seed = 17
  const randInt = (max: number) => {
    seed = (seed * 16807) % 2147483647
    return seed % max
  }

  let bag: string[] = []
  const firstPass: string[] = []
  for (let i = 0; i < 4; i++) {
    const res = nextZapTarget(alive, bag, randInt)
    bag = res.bag
    assert.ok(res.target)
    firstPass.push(res.target)
  }

  assert.equal(new Set(firstPass).size, 4, 'First pass must hit all 4 distinct monsters once')

  // Second pass reshuffles cleanly for extra hits
  const fifth = nextZapTarget(alive, bag, randInt)
  assert.ok(fifth.target && alive.includes(fifth.target))
})

test('nextZapTarget skips monsters that died mid-sequence', () => {
  let bag = ['m1', 'm2', 'm3']
  const aliveAfterDeath = ['m1', 'm3'] // m2 died
  const picked: string[] = []
  for (let i = 0; i < 2; i++) {
    const res = nextZapTarget(aliveAfterDeath, bag, () => 0)
    bag = res.bag
    assert.ok(res.target)
    picked.push(res.target)
  }
  assert.deepEqual(picked.sort(), ['m1', 'm3'])
  assert.ok(!picked.includes('m2'))
})

test('zapYellow strikes instantaneously from Thunder Strike height with yellowish palette', () => {
  const def = DEFS.zapYellow
  const lsMeta = DEFS.lightningStrike.mod.meta
  assert.equal(def.mod.meta.origin[1], lsMeta.origin[1], 'Origin Y must match lightningStrike')
  assert.equal(def.mod.meta.size[1], lsMeta.size[1], 'Canvas height must match lightningStrike')
  assert.ok(def.mod.meta.duration <= 0.35, `zapYellow should finish fast (got ${def.mod.meta.duration}s)`)
  assert.deepEqual(def.opts?.palette, ZAP_YELLOW)
  assert.deepEqual(def.opts?.sparks, ZAP_YELLOW_SPARKS)

  const [w, h] = def.mod.meta.size
  const [ox, oy] = def.mod.meta.origin
  const frame = createFrame(w, h)
  const fx = createFx(def.mod, { x: ox, y: oy, ...def.opts })

  let minDy = Infinity
  let maxDy = -Infinity
  let firstFrameMinDy = Infinity
  let yellowPixels = 0
  let blueDominantPixels = 0

  for (let i = 0; i < 7; i++) {
    if (i > 0) fx.update(1 / 20)
    clearFrame(frame)
    fx.draw(frame)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = frame.color[y * w + x]
        if (!c) continue
        const dy = y - oy
        if (i === 0 && dy < firstFrameMinDy) firstFrameMinDy = dy
        if (dy < minDy) minDy = dy
        if (dy > maxDy) maxDy = dy
        const r = c & 0xff
        const g = (c >> 8) & 0xff
        const b = (c >> 16) & 0xff
        if (r > b + 30 && g > b + 20) yellowPixels++
        if (b > r + 30) blueDominantPixels++
      }
    }
  }

  assert.ok(firstFrameMinDy <= -200, `Frame 0 must snap immediately from sky height (firstFrameMinDy=${firstFrameMinDy})`)
  assert.ok(minDy <= -210, `Vertical bolt should reach Thunder Strike height (minDy=${minDy})`)
  assert.ok(maxDy >= -15, `Vertical impact should hit monster body near ground (maxDy=${maxDy})`)
  assert.ok(yellowPixels > 200, `zapYellow should render yellowish pixels (got ${yellowPixels})`)
  assert.equal(blueDominantPixels, 0, 'zapYellow should not render blue-dominant pixels')
})

test('bake succeeds for zapYellow and zapBolt', () => {
  if (typeof (globalThis as unknown as { ImageData?: unknown }).ImageData === 'undefined') {
    (globalThis as unknown as { ImageData: unknown }).ImageData = class ImageData {
      data: Uint8ClampedArray
      width: number
      height: number
      constructor(w: number, h: number) {
        this.width = w
        this.height = h
        this.data = new Uint8ClampedArray(w * h * 4)
      }
    }
  }
  const createdTextures = new Map<string, unknown>()
  const createdAnims = new Set<string>()
  const mockScene = {
    textures: {
      exists: (k: string) => createdTextures.has(k),
      createCanvas: (k: string) => {
        const tex = { refresh: () => {}, setFilter: () => {}, getContext: () => ({ putImageData: () => {} }), add: () => {} }
        createdTextures.set(k, tex)
        return tex
      },
    },
    anims: {
      exists: (k: string) => createdAnims.has(k),
      create: (cfg: { key: string }) => { createdAnims.add(cfg.key) },
    },
  } as unknown as import('phaser').Scene

  assert.equal(bake(mockScene, 'zapYellow'), true)
  assert.equal(createdTextures.has('pfx_zapYellow'), true)
  assert.equal(createdAnims.has('pfx_zapYellow'), true)

  assert.equal(bake(mockScene, 'zapBolt'), true)
  assert.equal(createdTextures.has('pfx_zapBolt'), true)
  assert.equal(createdAnims.has('pfx_zapBolt'), true)
})
