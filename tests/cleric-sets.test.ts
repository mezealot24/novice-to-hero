// Q 2026-11-19: Cleric-line zone sets D6-D10 (twin_seraph) / D8-D14 (thunder_cathedral), same shape as the Thief ones.
import test from 'node:test'
import assert from 'node:assert/strict'
import { canWear, heroBuild, itemById } from '../src/data/meta'
import { craftCost } from '../src/data/craft'
import { matById } from '../src/data/materials'
import { setBonuses, setById } from '../src/data/sets'
import { itemSetsOf, setSpan } from '../src/scenes/forge/state'
import { equip, newSave } from '../src/save'

const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}

const CLERIC_SETS = ['dawn_faith', 'twin_seraph', 'thunder_cathedral']

test('cleric sets: span the asked dungeon ranges, real recipes or uniques, Cleric-wearable pieces', () => {
  assert.deepEqual(CLERIC_SETS.map((id) => setSpan(setById(id)!.memberIds!)), ['D1-D5', 'D6-D10', 'D8-D14'])
  for (const id of CLERIC_SETS.slice(1)) {
    const st = setById(id)!
    assert.deepEqual(st.tiers.map((t) => t.pieces), [2, 3, 4])
    assert.ok(st.tiers.some((t) => t.conversions?.length), `${id} has a 3pc conversion option`)
    assert.ok(st.memberIds!.some((m) => itemById(m).unique), `${id} has a boss unique hunt piece`)
    for (const mid of st.memberIds!) {
      const it = itemById(mid)
      assert.equal(it.id, mid, `${mid} exists`)
      assert.ok(it.craft || it.unique, `${mid} is a forge recipe or a unique`)
      assert.ok(!it.jobs || it.jobs.includes('cleric'), `${mid} is wearable by a Cleric`)
      if (it.craft) for (const m of Object.keys(craftCost(it).mats)) assert.ok(matById(m), `${mid} uses real mat ${m}`)
    }
  }
})

test('cleric sets: middle pieces fit Crusader and Monk, branch pieces only their own', () => {
  for (const id of ['cc_sr_crown', 'cc_tc_mitre', 'cc_tc_vestment', 'cc_tc_bell']) {
    const it = itemById(id)
    assert.equal(canWear(it, 'cleric', 'crusader'), true, id)
    assert.equal(canWear(it, 'cleric', 'monk'), true, id)
    assert.equal(canWear(it, 'cleric'), false, `${id} needs a 2nd job`)
    assert.equal(canWear(it, 'thief', 'rogue'), false, `${id} is Cleric only`)
  }
  assert.equal(canWear(itemById('cc_tc_knuckle'), 'cleric', 'crusader'), false)
  assert.equal(canWear(itemById('cc_tc_bulwark'), 'cleric', 'monk'), false)
  // each branch can reach 4 crafted Thunder Cathedral slots
  for (const j2 of ['crusader', 'monk'] as const) {
    const own = setById('thunder_cathedral')!.memberIds!.map((m) => itemById(m)).filter((it) => it.craft && canWear(it, 'cleric', j2))
    assert.equal(new Set(own.map((it) => it.slot)).size, 4, `${j2} has 4 slots`)
  }
  assert.ok(itemSetsOf(itemById('u_c3_heartsteel')).length >= 2, 'heartsteel keeps its own set and joins the Cleric one')
})

test('cleric sets: 3pc conversions land in heroBuild, capped', () => {
  const s = newSave('cl', 'human')
  Object.assign(s, { job: 'cleric', job2: 'monk' })
  for (const id of ['cc_mk_gi', 'cc_d7_glacierrelic', 'cc_sr_crown']) { s.owned.push(id); assert.ok(equip(s, id), id) }
  const b = heroBuild(s)
  assert.equal(b.sets.active.find((a) => a.set.id === 'twin_seraph')?.count, 3)
  const g = b.conversionGains.matk ?? 0
  assert.ok(g > 0 && g <= 35 + 1e-9, `matk gain ${g}`)
  const tc = setBonuses(['cc_tc_mitre', 'cc_tc_vestment', 'cc_tc_bell', 'cc_tc_bulwark'].map(itemById))
  assert.equal(tc.active.find((a) => a.set.id === 'thunder_cathedral')?.activeTiers.length, 3)
})
