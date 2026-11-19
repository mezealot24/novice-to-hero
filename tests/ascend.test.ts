import test from 'node:test'
import assert from 'node:assert/strict'
import { ASCEND, ascendCheck, ascendCost, ascendMax, ascendMul, ascendOf, ascendZone, doAscend, homeZone, TOP_ZONE, zoneOfDungeon } from '../src/data/ascend'
import { AWAKENED_CRAFT_ITEMS } from '../src/data/awakened-craft'
import { CLASS_CRAFT_ITEMS } from '../src/data/class-craft'
import { CRAFT_ITEMS, craftCost, forgeItem, GRADE, NO_ASCEND } from '../src/data/craft'
import { matOf } from '../src/data/materials'
import { forged, forgeTag, heroStats, ITEMS, itemById, wornItems, type Item } from '../src/data/meta'
import { salvage } from '../src/data/salvage'
import { setBonuses } from '../src/data/sets'
import { adopt, forgetForge, load, newSave, pay, type SaveData } from '../src/save'
import { slotOf, slotVerb, SLOT_COUNT, smithLine, verbLock } from '../src/scenes/forge/state'

const fang = itemById('c_rustfang') // d3 Thief dagger, Moonshadow set
const dirk = itemById('c_moondirk') // d3 Thief off-hand, Moonshadow set
const mask = itemById('cc_mt_mask') // d8 crafted (zone 1)
const r3 = (n: number) => Math.round(n * 1000) / 1000
const step1 = ASCEND.step[1], step2 = ASCEND.step[2]
/** A wallet that can pay anything, plus the forge records passed in. */
const mk = (over: Partial<SaveData> = {}): SaveData => ({ ...newSave('asc', 'human'), job: 'thief', zeny: 1e6, mats: new Proxy({}, { get: () => 999 }) as Record<string, number>, ...over })
/** Every item that can ascend at all (crafted / unique with a home zone below the top). */
const eligible = ITEMS.filter((it) => ascendMax(it) > 0)

test('ascend zones: D1-D5 / D6-D10 / D11-D14 by dungeon number; rift and shop gear have none', () => {
  assert.deepEqual(['d1', 'd5', 'd6', 'd10', 'd11', 'd14'].map(zoneOfDungeon), [0, 0, 1, 1, 2, 2])
  assert.equal(zoneOfDungeon('rift'), -1)
  assert.equal(zoneOfDungeon(undefined), -1)
  assert.equal(homeZone(fang), 0)
  assert.equal(homeZone(mask), 1)
  assert.equal(homeZone(itemById('u_bloodfang')), 0) // unique: unique.dg = d2
  assert.equal(homeZone(itemById('longsword')), -1) // shop gear
  assert.equal(TOP_ZONE, 2)
})

test('ascend eligibility: D1-D5 crafted at ★5 is ok, below ★5 locked, D11+ / rift / shop have max 0', () => {
  assert.equal(ASCEND.minGrade, 5)
  assert.equal(ascendMax(fang), 2)
  assert.equal(ascendMax(mask), 1)
  assert.equal(ascendMax(itemById('u_bloodfang')), 2)
  assert.deepEqual(ascendCheck(mk({ grade: { [fang.id]: 5 } }), fang), { ok: true })
  for (const g of [1, 2, 3, 4]) assert.deepEqual(ascendCheck(mk({ grade: { [fang.id]: g } }), fang), { ok: false, why: 'grade' }, `★${g}`)
  // D11+ crafted: already in the top zone
  for (const id of ['cc_mt_fang', 'cc_mt_writ', 'cc_mt_coat', 'cc_mt_seal', 'ac_mjollnir_hammer']) {
    const it = itemById(id)
    assert.equal(ascendMax(it), 0, id)
    assert.deepEqual(ascendCheck(mk({ grade: { [id]: 5 } }), it), { ok: false, why: 'cant' }, id)
  }
  // rift craft / rift unique / shop / starter gear: no home zone
  for (const id of ['ac_void_bow', 'u_c3_voidprism', 'longsword', 'knife', 'cloth']) {
    assert.equal(ascendMax(itemById(id)), 0, id)
    assert.deepEqual(ascendCheck(mk({ grade: { [id]: 5 } }), itemById(id)), { ok: false, why: 'cant' }, id)
  }
  for (const it of ITEMS) if (!it.craft && !it.unique) assert.equal(ascendMax(it), 0, it.id)
  // tainted is locked, broken must be repaired first, and the top zone is the end
  assert.deepEqual(ascendCheck(mk({ grade: { [fang.id]: 5 }, taint: { [fang.id]: { kind: 'none' } } }), fang), { ok: false, why: 'tainted' })
  assert.deepEqual(ascendCheck(mk({ grade: { [fang.id]: 5 }, broken: [fang.id] }), fang), { ok: false, why: 'broken' })
  assert.deepEqual(ascendCheck(mk({ grade: { [fang.id]: 5 }, ascend: { [fang.id]: 1 } }), fang), { ok: true })
  assert.deepEqual(ascendCheck(mk({ grade: { [fang.id]: 5 }, ascend: { [fang.id]: 2 } }), fang), { ok: false, why: 'max' })
  assert.deepEqual(ascendCheck(mk({ grade: { [mask.id]: 5 }, ascend: { [mask.id]: 1 } }), mask), { ok: false, why: 'max' })
})

