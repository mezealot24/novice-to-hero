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
