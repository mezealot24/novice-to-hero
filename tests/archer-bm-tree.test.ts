import test from 'node:test'
import assert from 'node:assert/strict'
import { branches2Of, branchesOf, lockReason, nodesOf, talents2Of, TREE, TREE2, TREE_RULES, type TreeNode, type TreeSave } from '../src/data/tree'
import type { Stats } from '../src/data/game-data'

const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}
const { load, migrateBeastmasterRework, newSave, setSave, wipe } = await import('../src/save')

// v82 point pools (plan): Archer = 48 class points, Beastmaster = 49 job2 points
const ARCHER_POOL = 48, BM_POOL = 49

const archerNodes = branchesOf('archer').flatMap((b) => nodesOf(b.id))
const bmNodes = branches2Of('beastmaster').flatMap((b) => nodesOf(b.id))
const isStar = (n: TreeNode) => n.tier === 4 && !n.kind

/** Sum of max over the web, minus what can't be spent: ★ over the cap, and the 2 unpicked Skill 2 sets. */
function spendable(nodes: TreeNode[]) {
  const s2Roots = nodes.filter((n) => n.kind === 's2root').length
  const s2Set = (n: TreeNode) => n.kind === 's2root' || n.kind === 's2plus' || n.kind === 's2star'
  const s2PerSet = s2Roots ? nodes.filter(s2Set).reduce((a, n) => a + n.max, 0) / s2Roots : 0
  const stars = nodes.filter(isStar)
  const blocked = Math.max(0, stars.length - TREE_RULES.capstones)
  return nodes.filter((n) => !s2Set(n)).reduce((a, n) => a + n.max, 0) + s2PerSet - blocked
}

test('spendable points stay above the pool (forced ★ choice)', () => {
  // v83 stretch (1->3 / 2->4 / 3->5, "+" 3->5): was 53 / 54
  assert.equal(spendable(archerNodes), 79)
  assert.equal(spendable(bmNodes), 82)
  assert.ok(spendable(archerNodes) >= ARCHER_POOL)
  assert.ok(spendable(bmNodes) >= BM_POOL)
})

test('no duplicate ids, no duplicate names inside the Archer web', () => {
  const ids = [...TREE, ...TREE2].map((n) => n.id)
  assert.equal(new Set(ids).size, ids.length)
  const names = archerNodes.map((n) => n.name)
  assert.deepEqual(names.filter((x, i) => names.indexOf(x) !== i), [])
})

test('Archer has 4 ★, Beastmaster 5 ★, a 3rd ★ is refused', () => {
  assert.equal(archerNodes.filter(isStar).length, 4)
  assert.equal(bmNodes.filter(isStar).length, 5)
  // Archer: ★ in archer_a + archer_b, then try archer_c4
  const t: TreeSave = {}
  for (const b of ['archer_a', 'archer_b', 'archer_c']) for (const n of nodesOf(b)) t[n.id] = n.max
  delete t.archer_c4
  t.archer_s1p = 1; t.archer_ultp = 1
  const c4 = archerNodes.find((n) => n.id === 'archer_c4')!
  assert.match(lockReason(t, 'archer', c4), /★/)
  delete t.archer_b4
  assert.equal(lockReason(t, 'archer', c4), '')
  // Beastmaster: ★ in bm_h + bm_k, then try bm_s4
  const u: TreeSave = {}
  for (const b of ['bm_h', 'bm_k', 'bm_s']) for (const n of nodesOf(b)) u[n.id] = n.max
  delete u.bm_s4
  const s4 = bmNodes.find((n) => n.id === 'bm_s4')!
  assert.match(lockReason(u, 'archer', s4, 'beastmaster'), /★/)
  delete u.bm_k4
  assert.equal(lockReason(u, 'archer', s4, 'beastmaster'), '')
})

test('new branches hang under the right line', () => {
  const line = (id: string) => branchesOf('archer').find((b) => b.id === id)?.line
  assert.equal(line('archer_c'), 's1')
  assert.equal(line('archer_d'), 'ult')
  assert.equal(archerNodes.find((n) => n.id === 'archer_c1')?.parent, 'archer_s1p')
  assert.equal(archerNodes.find((n) => n.id === 'archer_d1')?.parent, 'archer_ultp')
  assert.equal(archerNodes.find((n) => n.id === 'archer_a1')?.name, 'สายตาพราน')
})

