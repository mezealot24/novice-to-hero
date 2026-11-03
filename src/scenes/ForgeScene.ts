import Phaser from 'phaser'
import { COLORS, DUNGEONS, H, W } from '../data/game-data'
import { JOBS } from '../data/jobs'
import { canWear, forged, gradeOf, isBroken, itemStatLine, ITEMS, linesOf, refineOf, slotCount, SLOTS, wearText, type Item } from '../data/meta'
import { craftCost, CRAFT_ITEMS, GRADE, gradeCap, gradeCost, gradeStars, REFINE, refinable } from '../data/craft'
import { canAfford, FODDER, fodderFits, fodderMin, gemRepairCost, lineText, nextRate, pickFodder, refineCost, repair, repairCost, reroll, rerollCost, settleReroll, tryRefine, type ForgeCost } from '../data/refine'
import { MAT_RULES, MATS, matById } from '../data/materials'
import { addFodder, canPay, equip, forgetForge, isWorn, pay, persist, save } from '../save'
import { sfx } from '../sfx'
import { button, confirm, go, panel, tabs, toast, topBar, txt, UI } from '../ui'

// Forge (design/item-acquisition-v1.md): craft dungeon gear from materials, raise any item's grade.
// Craft and grade-ups always succeed. Refine (+1..+10) can break an item above +4; gems may ONLY repair it
// (design 3.6: never rate, break protection, mats, fodder or rerolls), and the material repair is always cheaper.
type Tab = 'craft' | 'grade' | 'refine' | 'fodder' | 'mats'
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
    txt(this, 24, 72, 'ช่างตีเหล็ก: "สร้างของกับอัปขั้นไม่มีพัง · ตีบวกเกิน +4 ลุ้นหน่อยนะ แตกแล้วซ่อมได้"', 15, UI.sub)
    const ids: Tab[] = ['craft', 'grade', 'refine', 'fodder', 'mats']
    tabs(this, 24, 118, ['🔨 สร้าง', '⬆️ อัปขั้น', '⚒️ ตีบวก', '🔩 เชื้อ', '🧱 วัตถุดิบ'], 116, (i) => { this.tab = ids[i]; this.page = 0; this.render() }, ids.indexOf(this.tab))
  }

  private render() {
    this.body?.destroy()
    this.body = this.add.container(0, 0)
    this.refreshWallet()
    if (this.tab === 'mats') { this.matsTab(); return }
    const s = save(), b = this.body
    const all = this.tab === 'craft' ? this.craftList() : this.tab === 'grade' ? this.gradeList() : this.tab === 'refine' ? this.refineList() : FODDER
    const per = this.tab === 'fodder' ? 12 : 6, pages = Math.max(1, Math.ceil(all.length / per))
    this.page = Math.min(this.page, pages - 1)
    if (this.tab !== 'fodder') b.add(button(this, 728, 118, 150, 40, this.mineOnly ? `${JOBS[s.job].icon} ของฉัน` : '🌐 ทั้งหมด', () => { this.mineOnly = !this.mineOnly; this.page = 0; this.render() }, { size: 15, fill: 0x5a5f8a, color: UI.text }))
    b.add(button(this, 832, 118, 44, 40, '◀', () => { this.page--; this.render() }, { size: 16 }).setEnabled(this.page > 0))
    b.add(txt(this, 884, 118, `${this.page + 1}/${pages}`, 15, UI.text, true).setOrigin(0.5))
    b.add(button(this, 936, 118, 44, 40, '▶', () => { this.page++; this.render() }, { size: 16 }).setEnabled(this.page < pages - 1))
    if (this.tab === 'fodder') {
      b.add(txt(this, 24, 146, 'เชื้อหลอม = ของร้านพื้นฐาน (ไม่ล็อกอาชีพ) ใช้ตีบวกและซ่อม · ต้องเป็นช่องเดียวกับของที่ตี', 13, UI.sub))
      all.slice(this.page * per, this.page * per + per).forEach((it, i) => this.fodderCard(it, 24 + (i % 3) * 308, 170 + Math.floor(i / 3) * 100))
      return
    }
    all.slice(this.page * per, this.page * per + per).forEach((it, i) => {
      const x = 24 + (i % 3) * 308, y = 152 + Math.floor(i / 3) * 208
      if (this.tab === 'craft') this.craftCard(it, x, y)
      else if (this.tab === 'grade') this.gradeCard(it, x, y)
      else this.refineCard(it, x, y)
    })
    const empty = { craft: 'ยังไม่มีสูตรสำหรับอาชีพนี้ค่ะ\nกดปุ่มกรองด้านบนเพื่อดูทุกอาชีพ', grade: 'ยังไม่มีของที่อัปขั้นได้ค่ะ\nซื้อของที่ร้าน หรือตีของใหม่ก่อนนะคะ', refine: 'ยังไม่มีของที่ตีบวกได้ค่ะ\n(ของเริ่มต้นตีไม่ได้ ซื้อของที่ร้าน หรือสร้างของก่อนนะคะ)' }[this.tab]
    if (!all.length) b.add(txt(this, 480, 330, empty, 16, UI.sub).setOrigin(0.5).setAlign('center'))
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
    const line = txt(this, x + 14, y + 56, itemStatLine(forged(s, it)), 13, '#9fe3a8', true).setWordWrapWidth(cw - 28)
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

  // ---------- refine +1..+10 ----------
  private refineList(): Item[] {
    const s = save()
    const rank = (it: Item) => (isWorn(s, it.id) ? 0 : 2) + (isBroken(s, it.id) ? 0 : 1)
    return ITEMS.filter((it) => s.owned.includes(it.id) && refinable(it) && (!this.mineOnly || canWear(it, s.job)))
      .sort((a, c) => rank(a) - rank(c) || refineOf(s, c.id) - refineOf(s, a.id))
  }

  private refineCard(it: Item, x: number, y: number) {
    const s = save(), b = this.body!
    const g = gradeOf(s, it.id), r = refineOf(s, it.id), broken = isBroken(s, it.id), worn = isWorn(s, it.id), lines = linesOf(s, it.id)
    const cw = 296, ch = 200
    b.add(panel(this, x, y, cw, ch, broken ? 0x3a2236 : UI.panel, broken ? 0xff6b6b : worn ? COLORS.gold : UI.line))
    b.add(txt(this, x + 14, y + 10, it.icon, 30).setAlpha(broken ? 0.55 : 1))
    b.add(txt(this, x + 60, y + 8, `${it.name}${r ? ` +${r}` : ''}`, 18, GRADE.colors[g], true))
    b.add(txt(this, x + 60, y + 34, `${gradeStars(g, gradeCap(it))} · ตีบวก +${r}/${REFINE.max}${worn ? ' · ใส่อยู่' : ''}`, 12, UI.sub))
    const stat = broken ? '💔 แตก: ไม่ได้ค่าพลังและการ์ดจนกว่าจะซ่อม (บวก/ขั้น/การ์ด/ค่าพิเศษ ยังอยู่ครบ)' : itemStatLine(forged(s, it)) || it.desc
    const line = txt(this, x + 14, y + 54, stat, 12, broken ? '#ffb0b0' : '#9fe3a8', true).setWordWrapWidth(cw - 28)
    const extra = REFINE.lineAt.map((at, i) => `+${at} ${lines[i] ? lineText(lines[i]) : '—'}`).join(' · ')
    const lt = txt(this, x + 14, line.y + line.height + 2, `🎁 ${extra}`, 11, lines.length ? '#d9c2ff' : UI.sub).setWordWrapWidth(cw - (lines.length ? 70 : 28))
    b.add([line, lt])
    if (lines.some(Boolean)) b.add(button(this, x + cw - 40, lt.y + 10, 64, 24, s.reroll?.item === it.id ? '🎲 เลือก' : '🎲', () => this.linesView(it), { size: 13, fill: 0x8a6fd1, color: UI.text }))
    const by = y + ch - 24
    if (broken) {
      const mc = repairCost(it)
      b.add(this.costText(x + 14, by - 30, mc, cw - 28, '🔧 '))
      b.add(button(this, x + 78, by, 128, 34, '🔧 ซ่อม', () => this.doRepair(it, false), { size: 15 }).setEnabled(canAfford(s, mc)))
      b.add(button(this, x + cw - 78, by, 128, 34, `💎${REFINE.repairGems} ซ่อม`, () => this.doRepair(it, true), { size: 15, fill: 0x5a5f8a, color: UI.text }).setEnabled(canAfford(s, gemRepairCost)))
      return
    }
    if (r >= REFINE.max) { b.add(txt(this, x + cw / 2, by, '✓ +10 สูงสุดแล้ว ✨', 14, UI.green).setOrigin(0.5)); return }
    const n = r + 1, rate = nextRate(s, it), cost = refineCost(it, n)
    const gift = REFINE.lineAt.includes(n) && !lines[REFINE.lineAt.indexOf(n)] ? ' 🎁' : ''
    b.add(this.costText(x + 14, by - 30, cost, cw - 28))
    b.add(button(this, x + cw / 2, by, cw - 32, 34, `ตี +${n} · สำเร็จ ${Math.round(rate * 100)}%${gift}`, () => this.doRefine(it), { size: 15, fill: rate < 1 ? 0xff9f5a : undefined }).setEnabled(canAfford(s, cost)))
  }

  private doRefine(it: Item) {
    const s = save()
    const before = Math.round(nextRate(s, it) * 100)
    const res = tryRefine(s, it)
    if (!res.ok) { toast(this, res.why === 'short' ? 'วัตถุดิบ เชื้อหลอม หรือ zeny ยังไม่พอค่ะ' : 'ตีชิ้นนี้ต่อไม่ได้ค่ะ', UI.red); return }
    persist(); this.refreshWallet()
    if (res.success) {
      sfx.coin(); this.cameras.main.flash(140, 255, 230, 160)
      const gift = [res.line ? `ได้ค่าพิเศษ ${lineText(res.line)}` : '', res.gems ? `💎+${res.gems} ฉลอง +${res.n}` : ''].filter(Boolean).join('\n')
      if (gift) confirm(this, `สำเร็จ! ${it.icon} ${it.name} +${res.n}`, gift, 'เยี่ยม!', () => this.render(), 'ปิด')
      else toast(this, `สำเร็จ! ${it.name} +${res.n}`, UI.green)
    } else {
      sfx.hurt(); this.cameras.main.shake(180, 0.006)
      confirm(this, `💔 พลาด! ${it.name} แตก`, `(โอกาส ${before}%) บวก ขั้น การ์ด ค่าพิเศษ ยังอยู่ครบ\nแค่ไม่ให้ค่าพลังจนกว่าจะซ่อม\nครั้งหน้าโอกาส +${Math.round(REFINE.pity * 100)}% (พลาดติดกันยิ่งง่ายขึ้น)`, 'โอเค', () => this.render(), 'ปิด')
    }
    this.render()
  }

  private doRepair(it: Item, gems: boolean) {
    const s = save()
    if (!repair(s, it, gems)) { toast(this, gems ? 'เพชรไม่พอค่ะ' : 'เชื้อหลอมหรือวัตถุดิบยังไม่พอค่ะ', UI.red); return }
    persist(); sfx.coin(); this.refreshWallet()
    toast(this, `🔧 ซ่อม ${it.name} แล้ว กลับมาใช้ได้เต็มที่ค่ะ`, UI.green)
    this.render()
  }

  /** Bonus lines of one item: reroll (materials + zeny only) and keep-old / take-new. */
  private linesView(it: Item) {
    const s = save(), c = this.add.container(0, 0).setDepth(30000)
    const close = () => { c.destroy(); this.render() }
    c.add(this.add.rectangle(W / 2, H / 2, W, H, UI.night, 0.8).setInteractive())
    const pw = 700, ph = 400, px = W / 2 - pw / 2, py = H / 2 - ph / 2
    c.add(panel(this, px, py, pw, ph, UI.panelHi, COLORS.gold))
    c.add(txt(this, W / 2, py + 18, `🎁 ค่าพิเศษ ${it.icon} ${it.name} +${refineOf(s, it.id)}`, 22, UI.gold, true).setOrigin(0.5, 0))
    c.add(txt(this, W / 2, py + 52, 'สุ่มใหม่ใช้วัตถุดิบ + zeny เท่านั้น (ไม่ใช้เพชร) · ได้ค่าใหม่แล้วเลือกเก็บอันเดิมได้เสมอ', 13, UI.sub).setOrigin(0.5, 0))
    const lines = linesOf(s, it.id), pend = s.reroll
    REFINE.lineAt.forEach((at, i) => {
      const y = py + 84 + i * 96, l = lines[i]
      c.add(panel(this, px + 20, y, pw - 40, 86, UI.panel, UI.line, 10))
      c.add(txt(this, px + 36, y + 10, `+${at} (${['เล็ก', 'กลาง', 'ใหญ่'][i]})`, 15, UI.sub, true))
      if (!l) { c.add(txt(this, px + 36, y + 40, `ยังไม่ได้ · ตีถึง +${at} ครั้งแรกจะได้ค่าสุ่ม 1 บรรทัด`, 14, UI.sub)); return }
      const mine = pend && pend.item === it.id && pend.idx === i
      c.add(txt(this, px + 36, y + 36, `${mine ? 'เดิม: ' : ''}${lineText(l)}`, 18, l.gold ? UI.gold : UI.text, true))
      if (mine) {
        c.add(txt(this, px + 300, y + 36, `ใหม่: ${lineText(pend!.line)}`, 18, pend!.line.gold ? UI.gold : '#9fe3a8', true))
        c.add(button(this, px + pw - 230, y + 64, 130, 30, 'เก็บอันเดิม', () => { settleReroll(s, false); persist(); close() }, { size: 14, fill: 0x5a5f8a, color: UI.text }))
        c.add(button(this, px + pw - 90, y + 64, 130, 30, 'เอาอันใหม่', () => { settleReroll(s, true); persist(); close() }, { size: 14 }))
        return
      }
      const cost = rerollCost(it, i)
      c.add(this.costText(px + 36, y + 62, cost, 400))
      c.add(button(this, px + pw - 100, y + 43, 140, 36, '🎲 สุ่มใหม่', () => {
        if (!reroll(s, it, i)) { toast(this, s.reroll ? 'เลือกค่าที่สุ่มค้างไว้ก่อนนะคะ' : 'วัตถุดิบหรือ zeny ยังไม่พอค่ะ', UI.red); return }
        persist(); sfx.pop(); this.refreshWallet(); c.destroy(); this.linesView(it)
      }, { size: 15 }).setEnabled(!pend && canAfford(s, cost)))
    })
    c.add(button(this, W / 2, py + ph - 26, 160, 36, 'ปิด', close, { size: 16, fill: 0x5a5f8a, color: UI.text }))
  }

  // ---------- fodder ----------
  private fodderCard(it: Item, x: number, y: number) {
    const s = save(), b = this.body!
    const n = s.fodder?.[it.id] ?? 0, owned = s.owned.includes(it.id)
    const movable = owned && !isWorn(s, it.id) && !(s.sockets?.[it.id]?.length) && gradeOf(s, it.id) <= 1 && refineOf(s, it.id) === 0 && !isBroken(s, it.id)
    const cw = 296, ch = 92
    b.add(panel(this, x, y, cw, ch, UI.panel, n ? COLORS.gold : UI.line, 10))
    b.add(txt(this, x + 10, y + 8, `${it.icon} ${it.name}`, 15, UI.text, true))
    b.add(txt(this, x + cw - 10, y + 8, `🔩 x${n}`, 16, n ? UI.gold : UI.sub, true).setOrigin(1, 0))
    b.add(txt(this, x + 10, y + 30, `${SLOTS.find((q) => q.id === it.slot)?.name ?? it.slot} · ${it.price}z · ตีได้ถึง +${it.price >= fodderMin(it.slot, 2) ? 10 : it.price >= fodderMin(it.slot, 1) ? 7 : 4} · ซ่อมได้`, 11, UI.sub))
    b.add(button(this, x + 74, y + 66, 124, 30, `ซื้อ ${it.price}z`, () => {
      if (s.zeny < it.price) { toast(this, 'zeny ไม่พอค่ะ', UI.red); return }
      s.zeny -= it.price; addFodder(s, it.id); persist(); sfx.coin(); this.refreshWallet(); this.render()
    }, { size: 13 }).setEnabled(s.zeny >= it.price))
    b.add(button(this, x + cw - 74, y + 66, 124, 30, owned ? 'ย้ายจากกระเป๋า' : 'ไม่มีในกระเป๋า', () =>
      confirm(this, `ใช้ ${it.name} เป็นเชื้อ?`, 'ของชิ้นนี้จะออกจากกระเป๋า ไปอยู่ในกองเชื้อหลอมแทน\n(ซื้อคืนที่ร้านได้ตลอด)', 'ย้ายเลย', () => {
        s.owned = s.owned.filter((id) => id !== it.id); forgetForge(s, it.id); addFodder(s, it.id); persist(); this.render()
      }), { size: 12, fill: 0x5a5f8a, color: UI.text }).setEnabled(movable))
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

  /** "🔩ดาบสั้น 1 · 💧เมือกใส 5/8 · 🔶แกนเจลราชา 1/2 · 200z" (short parts marked ✗, red when not affordable). */
  private costText(x: number, y: number, cost: { mats: Record<string, number>; zeny: number } & Partial<ForgeCost>, w: number, prefix = '') {
    const s = save()
    const parts: string[] = []
    if (cost.fodder) {
      const f = pickFodder(s.fodder, cost.fodder), name = SLOTS.find((q) => q.id === cost.fodder!.slot)?.name ?? ''
      const fits = fodderFits(cost.fodder)
      parts.push(f ? `🔩${f.name} ${s.fodder![f.id]}/1` : `✗🔩${name}ร้าน${cost.fodder.min ? `≥${cost.fodder.min}z` : ''}${fits[0] ? ` (เช่น ${fits[0].name})` : ''}`)
    }
    for (const [id, n] of Object.entries(cost.mats)) {
      const have = s.mats?.[id] ?? 0, m = matById(id)
      parts.push(`${have >= n ? '' : '✗'}${m?.icon ?? ''}${m?.name ?? id} ${have}/${n}`)
    }
    if (cost.zeny) parts.push(`${s.zeny >= cost.zeny ? '' : '✗'}${cost.zeny}z`)
    if (cost.gems) parts.push(`${s.gems >= cost.gems ? '' : '✗'}💎${cost.gems}`)
    const ok = canAfford(s, cost)
    const t = txt(this, x, y, prefix + parts.join(' · '), 12, ok ? UI.text : '#ffb0b0')
    if (t.width > w) t.setText(prefix + parts.map((p) => p.replace(/(\S+?)[\u0E00-\u0E7F]+ (\d+\/\d+)/u, '$1 $2').replace(/ \(เช่น [^)]+\)/u, '')).join(' · ')) // too long: icons only (names are on the วัตถุดิบ tab)
    return t
  }

}
