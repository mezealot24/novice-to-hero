// 🎲 Option gacha, inline (design/forge-ux-v1.md 4.4 / 5.1). One roll rerolls every unlocked line at once (zeny + mats);
// gems ONLY lock a line, and are paid on EVERY roll while the line stays locked (Q 2026-11-06). Rules: reroll / nextRerollCost / maxLocks / rerollMul (data/refine.ts).
// The roll is paid and applied at once; the reveal is cosmetic: each unlocked line spins, lands, and shows the old value struck through for a moment.
import Phaser from 'phaser'
import { REFINE, type RefineLine } from '../../../data/craft'
import { isBroken, isTainted, linesOf, refineOf, type Item } from '../../../data/meta'
import { canAfford, lineIdx, lineText, lockGems, maxLocks, nextRerollCost, reroll, rerollMul, rollLine, rollsOf } from '../../../data/refine'
import { persist, save } from '../../../save'
import { sfx } from '../../../sfx'
import { button, fit, toast, txt, UI, type Btn } from '../../../ui'
import { punch, spinText } from '../../../ui-fx'
import { pressLabel } from '../state'
import type { ForgeCtx, Preview, VerbAction, VerbPanel } from '../types'
import { PanelBase } from './PanelBase'

const ROW_Y = [46, 74, 102], SIZE = ['เล็ก', 'กลาง', 'ใหญ่'], OLD_MAX_X = 536, GAP_MS = 120
interface Row { label: Phaser.GameObjects.Text; val: Phaser.GameObjects.Text; old: Phaser.GameObjects.Text; strike: Phaser.GameObjects.Graphics; lock: Btn; oldTimer?: Phaser.Time.TimerEvent }

export class OptionPanel extends PanelBase implements VerbPanel {
  private it!: Item
  private rows: Row[] = []
  private headR!: Phaser.GameObjects.Text
  private sub!: Phaser.GameObjects.Text
  private note!: Phaser.GameObjects.Text
  private box!: Phaser.GameObjects.Container
  private locked: number[] = []
  private anim = new Set<number>() // rows mid-reveal: refresh() must not overwrite them
  private release?: () => void
  private curSkip?: () => void
  private zone?: Phaser.GameObjects.Rectangle
  private gapTimer?: Phaser.Time.TimerEvent
  private fast = false
  private dead = false
  constructor(private ctx: ForgeCtx) { super() }

  mount(box: Phaser.GameObjects.Container, it: Item) {
    this.it = it
    this.box = box
    const sc = this.ctx.scene
    this.locked = this.ctx.locks.get(it.id).filter((i) => lineIdx(save(), it.id).includes(i))
    this.headR = txt(sc, 640, 10, '', 12, UI.sub).setOrigin(1, 0)
    this.sub = txt(sc, 16, 30, 'สุ่มครั้งเดียว เปลี่ยนทุกบรรทัดที่ไม่ล็อก ค่าเก่าหายทันที', 12, UI.sub)
    this.note = txt(sc, 16, 48, '', 14, UI.text).setWordWrapWidth(624)
    this.put(box, txt(sc, 16, 6, '🎲 สุ่มค่าพิเศษ', 18, UI.text, true), this.headR, this.sub, this.note)
    REFINE.lineAt.forEach((at, i) => {
      const y = ROW_Y[i]
      const label = txt(sc, 16, y + 3, `+${at} (${SIZE[i]})`, 14, UI.sub, true)
      const val = txt(sc, 100, y, '', 17, UI.text, true)
      const old = txt(sc, 300, y + 5, '', 12, UI.sub).setVisible(false)
      const strike = sc.add.graphics()
      const lock = button(sc, 640 - 48, y + 13, 96, 26, '', () => this.toggle(i), { size: 13, fill: 0x5a5f8a, color: UI.text })
      this.put(box, label, val, old, strike, lock)
      this.rows.push({ label, val, old, strike, lock })
    })
    this.refresh()
  }

