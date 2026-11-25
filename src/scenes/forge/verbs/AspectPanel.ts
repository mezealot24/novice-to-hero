// 🔮 Aspect Imbue + 🌟 Unique Awakening (Wave 2 Forge verb): rules live in data/item-effects.ts.
import type Phaser from 'phaser'
import { cardById, cardName } from '../../../data/cards'
import {
  ASPECT_LIST,
  ASPECTS,
  UNIQUE_AWAKEN,
  awakenUnique,
  canAwakenUnique,
  canImbueAspect,
  describeItemEffects,
  imbueAspect,
  type AspectDef,
  type AspectId,
  type SaveExt,
} from '../../../data/item-effects'
import { matById } from '../../../data/materials'
import { isTainted, itemStatLine, type Item } from '../../../data/meta'
import { persist, save } from '../../../save'
import { button, panel, shrinkFit, toast, txt, UI } from '../../../ui'
import { forgedWithAspect, pressLabel } from '../state'
import { BOX_H, BOX_W, INNER_W, PAD, type ForgeCtx, type Preview, type VerbAction, type VerbPanel } from '../types'
import { PanelBase } from './PanelBase'

const PER_PAGE = 4
const PILL_W = 150
const PILL_H = 25
const PILL_GAP_X = 8
const PILL_GAP_Y = 4

function isStarterItem(it: Item): boolean {
  return it.price === 0 && !it.craft && !it.unique
}

export class AspectPanel extends PanelBase implements VerbPanel {
  private it!: Item
  private pool: AspectDef[] = []
  private selectedId?: AspectId
  private page = 0
  private blockedStarter = false

  private head!: Phaser.GameObjects.Text
  private headBadge!: Phaser.GameObjects.Text
  private awakenTitle?: Phaser.GameObjects.Text
  private awakenInfo?: Phaser.GameObjects.Text
  private awakenBtn?: ReturnType<typeof button>

  private statusT!: Phaser.GameObjects.Text
  private pageT?: Phaser.GameObjects.Text
  private prevBtn?: ReturnType<typeof button>
  private nextBtn?: ReturnType<typeof button>
  private pillGfx?: Phaser.GameObjects.Graphics
  private pillBtns: ReturnType<typeof button>[] = []

  private detTitle?: Phaser.GameObjects.Text
  private detState?: Phaser.GameObjects.Text
  private detMod?: Phaser.GameObjects.Text
  private detFx?: Phaser.GameObjects.Text
  private detFoot?: Phaser.GameObjects.Text
  private cardH = 0

  constructor(private ctx: ForgeCtx) { super() }

