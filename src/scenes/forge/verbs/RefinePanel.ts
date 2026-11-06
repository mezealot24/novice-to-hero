// ⚒️ Refine +1..+10. Rules: tryRefine / refineCheck / rateParts / refineCost / canAffordAuto / fodderToBuy (data/refine.ts).
// Shows the chance as a stacked meter: base + pity + a ghost "+10% if this one fails". A fail shows on the stage, no popup (Q 2026-11-07).
import type Phaser from 'phaser'
import { REFINE } from '../../../data/craft'
import { linesOf, refineOf, type Item } from '../../../data/meta'
import { canAffordAuto, fodderToBuy, lineText, nextRate, rateParts, refineCost, totalZeny, tryRefine } from '../../../data/refine'
import { persist, save } from '../../../save'
import { confirm, fit, meter, toast, txt, UI, type Meter } from '../../../ui'
import { pressLabel, statSplit } from '../state'
import type { ForgeCtx, Preview, VerbAction, VerbPanel } from '../types'
import { PanelBase } from './PanelBase'

export class RefinePanel extends PanelBase implements VerbPanel {
  private it!: Item
  private head!: Phaser.GameObjects.Text
  private rateT!: Phaser.GameObjects.Text
  private bar!: Meter
  private legend!: Phaser.GameObjects.Text
  private info!: Phaser.GameObjects.Text
  private lines!: Phaser.GameObjects.Text
  constructor(private ctx: ForgeCtx) { super() }

  mount(box: Phaser.GameObjects.Container, it: Item) {
    this.it = it
    const sc = this.ctx.scene
    this.head = txt(sc, 16, 6, '', 18, UI.text, true)
    this.rateT = txt(sc, 640, 6, '', 18, UI.gold, true).setOrigin(1, 0)
    this.bar = meter(sc, 16, 34, 624, 16)
    this.legend = txt(sc, 16, 54, '', 12, UI.sub).setWordWrapWidth(624)
    this.info = txt(sc, 16, 74, '', 12, UI.text).setWordWrapWidth(624)
    this.lines = txt(sc, 16, 112, '', 12, '#d9c2ff').setWordWrapWidth(624)
    this.put(box, this.head, this.rateT, this.bar, this.legend, this.info, this.lines)
    this.refresh()
  }

  refresh() {
    const s = save(), it = this.it, r = refineOf(s, it.id), lines = linesOf(s, it.id)
    this.lines.setText(`🎁 ${REFINE.lineAt.map((at, i) => `+${at} ${lines[i] ? lineText(lines[i]) : '—'}`).join(' · ')}`)
    fit(this.lines, 17)
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
    this.rateT.setText(`สำเร็จ ${Math.round(p.rate * 100)}%`)
    this.bar.setParts([{ v: p.base, color: 0xf2b84b }, { v: p.pity, color: 0x6fd08c }, ...(p.ghost > 0 ? [{ v: p.ghost, color: 0xff9f5a, ghost: true }] : [])])
    const pct = (v: number) => `${Math.round(v * 100)}%`
    this.legend.setText(
      p.base >= 1 ? 'ถึง +4 ตีไม่พลาด'
        : p.rate >= 1 ? `pity เต็มแล้ว (พลาดติดกัน ${p.fails} ครั้ง): ครั้งนี้ไม่พลาดแน่`
          : `พื้นฐาน ${pct(p.base)}${p.pity > 0 ? ` + pity ${pct(p.pity)} (พลาดติดกัน ${p.fails} ครั้ง)` : ''}${p.ghost > 0 ? ` · ถ้าครั้งนี้พลาด ครั้งหน้า +${pct(p.ghost)} (แถบจาง)` : ''}`)
    fit(this.legend, 17)
    // good news first (a new line / free gems are why you press), then the risk
    const gift = REFINE.lineAt.includes(n) && !lines[REFINE.lineAt.indexOf(n)]
    this.info.setText([
      gift ? `🎁 ถึง +${n} ครั้งแรกได้ค่าพิเศษ 1 บรรทัด` : '',
      REFINE.gemsAt[n] ? `💎 ฉลอง +${n} ครั้งแรกต่อชิ้น ได้เพชร ${REFINE.gemsAt[n]}` : '',
      p.base < 1 ? 'พลาดแล้วของแตก: บวก ขั้น การ์ด ค่าพิเศษ ยังอยู่ครบ แค่ไม่ให้ค่าพลังจนกว่าจะซ่อม' : 'ตีได้เลย ไม่มีพัง',
    ].filter(Boolean).join('\n'))
    fit(this.info, 36)
  }

