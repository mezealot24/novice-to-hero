// The anvil: big item icon, its name / grade / stats, an optional "what happens next" preview line, and every fx a verb plays.
// A failed refine is shown HERE (shake + crack + hit-stop), never in a popup (Q 2026-11-07).
import Phaser from 'phaser'
import { FONT_UI } from '../../data/game-data'
import { gradeCap, GRADE } from '../../data/craft'
import { gradeOf, isBroken, isTainted, refineOf, type Item } from '../../data/meta'
import { isWorn, save } from '../../save'
import { sfx } from '../../sfx'
import { itemIcon, panel, UI, type ItemIcon } from '../../ui'
import { crack, floatNum, hitStop, punch } from '../../ui-fx'
import { fit } from '../../ui'
import { iconState, statSplit, taintNote } from './state'
import type { Preview, StageFx } from './types'

export const STAGE_W = 656, STAGE_H = 150
const ICON_X = 70 // the icon's resting x (a shake moves it and puts it back here)
const ICON = 96

export class AnvilStage implements StageFx {
  private root: Phaser.GameObjects.Container
  private icon: ItemIcon
  private nameT: Phaser.GameObjects.Text
  private subT: Phaser.GameObjects.Text
  private tagT: Phaser.GameObjects.Text
  private goodT: Phaser.GameObjects.Text
  private curseT: Phaser.GameObjects.Text
  private prevT: Phaser.GameObjects.Text
  private emptyT: Phaser.GameObjects.Text
  private it?: Item
  private preview: Preview | null = null

