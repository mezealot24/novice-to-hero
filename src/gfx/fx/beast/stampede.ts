// Beastmaster ultimate: the whole pack rushes the enemy row. A wall of dust sweeps left to right along the ground
// with wolf and boar silhouettes running inside it, hoof puffs, a hawk shadow streaking overhead, flying debris,
// leaves and speed lines; the dust then lingers, settles and fades. Origin is bottom-centre on the ground line.
import { B, Bits, Lights, P, Particles, Rng, TAU, WHITE, ease, fit, mix, rng, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { frontCrescent, rock, rockShape, stone } from '../../../vendor/pixelfx/fx/impacts/_lib.js'
import { bbox, insideBox, type Pt } from './_poly'

export interface StampedeOpts {
  palette?: string[]
  seed?: number
}

type Ramp = number | ((u: number) => number)

interface PainterLike {
  dot(x: number, y: number, c: number, a?: number): void
  blend(x: number, y: number, c: number, a: number): void
  line(x0: number, y0: number, x1: number, y1: number, c: Ramp, a?: Ramp): void
  disc(cx: number, cy: number, r: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, a?: number): void
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void
}

export const STAMPEDE_PALETTE = ['#1c1410', '#3a2a1e', '#6a5038', '#9a7a56', '#c8a878', '#e8d0a0', '#f8ecc8', '#ffffff']

export const meta = {
  name: 'Stampede',
  desc: 'The whole pack rushes the enemy row: a churning wall of dust sweeps left to right with wolf and boar silhouettes inside, a hawk shadow overhead, flying debris and leaves, then the dust settles.',
  tags: ['beastmaster', 'stampede', 'ultimate', 'wolf', 'boar', 'hawk', 'dust', 'one-shot'],
  size: [320, 160] as number[],
  origin: [160, 144] as number[],
  duration: 1.0,
  loop: false,
  fps: 20,
  bg: 'ground',
  options: { palette: STAMPEDE_PALETTE, seed: 51 },
}

// ---- timing -----------------------------------------------------------------------------------------------------
const SWEEP = 0.52 // the dust front crosses the frame
const F0 = -122
const F1 = 118
const SPEED = (F1 - F0) / SWEEP
const END_DUST = 0.95
const frontX = (t: number): number => F0 + SPEED * t // keeps going after the sweep, for animals still streaming out

// ---- silhouettes ---------------------------------------------------------------------------------------------------
interface Part {
  pts: Pt[]
  c: number // ramp index (0 deep shadow, 1 body, 5 eye glint)
}

function ell(cx: number, cy: number, rx: number, ry: number, n = 14): Pt[] {
  return Array.from({ length: n }, (_, i): Pt => [cx + Math.cos((i / n) * TAU) * rx, cy + Math.sin((i / n) * TAU) * ry])
}

function quad(a: Pt, b: Pt, w0: number, w1: number): Pt[] {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  const nx = -dy / l
  const ny = dx / l
  return [[a[0] + (nx * w0) / 2, a[1] + (ny * w0) / 2], [b[0] + (nx * w1) / 2, b[1] + (ny * w1) / 2], [b[0] - (nx * w1) / 2, b[1] - (ny * w1) / 2], [a[0] - (nx * w0) / 2, a[1] - (ny * w0) / 2]]
}

/** A two-segment leg: thigh and shin, the shin ending in a small foot. */
function leg(hx: number, ph: number, front: boolean, c: number, reach = 11, drop = 9): Part[] {
  const fx = hx + reach * Math.sin(ph)
  const fy = 3.5 + drop - 5 * Math.max(0, Math.cos(ph))
  const k: Pt = [(hx + fx) / 2 + (front ? 1.8 : -2.6), (3.5 + fy) / 2 + 0.6]
  return [
    { pts: quad([hx, 3], k, 4, 3), c },
    { pts: quad(k, [fx, fy], 3, 2.2), c },
    { pts: [[fx - 1.4, fy - 0.8], [fx + 2.8, fy - 0.8], [fx + 2.8, fy + 0.7], [fx - 1.4, fy + 0.7]], c },
  ]
}

function wolfParts(ph: number): Part[] {
  return [
    ...leg(-8, ph + Math.PI * 0.9 + 0.55, false, 0, 12, 12),
    ...leg(10.5, ph + 0.55, true, 0, 12, 12),
    { pts: [[-12, -1], [-18, -3.4], [-25, -5], [-32, -4.4], [-30, -1.4], [-24, 0.2], [-17, 2.2], [-12, 3.2]], c: 1 },
    { pts: [[-12.5, -1], [-8, -6], [-1, -7.6], [6, -7.6], [11, -5.6], [13.8, -1], [13, 3.6], [9, 6.6], [2, 6.2], [-4, 4.2], [-9, 3.6], [-12.8, 2]], c: 1 },
    ...leg(-5, ph + Math.PI * 0.9, false, 1, 12, 12),
    ...leg(8, ph, true, 1, 12, 12),
    { pts: [[8, -7.2], [15, -9.4], [19, -6], [16, 0.5], [9, 2.5]], c: 1 },
    { pts: [[14, -8.5], [19, -10], [23.5, -8], [30.5, -3.6], [31, -1.6], [28.4, -0.2], [22.5, -0.6], [17.5, 2], [12.5, 2.4]], c: 1 },
    { pts: [[15.4, -9], [16.6, -17.4], [20.8, -9.8]], c: 1 },
    { pts: [[19.2, -9], [22.8, -16.4], [24.2, -8]], c: 1 },
    { pts: [[20.4, -6], [22.4, -6], [22.4, -4.8], [20.4, -4.8]], c: 5 },
  ]
}

function boarParts(ph: number): Part[] {
  const mane: Pt[] = []
  for (let x = -14; x <= 8; x += 3) mane.push([x, -11.5 + (x + 14) * 0.05], [x + 1.4, -15.5 + (x + 14) * 0.05])
  mane.push([10, -11], [10, -8], [-14, -8])
  return [
    ...leg(-11, ph + Math.PI, false, 0, 7, 11),
    ...leg(10, ph + Math.PI * 0.3, true, 0, 7, 11),
    { pts: [[-18, -2], [-14, -9], [-5, -12.5], [4, -13.5], [11, -11], [15, -8], [17, -2], [16, 4], [9, 8], [-5, 8.6], [-15, 6.5], [-18, 3]], c: 1 },
    { pts: mane, c: 1 },
    { pts: [[-17.5, -3], [-21.5, -6.5], [-23, -10], [-20.5, -9], [-18.5, -6], [-16, -1]], c: 1 },
    ...leg(-10, ph, false, 1, 7, 11),
    ...leg(11, ph + Math.PI * 1.3, true, 1, 7, 11),
    { pts: [[11, -11], [17, -10], [23, -6.4], [28, -2.5], [29.5, 0.6], [27, 3.6], [20, 4.8], [14, 4.4], [10, 1]], c: 1 },
    { pts: [[12, -11.5], [13.5, -17.5], [17.6, -10.6]], c: 1 },
    { pts: [[22, 4], [26, 3.8], [29, 0.8], [30, -3.6], [27.8, -1.6], [24.5, 0.6]], c: 4 },
    { pts: [[19.2, -5.4], [21.4, -5.4], [21.4, -4.2], [19.2, -4.2]], c: 5 },
  ]
}

// a hawk seen from above, wings spread (its shadow sliding over the dust)
function hawkParts(flap: number): Part[] {
  const wing: Pt[] = [[4, -1.5], [3, -8], [-1, -14], [-8, -20 - flap * 2], [-12, -18.5], [-9.5, -14.5], [-13, -12.5], [-10, -9], [-12.5, -6.2], [-8, -3.6], [-6, -1.5]]
  return [
    { pts: wing, c: 1 },
    { pts: wing.map(([x, y]): Pt => [x, -y]), c: 1 },
    { pts: [[-7, -2], [-17, -6], [-24, -4.5], [-25, 0], [-24, 4.5], [-17, 6], [-7, 2]], c: 1 },
    { pts: ell(0, 0, 10, 3), c: 1 },
    { pts: ell(11, 0, 3, 2.5), c: 1 },
    { pts: [[13.5, -1], [17.5, 0.3], [13.5, 1.2]], c: 1 },
  ]
}

/**
 * Rasterise silhouette parts facing +x at (x, y), scaled and bobbed, with a dithered lit rim on every upward-facing
 * edge so ears, snouts and backs read through the dust.
 */
function blit(p: PainterLike, parts: Part[], x: number, y: number, sc: number, C: number[], a: number, rimIdx: number, soft = false): void {
  const R = 42 * sc
  const x0 = Math.floor(x - R)
  const y0 = Math.floor(y - R)
  const n = Math.ceil(R * 2) + 2
  const grid = new Int8Array(n * n).fill(-1)
  const boxes = parts.map((part) => bbox(part.pts))
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const u = (x0 + i + 0.5 - x) / sc
      const v = (y0 + j + 0.5 - y) / sc
      for (let q = 0; q < parts.length; q++) if (insideBox(parts[q].pts, boxes[q], u, v)) grid[j * n + i] = parts[q].c
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const t = grid[j * n + i]
      if (t < 0) continue
      const up = j > 0 ? grid[(j - 1) * n + i] : -1
      const up2 = j > 1 ? grid[(j - 2) * n + i] : -1
      let c = t
      if (t < 5) {
        if (up < 0) c = rimIdx
        else if (up2 < 0 && (i + j) % 2 === 0) c = Math.max(t, rimIdx - 1)
      }
      if (soft) p.blend(x0 + i, y0 + j, C[c], a)
      else p.dot(x0 + i, y0 + j, C[c], a)
    }
  }
}

