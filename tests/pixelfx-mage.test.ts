import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFS, MAGE_PFX, texKey, normColor, bake, PAL, type PfxId } from '../src/gfx/pixelfx'
import { createFrame, createFx } from '../src/vendor/pixelfx/core/index.js'

test('MAGE_PFX covers all 4 elements (Fire, Ice, Lightning, Arcane)', () => {
  const expected: PfxId[] = [
    // Fire
    'fireball',
    'fireTornado',
    // Ice
    'frostNova',
    'iceLance',
    'iceSpikes',
    // Lightning
    'lightningStrike',
    'chainLightning',
    'thunderclap',
    // Arcane
    'magicCircle',
    'runeCircle',
    'arcaneMissiles',
    'arcaneBeam',
    'starFall',
  ]

  for (const id of expected) {
    assert.ok(MAGE_PFX.includes(id), `MAGE_PFX must include ${id}`)
    assert.ok(DEFS[id], `DEFS must include definition for ${id}`)
    assert.ok(DEFS[id].mod, `DEFS[${id}] must provide a module`)
    assert.ok(DEFS[id].mod.meta, `DEFS[${id}].mod must provide meta`)
    assert.ok(Array.isArray(DEFS[id].mod.meta.size), `DEFS[${id}].mod.meta.size must be an array`)
    assert.ok(Array.isArray(DEFS[id].mod.meta.origin), `DEFS[${id}].mod.meta.origin must be an array`)
    assert.ok(typeof DEFS[id].mod.meta.duration === 'number', `DEFS[${id}].mod.meta.duration must be a number`)
  }
})

test('Vendored pixelfx effects contain no stock dummy actor (meta.actor is undefined)', () => {
  for (const id of Object.keys(DEFS) as PfxId[]) {
    const meta = (DEFS[id].mod as { meta: Record<string, unknown> }).meta
    assert.equal(meta.actor, undefined, `Effect ${id} must not have meta.actor defined`)
  }
})

test('texKey generates distinct keys when palette override is provided', () => {
  const keyDefault = texKey('fireball')
  assert.equal(keyDefault, 'pfx_fireball')

  const greenPalette = ['#052605', '#0a4d0a', '#148014', '#20b320', '#3deb3d', '#85f585', '#c2fac2', '#ffffff']
  const keyGreen = texKey('fireball', greenPalette)
  assert.notEqual(keyGreen, keyDefault)
  assert.ok(keyGreen.startsWith('pfx_fireball_'))

  // Re-calling with identical palette produces the exact same key for cache hit
  const keyGreen2 = texKey('fireball', greenPalette)
  assert.equal(keyGreen, keyGreen2)

  // Empty palette falls back to default key
  assert.equal(texKey('fireball', []), 'pfx_fireball')

  // Case normalization & numeric color equivalence
  assert.equal(texKey('fireball', ['#FF0000']), texKey('fireball', ['#ff0000']))
  assert.equal(texKey('fireball', [0xff0000]), texKey('fireball', ['#ff0000']))
  assert.equal(texKey('fireball', [0x00ff00]), texKey('fireball', ['#00ff00']))

  // 3-digit hex shorthand normalization equivalence
  assert.equal(texKey('fireball', ['#fff']), texKey('fireball', ['#ffffff']))
  assert.equal(texKey('fireball', ['fff']), texKey('fireball', ['#ffffff']))
  assert.equal(texKey('fireball', ['#f00']), texKey('fireball', ['#ff0000']))
  assert.equal(normColor('#fff'), '#ffffff')
  assert.equal(normColor('fff'), '#ffffff')
  assert.equal(normColor('#0f0'), '#00ff00')
  assert.equal(normColor(0x00ff00), '#00ff00')

  // Delimiter prevents collision across split boundaries
  assert.notEqual(texKey('fireball', ['#11', '#22']), texKey('fireball', ['#1', '#122']))
})

test('PAL re-export provides valid ramps for elements', () => {
  assert.ok(Array.isArray(PAL.fire), 'PAL.fire must be an array')
  assert.ok(Array.isArray(PAL.ice), 'PAL.ice must be an array')
  assert.ok(Array.isArray(PAL.arcane), 'PAL.arcane must be an array')
  assert.ok(Array.isArray(PAL.volt), 'PAL.volt must be an array')
})

