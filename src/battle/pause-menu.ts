// v112 pause menu: run status at a glance — live stats (left), picked พร (right, tap/hover a tile for its text),
// relic / immortal / curses, and resume / leave / skill-mode buttons. Built from plain data; BattleScene owns pause state.
import Phaser from 'phaser'
import { FONT_NUM, FONT_UI, H, W } from '../data/game-data'
import { button } from '../ui'
import { HUD_THEME as T } from './hud-layout'

export interface PausePerk { icon: string; name: string; badge: string; color: string; legend: boolean; tag: string; desc: string }
export interface PauseExtra { icon: string; name: string; desc: string; color: string }
export interface PauseData {
  title: string; sub: string
  stats: [string, string][]
  build: string
  perks: PausePerk[]
  extras: PauseExtra[]
  autoLabel: () => string
  onToggleAuto: () => void
  onResume: () => void
  onLeave: () => void
}

const glass = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) => {
  g.fillStyle(0x000000, 0.25).fillRoundedRect(x, y + 3, w, h, T.r)
  g.fillStyle(T.glass, 0.92).fillRoundedRect(x, y, w, h, T.r)
  g.fillStyle(0xffffff, 0.04).fillRoundedRect(x + 2, y + 2, w - 4, 26, T.r - 2)
  g.lineStyle(1, T.edge, T.edgeA).strokeRoundedRect(x, y, w, h, T.r)
}

/** Shrink a text's font until it fits maxW (never below min px). */
export function fitWidth(t: Phaser.GameObjects.Text, maxW: number, size: number, min = 10) {
  for (let s = size; s >= min; s--) { t.setFontSize(s); if (t.width <= maxW) return t }
  return t
}

