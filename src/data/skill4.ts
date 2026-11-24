// Q 2026-11-24 Skill 4 (spec doc "4 สกิลสำหรับ Job2 + Awakening"): the pure rules behind Knight 🌀 Spiral Pierce + ⛓️ Break.
// No Phaser here, so tests/skill4.test.ts runs them directly. Numbers: KIT2.knight.s4 (skill-math.ts), item Break in item-effects.ts.
import { KIT2 } from './skill-math'
import { resolveMonsterShieldSoak, type MonsterShieldSoak } from './passive-battle'
import type { MonTier } from './mon-stats'

const S4 = () => KIT2.knight.s4

/** Skill 4 exists for this 2nd job (Knight only so far) and the Job2 Lv has reached the unlock. */
export function s4Unlocked(job2: string | undefined, job2Level: number | undefined): boolean {
  return job2 === 'knight' && (job2Level ?? 1) >= S4().unlockLv
}

/** 🛡️ Rell Q shatter: a normal / mini monster loses its whole shield, a boss loses `bossShield` of its phase shield. */
export function s4Shatter(shield: number, tier: MonTier): { shield: number; shattered: boolean } {
  if (shield <= 0) return { shield: 0, shattered: false }
  const left = tier === 'boss' ? Math.floor(shield * (1 - S4().bossShield)) : 0
  return { shield: left, shattered: true }
}

/** 💫 Stun: a normal / mini monster loses its next turn, a boss keeps its turn but loses its cast + gauge. */
export const s4StunKind = (tier: MonTier): 'turn' | 'cast' => (tier === 'boss' ? 'cast' : 'turn')

/** Target order: boss > mini > the front monster. */
export function s4Target<T>(live: readonly T[], tierOf: (m: T) => MonTier): T | undefined {
  return live.find((m) => tierOf(m) === 'boss') ?? live.find((m) => tierOf(m) === 'mini') ?? live[0]
}

/** 🐍 Serpent's Fang: hero hits drain a monster shield x(1 + fang). Only the shield part grows; HP damage after the shield stays the hit's own. */
export function fangSoak(shield: number, dmg: number, pierce: number, fang: number, pure = false): MonsterShieldSoak {
  const f = Math.max(0, fang)
  if (f <= 0) return resolveMonsterShieldSoak(shield, dmg, pierce, pure)
  const r = resolveMonsterShieldSoak(shield, dmg * (1 + f), pierce, pure)
  if (r.absorbed <= 0) return { absorbed: 0, remShield: r.remShield, remDmg: dmg }
  return { absorbed: r.absorbed, remShield: r.remShield, remDmg: Math.max(0, Math.round(r.remDmg / (1 + f))) }
}

/** ⛓️ Break (Q 2026-11-24, Dota 2 Silver Edge / Shadow Blade style): while broken, a monster's passives are off.
 *  Only some hero skills (Knight 🌀 Spiral Pierce) and items (🧬 effect `break_hit`) apply it. No admin switch. */
export const BREAK_OFF = ['🔁 สะท้อน/ดูดซับ', '🩸 ดูดเลือด', '☠️ ติดสถานะเมื่อตี', '🩸 Blood Razor', '🐺 คลั่ง/ดมกลิ่น (Hunter)', '💚 ฟื้น HP (Drainer)'] as const
export const breakText = (turns: number) => `⛓️ Break ${turns} เทิร์น: ปิด passive มอน (${BREAK_OFF.join(' · ')})`
/** A new Break never shortens one already running. */
export const addBreak = (cur: number | undefined, turns: number): number => Math.max(cur ?? 0, Math.max(0, Math.round(turns)))
