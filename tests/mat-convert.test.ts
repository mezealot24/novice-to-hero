import test from 'node:test'
import assert from 'node:assert/strict'
import { CONVERT, convertMat, convertMax, convertQuote, convertTarget, upRate } from '../src/data/mat-convert'
import { TAINT_MAT } from '../src/data/taint'

const bag = (mats: Record<string, number>, zeny = 100000) => ({ zeny, mats: { ...mats } })

test('mat convert: one dungeon step, common stays common, boss stays boss, ends and specials blocked', () => {
  assert.equal(convertTarget('m_d3', 'up'), 'm_d4')
  assert.equal(convertTarget('b_d3', 'down'), 'b_d2')
  assert.equal(convertTarget('m_d1', 'down'), null)
  assert.equal(convertTarget('b_d14', 'up'), null)
  for (const id of [TAINT_MAT, 'm_rift', 'b_rift', 'nope']) { assert.equal(convertTarget(id, 'up'), null); assert.equal(convertTarget(id, 'down'), null) }
  for (let n = 1; n < 14; n++) for (const k of ['m', 'b']) assert.ok(convertTarget(`${k}_d${n}`, 'up'), `${k}_d${n} up`)
})

test('mat convert: rates 5:1 up, 10:1 across a zone edge, 1:3 down; fee only going up', () => {
  assert.equal(upRate(3), 5); assert.equal(upRate(5), 10); assert.equal(upRate(10), 10); assert.equal(upRate(11), 5)
  assert.deepEqual(convertQuote('m_d3', 'up', 2), { from: 'm_d3', to: 'm_d4', spend: 10, get: 2, zeny: 2 * CONVERT.feeCommon * 4 })
  assert.deepEqual(convertQuote('b_d5', 'up'), { from: 'b_d5', to: 'b_d6', spend: 10, get: 1, zeny: CONVERT.feeBoss * 6 })
  assert.deepEqual(convertQuote('m_d12', 'down', 3), { from: 'm_d12', to: 'm_d11', spend: 3, get: 9, zeny: 0 })
  assert.equal(convertQuote('m_d3', 'up', 0), null)
  assert.equal(convertQuote('m_d3', 'up', 1.5), null)
})

test('mat convert: up then down always loses (no farming loop)', () => {
  for (let n = 1; n < 14; n++) assert.ok(CONVERT.down < upRate(n), `D${n}`)
})

test('mat convert: pays and adds; short mats or zeny change nothing', () => {
  const s = bag({ m_d3: 11 })
  assert.ok(convertMat(s, 'm_d3', 'up', 2))
  assert.deepEqual(s.mats, { m_d3: 1, m_d4: 2 })
  assert.equal(s.zeny, 100000 - 80)
  assert.equal(convertMat(s, 'm_d3', 'up'), null)
  assert.deepEqual(s.mats, { m_d3: 1, m_d4: 2 })
  const poor = bag({ b_d9: 10 }, 10)
  assert.equal(convertMat(poor, 'b_d9', 'up'), null)
  assert.deepEqual(poor, bag({ b_d9: 10 }, 10))
  const d = bag({ m_d2: 1 })
  assert.ok(convertMat(d, 'm_d2', 'down'))
  assert.deepEqual(d.mats, { m_d1: 3 }) // emptied entry is removed
})

test('mat convert: max by mats and by zeny', () => {
  assert.equal(convertMax(bag({ m_d3: 16 }), 'm_d3', 'up'), 3)
  assert.equal(convertMax(bag({ m_d3: 16 }, 85), 'm_d3', 'up'), 2) // 40z each
  assert.equal(convertMax(bag({ m_d3: 10 }, 0), 'm_d3', 'down'), 10)
  assert.equal(convertMax(bag({}), 'm_d1', 'down'), 0)
})
