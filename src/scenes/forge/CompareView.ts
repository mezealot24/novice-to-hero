// v115 compare table on the anvil stage (Q: "Compare ให้ดู"), two modes:
//   'next' = this item now -> after the current verb's press (the panel's Preview), or just the current stats when the verb has no preview
//   'worn' (🆚) = what is worn in the slot this item would fill -> this item (closed while the item itself is worn)
// Item-level numbers only (forged stats, the same ones the item card shows). Rows: changed first, ▲ green = better, ▼ red = worse.
import Phaser from 'phaser'
import { FONT_UI } from '../../data/game-data'
import type { SaveExt } from '../../data/item-effects'
import { forgeTag, type Item } from '../../data/meta'
import { isWorn, save } from '../../save'
import { button, shrinkFit, UI, type Btn } from '../../ui'
import { compareRows, forgedWithAspect, wornRival, type CmpRow } from './state'
import type { Preview } from './types'

export type CmpMode = 'next' | 'worn'
const HEAD_Y = 27, ROWS_Y = 45

export interface FlowStatsOpts {
  x: number
  y: number
  w: number
  h: number
  single: boolean
  format?: (r: CmpRow, single: boolean) => string
  boldChanged?: boolean
}

/**
 * Render ALL compare rows inside (x, y, w, h) with zero "…" truncation:
 * short stats sit side-by-side in 2 columns, long stats span the full width,
 * and font size steps down automatically until every row fits.
 */
export function renderFlowStats(scene: Phaser.Scene, rows: readonly CmpRow[], opts: FlowStatsOpts): Phaser.GameObjects.Container {
  const box = scene.add.container(opts.x, opts.y)
  if (!rows.length) {
    box.add(scene.add.text(0, 0, 'ไม่มีค่าพลัง', { fontFamily: FONT_UI, fontSize: '12px', color: UI.sub }))
    return box
  }
  const fmt = opts.format ?? cellText
  const sizes = [11.5, 10.5, 9.5, 8.5]
  const halfW = (opts.w - 8) / 2
  const col2X = halfW + 8

  for (let si = 0; si < sizes.length; si++) {
    const fs = sizes[si]
    const gap = fs >= 10.5 ? 2 : 1
    const created: Phaser.GameObjects.Text[] = []
    let curY = 0
    let col = 0
    let pendingRowH = 0

    for (const r of rows) {
      const color = r.d > 0 ? UI.green : r.d < 0 ? UI.red : r.curse ? '#ff9f9f' : UI.sub
      const bold = opts.boldChanged && r.d !== 0 ? 'bold' : 'normal'
      const label = fmt(r, opts.single)
      const t = scene.add.text(0, 0, label, { fontFamily: FONT_UI, fontSize: `${fs}px`, fontStyle: bold, color, lineSpacing: 1 })
      if (t.width <= halfW) {
        if (col === 0) {
          t.setPosition(0, curY)
          pendingRowH = t.height
          col = 1
        } else {
          t.setPosition(col2X, curY)
          curY += Math.max(pendingRowH, t.height) + gap
          pendingRowH = 0
          col = 0
        }
      } else {
        if (col === 1) {
          curY += pendingRowH + gap
          pendingRowH = 0
          col = 0
        }
        t.setWordWrapWidth(opts.w)
        t.setPosition(0, curY)
        curY += t.height + gap
      }
      created.push(t)
    }
    const totalH = curY + (col === 1 ? pendingRowH : 0)
    if (totalH <= opts.h || si === sizes.length - 1) {
      box.add(created)
      if (totalH > opts.h && totalH > 0) {
        const sc = Math.min(1, opts.h / totalH)
        box.setScale(sc, sc)
      }
      return box
    }
    for (const t of created) t.destroy()
  }
  return box
}

export class CompareView {
  private root: Phaser.GameObjects.Container
  private bg: Phaser.GameObjects.Graphics
  private bNext: Btn
  private bWorn: Btn
  private head: Phaser.GameObjects.Text
  private rowsBox?: Phaser.GameObjects.Container
  private note: Phaser.GameObjects.Text

