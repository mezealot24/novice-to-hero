// Shared by the Thief-line effects: one tapered crescent blade stroke along a quadratic curve. The stroke is drawn on
// head-first (a snappy outExpo reveal), holds for a moment, then its tail is erased towards the head while it thins
// and fades. Cross-section: white-hot core, bright edge on the convex side, darker rim.
import { WHITE, clamp, ease, seg, smooth } from '../../../vendor/pixelfx/core/index.js'

export type Pt = [number, number]

export interface PainterLike {
  dot(x: number, y: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, a?: number): void
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void
  disc(cx: number, cy: number, r: number, c: number, a: number): void
}

export interface Blade {
  a: Pt
  c: Pt // quadratic control point (the bow of the crescent)
  b: Pt
  w: number // widest point, px
  t0: number // start time, s
  reveal: number // seconds to draw from a to b
  hold: number // seconds after the reveal ends before the tail starts to erase
  life: number // seconds the erase + fade take
}

export interface BladeLook {
  /** draw only the dark afterimage tones (C[1]..C[4]), no white core */
  ghost?: boolean
  alpha?: number
}

export function bez(r: Blade, u: number): { x: number; y: number; nx: number; ny: number } {
  const q = 1 - u
  const x = q * q * r.a[0] + 2 * q * u * r.c[0] + u * u * r.b[0]
  const y = q * q * r.a[1] + 2 * q * u * r.c[1] + u * u * r.b[1]
  const tx = 2 * q * (r.c[0] - r.a[0]) + 2 * u * (r.b[0] - r.c[0])
  const ty = 2 * q * (r.c[1] - r.a[1]) + 2 * u * (r.b[1] - r.c[1])
  const l = Math.hypot(tx, ty) || 1
  return { x, y, nx: -ty / l, ny: tx / l }
}

/** Seconds after which the blade has fully gone. */
export const bladeEnd = (r: Blade) => r.t0 + r.reveal + r.hold + r.life

export function drawBlade(p: PainterLike, r: Blade, t: number, C: number[], look: BladeLook = {}): void {
  const head = ease.outExpo(seg(t, r.t0, r.t0 + r.reveal))
  if (head <= 0) return
  const e0 = r.t0 + r.reveal + r.hold, e1 = e0 + r.life
  const tail = ease.inQuad(seg(t, e0, e1))
  const fade = (look.alpha ?? 1) * (1 - smooth(e0 + r.life * 0.35, e1, t))
  if (fade <= 0.01 || tail >= 1) return
  const thin = 1 - 0.65 * smooth(e0 - r.hold * 0.5, e1, t)
  const len = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]) + Math.hypot(r.c[0] - r.a[0], r.c[1] - r.a[1]) * 0.3
  const steps = Math.ceil(len * 2.2)
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    if (u > head || u < tail) continue
    const s = bez(r, u)
    const prof = Math.pow(Math.sin(Math.PI * clamp(u)), 0.75)
    const half = (r.w * prof * thin) / 2
    for (let o = -half - 1; o <= half + 1; o += 0.5) {
      const ao = Math.abs(o)
      const v = ao / Math.max(0.6, half)
      let c: number
      if (look.ghost) c = ao > half ? C[1] : v < 0.45 ? C[4] : v < 0.8 ? C[3] : C[2]
      else if (ao > half) c = prof > 0.4 ? C[2] : C[1]
      else if (v < 0.32) c = WHITE
      else if (v < 0.58) c = C[6]
      else if (v < 0.84) c = C[5]
      else c = C[4]
      // the convex (outer) side is lit; the inner side stays cooler
      if (!look.ghost && ao <= half && o > 0 && v > 0.5) c = C[3]
      p.dot(s.x + s.nx * o, s.y + s.ny * o, c, fade)
    }
  }
  // a bright knob riding the head while it is still growing
  if (!look.ghost && head < 1) {
    const h = bez(r, clamp(head))
    p.glow(h.x, h.y, 9, C[6], 0.45 * fade)
  }
}

/** A 4-point star glint (two thin crossed lines + a glow), k = 0..1 strength. */
export function glint(p: PainterLike, x: number, y: number, size: number, C: number[], k: number): void {
  if (k <= 0.01) return
  for (let i = -size; i <= size; i++) {
    const f = 1 - Math.abs(i) / (size + 1)
    const c = Math.abs(i) < size * 0.3 ? WHITE : C[6]
    p.dot(x + i, y, c, k * f)
    p.dot(x, y + i * 0.8, c, k * f)
  }
  p.glow(x, y, size * 1.2, C[5], 0.5 * k)
}
