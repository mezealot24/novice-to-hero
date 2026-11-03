// Small UI kit for the menu scenes: buttons, panels, top bar, toasts, modal confirm.
// Everything is drawn in code (no image files), sized for a 960x576 canvas that scales to fit phones.
import Phaser from 'phaser'
import { COLORS, FONT_NUM, FONT_UI, H, W } from './data/game-data'
import { save } from './save'
import { sfx, unlock } from './sfx'

export const UI = {
  night: 0x14172b,
  panel: 0x232845,
  panelHi: 0x2f3560,
  line: 0x454c80,
  cream: 0xf4e6c8,
  ink: '#2b2238',
  text: '#f6eedc',
  sub: '#a9a6c7',
  gold: '#f2b84b',
  gem: '#7fd7ff',
  green: '#6fd08c',
  red: '#ff7a7a',
}

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size = 18, color = UI.text, bold = false) {
  return scene.add.text(x, y, s, { fontFamily: FONT_UI, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', color, lineSpacing: 4 })
}
export function num(scene: Phaser.Scene, x: number, y: number, s: string, size = 18, color = UI.text) {
  return scene.add.text(x, y, s, { fontFamily: FONT_NUM, fontSize: `${size}px`, color, stroke: '#14172b', strokeThickness: 3 })
}

/** Rounded panel. Returns the graphics so callers can depth/sort it. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill = UI.panel, stroke = UI.line, r = 14) {
  const g = scene.add.graphics()
  g.fillStyle(fill, 0.96).fillRoundedRect(x, y, w, h, r)
  g.lineStyle(2, stroke, 1).strokeRoundedRect(x, y, w, h, r)
  return g
}

export interface Btn extends Phaser.GameObjects.Container { setLabel(s: string): Btn; setEnabled(on: boolean): Btn }

/** Centered button. Fires on pointerup (so drags off it cancel). */
export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void,
  o: { fill?: number; color?: string; size?: number; stroke?: number } = {}): Btn {
  const fill = o.fill ?? COLORS.gold
  const g = scene.add.graphics()
  const t = scene.add.text(0, 0, label, { fontFamily: FONT_UI, fontSize: `${o.size ?? 20}px`, fontStyle: 'bold', color: o.color ?? UI.ink, align: 'center', lineSpacing: 2 }).setOrigin(0.5)
  const c = scene.add.container(x, y, [g, t]) as Btn
  let enabled = true, hover = false
  const draw = () => {
    const f = enabled ? fill : 0x4a4e6e
    g.clear()
    g.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 12)
    g.fillStyle(f, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 12)
    g.fillStyle(0xffffff, hover && enabled ? 0.18 : 0.08).fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h / 2 - 3, 9)
    g.lineStyle(2, o.stroke ?? 0x000000, 0.35).strokeRoundedRect(-w / 2, -h / 2, w, h, 12)
    t.setAlpha(enabled ? 1 : 0.55)
  }
  draw()
  c.setSize(w, h).setInteractive({ useHandCursor: true })
  c.on('pointerover', () => { hover = true; draw() })
  c.on('pointerout', () => { hover = false; c.setScale(1); draw() })
  c.on('pointerdown', () => { if (enabled) c.setScale(0.96) })
  c.on('pointerup', () => {
    c.setScale(1)
    if (!enabled) return
    unlock(); sfx.pop()
    onClick()
  })
  c.setLabel = (s: string) => { t.setText(s); return c }
  c.setEnabled = (on: boolean) => { enabled = on; draw(); return c }
  return c
}

/** Floating message near the top. */
export function toast(scene: Phaser.Scene, s: string, color = UI.gold) {
  const t = scene.add.text(W / 2, 96, s, { fontFamily: FONT_UI, fontSize: '20px', fontStyle: 'bold', color, stroke: '#14172b', strokeThickness: 6, align: 'center' })
    .setOrigin(0.5).setDepth(50000)
  scene.tweens.add({ targets: t, y: 80, alpha: 0, delay: 1300, duration: 400, onComplete: () => t.destroy() })
}

/** Modal yes/no. Background swallows taps. */
export function confirm(scene: Phaser.Scene, title: string, body: string, ok: string, onOk: () => void, cancel = 'ยกเลิก') {
  const c = scene.add.container(0, 0).setDepth(40000)
  c.add(scene.add.rectangle(W / 2, H / 2, W, H, UI.night, 0.75).setInteractive())
  const pw = 520, ph = 260
  c.add(panel(scene, W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, UI.panelHi, COLORS.gold))
  c.add(txt(scene, W / 2, H / 2 - ph / 2 + 26, title, 24, UI.gold, true).setOrigin(0.5, 0))
  c.add(txt(scene, W / 2, H / 2 - ph / 2 + 70, body, 17, UI.text).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(pw - 50))
  c.add(button(scene, W / 2 - 110, H / 2 + ph / 2 - 44, 190, 50, cancel, () => c.destroy(), { fill: 0x5a5f8a, color: UI.text }))
  c.add(button(scene, W / 2 + 110, H / 2 + ph / 2 - 44, 190, 50, ok, () => { c.destroy(); onOk() }))
  return c
}

/** Diamond gem icon drawn with graphics. */
export function gemIcon(scene: Phaser.Scene, x: number, y: number, s = 9) {
  const g = scene.add.graphics({ x, y })
  g.fillStyle(0x7fd7ff).fillPoints([new Phaser.Math.Vector2(0, -s), new Phaser.Math.Vector2(s, -s * 0.2), new Phaser.Math.Vector2(0, s), new Phaser.Math.Vector2(-s, -s * 0.2)], true)
  g.fillStyle(0xffffff, 0.6).fillPoints([new Phaser.Math.Vector2(0, -s), new Phaser.Math.Vector2(s * 0.45, -s * 0.2), new Phaser.Math.Vector2(0, -s * 0.05), new Phaser.Math.Vector2(-s * 0.45, -s * 0.2)], true)
  return g
}

