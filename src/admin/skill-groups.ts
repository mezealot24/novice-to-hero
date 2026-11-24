// Pure UI grouping helper for the admin Class Skills view (zero DOM deps).
// Turns flat SkillRef lists into:
//   1) compact per-level matrix tables (e.g. swordS1.atkPct.0..14 -> one Lv 1-15 table), and
//   2) clean topic sub-groups (e.g. "🪨 กายเหล็ก", "🐉 Dragon Breath") with repeated prefixes stripped.
import type { SkillRef } from '../data/skill-registry'

export interface SkillGroupItem {
  ref: SkillRef
  /** Clean short label with the sub-group prefix stripped (falls back to ref.label). */
  shortLabel: string
}

export interface SkillSubGroup {
  /** Empty string = core / ungrouped params shown first at the top of the section. */
  title: string
  items: SkillGroupItem[]
}

export interface SkillLvRow {
  basePath: string
  table: SkillRef['table']
  label: string
  refs: SkillRef[]
}

export interface SkillLvTable {
  title: string
  lvLabels: string[]
  rows: SkillLvRow[]
}

export interface GroupedSkillSection {
  /** Core / ungrouped items + named topic sub-groups (core first, if non-empty). */
  groups: SkillSubGroup[]
  /** Contiguous per-level arrays (length >= 3) merged by identical level columns. */
  tables: SkillLvTable[]
}

const INDEXED_RE = /^(.+)\.(\d+)$/

/** Strip a uniform leading "🐉 Lord Knight · " prefix when every ref in a section shares it. */
function stripUniformPrefix(labels: string[]): string[] {
  if (labels.length < 2) return labels
  const m = /^([^·]{2,36}·\s+)/.exec(labels[0])
  if (!m) return labels
  const pre = m[1]
  return labels.every((l) => l.startsWith(pre)) ? labels.map((l) => l.slice(pre.length).trim()) : labels
}

/** Extract level label + clean row label from a single indexed ref label. */
function parseLvLabel(label: string, idx: number): { lv: string; row: string } {
  // Pattern 1: "⚔️ ดาบสยบมนตร์ × P.ATK · Lv 1"
  const dotLv = /^(.*?)\s*·\s*Lv\s*(\d+)\s*$/i.exec(label)
  if (dotLv) return { lv: `Lv ${dotLv[2]}`, row: dotLv[1].trim() }

  // Pattern 2: "☀️ แสงแตก Lv1: WIS = × ดาเมจ"
  const midLv = /^(.*?)\s+Lv\s*(\d+)\s*:\s*(.+)$/i.exec(label)
  if (midLv) return { lv: `Lv ${midLv[2]}`, row: `${midLv[1].trim()}: ${midLv[3].trim()}` }

  // Pattern 3: "✨ pulse ที่ Lv0"
  const atLv = /^(.*?)\s*ที่\s*Lv\s*(\d+)\s*$/i.exec(label)
  if (atLv) return { lv: `Lv ${atLv[2]}`, row: atLv[1].trim() }

  // Pattern 4: "gcPulses[0]"
  const brk = /^(.*?)\[(\d+)\]\s*$/.exec(label)
  if (brk) return { lv: `Lv ${Number(brk[2])}`, row: brk[1].trim() }

  return { lv: `Lv ${idx + 1}`, row: label.trim() }
}

/** Extract a common leading prefix across multiple table row labels (e.g. "⚔️ ดาบสยบมนตร์ "). */
function commonWordPrefix(labels: string[]): string {
  if (labels.length < 2) return ''
  const toks = labels.map((l) => l.split(/\s+/))
  const first = toks[0]
  let n = 0
  while (n < first.length - 1 && toks.every((t) => t[n] === first[n])) n++
  return n >= 2 ? first.slice(0, n).join(' ') : ''
}

/** Split "Prefix: Rest" (colon) or fallback multi-word emoji prefix candidate. */
function splitColon(label: string): { prefix: string; rest: string } | null {
  const m = /^([^:]{2,46}):\s*(.+)$/.exec(label)
  if (!m) return null
  return { prefix: m[1].trim(), rest: m[2].trim() }
}

/** Candidate 2-token emoji prefix (e.g. "✨ เคลือบดาบสวรรค์" or "⚔️ ปลุกดาบ") for labels without ":". */
function emojiPrefix(label: string): { prefix: string; rest: string } | null {
  const parts = label.trim().split(/\s+/)
  if (parts.length < 3) return null
  // First token must be an emoji / symbol (non-ASCII, not Thai letter)
  if (/^[A-Za-z0-9\u0E00-\u0E7F]/.test(parts[0])) return null
  return { prefix: `${parts[0]} ${parts[1]}`, rest: parts.slice(2).join(' ') }
}

