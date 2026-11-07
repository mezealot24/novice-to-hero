import test from 'node:test'
import assert from 'node:assert/strict'
import { DUNGEONS } from '../src/data/game-data'
import { buildRun, DAILY, dailyOf, deepDailyOk, MODES } from '../src/data/modes'
import type { SaveData } from '../src/save'

const fake = (clearsBy: Record<string, number>) => ({ baseLevel: 45, race: 'human', stats: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1, wis: 1 }, equipped: {}, skills: {}, clears: 1, clearsBy, modes: {} }) as unknown as SaveData

test('🌌 deep daily picks only D6-D10, normal daily only D2-D5, both stable per seed', () => {
  for (let seed = 20261101; seed < 20261131; seed++) {
    assert.ok(DAILY.deepPool.includes(dailyOf(seed, true).dg.id))
    assert.ok(DAILY.pool.includes(dailyOf(seed).dg.id))
    assert.equal(dailyOf(seed, true).dg.id, dailyOf(seed, true).dg.id)
  }
  assert.ok(DAILY.deepPool.every((id) => DUNGEONS.find((d) => d.id === id)?.level), 'deep pool = level dungeons')
})

test('🌌 deep daily opens after D10', () => {
  assert.equal(deepDailyOk(fake({ d1: 1, d9: 1 })), false)
  assert.equal(deepDailyOk(fake({ d1: 1, d10: 1 })), true)
})

test('🌌 deep daily reward is its own once-a-day record, the normal daily one is untouched', () => {
  const s = fake({ d1: 1, d10: 1 }), seed = 20261108
  const deep = buildRun(s, { mode: 'daily', deep: true, seed })
  assert.equal(deep.deepDaily, true)
  const won = { won: true, left: false, floor: 0, bank: { zeny: 0, mats: {} } }
  const a = MODES.daily.reward(s, deep, won)!, b = MODES.daily.reward(s, deep, won)!
  assert.equal(a.gems, DAILY.deepGems)
  assert.equal(b.gems, 0)
  const normal = MODES.daily.reward(s, buildRun(s, { mode: 'daily', seed }), won)!
  assert.equal(normal.gems, DAILY.gems)
})
