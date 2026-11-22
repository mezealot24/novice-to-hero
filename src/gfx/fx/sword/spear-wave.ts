// 🔱 คลื่นทะลวง in flight (loop, 0.3 s): the Knight's Pierce of Judgement wave (Q 2026-11-23: "คลื่นดาบ เปลี่ยน Effect
// เป็น คลื่นทะลวง แบบหอก"). A long lance of light pointing right: a leaf-shaped spearhead with a white-hot core, a bright
// shaft behind it, two drill strands twisting around the shaft, mach rings peeling off the head and speed streaks
// pouring back. The battle flies it at one target and destroys it. Origin = the spear tip.
import { Rng, TAU, WHITE, cycle, fit } from '../../../vendor/pixelfx/core/index.js'
import { BLADE_GOLD } from './_pal'

export interface SpearWaveOpts {
  palette?: string[]
  seed?: number
}

export const meta = {
  name: 'Spear wave',
  desc: 'A lance of light flying right: leaf spearhead, glowing shaft, twisting drill strands, mach rings and streaks behind.',
  tags: ['swordsman', 'knight', 'spear', 'pierce', 'projectile', 'directional', 'loop'],
  size: [168, 56] as number[],
  origin: [160, 28] as number[],
  duration: 0.3,
  loop: true,
  fps: 20,
  bg: 'dark',
  options: { palette: BLADE_GOLD, seed: 9 },
}

/** Half height of the spearhead at distance d behind the tip (0 at the tip, widest 10 px at 16, back to the socket at 38). */
const HEAD = 38
const headHalf = (d: number) => (d <= 0 ? 0 : d < 16 ? d * 0.62 : d < HEAD ? 10 - (d - 16) * 0.34 : 0)

export function draw(p: PainterLike, t: number, o: SpearWaveOpts): void {
  const C = fit(o.palette ?? BLADE_GOLD, 8) as number[], seed = o.seed ?? 9, D = meta.duration, ph = t / D
  const SHAFT = 112, S0 = -HEAD - SHAFT // shaft from S0 to the socket at -HEAD
  // speed streaks pouring off the back (solid steps, no alpha dither)
  cycle(t, D, 18, seed, (g: Rng) => g.range(0.1, 0.18), (age: number, life: number, r: Rng) => {
    const y = Math.round(r.range(-22, 22)), x0 = -30 - Math.abs(y) * 1.5 - age * r.range(380, 480), l = Math.round(r.range(10, 26)), k = age / life
    for (let i = 0; i <= l; i++) { const u = i / l; if (u > 1 - k * 0.8) break; p.dot(x0 - i, y, u < 0.15 ? C[6] : u < 0.5 ? C[5] : C[3]) }
  })
  // mach rings: thin vertical ellipses born behind the head, sliding back and opening up, dimming by steps
  for (let i = 0; i < 3; i++) {
    const u = (ph + i / 3) % 1, x = -HEAD - 2 - u * 64, ry = 7 + u * 15, rx = 2 + u * 2.5
    const c = u < 0.3 ? C[6] : u < 0.65 ? C[5] : C[3]
    p.ellipse(x, 0, rx + 1, ry + 1, c, (d: number) => (d > 0.75 ? 1 : 0))
    p.glow(x, 0, ry * 0.5, C[5], 0.1 * (1 - u))
  }
  // the shaft: 5 px, rim / body / white core, the back third cooler
  p.glowLine(S0 + 20, 0, -HEAD, 0, 7, C[4], 0.3)
  for (let x = S0; x <= -HEAD; x++) {
    const k = (x - S0) / SHAFT, warm = k > 0.33
    p.dot(x, -2, C[2]); p.dot(x, 2, C[2])
    p.dot(x, -1, warm ? C[5] : C[4]); p.dot(x, 1, warm ? C[4] : C[3])
    p.dot(x, 0, k > 0.66 ? WHITE : warm ? C[6] : C[5])
  }
  for (let x = S0 - 6; x < S0; x++) p.dot(x, 0, x % 2 ? C[4] : C[3]) // frayed tail
  // drill strands twisting around the shaft (front strand bright, back strand dark)
  for (let s = 0; s < 2; s++) {
    for (let x = S0 + 8; x <= -HEAD + 4; x++) {
      const k = (x - S0) / SHAFT, amp = 3 + k * 6, w = x * 0.2 + ph * TAU * 2 + s * Math.PI
      const y = Math.round(Math.sin(w) * amp), front = Math.cos(w) > 0
      if (!front && Math.abs(y) < 3) continue // hidden behind the shaft
      p.dot(x, y, front ? (k > 0.5 ? C[6] : C[5]) : C[3])
    }
  }
  // the socket collar where the head meets the shaft
  p.rect(-HEAD - 3, -4, 4, 9, C[2])
  p.rect(-HEAD - 2, -3, 2, 7, C[4])
  p.dot(-HEAD - 2, -3, C[6])
  // the spearhead: leaf shape, dark outline, gold body, white-hot spine
  p.glow(-12, 0, 18, C[5], 0.22 + 0.06 * Math.sin(ph * TAU))
  for (let d = 0; d <= HEAD; d++) {
    const h = headHalf(d), x = -d, H = Math.round(h)
    for (let y = -H; y <= H; y++) {
      const v = H > 0 ? Math.abs(y) / H : 0
      p.dot(x, y, v === 1 ? C[2] : v > 0.6 ? C[4] : v > 0.25 ? C[5] : d < 26 ? WHITE : C[6])
    }
  }
  p.dot(1, 0, C[6]); p.dot(2, 0, C[5]) // tip spark
  p.glow(0, 0, 7, WHITE, 0.35)
  // a glint running down each edge of the head
  const g = (ph * 2) % 1, gd = 3 + g * 26, gh = Math.round(headHalf(gd)) - 1
  p.dot(-gd, -gh, WHITE); p.dot(-gd, gh, WHITE)
}

interface PainterLike {
  dot(x: number, y: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void
  rect(x: number, y: number, w: number, h: number, c: number, a?: number): void
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number, a?: number | ((d: number, ang: number) => number)): void
}
