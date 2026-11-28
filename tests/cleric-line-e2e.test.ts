// Opaque-box 4-tier E2E verification suite for Cleric, Crusader/Paladin & Monk/Champion.
// Run: node tools/test.mjs cleric-line-e2e
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ALLIES, makeAlly } from '../src/battle/allies'
import { afterDef, BATTLE, comboExtra, COMBO, CRIT_RULES, RESIST_RULES, softCapDiminish } from '../src/data/battle-rules'
import { CLASS_GEAR } from '../src/data/class-gear'
import { CLASS_CRAFT_ITEMS } from '../src/data/class-craft'
import { CLERIC_ZONE_ITEMS } from '../src/data/cleric-zone-sets'
import { MONSTERS } from '../src/data/monsters'
import { statMonster } from '../src/data/mon-stats'
import { CLERIC_KIT, JOBS, RES_RULES } from '../src/data/jobs'
import { JOB2, type Job2Id } from '../src/data/jobs2'
import { activeJob3, JOB3, JOB3_RULES, type Job3Id } from '../src/data/jobs3'
import {
  blessBase,
  canWear,
  canWearAs,
  heroBuild,
  heroStats,
  itemById,
  PER_POINT,
  STAT_RULES,
  totalBase,
  type BaseStat,
  type SkillId,
  type StatsInput,
} from '../src/data/meta'
import { BLESS_UPTIME, CLASS_K, heroParts, heroPower, JOB2_K, JOB3_K, powerParts, recPower } from '../src/data/power'
import { CLASS_LINE_POOL } from '../src/data/refine'
import { applyTankDr, TANK_BULK, tankBulk } from '../src/data/tank-scale'
import {
  asuraDamage,
  autoCost,
  autoInfo,
  bellMdefMul,
  clericUltLights,
  clericUltSmash,
  dawnBonus,
  dawnInfo,
  dawnMul,
  dawnWisGain,
  gcPulses,
  haymakerCalc,
  hitText,
  KIT,
  KIT2,
  KIT3,
  magicPower,
  S2N,
  skill2Info,
  spearMul,
  ultCost,
  ultInfo,
} from '../src/data/skill-math'
import * as skillMath from '../src/data/skill-math'
import {
  canRollCrit,
  CLASS1_LVS,
  CRIT_SLOTS,
  critPower,
  critRef,
  J3_OF,
  job2Layout,
  scaleCritMul,
  SKILL_LAYOUT,
  skillRoot,
  skillTableFields,
} from '../src/data/skill-registry'
import { SKILL2, skill2ById, skill2Of } from '../src/data/skill2'
import {
  BRANCHES,
  BRANCHES2,
  BRANCHES3,
  branches2Of,
  branches3Of,
  branchesOf,
  CLASS1_CAP,
  class1Cap,
  crossTierBonus,
  lockReason,
  lockReason3,
  NO_STRETCH,
  nodeById,
  nodesOf,
  s2LvOf,
  setClass1Tier,
  TALENT_RULES,
  talentEarned,
  talentMods,
  talent2Mods,
  talents2Of,
  talentsOf,
  TREE,
  TREE2,
  TREE3,
  tree2Mods,
  tree3Mods,
  TREE_RULES,
  ultEvolutionSummary,
} from '../src/data/tree'
import { CHAMPION_UNIQUES, PALADIN_UNIQUES, rollUnique3Drop } from '../src/data/uniques3'
import {
  addXp,
  adopt,
  changeJob,
  changeJob2,
  changeJob3,
  equip,
  load,
  migrateClericDawn,
  migrateDawnBurst,
  newSave,
  normalizeEndgameFields,
  save,
  setJob3Path,
  setJob3Variant,
  setSave,
  syncClass1,
  trialWin,
  wipe,
  type SaveData,
} from '../src/save'

// ----- Test Harness Isolation (localStorage shim & state reset) -----
const memStorage: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage ??= {
  getItem: (k: string) => memStorage[k] ?? null,
  setItem: (k: string, v: string) => {
    memStorage[k] = v
  },
  removeItem: (k: string) => {
    delete memStorage[k]
  },
}

const DEFAULT_SKILLS: Record<SkillId, number> = {
  smash: 1,
  firstaid: 0,
  tough: 0,
  focus: 0,
  power: 0,
  iron: 0,
  swift: 0,
}

const DEFAULT_STATS: Record<BaseStat, number> = {
  str: 40,
  vit: 45,
  wis: 55,
  dex: 25,
  int: 40,
  luk: 20,
  agi: 30,
}

function makeInput(overrides: Partial<StatsInput> = {}): StatsInput {
  return {
    race: 'human',
    stats: { ...DEFAULT_STATS, ...(overrides.stats ?? {}) },
    equipped: { ...(overrides.equipped ?? {}) },
    skills: { ...DEFAULT_SKILLS, ...(overrides.skills ?? {}) },
    job: 'cleric',
    jobLevel: 40,
    ...overrides,
  }
}

function withCleanSave(fn: () => void): void {
  wipe()
  for (const key of Object.keys(memStorage)) delete memStorage[key]
  try {
    fn()
  } finally {
    wipe()
    for (const key of Object.keys(memStorage)) delete memStorage[key]
    setClass1Tier(1)
  }
}

function withTier(tier: 1 | 2 | 3, fn: () => void): void {
  setClass1Tier(tier)
  try {
    fn()
  } finally {
    setClass1Tier(1)
  }
}

const near = (a: number, b: number, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b} (±${eps})`)

const battleSceneSrc = () => readFileSync('src/scenes/BattleScene.ts', 'utf8')
const skillMathSrc = () => readFileSync('src/data/skill-math.ts', 'utf8')

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

function extractBlock(src: string, signatureRegex: RegExp): string {
  const m = signatureRegex.exec(src)
  if (!m) return ''
  let i = m.index + m[0].length
  let inSingle = false
  let inDouble = false
  let inBacktick = false
  let parenDepth = 0
  while (i < src.length) {
    const ch = src[i]
    const prev = i > 0 ? src[i - 1] : ''
    if (inSingle) {
      if (ch === "'" && prev !== '\\') inSingle = false
    } else if (inDouble) {
      if (ch === '"' && prev !== '\\') inDouble = false
    } else if (inBacktick) {
      if (ch === '`' && prev !== '\\') inBacktick = false
    } else if (ch === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i)
      i = nl === -1 ? src.length : nl
      continue
    } else if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      i = end === -1 ? src.length : end + 2
      continue
    } else if (ch === "'") {
      inSingle = true
    } else if (ch === '"') {
      inDouble = true
    } else if (ch === '`') {
      inBacktick = true
    } else if (ch === '(') {
      parenDepth++
    } else if (ch === ')') {
      if (parenDepth > 0) parenDepth--
    } else if (ch === '{' && parenDepth === 0) {
      break
    }
    i++
  }
  if (i >= src.length || src[i] !== '{') return ''
  const start = i
  let depth = 0
  inSingle = false
  inDouble = false
  inBacktick = false
  for (let j = start; j < src.length; j++) {
    const ch = src[j]
    const prev = j > 0 ? src[j - 1] : ''
    if (inSingle) {
      if (ch === "'" && prev !== '\\') inSingle = false
    } else if (inDouble) {
      if (ch === '"' && prev !== '\\') inDouble = false
    } else if (inBacktick) {
      if (ch === '`' && prev !== '\\') inBacktick = false
    } else if (ch === '/' && src[j + 1] === '/') {
      const nl = src.indexOf('\n', j)
      j = nl === -1 ? src.length - 1 : nl
    } else if (ch === '/' && src[j + 1] === '*') {
      const end = src.indexOf('*/', j + 2)
      j = end === -1 ? src.length - 1 : end + 1
    } else if (ch === "'") {
      inSingle = true
    } else if (ch === '"') {
      inDouble = true
    } else if (ch === '`') {
      inBacktick = true
    } else if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) return src.slice(start, j + 1)
    }
  }
  return ''
}

function extractSkillMathFn(src: string, fnName: string): string {
  const fnBlock = extractBlock(src, new RegExp(`export\\s+(?:async\\s+)?function\\s+${fnName}\\b`))
  if (fnBlock) return fnBlock
  const arrowMatch = new RegExp(`export\\s+const\\s+${fnName}\\s*=`).exec(src)
  if (!arrowMatch) return ''
  const afterEq = src.slice(arrowMatch.index + arrowMatch[0].length)
  const arrowIdx = afterEq.indexOf('=>')
  if (arrowIdx < 0) return ''
  const afterArrow = afterEq.slice(arrowIdx + 2).trimStart()
  if (afterArrow.startsWith('{')) {
    return extractBlock(src.slice(arrowMatch.index), /=>/)
  }
  const nextExport = afterArrow.search(/\nexport\b/)
  return nextExport >= 0 ? afterArrow.slice(0, nextExport) : afterArrow
}

// =====================================================================
// TIER 1: FEATURE COVERAGE (>= 5 cases/assertions per feature area)
// =====================================================================

test('Tier 1 — Cleric S1 (cleric_s1p, cleric_b1..b4j, cleric_c1..c4) scales S1 power, INT, targets, Judge, and Faith', () => {
  const st0 = heroStats(makeInput({ jobTree: {} }))
  const st1 = heroStats(makeInput({ jobTree: { cleric_s1p: 1 } }))
  const st5 = heroStats(makeInput({ jobTree: { cleric_s1p: 5 } }))
  near(st0.s1Pow, 0)
  near(st1.s1Pow, 0.12)
  near(st5.s1Pow, 0.6)

  // cleric_b1: matk +15 & clInt +5 (in totalBase, +5 INT = +10 M.ATK & +15 maxRes)
  const b0 = totalBase(makeInput({ jobTree: {} }))
  const b1 = totalBase(makeInput({ jobTree: { cleric_s1p: 1, cleric_b1: 5 } }))
  const stB1 = heroStats(makeInput({ jobTree: { cleric_s1p: 1, cleric_b1: 5 } }))
  assert.equal(b1.int - b0.int, 5)
  assert.equal(stB1.matk - st0.matk, 15 + 5 * PER_POINT.int.matk)
  assert.equal(stB1.maxRes - st0.maxRes, 5 * PER_POINT.int.maxRes)

  // cleric_b2 + cleric_b4j: targets, smiteMul, judge capstone
  const stB4 = heroStats(makeInput({ jobTree: { cleric_s1p: 1, cleric_b1: 5, cleric_b2: 5, cleric_b4j: 1 } }))
  assert.equal(stB4.smiteTargets, 2)
  near(stB4.smiteMul, 0.15)
  assert.equal(stB4.judge, 1)
  const rowsB4 = autoInfo('cleric', stB4)
  assert.ok(rowsB4.some((r) => r.label.includes(`${KIT.clericSmiteTargets + 2} ตัวหน้า`)))
  assert.ok(rowsB4.some((r) => r.label.includes(`พิพากษา (ทุก ${KIT.clericJudgeEvery} ครั้ง)`)))

  // cleric_c1..c4: Faith stacks, burst, heal, overheal burst
  const stC = heroStats(
    makeInput({ jobTree: { cleric_s1p: 1, cleric_c1: 5, cleric_c2: 5, cleric_c3: 5, cleric_c4: 1 } }),
  )
  near(stC.clFaith, KIT.clericTree.faith * 3)
  near(stC.clFaithOver, KIT.clericTree.faithOver * 3)
  near(stC.clFaithHeal, KIT.clericTree.faithHealPer * 3)
  assert.equal(stC.clOverBurst, 1)
  const rowsC = autoInfo('cleric', stC)
  assert.ok(rowsC.some((r) => r.label.includes(`ฮีลตอนศรัทธาเต็ม ${KIT.clericTree.faithMax}`)))
  assert.ok(rowsC.some((r) => r.label.includes(`ระเบิดศรัทธา (ครบ ${KIT.clericTree.faithMax})`)))
})

test('Tier 1 — [Post-M2] cleric_b3s healAt threshold stays viable at Class-1 Tier 3 Lv 15 (not stretched down to 15% HP)', () => {
  withTier(3, () => {
    const b3s = nodeById('cleric_b3s')!
    const stMax = heroStats(makeInput({ job2: 'crusader', job3: 'paladin', jobTree: { cleric_s1p: 1, cleric_b3s: b3s.max } }))
    const healThreshold = KIT.clericHealBelow - stMax.healAt
    assert.ok(
      healThreshold >= 0.4,
      `cleric_b3s at Tier 3 max (${b3s.max}) dropped heal threshold to ${(healThreshold * 100).toFixed(1)}% HP (must stay >= 40%)`,
    )
  })
})

