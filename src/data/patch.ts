// One validator for game, server and admin.html (no deps). Errors reject the WHOLE release; unknown paths / guard
// mismatches are skipped one by one (code moved on since the release was made). Own keys only, no prototype keys.
import { CONFIG_SCHEMA, TABLES, TABLE_IDS, type FieldDef, type Guards, type Patch, type Release, type TableId } from './tunables'

export const MAX_ENTRIES = 5000
const MAX_PATH = 200
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor'])
const SEG_RE = /^[A-Za-z0-9_]+$/
const INDEX_RE = /^(0|[1-9]\d{0,5})$/

export type SkipReason = 'table' | 'unknown' | 'missing' | 'type' | 'guard'
export interface Skip { table: string; path: string; reason: SkipReason; detail?: string }
export interface PatchError { table: string; path: string; msg: string }
interface Entry { table: TableId; path: string; value: number; parent: Record<string, unknown>; key: string }
export interface CheckResult { ok: boolean; errors: PatchError[]; skipped: Skip[]; /** entries that would be written */ count: number }

type Obj = Record<string, unknown>
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)
const isRecord = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype
const isObj = (x: unknown): x is Obj => !!x && typeof x === 'object'
/** The identity a guard pins an array element to. */
const identity = (x: unknown): string | undefined => {
  if (!isObj(x)) return undefined
  const n = has(x, 'name') ? x.name : has(x, 'id') ? x.id : undefined
  return typeof n === 'string' ? n : undefined
}

// ---------- patterns ----------
type Seg = '*' | Set<string>
const compiled = new Map<TableId, { segs: Seg[]; def: FieldDef }[]>()
function patternsOf(t: TableId) {
  let c = compiled.get(t)
  if (!c) {
    c = TABLES[t].fields.map(([p, def]) => ({ segs: p.split('.').map((s): Seg => (s === '*' ? '*' : new Set(s.split('|')))), def }))
    compiled.set(t, c)
  }
  return c
}
const segOk = (s: Seg, k: string) => s === '*' || s.has(k)

/** The whitelist entry for a path (first matching pattern wins), or undefined = not tunable. */
export function fieldFor(table: TableId, path: string): FieldDef | undefined {
  const parts = path.split('.')
  return patternsOf(table).find((p) => p.segs.length === parts.length && p.segs.every((s, i) => segOk(s, parts[i])))?.def
}

/** Syntax check only (no registry): null = fine. */
function pathError(path: string): string | null {
  if (typeof path !== 'string' || !path || path.length > MAX_PATH) return 'bad path'
  for (const s of path.split('.')) {
    if (FORBIDDEN.has(s)) return `forbidden key "${s}"`
    if (!SEG_RE.test(s)) return 'bad path segment'
  }
  return null
}

/** Walk to the leaf's parent through own keys. Array elements with a name / id must match their guard. */
function resolve(table: TableId, path: string, guards: Record<string, string> | undefined): { parent: Obj; key: string } | Skip {
  const parts = path.split('.')
  let node: unknown = TABLES[table].target()
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i]
    if (!isObj(node) || !has(node, k) || (Array.isArray(node) && !INDEX_RE.test(k))) return { table, path, reason: 'missing', detail: parts.slice(0, i + 1).join('.') }
    const child: unknown = (node as Obj)[k]
    if (Array.isArray(node)) {
      const id = identity(child), at = parts.slice(0, i + 1).join('.')
      if (id !== undefined && guards?.[at] !== id) return { table, path, reason: 'guard', detail: `${at}: expected "${guards?.[at] ?? '(no guard)'}", code has "${id}"` }
    }
    node = child
  }
  if (!isObj(node)) return { table, path, reason: 'missing' }
  return { parent: node as Obj, key: parts[parts.length - 1] }
}

