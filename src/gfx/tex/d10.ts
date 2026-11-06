// ===== D10 textures (v83) ห้วงนิทราไร้ดาว. Procedural, every monster faces left (toward the hero), sizes like D7 / D8. =====
// Palette: starless black, deep violet, dream lavender, a few cold star specks.
import type { EyesFn, MakeFn } from '../textures'

export function drawD10(make: MakeFn, eyes: EyesFn) {
  // ----- normals -----
  make('nightmarehound', 58, 42, (g) => {
    g.fillStyle(0x7a3aff, 0.18).fillEllipse(30, 24, 58, 30) // dream haze
    g.fillStyle(0x1a1230).fillTriangle(44, 18, 58, 8, 50, 24) // smoky tail
    g.fillStyle(0x6a3ad0, 0.7).fillTriangle(52, 12, 58, 4, 56, 16)
    g.fillStyle(0x1a1230).fillEllipse(32, 24, 32, 14) // lean body
    g.fillStyle(0x140e26).fillRect(18, 28, 4, 12).fillRect(26, 28, 4, 12).fillRect(38, 28, 4, 12).fillRect(44, 28, 4, 12) // legs
    g.fillStyle(0x8a5aff, 0.85).fillTriangle(20, 18, 26, 4, 30, 18).fillTriangle(28, 18, 34, 6, 38, 18).fillTriangle(36, 18, 42, 8, 44, 19) // violet flame mane
    g.fillStyle(0x1a1230).fillEllipse(12, 18, 20, 12).fillTriangle(0, 20, 6, 16, 6, 24) // head + snout
    g.fillStyle(0x1a1230).fillTriangle(12, 14, 14, 2, 18, 12) // ear
    g.fillStyle(0xe8e0ff).fillTriangle(2, 22, 4, 22, 3, 26).fillTriangle(6, 22, 8, 22, 7, 25) // fangs
    eyes(g, 8, 13, 16, 0xc8a0ff, 1.8)
    g.fillStyle(0xe8e0ff, 0.8).fillCircle(50, 32, 1).fillCircle(24, 6, 1) // star specks
  })
  make('voidstalker', 50, 58, (g) => {
    g.fillStyle(0x0e0a1c).fillTriangle(10, 58, 44, 58, 28, 16) // cloak
    g.fillStyle(0x3a2a6a).fillTriangle(16, 56, 22, 56, 26, 30).fillTriangle(34, 56, 40, 56, 30, 30) // folds
    g.fillStyle(0xe8e0ff, 0.9).fillCircle(20, 46, 1).fillCircle(34, 40, 1).fillCircle(28, 52, 1.2).fillCircle(38, 50, 0.8) // star dust in the cloak
    g.fillStyle(0x0e0a1c).fillTriangle(16, 24, 30, 2, 40, 26) // hood
    g.fillStyle(0x000000).fillEllipse(25, 20, 12, 10) // void face
    g.fillStyle(0x5af0ff).fillCircle(22, 19, 2.4); g.fillStyle(0xffffff).fillCircle(21.5, 18.5, 1) // single hunter eye
    g.fillStyle(0x2a1e48).fillRoundedRect(4, 28, 16, 5, 2) // arm reaching left
    g.fillStyle(0xb8c0ff).fillTriangle(0, 18, 6, 30, 3, 34).fillTriangle(0, 18, 3, 22, 8, 30) // curved void blade
    g.fillStyle(0x5af0ff, 0.6).fillTriangle(1, 20, 3, 24, 5, 28)
  })
  make('dreameater', 52, 52, (g) => {
    g.fillStyle(0xb48aff, 0.2).fillCircle(26, 24, 24) // dream glow
    g.fillStyle(0x3a2a6a).fillTriangle(30, 34, 52, 52, 40, 30).fillTriangle(22, 36, 34, 52, 30, 34) // wispy tail (no legs)
    g.fillStyle(0x4a3488).fillEllipse(28, 26, 34, 26) // floating tapir body
    g.fillStyle(0x6a50b0).fillEllipse(30, 30, 22, 12) // belly sheen
    g.fillStyle(0x4a3488).fillEllipse(12, 22, 16, 14) // head
    g.fillStyle(0x4a3488).fillRoundedRect(0, 22, 10, 5, 2).fillCircle(1, 28, 3) // trunk curling down
    g.fillStyle(0xffe0ff, 0.9).fillCircle(1, 33, 3).fillCircle(5, 38, 2).fillCircle(2, 42, 1.5) // dream bubbles it swallows
    g.fillStyle(0x2a1a4a).fillTriangle(14, 14, 18, 4, 22, 14) // ear
    eyes(g, 8, 14, 20, 0xffd0ff, 2)
    g.fillStyle(0x14172b).fillCircle(8, 20, 0.9).fillCircle(14, 20, 0.9)
    g.fillStyle(0xe8e0ff, 0.7).fillCircle(40, 18, 1.5).fillCircle(34, 14, 1) // star spots on the hide
  })
  make('starcolossus', 58, 64, (g) => {
    g.fillStyle(0x16121e).fillRect(14, 48, 11, 16).fillRect(34, 48, 11, 16) // legs
    g.fillStyle(0x2a2438).fillRoundedRect(10, 18, 40, 34, 6) // basalt torso
    g.fillStyle(0x3c3452).fillTriangle(12, 20, 28, 20, 14, 34).fillTriangle(38, 20, 48, 22, 48, 34) // facets
    g.fillStyle(0x5a5470).fillCircle(30, 34, 9) // burnt-out star core (grey, dead)
    g.fillStyle(0x8a80b0, 0.6).fillCircle(29, 33, 5); g.fillStyle(0x16121e).fillRect(29, 26, 2, 16).fillRect(22, 33, 16, 2) // cracked
    g.fillStyle(0x2a2438).fillRoundedRect(0, 22, 12, 24, 4) // fist reaching left
    g.fillStyle(0x2a2438).fillRoundedRect(48, 24, 10, 20, 4)
    g.fillStyle(0x342c48).fillRoundedRect(18, 4, 22, 16, 4) // head
    eyes(g, 22, 30, 12, 0xa8a0d8, 2.2)
    g.fillStyle(0xe8e0ff, 0.9).fillCircle(16, 10, 1).fillCircle(44, 16, 1.2).fillCircle(52, 8, 0.8) // dying specks around it
  })
  make('shade', 44, 52, (g) => {
    g.fillStyle(0x3a1a6a, 0.25).fillEllipse(22, 30, 44, 42) // smear of darkness
    g.fillStyle(0x0a0614, 0.85).fillTriangle(10, 52, 36, 52, 24, 14) // formless body
    g.fillStyle(0x0a0614, 0.6).fillTriangle(30, 50, 44, 46, 32, 30).fillTriangle(6, 46, 16, 50, 14, 34) // trailing tatters
    g.fillStyle(0x0a0614, 0.9).fillCircle(22, 16, 9) // head
    g.fillStyle(0x0a0614, 0.8).fillTriangle(16, 26, 0, 22, 4, 32) // clawed reach to the left
    g.fillStyle(0x8a5aff, 0.5).fillTriangle(0, 22, 4, 24, 2, 28)
    eyes(g, 18, 25, 15, 0xe8e0ff, 1.8)
    g.fillStyle(0xb48aff, 0.6).fillRect(18, 20, 7, 1.5) // faint mouth
  })
  make('lullabymoth', 54, 46, (g) => {
    g.fillStyle(0xe0c8ff, 0.2).fillCircle(27, 22, 22) // sleep-dust halo
    g.fillStyle(0x5a3a9a).fillTriangle(26, 20, 4, 2, 10, 28).fillTriangle(28, 20, 52, 2, 46, 28) // upper wings
    g.fillStyle(0x4a2e80).fillTriangle(26, 24, 10, 42, 22, 30).fillTriangle(28, 24, 44, 42, 32, 30) // lower wings
    g.fillStyle(0xd8c0ff).fillCircle(12, 12, 4).fillCircle(42, 12, 4); g.fillStyle(0x2a1a4a).fillCircle(12, 12, 2).fillCircle(42, 12, 2) // wing eye-spots
    g.fillStyle(0x2a1a4a).fillEllipse(27, 24, 8, 22) // body
    g.fillStyle(0xd8c0ff).fillRect(23, 26, 8, 1.5).fillRect(23, 30, 8, 1.5) // fuzzy bands
    g.fillStyle(0x2a1a4a).fillCircle(24, 13, 4) // head turned left
    g.lineStyle(1, 0x8a6ad0); g.lineBetween(22, 10, 14, 0); g.lineBetween(24, 10, 20, 0) // feathery antennae
    eyes(g, 22, 25, 13, 0xf0e0ff, 1.3)
    g.fillStyle(0xf0e0ff, 0.8).fillCircle(6, 34, 1.5).fillCircle(14, 40, 1).fillCircle(2, 26, 1).fillCircle(48, 36, 1.2) // falling dust
  })

  // ----- mini bosses -----
  make('nightqueen', 84, 94, (g) => {
    g.fillStyle(0x6a3aff, 0.2).fillCircle(42, 46, 42) // night aura
    g.fillStyle(0x1a0e30).fillTriangle(18, 94, 74, 94, 44, 36) // gown
    g.fillStyle(0x3a2270).fillTriangle(30, 94, 40, 94, 44, 50).fillTriangle(52, 94, 62, 94, 46, 50) // gown folds
    g.fillStyle(0xe8e0ff, 0.9).fillCircle(34, 80, 1.2).fillCircle(54, 72, 1).fillCircle(46, 88, 1.4).fillCircle(60, 86, 1) // stars sewn in
    g.fillStyle(0x2a1a4a).fillRoundedRect(32, 32, 24, 26, 8) // bodice
    g.fillStyle(0x0a0614).fillTriangle(48, 16, 76, 70, 58, 24) // long dark hair falling right
    g.fillStyle(0xd8d0f0).fillCircle(42, 22, 10) // pale face
    eyes(g, 37, 44, 22, 0x7a2aff, 2)
    g.fillStyle(0x7a2aff).fillRect(38, 27, 6, 1.5) // dark lips
    g.fillStyle(0xc8b8ff).fillTriangle(32, 12, 36, 0, 40, 12).fillTriangle(40, 12, 44, -2, 48, 12).fillTriangle(48, 12, 52, 2, 54, 13) // crescent crown points
    g.fillStyle(0xf0e8ff).fillCircle(44, 4, 2)
    g.fillStyle(0x2a1a4a).fillRoundedRect(10, 36, 24, 6, 3) // arm holding the scepter left
    g.fillStyle(0x8a7aa8).fillRect(8, 24, 3, 46) // scepter
    g.fillStyle(0x0a0614).fillCircle(9, 20, 7); g.fillStyle(0x9a5aff).fillCircle(9, 20, 4.5); g.fillStyle(0xf0e0ff).fillCircle(8, 19, 1.5) // nightmare orb
    g.fillStyle(0xc8b8ff).fillTriangle(2, 14, 9, 10, 4, 20) // crescent on the orb
  })
  make('eclipseknight', 88, 94, (g) => {
    g.lineStyle(5, 0xffc04a, 0.85); g.strokeCircle(48, 26, 22) // eclipse corona halo
    g.fillStyle(0x0a0614).fillCircle(48, 26, 19) // the dark sun behind its head
    g.fillStyle(0x1a1626).fillRoundedRect(34, 74, 11, 20, 2).fillRoundedRect(52, 74, 11, 20, 2) // legs
    g.fillStyle(0x24202e).fillRoundedRect(28, 36, 42, 42, 8) // black plate
    g.fillStyle(0xd8a040).fillRect(30, 50, 38, 3).fillRect(47, 38, 3, 38) // gold trim cross
    g.fillStyle(0x3a3448).fillCircle(30, 38, 10).fillCircle(68, 38, 10) // pauldrons
    g.fillStyle(0xd8a040).fillCircle(30, 38, 3).fillCircle(68, 38, 3)
    g.fillStyle(0x2e2a3a).fillRoundedRect(38, 14, 22, 24, 6) // helm
    g.fillStyle(0x000000).fillRect(40, 23, 14, 4) // visor slit
    eyes(g, 43, 50, 25, 0xffd060, 1.6)
    g.fillStyle(0x2e2a3a).fillRoundedRect(14, 42, 18, 8, 3) // arm forward
    g.fillStyle(0xd8a040).fillRect(12, 40, 6, 12) // crossguard
    g.fillStyle(0xc8c0e0).fillTriangle(0, 44, 14, 42, 14, 50).fillRect(0, 44, 2, 4) // blade tip
    g.fillStyle(0xc8c0e0).fillRect(2, 44, 12, 4); g.fillStyle(0x0a0614).fillRect(2, 47, 12, 1.5) // half light, half shadow edge
    g.fillStyle(0x0a0614).fillTriangle(70, 44, 88, 90, 66, 80) // tattered dark cape
  })

  // ----- boss -----
  make('starweaver', 120, 124, (g) => {
    g.fillStyle(0x4a1aaa, 0.2).fillCircle(60, 60, 60) // galaxy aura
    g.fillStyle(0x7a4aff, 0.15).fillEllipse(60, 62, 116, 54)
    g.lineStyle(1, 0xb8a8ff, 0.7) // constellation threads it weaves
    g.lineBetween(96, 18, 108, 34); g.lineBetween(108, 34, 102, 52); g.lineBetween(102, 52, 114, 70); g.lineBetween(14, 92, 24, 106); g.lineBetween(24, 106, 40, 112)
    g.fillStyle(0xf0e8ff).fillCircle(96, 18, 2).fillCircle(108, 34, 2.2).fillCircle(102, 52, 1.6).fillCircle(114, 70, 2).fillCircle(14, 92, 1.6).fillCircle(24, 106, 2).fillCircle(40, 112, 1.4)
    g.fillStyle(0x0a0614).fillTriangle(26, 124, 100, 124, 62, 30) // void robe
    g.fillStyle(0x24124a).fillTriangle(40, 124, 56, 124, 62, 56).fillTriangle(70, 124, 86, 124, 64, 56) // folds
    g.fillStyle(0xe8e0ff, 0.85).fillCircle(48, 98, 1.2).fillCircle(72, 88, 1.4).fillCircle(60, 110, 1).fillCircle(84, 112, 1.2).fillCircle(54, 76, 1) // stars it has swallowed
    g.fillStyle(0x0a0614).fillTriangle(40, 40, 6, 64, 20, 48).fillTriangle(84, 40, 116, 56, 96, 60) // sleeves
    g.fillStyle(0x0a0614).fillCircle(62, 30, 20) // hood
    g.fillStyle(0x000000).fillEllipse(58, 32, 26, 24) // empty face
    g.fillStyle(0xc8a8ff).fillCircle(52, 28, 2.4).fillCircle(60, 26, 2).fillCircle(56, 36, 1.6).fillCircle(64, 34, 1.4).fillCircle(50, 38, 1.2) // a cluster of star eyes
    g.fillStyle(0xffffff).fillCircle(52, 28, 1).fillCircle(60, 26, 0.8)
    g.fillStyle(0x24124a).fillTriangle(50, 12, 62, -2, 74, 12) // hood peak
    g.fillStyle(0x8a5aff).fillTriangle(60, 4, 62, -2, 64, 4)
    g.fillStyle(0x7a4aff, 0.35).fillCircle(10, 62, 14) // black-hole orb in the left hand
    g.fillStyle(0x000000).fillCircle(10, 62, 9)
    g.lineStyle(2, 0xd8b8ff, 0.9); g.strokeEllipse(10, 62, 26, 8) // accretion ring
    g.fillStyle(0xf0e8ff).fillCircle(4, 60, 1).fillCircle(17, 64, 1.2)
  })
}
