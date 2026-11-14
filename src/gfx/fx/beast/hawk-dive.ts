// Beastmaster hawk: RO "Blitz Beat". A golden-brown hawk stoops in from the upper left with a streak behind it,
// rakes the target's chest with bright talon slashes, then pulls up and away to the upper right, shedding feathers.
import { Lights, Rng, TAU, WHITE, clamp, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { feather } from '../../../vendor/pixelfx/fx/holy/_lib.js'
import { spikes, star } from '../../../vendor/pixelfx/fx/impacts/_lib.js'

export interface HawkDiveOpts {
  palette?: string[]
  seed?: number
}

type Pt = [number, number]

interface PainterLike {
  px(x: number, y: number, c: number): void
  dot(x: number, y: number, c: number, a?: number): void
  line(x0: number, y0: number, x1: number, y1: number, c: number, a?: number): void
  circle(x: number, y: number, r: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, a?: number): void
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void
}

export const HAWK_PALETTE = ['#1c0e07', '#4a2610', '#7d4519', '#b8741f', '#e8a62c', '#f7d65a', '#fff1a8', '#ffffff']

export const meta = {
  name: 'Hawk dive',
  desc: 'A golden hawk stoops in from the upper left with a speed streak, rakes the target with talon slashes and flashes, then pulls up and away shedding feathers.',
  tags: ['beastmaster', 'hawk', 'dive', 'blitz beat', 'talon', 'one-shot'],
  size: [176, 176] as number[],
  origin: [112, 128] as number[],
  duration: 0.55,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: HAWK_PALETTE, seed: 11 },
}

// ---- timing / path ---------------------------------------------------------------------------------------
const HIT = 0.17 // the talons land
const SCALE = 1.35
const START: Pt = [-70, -72]
const HIT_POS: Pt = [-7, -11]
// after the strike: [t, x, y, heading], pulling up and away to the upper right
const PULL: number[][] = [
  [HIT, HIT_POS[0], HIT_POS[1], 0.8],
  [0.23, 2, -9, 0.15],
  [0.3, 17, -19, -0.6],
  [0.38, 29, -40, -0.95],
  [0.46, 38, -66, -1.1],
]
const DIVE_ANG = Math.atan2(HIT_POS[1] - START[1], HIT_POS[0] - START[0])

interface Pose {
  x: number
  y: number
  ang: number
  wing: number
}

function poseAt(t: number): Pose {
  if (t < HIT) {
    const u = clamp(t / HIT)
    const e = Math.pow(u, 1.55)
    return { x: START[0] + (HIT_POS[0] - START[0]) * e, y: START[1] + (HIT_POS[1] - START[1]) * e, ang: DIVE_ANG, wing: -0.1 + 0.1 * u }
  }
  let i = 0
  while (i < PULL.length - 2 && t > PULL[i + 1][0]) i++
  const a = PULL[i]
  const b = PULL[i + 1]
  const u = clamp((t - a[0]) / (b[0] - a[0]))
  return { x: a[1] + (b[1] - a[1]) * u, y: a[2] + (b[2] - a[2]) * u, ang: a[3] + (b[3] - a[3]) * u, wing: 0.55 * Math.sin(clamp((t - HIT) / 0.2) * Math.PI) + 0.25 * smooth(0.25, 0.4, t) }
}

// ---- the hawk, rasterised from polygons -------------------------------------------------------------------
interface Part {
  pts: Pt[]
  rim?: number // ramp index for this part's edge where it borders another part
  tone: (u: number, v: number, k: number) => number // ramp index, or -1 for nothing
}

function ell(cx: number, cy: number, rx: number, ry: number, n = 16): Pt[] {
  return Array.from({ length: n }, (_, i): Pt => [cx + Math.cos((i / n) * TAU) * rx, cy + Math.sin((i / n) * TAU) * ry])
}

function inside(pts: Pt[], x: number, y: number): boolean {
  let c = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

const WING: Pt[] = [
  [0, 0], [-4, -6], [-10, -10], [-18, -13], [-26, -14.5], [-33, -14], [-29, -11], [-31, -8.5], [-25, -8.5],
  [-26, -5.5], [-20, -6], [-20, -3], [-14, -3.5], [-13, -1], [-7, -1.5], [-6, 2], [0, 3.5],
]
const WING_LEAD: Pt[] = WING.slice(0, 6)

function leadY(x: number): number {
  for (let i = 1; i < WING_LEAD.length; i++) {
    if (x >= WING_LEAD[i][0]) {
      const [x0, y0] = WING_LEAD[i - 1]
      const [x1, y1] = WING_LEAD[i]
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1)
    }
  }
  return WING_LEAD[WING_LEAD.length - 1][1]
}

