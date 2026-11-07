import test from 'node:test'
import assert from 'node:assert/strict'
import { DUNGEONS, MONSTERS, type MonsterKind } from '../src/data/game-data'
import { HELL, hellify, HELL_TRAITS } from '../src/data/hell'
import { deepAnchor, homeDungeon, legacyLevel, monTier, restatAt, statNative, towerMonLv, withStats } from '../src/data/mon-stats'
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

test('floor 40+: every D1-D5 monster in the room is Hell (Q 2026-11-08)', () => {
  for (let i = 0; i < 40; i++) for (let f = HELL.allFrom; f <= HELL.allFrom + 20; f++) for (const r of towerFloor(f, 40, DEEP)) {
    const old = [...new Set([...r.spawn.map(([k]) => k), ...(r.miniPool ?? [])])].filter((k) => !statNative(k))
    for (const k of old) assert.ok(r.hell?.includes(k), `floor ${f}: ${k} not Hell`)
  }
})

test('tower Lv: a D3 mini locked at its home Lv grows stats + skill Lv on deep floors, HP / ATK untouched', () => {
  const d = MONSTERS.duelist, home = withStats(d, 'duelist', legacyLevel('duelist', d, { id: 'd3' }))
  const lv = towerMonLv(40) + HELL.lv
  assert.ok(lv > (home.lv ?? 0))
  const up = restatAt(home, 'duelist', lv)
  assert.equal(up.lv, lv)
  assert.equal(up.hp, home.hp)
  assert.equal(up.dmg, home.dmg)
  assert.ok((up.flee ?? 0) > (home.flee ?? 0) && (up.hit ?? 0) > (home.hit ?? 0), 'flee / hit grow')
  assert.ok((up.skills ?? []).every((s, i) => (s.lv ?? 1) > (home.skills?.[i]?.lv ?? 1)), 'skill Lv grows')
  assert.equal(JSON.stringify(restatAt(home, 'duelist', 5)), JSON.stringify(home), 'D1-D5 never go below home Lv')
})

test('tower Lv: a D6+ monster follows the floor Lv down too (no Lv 90 kit on floor 25)', () => {
  const k = (Object.keys(MONSTERS) as MonsterKind[]).find((x) => statNative(x) && homeDungeon(x) === 'd10' && !MONSTERS[x].passive && MONSTERS[x].ai !== 'boss')!
  const base = deepAnchor(k), low = restatAt(base, k, towerMonLv(25))
  assert.equal(low.lv, towerMonLv(25))
  assert.equal(low.hp, base.hp)
  assert.ok((low.flee ?? 0) < (base.flee ?? 0), `${k} flee ${low.flee} < ${base.flee}`)
})
