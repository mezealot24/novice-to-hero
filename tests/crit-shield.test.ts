import test from 'node:test'
import assert from 'node:assert/strict'
import { newSave, setSave } from '../src/save'
import { critShieldOf, heroStats, PER_POINT, totalBase } from '../src/data/meta'
import { COMBO, monCritRate } from '../src/data/battle-rules'
import { deathText, type DeathRec } from '../src/data/combat-log'
import { STAT_INFO } from '../src/data/statInfo'

// Q 2026-11-21 "แบบ RO": the hero's LUK subtracts from the monster's crit chance (1% per 5 LUK, linear, capped).
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)

test('monCritRate: subtracts the crit shield, clamps at 0, a negative shield never raises the rate', () => {
  near(monCritRate(0.3, 0.12), 0.18)
  assert.equal(monCritRate(0.1, 0.2), 0)
  assert.equal(monCritRate(0, 0.2), 0)
  assert.equal(monCritRate(0.25, 0), 0.25)
  assert.equal(monCritRate(0.25, -0.1), 0.25)
})

test('critShieldOf: RO rule 0.2% per LUK, linear, capped at COMBO.critShieldCap', () => {
  assert.equal(PER_POINT.luk.critShield, 0.002)
  assert.equal(COMBO.critShieldCap, 0.5)
  assert.equal(critShieldOf(0), 0)
  near(critShieldOf(5), 0.01)
  near(critShieldOf(100), 0.2)
  near(critShieldOf(200), 0.4)
  assert.equal(critShieldOf(1000), COMBO.critShieldCap)
  near(critShieldOf(100, 0.1), 0.3) // a gear mod would stack on top
  assert.equal(critShieldOf(240, 0.2), COMBO.critShieldCap) // still capped
  // with the cap, any monster crit <= the shield never lands
  assert.equal(monCritRate(0.4, critShieldOf(1000)), 0)
})

test('heroStats: critShield follows total LUK; Crit DR is unchanged by the new stat', () => {
  const s = newSave('t', 'human')
  Object.assign(s, { job: 'thief', jobLevel: 10 })
  setSave(s)
  const a = heroStats(s)
  near(a.critShield, critShieldOf(totalBase(s).luk))
  const crit0 = a.critDR
  s.stats.luk += 100
  setSave(s)
  const b = heroStats(s)
  near(b.critShield - a.critShield, 0.2)
  near(b.critShield, critShieldOf(totalBase(s).luk))
  assert.ok(b.critDR >= crit0) // Crit DR still from its own x/(x+K) curve
  s.stats.luk += 1000
  setSave(s)
  assert.equal(heroStats(s).critShield, COMBO.critShieldCap)
})

test('LUK stat text explains the crit shield in Thai; death log header shows it (and old logs without it still print)', () => {
  const line = STAT_INFO.luk.generic.find((l) => typeof l === 'function' && l(100, 99, 0).includes('ลดโอกาสคริของมอน'))
  assert.ok(line && typeof line === 'function')
  assert.equal(line(100, 99, 0), 'ลดโอกาสคริของมอน 1% ต่อ 5 แต้ม (สูงสุด 50%, ตอนนี้ 20%)')
  const d: DeathRec = {
    at: 't', mode: 'normal', where: 'D1', floor: 0, reason: 'dead',
    hero: { job: 'thief', lv: 10, baseLv: 10, power: 1, offense: 1, survival: 1, maxHp: 100, def: 0, mdef: 0, guard: 0, flee: 0, luckyDodge: 0, autoGuard: 0, critDR: 0.35, critShield: 0.12 },
    affixes: [], fightTurns: 1, enrage: 1, hits: [],
  }
  assert.ok(deathText(d).includes('· Crit DR 35% · กันคริ 12%'))
  const old = deathText({ ...d, hero: { ...d.hero, critShield: undefined } })
  assert.ok(old.includes('Crit DR 35%') && !old.includes('กันคริ'))
})
