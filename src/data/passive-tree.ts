// PoE-style Class-Line Passive Constellation Engine (Phase 1 Pilot: Thief-Line).
// Pure Phaser-free graph engine: symmetric undirected edges, BFS adjacency allocation,
// BFS connectivity-preserving single-node refund, and derived passive point economy.
import type { Stats } from './stats'
import { JOB_CHANGE, type JobId } from './jobs'
import { JOB2, JOB2_RULES, type Job2Id } from './jobs2'
import { activeJob3, JOB3_RULES, type Job3Id } from './jobs3'
import { SWORDSMAN_PASSIVE_TREE } from './passives/swordsman'
import { THIEF_PASSIVE_TREE } from './passives/thief'

export type PassiveKind = 'origin' | 'minor' | 'notable' | 'keystone' | 'socket'
export type PassiveSector =
  | 'core'
  | 'blade'
  | 'shadow'
  | 'venom'
  | 'alchemy'
  | 'vanguard'
  | 'bastion'
  | 'fury'
  | 'warblood'
  | 'awaken'
export interface PassiveCtx { job2?: Job2Id; job3?: Job3Id }

export interface PassiveNode {
  id: string
  job: JobId
  kind: PassiveKind
  sector: PassiveSector
  x: number
  y: number
  edges: readonly string[]
  icon: string
  name: string
  upside?: string
  downside?: string
  desc: (ctx?: PassiveCtx) => string
  mod: (ctx?: PassiveCtx) => Partial<Stats>
  tags: readonly string[]
  /** 🌟 Awakening ring (Q 2026-11-21): only allocatable while one of these 3rd jobs is active (activeJob3). */
  awaken?: readonly Job3Id[]
}

export interface PassiveTreeDef {
  job: JobId
  title: string
  originId: string
  /** Four outer sector quadrants in [NW, NE, SE, SW] order for nebula glow & labels. */
  quadrants: readonly [PassiveSector, PassiveSector, PassiveSector, PassiveSector]
  filters: readonly { tag: string; icon: string; label: string }[]
  nodes: readonly PassiveNode[]
}

// job3Every 6 -> 3 (Q 2026-11-21 Awakening ring): Job3 Lv 30 now gives 10 points, Max 30 -> 35
export const PASSIVE_RULES = { job1Every: 3, job2Every: 4, job3Every: 3 } as const

/** True when `node` is open for `ctx`: plain nodes always, Awakening-ring nodes only with a matching active 3rd job. */
export const passiveNodeUnlocked = (node: Pick<PassiveNode, 'awaken'>, ctx?: PassiveCtx): boolean =>
  !node.awaken || (ctx?.job3 !== undefined && node.awaken.includes(ctx.job3))

/** Passive ctx of a save: the 2nd job only when it belongs to the base class, the 3rd job only when active. */
export function passiveCtxFor(s: { job?: JobId; job2?: Job2Id; job3?: Job3Id }): PassiveCtx {
  const job2 = s.job2 && (!s.job || JOB2[s.job2]?.parent === s.job) ? s.job2 : undefined
  return { job2, job3: job2 ? activeJob3({ job2, job3: s.job3 }) : undefined }
}

/** Normalizes a tree definition once at load time: ensures every edge is undirected (symmetric), deduplicated, and valid. */
function normalizeTree(raw: PassiveTreeDef): { def: PassiveTreeDef; map: ReadonlyMap<string, PassiveNode> } {
  const rawMap = new Map<string, PassiveNode>()
  for (const n of raw.nodes) rawMap.set(n.id, n)

  const adj = new Map<string, Set<string>>()
  for (const n of raw.nodes) adj.set(n.id, new Set())
  for (const n of raw.nodes) {
    for (const nb of n.edges) {
      if (nb === n.id || !rawMap.has(nb)) continue
      adj.get(n.id)!.add(nb)
      adj.get(nb)!.add(n.id)
    }
  }

  const nodes: PassiveNode[] = raw.nodes.map((n) => ({
    ...n,
    edges: [...adj.get(n.id)!],
  }))
  const map = new Map<string, PassiveNode>()
  for (const n of nodes) map.set(n.id, n)
  return { def: { ...raw, nodes }, map }
}

const REGISTRY: Partial<Record<JobId, { def: PassiveTreeDef; map: ReadonlyMap<string, PassiveNode> }>> = {
  thief: normalizeTree(THIEF_PASSIVE_TREE),
  swordsman: normalizeTree(SWORDSMAN_PASSIVE_TREE),
}

const nodeMapOf = (job: JobId): ReadonlyMap<string, PassiveNode> | undefined => REGISTRY[job]?.map

