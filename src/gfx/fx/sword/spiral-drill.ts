// Knight S4 Spiral Pierce (one-shot, 0.58 s): a bright horizontal drill lance wrapped by two counter-rotating helical
// energy ribbons, expanding vertical spiral rings along the shaft, and shattering diamond shards at the impact tip.
// Origin = impact point on target chest.
import { Lights, P, Particles, Rng, WHITE, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { SPIRAL_CYAN } from './_pal'

export interface SpiralDrillOpts {
  palette?: string[]
  seed?: number
}

interface Painter {
  dot(x: number, y: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number, a?: number | ((d: number, ang: number) => number)): void
}

export const meta = {
  name: 'Spiral drill',
  desc: 'Drilling lance with two helical energy ribbons, expanding vertical spiral rings and tip shards.',
  tags: ['swordsman', 'knight', 'spiral', 'pierce', 'drill', 'one-shot'],
  size: [164, 96] as number[],
  origin: [128, 48] as number[],
  duration: 0.58,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: SPIRAL_CYAN, seed: 13 },
}

export function create(o: SpiralDrillOpts = {}) {
  const C = fit(o.palette ?? SPIRAL_CYAN, 8)
  const R = new Rng(o.seed ?? 13)
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => Infinity, sparks: [C[7], C[6], C[5], C[4]] })
  for (let i = 0; i < 18; i++) {
    const a = R.range(-1.1, 1.1), sp = R.range(55, 130)
    ps.spawn(P.SPARK, R.range(-4, 6), R.range(-6, 6), Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.12, 0.24), i < 6 ? WHITE : C[6], 1, 0.08 + R.range(0, 0.08))
  }
  lights.add(-20, 0, 46, C[4], 0.5, 0.28)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: Painter) {
      const k = ease.outExpo(seg(t, 0, 0.14))
      const fade = 1 - smooth(0.32, 0.52, t)
      if (fade > 0.02) {
        const tipX = -82 + 96 * k, tailX = -114 + 38 * ease.inQuad(seg(t, 0.18, 0.48))
        const len = Math.max(8, tipX - tailX)
        p.glowLine(tailX, 0, tipX, 0, 10, C[5], 0.45 * fade)
        // core drill lance
        for (let x = Math.round(tailX); x <= Math.round(tipX); x++) {
          const u = (x - tailX) / len
          const half = u < 0.78 ? 1.8 + u * 3.6 : 4.6 * (1 - u) / 0.22
          const H = Math.max(0, Math.round(half))
          for (let y = -H; y <= H; y++) {
            const v = H > 0 ? Math.abs(y) / H : 0
            p.dot(x, y, v < 0.3 ? WHITE : v < 0.7 ? C[6] : C[4], fade)
          }
        }
        // two counter-rotating helical ribbons
        for (let s = 0; s < 2; s++) {
          for (let x = Math.round(tailX + 4); x <= Math.round(tipX - 6); x++) {
            const u = (x - tailX) / len
            const amp = (4 + 13 * (1 - u * 0.45)) * (0.5 + 0.5 * fade)
            const ph = x * 0.22 - t * 28 + s * Math.PI
            const y = Math.sin(ph) * amp, front = Math.cos(ph) > 0
            const c = front ? (u > 0.5 ? WHITE : C[6]) : C[3]
            p.dot(x, y, c, fade * (front ? 1 : 0.7))
            p.dot(x, y + (front ? 1 : -1), front ? C[5] : C[2], fade * 0.8)
          }
        }
        // 3 expanding vertical spiral rings along the drill
        for (let i = 0; i < 3; i++) {
          const rk = ease.outQuart(seg(t, 0.04 + i * 0.05, 0.36 + i * 0.05))
          const rf = fade * (1 - smooth(0.24 + i * 0.04, 0.46 + i * 0.04, t))
          if (rk > 0 && rf > 0.02) {
            const rx = -14 - i * 24 - rk * 12
            p.ellipse(rx, 0, 3 + rk * 4, 8 + rk * 18, i === 0 ? C[6] : C[5], (d: number) => (d > 0.74 ? rf : 0))
          }
        }
        p.glow(tipX, 0, 14, WHITE, 0.45 * fade)
      }
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
