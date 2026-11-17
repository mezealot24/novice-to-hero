import test from 'node:test'
import assert from 'node:assert/strict'
import { MONSTERS } from '../src/data/game-data'
import { classKit, classSkills, HERO_KIT_RULES, HERO_SKILL_BOOK, HERO_SKILL_IDS, heroSkillsOf, heroSkillSteps, isHeroSkillId, mirrorKit, resolveHeroKit, type HeroKit } from '../src/data/hero-skill-book'
import { JOBS } from '../src/data/jobs'
import { JOB2 } from '../src/data/jobs2'
import { SKILL2 } from '../src/data/skill2'
import { chooseHeroSkill, newKitState, scoreSkill, spendKit, tickKit, type KitCtx } from '../src/battle/hero-skill-engine'

const calm: KitCtx = { turn: 5, selfHp: 1, selfShield: false, selfBuffed: false, lowestHp: 1, heroHp: 1, heroFx: {} }
const zero = () => 0

test('book: every hero skill has an entry (5 base x 5 + 10 2nd jobs x 2) with names from the hero data', () => {
  assert.equal(HERO_SKILL_IDS.length, 5 * 5 + Object.keys(JOB2).length * 2)
  for (const s of SKILL2) { assert.ok(isHeroSkillId(s.id)); assert.equal(HERO_SKILL_BOOK[s.id].name, s.name); assert.equal(HERO_SKILL_BOOK[s.id].cd, s.cd) }
  assert.equal(HERO_SKILL_BOOK['mage.ult'].name, JOBS.mage.ult.name)
  assert.equal(HERO_SKILL_BOOK['knight.s3'].name, JOB2.knight.skill3.name)
  assert.equal(HERO_SKILL_BOOK['swordsman.s1'].cd, HERO_KIT_RULES.s1Cd)
  for (const id of HERO_SKILL_IDS) {
    const e = HERO_SKILL_BOOK[id]
    assert.ok(e.steps.length > 0, id)
    assert.ok(e.cost > 0 && e.cd >= 1, id)
  }
})

test('steps become castable MonSkills (every 1, named, Lv carried)', () => {
  const st = heroSkillSteps('swordsman.ult', 4)
  assert.equal(st.length, 2)
  assert.deepEqual(st.map((s) => s.kind), ['strike', 'shield'])
  assert.ok(st.every((s) => s.every === 1 && s.lv === 4 && s.name.includes(JOBS.swordsman.ult.name)))
  assert.equal(heroSkillSteps('mage.s1')[0].lv, undefined)
})

test('heroSkillsOf: a 2nd job also gets its parent class skills', () => {
  const k = heroSkillsOf('knight')
  assert.ok(k.includes('knight.s3') && k.includes('swordsman.s1') && k.includes('sw_guard'))
  assert.ok(!k.includes('berserker.s3') && !k.includes('mage.s1'))
})

test('mana + cooldown: cast, wait the cooldown, regen caps at max', () => {
  const kit: HeroKit = { skills: ['mage.s1'], startMana: 30, regen: 10, mana: 50 }
  const st = newKitState(kit)
  assert.equal(chooseHeroSkill(kit, st, calm, zero), 'mage.s1')
  spendKit(st, kit, 'mage.s1')
  assert.equal(st.mana, 30 - HERO_KIT_RULES.cost.s1)
  assert.equal(chooseHeroSkill(kit, st, calm, zero), null) // on cooldown
  tickKit(st, kit) // cd 2 -> 1
  assert.equal(chooseHeroSkill(kit, st, calm, zero), null)
  tickKit(st, kit) // ready
  assert.equal(chooseHeroSkill(kit, st, calm, zero), 'mage.s1')
  for (let i = 0; i < 10; i++) tickKit(st, kit)
  assert.equal(st.mana, 50)
  st.mana = 0
  assert.equal(scoreSkill('mage.s1', kit, st, calm), null) // can't afford
})