function leafProblem(parent: Obj, key: string, def: FieldDef): SkipReason | null {
  if (Array.isArray(parent)) {
    if (!INDEX_RE.test(key) || !has(parent, key)) return 'missing' // never grow an array
  } else if (!has(parent, key)) {
    return def.optional && Object.isExtensible(parent) ? null : 'missing'
  }
  const d = Object.getOwnPropertyDescriptor(parent, key)
  if (!d || !('value' in d) || !d.writable || typeof d.value !== 'number') return 'type' // getter, string, object ...
  return null
}

function walk(patch: unknown, guards: unknown): { errors: PatchError[]; skipped: Skip[]; entries: Entry[] } {
  const errors: PatchError[] = [], skipped: Skip[] = [], entries: Entry[] = []
  if (!isRecord(patch)) return { errors: [{ table: '', path: '', msg: 'patch must be an object' }], skipped, entries }
  if (guards !== undefined && !isRecord(guards)) return { errors: [{ table: '', path: '', msg: 'guards must be an object' }], skipped, entries }
  const g: Obj = guards ?? {}
  let total = 0
  for (const t of Object.keys(patch)) {
    const rows = patch[t]
    if (FORBIDDEN.has(t)) { errors.push({ table: t, path: '', msg: `forbidden key "${t}"` }); continue }
    if (!isRecord(rows)) { errors.push({ table: t, path: '', msg: 'table must be an object' }); continue }
    total += Object.keys(rows).length
  }
  if (total > MAX_ENTRIES) return { errors: [{ table: '', path: '', msg: `too many entries (${total} > ${MAX_ENTRIES})` }], skipped, entries }
  for (const t of Object.keys(g)) {
    const gt = g[t]
    if (FORBIDDEN.has(t) || !isRecord(gt) || Object.entries(gt).some(([k, v]) => pathError(k) !== null || typeof v !== 'string' || v.length > 200)) errors.push({ table: t, path: '', msg: 'bad guards' })
  }
  if (errors.length) return { errors, skipped, entries }

  for (const t of Object.keys(patch)) {
    const rows = patch[t] as Obj
    const known = (TABLE_IDS as string[]).includes(t)
    for (const path of Object.keys(rows)) {
      const v = rows[path], pe = pathError(path)
      if (pe) { errors.push({ table: t, path, msg: pe }); continue }
      if (typeof v !== 'number' || !Number.isFinite(v)) { errors.push({ table: t, path, msg: 'not a finite number' }); continue }
      if (!known) { skipped.push({ table: t, path, reason: 'table' }); continue }
      const table = t as TableId, def = fieldFor(table, path)
      if (!def) { skipped.push({ table, path, reason: 'unknown' }); continue }
      if (v < def.min || v > def.max) { errors.push({ table, path, msg: `out of range [${def.min}, ${def.max}]` }); continue }
      if (def.kind === 'int' && !Number.isInteger(v)) { errors.push({ table, path, msg: 'must be an integer' }); continue }
      const r = resolve(table, path, g[table] as Record<string, string> | undefined)
      if ('reason' in r) { skipped.push(r); continue }
      const bad = leafProblem(r.parent, r.key, def)
      if (bad) { skipped.push({ table, path, reason: bad }); continue }
      entries.push({ table, path, value: v, parent: r.parent, key: r.key })
    }
  }
  return { errors, skipped, entries }
}

/** Validate without writing anything. */
export function checkPatch(patch: unknown, guards?: unknown): CheckResult {
  const { errors, skipped, entries } = walk(patch, guards)
  return { ok: errors.length === 0, errors, skipped, count: entries.length }
}

/** Validate, then (only when there is no error at all) write every entry in place. revert() restores the defaults. */
export function applyPatch(patch: unknown, guards?: unknown): CheckResult & { revert: () => void } {
  const { errors, skipped, entries } = walk(patch, guards)
  if (errors.length) return { ok: false, errors, skipped, count: 0, revert: () => {} }
  const undo = entries.map((e) => ({ e, had: has(e.parent, e.key), old: e.parent[e.key] }))
  for (const { parent, key, value } of entries) parent[key] = value
  rebuildDerived()
  return {
    ok: true, errors, skipped, count: entries.length,
    revert: () => {
      for (const { e, had, old } of undo.reverse()) { if (had) e.parent[e.key] = old; else delete e.parent[e.key] }
      rebuildDerived()
    },
  }
}

