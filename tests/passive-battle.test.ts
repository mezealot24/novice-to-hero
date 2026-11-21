// PoE Passive Tree Phase 1 (Thief-Line Constellation) BattleScene Combat Hooks unit tests.
// Run: node tools/test.mjs passive-battle
import test from 'node:test'
import assert from 'node:assert/strict'
import { heroStats, type StatsInput } from '../src/data/meta'
import { KIT, thiefUltBudget } from '../src/data/skill-math'
import { shieldGain } from '../src/data/stack-math'
import { gamblerLuckyRes, shadowWardApplies } from '../src/data/thief-offmeta'
import {
  applyDeathMarkState,
  applyMistDr,
  applyToxicOverheal,
  bloodFuryDmgMul,
  bloodFurySelfCost,
  counterDefBonusDmg,
  deathMarkEarlyPop,
  deathMarkEchoDmg,
  deathMarkNetHpDmg,
  flurryStabMul,
  luckyReprisalAction,
  mobsterFlurrySlashMul,
  physLeechMul,
  pickDeathMarkTarget,
  resolveMonsterShieldSoak,
  s3ShieldPierceOf,
  shieldCutMul,
  shouldRecordDeathMark,
  swordBreakTurnsOf,
  swordS1Cd,
  swordS3BreakTurns,
  swordTakenMul,
} from '../src/data/passive-battle'
import { SWORD_S1 } from '../src/data/jobs'

const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)

const thiefInput = (over: Partial<StatsInput> = {}): StatsInput => ({
  race: 'human',
  job: 'thief',
  jobLevel: 40,
  stats: { str: 20, vit: 40, wis: 40, dex: 20, int: 60, luk: 30, agi: 30 },
  equipped: {},
  skills: { smash: 1, firstaid: 0, tough: 0, focus: 0, power: 0, iron: 0 },
  passiveNodes: [],
  ...over,
})

test('Hook 1 (thDeathMark): target selection, echo_double refresh, net HP recording, pure B6 echo & early pop', () => {
  // Target picking: highest HP alive preferring unguarded (!maidenGuarded)
  const mons = [
    { id: 'deadBoss', dead: true, hp: 9999, guarded: false },
    { id: 'drainer', dead: false, hp: 5000, guarded: true },
    { id: 'maiden', dead: false, hp: 1200, guarded: false },
    { id: 'add', dead: false, hp: 800, guarded: false },
  ]
  assert.equal(pickDeathMarkTarget(mons, (m) => m.guarded)?.id, 'maiden', 'prefers highest-HP unguarded')
  assert.equal(
    pickDeathMarkTarget([{ id: 'onlyGuarded', dead: false, hp: 5000, guarded: true }], (m) => m.guarded)?.id,
    'onlyGuarded',
    'falls back to guarded if no unguarded target exists',
  )
  assert.equal(pickDeathMarkTarget([{ id: 'x', dead: true, hp: 100, guarded: false }], () => false), undefined)

  // Apply & echo_double refresh: refreshing already-marked target must NOT wipe recorded damage
  const fresh = applyDeathMarkState(0, 999)
  assert.deepEqual(fresh, { turns: KIT.thiefDeathMarkTurns, dmg: 0 })
  const refreshed = applyDeathMarkState(1, 640)
  assert.deepEqual(refreshed, { turns: KIT.thiefDeathMarkTurns, dmg: 640 }, 'echo_double preserves deathMarkDmg')

  // Recording gates: active non-DoT hero hits only
  const baseCheck = {
    dot: false,
    pure: false,
    allyHitting: false,
    popping: false,
    mobExecuting: false,
    markTurns: 2,
    ratio: KIT.thiefDeathMarkEcho,
  }
  assert.equal(shouldRecordDeathMark(baseCheck), true)
  assert.equal(shouldRecordDeathMark({ ...baseCheck, dot: true }), false, 'excludes DoT ticks')
  assert.equal(shouldRecordDeathMark({ ...baseCheck, pure: true }), false, 'excludes pure B6 echo')
  assert.equal(shouldRecordDeathMark({ ...baseCheck, allyHitting: true }), false, 'excludes ally hits')
  assert.equal(shouldRecordDeathMark({ ...baseCheck, popping: true }), false, 'excludes pop re-entry')
  assert.equal(shouldRecordDeathMark({ ...baseCheck, mobExecuting: true }), false, 'excludes Mobster execute')
  assert.equal(shouldRecordDeathMark({ ...baseCheck, markTurns: 0 }), false, 'excludes unmarked target')
  assert.equal(shouldRecordDeathMark({ ...baseCheck, ratio: 0 }), false, 'excludes when keystone off')

  // Net HP lost excludes overkill below 0
  assert.equal(deathMarkNetHpDmg(1000, 650), 350)
  assert.equal(deathMarkNetHpDmg(120, -80), 120, 'overkill clamped at 0 HP')
  assert.equal(deathMarkNetHpDmg(0, -50), 0)

  // Echo uses st.thDeathMark directly (0.35), zero double-mul with KIT.thiefDeathMarkEcho
  const dmSt = heroStats(thiefInput({ passiveNodes: ['th_m_blade1', 'th_m_blade2', 'th_n_open', 'th_k_deathmark'] }))
  near(dmSt.thDeathMark, KIT.thiefDeathMarkEcho)
  assert.equal(deathMarkEchoDmg(1000, dmSt.thDeathMark), 350, '35% pure echo, not 0.35 * 0.35')
  assert.equal(deathMarkEchoDmg(0, dmSt.thDeathMark), 0, 'no burst when nothing recorded')
  assert.equal(deathMarkEchoDmg(1, dmSt.thDeathMark), 1, 'min 1 dmg when recorded > 0')

  // Early pop at HP < 15% maxHp (strictly <, alive, and has recorded damage)
  assert.equal(deathMarkEarlyPop(149, 1000, 2, 400), true, '14.9% < 15% pops early')
  assert.equal(deathMarkEarlyPop(150, 1000, 2, 400), false, 'exact 15% does not pop yet')
  assert.equal(deathMarkEarlyPop(0, 1000, 2, 400), false, 'dead target clears without nested pop')
  assert.equal(deathMarkEarlyPop(100, 1000, 2, 0), false, '0 recorded dmg does not waste mark early')

  // Pure B6 echo bypasses monster shield completely
  assert.deepEqual(resolveMonsterShieldSoak(500, 350, 0, true), {
    absorbed: 0,
    remShield: 500,
    remDmg: 350,
  })
})

