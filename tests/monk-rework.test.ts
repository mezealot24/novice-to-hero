// Monk rework tests: RO combo tree, M.DEF/HP scaling, Sett-style Grit/Haymaker, Asura Strike + Exhaust, bell scaling, HUD chips. Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { ALLIES, makeAlly } from '../src/battle/allies'
import { statusChips, type HeroBuffs, type HeroDebuffs } from '../src/battle/hud-layout'
import { JOB2 } from '../src/data/jobs2'
import { heroStats } from '../src/data/meta'
import { asuraDamage, bellMdefMul, haymakerCalc, KIT2, ultInfo } from '../src/data/skill-math'
import {
  branches2Of,
  NO_STRETCH,
  nodeById,
  nodesOf,
  talents2Of,
  TREE2,
  tree3Mods,
} from '../src/data/tree'

const baseMonk = (job2Tree: Record<string, number> = {}, extra: Record<string, unknown> = {}) =>
  heroStats({
    race: 'human',
    stats: { str: 40, vit: 50, wis: 60, dex: 25, int: 20, luk: 20, agi: 45 },
    equipped: {},
    skills: {},
    job: 'cleric',
    jobLevel: 40,
    job2: 'monk',
    job2Level: 50,
    job2Tree,
    ...extra,
  } as never)

const noDebuff: HeroDebuffs = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0, web: 0, slow: 0, thorn: 0, venomTurns: 0 }
const noBuff: HeroBuffs = { dawnWis: 0, bless: 0, kyrieHits: 0, gloria: false, guard: 0, blood: 0, hawk: 0, mshield: 0, renew: 0, s2Icon: '🙏', s2Name: 'พรแสง' }

test('Monk skill tree has 5 rework branches + 2 root branches, unique node ids/names, NO_STRETCH mk_s2, and 12 talents', () => {
  const br = branches2Of('monk')
  assert.deepEqual(
    br.map((b) => b.id),
    ['monk_s3', 'monk_u2', 'mk_c', 'mk_h', 'mk_a', 'mk_i', 'mk_d'],
  )
  const nodes = br.flatMap((b) => nodesOf(b.id))
  const ids = nodes.map((n) => n.id)
  const names = nodes.map((n) => n.name)
  assert.equal(new Set(ids).size, ids.length, 'no duplicate Monk node ids')
  assert.equal(new Set(names).size, names.length, 'no duplicate Monk node names')
  assert.equal(nodes.filter((n) => n.tier === 4).length, 5, '5 ★ capstones')
  assert.equal(nodeById('mk_s2')?.max, 1)
  assert.ok('mk_s2' in NO_STRETCH)
  assert.equal(JOB2.monk.ult.cost, 0)

  const talents = [1, 2, 3, 4].flatMap((row) => talents2Of('monk', row))
  assert.equal(talents.length, 12)
  assert.equal(new Set(talents.map((t) => t.id)).size, 12)
})

test('RO Combo rework nodes & Paladin Hybrid compatibility', () => {
  const mkC1 = nodeById('mk_c1')!
  assert.deepEqual(Object.keys(mkC1.mod(1)), ['combo'], 'mk_c1 emits only combo')

  const st = baseMonk({ monk_s3p: 1, mk_s1: 5, mk_s2: 1, mk_c1: 5, mk_c2: 5, mk_c3: 4, mk_c4: 1 })
  assert.ok(Math.abs(st.j2ThunderAtk - 0.75) < 1e-9)
  assert.equal(st.j2ComboThunder, 1)
  assert.ok(Math.abs(st.j2ComboRamp - 0.12) < 1e-9)
  assert.equal(st.j2ChargeMax, 2)
  assert.equal(st.comboCount, 1)
  assert.equal(st.j2ComboFinish, 1)

  // Paladin Hybrid borrowing Monk Tier 1-2 nodes across new branches
  const hybridTree = { mk_c2: 5, mk_h1: 5, mk_h2: 5, mk_a1: 5, mk_a2: 5 }
  const hMods = tree3Mods(hybridTree, 'paladin', 'hybrid')
  assert.equal(hMods.length, 5)
  const palBase = heroStats({
    race: 'human',
    stats: { str: 30, vit: 60, wis: 50, dex: 20, int: 20, luk: 15, agi: 20 },
    equipped: {},
    skills: {},
    job: 'cleric',
    job2: 'crusader',
    job3: 'paladin',
    job3Path: 'hybrid',
  } as never)
  const palHyd = heroStats({
    race: 'human',
    stats: { str: 30, vit: 60, wis: 50, dex: 20, int: 20, luk: 15, agi: 20 },
    equipped: {},
    skills: {},
    job: 'cleric',
    job2: 'crusader',
    job3: 'paladin',
    job3Path: 'hybrid',
    job3Tree: hybridTree,
  } as never)
  assert.ok(palHyd.j2ComboRamp > 0 && palHyd.j2MdefDmg > 0 && palHyd.j2HpPunch > 0)
  assert.ok(palHyd.mdef > palBase.mdef)
  assert.ok(palHyd.maxHp > palBase.maxHp)
  assert.ok(palHyd.ultPierce > palBase.ultPierce)
})

