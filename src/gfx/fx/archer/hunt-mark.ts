// Archer mark (หมายหัว): a hunter's reticle spins in and contracts onto the target, snaps to size with a flash,
// the crosshair pulses once, then it fades.
import { WHITE, clamp, fit, seg, TAU } from '../../../vendor/pixelfx/core/index.js'

export interface HuntMarkOpts {
  palette?: string[]
  seed?: number
}

interface PainterLike {
  dot(x: number, y: number, c: number, a?: number): void
  line(x0: number, y0: number, x1: number, y1: number, c: number | ((u: number) => number), a?: number | ((u: number) => number)): void
  poly(pts: number[][], c: number, a?: number): void
  circle(x: number, y: number, r: number, c: number | ((d: number) => number), a?: number): void
  ring(cx: number, cy: number, r: number, w: number, c: number | ((v: number) => number), a?: number): void
  arc(cx: number, cy: number, r: number, w: number, a0: number, a1: number, c: number | ((u: number, v: number) => number), a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
  glowRing(x: number, y: number, R: number, r: number, c: number, k?: number): void
}

export const RED_GOLD = ['#2a0508', '#5e0e12', '#a3181c', '#e03a22', '#ff7a2a', '#ffb838', '#ffe58a', '#ffffff']

export const meta = {
  name: 'Hunt mark',
  desc: "A hunter's reticle: a ring with four ticks spins and contracts onto the target, snaps shut with a flash, the crosshair pulses, then fades.",
  tags: ['archer', 'mark', 'reticle', 'target', 'debuff', 'one-shot'],
  size: [96, 96] as number[],
  origin: [48, 48] as number[],
  duration: 0.7,
  loop: false,
  fps: 30,
  bg: 'dark',
  options: { palette: RED_GOLD, seed: 3 },
}

const R_FINAL = 21
const R_START = 40
const T_LOCK = 0.3

/** The reticle ring: four arcs split by four ticks (each pointing in and out), turned by `spin`. */
function reticle(p: PainterLike, C: number[], r: number, spin: number, a: number, w: number, hot: boolean): void {
  const gap = 0.2
  for (let i = 0; i < 4; i++) {
    const a0 = spin + (i / 4) * TAU + gap, a1 = spin + ((i + 1) / 4) * TAU - gap
    p.arc(0, 0, r + 1, w + 2, a0 - 0.05, a1 + 0.05, C[1], a)
    p.arc(0, 0, r, w, a0, a1, (_u: number, v: number) => (v > 0.55 ? (hot ? WHITE : C[6]) : v > 0.2 ? C[5] : C[3]), a)
    // tick at the start of each arc: pointing both ways across the ring
    const ta = spin + (i / 4) * TAU, ca = Math.cos(ta), sa = Math.sin(ta)
    p.line(ca * (r - 7), sa * (r - 7), ca * (r + 5), sa * (r + 5), C[1], a)
    p.line(ca * (r - 6), sa * (r - 6), ca * (r + 4), sa * (r + 4), (u: number) => (u > 0.5 ? C[6] : C[4]), a)
    p.dot(ca * (r + 4), sa * (r + 4), hot ? WHITE : C[7], a)
  }
}

export function draw(p: PainterLike, t: number, o: HuntMarkOpts): void {
  const C = fit(o.palette ?? RED_GOLD, 8) as number[]
  const fade = t < 0.5 ? 1 : clamp(1 - (t - 0.5) / 0.17)
  if (fade <= 0.02) return

  // contraction: fast at first, settling onto the target, then a tiny overshoot at the lock
  const q = seg(t, 0, T_LOCK), e = 1 - (1 - q) ** 3
  const lock = t - T_LOCK
  let r = R_START + (R_FINAL - R_START) * e
  if (lock > 0) r = R_FINAL - 3 * Math.exp(-lock * 38) * Math.cos(lock * 55) * Math.max(0, 1 - lock * 8) + 0
  const spin = (1 - e) * 2.6 * Math.PI
  const appear = clamp(t / 0.06)
  const locked = lock > 0
  const hot = locked && lock < 0.06

  reticle(p, C, r, spin, appear * fade, locked ? 2.8 : 3, hot)

  // crosshair lines: grow out of the centre at the lock, pulse once
  if (locked) {
    const grow = clamp(lock / 0.05), pulse = lock > 0.1 && lock < 0.2 ? Math.sin(((lock - 0.1) / 0.1) * Math.PI) : 0
    const inner = 4 - 1.5 * pulse, outer = (R_FINAL - 5) * grow + 2.5 * pulse
    for (let i = 0; i < 4; i++) {
      const ca = Math.cos((i * Math.PI) / 2), sa = Math.sin((i * Math.PI) / 2)
      const hotc = pulse > 0.3 ? WHITE : C[6]
      p.line(ca * inner, sa * inner, ca * outer, sa * outer, (u: number) => (u < 0.5 ? hotc : C[5]), fade)
      p.line(-sa * 1 + ca * inner, ca * 1 + sa * inner, -sa * 1 + ca * outer, ca * 1 + sa * outer, C[2], 0.8 * fade)
    }
    // centre pip
    p.poly([[0, -2.6], [2.6, 0], [0, 2.6], [-2.6, 0]], C[1], fade)
    p.poly([[0, -1.6], [1.6, 0], [0, 1.6], [-1.6, 0]], pulse > 0.3 ? WHITE : C[7], fade)
  }

  // the lock flash: bright pip, a shock ring leaving the reticle and a lens glow
  if (locked && lock < 0.16) {
    const k = lock / 0.16
    if (lock < 0.05) p.circle(0, 0, 9 * (1 - lock / 0.06), WHITE)
    p.ring(0, 0, R_FINAL + 2 + 14 * k, Math.max(1, 2.2 * (1 - k)), (v: number) => (v > 0.5 ? WHITE : C[5]), (1 - k) ** 1.4)
    p.glowRing(0, 0, R_FINAL + 2 + 14 * k, 5, C[4], 0.4 * (1 - k))
    p.glow(0, 0, 30, C[5], 0.5 * (1 - k))
  }
  p.glowRing(0, 0, r, 5, C[3], 0.22 * fade * appear)
  p.glow(0, 0, 12, C[4], (locked ? 0.25 : 0.1) * fade)
}
