// Dynamic pixel-art Chain Lightning VFX helper (renders src/gfx/chain-arc.ts across live monster positions).
// Decoration only: never awaited by battle logic.
import type Phaser from 'phaser'
import * as chainArc from '../gfx/chain-arc'
import type { ChainNode } from '../gfx/chain-arc'
import { clearFrame, composite, createFrame, createFx } from '../vendor/pixelfx/core/index.js'

export interface ChainTargetLike {
  dead: boolean
  slot: number
  spr: {
    x: number
    y: number
    displayHeight: number
  }
}

export interface ChainSelection<T extends ChainTargetLike> {
  chain: T[]
  originDead?: T
}

export interface ChainLightningFxParams {
  chain: readonly ChainTargetLike[]
  originDead?: ChainTargetLike
  overloadBack?: boolean
  palette?: (string | number)[]
  sparks?: string[]
  speed?: number
  depth?: number
  seed?: number
}

const PIXEL_SCALE = 2
const RENDER_FPS = 30
const DEFAULT_SPEED = 0.78
const DEFAULT_DEPTH = 9003
const PAD_X = 64
const PAD_TOP = 92
const PAD_BOT = 30

let dynSeq = 0

function normHex(c: string | number): string {
  if (typeof c === 'number') {
    return '#' + (c >>> 0).toString(16).padStart(6, '0').slice(-6).toLowerCase()
  }
  let s = String(c).trim().toLowerCase().replace(/^#/, '')
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]
  return '#' + s
}

/**
 * Picks Chain Lightning targets starting from `hitTarget` (`ตัวที่ตี`) and spreading outward to the nearest
 * unvisited alive monsters (`กระจายไปตัวอื่นๆ`). Deprioritizes Maiden-guarded invulnerable monsters.
 * If `hitTarget` died right before the proc rolled, returns `originDead` so the VFX arcs from its spot to `chain[0]`.
 */
export function pickChainTargets<T extends ChainTargetLike>(
  hitTarget: T | undefined,
  alive: readonly T[],
  jumps: number,
  isGuarded?: (m: T) => boolean,
): ChainSelection<T> {
  if (jumps <= 0 || alive.length === 0) return { chain: [] }
  const guarded = (m: T) => (isGuarded ? Number(isGuarded(m)) : 0)
  const sortedAlive = [...alive].sort((a, b) => guarded(a) - guarded(b) || a.slot - b.slot)

  const aliveHit = hitTarget && !hitTarget.dead ? hitTarget : undefined
  const first = aliveHit ?? sortedAlive[0]
  if (!first) return { chain: [] }

  const chain: T[] = [first]
  const used = new Set<T>([first])
  let cur = first
  while (chain.length < jumps) {
    let best: T | undefined
    let bestGuard = Infinity
    let bestDist = Infinity
    let bestSlot = Infinity
    for (const m of sortedAlive) {
      if (used.has(m)) continue
      const g = guarded(m)
      const d = Math.abs(m.spr.x - cur.spr.x)
      if (g < bestGuard || (g === bestGuard && (d < bestDist || (d === bestDist && m.slot < bestSlot)))) {
        best = m
        bestGuard = g
        bestDist = d
        bestSlot = m.slot
      }
    }
    if (!best) break
    chain.push(best)
    used.add(best)
    cur = best
  }

  return {
    chain,
    originDead: hitTarget && hitTarget.dead && hitTarget !== first ? hitTarget : undefined,
  }
}

function toWorldNode(m: ChainTargetLike): Required<ChainNode> {
  const chestOff = Math.max(24, m.spr.displayHeight * 0.45)
  return {
    x: m.spr.x,
    y: m.spr.y - chestOff,
    groundY: m.spr.y,
  }
}

/**
 * Plays a dynamic pixel-art Chain Lightning arc connecting the struck monster (`chain[0]` or `originDead`)
 * across all chained targets at their exact world coordinates.
 */
export function playChainLightningFx(scene: Phaser.Scene, params: ChainLightningFxParams): Phaser.GameObjects.Image | undefined {
  if (!params.chain.length) return undefined

  const worldNodes = params.chain.map(toWorldNode)
  const worldOrigin = params.originDead ? toWorldNode(params.originDead) : undefined
  const allWorld = worldOrigin ? [worldOrigin, ...worldNodes] : worldNodes

  const minX = Math.floor(Math.min(...allWorld.map((n) => n.x)) - PAD_X)
  const maxX = Math.ceil(Math.max(...allWorld.map((n) => n.x)) + PAD_X)
  const minY = Math.floor(Math.min(...allWorld.map((n) => n.y)) - PAD_TOP)
  const maxY = Math.ceil(Math.max(...allWorld.map((n) => n.groundY)) + PAD_BOT)

  const w = Math.max(48, Math.ceil((maxX - minX) / PIXEL_SCALE))
  const h = Math.max(48, Math.ceil((maxY - minY) / PIXEL_SCALE))

  const anchor = allWorld[0]
  const ox = Math.round((anchor.x - minX) / PIXEL_SCALE)
  const oy = Math.round((anchor.groundY - minY) / PIXEL_SCALE)

  const toLocal = (n: Required<ChainNode>): ChainNode => ({
    x: (n.x - anchor.x) / PIXEL_SCALE,
    y: (n.y - anchor.groundY) / PIXEL_SCALE,
    groundY: (n.groundY - anchor.groundY) / PIXEL_SCALE,
  })

  const key = `pfx_dyn_chain_${++dynSeq}`
  const canvas = scene.textures.createCanvas(key, w, h)
  if (!canvas) return undefined
  const ctx = canvas.getContext()
  const frame = createFrame(w, h)
  const img = new ImageData(w, h)
  const palette = params.palette?.length ? params.palette.map(normHex) : undefined
  const fx = createFx(chainArc, {
    x: ox,
    y: oy,
    nodes: worldNodes.map(toLocal),
    originNode: worldOrigin ? toLocal(worldOrigin) : undefined,
    overloadBack: params.overloadBack,
    palette,
    sparks: params.sparks,
    seed: params.seed ?? Math.floor(Math.random() * 0xffff) + 1,
  })

  const renderAtFrame = () => {
    clearFrame(frame)
    fx.draw(frame)
    composite(frame, img.data, null)
    ctx.putImageData(img, 0, 0)
    canvas.refresh()
  }

  renderAtFrame()
  canvas.setFilter(1) // Phaser.Textures.FilterMode.NEAREST

  const spr = scene.add
    .image(anchor.x, anchor.groundY, key)
    .setOrigin(ox / w, oy / h)
    .setScale(PIXEL_SCALE)
    .setDepth(params.depth ?? DEFAULT_DEPTH)

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    if (spr.scene && spr.active) spr.destroy()
    if (scene.textures?.exists(key)) scene.textures.remove(key)
  }
  spr.once('destroy', cleanup)

  const duration = chainArc.meta.duration
  const speed = params.speed ?? DEFAULT_SPEED
  let simT = 0
  let lastDrawT = 0

  scene.tweens.addCounter({
    from: 0,
    to: duration,
    duration: Math.max(100, Math.round((duration * 1000) / speed)),
    onUpdate: (tween: Phaser.Tweens.Tween) => {
      if (cleaned || !spr.active) return
      const curT = tween.getValue() ?? 0
      if (curT - lastDrawT < 1 / RENDER_FPS && curT < duration) return
      const dt = curT - simT
      if (dt > 0) {
        fx.update(dt)
        simT = curT
      }
      renderAtFrame()
      lastDrawT = curT
    },
    onComplete: cleanup,
  })

  return spr
}
