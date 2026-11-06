// Live-config whitelist: only these paths, numbers only, within [min, max]. Structure stays in code. Patterns: `*` / `a|b`.
// NEVER add COSTUMES.price / SUPPORTER_PRICE / GEM_PACKS (server SKU prices) or tints. Bump CONFIG_SCHEMA if a path's meaning changes.
import { BATTLE, COMBO, HARD, HARD_PASSIVES, HARD_SKILLS, MONSTERS, RULES } from './game-data'
import { JOB_RULES, STAT_RULES } from './meta'
import { ARCHETYPES, LEGACY, LEVEL_GAP, MON_STAT, SKILL_SCALE } from './mon-stats'
import { KIT } from './skill-math'

export const CONFIG_SCHEMA = 1

export type TableId =
  | 'monsters' | 'battle' | 'combo' | 'hard' | 'hardSkills' | 'hardPassives'
  | 'monStat' | 'archetypes' | 'skillScale' | 'progression' | 'kit'
/** Path -> number, per table. */
export type Patch = Partial<Record<TableId, Record<string, number>>>
/** Array-element path ("king.skills.1") -> that element's expected name / id, per table. */
export type Guards = Partial<Record<TableId, Record<string, string>>>
/** What GET /config/live and /admin/draft/preview return. releaseId null = live config off (play the defaults). */
export interface Release { releaseId: number | null; schemaVer: number; hash?: string; patch: Patch; guards: Guards }

export interface FieldDef {
  kind: 'num' | 'int'
  min: number
  max: number
  /** The leaf may be absent in the defaults; a patch may add it (its parent object must exist). */
  optional?: boolean
}
export interface TableDef {
  id: TableId
  label: string
  /** The object patched in place. Composite roots ({ stat: STAT_RULES, ... }) hold refs, so writes reach the real consts. */
  target: () => object
  fields: [pattern: string, def: FieldDef][]
}

// ---------- small builders ----------
const num = (min: number, max: number, optional = false): FieldDef => ({ kind: 'num', min, max, optional })
const int = (min: number, max: number, optional = false): FieldDef => ({ kind: 'int', min, max, optional })
const pre = (prefix: string, fields: [string, FieldDef][]): [string, FieldDef][] => fields.map(([p, d]) => [`${prefix}.${p}`, d])

const HIT_FX: [string, FieldDef][] = [
  ['poison|burn|weaken|armorBreak|silence|slow|web', int(0, 20, true)],
  ['freeze', int(0, 100, true)],
]
const SKILL: [string, FieldDef][] = [
  ['every', int(1, 50)],
  ['pow', num(0, 20, true)],
  ['turns', int(0, 99, true)],
  ['hits', int(1, 30, true)],
  ['alone', num(0, 10, true)],
  ['drain', num(0, 1, true)],
  ['lv', int(1, 99, true)], // v81 skill level (mon-stats skillAtLv)
  ...pre('fx', HIT_FX), // no summon skill exists yet: add 'summon.1' when one does
]
const BASE7 = 'str|vit|wis|dex|int|luk|agi'

// ---------- monsters ----------
const MONSTER_FIELDS: [string, FieldDef][] = [
  ['hp', int(1, 1_000_000)],
  ['dmg', num(0, 100_000)],
  ['matk', num(0, 100_000, true)],
  ['def', num(-500, 5000, true)],
  ['flee|hit', num(-500, 5000, true)],
  ['xp', int(0, 100_000)],
  ['zeny.0|1', int(0, 1_000_000)],
  ['crit|combo|counter', num(0, 1.5, true)],
  ['lifesteal|reflect|absorb|razor|fixedFlee', num(0, 1, true)],
  ['deathBlast', num(0, 20, true)],
  ['slamMul', num(0, 20, true)],
  ['chargeEvery', int(1, 20, true)],
  ['shots', int(1, 20, true)],
  ['speedMul', num(0.1, 5, true)],
  ['bodyMul.hp|dmg|matk', num(0.05, 20, true)],
  [`statAlloc.${BASE7}`, num(0, 20, true)],
  ['pointsMul', num(0.1, 10, true)], // v81: x the stat point budget (mon-stats derive)
  ['venom.dmg|dex', num(0, 10_000)],
  ['venom.turns', int(0, 50)],
  ['trueSight.after|turns', int(1, 20)],
  ...pre('onHit', HIT_FX),
  ...pre('slamFx', HIT_FX),
  ...pre('skills.*', SKILL),
  ...pre('skills.*.pick.*', SKILL),
  ['phases.*.at', num(0.01, 1)],
  ['phases.*.speed|dmg', num(0.1, 10, true)],
  ['phases.*.heal|shield|reflect|absorb', num(0, 1, true)],
  ['phases.*.chargeEvery', int(1, 20, true)],
  ['phases.*.drainStats', int(0, 50, true)],
  ['phases.*.summon.1', int(1, 5)],
  ...pre('phases.*.onHit', HIT_FX),
  ...pre('phases.*.slamFx', HIT_FX),
  // phases.*.skills: no phase replaces its skill list yet; add `...pre('phases.*.skills.*', SKILL)` when one does.
]

