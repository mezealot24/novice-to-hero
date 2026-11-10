// Small UI kit for the menu scenes: buttons, panels, top bar, toasts, modal confirm.
// Everything is drawn in code (no image files), sized for a 960x576 canvas that scales to fit phones.
import Phaser from 'phaser'
import { COLORS, FONT_NUM, FONT_UI, H, W } from './data/game-data'
import { GRADE } from './data/craft'
import { matById } from './data/materials'
import { SLOTS, type Item } from './data/meta'
import { fodderToBuy, pickFodder, zenyShort, type ForgeCost, type Wallet } from './data/refine'
import { save } from './save'
import { sfx, unlock } from './sfx'
import { track } from './analytics'

export const UI = {
  night: 0x121424,       // Deep fantasy night sky
  panel: 0x1c213a,       // Slate navy panel face
  panelHi: 0x272d4e,     // Raised panel / active card
  panelInner: 0x131728,  // Inset recessed slot
  line: 0x3d476e,        // Bevel outer shadow line
  lineHi: 0x5a689b,      // Bevel outer light highlight line
  goldRim: 0x8f6a2b,     // Gold border dark edge
  goldLight: 0xf6cb65,   // Gold border bright highlight
  goldGlow: 0xffdf88,    // Gem/Gold specular spark
  cream: 0xf4e6c8,
  ink: '#1e1926',
  text: '#fbf5e8',       // Slightly warmer RPG parchment white
  sub: '#a0a3c4',
  gold: '#f2b84b',
  goldDark: 0xc48c28,
  gem: '#7fd7ff',
  green: '#6fd08c',
  red: '#ff7a7a',
}

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size = 18, color = UI.text, bold = false) {
  return scene.add.text(x, y, s, { fontFamily: FONT_UI, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', color, lineSpacing: 4 })
}
export function num(scene: Phaser.Scene, x: number, y: number, s: string, size = 18, color = UI.text) {
  return scene.add.text(x, y, s, { fontFamily: FONT_NUM, fontSize: `${size}px`, color, stroke: '#121424', strokeThickness: 3 })
}

/** Draw decorative corner rivets/studs for RPG metal/wooden frame feel. */
function drawRivet(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r = 3, gold = false) {
  // Rivet shadow
  g.fillStyle(0x000000, 0.5).fillCircle(cx + 0.8, cy + 0.8, r)
  // Rivet metallic base
  g.fillStyle(gold ? 0x9e7025 : 0x2e3550, 1).fillCircle(cx, cy, r)
  // Top-left highlight
  g.fillStyle(gold ? 0xfde395 : 0x7c8dbd, 0.9).fillCircle(cx - 0.7, cy - 0.7, r * 0.5)
}

/** Rounded RPG Framed Panel. Features double-bevel metallic borders and corner rivets. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill = UI.panel, stroke = UI.line, r = 12) {
  const g = scene.add.graphics()
  // 1. Soft drop shadow behind panel
  g.fillStyle(0x000000, 0.45).fillRoundedRect(x + 2, y + 3, w, h, r)
  // 2. Base dark rim for bevel depth
  g.fillStyle(0x0e101c, 0.95).fillRoundedRect(x, y, w, h, r)
  // 3. Panel inner body (slight inset)
  g.fillStyle(fill, 0.98).fillRoundedRect(x + 1.5, y + 1.5, w - 3, h - 3, Math.max(4, r - 2))
  // 4. Subtle top inner highlight
  g.fillStyle(0xffffff, 0.04).fillRoundedRect(x + 3, y + 3, w - 6, Math.min(24, (h - 6) / 2), Math.max(3, r - 3))
  // 5. Outer beveled frame
  const isGold = stroke === COLORS.gold || stroke === UI.goldDark || stroke === 0xf2b84b
  g.lineStyle(1.5, stroke, 0.9).strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, r)
  // Inner hairline for crisp metallic feel
  g.lineStyle(1, isGold ? 0x5a3e14 : 0x161828, 0.6).strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, Math.max(3, r - 3))

  // Corner metallic rivets on sizable panels
  if (w >= 70 && h >= 50) {
    const pad = Math.min(10, Math.max(6, Math.round(r * 0.7)))
    drawRivet(g, x + pad, y + pad, 2.5, isGold)
    drawRivet(g, x + w - pad, y + pad, 2.5, isGold)
    drawRivet(g, x + pad, y + h - pad, 2.5, isGold)
    drawRivet(g, x + w - pad, y + h - pad, 2.5, isGold)
  }
  return g
}

export interface Btn extends Phaser.GameObjects.Container { setLabel(s: string): Btn; setEnabled(on: boolean): Btn; setFill(c: number): Btn }

/** Tactile 3D RPG button with embossed bevel, specular sheen, and physical click depress. */
export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void,
  o: { fill?: number; color?: string; size?: number; stroke?: number } = {}): Btn {
  let fill = o.fill ?? COLORS.gold
  const g = scene.add.graphics()
  const t = scene.add.text(0, -1, label, { fontFamily: FONT_UI, fontSize: `${o.size ?? 20}px`, fontStyle: 'bold', color: o.color ?? UI.ink, align: 'center', lineSpacing: 2 }).setOrigin(0.5)
  const c = scene.add.container(x, y, [g, t]) as Btn
  let enabled = true, hover = false, armed = false, pressed = false

  const draw = () => {
    g.clear()
    const isGold = fill === COLORS.gold || fill === 0xf2b84b || fill === 0xffd36b
    const f = enabled ? fill : 0x3d415b
    const py = pressed && enabled ? 2 : 0
    t.setY(-1 + py)

    // 1. Deep 3D bottom drop shadow & bevel lip
    g.fillStyle(0x000000, 0.45).fillRoundedRect(-w / 2, -h / 2 + 5, w, h - 2, 10)
    // 2. Dark bottom bevel edge (tactile button thickness)
    const lipColor = isGold ? 0x946419 : (f === 0x5a5f8a ? 0x333754 : 0x22263b)
    g.fillStyle(enabled ? lipColor : 0x252738, 1).fillRoundedRect(-w / 2, -h / 2 + 3 + py, w, h - 3, 10)
    // 3. Main button face
    g.fillStyle(f, 1).fillRoundedRect(-w / 2, -h / 2 + py, w, h - 4, 10)

    // 4. Specular gloss highlight (top half)
    if (enabled) {
      g.fillStyle(0xffffff, hover ? 0.24 : 0.12).fillRoundedRect(-w / 2 + 2, -h / 2 + 1 + py, w - 4, Math.floor((h - 6) / 2), 8)
    }

    // 5. Border stroke with gold or metallic highlight
    const strokeCol = !enabled ? 0x2a2c40 : (hover ? (isGold ? 0xffea9f : 0x8a97cf) : (isGold ? 0x6e4810 : 0x2a2f4c))
    g.lineStyle(1.5, strokeCol, 0.9).strokeRoundedRect(-w / 2, -h / 2 + py, w, h - 4, 10)

    t.setColor(enabled ? (o.color ?? (isGold ? UI.ink : UI.text)) : '#7e83a8').setAlpha(enabled ? 1 : 0.8)
  }
  draw()

  c.setSize(w, h).setInteractive({ useHandCursor: true })
  c.on('pointerover', () => { hover = true; draw() })
  c.on('pointerout', () => { hover = false; armed = false; pressed = false; draw() })
  c.on('pointerdown', () => {
    if (enabled) {
      armed = true
      pressed = true
      draw()
    }
  })
  c.on('pointerup', () => {
    pressed = false
    const fire = armed
    armed = false
    draw()
    if (!enabled || !fire) return
    unlock(); sfx.pop()
    onClick()
  })
  c.setLabel = (s: string) => { t.setText(s); return c }
  c.setEnabled = (on: boolean) => { enabled = on; draw(); return c }
  c.setFill = (f: number) => { fill = f; draw(); return c }
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
  // 1. Dark header banner with gradient-like layering
  g.fillStyle(UI.night, 0.98).fillRect(0, 0, W, 58)
  g.fillStyle(0x1a1e36, 0.6).fillRect(0, 0, W, 28)
  // Bottom gold-metallic trim line
  g.fillStyle(0x0e101c, 0.9).fillRect(0, 56, W, 3)
  g.lineStyle(1.5, UI.goldDark, 0.9).lineBetween(0, 56, W, 56)
  g.lineStyle(1, 0x4a557d, 0.5).lineBetween(0, 58, W, 58)

  if (onBack) button(scene, 58, 29, 96, 38, '‹ กลับ', onBack, { fill: 0x474c72, color: UI.text, size: 16 }).setDepth(20001)

  // Title with subtle shadow & glow
  scene.add.text(onBack ? 122 : 22, 31, title, { fontFamily: FONT_UI, fontSize: '22px', fontStyle: 'bold', color: '#0c0e18' }).setOrigin(0, 0.5).setDepth(20001)
  txt(scene, onBack ? 122 : 20, 29, title, 22, UI.gold, true).setOrigin(0, 0.5).setDepth(20002)

  // Currency pills (Zeny & Gems) with ornate recessed badge frames
  const pillG = scene.add.graphics().setDepth(20001)
  const zeny = num(scene, 0, 29, '', 19, UI.gold).setOrigin(1, 0.5).setDepth(20003)
  const coin = scene.add.image(0, 29, 'coin').setScale(1.25).setDepth(20003)
  const gems = num(scene, W - 22, 29, '', 19, UI.gem).setOrigin(1, 0.5).setDepth(20003)
  const gem = gemIcon(scene, 0, 29, 8.5).setDepth(20003)

  const refresh = () => {
    const s = save()
    gems.setText(`${s.gems}`)
    gem.x = gems.x - gems.width - 13
    zeny.setText(`${s.zeny}`).setX(gem.x - 34)
    coin.x = zeny.x - zeny.width - 13

    // Draw luxury currency badge background
    pillG.clear()
    // Gems badge
    const gw = gems.width + 36, gx = W - 14 - gw
    pillG.fillStyle(0x0e101d, 0.85).fillRoundedRect(gx, 12, gw, 34, 17)
    pillG.lineStyle(1.5, 0x3d476e, 0.9).strokeRoundedRect(gx, 12, gw, 34, 17)

    // Zeny badge
    const zw = zeny.width + 36, zx = gem.x - 24 - zw
    pillG.fillStyle(0x0e101d, 0.85).fillRoundedRect(zx, 12, zw, 34, 17)
    pillG.lineStyle(1.5, 0x3d476e, 0.9).strokeRoundedRect(zx, 12, zw, 34, 17)
  }
  refresh()
  return refresh
}

/** Fantasy RPG Tab Strip: folder-style raised tabs with gold rim on active tab. */
export function tabs(scene: Phaser.Scene, x: number, y: number, labels: string[], w: number, onPick: (i: number) => void, start = 0) {
  const btns: Btn[] = []
  let active = start

  const pick = (i: number) => {
    active = i
    btns.forEach((b, j) => {
      const on = j === active
      b.setFill(on ? COLORS.gold : 0x2e3553)
      b.setAlpha(on ? 1 : 0.82)
      b.setDepth(on ? 100 : 10)
    })
    onPick(i)
  }

  labels.forEach((l, i) => {
    const on = i === active
    const b = button(scene, x + i * (w + 6) + w / 2, y, w, 40, l, () => pick(i), {
      size: 16,
      fill: on ? COLORS.gold : 0x2e3553,
      color: on ? UI.ink : UI.text
    })
    btns.push(b)
  })
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
  track({ e: 'screen', name: key })
  scene.input.enabled = false
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { scene.input.enabled = true })
  scene.cameras.main.fadeOut(160, 20, 23, 43)
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data ?? {})) // Phaser keeps the last start() data when none is passed: 🔄 เปลี่ยนอาชีพใหม่ opened the 2nd-job picker
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

