// ===== Skill tree v1 (design/skill-tree-v1.md) -> skill web v1 (design/skill-web-v1.md). 2 branches x 4 nodes per class (Mage: 3 element branches
// + 1 shared node). Points = the same skill points as the class skills. Node N of a branch opens after
// (N-1)*2 points in that branch and its parent node; a capstone (tier 4) needs 6, max 2 capstones per class.
// Nodes only add stats; BattleScene reads the stats (thorns, lockOn, fireSpread...). Ids are save data: never rename.
// v83 (Q 2026-11-06): stretchNode() gives class / ใยชั้น 2 nodes more levels (max 1->3, 2->4, 3->5) at the SAME full value.
import type { Stats } from './game-data'
import type { ClassTree, TalentDef, TreeBranch, TreeNode } from './tree-types'
export * from './tree-types'
import { CLERIC_KIT, JOBS, type JobId } from './jobs'
import { KIT, KIT2 } from './skill-math'
import { skill2Of } from './skill2'
import { tree as swordsman } from './trees/swordsman'
import { tree as archer } from './trees/archer'
import { tree as mage } from './trees/mage'
import { tree as cleric } from './trees/cleric'
import { tree as thief } from './trees/thief'
import { JOB2, type Job2Id } from './jobs2'
import { tree2 as berserker } from './trees2/berserker'
import { tree2 as knight } from './trees2/knight'
import { tree2 as rogue } from './trees2/rogue'
import { tree2 as mobster } from './trees2/mobster'
import { tree2 as crusader } from './trees2/crusader'
import { tree2 as monk } from './trees2/monk'
import { tree2 as wizard } from './trees2/wizard'
import { tree2 as sage } from './trees2/sage'
import { tree2 as beastmaster } from './trees2/beastmaster'
import { tree2 as innovator } from './trees2/innovator'
import { JOB3, JOB3_RULES, type Job3Id, type Job3Path } from './jobs3'
import { tree3 as paladin } from './trees3/paladin'

// v83: s2PlusMax 3 -> 5 (Stats.s2Lv = Lv x s2PlusOld / s2PlusMax, so Lv 5 = the old Lv 3) · the ★ needs the "+" at s2StarNeed.
// stretch: old max -> new max for class / ใยชั้น 2 nodes (stretchNode below); unlock rules + parentLv gates unchanged.
export const TREE_RULES = { perTier: 2, capstoneNeed: 6, capstones: 2, powMax: 5, powPer: 0.12, s2PlusMax: 5, s2PlusOld: 3, s2StarNeed: 3,
  stretch: { 1: 3, 2: 4, 3: 5 } as Readonly<Record<number, number>> }

// ===== v83 node stretch (design/skill-web-v1.md "v83"): more levels, same full value =====
/** Stats that count whole things (stacks, hits, turns, targets): a stretched level rounds them, never below 1 once learned.
 *  A node with any of these steps on whole numbers and its text rounds to whole numbers too (so text = effect). */
export const INT_FIELDS: ReadonlySet<keyof Stats> = new Set<keyof Stats>([
  'poison', 'poisonCap', 'burnCap', 'autoBurn', 'lightHits', 'smiteTargets', 'clUltLights', 'doubleAtk', 'comboCount', 'mgFireStack',
  'waveDodge', 'ultDodge', 'ultHits', 'ultPoison', 'arWaveDodge', 'arUltDodge',
  'j2FrenzyMax', 'j2ChargeMax', 'j2DebuffTurns', 'j2BlindAdd', 'j2Traps', 'j2TurretTurns', 'j2EndowTurns', 'j2WolfBleed',
  'j2PierceHits', 'j2HawkHits', 'j2AutoBolts', 'j2KnifeAdd', 'j2Meteors', 'j2LovHits', 'j2HcVit',
])
/** Non-★ nodes that keep their max (tier-4 ★, pow / pow2 / s2root / s2star kinds are never stretched either). Reason per id. */
export const NO_STRETCH: Readonly<Record<string, string>> = {
  thief_core1: 'gate: D.Strike must be 5/5 to open ทักษะ 2 (parentLv), already max 5',
  bm_h3: 'Blitz Beat +1 target: a whole count, nothing to split into 3',
  kn_p2: 'Pierce +1 hit: a whole count',
  kn_p3: 'Spear Boomerang: on/off flag',
  sg_a3: 'Auto Spell +1 bolt: a whole count',
  cleric_core2: 'v86 INT per +1 STR steps 7 / 6 / 5: whole steps',
  cleric_dn3: 'v102 แสงแตก WIS buff 25/30/35% for 3/4/5 turns: Q set max 3',
}
/** Text of a level between two old levels: long decimals -> 1 dp (or whole numbers on INT_FIELDS nodes), trailing .0 dropped.
 *  Numbers already written with 1-2 decimals (toFixed(2) multipliers) stay as written. */
