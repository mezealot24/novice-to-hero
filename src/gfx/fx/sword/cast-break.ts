// Cast cut: the monster's spell circle (a flat rune ring) cracks with white lines and bursts into arc shards that spin
// outward and fall, with sparks. Origin = the centre of the circle. One-shot, 0.55 s.
import { Lights, P, Particles, Rng, TAU, WHITE, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { SEAL_BLUE } from './_pal'

export interface CastBreakOpts {
  palette?: string[]
  seed?: number
}

interface Painter {
  dot(x: number, y: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
  line(x0: number, y0: number, x1: number, y1: number, c: number, a?: number): void
}

export const meta = {
  name: 'Cast break',
  desc: 'A flat spell circle cracks with white lines and bursts into spinning arc shards and sparks.',
  tags: ['swordsman', 'interrupt', 'break', 'magic', 'one-shot'],
  size: [136, 88] as number[],
  origin: [68, 44] as number[],
  duration: 0.55,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: SEAL_BLUE, seed: 9 },
}

const RX = 30, RY = 11, CRACK_T = 0.06, BURST_T = 0.12, N = 10

interface Shard { a0: number; a1: number; vx: number; vy: number; spin: number }

export function create(o: CastBreakOpts = {}) {
  const C = fit(o.palette ?? SEAL_BLUE, 8)
  const R = new Rng(o.seed ?? 9)
  const shards: Shard[] = []
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU + R.range(-0.08, 0.08), a1 = a0 + TAU / N - R.range(0.05, 0.15), m = (a0 + a1) / 2, sp = R.range(50, 95)
    shards.push({ a0, a1, vx: Math.cos(m) * sp, vy: Math.sin(m) * sp * 0.6 - R.range(10, 30), spin: R.range(-5, 5) })
  }
  const cracks = Array.from({ length: 5 }, () => R.range(0, TAU))
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => Infinity, sparks: [C[7], C[6], C[5], C[4]] })
  for (let i = 0; i < 16; i++) {
    const a = R.range(0, TAU), sp = R.range(40, 120)
    ps.spawn(P.SPARK, Math.cos(a) * RX * 0.5, Math.sin(a) * RY * 0.5, Math.cos(a) * sp, Math.sin(a) * sp * 0.6, R.range(0.12, 0.25), WHITE, 1, BURST_T)
  }
  lights.add(0, 0, 40, C[4], 0.5, 0.18)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: Painter) {
      if (t < BURST_T) { // whole circle, cracking
        for (let i = 0; i < 160; i++) {
          const a = (i / 160) * TAU, x = Math.cos(a) * RX, y = Math.sin(a) * RY
          p.dot(x, y, Math.sin(a) > 0 ? C[6] : C[4]); p.dot(x * 0.93, y * 0.9, C[3])
          if (i % 20 === 0) { p.dot(x * 0.8, y * 0.75, C[5]); p.dot(x * 0.75, y * 0.7, C[5]) } // rune ticks
        }
        for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; p.dot(Math.cos(a) * RX * 0.55, Math.sin(a) * RY * 0.55, C[4]) }
        const ck = seg(t, CRACK_T, BURST_T)
        for (const a of cracks) p.line(0, 0, Math.cos(a) * RX * ck, Math.sin(a) * RY * ck, WHITE, ck)
        p.glow(0, 0, 14, C[5], 0.4 + 0.4 * ck)
        return
      }
      const age = t - BURST_T, fade = 1 - smooth(0.2, 0.42, age)
      for (const s of shards) {
        const dx = s.vx * age, dy = s.vy * age + 120 * age * age, rot = s.spin * age, shrink = 1 - 0.4 * ease.inQuad(seg(age, 0, 0.42))
        for (let j = 0; j <= 6; j++) {
          const a = s.a0 + ((s.a1 - s.a0) * j) / 6 + rot
          const x = Math.cos(a) * RX * shrink + dx, y = Math.sin(a) * RY * shrink + dy
          p.dot(x, y, j === 3 ? WHITE : C[6], fade); p.dot(x, y + 1, C[4], fade)
        }
      }
      const fl = 1 - smooth(0, 0.08, age)
      p.glow(0, 0, 26, C[6], 0.8 * fl)
      for (let x = -RX; x <= RX; x++) p.dot(x, 0, WHITE, fl * (1 - Math.abs(x) / (RX + 1)))
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
