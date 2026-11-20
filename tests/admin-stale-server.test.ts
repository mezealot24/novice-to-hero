// Regression (Q 2026-11-20): saving a draft that tunes the D14 clones failed with
// "monsters.protozero.bodyMul.hp missing · ..." — the data is fine, the Cloudflare Worker that validates drafts was
// deployed before D14, so its MONSTERS had no clone ids. These pin: the current build accepts bodyMul.* on every
// monster, a stale-build reject is recognised (admin shows "deploy the server"), and the fingerprint sees new monsters.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MONSTERS } from '../src/data/monsters'
import { checkPatch, dataFingerprint, looksLikeStaleBuild } from '../src/data/patch'

test('bodyMul.hp / dmg / matk are tunable on every monster, D14 clones included', () => {
  const rows: Record<string, number> = {}
  for (const id of Object.keys(MONSTERS)) for (const k of ['hp', 'dmg', 'matk']) rows[`${id}.bodyMul.${k}`] = 1.5
  const r = checkPatch({ monsters: rows })
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.skipped, [])
  for (const id of ['protozero', 'cloneknight', 'clonewizard', 'clonesword', 'clonecleric']) assert.ok(MONSTERS[id as keyof typeof MONSTERS], id)
})

test('a reject made only of missing / unknown paths reads as a stale server build', () => {
  assert.equal(looksLikeStaleBuild([{ reason: 'missing' }, { reason: 'unknown' }]), true)
  assert.equal(looksLikeStaleBuild([{ reason: 'missing' }, { reason: 'guard' }]), false)
  assert.equal(looksLikeStaleBuild([]), false)
})

test('dataFingerprint changes when a monster id is added (server older than the editor)', () => {
  const before = dataFingerprint()
  assert.match(before, /^[0-9a-f]{8}$/)
  assert.equal(dataFingerprint(), before)
  const m = MONSTERS as unknown as Record<string, unknown>
  m.zz_probe = { ...m.protozero }
  try { assert.notEqual(dataFingerprint(), before) } finally { delete m.zz_probe }
  assert.equal(dataFingerprint(), before)
})

test('pruneUnappliable drops paths the code removed (old live / draft) and keeps fixable ones', async () => {
  const { pruneUnappliable } = await import('../src/data/patch')
  const patch = {
    monsters: { 'protozero.bodyMul.hp': 1.8, 'zz_gone_monster.bodyMul.hp': 2, 'jellop.notAField': 3, 'jellop.xp': -5 },
    battle: { 'monBuff.hp.0': 1.2 }, // removed in v126 (baked into bodyMul)
  } as unknown as Parameters<typeof pruneUnappliable>[0]
  const before = JSON.stringify(patch)
  const { patch: out, dropped } = pruneUnappliable(patch)
  assert.equal(JSON.stringify(patch), before, 'input untouched')
  assert.deepEqual(dropped.map((d) => `${d.table}.${d.path}`).sort(), ['battle.monBuff.hp.0', 'monsters.jellop.notAField', 'monsters.zz_gone_monster.bodyMul.hp'])
  assert.deepEqual(out, { monsters: { 'protozero.bodyMul.hp': 1.8, 'jellop.xp': -5 } }) // the range error stays for the admin to fix
  const clean = checkPatch(out)
  assert.deepEqual(clean.skipped, [])
  assert.equal(clean.errors.length, 1)
})

test('every field the editor lists (all monsters, all tables) validates on this build', async () => {
  const { listFields, guardsFor } = await import('../src/data/patch')
  const { TABLE_IDS } = await import('../src/data/tunables')
  let n = 0
  for (const t of TABLE_IDS) {
    const rows = listFields(t)
    for (let i = 0; i < rows.length; i += 2000) {
      const sub = { [t]: Object.fromEntries(rows.slice(i, i + 2000).map((r) => [r.path, r.value ?? Math.max(r.def.min, Math.min(r.def.max, Math.ceil(r.def.min)))])) } as Parameters<typeof guardsFor>[0]
      const res = checkPatch(sub, guardsFor(sub))
      assert.deepEqual(res.errors, [], t)
      assert.deepEqual(res.skipped, [], t)
      n += res.count
    }
  }
  assert.ok(n > 1000, `checked ${n}`)
})
