// ⇧ Ascension "ยกขั้นของเก่า": re-forge an old ★5 piece with mats of a higher gear zone. Same item id, so it keeps its set,
// grade, refine, lines and cards; its own stats scale up to the new zone. Always succeeds once paid.
// Rules: ascendCheck / ascendCost / doAscend (data/ascend.ts). Numbers are read from ASCEND, never typed here.
import type Phaser from 'phaser'
import { ASCEND, ascendCheck, ascendCost, ascendMax, ascendOf, ascendZone, doAscend, homeZone, zoneName } from '../../../data/ascend'
import { forged, type Item } from '../../../data/meta'
import { matName, matOf } from '../../../data/materials'
import { canAffordAuto } from '../../../data/refine'
import { persist, save, type SaveData } from '../../../save'
import { fit, toast, txt, UI } from '../../../ui'
import { ascendWhyText, compareRows, itemSetOf, pressLabel } from '../state'
import { INNER_W, PAD, type ForgeCtx, type Preview, type VerbAction, type VerbPanel } from '../types'
import { PanelBase } from './PanelBase'

const ASC_COLOR = '#ffd35a'
const PREVIEW_ROWS = 5

export class AscendPanel extends PanelBase implements VerbPanel {
  private it!: Item
  private head!: Phaser.GameObjects.Text
  private sub!: Phaser.GameObjects.Text
  private rows!: Phaser.GameObjects.Text
  private foot!: Phaser.GameObjects.Text
  constructor(private ctx: ForgeCtx) { super() }

  mount(box: Phaser.GameObjects.Container, it: Item) {
    this.it = it
    const sc = this.ctx.scene
    this.head = txt(sc, PAD, 12, '', 17, ASC_COLOR, true).setWordWrapWidth(INNER_W)
    this.sub = txt(sc, PAD, 44, '', 12, UI.sub).setWordWrapWidth(INNER_W).setLineSpacing(2)
    this.rows = txt(sc, PAD, 96, '', 13, UI.text).setWordWrapWidth(INNER_W).setLineSpacing(3)
    this.foot = txt(sc, PAD, 238, '', 12, UI.sub).setWordWrapWidth(INNER_W).setLineSpacing(2)
    this.put(box, this.head, this.sub, this.rows, this.foot)
    this.refresh()
  }

  /** The next ascend level, or 0 when there is none (top zone / can't ascend). */
  private next() { const it = this.it, a = ascendOf(save(), it.id); return a < ascendMax(it) ? a + 1 : 0 }

  /** The save as it would be after one more step (the same forged() the hero gets, so the numbers are exact). */
  private after(s: SaveData, n: number): SaveData { return { ...s, ascend: { ...s.ascend, [this.it.id]: n } } }

  refresh() {
    const s = save(), it = this.it, a = ascendOf(s, it.id), max = ascendMax(it), n = this.next(), chk = ascendCheck(s, it)
    const set = itemSetOf(it)
    if (!n) {
      this.head.setText(max ? `⇧${a}/${max} โซน ${zoneName(ascendZone(it, a))}` : 'ยกขั้นไม่ได้').setColor(max ? ASC_COLOR : UI.sub)
      this.sub.setText(max ? `จากบ้านเดิม ${zoneName(homeZone(it))} · ค่าพลังทั้งชิ้นตามทันโซนนี้แล้ว` : '')
      this.rows.setText('')
      this.foot.setColor(chk.ok ? UI.sub : UI.gold).setText(chk.ok ? '' : ascendWhyText(it, chk.why))
      fit(this.foot, 70)
      return
    }
    const from = ascendZone(it, a), to = ascendZone(it, n), st = ASCEND.step[to]
    this.head.setText(`โซน ${zoneName(from)} → ${zoneName(to)}`).setColor(ASC_COLOR)
    this.sub.setText(`⇧${a} → ⇧${n} (สูงสุด ⇧${max}) · ${set ? `ยังนับเป็นชิ้นของ 🧩 ${set.name}` : 'ชิ้นเดิม การ์ด ตีบวก ค่าพิเศษ อยู่ครบ'}`)
    fit(this.sub, 44)
    const rows = compareRows(forged(s, it), forged(this.after(s, n), it)).filter((r) => r.d !== 0).slice(0, PREVIEW_ROWS)
    this.rows.setText(rows.length ? rows.map((r) => `${r.label}  ${r.now} → ${r.next}`).join('\n') : 'ไม่มีค่าที่ขยับได้ค่ะ')
    fit(this.rows, 120)
    const why = chk.ok ? '' : `🔒 ${ascendWhyText(it, chk.why)}\n`
    this.foot.setColor(chk.ok ? UI.sub : UI.gold).setText(`${why}✅ ยกขั้นสำเร็จเสมอ ไม่มีพัง · ใช้ ${matName(matOf(st.dg, false))} + ${matName(matOf(st.dg, true))} ตามแถบด้านล่างค่ะ`)
    fit(this.foot, 70)
  }

  cost() { const n = this.next(); return n ? ascendCost(this.it, n) : null }

  action(): VerbAction | null {
    const s = save(), it = this.it, chk = ascendCheck(s, it), n = this.next()
    if (!chk.ok) {
      const label = chk.why === 'max' ? '✓ โซนสูงสุดแล้ว' : chk.why === 'grade' ? `🔒 ต้อง ★${ASCEND.minGrade} ก่อน` : chk.why === 'broken' ? '💔 ซ่อมก่อน' : '🔒 ยกขั้นไม่ได้'
      return { label, enabled: false }
    }
    const c = ascendCost(it, n)
    if (!c) return { label: '🔒 ยกขั้นไม่ได้', enabled: false }
    return { label: pressLabel('⇧ ยกขั้น', s, c), enabled: canAffordAuto(s, c) }
  }

  /** The next level as worn: keeps grade, refine and bonus lines (shown even below ★5, so the player sees what is waiting). */
  preview(): Preview | null {
    const n = this.next()
    if (!n) return null
    const s = save()
    return { label: `⇧${n}`, next: forged(this.after(s, n), this.it), color: ASC_COLOR }
  }

  act() {
    const s = save(), it = this.it, res = doAscend(s, it)
    if (!res.ok) { toast(this.ctx.scene, res.why === 'short' ? 'วัตถุดิบหรือ zeny ยังไม่พอค่ะ' : ascendWhyText(it, res.why), UI.red); return }
    persist()
    this.ctx.fx.success(`⇧${res.level}`, [`โซน ${zoneName(res.zone)}`], 'epic')
    this.ctx.say(`ยกขั้นสู่โซน ${zoneName(res.zone)} แล้วค่ะ ของเก่าชิ้นนี้ยังใช้ต่อได้อีกยาวเลย`)
    this.ctx.changed()
  }
}
