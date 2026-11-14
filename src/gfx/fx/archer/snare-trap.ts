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

const HW = 30 // jaw half-width at the base
const HT = 29.5 // jaw height
const SEAM = 2.8 // half-gap of the zig-zag seam
const T_SNAP = 0.075
const T_BITE = 0.15
const K = 18
const NT = 4 // teeth per jaw

const lerp2 = (a: number[], b: number[], c: number): number[] => [a[0] + (b[0] - a[0]) * c, a[1] + (b[1] - a[1]) * c]

/** Outer edge of a jaw: u 0 at the hinge, 1 at the tip. Open: lying flat and arched a touch. Shut: a narrow pointed arch. */
function edgeP(side: number, u: number, c: number): number[] {
  const open = [side * (HW + 22 * u), -4 * Math.sin(u * Math.PI) - 5]
  const s = 1 - u
  const shut = [side * (SEAM + (HW - SEAM) * s), -HT * (1 - Math.pow(s, 2.5))]
  return lerp2(open, shut, c)
}
/** The rest of the outline, from the tip round the underside back to the hinge. */
function edgeQ(side: number, v: number, c: number): number[] {
  const open = [side * (HW + 22 - 22 * v), 1]
  const shut = v < 0.5 ? [side * SEAM, -HT + 2 * (HT - 1) * v] : [side * (SEAM + (HW - SEAM) * ((v - 0.5) * 2)), 1]
  return lerp2(open, shut, c)
}
/** Where teeth sit: down the seam when shut, along the top of the flat jaw when open. */
function toothAt(side: number, w: number, c: number): number[] {
  return lerp2([side * (50 - 20 * w), -5.5], [side * SEAM, -HT + 3.5 + w * (HT - 11)], c)
}

function jaw(p: PainterLike, C: number[], side: number, c: number, sx: number, sy: number, a: number): void {
  const T = (q: number[]): number[] => [q[0] * sx, q[1] * sy]
  const P: number[][] = [], Q: number[][] = []
  for (let k = 0; k <= K; k++) P.push(T(edgeP(side, k / K, c)))
  for (let k = 0; k <= K; k++) Q.push(T(edgeQ(side, k / K, c)))
  const poly = [...P, ...Q]
  // body, lit from the top left: lighter towards the top and the left jaw, one step darker on the right jaw
  const dk = side > 0 ? 1 : 0
  p.poly(poly, (x: number, y: number) => {
    const yy = clamp(1 + y / (HT + 2)) // 0 at the top, 1 at the ground (when shut)
    const lit = c > 0.5 ? yy : 0.5 + 0.5 * Math.abs(x) / 52
    const i = lit < 0.2 ? 5 : lit < 0.45 ? 4 : lit < 0.75 ? 3 : 2
    return C[i - dk]
  }, a)
  // lit top edge along the outer curve, dark outline all round
  for (let k = 1; k <= K; k++) {
    p.line(P[k - 1][0], P[k - 1][1] + 1, P[k][0], P[k][1] + 1, side < 0 ? C[7] : C[6], a)
    p.line(P[k - 1][0], P[k - 1][1], P[k][0], P[k][1], C[1], a)
  }
  for (let k = 1; k < poly.length; k++) p.line(poly[k - 1][0], poly[k - 1][1], poly[k][0], poly[k][1], C[1], a)
  p.line(poly[poly.length - 1][0], poly[poly.length - 1][1], poly[0][0], poly[0][1], C[1], a)
  // panel line and rivets
  const h = T(edgeP(side, 0.07, c))
  p.dot(h[0] - side * 2, h[1] - 2, C[6], a)
  // teeth: interlocking triangles (the right jaw's sit between the left jaw's)
  for (let j = 0; j < NT; j++) {
    const w = (j + (side < 0 ? 0.3 : 0.8)) / NT
    const b = T(toothAt(side, w, c))
    const dx = (1 - c) * 0 + c * -side, dy = (1 - c) * -1
    const dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, nx = -uy, ny = ux
    const L = 6, hw = 2.5
    const tip = [b[0] + ux * L, b[1] + uy * L]
    p.poly([[b[0] - nx * (hw + 0.7) - ux, b[1] - ny * (hw + 0.7) - uy], [tip[0] + ux * 0.8, tip[1] + uy * 0.8], [b[0] + nx * (hw + 0.7) - ux, b[1] + ny * (hw + 0.7) - uy]], C[1], a)
    p.poly([[b[0] - nx * hw - ux, b[1] - ny * hw - uy], tip, [b[0] + nx * hw - ux, b[1] + ny * hw - uy]], side < 0 ? C[5] : C[3], a)
    p.dot(tip[0], tip[1], C[6], a)
  }
  // hinge rivet
  const hh = T([side * HW, -1])
  p.circle(hh[0], hh[1], 2.4, C[1], a)
  p.circle(hh[0], hh[1], 1.4, C[5], a)
}

export function draw(p: PainterLike, t: number, o: SnareTrapOpts): void {
  const C = fit(o.palette ?? STEEL, 8) as number[]
  const S = o.seed ?? 9

  // open for a beat, snaps shut in two frames, one frame of overshoot and squash, then settles
  const q = seg(t, T_SNAP, T_BITE)
  const e = q * q * (3 - 2 * q)
  let c = e, sx = 1, sy = 1
  const sinceBite = t - T_BITE
  if (sinceBite > 0 && sinceBite < 0.05) { c = 1.1; sx = 1.07; sy = 0.9 } else if (sinceBite >= 0.05 && sinceBite < 0.08) { c = 1.03; sx = 1.02; sy = 0.97 }
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
  jaw(p, C, -1, c, sx, sy, fade)
  jaw(p, C, 1, c, sx, sy, fade)

  // the bite: flash, X-shaped glint at the seam, sparks
  const b = t - T_BITE
  if (b >= -0.01 && b < 0.22) {
    const bb = Math.max(0, b), gy = -17
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
