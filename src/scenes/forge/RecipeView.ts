// 📜 สูตร & ♻️ หลอม (design/forge-ux-v1.md): recipes (All / Class / Set) with slot badges, Set modal link, and Compare vs Equipped; Salvage lives in its own top tab.
import Phaser from 'phaser'
import { AWAKENED_CRAFT_ITEMS } from '../../data/awakened-craft'
import { DUNGEONS, H, W } from '../../data/game-data'
import { cardById, cardName } from '../../data/cards'
import { ALL_CARDFORGE_ITEMS, bagCards, canCardforge, cardforge, cardforgeCost, isCardforge } from '../../data/cardforge'
import { CRAFT_ITEMS, craftCost, forgeItem, GRADE, gradeStars } from '../../data/craft'
import { CLASS_GEAR } from '../../data/class-gear'
import { CLASS_CRAFT_ITEMS } from '../../data/class-craft'
import { describeItemEffects, itemConversionsOf, itemEffectsOf, type SaveExt } from '../../data/item-effects'
import { matById } from '../../data/materials'
import { canWearAs, forgeTag, gradeOf, itemById, ITEMS, itemStatLine, itemUnlocked, refineOf, REQ_TEXT, SLOTS, wearText, wornItems, type Item } from '../../data/meta'
import { salvage, salvageable, salvagePreview, type SalvageWhy } from '../../data/salvage'
import { setBonuses, type ItemSet } from '../../data/sets'
import { canPay, equip, isWorn, pay, persist, save } from '../../save'
import { sfx } from '../../sfx'
import { button, chip, confirm, costStrip, fit, holdButton, itemIcon, panel, toast, txt, UI } from '../../ui'
import { compareRows, dgIx, forgedWithAspect, HEAD_H, itemSetOf, itemSetsOf, setPages, setSpan, wornRival, type CmpRow, type Row } from './state'
import { matSource } from './stash'

export interface ViewHost { wallet(): void; say(text: string): void; changed(): void }
type Filter = 'all' | 'mine' | 'set'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'mine', label: '🎯 อาชีพ' },
  { id: 'set', label: '🧩 เซ็ต' },
]
const PER = 6, ROW_H = 52
const dgName = (id: string) => (id === 'rift' ? 'รอยแยกนิรันดร์' : DUNGEONS.find((d) => d.id === id)?.name ?? id)
const dgBoss = (id: string) => (id === 'rift' ? 'บอสรอยแยกนิรันดร์' : DUNGEONS.find((d) => d.id === id)?.boss ?? '')
const slotBadge = (it: Item) => {
  const sl = SLOTS.find((q) => q.id === it.slot)
  return sl ? `${sl.icon} ${sl.name}` : it.slot
}
const SALVAGE_WHY: Record<SalvageWhy, string> = { notOwned: 'ยังไม่มีชิ้นนี้', notCraft: 'ของร้านหลอมไม่ได้ (ขายได้ · ยกเว้นที่ติดคำสาป)', unique: '👑 ยูนีคหลอมไม่ได้', worn: 'ใส่อยู่ ถอดก่อนนะคะ', broken: '💔 แตกอยู่ ซ่อมก่อนนะคะ' }

export class RecipeView {
  private root?: Phaser.GameObjects.Container
  private modal?: Phaser.GameObjects.Container
  private filter: Filter = 'all'
  private salvageMode = false
  private page = 0
  private sel?: string
  constructor(private scene: Phaser.Scene, private host: ViewHost) {}

  /** The list for the current filter. Fixed order (dungeon, then catalogue), never by affordability, so rows don't jump. */
  private list(): Item[] {
    const s = save()
    if (this.salvageMode) return ITEMS.filter((it) => (it.craft || s.taint?.[it.id]) && s.owned.includes(it.id)).sort((a, b) => dgIx(a) - dgIx(b))
    const all = [...CRAFT_ITEMS, ...CLASS_GEAR, ...CLASS_CRAFT_ITEMS, ...AWAKENED_CRAFT_ITEMS, ...ALL_CARDFORGE_ITEMS].sort((a, b) => dgIx(a) - dgIx(b))
    if (this.filter === 'mine') return all.filter((it) => canWearAs(it, s))
    if (this.filter === 'set') return all.filter((it) => itemSetsOf(it).length > 0)
    return all
  }

