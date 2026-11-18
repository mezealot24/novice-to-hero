// P2b Thief Skill 2 (design/p2/P2b-spec.md): B1 Taken bracket, debuff kinds, Skill 2 numbers, talents th_t4a / th_t1c.
// Run: node tools/test.mjs thief-p2b
import test from 'node:test'
import assert from 'node:assert/strict'
import { debuffKinds, KIT, takenAmp, type DebuffFlags, type TakenIn } from '../src/data/skill-math'

const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)
const NONE: DebuffFlags = { poison: false, wound: false, exposed: false, chill: false, stabMark: false, blind: false, armorBrk: false, weak: false }
const ZERO: TakenIn = { exposed: 0, stabMark: 0, woundPriv: 0, privileged: 0, poisonAmp: 0 }

test('takenAmp: terms add (no product) under one cap', () => {
  near(takenAmp({ ...ZERO, exposed: 0.3, privileged: 0.3, poisonAmp: 0.45 }), KIT.thiefTakenCap, 'capped')
  near(takenAmp({ ...ZERO, exposed: 0.2, woundPriv: 0.12 }), 0.32, 'sum below cap')
  near(takenAmp({ ...ZERO, exposed: 0.3, stabMark: 0.3, privileged: 0.15, poisonAmp: 0.3 }), 0.6, 'R4.6.3 B1 example 1.05 -> 0.60')
  assert.equal(takenAmp(ZERO), 0)
})

test('debuffKinds: narrow = 4 kinds (thief_c1), wide = 8 kinds (th_t4a)', () => {
  const all: DebuffFlags = { poison: true, wound: true, exposed: true, chill: true, stabMark: true, blind: true, armorBrk: true, weak: true }
  assert.equal(debuffKinds(all, false), 4)
  assert.equal(debuffKinds(all, true), 8)
  assert.equal(debuffKinds(NONE, true), 0)
  assert.equal(debuffKinds({ ...NONE, blind: true, weak: true }, false), 0, 'blind / weak only count in the wide list')
  assert.equal(debuffKinds({ ...NONE, blind: true, weak: true }, true), 2)
})

test('Mobster regression (R4.6): gear poisonAmp 0.30 + old th_t4a 0.25 = x1.55 -> new privileged 0.30 + gear 0.30 = x1.60 (cap)', () => {
  near(1 + 0.3 + 0.25, 1.55, 'today')
  near(1 + takenAmp({ ...ZERO, privileged: 0.3, poisonAmp: 0.3 }), 1.6, 'new')
  near(1 + takenAmp({ ...ZERO, privileged: 0.3, poisonAmp: 0.45 }), 1 + KIT.thiefTakenCap, 'gear max + talent hits the cap')
})