// ---------- forge anvil kit (design/forge-ux-v1.md 6.1) ----------
// Reusable by Shop / Equipment too. None of these hold rules: callers pass in the numbers.
const hex = (c: string) => Phaser.Display.Color.HexStringToColor(c).color

export type ChipState = 'ok' | 'short' | 'buy' | 'gain'
const CHIP_TONE: Record<ChipState, { fill: number; line: number; text: string }> = {
  ok: { fill: 0x2f3560, line: 0x454c80, text: UI.text },
  short: { fill: 0x4a2530, line: 0xff7a7a, text: UI.red },
  buy: { fill: 0x4a3f1f, line: 0xf2b84b, text: UI.gold }, // will be bought on the spot (auto-buy fodder)
  gain: { fill: 0x1f4130, line: 0x6fd08c, text: UI.green },
}
export interface Chip extends Phaser.GameObjects.Container { chipW: number; set(icon: string, label: string, state?: ChipState): Chip }

/** Small pill: [icon label]. x = left edge, y = vertical centre. maxW (optional) truncates with an ellipsis. set() redraws in place, so a strip can reuse chips instead of rebuilding. */
export function chip(scene: Phaser.Scene, x: number, y: number, icon: string, label: string, state: ChipState = 'ok', maxW = 0): Chip {
  const h = 26, g = scene.add.graphics()
  const t = scene.add.text(10, 0, '', { fontFamily: FONT_UI, fontSize: '14px', fontStyle: 'bold', color: UI.text }).setOrigin(0, 0.5)
  const c = scene.add.container(x, y, [g, t]) as Chip
  c.set = (i, l, st = 'ok') => {
    const tone = CHIP_TONE[st]
    let full = `${i} ${l}`.trim()
    t.setText(full).setColor(tone.text)
    if (maxW > 0) { // cut by measuring, one code point at a time (never inside a surrogate pair; a Thai vowel mark can still end up last, which only costs a glyph)
      const cps = Array.from(full)
      while (cps.length > 1 && t.width + 20 > maxW) { cps.pop(); t.setText(`${cps.join('').trimEnd()}…`) }
    }
    c.chipW = Math.ceil(t.width) + 20
    g.clear().fillStyle(tone.fill, 1).fillRoundedRect(0, -h / 2, c.chipW, h, 13).lineStyle(1.5, tone.line, 1).strokeRoundedRect(0, -h / 2, c.chipW, h, 13)
    return c
  }
  return c.set(icon, label, state)
}