  /** Pages of the left list: flat 6 per page, or (🧩 filter) grouped under set headers. */
  private pageRows(list: Item[]): Row[][] {
    if (this.filter === 'set' && !this.salvageMode) return setPages(list, itemSetsOf)
    const out: Row[][] = []
    for (let i = 0; i < list.length; i += PER) out.push(list.slice(i, i + PER).map((it) => ({ kind: 'item' as const, it })))
    return out
  }

  /** 🧩 filter: one set's header bar (name, dungeon span, owned count). Tap = set modal. */
  private setHeader(root: Phaser.GameObjects.Container, r: Extract<Row, { kind: 'head' }>, y: number, s: ReturnType<typeof save>) {
    const sc = this.scene, w = 244
    const members = r.set.memberIds ?? r.ids
    const owned = members.filter((id) => s.owned.includes(id)).length
    const span = setSpan(members)
    const g = sc.add.graphics()
    g.fillStyle(0x3b4e82, 1).fillRoundedRect(-w / 2, -HEAD_H / 2, w, HEAD_H, 8)
    const meta = sc.add.text(w / 2 - 8, 0, `${span ? `${span} · ` : ''}${owned}/${members.length} ›`, { fontSize: '11px', color: UI.text }).setOrigin(1, 0.5)
    const name = fit(sc.add.text(-w / 2 + 8, 0, `${r.cont ? '↪ ' : ''}${r.set.icon} ${r.set.name.replace(/\s*\(.*\)$/, '')}`, { fontSize: '12px', fontStyle: 'bold', color: UI.gold, wordWrap: { width: w - 22 - meta.width } }).setOrigin(0, 0.5), 17)
    const bar = sc.add.container(16 + 6 + w / 2, y + HEAD_H / 2, [g, name, meta]).setSize(w, HEAD_H).setInteractive({ useHandCursor: true })
    bar.on('pointerup', () => { sfx.pop(); this.openSetModal(r.set, s) })
    root.add(bar)
  }

  private unlocked = (it: Item) => {
    const s = save()
    return (!it.craft || (s.clearsBy?.[it.craft.dg] ?? 0) > 0) && itemUnlocked(it, s)
  }

  /** Short state under a row's name. */
  private caption(it: Item): string {
    const s = save()
    if (this.salvageMode) {
      const ok = salvageable(s, it)
      return ok.ok ? `${slotBadge(it)} · คืน ${Object.values(salvagePreview(s, it).mats).reduce((a, b) => a + b, 0)} ชิ้น` : `${slotBadge(it)} · ${SALVAGE_WHY[ok.why]}`
    }
    const kind = slotBadge(it)
    if (!this.unlocked(it)) {
      if (it.craft && !((s.clearsBy?.[it.craft.dg] ?? 0) > 0)) return `${kind} · 🔒 ล้มบอสดัน ${it.craft.dg === 'rift' ? 'รอยแยก' : it.craft.dg.slice(1)}`
      return `${kind} · 🔒 ${it.req ? REQ_TEXT[it.req] : 'ยังไม่ปลดล็อก'}`
    }
    if (s.owned.includes(it.id)) return `${kind} · ✓ มีแล้ว`
    if (isCardforge(it)) {
      const c = canCardforge(s, it)
      return `${kind} · ${c.ok ? '✓ พร้อม' : `🃏 ${Object.entries(it.craft!.cards!).reduce((a, [id, n]) => a + Math.min(n, bagCards(s, id)), 0)}/${Object.values(it.craft!.cards!).reduce((a, b) => a + b, 0)}`}`
    }
    return `${kind} · ${Object.entries(craftCost(it).mats).every(([id, n]) => (s.mats?.[id] ?? 0) >= n) && s.zeny >= it.craft!.zeny ? '✓ พร้อม' : 'ขายังไม่ครบ'}`
  }

  show(salvageMode = false) {
    if (this.salvageMode !== salvageMode) {
      this.salvageMode = salvageMode
      this.page = 0
      this.sel = undefined
    }
    this.rebuild()
  }

  destroy() {
    this.modal?.destroy(); this.modal = undefined
    this.root?.destroy(); this.root = undefined
  }

