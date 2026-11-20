// Q 2026-11-19: "สกิลเวท ห้ามคริ by default" -> monster skills (strike / bolt, hero-kit casts) never crit unless the skill sets crit: true.
// Q 2026-11-21: "ต้องแยก Skills crit แบบฝั่ง hero" -> MonsterDef.skillCrit (default 0) is the skill crit; crit: true adds the basic crit.
// Death knight ⚔️ ดาบมรณะ nerf: it was 6x its basic hit (one-shot 75% HP of a D3 hero with a crit).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MONSTERS } from '../src/data/game-data'
import { CRIT_RULES, BATTLE, monSkillCritRate } from '../src/data/battle-rules'
import { statMonster, skillMul, scaleOf, skillAtLv } from '../src/data/mon-stats'

test('monster skill crit is its own stat (Q 2026-11-21): skillCrit default 0, crit: true also rolls the basic crit', () => {
  assert.ok(!('monSkill' in CRIT_RULES), 'one rule: CRIT_RULES.monSkill is gone')
  assert.equal(monSkillCritRate({ crit: 0.3 }, {}), 0) // basic crit (incl. keen / y_reaper / LUK) never leaks into skills
  assert.equal(monSkillCritRate({}, {}), 0)
  assert.equal(monSkillCritRate({ crit: 0.3, skillCrit: 0.1 }, {}), 0.1)
  assert.equal(monSkillCritRate({ crit: 0.3, skillCrit: 0.1 }, { crit: true }), 0.3) // opt-in: max(skillCrit, crit)
  assert.equal(monSkillCritRate({ crit: 0.05, skillCrit: 0.2 }, { crit: true }), 0.2)
  assert.equal(monSkillCritRate({ skillCrit: -1 }, {}), 0)
  const src = readFileSync('src/scenes/BattleScene.ts', 'utf8')
  assert.match(src, /monSkillCrit\(m: Mon, sk: MonSkill\) \{ return this\.monCrit\(m, monSkillCritRate\(m\.def, sk\)\) \}/)
  // monStrike and monBolt go through monSkillCrit, not the basic monCrit
  const strike = src.slice(src.indexOf('private async monStrike'), src.indexOf('/** v49 monster counter'))
  const bolt = src.slice(src.indexOf('private async monBolt'), src.indexOf('private async monStrike'))
  for (const [n, body] of [['strike', strike], ['bolt', bolt]] as const) {
    assert.ok(body.includes('monSkillCrit(m, sk)'), n)
    assert.ok(!body.includes('this.monCrit(m)'), `${n} still rolls monCrit`)
  }
})

test('no monster data sets a skill crit by default (skillCrit absent, every statted def too)', () => {
  for (const [k, d] of Object.entries(MONSTERS)) {
    assert.ok(!d.skillCrit, `${k} skillCrit`)
    assert.ok(!statMonster(d, 30).skillCrit, `${k} statted skillCrit`)
  }
})

test('death knight ดาบมรณะ at D3 boss Lv 13 stays within ~3.5x its basic hit (alone included)', () => {
  const m = statMonster(MONSTERS.deathknight, 13)
  const sk = skillAtLv(m.skills!.find((s) => s.name.includes('ดาบมรณะ'))!)
  const hit = m.dmg * BATTLE.monDmgMul * (sk.pow ?? 1.3) * skillMul(m, scaleOf(sk)) * (sk.alone ?? 1)
  const basic = m.dmg * BATTLE.monDmgMul
  assert.ok(hit / basic <= 3.5, `ratio ${(hit / basic).toFixed(2)}`)
  assert.ok(!sk.crit)
})

test('hero: a magic skill with no skillCrit never crits either (Q 2026-11-19 picked "Need skillCrit too")', async () => {
  const { hitText } = await import('../src/data/skill-math')
  const { PLAYER } = await import('../src/data/stats')
  const st = { ...PLAYER, skillCrit: 0, spellCrit: 0.3, crit: 0.3 }
  assert.ok(!hitText(st, 1, true, true).includes('คริ'), 'magic skill without skillCrit')
  assert.ok(!hitText(st, 1, false, true).includes('คริ'), 'physical skill without skillCrit')
  assert.ok(hitText({ ...st, skillCrit: 0.05 }, 1, true, true).includes('คริ'), 'magic skill with skillCrit')
  const src = readFileSync('src/scenes/BattleScene.ts', 'utf8')
  assert.ok(src.includes('if (skillCrit <= 0) return 0'), 'critRateFor gates every skill on skillCrit')
})
