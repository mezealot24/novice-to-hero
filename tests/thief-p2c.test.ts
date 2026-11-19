// Thief P2'c Ult x เกจเงา (design/p2/MAIN-VS-REV4.md §4 / §5.2 + owner answers Q1 / Q2): Ult budget in 2 states (ร่างเงา on / off),
// Global Ult CD cap, B3 crit-dmg bracket, thief_b = gauge modifiers, thief_u line, talents rows 1 / 3. Run: node tools/test.mjs thief-p2c
import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAYER, type Stats } from '../src/data/game-data'
import { CRIT_RULES } from '../src/data/battle-rules'
import { readFileSync } from 'node:fs'
import { condCritB3, KIT, thiefOnHitEff, thiefUltBudget, thiefUltCondCritDmg, thiefUltCritRate, thiefUltFinisher, thiefUltHitCount, ultCdCut, type UltHero } from '../src/data/skill-math'

const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)
const st = (o: Partial<Stats> = {}): Stats => ({ ...PLAYER, ...o })
/** Live ceiling (Q2): main's best เงาพริ้ว = th_t3b มีดรัว R2 (+3 stabs = 7), no P2'c stats, same hero, same gauge state. */
const LIVE_T3B_R2 = 3
const ceiling = (h: UltHero, shadow: boolean, gearHits = 0) => thiefUltBudget(st({ ultHits: LIVE_T3B_R2 + gearHits }), h, shadow)

test('budget model: without P2\'c stats it is the live Ult (n stabs x expected crit), ร่างเงา = every stab a full crit', () => {
  const h: UltHero = { skillCrit: 0.2, critMul: 2 }
  near(thiefUltBudget(st(), h, false), 4 * (1 + 0.2 * 1), 'off: 4 stabs, p = skillCrit')
  near(thiefUltBudget(st(), h, true), 4 * 2, 'on: 4 sure crits')
  near(ceiling(h, false), 7 * 1.2); near(ceiling(h, true), 14)
  near(thiefUltBudget(st(), { skillCrit: 0, critMul: 3 }, false), 4, 'crit rework: no skillCrit = a physical Ult never crits')
})

test('Ult crit rate: thief_u1 / th_t3a count as skillCrit, skill cap holds', () => {
  assert.equal(thiefUltCritRate(0, st()), 0)
  near(thiefUltCritRate(0, st({ thUltCrit: 0.05 })), 0.05, 'Ult bonus alone opens Ult crits')
  near(thiefUltCritRate(0.1, st({ thUltCrit: 0.05, thUltExecCrit: 0.08 })), 0.23)
  near(thiefUltCritRate(0.58, st({ thUltCrit: 0.05 })), CRIT_RULES.cap.skillCrit, 'cap')
})

test('Ult-own conditional crit dmg: kinds count up to the max, low-HP terms, one cap', () => {
  const s = st({ thUltCondCritDmg: 0.02, thExecUlt: 0.04, thUltExecDmg: 0.1 })
  assert.equal(thiefUltCondCritDmg(st(), 4, 0), 0)
  near(thiefUltCondCritDmg(st({ thUltCondCritDmg: 0.02 }), 5, 1), 0.02 * KIT.thiefUltKindsMax, 'kinds capped')
  near(thiefUltCondCritDmg(st({ thExecUlt: 0.04 }), 0, KIT.thiefExecBelow - 0.01), 0.04)
  assert.equal(thiefUltCondCritDmg(st({ thExecUlt: 0.04 }), 0, KIT.thiefExecBelow), 0, 'not at the line')
  near(thiefUltCondCritDmg(st({ thUltExecDmg: 0.1 }), KIT.thiefKindsAt, 1), 0.1, 'th_t3a: kinds open it at full HP')
  near(thiefUltCondCritDmg(s, 3, 0), KIT.thiefUltCondCap, 'everything -> cap')
})

test('On-Hit share and the closing stab', () => {
  assert.equal(thiefOnHitEff(st()), 0)
  near(thiefOnHitEff(st({ thUltOnHit: 0.12 })), KIT.thiefOnHitBase + 0.12)
  near(thiefOnHitEff(st({ thUltOnHit: 0.12, thUltOnHitTal: 0.05 })), KIT.thiefOnHitCap, 'cap')
  assert.deepEqual(thiefUltFinisher(st(), 9), { mul: 0, sure: false })
  assert.deepEqual(thiefUltFinisher(st({ thUltFinisher: 1 }), KIT.thiefFinisherAt - 1), { mul: 0, sure: false })
  assert.deepEqual(thiefUltFinisher(st({ thUltFinisher: 1 }), KIT.thiefFinisherAt), { mul: KIT.thiefFinisherMul, sure: true })
  assert.deepEqual(thiefUltFinisher(st({ thUltKillFinisher: 0.5 }), 0), { mul: 0.5, sure: false }, 'th_t3a: always, rolls crit')
  assert.equal(thiefUltHitCount(st({ ultHits: 2 })), KIT.thiefUltHits + 2)
})

test('Global Ult CD cap: per hero turn budget, floor in the cast turn, never negative', () => {
  assert.equal(KIT.thiefUltCdCutCap, 2)
  assert.equal(ultCdCut(4, 1, 2, false), 1)
  assert.equal(ultCdCut(4, 3, 2, false), 2, 'turn cap')
  assert.equal(ultCdCut(1, 2, 2, false), 1, 'not below 0')
  assert.equal(ultCdCut(0, 1, 2, false), 0)
  assert.equal(ultCdCut(4, 1, 0, false), 0, 'budget spent')
  assert.equal(ultCdCut(4, 5, 5, true), 4 - KIT.thiefUltCdFloor, 'cast turn: CD floor')
  assert.equal(ultCdCut(KIT.thiefUltCdFloor, 1, 2, true), 0)
  // three sources in one turn (th_t2a + thief_b3 + Rogue Kill Reset) share one budget
  let cd = 6, left = KIT.thiefUltCdCutCap
  for (const want of [1, 1, 1]) { const c = ultCdCut(cd, want, left, false); cd -= c; left -= c }
  assert.equal(cd, 6 - KIT.thiefUltCdCutCap)
})

test('B3 crit dmg bracket (R4.6): terms add, one cap, never negative · hardcoded thExecute x1.5 is gone', () => {
  assert.equal(condCritB3([]), 0)
  near(condCritB3([0.25, 0.15]), 0.4)
  near(condCritB3([0.25, 0.36, 0.15]), KIT.thiefCondCritDmgCap, 'Shroud ★ + rg_x2 Lv5 + Ult-own -> cap 0.75')
  near(condCritB3([-1, 0.1]), 0.1)
  const scene = readFileSync('src/scenes/BattleScene.ts', 'utf8')
  assert.ok(!/thExecute/.test(scene), 'BattleScene no longer reads the retired thExecute')
  // the Ult budget sees the other B3 terms on both sides: the Ult-own share shrinks near the cap
  const h: UltHero = { skillCrit: 0, critMul: 2, b3Other: 0.7 }
  near(thiefUltBudget(st({ thUltCondCritDmg: 0.05 }), h, true), 4 * (2 + 0.75))
})