  private rebuild() {
    this.modal?.destroy(); this.modal = undefined
    this.root?.destroy()
    const sc = this.scene, s = save(), root = (this.root = sc.add.container(0, 0))
    const list = this.list(), book = this.pageRows(list), pages = Math.max(1, book.length)
    this.page = Math.max(0, Math.min(this.page, pages - 1))
    const firstOn = (p: number) => book[p]?.find((r): r is Extract<Row, { kind: 'item' }> => r.kind === 'item')?.it.id
    if (!this.sel || !list.some((it) => it.id === this.sel)) this.sel = firstOn(this.page) ?? list[0]?.id
    root.add(panel(sc, 16, 112, 256, 450, 0x1d2140, UI.line, 12))

    if (this.salvageMode) {
      root.add(txt(sc, 144, 128, '♻️ เลือกของที่จะหลอมคืน', 13.5, UI.gold, true).setOrigin(0.5))
    } else {
      FILTERS.forEach((f, i) => root.add(button(sc, 62 + i * 82, 128, 76, 28, f.label, () => {
        this.filter = f.id; this.page = 0; this.sel = undefined; this.rebuild()
      }, { size: 12, fill: this.filter === f.id ? 0xf2b84b : 0x5a5f8a, color: this.filter === f.id ? UI.ink : UI.text })))
    }

    let y = this.filter === 'set' && !this.salvageMode ? 148 : 162
    for (const r of book[this.page] ?? []) {
      if (r.kind === 'head') { this.setHeader(root, r, y, s); y += HEAD_H + 4; continue }
      const it = r.it
      const w = 244, cy = y + ROW_H / 2, on = it.id === this.sel, hide = !this.unlocked(it) && !this.salvageMode
      y += ROW_H + 4
      const g = sc.add.graphics()
      g.fillStyle(on ? UI.panelHi : UI.panel, 1).fillRoundedRect(-w / 2, -ROW_H / 2, w, ROW_H, 10).lineStyle(on ? 3 : 1.5, on ? 0xf2b84b : UI.line, 1).strokeRoundedRect(-w / 2, -ROW_H / 2, w, ROW_H, 10)
      const ico = itemIcon(sc, -w / 2 + 28, 0, 40, hide ? { ...it, icon: '❓', name: '???' } : it, { grade: 1, refine: 0 })
      const name = fit(sc.add.text(-w / 2 + 54, -ROW_H / 2 + 6, hide ? '???' : it.name, { fontSize: '13px', fontStyle: 'bold', color: hide ? UI.sub : UI.text, wordWrap: { width: w - 62 } }), 18)
      const cap = fit(sc.add.text(-w / 2 + 54, -ROW_H / 2 + 28, this.caption(it), { fontSize: '11px', color: UI.sub, wordWrap: { width: w - 62 } }), 16)
      const row = sc.add.container(16 + 6 + w / 2, cy, [g, ico, name, cap]).setSize(w, ROW_H).setInteractive({ useHandCursor: true })
      row.on('pointerup', () => { sfx.pop(); this.sel = it.id; this.rebuild() })
      root.add(row)
    }
    root.add(button(sc, 16 + 60, 540, 44, 30, '◀', () => { this.page--; this.rebuild() }, { size: 14 }).setEnabled(this.page > 0))
    root.add(txt(sc, 16 + 128, 540, `${this.page + 1}/${pages}`, 14, UI.text, true).setOrigin(0.5))
    root.add(button(sc, 16 + 196, 540, 44, 30, '▶', () => { this.page++; this.rebuild() }, { size: 14 }).setEnabled(this.page < pages - 1))
    const it = list.find((x) => x.id === this.sel)
    if (!it) { root.add(txt(sc, 616, 300, this.salvageMode ? 'ยังไม่มีของตีเอง หรือของร้านที่ติดคำสาปให้หลอมค่ะ' : 'ไม่มีสูตรในหมวดนี้ค่ะ', 16, UI.sub).setOrigin(0.5)); return }
    this.stage(root, it, s)
  }

