import Phaser from 'phaser'
import { itemById } from '../../data/meta'
import type { Item } from '../../data/meta'
import { save } from '../../save'
import { button, costStrip, iconTabs, panel, tabs, topBar, txt, UI, go, type Btn, type CostStrip, type IconTabs } from '../../ui'
import { fit, LegacyForge } from './legacy'
import { AnvilStage } from './AnvilStage'
import { ItemRail, railBackdrop } from './ItemRail'
import { defaultVerb, verbLock, VERBS } from './state'
import type { ForgeCtx, Mode, Verb, VerbPanel } from './types'
import { GradePanel } from './verbs/GradePanel'
import { OptionPanel } from './verbs/OptionPanel'
import { RefinePanel } from './verbs/RefinePanel'
import { RepairPanel } from './verbs/RepairPanel'
import { TaintPanel } from './verbs/TaintPanel'

// Forge, "anvil" layout (design/forge-ux-v1.md): pick an item on the rail, it sits on the anvil, every verb works on it.
// Money rules are unchanged from the card layout (design/item-acquisition-v1.md): gems only repair / lock option lines / skip tower floors.
// Shell only: state { mode, itemId, verb }, the smith's bubble, and wiring. All rules are in src/data/*.
const RAIL_X = 16, RAIL_Y = 112, RAIL_W = 256, RAIL_H = 450
const STAGE_X = 288, STAGE_Y = 112
const VERB_Y = 296, BOX_Y = 336, BOX_W = 656, BOX_H = 130
const STRIP_Y = 480, ACT_X = STAGE_X + BOX_W - 150, ACT_Y = 522
const SMITH: Record<Verb, string> = {
  grade: 'อัปขั้นสำเร็จเสมอ ไม่มีพัง · แค่ต้องมีของครบนะ',
  refine: 'ตีเกิน +4 ลุ้นหน่อย แตกแล้วซ่อมได้ ของในตัวไม่หาย',
  repair: 'แตกก็ซ่อมได้ จ่ายวัสดุถูกกว่าเพชรเสมอ',
  option: 'ค่าพิเศษสุ่มได้ ล็อกบรรทัดที่ชอบไว้ด้วยเพชรก็ได้',
  taint: 'คำสาปลุ้นทีเดียวแล้วล็อกของ ทำหลังสุดนะ',
}

export class ForgeScene extends Phaser.Scene {
  private mode: Mode = 'anvil'
  private itemId?: string
  private verb: Verb = 'refine'
  private refreshWallet!: () => void
  private legacy!: LegacyForge
  private modeObjs: Phaser.GameObjects.GameObject[] = []
  private bubble!: Phaser.GameObjects.Text
  private rail?: ItemRail
  private stage?: AnvilStage
  private verbTabs?: IconTabs
  private box?: Phaser.GameObjects.Container
  private panel?: VerbPanel
  private strip?: CostStrip
  private actBtn?: Btn
  private ctx!: ForgeCtx
  private stashTab: 'fodder' | 'mats' = 'fodder'

  constructor() { super('forge') }

