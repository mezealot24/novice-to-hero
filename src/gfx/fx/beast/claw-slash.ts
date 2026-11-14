// Beastmaster wolf: bite / claw rake. Four parallel crescent claw marks tear diagonally across the target, each drawn
// on from one end to the other (white-hot core, coloured edge, dark rim), with torn flecks flying off the trailing ends
// and a fang flash at the start. The marks then thin from the tail end and fade.
import { Lights, P, Particles, Rng, WHITE, clamp, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'

export interface ClawSlashOpts {
  palette?: string[]
  seed?: number
}

type Pt = [number, number]

interface PainterLike {
  dot(x: number, y: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, a?: number): void
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void
}

export const CLAW_PALETTE = ['#0c1424', '#1c2c4a', '#34507a', '#5b82ad', '#8db4d4', '#c4dcec', '#eaf6ff', '#ffffff']

export const meta = {
  name: 'Claw slash',
  desc: 'Four tapered claw rakes tear diagonally across the centre with a white-hot core, flecks flying off the ends and a fang flash, then thin and fade.',
  tags: ['beastmaster', 'wolf', 'claw', 'bite', 'slash', 'one-shot'],
  size: [112, 112] as number[],
  origin: [56, 56] as number[],
  duration: 0.4,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: CLAW_PALETTE, seed: 21 },
}

// the rake direction (down and to the right) and its perpendicular
const DX = 0.62
const DY = 0.785
const PX = DY
const PY = -DX

interface Rake {
  a: Pt
  c: Pt // quadratic control point
  b: Pt
  w: number
  t0: number
}

function makeRakes(): Rake[] {
  const lens = [76, 86, 84, 72]
  const offs = [-20, -7, 7, 19]
  const bends = [16, 18, 18, 15]
  return lens.map((L, i): Rake => {
    const o = offs[i]
    const cx = PX * o + 2
    const cy = PY * o
    const a: Pt = [cx - (DX * L) / 2, cy - (DY * L) / 2]
    const b: Pt = [cx + (DX * L) / 2, cy + (DY * L) / 2]
    // bow the crescent towards the upper right
    return { a, b, c: [cx + PX * bends[i] * 1.0, cy + PY * bends[i] * 1.0], w: i === 1 || i === 2 ? 6.4 : 5.2, t0: 0.012 + i * 0.03 }
  })
}

const REVEAL = 0.075

function bez(r: Rake, u: number): { x: number; y: number; nx: number; ny: number } {
  const q = 1 - u
  const x = q * q * r.a[0] + 2 * q * u * r.c[0] + u * u * r.b[0]
  const y = q * q * r.a[1] + 2 * q * u * r.c[1] + u * u * r.b[1]
  const tx = 2 * q * (r.c[0] - r.a[0]) + 2 * u * (r.b[0] - r.c[0])
  const ty = 2 * q * (r.c[1] - r.a[1]) + 2 * u * (r.b[1] - r.c[1])
  const l = Math.hypot(tx, ty) || 1
  return { x, y, nx: -ty / l, ny: tx / l }
}

/** One claw mark: grows head-first, then the tail end is erased and the whole mark thins away. */
function drawRake(p: PainterLike, r: Rake, t: number, C: number[]): void {
  const head = ease.outCubic(seg(t, r.t0, r.t0 + REVEAL))
  if (head <= 0) return
  const tail = smooth(r.t0 + 0.13, r.t0 + 0.3, t)
  const fade = 1 - smooth(r.t0 + 0.18, r.t0 + 0.35, t)
  if (fade <= 0.01) return
  const thin = 1 - 0.7 * smooth(r.t0 + 0.08, r.t0 + 0.32, t)
  const hot = 1 - smooth(r.t0 + 0.03, r.t0 + 0.16, t)
  const len = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1])
  const steps = Math.ceil(len * 2.4)
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    if (u > head || u < tail) continue
    const s = bez(r, u)
    // thick where the claw bites in, thinning to a point; the very head of a growing mark is a bright knob
    const prof = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.75)
    const w = r.w * prof * thin
    const half = w / 2
    const knob = head < 1 && u > head - 0.1 ? 1 : 0
    for (let o = -half - 1.1; o <= half + 1.1; o += 0.5) {
      const ao = Math.abs(o)
      const v = ao / Math.max(0.6, half)
      let c: number
      if (ao > half) c = u < 0.06 || u > 0.94 ? C[3] : C[1]
      else if (v < 0.36) c = hot > 0.35 || knob ? WHITE : C[7]
      else if (v < 0.7) c = C[6]
      else c = u < 0.3 ? C[5] : C[4]
      // the outer (convex) edge is the lit one; the inner edge stays cooler
      if (ao <= half && o > 0 && v > 0.55) c = C[4]
      p.dot(s.x + s.nx * o, s.y + s.ny * o, c, fade)
    }
  }
  if (fade > 0.2) {
    const h = bez(r, clamp(head))
    p.glow(h.x, h.y, 10, C[5], 0.32 * fade * (head < 1 ? 1 : hot))
  }
}