test('ascend cost: mats of the TARGET zone dungeon (D8 into D6-D10, D12 into D11-D14) + zeny', () => {
  assert.equal(zoneOfDungeon(step1.dg), 1)
  assert.equal(zoneOfDungeon(step2.dg), 2)
  assert.deepEqual(ascendCost(fang, 1), { mats: { [matOf(step1.dg, false)]: step1.common, [matOf(step1.dg, true)]: step1.boss }, zeny: step1.zeny })
  assert.deepEqual(ascendCost(fang, 2), { mats: { [matOf(step2.dg, false)]: step2.common, [matOf(step2.dg, true)]: step2.boss }, zeny: step2.zeny })
  assert.deepEqual(ascendCost(mask, 1), ascendCost(fang, 2)) // a D6-D10 piece's only step goes into D11-D14
  assert.equal(ascendCost(fang, 0), null)
  assert.equal(ascendCost(fang, 3), null)
  assert.equal(ascendCost(mask, 2), null)
  assert.equal(ascendCost(itemById('cc_mt_fang'), 1), null)
  // in line with the ★5 grade-up and the target zone's own craft recipes
  for (const st of [step1, step2]) {
    assert.ok(st.common >= GRADE.cost[5].common && st.boss >= GRADE.cost[5].boss && st.zeny >= GRADE.cost[5].zeny)
    assert.ok(st.zeny > 0 && st.common > 0 && st.boss > 0)
  }
})

test('doAscend pays exactly the cost and goes one level at a time; short pays nothing; zeny never goes up', () => {
  const c1 = ascendCost(fang, 1)!, c2 = ascendCost(fang, 2)!
  const mats: Record<string, number> = {}
  for (const c of [c1, c2]) for (const [id, n] of Object.entries(c.mats)) mats[id] = (mats[id] ?? 0) + n
  const s = mk({ zeny: c1.zeny + c2.zeny + 7, mats: { ...mats }, grade: { [fang.id]: 5 } })
  const r1 = doAscend(s, fang)
  assert.deepEqual(r1, { ok: true, level: 1, zone: 1 })
  assert.equal(s.zeny, c2.zeny + 7)
  for (const [id, n] of Object.entries(c1.mats)) assert.equal(s.mats?.[id] ?? 0, mats[id] - n, id)
  assert.equal(ascendOf(s, fang.id), 1)
  const r2 = doAscend(s, fang)
  assert.deepEqual(r2, { ok: true, level: 2, zone: 2 })
  assert.equal(s.zeny, 7)
  assert.deepEqual(s.mats, {}) // every mat spent exactly
  assert.equal(ascendOf(s, fang.id), 2)
  assert.equal(ascendZone(fang, 2), TOP_ZONE)
  const before = JSON.stringify(s)
  assert.deepEqual(doAscend(s, fang), { ok: false, why: 'max' })
  assert.equal(JSON.stringify(s), before) // nothing spent at the top
  // short: one zeny missing -> nothing changes
  const poor = mk({ zeny: c1.zeny - 1, mats: { ...c1.mats }, grade: { [fang.id]: 5 } })
  const p0 = JSON.stringify(poor)
  assert.deepEqual(doAscend(poor, fang), { ok: false, why: 'short' })
  assert.equal(JSON.stringify(poor), p0)
  assert.equal(poor.ascend, undefined)
  // locked below ★5: nothing spent
  const low = mk({ zeny: 1e6, mats: { ...mats }, grade: { [fang.id]: 4 } })
  assert.deepEqual(doAscend(low, fang), { ok: false, why: 'grade' })
  assert.equal(low.zeny, 1e6)
})

