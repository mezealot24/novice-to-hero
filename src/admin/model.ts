// admin.html: pure helpers (no DOM). Defaults are read from this build's untouched src/data (admin never applies a patch).
import { BATTLE, DUNGEONS, MONSTERS, type MonSkill, type MonsterDef, type MonsterKind } from '../data/game-data'
import type { BaseStat } from '../data/meta'
import { homeDungeon, legacyLevel, monBase, monPoints, monTier, roomLevel, scaleOf, skillAtLv, skillMul, statMonster, statNative, withStats } from '../data/mon-stats'
import { castLv, describeFormula, skillLvBonus } from '../data/mon-skill-scale'
import { applyPatch, guardsFor, listFields, type FieldRow } from '../data/patch'
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

// ---------- monster card: sections + human labels ----------
const FX: Record<string, string> = { poison: 'พิษ', burn: 'เผา', weaken: 'อ่อนแรง', armorBreak: 'เกราะแตก', silence: 'ใบ้', slow: 'ช้า', web: 'ใยพันตัว', freeze: 'แช่แข็ง' }
const BODY: Record<string, string> = {
  hp: 'HP', dmg: 'ATK', matk: 'M.ATK', def: 'DEF', flee: 'Flee', hit: 'Hit', crit: 'โอกาสคริ', combo: 'โอกาสคอมโบ', counter: 'โอกาสสวนกลับ',
  speedMul: 'ความเร็ว ×', 'bodyMul.hp': 'HP ×', 'bodyMul.dmg': 'ATK ×', 'bodyMul.matk': 'M.ATK ×',
  xp: 'EXP', 'zeny.0': 'Zeny ต่ำสุด', 'zeny.1': 'Zeny สูงสุด',
  lifesteal: 'ดูดเลือด', reflect: 'สะท้อนดาเมจ', absorb: 'ดูดซับ → Soul Strike', razor: 'Blood Razor', fixedFlee: 'หลบตายตัว',
  deathBlast: 'ระเบิดตอนตาย ×', shots: 'จำนวนนัดต่อการตี',
  'venom.dmg': 'Venom ดาเมจ', 'venom.dex': 'Venom +DEX', 'venom.turns': 'Venom นาน (เทิร์น)',
  'trueSight.after': 'True Sight หลังโดนหลบ (ครั้ง)', 'trueSight.turns': 'True Sight นาน (เทิร์น)',
  slamMul: 'แรงท่าชาร์จ ×', chargeEvery: 'ชาร์จทุก N เทิร์น',
}
const SKILL_LEAF: Record<string, string> = { every: 'ใช้ทุก N เทิร์น', pow: 'พลัง', turns: 'นาน (เทิร์น)', hits: 'จำนวนฮิต', alone: 'ตัวคูณตอนอยู่ตัวเดียว', drain: 'ดูด HP ฮีโร่', lv: '⭐ เลเวลสกิล (ว่าง = 1)' }
const PHASE_LEAF: Record<string, string> = {
  at: 'เข้าเฟสเมื่อ HP ≤', speed: 'ความเร็ว ×', dmg: 'ดาเมจ ×', heal: 'ฮีลตอนเข้าเฟส', shield: 'โล่ตอนเข้าเฟส',
  reflect: 'สะท้อนดาเมจ', absorb: 'ดูดซับ → Soul Strike', chargeEvery: 'ชาร์จทุก N เทิร์น', drainStats: 'ดูด stat', 'summon.1': 'จำนวนซัมมอน',
}
const fxLabel = (rest: string[], pre: string): string | undefined => (FX[rest[1]] ? `${pre}${FX[rest[1]]}` : undefined)

export interface MonField { row: FieldRow; label: string }
export interface MonSection { id: string; title: string; fields: MonField[] }
const FIXED: [id: string, title: string][] = [
  ['core', '⚔️ ค่าพลังหลัก'], ['reward', '💰 รางวัล'], ['stat', '📊 แจกสเตตัส (statAlloc)'],
  ['special', '🧬 ความสามารถพิเศษ'], ['onHit', '🩸 ตีโดนแล้วติดสถานะ'], ['slam', '💥 ท่าชาร์จ'],
]

/** D6+ stat monsters build hp / dmg / matk from their stats only (statMonster): those leaves are placeholders, never read. */
const NATIVE_UNUSED = new Set(['hp', 'dmg', 'matk'])
const NATIVE_BONUS = new Set(['def', 'hit', 'flee', 'crit', 'combo', 'counter'])

