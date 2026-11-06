import test from 'node:test'
import assert from 'node:assert/strict'
import { hotkeySlot, mayCast, resourceIcon, skillButtonState, slotCenter, sweepAngles, tapAction, type SkillSlot } from '../src/battle/skill-hud'

const base = { cdLeft: 0, cdMax: 4, cost: 20, res: 50, booked: false, manual: false }

test('ready: no cooldown, enough resource', () => {
  const s = skillButtonState(base)
  assert.deepEqual(s, { ready: true, greyed: false, short: false, sweep: 0, turns: 0, booked: false })
})

test('cooldown: sweep is the share left, big number is the turns left', () => {
  const s = skillButtonState({ ...base, cdLeft: 3, cdMax: 4 })
  assert.equal(s.sweep, 0.75)
  assert.equal(s.turns, 3)
  assert.equal(s.ready, false)
  assert.equal(s.greyed, true)
  assert.equal(skillButtonState({ ...base, cdLeft: 9, cdMax: 4 }).sweep, 1) // never over-fills
  assert.equal(skillButtonState({ ...base, cdLeft: 2, cdMax: 0 }).sweep, 1) // unknown max: fully covered
})

test('short resource: greyed, cost goes red, no cooldown number', () => {
  const s = skillButtonState({ ...base, res: 10 })
  assert.equal(s.short, true)
  assert.equal(s.greyed, true)
  assert.equal(s.ready, false)
  assert.equal(s.turns, 0)
})

test('free skill is never short, even at 0 resource', () => {
  const s = skillButtonState({ ...base, cost: 0, res: 0 })
  assert.equal(s.short, false)
  assert.equal(s.ready, true)
})

test('blocked (silence / no charges) greys without turning the cost red', () => {
  const s = skillButtonState({ ...base, blocked: true })
  assert.equal(s.greyed, true)
  assert.equal(s.short, false)
  assert.equal(s.ready, false)
})

test('booked is passed through, also while the skill is still cooling', () => {
  assert.equal(skillButtonState({ ...base, booked: true }).booked, true)
  const s = skillButtonState({ ...base, booked: true, cdLeft: 2 })
  assert.equal(s.booked, true)
  assert.equal(s.ready, false)
})

test('booking rule: auto mode always casts, manual only when booked', () => {
  assert.equal(mayCast(false, false), true)
  assert.equal(mayCast(true, false), false)
  assert.equal(mayCast(true, true), true)
  assert.equal(tapAction(false), 'hint')
  assert.equal(tapAction(true), 'book')
})

test('hotkeys: 1-3 skills, 4 ult, digit row and numpad, nothing else', () => {
  assert.equal(hotkeySlot('Digit1'), 's1')
  assert.equal(hotkeySlot('Digit3'), 's3')
  assert.equal(hotkeySlot('Numpad2'), 's2')
  assert.equal(hotkeySlot('Digit4'), 'ult')
  assert.equal(hotkeySlot('Digit5'), null)
  assert.equal(hotkeySlot('KeyA'), null)
})

test('resource icons', () => {
  assert.equal(resourceIcon('mana'), '💧')
  assert.equal(resourceIcon('rage'), '🔥')
  assert.equal(resourceIcon('energy'), '⚡')
  assert.equal(resourceIcon(null), '')
})

test('sweep angles start at 12 o clock and clamp', () => {
  const a = sweepAngles(0.5)
  assert.equal(a.from, -Math.PI / 2)
  assert.ok(Math.abs(a.to - Math.PI / 2) < 1e-9)
  assert.equal(sweepAngles(2).to, -Math.PI / 2 + Math.PI * 2)
})

test('layout on 960x576: all circles inside the canvas, no overlap, touch targets big enough', () => {
  const slots: SkillSlot[] = ['s1', 's2', 's3', 'ult']
  const c = slots.map((s) => ({ s, ...slotCenter(s, 960, 576) }))
  for (const k of c) {
    assert.ok(k.x - k.r >= 0 && k.x + k.r <= 960 && k.y - k.r >= 0 && k.y + k.r <= 576, `${k.s} inside canvas`)
    assert.ok(k.s === 'ult' ? k.r * 2 >= 96 : k.r * 2 >= 56, `${k.s} touch size`)
  }
  for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++)
    assert.ok(Math.hypot(c[i].x - c[j].x, c[i].y - c[j].y) > c[i].r + c[j].r + 6, `${c[i].s}/${c[j].s} do not touch`)
})
