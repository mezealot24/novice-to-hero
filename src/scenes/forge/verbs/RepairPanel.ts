// 🔧 Repair a broken item. Materials (fodder + 2 common mats + half fee) are the main button; gems are the only other way (design 3.6).
// Pity is kept through a break, and the panel says so.
import Phaser from 'phaser'
import { REFINE } from '../../../data/craft'
import { isBroken, refineOf, type Item } from '../../../data/meta'
import { canAfford, canAffordAuto, fodderToBuy, gemRepairCost, repair, repairCost, totalZeny, zenyShort } from '../../../data/refine'
import { persist, save } from '../../../save'
import { button, confirm, toast, txt, UI, type Btn } from '../../../ui'
import type { ForgeCtx, Preview, VerbAction, VerbPanel } from '../types'

export class RepairPanel implements VerbPanel {
  private it!: Item
  private head!: Phaser.GameObjects.Text
  private info!: Phaser.GameObjects.Text
  private gemBtn!: Btn
  constructor(private ctx: ForgeCtx) {}

  mount(box: Phaser.GameObjects.Container, it: Item) {
    this.it = it
    const sc = this.ctx.scene
    this.head = txt(sc, 16, 10, '', 18, UI.text, true)
    this.info = txt(sc, 16, 44, '', 13, UI.sub).setWordWrapWidth(624)
    this.gemBtn = button(sc, 640 - 110, 100, 220, 36, `💎${REFINE.repairGems} ซ่อมด้วยเพชร`, () => this.go(true, false), { size: 14, fill: 0x5a5f8a, color: UI.text })
    box.add([this.head, this.info, this.gemBtn])
    this.refresh()
  }

  refresh() {
    const s = save(), it = this.it, broken = isBroken(s, it.id), pity = s.refinePity?.[it.id] ?? 0
    this.head.setText(broken ? `💔 ${it.name} แตกอยู่` : `✓ ${it.name} ปกติดี`)
    this.info.setText(broken
      ? `ซ่อมแล้วใช้ได้เต็มที่ทันที · บวก (+${refineOf(s, it.id)}) ขั้น การ์ด ค่าพิเศษ ยังอยู่ครบ\n${pity ? `pity เก็บไว้ให้: ครั้งหน้าตีบวกโอกาส +${Math.round(pity * REFINE.pity * 100)}%` : ''}\nวัสดุถูกกว่าเพชรเสมอ · เพชรเป็นทางลัดเท่านั้น`
      : 'ของชิ้นนี้ยังไม่แตก ไม่ต้องซ่อมค่ะ')
    this.gemBtn.setVisible(broken).setEnabled(broken && canAfford(s, gemRepairCost))
  }

  cost() { const s = save(); return isBroken(s, this.it.id) ? repairCost(this.it, refineOf(s, this.it.id)) : null }

  action(): VerbAction | null {
    const s = save(), it = this.it
    if (!isBroken(s, it.id)) return { label: 'ไม่ต้องซ่อม', enabled: false }
    const c = repairCost(it, refineOf(s, it.id)), ok = canAffordAuto(s, c), short = zenyShort(s, c)
    return { label: ok || !short ? `🔧 ซ่อม · ${totalZeny(s, c)}z` : `🔧 ซ่อม · ขาด ${short}z`, enabled: ok }
  }

  preview(): Preview | null { return null }

  act() { this.go(false, false) }

  private go(gems: boolean, autoBuy: boolean) {
    const s = save(), it = this.it
    if (!gems && !autoBuy) {
      const cost = repairCost(it, refineOf(s, it.id)), f = fodderToBuy(s, cost)
      if (f) {
        const total = totalZeny(s, cost)
        confirm(this.ctx.scene, `ซ่อม ${it.name}?`, `ไม่มีเชื้อหลอม ซื้อให้อัตโนมัติ:\n🔩 ${f.icon} ${f.name} ${f.price}z${cost.zeny ? ` + ค่าซ่อม ${cost.zeny}z` : ''}\nรวม ${total}z · เหลือ ${s.zeny - total}z`, `ซื้อ+ซ่อม ${total}z`, () => this.go(false, true))
        return
      }
    }
    if (!repair(s, it, gems, autoBuy)) { toast(this.ctx.scene, gems ? 'เพชรไม่พอค่ะ' : 'เชื้อหลอมหรือวัตถุดิบยังไม่พอค่ะ', UI.red); return }
    persist()
    this.ctx.fx.mend()
    this.ctx.say('ซ่อมเรียบร้อย กลับมาใช้ได้เต็มที่ค่ะ')
    this.ctx.changed()
  }

  destroy() { /* nothing outlives the box */ }
}