// ---------- battle ----------
const BATTLE_FIELDS: [string, FieldDef][] = [
  ['turnLimit|bossTurnLimit', int(1, 200)],
  ['heroSpeed', num(1, 100)],
  ['monSpeed.*', num(1, 100)],
  ['monDmgMul', num(0, 10)],
  ['monBuff.hp|dmg|turns.*', num(0.1, 10)],
  ['cleave|counterMul|reviveHp|parryMul|regenPerTurn|resPerTurn', num(0, 10)],
  ['slamEvery|parryEvery|comboMax', int(1, 20)],
  ['slamStun', int(0, 100)],
  ['msPerTurn', int(100, 10_000)],
  ['duel.vitalEvery|healTurns|espadaEvery|espadaHits', int(1, 50)],
  ['duel.vitalPct|vitalLvMul|ripostePct|riposteCap|espadaMin|espadaMax', num(0, 2)],
  ['frenzyAt|scentAt|demonAt', num(0, 1)],
  ['frenzySpeed|scentSpeed', num(0.1, 10)],
  ['frenzyLifesteal|scentCombo|demonRegen', num(0, 2)],
  ['toxicSkin.dr|tenacity|critCut', num(0, 1)],
  ['toxicSkin.poison', int(0, 20)],
  ['web.agi|frozenHeart', num(0, 1)],
  ['iceSkin.turns', int(0, 20)],
  ['iceSkin.dmgCut', num(0, 1)],
  ['vengeance.turns|cd', int(0, 20)],
  ['vengeance.share|dotPct|dotMatk', num(0, 5)],
  ['maiden.at', num(0, 1)],
  ['maiden.turns', int(0, 100)],
  ['bulletTime.at|bonusMin|bonusMax', num(0, 2)],
  ['bulletTime.countdown|hits', int(1, 100)],
  ['poisonPct|burnPct|burnHealCut|weakenMul|armorBreakMul|reflectCap|soulCap', num(0, 1)],
  ['poisonCap|soulBolts', int(0, 50)],
  ['monCritMul|monComboMul|monCounterMul', num(0, 10)],
]

const COMBO_FIELDS: [string, FieldDef][] = [
  ['baseCount', int(0, 10)],
  ['rateCap', num(0, 5)],
  ['dmgFloor|hardAdd|defCap|critDRCap', num(0, 1)],
  ['ignore|basicDR|comboDR|ignoreCounter|counterDR.normal|mini|boss', num(0, 1)],
  ['defK', num(1, 10_000)],
]

const HARD_FIELDS: [string, FieldDef][] = [
  ['recLv.*', int(1, 99)],
  ['curve.*.0', int(1, 99)],
  ['curve.*.1|2', num(1, 1_000_000)],
  ['hpGrow|dmgGrow', num(1, 2)],
  ['maxLv', int(1, 99)],
  ['hp|atk|turnMul|reward|mats', num(0.1, 10)],
  ['rewardPow', num(0, 3)],
  ['hitPerLv', num(0, 20)],
]

const KIT_INTS = 'archerAutoShots|archerVolleyShots|mageFireStacks|mageIceChill|mageLightHits|clericSmiteTargets|clericJudgeEvery|clericWarmLightLv|spearMax|thiefAutoPoison|thiefUltHits|thiefUltDodge'
const KIT_NUMS = 'archerAuto|archerUlt|mageFire|mageIce|mageLightLo|mageLightHi|clericHealBelow|clericJudge|clericUltAtkLv|clericWarmCounterLv|clericSpearShieldLv|spearBase|thiefAuto|thiefUlt'

