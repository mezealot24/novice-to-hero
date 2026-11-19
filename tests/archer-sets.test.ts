// Q 2026-11-19: Archer-line zone sets D6-D10 (dual_trail) / D8-D14 (meteor_volley), mirroring the Thief ones, + boss uniques.
import test from 'node:test'
import assert from 'node:assert/strict'
import { canWear, heroBuild, itemById } from '../src/data/meta'
import { craftCost } from '../src/data/craft'
import { matById } from '../src/data/materials'
import { setBonuses, setById } from '../src/data/sets'
import { UNIQUE_DROPS } from '../src/data/uniques'
import { CREATIVE_UNIQUES } from '../src/data/uniques3'
import { setSpan } from '../src/scenes/forge/state'
import { equip, newSave } from '../src/save'

const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}

const AR_SETS = ['dual_trail', 'meteor_volley']
const MIDDLE = ['cc_dt_brooch', 'cc_mv_goggles', 'cc_mv_cloak', 'cc_mv_sigil']

test('archer sets: zone spans, 2/3/4pc, skillCrit option, real recipes, Archer-wearable', () => {
  assert.deepEqual(AR_SETS.map((id) => setSpan(setById(id)!.memberIds!)), ['D6-D10', 'D8-D14'])
  for (const id of AR_SETS) {
    const st = setById(id)!
    assert.deepEqual(st.tiers.map((t) => t.pieces), [2, 3, 4])
    assert.ok(st.tiers.some((t) => t.conversions?.some((c) => c.to === 'skillCrit')), `${id} has a crit -> skillCrit option`)
    for (const mid of st.memberIds!) {
      const it = itemById(mid)
      assert.ok(it?.craft || it?.unique, `${mid} is a forge recipe or a unique`)
      assert.ok(!it.jobs || it.jobs.includes('archer'), `${mid} is wearable by an Archer`)
      if (it.craft) for (const m of Object.keys(craftCost(it).mats)) assert.ok(matById(m), `${mid} uses real mat ${m}`)
    }
  }
})

test('archer sets: every Archer D6-D9 class-craft piece now counts for a set', () => {
  for (const id of ['cc_bm_pelt', 'cc_in_apron', 'cc_d7_icequiver', 'cc_d8_volcanobow', 'cc_d9_eagleeye']) {
    assert.ok(setById('dual_trail')!.memberIds!.includes(id), id)
  }
})

test('archer sets: boss uniques come from the zone drop pools', () => {
  const pool = (lo: number, hi: number) => {
    const out = new Set<string>()
    for (let d = lo; d <= hi; d++) for (const u of UNIQUE_DROPS[`d${d}`] ?? []) out.add(u)
    for (const u of CREATIVE_UNIQUES) { const n = Number(u.unique?.dg?.slice(1)); if (n >= lo && n <= hi) out.add(u.id) }
    return out
  }
  const zones: Record<string, [number, number]> = { dual_trail: [6, 10], meteor_volley: [8, 14] }
  for (const [id, [lo, hi]] of Object.entries(zones)) {
    const uniq = setById(id)!.memberIds!.filter((m) => itemById(m)?.unique)
    assert.ok(uniq.length >= 1, `${id} has a hunt unique`)
    for (const u of uniq) assert.ok(pool(lo, hi).has(u), `${u} drops in D${lo}-D${hi}`)
  }
})

test('archer sets: middle pieces fit Beastmaster and Innovator, branch pieces only their own', () => {
  for (const id of MIDDLE) {
    const it = itemById(id)
    assert.equal(canWear(it, 'archer', 'beastmaster'), true, id)
    assert.equal(canWear(it, 'archer', 'innovator'), true, id)
    assert.equal(canWear(it, 'archer'), false, `${id} needs a 2nd job`)
    assert.equal(canWear(it, 'thief', 'rogue'), false, `${id} is Archer-only`)
  }
  assert.equal(canWear(itemById('cc_mv_longbow'), 'archer', 'innovator'), false)
  assert.equal(canWear(itemById('cc_mv_gearquiver'), 'archer', 'beastmaster'), false)
  // each branch can reach 4pc of meteor_volley with crafted pieces alone
  const st = setById('meteor_volley')!
  for (const j2 of ['beastmaster', 'innovator'] as const) {
    const wearable = st.memberIds!.map((m) => itemById(m)).filter((it) => it.craft && canWear(it, 'archer', j2))
    assert.ok(wearable.length >= 4, `${j2} reaches 4pc (${wearable.length})`)
  }
})

test('archer sets: Hit -> skillCrit item conversion + set 3pc land in heroBuild, capped', () => {
  const s = newSave('ar', 'human')
  Object.assign(s, { job: 'archer', job2: 'beastmaster', level: 99 })
  for (const id of ['cc_mv_goggles', 'cc_mv_cloak', 'cc_mv_sigil', 'cc_mv_longbow']) { s.owned.push(id); assert.ok(equip(s, id), id) }
  const b = heroBuild(s)
  const act = b.sets.active.find((a) => a.set.id === 'meteor_volley')
  assert.equal(act?.count, 4)
  assert.equal(act?.activeTiers.length, 3)
  const gain = b.conversionGains.skillCrit ?? 0
  assert.ok(gain > 0 && gain <= 0.15 + 0.15 + 1e-9, `skillCrit gain ${gain}`)
  const sum = setBonuses(['cc_bm_pelt', 'cc_d7_icequiver', 'cc_dt_brooch'].map((id) => itemById(id)))
  assert.equal(sum.active.find((a) => a.set.id === 'dual_trail')?.activeTiers.length, 2)
})