export interface CostStrip extends Phaser.GameObjects.Container {
  /** Show a cost against the wallet (null clears it). Returns the strip height used (30px per row; wraps when w is short). */
  setCost(cost: ForgeCost | null, wallet: Wallet): number
}

/** The one cost bar under every forge verb: materials, fodder, zeny, gems. Pool of chips, updated in place (no rebuild per refresh). */
export function costStrip(scene: Phaser.Scene, x: number, y: number, w: number): CostStrip {
  const pool: Chip[] = []
  const c = scene.add.container(x, y) as CostStrip
  c.setCost = (cost, wallet) => {
    const need: { icon: string; label: string; st: ChipState }[] = []
    if (cost) {
      for (const [id, n] of Object.entries(cost.mats)) {
        const m = matById(id), have = wallet.mats?.[id] ?? 0
        need.push({ icon: m?.icon ?? '📦', label: `${m?.name ?? id} ${Math.min(have, n)}/${n}`, st: have >= n ? 'ok' : 'short' })
      }
      const zShort = zenyShort(wallet, cost) > 0 // counts fodder bought on the spot (a 265z fee + 420z fodder vs 500z is short)
      if (cost.fodder) {
        const sl = SLOTS.find((q) => q.id === cost.fodder!.slot), have = !!pickFodder(wallet.fodder, cost.fodder), buy = fodderToBuy(wallet, cost)
        if (have) need.push({ icon: sl?.icon ?? '📦', label: `ของ${sl?.name ?? ''} 1`, st: 'ok' })
        else if (buy) need.push({ icon: sl?.icon ?? '📦', label: `ซื้อ ${buy.name} ${buy.price}z`, st: zShort ? 'short' : 'buy' })
        else need.push({ icon: sl?.icon ?? '📦', label: `ขาดของ${sl?.name ?? ''}`, st: 'short' })
      }
      if (cost.zeny > 0 || zShort) need.push({ icon: '💰', label: `${cost.zeny}`, st: zShort ? 'short' : 'ok' })
      if (cost.gems) need.push({ icon: '💎', label: `${cost.gems}`, st: wallet.gems >= cost.gems ? 'ok' : 'short' })
    }
    while (pool.length < need.length) { const ch = chip(scene, 0, 0, '', ''); pool.push(ch); c.add(ch) }
    let cx = 0, row = 0
    pool.forEach((ch, i) => {
      const n = need[i]
      ch.setVisible(!!n)
      if (!n) return
      ch.set(n.icon, n.label, n.st)
      if (cx > 0 && cx + ch.chipW > w) { cx = 0; row++ }
      ch.setPosition(cx, row * 30 + 13)
      cx += ch.chipW + 6
    })
    return need.length ? (row + 1) * 30 : 0
  }
  return c
}

