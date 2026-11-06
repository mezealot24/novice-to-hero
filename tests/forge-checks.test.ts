import test from 'node:test'
import assert from 'node:assert/strict'
import { REFINE } from '../src/data/craft'
import { ITEMS } from '../src/data/meta'
import { costGap, gradeCheck, rateParts, refineCheck, tryRefine, upgradeGrade } from '../src/data/refine'

const sword = ITEMS.find((x) => x.id === 'longsword')!
const starter = ITEMS.find((x) => x.price === 0 && !x.craft && !x.unique)!
type S = Parameters<typeof tryRefine>[0]
const mk = (extra: object = {}) => ({ job: 'swordsman', zeny: 1e6, gems: 0, mats: new Proxy({}, { get: () => 999 }) as Record<string, number>, owned: [sword.id], ...extra }) as never as S

test('forge checks: refineCheck order matches tryRefine (cant, tainted, broken, max)', () => {
  assert.equal(refineCheck(mk(), starter), 'cant')
  assert.equal(refineCheck(mk(), sword), 'ok')
  assert.equal(refineCheck(mk({ broken: [sword.id] }), sword), 'broken')
  assert.equal(refineCheck(mk({ taint: { [sword.id]: { kind: 'none' } }, broken: [sword.id] }), sword), 'tainted') // tainted wins over broken
  assert.equal(refineCheck(mk({ refine: { [sword.id]: REFINE.max } }), sword), 'max')
  // tryRefine reports the same reason
  const r = tryRefine(mk({ broken: [sword.id] }), sword)
  assert.deepEqual(r.ok ? null : r.why, 'broken')
})

test('forge checks: gradeCheck and upgradeGrade agree', () => {
  assert.equal(gradeCheck(mk(), sword), 'ok')
  assert.equal(gradeCheck(mk(), starter), 'cant')
  assert.equal(gradeCheck(mk({ taint: { [sword.id]: { kind: 'none' } } }), sword), 'tainted')
  assert.equal(upgradeGrade(mk({ taint: { [sword.id]: { kind: 'none' } } }), sword), 'tainted')
  assert.equal(upgradeGrade(mk(), starter), 'max')
  assert.equal(gradeCheck(mk({ grade: { [sword.id]: 3 } }), sword), 'max') // longsword cap is 3 for shop gear
})

test('forge checks: rateParts splits base / pity / ghost and never passes 100%', () => {
  const a = rateParts(mk({ refine: { [sword.id]: 4 } }), sword) // +5 next: base 0.7
  assert.equal(a.n, 5)
  assert.ok(Math.abs(a.base - REFINE.rate[5]) < 1e-9 && a.pity === 0 && Math.abs(a.ghost - REFINE.pity) < 1e-9)
  const b = rateParts(mk({ refine: { [sword.id]: 4 }, refinePity: { [sword.id]: 2 } }), sword)
  assert.ok(Math.abs(b.pity - 0.2) < 1e-9 && Math.abs(b.rate - (REFINE.rate[5] + 0.2)) < 1e-9)
  const c = rateParts(mk({ refine: { [sword.id]: 9 }, refinePity: { [sword.id]: 50 } }), sword) // pity can't push past 100%
  assert.ok(c.base + c.pity + c.ghost <= 1 + 1e-9 && c.rate <= 1)
})

test('forge checks: costGap names exactly what is missing', () => {
  const cost = { mats: { m_a: 5, m_b: 2 }, zeny: 300 }
  const s = { zeny: 100, gems: 0, mats: { m_a: 3, m_b: 2 }, fodder: {} }
  const g = costGap(s, cost)
  assert.deepEqual(g.mats, { m_a: 2 })
  assert.equal(g.zeny, 200)
  assert.equal(g.gems, 0)
  assert.equal(g.noFodder, false)
  assert.deepEqual(costGap({ zeny: 999, gems: 5, mats: { m_a: 5, m_b: 2 }, fodder: {} }, { ...cost, gems: 10 }), { mats: {}, zeny: 0, gems: 5, noFodder: false })
})
