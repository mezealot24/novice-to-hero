// Pure helpers shared by the rail, the stage and the verb panels (no Phaser objects here). Rules live in src/data/*.
import { ASCEND, ascendCheck, homeZone, TOP_ZONE, zoneName, type AscendWhy } from '../../data/ascend'
import { DUNGEONS } from '../../data/game-data'
import { gradeCost, REFINE } from '../../data/craft'
import { ASPECT_LIST, ASPECTS, aspectModOf, type AspectId, type SaveExt } from '../../data/item-effects'
import { matById } from '../../data/materials'
import { canWearAs, EMPTY_ITEM, itemById, forged, gradeOf, isBroken, isTainted, itemStatLine, ITEMS, linesOf, refineOf, SLOTS, splitStatLine, statEntries, type Item, type StatEntry } from '../../data/meta'
import { canAffordAuto, costGap, fodderToBuy, gradeCheck, lineText, refineCheck, refineCost, taintCheck, totalZeny, type ForgeCost, type TaintResult } from '../../data/refine'
import { ITEM_SETS, setById, type ItemSet } from '../../data/sets'
import type { Stats } from '../../data/stats'
import { curseById } from '../../data/taint'
import { isWorn, replaceSlot, type SaveData } from '../../save'
import type { ItemIconState } from '../../ui'
import type { Verb } from './types'

/** Upside / curse split of the item as it is worn. A taint-curse line is split off too (not only a unique's downside). */
export function statSplit(s: SaveData, it: Item) {
  return splitStatLine(forged(s, it), !!it.unique || s.taint?.[it.id]?.kind === 'curse')
}

export function iconState(s: SaveData, it: Item): ItemIconState {
  return { grade: gradeOf(s, it.id), refine: refineOf(s, it.id), broken: isBroken(s, it.id), tainted: isTainted(s, it.id), unique: !!it.unique, cursed: !!statSplit(s, it).curse, worn: isWorn(s, it.id) }
}

/** Items the anvil can work on, in a FIXED order (worn first, then slot, then catalogue order). Grade / refine / break never reorder it,
 * so a row never jumps under the player's finger. */
export function railItems(s: SaveData, mineOnly: boolean): Item[] {
  const slotIx = (it: Item) => SLOTS.findIndex((q) => q.id === it.slot)
  return ITEMS.filter((it) => s.owned.includes(it.id) && (refineCheck(s, it) !== 'cant' || gradeCheck(s, it) !== 'cant') && (!mineOnly || canWearAs(it, s)))
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
    case 'aspect': {
      const hasPower = Boolean(s.imbue?.[it.id] || s.awakened?.[it.id])
      if (it.price === 0 && !it.craft && !it.unique) return 'ของเริ่มต้นใส่รูน/ปลุกพลังไม่ได้ค่ะ'
      if (isTainted(s, it.id) && !hasPower) return '🌑 ติดคำสาปแล้ว ใส่รูน/ปลุกพลังไม่ได้อีกค่ะ'
      return undefined
    }
  }
}

/** Why an item can't ascend, said to the player (tab lock toast and the ⇧ panel). */
export function ascendWhyText(it: Item, why: AscendWhy): string {
  switch (why) {
    case 'cant': return homeZone(it) >= TOP_ZONE ? `ของโซน ${zoneName(TOP_ZONE)} อยู่โซนสูงสุดแล้วค่ะ` : `ยกขั้นได้เฉพาะของตีเองหรือยูนีคจากดัน ${zoneName(0)} / ${zoneName(1)} ค่ะ`
    case 'tainted': return '🌑 ติดคำสาปแล้ว ยกขั้นไม่ได้อีกค่ะ'
    case 'broken': return '💔 ของแตกอยู่ ซ่อมก่อนนะคะ'
    case 'max': return `ยกขั้นถึงโซน ${zoneName(TOP_ZONE)} แล้วค่ะ สุดทางแล้ว ✨`
    case 'grade': return `อัปเป็น ★${ASCEND.minGrade} ก่อนนะคะ ถึงจะยกขั้นได้`
  }
}

/** The five tab slots. Slot 1 is ⚒️ ตีบวก, and 🔧 ซ่อม takes its place while the item is broken (spec 3.4).
 *  ⬆️ อัปขั้น also carries ⇧ ยกขั้น (ascension) once the piece is ★5 (Q 2026-11-19: one tab for both). */
