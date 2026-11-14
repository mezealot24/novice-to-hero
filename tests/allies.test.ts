import test from 'node:test'
import assert from 'node:assert/strict'
import { heroStats } from '../src/data/meta'
import { ALLIES, fillAllies, frenzyMul, GADGETS, guardHit, hurtAlly, makeAlly, readyAllies, reviveAllies, rollGadget, tauntTarget, useAlly, type Ally, type AllyCtx } from '../src/battle/allies'
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

// ----- Phase 2 🐺 wolf: Bloodscent Frenzy + ★ Savage Crunch -----
test('Bloodscent Frenzy: + speed per poison stack, counted up to the cap, off without the node', () => {
  assert.equal(frenzyMul(st, 4), 1)
  const fs = { ...st, j2Frenzy: 0.03 }
  assert.ok(Math.abs(frenzyMul(fs, 2) - 1.06) < 1e-9)
  assert.equal(frenzyMul(fs, 99), frenzyMul(fs, BM.frenzyCap))
})

/** A fake ctx that records the wolf's bites (crit flag) and heals. */
function wolfRun(stats: typeof st, front: { hpPct: number; marked: boolean }, bites: number) {
  const w = makeAlly(ALLIES.wolf, stats), crits: boolean[] = [], heals: number[] = []
  const ctx = {
    ally: w as Ally, st: stats, luk: 0, combo: false,
    hitAll: () => {}, hitOne: () => false, hitFoe: () => {}, stun: () => {}, chill: () => {}, shield: () => {}, say: () => {},
    hitFront: (_m: number, _c: string, _b?: number, crit?: boolean) => { crits.push(!!crit); return 100 },
    frontInfo: () => front, healPack: (n: number) => { heals.push(n) }, rally: () => {},
  } satisfies AllyCtx
  for (let i = 0; i < bites; i++) w.def.act(ctx)
  return { crits, heals }
}

test('no ★ ราชาหมาป่า: never a Savage Crunch', () => {
  assert.deepEqual(wolfRun(st, { hpPct: 0.1, marked: true }, 3).crits, [false, false, false])
})

test('★ Savage Crunch: every Nth bite, marked or low-HP front = sure crit + heal share', () => {
  const evo = { ...st, j2WolfEvo: 1 }
  const plain = wolfRun(evo, { hpPct: 1, marked: false }, BM.crunchEvery)
  assert.deepEqual(plain.crits, [...Array(BM.crunchEvery - 1).fill(false), true])
  assert.deepEqual(plain.heals, [100 * BM.crunchHeal])
  assert.ok(wolfRun(evo, { hpPct: 1, marked: true }, 2).crits.every(Boolean))
  assert.ok(wolfRun(evo, { hpPct: BM.crunchLow - 0.01, marked: false }, 2).crits.every(Boolean))
})

// ----- Phase 3 🦅 hawk: Prey Mark + 🪶 Razor Gust + 👁️ ★ Apex Spotter -----
/** Runs Blitz Beat `casts` times with the proc roll forced (Math.random = 0), recording hitOne fx and rallies. */
function hawkRun(stats: typeof st, casts: number, freshMark = true) {
  const h = makeAlly(ALLIES.hawk, stats), fx: { mark?: boolean; blind?: number }[] = [], rallies: string[] = []
  const ctx = {
    ally: h as Ally, st: stats, luk: 0, combo: false,
    hitAll: () => {}, hitFoe: () => {}, stun: () => {}, chill: () => {}, shield: () => {}, say: () => {},
    hitOne: (_m: number, _g: boolean, _c: string, _s?: boolean, f?: { mark?: boolean; blind?: number }) => { fx.push(f ?? {}); return freshMark },
    hitFront: () => 0, frontInfo: () => undefined, healPack: () => {}, rally: (id: string) => { rallies.push(id) },
  } satisfies AllyCtx
  const rnd = Math.random; Math.random = () => 0
  try { for (let i = 0; i < casts; i++) h.def.act(ctx) } finally { Math.random = rnd }
  return { fx, rallies, casts: h.acts }
}

test('every Blitz Beat hit carries the Prey Mark, no blind without bm_h3', () => {
  const r = hawkRun(st, 3)
  assert.ok(r.fx.length >= 3 && r.fx.every((f) => f.mark && !f.blind))
  assert.deepEqual(r.rallies, []) // no ★: no Apex Spotter
})

test('🪶 Razor Gust: only every Nth Blitz Beat blinds', () => {
  const r = hawkRun({ ...st, j2Gust: 1 }, BM.gustEvery)
  const blinded = r.fx.filter((f) => (f.blind ?? 0) > 0).length
  assert.ok(blinded > 0 && blinded < r.fx.length)
  assert.ok(r.fx.filter((f) => f.blind === BM.gustBlind).length === blinded)
})

test('👁️ ★ Apex Spotter: a fresh mark rallies the wolf once per Blitz Beat, an old mark does not', () => {
  assert.deepEqual(hawkRun({ ...st, j2HawkEvo: 1 }, 2).rallies, ['wolf', 'wolf'])
  assert.deepEqual(hawkRun({ ...st, j2HawkEvo: 1 }, 2, false).rallies, [])
})