  private toggle(i: number) {
    if (this.ctx.isBusy() || this.anim.size) return
    this.locked = this.locked.includes(i) ? this.locked.filter((x) => x !== i) : [...this.locked, i]
    this.ctx.locks.set(this.it.id, this.locked)
    this.ctx.changed()
  }

  refresh() {
    const s = save(), it = this.it, lines = linesOf(s, it.id), have = lineIdx(s, it.id), tainted = isTainted(s, it.id)
    this.locked = this.locked.filter((i) => have.includes(i))
    if (!have.length) {
      this.headR.setText('')
      this.sub.setVisible(false)
      this.note.setText(`ตีถึง +${REFINE.lineAt[0]} ก่อนนะคะ (ตอนนี้ +${refineOf(s, it.id)})\nถึง +${REFINE.lineAt[0]} / +${REFINE.lineAt[1]} / +${REFINE.lineAt[2]} ครั้งแรกจะได้ค่าพิเศษทีละบรรทัด แล้วค่อยมาสุ่มที่นี่`).setVisible(true)
      for (const r of this.rows) for (const o of [r.label, r.val, r.old, r.strike, r.lock]) o.setVisible(false)
      return
    }
    this.note.setVisible(false)
    this.sub.setVisible(true)
    const rolls = rollsOf(s, it.id), maxLk = maxLocks(have.length), busy = this.ctx.isBusy() || this.anim.size > 0
    this.headR.setText(`สุ่มไปแล้ว ${rolls} ครั้ง · ราคา x${rerollMul(rolls).toFixed(1)} · ${maxLk ? `ล็อก ${this.locked.length}/${maxLk} · 💎${lockGems(this.locked.length)} ต่อการสุ่ม` : 'ล็อกไม่ได้ (ต้องเหลือบรรทัดให้สุ่ม)'}`)
    this.rows.forEach((r, i) => {
      const l = lines[i], on = this.locked.includes(i)
      r.label.setVisible(true); r.val.setVisible(true)
      if (!l) {
        r.val.setText(`— ยังไม่ได้ (ตีถึง +${REFINE.lineAt[i]})`).setColor(UI.sub)
        r.lock.setVisible(false)
        return
      }
      if (!this.anim.has(i)) r.val.setText(lineText(l)).setColor(l.gold ? UI.gold : UI.text)
      const canLock = on || this.locked.length < maxLk
      // 💎N is the extra gem charge on EVERY roll while this line stays locked
      r.lock.setVisible(true).setLabel(on ? '🔒 ล็อก' : `🔓 💎${REFINE.lockGems[this.locked.length] ?? '—'}`).setFill(on ? 0xb8860b : 0x5a5f8a).setEnabled(canLock && !tainted && !busy)
    })
  }

  private has() { return lineIdx(save(), this.it.id).length > 0 }
  cost() { const s = save(); return this.has() ? nextRerollCost(s, this.it, this.locked) : null }

  action(): VerbAction | null {
    const s = save(), it = this.it
    if (!this.has()) return { label: isBroken(s, it.id) ? '🔧 ไปซ่อม' : '⚒️ ไปตีบวก', enabled: true }
    if (isTainted(s, it.id)) return { label: '🔒 ติดคำสาปแล้ว', enabled: false }
    const c = nextRerollCost(s, it, this.locked)
    return { label: pressLabel(`🎲 สุ่ม ${lineIdx(s, it.id).length - this.locked.length} บรรทัด`, s, c), enabled: canAfford(s, c) }
  }

  preview(): Preview | null { return null }

