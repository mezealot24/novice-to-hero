// PoE-style Class-Line Passive Constellation Engine & Thief-Line Pilot tests (Phase 1).
// Run: node tools/test.mjs passive-tree
import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAYER, type Stats } from '../src/data/game-data'
import { JOBS, type JobId } from '../src/data/jobs'
import { heroBuild, heroStats, type StatsInput } from '../src/data/meta'
import {
  allocatePassive,
  canAllocatePassive,
  canRefundPassive,
  hasPassiveTree,
  normalizePassiveNodes,
  PASSIVE_RULES,
  passiveEarned,
  passiveEarnedFor,
  passiveFree,
  passiveMods,
  passiveNodeById,
  passiveSpent,
  passiveTreeOf,
  refundPassive,
  type PassiveCtx,
} from '../src/data/passive-tree'
import { KIT, thiefUltBudget, ultCooldown, ultInfo, type UltHero } from '../src/data/skill-math'
import { fieldFor } from '../src/data/patch'
import { explainField } from '../src/admin/explain'
import { nodeById } from '../src/data/tree'

const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)

const baseInput = (over: Partial<StatsInput> = {}): StatsInput => ({
  race: 'human',
  job: 'thief',
  jobLevel: 40,
  stats: { str: 10, vit: 20, wis: 10, dex: 10, int: 40, luk: 10, agi: 10 },
  equipped: {},
  skills: { smash: 1, firstaid: 0, tough: 0, focus: 0, power: 0, iron: 0 },
  passiveNodes: [],
  ...over,
})

test('hasPassiveTree / passiveTreeOf: enabled only for thief in Phase 1', () => {
  assert.equal(hasPassiveTree('thief'), true)
  assert.ok(passiveTreeOf('thief'))
  for (const job of ['novice', 'swordsman', 'archer', 'mage', 'cleric'] as JobId[]) {
    assert.equal(hasPassiveTree(job), false, job)
    assert.equal(passiveTreeOf(job), undefined, job)
    assert.equal(passiveNodeById(job, 'th_origin'), undefined)
    assert.deepEqual(normalizePassiveNodes(job, ['th_origin']), [])
    assert.equal(passiveSpent(job, ['th_origin']), 0)
    assert.equal(canAllocatePassive(job, [], 'th_origin', 10), false)
    assert.equal(canRefundPassive(job, ['th_origin'], 'th_origin'), false)
    assert.deepEqual(passiveMods(job, ['th_origin']), [])
  }
})

test('Thief constellation graph invariants: counts, bounds, >=62px spacing, symmetry, full connectivity', () => {
  const tree = passiveTreeOf('thief')!
  assert.equal(tree.job, 'thief')
  assert.equal(tree.originId, 'th_origin')
  assert.ok(tree.filters.length >= 5)

  const nodes = tree.nodes
  assert.ok(nodes.length >= 40 && nodes.length <= 44, `node count ${nodes.length} in [40, 44]`)

  const counts = { origin: 0, minor: 0, notable: 0, keystone: 0, socket: 0 }
  const idSet = new Set<string>()
  for (const n of nodes) {
    assert.ok(!idSet.has(n.id), `duplicate id: ${n.id}`)
    idSet.add(n.id)
    assert.equal(n.job, 'thief', n.id)
    counts[n.kind]++
    assert.ok(n.x >= -380 && n.x <= 380, `${n.id}.x=${n.x} within [-380, 380]`)
    assert.ok(n.y >= -280 && n.y <= 280, `${n.id}.y=${n.y} within [-280, 280]`)
    assert.ok(n.tags.length > 0, `${n.id} has tags`)
    if (n.kind === 'keystone') {
      assert.ok(n.upside && n.upside.trim().length > 0, `${n.id} keystone upside`)
      assert.ok(n.downside && n.downside.trim().length > 0, `${n.id} keystone downside`)
    }
  }
  assert.equal(counts.origin, 1)
  assert.equal(counts.keystone, 6)
  assert.equal(counts.notable, 14)
  assert.ok(counts.minor >= 19 && counts.minor <= 23, `minors=${counts.minor}`)

  // Every filter tag matches at least 3 nodes
  for (const f of tree.filters) {
    const matched = nodes.filter((n) => n.tags.includes(f.tag))
    assert.ok(matched.length >= 3, `filter ${f.tag} matches ${matched.length} nodes`)
  }

  // Pairwise minimum spacing >= 62px
  let minDist = Infinity
  let closestPair = ''
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (dist < minDist) {
        minDist = dist
        closestPair = `${a.id}(${a.x},${a.y}) <-> ${b.id}(${b.x},${b.y})`
      }
    }
  }
  assert.ok(minDist >= 62, `min node spacing ${minDist.toFixed(1)}px < 62px (${closestPair})`)

  // Edges are normalized symmetrically, no self-loops, all targets exist
  for (const n of nodes) {
    assert.equal(n.edges.length, new Set(n.edges).size, `${n.id} deduplicated edges`)
    for (const nbId of n.edges) {
      assert.notEqual(nbId, n.id, `${n.id} self-loop`)
      const nb = passiveNodeById('thief', nbId)
      assert.ok(nb, `${n.id} -> missing ${nbId}`)
      assert.ok(nb.edges.includes(n.id), `edge ${n.id} <-> ${nbId} must be symmetric`)
    }
  }

  // Full graph connectivity from originId via BFS
  const visited = new Set<string>([tree.originId])
  const queue = [tree.originId]
  while (queue.length > 0) {
    const cur = passiveNodeById('thief', queue.shift()!)!
    for (const nb of cur.edges) {
      if (!visited.has(nb)) {
        visited.add(nb)
        queue.push(nb)
      }
    }
  }
  assert.equal(visited.size, nodes.length, 'every node reachable from th_origin')
})

