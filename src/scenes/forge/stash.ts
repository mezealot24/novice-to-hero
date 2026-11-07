// 🎒 คลัง (design/forge-ux-v1.md 4.8): materials, fodder and the cards in the bag as an icon grid.
// Tap a cell = where it drops + what it is used for ("เก็บไว้ทำไม"). Fodder keeps the buy / move-from-bag buttons the old tab had.
import Phaser from 'phaser'
import { cardById, cardName } from '../../data/cards'
import { CARDFORGE_ITEMS } from '../../data/cardforge'
import { fodderMin, FODDER } from '../../data/refine'
import { DUNGEONS } from '../../data/game-data'
import { MAT_RULES, MATS, type Mat } from '../../data/materials'
import { gradeOf, isBroken, refineOf, SLOTS, type Item } from '../../data/meta'
import { TAINT, TAINT_MAT } from '../../data/taint'
import { addFodder, forgetForge, isWorn, persist, save } from '../../save'
import { sfx } from '../../sfx'
import { button, confirm, panel, tabs, toast, txt, UI } from '../../ui'
import type { ViewHost } from './RecipeView'

const dgName = (id: string) => DUNGEONS.find((d) => d.id === id)?.name ?? id
const dgBoss = (id: string) => DUNGEONS.find((d) => d.id === id)?.boss ?? ''

/** Where a material drops ("มอนธรรมดา 30% · บอสให้ 3"). */
export function matSource(m: Mat): string {
  if (m.note) return m.note
  const mini = DUNGEONS.find((d) => d.id === m.dungeon)?.rooms.some((r) => r.mini)
  const from = m.boss ? `${mini ? `มินิบอส ได้ ${MAT_RULES.mini.boss} · ` : ''}บอส${dgBoss(m.dungeon)} ได้ ${MAT_RULES.boss.boss}` : `มอนธรรมดา ${Math.round(MAT_RULES.normalRate * 100)}% · บอสให้ ${MAT_RULES.boss.common}`
  return `${dgName(m.dungeon)}: ${from}`
}

interface Entry { id: string; icon: string; name: string; n: number; source: string; use: string; note?: string; fodder?: Item }
type Group = 'mats' | 'fodder' | 'cards'
const COLS = 8, CELL = 72, GAP = 8, PER = 40

export class StashView {
  private root?: Phaser.GameObjects.Container
  private group: Group = 'mats'
  private page = 0
  private sel?: string
  private tabBtns: Phaser.GameObjects.GameObject[] = []
  private init = false
  constructor(private scene: Phaser.Scene, private host: ViewHost) {}

  private entries(): Entry[] {
    const s = save()
    if (this.group === 'mats') {
      return MATS.map((m) => ({
        id: m.id, icon: m.icon, name: m.name, n: s.mats?.[m.id] ?? 0, source: matSource(m),
        use: m.id === TAINT_MAT ? `Corrupt (🌑 ในทั่ง) ชิ้นละ ${TAINT.crystals}` : `สร้าง/ผนึกการ์ด/อัปขั้นของ${dgName(m.dungeon)} · ตีบวก ซ่อม สุ่มค่าพิเศษ ของดันนั้น · ♻️ ได้คืนตอนหลอม`,
      }))
    }
    if (this.group === 'fodder') {
      return FODDER.map((f) => ({
        id: f.id, icon: f.icon, name: f.name, n: s.fodder?.[f.id] ?? 0, fodder: f,
        source: `ซื้อ ${f.price}z ที่นี่ หรือย้ายจากกระเป๋า`,
        use: `${SLOTS.find((q) => q.id === f.slot)?.name ?? f.slot} · ตีบวกถึง +${f.price >= fodderMin(f.slot, 2) ? 10 : f.price >= fodderMin(f.slot, 1) ? 7 : 4} · ซ่อมของช่องเดียวกัน`,
      }))
    }
    return Object.entries(s.cards ?? {}).filter(([, n]) => n > 0).flatMap(([id, n]) => {
      const cd = cardById(id)
      if (!cd) return []
      const need = CARDFORGE_ITEMS.filter((it) => it.craft?.cards?.[id])
      return [{ id, icon: cd.tier === 'boss' ? '👑' : cd.tier === 'mini' ? '💠' : '🃏', name: cardName(cd), n, source: `ดรอปจากมอนสเตอร์ในดัน${dgName(cd.dungeon)}`,
        use: `${need.length ? `🃏 ผนึกการ์ด: ${need.map((x) => x.name).join(', ')} · ` : ''}เสียบช่องการ์ดของ${SLOTS.find((q) => q.id === cd.slot)?.name ?? ''} · หรือขายเป็น zeny${n >= 2 ? ' (ซ้ำ: ใช้ผนึกการ์ดแทนขายได้)' : ''}` }]
    })
  }

  show() {
    this.destroy()
    this.init = true // tabs() calls onPick once for the starting tab: ignore it, rebuild() below draws the grid
    this.tabBtns = tabs(this.scene, 24, 128, ['🧱 วัตถุดิบ', '🔩 เชื้อหลอม', '🃏 การ์ดในกระเป๋า'], 130, (i) => { if (this.init) return; this.group = (['mats', 'fodder', 'cards'] as Group[])[i]; this.page = 0; this.sel = undefined; this.rebuild() }, ['mats', 'fodder', 'cards'].indexOf(this.group))
    this.init = false
    this.rebuild()
    this.host.say('ของเก็บถาวรไม่หายแม้แพ้ · แตะช่องดูว่าได้จากไหน เก็บไว้ทำอะไร') }
  destroy() { this.root?.destroy(); this.root = undefined; for (const o of this.tabBtns) o.destroy(); this.tabBtns = [] }

