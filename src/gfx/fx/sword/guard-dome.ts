// Swordsman / Knight Guard Dome & Auto Guard Block (one-shot, 0.48 s): a crisp hexagonal aegis barrier snapping
// into place, double-rim hex frame with translucent inner shield fill, bright specular gleam, pulse ring and sparks.
// Origin = shield centre.
import { Lights, P, Particles, Rng, TAU, WHITE, ease, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { SEAL_BLUE } from './_pal'

export interface GuardDomeOpts {
  palette?: string[]
  seed?: number
}

interface Painter {
  dot(x: number, y: number, c: number, a?: number): void
  line(x0: number, y0: number, x1: number, y1: number, c: number, a?: number): void
  poly(pts: number[][], c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
  ring(cx: number, cy: number, r: number, w: number, c: number, a?: number): void
}

export const meta = {
  name: 'Guard dome',
  desc: 'Crisp hexagonal aegis barrier with double rim, specular gleam, pulse ring and deflect sparks.',
  tags: ['swordsman', 'knight', 'guard', 'shield', 'block', 'one-shot'],
  size: [112, 112] as number[],
  origin: [56, 56] as number[],
  duration: 0.48,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: SEAL_BLUE, seed: 21 },
}

function hexPts(r: number): number[][] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * TAU - Math.PI / 6
    return [Math.cos(a) * r, Math.sin(a) * r]
  })
}

export function create(o: GuardDomeOpts = {}) {
  const C = fit(o.palette ?? SEAL_BLUE, 8)
  const R = new Rng(o.seed ?? 21)
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => Infinity, sparks: [C[7], C[6], C[5], C[4]] })
  for (let i = 0; i < 12; i++) {
    const a = R.range(-1.2, 1.2), sp = R.range(55, 115)
    ps.spawn(P.SPARK, R.range(8, 22), R.range(-18, 18), Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.10, 0.20), i < 4 ? WHITE : C[6], 1, 0.04 + R.range(0, 0.03))
  }
  lights.add(0, 0, 38, C[5], 0.45, 0.2)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: Painter) {
      const snap = ease.outBack(seg(t, 0, 0.14))
      const fade = 1 - smooth(0.24, 0.43, t)
      if (fade > 0.02 && snap > 0) {
        const r = 16 + 15 * snap
        const outer = hexPts(r), inner = hexPts(r * 0.86)
        p.poly(inner, C[3], fade * 0.26)
        for (let i = 0; i < 6; i++) {
          const [x0, y0] = outer[i], [x1, y1] = outer[(i + 1) % 6]
          const [ix0, iy0] = inner[i], [ix1, iy1] = inner[(i + 1) % 6]
          p.line(x0, y0, x1, y1, i === 0 || i === 1 ? WHITE : C[6], fade)
          p.line(ix0, iy0, ix1, iy1, C[5], fade * 0.85)
        }
        // inner cross-brace gleam
        p.line(-r * 0.45, -r * 0.25, r * 0.15, -r * 0.55, WHITE, fade * 0.7)
        // expanding outer pulse ring
        const pk = ease.outQuart(seg(t, 0.03, 0.34)), pf = 1 - smooth(0.16, 0.36, t)
        if (pk > 0 && pf > 0.02) p.ring(0, 0, 22 + 24 * pk, 2, C[5], pf * 0.75)
        p.glow(0, 0, 24, C[5], 0.35 * fade)
      }
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
