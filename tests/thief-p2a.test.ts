// P2a Thief foundation (design/p2/P2a-spec.md): web a-line + core column + row-2 talents, pure helpers, Energy loop, save migration.
// Run: node tools/test.mjs thief-p2a
import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAYER, type Stats } from '../src/data/game-data'
import { JOBS } from '../src/data/jobs'
import {
  autoCost, KIT, thiefBloodKingOn, thiefBossCritHeal, thiefCondLeechAdd, thiefKillHeal, thiefS1Woven,
  thiefSpreadAmount, thiefStackCritAdd, thiefToxicHold,
} from '../src/data/skill-math'
import { BRANCHES, branchesOf, nodeById, TALENTS, TREE } from '../src/data/tree'

const st = (over: Partial<Stats>): Stats => ({ ...PLAYER, ...over })
const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)
const A_LINE = ['thief_a1', 'thief_a2', 'thief_a3', 'thief_a4']
const CORE = ['thief_c1', 'thief_c2', 'thief_c3', 'thief_c4']
const TAL = ['th_t2a', 'th_t2b', 'th_t2c']
const node = (id: string) => { const n = nodeById(id); assert.ok(n, id); return n }
const tal = (id: string) => { const t = TALENTS.find((x) => x.id === id); assert.ok(t, id); return t }

test('ids: new web nodes + talents exist, old branches / nodes are gone, one core column', () => {
  for (const id of [...A_LINE, ...CORE]) assert.ok(TREE.some((n) => n.id === id), id)
  for (const id of TAL) assert.ok(TALENTS.some((t) => t.id === id), id)
  for (const id of ['thief_crit', 'thief_blood']) assert.ok(!BRANCHES.some((b) => b.id === id), id)
  for (const id of ['thief_l1', 'thief_l2', 'thief_l3', 'thief_l4', 'thief_b3']) assert.ok(!TREE.some((n) => n.id === id), id)
  const core = branchesOf('thief').filter((b) => b.line === 'core')
  assert.equal(core.length, 1)
  assert.equal(core[0].id, 'thief_core')
  for (const id of CORE) assert.equal(node(id).branch, 'thief_core', id)
})

test('mods: every key is a PLAYER stat, finite, >= 0 and never above the full level', () => {
  for (const id of [...A_LINE, ...CORE]) {
    const n = node(id), full = n.mod(n.max)
    for (let lv = 1; lv <= n.max; lv++) {
      const m = n.mod(lv)
      for (const [k, v] of Object.entries(m)) {
        assert.ok(k in PLAYER, `${id} ${k} in PLAYER`)
        assert.ok(typeof v === 'number' && Number.isFinite(v) && v >= 0, `${id} L${lv} ${k}=${v}`)
        assert.ok(v <= (full[k as keyof Stats] ?? 0) + 1e-9, `${id} L${lv} ${k} <= full`)
      }
    }
  }
})

test('stretch / tidy: whole-number nodes have no decimals in their text, values as specced', () => {
  for (const id of ['thief_a1', 'thief_a3']) {
    const n = node(id)
    for (let lv = 1; lv <= n.max; lv++) {
      const d = n.desc(lv)
      assert.ok(!/\d+\.\d+/.test(d), `${id} L${lv}: ${d}`)
      assert.ok(!/undefined|NaN/.test(d), `${id} L${lv}: ${d}`)
    }
  }
  for (const id of [...A_LINE, ...CORE]) for (let lv = 1; lv <= node(id).max; lv++) assert.ok(!/undefined|NaN/.test(node(id).desc(lv)), `${id} L${lv}`)
  const a1 = node('thief_a1'), a3 = node('thief_a3')
  assert.equal(a1.max, 5)
  assert.equal(a1.mod(1).poison, 1)
  assert.equal(a1.mod(5).poison, 3)
  assert.equal(a3.mod(5).poisonCap, 9)
  near(a1.mod(1).thPoisonPen ?? 0, 0.036, 'a1 L1 pen')
  near(a1.mod(5).thPoisonPen ?? 0, 0.18, 'a1 L5 pen')
  assert.equal(a3.mod(1).thStrikePoison, 1, 'flag is 1 at every level')
  assert.equal(node('thief_a4').max, 1)
  assert.equal(node('thief_c4').max, 1)
})

test('thief_c2: crit per stack = 15% at Lv 5 / 3% at Lv 1 with 8 stacks', () => {
  const c2 = node('thief_c2')
  near(thiefStackCritAdd(st(c2.mod(5)), KIT.thiefStackCritMax), 0.15, 'L5')
  near(thiefStackCritAdd(st(c2.mod(1)), KIT.thiefStackCritMax), 0.03, 'L1')
  near(thiefStackCritAdd(st(c2.mod(5)), 40), 0.15, 'stacks above the cap do nothing')
  assert.equal(thiefStackCritAdd(st(c2.mod(5)), 0), 0)
})

