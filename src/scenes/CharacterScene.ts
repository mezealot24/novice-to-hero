import Phaser from 'phaser'
import { COLORS, COMBO, doubleAtkChance, DUNGEONS, type Stats } from '../data/game-data'
import { autoInfo, magicPower, skill2Info, ultInfo, type InfoRow } from '../data/skill-math'
import { skill2ById } from '../data/skill2'
import { CARD_RULES, cardIcon, cardName, EQUIP_CARDS, TIER_COLOR, type EquipCard } from '../data/cards'
import { gradeStars, gradeCap } from '../data/craft'
import { BASE_STATS, smashLv, canWear, forged, forgeTag, gradeOf, isBroken, refineOf, cardFits, CERT_SLOTS_AT, EQUIP_SLOTS, offhandLocked, slotKind, type EquipSlot, COSTUMES, gearBase, heroStats, cardStatLine, itemStatLine, splitStatLine, ITEMS, itemById, slotCount, socketed, JOB_RULES, NOVICE_PASSIVES, NOVICE_RULES, noviceLeft, noviceSpent, RACES, SKILLS, SLOTS, STAT_RULES, totalBase, wearText, type BaseStat } from '../data/meta'
import { canChangeJob, equip, persist, resetNovice, resetTree, resetTree2, save, socketCard, unsocketCard } from '../save'
import { branches2Of, tree2Spent, BRANCHES, branchesOf, lockReason, skill2Picked, nodeById, nodesOf, TALENT_RULES, talentEarned, talentFree, talentPick, talentsOf, TREE_RULES, treeSpent, type TreeNode } from '../data/tree'
import { JOB_CHANGE, JOBS, type JobId } from '../data/jobs'
import { JOB2, JOB2_RULES, PETS, type PetId } from '../data/jobs2'
import { statLines } from '../data/statInfo'
import { UNIQUE } from '../data/uniques'
import { heroPower } from '../data/power'
import { askRepick } from './JobScene'
import { button, confirm, go, panel, tabs, toast, topBar, txt, UI } from '../ui'

const BRANCH_PET: Record<string, PetId> = { bm_h: 'hawk', bm_b: 'boar', bm_w: 'wolf' } // Beastmaster ใยชั้น 2 branch -> its pet

// Character sheet: preview on the left, three tabs on the right (equipment, status, skills).
export class CharacterScene extends Phaser.Scene {
  private body?: Phaser.GameObjects.Container
  private preview?: Phaser.GameObjects.Container
  private tab = 0
  private slot: EquipSlot | 'costume' = 'weapon'
  private bagPage = 0
  private cardPage = 0
  private cardBook = false
  private bookDg = 0
  private bookV2 = false
  private skillBasic = false // skill tab: false = skill web, true = Novice skills + certificates + job
  private selNode = ''
  private showDetail = false // skill web: detail panel over the web
  private web2 = false // skill tab: show ใยชั้น 2 (2nd job)
  constructor() { super('character') }

  create(data: { tab?: number; back?: { key: string; data?: object } }) {
    this.cameras.main.setBackgroundColor(UI.night)
    this.cameras.main.fadeIn(160, 20, 23, 43)
    this.tab = data?.tab ?? 0
    const back = data?.back // v101: opened from the forge's 🃏 button -> ‹ กลับ returns there (same item on the anvil)
    topBar(this, '👤 ตัวละคร', () => (back ? go(this, back.key, back.data) : go(this, 'hub')))
    this.drawPreview()
    tabs(this, 330, 84, ['🎒 อุปกรณ์', '🃏 การ์ด', '📊 สถานะ', '✨ สกิล', '⭐ ทาเลนต์'], 112, (i) => { this.tab = i; this.redraw() }, this.tab)
  }

  private render() {
    this.body?.destroy()
    this.body = this.add.container(0, 0)
    if (this.tab === 0) this.equipTab()
    else if (this.tab === 1) this.cardTab()
    else if (this.tab === 2) this.statusTab()
    else if (this.tab === 3) (save().job === 'novice' || this.skillBasic ? this.skillTab() : this.web2 && save().job2 ? this.web2Tab() : this.webTab())
    else this.talentTab()
  }

  private redraw() { this.drawPreview(); this.render() }

  // ---------- left: hero preview + derived stats summary ----------
  private drawPreview() {
    this.preview?.destroy()
    const s = save(), c = this.add.container(0, 0)
    this.preview = c
    c.add(panel(this, 16, 70, 298, 490))
    const st = heroStats(s)
    const rows: [string, string][] = [['⚡ Hero Power', `${heroPower(s)}`], ...derivedRows(st)] // v59: the number monsters scale to
    if (this.tab === 0) {
      // equipment screen (RO style): hero sits between the gear slots, so this side is a stats panel
      c.add(txt(this, 165, 82, `${s.supporter ? '🌟 ' : ''}${s.name}`, 18, s.supporter ? UI.gold : UI.text, true).setOrigin(0.5, 0))
      c.add(txt(this, 165, 106, `${s.job2 ? `${JOB2[s.job2].icon} ${JOB2[s.job2].name}` : `${JOBS[s.job].icon} ${JOBS[s.job].name}`} · Base Lv ${s.baseLevel} · ${s.job2 ? `Job2 Lv ${s.job2Level ?? 1}` : `Job Lv ${s.jobLevel}`}`, 12, UI.sub).setOrigin(0.5, 0))
      const tot = totalBase(s)
      BASE_STATS.forEach((bs, i) => {
        const x = 26 + (i % 2) * 144, y = 128 + Math.floor(i / 2) * 26
        c.add(panel(this, x, y, 136, 22, 0x2a2f55, UI.line, 8))
        c.add(txt(this, x + 8, y + 3, bs.name, 12, UI.gold, true))
        c.add(txt(this, x + 128, y + 3, `${tot[bs.id]}`, 12, UI.text, true).setOrigin(1, 0))
      })
      rows.forEach(([k, v], i) => {
        const y = 236 + i * 20
        c.add(txt(this, 30, y, k, 12, i === 0 ? UI.gold : UI.sub, i === 0))
        c.add(txt(this, 300, y, v, 12, i === 0 ? UI.gold : UI.text, true).setOrigin(1, 0))
      })
      return
    }
    const costume = COSTUMES.find((x) => x.id === s.costume) ?? COSTUMES[0]
    c.add(this.add.image(165, 150, JOBS[s.job].tex).setScale(2.5).setTint(costume.tint))
    c.add(txt(this, 165, 216, `${s.supporter ? '🌟 ' : ''}${s.name}`, 22, s.supporter ? UI.gold : UI.text, true).setOrigin(0.5))
    c.add(txt(this, 165, 244, `${RACES[s.race].icon} ${RACES[s.race].name} · ${s.job2 ? `${JOB2[s.job2].icon} ${JOB2[s.job2].name}` : `${JOBS[s.job].icon} ${JOBS[s.job].name}`}`, 15, UI.sub).setOrigin(0.5))
    c.add(txt(this, 165, 268, `Base Lv ${s.baseLevel} · ${s.job2 ? `Job2 Lv ${s.job2Level ?? 1}/${JOB2_RULES.maxJobLevel}` : `Job Lv ${s.jobLevel}/${s.job === 'novice' ? JOB_RULES.maxJobLevel : JOB_CHANGE.classMaxJobLevel}`}`, 14, UI.text).setOrigin(0.5))
    rows.forEach(([k, v], i) => {
      const y = 288 + i * 16.2
      c.add(txt(this, 30, y, k, 12, i === 0 ? UI.gold : UI.sub, i === 0))
      c.add(txt(this, 300, y, v, 12, i === 0 ? UI.gold : UI.text, true).setOrigin(1, 0))
    })
  }