const tidy = (s: string, whole: boolean) => s.replace(/\d+\.\d+/g, (m) => {
  if (whole) return String(Math.round(+m))
  return m.split('.')[1].length <= 2 ? m : String(Math.round(+m * 10) / 10)
})
/** Old node -> the same node with TREE_RULES.stretch levels: Lv n reads the old formula at n x oldMax / newMax (whole at the top). */
export function stretchNode(n: TreeNode): TreeNode {
  const max = TREE_RULES.stretch[n.max]
  if (!max || max === n.max || n.kind || n.tier === 4 || n.id in NO_STRETCH) return n
  const old = n.max, at = (lv: number) => (lv * old) / max
  const whole = Object.keys(n.mod(old)).some((k) => INT_FIELDS.has(k as keyof Stats))
  const mod = (lv: number): Partial<Stats> => {
    const raw = n.mod(at(lv))
    if (!whole) return raw
    const out: Partial<Stats> = {}
    for (const k of Object.keys(raw) as (keyof Stats)[]) {
      const v = raw[k] ?? 0
      out[k] = INT_FIELDS.has(k) ? (v > 0 ? Math.max(1, Math.round(v)) : Math.round(v)) : v
    }
    return out
  }
  const desc = (lv: number) => { const x = at(lv); return Number.isInteger(x) ? n.desc(x) : tidy(n.desc(x), whole) }
  return { ...n, max, mod, desc }
}
/** "+" node level -> Stats.s2Lv (Lv 5 = the old Lv 3). */
export const s2LvOf = (lv: number) => (lv * TREE_RULES.s2PlusOld) / TREE_RULES.s2PlusMax
// rowsAt: Job Lv that opens talent row 1..4. Talent Points: 1 per `pointEveryJobLv` Job Lv (8 at Job Lv 40), separate from skill points.
export const TALENT_RULES = { rowsAt: [5, 10, 20, 30] as const, pointEveryJobLv: 5 }

