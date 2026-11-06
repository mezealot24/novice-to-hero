// ===== D9 textures (v82) ป้อมจักรกลลอยฟ้า. Procedural, every monster faces left (toward the hero), sizes like D7/D8.
// Palette: steel blue body, brass trim, aether cyan glow. =====
import type { EyesFn, MakeFn } from '../textures'

export function drawD9(make: MakeFn, eyes: EyesFn) {
  // ----- normals -----
  make('clockknight', 54, 60, (g) => {
    g.fillStyle(0x3a4a62).fillRect(18, 44, 8, 16).fillRect(32, 44, 8, 16) // legs
    g.fillStyle(0x5a6e8a).fillRoundedRect(14, 20, 30, 28, 5) // steel torso
    g.fillStyle(0xc8963a).fillRect(14, 30, 30, 3).fillCircle(29, 39, 5) // brass belt + chest gear
    g.fillStyle(0x5a6e8a).fillCircle(29, 39, 2)
    g.fillStyle(0xc8963a).fillCircle(10, 32, 12); g.fillStyle(0x8a6424).fillCircle(10, 32, 8) // gear shield on the left arm
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; g.fillStyle(0xc8963a).fillRect(10 + Math.cos(a) * 12 - 2, 32 + Math.sin(a) * 12 - 2, 4, 4) } // shield teeth
    g.fillStyle(0xe0b860).fillCircle(10, 32, 3)
    g.fillStyle(0xb8c8d8).fillRect(46, 6, 3, 36); g.fillStyle(0xc8963a).fillRect(42, 38, 11, 3) // sword raised behind
    g.fillStyle(0x6a7e9a).fillRoundedRect(18, 4, 22, 18, 4) // helm
    g.fillStyle(0x1a2232).fillRect(18, 11, 18, 4) // visor slit
    eyes(g, 22, 30, 13, 0x7ad8ff, 1.8)
    g.fillStyle(0xc8963a).fillTriangle(26, 4, 30, -2, 34, 4) // brass crest
  })
  make('gundrone', 50, 40, (g) => {
    g.fillStyle(0x7ad8ff, 0.2).fillEllipse(28, 38, 30, 6) // hover glow
    g.fillStyle(0x3a4a62).fillRect(14, 4, 26, 3).fillRect(26, 2, 3, 6) // rotor arm
    g.fillStyle(0xb8c8d8, 0.7).fillEllipse(14, 4, 18, 3).fillEllipse(40, 4, 18, 3) // spinning blades
    g.fillStyle(0x5a6e8a).fillEllipse(28, 20, 28, 20) // body
    g.fillStyle(0xc8963a).fillRect(16, 16, 24, 2)
    g.fillStyle(0x2a3444).fillRect(0, 20, 16, 3).fillRect(2, 25, 14, 3).fillRect(0, 30, 16, 3) // triple barrel pointing left
    g.fillStyle(0xffc04a).fillCircle(1, 21.5, 1.5).fillCircle(3, 26.5, 1.5).fillCircle(1, 31.5, 1.5) // muzzle sparks
    g.fillStyle(0x1a2232).fillCircle(22, 20, 6); g.fillStyle(0xff5a3a).fillCircle(21, 20, 3) // targeting lens
    g.fillStyle(0xffffff, 0.8).fillCircle(20, 19, 1)
    g.fillStyle(0x3a4a62).fillRect(26, 28, 3, 6).fillRect(34, 28, 3, 6) // little struts
  })
  make('sparkcoil', 46, 60, (g) => {
    g.fillStyle(0x7ad8ff, 0.2).fillCircle(23, 14, 16) // charge haze
    g.fillStyle(0x3a4a62).fillRect(8, 50, 30, 6).fillRect(4, 56, 38, 4) // base plate
    g.fillStyle(0xc8963a).fillRect(17, 22, 12, 30) // brass column
    g.fillStyle(0x8a6424); for (let y = 24; y < 50; y += 4) g.fillRect(15, y, 16, 2) // copper windings
    g.fillStyle(0x5a6e8a).fillCircle(23, 14, 10) // torus top
    g.fillStyle(0xb8c8d8).fillCircle(23, 14, 6)
    eyes(g, 20, 26, 14, 0x1a2232, 1.6)
    g.lineStyle(2, 0xfff07a, 1) // arcs reaching left
    g.beginPath(); g.moveTo(13, 12); g.lineTo(7, 6); g.lineTo(9, 14); g.lineTo(1, 10); g.strokePath()
    g.beginPath(); g.moveTo(14, 20); g.lineTo(6, 24); g.lineTo(9, 28); g.lineTo(2, 32); g.strokePath()
    g.lineStyle(1.5, 0x7ad8ff, 1); g.beginPath(); g.moveTo(33, 10); g.lineTo(40, 4); g.lineTo(38, 12); g.lineTo(45, 8); g.strokePath()
  })
  make('steamtank', 62, 50, (g) => {
    g.fillStyle(0xdde6ee, 0.5).fillCircle(46, 6, 5).fillCircle(52, 3, 4).fillCircle(41, 2, 3) // steam puffs
    g.fillStyle(0x2a3444).fillRoundedRect(4, 36, 54, 14, 7) // treads
    g.fillStyle(0x5a6e8a); for (let x = 10; x < 56; x += 9) g.fillCircle(x, 43, 4) // wheels
    g.fillStyle(0x5a6e8a).fillRoundedRect(10, 20, 44, 18, 4) // hull
    g.fillStyle(0xc8963a).fillEllipse(36, 22, 26, 18) // brass boiler dome
    g.fillStyle(0x8a6424).fillRect(26, 20, 20, 2).fillRect(26, 25, 20, 2) // rivet bands
    g.fillStyle(0x3a4a62).fillRect(44, 6, 6, 14) // chimney
    g.fillStyle(0x3a4a62).fillRect(0, 22, 18, 6); g.fillStyle(0x1a2232).fillCircle(1, 25, 3) // cannon pointing left
    g.fillStyle(0x6a7e9a).fillRoundedRect(14, 12, 18, 12, 3) // cab
    eyes(g, 18, 25, 18, 0xffc04a, 1.8)
  })
  make('sawbot', 54, 46, (g) => {
    g.fillStyle(0x3a4a62).fillTriangle(28, 34, 22, 46, 32, 46).fillTriangle(42, 34, 38, 46, 48, 46) // spider legs
    g.fillStyle(0x5a6e8a).fillRoundedRect(22, 14, 28, 22, 6) // body
    g.fillStyle(0xc8963a).fillRect(24, 26, 24, 2)
    g.fillStyle(0x3a4a62).fillRect(12, 20, 14, 4) // arm to the saw
    g.fillStyle(0xb8c8d8).fillCircle(11, 22, 11) // saw blade
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; g.fillStyle(0xdde6ee).fillTriangle(11 + Math.cos(a) * 10, 22 + Math.sin(a) * 10, 11 + Math.cos(a + 0.3) * 14, 22 + Math.sin(a + 0.3) * 14, 11 + Math.cos(a + 0.5) * 10, 22 + Math.sin(a + 0.5) * 10) } // teeth
    g.fillStyle(0x3a4a62).fillCircle(11, 22, 3)
    g.fillStyle(0xff5a3a, 0.8).fillCircle(4, 32, 1.5).fillCircle(8, 35, 1) // sparks off the blade
    eyes(g, 28, 36, 20, 0xff5a3a, 2) // red visor eyes
    g.fillStyle(0x3a4a62).fillRect(40, 6, 2, 8); g.fillStyle(0xff5a3a).fillCircle(41, 6, 2) // antenna
  })
  make('repairbot', 46, 54, (g) => {
    g.fillStyle(0x6fd08c, 0.2).fillCircle(23, 28, 22) // repair aura
    g.fillStyle(0x3a4a62).fillRect(14, 44, 6, 10).fillRect(26, 44, 6, 10) // legs
    g.fillStyle(0x6a7e9a).fillCircle(23, 32, 14) // round body
    g.fillStyle(0xdde6ee).fillRect(20, 26, 6, 14).fillRect(16, 30, 14, 6); g.fillStyle(0x6fd08c).fillRect(21, 27, 4, 12).fillRect(17, 31, 12, 4) // green cross
    g.fillStyle(0x3a4a62).fillRect(4, 28, 8, 3) // arm
    g.fillStyle(0xc8963a).fillCircle(4, 26, 4).fillRect(2, 18, 4, 8); g.fillStyle(0x6a7e9a).fillCircle(4, 26, 1.5) // wrench
    g.fillStyle(0x5a6e8a).fillRoundedRect(13, 6, 20, 14, 5) // dome head
    eyes(g, 18, 26, 13, 0x6fd08c, 2)
    g.fillStyle(0x3a4a62).fillRect(22, 0, 2, 6); g.fillStyle(0x6fd08c).fillCircle(23, 1, 2)
  })

  // ----- mini bosses -----
  make('gearmarshal', 88, 92, (g) => {
    g.fillStyle(0x2a3444).fillRoundedRect(34, 70, 10, 22, 2).fillRoundedRect(50, 70, 10, 22, 2) // legs
    g.fillStyle(0x3a4a62).fillRoundedRect(28, 30, 38, 44, 8) // greatcoat
    g.fillStyle(0xc8963a).fillRect(45, 32, 4, 40) // brass buttons line
    g.fillStyle(0xe0b860).fillCircle(47, 40, 2).fillCircle(47, 50, 2).fillCircle(47, 60, 2)
    g.fillStyle(0xc8963a).fillCircle(30, 32, 9).fillCircle(64, 32, 9); g.fillStyle(0x8a6424).fillCircle(30, 32, 5).fillCircle(64, 32, 5) // gear epaulets
    g.fillStyle(0x5a6e8a).fillCircle(47, 20, 11) // head
    eyes(g, 42, 50, 20, 0x7ad8ff, 2)
    g.fillStyle(0xff5a3a).fillCircle(41, 19, 4); g.fillStyle(0xffffff, 0.8).fillCircle(40, 18, 1.2) // monocle scope
    g.fillStyle(0x2a3444).fillRect(34, 8, 26, 4).fillRect(38, 0, 18, 9); g.fillStyle(0xc8963a).fillRect(38, 6, 18, 2) // officer cap
    g.fillStyle(0x3a4a62).fillRoundedRect(14, 40, 20, 8, 3) // arm
    g.fillStyle(0x2a3444).fillRect(0, 38, 26, 6).fillRect(2, 45, 24, 5); g.fillStyle(0xc8963a).fillRect(18, 36, 10, 16) // rail gun, twin rails
    g.fillStyle(0x7ad8ff).fillRect(0, 44, 18, 1.5); g.fillStyle(0xffc04a).fillCircle(1, 41, 2.5) // rail charge
    g.fillStyle(0x5a6e8a).fillRoundedRect(66, 38, 10, 20, 3); g.fillStyle(0xc8963a).fillRect(70, 58, 2, 8) // other arm + baton
  })
  make('aethermage', 84, 94, (g) => {
    g.fillStyle(0x7ad8ff, 0.22).fillCircle(14, 44, 18) // aether glow
    g.fillStyle(0x5a6e8a).fillRoundedRect(56, 26, 18, 30, 4); g.fillStyle(0xc8963a).fillRect(58, 30, 14, 3).fillRect(58, 46, 14, 3) // backpack generator
    g.fillStyle(0x7ad8ff).fillRect(70, 14, 3, 14).fillRect(62, 18, 3, 10); g.fillStyle(0xdffaff).fillCircle(71.5, 13, 3).fillCircle(63.5, 17, 2.5) // coils
    g.fillStyle(0x2a3a5a).fillTriangle(22, 94, 66, 94, 44, 34) // long coat
    g.fillStyle(0xc8963a).fillRect(32, 62, 24, 3).fillRect(28, 86, 32, 3) // brass trim
    g.fillStyle(0x3a4a62).fillRoundedRect(32, 34, 24, 26, 6) // vest
    g.fillStyle(0xe8c8a8).fillCircle(44, 24, 11) // face
    g.fillStyle(0xdde6ee).fillTriangle(34, 18, 44, 4, 58, 20).fillRect(48, 14, 12, 20) // white hair
    g.fillStyle(0x8a6424).fillRect(33, 19, 22, 4); g.fillStyle(0x7ad8ff).fillCircle(38, 21, 4).fillCircle(48, 21, 4) // goggles
    g.fillStyle(0xdffaff).fillCircle(37, 20, 1.5).fillCircle(47, 20, 1.5)
    g.fillStyle(0x2a3a5a).fillRoundedRect(16, 40, 20, 8, 4) // casting arm
    g.fillStyle(0xc8963a).fillCircle(14, 44, 9); g.fillStyle(0x7ad8ff).fillCircle(14, 44, 6); g.fillStyle(0xffffff, 0.8).fillCircle(12, 42, 2) // aether orb in a brass ring
    g.fillStyle(0x7ad8ff, 0.8).fillCircle(4, 30, 2).fillCircle(26, 26, 1.5).fillCircle(6, 60, 1.5) // motes
  })

  // ----- boss -----
  make('omnicore', 120, 120, (g) => {
    g.fillStyle(0x7ad8ff, 0.18).fillCircle(60, 56, 58) // aether field
    g.fillStyle(0xc8963a).fillCircle(60, 54, 42) // big brass gear ring
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; g.fillStyle(0xc8963a).fillRect(60 + Math.cos(a) * 44 - 4, 54 + Math.sin(a) * 44 - 4, 8, 8) } // gear teeth
    g.fillStyle(0x3a4a62).fillCircle(60, 54, 34) // steel shell
    g.fillStyle(0x5a6e8a).fillTriangle(30, 40, 60, 22, 60, 54).fillTriangle(90, 40, 60, 22, 60, 54) // armour plates
    g.fillStyle(0x2a3444).fillCircle(60, 54, 20) // eye socket
    g.fillStyle(0x7ad8ff).fillCircle(56, 54, 14); g.fillStyle(0xdffaff).fillCircle(54, 54, 8); g.fillStyle(0xffffff).fillCircle(52, 52, 3) // aether core eye, looking left
    g.fillStyle(0x3a4a62).fillRoundedRect(4, 70, 30, 14, 5); g.fillStyle(0xc8963a).fillRect(0, 74, 10, 6) // piston fist left
    g.fillStyle(0x5a6e8a).fillRect(20, 66, 18, 5) // piston rod
    g.fillStyle(0x3a4a62).fillRoundedRect(86, 70, 26, 14, 5); g.fillStyle(0x7ad8ff).fillCircle(112, 77, 4) // right arm emitter
    g.fillStyle(0x2a3444).fillTriangle(44, 96, 76, 96, 60, 118); g.fillStyle(0x7ad8ff).fillTriangle(52, 100, 68, 100, 60, 114) // thruster + flame
    g.fillStyle(0x3a4a62).fillRect(52, 0, 16, 12); g.fillStyle(0xc8963a).fillRect(50, 10, 20, 3) // top spire
    g.fillStyle(0x7ad8ff).fillCircle(60, 2, 3)
    g.fillStyle(0xdffaff, 0.8).fillCircle(14, 30, 2).fillCircle(104, 28, 2).fillCircle(20, 104, 1.5).fillCircle(100, 104, 1.5) // motes
  })
}