test('bake handles empty palette array without crashing any effect', () => {
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

  // Create mock Phaser scene for bake
  const createdTextures = new Map<string, { refresh: () => void; setFilter: () => void; getContext: () => unknown; add: () => void }>()
  const createdAnims = new Set<string>()

  const mockScene = {
    textures: {
      exists: (k: string) => createdTextures.has(k),
      createCanvas: (k: string, w: number, h: number) => {
        const fakeCtx = {
          putImageData: () => {},
        }
        const tex = {
          refresh: () => {},
          setFilter: () => {},
          getContext: () => fakeCtx,
          add: () => {},
        }
        createdTextures.set(k, tex)
        return tex
      },
    },
    anims: {
      exists: (k: string) => createdAnims.has(k),
      create: (cfg: { key: string }) => {
        createdAnims.add(cfg.key)
      },
    },
  } as unknown as import('phaser').Scene

  // Empty palette must not crash any effect in DEFS
  for (const id of Object.keys(DEFS) as PfxId[]) {
    assert.doesNotThrow(() => {
      bake(mockScene, id, [])
    }, `bake must not throw on effect ${id} when palette is []`)
  }
})

test('createFx renders with specified per-cast palette override colors', () => {
  const mod = DEFS.fireball.mod
  const { size: [w, h], origin: [ox, oy] } = mod.meta

  // 1. Render default fireball (predominantly orange/red)
  const fxDefault = createFx(mod, { x: ox, y: oy })
  const frameDefault = createFrame(w, h)
  fxDefault.update(0.1)
  fxDefault.draw(frameDefault)

  // 2. Render overridden green fireball
  const greenPalette = ['#052605', '#0a4d0a', '#148014', '#20b320', '#3deb3d', '#85f585', '#c2fac2', '#ffffff']
  const fxGreen = createFx(mod, { x: ox, y: oy, palette: greenPalette })
  const frameGreen = createFrame(w, h)
  fxGreen.update(0.1)
  fxGreen.draw(frameGreen)

  let defGreenDominant = 0
  let overrideGreenDominant = 0

  for (let i = 0; i < frameDefault.color.length; i++) {
    const c1 = frameDefault.color[i]
    const c2 = frameGreen.color[i]

    if (c1 !== 0) {
      // 0xAABBGGRR or 0xRRGGBB depending on endianness; check (G > R + 30)
      const r1 = c1 & 0xff
      const g1 = (c1 >> 8) & 0xff
      if (g1 > r1 + 30) defGreenDominant++
    }
    if (c2 !== 0) {
      const r2 = c2 & 0xff
      const g2 = (c2 >> 8) & 0xff
      if (g2 > r2 + 30) overrideGreenDominant++
    }
  }

  assert.equal(defGreenDominant, 0, 'Default fireball should have 0 green-dominant pixels')
  assert.ok(overrideGreenDominant > 100, `Overridden fireball must render green pixels (got ${overrideGreenDominant})`)

  // 3. Render with numeric palette override (0xRRGGBB)
  const numPalette = [0x052605, 0x0a4d0a, 0x148014, 0x20b320, 0x3deb3d, 0x85f585, 0xc2fac2, 0xffffff]
  const fxNum = createFx(mod, { x: ox, y: oy, palette: numPalette.map((c) => '#' + c.toString(16).padStart(6, '0')) })
  const frameNum = createFrame(w, h)
  fxNum.update(0.1)
  fxNum.draw(frameNum)
  let numGreenDominant = 0
  for (let i = 0; i < frameNum.color.length; i++) {
    const c = frameNum.color[i]
    if (c !== 0) {
      const r = c & 0xff
      const g = (c >> 8) & 0xff
      if (g > r + 30) numGreenDominant++
    }
  }
  assert.ok(numGreenDominant > 100, `Numeric palette fireball must also render green pixels (got ${numGreenDominant})`)
})

test('All Mage 4-element effects can update and draw without error', () => {
  for (const id of MAGE_PFX) {
    const def = DEFS[id]
    const { size: [w, h], origin: [ox, oy] } = def.mod.meta
    const fx = createFx(def.mod, { x: ox, y: oy, ...(def.opts ?? {}) })
    const frame = createFrame(w, h)
    assert.doesNotThrow(() => {
      fx.update(0.1)
      fx.draw(frame)
    }, `Effect ${id} must draw without errors`)
  }
})
