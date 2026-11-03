import Phaser from 'phaser'
import { COLORS, type Stats } from '../data/game-data'
import { JOBS } from '../data/jobs'
import { canWear, heroStats, itemStatLine, itemUnlocked, ITEMS, REQ_TEXT, SELL_RATE, SLOTS, wearText, type Item, type Slot } from '../data/meta'
import { persist, save } from '../save'
import { sfx } from '../sfx'
import { button, confirm, go, panel, tabs, toast, topBar, txt, UI } from '../ui'

// Zeny shop: buy / sell gear. Every item here is earnable just by playing.
export class ShopScene extends Phaser.Scene {
  private body?: Phaser.GameObjects.Container
  private slot: Slot = 'weapon'
  private mineOnly = true
  private page = 0
  private refreshWallet!: () => void
  constructor() { super('shop') }

  create() {
    this.cameras.main.setBackgroundColor(UI.night)
    this.cameras.main.fadeIn(160, 20, 23, 43)
    this.page = 0
    this.refreshWallet = topBar(this, '🛒 ร้านค้า', () => go(this, 'hub'))
    txt(this, 24, 72, 'ลุงร้านค้า: "ของทุกชิ้นซื้อด้วย zeny จากในดันเท่านั้น ไม่ขายของแรงด้วยเงินจริงนะหลาน"', 15, UI.sub)
    tabs(this, 24, 118, SLOTS.map((s) => `${s.icon} ${s.name}`), 196, (i) => { this.slot = SLOTS[i].id; this.page = 0; this.render() })
  }

  private list(): Item[] {
    const s = save()
    const lockRank = (it: Item) => (itemUnlocked(it, s) ? 0 : 1)
    return ITEMS.filter((it) => it.slot === this.slot && it.price > 0 && (!this.mineOnly || canWear(it, s.job)))
      .sort((a, b) => lockRank(a) - lockRank(b) || Number(!!a.jobs) - Number(!!b.jobs) || a.price - b.price)
  }

  private render() {
    this.body?.destroy()
    const s = save(), b = this.add.container(0, 0)
    this.body = b
    const all = this.list(), per = 6, pages = Math.max(1, Math.ceil(all.length / per))
    this.page = Math.min(this.page, pages - 1)
    const items = all.slice(this.page * per, this.page * per + per)
    // filter + pager (top right)
    b.add(button(this, 728, 118, 150, 40, this.mineOnly ? `${JOBS[s.job].icon} ของฉัน` : '🌐 ทั้งหมด', () => { this.mineOnly = !this.mineOnly; this.page = 0; this.render() }, { size: 15, fill: 0x5a5f8a, color: UI.text }))
    b.add(button(this, 832, 118, 44, 40, '◀', () => { this.page--; this.render() }, { size: 16 }).setEnabled(this.page > 0))
    b.add(txt(this, 884, 118, `${this.page + 1}/${pages}`, 15, UI.text, true).setOrigin(0.5))
    b.add(button(this, 936, 118, 44, 40, '▶', () => { this.page++; this.render() }, { size: 16 }).setEnabled(this.page < pages - 1))
    const cw = 296, ch = 196
    items.forEach((it, i) => {
      const x = 24 + (i % 3) * (cw + 12), y = 152 + Math.floor(i / 3) * (ch + 12)
      const owned = s.owned.includes(it.id), worn = s.equipped[it.slot] === it.id
      const open = itemUnlocked(it, s), wear = canWear(it, s.job)
      b.add(panel(this, x, y, cw, ch, open ? UI.panel : 0x1d2140, owned ? COLORS.gold : UI.line))
      b.add(txt(this, x + 14, y + 10, it.icon, 30).setAlpha(open ? 1 : 0.5))
      b.add(txt(this, x + 60, y + 10, it.name, 18, UI.text, true))
      b.add(txt(this, x + 60, y + 36, owned ? (worn ? 'ใส่อยู่' : 'มีแล้ว') : `${it.price} zeny`, 14, owned ? UI.green : UI.gold, true))
      b.add(txt(this, x + cw - 12, y + 38, wearText(it), 11, wear ? UI.sub : UI.red).setOrigin(1, 0))
      const line = txt(this, x + 14, y + 60, itemStatLine(it), 13, '#9fe3a8', true).setWordWrapWidth(cw - 28)
      const desc = txt(this, x + 14, line.y + line.height + 3, it.desc, 12, UI.sub).setWordWrapWidth(cw - 28)
      b.add([line, desc])
      if (open && wear) b.add(txt(this, x + 14, desc.y + desc.height + 2, this.compare(it), 11, '#d8d4f0').setWordWrapWidth(cw - 28))
      const by = y + ch - 26
      if (!open) {
        b.add(txt(this, x + cw / 2, by, `🔒 ${REQ_TEXT[it.req!]}`, 14, UI.sub).setOrigin(0.5))
      } else if (!owned) {
        b.add(button(this, x + cw / 2, by, cw - 32, 38, `ซื้อ ${it.price} zeny`, () => this.buy(it), { size: 16 }).setEnabled(s.zeny >= it.price))
      } else if (worn) {
        b.add(txt(this, x + cw / 2, by, '✓ ใส่อยู่ (ถอดก่อนถึงจะขายได้)', 13, UI.green).setOrigin(0.5))
      } else {
        b.add(button(this, x + cw / 2 - 70, by, 120, 36, wear ? 'ใส่เลย' : 'อาชีพนี้ใส่ไม่ได้', () => { s.equipped[it.slot] = it.id; persist(); this.render() }, { size: wear ? 15 : 12 }).setEnabled(wear))
        const sell = Math.floor(it.price * SELL_RATE)
        b.add(button(this, x + cw / 2 + 70, by, 120, 36, `ขาย +${sell}`, () =>
          confirm(this, `ขาย ${it.name}?`, `ได้คืน ${sell} zeny (ครึ่งราคา)`, 'ขาย', () => {
            s.owned = s.owned.filter((id) => id !== it.id); s.zeny += sell; persist(); sfx.coin(); this.refreshWallet(); this.render()
          }), { size: 15, fill: 0x5a5f8a, color: UI.text }))
      }
    })
    if (!items.length) b.add(txt(this, 480, 330, 'ยังไม่มีของสำหรับอาชีพนี้ในช่องนี้ค่ะ\nกดปุ่มกรองด้านบนเพื่อดูของทุกอาชีพ', 16, UI.sub).setOrigin(0.5).setAlign('center'))
  }

