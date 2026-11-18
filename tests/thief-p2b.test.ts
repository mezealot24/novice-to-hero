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

test('Skill 2 numbers: S2N keys are plain numbers, "+" numbers are whole, th_smoke costs 35', async () => {
  const { S2N } = await import('../src/data/skill-math')
  const { SKILL2 } = await import('../src/data/skill2')
  const keys = ['smokeTurns', 'smokeFlee', 'smokeSkillCrit', 'smokeCritDmg', 'raidMul', 'exposedPct', 'exposedStar', 'exposedTurns', 'smokeBlindTurns',
    'pickBase', 'pickStarMul', 'pickZeny', 'pickZenyDex', 'plunderRes', 'plunderDrop', 'plunderMax',
    'woundStacks', 'woundStarStacks', 'woundTurns', 'woundStrikeChance', 'bladeAt', 'bladeMul', 'bladeHealCut', 'bladeCutTurns', 'woundPriv'] as const
  assert.equal(keys.length, 25)
  for (const k of keys) assert.equal(typeof S2N[k], 'number', k)
  assert.ok(!('pickMul' in S2N), 'pickMul function is gone')
  for (const lv of [0, 0.6, 1.2, 1.8, 2.4, 3]) {
    assert.ok(Number.isInteger(S2N.smokeRes(lv)) && Number.isInteger(S2N.woundMax(lv)), `lv ${lv}`)
    for (const id of ['th_smoke', 'th_pick', 'th_wound']) assert.ok(!/\d\.\d{2,}/.test(SKILL2.find((x) => x.id === id)!.plus.desc(lv)), `${id} + text at ${lv}`)
  }
  assert.equal(S2N.woundMax(3), 8)
  for (let lv = 0; lv < 5; lv += 0.6) assert.ok(S2N.woundMax(lv + 0.6) >= S2N.woundMax(lv))
  assert.equal(SKILL2.find((x) => x.id === 'th_smoke')!.cost, 35)
})

test('thPrivileged is a PLAYER stat that starts at 0', async () => {
  const { PLAYER } = await import('../src/data/game-data')
  assert.equal(PLAYER.thPrivileged, 0)
})

test('th_t4a Privileged Status: thPrivileged 0.18 / 0.30, no poisonAmp at any rank', async () => {
  const { TALENTS } = await import('../src/data/tree')
  const { PLAYER } = await import('../src/data/game-data')
  const t = TALENTS.find((x) => x.id === 'th_t4a')!
  assert.ok(t)
  assert.deepEqual([1, 2].map((r) => t.mod(r).thPrivileged), [0.18, 0.3])
  for (const r of [1, 2]) {
    assert.ok(!('poisonAmp' in t.mod(r)), `rank ${r}`)
    for (const [k, v] of Object.entries(t.mod(r))) { assert.ok(k in PLAYER, k); assert.ok(typeof v === 'number' && v > 0, `${k}=${v}`) }
  }
})
