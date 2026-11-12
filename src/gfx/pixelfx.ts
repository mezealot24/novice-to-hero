// Pixel-art VFX from the vendored pixelfx library (src/vendor/pixelfx, MIT, github.com/patch-gg/pixelfx).
// No image files: each effect is baked into a canvas sprite sheet the first time it is used (or by preloadPfx),
// so the single-file build only carries code. Only effects without the stock character (meta.actor) are used.
import type Phaser from 'phaser'
import { clearFrame, composite, createFrame, createFx } from '../vendor/pixelfx/core/index.js'
export { PAL } from '../vendor/pixelfx/core/index.js'
import * as smite from '../vendor/pixelfx/fx/holy/smite.js'
import * as holyPillar from '../vendor/pixelfx/fx/holy/holy-pillar.js'
import * as healAoe from '../vendor/pixelfx/fx/holy/heal-aoe.js'
import * as featherBurst from '../vendor/pixelfx/fx/holy/feather-burst.js'
import * as bluntHit from '../vendor/pixelfx/fx/impacts/blunt-hit.js'
import * as critHit from '../vendor/pixelfx/fx/impacts/crit-hit.js'
import * as groundSlam from '../vendor/pixelfx/fx/impacts/ground-slam.js'
import * as zapHit from '../vendor/pixelfx/fx/lightning/zap-hit.js'
// Fire
import * as fireball from '../vendor/pixelfx/fx/fire/fireball.js'
import * as fireTornado from '../vendor/pixelfx/fx/fire/fire-tornado.js'
// Ice
import * as frostNova from '../vendor/pixelfx/fx/ice/frost-nova.js'
import * as iceLance from '../vendor/pixelfx/fx/ice/ice-lance.js'
import * as iceSpikes from '../vendor/pixelfx/fx/ice/ice-spikes.js'
// Lightning
import * as lightningStrike from '../vendor/pixelfx/fx/lightning/lightning-strike.js'
import * as chainLightning from '../vendor/pixelfx/fx/lightning/chain-lightning.js'
import * as thunderclap from '../vendor/pixelfx/fx/lightning/thunderclap.js'
// Arcane
import * as magicCircleCast from '../vendor/pixelfx/fx/arcane/magic-circle-cast.js'
import * as runeCircle from '../vendor/pixelfx/fx/arcane/rune-circle.js'
import * as arcaneMissiles from '../vendor/pixelfx/fx/arcane/arcane-missiles.js'
import * as arcaneBeam from '../vendor/pixelfx/fx/arcane/arcane-beam.js'
import * as starFall from '../vendor/pixelfx/fx/arcane/star-fall.js'

export interface PfxMeta { size: number[]; origin: number[]; duration: number } // JS meta: [w, h] and [x, y]
export interface PfxMod { meta: PfxMeta }

/** from / until: the slice of the effect's own time that is baked (skips lead-ins the battle already shows). */
export interface PfxDef { mod: PfxMod; from?: number; until?: number; opts?: Record<string, unknown> }

const GOLD_HIT = ['#2a1a06', '#5c3a0a', '#a36a14', '#e09a2c', '#ffc23d', '#ffe08a', '#fff6c8', '#ffffff'] // crit-hit's own ramp is red-orange

export const DEFS = {
  smite: { mod: smite, from: 0.45, until: 1.9 }, // holy light falling on one monster
  pillar: { mod: holyPillar, from: 0.5, until: 3.2 }, // a fan of light on the mark
  healRing: { mod: healAoe, until: 2.4 }, // green ring + rising plus signs
  feathers: { mod: featherBurst, until: 2.4 },
  blunt: { mod: bluntHit }, // mace smash
  critGold: { mod: critHit, opts: { palette: GOLD_HIT } },
  critOrange: { mod: critHit },
  slam: { mod: groundSlam, until: 2.4 },
  zap: { mod: zapHit },
  // Fire
  fireball: { mod: fireball, until: 1.2 },
  fireTornado: { mod: fireTornado, until: 1.6 },
  // Ice
  frostNova: { mod: frostNova, from: 0.2, until: 2.5 },
  iceLance: { mod: iceLance, until: 0.8 },
  iceSpikes: { mod: iceSpikes, until: 2.4 },
  // Lightning
  lightningStrike: { mod: lightningStrike, from: 0.45, until: 2.2 },
  chainLightning: { mod: chainLightning, from: 0.05, until: 1.5 },
  thunderclap: { mod: thunderclap, from: 0.2, until: 1.6 },
  // Arcane
  magicCircle: { mod: magicCircleCast, from: 0.5, until: 3.2 },
  runeCircle: { mod: runeCircle, until: 1.6 },
  arcaneMissiles: { mod: arcaneMissiles, until: 1.6 },
  arcaneBeam: { mod: arcaneBeam, until: 1.2 },
  starFall: { mod: starFall, until: 2.2 },
} satisfies Record<string, PfxDef>

