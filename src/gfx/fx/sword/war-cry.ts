// Swordsman Taunt / War Cry (one-shot, 0.52 s): two staggered expanding amber-gold sonic shockwave rings, radial
// jagged shout rays bursting outward, and outward dust/spark particles. Origin = hero chest/shout centre.
import { Lights, P, Particles, Rng, TAU, WHITE, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { BLADE_GOLD } from './_pal'

export interface WarCryOpts {
  palette?: string[]
  seed?: number
}

interface Painter {
  dot(x: number, y: number, c: number, a?: number): void
  line(x0: number, y0: number, x1: number, y1: number, c: number, a?: number): void
  ring(cx: number, cy: number, r: number, w: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
}

export const meta = {
  name: 'War cry',
  desc: 'Staggered expanding amber-gold sonic shockwave rings and radial shout rays.',
  tags: ['swordsman', 'taunt', 'roar', 'shockwave', 'one-shot'],
  size: [152, 136] as number[],
  origin: [76, 68] as number[],
  duration: 0.52,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: BLADE_GOLD, seed: 29 },
}

export function create(o: WarCryOpts = {}) {
  const C = fit(o.palette ?? BLADE_GOLD, 8)
  const R = new Rng(o.seed ?? 29)
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => Infinity, sparks: [C[7], C[6], C[5], C[4]] })
  for (let i = 0; i < 16; i++) {
    const a = R.range(0, TAU), sp = R.range(65, 145)
    ps.spawn(P.SPARK, Math.cos(a) * 10, Math.sin(a) * 8, Math.cos(a) * sp, Math.sin(a) * sp * 0.75, R.range(0.12, 0.24), i < 4 ? WHITE : C[6], 1, R.range(0.02, 0.08))
  }
  lights.add(0, 0, 44, C[4], 0.45, 0.22)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: Painter) {
      // two staggered sonic rings
      for (let i = 0; i < 2; i++) {
        const t0 = i * 0.08, rk = ease.outQuart(seg(t, t0, t0 + 0.34)), rf = 1 - smooth(t0 + 0.16, t0 + 0.38, t)
        if (rk > 0 && rf > 0.02) {
          p.ring(0, 0, 10 + 44 * rk, 3, i === 0 ? C[6] : C[5], rf)
          p.ring(0, 0, 7 + 44 * rk, 1.5, WHITE, rf * 0.65)
        }
      }
      // radial shout rays
      const rayK = ease.outCubic(seg(t, 0, 0.22)), rayF = 1 - smooth(0.18, 0.38, t)
      if (rayK > 0 && rayF > 0.02) {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU + 0.15, r0 = 12 + rayK * 14, r1 = r0 + 18 * (1 - rayK * 0.35)
          p.line(Math.cos(a) * r0, Math.sin(a) * r0 * 0.8, Math.cos(a) * r1, Math.sin(a) * r1 * 0.8, i % 2 ? WHITE : C[6], rayF)
        }
        p.glow(0, 0, 22, C[5], 0.4 * rayF)
      }
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
