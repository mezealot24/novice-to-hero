// Cleanse: a cold ring opens at the hero's feet (flat, 2 px, dithering out as it grows), broken chain links flick off
// to both sides and bright motes rise. Origin = the ground under the hero. One-shot, 0.65 s.
import { TAU, WHITE, ease, fit, rng, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { SEAL_BLUE } from './_pal'

export interface CleanseOpts {
  palette?: string[]
  seed?: number
}

interface Painter {
  dot(x: number, y: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
}

export const meta = {
  name: 'Cleanse',
  desc: 'A cold flat ring opens at the feet and dithers out; chain links flick off both sides and motes rise.',
  tags: ['swordsman', 'cleanse', 'purify', 'ground', 'one-shot'],
  size: [128, 96] as number[],
  origin: [64, 76] as number[],
  duration: 0.65,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: SEAL_BLUE, seed: 4 },
}

/** One small chain link (a 4x3 hollow oval). */
function link(p: Painter, x: number, y: number, c: number, a: number) {
  for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-2, 0], [2, 0], [-1, 1], [0, 1], [1, 1]]) p.dot(x + dx, y + dy, c, a)
}

export function draw(p: Painter, t: number, o: CleanseOpts): void {
  const C = fit(o.palette ?? SEAL_BLUE, 8) as number[], seed = o.seed ?? 4
  // ring
  const k = ease.outQuart(seg(t, 0, 0.45)), fade = 1 - smooth(0.25, 0.55, t)
  if (fade > 0.02) {
    const rx = 10 + 42 * k, ry = rx * 0.26
    for (let i = 0; i < 220; i++) {
      const a = (i / 220) * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry
      p.dot(x, y, Math.sin(a) > 0 ? C[6] : C[4], fade)
      p.dot(x * 0.96, y * 0.9 - 1, C[5], fade * 0.8)
      p.dot(x * 0.92, y * 0.82 - 1, C[3], fade * 0.5)
    }
    p.glow(0, -2, 20, C[5], 0.6 * (1 - k))
    const fl = 1 - smooth(0, 0.1, t)
    for (let y = -26; y <= 0; y++) p.dot(0, y, WHITE, fl * (1 + y / 27)), p.dot(-1, y, C[6], fl * 0.7 * (1 + y / 27)), p.dot(1, y, C[6], fl * 0.7 * (1 + y / 27))
  }
  // chain links thrown off
  for (let i = 0; i < 6; i++) {
    const g = rng(seed, i), side = i % 2 ? 1 : -1, vx = side * g.range(50, 90), vy = -g.range(60, 110), d = g.range(0, 0.05)
    const age = t - d
    if (age <= 0) continue
    const lk = 1 - smooth(0.2, 0.4, age)
    if (lk > 0.02) { const x = vx * age, y = -14 + vy * age + 260 * age * age; link(p, x, y, i % 3 ? C[6] : C[5], lk); link(p, x + 3 * Math.sign(vx), y + 2, C[4], lk) }
  }
  // rising motes
  for (let i = 0; i < 20; i++) {
    const g = rng(seed + 7, i), x = g.range(-34, 34), d = g.range(0.02, 0.2), life = g.range(0.3, 0.45), age = t - d
    if (age <= 0 || age >= life) continue
    const u = age / life
    p.dot(x + Math.sin(u * 6 + i) * 2, -2 - u * g.range(30, 56), u < 0.3 ? WHITE : C[5], 1 - u)
  }
}