test('ascend multipliers: one step per zone climbed, clamped to the item max, 1 for level 0', () => {
  assert.equal(ascendMul(fang, 0), NO_ASCEND)
  assert.deepEqual(ascendMul(fang, 1), { atk: step1.atk, flat: step1.flat, ratio: step1.ratio, base: step1.base })
  assert.deepEqual(ascendMul(fang, 2), { atk: step1.atk * step2.atk, flat: step1.flat * step2.flat, ratio: step1.ratio * step2.ratio, base: step1.base * step2.base })
  assert.deepEqual(ascendMul(fang, 9), ascendMul(fang, 2))
  assert.deepEqual(ascendMul(mask, 1), { atk: step2.atk, flat: step2.flat, ratio: step2.ratio, base: step2.base })
  assert.equal(ascendMul(itemById('cc_mt_fang'), 2), NO_ASCEND) // a stray record on a D11+ piece does nothing
  for (const st of [step1, step2]) assert.ok(st.atk > 1 && st.flat > 1 && st.ratio > 1 && st.base > 1 && st.flat >= st.ratio)
})

test('ascend calibration: atk / flat steps ~ native zone-to-zone growth of weapon atk+matk / armor maxHp+def (within 15%)', () => {
  const pool = [...CRAFT_ITEMS, ...CLASS_CRAFT_ITEMS, ...AWAKENED_CRAFT_ITEMS].filter((it, i, a) => a.findIndex((x) => x.id === it.id) === i)
  type K = 'atk' | 'matk' | 'maxHp' | 'def'
  const avg = (slot: Item['slot'], k: K, z: number) => {
    const vs = pool.filter((it) => it.slot === slot && zoneOfDungeon(it.craft?.dg) === z).map((it) => it.mod[k] ?? 0).filter((v) => v > 0)
    return vs.reduce((a, b) => a + b, 0) / vs.length
  }
  const geo = (pairs: [Item['slot'], K][], z: number) => Math.exp(pairs.reduce((a, [sl, k]) => a + Math.log(avg(sl, k, z) / avg(sl, k, z - 1)), 0) / pairs.length)
  for (const z of [1, 2]) {
    const off = geo([['weapon', 'atk'], ['weapon', 'matk']], z), def = geo([['armor', 'maxHp'], ['armor', 'def']], z)
    assert.ok(Math.abs(off / ASCEND.step[z].atk - 1) <= 0.15, `zone ${z} atk: native x${off.toFixed(2)} vs ASCEND x${ASCEND.step[z].atk}`)
    assert.ok(Math.abs(def / ASCEND.step[z].flat - 1) <= 0.15, `zone ${z} flat: native x${def.toFixed(2)} vs ASCEND x${ASCEND.step[z].flat}`)
  }
})

