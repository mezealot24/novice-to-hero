// ☀️ Dungeon days (Q 2026-11-18, data/dungeon-days.ts): runs in days that grow with the dungeon, echo monsters from earlier dungeons.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DUNGEONS, MONSTERS, type MonsterKind } from '../src/data/game-data'
import { buildDays, dayCount, DUNGEON_DAYS, echoMinis, echoPay, echoPool } from '../src/data/dungeon-days'
import { buildRun } from '../src/data/modes'
import { homeDungeon } from '../src/data/mon-stats'
import type { SaveData } from '../src/save'

const fake = { baseLevel: 50, race: 'human', stats: { str: 10, agi: 10, vit: 10, int: 10, dex: 10, luk: 10, wis: 10 }, equipped: {}, skills: {}, clears: 1, clearsBy: { d1: 1 }, modes: {} } as unknown as SaveData
const idx = (id: string) => DUNGEONS.findIndex((d) => d.id === id)

test('☀️ day count: D1 untouched, grows every 2 dungeons from D2, capped', () => {
  assert.equal(dayCount(1), 0)
  assert.deepEqual([2, 3, 4, 5, 6, 7, 8, 14].map(dayCount), [3, 3, 4, 4, 5, 5, 6, 6])
  assert.equal(buildDays(DUNGEONS[0], 1), DUNGEONS[0].rooms, 'D1 keeps its authored rooms')
})

test('☀️ every dungeon D2+: days x (waves + 1) rooms, a day-end fight closes each day, the boss closes the run', () => {
  for (const dg of DUNGEONS.slice(1)) {
    const days = dayCount(idx(dg.id) + 1), rooms = buildDays(dg, 12345)
    assert.equal(rooms.length, days * (DUNGEON_DAYS.waves + 1), dg.id)
    assert.ok(rooms[rooms.length - 1].boss, `${dg.id} ends on the boss`)
    assert.equal(rooms.filter((r) => r.boss).length, 1, `${dg.id}: one boss`)
    assert.equal(rooms.filter((r) => r.dayEnd).length, days - 1, `${dg.id}: a day-end fight per day but the last`)
    assert.equal(rooms.filter((r) => r.dayStart).length, days, `${dg.id}: every day starts once`)
    rooms.forEach((r) => assert.ok(r.day! >= 1 && r.day! <= days && r.days === days, `${dg.id} ${r.title}`))
    // every authored wave is still in the run, in order
    const authored = dg.rooms.filter((r) => !r.boss && !r.mini && r.spawn.length).map((r) => r.title)
    assert.deepEqual(rooms.filter((r) => authored.includes(r.title)).map((r) => r.title), authored, `${dg.id}: authored waves kept`)
    // the own 1-1 duel closes day 1
    const own = dg.rooms.find((r) => r.mini)
    if (own) assert.ok(rooms.find((r) => r.dayEnd && r.day === 1)?.title.includes(own.title), `${dg.id}: day 1 ends with its own duel`)
  }
})

test('☀️ echo monsters come only from this dungeon or earlier ones; returning minis from earlier dungeons', () => {
  for (const dg of DUNGEONS.slice(1)) {
    const i = idx(dg.id), before = new Set(DUNGEONS.slice(0, i + 1).map((d) => d.id))
    const rooms = buildDays(dg, 777)
    for (const r of rooms.filter((x) => x.echo)) {
      for (const [k] of r.spawn) assert.ok(before.has(homeDungeon(k)!), `${dg.id}: ${k} (${homeDungeon(k)}) is not from an earlier dungeon`)
      for (const k of r.miniPool ?? []) assert.ok(MONSTERS[k]?.mini && before.has(homeDungeon(k)!), `${dg.id}: mini ${k}`)
      assert.ok(r.spawn.reduce((a, [, n]) => a + n, 0) <= 4, 'fits the 4 battle slots')
    }
    assert.ok(rooms.some((r) => r.echo && r.spawn.some(([k]) => homeDungeon(k) !== dg.id)), `${dg.id}: an earlier dungeon's monster shows up`)
  }
  assert.ok(echoPool(1).some((p) => p.id === 'd1'), 'D2 pulls D1 monsters')
  assert.ok(echoMinis(idx('d5')).length > 0, 'D5 can bring back earlier minis')
})

