// PoE-style Class-Line Passive Constellation tests for Cleric-Line (Phase 3: Cleric / Monk / Crusader / Champion / Paladin).
// Run: node tools/test.mjs passive-cleric
import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAYER } from '../src/data/game-data'
import { JOBS } from '../src/data/jobs'
import { heroStats, type StatsInput } from '../src/data/meta'
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
  type PassiveCtx,
} from '../src/data/passive-tree'
import { passiveEntriesForJob, PASSIVE_JOBS, PASSIVE_TUNING } from '../src/data/passive-registry'
import { CLERIC_AWAKEN_NODES } from '../src/data/passives/cleric-awaken'
import { ultCooldown } from '../src/data/skill-math'
import { tree as CLERIC_WEB } from '../src/data/trees/cleric'
import { tree2 as CRUSADER_WEB } from '../src/data/trees2/crusader'
import { tree2 as MONK_WEB } from '../src/data/trees2/monk'

const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)

const clInput = (over: Partial<StatsInput> = {}): StatsInput => ({
  race: 'human',
  job: 'cleric',
  jobLevel: 40,
  stats: { str: 30, vit: 30, wis: 25, dex: 15, int: 20, luk: 10, agi: 20 },
  equipped: {},
  skills: { smash: 1, firstaid: 0, tough: 0, focus: 0, power: 0, iron: 0 },
  passiveNodes: [],
  ...over,
})

function pathTo(target: string): string[] {
  const tree = passiveTreeOf('cleric')!
  const prev = new Map<string, string>()
  const seen = new Set([tree.originId])
  const q = [tree.originId]
  while (q.length) {
    const cur = q.shift()!
    if (cur === target) break
    for (const nb of passiveNodeById('cleric', cur)!.edges) {
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

const CONTEXTS: (PassiveCtx | undefined)[] = [
  undefined,
  {},
  { job2: 'monk' },
  { job2: 'crusader' },
  { job2: 'monk', job3: 'champion' },
  { job2: 'crusader', job3: 'paladin' },
]

test('Cleric constellation graph invariants: counts, bounds, >=62px spacing, symmetry, full connectivity', () => {
  assert.equal(hasPassiveTree('cleric'), true)
  const tree = passiveTreeOf('cleric')!
  assert.equal(tree.job, 'cleric')
  assert.equal(tree.originId, 'cl_origin')
  assert.deepEqual(tree.quadrants, ['fist', 'ki', 'aegis', 'holy'])
  assert.equal(tree.filters.length, 5)

  const nodes = tree.nodes
  assert.equal(nodes.length, 85)
  const counts = { origin: 0, minor: 0, notable: 0, keystone: 0, socket: 0 }
  const ids = new Set<string>()
  const names = new Set<string>()
  for (const n of nodes) {
    assert.ok(!ids.has(n.id), `duplicate id: ${n.id}`)
    assert.ok(!names.has(n.name), `duplicate name: ${n.name}`)
    ids.add(n.id)
    names.add(n.name)
    assert.equal(n.job, 'cleric', n.id)
    assert.ok(/^(cl|aw)_/.test(n.id), `${n.id} prefix`)
    counts[n.kind]++
    assert.ok(n.x >= -520 && n.x <= 520, `${n.id}.x=${n.x}`)
    const yCap = n.awaken ? 700 : 390
    assert.ok(n.y >= -yCap && n.y <= yCap, `${n.id}.y=${n.y}`)
    assert.ok(n.tags.length > 0, `${n.id} has tags`)
    if (n.kind === 'keystone') {
      assert.ok(n.upside && n.upside.trim().length > 0, `${n.id} keystone upside`)
      assert.ok(n.downside && n.downside.trim().length > 0, `${n.id} keystone downside`)
      assert.ok(Object.values(n.mod({})).some((v) => typeof v === 'number' && v < 0) || 'swUltCdAdd' in n.mod({}) || 'swNoFlee' in n.mod({}) || 'swIronAspdCut' in n.mod({}), `${n.id} downside is real stats`)
    }
  }
  assert.deepEqual(counts, { origin: 1, minor: 38 + 6, notable: 22 + 4, keystone: 6 + 2, socket: 4 + 2 })

  for (const f of tree.filters) {
    assert.ok(f.label.length <= 6, `filter label too wide: ${f.label}`)
    assert.ok(nodes.filter((n) => n.tags.includes(f.tag)).length >= 3, `filter ${f.tag}`)
  }

  let minDist = Infinity
  let closest = ''
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)
      if (d < minDist) { minDist = d; closest = `${nodes[i].id} <-> ${nodes[j].id}` }
    }
  }
  assert.ok(minDist >= 62, `min node spacing ${minDist.toFixed(1)}px < 62px (${closest})`)

  for (const n of nodes) {
    assert.equal(n.edges.length, new Set(n.edges).size, `${n.id} deduplicated edges`)
    for (const nbId of n.edges) {
      assert.notEqual(nbId, n.id, `${n.id} self-loop`)
      const nb = passiveNodeById('cleric', nbId)
      assert.ok(nb, `${n.id} -> missing ${nbId}`)
      assert.ok(nb.edges.includes(n.id), `edge ${n.id} <-> ${nbId} must be symmetric`)
    }
  }

  const visited = new Set<string>([tree.originId])
  const queue = [tree.originId]
  while (queue.length > 0) {
    for (const nb of passiveNodeById('cleric', queue.shift()!)!.edges) {
      if (!visited.has(nb)) { visited.add(nb); queue.push(nb) }
    }
  }
  assert.equal(visited.size, nodes.length, 'every node reachable from cl_origin')
})

