// Q 2026-11-19: Swordsman-line zone sets D6-D10 (twin_banner) / D8-D14 (dragon_sovereign) + boss uniques as hunt pieces.
import test from 'node:test'
import assert from 'node:assert/strict'
import { canWear, heroBuild, itemById } from '../src/data/meta'
import { craftCost } from '../src/data/craft'
import { matById } from '../src/data/materials'
import { setBonuses, setById } from '../src/data/sets'
import { setSpan } from '../src/scenes/forge/state'
import { JOB2 } from '../src/data/jobs2'
import { equip, newSave } from '../src/save'

const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}

const SW_SETS = ['twin_banner', 'dragon_sovereign']

test('sword sets: span the asked dungeon ranges, real recipes or uniques, Swordsman-wearable', () => {
  assert.deepEqual(SW_SETS.map((id) => setSpan(setById(id)!.memberIds!)), ['D6-D10', 'D8-D14'])
  for (const id of SW_SETS) {
    const st = setById(id)!
    assert.deepEqual(st.tiers.map((t) => t.pieces), [2, 3, 4])
    assert.ok(st.tiers.some((t) => t.conversions?.length), `${id} has a 3pc conversion option`)
    for (const mid of st.memberIds!) {
      const it = itemById(mid)
      assert.ok(it?.craft || it?.unique, `${mid} is a forge recipe or a unique`)
      assert.ok(!it.jobs || it.jobs.includes('swordsman'), `${mid} is wearable by a Swordsman`)
      if (it.craft) for (const m of Object.keys(craftCost(it).mats)) assert.ok(matById(m), `${mid} uses real mat ${m}`)
    }
    assert.ok(st.memberIds!.some((m) => itemById(m).unique), `${id} has a boss unique hunt piece`)
    // a 2nd-job hero of each branch can reach 4pc in 4 different slots
    for (const j2 of ['berserker', 'knight'] as const) {
      const slots = new Set(st.memberIds!.map((m) => itemById(m)).filter((it) => canWear(it, 'swordsman', j2) && !it.j3).map((it) => it.slot))
      assert.ok(slots.size >= 4, `${id}: ${j2} reaches 4 slots without a 3rd job (${[...slots]})`)
    }
  }
})

test('sword sets: middle pieces fit both Berserker and Knight, branch pieces only their own', () => {
  for (const id of ['cc_tb_glaive', 'cc_ds_helm', 'cc_ds_plate', 'cc_ds_sigil']) {
    const it = itemById(id)
    assert.equal(canWear(it, 'swordsman', 'berserker'), true, id)
    assert.equal(canWear(it, 'swordsman', 'knight'), true, id)
    assert.equal(canWear(it, 'swordsman'), false, `${id} needs a 2nd job`)
    assert.equal(canWear(it, 'thief', 'rogue'), false, `${id} is Swordsman-only`)
  }
  assert.equal(canWear(itemById('cc_ds_cleaver'), 'swordsman', 'knight'), false)
  assert.equal(canWear(itemById('cc_ds_aegis'), 'swordsman', 'berserker'), false)
})

test('sword sets: the middle glaive counts for both branch masteries', () => {
  const g = itemById('cc_tb_glaive')
  assert.ok(JOB2.berserker.mastery.ok(g), 'Berserker 2H mastery')
  assert.ok(JOB2.knight.mastery.ok(g), 'Knight spear mastery')
})

test('sword sets: 3pc Max HP -> P.ATK lands in heroBuild, capped', () => {
  const s = newSave('sw', 'human')
  Object.assign(s, { job: 'swordsman', job2: 'knight' })
  for (const id of ['cc_kn_barding', 'cc_d7_iceshield', 'cc_d8_magmahelm']) { s.owned.push(id); assert.ok(equip(s, id), id) }
  const b = heroBuild(s)
  const act = b.sets.active.find((a) => a.set.id === 'twin_banner')
  assert.equal(act?.count, 3)
  const gain = b.conversionGains.atk ?? 0
  assert.ok(gain > 0 && gain <= 50 + 1e-9, `atk gain ${gain}`)
  const sum = setBonuses(['cc_ds_helm', 'cc_ds_plate', 'cc_ds_sigil', 'cc_ds_aegis'].map(itemById))
  assert.equal(sum.active.find((a) => a.set.id === 'dragon_sovereign')?.activeTiers.length, 3)
})
