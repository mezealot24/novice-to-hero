import test from 'node:test'
import assert from 'node:assert/strict'
import { DUNGEONS, MONSTERS, type MonsterKind } from '../src/data/game-data'
import { HELL, hellify, HELL_TRAITS } from '../src/data/hell'
import { deepAnchor, homeDungeon, monTier, statNative } from '../src/data/mon-stats'
import { towerFloor, TOWER } from '../src/data/modes'

const DEEP = DUNGEONS.filter((d) => d.level)
const kindsOf = (rooms: ReturnType<typeof towerFloor>) => rooms.flatMap((r) => [...r.spawn.map(([k]) => k), ...(r.miniPool ?? [])])

test('below the deep floor: no D6+ monster and no Hell, even with every dungeon cleared', () => {
  for (let i = 0; i < 200; i++) for (let f = 1; f < TOWER.deepFrom; f++) {
    const rooms = towerFloor(f, 40, DEEP)
    assert.ok(kindsOf(rooms).every((k) => !statNative(k)), `floor ${f}`)
    assert.ok(rooms.every((r) => !r.hell), `floor ${f} hell`)
  }
})

test('no D6+ dungeon cleared: floors 25-60 never spawn a D6+ monster (the old D6 boss leak on 31+ is gone)', () => {
  for (let i = 0; i < 60; i++) for (let f = 25; f <= 60; f++) assert.ok(kindsOf(towerFloor(f, 40, [])).every((k) => !statNative(k)), `floor ${f}`)
})

test('floors 25+: D6+ monsters only from cleared dungeons, and they do show up', () => {
  const only = DEEP.filter((d) => d.id === 'd7')
  let seen = 0
  for (let i = 0; i < 80; i++) for (let f = 25; f <= 60; f++) for (const k of kindsOf(towerFloor(f, 40, only))) {
    if (!statNative(k)) continue
    seen++
    assert.equal(homeDungeon(k), 'd7', `${k} on floor ${f}`)
  }
  assert.ok(seen > 0)
})

test('Hell marks: only D1-D5 kinds that are in the room, and they do show up', () => {
  let marked = 0
  for (let i = 0; i < 80; i++) for (let f = 25; f <= 60; f++) for (const r of towerFloor(f, 40, DEEP)) {
    for (const k of r.hell ?? []) {
      marked++
      assert.ok(!statNative(k), k)
      assert.ok(r.spawn.some(([x]) => x === k) || (r.miniPool ?? []).includes(k), `${k} not in room`)
    }
  }
  assert.ok(marked > 0)
})

test('deepAnchor: every D6+ kind gets sane D5-sized numbers', () => {
  const kinds = (Object.keys(MONSTERS) as MonsterKind[]).filter((k) => statNative(k))
  assert.ok(kinds.length > 0)
  for (const k of kinds) {
    const d = deepAnchor(k)
    assert.ok(Number.isFinite(d.hp) && d.hp >= 1, `${k} hp ${d.hp}`)
    assert.ok(Number.isFinite(d.dmg) && d.dmg > 0, `${k} dmg ${d.dmg}`)
    if (MONSTERS[k].passive) continue
    const t = monTier(MONSTERS[k]), cap = t === 'normal' ? 4000 : 40000
    assert.ok(d.hp < cap, `${k} (${t}) hp ${d.hp} is not D5-sized`)
  }
})

test('hellify: numbers, name, trait; the source def is untouched; bosses never get the death blast', () => {
  const base = MONSTERS.wolf, before = JSON.stringify(base)
  const h = hellify(base, 0)
  assert.equal(JSON.stringify(base), before)
  assert.equal(h.hp, Math.round(base.hp * HELL.hp))
  assert.equal(h.xp, Math.round(base.xp * HELL.xp))
  assert.ok(h.name.endsWith('นรก') && h.hellish)
  const boss = (Object.values(MONSTERS).find((d) => d.ai === 'boss' && !d.mini))!
  for (let i = 0; i < 20; i++) assert.ok(!hellify(boss, i / 20).hellish?.includes(HELL_TRAITS.find((t) => t.id === 'blast')!.name))
})
