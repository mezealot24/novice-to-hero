// Thief P2'b status layer + Skill 2 (design/p2/MAIN-VS-REV4.md §4) on top of P2'a: B1 Taken bracket (R4.6), thresholds as a share
// of the poison cap, Exposed / Wound, talents th_t4a / th_t1c, ม่านควัน / แผลลึก numbers. Run: node tools/test.mjs thief-p2b
import test from 'node:test'
import assert from 'node:assert/strict'
import { nodeById, TALENTS } from '../src/data/tree'
import { debuffKinds, KIT, poisonAt, poisonCapOf, S2N, S2P, takenAmp, type DebuffFlags, type TakenIn } from '../src/data/skill-math'

const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)
const NO: DebuffFlags = { poison: false, wound: false, exposed: false, chill: false, stabMark: false, blind: false, armorBrk: false, weak: false }
const T0: TakenIn = { exposed: 0, stabMark: 0, woundPriv: 0, privileged: 0, poisonAmp: 0 }

test('B1 takenAmp: terms add (never multiply), one cap, empty = 0', () => {
  assert.equal(takenAmp(T0), 0)
  near(takenAmp({ ...T0, exposed: 0.2, privileged: 0.18 }), 0.38, 'under the cap: plain sum')
  // R4.6.3 worst case that can really happen (Exposed ⟂ woundPriv: one Skill 2) = Exposed ★ 0.30 + th_t4a 0.30 + gear 0.45 -> cap
  near(takenAmp({ ...T0, exposed: 0.3, privileged: 0.3, poisonAmp: 0.45 }), KIT.thiefTakenCap, 'cap')
  near(KIT.thiefTakenCap, 0.6)
  assert.equal(takenAmp({ ...T0, exposed: -1 }), 0, 'never below 0')
})

test('debuffKinds: narrow = poison / Wound / Exposed / chill, wide adds stabMark / blind / armorBrk / weak', () => {
  assert.equal(debuffKinds(NO, false), 0)
  const all: DebuffFlags = { poison: true, wound: true, exposed: true, chill: true, stabMark: true, blind: true, armorBrk: true, weak: true }
  assert.equal(debuffKinds(all, false), 4)
  assert.equal(debuffKinds(all, true), 8)
  assert.equal(debuffKinds({ ...NO, blind: true, weak: true }, false), 0, 'wide-only kinds do not count narrow')
  assert.equal(debuffKinds({ ...NO, blind: true, weak: true }, true), 2)
})

test('thresholds follow the poison cap (MAIN-VS-REV4 §5.1 #3): share x poisonMax(), rounded up, at least 1', () => {
  const base = poisonCapOf({ poisonCap: 0 }), a3 = poisonCapOf({ poisonCap: 9 }) // พิษสะสม Lv 5 = +9
  assert.equal(base, 20)
  assert.equal(poisonAt(KIT.thiefPoisonAmpShare, base), 10, 'gear กัดกร่อน at the base cap = the old 10 stacks')
  assert.equal(poisonAt(KIT.thiefPrivShare, base), 12)
  assert.equal(poisonAt(KIT.thiefPoisonAmpShare, a3), 15, 'cap 29 -> 15 (grows with the cap)')
  assert.equal(poisonAt(KIT.thiefPrivShare, a3), 18)
  assert.equal(poisonAt(0, base), 1)
  assert.ok(poisonAt(KIT.thiefPrivShare, a3) <= a3 && poisonAt(1, a3) === a3, 'never above the cap')
})

test('Skill 2 numbers: ม่านควัน / แผลลึก plain numbers, "+" values whole at fractional s2Lv, no ล้วงกระเป๋า rework', () => {
  const nums = ['smokeTurns', 'smokeFlee', 'smokeSkillCrit', 'smokeCritDmg', 'raidMul', 'exposedPct', 'exposedStar', 'exposedTurns', 'smokeBlindTurns',
    'woundStacks', 'woundStarStacks', 'woundTurns', 'woundStrikeChance', 'bladeAt', 'bladeMul', 'bladeHealCut', 'bladeCutTurns', 'woundPriv'] as const
  for (const k of nums) assert.ok(typeof S2N[k] === 'number' && S2N[k] > 0, k)
  assert.ok(S2N.exposedStar >= S2N.exposedPct && S2N.woundStarStacks >= S2N.woundStacks)
  let prev = 0
  for (const lv of [0, 0.6, 1.2, 1.8, 2.4, 3, 3.6, 5]) {
    const w = S2N.woundMax(lv), r = S2N.smokeRes(lv)
    assert.ok(Number.isInteger(w) && Number.isInteger(r), `lv ${lv}: ${w} / ${r}`)
    assert.ok(w >= prev && w >= S2N.bladeAt, `woundMax never drops and reaches Blade's End (lv ${lv})`); prev = w
  }
  assert.equal(S2N.woundMax(0), 6); assert.equal(S2N.woundMax(3), 8); assert.equal(S2N.smokeRes(3), 25)
  assert.ok('smokeRes' in S2P && 'woundMax' in S2P)
  assert.equal(typeof S2N.pickMul, 'function', "th_pick = main's steal (not touched)")
  for (const k of ['pickBase', 'pickStarMul', 'pickZeny', 'plunderRes']) assert.ok(!(k in S2N), k)
})

test('status layer: thief_c1 counts Wound / Exposed kinds, th_t2b counts poison + Wound stacks (texts say so)', () => {
  const c1 = nodeById('thief_c1'), t2b = TALENTS.find((t) => t.id === 'th_t2b')
  assert.ok(c1 && t2b)
  assert.match(c1.desc(1), /Wound/); assert.match(c1.desc(1), /Exposed/)
  assert.match(t2b.desc(1), /พิษ \+ Wound/)
})

test('B1 worst cases stay under the cap (R4.6.3: one Skill 2, one row-4 talent)', () => {
  // ม่านควัน ★ Exposed + th_t4a r2 + gear 0.45 · แผลลึก Privileged + th_t4a r2 + gear 0.45 · dot = no Exposed
  near(takenAmp({ ...T0, exposed: S2N.exposedStar, privileged: 0.3, poisonAmp: 0.45 }), KIT.thiefTakenCap)
  near(takenAmp({ ...T0, woundPriv: S2N.woundPriv, privileged: 0.3, poisonAmp: 0.45 }), KIT.thiefTakenCap)
  near(takenAmp({ ...T0, exposed: 0, woundPriv: 0, privileged: 0.3 }), 0.3)
  // old flat line: gear 0.45 + old กัดกร่อน 0.25 = x1.70 -> now capped at x1.60
  near(1 + takenAmp({ ...T0, poisonAmp: 0.45 + 0.25 }), 1.6)
})