test('Hook 1 (thDeathMark): 2-hero-turn lifecycle records non-DoT hero hits and pops once on turn 2 expiry', () => {
  let turns = 0
  let recorded = 0
  let monHp = 2000
  const maxHp = 2000

  // Hero turn 1: Ult applies Death Mark (2 turns) and hits for 400 net HP (plus 100 soaked by shield)
  ;({ turns, dmg: recorded } = applyDeathMarkState(turns, recorded))
  assert.equal(turns, 2)
  const hit1Hp0 = monHp
  monHp -= 400
  if (shouldRecordDeathMark({ dot: false, pure: false, allyHitting: false, popping: false, mobExecuting: false, markTurns: turns, ratio: 0.35 })) {
    recorded += deathMarkNetHpDmg(hit1Hp0, monHp)
  }
  assert.equal(recorded, 400)
  // End of hero turn 1: tick down 2 -> 1 (does not pop yet)
  turns--
  assert.equal(turns, 1)

  // Monster turn: poison DoT hits for 300 (ignored by Death Mark)
  const dotHp0 = monHp
  monHp -= 300
  if (shouldRecordDeathMark({ dot: true, pure: false, allyHitting: false, popping: false, mobExecuting: false, markTurns: turns, ratio: 0.35 })) {
    recorded += deathMarkNetHpDmg(dotHp0, monHp)
  }
  assert.equal(recorded, 400, 'DoT must not add to Death Mark')

  // Hero turn 2: Skill 3 hits for 600 net HP -> still above 15% (700/2000 = 35%)
  const hit2Hp0 = monHp
  monHp -= 600
  recorded += deathMarkNetHpDmg(hit2Hp0, monHp)
  assert.equal(deathMarkEarlyPop(monHp, maxHp, turns, recorded), false)
  assert.equal(recorded, 1000)

  // End of hero turn 2: tick down 1 -> 0 -> pop 35% of 1000 = 350 pure B6 echo
  turns--
  assert.equal(turns, 0)
  const echo = deathMarkEchoDmg(recorded, 0.35)
  assert.equal(echo, 350)
  recorded = 0
  monHp -= echo
  assert.equal(monHp, 350)
})

