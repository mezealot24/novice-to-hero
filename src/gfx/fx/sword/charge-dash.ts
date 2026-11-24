// Knight Charge Attack opener (one-shot, 0.45 s): horizontal golden speed-lines streaming from the left, fluttering
// bright Peco feather motes, and a forward conical impact shockwave + glint at the target. Origin = impact point.
import { Lights, P, Particles, Rng, WHITE, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { glint } from '../thief/_blade'
import { BLADE_GOLD } from './_pal'

export interface ChargeDashOpts {
  palette?: string[]
  seed?: number
}

interface Painter {
  dot(x: number, y: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void
  disc(cx: number, cy: number, r: number, c: number, a: number): void
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number, a?: number | ((d: number, ang: number) => number)): void
}

export const meta = {
  name: 'Charge dash',
  desc: 'Golden horizontal speed-lines, feather motes and forward shock cone on Knight Charge Attack.',
  tags: ['swordsman', 'knight', 'charge', 'dash', 'speed', 'one-shot'],
  size: [176, 96] as number[],
  origin: [140, 56] as number[],
  duration: 0.45,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: BLADE_GOLD, seed: 17 },
}

const HIT_T = 0.08

export function create(o: ChargeDashOpts = {}) {
  const C = fit(o.palette ?? BLADE_GOLD, 8)
  const R = new Rng(o.seed ?? 17)
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => Infinity, sparks: [C[7], C[6], C[5], C[4]] })
  for (let i = 0; i < 14; i++) {
    const a = Math.PI + R.range(-0.65, 0.65), sp = R.range(50, 140)
    ps.spawn(P.SPARK, R.range(-24, 0), R.range(-12, 12), Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.12, 0.24), i < 5 ? WHITE : C[6], 1, HIT_T + R.range(0, 0.04))
  }
  lights.add(-12, 0, 44, C[4], 0.45, 0.2)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: Painter) {
      const fade = 1 - smooth(0.22, 0.40, t)
      if (fade > 0.02) {
        // streaming horizontal speed lines
        for (let i = 0; i < 6; i++) {
          const y = -26 + i * 10 + (i % 2 ? -2 : 2)
          const k = ease.outQuad(seg(t, i * 0.015, 0.22 + i * 0.015))
          const x1 = -96 + k * 104, len = 26 + (i % 3) * 14
          for (let dx = 0; dx <= len; dx++) {
            const u = dx / len, x = x1 - dx
            if (x < -130 || x > 22) continue
            p.dot(x, y, u < 0.2 ? WHITE : u < 0.55 ? C[6] : C[4], fade * (1 - u))
          }
        }
        // forward shock ring cone at impact
        const rk = ease.outQuart(seg(t, HIT_T, HIT_T + 0.28)), rf = 1 - smooth(HIT_T + 0.10, HIT_T + 0.30, t)
        if (rk > 0 && rf > 0.02) {
          p.ellipse(4 - rk * 8, 0, 4 + rk * 12, 10 + rk * 22, C[6], (d: number) => (d > 0.72 ? rf : 0))
        }
        const fl = seg(t, HIT_T - 0.02, HIT_T + 0.01) * (1 - smooth(HIT_T + 0.02, HIT_T + 0.14, t))
        glint(p, 4, 0, 12, C, fl)
      }
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
