// Basic Swordsman / Berserker slash (one-shot, 0.38 s): a crisp sweeping crescent slash with a faint afterimage arc,
// a 4-point impact glint and directional pixel sparks. Origin = impact centre.
import { Lights, P, Particles, Rng, WHITE, fit, seg, smooth } from '../../../vendor/pixelfx/core/index.js'
import { type Blade, type PainterLike, drawBlade, glint } from '../thief/_blade'
import { STEEL_SILVER } from './_pal'

export interface SwordSlashOpts {
  palette?: string[]
  seed?: number
}

export const meta = {
  name: 'Sword slash',
  desc: 'A sweeping sword crescent slash with an afterimage arc, 4-point glint and sparks.',
  tags: ['swordsman', 'sword', 'slash', 'melee', 'one-shot'],
  size: [136, 112] as number[],
  origin: [68, 56] as number[],
  duration: 0.38,
  loop: false,
  fps: 20,
  bg: 'dark',
  options: { palette: STEEL_SILVER, seed: 4 },
}

const HIT_T = 0.055

export function create(o: SwordSlashOpts = {}) {
  const C = fit(o.palette ?? STEEL_SILVER, 8)
  const R = new Rng(o.seed ?? 4)
  const main: Blade = { a: [-44, -34], c: [26, -12], b: [42, 34], w: 11, t0: 0, reveal: 0.06, hold: 0.04, life: 0.16 }
  const ghost: Blade = { a: [-48, -30], c: [14, -8], b: [36, 36], w: 8, t0: 0.025, reveal: 0.06, hold: 0.03, life: 0.14 }
  const lights = new Lights()
  const ps = new Particles({ rng: R, ground: () => Infinity, sparks: [C[7], C[6], C[5], C[4]] })
  for (let i = 0; i < 12; i++) {
    const a = R.range(-0.9, 1.3), sp = R.range(60, 150)
    ps.spawn(P.SPARK, R.range(-4, 6), R.range(-6, 6), Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.09, 0.19), i < 4 ? WHITE : C[6], 1, HIT_T + R.range(0, 0.02))
  }
  lights.add(6, 0, 36, C[4], 0.45, 0.16)
  let t = 0

  return {
    update(dt: number) {
      t += dt
      ps.update(dt)
      lights.update(dt)
    },
    draw(p: PainterLike) {
      drawBlade(p, ghost, t, C, { ghost: true, alpha: 0.55 })
      drawBlade(p, main, t, C)
      const fl = seg(t, HIT_T - 0.01, HIT_T + 0.01) * (1 - smooth(HIT_T + 0.02, HIT_T + 0.12, t))
      glint(p, 10, 0, 11, C, fl)
      ps.draw(p, 'front')
      lights.draw(p)
    },
  }
}
