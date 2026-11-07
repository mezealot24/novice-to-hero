import test from 'node:test'
import assert from 'node:assert/strict'
import { Batch } from '../server/src/telemetry'

const did = '3f2b8c1e-9a4d-4e7b-8c1a-0d5e6f7a8b9c'
const ok = { did, build: 'v92', events: [{ name: 'run_end', t: Date.now(), props: { won: false, dungeon: 'd1', room: 4 } }] }

test('telemetry: a normal run_end batch passes', () => {
  assert.equal(Batch.safeParse(ok).success, true)
})

test('telemetry: unknown event names are rejected (allow-list)', () => {
  assert.equal(Batch.safeParse({ ...ok, events: [{ name: 'steal_save', t: 1, props: {} }] }).success, false)
})

test('telemetry: bad device id, empty batch and oversized batch are rejected', () => {
  assert.equal(Batch.safeParse({ ...ok, did: 'x' }).success, false)
  assert.equal(Batch.safeParse({ ...ok, events: [] }).success, false)
  const many = Array.from({ length: 21 }, () => ok.events[0])
  assert.equal(Batch.safeParse({ ...ok, events: many }).success, false)
})

test('telemetry: props must be flat primitives, short strings, finite numbers, <= 16 keys', () => {
  const bad = (props: unknown) => Batch.safeParse({ ...ok, events: [{ name: 'run_end', t: 1, props }] }).success
  assert.equal(bad({ nested: { a: 1 } }), false)
  assert.equal(bad({ n: Infinity }), false)
  assert.equal(bad({ s: 'x'.repeat(49) }), false)
  assert.equal(bad(Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`k${i}`, i]))), false)
})
