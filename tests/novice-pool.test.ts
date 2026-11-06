import test from 'node:test'
import assert from 'node:assert/strict'
import { heroStats, NOVICE_RULES, noviceLeft, smashLv } from '../src/data/meta'

const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v }, removeItem: (k: string) => { delete mem[k] },
}
const { adopt, migrateSmashAuto, newSave, resetNovice, save } = await import('../src/save')

test('v85 novice pool: 10 free points from a fresh save, passives add stats', () => {
  const s = newSave('t', 'human')
  assert.equal(noviceLeft(s.skills), NOVICE_RULES.points)
  const a = heroStats(s)
  const b = heroStats({ ...s, skills: { ...s.skills, power: 5, iron: 3, swift: 2 } })
  assert.equal(noviceLeft({ ...s.skills, power: 5, iron: 3, swift: 2 }), 0)
  assert.equal(b.atk - a.atk, 15)
  assert.equal(b.def - a.def, 3)
  assert.equal(b.flee - a.flee, 4)
  assert.ok(b.aspd > a.aspd && b.mdef > a.mdef && b.matk > a.matk)
})

test('v85 migration: old firstaid/tough Job Lv points refunded once, levels kept; reset costs gems', () => {
  const old = { ...newSave('t', 'human'), skillPoints: 2, skills: { smash: 3, firstaid: 2, tough: 4 }, gems: 15 } as Record<string, unknown>
  delete old.nov2
  assert.ok(adopt(old))
  const s = save()
  assert.equal(s.skillPoints, 8)
  assert.equal(s.skills.firstaid, 2)
  assert.equal(s.skills.power, 0)
  assert.equal(noviceLeft(s.skills), NOVICE_RULES.points - 6)
  assert.ok(adopt(JSON.parse(mem[Object.keys(mem)[0]]))) // second load: no double refund
  assert.equal(save().skillPoints, 8)
  assert.ok(resetNovice(save()))
  assert.equal(save().gems, 15 - NOVICE_RULES.resetGems)
  assert.equal(noviceLeft(save().skills), NOVICE_RULES.points)
  assert.equal(resetNovice(save()), false) // nothing left to clear
})

test('v86 ทุบ levels with Job Lv (no points); old smash points come back once', () => {
  assert.deepEqual([0, 1, 5, 10, 40].map(smashLv), [1, 1, 5, 10, 10])
  const s = newSave('t', 'human')
  s.jobLevel = 7
  const lo = heroStats({ ...s, jobLevel: 1 }), hi = heroStats(s)
  assert.ok(hi.smashMul > lo.smashMul) // stronger at a higher Job Lv, smash points untouched
  const old = { ...s, skills: { ...s.skills, smash: 6 }, skillPoints: 1, nov3: undefined }
  migrateSmashAuto(old); migrateSmashAuto(old)
  assert.equal(old.skillPoints, 6) // 1 + (6 - 1), once
  assert.equal(old.skills.smash, 1)
})
