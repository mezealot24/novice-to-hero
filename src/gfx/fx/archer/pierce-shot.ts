// Archer ultimate (ศรทะลวง): a huge charged arrow lances in from the left shedding spiralling wind rings, pierces
// the target at the origin in a big burst and carries on past it, leaving a glowing trail that thins and breaks up.
import { Rng, WHITE, clamp, fit, rand, rng, TAU } from '../../../vendor/pixelfx/core/index.js'
import { brokenRing, spikes, star } from '../../../vendor/pixelfx/fx/impacts/_lib.js'

export interface PierceShotOpts {
  palette?: string[]
  seed?: number
}

interface ShadeOut {
  c: number
  a: number
  l: number
  k: number
}

interface PainterLike {
  dot(x: number, y: number, c: number, a?: number): void
  line(x0: number, y0: number, x1: number, y1: number, c: number | ((u: number) => number), a?: number | ((u: number) => number)): void
  poly(pts: number[][], c: number, a?: number): void
  circle(x: number, y: number, r: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void
  blendPx(sx: number, sy: number, c: number, a: number): void
  each(x0: number, y0: number, x1: number, y1: number, fn: (lx: number, ly: number, sx: number, sy: number) => void): void
  shade(x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number, o: ShadeOut) => number | void): void
}

interface Spike {
  a: number
  len: number
  w: number
}

interface RingSeg {
  a: number
  gap: number
  dr: number
  w: number
}

export const meta = {
  name: 'Pierce shot',
  desc: 'Archer ultimate: a huge charged arrow streaks in from the left shearing off wind rings, bursts through the target at the origin and keeps going, leaving a thinning glowing trail.',
  tags: ['archer', 'ultimate', 'arrow', 'pierce', 'directional', 'one-shot'],
  size: [320, 96] as number[],
  origin: [272, 48] as number[],
  duration: 0.6,
  loop: false,
  fps: 30,
  bg: 'dark',
  options: { palette: ['#2a1608', '#5a3212', '#8f5a1e', '#c98a2b', '#f0b846', '#ffd97a', '#fff0b8', '#ffffff'], seed: 17 },
}

const X0 = -272 // left frame edge
const T_HIT = 0.14 // the head reaches the origin
const POW = 1.6
const LANCE = 140

/** Head x as a function of time: an accelerating dash that carries on through the origin. */
const headX = (t: number): number => X0 + -X0 * Math.pow(t / T_HIT, POW)
/** Time the head passes x. */
const timeAt = (x: number): number => T_HIT * Math.pow((x - X0) / -X0, 1 / POW)

