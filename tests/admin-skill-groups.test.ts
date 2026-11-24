// Unit tests for src/admin/skill-groups.ts: guarantees every SkillRef across all base classes & 2nd jobs
// is preserved exactly once, per-level arrays collapse into compact tables, and topic sub-groups strip prefixes cleanly.
import test from 'node:test'
import assert from 'node:assert/strict'
import { groupSkillRefs } from '../src/admin/skill-groups'
import { critRef, JOB2_IDS, job2Layout, SKILL_CLASSES, SKILL_LAYOUT, type SkillRef } from '../src/data/skill-registry'

function flattenOutput(refs: readonly SkillRef[]): SkillRef[] {
  const g = groupSkillRefs(refs)
  return [
    ...g.groups.flatMap((s) => s.items.map((it) => it.ref)),
    ...g.tables.flatMap((t) => t.rows.flatMap((r) => r.refs)),
  ]
}

test('groupSkillRefs preserves every ref exactly once across all base classes and 2nd jobs', () => {
  for (const c of SKILL_CLASSES) {
    const L = SKILL_LAYOUT[c]
    const sections: [string, SkillRef[]][] = [
      [`${c}.s1`, [critRef(c, 's1'), ...L.s1]],
      ...L.s2.map((x): [string, SkillRef[]] => [`${c}.s2.${x.id}`, x.refs]),
      [`${c}.ult`, [critRef(c, 'ult'), ...L.ult]],
      ...(L.tree ? [[`${c}.tree`, L.tree] as [string, SkillRef[]]] : []),
    ]
    for (const [name, refs] of sections) {
      const out = flattenOutput(refs)
      assert.equal(out.length, refs.length, `${name}: count matches`)
      assert.deepEqual(
        out.map((r) => `${r.table}.${r.path}`).sort(),
        refs.map((r) => `${r.table}.${r.path}`).sort(),
        `${name}: exact same set of refs`,
      )
    }
  }

  for (const id of JOB2_IDS) {
    const l = job2Layout(id)
    const sections: [string, SkillRef[]][] = [
      [`${id}.s1`, l.s1],
      [`${id}.s3`, l.s3],
      [`${id}.ult`, l.ult],
      [`${id}.s4`, l.s4],
      [`${id}.j3`, l.j3],
      [`${id}.other`, l.other],
    ]
    for (const [name, refs] of sections) {
      const out = flattenOutput(refs)
      assert.equal(out.length, refs.length, `${name}: count matches`)
      assert.deepEqual(
        out.map((r) => `${r.table}.${r.path}`).sort(),
        refs.map((r) => `${r.table}.${r.path}`).sort(),
        `${name}: exact same set of refs`,
      )
    }
  }
})

test('Swordsman S1 collapses 45 per-level refs into ONE 3x15 table with stripped row labels', () => {
  const res = groupSkillRefs([critRef('swordsman', 's1'), ...SKILL_LAYOUT.swordsman.s1])
  assert.equal(res.tables.length, 1, 'one merged Lv 1-15 table')
  const tbl = res.tables[0]
  assert.equal(tbl.lvLabels.length, 15)
  assert.equal(tbl.lvLabels[0], 'Lv 1')
  assert.equal(tbl.lvLabels[14], 'Lv 15')
  assert.equal(tbl.rows.length, 3, 'atkPct, str, base')
  assert.ok(tbl.title.includes('ดาบสยบมนตร์'), `table title "${tbl.title}"`)
  assert.deepEqual(tbl.rows.map((r) => r.label), ['× P.ATK', '× STR', 'ดาเมจฐาน × Base Lv'])
  // Only the 7 scalar fields remain outside the table (crit, mana, cd, silenceTurns, baseLvSoft, baseLvAfterScale, skillCritAdd)
  const scalars = res.groups.flatMap((g) => g.items)
  assert.equal(scalars.length, 7)
})

test('Swordsman Ult collapses awakenStr into 1x15 table and groups คำพิพากษา / เคลือบดาบสวรรค์ / ปลุกดาบ', () => {
  const res = groupSkillRefs([critRef('swordsman', 'ult'), ...SKILL_LAYOUT.swordsman.ult])
  assert.equal(res.tables.length, 1)
  assert.equal(res.tables[0].lvLabels.length, 15)
  const titles = res.groups.map((g) => g.title)
  assert.ok(titles.includes('✨ เคลือบดาบสวรรค์'), `groups: ${titles.join(', ')}`)
  assert.ok(titles.includes('⚔️ ปลุกดาบ'), `groups: ${titles.join(', ')}`)
})

test('Swordsman tree and Warlord Awakening auto-group by node/skill prefix and strip uniform class prefix', () => {
  const swTree = groupSkillRefs(SKILL_LAYOUT.swordsman.tree ?? [])
  const swTitles = swTree.groups.map((g) => g.title)
  assert.ok(swTitles.includes('🪨 กายเหล็ก'), `swTree groups: ${swTitles.join(', ')}`)
  assert.ok(swTitles.includes('💠 เกราะจิตอึด'))
  assert.ok(swTitles.includes('❤️‍🩹 ฟื้นฟูนักรบ'))

  const warlordJ3 = groupSkillRefs(job2Layout('berserker').j3)
  const wTitles = warlordJ3.groups.map((g) => g.title)
  assert.ok(wTitles.every((t) => !t.startsWith('🪓 Warlord ·')), `uniform class prefix stripped: ${wTitles.join(', ')}`)
  assert.ok(wTitles.includes('⚔️ Spinning Guillotine'), `warlord j3 groups: ${wTitles.join(', ')}`)
  assert.ok(wTitles.includes('🧬 มรดก'))
})

test('Crusader Grand Cross pulses collapse into a Lv 0-5 table', () => {
  const res = groupSkillRefs(job2Layout('crusader').ult)
  assert.equal(res.tables.length, 1)
  assert.deepEqual(res.tables[0].lvLabels, ['Lv 0', 'Lv 1', 'Lv 2', 'Lv 3', 'Lv 4', 'Lv 5'])
})