  private rebuild() {
    this.root?.destroy()
    const sc = this.scene, s = save(), root = (this.root = sc.add.container(0, 0))
    const all = this.entries(), pages = Math.max(1, Math.ceil(all.length / PER))
    this.page = Math.max(0, Math.min(this.page, pages - 1))
    const slice = all.slice(this.page * PER, this.page * PER + PER)
    if (!this.sel || !all.some((e) => e.id === this.sel)) this.sel = slice[0]?.id
    if (pages > 1) {
      root.add(button(sc, 560, 128, 40, 28, '◀', () => { this.page--; this.rebuild() }, { size: 13 }).setEnabled(this.page > 0))
      root.add(txt(sc, 604, 128, `${this.page + 1}/${pages}`, 13, UI.text, true).setOrigin(0.5))
      root.add(button(sc, 648, 128, 40, 28, '▶', () => { this.page++; this.rebuild() }, { size: 13 }).setEnabled(this.page < pages - 1))
    }
    slice.forEach((e, i) => {
      const x = 24 + (i % COLS) * (CELL + GAP), y = 156 + Math.floor(i / COLS) * (CELL + GAP), on = e.id === this.sel
      const g = sc.add.graphics()
      g.fillStyle(on ? UI.panelHi : UI.panel, 1).fillRoundedRect(0, 0, CELL, CELL, 10).lineStyle(on ? 3 : 1.5, on ? 0xf2b84b : e.n ? UI.line : 0x2c3157, 1).strokeRoundedRect(0, 0, CELL, CELL, 10)
      const ico = sc.add.text(CELL / 2, CELL / 2 - 6, e.icon, { fontSize: '30px' }).setOrigin(0.5).setAlpha(e.n ? 1 : 0.3)
      const cnt = sc.add.text(CELL - 6, CELL - 4, `${e.n}`, { fontSize: '15px', fontStyle: 'bold', color: e.n ? UI.gold : UI.sub, stroke: '#14172b', strokeThickness: 3 }).setOrigin(1, 1)
      const cell = sc.add.container(x + CELL / 2, y + CELL / 2, [g.setPosition(-CELL / 2, -CELL / 2), ico.setPosition(0, -6), cnt.setPosition(CELL / 2 - 6, CELL / 2 - 4)]).setSize(CELL, CELL).setInteractive({ useHandCursor: true })
      cell.on('pointerup', () => { sfx.pop(); this.sel = e.id; this.rebuild() })
      root.add(cell)
    })
    if (!slice.length) root.add(txt(sc, 340, 300, this.group === 'cards' ? 'ยังไม่มีการ์ดในกระเป๋าค่ะ\n(การ์ดที่เสียบอยู่ในของไม่นับ)' : 'ยังไม่มีค่ะ', 16, UI.sub).setOrigin(0.5).setAlign('center'))
    root.add(panel(sc, 690, 120, 254, 440, UI.panel, UI.line, 12))
    const e = all.find((x) => x.id === this.sel)
    if (!e) return
    root.add(txt(sc, 702, 130, `${e.icon} ${e.name}`, 17, UI.text, true).setWordWrapWidth(232))
    root.add(txt(sc, 702, 176, `มี x${e.n}`, 20, e.n ? UI.gold : UI.sub, true))
    root.add(txt(sc, 702, 212, '📍 ได้จากไหน', 12, UI.sub, true))
    root.add(txt(sc, 702, 230, e.source, 12, UI.text).setWordWrapWidth(232))
    root.add(txt(sc, 702, 300, '🔧 ใช้ใน', 12, UI.sub, true))
    root.add(txt(sc, 702, 318, e.use, 12, UI.text).setWordWrapWidth(232))
    if (e.fodder) this.fodderButtons(root, e.fodder, s)
  }

  private fodderButtons(root: Phaser.GameObjects.Container, it: Item, s: ReturnType<typeof save>) {
    const sc = this.scene
    const owned = s.owned.includes(it.id)
    const movable = owned && !isWorn(s, it.id) && !(s.sockets?.[it.id]?.length) && gradeOf(s, it.id) <= 1 && refineOf(s, it.id) === 0 && !isBroken(s, it.id)
    root.add(button(sc, 817, 470, 230, 36, `ซื้อ ${it.price}z`, () =>
      confirm(sc, `ซื้อ ${it.name}?`, `จ่าย ${it.price}z · เหลือ ${s.zeny - it.price}z
เชื้อหลอมใช้ตีบวก/ซ่อม (ซื้อแล้วคืนเป็น zeny ไม่ได้)`, `ซื้อ ${it.price}z`, () => {
        if (s.zeny < it.price) { toast(sc, 'zeny ไม่พอค่ะ', UI.red); return }
        s.zeny -= it.price; addFodder(s, it.id); persist(); sfx.coin(); this.host.wallet(); this.rebuild()
      }), { size: 14 }).setEnabled(s.zeny >= it.price))
    root.add(button(sc, 817, 514, 230, 36, owned ? 'ย้ายจากกระเป๋า' : 'ไม่มีในกระเป๋า', () =>
      confirm(sc, `ใช้ ${it.name} เป็นเชื้อ?`, 'ของชิ้นนี้จะออกจากกระเป๋า ไปอยู่ในกองเชื้อหลอมแทน\n(ซื้อคืนที่ร้านได้ตลอด)', 'ย้ายเลย', () => {
        s.owned = s.owned.filter((id) => id !== it.id); forgetForge(s, it.id); addFodder(s, it.id); persist(); this.host.changed()
      }), { size: 13, fill: 0x5a5f8a, color: UI.text }).setEnabled(movable))
  }
}