function rot(pts: Pt[], th: number, ox: number, oy: number, mirror: boolean, sc = 1): Pt[] {
  const c = Math.cos(th)
  const s = Math.sin(th)
  return pts.map(([x, y]): Pt => {
    const rx = (c * x - s * y) * sc
    const ry = (s * x + c * y) * sc
    return [ox + rx, oy + (mirror ? -ry : ry)]
  })
}

function hawkParts(wing: number): Part[] {
  const th = wing * 0.75
  const nearW = rot(WING, th, 6, -3, false)
  const farW = rot(WING, th * 0.8, 6, 2.5, true, 0.92)
  return [
    {
      pts: farW,
      rim: 0,
      tone: (u, v, k) => {
        const d = v - 2.5
        const stripe = Math.abs(((u * 0.8 + d * 1.4) % 4) - 2) < 0.5
        return d < 2.5 ? 2 : u < -22 || (stripe && k) ? 1 : d < 8 ? 2 : 1
      },
    },
    {
      pts: [[-8, -2.2], [-18, -4], [-27, -7], [-31, -4], [-32, 0], [-31, 4], [-27, 7], [-18, 4], [-8, 2.2]],
      tone: (u, v, k) => {
        const ang = Math.atan2(v, -(u + 8))
        if (u < -30) return 5
        if (u < -26.5) return 1
        if (Math.abs((ang * 6) % 1) < 0.14 && u < -14) return 1
        return v < -2.5 ? 3 : k ? 2 : 3
      },
    },
    { pts: [[4, 3], [9, 5.5], [14, 7.5], [17, 9.5], [15.5, 10.6], [12.5, 9.8], [8, 8.4], [3, 6.5]], rim: 0, tone: (u) => (u > 13 ? 6 : 4) },
    {
      pts: [[-13, -2], [-6, -6], [2, -7.4], [9, -6.6], [14, -3.4], [15, 1.8], [12, 5.8], [5, 7.6], [-3, 7], [-9, 4.4], [-13, 1.2]],
      tone: (u, v, k) => {
        if (v < -4.8) return 3
        if (v < 0.5) return 2
        if (v < 2.6) return k ? 2 : 4
        return v > 4.6 && u > -4 && k ? 6 : 5
      },
    },
    {
      pts: ell(11.4, -2.6, 5.4, 4.8),
      rim: 1,
      tone: (u, v, k) => {
        if (v < -5.2) return 2
        if (v < -3.4) return k ? 2 : 3
        return u > 11 && v > -1.6 ? 6 : v > 0.4 ? 5 : 6
      },
    },
    { pts: [[15.5, -4.6], [20, -3.4], [21.4, 0.1], [19.6, 3.2], [18.4, 1.2], [16, 0.9]], rim: 0, tone: (u, v) => (v < -1.6 ? 6 : u > 19 ? 3 : 5) },
    {
      pts: nearW,
      rim: 1,
      tone: (u, v, k) => {
        // depth below the (rotated) leading edge, measured in wing space
        const c = Math.cos(-th)
        const s = Math.sin(-th)
        const wx = c * (u - 6) - s * (v + 3)
        const wy = s * (u - 6) + c * (v + 3)
        const q = wy - leadY(wx)
        const stripe = Math.abs(((wx * 0.9 + q * 1.6) % 4) - 2) < 0.45
        if (q < 1.5) return 4
        if (q < 3.2) return k ? 4 : 3
        if (wx < -24 && q > 2.6) return 1
        if (wx < -14 && stripe && q > 4) return 1
        return q < 6.5 ? 3 : q < 9.5 ? 2 : 1
      },
    },
    { pts: [[11.4, -5.2], [14.4, -5.2], [14.4, -2.4], [11.4, -2.4]], tone: (u, v) => (u > 13 ? 0 : v < -3.9 ? 0 : 7) },
  ]
}