  // ---------- right side ----------
  private stage(root: Phaser.GameObjects.Container, it: Item, s: ReturnType<typeof save>) {
    const sc = this.scene, open = this.unlocked(it), salv = this.salvageMode, cf = isCardforge(it), c = it.craft
    const itemSet = itemSetOf(it), allSets = itemSetsOf(it)
    root.add(panel(sc, 288, 112, 656, 150))
    const shown = open || salv
    root.add(itemIcon(sc, 288 + 70, 187, 96, shown ? it : { ...it, icon: '❓', name: '???' }, { grade: salv ? gradeOf(s, it.id) : 1, refine: salv ? refineOf(s, it.id) : 0 }))

    const titleMaxW = shown && itemSet ? 344 : 504
    const titleBadges = `${cf ? '  🃏' : ''}${itemSet ? '  🧩' : ''}`
    root.add(fit(txt(sc, 288 + 128, 120, shown ? `${it.name}${titleBadges}` : '??? (ยังไม่ปลดสูตร)', 19, shown ? UI.text : UI.sub, true).setWordWrapWidth(titleMaxW), 26))

    if (shown && itemSet) {
      const members = itemSet.memberIds ?? []
      const ownedCount = members.filter((id) => s.owned.includes(id)).length
      const label = allSets.length > 1 ? `🧩 ดูเซ็ต (${allSets.length} เซ็ต)` : `🧩 ดูเซ็ต (${ownedCount}/${members.length})`
      root.add(button(sc, 852, 132, 168, 28, label, () => this.openSetModal(itemSet, s, allSets), { size: 11.5, fill: 0x3b4e82, color: UI.gold }))
    }

    const slotLabel = slotBadge(it)
    const setTag = shown && itemSet ? ` · 🧩 ${allSets.map((x) => x.name.replace(/\s*\(.*\)$/, '')).join(' + ')}` : ''
    root.add(fit(txt(sc, 288 + 128, 148, `${slotLabel} · ${c ? `ของ${dgName(c.dg)}` : 'ของร้าน (ติดคำสาป)'} · ${wearText(it)}${canWearAs(it, s) ? '' : ' (ไม่ใช่อาชีพนี้)'}${setTag}`, 12, canWearAs(it, s) ? UI.sub : UI.red).setWordWrapWidth(510), 18))

    const lockMsg = c && !((s.clearsBy?.[c.dg] ?? 0) > 0) ? `ล้ม${dgBoss(c.dg)}ก่อนถึงจะตีได้` : (it.req ? REQ_TEXT[it.req] : 'ยังไม่ปลดล็อก')
    if (shown) {
      const worn = forgeItem(it, salv ? gradeOf(s, it.id) : 1, salv ? refineOf(s, it.id) : 0)
      root.add(fit(txt(sc, 288 + 128, 168, `${itemStatLine(worn)} · 🃏 ช่องการ์ด ${it.slots ?? 1}`, 13, '#9fe3a8', true).setWordWrapWidth(510), 30))
      const fx = describeItemEffects(itemEffectsOf(undefined, it), itemConversionsOf(undefined, it))
      const detail = fx.length > 0 ? `${it.desc} · ${fx.join(' · ')}` : it.desc
      root.add(fit(txt(sc, 288 + 128, 200, detail, 11, cf ? UI.gold : UI.sub, cf).setWordWrapWidth(510), 30))
      if (c) root.add(fit(txt(sc, 288 + 128, 234, `★3 ปลด: ${itemStatLine({ mod: c.bonus[0] })}  ·  ★5 ปลด: ${itemStatLine({ mod: c.bonus[1] })}`, 11, GRADE.colors[3]).setWordWrapWidth(510), 22))
    } else {
      root.add(txt(sc, 288 + 128, 176, `🔒 ${lockMsg}\nวัตถุดิบ: ??? · ค่าตี: ???`, 14, UI.sub))
    }

    if (salv) {
      root.add(panel(sc, 288, 272, 656, 190, UI.panel, UI.line))
      this.salvageInfo(root, it, s)
    } else {
      this.craftInfo(root, it, s, open, cf)
    }
  }

