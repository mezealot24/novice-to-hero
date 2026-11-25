// PoE-style Class-Line Passive Constellation tests for Swordsman-Line (Phase 2).
// Run: node tools/test.mjs passive-swordsman
import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAYER } from '../src/data/game-data'
import { JOBS, SWORD_S1, swordExecMul } from '../src/data/jobs'
import { heroBuild, heroStats, type StatsInput } from '../src/data/meta'
import {
  allocatePassive,
  canAllocatePassive,
  canRefundPassive,
  hasPassiveTree,
  normalizePassiveNodes,
  passiveCtxFor,
  passiveEarnedFor,
  passiveMods,
  passiveNodeById,
  passiveSpent,
  passiveTreeOf,
  refundPassive,
  trimPassiveNodesToBudget,
  type PassiveCtx,
} from '../src/data/passive-tree'
import { SWORDSMAN_AWAKEN_NODES } from '../src/data/passives/swordsman-awaken'
import { activeJewels, makeJewel, socketJewel } from '../src/data/jewels'
import { autoInfo, KIT, ultCooldown, ultInfo } from '../src/data/skill-math'
import { fieldFor } from '../src/data/patch'
import { explainField } from '../src/admin/explain'

const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)

const swInput = (over: Partial<StatsInput> = {}): StatsInput => ({
  race: 'human',
  job: 'swordsman',
  jobLevel: 40,
  stats: { str: 35, vit: 30, wis: 15, dex: 20, int: 10, luk: 15, agi: 20 },
  equipped: {},
  skills: { smash: 1, firstaid: 0, tough: 0, focus: 0, power: 0, iron: 0 },
  passiveNodes: [],
  ...over,
})

function pathTo(target: string): string[] {
  const tree = passiveTreeOf('swordsman')!
  const prev = new Map<string, string>()
  const seen = new Set([tree.originId])
  const q = [tree.originId]
  while (q.length) {
    const cur = q.shift()!
    if (cur === target) break
    for (const nb of passiveNodeById('swordsman', cur)!.edges) {
      if (seen.has(nb)) continue
      seen.add(nb)
      prev.set(nb, cur)
      q.push(nb)
    }
  }
  const out: string[] = []
  for (let c: string | undefined = target; c && c !== tree.originId; c = prev.get(c)) out.unshift(c)
  return out
}

test('Swordsman constellation graph invariants: counts, bounds, >=62px spacing, symmetry, full connectivity', () => {
  assert.equal(hasPassiveTree('swordsman'), true)
  const tree = passiveTreeOf('swordsman')!
  assert.equal(tree.job, 'swordsman')
  assert.equal(tree.originId, 'sw_origin')
  assert.deepEqual(tree.quadrants, ['vanguard', 'bastion', 'fury', 'warblood'])
  assert.equal(tree.filters.length, 5)

  const nodes = tree.nodes
  assert.equal(nodes.length, 85, `node count ${nodes.length} === 85`)

  const counts = { origin: 0, minor: 0, notable: 0, keystone: 0, socket: 0 }
  const idSet = new Set<string>()
  const nameSet = new Set<string>()
  for (const n of nodes) {
    assert.ok(!idSet.has(n.id), `duplicate id: ${n.id}`)
    assert.ok(!nameSet.has(n.name), `duplicate name: ${n.name}`)
    idSet.add(n.id)
    nameSet.add(n.name)
    assert.equal(n.job, 'swordsman', n.id)
    counts[n.kind]++
    assert.ok(n.x >= -520 && n.x <= 520, `${n.id}.x=${n.x} within [-520, 520]`)
    const yCap = n.awaken ? 700 : 390
    assert.ok(n.y >= -yCap && n.y <= yCap, `${n.id}.y=${n.y} within [-${yCap}, ${yCap}]`)
    assert.ok(n.tags.length > 0, `${n.id} has tags`)
    if (n.kind === 'keystone') {
      assert.ok(n.upside && n.upside.trim().length > 0, `${n.id} keystone upside`)
      assert.ok(n.downside && n.downside.trim().length > 0, `${n.id} keystone downside`)
    }
  }
  assert.equal(counts.origin, 1)
  assert.equal(counts.keystone, 6 + 2)
  assert.equal(counts.notable, 22 + 4)
  assert.equal(counts.minor, 38 + 6)
  assert.equal(counts.socket, 4 + 2)

  // Every filter tag matches at least 3 nodes & pill labels stay short (<= 5 chars) to prevent UI overlap
  for (const f of tree.filters) {
    assert.ok(f.label.length <= 6, `filter label too wide: ${f.label}`)
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
      const nb = passiveNodeById('swordsman', nbId)
      assert.ok(nb, `${n.id} -> missing ${nbId}`)
      assert.ok(nb.edges.includes(n.id), `edge ${n.id} <-> ${nbId} must be symmetric`)
    }
  }

  // Full graph connectivity from sw_origin via BFS
  const visited = new Set<string>([tree.originId])
  const queue = [tree.originId]
  while (queue.length > 0) {
    const cur = passiveNodeById('swordsman', queue.shift()!)!
    for (const nb of cur.edges) {
      if (!visited.has(nb)) {
        visited.add(nb)
        queue.push(nb)
      }
    }
  }
  assert.equal(visited.size, nodes.length, 'every node reachable from sw_origin')
})

