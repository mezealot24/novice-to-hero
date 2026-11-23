import test from 'node:test'
import assert from 'node:assert/strict'
import { buildsInto, canCombine, combine, COMBINE, COMBINE_ITEMS, combineGrade, combineParts } from '../src/data/combine'
import { craftCost } from '../src/data/craft'
import { describeItemEffects } from '../src/data/item-effects'
import { canWear, heroBuild, itemById, ITEMS } from '../src/data/meta'
import { salvage } from '../src/data/salvage'
import { addCard, equip, newSave, socketCard, type SaveData } from '../src/save'

const blade = itemById('cb_rendblade')
/** A save that owns both pieces of `it`, has beaten its dungeon and can pay the core (+ some spare zeny). */
const mk = (it = blade, over: Partial<SaveData> = {}): SaveData => {
  const s = newSave('cb', 'human')
  s.job = it.jobs?.[0] ?? 'swordsman'
  s.owned.push(...it.combine!.from)
  s.zeny = 5000
  s.mats = { ...craftCost(it).mats }
  s.clearsBy = { [it.craft!.dg]: 1 }
  return Object.assign(s, over)
}

test('combine data: cb_ ids, two crafted pieces, core = 3 boss mats + no common, a labelled Unique Passive, class matches', () => {
  assert.equal(COMBINE_ITEMS.length, 15) // P1 5 + P2 10
  assert.equal(new Set(COMBINE_ITEMS.flatMap((x) => x.combine!.from)).size, 30) // every piece is used by one recipe only
  for (const it of COMBINE_ITEMS) {
    assert.ok(it.id.startsWith(COMBINE.idPrefix), it.id)
    assert.ok(ITEMS.some((x) => x.id === it.id), `${it.id} registered in ITEMS`)
    assert.equal(it.price, 0)
    const parts = combineParts(it)
    assert.equal(parts.length, 2)
    for (const p of parts) assert.ok(p.id === it.combine!.from[parts.indexOf(p)] && p.craft && !p.combine, `${it.id}: piece ${p.id} is forge gear`)
    for (const p of parts) assert.ok(it.desc.includes(p.name.replace(/\s*\(.*\)$/, '')), `${it.id}: desc names ${p.name}`)
    assert.ok(it.craft!.dg === parts.map((p) => p.craft!.dg).sort((a, b) => +b.slice(1) - +a.slice(1))[0], `${it.id}: recipe dungeon = the later piece`)
    assert.equal(it.craft!.common, 0)
    assert.equal(it.craft!.boss, COMBINE.coreBoss)
    assert.deepEqual(Object.keys(craftCost(it).mats), [`b_${it.craft!.dg}`]) // never a 0 common entry
    assert.equal(it.effects?.length, 1)
    assert.ok(describeItemEffects(it.effects)[0].length > 10)
    const j2 = it.j2?.[0]
    assert.ok(canWear(it, it.jobs![0], j2), `${it.id} wearable by its class`)
    for (const p of parts) assert.ok(canWear(p, it.jobs![0], j2), `${it.id}: ${p.id} wearable by the same class`)
  }
  assert.deepEqual(buildsInto('c_herosword').map((x) => x.id), ['cb_rendblade'])
})

test('combine eats both pieces, pays the core, carries the highest grade, refine +0, cards back to the bag', () => {
  const s = mk(blade, { grade: { c_herosword: 4, c_alphaclaw: 2 }, refine: { c_herosword: 7 } })
  addCard(s, 'card_wolf')
  assert.ok(socketCard(s, 'c_herosword', 'card_wolf', 2))
  assert.equal(combineGrade(s, blade), 4)
  const zeny0 = s.zeny
  assert.deepEqual(canCombine(s, blade), { ok: true })
  assert.ok(combine(s, blade))
  assert.ok(s.owned.includes('cb_rendblade'))
  assert.ok(!s.owned.includes('c_herosword') && !s.owned.includes('c_alphaclaw'))
  assert.equal(s.grade?.cb_rendblade, 4)
  assert.equal(s.grade?.c_herosword, undefined)
  assert.equal(s.refine?.c_herosword, undefined)
  assert.equal(s.refine?.cb_rendblade, undefined)
  assert.equal(s.cards?.card_wolf, 1)
  assert.equal(s.sockets?.c_herosword, undefined)
  assert.equal(s.zeny, zeny0 - blade.craft!.zeny)
  assert.equal(s.mats?.b_d3 ?? 0, 0)
  assert.equal(canCombine(s, blade).ok, false) // owned now
})

test('combine refuses: missing piece, worn piece, locked recipe, short core, broken / cursed piece; nothing changes', () => {
  const miss = mk(); miss.owned = miss.owned.filter((x) => x !== 'c_alphaclaw')
  assert.deepEqual(canCombine(miss, blade), { ok: false, why: 'missing', piece: 'c_alphaclaw' })
  const worn = mk(); assert.ok(equip(worn, 'c_herosword', 'weapon'))
  assert.deepEqual(canCombine(worn, blade), { ok: false, why: 'worn', piece: 'c_herosword' })
  assert.equal(combine(worn, blade), false)
  assert.ok(worn.owned.includes('c_herosword'))
  assert.equal(canCombine(mk(blade, { clearsBy: {} }), blade).ok, false)
  const poor = mk(blade, { zeny: 10 })
  assert.deepEqual(canCombine(poor, blade), { ok: false, why: 'short' })
  assert.deepEqual(canCombine(mk(blade, { broken: ['c_alphaclaw'] }), blade), { ok: false, why: 'broken', piece: 'c_alphaclaw' })
  assert.deepEqual(canCombine(mk(blade, { taint: { c_alphaclaw: { kind: 'none' } } }), blade), { ok: false, why: 'tainted', piece: 'c_alphaclaw' })
})

test('combine money rule: salvage of a combined piece gives back half the core, never zeny', () => {
  const s = mk()
  assert.ok(combine(s, blade))
  const z = s.zeny
  const r = salvage(s, blade)
  assert.ok(r)
  assert.deepEqual(r!.mats, { b_d3: 1 })
  assert.ok(s.zeny <= z)
})

test('combined item effect reaches the hero build', () => {
  const s = mk()
  assert.ok(combine(s, blade))
  assert.ok(equip(s, 'cb_rendblade', 'weapon'))
  assert.ok(heroBuild(s).effects.some((e) => e.id === 'rend_current'))
})
