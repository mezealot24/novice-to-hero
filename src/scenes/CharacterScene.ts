import Phaser from 'phaser'
import { COLORS, doubleAtkChance, DUNGEONS, H, W, type Stats } from '../data/game-data'
import { derivedRows } from '../data/stat-rows'
export { derivedRows }
import { autoInfo, dawnInfo, skill2Info, ultInfo, type InfoRow } from '../data/skill-math'
import { skill2ById } from '../data/skill2'
import { CARD_RULES, cardIcon, cardName, EQUIP_CARDS, TIER_COLOR, type EquipCard } from '../data/cards'
import { gradeStars, gradeCap } from '../data/craft'
import { BASE_STATS, smashLv, canWearAs, forged, forgeTag, gradeOf, isBroken, refineOf, cardFits, CERT_SLOTS_AT, EQUIP_SLOTS, offhandLocked, slotKind, type EquipSlot, COSTUMES, gearBase, heroStats, jobBonusBase, cardStatLine, itemStatLine, splitStatLine, ITEMS, itemById, slotCount, socketed, JOB_RULES, NOVICE_PASSIVES, NOVICE_RULES, noviceLeft, noviceSpent, RACES, SKILLS, SLOTS, STAT_RULES, totalBase, wearText, type BaseStat } from '../data/meta'
import { canChangeJob, canUnequip, equip, equipBlock, persist, resetNovice, resetTree, resetTree2, resetTree3, save, socketCard, unequip, unsocketCard } from '../save'
import { HYBRID_MAX_TIER, lockReason3, tree3Spent, web3Scope, branches2Of, talents2Of, tree2Spent, BRANCHES, branchesOf, lockReason, skill2Picked, nodeById, nodesOf, TALENT_RULES, talentEarned, talentFree, talentPick, talentRankText, talentsOf, TREE_RULES, treeSpent, type TreeNode } from '../data/tree'
import { JOB_CHANGE, JOBS, type JobId } from '../data/jobs'
import { JOB2, JOB2_RULES, PETS, type PetId } from '../data/jobs2'
import { activeJob3, JOB3, JOB3_RULES, job3Of } from '../data/jobs3'
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
  private showDetail = false // skill web: node detail modal open
  private modal?: Phaser.GameObjects.Container
  private web2 = false // skill tab: show ใยชั้น 2 (2nd job)
  private web3 = false // skill tab: show ใยชั้น 3 (3rd job, design/awakening-crusader-v1.md)
  private talent2 = false // v119 talent tab: show ทาเลนต์ชั้น 2
  constructor() { super('character') }

  create(data: { tab?: number; back?: { key: string; data?: object } }) {
    this.cameras.main.setBackgroundColor(UI.night)
    this.cameras.main.fadeIn(160, 20, 23, 43)
    this.tab = data?.tab ?? 0
    this.showDetail = false
    this.input.keyboard?.on('keydown-ESC', () => { if (this.showDetail) { this.showDetail = false; this.render() } })
    const back = data?.back // v101: opened from the forge's 🃏 button -> ‹ กลับ returns there (same item on the anvil)
    topBar(this, '👤 ตัวละคร', () => (back ? go(this, back.key, back.data) : go(this, 'hub')))
    this.drawPreview()
    tabs(this, 330, 84, ['🎒 อุปกรณ์', '🃏 การ์ด', '📊 สถานะ', '✨ สกิล', '⭐ ทาเลนต์'], 112, (i) => { this.tab = i; this.redraw() }, this.tab)
  }

  private render() {
    this.body?.destroy()
    this.modal?.destroy(); this.modal = undefined
    this.body = this.add.container(0, 0)
    if (this.tab === 0) this.equipTab()
    else if (this.tab === 1) this.cardTab()
    else if (this.tab === 2) this.statusTab()
    else if (this.tab === 3) (save().job === 'novice' || this.skillBasic ? this.skillTab() : this.web3 && activeJob3(save()) ? this.web3Tab() : this.web2 && save().job2 ? this.web2Tab() : this.webTab())
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
      // a 2-handed weapon takes both hands: the off-hand card shows that weapon (the off-hand piece went back to the bag)
      const twin = sl.id === 'offhand' && locked
      const it = itemById(s.equipped[twin ? 'weapon' : sl.id]), n = twin ? 0 : slotCount(it, gradeOf(s, it.id))
      const g = this.add.graphics()
      g.fillStyle(on ? 0x34396a : UI.panel, 1).fillRoundedRect(x, y, 190, 60, 12)
      g.lineStyle(on ? 3 : 2, on ? COLORS.gold : UI.line).strokeRoundedRect(x, y, 190, 60, 12)
      b.add(g)
      b.add(txt(this, x + 10, y + 4, `${sl.icon} ${sl.name}`, 11, UI.sub))
      if (n) b.add(txt(this, x + 182, y + 4, `🃏${socketed(s, it).length}/${n}`, 11, UI.gold).setOrigin(1, 0))
      const r = refineOf(s, it.id), tag = twin ? '' : [gradeOf(s, it.id) > 1 ? (r ? `★${gradeOf(s, it.id)}` : gradeStars(gradeOf(s, it.id), gradeCap(it))) : '', r ? `+${r}` : ''].filter(Boolean).join(' ') // short when refined (slot label room)
      if (tag) b.add(txt(this, x + (n ? 140 : 182), y + 4, tag, 11, '#ffd36b').setOrigin(1, 0))
      b.add(txt(this, x + 10, y + 19, clip(`${it.icon} ${it.name}`, 15), 15, it.id.startsWith('none') ? UI.sub : UI.text, true))
      const warn = twin ? '' : isBroken(s, it.id) ? '💔 แตก ไม่ได้ค่าพลัง (ซ่อมที่โรงตีเหล็ก)' : !canWearAs(it, s) ? `⚠ ${wearText(it)} เท่านั้น` : ''
      const curse = !twin && !warn && !!splitStatLine(forged(s, it), !!it.unique).curse // v88: a cursed unique reads orange with a skull
      if (twin) b.add(txt(this, x + 10, y + 41, '🔒 อาวุธ 2 มือ: ใช้ทั้งสองมือ', 10, '#ffd36b'))
      else b.add(txt(this, x + 10, y + 41, clip(warn || `${curse ? '💀' : ''}${itemStatLine(forged(s, it))}` || it.desc, 30), 10, warn ? UI.red : curse ? '#ffa06b' : UI.green))
      const z = this.add.zone(x + 95, y + 30, 190, 60).setInteractive({ useHandCursor: true })
      z.on('pointerup', () => { this.slot = sl.id; this.bagPage = 0; this.render() })
      b.add(z)
    })

    const cur = EQUIP_SLOTS.find((q) => q.id === this.slot)
    b.add(txt(this, 330, 314, this.slot === 'costume' ? '👗 ชุดที่มี (ซื้อเพิ่มที่ร้านเพชร)' : `${cur!.icon} ${cur!.name}: ของที่มีในกระเป๋า${this.slot === 'offhand' && locked ? ' · 🔒 ถืออาวุธ 2 มือ แทนมือรอง' : ''}`, 14, UI.sub))
    const slot = this.slot
    if (slot !== 'costume') b.add(button(this, 896, 314, 100, 28, '✋ ถอด', () => this.takeOff(slot), { size: 13, fill: 0x8a6fd1, color: UI.text }).setEnabled(canUnequip(s, slot)))
    const list = slot === 'costume'
      ? COSTUMES.filter((c) => s.costumes.includes(c.id)).map((c) => ({ id: c.id, label: c.name, desc: 'ไม่มีค่าพลัง', worn: s.costume === c.id, tint: c.tint, other: '' }))
      : ITEMS.filter((it) => it.slot === slotKind(slot) && s.owned.includes(it.id))
        .sort((a, c) => Number(!canWearAs(a, s)) - Number(!canWearAs(c, s)))
        .map((it) => {
          // accessories: show when the item is already on the other side (wearing it here moves it over)
          const other = slot === 'acc' || slot === 'acc2' ? (s.equipped[slot === 'acc' ? 'acc2' : 'acc'] === it.id && it.id !== 'none' ? 'ใส่อีกข้าง' : '') : ''
          const lock2h = slot === 'offhand' && locked && it.id !== 'none_off' // a 2-handed weapon holds the off-hand: nothing can go in it
          return { id: it.id, label: `${it.icon} ${it.name}${forgeTag(s, it.id)}`, desc: lock2h ? '🔒 ถืออาวุธ 2 มืออยู่ ใส่ไม่ได้' : !canWearAs(it, s) ? `⚠ ${wearText(it)} เท่านั้น` : isBroken(s, it.id) ? '💔 แตก: ไม่ได้ค่าพลังจนกว่าจะซ่อม' : `${splitStatLine(forged(s, it), !!it.unique).curse ? '💀' : ''}${itemStatLine(forged(s, it))}` || it.desc, worn: s.equipped[slot] === it.id, tint: 0, off: !canWearAs(it, s) || lock2h, other, curse: !!it.unique && !!splitStatLine(forged(s, it)).curse }
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
      const takeOffRow = it.worn && slot !== 'costume' && canUnequip(s, slot) // the worn row's button takes it off
      b.add(button(this, x + 258, y + 26, 72, 36, takeOffRow ? 'ถอด' : it.worn ? 'ใส่อยู่' : it.other ? 'ย้ายมา' : 'ใส่', () => {
        if (slot === 'costume') s.costume = it.id
        else if (takeOffRow) { this.takeOff(slot); return }
        else {
          const why = equipBlock(s, it.id, slot)
          if (why) { toast(this, why === 'twohand' ? 'ถืออาวุธ 2 มืออยู่ ใส่มือรองไม่ได้ค่ะ เปลี่ยนเป็นอาวุธ 1 มือก่อนนะคะ' : why === 'unique' ? `ใส่ของยูนีคได้พร้อมกันสูงสุด ${UNIQUE.maxEquipped} ชิ้นค่ะ ถอดชิ้นอื่นก่อนนะคะ` : 'ใส่ช่องนี้ไม่ได้ค่ะ', UI.red); return }
          const pushed = slot === 'weapon' && itemById(it.id).twoHand && canUnequip(s, 'offhand') ? itemById(s.equipped.offhand) : null // a 2H weapon sends the off-hand piece back to the bag
          equip(s, it.id, slot)
          if (pushed) toast(this, `ถือ 2 มือ: เก็บ ${pushed.icon} ${pushed.name} กลับกระเป๋าแล้วค่ะ`)
        }
        persist(); this.redraw()
      }, { size: 14 }).setEnabled(takeOffRow || (!it.worn && !('off' in it && it.off))))
    })
    if (list.length <= 1) b.add(txt(this, 638, 440, slot === 'costume' ? 'ยังไม่มีชุดอื่น' : 'ยังไม่มีของชิ้นอื่น\nเก็บ zeny จากดันแล้วไปร้านค้านะคะ', 15, UI.sub).setOrigin(0.5).setAlign('center'))
    b.add(button(this, 876, 545, 140, 34, slot === 'costume' ? '💎 ร้านเพชร' : '🛒 ร้านค้า', () => go(this, slot === 'costume' ? 'gemshop' : 'shop'), { size: 15, fill: 0x5a5f8a, color: UI.text }))
  }

  /** Take the worn item off the selected slot (weapon / armor fall back to the starter knife / cloth). It stays in the bag with its cards. */
  private takeOff(slot: EquipSlot) {
    const s = save(), it = itemById(s.equipped[slot])
    if (!unequip(s, slot)) return
    persist(); toast(this, `ถอด ${it.icon} ${it.name} แล้ว เก็บไว้ในกระเป๋าค่ะ`); this.redraw()
  }

  // ---------- tab 2: equipment cards (design/equipment-cards.md) ----------
  private cardTab() {
    const s = save(), b = this.body!
    // worn gear + its card slots: tap a filled slot to take the card out (free)
    EQUIP_SLOTS.forEach((sl, i) => {
      const it = itemById(s.equipped[sl.id]), n = slotCount(it, gradeOf(s, it.id)), cards = socketed(s, it), y = 108 + i * 31
      b.add(panel(this, 330, y, 616, 28, UI.panel, UI.line, 8))
      b.add(txt(this, 340, y + 6, sl.icon, 13))
      b.add(txt(this, 364, y + 6, clip(`${it.icon} ${it.name}`, 16), 13, canWearAs(it, s) ? UI.text : UI.red, true))
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
      const fits = EQUIP_SLOTS.map((q) => itemById(s.equipped[q.id])).filter((w) => cardFits(cd, w) && canWearAs(w, s))
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
    const total = totalBase(s), gear = gearBase(s), jobB = jobBonusBase(s)
    b.add(txt(this, 330, 112, `แต้มสถานะเหลือ: ${s.statPoints}`, 20, s.statPoints ? UI.gold : UI.sub, true))
    b.add(txt(this, 330, 138, `ได้ ${STAT_RULES.pointsPerLevel} แต้มทุก Base Lv · รีเซ็ตฟรีได้ตลอด`, 14, UI.sub))
    BASE_STATS.forEach((bs, i) => {
      const y = 166 + i * 56
      b.add(panel(this, 330, y, 600, 50, UI.panel, UI.line, 10))
      b.add(txt(this, 344, y + 6, bs.name, 19, UI.gold, true))
      b.add(txt(this, 344, y + 30, bs.role, 12, UI.sub))
      const gearB = gear[bs.id], jobN = jobB[bs.id], raceB = total[bs.id] - s.stats[bs.id] - gearB - jobN
      b.add(txt(this, 404, y + 11, `${total[bs.id]}`, 22, UI.text, true))
      const tags: [string, string][] = [] // stacked +N labels: เผ่า / ของ / อาชีพ (📈 job bonus)
      if (raceB) tags.push([`${raceB > 0 ? '+' : ''}${raceB} เผ่า`, raceB > 0 ? UI.green : UI.red])
      if (gearB) tags.push([`+${gearB} ของ`, '#7fd7ff'])
      if (jobN) tags.push([`+${jobN} อาชีพ`, UI.gold])
      const step = tags.length > 2 ? 14 : 18
      tags.forEach(([t, c], j) => b.add(txt(this, 436, y + (tags.length > 2 ? 4 : 8) + j * step, t, 10, c)))
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
      b.add(clipW(txt(this, p.x + 6, p.y + 29, n.name, 12, open ? UI.text : UI.sub), nw - 12))
      const z = this.add.zone(p.x, p.y, nw, nh).setOrigin(0).setInteractive({ useHandCursor: true })
      z.on('pointerdown', () => { this.selNode = id; this.render() })
      b.add(z)
    }
    // detail of the selected node
    const n = nodeById(this.selNode)!, lv = t[n.id] ?? 0, why = lockReason(t, s.job, n)
    this.nodeFooter(n, lv, why, n.kind === 's2root' ? 'ทักษะ 2' : '', '', s.skillPoints > 0 && !why, () => {
      if (s.skillPoints <= 0 || lockReason(t, s.job, n)) return
      t[n.id] = (t[n.id] ?? 0) + 1; s.skillPoints--; persist(); this.redraw()
    }, false)
  }

  // ---------- tab 3b: ใยชั้น 2 (2nd job, data/trees2/, design/second-jobs-v1.md) ----------
  private web2Tab() {
    const s = save(), b = this.body!, j2 = JOB2[s.job2!], t = (s.job2Tree ??= {}), pts = s.job2Points ?? 0
    b.add(txt(this, 330, 114, `${j2.icon} ${j2.name} · แต้มเหลือ ${pts}`, 15, pts ? UI.gold : UI.sub, true))
    b.add(txt(this, 330, 136, `Job2 Lv ${s.job2Level ?? 1}/${JOB2_RULES.maxJobLevel} · ${j2.signature.icon} ${j2.signature.name} ติดตัว · ★ ได้ 2 ดวง`, 11, UI.sub))
    b.add(button(this, 640, 124, 120, 30, '✨ ใยชั้น 1', () => { this.web2 = false; this.selNode = ''; this.render() }, { size: 12, fill: 0x5a5f8a, color: UI.text }))
    const d3 = job3Of(j2.id)
    if (!d3) b.add(button(this, 640, 92, 120, 28, '🔒 ขั้น 3 เร็วๆ นี้', () => toast(this, `อาชีพขั้น 3 ของ ${j2.name} กำลังทำค่ะ (มีแล้ว: ⚜️ Paladin · 🐉 Lord Knight)`, UI.sub), { size: 12, fill: 0x3a3f66, color: UI.sub }))
    if (d3) b.add(button(this, 640, 92, 120, 28, `${d3.icon} ใยชั้น 3`, () => { if (activeJob3(s)) { this.web3 = true; this.selNode = ''; this.render() } else go(this, 'job', { job3: true }) }, { size: 12, fill: activeJob3(s) ? COLORS.gold : 0x4a5a8a, color: activeJob3(s) ? UI.ink : UI.text }))
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
      const under = c.some((n) => n.kind) ? 1 : 0 // v119: nodes under a root (Crusader Grand Cross / Holy Cross) start one row lower
      c.forEach((n) => pos.set(n.id, { x, y: top + (n.kind ? 0 : n.tier - 1 + under) * rh })) // roots and tier 1 share the top row
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
      b.add(clipW(txt(this, p.x + 6, p.y + 29, n.name, 12, open ? UI.text : UI.sub), cw - 12))
      const z = this.add.zone(p.x, p.y, cw, nh).setOrigin(0).setInteractive({ useHandCursor: true })
      z.on('pointerdown', () => { this.selNode = id; this.render() })
      b.add(z)
    }
    const n = nodeById(this.selNode)!, lv = t[n.id] ?? 0, why = lockReason(t, s.job, n, j2.id)
    const s3 = n.branch.endsWith('_s3'), root = n.kind === 'pow2' ? (s3 ? j2.skill3 : j2.ult) : undefined
    this.nodeFooter(n, lv, why, n.kind === 'pow2' ? (s3 ? 'ทักษะ 3' : 'Ult วิวัฒน์') : n.tier === 4 ? '★ ปลายสาย' : '', root ? `${root.icon} ${root.name}: ${root.desc}` : '', pts > 0 && !why, () => {
      if ((s.job2Points ?? 0) <= 0 || lockReason(t, s.job, n, j2.id)) return
      t[n.id] = (t[n.id] ?? 0) + 1; s.job2Points = (s.job2Points ?? 0) - 1; persist(); this.redraw()
    }, true)
  }

  // ---------- tab 3c: ใยชั้น 3 (3rd job, data/trees3/, design/awakening-crusader-v1.md) ----------
  private web3Tab() {
    const s = save(), b = this.body!, j3 = activeJob3(s)!, d = JOB3[j3], t = (s.job3Tree ??= {}), pts = s.job3Points ?? 0, path = s.job3Path ?? 'pure'
    b.add(txt(this, 330, 114, `${d.icon} ${d.name} · แต้มเหลือ ${pts}`, 15, pts ? UI.gold : UI.sub, true))
    b.add(txt(this, 330, 136, `Job3 Lv ${s.job3Level ?? 1}/${JOB3_RULES.maxJobLevel} · ${path === 'hybrid' ? '👊 Hybrid' : `${d.icon} Pure`} · ${d.variants[s.job3Var ?? 'a'].icon}`, 11, UI.sub))
    b.add(button(this, 640, 124, 120, 30, `${JOB2[d.parent].icon} ใยชั้น 2`, () => { this.web3 = false; this.web2 = true; this.selNode = ''; this.render() }, { size: 12, fill: 0x5a5f8a, color: UI.text }))
    b.add(button(this, 768, 124, 104, 30, '⚙️ สาย/แบบ', () => go(this, 'job', { job3: true }), { size: 12, fill: 0x4a5a8a, color: UI.text }))
    b.add(button(this, 880, 124, 96, 30, 'รีเซ็ตฟรี', () => {
      const back = resetTree3(s)
      if (!back) return
      s.job3Points = pts + back; persist(); toast(this, `คืน ${back} แต้มแล้ว`); this.redraw()
    }, { size: 13, fill: 0x5a5f8a, color: UI.text }).setEnabled(tree3Spent(t, j3) > 0))
    const brs = web3Scope(j3, path)
    const cols = brs.map((br) => nodesOf(br.id).filter((n) => path !== 'hybrid' || n.tier <= HYBRID_MAX_TIER || n.kind))
    const gap = 6, x0 = 330, cw = (620 - gap * (cols.length - 1)) / cols.length, nh = 50, top = 176, rh = 72
    if (!this.selNode || !cols.some((c) => c.some((n) => n.id === this.selNode))) this.selNode = cols[0][0].id
    const g = this.add.graphics(); b.add(g)
    const pos = new Map<string, { x: number; y: number }>()
    cols.forEach((c, i) => {
      const x = x0 + i * (cw + gap), br = brs[i]
      b.add(panel(this, x - 3, 150, cw + 6, 344, br.job3 ? 0x1d2140 : 0x231d36, UI.line, 8))
      b.add(clipW(txt(this, x + 4, 155, `${br.icon} ${br.name}`, 11, br.job3 ? UI.gold : UI.sub, true), cw - 6))
      c.forEach((n) => pos.set(n.id, { x, y: top + (n.kind ? 0 : n.tier - 1) * rh }))
    })
    for (const [id, p] of pos) { const n = nodeById(id)!, pp = n.parent ? pos.get(n.parent) : undefined; if (pp) g.lineStyle(3, (t[id] ?? 0) > 0 ? COLORS.gold : UI.line, 1).lineBetween(pp.x + cw / 2, pp.y + nh, p.x + cw / 2, p.y) }
    for (const [id, p] of pos) {
      const n = nodeById(id)!, lv = t[id] ?? 0, why = lockReason3(t, s.job, n, j3, path), open = !why || why === 'เต็มแล้ว', star = n.tier === 4, sel = id === this.selNode
      b.add(panel(this, p.x, p.y, cw, nh, lv ? 0x2a3b5a : open ? UI.panel : 0x161a33, sel ? 0xffffff : star ? COLORS.gold : lv ? 0x7fd7ff : UI.line, 10))
      b.add(txt(this, p.x + 6, p.y + 4, `${star ? '★' : ''}${n.icon}`, 17, UI.text))
      b.add(txt(this, p.x + cw - 6, p.y + 6, `${lv}/${n.max}`, 11, lv ? UI.gold : UI.sub, true).setOrigin(1, 0))
      b.add(clipW(txt(this, p.x + 6, p.y + 29, n.name, 12, open ? UI.text : UI.sub), cw - 12))
      const z = this.add.zone(p.x, p.y, cw, nh).setOrigin(0).setInteractive({ useHandCursor: true })
      z.on('pointerdown', () => { this.selNode = id; this.render() })
      b.add(z)
    }
    const n = nodeById(this.selNode)!, lv = t[n.id] ?? 0, why = lockReason3(t, s.job, n, j3, path)
    this.nodeFooter(n, lv, why, n.kind === 'pow3' ? 'Ult วิวัฒน์ 2' : n.tier === 4 ? '★ ปลายสาย' : n.branch.startsWith('pa_') ? '' : `ยืมจาก ${JOB2[d.sibling].name}`, n.kind === 'pow3' ? `✨ ${d.ultName}: ${d.ultDesc}` : '', pts > 0 && !why, () => {
      if ((s.job3Points ?? 0) <= 0 || lockReason3(t, s.job, n, j3, path)) return
      t[n.id] = (t[n.id] ?? 0) + 1; s.job3Points = (s.job3Points ?? 0) - 1; persist(); this.redraw()
    }, 3)
  }

  /** Bottom strip of both skill webs: the picked node in 2 short lines + 📋 detail (opens the modal) + learn. */
  private nodeFooter(n: TreeNode, lv: number, why: string | null | undefined, tag: string, rootDesc: string, can: boolean, learn: () => void, tier2: boolean | 3) {
    const b = this.body!, locked = !!why && why !== 'เต็มแล้ว'
    b.add(panel(this, 330, 500, 620, 70, UI.panel, COLORS.gold, 10))
    b.add(clipW(txt(this, 342, 504, `${n.icon} ${n.name}  ${lv}/${n.max}${tag ? `  · ${tag}` : ''}`, 15, UI.gold, true), 440))
    const now = lv ? `ตอนนี้: ${n.desc(lv)}` : `Lv 1: ${n.desc(1)}`
    b.add(clipW(txt(this, 342, 527, now, 12, lv ? UI.text : UI.green), 440))
    b.add(clipW(txt(this, 342, 547, locked ? `🔒 ${why}` : lv && lv < n.max ? `ถัดไป: ${n.desc(lv + 1)}` : lv >= n.max ? '✅ เต็มแล้ว' : rootDesc || 'แตะ 📋 เพื่อดูตัวเลขจริง', 12, locked ? '#ffb0b0' : UI.green), 440))
    b.add(button(this, 822, 535, 104, 40, '📋 รายละเอียด', () => { this.showDetail = true; this.render() }, { size: 13, fill: 0x5a5f8a, color: UI.text }))
    b.add(button(this, 912, 535, 60, 40, lv ? '+1' : 'เรียน', learn, { size: 15 }).setEnabled(can))
    if (this.showDetail) this.nodeModal(n, lv, why, tag, rootDesc, can, learn, tier2)
  }

  /** Node detail modal (tier-1 and tier-2 webs): full text now / next level + the real numbers (nodeDetail). Esc / ✕ / tap outside closes. */
  private nodeModal(n: TreeNode, lv: number, why: string | null | undefined, tag: string, rootDesc: string, can: boolean, learn: () => void, tier2: boolean | 3) {
    const d = nodeDetail(save(), n, tier2)
    const close = () => { this.showDetail = false; this.render() }
    const c = this.add.container(0, 0).setDepth(30000) // above the top bar (20001)
    this.modal = c
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x080a18, 0.8).setInteractive()
    dim.on('pointerup', close)
    const x = 70, y = 40, w = W - 140, h = H - 80
    c.add([dim, panel(this, x, y, w, h, 0x141834, COLORS.gold, 14), this.add.zone(x, y, w, h).setOrigin(0).setInteractive()]) // the zone keeps taps inside from closing
    c.add(clipW(txt(this, x + 20, y + 14, `${n.icon} ${n.name}`, 22, UI.gold, true), w - 260))
    c.add(txt(this, x + 20, y + 46, `Lv ${lv}/${n.max}${tag ? ` · ${tag}` : ''}${tier2 === 3 ? ' · ใยชั้น 3' : tier2 ? ' · ใยชั้น 2' : ''}`, 13, UI.sub, true))
    c.add(button(this, x + w - 34, y + 30, 44, 40, '✕', close, { size: 18, fill: 0x5a5f8a, color: UI.text }))

    // left: words
    const lx = x + 20, lw = 300
    const words: { head: string; body: string; color: string }[] = []
    if (rootDesc) words.push({ head: '📖 ตัวสกิล', body: rootDesc, color: UI.text })
    words.push({ head: lv ? `✅ ตอนนี้ (Lv ${lv})` : '⬜ ยังไม่เรียน', body: lv ? n.desc(lv) : '—', color: lv ? UI.text : UI.sub })
    if (lv < n.max) words.push({ head: `⬆️ Lv ${lv + 1}`, body: n.desc(lv + 1), color: UI.green })
    if (why && why !== 'เต็มแล้ว') words.push({ head: '🔒 ยังเรียนไม่ได้', body: why, color: '#ffb0b0' })
    let size = 14, made: Phaser.GameObjects.Text[] = []
    for (;; size--) { // shrink the words until they fit the left column
      made.forEach((m) => m.destroy()); made = []
      let ty = y + 80
      for (const wd of words) {
        const hd = txt(this, lx, ty, wd.head, size, UI.gold, true); ty += hd.height + 2
        const bd = txt(this, lx, ty, wd.body, size, wd.color).setWordWrapWidth(lw, true).setLineSpacing(2); ty += bd.height + 12
        made.push(hd, bd)
      }
      if (ty <= y + h - 70 || size <= 10) break
    }
    c.add(made)

    // right: numbers
    const rx = x + 340, rw = w - 360, c1 = rx + rw - 236, c2 = rx + rw - 116
    c.add(this.add.rectangle(rx - 10, y + 76, 1, h - 150, 0x454c80).setOrigin(0))
    c.add(txt(this, rx, y + 80, '🔢 ตัวเลขจริง', 14, UI.gold, true))
    c.add(txt(this, c1, y + 82, 'ตอนนี้', 12, UI.text, true))
    c.add(txt(this, c2, y + 82, lv < n.max ? `Lv ${lv + 1}` : 'เต็ม', 12, lv < n.max ? UI.green : UI.sub, true))
    const rowH = 21, maxRows = Math.floor((h - 190) / rowH), rows = d.rows.slice(0, maxRows)
    rows.forEach((r, i) => {
      const ry = y + 106 + i * rowH
      if (r.section) { c.add(clipW(txt(this, rx, ry, r.label, 12, UI.gold, true), rw)); return }
      const changed = r.next !== undefined && r.next !== r.now
      if (i % 2) c.add(this.add.rectangle(rx - 4, ry - 2, rw + 4, rowH, 0xffffff, 0.04).setOrigin(0))
      c.add(clipW(txt(this, rx + 8, ry, r.label, 12, '#d8d4f0'), c1 - rx - 16))
      c.add(clipW(txt(this, c1, ry, r.now, 12, UI.text), r.next === undefined ? rx + rw - c1 : c2 - c1 - 8)) // v116: no next column (maxed) = use its width too
      if (r.next !== undefined) c.add(clipW(txt(this, c2, ry, r.next, 12, changed ? UI.green : UI.sub, changed), rx + rw - c2))
    })
    if (!rows.length) c.add(txt(this, rx, y + 110, 'โหนดนี้เปลี่ยนการทำงานในการต่อสู้\nดูคำอธิบายด้านซ้ายนะคะ', 13, UI.sub).setLineSpacing(4))
    if (d.rows.length > rows.length) c.add(txt(this, rx, y + 106 + rows.length * rowH, `… และอีก ${d.rows.length - rows.length} บรรทัด`, 11, UI.sub))
    c.add(txt(this, x + 20, y + h - 52, d.note, 10, UI.sub).setWordWrapWidth(w - 200, true))
    c.add(button(this, x + w - 80, y + h - 36, 130, 44, lv ? '+1 แต้ม' : 'เรียน', learn, { size: 17 }).setEnabled(can))
  }

  // ---------- tab 4: talents (4 tiers by Job Lv, pick 1 of 3, free swap in town) ----------
  private talentTab() {
    const s = save(), b = this.body!
    if (s.job === 'novice') {
      b.add(txt(this, 330, 130, '⭐ ทาเลนต์เปิดหลังเปลี่ยนอาชีพ', 20, UI.gold, true))
      b.add(txt(this, 330, 166, `4 ชั้น เปิดที่ Job Lv ${TALENT_RULES.rowsAt.join(' / ')} · ชั้นละเลือก 1 จาก 3\nใช้แต้มทาเลนต์ (แยกจากแต้มสกิล) ได้ 1 แต้มทุก ${TALENT_RULES.pointEveryJobLv} Job Lv · รีเซ็ตฟรีในเมือง`, 14, UI.sub))
      return
    }
    // v119 (Q 2026-11-08): ทาเลนต์ชั้น 2 — same 4 rows, read off Job2 Lv, own picks (save.job2Talents)
    const two = this.talent2 && !!s.job2, j2 = s.job2
    const t = two ? (s.job2Talents ??= {}) : (s.jobTalents ??= {})
    const jl = two ? s.job2Level ?? 1 : s.jobLevel, jlName = two ? 'Job2 Lv' : 'Job Lv'
    const free = talentFree(t, jl)
    b.add(txt(this, 330, 114, `⭐ แต้มทาเลนต์${two ? 'ชั้น 2' : ''}เหลือ: ${free}`, 18, free > 0 ? UI.gold : UI.sub, true))
    b.add(txt(this, 560, 118, `ได้ ${talentEarned(jl)} จาก ${jlName} ${jl}`, 12, UI.sub))
    if (j2) b.add(button(this, 760, 124, 112, 30, two ? '⭐ ชั้น 1' : `${JOB2[j2].icon} ชั้น 2`, () => { this.talent2 = !two; this.redraw() }, { size: 12, fill: 0x4a5a8a, color: UI.text }))
    b.add(button(this, 885, 124, 90, 30, 'รีเซ็ตฟรี', () => {
      if (two) s.job2Talents = {}; else s.jobTalents = {}
      persist(); toast(this, 'คืนแต้มทาเลนต์แล้ว'); this.redraw()
    }, { size: 13, fill: 0x5a5f8a, color: UI.text }).setEnabled(Object.keys(t).length > 0))
    TALENT_RULES.rowsAt.forEach((lv, i) => {
      const row = i + 1, y = 144 + i * 104, open = jl >= lv
      const opts = two && j2 ? talents2Of(j2, row) : talentsOf(s.job, row)
      const cur = talentPick(t, row)
      b.add(txt(this, 330, y, `ชั้น ${row} · ${jlName} ${lv}${open ? '' : ' 🔒'}`, 14, open ? UI.text : UI.sub, true))
      if (!opts.length) { b.add(txt(this, 330, y + 26, 'กำลังออกแบบ (เร็วๆ นี้)', 12, UI.sub)); return }
      const cw = (600 - 2 * 10) / 3
      opts.slice(0, 3).forEach((o, k) => {
        const x = 330 + k * (cw + 10), picked = cur?.id === o.id
        const rank = picked ? Math.min(cur!.rank, o.max) : 0
        b.add(panel(this, x, y + 20, cw, 76, picked ? 0x2a3b5a : open ? UI.panel : 0x1d2140, picked ? COLORS.gold : UI.line, 10))
        b.add(txt(this, x + 8, y + 24, `${o.icon} ${o.name}  ${rank}/${o.max}`, 13, open ? UI.text : UI.sub, true))
        // v102 fix (all jobs): the text is the rank shown on the card (was the next rank's), + what the next rank changes
        const tx = talentRankText(o, rank)
        b.add(txt(this, x + 8, y + 43, tx.next ? `${tx.now}\n${tx.next}` : tx.now, tx.next ? 10 : 11, open ? UI.green : UI.sub).setWordWrapWidth(cw - 16))
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


type DetailRow = { label: string; now: string; next?: string; section?: boolean }
/** Rows for the skill detail panel: the skill this node powers (all rows), other skills / stats that this level changes. */
export function nodeDetail(s: ReturnType<typeof save>, n: TreeNode, tier2: boolean | 3 = false): { rows: DetailRow[]; note: string } {
  const key = tier2 === 3 ? 'job3Tree' : tier2 ? 'job2Tree' : 'jobTree' // v113: the 2nd-job web had no detail (Q bug)
  const t = s[key] ?? {}, lv = t[n.id] ?? 0, job = s.job
  const withTree = (tree: Record<string, number>) => ({ ...s, [key]: tree })
  const stOf = (tree: Record<string, number>) => heroStats(withTree(tree))
  const nowT = t, nextT = lv < n.max ? { ...t, [n.id]: lv + 1 } : undefined
  const stNow = stOf(nowT), stNext = nextT ? stOf(nextT) : undefined
  const line = BRANCHES.find((x) => x.id === n.branch)?.line
  const s2 = n.s2 ? skill2ById(n.s2) : undefined
  type Sec = { name: string; info: (st: Stats, tree: Record<string, number>) => InfoRow[] | null; all: boolean }
  const picked = (tree: Record<string, number>) => skill2Picked(tier2 ? s.jobTree ?? {} : tree, job)
  const secs: Sec[] = [
    { name: `${JOBS[job].auto.icon} ทักษะ 1: ${JOBS[job].auto.name}`, info: (st) => autoInfo(job, st), all: line === 's1' },
    ...(job === 'cleric' ? [{ name: '🌄 รุ่งอรุณ (passive · ตีธรรมดา/คอมโบ)', info: (st: Stats, tree: Record<string, number>) => { const x = dawnInfo(st, totalBase(withTree(tree))); return x.length ? x : null }, all: n.branch === 'cleric_d' }] : []),
    { name: s.job2 === 'crusader' ? `✨ Ult: Grand Cross` : `${JOBS[job].ult.icon} Ult: ${JOBS[job].ult.name}`, info: (st, tree) => ultInfo(job, st, totalBase(withTree(tree)), s.job2), all: line === 'ult' || (tier2 && n.branch.endsWith('_u2')) },
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
/** Clip a text object to maxW pixels with an ellipsis (pixel-based: Thai vowel / tone marks take no width). */
function clipW(t: Phaser.GameObjects.Text, maxW: number) {
  if (t.width <= maxW) return t
  const full = t.text
  let lo = 0, hi = full.length
  while (lo < hi) { const m = (lo + hi + 1) >> 1; t.setText(full.slice(0, m) + '…'); if (t.width <= maxW) lo = m; else hi = m - 1 }
  return t.setText(full.slice(0, lo) + '…')
}