/** One monster's fields -> titled sections (core / reward / stat / ... / one per skill / one per phase), each label in Thai. */
export function monSections(k: MonsterKind, rows: FieldRow[]): MonSection[] {
  const m = MONSTERS[k], secs = new Map<string, MonSection>(), native = statNative(k)
  if (native) rows = rows.filter((r) => !NATIVE_UNUSED.has(r.path.slice(k.length + 1)))
  const put = (id: string, title: string, row: FieldRow, label: string) => {
    const s = secs.get(id) ?? { id, title, fields: [] }
    s.fields.push({ row, label }); secs.set(id, s)
  }
  const fixed = new Map(FIXED)
  const putFixed = (id: string, row: FieldRow, label: string) => put(id, fixed.get(id) ?? id, row, label)
  for (const row of rows) {
    const rel = row.path.slice(k.length + 1), p = rel.split('.')
    if (p[0] === 'skills') {
      const s = m.skills?.[Number(p[1])]
      let rest = p.slice(2), pre = ''
      if (rest[0] === 'pick') { pre = `${s?.pick?.[Number(rest[1])]?.name ?? `#${rest[1]}`} · `; rest = rest.slice(2) }
      const leaf = rest[0] === 'fx' ? fxLabel(rest, 'ติด') : SKILL_LEAF[rest.join('.')]
      put(`skill${p[1]}`, `✨ สกิล · ${s?.name ?? p[1]}${s ? ` (${s.kind})` : ''}`, row, pre + (leaf ?? rest.join('.')))
    } else if (p[0] === 'phases') {
      const ph = m.phases?.[Number(p[1])], rest = p.slice(2)
      const leaf = rest[0] === 'onHit' ? fxLabel(rest, 'ตีโดนติด ') : rest[0] === 'slamFx' ? fxLabel(rest, 'ท่าชาร์จติด ') : PHASE_LEAF[rest.join('.')]
      put(`phase${p[1]}`, `🔥 เฟส ${Number(p[1]) + 1} · ${ph?.name ?? ''}`, row, leaf ?? rest.join('.'))
    } else if (p[0] === 'statAlloc') putFixed('stat', row, p[1].toUpperCase())
    else if (p[0] === 'pointsMul') putFixed('stat', row, 'แต้มรวม × (pointsMul)')
    else if (p[0] === 'onHit') putFixed('onHit', row, FX[p[1]] ?? rel)
    else if (p[0] === 'slamFx') putFixed('slam', row, fxLabel(p, 'ติด') ?? rel)
    else if (p[0] === 'slamMul' || p[0] === 'chargeEvery') putFixed('slam', row, BODY[rel])
    else if (p[0] === 'xp' || p[0] === 'zeny') putFixed('reward', row, BODY[rel] ?? rel)
    else if (['hp', 'dmg', 'matk', 'def', 'flee', 'hit', 'crit', 'combo', 'counter', 'speedMul', 'bodyMul'].includes(p[0]))
      putFixed('core', row, native && NATIVE_BONUS.has(rel) ? `${BODY[rel]} (โบนัส +)` : BODY[rel] ?? rel)
    else putFixed('special', row, BODY[rel] ?? rel)
  }
  const head = FIXED.map(([id]) => secs.get(id)).filter((s): s is MonSection => !!s)
  return [...head, ...[...secs.values()].filter((s) => !fixed.has(s.id))]
}

// ---------- what the game actually fights ----------
export interface MonPreview {
  lv: number; hp: number; dmg: number; matk: number; def: number; mdef: number; hit: number; flee: number
  crit: number; combo: number; counter: number; speed: number; base: Partial<Record<BaseStat, number>>
}

/** Levels the monster is fought at: D6+ = the rooms of its home dungeon it spawns in (lowest, highest); D1-5 / events = home level. */
export function previewLevels(k: MonsterKind): number[] {
  const d = MONSTERS[k], dg = DUNGEONS.find((x) => x.id === homeDungeon(k))
  if (!dg?.level || !statNative(k)) return [legacyLevel(k, d, { id: '' })]
  const lvs = dg.rooms.flatMap((r, i) => (r.spawn.some(([s]) => s === k) || (r.mini && (r.miniPool ?? MINI_POOL).includes(k)) ? [roomLevel(dg.level!, dg.rooms, i)] : []))
  if (!lvs.length) return [d.ai === 'boss' ? dg.level[1] : dg.level[0]] // only ever summoned
  const lo = Math.min(...lvs), hi = Math.max(...lvs)
  return lo === hi ? [lo] : [lo, hi]
}

function computeMonPreview(k: MonsterKind): MonPreview[] {
  return previewLevels(k).map((lv) => {
    const m = statNative(k) ? statMonster(MONSTERS[k], lv) : withStats(MONSTERS[k], k, lv)
    return {
      lv, hp: m.hp, dmg: m.dmg, matk: m.matk ?? m.dmg, def: m.def ?? 0, mdef: m.mdef ?? 0, hit: m.hit ?? 15, flee: m.flee ?? 5,
      crit: m.crit ?? 0, combo: m.combo ?? 0, counter: m.counter ?? 0, speed: m.speed ?? BATTLE.monSpeed[k] ?? 10, base: { ...m.base },
    }
  })
}

/** Run the game's own stat formulas (statMonster / withStats) with `patch` applied, then put the build defaults back. */
export function previewMon(k: MonsterKind, patch: Patch): MonPreview[] {
  const r = applyPatch(patch, guardsFor(patch))
  try { return computeMonPreview(k) } finally { r.revert() }
}

/** Batch preview for many monsters under a single patch apply/revert (fast table rendering). */
export function previewManyMons(kinds: MonsterKind[], patch: Patch): Map<MonsterKind, MonPreview[]> {
  const out = new Map<MonsterKind, MonPreview[]>()
  const r = applyPatch(patch, guardsFor(patch))
  try {
    for (const k of kinds) out.set(k, computeMonPreview(k))
    return out
  } finally { r.revert() }
}

/** v124: one preview level as the game casts it: monster Lv -> cast Lv (own Lv + 1 / 10 monster Lv), hero-style damage text. */
export interface SkillCast { monLv: number; lv: number; dmg?: string; hits?: number; fx: string }
export interface SkillPreview { name: string; kind: string; lv: number; every: number; pow?: number; hits?: number; turns?: number; fx: string; casts: SkillCast[] }
const FX_ICON: Record<string, string> = { poison: '☠️', burn: '🔥', weaken: '💢', armorBreak: '🛡️', silence: '🤐', slow: '🐌', web: '🕸️', freeze: '❄️' }
/** Each skill as the game casts it at its level (skillAtLv), with `patch` applied. Spell rotations list each pick. */
export function previewSkills(k: MonsterKind, patch: Patch): SkillPreview[] {
  const r = applyPatch(patch, guardsFor(patch))
  try {
    const out: SkillPreview[] = []
    const d0 = MONSTERS[k], mons = previewLevels(k).map((lv) => (statNative(k) ? statMonster(d0, lv) : withStats(d0, k, lv)))
    const fxOf = (sk: MonSkill) => Object.entries(sk.fx ?? {}).filter(([, v]) => v).map(([f, v]) => `${FX_ICON[f] ?? f}${v}`).join(' ')
    for (const raw of d0.skills ?? []) for (const p of raw.pick ?? [raw]) {
      const own = p.lv ?? raw.lv ?? 1, sk = skillAtLv(p, own)
      const casts = mons.map((m): SkillCast => {
        const c = skillAtLv(p, castLv(own, skillLvBonus(k, m.lv ?? 1, d0)))
        return { monLv: m.lv ?? 1, lv: c.lv ?? 1, dmg: dmgText(c, m), hits: c.hits, fx: fxOf(c) }
      })
      out.push({ name: sk.name, kind: sk.kind, lv: sk.lv ?? 1, every: raw.every, pow: sk.pow, hits: sk.hits, turns: sk.turns, fx: fxOf(sk), casts })
    }
    return out
  } finally { r.revert() }
}

/** Hero-style damage of a bolt / strike hit: the formula text (MonSkill.f) or "% of P.ATK / M.ATK" (x0.55 x pow x stat scale). */
function dmgText(sk: MonSkill, m: MonsterDef): string | undefined {
  if (sk.kind !== 'bolt' && sk.kind !== 'strike') return undefined
  if (sk.f) return describeFormula(sk.f, sk.lv ?? 1)
  const pct = BATTLE.monDmgMul * (sk.pow ?? 1.3) * skillMul(m, scaleOf(sk)) * 100
  return `${Math.round(pct)}% ${sk.kind === 'bolt' ? 'M.ATK' : 'P.ATK'}${sk.alone ? ` (ตัวเดียว ×${sk.alone})` : ''}`
}

// ---------- "🎯 พิมพ์ stat ที่อยากได้": target stats -> statAlloc weights + pointsMul ----------
export const BASE7: BaseStat[] = ['str', 'vit', 'wis', 'dex', 'int', 'luk', 'agi']
export interface AllocPlan {
  lv: number; base: number; need: number; pointsMul: number
  weights: Record<BaseStat, number>; result: Record<BaseStat, number>
}
/** Stats typed for level `lv` -> weights (largest = 20, ratios kept) and the pointsMul that makes the budget fit.
 *  pm = null: fit the budget (pointsMul = needed / base points); a number: keep that pointsMul (stats come out scaled). */
export function allocFor(k: MonsterKind, lv: number, target: Partial<Record<BaseStat, number>>, pm: number | null): AllocPlan {
  const base = monPoints(lv, monTier(MONSTERS[k]))
  const want = BASE7.map((s) => Math.max(0, Math.round(target[s] ?? 1) - 1)) // every stat starts at 1
  const need = want.reduce((a, n) => a + n, 0), top = Math.max(0, ...want)
  const pointsMul = pm ?? Math.min(10, Math.max(0.1, base > 0 ? Number((need / base).toFixed(2)) : 1))
  const weights = Object.fromEntries(BASE7.map((s, i) => [s, top ? Number(((want[i] / top) * 20).toFixed(2)) : 0])) as Record<BaseStat, number>
  return { lv, base, need, pointsMul, weights, result: monBase(weights, Math.round(base * pointsMul)) }
}

/** 0..1-ish shares read better as %: crit 0.06 -> "6%". undefined for everything else. */
export function pctHint(def: FieldDef, v: number | undefined): string | undefined {
  if (v === undefined || def.kind !== 'num' || def.min < 0 || def.max > 1.5) return undefined
  return `${Number((v * 100).toPrecision(4))}%`
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