  // ---------- tab 1: equipment screen (RO style): 3 slots left, hero in the middle, 3 slots right ----------
  private equipTab() {
    const s = save(), b = this.body!
    const locked = offhandLocked(s)
    const costume = COSTUMES.find((c) => c.id === s.costume) ?? COSTUMES[0]
    // hero in the middle
    b.add(panel(this, 528, 112, 220, 196, 0x23284a, UI.line, 14))
    b.add(this.add.image(638, 186, JOBS[s.job].tex).setScale(3).setTint(costume.tint))
    const onC = this.slot === 'costume'
    b.add(button(this, 638, 284, 200, 30, `👗 ${costume.name}`, () => { this.slot = 'costume'; this.bagPage = 0; this.render() }, { size: 13, fill: onC ? COLORS.gold : 0x5a5f8a, color: onC ? UI.ink : UI.text }))
    EQUIP_SLOTS.forEach((sl, i) => {
      const x = i < 3 ? 330 : 756, y = 112 + (i % 3) * 66, on = sl.id === this.slot
      const it = itemById(s.equipped[sl.id]), n = slotCount(it, gradeOf(s, it.id)), off = sl.id === 'offhand' && locked
      const g = this.add.graphics()
      g.fillStyle(on ? 0x34396a : UI.panel, 1).fillRoundedRect(x, y, 190, 60, 12)
      g.lineStyle(on ? 3 : 2, on ? COLORS.gold : UI.line).strokeRoundedRect(x, y, 190, 60, 12)
      b.add(g)
      b.add(txt(this, x + 10, y + 4, `${sl.icon} ${sl.name}`, 11, UI.sub))
      if (n) b.add(txt(this, x + 182, y + 4, `🃏${socketed(s, it).length}/${n}`, 11, UI.gold).setOrigin(1, 0))
      const r = refineOf(s, it.id), tag = [gradeOf(s, it.id) > 1 ? (r ? `★${gradeOf(s, it.id)}` : gradeStars(gradeOf(s, it.id), gradeCap(it))) : '', r ? `+${r}` : ''].filter(Boolean).join(' ') // short when refined (slot label room)
      if (tag) b.add(txt(this, x + (n ? 140 : 182), y + 4, tag, 11, '#ffd36b').setOrigin(1, 0))
      b.add(txt(this, x + 10, y + 19, clip(`${it.icon} ${it.name}`, 15), 15, it.id.startsWith('none') ? UI.sub : UI.text, true))
      const warn = off ? '🔒 ถืออาวุธ 2 มือ (ไม่ได้ค่าพลัง)' : isBroken(s, it.id) ? '💔 แตก ไม่ได้ค่าพลัง (ซ่อมที่โรงตีเหล็ก)' : !canWear(it, s.job) ? `⚠ ${wearText(it)} เท่านั้น` : ''
      const curse = !warn && !!splitStatLine(forged(s, it), !!it.unique).curse // v88: a cursed unique reads orange with a skull
      b.add(txt(this, x + 10, y + 41, clip(warn || `${curse ? '💀' : ''}${itemStatLine(forged(s, it))}` || it.desc, 30), 10, warn ? UI.red : curse ? '#ffa06b' : UI.green))
      const z = this.add.zone(x + 95, y + 30, 190, 60).setInteractive({ useHandCursor: true })
      z.on('pointerup', () => { this.slot = sl.id; this.bagPage = 0; this.render() })
      b.add(z)
    })

    const cur = EQUIP_SLOTS.find((q) => q.id === this.slot)
    b.add(txt(this, 330, 314, this.slot === 'costume' ? '👗 ชุดที่มี (ซื้อเพิ่มที่ร้านเพชร)' : `${cur!.icon} ${cur!.name}: ของที่มีในกระเป๋า${this.slot === 'offhand' && locked ? ' · 🔒 อาวุธ 2 มือ ใส่ได้แต่ไม่ได้ค่าพลัง' : ''}`, 14, UI.sub))
    const slot = this.slot
    const list = slot === 'costume'
      ? COSTUMES.filter((c) => s.costumes.includes(c.id)).map((c) => ({ id: c.id, label: c.name, desc: 'ไม่มีค่าพลัง', worn: s.costume === c.id, tint: c.tint, other: '' }))
      : ITEMS.filter((it) => it.slot === slotKind(slot) && s.owned.includes(it.id))
        .sort((a, c) => Number(!canWear(a, s.job)) - Number(!canWear(c, s.job)))
        .map((it) => {
          // accessories: show when the item is already on the other side (wearing it here moves it over)
          const other = slot === 'acc' || slot === 'acc2' ? (s.equipped[slot === 'acc' ? 'acc2' : 'acc'] === it.id && it.id !== 'none' ? 'ใส่อีกข้าง' : '') : ''
          return { id: it.id, label: `${it.icon} ${it.name}${forgeTag(s, it.id)}`, desc: !canWear(it, s.job) ? `⚠ ${wearText(it)} เท่านั้น` : isBroken(s, it.id) ? '💔 แตก: ไม่ได้ค่าพลังจนกว่าจะซ่อม' : `${splitStatLine(forged(s, it), !!it.unique).curse ? '💀' : ''}${itemStatLine(forged(s, it))}` || it.desc, worn: s.equipped[slot] === it.id, tint: 0, off: !canWear(it, s.job), other, curse: !!it.unique && !!splitStatLine(forged(s, it)).curse }
        })
    const per = 6, pages = Math.max(1, Math.ceil(list.length / per))
    this.bagPage = Math.min(this.bagPage, pages - 1)
    if (pages > 1) {
      b.add(button(this, 700, 545, 44, 34, '◀', () => { this.bagPage--; this.render() }, { size: 15 }).setEnabled(this.bagPage > 0))
      b.add(txt(this, 745, 545, `${this.bagPage + 1}/${pages}`, 14, UI.text, true).setOrigin(0.5))
      b.add(button(this, 790, 545, 44, 34, '▶', () => { this.bagPage++; this.render() }, { size: 15 }).setEnabled(this.bagPage < pages - 1))
    }
    list.slice(this.bagPage * per, this.bagPage * per + per).forEach((it, i) => {
      const x = 330 + (i % 2) * 308, y = 336 + Math.floor(i / 2) * 58
      b.add(panel(this, x, y, 300, 52, UI.panel, it.worn ? COLORS.gold : UI.line, 10))
      if (it.tint) b.add(this.add.image(x + 24, y + 26, 'novice').setScale(0.85).setTint(it.tint))
      b.add(txt(this, x + (it.tint ? 48 : 12), y + 5, clip(it.label, 17), 15, UI.text, true))
      b.add(txt(this, x + (it.tint ? 48 : 12), y + 28, clip(it.desc, 30), 11, 'off' in it && it.off ? UI.red : 'curse' in it && it.curse ? '#ffa06b' : UI.green).setWordWrapWidth(196).setLineSpacing(0))
      b.add(button(this, x + 258, y + 26, 72, 36, it.worn ? 'ใส่อยู่' : it.other ? 'ย้ายมา' : 'ใส่', () => {
        if (slot === 'costume') s.costume = it.id
        else if (!equip(s, it.id, slot)) { toast(this, `ใส่ของยูนีคได้พร้อมกันสูงสุด ${UNIQUE.maxEquipped} ชิ้นค่ะ ถอดชิ้นอื่นก่อนนะคะ`, UI.red); return }
        persist(); this.redraw()
      }, { size: 14 }).setEnabled(!it.worn && !('off' in it && it.off)))
    })
    if (list.length <= 1) b.add(txt(this, 638, 440, slot === 'costume' ? 'ยังไม่มีชุดอื่น' : 'ยังไม่มีของชิ้นอื่น\nเก็บ zeny จากดันแล้วไปร้านค้านะคะ', 15, UI.sub).setOrigin(0.5).setAlign('center'))
    b.add(button(this, 876, 545, 140, 34, slot === 'costume' ? '💎 ร้านเพชร' : '🛒 ร้านค้า', () => go(this, slot === 'costume' ? 'gemshop' : 'shop'), { size: 15, fill: 0x5a5f8a, color: UI.text }))
  }

