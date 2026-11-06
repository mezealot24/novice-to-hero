// Left rail of the anvil: every item the forge can work on, in a fixed order, paged, filter worn-class / all.
// Rows are rebuilt only when the filter or page changes; refresh() repaints icons and captions in place.
import Phaser from 'phaser'
import { FONT_UI } from '../../data/game-data'
import { JOBS } from '../../data/jobs'
import { gradeCap, gradeStars } from '../../data/craft'
import { isBroken, isTainted, refineOf, gradeOf, type Item } from '../../data/meta'
import { isWorn, save, type SaveData } from '../../save'
import { sfx } from '../../sfx'
import { button, itemIcon, panel, txt, UI, type Btn, type ItemIcon } from '../../ui'
import { fit } from './legacy'
import { iconState, railItems } from './state'

const ROW_H = 52, PER = 7, ROW_GAP = 4
interface Row { it: Item; bg: Phaser.GameObjects.Graphics; icon: ItemIcon; name: Phaser.GameObjects.Text; sub: Phaser.GameObjects.Text; box: Phaser.GameObjects.Container }

export class ItemRail {
  private root: Phaser.GameObjects.Container
  private rows: Row[] = []
  private head: Phaser.GameObjects.Container
  private pageT!: Phaser.GameObjects.Text
  private prev!: Btn
  private next!: Btn
  private filter!: Btn
  private mineOnly = true
  private page = 0
  private list: Item[] = []
  private empty?: Phaser.GameObjects.Text
  selected?: string

  constructor(private scene: Phaser.Scene, private x: number, private y: number, private w: number, private onPick: (id: string) => void) {
    this.root = scene.add.container(0, 0)
    this.head = scene.add.container(0, 0)
    this.root.add(this.head)
    this.buildHead()
    this.rebuild()
  }

  get container() { return this.root }

  /** Currently visible item ids' source list (all pages). */
  items(): Item[] { return this.list }

  select(id: string | undefined) {
    this.selected = id
    const i = this.list.findIndex((it) => it.id === id)
    if (i >= 0 && Math.floor(i / PER) !== this.page) { this.page = Math.floor(i / PER); this.rebuild() }
    else this.refresh()
  }

  private buildHead() {
    const { x, y } = this
    const filterLabel = () => (this.mineOnly ? `${JOBS[save().job].icon} ของฉัน` : '🌐 ทั้งหมด')
    this.filter = button(this.scene, x + 56, y + 16, 112, 32, filterLabel(), () => {
      this.mineOnly = !this.mineOnly; this.page = 0; this.filter.setLabel(filterLabel()); this.rebuild()
      if (!this.list.some((it) => it.id === this.selected)) this.onPick(this.list[0]?.id ?? '')
    }, { size: 14, fill: 0x5a5f8a, color: UI.text })
    this.prev = button(this.scene, x + this.w - 92, y + 16, 34, 32, '◀', () => { this.page--; this.rebuild() }, { size: 14 })
    this.pageT = txt(this.scene, x + this.w - 54, y + 16, '', 13, UI.text, true).setOrigin(0.5)
    this.next = button(this.scene, x + this.w - 16, y + 16, 34, 32, '▶', () => { this.page++; this.rebuild() }, { size: 14 })
    this.head.add([this.filter, this.prev, this.pageT, this.next])
  }

  /** Rebuild the rows of the current page (filter / page / list change only). */
  rebuild() {
    for (const r of this.rows) r.box.destroy()
    this.rows = []
    const s = save()
    this.list = railItems(s, this.mineOnly)
    const pages = Math.max(1, Math.ceil(this.list.length / PER))
    this.page = Math.max(0, Math.min(this.page, pages - 1))
    this.prev.setEnabled(this.page > 0)
    this.next.setEnabled(this.page < pages - 1)
    this.pageT.setText(`${this.page + 1}/${pages}`)
    const slice = this.list.slice(this.page * PER, this.page * PER + PER)
    slice.forEach((it, i) => {
      const cy = this.y + 44 + i * (ROW_H + ROW_GAP) + ROW_H / 2, w = this.w
      const bg = this.scene.add.graphics()
      const icon = itemIcon(this.scene, -w / 2 + 30, 0, 40, it, iconState(s, it))
      const name = this.scene.add.text(-w / 2 + 58, -ROW_H / 2 + 6, '', { fontFamily: FONT_UI, fontSize: '13px', fontStyle: 'bold', color: UI.text, wordWrap: { width: w - 66 } })
      const sub = this.scene.add.text(-w / 2 + 58, -ROW_H / 2 + 30, '', { fontFamily: FONT_UI, fontSize: '11px', color: UI.sub, wordWrap: { width: w - 66 } })
      const box = this.scene.add.container(this.x + w / 2, cy, [bg, icon, name, sub]).setSize(w, ROW_H).setInteractive({ useHandCursor: true })
      box.on('pointerup', () => { if (this.selected !== it.id) { sfx.pop(); this.onPick(it.id) } })
      this.root.add(box)
      this.rows.push({ it, bg, icon, name, sub, box })
    })
    this.empty?.destroy()
    this.empty = slice.length ? undefined : txt(this.scene, this.x + this.w / 2, this.y + 120, 'ยังไม่มีของที่ตีได้ค่ะ\nซื้อของที่ร้าน หรือสร้างของที่แท็บ 📜 สูตร\n(กด 🌐 ทั้งหมด เพื่อดูของอาชีพอื่น)', 13, UI.sub).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(this.w - 20)
    if (this.empty) this.root.add(this.empty)
    this.refresh()
  }

  /** Repaint states in place (selection, +N, broken, caption). */
  refresh() {
    const s = save()
    for (const r of this.rows) {
      const on = r.it.id === this.selected, w = this.w
      r.bg.clear().fillStyle(on ? UI.panelHi : UI.panel, 1).fillRoundedRect(-w / 2, -ROW_H / 2, w, ROW_H, 10)
      r.bg.lineStyle(on ? 3 : 1.5, on ? 0xf2b84b : UI.line, 1).strokeRoundedRect(-w / 2, -ROW_H / 2, w, ROW_H, 10)
      r.icon.setItem(r.it, iconState(s, r.it))
      r.name.setText(r.it.name)
      fit(r.name, 18)
      r.sub.setText(this.caption(s, r.it))
      fit(r.sub, 16)
    }
  }

  private caption(s: SaveData, it: Item): string {
    const g = gradeOf(s, it.id), r = refineOf(s, it.id)
    const bits = [gradeStars(g, gradeCap(it)), r ? `+${r}` : '', isWorn(s, it.id) ? 'ใส่อยู่' : '', isBroken(s, it.id) ? '💔 แตก' : '', isTainted(s, it.id) ? '🌑' : '']
    return bits.filter(Boolean).join(' · ')
  }

  destroy() { this.root.destroy() }
}

/** Panel behind the whole rail column (drawn once by the shell). */
export function railBackdrop(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
  return panel(scene, x, y, w, h, 0x1d2140, UI.line, 12)
}
