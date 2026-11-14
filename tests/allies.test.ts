import test from 'node:test'
import assert from 'node:assert/strict'
import { heroStats } from '../src/data/meta'
import { ALLIES, fillAllies, GADGETS, guardHit, hurtAlly, makeAlly, readyAllies, reviveAllies, rollGadget, tauntTarget, useAlly } from '../src/battle/allies'
import { KIT2 } from '../src/data/skill-math'

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

// ----- Beastmaster rework v1 🐗 Guardian (docs/design/beastmaster-rework-gap.md §7.3) -----
const BM = KIT2.beastmaster

test('boar no longer taunts: it splits landed hits instead (share, minus its cut)', () => {
  const b = makeAlly(ALLIES.boar, st)
  assert.equal(tauntTarget([b], 0), undefined)
  const g = guardHit([b], 100, st)!
  const part = Math.floor(100 * BM.boarShare)
  assert.equal(g.hero, 100 - part)
  assert.equal(g.took, Math.round(part * (1 - BM.boarCut)))
  assert.equal(b.hp, b.maxHp - g.took)
  assert.ok(b.rage > 0 && !g.full && !g.broke)
})

test('boar Rage fills from damage taken, full = reset + charge flag', () => {
  const b = makeAlly(ALLIES.boar, st)
  b.hp = b.maxHp = 1e6; b.rage = 99.99
  const g = guardHit([b], 1000, st)!
  assert.equal(g.full, true)
  assert.equal(b.rage, 0)
})

test('boar at 0 HP goes down (keeps its slot), counts down, gets back up full', () => {
  const b = makeAlly(ALLIES.boar, st)
  b.hp = 1
  const g = guardHit([b], 1000, st)!
  assert.equal(g.broke, true)
  assert.equal(b.dead, false)
  assert.equal(b.down, BM.boarDown)
  assert.equal(readyAllies([b]).length, 0)
  assert.equal(guardHit([b], 1000, st), undefined) // a downed boar takes nothing
  for (let i = 1; i < BM.boarDown; i++) assert.equal(reviveAllies([b]).length, 0)
  assert.deepEqual(reviveAllies([b]), [b])
  assert.equal(b.hp, b.maxHp)
  assert.equal(readyAllies([b]).length, 1)
})

test('guard split ignores allies without a share, zero hits and tiny hits', () => {
  assert.equal(guardHit([makeAlly(ALLIES.tempestBell, st)], 100, st), undefined)
  assert.equal(guardHit([makeAlly(ALLIES.boar, st)], 0, st), undefined)
  assert.equal(guardHit([makeAlly(ALLIES.boar, st)], 1, st), undefined) // floor(1 x share) = 0: the hero keeps it
})
