// Q 2026-11-24 Skill 4: Knight 🌀 Spiral Pierce (Rell Q shatter + stun, Serpent's Fang passive) + the 🔓 Break trial toggle.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { breakAmpOf, breakOn, breakTurns, fangSoak, s4Shatter, s4StunKind, s4Target, s4Unlocked } from '../src/data/skill4'
import { KIT, KIT2 } from '../src/data/skill-math'
import { JOB2 } from '../src/data/jobs2'
import { hotkeySlot, slotCenter, SKILL_HUD } from '../src/battle/skill-hud'

const S = KIT2.knight.s4

test('Spiral Pierce data: Mana 20, CD 4, Knight only, unlocks at Job2 Lv 20', () => {
  const sk = JOB2.knight.skill4!
  assert.equal(sk.cost, 20)
  assert.equal(sk.cd, 4)
  assert.equal(sk.unlockLv, 20)
  assert.equal(JOB2.berserker.skill4, undefined)
  assert.equal(s4Unlocked('knight', 19), false)
  assert.equal(s4Unlocked('knight', 20), true)
  assert.equal(s4Unlocked('knight', 31), true)
  assert.equal(s4Unlocked('berserker', 50), false)
  assert.equal(s4Unlocked(undefined, 50), false)
})

test('shatter: normal / mini lose the whole shield, boss keeps half of its phase shield, no shield = no shatter', () => {
  assert.deepEqual(s4Shatter(500, 'normal'), { shield: 0, shattered: true })
  assert.deepEqual(s4Shatter(500, 'mini'), { shield: 0, shattered: true })
  assert.deepEqual(s4Shatter(2100, 'boss'), { shield: Math.floor(2100 * (1 - S.bossShield)), shattered: true })
  assert.deepEqual(s4Shatter(0, 'boss'), { shield: 0, shattered: false })
})

test('stun: normal / mini lose a turn, a boss loses its cast instead', () => {
  assert.equal(s4StunKind('normal'), 'turn')
  assert.equal(s4StunKind('mini'), 'turn')
  assert.equal(s4StunKind('boss'), 'cast')
})

test('target: boss > mini > front', () => {
  const tier = (m: { t: 'normal' | 'mini' | 'boss' }) => m.t
  const a = { t: 'normal' as const }, b = { t: 'mini' as const }, c = { t: 'boss' as const }
  assert.equal(s4Target([a, b, c], tier), c)
  assert.equal(s4Target([a, b], tier), b)
  assert.equal(s4Target([a], tier), a)
  assert.equal(s4Target([], tier), undefined)
})

test("🐍 Fang: shields drain x1.5, only the shield part grows; no fang = the old soak", () => {
  assert.deepEqual(fangSoak(300, 100, 0, 0.5), { absorbed: 150, remShield: 150, remDmg: 0 })
  assert.deepEqual(fangSoak(60, 100, 0, 0.5), { absorbed: 60, remShield: 0, remDmg: 60 }) // 40 dmg breaks 60 shield, 60 goes to HP
  assert.deepEqual(fangSoak(60, 100, 0, 0), { absorbed: 60, remShield: 0, remDmg: 40 })
  assert.deepEqual(fangSoak(0, 100, 0, 0.5), { absorbed: 0, remShield: 0, remDmg: 100 })
  assert.deepEqual(fangSoak(300, 100, 0, 0.5, true), { absorbed: 0, remShield: 300, remDmg: 100 }) // pure skips the shield
})

test('🔓 Break: off by default; when on, basic / Skill 1 / Skill 3 get it, the ult window, Skill 2 and DoT never do', () => {
  assert.equal(breakOn(), false)
  assert.equal(breakTurns(), 0)
  const hit = { turns: 2, tier: 'normal' as const, src: 'basic', slot: null, inUlt: false, dot: false }
  assert.equal(breakAmpOf(hit), 0)
  const prev = KIT.break4.on
  try {
    KIT.break4.on = 1
    assert.equal(breakTurns(), KIT.break4.turns)
    assert.equal(breakAmpOf(hit), KIT.break4.amp)
    assert.equal(breakAmpOf({ ...hit, tier: 'boss' }), KIT.break4.bossAmp)
    assert.equal(breakAmpOf({ ...hit, src: 'skill', slot: 's1' }), KIT.break4.amp)
    assert.equal(breakAmpOf({ ...hit, src: 'skill', slot: null }), KIT.break4.amp) // Skill 3 casts with no crit slot
    assert.equal(breakAmpOf({ ...hit, src: 'skill', slot: 'ult' }), 0)
    assert.equal(breakAmpOf({ ...hit, src: 'skill', slot: 's2' }), 0)
    assert.equal(breakAmpOf({ ...hit, inUlt: true }), 0)
    assert.equal(breakAmpOf({ ...hit, src: 'ult' }), 0)
    assert.equal(breakAmpOf({ ...hit, dot: true }), 0)
    assert.equal(breakAmpOf({ ...hit, turns: 0 }), 0)
  } finally {
    KIT.break4.on = prev
  }
})

test('HUD: hotkey 5 = Skill 4, the 4-button arc does not overlap, the 3-button layout is unchanged', () => {
  assert.equal(hotkeySlot('Digit5'), 's4')
  assert.equal(hotkeySlot('Numpad5'), 's4')
  assert.equal(hotkeySlot('Digit4'), 'ult')
  assert.equal(hotkeySlot('Digit6'), null)
  const W = 1280, H = 720
  assert.deepEqual(slotCenter('s2', W, H), slotCenter('s2', W, H, false))
  const four = (['s1', 's2', 's3', 's4'] as const).map((s) => slotCenter(s, W, H, true))
  const ult = slotCenter('ult', W, H, true)
  for (let i = 1; i < four.length; i++) {
    const a = four[i - 1], b = four[i]
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r, `buttons ${i - 1}/${i} overlap`)
  }
  for (const b of four) assert.ok(Math.hypot(b.x - ult.x, b.y - ult.y) > b.r + ult.r)
  assert.equal(four[0].r, SKILL_HUD.four.smallR)
})