test('Tier 1 — Cleric S2 (cl_renew, cl_bless, cl_spear) mutual exclusion, +/★ scaling, and Bless/Spear mechanics', () => {
  const s2Defs = skill2Of('cleric')
  assert.deepEqual(s2Defs.map((d) => d.id), ['cl_renew', 'cl_bless', 'cl_spear'])

  // Mutual exclusion + ★ gate (requires s2plus >= 3)
  const tPicked: Record<string, number> = { cl_renew: 1 }
  assert.equal(lockReason(tPicked, 'cleric', nodeById('cl_bless')!), `เลือก "ฟื้นฟู" ไปแล้ว (รีเซ็ตเพื่อเปลี่ยน)`)
  assert.equal(lockReason(tPicked, 'cleric', nodeById('cl_spear')!), `เลือก "ฟื้นฟู" ไปแล้ว (รีเซ็ตเพื่อเปลี่ยน)`)
  assert.ok(lockReason(tPicked, 'cleric', nodeById('cl_renew_x')!).includes('ฟื้นฟูลึก'))
  tPicked.cl_renew_p = 1
  assert.ok(lockReason(tPicked, 'cleric', nodeById('cl_renew_x')!).includes('Lv 3'))
  tPicked.cl_renew_p = 3
  assert.equal(lockReason(tPicked, 'cleric', nodeById('cl_renew_x')!), '')

  // cl_renew Lv5 + ★
  const stRenew = heroStats(makeInput({ jobTree: { cl_renew: 1, cl_renew_p: 5, cl_renew_x: 1 } }))
  near(stRenew.s2Lv, 3)
  assert.equal(stRenew.s2Star, 1)
  near(S2N.renewHeal(stRenew.s2Lv), 0.45)
  assert.equal(S2N.renewTurns(true), 6)
  const renewRows = skill2Info(skill2ById('cl_renew')!, stRenew)
  assert.ok(renewRows.some((r) => r.label === 'ฮีล/เทิร์น' && r.value.includes('× 6 เทิร์น')))

  // cl_bless + Kyrie + Gloria
  assert.equal(blessBase(makeInput({ jobTree: { cl_renew: 1 } })), undefined)
  const bless1 = blessBase(makeInput({ jobTree: { cl_bless: 1 } }))
  assert.deepEqual(bless1, { str: 15, dex: 15, int: 15, wis: 15, luk: 0 })
  const blessStar = blessBase(makeInput({ jobTree: { cl_bless: 1, cl_bless_x: 1 } }))
  assert.deepEqual(blessStar, { str: 15, dex: 15, int: 15, wis: 15, luk: 30 })
  const stBless = heroStats(makeInput({ jobTree: { cl_bless: 1, cl_bless_p: 5, cl_bless_x: 1 } }))
  near(S2N.kyrieHp(stBless.s2Lv), 0.15)
  const blessRows = skill2Info(skill2ById('cl_bless')!, stBless)
  assert.ok(blessRows.some((r) => r.label.includes('Kyrie Eleison')))
  assert.ok(blessRows.some((r) => r.label.includes('Gloria') && r.value.includes('LUK +30')))

  // cl_spear + DEX scaling
  const spearDef = skill2ById('cl_spear')!
  const stSpearLowDex = heroStats(makeInput({ stats: { ...DEFAULT_STATS, dex: 1 }, jobTree: { cl_spear: 1, cl_spear_p: 5, cl_spear_x: 1 } }))
  const stSpearHiDex = heroStats(makeInput({ stats: { ...DEFAULT_STATS, dex: 41 }, jobTree: { cl_spear: 1, cl_spear_p: 5, cl_spear_x: 1 } }))
  near(spearMul(stSpearHiDex, spearDef) - spearMul(stSpearLowDex, spearDef), 40 * PER_POINT.off.clericDexSpear)
  assert.equal(S2N.spearCount(false), 2)
  assert.equal(S2N.spearCount(true), 4)
})

test('Tier 1 — Cleric Ult, Dawn Light (cleric_d), Sanctuary (cleric_a), and Core (cleric_core)', () => {
  // Sanctuary a1..a4x
  const st0 = heroStats(makeInput({ jobTree: {} }))
  const stA = heroStats(makeInput({ jobTree: { cleric_ultp: 5, cleric_a1: 5, cleric_a2: 5, cleric_a3t: 5, cleric_a4x: 1 } }))
  near(clericUltSmash(stA), 2.25)
  near(stA.counter - st0.counter, 0.125)
  assert.equal(clericUltLights(stA), CLERIC_KIT.ultLights + 5)
  near(stA.clSpearShield, 0.06)
  near(stA.thorns, 0.75)
  assert.equal(stA.clPurify, 1)

  // Dawn Light dn1..dn4
  const stD = heroStats(makeInput({ jobTree: { cleric_ultp: 1, cleric_dn1: 5, cleric_dn2: 5, cleric_dn3: 3, cleric_dn4: 1 } }))
  near(stD.clDawn, 2)
  near(stD.clDawnHeal, 0.3)
  near(stD.clDawnWis, 0.35)
  assert.equal(stD.clDawnWisTurns, 5)
  assert.equal(stD.clDawnUlt, 1)
  near(stD.clDawnCrit, 0.5)
  const expectedBonus = (60 + 60 + KIT.clericTree.dawn.matk * 100) * 2
  near(dawnBonus({ ...stD, matk: 100 }, 60, 60), expectedBonus)
  assert.equal(dawnWisGain(stD, 200), 70)
  assert.ok(dawnMul({ ...stD, matk: 100 }, 60, 60) > 0)
  const dInfo = dawnInfo(stD, { str: 60, wis: 60 })
  assert.equal(dInfo.length, 4)
  assert.ok(!ultInfo('cleric', stD, { str: 60, wis: 60 }).some((r) => r.label.startsWith('🌄') || r.label.startsWith('☀️')))

  // Core column: tier 0 free + STR/WIS + INT->STR & WIS->VIT + Mana guard/heal/shield
  for (const cn of nodesOf('cleric_core')) assert.equal(lockReason({}, 'cleric', cn), '')
  const inpCore = makeInput({ stats: { ...DEFAULT_STATS, str: 30, wis: 35, int: 35 }, jobTree: { cleric_core1: 5, cleric_core2: 3, cleric_core3: 5 } })
  const base0 = totalBase(makeInput({ stats: { ...DEFAULT_STATS, str: 30, wis: 35, int: 35 } }))
  const baseCore = totalBase(inpCore)
  // cleric_core1 adds +15 STR/WIS; then core2 divides INT and WIS by 5
  assert.equal(baseCore.str - base0.str, 15 + Math.floor(base0.int / 5))
  assert.equal(baseCore.wis - base0.wis, 15)
  assert.equal(baseCore.vit - base0.vit, Math.floor((base0.wis + 15) / 5))
  const stCore = heroStats(inpCore)
  near(stCore.clManaGuard, 0.15)
  near(stCore.clManaHeal, 0.2)
  near(stCore.clManaShield, 0.25)
})

test('Tier 1 — [Post-M2] cleric_ultp scales ultPow alongside clUltAtk across Lv 1..15', () => {
  withTier(3, () => {
    const st1 = heroStats(makeInput({ job2: 'crusader', job3: 'paladin', jobTree: { cleric_ultp: 1 } }))
    const st5 = heroStats(makeInput({ job2: 'crusader', job3: 'paladin', jobTree: { cleric_ultp: 5 } }))
    const st15 = heroStats(makeInput({ job2: 'crusader', job3: 'paladin', jobTree: { cleric_ultp: 15 } }))
    assert.ok(st1.ultPow > 0, `expected cleric_ultp Lv 1 to emit ultPow > 0, got ${st1.ultPow}`)
    assert.ok(st5.ultPow > st1.ultPow, `expected Lv 5 ultPow (${st5.ultPow}) > Lv 1 (${st1.ultPow})`)
    assert.ok(st15.ultPow > st5.ultPow, `expected Lv 15 ultPow (${st15.ultPow}) > Lv 5 (${st5.ultPow})`)
    assert.ok(st5.clUltAtk > st1.clUltAtk, 'clUltAtk smash scaling must be preserved')
  })
})

test('Tier 1 — Cleric Talents (cleric_t1..t4) row gating and stat application', () => {
  for (const [idx, lvReq] of TALENT_RULES.rowsAt.entries()) {
    const row = idx + 1
    assert.equal(talentsOf('cleric', row).length, 3, `Cleric talent row ${row} has 3 choices`)
    const picked = talentsOf('cleric', row)[0]!
    assert.equal(talentMods({ [String(row)]: { id: picked.id, rank: 2 } }, 'cleric', lvReq - 1).length, 0)
    assert.equal(talentMods({ [String(row)]: { id: picked.id, rank: 2 } }, 'cleric', lvReq).length, 1)
  }

  // All 12 Crusader & 12 Monk talents row-gate cleanly via talents2Of / talent2Mods / talentEarned
  assert.equal(talentEarned(40), 8)
  for (const [idx, lvReq] of TALENT_RULES.rowsAt.entries()) {
    const row = idx + 1
    assert.equal(talents2Of('crusader', row).length, 3)
    assert.equal(talents2Of('monk', row).length, 3)
    const cruPick = talents2Of('crusader', row)[0]!
    assert.equal(talent2Mods({ [String(row)]: { id: cruPick.id, rank: 2 } }, 'crusader', lvReq - 1).length, 0)
    assert.equal(talent2Mods({ [String(row)]: { id: cruPick.id, rank: 2 } }, 'crusader', lvReq).length, 1)
  }
  assert.ok(tree2Mods({ crusader_s3p: 5, cr_h1: 5 }, 'crusader').length === 2)

  const stAll = heroStats(
    makeInput({
      jobLevel: 40,
      jobTalents: {
        '1': { id: 'cleric_t1_ward', rank: 2 },
        '2': { id: 'cleric_t2_holy', rank: 2 },
        '3': { id: 'cleric_t3_vamp', rank: 2 },
        '4': { id: 'cleric_t4_angel', rank: 2 },
      },
    }),
  )
  near(stAll.bossShield, 0.2)
  near(stAll.ultHoly, 1.6)
  near(stAll.smiteVamp, 0.1)
  assert.equal(stAll.revive, 1)
  near(stAll.reviveHp, 0.4)
})

test('Tier 1 — [Post-M2] cleric_t3_miracle enables S1/Ult skill crits under CRIT_RULES & hitText matches combat', () => {
  const stMiracle = heroStats(
    makeInput({
      jobLevel: 30,
      jobTalents: { '3': { id: 'cleric_t3_miracle', rank: 2 } },
    }),
  )
  assert.ok(
    stMiracle.skillCrit > 0,
    `cleric_t3_miracle must grant skillCrit > 0 under CRIT_RULES (got skillCrit=${stMiracle.skillCrit}, spellCrit=${stMiracle.spellCrit})`,
  )
  const smiteText = hitText(stMiracle, CLERIC_KIT.smite, true, true)
  assert.ok(smiteText.includes('คริ'), `expected S1 Holy Light skill hitText to allow crits: "${smiteText}"`)
})

test('Tier 1 — Crusader (Holy Cross, cr_h1, Grand Cross, Auto Guard, cr_c/s/d/u, cr_t1..t4)', () => {
  // Weapon mastery (mace/sword) + Tank bulk
  const stSword = heroStats(makeInput({ job2: 'crusader', job2Level: 50, equipped: { weapon: 'c_paladinblade' } }))
  const stBare = heroStats(makeInput({ job2: 'crusader', job2Level: 50, equipped: {} }))
  assert.ok(stSword.def >= stBare.def + JOB2.crusader.mastery.mod.def!)
  assert.equal(tankBulk('cleric', 'crusader')?.vitHp, TANK_BULK.crusader?.vitHp)

  // Auto Guard scaling + cr_h1 VIT stack + Grand Cross nodes + talents
  const stCru = heroStats(
    makeInput({
      job2: 'crusader',
      job2Level: 50,
      job2Tree: {
        crusader_s3p: 1,
        cr_h1: 5,
        crusader_u2p: 5,
        cr_u1: 5,
        cr_u2: 5,
        cr_u3: 5,
        cr_c1: 5,
        cr_c2: 5,
        cr_c3: 4,
        cr_c4: 1,
        cr_s1: 5,
        cr_s2: 5,
        cr_s3: 5,
        cr_d1: 5,
        cr_d2: 5,
        cr_d3: 5,
        cr_d4: 1,
      },
      job2Talents: {
        '1': { id: 'cr_t1_guard', rank: 2 },
        '2': { id: 'cr_t2_ult', rank: 2 },
        '3': { id: 'cr_t3_cross', rank: 2 },
        '4': { id: 'cr_t4_reflect', rank: 2 },
      },
    }),
  )
  assert.equal(stCru.j2HcVit, 25)
  assert.equal(gcPulses(stCru), 4)
  assert.equal(stCru.j2GcTwice, 1)
  near(stCru.j2CrossAdd, 0.3)
  near(stCru.j2PayCut, 0.3)
  assert.equal(stCru.j2BlindAdd, 2)
  near(stCru.j2ShieldBoom, 1.8)
  near(stCru.j2Reflect, 0.15 + 0.07)
  near(stCru.j2GcAngel, 0.05)
  near(stCru.j2GcShield, 0.03)
  near(stCru.j2GcGuard, 0.09)
  assert.equal(stCru.j2Martyr, 1)
  near(stCru.ult2Pow, 0.6 + 0.25)
  near(stCru.s3Pow, 0.12 + 0.25)
})

test('Tier 1 — Paladin (Prestige, Gospel Cross, Shield Chain, Pressure, pa_l/g/r, pure vs hybrid)', () => {
  const cruTree = { cr_c1: 5, cr_c2: 3, cr_s1: 5, cr_s2: 3, cr_d1: 5, cr_d2: 3 } // 8 pts per branch
  const palTree = {
    paladin_u3p: 5,
    pa_l1: 3,
    pa_l2: 3,
    pa_l3: 3,
    pa_l4: 1,
    pa_g1: 3,
    pa_g2: 3,
    pa_g3: 2,
    pa_g4: 1,
    pa_r1: 3,
    pa_r2: 3,
    pa_r3: 3,
    pa_r4: 1,
  }
  const stPalA = heroStats(
    makeInput({
      job2: 'crusader',
      job2Level: 50,
      job3: 'paladin',
      job3Level: 30,
      job3Path: 'pure',
      job3Var: 'a',
      job2Tree: cruTree,
      job3Tree: palTree,
    }),
  )
  assert.equal(stPalA.j3On, 1)
  assert.equal(gcPulses(stPalA), 4) // base Lv0 (2) + Gospel (+1) + pa_g4 (+1)
  near(stPalA.u3Pow, 0.6)
  near(stPalA.j3GospelHeal, 0.03)
  near(stPalA.j3AfterBless, 0.15)
  assert.equal(stPalA.j3GospelFaith, 2)
  assert.equal(stPalA.j3Heir, 1)
  near(stPalA.j3Press, 0.9) // pa_r1 Lv3 (0.3 * 3)
  near(stPalA.j3Banding, 0.06) // pa_r2 Lv3 (0.02 * 3)
  near(stPalA.j3EarthDrive, 1.2) // pa_r3 Lv3 (0.4 * 3)
  assert.equal(stPalA.j3Inspire, 1) // pa_r4 Lv1
  near(stPalA.j3VarMul, Math.min(KIT3.paladin.varA.cap, 8 * KIT3.paladin.varA.per))
  // Legacy crossCap: cr_c1 Lv5 (0.30) + pa_l1 Lv3 (8 pts * 0.015 = 0.12) = 0.42
  near(stPalA.j2CrossAdd, 0.3 + 0.12)

  // Variant B (Pressure)
  const stPalB = heroStats(
    makeInput({
      job2: 'crusader',
      job2Level: 50,
      job3: 'paladin',
      job3Level: 30,
      job3Path: 'pure',
      job3Var: 'b',
      job2Tree: { cr_d1: 5, cr_d2: 5 }, // 10 pts in cr_d
      job3Tree: { paladin_u3p: 1 },
    }),
  )
  near(stPalB.j3VarMul, 0.2)

  // Hybrid Paladin borrows Monk tier 1-2 only, blocked from Paladin tier 3
  const hybridNodes = { mk_c1: 5, mk_c2: 5, mk_h1: 5, mk_h2: 5, pa_g3: 2 }
  const mods = tree3Mods(hybridNodes, 'paladin', 'hybrid')
  assert.equal(mods.length, 4) // 4 Monk nodes; pa_g3 (tier 3) ignored
  assert.ok(lockReason3({ mk_c1: 5, pa_g3: 1 }, 'cleric', nodeById('pa_g3')!, 'paladin', 'hybrid').includes('Hybrid'))
})