export function draw(p: PainterLike, t: number, o: PierceShotOpts): void {
  const C = fit(o.palette ?? meta.options.palette, 8) as number[]
  const S = o.seed ?? 17

  // --- lingering trail along the path: thins and breaks up
  if (t > 0.05) {
    const q = clamp((t - 0.05) / 0.5)
    const w = 3.2 * (1 - q) ** 0.8 + 0.2
    if (q < 1) {
      p.each(X0, -6, 40, 6, (lx, ly, sx, sy) => {
        const along = (lx - X0) / -X0, front = headX(t)
        if (lx > front - 6) return
        // the end nearest the target lasts longest; the far end breaks up first
        const keep = 1 - q * (1.15 - 0.4 * Math.min(1, Math.max(0, along)))
        const v = Math.abs(ly) / w
        if (v >= 1) return
        if (rand(Math.floor(lx / 7), Math.floor(ly / 2), S) > keep) return
        p.blendPx(sx, sy, v < 0.4 ? C[6] : C[4], 0.75 * (1 - q * 0.5))
      })
      p.glowLine(X0 + 20, 0, 36, 0, 6, C[4], 0.16 * (1 - q))
    }
  }

  // --- spiralling wind rings shearing off along the path
  for (let i = 0; i < 13; i++) {
    const x = X0 + 22 + i * 21
    const age = t - timeAt(x)
    const life = 0.22
    if (age < 0 || age > life) continue
    const q = age / life, cx = x - age * 90, ry = 5 + 24 * q ** 0.65, rx = 1.3 + 3.2 * q
    for (let k = 0; k < 44; k++) {
      const an = (k / 44) * TAU
      const py = Math.sin(an) * ry, px = cx + Math.cos(an) * rx + py * 0.3
      if (q > 0.5 && rand(Math.floor(k / 3), i, S) < (q - 0.5) * 1.8) continue
      const front = Math.cos(an) > 0
      p.dot(px, py, front ? (q < 0.35 ? WHITE : C[6]) : q < 0.4 ? C[5] : C[3])
      p.dot(px + 1, py, front ? C[4] : C[2])
    }
    p.glow(cx, 0, ry * 0.8, C[4], 0.08 * (1 - q))
  }

  // --- the charged lance: tapered white-gold core, outer glow, big arrowhead and fletching
  const h = headX(t)
  if (t < 0.22 && h - LANCE < 48) {
    p.each(h - LANCE, -11, h + 2, 11, (lx, ly, sx, sy) => {
      const u = (h - lx) / LANCE
      if (u < 0) return
      const w2 = 10 * (1 - u) ** 1.2 + 0.5, v2 = Math.abs(ly) / w2
      if (v2 < 1) p.blendPx(sx, sy, C[4], 0.35 * (1 - v2 * v2) * (1 - u) ** 0.8)
    })
    p.shade(h - LANCE, -6, h + 2, 6, (x, y, out) => {
      const u = (h - x) / LANCE
      if (u < 0) return
      const w = 3.6 * (1 - u) ** 0.85 + 0.45, v = Math.abs(y) / w
      if (v >= 1) return
      out.c = v < 0.38 ? WHITE : v < 0.72 ? C[6] : C[4]
      out.a = u > 0.6 ? 1 - (u - 0.6) * 2 : 1
    })
    // fletching, a way back along the shaft
    const fx = h - 66
    p.poly([[fx, -0.5], [fx - 6, -7.5], [fx - 17, -7.5], [fx - 10, -0.5]], C[1])
    p.poly([[fx - 0.5, -1.2], [fx - 6.5, -6.4], [fx - 15, -6.4], [fx - 9.5, -1.2]], C[6])
    p.poly([[fx, 0.5], [fx - 6, 7.5], [fx - 17, 7.5], [fx - 10, 0.5]], C[1])
    p.poly([[fx - 0.5, 1.2], [fx - 6.5, 6.4], [fx - 15, 6.4], [fx - 9.5, 1.2]], C[4])
    p.line(fx - 1, -3.6, fx - 12, -3.6, C[5])
    // head
    p.poly([[h + 13, 0], [h - 3, -8.5], [h - 10, 0], [h - 3, 8.5]], C[1])
    p.poly([[h + 11, 0], [h - 3, -6.8], [h - 7.5, 0]], WHITE)
    p.poly([[h + 11, 0], [h - 3, 6.8], [h - 7.5, 0]], C[5])
    p.line(h + 2, 0, h - 6, 0, C[6])
    p.glow(h, 0, 30, C[5], 0.5)
    p.glow(h + 6, 0, 14, WHITE, 0.6)
  }

  // --- the piercing burst at the origin
  const b = t - T_HIT
  if (b >= -0.01 && b < 0.3) {
    const R = new Rng(S)
    // hit star thrown forward
    if (b < 0.17) {
      const keys: Array<[number, number, number, number[]]> = [
        [0, 1.05, 1, [6, 7, 7, 7]],
        [0.04, 1.15, 1, [1, 5, 6, 7]],
        [0.09, 1.0, 0.7, [1, 4, 5, 6]],
        [0.14, 1.1, 0.3, [1, 3, 4, 5]],
        [0.19, 1.15, 0.05, [1, 2, 3, 4]],
      ]
      const bb = Math.max(0, b)
      let i = 0
      while (i < keys.length - 2 && bb >= keys[i + 1][0]) i++
      const A = keys[i], B = keys[i + 1], u = clamp((bb - A[0]) / (B[0] - A[0]))
      const sc = A[1] + (B[1] - A[1]) * u, th = A[2] + (B[2] - A[2]) * u
      const sp = spikes(R, 14, 0, { len: [12, 17], w: [2.8, 3.8], fwd: 1.4, back: 0.45, jag: 0.5, jit: 0.2 }) as Spike[]
      star(p as never, 0, 0, sp, sc, th, A[3].map((s) => C[s]) as [number, number, number, number], 1, 3)
    }
    // flash and horizontal flare through the target
    const bb = Math.max(0, b)
    if (bb < 0.07) p.circle(0, 0, 15 * (1 - bb / 0.08), WHITE)
    const fl = clamp(1 - bb / 0.2)
    if (fl > 0) {
      for (const s of [-1, 1]) {
        const Lf = (s > 0 ? 46 : 30) * Math.min(1, 0.4 + bb * 12)
        for (let d = 2; d <= Lf; d++) {
          const u = d / Lf, th = Math.max(0, Math.round((1 - u) * 2.4 * fl))
          for (let e = -th; e <= th; e++) p.dot(s * d, e, u < 0.4 && Math.abs(e) <= th / 2 ? WHITE : u < 0.7 ? C[6] : C[5], u > 0.85 ? 0.7 : 1)
        }
      }
    }
    // pierce-through: bright shaft continuing forward past the target
    if (bb < 0.22) {
      const q = bb / 0.22, wd = 4.5 * (1 - q) + 0.5, len = 46
      p.shade(0, -6, len, 6, (x, y, out) => {
        const u = x / len, v = Math.abs(y) / (wd * (1 - u * 0.5))
        if (v >= 1) return
        out.c = v < 0.45 ? WHITE : C[6]
        out.a = 1 - u * 0.6
      })
    }
    // shock ring breaking apart, squashed a little vertically to fit the frame
    if (b > 0 && b < 0.26) {
      const q = b / 0.26, r = 6 + 34 * (1 - (1 - q) ** 2)
      const segs: RingSeg[] = Array.from({ length: 8 }, (_, i) => {
        const an = (i / 8) * TAU + 0.2
        return { a: an, gap: 0.55 + 0.3 * (((i * 53) % 10) / 10), dr: 0.1 + 0.3 * Math.max(0, Math.cos(an)), w: 1 }
      })
      brokenRing(p as never, 0, 0, r, 2.8 * (1 - q * 0.4), segs, clamp(q * 1.6), C[6], C[4], 1, 0.78)
    }
    // sparks sprayed forward
    for (let i = 0; i < 14; i++) {
      const r = rng(S, i, 4), life = r.range(0.1, 0.22), age = bb
      if (age > life) continue
      const an = r.range(-0.55, 0.55), v = r.range(260, 520), d = v * age * (1 - age / (life * 3))
      const x = Math.cos(an) * d + 4, y = Math.sin(an) * d * 0.9, l = 5 * (1 - age / life)
      p.line(x, y, x + Math.cos(an) * l, y + Math.sin(an) * l, (u: number) => (u > 0.5 ? WHITE : C[5]))
    }
    // gold motes drifting out and settling
    for (let i = 0; i < 8; i++) {
      const r = rng(S, i, 8), life = r.range(0.18, 0.3)
      if (bb > life) continue
      const an = r.range(-1.1, 1.1), v = r.range(60, 140), k = bb / life
      const x = Math.cos(an) * v * bb * 0.9 + 2, y = Math.sin(an) * v * bb * 0.9 + 140 * bb * bb
      if (k > 0.75 && Math.floor(bb * 60) % 2) continue
      p.dot(x, y, k < 0.5 ? C[7] : C[5])
      if (k < 0.5) p.dot(x - 1, y, C[4])
    }
    p.glow(0, 0, 54, C[5], 0.55 * clamp(1 - bb / 0.25))
    p.glow(0, 0, 22, WHITE, 0.6 * clamp(1 - bb / 0.1))
    p.glowLine(0, 0, 44, 0, 8, C[6], 0.35 * clamp(1 - bb / 0.2))
  }
}