/** True for base classes migrated to the PoE Passive Constellation (Phase 1: Thief-line, Phase 2: Swordsman-line). */
export const hasPassiveTree = (job: JobId): boolean => job in REGISTRY

/** Normalized passive tree definition (with symmetric undirected edges) for `job`, if migrated. */
export const passiveTreeOf = (job: JobId): PassiveTreeDef | undefined => REGISTRY[job]?.def

/** O(1) node lookup by job and node ID. */
export const passiveNodeById = (job: JobId, id: string): PassiveNode | undefined => REGISTRY[job]?.map.get(id)

/** Total derived Passive Points earned from Job1 / Job2 / Job3 levels (never stored in save). */
export function passiveEarned(jobLevel: number, job2Level?: number, job3Level?: number): number {
  const lv1 = Number.isFinite(jobLevel) ? Math.max(0, Math.floor(jobLevel)) : 0
  const lv2 = job2Level !== undefined && Number.isFinite(job2Level) ? Math.max(0, Math.floor(job2Level)) : 0
  const lv3 = job3Level !== undefined && Number.isFinite(job3Level) ? Math.max(0, Math.floor(job3Level)) : 0
  return (
    Math.floor(lv1 / PASSIVE_RULES.job1Every) +
    Math.floor(lv2 / PASSIVE_RULES.job2Every) +
    Math.floor(lv3 / PASSIVE_RULES.job3Every)
  )
}

/** Max derived Passive Points across full Job1 (40) + Job2 (50) + Job3 (30) progression (13 + 12 + 10 = 35). */
export const PASSIVE_MAX_POINTS = passiveEarned(
  JOB_CHANGE.classMaxJobLevel,
  JOB2_RULES.maxJobLevel,
  JOB3_RULES.maxJobLevel,
)

/** Save-like convenience wrapper: only counts Job2 Lv when job2 is active for `job`, and Job3 Lv when `activeJob3` is active. */
export function passiveEarnedFor(s: {
  job?: JobId
  jobLevel?: number
  job2?: Job2Id
  job2Level?: number
  job3?: Job3Id
  job3Level?: number
}): number {
  const hasJ2 = Boolean(s.job2 && (!s.job || JOB2[s.job2]?.parent === s.job))
  const hasJ3 = Boolean(hasJ2 && activeJob3(s))
  return passiveEarned(
    s.jobLevel ?? 0,
    hasJ2 ? (s.job2Level ?? 0) : 0,
    hasJ3 ? (s.job3Level ?? 0) : 0,
  )
}

/**
 * Filters `picked` to valid IDs of `job` that form a connected component rooted at `originId`.
 * Always includes `originId` as index 0 (the free root — NEVER charged by `passiveSpent`).
 * Tolerates `picked` with or without `originId`, duplicates, unknown IDs, disconnected islands, or corrupt inputs.
 */
export function normalizePassiveNodes(job: JobId, picked: readonly string[] | undefined, ctx?: PassiveCtx): string[] {
  const tree = passiveTreeOf(job)
  const map = nodeMapOf(job)
  if (!tree || !map) return []

  const wanted = new Set<string>([tree.originId])
  if (Array.isArray(picked)) {
    for (const id of picked) {
      if (typeof id === 'string' && map.has(id) && passiveNodeUnlocked(map.get(id)!, ctx)) wanted.add(id)
    }
  }

  // BFS from originId through `wanted` so disconnected islands are pruned
  const visited = new Set<string>([tree.originId])
  const queue: string[] = [tree.originId]
  while (queue.length > 0) {
    const cur = queue.shift()!
    const node = map.get(cur)
    if (!node) continue
    for (const nb of node.edges) {
      if (wanted.has(nb) && !visited.has(nb)) {
        visited.add(nb)
        queue.push(nb)
      }
    }
  }

  const out: string[] = [tree.originId]
  const seen = new Set<string>([tree.originId])
  if (Array.isArray(picked)) {
    for (const id of picked) {
      if (typeof id === 'string' && visited.has(id) && !seen.has(id)) {
        seen.add(id)
        out.push(id)
      }
    }
  }
  return out
}

/** Count of valid, connected, non-origin allocated passive nodes (origin is always free). */
export function passiveSpent(job: JobId, picked: readonly string[] | undefined, ctx?: PassiveCtx): number {
  const tree = passiveTreeOf(job)
  if (!tree) return 0
  const norm = normalizePassiveNodes(job, picked, ctx)
  return Math.max(0, norm.length - 1)
}

/** Remaining unspent Passive Points (clamped >= 0). */
export function passiveFree(job: JobId, picked: readonly string[] | undefined, earned: number, ctx?: PassiveCtx): number {
  const e = Number.isFinite(earned) ? Math.max(0, Math.floor(earned)) : 0
  return Math.max(0, e - passiveSpent(job, picked, ctx))
}