test('Thief constellation mods & descriptions: valid Stats keys, finite numbers, clean Thai text across all contexts', () => {
  const tree = passiveTreeOf('thief')!
  const contexts: (PassiveCtx | undefined)[] = [
    undefined,
    {},
    { job2: 'rogue' },
    { job2: 'mobster' },
    { job2: 'rogue', job3: 'stalker' },
    { job2: 'mobster', job3: 'kingpin' },
  ]
  const seenKeys = new Set<string>()
  for (const n of tree.nodes) {
    for (const ctx of contexts) {
      const d = n.desc(ctx)
      assert.ok(d.length > 0 && !/undefined|NaN/.test(d), `${n.id} desc: ${d}`)
      const m = n.mod(ctx)
      for (const [k, v] of Object.entries(m)) {
        assert.ok(k in PLAYER, `${n.id}: unknown Stats key ${k}`)
        assert.ok(typeof v === 'number' && Number.isFinite(v), `${n.id}.${k}=${v}`)
        seenKeys.add(k)
      }
    }
  }
  // Verify all 10 new Stats keys + all 24 P2'a-d Thief talent keys are present on the constellation
  const requiredKeys = [
    'thDeathMark', 'thUltCdAdd', 'thMistDr', 'thDefShieldCut', 'thFlurryDmgCut',
    'thMobFlurry', 'thEldritchVenom', 'thPhysLeechCut', 'thS3ShieldPierce', 'thLuckyKnife',
    'thWaveGauge', 'thDodgeFlee', 'waveDodge', 'thWaveOpenCrit', 'thWaveOpenCritDmg',
    'thCondTenacity', 'thStackHp', 'dodgeEnergy', 'thDodgeCdCut', 'thDodgeCdIcd',
    'thStackCritTal', 'thWeaveDmg', 'thWeaveRes', 'thUltExecCrit', 'thUltExecDmg',
    'thUltKillFinisher', 'ultDodge', 'ultHits', 'thUltOnHitTal', 'ultPoison',
    'thUltGauge', 'thPrivileged', 'thPerfectAgony', 'fleeFloor',
  ] as const
  for (const k of requiredKeys) {
    assert.ok(seenKeys.has(k), `constellation missing stat key: ${k}`)
  }
})