test('☀️ D6+: echo rooms take the room Lv; Lv never drops along the waves and stays under the boss', () => {
  for (const dg of DUNGEONS.filter((d) => d.level)) {
    const rooms = buildDays(dg, 42), boss = rooms[rooms.length - 1]
    const waves = rooms.filter((r) => !r.boss && !r.mini && !r.dayEnd)
    waves.forEach((r, j) => { assert.ok(r.lv! >= dg.level![0] && r.lv! < boss.lv!, `${dg.id} ${r.title} Lv ${r.lv}`); if (j) assert.ok(r.lv! >= waves[j - 1].lv!, `${dg.id}: Lv climbs`) })
    rooms.filter((r) => r.dayEnd).forEach((r) => assert.ok(r.lv! < boss.lv!, `${dg.id} day-end Lv ${r.lv} under the boss`))
  }
})

test('☀️ seeded: same seed same run, other seeds vary; off switch restores the authored rooms', () => {
  const dg = DUNGEONS[idx('d7')]
  assert.deepEqual(buildDays(dg, 5), buildDays(dg, 5))
  const sig = (s: number) => JSON.stringify(buildDays(dg, s).filter((r) => r.echo).map((r) => r.spawn))
  assert.ok(new Set([1, 2, 3, 4, 5, 6].map(sig)).size > 1)
  DUNGEON_DAYS.on = 0
  try { assert.equal(buildDays(dg, 5), dg.rooms) } finally { DUNGEON_DAYS.on = 1 }
})

test('☀️ run config: HUD shows the day, a day-end fight gives the camp events, a returning mini never forces a relic swap', () => {
  const run = buildRun(fake, { mode: 'dungeon', d: idx('d7'), seed: 9 })
  const n = dayCount(7) * (DUNGEON_DAYS.waves + 1)
  assert.match(run.where(0), /วัน 1\/5/)
  assert.ok(run.roomAt(n - 1)!.boss && !run.roomAt(n))
  const ends: number[] = []
  for (let i = 0; run.roomAt(i); i++) if (run.roomAt(i)!.dayEnd) ends.push(i)
  for (const i of ends) assert.equal(run.eventsAfter(i, run.roomAt(i)!), 1 + DUNGEON_DAYS.dayEndEvents)
  assert.equal(run.eventsAfter(0, run.roomAt(0)!), 1)
  const back = ends.map((i) => run.roomAt(i)!).find((r) => r.echo && r.mini)
  assert.ok(back, 'a returning mini day-end')
  assert.equal(run.relicAfter(back!, true), false)
  assert.equal(run.relicAfter(back!, false), true)
  assert.equal(run.relicAfter(run.roomAt(ends[0])!, true), true, 'the own duel still offers as before')
})

test('☀️ echo pay: an earlier dungeon monster pays like this dungeon of its tier', () => {
  const d7 = DUNGEONS[idx('d7')]
  const k = echoPay(d7, MONSTERS['jellop' as MonsterKind])
  assert.ok(k.xp > 1 && k.zeny > 1, 'a D1 jellop in D7 pays up')
  const own = echoPay(d7, MONSTERS['yeti' as MonsterKind])
  assert.ok(own.xp > 0.5 && own.xp < 2)
})

test('☀️ day events: never roll outside day runs, only the ones the day allows inside them', async () => {
  const { EVENTS, rollEvent } = await import('../src/data/events')
  const dayIds = EVENTS.filter((e) => e.day).map((e) => e.id)
  assert.deepEqual(dayIds.sort(), ['bounty', 'kafra', 'oath', 'rematch', 'scout'])
  const base = { canShop: true, canSpin: true, canFork: true, canImmortal: true }
  for (let i = 0; i < 400; i++) {
    const rare = i % 2 ? 1 : 0
    assert.ok(!dayIds.includes(rollEvent(rare, 5, base).id), 'no day event outside a day run')
    const e = rollEvent(rare, 5, { ...base, day: { bounty: true, rematch: true } })
    assert.ok(!['kafra', 'oath', 'scout'].includes(e.id), `${e.id} rolled without the day allowing it`)
  }
  let seen = 0
  for (let i = 0; i < 2000; i++) if (rollEvent(0, 5, { ...base, day: { bounty: true } }).id === 'bounty') seen++
  assert.ok(seen > 0, 'bounty can roll when allowed')
})
