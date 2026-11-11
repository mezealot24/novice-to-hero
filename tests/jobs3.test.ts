import test from 'node:test'
import assert from 'node:assert/strict'
import { addXp, changeJob2, changeJob3, job3Lock, job3Ready, job3SwapCost, newSave, setJob3Path, setJob3Variant, setSave, type SaveData } from '../src/save'
import { activeJob3, JOB3, JOB3_RULES } from '../src/data/jobs3'
import { JOB2, JOB2_RULES } from '../src/data/jobs2'
import { heroPower } from '../src/data/power'

/** A Crusader at Job2 Lv 50 with ดัน 10 cleared (Master Trial not yet won). */
function crusader(): SaveData {
  const s = newSave('t', 'human')
  Object.assign(s, { job: 'cleric', jobLevel: 40, job2: 'crusader', job2Level: JOB2_RULES.maxJobLevel, job2Xp: 0, job2Points: 0, job2Tree: {}, gems: 100,
    clearsBy: { d1: 1, d5: 1, d10: 1 }, clears: 10 })
  setSave(s)
  return s
}

test('Paladin is the Crusader 3rd job; the unlock needs Job2 Lv 50 + ดัน 10 + the Master Trial', () => {
  assert.equal(JOB3.paladin.parent, 'crusader')
  const s = crusader()
  assert.equal(job3Ready(s, 'paladin'), false)
  assert.match(job3Lock(s, 'paladin'), /^ผ่าน Master Trial/)
  assert.equal(changeJob3('paladin'), false)
  s.job2Level = 49; s.clearsBy = { d5: 1 }
  assert.match(job3Lock(s, 'paladin'), /^Job2 Lv 49\/50 · เคลียร์ดัน 10 · ผ่าน Master Trial/)
  s.job2 = 'monk'
  assert.equal(job3Lock(s, 'paladin'), `ต้องเป็น ${JOB2.crusader.name}`)
})

test('awakening starts at Job3 Lv 1 (pure, variant A) and Job EXP then goes to Job3, not Job2', () => {
  const s = crusader(); s.job3Trial = { paladin: 1 }
  assert.equal(changeJob3('paladin'), true)
  assert.deepEqual([s.job3, s.job3Level, s.job3Points, s.job3Path, s.job3Var], ['paladin', 1, 0, 'pure', 'a'])
  assert.equal(changeJob3('paladin'), false, 'already on')
  const r = addXp(100_000)
  assert.equal(s.job3Level, JOB3_RULES.maxJobLevel)
  assert.equal(s.job3Points, JOB3_RULES.maxJobLevel - 1, '1 web point per Job3 Lv')
  assert.equal(s.job3Xp, 0)
  assert.equal(s.job2Level, 50); assert.equal(s.job2Points, 0, 'Job2 untouched')
  assert.ok(r.job >= 29)
})

test('a 2nd job re-pick parks the 3rd job (kept, off); coming back turns it on with everything kept', () => {
  const s = crusader(); s.job3Trial = { paladin: 1 }
  changeJob3('paladin'); s.job3Level = 12; s.job3Tree = { pa_x: 3 }
  assert.equal(changeJob2('monk', 30), true)
  assert.equal(s.job3, 'paladin'); assert.equal(activeJob3(s), undefined)
  addXp(500)
  assert.equal(s.job3Level, 12, 'parked 3rd job gets no EXP')
  s.gems = 100; assert.equal(changeJob2('crusader', 30), true)
  assert.equal(activeJob3(s), 'paladin'); assert.deepEqual(s.job3Tree, { pa_x: 3 })
})

test('path swap: free once a week (web points back), else 💎30; variant swap is free', () => {
  const s = crusader(); s.job3Trial = { paladin: 1 }; changeJob3('paladin')
  s.job3Tree = { pa_a: 2, pa_b: 1 }; s.job3Points = 4
  assert.equal(setJob3Path('hybrid', '2026-11-08'), true)
  assert.deepEqual([s.job3Path, s.job3Points, s.gems, s.job3SwapAt], ['hybrid', 7, 100, '2026-11-08'])
  assert.equal(job3SwapCost(s, '2026-11-10'), JOB3_RULES.pathSwapGems)
  assert.equal(setJob3Path('pure', '2026-11-10'), true)
  assert.equal(s.gems, 100 - JOB3_RULES.pathSwapGems)
  assert.equal(job3SwapCost(s, '2026-11-15'), 0, '7 days after the free swap')
  s.gems = 0; s.job3SwapAt = '2026-11-14'
  assert.equal(setJob3Path('hybrid', '2026-11-15'), false, 'short on 💎: nothing happens')
  assert.equal(setJob3Variant('b'), true); assert.equal(s.job3Var, 'b')
})

