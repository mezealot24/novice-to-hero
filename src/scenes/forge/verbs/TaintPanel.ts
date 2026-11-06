// 🌑 Corrupt (design/forge-ux-v1.md 4.5): one irreversible roll. The odds and the price are read from TAINT / taintCost(), never typed here.
// A 1.2 s press-and-hold is the confirmation (no modal). Rules: tryTaint / taintCheck (data/refine.ts).
import type Phaser from 'phaser'
import { REFINE } from '../../../data/craft'
import { isBroken, isTainted, linesOf, type Item } from '../../../data/meta'
import { lineText, taintCheck, taintCost, tryTaint } from '../../../data/refine'
import { TAINT, TAINT_KINDS, type TaintKind } from '../../../data/taint'
import { isWorn, persist, save } from '../../../save'
import { fit, meter, toast, txt, UI } from '../../../ui'
import { pressLabel, taintNote, taintOutcome } from '../state'
import type { ForgeCtx, Preview, VerbAction, VerbPanel } from '../types'
import { PanelBase } from './PanelBase'

const HOLD_MS = 1200
const KIND: Record<TaintKind, { label: string; color: number }> = {
  none: { label: '😐 ไม่เกิดอะไร (แต่ของถูกล็อก)', color: 0x8a8fb8 },
  gold: { label: '✨ ค่าพิเศษเป็นทอง', color: 0xf2b84b },
  curse: { label: '💀 ได้บรรทัดคำสาป (แรง + ข้อเสีย)', color: 0xc08cff },
  brick: { label: '💥 พัง เสียค่าพิเศษ 1 บรรทัด / บวก −1', color: 0xff7a7a },
}

export class TaintPanel extends PanelBase implements VerbPanel {
  private it!: Item
  private head!: Phaser.GameObjects.Text
  private warn!: Phaser.GameObjects.Text
  private foot!: Phaser.GameObjects.Text
  private odds: Phaser.GameObjects.GameObject[] = []
  constructor(private ctx: ForgeCtx) { super() }

  mount(box: Phaser.GameObjects.Container, it: Item) {
    this.it = it
    const sc = this.ctx.scene
    this.head = txt(sc, 16, 6, '', 17, '#c9a8ff', true).setWordWrapWidth(624)
    this.put(box, this.head)
    // 2 x 2 odds table: a bar + the share + what it does
    TAINT_KINDS.forEach((k, i) => {
      const x = 16 + (i % 2) * 316, y = 34 + Math.floor(i / 2) * 22
      const bar = meter(sc, x, y + 3, 54, 10, [{ v: TAINT.odds[k], color: KIND[k].color }])
      const t = txt(sc, x + 62, y, `${Math.round(TAINT.odds[k] * 100)}% ${KIND[k].label}`, 12, UI.text).setWordWrapWidth(246)
      fit(t, 17)
      this.put(box, bar, t)
      this.odds.push(bar, t)
    })
    this.warn = txt(sc, 16, 82, '', 12, '#ffb0b0', true).setWordWrapWidth(624)
    this.foot = txt(sc, 16, 108, '', 12, UI.sub).setWordWrapWidth(624)
    this.put(box, this.warn, this.foot)
    this.refresh()
  }

  refresh() {
    const s = save(), it = this.it, tainted = isTainted(s, it.id)
    for (const o of this.odds) (o as Phaser.GameObjects.Text).setVisible(!tainted)
    if (tainted) {
      this.head.setText('☠️ Corrupted: ล็อกถาวรแล้ว')
      this.warn.setY(34).setColor('#c9a8ff').setText(`${taintNote(s, it)}\nอัปขั้น · ตีบวก · สุ่มค่าพิเศษ ทำไม่ได้อีก (ซ่อมได้ ยังใส่/เสียบการ์ดได้ปกติ)`)
      fit(this.warn, 52)
      const lines = linesOf(s, it.id)
      this.foot.setY(92).setColor('#d9c2ff').setText(`🎁 ${REFINE.lineAt.map((at, i) => `+${at} ${lines[i] ? lineText(lines[i]) : '—'}`).join(' · ')}`)
      return
    }
    this.head.setText('☠️ Corrupt: สุ่มครั้งเดียว ย้อนไม่ได้')
    this.warn.setY(82).setColor('#ffb0b0').setText(isBroken(s, it.id)
      ? '💔 ซ่อมของให้เสร็จก่อนค่อยลุ้นคำสาปค่ะ'
      : `หลัง Corrupt ของชิ้นนี้ถูกล็อก: ตีบวก · อัปขั้น · สุ่มค่าพิเศษ ไม่ได้อีก (ซ่อมได้)${isWorn(s, it.id) ? ' · ⚠ ของชิ้นนี้ใส่อยู่' : ''}`)
    fit(this.warn, 30)
    this.foot.setY(110).setColor(UI.sub).setText(`ราคา ${TAINT.zeny}z + 🔻 ผลึกโลกันตร์ x${TAINT.crystals} (เท่ากันทุกชิ้น) · 💡 ทำหลังสุด หลัง +10 / ★ สูงสุด`)
    fit(this.foot, 17)
  }

  cost() { return isTainted(save(), this.it.id) ? null : taintCost() }

  action(): VerbAction | null {
    const s = save(), chk = taintCheck(s, this.it)
    if (chk === 'tainted') return { label: '🔒 Corrupt แล้ว', enabled: false }
    const c = taintCost(), base = '☠️ กดค้างเพื่อ Corrupt'
    const ok = chk === 'ok' && s.zeny >= c.zeny && Object.entries(c.mats).every(([id, n]) => (s.mats?.[id] ?? 0) >= n)
    return { label: chk === 'broken' ? '💔 ซ่อมก่อน' : ok ? base : pressLabel(base, s, c), enabled: ok, fill: 0x8a4fd0, hold: HOLD_MS }
  }

  preview(): Preview | null { return null }

  act() {
    const s = save(), it = this.it, res = tryTaint(s, it)
    if (!res.ok) { toast(this.ctx.scene, res.why === 'short' ? `zeny หรือ 🔻ผลึกโลกันตร์ ยังไม่พอค่ะ (ต้อง ${TAINT.zeny}z + ${TAINT.crystals} ชิ้น)` : 'ใส่คำสาปชิ้นนี้ไม่ได้ค่ะ', UI.red); return }
    persist()
    const text = taintOutcome(res)
    this.ctx.fx.burst(res.kind, text)
    this.ctx.busy(1400) // let the burst play before anything else can be pressed
    this.ctx.say(text)
    this.ctx.changed()
  }
}
