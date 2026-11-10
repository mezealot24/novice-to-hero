// admin.html: pure filter, catalog & bulk-edit engine (no DOM). Every bulk write runs through clampField and clean patch storage.
import { MONSTERS, type MonSkillKind, type MonsterKind } from '../data/game-data'
import { JOBS } from '../data/jobs'
import { JOB2, type Job2Id } from '../data/jobs2'
import { statNative } from '../data/mon-stats'
import type { FieldRow } from '../data/patch'
import { SKILL2 } from '../data/skill2'
import { CRIT_SLOTS, critRef, JOB2_IDS, job2Layout, SKILL_CLASSES, SKILL_LAYOUT, type SkillClass, type SkillRef } from '../data/skill-registry'
import { TABLE_IDS, type Patch, type TableId } from '../data/tunables'
import { explainField, explainTableGroup, TABLE_EXPLAIN, type FieldExplain } from './explain'
import { clampField, fieldRow, fields, monsterGroups, previewLevels, setIn, valueIn, type Tier } from './model'

export type BulkOp = 'set' | 'mul' | 'pct' | 'add' | 'resetLive' | 'resetDef'

export interface BulkTarget {
  table: TableId
  path: string
  label?: string
}

export interface BulkResult {
  changed: number
  unchanged: number
  clamped: number
  skipped: number
  sample?: { label: string; from: number | undefined; to: number | undefined }
}

const POW_DEFAULT_MAP: Partial<Record<MonSkillKind, number>> = {
  bolt: 1.3, strike: 1.3, heal: 0.15, shield: 0.1, warcry: 0.2, haste: 30, revive: 0.5,
}
const IDENTITY_ONE_MON = /^(pointsMul|speedMul|bodyMul\.(hp|dmg|matk)|phases\.\d+\.(speed|dmg))$/
const ZERO_OPT_MON = /^(def|crit|combo|counter|lifesteal|reflect|absorb|razor|fixedFlee|statAlloc\.\w+)$/

/** Effective value used at runtime when an optional leaf is absent from both build defaults and patch. */
export function implicitDefault(table: TableId, path: string): number | undefined {
  if (table !== 'monsters') return undefined
  const dot = path.indexOf('.')
  if (dot <= 0) return undefined
  const k = path.slice(0, dot) as MonsterKind
  const rel = path.slice(dot + 1)
  if (IDENTITY_ONE_MON.test(rel)) return 1
  if (ZERO_OPT_MON.test(rel)) return 0
  if (rel === 'hit') return statNative(k) ? 0 : 15
  if (rel === 'flee') return statNative(k) ? 0 : 5
  const mLv = /^skills\.(\d+)(?:\.pick\.(\d+))?\.lv$/.exec(rel)
  if (mLv) return 1
  const mSk = /^skills\.(\d+)(?:\.pick\.(\d+))?\.(pow|hits|turns)$/.exec(rel)
  if (mSk) {
    const mon = MONSTERS[k]
    const raw = mon?.skills?.[Number(mSk[1])]
    const sk = mSk[2] !== undefined ? raw?.pick?.[Number(mSk[2])] : raw
    if (!sk) return undefined
    const prop = mSk[3]
    if (prop === 'hits' && (sk.kind === 'bolt' || sk.kind === 'strike')) return 1
    if (prop === 'turns' && sk.kind === 'warcry') return 3
    if (prop === 'pow') return POW_DEFAULT_MAP[sk.kind as MonSkillKind]
  }
  return undefined
}

export function isUnusedNativeField(table: TableId, path: string): boolean {
  if (table !== 'monsters') return false
  const dot = path.indexOf('.')
  if (dot <= 0) return false
  const k = path.slice(0, dot) as MonsterKind
  const rel = path.slice(dot + 1)
  return (rel === 'hp' || rel === 'dmg' || rel === 'matk') && MONSTERS[k] !== undefined && statNative(k)
}