  mount(box: Phaser.GameObjects.Container, it: Item) {
    this.it = it
    const sc = this.ctx.scene
    const s = save() as SaveExt
    this.blockedStarter = isStarterItem(it)
    this.pool = this.blockedStarter ? [] : ASPECT_LIST.filter((a) => a.slots.includes(it.slot))

    const curId = s.imbue?.[it.id] as AspectId | undefined
    const curIx = curId ? this.pool.findIndex((a) => a.id === curId) : -1
    const initIx = curIx >= 0 ? curIx : 0
    this.selectedId = this.pool[initIx]?.id
    this.page = Math.floor(initIx / PER_PAGE)

    this.head = txt(sc, PAD, 10, '🔮 รูนธาตุ & ปลุกพลัง', 15, '#d9b8ff', true)
    this.headBadge = txt(sc, BOX_W - PAD, 12, '', 11, UI.gold, true).setOrigin(1, 0)
    this.put(box, this.head, this.headBadge)

    if (it.unique) {
      const awBox = panel(sc, PAD, 32, INNER_W, 64, 0x1a152e, 0x7a57c2, 10)
      this.awakenTitle = txt(sc, PAD + 10, 36, `🌟 ปลุกพลังยูนีค (+${Math.round(UNIQUE_AWAKEN.statScaleBonus * 100)}% พลัง)`, 12, '#ffd875', true)
      this.awakenInfo = txt(sc, PAD + 10, 53, '', 11, UI.sub).setWordWrapWidth(INNER_W - 108)
      this.awakenBtn = button(sc, PAD + INNER_W - 47, 64, 82, 44, '🌟 ปลุกพลัง', () => this.doAwaken(), { size: 12, fill: 0x8a4fd0 })
      this.put(box, awBox, this.awakenTitle, this.awakenInfo, this.awakenBtn)
    }

    const mainY = it.unique ? 102 : 36
    if (this.blockedStarter || this.pool.length === 0) {
      const blockBox = panel(sc, PAD, mainY, INNER_W, 130, 0x181c33, 0x454d75, 10)
      this.statusT = txt(
        sc,
        BOX_W / 2,
        mainY + 65,
        this.blockedStarter
          ? '⚠️ ของเริ่มต้นฝังรูนธาตุไม่ได้ค่ะ\nลองตีของดันเจี้ยนหรือปลดล็อกของร้านก่อนนะคะ'
          : 'ยังไม่มีรูนที่รองรับอุปกรณ์ช่องนี้ค่ะ',
        13,
        '#ffb0b0',
        true,
      ).setOrigin(0.5, 0.5).setAlign('center').setWordWrapWidth(INNER_W - 24)
      this.put(box, blockBox, this.statusT)
      this.refresh()
      return
    }

    const paged = this.pool.length > PER_PAGE
    this.statusT = txt(sc, PAD, mainY, '', 12, '#d5c8ff', true).setWordWrapWidth(paged ? INNER_W - 90 : INNER_W)
    this.put(box, this.statusT)
    if (paged) {
      this.prevBtn = button(sc, BOX_W - PAD - 68, mainY + 9, 24, 20, '◀', () => this.stepPage(-1), { size: 11, fill: 0x262d4f })
      this.pageT = txt(sc, BOX_W - PAD - 40, mainY + 9, '', 11, UI.sub, true).setOrigin(0.5, 0.5)
      this.nextBtn = button(sc, BOX_W - PAD - 12, mainY + 9, 24, 20, '▶', () => this.stepPage(1), { size: 11, fill: 0x262d4f })
      this.put(box, this.prevBtn, this.pageT, this.nextBtn)
    }

    const gridY = mainY + 22
    this.pillBtns = []
    for (let i = 0; i < PER_PAGE; i++) {
      const cx = PAD + (i % 2) * (PILL_W + PILL_GAP_X) + PILL_W / 2
      const cy = gridY + Math.floor(i / 2) * (PILL_H + PILL_GAP_Y) + PILL_H / 2
      const btn = button(sc, cx, cy, PILL_W, PILL_H, '', () => this.pickSlot(i), { size: 11, fill: 0x252b4a })
      this.pillBtns.push(btn)
      this.put(box, btn)
    }
    this.pillGfx = sc.add.graphics()
    this.put(box, this.pillGfx)

    const cardY = gridY + 2 * PILL_H + PILL_GAP_Y + 6
    this.cardH = BOX_H - 8 - cardY
    const cardBg = panel(sc, PAD, cardY, INNER_W, this.cardH, 0x13172b, 0x343f70, 10)
    this.detTitle = txt(sc, PAD + 10, cardY + 7, '', 14, '#f6d878', true).setWordWrapWidth(INNER_W - 104)
    this.detState = txt(sc, BOX_W - PAD - 10, cardY + 9, '', 11, UI.sub, true).setOrigin(1, 0)
    this.detMod = txt(sc, PAD + 10, cardY + 27, '', 12, '#9fe3a8', true).setWordWrapWidth(INNER_W - 20)
    this.detFx = txt(sc, PAD + 10, cardY + 49, '', 11, UI.text).setWordWrapWidth(INNER_W - 20)
    this.detFoot = txt(sc, PAD + 10, cardY + this.cardH - 20, '', 11, UI.sub).setWordWrapWidth(INNER_W - 20)
    this.put(box, cardBg, this.detTitle, this.detState, this.detMod, this.detFx, this.detFoot)

    this.refresh()
  }

  private selected(): AspectDef | undefined {
    return this.pool.find((a) => a.id === this.selectedId) ?? this.pool[0]
  }

  private pages(): number {
    return Math.max(1, Math.ceil(this.pool.length / PER_PAGE))
  }

