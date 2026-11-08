// v124 (Q 2026-11-08 "ทำระบบ scaling lv รองรับค่าสถานะต่างๆ ไว้รอเลย ประยุกต์รวมไปจาก lol, dota2, ro"):
// monster skills level and scale like hero skills.
//
// 1) Skill Lv from the monster's Lv (every mode). Lv = the skill's own lv + 1 per MON_SKILL_LV.every Lv above an anchor:
//    - D1-D5 / event monsters (anchored numbers): their home Lv, so a home dungeon plays as tuned and the tower grows them.
//    - D6+ stat monsters: MON_SKILL_LV.nativeAnchor (0 = absolute, like RO: a Lv 80 monster casts Lv 9).
//    The level then works through skillAtLv: pow +10%/Lv, +1 hit / 10 Lv, +1 fx stack / 5 Lv, warcry +1 turn / 5 Lv.
//
// 2) An optional multi-ratio damage formula per skill (MonSkill.f), ready for new skills:
//      damage = base(Lv) + Σ ratio(Lv) × source
//    LvVal (per value):  number (flat) · number[] (Dota: one value per Lv, the last one repeats) · { base, per } (LoL / RO: base + per × (Lv-1))
//    sources: P.ATK / M.ATK (the monster's normal-hit power: def.dmg / matk × BATTLE.monDmgMul, so atk 1 = its normal hit),
//             the 7 stats (RO: STR / INT ... points), the monster Lv, its max HP, and the target's max / current / missing HP (LoL %HP).
//    A skill with no `f` keeps the old pow path (ATK × monDmgMul × pow × stat scale), so no tuned number moves.
import { BATTLE, type MonsterDef, type MonsterKind } from './game-data'
import type { BaseStat } from './meta'
import { homeDungeon, legacyLevel, statNative } from './mon-stats'

export const MON_SKILL_LV = {
  every: 10, // +1 skill Lv per this many monster Lv above the anchor
  max: 10, // the level bonus never takes a skill past this (a skill written above it, RO style, keeps its own Lv)
  nativeAnchor: 0, // D6+ stat monsters: 0 = absolute (Lv 40 -> +4, Lv 80 -> +8)
}

/** Skill Lv bonus a monster of `kind` gets at Lv `lv`. */
export function skillLvBonus(kind: MonsterKind, lv: number, d: MonsterDef): number {
  const home = homeDungeon(kind)
  const anchor = statNative(kind) || !home ? MON_SKILL_LV.nativeAnchor : legacyLevel(kind, d, { id: home })
  return Math.floor(Math.max(0, lv - anchor) / MON_SKILL_LV.every)
}

/** The Lv a skill is cast at: its own Lv + the monster's level bonus, the bonus capped at MON_SKILL_LV.max. */
export function castLv(own: number, bonus: number): number {
  return Math.max(own, Math.min(MON_SKILL_LV.max, own + bonus))
}

// ----- multi-ratio formula -----
export type LvVal = number | readonly number[] | { base: number; per: number }
export type ScaleSrc = 'atk' | 'matk' | BaseStat | 'lv' | 'maxHp' | 'tgtMaxHp' | 'tgtHp' | 'tgtMissing'
export interface SkillFormula {
  base?: LvVal // flat damage
  ratio?: Partial<Record<ScaleSrc, LvVal>> // x source (atk 1.5 = 150% P.ATK, str 2 = 2 x STR, tgtMaxHp 0.08 = 8% of the target's max HP)
}
export interface CasterSnap { atk: number; matk: number; lv: number; maxHp: number; stats: Partial<Record<BaseStat, number>> }
export interface TargetSnap { maxHp: number; hp: number }

/** A value at skill Lv `lv`. */
export function lvVal(v: LvVal, lv: number): number {
  const L = Math.max(1, Math.floor(lv))
  if (typeof v === 'number') return v
  if ('base' in v) return v.base + v.per * (L - 1)
  return v.length ? v[Math.min(v.length, L) - 1] : 0
}

const STATS: readonly BaseStat[] = ['str', 'vit', 'wis', 'dex', 'int', 'luk', 'agi']
function srcValue(s: ScaleSrc, c: CasterSnap, t: TargetSnap): number {
  switch (s) {
    case 'atk': return c.atk
    case 'matk': return c.matk
    case 'lv': return c.lv
    case 'maxHp': return c.maxHp
    case 'tgtMaxHp': return t.maxHp
    case 'tgtHp': return t.hp
    case 'tgtMissing': return Math.max(0, t.maxHp - t.hp)
    default: return STATS.includes(s) ? c.stats[s] ?? 1 : 0
  }
}

/** Damage of one hit before crit / buffs / the hero's defences. */
export function formulaDamage(f: SkillFormula, lv: number, c: CasterSnap, t: TargetSnap): number {
  let n = f.base !== undefined ? lvVal(f.base, lv) : 0
  for (const [s, v] of Object.entries(f.ratio ?? {}) as [ScaleSrc, LvVal][]) n += lvVal(v, lv) * srcValue(s, c, t)
  return Math.max(0, n)
}

/** Caster snapshot from a built monster def (P.ATK / M.ATK = its normal-hit power). */
export function casterOf(d: MonsterDef): CasterSnap {
  const atk = d.dmg * BATTLE.monDmgMul
  return { atk, matk: (d.matk ?? d.dmg) * BATTLE.monDmgMul, lv: d.lv ?? 1, maxHp: d.hp, stats: d.base ?? {} }
}

const SRC_TH: Record<ScaleSrc, string> = {
  atk: 'P.ATK', matk: 'M.ATK', str: 'STR', vit: 'VIT', wis: 'WIS', dex: 'DEX', int: 'INT', luk: 'LUK', agi: 'AGI',
  lv: 'Lv', maxHp: 'HP สูงสุด', tgtMaxHp: 'HP สูงสุดเป้าหมาย', tgtHp: 'HP เป้าหมาย', tgtMissing: 'HP ที่เป้าหมายเสียไป',
}
const PCT = new Set<ScaleSrc>(['atk', 'matk', 'maxHp', 'tgtMaxHp', 'tgtHp', 'tgtMissing'])
const num = (n: number) => String(Math.round(n * 100) / 100)

/** Hero-style text of the formula at Lv `lv`, e.g. "120 + 150% P.ATK + 2×STR + 8% HP สูงสุดเป้าหมาย". */
export function describeFormula(f: SkillFormula, lv: number): string {
  const parts: string[] = []
  if (f.base !== undefined && lvVal(f.base, lv)) parts.push(num(lvVal(f.base, lv)))
  for (const [s, v] of Object.entries(f.ratio ?? {}) as [ScaleSrc, LvVal][]) {
    const x = lvVal(v, lv)
    if (x) parts.push(PCT.has(s) ? `${num(x * 100)}% ${SRC_TH[s]}` : `${num(x)}×${SRC_TH[s]}`)
  }
  return parts.join(' + ') || '0'
}
