import test from 'node:test'
import assert from 'node:assert/strict'
import { checkSave, totalXp } from '../server/src/sanity'
import { SKU_PRICE } from '../server/src/skus'
import { newSave } from '../src/save'

const base = () => ({ ...newSave('t', 'human') })
const rules = (f: { rule: string }[]) => f.map((x) => x.rule)

test('fresh save passes', () => {
  assert.deepEqual(checkSave(null, base(), 0), [])
})

test('Lv 99 with no history is flagged (stats do not add up)', () => {
  const s = { ...base(), baseLevel: 99 }
  s.stats = { ...s.stats, str: 99, vit: 99, dex: 99, int: 99, wis: 99, luk: 99, agi: 99 }
  s.statPoints = 3 + 3 * 98 // would be fine; hacked stats below
  const hacked = { ...s, stats: { ...s.stats, str: 999 } }
  assert.ok(rules(checkSave(null, hacked, 0)).includes('stats'))
})

test('level jump / zeny jump / gems jump vs previous save', () => {
  const prev = base()
  const next = { ...prev, baseLevel: 90, zeny: 9_999_999, gems: 5000 }
  const r = rules(checkSave(prev, next, 0.5))
  assert.ok(r.includes('level-jump') && r.includes('zeny-jump') && r.includes('gems-jump'))
})

test('normal play over an hour is not flagged', () => {
  const prev = base()
  const next = { ...prev, baseLevel: 6, baseXp: 10, zeny: 5000, gems: 60, statPoints: 3 + 15 }
  assert.deepEqual(checkSave(prev, next, 1), [])
})

test('unknown items and non-numeric values are flagged', () => {
  assert.ok(rules(checkSave(null, { ...base(), owned: ['knife', 'godsword'] }, 0)).includes('unknown-item'))
  assert.deepEqual(rules(checkSave(null, { ...base(), zeny: 'lots' as unknown as number }, 0)), ['shape'])
})

test('xp can not roll back; totalXp is monotonic in level', () => {
  assert.ok(totalXp(5, 0) > totalXp(4, 69))
  const prev = { ...base(), baseLevel: 10, baseXp: 50 }
  assert.ok(rules(checkSave(prev, { ...prev, baseLevel: 3, baseXp: 0 }, 1)).includes('xp-rollback'))
})

test('SKU price table comes from meta (supporter present)', () => {
  assert.ok(SKU_PRICE.supporter > 0)
})
