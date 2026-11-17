// Thief Skill 2 ระเบิดควัน: a pellet hits the floor with a flash, and a thick ring of grey-violet smoke billows out and
// up around the feet, a few glints twinkling inside it, then thins away. Origin = the feet.
import { Rng, WHITE, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { type PainterLike, glint } from './_blade'

export interface SmokeBombOpts {
  palette?: string[]
  seed?: number
}

/** Cool grey with a violet cast. */
export const SMOKE_GREY = ['#0e0c14', '#24202e', '#3c3648', '#5a5368', '#7d768c', '#a39db0', '#cdc9d6', '#f2f0f6']

export const meta = {
  name: 'Smoke bomb',
  desc: 'A pellet pops on the floor with a flash; a ring of grey-violet smoke billows out and up around the feet with a few glints, then thins away.',
  tags: ['thief', 'smoke', 'evade', 'buff', 'one-shot'],
  size: [160, 128] as number[],
  origin: [80, 112] as number[],
  duration: 0.8,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: SMOKE_GREY, seed: 3 },
}

interface Puff { a: number; dist: number; rise: number; r: number; t0: number; life: number; shade: number }

export function create(o: SmokeBombOpts = {}) {
  const C = fit(o.palette ?? SMOKE_GREY, 8)
  const R = new Rng(o.seed ?? 3)
  const puffs: Puff[] = []
  for (let i = 0; i < 22; i++) {
    const a = R.range(-Math.PI, 0) // upper half: out along the floor and up
    puffs.push({ a, dist: R.range(28, 54), rise: R.range(4, 22), r: R.range(8, 13), t0: R.range(0, 0.08), life: R.range(0.5, 0.68), shade: R.int(2, 4) })
  }
  puffs.sort((p, q) => q.rise - p.rise) // higher (further back) puffs first
  const stars: [number, number, number][] = [[-24, -26, 0.16], [16, -38, 0.24], [34, -18, 0.32]]
  let t = 0

  return {
    update(dt: number) { t += dt },
    draw(p: PainterLike) {
      // the pop: a white flash on the floor
      const f = 1 - smooth(0, 0.08, t)
      if (f > 0.01) { p.glow(0, -6, 26, WHITE, 0.6 * f); p.disc(0, -4, 6 * (1 + (1 - f)), C[7], f) }
      for (const q of puffs) {
        const k = seg(t, q.t0, q.t0 + q.life)
        if (k <= 0 || k >= 1) continue
        const m = ease.outCubic(k)
        const x = Math.cos(q.a) * q.dist * m * 1.15, y = -6 + Math.sin(q.a) * q.dist * m * 0.3 - q.rise * m
        const r = q.r * (0.45 + 0.75 * m) * (1 - 0.35 * smooth(0.6, 1, k))
        const a = Math.min(1, k * 8) * (1 - smooth(0.45, 1, k))
        p.disc(x, y, r + 1, C[q.shade - 2], a * 0.9) // dark rim
        p.disc(x, y, r, C[q.shade], a)
        p.disc(x - r * 0.3, y - r * 0.3, r * 0.55, C[q.shade + 1], a) // lit top-left
      }
      for (const [x, y, t0] of stars) glint(p, x, y, 5, C, seg(t, t0, t0 + 0.04) * (1 - smooth(t0 + 0.06, t0 + 0.16, t)))
    },
  }
}
