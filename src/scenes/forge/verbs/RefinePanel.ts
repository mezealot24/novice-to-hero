// ⚒️ Refine +1..+10. Rules: tryRefine / refineCheck / rateParts / refineCost / canAffordAuto / fodderToBuy (data/refine.ts).
// Shows the chance as a stacked meter: base + pity + a ghost "+10% if this one fails". A fail shows on the stage, no popup (Q 2026-11-07).
import type Phaser from 'phaser'
import { REFINE } from '../../../data/craft'
import { forged, linesOf, refineOf, type Item } from '../../../data/meta'
import { canAffordAuto, fodderToBuy, lineText, nextRate, rateParts, refineCost, totalZeny, tryRefine } from '../../../data/refine'
import { persist, save } from '../../../save'
import { confirm, fit, meter, toast, txt, UI, type Meter } from '../../../ui'
import { pressLabel } from '../state'
import { BOX_W, INNER_W, PAD, type ForgeCtx, type Preview, type VerbAction, type VerbPanel } from '../types'
import { PanelBase } from './PanelBase'

export class RefinePanel extends PanelBase implements VerbPanel {
  private it!: Item
  private head!: Phaser.GameObjects.Text
  private rateT!: Phaser.GameObjects.Text
  private bar!: Meter
  private legend!: Phaser.GameObjects.Text
  private info!: Phaser.GameObjects.Text
  private lines!: Phaser.GameObjects.Text
  private dead = false
  constructor(private ctx: ForgeCtx) { super() }

  mount(box: Phaser.GameObjects.Container, it: Item) {
    this.it = it
    const sc = this.ctx.scene
    this.head = txt(sc, PAD, 12, '', 18, UI.text, true)
    this.rateT = txt(sc, BOX_W - PAD, 12, '', 18, UI.gold, true).setOrigin(1, 0)
    this.bar = meter(sc, PAD, 46, INNER_W, 18)
    this.legend = txt(sc, PAD, 72, '', 12, UI.sub).setWordWrapWidth(INNER_W)
    this.info = txt(sc, PAD, 130, '', 12, UI.text).setWordWrapWidth(INNER_W).setLineSpacing(3)
    this.lines = txt(sc, PAD, 232, '', 12, '#d9c2ff').setWordWrapWidth(INNER_W)
    this.put(box, this.head, this.rateT, this.bar, this.legend, this.info, this.lines)
    this.refresh()
  }

  refresh() {
    const s = save(), it = this.it, r = refineOf(s, it.id), lines = linesOf(s, it.id)
    this.lines.setText(`🎁 ค่าพิเศษ\n${REFINE.lineAt.map((at, i) => `+${at} ${lines[i] ? lineText(lines[i]) : '—'}`).join('\n')}`)
    fit(this.lines, 70)
    if (r >= REFINE.max) {
      this.head.setText('✓ +10 สูงสุดแล้ว ✨')
      this.rateT.setText('')
      this.bar.setParts([{ v: 1, color: 0x6fd08c }])
      this.legend.setText('')
      this.info.setText('ตีบวกถึงสุดแล้ว ไปสุ่มค่าพิเศษหรือใส่คำสาปต่อได้ค่ะ')
      return
    }
    const p = rateParts(s, it), n = p.n
    this.head.setText(`ตีบวก +${r} → +${n}`)
    this.rateT.setText(`${Math.round(p.rate * 100)}%`)
    this.bar.setParts([{ v: p.base, color: 0xf2b84b }, { v: p.pity, color: 0x6fd08c }, ...(p.ghost > 0 ? [{ v: p.ghost, color: 0xff9f5a, ghost: true }] : [])])
    const pct = (v: number) => `${Math.round(v * 100)}%`
    this.legend.setText(
      p.base >= 1 ? 'ถึง +4 ตีไม่พลาด'
        : p.rate >= 1 ? `pity เต็มแล้ว (พลาดติดกัน ${p.fails} ครั้ง): ครั้งนี้ไม่พลาดแน่`
          : `พื้นฐาน ${pct(p.base)}${p.pity > 0 ? ` + pity ${pct(p.pity)} (พลาดติดกัน ${p.fails} ครั้ง)` : ''}${p.ghost > 0 ? ` · ถ้าครั้งนี้พลาด ครั้งหน้า +${pct(p.ghost)} (แถบจาง)` : ''}`)
    fit(this.legend, 52)
    // good news first (a new line / free gems are why you press), then the risk
    const gift = REFINE.lineAt.includes(n) && !lines[REFINE.lineAt.indexOf(n)]
    this.info.setText([
      [gift ? `🎁 ถึง +${n} ครั้งแรกได้ค่าพิเศษ 1 บรรทัด` : '', REFINE.gemsAt[n] ? `💎 ฉลอง +${n} ครั้งแรกต่อชิ้น ได้เพชร ${REFINE.gemsAt[n]}` : ''].filter(Boolean).join(' · '), // one line, so the risk line below is never cut
      p.base < 1 ? 'พลาดแล้วของแตก: บวก ขั้น การ์ด ค่าพิเศษ ยังอยู่ครบ แค่ไม่ให้ค่าพลังจนกว่าจะซ่อม' : 'ตีได้เลย ไม่มีพัง',
    ].filter(Boolean).join('\n'))
    fit(this.info, 94)
  }