test('each new node sets its field (Archer + Beastmaster Rework v2.1 20 nodes & 12 talents)', () => {
  const want: Record<string, (keyof Stats)[]> = {
    archer_c1: ['arPoisonArrow'], archer_c2: ['vsPoison'], archer_c3: ['arRicochet'], archer_c4: ['poisonSpread', 'arPoisonS2'],
    archer_d1: ['arMark'], archer_d2: ['arMarkJump'], archer_d3: ['arKillCd'], archer_d4: ['arExecute'],
    bm_h1: ['j2HawkChance', 'hit', 'j2MarkPierceFlee'], bm_h2: ['j2HawkMul', 'j2HawkIntAdd', 'j2PreyMarkAdd'],
    bm_h3: ['j2HawkHits', 'j2Gust'], bm_h4: ['j2HawkEvo', 'crit'],
    bm_b1: ['j2BoarHp', 'j2BoarShare', 'j2BoarCut'], bm_b2: ['j2BoarMul', 'j2BoarRageK'],
    bm_b3: ['j2BoarShield', 'j2BoarGuardDr'], bm_b4: ['j2BoarEvo', 'j2BoarDownCut'],
    bm_w1: ['j2WolfMul', 'j2WolfPierceBleed'], bm_w2: ['j2WolfBleed', 'j2BleedDmg'],
    bm_w3: ['j2WolfSpeed', 'j2Frenzy'], bm_w4: ['j2WolfEvo'],
    bm_k1: ['j2PetPow', 'j2PetStatScale'], bm_k2: ['j2PetRes', 'j2WolfRallyStep'],
    bm_k3: ['j2CmdCut'], bm_k4: ['j2Pack3'],
    bm_s1: ['j2PackLead'], bm_s2: ['j2PetHeal', 'j2PetHealLow'],
    bm_s3: ['j2Roar', 'j2RoarWeaken'], bm_s4: ['j2CritPet'],
  }
  const all = [...archerNodes, ...bmNodes]
  for (const [id, keys] of Object.entries(want)) {
    const n = all.find((x) => x.id === id)
    assert.ok(n, id)
    for (let lv = 1; lv <= n.max; lv++) {
      const m = n.mod(lv)
      for (const k of keys) assert.ok((m[k] ?? 0) > 0, `${id} lv${lv} ${k}`)
      assert.ok(n.desc(lv).length > 0)
    }
    if (n.max > 1) {
      for (const k of keys) {
        if (k === 'j2PetHealLow') continue // flat flag 1 across levels
        assert.ok((n.mod(n.max)[k] ?? 0) > (n.mod(1)[k] ?? 0), `${id} ${k} grows`)
      }
    }
  }
  // Conditional Lv >= 3 thresholds on bm_h2 (j2PreyTurns) and bm_k3 (j2CmdHawkAdd)
  const h2 = bmNodes.find((x) => x.id === 'bm_h2')!
  const k3 = bmNodes.find((x) => x.id === 'bm_k3')!
  assert.equal(h2.mod(1).j2PreyTurns ?? 0, 0)
  assert.equal(h2.mod(h2.max).j2PreyTurns, 1)
  assert.equal(k3.mod(1).j2CmdHawkAdd ?? 0, 0)
  assert.equal(k3.mod(k3.max).j2CmdHawkAdd, 1)

  // Rework v2.1: 12 Beastmaster talents (bm_t1_*..bm_t4_*)
  const talents = [1, 2, 3, 4].flatMap((row) => talents2Of('beastmaster', row))
  assert.equal(talents.length, 12)
  assert.deepEqual(
    talents.map((t) => t.id),
    [
      'bm_t1_pet', 'bm_t1_hit', 'bm_t1_crit',
      'bm_t2_ult', 'bm_t2_lead', 'bm_t2_heal',
      'bm_t3_cmd', 'bm_t3_cut', 'bm_t3_res',
      'bm_t4_hawk', 'bm_t4_boar', 'bm_t4_wolf',
    ],
  )
  const blitzStorm = talents.find((t) => t.id === 'bm_t4_hawk')!
  assert.equal(blitzStorm.max, 2)
  assert.deepEqual(blitzStorm.mod(2), { j2HawkBonusHits: 2, j2HawkMul: 0.2, j2HawkChance: 0.08, j2HawkCritShare: 0.5 })
})

test('migrateBeastmasterRework: upgrades legacy and bmRework=1 saves to bmRework=2 once, idempotent, skips other jobs & resets invalid pet', () => {
  // Legacy save (bmRework undefined)
  const legacy = { ...newSave('t', 'human'), bmRework: undefined, job: 'archer' as const, job2: 'beastmaster' as const, job2Points: 1, job2Tree: { bm_h1: 2, bm_k4: 1 } }
  migrateBeastmasterRework(legacy)
  assert.equal(legacy.bmRework, 2)
  assert.equal(legacy.job2Points, 4)
  assert.deepEqual(legacy.job2Tree, {})

  // v1 rework save (bmRework === 1) upgrades to 2 and refunds points
  const v1 = { ...newSave('t', 'human'), bmRework: 1 as const, job: 'archer' as const, job2: 'beastmaster' as const, job2Points: 2, job2Tree: { bm_b1: 3, bm_s4: 1 } }
  migrateBeastmasterRework(v1)
  assert.equal(v1.bmRework, 2)
  assert.equal(v1.job2Points, 6)
  assert.deepEqual(v1.job2Tree, {})

  // idempotent once bmRework === 2
  v1.job2Tree = { bm_h1: 1 }
  migrateBeastmasterRework(v1)
  assert.equal(v1.job2Points, 6)
  assert.deepEqual(v1.job2Tree, { bm_h1: 1 })

  // other job2 untouched
  const other = { ...newSave('t', 'human'), bmRework: 1 as const, job: 'archer' as const, job2: 'innovator' as const, job2Points: 1, job2Tree: { in_t1: 2 } }
  migrateBeastmasterRework(other)
  assert.equal(other.bmRework, 2)
  assert.equal(other.job2Points, 1)
  assert.deepEqual(other.job2Tree, { in_t1: 2 })

  // load() resets invalid pet while preserving valid pets
  wipe()
  const badPet = { ...newSave('t', 'human'), job: 'archer' as const, job2: 'beastmaster' as const, pet: 'dragon' as never }
  localStorage.setItem('novice-to-hero.save.v1', JSON.stringify(badPet))
  const loadedBad = load()!
  assert.equal(loadedBad.pet, undefined)
  assert.equal(loadedBad.bmRework, 2)

  wipe()
  const goodPet = { ...newSave('t', 'human'), job: 'archer' as const, job2: 'beastmaster' as const, pet: 'wolf' as const }
  localStorage.setItem('novice-to-hero.save.v1', JSON.stringify(goodPet))
  const loadedGood = load()!
  assert.equal(loadedGood.pet, 'wolf')
  wipe()
  setSave(newSave('t', 'human'))
})