// ===== Skill web v1 (design/skill-web-v1.md): one screen, 3 lines per class =====
// ทักษะ 1 (auto) and Ult each start with a "+power" node (replaces the old class skill Lv 1-10);
// the old tree branches hang under one of those two roots; ทักษะ 2 = pick 1 of 3 actives (data/skill2.ts),
// each with a "+" node and a ★. Old tier-0 nodes (Mage แก่นเวท) form a free "core" column.
const ATTACH: Record<string, 's1' | 'ult'> = {
  swordsman_a: 'ult', swordsman_b: 's1', archer_a: 'ult', archer_b: 's1', archer_c: 's1', archer_d: 'ult', cleric_a: 'ult', cleric_b: 's1',
  swordsman_c: 's1', swordsman_d: 'ult', cleric_c: 's1', cleric_d: 'ult', // v84
  thief_a: 's1', thief_b: 'ult', mage_l: 'ult', mage_f: 'ult', mage_i: 'ult',
}
const CLASS_TREES: ClassTree[] = [swordsman, archer, mage, cleric, thief]
const RESOURCE_NAME = { mana: 'Mana', rage: 'Rage', energy: 'Energy' } as const
const powId = (job: JobId, line: 's1' | 'ult') => `${job}_${line}p`
/** v102: extra Mana of the Cleric ult at this Ult node Lv (Lv 1 = +0 ... Lv 5 = +20). */
const clUltManaAt = (lv: number) => Math.max(0, Math.round(lv) - 1) * CLERIC_KIT.ultManaLv
const webBranches: TreeBranch[] = []
const webNodes: TreeNode[] = []
for (const c of CLASS_TREES) {
  const job = c.branches[0].job, J = JOBS[job]
  for (const line of ['s1', 'ult'] as const) {
    const sk = line === 's1' ? J.auto : J.ult, label = line === 's1' ? 'ทักษะ 1' : 'Ult'
    webBranches.push({ id: `${job}_${line}`, job, name: label, icon: sk.icon, blurb: sk.name, line })
    webNodes.push({ id: powId(job, line), branch: `${job}_${line}`, tier: 0, icon: sk.icon, name: `${sk.name}`, max: TREE_RULES.powMax, kind: 'pow',
      ...(job === 'cleric' && line === 'ult' // v108 Q 2026-11-07: back to v58, Priest's พรคุ้มครอง node = ult smash +10%/lv of 150% (KIT.clericUltAtkLv) · Mana by Lv only if CLERIC_KIT.ultManaLv > 0
        ? { desc: (lv: number) => `Ult ทุบแรง +${Math.round(lv * KIT.clericUltAtkLv * 100)}% P.ATK${CLERIC_KIT.ultManaLv ? ` · Mana Ult ${CLERIC_KIT.ultMana + clUltManaAt(lv)}` : ''}`,
            mod: (lv: number) => ({ clUltAtk: KIT.clericUltAtkLv * lv, clUltMana: clUltManaAt(lv) }) }
        : { desc: (lv: number) => `${label} แรง +${Math.round(lv * TREE_RULES.powPer * 100)}%`, mod: (lv: number) => (line === 's1' ? { s1Pow: TREE_RULES.powPer * lv } : { ultPow: TREE_RULES.powPer * lv }) }) })
  }
  webBranches.push({ id: `${job}_s2`, job, name: 'ทักษะ 2', icon: '🔀', blurb: 'เลือก 1 จาก 3', line: 's2' })
  const gate = c.s2Gate
  if (gate) webNodes.push({ ...gate, branch: `${job}_s2` })
  for (const k of skill2Of(job)) {
    webNodes.push({ id: `${k.id}`, branch: `${job}_s2`, tier: 0, icon: k.icon, name: k.name, max: 1, kind: 's2root', s2: k.id, ...(gate ? { parent: gate.id, parentLv: gate.max } : {}),
      desc: () => `${k.desc} · ${RESOURCE_NAME[J.resource ?? 'mana']} ${k.cost} · คูลดาวน์ ${k.cd} เทิร์น · ร่ายเองอัตโนมัติ`, mod: () => ({}) })
    webNodes.push({ id: `${k.id}_p`, branch: `${job}_s2`, tier: 1, icon: k.plus.icon, name: k.plus.name, max: TREE_RULES.s2PlusMax, kind: 's2plus', s2: k.id, parent: k.id,
      desc: (lv) => { const x = s2LvOf(lv); return Number.isInteger(x) ? k.plus.desc(x) : tidy(k.plus.desc(x), false) }, mod: (lv) => ({ s2Lv: s2LvOf(lv) }) })
    webNodes.push({ id: `${k.id}_x`, branch: `${job}_s2`, tier: 2, icon: k.star.icon, name: k.star.name, max: 1, kind: 's2star', s2: k.id, parent: `${k.id}_p`,
      desc: () => k.star.desc, mod: () => ({ s2Star: 1 }) })
  }
  for (const b of c.branches) {
    const line = ATTACH[b.id]
    webBranches.push({ ...b, line: line ?? 'core' })
    let prev = line ? powId(job, line) : undefined
    for (const x of c.nodes.filter((q) => q.branch === b.id).sort((p, q) => p.tier - q.tier)) {
      webNodes.push({ ...stretchNode(x), parent: x.tier === 0 ? undefined : prev })
      prev = x.id
    }
  }
}
export const BRANCHES: TreeBranch[] = webBranches
export const TREE: TreeNode[] = webNodes

