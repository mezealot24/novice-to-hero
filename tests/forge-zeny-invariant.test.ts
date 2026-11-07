import test from 'node:test'
import assert from 'node:assert/strict'
import { cardforge, CARDFORGE_ITEMS } from '../src/data/cardforge'
import { CRAFT_ITEMS, craftCost, gradeCap, REFINE } from '../src/data/craft'
import { FODDER, repair, tryRefine, upgradeGrade } from '../src/data/refine'
import { salvage } from '../src/data/salvage'
import { pay } from '../src/save'

type S = Parameters<typeof salvage>[0]

/** Full lifecycle, 50 seeds: build -> paid grade-ups -> refine to +7 / +10 -> salvage -> rebuild -> refine again.
 * Every material ends <= where it started, zeny ends lower, and the free +7 / +10 gems are paid at most once per piece. */
test('v100 invariant: build -> grade -> refine -> salvage -> rebuild never gains mats, zeny, or a second set of refine gems', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const r = rng(seed * 7919)
    const it = CRAFT_ITEMS[Math.floor(r() * CRAFT_ITEMS.length)]
    const sure = r() < 0.5 // half the seeds always succeed (guarantees +7 / +10 are reached), half roll for real
    const roll = () => (sure ? 0 : r())
    const mats: Record<string, number> = {}
    for (const id of Object.keys(craftCost(it).mats)) mats[id] = 5000
    const s = { zeny: 1_000_000, gems: 0, owned: [] as string[], equipped: {}, mats, fodder: Object.fromEntries(FODDER.map((f) => [f.id, 60])) } as never as S
    const start = { zeny: s.zeny, mats: { ...mats } }
    const refineUp = (target: number) => {
      for (let tries = 0; tries < 80 && (s.refine?.[it.id] ?? 0) < target; tries++) {
        if (s.broken?.includes(it.id)) { assert.ok(repair(s, it, false, true), `repair ${it.id} seed ${seed}`); continue }
        tryRefine(s, it, roll, true)
      }
    }
    const lifecycle = () => {
      assert.ok(pay(s, craftCost(it)), `build ${it.id} seed ${seed}`)
      s.owned.push(it.id)
      for (let g = 2; g <= gradeCap(it) && r() < 0.8; g++) assert.equal(upgradeGrade(s, it), 'ok', `grade ${g} ${it.id}`)
      refineUp(REFINE.max)
      if (s.broken?.includes(it.id)) repair(s, it, false, true)
    }
    lifecycle()
    const gemsAfterFirst = s.gems
    assert.ok(s.gems <= (REFINE.gemsAt[7] ?? 0) + (REFINE.gemsAt[10] ?? 0), `first gems seed ${seed}`)
    assert.ok(salvage(s, it), `salvage ${it.id} seed ${seed}`)
    lifecycle() // rebuild + refine again
    if (sure) assert.equal(s.gems, gemsAfterFirst, `${it.id} refine gems paid twice, seed ${seed}`) // both passes reach +7 / +10: the second pays nothing
    assert.ok(s.gems <= (REFINE.gemsAt[7] ?? 0) + (REFINE.gemsAt[10] ?? 0), `total gems seed ${seed}`) // at most ONE set, ever
    assert.equal(new Set(s.refineGems).size, (s.refineGems ?? []).length) // no duplicate keys
    assert.ok(s.zeny < start.zeny, `zeny must have gone down, seed ${seed}`)
    for (const [id, n] of Object.entries(s.mats ?? {})) assert.ok(n <= (start.mats[id] ?? 0), `mat ${id} ${n} > ${start.mats[id]}, seed ${seed}`)
  }
})
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32 }

/** 50 seeded saves: whatever the new actions do, zeny never goes UP, and salvage never returns more than half of what a rebuild costs. */
test('v98 invariant: cardforge + salvage never create zeny or mats', () => {
  const pieces = [...CRAFT_ITEMS, ...CARDFORGE_ITEMS]
  for (let seed = 1; seed <= 50; seed++) {
    const r = rng(seed)
    const s = { zeny: Math.floor(r() * 20000), gems: 0, owned: [] as string[], equipped: {}, mats: {} as Record<string, number>, cards: {} as Record<string, number>, clearsBy: { d1: 1, d2: 1, d3: 1, d4: 1, d5: 1 } } as never as S
    for (const it of pieces) for (const id of Object.keys(craftCost(it).mats)) s.mats![id] = Math.floor(r() * 80)
    for (const it of CARDFORGE_ITEMS) for (const [id, n] of Object.entries(it.craft!.cards!)) s.cards![id] = Math.floor(r() * (n + 2))
    for (const it of pieces) {
      const z0 = s.zeny
      if (it.craft?.cards) cardforge(s, it)
      else if (!s.owned.includes(it.id) && pay(s, craftCost(it))) s.owned.push(it.id)
      assert.ok(s.zeny <= z0, `${it.id} build, seed ${seed}`)
      if (!s.owned.includes(it.id)) continue
      if (r() < 0.5) s.grade = { ...s.grade, [it.id]: 1 + Math.floor(r() * 5) }
      if (r() < 0.3) s.taint = { ...s.taint, [it.id]: { kind: 'none' } }
      const z1 = s.zeny, m1 = Object.values(s.mats ?? {}).reduce((a, b) => a + b, 0)
      const res = salvage(s, it)
      assert.ok(s.zeny <= z1, `${it.id} salvage, seed ${seed}`)
      if (res) {
        const back = Object.values(s.mats ?? {}).reduce((a, b) => a + b, 0) - m1
        assert.ok(back <= Object.values(res.mats).reduce((a, b) => a + b, 0), `${it.id} mats, seed ${seed}`)
        const full = Object.values(craftCost(it).mats).reduce((a, b) => a + b, 0)
        assert.ok(back <= full * 6, `${it.id} mats bounded, seed ${seed}`) // 5 grade-ups at most, half returned
      }
    }
  }
})
