// Skill admin engine (design/skill-admin-engine-v1.md): the registry maps every class skill number to a whitelisted path,
// patches reach the real data, derived Mana costs follow their source consts, and the per-skill crit switch defaults to "on". Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { JOBS } from '../src/data/jobs'
import { applyPatch, checkPatch, fieldFor, guardsFor, readPath } from '../src/data/patch'
import { canRollCrit, CRIT_SLOTS, critRef, SKILL_CLASSES, SKILL_CRIT, SKILL_LAYOUT, skillTableFields, type SkillRef } from '../src/data/skill-registry'
import { SKILL2 } from '../src/data/skill2'
import { S2N } from '../src/data/skill-math'
import { fieldRow } from '../src/admin/model'

const allRefs = (): { cls: string; ref: SkillRef }[] => SKILL_CLASSES.flatMap((cls) => {
  const l = SKILL_LAYOUT[cls]
  return [...l.s1, ...l.ult, ...l.s2.flatMap((x) => x.refs), ...CRIT_SLOTS.map((s) => critRef(cls, s))].map((ref) => ({ cls, ref }))
})

test('every registry ref is whitelisted, reads a number, and its default sits inside its own range', () => {
  for (const { cls, ref } of allRefs()) {
    const where = `${cls}: ${ref.table}.${ref.path}`
    const def = fieldFor(ref.table, ref.path)
    assert.ok(def, `${where} is not whitelisted`)
    const v = readPath(ref.table, ref.path)
    assert.equal(typeof v, 'number', `${where} does not read a number`)
    assert.ok(v! >= def.min && v! <= def.max, `${where} default ${v} outside [${def.min}, ${def.max}]`)
    // the real validator: the default value passes and resolves to exactly one writable leaf
    const r = checkPatch({ [ref.table]: { [ref.path]: v! } }, guardsFor({ [ref.table]: { [ref.path]: v! } }))
    assert.deepEqual([r.ok, r.skipped.length, r.count], [true, 0, 1], where)
    assert.ok(fieldRow(ref.table, ref.path), `${where}: admin field list has no row`) // what the admin tab renders
  }
})

test('registry has no duplicate path inside a table and every class lists its three Skill 2 choices with cost + cooldown', () => {
  const own = skillTableFields().map(([p]) => p)
  assert.equal(own.length, new Set(own).size, 'skills whitelist has no duplicate paths')
  for (const cls of SKILL_CLASSES) {
    const ids = SKILL2.filter((s) => s.job === cls).map((s) => s.id)
    assert.deepEqual(SKILL_LAYOUT[cls].s2.map((x) => x.id), ids, `${cls}: Skill 2 choices`)
    for (const x of SKILL_LAYOUT[cls].s2) {
      assert.ok(x.refs.some((r) => r.path === `skill2.${x.id}.cost`) && x.refs.some((r) => r.path === `skill2.${x.id}.cd`), `${x.id}: cost + cd`)
    }
  }
})

test('Skill 2 base/per numbers keep the v83 formulas (refactor guard)', () => {
  for (const lv of [0, 1, 2, 3, 3.6, 5]) {
    assert.equal(S2N.guardCut(lv), 0.4 + 0.05 * lv)
    assert.equal(S2N.bloodVamp(lv), 0.15 + 0.05 * lv)
    assert.equal(S2N.tauntWeak(lv), 0.2 + 0.05 * lv)
    assert.equal(S2N.rainMul(lv), 0.8 + 0.15 * lv)
    assert.equal(S2N.hawkCrit(lv), 0.2 + 0.05 * lv)
    assert.equal(S2N.trapPush(lv), 30 + 10 * lv)
    assert.equal(S2N.mshieldTake(lv), 0.4 + 0.05 * lv)
    assert.equal(S2N.novaMul(lv), 0.8 + 0.15 * lv)
    assert.equal(S2N.arcaneMul(lv), 0.6 + 0.1 * lv)
    assert.equal(S2N.renewHeal(lv), 0.3 + 0.05 * lv)
    assert.equal(S2N.kyrieHp(lv), 0.05 * lv)
    assert.equal(S2N.spearPlus(lv), 0.03 * lv)
    assert.equal(S2N.smokeHeal(lv), 0.03 * lv)
    assert.equal(S2N.pickRes(lv), 15 + 5 * lv)
  }
})

test('a patch reaches the real data and revert() restores it (Skill 2 cost / cd / base, job cd, Mana consts)', () => {
  const guard = SKILL2.find((s) => s.id === 'sw_guard')!
  const before = { cost: guard.cost, cd: guard.cd, rain: S2N.rainMul(2), ultCd: JOBS.archer.ult.cd }
  const r = applyPatch({ skills: { 'skill2.sw_guard.cost': 7, 'skill2.sw_guard.cd': 9, 's2p.rainMul.base': 1.5, 'job.archer.ult.cd': 6 } })
  assert.equal(r.ok, true)
  assert.equal(r.count, 4)
  assert.equal(guard.cost, 7)
  assert.equal(guard.cd, 9)
  assert.equal(S2N.rainMul(2), 1.5 + 0.15 * 2)
  assert.equal(JOBS.archer.ult.cd, 6)
  r.revert()
  assert.deepEqual({ cost: guard.cost, cd: guard.cd, rain: S2N.rainMul(2), ultCd: JOBS.archer.ult.cd }, before)
})

test('the three Mana costs jobs.ts copies at import follow their source consts (sword.auto / sword.ult / kit cleric.ultMana)', () => {
  const before = [JOBS.swordsman.auto.cost, JOBS.swordsman.ult.cost, JOBS.cleric.ult.cost]
  const r = applyPatch({ skills: { 'sword.auto': 11, 'sword.ult': 12 }, kit: { 'cleric.ultMana': 13 } })
  assert.equal(r.ok, true)
  assert.deepEqual([JOBS.swordsman.auto.cost, JOBS.swordsman.ult.cost, JOBS.cleric.ult.cost], [11, 12, 13])
  r.revert()
  assert.deepEqual([JOBS.swordsman.auto.cost, JOBS.swordsman.ult.cost, JOBS.cleric.ult.cost], before)
})

test('crit switch: default on for every class slot, a patch turns one off, jobs without an entry stay on', () => {
  for (const cls of SKILL_CLASSES) for (const s of CRIT_SLOTS) assert.equal(canRollCrit(cls, s), true, `${cls}.${s} default`)
  assert.equal(canRollCrit('novice', 'ult'), true)
  const r = applyPatch({ skills: { 'crit.cleric.ult': 0 } })
  assert.equal(r.ok, true)
  assert.equal(SKILL_CRIT.cleric.ult, 0)
  assert.equal(canRollCrit('cleric', 'ult'), false)
  assert.equal(canRollCrit('cleric', 's1'), true)
  assert.equal(canRollCrit('mage', 'ult'), true)
  r.revert()
  assert.equal(canRollCrit('cleric', 'ult'), true)
  // only 0 / 1 are accepted
  assert.equal(checkPatch({ skills: { 'crit.cleric.ult': 2 } }).ok, false)
  assert.equal(checkPatch({ skills: { 'crit.cleric.ult': 0.5 } }).ok, false)
})

test('paths outside the registry are not tunable (job names, descriptions, unknown skill ids)', () => {
  const r = checkPatch({ skills: { 'job.archer.auto.name': 1, 'job.archer.auto.desc': 1, 'skill2.nope.cost': 3, 'job.swordsman.auto.cost': 5, 'crit.cleric.s3': 0 } })
  assert.equal(r.count, 0)
  assert.equal(r.skipped.length, 5, 'all five are skipped as unknown')
})