test('Adaptive Job2 Notables adapt cleanly across base Thief, Rogue, and Mobster', () => {
  const edge = passiveNodeById('thief', 'th_n_adapt_edge')!
  const ult = passiveNodeById('thief', 'th_n_adapt_ult')!
  assert.ok((edge.mod().s1Pow ?? 0) > 0 && (edge.mod().critMul ?? 0) > 0, 'base Thief fallback')
  assert.ok((edge.mod({ job2: 'rogue' }).j2KnifeMul ?? 0) > 0 && (edge.mod({ job2: 'rogue' }).comboDmg ?? 0) > 0)
  assert.ok((edge.mod({ job2: 'mobster' }).j2ExecAdd ?? 0) > 0 && (edge.mod({ job2: 'mobster' }).j2DebuffTurns ?? 0) > 0)

  assert.ok((ult.mod().ultPow ?? 0) > 0 && (ult.mod().poisonCap ?? 0) > 0)
  assert.ok((ult.mod({ job2: 'rogue' }).ult2Pow ?? 0) > 0 && (ult.mod({ job2: 'rogue' }).combo ?? 0) > 0)
  assert.ok((ult.mod({ job2: 'mobster' }).ult2Pow ?? 0) > 0 && (ult.mod({ job2: 'mobster' }).poisonCap ?? 0) > 0)

  // Verify heroBuild passes ctx.job2 through
  const path = ['th_m_blade1', 'th_m_blade2', 'th_n_adapt_edge']
  const stBase = heroStats(baseInput({ passiveNodes: path }))
  const stRogue = heroStats(baseInput({ job2: 'rogue', passiveNodes: path }))
  const stMob = heroStats(baseInput({ job2: 'mobster', passiveNodes: path }))
  assert.ok(stBase.s1Pow > 0 && stRogue.j2KnifeMul > 0 && stMob.j2ExecAdd > 0)
  assert.equal(stRogue.j2ExecAdd, 0)
  assert.equal(stMob.j2KnifeMul, 0)
})

test('passiveEarned & passiveEarnedFor: exact derived formula (Job1/2 + Job2/3 + Job3/5)', () => {
  assert.deepEqual(PASSIVE_RULES, { job1Every: 2, job2Every: 3, job3Every: 5 })
  assert.equal(passiveEarned(1), 0)
  assert.equal(passiveEarned(2), 1)
  assert.equal(passiveEarned(40), 20)
  assert.equal(passiveEarned(40, 50), 20 + 16)
  assert.equal(passiveEarned(40, 50, 30), 20 + 16 + 6)
  assert.equal(passiveEarned(40, 50, 50), 20 + 16 + 10)
  assert.equal(passiveEarned(-5, -3, -1), 0)

  // passiveEarnedFor only counts job2 when job2 belongs to job, and job3 when activeJob3 matches job2
  assert.equal(passiveEarnedFor({ job: 'thief', jobLevel: 40, job2Level: 50 }), 20, 'no job2 -> job2Level ignored')
  assert.equal(passiveEarnedFor({ job: 'thief', jobLevel: 40, job2: 'rogue', job2Level: 50 }), 36)
  assert.equal(passiveEarnedFor({ job: 'thief', jobLevel: 40, job2: 'rogue', job2Level: 50, job3: 'kingpin', job3Level: 30 }), 36, 'parked kingpin does not count on rogue')
  assert.equal(passiveEarnedFor({ job: 'thief', jobLevel: 40, job2: 'rogue', job2Level: 50, job3: 'stalker', job3Level: 30 }), 42)
})

