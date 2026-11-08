import test from 'node:test'
import assert from 'node:assert/strict'
import { heroStats, itemById, offhandLocked, socketed } from '../src/data/meta'

const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v }, removeItem: (k: string) => { delete mem[k] },
}
const { adopt, canUnequip, equip, equipBlock, newSave, save, socketCard, unequip } = await import('../src/save')
type SaveData = ReturnType<typeof newSave>

/** A fresh save that owns the given items. */
function mk(...own: string[]): SaveData {
  const s = newSave('t', 'human')
  s.owned.push(...own)
  return s
}

test('2H weapon replaces the off-hand: the shield goes back to the bag (still owned)', () => {
  const s = mk('w_berserkaxe', 'o_buckler', 'shortsword')
  assert.equal(equip(s, 'o_buckler'), true)
  assert.equal(s.equipped.offhand, 'o_buckler')
  assert.equal(equip(s, 'w_berserkaxe'), true)
  assert.equal(s.equipped.weapon, 'w_berserkaxe')
  assert.equal(s.equipped.offhand, 'none_off', 'off-hand emptied by the 2H weapon')
  assert.ok(s.owned.includes('o_buckler'), 'the shield is not lost')
  assert.equal(offhandLocked(s), true)
})

test('while a 2H weapon is worn the off-hand takes nothing; a 1H weapon frees it again', () => {
  const s = mk('w_berserkaxe', 'o_buckler', 'shortsword')
  equip(s, 'w_berserkaxe')
  assert.equal(equipBlock(s, 'o_buckler'), 'twohand')
  assert.equal(equip(s, 'o_buckler'), false)
  assert.equal(s.equipped.offhand, 'none_off')
  assert.equal(equip(s, 'none_off', 'offhand'), true, 'clearing the off-hand is always fine')
  assert.equal(equip(s, 'shortsword'), true)
  assert.equal(offhandLocked(s), false)
  assert.equal(equip(s, 'o_buckler'), true)
  assert.equal(s.equipped.offhand, 'o_buckler')
})

test('swapping 2H -> 2H or 1H -> 1H keeps the rules (no off-hand piece appears from nowhere)', () => {
  const s = mk('w_berserkaxe', 'w_greatsword', 'shortsword')
  equip(s, 'w_berserkaxe'); equip(s, 'w_greatsword')
  assert.equal(s.equipped.weapon, 'w_greatsword')
  assert.equal(s.equipped.offhand, 'none_off')
})

test('unequip: head / off-hand / accessory go empty, weapon / armor fall back to the starter piece, item stays owned', () => {
  const s = mk('h_bandana', 'o_buckler', 'clover', 'shortsword', 'leather')
  equip(s, 'h_bandana'); equip(s, 'o_buckler'); equip(s, 'clover', 'acc2'); equip(s, 'shortsword'); equip(s, 'leather')
  for (const [slot, was, bare] of [['head', 'h_bandana', 'none_head'], ['offhand', 'o_buckler', 'none_off'], ['acc2', 'clover', 'none'], ['weapon', 'shortsword', 'knife'], ['armor', 'leather', 'cloth']] as const) {
    assert.equal(canUnequip(s, slot), true, `${slot} can be taken off`)
    assert.equal(unequip(s, slot), true)
    assert.equal(s.equipped[slot], bare)
    assert.ok(s.owned.includes(was), `${was} stays in the bag`)
    assert.equal(canUnequip(s, slot), false, `${slot} is bare now`)
    assert.equal(unequip(s, slot), false, 'nothing to take off twice')
  }
})

test('unequip keeps socketed cards inside the item', () => {
  const s = mk('shortsword')
  s.cards = { card_wolf: 1 }
  equip(s, 'shortsword')
  const card = Object.keys(s.cards)[0]
  assert.equal(socketCard(s, 'shortsword', card, 1), true)
  unequip(s, 'weapon')
  assert.equal(socketed(s, itemById('shortsword')).length, 1)
})

test('taking off a 2H weapon leaves the off-hand free (starter knife in hand)', () => {
  const s = mk('w_berserkaxe', 'o_buckler')
  equip(s, 'w_berserkaxe')
  unequip(s, 'weapon')
  assert.equal(s.equipped.weapon, 'knife')
  assert.equal(offhandLocked(s), false)
  assert.equal(equip(s, 'o_buckler'), true)
})

test('old save wearing a 2H weapon AND a shield: loads with the shield back in the bag', () => {
  const s = mk('w_berserkaxe', 'o_buckler')
  s.equipped.weapon = 'w_berserkaxe'; s.equipped.offhand = 'o_buckler' // how a pre-change save looks
  assert.equal(adopt(s), true)
  const loaded = save()
  assert.equal(loaded.equipped.weapon, 'w_berserkaxe')
  assert.equal(loaded.equipped.offhand, 'none_off')
  assert.ok(loaded.owned.includes('o_buckler'))
  assert.ok(heroStats(loaded).maxHp > 0)
})

test('2H buff: every 2-handed weapon carries off-hand-like stats (HP + P.DEF), since it gives up the shield', async () => {
  const { ITEMS } = await import('../src/data/meta')
  const { CRAFT_ITEMS } = await import('../src/data/craft')
  const twoH = [...ITEMS, ...CRAFT_ITEMS].filter((i) => i.twoHand)
  assert.ok(twoH.length >= 5, 'the 5 known 2-handed weapons')
  const seen = new Set<string>()
  for (const w of twoH) {
    if (seen.has(w.id)) continue
    seen.add(w.id)
    assert.ok((w.mod.maxHp ?? 0) >= 30, `${w.id} HP`)
    assert.ok((w.mod.def ?? 0) >= 8, `${w.id} P.DEF`)
  }
})
