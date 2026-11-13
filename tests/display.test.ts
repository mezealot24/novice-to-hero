import test from 'node:test'
import assert from 'node:assert/strict'
import { BRIGHTNESS_STEPS, brightnessFilter, nextBrightness, parseBrightness } from '../src/display'

test('stored value: junk / missing = 1, numbers clamp into [dimmest step, 1]', () => {
  for (const raw of [null, undefined, '', '  ', 'abc', 'NaN', 'Infinity', '-Infinity']) assert.equal(parseBrightness(raw), 1)
  assert.equal(parseBrightness('0.6'), 0.6)
  assert.equal(parseBrightness('5'), 1)
  assert.equal(parseBrightness('0'), Math.min(...BRIGHTNESS_STEPS))
  assert.equal(parseBrightness('-3'), Math.min(...BRIGHTNESS_STEPS))
})

test('steps: start at 1, strictly dimmer, never black', () => {
  assert.equal(BRIGHTNESS_STEPS[0], 1)
  for (let i = 1; i < BRIGHTNESS_STEPS.length; i++) assert.ok(BRIGHTNESS_STEPS[i] < BRIGHTNESS_STEPS[i - 1])
  assert.ok(Math.min(...BRIGHTNESS_STEPS) >= 0.3, 'dimmest step must stay readable')
})

test('the button cycles through every step and wraps to 1', () => {
  let v = 1
  const seen = [v]
  for (let i = 0; i < BRIGHTNESS_STEPS.length; i++) { v = nextBrightness(v); seen.push(v) }
  assert.deepEqual(seen, [...BRIGHTNESS_STEPS, 1])
})

test('a value between steps goes to the next dimmer step; a stored odd value still escapes', () => {
  assert.equal(nextBrightness(0.7), 0.6)
  assert.equal(nextBrightness(0.45), 1)
  assert.equal(nextBrightness(0.3), 1)
})

test('filter text: nothing at 100%, brightness() below', () => {
  assert.equal(brightnessFilter(1), '')
  assert.equal(brightnessFilter(0.6), 'brightness(0.6)')
})
