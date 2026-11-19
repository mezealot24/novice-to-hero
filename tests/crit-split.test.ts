import test from 'node:test'
import assert from 'node:assert/strict'
import { newSave, setSave, type SaveData } from '../src/save'
import { heroStats, PER_POINT } from '../src/data/meta'
import { CRIT_RULES } from '../src/data/battle-rules'

// Sage rework v1 §1 (design/sage-rework-v1.md): crit / skillCrit / spellCrit are separate pools.
// clover: base { luk: 1 }, mod { crit: 0.06, dropChance: 0.03 }
function hero(job: 'mage' | 'swordsman', clover: boolean): SaveData {
  const s = newSave('t', 'human')
  Object.assign(s, { job, jobLevel: 10, equipped: clover ? { acc: 'clover' } : {} })
  setSave(s)
  return s
}

test('crit split: a non-Mage keeps gear crit as basic crit and it no longer leaks into spellCrit', () => {
  const a = heroStats(hero('swordsman', false)), b = heroStats(hero('swordsman', true))
  assert.ok(Math.abs(b.crit - a.crit - (0.06 + PER_POINT.luk.crit)) < 1e-9)
  assert.equal(b.spellCrit, a.spellCrit)
  assert.equal(b.skillCrit, a.skillCrit)
})

test('crit split: a Mage turns gear crit into skillCrit (not basic crit, not spellCrit)', () => {
  const a = heroStats(hero('mage', false)), b = heroStats(hero('mage', true))
  assert.ok(Math.abs(b.skillCrit - a.skillCrit - 0.06 - PER_POINT.off.mageLukSkillCrit) < 1e-9) // clover +1 LUK: Mage LUK -> skillCrit too (Q 2026-11-19)
  assert.ok(Math.abs(b.crit - a.crit - PER_POINT.luk.crit) < 1e-9)
  assert.ok(Math.abs(b.spellCrit - a.spellCrit - PER_POINT.off.mageLukSpellCrit) < 1e-9)
})

test('CRIT_RULES: physical skills borrow no basic crit (skillCrit only, Q 2026-11-19); Sage gets the highest spellCrit cap', () => {
  assert.equal(CRIT_RULES.skillFromCrit, 0)
  assert.ok(CRIT_RULES.sageSpellCap > CRIT_RULES.cap.spellCrit)
})

test('Mage LUK gives skillCrit: +1% per 10 LUK, capped (Q 2026-11-19 "Mage luk can cri")', () => {
  const s = hero('mage', false), a = heroStats(s)
  s.stats = { ...s.stats, luk: s.stats.luk + 50 }; setSave(s)
  const b = heroStats(s)
  assert.ok(Math.abs(b.skillCrit - a.skillCrit - 0.05) < 1e-9, `${b.skillCrit - a.skillCrit}`)
  s.stats = { ...s.stats, luk: 999 }; setSave(s)
  assert.ok(heroStats(s).skillCrit - a.skillCrit <= PER_POINT.off.mageLukSkillCritCap + 1e-9)
  const w = hero('swordsman', false), w0 = heroStats(w).skillCrit
  w.stats = { ...w.stats, luk: w.stats.luk + 50 }; setSave(w)
  assert.equal(heroStats(w).skillCrit, w0, 'other classes: LUK is basic crit only')
})
