// Thief-line pixel-art VFX helpers (effects live in src/gfx/fx/thief, baked by src/gfx/pixelfx.ts).
// Decoration only: nothing here is awaited by battle logic. All presentation numbers are in THIEF_FX below.
import type Phaser from 'phaser'
import { MOB_LILAC, ROGUE_GOLD, playPfx } from '../gfx/pixelfx'

type Palette = (string | number)[]

export interface VfxTarget {
  x: number
  y: number
  displayHeight: number
}

/** scale / speed (animation timeScale) / depth per effect; chest = fraction of the sprite height the hit lands at. */
export const THIEF_FX = {
  cross: { scale: 1.3, speed: 1.5, depth: 9003 },
  shadow: { scale: 1.4, speed: 1.3, depth: 9004, chest: 0.45 },
  backstab: { scale: 1.7, speed: 1.1, depth: 9004, chest: 0.5 },
  venom: { scale: 1.4, speed: 1.4, depth: 9003, chest: 0.4, dx: -40 },
  smoke: { scale: 1.5, speed: 1.2, depth: 9005 },
  /** per-hit nudge so repeated hits do not stack exactly (indexed by n % length) */
  hitOffsets: [[0, 0], [-6, 5], [6, -5], [-3, -8]] as [number, number][],
} as const

export type ThiefTone = 'thief' | 'rogue' | 'mobster'

const off = (n: number) => THIEF_FX.hitOffsets[Math.abs(n) % THIEF_FX.hitOffsets.length]

/** ฟันไขว้คู่: every Thief-line melee hit (the lunge's own slash). Mobster cuts in lilac. `n` = hit counter (varies it). */
export function daggerCrossFx(scene: Phaser.Scene, x: number, y: number, n = 0, tone: ThiefTone = 'thief') {
  const c = THIEF_FX.cross, [dx, dy] = off(n)
  const palette: Palette | undefined = tone === 'mobster' ? MOB_LILAC : undefined
  playPfx(scene, 'daggerCross', x + dx, y + dy, { scale: c.scale, speed: c.speed, depth: c.depth, flip: n % 2 === 1, palette })
}

/** เงาพริ้ว: one shadow cut per ult hit (Thief / Rogue พายุมีด / Mobster ทวงหนี้). */
export function shadowSlashFx(scene: Phaser.Scene, t: VfxTarget, n = 0) {
  const c = THIEF_FX.shadow, [dx, dy] = off(n)
  playPfx(scene, 'shadowSlash', t.x + dx, t.y - t.displayHeight * c.chest + dy, { scale: c.scale, speed: c.speed, depth: c.depth, flip: n % 2 === 1 })
}

/** Rogue 🗡️ Back Stab: a big gold shadow cut (the sure crit). */
export function backstabFx(scene: Phaser.Scene, t: VfxTarget) {
  const c = THIEF_FX.backstab
  playPfx(scene, 'shadowSlash', t.x, t.y - t.displayHeight * c.chest, { scale: c.scale, speed: c.speed, depth: c.depth, palette: ROGUE_GOLD })
}

/** Poison stab (Skill 1 · แผลเหวอะ): the thrust ends in the target's body and venom bursts there. */
export function venomStabFx(scene: Phaser.Scene, t: VfxTarget) {
  const c = THIEF_FX.venom
  playPfx(scene, 'venomStab', t.x + c.dx, t.y - t.displayHeight * c.chest, { scale: c.scale, speed: c.speed, depth: c.depth })
}

/** ระเบิดควัน: smoke around the hero's feet. */
export function smokeBombFx(scene: Phaser.Scene, x: number, groundY: number) {
  const c = THIEF_FX.smoke
  playPfx(scene, 'smokeBomb', x, groundY, { scale: c.scale, speed: c.speed, depth: c.depth })
}
