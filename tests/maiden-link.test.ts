import test from 'node:test'
import assert from 'node:assert/strict'
import { maidenHpFloor, maidenSplit } from '../src/battle/maiden-link'
import { BATTLE } from '../src/data/battle-rules'

test('sends half of each hit to the Maiden by default', () => {
    assert.equal(BATTLE.maiden.share, 0.5)
    assert.deepEqual(maidenSplit(100, 0.5), { toMaiden: 50, toBoss: 50 })
    assert.deepEqual(maidenSplit(101, 0.5), { toMaiden: 50, toBoss: 51 })
})
test('keeps whole numbers that add back to the hit', () => {
    for (const d of [1, 2, 7, 999, 12345]) {
      const r = maidenSplit(d, 0.5)
      assert.equal(r.toMaiden + r.toBoss, d)
      assert.equal(Number.isInteger(r.toMaiden), true)
    }
    assert.deepEqual(maidenSplit(1, 0.5), { toMaiden: 0, toBoss: 1 })
})
test('clamps share and ignores non-positive hits', () => {
    assert.deepEqual(maidenSplit(10, 2), { toMaiden: 10, toBoss: 0 })
    assert.deepEqual(maidenSplit(10, -1), { toMaiden: 0, toBoss: 10 })
    assert.deepEqual(maidenSplit(0, 0.5), { toMaiden: 0, toBoss: 0 })
})
test('the boss cannot drop below 1 HP while the Maiden lives', () => {
    assert.equal(maidenHpFloor(-500, true), 1)
    assert.equal(maidenHpFloor(0, true), 1)
    assert.equal(maidenHpFloor(40, true), 40)
    assert.equal(maidenHpFloor(-5, false), -5)
})
