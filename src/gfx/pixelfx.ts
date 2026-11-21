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
import * as zapStrike from './zap-strike'
// Fire
import * as fireball from '../vendor/pixelfx/fx/fire/fireball.js'
import * as fireTornado from '../vendor/pixelfx/fx/fire/fire-tornado.js'
// Ice
import * as frostNova from '../vendor/pixelfx/fx/ice/frost-nova.js'
import * as iceLance from '../vendor/pixelfx/fx/ice/ice-lance.js'
import * as iceSpikes from '../vendor/pixelfx/fx/ice/ice-spikes.js'
// Lightning
import * as lightningStrike from '../vendor/pixelfx/fx/lightning/lightning-strike.js'
import * as chainLightning from './chain-arc'
import * as thunderclap from '../vendor/pixelfx/fx/lightning/thunderclap.js'
// Arcane
import * as magicCircleCast from '../vendor/pixelfx/fx/arcane/magic-circle-cast.js'
import * as runeCircle from '../vendor/pixelfx/fx/arcane/rune-circle.js'
import * as arcaneMissiles from '../vendor/pixelfx/fx/arcane/arcane-missiles.js'
import * as arcaneBeam from '../vendor/pixelfx/fx/arcane/arcane-beam.js'
import * as starFall from '../vendor/pixelfx/fx/arcane/star-fall.js'
// Loot
import * as coinDrop from '../vendor/pixelfx/fx/spawn/coin-drop.js'
// Archer
import * as arrowShot from './fx/archer/arrow-shot'
import * as arrowHit from './fx/archer/arrow-hit'
import * as arrowRain from './fx/archer/arrow-rain'
import * as pierceShot from './fx/archer/pierce-shot'
import * as snareTrap from './fx/archer/snare-trap'
import * as huntMark from './fx/archer/hunt-mark'
// Beastmaster
import * as hawkDive from './fx/beast/hawk-dive'
import * as clawSlash from './fx/beast/claw-slash'
import * as boarCharge from './fx/beast/boar-charge'
import * as boarGuard from './fx/beast/boar-guard'
import * as beastRoar from './fx/beast/beast-roar'
import * as stampede from './fx/beast/stampede'
// Thief line (Thief · Rogue · Mobster)
import * as daggerCross from './fx/thief/dagger-cross'
import * as shadowSlash from './fx/thief/shadow-slash'
import * as venomStab from './fx/thief/venom-stab'
import * as smokeBomb from './fx/thief/smoke-bomb'
import * as flyingKnife from './fx/thief/flying-knife'
import * as knifeStorm from './fx/thief/knife-storm'
// Swordsman line (Q 2026-11-21 rework: ดาบสยบมนตร์ · ดาบพิพากษา)
import * as sealCut from './fx/sword/seal-cut'
import * as silenceSeal from './fx/sword/silence-seal'
import * as castBreak from './fx/sword/cast-break'
import * as cleanse from './fx/sword/cleanse'
import * as awakenBurst from './fx/sword/awaken-burst'
import * as awakenAura from './fx/sword/awaken-aura'
import * as windWave from './fx/sword/wind-wave'
import { BLADE_GOLD, EXEC_RED, SEAL_BLUE } from './fx/sword/_pal'
import { WOOD_GOLD } from './fx/archer/arrow-shot'
export { WOOD_GOLD }

export interface PfxMeta { size: number[]; origin: number[]; duration: number } // JS meta: [w, h] and [x, y]
export interface PfxMod { meta: PfxMeta }

/** from / until: the slice of the effect's own time that is baked (skips lead-ins the battle already shows). */
export interface PfxDef {
  mod: PfxMod
  from?: number
  until?: number
  size?: [number, number]
  origin?: [number, number]
  opts?: Record<string, unknown>
}

const GOLD_HIT = ['#2a1a06', '#5c3a0a', '#a36a14', '#e09a2c', '#ffc23d', '#ffe08a', '#fff6c8', '#ffffff'] // crit-hit's own ramp is red-orange
export const ZAP_YELLOW = ['#241d08', '#524412', '#947e1f', '#d4bb34', '#f5df53', '#fff08a', '#fffad1', '#ffffff']
export const ZAP_YELLOW_SPARKS = ['#ffffff', '#fffad1', '#fff08a', '#d4bb34']

/** Archer palette variants: poison arrows (dark green -> lime -> white) and the ricochet arrow (pale leaf green, ~0xc9f2a0). */
export const POISON_GREEN = ['#0b1a08', '#17380f', '#2b6a1a', '#4ca028', '#8ad83a', '#c4f56a', '#eaffb0', '#ffffff']
export const RICOCHET_LEAF = ['#27361a', '#46612b', '#6f9446', '#9cc46b', '#c9f2a0', '#ddf7c0', '#effce0', '#ffffff']
/** Wolf roar (silver-blue, same family as the claw slash). */
export const WOLF_SILVER = ['#0c1424', '#1c2c4a', '#34507a', '#5b82ad', '#8db4d4', '#c4dcec', '#eaf6ff', '#ffffff']