  constructor(private scene: Phaser.Scene, private x: number, private y: number) {
    const t = (px: number, py: number, size: number, color: string, bold: boolean, w: number) =>
      scene.add.text(px, py, '', { fontFamily: FONT_UI, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', color, lineSpacing: 3, wordWrap: { width: w } })
    this.icon = itemIcon(scene, ICON_X, STAGE_H / 2, ICON, { id: '', slot: 'weapon', name: '', icon: '', price: 0, desc: '', mod: {} }, { grade: 1, refine: 0 })
    this.nameT = t(128, 10, 20, UI.text, true, 390)
    this.subT = t(128, 38, 13, UI.sub, false, 390)
    this.tagT = t(STAGE_W - 12, 12, 12, '#c9a8ff', true, 120).setOrigin(1, 0).setAlign('right')
    this.goodT = t(128, 62, 13, '#9fe3a8', true, STAGE_W - 144)
    this.curseT = t(128, 100, 12, '#ff7a7a', true, STAGE_W - 144)
    this.prevT = t(128, 120, 13, UI.gold, true, STAGE_W - 144)
    this.emptyT = t(STAGE_W / 2, STAGE_H / 2, 15, UI.sub, false, STAGE_W - 40).setOrigin(0.5).setAlign('center')
    this.emptyT.setText('เลือกของจากรายการด้านซ้ายเพื่อวางบนทั่งค่ะ')
    this.root = scene.add.container(x, y, [panel(scene, 0, 0, STAGE_W, STAGE_H), this.icon, this.nameT, this.subT, this.tagT, this.goodT, this.curseT, this.prevT, this.emptyT])
  }

  get container() { return this.root }

  setItem(it: Item | undefined) { this.it = it; this.preview = null; this.refresh() }
  setPreview(p: Preview | null) { this.preview = p; this.refresh() }

  /** Repaint from the save (in place). */
  refresh() {
    const it = this.it, s = save()
    for (const o of [this.icon, this.nameT, this.subT, this.tagT, this.goodT, this.curseT, this.prevT]) o.setVisible(!!it)
    this.emptyT.setVisible(!it)
    if (!it) return
    const g = gradeOf(s, it.id), r = refineOf(s, it.id), broken = isBroken(s, it.id), tainted = isTainted(s, it.id)
    this.icon.setItem(it, iconState(s, it))
    this.nameT.setText(`${it.name}${r ? ` +${r}` : ''}`).setColor(GRADE.colors[Math.max(1, Math.min(GRADE.max, g))])
    fit(this.nameT, 28)
    this.subT.setText([`★${g}/${gradeCap(it)} ${GRADE.names[g] ?? ''}`, isWorn(s, it.id) ? 'ใส่อยู่' : '', broken ? '💔 แตก (ไม่ให้ค่าพลังจนกว่าจะซ่อม)' : ''].filter(Boolean).join(' · '))
    fit(this.subT, 20)
    this.tagT.setText([it.unique ? '👑 ยูนีค' : '', tainted ? '🌑 ล็อก' : ''].filter(Boolean).join('\n'))
    const sp = statSplit(s, it)
    this.goodT.setText(sp.good || it.desc)
    fit(this.goodT, 40)
    this.curseT.setText(sp.curse ? `💀 ${sp.curse}` : '')
    fit(this.curseT, 18)
    const p = this.preview ?? (tainted ? { text: taintNote(s, it), color: '#c9a8ff' } : null)
    this.prevT.setText(p?.text ?? '').setColor(p?.color ?? UI.gold)
    fit(this.prevT, 24)
  }

  // ---------- fx (all tweens/timers belong to the scene and die with it; ui-fx restores timeScale on SHUTDOWN) ----------
  private iconPos() { return { x: this.x + ICON_X, y: this.y + STAGE_H / 2 } } // the resting position (the icon itself may be mid-shake)

  success(label: string, notes: string[] = []) {
    sfx.coin()
    punch(this.scene, this.icon, { by: 1.22, ms: 160 })
    const p = this.iconPos()
    floatNum(this.scene, p.x, p.y - 56, label, { color: '#f2b84b', size: 30 })
    notes.forEach((n, i) => floatNum(this.scene, p.x + 150, p.y - 24 + i * 28, n, { color: i === 0 ? '#d9c2ff' : UI.gem, size: 17, ui: true, ms: 1400, rise: 26 }))
    this.scene.cameras.main.flash(120, 255, 230, 160)
  }

  fail(label: string) {
    sfx.hurt()
    hitStop(this.scene, 70)
    const p = this.iconPos(), ix = ICON_X // the resting x, not whatever a running shake left it at
    this.scene.tweens.killTweensOf(this.icon) // a running punch must not fight the shake
    this.icon.setScale(1)
    this.scene.tweens.add({ targets: this.icon, x: ix + 7, duration: 45, yoyo: true, repeat: 3, onComplete: () => { if (this.icon.active) this.icon.x = ix }, onStop: () => { if (this.icon.active) this.icon.x = ix } })
    crack(this.scene, p.x, p.y, ICON)
    floatNum(this.scene, p.x, p.y - 56, label, { color: '#ff7a7a', size: 26, ui: true, ms: 1100 })
    this.scene.cameras.main.shake(160, 0.005)
  }

  shine(label: string) {
    sfx.coin()
    const p = this.iconPos()
    floatNum(this.scene, p.x + 150, p.y - 44, label, { color: '#ffd35a', size: 22, ui: true, ms: 1000 })
    this.scene.cameras.main.flash(160, 255, 215, 90)
  }

  burst(kind: 'none' | 'gold' | 'curse' | 'brick', label: string) {
    const p = this.iconPos(), sc = this.scene, col = kind === 'gold' ? 0xffd35a : 0xc08cff
    hitStop(sc, 120)
    const vig = sc.add.rectangle(this.x + STAGE_W / 2, this.y + STAGE_H / 2, STAGE_W, STAGE_H, 0x1a0630, 0.75).setDepth(44000)
    sc.tweens.add({ targets: vig, alpha: 0, duration: 900, onComplete: () => vig.destroy() })
    const ring = sc.add.circle(p.x, p.y, 20).setStrokeStyle(6, col).setDepth(44001)
    sc.tweens.add({ targets: ring, scale: 6, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() })
    if (kind === 'curse' || kind === 'brick') { sfx.hurt(); sc.cameras.main.shake(220, 0.007) } else if (kind === 'gold') { sfx.coin(); sc.cameras.main.flash(180, 255, 215, 90) } else sfx.pop()
    floatNum(sc, p.x + 220, p.y - 30, label, { color: kind === 'gold' ? '#ffd35a' : '#c9a8ff', size: 20, ui: true, ms: 1800, rise: 30 })
  }

  mend() {
    sfx.coin()
    punch(this.scene, this.icon, { by: 1.12, ms: 140 })
    const p = this.iconPos()
    floatNum(this.scene, p.x, p.y - 56, '🔧 ซ่อมแล้ว', { color: UI.green, size: 22, ui: true })
  }

  destroy() { this.root.destroy() }
}