function shouldStripOptionalIdentity(table: TableId, path: string, row: FieldRow, next: number): boolean {
  if (row.value !== undefined) return false
  if (table !== 'monsters') return false
  const rel = path.slice(path.indexOf('.') + 1)
  if (IDENTITY_ONE_MON.test(rel) && next === 1) return true
  if (rel.startsWith('statAlloc.') && next === 0) return true
  if (/^skills\.\d+(\.pick\.\d+)?\.lv$/.test(rel) && next === 1) return true
  return false
}

export function computeBulkNext(
  draft: Patch,
  live: Patch,
  target: BulkTarget,
  op: BulkOp,
  numArg?: number,
): { skip: boolean; clamped: boolean; from: number | undefined; to: number | undefined; write: number | null; changed: boolean } {
  const { table, path } = target
  const row = fieldRow(table, path)
  if (!row || isUnusedNativeField(table, path)) {
    return { skip: true, clamped: false, from: undefined, to: undefined, write: null, changed: false }
  }
  const d = valueIn(draft, table, path)
  const from = d ?? row.value ?? implicitDefault(table, path)

  if (op === 'resetDef') {
    return {
      skip: false,
      clamped: false,
      from,
      to: row.value,
      write: null,
      changed: d !== undefined,
    }
  }

  if (op === 'resetLive') {
    const lv = valueIn(live, table, path)
    const nextWrite = lv === undefined || lv === row.value ? null : lv
    return {
      skip: false,
      clamped: false,
      from,
      to: lv ?? row.value,
      write: nextWrite,
      changed: d !== nextWrite,
    }
  }

  if (numArg === undefined || !Number.isFinite(numArg)) {
    return { skip: true, clamped: false, from, to: from, write: null, changed: false }
  }

  let rawNext: number
  if (op === 'set') {
    rawNext = numArg
  } else {
    if (from === undefined) {
      return { skip: true, clamped: false, from: undefined, to: undefined, write: null, changed: false }
    }
    if (op === 'mul') rawNext = from * numArg
    else if (op === 'pct') rawNext = from * (1 + numArg / 100)
    else rawNext = from + numArg
  }

  const clampedVal = clampField(row.def, String(rawNext))
  if (clampedVal === null) {
    return { skip: true, clamped: false, from, to: from, write: null, changed: false }
  }
  const wasClamped =
    (row.def.kind === 'int' && Math.round(rawNext) !== clampedVal) ||
    (row.def.kind === 'num' && (rawNext < row.def.min || rawNext > row.def.max))

  const nextWrite =
    clampedVal === row.value || shouldStripOptionalIdentity(table, path, row, clampedVal) ? null : clampedVal
  const changed = nextWrite !== d
  return {
    skip: false,
    clamped: wasClamped,
    from,
    to: clampedVal,
    write: nextWrite,
    changed,
  }
}

/** Applies (or previews if `dryRun`) a BulkOp over `targets`. Mutates `draft` only when `dryRun` is false. */
export function applyBulkOp(
  draft: Patch,
  live: Patch,
  targets: BulkTarget[],
  op: BulkOp,
  numArg?: number,
  dryRun = false,
): BulkResult {
  let changed = 0, unchanged = 0, clamped = 0, skipped = 0
  let sample: BulkResult['sample']
  for (const t of targets) {
    const step = computeBulkNext(draft, live, t, op, numArg)
    if (step.skip) { skipped++; continue }
    if (step.clamped) clamped++
    if (!step.changed) {
      unchanged++
      if (!sample) sample = { label: t.label ?? explainField(t.table, t.path).label, from: step.from, to: step.to }
      continue
    }
    changed++
    if (!sample || sample.from === sample.to) {
      sample = { label: t.label ?? explainField(t.table, t.path).label, from: step.from, to: step.to }
    }
    if (!dryRun) setIn(draft, t.table, t.path, step.write)
  }
  return { changed, unchanged, clamped, skipped, sample }
}