  // ---------- tab 2: equipment cards (design/equipment-cards.md) ----------
  private cardTab() {
    const s = save(), b = this.body!
    // worn gear + its card slots: tap a filled slot to take the card out (free)
    EQUIP_SLOTS.forEach((sl, i) => {
      const it = itemById(s.equipped[sl.id]), n = slotCount(it, gradeOf(s, it.id)), cards = socketed(s, it), y = 108 + i * 31
      b.add(panel(this, 330, y, 616, 28, UI.panel, UI.line, 8))
      b.add(txt(this, 340, y + 6, sl.icon, 13))
      b.add(txt(this, 364, y + 6, clip(`${it.icon} ${it.name}`, 16), 13, canWear(it, s.job) ? UI.text : UI.red, true))
      if (!n) b.add(txt(this, 520, y + 7, it.id.startsWith('none') ? 'ยังไม่ได้ใส่ของ' : 'ไม่มีช่องการ์ด', 12, UI.sub))
      for (let k = 0; k < n; k++) {
        const cd = cards[k], x = 610 + k * 172
        if (cd) b.add(button(this, x, y + 14, 166, 24, `${cardIcon(cd)} ${clip(cardName(cd).replace(/^การ์ด(มินิบอส| MVP)?/, ''), 11)}  ✕`, () => {
          unsocketCard(s, it.id, k); persist(); toast(this, `ถอด${cardName(cd)}กลับเข้ากระเป๋าแล้ว`); this.redraw()
        }, { size: 12, fill: 0x5a5f8a, color: TIER_COLOR[cd.tier] }))
        else b.add(txt(this, x, y + 14, '[ ช่องว่าง ]', 12, UI.sub).setOrigin(0.5))
      }
    })
    b.add(button(this, 860, 306, 168, 30, this.cardBook ? '🎒 การ์ดในกระเป๋า' : '📖 สมุดการ์ด', () => { this.cardBook = !this.cardBook; this.cardPage = 0; this.render() }, { size: 14, fill: 0x5a5f8a, color: UI.text }))
    if (this.cardBook) this.cardBookView(); else this.cardBagView()
  }

  private cardBagView() {
    const s = save(), b = this.body!
    const bag = s.cards ?? {}
    const list = EQUIP_CARDS.filter((cd) => (bag[cd.id] ?? 0) > 0)
    b.add(txt(this, 330, 298, 'การ์ดในกระเป๋า · กด "ใส่" = ใส่ช่องว่างแรกที่การ์ดนี้ใส่ได้', 13, UI.sub))
    if (!list.length) { b.add(txt(this, 640, 420, 'ยังไม่มีการ์ดในกระเป๋าค่ะ\nล้มมอนในดันแล้วมีโอกาสได้การ์ดของมอนตัวนั้น\n(ตีตัวเดิมไปเรื่อยๆ ยังไงก็ได้แน่นอน)', 15, UI.sub).setOrigin(0.5).setAlign('center')); return }
    const per = 6, pages = Math.ceil(list.length / per)
    this.cardPage = Math.min(this.cardPage, pages - 1)
    if (pages > 1) {
      b.add(button(this, 700, 548, 44, 30, '◀', () => { this.cardPage--; this.render() }, { size: 15 }).setEnabled(this.cardPage > 0))
      b.add(txt(this, 745, 548, `${this.cardPage + 1}/${pages}`, 14, UI.text, true).setOrigin(0.5))
      b.add(button(this, 790, 548, 44, 30, '▶', () => { this.cardPage++; this.render() }, { size: 15 }).setEnabled(this.cardPage < pages - 1))
    }
    list.slice(this.cardPage * per, this.cardPage * per + per).forEach((cd, i) => {
      const x = 330 + (i % 2) * 310, y = 326 + Math.floor(i / 2) * 70
      // first worn item this card fits that still has a free slot (armor cards also fit headgear + off-hand)
      const fits = EQUIP_SLOTS.map((q) => itemById(s.equipped[q.id])).filter((w) => cardFits(cd, w) && canWear(w, s.job))
      const it = fits.find((w) => slotCount(w, gradeOf(s, w.id)) > socketed(s, w).length) ?? fits[0] ?? itemById(s.equipped[cd.slot === 'acc' ? 'acc' : 'armor'])
      const free = slotCount(it, gradeOf(s, it.id)) - socketed(s, it).length
      b.add(panel(this, x, y, 302, 64, UI.panel, Phaser.Display.Color.HexStringToColor(TIER_COLOR[cd.tier]).color, 10))
      b.add(txt(this, x + 10, y + 5, `${cardIcon(cd)} ${clip(cardName(cd), 20)} ×${bag[cd.id]}`, 14, TIER_COLOR[cd.tier], true))
      b.add(txt(this, x + 10, y + 25, `${SLOTS.find((q) => q.id === cd.slot)!.icon} ${clip(cardStatLine(cd), 70)}`, 10, UI.green).setWordWrapWidth(212).setLineSpacing(0))
      b.add(button(this, x + 262, y + 18, 70, 28, 'ใส่', () => {
        if (!socketCard(s, it.id, cd.id, slotCount(it, gradeOf(s, it.id)))) { toast(this, slotCount(it, gradeOf(s, it.id)) ? 'ช่องเต็มแล้ว ถอดการ์ดเก่าก่อนนะคะ' : `${it.name} ไม่มีช่องการ์ดค่ะ`, UI.red); return }
        persist(); toast(this, `ใส่${cardName(cd)}ใน ${it.name} แล้ว!`); this.redraw()
      }, { size: 14 }).setEnabled(free > 0))
      const sell = CARD_RULES.sell[cd.tier]
      b.add(button(this, x + 262, y + 48, 70, 24, `ขาย ${sell}z`, () =>
        confirm(this, `ขาย${cardName(cd)} 1 ใบ?`, `ได้ ${sell} zeny · สมุดการ์ดยังจำไว้ ไม่หาย`, 'ขาย', () => {
          bag[cd.id]--; if (bag[cd.id] <= 0) delete bag[cd.id]
          s.zeny += sell; persist(); this.redraw()
        }), { size: 11, fill: 0x5a5f8a, color: UI.text }))
    })
  }

