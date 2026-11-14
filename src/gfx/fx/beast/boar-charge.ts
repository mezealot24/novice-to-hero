// Beastmaster boar: a low, heavy charge. A bristled boar rams in from the left edge on a rolling dust trail and
// speed lines, slams into the target with an impact star, shock rings, a dust burst and kicked-up rocks, then
// recoils and fades. Origin is the impact point on the ground.
import { Bits, Lights, P, Particles, Rng, TAU, WHITE, B, clamp, ease, fit, mix, rng, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { brokenRing, frontCrescent, rock, rockShape, spikes, star, stone } from '../../../vendor/pixelfx/fx/impacts/_lib.js'

export interface BoarChargeOpts {
  palette?: string[]
  seed?: number
}

type Pt = [number, number]

interface PainterLike {
  dot(x: number, y: number, c: number, a?: number): void
  line(x0: number, y0: number, x1: number, y1: number, c: number, a?: number): void
  circle(x: number, y: number, r: number, c: number, a?: number): void
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, a?: number): void
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void
  blend(x: number, y: number, c: number, a: number): void
  disc(cx: number, cy: number, r: number, c: number, a?: number): void
}

interface Puff {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  age: number
  life: number
  tone: number
  front: boolean
}

export const BOAR_PALETTE = ['#1b120d', '#3d2616', '#6b4423', '#9a6a3a', '#c89a5c', '#e8c890', '#f8ecc4', '#ffffff']

export const meta = {
  name: 'Boar charge',
  desc: 'A bristled boar charges in low from the left on a dust trail and speed lines, rams the target with an impact star, shock rings, dust and rocks, then recoils and fades.',
  tags: ['beastmaster', 'boar', 'charge', 'ram', 'impact', 'one-shot'],
  size: [256, 112] as number[],
  origin: [208, 96] as number[],
  duration: 0.6,
  loop: false,
  fps: 20,
  bg: 'ground',
  options: { palette: BOAR_PALETTE, seed: 31 },
}

// ---- timing ---------------------------------------------------------------------------------------------------
const HIT = 0.22
const SC = 1.3
const X0 = -172
const X_HIT = -44 // boar centre when the snout touches the target
const GROUND = 0
const FOOT = 17 // feet below the boar's centre, in boar units
const CY = GROUND - FOOT * SC

interface Pose {
  x: number
  y: number
  ang: number
  sx: number
  alpha: number
  run: number // gallop phase
}

function poseAt(t: number): Pose {
  if (t < HIT) {
    const u = t / HIT
    const x = X0 + (X_HIT - X0) * Math.pow(u, 1.35)
    const ph = x * 0.115
    return { x, y: CY - Math.abs(Math.sin(ph)) * 2.2, ang: 0.06 + 0.03 * Math.sin(ph), sx: 1, alpha: 1, run: ph }
  }
  const r = t - HIT
  const rec = ease.outCubic(clamp(r / 0.14))
  const squash = 1 - 0.1 * Math.exp(-r / 0.05)
  return { x: X_HIT - 13 * rec, y: CY + (1 - squash) * 12 - 3 * Math.sin(Math.PI * clamp(r / 0.2)), ang: 0.06 - 0.17 * Math.sin(Math.PI * clamp(r / 0.3)), sx: squash, alpha: 1 - smooth(0.33, 0.5, t), run: 0 }
}

// ---- the boar ---------------------------------------------------------------------------------------------------
interface Part {
  pts: Pt[]
  rim?: number
  tone: (u: number, v: number, k: number) => number
}

