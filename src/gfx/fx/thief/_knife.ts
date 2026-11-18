// Shared by the Rogue knife effects: one small throwing dagger drawn point-first along an angle.
// Steel blade (dark rim, lit upper edge, white cutting edge + tip), a gold crossguard, a dark grip and a gold pommel.
import { WHITE } from '../../../vendor/pixelfx/core/index.js'

export interface KnifePainter {
  dot(x: number, y: number, c: number, a?: number): void
  line(x0: number, y0: number, x1: number, y1: number, c: number, a?: number): void
  poly(pts: number[][], c: number, a?: number): void
  glow(x: number, y: number, r: number, c: number, k?: number): void
}

/** Cold steel with a faint blue sheen (dark -> white), the blade's own ramp whatever the effect palette is. */
export const KNIFE_STEEL = ['#0c0f18', '#1f2738', '#3b4760', '#66748f', '#98a6bf', '#c8d2e2', '#eef2fa', '#ffffff']

/**
 * A dagger with its tip at (tx, ty) pointing along `ang` (radians). `len` = tip to pommel in px.
 * S = steel ramp (8), G = guard / pommel ramp (8). a = alpha.
 */
export function drawKnife(p: KnifePainter, tx: number, ty: number, ang: number, len: number, S: number[], G: number[], a = 1): void {
  if (a <= 0.02) return
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx
  const pt = (u: number, v: number): number[] => [tx - dx * u + nx * v, ty - dy * u + ny * v]
  const blade = len * 0.62, guard = blade + 1, grip = len - 2
  const bw = Math.max(1.6, len * 0.11)
  // blade: dark rim, then the shaded lower half and the lit upper half, then the white edge
  p.poly([pt(-1, 0), pt(blade * 0.35, -bw - 0.8), pt(blade, -bw - 0.8), pt(blade, bw + 0.8), pt(blade * 0.35, bw + 0.8)], S[1], a)
  p.poly([pt(0, 0), pt(blade * 0.35, bw), pt(blade, bw), pt(blade, 0)], S[3], a)
  p.poly([pt(0, 0), pt(blade * 0.35, -bw), pt(blade, -bw), pt(blade, 0)], S[5], a)
  const e0 = pt(0.5, -0.2), e1 = pt(blade, -bw * 0.6)
  p.line(e0[0], e0[1], e1[0], e1[1], WHITE, a)
  const f0 = pt(blade * 0.3, 0), f1 = pt(blade, 0) // fuller
  p.line(f0[0], f0[1], f1[0], f1[1], S[4], a)
  // crossguard (gold bar across the blade's base)
  const gw = bw + 3
  p.poly([pt(guard - 1, -gw), pt(guard + 1.2, -gw), pt(guard + 1.2, gw), pt(guard - 1, gw)], G[1], a)
  const g0 = pt(guard, -gw + 0.6), g1 = pt(guard, gw - 0.6)
  p.line(g0[0], g0[1], g1[0], g1[1], G[5], a)
  // grip + pommel
  const h0 = pt(guard + 1.5, 0), h1 = pt(grip, 0)
  p.line(h0[0], h0[1], h1[0], h1[1], G[1], a)
  const h2 = pt(guard + 1.5, -0.8), h3 = pt(grip, -0.8)
  p.line(h2[0], h2[1], h3[0], h3[1], G[2], a)
  const pm = pt(len, 0)
  p.dot(pm[0], pm[1], G[5], a)
  p.dot(pm[0] - dx * 0.8, pm[1] - dy * 0.8, G[6], a)
  // tip glint
  p.dot(tx, ty, WHITE, a)
  p.glow(tx, ty, 3, S[6], 0.25 * a)
}