export interface MeterPart { v: number; color: number; ghost?: boolean }
export interface Meter extends Phaser.GameObjects.Container { setParts(parts: MeterPart[]): Meter }

/** Stacked bar, e.g. base rate + pity + a ghost segment for "what one more miss adds". Each v is a 0..1 share of the full width; the total is clamped to 1. */
export function meter(scene: Phaser.Scene, x: number, y: number, w: number, h: number, parts: MeterPart[] = []): Meter {
  const g = scene.add.graphics()
  const c = scene.add.container(x, y, [g]) as Meter
  c.setParts = (ps) => {
    g.clear().fillStyle(0x14172b, 1).fillRoundedRect(0, 0, w, h, h / 2)
    // cumulative ends, drawn back-to-front from x=0 so the segments layer into one pill
    const segs: { end: number; p: MeterPart }[] = []
    let acc = 0
    for (const p of ps) {
      const v = Number.isFinite(p.v) ? Math.max(0, p.v) : 0
      if (v <= 0) continue
      acc = Math.min(1, acc + v)
      segs.push({ end: acc, p })
    }
    for (let i = segs.length - 1; i >= 0; i--) {
      const { end, p } = segs[i]
      const pw = Math.max(end * w, Math.min(h, w)) // a tiny share stays visible
      g.fillStyle(p.color, p.ghost ? 0.4 : 1).fillRoundedRect(0, 0, Math.min(pw, w), h, Math.min(h / 2, pw / 2))
    }
    g.lineStyle(1.5, UI.line, 1).strokeRoundedRect(0, 0, w, h, h / 2)
    return c
  }
  return c.setParts(parts)
}