test('Swordsman constellation mods & descriptions: valid Stats keys, finite numbers, clean Thai text across all contexts', () => {
  const tree = passiveTreeOf('swordsman')!
  const contexts: (PassiveCtx | undefined)[] = [
    undefined,
    {},
    { job2: 'knight' },
    { job2: 'berserker' },
    { job2: 'knight', job3: 'lordknight' },
    { job2: 'berserker', job3: 'warlord' },
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
  // Verify all 13 new Swordsman Stats keys + core constellation Stats keys
  const requiredKeys = [
    'swIronDr', 'swIronAspdCut', 'swCounterDefMul', 'swBlockCounter', 'swNoFlee',
    'swCleaveTaken', 'swExecBonus', 'swS1CdCut', 'swUltCdAdd', 'swBloodFuryDmg',
    'swBloodFurySelf', 'swS3ArmorBreak', 'swS1Ctr',
    'cleaveAdd', 'hit', 'combo', 'waveShield', 'startRage', 'rageOnHurtAdd',
    'spellVamp', 'ultShieldAdd', 'ultMulAdd', 'ultVsCharge',
    'ultCounters', 'revive', 'reviveHp', 'overhealShield', 'lifesteal',
    'counterRage', 'counterShield', 's1Pow', 's3Pow', 'skillCrit', 'basicDmg', 'counterDmg',
  ] as const
  for (const k of requiredKeys) {
    assert.ok(seenKeys.has(k), `constellation missing stat key: ${k}`)
  }
})

test('Adaptive Job2 Notables adapt cleanly across base Swordsman, Knight, and Berserker', () => {
  const edge = passiveNodeById('swordsman', 'sw_n_adapt_edge')!
  const ult = passiveNodeById('swordsman', 'sw_n_adapt_ult')!
  assert.ok((edge.mod().pskill ?? 0) > 0 && (edge.mod().basicDmg ?? 0) > 0, 'base Swordsman fallback')
  assert.ok((edge.mod({ job2: 'knight' }).j2HpDmg ?? 0) > 0 && (edge.mod({ job2: 'knight' }).j2Charge ?? 0) > 0)
  assert.ok((edge.mod({ job2: 'berserker' }).j2Duel ?? 0) > 0 && (edge.mod({ job2: 'berserker' }).critMul ?? 0) > 0)

  const ultBase = ult.mod()
  assert.ok((ultBase.s1Pow ?? 0) > 0 && (ultBase.ultPow ?? 0) > 0 && (ultBase.ultShieldAdd ?? 0) > 0)
  const ultKnight = ult.mod({ job2: 'knight' })
  assert.ok((ultKnight.s3Pow ?? 0) > 0 && (ultKnight.j2Sweep ?? 0) > 0 && (ultKnight.j2Guard ?? 0) > 0 && (ultKnight.ult2Pow ?? 0) > 0)
  const ultZerk = ult.mod({ job2: 'berserker' })
  assert.ok((ultZerk.s3Pow ?? 0) > 0 && (ultZerk.skillCrit ?? 0) > 0 && (ultZerk.j2FrenzyMax ?? 0) > 0)

  const path = ['sw_m_van1', 'sw_m_van2', 'sw_n_adapt_edge']
  const stBase = heroStats(swInput({ passiveNodes: path }))
  const stKnight = heroStats(swInput({ job2: 'knight', passiveNodes: path }))
  const stZerk = heroStats(swInput({ job2: 'berserker', passiveNodes: path }))
  assert.ok(stBase.pskill > heroStats(swInput({ passiveNodes: [] })).pskill)
  assert.ok(stKnight.j2HpDmg > 0 && stKnight.j2Charge > 0)
  assert.equal(stKnight.j2Duel, 0)
  assert.ok(stZerk.j2Duel > 0)
  assert.equal(stZerk.j2Charge, 0)
})

test('Awakening ring: 14 nodes (Lord Knight / Warlord), gated, reachable <= 35 pts, jewel sockets', () => {
  const KNIGHT: PassiveCtx = { job2: 'knight' }
  const LK: PassiveCtx = { job2: 'knight', job3: 'lordknight' }
  const WL: PassiveCtx = { job2: 'berserker', job3: 'warlord' }

  assert.equal(SWORDSMAN_AWAKEN_NODES.length, 14)
  for (const j3 of ['lordknight', 'warlord'] as const) {
    const c = SWORDSMAN_AWAKEN_NODES.filter((n) => n.awaken?.includes(j3))
    const k = (kind: string) => c.filter((n) => n.kind === kind).length
    assert.deepEqual([c.length, k('minor'), k('notable'), k('keystone'), k('socket')], [7, 3, 2, 1, 1], j3)
    for (const n of c) assert.equal(n.sector, 'awaken')
  }
  assert.equal(passiveTreeOf('swordsman')!.nodes.filter((n) => !n.awaken).length, 71)

  // Warlord keystone intentionally omits j3GospelField (never extends Undying immortality duration)
  assert.equal(passiveNodeById('swordsman', 'aw_wl_k')!.mod(WL).j3GospelField, undefined)

  // Gating: only matching 3rd job can allocate
  const toLkEntry = pathTo('aw_lk_m1')
  toLkEntry.pop()
  const basePicked = toLkEntry.reduce((acc, id) => allocatePassive('swordsman', acc, id, 99, LK), [] as string[])
  assert.equal(canAllocatePassive('swordsman', basePicked, 'aw_lk_m1', 99, KNIGHT), false)
  assert.equal(canAllocatePassive('swordsman', basePicked, 'aw_lk_m1', 99, WL), false)
  assert.equal(canAllocatePassive('swordsman', basePicked, 'aw_lk_m1', 99, LK), true)

  // Reachability within 25 base + 10 J3 budget
  for (const [k, sock] of [['aw_lk_k', 'aw_lk_sock'], ['aw_wl_k', 'aw_wl_sock']] as const) {
    const p = pathTo(k)
    const baseCost = p.filter((id) => !passiveNodeById('swordsman', id)!.awaken).length
    assert.ok(baseCost <= 25, `${k}: base path ${baseCost}`)
    assert.ok(p.length - baseCost <= 4, `${k}: cluster path ${p.length - baseCost}`)
    assert.equal(passiveNodeById('swordsman', sock)!.edges.length, 1)
  }

  // Parked 3rd job prunes Awakening nodes & jewel socket stats
  const fullLk = pathTo('aw_lk_k').reduce((acc, id) => allocatePassive('swordsman', acc, id, 99, LK), [] as string[])
  assert.ok(fullLk.includes('aw_lk_k'))
  assert.equal(normalizePassiveNodes('swordsman', fullLk, KNIGHT).some((id) => id.startsWith('aw_')), false)
  assert.equal(passiveMods('swordsman', fullLk, KNIGHT).some((m) => m.j3GospelField), false)
})

test('Keystone mechanics in heroBuild, ultCooldown, autoInfo, ultInfo & allocate/refund round-trip invariant', () => {
  const baseSt = heroStats(swInput())

  // 1. Iron Fortress: -15% ASPD in heroBuild, swIronDr + ultShieldAdd + tenacity
  const preIronPath = ['sw_m_bas1', 'sw_n_guardwall', 'sw_m_bas3']
  const ironPath = [...preIronPath, 'sw_k_juggernaut']
  const preIron = heroStats(swInput({ passiveNodes: preIronPath }))
  const withIron = heroStats(swInput({ passiveNodes: ironPath }))
  near(withIron.swIronDr, KIT.swordIronDr)
  near(withIron.aspd, Math.max(0.6, preIron.aspd * (1 - KIT.swordIronAspdCut)), 'Iron Fortress cuts ASPD by 15%')

  // 2. Thorned Aegis: sets st.flee = 0, grants swCounterDefMul + swBlockCounter + counter
  const thornPath = ['sw_m_bas1', 'sw_n_guardwall', 'sw_m_bas3', 'sw_n_ultcounter', 'sw_k_thornguard']
  const withThorn = heroStats(swInput({ passiveNodes: thornPath }))
  assert.equal(withThorn.flee, 0, 'swNoFlee zeroes out hero FLEE')
  near(withThorn.swCounterDefMul, KIT.swordCounterDefMul)
  assert.equal(withThorn.swBlockCounter, 1)

  // 3. Judgment: +1 Ult CD in ultCooldown(), -2 S1 CD in autoInfo(), s1Pow/skillCrit/ultPow, +0.2 execute bonus in ultInfo() across job1 & job2
  const judgPath = ['sw_m_van1', 'sw_m_ring_n', 'sw_n_eagleeye', 'sw_k_judgment']
  const withJudg = heroStats(swInput({ passiveNodes: judgPath }))
  assert.equal(withJudg.swUltCdAdd, 1)
  assert.ok(withJudg.s1Pow >= 0.25, `Judgment s1Pow ${withJudg.s1Pow} >= 0.25`)
  assert.ok(withJudg.skillCrit >= 0.1, `Judgment skillCrit ${withJudg.skillCrit} >= 0.1`)
  assert.ok(withJudg.ultPow < 0, `Judgment ultPow ${withJudg.ultPow} < 0`)
  assert.equal(ultCooldown(JOBS.swordsman, withJudg), ultCooldown(JOBS.swordsman, baseSt) + 1)
  const s1CdRow = autoInfo('swordsman', withJudg).find((r) => r.label === 'คูลดาวน์')
  assert.equal(s1CdRow?.value, `${SWORD_S1.cd - 2} เทิร์น`, 'autoInfo shows reduced ดาบสยบมนตร์ CD (3 เทิร์น)')
  assert.equal(s1CdRow?.value, '3 เทิร์น')
  const j1ExecRow = ultInfo('swordsman', withJudg).find((r) => r.label === '⚖️ คำพิพากษา: เป้า HP ≤25%')
  assert.equal(j1ExecRow?.value, `×${swordExecMul(0.25, false, 1, KIT.swordExecBonus).toFixed(2)}`)
  const j2Judg = heroStats(swInput({ job2: 'knight', passiveNodes: judgPath }))
  const j2ExecRow = ultInfo('swordsman', j2Judg, undefined, 'knight').find((r) => r.label === '⚖️ คำพิพากษา: เป้า HP ≤25%')
  assert.equal(j2ExecRow?.value, `×${swordExecMul(0.25, false, 1, j2Judg.swExecAdd + KIT.swordExecBonus).toFixed(2)}`) // Knight 🔱 Pierce of Judgement: full curve (Q 2026-11-23)
  const bzJudg = heroStats(swInput({ job2: 'berserker', passiveNodes: judgPath }))
  const bzExecRow = ultInfo('swordsman', bzJudg, undefined, 'berserker').find((r) => r.label === '⚖️ คำพิพากษา: เป้า HP ≤25%')
  assert.equal(bzExecRow?.value, `×${swordExecMul(0.25, false, 0.25, KIT.swordExecBonus).toFixed(2)}`)

  // 4. Immortal Sanguine: overhealShield + spellVamp + lifesteal, -15 P.DEF & -5% M.DEF, no skillDmgCut
  const preVampPath = ['sw_m_bld1', 'sw_n_bloodthirst', 'sw_m_bld3', 'sw_n_undying']
  const preVamp = heroStats(swInput({ passiveNodes: preVampPath }))
  const vampPath = [...preVampPath, 'sw_k_bloodvamp']
  const withVamp = heroStats(swInput({ passiveNodes: vampPath }))
  assert.equal(withVamp.overhealShield, 1)
  near(withVamp.spellVamp, 0.2)
  near(withVamp.lifesteal, preVamp.lifesteal + 0.04, 'sw_k_bloodvamp adds +0.04 lifesteal')
  assert.equal(withVamp.skillDmgCut, 0)
  assert.equal(withVamp.def, Math.max(0, preVamp.def - 15), 'sw_k_bloodvamp cuts def by 15 (clamped >= 0)')
  near(withVamp.mdef, Math.max(0, preVamp.mdef - 0.05), 'sw_k_bloodvamp cuts mdef by 0.05 (clamped >= 0)')

  // 5. RPG invariant: allocate & refund every node returns derived stats identically to baseline
  const tree = passiveTreeOf('swordsman')!
  for (const n of tree.nodes) {
    if (n.id === tree.originId || n.awaken) continue
    const chain = pathTo(n.id)
    let picked: string[] = []
    for (const id of chain) picked = allocatePassive('swordsman', picked, id, 99)
    for (let i = chain.length - 1; i >= 0; i--) {
      assert.equal(canRefundPassive('swordsman', picked, chain[i]), true, `refund leaf ${chain[i]}`)
      picked = refundPassive('swordsman', picked, chain[i])
    }
    assert.deepEqual(picked, [tree.originId])
    assert.deepEqual(heroStats(swInput({ passiveNodes: picked })), baseSt, `round-trip ${n.id}`)
  }

  // 6. RPG invariant: zero immunity (mdef < 1, tenacity < 1, luckyDodge <= 0.25, swIronDr <= 0.5)
  const allBaseNodes = tree.nodes.filter((n) => !n.awaken).map((n) => n.id)
  const fullSt = heroStats(swInput({ passiveNodes: allBaseNodes }))
  assert.ok(fullSt.mdef < 1 && fullSt.tenacity < 1 && fullSt.luckyDodge <= 0.25 && fullSt.swIronDr <= 0.5)
})

// ---------- Save migration, jewel socket & tunables ----------
const mem: Record<string, string> = {}
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  get length() { return Object.keys(mem).length },
  key: (i: number) => Object.keys(mem)[i] ?? null,
  clear: () => { for (const k of Object.keys(mem)) delete mem[k] },
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}
const { addCard, changeJob, changeJob2, load, migratePassiveTree, newSave, repickJob, setSave, wipe } = await import('../src/save')
type SaveData = ReturnType<typeof newSave>

