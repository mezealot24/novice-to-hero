// ===== Skill tree v1 (design/skill-tree-v1.md). 2 branches x 4 nodes per class (Mage: 3 element branches
// + 1 shared node). Points = the same skill points as the class skills. Node N of a branch opens after
// (N-1)*2 points in that branch; the capstone (tier 4) needs 6 and only ONE capstone per class.
// Nodes only add stats; BattleScene reads the stats (thorns, lockOn, fireSpread...). Ids are save data: never rename.
import type { Stats } from './game-data'
import type { ClassTree, TalentDef, TreeBranch, TreeNode } from './tree-types'
export * from './tree-types'
import type { JobId } from './jobs'
import { tree as swordsman } from './trees/swordsman'
import { tree as archer } from './trees/archer'
import { tree as mage } from './trees/mage'
import { tree as cleric } from './trees/cleric'
import { tree as thief } from './trees/thief'

export const TREE_RULES = { perTier: 2, capstoneNeed: 6 }
// rowsAt: Job Lv that opens talent row 1..4. Talent Points: 1 per `pointEveryJobLv` Job Lv (8 at Job Lv 40), separate from skill points.
export const TALENT_RULES = { rowsAt: [5, 10, 20, 30] as const, pointEveryJobLv: 5 }

const CLASS_TREES: ClassTree[] = [swordsman, archer, mage, cleric, thief]
export const BRANCHES: TreeBranch[] = CLASS_TREES.flatMap((c) => c.branches)
export const TREE: TreeNode[] = CLASS_TREES.flatMap((c) => c.nodes)
export const TALENTS: TalentDef[] = CLASS_TREES.flatMap((c) => c.talents)

export const branchesOf = (job: JobId) => BRANCHES.filter((b) => b.job === job)
export const nodesOf = (branch: string) => TREE.filter((x) => x.branch === branch).sort((a, b) => a.tier - b.tier)
export const nodeById = (id: string) => TREE.find((x) => x.id === id)

export type TreeSave = Record<string, number>
export const branchSpent = (t: TreeSave, branch: string) => nodesOf(branch).reduce((a, x) => a + (t[x.id] ?? 0), 0)
export const treeSpent = (t: TreeSave, job: JobId) => branchesOf(job).reduce((a, b) => a + branchSpent(t, b.id), 0)
const capstoneTaken = (t: TreeSave, job: JobId) => TREE.find((x) => x.tier === 4 && (t[x.id] ?? 0) > 0 && branchesOf(job).some((b) => b.id === x.branch))

/** Why a node can't take another point right now ('' = it can). */
export function lockReason(t: TreeSave, job: JobId, node: TreeNode): string {
  const lv = t[node.id] ?? 0
  if (lv >= node.max) return 'เต็มแล้ว'
  const need = node.tier === 4 ? TREE_RULES.capstoneNeed : Math.max(0, node.tier - 1) * TREE_RULES.perTier
  const spent = branchSpent(t, node.branch) - lv
  if (spent < need) return `ลงสายนี้อีก ${need - spent} แต้ม`
  const cap = node.tier === 4 && capstoneTaken(t, job)
  if (cap && cap.id !== node.id) return `★ เลือก "${cap.name}" ไปแล้ว`
  return ''
}

/** Sum of every learned node's stats for this job. */
export function treeMods(t: TreeSave | undefined, job: JobId): Partial<Stats>[] {
  if (!t) return []
  const out: Partial<Stats>[] = []
  for (const b of branchesOf(job)) for (const x of nodesOf(b.id)) if ((t[x.id] ?? 0) > 0) out.push(x.mod(t[x.id]))
  return out
}

export const talentsOf = (job: JobId, row: number) => TALENTS.filter((x) => x.row === row && x.id.length > 0 && TREE_TALENT_JOB.get(x.id) === job)
const TREE_TALENT_JOB = new Map<string, JobId>(CLASS_TREES.flatMap((c) => c.talents.map((x) => [x.id, c.branches[0]?.job] as [string, JobId])))
export interface TalentPick { id: string; rank: number }
export type TalentSave = Record<string, TalentPick> // row ("1".."4") -> picked talent + rank

/** Reads one row's pick; tolerates the old string-only shape. */
export const talentPick = (t: TalentSave | undefined, row: number): TalentPick | undefined => {
  const v = t?.[String(row)] as TalentPick | string | undefined
  return typeof v === 'string' ? { id: v, rank: 1 } : v
}
/** Talent Points: earned from Job Lv (derived, never stored), spent = sum of ranks. */
export const talentEarned = (jobLevel: number) => Math.floor(jobLevel / TALENT_RULES.pointEveryJobLv)
export const talentSpent = (t: TalentSave | undefined) => [1, 2, 3, 4].reduce((a, r) => a + (talentPick(t, r)?.rank ?? 0), 0)
export const talentFree = (t: TalentSave | undefined, jobLevel: number) => talentEarned(jobLevel) - talentSpent(t)

/** Stats from the picked talents whose row is open at this Job Lv. */
export function talentMods(t: TalentSave | undefined, job: JobId, jobLevel: number): Partial<Stats>[] {
  if (!t) return []
  const out: Partial<Stats>[] = []
  TALENT_RULES.rowsAt.forEach((lv, i) => {
    const p = talentPick(t, i + 1)
    const def = p && TALENTS.find((x) => x.id === p.id)
    if (def && p && jobLevel >= lv && TREE_TALENT_JOB.get(def.id) === job) out.push(def.mod(Math.min(p.rank, def.max)))
  })
  return out
}