// ===== ใยชั้น 2 (design/second-jobs-v1.md): one per 2nd job, its own points (save.job2Points) =====
// Two "+power" roots (ทักษะ 3, Ult วิวัฒน์) + 3 branches x 4 nodes (tier 1..3 + ★). Same unlock rules as the base web.
const JOB2_TREES: Record<Job2Id, ClassTree> = { berserker, knight, rogue, mobster, crusader, monk, wizard, sage, beastmaster, innovator }
const web2Branches: TreeBranch[] = [], web2Nodes: TreeNode[] = []
for (const id of Object.keys(JOB2_TREES) as Job2Id[]) {
  const c = JOB2_TREES[id], J = JOB2[id]
  for (const [line, sk, key] of [['s3', J.skill3, 's3Pow'], ['u2', J.ult, 'ult2Pow']] as const) {
    const label = line === 's3' ? 'ทักษะ 3' : 'Ult วิวัฒน์'
    web2Branches.push({ id: `${id}_${line}`, job: J.parent, job2: id, name: label, icon: sk.icon, blurb: sk.name, line: 'job2' })
    web2Nodes.push({ id: `${id}_${line}p`, branch: `${id}_${line}`, tier: 0, icon: sk.icon, name: sk.name, max: TREE_RULES.powMax, kind: 'pow2',
      desc: (lv: number) => `${label} แรง +${Math.round(lv * TREE_RULES.powPer * 100)}%${id === 'crusader' && line === 'u2' ? ` · ${KIT2.crusader.gcPulses[Math.min(5, Math.round(lv))]} pulse` : ''}`,
      mod: (lv: number) => ({ [key]: TREE_RULES.powPer * lv, ...(id === 'crusader' && line === 'u2' ? { j2GcLv: lv } : {}) }) }) // v109: Grand Cross pulses by Lv
    // v119: class nodes whose branch is this root's own column (`<job2>_s3` / `<job2>_u2`) hang under the root
    let prev = `${id}_${line}p`
    for (const x of c.nodes.filter((q) => q.branch === `${id}_${line}`).sort((p, q) => p.tier - q.tier)) { web2Nodes.push({ ...stretchNode(x), parent: prev }); prev = x.id }
  }
  for (const b of c.branches) {
    web2Branches.push({ ...b, line: 'job2' })
    let prev: string | undefined
    for (const x of c.nodes.filter((q) => q.branch === b.id).sort((p, q) => p.tier - q.tier)) { web2Nodes.push({ ...stretchNode(x), parent: prev }); prev = x.id }
  }
}
export const BRANCHES2: TreeBranch[] = web2Branches
export const TREE2: TreeNode[] = web2Nodes

