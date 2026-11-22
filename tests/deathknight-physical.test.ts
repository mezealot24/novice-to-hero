// Q 2026-11-22 "อัศวินแห่งความตาย เปลี่ยนท่าและ สกิลทั้งหมดเป็นกายภาพ": every damaging move of the death knight is physical
// (vs DEF, rolls Hit vs Flee): basic hit, charged slam ดาบมรณะ! ฟันกวาดวิญญาณ, skill ⚔️ ดาบมรณะ, and the vengeance DoT (ATK, not M.ATK).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MONSTERS } from '../src/data/game-data'
import { BATTLE } from '../src/data/battle-rules'
import { POW_DEFAULT, slamScaleOf, SKILL_SCALE } from '../src/data/mon-stats'
import { monSkillCasts, monSkillIsMagicHit } from '../src/data/mon-cast'

test('death knight: no magic move left', () => {
  const d = MONSTERS.deathknight
  assert.ok(!d.magic, 'basic hit physical')
  assert.ok(!d.slamMagic, 'charged slam physical')
  assert.equal(slamScaleOf(d).stat, SKILL_SCALE.slam.phys, 'slam scales with STR')
  assert.ok(d.charge, 'still a breakable charge cast (#152)')
  for (const sk of d.skills ?? []) {
    assert.ok(!monSkillIsMagicHit(sk), `${sk.name} physical`)
    assert.ok(!monSkillCasts(sk, POW_DEFAULT[sk.kind]), `${sk.name} fires at once (only magic skills are cast)`)
  }
  const strike = d.skills!.find((s) => s.kind === 'strike')!
  assert.equal(strike.pow, 2.2, 'no-nerf: pow unchanged'); assert.equal(strike.alone, 1.5)
})

test('vengeance DoT: ATK x dotAtk, physical', () => {
  assert.equal(BATTLE.vengeance.dotAtk, 0.35, "same raw DoT as M.ATK x 0.3")
  assert.ok(!('dotMatk' in BATTLE.vengeance))
  const src = readFileSync('src/scenes/BattleScene.ts', 'utf8')
  assert.match(src, /V\.dotPct \+ m\.def\.dmg \* V\.dotAtk, false, 999/)
})
