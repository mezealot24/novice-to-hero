// Archer arrow impact: a sharp hit star thrown to the right, a shock ring that breaks apart, wood splinters and
// feather bits tumbling out under gravity, and a white flash on frame 0.
import { Rng, WHITE, clamp, fit, fly, rng, seg, TAU } from '../../../vendor/pixelfx/core/index.js'
import { brokenRing, spikes, star } from '../../../vendor/pixelfx/fx/impacts/_lib.js'

export interface ArrowHitOpts {
  palette?: string[]
  seed?: number
}

interface PainterLike {
  dot(x: number, y: number, c: number, a?: number): void
  line(x0: number, y0: number, x1: number, y1: number, c: number | ((u: number) => number), a?: number | ((u: number) => number)): void
  circle(x: number, y: number, r: number, c: number, a?: number): void
  poly(pts: number[][], c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
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
  name: 'Arrow hit',
  desc: 'An arrow lands: a sharp directional hit star biased right, a shock ring that breaks apart, wood splinters and feather bits tumbling out.',
  tags: ['archer', 'arrow', 'impact', 'hit', 'directional', 'one-shot'],
  size: [96, 96] as number[],
  origin: [48, 48] as number[],
  duration: 0.35,
  loop: false,
  fps: 30,
  bg: 'dark',
  options: { palette: ['#2a1608', '#5a3212', '#8f5a1e', '#c98a2b', '#f0b846', '#ffd97a', '#fff0b8', '#ffffff'], seed: 11 },
}

// star key frames: [from t, scale, thickness, alpha, colour steps (rim, body, inner, core)]
const KEYS: Array<[number, number, number, number, number[]]> = [
  [0, 1.0, 1, 1, [6, 7, 7, 7]],
  [0.035, 1.2, 1, 1, [1, 5, 6, 7]],
  [0.075, 1.1, 0.8, 1, [1, 4, 5, 6]],
  [0.12, 1.15, 0.45, 1, [1, 2, 4, 5]],
  [0.17, 1.2, 0.15, 0, [1, 2, 3, 4]],
]

const LIM = 46

export function draw(p: PainterLike, t: number, o: ArrowHitOpts): void {
  const C = fit(o.palette ?? meta.options.palette, 8) as number[]
  const S = o.seed ?? 11
  const R = new Rng(S)
  const D = meta.duration

  // hit star, thrown forward (the arrow came from the left)
  if (t < 0.17) {
    let i = 0
    while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++
    const a = KEYS[i], b = KEYS[i + 1], u = clamp((t - a[0]) / (b[0] - a[0]))
    const sc = a[1] + (b[1] - a[1]) * u, th = a[2] + (b[2] - a[2]) * u, al = a[3] + (b[3] - a[3]) * u
    const sp = spikes(R, 12, 0, { len: [8, 12], w: [2, 2.8], fwd: 1.8, back: 0.35, jag: 0.5, jit: 0.2 }) as Spike[]
    const cols = a[4].map((s) => C[s]) as [number, number, number, number]
    star(p as never, 0, 0, sp, sc, th, cols, al, 2.2)
  }

  // shock ring that breaks into arcs
  if (t > 0.012 && t < 0.24) {
    const q = seg(t, 0.012, 0.24), r = 4 + 20 * (1 - (1 - q) ** 2.2)
    const segs: RingSeg[] = Array.from({ length: 7 }, (_, i) => {
      const ang = (i / 7) * TAU + 0.3
      return { a: ang, gap: 0.55 + 0.3 * ((i * 37) % 10) / 10, dr: 0.1 + 0.25 * Math.max(0, Math.cos(ang)), w: 1 }
    })
    brokenRing(p as never, 0, 0, r, 2.4 * (1 - q * 0.45), segs, clamp(q * 1.6), C[6], C[4], 1, 0.9)
  }

  // wood splinters: short bright sticks, thrown mostly right, falling
  for (let i = 0; i < 12; i++) {
    const r = rng(S, i, 5), life = r.range(0.18, 0.28), age = t - r.range(0, 0.02)
    if (age < 0 || age > life) continue
    const ang = r.range(-1.25, 0.9) + (r.chance(0.2) ? Math.PI * 0.8 : 0), v = r.range(75, 150)
    const [x, y] = fly(2, 0, Math.cos(ang) * v, Math.sin(ang) * v - 30, age, 380, 2.2)
    const k = age / life, an = r.range(0, TAU) + age * r.range(14, 26) * r.sign(), l = r.range(1.6, 3.2)
    const ca = Math.cos(an) * l, sa = Math.sin(an) * l
    if (Math.abs(x) > LIM || Math.abs(y) > LIM || (k > 0.8 && Math.floor(age * 60) % 2)) continue
    p.line(x - ca, y - sa, x + ca, y + sa, C[i % 3 === 0 ? 5 : 3])
    p.line(x - ca, y - sa + 1, x + ca, y + sa + 1, C[1])
    p.dot(x + ca, y + sa, C[i % 2 ? 7 : 6])
    p.dot(x - ca, y - sa, C[1])
  }
  // feather bits: little two-tone flecks that flutter out and drop
  for (let i = 0; i < 2; i++) {
    const r = rng(S, i, 77), life = 0.27, age = t - 0.01
    if (age < 0 || age > life) continue
    const ang = r.range(-1.0, 0.5), v = r.range(55, 95)
    const [x, y] = fly(0, 0, Math.cos(ang) * v, Math.sin(ang) * v - 25, age, 140, 2.0)
    const an = Math.sin(age * 22 + i * 2) * 1.1, ca = Math.cos(an), sa = Math.sin(an)
    if (Math.abs(x) > LIM || Math.abs(y) > LIM || (age / life > 0.8 && Math.floor(age * 60) % 2)) continue
    p.poly([[x - 3 * ca, y - 3 * sa], [x + 0.5 * sa + 1 * ca, y - 1.6 * ca + 1 * sa], [x + 3 * ca, y + 3 * sa], [x - 0.5 * sa, y + 1.6 * ca]], C[1])
    p.poly([[x - 2.2 * ca, y - 2.2 * sa], [x + 0.2 * sa, y - 1 * ca], [x + 2.4 * ca, y + 2.4 * sa]], i ? C[6] : C[7])
    p.dot(x, y, C[3])
  }

  // sparks: a few quick streaks along the blow
  for (let i = 0; i < 6; i++) {
    const r = rng(S, i, 9), age = t, life = r.range(0.07, 0.14)
    if (age > life) continue
    const ang = r.range(-0.7, 0.7), v = r.range(220, 380), u = age
    const x0 = Math.cos(ang) * v * u, y0 = Math.sin(ang) * v * u
    const k = age / life
    p.line(x0, y0, x0 + Math.cos(ang) * 6 * (1 - k), y0 + Math.sin(ang) * 6 * (1 - k), (m: number) => (m > 0.6 ? WHITE : C[5]))
  }

  // flash + light
  if (t < 0.045) p.circle(0, 0, 7 * (1 - t / 0.06), WHITE, 1)
  const k = 1 - t / D
  p.glow(4, 0, 34, C[5], 0.5 * Math.max(0, 1 - t / 0.2))
  p.glow(0, 0, 14, WHITE, 0.6 * Math.max(0, 1 - t / 0.07))
  p.glow(8, 0, 20, C[4], 0.18 * Math.max(0, k - 0.5))
}
