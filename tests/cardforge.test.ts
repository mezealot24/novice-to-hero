import test from 'node:test'
import assert from 'node:assert/strict'
import { bagCards, canCardforge, cardforge, cardforgeCost } from '../src/data/cardforge'
import { itemById } from '../src/data/meta'

const it = itemById('cf_jellthorn') // d1: card_jellop x3 + card_king x1
type S = Parameters<typeof cardforge>[0]
const mk = (over: object = {}) => {
  const c = cardforgeCost(it)
  return { zeny: c.zeny + 100, gems: 0, owned: [], mats: { ...c.mats }, cards: { ...c.cards }, clearsBy: { d1: 1 }, ...over } as never as S
}

test('v98 cardforge: only BAG cards count (socketed ones do not)', () => {
  const s = mk({ cards: { card_jellop: 2 }, sockets: { somesword: ['card_jellop', 'card_king'] } })
  assert.equal(bagCards(s, 'card_jellop'), 2)
  assert.equal(canCardforge(s, it).ok, false)
})

test('v98 cardforge: pays everything or nothing', () => {
  const short = mk({ cards: { card_jellop: 3 } }) // king missing
  const before = JSON.stringify(short)
  assert.equal(cardforge(short, it), false)
  assert.equal(JSON.stringify(short), before) // save unchanged
  const ok = mk()
  const z = ok.zeny
  assert.equal(cardforge(ok, it), true)
  assert.deepEqual(ok.owned, [it.id])
  assert.equal(ok.zeny, z - cardforgeCost(it).zeny)
  assert.equal(ok.cards?.card_jellop, undefined)
  assert.equal(Object.keys(ok.mats ?? {}).length, 0)
})

test('v98 cardforge: locked recipe and already-owned piece change nothing', () => {
  const locked = mk({ clearsBy: {} })
  assert.equal(canCardforge(locked, it).why, 'locked')
  assert.equal(cardforge(locked, it), false)
  const own = mk({ owned: [it.id] })
  assert.equal(canCardforge(own, it).why, 'owned')
  assert.equal(cardforge(own, it), false)
  assert.deepEqual(own.owned, [it.id]) // exactly one copy
})
