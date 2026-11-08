import test from 'node:test'
import assert from 'node:assert/strict'
import { DUNGEONS } from '../src/data/game-data'
import { BOUNTY, bountyOf, bountyOk, buildRun, MODES, weeklySeed } from '../src/data/modes'
import { TAINT_MAT } from '../src/data/taint'
import type { SaveData } from '../src/save'

const fake = (clearsBy: Record<string, number>) => ({
  baseLevel: 50,
  race: 'human',
  stats: { str: 10, agi: 10, vit: 10, int: 10, dex: 10, luk: 10, wis: 10 },
  equipped: {},
  skills: {},
  clears: 1,
  clearsBy,
  modes: {},
} as unknown as SaveData)

test('🎯 weeklySeed: stable Monday-Sunday, increments next week', () => {
  // Sunday Nov 8, 2026 and Thursday Nov 5, 2026 are the same ISO week 45
  const sun = new Date(2026, 10, 8)
  const thu = new Date(2026, 10, 5)
  assert.equal(weeklySeed(sun), 202645)
  assert.equal(weeklySeed(thu), 202645)

  // Monday Nov 9, 2026 is week 46
  const nextMon = new Date(2026, 10, 9)
  assert.equal(weeklySeed(nextMon), 202646)
})

test('🎯 bountyOk: unlocks after clearing D6', () => {
  assert.equal(bountyOk(fake({ d1: 1, d5: 1 })), false)
  assert.equal(bountyOk(fake({ d1: 1, d6: 1 })), true)
})

test('🎯 bountyOf: always rolls a level dungeon D6-D10 and 2 mutators', () => {
  for (let week = 202601; week <= 202652; week++) {
    const { dg, mutators } = bountyOf(week)
    assert.ok(BOUNTY.pool.includes(dg.id))
    assert.ok(dg.level, 'must be a level dungeon')
    assert.equal(mutators.length, 2, 'must roll 2 mutators')
  }
})

test('🎯 bountyOf: uses cleared pool if save is provided', () => {
  const sOnlyD6 = fake({ d6: 1 })
  const { dg } = bountyOf(202645, sOnlyD6)
  assert.equal(dg.id, 'd6', 'player with only D6 cleared only gets D6 bounty')
})

test('🎯 bountyRun: builds a focused 3-room hunt (wave -> mini -> boss)', () => {
  const s = fake({ d6: 1, d10: 1 })
  const cfg = buildRun(s, { mode: 'bounty', seed: 202645 })
  assert.equal(cfg.modeId, 'bounty')
  assert.equal(cfg.tag, '🎯')
  assert.equal(cfg.affix, true)
  assert.equal(cfg.mutators.length, 2)

  // 3 rooms
  const r0 = cfg.roomAt(0)
  const r1 = cfg.roomAt(1)
  const r2 = cfg.roomAt(2)
  const r3 = cfg.roomAt(3)
  assert.ok(r0 && !r0.boss && !r0.mini, 'room 0 is wave')
  assert.ok(r1 && (r1.mini || !r1.boss), 'room 1 is mini')
  assert.ok(r2 && r2.boss, 'room 2 is boss')
  assert.equal(r3, null, 'only 3 rooms')
})

test('🎯 MODES.bounty.reward: pays gems, fortune, crystals once per week; repeats pay boss mats only', () => {
  const s = fake({ d6: 1, d10: 1 })
  const seed = 202645
  const cfg = buildRun(s, { mode: 'bounty', seed })
  const won = { won: true, left: false, floor: 0, bank: { zeny: 0, mats: {} } }

  // First win of the week
  const r1 = MODES.bounty.reward(s, cfg, won)!
  assert.equal(r1.gems, BOUNTY.gems)
  assert.equal(r1.fortune, BOUNTY.fortune)
  assert.equal(r1.zeny, BOUNTY.zeny)
  assert.equal(r1.mats[TAINT_MAT], BOUNTY.taintCrystals)
  assert.ok(r1.mats['b_' + cfg.themeAt(0).id] >= BOUNTY.bossMats)

  // Second win of the same week
  const r2 = MODES.bounty.reward(s, cfg, won)!
  assert.equal(r2.gems, 0)
  assert.equal(r2.fortune, 0)
  assert.equal(r2.mats[TAINT_MAT], undefined)
  assert.ok(r2.lines[0].includes('รับรางวัลค่าหัวพิเศษไปแล้ว'))

  // Loss gives no reward
  const loss = { won: false, left: false, floor: 0, bank: { zeny: 0, mats: {} } }
  const r3 = MODES.bounty.reward(s, cfg, loss)!
  assert.equal(r3.gems, 0)
  assert.equal(r3.lines.length, 0)
})