export function openPauseMenu(scene: Phaser.Scene, d: PauseData): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0).setDepth(30000)
  c.add(scene.add.rectangle(W / 2, H / 2, W, H, 0x080a18, 0.92).setInteractive())
  const g = scene.add.graphics(); c.add(g)
  const text = (x: number, y: number, s: string, size: number, color: string = T.text, bold = false, font = FONT_UI) =>
    scene.add.text(x, y, s, { fontFamily: font, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', color })

  // header
  c.add(text(28, 18, '⏸ พักเกม', 28, '#f2b84b', true))
  c.add(fitWidth(text(W - 28, 26, d.sub, 16, T.sub).setOrigin(1, 0), W - 230, 16, 11))

  // left: live stats
  const sx = 24, sy = 66, sw = 360, sh = 410
  glass(g, sx, sy, sw, sh)
  c.add(text(sx + 14, sy + 8, `📊 สถานะ (ตอนนี้)`, 17, T.text, true))
  const rowH = Math.min(25, Math.floor((sh - 48) / Math.max(1, d.stats.length)))
  d.stats.forEach(([label, value], i) => {
    const y = sy + 42 + i * rowH
    if (i % 2 === 0) g.fillStyle(0xffffff, 0.035).fillRect(sx + 6, y - 2, sw - 12, rowH)
    const l = text(sx + 14, y, label, 13, T.sub)
    c.add(l)
    c.add(fitWidth(text(sx + sw - 14, y - 1, value, 14, T.text, true).setOrigin(1, 0), sw - 40 - l.width, 14, 10))
  })

  // right: perks
  const px = 400, py = 66, pw = 536, ph = 410
  glass(g, px, py, pw, ph)
  c.add(text(px + 14, py + 8, `✨ พรที่เลือก (${d.perks.length})`, 17, T.text, true))
  if (d.build) c.add(fitWidth(text(px + pw - 14, py + 10, d.build, 15).setOrigin(1, 0), pw - 220, 15, 10))

  const gx = px + 14, gy = py + 42, gw = pw - 28, gh = 196
  let size = 52, gap = 8
  for (; size > 30; size -= 2) { // shrink tiles until every perk fits the grid box
    gap = size >= 44 ? 8 : 6
    const cols = Math.floor((gw + gap) / (size + gap)), rows = Math.ceil(d.perks.length / cols)
    if (rows * (size + gap) - gap <= gh) break
  }
  const cols = Math.max(1, Math.floor((gw + gap) / (size + gap)))

  // detail box (filled by select())
  const dy = gy + gh + 10, dh = 112
  g.fillStyle(T.tile, 0.9).fillRoundedRect(gx, dy, gw, dh, 8)
  const dName = text(gx + 12, dy + 8, '', 17, T.text, true)
  const dTag = text(gx + gw - 12, dy + 11, '', 13, T.sub, true).setOrigin(1, 0)
  const dDesc = text(gx + 12, dy + 36, '', 14, '#d8d4ee').setWordWrapWidth(gw - 24, true).setLineSpacing(2)
  c.add([dName, dTag, dDesc])

  const sel = scene.add.graphics()
  const select = (name: string, color: string, tag: string, desc: string, at?: { x: number; y: number; s: number }) => {
    dName.setText(name).setColor(color); dTag.setText(tag).setColor(color)
    dDesc.setText(desc).setFontSize(14)
    for (let s = 14; s >= 10 && dDesc.height > dh - 42; s--) dDesc.setFontSize(s)
    sel.clear()
    if (at) sel.lineStyle(3, T.gold, 1).strokeRoundedRect(at.x - 3, at.y - 3, at.s + 6, at.s + 6, 10)
  }

  if (!d.perks.length) {
    c.add(text(gx + gw / 2, gy + gh / 2, 'ยังไม่มีพร — เลเวลอัปในดันเพื่อเลือกพรค่ะ', 16, T.sub).setOrigin(0.5))
    select('—', T.sub, '', 'แตะพรหรือรีลิกเพื่อดูรายละเอียด')
  }
  d.perks.forEach((p, i) => {
    const x = gx + (i % cols) * (size + gap), y = gy + Math.floor(i / cols) * (size + gap)
    const col = Phaser.Display.Color.HexStringToColor(p.legend ? '#ff8c42' : p.color).color
    g.fillStyle(p.legend ? 0x3a2414 : T.tile, 1).fillRoundedRect(x, y, size, size, 8)
    g.fillStyle(0xffffff, 0.06).fillRoundedRect(x + 2, y + 2, size - 4, size / 2 - 2, 6)
    g.lineStyle(p.legend ? 3 : 2, col, 1).strokeRoundedRect(x, y, size, size, 8)
    c.add(scene.add.text(x + size / 2, y + size / 2, p.icon, { fontSize: `${Math.round(size * 0.5)}px` }).setOrigin(0.5))
    if (p.badge) c.add(scene.add.text(x + size - 3, y + size - 1, p.badge, { fontFamily: FONT_NUM, fontSize: `${size >= 44 ? 14 : 11}px`, fontStyle: 'bold', color: '#ffe08a', stroke: T.ink, strokeThickness: 3 }).setOrigin(1, 1))
    const hit = scene.add.zone(x, y, size, size).setOrigin(0).setInteractive({ useHandCursor: true })
    const show = () => select(`${p.icon} ${p.name}${p.badge === '+' ? '+' : ''}`, p.legend ? '#ff8c42' : p.color, p.tag, p.desc, { x, y, s: size })
    hit.on('pointerover', show); hit.on('pointerup', show)
    c.add(hit)
    if (i === 0) show()
  })

  // relic / immortal / curse chips
  const ey = dy + dh + 10
  if (d.extras.length) {
    let ex = gx
    for (const e of d.extras) {
      const t = text(ex + 10, ey + 6, `${e.icon} ${e.name}`, 14, e.color, true)
      const w = t.width + 20
      g.fillStyle(T.tile, 1).fillRoundedRect(ex, ey, w, 30, 15).lineStyle(1, Phaser.Display.Color.HexStringToColor(e.color).color, 0.8).strokeRoundedRect(ex, ey, w, 30, 15)
      const hit = scene.add.zone(ex, ey, w, 30).setOrigin(0).setInteractive({ useHandCursor: true })
      hit.on('pointerover', () => select(`${e.icon} ${e.name}`, e.color, '', e.desc)); hit.on('pointerup', () => select(`${e.icon} ${e.name}`, e.color, '', e.desc))
      c.add([t, hit])
      ex += w + 8
      if (ex > gx + gw - 60) break
    }
  } else c.add(text(gx, ey + 7, 'ยังไม่มีรีลิก / พรอมตะ / คำสาป', 13, T.sub))
  c.add(sel)

  // buttons + keys
  const by = H - 44
  const tg = button(scene, 160, by, 280, 48, d.autoLabel(), () => { d.onToggleAuto(); tg.setLabel(d.autoLabel()) }, { size: 17, fill: 0x2f3560, color: '#f6eedc' })
  c.add(tg)
  c.add(button(scene, 520, by, 200, 52, '🏘️ กลับเมือง', () => d.onLeave(), { size: 19, fill: 0x5a5f8a, color: '#f6eedc' }))
  c.add(button(scene, 790, by, 240, 56, '▶ ลุยต่อ', () => d.onResume(), { size: 22 }))
  c.add(text(790, by - 44, 'Esc / Enter', 12, T.sub).setOrigin(0.5))
  const kb = scene.input.keyboard
  const onEnter = () => d.onResume()
  kb?.once('keydown-ENTER', onEnter)
  c.once(Phaser.GameObjects.Events.DESTROY, () => kb?.off('keydown-ENTER', onEnter))
  return c
}
