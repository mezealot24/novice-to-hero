// Thief ult เงาพริ้ว (and Rogue Back Stab / Mobster ทวงหนี้ in other palettes): one long crescent cut sweeps across the
// target with two dark afterimages lagging behind it. A beat after the blade has passed, a thin white "split line"
// flashes along the cut and shatters into sparks (the iai beat), while shadow wisps drift off and fade.
import { Lights, P, Particles, Rng, WHITE, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { type Blade, type PainterLike, bez, drawBlade, glint } from './_blade'

export interface ShadowSlashOpts {
  palette?: string[]
  seed?: number
}

/** Deep violet shadow with a lilac edge. */
export const SHADOW_VIOLET = ['#07040d', '#1a0f2e', '#3a1f5c', '#6a3aa0', '#a070e0', '#c9a8ff', '#ece0ff', '#ffffff']

export const meta = {
  name: 'Shadow slash',
  desc: 'A long crescent cut sweeps across with two dark afterimages behind it; a beat later a white split line flashes along the cut and shatters, while shadow wisps drift away.',
  tags: ['thief', 'shadow', 'slash', 'iai', 'one-shot'],
  size: [176, 120] as number[],
  origin: [88, 62] as number[],
  duration: 0.55,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: SHADOW_VIOLET, seed: 13 },
}

const MAIN: Blade = { a: [-64, -30], c: [-2, -34], b: [70, 24], w: 11, t0: 0, reveal: 0.06, hold: 0.05, life: 0.18 }
const SPLIT_T = 0.15 // the split line flashes here
const ECHOES: [number, number, number][] = [ // dx, dy, delay
  [-9, 7, 0.025],
  [-18, 14, 0.05],
]

interface Wisp { x: number; y: number; vx: number; vy: number; r: number; t0: number; life: number }

export function create(o: ShadowSlashOpts = {}) {
  const C = fit(o.palette ?? SHADOW_VIOLET, 8)
  const R = new Rng(o.seed ?? 13)
  const echoes = ECHOES.map(([dx, dy, d]): Blade => ({
    ...MAIN,
    a: [MAIN.a[0] + dx, MAIN.a[1] + dy], c: [MAIN.c[0] + dx, MAIN.c[1] + dy], b: [MAIN.b[0] + dx, MAIN.b[1] + dy],
    w: MAIN.w * 0.85, t0: MAIN.t0 + d,
  }))
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => Infinity, sparks: [C[7], C[6], C[5], C[4]] })
  // the split line shatters: sparks thrown off both sides of the cut
  for (let i = 0; i < 22; i++) {
    const u = R.range(0.12, 0.9), s = bez(MAIN, u), sg = R.sign(), sp = R.range(30, 90)
    ps.spawn(P.SPARK, s.x, s.y, s.nx * sg * sp + R.range(-15, 15), s.ny * sg * sp + R.range(-15, 15), R.range(0.1, 0.22), WHITE, 1, SPLIT_T + 0.02 + u * 0.03)
  }
  const wisps: Wisp[] = []
  for (let i = 0; i < 9; i++) {
    const u = R.range(0.15, 0.85), s = bez(MAIN, u)
    wisps.push({ x: s.x, y: s.y + R.range(-4, 4), vx: R.range(-22, 8), vy: R.range(-26, -8), r: R.range(3, 5.5), t0: 0.04 + u * 0.06, life: R.range(0.25, 0.38) })
  }
  lights.add(0, -6, 60, C[4], 0.35, 0.18)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: PainterLike) {
      // shadow wisps behind everything: dark puffs that rise, swell and thin out
      for (const w of wisps) {
        const k = seg(t, w.t0, w.t0 + w.life)
        if (k <= 0 || k >= 1) continue
        const dt = t - w.t0, a = 0.55 * (1 - k) * Math.min(1, k * 6)
        p.disc(w.x + w.vx * dt, w.y + w.vy * dt, w.r * (1 + k * 0.8), C[1], a)
        p.disc(w.x + w.vx * dt - 1, w.y + w.vy * dt - 1, w.r * (0.5 + k * 0.4), C[2], a * 0.8)
      }
      for (let i = echoes.length - 1; i >= 0; i--) drawBlade(p, echoes[i], t, C, { ghost: true, alpha: 0.7 - i * 0.2 })
      drawBlade(p, MAIN, t, C)
      // the split line: a 1-px white seam along the cut that flashes, then breaks apart from the middle outwards
      const on = seg(t, SPLIT_T, SPLIT_T + 0.02), off = smooth(SPLIT_T + 0.03, SPLIT_T + 0.12, t)
      if (on > 0 && off < 1) {
        for (let i = 0; i <= 260; i++) {
          const u = 0.06 + (i / 260) * 0.88
          if (Math.abs(u - 0.5) < off * 0.5) continue
          const s = bez(MAIN, u)
          p.dot(s.x, s.y, WHITE, on * (1 - off * 0.5))
          p.dot(s.x + s.nx, s.y + s.ny, C[6], on * 0.6 * (1 - off))
        }
        const m = bez(MAIN, 0.5)
        p.glowLine(MAIN.a[0] * 0.8, MAIN.a[1] * 0.8 - 4, MAIN.b[0] * 0.8, MAIN.b[1] * 0.8, 8, C[5], 0.3 * on * (1 - off))
        glint(p, m.x, m.y, 13, C, on * (1 - off))
      }
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
