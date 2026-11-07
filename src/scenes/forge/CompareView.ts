// v115 compare table on the anvil stage (Q: "Compare ให้ดู"), two modes:
//   'next' = this item now -> after the current verb's press (the panel's Preview), or just the current stats when the verb has no preview
//   'worn' (🆚) = what is worn in the slot this item would fill -> this item (closed while the item itself is worn)
// Item-level numbers only (forged stats, the same ones the item card shows). Rows: changed first, ▲ green = better, ▼ red = worse.
import Phaser from 'phaser'
import { FONT_UI } from '../../data/game-data'
import { forged, forgeTag, type Item } from '../../data/meta'
import { isWorn, save } from '../../save'
import { button, fit, UI, type Btn } from '../../ui'
import { compareRows, wornRival, type CmpRow } from './state'
import type { Preview } from './types'

export type CmpMode = 'next' | 'worn'
const COLS = 2, ROWS = 5, ROW_STEP = 17, HEAD_Y = 28, ROWS_Y = 46

export class CompareView {
  private root: Phaser.GameObjects.Container
  private bg: Phaser.GameObjects.Graphics
  private bNext: Btn
  private bWorn: Btn
  private head: Phaser.GameObjects.Text
  private cells: Phaser.GameObjects.Text[] = []
  private note: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, x: number, y: number, private w: number, private h: number, private mode: CmpMode, private onMode: (m: CmpMode) => void) {
    this.bg = scene.add.graphics()
    const bw = 112
    this.bNext = button(scene, 8 + bw / 2, 15, bw, 22, '⚒️ ก่อน→หลัง', () => this.setMode('next'), { size: 11 })
    this.bWorn = button(scene, 8 + bw * 1.5 + 6, 15, bw, 22, '🆚 เทียบที่ใส่', () => this.setMode('worn'), { size: 11 })
    const t = (px: number, py: number, size: number, ww: number) => scene.add.text(px, py, '', { fontFamily: FONT_UI, fontSize: `${size}px`, color: UI.text, wordWrap: { width: ww } })
    this.head = t(10, HEAD_Y, 12, w - 20).setFontStyle('bold')
    const cw = (w - 20) / COLS
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) this.cells.push(t(10 + c * cw, ROWS_Y + r * ROW_STEP, 12, cw - 6))
    this.note = t(10, 0, 12, w - 20).setColor('#c9a8ff')
    this.root = scene.add.container(x, y, [this.bg, this.bNext, this.bWorn, this.head, ...this.cells, this.note])
  }

  get container() { return this.root }

  private it?: Item
  private preview: Preview | null = null
  private taint = ''

  private setMode(m: CmpMode) {
    if (m === this.mode) return
    this.mode = m
    this.onMode(m)
    this.paint()
  }

  /** Repaint for this item, the verb's preview (null = no "after"), and an optional taint line (takes the last row). */
  show(it: Item | undefined, preview: Preview | null, taint: string) {
    this.it = it; this.preview = preview; this.taint = taint
    this.paint()
  }

  private paint() {
    const it = this.it, s = save()
    this.root.setVisible(!!it)
    if (!it) return
    this.bg.clear().fillStyle(0x14172b, 0.85).fillRoundedRect(0, 0, this.w, this.h, 10)
    const worn = isWorn(s, it.id), mode: CmpMode = worn ? 'next' : this.mode // a worn item has nothing to compare against
    this.bNext.setFill(mode === 'next' ? 0xf2b84b : 0x5a5f8a)
    this.bWorn.setLabel(worn ? '✅ ใส่อยู่แล้ว' : '🆚 เทียบที่ใส่').setEnabled(!worn)
    if (!worn) this.bWorn.setFill(mode === 'worn' ? 0xf2b84b : 0x5a5f8a)
    const cur = forged(s, it)
    let rows: CmpRow[]
    if (mode === 'worn') {
      const rival = wornRival(s, it)
      rows = compareRows(rival ? forged(s, rival) : null, cur)
      this.head.setText(rival ? `ที่ใส่อยู่: ${rival.name}${forgeTag(s, rival.id)} → ชิ้นนี้` : 'ช่องนี้ยังว่าง → ชิ้นนี้').setColor(UI.gem)
    } else if (this.preview) {
      rows = compareRows(cur, this.preview.next)
      const same = rows.every((r) => r.d === 0) // small items round: +3 and +4 can give the same whole number
      this.head.setText(`ตอนนี้ → หลัง ${this.preview.label}${same ? ' · ตัวเลขเท่าเดิม (ปัดเศษ)' : ''}`).setColor(this.preview.color ?? UI.gold)
    } else {
      rows = compareRows(cur, cur)
      this.head.setText('ค่าพลังตอนนี้').setColor(UI.sub)
    }
    fit(this.head, 17)
    const slots = this.cells.length - (this.taint ? COLS : 0)
    const shown = rows.length > slots ? rows.slice(0, slots - 1) : rows
    this.cells.forEach((c, i) => {
      if (i >= slots) { c.setVisible(false); return }
      const r = shown[i]
      if (r) { c.setText(cellText(r, mode === 'next' && !this.preview)).setColor(r.d > 0 ? UI.green : r.d < 0 ? UI.red : r.curse ? '#ff9f9f' : UI.sub) }
      else if (i === shown.length && rows.length > shown.length) c.setText(`…อีก ${rows.length - shown.length} ค่า`).setColor(UI.sub)
      else if (i === 0 && !rows.length) c.setText('ไม่มีค่าพลัง').setColor(UI.sub)
      else c.setText('')
      c.setVisible(true)
      fit(c, 18)
    })
    this.note.setVisible(!!this.taint).setText(this.taint).setY(ROWS_Y + (ROWS - 1) * ROW_STEP)
    fit(this.note, 18)
  }

  destroy() { this.root.destroy() }
}

/** "P.ATK 22→23 ▲" (colour + arrow say better/worse; the delta is left out so a cell fits), or just "P.ATK 22" when nothing moved. */
function cellText(r: CmpRow, single: boolean): string {
  const name = `${r.curse ? '💀' : ''}${r.label}`
  if (single || r.d === 0) return `${name} ${r.next === '—' ? r.now : r.next}`
  return `${name} ${r.now}→${r.next} ${r.d > 0 ? '▲' : '▼'}`
}
