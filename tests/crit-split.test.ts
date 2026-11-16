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
  assert.ok(Math.abs(b.skillCrit - a.skillCrit - 0.06) < 1e-9)
  assert.ok(Math.abs(b.crit - a.crit - PER_POINT.luk.crit) < 1e-9)
  assert.ok(Math.abs(b.spellCrit - a.spellCrit - PER_POINT.off.mageLukSpellCrit) < 1e-9)
})

test('CRIT_RULES: physical skills borrow only part of basic crit; Sage gets the highest spellCrit cap', () => {
  assert.ok(CRIT_RULES.skillFromCrit > 0 && CRIT_RULES.skillFromCrit < 1)
  assert.ok(CRIT_RULES.sageSpellCap > CRIT_RULES.cap.spellCrit)
})