test('M.DEF & Max HP scaling + กังวานเหล็ก Tempest Bell', () => {
  const plain = baseMonk()
  const tank = baseMonk({ monk_u2p: 1, mk_u1: 5, mk_h1: 5, mk_h2: 5 })
  assert.ok(tank.mdef > plain.mdef)
  assert.ok(tank.maxHp > plain.maxHp)
  assert.ok(Math.abs(tank.j2MdefDmg - 1.2) < 1e-9)
  assert.ok(Math.abs(tank.j2HpPunch - 0.024) < 1e-9)
  assert.ok(Math.abs(tank.j2BellMdef - 1.2) < 1e-9)

  assert.equal(bellMdefMul(plain), 1)
  const expectedMul = 1 + tank.mdef * tank.j2BellMdef
  assert.ok(Math.abs(bellMdefMul(tank) - expectedMul) < 1e-9)

  const bellPlain = makeAlly(ALLIES.tempestBell, { ...tank, j2BellMdef: 0 })
  const bellScaled = makeAlly(ALLIES.tempestBell, tank)
  assert.ok(bellScaled.maxHp > bellPlain.maxHp)
  assert.equal(TREE2.filter((n) => n.id === 'mk_u1').length, 1)
})

test('Sett-style Haymaker calculations (base vs ★ capstone)', () => {
  const st = baseMonk({ mk_h1: 5, mk_h2: 5, mk_h3: 5 })
  const star = baseMonk({ mk_h1: 5, mk_h2: 5, mk_h3: 5, mk_h4: 1 })
  const grit = Math.round(st.maxHp * 0.3)

  const a = haymakerCalc(st, grit)
  assert.equal(a.star, false)
  assert.equal(a.cap, Math.round(st.maxHp * KIT2.monk.haymakerCap))
  assert.equal(a.triggerAt, Math.round(st.maxHp * KIT2.monk.haymakerAt))
  assert.equal(a.rawShield, Math.round(grit * KIT2.monk.haymakerShield))
  assert.equal(a.shield, Math.round(a.rawShield * (1 + st.shieldAmp)))
  assert.equal(a.splashTrueDmg, 0)
  assert.ok(a.centerTrueDmg > Math.round(grit * KIT2.monk.haymakerGritMul), 'includes M.DEF × Max HP bonus')

  const b = haymakerCalc(star, grit)
  assert.equal(b.star, true)
  assert.equal(b.cap, Math.round(star.maxHp * KIT2.monk.haymakerStarCap))
  assert.equal(b.triggerAt, Math.round(star.maxHp * KIT2.monk.haymakerStarAt))
  assert.equal(b.rawShield, grit)
  assert.ok(b.centerTrueDmg > a.centerTrueDmg)
  assert.equal(b.splashTrueDmg, Math.max(1, Math.round(b.centerTrueDmg * KIT2.monk.haymakerSplash)))
})

test('Asura Strike damage scaling, ultInfo switch, and HUD statusChips for 😵 ง่อยแดก + 🥊 Grit', () => {
  const bellSt = baseMonk({ monk_u2p: 1, mk_u1: 5 })
  const bellRows = ultInfo('cleric', bellSt, { str: 40, wis: 60 }, 'monk')
  assert.ok(bellRows.some((r) => r.label.includes('HP ระฆัง')))
  assert.ok(bellRows.some((r) => r.label.includes('กังวานเหล็ก')))

  const asuraSt = baseMonk({
    monk_u2p: 1,
    mk_u1: 5,
    mk_c3: 4,
    mk_h1: 5,
    mk_h2: 5,
    mk_a1: 5,
    mk_a2: 5,
    mk_a3: 5,
    mk_a4: 1,
  })
  assert.equal(asuraSt.j2Asura, 1)
  assert.ok(Math.abs(asuraSt.j2AsuraMdef - 0.3) < 1e-9)
  assert.ok(Math.abs(asuraSt.j2AsuraPow - 0.6) < 1e-9)

  const lowBurst = asuraDamage(asuraSt, 3, 100)
  const hiBurst = asuraDamage(asuraSt, 7, asuraSt.maxRes)
  const doublePow = asuraDamage(asuraSt, 7, asuraSt.maxRes, 2)
  assert.ok(hiBurst > lowBurst)
  assert.ok(doublePow >= hiBurst * 1.99 && doublePow <= hiBurst * 2.01)

  const asuraRows = ultInfo('cleric', asuraSt, { str: 40, wis: 60 }, 'monk')
  assert.ok(asuraRows.some((r) => r.label.includes('อาชูร่า (3 🔵')))
  assert.ok(asuraRows.some((r) => r.label.includes('อาชูร่า (7 🔵')))
  assert.ok(asuraRows.some((r) => r.label.includes('ง่อยแดก')))
  assert.ok(!asuraRows.some((r) => r.label.includes('HP ระฆัง')))

  const chips = statusChips(
    { ...noDebuff, asuraExhaust: 3 },
    { ...noBuff, grit: { amt: 150, cap: 500, ready: false } },
  )
  assert.deepEqual(
    chips.map((c) => [c.icon, c.n, c.kind]),
    [
      ['😵', '3', 'debuff'],
      ['🥊', '150', 'buff'],
    ],
  )
  const readyChips = statusChips(noDebuff, { ...noBuff, grit: { amt: 250, cap: 500, ready: true } })
  assert.equal(readyChips[0]?.icon, '🔥')
  assert.match(readyChips[0]?.name ?? '', /พร้อมปล่อย/)
})
