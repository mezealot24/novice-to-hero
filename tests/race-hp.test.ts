import test from 'node:test'
import assert from 'node:assert/strict'
import { heroStats, itemById, ITEMS, JOB2_CHANGE_BONUS, RACE_IDS, RACES, raceBase, raceSteps, totalBase } from '../src/data/meta'
import { CLASS_HP, classItemHp, itemTier } from '../src/data/class-hp'
import { JOB2 } from '../src/data/jobs2'

const { newSave } = await import('../src/save')

// ---------- 🧬 races (Q 2026-11-20) ----------
test('old save race ids still exist; 7 races, every one has a weakness except human', () => {
  for (const id of ['human', 'elf', 'dwarf']) assert.ok(RACES[id as 'human'], id)
  assert.equal(RACE_IDS.length, 7)
  for (const id of RACE_IDS) {
    const r = RACES[id]
    const neg = Object.values(r.growth).some((v) => v! < 0)
    assert.equal(neg, id !== 'human', `${id} growth weakness`)
    const net = Object.values(r.growth).reduce((a, v) => a + v!, 0)
    assert.ok(net >= 2 && net <= 2.2, `${id} net growth ${net}`)
  }
})

test('race steps: every 5 Job Lv per tier, Novice steps kept after the job change', () => {
  assert.equal(raceSteps({ job: 'novice', jobLevel: 4 }), 0)
  assert.equal(raceSteps({ job: 'novice', jobLevel: 10 }), 2)
  assert.equal(raceSteps({ job: 'thief', jobLevel: 1 }), 2)
  assert.equal(raceSteps({ job: 'thief', jobLevel: 40 }), 2 + 8)
  assert.equal(raceSteps({ job: 'thief', jobLevel: 99 }), 2 + 8, 'base class capped at Job Lv 40')
  assert.equal(raceSteps({ job: 'thief', jobLevel: 40, job2: 'rogue', job2Level: 50 }), 20)
  assert.equal(raceSteps({ job: 'thief', jobLevel: 40, job2: 'rogue', job2Level: 50, job3: 'stalker', job3Level: 30 }), 26)
  assert.equal(raceSteps({ job: 'thief', jobLevel: 40, job2: 'mobster', job2Level: 50, job3: 'stalker', job3Level: 30 }), 20, 'parked 3rd job gives none')
})

test('race growth goes negative on weaknesses, truncated toward 0', () => {
  const d = raceBase('dwarf', 26)
  assert.equal(d.vit, 3 + 39)
  assert.equal(d.str, 2 + 26)
  assert.equal(d.agi, -1 - 13)
  const h = raceBase('human', 3)
  assert.equal(h.wis, 0, '0.3 x 3 = 0.9 -> 0')
  assert.equal(raceBase('human', 10).wis, 3)
  assert.equal(raceBase('elf', 1).vit, -1, '-0.5 -> 0, start -1 stays')
  assert.equal(raceBase('elf', 2).vit, -2)
})

test('totalBase reads race growth; a stat never drops under 1', () => {
  const s = newSave('t', 'dwarf')
  Object.assign(s, { job: 'thief', jobLevel: 40 })
  const b = totalBase(s)
  assert.equal(b.agi, 1) // 1 - 1 - 5 -> clamped
  assert.equal(b.vit, 1 + 3 + 15 + 0)
})

// ---------- 🎁 2nd job change bonus ----------
test('every 2nd job has a change bonus; it adds flat HP and base stats', () => {
  for (const id of Object.keys(JOB2) as (keyof typeof JOB2)[]) {
    const cb = JOB2_CHANGE_BONUS[id]
    assert.ok(cb.maxHp > 0, id)
    assert.ok(Object.keys(cb.base).length >= 2, id)
  }
  const s = newSave('t', 'human')
  Object.assign(s, { job: 'swordsman', jobLevel: 40 })
  const before = heroStats(s), bBefore = totalBase(s)
  Object.assign(s, { job2: 'knight', job2Level: 1 })
  const after = totalBase(s)
  assert.equal(after.vit - bBefore.vit, 3)
  assert.equal(after.str - bBefore.str, 2)
  assert.ok(heroStats(s).maxHp - before.maxHp >= JOB2_CHANGE_BONUS.knight.maxHp)
})

// ---------- 🩸 class gear flat HP ----------
test('every class-locked item gives flat HP now (except glass-cannon -% HP pieces)', () => {
  const zero = ITEMS.filter((it) => it.jobs?.length && !(it.mod.maxHp ?? 0) && !((it.pct?.maxHp ?? 0) < 0))
  assert.deepEqual(zero.map((i) => i.id), [])
  assert.equal(itemById('u_berserkaxe').mod.maxHp ?? 0, 0)
})

test('class HP scales with zone tier and class, hand-set HP is untouched', () => {
  assert.equal(itemById('cc_kn_barding').mod.maxHp, 240) // hand-set, kept
  assert.equal(itemTier(itemById('cc_ts_kris')), 10)
  assert.equal(itemTier(itemById('w_shadowdagger')), 2)
  assert.equal(itemById('cc_ts_kris').mod.maxHp, Math.round((CLASS_HP.perTier.weapon * CLASS_HP.classMul.thief * 10) / 5) * 5)
  assert.ok(itemById('cc_ds_sigil').mod.maxHp! > itemById('cc_mt_seal').mod.maxHp!, 'Swordsman d14 acc > Thief d14 acc')
  assert.ok(itemById('cc_mt_seal').mod.maxHp! > itemById('c_np_charm').mod.maxHp!, 'd14 > d4')
  assert.equal(classItemHp(itemById('cc_ts_kris')), 0, 'already filled: idempotent')
})
