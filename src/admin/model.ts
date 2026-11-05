// admin.html: pure helpers (no DOM). Defaults are read from this build's untouched src/data (admin never applies a patch).
import { DUNGEONS, MONSTERS, type MonSkill, type MonsterKind } from '../data/game-data'
import { listFields, type FieldRow } from '../data/patch'
import { MINI_POOL } from '../data/relics'
import { TABLES, type FieldDef, type Patch, type TableId } from '../data/tunables'

export type Tier = 'normal' | 'mini' | 'boss'
export const TIER_LABEL: Record<Tier, string> = { normal: 'มอนสเตอร์ปกติ', mini: 'มินิบอส', boss: 'บอส (MVP)' }
export interface MonGroup { id: string; name: string; tiers: Record<Tier, MonsterKind[]> }

export const tierOf = (k: MonsterKind): Tier => (MONSTERS[k].mini ? 'mini' : MONSTERS[k].ai === 'boss' ? 'boss' : 'normal')

/** What a monster calls in (summon, phase summons, summon skills): listed in the same dungeon. */
function summonsOf(k: MonsterKind): MonsterKind[] {
  const d = MONSTERS[k], out: MonsterKind[] = []
  if (d.summon) out.push(d.summon)
  for (const p of d.phases ?? []) if (p.summon) out.push(p.summon[0])
  const skill = (s: MonSkill) => { if (s.summon) out.push(s.summon[0]); for (const x of s.pick ?? []) skill(x) }
  for (const s of d.skills ?? []) skill(s)
  return out
}

/** Dungeon -> normal / mini / boss. A monster sits in the first dungeon it shows up in; the rest go to "อื่น ๆ". */
export function monsterGroups(): MonGroup[] {
  const seen = new Set<MonsterKind>(), groups: MonGroup[] = []
  const blank = (): Record<Tier, MonsterKind[]> => ({ normal: [], mini: [], boss: [] })
  const add = (g: MonGroup, k: MonsterKind) => {
    if (seen.has(k) || !MONSTERS[k]) return
    seen.add(k); g.tiers[tierOf(k)].push(k)
    for (const s of summonsOf(k)) add(g, s)
  }
  for (const d of DUNGEONS) {
    const g: MonGroup = { id: d.id, name: `${d.id.toUpperCase()} · ${d.name}`, tiers: blank() }
    for (const r of d.rooms) {
      for (const [k] of r.spawn) add(g, k)
      if (r.mini) for (const k of r.miniPool ?? MINI_POOL) add(g, k)
    }
    groups.push(g)
  }
  const rest: MonGroup = { id: 'other', name: 'อื่น ๆ (อีเวนต์ / ซัมมอน)', tiers: blank() }
  for (const k of Object.keys(MONSTERS) as MonsterKind[]) add(rest, k)
  groups.push(rest)
  return groups.filter((g) => g.tiers.normal.length + g.tiers.mini.length + g.tiers.boss.length > 0)
}

// ---------- fields ----------
const fieldCache = new Map<TableId, FieldRow[]>()
/** Every tunable leaf of a table with its BUILD default (computed once, before anything could patch the data). */
export function fields(t: TableId): FieldRow[] {
  let f = fieldCache.get(t)
  if (!f) { f = listFields(t); fieldCache.set(t, f) }
  return f
}
const defaultIndex = new Map<TableId, Map<string, FieldRow>>()
export function fieldRow(t: TableId, path: string): FieldRow | undefined {
  let m = defaultIndex.get(t)
  if (!m) { m = new Map(fields(t).map((r) => [r.path, r])); defaultIndex.set(t, m) }
  return m.get(path)
}

/** "skills.0.every" -> "skills.0 (ปล่อยสปอร์พิษ).every": array elements get their name / id. */
export function fieldLabel(t: TableId, path: string, dropFirst = false): string {
  const parts = path.split('.'), out: string[] = []
  let node: unknown = TABLES[t].target()
  for (let i = 0; i < parts.length; i++) {
    const k = parts[i]
    const next: unknown = node && typeof node === 'object' && Object.prototype.hasOwnProperty.call(node, k) ? (node as Record<string, unknown>)[k] : undefined
    let seg = k
    if (Array.isArray(node) && next && typeof next === 'object') {
      const n = (next as { name?: unknown; id?: unknown }).name ?? (next as { id?: unknown }).id
      if (typeof n === 'string') seg = `${k} (${n})`
    }
    if (!(dropFirst && i === 0)) out.push(seg)
    node = next
  }
  return out.join('.')
}

/** Input text -> a value inside the FieldDef (int rounded). null = empty / not a number (= remove from the patch). */
export function clampField(def: FieldDef, raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  const v = Math.min(def.max, Math.max(def.min, def.kind === 'int' ? Math.round(n) : n))
  return Number.isInteger(v) ? v : Number(v.toPrecision(12)) // no 0.30000000000000004 in the patch
}

// ---------- patch helpers ----------
export const clonePatch = (p: Patch): Patch => JSON.parse(JSON.stringify(p)) as Patch
export const patchSize = (p: Patch) => Object.values(p).reduce((n, t) => n + Object.keys(t ?? {}).length, 0)
export const valueIn = (p: Patch | undefined, t: TableId, path: string): number | undefined => p?.[t]?.[path]

export function setIn(p: Patch, t: TableId, path: string, v: number | null) {
  if (v === null) {
    const rows = p[t]
    if (rows) { delete rows[path]; if (!Object.keys(rows).length) delete p[t] }
  } else (p[t] ??= {})[path] = v
}

export interface DiffRow { table: TableId; path: string; def: number | undefined; from: number | undefined; to: number | undefined }
/** Every path whose effective value differs between two patches (absent = the build default). */
export function diffPatches(from: Patch, to: Patch): DiffRow[] {
  const out: DiffRow[] = []
  const tables = new Set([...Object.keys(from), ...Object.keys(to)] as TableId[])
  for (const t of tables) {
    if (!TABLES[t]) continue
    const paths = new Set([...Object.keys(from[t] ?? {}), ...Object.keys(to[t] ?? {})])
    for (const path of paths) {
      const def = fieldRow(t, path)?.value
      const a = valueIn(from, t, path) ?? def, b = valueIn(to, t, path) ?? def
      if (a !== b) out.push({ table: t, path, def, from: a, to: b })
    }
  }
  return out.sort((x, y) => (x.table === y.table ? x.path.localeCompare(y.path) : x.table.localeCompare(y.table)))
}