  private craftInfo(root: Phaser.GameObjects.Container, it: Item, s: ReturnType<typeof save>, open: boolean, cf: boolean) {
    const sc = this.scene, c = it.craft!, owned = s.owned.includes(it.id)
    const strip = costStrip(sc, 304, 482, 360)
    root.add(strip)

    // Split middle area: Left = Materials/Missing (344w), Right = Compare vs Equipped (302w)
    root.add(panel(sc, 288, 272, 344, 190, UI.panel, UI.line))
    root.add(panel(sc, 642, 272, 302, 190, UI.panel, UI.line))

    this.renderComparePanel(root, it, s, open)

    if (!open) {
      const lockWhy = !((s.clearsBy?.[c.dg] ?? 0) > 0) ? `สูตรนี้ปลดเมื่อชนะ ${dgBoss(c.dg)} ครั้งแรก` : `สูตรนี้${it.req ? REQ_TEXT[it.req] : 'ยังไม่ปลดล็อก'}`
      root.add(txt(sc, 302, 286, `${lockWhy}\nวัตถุดิบ: ??? · ค่าตี: ???`, 13, UI.sub).setWordWrapWidth(316))
      this.host.say('สูตรที่ยังไม่ปลดเป็นเงาไว้ก่อนนะ ปลดเงื่อนไขก่อนเลย')
      return
    }
    const cost = cf ? cardforgeCost(it) : craftCost(it)
    strip.setCost(cost, s)
    const lines: string[] = []
    for (const [id, n] of Object.entries(cost.mats)) {
      const have = s.mats?.[id] ?? 0
      if (have < n) lines.push(`• ${matById(id)?.icon ?? ''} ${matById(id)?.name ?? id} ขาด ${n - have} — ${matById(id) ? matSource(matById(id)!) : ''}`)
    }
    if (cf) {
      let x = 302
      for (const [id, n] of Object.entries(it.craft!.cards!)) {
        const have = bagCards(s, id), seen = (s.cardSeen ?? []).includes(id) || have > 0, cd = cardById(id)
        const ch = chip(sc, x, 294, '🃏', seen && cd ? `${cardName(cd)} ${have}/${n}` : `❓ ??? 0/${n}`, have >= n ? 'ok' : 'short', 316)
        root.add(ch); x += ch.chipW + 6
        if (have < n) lines.push(seen && cd ? `• 🃏 ${cardName(cd)} ขาด ${n - have} ใบ — ดรอปจากดัน${dgName(cd.dungeon)}` : `• ❓ การ์ดขาด ${n - have} ใบ — ฟาร์มดัน${dgName(c.dg)}`)
      }
    }
    if (s.zeny < cost.zeny) lines.push(`• 💰 zeny ขาด ${cost.zeny - s.zeny}z`)
    root.add(fit(txt(sc, 302, cf ? 322 : 286, owned ? `✓ มีแล้ว ${gradeStars(gradeOf(s, it.id), 5)} · อัปขั้นกับตีบวกต่อที่ ⚒️ ทั่ง` : lines.length ? `ที่ขาดอยู่:\n${lines.join('\n')}` : 'ของครบแล้ว กดสร้างได้เลยค่ะ', 12, owned ? UI.green : lines.length ? UI.text : UI.green).setWordWrapWidth(316), cf ? 102 : 136))

    if (!owned) {
      const pinned = s.forgePin === it.id
      root.add(button(sc, 536, 442, 168, 28, pinned ? '📍 เลิกปักหมุด' : '📌 ปักหมุดสูตรนี้', () => {
        if (pinned) delete s.forgePin; else s.forgePin = it.id
        persist()
        toast(sc, pinned ? 'เลิกปักหมุดแล้วค่ะ' : '📌 ปักหมุดแล้ว พอของครบหน้าสรุปรันจะบอกค่ะ', UI.gold)
        this.rebuild()
      }, { size: 12, fill: pinned ? 0xf2b84b : 0x5a5f8a, color: pinned ? UI.ink : UI.text }))
    }
    const ready = cf ? canCardforge(s, it).ok : canPay(s, cost)
    root.add(button(sc, 794, 522, 280, 48, owned ? '✓ มีแล้ว' : ready ? (cf ? '🃏 ผนึกสร้าง' : '🔨 สร้าง') : 'ของยังไม่ครบ', () => this.build(it, cf), { size: 17 }).setEnabled(ready && !owned))
  }