/** coin-drop: seconds of its own time until every coin has settled on the floor (they wink out from 2.15 s on). */
export const COIN_DROP_UNTIL = 1.35
/** coin-drop (seeded, so always the same): where each coin lies at COIN_DROP_UNTIL, local px from the origin, left to
 * right. The battle lifts its flying coins off from here so the swap from baked sheet to sprites doesn't jump.
 * tests/coin-fx.test.ts re-measures them. */
export const COIN_DROP_REST = {
  3: [-55, 2, 37],
  6: [-55, -41, -17, 9, 26, 53],
  10: [-56, -48, -31, -22, -5, 7, 31, 38, 45, 50],
} as const

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
  zapBolt: { mod: zapStrike },
  zapYellow: {
    mod: zapStrike,
    opts: { palette: ZAP_YELLOW, sparks: ZAP_YELLOW_SPARKS },
  },
  // Fire
  fireball: { mod: fireball, until: 1.2 },
  fireTornado: { mod: fireTornado, until: 1.6 },
  // Ice
  frostNova: { mod: frostNova, from: 0.2, until: 2.5 },
  iceLance: { mod: iceLance, until: 0.8 },
  iceSpikes: { mod: iceSpikes, until: 2.4 },
  // Lightning
  lightningStrike: { mod: lightningStrike, from: 0.45, until: 2.2 },
  chainLightning: { mod: chainLightning },
  thunderclap: { mod: thunderclap, from: 0.2, until: 1.6 },
  // Arcane
  magicCircle: { mod: magicCircleCast, from: 0.5, until: 3.2 },
  runeCircle: { mod: runeCircle, until: 1.6 },
  arcaneMissiles: { mod: arcaneMissiles, until: 1.6 },
  arcaneBeam: { mod: arcaneBeam, until: 1.2 },
  starFall: { mod: starFall, until: 2.2 },
  // Archer
  arrowShot: { mod: arrowShot, until: 0.35 }, // looping: drop the last frame (t = 0.4 repeats t = 0) so the loop is seamless
  arrowHit: { mod: arrowHit },
  arrowRain: { mod: arrowRain },
  pierceShot: { mod: pierceShot },
  snareTrap: { mod: snareTrap },
  huntMark: { mod: huntMark },
  // Beastmaster
  hawkDive: { mod: hawkDive },
  clawSlash: { mod: clawSlash },
  boarCharge: { mod: boarCharge },
  boarGuard: { mod: boarGuard },
  beastRoar: { mod: beastRoar },
  stampede: { mod: stampede },
  // Thief line
  daggerCross: { mod: daggerCross },
  shadowSlash: { mod: shadowSlash },
  venomStab: { mod: venomStab },
  smokeBomb: { mod: smokeBomb },
  flyingKnife: { mod: flyingKnife, until: 0.25 }, // looping: drop the last frame (t = 0.3 repeats t = 0)
  knifeStorm: { mod: knifeStorm },
  // Swordsman line
  sealCut: { mod: sealCut },
  silenceSeal: { mod: silenceSeal },
  castBreak: { mod: castBreak },
  cleanse: { mod: cleanse },
  awakenBurst: { mod: awakenBurst },
  awakenAura: { mod: awakenAura, until: 0.75 }, // looping: drop the last frame (t = 0.8 repeats t = 0)
  windWave: { mod: windWave, until: 0.25 }, // looping: drop the last frame
  // Loot: a kill goes up in a poof and coins bounce out. Cut once they settle (~1.25 s); the battle then flies
  // them to the zeny counter. One bake per coin count (the count is an option, not a palette).
  coinDrop3: { mod: coinDrop, until: COIN_DROP_UNTIL, opts: { coins: 3 } },
  coinDrop6: { mod: coinDrop, until: COIN_DROP_UNTIL, opts: { coins: 6 } },
  coinDrop10: { mod: coinDrop, until: COIN_DROP_UNTIL, opts: { coins: 10 } },
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
  const { duration } = def.mod.meta
  const [w, h] = def.size ?? def.mod.meta.size
  const [ox, oy] = def.origin ?? def.mod.meta.origin
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

