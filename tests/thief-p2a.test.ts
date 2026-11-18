// Thief P2'a foundation (design/p2/MAIN-VS-REV4.md §4) on top of main's live rework: pure helpers, แทงพิษ cost / floor,
// Energy loop (สลับคม, Q3: free inside ร่างเงา). Later commits add the core column, row-2 talents and the save migration.
// Run: node tools/test.mjs thief-p2a
import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAYER, type Stats } from '../src/data/game-data'
import { JOBS, RES_RULES } from '../src/data/jobs'
import { autoCost, KIT, thiefBloodKingOn, thiefBossCritHeal, thiefCondLeechAdd, thiefKillHeal, thiefS1Woven, thiefStackCritAdd } from '../src/data/skill-math'
import { BRANCHES, branchesOf, nodeById, TALENTS, TREE } from '../src/data/tree'

const st = (over: Partial<Stats>): Stats => ({ ...PLAYER, ...over })
const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)
const A_LINE = ['thief_a1', 'thief_a2', 'thief_a3', 'thief_a4']
const CORE = ['thief_c1', 'thief_c2', 'thief_c3', 'thief_c4']
const TAL = ['th_t2a', 'th_t2b', 'th_t2c']
const node = (id: string) => { const n = nodeById(id); assert.ok(n, id); return n }
const tal = (id: string) => { const t = TALENTS.find((x) => x.id === id); assert.ok(t, id); return t }

test('web: one core column (c1 / c2 หมายหัว / c3 / c4), old columns + filler nodes gone, a-line = main', () => {
  for (const id of [...A_LINE, ...CORE]) assert.ok(TREE.some((n) => n.id === id), id)
  for (const id of TAL) assert.ok(TALENTS.some((t) => t.id === id), id)
  for (const id of ['thief_crit', 'thief_blood']) assert.ok(!BRANCHES.some((b) => b.id === id), id)
  for (const id of ['thief_l1', 'thief_l2', 'thief_l3', 'thief_l4', 'thief_b3']) assert.ok(!TREE.some((n) => n.id === id), id)
  const core = branchesOf('thief').filter((b) => b.line === 'core')
  assert.deepEqual(core.map((b) => b.id), ['thief_core'])
  for (const [i, id] of CORE.entries()) { assert.equal(node(id).branch, 'thief_core', id); assert.equal(node(id).tier, i + 1, id) }
  assert.ok((node('thief_c2').mod(node('thief_c2').max).thMark ?? 0) > 0, 'c2 stays main\'s หมายหัว')
  assert.equal(node('thief_a1').name, 'เคลือบพิษ', 'a-line untouched')
  assert.equal(node('thief_c4').max, 1)
})

test('core mods: PLAYER keys, finite, >= 0, never above full; full-level numbers', () => {
  for (const id of CORE) {
    const n = node(id), full = n.mod(n.max)
    for (let lv = 1; lv <= n.max; lv++) {
      for (const [k, v] of Object.entries(n.mod(lv))) {
        assert.ok(k in PLAYER, `${id} ${k} in PLAYER`)
        assert.ok(typeof v === 'number' && Number.isFinite(v) && v >= 0, `${id} L${lv} ${k}=${v}`)
        assert.ok(v <= (full[k as keyof Stats] ?? 0) + 1e-9, `${id} L${lv} ${k} <= full`)
      }
      assert.ok(!/undefined|NaN/.test(n.desc(lv)), `${id} L${lv}: ${n.desc(lv)}`)
    }
  }
  const c1 = st(node('thief_c1').mod(5)), c3 = st(node('thief_c3').mod(5))
  near(thiefCondLeechAdd(c1, KIT.thiefKindsAt), 0.135, 'c1 Lv 5 multi = 13.5%')
  near(thiefKillHeal(c3, 0), 0.12, 'c3 Lv 5')
  near(thiefBossCritHeal(c3), 0.045, 'c3 boss crit')
  assert.equal(thiefBloodKingOn(st(node('thief_c4').mod(1)), 40, 100), true)
})

test('row-2 talents: ขโมยจังหวะ / จุดบอดซ้อนพิษ / จังหวะสลับมีด numbers, ranks > 0, no autoCostCut', () => {
  for (const id of TAL) {
    const t = tal(id)
    for (const r of [1, 2]) {
      assert.ok(t.desc(r).length > 0 && !/undefined|NaN/.test(t.desc(r)), `${id} r${r}`)
      for (const [k, v] of Object.entries(t.mod(r))) { assert.ok(k in PLAYER, `${id} ${k}`); assert.ok(typeof v === 'number' && v > 0, `${id} r${r} ${k}=${v}`) }
    }
  }
  assert.deepEqual(tal('th_t2a').mod(1), { dodgeEnergy: 15, thDodgeCdCut: 1, thDodgeCdIcd: 3 })
  assert.deepEqual(tal('th_t2a').mod(2), { dodgeEnergy: 25, thDodgeCdCut: 1, thDodgeCdIcd: 2 })
  near(tal('th_t2b').mod(2).thStackCritTal ?? 0, 0.016)
  assert.deepEqual(tal('th_t2c').mod(1), { thWeaveDmg: 0.25, thWeaveRes: 10 })
  assert.deepEqual(tal('th_t2c').mod(2), { thWeaveDmg: 0.4, thWeaveRes: 16 })
  assert.ok(!('autoCostCut' in tal('th_t2c').mod(2)))
  near(thiefStackCritAdd(st(tal('th_t2b').mod(2)), KIT.thiefStackCritTalMax), 0.016 * KIT.thiefStackCritTalMax, 'r2 at the stack cap')
})

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