export const TABLES: Record<TableId, TableDef> = {
  monsters: { id: 'monsters', label: 'Monsters / mini bosses / bosses', target: () => MONSTERS, fields: pre('*', MONSTER_FIELDS) },
  battle: { id: 'battle', label: 'BATTLE (turn engine, monster speed, monBuff)', target: () => BATTLE, fields: BATTLE_FIELDS },
  combo: { id: 'combo', label: 'COMBO / counter model', target: () => COMBO, fields: COMBO_FIELDS },
  hard: { id: 'hard', label: 'HARD mode curve', target: () => HARD, fields: HARD_FIELDS },
  hardSkills: { id: 'hardSkills', label: 'HARD_SKILLS (boss affix skills)', target: () => HARD_SKILLS, fields: pre('*', SKILL) },
  hardPassives: {
    id: 'hardPassives', label: 'HARD_PASSIVES (boss affix passives)', target: () => HARD_PASSIVES,
    fields: [['*.lifesteal|reflect', num(0, 1, true)], ['*.speed|enrage', num(0.1, 10, true)], ['*.def', num(0, 5000, true)], ...pre('*.onHit', HIT_FX)],
  },
  monStat: {
    id: 'monStat', label: 'Stat monsters (MON_STAT, LEVEL_GAP, LEGACY)',
    target: () => ({ monStat: MON_STAT, levelGap: LEVEL_GAP, legacy: LEGACY }),
    fields: [
      // MON_STAT.pointsPerLv is a getter on STAT_RULES.pointsPerLevel: tune it in `progression`.
      ['monStat.tierPct.normal|mini|boss', num(0, 10)],
      ['monStat.hardAdd', num(0, 10)],
      ['monStat.levelBase.hp|atk|matk|def|hit', num(0, 1000)],
      ['monStat.body.normal|mini|boss', num(0.1, 100)],
      ['monStat.mdefCap|luckyCap', num(0, 1)],
      ['monStat.rateCap', num(0, 5)],
      ['levelGap.free', int(0, 99)],
      ['levelGap.per|min', num(0, 1)],
      ['legacy.lv.*', int(1, 99)],
      ['legacy.tierDrop.normal|mini|boss', int(0, 20)],
    ],
  },
  archetypes: { id: 'archetypes', label: 'Monster archetypes (stat weights)', target: () => ARCHETYPES, fields: [[`*.${BASE7}`, num(0, 20, true)]] },
  skillScale: { id: 'skillScale', label: 'Monster skill scaling + skill levels', target: () => SKILL_SCALE, fields: [['per', num(0, 0.1)], ['min|max', num(0, 10)], ['fx.*.per', num(0, 0.1)], ['lv.powPer', num(0, 1)], ['lv.hitsEvery|fxEvery|turnsEvery', int(0, 99)]] }, // fx: v76 phase heal / shield, razor
  progression: {
    id: 'progression', label: 'Progression (stat points, EXP curves, run healing)',
    target: () => ({ stat: STAT_RULES, job: JOB_RULES, run: RULES }),
    fields: [
      ['stat.pointsPerLevel', int(1, 20)],
      ['stat.xpBase|xpStep', int(1, 100_000)],
      ['job.xpBase|xpStep', int(1, 100_000)],
      ['run.runXpBase|runXpStep', int(1, 1000)],
      ['run.xpOnClear', int(0, 1000)],
      ['run.healOnClear|healOnLevel', num(0, 1)],
    ],
  },
  kit: {
    id: 'kit', label: 'Class KIT numbers', target: () => KIT,
    fields: [[KIT_INTS, int(0, 50)], [KIT_NUMS, num(0, 20)], ['cast.breakBase|breakDex', num(0, 1)], ['cast.fireMul|ultMul', num(0, 20)], ['cast.brokenUltCd|boltMana', int(0, 50)]], // v78 MAGE_CAST
  },
}
export const TABLE_IDS = Object.keys(TABLES) as TableId[]