/** Current value at a path (own keys only, no whitelist check). undefined = absent / not a number. */
export function readPath(table: TableId, path: string): number | undefined {
  if (pathError(path)) return undefined
  let node: unknown = TABLES[table].target()
  for (const k of path.split('.')) {
    if (!isObj(node) || !has(node, k)) return undefined
    node = (node as Obj)[k]
  }
  return typeof node === 'number' ? node : undefined
}

/** Recompute values that are copied from tunables at module load. MVP tables have none (MON_STAT.pointsPerLv is a getter);
 *  refine.ts FODDER must be rebuilt here once ITEMS becomes tunable. */
export function rebuildDerived(): void {}

/** Guards for every array element a patch walks through, read from the current (default) objects. admin.html / tools. */
export function guardsFor(patch: Patch): Guards {
  const out: Guards = {}
  for (const t of Object.keys(patch) as TableId[]) {
    if (!TABLES[t]) continue
    for (const path of Object.keys(patch[t] ?? {})) {
      if (pathError(path)) continue
      let node: unknown = TABLES[t].target()
      const parts = path.split('.')
      for (let i = 0; i < parts.length - 1 && isObj(node) && has(node, parts[i]); i++) {
        const child: unknown = (node as Obj)[parts[i]], id = Array.isArray(node) ? identity(child) : undefined
        if (id !== undefined) (out[t] ??= {})[parts.slice(0, i + 1).join('.')] = id
        node = child
      }
    }
  }
  return out
}

export interface FieldRow { path: string; def: FieldDef; value: number | undefined }
/** Every tunable leaf of a table: present numbers, plus absent optional leaves on existing parents (value undefined). */
export function listFields(table: TableId): FieldRow[] {
  const out = new Map<string, FieldRow>()
  const visit = (node: unknown, segs: Seg[], i: number, at: string[], def: FieldDef) => {
    if (!isObj(node)) return
    const last = i === segs.length - 1, s = segs[i]
    const keys = s === '*' ? Object.keys(node) : [...s]
    for (const k of keys) {
      if (FORBIDDEN.has(k)) continue
      const path = [...at, k].join('.')
      if (!has(node, k)) {
        if (last && def.optional && !Array.isArray(node) && s !== '*' && fieldFor(table, path) === def && !out.has(path)) out.set(path, { path, def, value: undefined })
        continue
      }
      const v: unknown = (node as Obj)[k]
      if (!last) visit(v, segs, i + 1, [...at, k], def)
      else if (typeof v === 'number' && !out.has(path)) out.set(path, { path, def: fieldFor(table, path) ?? def, value: v })
    }
  }
  for (const p of patternsOf(table)) visit(TABLES[table].target(), p.segs, 0, [], p.def)
  return [...out.values()]
}

/** Network shape check (game + admin). The patch itself is checked by checkPatch / applyPatch. */
export function parseRelease(x: unknown): Release | null {
  if (!isObj(x) || Array.isArray(x)) return null
  const { releaseId, schemaVer, hash, patch, guards } = x as Obj
  if (!(releaseId === null || (typeof releaseId === 'number' && Number.isInteger(releaseId) && releaseId > 0))) return null
  if (typeof schemaVer !== 'number' || !Number.isInteger(schemaVer)) return null
  if (hash !== undefined && hash !== null && typeof hash !== 'string') return null
  if (!isRecord(patch) || !(guards === undefined || isRecord(guards))) return null
  return { releaseId, schemaVer, hash: typeof hash === 'string' ? hash : undefined, patch: patch as Patch, guards: (guards ?? {}) as Guards }
}
export const schemaSupported = (v: number) => v <= CONFIG_SCHEMA

/** Sorted-key JSON: the server hashes this (sha256) so the same patch always gets the same release hash. */
export function canonicalJson(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonicalJson).join(',')}]`
  if (isObj(x)) return `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(x[k])}`).join(',')}}`
  return JSON.stringify(x) ?? 'null'
}