  private stepPage(d: number) {
    if (this.ctx.isBusy()) return
    const p = this.pages()
    this.page = (this.page + d + p) % p
    const first = this.pool[this.page * PER_PAGE]
    if (first) this.selectedId = first.id
    this.ctx.changed()
  }

  private pickSlot(slotIx: number) {
    if (this.ctx.isBusy()) return
    const asp = this.pool[this.page * PER_PAGE + slotIx]
    if (!asp) return
    this.selectedId = asp.id
    this.ctx.changed()
  }

  private doAwaken() {
    if (this.ctx.isBusy()) return
    const s = save() as SaveExt
    const it = this.it
    const chk = canAwakenUnique(s, it)
    if (!chk.ok) {
      const msg =
        chk.why === 'tainted'
          ? '🌑 ติดคำสาปแล้ว ปลุกพลังไม่ได้อีกค่ะ'
          : chk.why === 'already'
            ? '🌟 ปลุกพลังชิ้นนี้ไปแล้วค่ะ'
            : chk.why === 'no_card'
              ? '🃏 ยูนีคชิ้นนี้ยังไม่มีบอสการ์ดรองรับค่ะ'
              : chk.why === 'short'
                ? `ยังขาด: ${chk.short.join(', ')}`
                : 'ปลุกพลังชิ้นนี้ไม่ได้ค่ะ'
      toast(this.ctx.scene, msg, UI.red)
      return
    }
    if (awakenUnique(s, it)) {
      persist()
      this.ctx.fx.success('🌟 ปลุกพลัง!', [`+${Math.round(UNIQUE_AWAKEN.statScaleBonus * 100)}% พลัง & เอฟเฟกต์`], 'epic')
      this.ctx.say(`ปลุกพลัง ${it.name} สำเร็จ! ความสามารถตื่นเต็มขั้นเลยค่ะ`)
      this.ctx.changed()
    }
  }