/** Top bar used by every menu scene: back button, title, zeny + gems. Returns a refresh() for the wallet. */
export function topBar(scene: Phaser.Scene, title: string, onBack?: () => void) {
  const g = scene.add.graphics().setDepth(20000)
  g.fillStyle(UI.night, 0.92).fillRect(0, 0, W, 56)
  g.lineStyle(2, UI.line, 1).lineBetween(0, 56, W, 56)
  if (onBack) button(scene, 58, 28, 96, 40, '‹ กลับ', onBack, { fill: 0x5a5f8a, color: UI.text, size: 17 }).setDepth(20001)
  txt(scene, onBack ? 122 : 20, 28, title, 22, UI.text, true).setOrigin(0, 0.5).setDepth(20001)
  // wallet, right aligned: [coin zeny] [gem gems]
  const zeny = num(scene, 0, 28, '', 20, UI.gold).setOrigin(1, 0.5).setDepth(20001)
  const coin = scene.add.image(0, 28, 'coin').setScale(1.3).setDepth(20001)
  const gems = num(scene, W - 18, 28, '', 20, UI.gem).setOrigin(1, 0.5).setDepth(20001)
  const gem = gemIcon(scene, 0, 28).setDepth(20001)
  const refresh = () => {
    const s = save()
    gems.setText(`${s.gems}`)
    gem.x = gems.x - gems.width - 14
    zeny.setText(`${s.zeny}`).setX(gem.x - 26)
    coin.x = zeny.x - zeny.width - 14
  }
  refresh()
  return refresh
}

/** Simple tab strip. Calls onPick(i) immediately for `start`. */
export function tabs(scene: Phaser.Scene, x: number, y: number, labels: string[], w: number, onPick: (i: number) => void, start = 0) {
  const btns: Btn[] = []
  const pick = (i: number) => {
    btns.forEach((b, j) => b.setAlpha(j === i ? 1 : 0.55))
    onPick(i)
  }
  labels.forEach((l, i) => btns.push(button(scene, x + i * (w + 8) + w / 2, y, w, 40, l, () => pick(i), { size: 17 })))
  pick(start)
  return btns
}

/** Fullscreen toggle (hidden where the browser can't do it, e.g. iPhone Safari). Cleans its listeners on scene shutdown. */
export function fullscreenButton(scene: Phaser.Scene, x: number, y: number) {
  if (!scene.scale.fullscreen.available) return undefined
  const size = 34
  const g = scene.add.graphics()
  const draw = () => {
    if (!g.active) return
    g.clear().fillStyle(UI.night, 0.7).fillRoundedRect(-size / 2, -size / 2, size, size, 6)
    g.lineStyle(3, COLORS.cream, 0.9)
    const a = 9, b = 4, inward = scene.scale.isFullscreen ? -1 : 1
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = sx * a, cy = sy * a
      g.lineBetween(cx, cy, cx - sx * b * inward, cy)
      g.lineBetween(cx, cy, cx, cy - sy * b * inward)
    }
  }
  draw()
  const btn = scene.add.container(x, y, [g]).setSize(size + 10, size + 10).setDepth(20003).setInteractive({ useHandCursor: true })
  btn.on('pointerup', () => toggleFullscreen(scene))
  const onF = () => toggleFullscreen(scene)
  scene.input.keyboard?.on('keydown-F', onF)
  scene.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, draw)
  scene.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, draw)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, draw)
    scene.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, draw)
    scene.input.keyboard?.off('keydown-F', onF)
  })
  return btn
}

export function toggleFullscreen(scene: Phaser.Scene) {
  if (scene.scale.isFullscreen) { scene.scale.stopFullscreen(); return }
  scene.scale.startFullscreen()
  try { const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }; o.lock?.('landscape').catch(() => {}) } catch { /* not supported */ }
}

/** Fade to another scene. */
export function go(scene: Phaser.Scene, key: string, data?: object) {
  scene.input.enabled = false
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { scene.input.enabled = true })
  scene.cameras.main.fadeOut(160, 20, 23, 43)
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data))
}

/** Soft backdrop: night sky, a few stars, hills. */
export function backdrop(scene: Phaser.Scene, hills = true) {
  const g = scene.add.graphics().setDepth(-100)
  g.fillGradientStyle(0x1b1f3a, 0x1b1f3a, 0x2c2a4f, 0x3a2f55, 1).fillRect(0, 0, W, H)
  const r = new Phaser.Math.RandomDataGenerator(['nth'])
  for (let i = 0; i < 50; i++) g.fillStyle(0xffffff, r.realInRange(0.15, 0.6)).fillCircle(r.between(0, W), r.between(0, H * 0.55), r.realInRange(0.6, 1.6))
  if (hills) {
    g.fillStyle(0x2a4a3a, 1).fillEllipse(W * 0.2, H + 40, W * 0.9, 260)
    g.fillStyle(0x305a42, 1).fillEllipse(W * 0.8, H + 60, W * 0.9, 280)
    g.fillStyle(0x3d6e4c, 1).fillEllipse(W * 0.5, H + 90, W * 1.2, 230)
  }
  scene.cameras.main.fadeIn(180, 20, 23, 43)
  return g
}
