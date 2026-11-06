import Phaser from 'phaser'
import { isBroken, itemById, type Item } from '../../data/meta'
import { save } from '../../save'
import { button, costStrip, fit, go, holdButton, iconTabs, panel, tabs, topBar, txt, UI, type Btn, type CostStrip, type HoldBtn, type IconTabs } from '../../ui'
import { AnvilStage } from './AnvilStage'
import { ItemRail, railBackdrop } from './ItemRail'
import { LegacyForge } from './legacy'
import { defaultVerb, slotOf, slotVerb, SLOT_COUNT, smithLine, verbForPick, verbLock, VERB_TAB } from './state'
import type { ForgeCtx, Mode, Verb, VerbPanel } from './types'
import { GradePanel } from './verbs/GradePanel'
import { OptionPanel } from './verbs/OptionPanel'
import { RefinePanel } from './verbs/RefinePanel'
import { RepairPanel } from './verbs/RepairPanel'
import { TaintPanel } from './verbs/TaintPanel'

// Forge, "anvil" layout (design/forge-ux-v1.md): pick an item on the rail, it sits on the anvil, every verb works on it.
// Money rules are unchanged from the card layout (design/item-acquisition-v1.md): gems only repair / lock option lines / skip tower floors.
// Shell only: state { mode, itemId, verb }, the busy lock, the smith's bubble, and wiring. All rules are in src/data/*.
const RAIL_X = 16, RAIL_Y = 112, RAIL_W = 256, RAIL_H = 450
const STAGE_X = 288, STAGE_Y = 112
const VERB_Y = 296, BOX_Y = 336, BOX_W = 656, BOX_H = 130
const STRIP_Y = 480, ACT_X = STAGE_X + BOX_W - 150, ACT_Y = 522
const BUSY_MS = 500 // after a press (and after the verb auto-switches) the action button and the verb tabs ignore taps for this long

export class ForgeScene extends Phaser.Scene {
  private mode: Mode = 'anvil'
  private itemId?: string
  private verb: Verb = 'refine'
  private railView = { mineOnly: true, page: 0 }
  private stashTab: 'fodder' | 'mats' = 'fodder'
  private busyUntil = 0
  private holds = 0
  private optLocks = new Map<string, number[]>()
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
  private holdBtn?: HoldBtn
  private holdMs = 0
  private ctx!: ForgeCtx

  constructor() { super('forge') }

