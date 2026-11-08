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
import { BATTLE, DUNGEONS, MONSTERS, PLAYER, type HitFx, type MonSkill, type MonSkillKind, type MonsterDef, type MonsterKind, type Stats } from './game-data'
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
  /** Always the hero's points per level (a getter, so a live-config patch of STAT_RULES.pointsPerLevel follows). */
  get pointsPerLv(): number { return STAT_RULES.pointsPerLevel },
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
export const monPoints = (lv: number, tier: MonTier, hard = false, tierPct?: number) =>
  Math.round(MON_STAT.pointsPerLv * Math.max(0, lv - 1) * ((tierPct ?? MON_STAT.tierPct[tier]) + (hard ? MON_STAT.hardAdd : 0)))

/** Base stats from points + weights. statMul (hard-mode corruption) multiplies the points one stat gets. */
export function monBase(alloc: StatAlloc, points: number, statMul: StatAlloc = {}): Record<BaseStat, number> {
  const b: Record<BaseStat, number> = { str: 1, vit: 1, wis: 1, dex: 1, int: 1, luk: 1, agi: 1 }
  const sum = Object.values(alloc).reduce((a, n) => a + (n ?? 0), 0) || 1
  for (const k of Object.keys(alloc) as BaseStat[]) b[k] += Math.round((points * alloc[k]!) / sum * (statMul[k] ?? 1))
  for (const k of Object.keys(statMul) as BaseStat[]) if (!alloc[k] && (statMul[k] ?? 1) > 1) b[k] += Math.round(points * 0.1) // a boosted stat the monster never trains still gets 10% of the points
  return b
}

export interface StatMonOpts { hard?: boolean; statMul?: StatAlloc; tierPct?: number /* v122 tower MVP: share of the hero's points, replaces MON_STAT.tierPct */ }

/** What the 7 stats alone give a monster of this tier at this level (before its own bonuses / bodyMul). */
interface Derived {
  b: Record<BaseStat, number>; st: Stats
  hp: number; dmg: number; matk: number; def: number; hit: number; flee: number; crit: number; combo: number; counter: number; speed: number
}
/** pm = the monster's own pointsMul (v81): x its stat point budget, on top of the tier share. */
function derive(alloc: StatAlloc, lv: number, tier: MonTier, o: StatMonOpts, pm = 1): Derived {
  const b = monBase(alloc, Math.round(monPoints(lv, tier, o.hard, o.tierPct) * pm), o.statMul)
  const st: Stats = { ...PLAYER }
  applyBase(st, b)
  const L = MON_STAT.levelBase
  return {
    b, st,
    hp: (st.maxHp + L.hp * lv) * MON_STAT.body[tier],
    dmg: st.atk + L.atk * lv, matk: st.matk + L.matk * lv, def: st.def + L.def * lv, hit: st.hit + L.hit * lv,
    flee: st.flee, crit: st.crit, combo: st.combo, counter: st.counter,
    speed: BATTLE.heroSpeed * (Math.max(0.6, st.aspd) / PLAYER.aspd),
  }
}
const cap = (x: number, c: number) => Math.min(c, x)
/** The parts every monster takes straight from its stats: M.DEF, lucky dodge, tenacity, combo / counter defence. */
function statOnly(d: MonsterDef, x: Derived): Pick<MonsterDef, 'mdef' | 'luckyDodge' | 'tenacity' | 'statDef'> {
  const f = baseDefence(x.b)
  return {
    mdef: cap(x.st.mdef + (d.mdef ?? 0), MON_STAT.mdefCap),
    luckyDodge: cap(x.st.luckyDodge, MON_STAT.luckyCap),
    tenacity: cap(x.st.tenacity, 0.75),
    statDef: { ignoreCombo: f.ignoreCombo, ignoreCounter: f.ignoreCounter, comboDR: f.comboDR, counterDR: f.counterDR, critDR: f.critDR },
  }
}

/** The monster's def at this level, numbers rebuilt from its stats. Keeps every skill / phase / onHit of the base def.
 * Def fields hp / dmg / matk / def / hit / flee / crit / combo / counter become BONUSES on top (hp / dmg / matk x, the rest +). */
