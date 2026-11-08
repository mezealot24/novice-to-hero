// 📜 สูตร (design/forge-ux-v1.md 4.7): the classic dungeon recipes, the 🃏 Cardforge pieces and ♻️ Salvage in one list.
// Rules live in data/craft.ts, data/cardforge.ts, data/salvage.ts. Rebuilds on pick / filter / page / action (rare, small).
import Phaser from 'phaser'
import { DUNGEONS } from '../../data/game-data'
import { cardById, cardName } from '../../data/cards'
import { bagCards, canCardforge, cardforge, cardforgeCost, isCardforge } from '../../data/cardforge'
import { CRAFT_ITEMS, craftCost, forgeItem, GRADE, gradeStars } from '../../data/craft'
import { matById } from '../../data/materials'
import { canWear, gradeOf, ITEMS, itemStatLine, refineOf, wearText, type Item } from '../../data/meta'
import { salvage, salvageable, salvagePreview, type SalvageWhy } from '../../data/salvage'
import { canPay, equip, pay, persist, save } from '../../save'
import { sfx } from '../../sfx'
import { button, chip, confirm, costStrip, fit, holdButton, itemIcon, panel, toast, txt, UI } from '../../ui'
import { CARDFORGE_ITEMS } from '../../data/cardforge'
import { matSource } from './stash'

export interface ViewHost { wallet(): void; say(text: string): void; changed(): void }
type Filter = 'all' | 'classic' | 'cf' | 'salvage'
const FILTERS: { id: Filter; label: string }[] = [{ id: 'all', label: 'ทั้งหมด' }, { id: 'classic', label: '🔨ดัน' }, { id: 'cf', label: '🃏ผนึก' }, { id: 'salvage', label: '♻️หลอม' }]
const PER = 6, ROW_H = 52
const dgName = (id: string) => DUNGEONS.find((d) => d.id === id)?.name ?? id
const dgBoss = (id: string) => DUNGEONS.find((d) => d.id === id)?.boss ?? ''
const SALVAGE_WHY: Record<SalvageWhy, string> = { notOwned: 'ยังไม่มีชิ้นนี้', notCraft: 'ของร้านหลอมไม่ได้ (ขายได้ · ยกเว้นที่ติดคำสาป)', unique: '👑 ยูนีคหลอมไม่ได้', worn: 'ใส่อยู่ ถอดก่อนนะคะ', broken: '💔 แตกอยู่ ซ่อมก่อนนะคะ' }

export class RecipeView {
  private root?: Phaser.GameObjects.Container
  private filter: Filter = 'all'
  private page = 0
  private sel?: string
  constructor(private scene: Phaser.Scene, private host: ViewHost) {}

  /** The list for the current filter. Fixed order (dungeon, then catalogue), never by affordability, so rows don't jump. */
  private list(): Item[] {
    const s = save(), dgIx = (it: Item) => DUNGEONS.findIndex((d) => d.id === it.craft!.dg)
    const all = [...CRAFT_ITEMS, ...CARDFORGE_ITEMS].sort((a, b) => dgIx(a) - dgIx(b))
    if (this.filter === 'classic') return all.filter((it) => !isCardforge(it))
    if (this.filter === 'cf') return all.filter(isCardforge)
    if (this.filter === 'salvage') return ITEMS.filter((it) => it.craft && s.owned.includes(it.id)).sort((a, b) => dgIx(a) - dgIx(b))
    return all
  }

  private unlocked = (it: Item) => (save().clearsBy?.[it.craft!.dg] ?? 0) > 0

