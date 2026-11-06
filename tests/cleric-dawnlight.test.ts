// v86 Cleric web 🌄 รุ่งอรุณ (Q 2026-11-06): replaces the ⛪ ฟื้นคืน branch under Ult. Talents row II unchanged. Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { heroStats } from '../src/data/meta'
import { KIT } from '../src/data/skill-math'
import { branchesOf, nodesOf, talentFree, talentsOf } from '../src/data/tree'
import { migrateClericDawn, newSave } from '../src/save'

const base = { race: 'human', stats: { str: 5, vit: 5, wis: 5, dex: 5, int: 5, luk: 5, agi: 5 }, equipped: {}, skills: {}, job: 'cleric', jobLevel: 40 } as never
const tree = (jobTree: Record<string, number>) => ({ ...(base as object), jobTree }) as never

test('the Ult branch cleric_d is now รุ่งอรุณ with 4 nodes (5 / 5 / 5 / ★1); talent row II is back to 3 picks', () => {
  const b = branchesOf('cleric').find((x) => x.id === 'cleric_d')!
  assert.equal(b.name, 'รุ่งอรุณ')
  assert.deepEqual(nodesOf('cleric_d').map((n) => `${n.id}:${n.max}`), ['cleric_dn1:5', 'cleric_dn2:5', 'cleric_dn3:5', 'cleric_dn4:1'])
  assert.deepEqual(talentsOf('cleric', 2).map((x) => x.id), ['cleric_t2_regen', 'cleric_t2_holy', 'cleric_t2_wing'])
})

test('full branch numbers: crit +75%, heal 35%, splash 60%, ★ ult charge', () => {
  const D = KIT.clericTree.dawn
  assert.equal(D.every, 3)
  const st = heroStats(tree({ cleric_ultp: 1, cleric_dn1: 5, cleric_dn2: 5, cleric_dn3: 5, cleric_dn4: 1 }))
  assert.equal(st.clDawn, 1)
  assert.ok(Math.abs(st.clDawnCrit - 0.75) < 1e-9)
  assert.ok(Math.abs(D.heal + st.clDawnHeal - 0.35) < 1e-9)
  assert.ok(Math.abs(st.clDawnSplash - 0.6) < 1e-9)
  assert.equal(st.clDawnUlt, 1)
  const lv1 = heroStats(tree({ cleric_ultp: 1, cleric_dn1: 1 }))
  assert.ok(Math.abs(lv1.clDawnCrit - 0.15) < 1e-9) // Lv 1 of 5 = old 0.6
})

test('save: old ฟื้นคืน points and the dropped talent version come back', () => {
  const s = newSave('t', 'human')
  s.job = 'cleric'; s.jobLevel = 40; s.skillPoints = 1
  s.jobTree = { cleric_ultp: 2, cleric_d1: 3, cleric_d2: 2, cleric_d4: 1 }
  s.jobTalents = { 1: { id: 'cleric_t1_focus', rank: 2 }, 2: { id: 'cleric_t2_dawnlight', rank: 4 } }
  migrateClericDawn(s)
  assert.equal(s.skillPoints, 7)
  assert.deepEqual(s.jobTree, { cleric_ultp: 2 })
  assert.deepEqual(Object.keys(s.jobTalents), ['1'])
  assert.equal(talentFree(s.jobTalents, 40), 6)
})

test('v86 Cleric ult พรคุ้มครอง costs Mana (like Mage / Swordsman)', async () => {
  const { JOBS, CLERIC_KIT } = await import('../src/data/jobs')
  const { ultCost } = await import('../src/data/skill-math')
  assert.equal(ultCost(JOBS.cleric), CLERIC_KIT.ultMana)
  assert.ok(CLERIC_KIT.ultMana > 0)
  assert.match(JOBS.cleric.ult.desc, /^Mana \d+:/)
})

test('v86 Crusader / Monk ults stay Mana-free (Grand Cross pays HP, Tempest Bell is free)', async () => {
  const { JOB2 } = await import('../src/data/jobs2')
  assert.equal(JOB2.crusader.ult.cost, 0)
  assert.equal(JOB2.monk.ult.cost, 0)
})
