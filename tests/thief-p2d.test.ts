// Thief P2'd off-meta (สาย INT เล่นแร่พิษ / วิถีพิษคริ / WIS Shadow Ward / LUK Gambler's Edge). Run: node tools/test.mjs thief-p2d
import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAYER, type Stats } from '../src/data/game-data'
import { CRIT_RULES } from '../src/data/battle-rules'
import { heroStats, STAT_RULES, statEff, type StatsInput } from '../src/data/meta'
import { autoInfo, KIT, magicPower, matkToPmRatio } from '../src/data/skill-math'
import { statLines } from '../src/data/statInfo'
import { fieldFor } from '../src/data/patch'
import { explainField } from '../src/admin/explain'
import { agonyBonus, canDetonate, contaminateBossRefund, contaminateCritChance, contaminateLeechShare, detonateDmg, detonateStacks, gamblerLuckyRes, leechRate, paApplies, poisonPowerBonus, poisonTickTotal, shadowWard, shadowWardApplies } from '../src/data/thief-offmeta'
import { nodeById, TALENTS } from '../src/data/tree'

const baseInput = (over: Partial<StatsInput> = {}): StatsInput => ({
  race: 'human',
  job: 'thief',
  stats: { str: 1, vit: 1, wis: 1, dex: 1, int: 1, luk: 1, agi: 1 },
  equipped: {},
  skills: { smash: 1, firstaid: 0, tough: 0, focus: 0, power: 0, iron: 0 },
  ...over,
})

const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)

test('statEff: single off-meta stat door clamps below start and reads points above start', () => {
  const b = { str: 1, vit: 1, wis: 1, dex: 1, int: 41, luk: 0, agi: 1 }
  assert.equal(statEff(b, 'wis'), 0)
  assert.equal(statEff(b, 'luk'), 0, 'clamps to >= 0')
  assert.equal(statEff(b, 'int'), 41 - STAT_RULES.start)
})

test('matkToPmRatio converts M.ATK multipliers into Pm units safely at matk = 0', () => {
  const z: Stats = { ...PLAYER, matk: 0, atk: 0 }
  assert.equal(matkToPmRatio(z), 0)
  assert.ok(!Number.isNaN(matkToPmRatio(z)))
  const s: Stats = { ...PLAYER, matk: 120, atk: 40 }
  near(matkToPmRatio(s) * magicPower(s), 120, 'x Pm == exact M.ATK')
})

test('PLAYER initializes all 7 P2\'d Stats keys to 0', () => {
  for (const k of ['thS1Matk', 'thDetonate', 'thDetonateStar', 'thPoisonLeechLv', 'thPoisonLeech', 'thPerfectAgony', 'thShadowWard'] as const) {
    assert.equal(PLAYER[k], 0, k)
  }
})

test('thief_v1 แทงฉาบอาคม stretches cleanly Lv 1..5 and shows in autoInfo', () => {
  const v1 = nodeById('thief_v1')!
  assert.equal(v1.branch, 'thief_v')
  assert.equal(v1.max, 5)
  near(v1.mod(5).thS1Matk ?? 0, 1.8, 'Lv 5 == old Lv 3')
  for (let lv = 1; lv <= 5; lv++) {
    const d = v1.desc(lv)
    assert.ok(!/undefined|NaN|\d+\.\d+/.test(d), `v1 Lv ${lv}: ${d}`)
  }
  const rows = autoInfo('thief', { ...PLAYER, thS1Matk: 1.8, matk: 100, atk: 30 })
  assert.ok(rows.some((r) => r.label.includes('แทงฉาบอาคม')), 'autoInfo shows magic bonus row')
  const plainRows = autoInfo('thief', PLAYER)
  assert.ok(!plainRows.some((r) => r.label.includes('แทงฉาบอาคม')), 'hidden when thS1Matk = 0')
})

test('thief_v2 ระเบิดสารพิษ: threshold scales with poison cap, detonateStacks/Dmg & stretch Lv 1..5', () => {
  assert.equal(canDetonate(false, 9, 20, 3), false, 'below 50% of 20')
  assert.equal(canDetonate(false, 10, 20, 3), true, 'at 50% of 20 = 10')
  assert.equal(canDetonate(false, 14, 29, 3), false, 'cap 29 needs ceil(14.5) = 15')
  assert.equal(canDetonate(false, 15, 29, 3), true)
  assert.equal(canDetonate(true, 20, 20, 3), false, '1/hero turn ICD')
  assert.equal(canDetonate(false, 20, 20, 0), false, 'node off')

  assert.equal(detonateStacks(8), 3, 'min 3 when floor(3.2) = 3')
  assert.equal(detonateStacks(20), 8, 'floor(20 * 0.4) = 8')
  assert.equal(detonateStacks(2), 2, 'capped at available stacks')
  near(detonateDmg(8, 10, 3), 8 * 10 * 3.0, 'Lv 5 (x=3): 3.0x poisonDmg/stack, no extra M.ATK term')

  const v2 = nodeById('thief_v2')!
  assert.equal(v2.max, 5)
  near(v2.mod(5).thDetonate ?? 0, 3, 'Lv 5 == old Lv 3')
  for (let lv = 1; lv <= 5; lv++) {
    const d = v2.desc(lv)
    assert.ok(!/undefined|NaN/.test(d), `v2 Lv ${lv}: ${d}`)
  }
})

