import Phaser from 'phaser'
import { COLORS, DUNGEONS } from '../data/game-data'
import { JOBS } from '../data/jobs'
import { canWear, gradeOf, itemStatLine, ITEMS, slotCount, wearText, type Item } from '../data/meta'
import { craftCost, CRAFT_ITEMS, GRADE, gradeCap, gradeCost, gradeItem, gradeStars } from '../data/craft'
import { MAT_RULES, MATS, matById } from '../data/materials'
import { canPay, equip, isWorn, pay, persist, save } from '../save'
import { sfx } from '../sfx'
import { button, confirm, go, panel, tabs, toast, topBar, txt, UI } from '../ui'

// Forge (design/item-acquisition-v1.md): craft dungeon gear from materials, raise any item's grade.
// Everything here always succeeds and costs only materials + zeny. Gems are not used at all.
type Tab = 'craft' | 'grade' | 'mats'
const dgName = (id: string) => DUNGEONS.find((d) => d.id === id)?.name ?? id
const dgBoss = (id: string) => DUNGEONS.find((d) => d.id === id)?.boss ?? ''
const bonusLine = (m: object) => itemStatLine({ mod: m })

export class ForgeScene extends Phaser.Scene {
  private body?: Phaser.GameObjects.Container
  private tab: Tab = 'craft'
  private mineOnly = true
  private page = 0
  private refreshWallet!: () => void
  constructor() { super('forge') }

  create() {
    this.cameras.main.setBackgroundColor(UI.night)
    this.cameras.main.fadeIn(160, 20, 23, 43)
    this.page = 0
    this.refreshWallet = topBar(this, '🔨 โรงตีเหล็ก', () => go(this, 'hub'))
    txt(this, 24, 72, 'ช่างตีเหล็ก: "เอาวัตถุดิบจากดันมา ตีของดี ๆ ให้ได้ทุกชิ้น ไม่มีพังแน่นอน"', 15, UI.sub)
    const ids: Tab[] = ['craft', 'grade', 'mats']
    tabs(this, 24, 118, ['🔨 สร้างของ', '⬆️ อัปขั้น', '🧱 วัตถุดิบ'], 196, (i) => { this.tab = ids[i]; this.page = 0; this.render() }, ids.indexOf(this.tab))
  }

  private render() {
    this.body?.destroy()
    this.body = this.add.container(0, 0)
    this.refreshWallet()
    if (this.tab === 'mats') { this.matsTab(); return }
    const s = save(), b = this.body
    const all = this.tab === 'craft' ? this.craftList() : this.gradeList()
    const per = 6, pages = Math.max(1, Math.ceil(all.length / per))
    this.page = Math.min(this.page, pages - 1)
    b.add(button(this, 728, 118, 150, 40, this.mineOnly ? `${JOBS[s.job].icon} ของฉัน` : '🌐 ทั้งหมด', () => { this.mineOnly = !this.mineOnly; this.page = 0; this.render() }, { size: 15, fill: 0x5a5f8a, color: UI.text }))
    b.add(button(this, 832, 118, 44, 40, '◀', () => { this.page--; this.render() }, { size: 16 }).setEnabled(this.page > 0))
    b.add(txt(this, 884, 118, `${this.page + 1}/${pages}`, 15, UI.text, true).setOrigin(0.5))
    b.add(button(this, 936, 118, 44, 40, '▶', () => { this.page++; this.render() }, { size: 16 }).setEnabled(this.page < pages - 1))
    all.slice(this.page * per, this.page * per + per).forEach((it, i) => {
      const x = 24 + (i % 3) * 308, y = 152 + Math.floor(i / 3) * 208
      if (this.tab === 'craft') this.craftCard(it, x, y)
      else this.gradeCard(it, x, y)
    })
    if (!all.length) b.add(txt(this, 480, 330, this.tab === 'craft' ? 'ยังไม่มีสูตรสำหรับอาชีพนี้ค่ะ\nกดปุ่มกรองด้านบนเพื่อดูทุกอาชีพ' : 'ยังไม่มีของที่อัปขั้นได้ค่ะ\nซื้อของที่ร้าน หรือตีของใหม่ก่อนนะคะ', 16, UI.sub).setOrigin(0.5).setAlign('center'))
  }

  // ---------- craft ----------
  private craftList(): Item[] {
    const s = save()
    const open = (it: Item) => ((s.clearsBy?.[it.craft!.dg] ?? 0) > 0 ? 0 : 1)
    return CRAFT_ITEMS.filter((it) => !this.mineOnly || canWear(it, s.job))
      .sort((a, c) => open(a) - open(c) || DUNGEONS.findIndex((d) => d.id === a.craft!.dg) - DUNGEONS.findIndex((d) => d.id === c.craft!.dg))
  }