test('pure helpers: leech kinds, kill heal, spread, toxic hold, blood king', () => {
  const s = st({ thCondLeech: 0.09 })
  assert.equal(thiefCondLeechAdd(s, 0), 0)
  near(thiefCondLeechAdd(s, 1), 0.09)
  near(thiefCondLeechAdd(s, 2), 0.135, 'Lv 5 two kinds = 13.5%')
  assert.equal(thiefCondLeechAdd(st({}), 2), 0)
  const k = st({ thKillLeech: 0.12 })
  near(thiefKillHeal(k, 0), 0.12)
  near(thiefKillHeal(k, 10), 0.12 + 0.05)
  near(thiefKillHeal(k, 40), 0.12 + KIT.thiefKillPoisonHealCap, 'poison part capped')
  assert.equal(thiefKillHeal(st({}), 40), 0, 'no node -> no poison heal either')
  near(thiefBossCritHeal(k), 0.045)
  assert.equal(thiefSpreadAmount(7, false), 4)
  assert.equal(thiefSpreadAmount(10, true), 6)
  assert.equal(thiefSpreadAmount(0, true), 0)
  near(thiefToxicHold(st({ thToxicHold: 0.75 })), 0.75)
  near(thiefToxicHold(st({ thToxicHold: 1 })), KIT.thiefToxicHoldCap, 'gear over the cap')
  const bk = st({ thBloodKing: 1 })
  assert.equal(thiefBloodKingOn(bk, 44, 100, false), true)
  assert.equal(thiefBloodKingOn(bk, 45, 100, false), false, '45% is not below 45%')
  assert.equal(thiefBloodKingOn(bk, 90, 100, true), true, 'Shroud opens it')
  assert.equal(thiefBloodKingOn(st({}), 1, 100, true), false)
  assert.equal(thiefS1Woven('thief', true), true)
  assert.equal(thiefS1Woven('thief', false), false)
  assert.equal(thiefS1Woven('archer', true), false)
})

test('row-2 talents: ranks > 0, text, no autoCostCut on th_t2c', () => {
  for (const id of TAL) {
    const t = tal(id)
    for (const r of [1, 2]) {
      assert.ok(t.desc(r).length > 0 && !/undefined|NaN/.test(t.desc(r)), `${id} r${r}`)
      for (const [k, v] of Object.entries(t.mod(r))) {
        assert.ok(k in PLAYER, `${id} ${k}`)
        assert.ok(typeof v === 'number' && v > 0, `${id} r${r} ${k}=${v}`)
      }
    }
  }
  assert.ok(!('autoCostCut' in tal('th_t2c').mod(2)))
})

test('autoCost: แทงพิษ 45, floor 30 (Rogue / Mobster share JOBS.thief), Mage untouched', () => {
  assert.equal(JOBS.thief.auto.cost, 45)
  assert.equal(autoCost(JOBS.thief, st({ autoCostCut: 0 })), 45)
  assert.equal(autoCost(JOBS.thief, st({ autoCostCut: 16 })), 30)
  assert.equal(autoCost(JOBS.thief, st({ autoCostCut: 40 })), KIT.thiefAutoMinCost)
  assert.equal(autoCost(JOBS.mage, st({ autoCostCut: 0 })), JOBS.mage.auto.cost)
})

test('Energy loop: S1 then a basic attack, 1:1 whatever the cost cut (floor 30 included)', async () => {
  const { RES_RULES } = await import('../src/data/jobs')
  for (const cut of [0, 16, 40]) {
    const cost = autoCost(JOBS.thief, st({ autoCostCut: cut }))
    let res = 100, weave = false, s1 = 0, basic = 0
    for (let turn = 0; turn < 20; turn++) {
      res = Math.min(100, res + RES_RULES.energyPerTurn)
      if (!thiefS1Woven('thief', weave) && res >= cost) { res -= cost; weave = true; s1++ } else { weave = false; basic++ }
    }
    assert.ok(Math.abs(s1 - basic) <= 1, `cut ${cut}: S1 ${s1} vs basic ${basic}`)
  }
})

test('a-line hooks: full พิษทนทาน = the hold cap, ★ spread share vs the card half', () => {
  near(thiefToxicHold(st(node('thief_a3').mod(5))), KIT.thiefToxicHoldCap, 'a3 Lv 5')
  assert.ok(thiefToxicHold(st(node('thief_a3').mod(1))) < KIT.thiefToxicHoldCap)
  const a4 = st(node('thief_a4').mod(1))
  assert.equal(a4.thPlagueDeath, 1)
  assert.equal(thiefSpreadAmount(20, a4.thPlagueDeath > 0), Math.ceil(20 * KIT.thiefSpreadShare))
  assert.equal(thiefSpreadAmount(20, false), 10, 'card ven_L1 alone keeps /2')
})

test('core hooks: node numbers at full = Rev 3 targets (leech 13.5%, kill heal 12% + poison, boss crit 4.5%)', () => {
  const c1 = st(node('thief_c1').mod(5)), c3 = st(node('thief_c3').mod(5))
  near(thiefCondLeechAdd(c1, KIT.thiefKindsAt), 0.135, 'c1 Lv 5 multi')
  near(thiefCondLeechAdd(c1, 1), 0.09, 'c1 Lv 5 one kind')
  near(thiefKillHeal(c3, 0), 0.12, 'c3 Lv 5')
  near(thiefKillHeal(c3, 1000), 0.12 + KIT.thiefKillPoisonHealCap, 'c3 poison cap')
  near(thiefBossCritHeal(c3), 0.045, 'c3 boss crit')
  const c4 = st(node('thief_c4').mod(1))
  assert.equal(thiefBloodKingOn(c4, 40, 100, false), true)
  assert.equal(thiefBloodKingOn(c4, 60, 100, false), false)
})
