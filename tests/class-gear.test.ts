import test from 'node:test'
import assert from 'node:assert/strict'
import { canWear, canWearAs, heroStats, ITEMS, itemById, itemUnlocked } from '../src/data/meta'
import { CLASS_GEAR } from '../src/data/class-gear'
import { CLASS_LINE_POOL, CLASS_LINE_W, LINE_POOL, rollLine, type HeroClass } from '../src/data/refine'
import { forgeItem, matDungeon } from '../src/data/craft'
import { JOB2 } from '../src/data/jobs2'
import { JOB3 } from '../src/data/jobs3'

const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v }, removeItem: (k: string) => { delete mem[k] },
}
const { equip, newSave } = await import('../src/save')

/** Deterministic rnd that walks 0..1 so a few thousand rolls cover the whole pool. */
const sweep = (n: number) => { let i = 0; return () => ((i++ * 0.6180339887) % 1) * (n / n) }

test('class gear: unique ids, head/acc only, recipes with class-only bonuses', () => {
  const ids = ITEMS.map((i) => i.id)
  assert.equal(new Set(ids).size, ids.length, 'item ids are unique (they are save data)')
  assert.equal(CLASS_GEAR.length, 22)
  for (const it of CLASS_GEAR) {
    assert.ok(it.slot === 'head' || it.slot === 'acc', `${it.id} is a head / accessory`)
    assert.ok(it.craft, `${it.id} is a forge recipe`)
    assert.equal(it.price, 0, `${it.id} is not sold in the shop`)
    assert.ok(it.req === 'job2' || it.req === 'job3', it.id)
    assert.ok(it.j2?.length || it.j3?.length, `${it.id} is locked to a class`)
    assert.equal(itemById(it.id), it)
  }
  // every 2nd job has exactly one head + one accessory; Paladin has its own pair
  for (const j2 of Object.keys(JOB2)) {
    const mine = CLASS_GEAR.filter((i) => i.j2?.includes(j2 as never) && !i.j3)
    assert.deepEqual(mine.map((i) => i.slot).sort(), ['acc', 'head'], j2)
  }
  assert.deepEqual(CLASS_GEAR.filter((i) => i.j3).map((i) => i.slot).sort(), ['acc', 'head'])
})

test('class gear: parent job matches, 3rd-job gear costs a D10 recipe', () => {
  for (const it of CLASS_GEAR) {
    for (const j2 of it.j2 ?? []) assert.ok(it.jobs?.includes(JOB2[j2].parent), `${it.id}: ${j2} belongs to the base class`)
    for (const j3 of it.j3 ?? []) assert.ok(it.j2?.includes(JOB3[j3].parent), `${it.id}: ${j3} parent is a listed 2nd job`)
    assert.equal(matDungeon(it), it.craft!.dg)
    assert.equal(it.craft!.dg, it.req === 'job3' ? 'd10' : 'd5')
  }
})

test('class lock: only the matching 2nd / 3rd job can wear it', () => {
  const bz = itemById('c_bz_helm'), pl = itemById('c_pl_crown')
  assert.equal(canWear(bz, 'swordsman', 'berserker'), true)
  assert.equal(canWear(bz, 'swordsman', 'knight'), false, 'other 2nd job of the same base class')
  assert.equal(canWear(bz, 'swordsman'), false, 'no 2nd job yet')
  assert.equal(canWear(bz, 'thief', 'berserker'), false, 'wrong base class')
  assert.equal(canWear(pl, 'cleric', 'crusader'), false, 'a Crusader without the 3rd job')
  assert.equal(canWear(pl, 'cleric', 'crusader', 'paladin'), true)
  assert.equal(canWear(pl, 'cleric', 'monk', 'paladin'), false)
  // a normal item is untouched
  assert.equal(canWear(itemById('shortsword'), 'swordsman'), true)
})

test('class gear is hidden until the 2nd / 3rd job exists', () => {
  const s = newSave('t', 'human')
  assert.equal(itemUnlocked(itemById('c_bz_helm'), s), false)
  assert.equal(itemUnlocked(itemById('c_pl_crown'), s), false)
  Object.assign(s, { job: 'cleric', job2: 'crusader', job2Level: 50 })
  assert.equal(itemUnlocked(itemById('c_cr_crown'), s), true)
  assert.equal(itemUnlocked(itemById('c_pl_crown'), s), false, 'needs the 3rd job too')
  Object.assign(s, { job3: 'paladin', job3Level: 1 })
  assert.equal(itemUnlocked(itemById('c_pl_crown'), s), true)
  assert.equal(canWearAs(itemById('c_pl_crown'), s), true)
})

