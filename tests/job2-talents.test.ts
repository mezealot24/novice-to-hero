// v119 (Q 2026-11-08): ทาเลนต์ชั้น 2 for every 2nd job + Crusader nodes under Grand Cross / Holy Cross. Run: node tools/test.mjs job2-talents
import test from 'node:test'
import assert from 'node:assert/strict'
import { JOB2 } from '../src/data/jobs2'
import type { Job2Id } from '../src/data/jobs2'
import { PLAYER as BASE_STATS } from '../src/data/game-data'
import { lockReason, nodeById, nodesOf, talent2Mods, talents2Of, TALENTS, TALENTS2, tree2Mods } from '../src/data/tree'
import { KIT2 } from '../src/data/skill-math'

test('every 2nd job has 4 talent rows x 3 picks, ids unique (save data)', () => {
  for (const j2 of Object.keys(JOB2) as Job2Id[])
    for (const row of [1, 2, 3, 4]) assert.equal(talents2Of(j2, row).length, 3, `${j2} row ${row}`)
  const ids = [...TALENTS, ...TALENTS2].map((t) => t.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('talent stats are real Stats fields with a number at every rank', () => {
  for (const t of TALENTS2) for (let r = 1; r <= t.max; r++)
    for (const [k, v] of Object.entries(t.mod(r))) {
      assert.ok(k in BASE_STATS, `${t.id}: ${k}`)
      assert.ok(typeof v === 'number' && Number.isFinite(v) && v > 0, `${t.id} r${r} ${k}`)
    }
})

test('2nd-job talent rows open by Job2 Lv and only for their own 2nd job', () => {
  const pick = { '1': { id: 'cr_t1_hp', rank: 2 }, '4': { id: 'cr_t4_heal', rank: 1 } }
  assert.deepEqual(talent2Mods(pick, 'crusader', 10), [{ j2HpPct: 0.07 }])
  assert.equal(talent2Mods(pick, 'crusader', 30).length, 2)
  assert.equal(talent2Mods(pick, 'knight', 50).length, 0)
})

test('Crusader: Guardian Angel line hangs under Grand Cross, VIT stacks under Holy Cross', () => {
  assert.equal(nodeById('cr_u1')?.parent, 'crusader_u2p')
  assert.equal(nodeById('cr_u2')?.parent, 'cr_u1')
  assert.equal(nodeById('cr_h1')?.parent, 'crusader_s3p')
  assert.ok(nodesOf('crusader_u2').some((n) => n.id === 'cr_u3'))
  const t: Record<string, number> = {}
  assert.notEqual(lockReason(t, 'cleric', nodeById('cr_u1')!, 'crusader'), '') // needs Grand Cross first
  t.crusader_u2p = 1
  assert.equal(lockReason(t, 'cleric', nodeById('cr_u1')!, 'crusader'), '')
  t.cr_u1 = 5; t.cr_h1 = 5
  const mods = tree2Mods(t, 'crusader')
  assert.ok(mods.some((m) => m.j2GcAngel === 0.05))
  assert.ok(mods.some((m) => m.j2HcVit === 25))
})

test('Grand Cross no longer carries its own spell vamp', () => {
  assert.equal('gcVamp' in KIT2.crusader, false)
  assert.ok(!JOB2.crusader.ult.desc.includes('ดูดเลือด'))
})

test('Berserker: ★ ไม่รู้สึกเจ็บ grants j2IgnorePain and j2RageTurn: 5, config matches 3 turns / 2 turns 30%', () => {
  const node = nodeById('bz_r4')
  assert.ok(node, 'bz_r4 exists')
  assert.equal(node.mod(1).j2IgnorePain, 1)
  assert.equal(node.mod(1).j2RageTurn, 5)
  assert.ok(node.desc(1).includes('3 เทิร์น'))
  assert.ok(node.desc(1).includes('30%/เทิร์น'))
  assert.equal(KIT2.berserker.ignorePainTurns, 3)
  assert.equal(KIT2.berserker.ignorePainRegenTurns, 2)
  assert.equal(KIT2.berserker.ignorePainRegenPct, 0.3)
})

test('Wave 2 Knight & Berserker tree2 nodes: bz_c1/c3/d2/d3/r1 and kn_g2/r1', () => {
  const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)

  const c1 = nodeById('bz_c1')!
  assert.equal(Object.keys(c1.mod(1))[0], 'crit')
  near(c1.mod(c1.max).crit ?? 0, 0.09)
  near(c1.mod(c1.max).skillCrit ?? 0, 0.06)

  const c3 = nodeById('bz_c3')!
  assert.equal(c3.mod(c3.max).j2FrenzyMax, 3)
  near(c3.mod(c3.max).combo ?? 0, 0.15)
  near(c3.mod(c3.max).comboDmg ?? 0, 0.15)

  const d2 = nodeById('bz_d2')!
  near(d2.mod(d2.max).aspd ?? 0, 0.192)
  near(d2.mod(d2.max).s3Pow ?? 0, 0.15)

  const d3 = nodeById('bz_d3')!
  assert.equal(d3.mod(d3.max).def, 9)
  near(d3.mod(d3.max).tenacity ?? 0, 0.15)
  near(d3.mod(d3.max).basicDmg ?? 0, 0.18)

  const r1 = nodeById('bz_r1')!
  near(r1.mod(r1.max).rageGain ?? 0, 0.3)
  assert.equal(r1.mod(r1.max).startRage, 30)

  const g2 = nodeById('kn_g2')!
  near(g2.mod(g2.max).j2DefAtk ?? 0, 0.2 * 3) // 0.20 per oldLv (old max 3 stretched to 5)

  const knR1 = nodeById('kn_r1')!
  assert.equal(KIT2.knight.tree.sweepEvery, 2)
  assert.equal(KIT2.knight.tree.sweep, 0.6)
  near(knR1.mod(knR1.max).j2Sweep ?? 0, 0.6 * 3)
  assert.ok(knR1.desc(knR1.max).includes('ทุก 2 เทิร์น'))
})
