// Archer + Beastmaster pixel-art VFX helpers (effects live in src/gfx/fx/{archer,beast}, baked by src/gfx/pixelfx.ts).
// Decoration only: nothing here is awaited by battle logic. All presentation numbers are in RANGER_FX below.
import type Phaser from 'phaser'
import { WOOD_GOLD, WOLF_SILVER, loopPfx, playPfx } from '../gfx/pixelfx'

type Palette = (string | number)[]

export type PetKind = 'hawk' | 'boar' | 'wolf'

export interface VfxTarget {
  x: number
  y: number
  displayHeight: number
  displayWidth: number
}

/** scale / speed (animation timeScale) / depth per effect; offsets in px. */
export const RANGER_FX = {
  arrowShot: { scale: 1.25, speed: 1, depth: 9000 },
  arrowHit: { scale: 0.9, speed: 1.6, depth: 9003 },
  arrowRain: { scale: 1.4, speed: 1.2, depth: 9003, x: 700 },
  pierceShot: { scale: 1.5, speed: 1.2, depth: 9004, hitMs: 200 }, // hitMs: wait before the strike lands (the star burst is at ~0.2 s of the sheet)
  snareTrap: { scale: 1, speed: 1.2, depth: 8999 },
  huntMark: { scale: 0.9, speed: 1.3, depth: 9004, chest: 0.5 },
  eagleEye: { scale: 0.6, speed: 1.2, depth: 9004, dx: 16, dy: 128 }, // ar_hawk buff: a small gold focus mark at the hero's head
  hawk: { scale: 0.9, speed: 1.5, depth: 9004, chest: 0.4 },
  boar: { scale: 0.9, speed: 1.4, depth: 9002 },
  claw: { scale: 1, speed: 1.6, depth: 9004, chest: 0.5 },
  roar: { scale: 1.2, speed: 1.2, depth: 9001 },
  stampede: { scale: 1.6, speed: 1, depth: 9003 },
  /** per-hit nudge so repeated hits on one target do not stack exactly (indexed by n % length) */
  hitOffsets: [[0, 0], [-8, 5], [7, -6], [-4, -10]] as [number, number][],
  /** at most this many hawks on a multi-monster pass */
  maxHawks: 3,
} as const

/** Looping arrow sprite at (x, y) = the arrow tip, rotated to `angle` (radians, hero -> target). Caller moves + destroys it. */
export function arrowProjectile(scene: Phaser.Scene, x: number, y: number, angle: number, palette?: Palette): Phaser.GameObjects.Sprite | undefined {
  const c = RANGER_FX.arrowShot
  const spr = loopPfx(scene, 'arrowShot', x, y, { scale: c.scale, speed: c.speed, depth: c.depth, palette })
  spr?.setRotation(angle)
  return spr
}

export function arrowImpactFx(scene: Phaser.Scene, x: number, y: number, palette?: Palette) {
  const c = RANGER_FX.arrowHit
  playPfx(scene, 'arrowHit', x, y, { scale: c.scale, speed: c.speed, depth: c.depth, palette })
}

export function arrowRainFx(scene: Phaser.Scene, groundY: number, palette?: Palette, x: number = RANGER_FX.arrowRain.x) {
  const c = RANGER_FX.arrowRain
  playPfx(scene, 'arrowRain', x, groundY, { scale: c.scale, speed: c.speed, depth: c.depth, palette })
}

/** Archer ultimate: the lance arrives from the left and bursts at (x, y) on the target's body. */
export function pierceShotFx(scene: Phaser.Scene, x: number, y: number) {
  const c = RANGER_FX.pierceShot
  playPfx(scene, 'pierceShot', x, y, { scale: c.scale, speed: c.speed, depth: c.depth })
}

export function snareTrapFx(scene: Phaser.Scene, x: number, groundY: number) {
  const c = RANGER_FX.snareTrap
  playPfx(scene, 'snareTrap', x, groundY, { scale: c.scale, speed: c.speed, depth: c.depth })
}

/** Hunt mark locking on at (x, y) (a monster's body). */
export function huntMarkFx(scene: Phaser.Scene, x: number, y: number) {
  const c = RANGER_FX.huntMark
  playPfx(scene, 'huntMark', x, y, { scale: c.scale, speed: c.speed, depth: c.depth })
}

/** Hunt mark on a monster sprite (chest height). */
export function huntMarkOn(scene: Phaser.Scene, t: VfxTarget) {
  huntMarkFx(scene, t.x, t.y - t.displayHeight * RANGER_FX.huntMark.chest)
}

/** ar_hawk buff: a small gold focus mark by the hero's head (eagle eye). */
export function eagleEyeFx(scene: Phaser.Scene, heroX: number, groundY: number) {
  const c = RANGER_FX.eagleEye
  playPfx(scene, 'huntMark', heroX + c.dx, groundY - c.dy, { scale: c.scale, speed: c.speed, depth: c.depth, palette: WOOD_GOLD })
}

/** One pet strike: hawk dives onto the chest, boar charges in at the monster's front edge, wolf claws the body. */
export function petHitFx(scene: Phaser.Scene, pet: PetKind, target: VfxTarget, groundY: number, n = 0) {
  const o = RANGER_FX.hitOffsets, [dx, dy] = o[Math.abs(n) % o.length]
  if (pet === 'hawk') {
    const c = RANGER_FX.hawk
    playPfx(scene, 'hawkDive', target.x + dx, target.y - target.displayHeight * c.chest + dy, { scale: c.scale, speed: c.speed, depth: c.depth })
  } else if (pet === 'boar') {
    const c = RANGER_FX.boar
    playPfx(scene, 'boarCharge', target.x - target.displayWidth * 0.5 + dx, groundY, { scale: c.scale, speed: c.speed, depth: c.depth })
  } else {
    const c = RANGER_FX.claw // symmetrical art: alternate the flip so repeated claws cross
    playPfx(scene, 'clawSlash', target.x + dx, target.y - target.displayHeight * c.chest + dy, { scale: c.scale, speed: c.speed, depth: c.depth, flip: Math.abs(n) % 2 === 1 })
  }
}

/** Beast roar at the hero / pet feet; the wolf pack call uses the silver palette. */
export function beastRoarFx(scene: Phaser.Scene, x: number, groundY: number, palette?: Palette) {
  const c = RANGER_FX.roar
  playPfx(scene, 'beastRoar', x, groundY, { scale: c.scale, speed: c.speed, depth: c.depth, palette })
}

export const wolfRoarPalette: Palette = WOLF_SILVER

/** Beastmaster ultimate: a dust wall sweeping through the monster row centred on centerX. */
export function stampedeFx(scene: Phaser.Scene, centerX: number, groundY: number) {
  const c = RANGER_FX.stampede
  playPfx(scene, 'stampede', centerX, groundY, { scale: c.scale, speed: c.speed, depth: c.depth })
}