test('Swordsman save migration, changeJob2 trim, Awakening jewel socket & synthetic legacy fallback', () => {
  // 1. Old Swordsman save migrates jobTalents/job2Talents -> passiveNodes: []
  const old = newSave('sw', 'human')
  Object.assign(old, {
    job: 'swordsman',
    job2: 'knight',
    jobTalents: { 1: { id: 'sw_t1c', rank: 2 } },
    job2Talents: { 1: { id: 'kn_t1_hp', rank: 2 } },
  } as Partial<SaveData>)
  delete old.passiveNodes
  wipe()
  mem['novice-to-hero.save.v1'] = JSON.stringify(old)
  const loaded = load()
  assert.ok(loaded)
  assert.deepEqual(loaded.passiveNodes, [])
  assert.deepEqual(loaded.jobTalents, {})
  assert.deepEqual(loaded.job2Talents, {})

  // Synthetic legacy unit test (passiveNodes: undefined + non-empty jobTalents) still works
  const synth = heroStats(swInput({ passiveNodes: undefined, jobTalents: { 1: { id: 'sw_t1c', rank: 2 } } }))
  near(synth.waveShield, 0.08)

  // 2. changeJob2 Knight -> Berserker parks Lord Knight & trims 35 -> 25 connected nodes
  const live = newSave('sw2', 'human')
  Object.assign(live, {
    job: 'swordsman',
    jobLevel: 40,
    clearsBy: { d5: 1 },
    job2: 'knight',
    job2Level: 50,
    job3: 'lordknight',
    job3Level: 30,
    gems: 500,
    passiveNodes: [] as string[],
  } as Partial<SaveData>)
  const earned = passiveEarnedFor(live)
  assert.equal(earned, 35)
  const tree = passiveTreeOf('swordsman')!
  const bfsOrder: string[] = []
  const seen = new Set<string>([tree.originId])
  const q = [tree.originId]
  while (q.length) {
    const cur = passiveNodeById('swordsman', q.shift()!)!
    for (const nb of cur.edges) {
      if (!seen.has(nb)) { seen.add(nb); bfsOrder.push(nb); q.push(nb) }
    }
  }
  let filled: string[] = []
  for (const id of bfsOrder.slice(0, earned)) filled = allocatePassive('swordsman', filled, id, earned, passiveCtxFor(live))
  assert.equal(passiveSpent('swordsman', filled, passiveCtxFor(live)), 35)
  live.passiveNodes = filled
  setSave(live)

  assert.equal(changeJob2('berserker', 0), true)
  assert.equal(passiveEarnedFor(live), 25)
  assert.equal(passiveSpent('swordsman', live.passiveNodes, passiveCtxFor(live)), 25)
  assert.deepEqual(live.passiveNodes, normalizePassiveNodes('swordsman', live.passiveNodes, passiveCtxFor(live)))

  // 3. Awakening jewel socket works only while active 3rd job matches
  for (let i = 0; i < 3; i++) addCard(live, 'card_wolf')
  const jm = makeJewel(live, ['card_wolf', 'card_wolf', 'card_wolf'], () => 0)
  assert.ok(jm.ok); if (!jm.ok) return
  live.job2 = 'knight'; live.job3 = 'lordknight'
  assert.ok(socketJewel(live, 'aw_lk_sock', jm.jewel.id))
  live.passiveNodes = pathTo('aw_lk_sock').reduce((acc, id) => allocatePassive('swordsman', acc, id, 99, { job2: 'knight', job3: 'lordknight' }), [] as string[])
  assert.equal(activeJewels(live).length, 1)
  live.job2 = 'berserker'
  assert.equal(activeJewels(live).length, 0)

  // 4. repickJob to unmigrated class clears passiveNodes; changeJob back to swordsman initializes []
  assert.equal(repickJob('archer'), true)
  assert.equal(live.passiveNodes, undefined)
  changeJob('swordsman')
  assert.deepEqual(live.passiveNodes, [])
  assert.deepEqual(trimPassiveNodesToBudget('swordsman', filled, 0), ['sw_origin'])
  migratePassiveTree(live)
  assert.deepEqual(live.passiveNodes, [])
})

