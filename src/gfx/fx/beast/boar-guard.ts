// Beastmaster boar: hexagonal guardian barrier popping up when the boar splits a landed hit.
import { Lights, P, Particles, Rng, WHITE, clamp, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'

export interface BoarGuardOpts {
  palette?: string[]
  seed?: number
}

interface PainterLike {
  dot(x: number, y: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, a?: number): void
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void
}

export const GUARD_PALETTE = ['#241408', '#4a260d', '#7d4414', '#b86c1e', '#e89b32', '#f7c85c', '#ffea9f', '#ffffff']

export const meta = {
  name: 'Boar guard',
  desc: 'Amber hexagonal guardian shield flashes when the boar intercepts part of a hit, then dissolves into warm sparks.',
  tags: ['beastmaster', 'boar', 'guard', 'shield', 'one-shot'],
  size: [96, 96] as number[],
  origin: [48, 48] as number[],
  duration: 0.35,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: GUARD_PALETTE, seed: 17 },
}

function drawHex(p: PainterLike, cx: number, cy: number, r: number, thick: number, alpha: number, C: number[], hot: number): void {
  const verts: [number, number][] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6
    verts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  for (let i = 0; i < 6; i++) {
    const [x0, y0] = verts[i]
    const [x1, y1] = verts[(i + 1) % 6]
    const len = Math.hypot(x1 - x0, y1 - y0)
    const nx = -(y1 - y0) / (len || 1)
    const ny = (x1 - x0) / (len || 1)
    const steps = Math.ceil(len * 2)
    for (let s = 0; s <= steps; s++) {
      const u = s / steps
      const x = x0 + (x1 - x0) * u
      const y = y0 + (y1 - y0) * u
      for (let o = -thick; o <= thick; o += 0.5) {
        const ao = Math.abs(o)
        const c = ao < 0.7 ? (hot > 0.35 ? WHITE : C[6]) : ao < thick * 0.65 ? C[5] : C[3]
        p.dot(x + nx * o, y + ny * o, c, alpha)
      }
    }
    p.dot(x0, y0, WHITE, alpha * clamp(0.6 + hot * 0.4))
  }
}

export function create(o: BoarGuardOpts = {}) {
  const C = fit(o.palette ?? GUARD_PALETTE, 8)
  const R = new Rng(o.seed ?? 17)
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => Infinity, sparks: [C[7], C[6], C[5], C[4]] })
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12 + R.range(-0.2, 0.2)
    const sp = R.range(28, 65)
    ps.spawn(P.SPARK, Math.cos(a) * 14, Math.sin(a) * 14, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.12, 0.22), R.pick([WHITE, C[6], C[5]]), 1, 0.03 + R.range(0, 0.04))
  }
  lights.add(0, 0, 32, C[5], 0.45, 0.18)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: PainterLike) {
      const pop = ease.outCubic(seg(t, 0, 0.09))
      const fade = 1 - smooth(0.16, 0.33, t)
      if (fade > 0.01) {
        const hot = 1 - smooth(0.02, 0.16, t)
        const rOuter = 12 + 13 * pop
        drawHex(p, 0, 0, rOuter, 1.6, fade, C, hot)
        drawHex(p, 0, 0, rOuter * 0.56, 1.0, fade * 0.7, C, hot * 0.8)
        p.glow(0, 0, rOuter * 0.9, C[5], 0.3 * fade)
      }
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
