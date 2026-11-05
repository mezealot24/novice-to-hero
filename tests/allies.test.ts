import test from 'node:test'
import assert from 'node:assert/strict'
import { heroStats } from '../src/data/meta'
import { ALLIES, fillAllies, GADGETS, hurtAlly, makeAlly, rollGadget, tauntTarget, useAlly } from '../src/battle/allies'

const st = heroStats({ race: 'human', stats: { str: 5, vit: 5, wis: 5, dex: 5, int: 5, luk: 5, agi: 5 }, equipped: {}, skills: {}, job: 'archer' } as never)

test('Monk bell still soaks hp and breaks', () => {
  const b = makeAlly(ALLIES.tempestBell, st)
  assert.equal(tauntTarget([b], 0), b)
  assert.equal(hurtAlly(b, b.maxHp + 5), true)
  assert.equal(b.dead, true)
})

test('rubber chicken breaks on its Nth hit, traps are one-shot, hawk is never hit', () => {
  const c = makeAlly(ALLIES.chicken, st)
  assert.equal(tauntTarget([c], 0.99), c)
  assert.equal(hurtAlly(c, 1e9), false)
  assert.equal(hurtAlly(c, 1), true)
  const t = makeAlly(ALLIES.mine, st)
  assert.equal(useAlly(t), true)
  assert.equal(tauntTarget([makeAlly(ALLIES.hawk, st)], 0), undefined)
})

test('wolf fills its own gauge, boar does not', () => {
  const w = makeAlly(ALLIES.wolf, st), b = makeAlly(ALLIES.boar, st)
  fillAllies([w, b], st, 100)
  assert.ok(w.gauge > 0 && b.gauge === 0)
})

test('gadget roll: every pick is a known gadget, LUK raises rare odds', () => {
  const ids = new Set(GADGETS.map((g) => g.id))
  for (let i = 0; i < 20; i++) assert.ok(ids.has(rollGadget(st, 0, () => i / 20)))
  const rare = (luk: number) => { let n = 0; for (let i = 0; i < 1000; i++) if (GADGETS.find((g) => g.id === rollGadget(st, luk, () => (i + 0.5) / 1000))?.rare) n++; return n }
  assert.ok(rare(150) > rare(0))
})
