import test from 'node:test'
import assert from 'node:assert/strict'
import { branches2Of, branchesOf, lockReason, nodesOf, TREE, TREE2, TREE_RULES, type TreeNode, type TreeSave } from '../src/data/tree'
import type { Stats } from '../src/data/game-data'

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

test('each new node sets its field', () => {
  const want: Record<string, (keyof Stats)[]> = {
    archer_c1: ['arPoisonArrow'], archer_c2: ['vsPoison'], archer_c3: ['arRicochet'], archer_c4: ['poisonSpread', 'arPoisonS2'],
    archer_d1: ['arMark'], archer_d2: ['arMarkJump'], archer_d3: ['arKillCd'], archer_d4: ['arExecute'],
    bm_k1: ['j2PetPow'], bm_k2: ['j2PetRes'], bm_k3: ['j2CmdCut'], bm_k4: ['j2Pack3'],
    bm_s1: ['j2PackLead'], bm_s2: ['j2PetHeal'], bm_s3: ['j2Roar'], bm_s4: ['j2CritPet'],
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
    if (n.max > 1) for (const k of keys) assert.ok((n.mod(n.max)[k] ?? 0) > (n.mod(1)[k] ?? 0), `${id} ${k} grows`)
  }
})