// ---- dust ----------------------------------------------------------------------------------------------------------------
interface Puff {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  t0: number
  life: number
  front: boolean
  tone: number
  max: number // alpha cap
  ph: number
}

interface Runner {
  kind: 'wolf' | 'boar'
  d: number // distance behind the dust front
  y: number
  sc: number
  stride: number
  seedPh: number
}

interface Leaf {
  x: number
  y: number
  vx: number
  vy: number
  a: number
  va: number
  t0: number
  life: number
  tone: number
}

export function create(o: StampedeOpts = {}) {
  const C = fit(o.palette ?? STAMPEDE_PALETTE, 8)
  const seed = o.seed ?? 51
  const R = new Rng(seed)
  const st = stone(C[3])
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] })
  const bits = new Bits({ ground: () => 0 })
  const puffs: Puff[] = []
  const leaves: Leaf[] = []
  const runners: Runner[] = [
    { kind: 'wolf', d: 26, y: -1, sc: 1.2, stride: 0.15, seedPh: 0 },
    { kind: 'boar', d: 88, y: -6, sc: 1.2, stride: 0.14, seedPh: 1.7 },
    { kind: 'wolf', d: 152, y: 3, sc: 1.25, stride: 0.15, seedPh: 2.6 },
    { kind: 'wolf', d: 212, y: -4, sc: 1.1, stride: 0.15, seedPh: 4.1 },
  ]
  const cache = new Map<string, Part[]>()
  const partsOf = (kind: 'wolf' | 'boar', ph: number): Part[] => {
    const k = Math.round((((ph % TAU) + TAU) % TAU) * 4)
    const key = kind + k
    let v = cache.get(key)
    if (!v) cache.set(key, (v = kind === 'wolf' ? wolfParts(k / 4) : boarParts(k / 4)))
    return v
  }

  // scheduled debris, thrown off the front as it passes
  const rockTimes = Array.from({ length: 9 }, (_, i) => 0.05 + i * 0.05)
  let rockIdx = 0
  for (let i = 0; i < 26; i++) {
    const t0 = R.range(0.04, 0.55)
    leaves.push({ x: frontX(t0) - R.range(5, 60), y: -R.range(2, 30), vx: R.range(60, 200), vy: -R.range(10, 120), a: R.range(0, TAU), va: R.range(-14, 14), t0, life: Math.min(R.range(0.3, 0.45), 0.95 - t0), tone: R.int(0, 2) })
  }

  let t = 0
  let acc = 0
  let hoofAcc = 0

  const emit = (dt: number) => {
    const f = frontX(t)
    if (t <= SWEEP) {
      for (acc += dt * 760; acc >= 1; acc--) {
        const back = R.range(0, 40)
        const high = 46 * Math.exp(-back / 45) + 10
        const front = R.chance(0.3)
        const y = front ? -R.range(1, 20) : -Math.pow(R.next(), 1.3) * high
        const life = Math.min(R.range(0.3, 0.46), END_DUST - t)
        puffs.push({ x: Math.max(-140, f - back + R.range(-4, 4)), y: Math.min(-1, y), vx: R.range(4, 30), vy: -R.range(4, 22) - -y * 0.1, r: R.range(5.5, 11) * (front ? 0.75 : 1) * (0.85 + 0.15 * (-y / 40)), t0: t, life, front, tone: R.int(0, 2), max: front ? 0.3 : 0.7, ph: R.range(0, TAU) })
      }
      while (rockIdx < rockTimes.length && t >= rockTimes[rockIdx]) {
        rockIdx++
        const a = -R.range(0.3, 1.3)
        const sp = R.range(130, 260)
        bits.add({ kind: B.CHUNK, x: f - R.range(2, 20), y: -2, vx: Math.cos(a) * sp * 0.6 + 80, vy: Math.sin(a) * sp, g: 1, drag: 0.3, bounce: 0.32, life: Math.min(R.range(0.55, 0.7), 0.94 - t), a: R.range(0, TAU), va: R.range(-14, 14), s: R.pick([1.5, 2, 2.5]), pts: rockShape(R) })
        for (let i = 0; i < 6; i++) {
          const b = -R.range(0.2, 1.4)
          const s2 = R.range(90, 240)
          ps.spawn(P.GRIT, f - R.range(0, 18), -1, Math.cos(b) * s2 * 0.5 + 100, Math.sin(b) * s2, R.range(0.3, 0.5), R.pick([C[5], C[4], C[3], C[2]]), R.chance(0.3) ? 2 : 1)
        }
      }
    }
    // hoof and paw puffs kicked up under whichever runners are still crossing the frame
    if (t < 0.8) {
      for (hoofAcc += dt * 110; hoofAcc >= 1; hoofAcc--) {
        const rn = runners[R.int(0, runners.length - 1)]
        const fx = f - rn.d + R.range(-14, 14)
        if (fx < -125 || fx > 118) continue
        puffs.push({ x: fx, y: rn.y + R.range(-1, 2), vx: -R.range(10, 45), vy: -R.range(3, 18), r: R.range(2, 4.4), t0: t, life: Math.min(R.range(0.22, 0.34), END_DUST - t), front: R.chance(0.5), tone: R.int(1, 2), max: 0.7, ph: R.range(0, TAU) })
      }
    }
  }

  const drawPuffs = (p: PainterLike, front: boolean) => {
    for (const q of puffs) {
      if (q.front !== front) continue
      const age = t - q.t0
      if (age < 0 || age >= q.life) continue
      const k = age / q.life
      const m = 1 - Math.exp(-3 * age)
      const x = q.x + (q.vx * m) / 3 + Math.sin(age * 16 + q.ph) * 1.6 * q.r * 0.2
      const y = q.y + (q.vy * m) / 3 + Math.cos(age * 13 + q.ph) * 1.2 * q.r * 0.2
      const r = q.r * (0.7 + 0.5 * Math.min(1, age * 6) + 0.5 * k)
      const a = Math.min(1, age * 14) * Math.min(1, (1 - k) * 2.2) * q.max
      const base = q.tone === 0 ? C[3] : q.tone === 1 ? C[4] : mix(C[4], C[5], 0.5)
      if (q.r < 5) {
        // small hoof puffs: flat wisps, no lit cap
        p.disc(x, y, r, mix(base, C[2], 0.3), a * 0.55)
        p.disc(x - r * 0.2, y - r * 0.2, r * 0.6, base, a * 0.5)
        continue
      }
      p.disc(x, y, r, mix(base, C[2], 0.45 + 0.2 * k), a * 0.8)
      p.disc(x - r * 0.1, y - r * 0.14, r * 0.78, base, a * 0.85)
      p.disc(x - r * 0.26, y - r * 0.36, r * 0.46, q.tone === 2 ? C[6] : C[5], a * 0.7)
    }
  }

  return {
    update(dt: number) {
      t += dt
      emit(dt)
      for (const l of leaves) {
        if (t < l.t0 || t > l.t0 + l.life) continue
        l.vy += 300 * dt
        l.vx -= l.vx * 1.2 * dt
        l.x += l.vx * dt
        l.y = Math.min(-1, l.y + l.vy * dt)
        l.a += l.va * dt
      }
      ps.update(dt)
      bits.update(dt)
      lights.update(dt)
    },
    drawBack(p: PainterLike) {
      // a hawk's shadow racing over the top of the wave
      const ht = seg(t, 0.03, 0.5)
      if (ht > 0 && ht < 1) {
        const hx = -170 + 340 * ease.inOutSine(ht)
        const hy = -108 + 5 * Math.sin(ht * 9)
        const a = 0.55 * smooth(-140, -105, hx) * (1 - smooth(105, 140, hx))
        if (a > 0.03) {
          for (let i = 0; i < 3; i++) {
            const yy = hy + (i - 1) * 8
            p.line(hx - 28 - i * 6, yy, hx - 56 - i * 14, yy, (u) => (u < 0.5 ? C[5] : C[3]), (u) => a * 1.2 * (1 - u))
          }
          blit(p, hawkParts(Math.sin(ht * 26)), hx, hy, 1.15, C, a, 1, true)
        }
      }
      drawPuffs(p, false)
    },
    draw(p: PainterLike) {
      const f = frontX(t)
      // the pack
      for (const rn of runners) {
        const x = f - rn.d
        const a = smooth(-128, -100, x) * (1 - smooth(100, 128, x))
        if (a < 0.04) continue
        const ph = x * rn.stride + rn.seedPh
        const bob = -1.4 * Math.abs(Math.sin(ph + 0.4)) * rn.sc
        blit(p, partsOf(rn.kind, ph), x, rn.y - 15 * rn.sc + bob, rn.sc, C, a, 3)
      }
      drawPuffs(p, true)
      // the leading wall: a standing crescent of lit dust at the front, and light behind it
      if (t < SWEEP + 0.14) {
        const k = t < SWEEP ? 1 : 1 - (t - SWEEP) / 0.14
        const fe = Math.min(f, F1)
        frontCrescent(p, fe, 1, 40, 9, [C[6], C[5], C[3]], k)
        p.glow(fe - 8, -22, 46, C[5], 0.32 * k)
      }
      // speed lines streaming off the wave
      if (t < SWEEP + 0.06) {
        const k = 1 - smooth(SWEEP - 0.08, SWEEP + 0.06, t)
        for (let i = 0; i < 8; i++) {
          const r = rng(seed, 9, i)
          const y = -r.range(3, 78)
          const x1 = Math.min(f, F1) - r.range(6, 90)
          const len = Math.min(r.range(22, 60), x1 + 156)
          if (len < 3) continue
          p.line(x1 - len, y, x1, y, (u) => (u > 0.7 ? WHITE : u > 0.3 ? C[6] : C[4]), (u) => k * Math.min(1, u * 3) * (i % 3 === 0 ? 1 : 0.75))
        }
      }
      for (const b of bits.list) rock(p, { ...b, life: b.life + 0.3 }, st)
      // leaves and flying debris
      for (const l of leaves) {
        const age = t - l.t0
        if (age < 0 || age > l.life) continue
        const k = Math.min(1, (l.life - age) / 0.12)
        const ca = Math.cos(l.a)
        const sa = Math.sin(l.a)
        const body = [C[4], C[5], C[3]][l.tone]
        for (let d = -2; d <= 2; d++) {
          p.dot(l.x + ca * d, l.y + sa * d, d === 0 ? C[6] : d < 0 ? body : C[2], k)
          if (Math.abs(d) <= 1) p.dot(l.x + ca * d - sa * 0.9, l.y + sa * d + ca * 0.9, C[2], k)
        }
      }
      ps.draw(p, 'front')
      lights.draw(p as unknown as Parameters<typeof lights.draw>[0])
    },
  }
}
