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
