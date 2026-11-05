import test from 'node:test'
import assert from 'node:assert/strict'
import { heroStats } from '../src/data/meta'
import { S2N } from '../src/data/skill-math'

const base = { race: 'human', stats: { str: 5, vit: 5, wis: 5, dex: 5, int: 5, luk: 5, agi: 5 }, equipped: {}, skills: {}, job: 'cleric' } as never
const withTree = (jobTree: Record<string, number>) => ({ ...(base as object), jobTree }) as never

test('Priest พรแสง: Lv5 gives +10 STR/DEX/INT/WIS, plus-node VIT +20, star M.ATK +30%', () => {
  assert.equal(S2N.blessStat(5), 10)
  assert.equal(S2N.blessVit(3), 20)
  const a = heroStats(base), b = heroStats(withTree({ cl_bless: 5 })), c = heroStats(withTree({ cl_bless: 5, cl_bless_p: 3 })), d = heroStats(withTree({ cl_bless: 5, cl_bless_p: 3, cl_bless_x: 1 }))
  assert.ok(b.atk > a.atk && b.matk > a.matk && b.maxRes > a.maxRes)
  assert.ok(c.maxHp > b.maxHp && c.matk === b.matk)
  assert.ok(Math.abs(d.matk / c.matk - 1.3) < 1e-9)
})
