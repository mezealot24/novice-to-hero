// ===== Tower floor affixes (v59, Q 2026-11-04): every 10 floors the tower adds one random rule, and they stack. =====
// Deep floors should make the player change builds, not only meet tankier monsters.
// Monster-side numbers are applied in BattleScene.modeDef (every spawned monster, summons included);
// hero-side numbers (healMul) in BattleScene.heal. Rolled once per run (RunConfig.affixes), in order.
import type { MonsterDef } from './game-data'

export type AffixId = 'grievous' | 'armor' | 'hawkeye' | 'split' | 'swift' | 'vampire' | 'volatile'
export interface AffixDef {
  id: AffixId
  icon: string
  name: string
  desc: string
  /** Changes on every monster def (a copy). */
  mon?: (d: MonsterDef) => void
  /** Hero healing x this. */
  healMul?: number
  /** Monster speed x this. */
  speed?: number
  /** A non-boss monster that dies comes back once as a copy with this share of its HP. */
  split?: number
}

export const AFFIXES: AffixDef[] = [
  { id: 'grievous', icon: '🩸', name: 'แผลลึก', desc: 'ฮีลทุกอย่างของเราลด 30%', healMul: 0.7 },
  { id: 'armor', icon: '⛰️', name: 'เกราะหนา', desc: 'มอน DEF +25 และ HP +10%', mon: (d) => { d.def = (d.def ?? 0) + 25; d.hp = Math.round(d.hp * 1.1) } },
  { id: 'hawkeye', icon: '🎯', name: 'ตาเหยี่ยว', desc: 'มอนทุกตัวหลบหลีกเราได้แค่ 2 ครั้ง แล้วตีโดนแน่นอน 3 เทิร์น', mon: (d) => { d.trueSight ??= { after: 2, turns: 3 } } },
  { id: 'split', icon: '🧬', name: 'แยกร่าง', desc: 'มอนธรรมดาตายแล้วแยกร่างกลับมา 1 ตัว (HP 40%)', split: 0.4 },
  { id: 'swift', icon: '💨', name: 'ว่องไว', desc: 'มอนเร็วขึ้น 15%', speed: 1.15 },
  { id: 'vampire', icon: '🧛', name: 'ผีดูดเลือด', desc: 'มอนดูดเลือด 15% ของดาเมจที่ทำ', mon: (d) => { d.lifesteal = (d.lifesteal ?? 0) + 0.15 } },
  { id: 'volatile', icon: '💥', name: 'ระเบิดตาย', desc: 'มอนธรรมดาระเบิดใส่เราตอนตาย (เวท)', mon: (d) => { if (d.ai !== 'boss') d.deathBlast = Math.max(d.deathBlast ?? 0, 0.8) } },
]
export const affixById = (id: AffixId) => AFFIXES.find((a) => a.id === id)!

export const AFFIX_RULES = { every: 10, max: 4 }

/** Affixes live on floor f: one more every 10 floors (floor 11+ has 1, 21+ has 2 ...), at most AFFIX_RULES.max. */
export const affixesAt = (order: AffixId[], f: number) => order.slice(0, Math.min(AFFIX_RULES.max, Math.floor((f - 1) / AFFIX_RULES.every)))

/** A run's affix order (no repeats). */
export function rollAffixes(rand: () => number = Math.random): AffixId[] {
  const pool = AFFIXES.map((a) => a.id)
  const out: AffixId[] = []
  while (pool.length && out.length < AFFIX_RULES.max) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0])
  return out
}

/** Folded hero / monster numbers for a set of live affixes. */
export function foldAffixes(ids: AffixId[]) {
  const defs = ids.map(affixById)
  return {
    defs,
    healMul: defs.reduce((a, x) => a * (x.healMul ?? 1), 1),
    speed: defs.reduce((a, x) => a * (x.speed ?? 1), 1),
    split: Math.max(0, ...defs.map((x) => x.split ?? 0)),
    mon: (d: MonsterDef) => { for (const x of defs) x.mon?.(d) },
  }
}
