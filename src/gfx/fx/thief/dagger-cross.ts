// Thief basic hit: ฟันไขว้คู่ (Double Strike). Two razor-thin dagger cuts snap across the target in an X, the second a
// beat after the first, with a star glint and a spray of sparks where they cross. Fast (0.4 s) so it reads on every hit.
import { Lights, P, Particles, Rng, WHITE, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { type Blade, type PainterLike, drawBlade, glint } from './_blade'

export interface DaggerCrossOpts {
  palette?: string[]
  seed?: number
}

/** Steel with a violet edge: the Thief's own colour. */
export const THIEF_STEEL = ['#120c1e', '#2a1d44', '#4b3670', '#7a5fa6', '#a99ad0', '#d2cbec', '#f0ecff', '#ffffff']

export const meta = {
  name: 'Dagger cross',
  desc: 'Two thin dagger cuts snap across the centre in an X, one a beat after the other, with a star glint and sparks at the crossing.',
  tags: ['thief', 'dagger', 'slash', 'double', 'one-shot'],
  size: [112, 112] as number[],
  origin: [56, 56] as number[],
  duration: 0.4,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: THIEF_STEEL, seed: 7 },
}

const CROSS_T = 0.085

function blades(): Blade[] {
  return [
    // forehand: upper left -> lower right, bowed to the upper right
    { a: [-36, -30], c: [9, -12], b: [34, 30], w: 6.5, t0: 0, reveal: 0.05, hold: 0.04, life: 0.14 },
    // backhand: upper right -> lower left, bowed to the upper left, a beat later
    { a: [34, -32], c: [-9, -13], b: [-34, 28], w: 7, t0: 0.06, reveal: 0.05, hold: 0.04, life: 0.15 },
  ]
}

export function create(o: DaggerCrossOpts = {}) {
  const C = fit(o.palette ?? THIEF_STEEL, 8)
  const R = new Rng(o.seed ?? 7)
  const bs = blades()
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => Infinity, sparks: [C[7], C[6], C[5], C[3]] })
  // sparks fly off where the two cuts cross, and off the end of each cut
  for (let i = 0; i < 12; i++) {
    const a = R.range(0, Math.PI * 2), sp = R.range(50, 130)
    ps.spawn(P.SPARK, R.range(-2, 2), R.range(-4, 0), Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.1, 0.2), WHITE, 1, CROSS_T + R.range(0, 0.02))
  }
  for (const b of bs) {
    const dx = b.b[0] - b.c[0], dy = b.b[1] - b.c[1], l = Math.hypot(dx, dy)
    for (let i = 0; i < 4; i++) {
      const sp = R.range(40, 90)
      ps.spawn(P.SPARK, b.b[0] * 0.85, b.b[1] * 0.85, (dx / l) * sp + R.range(-20, 20), (dy / l) * sp + R.range(-20, 20), R.range(0.08, 0.15), WHITE, 1, b.t0 + b.reveal * 0.9)
    }
  }
  lights.add(0, -2, 34, C[4], 0.4, 0.14)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: PainterLike) {
      for (const b of bs) drawBlade(p, b, t, C)
      const k = seg(t, CROSS_T - 0.01, CROSS_T + 0.01) * (1 - smooth(CROSS_T + 0.02, CROSS_T + 0.12, t))
      glint(p, 0, -2, 11, C, k)
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
