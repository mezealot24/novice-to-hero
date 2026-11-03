import Phaser from 'phaser'
import { H, W } from './data/game-data'
import { makeTextures } from './gfx/textures'
import { DungeonScene } from './scenes/DungeonScene'
import { TitleScene } from './scenes/TitleScene'
import { CreateScene } from './scenes/CreateScene'
import { HubScene } from './scenes/HubScene'
import { CharacterScene } from './scenes/CharacterScene'
import { ForgeScene } from './scenes/ForgeScene'
import { ShopScene } from './scenes/ShopScene'
import { GemShopScene } from './scenes/GemShopScene'
import { BattleScene } from './scenes/BattleScene'
import { JobScene } from './scenes/JobScene'

class BootScene extends Phaser.Scene {
  constructor() { super('boot') }
  create() {
    makeTextures(this)
    this.scene.start('title')
  }
}

async function boot() {
  // wait (briefly) for the Thai + pixel fonts so canvas text doesn't render in a fallback face
  try {
    await Promise.race([
      Promise.all([document.fonts.load('20px "Mali"'), document.fonts.load('bold 20px "Mali"'), document.fonts.load('20px "Pixelify Sans"')]),
      new Promise((r) => setTimeout(r, 1500)),
    ])
  } catch { /* fonts are optional */ }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#14172b',
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    scene: [BootScene, TitleScene, CreateScene, HubScene, CharacterScene, ShopScene, ForgeScene, GemShopScene, JobScene, BattleScene, DungeonScene],
  })
  // handle for automated playtests
  ;(window as unknown as { __nth: Phaser.Game }).__nth = game
}
void boot()