  private n() { return refineOf(save(), this.it.id) + 1 }

  cost() { return refineOf(save(), this.it.id) >= REFINE.max ? null : refineCost(this.it, this.n()) }

  action(): VerbAction | null {
    const s = save(), r = refineOf(s, this.it.id)
    if (r >= REFINE.max) return { label: '✓ สูงสุดแล้ว', enabled: false }
    const n = r + 1, cost = refineCost(this.it, n), rate = nextRate(s, this.it)
    return { label: pressLabel(`ตี +${n} (${Math.round(rate * 100)}%)`, s, cost), enabled: canAffordAuto(s, cost), fill: rate < 1 ? 0xff9f5a : undefined }
  }

  /** The item at +N (the stage diffs it against now). */
  preview(): Preview | null {
    const s = save(), it = this.it, r = refineOf(s, it.id)
    if (r >= REFINE.max) return null
    return { label: `+${r + 1}`, next: forged({ ...s, refine: { ...s.refine, [it.id]: r + 1 } }, it), color: '#f2d48a' }
  }

  /** When the press buys fodder, one confirm lists everything it takes. Never charge silently (kept from the old screen). */
  act() {
    const s = save(), it = this.it, n = this.n(), cost = refineCost(it, n), f = fodderToBuy(s, cost)
    if (!f) return this.go(false)
    const total = totalZeny(s, cost)
    confirm(this.ctx.scene, `ตี ${it.name} +${n}?`, `ไม่มีเชื้อหลอม ซื้อให้อัตโนมัติ:\n🔩 ${f.icon} ${f.name} ${f.price}z + ค่าตี ${cost.zeny}z\nรวม ${total}z · เหลือ ${s.zeny - total}z · สำเร็จ ${Math.round(nextRate(s, it) * 100)}%`, `ซื้อ+ตี ${total}z`, () => this.go(true))
  }

  destroy() { this.dead = true; super.destroy() }

  /** Result is saved first; then the same hammer taps play for a hit or a miss (no tell), then the outcome and the refresh. */
  private async go(autoBuy: boolean) {
    const s = save(), it = this.it, rate = Math.round(nextRate(s, it) * 100)
    const res = tryRefine(s, it, Math.random, autoBuy)
    if (!res.ok) { toast(this.ctx.scene, res.why === 'short' ? 'วัตถุดิบ เชื้อหลอม หรือ zeny ยังไม่พอค่ะ' : 'ตีชิ้นนี้ต่อไม่ได้ค่ะ', UI.red); this.ctx.changed(); return }
    persist()
    const release = this.ctx.hold() // the confirm path calls go() later, outside the shell's press() guard
    try { await this.ctx.fx.anticipate(!res.success || res.n >= 5 ? 3 : 1) } finally { release() }
    if (this.dead) return
    this.ctx.busy(600) // a tap that skipped the hammer taps must not land on the action button as a second paid press
    if (res.success) {
      const notes = [res.line ? `ค่าพิเศษ ${lineText(res.line)}` : '', res.gems ? `💎+${res.gems}` : ''].filter(Boolean)
      this.ctx.fx.success(`+${res.n}`, notes, res.n <= 4 ? 'light' : res.n === 7 || res.n === 10 ? 'epic' : 'heavy')
      this.ctx.say(notes.length ? `+${res.n} สำเร็จ! ${notes.join(' · ')}` : `+${res.n} สำเร็จ! ตีต่อเลยไหม`)
    } else {
      this.ctx.fx.fail('💥 แตก!')
      this.ctx.say(`พลาดแล้ว (โอกาส ${rate}%) ของแตกแต่ของในตัวยังอยู่ครบ ซ่อมได้ · ครั้งหน้าโอกาส +${Math.round(REFINE.pity * 100)}%`)
    }
    this.ctx.changed()
  }
}