// ---------- Monster Table & Filter ----------
export interface MonRow {
  kind: MonsterKind
  name: string
  title?: string
  dungeonId: string
  dungeonName: string
  tier: Tier
  native: boolean
  lvs: number[]
}

let monCatalogCache: MonRow[] | null = null
export function monsterCatalog(): MonRow[] {
  if (monCatalogCache) return monCatalogCache
  const out: MonRow[] = []
  for (const g of monsterGroups()) {
    for (const tier of ['boss', 'mini', 'normal'] as Tier[]) {
      for (const kind of g.tiers[tier]) {
        const m = MONSTERS[kind]
        out.push({
          kind,
          name: m.name,
          title: m.title,
          dungeonId: g.id,
          dungeonName: g.name,
          tier,
          native: statNative(kind),
          lvs: previewLevels(kind),
        })
      }
    }
  }
  monCatalogCache = out
  return out
}

export interface MonFilter {
  search: string
  dungeon: string
  tier: 'all' | Tier
  model: 'all' | 'native' | 'anchored'
  status: 'all' | 'diffLive' | 'diffDef'
}

export function filterMonsters(filter: MonFilter, draft: Patch, live: Patch): MonRow[] {
  const q = filter.search.trim().toLowerCase()
  const changedMonsters = (compareAgainst: Patch) => {
    const dKeys = new Set<string>()
    for (const p of Object.keys(draft.monsters ?? {})) {
      const k = p.slice(0, p.indexOf('.'))
      if (valueIn(draft, 'monsters', p) !== valueIn(compareAgainst, 'monsters', p)) dKeys.add(k)
    }
    for (const p of Object.keys(compareAgainst.monsters ?? {})) {
      const k = p.slice(0, p.indexOf('.'))
      if (valueIn(draft, 'monsters', p) !== valueIn(compareAgainst, 'monsters', p)) dKeys.add(k)
    }
    return dKeys
  }
  const modLive = filter.status === 'diffLive' ? changedMonsters(live) : null
  const modDef = filter.status === 'diffDef' ? new Set(Object.keys(draft.monsters ?? {}).map((p) => p.slice(0, p.indexOf('.')))) : null

  return monsterCatalog().filter((r) => {
    if (q && !r.kind.includes(q) && !r.name.toLowerCase().includes(q) && !(r.title ?? '').toLowerCase().includes(q) && !r.dungeonName.toLowerCase().includes(q)) return false
    if (filter.dungeon !== 'all' && r.dungeonId !== filter.dungeon) return false
    if (filter.tier !== 'all' && r.tier !== filter.tier) return false
    if (filter.model === 'native' && !r.native) return false
    if (filter.model === 'anchored' && r.native) return false
    if (modLive && !modLive.has(r.kind)) return false
    if (modDef && !modDef.has(r.kind)) return false
    return true
  })
}