export type PfxId = keyof typeof DEFS

const BAKE_FPS = 20
const MAX_W = 4096

export function normColor(c: string | number): string {
  if (typeof c === 'number') {
    return '#' + (c >>> 0).toString(16).padStart(6, '0').slice(-6).toLowerCase()
  }
  let s = String(c).trim().toLowerCase().replace(/^#/, '')
  if (s.length === 3) {
    s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]
  }
  return '#' + s
}

function palKey(palette?: (string | number)[]): string {
  if (!palette || !palette.length) return ''
  return '_' + palette.map((c) => normColor(c).replace(/^#/, '')).join('-')
}

export const texKey = (id: PfxId, palette?: (string | number)[]) => `pfx_${id}${palKey(palette)}`

/** Bakes one effect into a canvas texture + a play-once animation (once per game; textures are global). */
export function bake(scene: Phaser.Scene, id: PfxId, palette?: (string | number)[]): boolean {
  const key = texKey(id, palette)
  if (scene.textures.exists(key)) return true
  const def: PfxDef = DEFS[id]
  if (!def) return false
  const { size: [w, h], origin: [ox, oy], duration } = def.mod.meta
  const from = def.from ?? 0, until = Math.min(def.until ?? duration, duration)
  const n = Math.max(1, Math.round((until - from) * BAKE_FPS) + 1)
  const cols = Math.max(1, Math.min(n, Math.floor(MAX_W / w))), rows = Math.ceil(n / cols)
  const canvas = scene.textures.createCanvas(key, cols * w, rows * h)
  if (!canvas) return false
  const ctx = canvas.getContext()
  const frame = createFrame(w, h), img = new ImageData(w, h)
  const normPal = palette && palette.length > 0 ? palette.map(normColor) : undefined
  const opts = { ...(def.opts ?? {}), ...(normPal ? { palette: normPal } : {}) }
  const fx = createFx(def.mod, { x: ox, y: oy, ...opts })
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
  canvas.setFilter(1) // Phaser.Textures.FilterMode.NEAREST
  if (!scene.anims.exists(key)) {
    scene.anims.create({ key, frames: Array.from({ length: n }, (_, i) => ({ key, frame: i })), frameRate: BAKE_FPS })
  }
  return true
}

export type PfxPreloadEntry = PfxId | { id: PfxId; palette?: (string | number)[] }

/** Bake ahead (battle start) so the first cast doesn't hitch. */
export function preloadPfx(scene: Phaser.Scene, entries: PfxPreloadEntry[]) {
  for (const entry of entries) {
    if (typeof entry === 'string') bake(scene, entry)
    else bake(scene, entry.id, entry.palette)
  }
}

export interface PfxPlay {
  scale?: number
  speed?: number
  depth?: number
  flip?: boolean
  alpha?: number
  palette?: (string | number)[]
}

/**
 * Plays an effect once at (x, y) = the effect's own origin (feet / impact point) and removes it.
 * Never awaited by battle logic: it is decoration only.
 */
export function playPfx(scene: Phaser.Scene, id: PfxId, x: number, y: number, o: PfxPlay = {}) {
  if (!bake(scene, id, o.palette)) return undefined
  const key = texKey(id, o.palette), [w, h] = DEFS[id].mod.meta.size, [ox, oy] = DEFS[id].mod.meta.origin
  const spr = scene.add.sprite(x, y, key, 0)
    .setOrigin(o.flip ? 1 - ox / w : ox / w, oy / h)
    .setScale(o.scale ?? 2)
    .setFlipX(!!o.flip)
    .setAlpha(o.alpha ?? 1)
    .setDepth(o.depth ?? 9001)
  spr.anims.timeScale = o.speed ?? 1.5
  spr.play(key)
  spr.once('animationcomplete', () => spr.destroy())
  return spr
}

/** Every effect the Cleric line (Cleric · Crusader · Monk · Paladin) can show. */
export const CLERIC_PFX: PfxId[] = ['smite', 'pillar', 'healRing', 'feathers', 'blunt', 'critGold', 'critOrange', 'slam', 'zap']

/** Every effect the Mage line (Mage · Wizard · Sage) can show across all 4 elements. */
export const MAGE_PFX: PfxId[] = [
  'fireball',
  'fireTornado',
  'frostNova',
  'iceLance',
  'iceSpikes',
  'lightningStrike',
  'chainLightning',
  'thunderclap',
  'magicCircle',
  'runeCircle',
  'arcaneMissiles',
  'arcaneBeam',
  'starFall',
]
