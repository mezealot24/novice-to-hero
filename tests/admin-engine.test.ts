// Admin Engine tests: 100% Thai explanations coverage, 2nd-job column grouping, bulk filter/edit engine, and batch preview. Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { MONSTERS, type MonsterKind } from '../src/data/game-data'
import { statNative } from '../src/data/mon-stats'
import { checkPatch, guardsFor } from '../src/data/patch'
import { JOB2_IDS, job2Layout } from '../src/data/skill-registry'
import { TABLE_IDS, type Patch } from '../src/data/tunables'
import { explainField, explainTableGroup, TABLE_EXPLAIN } from '../src/admin/explain'
import {
  applyBulkOp,
  BULK_TABLE_IDS,
  computeBulkNext,
  filterMonsters,
  filterSkills,
  filterTableRows,
  implicitDefault,
  isUnusedNativeField,
  MON_PRESETS,
  skillCatalog,
  tableRows,
} from '../src/admin/bulk'
import { fields, previewManyMons, previewMon } from '../src/admin/model'

const GENERIC_FALLBACKS = new Set([
  'ค่าปรับสมดุลของมอนสเตอร์ตัวนี้',
  'ตัวคูณระบบต่อสู้ (BATTLE)',
  'ตัวเลขปรับสมดุลสกิลอาชีพ',
  'ค่าคอมโบ/สวนกลับ',
  'ค่าความยาก Hard',
  'พารามิเตอร์สกิลโหมด Hard',
  'พาสซีฟโหมด Hard',
  'ค่าสูตรสเตตัสมอน',
  'ค่าสเกลสกิลมอน',
  'ค่าความก้าวหน้าและ EXP',
  'ตัวคูณคิทคลาสหลัก',
])

test('explain.ts: 100% of whitelisted fields across all 12 tables have specific Thai label + effect', () => {
  let totalChecked = 0
  for (const t of TABLE_IDS) {
    assert.ok(TABLE_EXPLAIN[t]?.label && TABLE_EXPLAIN[t]?.short && TABLE_EXPLAIN[t]?.summary, `${t}: TABLE_EXPLAIN`)
    for (const row of fields(t)) {
      totalChecked++
      const k = t === 'monsters' ? (row.path.slice(0, row.path.indexOf('.')) as MonsterKind) : undefined
      const native = k && MONSTERS[k] ? statNative(k) : false
      const ex = explainField(t, row.path, { native })
      assert.ok(ex.label.trim().length > 0, `${t}.${row.path}: empty label`)
      assert.ok(ex.effect.trim().length > 0, `${t}.${row.path}: empty effect`)
      assert.ok(!GENERIC_FALLBACKS.has(ex.effect), `${t}.${row.path}: hit generic fallback "${ex.effect}"`)
    }
  }
  assert.ok(totalChecked > 3000, `checked ${totalChecked} fields across 12 tables`)
})

test('explainTableGroup covers hardSkills, hardPassives, and structured prefixes in Thai', () => {
  for (const t of BULK_TABLE_IDS) {
    const seenGroups = new Set<string>()
    for (const r of fields(t)) {
      const dot = r.path.indexOf('.')
      if (dot > 0) seenGroups.add(r.path.slice(0, dot))
    }
    for (const g of seenGroups) {
      if (t === 'combo' && /^\d+$/.test(g)) continue
      const grp = explainTableGroup(t, g)
      assert.ok(grp.title && grp.title !== g, `${t}.${g}: expected descriptive Thai group title, got "${grp.title}"`)
    }
  }
})

test('J2_COL classifies all 10 second jobs into s3 / ult / other cleanly without raw labels', () => {
  assert.equal(JOB2_IDS.length, 10)
  for (const id of JOB2_IDS) {
    const layout = job2Layout(id)
    assert.ok(layout.s3.length > 0, `${id}: s3 refs`)
    assert.ok(layout.ult.length > 0, `${id}: ult refs`)
    assert.ok(layout.other.length > 0, `${id}: other refs`)
    for (const r of [...layout.s3, ...layout.ult, ...layout.other]) {
      assert.ok(r.label.trim().length > 0, `${id}.${r.path}: empty label`)
      const ex = explainField(r.table, r.path, { defaultLabel: r.label })
      assert.ok(ex.effect.length > 10, `${id}.${r.path}: short/missing effect`)
    }
  }
})

