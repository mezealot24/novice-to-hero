import Phaser from 'phaser'
import { COLORS, DUNGEONS, H, W } from '../data/game-data'
import { JOBS } from '../data/jobs'
import { canWear, forged, gradeOf, isBroken, itemStatLine, ITEMS, linesOf, refineOf, slotCount, SLOTS, wearText, type Item } from '../data/meta'
import { craftCost, CRAFT_ITEMS, GRADE, gradeCap, gradeCost, gradeItem, gradeStars, REFINE, refinable } from '../data/craft'
import { canAfford, canAffordAuto, FODDER, fodderFits, fodderMin, fodderToBuy, gemRepairCost, lineText, nextRate, pickFodder, refineCost, lineIdx, maxLocks, nextRerollCost, repair, repairCost, reroll, rerollMul, rollsOf, totalZeny, tryRefine, zenyShort, type ForgeCost } from '../data/refine'
import { MAT_RULES, MATS, matById } from '../data/materials'
import { addFodder, canPay, equip, forgetForge, isWorn, pay, persist, save } from '../save'
import { sfx } from '../sfx'
import { button, confirm, go, panel, tabs, toast, topBar, txt, UI } from '../ui'

// Forge (design/item-acquisition-v1.md): craft dungeon gear from materials, raise any item's grade.
// Craft and grade-ups always succeed. Refine (+1..+10) can break an item above +4; gems may ONLY repair it
// (design 3.6: never rate, break protection, mats, fodder or rerolls), and the material repair is always cheaper.
// Exception (Q 2026-11-06): gems lock a bonus line in the option gacha; the roll itself is zeny + mats.
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
      b.add(txt(this, 24, 146, 'เชื้อหลอม = ของร้านพื้นฐาน ใช้ตีบวก/ซ่อม (ช่องเดียวกัน) · ไม่มีก็ได้ ตอนตีจะซื้อให้อัตโนมัติ (ถามก่อนเสมอ)', 13, UI.sub))
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
    const line = fit(txt(this, x + 14, y + 56, itemStatLine(gradeItem(it, g)), 13, '#9fe3a8', true).setWordWrapWidth(cw - 28), 52) // grade only: refine/lines show on the ตีบวก tab
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
    // Order must not change after a try (it would move the card under the player's finger): worn gear first,
    // then slot order. Never by refine level or broken state.
    const rank = (it: Item) => (isWorn(s, it.id) ? 0 : 1)
    const slotIx = (it: Item) => SLOTS.findIndex((q) => q.id === it.slot)
    return ITEMS.filter((it) => s.owned.includes(it.id) && refinable(it) && (!this.mineOnly || canWear(it, s.job)))
      .sort((a, c) => rank(a) - rank(c) || slotIx(a) - slotIx(c))
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
    const line = fit(txt(this, x + 14, y + 54, stat, 12, broken ? '#ffb0b0' : '#9fe3a8', true).setWordWrapWidth(cw - 28), 48) // 3 lines max
    const extra = REFINE.lineAt.map((at, i) => `+${at} ${lines[i] ? lineText(lines[i]) : '—'}`).join(' · ')
    const has = lines.some(Boolean)
    const lt = fit(txt(this, x + 14, y + 106, `🎁 ${extra}`, 11, has ? '#d9c2ff' : UI.sub).setWordWrapWidth(cw - (has ? 100 : 28)), 32) // fixed row, 2 lines max
    b.add([line, lt])
    if (has) b.add(button(this, x + cw - 40, lt.y + 10, 64, 24, '🎲', () => this.linesView(it), { size: 13, fill: 0x8a6fd1, color: UI.text }))
    const by = y + ch - 24
    if (broken) {
      const mc = repairCost(it, r), short = zenyShort(s, mc)
      b.add(this.costText(x + 14, by - 30, mc, cw - 28, '🔧 '))
      b.add(button(this, x + 78, by, 128, 34, short && !canAffordAuto(s, mc) && this.matsOk(mc) ? `ขาด ${short}z` : `🔧 ${totalZeny(s, mc)}z`, () => this.doRepair(it, false), { size: 15 }).setEnabled(canAffordAuto(s, mc)))
      b.add(button(this, x + cw - 78, by, 128, 34, `💎${REFINE.repairGems} ซ่อม`, () => this.doRepair(it, true), { size: 15, fill: 0x5a5f8a, color: UI.text }).setEnabled(canAfford(s, gemRepairCost)))
      return
    }
    if (r >= REFINE.max) { b.add(txt(this, x + cw / 2, by, '✓ +10 สูงสุดแล้ว ✨', 14, UI.green).setOrigin(0.5)); return }
    const n = r + 1, rate = nextRate(s, it), cost = refineCost(it, n)
    const gift = REFINE.lineAt.includes(n) && !lines[REFINE.lineAt.indexOf(n)] ? ' 🎁' : ''
    b.add(this.costText(x + 14, by - 30, cost, cw - 28))
    const ok = canAffordAuto(s, cost), short = zenyShort(s, cost)
    const label = !ok && short && this.matsOk(cost) ? `ตี +${n} · ขาด ${short}z` : `ตี +${n} · ${totalZeny(s, cost)}z · ${Math.round(rate * 100)}%${gift}`
    b.add(button(this, x + cw / 2, by, cw - 32, 34, label, () => this.askRefine(it), { size: 15, fill: rate < 1 ? 0xff9f5a : undefined }).setEnabled(ok))
  }

  /** Mats + gems are there (so a short press is only about zeny). */
  private matsOk(c: ForgeCost) {
    return canAfford(save(), { ...c, zeny: 0, fodder: undefined })
  }

  /** When the press buys fodder, one confirm lists everything it takes. Never charge silently. */
  private askRefine(it: Item) {
    const s = save(), n = refineOf(s, it.id) + 1, cost = refineCost(it, n), f = fodderToBuy(s, cost)
    if (!f) { this.doRefine(it); return }
    const total = totalZeny(s, cost)
    confirm(this, `ตี ${it.name} +${n}?`, `ไม่มีเชื้อหลอม ซื้อให้อัตโนมัติ:\n🔩 ${f.icon} ${f.name} ${f.price}z + ค่าตี ${cost.zeny}z\nรวม ${total}z · เหลือ ${s.zeny - total}z · สำเร็จ ${Math.round(nextRate(s, it) * 100)}%`, `ซื้อ+ตี ${total}z`, () => this.doRefine(it, true))
  }

  private doRefine(it: Item, autoBuy = false) {
    const s = save()
    const before = Math.round(nextRate(s, it) * 100)
    const res = tryRefine(s, it, Math.random, autoBuy)
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

  private doRepair(it: Item, gems: boolean, autoBuy = false) {
    const s = save()
    if (!gems && !autoBuy) {
      const cost = repairCost(it, refineOf(s, it.id)), f = fodderToBuy(s, cost)
      if (f) {
        const total = totalZeny(s, cost)
        confirm(this, `ซ่อม ${it.name}?`, `ไม่มีเชื้อหลอม ซื้อให้อัตโนมัติ:\n🔩 ${f.icon} ${f.name} ${f.price}z${cost.zeny ? ` + ค่าซ่อม ${cost.zeny}z` : ''}\nรวม ${total}z · เหลือ ${s.zeny - total}z`, `ซื้อ+ซ่อม ${total}z`, () => this.doRepair(it, false, true))
        return
      }
    }
    if (!repair(s, it, gems, autoBuy)) { toast(this, gems ? 'เพชรไม่พอค่ะ' : 'เชื้อหลอมหรือวัตถุดิบยังไม่พอค่ะ', UI.red); return }
    persist(); sfx.coin(); this.refreshWallet()
    toast(this, `🔧 ซ่อม ${it.name} แล้ว กลับมาใช้ได้เต็มที่ค่ะ`, UI.green)
    this.render()
  }

  /** Option gacha (Q 2026-11-06): one roll rerolls every unlocked line at once (zeny + mats). Gems only lock a line.
   * `locked` survives re-opening after a roll, so the player can keep rolling with the same locks. */
  private linesView(it: Item, locked: number[] = []) {
    const s = save(), c = this.add.container(0, 0).setDepth(30000)
    const close = () => { c.destroy(); this.render() }
    const again = (lk: number[]) => { c.destroy(); this.linesView(it, lk) }
    c.add(this.add.rectangle(W / 2, H / 2, W, H, UI.night, 0.8).setInteractive())
    const pw = 700, ph = 420, px = W / 2 - pw / 2, py = H / 2 - ph / 2
    c.add(panel(this, px, py, pw, ph, UI.panelHi, COLORS.gold))
    c.add(txt(this, W / 2, py + 18, `🎁 ค่าพิเศษ ${it.icon} ${it.name} +${refineOf(s, it.id)}`, 22, UI.gold, true).setOrigin(0.5, 0))
    const lines = linesOf(s, it.id), have = lineIdx(s, it.id), maxLk = maxLocks(have.length)
    const rolls = rollsOf(s, it.id)
    c.add(txt(this, W / 2, py + 52, `🎲 สุ่มทีเดียวเปลี่ยนทุกบรรทัดที่ไม่ล็อก (ค่าเก่าหายทันที) · สุ่มไปแล้ว ${rolls} ครั้ง ราคา x${rerollMul(rolls).toFixed(1)}\n${maxLk ? `🔒 ล็อกได้ ${maxLk} บรรทัด จ่ายเพชรทุกครั้งที่สุ่ม (${REFINE.lockGems.slice(0, maxLk).map((g, i) => `ล็อกที่ ${i + 1}: 💎${g}`).join(' · ')})` : `🔒 ตีถึง +${REFINE.lineAt[1]} ให้มี 2 บรรทัดก่อน ถึงจะล็อกได้`}`, 12, UI.sub).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(pw - 40))
    REFINE.lineAt.forEach((at, i) => {
      const y = py + 94 + i * 88, l = lines[i], on = locked.includes(i)
      c.add(panel(this, px + 20, y, pw - 40, 78, UI.panel, on ? COLORS.gold : UI.line, 10))
      c.add(txt(this, px + 36, y + 10, `+${at} (${['เล็ก', 'กลาง', 'ใหญ่'][i]})`, 15, UI.sub, true))
      if (!l) { c.add(txt(this, px + 36, y + 40, `ยังไม่ได้ · ตีถึง +${at} ครั้งแรกจะได้ค่าสุ่ม 1 บรรทัด`, 14, UI.sub)); return }
      c.add(txt(this, px + 36, y + 38, lineText(l), 18, l.gold ? UI.gold : UI.text, true))
      const canLock = on || locked.length < maxLk
      c.add(button(this, px + pw - 100, y + 39, 140, 34, on ? '🔒 ล็อกอยู่' : '🔓 ล็อก', () => again(on ? locked.filter((x) => x !== i) : [...locked, i]),
        { size: 14, fill: on ? 0xb8860b : 0x5a5f8a, color: UI.text }).setEnabled(canLock))
    })
    const cost = nextRerollCost(s, it, locked)
    c.add(this.costText(px + 36, py + ph - 70, cost, pw - 72, locked.length ? '🔒 ' : ''))
    c.add(button(this, W / 2 - 100, py + ph - 26, 180, 36, `🎲 สุ่ม ${have.length - locked.length} บรรทัด`, () => {
      if (!reroll(s, it, locked)) { toast(this, 'วัตถุดิบ zeny หรือเพชรยังไม่พอค่ะ', UI.red); return }
      persist(); sfx.pop(); this.refreshWallet(); again(locked)
    }, { size: 15 }).setEnabled(canAfford(s, cost)))
    c.add(button(this, W / 2 + 100, py + ph - 26, 160, 36, 'ปิด', close, { size: 16, fill: 0x5a5f8a, color: UI.text }))
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
    b.add(txt(this, x + 10, y + 30, `${SLOTS.find((q) => q.id === it.slot)?.name ?? it.slot} · ${it.price}z · ใช้ได้ถึง +${it.price >= fodderMin(it.slot, 2) ? 10 : it.price >= fodderMin(it.slot, 1) ? 7 : 4} · ซ่อมได้`, 11, UI.sub))
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
      parts.push(f ? `🔩${f.name} ${s.fodder![f.id]}/1` : fits[0] ? `🛒🔩${fits[0].name} ${fits[0].price}z` : `✗🔩${name}ร้าน${cost.fodder.min ? `≥${cost.fodder.min}z` : ''}`)
    }
    for (const [id, n] of Object.entries(cost.mats)) {
      const have = s.mats?.[id] ?? 0, m = matById(id)
      parts.push(`${have >= n ? '' : '✗'}${m?.icon ?? ''}${m?.name ?? id} ${have}/${n}`)
    }
    const auto = cost.fodder ? totalZeny(s, cost as ForgeCost) : cost.zeny
    if (cost.zeny) parts.push(`${s.zeny >= auto ? '' : '✗'}${cost.fodder ? (prefix ? 'ค่าซ่อม ' : 'ค่าตี ') : ''}${cost.zeny}z`)
    if (cost.gems) parts.push(`${s.gems >= cost.gems ? '' : '✗'}💎${cost.gems}`)
    const ok = cost.fodder ? canAffordAuto(s, cost as ForgeCost) : canAfford(s, cost)
    const t = txt(this, x, y, prefix + parts.join(' · '), 12, ok ? UI.text : '#ffb0b0')
    if (t.width > w) t.setText(prefix + parts.map((p) => p.replace(/(\S+?)[\u0E00-\u0E7F]+ (\d+\/\d+)/u, '$1 $2').replace(/ \(เช่น [^)]+\)/u, '')).join(' · ')) // too long: icons only (names are on the วัตถุดิบ tab)
    if (t.width > w) t.setText(t.text.replace(/🔩[\u0E00-\u0E7F]+(ร้าน)?/u, '🔩')) // still too long: "✗🔩≥400z"
    if (t.width > w) t.setFontSize(11)
    return t
  }

}

/** Clip a wrapped text to a height budget, ending with "…" (keeps cards from running into their cost row). */
function fit(t: Phaser.GameObjects.Text, maxH: number) {
  if (t.height <= maxH) return t
  let s = t.text
  while (s.length > 1 && t.height > maxH) { s = s.slice(0, -2); t.setText(s + '…') }
  return t
}
