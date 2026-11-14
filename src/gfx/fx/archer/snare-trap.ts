// Archer trap (กับดัก): steel jaws lying open on the ground snap shut upward under the target, with a metallic
// glint at the bite, dust kicked off the ground and a few sparks; then the jaws hold and fade.
import { WHITE, clamp, fit, rng, seg } from '../../../vendor/pixelfx/core/index.js'

export interface SnareTrapOpts {
  palette?: string[]
  seed?: number
}

interface PainterLike {
  dot(x: number, y: number, c: number, a?: number): void
  line(x0: number, y0: number, x1: number, y1: number, c: number | ((u: number) => number), a?: number | ((u: number) => number)): void
  poly(pts: number[][], c: number | ((x: number, y: number) => number), a?: number): void
  circle(x: number, y: number, r: number, c: number, a?: number): void
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
}

export const STEEL = ['#14181f', '#2b3340', '#47546a', '#6f819c', '#9fb2c8', '#c9d7e6', '#e9f2fa', '#ffffff']

export const meta = {
  name: 'Snare trap',
  desc: 'A spring trap on the ground: two toothed steel jaws snap shut upward with a glint, dust and sparks, hold, then fade.',
  tags: ['archer', 'trap', 'snare', 'ground', 'one-shot'],
  size: [112, 96] as number[],
  origin: [56, 80] as number[],
  duration: 0.7,
  loop: false,
  fps: 30,
  bg: 'ground',
  options: { palette: STEEL, seed: 9 },
}

const HW = 28 // hinge half-span
const T_SNAP = 0.075
const T_BITE = 0.15
const K = 44
const TOOTH_GAP = 7

/** A hoop through both hinges: a half-ellipse of signed height h (negative bulges below the hinge line). */
function hoop(h: number): number[][] {
  const pts: number[][] = []
  for (let k = 0; k <= K; k++) {
    const ph = (k / K) * Math.PI
    pts.push([-HW * Math.cos(ph), -h * Math.sin(ph)])
  }
  return pts
}

/** One steel bar (outline, body, lit upper-left edge) with teeth every TOOTH_GAP px along it. */
function bar(p: PainterLike, C: number[], h: number, c: number, phase: number, flash: boolean, a: number): void {
  const pts = hoop(h)
  const nrm = pts.map((q, k) => {
    const A = pts[Math.max(0, k - 1)], B = pts[Math.min(K, k + 1)]
    let tx = B[0] - A[0], ty = B[1] - A[1]
    const l = Math.hypot(tx, ty) || 1
    tx /= l; ty /= l
    let nx = -ty, ny = tx
    if (nx * q[0] + ny * (q[1] + 0.001) < 0) { nx = -nx; ny = -ny }
    return [nx, ny]
  })
  // teeth first, so the bar overlaps their bases
  let acc = 0, next = phase
  for (let k = 1; k <= K; k++) {
    acc += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])
    if (acc < next) continue
    next += TOOTH_GAP
    const q = pts[k], n = nrm[k]
    if (Math.abs(q[0]) > HW - 4) continue
    const dx = (1 - c) * 0 + c * n[0], dy = (1 - c) * -1 + c * n[1]
    const dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, vx = -uy, vy = ux
    const L = 5.5, hw = 2.8, bx = q[0] + ux * 1, by = q[1] + uy * 1
    const tip = [bx + ux * L, by + uy * L]
    p.poly([[bx - vx * (hw + 0.8) - ux, by - vy * (hw + 0.8) - uy], [tip[0] + ux * 0.9, tip[1] + uy * 0.9], [bx + vx * (hw + 0.8) - ux, by + vy * (hw + 0.8) - uy]], C[1], a)
    p.poly([[bx - vx * hw, by - vy * hw], tip, [bx + vx * hw, by + vy * hw]], C[3], a)
    p.poly([[bx - vx * hw * 0.5 + ux * 1.8, by - vy * hw * 0.5 + uy * 1.8], tip, [bx + vx * hw * 0.5 + ux * 1.8, by + vy * hw * 0.5 + uy * 1.8]], C[5], a)
    p.line(bx - vx * hw, by - vy * hw, bx + vx * hw, by + vy * hw, C[2], a)
    p.dot(tip[0], tip[1], flash ? WHITE : C[7], a)
    if (flash) p.dot(tip[0] - ux, tip[1] - uy, WHITE, a)
  }
  for (const off of [-2.1, 2.1]) {
    for (let k = 1; k <= K; k++) p.line(pts[k - 1][0] + nrm[k - 1][0] * off, pts[k - 1][1] + nrm[k - 1][1] * off, pts[k][0] + nrm[k][0] * off, pts[k][1] + nrm[k][1] * off, C[1], a)
  }
  for (const [off, col] of [[1, C[2]], [0, C[4]], [-1, C[3]]] as Array<[number, number]>) {
    for (let k = 1; k <= K; k++) {
      const n = nrm[k]
      const up = n[0] * -0.7 + n[1] * -0.7 > 0.35
      p.line(pts[k - 1][0] + nrm[k - 1][0] * off, pts[k - 1][1] + nrm[k - 1][1] * off, pts[k][0] + n[0] * off, pts[k][1] + n[1] * off, off === -1 && up ? C[6] : col, a)
    }
  }
  for (const s1 of [-1, 1]) {
    p.circle(s1 * HW, 0, 2.6, C[1], a)
    p.circle(s1 * HW, 0, 1.5, C[5], a)
  }
}

