// ===== D14 textures 🧪 ห้องแล็บโคลน ชั้น 1. Procedural, every monster faces left (toward the hero). =====
// Palette: pale lab-grown skin, bio-green glow, steel lab tags, each clone wearing its class's colours.
import type Phaser from 'phaser'
import type { EyesFn, MakeFn } from '../textures'

type G = Phaser.GameObjects.Graphics
const SKIN = 0xcfe8de // pale cloned skin
const GLOW = 0x34d399 // bio-green
const EYE = 0x5eead4

/** A lab-grown humanoid: tank glow behind, legs, tunic in the class colour, head, glowing eyes, a lab tag on the chest. */
function cloneBody(g: G, eyes: EyesFn, w: number, h: number, tunic: number, hair: number) {
  const cx = w / 2
  g.fillStyle(GLOW, 0.16).fillCircle(cx, h * 0.5, Math.min(w, h) * 0.46) // incubation glow
  g.fillStyle(0x1f2a33).fillRoundedRect(cx - 9, h - 14, 7, 14, 2).fillRoundedRect(cx + 2, h - 14, 7, 14, 2) // boots
  g.fillStyle(tunic).fillRoundedRect(cx - 12, h * 0.42, 24, h * 0.36, 6) // tunic
  g.fillStyle(0xe5e7eb).fillRect(cx - 4, h * 0.5, 9, 5) // lab tag
  g.fillStyle(GLOW).fillRect(cx - 3, h * 0.5 + 1, 3, 3)
  g.fillStyle(SKIN).fillCircle(cx - 1, h * 0.3, 10) // head
  g.fillStyle(hair).fillEllipse(cx + 1, h * 0.3 - 8, 22, 10) // hair
  eyes(g, cx - 7, cx - 1, h * 0.3, EYE, 1.8)
  g.lineStyle(1, GLOW, 0.8).strokeCircle(cx - 1, h * 0.3, 10) // tube-line seam
}

