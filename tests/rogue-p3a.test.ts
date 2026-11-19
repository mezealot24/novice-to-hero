// Rogue P3'a (design/thief-rogue-rework-v1.md §3.2–3.5 + R4.7.4): 🔪 Dagger Mark / Voracity, Back Stab B4, web rg_k / rg_c / rg_x
// as mechanics, save migration v3. Run: node tools/test.mjs rogue-p3a
import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAYER } from '../src/data/game-data'
import { INT_FIELDS, nodeById } from '../src/data/tree'
import { JOB2 } from '../src/data/jobs2'
import { job2Layout } from '../src/data/skill-registry'
import { KIT2, rogueAmbushCrit, rogueComboDebuff, rogueKnifeMul, rogueStabAmp, rogueSteelMul } from '../src/data/skill-math'

const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)
const R = KIT2.rogue

test('KIT2.rogue P3\'a keys: numbers, labelled for admin, no Cost / Cd suffix (skipped by the admin walk)', () => {
  const keys = ['knifePskillShare', 'markMax', 'markTurns', 'markFocus', 'markSteelMul', 'markSteelSplash', 'markRes', 'markCp', 'markKillKnives',
    'stabPickupAt', 'stabPickupCdCut', 'stabMarkAmp', 'stabMarkTurns', 'stabStrip', 'stabStripTurns', 'stabAmbushMul', 'stabAmbushRes', 'stabAmpCap',
    'knifeBounce', 'knifeBounceAt', 'comboTempoMax', 'comboDebuffMax', 'comboDodgeEvery', 'comboDodgeIcdTurns', 'comboShadowMul', 'comboShadowAt',
    'critAmbushHi', 'critAmbushLo', 'critLeechResMax', 'critKnifeMul'] as const
  const lay = job2Layout('rogue'), refs = [...lay.s3, ...lay.ult, ...lay.other]
  const label = (k: string) => refs.find((r) => r.path.endsWith(`rogue.${k}`))?.label
  for (const k of keys) {
    assert.equal(typeof R[k], 'number', k)
    assert.ok(R[k] > 0, k)
    assert.ok(!/(Cost|Cd)$/.test(k), k)
    const l = label(k)
    assert.ok(l && l !== k, `label rogue.${k}: ${l}`)
  }
  assert.ok(label('mastery.skillCrit') !== 'mastery.skillCrit')
  for (const k of ['stabPickupAt', 'stabMarkAmp', 'stabStrip', 'stabAmbushMul', 'stabAmpCap']) assert.ok(lay.s3.some((r) => r.path.endsWith(`rogue.${k}`)), `${k} in the Skill 3 column`)
  assert.ok(R.critAmbushLo < R.critAmbushHi)
})

test('mastery: dagger gives skillCrit (physical skills crit only with it), not basic crit', () => {
  near(R.mastery.skillCrit, 0.05)
  const ms = JOB2.rogue.mastery!
  assert.deepEqual(ms.mod, { skillCrit: R.mastery.skillCrit })
})

test('pure helpers: knife pskill share, Sinister Steel per Mark, Back Stab B4 cap, rg_c2 kind cap, rg_x1 HP windows', () => {
  near(rogueKnifeMul({ j2KnifeMul: 0, pskill: 0 }), R.knifeMul)
  near(rogueKnifeMul({ j2KnifeMul: 0.3, pskill: 0.6 }), (R.knifeMul + 0.3) * (1 + 0.6 * R.knifePskillShare))
  near(rogueKnifeMul({ j2KnifeMul: 0.1, pskill: 0 }, R.critKnifeMul), R.critKnifeMul + 0.1, '★ crit knife base')
  near(rogueSteelMul(3, 0.5), R.markSteelMul * 3 * 1.5)
  assert.equal(rogueSteelMul(0, 1), 0)
  assert.equal(rogueStabAmp(false), 0)
  near(rogueStabAmp(true), Math.min(R.stabAmpCap, R.stabAmbushMul))
  assert.equal(rogueComboDebuff({ j2ComboDebuff: 0 }, 5), 0)
  near(rogueComboDebuff({ j2ComboDebuff: 0.1 }, 2), 0.2)
  near(rogueComboDebuff({ j2ComboDebuff: 0.1 }, 99), 0.1 * R.comboDebuffMax, 'kind cap')
  const st = { j2AmbushCrit: 0.12 }
  near(rogueAmbushCrit(st, 1, false), 0.12, 'full HP')
  near(rogueAmbushCrit(st, R.critAmbushLo - 0.01, false), 0.12, 'low HP')
  assert.equal(rogueAmbushCrit(st, 0.5, false), 0, 'mid HP')
  near(rogueAmbushCrit(st, 0.5, true), 0.12, 'Exposed')
  assert.equal(rogueAmbushCrit({ j2AmbushCrit: 0 }, 1, true), 0)
})

