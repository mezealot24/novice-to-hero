import test from 'node:test'
import assert from 'node:assert/strict'
import { blessBase, heroStats } from '../src/data/meta'
import { heroPower } from '../src/data/power'
import { S2N } from '../src/data/skill-math'
import { skill2ById } from '../src/data/skill2'

const base = { race: 'human', stats: { str: 5, vit: 5, wis: 5, dex: 5, int: 5, luk: 5, agi: 5 }, equipped: {}, skills: {}, job: 'cleric' } as never
const withTree = (jobTree: Record<string, number>) => ({ ...(base as object), jobTree }) as never

test('v77 Priest พรแสง: active (Mana 30, cd 4), no permanent stats, buff raises derived stats, ★ Gloria adds LUK', () => {
  const k = skill2ById('cl_bless')
  assert.ok(k && k.cost === 30 && k.cd === 4)
  assert.equal(S2N.blessTurns, 3)
  assert.ok(Math.abs(S2N.kyrieHp(3) - 0.15) < 1e-9)
  const a = heroStats(base), b = heroStats(withTree({ cl_bless: 1, cl_bless_p: 3, cl_bless_x: 1 }))
  assert.equal(b.matk, a.matk) // no passive bonus any more
  assert.equal(b.maxHp, a.maxHp)
  assert.equal(blessBase(base), undefined)
  const add = blessBase(withTree({ cl_bless: 1 }))!
  assert.deepEqual(add, { str: 15, dex: 15, int: 15, wis: 15, luk: 0 })
  const on = heroStats({ ...(withTree({ cl_bless: 1 }) as object), tempBase: add } as never)
  assert.ok(on.atk > a.atk && on.matk > a.matk && on.hit > a.hit)
  const glo = blessBase(withTree({ cl_bless: 1, cl_bless_p: 3, cl_bless_x: 1 }))!
  assert.equal(glo.luk, S2N.gloriaLuk)
  const g = heroStats({ ...(withTree({ cl_bless: 1, cl_bless_p: 3, cl_bless_x: 1 }) as object), tempBase: glo } as never)
  assert.ok(g.crit > on.crit && g.luckyDodge > on.luckyDodge)
  assert.ok(heroPower(withTree({ cl_bless: 1 })) > heroPower(base)) // power counts the buff at its uptime
})
