import test from 'node:test'
import assert from 'node:assert/strict'
import { BATTLE, MONSTERS, type MonsterKind } from '../src/data/game-data'
import { castLv, casterOf, describeFormula, formulaDamage, lvVal, MON_SKILL_LV, skillLvBonus, type CasterSnap, type SkillFormula } from '../src/data/mon-skill-scale'
import { homeDungeon, legacyLevel, statNative } from '../src/data/mon-stats'

test('lvVal: flat, Dota array (last repeats), LoL / RO linear', () => {
  assert.equal(lvVal(5, 9), 5)
  assert.equal(lvVal([1, 2, 3], 2), 2)
  assert.equal(lvVal([1, 2, 3], 9), 3)
  assert.equal(lvVal({ base: 1.25, per: 0.25 }, 1), 1.25)
  assert.equal(lvVal({ base: 1.25, per: 0.25 }, 5), 2.25)
})

test('formula: base + ratios over caster stats and target HP', () => {
  const c: CasterSnap = { atk: 200, matk: 100, lv: 50, maxHp: 10000, stats: { str: 80, int: 30 } }
  const f: SkillFormula = { base: [100, 150], ratio: { atk: { base: 1.25, per: 0.25 }, str: 2, tgtMaxHp: 0.05, tgtMissing: 0.1 } }
  // Lv2: 150 + 1.5 x 200 + 2 x 80 + 5% x 2000 + 10% x 500
  assert.equal(formulaDamage(f, 2, c, { maxHp: 2000, hp: 1500 }), 150 + 300 + 160 + 100 + 50)
  assert.equal(describeFormula(f, 2), '150 + 150% P.ATK + 2×STR + 5% HP สูงสุดเป้าหมาย + 10% HP ที่เป้าหมายเสียไป')
  assert.equal(formulaDamage({}, 3, c, { maxHp: 1, hp: 1 }), 0)
})

test('casterOf: atk 1 = the monster normal hit', () => {
  const d = MONSTERS.deathknight, c = casterOf(d)
  assert.equal(c.atk, d.dmg * BATTLE.monDmgMul)
  assert.equal(c.matk, (d.matk ?? d.dmg) * BATTLE.monDmgMul)
})

test('skill Lv bonus: D1-D5 anchored at home Lv (home dungeon unchanged), D6+ absolute', () => {
  for (const k of Object.keys(MONSTERS) as MonsterKind[]) {
    const d = MONSTERS[k], home = homeDungeon(k)
    if (!home || statNative(k)) continue
    assert.equal(skillLvBonus(k, legacyLevel(k, d, { id: home }), d), 0, `${k} at home`)
  }
  const deep = (Object.keys(MONSTERS) as MonsterKind[]).find(statNative)!
  assert.equal(skillLvBonus(deep, 80, MONSTERS[deep]), Math.floor((80 - MON_SKILL_LV.nativeAnchor) / MON_SKILL_LV.every))
})

test('castLv: the bonus is capped at max, a skill written above max keeps its Lv', () => {
  assert.equal(castLv(1, 4), 5)
  assert.equal(castLv(1, 30), MON_SKILL_LV.max)
  assert.equal(castLv(50, 3), 50)
})
