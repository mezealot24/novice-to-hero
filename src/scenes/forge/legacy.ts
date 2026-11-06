import Phaser from 'phaser'
import { COLORS, DUNGEONS, H, W } from '../../data/game-data'
import { JOBS } from '../../data/jobs'
import { canWear, gradeOf, isBroken, isTainted, itemStatLine, linesOf, refineOf, slotCount, SLOTS, wearText, type Item } from '../../data/meta'
import { craftCost, CRAFT_ITEMS, GRADE, gradeCap, gradeStars, REFINE } from '../../data/craft'
import { canAfford, canAffordAuto, FODDER, fodderFits, fodderMin, lineText, pickFodder, lineIdx, maxLocks, nextRerollCost, reroll, rerollMul, rollsOf, taintCheck, taintCost, totalZeny, tryTaint, type ForgeCost } from '../../data/refine'
import { curseById, TAINT } from '../../data/taint'
import { MAT_RULES, MATS, matById } from '../../data/materials'
import { TAINT_MAT as TAINT_MAT_ID } from '../../data/taint'
import { addFodder, canPay, equip, forgetForge, isWorn, pay, persist, save } from '../../save'
import { sfx } from '../../sfx'
import { button, confirm, panel, toast, txt, UI } from '../../ui'

// Forge (design/item-acquisition-v1.md): craft dungeon gear from materials, raise any item's grade.
// Craft and grade-ups always succeed. Refine (+1..+10) can break an item above +4; gems may ONLY repair it
// (design 3.6: never rate, break protection, mats, fodder or rerolls), and the material repair is always cheaper.
// Two exceptions: (1) Q 2026-11-06, gems lock a bonus line in the option gacha (the roll itself is zeny + mats);
// (2) Q 2026-11-07, gems skip Endless Tower floors (data/modes.ts), a pure time-saver that pays nothing.
const dgName = (id: string) => DUNGEONS.find((d) => d.id === id)?.name ?? id
const dgBoss = (id: string) => DUNGEONS.find((d) => d.id === id)?.boss ?? ''
const bonusLine = (m: object) => itemStatLine({ mod: m })

export interface LegacyHost { wallet(): void; changed(): void }
type Tab = 'craft' | 'fodder' | 'mats'

/** Pre-anvil screens that P2 keeps reachable: the craft list, fodder + materials stash, the option-gacha popup and the taint confirm.
 * P3 (OptionPanel) and P4 (TaintPanel) replace the last two, P5 the first three. Same rules, same text as before the split. */
export class LegacyForge {
  private body?: Phaser.GameObjects.Container
  private mineOnly = true
  private page = 0
  constructor(private scene: Phaser.Scene, private host: LegacyHost) {}

  /** Draw one of the stash / craft tabs (rebuilds; called on mode change and after an action). */
  show(tab: Tab) {
    this.clear()
    this.body = this.scene.add.container(0, 0)
    const b = this.body, s = save()
    if (tab === 'mats') { this.matsTab(); return }
    const all = tab === 'craft' ? this.craftList() : FODDER
    const per = tab === 'fodder' ? 12 : 6, pages = Math.max(1, Math.ceil(all.length / per))
    this.page = Math.min(this.page, pages - 1)
    const redo = () => this.show(tab)
    if (tab !== 'fodder') b.add(button(this.scene, 728, 118, 150, 40, this.mineOnly ? `${JOBS[s.job].icon} ของฉัน` : '🌐 ทั้งหมด', () => { this.mineOnly = !this.mineOnly; this.page = 0; redo() }, { size: 15, fill: 0x5a5f8a, color: UI.text }))
    b.add(button(this.scene, 832, 118, 44, 40, '◀', () => { this.page--; redo() }, { size: 16 }).setEnabled(this.page > 0))
    b.add(txt(this.scene, 884, 118, `${this.page + 1}/${pages}`, 15, UI.text, true).setOrigin(0.5))
    b.add(button(this.scene, 936, 118, 44, 40, '▶', () => { this.page++; redo() }, { size: 16 }).setEnabled(this.page < pages - 1))
    if (tab === 'fodder') {
      b.add(txt(this.scene, 24, 146, 'เชื้อหลอม = ของร้านพื้นฐาน ใช้ตีบวก/ซ่อม (ช่องเดียวกัน) · ไม่มีก็ได้ ตอนตีจะซื้อให้อัตโนมัติ (ถามก่อนเสมอ)', 13, UI.sub))
      all.slice(this.page * per, this.page * per + per).forEach((it, i) => this.fodderCard(it, 24 + (i % 3) * 308, 170 + Math.floor(i / 3) * 100))
      return
    }
    all.slice(this.page * per, this.page * per + per).forEach((it, i) => this.craftCard(it, 24 + (i % 3) * 308, 152 + Math.floor(i / 3) * 208))
    if (!all.length) b.add(txt(this.scene, 480, 330, 'ยังไม่มีสูตรสำหรับอาชีพนี้ค่ะ\nกดปุ่มกรองด้านบนเพื่อดูทุกอาชีพ', 16, UI.sub).setOrigin(0.5).setAlign('center'))
  }