  private cardBookView() {
    const s = save(), b = this.body!
    const seen = new Set(s.cardSeen ?? [])
    b.add(txt(this, 330, 298, `สมุดการ์ด · เจอแล้ว ${EQUIP_CARDS.filter((cd) => seen.has(cd.id)).length}/${EQUIP_CARDS.length} ใบ`, 13, UI.sub))
    DUNGEONS.forEach((dg, i) => {
      const many = DUNGEONS.length > 6 // v78 D7-D10: 10 tabs must end before the การ์ดสายอาชีพ button (x 665)
      b.add(button(this, many ? 344 + i * 33 : 352 + i * 56, 334, many ? 31 : 50, 28, many ? `D${i + 1}` : `ดัน${i + 1}`, () => { this.bookDg = i; this.render() }, { size: 12, fill: i === this.bookDg ? COLORS.gold : 0x5a5f8a, color: i === this.bookDg ? UI.ink : UI.text }))
    })
    const dg = DUNGEONS[this.bookDg]
    b.add(button(this, 720, 334, 110, 28, this.bookV2 ? 'การ์ดหลัก' : 'การ์ดสายอาชีพ', () => { this.bookV2 = !this.bookV2; this.render() }, { size: 12, fill: 0x5a5f8a, color: UI.text }))
    b.add(txt(this, 940, 334, dg.name, 13, UI.gold, true).setOrigin(1, 0.5))
    const list: EquipCard[] = EQUIP_CARDS.filter((cd) => cd.dungeon === dg.id && !!cd.v2 === this.bookV2)
    list.forEach((cd, i) => {
      const x = 330 + (i % 3) * 206, y = 354 + Math.floor(i / 3) * 62, got = seen.has(cd.id)
      b.add(panel(this, x, y, 200, 56, got ? UI.panel : 0x1d2140, got ? Phaser.Display.Color.HexStringToColor(TIER_COLOR[cd.tier]).color : UI.line, 8))
      b.add(txt(this, x + 8, y + 4, got ? `${cardIcon(cd)} ${clip(cardName(cd), 17)}` : `❓ ${cd.tier === 'normal' ? '???' : cd.tier === 'mini' ? '??? (มินิบอส)' : '??? (บอส)'}`, 13, got ? TIER_COLOR[cd.tier] : UI.sub, true))
      b.add(txt(this, x + 8, y + 25, got ? `${SLOTS.find((q) => q.id === cd.slot)!.icon} ${clip(cardStatLine(cd), 30)}` : `ดรอปใน${dg.name}`, 10, got ? UI.green : UI.sub))
      if (got && cd.forJobs) b.add(txt(this, x + 8, y + 39, clip(`เหมาะกับ ${cd.forJobs}`, 30), 10, UI.sub))
    })
  }

  // ---------- tab 3: base stats ----------
  private statusTab() {
    const s = save(), b = this.body!
    const total = totalBase(s), gear = gearBase(s)
    b.add(txt(this, 330, 112, `แต้มสถานะเหลือ: ${s.statPoints}`, 20, s.statPoints ? UI.gold : UI.sub, true))
    b.add(txt(this, 330, 138, `ได้ ${STAT_RULES.pointsPerLevel} แต้มทุก Base Lv · รีเซ็ตฟรีได้ตลอด`, 14, UI.sub))
    BASE_STATS.forEach((bs, i) => {
      const y = 166 + i * 56
      b.add(panel(this, 330, y, 600, 50, UI.panel, UI.line, 10))
      b.add(txt(this, 344, y + 6, bs.name, 19, UI.gold, true))
      b.add(txt(this, 344, y + 30, bs.role, 12, UI.sub))
      const raceB = total[bs.id] - s.stats[bs.id] - gear[bs.id], gearB = gear[bs.id]
      b.add(txt(this, 404, y + 11, `${total[bs.id]}`, 22, UI.text, true))
      if (raceB) b.add(txt(this, 436, y + 8, `${raceB > 0 ? '+' : ''}${raceB} เผ่า`, 10, raceB > 0 ? UI.green : UI.red))
      if (gearB) b.add(txt(this, 436, y + 26, `+${gearB} ของ`, 10, '#7fd7ff'))
      this.statDesc(b, bs.id, s.job, total[bs.id], 482, y + 4, 322, 44)
      const add = (n: number) => {
        n = Math.min(n, s.statPoints, STAT_RULES.max - s.stats[bs.id])
        if (n <= 0) return
        s.stats[bs.id] += n; s.statPoints -= n; persist(); this.redraw()
      }
      b.add(button(this, 838, y + 25, 52, 36, '+1', () => add(1), { size: 16 }).setEnabled(s.statPoints > 0))
      b.add(button(this, 896, y + 25, 52, 36, '+5', () => add(5), { size: 16 }).setEnabled(s.statPoints > 1))
    })
    b.add(button(this, 860, 132, 140, 38, '↺ รีเซ็ตแต้ม', () => {
      const spent = Object.values(s.stats).reduce((a, v) => a + v - STAT_RULES.start, 0)
      if (!spent) { toast(this, 'ยังไม่ได้ลงแต้มเลยค่ะ', UI.sub); return }
      confirm(this, 'รีเซ็ตแต้มสถานะ?', `คืน ${spent} แต้มให้ลงใหม่ ฟรี ไม่เสียอะไรค่ะ`, 'รีเซ็ต', () => {
        for (const k of Object.keys(s.stats) as (keyof typeof s.stats)[]) s.stats[k] = STAT_RULES.start
        s.statPoints += spent; persist(); this.redraw()
      })
    }, { size: 15, fill: 0x5a5f8a, color: UI.text }))
  }

  /** Stat description: generic lines (light) + current-class lines (gold); shrinks the font until it fits the row. */
  private statDesc(b: Phaser.GameObjects.Container, stat: BaseStat, job: JobId, total: number, x: number, y: number, w: number, h: number) {
    const { generic, cls } = statLines(stat, job, total)
    for (const size of [12, 11, 10, 9]) {
      const g = txt(this, x, y, generic.join(' · '), size, '#d8d4f0').setWordWrapWidth(w).setLineSpacing(0)
      const c = cls.length ? txt(this, x, y + g.height, `${JOBS[job].icon} ${cls.join(' · ')}`, size, UI.gold).setWordWrapWidth(w).setLineSpacing(0) : undefined
      if (g.height + (c?.height ?? 0) <= h || size === 9) {
        const pad = Math.max(0, (h - g.height - (c?.height ?? 0)) / 2) // center vertically in the row
        g.y += pad; if (c) c.y += pad
        b.add(g); if (c) b.add(c)
        return
      }
      g.destroy(); c?.destroy()
    }
  }