  private n() { return refineOf(save(), this.it.id) + 1 }

  cost() { return refineOf(save(), this.it.id) >= REFINE.max ? null : refineCost(this.it, this.n()) }

  action(): VerbAction | null {
    const s = save(), r = refineOf(s, this.it.id)
    if (r >= REFINE.max) return { label: '✓ สูงสุดแล้ว', enabled: false }
    const n = r + 1, cost = refineCost(this.it, n), rate = nextRate(s, this.it)
    return { label: pressLabel(`ตี +${n} (${Math.round(rate * 100)}%)`, s, cost), enabled: canAffordAuto(s, cost), fill: rate < 1 ? 0xff9f5a : undefined }
  }

  /** "+4: before  →  +5: after" so the gain is visible at a glance. */
  preview(): Preview | null {
    const s = save(), it = this.it, r = refineOf(s, it.id)
    if (r >= REFINE.max) return null
    const before = statSplit(s, it).good || it.desc
    const sp = statSplit({ ...s, refine: { ...s.refine, [it.id]: r + 1 } }, it)
    return { text: `+${r}: ${before}  →  +${r + 1}: ${sp.good}${sp.curse ? ` · 💀 ${sp.curse}` : ''}`, color: '#f2d48a' }
  }

  /** When the press buys fodder, one confirm lists everything it takes. Never charge silently (kept from the old screen). */
  act() {
    const s = save(), it = this.it, n = this.n(), cost = refineCost(it, n), f = fodderToBuy(s, cost)
    if (!f) { this.go(false); return }
    const total = totalZeny(s, cost)
    confirm(this.ctx.scene, `ตี ${it.name} +${n}?`, `ไม่มีเชื้อหลอม ซื้อให้อัตโนมัติ:\n🔩 ${f.icon} ${f.name} ${f.price}z + ค่าตี ${cost.zeny}z\nรวม ${total}z · เหลือ ${s.zeny - total}z · สำเร็จ ${Math.round(nextRate(s, it) * 100)}%`, `ซื้อ+ตี ${total}z`, () => this.go(true))
  }

  private go(autoBuy: boolean) {
    const s = save(), it = this.it, rate = Math.round(nextRate(s, it) * 100)
    const res = tryRefine(s, it, Math.random, autoBuy)
    if (!res.ok) { toast(this.ctx.scene, res.why === 'short' ? 'วัตถุดิบ เชื้อหลอม หรือ zeny ยังไม่พอค่ะ' : 'ตีชิ้นนี้ต่อไม่ได้ค่ะ', UI.red); this.ctx.changed(); return }
    persist()
    this.ctx.busy(600) // the confirm path calls go() later, outside the shell's act() guard
    if (res.success) {
      const notes = [res.line ? `ค่าพิเศษ ${lineText(res.line)}` : '', res.gems ? `💎+${res.gems}` : ''].filter(Boolean)
      this.ctx.fx.success(`+${res.n}`, notes)
      this.ctx.say(notes.length ? `+${res.n} สำเร็จ! ${notes.join(' · ')}` : `+${res.n} สำเร็จ! ตีต่อเลยไหม`)
    } else {
      this.ctx.fx.fail('💥 แตก!')
      this.ctx.say(`พลาดแล้ว (โอกาส ${rate}%) ของแตกแต่ของในตัวยังอยู่ครบ ซ่อมได้ · ครั้งหน้าโอกาส +${Math.round(REFINE.pity * 100)}%`)
    }
    this.ctx.changed()
  }
}
