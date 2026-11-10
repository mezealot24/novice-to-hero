import test from 'node:test'
import assert from 'node:assert/strict'
import { canWear, canWearAs, heroStats, itemById, ITEMS } from '../src/data/meta'
import { gradeCap, matDungeon, refinable } from '../src/data/craft'
import { UNIQUE3_ITEMS, UNIQUE3_DROPS, rollUnique3Drop, PALADIN_UNIQUES, LORDKNIGHT_UNIQUES, AWAKEN_UNIQUES } from '../src/data/uniques3'
import { UNIQUE } from '../src/data/uniques'
import { newSave, equip, type SaveData } from '../src/save'

const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}

function mkSave(): SaveData {
  const s = newSave('hero', 'human')
  return s
}

test('unique class 3: item ids are unique across the whole game and every piece is in ITEMS', () => {
  const allIds = ITEMS.map((i) => i.id)
  assert.equal(new Set(allIds).size, allIds.length, 'no duplicate item IDs')
  assert.equal(UNIQUE3_ITEMS.length, 9, '3 Paladin + 3 Lord Knight + 3 Shared Awakening')

  for (const it of UNIQUE3_ITEMS) {
    assert.equal(itemById(it.id), it)
    assert.ok(it.unique && it.unique.dg === 'd10', `${it.id} is D10 unique`)
    assert.equal(it.price, 0, `${it.id} price is 0 (not in shop)`)
    assert.equal(it.req, 'job3', `${it.id} requires job3`)
    assert.equal(it.slots, 1, `${it.id} starts with 1 card slot`)
    assert.ok(['head', 'armor', 'acc'].includes(it.slot), `${it.id} is head, armor, or acc`)
  }
})

test('unique class 3: Paladin and Lord Knight have head, armor, and acc unique pieces', () => {
  assert.deepEqual(PALADIN_UNIQUES.map((i) => i.slot).sort(), ['acc', 'armor', 'head'])
  assert.deepEqual(LORDKNIGHT_UNIQUES.map((i) => i.slot).sort(), ['acc', 'armor', 'head'])
  assert.deepEqual(AWAKEN_UNIQUES.map((i) => i.slot).sort(), ['acc', 'armor', 'head'])

  for (const it of PALADIN_UNIQUES) {
    assert.deepEqual(it.jobs, ['cleric'])
    assert.deepEqual(it.j2, ['crusader'])
    assert.deepEqual(it.j3, ['paladin'])
  }

  for (const it of LORDKNIGHT_UNIQUES) {
    assert.deepEqual(it.jobs, ['swordsman'])
    assert.deepEqual(it.j2, ['knight'])
    assert.deepEqual(it.j3, ['lordknight'])
  }
})

test('unique class 3: class lock allows only the matching 3rd job to wear class-specific uniques', () => {
  const plCrown = itemById('u_pl_aegiscrown')
  const lkHelm = itemById('u_lk_dragonhelm')
  const awCrown = itemById('u_c3_awakencrown')

  // Novice / Base class
  assert.equal(canWear(plCrown, 'cleric'), false)
  assert.equal(canWear(lkHelm, 'swordsman'), false)

  // 2nd Job without 3rd Job
  assert.equal(canWear(plCrown, 'cleric', 'crusader'), false)
  assert.equal(canWear(lkHelm, 'swordsman', 'knight'), false)

  // Matching 3rd Job
  assert.equal(canWear(plCrown, 'cleric', 'crusader', 'paladin'), true)
  assert.equal(canWear(lkHelm, 'swordsman', 'knight', 'lordknight'), true)

  // Cross 3rd Job wearing
  assert.equal(canWear(plCrown, 'swordsman', 'knight', 'lordknight'), false)
  assert.equal(canWear(lkHelm, 'cleric', 'crusader', 'paladin'), false)

  // Shared Awakening: any 3rd job
  assert.equal(canWear(awCrown, 'cleric', 'crusader', 'paladin'), true)
  assert.equal(canWear(awCrown, 'swordsman', 'knight', 'lordknight'), true)
  assert.equal(canWear(awCrown, 'swordsman', 'knight'), true) // no j3 specified, but req is job3
})

test('unique class 3: canWearAs verifies hero state correctly', () => {
  const s = mkSave()
  s.job = 'cleric'
  s.job2 = 'crusader'
  s.job3 = 'paladin'

  const plCrown = itemById('u_pl_aegiscrown')
  const lkHelm = itemById('u_lk_dragonhelm')
  assert.equal(canWearAs(plCrown, s), true)
  assert.equal(canWearAs(lkHelm, s), false)
})

