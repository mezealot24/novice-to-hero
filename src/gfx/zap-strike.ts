// Tall, instantaneous sky-to-ground lightning strike module for pixelfx (matches lightningStrike TOP height, ~0.30s snappy flash).
import { Lights, P, Particles, Rng, TAU, WHITE, clamp, fit, rng } from '../vendor/pixelfx/core/index.js'
import { PLASMA, VOLT, bend, crackle, stroke, trace, zigzag } from '../vendor/pixelfx/fx/lightning/_lib.js'

export interface ZapStrikeOpts {
  palette?: string[]
  sparks?: string[]
  seed?: number
}

interface BoltPath {
  w: number
  pts: number[][]
}

interface BoltShape {
  paths: BoltPath[]
}

interface PainterLike {
  px(x: number, y: number, c: number): void
  circle(x: number, y: number, r: number, c: number): void
  glow(x: number, y: number, r: number, c: number, a?: number): void
}

export const meta = {
  name: 'Zap strike',
  desc: 'An instantaneous high-altitude lightning bolt snapping down from the sky to strike a single target and rapidly dissipating.',
  tags: ['lightning', 'electric', 'strike', 'zap', 'one-shot'],
  size: [144, 264] as number[],
  origin: [72, 228] as number[],
  duration: 0.3,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: VOLT, sparks: PLASMA, seed: 7 },
}

const W = 70
const TOP = -224
const HIT_Y = -12
const FLICK = [1, 0.95, 0.55, 0.85, 0.35, 0.15, 0]

/** Keep fork endpoints inside the baked frame bounds above ground. */
function keepInFrame(b: BoltShape): BoltShape {
  const paths: BoltPath[] = []
  for (const q of b.paths) {
    const pts: number[][] = []
    for (const pt of q.pts) {
      if (Math.abs(pt[0]) > W - 4 || pt[1] > 8 || pt[1] < TOP + 2) break
      pts.push(pt)
    }
    if (q.w >= 1 || pts.length > 3) paths.push({ w: q.w, pts: q.w >= 1 ? b.paths[0].pts : pts })
  }
  return { paths }
}

export function create(o: ZapStrikeOpts = {}) {
  const C = fit(o.palette ?? VOLT, 8)
  const sparkRamp = o.sparks ?? PLASMA
  const seed = o.seed ?? 7
  const R = new Rng(seed)
  const floor = () => 0
  const ps = new Particles({ rng: R, ground: floor, sparks: sparkRamp })
  const lights = new Lights()

  const X0 = R.range(10, 22) * (R.chance(0.5) ? 1 : -1)
  const main = keepInFrame(zigzag(R, X0, TOP, 0, HIT_Y, 0.14, 0.38) as unknown as BoltShape)
  const trunk = main.paths[0].pts
  const drift = (dx: number) => (x: number, y: number) => [x + dx * Math.sin((Math.PI * y) / TOP), y]
  const bolts: BoltShape[] = [
    main,
    bend({ paths: [{ pts: trunk, w: 1 }] }, drift(2)) as unknown as BoltShape,
    bend({ paths: [{ pts: trunk, w: 1 }] }, drift(-1.8)) as unknown as BoltShape,
  ]

  let t = 0
  let burstDone = false

  const emitBurst = () => {
    burstDone = true
    lights.add(0, -40, 90, C[4], 0.7, 0.16)
    lights.add(0, HIT_Y, 22, WHITE, 0.65, 0.08)
    for (let j = 0; j < 22; j++) {
      const a = R.chance(0.65) ? -Math.PI / 2 + R.range(-1.25, 1.25) : R.range(0, TAU)
      const sp = R.range(90, 240)
      ps.spawn(P.SPARK, R.range(-3, 3), HIT_Y + R.range(-3, 4), Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.12, 0.26))
    }
  }

  return {
    update(dt: number) {
      if (!burstDone) emitBurst()
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    drawBack(p: PainterLike) {
      ps.draw(p, 'back')
    },
    draw(p: PainterLike) {
      const idx = Math.min(FLICK.length - 1, Math.floor(t * 20 + 1e-4))
      const k = t < 0.025 ? 1 : (FLICK[idx] ?? 0)
      const f = Math.floor(t * 30 + 1e-4)

      if (t < 0.22 && k > 0.05) {
        const bolt = bolts[idx % bolts.length]
        const hero = t < 0.06 || idx === 3
        stroke(p, bolt, k, C, 1.35, { hero, core: hero ? 1.15 : 0.7, minY: TOP + 12 })

        // Bright impact knot + brief snapping crackles around hit target
        const r = 4.2 * k
        p.circle(0, HIT_Y, r + 1.4, C[3])
        p.circle(0, HIT_Y, r + 0.4, C[5])
        p.circle(0, HIT_Y, r * 0.6, WHITE)
        p.glow(0, HIT_Y, 24, C[4], 0.55 * k)

        if (t < 0.16) {
          const r2 = rng(seed, 19, f)
          const count = t < 0.08 ? 4 : 2
          for (let i = 0; i < count; i++) {
            const ang = r2.range(0, TAU)
            const d0 = r2.range(2, 6)
            const d1 = r2.range(10, 20)
            crackle(
              p,
              zigzag(r2, Math.cos(ang) * d0, HIT_Y + Math.sin(ang) * d0, Math.cos(ang) * d1, HIT_Y + Math.sin(ang) * d1, 0.42, 0),
              0.85 * k,
              C,
              0.3,
            )
          }
        }
      } else if (t < meta.duration) {
        // Rapid cooling channel trace + final fade
        const fade = clamp(1 - (t - 0.2) / 0.1)
        const tr = bolts[0].paths[0].pts
        if (fade > 0.05) {
          trace(p, tr, fade > 0.5 ? C[4] : C[2], fade * 0.85)
          p.glow(0, HIT_Y, 12 * fade, C[3], 0.35 * fade)
        }
      }

      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
