// Beastmaster rally: the "go get 'em" command / wolf howl. Broken sound-wave arcs fan out up and to the right,
// a ring of dust and leaves is kicked up around the feet, and paw prints pop in the wave under a soft warm glow.
import { Lights, Rng, TAU, WHITE, clamp, ease, fit, mix, rng, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { dustRing } from '../../../vendor/pixelfx/fx/impacts/_lib.js'

export interface BeastRoarOpts {
  palette?: string[]
  seed?: number
}

interface PainterLike {
  dot(x: number, y: number, c: number, a?: number): void
  circle(x: number, y: number, r: number, c: number, a?: number): void
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number, a?: number): void
  arc(cx: number, cy: number, r: number, w: number | ((u: number) => number), a0: number, a1: number, c: number | ((u: number, v: number) => number), a?: number | ((u: number, v: number) => number)): void
  glow(x: number, y: number, r: number, c: number, a?: number): void
  glowRing(x: number, y: number, R: number, r: number, c: number, k?: number): void
  blend(x: number, y: number, c: number, a: number): void
  disc(cx: number, cy: number, r: number, c: number, a?: number): void
}

interface Puff {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  t0: number
  life: number
}

export const ROAR_PALETTE = ['#0c2a1c', '#14472a', '#1f6e32', '#3c9a3a', '#7cc844', '#c4ec62', '#f4f8a8', '#ffffff']

export const meta = {
  name: 'Beast roar',
  desc: 'A rallying roar: broken sound-wave arcs fan out up and right, dust and leaves are kicked up around the feet, paw prints pop in the wave.',
  tags: ['beastmaster', 'roar', 'howl', 'command', 'buff', 'one-shot'],
  size: [160, 128] as number[],
  origin: [80, 112] as number[],
  duration: 0.7,
  loop: false,
  fps: 20,
  bg: 'ground',
  options: { palette: ROAR_PALETTE, seed: 41 },
}

// the howl comes from the muzzle, a little above and in front of the feet
const MX = 7
const MY = -27
const FAN0 = (-90 / 180) * Math.PI
const FAN1 = (22 / 180) * Math.PI

interface Wave {
  t0: number
  life: number
  r0: number
  r1: number
  th: number
  cuts: number[] // fractions of the fan where the arc breaks
}

interface Leaf {
  x: number
  y: number
  vx: number
  vy: number
  a: number
  va: number
  t0: number
  life: number
  tone: number
}

interface Paw {
  ang: number
  t0: number
  rad: number // distance from the muzzle
  size: number
}

/** A paw print: a pad and four toes, with a dark rim. */
function paw(p: PainterLike, x: number, y: number, rot: number, sc: number, k: number, C: number[]): void {
  const ca = Math.cos(rot)
  const sa = Math.sin(rot)
  const at = (u: number, v: number): [number, number] => [x + (u * ca - v * sa) * sc, y + (u * sa + v * ca) * sc]
  const toes: [number, number][] = [[-4.3, -0.4], [-1.75, -3.5], [1.75, -3.5], [4.3, -0.4]]
  for (const pass of [0, 1]) {
    const grow = pass === 0 ? 0.8 : 0
    const [px, py] = at(0, 2.6)
    p.ellipse(px, py, (3.1 + grow) * sc, (2.4 + grow) * sc, pass === 0 ? C[1] : C[7], k)
    for (const [u, v] of toes) {
      const [tx, ty] = at(u, v)
      p.circle(tx, ty, (1.25 + grow) * sc, pass === 0 ? C[1] : C[6], k)
    }
  }
  const [hx, hy] = at(-0.6, 2)
  p.circle(hx, hy, 0.9 * sc, C[5], k * 0.9)
}