test('10 new Swordsman KIT keys are whitelisted in tunables and have specific Thai explanations', () => {
  const NEW_SWORD_KEYS = [
    'swordS1CdCut',
    'swordS3BreakTurns',
    'swordIronDr',
    'swordIronAspdCut',
    'swordCounterDefMul',
    'swordCleaveTaken',
    'swordExecBonus',
    'swordBloodFuryAt',
    'swordBloodFuryDmg',
    'swordBloodFurySelf',
  ] as const
  assert.equal(NEW_SWORD_KEYS.length, 10)
  for (const key of NEW_SWORD_KEYS) {
    assert.ok(typeof KIT[key] === 'number' && KIT[key] > 0, `KIT.${key}`)
    assert.ok(fieldFor('kit', key), `missing tunable whitelist: kit.${key}`)
    const ex = explainField('kit', key)
    assert.ok(ex.label.trim().length > 0, `empty label: ${key}`)
    assert.ok(ex.effect.trim().length > 0 && ex.effect !== 'ตัวคูณคิทคลาสหลัก', `generic fallback explain: ${key}`)
  }
})

test('Wave 3 rebalanced Swordsman constellation nodes (14 nodes) match updated mods & descriptions', () => {
  const modOf = (id: string, ctx?: PassiveCtx) => passiveNodeById('swordsman', id)!.mod(ctx)
  const descOf = (id: string, ctx?: PassiveCtx) => passiveNodeById('swordsman', id)!.desc(ctx)

  assert.deepEqual(modOf('sw_k_cleavestorm'), {
    cleaveAdd: 0.6,
    basicDmg: 0.2,
    s3Pow: 0.25,
    ultVsCharge: 0.35,
    ultMulAdd: -0.25,
    swCleaveTaken: KIT.swordCleaveTaken,
  })
  assert.deepEqual(modOf('sw_k_juggernaut'), {
    swIronDr: KIT.swordIronDr,
    ultShieldAdd: 0.15,
    tenacity: 0.15,
    counterDmg: 0.2,
    swIronAspdCut: KIT.swordIronAspdCut,
    ultMulAdd: -0.2,
  })
  near(KIT.swordCounterDefMul, 1.5)
  assert.deepEqual(modOf('sw_k_thornguard'), {
    swCounterDefMul: KIT.swordCounterDefMul,
    counter: 0.15,
    swBlockCounter: 1,
    swNoFlee: 1,
  })
  assert.ok(descOf('sw_k_thornguard').includes('1.5x P.DEF') && !descOf('sw_k_thornguard').includes('1.2x'))
  assert.deepEqual(modOf('sw_n_ultcounter'), { ultCounters: 2, swS1Ctr: 1, counterDmg: 0.2, ctrAoe: 1 })
  assert.deepEqual(modOf('sw_n_breaker'), { swS3ArmorBreak: 1, s3Pow: 0.2, physPen: 0.08 })
  assert.ok(descOf('sw_n_breaker').includes('Spiral Pierce'))
  assert.deepEqual(modOf('sw_n_warblade'), { physPen: 0.1, skillCrit: 0.08, s3Pow: 0.15 })
  assert.deepEqual(modOf('sw_m_bridge_n'), { counter: 0.04, s1Pow: 0.08 })
  assert.deepEqual(modOf('sw_m_van6'), { skillCrit: 0.05, physPen: 0.04 })
  assert.deepEqual(modOf('sw_m_fur6'), { atk: 10, skillCrit: 0.05 })
  assert.deepEqual(modOf('sw_n_vitality'), { mdef: 0.08, resRegen: 3, maxRes: 25, shieldAmp: 0.1 })
  assert.ok(
    descOf('sw_n_vitality').includes('+9/เทิร์น') &&
      descOf('sw_n_vitality').includes('Max Mana +25') &&
      descOf('sw_n_vitality').includes('โล่แรง +10%'),
  )
  assert.deepEqual(modOf('sw_n_adapt_edge'), { pskill: 0.12, basicDmg: 0.12, s1Pow: 0.12 })
  assert.deepEqual(modOf('sw_n_adapt_edge', { job2: 'knight' }), { j2HpDmg: 0.02, j2Charge: 0.5, s3Pow: 0.12 })
  assert.deepEqual(modOf('sw_n_adapt_edge', { job2: 'berserker' }), { j2Duel: 0.16, critMul: 0.18 })
  assert.deepEqual(modOf('sw_n_adapt_ult'), { s1Pow: 0.15, ultPow: 0.1, ultShieldAdd: 0.08, startRage: 15 })
  assert.deepEqual(modOf('sw_n_adapt_ult', { job2: 'knight' }), { s3Pow: 0.15, j2Sweep: 0.2, j2Guard: 0.06, ult2Pow: 0.1 })
  assert.deepEqual(modOf('sw_n_adapt_ult', { job2: 'berserker' }), { s3Pow: 0.15, skillCrit: 0.05, j2FrenzyMax: 2, rageGain: 0.15 })
  near(KIT.swordExecBonus, 0.2)
  near(KIT.swordS1CdCut, 2)
  assert.deepEqual(modOf('sw_k_judgment'), {
    swExecBonus: KIT.swordExecBonus,
    swS1CdCut: KIT.swordS1CdCut,
    s1Pow: 0.25,
    skillCrit: 0.1,
    physPen: 0.1,
    swUltCdAdd: 1,
    ultPow: -0.15,
  })
  assert.deepEqual(modOf('sw_k_bloodvamp'), {
    overhealShield: 1,
    spellVamp: 0.2,
    lifesteal: 0.04,
    def: -15,
    mdef: -0.05,
  })
})