  /** "vs what you wear now" line, so the choice is easy to read. */
  private compare(it: Item): string {
    const s = save()
    const now = heroStats(s)
    const next = heroStats({ ...s, equipped: { ...s.equipped, [it.slot]: it.id } })
    return compareLine(now, next)
  }

  private buy(it: Item) {
    const s = save()
    if (s.zeny < it.price) { toast(this, 'zeny ไม่พอค่ะ ไปลุยดันก่อนนะ', UI.red); return }
    s.zeny -= it.price
    s.owned.push(it.id)
    persist(); sfx.coin(); this.refreshWallet()
    if (canWear(it, s.job)) confirm(this, `ได้ ${it.icon} ${it.name}!`, 'ใส่เลยไหมคะ?', 'ใส่เลย', () => { s.equipped[it.slot] = it.id; persist(); this.render() }, 'ไว้ก่อน')
    else toast(this, `ได้ ${it.name} แล้ว (ใส่ได้เมื่อเป็น ${wearText(it)})`)
    this.render()
  }
}

/** Short "HP +30 · คริ +5%" diff between two stat blocks (used by the shop and the bag). */
export function compareLine(now: Stats, next: Stats): string {
  const parts: string[] = []
  const d = (label: string, a: number, b: number, fmt: (n: number) => string) => { if (Math.abs(b - a) > 1e-6 && fmt(Math.abs(b - a)) !== fmt(0)) parts.push(`${label} ${b > a ? '+' : '-'}${fmt(Math.abs(b - a))}`) }
  const p = (n: number) => `${Math.round(n * 100)}%`
  d('HP', now.maxHp, next.maxHp, (n) => `${Math.round(n)}`)
  d('P.ATK', now.atk, next.atk, (n) => `${Math.round(n)}`)
  d('M.ATK', now.matk, next.matk, (n) => `${Math.round(n)}`)
  d('DEF', now.def, next.def, (n) => `${Math.round(n)}`)
  d('M.DEF', now.mdef, next.mdef, p)
  d('Hit', now.hit, next.hit, (n) => `${Math.round(n)}`)
  d('Flee', now.flee, next.flee, (n) => `${Math.round(n)}`)
  d('คริ', now.crit, next.crit, p)
  d('เร็ว', now.aspd, next.aspd, (n) => p(n / 1.6))
  d('ดูดเลือด', now.lifesteal, next.lifesteal, p)
  d('สวน', now.counter, next.counter, p)
  d('คอมโบ', now.combo, next.combo, p)
  d('ฮีล', now.healAmp, next.healAmp, p)
  d('โล่', now.shieldAmp, next.shieldAmp, p)
  d('Mana', now.maxRes, next.maxRes, (n) => `${Math.round(n)}`)
  d('ManaShield', now.manaShield, next.manaShield, p)
  d('ดาเมจคริ', now.critMul, next.critMul, p)
  d('หลบ→ฟื้น', now.dodgeHeal, next.dodgeHeal, (n) => `${(n * 100).toFixed(1)}%`)
  d('โล่ต้นเวฟ', now.waveShield, next.waveShield, p)
  if (!parts.length) return 'เทียบกับที่ใส่อยู่: เท่าเดิม'
  return `เทียบที่ใส่อยู่: ${parts.slice(0, 5).join(' · ')}${parts.length > 5 ? ' …' : ''}`
}
