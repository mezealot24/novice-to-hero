import test from 'node:test'
import assert from 'node:assert/strict'
import { branches2Of, branchesOf, lockReason, nodesOf, TREE, TREE2, TREE_RULES, type TreeNode, type TreeSave } from '../src/data/tree'
import { PLAYER, type Stats } from '../src/data/game-data'

// v84 point pools (plan): Swordsman 48 class points, Cleric 48, Knight 49 job2 points
const SWORD_POOL = 48, CLERIC_POOL = 48, KNIGHT_POOL = 49

const swordNodes = branchesOf('swordsman').flatMap((b) => nodesOf(b.id))
const clericNodes = branchesOf('cleric').flatMap((b) => nodesOf(b.id))
const knightNodes = branches2Of('knight').flatMap((b) => nodesOf(b.id))
const isStar = (n: TreeNode) => n.tier === 4 && !n.kind

/** Sum of max over the web, minus what can't be spent: ★ over the cap, and the 2 unpicked Skill 2 sets. */
function spendable(nodes: TreeNode[]) {
  const s2Roots = nodes.filter((n) => n.kind === 's2root').length
  const s2Set = (n: TreeNode) => n.kind === 's2root' || n.kind === 's2plus' || n.kind === 's2star'
  const s2PerSet = s2Roots ? nodes.filter(s2Set).reduce((a, n) => a + n.max, 0) / s2Roots : 0
  const blocked = Math.max(0, nodes.filter(isStar).length - TREE_RULES.capstones)
  return nodes.filter((n) => !s2Set(n)).reduce((a, n) => a + n.max, 0) + s2PerSet - blocked
}

test('spendable points stay above the pool (forced ★ choice)', () => {
  assert.equal(spendable(swordNodes), 79)
  assert.equal(spendable(clericNodes), 79)
  assert.equal(spendable(knightNodes), 79)
  assert.ok(spendable(swordNodes) >= SWORD_POOL)
  assert.ok(spendable(clericNodes) >= CLERIC_POOL)
  assert.ok(spendable(knightNodes) >= KNIGHT_POOL)
})

test('no duplicate ids, no duplicate names inside each web', () => {
  const ids = [...TREE, ...TREE2].map((n) => n.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const nodes of [swordNodes, clericNodes, knightNodes]) {
    const names = nodes.map((n) => n.name)
    assert.deepEqual(names.filter((x, i) => names.indexOf(x) !== i), [])
  }
})

test('4 ★ per class web (Knight 5 branches = 5 ★), a 3rd ★ is refused', () => {
  assert.equal(swordNodes.filter(isStar).length, 4)
  assert.equal(clericNodes.filter(isStar).length, 4)
  assert.equal(knightNodes.filter(isStar).length, 5)
  const fill = (branches: string[], skip: string) => {
    const t: TreeSave = {}
    for (const b of branches) for (const n of nodesOf(b)) t[n.id] = n.max
    delete t[skip]
    return t
  }
  // Swordsman: ★ in swordsman_a + swordsman_b, then try swordsman_c4 / swordsman_d4
  const s = fill(['swordsman_a', 'swordsman_b', 'swordsman_c', 'swordsman_d'], 'swordsman_c4')
  delete s.swordsman_d4
  const c4 = swordNodes.find((n) => n.id === 'swordsman_c4')!
  assert.match(lockReason(s, 'swordsman', c4), /★/)
  delete s.swordsman_b4
  assert.equal(lockReason(s, 'swordsman', c4), '')
  // Cleric
  const c = fill(['cleric_a', 'cleric_b', 'cleric_c', 'cleric_d'], 'cleric_dn4')
  delete c.cleric_c4
  const d4 = clericNodes.find((n) => n.id === 'cleric_dn4')!
  assert.match(lockReason(c, 'cleric', d4), /★/)
  delete c.cleric_a4x
  assert.equal(lockReason(c, 'cleric', d4), '')
  // Knight: ★ in kn_p + kn_g, then try kn_r4
  const k = fill(['kn_p', 'kn_g', 'kn_c', 'kn_o', 'kn_r'], 'kn_r4')
  delete k.kn_c4; delete k.kn_o4
  const r4 = knightNodes.find((n) => n.id === 'kn_r4')!
  assert.match(lockReason(k, 'swordsman', r4, 'knight'), /★/)
  delete k.kn_g4
  assert.equal(lockReason(k, 'swordsman', r4, 'knight'), '')
})

