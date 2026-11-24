// Knight Lance Thrust (one-shot, 0.36 s): a high-speed horizontal piercing lance shooting left-to-right into the
// origin with a white-hot needle core, tapered spearhead flash, a vertical mach shock ring and forward sparks.
// Origin = spear impact point.
import { Lights, P, Particles, Rng, WHITE, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { BLADE_GOLD } from './_pal'

export interface LanceThrustOpts {
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
  name: 'Lance thrust',
  desc: 'High-speed horizontal piercing lance burst with white-hot core, vertical mach ring and forward sparks.',
  tags: ['swordsman', 'knight', 'spear', 'thrust', 'pierce', 'one-shot'],
  size: [152, 72] as number[],
  origin: [124, 36] as number[],
  duration: 0.36,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: BLADE_GOLD, seed: 3 },
}

export function create(o: LanceThrustOpts = {}) {
  const C = fit(o.palette ?? BLADE_GOLD, 8)
  const R = new Rng(o.seed ?? 3)
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => Infinity, sparks: [C[7], C[6], C[5], C[4]] })
  for (let i = 0; i < 14; i++) {
    const a = R.range(-0.75, 0.75), sp = R.range(60, 155)
    ps.spawn(P.SPARK, R.range(-8, 2), R.range(-4, 4), Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.08, 0.18), i < 5 ? WHITE : C[6], 1, 0.04 + R.range(0, 0.03))
  }
  lights.add(-12, 0, 38, C[4], 0.45, 0.16)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: Painter) {
      const k = ease.outExpo(seg(t, 0, 0.12))
      const fade = 1 - smooth(0.14, 0.32, t)
      if (fade > 0.02) {
        const tipX = -76 + 86 * k, tailX = -114 + 34 * ease.inQuad(seg(t, 0.08, 0.30))
        const len = Math.max(6, tipX - tailX)
        p.glowLine(tailX, 0, tipX, 0, 9, C[5], 0.4 * fade)
        for (let x = Math.round(tailX); x <= Math.round(tipX); x++) {
          const u = (x - tailX) / len
          const half = u < 0.72 ? 1.5 + u * 5.2 : 6.2 * (1 - u) / 0.28
          const H = Math.max(0, Math.round(half))
          for (let y = -H; y <= H; y++) {
            const v = H > 0 ? Math.abs(y) / H : 0
            p.dot(x, y, v < 0.3 ? WHITE : v < 0.65 ? C[6] : v < 0.9 ? C[4] : C[2], fade)
          }
        }
        // vertical mach shock ring behind the tip
        const rk = ease.outCubic(seg(t, 0.04, 0.28)), rf = 1 - smooth(0.12, 0.30, t)
        if (rk > 0 && rf > 0.02) {
          p.ellipse(-18 - rk * 18, 0, 3 + rk * 4, 9 + rk * 16, C[6], (d: number) => (d > 0.72 ? rf : 0))
        }
      }
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
