// Q 2026-11-19: Thief-line sets across dungeon tiers + forge 🧩 filter grouped by set.
import test from 'node:test'
import assert from 'node:assert/strict'
import { canWear, heroBuild, itemById, ITEMS } from '../src/data/meta'
import { CRAFT_ITEMS, craftCost } from '../src/data/craft'
import { CLASS_GEAR } from '../src/data/class-gear'
import { CLASS_CRAFT_ITEMS } from '../src/data/class-craft'
import { AWAKENED_CRAFT_ITEMS } from '../src/data/awakened-craft'
import { ALL_CARDFORGE_ITEMS } from '../src/data/cardforge'
import { matById } from '../src/data/materials'
import { ITEM_SETS, setBonuses, setById } from '../src/data/sets'
import { itemSetOf, setPages, setSpan } from '../src/scenes/forge/state'
import { equip, newSave } from '../src/save'

const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}

const THIEF_SETS = ['night_prowler', 'twin_shade', 'midnight_tribunal']

test('thief sets: span the asked dungeon ranges, real recipes, Thief-only pieces', () => {
  assert.deepEqual(THIEF_SETS.map((id) => setSpan(setById(id)!.memberIds!)), ['D1-D5', 'D6-D10', 'D8-D14'])
  for (const id of THIEF_SETS) {
    const st = setById(id)!
    assert.deepEqual(st.tiers.map((t) => t.pieces), [2, 3, 4])
    assert.ok(st.tiers.some((t) => t.conversions?.some((c) => c.to === 'skillCrit')), `${id} has a crit -> skillCrit option`)
    for (const mid of st.memberIds!) {
      const it = itemById(mid)
      assert.ok(it?.craft, `${mid} is a forge recipe`)
      assert.deepEqual(it.jobs, ['thief'], `${mid} is Thief gear`)
      for (const m of Object.keys(craftCost(it).mats)) assert.ok(matById(m), `${mid} uses real mat ${m}`)
      // each piece belongs to exactly one set
      assert.equal(ITEM_SETS.filter((x) => x.memberIds?.includes(mid)).length, 1, `${mid} in one set only`)
    }
  }
})

test('thief sets: middle pieces fit both Rogue and Mafia, branch pieces only their own', () => {
  for (const id of ['cc_ts_kris', 'cc_mt_mask', 'cc_mt_coat', 'cc_mt_seal']) {
    const it = itemById(id)
    assert.equal(canWear(it, 'thief', 'rogue'), true, id)
    assert.equal(canWear(it, 'thief', 'mobster'), true, id)
    assert.equal(canWear(it, 'thief'), false, `${id} needs a 2nd job`)
  }
  assert.equal(canWear(itemById('cc_mt_fang'), 'thief', 'mobster'), false)
  assert.equal(canWear(itemById('cc_mt_writ'), 'thief', 'rogue'), false)
  assert.equal(canWear(itemById('c_np_wrap'), 'thief'), true)
  assert.equal(canWear(itemById('c_np_wrap'), 'archer'), false)
})

test('thief sets: 3pc crit -> skillCrit conversion lands in heroBuild, capped', () => {
  const s = newSave('th', 'human')
  Object.assign(s, { job: 'thief' })
  for (const id of ['c_np_wrap', 'c_np_vest', 'c_np_charm']) { s.owned.push(id); assert.ok(equip(s, id)) }
  const b = heroBuild(s)
  const act = b.sets.active.find((a) => a.set.id === 'night_prowler')
  assert.equal(act?.count, 3)
  // item 20% (cap 6%) + set 30% (cap 8%) of pre-conversion crit
  const gain = b.conversionGains.skillCrit ?? 0
  assert.ok(gain > 0 && gain <= 0.06 + 0.08 + 1e-9, `skillCrit gain ${gain}`)
  const sum = setBonuses([itemById('c_np_wrap'), itemById('c_np_vest'), itemById('c_np_charm'), itemById('c_shadowdaggers')])
  assert.equal(sum.active.find((a) => a.set.id === 'night_prowler')?.activeTiers.length, 3)
})

test('forge 🧩 filter: recipes grouped under set headers, pages fit, sets never lose pieces', () => {
  const all = [...CRAFT_ITEMS, ...CLASS_GEAR, ...CLASS_CRAFT_ITEMS, ...AWAKENED_CRAFT_ITEMS, ...ALL_CARDFORGE_ITEMS]
  const inSet = all.filter((it) => itemSetOf(it))
  const pages = setPages(inSet, itemSetOf)
  const items = pages.flat().filter((r) => r.kind === 'item')
  assert.equal(items.length, inSet.length, 'every set recipe shown once')
  for (const p of pages) {
    assert.equal(p[0].kind, 'head', 'each page starts with a set header')
    const h = p.reduce((a, r) => a + (r.kind === 'item' ? 56 : 30), 0)
    assert.ok(h <= 30 + 6 * 56, `page height ${h}`)
    let cur = ''
    for (const r of p) {
      if (r.kind === 'head') cur = r.set.id
      else assert.equal(itemSetOf(r.it)?.id, cur, `${r.it.id} sits under its own set`)
    }
  }
  // headers: each set opens once (cont=false) in dungeon order
  const opens = pages.flat().filter((r) => r.kind === 'head' && !r.cont).map((r) => (r.kind === 'head' ? r.set.id : ''))
  assert.equal(new Set(opens).size, opens.length)
  assert.equal(opens[0], 'jelly_thorn')
  assert.ok(opens.includes('night_prowler') && opens.includes('midnight_tribunal'))
  assert.ok(ITEMS.length > 0)
})