  // ---------- tab 3: skills, passives, talents ----------
  private skillTab() {
    const s = save(), b = this.body!
    const novice = s.job === 'novice', left = noviceLeft(s.skills), spent = noviceSpent(s.skills)
    b.add(txt(this, 330, 116, `แต้มโนวิส: ${left}/${NOVICE_RULES.points}`, 20, left ? UI.gold : UI.sub, true))
    b.add(txt(this, 330, 144, novice ? `ฟรี ${NOVICE_RULES.points} แต้มตั้งแต่เริ่ม · 💢 ทุบ เลเวลขึ้นเองตาม Job Lv` : 'สกิลโนวิสติดตัวไปด้วย · สกิลอาชีพอยู่ใน 🕸️ ใยสกิล', 14, UI.sub))
    if (!novice) b.add(button(this, 885, 124, 120, 30, '🕸️ ใยสกิล', () => { this.skillBasic = false; this.render() }, { size: 13 }))
    b.add(button(this, novice ? 870 : 755, 124, 120, 30, `↺ รีเซ็ต 💎${NOVICE_RULES.resetGems}`, () => {
      if (s.gems < NOVICE_RULES.resetGems) { toast(this, `เพชรไม่พอ ต้องใช้ 💎${NOVICE_RULES.resetGems} (มี ${s.gems})`, UI.sub); return }
      confirm(this, '↺ รีเซ็ตสกิลโนวิส?', `คืนแต้มโนวิสทั้ง ${spent} แต้ม\nจ่าย 💎${NOVICE_RULES.resetGems}`, 'รีเซ็ต', () => {
        if (resetNovice(s)) { toast(this, `คืน ${spent} แต้มแล้ว`); this.redraw() }
      })
    }, { size: 12, fill: 0x5a5f8a, color: UI.text }).setEnabled(spent > 0))

    // 💢 ทุบ (novice only): v86 levels itself with Job Lv (meta smashLv), one slim row
    let gy = 168
    if (novice) {
      const sm = SKILLS.find((x) => x.id === 'smash')!, lv = smashLv(s.jobLevel)
      b.add(panel(this, 330, 164, 600, 36, UI.panel, UI.line, 10))
      b.add(txt(this, 342, 172, `${sm.icon} ${sm.name}  Lv ${lv}/${sm.max}`, 14, UI.text, true))
      b.add(txt(this, 520, 174, `${sm.desc(lv)} · เลเวลขึ้นเองตาม Job Lv`, 10, UI.green).setWordWrapWidth(400))
      gy = 206
    }
    // 6 novice passives: 2 columns x 3 rows, paid from the free novice pool
    NOVICE_PASSIVES.forEach((sk, i) => {
      const w = 297, h = 44, x = 330 + (i % 2) * (w + 6), y = gy + Math.floor(i / 2) * (h + 5)
      const lv = s.skills[sk.id] ?? 0
      b.add(panel(this, x, y, w, h, UI.panel, lv ? COLORS.gold : UI.line, 10))
      b.add(txt(this, x + 10, y + 4, `${sk.icon} ${sk.name}`, 14, UI.text, true))
      b.add(txt(this, x + 236, y + 6, `${lv}/${sk.max}`, 12, lv ? UI.gold : UI.sub, true).setOrigin(1, 0))
      b.add(txt(this, x + 10, y + 25, sk.desc(Math.max(1, lv)), 10, lv ? UI.green : UI.sub).setWordWrapWidth(226))
      b.add(button(this, x + 268, y + h / 2, 46, 30, lv ? '+1' : 'เรียน', () => {
        if (noviceLeft(s.skills) <= 0 || (s.skills[sk.id] ?? 0) >= sk.max) return
        s.skills[sk.id] = (s.skills[sk.id] ?? 0) + 1; persist(); this.redraw()
      }, { size: 12 }).setEnabled(left > 0 && lv < sk.max))
    })

    // certificate slots (passive slots by Base Lv) + talents, locked until job change
    const y0 = 372
    b.add(txt(this, 330, y0, '🎖️ ช่องใบรับรอง (Passive พิเศษ) · เปิดตาม Base Lv', 16, UI.text, true))
    CERT_SLOTS_AT.forEach((lv, i) => {
      const x = 330 + i * 152, open = s.baseLevel >= lv
      b.add(panel(this, x, y0 + 28, 144, 56, open ? 0x2a3b5a : 0x1d2140, open ? COLORS.gold : UI.line, 10))
      b.add(txt(this, x + 72, y0 + 56, open ? 'ว่าง\n(เร็วๆ นี้)' : `🔒 Base Lv ${lv}`, 12, open ? UI.gold : UI.sub).setOrigin(0.5).setAlign('center'))
    })
    b.add(txt(this, 330, y0 + 100, '🌳 ทาเลนต์ & เปลี่ยนอาชีพ', 16, UI.text, true))
    if (canChangeJob(s) || s.job !== 'novice') {
      b.add(txt(this, 330, y0 + 126, s.job === 'novice' ? 'ล้มบอสดันแรกแล้ว! ไปเลือกอาชีพได้เลย' : `ลงแต้มสกิลอาชีพได้ที่ 🕸️ ใยสกิล · เปลี่ยนอาชีพใหม่ได้ด้วย 💎${JOB_CHANGE.repickGems} (คืนแต้มใยสกิลครบ Job Lv คงเดิม)`, 13, UI.gold).setWordWrapWidth(420))
      b.add(button(this, 850, y0 + 132, 150, 36, s.job === 'novice' ? '🎓 อาชีพ' : `🔄 💎${JOB_CHANGE.repickGems}`, () => s.job === 'novice' ? go(this, 'job') : askRepick(this), { size: 15 }))
    } else b.add(txt(this, 330, y0 + 126, 'ปลดล็อกเมื่อล้มบอสดันแรก (ราชาเจลล็อป) · มี 5 อาชีพ: นักดาบ นักธนู จอมเวท นักบวช โจร', 13, UI.sub).setWordWrapWidth(600))
  }

