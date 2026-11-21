// Q 2026-11-21 end-game HP rebalance: monster HP x2 / mini x4 / MVP x10 (ramped by Lv), hero VIT 25 HP, tank class bulk.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MONSTERS } from '../src/data/game-data'
import { heroStats, PER_POINT } from '../src/data/meta'
import { MON_STAT, monHpScale, statMonster } from '../src/data/mon-stats'
import { applyTankDr, isMonSkillTag, tankBulk } from '../src/data/tank-scale'

const { newSave } = await import('../src/save')

test('hpScale ramps x1 at fromLv to full x2 / x4 / x10 at fullLv', () => {
  const S = MON_STAT.hpScale
  assert.deepEqual([S.normal, S.mini, S.boss], [2, 4, 10])
  for (const t of ['normal', 'mini', 'boss'] as const) {
    assert.equal(monHpScale(t, 1), 1)
    assert.equal(monHpScale(t, S.fromLv), 1)
    assert.equal(monHpScale(t, S.fullLv), S[t])
    assert.equal(monHpScale(t, 120), S[t])
  }
  const mid = Math.round((S.fromLv + S.fullLv) / 2)
  assert.ok(monHpScale('boss', mid) > 1 && monHpScale('boss', mid) < 10)
})

test('end-game monsters: HP x tier scale, ATK unchanged; monster VIT still gives 10 HP', () => {
  const S = MON_STAT.hpScale, keep = { ...S }
  try {
    const a = statMonster(MONSTERS.seraph, 99)
    S.boss = 1
    const b = statMonster(MONSTERS.seraph, 99)
    assert.ok(Math.abs(a.hp / b.hp - keep.boss) < 0.01, `${b.hp} -> ${a.hp}`)
    assert.equal(a.dmg, b.dmg)
  } finally { Object.assign(S, keep) }
  assert.equal(MON_STAT.vitHp, 10)
  assert.equal(PER_POINT.vit.maxHp, 25)
})

test('hero gets 25 HP per VIT; tank lines get more and DR', () => {
  const mk = (job: string, job2?: string, job3?: string, vit = 51) =>
    heroStats({ ...newSave(), race: 'human', baseLevel: 99, job, jobLevel: 40, job2, job2Level: 50, job3, job3Level: 30, stats: { str: 1, vit, wis: 1, dex: 1, int: 1, luk: 1, agi: 1 }, equipped: {} } as never)
  const r1 = mk('thief', 'rogue', 'stalker', 1), r51 = mk('thief', 'rogue', 'stalker', 51)
  assert.equal(r51.tankDr, 0)
  assert.ok(r51.maxHp - r1.maxHp >= 25 * 50, `rogue +50 VIT = ${r51.maxHp - r1.maxHp}`)
  const lk = mk('swordsman', 'knight', 'lordknight')
  assert.equal(lk.tankDr, tankBulk('swordsman', 'knight', 'lordknight')!.dr)
  assert.ok(lk.tankSkillDr > lk.tankDr - 1e-9)
  assert.equal(tankBulk('thief', 'rogue', 'stalker'), undefined)
  assert.equal(tankBulk('swordsman', 'knight')!.name, 'เกราะอัศวิน')
})

test('tank DR: every hit, skill DR only on skill tags, never below 1', () => {
  assert.equal(applyTankDr(1000, 0.1, 0.2, false), 900)
  assert.equal(applyTankDr(1000, 0.1, 0.2, true), 720)
  assert.equal(applyTankDr(1, 0.5, 0.5, true), 1)
  assert.equal(applyTankDr(1000, 0, 0.2, false), 1000)
  for (const t of ['✦ ดาวตก', '🔮 ท่าร่าย', '🩸 Blood Razor', '💥 ระเบิดตาย (x)', '🖤 ความแค้นกัดกิน (x)']) assert.ok(isMonSkillTag(t), t)
  for (const t of ['โจมตี', 'โจมตี 1/2', 'คอมโบ', 'สวนกลับ', '⏳ Bullet Time']) assert.ok(!isMonSkillTag(t), t)
})

// Q 2026-11-21 "RO style" Hit vs Flee on the hero: floor 20% + mob penalty
import { FLEE_RULES, hitChance, mobFlee, monHitChance } from '../src/data/battle-rules'

test('monster -> hero hit: 80% + Hit - Flee, floor 20%, Thief fleeFloor lowers it at half rate, never below 5%', () => {
  assert.equal(monHitChance(100, 100), 0.8)
  assert.equal(monHitChance(100, 615), FLEE_RULES.floor)
  assert.ok(Math.abs(monHitChance(100, 615, 0.1) - 0.15) < 1e-9, 'Thief เงาบาง 15%')
  assert.ok(Math.abs(monHitChance(100, 615, 0.2) - 0.1) < 1e-9, 'fleeFloor cap 10%')
  assert.equal(monHitChance(100, 615, 5), FLEE_RULES.minFloor)
  assert.equal(monHitChance(500, 100), 0.98)
  assert.equal(hitChance(100, 615), 0.8, 'hero -> monster keeps the 80% floor')
})

test('RO mob penalty: 3+ monsters alive -> Flee -10% per extra (max -50%)', () => {
  assert.equal(mobFlee(300, 1), 300)
  assert.equal(mobFlee(300, 2), 300)
  assert.equal(mobFlee(300, 3), 270)
  assert.equal(mobFlee(300, 4), 240)
  assert.equal(mobFlee(300, 20), 150)
  assert.ok(monHitChance(200, 300, 0, 4) > monHitChance(200, 300, 0, 1))
})
