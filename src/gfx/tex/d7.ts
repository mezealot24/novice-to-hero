// ===== D7 ❄️ ยอดเขาน้ำแข็งนิรันดร์ textures (v79). Procedural, every monster faces left (toward the hero), sizes like D6. =====
import type { EyesFn, MakeFn } from '../textures'

export function drawD7(make: MakeFn, eyes: EyesFn) {
  make('yeti', 52, 62, (g) => {
    g.fillStyle(0xb8cce0).fillRoundedRect(16, 46, 8, 16, 3).fillRoundedRect(30, 46, 8, 16, 3) // legs
    g.fillStyle(0xeef6ff).fillRoundedRect(10, 18, 34, 34, 12) // shaggy body
    g.fillStyle(0xd0e2f2).fillTriangle(10, 40, 16, 52, 20, 40).fillTriangle(34, 40, 40, 52, 44, 40) // fur tufts
    g.fillStyle(0xeef6ff).fillRoundedRect(0, 26, 14, 9, 4) // arm reaching out
    g.fillStyle(0x9fc8e8).fillTriangle(0, 34, 3, 40, 6, 34).fillTriangle(6, 34, 9, 40, 12, 34) // icy claws
    g.fillStyle(0xeef6ff).fillCircle(22, 14, 11) // head
    g.fillStyle(0x6a8ab0).fillEllipse(18, 16, 12, 9) // blue face
    eyes(g, 15, 21, 14, 0x3affff, 1.8)
    g.fillStyle(0xffffff).fillTriangle(14, 19, 16, 23, 18, 19) // fang
    g.fillStyle(0xa8c8e0).fillTriangle(26, 6, 34, 0, 30, 10) // horn
  })
  make('frostwolf', 52, 38, (g) => {
    g.fillStyle(0xc8dcf0).fillEllipse(30, 22, 34, 16) // body
    g.fillStyle(0x8aaacc).fillRect(18, 26, 4, 12).fillRect(38, 26, 4, 12).fillRect(26, 28, 4, 10)
    g.fillStyle(0xeef6ff).fillTriangle(22, 14, 30, 6, 38, 14) // frosted mane
    g.fillStyle(0xdceaf8).fillCircle(13, 16, 8).fillTriangle(0, 19, 8, 13, 8, 23) // head + snout
    g.fillStyle(0x8aaacc).fillTriangle(11, 9, 13, 0, 17, 9).fillTriangle(16, 9, 20, 1, 21, 11) // ears
    eyes(g, 10, 15, 14, 0x3aa8ff, 1.6)
    g.fillStyle(0xeef6ff).fillTriangle(46, 18, 52, 6, 50, 22) // tail
    g.fillStyle(0xffffff, 0.7).fillCircle(4, 8, 1.5).fillCircle(44, 6, 1.5) // snow flecks
  })
  make('icewisp', 44, 52, (g) => {
    g.fillStyle(0x9fe3ff, 0.3).fillCircle(22, 24, 21) // cold glow
    g.fillStyle(0xbfefff, 0.9).fillTriangle(8, 44, 36, 44, 22, 6) // crystal flame
    g.fillStyle(0x6ac8f0).fillTriangle(14, 40, 22, 18, 30, 40)
    g.fillStyle(0xeefaff).fillTriangle(18, 36, 22, 26, 26, 36) // bright core
    eyes(g, 17, 23, 30, 0x1a3a6a, 2)
    g.fillStyle(0xdff6ff).fillTriangle(2, 20, 8, 16, 6, 24).fillTriangle(38, 12, 44, 10, 40, 18).fillTriangle(18, 50, 22, 46, 26, 50) // shards
  })
  make('icegolem', 56, 60, (g) => {
    g.fillStyle(0x6a9ac8).fillRect(16, 46, 10, 14).fillRect(32, 46, 10, 14) // legs
    g.fillStyle(0x9fc8e8).fillRoundedRect(12, 18, 36, 32, 4) // block body
    g.fillStyle(0xcfeaff).fillTriangle(12, 18, 24, 18, 12, 32).fillTriangle(40, 50, 48, 50, 48, 38) // facets
    g.fillStyle(0x7ab0dc).fillRect(28, 22, 2, 24).fillRect(16, 34, 12, 2) // cracks
    g.fillStyle(0x9fc8e8).fillRoundedRect(0, 22, 14, 20, 3) // big fist out front
    g.fillStyle(0xdff2ff).fillTriangle(0, 22, 5, 14, 9, 22) // ice spike on the fist
    g.fillStyle(0xb8dcf4).fillRoundedRect(16, 4, 22, 16, 3) // head
    eyes(g, 20, 28, 12, 0x3affff, 2.2)
    g.fillStyle(0xeefaff).fillTriangle(36, 6, 44, 0, 42, 12).fillTriangle(46, 18, 54, 10, 50, 22) // crystals on the back
  })
  make('snowharpy', 56, 46, (g) => {
    g.fillStyle(0xa8c8e8).fillTriangle(24, 18, 56, 4, 50, 30) // back wing
    g.fillStyle(0xdceaf8).fillEllipse(24, 26, 20, 22) // feathered body
    g.fillStyle(0xeef6ff).fillTriangle(26, 20, 52, 18, 40, 36) // front wing
    g.fillStyle(0xb8cce0).fillTriangle(30, 34, 40, 46, 22, 40) // tail feathers
    g.fillStyle(0x6a8ab0).fillRect(16, 36, 3, 8).fillRect(24, 36, 3, 8) // talons
    g.fillStyle(0xf0e0d4).fillCircle(14, 12, 7) // face
    g.fillStyle(0xeef6ff).fillTriangle(10, 6, 22, 2, 22, 14) // white crest
    g.fillStyle(0x9fc8e8).fillTriangle(3, 12, 8, 10, 8, 14) // beak-like nose
    eyes(g, 11, 15, 11, 0x3a6aff, 1.5)
  })
  make('frostshaman', 46, 62, (g) => {
    g.fillStyle(0x9fe3ff, 0.25).fillCircle(23, 16, 15) // cold halo
    g.fillStyle(0x4a5a8a).fillTriangle(8, 62, 38, 62, 23, 22) // robe
    g.fillStyle(0xeef6ff).fillRect(12, 54, 22, 4).fillRect(18, 30, 10, 3) // fur trim
    g.fillStyle(0xd8c0a8).fillCircle(23, 18, 8); eyes(g, 20, 26, 18, 0x3a8aff, 1.6)
    g.fillStyle(0xeef6ff).fillTriangle(12, 18, 23, 4, 34, 18) // fur hood
    g.fillStyle(0xd0e2f2).fillCircle(14, 10, 3).fillCircle(32, 10, 3)
    g.fillStyle(0x8a7a6a).fillRect(4, 14, 3, 46) // staff
    g.fillStyle(0x9fe3ff).fillTriangle(0, 12, 5.5, 0, 11, 12); g.fillStyle(0xeefaff).fillTriangle(3, 10, 5.5, 4, 8, 10) // crystal head
  })
  make('snowqueen', 84, 92, (g) => {
    g.fillStyle(0xbfe8ff, 0.25).fillCircle(42, 44, 42) // blizzard aura
    g.fillStyle(0xdff2ff).fillTriangle(18, 92, 70, 92, 44, 30) // gown
    g.fillStyle(0x9fc8e8).fillTriangle(28, 92, 44, 52, 60, 92) // gown inner fold
    g.fillStyle(0xeefaff).fillRect(30, 76, 28, 3).fillRect(34, 84, 20, 3) // frost lace
    g.fillStyle(0xbfe0f6, 0.8).fillTriangle(46, 34, 82, 20, 72, 64) // ice cape
    g.fillStyle(0xf4e8f0).fillCircle(42, 28, 11) // face
    g.fillStyle(0xeef6ff).fillRect(46, 22, 10, 26) // long white hair
    eyes(g, 37, 44, 27, 0x3a8aff, 2.2)
    g.fillStyle(0x9fe3ff).fillTriangle(32, 18, 35, 4, 38, 18).fillTriangle(38, 17, 42, 0, 46, 17).fillTriangle(46, 18, 49, 4, 52, 18) // ice crown
    g.fillStyle(0xc8d8e8).fillRect(10, 22, 4, 66) // sceptre
    g.fillStyle(0x9fe3ff).fillTriangle(4, 22, 12, 4, 20, 22); g.fillStyle(0xffffff, 0.8).fillCircle(12, 15, 3) // snowflake gem
    g.fillStyle(0xd8c0b0).fillRoundedRect(14, 40, 20, 5, 2) // arm on the sceptre
  })
  make('mammoth', 96, 84, (g) => {
    g.fillStyle(0x5a4a3a).fillRoundedRect(32, 58, 12, 26, 4).fillRoundedRect(52, 60, 12, 24, 4).fillRoundedRect(72, 58, 12, 26, 4) // legs
    g.fillStyle(0x7a5a40).fillEllipse(60, 42, 64, 46) // shaggy body
    g.fillStyle(0xdff2ff).fillEllipse(62, 24, 50, 14) // snow on the back
    g.fillStyle(0x6a4a34).fillTriangle(40, 56, 46, 68, 52, 56).fillTriangle(64, 60, 70, 70, 76, 60) // fur fringe
    g.fillStyle(0x8aaacc).fillRoundedRect(46, 34, 30, 10, 3) // iron armour band
    g.fillStyle(0x7a5a40).fillCircle(28, 36, 16) // head
    g.fillStyle(0x6a4a34).fillRoundedRect(10, 40, 9, 32, 4) // trunk
    g.fillStyle(0xc8ccd8).fillTriangle(24, 46, 2, 54, 20, 52).fillTriangle(30, 48, 6, 62, 26, 56) // iron tusks
    g.fillStyle(0x9fe3ff).fillRect(4, 52, 6, 3) // frost on the tips
    eyes(g, 22, 30, 32, 0x9fe3ff, 2.4)
    g.fillStyle(0x6a4a34).fillEllipse(40, 30, 12, 20) // ear
  })
  make('frostwyrm', 116, 112, (g) => {
    g.fillStyle(0xbfefff, 0.2).fillCircle(58, 56, 56) // frost aura
    g.fillStyle(0x7ab0dc).fillTriangle(56, 40, 114, 2, 104, 56).fillTriangle(64, 46, 116, 34, 100, 70) // wings
    g.fillStyle(0xbfe0f6, 0.8).fillTriangle(64, 42, 108, 12, 100, 50) // wing membrane
    g.fillStyle(0x6a9ac8).fillTriangle(84, 90, 116, 108, 92, 100) // tail
    g.fillStyle(0x8ab8e0).fillEllipse(70, 82, 56, 40) // body
    g.fillStyle(0xdff2ff).fillEllipse(64, 90, 36, 18) // pale belly
    g.fillStyle(0x5a8ab8).fillRoundedRect(50, 96, 12, 16, 4).fillRoundedRect(78, 96, 12, 16, 4) // legs
    g.fillStyle(0x8ab8e0).fillTriangle(40, 72, 56, 64, 46, 34) // neck
    g.fillStyle(0x8ab8e0).fillEllipse(30, 34, 36, 20) // head
    g.fillStyle(0x7ab0dc).fillTriangle(4, 34, 18, 28, 18, 42) // snout
    g.fillStyle(0xeefaff).fillTriangle(34, 26, 48, 8, 44, 28).fillTriangle(42, 28, 58, 14, 50, 32) // ice horns
    g.fillStyle(0xffffff).fillTriangle(10, 40, 13, 46, 16, 40).fillTriangle(18, 41, 21, 47, 24, 41) // fangs
    eyes(g, 24, 30, 31, 0x3affff, 2.8)
    g.fillStyle(0xdff6ff).fillTriangle(56, 60, 62, 48, 66, 62).fillTriangle(68, 62, 74, 50, 78, 64).fillTriangle(80, 64, 86, 54, 90, 68) // back spines
    g.fillStyle(0xbfefff, 0.7).fillCircle(4, 52, 3).fillCircle(10, 60, 2).fillCircle(2, 64, 2) // frost breath
  })
}
