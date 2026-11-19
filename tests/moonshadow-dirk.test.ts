import test from 'node:test'
import assert from 'node:assert/strict'
import { canWear, itemById } from '../src/data/meta'
import { setBonuses, setById } from '../src/data/sets'

test('moonshadow: Thief off-hand c_moondirk is a D3 craft and a set member', () => {
  const it = itemById('c_moondirk')
  assert.ok(it, 'item exists')
  assert.equal(it!.slot, 'offhand')
  assert.deepEqual(it!.jobs, ['thief'])
  assert.equal(it!.craft?.dg, 'd3')
  assert.ok(setById('moonshadow')!.memberIds!.includes('c_moondirk'))
  assert.ok(canWear(it!, 'thief'), 'thief can wear it')
  assert.ok(!canWear(it!, 'swordsman'), 'other classes cannot')
})

test('moonshadow: cloak + dirk give the 2-piece bonus, + pendant the 3-piece', () => {
  const worn2 = ['c_moonfur', 'c_moondirk'].map((id) => itemById(id)!)
  const s2 = setBonuses(worn2).active.find((a) => a.set.id === 'moonshadow')!
  assert.equal(s2.count, 2)
  assert.equal(s2.activeTiers.length, 1)
  const worn3 = [...worn2, itemById('cf_shadowfang')!]
  const s3 = setBonuses(worn3).active.find((a) => a.set.id === 'moonshadow')!
  assert.equal(s3.activeTiers.length, 2)
})