export interface HoldBtn extends Btn { cancel(): void }

/** Press-and-hold button for the risky verbs (Corrupt, Salvage): the fill runs for `ms`, releasing early cancels, finishing fires onDone once.
 * The hold itself is the confirmation, so no modal on top. The global pointerup listener is removed on scene shutdown / destroy; the tween dies with the scene. */
export function holdButton(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, ms: number, onDone: () => void,
  o: { fill?: number; color?: string; size?: number } = {}): HoldBtn {
  let fill = o.fill ?? 0x8a4fd0
  const g = scene.add.graphics()
  const t = scene.add.text(0, 0, label, { fontFamily: FONT_UI, fontSize: `${o.size ?? 18}px`, fontStyle: 'bold', color: o.color ?? UI.text, align: 'center', lineSpacing: 2, wordWrap: { width: w - 16 } }).setOrigin(0.5)
  const c = scene.add.container(x, y, [g, t]) as HoldBtn
  const prog = { v: 0 }
  let enabled = true, holding = false, holdId = -1, tween: Phaser.Tweens.Tween | undefined
  const draw = () => {
    if (!g.active) return
    g.clear()
    g.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 12)
    g.fillStyle(enabled ? 0x3a2a55 : 0x4a4e6e, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 12)
    if (prog.v > 0) g.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, Math.max(24, w * prog.v), h, 12)
    g.lineStyle(2, enabled ? fill : 0x000000, 0.7).strokeRoundedRect(-w / 2, -h / 2, w, h, 12)
    t.setAlpha(enabled ? 1 : 0.55)
  }
  const reset = () => { tween?.remove(); tween = undefined; prog.v = 0; draw() }
  c.cancel = () => { if (!holding) return; holding = false; reset() }
  draw()
  c.setSize(w, h).setInteractive({ useHandCursor: true })
  c.on('pointerdown', (p: Phaser.Input.Pointer) => {
    if (!enabled || holding) return
    unlock(); holding = true; holdId = p.id
    tween = scene.tweens.add({
      targets: prog, v: 1, duration: ms, ease: 'Linear', onUpdate: draw,
      onComplete: () => { holding = false; sfx.pop(); onDone(); reset() },
    })
  })
  c.on('pointerout', (p: Phaser.Input.Pointer) => { if (p.id === holdId) c.cancel() })
  const onUp = (p: Phaser.Input.Pointer) => { if (p.id === holdId) c.cancel() } // another finger lifting must not cancel this hold
  scene.input.on('pointerup', onUp) // a release OUTSIDE the button must cancel too
  const off = () => scene.input.off('pointerup', onUp)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off)
  c.once(Phaser.GameObjects.Events.DESTROY, () => { off(); scene.events.off(Phaser.Scenes.Events.SHUTDOWN, off); tween?.remove() })
  c.setLabel = (s: string) => { t.setText(s); return c }
  c.setEnabled = (on: boolean) => { enabled = on; if (!on) c.cancel(); draw(); return c }
  c.setFill = (f: number) => { fill = f; draw(); return c }
  return c
}