/** Rasterise parts (facing +x) at a pose: shaded fill, inner rims between parts, a one-pixel dark outline. */
function blit(p: PainterLike, parts: Part[], x: number, y: number, ang: number, sc: number, C: number[], a: number, tint = 0): void {
  const ca = Math.cos(ang)
  const sa = Math.sin(ang)
  const R = 44 * sc
  const x0 = Math.floor(x - R)
  const y0 = Math.floor(y - R)
  const n = Math.ceil(R * 2) + 2
  const grid = new Int8Array(n * n).fill(-1)
  const ids = new Int8Array(n * n).fill(-1)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const wx = x0 + i + 0.5 - x
      const wy = y0 + j + 0.5 - y
      const u = (wx * ca + wy * sa) / sc
      const v = (-wx * sa + wy * ca) / sc
      const k = (x0 + i + y0 + j) & 1
      for (let q = 0; q < parts.length; q++) {
        const part = parts[q]
        if (inside(part.pts, u, v)) {
          const t = part.tone(u, v, k)
          if (t >= 0) {
            grid[j * n + i] = t
            ids[j * n + i] = q
          }
        }
      }
    }
  }
  const at = (i: number, j: number): number => (i < 0 || j < 0 || i >= n || j >= n ? -1 : ids[j * n + i])
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const t = grid[j * n + i]
      if (t >= 0) {
        const id = ids[j * n + i]
        const rim = parts[id].rim
        let c = t
        if (rim !== undefined) {
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const o = at(i + di, j + dj)
            if (o >= 0 && o !== id) c = rim
          }
        }
        p.dot(x0 + i, y0 + j, C[Math.min(7, c + tint)], a)
      } else if (at(i - 1, j) >= 0 || at(i + 1, j) >= 0 || at(i, j - 1) >= 0 || at(i, j + 1) >= 0) {
        p.dot(x0 + i, y0 + j, C[0], a)
      }
    }
  }
}

// ---- talon slashes ---------------------------------------------------------------------------------------------
interface Rake {
  a: Pt
  b: Pt
  bend: number
  w: number
  t0: number
}

const RAKES: Rake[] = [
  { a: [-26, -26], b: [14, 22], bend: -6, w: 5.2, t0: HIT },
  { a: [-17, -30], b: [24, 14], bend: -6, w: 4.4, t0: HIT + 0.025 },
  { a: [20, -25], b: [-14, 22], bend: 5, w: 4.6, t0: HIT + 0.05 },
]

function rake(p: PainterLike, r: Rake, t: number, C: number[]): void {
  const grow = ease.outCubic(seg(t, r.t0, r.t0 + 0.07))
  if (grow <= 0) return
  const tail = smooth(r.t0 + 0.12, r.t0 + 0.3, t) // the tail end is erased first, so the mark thins away
  const fade = 1 - smooth(r.t0 + 0.2, r.t0 + 0.32, t)
  if (fade <= 0.01) return
  const [x0, y0] = r.a
  const [x1, y1] = r.b
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy)
  const nx = -dy / len
  const ny = dx / len
  const cx = mx + nx * r.bend * 2
  const cy = my + ny * r.bend * 2
  const steps = Math.ceil(len * 2.2)
  const hot = 1 - smooth(r.t0 + 0.02, r.t0 + 0.14, t)
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    if (u > grow || u < tail * 0.92) continue
    const q = 1 - u
    const x = q * q * x0 + 2 * q * u * cx + u * u * x1
    const y = q * q * y0 + 2 * q * u * cy + u * u * y1
    const tx = 2 * q * (cx - x0) + 2 * u * (x1 - cx)
    const ty = 2 * q * (cy - y0) + 2 * u * (y1 - cy)
    const tl = Math.hypot(tx, ty) || 1
    const px = -ty / tl
    const py = tx / tl
    const w = r.w * Math.pow(Math.sin(Math.PI * clamp(u * 0.92 + 0.04)), 0.7) * (1 - 0.55 * smooth(r.t0 + 0.1, r.t0 + 0.32, t))
    const half = w / 2
    for (let o = -half - 1; o <= half + 1; o += 0.5) {
      const ao = Math.abs(o)
      const v = ao / Math.max(0.5, half)
      let c: number
      if (ao > half) c = C[1]
      else if (v < 0.34) c = hot > 0.4 ? WHITE : C[6]
      else if (v < 0.7) c = C[5]
      else c = C[4]
      p.dot(x + px * o, y + py * o, c, fade)
    }
  }
}

// ---- feathers --------------------------------------------------------------------------------------------------------
interface Plume {
  x: number
  y: number
  vx: number
  vy: number
  a: number
  va: number
  len: number
  wid: number
  t0: number
  life: number
  side: number
}

