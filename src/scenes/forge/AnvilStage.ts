// The anvil: big item icon, its name / grade / stats, an optional "what happens next" preview line, and every fx a verb plays.
// A failed refine is shown HERE (shake + crack + hit-stop), never in a popup (Q 2026-11-07).
import Phaser from 'phaser'
import { FONT_UI } from '../../data/game-data'
import { gradeCap, GRADE } from '../../data/craft'
import { gradeOf, isBroken, isTainted, refineOf, slotCount, socketed, type Item } from '../../data/meta'
import { isWorn, save } from '../../save'
import { sfx } from '../../sfx'
import { button, itemIcon, panel, UI, type Btn, type ItemIcon } from '../../ui'
import { crack, floatNum, hitStop, punch } from '../../ui-fx'
import { fit } from '../../ui'
import { iconState, statSplit, taintNote } from './state'
import type { Preview, StageFx } from './types'

export const STAGE_W = 368, STAGE_H = 376
const ICON_X = STAGE_W / 2, ICON_Y = 104 // the icon's resting spot (a shake moves it and puts it back here)
const ICON = 104, CX = STAGE_W / 2, TEXT_W = STAGE_W - 32

/** v101: the anvil itself (spec 3.2 "ANVIL STAGE"): slab, waist and foot, drawn once under the icon. */
function drawAnvil(g: Phaser.GameObjects.Graphics, y: number) {
  g.fillStyle(0x000000, 0.35).fillEllipse(CX, y + 52, 190, 16) // floor shadow
  g.fillStyle(0x3b4170, 1).fillPoints([{ x: CX - 92, y }, { x: CX + 92, y }, { x: CX + 70, y: y + 18 }, { x: CX - 70, y: y + 18 }], true) // slab
  g.fillStyle(0x5a6199, 1).fillRect(CX - 92, y, 184, 4) // lit top edge
  g.fillStyle(0x2c3158, 1).fillRect(CX - 34, y + 18, 68, 20) // waist
  g.fillStyle(0x343a66, 1).fillPoints([{ x: CX - 46, y: y + 38 }, { x: CX + 46, y: y + 38 }, { x: CX + 60, y: y + 50 }, { x: CX - 60, y: y + 50 }], true) // foot
}

export class AnvilStage implements StageFx {
  private root: Phaser.GameObjects.Container
  private glow: Phaser.GameObjects.Graphics
  private icon: ItemIcon
  private nameT: Phaser.GameObjects.Text
  private subT: Phaser.GameObjects.Text
  private tagT: Phaser.GameObjects.Text
  private goodT: Phaser.GameObjects.Text
  private curseT: Phaser.GameObjects.Text
  private prevBg: Phaser.GameObjects.Graphics
  private prevT: Phaser.GameObjects.Text
  private emptyT: Phaser.GameObjects.Text
  private cardBtn: Btn
  private it?: Item
  private preview: Preview | null = null

