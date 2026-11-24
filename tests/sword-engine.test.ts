// Q 2026-11-24 "ปรับ Engine เกี่ยวกับ Skills Swordman ทั้งหมด ให้สามารถปรับแต่งแก้ไขตัวเลขได้": every number of the Swordsman line is
// whitelisted in the admin (skills / kit tables), patches reach the game, and the dead ฟันพายุ / v84 จังหวะดาบ numbers are gone.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TABLES, type TableId } from '../src/data/tunables'
import { applyPatch } from '../src/data/patch'
import { SWORD_MANA, SWORD_S1, swordS1Raw } from '../src/data/jobs'
import { KIT, KIT2, KIT3 } from '../src/data/skill-math'
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
  assert.deepEqual([JOB2.knight.skill4!.cost, JOB2.knight.skill4!.cd], [20, 4])
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