/** True iff `nodeId` is a valid non-origin node not yet picked, `free >= 1`, and adjacent to `originId` or an allocated node. */
export function canAllocatePassive(
  job: JobId,
  picked: readonly string[] | undefined,
  nodeId: string,
  earned: number,
  ctx?: PassiveCtx,
): boolean {
  const tree = passiveTreeOf(job)
  if (!tree || nodeId === tree.originId) return false
  const node = passiveNodeById(job, nodeId)
  if (!node || !passiveNodeUnlocked(node, ctx)) return false
  const norm = normalizePassiveNodes(job, picked, ctx)
  const set = new Set(norm)
  if (set.has(nodeId)) return false
  if (passiveFree(job, norm, earned, ctx) < 1) return false
  return node.edges.some((nb) => set.has(nb))
}

/** Pure allocation: returns a new normalized node array including `nodeId` if legal, else normalized `picked` unchanged. */
export function allocatePassive(
  job: JobId,
  picked: readonly string[] | undefined,
  nodeId: string,
  earned: number,
  ctx?: PassiveCtx,
): string[] {
  const norm = normalizePassiveNodes(job, picked, ctx)
  if (!canAllocatePassive(job, norm, nodeId, earned, ctx)) return norm
  return [...norm, nodeId]
}

/** True iff `nodeId` is an allocated non-origin node whose removal leaves ALL remaining allocated nodes reachable from `originId` via BFS. */
export function canRefundPassive(
  job: JobId,
  picked: readonly string[] | undefined,
  nodeId: string,
  ctx?: PassiveCtx,
): boolean {
  const tree = passiveTreeOf(job)
  const map = nodeMapOf(job)
  if (!tree || !map || nodeId === tree.originId) return false
  const norm = normalizePassiveNodes(job, picked, ctx)
  const remaining = new Set(norm)
  if (!remaining.has(nodeId)) return false
  remaining.delete(nodeId)

  const visited = new Set<string>([tree.originId])
  const queue: string[] = [tree.originId]
  while (queue.length > 0) {
    const cur = queue.shift()!
    const node = map.get(cur)
    if (!node) continue
    for (const nb of node.edges) {
      if (remaining.has(nb) && !visited.has(nb)) {
        visited.add(nb)
        queue.push(nb)
      }
    }
  }
  return visited.size === remaining.size
}

/** Pure single-node refund: removes `nodeId` iff connectivity from `originId` is preserved, else returns normalized `picked` unchanged. */
export function refundPassive(
  job: JobId,
  picked: readonly string[] | undefined,
  nodeId: string,
  ctx?: PassiveCtx,
): string[] {
  const norm = normalizePassiveNodes(job, picked, ctx)
  if (!canRefundPassive(job, norm, nodeId, ctx)) return norm
  return norm.filter((id) => id !== nodeId)
}

/**
 * Trims allocated passive nodes down to `earned` budget while preserving graph connectivity from `originId`.
 * Repeatedly removes the most-recently-picked node whose removal keeps all remaining nodes connected to `originId`.
 */
export function trimPassiveNodesToBudget(
  job: JobId,
  picked: readonly string[] | undefined,
  earned: number,
  ctx?: PassiveCtx,
): string[] {
  const tree = passiveTreeOf(job)
  if (!tree) return []
  const cap = Number.isFinite(earned) ? Math.max(0, Math.floor(earned)) : 0
  let cur = normalizePassiveNodes(job, picked, ctx)
  if (cap === 0) return [tree.originId]
  while (cur.length - 1 > cap) {
    let removed = false
    for (let i = cur.length - 1; i >= 1; i--) {
      if (canRefundPassive(job, cur, cur[i], ctx)) {
        cur = cur.filter((_, idx) => idx !== i)
        removed = true
        break
      }
    }
    if (!removed) break
  }
  return cur
}

/** Non-empty stat modifier patches of every valid connected allocated node for `job` given `ctx`. */
export function passiveMods(
  job: JobId,
  picked: readonly string[] | undefined,
  ctx?: PassiveCtx,
): Partial<Stats>[] {
  const tree = passiveTreeOf(job)
  const map = nodeMapOf(job)
  if (!tree || !map) return []
  const norm = normalizePassiveNodes(job, picked, ctx)
  const out: Partial<Stats>[] = []
  for (const id of norm) {
    const node = map.get(id)
    if (!node) continue
    const m = node.mod(ctx)
    if (Object.keys(m).length > 0) out.push(m)
  }
  return out
}
