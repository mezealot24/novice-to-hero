// v102 (Q 2026-11-07): talent card text matches the rank shown (all jobs). Run: node tools/test.mjs talent
import test from 'node:test'
import assert from 'node:assert/strict'
import { rankHint, talentRankText, TALENTS } from '../src/data/tree'

test('the card text is the rank on the card; next rank shown as a hint; max rank has no hint', () => {
  for (const t of TALENTS) {
    assert.equal(talentRankText(t, 0).now, `ขั้น 1: ${t.desc(1)}`, t.id)
    for (let r = 1; r <= t.max; r++) {
      const x = talentRankText(t, r)
      assert.equal(x.now, t.desc(r), `${t.id} ${r}`)
      if (r < t.max) assert.ok(x.next?.startsWith(`▲ ขั้น ${r + 1}: `), `${t.id} ${r}`)
      else assert.equal(x.next, undefined, `${t.id} ${r}`)
    }
  }
})

test('rank hint: changed numbers, added tail, or the whole next text', () => {
  assert.equal(rankHint('Hit +10 · คอมโบ +8%', 'Hit +16 · คอมโบ +12%'), 'Hit +10 → +16 · คอมโบ +8% → +12%')
  assert.equal(rankHint('เริ่มทุกเวฟด้วย Energy เต็ม', 'เริ่มทุกเวฟด้วย Energy เต็ม · Energy +5/เทิร์น'), '+ Energy +5/เทิร์น')
  assert.equal(rankHint('ได้หอกแสง 1 เล่มทุก 2 เทิร์น', 'ได้หอกแสง 1 เล่มทุกเทิร์น'), 'ได้หอกแสง 1 เล่มทุกเทิร์น')
})