test('ascend stats: positive SCALES + base scale; flags, counts, non-SCALES and downsides never move; bonus / sig lines unscaled', () => {
  const k = 1 + GRADE.pct[5], m = ascendMul(fang, 1)
  const s0 = mk({ grade: { [fang.id]: 5 } }), s1 = mk({ grade: { [fang.id]: 5 }, ascend: { [fang.id]: 1 } })
  const a = forged(s0, fang), b = forged(s1, fang)
  assert.equal(b.base?.agi, Math.round(r3(6 * k * m.base)))
  assert.equal(b.mod.atk, Math.round(r3(11 * k * m.atk))) // P.ATK: rounded
  const coat = itemById('c_jellcoat'), c1 = forged(mk({ grade: { [coat.id]: 5 }, ascend: { [coat.id]: 1 } }), coat)
  assert.equal(c1.mod.def, Math.round(r3(10 * k * m.flat))) // other FLAT: rounded
  assert.equal(c1.mod.mdef, r3(0.05 * k * m.ratio))
  assert.equal(b.mod.combo, r3(0.08 * k * m.ratio)) // ratio SCALES
  assert.equal(b.mod.skillCrit, a.mod.skillCrit) // not in SCALES (0.06 + the ★5 bonus 0.04)
  assert.equal(b.mod.dodgeHeal, a.mod.dodgeHeal) // ★3 bonus line: unscaled
  assert.equal(b.mod.critMul, a.mod.critMul) // ★5 bonus line: unscaled
  assert.ok((b.mod.atk ?? 0) > (a.mod.atk ?? 0))
  // flags and counts (Mafia ledger): poison / poisonCap / j2ExecAdd stay, poisonDmg / debuffRes / atk scale
  const led = itemById('c_blackledger'), l0 = forged(mk({ grade: { [led.id]: 5 } }), led), l1 = forged(mk({ grade: { [led.id]: 5 }, ascend: { [led.id]: 2 } }), led)
  for (const key of ['poison', 'poisonCap', 'j2ExecAdd', 'vsPoison', 'j2DebuffTurns', 'poisonSpread'] as const) assert.equal(l1.mod[key], l0.mod[key], key)
  for (const key of ['atk', 'poisonDmg', 'debuffRes'] as const) assert.ok((l1.mod[key] ?? 0) > (l0.mod[key] ?? 0), key)
  // downsides: a unique's curse and a cardforge minus stat never scale; the cardforge sig stays as it is
  const axe = itemById('u_berserkaxe'), jt = itemById('cf_jellthorn')
  assert.equal(forged(mk({ grade: { [axe.id]: 5 }, ascend: { [axe.id]: 2 } }), axe).mod.def, forged(mk({ grade: { [axe.id]: 5 } }), axe).mod.def)
  const j0 = forged(mk({ grade: { [jt.id]: 5 } }), jt), j1 = forged(mk({ grade: { [jt.id]: 5 }, ascend: { [jt.id]: 2 } }), jt)
  assert.equal(j1.mod.flee, -3)
  assert.equal(j1.mod.thorns, j0.mod.thorns)
  assert.ok((j1.mod.maxHp ?? 0) > (j0.mod.maxHp ?? 0))
  // every eligible item: only keys that were positive on the item can move, negatives never move, known non-SCALES keys never move
  const NEVER = ['skillCrit', 'poison', 'poisonCap', 'j2ExecAdd', 'j2KnifeMul', 'j2KnifeAdd', 'j2FrenzyMax', 'j2ChargeMax', 'j2AutoBolts', 'berserk', 'ctrAoe', 'thorns', 'dropChance', 'smashCd', 'ultAmp', 'revive', 'doubleAtk'] as const
  for (const it of eligible) {
    const lo = forgeItem(it, 5, 0, []), hi = forgeItem(it, 5, 0, [], ascendMul(it, ascendMax(it)))
    for (const [key, v] of Object.entries(hi.mod) as [keyof typeof hi.mod, number][]) {
      if (v !== lo.mod[key]) assert.ok((it.mod[key] ?? 0) > 0, `${it.id} ${key} moved but was not positive`)
    }
    for (const [key, v] of Object.entries(it.mod) as [keyof typeof it.mod, number][]) if (v <= 0) assert.equal(hi.mod[key], lo.mod[key], `${it.id} ${key}`)
    for (const [key, v] of Object.entries(it.base ?? {})) if ((v ?? 0) <= 0) assert.equal(hi.base?.[key as 'str'], lo.base?.[key as 'str'], `${it.id} base ${key}`)
    for (const key of NEVER) assert.equal(hi.mod[key], lo.mod[key], `${it.id} ${key}`)
    for (const key of ['maxHp', 'atk', 'matk', 'def', 'hit', 'flee', 'maxRes'] as const) if (hi.mod[key] !== undefined) assert.ok(Number.isInteger(hi.mod[key]), `${it.id} ${key} not whole`)
  }
})

test('ascend keeps forgeItem identity when not ascended (forge-sig contract) and level 0 = no field', () => {
  for (const it of CRAFT_ITEMS) {
    assert.equal(forgeItem(it, 1, 0), it, it.id)
    assert.equal(forgeItem(it, 1, 0, [], NO_ASCEND), it, it.id)
    assert.equal(forgeItem(it, 1, 0, [], ascendMul(it, 0)), it, it.id)
  }
  const s = mk({ grade: { [fang.id]: 3 }, refine: { [fang.id]: 4 } })
  assert.deepEqual(forged({ ...s, ascend: {} }, fang), forged(s, fang))
  assert.notDeepEqual(forged({ ...s, ascend: { [fang.id]: 1 } }, fang), forged(s, fang))
})