  /** Short state under a row's name. */
  private caption(it: Item): string {
    const s = save()
    if (this.filter === 'salvage') { const ok = salvageable(s, it); return ok.ok ? `คืน ${Object.values(salvagePreview(s, it).mats).reduce((a, b) => a + b, 0)} ชิ้น · ค่าธรรมเนียม ${salvagePreview(s, it).fee}z` : SALVAGE_WHY[ok.why] }
    if (!this.unlocked(it)) return `🔒 ล้มบอสดัน ${it.craft!.dg.slice(1)} ก่อน`
    if (s.owned.includes(it.id)) return '✓ มีแล้ว'
    if (isCardforge(it)) { const c = canCardforge(s, it); return c.ok ? '✓ พร้อม' : `🃏 ${Object.entries(it.craft!.cards!).reduce((a, [id, n]) => a + Math.min(n, bagCards(s, id)), 0)}/${Object.values(it.craft!.cards!).reduce((a, b) => a + b, 0)}` }
    return Object.entries(craftCost(it).mats).every(([id, n]) => (s.mats?.[id] ?? 0) >= n) && s.zeny >= it.craft!.zeny ? '✓ พร้อม' : 'ขายังไม่ครบ'
  }

  show() { this.rebuild() }
  destroy() { this.root?.destroy(); this.root = undefined }

  private rebuild() {
    this.root?.destroy()
    const sc = this.scene, s = save(), root = (this.root = sc.add.container(0, 0))
    const list = this.list(), pages = Math.max(1, Math.ceil(list.length / PER))
    this.page = Math.max(0, Math.min(this.page, pages - 1))
    if (!this.sel || !list.some((it) => it.id === this.sel)) this.sel = list[this.page * PER]?.id ?? list[0]?.id
    root.add(panel(sc, 16, 112, 256, 450, 0x1d2140, UI.line, 12))
    FILTERS.forEach((f, i) => root.add(button(sc, 16 + 31 + i * 65, 128, 61, 28, f.label, () => { this.filter = f.id; this.page = 0; this.sel = undefined; this.rebuild() }, { size: 12, fill: this.filter === f.id ? 0xf2b84b : 0x5a5f8a, color: this.filter === f.id ? UI.ink : UI.text })))
    list.slice(this.page * PER, this.page * PER + PER).forEach((it, i) => {
      const w = 244, cy = 162 + i * (ROW_H + 4) + ROW_H / 2, on = it.id === this.sel, hide = !this.unlocked(it) && this.filter !== 'salvage'
      const g = sc.add.graphics()
      g.fillStyle(on ? UI.panelHi : UI.panel, 1).fillRoundedRect(-w / 2, -ROW_H / 2, w, ROW_H, 10).lineStyle(on ? 3 : 1.5, on ? 0xf2b84b : UI.line, 1).strokeRoundedRect(-w / 2, -ROW_H / 2, w, ROW_H, 10)
      const ico = itemIcon(sc, -w / 2 + 28, 0, 40, hide ? { ...it, icon: '❓', name: '???' } : it, { grade: 1, refine: 0 })
      const name = fit(sc.add.text(-w / 2 + 54, -ROW_H / 2 + 6, hide ? '???' : it.name, { fontSize: '13px', fontStyle: 'bold', color: hide ? UI.sub : UI.text, wordWrap: { width: w - 62 } }), 18)
      const cap = fit(sc.add.text(-w / 2 + 54, -ROW_H / 2 + 28, this.caption(it), { fontSize: '11px', color: UI.sub, wordWrap: { width: w - 62 } }), 16)
      const row = sc.add.container(16 + 6 + w / 2, cy, [g, ico, name, cap]).setSize(w, ROW_H).setInteractive({ useHandCursor: true })
      row.on('pointerup', () => { sfx.pop(); this.sel = it.id; this.rebuild() })
      root.add(row)
    })
    root.add(button(sc, 16 + 60, 540, 44, 30, '◀', () => { this.page--; this.rebuild() }, { size: 14 }).setEnabled(this.page > 0))
    root.add(txt(sc, 16 + 128, 540, `${this.page + 1}/${pages}`, 14, UI.text, true).setOrigin(0.5))
    root.add(button(sc, 16 + 196, 540, 44, 30, '▶', () => { this.page++; this.rebuild() }, { size: 14 }).setEnabled(this.page < pages - 1))
    const it = list.find((x) => x.id === this.sel)
    if (!it) { root.add(txt(sc, 616, 300, this.filter === 'salvage' ? 'ยังไม่มีของตีเองให้หลอมค่ะ' : 'ไม่มีสูตร', 16, UI.sub).setOrigin(0.5)); return }
    this.stage(root, it, s)
  }

