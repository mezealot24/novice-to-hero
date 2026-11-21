// 🤐 ดาบสยบมนตร์ hit: two broad sword cuts cross in an X (the second a beat later), and where they cross a square rune
// seal stamps down: a diamond frame snaps in from large to tight, four rune ticks blink on its corners, a white seal
// flash, then the frame shatters into sparks. One-shot, 0.6 s.
import { Lights, P, Particles, Rng, WHITE, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { type Blade, type PainterLike, drawBlade, glint } from '../thief/_blade'
import { SEAL_BLUE } from './_pal'

export interface SealCutOpts {
  palette?: string[]
  seed?: number
}

interface Painter extends PainterLike {
  line(x0: number, y0: number, x1: number, y1: number, c: number, a?: number): void
}

export const meta = {
  name: 'Seal cut',
  desc: 'Two broad sword cuts cross in an X; a square rune seal snaps tight on the crossing, flashes white and shatters.',
  tags: ['swordsman', 'sword', 'slash', 'seal', 'silence', 'one-shot'],
  size: [152, 128] as number[],
  origin: [76, 64] as number[],
  duration: 0.6,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: SEAL_BLUE, seed: 5 },
}

const STAMP_T = 0.12 // the seal lands
const BREAK_T = 0.3 // the seal shatters

function blades(): Blade[] {
  return [
    { a: [-50, -40], c: [12, -18], b: [46, 40], w: 10, t0: 0, reveal: 0.06, hold: 0.05, life: 0.18 },
    { a: [48, -42], c: [-12, -18], b: [-46, 38], w: 10, t0: 0.07, reveal: 0.06, hold: 0.05, life: 0.18 },
  ]
}

/** The diamond seal frame at size r (corner distance), 2 px thick, with a tick on each corner. */
function seal(p: Painter, r: number, C: number[], a: number, ticks: number) {
  const pts: [number, number][] = [[0, -r], [r, 0], [0, r], [-r, 0]]
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % 4]
    p.line(x0 * 1.06, y0 * 1.06, x1 * 1.06, y1 * 1.06, C[2], a)
    p.line(x0, y0, x1, y1, C[6], a)
    p.line(x0 * 0.94, y0 * 0.94, x1 * 0.94, y1 * 0.94, C[5], a)
    p.line(x0 * 0.88, y0 * 0.88, x1 * 0.88, y1 * 0.88, C[3], a * 0.9)
  }
  p.disc(0, 0, r * 0.62, C[2], 0.35 * a)
  if (ticks <= 0) return
  for (const [x, y] of pts) {
    const ox = Math.sign(x) * 4, oy = Math.sign(y) * 4
    p.dot(x + ox, y + oy, WHITE, a * ticks)
    p.dot(x + ox * 1.5, y + oy * 1.5, C[6], a * ticks)
    p.glow(x + ox, y + oy, 4, C[5], 0.4 * a * ticks)
  }
}

export function create(o: SealCutOpts = {}) {
  const C = fit(o.palette ?? SEAL_BLUE, 8)
  const R = new Rng(o.seed ?? 5)
  const bs = blades()
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => Infinity, sparks: [C[7], C[6], C[5], C[4]] })
  for (let i = 0; i < 14; i++) { // crossing sparks
    const a = R.range(0, Math.PI * 2), sp = R.range(60, 140)
    ps.spawn(P.SPARK, 0, -2, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.1, 0.2), WHITE, 1, STAMP_T)
  }
  for (let i = 0; i < 16; i++) { // the seal frame breaks along its edges
    const k = i / 16, side = Math.floor(k * 4), u = (k * 4) % 1, r = 24
    const P0 = [[0, -r], [r, 0], [0, r], [-r, 0]][side], P1 = [[r, 0], [0, r], [-r, 0], [0, -r]][side]
    const x = P0[0] + (P1[0] - P0[0]) * u, y = P0[1] + (P1[1] - P0[1]) * u, l = Math.hypot(x, y) || 1, sp = R.range(40, 90)
    ps.spawn(P.SPARK, x, y, (x / l) * sp, (y / l) * sp, R.range(0.12, 0.22), C[6], 1, BREAK_T)
  }
  lights.add(0, -2, 40, C[4], 0.45, 0.16)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: Painter) {
      for (const b of bs) drawBlade(p, b, t, C)
      // the seal: snaps from wide to tight, holds with blinking ticks, then breaks
      const k = seg(t, STAMP_T - 0.04, STAMP_T)
      if (k > 0 && t < BREAK_T + 0.02) {
        const r = 50 - 26 * ease.outBack(k)
        const a = Math.min(1, k * 2) * (1 - smooth(BREAK_T - 0.04, BREAK_T + 0.02, t))
        seal(p, r, C, a, seg(t, STAMP_T, STAMP_T + 0.05))
        seal(p, r * 0.5, C, a * 0.7, 0)
      }
      const fl = seg(t, STAMP_T, STAMP_T + 0.015) * (1 - smooth(STAMP_T + 0.02, STAMP_T + 0.1, t))
      glint(p, 0, 0, 13, C, fl)
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
