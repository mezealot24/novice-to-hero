// 🌟 Thief Awakening ring (Q 2026-11-21): the passive tree grows at the 3rd job (Stalker / Kingpin clusters).
// Run: node tools/test.mjs passive-awaken
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  allocatePassive,
  canAllocatePassive,
  normalizePassiveNodes,
  passiveCtxFor,
  passiveEarnedFor,
  passiveMods,
  passiveNodeById,
  passiveNodeUnlocked,
  passiveTreeOf,
  trimPassiveNodesToBudget,
  type PassiveCtx,
} from '../src/data/passive-tree'
import { THIEF_AWAKEN_NODES } from '../src/data/passives/thief-awaken'
import { activeJewels, makeJewel, socketJewel } from '../src/data/jewels'
import { addCard, newSave } from '../src/save'

const ROGUE: PassiveCtx = { job2: 'rogue' }
const STALKER: PassiveCtx = { job2: 'rogue', job3: 'stalker' }
const KINGPIN: PassiveCtx = { job2: 'mobster', job3: 'kingpin' }

/** Shortest allocation path origin -> `target` (node ids, origin excluded) over every node. */
function pathTo(target: string): string[] {
  const tree = passiveTreeOf('thief')!
  const prev = new Map<string, string>()
  const seen = new Set([tree.originId])
  const q = [tree.originId]
  while (q.length) {
    const cur = q.shift()!
    if (cur === target) break
    for (const nb of passiveNodeById('thief', cur)!.edges) {
      if (seen.has(nb)) continue
      seen.add(nb); prev.set(nb, cur); q.push(nb)
    }
  }
  const out: string[] = []
  for (let c: string | undefined = target; c && c !== tree.originId; c = prev.get(c)) out.unshift(c)
  return out
}

test('Awakening ring: 14 nodes, 7 per 3rd job, each cluster = 3 minor + 2 notable + 1 keystone + 1 socket', () => {
  assert.equal(THIEF_AWAKEN_NODES.length, 14)
  for (const j3 of ['stalker', 'kingpin'] as const) {
    const c = THIEF_AWAKEN_NODES.filter((n) => n.awaken?.includes(j3))
    const k = (kind: string) => c.filter((n) => n.kind === kind).length
    assert.deepEqual([c.length, k('minor'), k('notable'), k('keystone'), k('socket')], [7, 3, 2, 1, 1], j3)
    for (const n of c) assert.equal(n.sector, 'awaken')
  }
  // the base constellation has no awaken gate
  const base = passiveTreeOf('thief')!.nodes.filter((n) => !n.awaken)
  assert.equal(base.length, 71)
})

test('gate: only the matching active 3rd job may allocate its cluster', () => {
  const toEntry = pathTo('aw_sk_m1')
  const entry = toEntry.pop()!
  assert.equal(entry, 'aw_sk_m1')
  const picked = toEntry.reduce((acc, id) => allocatePassive('thief', acc, id, 99, STALKER), [] as string[])
  assert.equal(picked.length, toEntry.length + 1, 'path to the cluster is all base nodes')
  assert.equal(canAllocatePassive('thief', picked, 'aw_sk_m1', 99, ROGUE), false, 'Rogue: locked')
  assert.equal(canAllocatePassive('thief', picked, 'aw_sk_m1', 99), false, 'no ctx: locked')
  assert.equal(canAllocatePassive('thief', picked, 'aw_sk_m1', 99, KINGPIN), false, 'Kingpin: not its cluster')
  assert.equal(canAllocatePassive('thief', picked, 'aw_sk_m1', 99, STALKER), true, 'Stalker: open')

  const kpPath = pathTo('aw_kp_m1')
  const kp = kpPath.slice(0, -1).reduce((acc, id) => allocatePassive('thief', acc, id, 99, KINGPIN), [] as string[])
  assert.equal(canAllocatePassive('thief', kp, 'aw_kp_m1', 99, STALKER), false)
  assert.equal(canAllocatePassive('thief', kp, 'aw_kp_m1', 99, KINGPIN), true)
})

