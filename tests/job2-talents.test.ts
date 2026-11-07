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
