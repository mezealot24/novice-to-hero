// ✨ Live-tunable registry for Hero Passive Constellations (Swordsman, Thief, and future classes).
// Automatically mirrors every numeric stat modifier from SWORDSMAN_PASSIVE_TREE / THIEF_PASSIVE_TREE / CLERIC_PASSIVE_TREE
// into a flat mutable table (`PASSIVE_TUNING`) so Admin / live-config patches apply in-place with zero duplication.
import type { JobId } from './jobs'
import type { Job2Id } from './jobs2'
import type { PassiveCtx, PassiveKind, PassiveNode, PassiveSector, PassiveTreeDef } from './passive-tree'
import { CLERIC_PASSIVE_TREE } from './passives/cleric'
import { SWORDSMAN_PASSIVE_TREE } from './passives/swordsman'
import { THIEF_PASSIVE_TREE } from './passives/thief'
import type { Stats } from './stats'
import type { FieldDef } from './tunables'

export interface PassiveEntryMeta {
  entryKey: string
  job: JobId
  nodeId: string
  ctxKey?: 'base' | Job2Id
  icon: string
  name: string
  kind: PassiveKind
  sector: PassiveSector
  awaken?: readonly string[]
  desc: string
  statKeys: string[]
}

const TREES: readonly PassiveTreeDef[] = [SWORDSMAN_PASSIVE_TREE, THIEF_PASSIVE_TREE, CLERIC_PASSIVE_TREE]

const JOB2_VARIANTS: Partial<Record<JobId, readonly Job2Id[]>> = {
  swordsman: ['knight', 'berserker'],
  thief: ['rogue', 'mobster'],
  cleric: ['monk', 'crusader'],
}

export const PASSIVE_JOBS: readonly JobId[] = TREES.map((t) => t.job)

const numMap = (m: Partial<Stats>): Record<string, number> => {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(m)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  return out
}

const sameMap = (a: Record<string, number>, b: Record<string, number>): boolean => {
  const ka = Object.keys(a), kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (const k of ka) if (a[k] !== b[k]) return false
  return true
}

/** Mutable live-config target: entryKey -> { statKey: number }. Mutated in place by live-config applyPatch(). */
export const PASSIVE_TUNING: Record<string, Record<string, number>> = {}

const META_BY_ENTRY = new Map<string, PassiveEntryMeta>()
const ADAPTIVE_NODES = new Set<string>()
const ENTRIES_BY_JOB = new Map<JobId, PassiveEntryMeta[]>()

function registerEntry(
  tree: PassiveTreeDef,
  node: PassiveNode,
  entryKey: string,
  mod: Record<string, number>,
  ctx?: PassiveCtx,
  ctxKey?: 'base' | Job2Id,
): void {
  const statKeys = Object.keys(mod)
  if (statKeys.length === 0) return
  PASSIVE_TUNING[entryKey] = { ...mod }
  const meta: PassiveEntryMeta = {
    entryKey,
    job: tree.job,
    nodeId: node.id,
    ctxKey,
    icon: node.icon,
    name: node.name,
    kind: node.kind,
    sector: node.sector,
    awaken: node.awaken,
    desc: node.desc(ctx),
    statKeys,
  }
  META_BY_ENTRY.set(entryKey, meta)
  const list = ENTRIES_BY_JOB.get(tree.job) ?? []
  list.push(meta)
  ENTRIES_BY_JOB.set(tree.job, list)
}

for (const tree of TREES) {
  const variants = JOB2_VARIANTS[tree.job] ?? []
  for (const node of tree.nodes) {
    if (node.awaken && node.awaken.length > 0) {
      const ctx: PassiveCtx = { job3: node.awaken[0] }
      registerEntry(tree, node, node.id, numMap(node.mod(ctx)), ctx)
      continue
    }
    const baseMod = numMap(node.mod({}))
    const varMods = variants.map((j2) => ({ j2, mod: numMap(node.mod({ job2: j2 })) }))
    const isAdaptive = varMods.some((v) => !sameMap(baseMod, v.mod))
    if (!isAdaptive) {
      registerEntry(tree, node, node.id, baseMod, {})
    } else {
      ADAPTIVE_NODES.add(node.id)
      registerEntry(tree, node, `${node.id}__base`, baseMod, {}, 'base')
      for (const { j2, mod } of varMods) {
        registerEntry(tree, node, `${node.id}__${j2}`, mod, { job2: j2 }, j2)
      }
    }
  }
}

export const passiveRoot = (): object => PASSIVE_TUNING

export const passiveEntryMeta = (entryKey: string): PassiveEntryMeta | undefined => META_BY_ENTRY.get(entryKey)

export const passiveEntriesForJob = (job: JobId): readonly PassiveEntryMeta[] => ENTRIES_BY_JOB.get(job) ?? []

/** Live evaluation for `passiveMods()` in passive-tree.ts: reads live-patched `PASSIVE_TUNING` values. */
export function evalPassiveTuning(node: PassiveNode, ctx?: PassiveCtx): Partial<Stats> {
  if (ADAPTIVE_NODES.has(node.id)) {
    const key = ctx?.job2 ? `${node.id}__${ctx.job2}` : `${node.id}__base`
    const tuned = PASSIVE_TUNING[key] ?? PASSIVE_TUNING[`${node.id}__base`]
    return tuned ? ({ ...tuned } as Partial<Stats>) : node.mod(ctx)
  }
  const tuned = PASSIVE_TUNING[node.id]
  return tuned ? ({ ...tuned } as Partial<Stats>) : node.mod(ctx)
}

/** Exact whitelist fields for TABLES.passives in tunables.ts. */
export function passiveTableFields(): [string, FieldDef][] {
  const out: [string, FieldDef][] = []
  for (const [entryKey, mod] of Object.entries(PASSIVE_TUNING)) {
    for (const [statKey, val] of Object.entries(mod)) {
      const isRatio = Math.abs(val) <= 2 && !Number.isInteger(val)
      const def: FieldDef = isRatio
        ? { kind: 'num', min: -10, max: 10 }
        : { kind: 'num', min: -10_000, max: 100_000 }
      out.push([`${entryKey}.${statKey}`, def])
    }
  }
  return out
}