  private craftCard(it: Item, x: number, y: number) {
    const s = save(), b = this.body!, c = it.craft!
    const open = (s.clearsBy?.[c.dg] ?? 0) > 0, owned = s.owned.includes(it.id), wear = canWear(it, s.job)
    const cw = 296, ch = 200
    b.add(panel(this, x, y, cw, ch, open ? UI.panel : 0x1d2140, owned ? COLORS.gold : UI.line))
    b.add(txt(this, x + 14, y + 10, it.icon, 30).setAlpha(open ? 1 : 0.5))
    b.add(txt(this, x + 60, y + 8, it.name, 18, UI.text, true))
    b.add(txt(this, x + 60, y + 34, `ของ${dgName(c.dg)}`, 12, UI.sub))
    b.add(txt(this, x + cw - 12, y + 34, wearText(it), 11, wear ? UI.sub : UI.red).setOrigin(1, 0))
    const line = txt(this, x + 14, y + 56, `${itemStatLine(it)} · 🃏 ช่องการ์ด ${slotCount(it)}`, 13, '#9fe3a8', true).setWordWrapWidth(cw - 28)
    const b3 = txt(this, x + 14, line.y + line.height + 2, `★3 ปลด: ${bonusLine(c.bonus[0])}`, 12, GRADE.colors[3]).setWordWrapWidth(cw - 28)
    const b5 = txt(this, x + 14, b3.y + b3.height, `★5 ปลด: ${bonusLine(c.bonus[1])}`, 12, GRADE.colors[5]).setWordWrapWidth(cw - 28)
    b.add([line, b3, b5])
    const by = y + ch - 24
    if (!open) { b.add(txt(this, x + cw / 2, by, `🔒 ล้ม${dgBoss(c.dg)}ก่อนถึงจะตีได้`, 14, UI.sub).setOrigin(0.5)); return }
    if (owned) { b.add(txt(this, x + cw / 2, by, `✓ มีแล้ว ${gradeStars(gradeOf(s, it.id), gradeCap(it))} (อัปต่อที่แท็บอัปขั้น)`, 13, UI.green).setOrigin(0.5)); return }
    const cost = craftCost(it)
    b.add(this.costText(x + 14, by - 30, cost, cw - 28))
    b.add(button(this, x + cw / 2, by, cw - 32, 34, 'ตีเลย', () => this.craft(it), { size: 16 }).setEnabled(canPay(s, cost)))
  }

  private craft(it: Item) {
    const s = save()
    if (!pay(s, craftCost(it))) { toast(this, 'วัตถุดิบหรือ zeny ยังไม่พอค่ะ', UI.red); return }
    s.owned.push(it.id)
    persist(); sfx.coin()
    const wear = canWear(it, s.job)
    if (wear) confirm(this, `ตีสำเร็จ! ${it.icon} ${it.name}`, 'ใส่เลยไหมคะ?', 'ใส่เลย', () => { equip(s, it.id); persist(); this.render() }, 'ไว้ก่อน')
    else toast(this, `ได้ ${it.name} แล้ว (ใส่ได้เมื่อเป็น ${wearText(it)})`)
    this.render()
  }

  // ---------- grade ----------
  private gradeList(): Item[] {
    const s = save()
    const worn = (it: Item) => (isWorn(s, it.id) ? 0 : 1)
    return ITEMS.filter((it) => s.owned.includes(it.id) && gradeCap(it) > 1 && (!this.mineOnly || canWear(it, s.job)))
      .sort((a, c) => worn(a) - worn(c) || gradeCap(c) - gradeCap(a) || gradeOf(s, c.id) - gradeOf(s, a.id))
  }

