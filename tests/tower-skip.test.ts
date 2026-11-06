import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRun, MODES, modeRec, payTowerSkip, recordTowerCheckpoint, TOWER, towerCatchUp, towerCheckpoints, towerFloorLoot, towerMaxCheckpoint, towerSkipCheck, towerSkipGems } from '../src/data/modes'
import { newSave, type SaveData } from '../src/save'

/** A fresh save whose tower best floor is `best` and that holds `gems` gems. */
function mk(best: number, gems = 1000): SaveData {
  const s = newSave('t', 'human')
  s.gems = gems
  if (best) modeRec(s, 'tower').bestFloor = best
  return s
}

test('v87 tower skip: max checkpoint = floor(best / 10) * 10', () => {
  assert.equal(towerMaxCheckpoint(34), 30)
  assert.equal(towerMaxCheckpoint(29), 20)
  assert.equal(towerMaxCheckpoint(30), 30)
  assert.equal(towerMaxCheckpoint(9), 0)
  assert.equal(towerMaxCheckpoint(0), 0)
  assert.deepEqual(towerCheckpoints(34), [10, 20, 30])
  assert.deepEqual(towerCheckpoints(9), [])
})

test('v87 tower skip: cost is S x skipGems, checked against the wallet', () => {
  assert.equal(TOWER.skipGems, 1)
  assert.equal(towerSkipGems(30), 30)
  const s = mk(34, 29)
  assert.deepEqual(towerSkipCheck(s, 30), { ok: false, why: 'gems' })
  assert.deepEqual(towerSkipCheck(s, 20), { ok: true })
  assert.deepEqual(towerSkipCheck(s, 40), { ok: false, why: 'locked' }) // above the best
  assert.deepEqual(towerSkipCheck(s, 25), { ok: false, why: 'locked' }) // not a checkpoint
  assert.deepEqual(towerSkipCheck(s, 0), { ok: false, why: 'locked' })
})

test('v87 tower skip: gems are spent only by payTowerSkip, and only when allowed', () => {
  const s = mk(34, 50)
  assert.equal(payTowerSkip(s, 40), null)
  assert.equal(s.gems, 50)
  const got = payTowerSkip(s, 30)
  assert.ok(got)
  assert.equal(s.gems, 20)
  assert.equal(payTowerSkip(s, 30), null) // 20 < 30
  assert.equal(s.gems, 20)
})

test('v87 tower skip: catch-up uses the recorded level, or a guess for old saves', () => {
  const s = mk(34)
  assert.deepEqual(towerCatchUp(s, 30), { lv: 16, relic: true, est: true }) // 1 + round(30 x 0.5)
  assert.equal(towerCatchUp(s, 10).lv, 6)
  assert.equal(recordTowerCheckpoint(s, 30, 22, true), true)
  assert.deepEqual(towerCatchUp(s, 30), { lv: 22, relic: true, est: false })
  assert.equal(recordTowerCheckpoint(s, 30, 18, false), false) // a weaker run never lowers the record or drops the relic
  assert.deepEqual(towerCatchUp(s, 30), { lv: 22, relic: true, est: false })
  assert.equal(recordTowerCheckpoint(s, 30, 40, false), true) // a stronger run raises the level (Q 2026-11-07: max, not first)
  assert.deepEqual(towerCatchUp(s, 30), { lv: 40, relic: true, est: false }) // relic stays: some run held one
  recordTowerCheckpoint(s, 20, 15, false)
  assert.equal(recordTowerCheckpoint(s, 20, 15, true), true) // same level but a relic this time: relic becomes true
  assert.deepEqual(towerCatchUp(s, 20), { lv: 15, relic: true, est: false })
  assert.equal(recordTowerCheckpoint(s, 20, 15, true), false) // nothing changed
  recordTowerCheckpoint(s, 40, 22, false)
  assert.equal(recordTowerCheckpoint(s, 40, 18, true), true) // weaker run WITH a relic: lv stays, relic flips on
  assert.deepEqual(towerCatchUp(s, 40), { lv: 22, relic: true, est: false })
  assert.equal(recordTowerCheckpoint(s, 25, 9, false), false) // only every 10th floor
  assert.equal(recordTowerCheckpoint(s, 0, 9, false), false)
  assert.equal(towerCatchUp(mk(1000), 1000).lv, TOWER.skipLvMax) // guess is capped
})

test('v87 tower skip: the run starts at floor S+1', () => {
  const s = mk(34)
  const cfg = buildRun(s, { mode: 'tower', startFloor: 31 })
  assert.equal(cfg.roomAt(0).floor, 31)
  assert.equal(buildRun(s, { mode: 'tower' }).roomAt(0)?.floor, 1)
})

test('v87 tower skip: skipped floors never pay (no zeny, mats, gems, best floor)', () => {
  const tower = MODES.tower
  // died / left straight away on a skip to 30: nothing was cleared
  const s = mk(34, 0)
  const out = tower.reward(s, buildRun(s, { mode: 'tower', startFloor: 31 }), { won: false, left: true, floor: 0, from: 30, bank: { zeny: 0, mats: {} } })!
  assert.equal(out.zeny, 0)
  assert.equal(out.gems, 0)
  assert.deepEqual(out.mats, {})
  assert.equal(s.modes!.tower!.bestFloor, 34)
  // even a stray towerFloor <= S (a bug upstream) cannot raise the record or pay first-time gems
  const t = mk(0, 0)
  const bad = tower.reward(t, buildRun(t, { mode: 'tower', startFloor: 31 }), { won: false, left: true, floor: 30, from: 30, bank: { zeny: 0, mats: {} } })!
  assert.equal(bad.gems, 0)
  assert.equal(t.modes!.tower!.bestFloor, undefined)
  // beating the record for real still works, and pays only the cleared floors' bank
  const u = mk(34, 0)
  const bank = { zeny: 0, mats: {} as Record<string, number> }
  for (const f of [31, 32, 33, 34, 35]) { const l = towerFloorLoot(f, 10); bank.zeny += l.zeny }
  const real = tower.reward(u, buildRun(u, { mode: 'tower', startFloor: 31 }), { won: true, left: true, floor: 35, from: 30, bank })!
  assert.equal(u.modes!.tower!.bestFloor, 35)
  assert.equal(real.zeny, bank.zeny) // 5 floors of loot, not 35
  const floors30 = [...Array(30)].reduce((a, _, i) => a + towerFloorLoot(i + 1, 10).zeny, 0)
  assert.ok(real.zeny < floors30, 'the 30 skipped floors are not in the bank')
})