  private renderComparePanel(root: Phaser.GameObjects.Container, it: Item, s: ReturnType<typeof save>, open: boolean) {
    const sc = this.scene, px = 654, py = 282, pw = 278
    root.add(txt(sc, px, py, '🆚 เทียบกับของที่ใส่อยู่', 13, UI.gold, true))
    if (!open) {
      root.add(txt(sc, px, py + 32, '🔒 ปลดล็อกสูตรก่อนเพื่อเทียบค่าพลัง', 12, UI.sub).setWordWrapWidth(pw))
      return
    }
    const target = forgeItem(it, s.owned.includes(it.id) ? gradeOf(s, it.id) : 1, s.owned.includes(it.id) ? refineOf(s, it.id) : 0)
    if (isWorn(s, it.id)) {
      root.add(txt(sc, px, py + 24, '✅ กำลังใส่ชิ้นนี้อยู่แล้ว', 12, UI.green, true))
      const rows = compareRows(target, target).slice(0, 6)
      rows.forEach((r, idx) => {
        root.add(fit(txt(sc, px, py + 48 + idx * 20, `${r.label}: ${r.next}`, 11.5, UI.text).setWordWrapWidth(pw), 18))
      })
      return
    }
    const rival = wornRival(s, it)
    const headText = rival ? `ที่ใส่: ${rival.name}${forgeTag(s, rival.id)}` : `ช่อง${slotBadge(it)} ยังว่างอยู่`
    root.add(fit(txt(sc, px, py + 22, headText, 11.5, rival ? '#98d8ff' : UI.sub).setWordWrapWidth(pw), 18))

    const rivalForged = rival ? forgedWithAspect(s as SaveExt, rival) : null
    const rows = compareRows(rivalForged, target)
    if (!rows.length) {
      root.add(txt(sc, px, py + 52, 'ไม่มีค่าพลังที่ต่างกัน', 12, UI.sub))
      return
    }
    const shown = rows.slice(0, 6)
    shown.forEach((r, idx) => {
      const ry = py + 44 + idx * 21
      const color = r.d > 0 ? UI.green : r.d < 0 ? UI.red : r.curse ? '#ff9f9f' : UI.sub
      root.add(fit(txt(sc, px, ry, cmpLine(r), 11.5, color, r.d !== 0).setWordWrapWidth(pw), 18))
    })
    if (rows.length > shown.length) {
      root.add(txt(sc, px, py + 44 + shown.length * 21, `…อีก ${rows.length - shown.length} ค่า`, 11, UI.sub))
    }
  }

