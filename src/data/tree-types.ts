// Skill tree data shapes, shared by data/tree.ts (rules + helpers) and data/trees/<job>.ts (content).
// Kept separate so class files can import `node` without a circular import.
import type { Stats } from './game-data'
import type { JobId } from './jobs'

export interface TreeBranch { id: string; job: JobId; name: string; icon: string; blurb: string }
export interface TreeNode {
  id: string; branch: string; tier: 0 | 1 | 2 | 3 | 4; name: string; icon: string; max: number
  desc: (lv: number) => string; mod: (lv: number) => Partial<Stats>
}

/** Talent: 4 rows that open at Job Lv 5/10/20/30 (TALENT_RULES.rowsAt); pick 1 of the row's 3 options.
 *  Costs Talent Points (own pool, 1 TP per 5 Job Lv, see TALENT_RULES): 1 TP per rank, rank 1..max (max 2 = stronger numbers).
 *  Free reset/swap in town refunds TP. Usually changes how a skill behaves: give it a Stats flag in `mod` and read it in BattleScene. */
export interface TalentDef {
  id: string; row: 1 | 2 | 3 | 4; name: string; icon: string; max: 1 | 2
  desc: (rank: number) => string; mod: (rank: number) => Partial<Stats>
}
/** One class's content, in data/trees/<job>.ts. */
export interface ClassTree { branches: TreeBranch[]; nodes: TreeNode[]; talents: TalentDef[] }

export const talent = (id: string, row: TalentDef['row'], icon: string, name: string, max: TalentDef['max'], desc: (rank: number) => string, mod: (rank: number) => Partial<Stats>): TalentDef =>
  ({ id, row, icon, name, max, desc, mod })

export const node = (id: string, branch: string, tier: TreeNode['tier'], icon: string, name: string, max: number, desc: (lv: number) => string, mod: (lv: number) => Partial<Stats>): TreeNode =>
  ({ id, branch, tier, icon, name, max, desc, mod })

