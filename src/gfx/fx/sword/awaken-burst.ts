// ⚔️ ปลุกดาบ cast: a giant gold sword of light plunges point-first into the ground at the hero's feet, a white flash
// on impact, a flat shock ring runs out along the floor, sparks spray up and the blade dissolves upward into motes.
// Origin = the ground under the hero. One-shot, 0.85 s.
import { Lights, P, Particles, Rng, TAU, WHITE, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { BLADE_GOLD } from './_pal'

export interface AwakenBurstOpts {
  palette?: string[]
  seed?: number
}

interface Painter {
  dot(x: number, y: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void
  rect(x: number, y: number, w: number, h: number, c: number, a?: number): void
}

export const meta = {
  name: 'Awaken burst',
  desc: 'A giant gold light sword plunges into the ground; impact flash, a flat shock ring, sparks, then the blade dissolves upward.',
  tags: ['swordsman', 'buff', 'sword', 'gold', 'ground', 'one-shot'],
  size: [160, 184] as number[],
  origin: [80, 164] as number[],
  duration: 0.95,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: BLADE_GOLD, seed: 3 },
}

const HIT_T = 0.1, BLADE = 96, HALF_W = 5

/** The light sword: blade from y0 (hilt end) down to y1 (tip), cross-guard and grip above. a = alpha, cut = how much of
 *  the blade (from the hilt down) has dissolved, 0..1. */
function sword(p: Painter, y1: number, C: number[], a: number, cut: number) {
  const y0 = y1 - BLADE
  for (let y = y0; y <= y1; y++) {
    const u = (y - y0) / BLADE // 0 hilt .. 1 tip
    if (u < cut) continue
    const w = u > 0.8 ? HALF_W * (1 - u) / 0.2 : HALF_W
    for (let x = -Math.ceil(w); x <= Math.ceil(w); x++) {
      const v = Math.abs(x) / Math.max(0.6, w)
      if (v > 1.05) continue
      p.dot(x, y, v < 0.3 ? WHITE : v < 0.65 ? C[6] : x < 0 ? C[5] : C[4], a)
    }
  }
  const ga = a * (1 - Math.min(1, cut * 5))
  if (ga > 0.02) { // guard + grip + pommel fade first
    p.rect(-13, y0 - 3, 27, 3, C[4], ga); p.rect(-13, y0 - 3, 27, 1, C[6], ga)
    p.rect(-2, y0 - 15, 5, 12, C[3], ga); p.rect(-1, y0 - 15, 2, 12, C[5], ga)
    p.rect(-3, y0 - 19, 7, 4, C[5], ga)
  }
  p.glowLine(0, Math.max(y0, y0 + cut * BLADE), 0, y1, 12, C[4], 0.3 * a)
}

export function create(o: AwakenBurstOpts = {}) {
  const C = fit(o.palette ?? BLADE_GOLD, 8)
  const R = new Rng(o.seed ?? 3)
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [C[7], C[6], C[5], C[4]] })
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 2 + R.range(-1.2, 1.2), sp = R.range(70, 170)
    ps.spawn(P.SPARK, R.range(-4, 4), -2, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.4), WHITE, 1, HIT_T)
  }
  for (let i = 0; i < 18; i++) { // motes off the dissolving blade
    const y = -R.range(10, BLADE)
    ps.spawn(P.SPARK, R.range(-4, 4), y, R.range(-12, 12), -R.range(20, 50), R.range(0.2, 0.32), C[5], 1, R.range(0.35, 0.58))
  }
  let t = 0, lit = false

  return {
    update(dt: number) {
      t += dt
      if (!lit && t >= HIT_T) { lit = true; lights.add(0, -40, 56, C[4], 0.55, 0.3) }
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: Painter) {
      // the plunge: from far above, fast in; buried a little on impact
      const fall = ease.inQuad(seg(t, 0, HIT_T)), tip = -44 + 48 * fall
      const cut = ease.inQuad(seg(t, 0.32, 0.7)), a = Math.min(1, t / 0.04 + 0.25) * (1 - smooth(0.55, 0.75, t))
      if (a > 0.02) sword(p, tip, C, a, cut)
      // impact flash + shock ring
      const fl = seg(t, HIT_T, HIT_T + 0.02) * (1 - smooth(HIT_T + 0.03, HIT_T + 0.14, t))
      if (fl > 0) { p.glow(0, -6, 34, C[6], 0.8 * fl); for (let x = -18; x <= 18; x++) p.dot(x, -1, WHITE, fl * (1 - Math.abs(x) / 19)) }
      const rk = ease.outQuart(seg(t, HIT_T, HIT_T + 0.4)), rf = 1 - smooth(HIT_T + 0.15, HIT_T + 0.42, t)
      if (rk > 0 && rf > 0.02) {
        const rx = 8 + 62 * rk, ry = rx * 0.22
        for (let i = 0; i < 120; i++) {
          const th = (i / 120) * TAU, x = Math.cos(th) * rx, y = Math.sin(th) * ry
          p.dot(x, y, Math.sin(th) > 0 ? C[6] : C[4], rf); p.dot(x * 0.95, y * 0.85 - 1, C[5], rf * 0.7)
        }
      }
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
