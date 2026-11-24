// Berserker Ultimate บ้าระห่ำ / Warlord Undying Bloodlust (one-shot, 0.72 s): a crimson shockwave ring slamming along
// the floor, a violent jagged crimson energy pillar rising from the feet, a big crossed X-slash burst at chest height,
// and rising hot embers. Origin = ground under the hero.
import { Lights, P, Particles, Rng, TAU, WHITE, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { type Blade, type PainterLike, drawBlade, glint } from '../thief/_blade'
import { BLOOD_CRIMSON } from './_pal'

export interface RampageBurstOpts {
  palette?: string[]
  seed?: number
}

export const meta = {
  name: 'Rampage burst',
  desc: 'Crimson ground shockwave, jagged blood-energy pillar, crossed X-slash burst and rising embers.',
  tags: ['swordsman', 'berserker', 'warlord', 'ult', 'burst', 'one-shot'],
  size: [168, 168] as number[],
  origin: [84, 148] as number[],
  duration: 0.72,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: BLOOD_CRIMSON, seed: 31 },
}

const BURST_T = 0.07

export function create(o: RampageBurstOpts = {}) {
  const C = fit(o.palette ?? BLOOD_CRIMSON, 8)
  const R = new Rng(o.seed ?? 31)
  const x1: Blade = { a: [-46, -86], c: [14, -64], b: [44, -18], w: 12, t0: 0.03, reveal: 0.07, hold: 0.05, life: 0.22 }
  const x2: Blade = { a: [46, -88], c: [-14, -64], b: [-44, -18], w: 12, t0: 0.07, reveal: 0.07, hold: 0.05, life: 0.22 }
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => 2, sparks: [C[7], C[6], C[5], C[3]] })
  for (let i = 0; i < 24; i++) {
    const x = R.range(-24, 24), vx = R.range(-36, 36), vy = -R.range(75, 165)
    ps.spawn(P.SPARK, x, -4, vx, vy, R.range(0.18, 0.34), i < 7 ? WHITE : C[6], 1, BURST_T + R.range(0, 0.08))
  }
  lights.add(0, -48, 58, C[4], 0.6, 0.32)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: PainterLike) {
      // crimson floor shockwave ring
      const rk = ease.outQuart(seg(t, BURST_T, BURST_T + 0.42)), rf = 1 - smooth(BURST_T + 0.22, BURST_T + 0.48, t)
      if (rk > 0 && rf > 0.02) {
        const rx = 12 + 56 * rk, ry = rx * 0.24
        for (let i = 0; i < 140; i++) {
          const th = (i / 140) * TAU, x = Math.cos(th) * rx, y = Math.sin(th) * ry
          p.dot(x, y, Math.sin(th) > 0 ? C[6] : C[4], rf)
          p.dot(x * 0.92, y * 0.85 - 1, C[5], rf * 0.75)
        }
      }
      // jagged crimson energy pillar
      const pf = 1 - smooth(0.32, 0.60, t), pk = ease.outExpo(seg(t, 0, 0.14))
      if (pf > 0.02 && pk > 0) {
        const H = Math.round(122 * pk)
        for (let y = 0; y >= -H; y--) {
          const u = -y / 122
          const half = (1 - u * 0.65) * (16 + Math.sin(u * 12 + t * 24) * 3)
          const W = Math.max(1, Math.round(half))
          for (let x = -W; x <= W; x++) {
            const v = Math.abs(x) / Math.max(1, W)
            p.dot(x, y, v < 0.22 ? WHITE : v < 0.55 ? C[6] : v < 0.82 ? C[4] : C[2], pf * (1 - u * 0.4))
          }
        }
      }
      drawBlade(p, x1, t, C)
      drawBlade(p, x2, t, C)
      const fl = seg(t, BURST_T, BURST_T + 0.02) * (1 - smooth(BURST_T + 0.04, BURST_T + 0.18, t))
      glint(p, 0, -52, 16, C, fl)
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