  constructor(private scene: Phaser.Scene, x: number, y: number, private w: number, private h: number, private mode: CmpMode, private onMode: (m: CmpMode) => void) {
    this.bg = scene.add.graphics()
    const bw = 112
    this.bNext = button(scene, 8 + bw / 2, 14, bw, 22, '⚒️ ก่อน→หลัง', () => this.setMode('next'), { size: 11 })
    this.bWorn = button(scene, 8 + bw * 1.5 + 6, 14, bw, 22, '🆚 เทียบที่ใส่', () => this.setMode('worn'), { size: 11 })
    const t = (px: number, py: number, size: number, ww: number) => scene.add.text(px, py, '', { fontFamily: FONT_UI, fontSize: `${size}px`, color: UI.text, wordWrap: { width: ww } })
    this.head = t(10, HEAD_Y, 12, w - 20).setFontStyle('bold')
    this.note = t(10, 0, 11, w - 20).setColor('#c9a8ff')
    this.root = scene.add.container(x, y, [this.bg, this.bNext, this.bWorn, this.head, this.note])
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

  /** Repaint for this item, the verb's preview (null = no "after"), and an optional taint line (takes the bottom row). */
  show(it: Item | undefined, preview: Preview | null, taint: string) {
    this.it = it; this.preview = preview; this.taint = taint
    this.paint()
  }

  private paint() {
    const it = this.it, s = save()
    this.root.setVisible(!!it)
    this.rowsBox?.destroy()
    this.rowsBox = undefined
    if (!it) return
    this.bg.clear().fillStyle(0x14172b, 0.85).fillRoundedRect(0, 0, this.w, this.h, 10)
    const worn = isWorn(s, it.id), mode: CmpMode = worn ? 'next' : this.mode // a worn item has nothing to compare against
    this.bNext.setFill(mode === 'next' ? 0xf2b84b : 0x5a5f8a)
    this.bWorn.setLabel(worn ? '✅ ใส่อยู่แล้ว' : '🆚 เทียบที่ใส่').setEnabled(!worn)
    if (!worn) this.bWorn.setFill(mode === 'worn' ? 0xf2b84b : 0x5a5f8a)
    const cur = forgedWithAspect(s as SaveExt, it)
    let rows: CmpRow[]
    if (mode === 'worn') {
      const rival = wornRival(s, it)
      rows = compareRows(rival ? forgedWithAspect(s as SaveExt, rival) : null, cur)
      this.head.setText(rival ? `ที่ใส่อยู่: ${rival.name}${forgeTag(s, rival.id)} → ชิ้นนี้` : 'ช่องนี้ยังว่าง → ชิ้นนี้').setColor(UI.gem)
    } else if (this.preview) {
      rows = compareRows(cur, this.preview.next)
      const same = rows.every((r) => r.d === 0) // small items round: +3 and +4 can give the same whole number
      this.head.setText(`ตอนนี้ → หลัง ${this.preview.label}${same ? ' · ตัวเลขเท่าเดิม (ปัดเศษ)' : ''}`).setColor(this.preview.color ?? UI.gold)
    } else {
      rows = compareRows(cur, cur)
      this.head.setText('ค่าพลังตอนนี้').setColor(UI.sub)
    }
    shrinkFit(this.head, 16, 9, this.w - 20)

    let noteReserve = 0
    if (this.taint) {
      this.note.setVisible(true).setText(this.taint)
      shrinkFit(this.note, 24, 8.5, this.w - 20)
      noteReserve = Math.ceil(this.note.height * this.note.scaleY) + 4
      this.note.setY(this.h - noteReserve)
    } else {
      this.note.setVisible(false)
    }

    const availH = Math.max(40, this.h - ROWS_Y - 4 - noteReserve)
    this.rowsBox = renderFlowStats(this.scene, rows, {
      x: 10,
      y: ROWS_Y,
      w: this.w - 20,
      h: availH,
      single: mode === 'next' && !this.preview,
    })
    this.root.add(this.rowsBox)
  }

  destroy() { this.rowsBox?.destroy(); this.root.destroy() }
}

const SHORT_CMP_LABEL: Record<string, string> = {
  physPen: 'เจาะกาย',
  magPen: 'เจาะเวท',
  elemDmg: 'ธาตุ',
}

/** "P.ATK 22→23 ▲" (colour + arrow say better/worse; the delta is left out so a cell fits), or just "P.ATK 22" when nothing moved. */
function cellText(r: CmpRow, single: boolean): string {
  const rawKey = r.key.includes('.') ? r.key.split('.')[1] : r.key
  const label = SHORT_CMP_LABEL[rawKey] ?? r.label
  const name = `${r.curse ? '💀' : ''}${label}`
  if (single || r.d === 0) return `${name} ${r.next === '—' ? r.now : r.next}`
  return `${name} ${r.now}→${r.next} ${r.d > 0 ? '▲' : '▼'}`
}
