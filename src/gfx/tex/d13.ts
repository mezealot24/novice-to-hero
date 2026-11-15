// ===== D13 textures 🌘 สุริยุปราคาดาราดับ. Procedural, every monster faces left (toward the hero). =====
// Palette: eclipse obsidian, void violet, astral rose-gold, stark starlight white.
import type { EyesFn, MakeFn } from '../textures'

export function drawD13(make: MakeFn, eyes: EyesFn) {
  // ----- normals -----
  make('eclipsewraith', 48, 56, (g) => {
    g.fillStyle(0x7c3aed, 0.22).fillCircle(24, 26, 22) // eclipse halo
    g.fillStyle(0x0c0618, 0.9).fillTriangle(8, 56, 40, 56, 24, 12) // void shroud
    g.lineStyle(2, 0xfbbf24, 0.7).strokeCircle(24, 16, 11) // solar corona ring behind head
    g.fillStyle(0x05020a).fillCircle(24, 16, 9) // eclipsed head
    eyes(g, 19, 26, 16, 0xfbbf24, 1.8)
    g.fillStyle(0x7c3aed).fillTriangle(14, 28, 0, 22, 6, 34) // spectral claw reaching left
  })

  make('voidastrologer', 52, 58, (g) => {
    g.fillStyle(0x180e2c).fillTriangle(10, 58, 44, 58, 27, 18) // robe
    g.fillStyle(0xa855f7, 0.8).fillCircle(22, 42, 1.5).fillCircle(34, 38, 1.5).fillCircle(28, 50, 1.5) // star runes
    g.fillStyle(0x281648).fillTriangle(12, 20, 27, 0, 42, 20) // pointed astrologer hat
    g.fillStyle(0x05020a).fillCircle(26, 18, 8) // shadowed face
    eyes(g, 21, 27, 18, 0xf472b6, 1.8)
    g.fillStyle(0x180e2c).fillRoundedRect(4, 28, 14, 5, 2)
    g.lineStyle(2, 0xc084fc).strokeCircle(6, 20, 7) // astrolabe ring left
    g.fillStyle(0xfbbf24).fillCircle(6, 20, 3) // captured star
  })

  make('cometlancer', 56, 58, (g) => {
    g.fillStyle(0x1e1634).fillRect(18, 42, 9, 16).fillRect(32, 42, 9, 16) // legs
    g.fillStyle(0x2a1f4a).fillRoundedRect(14, 20, 28, 24, 5) // star armor
    g.fillStyle(0xc084fc).fillCircle(14, 22, 6).fillCircle(42, 22, 6) // pauldrons
    g.fillStyle(0x2a1f4a).fillRoundedRect(18, 6, 18, 16, 5) // helm
    g.fillStyle(0x60a5fa, 0.8).fillTriangle(32, 8, 50, 0, 38, 16) // comet plume backward
    eyes(g, 20, 27, 14, 0x93c5fd, 1.7)
    g.fillStyle(0x1e1634).fillRoundedRect(6, 26, 12, 5, 2) // arm forward
    g.fillStyle(0xe0f2fe).fillTriangle(0, 28, 18, 22, 18, 34) // comet lance
    g.fillStyle(0x60a5fa, 0.7).fillRect(10, 27, 26, 2)
  })

  make('starlesshound', 58, 42, (g) => {
    g.fillStyle(0x9333ea, 0.18).fillEllipse(30, 24, 56, 28) // void haze
    g.fillStyle(0x120a24).fillTriangle(44, 18, 58, 6, 50, 24) // twin-tip tail
    g.fillStyle(0x120a24).fillEllipse(32, 24, 32, 14) // lean hound body
    g.fillStyle(0x0c0618).fillRect(18, 28, 4, 14).fillRect(26, 28, 4, 14).fillRect(38, 28, 4, 14).fillRect(44, 28, 4, 14)
    g.fillStyle(0xf472b6, 0.75).fillTriangle(20, 18, 26, 6, 30, 18).fillTriangle(30, 18, 36, 8, 40, 18) // astral spikes
    g.fillStyle(0x120a24).fillEllipse(12, 18, 20, 12).fillTriangle(0, 20, 6, 16, 6, 24) // head + snout
    eyes(g, 8, 13, 16, 0xf472b6, 1.8)
    g.fillStyle(0xfef08a).fillTriangle(2, 22, 4, 22, 3, 26) // bright fang
  })

  make('nebulamoth', 56, 48, (g) => {
    g.fillStyle(0xf472b6, 0.2).fillCircle(28, 24, 23) // nebula glow
    g.fillStyle(0x6b21a8).fillTriangle(26, 20, 2, 2, 10, 28).fillTriangle(30, 20, 54, 2, 46, 28) // wide upper wings
    g.fillStyle(0x4c1d95).fillTriangle(26, 24, 10, 44, 22, 32).fillTriangle(30, 24, 46, 44, 34, 32) // lower wings
    g.fillStyle(0xf472b6).fillCircle(12, 12, 4).fillCircle(44, 12, 4) // pink nebula eye-spots
    g.fillStyle(0xe879f9, 0.8).fillCircle(16, 22, 1.5).fillCircle(40, 22, 1.5).fillCircle(14, 36, 1.5) // cosmic dust
    g.fillStyle(0x2e1065).fillEllipse(28, 24, 8, 22) // body
    g.fillStyle(0x2e1065).fillCircle(25, 13, 4) // head facing left
    eyes(g, 23, 26, 13, 0xfef08a, 1.4)
  })

  make('fallenstar', 56, 58, (g) => {
    g.fillStyle(0xf59e0b, 0.16).fillCircle(28, 30, 26) // dying ember aura
    g.fillStyle(0x1f1a28).fillRoundedRect(10, 14, 38, 38, 10) // charred meteor core
    g.fillStyle(0x3a2e46).fillTriangle(14, 18, 28, 14, 18, 34).fillTriangle(34, 16, 46, 22, 44, 38) // stony facets
    g.fillStyle(0xf97316).fillRect(26, 20, 3, 24).fillRect(16, 30, 24, 3) // molten cracks
    g.fillStyle(0xfbbf24).fillCircle(27, 31, 5) // dying star heart
    g.fillStyle(0x1f1a28).fillRect(14, 48, 9, 10).fillRect(35, 48, 9, 10) // stumpy base legs
    eyes(g, 20, 30, 22, 0xfbbf24, 2)
  })

  // ----- mini bosses -----
  make('umbravalkyrie', 88, 94, (g) => {
    g.fillStyle(0xa855f7, 0.2).fillCircle(44, 46, 42) // astral shadow aura
    g.fillStyle(0x1e1038).fillTriangle(50, 32, 88, 8, 66, 52).fillTriangle(52, 44, 86, 36, 68, 66) // great shadow wing right
    g.fillStyle(0xc084fc, 0.6).fillTriangle(54, 34, 82, 16, 66, 42) // luminous wing feathers
    g.fillStyle(0x1a122e).fillRoundedRect(30, 70, 10, 24, 2).fillRoundedRect(46, 70, 10, 24, 2) // armored greaves
    g.fillStyle(0x2c1e4a).fillRoundedRect(26, 32, 34, 40, 7) // valkyrie cuirass
    g.fillStyle(0xfbbf24).fillRect(38, 36, 10, 3).fillRect(42, 34, 3, 26) // eclipse cross trim
    g.fillStyle(0x2c1e4a).fillRoundedRect(33, 12, 20, 20, 5) // winged helm
    g.fillStyle(0xc084fc).fillTriangle(34, 12, 24, 0, 38, 10).fillTriangle(50, 12, 62, 0, 48, 10) // helm wings
    eyes(g, 36, 44, 21, 0xf472b6, 1.9)
    g.fillStyle(0xe8e0ff).fillTriangle(0, 42, 28, 38, 28, 48) // astral starblade facing left
    g.fillStyle(0xfbbf24).fillRect(24, 36, 4, 14) // golden hilt
  })

  make('noctisshade', 84, 94, (g) => {
    g.fillStyle(0x6d28d9, 0.24).fillCircle(42, 46, 40) // lingering Noctis aura
    g.fillStyle(0x070312).fillTriangle(14, 94, 72, 94, 42, 28) // starless void cloak
    g.fillStyle(0x2e1065).fillTriangle(28, 94, 40, 94, 42, 48).fillTriangle(48, 94, 60, 94, 44, 48) // violet folds
    g.fillStyle(0xfef08a, 0.85).fillCircle(32, 74, 1.2).fillCircle(52, 66, 1.4).fillCircle(42, 86, 1.2) // stolen stars
    g.fillStyle(0x05020a).fillCircle(42, 24, 14) // deep hood
    g.fillStyle(0x000000).fillEllipse(39, 24, 18, 16) // void face
    g.fillStyle(0xc084fc).fillCircle(34, 22, 2.2).fillCircle(42, 21, 2).fillCircle(38, 28, 1.4) // cluster of star eyes
    g.fillStyle(0x070312).fillRoundedRect(6, 38, 24, 7, 3) // arm reaching left
    g.fillStyle(0x000000).fillCircle(8, 42, 8); g.lineStyle(2, 0xa855f7).strokeEllipse(8, 42, 20, 6) // mini singularity orb
  })

  // ----- boss -----
  make('seraph', 124, 128, (g) => {
    g.fillStyle(0xf472b6, 0.16).fillCircle(62, 62, 60) // supernova aura
    g.lineStyle(4, 0xfbbf24, 0.85).strokeCircle(62, 34, 30) // eclipsed solar halo
    g.fillStyle(0x05020a).fillCircle(62, 34, 24) // black eclipse disc behind head
    // six radiant-dark seraph wings
    g.fillStyle(0x1f0e3a).fillTriangle(46, 36, 4, 8, 22, 52).fillTriangle(78, 36, 120, 8, 102, 52)
    g.fillStyle(0x3b1866).fillTriangle(44, 52, 8, 44, 24, 76).fillTriangle(80, 52, 116, 44, 100, 76)
    g.fillStyle(0xf472b6, 0.55).fillTriangle(46, 40, 12, 16, 26, 48).fillTriangle(78, 40, 112, 16, 98, 48)
    g.fillStyle(0x120824).fillTriangle(34, 126, 92, 126, 62, 34) // grand seraph robe
    g.fillStyle(0xfbbf24).fillRect(58, 44, 8, 74).fillRect(44, 58, 36, 4) // golden celestial cross trim
    g.fillStyle(0xe8e0f8).fillCircle(62, 26, 13) // pale seraphic face
    g.fillStyle(0x05020a).fillRect(51, 20, 22, 7) // blindfold / eclipse visor
    g.fillStyle(0xf472b6).fillCircle(57, 23.5, 2.2).fillCircle(66, 23.5, 2.2) // glowing eyes piercing visor
    g.fillStyle(0xfbbf24).fillTriangle(52, 13, 62, 0, 72, 13) // solar crown spike
    g.fillStyle(0x2e1065).fillRoundedRect(10, 52, 26, 8, 3) // left arm holding supernova orb
    g.fillStyle(0xf472b6, 0.45).fillCircle(12, 56, 12); g.fillStyle(0xfef08a).fillCircle(12, 56, 6) // collapsing star
  })
}
