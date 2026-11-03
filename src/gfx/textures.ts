import Phaser from 'phaser'
import { TILE } from '../data/game-data'

// Placeholder art drawn in code: no image files to load, and nothing borrowed from RO.
// Swap any key here for a real sprite sheet later; the game only refers to texture keys.

type G = Phaser.GameObjects.Graphics

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false)
  draw(g)
  g.generateTexture(key, w, h)
  g.destroy()
}

// tiny seeded rng so the floor looks the same every run
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

export function makeTextures(scene: Phaser.Scene) {
  // --- floor: 4 grass variants
  for (let v = 0; v < 4; v++) {
    const r = rng(11 + v * 97)
    make(scene, `grass${v}`, TILE, TILE, (g) => {
      g.fillStyle(v % 2 ? 0x4f8a4b : 0x52904d).fillRect(0, 0, TILE, TILE)
      for (let i = 0; i < 9; i++) {
        const x = r() * TILE, y = r() * TILE
        g.fillStyle(r() > 0.5 ? 0x5fa257 : 0x447a40).fillRect(x, y, 2, 5)
      }
      if (v === 3) { g.fillStyle(0xf4e6c8).fillCircle(14, 30, 2.5); g.fillStyle(0xf2b84b).fillCircle(14, 30, 1) }
    })
  }

  // --- wall: mossy stone block
  make(scene, 'wall', TILE, TILE, (g) => {
    g.fillStyle(0x2c3150).fillRect(0, 0, TILE, TILE)
    g.fillStyle(0x3b4268).fillRect(2, 2, TILE / 2 - 3, TILE / 2 - 3).fillRect(TILE / 2 + 1, 2, TILE / 2 - 3, TILE / 2 - 3)
    g.fillStyle(0x363d60).fillRect(2, TILE / 2 + 1, TILE - 4, TILE / 2 - 3)
    g.fillStyle(0x4f8a4b, 0.6).fillRect(0, TILE - 5, TILE, 5)
  })

  // --- door: closed bars / open archway
  make(scene, 'door_closed', TILE, TILE, (g) => {
    g.fillStyle(0x1b1f3a).fillRect(0, 0, TILE, TILE)
    g.fillStyle(0x8d7244)
    for (let x = 6; x < TILE; x += 10) g.fillRect(x, 0, 4, TILE)
    g.fillStyle(0xb99a62).fillRect(0, 16, TILE, 4)
  })
  make(scene, 'door_open', TILE, TILE, (g) => {
    g.fillStyle(0x0b0d1a).fillRect(0, 0, TILE, TILE)
    g.fillStyle(0xf2b84b, 0.25).fillRect(0, TILE - 10, TILE, 10)
  })

  // --- soft shadow under units
  make(scene, 'shadow', 64, 20, (g) => {
    g.fillStyle(0x000000, 0.28).fillEllipse(32, 10, 60, 16)
  })

  // --- Novice: brown hair, cream tunic, little knife (faces right)
  make(scene, 'novice', 40, 48, (g) => {
    g.fillStyle(0x2b2238).fillRoundedRect(11, 37, 7, 9, 2).fillRoundedRect(22, 37, 7, 9, 2) // boots
    g.fillStyle(0xe7d3aa).fillRoundedRect(9, 22, 22, 18, 6) // tunic
    g.fillStyle(0x8d7244).fillRect(9, 32, 22, 3) // belt
    g.fillStyle(0xc9c9d6).fillRect(31, 26, 8, 3) // knife blade
    g.fillStyle(0x6b4b2a).fillRect(28, 25, 4, 5) // knife grip
    g.fillStyle(0xf3c9a0).fillCircle(20, 15, 11) // head
    g.fillStyle(0x6b3f22).fillEllipse(18, 7, 24, 12).fillTriangle(8, 8, 14, 4, 9, 18) // hair
    g.fillStyle(0x2b2238).fillCircle(24, 16, 1.8).fillCircle(17, 16, 1.8) // eyes
    g.fillStyle(0xe58f8f, 0.7).fillCircle(27, 20, 2) // cheek
  })

  // --- base classes: same little body, new outfit + weapon (original designs)
  const body = (g: G, tunic: number, trim: number) => {
    g.translateCanvas(4, 6) // room for hats / weapons above and right of the 40x48 body
    g.fillStyle(0x2b2238).fillRoundedRect(11, 37, 7, 9, 2).fillRoundedRect(22, 37, 7, 9, 2)
    g.fillStyle(tunic).fillRoundedRect(9, 22, 22, 18, 6)
    g.fillStyle(trim).fillRect(9, 32, 22, 3)
    g.fillStyle(0xf3c9a0).fillCircle(20, 15, 11)
    g.fillStyle(0x2b2238).fillCircle(24, 16, 1.8).fillCircle(17, 16, 1.8)
    g.fillStyle(0xe58f8f, 0.7).fillCircle(27, 20, 2)
  }
  const hair = (g: G, c = 0x6b3f22) => g.fillStyle(c).fillEllipse(18, 7, 24, 12).fillTriangle(8, 8, 14, 4, 9, 18)
  make(scene, 'hero_swordsman', 48, 52, (g) => {
    body(g, 0x8fa3c9, 0x4a5578); hair(g)
    g.fillStyle(0xb8c4dc).fillRect(9, 22, 22, 5) // pauldron
    g.fillStyle(0xdfe6f2).fillRect(31, 8, 4, 22); g.fillStyle(0x8d7244).fillRect(28, 28, 10, 3).fillRect(32, 30, 2, 6) // sword
  })
  make(scene, 'hero_archer', 48, 52, (g) => {
    body(g, 0x6aa86a, 0x3d6e3d); hair(g, 0x9a6a32)
    g.fillStyle(0x3d6e3d).fillTriangle(6, 8, 30, 4, 22, -2) // feather cap
    g.lineStyle(3, 0x8d5a2b).beginPath(); g.arc(30, 26, 13, -1.3, 1.3); g.strokePath()
    g.lineStyle(1, 0xf6eedc).lineBetween(33, 13, 33, 39)
  })
  make(scene, 'hero_mage', 48, 52, (g) => {
    body(g, 0x7b5cc4, 0xf2b84b)
    g.fillStyle(0x7b5cc4).fillRoundedRect(7, 28, 26, 14, 4) // robe
    g.fillStyle(0x5a3f9a).fillTriangle(6, 8, 34, 8, 22, -6).fillRect(4, 6, 32, 4) // hat
    g.fillStyle(0x8d5a2b).fillRect(34, 10, 3, 34); g.fillStyle(0x7fd7ff).fillCircle(35.5, 9, 4) // staff
  })
  make(scene, 'hero_cleric', 48, 52, (g) => {
    body(g, 0xf2efe6, 0xf2b84b); hair(g, 0xe0c070)
    g.fillStyle(0xf2b84b).fillRect(18, 23, 4, 12).fillRect(15, 26, 10, 3) // cross on robe
    g.fillStyle(0x8d7244).fillRect(31, 22, 3, 14); g.fillStyle(0xd9dbe6).fillCircle(32.5, 21, 5) // mace
  })
  make(scene, 'hero_thief', 48, 52, (g) => {
    body(g, 0x4a4a5e, 0x2b2238); hair(g, 0x2b2238)
    g.fillStyle(0xd94a4a).fillRect(8, 6, 24, 5).fillTriangle(8, 6, 2, 14, 8, 11) // bandana
    g.fillStyle(0x2b2238, 0.8).fillRect(12, 18, 16, 6) // mask
    g.fillStyle(0xc9c9d6).fillTriangle(31, 24, 40, 27, 31, 30); g.fillStyle(0x6b4b2a).fillRect(28, 25, 4, 5)
  })

  // --- Jellop: round green slime
  make(scene, 'jellop', 40, 34, (g) => {
    g.fillStyle(0x2f8f4e).fillEllipse(20, 21, 38, 26)
    g.fillStyle(0x52c46f).fillEllipse(20, 19, 34, 24)
    g.fillStyle(0xffffff, 0.55).fillEllipse(12, 12, 9, 5)
    g.fillStyle(0x14301c).fillCircle(15, 20, 2.4).fillCircle(26, 20, 2.4)
    g.fillStyle(0x14301c).fillRect(18, 25, 5, 1.5)
  })

  // --- Wolf: grey, side view (faces right)
  make(scene, 'wolf', 52, 36, (g) => {
    g.fillStyle(0x5e6478).fillTriangle(2, 14, 10, 18, 4, 24) // tail
    g.fillStyle(0x4a4f63).fillRect(12, 26, 5, 9).fillRect(32, 26, 5, 9) // legs
    g.fillStyle(0x7a8197).fillEllipse(24, 21, 32, 16) // body
    g.fillStyle(0x7a8197).fillCircle(40, 15, 9) // head
    g.fillStyle(0x7a8197).fillTriangle(34, 9, 38, 0, 41, 8).fillTriangle(41, 8, 45, 0, 47, 10) // ears
    g.fillStyle(0xb7bccb).fillEllipse(46, 18, 10, 6) // snout
    g.fillStyle(0x1b1f3a).fillCircle(51, 17, 1.6) // nose
    g.fillStyle(0xf2b84b).fillCircle(42, 13, 1.8) // eye
  })

  // --- Jellop King: big slime with a crown
  make(scene, 'king', 100, 90, (g) => {
    g.fillStyle(0x2f8f4e).fillEllipse(50, 58, 96, 62)
    g.fillStyle(0x52c46f).fillEllipse(50, 55, 88, 58)
    g.fillStyle(0xffffff, 0.5).fillEllipse(30, 40, 18, 9)
    g.fillStyle(0x14301c).fillCircle(38, 55, 4.5).fillCircle(62, 55, 4.5)
    g.fillStyle(0x14301c).fillRect(43, 67, 14, 3)
    g.fillStyle(0xf2b84b).fillRect(32, 22, 36, 9)
    g.fillTriangle(32, 22, 38, 6, 44, 22).fillTriangle(44, 22, 50, 2, 56, 22).fillTriangle(56, 22, 62, 6, 68, 22)
    g.fillStyle(0xe5484d).fillCircle(50, 26, 3)
  })


  // --- Dungeon 2 (ป่าหมาป่าเงา)
  make(scene, 'bat', 48, 30, (g) => {
    g.fillStyle(0x3a2f5a).fillTriangle(0, 8, 20, 12, 10, 26).fillTriangle(48, 8, 28, 12, 38, 26) // wings
    g.fillStyle(0x52447a).fillEllipse(24, 16, 16, 18)
    g.fillStyle(0x52447a).fillTriangle(17, 9, 19, 0, 22, 8).fillTriangle(26, 8, 29, 0, 31, 9) // ears
    g.fillStyle(0xff5a6a).fillCircle(20, 15, 2).fillCircle(28, 15, 2)
    g.fillStyle(0xf6eedc).fillTriangle(21, 21, 23, 21, 22, 24).fillTriangle(25, 21, 27, 21, 26, 24)
  })
  make(scene, 'shroom', 40, 44, (g) => {
    g.fillStyle(0xe8dcc0).fillRoundedRect(13, 22, 14, 20, 5) // stem
    g.fillStyle(0x7a3fa0).fillEllipse(20, 16, 38, 26) // cap
    g.fillStyle(0xd9b8ff).fillCircle(10, 12, 3).fillCircle(22, 7, 3.5).fillCircle(30, 15, 2.5)
    g.fillStyle(0x2b2238).fillCircle(17, 31, 1.8).fillCircle(24, 31, 1.8)
  })
  make(scene, 'boar', 60, 40, (g) => {
    g.fillStyle(0x4a2f22).fillRect(14, 30, 6, 10).fillRect(38, 30, 6, 10) // legs
    g.fillStyle(0x7a4f32).fillEllipse(28, 24, 44, 24) // body
    g.fillStyle(0x5a3a26).fillTriangle(12, 12, 40, 12, 26, 4) // bristles
    g.fillStyle(0x8d5e3c).fillCircle(48, 22, 10) // head
    g.fillStyle(0xc9a07a).fillEllipse(56, 26, 9, 8) // snout
    g.fillStyle(0xdfe6f2).fillTriangle(52, 30, 58, 30, 50, 20) // iron tusk
    g.fillStyle(0xff5a4e).fillCircle(50, 17, 1.8)
    g.fillStyle(0x9aa0b4).fillRoundedRect(16, 14, 22, 8, 3) // iron plate
  })
  const wolfShape = (g: G, body: number, dark: number, eye: number) => {
    g.fillStyle(dark).fillTriangle(2, 14, 10, 18, 4, 24)
    g.fillStyle(dark).fillRect(12, 26, 5, 9).fillRect(32, 26, 5, 9)
    g.fillStyle(body).fillEllipse(24, 21, 32, 16)
    g.fillStyle(body).fillCircle(40, 15, 9)
    g.fillStyle(body).fillTriangle(34, 9, 38, 0, 41, 8).fillTriangle(41, 8, 45, 0, 47, 10)
    g.fillStyle(dark).fillEllipse(46, 18, 10, 6)
    g.fillStyle(0x0b0d1a).fillCircle(51, 17, 1.6)
    g.fillStyle(eye).fillCircle(42, 13, 1.8)
  }
  make(scene, 'shadowwolf', 52, 36, (g) => wolfShape(g, 0x3a3f5a, 0x262a40, 0x7fd7ff))
  make(scene, 'alpha', 104, 72, (g) => {
    g.scaleCanvas(2, 2)
    wolfShape(g, 0x2e3250, 0x1b1f3a, 0xff5a4e)
    g.fillStyle(0xc9c9d6).fillTriangle(20, 13, 26, 9, 30, 14) // scar / silver mane
  })

  // --- Dungeon 3 (ซากป้อมวีรชน): original designs, all face left toward the hero
  make(scene, 'skeleton', 40, 52, (g) => {
    g.fillStyle(0xe8e4d4).fillRect(14, 36, 4, 14).fillRect(22, 36, 4, 14) // legs
    g.fillStyle(0xe8e4d4).fillRect(18, 18, 4, 20) // spine
    for (let y = 20; y < 34; y += 4) g.fillRect(12, y, 16, 2) // ribs
    g.fillStyle(0xf2efe4).fillCircle(20, 11, 9)
    g.fillStyle(0x1b1f3a).fillCircle(16, 11, 2.4).fillCircle(23, 11, 2.4).fillRect(17, 16, 6, 1.5)
    g.fillStyle(0x6a5a3a).fillRoundedRect(2, 20, 11, 16, 3); g.fillStyle(0x9a8a5a).fillCircle(7.5, 28, 2.5) // shield
    g.fillStyle(0xc9c9d6).fillRect(29, 10, 3, 24) // spear
  })
  make(scene, 'wisp', 40, 44, (g) => {
    g.fillStyle(0x3a6aff, 0.35).fillCircle(20, 26, 17)
    g.fillStyle(0x5aa0ff).fillTriangle(8, 28, 20, 0, 32, 28)
    g.fillStyle(0x9fd0ff).fillCircle(20, 28, 11)
    g.fillStyle(0xeaf6ff).fillCircle(20, 30, 6)
    g.fillStyle(0x14172b).fillCircle(16, 28, 1.8).fillCircle(23, 28, 1.8)
  })
  make(scene, 'gargoyle', 60, 52, (g) => {
    g.fillStyle(0x5a5e70).fillTriangle(30, 18, 2, 4, 10, 30).fillTriangle(30, 18, 58, 4, 50, 30) // wings
    g.fillStyle(0x7a7e90).fillRoundedRect(16, 18, 28, 26, 8) // body
    g.fillStyle(0x6a6e80).fillRect(18, 42, 8, 10).fillRect(34, 42, 8, 10)
    g.fillStyle(0x8a8ea0).fillCircle(30, 15, 10)
    g.fillStyle(0x8a8ea0).fillTriangle(21, 10, 22, 0, 27, 7).fillTriangle(33, 7, 38, 0, 39, 10) // horns
    g.fillStyle(0xff8c42).fillCircle(26, 14, 2).fillCircle(34, 14, 2)
  })
  // humanoid mini bosses: 56x72 body, scaled up as bosses in battle
  const duelBody = (g: G, coat: number, trim: number, skin = 0xf3c9a0) => {
    g.fillStyle(0x2b2238).fillRoundedRect(20, 58, 7, 13, 2).fillRoundedRect(31, 58, 7, 13, 2)
    g.fillStyle(coat).fillRoundedRect(16, 30, 26, 30, 7)
    g.fillStyle(trim).fillRect(16, 46, 26, 3)
    g.fillStyle(skin).fillCircle(29, 20, 12)
    g.fillStyle(0x2b2238).fillCircle(24, 21, 1.9).fillCircle(31, 21, 1.9)
  }
  make(scene, 'duelist', 56, 72, (g) => {
    duelBody(g, 0x5a7ab8, 0xe8e8f4)
    g.fillStyle(0xeef0ff).fillEllipse(31, 11, 26, 12).fillTriangle(40, 10, 54, 18, 42, 22) // silver hair + ponytail
    g.fillStyle(0xe8e8f4).fillTriangle(16, 30, 26, 30, 21, 40) // collar
    g.fillStyle(0xdfe6f2).fillRect(0, 39, 20, 2); g.fillStyle(0xf2b84b).fillCircle(20, 40, 3) // rapier
  })
  make(scene, 'gunner', 64, 72, (g) => {
    duelBody(g, 0x3a3f5a, 0xff6fb5)
    g.fillStyle(0x4ab0ff).fillEllipse(29, 11, 26, 12)
    g.fillStyle(0x4ab0ff).fillRect(38, 14, 4, 34).fillRect(16, 14, 4, 30) // long braids
    g.fillStyle(0xff6fb5).fillCircle(40, 48, 2.5).fillCircle(18, 44, 2.5)
    g.fillStyle(0x6a8a5a).fillRoundedRect(4, 22, 40, 11, 4); g.fillStyle(0xd94a4a).fillTriangle(0, 27, 6, 21, 6, 33) // rocket tube
    g.fillStyle(0xf2b84b).fillRect(46, 25, 6, 5)
  })
  make(scene, 'drainer', 60, 76, (g) => {
    duelBody(g, 0x5a1a2a, 0xc9a050, 0xd9c0b0)
    g.fillStyle(0x5a1a2a).fillTriangle(12, 72, 46, 72, 29, 34) // long robe
    g.fillStyle(0x2b2238).fillEllipse(29, 10, 26, 11)
    g.fillStyle(0xc9a050).fillRect(20, 30, 18, 4) // mantle
    g.fillStyle(0x1b1f3a).fillEllipse(46, 26, 14, 9).fillTriangle(50, 24, 58, 20, 52, 28); g.fillStyle(0xff3a3a).fillCircle(43, 25, 1.5) // raven
    g.fillStyle(0xff3a5a, 0.85).fillCircle(9, 42, 6); g.fillStyle(0xd9c0b0).fillRect(10, 40, 8, 4) // glowing hand
  })
  make(scene, 'hunter', 104, 72, (g) => {
    g.scaleCanvas(2, 2)
    wolfShape(g, 0x7a3a3a, 0x4a1f22, 0xffe08a)
    g.fillStyle(0x2b2238).fillRect(20, 18, 14, 3) // collar strap
    g.fillStyle(0xd94a4a).fillTriangle(38, 20, 44, 20, 41, 26) // bloody jaw
  })
  make(scene, 'deathknight', 96, 100, (g) => {
    g.fillStyle(0x1b1f3a).fillRoundedRect(30, 78, 14, 22, 3).fillRoundedRect(52, 78, 14, 22, 3)
    g.fillStyle(0x3a3f5a).fillRoundedRect(22, 38, 52, 44, 10) // armor
    g.fillStyle(0x5a1a2a).fillTriangle(22, 44, 74, 44, 48, 96) // tabard
    g.fillStyle(0x5a5e70).fillCircle(26, 40, 10).fillCircle(70, 40, 10) // pauldrons
    g.fillStyle(0x4a4f63).fillRoundedRect(32, 8, 32, 32, 8) // helmet
    g.fillStyle(0x0b0d1a).fillRect(36, 20, 24, 6)
    g.fillStyle(0xff3a3a).fillCircle(42, 23, 2.5).fillCircle(53, 23, 2.5)
    g.fillStyle(0x6a6e80).fillTriangle(32, 10, 26, 0, 38, 8).fillTriangle(64, 10, 70, 0, 58, 8) // horns
    g.fillStyle(0xbfc4d4).fillRect(4, 30, 6, 56); g.fillStyle(0x7a3fa0).fillRect(0, 26, 14, 5) // greatsword
  })

  // --- particles / pickups
  make(scene, 'dot', 8, 8, (g) => { g.fillStyle(0xffffff).fillCircle(4, 4, 4) })
  make(scene, 'coin', 14, 14, (g) => {
    g.fillStyle(0x8d6a1f).fillCircle(7, 7, 7)
    g.fillStyle(0xf2b84b).fillCircle(7, 7, 5.5)
    g.fillStyle(0xfff0b8).fillRect(5, 4, 2, 6)
  })

  // --- slash arc: a crescent pointing right, rotated at runtime
  make(scene, 'slash', 120, 120, (g) => {
    g.lineStyle(10, 0xffffff, 0.9)
    g.beginPath(); g.arc(60, 60, 44, -1.05, 1.05); g.strokePath()
    g.lineStyle(4, 0xfff0b8, 0.9)
    g.beginPath(); g.arc(60, 60, 54, -0.8, 0.8); g.strokePath()
  })
}