test('Cleric constellation mods & descriptions: valid Stats keys, finite numbers, clean text in every context', () => {
  const tree = passiveTreeOf('cleric')!
  const seen = new Set<string>()
  for (const n of tree.nodes) {
    for (const ctx of CONTEXTS) {
      const d = n.desc(ctx)
      assert.ok(d.length > 0 && !/undefined|NaN/.test(d), `${n.id} desc: ${d}`)
      for (const [k, v] of Object.entries(n.mod(ctx))) {
        assert.ok(k in PLAYER, `${n.id}: unknown Stats key ${k}`)
        assert.ok(typeof v === 'number' && Number.isFinite(v), `${n.id}.${k}=${v}`)
        seen.add(k)
      }
    }
    if (n.kind !== 'origin' && n.kind !== 'socket') assert.ok(Object.keys(n.mod({})).length > 0, `${n.id} gives stats`)
  }
  // Every stat a replaced talent gave (cleric_t* · mk_t* · cr_t*) is still on the constellation
  for (const web of [CLERIC_WEB, MONK_WEB, CRUSADER_WEB]) {
    for (const t of web.talents) {
      for (const k of Object.keys(t.mod(1))) {
        assert.ok(seen.has(k), `talent ${t.id} stat ${k} has no constellation node`)
      }
    }
  }
})

test('Adaptive Job2 notables: base Cleric, Monk and Crusader each get their own stats', () => {
  const tree = passiveTreeOf('cleric')!
  const adaptive = tree.nodes.filter((n) => JSON.stringify(n.mod({})) !== JSON.stringify(n.mod({ job2: 'monk' })) || JSON.stringify(n.mod({})) !== JSON.stringify(n.mod({ job2: 'crusader' })))
  assert.equal(adaptive.length, 8)
  for (const n of adaptive) {
    assert.equal(n.kind, 'notable', n.id)
    assert.ok(n.desc({}).includes('Cleric') && n.desc({ job2: 'monk' }).includes('Monk') && n.desc({ job2: 'crusader' }).includes('Crusader'), n.id)
    // 2nd-job-only stats never leak to the base class
    for (const k of Object.keys(n.mod({}))) assert.ok(!k.startsWith('j2') && !k.startsWith('j3'), `${n.id} base gives ${k}`)
    // admin registry: one live-tunable entry per variant
    for (const key of ['base', 'monk', 'crusader']) assert.ok(PASSIVE_TUNING[`${n.id}__${key}`], `${n.id}__${key}`)
  }
  assert.ok(PASSIVE_JOBS.includes('cleric'))
  assert.equal(passiveEntriesForJob('cleric').length, 85 - 7 /* origin + 6 sockets */ + adaptive.length * 2)

  const path = pathTo('cl_n_adapt_guard')
  const base = heroStats(clInput({ passiveNodes: path }))
  const monk = heroStats(clInput({ job2: 'monk', passiveNodes: path }))
  const crus = heroStats(clInput({ job2: 'crusader', passiveNodes: path }))
  const crus0 = heroStats(clInput({ job2: 'crusader' }))
  assert.ok(base.waveShield > 0 && base.j2BlockHeal === 0)
  assert.ok(monk.maxHp > heroStats(clInput({ job2: 'monk' })).maxHp && monk.j2BlockHeal === 0)
  assert.ok(crus.j2Guard > crus0.j2Guard)
  near(crus.j2BlockHeal, 0.01)
  near(crus.j2BlockShield, 0.02)
})

