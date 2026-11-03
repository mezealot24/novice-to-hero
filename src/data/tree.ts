// ===== Skill tree v1 (design/skill-tree-v1.md) -> skill web v1 (design/skill-web-v1.md). 2 branches x 4 nodes per class (Mage: 3 element branches
// + 1 shared node). Points = the same skill points as the class skills. Node N of a branch opens after
// (N-1)*2 points in that branch and its parent node; a capstone (tier 4) needs 6, max 2 capstones per class.
// Nodes only add stats; BattleScene reads the stats (thorns, lockOn, fireSpread...). Ids are save data: never rename.
import type { Stats } from './game-data'
import type { ClassTree, TalentDef, TreeBranch, TreeNode } from './tree-types'
export * from './tree-types'
import { JOBS, type JobId } from './jobs'
import { skill2Of } from './skill2'
import { tree as swordsman } from './trees/swordsman'
import { tree as archer } from './trees/archer'
import { tree as mage } from './trees/mage'
import { tree as cleric } from './trees/cleric'
import { tree as thief } from './trees/thief'

export const TREE_RULES = { perTier: 2, capstoneNeed: 6, capstones: 2, powMax: 5, powPer: 0.12, s2PlusMax: 3 }
// rowsAt: Job Lv that opens talent row 1..4. Talent Points: 1 per `pointEveryJobLv` Job Lv (8 at Job Lv 40), separate from skill points.
export const TALENT_RULES = { rowsAt: [5, 10, 20, 30] as const, pointEveryJobLv: 5 }

// ===== Skill web v1 (design/skill-web-v1.md): one screen, 3 lines per class =====
// ทักษะ 1 (auto) and Ult each start with a "+power" node (replaces the old class skill Lv 1-10);
// the old tree branches hang under one of those two roots; ทักษะ 2 = pick 1 of 3 actives (data/skill2.ts),
// each with a "+" node and a ★. Old tier-0 nodes (Mage แก่นเวท) form a free "core" column.
const ATTACH: Record<string, 's1' | 'ult'> = {
  swordsman_a: 'ult', swordsman_b: 's1', archer_a: 'ult', archer_b: 's1', cleric_a: 'ult', cleric_b: 's1',
  thief_a: 's1', thief_b: 'ult', mage_l: 'ult', mage_f: 'ult', mage_i: 'ult',
}
const CLASS_TREES: ClassTree[] = [swordsman, archer, mage, cleric, thief]
const RESOURCE_NAME = { mana: 'Mana', rage: 'Rage', energy: 'Energy' } as const
const powId = (job: JobId, line: 's1' | 'ult') => `${job}_${line}p`
const webBranches: TreeBranch[] = []
const webNodes: TreeNode[] = []
for (const c of CLASS_TREES) {
  const job = c.branches[0].job, J = JOBS[job]
  for (const line of ['s1', 'ult'] as const) {
    const sk = line === 's1' ? J.auto : J.ult, label = line === 's1' ? 'ทักษะ 1' : 'Ult'
    webBranches.push({ id: `${job}_${line}`, job, name: label, icon: sk.icon, blurb: sk.name, line })
    webNodes.push({ id: powId(job, line), branch: `${job}_${line}`, tier: 0, icon: sk.icon, name: `${sk.name}`, max: TREE_RULES.powMax, kind: 'pow',
      desc: (lv) => `${label} แรง +${Math.round(lv * TREE_RULES.powPer * 100)}%`, mod: (lv) => (line === 's1' ? { s1Pow: TREE_RULES.powPer * lv } : { ultPow: TREE_RULES.powPer * lv }) })
  }
  webBranches.push({ id: `${job}_s2`, job, name: 'ทักษะ 2', icon: '🔀', blurb: 'เลือก 1 จาก 3', line: 's2' })
  for (const k of skill2Of(job)) {
    webNodes.push({ id: `${k.id}`, branch: `${job}_s2`, tier: 0, icon: k.icon, name: k.name, max: 1, kind: 's2root', s2: k.id,
      desc: () => `${k.desc} · ${RESOURCE_NAME[J.resource ?? 'mana']} ${k.cost} · คูลดาวน์ ${k.cd} เทิร์น · ร่ายเองอัตโนมัติ`, mod: () => ({}) })
    webNodes.push({ id: `${k.id}_p`, branch: `${job}_s2`, tier: 1, icon: k.plus.icon, name: k.plus.name, max: TREE_RULES.s2PlusMax, kind: 's2plus', s2: k.id, parent: k.id,
      desc: k.plus.desc, mod: (lv) => ({ s2Lv: lv }) })
    webNodes.push({ id: `${k.id}_x`, branch: `${job}_s2`, tier: 2, icon: k.star.icon, name: k.star.name, max: 1, kind: 's2star', s2: k.id, parent: `${k.id}_p`,
      desc: () => k.star.desc, mod: () => ({ s2Star: 1 }) })
  }
  for (const b of c.branches) {
    const line = ATTACH[b.id]
    webBranches.push({ ...b, line: line ?? 'core' })
    let prev = line ? powId(job, line) : undefined
    for (const x of c.nodes.filter((q) => q.branch === b.id).sort((p, q) => p.tier - q.tier)) {
      webNodes.push({ ...x, parent: x.tier === 0 ? undefined : prev })
      prev = x.id
    }
  }
}
export const BRANCHES: TreeBranch[] = webBranches
export const TREE: TreeNode[] = webNodes
export const TALENTS: TalentDef[] = CLASS_TREES.flatMap((c) => c.talents)