test('new branches hang under the right line', () => {
  const line = (job: 'swordsman' | 'cleric', id: string) => branchesOf(job).find((b) => b.id === id)?.line
  assert.equal(line('swordsman', 'swordsman_c'), 's1')
  assert.equal(line('swordsman', 'swordsman_d'), 'ult')
  assert.equal(line('cleric', 'cleric_c'), 's1')
  assert.equal(line('cleric', 'cleric_d'), 'ult')
  assert.equal(swordNodes.find((n) => n.id === 'swordsman_c1')?.parent, 'swordsman_s1p')
  assert.equal(swordNodes.find((n) => n.id === 'swordsman_d1')?.parent, 'swordsman_ultp')
  assert.equal(clericNodes.find((n) => n.id === 'cleric_c1')?.parent, 'cleric_s1p')
  assert.equal(clericNodes.find((n) => n.id === 'cleric_dn1')?.parent, 'cleric_ultp')
  assert.equal(knightNodes.find((n) => n.id === 'kn_o1')?.parent, undefined)
  assert.equal(knightNodes.find((n) => n.id === 'kn_r2')?.parent, 'kn_r1')
  // shipped nodes keep their ids
  for (const id of ['swordsman_a1', 'swordsman_b4', 'cleric_a1', 'cleric_a4x', 'cleric_b4j', 'kn_p1', 'kn_g1', 'kn_c4']) assert.ok(swordNodes.concat(clericNodes, knightNodes).some((n) => n.id === id), id)
})

test('each new node sets its field (default 0, grows with level, readable text)', () => {
  const want: Record<string, (keyof Stats)[]> = {
    swordsman_c1: ['swFlow'], swordsman_c2: ['swFlowMana'], swordsman_c3: ['swFlowCrit'], swordsman_c4: ['swFlowStar'],
    swordsman_d1: ['swBreak'], swordsman_d2: ['swBreakLeech'], swordsman_d3: ['swBreakSpread'], swordsman_d4: ['swShatter'],
    cleric_c1: ['clFaith'], cleric_c2: ['clFaithOver'], cleric_c3: ['clFaithHeal'], cleric_c4: ['clOverBurst'],
    cleric_dn1: ['clDawnCrit'], cleric_dn2: ['clDawnHeal'], cleric_dn3: ['clDawnSplash'], cleric_dn4: ['clDawnUlt'], // v86 🌄 รุ่งอรุณ
    kn_o1: ['j2Banner'], kn_o2: ['j2Provoke'], kn_o3: ['j2BannerKill'], kn_o4: ['j2BannerAura', 'j2Guard'],
    kn_r1: ['j2Sweep'], kn_r2: ['j2SweepPush'], kn_r3: ['j2SweepGauge'], kn_r4: ['j2SweepStar'],
  }
  const all = [...swordNodes, ...clericNodes, ...knightNodes]
  for (const [id, keys] of Object.entries(want)) {
    const n = all.find((x) => x.id === id)
    assert.ok(n, id)
    for (const k of keys) if (k !== 'j2Guard') assert.equal(PLAYER[k], 0, `${k} defaults to 0`)
    for (let lv = 1; lv <= n.max; lv++) {
      const m = n.mod(lv), d = n.desc(lv)
      for (const k of keys) assert.ok((m[k] ?? 0) > 0, `${id} lv${lv} ${k}`)
      assert.ok(d.length > 0 && !/undefined|NaN/.test(d), `${id} lv${lv} text: ${d}`)
    }
    if (n.max > 1) for (const k of keys) assert.ok((n.mod(n.max)[k] ?? 0) > (n.mod(1)[k] ?? 0), `${id} ${k} grows`)
  }
})

test('stretched levels: 3 -> 5, ★ stays 1', () => {
  for (const id of ['swordsman_c1', 'swordsman_d3', 'cleric_c2', 'cleric_dn3', 'kn_o2', 'kn_r1']) {
    const n = [...swordNodes, ...clericNodes, ...knightNodes].find((x) => x.id === id)!
    assert.equal(n.max, 5, id)
  }
  for (const id of ['swordsman_c4', 'swordsman_d4', 'cleric_c4', 'cleric_dn4', 'kn_o4', 'kn_r4']) {
    const n = [...swordNodes, ...clericNodes, ...knightNodes].find((x) => x.id === id)!
    assert.equal(n.max, 1, id)
  }
})
