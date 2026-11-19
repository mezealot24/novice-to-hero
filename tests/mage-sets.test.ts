// Q 2026-11-19: Mage-line zone sets D6-D10 (elemental_quartet) / D8-D14 (starfall_arcanum), mirrors the Thief sets.
import test from 'node:test'
import assert from 'node:assert/strict'
import { canWear, heroBuild, itemById } from '../src/data/meta'
import { craftCost } from '../src/data/craft'
import { matById } from '../src/data/materials'
import { setBonuses, setById } from '../src/data/sets'
import { MAGE_ZONE_ITEMS } from '../src/data/mage-zone-sets'
import { setSpan } from '../src/scenes/forge/state'
import { equip, newSave } from '../src/save'

const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}

const MAGE_SETS = ['elemental_quartet', 'starfall_arcanum']

test('mage sets: span D6-D10 / D8-D14, real recipes, Mage-wearable, spellCrit -> skillCrit option', () => {
  assert.deepEqual(MAGE_SETS.map((id) => setSpan(setById(id)!.memberIds!)), ['D6-D10', 'D8-D14'])
  for (const id of MAGE_SETS) {
    const st = setById(id)!
    assert.deepEqual(st.tiers.map((t) => t.pieces), [2, 3, 4])
    assert.ok(st.tiers.some((t) => t.conversions?.some((c) => c.from === 'spellCrit' && c.to === 'skillCrit')), `${id} spellCrit -> skillCrit`)
    assert.ok(st.memberIds!.some((m) => itemById(m).unique), `${id} has a boss unique hunt piece`)
    for (const mid of st.memberIds!) {
      const it = itemById(mid)
      assert.equal(it.id, mid, `${mid} exists`)
      assert.ok(it.craft || it.unique, `${mid} is a forge recipe or a unique`)
      assert.ok(!it.jobs || it.jobs.includes('mage'), `${mid} is wearable by a Mage`)
      if (it.craft) for (const m of Object.keys(craftCost(it).mats)) assert.ok(matById(m), `${mid} uses real mat ${m}`)
    }
  }
  for (const it of MAGE_ZONE_ITEMS) assert.ok(MAGE_SETS.some((id) => setById(id)!.memberIds!.includes(it.id)), `${it.id} counts for a mage set`)
})

test('mage sets: middle pieces fit Wizard and Sage, branch pieces only their own', () => {
  for (const id of ['cc_eq_ring', 'cc_sf_hat', 'cc_sf_robe', 'cc_sf_orb']) {
    const it = itemById(id)
    assert.equal(canWear(it, 'mage', 'wizard'), true, id)
    assert.equal(canWear(it, 'mage', 'sage'), true, id)
    assert.equal(canWear(it, 'mage'), false, `${id} needs a 2nd job`)
    assert.equal(canWear(it, 'thief', 'rogue'), false, `${id} is Mage only`)
  }
  assert.equal(canWear(itemById('cc_sf_staff'), 'mage', 'sage'), false)
  assert.equal(canWear(itemById('cc_sf_tome'), 'mage', 'wizard'), false)
  // each branch reaches 4pc of starfall_arcanum from craft pieces alone (head / weapon / armor / acc)
  for (const j2 of ['wizard', 'sage'] as const) {
    const own = setById('starfall_arcanum')!.memberIds!.map((m) => itemById(m)).filter((it) => it.craft && canWear(it, 'mage', j2))
    assert.ok(new Set(own.map((it) => it.slot)).size >= 4, `${j2}: 4 slots`)
  }
})

test('mage sets: 3pc spellCrit -> skillCrit conversion lands in heroBuild, capped', () => {
  const s = newSave('mg', 'human')
  Object.assign(s, { job: 'mage', job2: 'wizard' })
  for (const id of ['cc_sf_hat', 'cc_sf_staff', 'cc_sf_robe']) { s.owned.push(id); assert.ok(equip(s, id), `equip ${id}`) }
  const b = heroBuild(s)
  const act = b.sets.active.find((a) => a.set.id === 'starfall_arcanum')
  assert.equal(act?.count, 3)
  // staff 40% (cap 15%) + set 50% (cap 15%) of pre-conversion spellCrit
  const gain = b.conversionGains.skillCrit ?? 0
  assert.ok(gain > 0 && gain <= 0.15 + 0.15 + 1e-9, `skillCrit gain ${gain}`)
  const eq = setBonuses(['cc_wz_robe', 'cc_d7_frosttome', 'cc_d8_pyrostaff', 'cc_d9_skycrown'].map(itemById))
  assert.equal(eq.active.find((a) => a.set.id === 'elemental_quartet')?.activeTiers.length, 3)
})
