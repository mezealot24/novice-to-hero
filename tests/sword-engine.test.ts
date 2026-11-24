// Q 2026-11-24 "ปรับ Engine เกี่ยวกับ Skills Swordman ทั้งหมด ให้สามารถปรับแต่งแก้ไขตัวเลขได้": every number of the Swordsman line is
// whitelisted in the admin (skills / kit tables), patches reach the game, and the dead ฟันพายุ / v84 จังหวะดาบ numbers are gone.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TABLES, type TableId } from '../src/data/tunables'
import { applyPatch } from '../src/data/patch'
import { JOBS, SWORD_MANA, SWORD_S1, swordCoatFlat, swordS1Raw } from '../src/data/jobs'
import { KIT, KIT2, KIT3, swordS1ExcessPow, ultInfo } from '../src/data/skill-math'
import { PLAYER as STATS0 } from '../src/data/stats'
import { JOB2 } from '../src/data/jobs2'
import { CLASS1_LVS, job2Layout } from '../src/data/skill-registry'
import { explainField } from '../src/admin/explain'

const match = (pat: string, path: string) => {
  const ps = pat.split('.'), xs = path.split('.')
  return ps.length === xs.length && ps.every((p, i) => p === '*' || p.split('|').includes(xs[i]))
}
const listed = (t: TableId, path: string) => TABLES[t].fields.some(([p]) => match(p, path))
function leaves(o: unknown, pre: string, out: string[] = []): string[] {
  if (typeof o === 'number') out.push(pre)
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) leaves(v, pre ? `${pre}.${k}` : k, out)
  return out
}

test('every Swordsman-line number is editable in the admin (Skill 3 Mana / CD of KIT2 are tuned on JOB2 instead)', () => {
  const miss: string[] = []
  const need = (t: TableId, paths: string[]) => { for (const p of paths) if (!listed(t, p)) miss.push(`${t}:${p}`) }
  need('skills', leaves(SWORD_MANA, 'sword'))
  need('skills', leaves(SWORD_S1, 'swordS1'))
  need('kit', Object.keys(KIT).filter((k) => k.startsWith('sword')).flatMap((k) => leaves((KIT as Record<string, unknown>)[k], k)))
  for (const id of ['knight', 'berserker'] as const) need('skills', leaves(KIT2[id], `kit2.${id}`).filter((p) => !/(Cost|Cd)$/.test(p)))
  for (const id of ['lordknight', 'warlord'] as const) need('skills', leaves(KIT3[id], `kit3.${id}`))
  need('skills', ['job2.knight.skill3.cost', 'job2.knight.skill3.cd', 'job2.berserker.skill3.cost', 'job2.berserker.autoCost'])
  assert.deepEqual(miss, [])
})

test('the per-Lv tables cover the class-1 cap (15) and every new ref has a hand-written label + Thai effect', () => {
  assert.equal(SWORD_S1.atkPct.length, CLASS1_LVS)
  assert.equal(SWORD_MANA.awakenStr.length, CLASS1_LVS)
  for (const id of ['knight', 'berserker'] as const) {
    const l = job2Layout(id)
    assert.ok(l.j3.length > 10, `${id}: Awakening column`)
    for (const r of [...l.s1, ...l.s4, ...l.j3]) {
      const key = r.path.split('.').slice(2).join('.')
      assert.ok(r.label !== key && !r.label.endsWith(`· ${key}`), `${r.path}: hand-written label, got "${r.label}"`)
      assert.ok(explainField(r.table, r.path, { defaultLabel: r.label }).effect.length > 10, `${r.path}: effect`)
    }
  }
  assert.equal(job2Layout('knight').s4.length, Object.keys(KIT2.knight.s4).length)
  assert.equal(job2Layout('knight').other.some((r) => r.path.includes('.s4.')), false)
  assert.deepEqual(job2Layout('berserker').s1.map((r) => r.path), ['job2.berserker.autoCost'])
})

