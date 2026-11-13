import Phaser from 'phaser'
import { H, W } from './data/game-data'
import { makeTextures } from './gfx/textures'
import { DungeonScene } from './scenes/DungeonScene'
import { TitleScene } from './scenes/TitleScene'
import { CreateScene } from './scenes/CreateScene'
import { HubScene } from './scenes/HubScene'
import { CharacterScene } from './scenes/CharacterScene'
import { ForgeScene } from './scenes/forge/ForgeScene'
import { ShopScene } from './scenes/ShopScene'
import { GemShopScene } from './scenes/GemShopScene'
import { BattleScene } from './scenes/BattleScene'
import { JobScene } from './scenes/JobScene'
import { CloudScene } from './scenes/CloudScene'
import { liveInfo, loadLiveConfig } from './live-config'
import { initAnalytics, setAnalyticsContext, type Props } from './analytics'
import { load } from './save'
import { initDisplay } from './display'
import { deathText, loadDeaths } from './data/combat-log'

class BootScene extends Phaser.Scene {
  constructor() { super('boot') }
  create() {
    makeTextures(this)
    this.scene.start('title')
  }
}

async function boot() {
  initDisplay() // night-play brightness: before any await so a dimmed screen never flashes bright while fonts load
  // wait (briefly) for the Thai + pixel fonts so canvas text doesn't render in a fallback face
  const fonts = Promise.race([
    Promise.all([document.fonts.load('20px "Mali"'), document.fonts.load('bold 20px "Mali"'), document.fonts.load('20px "Pixelify Sans"')]),
    new Promise((r) => setTimeout(r, 1500)),
  ]).catch(() => { /* fonts are optional */ })
  // live balance patch must land before any scene reads src/data; it can never block boot (own timeout, errors swallowed)
  await Promise.all([fonts, loadLiveConfig().catch(() => liveInfo)])
  ;(window as unknown as { __nth_cfg: typeof liveInfo }).__nth_cfg = liveInfo
  setAnalyticsContext((): Props => { // game numbers only (never the name): lets every event be cut by progress
    const s = load()
    return s ? { base_lv: s.baseLevel, job: s.job, job_lv: s.jobLevel, job2: s.job2 ?? null, clears: s.clears, cfg: liveInfo.releaseId ?? null } : { cfg: liveInfo.releaseId ?? null }
  })
  initAnalytics()

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#14172b',
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    scene: [BootScene, TitleScene, CreateScene, HubScene, CharacterScene, ShopScene, ForgeScene, GemShopScene, CloudScene, JobScene, BattleScene, DungeonScene],
  })
  // handle for automated playtests
  ;(window as unknown as { __nth: Phaser.Game }).__nth = game
  // v120 combat log: `nthDeaths()` prints the last deaths (newest first), `nthDeaths(0)` only the newest
  ;(window as unknown as { nthDeaths: (i?: number) => string }).nthDeaths = (i) => { const all = loadDeaths(), pick = i === undefined ? all : all.slice(i, i + 1); const t = pick.map(deathText).join('\n\n') || 'ยังไม่มี death log'; console.info(t); return t }
}
void boot()