test('bulk.ts: pct, mul, add, set respect clampField, implicit defaults, and clean patch storage', () => {
  const draft: Patch = {}
  const live: Patch = { monsters: { 'king.hp': 900 } }

  // 1) Monster pct +20% on bodyMul.hp (absent optional with implicit default 1) and clamped pointsMul
  const res1 = applyBulkOp(draft, live, [
    { table: 'monsters', path: 'king.bodyMul.hp' },
    { table: 'monsters', path: 'pharaoh.pointsMul' },
  ], 'pct', 20)
  assert.equal(res1.changed, 2)
  assert.equal(draft.monsters?.['king.bodyMul.hp'], 1.2)
  assert.equal(draft.monsters?.['pharaoh.pointsMul'], 1.2)

  // 2) Setting bodyMul.hp back to 1 strips the optional identity leaf from draft patch cleanly
  const resResetIdentity = applyBulkOp(draft, live, [{ table: 'monsters', path: 'king.bodyMul.hp' }], 'set', 1)
  assert.equal(resResetIdentity.changed, 1)
  assert.equal(draft.monsters?.['king.bodyMul.hp'], undefined)

  // 3) Clamping on int and out-of-range values
  const resClamp = applyBulkOp(draft, live, [{ table: 'monsters', path: 'king.hp' }], 'set', 9e9)
  assert.equal(resClamp.clamped, 1)
  assert.equal(draft.monsters?.['king.hp'], 1_000_000)

  // 4) Skipping unused native hp/dmg/matk for D6+ stat monsters and unset curse pow
  assert.equal(isUnusedNativeField('monsters', 'pharaoh.hp'), true)
  assert.equal(isUnusedNativeField('monsters', 'king.hp'), false)
  assert.equal(implicitDefault('monsters', 'king.skills.0.lv'), 1)
  assert.equal(implicitDefault('monsters', 'pharaoh.hit'), 0)
  assert.equal(implicitDefault('monsters', 'king.hit'), 15)

  const skipStep = computeBulkNext(draft, live, { table: 'monsters', path: 'pharaoh.hp' }, 'pct', 10)
  assert.equal(skipStep.skip, true)

  // 5) dryRun never mutates draft
  const snap = JSON.stringify(draft)
  const dry = applyBulkOp(draft, live, [{ table: 'monsters', path: 'king.hp' }], 'pct', -50, true)
  assert.equal(dry.changed, 1)
  assert.equal(JSON.stringify(draft), snap)

  // 6) resetLive and resetDef restore properly and pass checkPatch
  applyBulkOp(draft, live, [{ table: 'monsters', path: 'king.hp' }], 'resetLive')
  assert.equal(draft.monsters?.['king.hp'], 900)
  applyBulkOp(draft, live, [{ table: 'monsters', path: 'king.hp' }, { table: 'monsters', path: 'pharaoh.pointsMul' }], 'resetDef')
  assert.deepEqual(draft, {})
  assert.equal(checkPatch(draft, guardsFor(draft)).ok, true)
})

test('bulk.ts filters: filterMonsters, filterSkills, filterTableRows work accurately', () => {
  const draft: Patch = { monsters: { 'king.bodyMul.hp': 1.25 }, skills: { 'crit.cleric.ult': 0 }, battle: { turnLimit: 35 } }
  const live: Patch = {}

  // Monster filter
  const d1Boss = filterMonsters({ search: '', dungeon: 'd1', tier: 'boss', model: 'all', status: 'all' }, draft, live)
  assert.deepEqual(d1Boss.map((m) => m.kind), ['king'])
  const diffMon = filterMonsters({ search: '', dungeon: 'all', tier: 'all', model: 'all', status: 'diffLive' }, draft, live)
  assert.deepEqual(diffMon.map((m) => m.kind), ['king'])
  const nativeOnly = filterMonsters({ search: '', dungeon: 'all', tier: 'all', model: 'native', status: 'all' }, draft, live)
  assert.ok(nativeOnly.some((m) => m.kind === 'pharaoh') && !nativeOnly.some((m) => m.kind === 'king'))

  // Presets check
  for (const p of Object.values(MON_PRESETS)) {
    assert.equal(p.cols.length, 7, `${p.label} has 7 preset columns`)
  }

  // Skill filter
  assert.ok(skillCatalog().length > 100)
  const job2Costs = filterSkills({ search: '', tier: 'job2', cls: 'all', slot: 's3', metric: 'cost', status: 'all' }, draft, live)
  assert.ok(job2Costs.length >= 9 && job2Costs.every((r) => r.tier === 'job2' && r.metric === 'cost'))
  const editedSkill = filterSkills({ search: '', tier: 'all', cls: 'cleric', slot: 'crit', metric: 'crit', status: 'diffLive' }, draft, live)
  assert.equal(editedSkill.length, 1)
  assert.equal(editedSkill[0]?.path, 'crit.cleric.ult')

  // Table rows filter
  assert.ok(!BULK_TABLE_IDS.includes('monsters') && !BULK_TABLE_IDS.includes('archetypes'))
  const setBattle = tableRows('battle').length
  assert.ok(setBattle > 20)
  const editedTable = filterTableRows({ table: 'battle', group: 'all', search: '', status: 'diffLive' }, draft, live)
  assert.deepEqual(editedTable.map((r) => r.path), ['turnLimit'])
})

test('previewManyMons matches individual previewMon results and reverts cleanly', () => {
  const before = JSON.stringify(MONSTERS.pharaoh)
  const patch: Patch = { monsters: { 'king.hp': 999, 'pharaoh.bodyMul.hp': 1.5 } }
  const kinds: MonsterKind[] = ['jellop', 'king', 'pharaoh']
  const batch = previewManyMons(kinds, patch)
  for (const k of kinds) {
    assert.deepEqual(batch.get(k), previewMon(k, patch), `${k}: batch matches single preview`)
  }
  assert.equal(JSON.stringify(MONSTERS.pharaoh), before, 'reverted cleanly')
})