test('an awakened Paladin counts in Hero Power (JOB3_K); a parked one does not', () => {
  const s = crusader(), before = heroPower(s)
  Object.assign(s, { job3: 'paladin', job3Level: 30, job3Trial: { paladin: 1 } })
  const on = heroPower(s)
  assert.ok(on > before && on < before * 1.25, `${before} -> ${on}`)
  s.job2 = 'monk'
  assert.equal(activeJob3(s), undefined)
})

// ---------- P2-P6 (design/awakening-crusader-v1.md §3-§5) ----------
import { trialWin } from '../src/save'
import { heroStats } from '../src/data/meta'
import { KIT2, KIT3, gcPulses } from '../src/data/skill-math'
import { lockReason3, nodeById, tree3Mods, TREE3 } from '../src/data/tree'

/** An awakened Paladin with a Crusader web that has `pts` points in each of กางเขน / โล่ / อุทิศ. */
function paladin(pts = 0, tree3: Record<string, number> = {}, path: 'pure' | 'hybrid' = 'pure'): SaveData {
  const s = crusader()
  const fill = (ids: string[], n: number) => { const t: Record<string, number> = {}; for (const id of ids) { const k = Math.min(n, nodeById(id)!.max); t[id] = k; n -= k } return t }
  s.job2Tree = { ...fill(['cr_c1', 'cr_c2', 'cr_c3'], pts), ...fill(['cr_s1', 'cr_s2', 'cr_s3'], pts), ...fill(['cr_d1', 'cr_d2', 'cr_d3'], pts) }
  Object.assign(s, { job3: 'paladin', job3Level: 30, job3Points: 0, job3Tree: tree3, job3Path: path, job3Var: 'a', job3Trial: { paladin: 1 } })
  return s
}

test('Master Trial: a 🔥 hard ดัน 10 win at Job2 Lv 50 passes it once; anything else does not', () => {
  const s = crusader()
  assert.equal(trialWin(s, 'd10', false), undefined, 'normal mode')
  assert.equal(trialWin(s, 'd9', true), undefined, 'another dungeon')
  s.job2Level = 49; assert.equal(trialWin(s, 'd10', true), undefined, 'Job2 Lv 49')
  s.job2Level = 50
  assert.equal(trialWin(s, 'd10', true), 'paladin')
  assert.equal(trialWin(s, 'd10', true), undefined, 'only the first time')
  assert.equal(job3Ready(s, 'paladin'), true)
})

test('Prestige raises the Auto Guard cap 40% -> 50%; Gospel Cross adds 1 pulse (+1 more with ★ สนามพระวรสาร)', () => {
  const vit = (s: SaveData) => { s.stats = { ...s.stats, vit: 400 }; return s } // far over the cap
  const c = vit(crusader()), p = vit(paladin())
  assert.equal(heroStats(c).j2Guard, KIT2.crusader.guardCap)
  assert.equal(heroStats(p).j2Guard, KIT2.crusader.guardCap + KIT3.paladin.capAdd)
  const st = heroStats(paladin()), base = gcPulses(heroStats(crusader()))
  assert.equal(st.j3On, 1)
  assert.equal(gcPulses(st), base + 1)
  assert.equal(gcPulses(heroStats(paladin(0, { pa_g4: 1 }))), base + 2)
})

test('legacy nodes scale with the points already in the Crusader web, and stop at their caps', () => {
  const gain = (pts: number) => heroStats(paladin(pts, { pa_l1: 3 })).j2CrossAdd - heroStats(paladin(pts)).j2CrossAdd // the node's own share
  const add = gain
  assert.ok(Math.abs(gain(0)) < 1e-9, 'no Crusader points = nothing')
  assert.ok(Math.abs(gain(5) - 0.015 * 5) < 1e-9, '0.5%/Lv x 3 Lv x 5 points')
  const lots = 99
  assert.ok(add(lots) <= KIT3.paladin.leg.crossCap + 1e-9, 'capped')
  const v = heroStats(paladin(5)), vb = heroStats({ ...paladin(5), job3Var: 'b' })
  assert.ok(Math.abs(v.j3VarMul - 0.1) < 1e-9 && Math.abs(vb.j3VarMul - 0.1) < 1e-9, 'variant +2% per point of its own branch')
})