export function statMonster(base: MonsterDef, lv: number, o: StatMonOpts = {}): MonsterDef {
  const x = derive(allocOf(base), lv, monTier(base), o, base.pointsMul ?? 1), k = base.bodyMul ?? {}
  return scaleExtras({
    ...base,
    lv, base: x.b,
    hp: Math.max(1, Math.round(x.hp * (k.hp ?? 1))),
    dmg: x.dmg * (k.dmg ?? 1),
    matk: x.matk * (k.matk ?? 1),
    def: Math.round(x.def + (base.def ?? 0)),
    hit: Math.round(x.hit + (base.hit ?? 0)),
    flee: Math.round(x.flee + (base.flee ?? 0)),
    crit: cap(x.crit + (base.crit ?? 0), 1),
    combo: cap(x.combo + (base.combo ?? 0), MON_STAT.rateCap),
    counter: cap(x.counter + (base.counter ?? 0), MON_STAT.rateCap),
    speed: x.speed * (base.speedMul ?? 1),
    ...statOnly(base, x),
  })
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

// ===== v68 -> v76: D1-5 / event / support monsters use the D6 stat model, anchored to their tuned numbers =====
// Q 2026-11-06: "D1-5 use the same 7-stat model as D6, keep today's difficulty, statAlloc editable in admin.html".
// Every monster now has its own statAlloc object in MONSTERS. A non-level-dungeon monster's hand-tuned hp / dmg / matk / def / hit /
// flee / crit / combo / counter (and BATTLE.monSpeed) are its values AT ITS HOME LEVEL WITH ITS DEFAULT statAlloc (the build's, frozen
// at load = REF). At run time the same derive() as D6 runs with the CURRENT statAlloc / LEGACY.lv / MON_STAT:
//   hp / dmg / matk / speed  x  now / REF          def / hit / flee / crit / combo / counter  +  (now - REF)
// So with the build defaults nothing moves (balance-neutral, tests/mon-stats-calibration.test.ts), and every stat edit acts like on D6.
// Hero Power / hard mode / tower / monBuff still scale the result as before (hard mode adds stat points only to the stat-only parts).
// Their level comes from their home dungeon (LEGACY.lv: boss at that Lv, mini 1 below, normal 2 below).

export const LEGACY = {
  /** Boss level of each old dungeon (≈ HARD.recLv + 0-1): mini = -1, normal = -2. */
  lv: { d1: 5, d2: 10, d3: 13, d4: 16, d5: 21 } as Record<string, number>,
  tierDrop: { normal: 2, mini: 1, boss: 0 } as Record<MonTier, number>,
}

/** First dungeon a monster shows up in (rooms, duel pools, boss / phase / skill summons). Events fall back to the current dungeon. */
let HOME: Partial<Record<MonsterKind, string>> | null = null
export function homeDungeon(kind: MonsterKind): string | undefined {
  if (!HOME) {
    HOME = {}
    const put = (k: MonsterKind | undefined, id: string) => { if (k && !HOME![k]) HOME![k] = id }
    for (const d of DUNGEONS) for (const r of d.rooms) {
      for (const k of [...r.spawn.map((s) => s[0]), ...(r.miniPool ?? (r.mini ? MINI_POOL_KINDS : []))]) {
        put(k, d.id)
        const m = MONSTERS[k]
        put(m.summon, d.id)
        for (const p of m.phases ?? []) put(p.summon?.[0], d.id)
        for (const s of [...(m.skills ?? []), ...(m.phases ?? []).flatMap((p) => p.skills ?? [])]) put(s.summon?.[0], d.id)
      }
    }
    put('maiden', HOME.drainer ?? 'd3') // คาร์วอส Summon Maiden is called from the duel script
  }
  return HOME[kind]
}
/** Duel pool of a dungeon without its own miniPool (data/relics.ts MINI_POOL); kept here to avoid an import cycle. */
const MINI_POOL_KINDS: MonsterKind[] = ['duelist', 'hunter', 'gunner', 'drainer']

/** Level of an old (non-statAlloc) monster: its home dungeon's band, else the dungeon it is fought in. */
export function legacyLevel(kind: MonsterKind, d: MonsterDef, here: { id: string; level?: [number, number] }): number {
  const home = homeDungeon(kind), top = (home ? LEGACY.lv[home] : undefined) ?? LEGACY.lv[here.id] ?? here.level?.[0] ?? 5
  return Math.max(1, top - LEGACY.tierDrop[monTier(d)])
}

/** D6+ monster: lives in a level dungeon, numbers come straight from its stats (statMonster). Everything else is anchored (withStats). */
export function statNative(kind: MonsterKind): boolean {
  const home = homeDungeon(kind)
  return !!home && !!DUNGEONS.find((d) => d.id === home)?.level
}

// ===== v114 tower floors 25+ (Q 2026-11-08): D6+ monsters outside their level dungeon =====
// A D6+ monster is built from its own stats at its home boss level, then rescaled so its dungeon's tier average (normal / mini / boss)
// lands on D5's. Its kit (skills, AI, speed, Flee, crit...) stays its own; the tower then scales it as a D5 monster (src 'd5').
export const DEEP_ANCHOR = 'd5'
type Ref = { hp: number; dmg: number; matk: number }
const REF_AVG: Record<string, Ref | null> = {}
const levelOfHome = (home: string) => DUNGEONS.find((d) => d.id === home)?.level?.[1]
function buildAt(kind: MonsterKind, home: string): MonsterDef {
  const d = MONSTERS[kind], lv = levelOfHome(home)
  return lv ? statMonster(d, lv) : withStats(d, kind, legacyLevel(kind, d, { id: home }))
}
/** Mean HP / ATK / M.ATK of one tier of monsters whose home is `home` (null = none of that tier). */
function refAvg(home: string, tier: MonTier): Ref | null {
  const key = `${home}:${tier}`
  if (key in REF_AVG) return REF_AVG[key]
  const kinds = (Object.keys(MONSTERS) as MonsterKind[]).filter((k) => homeDungeon(k) === home && monTier(MONSTERS[k]) === tier && !MONSTERS[k].passive)
  if (!kinds.length) return (REF_AVG[key] = null)
  const defs = kinds.map((k) => buildAt(k, home)), mean = (f: (d: MonsterDef) => number) => defs.reduce((a, d) => a + f(d), 0) / defs.length
  return (REF_AVG[key] = { hp: mean((d) => d.hp), dmg: mean((d) => d.dmg), matk: mean((d) => d.matk ?? d.dmg) })
}
/** v114: a D6+ monster ready for a non-level run (tower / daily), anchored to D5 numbers. Non-D6+ kinds come back unchanged. */
export function deepAnchor(kind: MonsterKind): MonsterDef {
  const home = homeDungeon(kind), d = MONSTERS[kind]
  if (!home || !statNative(kind)) return d
  const tier = monTier(d), out = buildAt(kind, home)
  const a = refAvg(home, tier) ?? refAvg(home, 'normal'), b = refAvg(DEEP_ANCHOR, tier) ?? refAvg(DEEP_ANCHOR, 'normal')
  if (!a || !b) return out
  out.hp = Math.max(1, Math.round(out.hp * (b.hp / a.hp)))
  out.dmg *= b.dmg / a.dmg
  if (out.matk !== undefined) out.matk *= b.matk / a.matk
  return out
}

/** Build defaults at load (before any live-config patch): the default statAlloc + what it derives at the home level. */
const DEFAULT_ALLOC: Partial<Record<MonsterKind, StatAlloc>> = {}
const DEFAULT_PM: Partial<Record<MonsterKind, number>> = {}
const REF: Partial<Record<MonsterKind, Derived>> = {}
function refOf(kind: MonsterKind, d: MonsterDef, lv: number): Derived {
  const r = REF[kind]
  if (r) return r
  return derive(DEFAULT_ALLOC[kind] ?? allocOf(d), lv, monTier(d), {}, DEFAULT_PM[kind] ?? 1) // homeless (events): same level, so only statAlloc edits move it
}

/** 7 stats on a D1-5 / event monster at `lv`, numbers anchored to its tuned values (see the header above). */
export function withStats(d: MonsterDef, kind: MonsterKind, lv: number, o: StatMonOpts = {}): MonsterDef {
  if (!d.statAlloc || statNative(kind)) return d
  const alloc = allocOf(d), tier = monTier(d)
  const pm = d.pointsMul ?? 1
  const s = derive(alloc, lv, tier, o, pm) // stat-only parts (and skill scaling) see hard-mode points
  const now = o.hard ? derive(alloc, lv, tier, { statMul: o.statMul, tierPct: o.tierPct }, pm) : s // numbers: hard mode is hardDef's job
  const ref = refOf(kind, d, lv)
  const out: MonsterDef = { ...d, lv, base: s.b, ...statOnly(d, s) }
  const ratio = (a: number, b: number) => (b > 0 ? a / b : 1)
  const rHp = ratio(now.hp, ref.hp), rDmg = ratio(now.dmg, ref.dmg), rMatk = ratio(now.matk, ref.matk), rSpd = ratio(now.speed, ref.speed)
  // v82: bodyMul / speedMul work here too (they were D6-only, so an admin edit on a D1-5 monster did nothing). Default {} / 1 = unchanged.
  const bm = d.bodyMul ?? {}, mHp = bm.hp ?? 1, mDmg = bm.dmg ?? 1, mMatk = bm.matk ?? 1, mSpd = d.speedMul ?? 1
  if (rHp !== 1 || mHp !== 1) out.hp = Math.max(1, Math.round(d.hp * rHp * mHp))
  if (rDmg !== 1 || mDmg !== 1) out.dmg = d.dmg * rDmg * mDmg
  if ((rMatk !== 1 || mMatk !== 1) && (d.matk !== undefined || mMatk !== 1)) out.matk = (d.matk ?? d.dmg) * rMatk * mMatk // magic falls back to dmg
  if (rSpd !== 1 || mSpd !== 1) out.speed = (d.speed ?? BATTLE.monSpeed[kind] ?? 10) * rSpd * mSpd
  const add = (key: 'def' | 'hit' | 'flee', dflt: number, delta: number) => { if (delta !== 0) out[key] = Math.round((d[key] ?? dflt) + delta) }
  add('def', 0, now.def - ref.def)
  add('hit', 15, now.hit - ref.hit)
  add('flee', 5, now.flee - ref.flee)
  const rate = (key: 'crit' | 'combo' | 'counter', c: number, delta: number) => { if (delta !== 0) out[key] = Math.max(0, cap((d[key] ?? 0) + delta, c)) }
  rate('crit', 1, now.crit - ref.crit)
  rate('combo', MON_STAT.rateCap, now.combo - ref.combo)
  rate('counter', MON_STAT.rateCap, now.counter - ref.counter)
  return scaleExtras(out)
}

// ----- stat-scaled monster skills -----
/** A skill's scaling stat: x (1 + per x (stat - ref)), ref = the stat an even-split NORMAL monster of the same level has.
 * So a specialist (high INT caster, 150-200% boss budget, hard mode +50%) casts harder, an off-stat caster a bit softer. */
export interface SkillScale { stat: BaseStat; per?: number }
export const SKILL_SCALE = {
  per: 0.003, // +0.3% per point above ref (0.5% cost D5 bot 15/20 -> 10/20 wins at the lich)
  min: 0.8, max: 1.5,
  byKind: { bolt: 'int', strike: 'str', heal: 'wis', shield: 'wis', warcry: 'str', haste: 'agi', revive: 'wis' } as Partial<Record<MonSkillKind, BaseStat>>,
  slam: { phys: 'str', magic: 'int' } as { phys: BaseStat; magic: BaseStat },
  /** v76: boss numbers that are not skills, same formula (per tunable in admin.html, 0 = off). docs/design/monster-stat-scaling.md */
  fx: {
    phaseHeal: { stat: 'wis', per: 0.003 }, // BossPhase.heal: share of max HP healed on entering a phase
    phaseShield: { stat: 'wis', per: 0.003 }, // BossPhase.shield
    razor: { stat: 'int', per: 0.003 }, // hunter Blood Razor: magic damage = this share of the hero's current HP
  } as Record<'phaseHeal' | 'phaseShield' | 'razor', SkillScale>,
  /** v81 skill level (MonSkill.lv, RO style: may pass the hero's max 10, e.g. Lv 50). Lv 1 = the skill as written.
   *  pow x (1 + powPer x (Lv - 1)) · +1 hit every hitsEvery Lv (bolt / strike) · +1 stack every fxEvery Lv (not freeze)
   *  · warcry +1 turn every turnsEvery Lv. 0 = that part off. */
  lv: { powPer: 0.1, hitsEvery: 10, fxEvery: 5, turnsEvery: 5 },
}
/** Default scale of a skill (its own `scale` wins; false = never scales; curse / summon have none). */
export const scaleOf = (sk: MonSkill): SkillScale | undefined =>
  sk.scale === false ? undefined : sk.scale ?? (SKILL_SCALE.byKind[sk.kind] ? { stat: SKILL_SCALE.byKind[sk.kind]! } : undefined)
export const slamScaleOf = (d: MonsterDef): SkillScale => d.slamScale ?? { stat: d.slamMagic ? SKILL_SCALE.slam.magic : SKILL_SCALE.slam.phys }
/** Multiplier on a skill's pow (or on the charged attack) from the caster's stats. 1 for a monster without stats. */
export function skillMul(d: MonsterDef, sc: SkillScale | undefined): number {
  if (!sc || !d.base || !d.lv) return 1
  const ref = 1 + monPoints(d.lv, 'normal') / 7
  const k = 1 + (sc.per ?? SKILL_SCALE.per) * (d.base[sc.stat] - ref)
  return Math.round(Math.max(SKILL_SCALE.min, Math.min(SKILL_SCALE.max, k)) * 1000) / 1000
}

/** v76: phase heal / shield and razor x the monster's stat (SKILL_SCALE.fx). New arrays, the base def is never mutated. */
function scaleExtras(d: MonsterDef): MonsterDef {
  const F = SKILL_SCALE.fx
  if (d.phases?.some((p) => p.heal || p.shield)) {
    const h = skillMul(d, F.phaseHeal), sh = skillMul(d, F.phaseShield)
    d.phases = d.phases.map((p) => ({ ...p, ...(p.heal ? { heal: Math.min(1, p.heal * h) } : {}), ...(p.shield ? { shield: Math.min(1, p.shield * sh) } : {}) }))
  }
  if (d.razor) d.razor = Math.min(1, d.razor * skillMul(d, F.razor))
  return d
}

// Freeze the build defaults now, before live-config can patch statAlloc / LEGACY / MON_STAT.
for (const kind of Object.keys(MONSTERS) as MonsterKind[]) {
  const d = MONSTERS[kind]
  if (!d.statAlloc || statNative(kind)) continue
  DEFAULT_ALLOC[kind] = { ...allocOf(d) }
  DEFAULT_PM[kind] = d.pointsMul ?? 1
  if (homeDungeon(kind)) REF[kind] = derive(DEFAULT_ALLOC[kind]!, legacyLevel(kind, d, { id: '' }), monTier(d), {}, DEFAULT_PM[kind])
}

// ----- v81 skill levels (SKILL_SCALE.lv) -----
/** pow a skill has when it does not set one (BattleScene skPow defaults), so a level can scale it too. */
const POW_DEFAULT: Partial<Record<MonSkillKind, number>> = { bolt: 1.3, strike: 1.3, heal: 0.15, shield: 0.1, warcry: 0.2, haste: 30, revive: 0.5 }
/** These pows are shares of max HP: a high level can make them full, never more. */
const SHARE_KINDS = new Set<MonSkillKind>(['heal', 'shield', 'revive'])
export const skillLvPow = (lv: number) => 1 + SKILL_SCALE.lv.powPer * (Math.max(1, lv) - 1)
const lvStep = (lv: number, every: number) => (every > 0 ? Math.floor((Math.max(1, lv) - 1) / every) : 0)
/** The skill as cast at `lv` (a new object; Lv 1 returns the skill itself). */
export function skillAtLv(sk: MonSkill, lv = sk.lv ?? 1): MonSkill {
  if (lv <= 1) return sk
  const L = SKILL_SCALE.lv, out: MonSkill = { ...sk, lv }
  const base = sk.pow ?? POW_DEFAULT[sk.kind]
  if (base !== undefined && !sk.powFixed) out.pow = SHARE_KINDS.has(sk.kind) ? Math.min(1, base * skillLvPow(lv)) : base * skillLvPow(lv)
  if (sk.kind === 'bolt' || sk.kind === 'strike') out.hits = (sk.hits ?? 1) + lvStep(lv, L.hitsEvery)
  if (sk.kind === 'warcry') out.turns = (sk.turns ?? 3) + lvStep(lv, L.turnsEvery)
  if (sk.fx) {
    const add = lvStep(lv, L.fxEvery), fx: HitFx = {}
    for (const [k, v] of Object.entries(sk.fx) as [keyof HitFx, number][]) fx[k] = v && k !== 'freeze' ? v + add : v
    out.fx = fx
  }
  return out
}

// ===== v116 tower Lv (Q 2026-11-08 "ทำให้ D1-D10 scale skill / stat ได้") =====
// Tower HP / ATK / M.ATK already follow Hero Power + floor (modes.towerScale). Everything else (DEF, Hit, Flee, crit, combo,
// counter, speed, M.DEF, lucky dodge, skill levels) used to stay at the monster's home level: a Hell D3 mini on floor 40 was Lv 12,
// a D10 monster on floor 25 was Lv 90. Now every monster on a floor is rebuilt at that floor's tower Lv (Hell: + HELL.lv),
// keeping the tower's HP / ATK. D1-D5 only move up from their home level; D6+ follow the tower Lv both ways.
export const TOWER_LV = { perFloor: 1.5, skillEvery: 10, // skill Lv +1 per `skillEvery` Lv above the monster's home Lv
  mvpPct: 2.5 } // v122 (Q 2026-11-08 "lv 77 stat point x 2.5 is mvp"): a tower boss gets 2.5x the hero's stat points at its Lv (dungeons: MON_STAT.tierPct.boss 1.5)
export const towerMonLv = (floor: number) => Math.max(1, Math.round(TOWER_LV.perFloor * floor))
const lvUp = (s: MonSkill, n: number): MonSkill => ({ ...s, lv: (s.lv ?? 1) + n, ...(s.pick ? { pick: s.pick.map((p) => lvUp(p, n)) } : {}) })
/** v121 (Q 2026-11-08, F45 death log: Hell อัศวินมรณะ ดาบมรณะ 69k raw = x1.6 skill-Lv pow x1.2 stat scale on top of the tower ATK):
 * a damage skill keeps the power it had at home (home-Lv pow x home stat scale). The tower's ATK / M.ATK already follow the hero
 * (modes.towerScale), so growing pow with the tower Lv counted the hero twice. A higher Lv still adds hits / fx (skillAtLv). */
const DMG_KINDS = new Set<MonSkillKind>(['bolt', 'strike'])
function freezePow(s: MonSkill, home: MonsterDef): MonSkill {
  const pick = s.pick ? { pick: s.pick.map((p) => freezePow(p, home)) } : {}
  if (!DMG_KINDS.has(s.kind) || s.powFixed) return { ...s, ...pick }
  const pow = (skillAtLv(s).pow ?? POW_DEFAULT[s.kind]!) * skillMul(home, scaleOf(s))
  return { ...s, ...pick, pow, scale: false, powFixed: true }
}
/** `base` (already built at its home level) rebuilt at Lv `lv`: stats + skill levels move, HP / ATK / M.ATK stay
 *  unless `numbers` (v122 tower: HP / ATK / M.ATK come from the stats at `lv` too, like a D6+ level dungeon). */
export function restatAt(base: MonsterDef, kind: MonsterKind, lv: number, numbers = false): MonsterDef {
  const d = MONSTERS[kind], home = base.lv ?? 1, deep = statNative(kind)
  if (!d || lv === home || (!deep && (lv < home || !d.statAlloc))) return base
  const o: StatMonOpts = numbers && monTier(d) === 'boss' ? { tierPct: TOWER_LV.mvpPct } : {}
  const at = deep ? statMonster(d, lv, o) : withStats(d, kind, lv, o)
  const out: MonsterDef = numbers ? { ...at } : { ...at, hp: base.hp, dmg: base.dmg }
  if (!numbers) { if (base.matk !== undefined) out.matk = base.matk; else delete out.matk }
  const n = Math.floor(Math.max(0, lv - home) / TOWER_LV.skillEvery)
  const up = (s: MonSkill) => { const f = freezePow(s, base); return n > 0 ? lvUp(f, n) : f }
  if (out.skills) out.skills = out.skills.map(up)
  if (out.phases) out.phases = out.phases.map((p) => (p.skills ? { ...p, skills: p.skills.map(up) } : p))
  return out
}