  create() {
    // Scene instances are reused by Phaser: reset everything that survives between visits.
    this.mode = 'anvil'; this.itemId = undefined; this.verb = 'refine'; this.stashTab = 'fodder'; this.railView = { mineOnly: true, page: 0 }
    this.busyUntil = 0; this.holds = 0; this.optLocks = new Map()
    this.modeObjs = []; this.rail = undefined; this.stage = undefined; this.verbTabs = undefined; this.box = undefined; this.panel = undefined; this.strip = undefined; this.actBtn = undefined; this.holdBtn = undefined; this.holdMs = 0
    this.cameras.main.setBackgroundColor(UI.night)
    this.cameras.main.fadeIn(160, 20, 23, 43)
    this.refreshWallet = topBar(this, '🔨 โรงตีเหล็ก', () => go(this, 'hub'))
    this.legacy = new LegacyForge(this, { wallet: () => this.refreshWallet(), changed: () => this.changed() })
    this.bubble = txt(this, 520, 62, '', 13, UI.sub).setWordWrapWidth(424)
    this.ctx = {
      scene: this,
      fx: { success: (l, n) => this.stage?.success(l, n), fail: (l) => this.stage?.fail(l), mend: () => this.stage?.mend(), shine: (l) => this.stage?.shine(l) },
      taintUi: { ask: (it) => this.legacy.askTaint(it), note: (it) => this.legacy.taintNote(it) },
      legacyLines: (it) => this.legacy.linesView(it),
      changed: () => this.changed(),
      say: (t) => this.say(t),
      busy: (ms) => this.lockFor(ms),
      isBusy: () => this.isBusy(),
      hold: () => this.holdLock(),
      jump: (v) => { const it = this.item(); if (it && !verbLock(save(), it, v)) this.setVerb(v) },
      locks: { get: (id) => this.optLocks.get(id) ?? [], set: (id, idx) => { this.optLocks.set(id, idx) } },
    }
    tabs(this, 24, 80, ['⚒️ ทั่ง', '📜 สูตร', '🎒 คลัง'], 150, (i) => this.setMode((['anvil', 'recipe', 'stash'] as Mode[])[i]), 0)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.panel?.destroy(); this.panel = undefined; this.legacy.clear(); this.holds = 0; this.busyUntil = 0 })
  }

  private say(text: string) {
    this.bubble.setText(`ช่างตีเหล็ก: "${text}"`)
    fit(this.bubble, 40) // two lines of 13px
  }

  // ---------- busy lock (anti double-tap, and the option reveal) ----------
  private isBusy() { return this.holds > 0 || this.time.now < this.busyUntil }

  private lockFor(ms: number) {
    this.busyUntil = Math.max(this.busyUntil, this.time.now + ms)
    this.syncBottom()
    this.time.delayedCall(ms + 30, () => this.syncBottom()) // re-enable the button once the lock is over
  }

  private holdLock() {
    this.holds++
    this.syncBottom()
    let done = false
    return () => { if (done) return; done = true; this.holds = Math.max(0, this.holds - 1); this.syncBottom() }
  }

  // ---------- modes ----------
  private clearMode() {
    if (this.rail) this.railView = this.rail.view // keep the filter and page across modes
    this.panel?.destroy(); this.panel = undefined
    this.box?.destroy(); this.box = undefined
    this.legacy.clear()
    for (const o of this.modeObjs) o.destroy()
    this.modeObjs = []
    this.rail = undefined; this.stage = undefined; this.verbTabs = undefined; this.strip = undefined; this.actBtn = undefined; this.holdBtn = undefined; this.holdMs = 0
    this.holds = 0
  }

  private setMode(m: Mode) {
    this.clearMode()
    this.mode = m
    this.refreshWallet()
    if (m === 'anvil') { this.buildAnvil(); return }
    if (m === 'recipe') { this.say('สูตรตีของจากวัตถุดิบดัน · ตีเสร็จแล้วอัปขั้น/ตีบวกที่ ⚒️ ทั่ง'); this.legacy.show('craft'); return }
    this.say('เชื้อหลอมกับวัตถุดิบเก็บไว้ที่นี่ ไม่หายแม้แพ้')
    const t = tabs(this, 24, 128, ['🔩 เชื้อ', '🧱 วัตถุดิบ'], 116, (i) => { this.stashTab = i === 0 ? 'fodder' : 'mats'; this.legacy.show(this.stashTab) }, this.stashTab === 'fodder' ? 0 : 1)
    this.modeObjs.push(...t)
  }

  // ---------- anvil ----------
  private buildAnvil() {
    this.modeObjs.push(railBackdrop(this, RAIL_X, RAIL_Y, RAIL_W, RAIL_H))
    this.rail = new ItemRail(this, RAIL_X, RAIL_Y + 6, RAIL_W, (id) => { if (!this.isBusy()) this.pick(id) }, this.railView)
    this.modeObjs.push(this.rail.container)
    this.stage = new AnvilStage(this, STAGE_X, STAGE_Y, (it) => this.legacy.taintNote(it))
    this.modeObjs.push(this.stage.container)
    const slots = Array.from({ length: SLOT_COUNT }, (_, i) => VERB_TAB[slotVerb(i, false)])
    this.verbTabs = iconTabs(this, STAGE_X, VERB_Y, slots, (i) => { const it = this.item(); if (it) this.setVerb(slotVerb(i, isBroken(save(), it.id))) }, { w: 110, h: 56, start: -1, gate: () => !this.isBusy() })
    this.modeObjs.push(this.verbTabs)
    this.strip = costStrip(this, STAGE_X, STRIP_Y, 360)
    this.modeObjs.push(this.strip)
    this.actBtn = button(this, ACT_X, ACT_Y, 280, 48, '', () => this.press(), { size: 17 })
    this.modeObjs.push(this.actBtn)
    const first = (this.itemId && this.rail.items().find((it) => it.id === this.itemId)) || this.rail.items()[0]
    this.pick(first?.id, true)
  }

  private item(): Item | undefined { return this.itemId ? itemById(this.itemId) : undefined }

  /** The primary button. Every press closes the lock for BUSY_MS (and until a returned promise settles), so a double-tap can't chain two verbs. */
  private press() {
    if (this.isBusy() || !this.panel) return
    this.lockFor(BUSY_MS)
    const r = this.panel.act()
    if (r instanceof Promise) { const rel = this.holdLock(); r.then(rel, rel) }
  }

  /** A new item on the anvil. The verb stays the same across items (spec 3.3) unless it is closed for the new one or the new one is broken. */
  private pick(id: string | undefined, first = false) {
    if (!first && id !== this.itemId) this.optLocks.clear() // option locks live as long as the item is on the anvil
    this.itemId = id || undefined
    this.rail?.select(this.itemId)
    const it = this.item(), s = save()
    this.stage?.setItem(it)
    this.syncTabs()
    if (!it) {
      this.panel?.destroy(); this.panel = undefined; this.box?.destroy(); this.box = undefined
      this.say('ยังไม่มีของให้ตีค่ะ ซื้อของที่ร้านหรือตีของที่แท็บ 📜 สูตรก่อนนะ')
      this.syncBottom()
      return
    }
    this.setVerb(verbForPick(s, it, this.verb), true)
  }

  /** Tab slots: 🔧 replaces ⚒️ while broken; every tab shows its lock reason; with no item nothing is active. */
  private syncTabs() {
    const it = this.item(), s = save(), broken = !!it && isBroken(s, it.id)
    for (let i = 0; i < SLOT_COUNT; i++) {
      const v = slotVerb(i, broken)
      this.verbTabs?.setSlot(i, VERB_TAB[v]).setLocked(i, it ? verbLock(s, it, v) : 'เลือกของก่อนนะคะ')
    }
    if (!it) this.verbTabs?.setTab(-1)
  }

  /** Switch verb: new panel in a fresh box. Locked verbs refuse. */
  private setVerb(v: Verb, force = false, speak = true) {
    const it = this.item(), s = save()
    if (!it) return
    if (!force && v === this.verb && this.panel) return
    if (verbLock(s, it, v)) return
    this.verb = v
    this.syncTabs()
    this.verbTabs?.setTab(slotOf(v))
    this.panel?.destroy()
    this.box?.destroy()
    this.box = this.add.container(STAGE_X, BOX_Y, [panel(this, 0, 0, BOX_W, BOX_H)])
    this.panel = this.makePanel(v)
    this.panel.mount(this.box, it)
    if (speak) this.say(smithLine(s, it, v)) // not after an outcome: the smith is still commenting on it
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

  private ensureHold(ms: number) {
    if (this.holdBtn && this.holdMs === ms) return this.holdBtn
    if (this.holdBtn) { const old = this.holdBtn; this.modeObjs = this.modeObjs.filter((o) => o !== old); old.destroy() }
    this.holdBtn = holdButton(this, ACT_X, ACT_Y, 280, 48, '', ms, () => this.press(), { size: 17 })
    this.holdMs = ms
    this.modeObjs.push(this.holdBtn)
    return this.holdBtn
  }

  /** Cost strip + primary button + stage preview from the current panel (in place). */
  private syncBottom() {
    const s = save(), p = this.panel, a = p?.action() ?? null, busy = this.isBusy()
    this.strip?.setCost(p?.cost() ?? null, s)
    this.actBtn?.setVisible(!!a && !a.hold)
    if (a && !a.hold) this.actBtn?.setLabel(a.label).setEnabled(a.enabled && !busy).setFill(a.fill ?? 0xf2b84b)
    if (a?.hold && this.mode === 'anvil') this.ensureHold(a.hold).setVisible(true).setLabel(a.label).setEnabled(a.enabled && !busy).setFill(a.fill ?? 0x8a4fd0)
    else this.holdBtn?.setVisible(false)
    this.stage?.setPreview(p?.preview() ?? null)
  }

  /** The save changed: refresh everything in place. Rebuilds only when the item has to land on a different verb. */
  private changed() {
    this.refreshWallet()
    if (this.mode !== 'anvil') { this.legacy.show(this.mode === 'recipe' ? 'craft' : this.stashTab); return }
    const it = this.item(), s = save()
    this.rail?.refresh()
    this.stage?.refresh()
    this.syncTabs()
    if (it && verbLock(s, it, this.verb)) { // e.g. it just broke -> repair. The lock stops a second tap from landing on the NEW verb.
      this.lockFor(BUSY_MS)
      this.setVerb(defaultVerb(s, it), true, false)
      return
    }
    this.verbTabs?.setTab(it ? slotOf(this.verb) : -1)
    this.panel?.refresh()
    this.syncBottom()
  }
}