  private gradeCard(it: Item, x: number, y: number) {
    const s = save(), b = this.body!
    const g = gradeOf(s, it.id), cap = gradeCap(it), worn = isWorn(s, it.id)
    const cw = 296, ch = 200
    b.add(panel(this, x, y, cw, ch, UI.panel, worn ? COLORS.gold : UI.line))
    b.add(txt(this, x + 14, y + 10, it.icon, 30))
    b.add(txt(this, x + 60, y + 8, it.name, 18, GRADE.colors[g], true))
    b.add(txt(this, x + 60, y + 34, `${gradeStars(g, cap)}  ${GRADE.names[g]}${worn ? ' · ใส่อยู่' : ''}`, 13, GRADE.colors[g], true))
    const line = txt(this, x + 14, y + 56, itemStatLine(gradeItem(it, g)), 13, '#9fe3a8', true).setWordWrapWidth(cw - 28)
    b.add(line)
    const by = y + ch - 24
    if (g >= cap) {
      b.add(txt(this, x + 14, line.y + line.height + 4, cap < GRADE.max ? `ของ${it.jobs || it.req ? 'คลาส' : 'ร้าน'}อัปได้ถึง ★${cap} · ของดันกับของตีเองไปได้ถึง ★5` : 'ถึงขั้นตำนานแล้ว ✨', 12, UI.sub).setWordWrapWidth(cw - 28))
      b.add(txt(this, x + cw / 2, by, '✓ สูงสุดแล้ว', 14, UI.green).setOrigin(0.5))
      return
    }
    const n = g + 1, notes = [`ค่าทั้งชิ้น +${Math.round(GRADE.pct[n] * 100)}% จากพื้นฐาน`]
    if (n === GRADE.slotAt && slotCount(it, n) > slotCount(it, g)) notes.push('+1 ช่องการ์ด')
    const bi = GRADE.bonusAt.indexOf(n)
    if (it.craft && bi >= 0) notes.push(`ปลด: ${bonusLine(it.craft.bonus[bi])}`)
    b.add(txt(this, x + 14, line.y + line.height + 4, `→ ★${n} ${GRADE.names[n]}: ${notes.join(' · ')}`, 12, GRADE.colors[n]).setWordWrapWidth(cw - 28))
    const cost = gradeCost(it, n)
    b.add(this.costText(x + 14, by - 30, cost, cw - 28))
    b.add(button(this, x + cw / 2, by, cw - 32, 34, `อัปเป็น ★${n}`, () => this.upgrade(it), { size: 16 }).setEnabled(canPay(s, cost)))
  }

  private upgrade(it: Item) {
    const s = save(), n = gradeOf(s, it.id) + 1
    if (n > gradeCap(it) || !pay(s, gradeCost(it, n))) { toast(this, 'วัตถุดิบหรือ zeny ยังไม่พอค่ะ', UI.red); return }
    ;(s.grade ??= {})[it.id] = n
    persist(); sfx.coin()
    toast(this, `${it.icon} ${it.name} เป็น ★${n} ${GRADE.names[n]} แล้ว!`, GRADE.colors[n])
    this.cameras.main.flash(140, 255, 230, 160)
    this.render()
  }

  // ---------- materials ----------
  private matsTab() {
    const s = save(), b = this.body!
    b.add(txt(this, 24, 150, 'วัตถุดิบเก็บถาวร แพ้หรือกลับเมืองกลางทางก็ไม่หายค่ะ', 15, UI.sub))
    MATS.forEach((m, i) => {
      const x = 24 + (i % 2) * 460, y = 178 + Math.floor(i / 2) * 64
      const n = s.mats?.[m.id] ?? 0
      b.add(panel(this, x, y, 450, 56, UI.panel, n ? COLORS.gold : UI.line, 10))
      b.add(txt(this, x + 12, y + 8, `${m.icon} ${m.name}`, 17, n ? UI.text : UI.sub, true))
      b.add(txt(this, x + 438, y + 8, `x${n}`, 20, n ? UI.gold : UI.sub, true).setOrigin(1, 0))
      const mini = DUNGEONS.find((d) => d.id === m.dungeon)?.rooms.some((r) => r.mini)
      const from = m.boss ? `${mini ? `มินิบอส ได้ ${MAT_RULES.mini.boss} · ` : ''}บอส${dgBoss(m.dungeon)} ได้ ${MAT_RULES.boss.boss}` : `มอนธรรมดา ${Math.round(MAT_RULES.normalRate * 100)}% · บอสให้ ${MAT_RULES.boss.common}`
      b.add(txt(this, x + 12, y + 33, `${dgName(m.dungeon)}: ${from}`, 12, UI.sub))
    })
  }

  /** "💧 เมือกใส 5/8 · 🔶 แกนเจลราชา 1/2 · 200z" (short parts in red). */
  private costText(x: number, y: number, cost: { mats: Record<string, number>; zeny: number }, w: number) {
    const s = save()
    const parts = Object.entries(cost.mats).map(([id, n]) => {
      const have = s.mats?.[id] ?? 0, m = matById(id)
      return `${have >= n ? '' : '✗'}${m?.icon ?? ''}${m?.name ?? id} ${have}/${n}`
    })
    parts.push(`${s.zeny >= cost.zeny ? '' : '✗'}${cost.zeny}z`)
    const ok = canPay(s, cost)
    const t = txt(this, x, y, parts.join(' · '), 12, ok ? UI.text : '#ffb0b0')
    if (t.width > w) t.setText(parts.map((p) => p.replace(/(\S+?)[\u0E00-\u0E7F]+ (\d+\/\d+)/u, '$1 $2')).join(' · ')) // too long: icons only (names are on the วัตถุดิบ tab)
    return t
  }
}