test('unique class 3: obeys max 2 unique items rule', () => {
  const s = mkSave()
  s.job = 'cleric'
  s.job2 = 'crusader'
  s.job3 = 'paladin'
  s.owned.push('u_pl_aegiscrown', 'u_pl_sanctumplate', 'u_pl_gospelrelic')

  // Equip 1st unique (head)
  assert.equal(equip(s, 'u_pl_aegiscrown'), true)
  assert.equal(s.equipped.head, 'u_pl_aegiscrown')

  // Equip 2nd unique (armor)
  assert.equal(equip(s, 'u_pl_sanctumplate'), true)
  assert.equal(s.equipped.armor, 'u_pl_sanctumplate')

  // Equip 3rd unique (acc) -> should be blocked!
  assert.equal(equip(s, 'u_pl_gospelrelic'), false)
  assert.equal(s.equipped.acc, 'none')

  // Remove one unique, then 3rd can be equipped
  s.equipped.head = 'none_head'
  assert.equal(equip(s, 'u_pl_gospelrelic'), true)
  assert.equal(s.equipped.acc, 'u_pl_gospelrelic')
})

test('unique class 3: stats and class flags apply in heroStats', () => {
  const s = mkSave()
  s.job = 'cleric'
  s.job2 = 'crusader'
  s.job3 = 'paladin'
  s.owned.push('u_pl_aegiscrown', 'u_pl_sanctumplate')

  const baseHp = heroStats(s).maxHp
  const baseDef = heroStats(s).def

  equip(s, 'u_pl_aegiscrown')
  equip(s, 'u_pl_sanctumplate')

  const st = heroStats(s)
  assert.ok(st.maxHp > baseHp + 500, 'massive HP boost from uniques')
  assert.ok(st.def > baseDef + 40, 'def boost from uniques')
  assert.ok(st.j3GospelHeal >= 0.015, 'Paladin j3GospelHeal applied')
  assert.ok(st.j3Press >= 0.35, 'Paladin j3Press applied')
  assert.ok(st.j3Banding >= 0.03, 'Paladin j3Banding applied')
  assert.ok(st.thorns >= 0.25, 'thorns applied')
})

test('unique class 3: Lord Knight stats and flags apply in heroStats', () => {
  const s = mkSave()
  s.job = 'swordsman'
  s.job2 = 'knight'
  s.job3 = 'lordknight'
  s.owned.push('u_lk_dragonhelm', 'u_lk_warmedal')

  equip(s, 'u_lk_dragonhelm')
  equip(s, 'u_lk_warmedal')

  const st = heroStats(s)
  assert.ok(st.atk >= 45, 'atk boost applied')
  assert.ok(st.j3GospelField >= 1, 'Hundred Spear extra hit applied')
  assert.ok(st.j2Spiral >= 0.15, 'Ult pierce DEF applied')
  assert.ok(st.j2Charge >= 0.30, 'Wave charge applied')
  assert.ok(st.j3AfterBless >= 0.08, 'Blessing after ult applied')
})

test('unique class 3: craft, refine, and grade metadata', () => {
  for (const it of UNIQUE3_ITEMS) {
    assert.equal(refinable(it), true)
    assert.equal(gradeCap(it), 5)
    assert.equal(matDungeon(it), 'd10')
  }
})

test('unique class 3: rollUnique3Drop rolls correct pool and handles duplicates', () => {
  // No job3 -> none
  assert.deepEqual(rollUnique3Drop(undefined, true, []), { kind: 'none' })

  // Sweep RNG to ensure drop happens
  const forceDrop = () => 0.001
  const resPal = rollUnique3Drop('paladin', true, [], forceDrop)
  assert.equal(resPal.kind, 'new')
  assert.ok(UNIQUE3_DROPS.paladin.includes(resPal.id))

  // When already owned, pays D10 boss mats (never zeny)
  const resDupe = rollUnique3Drop('paladin', true, [resPal.id], forceDrop)
  assert.equal(resDupe.kind, 'dupe')
  assert.equal(resDupe.id, resPal.id)
  assert.deepEqual(resDupe.mats, { b_d10: UNIQUE.dupeBoss })

  // Lord Knight roll
  const resLk = rollUnique3Drop('lordknight', 'hell', [], forceDrop)
  assert.equal(resLk.kind, 'new')
  assert.ok(UNIQUE3_DROPS.lordknight.includes(resLk.id))
})
