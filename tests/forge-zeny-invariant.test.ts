import test from 'node:test'
import assert from 'node:assert/strict'
import { cardforge, CARDFORGE_ITEMS } from '../src/data/cardforge'
import { CRAFT_ITEMS, craftCost } from '../src/data/craft'
import { salvage } from '../src/data/salvage'
import { pay } from '../src/save'

type S = Parameters<typeof salvage>[0]
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