test('patches reach the game: ดาบสยบมนตร์ Lv 3, ปลุกดาบ STR, Spiral Pierce cost / cd / unlock, Berserker Rage cost, Lord Knight hits', () => {
  const raw = swordS1Raw(3, 100, 0, 1)
  const r = applyPatch({
    skills: { 'swordS1.atkPct.2': 5, 'sword.awakenStr.9': 200, 'kit2.knight.s4.cost': 33, 'kit2.knight.s4.cd': 7, 'kit2.knight.s4.unlockLv': 25, 'job2.berserker.autoCost': 12, 'kit3.lordknight.extraHits': 4 },
    kit: { 'swordCore.vitPer': 9 },
  })
  assert.equal(r.ok, true, JSON.stringify(r.errors))
  assert.equal(r.skipped.length, 0, JSON.stringify(r.skipped))
  assert.ok(swordS1Raw(3, 100, 0, 1) > raw)
  assert.equal(SWORD_MANA.awakenStr[9], 200)
  assert.deepEqual([JOB2.knight.skill4!.cost, JOB2.knight.skill4!.cd, JOB2.knight.skill4!.unlockLv], [33, 7, 25]) // getters read KIT2.knight.s4
  assert.equal(JOB2.berserker.autoCost, 12)
  assert.equal(KIT3.lordknight.extraHits, 4)
  assert.equal(KIT.swordCore.vitPer, 9)
  r.revert()
  assert.deepEqual([JOB2.knight.skill4!.cost, JOB2.knight.skill4!.cd], [15, 3])
})

test('cleanup: the dead ฟันพายุ / v84 จังหวะดาบ / Ult shield numbers are gone, old live paths are skipped not rejected', () => {
  assert.equal((KIT as Record<string, unknown>).swordTree, undefined)
  assert.equal('waveAmp' in KIT.swordUltTree, false)
  for (const k of ['auto', 'autoMul', 'ultShield']) assert.equal(k in SWORD_MANA, false, k)
  const r = applyPatch({ skills: { 'sword.ultShield': 0.3, 'sword.autoMul': 2 } })
  assert.equal(r.ok, true)
  assert.equal(r.skipped.length, 2)
  r.revert()
})

