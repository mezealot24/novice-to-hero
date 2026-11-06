// 🔧 Repair a broken item. Two equal buttons, materials first: the gem repair is only ever an option, never pushed (design 3.6).
// Pity is kept through a break, and the panel says so.
import type Phaser from 'phaser'
import { REFINE } from '../../../data/craft'
import { isBroken, refineOf, type Item } from '../../../data/meta'
import { canAfford, canAffordAuto, fodderToBuy, gemRepairCost, repair, repairCost, totalZeny } from '../../../data/refine'
import { persist, save } from '../../../save'
import { button, confirm, fit, toast, txt, UI, type Btn } from '../../../ui'
import { pressLabel } from '../state'
import type { ForgeCtx, Preview, VerbAction, VerbPanel } from '../types'
import { PanelBase } from './PanelBase'

export class RepairPanel extends PanelBase implements VerbPanel {
  private it!: Item
  private head!: Phaser.GameObjects.Text
  private info!: Phaser.GameObjects.Text
  private matBtn!: Btn
  private gemBtn!: Btn
  constructor(private ctx: ForgeCtx) { super() }

  mount(box: Phaser.GameObjects.Container, it: Item) {
    this.it = it
    const sc = this.ctx.scene
    this.head = txt(sc, 16, 8, '', 18, UI.text, true)
    this.info = txt(sc, 16, 36, '', 13, UI.sub).setWordWrapWidth(624)
    this.matBtn = button(sc, 16 + 150, 100, 300, 40, '', () => this.go(false, false), { size: 15 })
    this.gemBtn = button(sc, 656 - 16 - 150, 100, 300, 40, `💎${REFINE.repairGems} ซ่อมด้วยเพชร`, () => this.go(true, false), { size: 15, fill: 0x5a5f8a, color: UI.text })
    this.put(box, this.head, this.info, this.matBtn, this.gemBtn)
    this.refresh()
  }

  refresh() {
    const s = save(), it = this.it, broken = isBroken(s, it.id), pity = s.refinePity?.[it.id] ?? 0
    this.head.setText(broken ? `💔 ${it.name} แตกอยู่` : `✓ ${it.name} ปกติดี`)
    this.info.setText(broken
      ? `ซ่อมแล้วใช้ได้เต็มที่ทันที · บวก (+${refineOf(s, it.id)}) ขั้น การ์ด ค่าพิเศษ ยังอยู่ครบ\n${pity ? `pity เก็บไว้ให้: ครั้งหน้าตีบวกโอกาส +${Math.round(pity * REFINE.pity * 100)}%\n` : ''}ซ่อมด้วยวัสดุถูกกว่าเพชรเสมอ`
      : 'ของชิ้นนี้ยังไม่แตก ไม่ต้องซ่อมค่ะ')
    fit(this.info, 56)
    const c = repairCost(it, refineOf(s, it.id))
    this.matBtn.setLabel(broken ? pressLabel('🔧 ซ่อมด้วยวัสดุ', s, c) : '🔧 ซ่อมด้วยวัสดุ').setEnabled(broken && canAffordAuto(s, c))
    this.gemBtn.setEnabled(broken && canAfford(s, gemRepairCost))
  }

  cost() { const s = save(); return isBroken(s, this.it.id) ? repairCost(this.it, refineOf(s, this.it.id)) : null }
  action(): VerbAction | null { return null } // the two buttons live in the panel
  preview(): Preview | null { return null }
  act() { this.go(false, false) }

  private go(gems: boolean, autoBuy: boolean) {
    if (!autoBuy && this.ctx.isBusy()) return // a confirmed auto-buy is a second step of the same press
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
    this.ctx.busy(600) // stops a double-tap from repairing and then refining at once
    this.ctx.fx.mend()
    this.ctx.say('ซ่อมเรียบร้อย กลับมาใช้ได้เต็มที่ค่ะ')
    this.ctx.changed()
  }
}
