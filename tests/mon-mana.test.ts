import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canPay, MON_MANA, newManaPool, payMana, regenMana, skillManaCost } from '../src/data/mon-mana'
import { MONSTERS } from '../src/data/monsters'

test('boss mana: start, regen cap, pay', () => {
  const p = newManaPool()
  assert.equal(p.mana, MON_MANA.start)
  regenMana(p, 999); assert.equal(p.mana, p.maxMana)
  const bolt = { kind: 'bolt' as const, every: 2, name: 'b' }
  assert.ok(canPay(p, bolt)); payMana(p, bolt)
  assert.equal(p.mana, p.maxMana - MON_MANA.cost.bolt)
})

test('legendary (big) costs MON_MANA.big; mp overrides', () => {
  assert.equal(skillManaCost({ kind: 'bolt', every: 1, name: 'x', big: true }), MON_MANA.big)
  assert.equal(skillManaCost({ kind: 'heal', every: 1, name: 'x', mp: 7 }), 7)
})

test('no mana -> cannot pay', () => {
  const p = { mana: 10, maxMana: 100 }
  assert.equal(canPay(p, { kind: 'summon', every: 1, name: 's' }), false)
})

test('every boss skill kind has a cost', () => {
  for (const d of Object.values(MONSTERS)) for (const s of d.skills ?? []) for (const k of [s, ...(s.pick ?? [])]) assert.ok(skillManaCost(k) > 0, `${d.name} ${k.name}`)
})
