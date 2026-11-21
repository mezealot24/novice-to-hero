// ⚖️ คำพิพากษา (Q 2026-11-21): Swordsman-line ult hits scale with the target's missing HP, + a bonus under 30%, half for bosses / minis.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { JOBS, SWORD_MANA, swordExecMul } from '../src/data/jobs'
import { JOB2 } from '../src/data/jobs2'

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)

test('full HP target: no bonus', () => {
  near(swordExecMul(1, false), 1)
  near(swordExecMul(1, true), 1)
})

test('linear in missing HP above the low line', () => {
  near(swordExecMul(0.5, false), 1 + 0.5 * SWORD_MANA.execMax)
  near(swordExecMul(SWORD_MANA.execLow, false), 1 + (1 - SWORD_MANA.execLow) * SWORD_MANA.execMax) // the line itself gets no low bonus
})

test('under the low line: + execLowAdd on top', () => {
  const f = 0.1
  near(swordExecMul(f, false), 1 + (1 - f) * SWORD_MANA.execMax + SWORD_MANA.execLowAdd)
  assert.ok(swordExecMul(SWORD_MANA.execLow - 0.001, false) - swordExecMul(SWORD_MANA.execLow, false) > SWORD_MANA.execLowAdd * 0.99)
})

test('bosses / minis take only execBigShare of the bonus', () => {
  for (const f of [0.9, 0.5, 0.29, 0.05]) near(swordExecMul(f, true) - 1, (swordExecMul(f, false) - 1) * SWORD_MANA.execBigShare)
})

test('monotonic, bounded, and safe on bad input', () => {
  let prev = 0
  for (let i = 100; i >= 0; i--) { const v = swordExecMul(i / 100, false); assert.ok(v >= prev); prev = v }
  near(swordExecMul(0, false), 1 + SWORD_MANA.execMax + SWORD_MANA.execLowAdd)
  near(swordExecMul(-3, false), swordExecMul(0, false))
  near(swordExecMul(7, false), 1)
  near(swordExecMul(Number.NaN, false), 1)
})

test('every Swordsman-line ult desc names the mechanic', () => {
  for (const d of [JOBS.swordsman.ult.desc, JOB2.knight.ult.desc, JOB2.berserker.ult.desc]) assert.match(d, /คำพิพากษา/)
})
