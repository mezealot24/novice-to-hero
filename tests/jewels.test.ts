import test from 'node:test'
import assert from 'node:assert/strict'
import { cardById } from '../src/data/cards'
import { activeJewels, cardPool, feedJewel, feedPreview, JEWEL, makeJewel, socketJewel, jewelStats } from '../src/data/jewels'
import { heroStats } from '../src/data/meta'
import { addCard, newSave } from '../src/save'

const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length] }
function thief() {
  const s = newSave('t', 'human')
  s.job = 'thief'; s.jobLevel = 50
  for (const id of ['card_wolf', 'card_bat', 'card_shadowwolf', 'card_duelist', 'card_alpha', 'card_lich']) addCard(s, id, 3)
  return s
}

test('card pool: half the card value, skips downsides and counts', () => {
  const wolf = cardPool(cardById('card_wolf')!)
  assert.deepEqual(wolf, { atk: { base: 2, whole: true }, hit: { base: 2, whole: true } })
  const king = cardPool(cardById('card_king')!) // regen 0.67, flee -5, pct maxHp 0.12
  assert.equal(king.flee, undefined)
  assert.deepEqual(king.hpPct, { base: 0.06, whole: false })
  assert.equal(cardPool(cardById('card_lich')!).revive, undefined)
})

test('make: 3 cards -> 2 lines from their pool, cards spent; wrong count / short = nothing spent', () => {
  const s = thief()
  assert.deepEqual(makeJewel(s, ['card_wolf', 'card_wolf']), { ok: false, why: 'count' })
  assert.deepEqual(makeJewel(s, ['card_wolf', 'card_jellop', 'card_bat']), { ok: false, why: 'short' })
  assert.equal(s.cards!.card_wolf, 3)
  const r = makeJewel(s, ['card_wolf', 'card_bat', 'card_shadowwolf'], seq(0))
  assert.ok(r.ok)
  if (!r.ok) return
  assert.equal(r.jewel.lines.length, JEWEL.startLines)
  assert.equal(new Set(r.jewel.lines.map((l) => l.stat)).size, 2) // no duplicate stats
  for (const l of r.jewel.lines) assert.ok(l.stat in r.jewel.pool)
  assert.equal(s.cards!.card_wolf, 2)
})

test('feed: 🃏 rerolls, 💠 adds a line (max 4), 👑 lifts the lowest tier', () => {
  const s = thief()
  const r = makeJewel(s, ['card_wolf', 'card_bat', 'card_shadowwolf'], seq(0))
  assert.ok(r.ok); if (!r.ok) return
  const id = r.jewel.id
  const add = feedJewel(s, id, 'card_duelist', seq(0))
  assert.ok(add.ok && add.orb === 'addLine')
  assert.equal(s.jewels![0].lines.length, 3)
  assert.ok('counter' in s.jewels![0].pool) // the fed card's stats joined the pool
  const up = feedJewel(s, id, 'card_alpha', seq(0))
  assert.ok(up.ok && up.orb === 'tierUp')
  assert.ok(s.jewels![0].lines.some((l) => (l.tier ?? 0) === 1))
  const rr = feedJewel(s, id, 'card_wolf', seq(0.99))
  assert.ok(rr.ok && rr.orb === 'reroll')
  assert.equal(s.jewels![0].lines.length, 3) // reroll keeps the line count
})

test('socket: stats count only when the socket node is allocated', () => {
  const s = thief()
  const r = makeJewel(s, ['card_wolf', 'card_wolf', 'card_wolf'], seq(0))
  assert.ok(r.ok); if (!r.ok) return
  assert.ok(socketJewel(s, 'th_sock_n', r.jewel.id))
  assert.equal(socketJewel(s, 'th_m_bridge_n', r.jewel.id), false) // not a socket
  s.passiveNodes = []
  assert.equal(activeJewels(s).length, 0)
  const before = heroStats(s).atk
  s.passiveNodes = ['th_origin', 'th_m_blade1', 'th_m_ring_n', 'th_n_open', 'th_m_bridge_n', 'th_sock_n']
  assert.equal(activeJewels(s).length, 1)
  const st = jewelStats(r.jewel)
  assert.ok((st.mod.atk ?? 0) > 0 || (st.mod.hit ?? 0) > 0)
  if (st.mod.atk) assert.ok(heroStats(s).atk > before)
})

test('feed preview matches what feeding does (👑 exact line, 💠 options, 🃏 new pool stats)', () => {
  const s = thief()
  const r = makeJewel(s, ['card_wolf', 'card_wolf', 'card_wolf'], seq(0))
  assert.ok(r.ok); if (!r.ok) return
  const j = r.jewel
  const before = JSON.stringify(j)
  const pr = feedPreview(j, cardById('card_bat')!)
  assert.equal(pr.orb, 'reroll')
  assert.equal(pr.rerollN, j.lines.length)
  for (const k of pr.newStats) assert.ok(!(k in j.pool))
  const pa = feedPreview(j, cardById('card_duelist')!)
  assert.equal(pa.orb, 'addLine')
  assert.ok(pa.addable.includes('counter'))
  for (const k of pa.addable) assert.ok(!j.lines.some((l) => l.stat === k))
  const pu = feedPreview(j, cardById('card_alpha')!)
  assert.equal(JSON.stringify(j), before) // preview changes nothing
  assert.ok(pu.tierUp)
  const fed = feedJewel(s, j.id, 'card_alpha', seq(0))
  assert.ok(fed.ok)
  const after = s.jewels![0].lines.find((l) => l.stat === pu.tierUp!.to.stat)
  assert.deepEqual(after, pu.tierUp!.to)
})