export const branchesOf = (job: JobId) => BRANCHES.filter((b) => b.job === job)
export const nodesOf = (branch: string) => TREE.filter((x) => x.branch === branch).sort((a, b) => a.tier - b.tier)
export const nodeById = (id: string) => TREE.find((x) => x.id === id)

export type TreeSave = Record<string, number>
export const branchSpent = (t: TreeSave, branch: string) => nodesOf(branch).reduce((a, x) => a + (t[x.id] ?? 0), 0)
export const treeSpent = (t: TreeSave, job: JobId) => branchesOf(job).reduce((a, b) => a + branchSpent(t, b.id), 0)
const capstonesTaken = (t: TreeSave, job: JobId) => TREE.filter((x) => x.tier === 4 && (t[x.id] ?? 0) > 0 && branchesOf(job).some((b) => b.id === x.branch))
/** The Skill 2 this job has learned (its root node has a point), if any. */
export const skill2Picked = (t: TreeSave | undefined, job: JobId) => t ? skill2Of(job).find((k) => (t[k.id] ?? 0) > 0) : undefined

/** Why a node can't take another point right now ('' = it can). */
export function lockReason(t: TreeSave, job: JobId, node: TreeNode): string {
  const lv = t[node.id] ?? 0
  if (lv >= node.max) return 'เต็มแล้ว'
  if (node.parent && !(t[node.parent] ?? 0)) return `ลง "${nodeById(node.parent)?.name ?? ''}" ก่อน`
  if (node.kind === 's2root') {
    const other = skill2Picked(t, job)
    if (other && other.id !== node.s2) return `เลือก "${other.name}" ไปแล้ว (รีเซ็ตเพื่อเปลี่ยน)`
    return ''
  }
  if (node.kind === 's2star') return (t[`${node.s2}_p`] ?? 0) >= TREE_RULES.s2PlusMax ? '' : `ลง "${nodeById(`${node.s2}_p`)?.name ?? ''}" ให้เต็มก่อน`
  if (node.kind) return ''
  const need = node.tier === 4 ? TREE_RULES.capstoneNeed : Math.max(0, node.tier - 1) * TREE_RULES.perTier
  const spent = branchSpent(t, node.branch) - lv
  if (spent < need) return `ลงสายนี้อีก ${need - spent} แต้ม`
  const caps = node.tier === 4 ? capstonesTaken(t, job).filter((x) => x.id !== node.id) : []
  if (caps.length >= TREE_RULES.capstones) return `★ ได้ ${TREE_RULES.capstones} ดวง (${caps.map((x) => x.name).join(', ')})`
  return ''
}

/** Sum of every learned node's stats for this job. */
export function treeMods(t: TreeSave | undefined, job: JobId): Partial<Stats>[] {
  if (!t) return []
  const out: Partial<Stats>[] = []
  for (const b of branchesOf(job)) for (const x of nodesOf(b.id)) if ((t[x.id] ?? 0) > 0) out.push(x.mod(Math.min(t[x.id], x.max)))
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
