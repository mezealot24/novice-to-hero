// 🌑 Corrupt: PLACEHOLDER for P2. Shows what a taint did (or the price) and opens the existing confirm (taintUi.ask); P4 replaces it
// with the odds table + 1.2 s hold. Odds and price are read from TAINT, never typed here.
import type Phaser from 'phaser'
import { REFINE } from '../../../data/craft'
import { isBroken, isTainted, linesOf, type Item } from '../../../data/meta'
import { lineText, taintCheck, taintCost } from '../../../data/refine'
import { TAINT } from '../../../data/taint'
import { save } from '../../../save'
import { fit, txt, UI } from '../../../ui'
import type { ForgeCtx, Preview, VerbAction, VerbPanel } from '../types'
import { PanelBase } from './PanelBase'

export class TaintPanel extends PanelBase implements VerbPanel {
  private it!: Item
  private info!: Phaser.GameObjects.Text
  private lines!: Phaser.GameObjects.Text
  constructor(private ctx: ForgeCtx) { super() }

  mount(box: Phaser.GameObjects.Container, it: Item) {
    this.it = it
    this.info = txt(this.ctx.scene, 16, 40, '', 13, UI.text).setWordWrapWidth(624)
    this.lines = txt(this.ctx.scene, 16, 108, '', 12, '#d9c2ff').setWordWrapWidth(624)
    this.put(box, txt(this.ctx.scene, 16, 10, '🌑 Corrupt (คำสาป)', 18, '#c9a8ff', true), this.info, this.lines)
    this.refresh()
  }

  refresh() {
    const s = save(), it = this.it, tainted = isTainted(s, it.id), lines = linesOf(s, it.id)
    if (tainted) {
      this.info.setText(`${this.ctx.taintUi.note(it)}\nติดคำสาปแล้ว: ตีบวก · สุ่มค่าพิเศษ · อัปขั้น ไม่ได้อีก (ซ่อมได้)`)
      // the option lines stay visible here so a "gold" result can be checked
      this.lines.setText(`🎁 ${REFINE.lineAt.map((at, i) => `+${at} ${lines[i] ? lineText(lines[i]) : '—'}`).join(' · ')}`)
      fit(this.lines, 17)
      return
    }
    this.lines.setText('')
    this.info.setText(`ลุ้นครั้งเดียว แล้วของชิ้นนี้ถูกล็อกถาวร · ราคา ${TAINT.zeny}z + 🔻 ผลึกโลกันตร์ x${TAINT.crystals}\n${isBroken(s, it.id) ? '💔 ซ่อมของให้เสร็จก่อนค่อยใส่คำสาปค่ะ' : 'กดปุ่มด้านล่างเพื่อดูโอกาสแต่ละผลก่อนยืนยัน'}`)
  }

  cost() { return isTainted(save(), this.it.id) ? null : taintCost() }

  action(): VerbAction | null {
    const chk = taintCheck(save(), this.it)
    if (chk === 'tainted') return { label: '🔒 ติดคำสาปแล้ว', enabled: false }
    return { label: '🌑 ลุ้นคำสาป...', enabled: chk === 'ok', fill: 0x5a3a8a }
  }

  preview(): Preview | null { return null }
  act() { this.ctx.taintUi.ask(this.it) }
}