test('roles gate: heal only when hurt, shield only without one, debuff not twice, ult not on turn 1', () => {
  const kit: HeroKit = { skills: ['cleric.s1', 'sw_guard', 'sw_taunt', 'mage.ult'], mana: 999, startMana: 999 }
  const st = newKitState(kit)
  assert.equal(scoreSkill('cleric.s1', kit, st, calm), null)
  assert.ok((scoreSkill('cleric.s1', kit, st, { ...calm, lowestHp: 0.3 }) ?? 0) > 0)
  assert.equal(scoreSkill('sw_guard', kit, st, calm), null) // full HP
  assert.equal(scoreSkill('sw_guard', kit, st, { ...calm, selfHp: 0.5, selfShield: true }), null)
  assert.ok((scoreSkill('sw_guard', kit, st, { ...calm, selfHp: 0.5 }) ?? 0) > 0)
  assert.equal(scoreSkill('sw_taunt', kit, st, { ...calm, heroFx: { weaken: 2, armorBreak: 1 } }), null)
  assert.ok((scoreSkill('sw_taunt', kit, st, { ...calm, heroFx: { weaken: 2 } }) ?? 0) > 0)
  assert.equal(scoreSkill('mage.ult', kit, st, { ...calm, turn: 1 }), null)
  // a badly hurt ally: the support pick is the heal over everything else
  assert.equal(chooseHeroSkill({ ...kit, style: 'support' }, st, { ...calm, lowestHp: 0.2 }, zero), 'cleric.s1')
})

test('style + ult bonus: an aggressive kit opens with its Ult when ready', () => {
  const kit: HeroKit = { skills: ['archer.s1', 'ar_hawk', 'archer.ult'], style: 'aggressive', mana: 999, startMana: 999 }
  const st = newKitState(kit)
  assert.equal(chooseHeroSkill(kit, st, calm, zero), 'archer.ult')
  spendKit(st, kit, 'archer.ult')
  assert.notEqual(chooseHeroSkill(kit, st, calm, zero), 'archer.ult')
  kit.cdMul = 0.5
  spendKit(st, kit, 'ar_hawk')
  assert.equal(st.cd.ar_hawk, Math.round(HERO_SKILL_BOOK.ar_hawk.cd * 0.5))
})

test('mirrorKit: the player kit (s1 + picked s2 + 2nd-job s3 + the Ult they have)', () => {
  assert.deepEqual(mirrorKit('mage', 'mg_nova').skills, ['mage.s1', 'mg_nova', 'mage.ult'])
  assert.deepEqual(mirrorKit('swordsman', 'sw_guard', 'knight').skills, ['swordsman.s1', 'sw_guard', 'knight.s3', 'knight.ult'])
  assert.deepEqual(mirrorKit('mage', 'sw_guard', 'knight').skills, ['mage.s1', 'mage.ult']) // wrong-class s2 / job2 ignored
  assert.deepEqual(mirrorKit('novice').skills, [])
  assert.equal(mirrorKit('cleric').style, 'support')
})

test('MonsterDef.heroKit entries only name real hero skills', () => {
  for (const [kind, d] of Object.entries(MONSTERS)) {
    if (!d.heroKit) continue
    const k = resolveHeroKit(d.heroKit, { job: 'mage' })
    assert.ok(k.skills.length > 0, kind)
    for (const id of k.skills) assert.ok(isHeroSkillId(id), `${kind}: ${id}`)
  }
})

test('class kit: every skill of the class, at the classLv knob, no monster-level bonus', () => {
  assert.deepEqual(classSkills('cleric'), ['cleric.s1', 'cl_renew', 'cl_bless', 'cl_spear', 'cleric.ult'])
  assert.deepEqual(classSkills('knight'), ['swordsman.s1', 'sw_guard', 'sw_blood', 'sw_taunt', 'knight.s3', 'knight.ult'])
  const k = classKit({ cls: 'mage', style: 'aggressive' })
  assert.equal(k.lv, HERO_KIT_RULES.classLv)
  assert.equal(k.lvBonus, HERO_KIT_RULES.classLvBonus)
  assert.equal(k.style, 'aggressive')
  assert.equal(classKit({ cls: 'mage', lv: 5 }).lv, 5) // per-monster override
  assert.deepEqual(resolveHeroKit('mirror', { job: 'thief', s2: 'th_wound' }).skills, ['thief.s1', 'th_wound', 'thief.ult'])
})

test('D14: every class clone carries its whole class kit', () => {
  const want: Record<string, string[]> = {
    clonesword: classSkills('swordsman'), clonearcher: classSkills('archer'), clonemage: classSkills('mage'),
    clonecleric: classSkills('cleric'), clonethief: classSkills('thief'), cloneknight: classSkills('knight'), clonewizard: classSkills('wizard'),
  }
  for (const [kind, ids] of Object.entries(want)) {
    const d = MONSTERS[kind as keyof typeof MONSTERS]
    assert.ok(d.heroKit, kind)
    const k = resolveHeroKit(d.heroKit!, { job: 'mage' })
    assert.deepEqual(k.skills, ids, kind)
    assert.equal(k.lv, HERO_KIT_RULES.classLv, kind)
  }
})