test('Keystones: one per Monk / Crusader skill-web branch, upside and downside both land on hero stats', () => {
  const st0 = heroStats(clInput())
  const withK = (id: string, over: Partial<StatsInput> = {}) => {
    const p = pathTo(id)
    return { pre: heroStats(clInput({ ...over, passiveNodes: p.slice(0, -1) })), st: heroStats(clInput({ ...over, passiveNodes: p })) }
  }
  const keys = passiveTreeOf('cleric')!.nodes.filter((n) => n.kind === 'keystone' && !n.awaken).map((n) => n.id).sort()
  assert.deepEqual(keys, ['cl_k_asura', 'cl_k_bastion', 'cl_k_ironbody', 'cl_k_martyr', 'cl_k_storm', 'cl_k_zeal'])

  const storm = withK('cl_k_storm')
  near(storm.st.combo, storm.pre.combo + 0.12)
  near(storm.st.s3Pow, storm.pre.s3Pow - 0.2)

  const asura = withK('cl_k_asura')
  near(asura.st.ult2Pow, asura.pre.ult2Pow + 0.25)
  assert.equal(ultCooldown(JOBS.cleric, asura.st), ultCooldown(JOBS.cleric, asura.pre) + 1)

  const iron = withK('cl_k_ironbody')
  assert.equal(iron.st.flee, 0)
  assert.ok(iron.pre.flee > 0 && iron.st.aspd < iron.pre.aspd && iron.st.maxHp > iron.pre.maxHp)

  const bastion = withK('cl_k_bastion')
  near(bastion.st.swIronDr, 0.12)
  assert.ok(bastion.st.aspd < bastion.pre.aspd && bastion.st.critMul < bastion.pre.critMul)

  const martyr = withK('cl_k_martyr')
  assert.equal(martyr.st.overhealShield, 1)
  assert.ok(martyr.st.healAmp > martyr.pre.healAmp && martyr.st.basicDmg < martyr.pre.basicDmg)

  const zeal = withK('cl_k_zeal')
  assert.ok(zeal.st.matk > zeal.pre.matk && zeal.st.healAmp < zeal.pre.healAmp && zeal.st.def < zeal.pre.def)

  // Allocate & refund every base node: derived stats return to the baseline
  const tree = passiveTreeOf('cleric')!
  for (const n of tree.nodes) {
    if (n.id === tree.originId || n.awaken) continue
    const chain = pathTo(n.id)
    let picked: string[] = []
    for (const id of chain) picked = allocatePassive('cleric', picked, id, 99)
    assert.equal(passiveSpent('cleric', picked), chain.length)
    for (let i = chain.length - 1; i >= 0; i--) {
      assert.equal(canRefundPassive('cleric', picked, chain[i]), true, `refund leaf ${chain[i]}`)
      picked = refundPassive('cleric', picked, chain[i])
    }
    assert.deepEqual(picked, [tree.originId])
    assert.deepEqual(heroStats(clInput({ passiveNodes: picked })), st0, `round-trip ${n.id}`)
  }

  // No immunity with the whole base tree allocated, on either 2nd job
  const all = tree.nodes.filter((n) => !n.awaken).map((n) => n.id)
  for (const job2 of ['monk', 'crusader'] as const) {
    const full = heroStats(clInput({ job2, passiveNodes: all }))
    assert.ok(full.mdef < 1 && full.tenacity < 1 && full.swIronDr <= 0.5 && full.j2Guard < 1, job2)
    assert.ok(full.maxHp > 0 && full.def >= 0 && full.aspd > 0, job2)
  }
})

