// ===== D6+ stat monsters (Q 2026-11-04, docs/design/dungeon-6-10-stat-monsters.md) =====
// Dungeons 6-10 have a fixed level band. Every monster there gets the hero's 7 base stats (STR VIT WIS DEX INT LUK AGI)
// and runs them through the SAME formulas as the hero (meta.ts applyBase / baseDefence), so Flee, Hit, crit, combo,
// counter, M.DEF and turn speed mean the same thing on both sides.
//
//   points   = pointsPerLv x (Lv - 1) x tierPct      normal 50% · mini 100% · boss 150% · 🔥 hard +50% on every tier (Q: 100/150/200)
//   stats    = 1 + points split by the monster's statAlloc weights (an archetype or its own weights; may pass 99, Q ok)
//   derived  = applyBase(PLAYER copy, stats)          <- one formula set for hero + monster
//   + Level Base per Lv (what gear gives a hero of that level) · x HP body by tier (fights last as long as D4-5 bosses)
//
// Tuning lives in MON_STAT only.
import { BATTLE, PLAYER, type MonsterDef, type Stats } from './game-data'
import { applyBase, baseDefence, STAT_RULES, type BaseStat } from './meta'

export type Archetype = 'bruiser' | 'skirmisher' | 'assassin' | 'caster' | 'tank' | 'support'
export type StatAlloc = Partial<Record<BaseStat, number>>
export type MonTier = 'normal' | 'mini' | 'boss'

export const ARCHETYPES: Record<Archetype, StatAlloc> = {
  bruiser: { str: 4, vit: 3, dex: 2, agi: 1 }, // hits hard, sturdy
  skirmisher: { agi: 4, dex: 3, luk: 2, str: 1 }, // dodges, fast, crits a little
  assassin: { agi: 3, luk: 3, str: 3, dex: 1 }, // big crits, fragile
  caster: { int: 5, wis: 3, dex: 1, vit: 1 }, // strong magic, resists magic
  tank: { vit: 5, wis: 3, str: 2 }, // wall
  support: { wis: 4, int: 3, vit: 3 }, // heals / shields (its own skills)
}

export const MON_STAT = {
  pointsPerLv: STAT_RULES.pointsPerLevel,
  tierPct: { normal: 0.5, mini: 1, boss: 1.5 } as Record<MonTier, number>,
  hardAdd: 0.5, // 🔥 hard: +50 percentage points on every tier
  /** Per monster level, on top of the stat-derived numbers: the share a hero of that level gets from gear. */
  levelBase: { hp: 8, atk: 3.5, matk: 3.5, def: 0.6, hit: 0.8 },
  /** HP x this by tier (after Level Base): stat HP alone would make a boss die in a few hits. */
  body: { normal: 1, mini: 5, boss: 8 } as Record<MonTier, number>,
  /** Monster caps (same as the hero's where the hero has one). */
  mdefCap: 0.75, luckyCap: 0.25, rateCap: 1.5,
}

export const monTier = (d: MonsterDef): MonTier => (d.mini ? 'mini' : d.ai === 'boss' ? 'boss' : 'normal')
export const allocOf = (d: MonsterDef): StatAlloc => (typeof d.statAlloc === 'string' ? ARCHETYPES[d.statAlloc] : d.statAlloc ?? ARCHETYPES.bruiser)

/** Stat points of a monster at this level / tier. */
export const monPoints = (lv: number, tier: MonTier, hard = false) =>
  Math.round(MON_STAT.pointsPerLv * Math.max(0, lv - 1) * (MON_STAT.tierPct[tier] + (hard ? MON_STAT.hardAdd : 0)))

/** Base stats from points + weights. statMul (hard-mode corruption) multiplies the points one stat gets. */
export function monBase(alloc: StatAlloc, points: number, statMul: StatAlloc = {}): Record<BaseStat, number> {
  const b: Record<BaseStat, number> = { str: 1, vit: 1, wis: 1, dex: 1, int: 1, luk: 1, agi: 1 }
  const sum = Object.values(alloc).reduce((a, n) => a + (n ?? 0), 0) || 1
  for (const k of Object.keys(alloc) as BaseStat[]) b[k] += Math.round((points * alloc[k]!) / sum * (statMul[k] ?? 1))
  for (const k of Object.keys(statMul) as BaseStat[]) if (!alloc[k] && (statMul[k] ?? 1) > 1) b[k] += Math.round(points * 0.1) // a boosted stat the monster never trains still gets 10% of the points
  return b
}

export interface StatMonOpts { hard?: boolean; statMul?: StatAlloc }

/** The monster's def at this level, numbers rebuilt from its stats. Keeps every skill / phase / onHit of the base def.
 * Def fields hp / dmg / matk / def / hit / flee / crit / combo / counter become BONUSES on top (hp / dmg / matk x, the rest +). */
export function statMonster(base: MonsterDef, lv: number, o: StatMonOpts = {}): MonsterDef {
  const tier = monTier(base), b = monBase(allocOf(base), monPoints(lv, tier, o.hard), o.statMul)
  const st: Stats = { ...PLAYER }
  applyBase(st, b)
  const L = MON_STAT.levelBase, f = baseDefence(b), cap = (x: number, c: number) => Math.min(c, x)
  const k = base.bodyMul ?? {}
  return {
    ...base,
    lv, base: b,
    hp: Math.max(1, Math.round((st.maxHp + L.hp * lv) * MON_STAT.body[tier] * (k.hp ?? 1))),
    dmg: (st.atk + L.atk * lv) * (k.dmg ?? 1),
    matk: (st.matk + L.matk * lv) * (k.matk ?? 1),
    def: Math.round(st.def + L.def * lv + (base.def ?? 0)),
    mdef: cap(st.mdef + (base.mdef ?? 0), MON_STAT.mdefCap),
    hit: Math.round(st.hit + L.hit * lv + (base.hit ?? 0)),
    flee: Math.round(st.flee + (base.flee ?? 0)),
    crit: cap(st.crit + (base.crit ?? 0), 1),
    combo: cap(st.combo + (base.combo ?? 0), MON_STAT.rateCap),
    counter: cap(st.counter + (base.counter ?? 0), MON_STAT.rateCap),
    luckyDodge: cap(st.luckyDodge, MON_STAT.luckyCap),
    tenacity: cap(st.tenacity, 0.75),
    speed: BATTLE.heroSpeed * (Math.max(0.6, st.aspd) / PLAYER.aspd) * (base.speedMul ?? 1),
    statDef: { ignoreCombo: f.ignoreCombo, ignoreCounter: f.ignoreCounter, comboDR: f.comboDR, counterDR: f.counterDR, critDR: f.critDR },
  }
}

/** Level of room i in a level dungeon: the room's own lv, else spread from lo (first wave) to hi (boss). */
export function roomLevel(level: [number, number], rooms: { lv?: number; boss?: boolean }[], i: number): number {
  const r = rooms[i]
  if (r?.lv) return r.lv
  if (r?.boss) return level[1]
  const n = Math.max(1, rooms.length - 1)
  return Math.round(level[0] + ((level[1] - 2 - level[0]) * i) / Math.max(1, n - 1))
}

/** 🟢 normal level dungeon: a hero far above the band earns less (replaces the Hero Power cut there). */
export const LEVEL_GAP = { free: 10, per: 0.1, min: 0.4 }
export const levelDropMul = (baseLv: number, level: [number, number]) => {
  const over = baseLv - (level[1] + LEVEL_GAP.free)
  return over <= 0 ? 1 : Math.max(LEVEL_GAP.min, 1 - LEVEL_GAP.per * over)
}
