// Q 2026-11-19: "สกิลเวท ห้ามคริ by default" -> monster skills (strike / bolt, hero-kit casts) never crit unless the skill sets crit: true.
// Death knight ⚔️ ดาบมรณะ nerf: it was 6x its basic hit (one-shot 75% HP of a D3 hero with a crit).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MONSTERS } from '../src/data/game-data'
import { CRIT_RULES, BATTLE } from '../src/data/battle-rules'
import { statMonster, skillMul, scaleOf, skillAtLv } from '../src/data/mon-stats'

test('CRIT_RULES.monSkill is off: monster skills crit only with crit: true', () => {
  assert.equal(CRIT_RULES.monSkill, false)
  const src = readFileSync('src/scenes/BattleScene.ts', 'utf8')
  assert.match(src, /monSkillCrit\(m: Mon, sk: MonSkill\) \{ return sk\.crit \|\| CRIT_RULES\.monSkill \? this\.monCrit\(m\) : 1 \}/)
  // monStrike and monBolt go through monSkillCrit, not monCrit
  const strike = src.slice(src.indexOf('private async monStrike'), src.indexOf('/** v49 monster counter'))
  const bolt = src.slice(src.indexOf('private async monBolt'), src.indexOf('private async monStrike'))
  for (const [n, body] of [['strike', strike], ['bolt', bolt]] as const) {
    assert.ok(body.includes('monSkillCrit(m, sk)'), n)
    assert.ok(!body.includes('this.monCrit(m)'), `${n} still rolls monCrit`)
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