  create() {
    // Scene instances are reused by Phaser: reset everything that survives between visits.
    this.mode = 'anvil'; this.itemId = undefined; this.verb = 'refine'; this.stashTab = 'fodder'
    this.modeObjs = []; this.rail = undefined; this.stage = undefined; this.verbTabs = undefined; this.box = undefined; this.panel = undefined; this.strip = undefined; this.actBtn = undefined
    this.cameras.main.setBackgroundColor(UI.night)
    this.cameras.main.fadeIn(160, 20, 23, 43)
    this.refreshWallet = topBar(this, '🔨 โรงตีเหล็ก', () => go(this, 'hub'))
    this.legacy = new LegacyForge(this, { wallet: () => this.refreshWallet(), changed: () => this.changed() })
    this.bubble = txt(this, 520, 66, '', 13, UI.sub).setWordWrapWidth(424)
    this.ctx = { scene: this, fx: { success: (l, n) => this.stage?.success(l, n), fail: (l) => this.stage?.fail(l), mend: () => this.stage?.mend() }, legacy: this.legacy, changed: () => this.changed(), say: (t) => this.say(t) }
    tabs(this, 24, 84, ['⚒️ ทั่ง', '📜 สูตร', '🎒 คลัง'], 150, (i) => this.setMode((['anvil', 'recipe', 'stash'] as Mode[])[i]), 0)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.panel?.destroy(); this.panel = undefined; this.legacy.clear() })
  }

  private say(text: string) {
    this.bubble.setText(`ช่างตีเหล็ก: "${text}"`)
    fit(this.bubble, 34)
  }

  // ---------- modes ----------
  private clearMode() {
    this.panel?.destroy(); this.panel = undefined
    this.legacy.clear()
    for (const o of this.modeObjs) o.destroy()
    this.modeObjs = []
    this.rail = undefined; this.stage = undefined; this.verbTabs = undefined; this.box = undefined; this.strip = undefined; this.actBtn = undefined
  }

  private setMode(m: Mode) {
    this.clearMode()
    this.mode = m
    this.refreshWallet()
    if (m === 'anvil') { this.buildAnvil(); return }
    if (m === 'recipe') { this.say('สูตรตีของจากวัตถุดิบดัน · ตีเสร็จแล้วอัปขั้น/ตีบวกที่แท็บทั่ง'); this.legacy.show('craft'); return }
    this.say('เชื้อหลอมกับวัตถุดิบเก็บไว้ที่นี่ ไม่หายแม้แพ้')
    const t = tabs(this, 24, 118, ['🔩 เชื้อ', '🧱 วัตถุดิบ'], 116, (i) => { this.stashTab = i === 0 ? 'fodder' : 'mats'; this.legacy.show(this.stashTab) }, this.stashTab === 'fodder' ? 0 : 1)
    this.modeObjs.push(...t)
  }

  // ---------- anvil ----------
  private buildAnvil() {
    this.modeObjs.push(railBackdrop(this, RAIL_X, RAIL_Y, RAIL_W, RAIL_H))
    this.rail = new ItemRail(this, RAIL_X, RAIL_Y + 6, RAIL_W, (id) => this.pick(id))
    this.modeObjs.push(this.rail.container)
    this.stage = new AnvilStage(this, STAGE_X, STAGE_Y, (it) => this.legacy.taintNote(it))
    this.modeObjs.push(this.stage.container)
    this.verbTabs = iconTabs(this, STAGE_X, VERB_Y, VERBS.map((v) => ({ icon: v.icon, label: v.label })), (i) => this.setVerb(VERBS[i].id), { w: 96, h: 56, start: 0 })
    // iconTabs reports taps through onPick; the starting tab is set by setVerb below
    this.modeObjs.push(this.verbTabs)
    this.strip = costStrip(this, STAGE_X, STRIP_Y, 360)
    this.modeObjs.push(this.strip)
    this.actBtn = button(this, ACT_X, ACT_Y, 280, 48, '', () => this.panel?.act(), { size: 18 })
    this.modeObjs.push(this.actBtn)
    const first = (this.itemId && this.rail.items().find((it) => it.id === this.itemId)) || this.rail.items()[0]
    this.pick(first?.id)
    if (!first) this.say('ยังไม่มีของให้ตีค่ะ ซื้อของที่ร้านหรือตีของที่แท็บ 📜 สูตรก่อนนะ')
  }

  private item(): Item | undefined { return this.itemId ? itemById(this.itemId) : undefined }

  /** A new item on the anvil: land on the verb that matters for it (broken -> repair), rebuild the panel. */
  private pick(id: string | undefined) {
    this.itemId = id || undefined
    this.rail?.select(this.itemId)
    const it = this.item()
    this.stage?.setItem(it)
    this.syncLocks()
    if (it) this.setVerb(defaultVerb(save(), it), true)
    else { this.panel?.destroy(); this.panel = undefined; this.box?.destroy(); this.box = undefined; this.syncBottom() }
  }

  private syncLocks() {
    const it = this.item(), s = save()
    VERBS.forEach((v, i) => this.verbTabs?.setLocked(i, it ? verbLock(s, it, v.id) : 'เลือกของก่อนนะคะ'))
  }

  /** Switch verb: new panel in a fresh box. Locked verbs refuse (iconTabs toasts the reason). */
  private setVerb(v: Verb, force = false, speak = true) {
    const it = this.item(), s = save()
    if (!it) return
    if (!force && v === this.verb && this.panel) return
    if (verbLock(s, it, v)) return
    this.verb = v
    this.verbTabs?.setTab(VERBS.findIndex((x) => x.id === v))
    this.panel?.destroy()
    this.box?.destroy()
    this.box = this.add.container(STAGE_X, BOX_Y, [panel(this, 0, 0, BOX_W, BOX_H)])
    this.modeObjs.push(this.box)
    this.panel = this.makePanel(v)
    this.panel.mount(this.box, it)
    if (speak) this.say(SMITH[v]) // not after an outcome: the smith is still commenting on it
    this.syncBottom()
  }

  private makePanel(v: Verb): VerbPanel {
    switch (v) {
      case 'grade': return new GradePanel(this.ctx)
      case 'refine': return new RefinePanel(this.ctx)
      case 'repair': return new RepairPanel(this.ctx)
      case 'option': return new OptionPanel(this.ctx)
      case 'taint': return new TaintPanel(this.ctx)
    }
  }

  /** Cost strip + primary button + stage preview from the current panel (in place). */
  private syncBottom() {
    const s = save(), p = this.panel
    this.strip?.setCost(p?.cost() ?? null, s)
    const a = p?.action()
    this.actBtn?.setVisible(!!a)
    if (a) { this.actBtn?.setLabel(a.label).setEnabled(a.enabled).setFill(a.fill ?? 0xf2b84b) }
    this.stage?.setPreview(p?.preview() ?? null)
  }

  /** The save changed: refresh everything in place. Rebuilds only when the item has to land on a different verb. */
  private changed() {
    this.refreshWallet()
    if (this.mode !== 'anvil') { this.legacy.show(this.mode === 'recipe' ? 'craft' : this.stashTab); return }
    const it = this.item(), s = save()
    this.rail?.refresh()
    this.stage?.refresh()
    this.syncLocks()
    if (it && verbLock(s, it, this.verb)) { this.setVerb(defaultVerb(s, it), true, false); return } // e.g. just broke -> repair
    this.panel?.refresh()
    this.syncBottom()
  }
}