test('keystone + socket reachable with the J3 points: base path <= 25 (Job1 + Job2), cluster <= +7', () => {
  for (const [k, sock] of [['aw_sk_k', 'aw_sk_sock'], ['aw_kp_k', 'aw_kp_sock']] as const) {
    const path = pathTo(k)
    const baseCost = path.filter((id) => !passiveNodeById('thief', id)!.awaken).length
    assert.ok(baseCost <= 25, `${k}: base path ${baseCost}`)
    assert.ok(path.length - baseCost <= 4, `${k}: cluster path ${path.length - baseCost}`)
    assert.ok(passiveNodeById('thief', sock)!.edges.length === 1)
  }
})

test('parked / missing 3rd job: awaken picks are pruned (no stats), re-awakening needs a re-pick', () => {
  const path = pathTo('aw_sk_k')
  const ctxRun = (ctx: PassiveCtx) => path.reduce((acc, id) => allocatePassive('thief', acc, id, 99, ctx), [] as string[])
  const full = ctxRun(STALKER)
  assert.ok(full.includes('aw_sk_k'))
  const ks = passiveMods('thief', full, STALKER).find((m) => m.j3GospelField === 3)
  assert.ok(ks && ks.thUltCdAdd === 1 && ks.u3Pow === 0.1, 'keystone stats with Stalker')
  assert.equal(passiveMods('thief', full, ROGUE).some((m) => m.j3GospelField), false, 'parked: no keystone')
  assert.equal(normalizePassiveNodes('thief', full, ROGUE).some((id) => id.startsWith('aw_')), false)
  assert.deepEqual(normalizePassiveNodes('thief', full, STALKER), full)
  assert.equal(trimPassiveNodesToBudget('thief', full, 99, STALKER).length, full.length, 'load trim keeps them for Stalker')
})

test('passiveCtxFor: 3rd job only when active on the matching 2nd job + base class', () => {
  assert.deepEqual(passiveCtxFor({ job: 'thief', job2: 'rogue', job3: 'stalker' }), STALKER)
  assert.deepEqual(passiveCtxFor({ job: 'thief', job2: 'mobster', job3: 'stalker' }), { job2: 'mobster', job3: undefined })
  assert.deepEqual(passiveCtxFor({ job: 'archer', job2: 'rogue', job3: 'stalker' }), { job2: undefined, job3: undefined })
  assert.equal(passiveNodeUnlocked(passiveNodeById('thief', 'th_origin')!), true)
  // J3 every 3 Lv: Stalker Job3 Lv 30 = +10 points (Max 35)
  assert.equal(passiveEarnedFor({ job: 'thief', jobLevel: 40, job2: 'rogue', job2Level: 50, job3: 'stalker', job3Level: 30 }), 35)
  assert.equal(passiveEarnedFor({ job: 'thief', jobLevel: 40, job2: 'rogue', job2Level: 50, job3: 'stalker', job3Level: 3 }), 26)
})

test('💎 Awakening socket: its jewel counts only while the 3rd job is active', () => {
  const s = newSave()
  s.job = 'thief'; s.jobLevel = 40; s.job2 = 'rogue'; s.job2Level = 50; s.job3 = 'stalker'; s.job3Level = 30
  for (let i = 0; i < 3; i++) addCard(s, 'card_wolf')
  const r = makeJewel(s, ['card_wolf', 'card_wolf', 'card_wolf'], () => 0)
  assert.ok(r.ok); if (!r.ok) return
  assert.ok(socketJewel(s, 'aw_sk_sock', r.jewel.id))
  s.passiveNodes = pathTo('aw_sk_sock').reduce((acc, id) => allocatePassive('thief', acc, id, 99, STALKER), [] as string[])
  assert.equal(activeJewels(s).length, 1)
  s.job2 = 'mobster' // Stalker parked
  assert.equal(activeJewels(s).length, 0)
})
