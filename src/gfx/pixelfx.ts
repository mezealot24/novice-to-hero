// Pixel-art VFX from the vendored pixelfx library (src/vendor/pixelfx, MIT, github.com/patch-gg/pixelfx).
// No image files: each effect is baked into a canvas sprite sheet the first time it is used (or by preloadPfx),
// so the single-file build only carries code. Only effects without the stock character (meta.actor) are used.
import Phaser from 'phaser'
import { clearFrame, composite, createFrame, createFx } from '../vendor/pixelfx/core/index.js'
import * as smite from '../vendor/pixelfx/fx/holy/smite.js'
import * as holyPillar from '../vendor/pixelfx/fx/holy/holy-pillar.js'
import * as healAoe from '../vendor/pixelfx/fx/holy/heal-aoe.js'
import * as featherBurst from '../vendor/pixelfx/fx/holy/feather-burst.js'
import * as bluntHit from '../vendor/pixelfx/fx/impacts/blunt-hit.js'
import * as critHit from '../vendor/pixelfx/fx/impacts/crit-hit.js'
import * as groundSlam from '../vendor/pixelfx/fx/impacts/ground-slam.js'
import * as zapHit from '../vendor/pixelfx/fx/lightning/zap-hit.js'

interface PfxMeta { size: number[]; origin: number[]; duration: number } // JS meta: [w, h] and [x, y]
interface PfxMod { meta: PfxMeta }

/** from / until: the slice of the effect's own time that is baked (skips lead-ins the battle already shows). */
interface PfxDef { mod: PfxMod; from?: number; until?: number; opts?: Record<string, unknown> }

const GOLD_HIT = ['#2a1a06', '#5c3a0a', '#a36a14', '#e09a2c', '#ffc23d', '#ffe08a', '#fff6c8', '#ffffff'] // crit-hit's own ramp is red-orange

const DEFS = {
  smite: { mod: smite, from: 0.45, until: 1.9 }, // holy light falling on one monster
  pillar: { mod: holyPillar, from: 0.5, until: 3.2 }, // a fan of light on the mark
  healRing: { mod: healAoe, until: 2.4 }, // green ring + rising plus signs
  feathers: { mod: featherBurst, until: 2.4 },
  blunt: { mod: bluntHit }, // mace smash
  critGold: { mod: critHit, opts: { palette: GOLD_HIT } },
  critOrange: { mod: critHit },
  slam: { mod: groundSlam, until: 2.4 },
  zap: { mod: zapHit },
} satisfies Record<string, PfxDef>

export type PfxId = keyof typeof DEFS

const BAKE_FPS = 20
const MAX_W = 4096

const texKey = (id: PfxId) => `pfx_${id}`

/** Bakes one effect into a canvas texture + a play-once animation (once per game; textures are global). */
function bake(scene: Phaser.Scene, id: PfxId): boolean {
  const key = texKey(id)
  if (scene.textures.exists(key)) return true
  const def: PfxDef = DEFS[id]
  const { size: [w, h], origin: [ox, oy], duration } = def.mod.meta
  const from = def.from ?? 0, until = Math.min(def.until ?? duration, duration)
  const n = Math.max(1, Math.round((until - from) * BAKE_FPS) + 1)
  const cols = Math.max(1, Math.min(n, Math.floor(MAX_W / w))), rows = Math.ceil(n / cols)
  const canvas = scene.textures.createCanvas(key, cols * w, rows * h)
  if (!canvas) return false
  const ctx = canvas.getContext()
  const frame = createFrame(w, h), img = new ImageData(w, h)
  const fx = createFx(def.mod, { x: ox, y: oy, ...(def.opts ?? {}) })
  for (let t = 0; t < from; t += 1 / 60) fx.update(Math.min(1 / 60, from - t)) // run the lead-in without drawing it
  for (let i = 0; i < n; i++) {
    if (i > 0) fx.update(1 / BAKE_FPS)
    clearFrame(frame)
    fx.draw(frame)
    composite(frame, img.data, null)
    const x = (i % cols) * w, y = Math.floor(i / cols) * h
    ctx.putImageData(img, x, y)
    canvas.add(i, 0, x, y, w, h)
  }
  canvas.refresh()
  canvas.setFilter(Phaser.Textures.FilterMode.NEAREST)
  scene.anims.create({ key, frames: Array.from({ length: n }, (_, i) => ({ key, frame: i })), frameRate: BAKE_FPS })
  return true
}

/** Bake ahead (battle start) so the first cast doesn't hitch. */
export function preloadPfx(scene: Phaser.Scene, ids: PfxId[]) {
  for (const id of ids) bake(scene, id)
}

export interface PfxPlay { scale?: number; speed?: number; depth?: number; flip?: boolean; alpha?: number }

/**
 * Plays an effect once at (x, y) = the effect's own origin (feet / impact point) and removes it.
 * Never awaited by battle logic: it is decoration only.
 */
export function playPfx(scene: Phaser.Scene, id: PfxId, x: number, y: number, o: PfxPlay = {}) {
  if (!bake(scene, id)) return undefined
  const key = texKey(id), [w, h] = DEFS[id].mod.meta.size, [ox, oy] = DEFS[id].mod.meta.origin
  const spr = scene.add.sprite(x, y, key, 0)
    .setOrigin(o.flip ? 1 - ox / w : ox / w, oy / h)
    .setScale(o.scale ?? 2)
    .setFlipX(!!o.flip)
    .setAlpha(o.alpha ?? 1)
    .setDepth(o.depth ?? 9001)
  spr.anims.timeScale = o.speed ?? 1.5
  spr.play(key)
  spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spr.destroy())
  return spr
}

/** Every effect the Cleric line (Cleric · Crusader · Monk · Paladin) can show. */
export const CLERIC_PFX: PfxId[] = ['smite', 'pillar', 'healRing', 'feathers', 'blunt', 'critGold', 'critOrange', 'slam', 'zap']
