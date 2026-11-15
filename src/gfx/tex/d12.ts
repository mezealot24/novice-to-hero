// ===== D12 textures 🌊 วิหารก้นสมุทรทมิฬ. Procedural, every monster faces left (toward the hero). =====
// Palette: abyssal trench blue-black, deep teal, bioluminescent cyan, coral/pearl accents.
import type { EyesFn, MakeFn } from '../textures'

export function drawD12(make: MakeFn, eyes: EyesFn) {
  // ----- normals -----
  make('abysssiren', 52, 58, (g) => {
    g.fillStyle(0x22d3ee, 0.16).fillCircle(26, 28, 24) // biolume haze
    g.fillStyle(0x164e63).fillTriangle(26, 38, 50, 56, 38, 56).fillTriangle(20, 38, 32, 56, 28, 36) // mermaid fins
    g.fillStyle(0x0e7490).fillEllipse(26, 32, 20, 26) // scaled torso
    g.fillStyle(0x67e8f9, 0.7).fillTriangle(32, 22, 46, 12, 36, 32) // translucent dorsal fin
    g.fillStyle(0x9ae6e6).fillCircle(21, 14, 9) // pale sea head
    g.fillStyle(0x083344).fillTriangle(22, 6, 40, 28, 28, 12) // sea-kelp hair
    g.fillStyle(0x22d3ee).fillTriangle(12, 10, 6, 4, 15, 14) // fin ear left
    eyes(g, 16, 22, 14, 0x38bdf8, 1.8)
    g.fillStyle(0x67e8f9, 0.75).fillCircle(6, 28, 4) // water orb in left hand
  })

  make('trenchcrusher', 60, 64, (g) => {
    g.fillStyle(0x0b2538).fillRect(14, 48, 12, 16).fillRect(34, 48, 12, 16) // heavy crab-golem legs
    g.fillStyle(0x16384d).fillRoundedRect(10, 16, 42, 34, 8) // armored carapace
    g.fillStyle(0x23526e).fillRect(14, 22, 34, 4).fillRect(14, 34, 34, 4) // shell plates
    g.fillStyle(0x38bdf8, 0.7).fillCircle(32, 28, 4).fillCircle(22, 20, 2).fillCircle(42, 20, 2) // trench barnacles glowing
    g.fillStyle(0x1e4a66).fillRoundedRect(0, 20, 16, 22, 6) // massive crushing claw facing left
    g.fillStyle(0x0b2538).fillTriangle(0, 28, 8, 25, 8, 33) // pincer notch
    g.fillStyle(0x16384d).fillRoundedRect(48, 26, 11, 18, 4)
    g.fillStyle(0x0f2c40).fillRoundedRect(18, 8, 24, 12, 4) // sunken head
    eyes(g, 21, 29, 14, 0x38bdf8, 2.2)
  })

  make('anglerghoul', 56, 48, (g) => {
    g.fillStyle(0x0c2233).fillEllipse(30, 26, 36, 26) // hunched deepfish body
    g.fillStyle(0x163a52).fillTriangle(44, 22, 56, 14, 52, 34) // ragged tail fin
    g.fillStyle(0x0f2c40).fillTriangle(26, 14, 38, 4, 36, 16) // dorsal spine
    g.lineStyle(2, 0x38bdf8).lineBetween(20, 14, 8, 4); g.lineBetween(8, 4, 4, 12) // angler rod curving forward
    g.fillStyle(0x67e8f9, 0.35).fillCircle(4, 14, 7) // lure glow
    g.fillStyle(0xe0f2fe).fillCircle(4, 14, 3) // bright lure
    g.fillStyle(0xd8e8f0).fillTriangle(10, 28, 12, 28, 11, 33).fillTriangle(14, 28, 16, 28, 15, 32).fillTriangle(18, 28, 20, 28, 19, 33) // needle fangs
    eyes(g, 15, 22, 22, 0x7dd3fc, 2)
  })

  make('drownedknight', 54, 58, (g) => {
    g.fillStyle(0x0c2436).fillRect(18, 42, 8, 16).fillRect(30, 42, 8, 16) // greaves
    g.fillStyle(0x1b4258).fillRoundedRect(14, 20, 28, 24, 5) // rusted sea-plate
    g.fillStyle(0x2a7a68, 0.8).fillRect(16, 24, 8, 14).fillCircle(36, 36, 4) // seaweed & barnacles
    g.fillStyle(0x1b4258).fillRoundedRect(18, 5, 18, 16, 5) // corroded helm
    g.fillStyle(0x051018).fillRect(19, 11, 12, 4) // visor slit
    eyes(g, 21, 27, 13, 0x22d3ee, 1.7)
    g.fillStyle(0x1b4258).fillRoundedRect(4, 26, 12, 5, 2) // arm left
    g.fillStyle(0x94b8c8).fillTriangle(0, 28, 10, 25, 10, 31) // rusted anchor blade
    g.fillStyle(0x2a7a68).fillTriangle(38, 22, 52, 50, 42, 46) // tattered kelp cloak
  })

  make('jellywraith', 48, 54, (g) => {
    g.fillStyle(0x38bdf8, 0.22).fillCircle(24, 20, 20) // bioluminescent halo
    g.fillStyle(0x0e7490, 0.85).fillEllipse(24, 18, 30, 22) // translucent bell
    g.fillStyle(0x67e8f9, 0.5).fillEllipse(22, 14, 18, 10) // inner glow
    g.lineStyle(2, 0x22d3ee, 0.85) // trailing venomous tentacles
    g.lineBetween(14, 26, 10, 50); g.lineBetween(20, 28, 18, 52); g.lineBetween(28, 28, 30, 52); g.lineBetween(34, 26, 40, 48)
    g.fillStyle(0xa855f7, 0.7).fillCircle(10, 44, 2).fillCircle(30, 46, 2) // venom tips
    eyes(g, 18, 26, 18, 0xe0f2fe, 1.8)
  })

  make('tidepriest', 50, 56, (g) => {
    g.fillStyle(0x0c3048).fillTriangle(10, 56, 42, 56, 26, 16) // sea robe
    g.fillStyle(0x22d3ee, 0.7).fillTriangle(20, 56, 32, 56, 26, 28) // glowing wave trim
    g.fillStyle(0x0f3c58).fillCircle(25, 15, 10) // hood
    g.fillStyle(0x67e8f9).fillTriangle(20, 6, 25, 0, 30, 6) // coral crest
    eyes(g, 20, 26, 15, 0x67e8f9, 1.8)
    g.fillStyle(0x0f3c58).fillRoundedRect(6, 26, 14, 5, 2)
    g.fillStyle(0x67e8f9).fillRect(6, 12, 3, 44) // trident staff
    g.fillStyle(0x22d3ee).fillTriangle(2, 12, 7.5, 4, 13, 12) // trident tip
  })

  // ----- mini bosses -----
  make('coraljaeger', 86, 94, (g) => {
    g.fillStyle(0x0ea5e9, 0.2).fillCircle(44, 46, 40) // abyssal aura
    g.fillStyle(0x164e63).fillRoundedRect(28, 72, 12, 22, 3).fillRoundedRect(48, 72, 12, 22, 3) // legs
    g.fillStyle(0x1e5c72).fillRoundedRect(24, 34, 40, 40, 8) // coral plate armor
    g.fillStyle(0xf43f5e, 0.85).fillTriangle(52, 34, 70, 14, 62, 38).fillTriangle(26, 36, 16, 18, 32, 36) // jagged crimson coral pauldrons
    g.fillStyle(0x164e63).fillRoundedRect(34, 12, 20, 22, 5) // helm
    g.fillStyle(0xf43f5e).fillTriangle(42, 12, 48, 0, 50, 12) // coral crest
    eyes(g, 37, 44, 21, 0x38bdf8, 2)
    g.fillStyle(0x1e5c72).fillRoundedRect(8, 40, 18, 7, 3) // lance arm
    g.fillStyle(0x38bdf8).fillTriangle(0, 43, 16, 36, 16, 50) // hydro piercing lance head
    g.fillStyle(0xe0f2fe).fillRect(2, 42, 14, 2)
  })

  make('deepmatron', 84, 94, (g) => {
    g.fillStyle(0x22d3ee, 0.18).fillCircle(42, 46, 42) // sea witch aura
    g.fillStyle(0x08283a).fillTriangle(14, 94, 72, 94, 42, 34) // tentacle gown
    g.fillStyle(0x0e7490).fillTriangle(24, 94, 34, 94, 40, 50).fillTriangle(50, 94, 62, 94, 46, 50)
    g.fillStyle(0x38bdf8, 0.8).fillCircle(30, 84, 2).fillCircle(56, 78, 2).fillCircle(44, 88, 2.5) // glowing nodes
    g.fillStyle(0x0f3c58).fillRoundedRect(32, 30, 22, 24, 6) // bodice
    g.fillStyle(0xa5f3fc).fillCircle(42, 20, 10) // pallid abyss face
    g.fillStyle(0x164e63).fillTriangle(32, 12, 42, 0, 52, 12).fillTriangle(30, 14, 22, 4, 34, 14) // sea-crown horns
    eyes(g, 37, 44, 20, 0x22d3ee, 2.1)
    g.fillStyle(0x0f3c58).fillRoundedRect(8, 34, 24, 6, 3) // staff arm
    g.fillStyle(0x38bdf8).fillRect(7, 22, 3, 48) // coral staff
    g.fillStyle(0x67e8f9).fillCircle(8.5, 18, 7); g.fillStyle(0x08283a).fillCircle(8.5, 18, 3) // abyss orb
  })

  // ----- boss -----
  make('leviathan', 124, 126, (g) => {
    g.fillStyle(0x0ea5e9, 0.2).fillCircle(62, 64, 58) // ocean pressure aura
    // coiled serpent body & crest
    g.fillStyle(0x082c42).fillEllipse(72, 86, 86, 48) // lower coil
    g.fillStyle(0x0e4d6c).fillEllipse(66, 62, 62, 54) // upper serpent chest
    g.fillStyle(0x38bdf8, 0.85).fillTriangle(72, 24, 96, 8, 86, 36).fillTriangle(80, 42, 110, 32, 92, 54).fillTriangle(86, 62, 116, 60, 96, 76) // dorsal spines
    g.fillStyle(0x0f5c7e).fillRoundedRect(24, 18, 42, 30, 10) // dragon-serpent head facing left
    g.fillStyle(0x082c42).fillTriangle(4, 32, 26, 22, 26, 40) // fierce jaw/snout left
    g.fillStyle(0xe0f2fe).fillTriangle(8, 36, 12, 36, 10, 42).fillTriangle(14, 36, 18, 36, 16, 42) // sea fangs
    g.fillStyle(0x22d3ee).fillTriangle(40, 18, 62, 2, 54, 22).fillTriangle(30, 20, 44, 4, 42, 22) // swept horns
    eyes(g, 24, 34, 28, 0x67e8f9, 2.8)
    g.fillStyle(0x67e8f9, 0.5).fillCircle(12, 74, 10).fillCircle(28, 88, 7) // churning maelstrom foam
    g.fillStyle(0x38bdf8).fillRect(36, 56, 34, 3).fillRect(34, 68, 38, 3) // glowing gill bands
  })
}