test('Hook 2 (thMistDr & thDefShieldCut): multiplicative DR with Shadow Ward & shield cut without double DEF cut', () => {
  const mistPath = ['th_m_shadow1', 'th_n_step', 'th_m_shadow3', 'th_k_mist']
  const preMist = heroStats(thiefInput({ passiveNodes: ['th_m_shadow1', 'th_n_step', 'th_m_shadow3'] }))
  const withMist = heroStats(thiefInput({ passiveNodes: mistPath }))

  near(withMist.thMistDr, KIT.thiefMistDr)
  near(withMist.thDefShieldCut, KIT.thiefMistDefCut)
  assert.equal(withMist.def, Math.round(preMist.def * (1 - KIT.thiefMistDefCut)), 'heroBuild owns -30% DEF')

  // Multiplicative DR: 15% WIS Shadow Ward followed by 25% Mistwalker DR -> 0.85 * 0.75 = 63.75% dmg taken
  const afterWard = Math.max(1, Math.ceil(1000 * (1 - 0.15))) // 850
  const afterMist = applyMistDr(afterWard, withMist.thMistDr) // ceil(850 * 0.75) = 638
  assert.equal(afterMist, 638, 'multiplicative DR, never additive 40% or 100%')
  assert.equal(applyMistDr(1, 0.25), 1, 'minimum 1 damage')
  assert.equal(applyMistDr(100, 0), 100, '0 DR is no-op')
  assert.equal(applyMistDr(100, 1.5), 10, 'clamped to 90% max DR, never 100% immune')

  // Applies strictly on shadowWardApplies conditions
  assert.equal(shadowWardApplies(true, 100, false), true, 'magic')
  assert.equal(shadowWardApplies(false, 999, false), true, 'guaranteed hit / slam')
  assert.equal(shadowWardApplies(false, 100, true), true, 'trueSight')
  assert.equal(shadowWardApplies(false, 100, false), false, 'plain physical hit skips Mist DR')

  // Shield cut multiplier: 30% cut across addShield, waveShield, aegis, overheal
  near(shieldCutMul(0), 1)
  near(shieldCutMul(withMist.thDefShieldCut), 0.7)
  const normalShield = shieldGain(0, Math.round(200 * (1 + 0.1) * shieldCutMul(0)), 1000)
  const mistShield = shieldGain(0, Math.round(200 * (1 + 0.1) * shieldCutMul(withMist.thDefShieldCut)), 1000)
  assert.equal(normalShield, 220)
  assert.equal(mistShield, 154, '220 * 0.7 = 154')
})

test('Hook 3 (thFlurryDmgCut & thMobFlurry): Shadow Dance -10% per stab & Mobster extra 0.5x slash (no double-mul)', () => {
  const flurryPath = ['th_m_blade1', 'th_m_blade2', 'th_n_adapt_edge', 'th_k_flurry']
  const st = heroStats(thiefInput({ job2: 'mobster', passiveNodes: flurryPath }))
  near(st.thFlurryDmgCut, KIT.thiefFlurryDmgCut)
  assert.equal(st.thMobFlurry, 1, 'thMobFlurry is a flag (1), not 0.5')

  // Shadow Dance per-stab multiplier matches KIT.thiefUlt * (1 - thFlurryDmgCut) * hitPow * (1 + thUltAgi)
  const hitPow = 1.25
  near(flurryStabMul(hitPow, st.thUltAgi, 0), KIT.thiefUlt * hitPow * (1 + st.thUltAgi))
  near(flurryStabMul(hitPow, st.thUltAgi, st.thFlurryDmgCut), KIT.thiefUlt * 0.9 * hitPow * (1 + st.thUltAgi))
  assert.ok(thiefUltBudget(st, { skillCrit: 0.25, critMul: 2.0 }, false) > 0)

  // Mobster extra slash: 0.5 * h2 * (1 + pskill), NOT 0.5 * 0.5
  const h2 = 1.4
  near(mobsterFlurrySlashMul(h2, st.pskill, 0), 0)
  near(mobsterFlurrySlashMul(h2, st.pskill, st.thMobFlurry), KIT.thiefMobFlurryMul * h2 * (1 + st.pskill))
})