test('Tier 1 — Monk (Falling Thunder, Combo Thunder, Tempest Bell, Asura, Haymaker, mk_*, mk_t1..t4)', () => {
  const stMonk = heroStats(
    makeInput({
      job2: 'monk',
      job2Level: 50,
      equipped: { weapon: 'c_vajraknuckle' },
      job2Tree: {
        monk_s3p: 5,
        mk_s1: 5,
        mk_s2: 1,
        monk_u2p: 5,
        mk_u1: 5,
        mk_c1: 5,
        mk_c2: 5,
        mk_c3: 4,
        mk_c4: 1,
        mk_h1: 5,
        mk_h2: 5,
        mk_h3: 5,
        mk_h4: 1,
        mk_a1: 5,
        mk_a2: 5,
        mk_a3: 5,
        mk_a4: 1,
      },
      job2Talents: {
        '1': { id: 'mk_t1_combo', rank: 2 },
        '2': { id: 'mk_t2_ult', rank: 2 },
        '3': { id: 'mk_t3_per', rank: 2 },
        '4': { id: 'mk_t4_chill', rank: 2 },
      },
    }),
  )

  near(stMonk.s3Pow, 0.6)
  near(stMonk.j2ThunderAtk, 0.75)
  assert.equal(stMonk.j2ComboThunder, 1)
  near(stMonk.j2BellMdef, 1.2)
  assert.equal(stMonk.comboCount, 1)
  assert.equal(stMonk.j2ComboFinish, 1)
  assert.equal(stMonk.j2HaymakerStar, 1)
  assert.equal(stMonk.j2Asura, 1)
  assert.equal(stMonk.j2ChargeMax, 4) // mk_c3 (2) + c_vajraknuckle (2) = 4
  assert.ok(bellMdefMul(stMonk) > 1)

  const bellNoWis = makeAlly(ALLIES.tempestBell, stMonk)
  const stWithWis = { ...stMonk, wis: 120 }
  const bellWithWis = makeAlly(ALLIES.tempestBell, stWithWis)
  assert.ok(bellWithWis.maxHp > bellNoWis.maxHp, 'ALLIES.tempestBell.hp must scale strictly higher when wis > 0')
  const expectedBellWithWisHp = Math.max(
    1,
    Math.round(stWithWis.maxHp * (KIT2.monk.bellHp + stWithWis.wis * KIT2.monk.bellWis) * bellMdefMul(stWithWis)),
  )
  assert.equal(bellNoWis.maxHp, Math.max(1, Math.round(ALLIES.tempestBell.hp(stMonk))))
  assert.equal(bellWithWis.maxHp, expectedBellWithWisHp)

  const grit = Math.round(stMonk.maxHp * 0.4)
  const hay = haymakerCalc(stMonk, grit)
  assert.equal(hay.star, true)
  assert.ok(hay.centerTrueDmg > 0 && hay.splashTrueDmg > 0 && hay.shield >= hay.rawShield)

  const asuraLo = asuraDamage(stMonk, 3, 50, 1)
  const asuraHi = asuraDamage(stMonk, 7, stMonk.maxRes, 1.5)
  assert.ok(asuraHi > asuraLo)
})

