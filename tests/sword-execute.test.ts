// Swordsman ult rework (Q 2026-11-21): ⚔️ ปลุกดาบ + 🌊 คลื่นดาบ (Riven-style 2 steps) and the ⚖️ คำพิพากษา execute curve
// (+2.667% per 1% missing HP, +200% at 75% missing, half on bosses / minis, 2nd / 3rd job ults take execLineShare).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JOBS, SWORD_MANA, swordExecMul, swordWaveNow } from '../src/data/jobs'
import { JOB2 } from '../src/data/jobs2'

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`)

test('curve matches the reference table: 0% / 25% / 100% / 200% at 0 / 9.375 / 37.5 / 75% missing', () => {
  near(swordExecMul(1, false), 1)
  near(swordExecMul(1 - 0.09375, false), 1.25)
  near(swordExecMul(1 - 0.375, false), 2)
  near(swordExecMul(0.25, false), 3)
})

test('caps at 75% missing HP', () => {
  for (const f of [0.25, 0.2, 0.1, 0]) near(swordExecMul(f, false), 1 + SWORD_MANA.execMax)
})

test('bosses / minis take execBigShare, 2nd / 3rd job ults take execLineShare', () => {
  for (const f of [0.9, 0.5, 0.3, 0.05]) {
    near(swordExecMul(f, true) - 1, (swordExecMul(f, false) - 1) * SWORD_MANA.execBigShare)
    near(swordExecMul(f, false, SWORD_MANA.execLineShare) - 1, (swordExecMul(f, false) - 1) * SWORD_MANA.execLineShare)
  }
  assert.ok(swordExecMul(0, true, SWORD_MANA.execLineShare) <= 1.25 + 1e-9) // Lord Knight vs a low boss: at most +25%
})

test('monotonic and safe on bad input', () => {
  let prev = 0
  for (let i = 100; i >= 0; i--) { const v = swordExecMul(i / 100, false); assert.ok(v >= prev - 1e-12); prev = v }
  near(swordExecMul(-3, false), swordExecMul(0, false))
  near(swordExecMul(7, false), 1)
  near(swordExecMul(Number.NaN, false), 1)
})

test('🌊 wave fires under the execute line or on the last awakened turn, never outside the awakening', () => {
  assert.equal(swordWaveNow(3, [1, 0.8]), false)
  assert.equal(swordWaveNow(3, [1, SWORD_MANA.execLow - 0.01]), true)
  assert.equal(swordWaveNow(2, [SWORD_MANA.execLow]), false) // the line itself does not trigger
  assert.equal(swordWaveNow(1, [1]), true)
  assert.equal(swordWaveNow(0, [0.1]), false)
  assert.equal(swordWaveNow(3, []), false)
})

test('descs: job1 names awaken + wave, job2 ults name the execute', () => {
  assert.match(JOBS.swordsman.ult.desc, /ปลุกดาบ/)
  assert.match(JOBS.swordsman.ult.desc, /คลื่นดาบ/)
  for (const d of [JOB2.knight.ult.desc, JOB2.berserker.ult.desc]) assert.match(d, /คำพิพากษา/)
})

// ----- ⚔️ ดาบสยบมนตร์ (Q 2026-11-21): Swordsman / Knight Skill 1, single target, Lv 1-5 from the ทักษะ 1 "+" node -----
import { SWORD_S1, swordS1Lv, swordS1Raw } from '../src/data/jobs'
import { autoCost, swordS1On, KIT } from '../src/data/skill-math'
import { nodeById } from '../src/data/tree'
import { PLAYER as STATS0 } from '../src/data/stats'

test('ดาบสยบมนตร์ numbers follow Q table: P.ATK 120-200% + STR x0.25-1.25 + 20-100 x Base Lv, Mana 6-30, CD 5', () => {
  // Lv 1-5 unchanged; Q 2026-11-24 extends the table to Lv 15 (class-1 cap 10 Job2 / 15 Awakened)
  assert.deepEqual(SWORD_S1.atkPct.slice(0, 5), [1.2, 1.4, 1.6, 1.8, 2.0])
  assert.deepEqual(SWORD_S1.str.slice(0, 5), [0.25, 0.5, 0.75, 1.0, 1.25])
  assert.deepEqual(SWORD_S1.base.slice(0, 5), [20, 40, 60, 80, 100])
  assert.equal(SWORD_S1.atkPct.length, 15)
  assert.equal(SWORD_S1.mana, 15) // flat Mana at every Lv
  assert.equal(SWORD_S1.cd, 5)
  near(swordS1Raw(1, 100, 40, 10), 120 + 10 + 200)
  near(swordS1Raw(5, 1000, 200, 99), 2000 + 250 + 9900)
  near(swordS1Raw(20, 100, 0, 1), swordS1Raw(15, 100, 0, 1)) // Lv clamps at 15
})

test('Lv = the "+" node Lv (0 points casts Lv 1), Mana by Lv; Berserker casts it too for its flat Rage cost', () => {
  assert.equal(swordS1Lv({ swS1Lv: 0 }), 1)
  assert.equal(swordS1Lv({ swS1Lv: 3 }), 3)
  assert.equal(swordS1Lv({ swS1Lv: 7 }), 7)
  assert.equal(swordS1Lv({ swS1Lv: 19 }), 15)
  for (let lv = 1; lv <= 5; lv++) assert.equal(autoCost(JOBS.swordsman, { ...STATS0, swS1Lv: lv }), SWORD_S1.mana)
  assert.ok(swordS1On(JOBS.swordsman))
  const zerk = { ...JOBS.swordsman, resource: 'rage' as const, auto: { ...JOBS.swordsman.auto, cost: 30 } }
  assert.ok(swordS1On(zerk)) // Q 2026-11-21: Rage คงที่เท่าเดิม
  assert.equal(autoCost(zerk, { ...STATS0, swS1Lv: 1 }), 30)
  const root = nodeById('swordsman_s1p')!
  assert.equal(root.mod(4).swS1Lv, 4)
})

test('ทักษะ 1 web: left 🛡️ = Defensive stats, right ⚔️ = Utility + Dmg stats (node ids kept)', () => {
  const S = KIT.swordS1Tree
  const mod = (id: string, lv: number) => nodeById(id)!.mod(lv)
  assert.ok((mod('swordsman_b1', 5).swS1Shield ?? 0) > 0)
  assert.ok((mod('swordsman_b2', 5).swCcGuard ?? 0) > 0)
  assert.ok((mod('swordsman_b3', 5).swMuteWeak ?? 0) > 0)
  assert.equal(mod('swordsman_b4', 1).swS1Ctr, S.counters)
  assert.ok((mod('swordsman_c1', 5).swVsMute ?? 0) > 0)
  assert.ok((mod('swordsman_c2', 5).swS1Refund ?? 0) > 0)
  assert.ok((mod('swordsman_c3', 5).swS1Splash ?? 0) > 0)
  assert.equal(mod('swordsman_c4', 1).swS1Star, 1)
  for (const id of ['swordsman_b1', 'swordsman_c1']) assert.equal(mod(id, 5).lifesteal ?? mod(id, 5).swFlow ?? 0, 0) // old โลหิต / จังหวะดาบ effects gone
})
