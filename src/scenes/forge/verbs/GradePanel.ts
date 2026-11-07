// ⬆️ Grade-up: always succeeds once paid. Rules: upgradeGrade / gradeCheck / gradeCost (data/refine.ts, data/craft.ts).
import type Phaser from 'phaser'
import { forgeItem, GRADE, gradeCap, gradeCost } from '../../../data/craft'
import { gradeOf, itemStatLine, linesOf, refineOf, slotCount, splitStatLine, type Item } from '../../../data/meta'
import { canAffordAuto, upgradeGrade } from '../../../data/refine'
import { persist, save } from '../../../save'
import { toast, txt, UI } from '../../../ui'
import { pressLabel } from '../state'
import type { ForgeCtx, Preview, VerbAction, VerbPanel } from '../types'
import { PanelBase } from './PanelBase'

export class GradePanel extends PanelBase implements VerbPanel {
  private it!: Item
  private head!: Phaser.GameObjects.Text
  private notes!: Phaser.GameObjects.Text
  constructor(private ctx: ForgeCtx) { super() }

  mount(box: Phaser.GameObjects.Container, it: Item) {
    this.it = it
    this.head = txt(this.ctx.scene, 16, 12, '', 18, UI.text, true).setWordWrapWidth(624)
    this.notes = txt(this.ctx.scene, 16, 48, '', 13, UI.sub).setWordWrapWidth(624)
    this.put(box, this.head, this.notes)
    this.refresh()
  }

  private next() { const g = gradeOf(save(), this.it.id); return g < gradeCap(this.it) ? g + 1 : 0 }

  refresh() {
    const s = save(), it = this.it, g = gradeOf(s, it.id), n = this.next(), cap = gradeCap(it)
    if (!n) {
      this.head.setText(`${GRADE.names[g]} ★${g}/${cap}`).setColor(GRADE.colors[g])
      this.notes.setText(g >= GRADE.max ? 'ถึงขั้นตำนานแล้ว ✨' : `ของ${it.jobs || it.req ? 'คลาส' : 'ร้าน'}อัปได้ถึง ★${cap} · ของดันกับของตีเองไปได้ถึง ★5`)
      return
    }
    const notes = [`ค่าทั้งชิ้น +${Math.round(GRADE.pct[n] * 100)}% จากพื้นฐาน`]
    if (n === GRADE.slotAt && slotCount(it, n) > slotCount(it, g)) notes.push('+1 ช่องการ์ด')
    const bi = GRADE.bonusAt.indexOf(n)
    if (it.craft && bi >= 0) notes.push(`ปลด: ${itemStatLine({ mod: it.craft.bonus[bi] })}`)
    this.head.setText(`★${g} ${GRADE.names[g]}  →  ★${n} ${GRADE.names[n]}`).setColor(GRADE.colors[n])
    this.notes.setText(`${notes.join(' · ')}\nอัปขั้นสำเร็จเสมอ ไม่มีพัง · ต้องมีวัตถุดิบตามแถบด้านล่าง`)
  }

  cost() { const n = this.next(); return n ? gradeCost(this.it, n) : null }

  action(): VerbAction | null {
    const n = this.next()
    if (!n) return { label: '✓ สูงสุดแล้ว', enabled: false }
    const s = save(), c = gradeCost(this.it, n)
    return { label: pressLabel(`อัปเป็น ★${n}`, s, c), enabled: canAffordAuto(s, c) }
  }

  /** The next grade as worn: keeps the item's refine and bonus lines, so the numbers match what it will really give. */
  preview(): Preview | null {
    const n = this.next()
    if (!n) return null
    const s = save(), it = this.it
    const sp = splitStatLine(forgeItem(it, n, refineOf(s, it.id), linesOf(s, it.id)))
    return { text: `→ ★${n}: ${sp.good}${sp.curse ? ` · 💀 ${sp.curse}` : ''}`, color: GRADE.colors[n] }
  }

  act() {
    const s = save(), it = this.it, res = upgradeGrade(s, it), n = gradeOf(s, it.id)
    if (res !== 'ok') { toast(this.ctx.scene, res === 'tainted' ? '🌑 ติดคำสาปแล้ว อัปขั้นไม่ได้ค่ะ' : 'วัตถุดิบหรือ zeny ยังไม่พอค่ะ', UI.red); return }
    persist()
    this.ctx.fx.success(`★${n}`, [`${GRADE.names[n]}`])
    this.ctx.say(`เป็น ★${n} ${GRADE.names[n]} แล้ว ฝีมือเราไม่เบานะ`)
    this.ctx.changed()
  }
}
