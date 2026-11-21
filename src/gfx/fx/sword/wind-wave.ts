// 🌊 คลื่นดาบ in flight (loop, 0.3 s): a tall crescent of cutting wind, convex side forward (facing right), white-hot
// edge, two fainter afterimage crescents lagging behind, wind streaks pouring off the back and speed lines.
// The battle moves it across the field and destroys it. Origin = the crescent's middle.
import { Rng, TAU, WHITE, cycle, fit } from '../../../vendor/pixelfx/core/index.js'
import { type Blade, type PainterLike, drawBlade } from '../thief/_blade'
import { WAVE_JADE } from './_pal'

export interface WindWaveOpts {
  palette?: string[]
  seed?: number
}

export const meta = {
  name: 'Wind wave',
  desc: 'A tall crescent of cutting wind flying right, convex edge forward, afterimages and wind streaks behind it.',
  tags: ['swordsman', 'wind', 'wave', 'projectile', 'directional', 'loop'],
  size: [128, 120] as number[],
  origin: [92, 60] as number[],
  duration: 0.3,
  loop: true,
  fps: 20,
  bg: 'dark',
  options: { palette: WAVE_JADE, seed: 6 },
}

/** A crescent drawn fully (t0 far in the past, never erased). */
const still = (dx: number, w: number): Blade => ({ a: [dx - 14, -50], c: [dx + 26, 0], b: [dx - 14, 50], w, t0: -10, reveal: 0.01, hold: 1e6, life: 1 })

export function draw(p: PainterLike, t: number, o: WindWaveOpts): void {
  const C = fit(o.palette ?? WAVE_JADE, 8) as number[], seed = o.seed ?? 6, D = meta.duration, ph = t / D
  // wind streaks pouring off the back of the crescent
  cycle(t, D, 14, seed, (g: Rng) => g.range(0.12, 0.2), (age: number, life: number, r: Rng) => {
    const y = r.range(-44, 44), x0 = 4 - Math.abs(y) * 0.3 - age * r.range(260, 340), l = r.range(8, 18), k = 1 - age / life
    for (let i = 0; i <= l; i++) p.dot(x0 - i, y + Math.sin((x0 - i) * 0.15 + ph * TAU) * 1.5, i < 3 ? C[6] : C[4], k * (1 - i / l))
  })
  drawBlade(p, still(-26, 9), 0, C, { ghost: true, alpha: 0.35 })
  drawBlade(p, still(-13, 11), 0, C, { ghost: true, alpha: 0.6 })
  drawBlade(p, still(0, 13 + Math.sin(ph * TAU) * 1), 0, C)
  // glints running along the edge
  for (let i = 0; i < 3; i++) {
    const u = ((ph + i / 3) % 1) * 2 - 1, y = u * 44, x = 26 * (1 - u * u) - 4
    p.dot(x, y, WHITE, 1 - Math.abs(u))
    p.glow(x, y, 5, C[6], 0.35 * (1 - Math.abs(u)))
  }
}
