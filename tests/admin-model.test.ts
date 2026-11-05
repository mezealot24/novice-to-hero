// admin.html model (src/admin/model.ts) + the patch round trip the server does on PUT /admin/draft. Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MONSTERS, type MonsterKind } from '../src/data/game-data'
import { canonicalJson, checkPatch, guardsFor } from '../src/data/patch'
import { TABLES, type Patch } from '../src/data/tunables'
import { clampField, diffPatches, fieldLabel, fieldRow, monsterGroups, setIn } from '../src/admin/model'

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
