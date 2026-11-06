import test from 'node:test'
import assert from 'node:assert/strict'
import { REFINE, type RefineLine } from '../src/data/craft'
import { forged, gradeOf, heroStats, isTainted, ITEMS } from '../src/data/meta'
import { MAT_RULES, taintDrop } from '../src/data/materials'
import { goldify, repair, reroll, taintCheck, taintCost, tryRefine, tryTaint, upgradeGrade } from '../src/data/refine'
import { CURSES, pickTaintKind, TAINT, TAINT_MAT } from '../src/data/taint'
import { equip, forgetForge, newSave, type SaveData } from '../src/save'

const sword = ITEMS.find((x) => x.id === 'longsword')!
const L = (stat: string, val: number, gold?: 1): RefineLine => ({ stat, val, ...(gold ? { gold } : {}) })
/** Rolls that pick an outcome: none 0.1 / gold 0.3 / curse 0.6 / brick 0.9. */
const R = { none: 0.1, gold: 0.3, curse: 0.6, brick: 0.9 }
const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length] }

/** A swordsman with a longsword, rich enough for anything, with `lines` option lines and refine +`r`. */
function mk(lines: RefineLine[] = [], r = 0, o: { zeny?: number; crystals?: number; gems?: number } = {}): SaveData {
  const s = newSave('t', 'human')
  s.job = 'swordsman'
  s.zeny = o.zeny ?? 1e6
  s.gems = o.gems ?? 1000
  s.mats = new Proxy({ [TAINT_MAT]: o.crystals ?? 5 } as Record<string, number>, { get: (t, k: string) => (k in t ? t[k] : 999) })
  s.owned.push(sword.id)
  if (r) s.refine = { [sword.id]: r }
  if (lines.length) s.refineLines = { [sword.id]: lines }
  return s
}

test('v89 taint: odds are 4 x 25% and a roll maps to the right outcome', () => {
  assert.deepEqual(Object.values(TAINT.odds), [0.25, 0.25, 0.25, 0.25])
  assert.equal(pickTaintKind(0), 'none')
  assert.equal(pickTaintKind(0.2499), 'none')
  assert.equal(pickTaintKind(0.25), 'gold')
  assert.equal(pickTaintKind(0.5), 'curse')
  assert.equal(pickTaintKind(0.75), 'brick')
  assert.equal(pickTaintKind(0.9999), 'brick')
})

test('v89 taint: costs zeny + crystals and spends them; a short wallet spends nothing', () => {
  assert.deepEqual(taintCost(), { mats: { [TAINT_MAT]: TAINT.crystals }, zeny: TAINT.zeny })
  const poor = mk([], 0, { zeny: TAINT.zeny - 1 })
  assert.deepEqual(tryTaint(poor, sword, seq(R.none)), { ok: false, why: 'short' })
  assert.equal(poor.zeny, TAINT.zeny - 1)
  assert.equal(isTainted(poor, sword.id), false)
  const noCrystal = mk([], 0, { crystals: 0 })
  noCrystal.mats = {} // truly empty
  assert.equal(tryTaint(noCrystal, sword).ok, false)
  const s = mk()
  s.mats = { [TAINT_MAT]: TAINT.crystals + 1 }
  assert.equal(tryTaint(s, sword, seq(R.none)).ok, true)
  assert.equal(s.zeny, 1e6 - TAINT.zeny)
  assert.equal(s.mats[TAINT_MAT], 1) // exactly TAINT.crystals were used
})

test('v89 taint: 😐 nothing changes but the item is locked', () => {
  const lines = [L('atk', 3), L('crit', 0.02)]
  const s = mk(lines, 7)
  const out = tryTaint(s, sword, seq(R.none))
  assert.deepEqual(out, { ok: true, kind: 'none' })
  assert.deepEqual(s.taint![sword.id], { kind: 'none' })
  assert.deepEqual(s.refineLines![sword.id], lines)
  assert.equal(s.refine![sword.id], 7)
})

test('v89 taint: ✨ every option line turns gold (x goldMul), gold lines stay', () => {
  const s = mk([L('str', 3), L('crit', 0.02, 1), L('def', 5)], 10)
  const out = tryTaint(s, sword, seq(R.gold))
  assert.equal(out.ok && out.kind, 'gold')
  const ls = s.refineLines![sword.id]
  assert.deepEqual(ls[0], { stat: 'str', val: Math.round(3 * REFINE.goldMul), gold: 1 })
  assert.deepEqual(ls[1], L('crit', 0.02, 1)) // already gold: not multiplied twice
  assert.deepEqual(ls[2], { stat: 'def', val: Math.round(5 * REFINE.goldMul), gold: 1 })
  assert.deepEqual(goldify(L('crit', 0.02)), { stat: 'crit', val: 0.03, gold: 1 })
})

test('v89 taint: ✨ with no lines gives one fresh gold line (documented fallback)', () => {
  const s = mk([])
  const out = tryTaint(s, sword, seq(R.gold, 0.5, 0.5, 0.5, 0.99, 0.5))
  assert.equal(out.ok && out.fallback, true)
  const ls = s.refineLines![sword.id]
  assert.equal(ls.filter(Boolean).length, 1)
  assert.equal(ls[0].gold, 1)
})