test('class gear gives its class flag in heroStats; another class gets nothing from it', () => {
  const s = newSave('t', 'human')
  Object.assign(s, { job: 'swordsman', jobLevel: 30, job2: 'berserker', job2Level: 30 })
  s.owned.push('c_bz_helm', 'c_kn_helm')
  const before = heroStats(s).j2LowHp
  assert.equal(equip(s, 'c_bz_helm'), true)
  assert.ok(heroStats(s).j2LowHp > before, 'Berserker helm adds j2LowHp')
  // the UI never offers a locked piece (canWearAs), and even if one is forced on, wornItems drops it so no stats leak
  assert.equal(canWearAs(itemById('c_kn_helm'), s), false)
  s.equipped.head = 'c_kn_helm'
  const knight = heroStats(s)
  assert.equal(knight.j2HpDmg, 0, 'the Knight helm gives a Berserker nothing')
  assert.equal(knight.j2LowHp, before, 'and the Berserker helm is off now')
})

test('★3 / ★5 bonuses of a class piece are real stats and show up at grade 3 / 5', () => {
  const it = itemById('c_bz_helm')
  const g1 = forgeItem(it, 1), g3 = forgeItem(it, 3), g5 = forgeItem(it, 5)
  assert.ok((g3.mod.j2Duel ?? 0) >= (g1.mod.j2Duel ?? 0) + 0.06 - 1e-9, '★3 unlocks the first class-only bonus')
  assert.ok((g5.mod.j2LowHp ?? 0) > (g3.mod.j2LowHp ?? 0), '★5 unlocks the second one')
})

test('class lines: no class → no class line; each class rolls only its own', () => {
  const classStats = new Set(CLASS_LINE_POOL.map((d) => d.stat))
  const normal = new Set(LINE_POOL.map((d) => d.stat as string))
  for (const s of classStats) assert.ok(!normal.has(s), `${s} is not in the normal pool`)
  const it = itemById('c_bz_helm')
  const roll = (cls?: HeroClass) => {
    const out = new Set<string>()
    const r = sweep(1)
    for (let i = 0; i < 4000; i++) out.add(rollLine(it, i % 3, 'swordsman', r, cls).stat)
    return out
  }
  for (const s of roll()) assert.ok(!classStats.has(s), `a hero with no 2nd job never rolls ${s}`)
  for (const s of roll({})) assert.ok(!classStats.has(s))
  const bz = roll({ job2: 'berserker' })
  assert.ok(bz.has('j2Duel') && bz.has('j2LowHp'), 'a Berserker can roll both of its lines')
  for (const s of bz) if (classStats.has(s)) assert.ok(s === 'j2Duel' || s === 'j2LowHp', `Berserker rolled ${s}`)
  const pal = roll({ job2: 'crusader', job3: 'paladin' })
  assert.ok(pal.has('j3Press') && pal.has('j2CrossAdd'), 'a Paladin gets Crusader + Paladin lines')
  assert.ok(!pal.has('j2Duel'), 'but never a Berserker line')
})

test('class lines: every class has a small, equal total weight and a valid 3-step value ladder', () => {
  const byClass = new Map<string, number>()
  for (const d of CLASS_LINE_POOL) {
    const key = (d.j2 ?? []).join() + '|' + (d.j3 ?? []).join()
    byClass.set(key, (byClass.get(key) ?? 0) + d.w)
    assert.ok(d.vals[0] > 0 && d.vals[0] <= d.vals[1] && d.vals[1] <= d.vals[2], `${d.stat} ladder goes up`)
  }
  assert.equal(byClass.size, 12, '10 2nd jobs + 2 3rd jobs (Paladin, Champion)')
  for (const [k, w] of byClass) assert.ok(Math.abs(w - CLASS_LINE_W) < 1e-9, `${k} weighs ${CLASS_LINE_W}`)
  const normalW = LINE_POOL.reduce((a, d) => a + d.w, 0)
  assert.ok(CLASS_LINE_W / (normalW + CLASS_LINE_W) < 0.2, 'class lines stay a minority of rolls')
})

test('class lines: integer stats stay whole numbers even when gold', () => {
  const it = itemById('c_in_goggles')
  const r = sweep(1)
  let seen = 0
  for (let i = 0; i < 6000; i++) {
    const l = rollLine(it, i % 3, 'archer', r, { job2: 'mobster' })
    if (l.stat === 'j2DebuffTurns') { seen++; assert.equal(l.val, Math.round(l.val), 'turns are whole') }
  }
  assert.ok(seen > 0, 'the integer line was actually rolled')
})
