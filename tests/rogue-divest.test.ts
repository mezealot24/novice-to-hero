// 🧤 Rogue rg_d สายปลด (Strip line, Q 2026-11-21): weaken the enemy with Marks instead of more damage.
// Run: node tools/test.mjs rogue-divest
import test from 'node:test'
import assert from 'node:assert/strict'
import { disarmWeak, divestMul, KIT2, rogueStripCut, snatchShare } from '../src/data/skill-math'
import { tree2 } from '../src/data/trees2/rogue'

const D = KIT2.rogue.divest
const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)

test('rg_d branch: 4 tiers, ★ at tier 4, each node feeds its own stat', () => {
  assert.ok(tree2.branches.some((b) => b.id === 'rg_d'))
  const nodes = tree2.nodes.filter((n) => n.branch === 'rg_d')
  assert.deepEqual(nodes.map((n) => n.id), ['rg_d1', 'rg_d2', 'rg_d3', 'rg_d4'])
  const mods = nodes.map((n) => n.mod(n.max))
  assert.equal(mods[0].j2Disarm, 3)
  near(mods[1].j2StripPlus!, D.stripPer * 3)
  assert.equal(mods[2].j2Snatch, 3)
  assert.equal(mods[3].j2BreakCast, 1)
  assert.equal(nodes[3].max, 1)
  for (const n of nodes) assert.ok(n.desc(n.max).length > 10, n.id)
})

test('strip potency: boss / mini half, repeat strip within resTurns half again', () => {
  near(divestMul(false, false), 1)
  near(divestMul(true, false), D.bossMul)
  near(divestMul(true, true), D.bossMul * D.resMul)
  near(divestMul(false, true), D.resMul)
})

test('ปลดอาวุธ / ฉกบัฟ / ถอดเกราะ numbers', () => {
  assert.equal(disarmWeak(0), 0)
  near(disarmWeak(3), D.weak + D.weakPer * 3)
  assert.equal(snatchShare(0), 0)
  near(snatchShare(3), D.snatchBase + D.snatchPer * 3)
  near(rogueStripCut(0), KIT2.rogue.stabStrip, 'no points = the old Strip Armor')
  near(rogueStripCut(D.stripPer * 3), KIT2.rogue.stabStrip + D.stripPer * 3)
  assert.ok(rogueStripCut(5) <= 0.6, 'capped')
  // a boss at lv 3 ปลดอาวุธ: weak and the next-turn cut are halved
  near(disarmWeak(3) * divestMul(true, false), (D.weak + D.weakPer * 3) * D.bossMul)
  near(D.disarm * divestMul(true, false), D.disarm * D.bossMul)
})
