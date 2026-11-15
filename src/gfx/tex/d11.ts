// ===== D11 textures ⚙️ นรกจักรกลนิรันดร์. Procedural, every monster faces left (toward the hero). =====
// Palette: tarnished brass, dark iron, furnace orange, glowing steam cyan/amber.
import type { EyesFn, MakeFn } from '../textures'

export function drawD11(make: MakeFn, eyes: EyesFn) {
  // ----- normals -----
  make('cogsentinel', 56, 62, (g) => {
    g.fillStyle(0x4a3525).fillRect(16, 46, 10, 16).fillRect(32, 46, 10, 16) // iron greaves
    g.fillStyle(0x3a2e28).fillRoundedRect(10, 18, 38, 32, 5) // heavy iron hull
    g.fillStyle(0xc88a32).fillCircle(29, 32, 11) // chest gear
    g.fillStyle(0x8c5a18).fillCircle(29, 32, 6); g.fillStyle(0xff9a3c).fillCircle(29, 32, 2.5) // furnace core
    g.fillStyle(0xd8a048).fillRect(18, 18, 22, 3).fillRect(14, 42, 30, 3) // brass trim
    g.fillStyle(0xc88a32).fillRoundedRect(2, 22, 10, 24, 3) // brass tower shield facing left
    g.fillStyle(0x5a4636).fillRoundedRect(46, 24, 9, 18, 3) // right arm
    g.fillStyle(0x524034).fillRoundedRect(18, 5, 22, 15, 4) // helm
    g.fillStyle(0x140d0a).fillRect(19, 11, 14, 4) // visor slit
    eyes(g, 21, 28, 13, 0xff9a3c, 1.8)
    g.fillStyle(0xc88a32).fillCircle(40, 14, 5).fillCircle(16, 14, 4) // shoulder cogs
  })

  make('steamflayer', 54, 54, (g) => {
    g.fillStyle(0xd8e0e8, 0.2).fillCircle(36, 14, 14) // venting steam
    g.fillStyle(0x2a262c).fillRoundedRect(18, 36, 8, 18, 2).fillRoundedRect(30, 36, 8, 18, 2) // legs
    g.fillStyle(0x46383e).fillRoundedRect(16, 18, 24, 22, 5) // leather & plate coat
    g.fillStyle(0xc87a38).fillRect(38, 14, 5, 16) // back boiler pipe
    g.fillStyle(0xff6a2a, 0.85).fillCircle(40, 12, 3) // hot vent
    g.fillStyle(0x3a2e34).fillCircle(24, 12, 9) // mask head
    g.fillStyle(0xb87834).fillRect(14, 10, 10, 5) // brass respirator snout left
    eyes(g, 19, 25, 11, 0xff5a2a, 1.8)
    g.fillStyle(0xc87a38).fillRoundedRect(4, 24, 14, 5, 2) // forward arm
    g.fillStyle(0xe8eef4).fillTriangle(0, 18, 6, 26, 2, 36) // serrated steam blade
    g.fillStyle(0xff7a30, 0.7).fillRect(2, 23, 4, 6) // heated edge
  })

  make('boilerimp', 48, 48, (g) => {
    g.fillStyle(0xff6422, 0.2).fillCircle(24, 26, 22) // furnace heat halo
    g.fillStyle(0x7a3a22).fillRect(16, 36, 5, 12).fillRect(28, 36, 5, 12) // legs
    g.fillStyle(0x9a4828).fillEllipse(25, 25, 26, 24) // potbelly boiler torso
    g.fillStyle(0xc87838).fillRect(13, 21, 24, 3).fillRect(13, 30, 24, 3) // iron bands
    g.fillStyle(0x220c08).fillCircle(22, 26, 6) // furnace grate
    g.fillStyle(0xff9a2e).fillCircle(22, 26, 4); g.fillStyle(0xffe066).fillCircle(21, 26, 2) // burning coals inside
    g.fillStyle(0x6e301c).fillRect(30, 6, 6, 12) // chimney stack
    g.fillStyle(0xd8e0e8, 0.55).fillCircle(34, 4, 4).fillCircle(39, 2, 3) // steam puff
    g.fillStyle(0xb24e2a).fillCircle(17, 13, 8) // imp head
    g.fillStyle(0x4a2010).fillTriangle(12, 8, 8, 0, 16, 6).fillTriangle(20, 7, 24, 0, 22, 9) // horns
    eyes(g, 13, 19, 12, 0xffe066, 1.7)
  })

  make('gearspider', 58, 44, (g) => {
    g.fillStyle(0x8a6428).fillCircle(36, 22, 13) // clockwork abdomen cog
    g.fillStyle(0x523a18).fillCircle(36, 22, 8)
    g.fillStyle(0xd8a848).fillRect(34, 6, 4, 32).fillRect(20, 20, 32, 4) // cog teeth cross
    g.fillStyle(0x3a2c20).fillCircle(17, 22, 9) // cephalothorax
    // jointed brass spider legs
    g.lineStyle(2.5, 0xc89238)
    g.lineBetween(16, 24, 6, 16); g.lineBetween(6, 16, 2, 36)
    g.lineBetween(22, 26, 16, 34); g.lineBetween(16, 34, 14, 43)
    g.lineBetween(32, 26, 34, 34); g.lineBetween(34, 34, 32, 43)
    g.lineBetween(42, 24, 52, 18); g.lineBetween(52, 18, 56, 38)
    eyes(g, 11, 16, 20, 0x5af0ff, 1.8)
    g.fillStyle(0xff8a30).fillCircle(14, 17, 1.2)
  })

  make('oilpriest', 50, 56, (g) => {
    g.fillStyle(0x1a181c).fillTriangle(10, 56, 42, 56, 26, 18) // oiled black robe
    g.fillStyle(0x8a6428).fillTriangle(20, 56, 32, 56, 26, 26) // brass stole
    g.fillStyle(0x363238).fillCircle(25, 16, 10) // hood
    g.fillStyle(0xd8a848).fillRect(19, 10, 12, 3) // brass circlet
    eyes(g, 20, 26, 16, 0xffaa38, 1.8)
    g.fillStyle(0x28242a).fillRoundedRect(6, 26, 14, 5, 2) // arm left
    g.fillStyle(0xc88a32).fillRect(6, 14, 3, 42) // brass censer staff
    g.fillStyle(0x302a24).fillCircle(7.5, 12, 6); g.fillStyle(0xff6a2a).fillCircle(7.5, 12, 3) // burning oil orb
    g.fillStyle(0x141016).fillCircle(7.5, 22, 2).fillCircle(10, 28, 1.5) // dripping oil drops
  })

  make('ticktockwisp', 48, 48, (g) => {
    g.fillStyle(0x48d8ff, 0.2).fillCircle(24, 24, 22) // chrono glow
    g.fillStyle(0xc8983a).fillCircle(24, 24, 15) // outer brass clock rim
    g.fillStyle(0x1a1626).fillCircle(24, 24, 12) // dark clock face
    g.fillStyle(0xd8e8ff).fillRect(23, 14, 2, 10).fillRect(16, 23, 8, 2) // clock hands
    g.lineStyle(2, 0xffe066).strokeCircle(24, 24, 15)
    g.fillStyle(0x48d8ff, 0.7).fillTriangle(36, 18, 48, 10, 42, 24).fillTriangle(36, 30, 48, 38, 40, 24) // chrono wisp tail
    eyes(g, 19, 27, 25, 0x5af0ff, 1.8)
  })

  // ----- mini bosses -----
  make('overdrive', 86, 92, (g) => {
    g.fillStyle(0xff5a1a, 0.22).fillCircle(44, 46, 40) // molten steam aura
    g.fillStyle(0x3a2820).fillRoundedRect(26, 70, 14, 22, 3).fillRoundedRect(48, 70, 14, 22, 3) // pistons
    g.fillStyle(0x52362a).fillRoundedRect(22, 28, 44, 44, 8) // furnace chest
    g.fillStyle(0xd8882e).fillRect(24, 34, 40, 4).fillRect(24, 60, 40, 4) // brass ribs
    g.fillStyle(0xff6e24).fillCircle(44, 48, 11); g.fillStyle(0xffe066).fillCircle(44, 48, 6) // overheated core
    g.fillStyle(0xc87828).fillCircle(22, 32, 11).fillCircle(66, 32, 11) // heavy pauldrons
    g.fillStyle(0x6e442c).fillRect(58, 6, 8, 22) // exhaust stack
    g.fillStyle(0xe8eef4, 0.5).fillCircle(64, 4, 6).fillCircle(72, 2, 5) // steam plume
    g.fillStyle(0x3e2a22).fillRoundedRect(33, 10, 22, 20, 5) // automaton head
    eyes(g, 36, 45, 19, 0xff3b1f, 2.2)
    g.fillStyle(0xb87028).fillRoundedRect(2, 38, 22, 14, 4) // crushing left piston fist
    g.fillStyle(0xff7b32).fillRect(2, 40, 4, 10) // superheated knuckle
  })

  make('clockmaiden', 82, 92, (g) => {
    g.fillStyle(0xffc857, 0.16).fillCircle(42, 46, 38) // golden aura
    g.fillStyle(0xc89638).fillCircle(60, 42, 12).fillCircle(60, 42, 6) // giant wind-up key behind
    g.fillStyle(0x1a1426).fillTriangle(16, 92, 68, 92, 42, 34) // porcelain-dark dress
    g.fillStyle(0xd8a848).fillRect(28, 60, 28, 3).fillRect(22, 76, 40, 3) // clockwork bands
    g.fillStyle(0x2a2038).fillRoundedRect(31, 30, 22, 24, 6) // bodice
    g.fillStyle(0xe8e0d8).fillCircle(42, 20, 10) // porcelain doll face
    eyes(g, 37, 44, 20, 0x48d8ff, 2)
    g.fillStyle(0x4a2e1c).fillTriangle(32, 14, 42, 4, 54, 14) // braided hair
    g.fillStyle(0xd8a848).fillCircle(42, 6, 4) // crown dial
    g.fillStyle(0x2a2038).fillRoundedRect(8, 34, 24, 6, 2) // arm left
    g.fillStyle(0xc89638).fillRect(6, 20, 3, 52) // pendulum staff
    g.fillStyle(0x1a1426).fillCircle(7.5, 18, 7); g.fillStyle(0xffc857).fillCircle(7.5, 18, 4) // pendulum orb
  })

  // ----- boss -----
  make('chronotitan', 124, 126, (g) => {
    g.fillStyle(0xff9a3c, 0.18).fillCircle(62, 62, 58) // chrono aura
    g.lineStyle(4, 0xd8a848, 0.75).strokeCircle(62, 44, 44) // giant brass halo clock behind shoulders
    g.fillStyle(0xd8a848).fillRect(60, 0, 4, 14).fillRect(60, 74, 4, 14).fillRect(18, 42, 14, 4).fillRect(92, 42, 14, 4) // 12/3/6/9 spokes
    g.fillStyle(0x2c201a).fillRoundedRect(38, 92, 18, 34, 4).fillRoundedRect(68, 92, 18, 34, 4) // titan legs
    g.fillStyle(0x3a2a22).fillRoundedRect(30, 34, 64, 62, 10) // titan torso
    g.fillStyle(0xc88a32).fillCircle(62, 62, 16) // giant chest timepiece
    g.fillStyle(0x1a1210).fillCircle(62, 62, 12)
    g.fillStyle(0xff9a3c).fillRect(61, 52, 2, 10).fillRect(54, 61, 8, 2) // glowing clock hands
    g.fillStyle(0xb87828).fillCircle(28, 40, 15).fillCircle(96, 40, 15) // brass shoulder pauldrons
    g.fillStyle(0x3a2a22).fillRoundedRect(46, 12, 32, 24, 6) // horned titan helm
    g.fillStyle(0xd8a848).fillTriangle(46, 16, 36, 2, 52, 12).fillTriangle(78, 16, 88, 2, 72, 12) // clock-hand horns
    eyes(g, 52, 66, 22, 0xffaa38, 2.8)
    g.fillStyle(0x3a2a22).fillRoundedRect(4, 44, 26, 16, 5) // forward arm
    g.fillStyle(0xc88a32).fillRect(2, 20, 6, 84) // hourglass-halberd shaft
    g.fillStyle(0xff9a3c).fillTriangle(0, 18, 14, 24, 5, 38) // scythe-clock head
  })
}