export function draw(p: PainterLike, t: number, o: SnareTrapOpts): void {
  const C = fit(o.palette ?? STEEL, 8) as number[]
  const S = o.seed ?? 9

  // open for a beat, snaps shut in two frames, one frame of overshoot and squash, then settles
  const q = seg(t, T_SNAP, T_BITE)
  const e = q * q * (3 - 2 * q)
  const c = e
  let extra = 0
  const sinceBite = t - T_BITE
  const flash = sinceBite >= 0 && sinceBite < 0.05
  if (flash) extra = 3
  else if (sinceBite >= 0.05 && sinceBite < 0.08) extra = 1
  const hold = 0.45
  const fade = t < hold ? 1 : clamp(1 - (t - hold) / (meta.duration - hold - 0.03))
  if (fade <= 0.02) return

  // base plate, trigger pan and a coil spring on the ground
  p.ellipse(0, 2, 35, 6.5, C[1], fade)
  p.ellipse(0, 1.5, 33.5, 5, C[2], fade)
  p.ellipse(0, 0.5, 30, 3.4, C[3], fade)
  p.line(-24, -0.6, 24, -0.6, C[5], fade)
  for (let i = 0; i < 6; i++) {
    const x = -8 + i * 3.2
    p.line(x, 2, x + 2, 6, C[1], fade)
    p.line(x + 1, 2, x + 3, 6, i % 2 ? C[5] : C[4], fade)
  }
  p.glow(0, -12, 34, C[4], 0.1 * fade)
  // trigger pan in the middle of the plate
  p.ellipse(0, 1, 9.5, 3.4, C[1], fade)
  p.ellipse(0, 0.6, 8, 2.6, C[3], fade)
  p.ellipse(0, 0.2, 5, 1.4, C[5], fade)
  // two hoops: far one (flat: bulges up/behind) first, near one (flat: bulges down/toward the viewer) second
  const farH = 6 + 22 * c + extra, nearH = -8 + 34 * c + extra
  bar(p, C, farH, c, 3.5, flash, fade)
  bar(p, C, nearH, c, 7, flash, fade)

  // the bite: flash, X-shaped glint at the seam, sparks
  const b = t - T_BITE
  if (b >= -0.01 && b < 0.22) {
    const bb = Math.max(0, b), gy = -25
    if (bb < 0.06) p.circle(0, gy, 7 * (1 - bb / 0.07), WHITE)
    const gl = clamp(1 - bb / 0.18)
    if (gl > 0) {
      const Ld = 11 * gl, Lp = 6 * gl
      for (let d = 1; d <= Ld; d++) for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) p.dot(s1 * d, gy + s2 * d, d < Ld * 0.45 ? WHITE : C[6], d > Ld * 0.8 ? 0.7 : 1)
      for (let d = 1; d <= Lp; d++) for (const s1 of [-1, 1]) { p.dot(s1 * d, gy, WHITE); p.dot(0, gy + s1 * d, C[6]) }
      p.glow(0, gy, 28, C[6], 0.55 * gl)
    }
    for (let i = 0; i < 16; i++) {
      const r = rng(S, i, 2), life = r.range(0.1, 0.24)
      if (bb > life) continue
      const an = -Math.PI / 2 + r.range(-1.5, 1.5), v = r.range(130, 300), d = v * bb
      const x = Math.cos(an) * d, y = gy + Math.sin(an) * d + 300 * bb * bb, l = 4.5 * (1 - bb / life)
      p.line(x, y, x + Math.cos(an) * l, y + Math.sin(an) * l, (u: number) => (u > 0.5 ? WHITE : C[5]))
    }
  }

  // dust: puffs at the base and a low ring kicked along the ground
  const dAge = t - (T_SNAP + 0.02)
  if (dAge > 0 && dAge < 0.34) {
    const k = dAge / 0.34
    for (let i = 0; i < 8; i++) {
      const r = rng(S, i, 6), side = i % 2 ? 1 : -1
      const x = side * (14 + r.range(2, 22) * Math.sqrt(k)), y = -1 - r.range(2, 10) * k - 3 * Math.sin(k * Math.PI)
      p.circle(x, y, r.range(1.6, 3) + 3.2 * k, k < 0.4 ? C[5] : C[3], 0.75 * (1 - k) ** 1.2)
    }
    const rx = 18 + 36 * (1 - (1 - k) ** 2)
    for (let m = 0; m < 56; m++) {
      const an = (m / 56) * 2 * Math.PI
      if (rng(S, Math.floor(m / 2), 12).next() < k * 0.9) continue
      p.dot(Math.cos(an) * rx, Math.sin(an) * 3.4 + 1, Math.sin(an) < 0 ? C[6] : C[3], 1 - k)
    }
  }
}