test('Wave 1 helpers & balance constants: swordCoatFlat, swordS1ExcessPow, cleaveAdd, swordUltTree, Berserker ultInfo', () => {
  const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`)

  // swordCoatFlat: non-cap vs P.ATK cap, boss 0.5x, multi-hit 0.5x
  near(swordCoatFlat(1, 0, 1000, 100, false, false), 25) // 2.5% * 1000 = 25 (< 125 cap)
  near(swordCoatFlat(1, 0, 100000, 100, false, false), 125) // capped at 1.25 * 100 P.ATK
  near(swordCoatFlat(1, 0, 1000, 100, true, false), 12.5) // boss 0.5x on uncapped
  near(swordCoatFlat(1, 0, 100000, 100, true, false), 62.5) // boss 0.5x on cap
  near(swordCoatFlat(1, 0, 100000, 100, false, true), 62.5) // multi-hit 0.5x on cap
  near(swordCoatFlat(1, 0, 100000, 100, true, true), 31.25) // boss + multi-hit 0.5x

  // swordS1ExcessPow: base tree s1Pow vs excess s1Pow
  near(swordS1ExcessPow({ s1Pow: 0, swS1Lv: 5 }), 1)
  near(swordS1ExcessPow({ s1Pow: 0.6, swS1Lv: 5 }), 1) // 0.12 * 5 = 0.6 -> no excess
  near(swordS1ExcessPow({ s1Pow: 0.85, swS1Lv: 5 }), 1.25) // +0.25 excess beyond Lv 5

  // Balance constants
  near(JOBS.swordsman.mod.cleaveAdd ?? 0, 0.1)
  near(KIT.swordUltTree.awAtk, 0.15)
  near(KIT.swordUltTree.execAdd, 0.12)
  near(KIT.swordUltTree.rampageWaveShield, 0.15)

  // ultInfo for Berserker: swExecAdd is active (not gated to 0) + a1..a4 บ้าระห่ำ rows
  const zerkBase = ultInfo('swordsman', { ...STATS0, swExecAdd: 0 }, undefined, 'berserker')
  const zerkBuffed = ultInfo('swordsman', {
    ...STATS0,
    swExecAdd: 0.6,
    swAwDr: 0.25,
    swAwLeech: 0.15,
    swAwCtr: 0.3,
    swWaveShield: 1,
    swAwCleave: 0.5,
  }, undefined, 'berserker')
  const execVal = (rows: ReturnType<typeof ultInfo>) => rows.find((r) => r.label === '⚖️ execute เป้า HP ≤25%')?.value
  assert.equal(execVal(zerkBase), '×1.38')
  assert.equal(execVal(zerkBuffed), '×1.52')
  for (const label of [
    '🛡️ บ้าระห่ำ: โดนเบาลง',
    '🩸 บ้าระห่ำ: ดูดเลือด',
    '🔁 บ้าระห่ำ: สวนกลับ',
    '🌊 บ้าระห่ำ: โล่จากคลื่น',
    '⚔️ บ้าระห่ำ: ฟันตัวถัดไป',
  ]) {
    assert.ok(zerkBuffed.some((r) => r.label === label), `missing Berserker ultInfo row: ${label}`)
  }
})

test('Wave 2: all new KIT2.knight & KIT2.berserker leaves have hand-written Thai labels + effects, and Warlord CD stays 3 while Berserker waveCdJ2 is 2', () => {
  const thai = /[\u0E00-\u0E7F]/
  const expectNew: Record<'knight' | 'berserker', string[]> = {
    knight: [
      'brandPushOther', 'brandCritAdd', 'brandLowTargetAmp', 'boomerangTurns', 'spiralS3S4Pierce',
      's4.defPierce', 's4.critAdd', 's4.spBreakAmp', 'tree.sweepCritAdd', 'tree.sweepRes',
    ],
    berserker: [
      'mastery.skillCrit', 'stormFrenzyAmp', 'stormFrenzyAt', 'waveCdJ2', 'waveHits',
      'waveGoreAtk', 'waveGoreTurns', 'waveMultiRage', 'waveMultiAt', 'ultRageGain',
    ],
  }
  for (const id of ['knight', 'berserker'] as const) {
    const l = job2Layout(id)
    const kit2Refs = [...l.s3, ...l.s4, ...l.ult, ...l.other]
    const allRefs = [...l.s1, ...kit2Refs, ...l.j3]
    const newSet = new Set(expectNew[id].map((k) => `kit2.${id}.${k}`))
    for (const r of allRefs) {
      const key = r.path.split('.').slice(2).join('.')
      if (!l.other.includes(r) || newSet.has(r.path)) {
        assert.ok(r.label !== key && !r.label.endsWith(`· ${key}`), `${r.path}: hand-written label, got "${r.label}"`)
        if (kit2Refs.includes(r)) assert.ok(thai.test(r.label), `${r.path}: Thai label, got "${r.label}"`)
      }
      const ex = explainField(r.table, r.path, { defaultLabel: r.label })
      assert.ok(ex.effect.length > 10 && thai.test(ex.effect), `${r.path}: Thai effect, got "${ex.effect}"`)
      assert.ok(listed(r.table, r.path), `${r.path}: listed in TABLES.${r.table}`)
    }
    for (const k of expectNew[id]) {
      assert.ok(allRefs.some((r) => r.path === `kit2.${id}.${k}`), `missing admin ref kit2.${id}.${k}`)
    }
  }
  assert.equal(JOB2.berserker.skill3.cd, 3)
  assert.equal(KIT2.berserker.waveCdJ2, 2)
})

test('Wave 3 cleanup: swordVampDmgCut is removed from KIT and skipped safely in applyPatch', () => {
  assert.equal('swordVampDmgCut' in KIT, false)
  const r = applyPatch({ kit: { swordVampDmgCut: 0.2 } })
  assert.equal(r.ok, true, JSON.stringify(r.errors))
  assert.equal(r.skipped.length, 1, JSON.stringify(r.skipped))
  r.revert()
})