test('Hook 4 (thEldritchVenom & thPhysLeechCut): Toxic Overheal shield cap, non-shrink guard & physical-only leech cut', () => {
  const prePath = ['th_m_alch1', 'th_m_alch2', 'th_n_lucky']
  const eldPath = [...prePath, 'th_k_eldritch']
  const preSt = heroStats(thiefInput({ passiveNodes: prePath, equipped: {} }))
  const eldSt = heroStats(thiefInput({ passiveNodes: eldPath, equipped: {} }))

  assert.equal(eldSt.thEldritchVenom, 1)
  near(eldSt.thPhysLeechCut, KIT.thiefPhysLeechCut)
  near(eldSt.lifesteal, preSt.lifesteal, 'heroBuild does NOT pre-cut st.lifesteal')

  // Toxic Overheal shield capped at 20% max HP (200 for maxHp = 1000)
  assert.equal(applyToxicOverheal(0, 120, 1000), 120)
  assert.equal(applyToxicOverheal(150, 120, 1000), 200, 'capped at 20% Max HP')
  assert.equal(applyToxicOverheal(300, 120, 1000), 300, 'never shrinks existing shield above 20% cap')
  assert.equal(applyToxicOverheal(0, 100, 1000, KIT.thiefOverhealCap, KIT.thiefMistDefCut), 70, 'respects Mistwalker -30% shield cut')
  assert.equal(applyToxicOverheal(0, 500, 1000, KIT.thiefOverhealCap, KIT.thiefMistDefCut), 200, 'still capped at 20% Max HP')
  assert.equal(applyToxicOverheal(50, 0, 1000), 50, 'zero overheal is no-op')

  // Physical lifesteal cut applies ONLY to physical hits (magic = false)
  near(physLeechMul(false, eldSt.thPhysLeechCut), 0.5, 'physical lifesteal halved')
  near(physLeechMul(true, eldSt.thPhysLeechCut), 1, 'magic hits untouched')
  near(physLeechMul(false, 0), 1, 'no cut when keystone off')
})

test('Hook 5 (thS3ShieldPierce): Skill 3 shield bypass, sub-proc exclusion & partial pierce math', () => {
  const piercePath = ['th_m_blade1', 'th_n_weave', 'th_m_blade3', 'th_n_pierce']
  const st = heroStats(thiefInput({ passiveNodes: piercePath }))
  near(st.thS3ShieldPierce, 1)

  // Gate checks: ONLY active Skill 3 non-DoT hits with src === 'skill'
  assert.equal(s3ShieldPierceOf(true, 'skill', false, st.thS3ShieldPierce), 1, 'S3 skill hit pierces 100%')
  assert.equal(s3ShieldPierceOf(false, 'skill', false, st.thS3ShieldPierce), 0, 'S1/S2 skill hit does NOT pierce')
  assert.equal(s3ShieldPierceOf(true, 'other', false, st.thS3ShieldPierce), 0, 'S3 sub-procs (Voracity/Blade\'s End/Raid/knives) do NOT pierce')
  assert.equal(s3ShieldPierceOf(false, 'ult', false, st.thS3ShieldPierce), 0, 'Ult does NOT pierce')
  assert.equal(s3ShieldPierceOf(true, 'skill', true, st.thS3ShieldPierce), 0, 'DoT does NOT pierce')

  // Monster shield soak resolution
  assert.deepEqual(resolveMonsterShieldSoak(200, 150, 0), { absorbed: 150, remShield: 50, remDmg: 0 }, '0% pierce: shield soaks all')
  assert.deepEqual(resolveMonsterShieldSoak(200, 150, 1), { absorbed: 0, remShield: 200, remDmg: 150 }, '100% pierce: shield untouched, full dmg hits HP')
  assert.deepEqual(resolveMonsterShieldSoak(200, 150, 0.5), { absorbed: 75, remShield: 125, remDmg: 75 }, '50% pierce: shield soaks floor(50%)')
  assert.deepEqual(resolveMonsterShieldSoak(30, 150, 0.5), { absorbed: 30, remShield: 0, remDmg: 120 }, '50% pierce when shield < cap: breaks shield and passes rest')
})

test('Hook 6 (thLuckyKnife): Rogue/Stalker knife, Mobster/Kingpin poison, Base Thief passive-only & 1/hero-turn ICD', () => {
  const luckyPath = ['th_m_alch1', 'th_m_alch2', 'th_n_lucky']
  const st = heroStats(thiefInput({ passiveNodes: luckyPath }))
  assert.equal(st.thLuckyKnife, 1)

  // Reprisal action per Job2 (Stalker keeps j2='rogue', Kingpin keeps j2='mobster')
  assert.equal(luckyReprisalAction(st.thLuckyKnife, 'rogue'), 'knife')
  assert.equal(luckyReprisalAction(st.thLuckyKnife, 'mobster'), 'poison')
  assert.equal(luckyReprisalAction(st.thLuckyKnife, undefined), 'none', 'base Thief matches th_n_lucky.desc')
  assert.equal(luckyReprisalAction(0, 'rogue'), 'none', 'off when node not allocated')

  // Inherits Gambler's Edge 1/hero-turn ICD
  assert.equal(gamblerLuckyRes('LUCKY!', 'thief', false), KIT.thiefLuckyRes)
  assert.equal(gamblerLuckyRes('LUCKY!', 'thief', true), 0, 'ICD blocks second LUCKY! proc in same hero turn')
  assert.equal(gamblerLuckyRes('EVADE!', 'thief', false), 0, 'plain EVADE! never triggers LUCKY! proc')
  assert.equal(gamblerLuckyRes('LUCKY!', 'archer', false), 0, 'Thief-line only')
})