  // ---------- tab 3: skill web (data/tree.ts + data/skill2.ts, design/skill-web-v1.md) ----------
  private webTab() {
    const s = save(), b = this.body!
    const job = JOBS[s.job], t = (s.jobTree ??= {})
    b.add(txt(this, 330, 112, `แต้มสกิลเหลือ: ${s.skillPoints}`, 18, s.skillPoints ? UI.gold : UI.sub, true))
    b.add(txt(this, 330, 136, `${job.icon} ลงไปแล้ว ${treeSpent(t, s.job)} · ★ ได้ ${TREE_RULES.capstones} ดวง · ทักษะ 2 ร่ายเอง · แตะโหนดเพื่อดู`, 11, UI.sub))
    b.add(button(this, 760, 124, 112, 30, '🌱 โนวิส/อาชีพ', () => { this.skillBasic = true; this.render() }, { size: 12, fill: 0x5a5f8a, color: UI.text }))
    if (s.job2) b.add(button(this, 640, 124, 120, 30, `${JOB2[s.job2].icon} ใยชั้น 2`, () => { this.web2 = true; this.selNode = ''; this.render() }, { size: 12, fill: COLORS.gold, color: UI.ink }))
    b.add(button(this, 880, 124, 96, 30, 'รีเซ็ตฟรี', () => {
      const back = resetTree(s)
      if (!back) return
      s.skillPoints += back; persist(); toast(this, `คืน ${back} แต้มแล้ว`); this.redraw()
    }, { size: 13, fill: 0x5a5f8a, color: UI.text }).setEnabled(treeSpent(t, s.job) > 0))

    // columns: ทักษะ 1 | ทักษะ 2 (x3) | Ult | core
    type Col = { group: string; cells: { n: TreeNode; row: number }[] }
    const cols: Col[] = [], groups: { name: string; from: number; to: number }[] = []
    const brs = branchesOf(s.job)
    const lineCols = (line: 's1' | 'ult', name: string) => {
      const from = cols.length
      const root = nodesOf(`${s.job}_${line}`)[0]
      const subs = brs.filter((x) => x.line === line && x.id !== `${s.job}_${line}`)
      cols.push({ group: name, cells: [{ n: root, row: 0 }] })
      subs.forEach((br, i) => {
        const cells = nodesOf(br.id).map((n) => ({ n, row: n.tier }))
        if (i === 0) cols[from].cells.push(...cells); else cols.push({ group: name, cells })
      })
      groups.push({ name, from, to: cols.length - 1 })
    }
    lineCols('s1', `${job.auto.icon} ทักษะ 1`)
    { const from = cols.length
      const s2 = nodesOf(`${s.job}_s2`), gate = s2.find((n) => !n.kind), dy = gate ? 1 : 0 // Thief: D.Strike sits above the 3 roots
      for (const r of s2.filter((n) => n.kind === 's2root')) cols.push({ group: 's2', cells: s2.filter((n) => n.s2 === r.s2).map((n) => ({ n, row: n.tier + dy })) })
      if (gate) cols[from + 1].cells.unshift({ n: gate, row: 0 })
      groups.push({ name: gate ? `${gate.icon} ${gate.name} → ทักษะ 2 (เลือก 1)` : '🔀 ทักษะ 2 (เลือก 1)', from, to: cols.length - 1 }) }
    lineCols('ult', `${job.ult.icon} Ult`)
    const core = brs.filter((x) => x.line === 'core')
    for (const br of core) { cols.push({ group: 'core', cells: nodesOf(br.id).map((n, i) => ({ n, row: i })) }); groups.push({ name: `${br.icon} ${br.name}`, from: cols.length - 1, to: cols.length - 1 }) } // one header per core column

    const gap = 6, x0 = 330, wAll = 620
    const cw = Math.min(118, (wAll - gap * (cols.length - 1)) / cols.length), nw = cw, nh = 50, top = 176, rh = 62
    const cx = (i: number) => x0 + i * (cw + gap)
    for (const g of groups) {
      const gx = cx(g.from), gw = cx(g.to) + cw - gx
      b.add(panel(this, gx - 3, 150, gw + 6, 344, 0x1d2140, UI.line, 8))
      b.add(txt(this, gx + 4, 155, g.name, 11, UI.gold, true).setWordWrapWidth(gw))
    }
    if (!this.selNode || !nodeById(this.selNode) || !cols.some((c) => c.cells.some((q) => q.n.id === this.selNode))) this.selNode = cols[0].cells[0].n.id
    const pos = new Map<string, { x: number; y: number }>()
    cols.forEach((c, i) => c.cells.forEach((q) => pos.set(q.n.id, { x: cx(i), y: top + q.row * rh })))
    // edges first (parent bottom -> child top)
    const g = this.add.graphics(); b.add(g)
    for (const [id, p] of pos) {
      const n = nodeById(id)!, pp = n.parent ? pos.get(n.parent) : undefined
      if (!pp) continue
      g.lineStyle(3, (t[id] ?? 0) > 0 ? COLORS.gold : UI.line, 1).lineBetween(pp.x + nw / 2, pp.y + nh, p.x + nw / 2, p.y)
    }
    for (const [id, p] of pos) {
      const n = nodeById(id)!, lv = t[id] ?? 0, why = lockReason(t, s.job, n), open = !why || why === 'เต็มแล้ว'
      const star = n.tier === 4 || n.kind === 's2star', sel = id === this.selNode
      b.add(panel(this, p.x, p.y, nw, nh, lv ? 0x2a3b5a : open ? UI.panel : 0x161a33, sel ? 0xffffff : star ? COLORS.gold : lv ? 0x7fd7ff : UI.line, 10))
      b.add(txt(this, p.x + 6, p.y + 4, `${star ? '★' : ''}${n.icon}`, 17, UI.text))
      b.add(txt(this, p.x + nw - 6, p.y + 6, `${lv}/${n.max}`, 11, lv ? UI.gold : UI.sub, true).setOrigin(1, 0))
      b.add(txt(this, p.x + 6, p.y + 30, clip(n.name, Math.max(5, Math.floor(nw / 11))), 11, open ? UI.text : UI.sub))
      const z = this.add.zone(p.x, p.y, nw, nh).setOrigin(0).setInteractive({ useHandCursor: true })
      z.on('pointerdown', () => { this.selNode = id; this.render() })
      b.add(z)
    }
    // detail of the selected node
    const n = nodeById(this.selNode)!, lv = t[n.id] ?? 0, why = lockReason(t, s.job, n)
    b.add(panel(this, 330, 500, 620, 70, UI.panel, COLORS.gold, 10))
    b.add(txt(this, 342, 505, `${n.icon} ${n.name}  ${lv}/${n.max}${n.kind === 's2root' ? '  · ทักษะ 2' : ''}`, 15, UI.gold, true))
    const now = lv ? n.desc(lv) : n.desc(1)
    const next = lv && lv < n.max ? `  → Lv ${lv + 1}: ${n.desc(lv + 1)}` : ''
    b.add(txt(this, 342, 527, `${lv ? '' : 'Lv 1: '}${now}${next}`, 11, UI.green).setWordWrapWidth(400))
    if (why && why !== 'เต็มแล้ว') b.add(txt(this, 342, 553, `🔒 ${why}`, 11, UI.sub))
    b.add(button(this, 900, 535, 84, 40, lv ? '+1' : 'เรียน', () => {
      if (s.skillPoints <= 0 || lockReason(t, s.job, n)) return
      t[n.id] = (t[n.id] ?? 0) + 1; s.skillPoints--; persist(); this.redraw()
    }, { size: 16 }).setEnabled(s.skillPoints > 0 && !why))
    b.add(button(this, 806, 535, 96, 32, this.showDetail ? '✕ ปิด' : '📋 รายละเอียด', () => { this.showDetail = !this.showDetail; this.render() }, { size: 12, fill: this.showDetail ? COLORS.gold : 0x5a5f8a, color: this.showDetail ? UI.ink : UI.text }))
    if (this.showDetail) this.detailPanel(n)
  }

  // ---------- tab 3b: ใยชั้น 2 (2nd job, data/trees2/, design/second-jobs-v1.md) ----------
  private web2Tab() {
    const s = save(), b = this.body!, j2 = JOB2[s.job2!], t = (s.job2Tree ??= {}), pts = s.job2Points ?? 0
    b.add(txt(this, 330, 114, `${j2.icon} ${j2.name} · แต้มเหลือ ${pts}`, 15, pts ? UI.gold : UI.sub, true))
    b.add(txt(this, 330, 136, `Job2 Lv ${s.job2Level ?? 1}/${JOB2_RULES.maxJobLevel} · ${j2.signature.icon} ${j2.signature.name} ติดตัว · ★ ได้ 2 ดวง`, 11, UI.sub))
    b.add(button(this, 640, 124, 120, 30, '✨ ใยชั้น 1', () => { this.web2 = false; this.selNode = ''; this.render() }, { size: 12, fill: 0x5a5f8a, color: UI.text }))
    b.add(button(this, 768, 124, 104, 30, `🔄 สาย 💎${JOB2_RULES.repickGems}`, () => go(this, 'job', { job2: true }), { size: 12, fill: 0x4a5a8a, color: UI.text }))
    b.add(button(this, 880, 124, 96, 30, 'รีเซ็ตฟรี', () => {
      const back = resetTree2(s)
      if (!back) return
      s.job2Points = pts + back; persist(); toast(this, `คืน ${back} แต้มแล้ว`); this.redraw()
    }, { size: 13, fill: 0x5a5f8a, color: UI.text }).setEnabled(tree2Spent(t, j2.id) > 0))
    const brs = branches2Of(j2.id)
    const cols = brs.map((br) => nodesOf(br.id))
    const gap = 8, x0 = 330, cw = (620 - gap * (cols.length - 1)) / cols.length, nh = 50, top = 176, rh = 72
    if (!this.selNode || !cols.some((c) => c.some((n) => n.id === this.selNode))) this.selNode = cols[0][0].id
    const g = this.add.graphics(); b.add(g)
    const pos = new Map<string, { x: number; y: number }>()
    cols.forEach((c, i) => {
      const x = x0 + i * (cw + gap), br = brs[i]
      b.add(panel(this, x - 3, 150, cw + 6, 344, 0x1d2140, UI.line, 8))
      b.add(txt(this, x + 4, 155, `${br.icon} ${br.name}`, 11, UI.gold, true).setWordWrapWidth(cw))
      c.forEach((n) => pos.set(n.id, { x, y: top + (n.kind ? 0 : n.tier - 1) * rh })) // roots and tier 1 share the top row
      const pet = j2.id === 'beastmaster' ? BRANCH_PET[br.id] : undefined // 🐺 Beastmaster: pick the companion under its branch (free)
      if (pet) {
        const cur = (s.pet ?? 'hawk') === pet, evo = (t[`${br.id}4`] ?? 0) > 0, narrow = cw < 110 // v82: 7 columns -> icon-only label
        const label = narrow ? `${cur ? '✅' : '🐾'} ${PETS[pet].icon}` : cur ? `✅ คู่หู: ${PETS[pet].icon} ${evo ? PETS[pet].evo : PETS[pet].name}` : `🐾 เลือก ${PETS[pet].icon} ${PETS[pet].name}`
        b.add(button(this, x + cw / 2, 472, cw - 12, 30, label, () => {
          if (cur) return
          s.pet = pet; persist(); toast(this, `คู่หู: ${PETS[pet].icon} ${PETS[pet].name} · ${PETS[pet].desc}`); this.render()
        }, { size: 12, fill: cur ? COLORS.gold : 0x4a5a8a, color: cur ? UI.ink : UI.text }))
      }
    })
    for (const [id, p] of pos) { const n = nodeById(id)!, pp = n.parent ? pos.get(n.parent) : undefined; if (pp) g.lineStyle(3, (t[id] ?? 0) > 0 ? COLORS.gold : UI.line, 1).lineBetween(pp.x + cw / 2, pp.y + nh, p.x + cw / 2, p.y) }
    for (const [id, p] of pos) {
      const n = nodeById(id)!, lv = t[id] ?? 0, why = lockReason(t, s.job, n, j2.id), open = !why || why === 'เต็มแล้ว', star = n.tier === 4, sel = id === this.selNode
      b.add(panel(this, p.x, p.y, cw, nh, lv ? 0x2a3b5a : open ? UI.panel : 0x161a33, sel ? 0xffffff : star ? COLORS.gold : lv ? 0x7fd7ff : UI.line, 10))
      b.add(txt(this, p.x + 6, p.y + 4, `${star ? '★' : ''}${n.icon}`, 17, UI.text))
      b.add(txt(this, p.x + cw - 6, p.y + 6, `${lv}/${n.max}`, 11, lv ? UI.gold : UI.sub, true).setOrigin(1, 0))
      b.add(txt(this, p.x + 6, p.y + 30, clip(n.name, Math.max(5, Math.floor(cw / 11))), 11, open ? UI.text : UI.sub))
      const z = this.add.zone(p.x, p.y, cw, nh).setOrigin(0).setInteractive({ useHandCursor: true })
      z.on('pointerdown', () => { this.selNode = id; this.render() })
      b.add(z)
    }
    const n = nodeById(this.selNode)!, lv = t[n.id] ?? 0, why = lockReason(t, s.job, n, j2.id)
    const root = n.kind === 'pow2' ? (n.branch.endsWith('_s3') ? j2.skill3 : j2.ult) : undefined
    b.add(panel(this, 330, 500, 620, 70, UI.panel, COLORS.gold, 10))
    b.add(txt(this, 342, 505, `${n.icon} ${n.name}  ${lv}/${n.max}`, 15, UI.gold, true))
    const now = lv ? n.desc(lv) : n.desc(1), next = lv && lv < n.max ? `  → Lv ${lv + 1}: ${n.desc(lv + 1)}` : ''
    b.add(txt(this, 342, 527, `${root ? `${root.desc} · ` : ''}${lv ? '' : 'Lv 1: '}${now}${next}`, 10, UI.green).setWordWrapWidth(450))
    if (why && why !== 'เต็มแล้ว') b.add(txt(this, 800, 505, `🔒 ${why}`, 11, UI.sub).setWordWrapWidth(140))
    b.add(button(this, 900, 540, 84, 36, lv ? '+1' : 'เรียน', () => {
      if ((s.job2Points ?? 0) <= 0 || lockReason(t, s.job, n, j2.id)) return
      t[n.id] = (t[n.id] ?? 0) + 1; s.job2Points = (s.job2Points ?? 0) - 1; persist(); this.redraw()
    }, { size: 16 }).setEnabled(pts > 0 && !why))
  }

