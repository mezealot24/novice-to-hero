// admin.html: "📥 ยืมจาก Hero tree" — copy a hero skill-tree node / talent onto a monster.
// Only the hero Stats keys the monster engine already reads carry over (MAP); everything else is hero-only code (BattleScene)
// and is listed as skipped. Pure: no DOM, no patch writes (main.ts applies the plan to the draft).
import { doubleAtkChance, type MonsterKind, type Stats } from '../data/game-data'
import { BASE_JOBS, JOBS } from '../data/jobs'
import { JOB2, type Job2Id } from '../data/jobs2'
import { BRANCHES, BRANCHES2, nodesOf, talentsOf, type TreeBranch } from '../data/tree'
import { clampField, fieldRow } from './model'

interface MapTo { field: string; label: string; conv?: (v: number) => number; approx?: string }
/** Hero stat -> monster field (same meaning and scale unless `approx`). Added on top of the monster's current value. */
export const HERO_TO_MON: Partial<Record<keyof Stats, MapTo>> = {
  crit: { field: 'crit', label: 'โอกาสคริ' },
  combo: { field: 'combo', label: 'โอกาสคอมโบ' },
  counter: { field: 'counter', label: 'โอกาสสวนกลับ' },
  lifesteal: { field: 'lifesteal', label: 'ดูดเลือด' },
  flee: { field: 'flee', label: 'Flee' },
  hit: { field: 'hit', label: 'Hit' },
  poison: { field: 'onHit.poison', label: 'ตีโดนติดพิษ (stack)' },
  doubleAtk: { field: 'combo', label: 'โอกาสคอมโบ', conv: doubleAtkChance, approx: 'D.Strike → คอมโบของมอน (ตีเพิ่มเหมือนกัน แต่ไม่ใช่กลไกเดียวกัน)' },
  j2Reflect: { field: 'reflect', label: 'สะท้อนดาเมจ', approx: 'มอนสะท้อนเป็นดาเมจเวททุก hit ที่โดน (ฮีโร่สะท้อนเฉพาะกายภาพ)' },
}

export interface HeroSrc { id: string; name: string; icon: string; max: number; group: string; desc: (lv: number) => string; mod: (lv: number) => Partial<Stats> }
export interface HeroClass { id: string; name: string; srcs: HeroSrc[] }

const mappable = (s: HeroSrc) => Object.keys(s.mod(s.max)).some((k) => k in HERO_TO_MON)
const fromBranch = (b: TreeBranch): HeroSrc[] =>
  nodesOf(b.id).map((x) => ({ id: x.id, name: x.name, icon: x.icon, max: x.max, group: `${b.icon} ${b.name}`, desc: x.desc, mod: x.mod }))

let CLASSES: HeroClass[] | null = null
/** Every class (5 base + 10 second jobs) with the nodes / talents that have at least one stat a monster can use. */
export function heroClasses(): HeroClass[] {
  if (CLASSES) return CLASSES
  const out: HeroClass[] = []
  for (const job of BASE_JOBS) {
    const srcs = BRANCHES.filter((b) => b.job === job).flatMap(fromBranch)
    for (const row of [1, 2, 3, 4]) for (const t of talentsOf(job, row))
      srcs.push({ id: t.id, name: t.name, icon: t.icon, max: t.max, group: `⭐ Talent แถว ${row}`, desc: t.desc, mod: t.mod })
    out.push({ id: job, name: `${JOBS[job].icon} ${JOBS[job].name}`, srcs: srcs.filter(mappable) })
  }
  for (const j2 of Object.keys(JOB2) as Job2Id[])
    out.push({ id: j2, name: `${JOB2[j2].icon} ${JOB2[j2].name} (สายสอง)`, srcs: BRANCHES2.filter((b) => b.job2 === j2).flatMap(fromBranch).filter(mappable) })
  CLASSES = out.filter((c) => c.srcs.length)
  return CLASSES
}

export interface BorrowLine { path: string; label: string; from: number; to: number; approx?: string }
export interface BorrowPlan { lines: BorrowLine[]; skipped: string[] }

/** What borrowing `src` at `lv` does to monster `k`. `cur` = the monster's current (draft) value of a monster path. */
export function borrowPlan(k: MonsterKind, src: HeroSrc, lv: number, cur: (path: string) => number | undefined): BorrowPlan {
  const add = new Map<string, { m: MapTo; v: number }>(), skipped: string[] = []
  for (const [key, raw] of Object.entries(src.mod(lv))) {
    if (typeof raw !== 'number' || raw === 0) continue
    const m = HERO_TO_MON[key as keyof Stats]
    if (!m) { skipped.push(key); continue }
    const path = `${k}.${m.field}`
    if (!fieldRow('monsters', path)) { skipped.push(`${m.label}: มอนตัวนี้ไม่มีช่อง ${m.field}`); continue }
    const a = add.get(path) ?? { m, v: 0 }
    a.v += m.conv ? m.conv(raw) : raw
    add.set(path, a)
  }
  const lines: BorrowLine[] = []
  for (const [path, { m, v }] of add) {
    const row = fieldRow('monsters', path)
    if (!row) continue
    const from = cur(path) ?? 0, to = clampField(row.def, String(from + v)) ?? from
    lines.push({ path, label: m.label, from, to, approx: m.approx })
  }
  return { lines, skipped }
}