/** Shared by playPfx / loopPfx: bakes, then makes the sprite at (x, y) = the effect's own origin. */
function makeSprite(scene: Phaser.Scene, id: PfxId, x: number, y: number, o: PfxPlay): { spr: Phaser.GameObjects.Sprite; key: string } | undefined {
  if (!bake(scene, id, o.palette)) return undefined
  const def: PfxDef = DEFS[id]
  const key = texKey(id, o.palette), [w, h] = def.size ?? def.mod.meta.size, [ox, oy] = def.origin ?? def.mod.meta.origin
  const spr = scene.add.sprite(x, y, key, 0)
    .setOrigin(o.flip ? 1 - ox / w : ox / w, oy / h)
    .setScale(o.scale ?? 2)
    .setFlipX(!!o.flip)
    .setAlpha(o.alpha ?? 1)
    .setDepth(o.depth ?? 9001)
  spr.anims.timeScale = o.speed ?? 1.5
  return { spr, key }
}

/**
 * Plays an effect once at (x, y) = the effect's own origin (feet / impact point) and removes it.
 * Never awaited by battle logic: it is decoration only.
 */
export function playPfx(scene: Phaser.Scene, id: PfxId, x: number, y: number, o: PfxPlay = {}) {
  const made = makeSprite(scene, id, x, y, o)
  if (!made) return undefined
  const { spr, key } = made
  spr.play(key)
  spr.once('animationcomplete', () => spr.destroy())
  return spr
}

/** Like playPfx but loops forever (a projectile in flight): the caller moves it and destroys it. */
export function loopPfx(scene: Phaser.Scene, id: PfxId, x: number, y: number, o: PfxPlay = {}): Phaser.GameObjects.Sprite | undefined {
  const made = makeSprite(scene, id, x, y, o)
  if (!made) return undefined
  made.spr.play({ key: made.key, repeat: -1 })
  return made.spr
}

/** The coin-drop bake for each coin count the battle uses. */
export const COIN_DROP_IDS = { 3: 'coinDrop3', 6: 'coinDrop6', 10: 'coinDrop10' } as const satisfies Record<number, PfxId>
export const COIN_PFX: PfxId[] = Object.values(COIN_DROP_IDS)

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
  'zapBolt',
  'chainLightning',
  'thunderclap',
  'magicCircle',
  'runeCircle',
  'arcaneMissiles',
  'arcaneBeam',
  'starFall',
]

/** Every effect the Archer line can show (the palette variants are the poison / ricochet arrows). */
export const ARCHER_PFX: PfxPreloadEntry[] = [
  'arrowShot',
  { id: 'arrowShot', palette: POISON_GREEN },
  { id: 'arrowShot', palette: RICOCHET_LEAF },
  'arrowHit',
  { id: 'arrowHit', palette: POISON_GREEN },
  { id: 'arrowHit', palette: RICOCHET_LEAF },
  'arrowRain',
  { id: 'arrowRain', palette: POISON_GREEN },
  'pierceShot',
  'snareTrap',
  'huntMark',
  { id: 'huntMark', palette: WOOD_GOLD },
]

/** Rogue Back Stab: the shadow slash in gold (matches its '#ffd36b' damage text). */
export const ROGUE_GOLD = ['#1e1204', '#4a2e08', '#8a5a12', '#c88a1e', '#ffd36b', '#ffe8a8', '#fff8e0', '#ffffff']
/** Mobster: the dagger cross in its lilac (matches its '#c9a8ff' damage text). */
export const MOB_LILAC = ['#0d0818', '#24163e', '#47306e', '#7454a8', '#a888dc', '#c9a8ff', '#ece0ff', '#ffffff']

/** Every effect the Thief line (Thief · Rogue · Mobster) can show. */
export const THIEF_PFX: PfxPreloadEntry[] = [
  'daggerCross',
  { id: 'daggerCross', palette: MOB_LILAC },
  'shadowSlash',
  { id: 'shadowSlash', palette: ROGUE_GOLD },
  'venomStab',
  'smokeBomb',
  { id: 'daggerCross', palette: ROGUE_GOLD },
  'flyingKnife',
  'knifeStorm',
]

/** Every effect the Beastmaster line can show. */
export const BEAST_PFX: PfxPreloadEntry[] = ['hawkDive', 'clawSlash', 'boarCharge', 'boarGuard', 'beastRoar', { id: 'beastRoar', palette: WOLF_SILVER }, 'stampede']

/** Every effect the Swordsman rework can show (🤐 ดาบสยบมนตร์ · 🗡️ ดาบพิพากษา): cleave = shadow slash in blade gold,
 *  ⚖️ execute = dagger cross in execute red, ★ ดาบสยบคู่ = seal cut in blade gold. */
export const SWORD_PFX: PfxPreloadEntry[] = [
  'sealCut',
  { id: 'sealCut', palette: BLADE_GOLD },
  'silenceSeal',
  'castBreak',
  'cleanse',
  'awakenBurst',
  'awakenAura',
  'windWave',
  { id: 'shadowSlash', palette: BLADE_GOLD },
  { id: 'daggerCross', palette: EXEC_RED },
  { id: 'runeCircle', palette: SEAL_BLUE },
]
export { BLADE_GOLD, EXEC_RED, SEAL_BLUE }
