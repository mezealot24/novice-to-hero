// Pure helpers shared by the rail, the stage and the verb panels (no Phaser objects here). Rules live in src/data/*.
import { gradeCost, REFINE } from '../../data/craft'
import { matById } from '../../data/materials'
import { canWear, forged, gradeOf, isBroken, isTainted, itemStatLine, ITEMS, linesOf, refineOf, SLOTS, splitStatLine, type Item } from '../../data/meta'
import { canAffordAuto, costGap, fodderToBuy, gradeCheck, lineText, refineCheck, refineCost, taintCheck, totalZeny, type ForgeCost, type TaintResult } from '../../data/refine'
import { curseById } from '../../data/taint'
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
  return ITEMS.filter((it) => s.owned.includes(it.id) && (refineCheck(s, it) !== 'cant' || gradeCheck(s, it) !== 'cant') && (!mineOnly || canWear(it, s.job)))
    .map((it, i) => ({ it, i }))
    .sort((a, b) => (isWorn(s, a.it.id) ? 0 : 1) - (isWorn(s, b.it.id) ? 0 : 1) || slotIx(a.it) - slotIx(b.it) || a.i - b.i)
    .map((x) => x.it)
}

/** Why a verb is closed for this item (undefined = open). Shown as a toast when the tab is tapped. Uses the same checks as the rules. */
export function verbLock(s: SaveData, it: Item, v: Verb): string | undefined {
  const broken = isBroken(s, it.id)
  switch (v) {
    case 'grade': {
      const c = gradeCheck(s, it)
      return c === 'cant' ? 'ของชิ้นนี้อัปขั้นไม่ได้ค่ะ' : c === 'tainted' ? '🌑 ติดคำสาปแล้ว อัปขั้นไม่ได้อีกค่ะ' : undefined // 'max' stays open: the panel says so
    }
    case 'refine': {
      const c = refineCheck(s, it)
      return c === 'cant' ? 'ของเริ่มต้นตีบวกไม่ได้ค่ะ' : c === 'tainted' ? '🌑 ติดคำสาปแล้ว ตีบวกไม่ได้อีกค่ะ' : c === 'broken' ? '💔 ของแตกอยู่ ซ่อมก่อนนะคะ' : undefined
    }
    case 'repair':
      return broken ? undefined : 'ของชิ้นนี้ยังไม่แตกค่ะ'
    case 'option':
      if (refineCheck(s, it) === 'cant') return 'ของเริ่มต้นไม่มีค่าพิเศษค่ะ'
      return isTainted(s, it.id) ? '🌑 ติดคำสาปแล้ว สุ่มค่าพิเศษไม่ได้อีกค่ะ' : undefined
    case 'taint':
      return taintCheck(s, it) === 'cant' ? 'ใส่คำสาปชิ้นนี้ไม่ได้ค่ะ' : undefined // 'tainted' stays open: it shows what the curse did
  }
}

/** The four tab slots. Slot 1 is ⚒️ ตีบวก, and 🔧 ซ่อม takes its place while the item is broken (spec 3.4). */
export const SLOT_COUNT = 4
export function slotVerb(slot: number, broken: boolean): Verb {
  return (['grade', broken ? 'repair' : 'refine', 'option', 'taint'] as Verb[])[slot]
}
export const slotOf = (v: Verb) => (v === 'grade' ? 0 : v === 'refine' || v === 'repair' ? 1 : v === 'option' ? 2 : 3)
export const VERB_TAB: Record<Verb, { icon: string; label: string }> = {
  grade: { icon: '⬆️', label: 'อัปขั้น' },
  refine: { icon: '⚒️', label: 'ตีบวก' },
  repair: { icon: '🔧', label: 'ซ่อม' },
  option: { icon: '🎲', label: 'ค่าพิเศษ' },
  taint: { icon: '🌑', label: 'Corrupt' },
}

/** The verb to land on when the current one closes (broken -> repair, tainted -> taint note). */
export function defaultVerb(s: SaveData, it: Item): Verb {
  if (isBroken(s, it.id)) return 'repair'
  if (isTainted(s, it.id)) return 'taint'
  return (['refine', 'grade', 'taint'] as Verb[]).find((v) => !verbLock(s, it, v)) ?? 'taint'
}

/** Verb to show when an item is picked: keep the current verb across items (spec 3.3) unless it is closed, or the new item is broken. */
export function verbForPick(s: SaveData, it: Item, current: Verb): Verb {
  if (isBroken(s, it.id)) return 'repair'
  return !verbLock(s, it, current) && current !== 'repair' ? current : defaultVerb(s, it)
}

/** Button label for a press: "ตี +7 · 265z", "ซื้อ+ตี +7 685z" when fodder is bought on the spot, or exactly what is missing: "ตี +7 · ขาด 🧱3 420z". */
export function pressLabel(prefix: string, s: SaveData, cost: ForgeCost): string {
  const gap = costGap(s, cost)
  const parts = [...Object.entries(gap.mats).map(([id, n]) => `${matById(id)?.icon ?? '📦'}${n}`), gap.noFodder ? '🔩' : '', gap.zeny ? `${gap.zeny}z` : '', gap.gems ? `💎${gap.gems}` : ''].filter(Boolean)
  if (parts.length) return `${prefix} · ขาด ${parts.join(' ')}`
  const gems = cost.gems ? ` 💎${cost.gems}` : '' // a gem charge must be visible on the button itself
  return (fodderToBuy(s, cost) ? `ซื้อ+${prefix} ${totalZeny(s, cost)}z` : cost.zeny ? `${prefix} · ${cost.zeny}z` : prefix) + gems
}

