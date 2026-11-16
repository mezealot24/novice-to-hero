import test from 'node:test'
import assert from 'node:assert/strict'
import { migrateSageRework, newSave, setSave, type SaveData } from '../src/save'
import { heroStats } from '../src/data/meta'
import { CRIT_RULES } from '../src/data/battle-rules'
import { JOB2_K } from '../src/data/power'
import {
  autoInfo,
  KIT2,
  SAGE_S1,
  sageAutoChance,
  sageElementBenefit,
  sageFireChance,
  sageIceChance,
  sageLightChance,
  sageRodGain,
  ultInfo,
} from '../src/data/skill-math'
import { lockReason, nodeById } from '../src/data/tree'

function sageSave(overrides: Partial<SaveData> = {}): SaveData {
  const s = newSave('sage_test', 'human')
  Object.assign(s, {
    job: 'mage',
    jobLevel: 40,
    job2: 'sage',
    job2Level: 30,
    baseLevel: 30,
    job2Tree: {},
    ...overrides,
  })
  setSave(s)
  return s
}

test('Sage rework: Skill 1 replaces Mage fireball with ศาสตราวุธธาตุ and Ult info shows Spell Breaker', () => {
  const s = sageSave({ job2Tree: { sg_f1: 3, sg_l1: 3, sg_i1: 3 } })
  const st = heroStats(s)
  const s1Rows = autoInfo('mage', st, 'sage')
  assert.equal(SAGE_S1.name, 'ศาสตราวุธธาตุ')
  assert.ok(s1Rows.some((r) => r.label.includes('ฟาดหนังสือ')), 'shows Sage melee Skill 1 hits')
  assert.ok(s1Rows.some((r) => r.label.includes('Auto Spell')), 'shows Auto Spell row')
  assert.ok(s1Rows.some((r) => r.label.includes('Fire Bolt')), 'shows unlocked Fire Bolt perk')
  assert.ok(s1Rows.some((r) => r.label.includes('Chain Lightning')), 'shows unlocked Chain Lightning perk')
  assert.ok(s1Rows.some((r) => r.label.includes('Permafrost')), 'shows unlocked Permafrost perk')

  const mageRows = autoInfo('mage', st)
  assert.ok(mageRows.some((r) => r.label.includes('ไฟ/ตัว')), 'base Mage still keeps fireball Skill 1')

  const uRows = ultInfo('mage', st, undefined, 'sage')
  assert.ok(uRows.some((r) => r.label.includes('Dispell')), 'Sage ult info shows Dispell + Spell Breaker')
})

test('Sage rework: main runElement gets 100% perk benefit and off-elements get 50%', () => {
  const s = sageSave({ job2Tree: { sg_f1: 5, sg_l1: 5, sg_i1: 5 } })
  const st = heroStats(s)
  assert.equal(sageElementBenefit('fire', 'fire'), 1)
  assert.equal(sageElementBenefit('fire', 'lightning'), KIT2.sage.perk.offMul)
  assert.equal(sageElementBenefit('ice', 'arcane'), KIT2.sage.perk.offMul)

  const fireMain = sageFireChance(st, 60, 'fire', false)
  const fireOff = sageFireChance(st, 60, 'ice', false)
  assert.ok(Math.abs(fireOff - fireMain * KIT2.sage.perk.offMul) < 1e-9)

  const lightMain = sageLightChance(st, 60, 'lightning', true)
  const lightOff = sageLightChance(st, 60, 'fire', true)
  assert.ok(lightMain > sageLightChance(st, 60, 'lightning', false), 'Endow boosts perk proc chance')
  assert.ok(Math.abs(lightOff - lightMain * KIT2.sage.perk.offMul) < 1e-9)

  const iceMain = sageIceChance(st, 'ice', false)
  const iceOff = sageIceChance(st, 'fire', false)
  assert.ok(Math.abs(iceOff - iceMain * KIT2.sage.perk.offMul) < 1e-9)
})

