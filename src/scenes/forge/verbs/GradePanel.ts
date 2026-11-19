// ⬆️ Grade-up: always succeeds once paid. Rules: upgradeGrade / gradeCheck / gradeCost (data/refine.ts, data/craft.ts).
// Q 2026-11-19 "รวมระบบอัปขั้นกับยกขั้นไว้ด้วยกัน": one tab. ★1 -> ★5 first, then the same tab carries on with ⇧ ascension
// (data/ascend.ts) for pieces that can move up a gear zone. The ascension half lives in AscendPanel and is shown in place.
import type Phaser from 'phaser'
import { ascendMax, homeZone, zoneName } from '../../../data/ascend'
import { GRADE, gradeCap, gradeCost } from '../../../data/craft'
import { forged, gradeOf, itemStatLine, slotCount, type Item } from '../../../data/meta'
import { canAffordAuto, upgradeGrade } from '../../../data/refine'
import { persist, save } from '../../../save'
import { toast, txt, UI } from '../../../ui'
import { pressLabel } from '../state'
import { INNER_W, PAD, type ForgeCtx, type Preview, type VerbAction, type VerbPanel } from '../types'
import { AscendPanel } from './AscendPanel'
import { PanelBase } from './PanelBase'

export class GradePanel extends PanelBase implements VerbPanel {
  private it!: Item
  private head!: Phaser.GameObjects.Text
  private notes!: Phaser.GameObjects.Text
  private asc?: AscendPanel
  constructor(private ctx: ForgeCtx) { super() }

  mount(box: Phaser.GameObjects.Container, it: Item) {
    this.it = it
    this.head = txt(this.ctx.scene, PAD, 14, '', 18, UI.text, true).setWordWrapWidth(INNER_W)
    this.notes = txt(this.ctx.scene, PAD, 74, '', 13, UI.sub).setWordWrapWidth(INNER_W).setLineSpacing(4)
    this.put(box, this.head, this.notes)
    if (ascendMax(it) > 0) { this.asc = new AscendPanel(this.ctx); this.asc.mount(box, it) }
    this.refresh()
  }

  /** ⇧ half is on once the piece is at its top grade and can still move up a zone (or already did). */
  private ascending() { return !!this.asc && !this.next() }

  private next() { const g = gradeOf(save(), this.it.id); return g < gradeCap(this.it) ? g + 1 : 0 }

  refresh() {
    const up = this.ascending()
    this.setShown(!up)
    this.asc?.setShown(up)
    if (up) { this.asc!.refresh(); return }
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
    this.head.setText(`★${g} ${GRADE.names[g]}\n→ ★${n} ${GRADE.names[n]}`).setColor(GRADE.colors[n])
    const then = this.asc ? `\n⇧ ถึง ★${cap} แล้วยกขั้นต่อในแท็บนี้ได้ (โซน ${zoneName(homeZone(it))} → ${zoneName(homeZone(it) + 1)})` : ''
    this.notes.setText(`${notes.join('\n')}\n\n✅ อัปขั้นสำเร็จเสมอ ไม่มีพัง\nใช้วัตถุดิบตามแถบด้านล่าง${then}`)
  }

  cost() { if (this.ascending()) return this.asc!.cost(); const n = this.next(); return n ? gradeCost(this.it, n) : null }

  action(): VerbAction | null {
    if (this.ascending()) return this.asc!.action()
    const n = this.next()
    if (!n) return { label: '✓ สูงสุดแล้ว', enabled: false }
    const s = save(), c = gradeCost(this.it, n)
    return { label: pressLabel(`อัปเป็น ★${n}`, s, c), enabled: canAffordAuto(s, c) }
  }

  /** The next grade as worn: keeps the item's refine and bonus lines, so the numbers match what it will really give. */
  preview(): Preview | null {
    if (this.ascending()) return this.asc!.preview()
    const n = this.next()
    if (!n) return null
    const s = save(), it = this.it
    return { label: `★${n}`, next: forged({ ...s, grade: { ...s.grade, [it.id]: n } }, it), color: GRADE.colors[n] } // forged(): a taint curse line stays on
  }

  act() {
    if (this.ascending()) { this.asc!.act(); return }
    const s = save(), it = this.it, res = upgradeGrade(s, it), n = gradeOf(s, it.id)
    if (res !== 'ok') { toast(this.ctx.scene, res === 'tainted' ? '🌑 ติดคำสาปแล้ว อัปขั้นไม่ได้ค่ะ' : 'วัตถุดิบหรือ zeny ยังไม่พอค่ะ', UI.red); return }
    persist()
    this.ctx.fx.success(`★${n}`, [`${GRADE.names[n]}`])
    this.ctx.say(`เป็น ★${n} ${GRADE.names[n]} แล้ว ฝีมือเราไม่เบานะ`)
    this.ctx.changed()
  }

  destroy() { this.asc?.destroy(); super.destroy() }
}