/**
 * Partition a flat SkillRef[] into:
 *  - compact Lv matrix tables for contiguous 0..N-1 series (N >= 3)
 *  - core + topic-grouped sub-cards for all remaining refs
 * Every input ref appears in the output exactly once.
 */
export function groupSkillRefs(refs: readonly SkillRef[]): GroupedSkillSection {
  if (!refs.length) return { groups: [], tables: [] }

  // 1) Detect contiguous indexed series (0..N-1 with N >= 3)
  const buckets = new Map<string, { table: SkillRef['table']; basePath: string; byIdx: Map<number, SkillRef> }>()
  for (const ref of refs) {
    const m = INDEXED_RE.exec(ref.path)
    if (!m) continue
    const basePath = m[1], idx = Number(m[2])
    const key = `${ref.table}:${basePath}`
    let b = buckets.get(key)
    if (!b) { b = { table: ref.table, basePath, byIdx: new Map() }; buckets.set(key, b) }
    b.byIdx.set(idx, ref)
  }

  const seriesByKey = new Map<string, { table: SkillRef['table']; basePath: string; refs: SkillRef[]; lvLabels: string[]; rowLabel: string }>()
  const tableRefSet = new Set<SkillRef>()

  for (const [key, b] of buckets) {
    const n = b.byIdx.size
    if (n < 3) continue
    let contiguous = true
    const ordered: SkillRef[] = []
    for (let i = 0; i < n; i++) {
      const r = b.byIdx.get(i)
      if (!r) { contiguous = false; break }
      ordered.push(r)
    }
    if (!contiguous) continue
    const parsed = ordered.map((r, i) => parseLvLabel(r.label, i))
    seriesByKey.set(key, {
      table: b.table,
      basePath: b.basePath,
      refs: ordered,
      lvLabels: parsed.map((p) => p.lv),
      rowLabel: parsed[0].row,
    })
    for (const r of ordered) tableRefSet.add(r)
  }

  // Merge series that share identical lvLabels into one table (preserving first-seen order)
  const tableMap = new Map<string, SkillLvTable>()
  for (const s of seriesByKey.values()) {
    const sig = s.lvLabels.join('|')
    let tbl = tableMap.get(sig)
    if (!tbl) {
      tbl = { title: '', lvLabels: s.lvLabels, rows: [] }
      tableMap.set(sig, tbl)
    }
    tbl.rows.push({ basePath: s.basePath, table: s.table, label: s.rowLabel, refs: s.refs })
  }

  const tables: SkillLvTable[] = []
  for (const tbl of tableMap.values()) {
    const common = commonWordPrefix(tbl.rows.map((r) => r.label))
    if (common) {
      tbl.title = common
      for (const r of tbl.rows) {
        const trimmed = r.label.slice(common.length).replace(/^[:·\s]+/, '').trim()
        if (trimmed) r.label = trimmed
      }
    } else if (tbl.rows.length === 1) {
      tbl.title = tbl.rows[0].label
    } else {
      tbl.title = `ตารางค่าตามเลเวล (${tbl.lvLabels[0]}–${tbl.lvLabels[tbl.lvLabels.length - 1]})`
    }
    tables.push(tbl)
  }

  // 2) Sub-group all remaining non-table refs
  const rem = refs.filter((r) => !tableRefSet.has(r))
  if (!rem.length) return { groups: [], tables }

  const cleanLabels = stripUniformPrefix(rem.map((r) => r.label))

  // First pass: count prefix frequencies
  const candidates = cleanLabels.map((lbl) => splitColon(lbl) ?? emojiPrefix(lbl))
  const freq = new Map<string, number>()
  for (const c of candidates) {
    if (c) freq.set(c.prefix, (freq.get(c.prefix) ?? 0) + 1)
  }

  // Second pass: prefixes appearing >= 2 times form named sub-groups; singletons stay in core
  const core: SkillGroupItem[] = []
  const namedOrder: string[] = []
  const namedMap = new Map<string, SkillGroupItem[]>()

  for (let i = 0; i < rem.length; i++) {
    const ref = rem[i], lbl = cleanLabels[i], cand = candidates[i]
    if (cand && (freq.get(cand.prefix) ?? 0) >= 2) {
      let arr = namedMap.get(cand.prefix)
      if (!arr) { arr = []; namedMap.set(cand.prefix, arr); namedOrder.push(cand.prefix) }
      arr.push({ ref, shortLabel: cand.rest })
    } else {
      core.push({ ref, shortLabel: lbl })
    }
  }

  const groups: SkillSubGroup[] = []
  if (core.length) groups.push({ title: '', items: core })
  for (const title of namedOrder) {
    groups.push({ title, items: namedMap.get(title)! })
  }

  return { groups, tables }
}