test('Awakening ring: 14 nodes (Champion / Paladin), gated by the active 3rd job, reachable within budget', () => {
  const MONK: PassiveCtx = { job2: 'monk' }
  const CH: PassiveCtx = { job2: 'monk', job3: 'champion' }
  const PA: PassiveCtx = { job2: 'crusader', job3: 'paladin' }

  assert.equal(CLERIC_AWAKEN_NODES.length, 14)
  for (const j3 of ['champion', 'paladin'] as const) {
    const c = CLERIC_AWAKEN_NODES.filter((n) => n.awaken?.includes(j3))
    const k = (kind: string) => c.filter((n) => n.kind === kind).length
    assert.deepEqual([c.length, k('minor'), k('notable'), k('keystone'), k('socket')], [7, 3, 2, 1, 1], j3)
    for (const n of c) assert.equal(n.sector, 'awaken')
  }
  assert.equal(passiveTreeOf('cleric')!.nodes.filter((n) => !n.awaken).length, 71)

  const toEntry = pathTo('aw_ch_m1')
  toEntry.pop()
  const basePicked = toEntry.reduce((acc, id) => allocatePassive('cleric', acc, id, 99, CH), [] as string[])
  assert.equal(canAllocatePassive('cleric', basePicked, 'aw_ch_m1', 99, MONK), false)
  assert.equal(canAllocatePassive('cleric', basePicked, 'aw_ch_m1', 99, PA), false)
  assert.equal(canAllocatePassive('cleric', basePicked, 'aw_ch_m1', 99, CH), true)

  for (const [k, sock] of [['aw_ch_k', 'aw_ch_sock'], ['aw_pa_k', 'aw_pa_sock']] as const) {
    const p = pathTo(k)
    const baseCost = p.filter((id) => !passiveNodeById('cleric', id)!.awaken).length
    assert.ok(baseCost <= 25, `${k}: base path ${baseCost}`)
    assert.ok(p.length - baseCost <= 4, `${k}: cluster path ${p.length - baseCost}`)
    assert.equal(passiveNodeById('cleric', sock)!.edges.length, 1)
  }

  // A parked 3rd job prunes its Awakening nodes and their stats
  const fullCh = pathTo('aw_ch_k').reduce((acc, id) => allocatePassive('cleric', acc, id, 99, CH), [] as string[])
  assert.ok(fullCh.includes('aw_ch_k'))
  assert.equal(normalizePassiveNodes('cleric', fullCh, MONK).some((id) => id.startsWith('aw_')), false)
  assert.equal(passiveMods('cleric', fullCh, MONK).some((m) => m.j3GospelField), false)
  assert.equal(passiveMods('cleric', fullCh, CH).some((m) => m.j3GospelField === 1), true)
})

// ---------- Save migration ----------
const mem: Record<string, string> = {}
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  get length() { return Object.keys(mem).length },
  key: (i: number) => Object.keys(mem)[i] ?? null,
  clear: () => { for (const k of Object.keys(mem)) delete mem[k] },
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}
const { changeJob2, load, newSave, setSave, wipe } = await import('../src/save')
type SaveData = ReturnType<typeof newSave>

test('Cleric save migration: old talents -> empty constellation, changeJob2 keeps the picked nodes', () => {
  const old = newSave('cl', 'human')
  Object.assign(old, {
    job: 'cleric',
    job2: 'monk',
    jobTalents: { 1: { id: 'cleric_t1_focus', rank: 2 } },
    job2Talents: { 1: { id: 'mk_t1_combo', rank: 2 } },
  } as Partial<SaveData>)
  delete old.passiveNodes
  wipe()
  mem['novice-to-hero.save.v1'] = JSON.stringify(old)
  const loaded = load()
  assert.ok(loaded)
  assert.deepEqual(loaded.passiveNodes, [])
  assert.deepEqual(loaded.jobTalents, {})
  assert.deepEqual(loaded.job2Talents, {})

  // A corrupt / foreign node list is sanitized instead of throwing
  assert.deepEqual(normalizePassiveNodes('cleric', ['sw_m_van1', 'cl_m_fist2', 'nope', 'cl_m_fist1'] as string[]), ['cl_origin', 'cl_m_fist2', 'cl_m_fist1'])
  assert.deepEqual(normalizePassiveNodes('cleric', ['cl_k_zeal']), ['cl_origin'])

  const live = newSave('cl2', 'human')
  Object.assign(live, {
    job: 'cleric', jobLevel: 40, clearsBy: { d5: 1 },
    job2: 'monk', job2Level: 50, gems: 500,
    passiveNodes: [] as string[],
  } as Partial<SaveData>)
  assert.equal(passiveEarnedFor(live), 25)
  live.passiveNodes = pathTo('cl_n_adapt_guard').reduce((acc, id) => allocatePassive('cleric', acc, id, 25, passiveCtxFor(live)), [] as string[])
  const before = [...live.passiveNodes]
  setSave(live)
  assert.equal(changeJob2('crusader', 0), true)
  assert.deepEqual(live.passiveNodes, before)
  assert.ok(heroStats({ ...clInput(), job2: 'crusader', passiveNodes: live.passiveNodes }).j2BlockHeal > 0)
})
