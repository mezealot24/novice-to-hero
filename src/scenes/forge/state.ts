// Pure helpers shared by the rail, the stage and the verb panels (no Phaser objects here).
import { canWear, forged, gradeOf, isBroken, isTainted, ITEMS, refineOf, SLOTS, splitStatLine, type Item } from '../../data/meta'
import { gradeCap, refinable } from '../../data/craft'
import { taintCheck } from '../../data/refine'
import { isWorn, type SaveData } from '../../save'
import type { ItemIconState } from '../../ui'
import type { Verb } from './types'

/** Upside / curse split of the item as it is worn. A taint-curse line is split off too (not only a unique's downside). */
export function statSplit(s: SaveData, it: Item) {
  return splitStatLine(forged(s, it), !!it.unique || s.taint?.[it.id]?.kind === 'curse')
}

export function iconState(s: SaveData, it: Item): ItemIconState {
  return { grade: gradeOf(s, it.id), refine: refineOf(s, it.id), broken: isBroken(s, it.id), tainted: isTainted(s, it.id), unique: !!it.unique, cursed: !!statSplit(s, it).curse }
}

/** Items the anvil can work on, in a FIXED order (worn first, then slot, then catalogue order). Grade / refine / break never reorder it,
 * so a row never jumps under the player's finger. */
export function railItems(s: SaveData, mineOnly: boolean): Item[] {
  const slotIx = (it: Item) => SLOTS.findIndex((q) => q.id === it.slot)
  return ITEMS.filter((it) => s.owned.includes(it.id) && (refinable(it) || gradeCap(it) > 1) && (!mineOnly || canWear(it, s.job)))
    .map((it, i) => ({ it, i }))
    .sort((a, b) => (isWorn(s, a.it.id) ? 0 : 1) - (isWorn(s, b.it.id) ? 0 : 1) || slotIx(a.it) - slotIx(b.it) || a.i - b.i)
    .map((x) => x.it)
}

/** Why a verb is closed for this item (undefined = open). Shown as a toast when the tab is tapped. */
export function verbLock(s: SaveData, it: Item, v: Verb): string | undefined {
  const tainted = isTainted(s, it.id), broken = isBroken(s, it.id)
  switch (v) {
    case 'grade':
      if (gradeCap(it) <= 1) return 'ของชิ้นนี้อัปขั้นไม่ได้ค่ะ'
      return tainted ? '🌑 ติดคำสาปแล้ว อัปขั้นไม่ได้อีกค่ะ' : undefined
    case 'refine':
      if (!refinable(it)) return 'ของเริ่มต้นตีบวกไม่ได้ค่ะ'
      if (tainted) return '🌑 ติดคำสาปแล้ว ตีบวกไม่ได้อีกค่ะ'
      return broken ? '💔 ของแตกอยู่ ซ่อมก่อนนะคะ' : undefined
    case 'repair':
      return broken ? undefined : 'ของชิ้นนี้ยังไม่แตกค่ะ'
    case 'option':
      if (!refinable(it)) return 'ของเริ่มต้นไม่มีค่าพิเศษค่ะ'
      return tainted ? '🌑 ติดคำสาปแล้ว สุ่มค่าพิเศษไม่ได้อีกค่ะ' : undefined
    case 'taint':
      return taintCheck(s, it) === 'cant' ? 'ใส่คำสาปชิ้นนี้ไม่ได้ค่ะ' : undefined // 'tainted' stays open: it shows what the curse did
  }
}

export const VERBS: { id: Verb; icon: string; label: string }[] = [
  { id: 'grade', icon: '⬆️', label: 'อัปขั้น' },
  { id: 'refine', icon: '⚒️', label: 'ตีบวก' },
  { id: 'repair', icon: '🔧', label: 'ซ่อม' },
  { id: 'option', icon: '🎲', label: 'ค่าพิเศษ' },
  { id: 'taint', icon: '🌑', label: 'Corrupt' },
]

/** The verb to land on when an item is picked, or when the current one closes (broken -> repair, tainted -> taint note). */
export function defaultVerb(s: SaveData, it: Item): Verb {
  if (isBroken(s, it.id)) return 'repair'
  if (isTainted(s, it.id)) return 'taint'
  return (['refine', 'grade', 'taint'] as Verb[]).find((v) => !verbLock(s, it, v)) ?? 'taint'
}