// ===== ใยชั้น 3 (design/awakening-crusader-v1.md §4.4-§5): one per 3rd job, its own points (save.job3Points) =====
// One "+power" root (Ult วิวัฒน์ 2) + 3 branches x 4 nodes. Hybrid path: own tier 1-2 + the sibling 2nd job's ใยชั้น 2 tier 1-2.
const JOB3_TREES: Record<Job3Id, ClassTree> = { paladin }
const web3Branches: TreeBranch[] = [], web3Nodes: TreeNode[] = []
for (const id of Object.keys(JOB3_TREES) as Job3Id[]) {
  const c = JOB3_TREES[id], J = JOB3[id], j2 = JOB2[J.parent]
  web3Branches.push({ id: `${id}_u3`, job: j2.parent, job2: J.parent, job3: id, name: 'Ult วิวัฒน์ 2', icon: '✨', blurb: J.ultName, line: 'job3' })
  web3Nodes.push({ id: `${id}_u3p`, branch: `${id}_u3`, tier: 0, icon: '✨', name: J.ultName, max: TREE_RULES.powMax, kind: 'pow3',
    desc: (lv: number) => `pulse ที่ชั้น 3 เพิ่ม แรง +${Math.round(lv * TREE_RULES.powPer * 100)}%`, mod: (lv: number) => ({ u3Pow: TREE_RULES.powPer * lv }) })
  for (const b of c.branches) {
    web3Branches.push({ ...b, job3: id, line: 'job3' })
    let prev: string | undefined
    for (const x of c.nodes.filter((q) => q.branch === b.id).sort((p, q) => p.tier - q.tier)) { web3Nodes.push({ ...x, parent: prev }); prev = x.id }
  }
}
export const BRANCHES3: TreeBranch[] = web3Branches
export const TREE3: TreeNode[] = web3Nodes
export const HYBRID_MAX_TIER = 2
export const branches3Of = (j3: Job3Id) => BRANCHES3.filter((b) => b.job3 === j3)
/** Hybrid: the sibling 2nd job's ใยชั้น 2 branches (not its two roots), tier 1-2 nodes only, learned with job3 points. */
export const hybridBranchesOf = (j3: Job3Id) => BRANCHES2.filter((b) => b.job2 === JOB3[j3].sibling && !b.id.endsWith('_s3') && !b.id.endsWith('_u2'))
/** Every node the ใยชั้น 3 screen can show for this path (own web + hybrid borrow). */
export const web3Scope = (j3: Job3Id, path: Job3Path = 'pure'): TreeBranch[] => (path === 'hybrid' ? [...branches3Of(j3), ...hybridBranchesOf(j3)] : branches3Of(j3))
/** Points a hero has in one branch of a web (legacy nodes read the ใยชั้น 2 branches). */
export const branchPts = (t: TreeSave | undefined, branch: string) => (t ? branchSpent(t, branch) : 0)
export const tree3Spent = (t: TreeSave, j3: Job3Id) => [...branches3Of(j3), ...hybridBranchesOf(j3)].reduce((a, b) => a + branchSpent(t, b.id), 0)
/** Sum of every learned ใยชั้น 3 node's stats that the path allows (a node above the hybrid tier gives nothing on hybrid). */
export function tree3Mods(t: TreeSave | undefined, j3: Job3Id | undefined, path: Job3Path = 'pure'): Partial<Stats>[] {
  if (!t || !j3) return []
  const out: Partial<Stats>[] = []
  for (const b of web3Scope(j3, path)) for (const x of nodesOf(b.id)) {
    if ((t[x.id] ?? 0) <= 0 || (path === 'hybrid' && x.tier > HYBRID_MAX_TIER)) continue
    out.push(x.mod(Math.min(t[x.id], x.max)))
  }
  return out
}
/** Why a ใยชั้น 3 node can't take a point now ('' = it can). Same rules as the other webs + the path gate; ★ cap counts this web only. */
export function lockReason3(t: TreeSave, job: JobId, node: TreeNode, j3: Job3Id, path: Job3Path = 'pure'): string {
  const borrowed = !node.branch.startsWith(`${JOB3_PREFIX[j3]}_`) && node.kind !== 'pow3'
  if (borrowed && path !== 'hybrid') return 'เฉพาะสาย Hybrid'
  if (path === 'hybrid' && node.tier > HYBRID_MAX_TIER && (t[node.id] ?? 0) < node.max) return `สาย Hybrid เปิดได้ถึงชั้น ${HYBRID_MAX_TIER}`
  return lockReason(t, job, node, undefined, web3Scope(j3, path))
}
const JOB3_PREFIX: Record<Job3Id, string> = { paladin: 'pa' }
export const JOB3_POINTS_MAX = JOB3_RULES.maxJobLevel - 1
const ALL_NODES = [...webNodes, ...web2Nodes, ...web3Nodes]
export const branches2Of = (j2: Job2Id) => BRANCHES2.filter((b) => b.job2 === j2)
export const tree2Spent = (t: TreeSave, j2: Job2Id) => branches2Of(j2).reduce((a, b) => a + branchSpent(t, b.id), 0)
/** Sum of every learned ใยชั้น 2 node's stats. */
export function tree2Mods(t: TreeSave | undefined, j2: Job2Id | undefined): Partial<Stats>[] {
  if (!t || !j2) return []
  const out: Partial<Stats>[] = []
  for (const b of branches2Of(j2)) for (const x of nodesOf(b.id)) if ((t[x.id] ?? 0) > 0) out.push(x.mod(Math.min(t[x.id], x.max)))
  return out
}
export const TALENTS: TalentDef[] = CLASS_TREES.flatMap((c) => c.talents)
// v119 (Q 2026-11-08): ทาเลนต์ชั้น 2 (data/trees2/<job2>.ts talents) — same rules as the base talents, read off Job2 Lv, own save (save.job2Talents)
const TALENT2_JOB = new Map<string, Job2Id>((Object.keys(JOB2_TREES) as Job2Id[]).flatMap((j) => JOB2_TREES[j].talents.map((x) => [x.id, j] as [string, Job2Id])))
export const TALENTS2: TalentDef[] = (Object.keys(JOB2_TREES) as Job2Id[]).flatMap((j) => JOB2_TREES[j].talents)
export const talents2Of = (j2: Job2Id, row: number) => TALENTS2.filter((x) => x.row === row && TALENT2_JOB.get(x.id) === j2)
/** Stats from the picked 2nd-job talents whose row is open at this Job2 Lv. */
export function talent2Mods(t: TalentSave | undefined, j2: Job2Id | undefined, job2Level: number): Partial<Stats>[] {
  if (!t || !j2) return []
  const out: Partial<Stats>[] = []
  TALENT_RULES.rowsAt.forEach((lv, i) => {
    const p = talentPick(t, i + 1)
    const def = p && TALENTS2.find((x) => x.id === p.id)
    if (def && p && job2Level >= lv && TALENT2_JOB.get(def.id) === j2) out.push(def.mod(Math.min(p.rank, def.max)))
  })
  return out
}

export const branchesOf = (job: JobId) => BRANCHES.filter((b) => b.job === job)
export const nodesOf = (branch: string) => ALL_NODES.filter((x) => x.branch === branch).sort((a, b) => a.tier - b.tier)
export const nodeById = (id: string) => ALL_NODES.find((x) => x.id === id)

