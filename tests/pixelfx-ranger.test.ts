import test from 'node:test'
import assert from 'node:assert/strict'
import { ARCHER_PFX, BEAST_PFX, DEFS, POISON_GREEN, RICOCHET_LEAF, texKey, type PfxId, type PfxPreloadEntry } from '../src/gfx/pixelfx'
import { createFrame, createFx, clearFrame } from '../src/vendor/pixelfx/core/index.js'

const ARCHER_IDS: PfxId[] = ['arrowShot', 'arrowHit', 'arrowRain', 'pierceShot', 'snareTrap', 'huntMark']
const BEAST_IDS: PfxId[] = ['hawkDive', 'clawSlash', 'boarCharge', 'beastRoar', 'stampede']
const ALL_IDS = [...ARCHER_IDS, ...BEAST_IDS]
const idOf = (e: PfxPreloadEntry): PfxId => (typeof e === 'string' ? e : e.id)

/** Effects whose art legitimately enters through the frame edge (a projectile's trail, arrows falling in from the top). */
const EDGE_OK: Partial<Record<PfxId, number>> = { arrowShot: 40, arrowRain: 60, pierceShot: 120, boarCharge: 200 }

interface Sample { t: number; lit: number; edge: number }

/** Plays one effect and counts lit pixels (and lit pixels on the outermost frame ring) every 0.05 s from 0 to its duration. */
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
        if (frame.color[k] === 0) continue // only the glow light layer reaches here: faint, not clipped art
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge++
      }
    }
    out.push({ t: i * 0.05, lit, edge })
  }
  return out
}

test('all 11 ranger effects are registered with valid meta and no stock actor', () => {
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

test('ARCHER_PFX and BEAST_PFX list their effects', () => {
  const archer = new Set(ARCHER_PFX.map(idOf)), beast = new Set(BEAST_PFX.map(idOf))
  for (const id of ARCHER_IDS) assert.ok(archer.has(id), `ARCHER_PFX must include ${id}`)
  for (const id of BEAST_IDS) assert.ok(beast.has(id), `BEAST_PFX must include ${id}`)
  assert.ok(ARCHER_PFX.some((e) => typeof e !== 'string' && e.id === 'arrowShot' && e.palette === POISON_GREEN), 'poison arrow variant is preloaded')
  assert.ok(ARCHER_PFX.some((e) => typeof e !== 'string' && e.id === 'arrowShot' && e.palette === RICOCHET_LEAF), 'ricochet arrow variant is preloaded')
})

test('every ranger effect draws pixels and stays inside its frame', () => {
  for (const id of ALL_IDS) {
    const s = sample(id)
    assert.ok(s.some((x) => x.lit > 0), `${id} must draw something`)
    const peak = Math.max(...s.map((x) => x.lit))
    assert.ok(peak > 40, `${id} peak lit pixels ${peak} looks too small`)
    const allow = EDGE_OK[id] ?? 12
    for (const x of s) assert.ok(x.edge <= allow, `${id} touches the frame border at t=${x.t.toFixed(2)} (${x.edge} px): it would be clipped`)
  }
})

test('non-looping ranger effects end empty (final frame at t = duration)', () => {
  for (const id of ALL_IDS) {
    if ((DEFS[id].mod.meta as { loop?: boolean }).loop) continue
    const last = sample(id).at(-1)
    assert.ok(last, id)
    assert.ok(last.lit <= 8, `${id} final frame still has ${last.lit} lit pixels`)
  }
})

test('arrowShot is the only looping ranger effect', () => {
  for (const id of ALL_IDS) assert.equal(!!(DEFS[id].mod.meta as { loop?: boolean }).loop, id === 'arrowShot', id)
})

test('a palette override changes arrowShot (texKey and pixels)', () => {
  assert.equal(texKey('arrowShot'), 'pfx_arrowShot')
  assert.notEqual(texKey('arrowShot', POISON_GREEN), texKey('arrowShot'))
  assert.notEqual(texKey('arrowShot', POISON_GREEN), texKey('arrowShot', RICOCHET_LEAF))
  const { size: [w, h], origin: [ox, oy] } = DEFS.arrowShot.mod.meta
  const render = (palette?: string[]) => {
    const fx = createFx(DEFS.arrowShot.mod, { x: ox, y: oy, ...(palette ? { palette } : {}) })
    const frame = createFrame(w, h)
    fx.update(0.1)
    fx.draw(frame)
    return frame.color
  }
  const a = render(), b = render(POISON_GREEN)
  let diff = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++
  assert.ok(diff > 50, `palette override must change pixels (got ${diff})`)
})