test('web rg_k / rg_c / rg_x: every node turns on its mechanic at Lv 1, real Stats fields, no flat filler', () => {
  const want: Record<string, string> = {
    rg_k1: 'j2MarkCrit', rg_k2: 'j2KnifeBounce', rg_k3: 'j2KnifeStatus', rg_k4: 'j2KnifeLoop',
    rg_c1: 'j2Tempo', rg_c2: 'j2ComboDebuff', rg_c3: 'j2ComboDodge', rg_c4: 'j2LivingShadow',
    rg_x1: 'j2AmbushCrit', rg_x2: 'j2HeartRend', rg_x3: 'j2CritLeech', rg_x4: 'j2KnifeCrit',
  }
  const flat = ['hit', 'atk', 'crit', 'critMul', 'flee', 'lifesteal']
  for (const [id, key] of Object.entries(want)) {
    const n = nodeById(id)
    assert.ok(n, id)
    const m = n.mod(1)
    assert.ok(((m as Record<string, number>)[key] ?? 0) > 0, `${id} Lv1 ${key}`)
    for (const k of Object.keys(n.mod(n.max))) {
      assert.ok(k in PLAYER, `${id}: ${k} is a Stats field`)
      assert.ok(!flat.includes(k), `${id}: flat ${k}`)
    }
    for (let lv = 1; lv <= n.max; lv++) assert.ok(!/undefined|NaN/.test(n.desc(lv)), `${id} L${lv}: ${n.desc(lv)}`)
  }
  assert.ok(INT_FIELDS.has('j2CritEnergy'))
  assert.equal(nodeById('rg_x3')!.mod(1).j2CritEnergy, 1, 'rg_x3 Lv1 Energy is whole')
  assert.equal(nodeById('rg_x3')!.mod(nodeById('rg_x3')!.max).j2CritEnergy, 3)
})

const mem: Record<string, string> = {}
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  get length() { return Object.keys(mem).length },
  key: (i: number) => Object.keys(mem)[i] ?? null,
  clear: () => { for (const k of Object.keys(mem)) delete mem[k] },
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}
const { migrateThiefRogueRework, newSave, THIEF_REWORK_VER } = await import('../src/save')
type SaveData = ReturnType<typeof newSave>
const v2 = (over: Partial<SaveData> = {}): SaveData => {
  const s = newSave('rg', 'human')
  Object.assign(s, { job: 'thief', job2: 'rogue', thiefRogueRework: 2, skillPoints: 1, jobTree: { thief_core1: 5 }, jobTalents: { 1: { id: 'th_t1c', rank: 1 } },
    job2Points: 2, job2Tree: { rogue_s3p: 5, rg_k1: 5, rg_k2: 3 }, job2Talents: { 1: { id: 'rg_t1_combo', rank: 2 } }, ...over })
  return s
}

test('migration v3: a P2\'b (v2) Rogue gets its ใยชั้น 2 back once · Rogue talents stay', () => {
  assert.ok(THIEF_REWORK_VER >= 3) // P2'c bumped it to 5 (tests/thief-p2c.test.ts): class 1 web + Thief talents reset again
  const s = v2()
  migrateThiefRogueRework(s)
  assert.equal(s.thiefRogueRework, THIEF_REWORK_VER)
  assert.deepEqual(s.job2Tree, {})
  assert.equal(s.job2Points, 2 + 13)
  assert.deepEqual(s.jobTree, {}, 'P2\'c v5: class 1 web reset + refund')
  assert.equal(s.skillPoints, 1 + 5)
  assert.deepEqual(s.jobTalents, {})
  assert.deepEqual(s.job2Talents, { 1: { id: 'rg_t1_combo', rank: 2 } }, 'Rogue talents change in P3\'b')
  s.job2Tree = { rg_k1: 1 }
  migrateThiefRogueRework(s)
  assert.deepEqual(s.job2Tree, { rg_k1: 1 }, 'idempotent')
  assert.equal(s.job2Points, 15)
})

test('migration v3: Mobster, other classes and new saves keep their web', () => {
  const m = v2({ job2: 'mobster', job2Tree: { mb_e1: 5 } })
  migrateThiefRogueRework(m)
  assert.deepEqual(m.job2Tree, { mb_e1: 5 }); assert.equal(m.job2Points, 2); assert.equal(m.thiefRogueRework, THIEF_REWORK_VER)
  const fresh = newSave('n', 'human')
  assert.equal(fresh.thiefRogueRework, THIEF_REWORK_VER)
  Object.assign(fresh, { job: 'thief', job2: 'rogue', job2Tree: { rg_k1: 2 } })
  migrateThiefRogueRework(fresh)
  assert.deepEqual(fresh.job2Tree, { rg_k1: 2 })
})

test('migration v3: corrupt Rogue web does not throw, borrowed Job3 points go home, totals stay finite', () => {
  const s = v2({ job2Points: undefined, job2Tree: { rg_k1: 'x', rg_k2: 4, rg_c1: -2, rg_c2: Infinity } as unknown as SaveData['job2Tree'] })
  assert.doesNotThrow(() => migrateThiefRogueRework(s))
  assert.equal(s.job2Points, 4)
  const b = v2({ job2Tree: null as unknown as SaveData['job2Tree'] })
  assert.doesNotThrow(() => migrateThiefRogueRework(b))
  assert.equal(b.job2Points, 2)
  const c = v2({ job2Tree: { rg_k1: 5 }, job3Points: 0, crossSpent: { j2In1: 0, j3In1: 0, j3In2: 2 } } as Partial<SaveData>)
  migrateThiefRogueRework(c)
  assert.equal(c.job3Points, 2); assert.equal(c.job2Points, 2 + 3)
})