/** A fang: a short curved wedge, wide at the root and pointed at the tip. */
function fang(p: PainterLike, x0: number, y0: number, x1: number, y1: number, bow: number, w: number, k: number, C: number[]): void {
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy)
  const nx = -dy / len
  const ny = dx / len
  const steps = Math.ceil(len * 2)
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const x = x0 + dx * u + nx * bow * Math.sin(Math.PI * u)
    const y = y0 + dy * u + ny * bow * Math.sin(Math.PI * u)
    const hw = (w / 2) * Math.pow(1 - u, 0.85)
    for (let o = -hw - 1; o <= hw + 1; o += 0.5) {
      const ao = Math.abs(o)
      p.dot(x + nx * o, y + ny * o, ao > hw ? C[3] : ao < hw * 0.45 ? WHITE : C[6], k)
    }
  }
}

export function create(o: ClawSlashOpts = {}) {
  const C = fit(o.palette ?? CLAW_PALETTE, 8)
  const R = new Rng(o.seed ?? 21)
  const rakes = makeRakes()
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => Infinity, sparks: [C[7], C[6], C[5], C[3]] })
  // flecks torn off at the trailing end of every rake
  for (const r of rakes) {
    const d0 = r.t0 + REVEAL * 0.8
    for (let i = 0; i < 6; i++) {
      const a = Math.atan2(DY, DX) + R.range(-0.9, 0.9)
      const sp = R.range(70, 190)
      ps.spawn(P.SPARK, r.b[0] + R.range(-3, 3), r.b[1] + R.range(-3, 3), Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.12, 0.26), WHITE, 1, d0 + R.range(0, 0.03))
    }
    for (let i = 0; i < 3; i++) {
      const u = R.range(0.55, 0.95)
      const s = bez(r, u)
      const sg = R.sign()
      ps.spawn(P.FLAKE, s.x, s.y, s.nx * sg * R.range(20, 50) + DX * 20, s.ny * sg * R.range(20, 50) + DY * 20, R.range(0.2, 0.32), R.pick([C[6], C[5], C[4]]), 1, r.t0 + REVEAL * u)
    }
  }
  lights.add(0, 0, 54, C[4], 0.5, 0.2)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: PainterLike) {
      // faint fang flash where the bite starts: two wedges closing from the upper left
      if (t < 0.085) {
        const k = 1 - smooth(0.02, 0.085, t)
        const c = seg(t, 0, 0.03)
        const s0 = makeRakes()
        for (const [i, off] of [[0, 0], [3, 0]] as const) {
          const a = s0[i].a
          const grow = 6 + 10 * c
          fang(p, a[0] - DX * 12 + PX * off, a[1] - DY * 12 + PY * off, a[0] - DX * 12 + DX * grow + PX * off, a[1] - DY * 12 + DY * grow + PY * off, i === 0 ? 2.4 : -2.4, 4.2, k, C)
        }
        p.glow(-26, -30, 16, C[6], 0.32 * k)
      }
      for (const r of rakes) drawRake(p, r, t, C)
      ps.draw(p, 'front')
      // a cool wash where the claws cross the target
      const k = 1 - smooth(0.05, 0.3, t)
      if (k > 0.01) p.glowLine(-34, -30, 34, 30, 12, C[4], 0.22 * k)
      lights.draw(p)
    },
  }
}