export type TreeSave = Record<string, number>
export const branchSpent = (t: TreeSave, branch: string) => nodesOf(branch).reduce((a, x) => a + (t[x.id] ?? 0), 0)
export const treeSpent = (t: TreeSave, job: JobId) => branchesOf(job).reduce((a, b) => a + branchSpent(t, b.id), 0)
const capstonesTaken = (t: TreeSave, scope: TreeBranch[]) => ALL_NODES.filter((x) => x.tier === 4 && (t[x.id] ?? 0) > 0 && scope.some((b) => b.id === x.branch))
/** The Skill 2 this job has learned (its root node has a point), if any. */
export const skill2Picked = (t: TreeSave | undefined, job: JobId) => t ? skill2Of(job).find((k) => (t[k.id] ?? 0) > 0) : undefined

/** Why a node can't take another point right now ('' = it can). */
export function lockReason(t: TreeSave, job: JobId, node: TreeNode, j2?: Job2Id, scope?: TreeBranch[]): string {
  const lv = t[node.id] ?? 0
  if (lv >= node.max) return 'เต็มแล้ว'
  if (node.parent && !(t[node.parent] ?? 0)) return `ลง "${nodeById(node.parent)?.name ?? ''}" ก่อน`
  if (node.parent && node.parentLv && (t[node.parent] ?? 0) < node.parentLv) return `ลง "${nodeById(node.parent)?.name ?? ''}" ให้เต็ม ${node.parentLv} ก่อน`
  if (node.kind === 's2root') {
    const other = skill2Picked(t, job)
    if (other && other.id !== node.s2) return `เลือก "${other.name}" ไปแล้ว (รีเซ็ตเพื่อเปลี่ยน)`
    return ''
  }
  if (node.kind === 's2star') return (t[`${node.s2}_p`] ?? 0) >= TREE_RULES.s2StarNeed ? '' : `ลง "${nodeById(`${node.s2}_p`)?.name ?? ''}" ให้ถึง Lv ${TREE_RULES.s2StarNeed} ก่อน`
  if (node.kind) return ''
  const need = node.tier === 4 ? TREE_RULES.capstoneNeed : Math.max(0, node.tier - 1) * TREE_RULES.perTier
  const spent = branchSpent(t, node.branch) - lv
  if (spent < need) return `ลงสายนี้อีก ${need - spent} แต้ม`
  const caps = node.tier === 4 ? capstonesTaken(t, scope ?? (j2 ? branches2Of(j2) : branchesOf(job))).filter((x) => x.id !== node.id) : []
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

/** v102 (Q 2026-11-07, all jobs): talent card text that matches the rank shown ("1/2" used to show the rank-2 numbers).
 *  now = the current rank's text (rank 0 = a "ขั้น 1" preview); next = what the next rank changes, short when it can be. */
export function talentRankText(def: TalentDef, rank: number): { now: string; next?: string } {
  const at = Math.max(1, Math.min(rank, def.max)), now = def.desc(at)
  const head = rank <= 0 ? `ขั้น 1: ${now}` : now
  if (at >= def.max) return { now: head }
  return { now: head, next: `▲ ขั้น ${at + 1}: ${rankHint(now, def.desc(at + 1))}` }
}
const NUM = /x?[+−-]?\d+(?:\.\d+)?(?:%|x)?/g
/** "a" -> "b" texts: same wording with other numbers -> just the changed numbers; "a" + more -> "+ more"; else all of "b". */
export function rankHint(a: string, b: string): string {
  if (a.replace(NUM, '#') === b.replace(NUM, '#')) {
    const x = [...a.matchAll(NUM)], y = b.match(NUM) ?? []
    const label = (m: RegExpMatchArray) => { // the short word right before the number ("Hit", "โล่"), if there is one
      const w = a.slice(0, m.index).trimEnd().split(/\s+/).pop() ?? ''
      return w && w.length <= 8 && !/[→·:(]/.test(w) && !/\d/.test(w) ? `${w} ` : ''
    }
    const diff = x.map((m, i) => (m[0] !== y[i] ? `${label(m)}${m[0]} → ${y[i]}` : '')).filter(Boolean)
    if (diff.length) return diff.join(' · ')
  }
  if (b.startsWith(a) && b.length > a.length) return `+ ${b.slice(a.length).replace(/^\s*·\s*/, '')}`
  return b
}
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
