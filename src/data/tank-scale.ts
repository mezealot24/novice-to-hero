// ===== 🛡️ Tank class bulk (Q 2026-11-21 end-game HP rebalance) =====
// Monsters got more HP (MON_STAT.hpScale) and every hero now gets 25 HP per VIT (PER_POINT.vit.maxHp). On top of that the
// sturdy classes get an innate class passive, from the highest job of the line the hero has:
//   vitHp    + HP per VIT point (on top of the 25 every hero gets)
//   dr       damage taken -this (every landed hit, after DEF / M.DEF)
//   skillDr  monster SKILL damage taken -this more (✦ skills, 🔮 casts, 🩸 drains, 💥 / 🖤 blasts), multiplies with dr
// Read by heroBuild (vitHp -> applyBase, dr / skillDr -> Stats.tankDr / tankSkillDr) and BattleScene.hurtHeroCore.
import type { JobId } from './jobs'
import type { Job2Id } from './jobs2'
import type { Job3Id } from './jobs3'

export interface TankBulk { vitHp: number; dr: number; skillDr: number; name: string }
type LineId = JobId | Job2Id | Job3Id

export const TANK_BULK: Partial<Record<LineId, TankBulk>> = {
  swordsman: { vitHp: 2, dr: 0.03, skillDr: 0.03, name: 'กายนักดาบ' },
  knight: { vitHp: 4, dr: 0.08, skillDr: 0.1, name: 'เกราะอัศวิน' },
  crusader: { vitHp: 4, dr: 0.08, skillDr: 0.12, name: 'ศรัทธาเหล็ก' },
  berserker: { vitHp: 2, dr: 0.04, skillDr: 0.05, name: 'กายคลั่ง' },
  monk: { vitHp: 3, dr: 0.05, skillDr: 0.08, name: 'กายวัชระ' },
  lordknight: { vitHp: 6, dr: 0.12, skillDr: 0.15, name: 'เกราะลอร์ด' },
  paladin: { vitHp: 6, dr: 0.12, skillDr: 0.18, name: 'ป้อมศักดิ์สิทธิ์' },
  warlord: { vitHp: 3, dr: 0.06, skillDr: 0.08, name: 'กายขุนศึก' },
  champion: { vitHp: 4, dr: 0.07, skillDr: 0.1, name: 'กายแชมเปี้ยน' },
}

/** The tank bulk of the hero's highest job in the line (3rd > 2nd > 1st), or undefined for a non-tank line. */
export function tankBulk(job?: JobId, job2?: Job2Id, job3?: Job3Id): TankBulk | undefined {
  return (job3 && TANK_BULK[job3]) || (job2 && TANK_BULK[job2]) || (job && TANK_BULK[job]) || undefined
}

/** Hit tags (BattleScene.hurtHero) that count as a monster SKILL for skillDr: skills, casts, drains, blasts. */
export const isMonSkillTag = (tag: string): boolean => /^(✦|🔮|🩸|💥|🖤)/u.test(tag)

/** Damage after tank DR (every hit) and skill DR (skill hits only), never below 1. */
export const applyTankDr = (n: number, dr: number, skillDr: number, skill: boolean): number =>
  dr <= 0 && (!skill || skillDr <= 0) ? n : Math.max(1, Math.ceil(n * (1 - dr) * (skill ? 1 - skillDr : 1)))