test('BFS normalization, adjacency allocation, free origin, and connectivity-preserving refund (chains & cycles)', () => {
  // Origin is always free whether present or omitted
  assert.deepEqual(normalizePassiveNodes('thief', undefined), ['th_origin'])
  assert.deepEqual(normalizePassiveNodes('thief', []), ['th_origin'])
  assert.deepEqual(normalizePassiveNodes('thief', ['th_origin']), ['th_origin'])
  assert.equal(passiveSpent('thief', undefined), 0)
  assert.equal(passiveSpent('thief', []), 0)
  assert.equal(passiveSpent('thief', ['th_origin']), 0)
  assert.equal(passiveFree('thief', [], 5), 5)
  assert.equal(passiveFree('thief', ['th_origin'], 5), 5)
  assert.deepEqual(passiveMods('thief', []), [])

  // Cannot allocate origin, unknown node, non-adjacent node, or with 0 points
  assert.equal(canAllocatePassive('thief', [], 'th_origin', 10), false)
  assert.equal(canAllocatePassive('thief', [], 'does_not_exist', 10), false)
  assert.equal(canAllocatePassive('thief', [], 'th_k_deathmark', 10), false)
  assert.equal(canAllocatePassive('thief', [], 'th_m_blade1', 0), false)
  assert.equal(canAllocatePassive('thief', [], 'th_m_blade1', 1), true)

  // Disconnected island & junk pruned by normalizePassiveNodes
  assert.deepEqual(
    normalizePassiveNodes('thief', ['th_m_blade1', 'th_k_deathmark', 'junk', 'th_m_blade1']),
    ['th_origin', 'th_m_blade1'],
  )
  assert.equal(passiveSpent('thief', ['th_m_blade1']), 1)

  // Chain allocation: origin -> blade1 -> blade2 -> open -> deathmark
  let picked = allocatePassive('thief', [], 'th_m_blade1', 4)
  assert.equal(passiveSpent('thief', picked), 1)
  assert.equal(canAllocatePassive('thief', picked, 'th_m_blade1', 4), false, 'already picked')
  picked = allocatePassive('thief', picked, 'th_m_blade2', 4)
  picked = allocatePassive('thief', picked, 'th_n_open', 4)
  picked = allocatePassive('thief', picked, 'th_k_deathmark', 4)
  assert.equal(passiveSpent('thief', picked), 4)
  assert.equal(passiveFree('thief', picked, 4), 0)

  // Articulation point check: cannot refund blade1, blade2, or open while deathmark depends solely on this chain
  assert.equal(canRefundPassive('thief', picked, 'th_origin'), false)
  assert.equal(canRefundPassive('thief', picked, 'th_m_blade1'), false)
  assert.equal(canRefundPassive('thief', picked, 'th_m_blade2'), false)
  assert.equal(canRefundPassive('thief', picked, 'th_n_open'), false)
  assert.equal(canRefundPassive('thief', picked, 'th_k_deathmark'), true, 'leaf can be refunded')
  assert.deepEqual(refundPassive('thief', picked, 'th_m_blade1'), picked, 'illegal refund is no-op')

  // Loop cycle test: add alternate route origin -> shadow1 -> ring_n -> open
  let cycle = allocatePassive('thief', picked, 'th_m_shadow1', 10)
  cycle = allocatePassive('thief', cycle, 'th_m_ring_n', 10)
  // Now th_m_blade2 is NO LONGER a cut vertex because open & deathmark are still reachable via shadow1 -> ring_n -> open!
  assert.equal(canRefundPassive('thief', cycle, 'th_m_blade2'), true, 'loop allows refunding old bridge node')
  const afterLoopRefund = refundPassive('thief', cycle, 'th_m_blade2')
  assert.equal(afterLoopRefund.includes('th_m_blade2'), false)
  assert.equal(afterLoopRefund.includes('th_k_deathmark'), true)
  assert.equal(passiveSpent('thief', afterLoopRefund), 5)

  // Refunding leaf back to empty
  const leafRefund = refundPassive('thief', ['th_m_blade1'], 'th_m_blade1')
  assert.deepEqual(leafRefund, ['th_origin'])
  assert.equal(passiveSpent('thief', leafRefund), 0)
})

