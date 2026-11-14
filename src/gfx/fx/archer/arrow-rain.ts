// Archer volley: arrows streak down steeply from the upper left across a ground strip, each landing in a dust
// puff and spark, standing in the ground at the fall angle for a moment, then fading.
import { Rng, WHITE, fit, rng } from '../../../vendor/pixelfx/core/index.js'

export interface ArrowRainOpts {
  palette?: string[]
  seed?: number
  count?: number
}

interface PainterLike {
  dot(x: number, y: number, c: number, a?: number): void
  line(x0: number, y0: number, x1: number, y1: number, c: number | ((u: number) => number), a?: number | ((u: number) => number)): void
  poly(pts: number[][], c: number, a?: number): void
  circle(x: number, y: number, r: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
}

export const meta = {
  name: 'Arrow rain',
  desc: 'A volley of arrows falling steeply from the upper left onto a ground strip; each lands in a dust puff, stands in the ground, then fades.',
  tags: ['archer', 'arrow', 'rain', 'volley', 'area', 'one-shot'],
  size: [288, 200] as number[],
  origin: [144, 184] as number[],
  duration: 0.9,
  loop: false,
  fps: 30,
  bg: 'ground',
  options: { palette: ['#2a1608', '#5a3212', '#8f5a1e', '#c98a2b', '#f0b846', '#ffd97a', '#fff0b8', '#ffffff'], count: 18, seed: 21 },
}

const ANG = 1.25
const DX = Math.cos(ANG), DY = Math.sin(ANG)
const FALL = 150 // vertical drop before landing
const SPEED = 780 // px/s along the path
const LEN = 30

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


export function draw(p: PainterLike, t: number, o: ArrowRainOpts): void {
  const C = fit(o.palette ?? meta.options.palette, 8) as number[]
  const S = o.seed ?? 21, N = o.count ?? 18
  const order = new Rng(S)
  // stagger: land times spread over the volley in a shuffled order
  const shuffled = (): number[] => {
    const a = Array.from({ length: N }, (_, i) => i)
    for (let i = N - 1; i > 0; i--) {
      const j = Math.floor(order.range(0, i + 1))
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp
    }
    return a
  }
  const slots = shuffled(), tslots = shuffled()
  const pathLen = FALL / DY

  for (let i = 0; i < N; i++) {
    const r = rng(S, i, 3)
    const lx = -100 + ((slots[i] + 0.5) / N) * 200 + r.range(-6, 6)
    const tl = 0.14 + (tslots[i] / N) * 0.32 + r.range(0, 0.02)
    const hold = r.range(0.14, 0.22)
    const age = t - tl

    if (age < 0) {
      // in flight: tip travels along the fall path, a short streak behind the tail
      const d = SPEED * r.range(0.85, 1.15) * -age
      if (d > pathLen) continue
      const tx = lx - DX * d, ty = 2 - DY * d
      for (let k = 1; k <= 2; k++) {
        const o0 = LEN + 2 + (k - 1) * 8
        p.line(tx - DX * o0, ty - DY * o0, tx - DX * (o0 + 10 + k * 2), ty - DY * (o0 + 10 + k * 2), (u: number) => (u < 0.4 ? C[6] : C[4]), (u: number) => (1 - u) * 0.7)
      }
      arrowAt(p, C, tx, ty, ANG, LEN)
      continue
    }

    // landing: dust puffs, a spark star and a flash
    if (age < 0.22) {
      const k = age / 0.22
      for (let q = 0; q < 3; q++) {
        const dir = q - 1, bx = lx + dir * (2 + 9 * k) + r.range(-1, 1), by = -1 - 4 * k * (q === 1 ? 1.2 : 0.7)
        p.circle(bx, by, 1.6 + 3.4 * k * (q === 1 ? 1.1 : 0.9), k < 0.4 ? C[5] : C[3], 0.8 * (1 - k) ** 1.2)
      }
      if (age < 0.07) {
        for (let q = 0; q < 6; q++) {
          const a = -Math.PI + (q / 5) * Math.PI + r.range(-0.15, 0.15), l = 3 + age * 90 * r.range(0.6, 1.1)
          p.line(lx + Math.cos(a) * 2, -1 + Math.sin(a) * 2, lx + Math.cos(a) * l, -1 + Math.sin(a) * l * 1.2, (u: number) => (u > 0.5 ? WHITE : C[5]))
        }
        p.circle(lx, -1, 2.4 * (1 - age / 0.09), WHITE)
        p.glow(lx, -2, 16, C[5], 0.45 * (1 - age / 0.07))
      }
    }
    // standing in the ground: a quick quiver, then a fade
    const fadeAt = hold, a = age < fadeAt ? 1 : Math.max(0, 1 - (age - fadeAt) / 0.16)
    if (a <= 0.04) continue
    const quiver = Math.sin(age * 70) * 0.13 * Math.exp(-age * 16)
    arrowAt(p, C, lx, 2, ANG + quiver, LEN, a)
  }
}