  refresh() {
    const s = save() as SaveExt
    const it = this.it
    const tainted = isTainted(s, it.id)
    const curId = s.imbue?.[it.id] as AspectId | undefined
    const curAsp = curId ? ASPECTS[curId] : undefined
    const awakened = Boolean(s.awakened?.[it.id])
    const busy = this.ctx.isBusy()

    if (tainted) this.headBadge.setText('🌑 ติดคำสาป').setColor('#c9a8ff')
    else if (awakened) this.headBadge.setText('🌟 ปลุกแล้ว').setColor(UI.gold)
    else if (curAsp) this.headBadge.setText(`${curAsp.icon} ${curAsp.name}`).setColor('#d9b8ff')
    else this.headBadge.setText('ยังไม่มีรูน').setColor(UI.sub)

    if (it.unique && this.awakenInfo && this.awakenBtn) {
      const chk = canAwakenUnique(s, it)
      if (awakened) {
        this.awakenInfo.setColor('#9fe3a8').setText('✨ ตื่นเต็มขั้นแล้ว: พลังยูนีค & เอฟเฟกต์รูนแรงขึ้น!')
        this.awakenBtn.setLabel('🌟 ตื่นแล้ว').setEnabled(false).setFill(0x2a4d3f)
      } else if (tainted) {
        this.awakenInfo.setColor('#ffb0b0').setText('🌑 ติดคำสาปแล้ว ไม่สามารถปลุกพลังเพิ่มได้ค่ะ')
        this.awakenBtn.setLabel('🔒 คำสาป').setEnabled(false).setFill(0x3a2d4d)
      } else if (chk.why === 'no_card') {
        this.awakenInfo.setColor(UI.sub).setText('🃏 ยูนีคชิ้นนี้ไม่มีการ์ดบอสคู่กัน')
        this.awakenBtn.setLabel('ปลุกไม่ได้').setEnabled(false).setFill(0x2c3048)
      } else {
        const cardObj = chk.cardId ? cardById(chk.cardId) : undefined
        const cardLabel = cardObj ? cardName(cardObj) : (chk.cardId ?? 'การ์ดบอส')
        const matObj = chk.matId ? matById(chk.matId) : undefined
        const matLabel = matObj ? `${matObj.icon}${matObj.name}` : (chk.matId ?? 'วัตถุดิบบอส')
        const haveCard = chk.cardId ? (s.cards?.[chk.cardId] ?? 0) : 0
        const haveMat = chk.matId ? (s.mats?.[chk.matId] ?? 0) : 0
        this.awakenInfo
          .setColor(chk.ok ? UI.text : '#f7c58a')
          .setText(`🃏 ${cardLabel} ${haveCard}/${UNIQUE_AWAKEN.bossCards} · ${matLabel} ${haveMat}/${UNIQUE_AWAKEN.bossMats} · ${UNIQUE_AWAKEN.zeny}z`)
        this.awakenBtn.setLabel('🌟 ปลุกพลัง').setEnabled(chk.ok && !busy).setFill(chk.ok ? 0x8a4fd0 : 0x3b3556)
      }
      shrinkFit(this.awakenInfo, 38, 8.5)
    }

    if (this.blockedStarter || this.pool.length === 0) return

    if (tainted) {
      this.statusT.setColor('#ffb0b0').setText(`🌑 ติดคำสาปแล้ว${curAsp ? ` · มี ${curAsp.icon} ${curAsp.name}` : ' · ฝังรูนเพิ่มไม่ได้'}`)
    } else if (curAsp) {
      this.statusT.setColor('#d9b8ff').setText(`รูนตอนนี้: ${curAsp.icon} ${curAsp.name}`)
    } else {
      this.statusT.setColor(UI.sub).setText(`เลือกรูนให้ช่องนี้ (${this.pool.length} แบบ)`)
    }
    shrinkFit(this.statusT, 18, 9)

    const pTotal = this.pages()
    if (this.pageT && this.prevBtn && this.nextBtn) {
      this.pageT.setText(`${this.page + 1}/${pTotal}`)
      this.prevBtn.setEnabled(!busy)
      this.nextBtn.setEnabled(!busy)
    }

    const start = this.page * PER_PAGE
    const gridY = (it.unique ? 102 : 36) + 22
    this.pillGfx?.clear()
    for (let i = 0; i < PER_PAGE; i++) {
      const asp = this.pool[start + i]
      const btn = this.pillBtns[i]
      if (!asp) { btn.setVisible(false); continue }
      const isSel = asp.id === this.selectedId
      const isCur = asp.id === curId
      btn.setVisible(true).setEnabled(!busy)
      btn.setLabel(`${isCur ? '✓ ' : ''}${asp.icon} ${asp.name}`)
      btn.setFill(isSel ? 0x563987 : isCur ? 0x24463c : 0x252b4a)
      if (isSel && this.pillGfx) {
        const px = PAD + (i % 2) * (PILL_W + PILL_GAP_X)
        const py = gridY + Math.floor(i / 2) * (PILL_H + PILL_GAP_Y)
        this.pillGfx.lineStyle(2, 0xf2b84b, 1).strokeRoundedRect(px, py, PILL_W, PILL_H, 8)
      }
    }

    const sel = this.selected()
    if (!sel || !this.detTitle || !this.detState || !this.detMod || !this.detFx || !this.detFoot) return

    this.detTitle.setText(`${sel.icon} ${sel.name}`)
    shrinkFit(this.detTitle, 20, 10)

    const isSame = curId === sel.id
    if (tainted) this.detState.setText('🔒 คำสาป').setColor('#c9a8ff')
    else if (isSame) this.detState.setText('✓ ฝังอยู่แล้ว').setColor('#9fe3a8')
    else if (curId) this.detState.setText('🔄 แทนที่เดิม').setColor(UI.gold)
    else this.detState.setText('✨ พร้อมฝัง').setColor(UI.gem)

    const modLine = sel.mod && Object.keys(sel.mod).length > 0 ? `📊 ${itemStatLine({ mod: sel.mod })}` : `✨ ${sel.desc}`
    this.detMod.setText(modLine)
    shrinkFit(this.detMod, 22, 9)

    const fxLines = describeItemEffects(sel.effects, sel.conversions)
    const bodyText = fxLines.length > 0
      ? fxLines.map((l) => `• ${l}`).join('\n') + (!it.unique && sel.mod && Object.keys(sel.mod).length > 0 ? `\n${sel.desc}` : '')
      : sel.desc
    this.detFx.setText(bodyText)
    shrinkFit(this.detFx, Math.max(24, this.cardH - 72), 8.5)

    const chk = canImbueAspect(s, it, sel.id)
    if (tainted) this.detFoot.setColor('#ffb0b0').setText('🌑 ติดคำสาปแล้ว ฝังรูนใหม่ไม่ได้อีกค่ะ')
    else if (isSame) this.detFoot.setColor('#9fe3a8').setText('✅ อุปกรณ์ชิ้นนี้ฝังรูนนี้อยู่แล้วค่ะ')
    else if (chk.why === 'short') this.detFoot.setColor('#ff9d9d').setText(`ขาด: ${chk.short.join(', ')}`)
    else this.detFoot.setColor(UI.gold).setText(curId ? '⚠️ การฝังใหม่จะแทนที่รูนเดิมของชิ้นนี้ค่ะ' : '🔮 ดูค่าวัตถุดิบด้านล่างแล้วกดปุ่มเพื่อฝังรูน')
    shrinkFit(this.detFoot, 18, 8.5)
  }