test('pure vs hybrid: pure cannot borrow Monk nodes; hybrid stops at tier 2 and ignores tier 3+ points', () => {
  const s = paladin(0, {}, 'pure'), mk = nodeById('mk_c1')!, pa3 = nodeById('pa_g3')!
  assert.equal(lockReason3({}, 'cleric', mk, 'paladin', 'pure'), 'เฉพาะสาย Hybrid')
  assert.equal(lockReason3({}, 'cleric', mk, 'paladin', 'hybrid'), '')
  assert.match(lockReason3({ pa_g1: 3, pa_g2: 3 }, 'cleric', pa3, 'paladin', 'hybrid'), /Hybrid/)
  assert.equal(lockReason3({ pa_g1: 3, pa_g2: 3 }, 'cleric', pa3, 'paladin', 'pure'), '')
  const mods = tree3Mods({ pa_g3: 2, mk_c1: 3 }, 'paladin', 'hybrid')
  assert.deepEqual(mods.map((m) => Object.keys(m)[0]), ['combo'], 'tier-3 Paladin node off on hybrid, Monk node on')
  assert.equal(tree3Mods({ mk_c1: 3 }, 'paladin', 'pure').length, 0, 'borrowed node off on pure')
  assert.ok(heroStats({ ...s, job3Path: 'hybrid', job3Tree: { mk_c1: 3 } }).combo > heroStats(s).combo)
  assert.ok(TREE3.every((n) => /^(paladin_u3p|lordknight_u3p|champion_u3p|pa_|lk_|ch_)/.test(n.id)), 'ids are save data')
})

// ---------- 🐉 Lord Knight + retroactive trial (Q 2026-11-08) ----------
import { JOB3 as J3, job3Of as j3Of } from '../src/data/jobs3'

/** A Knight at Job2 Lv 50 with ดัน 10 cleared; `pts` points in each of หอกทะลวง / ป้อม / เปโก. */
function knight(pts = 0, extra: Partial<SaveData> = {}): SaveData {
  const s = newSave('t', 'human')
  const fill = (ids: string[], n: number) => { const t: Record<string, number> = {}; for (const id of ids) { const k = Math.min(n, nodeById(id)!.max); t[id] = k; n -= k } return t }
  Object.assign(s, { job: 'swordsman', jobLevel: 40, job2: 'knight', job2Level: 50, job2Points: 0, gems: 100, clearsBy: { d1: 1, d5: 1, d10: 1 }, clears: 10,
    job2Tree: { ...fill(['kn_p1', 'kn_p2', 'kn_p3'], pts), ...fill(['kn_g1', 'kn_g2', 'kn_g3'], pts), ...fill(['kn_c1', 'kn_c2', 'kn_c3'], pts) }, ...extra })
  setSave(s)
  return s
}

test('Knight awakens into Lord Knight; a 🔥 hard / 😈 hell ดัน 10 clear from before the update counts as the trial', () => {
  assert.equal(j3Of('knight')?.id, 'lordknight'); assert.equal(J3.lordknight.sibling, 'berserker')
  const s = knight()
  assert.equal(job3Ready(s, 'lordknight'), false)
  s.hardClearsBy = { d10: 5 }
  assert.equal(job3Ready(s, 'lordknight'), true, 'old hard clear')
  s.hardClearsBy = {}; s.hellClearsBy = { d10: 1 }
  assert.equal(job3Ready(s, 'lordknight'), true, 'old hell clear')
  assert.equal(changeJob3('lordknight'), true)
  assert.equal(activeJob3(s), 'lordknight')
  assert.equal(j3Of('monk')?.id, 'champion', 'Monk awakens into Champion')
  assert.equal(j3Of('rogue'), undefined, 'other 2nd jobs: none yet')
})