  /** Skill detail (Q 2026-11-04): the node's real numbers with the hero's current stats, now vs one more level. */
  private detailPanel(n: TreeNode) {
    const s = save(), b = this.body!, t = s.jobTree ?? {}, lv = t[n.id] ?? 0
    const d = nodeDetail(s, n)
    const x = 330, y = 150, w = 620, h = 344
    b.add(this.add.rectangle(x - 3, y, w + 6, h, 0x141834, 1).setOrigin(0)) // opaque: hide the web behind
    b.add(panel(this, x - 3, y, w + 6, h, 0x141834, COLORS.gold, 10))
    const block = this.add.zone(x - 3, y, w + 6, h).setOrigin(0).setInteractive() // the web under the panel stays untouchable
    b.add(block)
    b.add(txt(this, x + 10, y + 8, `${n.icon} ${n.name} · รายละเอียด`, 15, UI.gold, true))
    b.add(txt(this, x + 10, y + 30, d.note, 10, UI.sub).setWordWrapWidth(w - 20).setLineSpacing(0))
    const c1 = x + 300, c2 = x + 460, top = y + 58
    b.add(txt(this, c1, top, lv ? `ตอนนี้ (Lv ${lv})` : 'ตอนนี้ (ยังไม่เรียน)', 12, UI.text, true))
    b.add(txt(this, c2, top, lv < n.max ? `Lv ${lv + 1}` : 'เต็มแล้ว', 12, lv < n.max ? UI.green : UI.sub, true))
    const rows = d.rows.slice(0, 13)
    rows.forEach((r, i) => {
      const ry = top + 22 + i * 20
      if (r.section) { b.add(txt(this, x + 10, ry, r.label, 12, UI.gold, true)); return }
      const changed = r.next !== undefined && r.next !== r.now
      b.add(txt(this, x + 18, ry, clip(r.label, 40), 11, '#d8d4f0'))
      b.add(txt(this, c1, ry, clip(r.now, 30), 11, UI.text))
      if (r.next !== undefined) b.add(txt(this, c2, ry, clip(r.next, 30), 11, changed ? UI.green : UI.sub, changed))
    })
    if (!rows.length) b.add(txt(this, x + 10, top + 24, 'โหนดนี้เปลี่ยนการทำงานในการต่อสู้ ดูคำอธิบายด้านล่างนะคะ', 12, UI.sub))
  }

  // ---------- tab 4: talents (4 tiers by Job Lv, pick 1 of 3, free swap in town) ----------
  private talentTab() {
    const s = save(), b = this.body!
    if (s.job === 'novice') {
      b.add(txt(this, 330, 130, '⭐ ทาเลนต์เปิดหลังเปลี่ยนอาชีพ', 20, UI.gold, true))
      b.add(txt(this, 330, 166, `4 ชั้น เปิดที่ Job Lv ${TALENT_RULES.rowsAt.join(' / ')} · ชั้นละเลือก 1 จาก 3\nใช้แต้มทาเลนต์ (แยกจากแต้มสกิล) ได้ 1 แต้มทุก ${TALENT_RULES.pointEveryJobLv} Job Lv · รีเซ็ตฟรีในเมือง`, 14, UI.sub))
      return
    }
    const t = (s.jobTalents ??= {})
    const free = talentFree(t, s.jobLevel)
    b.add(txt(this, 330, 114, `⭐ แต้มทาเลนต์เหลือ: ${free}`, 18, free > 0 ? UI.gold : UI.sub, true))
    b.add(txt(this, 540, 118, `ได้ ${talentEarned(s.jobLevel)} จาก Job Lv ${s.jobLevel} · กดเลือก = ลง/อัปแรงก์`, 12, UI.sub))
    b.add(button(this, 885, 124, 90, 30, 'รีเซ็ตฟรี', () => {
      s.jobTalents = {}; persist(); toast(this, 'คืนแต้มทาเลนต์แล้ว'); this.redraw()
    }, { size: 13, fill: 0x5a5f8a, color: UI.text }).setEnabled(Object.keys(t).length > 0))
    TALENT_RULES.rowsAt.forEach((lv, i) => {
      const row = i + 1, y = 144 + i * 104, open = s.jobLevel >= lv
      const opts = talentsOf(s.job, row)
      const cur = talentPick(t, row)
      b.add(txt(this, 330, y, `ชั้น ${row} · Job Lv ${lv}${open ? '' : ' 🔒'}`, 14, open ? UI.text : UI.sub, true))
      if (!opts.length) { b.add(txt(this, 330, y + 26, 'กำลังออกแบบ (เร็วๆ นี้)', 12, UI.sub)); return }
      const cw = (600 - 2 * 10) / 3
      opts.slice(0, 3).forEach((o, k) => {
        const x = 330 + k * (cw + 10), picked = cur?.id === o.id
        const rank = picked ? Math.min(cur!.rank, o.max) : 0
        b.add(panel(this, x, y + 20, cw, 76, picked ? 0x2a3b5a : open ? UI.panel : 0x1d2140, picked ? COLORS.gold : UI.line, 10))
        b.add(txt(this, x + 8, y + 24, `${o.icon} ${o.name}  ${rank}/${o.max}`, 13, open ? UI.text : UI.sub, true))
        b.add(txt(this, x + 8, y + 43, o.desc(Math.max(1, Math.min(rank + (rank < o.max ? 1 : 0), o.max))), 11, open ? UI.green : UI.sub).setWordWrapWidth(cw - 16))
        // switching inside a row refunds the old pick's ranks, so the cost is 1 TP either way
        const refund = picked ? 0 : cur?.rank ?? 0
        const can = open && rank < o.max && free + refund >= 1
        if (can) {
          const hit = this.add.zone(x, y + 20, cw, 76).setOrigin(0).setInteractive({ useHandCursor: true })
          hit.on('pointerup', () => { t[String(row)] = { id: o.id, rank: rank + 1 }; persist(); this.redraw() })
          b.add(hit)
        }
      })
    })
  }

}