function ell(cx: number, cy: number, rx: number, ry: number, n = 14): Pt[] {
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

const BACK: Pt[] = [[-20, -8], [-13, -12.5], [-4, -15.5], [5, -16.5], [11, -13.5]]
function backY(x: number): number {
  for (let i = 1; i < BACK.length; i++) {
    if (x <= BACK[i][0]) {
      const [x0, y0] = BACK[i - 1]
      const [x1, y1] = BACK[i]
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
    }
  }
  return BACK[BACK.length - 1][1]
}

/** Bristles along the back: a row of dark spikes. */
function mane(): Pt[] {
  const top: Pt[] = []
  for (let x = -19; x <= 10; x += 3) {
    top.push([x, backY(x) + 1.2], [x + 1.4, backY(x + 1.4) - 4.2])
  }
  top.push([11, backY(11) + 1.2])
  const under: Pt[] = []
  for (let x = 11; x >= -19; x -= 4) under.push([x, backY(x) + 3.2])
  return [...top, ...under]
}

function leg(hx: number, ph: number): Pt[] {
  const sw = Math.sin(ph) * 7
  const lift = Math.max(0, Math.cos(ph)) * 5
  const fx = hx + sw
  const fy = FOOT - lift
  return [[hx - 2.7, 3], [hx + 2.7, 3], [fx + 2, fy - 2], [fx + 2.2, fy], [fx - 2.2, fy], [fx - 2, fy - 2]]
}

function boarParts(run: number): Part[] {
  const MANE = mane()
  return [
    // far legs
    { pts: leg(-13, run + Math.PI), rim: 0, tone: (_u, v) => (v > FOOT - 2.4 ? 0 : 1) },
    { pts: leg(11, run + Math.PI * 0.3), rim: 0, tone: (_u, v) => (v > FOOT - 2.4 ? 0 : 1) },
    // tail
    { pts: [[-21, -3.5], [-25, -7], [-27.5, -10.5], [-24.5, -11], [-22.5, -7], [-19, -1]], tone: () => 2 },
    {
      pts: [[-22, -2], ...BACK, [15, -9.5], [18.5, -3], [17.5, 4], [10, 9.2], [-6, 9.8], [-17, 7.5], [-22, 3]],
      tone: (_u, v, k) => (v < -11.5 ? 4 : v < -6.5 ? (k ? 3 : 4) : v < 1 ? 3 : v < 5 ? (k ? 2 : 3) : v < 7.4 ? 2 : 1),
    },
    { pts: MANE, tone: (_u, v) => (v < backY(0) - 2.5 ? 1 : 2) },
    // near legs
    { pts: leg(-12, run), rim: 1, tone: (_u, v) => (v > FOOT - 2.4 ? 0 : v > 8 ? 2 : 3) },
    { pts: leg(12, run + Math.PI * 1.3), rim: 1, tone: (_u, v) => (v > FOOT - 2.4 ? 0 : v > 8 ? 2 : 3) },
    // ear
    { pts: [[14, -12.5], [15.5, -19], [20.5, -12.5]], rim: 1, tone: (_u, v) => (v < -16 ? 4 : 2) },
    // head
    {
      pts: [[12, -13], [19, -12], [26, -8], [31, -4.5], [33.5, 0], [31.5, 4], [24, 5.6], [17, 5.4], [12, 2]],
      rim: 1,
      tone: (u, v, k) => (u > 28.5 ? (v < -2 ? 5 : 4) : v < -8 ? 4 : v < -3 ? (k ? 3 : 4) : v < 2 ? 3 : 2),
    },
    // snout disc
    { pts: ell(32.2, -0.6, 2.4, 3.3), rim: 0, tone: (u, v) => (v < -2 ? 5 : u > 32.6 ? 2 : 3) },
    // tusk
    { pts: [[24.5, 4.8], [29, 4.4], [32.4, 1.2], [33.2, -3.6], [30.8, -1.6], [27.6, 0.8], [25.6, 2.4]], rim: 1, tone: (_u, v) => (v < -0.5 ? 7 : 6) },
    // brow + eye
    { pts: [[20.4, -8.6], [26, -6.2], [26, -7.9], [20.4, -10.2]], tone: () => 0 },
    { pts: [[21.8, -6.2], [24.6, -6.2], [24.6, -3.8], [21.8, -3.8]], tone: (u, v) => (u > 23.2 && v < -4.8 ? 7 : 0) },
  ]
}

function blit(p: PainterLike, parts: Part[], x: number, y: number, ang: number, sx: number, sc: number, C: number[], a: number): void {
  const ca = Math.cos(ang)
  const sa = Math.sin(ang)
  const R = 46 * sc
  const x0 = Math.floor(x - R)
  const y0 = Math.floor(y - R)
  const n = Math.ceil(R * 2) + 2
  const grid = new Int8Array(n * n).fill(-1)
  const ids = new Int8Array(n * n).fill(-1)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const wx = x0 + i + 0.5 - x
      const wy = y0 + j + 0.5 - y
      const u = ((wx * ca + wy * sa) / sc) / sx
      const v = (-wx * sa + wy * ca) / sc
      const k = (x0 + i + y0 + j) & 1
      for (let q = 0; q < parts.length; q++) {
        if (inside(parts[q].pts, u, v)) {
          const t = parts[q].tone(u, v, k)
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
        p.dot(x0 + i, y0 + j, C[c], a)
      } else if (at(i - 1, j) >= 0 || at(i + 1, j) >= 0 || at(i, j - 1) >= 0 || at(i, j + 1) >= 0) {
        p.dot(x0 + i, y0 + j, C[0], a)
      }
    }
  }
}

