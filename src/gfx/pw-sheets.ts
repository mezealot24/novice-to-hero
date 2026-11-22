// Hand-drawn VFX sprite sheets made in Pixelwright (pixel-art studio), one PNG strip per effect in src/gfx/pw/.
// They stand in for a pixelfx effect of the same id: playPfx / loopPfx in pixelfx.ts pick the sheet when it is
// loaded, and fall back to the procedural bake otherwise (first frames of a battle, tests, PW_SHEETS_ON off).
// The PNGs are inlined by vite-plugin-singlefile, so the one-file build still works.
import type Phaser from 'phaser'
import sealCutUrl from './pw/pw-seal-cut.png'
import awakenBurstUrl from './pw/pw-awaken-burst.png'
import windWaveUrl from './pw/pw-wind-wave.png'
import { BLADE_GOLD, SEAL_BLUE, WAVE_JADE } from './fx/sword/_pal'

/** Master switch: false = every effect uses its pixelfx bake again. */
export const PW_SHEETS_ON = true

export interface PwSheet {
  url: string
  /** One frame's size in art px; the PNG is a left-to-right strip. */
  w: number
  h: number
  /** Per-frame duration (ms) as authored in the studio. */
  ms: number[]
  /** The anchor in art px (same meaning as a pixelfx origin: impact point / feet). */
  origin: [number, number]
  /** Multiplies the play scale: the sheets are drawn smaller than the pixelfx canvases. */
  mul: number
  /** The palette the art is drawn in, so a play palette (e.g. BLADE_GOLD) can be remapped onto it step by step. */
  ramp: string[]
}

export const PW_SHEETS = {
  // 🤐 ดาบสยบมนตร์: X cut, then a rune diamond seals the crossing (Pixelwright "seal-cut")
  sealCut: { url: sealCutUrl, w: 72, h: 64, ms: [50, 60, 90, 70, 90, 90, 70, 70], origin: [36, 29], mul: 2, ramp: SEAL_BLUE },
  // ⚔️ ปลุกดาบ: a gold light sword drops and plants itself, shockwave ring + motes (Pixelwright "awaken-burst")
  awakenBurst: { url: awakenBurstUrl, w: 64, h: 80, ms: [50, 50, 110, 90, 90, 100, 100, 100], origin: [32, 72], mul: 2, ramp: BLADE_GOLD },
  // 🌊 คลื่นดาบ: a rounded energy dome flying forward, bright rim + white core streak, layered streaks flowing back
  // into tail wisps over a smoky inside, loops (Pixelwright "sword-wave-dome", Q 2026-11-22 reference; replaces the
  // Guile-style "sword-wave-blast"). Origin = the rim's tip; windWaveFx flies it at chest height.
  windWave: { url: windWaveUrl, w: 100, h: 52, ms: [60, 60, 60, 60], origin: [93, 26], mul: 2, ramp: WAVE_JADE },
} satisfies Record<string, PwSheet>

export type PwId = keyof typeof PW_SHEETS

const hex = (c: string | number) =>
  typeof c === 'number' ? '#' + (c >>> 0).toString(16).padStart(6, '0').slice(-6) : '#' + String(c).replace(/^#/, '').toLowerCase()

export const pwKey = (id: PwId, palette?: (string | number)[]) =>
  `pw_${id}${palette && palette.length ? '_' + palette.map((c) => hex(c).slice(1)).join('-') : ''}`

const pending = new Set<string>()

/** Recolours the art from its own ramp onto `palette`, step for step (unknown colours stay as they are). */
function remap(img: HTMLImageElement, from: string[], to: (string | number)[]): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = img.width
  cv.height = img.height
  const ctx = cv.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, cv.width, cv.height)
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const map = new Map<number, number[]>()
  from.forEach((c, i) => {
    const t = to[Math.min(i, to.length - 1)]
    if (t === undefined) return
    const [r, g, b] = rgb(hex(c))
    map.set((r << 16) | (g << 8) | b, rgb(hex(t)))
  })
  const d = data.data
  for (let p = 0; p < d.length; p += 4) {
    if (!d[p + 3]) continue
    const m = map.get((d[p] << 16) | (d[p + 1] << 8) | d[p + 2])
    if (m) [d[p], d[p + 1], d[p + 2]] = m
  }
  ctx.putImageData(data, 0, 0)
  return cv
}

/** Starts loading one sheet (optionally recoloured). Returns true once it is ready to play. */
export function pwReady(scene: Phaser.Scene, id: PwId, palette?: (string | number)[]): boolean {
  if (!PW_SHEETS_ON) return false
  const key = pwKey(id, palette)
  if (scene.textures.exists(key)) return true
  if (pending.has(key) || typeof Image === 'undefined' || typeof document === 'undefined') return false
  pending.add(key)
  const def: PwSheet = PW_SHEETS[id]
  const img = new Image()
  img.onload = () => {
    pending.delete(key)
    if (scene.textures.exists(key)) return
    const src = palette && palette.length ? remap(img, def.ramp, palette) : img
    const tex = scene.textures.addSpriteSheet(key, src as HTMLImageElement, { frameWidth: def.w, frameHeight: def.h })
    tex?.setFilter(1) // NEAREST
    if (!scene.anims.exists(key)) {
      scene.anims.create({ key, frames: def.ms.map((duration, frame) => ({ key, frame, duration })), frameRate: 1000 / def.ms[0] })
    }
  }
  img.onerror = () => pending.delete(key)
  img.src = def.url
  return false
}

export const isPwId = (id: string): id is PwId => PW_SHEETS_ON && id in PW_SHEETS
