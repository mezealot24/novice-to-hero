// 🤐 silence on a monster: a flat rune ring spins in over its head and closes tight, then a small "muted" sign (a
// circle with a bar through it) pops in, bobs once and fades. Origin = just above the head. One-shot, 0.9 s.
import { TAU, WHITE, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { SEAL_BLUE } from './_pal'

export interface SilenceSealOpts {
  palette?: string[]
}

interface Painter {
  dot(x: number, y: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
  ring(cx: number, cy: number, r: number, w: number, c: number, a?: number): void
  line(x0: number, y0: number, x1: number, y1: number, c: number, a?: number): void
}

export const meta = {
  name: 'Silence seal',
  desc: 'A flat rune ring spins in over a head and closes tight; a small muted sign pops in, bobs and fades.',
  tags: ['swordsman', 'status', 'silence', 'seal', 'one-shot'],
  size: [80, 56] as number[],
  origin: [40, 40] as number[],
  duration: 0.9,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: SEAL_BLUE },
}

const CLOSE_T = 0.22, POP_T = 0.2

export function draw(p: Painter, t: number, o: SilenceSealOpts): void {
  const C = fit(o.palette ?? SEAL_BLUE, 8) as number[]
  // rune ring: a flat ellipse of dashes, wide -> tight, spinning, then fades as the sign takes over
  const k = ease.inQuad(seg(t, 0, CLOSE_T)), fade = 1 - smooth(CLOSE_T, CLOSE_T + 0.16, t)
  if (fade > 0.02) {
    const rx = 34 - 20 * k, ry = rx * 0.3, spin = t * TAU * 1.6
    for (let i = 0; i < 28; i++) {
      if (i % 4 === 3) continue // dashes: 3 on, 1 off
      const a = (i / 28) * TAU + spin, x = Math.cos(a) * rx, y = Math.sin(a) * ry + 4
      p.dot(x, y, Math.sin(a) > 0 ? C[5] : C[3], fade)
    }
    if (k >= 1) p.glow(0, 4, 12, C[4], 0.5 * fade)
  }
  // the muted sign
  const s = ease.outBack(seg(t, POP_T, POP_T + 0.12)), out = smooth(0.62, 0.88, t)
  if (s > 0 && out < 1) {
    const bob = -3 * Math.sin(Math.PI * seg(t, POP_T + 0.12, 0.5)) - out * 6, a = 1 - out, r = 7 * s
    p.ring(0, -6 + bob, r, 2, C[5], a)
    p.ring(0, -6 + bob, r - 2, 1, C[2], a * 0.8)
    p.line(-r * 0.65, -6 + bob - r * 0.65, r * 0.65, -6 + bob + r * 0.65, WHITE, a)
    p.line(-r * 0.65 + 1, -6 + bob - r * 0.65, r * 0.65 + 1, -6 + bob + r * 0.65, C[6], a)
    p.glow(0, -6 + bob, 10, C[4], 0.35 * a)
  }
}