  constructor(private scene: Phaser.Scene, private x: number, private y: number, onCards: () => void) {
    const t = (px: number, py: number, size: number, color: string, bold: boolean, w: number) =>
      scene.add.text(px, py, '', { fontFamily: FONT_UI, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', color, lineSpacing: 3, align: 'center', wordWrap: { width: w } }).setOrigin(0.5, 0)
    this.glow = scene.add.graphics()
    const anvil = scene.add.graphics()
    drawAnvil(anvil, ICON_Y + ICON / 2 + 6)
    this.icon = itemIcon(scene, ICON_X, ICON_Y, ICON, { id: '', slot: 'weapon', name: '', icon: '', price: 0, desc: '', mod: {} }, { grade: 1, refine: 0 })
    this.nameT = t(CX, 228, 20, UI.text, true, TEXT_W)
    this.subT = t(CX, 256, 13, UI.sub, false, TEXT_W)
    this.tagT = scene.add.text(STAGE_W - 12, 12, '', { fontFamily: FONT_UI, fontSize: '12px', fontStyle: 'bold', color: '#c9a8ff', align: 'right' }).setOrigin(1, 0)
    this.goodT = t(CX, 280, 13, '#9fe3a8', true, TEXT_W)
    this.curseT = t(CX, 300, 12, '#ff7a7a', true, TEXT_W)
    this.prevBg = scene.add.graphics()
    this.prevT = t(CX, 0, 12, UI.gold, true, TEXT_W - 16)
    this.emptyT = t(CX, ICON_Y + 120, 15, UI.sub, false, TEXT_W)
    this.emptyT.setText('เลือกของจากรายการด้านซ้ายเพื่อวางบนทั่งค่ะ')
    // 🃏 shortcut (spec 3.4): cards are socketed on the equipment screen, not duplicated here
    this.cardBtn = button(scene, 62, 26, 100, 28, '', onCards, { size: 12, fill: 0x5a5f8a, color: UI.text })
    this.root = scene.add.container(x, y, [panel(scene, 0, 0, STAGE_W, STAGE_H), this.glow, anvil, this.icon, this.nameT, this.subT, this.tagT, this.goodT, this.curseT, this.prevBg, this.prevT, this.emptyT, this.cardBtn])
  }

  get container() { return this.root }

  setItem(it: Item | undefined) { this.it = it; this.preview = null; this.refresh() }
  setPreview(p: Preview | null) { this.preview = p; this.refresh() }

  /** Repaint from the save (in place). */
  refresh() {
    const it = this.it, s = save()
    for (const o of [this.glow, this.icon, this.nameT, this.subT, this.tagT, this.goodT, this.curseT, this.prevBg, this.prevT]) o.setVisible(!!it)
    this.emptyT.setVisible(!it)
    this.cardBtn.setVisible(false)
    if (!it) return
    const g = gradeOf(s, it.id), r = refineOf(s, it.id), broken = isBroken(s, it.id), tainted = isTainted(s, it.id)
    const slots = slotCount(it, g)
    if (slots > 0) this.cardBtn.setVisible(true).setLabel(`🃏 การ์ด ${socketed(s, it).length}/${slots} ›`)
    const gc = GRADE.colors[Math.max(1, Math.min(GRADE.max, g))]
    // soft halo in the grade colour (purple when tainted, dim when broken): a few stacked circles, cheap on weak phones
    const halo = tainted ? 0xc08cff : Phaser.Display.Color.HexStringToColor(gc).color
    this.glow.clear()
    for (let i = 5; i >= 1; i--) this.glow.fillStyle(halo, (broken ? 0.03 : 0.06) * (6 - i) / 2).fillCircle(ICON_X, ICON_Y, ICON / 2 + i * 14)
    this.icon.setItem(it, iconState(s, it))
    this.nameT.setText(`${it.name}${r ? ` +${r}` : ''}`).setColor(gc)
    fit(this.nameT, 26)
    this.subT.setText([`★${g}/${gradeCap(it)} ${GRADE.names[g] ?? ''}`, isWorn(s, it.id) ? 'ใส่อยู่' : '', broken ? '💔 แตก (ไม่ให้ค่าพลังจนกว่าจะซ่อม)' : ''].filter(Boolean).join(' · '))
    fit(this.subT, 20)
    this.tagT.setText([it.unique ? '👑 ยูนีค' : '', tainted ? '🌑 ล็อก' : ''].filter(Boolean).join('\n'))
    const sp = statSplit(s, it)
    this.goodT.setText(sp.good || it.desc)
    fit(this.goodT, 36)
    this.curseT.setText(sp.curse ? `💀 ${sp.curse}` : '').setY(this.goodT.y + this.goodT.height + 4)
    fit(this.curseT, 18)
    const p = this.preview ?? (tainted ? { text: taintNote(s, it), color: '#c9a8ff' } : null)
    this.prevT.setText(p?.text ?? '').setColor(p?.color ?? UI.gold)
    fit(this.prevT, 36)
    // the "what you get" box sits at the bottom of the stage, sized to its text
    const ph = p?.text ? this.prevT.height + 14 : 0, py = STAGE_H - 12 - ph
    this.prevT.setY(py + 7)
    this.prevBg.clear()
    if (ph) this.prevBg.fillStyle(0x14172b, 0.85).fillRoundedRect(12, py, STAGE_W - 24, ph, 10)
  }

  // ---------- fx (all tweens/timers belong to the scene and die with it; ui-fx restores timeScale on SHUTDOWN) ----------
  private iconPos() { return { x: this.x + ICON_X, y: this.y + ICON_Y } } // the resting position (the icon itself may be mid-shake)

  private fast() { return !!save().forgeFast }

  private endAnticipation?: () => void

  anticipate(hits: number): Promise<void> {
    if (this.fast() || hits <= 0) return Promise.resolve()
    const sc = this.scene
    this.endAnticipation?.()
    return new Promise((resolve) => {
      let k = 0, done = false
      const finish = () => { if (done) return; done = true; this.endAnticipation = undefined; timer.remove(false); sc.input.off('pointerdown', finish); sc.events.off(Phaser.Scenes.Events.SHUTDOWN, finish); resolve() }
      this.endAnticipation = finish // destroy() ends it too, so no stray clang / punch lands on a destroyed icon
      const timer = sc.time.addEvent({ delay: 140, repeat: hits - 1, callback: () => { sfx.clang(); punch(sc, this.icon, { by: 1.06, ms: 90 }); if (++k >= hits) finish() } })
      sc.input.once('pointerdown', finish) // tap = skip to the result
      sc.events.once(Phaser.Scenes.Events.SHUTDOWN, finish)
    })
  }

  success(label: string, notes: string[] = [], tier: 'light' | 'heavy' | 'epic' = 'heavy') {
    const p0 = this.iconPos()
    if (tier === 'light') { // +1..+4: a small pop and the number, nothing more
      sfx.coin()
      punch(this.scene, this.icon, { by: 1.12, ms: 120 })
      floatNum(this.scene, p0.x, p0.y - 56, label, { color: '#f2b84b', size: 28, ms: 650 })
      notes.forEach((n, i) => floatNum(this.scene, p0.x, p0.y + 76 + i * 26, n, { color: i === 0 ? '#d9c2ff' : UI.gem, size: 17, ui: true, ms: 1400, rise: 26 }))
      return
    }
    if (!this.fast()) hitStop(this.scene, 80)
    sfx.coin()
    if (tier === 'epic') sfx.door()
    punch(this.scene, this.icon, { by: tier === 'epic' ? 1.32 : 1.25, ms: 180 })
    const p = p0
    floatNum(this.scene, p.x, p.y - 56, label, { color: '#f2b84b', size: tier === 'epic' ? 40 : 34 })
    notes.forEach((n, i) => floatNum(this.scene, p.x, p.y + 76 + i * 26, n, { color: i === 0 ? '#d9c2ff' : UI.gem, size: 17, ui: true, ms: 1400, rise: 26 }))
    this.scene.cameras.main.flash(120, 255, 230, 160)
  }

  fail(label: string) {
    sfx.clang(); sfx.hurt()
    if (!this.fast()) hitStop(this.scene, 60)
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
    floatNum(this.scene, p.x, p.y + 80, label, { color: '#ffd35a', size: 22, ui: true, ms: 1000 })
    this.scene.cameras.main.flash(160, 255, 215, 90)
  }

  burst(kind: 'none' | 'gold' | 'curse' | 'brick', label: string) {
    const p = this.iconPos(), sc = this.scene, col = kind === 'gold' ? 0xffd35a : 0xc08cff
    if (!this.fast()) hitStop(sc, 150)
    sfx.critBoom()
    const vig = sc.add.rectangle(this.x + STAGE_W / 2, this.y + STAGE_H / 2, STAGE_W, STAGE_H, 0x1a0630, 0.75).setDepth(44000)
    sc.tweens.add({ targets: vig, alpha: 0, duration: 900, onComplete: () => vig.destroy() })
    const ring = sc.add.circle(p.x, p.y, 20).setStrokeStyle(6, col).setDepth(44001)
    sc.tweens.add({ targets: ring, scale: 6, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() })
    if (kind === 'curse' || kind === 'brick') { sfx.hurt(); sc.cameras.main.shake(220, 0.007) } else if (kind === 'gold') { sfx.coin(); sc.cameras.main.flash(180, 255, 215, 90) } else sfx.pop()
    floatNum(sc, p.x, p.y + 84, label, { color: kind === 'gold' ? '#ffd35a' : '#c9a8ff', size: 20, ui: true, ms: 1800, rise: 30 })
  }

  mend() {
    sfx.coin()
    punch(this.scene, this.icon, { by: 1.12, ms: 140 })
    const p = this.iconPos()
    floatNum(this.scene, p.x, p.y - 56, '🔧 ซ่อมแล้ว', { color: UI.green, size: 22, ui: true })
  }

  destroy() { this.endAnticipation?.(); this.root.destroy() }
}