test('ascend keeps the item id: it still counts for its set, and the hero gets the bigger stats', () => {
  const base = mk({ owned: [...newSave('x', 'human').owned, fang.id, dirk.id], grade: { [fang.id]: 5, [dirk.id]: 5 } })
  base.equipped = { ...base.equipped, weapon: fang.id, offhand: dirk.id }
  const up: SaveData = { ...base, ascend: { [fang.id]: 2, [dirk.id]: 1 } }
  const count = (s: SaveData) => setBonuses(wornItems(s)).active.find((a) => a.set.id === 'moonshadow')?.count ?? 0
  assert.equal(count(base), 2)
  assert.equal(count(up), 2)
  assert.deepEqual(wornItems(up).map((i) => i.id), wornItems(base).map((i) => i.id))
  assert.ok(heroStats(up).atk > heroStats(base).atk)
  assert.equal(forgeTag(up, fang.id), ' ★5 ⇧2')
  assert.equal(forgeTag(base, fang.id), ' ★5')
})

test('ascend lives in the ⬆️ grade tab (Q 2026-11-19: one tab for grade-up + ascension), 5 tabs', () => {
  assert.equal(SLOT_COUNT, 5)
  for (let i = 0; i < SLOT_COUNT; i++) assert.equal(slotOf(slotVerb(i, false)), i)
  assert.equal(slotVerb(0, false), 'grade')
  // ★5 piece that can still move up: the grade tab stays open and the smith points at ascension
  assert.equal(verbLock(mk({ grade: { [fang.id]: 5 } }), fang, 'grade'), undefined)
  assert.match(smithLine(mk({ grade: { [fang.id]: 5 } }), fang, 'grade'), /ยกขั้น/)
  assert.match(smithLine(mk({ grade: { [fang.id]: 5 }, ascend: { [fang.id]: 2 } }), fang, 'grade'), /D11-D14/)
  // tainted: grade tab is locked, so ascension is too
  assert.ok(verbLock(mk({ grade: { [fang.id]: 5 }, taint: { [fang.id]: { kind: 'none' } } }), fang, 'grade'))
})

test('ascend leaves with the item: salvage / sell forget it, salvage gives no zeny and no ascend mats back', () => {
  const s = mk({ zeny: 1e6, mats: {}, owned: [...newSave('x', 'human').owned] })
  const c = craftCost(fang), a1 = ascendCost(fang, 1)!
  s.mats = { ...c.mats }
  for (const [id, n] of Object.entries(a1.mats)) s.mats[id] = (s.mats[id] ?? 0) + n
  assert.ok(pay(s, c))
  s.owned.push(fang.id)
  s.grade = { [fang.id]: 5 } // grade mats are not the point here
  assert.equal(doAscend(s, fang).ok, true)
  const z0 = s.zeny, before = { ...s.mats }
  const res = salvage(s, fang)
  assert.ok(res)
  assert.ok(s.zeny < z0)
  assert.equal(s.ascend?.[fang.id], undefined)
  for (const id of Object.keys(a1.mats)) assert.equal(s.mats?.[id] ?? 0, before[id] ?? 0, `${id} came back`)
  const t = mk({ ascend: { [fang.id]: 2, other: 1 } })
  forgetForge(t, fang.id)
  assert.deepEqual(t.ascend, { other: 1 })
})

function withMemoryLocalStorage(fn: () => void): void {
  const store = new Map<string, string>()
  const prev = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, String(v)) }, removeItem: (k: string) => { store.delete(k) } },
    configurable: true, writable: true,
  })
  try { fn() } finally {
    if (prev) Object.defineProperty(globalThis, 'localStorage', prev)
    else delete (globalThis as { localStorage?: unknown }).localStorage
  }
}

test('ascend save: an old save without `ascend` loads fine (= level 0); junk records are dropped', () => {
  withMemoryLocalStorage(() => {
    const old = { ...newSave('old', 'human'), job: 'thief', owned: [...newSave('x', 'human').owned, fang.id], grade: { [fang.id]: 5 } } as SaveData
    delete old.ascend
    assert.equal(adopt(old), true)
    const s = load()!
    assert.equal(s.ascend, undefined)
    assert.equal(ascendOf(s, fang.id), 0)
    assert.deepEqual(forged(s, fang), forgeItem(fang, 5, 0, []))
    assert.deepEqual(ascendCheck(s, fang), { ok: true })
    assert.ok(heroStats(s).maxHp > 0)
    assert.equal(adopt({ ...old, ascend: { [fang.id]: 1, junk: 'x', zero: 0, neg: -1, frac: 1.5 } }), true)
    assert.deepEqual(load()!.ascend, { [fang.id]: 1 })
    assert.equal(adopt({ ...old, ascend: 'garbage' }), true)
    assert.equal(load()!.ascend, undefined)
  })
})