export const SLOT_COUNT = 5
export function slotVerb(slot: number, broken: boolean): Verb {
  return (['grade', broken ? 'repair' : 'refine', 'option', 'taint', 'aspect'] as Verb[])[slot]
}
export const slotOf = (v: Verb) => (v === 'grade' ? 0 : v === 'refine' || v === 'repair' ? 1 : v === 'option' ? 2 : v === 'taint' ? 3 : 4)
export const VERB_TAB: Record<Verb, { icon: string; label: string }> = {
  grade: { icon: '⬆️', label: 'อัป/ยกขั้น' },
  refine: { icon: '⚒️', label: 'ตีบวก' },
  repair: { icon: '🔧', label: 'ซ่อม' },
  option: { icon: '🎲', label: 'ค่าพิเศษ' },
  taint: { icon: '🌑', label: 'Corrupt' },
  aspect: { icon: '🔮', label: 'รูน/ปลุก' },
}

/** The verb to land on when the current one closes (broken -> repair, tainted -> taint note). */
export function defaultVerb(s: SaveData, it: Item): Verb {
  if (isBroken(s, it.id)) return 'repair'
  if (isTainted(s, it.id)) return 'taint'
  return (['refine', 'grade', 'aspect', 'taint'] as Verb[]).find((v) => !verbLock(s, it, v)) ?? 'taint'
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
  aspect: 'ฝังรูนธาตุได้ชิ้นละ 1 อย่าง · ยูนีคปลุกพลังเพิ่มสเตตัสได้นะ',
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
    if (gradeCheck(s, it) === 'max') {
      const c = ascendCheck(s, it) // ★5: the same tab goes on to ⇧ ascension
      if (c.ok) return 'ของเก่า ★5 อย่าเพิ่งทิ้งนะคะ ยกขั้นด้วยวัตถุดิบโซนใหม่ได้ ยังนับเซ็ตเดิมด้วยค่ะ'
      return c.why === 'max' || c.why === 'broken' ? ascendWhyText(it, c.why) : 'ขั้นสูงสุดของชิ้นนี้แล้ว'
    }
    if (gradeCheck(s, it) === 'ok' && !canAffordAuto(s, gradeCost(it, gradeOf(s, it.id) + 1))) return 'ของยังไม่ครบนะ ไปป้อมวีรชนหาวัตถุดิบสักรอบ'
  }
  if (v === 'option' && !linesOf(s, it.id).some(Boolean)) return `ตีถึง +${REFINE.lineAt[0]} ก่อน ถึงจะมีค่าพิเศษให้สุ่มนะ`
  if (v === 'taint' && isTainted(s, it.id)) return 'ล็อกไปแล้ว ไม่มีทางกลับนะ'
  if (v === 'aspect') {
    if (isTainted(s, it.id)) return '🌑 ติดคำสาปแล้ว ฝังรูนหรือปลุกพลังไม่ได้อีกนะ'
    if (s.imbue?.[it.id] && (!it.unique || s.awakened?.[it.id])) return '✨ ฝังรูนและปลุกพลังครบแล้วค่ะ'
  }
  return SMITH[v]
}

/** One line saying what the taint did (shown on the stage and in the Corrupt panel of a tainted item). */
export function taintNote(s: SaveData, it: Item): string {
  const t = s.taint?.[it.id]
  if (!t) return ''
  if (t.kind === 'gold') return '🌑 ติดคำสาป: ⬆️ ค่าพิเศษทุกบรรทัดขึ้น 1 เลเวล (ล็อกแล้ว)'
  if (t.kind === 'brick') return '🌑 ติดคำสาป: 💥 พัง เสียของไปหนึ่งอย่าง (ล็อกแล้ว)'
  if (t.kind === 'curse') { const c = curseById(t.curse); return c ? `🌑 ${c.icon} ${c.name}: ${itemStatLine({ mod: c.mod, pct: c.pct })}` : '🌑 ติดคำสาป (ล็อกแล้ว)' }
  return '🌑 ติดคำสาป: ไม่เกิดอะไร แต่ล็อกแล้ว'
}

/** What to tell the player right after a taint roll. */
export function taintOutcome(res: Extract<TaintResult, { ok: true }>): string {
  const gold = (res.gold ?? []).map(lineText).join(' · ')
  switch (res.kind) {
    case 'none': return '😐 ไม่เกิดอะไรขึ้น... แต่ของชิ้นนี้ถูกล็อกแล้วนะคะ'
    case 'gold': return res.fallback ? `⬆️ ไม่มีค่าพิเศษให้อัป เลยได้บรรทัดใหม่ที่เลเวลสูงขึ้น 1 บรรทัด! ${gold}` : `⬆️ ค่าพิเศษทุกบรรทัดขึ้น 1 เลเวล! ${gold}`
    case 'curse': return res.curse ? `💀 ได้คำสาป ${res.curse.icon} ${res.curse.name}: ${itemStatLine({ mod: res.curse.mod, pct: res.curse.pct })}` : '💀 ได้คำสาป'
    case 'brick': return res.lost ? `💥 พัง! เสียค่าพิเศษ ${lineText(res.lost)}` : res.refineDown ? '💥 พัง! ไม่มีค่าพิเศษให้เสีย ตีบวก -1' : '💥 พัง! แต่ไม่มีอะไรให้เสียเลย'
  }
}

