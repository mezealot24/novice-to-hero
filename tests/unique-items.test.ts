import test from 'node:test'
import assert from 'node:assert/strict'
import { gradeCap, matDungeon, refinable } from '../src/data/craft'
import { heroStats, itemById, ITEMS, splitStatLine } from '../src/data/meta'
import { matOf } from '../src/data/materials'
import { FODDER, isFodder } from '../src/data/refine'
import { rollUniqueDrop, UNIQUE, UNIQUE_DROPS, UNIQUE_ITEMS } from '../src/data/uniques'
import { DUNGEONS } from '../src/data/game-data'
import { equip, newSave, type SaveData } from '../src/save'

/** A save that owns the given items. */
function mk(...own: string[]): SaveData {
  const s = newSave('t', 'human')
  s.owned.push(...own)
  return s
}

test('v88 uniques: first batch is 10 items, 3-4 cursed, every id unique and not sold in the shop', () => {
  assert.equal(UNIQUE_ITEMS.length, 10)
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length, 'item ids stay unique')
  const cursed = UNIQUE_ITEMS.filter((u) => splitStatLine(u).curse)
  assert.ok(cursed.length >= 3 && cursed.length <= 4, `cursed count ${cursed.length}`)
  for (const u of UNIQUE_ITEMS) {
    assert.ok(u.unique && u.price === 0, `${u.id} price 0 = not in the shop`)
    assert.equal(ITEMS.filter((i) => i.slot === u.slot && i.price > 0).includes(u), false)
  }
  assert.equal(UNIQUE.sell, 0)
  const slots = new Set(UNIQUE_ITEMS.map((u) => u.slot))
  assert.equal(slots.size, 5, 'every slot has a unique')
  assert.ok(UNIQUE_ITEMS.some((u) => !u.jobs), 'some are for every class')
})

test('v88 uniques: the curse is shown split from the upside', () => {
  const fang = splitStatLine(itemById('u_bloodfang'))
  assert.match(fang.curse, /ฮีลแรง -50%/)
  assert.doesNotMatch(fang.good, /ฮีลแรง/)
  const crown = splitStatLine(itemById('u_glasscrown'))
  assert.match(crown.curse, /HP สูงสุด -30%/)
  assert.match(crown.good, /ดาเมจคริ \+80%/)
  assert.equal(splitStatLine(itemById('u_halo')).curse, '')
  assert.equal(splitStatLine(itemById('longsword')).curse, '') // plain gear: nothing is a curse
})

test('v88 uniques: a curse really bites in heroStats', () => {
  const base = mk('u_bloodfang'), worn = mk('u_bloodfang')
  base.job = worn.job = 'swordsman'
  equip(worn, 'u_bloodfang')
  assert.ok(heroStats(worn).lifesteal >= 0.12)
  assert.ok(heroStats(worn).healAmp <= heroStats(base).healAmp - 0.49)
})

test('v88 uniques: at most 2 worn at once (equip returns false, nothing changes)', () => {
  const s = mk('u_halo', 'u_hawkeye', 'u_titanheart')
  assert.equal(equip(s, 'u_halo'), true) // acc
  assert.equal(equip(s, 'u_hawkeye'), true) // head
  assert.equal(equip(s, 'u_titanheart'), false) // armor: a third one
  assert.equal(s.equipped.armor, 'cloth')
  // swapping one unique for another in the same slot is fine (the old one leaves)
  s.owned.push('u_glasscrown')
  assert.equal(equip(s, 'u_glasscrown'), true)
  assert.equal(s.equipped.head, 'u_glasscrown')
  // after taking one off a new one fits
  s.equipped.acc = 'none'
  assert.equal(equip(s, 'u_titanheart'), true)
  // plain gear is never blocked
  assert.equal(equip(s, 'shortsword'), true)
})

test('v88 uniques: moving a worn accessory to the other side does not count it twice', () => {
  const s = mk('u_halo', 'u_hawkeye')
  equip(s, 'u_halo', 'acc')
  equip(s, 'u_hawkeye')
  assert.equal(equip(s, 'u_halo', 'acc2'), true) // moves over
  assert.equal(s.equipped.acc, 'none')
  assert.equal(s.equipped.acc2, 'u_halo')
})

test('v88 uniques: not fodder, cannot be sold as one, refinable like dungeon gear', () => {
  for (const u of UNIQUE_ITEMS) {
    assert.equal(isFodder(u), false, u.id)
    assert.equal(FODDER.includes(u), false)
    assert.equal(refinable(u), true)
    assert.equal(gradeCap(u), 5)
    assert.ok(DUNGEONS.some((d) => d.id === u.unique!.dg) || /^d(7|8|9|10)$/.test(u.unique!.dg), `${u.id} home dungeon`)
    assert.ok(matDungeon(u) === u.unique!.dg)
  }
})

test('v88 uniques: pools are 2-3 real uniques per dungeon', () => {
  const ids = new Set(UNIQUE_ITEMS.map((u) => u.id))
  for (let i = 1; i <= 10; i++) {
    const pool = UNIQUE_DROPS[`d${i}`]
    assert.ok(pool && pool.length >= 2 && pool.length <= 3, `d${i}`)
    assert.equal(new Set(pool).size, pool.length)
    for (const id of pool) assert.ok(ids.has(id), id)
  }
  const dropped = new Set(Object.values(UNIQUE_DROPS).flat())
  for (const u of UNIQUE_ITEMS) assert.ok(dropped.has(u.id), `${u.id} drops somewhere`)
})

test('v88 uniques: drop rate 5% normal / 10% hard, new item when not owned', () => {
  assert.deepEqual(rollUniqueDrop('d2', false, [], () => 0.99), { kind: 'none' })
  assert.deepEqual(rollUniqueDrop('d2', false, [], () => 0.06), { kind: 'none' }) // above 5%
  assert.equal(rollUniqueDrop('d2', true, [], () => 0.06).kind, 'new') // under hard 10%
  const seq = [0.01, 0.0]
  let i = 0
  const got = rollUniqueDrop('d2', false, [], () => seq[i++])
  assert.deepEqual(got, { kind: 'new', id: UNIQUE_DROPS.d2[0] })
  assert.deepEqual(rollUniqueDrop('d99', false, [], () => 0), { kind: 'none' }) // unknown dungeon
})

test('v88 uniques: a duplicate pays that dungeon boss materials, never zeny', () => {
  const pool = UNIQUE_DROPS.d3
  const got = rollUniqueDrop('d3', false, pool, () => 0)
  assert.equal(got.kind, 'dupe')
  if (got.kind !== 'dupe') return
  assert.deepEqual(got.mats, { [matOf('d3', true)]: UNIQUE.dupeBoss })
  assert.equal('zeny' in got, false)
  assert.deepEqual(Object.keys(got).sort(), ['id', 'kind', 'mats'])
})