const SMITH: Record<Verb, string> = {
  grade: 'อัปขั้นสำเร็จเสมอ ไม่มีพัง · แค่ต้องมีของครบนะ',
  refine: 'ตีเกิน +4 ลุ้นหน่อย แตกแล้วซ่อมได้ ของในตัวไม่หาย',
  repair: 'แตกก็ซ่อมได้ จ่ายวัสดุถูกกว่าเพชรเสมอ',
  option: 'ค่าพิเศษสุ่มได้ ล็อกบรรทัดที่ชอบไว้ด้วยเพชรก็ได้',
  taint: 'คำสาปลุ้นทีเดียวแล้วล็อกของ ทำหลังสุดนะ',
}

/** The smith's line for the current state (pity / broken / max / short), falling back to the verb's hint. */
export function smithLine(s: SaveData, it: Item, v: Verb): string {
  if (isBroken(s, it.id) && v !== 'option' && v !== 'taint') return 'แตกแล้วนะ ซ่อมก่อนค่อยตีต่อ ของในตัวไม่หายหรอก'
  if (v === 'refine') {
    if (refineCheck(s, it) === 'max') return `+${REFINE.max} แล้ว สุดยอด! ไปสุ่มค่าพิเศษต่อก็ได้`
    const fails = s.refinePity?.[it.id] ?? 0
    if (fails > 0) return `พลาดติดกัน ${fails} ครั้งแล้ว โอกาสเพิ่มให้ ${Math.round(fails * REFINE.pity * 100)}% เลยนะ`
    if (!canAffordAuto(s, refineCost(it, refineOf(s, it.id) + 1))) return 'ของยังไม่ครบนะ ไปป้อมวีรชนหาวัตถุดิบสักรอบ'
  }
  if (v === 'grade') {
    if (gradeCheck(s, it) === 'max') return 'ขั้นสูงสุดของชิ้นนี้แล้ว'
    if (gradeCheck(s, it) === 'ok' && !canAffordAuto(s, gradeCost(it, gradeOf(s, it.id) + 1))) return 'ของยังไม่ครบนะ ไปป้อมวีรชนหาวัตถุดิบสักรอบ'
  }
  if (v === 'option' && !linesOf(s, it.id).some(Boolean)) return `ตีถึง +${REFINE.lineAt[0]} ก่อน ถึงจะมีค่าพิเศษให้สุ่มนะ`
  if (v === 'taint' && isTainted(s, it.id)) return 'ล็อกไปแล้ว ไม่มีทางกลับนะ'
  return SMITH[v]
}

/** One line saying what the taint did (shown on the stage and in the Corrupt panel of a tainted item). */
export function taintNote(s: SaveData, it: Item): string {
  const t = s.taint?.[it.id]
  if (!t) return ''
  if (t.kind === 'gold') return '🌑 ติดคำสาป: ✨ ค่าพิเศษทุกบรรทัดเป็นทอง (ล็อกแล้ว)'
  if (t.kind === 'brick') return '🌑 ติดคำสาป: 💥 พัง เสียของไปหนึ่งอย่าง (ล็อกแล้ว)'
  if (t.kind === 'curse') { const c = curseById(t.curse); return c ? `🌑 ${c.icon} ${c.name}: ${itemStatLine({ mod: c.mod, pct: c.pct })}` : '🌑 ติดคำสาป (ล็อกแล้ว)' }
  return '🌑 ติดคำสาป: ไม่เกิดอะไร แต่ล็อกแล้ว'
}

/** What to tell the player right after a taint roll. */
export function taintOutcome(res: Extract<TaintResult, { ok: true }>): string {
  const gold = (res.gold ?? []).map(lineText).join(' · ')
  switch (res.kind) {
    case 'none': return '😐 ไม่เกิดอะไรขึ้น... แต่ของชิ้นนี้ถูกล็อกแล้วนะคะ'
    case 'gold': return res.fallback ? `✨ ไม่มีค่าพิเศษให้เปลี่ยน เลยได้บรรทัดทองใหม่ 1 บรรทัด! ${gold}` : `✨ ค่าพิเศษทุกบรรทัดกลายเป็นทอง! ${gold}`
    case 'curse': return res.curse ? `💀 ได้คำสาป ${res.curse.icon} ${res.curse.name}: ${itemStatLine({ mod: res.curse.mod, pct: res.curse.pct })}` : '💀 ได้คำสาป'
    case 'brick': return res.lost ? `💥 พัง! เสียค่าพิเศษ ${lineText(res.lost)}` : res.refineDown ? '💥 พัง! ไม่มีค่าพิเศษให้เสีย ตีบวก -1' : '💥 พัง! แต่ไม่มีอะไรให้เสียเลย'
  }
}