export function derivedRows(st: Stats): [string, string][] {
  const pct = (n: number) => `${Math.round(n * 100)}%`
  return [
    ['HP', `${Math.round(st.maxHp)}`],
    ['P.ATK (ต่ำ~สูง)', `${Math.round(st.atk * st.minPct)}~${Math.round(st.atk)}`],
    ['M.ATK / พลังเวท (70%M+30%P)', `${Math.round(st.matk)} / ${Math.round(magicPower(st))}`], // พร v2: magic hits use magic power
    ['ดาเมจสกิลกายภาพ', `+${(st.pskill * 100).toFixed(1)}%`],
    ['P.DEF / M.DEF', `${st.def.toFixed(1)} (-${Math.round(100 - 10000 / (100 + st.def))}%) / ${pct(st.mdef)}`],
    ['Hit / Flee', `${Math.round(st.hit)} / ${Math.round(st.flee)}`],
    ['คริ / ต้านทาน', `${(st.crit * 100).toFixed(1)}% / ${pct(st.tenacity)}`],
    ['สวนกลับ / คอมโบ', `${pct(st.counter)} / ${pct(st.combo)} ต่อ${COMBO.baseCount + st.comboCount}${st.comboDmg ? ` ดาเมจ+${pct(st.comboDmg)}` : ''}`], // combo rework: chain length + Combo DMG%
    ['ความเร็วเทิร์น', `${(st.aspd / 1.6 * 10).toFixed(1)}`],
    ['ฟื้น HP / ฮีลแรง', `${(st.regen * 1.5).toFixed(2)}%/เทิร์น · +${pct(st.healAmp)}`],
    ['ดูดเลือด / สกิล / หลบฟื้น', `${pct(st.lifesteal)} / ${pct(st.spellVamp)} / ${(st.dodgeHeal * 100).toFixed(1)}%`],
    ['ดาเมจคริ / โล่ต้นเวฟ', `${pct(st.critMul)} / ${pct(st.waveShield)}`],
    ['Max Mana / ฟื้น/เทิร์น', `${Math.round(st.maxRes)} / ${Math.round(st.resRegen * 3)}`],
    ['หลบโชคดี / ดรอปหายาก', `${(st.luckyDodge * 100).toFixed(1)}% / ${(st.dropChance * 100).toFixed(1)}%`],
    ['พรตำนาน / อีเวนต์', `${(st.legendChance * 100).toFixed(1)}% / ${pct(st.eventChance)}`],
  ]
}

type DetailRow = { label: string; now: string; next?: string; section?: boolean }
/** Rows for the skill detail panel: the skill this node powers (all rows), other skills / stats that this level changes. */
export function nodeDetail(s: ReturnType<typeof save>, n: TreeNode): { rows: DetailRow[]; note: string } {
  const t = s.jobTree ?? {}, lv = t[n.id] ?? 0, job = s.job
  const stOf = (tree: Record<string, number>) => heroStats({ ...s, jobTree: tree })
  const nowT = t, nextT = lv < n.max ? { ...t, [n.id]: lv + 1 } : undefined
  const stNow = stOf(nowT), stNext = nextT ? stOf(nextT) : undefined
  const line = BRANCHES.find((x) => x.id === n.branch)?.line
  const s2 = n.s2 ? skill2ById(n.s2) : undefined
  type Sec = { name: string; info: (st: Stats, tree: Record<string, number>) => InfoRow[] | null; all: boolean }
  const picked = (tree: Record<string, number>) => skill2Picked(tree, job)
  const secs: Sec[] = [
    { name: `${JOBS[job].auto.icon} ทักษะ 1: ${JOBS[job].auto.name}`, info: (st) => autoInfo(job, st), all: line === 's1' },
    { name: `${JOBS[job].ult.icon} Ult: ${JOBS[job].ult.name}`, info: (st, tree) => ultInfo(job, st, totalBase({ ...s, jobTree: tree })), all: line === 'ult' },
    { name: `${(s2 ?? picked(t))?.icon ?? '🔀'} ทักษะ 2: ${(s2 ?? picked(t))?.name ?? ''}`, all: !!s2,
      info: (st, tree) => { const k = s2 ?? picked(tree); return k && (tree[k.id] ?? 0) > 0 ? skill2Info(k, st) : null } },
  ]
  const rows: DetailRow[] = []
  for (const sec of secs) {
    const a = sec.info(stNow, nowT), z = stNext && nextT ? sec.info(stNext, nextT) : undefined
    if (!a && !z) continue
    const labels = [...new Set([...(a ?? []), ...(z ?? [])].map((r) => r.label))]
    const val = (list: InfoRow[] | null | undefined, l: string) => list?.find((r) => r.label === l)?.value ?? '−'
    const out = labels.map((l) => ({ label: l, now: a ? val(a, l) : 'ยังไม่เรียน', next: z === undefined ? undefined : val(z, l) }))
      .filter((r) => sec.all || (r.next !== undefined && r.next !== r.now))
    if (out.length) rows.push({ label: sec.name, now: '', section: true }, ...out)
  }
  if (stNext) {
    const a = derivedRows(stNow), z = derivedRows(stNext)
    if (stNow.doubleAtk !== stNext.doubleAtk) { a.push(['โอกาส Double Strike', `${Math.round(doubleAtkChance(stNow.doubleAtk) * 100)}%`]); z.push(['โอกาส Double Strike', `${Math.round(doubleAtkChance(stNext.doubleAtk) * 100)}%`]) }
    const ch = a.map(([k, v], i) => ({ label: k, now: v, next: z[i][1] })).filter((r) => r.now !== r.next)
    if (ch.length) rows.push({ label: '📊 ค่าสถานะที่เปลี่ยน', now: '', section: true }, ...ch)
  }
  return { rows, note: `คำนวณจากค่าตอนนี้: P.ATK ${Math.round(stNow.atk * stNow.minPct)}~${Math.round(stNow.atk)} · M.ATK ${Math.round(stNow.matk)} · HP ${stNow.maxHp} · ดาเมจก่อนหัก DEF มอน ไม่รวมพร/รีลิกในดัน · ตัวเลขเขียว = เปลี่ยนเมื่อลงเพิ่ม 1 แต้ม` }
}

const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + '…' : t)
