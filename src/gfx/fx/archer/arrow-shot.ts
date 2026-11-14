// Archer basic shot: a wooden arrow with a steel head and feather fletching flying right, wind streak behind it.
import { Rng, cycle, fit, fly, TAU, WHITE } from '../../../vendor/pixelfx/core/index.js'

export interface ArrowShotOpts {
  palette?: string[]
  seed?: number
  length?: number
}

interface PainterLike {
  px(x: number, y: number, c: number): void
  dot(x: number, y: number, c: number, a?: number): void
  line(x0: number, y0: number, x1: number, y1: number, c: number | ((u: number) => number), a?: number | ((u: number) => number)): void
  poly(pts: number[][], c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void
  blendPx(sx: number, sy: number, c: number, a: number): void
  each(x0: number, y0: number, x1: number, y1: number, fn: (lx: number, ly: number, sx: number, sy: number) => void): void
}

export const WOOD_GOLD = ['#2a1608', '#5a3212', '#8f5a1e', '#c98a2b', '#f0b846', '#ffd97a', '#fff0b8', '#ffffff']

export const meta = {
  name: 'Arrow shot',
  desc: 'A wooden arrow with a steel head and feather fletching flying right, a wind streak, speed lines and shed motes behind it.',
  tags: ['archer', 'arrow', 'projectile', 'directional', 'loop'],
  size: [120, 32] as number[],
  origin: [104, 16] as number[],
  duration: 0.4,
  loop: true,
  fps: 30,
  bg: 'dark',
  options: { palette: WOOD_GOLD, length: 50, seed: 5 },
}

/** An arrow travelling along `ang` (radians) with its tip at (tx, ty). */
function arrowAt(p: PainterLike, C: number[], tx: number, ty: number, ang: number, len: number, a = 1): void {
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx
  const pt = (u: number, v: number): number[] => [tx - dx * u + nx * v, ty - dy * u + ny * v]
  const ln = (u0: number, u1: number, v: number, c: number, al = 1): void => {
    const A = pt(u0, v), B = pt(u1, v)
    p.line(A[0], A[1], B[0], B[1], c, al * a)
  }
  // shaft: dark rim, lit top, body, shaded underside
  ln(7, len - 12, -2, C[1])
  ln(7, len - 12, 2, C[1])
  ln(6, len, -1, C[5])
  ln(6, len, 0, C[4])
  ln(6, len, 1, C[2])
  // fletching: two vanes (lit upper, shaded lower) with a quill stripe, plus the nock
  const f0 = len - 12
  p.poly([pt(f0, -0.5), pt(f0 + 7, -4), pt(len + 1, -4), pt(len - 3, -0.5)], C[1], a)
  p.poly([pt(f0 + 1, -0.8), pt(f0 + 7.5, -3.3), pt(len, -3.3), pt(len - 3.5, -0.8)], C[6], a)
  p.poly([pt(f0, 0.5), pt(f0 + 7, 4), pt(len + 1, 4), pt(len - 3, 0.5)], C[1], a)
  p.poly([pt(f0 + 1, 0.8), pt(f0 + 7.5, 3.3), pt(len, 3.3), pt(len - 3.5, 0.8)], C[3], a)
    ln(f0 - 1, len + 1, 0, C[3])
  const nk = pt(len + 1.5, 0)
  p.dot(nk[0], nk[1], C[1], a)
  // steel head: dark rim, shaded lower half, lit upper half, white edge and tip
  const rim = [pt(-1.6, 0), pt(7, -4.4), pt(11, 0), pt(7, 4.4)]
  p.poly(rim, C[1], a)
  p.poly([pt(-0.3, 0), pt(6.2, 3.1), pt(8.6, 0)], C[5], a)
  p.poly([pt(-0.3, 0), pt(6.2, -3.1), pt(8.6, 0)], WHITE, a)
  const e0 = pt(0, 0), e1 = pt(6.2, -3.1)
  p.line(e0[0], e0[1], e1[0], e1[1], WHITE, a)
  ln(2, 7, 0, C[6])
  p.dot(e0[0], e0[1], WHITE, a)
}

export function draw(p: PainterLike, t: number, o: ArrowShotOpts): void {
  const C = fit(o.palette ?? WOOD_GOLD, 8) as number[]
  const D = meta.duration, S = o.seed ?? 5, L = o.length ?? 50, ph = t / D
  const qy = Math.round(Math.sin(ph * TAU * 2) * 0.6)

  // wind streak: a thin ribbon of light tapering behind the fletching
  const X1 = -L + 6, X0 = -100
  p.each(X0, -8, X1, 8, (lx, ly, sx, sy) => {
    const u = (X1 - lx) / (X1 - X0), w = 3.4 * (1 - u) ** 0.8 + 0.5 + 0.9 * Math.sin(u * 9 - ph * TAU * 2) * u
    const v = Math.abs(ly - qy) / w
    if (v >= 1) return
    const a = (1 - v * v) * (1 - u) ** 1.3
    if (a < 0.05) return
    p.blendPx(sx, sy, v < 0.3 && u < 0.35 ? C[6] : v < 0.65 ? C[5] : C[4], a * 0.55)
  })
  p.glowLine(-L - 40, qy, -L, qy, 7, C[4], 0.1)

  // speed lines streaming past
  cycle(t, D, 9, S + 2, (g: Rng) => g.range(0.14, 0.22), (age: number, life: number, r: Rng) => {
    const y = r.sign() * r.range(4.5, 12.5), x = r.range(-12, 6) - age * r.range(320, 420), l = r.range(7, 16), k = age / life
    p.line(x, y, x + l, y, (u: number) => (u > 0.7 ? C[6] : C[4]), (u: number) => u * (1 - k) * 1.3)
  })
  // motes shed off the shaft, drifting back and settling
  cycle(t, D, 10, S, (g: Rng) => g.range(0.2, 0.34), (age: number, life: number, r: Rng) => {
    const [x, y] = fly(r.range(-L, -8), r.range(-2, 2), -r.range(60, 130), r.range(-12, 12), age, 60, 1.4)
    const k = age / life
    if (k > 0.8 && Math.floor(age * 60) % 2) return
    p.dot(x, y, k < 0.5 ? C[6] : C[4], 1 - k * 0.5)
  })

  p.glow(-L * 0.5, qy, 22, C[3], 0.07)
  p.glow(-2, qy, 11, C[5], 0.16)
  arrowAt(p, C, 0, qy, 0, L)
  p.glow(2, qy, 5, WHITE, 0.22)
}