// ---------- v115 compare table (anvil stage) ----------
/** Stats where a bigger number is worse (cooldowns, cuts): the arrow colour flips so ▲ green always means "better". */
const LOWER_BETTER = new Set(['mod.mgUltCd', 'mod.smashCd', 'mod.resRegenCut', 'mod.skillDmgCut'])
/** One row of the compare table. d: 1 better, -1 worse, 0 same. `curse` = the new value is a downside (shown with 💀). */
export interface CmpRow { key: string; label: string; now: string; next: string; d: -1 | 0 | 1; curse: boolean }

const show = (e: StatEntry | undefined) => (!e ? '—' : e.fmt(Math.abs(e.v)) === '' ? '✓' : `${e.v < 0 ? '-' : ''}${e.fmt(Math.abs(e.v))}`)

/** Item-level diff a -> b (a = null: nothing there, every stat of b is new). Changed rows first; otherwise b's stat order, then a's leftovers. */
export function compareRows(a: Item | null, b: Item): CmpRow[] {
  const ea = new Map(a ? statEntries(a, false).map((e) => [e.key, e] as const) : [])
  const eb = new Map(statEntries(b, false).map((e) => [e.key, e] as const))
  const keys = [...eb.keys(), ...[...ea.keys()].filter((k) => !eb.has(k))]
  const rows = keys.map((key): CmpRow => {
    const x = ea.get(key), y = eb.get(key), ref = (y ?? x)!
    const va = x?.v ?? 0, vb = y?.v ?? 0, diff = vb - va
    const moved = Math.abs(diff) > 1e-6 && ref.fmt(Math.abs(diff)) !== ref.fmt(0)
    const up = (diff > 0) !== LOWER_BETTER.has(key)
    return { key, label: ref.label, now: show(x), next: show(y), d: !moved ? 0 : up ? 1 : -1, curse: (y ? vb : va) < 0 || (LOWER_BETTER.has(key) && (y ? vb : va) > 0) }
  })
  return rows.map((r, i) => ({ r, i })).sort((p, q) => Number(q.r.d !== 0) - Number(p.r.d !== 0) || p.i - q.i).map((x) => x.r)
}

/** What this item would replace if worn (forged as worn), or null: it is worn already, or that slot holds an empty item. */
export function wornRival(s: SaveData, it: Item): Item | null {
  if (isWorn(s, it.id)) return null
  const id = s.equipped[replaceSlot(s.equipped, it.id)]
  if (!id || Object.values(EMPTY_ITEM).includes(id)) return null
  return ITEMS.find((x) => x.id === id) ?? null
}

/** Find the set definition an item belongs to (via explicit setId or memberIds lookup). */
export function itemSetOf(it: Item): ItemSet | undefined {
  return it.setId ? setById(it.setId) : ITEM_SETS.find((st) => st.memberIds?.includes(it.id))
}
/** Every set the item counts for (Q 2026-11-19: a shared early piece can be in its own set AND a class set). Primary first. */
export function itemSetsOf(it: Item): ItemSet[] {
  const out = ITEM_SETS.filter((st) => st.id === it.setId || !!st.memberIds?.includes(it.id))
  const p = itemSetOf(it)
  return p ? [p, ...out.filter((x) => x !== p)] : out
}

function sameModStats(a: Partial<Stats> | undefined, b: Partial<Stats> | undefined): boolean {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]) as Set<keyof Stats>
  for (const k of keys) if ((a?.[k] ?? 0) !== (b?.[k] ?? 0)) return false
  return true
}

function addModToItem(base: Item, extra: Partial<Stats> | undefined): Item {
  if (!extra) return base
  const mod: Partial<Stats> = { ...base.mod }
  for (const k of Object.keys(extra) as (keyof Stats)[]) {
    const v = extra[k]
    if (v) mod[k] = (mod[k] ?? 0) + v
  }
  return { ...base, mod }
}

