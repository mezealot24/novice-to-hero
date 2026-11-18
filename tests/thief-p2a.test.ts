// Thief P2'a foundation (design/p2/MAIN-VS-REV4.md §4) on top of main's live rework: pure helpers, แทงพิษ cost / floor,
// Energy loop (สลับคม, Q3: free inside ร่างเงา). Later commits add the core column, row-2 talents and the save migration.
// Run: node tools/test.mjs thief-p2a
import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAYER, type Stats } from '../src/data/game-data'
import { JOBS, RES_RULES } from '../src/data/jobs'
import { autoCost, KIT, thiefBloodKingOn, thiefBossCritHeal, thiefCondLeechAdd, thiefKillHeal, thiefS1Woven, thiefStackCritAdd } from '../src/data/skill-math'

const st = (over: Partial<Stats>): Stats => ({ ...PLAYER, ...over })
const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)

test('pure helpers: leech kinds, kill heal, boss crit, blood king, stack crit', () => {
  const s = st({ thCondLeech: 0.09 })
  assert.equal(thiefCondLeechAdd(s, 0), 0)
  near(thiefCondLeechAdd(s, 1), 0.09)
  near(thiefCondLeechAdd(s, KIT.thiefKindsAt), 0.09 * KIT.thiefCondLeechMulti, 'two kinds')
  assert.equal(thiefCondLeechAdd(st({}), 2), 0)
  const k = st({ thKillLeech: 0.12 })
  near(thiefKillHeal(k, 0), 0.12)
  near(thiefKillHeal(k, 10), 0.12 + 10 * KIT.thiefKillPoisonHeal)
  near(thiefKillHeal(k, 400), 0.12 + KIT.thiefKillPoisonHealCap, 'poison part capped')
  near(thiefKillHeal(k, -5), 0.12, 'negative poison counts as 0')
  assert.equal(thiefKillHeal(st({}), 40), 0, 'no node -> no poison heal either')
  near(thiefBossCritHeal(k), 0.12 * KIT.thiefBossCritLeech)
  const bk = st({ thBloodKing: 1 })
  assert.equal(thiefBloodKingOn(bk, 44, 100), true)
  assert.equal(thiefBloodKingOn(bk, 45, 100), false, '45% is not below 45%')
  assert.equal(thiefBloodKingOn(st({}), 1, 100), false)
  const t = st({ thStackCritTal: 0.016 })
  near(thiefStackCritAdd(t, 5), 0.08)
  near(thiefStackCritAdd(t, 99), 0.016 * KIT.thiefStackCritTalMax, 'stacks above the cap do nothing')
  assert.equal(thiefStackCritAdd(t, -3), 0)
  assert.equal(thiefStackCritAdd(st({}), 20), 0)
})

test('s1Weave (Q3): woven only for the Thief line, only outside ร่างเงา', () => {
  assert.equal(thiefS1Woven('thief', true, false), true)
  assert.equal(thiefS1Woven('thief', false, false), false)
  assert.equal(thiefS1Woven('thief', true, true), false, 'ร่างเงา: free Skill 1 spam like live')
  assert.equal(thiefS1Woven('archer', true, false), false)
})

test('autoCost: แทงพิษ 45, floor 30 (Rogue / Mobster share JOBS.thief), other classes untouched', () => {
  assert.equal(JOBS.thief.auto.cost, 45)
  assert.equal(autoCost(JOBS.thief, st({ autoCostCut: 0 })), 45)
  assert.equal(autoCost(JOBS.thief, st({ autoCostCut: 10 })), 35)
  assert.equal(autoCost(JOBS.thief, st({ autoCostCut: 40 })), KIT.thiefAutoMinCost)
  assert.equal(autoCost(JOBS.mage, st({ autoCostCut: 0 })), JOBS.mage.auto.cost)
  assert.equal(autoCost(JOBS.archer, st({ autoCostCut: 999 })), 10)
})

/** heroAct in numbers: Energy tick, then แทงพิษ when affordable and not woven, else a basic attack. */
function loop(cut: number, shadowTurns: (turn: number) => boolean, turns = 20) {
  const cost = autoCost(JOBS.thief, st({ autoCostCut: cut }))
  let res = 100, weave = false, s1 = 0, basic = 0
  for (let turn = 0; turn < turns; turn++) {
    const shadow = shadowTurns(turn)
    res = Math.min(100, res + RES_RULES.energyPerTurn)
    const c = shadow ? 0 : cost
    if (!thiefS1Woven('thief', weave, shadow) && res >= c) { res -= c; weave = true; s1++ } else { weave = false; basic++ }
  }
  return { s1, basic }
}

test('Energy loop: outside ร่างเงา S1 : basic = 1:1 whatever the cost cut (floor 30 included)', () => {
  for (const cut of [0, 10, 16, 40]) {
    const { s1, basic } = loop(cut, () => false)
    assert.ok(Math.abs(s1 - basic) <= 1, `cut ${cut}: S1 ${s1} vs basic ${basic}`)
  }
})

test('Energy loop: inside ร่างเงา every turn is a free แทงพิษ (no weave)', () => {
  const { s1, basic } = loop(0, () => true, 6)
  assert.deepEqual({ s1, basic }, { s1: 6, basic: 0 })
})
