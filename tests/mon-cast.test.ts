import test from 'node:test'
import assert from 'node:assert/strict'
import { MON_CAST, monBreakChance, monBreakGauge, monBreaksOn, monCastDmgMul, monCastPity, monSkillCasts, monSkillIsMagicHit, monSkillPower } from '../src/data/mon-cast'
import { POW_DEFAULT } from '../src/data/mon-stats'
import type { MonSkill } from '../src/data/monsters'
import { KIT } from '../src/data/skill-math'
import { fieldFor } from '../src/data/patch'
import { readFileSync } from 'node:fs'

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)

test('monBreaksOn: a hit must deal >= breakMinHp of the monster max HP (1.5%) to roll', () => {
  assert.equal(monBreaksOn(14, 1000), false)
  assert.equal(monBreaksOn(14.99, 1000), false)
  assert.equal(monBreaksOn(15, 1000), true)
  assert.equal(monBreaksOn(500, 1000), true)
  assert.equal(monBreaksOn(0, 1000), false)
  assert.equal(monBreaksOn(10, 0), false) // no max HP: never
})

test('monBreakChance: base 25% minus tier resist, minus hard resist', () => {
  near(monBreakChance('normal', false), 0.25)
  near(monBreakChance('mini', false), 0.2)
  near(monBreakChance('boss', false), 0.15)
  near(monBreakChance('normal', true), 0.2)
  near(monBreakChance('mini', true), 0.15)
  near(monBreakChance('boss', true), 0.1)
  assert.ok(monBreakChance('boss', false) < monBreakChance('mini', false))
  assert.ok(monBreakChance('boss', true) < monBreakChance('boss', false))
})

test('monBreakChance never goes below 0 (tuning clamps)', () => {
  const keep = { base: MON_CAST.breakBase, boss: MON_CAST.resist.boss }
  try {
    MON_CAST.breakBase = 0.1; MON_CAST.resist.boss = 0.2
    assert.equal(monBreakChance('boss', true), 0)
    assert.equal(monBreakChance('boss', false), 0)
    MON_CAST.breakBase = 0
    assert.equal(monBreakChance('normal', false), 0)
  } finally { MON_CAST.breakBase = keep.base; MON_CAST.resist.boss = keep.boss }
})

test('monBreakGauge pushes the gauge back pushGauge, clamped at 0', () => {
  assert.equal(monBreakGauge(100), 100 - MON_CAST.pushGauge)
  assert.equal(monBreakGauge(MON_CAST.pushGauge), 0)
  assert.equal(monBreakGauge(10), 0)
  assert.equal(monBreakGauge(0), 0)
})

test('pity is on by default and MON_CAST is live-tunable as kit monCast.*', () => {
  assert.equal(monCastPity(), true)
  assert.equal(KIT.monCast, MON_CAST)
  for (const p of ['monCast.breakBase', 'monCast.breakMinHp', 'monCast.hardResist', 'monCast.resist.normal', 'monCast.resist.mini', 'monCast.resist.boss', 'monCast.pushGauge', 'monCast.steady', 'monCast.steadyDmg', 'monCast.skillMinPow', 'monCast.skillFreeTurn']) assert.ok(fieldFor('kit', p), p)
})

// ===== Q 2026-11-21: strong boss magic skills are cast; a steady cast after a break is 50% weaker =====
const sk = (o: Partial<MonSkill>): MonSkill => ({ kind: 'bolt', every: 3, name: 't', ...o })
const casts = (s: MonSkill) => monSkillCasts(s, POW_DEFAULT[s.kind])

test('defaults: skillMinPow 1, steadyDmg 0.5, no free hero turn on a skill cast', () => {
  assert.equal(MON_CAST.skillMinPow, 1)
  assert.equal(MON_CAST.steadyDmg, 0.5)
  assert.equal(MON_CAST.skillFreeTurn, 0)
})