test('Sage rework: all 7 base stats provide measurable value to Sage', () => {
  const base = sageSave({ job2Tree: { sg_r1: 3 } })
  const st0 = heroStats(base)
  const bump = (stat: keyof SaveData['stats']) => {
    const s = sageSave({ job2Tree: { sg_r1: 3 }, stats: { ...base.stats, [stat]: base.stats[stat] + 20 } })
    return { s, st: heroStats(s) }
  }

  const dStr = bump('str').st
  const dDex = bump('dex').st
  const dVit = bump('vit')
  const dInt = bump('int').st
  const dWis = bump('wis').st
  const dAgi = bump('agi').st
  const dLuk = bump('luk').st

  assert.ok(dStr.atk > st0.atk && dStr.pskill > st0.pskill, 'STR boosts melee ATK & pskill')
  assert.ok(dDex.skillCrit > st0.skillCrit && dDex.combo > st0.combo && dDex.hit > st0.hit, 'DEX boosts skillCrit, combo, hit')
  assert.ok(dVit.st.maxHp > st0.maxHp && sageRodGain(dVit.st, dVit.s.stats.vit).mana > sageRodGain(st0, base.stats.vit).mana, 'VIT boosts HP & Magic Rod Mana')
  assert.ok(dInt.matk > st0.matk && sageAutoChance(dInt, 25) > sageAutoChance(st0, 5), 'INT boosts M.ATK & Auto Spell chance')
  assert.ok(dWis.resRegen > st0.resRegen && dWis.elemDmg > st0.elemDmg && dWis.mdef > st0.mdef, 'WIS boosts Mana regen, elemDmg, M.DEF')
  assert.ok(dAgi.aspd > st0.aspd && dAgi.combo > st0.combo, 'AGI boosts ASPD & combo')
  assert.ok(dLuk.spellCrit > st0.spellCrit && dLuk.procCritMul > st0.procCritMul && dLuk.crit > st0.crit, 'LUK boosts spellCrit, procCritMul & basic crit')
})

test('Sage rework: tree branches unlock cleanly, 2-capstone rule holds, and Beta save refunds job2Points once', () => {
  assert.equal(CRIT_RULES.sageSpellCap, 0.75)
  assert.equal(JOB2_K.sage, 1.1)

  const t: Record<string, number> = {
    sage_s3p: 1,
    sg_a1: 4, sg_a2: 1, sg_a3: 1,
    sg_f1: 4, sg_f2: 1, sg_f3: 1,
    sg_l1: 4, sg_l2: 1, sg_l3: 1,
  }
  assert.equal(lockReason(t, 'mage', nodeById('sg_e1')!, 'sage'), '', 'sg_e1 unlocks under Endow root')
  assert.equal(lockReason(t, 'mage', nodeById('sg_a4')!, 'sage'), '', '★ Hindsight opens at 6 pts')
  t.sg_a4 = 1; t.sg_f4 = 1
  assert.notEqual(lockReason(t, 'mage', nodeById('sg_l4')!, 'sage'), '', '3rd capstone blocked (max 2)')

  // Beta migration test
  const oldSage = sageSave({ job2Tree: { sg_a1: 3, sg_e1: 2 }, job2Points: 4, job2Talents: { '1': { id: 'sg_t1_auto', rank: 1 } } })
  delete oldSage.sageRework
  migrateSageRework(oldSage)
  assert.equal(oldSage.sageRework, 1)
  assert.deepEqual(oldSage.job2Tree, {})
  assert.deepEqual(oldSage.job2Talents, {})
  assert.equal(oldSage.job2Points, 9)

  // Idempotent on second run
  oldSage.job2Tree = { sg_f1: 2 }
  migrateSageRework(oldSage)
  assert.deepEqual(oldSage.job2Tree, { sg_f1: 2 })
})