test('v89 taint: 💀 one curse line (strong bonus + downside) that really changes the item', () => {
  const s = mk([], 0)
  const base = forged(s, sword)
  const out = tryTaint(s, sword, seq(R.curse, 0)) // curse #0 = glass
  assert.equal(out.ok && out.curse?.id, CURSES[0].id)
  assert.deepEqual(s.taint![sword.id], { kind: 'curse', curse: CURSES[0].id })
  const f = forged(s, sword)
  assert.equal(f.mod.critMul, (base.mod.critMul ?? 0) + 0.4)
  assert.equal(f.pct?.maxHp, -0.15)
  // every curse has both an upside and a downside
  for (const c of CURSES) {
    const vals = [...Object.values(c.mod), ...Object.values(c.pct ?? {})] as number[]
    assert.ok(vals.some((v) => v > 0) && vals.some((v) => v < 0), c.id)
  }
  const h = heroStats(Object.assign(mk(), { taint: s.taint, equipped: { ...s.equipped, weapon: sword.id } }))
  assert.ok(h.critMul >= 1.4 + 0.4 - 1e-9)
})

test('v89 taint: 💥 brick loses one random option line; without lines it is -1 refine, never below 0', () => {
  const s = mk([L('atk', 1), L('crit', 0.01), L('def', 3)], 10)
  const out = tryTaint(s, sword, seq(R.brick, 0.5)) // 0.5 x 3 lines -> index 1
  assert.equal(out.ok && out.lost?.stat, 'crit')
  assert.equal(s.refineLines![sword.id].filter(Boolean).length, 2)
  assert.equal(s.refine![sword.id], 10) // refine untouched while lines exist
  const t = mk([], 6)
  const o2 = tryTaint(t, sword, seq(R.brick))
  assert.equal(o2.ok && o2.refineDown, 1)
  assert.equal(t.refine![sword.id], 5)
  const z = mk([], 0)
  const o3 = tryTaint(z, sword, seq(R.brick))
  assert.equal(o3.ok && o3.kind, 'brick')
  assert.equal(z.refine?.[sword.id] ?? 0, 0) // never below +0
  assert.equal(isTainted(z, sword.id), true)
})

test('v89 taint: tainted = locked in the pure rules (refine, reroll, grade, taint again)', () => {
  const s = mk([L('atk', 1), L('crit', 0.01)], 5)
  tryTaint(s, sword, seq(R.none))
  assert.equal(taintCheck(s, sword), 'tainted')
  const zeny = s.zeny, gems = s.gems
  assert.deepEqual(tryRefine(s, sword, () => 0), { ok: false, why: 'tainted' })
  assert.equal(reroll(s, sword, [], () => 0.5), null)
  assert.equal(reroll(s, sword, [0], () => 0.5), null)
  assert.equal(upgradeGrade(s, sword), 'tainted')
  assert.deepEqual(tryTaint(s, sword), { ok: false, why: 'tainted' })
  assert.equal(gradeOf(s, sword.id), 1)
  assert.equal(s.zeny, zeny) // nothing was charged
  assert.equal(s.gems, gems)
})

test('v89 taint: an untainted item still refines / rerolls / grades (control)', () => {
  const s = mk([L('atk', 1), L('crit', 0.01)], 5)
  assert.equal(upgradeGrade(s, sword), 'ok')
  assert.equal(gradeOf(s, sword.id), 2)
  assert.ok(reroll(s, sword, [], () => 0.5))
})

test('v89 taint: repair of a broken tainted item is still allowed; a broken item cannot be tainted', () => {
  const s = mk([], 6)
  s.broken = [sword.id]
  assert.equal(taintCheck(s, sword), 'broken')
  assert.deepEqual(tryTaint(s, sword), { ok: false, why: 'broken' })
  s.broken = []
  tryTaint(s, sword, seq(R.none))
  s.broken = [sword.id]
  assert.equal(repair(s, sword, true), true) // gems
  assert.deepEqual(s.broken, [])
})

test('v89 taint: only refinable items; the record goes away when the item leaves the bag', () => {
  const s = mk()
  assert.equal(taintCheck(s, ITEMS.find((x) => x.id === 'knife')!), 'cant') // starter gear
  tryTaint(s, sword, seq(R.curse, 0))
  forgetForge(s, sword.id)
  assert.equal(isTainted(s, sword.id), false)
  assert.equal(s.taint![sword.id], undefined)
})

test('v89 taint: uniques can be tainted too', () => {
  const s = mk()
  s.owned.push('u_halo')
  const u = ITEMS.find((x) => x.id === 'u_halo')!
  assert.equal(taintCheck(s, u), 'ok')
  assert.equal(tryTaint(s, u, seq(R.curse, 0.5)).ok, true)
  assert.equal(equip(s, 'u_halo'), true)
})

test('v89 taint: never creates zeny (every outcome only spends)', () => {
  for (const r of Object.values(R)) {
    const s = mk([L('atk', 1)], 4)
    const before = s.zeny
    tryTaint(s, sword, seq(r, 0.3))
    assert.equal(s.zeny, before - TAINT.zeny)
  }
})

test('v89 taint: ผลึกโลกันตร์ drops from the final boss of D6+ only', () => {
  assert.equal(taintDrop('d5'), 0)
  assert.equal(taintDrop('d6'), MAT_RULES.taintBoss)
  assert.equal(taintDrop('d10'), MAT_RULES.taintBoss)
})