export type MonPresetId = 'core' | 'combat' | 'reward' | 'skill0'
export interface MonPresetCol {
  rel: string
  short: string
  tip: string
}
export const MON_PRESETS: Record<MonPresetId, { label: string; cols: MonPresetCol[] }> = {
  core: {
    label: '⚔️ พลังหลัก & ตัวคูณ',
    cols: [
      { rel: 'hp', short: 'HP (D1-5)', tip: 'HP ฐาน (ใช้เฉพาะ D1–5; D6+ คำนวณจาก stat)' },
      { rel: 'dmg', short: 'ATK (D1-5)', tip: 'P.ATK ฐาน (ใช้เฉพาะ D1–5)' },
      { rel: 'bodyMul.hp', short: 'HP ×', tip: 'ตัวคูณ HP สุดท้าย (ใช้ได้ทุกดัน!)' },
      { rel: 'bodyMul.dmg', short: 'ATK ×', tip: 'ตัวคูณ P.ATK สุดท้าย (ใช้ได้ทุกดัน!)' },
      { rel: 'bodyMul.matk', short: 'M.ATK ×', tip: 'ตัวคูณ M.ATK สุดท้าย' },
      { rel: 'pointsMul', short: 'แต้ม stat ×', tip: 'ตัวคูณงบแต้มสเตตัส (ปรับทั้ง HP/ATK/DEF/Speed)' },
      { rel: 'speedMul', short: 'เร็ว ×', tip: 'ตัวคูณความเร็วเทิร์นเกจ (1 = ปกติ)' },
    ],
  },
  combat: {
    label: '🛡️ ป้องกัน & อัตราพิเศษ',
    cols: [
      { rel: 'def', short: 'DEF', tip: 'เกราะกายภาพ (D6+ บวกเพิ่มทับ stat)' },
      { rel: 'hit', short: 'Hit', tip: 'ความแม่นยำ (D6+ บวกเพิ่มทับ stat)' },
      { rel: 'flee', short: 'Flee', tip: 'อัตราหลบหลีก (D6+ บวกเพิ่มทับ stat)' },
      { rel: 'crit', short: 'คริ', tip: 'โอกาสติดคริ (ข้าม Flee)' },
      { rel: 'combo', short: 'คอมโบ', tip: 'โอกาสโจมตีต่อเนื่อง' },
      { rel: 'counter', short: 'สวนกลับ', tip: 'โอกาสสวนหมัดเมื่อโดนตี' },
      { rel: 'lifesteal', short: 'ดูดเลือด', tip: 'ดูดเลือดจากดาเมจที่ทำ (%)' },
    ],
  },
  reward: {
    label: '💰 รางวัล & ท่าชาร์จ/พิเศษ',
    cols: [
      { rel: 'xp', short: 'EXP', tip: 'EXP ในรอบดันเจี้ยน' },
      { rel: 'zeny.0', short: 'Zeny ต่ำสุด', tip: 'เงินดรอปขั้นต่ำ' },
      { rel: 'zeny.1', short: 'Zeny สูงสุด', tip: 'เงินดรอปสูงสุด' },
      { rel: 'slamMul', short: 'แรงชาร์จ ×', tip: 'ตัวคูณท่าชาร์จ/ทุบของบอส' },
      { rel: 'chargeEvery', short: 'ชาร์จ/N เทิร์น', tip: 'ความถี่ท่าชาร์จ (น้อย = บ่อย)' },
      { rel: 'deathBlast', short: 'ระเบิดตาย ×', tip: 'ระเบิดเวทใส่ฮีโร่เมื่อมอนตาย' },
      { rel: 'reflect', short: 'สะท้อน', tip: 'สะท้อนดาเมจกลับฮีโร่' },
    ],
  },
  skill0: {
    label: '✨ สกิลที่ 1 & เฟสที่ 1',
    cols: [
      { rel: 'skills.0.every', short: 'สกิล 1 ทุก N เทิร์น', tip: 'ความถี่ใช้สกิลแรก (น้อย = ถี่)' },
      { rel: 'skills.0.pow', short: 'สกิล 1 พลัง', tip: 'ตัวคูณพลังสกิลแรก' },
      { rel: 'skills.0.lv', short: 'สกิล 1 Lv', tip: 'เลเวลสกิลแรก (+10% pow/Lv)' },
      { rel: 'skills.0.hits', short: 'สกิล 1 ฮิต', tip: 'จำนวนฮิตพื้นฐานสกิลแรก' },
      { rel: 'phases.0.at', short: 'เฟส 1 เข้า ≤ HP', tip: 'เข้าเฟส 1 เมื่อเลือดต่ำกว่า (%)' },
      { rel: 'phases.0.dmg', short: 'เฟส 1 ดาเมจ ×', tip: 'ตัวคูณดาเมจหลังเข้าเฟส 1' },
      { rel: 'phases.0.speed', short: 'เฟส 1 เร็ว ×', tip: 'ตัวคูณความเร็วหลังเข้าเฟส 1' },
    ],
  },
}

