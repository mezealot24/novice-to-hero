// ⚔️ ปลุกดาบ lasting aura (loop, 0.8 s): a flat gold glow ring pulses at the feet, thin gold flame tongues lick up
// round the hero and fade, and a few motes drift higher. Seamless: everything rides `cycle` / whole sine periods.
// Origin = the ground under the hero.
import { TAU, WHITE, cycle, fit, Rng } from '../../../vendor/pixelfx/core/index.js'
import { BLADE_GOLD } from './_pal'

export interface AwakenAuraOpts {
  palette?: string[]
  seed?: number
}

interface Painter {
  dot(x: number, y: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
}

export const meta = {
  name: 'Awaken aura',
  desc: 'A flat gold ring pulses at the feet, gold flame tongues lick up around the body and motes drift up.',
  tags: ['swordsman', 'buff', 'aura', 'gold', 'loop'],
  size: [96, 104] as number[],
  origin: [48, 92] as number[],
  duration: 0.8,
  loop: true,
  fps: 20,
  bg: 'dark',
  options: { palette: BLADE_GOLD, seed: 2 },
}

const RX = 26, RY = 7

export function draw(p: Painter, t: number, o: AwakenAuraOpts): void {
  const C = fit(o.palette ?? BLADE_GOLD, 8) as number[], seed = o.seed ?? 2, D = meta.duration, ph = t / D
  // pulsing ground ring (2 pulses per loop)
  const pulse = 0.5 + 0.5 * Math.sin(ph * TAU * 2)
  for (let i = 0; i < 128; i++) {
    const a = (i / 128) * TAU, r = 1 + 0.08 * pulse
    p.dot(Math.cos(a) * RX * r, Math.sin(a) * RY * r, Math.sin(a) > 0 ? C[6] : C[3], 0.6 + 0.35 * pulse)
    if (Math.sin(a) > 0) p.dot(Math.cos(a) * RX * r * 0.94, Math.sin(a) * RY * r * 0.8, C[4], 0.5 + 0.3 * pulse)
  }
  p.glow(0, -2, 22, C[4], 0.18 + 0.12 * pulse)
  // flame tongues: rise from the ring, narrow, sway, fade
  cycle(t, D, 14, seed, (g: Rng) => g.range(0.35, 0.55), (age: number, life: number, r: Rng) => {
    const u = age / life, a = r.range(0, TAU), x0 = Math.cos(a) * RX * 0.9, y0 = Math.sin(a) * RY
    const h = r.range(22, 40), front = Math.sin(a) > 0
    for (let j = 0; j < 10; j++) {
      const v = j / 10, y = y0 - u * h - v * 10, x = x0 + Math.sin(u * 5 + v * 2 + a) * 2
      const k = (1 - u) * (1 - v)
      if (k < 0.08) continue
      const c = v < 0.25 && u < 0.4 ? (front ? WHITE : C[6]) : v < 0.6 ? C[5] : C[4]
      p.dot(x, y, c, k); if (v < 0.5) p.dot(x + 1, y, v < 0.25 ? C[5] : C[3], k * 0.8)
    }
  })
  // motes
  cycle(t, D, 6, seed + 9, (g: Rng) => g.range(0.5, 0.8), (age: number, life: number, r: Rng) => {
    const u = age / life
    p.dot(r.range(-22, 22) + Math.sin(u * 4) * 2, -8 - u * r.range(40, 70), u < 0.25 ? WHITE : C[5], 1 - u)
  })
}
