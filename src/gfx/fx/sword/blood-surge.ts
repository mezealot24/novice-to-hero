// Swordsman Blood Frenzy / Berserker Ignore Pain (one-shot, 0.62 s): a pulsing crimson ground ring at the feet,
// jagged rising blood-flame tongues licking up around the hero, and erupting crimson droplets/sparks.
// Origin = ground under the hero.
import { Lights, P, Particles, Rng, TAU, WHITE, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { BLOOD_CRIMSON } from './_pal'

export interface BloodSurgeOpts {
  palette?: string[]
  seed?: number
}

interface Painter {
  dot(x: number, y: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
}

export const meta = {
  name: 'Blood surge',
  desc: 'Pulsing crimson ground ring with jagged rising blood-flame tongues and erupting droplets.',
  tags: ['swordsman', 'berserker', 'blood', 'buff', 'aura', 'one-shot'],
  size: [120, 124] as number[],
  origin: [60, 108] as number[],
  duration: 0.62,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: BLOOD_CRIMSON, seed: 23 },
}

export function create(o: BloodSurgeOpts = {}) {
  const C = fit(o.palette ?? BLOOD_CRIMSON, 8)
  const R = new Rng(o.seed ?? 23)
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => 2, sparks: [C[7], C[6], C[5], C[3]] })
  for (let i = 0; i < 16; i++) {
    const x = R.range(-26, 26), vy = -R.range(60, 145), vx = R.range(-18, 18)
    ps.spawn(P.SPARK, x, -4, vx, vy, R.range(0.16, 0.30), i < 4 ? WHITE : C[5], 1, R.range(0.02, 0.12))
  }
  lights.add(0, -28, 44, C[4], 0.5, 0.28)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: Painter) {
      const k = ease.outQuart(seg(t, 0, 0.32)), fade = 1 - smooth(0.32, 0.56, t)
      if (fade > 0.02) {
        const rx = 12 + 34 * k, ry = rx * 0.26
        for (let i = 0; i < 130; i++) {
          const a = (i / 130) * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry
          p.dot(x, y, Math.sin(a) > 0 ? C[6] : C[4], fade)
          p.dot(x * 0.92, y * 0.85 - 1, C[3], fade * 0.7)
        }
        // rising jagged blood-flame tongues around the body
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU + 0.2, x0 = Math.cos(a) * rx * 0.72, y0 = Math.sin(a) * ry * 0.75
          const rise = ease.outCubic(seg(t, i * 0.015, 0.38 + i * 0.015))
          const h = 36 + (i % 3) * 16
          for (let j = 0; j < 14; j++) {
            const v = j / 14, y = y0 - rise * h * v - v * 12
            const x = x0 + Math.sin(v * 6 + t * 18 + i) * 3
            const alpha = fade * (1 - v * 0.85)
            const c = v < 0.22 ? (Math.sin(a) > 0 ? WHITE : C[6]) : v < 0.58 ? C[5] : C[3]
            p.dot(x, y, c, alpha)
            p.dot(x + (x0 >= 0 ? -1 : 1), y, C[4], alpha * 0.75)
          }
        }
        p.glow(0, -18, 28, C[4], 0.35 * fade)
      }
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
