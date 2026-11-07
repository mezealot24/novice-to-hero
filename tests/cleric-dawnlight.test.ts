// v86 Cleric web 🌄 รุ่งอรุณ (Q 2026-11-06): replaces the ⛪ ฟื้นคืน branch under Ult. Talents row II unchanged. Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { heroStats } from '../src/data/meta'
import { clericUltSmash, dawnBonus } from '../src/data/skill-math'
import { branchesOf, nodesOf, talentFree, talentsOf } from '../src/data/tree'
import { migrateClericDawn, migrateDawnBurst, newSave } from '../src/save'

const base = { race: 'human', stats: { str: 5, vit: 5, wis: 5, dex: 5, int: 5, luk: 5, agi: 5 }, equipped: {}, skills: {}, job: 'cleric', jobLevel: 40 } as never
const tree = (jobTree: Record<string, number>) => ({ ...(base as object), jobTree }) as never

test('the Ult branch cleric_d is now รุ่งอรุณ with 4 nodes (5 / 5 / 3 / ★1, v102 แสงแตก max 3); talent row II is back to 3 picks', () => {
  const b = branchesOf('cleric').find((x) => x.id === 'cleric_d')!
  assert.equal(b.name, 'รุ่งอรุณ')
  assert.deepEqual(nodesOf('cleric_d').map((n) => `${n.id}:${n.max}`), ['cleric_dn1:5', 'cleric_dn2:5', 'cleric_dn3:3', 'cleric_dn4:1'])
  assert.deepEqual(talentsOf('cleric', 2).map((x) => x.id), ['cleric_t2_regen', 'cleric_t2_holy', 'cleric_t2_wing'])
})

test('v93 full branch numbers: bonus share 200%, heal 30%, v102 แสงแตก WIS +35% 5 turns, ★ sure crit +50% crit dmg', () => {
  const st = heroStats(tree({ cleric_ultp: 1, cleric_dn1: 5, cleric_dn2: 5, cleric_dn3: 3, cleric_dn4: 1 }))
  assert.ok(Math.abs(st.clDawn - 2) < 1e-9)
  assert.ok(Math.abs(st.clDawnHeal - 0.3) < 1e-9)
  assert.ok(Math.abs(st.clDawnWis - 0.35) < 1e-9); assert.equal(st.clDawnWisTurns, 5)
  assert.equal(st.clDawnUlt, 1)
  assert.ok(Math.abs(st.clDawnCrit - 0.5) < 1e-9)
  const lv1 = heroStats(tree({ cleric_ultp: 1, cleric_dn1: 1 }))
  assert.ok(Math.abs(lv1.clDawn - 0.4) < 1e-9) // Lv 1 of 5 = old 0.6 x 2/3 (v93)
})

test('v92 Ult smash = 150% + 50%/Lv P.ATK; dawn bonus = (STR + WIS + 10% M.ATK) x share', () => {
  const lv = (n: number) => clericUltSmash(heroStats(tree({ cleric_ultp: n })))
  assert.ok(Math.abs(lv(1) - 2) < 1e-9)
  assert.ok(Math.abs(lv(5) - 4) < 1e-9)
  const st = { ...heroStats(tree({ cleric_ultp: 1 })), matk: 100, clDawn: 1 }
  assert.equal(dawnBonus(st, 50, 50), 110) // Q's example
  assert.equal(dawnBonus({ ...st, clDawn: 0 }, 50, 50), 0)
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
  assert.match(JOBS.cleric.ult.desc, /^Mana \d+–\d+ \(ตาม Lv Ult\):/)
})

test('v86 Crusader / Monk ults stay Mana-free (Grand Cross pays HP, Tempest Bell is free)', async () => {
  const { JOB2 } = await import('../src/data/jobs2')
  assert.equal(JOB2.crusader.ult.cost, 0)
  assert.equal(JOB2.monk.ult.cost, 0)
})