test('Hook 7 (swordTakenMul): Iron Fortress DR capped at 50% and multiplies cleanly with Cleavestorm vulnerability', () => {
  near(swordTakenMul(0, 0), 1)
  near(swordTakenMul(KIT.swordIronDr, 0), 1 - KIT.swordIronDr)
  near(swordTakenMul(0, KIT.swordCleaveTaken), 1 + KIT.swordCleaveTaken)
  near(swordTakenMul(KIT.swordIronDr, KIT.swordCleaveTaken), (1 - KIT.swordIronDr) * (1 + KIT.swordCleaveTaken))
  near(swordTakenMul(0.95, 0), 0.5, 'DR capped at 50%, never 0/immune')
  near(swordTakenMul(-0.5, -0.2), 1, 'negative values clamped safely')
})

test('Hook 8 (counterDefBonusDmg): P.DEF bonus flat counter damage', () => {
  assert.equal(counterDefBonusDmg(100, 0), 0)
  assert.equal(counterDefBonusDmg(0, KIT.swordCounterDefMul), 0)
  assert.equal(counterDefBonusDmg(100, KIT.swordCounterDefMul), Math.round(100 * KIT.swordCounterDefMul))
  assert.equal(counterDefBonusDmg(1, 0.2), 1, 'minimum 1 dmg when both def and mul > 0')
})

test('Hook 9 (swordS1Cd): ดาบสยบมนตร์ cooldown reduction with floor of 2', () => {
  assert.equal(swordS1Cd(0), SWORD_S1.cd)
  assert.equal(swordS1Cd(KIT.swordS1CdCut), SWORD_S1.cd - KIT.swordS1CdCut)
  assert.equal(swordS1Cd(10), 2, 'clamped to minimum 2 turns')
  assert.equal(swordS1Cd(-2), SWORD_S1.cd, 'negative cut ignored')
})

test('Hook 10 (bloodFuryDmgMul & bloodFurySelfCost): threshold < 60% HP & strictly non-lethal cast cost', () => {
  near(bloodFuryDmgMul(599, 1000, KIT.swordBloodFuryDmg), 1 + KIT.swordBloodFuryDmg)
  near(bloodFuryDmgMul(600, 1000, KIT.swordBloodFuryDmg), 1, 'exact 60% does not trigger')
  near(bloodFuryDmgMul(800, 1000, KIT.swordBloodFuryDmg), 1)
  near(bloodFuryDmgMul(0, 1000, KIT.swordBloodFuryDmg), 1, 'dead hero stays 1x')
  near(bloodFuryDmgMul(300, 1000, 0), 1, 'off when stat is 0')

  assert.equal(bloodFurySelfCost(1000, KIT.swordBloodFurySelf), 40)
  assert.equal(bloodFurySelfCost(10, KIT.swordBloodFurySelf), 1, 'min 1 HP cost when hp > 1')
  assert.equal(bloodFurySelfCost(2, KIT.swordBloodFurySelf), 1, 'leaves 1 HP')
  assert.equal(bloodFurySelfCost(1, KIT.swordBloodFurySelf), 0, 'never lethal at 1 HP')
  assert.equal(bloodFurySelfCost(0, KIT.swordBloodFurySelf), 0)
  assert.equal(bloodFurySelfCost(1000, 0), 0)
})

test('Hook 11 (swordBreakTurnsOf & swordS3BreakTurns): S1/S3 skill hits only, excludes sub-procs & DoT', () => {
  assert.equal(swordBreakTurnsOf(0), 0)
  assert.equal(swordBreakTurnsOf(1), KIT.swordS3BreakTurns)
  assert.equal(swordS3BreakTurns(true, 'skill', false, 1), KIT.swordS3BreakTurns)
  assert.equal(swordS3BreakTurns(false, 'skill', false, 1), 0, 'outside S3')
  assert.equal(swordS3BreakTurns(true, 'other', false, 1), 0, 'sub-procs excluded')
  assert.equal(swordS3BreakTurns(true, 'ult', false, 1), 0, 'ult excluded')
  assert.equal(swordS3BreakTurns(true, 'skill', true, 1), 0, 'DoT excluded')
})
