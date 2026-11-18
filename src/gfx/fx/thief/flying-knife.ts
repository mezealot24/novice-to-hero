// Rogue 🌪️ พายุมีด: one thrown dagger in flight, point first (to the right), a gold wind streak and speed lines behind it.
// Looping: the battle rotates it at its target, moves it there and destroys it on arrival.
import { Rng, TAU, cycle, fit } from '../../../vendor/pixelfx/core/index.js'
import { KNIFE_STEEL, type KnifePainter, drawKnife } from './_knife'

export interface FlyingKnifeOpts {
  palette?: string[]
  seed?: number
}

interface Painter extends KnifePainter {
  blendPx(sx: number, sy: number, c: number, a: number): void
  each(x0: number, y0: number, x1: number, y1: number, fn: (lx: number, ly: number, sx: number, sy: number) => void): void
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void
}

/** Rogue gold (same as ROGUE_GOLD in pixelfx.ts). */
export const KNIFE_GOLD = ['#1e1204', '#4a2e08', '#8a5a12', '#c88a1e', '#ffd36b', '#ffe8a8', '#fff8e0', '#ffffff']

export const meta = {
  name: 'Flying knife',
  desc: 'A throwing dagger flying right point-first, a gold wind streak, speed lines and glints shed behind it.',
  tags: ['thief', 'rogue', 'knife', 'projectile', 'directional', 'loop'],
  size: [96, 28] as number[],
  origin: [84, 14] as number[],
  duration: 0.3,
  loop: true,
  fps: 30,
  bg: 'dark',
  options: { palette: KNIFE_GOLD, seed: 11 },
}

const LEN = 20

export function draw(p: Painter, t: number, o: FlyingKnifeOpts): void {
  const G = fit(o.palette ?? KNIFE_GOLD, 8) as number[]
  const S = fit(KNIFE_STEEL, 8) as number[]
  const D = meta.duration, ph = t / D, seed = o.seed ?? 11
  // wind streak: a gold ribbon tapering behind the pommel
  const X1 = -LEN + 2, X0 = -80
  p.each(X0, -6, X1, 6, (lx, ly, sx, sy) => {
    const u = (X1 - lx) / (X1 - X0), w = 2.6 * (1 - u) ** 0.8 + 0.4 + 0.6 * Math.sin(u * 10 - ph * TAU * 2) * u
    const v = Math.abs(ly) / w
    if (v >= 1) return
    const a = (1 - v * v) * (1 - u) ** 1.4
    if (a < 0.05) return
    p.blendPx(sx, sy, v < 0.3 && u < 0.3 ? G[6] : v < 0.65 ? G[5] : G[4], a * 0.6)
  })
  p.glowLine(-LEN - 34, 0, -LEN, 0, 6, G[4], 0.12)
  // speed lines streaming past
  cycle(t, D, 7, seed + 3, (g: Rng) => g.range(0.1, 0.16), (age: number, life: number, r: Rng) => {
    const y = r.sign() * r.range(3.5, 9), x = r.range(-18, 0) - age * r.range(300, 380), l = r.range(6, 13), k = age / life
    for (let i = 0; i <= l; i++) p.dot(x + i, y, i > l * 0.7 ? G[6] : G[4], (i / l) * (1 - k))
  })
  p.glow(-4, 0, 10, G[5], 0.14)
  drawKnife(p, 0, 0, 0, LEN, S, G)
}
