import test from 'node:test'
import assert from 'node:assert/strict'
import { CRAFT_ITEMS, forgeItem } from '../src/data/craft'
import { CARDFORGE_ITEMS } from '../src/data/cardforge'
import { itemById } from '../src/data/meta'

test('v98 sig: the signature is added at ★1 and never scales with grade / refine', () => {
  const plate = itemById('cf_deathplate'), jelly = itemById('cf_jellthorn')
  assert.equal(forgeItem(plate, 1, 0).mod.berserk, 1)
  assert.equal(forgeItem(plate, 5, 10).mod.berserk, 1) // the flag is not multiplied
  assert.equal(forgeItem(jelly, 1, 0).mod.waveShield, 0.04)
  assert.equal(forgeItem(jelly, 5, 10).mod.waveShield, 0.04) // sig only: waveShield has no bonus row
})

test('v98 sig: downsides stay flat, upsides still scale', () => {
  const fang = itemById('cf_shadowfang')
  assert.equal(forgeItem(fang, 5, 10).mod.def, -4)
  assert.ok((forgeItem(fang, 5, 10).mod.flee ?? 0) > 5) // flee 5 scaled, plus the ★5 bonus
})

test('v98 sig: classic recipes without a sig are untouched (identity at ★1)', () => {
  for (const it of CRAFT_ITEMS) assert.equal(forgeItem(it, 1, 0), it, it.id)
})

test('v98 cardforge data: 8 pieces, no class lock, price 0, no economy stats', () => {
  assert.equal(CARDFORGE_ITEMS.length, 8)
  for (const it of CARDFORGE_ITEMS) {
    assert.equal(it.price, 0)
    assert.equal(it.jobs, undefined) // every class (Q 2026-11-07)
    for (const k of ['dropChance', 'eventChance', 'legendChance']) assert.ok(!(k in (it.craft!.sig ?? {})) && !(k in it.mod), `${it.id} ${k}`)
  }
  assert.deepEqual(CARDFORGE_ITEMS.map((i) => i.craft!.zeny), [400, 900, 900, 1400, 1400, 2300, 3800, 3800])
})