  // ---------- right side ----------
  private stage(root: Phaser.GameObjects.Container, it: Item, s: ReturnType<typeof save>) {
    const sc = this.scene, open = this.unlocked(it), salv = this.filter === 'salvage', cf = isCardforge(it), c = it.craft!
    root.add(panel(sc, 288, 112, 656, 150))
    const shown = open || salv
    root.add(itemIcon(sc, 288 + 70, 187, 96, shown ? it : { ...it, icon: '❓', name: '???' }, { grade: salv ? gradeOf(s, it.id) : 1, refine: salv ? refineOf(s, it.id) : 0 }))
    root.add(fit(txt(sc, 288 + 128, 122, shown ? `${it.name}${cf ? '  🃏' : ''}` : '??? (ยังไม่ปลดสูตร)', 20, shown ? UI.text : UI.sub, true).setWordWrapWidth(500), 28))
    root.add(txt(sc, 288 + 128, 150, `ของ${dgName(c.dg)} · ${wearText(it)}${canWear(it, s.job) ? '' : ' (ไม่ใช่อาชีพนี้)'}`, 12, canWear(it, s.job) ? UI.sub : UI.red))
    if (shown) {
      const worn = forgeItem(it, salv ? gradeOf(s, it.id) : 1, salv ? refineOf(s, it.id) : 0)
      root.add(fit(txt(sc, 288 + 128, 170, `${itemStatLine(worn)} · 🃏 ช่องการ์ด ${it.slots ?? 1}`, 13, '#9fe3a8', true).setWordWrapWidth(510), 34))
      if (cf) root.add(fit(txt(sc, 288 + 128, 206, it.desc, 12, UI.gold, true).setWordWrapWidth(510), 34))
      else root.add(fit(txt(sc, 288 + 128, 206, it.desc, 12, UI.sub).setWordWrapWidth(510), 18))
      root.add(txt(sc, 288 + 128, 232, `★3 ปลด: ${itemStatLine({ mod: c.bonus[0] })}  ·  ★5 ปลด: ${itemStatLine({ mod: c.bonus[1] })}`, 11, GRADE.colors[3]).setWordWrapWidth(520))
    } else root.add(txt(sc, 288 + 128, 176, `🔒 ล้ม${dgBoss(c.dg)}ก่อนถึงจะตีได้\nวัตถุดิบ: ??? · ค่าตี: ???`, 14, UI.sub))
    root.add(panel(sc, 288, 272, 656, 190, UI.panel, UI.line))
    if (salv) this.salvageInfo(root, it, s)
    else this.craftInfo(root, it, s, open, cf)
  }