// ---------- Skills Catalog & Filter ----------
export type SkillSlotTag = 'crit' | 's1' | 's2' | 's3' | 'ult' | 'tree' | 'other'
export type SkillMetricKind = 'cost' | 'cd' | 'crit' | 'dmg' | 'count' | 'other'

export interface SkillRow {
  id: string
  tier: 'base' | 'job2'
  parentClass: SkillClass
  classId: SkillClass | Job2Id
  className: string
  slot: SkillSlotTag
  slotLabel: string
  metric: SkillMetricKind
  table: 'kit' | 'skills'
  path: string
  row: FieldRow
  explain: FieldExplain
}

function classifySkillMetric(path: string, row: FieldRow): SkillMetricKind {
  if (path.startsWith('crit.')) return 'crit'
  if (/\.cost$|^sword\.(auto|ult)$|ultMana$|boltMana$|cmdCut$/.test(path)) return 'cost'
  if (/\.cd$|Cd$/.test(path)) return 'cd'
  if (row.def.kind === 'int' && /(Turns|Hits|Shots|Stacks|Cleanse|Targets|Dodge|Every|Boxes|Knives|Pulses|Max|Keep|Grace|Chill|Bleed|Poison|Stat|Luk|Pack|Soaks|Traps|Meteors|Lights|Lv)$/i.test(path)) return 'count'
  if (/(Mul|At|Pow|Heal|Shield|Dmg|Base|Per|Crit|Break|Amp|Boom|Slash|Guard|Burn|Razor|Cut|Take|Push|Bonus|Res|Share|Matk|Atk|Def|Hit|Combo|Str|Pm|Pay|Refund)/.test(path)) return 'dmg'
  return 'other'
}

let skillCatalogCache: SkillRow[] | null = null
export function skillCatalog(): SkillRow[] {
  if (skillCatalogCache) return skillCatalogCache
  const out: SkillRow[] = []
  const seen = new Set<string>()
  const pushRef = (
    tier: 'base' | 'job2',
    parentClass: SkillClass,
    classId: SkillClass | Job2Id,
    className: string,
    slot: SkillSlotTag,
    slotLabel: string,
    ref: SkillRef,
  ) => {
    const id = `${ref.table}:${ref.path}`
    if (seen.has(id)) return
    const row = fieldRow(ref.table, ref.path)
    if (!row) return
    seen.add(id)
    out.push({
      id,
      tier,
      parentClass,
      classId,
      className,
      slot,
      slotLabel,
      metric: classifySkillMetric(ref.path, row),
      table: ref.table,
      path: ref.path,
      row,
      explain: explainField(ref.table, ref.path, { defaultLabel: ref.label }),
    })
  }

  for (const c of SKILL_CLASSES) {
    const j = JOBS[c]
    const clsName = `${j.icon} ${j.name}`
    const L = SKILL_LAYOUT[c]
    for (const s of CRIT_SLOTS) pushRef('base', c, c, clsName, 'crit', `คริ · ${s.toUpperCase()}`, critRef(c, s))
    for (const r of L.s1) pushRef('base', c, c, clsName, 's1', `1 · ${j.auto.name}`, r)
    for (const g of L.s2) {
      const s2 = SKILL2.find((x) => x.id === g.id)
      const label = `2 · ${s2?.name ?? g.id}`
      for (const r of g.refs) pushRef('base', c, c, clsName, 's2', label, r)
    }
    for (const r of L.ult) pushRef('base', c, c, clsName, 'ult', `Ult · ${j.ult.name}`, r)
    for (const r of L.tree ?? []) pushRef('base', c, c, clsName, 'tree', 'Skill tree', r)
  }

  for (const id of JOB2_IDS) {
    const j2 = JOB2[id]
    const parent = j2.parent as SkillClass
    const clsName = `${j2.icon} ${j2.name}`
    const l = job2Layout(id)
    for (const r of l.s3) pushRef('job2', parent, id, clsName, 's3', `3 · ${j2.skill3.name}`, r)
    for (const r of l.ult) pushRef('job2', parent, id, clsName, 'ult', `Ult · ${j2.ult.name}`, r)
    for (const r of l.other) pushRef('job2', parent, id, clsName, 'other', `${j2.signature.name} / พาสซีฟ`, r)
  }

  skillCatalogCache = out
  return out
}

