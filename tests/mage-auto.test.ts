import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAYER, type Stats } from '../src/data/game-data'
import { JOBS, MAGE_SPELL } from '../src/data/jobs'
import { autoCost, autoInfo, MAGE_AUTO_MIX, MAGE_CAST, magicPower, mageAutoMul, mageAutoRatio } from '../src/data/skill-math'
import { tree } from '../src/data/trees/mage'

const st = (over: Partial<Stats>): Stats => ({ ...PLAYER, ...over })
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)

test('Mage ลูกไฟระเบิด costs a single digit of Mana', () => {
  assert.ok(JOBS.mage.auto.cost >= 1 && JOBS.mage.auto.cost < 10)
  assert.equal(autoCost(JOBS.mage, st({ autoCostCut: 0 })), JOBS.mage.auto.cost)
})

test('cost floor: a cut never goes below 10 for classes that cost >= 10, and never raises a cheap class', () => {
  assert.equal(autoCost(JOBS.swordsman, st({ autoCostCut: 999 })), Math.min(10, JOBS.swordsman.auto.cost))
  assert.equal(autoCost(JOBS.mage, st({ autoCostCut: 999 })), JOBS.mage.auto.cost) // cheap: the floor is its own cost
  assert.ok(JOBS.swordsman.auto.cost >= 10 ? autoCost(JOBS.swordsman, st({ autoCostCut: 999 })) === 10 : true)
})

test('mix is 9 : 1 M.ATK : P.ATK and sums to 1', () => {
  near(MAGE_AUTO_MIX.matk, 0.9); near(MAGE_AUTO_MIX.atk, 0.1); near(MAGE_AUTO_MIX.matk + MAGE_AUTO_MIX.atk, 1)
})

test('ratio turns Pm (70 : 30) into the 90 : 10 mix exactly', () => {
  for (const [matk, atk] of [[100, 0], [100, 100], [300, 20], [50, 400]] as const) {
    const s = st({ matk, atk })
    near(magicPower(s) * mageAutoRatio(s), matk * 0.9 + atk * 0.1)
  }
})

test('a caster (M.ATK >> P.ATK) hits harder than before; a P.ATK-heavy build hits softer', () => {
  assert.ok(mageAutoRatio(st({ matk: 200, atk: 10 })) > 1)
  assert.ok(mageAutoRatio(st({ matk: 10, atk: 200 })) < 1)
  near(mageAutoRatio(st({ matk: 100, atk: 0 })), 0.9 / 0.7)
})

test('safe with zero power (no divide by zero) and scales the skill mul linearly', () => {
  assert.ok(Number.isFinite(mageAutoRatio(st({ matk: 0, atk: 0 }))))
  const s = st({ matk: 120, atk: 30 })
  near(mageAutoMul(s, 2), 2 * mageAutoMul(s, 1))
})

test('Wizard keeps its old 0.9 : 1 ratio against the base Mage', () => {
  near(MAGE_SPELL.autoMul / MAGE_CAST.fireMul, 0.4 / 0.45)
  assert.ok(MAGE_SPELL.autoMul < MAGE_CAST.fireMul)
})

test('skill panel shows the new mix and the Mana cost', () => {
  const rows = autoInfo('mage', st({ matk: 100, atk: 10 }))
  assert.ok(rows[0].value.includes(String(JOBS.mage.auto.cost)))
  assert.ok(rows.some((r) => r.label.includes('90%') && r.label.includes('10%')))
})

test('ร่ายไว talent now adds fire power instead of a dead cost cut', () => {
  const nd = tree.talents.find((x) => x.id === 'mg_t1b')!
  for (const r of [1, 2]) {
    const m = nd.mod(r)
    assert.ok((m.s1Pow ?? 0) > 0, `rank ${r} gives s1Pow`)
    assert.equal(m.autoCostCut ?? 0, 0)
  }
  assert.ok(nd.mod(2).s1Pow! > nd.mod(1).s1Pow!)
})

// ===== core passives: 🕯️ มนต์ถดถอย (debuff) + 🔮 ออร่าเวท (buff) =====
import { auraAmp, hexWeak, MAGE_PASSIVE } from '../src/data/skill-math'
import { TREE } from '../src/data/tree'

test('hex / aura formulas: 0 at Lv 0, grow with level, hex is capped', () => {
  assert.equal(hexWeak(0), 0); assert.equal(auraAmp(0), 0)
  assert.equal(hexWeak(-2), 0); assert.equal(auraAmp(-2), 0)
  assert.ok(hexWeak(2) > hexWeak(1) && hexWeak(3) > hexWeak(2))
  assert.ok(auraAmp(2) > auraAmp(1) && auraAmp(3) > auraAmp(2))
  assert.equal(hexWeak(999), MAGE_PASSIVE.hex.cap)
  assert.ok(MAGE_PASSIVE.hex.cap < 1, 'a hexed monster must still hit')
})

test('both passives live in the core column (tier 0), stretched to 5 levels, full Lv 5 = old Lv 3', () => {
  for (const [id, key, f] of [['mage_core4', 'mgHex', hexWeak], ['mage_core5', 'mgAura', auraAmp]] as const) {
    const nd = TREE.find((x) => x.id === id)!
    assert.ok(nd, `${id} is in the web`)
    assert.equal(nd.branch, 'mage_core'); assert.equal(nd.tier, 0); assert.equal(nd.max, 5)
    assert.equal(nd.mod(0)[key] ?? 0, 0)
    near(nd.mod(5)[key]!, f(3))
    let prev = 0
    for (let lv = 1; lv <= 5; lv++) { const v = nd.mod(lv)[key]!; assert.ok(Number.isFinite(v) && v > prev, `${id} Lv ${lv} grows`); prev = v; assert.ok(nd.desc(lv).length > 10) }
  }
})

test('aura only boosts damage turns it lasts, and the debuff / buff names say what they are', () => {
  assert.ok(MAGE_PASSIVE.aura.turns >= 1 && MAGE_PASSIVE.hex.turns >= 1)
  assert.ok(TREE.find((x) => x.id === 'mage_core4')!.desc(5).includes('Debuff'))
  assert.ok(TREE.find((x) => x.id === 'mage_core5')!.desc(5).includes('Buff'))
})
