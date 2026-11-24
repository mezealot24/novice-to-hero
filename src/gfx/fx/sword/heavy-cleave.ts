// Berserker Heavy Cleave (one-shot, 0.55 s): a massive overhead-to-ground downward crescent cleave with a dark ghost
// trail, a flat shockwave ellipse slamming along the ground at impact, white flash, and upward spraying sparks.
// Origin = ground impact point under the target.
import { Lights, P, Particles, Rng, TAU, WHITE, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { type Blade, type PainterLike, drawBlade, glint } from '../thief/_blade'
import { BLOOD_CRIMSON } from './_pal'

export interface HeavyCleaveOpts {
  palette?: string[]
  seed?: number
}

export const meta = {
  name: 'Heavy cleave',
  desc: 'Massive overhead crescent cleave slamming the ground with a flat shock ring and upward sparks.',
  tags: ['swordsman', 'berserker', 'cleave', 'heavy', 'ground', 'one-shot'],
  size: [168, 144] as number[],
  origin: [96, 112] as number[],
  duration: 0.55,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: BLOOD_CRIMSON, seed: 8 },
}

const IMPACT_T = 0.085

export function create(o: HeavyCleaveOpts = {}) {
  const C = fit(o.palette ?? BLOOD_CRIMSON, 8)
  const R = new Rng(o.seed ?? 8)
  const main: Blade = { a: [-62, -92], c: [24, -68], b: [36, 4], w: 18, t0: 0, reveal: 0.08, hold: 0.06, life: 0.22 }
  const trail: Blade = { a: [-68, -86], c: [10, -58], b: [26, 6], w: 13, t0: 0.02, reveal: 0.08, hold: 0.04, life: 0.18 }
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => 2, sparks: [C[7], C[6], C[5], C[3]] })
  for (let i = 0; i < 20; i++) {
    const a = -Math.PI / 2 + R.range(-1.25, 1.25), sp = R.range(70, 175)
    ps.spawn(P.SPARK, R.range(-8, 8), -2, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.14, 0.26), i < 6 ? WHITE : C[6], 1, IMPACT_T + R.range(0, 0.02))
  }
  lights.add(0, -14, 52, C[4], 0.55, 0.22)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: PainterLike) {
      drawBlade(p, trail, t, C, { ghost: true, alpha: 0.6 })
      drawBlade(p, main, t, C)
      // flat ground shockwave ellipse
      const rk = ease.outQuart(seg(t, IMPACT_T, IMPACT_T + 0.34))
      const rf = 1 - smooth(IMPACT_T + 0.14, IMPACT_T + 0.38, t)
      if (rk > 0 && rf > 0.02) {
        const rx = 10 + 50 * rk, ry = rx * 0.24
        for (let i = 0; i < 140; i++) {
          const th = (i / 140) * TAU, x = Math.cos(th) * rx, y = Math.sin(th) * ry
          p.dot(x, y, Math.sin(th) > 0 ? C[6] : C[4], rf)
          p.dot(x * 0.92, y * 0.85 - 1, C[5], rf * 0.7)
        }
      }
      // impact flash & horizontal gleam
      const fl = seg(t, IMPACT_T, IMPACT_T + 0.015) * (1 - smooth(IMPACT_T + 0.025, IMPACT_T + 0.14, t))
      if (fl > 0) {
        p.glow(0, -4, 30, C[6], 0.75 * fl)
        glint(p, 0, -4, 15, C, fl)
      }
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