test('thief_v3 เลือดพิษ & thief_v4 ★ นักเล่นแร่พิษ: INT scaling, gear sum, cap, and heroStats wiring', () => {
  near(leechRate(3, 0, 0), 0.24)
  near(leechRate(3, 50, 0), 0.42)
  near(leechRate(3, 80, 0), 0.528)
  near(leechRate(3, 100, 0), 0.6, 'capped at 0.6')
  near(leechRate(3, 0, 0.1), 0.34, 'gear poisonLeech adds on top')
  near(leechRate(0, 80, 0.12), 0.12, 'node off = gear only')

  const loStats = { str: 1, vit: 1, wis: 1, dex: 1, int: 1, luk: 1, agi: 1 }
  const hiStats = { str: 1, vit: 1, wis: 1, dex: 1, int: 81, luk: 1, agi: 1 }
  const stLo = heroStats(baseInput({ stats: loStats, jobTree: { thief_v3: 5 } }))
  const stHi = heroStats(baseInput({ stats: hiStats, jobTree: { thief_v3: 5 } }))
  near(stLo.thPoisonLeech, leechRate(3, statEff(loStats, 'int'), 0))
  near(stHi.thPoisonLeech, leechRate(3, statEff(hiStats, 'int'), 0))
  assert.ok(stHi.thPoisonLeech > stLo.thPoisonLeech, 'INT scales thPoisonLeech in heroStats')

  const stNonThief = heroStats(baseInput({ job: 'archer', stats: hiStats, jobTree: { thief_v3: 5 } }))
  assert.equal(stNonThief.thPoisonLeech, 0)

  near(contaminateCritChance(0.2, 0.15), 0.35)
  near(contaminateCritChance(0.5, 0.3), CRIT_RULES.cap.skillCrit, 'capped at skillCrit cap')
  assert.equal(contaminateLeechShare(false), 0.5)
  assert.equal(contaminateLeechShare(true), 1)
  assert.equal(contaminateBossRefund(8), 2)

  const v3 = nodeById('thief_v3')!
  assert.equal(v3.max, 5)
  for (let lv = 1; lv <= 5; lv++) assert.ok(!/undefined|NaN/.test(v3.desc(lv)), v3.desc(lv))
  const v4 = nodeById('thief_v4')!
  assert.equal(v4.max, 1, 'tier 4 ★ is never stretched')
  assert.equal(v4.mod(1).thDetonateStar, 1)
  assert.ok(!/undefined|NaN/.test(v4.desc(1)))
})

test('th_t4b วิถีพิษคริ (Perfect Agony B5): flat-only poison scaling, crit/debt exclusions, and cap', () => {
  near(agonyBonus(1.4, 0.5), 0, 'nothing at floor 1.4')
  near(agonyBonus(2.0, 0.5), 0.3, '(2.0 - 1.4) x 0.5 = 0.3')
  near(agonyBonus(4.0, 0.8), 1.0, 'capped at 1.0')
  near(poisonPowerBonus(0.7, 0.7), 1.0, 'B5 shares cap 1.0 with vsPoison on Contaminate')
  assert.equal(paApplies(false, false), true)
  assert.equal(paApplies(true, false), false, 'crit skips PA')
  assert.equal(paApplies(false, true), false, 'Mobster debt burst skips PA')

  // Flat-only tick invariant: hpBite and hpBleed must NEVER be multiplied by Perfect Agony
  const flat = 100, hpBite = 500, hpBleed = 40
  assert.equal(poisonTickTotal(flat, 0, hpBite, 1, hpBleed), 640)
  assert.equal(poisonTickTotal(flat, 0.8, hpBite, 1, hpBleed), 720, 'only flat 100 x 1.8 = 180 (+ 500 + 40 = 720)')

  const t4b = TALENTS.find((t) => t.id === 'th_t4b')!
  assert.equal(t4b.name, 'วิถีพิษคริ')
  near(t4b.mod(1).thPerfectAgony ?? 0, 0.5)
  near(t4b.mod(2).thPerfectAgony ?? 0, 0.8)
})

const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}
const { migrateThiefRogueRework, newSave, THIEF_REWORK_VER } = await import('../src/save')
type SaveData = ReturnType<typeof newSave>