/**
 * Resolve an item's forged stats including its imbued Aspect (or a hypothetical next Aspect).
 * Probes whether forged() already merges aspectModOf() so preview/compare stay exact before & after forge-state updates.
 */
export function forgedWithAspect(s: SaveExt, it: Item, nextAspectId?: AspectId): Item {
  const targetSave: SaveExt = nextAspectId
    ? { ...s, imbue: { ...(s.imbue ?? {}), [it.id]: nextAspectId } }
    : s
  const baseSave: SaveExt = { ...s, imbue: { ...(s.imbue ?? {}) } }
  if (baseSave.imbue) delete baseSave.imbue[it.id]

  const modProbe = ASPECT_LIST.find((a) => a.mod && Object.keys(a.mod).length > 0)
  const noImbueItem = forged(baseSave, it)
  let forgeAppliesAspect = false
  if (modProbe) {
    const probeSave: SaveExt = { ...baseSave, imbue: { ...(baseSave.imbue ?? {}), [it.id]: modProbe.id } }
    forgeAppliesAspect = !sameModStats(noImbueItem.mod, forged(probeSave, it).mod)
  }

  if (forgeAppliesAspect) return forged(targetSave, it)
  const aspMod = nextAspectId ? ASPECTS[nextAspectId]?.mod : aspectModOf(targetSave, it)
  return addModToItem(noImbueItem, aspMod)
}

// ---------- 📜 recipe list: 🧩 filter grouped by set (Q 2026-11-19) ----------
/** Recipe sort key: dungeon order, then rift, then shop items. */
export const dgIx = (it: Item) => {
  if (!it.craft) return DUNGEONS.length + 2
  if (it.craft.dg === 'rift') return DUNGEONS.length
  const ix = DUNGEONS.findIndex((d) => d.id === it.craft!.dg)
  return ix >= 0 ? ix : DUNGEONS.length + 1
}
const PER = 6, ROW_H = 52
export const HEAD_H = 26
/** List area height: a set header + 6 item rows (pager sits under it). The 🧩 filter packs set headers + items into this height. */
const LIST_H = HEAD_H + 4 + PER * (ROW_H + 4) // header + 6 rows
/** One line of the left list: a recipe, or (🧩 filter) a set header. `cont` = the set carried over from the previous page. */
export type Row = { kind: 'item'; it: Item } | { kind: 'head'; set: ItemSet; ids: string[]; cont: boolean }
const rowH = (r: Row) => (r.kind === 'item' ? ROW_H + 4 : HEAD_H + 4)
/** "D1-D5" span of a set's forge recipes (from each piece's craft dungeon). */
export function setSpan(ids: readonly string[]): string {
  const ns = ids.map((id) => itemById(id)?.craft?.dg).filter((d): d is string => !!d && /^d\d+$/.test(d)).map((d) => Number(d.slice(1)))
  if (!ns.length) return ''
  const lo = Math.min(...ns), hi = Math.max(...ns)
  return lo === hi ? `D${lo}` : `D${lo}-D${hi}`
}
/** Group recipes by set (sets in the order of their earliest piece), then pack them into pages by height.
 *  A set starts on a fresh page unless it fits whole; a set longer than a page repeats its header (↪) on the next one. */
export function setPages(items: readonly Item[], setsOf: (it: Item) => readonly ItemSet[], h = LIST_H): Row[][] {
  const groups = new Map<string, { set: ItemSet; items: Item[] }>()
  for (const it of items) {
    for (const st of setsOf(it)) { // a piece in two sets shows under both headers
      const g = groups.get(st.id) ?? { set: st, items: [] }
      g.items.push(it)
      groups.set(st.id, g)
    }
  }
  const order = [...groups.values()].sort((a, b) => dgIx(a.items[0]) - dgIx(b.items[0]) || ITEM_SETS.indexOf(a.set) - ITEM_SETS.indexOf(b.set))
  const pages: Row[][] = []
  let page: Row[] = [], used = 0
  const push = (r: Row) => { page.push(r); used += rowH(r) }
  const flush = () => { if (page.length) pages.push(page); page = []; used = 0 }
  for (const g of order) {
    const ids = g.items.map((it) => it.id)
    if (used > 0 && used + HEAD_H + 4 + ids.length * (ROW_H + 4) > h) flush() // a set that won't fit the rest of this page starts a fresh one
    push({ kind: 'head', set: g.set, ids, cont: false })
    for (const it of g.items) {
      if (used + ROW_H + 4 > h) { flush(); push({ kind: 'head', set: g.set, ids, cont: true }) }
      push({ kind: 'item', it })
    }
  }
  flush()
  return pages
}
