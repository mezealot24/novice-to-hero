import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BERSERKER_PFX,
  BLADE_GOLD,
  BLOOD_CRIMSON,
  DEFS,
  KNIGHT_PFX,
  SOLAR_ORANGE,
  SPIRAL_CYAN,
  STEEL_SILVER,
  SWORD_PFX,
  texKey,
  type PfxId,
  type PfxPreloadEntry,
} from '../src/gfx/pixelfx'
import { clearFrame, createFrame, createFx } from '../src/vendor/pixelfx/core/index.js'

const ONESHOT_IDS: PfxId[] = [
  'sealCut',
  'silenceSeal',
  'castBreak',
  'cleanse',
  'awakenBurst',
  'swordSlash',
  'heavyCleave',
  'spinSlash',
  'lanceThrust',
  'spiralDrill',
  'chargeDash',
  'guardDome',
  'bloodSurge',
  'warCry',
  'rampageBurst',
]
const LOOP_IDS: PfxId[] = ['awakenAura', 'windWave', 'spearWave', 'spearSpin']
const ALL_IDS: PfxId[] = [...ONESHOT_IDS, ...LOOP_IDS]
const idOf = (e: PfxPreloadEntry): PfxId => (typeof e === 'string' ? e : e.id)

const EDGE_OK: Partial<Record<PfxId, number>> = {
  windWave: 40,
  spearWave: 40,
}

interface Sample { t: number; lit: number; edge: number }

/** Plays one effect and counts lit pixels (and art pixels on the outermost frame ring) every 0.05 s. */
function sample(id: PfxId, palette?: string[]): Sample[] {
  const { mod, opts } = DEFS[id] as { mod: (typeof DEFS)[PfxId]['mod']; opts?: Record<string, unknown> }
  const { size: [w, h], origin: [ox, oy], duration } = mod.meta
  const fx = createFx(mod, { x: ox, y: oy, ...(opts ?? {}), ...(palette ? { palette } : {}) })
  const frame = createFrame(w, h)
  const out: Sample[] = []
  const steps = Math.round(duration / 0.05)
  for (let i = 0; i <= steps; i++) {
    if (i > 0) fx.update(0.05)
    clearFrame(frame)
    fx.draw(frame)
    let lit = 0, edge = 0
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = y * w + x
        if (frame.color[k] === 0 && frame.light[k] === 0) continue
        lit++
        if (frame.color[k] === 0) continue
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge++
      }
    }
    out.push({ t: i * 0.05, lit, edge })
  }
  return out
}

test('all 19 sword-line effects are registered with valid meta and no stock actor', () => {
  for (const id of ALL_IDS) {
    const def = DEFS[id]
    assert.ok(def, `DEFS must include ${id}`)
    const meta = def.mod.meta as unknown as Record<string, unknown>
    assert.ok(Array.isArray(meta.size) && meta.size.length === 2, `${id} size`)
    assert.ok(Array.isArray(meta.origin) && meta.origin.length === 2, `${id} origin`)
    assert.ok(typeof meta.duration === 'number' && (meta.duration as number) > 0, `${id} duration`)
    assert.equal(meta.actor, undefined, `${id} must not have meta.actor`)
  }
})

test('SWORD_PFX, KNIGHT_PFX, and BERSERKER_PFX preload every effect and palette variant', () => {
  const all = new Set([...SWORD_PFX, ...KNIGHT_PFX, ...BERSERKER_PFX].map(idOf))
  for (const id of ALL_IDS) assert.ok(all.has(id), `sword-line preload lists must include ${id}`)
  assert.ok(SWORD_PFX.some((e) => typeof e !== 'string' && e.id === 'swordSlash' && e.palette === BLADE_GOLD), 'combo Lv3 gold slash')
  assert.ok(KNIGHT_PFX.some((e) => typeof e !== 'string' && e.id === 'lanceThrust' && e.palette === SOLAR_ORANGE), 'Lord Knight extra lance')
  assert.ok(BERSERKER_PFX.some((e) => typeof e !== 'string' && e.id === 'swordSlash' && e.palette === BLOOD_CRIMSON), 'Berserker crimson slash')
  assert.ok(BERSERKER_PFX.some((e) => typeof e !== 'string' && e.id === 'awakenAura' && e.palette === BLOOD_CRIMSON), 'Berserker rampage aura')
})

test('every non-looping sword-line effect draws inside its frame and ends empty', () => {
  const variants: [PfxId, string[] | undefined][] = [
    ['swordSlash', undefined],
    ['swordSlash', BLADE_GOLD],
    ['swordSlash', BLOOD_CRIMSON],
    ['heavyCleave', undefined],
    ['heavyCleave', SOLAR_ORANGE],
    ['spinSlash', undefined],
    ['spinSlash', BLADE_GOLD],
    ['lanceThrust', undefined],
    ['lanceThrust', SOLAR_ORANGE],
    ['spiralDrill', undefined],
    ['chargeDash', undefined],
    ['guardDome', undefined],
    ['bloodSurge', undefined],
    ['bloodSurge', SOLAR_ORANGE],
    ['warCry', undefined],
    ['rampageBurst', undefined],
    ['sealCut', undefined],
    ['sealCut', BLADE_GOLD],
    ['silenceSeal', undefined],
    ['castBreak', undefined],
    ['cleanse', undefined],
    ['awakenBurst', undefined],
  ]
  for (const [id, pal] of variants) {
    const s = sample(id, pal)
    const peak = Math.max(...s.map((x) => x.lit))
    assert.ok(peak > 40, `${id} peak lit pixels ${peak} looks too small`)
    const allow = EDGE_OK[id] ?? 12
    for (const x of s) assert.ok(x.edge <= allow, `${id} touches frame border at t=${x.t.toFixed(2)} (${x.edge} px)`)
    const last = s.at(-1)
    assert.ok(last && last.lit <= 8, `${id} final frame still has ${last?.lit} lit pixels`)
  }
})

test('looping sword-line effects draw every frame and stay inside their frames', () => {
  const loops: [PfxId, string[] | undefined][] = [
    ['awakenAura', undefined],
    ['awakenAura', BLOOD_CRIMSON],
    ['windWave', undefined],
    ['spearWave', undefined],
    ['spearSpin', undefined],
  ]
  for (const [id, pal] of loops) {
    assert.equal((DEFS[id].mod.meta as unknown as { loop: boolean }).loop, true, `${id} loops`)
    const s = sample(id, pal)
    const allow = EDGE_OK[id] ?? 12
    for (const x of s) {
      assert.ok(x.lit > 40, `${id} only ${x.lit} lit pixels at t=${x.t.toFixed(2)}`)
      assert.ok(x.edge <= allow, `${id} touches frame border at t=${x.t.toFixed(2)} (${x.edge} px)`)
    }
  }
})

test('palette override produces distinct texKey and pixels for swordSlash', () => {
  assert.equal(texKey('swordSlash'), 'pfx_swordSlash')
  assert.notEqual(texKey('swordSlash', STEEL_SILVER), texKey('swordSlash', BLOOD_CRIMSON))
  assert.notEqual(texKey('spiralDrill', SPIRAL_CYAN), texKey('spiralDrill', BLADE_GOLD))
})
