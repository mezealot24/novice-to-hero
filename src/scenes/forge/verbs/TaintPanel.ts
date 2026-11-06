// 🌑 Corrupt: PLACEHOLDER for P2. Shows what a taint did (or the price) and opens the existing confirm (legacy.askTaint); P4 replaces it
// with the odds table + 1.2 s hold. Odds and price are read from TAINT, never typed here.
import Phaser from 'phaser'
import { isBroken, isTainted, type Item } from '../../../data/meta'
import { taintCheck, taintCost } from '../../../data/refine'
import { TAINT } from '../../../data/taint'
import { save } from '../../../save'
import { txt, UI } from '../../../ui'
import type { ForgeCtx, Preview, VerbAction, VerbPanel } from '../types'

export class TaintPanel implements VerbPanel {
  private it!: Item
  private info!: Phaser.GameObjects.Text
  constructor(private ctx: ForgeCtx) {}

  mount(box: Phaser.GameObjects.Container, it: Item) {
    this.it = it
    box.add(txt(this.ctx.scene, 16, 10, '🌑 Corrupt (คำสาป)', 18, '#c9a8ff', true))
    this.info = txt(this.ctx.scene, 16, 44, '', 13, UI.text).setWordWrapWidth(624)
    box.add(this.info)
    this.refresh()
  }

  refresh() {
    const s = save(), it = this.it
    if (isTainted(s, it.id)) { this.info.setText(`${this.ctx.legacy.taintNote(it)}\nติดคำสาปแล้ว: ตีบวก · สุ่มค่าพิเศษ · อัปขั้น ไม่ได้อีก (ซ่อมได้)`); return }
    this.info.setText(`ลุ้นครั้งเดียว แล้วของชิ้นนี้ถูกล็อกถาวร · ราคา ${TAINT.zeny}z + 🔻 ผลึกโลกันตร์ x${TAINT.crystals}\n${isBroken(s, it.id) ? '💔 ซ่อมของให้เสร็จก่อนค่อยใส่คำสาปค่ะ' : 'กดปุ่มด้านล่างเพื่อดูโอกาสแต่ละผลก่อนยืนยัน'}`)
  }

  cost() { return isTainted(save(), this.it.id) ? null : taintCost() }

  action(): VerbAction | null {
    const s = save(), chk = taintCheck(s, this.it)
    if (chk === 'tainted') return { label: '🔒 ติดคำสาปแล้ว', enabled: false }
    return { label: '🌑 ลุ้นคำสาป...', enabled: chk === 'ok', fill: 0x5a3a8a }
  }

  preview(): Preview | null { return null }
  act() { this.ctx.legacy.askTaint(this.it) }
  destroy() { /* confirm is owned by the scene */ }
}