export interface ItemIconState { grade: number; refine: number; broken?: boolean; tainted?: boolean; unique?: boolean; cursed?: boolean; worn?: boolean }
export interface ItemIcon extends Phaser.GameObjects.Container { setItem(it: Item, st: ItemIconState): ItemIcon }

/** Item tile: frame in the grade colour, emoji, and the badges (star grade, +N, broken, tainted, unique, cursed, v115 worn ✓ pill on the bottom edge). Used by the rail and the anvil stage; setItem() redraws in place. */
export function itemIcon(scene: Phaser.Scene, x: number, y: number, size: number, it: Item, st: ItemIconState): ItemIcon {
  const g = scene.add.graphics()
  const ico = scene.add.text(0, 0, '', { fontFamily: FONT_UI, fontSize: `${Math.round(size * 0.55)}px` }).setOrigin(0.5)
  const small = Math.max(10, Math.round(size * 0.22)), half = size / 2
  const label = (ox: number, oy: number, col: string) => scene.add.text(ox, oy, '', { fontFamily: FONT_NUM, fontSize: `${small}px`, fontStyle: 'bold', color: col, stroke: '#14172b', strokeThickness: 3 })
  const star = label(-half + 4, half - small - 5, '#ffffff'), plus = label(half - 4, -half + 3, UI.gold).setOrigin(1, 0)
  const tag = scene.add.text(half - 2, half - 2, '', { fontFamily: FONT_UI, fontSize: `${small + 2}px` }).setOrigin(1, 1)
  const crown = scene.add.text(-half + 3, -half + 2, '', { fontFamily: FONT_UI, fontSize: `${small + 2}px` })
  const wornT = scene.add.text(0, half, '✓', { fontFamily: FONT_UI, fontSize: `${small}px`, fontStyle: 'bold', color: '#0f2a1c' }).setOrigin(0.5)
  const c = scene.add.container(x, y, [g, ico, star, plus, tag, crown, wornT]) as ItemIcon
  c.setItem = (item, s) => {
    const gc = GRADE.colors[Math.max(1, Math.min(GRADE.max, s.grade || 1))]
    const frame = s.tainted ? 0xc08cff : s.unique ? 0xff6b4a : hex(gc)
    g.clear()
    g.fillStyle(0x14172b, 1).fillRoundedRect(-half, -half, size, size, 10)
    g.fillStyle(frame, 0.12).fillRoundedRect(-half, -half, size, size, 10)
    g.lineStyle(s.tainted || s.unique ? 3 : 2, frame, 1).strokeRoundedRect(-half, -half, size, size, 10)
    ico.setText(item.icon).setAlpha(s.broken ? 0.35 : 1)
    star.setText(s.grade > 1 ? `★${s.grade}` : '').setColor(gc)
    plus.setText(s.refine > 0 ? `+${s.refine}` : '')
    tag.setText(s.broken ? '💥' : s.tainted ? '☠️' : s.cursed ? '💀' : '')
    crown.setText(s.unique ? '👑' : '')
    wornT.setVisible(!!s.worn)
    if (s.worn) { const pw = small * 1.9, ph = small + 4; g.fillStyle(0x6fd08c, 1).fillRoundedRect(-pw / 2, half - ph / 2, pw, ph, ph / 2).lineStyle(1.5, 0x14172b, 1).strokeRoundedRect(-pw / 2, half - ph / 2, pw, ph, ph / 2) }
    return c
  }
  return c.setItem(it, st)
}

