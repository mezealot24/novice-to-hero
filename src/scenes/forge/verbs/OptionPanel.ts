// 🎲 Option gacha: PLACEHOLDER for P2. It only opens the existing popup (legacy.linesView); P3 replaces it with the inline panel.
import Phaser from 'phaser'
import { REFINE } from '../../../data/craft'
import { linesOf, refineOf, type Item } from '../../../data/meta'
import { lineText } from '../../../data/refine'
import { save } from '../../../save'
import { txt, UI } from '../../../ui'
import type { ForgeCtx, Preview, VerbAction, VerbPanel } from '../types'

export class OptionPanel implements VerbPanel {
  private it!: Item
  private info!: Phaser.GameObjects.Text
  constructor(private ctx: ForgeCtx) {}

  mount(box: Phaser.GameObjects.Container, it: Item) {
    this.it = it
    box.add(txt(this.ctx.scene, 16, 10, '🎲 สุ่มค่าพิเศษ', 18, UI.text, true))
    this.info = txt(this.ctx.scene, 16, 44, '', 13, UI.text).setWordWrapWidth(624)
    box.add(this.info)
    this.refresh()
  }

  refresh() {
    const s = save(), lines = linesOf(s, this.it.id)
    this.info.setText(`ตีบวกถึง +${REFINE.lineAt[0]} / +${REFINE.lineAt[1]} / +${REFINE.lineAt[2]} จะได้ค่าพิเศษทีละบรรทัด (ตอนนี้ +${refineOf(s, this.it.id)})\n${REFINE.lineAt.map((at, i) => `+${at}: ${lines[i] ? lineText(lines[i]) : '—'}`).join('\n')}`)
  }

  cost() { return null }
  action(): VerbAction | null { return { label: '🎲 เปิดหน้าสุ่ม', enabled: (linesOf(save(), this.it.id).some(Boolean)) } }
  preview(): Preview | null { return null }
  act() { this.ctx.legacyLines(this.it) }
  destroy() { /* popup is owned by LegacyForge */ }
}