  clear() { this.body?.destroy(); this.body = undefined }

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
    b.add(panel(this.scene, x, y, cw, ch, open ? UI.panel : 0x1d2140, owned ? COLORS.gold : UI.line))
    b.add(txt(this.scene, x + 14, y + 10, it.icon, 30).setAlpha(open ? 1 : 0.5))
    b.add(txt(this.scene, x + 60, y + 8, it.name, 18, UI.text, true))
    b.add(txt(this.scene, x + 60, y + 34, `ของ${dgName(c.dg)}`, 12, UI.sub))
    b.add(txt(this.scene, x + cw - 12, y + 34, wearText(it), 11, wear ? UI.sub : UI.red).setOrigin(1, 0))
    const line = txt(this.scene, x + 14, y + 56, `${itemStatLine(it)} · 🃏 ช่องการ์ด ${slotCount(it)}`, 13, '#9fe3a8', true).setWordWrapWidth(cw - 28)
    const b3 = txt(this.scene, x + 14, line.y + line.height + 2, `★3 ปลด: ${bonusLine(c.bonus[0])}`, 12, GRADE.colors[3]).setWordWrapWidth(cw - 28)
    const b5 = txt(this.scene, x + 14, b3.y + b3.height, `★5 ปลด: ${bonusLine(c.bonus[1])}`, 12, GRADE.colors[5]).setWordWrapWidth(cw - 28)
    b.add([line, b3, b5])
    const by = y + ch - 24
    if (!open) { b.add(txt(this.scene, x + cw / 2, by, `🔒 ล้ม${dgBoss(c.dg)}ก่อนถึงจะตีได้`, 14, UI.sub).setOrigin(0.5)); return }
    if (owned) { b.add(txt(this.scene, x + cw / 2, by, `✓ มีแล้ว ${gradeStars(gradeOf(s, it.id), gradeCap(it))} (อัปต่อที่แท็บอัปขั้น)`, 13, UI.green).setOrigin(0.5)); return }
    const cost = craftCost(it)
    b.add(this.costText(x + 14, by - 30, cost, cw - 28))
    b.add(button(this.scene, x + cw / 2, by, cw - 32, 34, 'ตีเลย', () => this.craft(it), { size: 16 }).setEnabled(canPay(s, cost)))
  }

  private craft(it: Item) {
    const s = save()
    if (!pay(s, craftCost(it))) { toast(this.scene, 'วัตถุดิบหรือ zeny ยังไม่พอค่ะ', UI.red); return }
    s.owned.push(it.id)
    persist(); sfx.coin()
    const wear = canWear(it, s.job)
    if (wear) confirm(this.scene, `ตีสำเร็จ! ${it.icon} ${it.name}`, 'ใส่เลยไหมคะ?', 'ใส่เลย', () => { equip(s, it.id); persist(); this.host.changed() }, 'ไว้ก่อน')
    else toast(this.scene, `ได้ ${it.name} แล้ว (ใส่ได้เมื่อเป็น ${wearText(it)})`)
    this.host.changed()
  }

  /** Option gacha (Q 2026-11-06): one roll rerolls every unlocked line at once (zeny + mats). Gems only lock a line.
   * `locked` survives re-opening after a roll, so the player can keep rolling with the same locks. */
  linesView(it: Item, locked: number[] = []) {
    const s = save(), c = this.scene.add.container(0, 0).setDepth(30000)
    const close = () => { c.destroy(); this.host.changed() }
    const again = (lk: number[]) => { c.destroy(); this.linesView(it, lk) }
    c.add(this.scene.add.rectangle(W / 2, H / 2, W, H, UI.night, 0.8).setInteractive())
    const pw = 700, ph = 420, px = W / 2 - pw / 2, py = H / 2 - ph / 2
    c.add(panel(this.scene, px, py, pw, ph, UI.panelHi, COLORS.gold))
    c.add(txt(this.scene, W / 2, py + 18, `🎁 ค่าพิเศษ ${it.icon} ${it.name} +${refineOf(s, it.id)}`, 22, UI.gold, true).setOrigin(0.5, 0))
    const lines = linesOf(s, it.id), have = lineIdx(s, it.id), maxLk = maxLocks(have.length)
    const rolls = rollsOf(s, it.id), tainted = isTainted(s, it.id)
    c.add(txt(this.scene, W / 2, py + 52, `🎲 สุ่มทีเดียวเปลี่ยนทุกบรรทัดที่ไม่ล็อก (ค่าเก่าหายทันที) · สุ่มไปแล้ว ${rolls} ครั้ง ราคา x${rerollMul(rolls).toFixed(1)}\n${maxLk ? `🔒 ล็อกได้ ${maxLk} บรรทัด จ่ายเพชรทุกครั้งที่สุ่ม (${REFINE.lockGems.slice(0, maxLk).map((g, i) => `ล็อกที่ ${i + 1}: 💎${g}`).join(' · ')})` : `🔒 ตีถึง +${REFINE.lineAt[1]} ให้มี 2 บรรทัดก่อน ถึงจะล็อกได้`}`, 12, UI.sub).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(pw - 40))
    REFINE.lineAt.forEach((at, i) => {
      const y = py + 94 + i * 88, l = lines[i], on = locked.includes(i)
      c.add(panel(this.scene, px + 20, y, pw - 40, 78, UI.panel, on ? COLORS.gold : UI.line, 10))
      c.add(txt(this.scene, px + 36, y + 10, `+${at} (${['เล็ก', 'กลาง', 'ใหญ่'][i]})`, 15, UI.sub, true))
      if (!l) { c.add(txt(this.scene, px + 36, y + 40, `ยังไม่ได้ · ตีถึง +${at} ครั้งแรกจะได้ค่าสุ่ม 1 บรรทัด`, 14, UI.sub)); return }
      c.add(txt(this.scene, px + 36, y + 38, lineText(l), 18, l.gold ? UI.gold : UI.text, true))
      const canLock = on || locked.length < maxLk
      c.add(button(this.scene, px + pw - 100, y + 39, 140, 34, on ? '🔒 ล็อกอยู่' : '🔓 ล็อก', () => again(on ? locked.filter((x) => x !== i) : [...locked, i]),
        { size: 14, fill: on ? 0xb8860b : 0x5a5f8a, color: UI.text }).setEnabled(canLock && !tainted))
    })
    const cost = nextRerollCost(s, it, locked)
    c.add(this.costText(px + 36, py + ph - 70, cost, pw - 72, locked.length ? '🔒 ' : ''))
    c.add(button(this.scene, W / 2 - 100, py + ph - 26, 180, 36, `🎲 สุ่ม ${have.length - locked.length} บรรทัด`, () => {
      if (!reroll(s, it, locked)) { toast(this.scene, 'วัตถุดิบ zeny หรือเพชรยังไม่พอค่ะ', UI.red); return }
      persist(); sfx.pop(); this.host.wallet(); again(locked)
    }, { size: 15 }).setEnabled(canAfford(s, cost) && !tainted))
    if (tainted) c.add(txt(this.scene, W / 2 - 100, py + ph - 56, '🌑 ติดคำสาปแล้ว: สุ่มบรรทัดไม่ได้อีก', 13, '#c9a8ff', true).setOrigin(0.5))
    c.add(button(this.scene, W / 2 + 100, py + ph - 26, 160, 36, 'ปิด', close, { size: 16, fill: 0x5a5f8a, color: UI.text }))
  }

  // ---------- taint (v89, design/unique-taint-tower-skip-v1.md §3) ----------
  /** One line saying what the taint did (card of a tainted item). */
  taintNote(it: Item): string {
    const t = save().taint?.[it.id]
    if (!t) return ''
    if (t.kind === 'gold') return '🌑 ติดคำสาป: ✨ ค่าพิเศษทุกบรรทัดเป็นทอง (ล็อกแล้ว)'
    if (t.kind === 'brick') return '🌑 ติดคำสาป: 💥 พัง เสียของไปหนึ่งอย่าง (ล็อกแล้ว)'
    if (t.kind === 'curse') { const c = curseById(t.curse); return c ? `🌑 ${c.icon} ${c.name}: ${itemStatLine({ mod: c.mod, pct: c.pct })}` : '🌑 ติดคำสาป (ล็อกแล้ว)' }
    return '🌑 ติดคำสาป: ไม่เกิดอะไร แต่ล็อกแล้ว'
  }

  askTaint(it: Item) {
    const s = save(), cost = taintCost(), have = s.mats?.[TAINT_MAT_ID] ?? 0
    const why = taintCheck(s, it)
    if (why === 'broken') { toast(this.scene, '💔 ซ่อมของให้เสร็จก่อนค่อยใส่คำสาปค่ะ', UI.red); return }
    if (why !== 'ok') return
    const pc = (k: keyof typeof TAINT.odds) => `${Math.round(TAINT.odds[k] * 100)}%`
    confirm(this.scene, `🌑 ใส่คำสาป ${it.name}?`,
      `⚠ ทำได้ครั้งเดียว แล้วของชิ้นนี้ถูกล็อกถาวร\n(ตีบวก · สุ่มค่าพิเศษ · อัปขั้น ไม่ได้อีก · ซ่อมได้)\n😐 ${pc('none')} ไม่เกิดอะไร · ✨ ${pc('gold')} ค่าพิเศษเป็นทอง\n💀 ${pc('curse')} ได้บรรทัดคำสาป (แรง+ข้อเสีย) · 💥 ${pc('brick')} พัง เสียค่าพิเศษ 1 บรรทัด/บวก -1\nราคา ${cost.zeny}z + 🔻x${TAINT.crystals} (มี ${have})`,
      `🌑 ลุ้น ${cost.zeny}z`, () => this.doTaint(it))
  }

  private doTaint(it: Item) {
    const s = save(), res = tryTaint(s, it)
    if (!res.ok) { toast(this.scene, res.why === 'short' ? `zeny หรือ 🔻ผลึกโลกันตร์ ยังไม่พอค่ะ (ต้อง ${TAINT.zeny}z + ${TAINT.crystals} ชิ้น)` : 'ใส่คำสาปชิ้นนี้ไม่ได้ค่ะ', UI.red); return }
    persist(); this.host.wallet()
    const lines: Record<string, string> = {
      none: '😐 ไม่เกิดอะไรขึ้น...\nแต่ของชิ้นนี้ถูกล็อกแล้วนะคะ',
      gold: res.fallback ? `✨ ไม่มีค่าพิเศษให้เปลี่ยน เลยได้บรรทัดทองใหม่ 1 บรรทัด!\n${res.gold ? res.gold.map(lineText).join(' · ') : ''}` : `✨ ค่าพิเศษทุกบรรทัดกลายเป็นทอง!\n${(res.ok && res.gold ? res.gold : []).map(lineText).join(' · ')}`,
      curse: res.curse ? `💀 ได้คำสาป ${res.curse.icon} ${res.curse.name}\n${itemStatLine({ mod: res.curse.mod, pct: res.curse.pct })}` : '',
      brick: res.lost ? `💥 พัง! เสียค่าพิเศษ ${lineText(res.lost)}` : res.refineDown ? '💥 พัง! ไม่มีค่าพิเศษให้เสีย ตีบวก -1' : '💥 พัง! แต่ไม่มีอะไรให้เสียเลย (ตีบวก +0 ไม่มีค่าพิเศษ)',
    }
    if (res.kind === 'curse') { sfx.hurt(); this.scene.cameras.main.shake(180, 0.006) } else if (res.kind === 'gold') { sfx.coin(); this.scene.cameras.main.flash(140, 255, 230, 160) } else sfx.pop()
    confirm(this.scene, `🌑 ${it.icon} ${it.name}`, lines[res.kind], 'ตกลง', () => this.host.changed(), 'ปิด')
    this.host.changed()
  }

  // ---------- fodder ----------
  private fodderCard(it: Item, x: number, y: number) {
    const s = save(), b = this.body!
    const n = s.fodder?.[it.id] ?? 0, owned = s.owned.includes(it.id)
    const movable = owned && !isWorn(s, it.id) && !(s.sockets?.[it.id]?.length) && gradeOf(s, it.id) <= 1 && refineOf(s, it.id) === 0 && !isBroken(s, it.id)
    const cw = 296, ch = 92
    b.add(panel(this.scene, x, y, cw, ch, UI.panel, n ? COLORS.gold : UI.line, 10))
    b.add(txt(this.scene, x + 10, y + 8, `${it.icon} ${it.name}`, 15, UI.text, true))
    b.add(txt(this.scene, x + cw - 10, y + 8, `🔩 x${n}`, 16, n ? UI.gold : UI.sub, true).setOrigin(1, 0))
    b.add(txt(this.scene, x + 10, y + 30, `${SLOTS.find((q) => q.id === it.slot)?.name ?? it.slot} · ${it.price}z · ใช้ได้ถึง +${it.price >= fodderMin(it.slot, 2) ? 10 : it.price >= fodderMin(it.slot, 1) ? 7 : 4} · ซ่อมได้`, 11, UI.sub))
    b.add(button(this.scene, x + 74, y + 66, 124, 30, `ซื้อ ${it.price}z`, () => {
      if (s.zeny < it.price) { toast(this.scene, 'zeny ไม่พอค่ะ', UI.red); return }
      s.zeny -= it.price; addFodder(s, it.id); persist(); sfx.coin(); this.host.wallet(); this.host.changed()
    }, { size: 13 }).setEnabled(s.zeny >= it.price))
    b.add(button(this.scene, x + cw - 74, y + 66, 124, 30, owned ? 'ย้ายจากกระเป๋า' : 'ไม่มีในกระเป๋า', () =>
      confirm(this.scene, `ใช้ ${it.name} เป็นเชื้อ?`, 'ของชิ้นนี้จะออกจากกระเป๋า ไปอยู่ในกองเชื้อหลอมแทน\n(ซื้อคืนที่ร้านได้ตลอด)', 'ย้ายเลย', () => {
        s.owned = s.owned.filter((id) => id !== it.id); forgetForge(s, it.id); addFodder(s, it.id); persist(); this.host.changed()
      }), { size: 12, fill: 0x5a5f8a, color: UI.text }).setEnabled(movable))
  }

  // ---------- materials ----------
  private matsTab() {
    const s = save(), b = this.body!
    b.add(txt(this.scene, 24, 150, 'วัตถุดิบเก็บถาวร แพ้หรือกลับเมืองกลางทางก็ไม่หายค่ะ', 15, UI.sub))
    MATS.forEach((m, i) => {
      const x = 24 + (i % 2) * 460, y = 178 + Math.floor(i / 2) * 64
      const n = s.mats?.[m.id] ?? 0
      b.add(panel(this.scene, x, y, 450, 56, UI.panel, n ? COLORS.gold : UI.line, 10))
      b.add(txt(this.scene, x + 12, y + 8, `${m.icon} ${m.name}`, 17, n ? UI.text : UI.sub, true))
      b.add(txt(this.scene, x + 438, y + 8, `x${n}`, 20, n ? UI.gold : UI.sub, true).setOrigin(1, 0))
      const mini = DUNGEONS.find((d) => d.id === m.dungeon)?.rooms.some((r) => r.mini)
      const from = m.note ?? (m.boss ? `${mini ? `มินิบอส ได้ ${MAT_RULES.mini.boss} · ` : ''}บอส${dgBoss(m.dungeon)} ได้ ${MAT_RULES.boss.boss}` : `มอนธรรมดา ${Math.round(MAT_RULES.normalRate * 100)}% · บอสให้ ${MAT_RULES.boss.common}`)
      b.add(txt(this.scene, x + 12, y + 33, m.note ? from : `${dgName(m.dungeon)}: ${from}`, 12, UI.sub))
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
    const t = txt(this.scene, x, y, prefix + parts.join(' · '), 12, ok ? UI.text : '#ffb0b0')
    if (t.width > w) t.setText(prefix + parts.map((p) => p.replace(/(\S+?)[\u0E00-\u0E7F]+ (\d+\/\d+)/u, '$1 $2').replace(/ \(เช่น [^)]+\)/u, '')).join(' · ')) // too long: icons only (names are on the วัตถุดิบ tab)
    if (t.width > w) t.setText(t.text.replace(/🔩[\u0E00-\u0E7F]+(ร้าน)?/u, '🔩')) // still too long: "✗🔩≥400z"
    if (t.width > w) t.setFontSize(11)
    return t
  }

}

/** Clip a wrapped text to a height budget, ending with "…" (keeps cards from running into their cost row). */
export function fit(t: Phaser.GameObjects.Text, maxH: number) {
  if (t.height <= maxH) return t
  let s = t.text
  while (s.length > 1 && t.height > maxH) { s = s.slice(0, -2); t.setText(s + '…') }
  return t
}