export interface IconTabItem { icon: string; label: string; locked?: string }
export interface IconTabs extends Phaser.GameObjects.Container {
  setTab(i: number): IconTabs
  /** reason = shown as a toast when the tab is tapped; undefined unlocks it. */
  setLocked(i: number, reason?: string): IconTabs
  /** Swap what a slot shows (e.g. 🔧 replaces ⚒️ while the item is broken). */
  setSlot(i: number, item: { icon: string; label: string }): IconTabs
}

/** Verb tabs (icon over a short label). State changes redraw in place. Tapping a locked tab explains why instead of switching. x = left edge, y = centre. */
export function iconTabs(scene: Phaser.Scene, x: number, y: number, items: IconTabItem[], onPick: (i: number) => void, o: { w?: number; h?: number; start?: number; gate?: () => boolean } = {}): IconTabs {
  const w = o.w ?? 84, h = o.h ?? 56, gap = 6
  const locks = items.map((it) => it.locked)
  let active = -1
  const c = scene.add.container(x, y) as IconTabs
  const cells = items.map((it, i) => {
    const g = scene.add.graphics()
    const ic = scene.add.text(0, -8, it.icon, { fontFamily: FONT_UI, fontSize: '22px' }).setOrigin(0.5)
    const lb = scene.add.text(0, 14, it.label, { fontFamily: FONT_UI, fontSize: '12px', fontStyle: 'bold', color: UI.text, align: 'center', wordWrap: { width: w - 8 } }).setOrigin(0.5, 0.5)
    const cell = scene.add.container(i * (w + gap) + w / 2, 0, [g, ic, lb]).setSize(w, h).setInteractive({ useHandCursor: true })
    cell.on('pointerup', () => {
      if (o.gate && !o.gate()) return // e.g. the forge is busy playing an outcome
      const why = locks[i]
      if (why) { toast(scene, why, UI.red); return }
      unlock(); sfx.pop(); if (i === active) return; c.setTab(i); onPick(i)
    })
    c.add(cell)
    return { g, ic, lb }
  })
  const draw = () => cells.forEach((cell, i) => {
    const on = i === active, lock = !!locks[i]
    cell.g.clear().fillStyle(on ? UI.panelHi : UI.panel, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 10)
    cell.g.lineStyle(on ? 3 : 1.5, on ? COLORS.gold : UI.line, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 10)
    cell.ic.setText(lock ? '🔒' : items[i].icon).setAlpha(lock ? 0.5 : 1)
    cell.lb.setText(items[i].label)
    cell.lb.setAlpha(lock ? 0.5 : on ? 1 : 0.75)
  })
  c.setTab = (i) => { if (i === active || locks[i]) return c; active = i; draw(); return c } // a locked tab can't be made active
  c.setLocked = (i, reason) => { locks[i] = reason; draw(); return c }
  c.setSlot = (i, item) => { items[i] = { ...items[i], ...item }; draw(); return c }
  active = o.start ?? 0 // -1 = nothing active (no item on the anvil)
  draw()
  return c
}

/** Clip a wrapped text to a height budget, ending with "…" (keeps cards from running into the row below). Cuts by code point, so a surrogate pair (most emoji) is never split. */
export function fit(t: Phaser.GameObjects.Text, maxH: number) {
  if (t.height <= maxH) return t
  const cps = Array.from(t.text)
  while (cps.length > 1 && t.height > maxH) { cps.pop(); t.setText(`${cps.join('').trimEnd()}…`) }
  return t
}