export function create(o: BoarChargeOpts = {}) {
  const C = fit(o.palette ?? BOAR_PALETTE, 8)
  const seed = o.seed ?? 31
  const R = new Rng(seed)
    const st = stone(C[3])
  const ps = new Particles({ rng: R, ground: () => GROUND, sparks: [WHITE, C[6], C[5], C[3]] })
  const bits = new Bits({ ground: () => GROUND })
  const lights = new Lights()
  const spk = spikes(R, 14, 0.05, { len: [12, 17], w: [1.8, 2.5], fwd: 1.5, back: 0.9, jag: 0.5 })
  const segs = Array.from({ length: 7 }, (_, i) => ({ a: (i / 7) * TAU, gap: R.range(0.55, 0.85), dr: R.range(0.1, 0.4), w: 0.8 + 0.4 * R.next() }))
  const puffs: Puff[] = []
  const drawPuffs = (p: PainterLike, front: boolean) => {
    for (const q of puffs) {
      if (q.front !== front) continue
      const k = q.age / q.life
      const r = q.r * (1 + 0.7 * ease.outQuad(k))
      const a = Math.min(1, (1 - k) * 2) * 0.62
      const base = q.tone ? C[4] : C[3]
      p.disc(q.x, q.y, r, mix(base, C[2], 0.35 * k), a)
      p.disc(q.x - r * 0.12, q.y - r * 0.2, r * 0.76, base, a)
      p.disc(q.x - r * 0.28, q.y - r * 0.4, r * 0.42, q.tone ? C[6] : C[5], a * 0.75)
    }
  }
  const partsCache = new Map<number, Part[]>()
  const partsFor = (run: number): Part[] => {
    const k = Math.round((run % TAU) * 5)
    let ps2 = partsCache.get(k)
    if (!ps2) partsCache.set(k, (ps2 = boarParts(k / 5)))
    return ps2
  }
  let t = 0
  let hit = false
  let acc = 0

  return {
    update(dt: number) {
      t += dt
      const pose = poseAt(t)
      // the trail: dust rolled up by the hooves
      if (t < HIT + 0.02) {
        for (acc += dt * 170; acc > 1; acc--) {
          const sp = pose.x - 22 * SC + R.range(-8, 3)
          puffs.push({ x: sp, y: GROUND - R.range(2, 5), vx: -R.range(25, 70), vy: -R.range(3, 18), r: R.range(2.2, 4.2), age: 0, life: R.range(0.26, 0.36), tone: R.int(0, 1), front: false })
          if (R.chance(0.3)) ps.spawn(P.GRIT, sp, GROUND - 1, -R.range(20, 80), -R.range(30, 100), R.range(0.25, 0.4), R.pick([C[5], C[3], C[2]]), 1)
        }
      }
      if (!hit && t >= HIT) {
        hit = true
        lights.add(4, -14, 70, C[5], 0.65, 0.22)
        lights.add(4, -14, 24, WHITE, 0.8, 0.09)
        for (let i = 0; i < 22; i++) {
          const s = R.sign()
          puffs.push({ x: s * R.range(2, 14) + 2, y: -R.range(1.5, 5), vx: s * R.range(40, 150), vy: -R.range(2, 20), r: R.range(2.6, 5.2), age: 0, life: R.range(0.24, 0.33), tone: R.int(0, 1), front: true })
        }
        for (let i = 0; i < 18; i++) {
          const a = -R.range(0.1, 1.4) + (R.chance(0.3) ? Math.PI * 0.8 : 0)
          const sp = R.range(150, 380)
          ps.spawn(P.SPARK, 4, -12, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.1, 0.22), WHITE, 1)
        }
        for (let i = 0; i < 8; i++) {
          const a = -R.range(0.4, 1.5)
          const sp = R.range(180, 330)
          bits.add({ kind: B.CHUNK, x: R.range(-6, 8), y: -3, vx: Math.cos(a) * sp * 0.9 + 20, vy: Math.sin(a) * sp, g: 1, drag: 0.4, bounce: 0.3, life: R.range(0.28, 0.33), a: R.range(0, TAU), va: R.range(-14, 14), s: R.pick([2.5, 3, 3.5]), pts: rockShape(R) })
        }
        for (let i = 0; i < 16; i++) {
          const a = -R.range(0.2, 1.3) + (R.chance(0.3) ? Math.PI * 0.7 : 0)
          const sp = R.range(70, 220)
          ps.spawn(P.GRIT, 4 + R.range(-5, 5), -2, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.25, 0.36), R.pick([C[5], C[4], C[3], C[2]]), R.chance(0.3) ? 2 : 1)
        }
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const q = puffs[i]
        q.age += dt
        if (q.age >= q.life) {
          puffs.splice(i, 1)
          continue
        }
        q.x += q.vx * dt
        q.y += q.vy * dt
        q.vx -= q.vx * 3 * dt
        q.vy -= q.vy * 2 * dt
      }
      ps.update(dt)
      bits.update(dt)
      lights.update(dt)
    },
    drawBack(p: PainterLike) {
      drawPuffs(p, false)
    },
    draw(p: PainterLike) {
      const pose = poseAt(t)
      // contact shadow
      if (pose.alpha > 0.05) p.ellipse(pose.x - 2, GROUND + 0.5, 27 * SC, 3, C[0], 0.45 * pose.alpha)
      // speed lines behind the charging boar
      const lineK = 1 - smooth(HIT - 0.02, HIT + 0.06, t)
      if (lineK > 0.02) {
        for (let i = 0; i < 11; i++) {
          const r = rng(seed, 7, i)
          const y = GROUND - 3 - r.range(0, 33)
          const off = r.range(26, 70)
          const len = r.range(22, 56) * (0.55 + 0.45 * clamp((t + 0.04) / 0.1))
          const x1 = pose.x - off
          p.line(x1 - len, y, x1, y, i % 3 === 0 ? WHITE : C[5], 0.85 * lineK)
          p.line(x1 - len * 0.6, y + 1, x1, y + 1, C[3], 0.6 * lineK)
        }
      }
      // the boar
      if (pose.alpha > 0.04) blit(p, partsFor(pose.run), pose.x, pose.y, pose.ang, pose.sx, SC, C, t < 0.02 ? 0.5 : pose.alpha)
      // impact
      const h = t - HIT
      if (h >= 0) {
        const ix = 3
        const iy = -13
        if (h < 0.1) {
          const sc = h < 0.03 ? 1 : 0.5 + 0.7 * (1 - h / 0.1)
          const th = h < 0.03 ? 1 : 0.55
          star(p, ix, iy, spk, sc * 1.4, th, h < 0.03 ? [C[5], C[6], WHITE, WHITE] : [C[3], C[4], C[5], C[6]], 1, 2.6)
        }
        const u = clamp((h - 0.01) / 0.3)
        if (u > 0 && u < 1) {
          const r = 8 + 30 * ease.outCubic(u)
          const brk = smooth(0.1, 0.6, u)
          const i = u < 0.15 ? 7 : u < 0.35 ? 6 : u < 0.55 ? 5 : 4
          brokenRing(p, ix, iy, r, Math.max(1, 3.4 * Math.pow(1 - u, 1.2)), segs, brk, C[i], C[Math.max(2, i - 2)], u < 0.6 ? 1 : (1 - u) / 0.4, 1, 0)
        }
        // the shock running out along the ground: standing crescent fronts, long to the right, short to the left
        const g = clamp((h - 0.01) / 0.3)
        if (g > 0 && g < 1) {
          const k = g < 0.6 ? 1 : (1 - g) / 0.4
          const cols = g < 0.25 ? [C[7], C[6], C[5]] : g < 0.55 ? [C[6], C[5], C[4]] : [C[5], C[4], C[3]]
          const hh = 4 + 17 * Math.pow(1 - g, 0.8)
          const ww = 1.5 + 5 * Math.pow(1 - g, 0.9)
          frontCrescent(p, 6 + 62 * ease.outCubic(g), 1, hh, ww, cols, k)
          frontCrescent(p, -2 - 28 * ease.outCubic(g), -1, hh * 0.7, ww * 0.8, cols, k)
        }
        const pop = Math.exp(-h / 0.05)
        if (pop > 0.02) {
          p.glow(ix, iy, 40, C[5], 0.45 * pop)
          p.glow(ix, iy, 12, WHITE, 0.55 * pop)
        }
      }
      drawPuffs(p, true)
      for (const b of bits.list) rock(p, { ...b, life: b.life + 0.22 }, st)
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
