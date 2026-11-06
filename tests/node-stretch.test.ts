// v83 (Q 2026-11-06): skill-web node levels 1->3 / 2->4 / 3->5 at the SAME full value (data/tree.ts stretchNode).
import test from 'node:test'
import assert from 'node:assert/strict'
import { INT_FIELDS, lockReason, NO_STRETCH, nodeById, TREE, TREE2, TREE_RULES, type TreeNode, type TreeSave } from '../src/data/tree'
import type { Stats } from '../src/data/game-data'
import { SKILL2 } from '../src/data/skill2'
import { migrateNodeStretch, newSave } from '../src/save'
import { tree as swordsman } from '../src/data/trees/swordsman'
import { tree as archer } from '../src/data/trees/archer'
import { tree as mage } from '../src/data/trees/mage'
import { tree as cleric } from '../src/data/trees/cleric'
import { tree as thief } from '../src/data/trees/thief'
import { tree2 as berserker } from '../src/data/trees2/berserker'
import { tree2 as knight } from '../src/data/trees2/knight'
import { tree2 as rogue } from '../src/data/trees2/rogue'
import { tree2 as mobster } from '../src/data/trees2/mobster'
import { tree2 as crusader } from '../src/data/trees2/crusader'
import { tree2 as monk } from '../src/data/trees2/monk'
import { tree2 as wizard } from '../src/data/trees2/wizard'
import { tree2 as sage } from '../src/data/trees2/sage'
import { tree2 as beastmaster } from '../src/data/trees2/beastmaster'
import { tree2 as innovator } from '../src/data/trees2/innovator'

const RAW = new Map<string, TreeNode>(
  [swordsman, archer, mage, cleric, thief, berserker, knight, rogue, mobster, crusader, monk, wizard, sage, beastmaster, innovator]
    .flatMap((c) => [...c.nodes, ...(c.s2Gate ? [c.s2Gate] : [])]).map((n) => [n.id, n]),
)
const ALL = [...TREE, ...TREE2]
const live = (id: string) => ALL.find((n) => n.id === id)
const stretched = ALL.filter((n) => { const r = RAW.get(n.id); return r && r.max !== n.max })

test('every class / ใยชั้น 2 node is either stretched by the rule or kept on purpose', () => {
  assert.ok(stretched.length > 100, `stretched ${stretched.length}`)
  for (const [id, raw] of RAW) {
    const n = live(id)
    assert.ok(n, id)
    const keep = raw.tier === 4 || id in NO_STRETCH || !TREE_RULES.stretch[raw.max] || TREE_RULES.stretch[raw.max] === raw.max
    if (keep) {
      assert.equal(n.max, raw.max, `${id} kept`)
      assert.equal(n.mod, raw.mod, `${id} same formula`)
      assert.equal(n.desc, raw.desc, `${id} same text`)
    } else assert.equal(n.max, TREE_RULES.stretch[raw.max], `${id}: ${raw.max} -> ${TREE_RULES.stretch[raw.max]}`)
  }
  for (const id of Object.keys(NO_STRETCH)) assert.ok(RAW.has(id), `NO_STRETCH ${id} exists`)
  for (const n of ALL.filter((x) => x.kind === 'pow' || x.kind === 'pow2' || x.kind === 's2root' || x.kind === 's2star'))
    assert.equal(n.max, n.kind === 'pow' || n.kind === 'pow2' ? TREE_RULES.powMax : 1, `${n.id} (${n.kind}) not stretched`)
})

test('stretched nodes: full level = the old full value and text', () => {
  for (const n of stretched) {
    const raw = RAW.get(n.id)!
    assert.deepEqual(n.mod(n.max), raw.mod(raw.max), `${n.id} mod(${n.max}) = old mod(${raw.max})`)
    assert.equal(n.desc(n.max), raw.desc(raw.max), `${n.id} desc`)
  }
})

test('every level: finite numbers, readable text, whole INT_FIELDS (>= 1 once learned), never above full', () => {
  for (const n of stretched) {
    const raw = RAW.get(n.id)!, top = raw.mod(raw.max)
    for (let lv = 1; lv <= n.max; lv++) {
      const m = n.mod(lv), d = n.desc(lv)
      assert.ok(!/undefined|NaN/.test(d), `${n.id} L${lv} text: ${d}`)
      for (const k of Object.keys(m) as (keyof Stats)[]) {
        const v = m[k] ?? 0, full = top[k] ?? 0
        assert.ok(Number.isFinite(v), `${n.id} L${lv} ${k}`)
        if (INT_FIELDS.has(k)) {
          assert.ok(Number.isInteger(v), `${n.id} L${lv} ${k}=${v} whole`)
          if ((raw.mod(1)[k] ?? 0) >= 1) assert.ok(v >= 1, `${n.id} L${lv} ${k} >= 1`)
        }
        if (full >= 0) assert.ok(v <= full + 1e-9, `${n.id} L${lv} ${k}=${v} <= full ${full}`)
      }
    }
  }
})

test('Skill 2 "+": 5 levels, Lv 5 = the old Lv 3; ★ needs the "+" at Lv 3', () => {
  assert.equal(TREE_RULES.s2PlusMax, 5)
  for (const k of SKILL2) {
    const p = nodeById(`${k.id}_p`), x = nodeById(`${k.id}_x`)
    assert.ok(p && x, k.id)
    assert.equal(p.max, 5)
    assert.equal(p.mod(5).s2Lv, 3, `${k.id} s2Lv at full`)
    assert.equal(p.desc(5), k.plus.desc(3), `${k.id} text at full`)
    for (let lv = 1; lv <= 5; lv++) assert.ok(!/undefined|NaN/.test(p.desc(lv)), `${k.id}_p L${lv}`)
    const t: TreeSave = { [k.id]: 1, [`${k.id}_p`]: TREE_RULES.s2StarNeed - 1 }
    if (k.job === 'thief') t.thief_core1 = 5
    assert.notEqual(lockReason(t, k.job, x), '', `${k.id} ★ locked at "+" ${TREE_RULES.s2StarNeed - 1}`)
    t[`${k.id}_p`] = TREE_RULES.s2StarNeed
    assert.equal(lockReason(t, k.job, x), '', `${k.id} ★ open at "+" ${TREE_RULES.s2StarNeed}`)
  }
})

test('save migration: both webs refunded once, flag set, idempotent; new saves skip it', () => {
  const s = newSave('t', 'human')
  assert.equal(s.stretch, 1)
  delete s.stretch
  Object.assign(s, { job: 'archer', skillPoints: 2, jobTree: { archer_s1p: 4, archer_a1: 3 }, job2: 'beastmaster', job2Points: 1, job2Tree: { bm_h1: 3, bm_h2: 2 } })
  migrateNodeStretch(s)
  assert.equal(s.skillPoints, 2 + 7)
  assert.equal(s.job2Points, 1 + 5)
  assert.deepEqual(s.jobTree, {})
  assert.deepEqual(s.job2Tree, {})
  assert.equal(s.stretch, 1)
  assert.deepEqual(s.stretchRefund, { skill: 7, job2: 5 })
  s.jobTree = { archer_a1: 5 }
  migrateNodeStretch(s)
  assert.equal(s.skillPoints, 9, 'second run: nothing')
  assert.deepEqual(s.jobTree, { archer_a1: 5 })
  const fresh = newSave('u', 'human')
  fresh.jobTree = { archer_a1: 5 }
  migrateNodeStretch(fresh)
  assert.deepEqual(fresh.jobTree, { archer_a1: 5 })
  assert.equal(fresh.stretchRefund, undefined)
})