  cost() {
    if (this.blockedStarter) return null
    const asp = this.selected()
    const s = save() as SaveExt
    if (!asp || isTainted(s, this.it.id) || s.imbue?.[this.it.id] === asp.id) return null
    return { mats: { ...asp.mats }, zeny: asp.zeny }
  }

  action(): VerbAction | null {
    if (this.blockedStarter) return null
    const asp = this.selected()
    if (!asp) return null
    const s = save() as SaveExt
    if (isTainted(s, this.it.id)) return { label: '🔒 ติดคำสาปแล้ว', enabled: false }
    if (s.imbue?.[this.it.id] === asp.id) return { label: '✓ ฝังรูนนี้แล้ว', enabled: false }
    const chk = canImbueAspect(s, this.it, asp.id)
    const c = { mats: { ...asp.mats }, zeny: asp.zeny }
    const base = s.imbue?.[this.it.id] ? '🔄 เปลี่ยนรูนธาตุ' : '🔮 ฝังรูนธาตุ'
    if (chk.ok) return { label: base, enabled: true, fill: 0x8a4fd0 }
    return { label: chk.why === 'short' ? pressLabel(base, s, c) : 'ฝังไม่ได้', enabled: false, fill: 0x8a4fd0 }
  }

  preview(): Preview | null {
    if (this.blockedStarter) return null
    const asp = this.selected()
    const s = save() as SaveExt
    const it = this.it
    if (!asp || isTainted(s, it.id) || s.imbue?.[it.id] === asp.id) return null
    return { label: `${asp.icon} ${asp.name}`, next: forgedWithAspect(s, it, asp.id), color: '#c9a8ff' }
  }

  act() {
    if (this.blockedStarter) return
    const asp = this.selected()
    const s = save() as SaveExt
    const it = this.it
    if (!asp) return
    const chk = canImbueAspect(s, it, asp.id)
    if (!chk.ok) {
      const msg =
        chk.why === 'tainted'
          ? '🌑 ติดคำสาปแล้ว ฝังรูนไม่ได้อีกค่ะ'
          : chk.why === 'already'
            ? 'ฝังรูนนี้อยู่แล้วค่ะ'
            : chk.why === 'short'
              ? `ยังขาด: ${chk.short.join(', ')}`
              : 'ฝังรูนให้ชิ้นนี้ไม่ได้ค่ะ'
      toast(this.ctx.scene, msg, UI.red)
      return
    }
    if (imbueAspect(s, it, asp.id)) {
      persist()
      const notes = describeItemEffects(asp.effects, asp.conversions).slice(0, 2)
      this.ctx.fx.success(`${asp.icon} ${asp.name}`, notes, 'heavy')
      this.ctx.say(`ฝัง ${asp.name} ให้ ${it.name} แล้วค่ะ!`)
      this.ctx.changed()
    }
  }
}
