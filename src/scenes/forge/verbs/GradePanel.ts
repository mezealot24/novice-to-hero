// ⬆️ Grade-up: always succeeds once paid. Rules: upgradeGrade / gradeCost (data/refine.ts, data/craft.ts).
import Phaser from 'phaser'
import { GRADE, gradeCap, gradeCost, gradeItem } from '../../../data/craft'
import { gradeOf, itemStatLine, slotCount, splitStatLine, type Item } from '../../../data/meta'
import { canAfford, upgradeGrade } from '../../../data/refine'
import { persist, save } from '../../../save'
import { toast, txt, UI } from '../../../ui'
import type { ForgeCtx, Preview, VerbAction, VerbPanel } from '../types'

export class GradePanel implements VerbPanel {
  private it!: Item
  private head!: Phaser.GameObjects.Text
  private notes!: Phaser.GameObjects.Text
  constructor(private ctx: ForgeCtx) {}

  mount(box: Phaser.GameObjects.Container, it: Item) {
    this.it = it
    this.head = txt(this.ctx.scene, 16, 12, '', 18, UI.text, true).setWordWrapWidth(624)
    this.notes = txt(this.ctx.scene, 16, 48, '', 13, UI.sub).setWordWrapWidth(624)
    box.add([this.head, this.notes])
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
    return { label: `อัปเป็น ★${n}`, enabled: canAfford(save(), gradeCost(this.it, n)) }
  }

  preview(): Preview | null {
    const n = this.next()
    if (!n) return null
    const sp = splitStatLine(gradeItem(this.it, n))
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

  destroy() { /* nothing outlives the box */ }
}
