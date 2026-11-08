import test from 'node:test'
import assert from 'node:assert/strict'
import { biggestHit, COMBAT_LOG, CombatLog, deathText, hitLine, loadDeaths, recapLines, saveDeath, type DeathRec, type HitRec } from '../src/data/combat-log'

// node has no localStorage: a tiny in-memory one
const mem = new Map<string, string>()
Object.assign(globalThis, { localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } })

const hit = (o: Partial<HitRec> = {}): HitRec => ({ turn: 1, floor: 45, who: 'อัศวินมรณะนรก', kind: 'deathknight', tag: '✦ ฟันมรณะ', magic: false, crit: false, out: 'hit',
  raw: 3000, taken: 1800, shield: 0, hp: 1200, hp0: 1200, maxHp: 1200, mon: { lv: 78, dmg: 400, mul: 1, hell: '🔥 เปลวนรก' }, ...o })
const death = (hits: HitRec[], at = '2026-11-08T03:00:00.000Z'): DeathRec => ({ at, mode: 'tower', where: '🗼 ชั้น 45', floor: 45, reason: 'dead',
  hero: { job: 'cleric', job2: 'crusader', lv: 50, baseLv: 50, power: 400, offense: 300, survival: 2000, maxHp: 1200, def: 150, mdef: 0.2, guard: 0, flee: 40, luckyDodge: 0, autoGuard: 0.3, critDR: 0 },
  affixes: ['🩸แผลลึก'], fightTurns: 3, enrage: 0, hits })

test('ring buffer keeps only the last keepHits hits', () => {
  const log = new CombatLog()
  for (let i = 0; i < COMBAT_LOG.keepHits + 7; i++) log.push(hit({ turn: i }))
  assert.equal(log.hits.length, COMBAT_LOG.keepHits)
  assert.equal(log.hits[0].turn, 7)
  log.reset()
  assert.equal(log.hits.length, 0)
})

test('hit line shows raw -> taken, HP lost and its share of max HP; misses show how', () => {
  const l = hitLine(hit())
  assert.match(l, /3000 → 1800/)
  assert.match(l, /HP -1200 \(100% max\)/)
  assert.match(hitLine(hit({ out: 'block', hp: 0 })), /BLOCK/)
  assert.match(hitLine(hit({ magic: true, crit: true })), /เวท 💥คริ/)
})

test('biggest hit = most HP lost; recap = last few, newest last', () => {
  const d = death([hit({ hp: 100, turn: 1 }), hit({ hp: 900, turn: 2 }), hit({ hp: 0, out: 'evade', turn: 3 }), hit({ hp: 200, turn: 4 })])
  assert.equal(biggestHit(d)?.turn, 2)
  assert.equal(recapLines(d).length, COMBAT_LOG.recap)
  assert.match(deathText(d), /crusader/)
  assert.match(deathText(d), /T4 F45/)
})

test('storage: newest first, capped, garbage ignored', () => {
  mem.clear()
  for (let i = 0; i < COMBAT_LOG.deaths + 2; i++) saveDeath(death([hit()], `2026-11-08T0${i}:00:00.000Z`))
  const all = loadDeaths()
  assert.equal(all.length, COMBAT_LOG.deaths)
  assert.equal(all[0].at, `2026-11-08T0${COMBAT_LOG.deaths + 1}:00:00.000Z`)
  mem.set(COMBAT_LOG.key, '{broken')
  assert.deepEqual(loadDeaths(), [])
  mem.set(COMBAT_LOG.key, JSON.stringify([{ nope: 1 }, death([])]))
  assert.equal(loadDeaths().length, 1)
})