test('monSkillIsMagicHit: bolt, or a strike with magic; nothing else', () => {
  assert.equal(monSkillIsMagicHit(sk({ kind: 'bolt' })), true)
  assert.equal(monSkillIsMagicHit(sk({ kind: 'strike', magic: true })), true)
  assert.equal(monSkillIsMagicHit(sk({ kind: 'strike' })), false)
  for (const kind of ['heal', 'shield', 'warcry', 'curse', 'summon', 'revive', 'haste'] as const) assert.equal(monSkillIsMagicHit(sk({ kind, pow: 5 })), false, kind)
})

test('monSkillPower: base pow (or the kind default) x hits', () => {
  near(monSkillPower(sk({ pow: 0.8, hits: 2 })), 1.6)
  near(monSkillPower(sk({ pow: 1.2 })), 1.2)
  near(monSkillPower(sk({}), 1.3), 1.3)
  near(monSkillPower(sk({ hits: 3 }), 1.3), 3.9)
  near(monSkillPower(sk({})), 0)
})

test('monSkillCasts: magic hits with pow x hits >= skillMinPow (threshold inclusive, multi-hit counts)', () => {
  assert.equal(casts(sk({ pow: 1 })), true) // exactly at the threshold
  assert.equal(casts(sk({ pow: 0.99 })), false)
  assert.equal(casts(sk({ pow: 0.5, hits: 2 })), true) // 0.5 x 2 = 1
  assert.equal(casts(sk({ pow: 0.3, hits: 3 })), false) // 0.9
  assert.equal(casts(sk({ pow: 0.8, hits: 2 })), true) // y_storm
  assert.equal(casts(sk({})), true) // bolt default pow 1.3
  assert.equal(casts(sk({ kind: 'strike', magic: true, pow: 2 })), true)
  assert.equal(casts(sk({ kind: 'strike', pow: 5, hits: 3 })), false) // physical: never cast
  assert.equal(casts(sk({ kind: 'curse', fx: { silence: 2 } })), false)
  assert.equal(casts(sk({ kind: 'heal', pow: 2 })), false)
  const keep = MON_CAST.skillMinPow
  try { MON_CAST.skillMinPow = 2; assert.equal(casts(sk({ pow: 1.6 })), false); assert.equal(casts(sk({ pow: 1, hits: 2 })), true) } finally { MON_CAST.skillMinPow = keep }
})

test('monCastDmgMul: steady cast x steadyDmg, a normal cast untouched, never negative', () => {
  assert.equal(monCastDmgMul(false), 1)
  near(monCastDmgMul(true), 0.5)
  const keep = MON_CAST.steadyDmg
  try { MON_CAST.steadyDmg = 1; assert.equal(monCastDmgMul(true), 1); MON_CAST.steadyDmg = -1; assert.equal(monCastDmgMul(true), 0) } finally { MON_CAST.steadyDmg = keep }
})

test('BattleScene: skill casts for bosses only, released through fireMonSkill, cleared with the cast', () => {
  const src = readFileSync('src/scenes/BattleScene.ts', 'utf8')
  assert.ok(src.includes("if (m.def.ai === 'boss' && monSkillCasts(picked, POW_DEFAULT[picked.kind])) { await this.startMonCast(m, sk); return true }"))
  assert.ok(src.includes('if (sk) await this.fireMonSkill(m, sk, mul)'))
  assert.ok(src.includes('else await this.slam(m, mul)'))
  assert.ok(src.includes('m.castSteady = false; m.castSkill = undefined'), 'endMonCast clears the stored skill')
  assert.ok(src.includes("if (!sk || MON_CAST.skillFreeTurn > 0) this.heroGauge"), 'only the charge cast (or the flag) grants the free turn')
})

test('Hit vs Flee: physical slam / strike roll Hit (crit or not), magic ones stay unfleeable', () => {
  const src = readFileSync('src/scenes/BattleScene.ts', 'utf8')
  assert.ok(src.includes('!!m.def.slamMagic, m.def.slamMagic ? 999 : m.def.hit ?? 15'), 'slam')
  const strike = src.slice(src.indexOf('private async monStrike'), src.indexOf('/** v49 monster counter'))
  assert.ok(strike.includes('!!sk.magic, sk.magic ? 999 : m.def.hit ?? 15'), 'strike')
  assert.ok(!strike.includes('cr > 1 ? 999'), 'a crit strike no longer skips Flee')
})
