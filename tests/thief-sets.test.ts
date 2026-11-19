// Q 2026-11-19: Thief-line sets across dungeon tiers + forge 🧩 filter grouped by set.
import test from 'node:test'
import assert from 'node:assert/strict'
import { canWear, heroBuild, itemById, ITEMS } from '../src/data/meta'
import { CRAFT_ITEMS, craftCost } from '../src/data/craft'
import { CLASS_GEAR } from '../src/data/class-gear'
import { CLASS_CRAFT_ITEMS } from '../src/data/class-craft'
import { AWAKENED_CRAFT_ITEMS } from '../src/data/awakened-craft'
import { ALL_CARDFORGE_ITEMS } from '../src/data/cardforge'
import { UNIQUE_ITEMS } from '../src/data/uniques'
import { matById } from '../src/data/materials'
import { ITEM_SETS, setBonuses, setById } from '../src/data/sets'
import { itemSetOf, itemSetsOf, setPages, setSpan } from '../src/scenes/forge/state'
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
      assert.ok(it?.craft || it?.unique, `${mid} is a forge recipe or a unique`)
      assert.ok(!it.jobs || it.jobs.includes('thief'), `${mid} is wearable by a Thief`)
      if (it.craft) for (const m of Object.keys(craftCost(it).mats)) assert.ok(matById(m), `${mid} uses real mat ${m}`)
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
  const pages = setPages(inSet, itemSetsOf)
  const items = pages.flat().filter((r) => r.kind === 'item')
  const memberships = inSet.reduce((a, it) => a + itemSetsOf(it).length, 0)
  assert.equal(items.length, memberships, 'every set recipe shown once under each of its sets')
  assert.ok(memberships > inSet.length, 'some pieces count for two sets (Q 2026-11-19)')
  for (const p of pages) {
    assert.equal(p[0].kind, 'head', 'each page starts with a set header')
    const h = p.reduce((a, r) => a + (r.kind === 'item' ? 56 : 30), 0)
    assert.ok(h <= 30 + 6 * 56, `page height ${h}`)
    let cur = ''
    for (const r of p) {
      if (r.kind === 'head') cur = r.set.id
      else assert.ok(itemSetsOf(r.it).some((x) => x.id === cur), `${r.it.id} sits under one of its sets`)
    }
  }
  // headers: each set opens once (cont=false) in dungeon order
  const opens = pages.flat().filter((r) => r.kind === 'head' && !r.cont).map((r) => (r.kind === 'head' ? r.set.id : ''))
  assert.equal(new Set(opens).size, opens.length)
  assert.equal(opens[0], 'jelly_thorn')
  assert.ok(opens.includes('night_prowler') && opens.includes('midnight_tribunal'))
  assert.ok(ITEMS.length > 0)
})

const ZONE_SETS: Record<string, string> = { swordsman: 'warblood', thief: 'night_prowler', cleric: 'dawn_faith', mage: 'lich_seal', archer: 'wildstalker' }

test('D1-D5 zone: every class has its own set, every D1-D5 forge piece and unique counts for a set', () => {
  for (const [job, id] of Object.entries(ZONE_SETS)) {
    const st = setById(id)
    assert.ok(st, `${job} has a zone set`)
    assert.equal(setSpan(st.memberIds!), 'D1-D5', `${id} lives in D1-D5`)
    assert.deepEqual(st.tiers.map((t) => t.pieces), [2, 3, 4])
    for (const mid of st.memberIds!) {
      const it = itemById(mid)
      assert.ok(it, `${mid} exists`)
      assert.ok(!it.jobs || it.jobs.includes(job as never), `${mid} is wearable by ${job}`)
    }
    // a class-1 (pre 2nd job) hero can reach the 3pc tier from pieces that need no 2nd job, in 3 different slots
    const pre = st.memberIds!.map((m) => itemById(m)).filter((it) => !it.j2 && it.req !== 'job2')
    assert.ok(new Set(pre.map((it) => it.slot)).size >= 3, `${id}: 3+ slots before the 2nd job`)
  }
  const zone = [...CRAFT_ITEMS, ...CLASS_GEAR, ...ALL_CARDFORGE_ITEMS, ...UNIQUE_ITEMS].filter((it) => /^d[1-5]$/.test(it.craft?.dg ?? it.unique?.dg ?? ''))
  for (const it of zone) assert.ok(ITEM_SETS.some((st) => st.memberIds?.includes(it.id)), `${it.id} counts for a set`)
  // shared Jelly Thorn pieces are spread over the classes (Q's example: หมวกเมือกใส counts for the Thief set)
  for (const id of ['c_jellhood', 'c_jellcoat', 'c_jellring', 'cf_jellthorn']) assert.ok(itemSetsOf(itemById(id)).length >= 2, `${id} counts for 2 sets`)
  const thief = setBonuses([itemById('c_jellhood'), itemById('c_blackledger'), itemById('c_mb_watch')])
  assert.equal(thief.active.find((a) => a.set.id === 'night_prowler')?.count, 3, "Q's example: jelly hood + blood ledger + debt watch = Thief set 3pc")
})
