import test from 'node:test'
import assert from 'node:assert/strict'
import { craftCost, gradeCost } from '../src/data/craft'
import { itemById } from '../src/data/meta'
import { investedMats, salvage, salvageable, salvagePreview, SALVAGE } from '../src/data/salvage'

type S = Parameters<typeof salvage>[0]
const sword = itemById('c_herosword')
const mk = (over: object = {}) => ({ zeny: 1000, gems: 0, owned: [sword.id, 'longsword'], equipped: {}, mats: {}, grade: { [sword.id]: 5 }, refine: { [sword.id]: 7 }, refineGems: [`${sword.id}:7`], ...over }) as never as S

test('v98 salvage: invested = build + every grade-up; 50% floored back; fee by grade + refine', () => {
  const inv = investedMats(sword, 5), c = craftCost(sword)
  for (const [id, n] of Object.entries(inv)) {
    let want = c.mats[id] ?? 0
    for (let g = 2; g <= 5; g++) want += gradeCost(sword, g).mats[id] ?? 0
    assert.equal(n, want)
  }
  const p = salvagePreview(mk(), sword)
  for (const [id, n] of Object.entries(inv)) assert.equal(p.mats[id], Math.floor(n * SALVAGE.matReturn))
  assert.equal(p.fee, 50 + 50 * 4 + 25 * 7) // 425
})

test('v98 salvage: a Corrupted piece gives 25%', () => {
  const p = salvagePreview(mk({ taint: { [sword.id]: { kind: 'none' } } }), sword)
  for (const [id, n] of Object.entries(investedMats(sword, 5))) assert.equal(p.mats[id] ?? 0, Math.floor(n * SALVAGE.taintedReturn))
})

test('v98 salvage: rejects worn / broken / unique / shop / not owned, and a short fee', () => {
  assert.deepEqual(salvageable(mk({ equipped: { weapon: sword.id } }), sword), { ok: false, why: 'worn' })
  assert.deepEqual(salvageable(mk({ broken: [sword.id] }), sword), { ok: false, why: 'broken' })
  assert.deepEqual(salvageable(mk(), itemById('longsword')), { ok: false, why: 'notCraft' })
  assert.deepEqual(salvageable(mk({ owned: [] }), sword), { ok: false, why: 'notOwned' })
  const uniq = { ...sword, id: 'u_x', unique: { dg: 'd3' } }
  assert.equal(salvageable(mk({ owned: ['u_x'] }), uniq).ok, false)
  const poor = mk({ zeny: 100 })
  const before = JSON.stringify(poor)
  assert.equal(salvage(poor, sword), null)
  assert.equal(JSON.stringify(poor), before)
})

test('v98 salvage: pays the fee, returns mats + socketed cards, forgets forge state but keeps refineGems, never gives zeny', () => {
  const s = mk({ sockets: { [sword.id]: ['card_skeleton'] }, refineLines: { [sword.id]: [{ stat: 'atk', val: 1 }] }, refinePity: { [sword.id]: 2 } })
  const z = s.zeny
  const r = salvage(s, sword)!
  assert.ok(r)
  assert.equal(s.zeny, z - 425)
  assert.equal(s.cards?.card_skeleton, 1) // socketed card back in the bag
  assert.deepEqual(s.owned, ['longsword'])
  assert.equal(s.grade?.[sword.id], undefined)
  assert.equal(s.refineLines?.[sword.id], undefined)
  assert.deepEqual(s.refineGems, [`${sword.id}:7`]) // the +7 gems can't be earned twice
  for (const [id, n] of Object.entries(r.mats)) assert.equal(s.mats?.[id], n)
})

test('Q 2026-11-08 salvage: a Corrupted shop piece can be melted for 50% of grade-up mats + taint crystals', () => {
  const sw = itemById('longsword')
  assert.equal(salvageable(mk({ taint: { longsword: { kind: 'curse', curse: 'glass' } } }), sw).ok, true)
  const s = mk({ grade: { longsword: 3 }, refine: {}, refineGems: [], taint: { longsword: { kind: 'none' } } })
  const inv = investedMats(sw, 3, true)
  assert.equal(inv.x_taint, 2)
  const p = salvagePreview(s, sw)
  for (const [id, n] of Object.entries(inv)) assert.equal(p.mats[id] ?? 0, Math.floor(n * 0.5))
  assert.equal(p.mats.x_taint, 1)
  assert.ok(salvage(s, sw))
  assert.equal(s.owned.includes('longsword'), false)
})
