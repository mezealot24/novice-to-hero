// Knight Spear Boomerang in flight (loop, 0.24 s): a seamless 360-degree spinning golden pixel spear with a leaf-shaped
// head, glowing shaft, curved motion-blur arc trail and tip glints. Origin = spear centre.
import { TAU, WHITE, fit } from '../../../vendor/pixelfx/core/index.js'
import { BLADE_GOLD } from './_pal'

export interface SpearSpinOpts {
  palette?: string[]
}

interface Painter {
  dot(x: number, y: number, c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
}

export const meta = {
  name: 'Spear spin',
  desc: 'Seamless 360-degree spinning golden spear with motion-blur arc trail for Spear Boomerang.',
  tags: ['swordsman', 'knight', 'spear', 'boomerang', 'projectile', 'loop'],
  size: [76, 76] as number[],
  origin: [38, 38] as number[],
  duration: 0.24,
  loop: true,
  fps: 20,
  bg: 'dark',
  options: { palette: BLADE_GOLD },
}

export function draw(p: Painter, t: number, o: SpearSpinOpts): void {
  const C = fit(o.palette ?? BLADE_GOLD, 8) as number[], D = meta.duration, ang = (t / D) * TAU
  const cs = Math.cos(ang), sn = Math.sin(ang)
  // circular motion-blur arc trails
  for (let i = 0; i < 40; i++) {
    const u = i / 40, a = ang - u * 1.65, fade = 1 - u
    const rOuter = 26, rInner = 21
    p.dot(Math.cos(a) * rOuter, Math.sin(a) * rOuter, u < 0.25 ? C[6] : C[4], fade * 0.85)
    p.dot(Math.cos(a) * rInner, Math.sin(a) * rInner, C[3], fade * 0.55)
    p.dot(Math.cos(a + Math.PI) * rOuter, Math.sin(a + Math.PI) * rOuter, C[4], fade * 0.65)
  }
  // spear shaft & head rotated by ang
  for (let d = -23; d <= 26; d++) {
    const x = d * cs, y = d * sn
    const nx = -sn, ny = cs
    // head from d = 11..26, shaft from d = -23..10
    const half = d > 10 ? (d < 17 ? (d - 10) * 0.65 : (26 - d) * 0.45) : 1.5
    const H = Math.max(0, Math.round(half))
    for (let w = -H; w <= H; w++) {
      const c = w === 0 ? (d > 10 ? WHITE : C[6]) : Math.abs(w) >= H ? C[2] : C[5]
      p.dot(x + nx * w, y + ny * w, c)
    }
  }
  p.glow(24 * cs, 24 * sn, 8, WHITE, 0.45)
  p.glow(0, 0, 12, C[4], 0.22)
}
