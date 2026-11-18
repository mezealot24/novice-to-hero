import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFS, MOB_LILAC, ROGUE_GOLD, THIEF_PFX, type PfxId, type PfxPreloadEntry } from '../src/gfx/pixelfx'
import { createFrame, createFx, clearFrame } from '../src/vendor/pixelfx/core/index.js'

const THIEF_IDS: PfxId[] = ['daggerCross', 'shadowSlash', 'venomStab', 'smokeBomb', 'knifeStorm']
const LOOP_IDS: PfxId[] = ['flyingKnife'] // projectiles: never end on their own
const idOf = (e: PfxPreloadEntry): PfxId => (typeof e === 'string' ? e : e.id)

interface Sample { t: number; lit: number; edge: number }

/** Plays one effect and counts lit pixels (and art pixels on the outermost frame ring) every 0.05 s. */
function sample(id: PfxId, palette?: string[]): Sample[] {
  const { mod } = DEFS[id]
  const { size: [w, h], origin: [ox, oy], duration } = mod.meta
  const fx = createFx(mod, { x: ox, y: oy, ...(palette ? { palette } : {}) })
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

test('thief effects are registered with valid meta and no stock actor', () => {
  for (const id of THIEF_IDS) {
    const meta = DEFS[id].mod.meta as unknown as Record<string, unknown>
    assert.ok(Array.isArray(meta.size) && meta.size.length === 2, `${id} size`)
    assert.ok(Array.isArray(meta.origin) && meta.origin.length === 2, `${id} origin`)
    assert.ok(typeof meta.duration === 'number' && (meta.duration as number) > 0, `${id} duration`)
    assert.equal(meta.actor, undefined, `${id} must not have meta.actor`)
  }
})

test('THIEF_PFX preloads every thief effect and the gold / lilac variants', () => {
  const ids = new Set(THIEF_PFX.map(idOf))
  for (const id of THIEF_IDS) assert.ok(ids.has(id), `THIEF_PFX must include ${id}`)
  assert.ok(THIEF_PFX.some((e) => typeof e !== 'string' && e.id === 'shadowSlash' && e.palette === ROGUE_GOLD), 'Back Stab gold')
  assert.ok(THIEF_PFX.some((e) => typeof e !== 'string' && e.id === 'daggerCross' && e.palette === MOB_LILAC), 'Mobster lilac')
  assert.ok(THIEF_PFX.some((e) => typeof e !== 'string' && e.id === 'daggerCross' && e.palette === ROGUE_GOLD), 'พายุมีด gold knife hits')
  for (const id of LOOP_IDS) assert.ok(ids.has(id), `THIEF_PFX must include ${id}`)
})

test('every thief effect draws, stays inside its frame and ends empty', () => {
  for (const id of THIEF_IDS) {
    for (const pal of [undefined, ROGUE_GOLD, MOB_LILAC]) {
      const s = sample(id, pal)
      const peak = Math.max(...s.map((x) => x.lit))
      assert.ok(peak > 40, `${id} peak lit pixels ${peak} looks too small`)
      for (const x of s) assert.ok(x.edge <= 12, `${id} touches the frame border at t=${x.t.toFixed(2)} (${x.edge} px): it would be clipped`)
      const last = s.at(-1)
      assert.ok(last && last.lit <= 8, `${id} final frame still has ${last?.lit} lit pixels`)
    }
  }
})

test('the Rogue flying knife loops, draws every frame and stays inside its frame', () => {
  for (const id of LOOP_IDS) {
    assert.equal((DEFS[id].mod.meta as unknown as { loop: boolean }).loop, true, `${id} loops`)
    const s = sample(id)
    for (const x of s) {
      assert.ok(x.lit > 40, `${id} only ${x.lit} lit pixels at t=${x.t.toFixed(2)}`)
      assert.ok(x.edge <= 12, `${id} touches the frame border at t=${x.t.toFixed(2)} (${x.edge} px)`)
    }
  }
})