  /** `tabs`: every set the opening item counts for, shown as switch buttons when there is more than one. */
  private openSetModal(itemSet: ItemSet, s: ReturnType<typeof save>, tabs: readonly ItemSet[] = []) {
    this.modal?.destroy()
    const sc = this.scene
    const close = () => { this.modal?.destroy(); this.modal = undefined }
    const c = sc.add.container(0, 0).setDepth(30000)
    this.modal = c

    const dim = sc.add.rectangle(W / 2, H / 2, W, H, 0x080a18, 0.82).setInteractive()
    dim.on('pointerup', close)
    const mx = 110, my = 54, mw = W - 220, mh = H - 108
    c.add([dim, panel(sc, mx, my, mw, mh, 0x141834, 0xf2b84b, 14), sc.add.zone(mx, my, mw, mh).setOrigin(0).setInteractive()])

    const span = setSpan(itemSet.memberIds ?? [])
    c.add(fit(txt(sc, mx + 20, my + 16, `${itemSet.icon} ${itemSet.name}${span ? `  ·  ${span}` : ''}`, 20, UI.gold, true).setWordWrapWidth(tabs.length > 1 ? mw - 70 - tabs.length * 92 : mw - 90), 28))
    c.add(fit(txt(sc, mx + 20, my + 44, itemSet.desc, 12.5, UI.sub).setWordWrapWidth(mw - 90), 34))
    // A piece in two sets: switch between them here
    if (tabs.length > 1) tabs.forEach((t, i) => c.add(button(sc, mx + mw - 70 - (tabs.length - i) * 92 + 46, my + 26, 86, 28, `${t.icon} ${t.name.replace(/\s*\(.*\)$/, '').replace(/^ชุด/, '')}`, () => this.openSetModal(t, s, tabs), { size: 10.5, fill: t.id === itemSet.id ? 0xf2b84b : 0x3b4e82, color: t.id === itemSet.id ? UI.ink : UI.text })))
    c.add(button(sc, mx + mw - 26, my + 26, 36, 32, '✕', close, { size: 16, fill: 0x5a5f8a, color: UI.text }))

    const activeSummary = setBonuses(wornItems(s)).active.find((a) => a.set.id === itemSet.id)
    const wornCount = activeSummary?.count ?? 0

    // Left: Pieces in Set
    const lx = mx + 20, ly = my + 82, lw = (mw - 56) / 2
    c.add(txt(sc, lx, ly, `📦 ชิ้นส่วนในเซ็ต (ใส่อยู่ ${wornCount}/${itemSet.memberIds?.length ?? 0})`, 14, UI.gold, true))
    const members = itemSet.memberIds ?? []
    const recipeIds = new Set(this.list().map((x) => x.id))
    // Rows shrink when a set has many pieces; 9+ pieces go into two columns (zone sets have up to 14) so the list stays inside the modal.
    const cols = members.length > 8 ? 2 : 1, perCol = Math.ceil(members.length / cols)
    const rowH = Math.min(58, Math.floor((my + mh - 10 - (ly + 28)) / Math.max(1, perCol)))
    const ph = rowH - 6, half = ph / 2
    const fullW = lw, colW = cols > 1 ? (fullW - 6) / 2 : fullW
    members.forEach((id, i) => {
      const item = itemById(id)
      const lx = mx + 20 + Math.floor(i / perCol) * (colW + 6), lw = colW
      const ry = ly + 28 + (i % perCol) * rowH
      c.add(panel(sc, lx, ry, lw, ph, 0x1a1f3d, isWorn(s, id) ? 0x6fd08c : s.owned.includes(id) ? 0xf2b84b : UI.line, 8))
      if (!item) return
      const status = isWorn(s, id) ? '✅ ใส่อยู่' : s.owned.includes(id) ? '🎒 มีแล้ว' : '🔨 ยังไม่มี'
      const stColor = isWorn(s, id) ? UI.green : s.owned.includes(id) ? UI.gold : UI.sub
      const open = () => { close(); this.sel = id; this.rebuild() }
      if (cols > 1) {
        // compact two-column row: tap the row to jump to its recipe (uniques are boss drops, no recipe)
        c.add(itemIcon(sc, lx + 22, ry + half, Math.min(34, ph - 8), item, { grade: gradeOf(s, id), refine: refineOf(s, id) }))
        const go = recipeIds.has(id) && id !== this.sel
        c.add(fit(txt(sc, lx + 44, ry + Math.max(2, half - 17), `${item.name}${go ? ' ›' : ''}`, 12, UI.text, true).setWordWrapWidth(lw - 50, true), 16))
        c.add(fit(txt(sc, lx + 44, ry + Math.max(18, half + 1), `${SLOTS.find((q) => q.id === item.slot)?.icon ?? ''} ${item.unique ? '👑 ยูนีค' : status}`, 10.5, item.unique ? '#ffb347' : stColor).setWordWrapWidth(lw - 50), 15))
        if (go) c.add(sc.add.zone(lx, ry, lw, ph).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () => { sfx.pop(); open() }))
        return
      }
      c.add(itemIcon(sc, lx + 28, ry + half, Math.min(38, ph - 8), item, { grade: gradeOf(s, id), refine: refineOf(s, id) }))
      c.add(fit(txt(sc, lx + 56, ry + Math.max(3, half - 18), item.name, 13, UI.text, true).setWordWrapWidth(lw - 140), 18))
      c.add(txt(sc, lx + 56, ry + Math.max(22, half + 2), `${slotBadge(item)} · ${status}`, 11, stColor))
      if (recipeIds.has(id) && id !== this.sel) {
        c.add(button(sc, lx + lw - 42, ry + half, 68, Math.min(26, ph - 10), 'ดูสูตร ›', open, { size: 11, fill: 0x3b4e82, color: UI.text }))
      }
    })

