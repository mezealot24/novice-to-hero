// Rogue ult 🌪️ พายุมีด: a ring of daggers appears over the monsters and whirls round an ellipse, faster and tighter,
// with gold wind ribbons spinning with it. At IMPLODE_T the ring snaps into the middle: a star flash, a shock ring
// and a spray of sparks (the moment the battle starts throwing the knives). Origin = the ground under the storm.
import { Lights, P, Particles, Rng, TAU, WHITE, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { KNIFE_STEEL, type KnifePainter, drawKnife } from './_knife'
import { KNIFE_GOLD } from './flying-knife'
import { glint } from './_blade'

export interface KnifeStormOpts {
  palette?: string[]
  seed?: number
}

interface Painter extends KnifePainter {
  disc(cx: number, cy: number, r: number, c: number, a: number): void
  glowLine(x0: number, y0: number, x1: number, y1: number, r: number, c: number, k?: number): void
}

export const meta = {
  name: 'Knife storm',
  desc: 'A ring of daggers whirls round an ellipse with gold wind ribbons, faster and tighter, then snaps into the middle in a star flash, a shock ring and sparks.',
  tags: ['thief', 'rogue', 'knife', 'vortex', 'ultimate', 'one-shot'],
  size: [264, 176] as number[],
  origin: [132, 156] as number[],
  duration: 0.95,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: KNIFE_GOLD, seed: 21 },
}

/** Seconds of the effect's own time when the ring collapses (the battle syncs the first throw to it). */
export const IMPLODE_T = 0.56

const N = 10 // daggers in the ring
const CY = -62, RX = 96, RY = 24, LEN = 18

/** Spin angle (radians) at t: slow start, accelerating whirl. */
const spin = (t: number) => TAU * (0.55 * t + 2.4 * t * t)
/** Ring radius factor: holds, then tightens to the middle by the implode. */
const radius = (t: number) => 1 - 0.82 * ease.inCubic(seg(t, 0.12, IMPLODE_T))
/** The ring rises a little as it spins up. */
const lift = (t: number) => CY - 10 * ease.outQuad(seg(t, 0, IMPLODE_T))

function onRing(i: number, t: number, back = 0) {
  const th = (i / N) * TAU + spin(t) - back, r = radius(t)
  const x = Math.cos(th) * RX * r, y = lift(t) + Math.sin(th) * RY * r
  const ang = Math.atan2(Math.cos(th) * RY, -Math.sin(th) * RX) // tangent: the way the dagger is moving
  return { x, y, ang, front: Math.sin(th) > 0 }
}

export function create(o: KnifeStormOpts = {}) {
  const G = fit(o.palette ?? KNIFE_GOLD, 8) as number[]
  const S = fit(KNIFE_STEEL, 8) as number[]
  const R = new Rng(o.seed ?? 21)
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => Infinity, sparks: [G[7], G[6], G[5], G[4]] })
  const cy = lift(IMPLODE_T)
  // the collapse: sparks thrown out flat (squashed like the ring), a few steel shards among them
  for (let i = 0; i < 30; i++) {
    const a = R.range(0, TAU), sp = R.range(70, 170)
    ps.spawn(P.SPARK, R.range(-3, 3), cy + R.range(-2, 2), Math.cos(a) * sp, Math.sin(a) * sp * 0.45, R.range(0.12, 0.26), i % 5 === 0 ? S[6] : WHITE, 1, IMPLODE_T + R.range(0, 0.03))
  }
  // glints shed off the ring while it spins
  for (let i = 0; i < 16; i++) {
    const t0 = R.range(0.1, IMPLODE_T - 0.05), q = onRing(R.int(0, N - 1), t0)
    ps.spawn(P.SPARK, q.x, q.y, R.range(-20, 20), R.range(-30, -8), R.range(0.1, 0.18), G[6], 1, t0)
  }
  lights.add(0, cy, 70, G[4], 0.3, 0.3)
  let t = 0, lit = false

  return {
    update(dt: number) {
      t += dt
      if (!lit && t >= IMPLODE_T) { lit = true; lights.add(0, cy, 70, G[5], 0.8, 0.25) }
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: Painter) {
      const show = seg(t, 0, 0.1) * (1 - smooth(IMPLODE_T - 0.03, IMPLODE_T + 0.01, t))
      const cyNow = lift(t), rNow = radius(t)
      // shadow pool on the ground under the storm
      const pool = 0.35 * seg(t, 0, 0.15) * (1 - smooth(IMPLODE_T, 0.9, t))
      for (let k = 0; k < 5; k++) p.disc((k - 2) * 18 * (0.5 + rNow * 0.5), -2, 12 - Math.abs(k - 2) * 2, G[0], pool)
      // wind ribbons: three arcs round the ring, spinning a touch faster than it
      if (show > 0) {
        for (let w = 0; w < 3; w++) {
          const rr = rNow * (1.18 - w * 0.2), a0 = spin(t) * 1.15 + w * 2.1
          for (let i = 0; i <= 46; i++) {
            const u = i / 46, th = a0 + u * 1.9
            const x = Math.cos(th) * RX * rr, y = cyNow + Math.sin(th) * RY * rr * 1.1
            p.dot(x, y, u > 0.8 ? G[6] : u > 0.4 ? G[5] : G[3], show * 0.55 * Math.sin(Math.PI * u))
          }
        }
        // daggers: the back half first (dimmer), then the front half, each with a short trail along its path
        for (const front of [false, true]) {
          for (let i = 0; i < N; i++) {
            const q = onRing(i, t)
            if (q.front !== front) continue
            const a = show * seg(t, i * 0.012, i * 0.012 + 0.08) * (front ? 1 : 0.6)
            for (let k = 1; k <= 6; k++) {
              const b = onRing(i, t, k * 0.07)
              p.dot(b.x, b.y, k < 3 ? G[5] : G[3], a * (1 - k / 7) * 0.8)
            }
            drawKnife(p, q.x, q.y, q.ang, LEN, S, G, a)
          }
        }
        p.glow(0, cyNow, 30 * rNow + 10, G[4], 0.12 * show)
      }
      // the collapse: a big star flash, then a flat shock ring rolling outwards
      const f = seg(t, IMPLODE_T - 0.01, IMPLODE_T + 0.02) * (1 - smooth(IMPLODE_T + 0.04, IMPLODE_T + 0.2, t))
      if (f > 0) {
        glint(p, 0, cy, 24, G, f)
        p.glowLine(-60, cy, 60, cy, 6, G[6], 0.45 * f)
      }
      const sk = seg(t, IMPLODE_T, IMPLODE_T + 0.28)
      if (sk > 0 && sk < 1) {
        const rr = 8 + ease.outCubic(sk) * 110, a = 0.8 * (1 - sk)
        for (let i = 0; i < 120; i++) {
          const th = (i / 120) * TAU
          p.dot(Math.cos(th) * rr, cy + Math.sin(th) * rr * 0.24, i % 3 ? G[5] : WHITE, a)
        }
      }
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
