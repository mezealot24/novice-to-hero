// Whirlwind / Brandish Spin Slash (one-shot, 0.55 s): a 3D foreshortened 360-degree horizontal whirlwind ribbon
// sweeping around the origin with a white-hot leading edge, bright mid-tone body, darker back arc and orbiting sparks.
// Origin = centre of the spin at waist/chest height.
import { Lights, P, Particles, Rng, TAU, WHITE, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { STEEL_SILVER } from './_pal'

export interface SpinSlashOpts {
  palette?: string[]
  seed?: number
}

interface Painter {
  dot(x: number, y: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
}

export const meta = {
  name: 'Spin slash',
  desc: 'Foreshortened 360-degree horizontal whirlwind slash ribbon with white-hot leading edge and sparks.',
  tags: ['swordsman', 'knight', 'whirlwind', 'spin', 'aoe', 'one-shot'],
  size: [176, 88] as number[],
  origin: [88, 52] as number[],
  duration: 0.55,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: STEEL_SILVER, seed: 11 },
}

export function create(o: SpinSlashOpts = {}) {
  const C = fit(o.palette ?? STEEL_SILVER, 8)
  const R = new Rng(o.seed ?? 11)
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => Infinity, sparks: [C[7], C[6], C[5], C[4]] })
  for (let i = 0; i < 18; i++) {
    const a = R.range(0, TAU), rx = R.range(42, 66), ry = rx * 0.28
    const vx = -Math.sin(a) * R.range(40, 90) + Math.cos(a) * 20
    const vy = Math.cos(a) * R.range(12, 26) - R.range(10, 35)
    ps.spawn(P.SPARK, Math.cos(a) * rx, Math.sin(a) * ry, vx, vy, R.range(0.12, 0.24), i < 6 ? WHITE : C[6], 1, R.range(0.03, 0.18))
  }
  lights.add(0, 0, 56, C[4], 0.45, 0.24)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: Painter) {
      const head = ease.outCubic(seg(t, 0, 0.24)) * TAU * 1.15
      const tail = ease.inQuad(seg(t, 0.14, 0.46)) * TAU * 1.15
      const fade = 1 - smooth(0.32, 0.50, t)
      if (fade > 0.02 && head > tail) {
        const span = head - tail, steps = Math.max(24, Math.ceil(span * 52))
        const rx = 64, ry = 18
        for (let i = 0; i <= steps; i++) {
          const u = i / steps, ang = tail + span * u + Math.PI * 0.75
          const prof = Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.1))
          const thick = (3 + 7 * prof) * (0.4 + 0.6 * fade)
          const front = Math.sin(ang) > 0
          const cx = Math.cos(ang) * rx, cy = Math.sin(ang) * ry
          const nx = Math.cos(ang), ny = Math.sin(ang) * 0.35
          for (let w = -thick * 0.5; w <= thick * 0.5; w += 0.6) {
            const v = Math.abs(w) / Math.max(0.8, thick * 0.5)
            const lead = u > 0.82
            let c: number
            if (!front) c = v < 0.4 ? C[4] : C[2]
            else if (lead && v < 0.45) c = WHITE
            else if (v < 0.35) c = C[7]
            else if (v < 0.68) c = C[5]
            else c = C[3]
            p.dot(cx + nx * w, cy + ny * w, c, fade * (front ? 1 : 0.7))
          }
        }
        // inner wind echo ring
        const innerFade = fade * (1 - smooth(0.24, 0.42, t))
        if (innerFade > 0.03) {
          for (let i = 0; i < 64; i++) {
            const ang = (i / 64) * TAU + t * 10
            if (Math.sin(ang) < -0.2) continue
            p.dot(Math.cos(ang) * 44, Math.sin(ang) * 11 - 4, C[5], innerFade * 0.65)
          }
        }
        const hx = Math.cos(head + Math.PI * 0.75) * rx, hy = Math.sin(head + Math.PI * 0.75) * ry
        p.glow(hx, hy, 12, C[6], 0.55 * fade)
      }
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