  private craftInfo(root: Phaser.GameObjects.Container, it: Item, s: ReturnType<typeof save>, open: boolean, cf: boolean) {
    const sc = this.scene, c = it.craft!, owned = s.owned.includes(it.id)
    const strip = costStrip(sc, 304, 482, 360)
    root.add(strip)
    if (!open) { root.add(txt(sc, 304, 288, `สูตรนี้ปลดเมื่อชนะ ${dgBoss(c.dg)} ครั้งแรก\nวัตถุดิบ: ??? · ค่าตี: ???`, 14, UI.sub)); this.host.say('สูตรที่ยังไม่ปลดเป็นเงาไว้ก่อนนะ ล้มบอสของดันนั้นก่อน'); return }
    const cost = cf ? cardforgeCost(it) : craftCost(it)
    strip.setCost(cost, s)
    // the lines that explain what is short and where it comes from
    const lines: string[] = []
    for (const [id, n] of Object.entries(cost.mats)) { const have = s.mats?.[id] ?? 0; if (have < n) lines.push(`• ${matById(id)?.icon ?? ''} ${matById(id)?.name ?? id} ขาด ${n - have} — ${matById(id) ? matSource(matById(id)!) : ''}`) }
    if (cf) {
      let x = 304
      for (const [id, n] of Object.entries(it.craft!.cards!)) {
        const have = bagCards(s, id), seen = (s.cardSeen ?? []).includes(id) || have > 0, cd = cardById(id)
        const ch = chip(sc, x, 296, '🃏', seen && cd ? `${cardName(cd)} ${have}/${n}` : `❓ ??? 0/${n}`, have >= n ? 'ok' : 'short', 300)
        root.add(ch); x += ch.chipW + 6
        if (have < n) lines.push(seen && cd ? `• 🃏 ${cardName(cd)} ขาด ${n - have} ใบ — ดรอปจากมอนในดัน${dgName(cd.dungeon)} (การ์ดที่เสียบอยู่ไม่นับ)` : `• ❓ การ์ดที่ยังไม่เคยได้ ขาด ${n - have} ใบ — ลองฟาร์มมอนของดัน${dgName(c.dg)}`)
      }
    }
    if (s.zeny < cost.zeny) lines.push(`• 💰 zeny ขาด ${cost.zeny - s.zeny}z`)
    root.add(fit(txt(sc, 304, cf ? 326 : 292, owned ? `✓ มีแล้ว ${gradeStars(gradeOf(s, it.id), 5)} · อัปขั้นกับตีบวกต่อที่ ⚒️ ทั่ง` : lines.length ? `ที่ขาดอยู่:\n${lines.join('\n')}` : 'ของครบแล้ว กดสร้างได้เลยค่ะ', 12, owned ? UI.green : lines.length ? UI.text : UI.green).setWordWrapWidth(624), cf ? 100 : 136))
    if (!owned) { // 📌 the run result tells you when this becomes affordable
      const pinned = s.forgePin === it.id
      root.add(button(sc, 836, 446, 176, 28, pinned ? '📍 เลิกปักหมุด' : '📌 ปักหมุดสูตรนี้', () => { if (pinned) delete s.forgePin; else s.forgePin = it.id; persist(); toast(sc, pinned ? 'เลิกปักหมุดแล้วค่ะ' : '📌 ปักหมุดแล้ว พอของครบหน้าสรุปรันจะบอกค่ะ', UI.gold); this.rebuild() }, { size: 12, fill: pinned ? 0xf2b84b : 0x5a5f8a, color: pinned ? UI.ink : UI.text }))
    }
    const ready = cf ? canCardforge(s, it).ok : canPay(s, cost)
    root.add(button(sc, 794, 522, 280, 48, owned ? '✓ มีแล้ว' : ready ? (cf ? '🃏 ผนึกสร้าง' : '🔨 สร้าง') : 'ของยังไม่ครบ', () => this.build(it, cf), { size: 17 }).setEnabled(ready && !owned))
  }

  private build(it: Item, cf: boolean) {
    const s = save()
    const ok = cf ? cardforge(s, it) : (!s.owned.includes(it.id) && pay(s, craftCost(it)) && (s.owned.push(it.id), true))
    if (!ok) { toast(this.scene, 'วัตถุดิบ การ์ด หรือ zeny ยังไม่พอค่ะ', UI.red); return }
    persist(); sfx.coin()
    this.host.wallet()
    this.host.say(`ตี ${it.name} สำเร็จ! อัปขั้น/ตีบวกต่อที่ ⚒️ ทั่งได้เลย`)
    if (canWear(it, s.job)) confirm(this.scene, `ตีสำเร็จ! ${it.icon} ${it.name}`, 'ใส่เลยไหมคะ?', 'ใส่เลย', () => { equip(s, it.id); persist(); this.host.changed() }, 'ไว้ก่อน')
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
    if (s.taint?.[it.id]) root.add(txt(sc, 304, 420, '🌑 ของ Corrupt ได้คืนแค่ครึ่งหนึ่งของปกติ', 12, '#c9a8ff'))
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
