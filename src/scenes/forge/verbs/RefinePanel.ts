// ⚒️ Refine +1..+10. Rules: tryRefine / nextRate / refineCost / canAffordAuto / fodderToBuy (data/refine.ts).
// Shows the chance as a stacked meter: base + pity + a ghost "+10% if this one fails". A fail shows on the stage, no popup (Q 2026-11-07).
import Phaser from 'phaser'
import { REFINE, forgeItem } from '../../../data/craft'
import { gradeOf, linesOf, refineOf, splitStatLine, type Item } from '../../../data/meta'
import { canAffordAuto, fodderToBuy, lineText, nextRate, refineCost, totalZeny, tryRefine, zenyShort } from '../../../data/refine'
import { persist, save } from '../../../save'
import { confirm, meter, toast, txt, UI, type Meter } from '../../../ui'
import { fit } from '../legacy'
import type { ForgeCtx, Preview, VerbAction, VerbPanel } from '../types'

export class RefinePanel implements VerbPanel {
  private it!: Item
  private head!: Phaser.GameObjects.Text
  private rateT!: Phaser.GameObjects.Text
  private bar!: Meter
  private legend!: Phaser.GameObjects.Text
  private info!: Phaser.GameObjects.Text
  private lines!: Phaser.GameObjects.Text
  constructor(private ctx: ForgeCtx) {}

  mount(box: Phaser.GameObjects.Container, it: Item) {
    this.it = it
    const sc = this.ctx.scene
    this.head = txt(sc, 16, 10, '', 18, UI.text, true)
    this.rateT = txt(sc, 640, 10, '', 18, UI.gold, true).setOrigin(1, 0)
    this.bar = meter(sc, 16, 42, 624, 18)
    this.legend = txt(sc, 16, 64, '', 12, UI.sub).setWordWrapWidth(624)
    this.info = txt(sc, 16, 86, '', 12, UI.text).setWordWrapWidth(624)
    this.lines = txt(sc, 16, 108, '', 12, '#d9c2ff').setWordWrapWidth(624)
    box.add([this.head, this.rateT, this.bar, this.legend, this.info, this.lines])
    this.refresh()
  }

  refresh() {
    const s = save(), it = this.it, r = refineOf(s, it.id), pity = s.refinePity?.[it.id] ?? 0
    const lines = linesOf(s, it.id)
    this.lines.setText(`🎁 ${REFINE.lineAt.map((at, i) => `+${at} ${lines[i] ? lineText(lines[i]) : '—'}`).join(' · ')}`)
    fit(this.lines, 18)
    if (r >= REFINE.max) {
      this.head.setText('✓ +10 สูงสุดแล้ว ✨')
      this.rateT.setText('')
      this.bar.setParts([{ v: 1, color: 0x6fd08c }])
      this.legend.setText('')
      this.info.setText('ตีบวกถึงสุดแล้ว ไปสุ่มค่าพิเศษหรือใส่คำสาปต่อได้ค่ะ')
      return
    }
    const n = r + 1, base = REFINE.rate[n] ?? 0, rate = nextRate(s, it)
    const pityV = Math.min(1 - base, pity * REFINE.pity), ghost = Math.min(1 - base - pityV, REFINE.pity)
    this.head.setText(`ตีบวก +${r} → +${n}`)
    this.rateT.setText(`สำเร็จ ${Math.round(rate * 100)}%`)
    this.bar.setParts([{ v: base, color: 0xf2b84b }, { v: pityV, color: 0x6fd08c }, ...(rate < 1 ? [{ v: ghost, color: 0xff9f5a, ghost: true }] : [])])
    this.legend.setText(rate >= 1 ? 'ถึง +4 ตีไม่พลาด' : `พื้นฐาน ${Math.round(base * 100)}%${pityV > 0 ? ` + pity ${Math.round(pityV * 100)}% (พลาดติดกัน ${pity} ครั้ง)` : ''}${ghost > 0 ? ` · ถ้าครั้งนี้พลาด ครั้งหน้า +${Math.round(ghost * 100)}% (จางๆ)` : ''}`)
    const gift = REFINE.lineAt.includes(n) && !lines[REFINE.lineAt.indexOf(n)]
    this.info.setText(`${rate < 1 ? 'พลาดแล้วของแตก: บวก ขั้น การ์ด ค่าพิเศษ ยังอยู่ครบ แค่ไม่ให้ค่าพลังจนกว่าจะซ่อม (เพชรหรือวัสดุ)' : 'ตีได้เลย ไม่มีพัง'}${gift ? ' · 🎁 ถึง +' + n + ' ครั้งแรกได้ค่าพิเศษ 1 บรรทัด' : ''}${REFINE.gemsAt[n] ? ` · 💎 ฉลอง +${n} ครั้งแรก` : ''}`)
    fit(this.info, 34)
  }

  private n() { return refineOf(save(), this.it.id) + 1 }

  cost() { return refineOf(save(), this.it.id) >= REFINE.max ? null : refineCost(this.it, this.n()) }

  action(): VerbAction | null {
    const s = save(), r = refineOf(s, this.it.id)
    if (r >= REFINE.max) return { label: '✓ สูงสุดแล้ว', enabled: false }
    const n = r + 1, cost = refineCost(this.it, n), rate = nextRate(s, this.it), ok = canAffordAuto(s, cost), short = zenyShort(s, cost)
    return { label: ok || !short ? `ตี +${n} · ${totalZeny(s, cost)}z · ${Math.round(rate * 100)}%` : `ตี +${n} · ขาด ${short}z`, enabled: ok, fill: rate < 1 ? 0xff9f5a : undefined }
  }

  preview(): Preview | null {
    const s = save(), it = this.it, r = refineOf(s, it.id)
    if (r >= REFINE.max) return null
    const sp = splitStatLine(forgeItem(it, gradeOf(s, it.id), r + 1, linesOf(s, it.id)))
    return { text: `→ +${r + 1}: ${sp.good}${sp.curse ? ` · 💀 ${sp.curse}` : ''}`, color: '#f2d48a' }
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

  destroy() { /* no timers of its own: fx live on the stage */ }
}
