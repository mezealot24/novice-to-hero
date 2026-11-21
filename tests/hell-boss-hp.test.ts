// Q 2026-11-22 "Nerf max hp boss hell mode" (data/hell.ts HELL_MODE.bossHp / bossHpCap, BattleScene.statDef). Run: node tools/test.mjs hell-boss
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HELL_MODE, hellBossHp } from '../src/data/hell'
import { TABLES } from '../src/data/tunables'

test('hell MVP HP = x bossHp, capped at bossHpCap x the hard boss; cap 0 = off', () => {
  const keep = { ...HELL_MODE }
  assert.equal(hellBossHp(16693, 3271), Math.round(Math.min(16693 * HELL_MODE.bossHp, 3271 * HELL_MODE.bossHpCap)))
  assert.equal(hellBossHp(240893, 21191), Math.round(21191 * HELL_MODE.bossHpCap)) // D5 lich: the cap bites
  assert.equal(hellBossHp(6317124, 1428352), Math.round(6317124 * HELL_MODE.bossHp)) // D10: the x0.5 bites
  HELL_MODE.bossHpCap = 0
  assert.equal(hellBossHp(240893, 21191), Math.round(240893 * HELL_MODE.bossHp))
  HELL_MODE.bossHp = 1
  assert.equal(hellBossHp(240893, 21191), 240893)
  assert.ok(hellBossHp(0, 0) >= 1)
  Object.assign(HELL_MODE, keep)
})

test('admin can tune hell.bossHp / hell.bossHpCap', () => {
  const t = TABLES.monStat, root = t.target() as { hell: typeof HELL_MODE }
  assert.equal(root.hell, HELL_MODE)
  const pats = t.fields.map(([p]) => p)
  assert.ok(pats.includes('hell.bossHp') && pats.includes('hell.bossHpCap'))
})