test('Keystone mechanics in heroBuild, ultCooldown, thiefUltBudget & ultInfo', () => {
  // 1. Death Mark: +1 Ult CD in ultCooldown() & shown in ultInfo()
  const baseSt = heroStats(baseInput())
  const dmPath = ['th_m_blade1', 'th_m_blade2', 'th_n_open', 'th_k_deathmark']
  const dmSt = heroStats(baseInput({ passiveNodes: dmPath }))
  near(dmSt.thDeathMark, KIT.thiefDeathMarkEcho)
  assert.equal(dmSt.thUltCdAdd, 1)
  assert.equal(ultCooldown(JOBS.thief, dmSt), ultCooldown(JOBS.thief, baseSt) + 1)
  assert.ok(ultInfo('thief', dmSt).some((r) => r.label.includes('Death Mark')))

  // 2. Mistwalker: -30% P.DEF in heroBuild, +thMistDr, +fleeFloor, +waveDodge
  const preMistPath = ['th_m_shadow1', 'th_n_step', 'th_m_shadow3']
  const mistPath = [...preMistPath, 'th_k_mist']
  const preMist = heroStats(baseInput({ passiveNodes: preMistPath, stats: { str: 10, vit: 60, wis: 10, dex: 10, int: 10, luk: 10, agi: 10 } }))
  const withMist = heroStats(baseInput({ passiveNodes: mistPath, stats: { str: 10, vit: 60, wis: 10, dex: 10, int: 10, luk: 10, agi: 10 } }))
  assert.ok(preMist.def > 0)
  assert.equal(withMist.def, Math.round(preMist.def * (1 - KIT.thiefMistDefCut)), 'Mistwalker cuts DEF by 30%')
  near(withMist.thMistDr, KIT.thiefMistDr)
  near(withMist.thDefShieldCut, KIT.thiefMistDefCut)
  near(withMist.fleeFloor, 0.18, 'Thief base 0.1 + Mistwalker 0.08 = 0.18')
  assert.equal(withMist.waveDodge, 1)

  // 3. Eldritch Venom: M.ATK bolsters flat poisonDmg by matk * matkPer * thiefEldritchMatkShare, sets thPhysLeechCut
  const preEldPath = ['th_m_alch1', 'th_m_alch2', 'th_n_lucky']
  const eldPath = [...preEldPath, 'th_k_eldritch']
  const preEld = heroStats(baseInput({ passiveNodes: preEldPath, stats: { str: 10, vit: 10, wis: 10, dex: 10, int: 80, luk: 10, agi: 10 } }))
  const withEld = heroStats(baseInput({ passiveNodes: eldPath, stats: { str: 10, vit: 10, wis: 10, dex: 10, int: 80, luk: 10, agi: 10 } }))
  assert.equal(withEld.thEldritchVenom, 1)
  near(withEld.thPhysLeechCut, KIT.thiefPhysLeechCut)
  near(withEld.poisonDmg - preEld.poisonDmg, withEld.matk * KIT.poison.matkPer * KIT.thiefEldritchMatkShare)

  // 4. Blade Flurry: +2 ultHits, +0.05 thUltOnHitTal, thFlurryDmgCut 0.10, stays <= live ceiling even with full thief_u
  const flurryMod = passiveNodeById('thief', 'th_k_flurry')!.mod()
  const uFull: Stats = { ...PLAYER }
  const add = (m: Partial<Stats>) => {
    for (const [k, v] of Object.entries(m) as [keyof Stats, number][]) (uFull[k] as number) += v
  }
  for (const [id, lv] of [['thief_u1', 5], ['thief_u2', 5], ['thief_u3', 5], ['thief_u4', 1]] as const) {
    add(nodeById(id)!.mod(lv))
  }
  add(flurryMod)
  const h: UltHero = { skillCrit: 0.25, critMul: 2.2 }
  const ceilOff = thiefUltBudget({ ...PLAYER, ultHits: 3 }, h, false)
  const ceilOn = thiefUltBudget({ ...PLAYER, ultHits: 3 }, h, true)
  assert.ok(thiefUltBudget(uFull, h, false) <= ceilOff, 'Blade Flurry + thief_u <= live ceiling (gauge off)')
  assert.ok(thiefUltBudget(uFull, h, true) <= ceilOn, 'Blade Flurry + thief_u <= live ceiling (gauge on)')
})

test('heroBuild fallback: live Thief saves ignore legacy talents, synthetic legacy inputs still work', () => {
  const withPassive = heroBuild(baseInput({
    passiveNodes: ['th_m_blade1'],
    jobTalents: { '4': { id: 'th_t4a', rank: 2 } }, // ignored because passiveNodes is defined
  })).stats
  assert.equal(withPassive.thPrivileged, 0, 'legacy jobTalents ignored when passiveNodes is present')
  assert.ok(withPassive.atk > heroStats(baseInput({ passiveNodes: [] })).atk)

  // Synthetic legacy test input with passiveNodes: undefined and non-empty jobTalents falls back cleanly
  const legacySynthetic = heroBuild(baseInput({
    passiveNodes: undefined,
    jobTalents: { '4': { id: 'th_t4a', rank: 2 } },
  })).stats
  near(legacySynthetic.thPrivileged, 0.3)
})

// ---------- Save migration & corrupt-data guard ----------
const mem: Record<string, string> = {}
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  get length() { return Object.keys(mem).length },
  key: (i: number) => Object.keys(mem)[i] ?? null,
  clear: () => { for (const k of Object.keys(mem)) delete mem[k] },
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}
const { changeJob, changeJob2, load, migratePassiveTree, newSave, repickJob, setSave, THIEF_REWORK_VER, wipe } = await import('../src/save')
type SaveData = ReturnType<typeof newSave>