  act() {
    const s = save(), it = this.it
    if (!this.has()) { this.ctx.jump(isBroken(s, it.id) ? 'repair' : 'refine'); return }
    const before: (RefineLine | undefined)[] = linesOf(s, it.id).map((l) => (l ? { ...l } : l))
    const locked = this.locked.slice(), order = lineIdx(s, it.id).filter((i) => !locked.includes(i))
    const res = reroll(s, it, locked)
    if (!res) { toast(this.ctx.scene, 'วัตถุดิบ zeny หรือเพชรยังไม่พอค่ะ', UI.red); return }
    persist(); sfx.pop()
    this.anim = new Set(order)
    this.fast = false
    this.release = this.ctx.hold() // the verb tabs and the action button stay shut until the last line lands
    this.zone = this.ctx.scene.add.rectangle(328, 65, 656, 130, 0x000000, 0.001).setInteractive()
    this.zone.on('pointerup', () => { this.fast = true; this.curSkip?.() }) // tap = skip to the end
    this.box.add(this.zone)
    this.own.push(this.zone)
    this.ctx.changed() // wallet + cost strip now; refresh() leaves the spinning rows alone
    this.step(order, 0, before, res)
  }

  private step(order: number[], k: number, before: (RefineLine | undefined)[], res: RefineLine[]) {
    if (this.dead) return
    if (k >= order.length) { this.finish(order.some((i) => res[i].gold)); return }
    const i = order[k], row = this.rows[i], line = res[i], fin = lineText(line), s = save()
    const land = () => {
      if (this.dead) return
      this.curSkip = undefined
      this.anim.delete(i)
      row.val.setText(fin).setColor(line.gold ? UI.gold : UI.text)
      punch(this.ctx.scene, row.val, { by: line.gold ? 1.25 : 1.12, ms: 160 }) // the row flash on landing
      this.showOld(row, before[i])
      if (this.fast || k === order.length - 1) this.step(order, k + 1, before, res)
      else this.gapTimer = this.ctx.scene.time.delayedCall(GAP_MS, () => this.step(order, k + 1, before, res))
    }
    if (this.fast) { land(); return }
    // scramble with random WHOLE lines (pure: no save write), so the spin doesn't reveal the stat name before it lands
    this.curSkip = spinText(this.ctx.scene, row.val, fin, { ms: 450, scramble: () => lineText(rollLine(this.it, i, s.job)), onDone: land })
  }

  /** The value that was just replaced: dimmed and struck through for about 1.5 s, right after the new value and clear of the lock button. */
  private showOld(row: Row, old: RefineLine | undefined) {
    if (!old) return
    const x = row.val.x + row.val.width + 14
    row.old.setText(`เดิม ${lineText(old)}`).setPosition(x, row.old.y).setWordWrapWidth(Math.max(60, OLD_MAX_X - x)).setVisible(true).setAlpha(0.75)
    fit(row.old, 16)
    row.strike.clear().lineStyle(2, 0xff7a7a, 1).lineBetween(row.old.x, row.old.y + row.old.height / 2, row.old.x + row.old.width, row.old.y + row.old.height / 2).setVisible(true)
    row.oldTimer?.remove(false) // one timer per row: a newer roll replaces the older one
    row.oldTimer = this.ctx.scene.time.delayedCall(1500, () => { row.oldTimer = undefined; if (row.old.scene) { row.old.setVisible(false); row.strike.clear() } })
  }

  private finish(gold: boolean) {
    this.anim.clear()
    this.zone?.destroy(); this.zone = undefined
    const rel = this.release
    this.release = undefined
    if (gold) this.ctx.fx.shine('✨ ทอง!') // once per roll, however many lines came out gold
    this.ctx.say(gold ? 'ทองเลย! เก็บบรรทัดนี้ไว้แล้วสุ่มต่อก็ได้นะ' : 'สุ่มเสร็จแล้ว ไม่ถูกใจก็ล็อกบรรทัดที่ชอบแล้วสุ่มต่อ')
    this.ctx.changed()
    rel?.()
  }

  destroy() {
    this.dead = true
    this.curSkip?.() // lands the spin timer (its onDone sees `dead` and stops)
    this.gapTimer?.remove(false)
    for (const r of this.rows) r.oldTimer?.remove(false)
    const rel = this.release
    this.release = undefined
    rel?.()
    super.destroy()
  }
}