test('migration v6: a v5 Thief / Rogue resets class 1 web + talents once · Rogue job2 web + talents stay', () => {
  assert.equal(THIEF_REWORK_VER, 6)
  const s = newSave('p2d', 'human')
  Object.assign(s, {
    job: 'thief', job2: 'rogue', thiefRogueRework: 5, skillPoints: 3,
    jobTree: { thief_core1: 5, thief_b1: 2 }, jobTalents: { 4: { id: 'th_t4b', rank: 2 } },
    job2Points: 2, job2Tree: { rogue_s3p: 5, rg_k1: 3 }, job2Talents: { 1: { id: 'rg_t1_combo', rank: 2 } },
  } as Partial<SaveData>)
  migrateThiefRogueRework(s)
  assert.equal(s.thiefRogueRework, 6)
  assert.deepEqual(s.jobTree, {}); assert.deepEqual(s.jobTalents, {})
  assert.equal(s.skillPoints, 3 + 7)
  assert.deepEqual(s.job2Tree, { rogue_s3p: 5, rg_k1: 3 })
  assert.deepEqual(s.job2Talents, { 1: { id: 'rg_t1_combo', rank: 2 } })
  assert.equal(s.job2Points, 2)
  s.jobTree = { thief_v1: 1 }
  migrateThiefRogueRework(s)
  assert.deepEqual(s.jobTree, { thief_v1: 1 }, 'idempotent')

  const bad = newSave('bad', 'human')
  Object.assign(bad, { job: 'thief', thiefRogueRework: 5, jobTree: { thief_v1: 'x', thief_v2: -3, thief_a1: 4 } as unknown as SaveData['jobTree'], skillPoints: Number.NaN })
  assert.doesNotThrow(() => migrateThiefRogueRework(bad))
  assert.equal(bad.skillPoints, 4)
})

test('WIS Shadow Ward & LUK Gambler\'s Edge: formulas, Thief-only + Mobster parity, statLines, and 19-key sweep', () => {
  near(shadowWard(0), 0)
  near(shadowWard(50), 0.15)
  near(shadowWard(51), 0.15, 'capped at 15%')
  assert.equal(shadowWardApplies(true, 100, false), true)
  assert.equal(shadowWardApplies(false, 999, false), true)
  assert.equal(shadowWardApplies(false, 100, true), true)
  assert.equal(shadowWardApplies(false, 100, false), false, 'plain physical hit skips Shadow Ward')

  const wisStats = { str: 1, vit: 1, wis: 51, dex: 1, int: 1, luk: 1, agi: 1 }
  near(heroStats(baseInput({ job: 'thief', stats: wisStats })).thShadowWard, 0.15)
  near(heroStats(baseInput({ job: 'thief', job2: 'mobster', stats: wisStats })).thShadowWard, 0.15, 'Mobster inherits Thief off-meta')
  assert.equal(heroStats(baseInput({ job: 'archer', stats: wisStats })).thShadowWard, 0, 'non-Thief gets 0')

  assert.equal(gamblerLuckyRes('LUCKY!', 'thief', false), KIT.thiefLuckyRes)
  assert.equal(gamblerLuckyRes('LUCKY!', 'thief', true), 0, 'ICD 1/hero turn')
  assert.equal(gamblerLuckyRes('EVADE!', 'thief', false), 0)
  assert.equal(gamblerLuckyRes('LUCKY!', 'archer', false), 0)

  const wisLines = statLines('wis', 'thief', 51)
  assert.ok(wisLines.cls.some((l) => l.includes('Shadow Ward') && l.includes('15%')))
  const lukLines = statLines('luk', 'thief', 21)
  assert.ok(lukLines.cls.some((l) => l.includes('LUCKY!') && l.includes(`+${KIT.thiefLuckyRes} Energy`)))

  const P2D_KEYS = [
    'thiefVenomBasicShare',
    'thiefDetAtShare', 'thiefDetShare', 'thiefDetMin', 'thiefDetPoisonBase', 'thiefDetPoisonLv', 'thiefDetSplash', 'thiefDetLeechShare',
    'thiefLeechLv', 'thiefLeechInt', 'thiefLeechCap', 'thiefLeechTurnCap', 'thiefDetBossRefund',
    'thiefAgonyFrom', 'thiefAgonyCap', 'thiefAgonyHitCut',
    'thiefWardPer', 'thiefWardCap', 'thiefLuckyRes',
  ] as const
  assert.equal(P2D_KEYS.length, 19)
  for (const key of P2D_KEYS) {
    assert.ok(fieldFor('kit', key), `missing tunable whitelist: ${key}`)
    const ex = explainField('kit', key)
    assert.ok(ex.label.trim().length > 0, `empty label: ${key}`)
    assert.ok(ex.effect.trim().length > 0 && ex.effect !== 'ตัวคูณคิทคลาสหลัก', `fallback explain: ${key}`)
  }
})