test('Lord Knight: Aura Blade (spear HP share + HP) and legacy reads the Knight branches with caps', () => {
  const kn = heroStats(knight(5)), lk = heroStats(knight(5, { job3: 'lordknight', job3Level: 30, job3Trial: { lordknight: 1 }, job3Tree: {} }))
  assert.equal(lk.j3Lk, 1); assert.equal(lk.j3On, 0)
  assert.ok(Math.abs(lk.j2HpDmg - kn.j2HpDmg - KIT3.lordknight.hpDmgAdd) < 1e-9)
  assert.ok(lk.maxHp > kn.maxHp)
  const leg = (pts: number) => heroStats(knight(pts, { job3: 'lordknight', job3Trial: { lordknight: 1 }, job3Tree: { lk_l1: 3 } })).ult2Pow
    - heroStats(knight(pts, { job3: 'lordknight', job3Trial: { lordknight: 1 }, job3Tree: {} })).ult2Pow
  assert.ok(Math.abs(leg(0)) < 1e-9); assert.ok(Math.abs(leg(5) - 0.075) < 1e-9); assert.ok(leg(99) <= KIT3.lordknight.leg.crossCap + 1e-9)
  assert.equal(gcPulses(lk), gcPulses(kn), 'no Paladin pulses on a Knight')
})

test('Lord Knight hybrid borrows Berserker tier 1-2 only', () => {
  const bz = nodeById('bz_c1')!
  assert.equal(lockReason3({}, 'swordsman', bz, 'lordknight', 'pure'), 'เฉพาะสาย Hybrid')
  assert.equal(lockReason3({}, 'swordsman', bz, 'lordknight', 'hybrid'), '')
  assert.equal(lockReason3({}, 'swordsman', nodeById('mk_c1')!, 'lordknight', 'hybrid'), 'ไม่ใช่ใยของอาชีพนี้', 'not the Monk web')
  assert.deepEqual(tree3Mods({ bz_c1: 3, lk_g3: 2 }, 'lordknight', 'hybrid').map((m) => Object.keys(m)[0]), ['crit'])
})

/** A Monk at Job2 Lv 50 with ดัน 10 cleared. */
function monk(pts = 0, extra: Partial<SaveData> = {}): SaveData {
  const s = newSave('t', 'human')
  const fill = (ids: string[], n: number) => { const t: Record<string, number> = {}; for (const id of ids) { const k = Math.min(n, nodeById(id)!.max); t[id] = k; n -= k } return t }
  Object.assign(s, { job: 'cleric', jobLevel: 40, job2: 'monk', job2Level: 50, job2Points: 0, gems: 100, clearsBy: { d1: 1, d5: 1, d10: 1 }, clears: 10,
    job2Tree: { ...fill(['mk_c1', 'mk_c2', 'mk_c3'], pts), ...fill(['mk_h1', 'mk_h2', 'mk_h3'], pts), ...fill(['mk_a1', 'mk_a2', 'mk_a3'], pts) }, ...extra })
  setSave(s)
  return s
}

test('Monk awakens into Champion; Ki Translation raises charge max & legacy reads Monk branches', () => {
  const s = monk(5)
  s.hardClearsBy = { d10: 1 }
  assert.equal(job3Ready(s, 'champion'), true)
  assert.equal(changeJob3('champion'), true)
  assert.equal(activeJob3(s), 'champion')

  const mk = heroStats(monk(5)), ch = heroStats(monk(5, { job3: 'champion', job3Level: 30, job3Trial: { champion: 1 }, job3Tree: {} }))
  assert.equal(ch.j3Ch, 1)
  assert.equal(ch.j2ChargeMax - mk.j2ChargeMax, KIT3.champion.chargeMaxAdd)

  const leg = (pts: number) => heroStats(monk(pts, { job3: 'champion', job3Trial: { champion: 1 }, job3Tree: { ch_l1: 3 } })).ult2Pow
    - heroStats(monk(pts, { job3: 'champion', job3Trial: { champion: 1 }, job3Tree: {} })).ult2Pow
  assert.ok(Math.abs(leg(0)) < 1e-9)
  assert.ok(Math.abs(leg(5) - 0.075) < 1e-9)
  assert.ok(leg(99) <= KIT3.champion.leg.crossCap + 1e-9)
})

test('Champion hybrid borrows Crusader tier 1-2 only', () => {
  const cr = nodeById('cr_s1')!
  assert.equal(lockReason3({}, 'cleric', cr, 'champion', 'pure'), 'เฉพาะสาย Hybrid')
  assert.equal(lockReason3({}, 'cleric', cr, 'champion', 'hybrid'), '')
  assert.equal(lockReason3({}, 'cleric', nodeById('bz_c1')!, 'champion', 'hybrid'), 'ไม่ใช่ใยของอาชีพนี้')
  assert.deepEqual(tree3Mods({ cr_s1: 3, ch_g3: 2 }, 'champion', 'hybrid').map((m) => Object.keys(m)[0]), ['j2Guard'])
})

