import test from 'node:test'
import assert from 'node:assert/strict'
import { forged, ITEMS, itemStatLine, statEntries } from '../src/data/meta'
import { replaceSlot, type SaveData } from '../src/save'
import { compareRows, wornRival } from '../src/scenes/forge/state'

const sword = ITEMS.find((x) => x.id === 'longsword')!
const accs = ITEMS.filter((x) => x.slot === 'acc' && x.id !== 'none')
const eq = { weapon: 'knife', armor: 'cloth', acc: 'none', head: 'none_head', offhand: 'none_off', acc2: 'none' }
const mk = (extra: object = {}) => ({ job: 'swordsman', owned: ITEMS.map((x) => x.id), equipped: { ...eq }, ...extra }) as never as SaveData

// v115: itemStatLine was checked char-for-char against the pre-v115 code for all 117 items when statEntries was split out.
test('statEntries: unique keys, ungrouped never folds, pct and flat P.ATK stay apart', () => {
  for (const it of ITEMS) {
    const keys = statEntries(it, false).map((e) => e.key)
    assert.equal(new Set(keys).size, keys.length, it.id)
    assert.ok(!keys.includes('base.all'), it.id)
  }
  const both = statEntries({ mod: { atk: 5 }, pct: { atk: 0.02 } })
  assert.deepEqual(both.map((e) => e.key), ['pct.atk', 'mod.atk'])
  assert.equal(itemStatLine({ mod: { atk: 5 }, pct: { atk: 0.02 } }), 'P.ATK +2% · P.ATK +5')
})

test('compareRows: refine +1 only goes up, and a stat on one side only shows "—"', () => {
  const s = mk()
  const now = forged(s, sword), next = forged({ ...s, refine: { [sword.id]: 1 } } as never, sword)
  const rows = compareRows(now, next)
  assert.ok(rows.some((r) => r.d === 1), 'something improves')
  assert.ok(rows.every((r) => r.d >= 0), 'nothing gets worse')
  const i = rows.findIndex((r) => r.d === 0)
  assert.ok(i < 0 || rows.slice(i).every((r) => r.d === 0), 'changed rows come first')
  const fresh = compareRows(null, sword)
  assert.ok(fresh.length > 0 && fresh.every((r) => r.now === '—' && r.d !== 0))
  const slow = fresh.find((r) => r.key === 'mod.aspd')! // longsword: aspd -0.15 is a downside
  assert.equal(slow.d, -1)
  assert.equal(slow.curse, true)
  assert.ok(compareRows(sword, sword).every((r) => r.d === 0))
})

test('wornRival: same slot as equip(), null when worn or the slot is empty', () => {
  const s = mk()
  assert.equal(wornRival(s, sword)?.id, 'knife')
  assert.equal(wornRival(mk({ equipped: { ...eq, weapon: sword.id } }), sword), null) // worn itself
  assert.equal(wornRival(s, accs[0]), null) // both acc sides empty
  const [a, b, c] = accs
  const two = mk({ equipped: { ...eq, acc: a.id, acc2: b.id } })
  assert.equal(replaceSlot(two.equipped, c.id), 'acc')
  assert.equal(wornRival(two, c)?.id, a.id)
  const left = mk({ equipped: { ...eq, acc: a.id } }) // right side free -> fills it, nothing replaced
  assert.equal(replaceSlot(left.equipped, c.id), 'acc2')
  assert.equal(wornRival(left, c), null)
})