    // Right: Set Bonuses
    const rx = lx + lw + 16, rw = lw
    c.add(txt(sc, rx, ly, '✨ โบนัสเซ็ต', 14, UI.gold, true))
    itemSet.tiers.forEach((tier, i) => {
      const ty = ly + 28 + i * 86
      const active = wornCount >= tier.pieces
      c.add(panel(sc, rx, ty, rw, 78, active ? 0x1d2e35 : 0x181c36, active ? 0x6fd08c : UI.line, 8))
      c.add(txt(sc, rx + 12, ty + 10, `${active ? '✅' : '⬜'} ครบ ${tier.pieces} ชิ้น`, 13, active ? UI.green : UI.sub, true))
      c.add(txt(sc, rx + 12, ty + 32, tier.label, 12, active ? UI.text : '#a4a9c8').setWordWrapWidth(rw - 24))
    })
  }

  private build(it: Item, cf: boolean) {
    const s = save()
    const ok = cf ? cardforge(s, it) : (!s.owned.includes(it.id) && pay(s, craftCost(it)) && (s.owned.push(it.id), true))
    if (!ok) { toast(this.scene, 'วัตถุดิบ การ์ด หรือ zeny ยังไม่พอค่ะ', UI.red); return }
    persist(); sfx.coin()
    this.host.wallet()
    this.host.say(`ตี ${it.name} สำเร็จ! อัปขั้น/ตีบวกต่อที่ ⚒️ ทั่งได้เลย`)
    if (canWearAs(it, s)) confirm(this.scene, `ตีสำเร็จ! ${it.icon} ${it.name}`, 'ใส่เลยไหมคะ?', 'ใส่เลย', () => { equip(s, it.id); persist(); this.host.changed() }, 'ไว้ก่อน')
    else toast(this.scene, `ได้ ${it.name} แล้ว (ใส่ได้เมื่อเป็น ${wearText(it)})`)
    this.host.changed()
  }

  private salvageInfo(root: Phaser.GameObjects.Container, it: Item, s: ReturnType<typeof save>) {
    const sc = this.scene, ok = salvageable(s, it)
    root.add(txt(sc, 304, 284, '♻️ หลอมคืน: ละลายของชิ้นนี้ ได้วัตถุดิบกลับครึ่งหนึ่ง · ไม่คืน zeny / การ์ด / ของที่ใช้ตีบวก · ย้อนกลับไม่ได้', 12, UI.sub).setWordWrapWidth(624))
    if (!ok.ok) { root.add(txt(sc, 304, 330, SALVAGE_WHY[ok.why], 16, UI.red, true)); root.add(button(sc, 794, 522, 280, 48, 'หลอมไม่ได้', () => undefined, { size: 17 }).setEnabled(false)); return }
    const p = salvagePreview(s, it)
    let x = 304
    root.add(txt(sc, x, 320, 'จะได้คืน:', 13, UI.text, true))
    x = 392
    for (const [id, n] of Object.entries(p.mats)) { const m = matById(id), ch = chip(sc, x, 332, m?.icon ?? '📦', `${m?.name ?? id} +${n}`, 'gain', 200); root.add(ch); x += ch.chipW + 6 }
    if (!Object.keys(p.mats).length) root.add(txt(sc, x, 326, 'ไม่มีอะไรคืน', 13, UI.sub))
    const feeChip = chip(sc, 304, 376, '💰', `ค่าธรรมเนียม ${p.fee}z`, s.zeny >= p.fee ? 'ok' : 'short', 300)
    root.add(feeChip)
    if (p.cards.length) root.add(txt(sc, 304, 400, `🃏 การ์ดที่เสียบอยู่ ${p.cards.length} ใบ จะกลับเข้ากระเป๋า`, 12, UI.green))
    if (s.taint?.[it.id]) root.add(txt(sc, 304, 420, it.craft ? '🌑 ของ Corrupt ได้คืนแค่ครึ่งหนึ่งของปกติ' : '🌑 ของร้านที่ติดคำสาป: ได้คืนครึ่งหนึ่งของที่ใช้ไป (เลื่อนเกรด + ผลึกโลกันตร์)', 12, '#c9a8ff'))
    const hb = holdButton(sc, 794, 522, 280, 48, s.zeny >= p.fee ? '♻️ กดค้างเพื่อหลอม' : `ขาด ${p.fee - s.zeny}z`, 800, () => this.doSalvage(it), { size: 17, fill: 0x2f7d4f })
    hb.setEnabled(s.zeny >= p.fee)
    root.add(hb)
  }

  private doSalvage(it: Item) {
    const s = save(), r = salvage(s, it)
    if (!r) { toast(this.scene, 'หลอมไม่ได้ในตอนนี้ค่ะ', UI.red); return }
    persist(); sfx.coin()
    this.host.wallet()
    this.host.say(`หลอม ${it.name} แล้ว ได้วัตถุดิบกลับมา${r.cards.length ? ` และการ์ด ${r.cards.length} ใบ` : ''}`)
    this.sel = undefined
    this.host.changed()
  }
}

function cmpLine(r: CmpRow): string {
  const prefix = r.curse ? '💀 ' : ''
  if (r.d === 0) return `${prefix}${r.label}: ${r.next === '—' ? r.now : r.next}`
  return `${prefix}${r.label}: ${r.now} → ${r.next} ${r.d > 0 ? '▲' : '▼'}`
}