test('v86 💠 แก่นศรัทธา core column: free tier-0 nodes, STR/WIS, Mana regen, INT -> STR, Mana guard', async () => {
  const { totalBase } = await import('../src/data/meta')
  const { lockReason } = await import('../src/data/tree')
  const core = nodesOf('cleric_core')
  assert.deepEqual(core.map((n) => `${n.id}:${n.max}`), ['cleric_core1:5', 'cleric_core2:3', 'cleric_core3:5'])
  assert.equal(branchesOf('cleric').find((b) => b.id === 'cleric_core')?.line, 'core')
  for (const n of core) assert.equal(lockReason({}, 'cleric', n), '', `${n.id} is free to learn`)
  const S = { race: 'human', stats: { str: 40, vit: 10, wis: 30, dex: 1, int: 21, luk: 1, agi: 1 }, equipped: {}, skills: {}, job: 'cleric', jobLevel: 40 }
  const b0 = totalBase(S as never), b1 = totalBase({ ...S, jobTree: { cleric_core1: 5 } } as never), b2 = totalBase({ ...S, jobTree: { cleric_core2: 3 } } as never)
  assert.equal(b1.str - b0.str, 15); assert.equal(b1.wis - b0.wis, 15) // จิตสงบ Lv5
  assert.equal(b2.str - b0.str, Math.floor(b0.int / 5)) // ศรัทธาสู่กาย Lv3: every 5 INT
  assert.equal(b2.vit - b0.vit, Math.floor(b0.wis / 5)) // v102: + every 5 WIS = VIT +1
  const b2a = totalBase({ ...S, jobTree: { cleric_core2: 1 } } as never)
  assert.equal(b2a.vit - b0.vit, Math.floor(b0.wis / 7)); assert.equal(b2a.str - b0.str, Math.floor(b0.int / 7))
  const r0 = heroStats(S as never).resRegen, r1 = heroStats({ ...S, jobTree: { cleric_core1: 5 } } as never).resRegen
  assert.ok(r1 > r0)
  const g = heroStats({ ...S, jobTree: { cleric_core3: 5 } } as never)
  assert.ok(Math.abs(g.clManaGuard - 0.15) < 1e-9); assert.equal(g.clManaHeal, 0.2); assert.ok(Math.abs(g.clManaShield - 0.25) < 1e-9)
  assert.equal(totalBase({ ...S, job: 'mage', jobTree: { cleric_core1: 5 } } as never).str, b0.str) // other classes ignore it
})

test('v102 ☀️ แสงแตก: max 3 (not stretched), WIS +25/30/35% for 3/4/5 turns; old points above 3 refund', () => {
  const n = nodesOf('cleric_d').find((x) => x.id === 'cleric_dn3')!
  assert.equal(n.max, 3)
  assert.deepEqual([1, 2, 3].map((lv) => n.mod(lv)), [{ clDawnWis: 0.25, clDawnWisTurns: 3 }, { clDawnWis: 0.3, clDawnWisTurns: 4 }, { clDawnWis: 0.35, clDawnWisTurns: 5 }])
  assert.match(n.desc(2), /WIS = 30% ของดาเมจแสงรุ่งอรุณ\/ตัว 4 เทิร์น/)
  const s = newSave('t', 'human')
  s.job = 'cleric'; s.skillPoints = 0; s.jobTree = { cleric_ultp: 1, cleric_dn1: 1, cleric_dn2: 1, cleric_dn3: 5 }
  migrateDawnBurst(s)
  assert.equal(s.jobTree.cleric_dn3, 3); assert.equal(s.skillPoints, 2)
  migrateDawnBurst(s); assert.equal(s.skillPoints, 2) // once
})

test('v102 Cleric Ult Mana 30/35/40/45/50 by Ult node Lv; Crusader / Monk ults stay free', async () => {
  const { JOBS } = await import('../src/data/jobs')
  const { ultCost } = await import('../src/data/skill-math')
  const { JOB2 } = await import('../src/data/jobs2')
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((lv) => ultCost(JOBS.cleric, heroStats(tree(lv ? { cleric_ultp: lv } : {})))), [30, 30, 35, 40, 45, 50])
  const st5 = heroStats(tree({ cleric_ultp: 5 }))
  assert.equal(ultCost({ ...JOBS.cleric, ult: { ...JOBS.cleric.ult, ...JOB2.crusader.ult } }, st5), 0)
  assert.equal(ultCost(JOBS.mage, st5), JOBS.mage.ult.cost)
})

test('v102 ☀️ แสงแตก WIS = share x Dawn Light bonus/target, shown in the Ult detail rows', async () => {
  const { dawnWisGain, ultInfo } = await import('../src/data/skill-math')
  const st = heroStats(tree({ cleric_ultp: 1, cleric_dn1: 5, cleric_dn2: 1, cleric_dn3: 3 }))
  assert.equal(dawnWisGain(st, 174), 61) // Q's example: 35% of 174
  assert.equal(dawnWisGain({ ...st, clDawnWis: 0 }, 174), 0)
  const row = ultInfo('cleric', st, { str: 50, wis: 50 }).find((x) => x.label.startsWith('☀️'))
  assert.match(row?.value ?? '', /^\+\d+ WIS \(35% ของ \d+\)$/)
})