export function create(o: BeastRoarOpts = {}) {
  const C = fit(o.palette ?? ROAR_PALETTE, 8)
  const seed = o.seed ?? 41
  const R = new Rng(seed)
  const lights = new Lights()
  const dust = mix(C[5], C[6], 0.4)

  const waves: Wave[] = [0, 1, 2, 3].map((i): Wave => {
    const r = rng(seed, 3, i)
    const c1 = 0.36 + r.range(-0.04, 0.08)
    const c2 = 0.7 + r.range(-0.05, 0.06)
    return { t0: 0.02 + i * 0.08, life: i === 3 ? 0.34 : 0.4, r0: 10 + i * 1.5, r1: 54 + i * 5.5 + (i === 3 ? 2 : 0), th: 6.4 - i * 0.6, cuts: i % 2 ? [c1 - 0.05, c2 + 0.04] : [c1 + 0.04, c2 - 0.03] }
  })
  const leaves: Leaf[] = []
  for (let i = 0; i < 16; i++) {
    const s = R.sign()
    const a = s > 0 ? -R.range(0.05, 1.1) : -Math.PI + R.range(0.05, 0.9)
    const sp = R.range(45, 120)
    leaves.push({ x: s * R.range(4, 16), y: -R.range(1, 4), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - R.range(10, 70), a: R.range(0, TAU), va: R.range(-12, 12), t0: R.range(0.02, 0.2), life: R.range(0.38, 0.52), tone: R.int(0, 2) })
  }
  // a little trail of prints climbing the fan, each pops in as a wave passes
  const paws: Paw[] = [
    { ang: -1.3, t0: 0.1, rad: 17, size: 1.3 },
    { ang: -0.9, t0: 0.16, rad: 31, size: 1.45 },
    { ang: -0.5, t0: 0.22, rad: 44, size: 1.35 },
    { ang: -0.12, t0: 0.28, rad: 54, size: 1.2 },
  ]
  const puffs: Puff[] = []
  for (let i = 0; i < 34; i++) {
    const sg = i % 2 ? 1 : -1
    puffs.push({ x: sg * R.range(2, 16), y: -R.range(0.5, 4), vx: sg * R.range(25, 120), vy: -R.range(2, 22), r: R.range(1.5, 3), t0: R.range(0, 0.12), life: R.range(0.34, 0.48) })
  }
  lights.add(MX, MY, 50, C[5], 0.5, 0.35)
  let t = 0

  const taperEcho = (q: number): number => Math.sin(Math.PI * clamp(q))
  const waveR = (w: Wave, u: number): number => w.r0 + (w.r1 - w.r0) * ease.outCubic(u)

  return {
    update(dt: number) {
      t += dt
      for (const l of leaves) {
        if (t < l.t0) continue
        l.vy += 330 * dt
        l.vx -= l.vx * 1.4 * dt
        l.x += l.vx * dt
        l.y += l.vy * dt
        l.a += l.va * dt
        if (l.y > -1) {
          l.y = -1
          l.vy *= -0.2
          l.vx *= 0.5
          l.va *= 0.4
        }
      }
      lights.update(dt)
    },
    drawBack(p: PainterLike) {
      // the ring of dust on the ground, far half behind everything
      const g = clamp(t / 0.5)
      if (g > 0 && g < 1) {
        const k = g < 0.55 ? 0.8 : (1 - g) / 0.45 * 0.8
        dustRing(p, 0, -1, 6 + 58 * ease.outCubic(g), 8 * (1 - 0.35 * g), k, dust, { sy: 0.26, ph: 0.8, brk: g * 0.75, lit: 0.45, maxY: 15, half: -1 })
      }
    },
    draw(p: PainterLike) {
      const g = clamp(t / 0.5)
      if (g > 0 && g < 1) {
        const k = g < 0.55 ? 0.8 : (1 - g) / 0.45 * 0.8
        dustRing(p, 0, -1, 6 + 58 * ease.outCubic(g), 8 * (1 - 0.35 * g), k, dust, { sy: 0.26, ph: 0.8, brk: g * 0.75, lit: 0.45, maxY: 15, half: 1 })
        dustRing(p, 0, -1, 3 + 38 * ease.outCubic(clamp(g * 1.25)), 5 * (1 - 0.4 * g), k * 0.8, mix(C[3], C[5], 0.4), { sy: 0.26, ph: 2.4, brk: g * 0.85, lit: 0.4, maxY: 15, half: 1 })
      }
      // warm glow round the muzzle
      const warm = Math.pow(1 - smooth(0, 0.5, t), 1.4)
      p.glow(MX, MY, 44, C[5], 0.4 * warm)
      p.glow(0, -6, 36, C[4], 0.22 * warm)
      if (t < 0.07) p.circle(MX, MY, 6 * (1 - t / 0.07) + 1, WHITE, 1 - t / 0.1)

      // the sound waves: broken crescents, rim dark -> body -> white-hot lip, thinning as they spread
      for (let i = 0; i < waves.length; i++) {
        const w = waves[i]
        const u = (t - w.t0) / w.life
        if (u <= 0 || u >= 1) continue
        const r = waveR(w, u)
        const thick = w.th * (1 - 0.72 * ease.inQuad(u)) + 0.6
        const alpha = u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45
        const hot = u < 0.2
        const cuts = [FAN0, ...w.cuts.map((c) => FAN0 + (FAN1 - FAN0) * c), FAN1]
        // widen the gaps as the wave spreads
        const gap = 0.04 + 0.1 * u
        const segs: [number, number][] = [
          [cuts[0], cuts[1] - gap],
          [cuts[1] + gap, cuts[2] - gap],
          [cuts[2] + gap, cuts[3]],
        ]
        for (const [a0, a1] of segs) {
          if (a1 - a0 < 0.12) continue
          const taper = (q: number) => thick * Math.pow(Math.sin(Math.PI * clamp(q)), 0.42)
          p.arc(MX, MY, r + 1.1, (q) => taper(q) + 2.2, a0, a1, C[1], alpha)
          p.arc(MX, MY, r, taper, a0, a1, (_q, v) => (hot && v > 0.35 ? WHITE : v > 0.78 ? C[7] : v > 0.5 ? C[6] : v > 0.25 ? C[5] : C[4]), alpha)
        }
        // an echo line trailing inside, and light along the fan
        p.arc(MX, MY, r - 6, (q) => 0.5 + taperEcho(q) * thick * 0.28, FAN0 + 0.1, FAN1 - 0.1, C[3], alpha * 0.7)
        for (let a = FAN0 + 0.15; a < FAN1; a += 0.3) p.glow(MX + Math.cos(a) * r, MY + Math.sin(a) * r, 11, C[5], 0.2 * alpha)
      }

      // paw prints popping inside the wave
      for (const pw of paws) {
        const age = t - pw.t0
        if (age < 0 || age > 0.3) continue
        const rr = pw.rad + age * 14
        const x = MX + Math.cos(pw.ang) * rr
        const y = MY + Math.sin(pw.ang) * rr
        const pop = age < 0.05 ? ease.outBack(age / 0.05) : 1
        const k = age < 0.17 ? 1 : 1 - seg(age, 0.17, 0.3)
        paw(p, x, y, pw.ang + Math.PI / 2 + 0.2, pw.size * pop, k, C)
        p.glow(x, y, 10, C[6], 0.28 * k)
      }

      // puffs of dust thrown out along the ground
      for (const q of puffs) {
        const age = t - q.t0
        if (age < 0 || age > q.life) continue
        const k = age / q.life
        const m = 1 - Math.exp(-3.5 * age)
        const x = q.x + (q.vx * m) / 3.5
        const y = Math.min(-1, q.y + (q.vy * m) / 3.5)
        const r = q.r * (1 + 0.8 * k)
        const a = Math.min(1, (1 - k) * 2) * 0.5
        p.disc(x, y, r, mix(C[4], C[5], 0.5), a)
        p.disc(x - r * 0.15, y - r * 0.22, r * 0.72, dust, a)
        p.disc(x - r * 0.3, y - r * 0.4, r * 0.4, C[6], a * 0.8)
      }
      // leaves kicked up
      for (const l of leaves) {
        const age = t - l.t0
        if (age < 0 || age > l.life) continue
        const k = Math.min(1, (l.life - age) / 0.14)
        const ca = Math.cos(l.a)
        const sa = Math.sin(l.a)
        const body = [C[3], C[4], C[5]][l.tone]
        const rim = C[1]
        for (let d = -2; d <= 2; d++) {
          const x = l.x + ca * d
          const y = l.y + sa * d
          if (Math.abs(d) <= 1) {
            p.dot(x - sa * 0.9, y + ca * 0.9, d === 0 ? C[2] : body, k)
            p.dot(x + sa * 0.9, y - ca * 0.9, d === 0 ? C[6] : C[2], k)
          }
          p.dot(x, y, d === 0 ? C[6] : d < 0 ? body : C[2], k)
        }
        p.dot(l.x - ca * 3, l.y - sa * 3, rim, k * 0.8)
      }
      lights.draw(p as unknown as Parameters<typeof lights.draw>[0])
    },
  }
}