export function drawD14(make: MakeFn, eyes: EyesFn) {
  // ----- normals -----
  make('clonesword', 48, 56, (g) => {
    cloneBody(g, eyes, 48, 56, 0x3b5f8f, 0x1e293b)
    g.fillStyle(0xd1d5db).fillRect(0, 30, 18, 3) // sword pointing left
    g.fillStyle(0x8d7244).fillRect(16, 28, 4, 7)
    g.fillStyle(0x64748b).fillRoundedRect(30, 26, 10, 16, 3) // buckler on the back arm
  })

  make('clonearcher', 48, 56, (g) => {
    cloneBody(g, eyes, 48, 56, 0x3f6b3a, 0x854d0e)
    g.lineStyle(2, 0x8d7244).beginPath().arc(8, 32, 12, Math.PI * 0.6, Math.PI * 1.4).strokePath() // bow
    g.lineStyle(1, 0xe5e7eb).lineBetween(4, 21, 4, 43) // string
    g.fillStyle(0xe5e7eb).fillRect(0, 31, 16, 2) // nocked arrow
    g.fillStyle(0x6b4b2a).fillRect(32, 22, 6, 18) // quiver
  })

  make('clonemage', 48, 58, (g) => {
    cloneBody(g, eyes, 48, 58, 0x4c1d95, 0xf3f4f6)
    g.fillStyle(0x312e81).fillTriangle(12, 12, 24, -2, 36, 12) // pointed hat
    g.fillStyle(0x8d7244).fillRect(6, 18, 3, 36) // staff
    g.fillStyle(0xf97316).fillCircle(7, 16, 5); g.fillStyle(0xfde68a).fillCircle(7, 16, 2) // fire orb
  })

  make('clonecleric', 48, 56, (g) => {
    cloneBody(g, eyes, 48, 56, 0xf1f5f9, 0xfacc15)
    g.fillStyle(0xfacc15).fillRect(22, 26, 3, 14).fillRect(18, 30, 11, 3) // holy cross on the robe
    g.fillStyle(0x9ca3af).fillRect(4, 28, 12, 4) // mace
    g.fillStyle(0xfde68a, 0.6).fillCircle(4, 30, 6) // healing light
  })

  make('clonethief', 46, 54, (g) => {
    cloneBody(g, eyes, 46, 54, 0x1f2937, 0x7f1d1d)
    g.fillStyle(0x111827).fillRect(12, 18, 22, 5) // face mask
    g.fillStyle(0xd1d5db).fillTriangle(0, 30, 14, 28, 14, 33).fillTriangle(30, 34, 44, 32, 30, 38) // twin daggers
    g.fillStyle(0x84cc16).fillCircle(2, 30, 2) // poison drip
  })

  make('clonereject', 52, 52, (g) => {
    g.fillStyle(GLOW, 0.2).fillCircle(26, 28, 24) // leaking fluid glow
    g.fillStyle(0x9fb8ad).fillEllipse(26, 34, 44, 30) // half-formed body
    g.fillStyle(SKIN).fillCircle(18, 22, 9).fillCircle(32, 26, 6) // two misshapen heads
    eyes(g, 14, 20, 22, 0xfacc15, 1.6)
    g.fillStyle(0xef4444).fillCircle(32, 26, 1.8) // one red eye
    g.fillStyle(GLOW).fillCircle(12, 40, 3).fillCircle(36, 44, 2.5).fillCircle(26, 46, 2) // unstable cells
    g.fillStyle(0xe5e7eb).fillRect(30, 34, 10, 5) // dangling lab tag
  })

  // ----- mini bosses -----
  make('cloneknight', 88, 94, (g) => {
    g.fillStyle(GLOW, 0.18).fillCircle(44, 48, 42)
    g.fillStyle(0xfde68a).fillEllipse(54, 70, 44, 22) // cloned peco body
    g.fillStyle(0xf59e0b).fillTriangle(30, 62, 20, 56, 30, 70) // peco beak facing left
    g.fillStyle(0x1f2a33).fillRect(42, 78, 6, 16).fillRect(62, 78, 6, 16) // peco legs
    g.fillStyle(0x334e7a).fillRoundedRect(40, 26, 26, 30, 6) // knight armour
    g.fillStyle(0xe5e7eb).fillRect(48, 34, 10, 6); g.fillStyle(GLOW).fillRect(50, 35, 4, 4) // lab tag
    g.fillStyle(0x475569).fillRoundedRect(42, 6, 22, 22, 6) // helm
    g.fillStyle(SKIN).fillRect(44, 14, 14, 8) // visor gap
    eyes(g, 46, 53, 18, EYE, 1.9)
    g.fillStyle(0xd1d5db).fillTriangle(0, 34, 40, 30, 40, 36) // lance pointing left
    g.fillStyle(0x8d7244).fillRect(36, 28, 6, 12)
  })

  make('clonewizard', 84, 94, (g) => {
    g.fillStyle(0x93c5fd, 0.2).fillCircle(42, 48, 40) // storm aura
    g.fillStyle(0x1e1b4b).fillTriangle(16, 94, 68, 94, 42, 30) // long robe
    g.fillStyle(0x93c5fd).fillRect(40, 50, 4, 40) // robe trim
    g.fillStyle(0xe5e7eb).fillRect(46, 58, 10, 6); g.fillStyle(GLOW).fillRect(48, 59, 4, 4) // lab tag
    g.fillStyle(SKIN).fillCircle(42, 28, 12)
    g.fillStyle(0x312e81).fillTriangle(24, 22, 44, -2, 62, 22) // tall hat
    eyes(g, 35, 42, 28, 0x93c5fd, 2)
    g.fillStyle(0x8d7244).fillRect(10, 30, 4, 56) // staff
    g.fillStyle(0x93c5fd).fillCircle(12, 26, 8); g.fillStyle(0xffffff).fillCircle(12, 26, 3) // storm orb
    g.lineStyle(2, 0xfde68a).lineBetween(4, 14, 10, 22).lineBetween(10, 22, 6, 30) // spark
  })

  // ----- boss -----
  make('protozero', 124, 128, (g) => {
    g.fillStyle(GLOW, 0.14).fillCircle(62, 64, 60) // incubation tank glow
    g.lineStyle(3, 0x94a3b8, 0.8).strokeRoundedRect(14, 6, 96, 120, 18) // broken tank frame
    g.fillStyle(0x0b2a24, 0.5).fillRoundedRect(16, 8, 92, 116, 16)
    g.fillStyle(0x1f2a33).fillRoundedRect(46, 100, 12, 26, 3).fillRoundedRect(66, 100, 12, 26, 3) // legs
    // tunic stitched from the five class colours
    g.fillStyle(0x3b5f8f).fillRect(40, 52, 9, 50)
    g.fillStyle(0x3f6b3a).fillRect(49, 52, 9, 50)
    g.fillStyle(0x4c1d95).fillRect(58, 52, 9, 50)
    g.fillStyle(0xf1f5f9).fillRect(67, 52, 9, 50)
    g.fillStyle(0x1f2937).fillRect(76, 52, 9, 50)
    g.fillStyle(0xe5e7eb).fillRect(54, 60, 16, 8); g.fillStyle(GLOW).fillRect(57, 62, 10, 4) // "00" tag
    g.fillStyle(SKIN).fillCircle(62, 36, 16) // head
    g.lineStyle(2, GLOW).strokeCircle(62, 36, 16)
    g.fillStyle(0x0f172a).fillRect(48, 30, 28, 6) // visor
    eyes(g, 54, 64, 33, EYE, 2.4)
    g.fillStyle(GLOW).fillRect(60, 14, 4, 8).fillRect(52, 18, 3, 6).fillRect(69, 18, 3, 6) // feeding tubes
    g.fillStyle(0xd1d5db).fillTriangle(0, 64, 40, 60, 40, 68) // sword arm pointing left
    g.fillStyle(0xf97316, 0.85).fillCircle(100, 70, 8); g.fillStyle(0xfde68a).fillCircle(100, 70, 3) // spell hand
  })
}