export function create(o: HawkDiveOpts = {}) {
  const C = fit(o.palette ?? HAWK_PALETTE, 8)
  const R = new Rng(o.seed ?? 11)
  const lights = new Lights()
  const plumes: Plume[] = []
  const parts = new Map<number, Part[]>()
  const partsFor = (w: number): Part[] => {
    const k = Math.round(w * 12)
    let ps = parts.get(k)
    if (!ps) parts.set(k, (ps = hawkParts(k / 12)))
    return ps
  }
  // feathers shed when the talons land and as the hawk pulls up
  for (let i = 0; i < 9; i++) {
    const hit = i < 5
    const a = hit ? R.range(-2.9, -0.3) : R.range(-2.2, -0.5)
    const sp = R.range(35, 90)
    plumes.push({
      x: hit ? HIT_POS[0] + R.range(-6, 6) : 4 + R.range(-3, 8), y: hit ? HIT_POS[1] + R.range(-4, 6) : -14 + R.range(-3, 6),
      vx: Math.cos(a) * sp * (hit ? 1 : 0.6), vy: Math.sin(a) * sp * (hit ? 0.8 : 0.5) - 8,
      a: R.range(0, TAU), va: R.range(-7, 7), len: R.range(9, 13), wid: R.range(2.6, 3.3), t0: hit ? HIT + R.range(0, 0.02) : 0.22 + R.range(0, 0.06), life: R.range(0.3, 0.36), side: R.sign(),
    })
  }
  const spk = spikes(R, 12, 0.7, { len: [9, 13], w: [1.5, 2.2], fwd: 1.2, back: 0.8, jag: 0.5 })
  let t = 0
  let flashed = false

  return {
    update(dt: number) {
      t += dt
      if (!flashed && t >= HIT) {
        flashed = true
        lights.add(0, -6, 64, C[5], 0.65, 0.2)
        lights.add(0, -4, 22, WHITE, 0.75, 0.08)
      }
      for (const f of plumes) {
        if (t < f.t0) continue
        f.vx -= f.vx * 3 * dt
        f.vy -= f.vy * 3 * dt
        f.x += (f.vx + Math.sin((t - f.t0) * 14 + f.side) * 10) * dt
        f.y += (f.vy + 26) * dt
        f.a += f.va * dt
      }
      lights.update(dt)
    },
    draw(p: PainterLike) {
      // the streak: a ribbon of speed stretched back along the path, thick at the hawk and thinning to a point
      if (t < HIT + 0.07) {
        const N = 30
        const fadeOut = 1 - smooth(HIT, HIT + 0.07, t)
        const q0 = poseAt(t)
        for (let i = N; i >= 0; i--) {
          const f = i / N
          const q = poseAt(Math.max(0, t - f * 0.12))
          const r = 5.4 * Math.pow(1 - f, 0.85) + 0.4
          const a = f < 0.55 ? 1 : 1 - (f - 0.55) / 0.5
          const c = f < 0.12 ? C[6] : f < 0.4 ? C[5] : f < 0.7 ? C[4] : C[3]
          p.circle(q.x - Math.cos(q.ang) * 14, q.y - Math.sin(q.ang) * 14, r, c, a * fadeOut)
        }
        // thin speed lines either side
        const px = -Math.sin(DIVE_ANG)
        const py = Math.cos(DIVE_ANG)
        for (const [off, ln, st] of [[-12, 44, 10], [11, 36, 14], [-20, 24, 22], [19, 20, 26]]) {
          const sx = q0.x + px * off - Math.cos(DIVE_ANG) * st
          const sy = q0.y + py * off - Math.sin(DIVE_ANG) * st
          p.line(sx, sy, sx - Math.cos(DIVE_ANG) * ln, sy - Math.sin(DIVE_ANG) * ln, C[5], 0.85 * fadeOut)
        }
      }
      // the hawk itself, fading out on the climb
      const pose = poseAt(t)
      const alpha = 1 - smooth(0.33, 0.46, t)
      if (alpha > 0.03) {
        blit(p, partsFor(pose.wing), pose.x, pose.y, pose.ang, SCALE, C, alpha)
        p.glow(pose.x, pose.y, 22, C[4], 0.22 * alpha)
      }
      // talon slashes
      for (const r of RAKES) rake(p, r, t, C)
      // the hit: a white flash, a short star
      const ht = t - HIT
      if (ht >= 0 && ht < 0.2) {
        const k = 1 - ht / 0.2
        if (ht < 0.12) {
          const sc = ht < 0.04 ? 0.9 : 0.55 + 0.4 * (1 - ht / 0.12)
          const th = ht < 0.04 ? 1 : 0.55
          star(p, 0, -2, spk, sc, th, ht < 0.04 ? [C[5], C[6], WHITE, WHITE] : [C[3], C[4], C[5], C[6]], Math.min(1, k * 1.6), 2.2)
        }
        p.glow(0, -2, 40 * (0.5 + 0.5 * k), C[5], 0.5 * k)
      }
      // feathers
      for (const f of plumes) {
        if (t < f.t0) continue
        const age = t - f.t0
        const a = Math.min(1, (f.life - age) / 0.14, age / 0.02)
        if (a <= 0.03) continue
        feather(p, f.x, f.y, f.a, f.len, f.wid, C, a, f.side, age < 0.05 ? 1 : 0, 0.2)
      }
      lights.draw(p)
    },
  }
}