test('save migration: Thief legacy talents migrate cleanly without touching THIEF_REWORK_VER or non-Thief classes', () => {
  assert.equal(THIEF_REWORK_VER, 6, 'THIEF_REWORK_VER untouched')

  // 1. Old Thief save with jobTalents/job2Talents and no passiveNodes
  const s = newSave('th', 'human')
  Object.assign(s, {
    job: 'thief',
    job2: 'rogue',
    jobTalents: { 1: { id: 'th_t1a', rank: 2 } },
    job2Talents: { 1: { id: 'rg_t1_combo', rank: 2 } },
  } as Partial<SaveData>)
  migratePassiveTree(s)
  assert.deepEqual(s.passiveNodes, [])
  assert.deepEqual(s.jobTalents, {})
  assert.deepEqual(s.job2Talents, {})

  // Idempotent on second call after allocating
  s.passiveNodes = allocatePassive('thief', s.passiveNodes, 'th_m_blade1', 5)
  migratePassiveTree(s)
  assert.deepEqual(s.passiveNodes, ['th_origin', 'th_m_blade1'])

  // 2. Corrupt & disconnected passiveNodes sanitized without throwing
  const bad = newSave('bad', 'human')
  Object.assign(bad, { job: 'thief', passiveNodes: 'not-an-array' as unknown as string[] })
  assert.doesNotThrow(() => migratePassiveTree(bad))
  assert.deepEqual(bad.passiveNodes, [])

  bad.passiveNodes = ['th_m_blade1', 'th_k_agony', 'bogus']
  migratePassiveTree(bad)
  assert.deepEqual(bad.passiveNodes, ['th_origin', 'th_m_blade1'], 'disconnected island and junk pruned')

  // 3. Non-Thief saves keep their legacy talents completely untouched
  const arc = newSave('arc', 'human')
  Object.assign(arc, {
    job: 'archer',
    jobTalents: { 1: { id: 'ar_t1_a', rank: 2 } },
  } as Partial<SaveData>)
  migratePassiveTree(arc)
  assert.equal(arc.passiveNodes, undefined)
  assert.deepEqual(arc.jobTalents, { 1: { id: 'ar_t1_a', rank: 2 } })

  // 4. changeJob2 preserves passiveNodes across Rogue <-> Mobster, while repickJob clears them
  const live = newSave('live', 'human')
  Object.assign(live, {
    job: 'thief',
    jobLevel: 40,
    clearsBy: { d5: 1 },
    job2: 'rogue',
    gems: 500,
    passiveNodes: ['th_origin', 'th_m_blade1'],
  } as Partial<SaveData>)
  setSave(live)
  assert.equal(changeJob2('mobster', 0), true)
  assert.deepEqual(live.passiveNodes, ['th_origin', 'th_m_blade1'], 'Job2 switch keeps Thief constellation')
  assert.equal(repickJob('archer'), true)
  assert.equal(live.passiveNodes, undefined, 'repick to non-migrated class clears passiveNodes')
  changeJob('thief')
  assert.deepEqual(live.passiveNodes, [], 'changing to thief initializes passiveNodes')

  // 5. load() end-to-end migration
  const oldJson = newSave('e2e', 'human')
  Object.assign(oldJson, {
    job: 'thief',
    jobTalents: { 4: { id: 'th_t4a', rank: 2 } },
    job2Talents: { 1: { id: 'rg_t1_combo', rank: 2 } },
  } as Partial<SaveData>)
  delete oldJson.passiveNodes
  wipe()
  mem['novice-to-hero.save.v1'] = JSON.stringify(oldJson)
  const loaded = load()
  assert.ok(loaded)
  assert.deepEqual(loaded.passiveNodes, [])
  assert.deepEqual(loaded.jobTalents, {})
  assert.deepEqual(loaded.job2Talents, {})
})

test('11 new KIT keys are whitelisted in tunables and have specific Thai explanations', () => {
  const NEW_KIT_KEYS = [
    'thiefDeathMarkTurns',
    'thiefDeathMarkAt',
    'thiefDeathMarkEcho',
    'thiefMistDr',
    'thiefMistDefCut',
    'thiefFlurryDmgCut',
    'thiefMobFlurryMul',
    'thiefOverhealCap',
    'thiefEldritchMatkShare',
    'thiefPhysLeechCut',
    'thiefLuckyPoison',
  ] as const
  assert.equal(NEW_KIT_KEYS.length, 11)
  for (const key of NEW_KIT_KEYS) {
    assert.ok(typeof KIT[key] === 'number' && KIT[key] > 0, `KIT.${key}`)
    assert.ok(fieldFor('kit', key), `missing tunable whitelist: kit.${key}`)
    const ex = explainField('kit', key)
    assert.ok(ex.label.trim().length > 0, `empty label: ${key}`)
    assert.ok(ex.effect.trim().length > 0 && ex.effect !== 'ตัวคูณคิทคลาสหลัก', `generic fallback explain: ${key}`)
  }
})