test('Tier 1 — [Post-M3] BattleScene Monk ult2() invokes clericUltExtras() on Asura & Tempest Bell paths', () => {
  const src = battleSceneSrc()
  const ult2Body = extractBlock(src, /\bprivate\s+async\s+ult2\b/)
  assert.ok(ult2Body.length > 0, 'must locate ult2() in BattleScene.ts')

  // Locate Monk branch inside ult2() (either inline `if (this.j2!.id === 'monk') { ... }` or single-statement delegation)
  let monkInUlt2 = extractBlock(ult2Body, /\bif\s*(?=\(\s*this\.j2[?!]?\.id\s*===\s*'monk'\s*\))/)
  if (!monkInUlt2) {
    const lineMatch = /if\s*\(\s*this\.j2[?!]?\.id\s*===\s*'monk'\s*\)[^\n]+/.exec(ult2Body)
    monkInUlt2 = lineMatch ? lineMatch[0] : ''
  }
  assert.ok(monkInUlt2.length > 0, 'must locate Monk branch inside ult2()')
  const cleanUlt2Monk = stripComments(monkInUlt2)

  // Check if Monk logic is delegated to a BattleScene helper method (e.g. `this.monkUlt(...)`)
  let monkCode = cleanUlt2Monk
  let ult2CallsExtrasAfterHelper = false
  if (!/ALLIES\.tempestBell/.test(cleanUlt2Monk)) {
    const helperCalls = [...cleanUlt2Monk.matchAll(/\bthis\.([A-Za-z0-9_]+)\s*\(/g)]
      .map((m) => m[1]!)
      .filter((name) => name !== 'clericUltExtras')
    for (const helper of helperCalls) {
      const candidate = extractBlock(src, new RegExp(`\\b(?:private\\s+)?(?:async\\s+)?${helper}\\b`))
      if (candidate && /ALLIES\.tempestBell/.test(candidate) && /j2Asura/.test(candidate)) {
        monkCode = stripComments(candidate)
        const helperIdx = cleanUlt2Monk.indexOf(`this.${helper}(`)
        const extrasIdx = cleanUlt2Monk.indexOf('clericUltExtras(')
        ult2CallsExtrasAfterHelper = extrasIdx > helperIdx
        break
      }
    }
  }

  const asuraBlock = extractBlock(monkCode, /\bif\s*(?=\(\s*this\.st\.j2Asura\s*>\s*0\s*\))/)
  const asuraIdx = monkCode.search(/\bif\s*\(\s*this\.st\.j2Asura\s*>\s*0\s*\)/)
  const bellIdx = monkCode.indexOf('ALLIES.tempestBell')
  assert.ok(asuraBlock.length > 0 && asuraIdx >= 0 && bellIdx > asuraIdx, 'must locate both Asura and Tempest Bell paths')

  const afterAsura = monkCode.slice(asuraIdx + asuraBlock.length)
  // Top-level return at the end of asuraBlock (inner null-guards like `if (!t) return` inside if(t) are allowed)
  const asuraEndsWithReturn = /(?:^|[;{}\r\n])\s*return(?:\s+[^;{}\r\n]*)?;?\s*\}$/.test(asuraBlock.trim())
  const asuraHasExtras = /clericUltExtras\s*\(/.test(asuraBlock)
  const bellHasExtras = /clericUltExtras\s*\(/.test(afterAsura)
  const trailingAfterBell =
    !asuraEndsWithReturn &&
    afterAsura.lastIndexOf('clericUltExtras(') > Math.max(afterAsura.lastIndexOf('spawnAlly('), afterAsura.lastIndexOf('ALLIES.tempestBell'))

  const valid =
    ult2CallsExtrasAfterHelper ||
    (asuraHasExtras && bellHasExtras) ||
    trailingAfterBell
  assert.ok(
    valid,
    `Monk ult2() must invoke clericUltExtras() on both Asura Strike and Tempest Bell paths (calls in Monk block: ${(monkCode.match(/clericUltExtras\s*\(/g) ?? []).length})`,
  )
})

test('Tier 1 — Champion (Supreme Asura, Tiger Knuckle, Chain Crush, Ki Translation, ch_l/g/r)', () => {
  const monkTree = { mk_c1: 5, mk_c2: 5, mk_h1: 5, mk_h2: 5, mk_a1: 5, mk_a2: 5 }
  const champTree = {
    champion_u3p: 5,
    ch_l1: 3,
    ch_l2: 3,
    ch_l3: 3,
    ch_l4: 1,
    ch_g1: 3,
    ch_g2: 3,
    ch_g3: 2,
    ch_g4: 1,
    ch_r1: 3,
    ch_r2: 3,
    ch_r3: 3,
    ch_r4: 1,
  }
  const stChA = heroStats(
    makeInput({
      job2: 'monk',
      job2Level: 50,
      job3: 'champion',
      job3Level: 30,
      job3Path: 'pure',
      job3Var: 'a',
      job2Tree: monkTree,
      job3Tree: champTree,
    }),
  )
  assert.equal(stChA.j3Ch, 1)
  assert.equal(stChA.j2ChargeMax, KIT3.champion.chargeMaxAdd)
  near(stChA.u3Pow, 0.6) // champion_u3p (0.6)
  assert.ok(stChA.ult2Pow >= 0.15) // ch_l1 cap (0.15) adds to ult2Pow
  near(stChA.j2Guard, 0.06) // ch_l2 cap
  near(stChA.j3GospelHeal, 0.03)
  near(stChA.j3AfterBless, 0.15)
  near(stChA.j2Spiral, 0.2)
  assert.equal(stChA.j3GospelField, 1)
  near(stChA.j2Charge, 0.6)
  near(stChA.j3Banding, 0.06)
  near(stChA.j3EarthDrive, 2.4)
  assert.equal(stChA.j3Inspire, 1)
  near(stChA.j3VarMul, 0.2) // 10 pts in mk_c * 0.02 = 0.2 cap

  const stChB = heroStats(
    makeInput({
      job2: 'monk',
      job2Level: 50,
      job3: 'champion',
      job3Level: 30,
      job3Path: 'pure',
      job3Var: 'b',
      job2Tree: monkTree,
      job3Tree: { champion_u3p: 1 },
    }),
  )
  near(stChB.j3VarMul, 0.2) // 10 pts in mk_h * 0.02 = 0.2 cap

  // Hybrid Champion borrows Crusader tier 1-2
  const hybMods = tree3Mods({ cr_s1: 5, cr_d1: 5, ch_r3: 3 }, 'champion', 'hybrid')
  assert.equal(hybMods.length, 2)
})

test('Tier 1 — [Post-M3] BattleScene championVariant() scales with spent charges, j2ThunderPer, and mk_s1 (j2ThunderAtk)', () => {
  const src = battleSceneSrc()
  const body = stripComments(extractBlock(src, /\bprivate\s+async\s+championVariant\b/))
  assert.ok(body.length > 0, 'must locate championVariant() in BattleScene.ts')
  assert.ok(/\bthis\.charges\b/.test(body) && /\bthis\.addCharges\s*\(/.test(body), 'championVariant() must consume this.charges')

  // Gather any pure helpers imported from ../data/skill-math and called in championVariant()
  const smImports = [...src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/data\/skill-math['"]/g)]
  const importedEntries = smImports
    .flatMap((m) => m[1]!.split(','))
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^type\s+/.test(s))
    .map((s) => {
      const [exportedRaw, localRaw] = s.split(/\s+as\s+/)
      const exportedName = exportedRaw!.trim()
      const localName = (localRaw ?? exportedRaw!).trim()
      return { exportedName, localName }
    })
    .filter(
      ({ exportedName }) =>
        exportedName.length > 0 && typeof (skillMath as Record<string, unknown>)[exportedName] === 'function',
    )
  const calledSmHelpers = Array.from(
    new Set(
      importedEntries
        .filter(
          ({ exportedName, localName }) =>
            new RegExp(`(?<!\\.)\\b${localName}\\s*\\(`).test(body) ||
            new RegExp(`(?<!\\.)\\b${exportedName}\\s*\\(`).test(body),
        )
        .map(({ exportedName }) => exportedName),
    ),
  )
  const smSrc = skillMathSrc()
  const helperBodies = calledSmHelpers.map((name) => stripComments(extractSkillMathFn(smSrc, name))).filter(Boolean)
  const combined = [body, ...helperBodies].join('\n')

  assert.match(combined, /j2ThunderPer/, 'championVariant() (inline or skill-math helper) must scale with j2ThunderPer')
  assert.match(
    combined,
    /(j2ThunderAtk|thunderAtkAdd)/,
    'championVariant() (inline or skill-math helper) must include mk_s1 j2ThunderAtk / thunderAtkAdd()',
  )

  // Verify spent charges actually participate in damage/multiplier math (not merely drained and formatted in floatText)
  const chargeVarNames = [...body.matchAll(/\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*this\.charges\b/g)].map((m) => m[1]!)
  const bodyWithoutDrainAndText = body
    .replace(/`[^`]*`/g, '""')
    .replace(/this\.addCharges\s*\([^)]*\)/g, '')
    .replace(/this\.floatText\s*\([^)]*\)/g, '')
    .replace(/\b(?:const|let)\s+[A-Za-z_$][\w$]*\s*=\s*this\.charges\b/g, '')
  const inlineUsesChargesInMath =
    /\bthis\.charges\b/.test(bodyWithoutDrainAndText) ||
    chargeVarNames.some((v) => new RegExp(`\\b${v}\\b`).test(bodyWithoutDrainAndText))
  const helperScalesWithParam = helperBodies.some((hb) => /\*/.test(hb) && /j2ThunderPer/.test(hb))
  assert.ok(
    inlineUsesChargesInMath || helperScalesWithParam,
    'championVariant() must use spent charges in damage scaling (not only drain charges and print floatText)',
  )
})

test('Tier 1 — Skill Registry (SKILL_LAYOUT.cleric, job2Layout crusader/monk, skillRoot)', () => {
  const cl = SKILL_LAYOUT.cleric
  assert.ok(cl.s1.length >= 5)
  assert.deepEqual(
    cl.s2.map((x) => x.id),
    ['cl_renew', 'cl_bless', 'cl_spear'],
  )
  assert.ok(cl.ult.length >= 7)
  assert.ok((cl.tree?.length ?? 0) >= 15)

  const cru = job2Layout('crusader')
  const mnk = job2Layout('monk')
  assert.ok(cru.s3.some((r) => r.path === 'kit2.crusader.crossMul'))
  assert.ok(cru.ult.some((r) => r.path === 'kit2.crusader.gcPm'))
  assert.ok(mnk.s3.some((r) => r.path === 'kit2.monk.thunderPm'))
  assert.ok(mnk.ult.some((r) => r.path === 'kit2.monk.asuraAtk'))

  // J2_LABEL non-empty localized labels across all Crusader & Monk layout refs
  const cruRefs = [...cru.s3, ...cru.ult, ...cru.other]
  const mnkRefs = [...mnk.s3, ...mnk.ult, ...mnk.other]
  for (const r of [...cruRefs, ...mnkRefs]) {
    assert.ok(r.label.trim().length > 0, `J2_LABEL must provide non-empty label for ${r.path}`)
  }
  for (const keyPath of [
    'kit2.crusader.crossMul',
    'kit2.crusader.gcPm',
    'kit2.monk.thunderPm',
    'kit2.monk.asuraAtk',
  ]) {
    const found = [...cruRefs, ...mnkRefs].find((r) => r.path === keyPath)
    const rawKey = keyPath.split('.').slice(2).join('.')
    assert.ok(found && found.label !== rawKey, `expected localized J2_LABEL for ${keyPath}, got "${found?.label}"`)
  }

  const root = skillRoot() as { kit3?: Record<string, unknown>; kit2?: Record<string, unknown> }
  assert.ok(root.kit2 && 'crusader' in root.kit2 && 'monk' in root.kit2)
  assert.ok(root.kit3 && 'paladin' in root.kit3 && 'champion' in root.kit3)
})

test('Tier 1 — [Post-M3] J3_OF registers crusader -> paladin and monk -> champion exposing kit3 fields', () => {
  const j3map = J3_OF as Partial<Record<Job2Id, Job3Id>>
  assert.equal(j3map.crusader, 'paladin', 'J3_OF.crusader must be registered as paladin')
  assert.equal(j3map.monk, 'champion', 'J3_OF.monk must be registered as champion')
  assert.ok(job2Layout('crusader').j3.some((r) => r.path.startsWith('kit3.paladin.')))
  assert.ok(job2Layout('monk').j3.some((r) => r.path.startsWith('kit3.champion.')))
  const paths = new Set(skillTableFields().map(([p]) => p))
  assert.ok(paths.has('kit3.paladin.varA.atk') || [...paths].some((p) => p.startsWith('kit3.paladin.')))
  assert.ok([...paths].some((p) => p.startsWith('kit3.champion.')))
})

test('Tier 1 — UI Descriptions vs Actual Combat Data (autoInfo, skill2Info, ultInfo, dawnInfo)', () => {
  const st = heroStats(
    makeInput({
      jobTree: { cleric_s1p: 5, cleric_ultp: 5, cl_spear: 1, cl_spear_p: 5, cl_spear_x: 1, cleric_dn1: 5, cleric_dn3: 3 },
    }),
  )
  const autoRows = autoInfo('cleric', st)
  assert.equal(autoRows[0]?.value, `Mana ${autoCost(JOBS.cleric, st)}`)
  assert.ok(autoRows.some((r) => r.label.includes('ฮีล') && r.value.includes(`${Math.round(st.matk * CLERIC_KIT.heal * (1 + st.s1Pow) * (1 + st.healAmp))}`)))

  const spearRows = skill2Info(skill2ById('cl_spear')!, st)
  assert.ok(spearRows[1]?.label.includes(`หอกแสง ${S2N.spearCount(true)} เล่ม`))

  const ultCru = ultInfo('cleric', heroStats(makeInput({ job2: 'crusader', job2Level: 50, job2Tree: { crusader_u2p: 4 } })), { str: 40, wis: 55 }, 'crusader')
  assert.ok(ultCru.some((r) => r.label.includes('ใส่ทุกตัว') && r.value === '4 ครั้ง'))

  const dRows = dawnInfo(st, { str: 40, wis: 55 })
  assert.ok(dRows.some((r) => r.label.includes('แสงแตก') && r.value.includes(`+${dawnWisGain(st, dawnBonus(st, 40, 55))} WIS`)))

  const s2Bless = skill2ById('cl_bless')!
  assert.ok(s2Bless.desc.includes(`+${S2N.blessStat}`))
  assert.ok(s2Bless.star.desc.includes(`+${S2N.gloriaLuk}`))
})

test('Tier 1 — [Post-M3] skill-math exports skill3Info and ultInfo matches Paladin Gospel Cross, Champion Supreme Asura & Tempest Bell WIS HP', () => {
  type InfoRowLike = { label: string; value: string }
  type Skill3InfoFn = (job2: Job2Id, st: ReturnType<typeof heroStats>) => InfoRowLike[]
  const fnKey = ['skill3', 'Info'].join('')
  const fn = (skillMath as Record<string, unknown>)[fnKey] as Skill3InfoFn | undefined
  assert.equal(typeof fn, 'function', 'skill-math.ts must export skill3Info helper')

  const stCru0 = heroStats(makeInput({ job2: 'crusader', job2Level: 50, job2Tree: { crusader_s3p: 1 } }))
  const stCruBoost = heroStats(makeInput({ job2: 'crusader', job2Level: 50, job2Tree: { crusader_s3p: 5, cr_c1: 5 } }))
  const stPal = heroStats(
    makeInput({
      job2: 'crusader',
      job2Level: 50,
      job3: 'paladin',
      job3Level: 30,
      job2Tree: { crusader_s3p: 5, cr_s1: 5, cr_s2: 5 },
      job3Tree: { paladin_u3p: 3, pa_g1: 3, pa_g2: 3, pa_g3: 2, pa_g4: 1 },
    }),
  )
  const stMonk0 = heroStats(makeInput({ job2: 'monk', job2Level: 50, job2Tree: { monk_s3p: 1 } }))
  const stMonkBoost = heroStats(makeInput({ job2: 'monk', job2Level: 50, job2Tree: { monk_s3p: 5, mk_s1: 5 } }))
  const stChamp = heroStats(
    makeInput({
      job2: 'monk',
      job2Level: 50,
      job3: 'champion',
      job3Level: 30,
      job2Tree: { monk_s3p: 5, mk_c1: 5, mk_c2: 5, mk_a4: 1 },
      job3Tree: { champion_u3p: 3, ch_g1: 3, ch_g2: 3, ch_g4: 1 },
    }),
  )

  if (typeof fn === 'function') {
    for (const [j2, st] of [
      ['crusader', stCru0],
      ['crusader', stPal],
      ['monk', stMonk0],
      ['monk', stChamp],
    ] as const) {
      const rows = fn(j2, st)
      assert.ok(Array.isArray(rows) && rows.length > 0, `skill3Info('${j2}', ...) must return non-empty InfoRow[]`)
      assert.ok(rows.every((r) => typeof r.label === 'string' && typeof r.value === 'string' && r.label.length > 0))
    }
    assert.notDeepEqual(fn('crusader', stCruBoost), fn('crusader', stCru0), 'skill3Info(crusader) must reflect KIT2/s3Pow multipliers')
    assert.notDeepEqual(fn('monk', stMonkBoost), fn('monk', stMonk0), 'skill3Info(monk) must reflect KIT2/mk_s1 multipliers')
    assert.notDeepEqual(fn('crusader', stPal), fn('crusader', stCru0), 'skill3Info(paladin) must reflect KIT3.paladin multipliers')
    assert.notDeepEqual(fn('monk', stChamp), fn('monk', stMonk0), 'skill3Info(champion) must reflect KIT3.champion multipliers')
  }

  // Tempest Bell HP in ultInfo must include bellWis * st.wis matching ALLIES.tempestBell.hp (non-vacuous WIS > 0)
  const stBell = heroStats(makeInput({ job2: 'monk', job2Level: 50, stats: { ...DEFAULT_STATS, wis: 120 }, job2Tree: { monk_u2p: 2, mk_u1: 5 } }))
  const stWithWis = { ...stBell, wis: 120 }
  assert.ok(ALLIES.tempestBell.hp(stWithWis) > ALLIES.tempestBell.hp(stBell), 'ALLIES.tempestBell.hp must increase when wis > 0')
  const expectedHp = Math.round(ALLIES.tempestBell.hp(stWithWis))
  const bellRows = ultInfo('cleric', stWithWis, { str: 40, wis: 120 }, 'monk')
  const bellHpRow = bellRows.find((r) => r.label.includes('HP ระฆัง'))
  assert.ok(
    bellHpRow && bellHpRow.value.includes(String(expectedHp)),
    `ultInfo Tempest Bell HP "${bellHpRow?.value}" must match ALLIES.tempestBell.hp (${expectedHp}) with WIS scaling`,
  )

  // Paladin Gospel Cross rows in ultInfo (numeric / key mechanics check without brittle exact-phrase coupling)
  const palRows = ultInfo('cleric', stPal, { str: 40, wis: 55 }, 'crusader')
  const stCruSamePulses = heroStats(makeInput({ job2: 'crusader', job2Level: 50, job2Tree: { crusader_s3p: 5, cr_s1: 5, cr_s2: 5 } }))
  const cruRows = ultInfo('cleric', stCruSamePulses, { str: 40, wis: 55 }, 'crusader')
  const palText = palRows.map((r) => `${r.label} ${r.value}`).join(' ')
  assert.ok(
    /Gospel|พระวรสาร|พรหลังศึก/i.test(palText) && JSON.stringify(palRows) !== JSON.stringify(cruRows),
    'ultInfo for Paladin must reflect Gospel Cross / u3Pow / pa_g* mechanics',
  )

  // Champion Supreme Asura rows in ultInfo (numeric / key mechanics check without brittle exact-phrase coupling)
  const champRows = ultInfo('cleric', stChamp, { str: 40, wis: 55 }, 'monk')
  const stMonkAsura = heroStats(makeInput({ job2: 'monk', job2Level: 50, job2Tree: { monk_s3p: 5, mk_c1: 5, mk_c2: 5, mk_a4: 1 } }))
  const monkRows = ultInfo('cleric', stMonkAsura, { str: 40, wis: 55 }, 'monk')
  const champText = champRows.map((r) => `${r.label} ${r.value}`).join(' ')
  assert.ok(
    /Supreme|ช็อกเวฟ|คลื่น|shockwave|พรหลังศึก/i.test(champText) && JSON.stringify(champRows) !== JSON.stringify(monkRows),
    'ultInfo for Champion must reflect Supreme Asura shockwave / u3Pow / ch_g* mechanics',
  )
})

test('Tier 1 — Save-Data ID Preservation across Cleric, Crusader, Paladin, Monk, Champion (no duplicates, exact sets)', () => {
  const clericWebIds = branchesOf('cleric').flatMap((b) => nodesOf(b.id)).map((n) => n.id).sort()
  const expectedClericWeb = [
    'cl_bless', 'cl_bless_p', 'cl_bless_x',
    'cl_renew', 'cl_renew_p', 'cl_renew_x',
    'cl_spear', 'cl_spear_p', 'cl_spear_x',
    'cleric_a1', 'cleric_a2', 'cleric_a3t', 'cleric_a4x',
    'cleric_b1', 'cleric_b2', 'cleric_b3s', 'cleric_b4j',
    'cleric_c1', 'cleric_c2', 'cleric_c3', 'cleric_c4',
    'cleric_core1', 'cleric_core2', 'cleric_core3',
    'cleric_dn1', 'cleric_dn2', 'cleric_dn3', 'cleric_dn4',
    'cleric_s1p', 'cleric_ultp',
  ].sort()
  assert.deepEqual(clericWebIds, expectedClericWeb)

  const clericTalentIds = [1, 2, 3, 4].flatMap((r) => talentsOf('cleric', r)).map((t) => t.id).sort()
  assert.deepEqual(clericTalentIds, [
    'cleric_t1_focus', 'cleric_t1_spear', 'cleric_t1_ward',
    'cleric_t2_holy', 'cleric_t2_regen', 'cleric_t2_wing',
    'cleric_t3_miracle', 'cleric_t3_spear', 'cleric_t3_vamp',
    'cleric_t4_angel', 'cleric_t4_dawn', 'cleric_t4_spear',
  ])

  const crusaderWebIds = branches2Of('crusader').flatMap((b) => nodesOf(b.id)).map((n) => n.id).sort()
  assert.deepEqual(crusaderWebIds, [
    'cr_c1', 'cr_c2', 'cr_c3', 'cr_c4',
    'cr_d1', 'cr_d2', 'cr_d3', 'cr_d4',
    'cr_h1',
    'cr_s1', 'cr_s2', 'cr_s3', 'cr_s4',
    'cr_u1', 'cr_u2', 'cr_u3',
    'crusader_s3p', 'crusader_u2p',
  ])

  const paladinWebIds = branches3Of('paladin').flatMap((b) => nodesOf(b.id)).map((n) => n.id).sort()
  assert.deepEqual(paladinWebIds, [
    'pa_g1', 'pa_g2', 'pa_g3', 'pa_g4',
    'pa_l1', 'pa_l2', 'pa_l3', 'pa_l4',
    'pa_r1', 'pa_r2', 'pa_r3', 'pa_r4',
    'paladin_u3p',
  ])

  const monkWebIds = branches2Of('monk').flatMap((b) => nodesOf(b.id)).map((n) => n.id).sort()
  assert.deepEqual(monkWebIds, [
    'mk_a1', 'mk_a2', 'mk_a3', 'mk_a4',
    'mk_c1', 'mk_c2', 'mk_c3', 'mk_c4',
    'mk_h1', 'mk_h2', 'mk_h3', 'mk_h4',
    'mk_s1', 'mk_s2',
    'mk_u1',
    'monk_s3p', 'monk_u2p',
  ])

  const championWebIds = branches3Of('champion').flatMap((b) => nodesOf(b.id)).map((n) => n.id).sort()
  assert.deepEqual(championWebIds, [
    'ch_g1', 'ch_g2', 'ch_g3', 'ch_g4',
    'ch_l1', 'ch_l2', 'ch_l3', 'ch_l4',
    'ch_r1', 'ch_r2', 'ch_r3', 'ch_r4',
    'champion_u3p',
  ])

  // Global uniqueness across TREE / TREE2 / TREE3
  const allIds = [...TREE, ...TREE2, ...TREE3].map((n) => n.id)
  assert.equal(new Set(allIds).size, allIds.length, 'zero duplicate node IDs across all trees')
  assert.equal(new Set(SKILL2.map((s) => s.id)).size, SKILL2.length)
  assert.ok(BRANCHES.length > 0 && BRANCHES2.length > 0 && BRANCHES3.length > 0)

  // Save/load round-trip preserves every Cleric/Job2/Job3 node ID
  withCleanSave(() => {
    const s = newSave('id_keep', 'human')
    s.job = 'cleric'
    s.jobLevel = 40
    s.job2 = 'crusader'
    s.job2Level = 50
    s.job3 = 'paladin'
    s.job3Level = 20
    s.jobTree = { cleric_s1p: 10, cl_bless: 1, cl_bless_p: 8, cl_bless_x: 1, cleric_dn3: 3 }
    s.job2Tree = { crusader_s3p: 5, cr_h1: 5, cr_c4: 1 }
    s.job3Tree = { paladin_u3p: 5, pa_g4: 1 }
    setSave(s)
    wipe() // clear memory cache only? No, wipe removes storage; instead test adopt() round-trip
    assert.equal(adopt(JSON.parse(JSON.stringify(s))), true)
    const loaded = load()!
    assert.deepEqual(loaded.jobTree, s.jobTree)
    assert.deepEqual(loaded.job2Tree, s.job2Tree)
    assert.deepEqual(loaded.job3Tree, s.job3Tree)
  })
})

// =====================================================================
// TIER 2: BOUNDARY & CORNER CASES (>= 5 cases per boundary group)
// =====================================================================

test('Tier 2 — Mana & Ult Cost Boundaries (0/insufficient Mana gating, autoCost floor, Cleric 30 vs Crusader/Monk 0-cost)', () => {
  const stZeroCut = heroStats(makeInput({}))
  const stBigCut = heroStats(makeInput({}))
  stBigCut.autoCostCut = 999
  assert.equal(autoCost(JOBS.cleric, stZeroCut), 25)
  assert.equal(autoCost(JOBS.cleric, stBigCut), 10) // floor 10 for Cleric S1
  assert.equal(ultCost(JOBS.cleric, stZeroCut), CLERIC_KIT.ultMana)
  const cruUltCost = ultCost({ ...JOBS.cleric, ult: { ...JOBS.cleric.ult, ...JOB2.crusader.ult } }, stZeroCut)
  const monkUltCost = ultCost({ ...JOBS.cleric, ult: { ...JOBS.cleric.ult, ...JOB2.monk.ult } }, stZeroCut)
  assert.equal(cruUltCost, 0)
  assert.equal(monkUltCost, 0)

  // 0 / insufficient Mana cast gating
  const zeroMana = 0
  assert.equal(zeroMana >= autoCost(JOBS.cleric, stZeroCut), false, '0 mana cannot cast Cleric S1 (25)')
  assert.equal(zeroMana >= autoCost(JOBS.cleric, stBigCut), false, '0 mana cannot cast Cleric S1 even at 10-mana floor')
  assert.equal(zeroMana >= ultCost(JOBS.cleric, stZeroCut), false, '0 mana cannot cast Cleric Ult (30)')
  assert.equal(29 >= ultCost(JOBS.cleric, stZeroCut), false, '29 mana < 30 cannot cast Cleric Ult')
  assert.equal(zeroMana >= cruUltCost, true, '0 mana can cast 0-cost Crusader Grand Cross')
  assert.equal(zeroMana >= monkUltCost, true, '0 mana can cast 0-cost Monk Ult')

  const spearCost = skill2ById('cl_spear')!.cost
  const blessCost = skill2ById('cl_bless')!.cost
  const renewCost = skill2ById('cl_renew')!.cost
  assert.equal(spearCost, 20)
  assert.equal(blessCost, 30)
  assert.equal(renewCost, 25) // M2: 40 -> 25
  assert.equal(zeroMana >= spearCost, false)
  assert.equal(spearCost - 1 >= spearCost, false)
  assert.equal(blessCost - 1 >= blessCost, false)
  assert.equal(renewCost - 1 >= renewCost, false)

  // Asura at 0 mana deals positive base charge damage (strictly below Asura with 100 mana)
  const asuraZeroMana = asuraDamage(stZeroCut, KIT2.monk.asuraMinAt, 0, 1)
  const asuraWithMana = asuraDamage(stZeroCut, KIT2.monk.asuraMinAt, 100, 1)
  assert.ok(asuraZeroMana > 0 && asuraZeroMana < asuraWithMana)
})

test('Tier 2 — CLASS1_CAP (Lv 5/10/15), NO_STRETCH (cleric_core2, cleric_dn3, mk_s2), and ★ Capstone Cap (2)', () => {
  try {
    setClass1Tier(1)
    assert.equal(class1Cap(), CLASS1_CAP.base)
    assert.equal(nodeById('cleric_s1p')!.max, 5)
    assert.equal(nodeById('cl_bless_p')!.max, 5)
    assert.equal(nodeById('cleric_core2')!.max, 3)
    assert.equal(nodeById('cleric_dn3')!.max, 3)
    assert.equal(nodeById('mk_s2')!.max, 1)
    assert.ok('cleric_core2' in NO_STRETCH && 'cleric_dn3' in NO_STRETCH && 'mk_s2' in NO_STRETCH)

    setClass1Tier(2)
    assert.equal(class1Cap(), CLASS1_CAP.job2)
    assert.equal(nodeById('cleric_s1p')!.max, 10)
    assert.equal(nodeById('cl_bless_p')!.max, 10)
    assert.equal(nodeById('cleric_core2')!.max, 3)
    assert.equal(nodeById('cleric_dn3')!.max, 3)

    setClass1Tier(3)
    assert.equal(class1Cap(), CLASS1_CAP.job3)
    assert.equal(nodeById('cleric_s1p')!.max, 15)
    assert.equal(nodeById('cl_renew_p')!.max, 15)
    near(s2LvOf(5), 3)
    near(s2LvOf(10), 4.5)
    near(s2LvOf(15), 6)

    // ★ capstone limit = 2 per tree
    const twoStars: Record<string, number> = {
      cleric_ultp: 1,
      cleric_a1: 2,
      cleric_a2: 2,
      cleric_a3t: 2,
      cleric_a4x: 1,
      cleric_s1p: 1,
      cleric_b1: 2,
      cleric_b2: 2,
      cleric_b3s: 2,
      cleric_b4j: 1,
      cleric_c1: 2,
      cleric_c2: 2,
      cleric_c3: 2,
    }
    assert.ok(lockReason(twoStars, 'cleric', nodeById('cleric_c4')!).includes(`★ ได้ ${TREE_RULES.capstones}`))
  } finally {
    setClass1Tier(1)
  }
})

test('Tier 2 — Shield Cap (Cleric 50% vs Global 100%) & Auto Guard Cap / Over-Cap / Shieldless Half', () => {
  assert.equal(CLERIC_KIT.shieldCap, 0.5)
  assert.ok(CLERIC_KIT.shieldCap < 1)

  const cruInp = (vit: number, tree: Record<string, number> = {}) =>
    makeInput({ job2: 'crusader', stats: { ...DEFAULT_STATS, vit }, job2Tree: tree })
  const cru = (vit: number, tree: Record<string, number> = {}) => heroStats(cruInp(vit, tree))

  const lowVit = totalBase(cruInp(1)).vit - STAT_RULES.start
  const low = cru(1)
  near(low.j2Guard, KIT2.crusader.guard + KIT2.crusader.guardVit * lowVit)
  assert.equal(low.j2GuardOver, 0)

  const capAtVit = Math.round((KIT2.crusader.guardCap - KIT2.crusader.guard) / KIT2.crusader.guardVit)
  const deltaVit = totalBase(cruInp(1)).vit - 1
  const exactCap = cru(1 + capAtVit - deltaVit)
  near(exactCap.j2Guard, KIT2.crusader.guardCap)
  near(exactCap.j2GuardOver, 0)

  const overCap = cru(1 + capAtVit - deltaVit + 100) // +100 VIT past cap -> +0.20 over
  near(overCap.j2Guard, KIT2.crusader.guardCap)
  near(overCap.j2GuardOver, 0.2)
  near(overCap.j2GuardOver * KIT2.crusader.guardOverMul, 0.4)

  // Paladin raises Auto Guard cap 40% -> 50%
  const pal = heroStats(
    makeInput({ job2: 'crusader', job3: 'paladin', stats: { ...DEFAULT_STATS, vit: 1 + capAtVit - deltaVit + 100 } }),
  )
  near(pal.j2Guard, KIT2.crusader.guardCap + KIT3.paladin.capAdd)
  near(pal.j2GuardOver, 0.1)

  // Shieldless Auto Guard multiplier
  near(KIT2.knight.guardShieldless, 0.5)
})

test('Tier 2 — Asura Charges (0/2/3/7/9), Exhaust Lockout, & RESIST_RULES Soft/Hard Cap (<= 0.85)', () => {
  assert.equal(KIT2.monk.thunderMin, 2)
  assert.equal(KIT2.monk.asuraMinAt, 3)
  assert.equal(KIT2.monk.asuraExhaustTurns, 2) // M3: 3 -> 2

  const stMaxCharges = heroStats(
    makeInput({
      job2: 'monk',
      job2Level: 50,
      job3: 'champion',
      job3Level: 30,
      equipped: { acc: 'u_ch_spiritband' },
      job2Tree: { mk_c3: 4, mk_a1: 5, mk_a2: 5, mk_a3: 5, mk_a4: 1 },
    }),
  )
  const cap = KIT2.monk.chargeMax + stMaxCharges.j2ChargeMax // 5 + (2 mk_c3 + 2 Ki + 2 spiritband) = 11
  assert.equal(cap, 11)
  const d0 = asuraDamage(stMaxCharges, 0, 0)
  const d3 = asuraDamage(stMaxCharges, 3, 100)
  const d7 = asuraDamage(stMaxCharges, 7, stMaxCharges.maxRes)
  const d9 = asuraDamage(stMaxCharges, 9, stMaxCharges.maxRes)
  assert.ok(d0 > 0 && d3 > d0 && d7 > d3 && d9 > d7)

  // softCapDiminish bounds for high WIS + Monk M.DEF stacking
  assert.equal(softCapDiminish(-0.5), 0)
  near(softCapDiminish(0.7), 0.7)
  assert.ok(softCapDiminish(1.5) < RESIST_RULES.hardCap)
  assert.ok(softCapDiminish(999) <= RESIST_RULES.hardCap)
  const tankMonk = heroStats(
    makeInput({
      job2: 'monk',
      stats: { ...DEFAULT_STATS, wis: 500 },
      equipped: { armor: 'u_ch_ironrobe' },
      job2Tree: { mk_h1: 5 },
    }),
  )
  assert.ok(tankMonk.mdef <= RESIST_RULES.hardCap)
  assert.ok(tankMonk.tenacity <= RESIST_RULES.hardCap)
})

test('Tier 2 — Haymaker Grit Boundaries (0, triggerAt - 1, triggerAt, cap, shieldAmp)', () => {
  const stBase = heroStats(makeInput({ job2: 'monk', job2Tree: { mk_h1: 5, mk_h2: 5, mk_h3: 5 } }))
  const stStar = heroStats(makeInput({ job2: 'monk', job2Tree: { mk_h1: 5, mk_h2: 5, mk_h3: 5, mk_h4: 1 } }))
  stBase.shieldAmp = 0.5

  const zero = haymakerCalc(stBase, 0)
  assert.equal(zero.rawShield, 0)
  assert.equal(zero.shield, 0)
  assert.ok(zero.centerTrueDmg >= 1)

  const preTrigger = haymakerCalc(stBase, zero.triggerAt - 1)
  assert.ok(preTrigger.triggerAt === Math.round(stBase.maxHp * KIT2.monk.haymakerAt))

  const atTrigger = haymakerCalc(stBase, zero.triggerAt)
  assert.equal(atTrigger.rawShield, Math.round(zero.triggerAt * KIT2.monk.haymakerShield))
  assert.equal(atTrigger.shield, Math.round(atTrigger.rawShield * 1.5))
  assert.equal(atTrigger.splashTrueDmg, 0)

  const atCap = haymakerCalc(stStar, stStar.maxHp * 2) // raw calculation takes passed grit; verify cap field
  assert.equal(atCap.cap, Math.round(stStar.maxHp * KIT2.monk.haymakerStarCap))
  assert.equal(atCap.triggerAt, Math.round(stStar.maxHp * KIT2.monk.haymakerStarAt))
  assert.ok(atCap.splashTrueDmg > 0)
})

test('Tier 2 — CRIT_RULES Gate, Core2 Lv 1..3 Boundaries, 7d Path Swap Gate, critRef & CLASS1_LVS', () => {
  assert.equal(CRIT_RULES.skillFromCrit, 0)
  const stNoSkillCrit = heroStats(makeInput({ stats: { ...DEFAULT_STATS, luk: 300 } }))
  stNoSkillCrit.crit = 1
  stNoSkillCrit.spellCrit = 0.5
  stNoSkillCrit.skillCrit = 0
  // skill=true must NOT show crit text when skillCrit === 0
  assert.ok(!hitText(stNoSkillCrit, 1.5, false, true).includes('คริ'))
  assert.ok(!hitText(stNoSkillCrit, 1.5, true, true).includes('คริ'))
  // basic / proc (skill=false) CAN show crit text
  assert.ok(hitText(stNoSkillCrit, 1.5, false, false).includes('คริ'))
  assert.ok(hitText(stNoSkillCrit, 1.5, true, false).includes('คริ'))

  // Core1 uses min(STR, WIS)
  const c1LowStr = heroStats(makeInput({ stats: { ...DEFAULT_STATS, str: 1, wis: 100 }, jobTree: { cleric_core1: 5 } }))
  const c1Balanced = heroStats(makeInput({ stats: { ...DEFAULT_STATS, str: 100, wis: 100 }, jobTree: { cleric_core1: 5 } }))
  assert.ok(c1Balanced.resRegen > c1LowStr.resRegen)

  // Core2 Lv 1, 2, 3 (intPer = [7, 6, 5]) & exact floor boundary transitions at int/wis = 4, 5, 6, 7
  assert.deepEqual(KIT.clericTree.core.intPer, [7, 6, 5])
  const core2Gain = (lv: 1 | 2 | 3, val: number) => {
    const baseOnly = totalBase(makeInput({ jobLevel: 1, stats: { ...DEFAULT_STATS, int: val, wis: val }, jobTree: {} }))
    assert.equal(baseOnly.int, val)
    assert.equal(baseOnly.wis, val)
    const withCore2 = totalBase(makeInput({ jobLevel: 1, stats: { ...DEFAULT_STATS, int: val, wis: val }, jobTree: { cleric_core2: lv } }))
    return { strGain: withCore2.str - baseOnly.str, vitGain: withCore2.vit - baseOnly.vit }
  }
  // Lv 1 (/7): 4..6 -> 0, 7 -> 1
  assert.deepEqual(core2Gain(1, 6), { strGain: 0, vitGain: 0 })
  assert.deepEqual(core2Gain(1, 7), { strGain: 1, vitGain: 1 })
  // Lv 2 (/6): 5 -> 0, 6 -> 1
  assert.deepEqual(core2Gain(2, 5), { strGain: 0, vitGain: 0 })
  assert.deepEqual(core2Gain(2, 6), { strGain: 1, vitGain: 1 })
  // Lv 3 (/5): 4 -> 0, 5 -> 1
  assert.deepEqual(core2Gain(3, 4), { strGain: 0, vitGain: 0 })
  assert.deepEqual(core2Gain(3, 5), { strGain: 1, vitGain: 1 })

  // Legacy node caps at 0 vs 99 branch points (isolating pa_l1..l3 contribution) + hybrid tier<=2 gate
  const pal0 = heroStats(makeInput({ job2: 'crusader', job3: 'paladin', job2Tree: {}, job3Tree: { pa_l1: 3, pa_l2: 3, pa_l3: 3 } }))
  const pal99Base = heroStats(makeInput({ job2: 'crusader', job3: 'paladin', job2Tree: { cr_c1: 99, cr_s1: 99, cr_d1: 99 }, job3Tree: {} }))
  const pal99 = heroStats(makeInput({ job2: 'crusader', job3: 'paladin', job2Tree: { cr_c1: 99, cr_s1: 99, cr_d1: 99 }, job3Tree: { pa_l1: 3, pa_l2: 3, pa_l3: 3 } }))
  near(pal0.j2CrossAdd, 0)
  near(pal99.j2CrossAdd - pal99Base.j2CrossAdd, KIT3.paladin.leg.crossCap)
  assert.ok(lockReason3({ mk_c1: 5, pa_l3: 1 }, 'cleric', nodeById('pa_l3')!, 'paladin', 'hybrid').includes('Hybrid'))

  // setJob3Path 7-day swap gate (< 7d requires 30 gems; >= 7d is free)
  withCleanSave(() => {
    const s = newSave('swap_gate', 'human')
    s.job = 'cleric'
    s.jobLevel = 40
    s.job2 = 'crusader'
    s.job2Level = 50
    s.job3 = 'paladin'
    s.job3Level = 10
    s.gems = JOB3_RULES.pathSwapGems - 10 // 20 gems (< 30)
    setSave(s)

    // First swap is free and records job3SwapAt
    assert.equal(setJob3Path('hybrid', '2026-11-01'), true)
    assert.equal(save().gems, 20)
    assert.equal(save().job3Path, 'hybrid')

    // Within 7 days (< 7d) and gems < 30 -> rejected without spending gems
    assert.equal(setJob3Path('pure', '2026-11-03'), false)
    assert.equal(save().gems, 20)
    assert.equal(save().job3Path, 'hybrid')

    // Within 7 days with gems >= 30 -> deducts exactly 30 gems and succeeds
    const cur = save()
    cur.gems = JOB3_RULES.pathSwapGems + 5 // 35 gems
    setSave(cur)
    assert.equal(setJob3Path('pure', '2026-11-03'), true)
    assert.equal(save().gems, 5)
    assert.equal(save().job3Path, 'pure')

    // After >= 7 days from job3SwapAt -> free even with < 30 gems
    assert.equal(setJob3Path('hybrid', '2026-11-10'), true)
    assert.equal(save().gems, 5)
    assert.equal(save().job3Path, 'hybrid')
  })

  // Skill Registry Tier 2 boundaries: CLASS1_LVS & critRef
  assert.equal(CLASS1_LVS, CLASS1_CAP.job3)
  assert.equal(CLASS1_LVS, 15)
  for (const slot of CRIT_SLOTS) {
    const ref = critRef('cleric', slot)
    assert.equal(ref.table, 'skills')
    assert.equal(ref.path, `crit.cleric.${slot}`)
    assert.equal(ref.def.kind, 'num')
    assert.equal(ref.def.min, 0)
    assert.equal(ref.def.max, 1)
    assert.equal(canRollCrit('cleric', slot), true)
    assert.equal(critPower('cleric', slot), 1)
  }
  near(scaleCritMul(2.0, 0), 1.0)
  near(scaleCritMul(2.0, 0.5), 1.5)
  near(scaleCritMul(2.0, 1), 2.0)
  const fields = new Map(skillTableFields())
  assert.ok(fields.has('crit.cleric.s1') && fields.has('crit.cleric.s2') && fields.has('crit.cleric.ult'))
  assert.ok(fields.has(`swordS1.atkPct.${CLASS1_LVS - 1}`) && !fields.has(`swordS1.atkPct.${CLASS1_LVS}`))
})

test('Tier 2 — Legacy & Corrupt Save Migration Safety (load, migrateClericDawn, migrateDawnBurst, normalizeEndgameFields)', () => {
  withCleanSave(() => {
    // 1. Corrupt JSON returns null cleanly
    globalThis.localStorage.setItem('novice-to-hero.save.v1', '{broken json')
    assert.equal(load(), null)

    // 2. Unknown race returns null cleanly
    globalThis.localStorage.setItem('novice-to-hero.save.v1', JSON.stringify({ v: 1, race: 'alien' }))
    assert.equal(load(), null)

    // 3. Legacy Cleric save missing wis/job3 + carrying retired cleric_d1..4 + dn3=5 + corrupt endgame fields
    const legacy: Record<string, unknown> = {
      v: 1,
      name: 'old_cleric',
      race: 'human',
      baseLevel: 45,
      baseXp: 0,
      statPoints: 0,
      jobLevel: 40,
      jobXp: 0,
      skillPoints: 2,
      skills: { smash: 1 },
      nov2: 1,
      nov3: 1,
      web: 1,
      stretch: 1,
      job: 'cleric',
      jobSkills: { auto: 1, ult: 1 },
      jobTree: { cleric_s1p: 5, cl_bless: 3, cleric_d1: 2, cleric_d2: 1, cleric_dn3: 5 },
      jobTalents: { '1': { id: 'cleric_t1_focus', rank: 2 }, '2': { id: 'cleric_t2_dawnlight', rank: 1 } },
      stats: { str: 20, vit: 20, dex: 10, int: 20, luk: 10, agi: 10 }, // missing wis
      zeny: 500,
      gems: 10,
      owned: ['knife', 'cloth'],
      equipped: { weapon: 'knife', armor: 'cloth', acc: 'none' },
      costumes: ['default'],
      costume: 'default',
      supporter: false,
      clears: 5,
      bestRoom: 10,
      lastDaily: '',
      muted: false,
      awakened: 'bad_type',
      ascend: { c_dawnmace: -3, valid: 1 },
      imbue: { weapon: 123 },
    }
    assert.equal(adopt(legacy), true)
    const loaded = load()!
    assert.equal(loaded.stats.wis, STAT_RULES.start)
    assert.equal(loaded.jobTree?.cl_bless, 1)
    assert.equal(loaded.jobTree?.cleric_dn3, 3)
    assert.equal(loaded.jobTree?.cleric_d1, undefined)
    assert.equal(loaded.jobTree?.cleric_s1p, 5)
    assert.equal(loaded.awakened, undefined)
    assert.equal(loaded.ascend?.c_dawnmace, undefined)
    assert.equal(loaded.ascend?.valid, 1)

    // 4. Migration helpers are idempotent
    const spBefore = loaded.skillPoints
    migrateClericDawn(loaded)
    migrateDawnBurst(loaded)
    normalizeEndgameFields(loaded)
    assert.equal(loaded.skillPoints, spBefore)
  })
})

test('Tier 2 — Unique Equip Class-Lock & 2-Unique Cap Boundaries (Paladin & Champion)', () => {
  withCleanSave(() => {
    const s = newSave('uniq', 'human')
    s.job = 'cleric'
    s.job2 = 'monk'
    s.job3 = 'champion'
    assert.equal(canWearAs(itemById('u_ch_asuracrown'), s), true)
    assert.equal(canWearAs(itemById('u_pl_aegiscrown'), s), false)
    assert.equal(canWear(itemById('u_ch_asuracrown'), 'cleric', 'monk', undefined), false)

    // Max 2 uniques equipped simultaneously
    s.owned.push('u_ch_asuracrown', 'u_ch_ironrobe', 'u_ch_spiritband')
    assert.equal(equip(s, 'u_ch_asuracrown'), true)
    assert.equal(equip(s, 'u_ch_ironrobe'), true)
    assert.equal(equip(s, 'u_ch_spiritband'), false, '3rd unique must be blocked by 2-unique cap')
  })
})

// =====================================================================
// TIER 3: CROSS-FEATURE PAIRWISE COMBINATIONS
// =====================================================================

test('Tier 3 — Cleric S1 + S2 (Bless/Spear/Renew) + Ult/Dawn Light + heroParts Bless Uptime', () => {
  const noBless = makeInput({
    jobTree: { cleric_s1p: 5, cleric_ultp: 5, cleric_b1: 5, cleric_dn1: 5, cleric_dn3: 3 },
  })
  const withBless = makeInput({
    jobTree: { cleric_s1p: 5, cleric_ultp: 5, cleric_b1: 5, cleric_dn1: 5, cleric_dn3: 3, cl_bless: 1, cl_bless_p: 5, cl_bless_x: 1 },
  })
  const p0 = heroParts(noBless)
  const p1 = heroParts(withBless)
  assert.ok(BLESS_UPTIME > 0 && BLESS_UPTIME < 1)
  assert.ok(p1.power > p0.power && p1.offense > p0.offense && p1.survival > p0.survival)

  const stSpear = heroStats(
    makeInput({ jobTree: { cleric_s1p: 5, cl_spear: 1, cl_spear_p: 5, cl_spear_x: 1, cleric_a2: 5 } }),
  )
  assert.ok(stSpear.clSpearShield > 0 && spearMul(stSpear, skill2ById('cl_spear')) > KIT.spearBase)

  // hitText & powerParts crit parity: spellCrit vs skillCrit on Cleric S1/Spear
  const inpCrit = makeInput({
    jobLevel: 30,
    stats: { ...DEFAULT_STATS, luk: 120 },
    jobTree: { cleric_s1p: 5, cl_spear: 1, cl_spear_p: 5 },
    jobTalents: { '3': { id: 'cleric_t3_miracle', rank: 2 } },
  })
  const stCrit = heroStats(inpCrit)
  const ppBase = powerParts(heroStats(makeInput({ jobLevel: 30, stats: { ...DEFAULT_STATS, luk: 120 }, jobTree: { cleric_s1p: 5, cl_spear: 1, cl_spear_p: 5 } })))
  const ppCrit = powerParts(stCrit)
  assert.ok(ppCrit.offense >= ppBase.offense && stCrit.spellCrit > 0)
  assert.ok(hitText(stCrit, CLERIC_KIT.smite, true, false).includes('คริ'))
})

test('Tier 3 — Class-1 Inheritance into Crusader/Paladin and Monk/Champion (crossTierBonus & ultEvolutionSummary)', () => {
  const t1 = {
    cleric_s1p: 10,
    cleric_b1: 5, // 15 pts in s1 line (>= 14 -> s1Awaken!)
    cleric_ultp: 8,
    cleric_a1: 5, // 13 pts in ult line (>= 12 -> ultOverdrive!)
    cleric_core1: 5,
    cleric_dn1: 5,
  }
  const t2Cru = { crusader_s3p: 5, crusader_u2p: 5, cr_c4: 1 }
  const t3Pal = { paladin_u3p: 5, pa_g4: 1 }

  const cb = crossTierBonus(t1, 'cleric', 4)
  assert.equal(cb.ultOverdrive, true)
  assert.equal(cb.s1Awaken, true)
  assert.ok(cb.ult2Add > 0 && cb.ultAmpAdd > 0 && cb.s1Add > 0 && cb.s3Add > 0)

  const stPal = heroStats(
    makeInput({
      job2: 'crusader',
      job2Level: 50,
      job3: 'paladin',
      job3Level: 30,
      jobTree: t1,
      job2Tree: t2Cru,
      job3Tree: t3Pal,
      crossSpent: { j2In1: 2, j3In1: 2 },
    }),
  )
  assert.ok(stPal.ult2Pow > 0.6)
  assert.ok(stPal.ultAmp >= 0.15)
  assert.ok(stPal.clDawn > 0)

  const evoCru = ultEvolutionSummary('cleric', 'crusader', 'paladin', t1, t2Cru, t3Pal, 4)
  assert.equal(evoCru.tiers.length, 3)
  assert.ok(evoCru.tiers.every((t) => t.active))
  assert.equal(evoCru.curName, JOB3.paladin.ultName)

  const evoChamp = ultEvolutionSummary('cleric', 'monk', 'champion', t1, { monk_u2p: 5, mk_a4: 1 }, { champion_u3p: 5 }, 0)
  assert.ok(evoChamp.tiers.every((t) => t.active))
  assert.equal(evoChamp.curName, JOB3.champion.ultName)
})

test('Tier 3 — Cleric-Line Gear, Sets (thunder_cathedral), Uniques (PALADIN/CHAMPION_UNIQUES) & Conversions', () => {
  // Thunder Cathedral 4-piece + Champion conversion synergy
  const build = heroBuild(
    makeInput({
      job2: 'monk',
      job2Level: 50,
      job3: 'champion',
      job3Level: 30,
      equipped: {
        head: 'cc_tc_mitre',
        weapon: 'cc_tc_knuckle',
        armor: 'cc_tc_vestment',
        acc: 'u_ch_spiritband',
      },
    }),
  )
  assert.ok(build.sets.active.some((a) => a.set.id === 'thunder_cathedral' && a.count >= 4))
  assert.ok((build.conversionGains.skillCrit ?? 0) > 0, 'healAmp + crit conversions produce skillCrit')

  // Paladin unique def -> matk conversion
  const palBuild = heroBuild(
    makeInput({
      job2: 'crusader',
      job2Level: 50,
      job3: 'paladin',
      job3Level: 30,
      equipped: {
        head: PALADIN_UNIQUES[0]!.id,
        armor: PALADIN_UNIQUES[1]!.id,
        acc: PALADIN_UNIQUES[2]!.id, // note: only 2 uniques in actual equip; heroBuild sums conversions cleanly
      },
    }),
  )
  assert.ok((palBuild.conversionGains.matk ?? 0) > 0)
  assert.ok(CHAMPION_UNIQUES.length === 3 && CLERIC_ZONE_ITEMS.length === 6)
  const palDrop = rollUnique3Drop('paladin', 'hell', [], () => 0.001)
  const chDrop = rollUnique3Drop('champion', 'hell', [], () => 0.001)
  assert.equal(palDrop.kind, 'new')
  assert.equal(chDrop.kind, 'new')
})

test('Tier 3 — [Post-M3] Monk class-gear, class-craft, and refine pool contain zero retired affixes', () => {
  const retired = new Set(['j2Es', 'j2Dark', 'j2Instill', 'j2NoLight'])
  const monkCraftItems = [...CLASS_GEAR, ...CLASS_CRAFT_ITEMS].filter(
    (it) => it.id === 'c_mk_band' || it.id === 'c_mk_beads' || it.id === 'cc_mk_gi',
  )
  assert.equal(monkCraftItems.length, 3)
  for (const it of monkCraftItems) {
    const keys = [
      ...Object.keys(it.mod),
      ...(it.craft?.bonus ?? []).flatMap((b) => Object.keys(b)),
    ]
    const found = keys.filter((k) => retired.has(k))
    assert.deepEqual(found, [], `${it.id} still carries retired Monk affixes: ${found.join(', ')}`)
  }
  const monkRefineStats = CLASS_LINE_POOL.filter((l) => l.j2?.includes('monk')).map((l) => l.stat)
  const retiredRefine = monkRefineStats.filter((s) => retired.has(s))
  assert.deepEqual(retiredRefine, [], `CLASS_LINE_POOL for monk still contains retired stats: ${retiredRefine.join(', ')}`)
})

test('Tier 3 — Hero Power Calibration (CLASS_K / JOB2_K / JOB3_K) & Tank Bulk vs D10 statMonster', () => {
  assert.ok((CLASS_K.cleric ?? 0) > 0 && (JOB2_K.crusader ?? 0) > 0 && (JOB2_K.monk ?? 0) > 0)
  assert.ok((JOB3_K.paladin ?? 0) > 0 && (JOB3_K.champion ?? 0) > 0)

  const stPal = heroStats(makeInput({ job2: 'crusader', job3: 'paladin', job3Level: 30 }))
  const stMonk = heroStats(makeInput({ job2: 'monk', job3: 'champion', job3Level: 30 }))
  const starweaver = statMonster(MONSTERS.starweaver, 90, { hard: true })
  assert.ok(starweaver.hp > 0 && starweaver.dmg > 0)

  const rawSkillHit = Math.round((starweaver.matk ?? 0) * 1.2)
  const palAfter = applyTankDr(rawSkillHit, stPal.tankDr, stPal.tankSkillDr, true)
  const chAfter = applyTankDr(rawSkillHit, stMonk.tankDr, stMonk.tankSkillDr, true)
  assert.ok(palAfter < rawSkillHit && chAfter < rawSkillHit && palAfter <= chAfter)
  assert.ok(recPower('d5') > recPower('d1'))
})

// =====================================================================
// TIER 4: REAL-WORLD MULTI-TURN & FULL PROGRESSION SCENARIOS (5 Scenarios)
// =====================================================================

test('Tier 4 Scenario 1 — Full Lifecycle Novice -> Cleric -> Crusader -> Paladin (save, syncClass1, power, D10 gear)', () => {
  withCleanSave(() => {
    const s: SaveData = newSave('pal_e2e', 'human')
    setSave(s)
    addXp(6000) // enough for Novice Job Lv 10
    s.clears = 1
    changeJob('cleric')
    const pNoviceToCleric = heroPower(s)

    addXp(50000) // Base ~40+, Cleric Job 40
    s.clearsBy = { d5: 1 }
    const pCleric = heroPower(s)
    assert.ok(pCleric >= pNoviceToCleric)

    assert.equal(changeJob2('crusader'), true)
    addXp(300000) // Base ~80+, Job2 50
    s.clearsBy.d10 = 1
    assert.equal(trialWin(s, 'd10', true), 'paladin')
    const pCrusader = heroPower(s)
    assert.ok(pCrusader > pCleric)

    assert.equal(changeJob3('paladin'), true)
    addXp(250000) // Job3 30
    syncClass1(s)
    assert.equal(class1Cap(), 15)
    assert.equal(s.j1Bonus, 49 + 29) // Job2 (50-1) + Job3 (30-1) = 78

    s.jobTree = { cleric_s1p: 10, cleric_ultp: 10, cl_bless: 1, cl_bless_p: 10, cl_bless_x: 1, cleric_core1: 5 }
    s.job2Tree = { crusader_s3p: 5, cr_h1: 5, crusader_u2p: 5, cr_c1: 5, cr_s1: 5, cr_d1: 5 }
    s.job3Tree = { paladin_u3p: 5, pa_l1: 3, pa_g1: 3, pa_g4: 1, pa_r1: 3 }
    s.owned.push('c_paladinblade', 'cc_pl_plate', 'cc_pl_shield', 'u_pl_aegiscrown', 'u_pl_gospelrelic')
    assert.equal(equip(s, 'c_paladinblade'), true)
    assert.equal(equip(s, 'cc_pl_plate'), true)
    assert.equal(equip(s, 'cc_pl_shield'), true)
    assert.equal(equip(s, 'u_pl_aegiscrown'), true)
    assert.equal(equip(s, 'u_pl_gospelrelic'), true)

    const pPaladin = heroPower(s)
    assert.ok(pPaladin > pCrusader, `Paladin (${pPaladin}) > Crusader (${pCrusader})`)

    assert.equal(setJob3Variant('b'), true)
    assert.equal(setJob3Path('hybrid'), true)
    assert.equal(activeJob3(s), 'paladin')
    assert.equal(save().job3, 'paladin')
    const st = heroStats(s)
    assert.ok(Number.isFinite(st.maxHp) && st.maxHp > 0 && Number.isFinite(st.atk))
  })
})

test('Tier 4 Scenario 2 — Full Lifecycle Novice -> Cleric -> Monk -> Champion (Ki Translation, Variants, Unique3 Drop)', () => {
  withCleanSave(() => {
    const s = newSave('champ_e2e', 'human')
    setSave(s)
    addXp(6000)
    s.clears = 1
    changeJob('cleric')
    addXp(50000)
    s.clearsBy = { d5: 1 }
    const pCleric = heroPower(s)

    assert.equal(changeJob2('monk'), true)
    addXp(300000)
    s.clearsBy.d10 = 1
    assert.equal(trialWin(s, 'd10', true), 'champion')
    const pMonk = heroPower(s)
    assert.ok(pMonk > pCleric)

    assert.equal(changeJob3('champion'), true)
    addXp(250000)
    syncClass1(s)
    s.jobTree = { cleric_s1p: 10, cleric_ultp: 10, cl_spear: 1, cl_spear_p: 8, cleric_core1: 5 }
    s.job2Tree = { monk_s3p: 5, mk_s1: 5, mk_c1: 5, mk_c2: 5, mk_c3: 4, mk_h1: 5, mk_h2: 5, mk_a1: 5 }
    s.job3Tree = { champion_u3p: 5, ch_l1: 3, ch_g1: 3, ch_g4: 1 }
    s.owned.push('c_vajraknuckle', 'u_ch_asuracrown', 'u_ch_ironrobe')
    assert.equal(equip(s, 'c_vajraknuckle'), true)
    assert.equal(equip(s, 'u_ch_asuracrown'), true)
    assert.equal(equip(s, 'u_ch_ironrobe'), true)

    const pChamp = heroPower(s)
    assert.ok(pChamp > pMonk)
    assert.ok(heroStats(s).j2ChargeMax >= 4)

    // Variant A vs Variant B legacy branch reading
    setJob3Variant('a')
    const varA = heroStats(s).j3VarMul
    setJob3Variant('b')
    const varB = heroStats(s).j3VarMul
    assert.ok(varA > 0 && varB > 0)

    // rollUnique3Drop for Champion
    const dropNew = rollUnique3Drop('champion', 'hell', [], () => 0.001)
    assert.equal(dropNew.kind, 'new')
    if (dropNew.kind === 'new') {
      const dropDupe = rollUnique3Drop('champion', 'hell', [dropNew.id], () => 0.001)
      assert.equal(dropDupe.kind, 'dupe')
    }
  })
})

test('Tier 4 Scenario 3 — Deterministic 12-Turn Combat Simulation: Monk/Champion Combo + Tempest Bell + Haymaker + Asura + Exhaust', () => {
  const st = heroStats(
    makeInput({
      baseLevel: 90,
      stats: { str: 85, vit: 75, wis: 80, dex: 35, int: 30, luk: 25, agi: 65 },
      job2: 'monk',
      job2Level: 50,
      job3: 'champion',
      job3Level: 30,
      equipped: { weapon: 'c_vajraknuckle', head: 'u_ch_asuracrown', armor: 'u_ch_ironrobe' },
      jobTree: { cleric_s1p: 10, cleric_core1: 5, cleric_core3: 5 },
      job2Tree: {
        monk_u2p: 5,
        mk_u1: 5,
        mk_c1: 5,
        mk_c2: 5,
        mk_c3: 4,
        mk_c4: 1,
        mk_h1: 5,
        mk_h2: 5,
        mk_h3: 5,
        mk_h4: 1,
        mk_a1: 5,
        mk_a2: 5,
        mk_a3: 5,
        mk_a4: 1,
      },
      job3Tree: { champion_u3p: 5, ch_g1: 3, ch_g4: 1 },
    }),
  )
  const boss = statMonster(MONSTERS.starweaver, 90)
  const bell = makeAlly(ALLIES.tempestBell, st, 1 + st.ult2Pow)
  const chargeCap = KIT2.monk.chargeMax + st.j2ChargeMax

  let hp = st.maxHp
  let shield = 0
  let mana = st.maxRes
  let charges = 0
  let grit = 0
  let exhaust = 0
  let bellHp = bell.maxHp
  let bellTurns = bell.turns
  let totalDealt = 0
  let asuraFired = false
  let haymakerFired = false
  let exhaustedTurnCount = 0

  for (let turn = 1; turn <= 12; turn++) {
    const exhausted = exhaust > 0
    if (exhausted) exhaustedTurnCount++
    if (!exhausted) mana = Math.min(st.maxRes, mana + st.resRegen * RES_RULES.manaPerTurnMul)

    // Hero basic + expected combo hits (Monk j2HpPunch, j2MdefDmg, j2ComboRamp, COMBO.basicDR/comboDR, asuraWeak)
    const extraHits = Math.round(comboExtra(st.combo, COMBO.baseCount + st.comboCount))
    const hpPunchAdd = st.j2HpPunch > 0 ? (st.j2HpPunch * st.maxHp) / Math.max(1, st.atk) : 0
    const mdefDmgMul = st.j2MdefDmg > 0 ? 1 + st.mdef * st.j2MdefDmg : 1
    const weakMul = exhausted ? 1 - KIT2.monk.asuraWeak : 1
    const firstBracket = Math.max(COMBO.dmgFloor, 1 - COMBO.basicDR.boss)
    const firstHit = Math.round(afterDef(st.atk * (1 + hpPunchAdd) * firstBracket * mdefDmgMul * weakMul, boss.def ?? 0))
    let comboDmgSum = 0
    for (let c = 0; c < extraHits; c++) {
      const comboLevel = c + 2
      const rampMul = st.j2ComboRamp > 0 ? 1 + st.j2ComboRamp * (comboLevel - 1) : 1
      const comboBracket = Math.max(COMBO.dmgFloor, 1 + st.comboDmg - COMBO.basicDR.boss - COMBO.comboDR.boss)
      comboDmgSum += Math.round(afterDef(st.atk * (1 + hpPunchAdd) * comboBracket * mdefDmgMul * rampMul * weakMul, boss.def ?? 0))
    }
    totalDealt += firstHit + comboDmgSum
    if (!exhausted) {
      if (extraHits >= 1 && st.j3Ch > 0) {
        mana = Math.min(st.maxRes, mana + st.resRegen * RES_RULES.manaPerTurnMul * KIT3.champion.comboManaBonus * extraHits)
      }
      charges = Math.min(chargeCap, charges + KIT2.monk.chargePerSwing + extraHits * KIT2.monk.chargePerCombo)
    }

    // Tempest Bell ring while standing (includes bell.pow = 1 + ult2Pow)
    if (bellHp > 0 && bellTurns > 0) {
      totalDealt += Math.round(magicPower(st) * KIT2.monk.bellRing * bell.pow * bellMdefMul(st) * (1 - (boss.mdef ?? 0)))
    }

    // Asura Strike once charges >= 3 and exhaust === 0 (sets exhaust = asuraExhaustTurns + 1)
    if (!asuraFired && !exhausted && charges >= KIT2.monk.asuraMinAt) {
      const burst = asuraDamage(st, charges, mana, 1 + st.ult2Pow)
      totalDealt += burst
      charges = 0
      mana = 0
      exhaust = KIT2.monk.asuraExhaustTurns + 1
      asuraFired = true
    }

    // Incoming boss hit (BATTLE.monDmgMul = 0.55) -> Bell taunt (raw) or Hero Grit -> Haymaker
    const rawBossDmg = boss.dmg * BATTLE.monDmgMul
    if (bellHp > 0 && bellTurns > 0 && turn % 2 === 1) {
      bellHp = Math.max(0, bellHp - Math.max(1, Math.round(rawBossDmg)))
      if (bellHp === 0) {
        totalDealt += Math.round(magicPower(st) * KIT2.monk.bellBoom * bell.pow * bellMdefMul(st) * (1 - (boss.mdef ?? 0)))
      }
    } else {
      const hayDr = st.j2HaymakerStar > 0 && grit > 0 ? 1 - KIT2.monk.haymakerDr : 1
      const monHit = applyTankDr(
        Math.max(1, Math.ceil(afterDef(rawBossDmg, st.def) * (1 - st.guard) * hayDr)),
        st.tankDr,
        st.tankSkillDr,
        false,
      )
      const h = haymakerCalc(st, grit)
      const gritGain = Math.min(Math.max(0, h.cap - grit), monHit * st.j2GritRate)
      grit += gritGain
      const absorbed = Math.min(shield, monHit)
      shield -= absorbed
      hp = Math.max(1, hp - (monHit - absorbed))
      if (grit >= h.triggerAt) {
        const fired = haymakerCalc(st, grit)
        totalDealt += fired.centerTrueDmg
        shield += fired.shield
        grit = 0
        haymakerFired = true
      }
    }

    // End of hero turn: tick bell duration & decrement Asura Exhaust (BattleScene.ts:1070-1075)
    if (bellHp > 0 && bellTurns > 0 && --bellTurns <= 0) bellHp = 0
    if (exhaust > 0) exhaust--
  }

  assert.ok(asuraFired, 'Asura Strike must fire once charges >= 3')
  assert.equal(exhaustedTurnCount, KIT2.monk.asuraExhaustTurns, 'Asura Exhaust must lock out exactly asuraExhaustTurns hero turns')
  assert.ok(haymakerFired, 'Haymaker must trigger once Grit >= triggerAt')
  assert.equal(exhaust, 0, '3-turn Asura Exhaust must recover before turn 12')
  assert.ok(Number.isFinite(totalDealt) && totalDealt > boss.hp * 0.1)
  assert.ok(Number.isFinite(hp) && hp > 0 && Number.isFinite(shield))
})

test('Tier 4 Scenario 4 — Deterministic 10-Turn Combat Simulation: Crusader/Paladin Auto Guard + Gospel Cross + Bless Cycle', () => {
  const inp = makeInput({
    baseLevel: 85,
    stats: { str: 55, vit: 110, wis: 75, dex: 25, int: 55, luk: 15, agi: 20 },
    job2: 'crusader',
    job2Level: 50,
    job3: 'paladin',
    job3Level: 30,
    equipped: { weapon: 'c_paladinblade', offhand: 'cc_pl_shield', armor: 'cc_pl_plate', head: 'u_pl_aegiscrown' },
    jobTree: { cleric_s1p: 10, cleric_ultp: 10, cl_bless: 1, cl_bless_p: 8, cl_bless_x: 1, cleric_core1: 5 },
    job2Tree: { crusader_s3p: 5, cr_h1: 5, crusader_u2p: 5, cr_u1: 5, cr_u2: 3, cr_c2: 5, cr_c4: 1, cr_s1: 5, cr_s3: 5, cr_s4: 1, cr_d2: 5 },
    job3Tree: { paladin_u3p: 5, pa_g1: 3, pa_g3: 2, pa_g4: 1, pa_r1: 3, pa_r2: 3 },
  })
  const stBase = heroStats(inp)
  const stBlessed = heroStats({ ...inp, tempBase: blessBase(inp) })
  const baseOnly = totalBase(inp)
  const bl = blessBase(inp) ?? {}
  const packSize = 4
  const d10Mob = statMonster(MONSTERS.nightmarehound, 85)

  let hp = stBlessed.maxHp
  let shield = 0
  let mana = stBlessed.maxRes
  let gcState: { left: number; n: number; k: number; extra: number; base: number } | null = null
  let totalDealt = 0
  let blockCount = 0
  let gospelPulsesFired = 0

  for (let turn = 1; turn <= 10; turn++) {
    const blessed = (turn - 1) % 5 < S2N.blessTurns
    const st = blessed ? stBlessed : stBase
    const C = KIT2.crusader

    // Cast Gospel Cross on turn 1 and turn 7 (matching BattleScene.ts:3236-3247)
    if (turn === 1 || turn === 7) {
      const k = (1 + st.ultPow) * (1 + st.ultAmp) * (1 + st.ult2Pow) * (1 + st.j2CrossAdd)
      const paid = Math.min(hp - 1, Math.floor(hp * C.gcPay * Math.max(0, 1 - st.j2PayCut)))
      hp -= paid
      const burnt = Math.floor(mana)
      mana = 0
      const n = gcPulses(st)
      assert.equal(n, 6)
      const gBase = n - (st.j3On > 0 ? KIT3.paladin.gospelPulse + st.j3GospelField : 0)
      gcState = { left: n, n, k, extra: (C.gcBurn * (burnt + paid) * k) / n, base: gBase }
      // 4 targets >= gcRefundAt (3): refund 50% of paid HP
      hp = Math.min(st.maxHp, hp + Math.round(paid * C.gcRefund))
    }

    // Execute 1 Grand/Gospel Cross pulse (BattleScene.ts:4917-4948)
    if (gcState && gcState.left > 0) {
      const idx = gcState.n - gcState.left
      gcState.left--
      const k3 = idx >= gcState.base ? 1 + st.u3Pow : 1
      if (idx >= gcState.base) gospelPulsesFired++
      const strTotal = baseOnly.str + (blessed ? bl.str ?? 0 : 0)
      const physRaw = st.atk * (C.gcAtk + st.clUltAtk / gcState.n) * gcState.k * (1 + st.pskill) + C.gcStr * strTotal * gcState.k
      const times = st.j2GcTwice > 0 ? 2 : 1
      for (let twice = 0; twice < times; twice++) {
        const magRaw = (magicPower(st) * C.gcPm * gcState.k + (twice === 0 ? gcState.extra : 0)) * k3
        const magHit = Math.max(1, Math.round(magRaw * (1 - (d10Mob.mdef ?? 0))))
        const physHit = Math.max(1, Math.round(afterDef(physRaw * k3, d10Mob.def ?? 0)))
        totalDealt += (magHit + physHit) * packSize
      }
      hp = Math.min(st.maxHp, hp + Math.round(st.maxHp * st.j3GospelHeal * Math.min(packSize, KIT3.paladin.gospelHealMax) * (1 + st.healAmp)))
      if (gcState.left <= 0) gcState = null
    }

    // Incoming pack attacks (deterministic block every 2nd hit matching 50% Prestige Auto Guard)
    const angelDr = gcState && gcState.left > 0 ? Math.min(C.angelCap, st.j2GcAngel * gcState.left) : 0
    const bandingDr = Math.min(KIT3.common.bandingMax, packSize) * st.j3Banding
    const over = (1 + st.j2GuardOver * C.guardOverMul) * (st.j3On > 0 ? 1 + KIT3.paladin.blockAmp : 1)
    for (let m = 0; m < packSize; m++) {
      const raw = applyTankDr(
        Math.max(1, Math.ceil(afterDef(d10Mob.dmg * BATTLE.monDmgMul, st.def) * (1 - angelDr) * (1 - bandingDr))),
        st.tankDr,
        st.tankSkillDr,
        false,
      )
      const blocked = (turn + m) % 2 === 0
      if (blocked) {
        blockCount++
        shield = Math.min(
          st.maxHp * CLERIC_KIT.shieldCap,
          shield + Math.round(st.maxHp * st.j2BlockShield * over * (1 + st.shieldAmp)),
        )
        hp = Math.min(st.maxHp, hp + Math.round(st.maxHp * st.j2BlockHeal * over * (1 + st.healAmp)))
        totalDealt += Math.round(afterDef(st.def * st.j3Press * (1 + st.pskill), d10Mob.def ?? 0))
      } else {
        const absorbed = Math.min(shield, raw)
        shield -= absorbed
        hp = Math.max(1, hp - (raw - absorbed))
      }
    }
    mana = Math.min(st.maxRes, mana + st.resRegen * RES_RULES.manaPerTurnMul)
  }

  assert.ok(blockCount > 0 && stBlessed.j2Guard <= 0.5)
  assert.ok(gospelPulsesFired > 0, 'Gospel Cross pulses (idx >= gBase) must execute')
  assert.ok(Number.isFinite(totalDealt) && totalDealt > d10Mob.hp * packSize * 0.25)
  assert.ok(Number.isFinite(hp) && hp > 0)
})

test('Tier 4 Scenario 5 — Cross-Build Comparative Evaluation (Cleric S2 variants, Crusader, Monk, Paladin, Champion vs Knight/Berserker)', () => {
  const sharedStats = { str: 60, vit: 60, wis: 60, dex: 30, int: 50, luk: 25, agi: 40 }
  const clericRenew = makeInput({ stats: sharedStats, jobTree: { cleric_s1p: 5, cl_renew: 1, cl_renew_p: 5, cl_renew_x: 1 } })
  const clericBless = makeInput({ stats: sharedStats, jobTree: { cleric_s1p: 5, cl_bless: 1, cl_bless_p: 5, cl_bless_x: 1 } })
  const clericSpear = makeInput({ stats: sharedStats, jobTree: { cleric_s1p: 5, cl_spear: 1, cl_spear_p: 5, cl_spear_x: 1 } })
  const crusader = makeInput({ stats: sharedStats, job2: 'crusader', job2Level: 50, job2Tree: { crusader_s3p: 5, crusader_u2p: 5 } })
  const monk = makeInput({ stats: sharedStats, job2: 'monk', job2Level: 50, job2Tree: { monk_s3p: 5, monk_u2p: 5 } })
  const paladin = makeInput({ stats: sharedStats, job2: 'crusader', job2Level: 50, job3: 'paladin', job3Level: 30, job3Tree: { paladin_u3p: 5 } })
  const champion = makeInput({ stats: sharedStats, job2: 'monk', job2Level: 50, job3: 'champion', job3Level: 30, job3Tree: { champion_u3p: 5 } })
  const knight = makeInput({ job: 'swordsman', stats: sharedStats, job2: 'knight', job2Level: 50, job2Tree: { knight_s3p: 5, knight_u2p: 5 } })
  const berserker = makeInput({ job: 'swordsman', stats: sharedStats, job2: 'berserker', job2Level: 50, job2Tree: { berserker_s3p: 5, berserker_u2p: 5 } })

  const builds = [
    ['clericRenew', clericRenew],
    ['clericBless', clericBless],
    ['clericSpear', clericSpear],
    ['crusader', crusader],
    ['monk', monk],
    ['paladin', paladin],
    ['champion', champion],
    ['knight', knight],
    ['berserker', berserker],
  ] as const

  const results = Object.fromEntries(
    builds.map(([name, inp]) => {
      const pp = heroParts(inp)
      const st = heroStats(inp)
      assert.ok(Number.isFinite(pp.power) && pp.power > 0, `${name} power finite > 0`)
      assert.ok(Number.isFinite(pp.offense) && pp.offense > 0, `${name} offense finite > 0`)
      assert.ok(Number.isFinite(pp.survival) && pp.survival > 0, `${name} survival finite > 0`)
      assert.ok(Number.isFinite(st.maxHp) && st.maxHp > 0, `${name} maxHp finite > 0`)
      return [name, pp]
    }),
  ) as Record<(typeof builds)[number][0], ReturnType<typeof powerParts>>

  // Bless raises power over non-Bless baseline; Job3 strictly exceeds Job2 at equal budget
  assert.ok(results.clericBless.power > results.clericRenew.power)
  assert.ok(results.paladin.power > results.crusader.power)
  assert.ok(results.champion.power > results.monk.power)

  // Cleric Job2/Job3 builds stay within sane comparative ratio vs Swordsman Job2 baselines (0.4x..2.5x)
  const ratioCruKnight = results.crusader.power / results.knight.power
  const ratioMonkZerk = results.monk.power / results.berserker.power
  assert.ok(ratioCruKnight >= 0.4 && ratioCruKnight <= 2.5, `Crusader/Knight power ratio ${ratioCruKnight}`)
  assert.ok(ratioMonkZerk >= 0.4 && ratioMonkZerk <= 2.5, `Monk/Berserker power ratio ${ratioMonkZerk}`)
})
