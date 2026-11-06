// admin.html model (src/admin/model.ts) + the patch round trip the server does on PUT /admin/draft. Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MONSTERS, type MonsterKind } from '../src/data/game-data'
import { canonicalJson, checkPatch, guardsFor } from '../src/data/patch'
import { TABLES, type Patch } from '../src/data/tunables'
import { statNative } from '../src/data/mon-stats'
import { clampField, diffPatches, fieldLabel, fieldRow, fields, monSections, monsterGroups, pctHint, previewMon, setIn } from '../src/admin/model'

test('every monster is listed exactly once, in the right tier', () => {
  const all = monsterGroups().flatMap((g) => [...g.tiers.normal, ...g.tiers.mini, ...g.tiers.boss])
  assert.equal(all.length, new Set(all).size, 'no duplicates')
  assert.deepEqual([...all].sort(), (Object.keys(MONSTERS) as MonsterKind[]).sort())
  const d1 = monsterGroups().find((g) => g.id === 'd1')
  assert.ok(d1?.tiers.boss.includes('king') && d1.tiers.normal.includes('minijellop'), 'boss + its summon in D1')
  assert.ok(monsterGroups().find((g) => g.id === 'd3')?.tiers.mini.includes('duelist'), 'MINI_POOL mini boss in D3')
})

test('clampField keeps values inside the FieldDef', () => {
  const int = TABLES.monsters.fields.find(([p]) => p === '*.hp')?.[1]
  assert.ok(int)
  assert.equal(clampField(int, '-5'), 1)
  assert.equal(clampField(int, '12.6'), 13)
  assert.equal(clampField(int, '9e9'), 1_000_000)
  assert.equal(clampField(int, ''), null)
  assert.equal(clampField(int, 'abc'), null)
  assert.equal(clampField({ kind: 'num', min: 0, max: 1 }, '0.1'), 0.1)
})

test('diff + setIn: defaults are not stored, only real changes diff', () => {
  const p: Patch = {}
  setIn(p, 'monsters', 'king.hp', 900)
  setIn(p, 'battle', 'turnLimit', 99)
  setIn(p, 'battle', 'turnLimit', null)
  assert.deepEqual(p, { monsters: { 'king.hp': 900 } })
  const def = fieldRow('monsters', 'king.hp')?.value
  assert.equal(def, MONSTERS.king.hp)
  assert.deepEqual(diffPatches({}, p), [{ table: 'monsters', path: 'king.hp', def, from: def, to: 900 }])
  assert.deepEqual(diffPatches({ monsters: { 'king.hp': def ?? 0 } }, {}), [], 'explicit default == absent')
})

test('labels name array elements', () => {
  assert.match(fieldLabel('monsters', 'shroom.skills.0.every', true), /^skills\.0 \(.+\)\.every$/)
})

test('server round trip: guards from this build make a patch fully apply, bad values are errors', () => {
  const p: Patch = { monsters: { 'king.hp': 900, 'shroom.skills.0.every': 4 }, monStat: { 'monStat.body.boss': 2 } }
  const g = guardsFor(p)
  const r = checkPatch(p, g)
  assert.ok(r.ok && r.skipped.length === 0 && r.count === 3, JSON.stringify(r))
  assert.equal(canonicalJson(p), canonicalJson(JSON.parse(JSON.stringify(p))))
  assert.equal(checkPatch({ monsters: { 'king.hp': -1 } }).ok, false)
  assert.equal(checkPatch({ monsters: { 'king.__proto__': 1 } }).ok, false)
  assert.equal(checkPatch({ monsters: { 'king.hp': '900' } }).ok, false)
})

test('monSections: every monster field lands in exactly one section with a human label', () => {
  for (const k of Object.keys(MONSTERS) as MonsterKind[]) {
    const rows = fields('monsters').filter((r) => r.path.startsWith(`${k}.`) && !(statNative(k) && /^\w+\.(hp|dmg|matk)$/.test(r.path)))
    const got = monSections(k, rows).flatMap((s) => s.fields)
    assert.equal(got.length, rows.length, `${k}: no field lost or duplicated`)
    for (const f of got) {
      const rel = f.row.path.slice(k.length + 1)
      assert.ok(f.label && !f.label.endsWith(rel.split('.').pop() ?? '\0'), `${k}: raw label for ${rel} -> "${f.label}"`)
    }
  }
  const king = monSections('king', fields('monsters').filter((r) => r.path.startsWith('king.')))
  assert.deepEqual(king.slice(0, 3).map((s) => s.id), ['core', 'reward', 'stat'])
  assert.ok(king.some((s) => s.id === 'skill0') && king.some((s) => s.id === 'phase0'))
})

test('pctHint: shares read as %, everything else stays bare', () => {
  assert.equal(pctHint({ kind: 'num', min: 0, max: 1.5 }, 0.06), '6%')
  assert.equal(pctHint({ kind: 'num', min: 0, max: 20 }, 1.6), undefined)
  assert.equal(pctHint({ kind: 'int', min: 0, max: 1 }, 1), undefined)
})

test('previewMon: game formulas on a draft, defaults restored after', () => {
  const before = JSON.stringify(MONSTERS.pharaoh)
  const [def] = previewMon('pharaoh', {})
  assert.ok(def.hp > 1000 && def.lv >= 40, `pharaoh is a real boss at Lv${def.lv}: HP ${def.hp}`)
  const [buff] = previewMon('pharaoh', { monStat: { 'monStat.body.boss': 16 } })
  assert.ok(Math.abs(buff.hp - def.hp * 2) <= 1, 'MON_STAT.body.boss x2 doubles HP')
  assert.equal(JSON.stringify(MONSTERS.pharaoh), before, 'revert leaves the build defaults untouched')
  const [king] = previewMon('king', {})
  assert.equal(king.hp, MONSTERS.king.hp, 'D1-5 defaults derive their tuned numbers')
  assert.ok(!monSections('pharaoh', fields('monsters').filter((r) => r.path.startsWith('pharaoh.'))).flatMap((s) => s.fields).some((f) => f.row.path === 'pharaoh.hp'), 'placeholder hp hidden')
})
