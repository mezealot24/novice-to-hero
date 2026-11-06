// ===== D8 textures (v80) แกนภูเขาไฟ. Procedural, every monster faces left (toward the hero), sizes like D6. =====
import type { EyesFn, MakeFn } from '../textures'

export function drawD8(make: MakeFn, eyes: EyesFn) {
  // ----- normals -----
  make('magmaslime', 50, 42, (g) => {
    g.fillStyle(0xff7a1a, 0.25).fillEllipse(25, 28, 50, 28) // heat glow
    g.fillStyle(0x3a1a12).fillEllipse(26, 28, 44, 26).fillCircle(24, 18, 13) // cooled crust blob
    g.fillStyle(0xff8a2a).fillTriangle(14, 30, 22, 24, 20, 36).fillTriangle(30, 18, 38, 26, 32, 30).fillRect(24, 34, 10, 2) // lava cracks
    g.fillStyle(0xffd24a).fillCircle(20, 28, 2).fillCircle(34, 24, 2)
    g.fillStyle(0xff8a2a).fillCircle(8, 38, 3).fillCircle(42, 40, 2.5) // dripping magma
    eyes(g, 14, 22, 16, 0xffe08a, 2.4)
    g.fillStyle(0x14172b).fillRect(14, 22, 7, 2) // grin
  })
  make('salamander', 56, 36, (g) => {
    g.fillStyle(0xd84a1a).fillEllipse(28, 22, 32, 12) // body
    g.fillStyle(0xb03a12).fillTriangle(40, 20, 56, 14, 42, 26) // tail
    g.fillStyle(0xffb03a, 0.9).fillTriangle(50, 16, 56, 4, 54, 18).fillTriangle(22, 16, 26, 4, 30, 16).fillTriangle(30, 16, 35, 2, 38, 17) // back + tail flames
    g.fillStyle(0x8a2a0e).fillRect(16, 26, 4, 10).fillRect(36, 26, 4, 10).fillTriangle(12, 36, 22, 36, 18, 32).fillTriangle(32, 36, 42, 36, 38, 32) // legs
    g.fillStyle(0xe85a22).fillEllipse(10, 18, 18, 11) // head
    g.fillStyle(0xffd24a).fillRect(14, 22, 20, 3) // belly stripe
    g.fillStyle(0xffd24a).fillTriangle(0, 18, 3, 16, 3, 21) // tongue of flame
    eyes(g, 7, 12, 15, 0xfff0a0, 1.8)
  })
  make('emberbat', 52, 40, (g) => {
    g.fillStyle(0xff6a1a, 0.25).fillCircle(26, 20, 18)
    g.fillStyle(0x2a1210).fillTriangle(22, 18, 0, 6, 8, 30).fillTriangle(30, 18, 52, 4, 46, 30) // wings
    g.fillStyle(0xff7a2a).fillTriangle(4, 10, 10, 14, 6, 22).fillTriangle(48, 8, 42, 14, 46, 22) // glowing wing veins
    g.fillStyle(0x3a1a12).fillEllipse(26, 22, 16, 20) // body
    g.fillStyle(0xff8a2a).fillCircle(26, 26, 4); g.fillStyle(0xffd24a).fillCircle(26, 26, 2) // ember heart
    g.fillStyle(0x3a1a12).fillTriangle(18, 12, 20, 2, 24, 12).fillTriangle(28, 12, 32, 2, 34, 12) // ears
    eyes(g, 21, 27, 16, 0xffe04a, 1.8)
    g.fillStyle(0xffb03a, 0.8).fillCircle(14, 36, 1.5).fillCircle(36, 38, 1.5).fillCircle(26, 38, 1) // sparks
  })
  make('obsidiangolem', 56, 62, (g) => {
    g.fillStyle(0x1a1420).fillRect(14, 46, 10, 16).fillRect(32, 46, 10, 16) // legs
    g.fillStyle(0x241c2e).fillRoundedRect(10, 18, 36, 32, 4) // glassy torso
    g.fillStyle(0x4a3a6a).fillTriangle(12, 20, 26, 20, 14, 34).fillTriangle(34, 22, 44, 22, 44, 34) // sheen facets
    g.fillStyle(0xff6a1a).fillRect(26, 22, 2, 24).fillRect(18, 38, 18, 2) // lava veins
    g.fillStyle(0x241c2e).fillRoundedRect(0, 22, 12, 22, 3) // fist reaching left
    g.fillStyle(0x4a3a6a).fillTriangle(0, 22, 8, 22, 2, 30)
    g.fillStyle(0x241c2e).fillRoundedRect(44, 24, 10, 20, 3)
    g.fillStyle(0x2e2438).fillRoundedRect(16, 4, 22, 16, 3) // head block
    eyes(g, 20, 27, 12, 0xff8a2a, 2.2)
    g.fillStyle(0x6a5a9a).fillTriangle(16, 4, 22, -2, 26, 4) // crystal spike
  })
  make('flamecaller', 46, 62, (g) => {
    g.fillStyle(0xff6a1a, 0.25).fillCircle(8, 12, 12) // fire glow on the staff
    g.fillStyle(0x7a1a14).fillTriangle(8, 62, 40, 62, 24, 20) // robe
    g.fillStyle(0xffb03a).fillRect(16, 40, 18, 3).fillRect(14, 56, 22, 3) // ember trim
    g.fillStyle(0x4a0e0a).fillTriangle(12, 26, 24, 2, 36, 26) // pointed hood
    g.fillStyle(0x1a0a08).fillCircle(22, 20, 7); eyes(g, 19, 25, 20, 0xffd24a, 1.8)
    g.fillStyle(0x5a3a2a).fillRect(6, 16, 3, 46) // staff
    g.fillStyle(0xff7a1a).fillTriangle(1, 16, 7.5, -2, 14, 16); g.fillStyle(0xffe08a).fillTriangle(4, 15, 7.5, 4, 11, 15) // flame
  })
  make('ashpriestess', 46, 62, (g) => {
    g.fillStyle(0xb0a8a0, 0.25).fillCircle(24, 14, 16) // ash haze
    g.fillStyle(0x5a5458).fillTriangle(8, 62, 40, 62, 24, 22) // ash-grey robe
    g.fillStyle(0xff8a3a).fillRect(17, 36, 14, 3); g.fillStyle(0x3a3438).fillRect(22, 40, 4, 20) // sash
    g.fillStyle(0xc8a890).fillCircle(24, 18, 8); eyes(g, 21, 27, 18, 0xff6a1a, 1.6)
    g.fillStyle(0x3a3438).fillTriangle(14, 16, 24, 2, 34, 16).fillRect(14, 16, 4, 14).fillRect(30, 16, 4, 14) // veil
    g.fillStyle(0x8a7a6a).fillRect(4, 28, 12, 2); g.fillStyle(0x6a5a4a).fillRect(4, 30, 2, 12) // censer chain
    g.fillStyle(0x6a5a4a).fillCircle(5, 46, 5); g.fillStyle(0xff8a2a).fillCircle(5, 45, 2.5) // smouldering censer
    g.fillStyle(0xb0a8a0, 0.6).fillCircle(3, 38, 2.5).fillCircle(7, 34, 2) // smoke
  })

  // ----- mini bosses -----
  make('ifrit', 84, 92, (g) => {
    g.fillStyle(0xff7a2a, 0.25).fillCircle(42, 44, 42)
    g.fillStyle(0xd8401a).fillTriangle(26, 60, 58, 60, 50, 92).fillTriangle(40, 70, 60, 64, 66, 90) // flame tail (no legs)
    g.fillStyle(0xffb03a).fillTriangle(34, 62, 52, 62, 48, 86)
    g.fillStyle(0xc8341a).fillRoundedRect(24, 30, 36, 34, 10) // torso
    g.fillStyle(0xffd24a).fillCircle(42, 46, 6); g.fillStyle(0xffffff, 0.7).fillCircle(41, 45, 2.5) // core
    g.fillStyle(0xc8341a).fillRoundedRect(4, 34, 22, 8, 4).fillRoundedRect(58, 36, 16, 8, 4) // arms (left one casting)
    g.fillStyle(0xffd24a).fillCircle(5, 38, 6); g.fillStyle(0xffffff, 0.7).fillCircle(4, 37, 2.5) // fireball in hand
    g.fillStyle(0xe04a22).fillCircle(38, 22, 13) // head
    g.fillStyle(0x2a1210).fillTriangle(28, 14, 20, -2, 34, 10).fillTriangle(46, 12, 56, -2, 50, 16) // horns
    g.fillStyle(0xffb03a).fillTriangle(30, 10, 38, -4, 46, 10) // crown of fire
    eyes(g, 33, 41, 21, 0xfff0a0, 2.6)
    g.fillStyle(0x2a1210).fillRect(32, 28, 10, 2)
    g.fillStyle(0xffb03a, 0.8).fillCircle(72, 20, 2).fillCircle(12, 70, 2).fillCircle(76, 60, 1.5) // embers
  })
  make('forgelord', 80, 90, (g) => {
    g.fillStyle(0x2a1a14).fillRoundedRect(30, 70, 10, 20, 2).fillRoundedRect(46, 70, 10, 20, 2) // legs
    g.fillStyle(0x8a4a2a).fillRoundedRect(22, 32, 42, 42, 10) // broad body
    g.fillStyle(0x4a3a2a).fillRoundedRect(28, 40, 30, 32, 4) // leather apron
    g.fillStyle(0xff8a3a).fillRect(30, 48, 26, 2).fillRect(30, 58, 26, 2) // glowing rivets line
    g.fillStyle(0x5a5e70).fillCircle(24, 34, 10).fillCircle(62, 34, 10) // iron pauldrons
    g.fillStyle(0xb06a4a).fillCircle(42, 22, 12); eyes(g, 36, 44, 20, 0xffd24a, 2)
    g.fillStyle(0xff6a1a).fillRoundedRect(32, 26, 20, 8, 3) // burning beard
    g.fillStyle(0x3a3a44).fillRect(30, 8, 24, 7) // smith cap
    g.fillStyle(0x6a4a2a).fillRect(10, 20, 5, 58) // hammer haft
    g.fillStyle(0x4a4a58).fillRoundedRect(0, 8, 26, 16, 3); g.fillStyle(0xff7a1a).fillRect(0, 20, 26, 4) // hammer head, red-hot edge
    g.fillStyle(0x2a2a34).fillRect(62, 74, 18, 6).fillRect(66, 80, 10, 10) // anvil
  })

  // ----- boss -----
  make('lavatitan', 116, 120, (g) => {
    g.fillStyle(0xff5a1a, 0.25).fillCircle(58, 60, 58)
    g.fillStyle(0x2a1a18).fillRoundedRect(34, 92, 18, 28, 4).fillRoundedRect(64, 92, 18, 28, 4) // legs
    g.fillStyle(0x3a2420).fillRoundedRect(26, 40, 66, 58, 14) // rock body
    g.fillStyle(0xff6a1a).fillTriangle(40, 50, 58, 70, 46, 78).fillTriangle(62, 48, 80, 60, 70, 76).fillRect(56, 76, 4, 18) // lava fissures
    g.fillStyle(0xffd24a).fillCircle(58, 66, 9); g.fillStyle(0xffffff, 0.7).fillCircle(56, 64, 3.5) // molten heart
    g.fillStyle(0x3a2420).fillTriangle(70, 44, 112, 30, 92, 62) // right shoulder crag
    g.fillStyle(0x2a1a18).fillTriangle(96, 30, 112, 30, 104, 18); g.fillStyle(0xff7a1a).fillTriangle(100, 26, 108, 26, 104, 16) // shoulder volcano + vent
    g.fillStyle(0xffb03a, 0.7).fillCircle(104, 10, 3).fillCircle(98, 6, 2)
    g.fillStyle(0x3a2420).fillRoundedRect(2, 46, 30, 18, 6) // fist reaching left
    g.fillStyle(0xff6a1a).fillRect(6, 54, 20, 3)
    g.fillStyle(0x4a2e28).fillRoundedRect(36, 14, 34, 30, 8) // head
    g.fillStyle(0x2a1a18).fillTriangle(36, 18, 30, 2, 46, 14).fillTriangle(60, 14, 70, 0, 70, 20) // crags on the head
    eyes(g, 46, 58, 28, 0xffd24a, 3.4)
    g.fillStyle(0xff6a1a).fillRect(44, 36, 16, 3) // magma mouth
    g.fillStyle(0xffb03a, 0.8).fillCircle(14, 100, 2).fillCircle(100, 96, 2.5).fillCircle(20, 30, 1.5) // floating embers
  })
}
