import test from 'node:test'
import assert from 'node:assert/strict'
import { ITEMS, slotCount } from '../src/data/meta'
import { addCard, cardsOffOnEquip, cardsOffOnUnequip, equip, newSave, returnStrayCards, socketCard, unequip } from '../src/save'

// Q 2026-11-20: gear that stops being worn always gives its cards back to the bag.
const weapons = ITEMS.filter((it) => it.slot === 'weapon' && !it.twoHand && !it.unique && !it.jobs && slotCount(it) >= 1)
const twoHand = ITEMS.find((it) => it.slot === 'weapon' && it.twoHand && !it.unique)
const offhand = ITEMS.find((it) => it.slot === 'offhand' && !it.unique && slotCount(it) >= 1)

function setup() {
  const s = newSave('t', 'human')
  const [a, b] = weapons
  s.owned.push(a.id, b.id)
  equip(s, a.id, 'weapon')
  addCard(s, 'card_wolf')
  assert.ok(socketCard(s, a.id, 'card_wolf', slotCount(a)))
  return { s, a, b }
}

test('swapping a weapon: warn lists the cards, then they go back to the bag', () => {
  const { s, a, b } = setup()
  const off = cardsOffOnEquip(s, b.id, 'weapon')
  assert.equal(off.length, 1)
  assert.equal(off[0].item.id, a.id)
  assert.deepEqual(off[0].cards, ['card_wolf'])
  assert.ok(equip(s, b.id, 'weapon'))
  assert.equal(s.sockets?.[a.id], undefined)
  assert.equal(s.cards?.card_wolf, 1)
})

test('taking a weapon off returns its cards; nothing to warn about when empty', () => {
  const { s, a } = setup()
  assert.equal(cardsOffOnUnequip(s, 'weapon').length, 1)
  assert.ok(unequip(s, 'weapon'))
  assert.equal(s.sockets?.[a.id], undefined)
  assert.equal(s.cards?.card_wolf, 1)
  assert.equal(cardsOffOnUnequip(s, 'weapon').length, 0)
})

test('re-wearing the same item does not pop its cards', () => {
  const { s, a } = setup()
  assert.equal(cardsOffOnEquip(s, a.id, 'weapon').length, 0)
  equip(s, a.id, 'weapon')
  assert.deepEqual(s.sockets?.[a.id], ['card_wolf'])
})

test('a 2-handed weapon pushing the off-hand out returns the off-hand cards', { skip: !twoHand || !offhand }, () => {
  const s = newSave('t', 'human')
  s.owned.push(twoHand!.id, offhand!.id)
  equip(s, offhand!.id, 'offhand')
  addCard(s, 'card_jellop')
  assert.ok(socketCard(s, offhand!.id, 'card_jellop', slotCount(offhand!)))
  const off = cardsOffOnEquip(s, twoHand!.id, 'weapon')
  assert.ok(off.some((o) => o.item.id === offhand!.id))
  equip(s, twoHand!.id, 'weapon')
  assert.equal(s.cards?.card_jellop, 1)
})

test('load fix: cards left in unworn gear (old saves) go back to the bag', () => {
  const { s, b } = setup()
  s.sockets![b.id] = ['card_bat'] // b is in the bag, not worn
  returnStrayCards(s)
  assert.equal(s.sockets?.[b.id], undefined)
  assert.equal(s.cards?.card_bat, 1)
  assert.deepEqual(s.sockets?.[weapons[0].id], ['card_wolf']) // worn gear keeps its cards
})

test('card filters: slot / tier / found', async () => {
  const { EQUIP_CARDS, filterCards } = await import('../src/data/cards')
  assert.ok(filterCards(EQUIP_CARDS, { slot: 'weapon' }).every((cd) => cd.slot === 'weapon'))
  assert.ok(filterCards(EQUIP_CARDS, { tier: 'boss' }).every((cd) => cd.tier === 'boss'))
  assert.equal(filterCards(EQUIP_CARDS, { slot: 'all', tier: 'all' }).length, EQUIP_CARDS.length)
  const seen = new Set(['card_wolf'])
  assert.deepEqual(filterCards(EQUIP_CARDS, { seen: 'got' }, seen).map((cd) => cd.id), ['card_wolf'])
  assert.equal(filterCards(EQUIP_CARDS, { seen: 'miss' }, seen).length, EQUIP_CARDS.length - 1)
})
