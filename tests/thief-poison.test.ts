// ☠️ Thief-line poison rebalance (Q 2026-11-17): per stack = flat Stats.poisonDmg + KIT.poison.atkPer x P.ATK, admin kit knobs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { KIT, poisonCapOf, poisonDefCut, thiefPoisonPerStack } from '../src/data/skill-math'
import { applyPatch, fieldFor, guardsFor } from '../src/data/patch'

test('poison per stack = flat + atkPer x P.ATK', () => {
  assert.equal(thiefPoisonPerStack({ poisonDmg: 2, atk: 0, matk: 0 }), 2)
  assert.equal(thiefPoisonPerStack({ poisonDmg: 2, atk: 400, matk: 100 }), 2 + KIT.poison.atkPer * 400 + KIT.poison.matkPer * 100)
  assert.ok(thiefPoisonPerStack({ poisonDmg: 2, atk: 400, matk: 0 }) > thiefPoisonPerStack({ poisonDmg: 2, atk: 60, matk: 0 }), 'poison grows with P.ATK')
  assert.ok(thiefPoisonPerStack({ poisonDmg: 2, atk: 100, matk: 200 }) > thiefPoisonPerStack({ poisonDmg: 2, atk: 100, matk: 20 }), 'poison grows with M.ATK (INT)')
})

test('poison cap = baseCap + poisonCap', () => {
  assert.equal(poisonCapOf({ poisonCap: 0 }), KIT.poison.baseCap)
  assert.equal(poisonCapOf({ poisonCap: 9 }), KIT.poison.baseCap + 9)
})

test('poison shreds DEF per stack, capped', () => {
  assert.equal(poisonDefCut(0), 0)
  assert.equal(poisonDefCut(10), Math.min(KIT.poison.defCap, KIT.poison.defPer * 10))
  assert.equal(poisonDefCut(999), KIT.poison.defCap)
})

test('admin kit table exposes poison.* and Ratio AGI knobs', () => {
  for (const p of ['poison.atkPer', 'poison.matkPer', 'poison.intPer', 'poison.burstKeep', 'poison.defPer', 'poison.defCap', 'poison.baseCap', 'thiefUltAgiK', 'thiefUltAgiShareCap']) assert.ok(fieldFor('kit', p), p)
  const patch = { kit: { 'poison.atkPer': 0, 'poison.matkPer': 0 } }
  const r = applyPatch(patch, guardsFor(patch))
  try {
    assert.ok(r.ok, JSON.stringify(r.errors))
    assert.equal(thiefPoisonPerStack({ poisonDmg: 3, atk: 500, matk: 200 }), 3, 'atkPer + matkPer 0 = old flat poison')
  } finally { r.revert() }
})

test('ล้วงกระเป๋า steals by the monster top stat', async () => {
  const { topStats, ARCHETYPES } = await import('../src/data/mon-stats')
  const { MONSTERS } = await import('../src/data/game-data')
  const fake = (statAlloc: unknown) => ({ ...Object.values(MONSTERS)[0], base: undefined, statAlloc }) as never
  assert.equal(topStats(fake('caster'))[0], 'int')
  assert.equal(topStats(fake('tank'))[0], 'vit')
  assert.equal(topStats(fake({ luk: 5, str: 1 }))[0], 'luk')
  assert.deepEqual(topStats(fake('bruiser')).slice(0, 2), ['str', 'vit'])
  assert.ok(ARCHETYPES.support.wis! > 0)
  for (const p of ['thiefSteal.atk', 'thiefSteal.res', 'thiefSteal.poison', 'thiefSteal.brkTurns', 'thiefSteal.heal', 'thiefSteal.crit', 'thiefSteal.turns']) assert.ok(fieldFor('kit', p), p)
})

test('พิษชา threshold drops with node Lv, never below 1', async () => {
  const { slowAtLv } = await import('../src/data/skill-math')
  assert.equal(slowAtLv(1), KIT.poison.slowAt)
  assert.ok(slowAtLv(3) < slowAtLv(1))
  assert.ok(slowAtLv(99) >= 1)
  for (const p of ['thiefShadow.max', 'thiefShadow.turns', 'thiefShadow.dodge', 'thiefShadow.double', 'thiefShadow.ult', 'thiefMark.max', 'thiefMark.dmg', 'poison.slowAt', 'poison.slowStep', 'poison.slowTurns', 'poison.overflowMul']) assert.ok(fieldFor('kit', p), p)
})

test('Thief-line trees: mechanic nodes wired, no duplicate display names', async () => {
  const { tree } = await import('../src/data/trees/thief')
  const { tree2: rogue } = await import('../src/data/trees2/rogue')
  const { tree2: mob } = await import('../src/data/trees2/mobster')
  const byId = (t: typeof tree, id: string) => t.nodes.find((n) => n.id === id)!
  assert.ok((byId(tree, 'thief_a2').mod(3).poisonSlow ?? 0) > 0, 'พิษชา')
  assert.ok((byId(tree, 'thief_c2').mod(3).thMark ?? 0) > 0, 'หมายหัว')
  assert.ok((byId(mob, 'mb_p4').mod(1).poisonOverflow ?? 0) > 0, 'พิษล้น')
  const { SKILL2 } = await import('../src/data/skill2')
  const { JOBS } = await import('../src/data/jobs')
  const { JOB2 } = await import('../src/data/jobs2')
  const names = [...[tree, rogue, mob].flatMap((t) => [...t.nodes, ...t.talents].map((n) => n.name)),
    ...SKILL2.filter((k) => k.job === 'thief').flatMap((k) => [k.name, k.plus.name, k.star.name]),
    JOBS.thief.auto.name, JOBS.thief.ult.name, ...(['rogue', 'mobster'] as const).flatMap((j) => [JOB2[j].skill3!.name, JOB2[j].ult.name, JOB2[j].signature!.name])]
  const dup = names.filter((n, i) => names.indexOf(n) !== i)
  assert.deepEqual(dup, [], `duplicate names: ${dup.join(', ')}`)
})

test('poison %HP bite + spread knobs, default cap 20', async () => {
  const { heroStats } = await import('../src/data/meta')
  const { newSave } = await import('../src/save')
  assert.equal(KIT.poison.baseCap, 20)
  const s = newSave('t', 'human') as unknown as { job: string; stats: Record<string, number> }
  s.job = 'archer'; s.stats.int = 30
  const st = heroStats(s as never)
  assert.ok(Math.abs(st.poisonHpPct - (KIT.poison.hpPct + KIT.poison.hpPctInt * 3)) < 1e-9 || st.poisonHpPct > KIT.poison.hpPct, 'INT raises the %HP bite (every job)')
  for (const p of ['poison.hpAbove', 'poison.hpPct', 'poison.hpPctInt', 'poison.hpFlat', 'poison.spreadShare', 'poison.spreadBurst']) assert.ok(fieldFor('kit', p), p)
})