export interface SkillFilter {
  search: string
  tier: 'all' | 'base' | 'job2'
  cls: string
  slot: 'all' | SkillSlotTag
  metric: 'all' | SkillMetricKind
  status: 'all' | 'diffLive' | 'diffDef'
}

export function filterSkills(f: SkillFilter, draft: Patch, live: Patch): SkillRow[] {
  const q = f.search.trim().toLowerCase()
  return skillCatalog().filter((r) => {
    if (f.tier !== 'all' && r.tier !== f.tier) return false
    if (f.cls !== 'all' && r.classId !== f.cls && r.parentClass !== f.cls) return false
    if (f.slot !== 'all' && r.slot !== f.slot) return false
    if (f.metric !== 'all' && r.metric !== f.metric) return false
    const dVal = valueIn(draft, r.table, r.path)
    const lVal = valueIn(live, r.table, r.path)
    if (f.status === 'diffLive' && (dVal ?? r.row.value) === (lVal ?? r.row.value)) return false
    if (f.status === 'diffDef' && dVal === undefined) return false
    if (q) {
      const hay = `${r.className} ${r.slotLabel} ${r.path} ${r.explain.label} ${r.explain.effect}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

// ---------- Tables Catalog & Filter ----------
export interface TableRowItem {
  id: string
  table: TableId
  tableShort: string
  groupKey: string
  groupTitle: string
  path: string
  row: FieldRow
  explain: FieldExplain
}

export const BULK_TABLE_IDS: TableId[] = TABLE_IDS.filter((t) => t !== 'monsters' && t !== 'archetypes')

export function tableRows(tablePick: TableId | 'all'): TableRowItem[] {
  const list = tablePick === 'all' ? BULK_TABLE_IDS : [tablePick]
  const out: TableRowItem[] = []
  for (const t of list) {
    const short = TABLE_EXPLAIN[t].short
    for (const row of fields(t)) {
      const dot = row.path.indexOf('.')
      const gk = dot > 0 ? row.path.slice(0, dot) : ''
      const gt = gk ? explainTableGroup(t, gk).title : short
      out.push({
        id: `${t}:${row.path}`,
        table: t,
        tableShort: short,
        groupKey: gk,
        groupTitle: gt,
        path: row.path,
        row,
        explain: explainField(t, row.path),
      })
    }
  }
  return out
}

export interface TableFilter {
  table: TableId | 'all'
  group: string
  search: string
  status: 'all' | 'diffLive' | 'diffDef' | 'setOnly'
}

export function filterTableRows(f: TableFilter, draft: Patch, live: Patch): TableRowItem[] {
  const q = f.search.trim().toLowerCase()
  return tableRows(f.table).filter((r) => {
    if (f.group !== 'all' && r.groupKey !== f.group) return false
    const dVal = valueIn(draft, r.table, r.path)
    const lVal = valueIn(live, r.table, r.path)
    if (f.status === 'diffLive' && (dVal ?? r.row.value) === (lVal ?? r.row.value)) return false
    if (f.status === 'diffDef' && dVal === undefined) return false
    if (f.status === 'setOnly' && r.row.value === undefined && dVal === undefined && lVal === undefined) return false
    if (q) {
      const hay = `${r.tableShort} ${r.groupTitle} ${r.path} ${r.explain.label} ${r.explain.effect}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}
