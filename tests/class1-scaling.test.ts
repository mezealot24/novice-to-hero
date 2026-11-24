// Q 2026-11-24 (thread "Rebalance Hard/Hell combat beyond ult"): class-1 skills keep scaling after the job change.
// - every Job2 / Job3 Lv past 1 = +1 class-1 skill point (granted once, old saves get theirs back)
// - class-1 Skill 1 / Ult / Skill 2 "+" nodes: max Lv 5 -> 10 with a 2nd job -> 15 Awakened
// - Swordsman-line ✨ coat: STR step 10 -> 25 (much harder), base % a little higher
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SWORD_MANA, SWORD_S1, swordCoatPct, swordS1Lv, swordUltLv } from '../src/data/jobs'
import { CLASS1_CAP, class1Cap, nodeById, s2LvOf, setClass1Tier, TREE_RULES } from '../src/data/tree'
import { S2CAP, S2N } from '../src/data/skill-math'
import { newSave, syncClass1 } from '../src/save'

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`)

test('coat: base 2.5% at Lv 1, 3.7% at Lv 5, 4.45% at Lv 10, 5.2% at Lv 15', () => {
  near(swordCoatPct(1, 0), 0.025)
  near(swordCoatPct(5, 0), 0.037)
  near(swordCoatPct(10, 0), 0.0445)
  near(swordCoatPct(15, 0), 0.052)
})

test('coat: +0.25% per 25 STR (STR 167 at Lv 5 = 5.2%)', () => {
  near(swordCoatPct(5, 167), 0.052)
  near(swordCoatPct(5, 24), 0.037)
  near(swordCoatPct(5, 300), 0.067)
  near(swordCoatPct(1, 50), 0.03)
})

test('Swordsman S1 / ult tables reach Lv 15 and the Lv getters follow them', () => {
  for (const a of [SWORD_S1.atkPct, SWORD_S1.str, SWORD_S1.base, SWORD_MANA.awakenStr]) assert.equal(a.length, 15)
  near(SWORD_S1.atkPct[9], 1.5)
  near(SWORD_S1.atkPct[14], 1.8)
  assert.equal(SWORD_S1.base[14], 16)
  assert.equal(swordS1Lv({ swS1Lv: 15 }), 15)
  assert.equal(swordUltLv({ swUltLv: 12 }), 12)
  for (let i = 1; i < 15; i++) {
    assert.ok(SWORD_S1.atkPct[i] > SWORD_S1.atkPct[i - 1])
    assert.ok(SWORD_S1.str[i] > SWORD_S1.str[i - 1])
    assert.ok(SWORD_S1.base[i] > SWORD_S1.base[i - 1])
  }
})

test('class-1 cap: 5 / 10 / 15 by tier, read live by the Skill 1 / Ult / Skill 2 "+" nodes only', () => {
  assert.equal(class1Cap(1), CLASS1_CAP.base)
  assert.equal(class1Cap(2), 10)
  assert.equal(class1Cap(3), 15)
  const s1 = nodeById('swordsman_s1p')!, ult = nodeById('swordsman_ultp')!, s2p = nodeById('sw_guard_p')!
  try {
    setClass1Tier(1)
    assert.equal(s1.max, 5)
    setClass1Tier(2)
    assert.equal(s1.max, 10)
    assert.equal(ult.max, 10)
    assert.equal(s2p.max, 10)
    setClass1Tier(3)
    assert.equal(s1.max, 15)
    assert.equal(nodeById('knight_s3p')!.max, TREE_RULES.powMax) // Job2 nodes keep Lv 5
  } finally {
    setClass1Tier(1)
  }
})

test('Skill 2 "+": Lv 5 = s2Lv 3 as before, each Lv past 5 adds s2Above; defensive numbers capped', () => {
  near(s2LvOf(5), 3)
  near(s2LvOf(10), 3 + 5 * CLASS1_CAP.s2Above)
  near(s2LvOf(15), 6)
  assert.ok(S2N.guardCut(s2LvOf(15)) <= S2CAP.guardCut)
  assert.ok(S2N.tauntWeak(s2LvOf(15)) <= S2CAP.tauntWeak)
  assert.ok(S2N.mshieldTake(s2LvOf(15)) <= S2CAP.mshieldTake)
  // the old top (s2Lv 3) is untouched by the caps
  near(S2N.guardCut(3), 0.55)
  near(S2N.tauntWeak(3), 0.35)
})

test('class-1 points: +1 per Job2 / Job3 Lv past 1, granted once, kept when the 2nd job goes away', () => {
  const s = newSave('t', 'human')
  try {
    s.skillPoints = 0
    syncClass1(s)
    assert.equal(s.skillPoints, 0)
    s.job2 = 'knight'
    s.job2Level = 31
    syncClass1(s)
    assert.equal(s.skillPoints, 30) // Q's save at Job2 Lv 31
    syncClass1(s)
    assert.equal(s.skillPoints, 30) // no double grant
    s.job2Level = 32
    syncClass1(s)
    assert.equal(s.skillPoints, 31)
    s.job2 = undefined // class change keeps Job2 Lv: points stay, nothing new until Job2 Lv goes past 31
    syncClass1(s)
    assert.equal(s.skillPoints, 31)
    s.job2 = 'knight'
    s.job2Level = 50
    s.job3 = 'lordknight'
    s.job3Level = 5
    syncClass1(s)
    assert.equal(s.skillPoints, 49 + 4)
  } finally {
    setClass1Tier(1)
  }
})

// Q 2026-11-24 "ขยายเลเวล node สกิลอื่นๆ": the other multi-level class-1 web nodes follow the cap too
import { TREE } from '../src/data/tree'
test('other class-1 nodes: max x2 / x3 with the 2nd job / Awakening, Lv past the old max worth statAbove, ★ kept', () => {
  const n = TREE.find((x) => x.id === 'swordsman_b1')!
  const star = TREE.find((x) => !x.kind && x.tier === 4)!, starMax = star.max
  try {
    setClass1Tier(1)
    assert.equal(n.max, 5)
    const full = n.mod(5).swS1Shield!
    setClass1Tier(2)
    assert.equal(n.max, 10)
    near(n.mod(10).swS1Shield!, full * (1 + CLASS1_CAP.statAbove))
    near(n.mod(5).swS1Shield!, full) // Lv 1-5 unchanged
    setClass1Tier(3)
    assert.equal(n.max, 15)
    near(n.mod(15).swS1Shield!, full * (1 + 2 * CLASS1_CAP.statAbove))
    assert.equal(star.max, starMax) // ★ keystones keep their max
    assert.ok(TREE.filter((x) => !x.kind && x.max > 5).length > 50, 'most branch nodes grow')
  } finally {
    setClass1Tier(1)
  }
})
