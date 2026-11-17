// Thief poison stab (Skill 1 ฟันอาบพิษ · แผลเหวอะ): a needle-thin thrust pierces left to right, then venom bursts out at
// the tip: droplets arc out and fall, a small toxic ring opens, and a green haze lingers for a moment.
import { Lights, P, Particles, Rng, WHITE, clamp, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import type { PainterLike } from './_blade'

export interface VenomStabOpts {
  palette?: string[]
  seed?: number
}

/** Toxic green (dark -> lime -> white). */
export const VENOM_GREEN = ['#0b1a08', '#17380f', '#2b6a1a', '#4ca028', '#8ad83a', '#c4f56a', '#eaffb0', '#ffffff']

export const meta = {
  name: 'Venom stab',
  desc: 'A needle-thin thrust pierces left to right; venom bursts at the tip with arcing droplets, a toxic ring and a short green haze.',
  tags: ['thief', 'dagger', 'stab', 'poison', 'one-shot'],
  size: [128, 96] as number[],
  origin: [56, 50] as number[],
  duration: 0.5,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: VENOM_GREEN, seed: 5 },
}

const X0 = -30 // thrust starts here
const TIP = 34 // and stops here (the impact point)
const HIT_T = 0.05

interface Drop { x: number; y: number; vx: number; vy: number; r: number; life: number }

export function create(o: VenomStabOpts = {}) {
  const C = fit(o.palette ?? VENOM_GREEN, 8)
  const R = new Rng(o.seed ?? 5)
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => Infinity, sparks: [C[7], C[6], C[5], C[4]] })
  for (let i = 0; i < 10; i++) {
    const a = R.range(-1.1, 1.1), sp = R.range(60, 120)
    ps.spawn(P.SPARK, TIP, 0, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.08, 0.16), WHITE, 1, HIT_T)
  }
  const drops: Drop[] = []
  for (let i = 0; i < 14; i++) {
    const a = R.range(-2.4, 0.6), sp = R.range(35, 85) // mostly up and forward, a few back
    drops.push({ x: TIP + R.range(-3, 3), y: R.range(-3, 3), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: R.range(1.2, 2.6), life: R.range(0.25, 0.4) })
  }
  lights.add(TIP, 0, 30, C[5], 0.5, 0.2)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: PainterLike) {
      // green haze around the wound
      const hz = smooth(HIT_T, HIT_T + 0.08, t) * (1 - smooth(0.25, 0.48, t))
      if (hz > 0.01) { p.glow(TIP, 2, 22, C[3], 0.35 * hz); p.disc(TIP, 2, 10 + 6 * hz, C[2], 0.18 * hz) }
      // the thrust: thick at the back, a needle at the tip; the tail is pulled back out after the hit
      const head = ease.outExpo(seg(t, 0, HIT_T))
      const pull = ease.inQuad(seg(t, HIT_T + 0.05, HIT_T + 0.16))
      if (head > 0 && pull < 1) {
        const hx = X0 + (TIP + 6 - X0) * head, tx = X0 + (hx - X0) * pull
        for (let x = tx; x <= hx; x += 0.5) {
          const u = clamp((x - X0) / (TIP + 6 - X0))
          const half = 2.4 * Math.pow(1 - u, 0.6) * (1 - pull * 0.6) + 0.4
          const a = (1 - pull * 0.5) * Math.pow(u, 0.8) // a speed streak: faint at the back, solid at the point
          for (let y = -half - 1; y <= half + 1; y += 0.5) {
            const ay = Math.abs(y), v = ay / half
            const c = ay > half ? C[2] : v < 0.4 ? WHITE : v < 0.75 ? C[6] : C[4]
            p.dot(x, y, c, a)
          }
        }
        p.glow(hx, 0, 8, C[6], 0.5 * (1 - pull))
      }
      // toxic ring opening at the tip
      const rk = seg(t, HIT_T, HIT_T + 0.2)
      if (rk > 0 && rk < 1) {
        const rr = 4 + 18 * ease.outCubic(rk), a = 1 - rk
        for (let i = 0; i < 48; i++) {
          const an = (i / 48) * Math.PI * 2
          p.dot(TIP + Math.cos(an) * rr, Math.sin(an) * rr * 0.75, i % 3 === 0 ? C[6] : C[4], a)
        }
      }
      // venom droplets: arc out, fall under gravity, shrink away
      for (const d of drops) {
        const k = seg(t, HIT_T, HIT_T + d.life)
        if (k <= 0 || k >= 1) continue
        const s = t - HIT_T, x = d.x + d.vx * s, y = d.y + d.vy * s + 160 * s * s, r = d.r * (1 - k * 0.6)
        p.disc(x, y, r + 0.6, C[2], 1 - k)
        p.disc(x - 0.3, y - 0.3, r, C[4], 1 - k)
        p.dot(x - r * 0.4, y - r * 0.4, C[6], 1 - k)
      }
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
