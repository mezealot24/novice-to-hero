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
  poly(pts: number[][], c: number, a?: number): void
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

const R = 21 // dome radius when shut
const T_SNAP = 0.1
const T_BITE = 0.15

/** Jaw centre line for closure c (0 open and flat, 1 shut as one half of a dome); side -1 left, +1 right. */
function jawPt(side: number, u: number, c: number): number[] {
  const ox = side * (R + 27 * u), oy = -4.5 * Math.sin(u * Math.PI) - 1 * u
  const an = Math.PI / 2 * u
  const cx = side * R * Math.cos(an), cy = -R * Math.sin(an)
  return [ox + (cx - ox) * c, oy + (cy - oy) * c]
}

function jaw(p: PainterLike, C: number[], side: number, c: number, a: number): void {
  const K = 26
  const pts: number[][] = []
  for (let k = 0; k <= K; k++) pts.push(jawPt(side, k / K, c))
  const normals = pts.map((q, k) => {
    const A = pts[Math.max(0, k - 1)], B = pts[Math.min(K, k + 1)]
    let tx = B[0] - A[0], ty = B[1] - A[1]
    const l = Math.hypot(tx, ty) || 1
    tx /= l; ty /= l
    let nx = -ty, ny = tx
    // inward = towards the middle of the trap, above the ground
    if (nx * (0 - q[0]) + ny * (-7 - q[1]) < 0) { nx = -nx; ny = -ny }
    return [nx, ny]
  })
  // teeth first (behind the band): sharp triangles on the inner edge
  for (let k = 1; k < K; k += 2) {
    const q = pts[k], n = normals[k], tx = -n[1], ty = n[0]
    const L = 6.2 * (0.55 + 0.45 * Math.sin((k / K) * Math.PI)) + 1.6
    p.poly([[q[0] + n[0] * 1.8 - tx * 1.9, q[1] + n[1] * 1.8 - ty * 1.9], [q[0] + n[0] * (1.8 + L), q[1] + n[1] * (1.8 + L)], [q[0] + n[0] * 1.8 + tx * 1.9, q[1] + n[1] * 1.8 + ty * 1.9]], C[1], a)
    p.poly([[q[0] + n[0] * 1.8 - tx * 1.0, q[1] + n[1] * 1.8 - ty * 1.0], [q[0] + n[0] * (1.2 + L), q[1] + n[1] * (1.2 + L)], [q[0] + n[0] * 1.8 + tx * 1.0, q[1] + n[1] * 1.8 + ty * 1.0]], k % 4 === 1 ? C[7] : C[6], a)
  }
  // band: dark rim, lit outer edge, body, shaded inner edge
  for (const [off, col] of [[-2.9, C[1]], [2.7, C[1]], [-2, C[6]], [-1, C[5]], [0, C[4]], [1, C[3]], [1.9, C[2]]] as Array<[number, number]>) {
    for (let k = 1; k <= K; k++) {
      const A = pts[k - 1], B = pts[k], nA = normals[k - 1], nB = normals[k]
      p.line(A[0] + nA[0] * off, A[1] + nA[1] * off, B[0] + nB[0] * off, B[1] + nB[1] * off, col, a)
    }
  }
  // hinge rivet
  const h = pts[0]
  p.circle(h[0], h[1], 2.2, C[1], a)
  p.circle(h[0], h[1], 1.2, C[6], a)
}

export function draw(p: PainterLike, t: number, o: SnareTrapOpts): void {
  const C = fit(o.palette ?? STEEL, 8) as number[]
  const S = o.seed ?? 9

  // closure: wait, a small arming twitch, snap shut with overshoot
  const q = seg(t, T_SNAP, T_BITE)
  const e = q * q * (3 - 2 * q)
  const c = q <= 0 ? 0 : q < 1 ? e * 1.1 : 1 + 0.1 * Math.exp(-(t - T_BITE) * 40) * Math.cos((t - T_BITE) * 90)
  const cc = Math.min(c, 1.06)
  const hold = 0.42
  const fade = t < hold ? 1 : clamp(1 - (t - hold) / (meta.duration - hold - 0.02))
  const twitch = t > 0.04 && t < T_SNAP ? -1 : 0

  // base plate with trigger pan
  p.ellipse(0, 1, 23, 5, C[1], fade)
  p.ellipse(0, 0.5, 21, 3.6, C[2], fade)
  p.ellipse(0, -0.3, 11, 2, C[3], fade)
  p.line(-9, -0.8, 9, -0.8, C[5], fade)
  for (const s of [-1, 1]) p.dot(s * 17, 0, C[6], fade)

  // jaws (the left one first, the right one's teeth overlap it a touch)
  p.glow(0, -4, 36, C[4], 0.1 * fade)
  if (fade > 0.03) {
    jaw(p, C, -1, cc, fade)
    jaw(p, C, 1, cc, fade)
    if (twitch) p.dot(0, -3, C[6], fade)
  }

  // the bite: flash, glint star, sparks
  const b = t - T_BITE
  if (b >= -0.01 && b < 0.2) {
    const bb = Math.max(0, b)
    if (bb < 0.06) p.circle(0, -R + 1, 6 * (1 - bb / 0.07), WHITE)
    const gl = clamp(1 - bb / 0.16)
    if (gl > 0) {
      const Lh = 13 * gl, Lv = 9 * gl
      for (let d = 1; d <= Lh; d++) for (const s of [-1, 1]) p.dot(s * d, -R + 1, d < Lh * 0.5 ? WHITE : C[6], d > Lh * 0.8 ? 0.7 : 1)
      for (let d = 1; d <= Lv; d++) for (const s of [-1, 1]) p.dot(0, -R + 1 + s * d, d < Lv * 0.5 ? WHITE : C[5])
      p.glow(0, -R + 1, 26, C[6], 0.5 * gl)
    }
    for (let i = 0; i < 9; i++) {
      const r = rng(S, i, 2), life = r.range(0.1, 0.2)
      if (bb > life) continue
      const an = -Math.PI / 2 + r.range(-1.3, 1.3), v = r.range(120, 260), d = v * bb
      const x = Math.cos(an) * d, y = -R + 1 + Math.sin(an) * d + 260 * bb * bb, l = 4 * (1 - bb / life)
      p.line(x, y, x + Math.cos(an) * l, y + Math.sin(an) * l, (u: number) => (u > 0.5 ? WHITE : C[5]))
    }
  }

  // dust kicked off the ground by the snap
  const dAge = t - (T_SNAP + 0.01)
  if (dAge > 0 && dAge < 0.32) {
    const k = dAge / 0.32
    for (let i = 0; i < 7; i++) {
      const r = rng(S, i, 6), side = i % 2 ? 1 : -1
      const x = side * (6 + r.range(2, 22) * Math.sqrt(k) + i), y = -1 - r.range(2, 12) * k - 3 * Math.sin(k * Math.PI)
      const rad = r.range(1.6, 3) + 3.2 * k
      p.circle(x, y, rad, k < 0.4 ? C[5] : C[3], 0.75 * (1 - k) ** 1.2)
    }
    // a flat ring of grit sliding out along the ground
    const rr = 10 + 34 * k
    for (let m = 0; m < 30; m++) {
      const an = (m / 30) * Math.PI + Math.PI
      if (rng(S, m, 12).next() < k * 0.9) continue
      p.dot(Math.cos(an) * rr, -Math.sin(-an) * 0 + Math.sin(an) * rr * 0.12 - 1, C[5], 1 - k)
    }
  }
}
