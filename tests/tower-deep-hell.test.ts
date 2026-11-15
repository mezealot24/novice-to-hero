import test from 'node:test'
import assert from 'node:assert/strict'
import { DUNGEONS, MONSTERS, type MonSkill, type MonsterDef, type MonsterKind } from '../src/data/game-data'
import { ENDLESS_HELL, HELL, hellify, HELL_TRAITS } from '../src/data/hell'
import { deepAnchor, homeDungeon, legacyLevel, monPoints, monTier, restatAt, TOWER_LV, scaleOf, skillAtLv, skillMul, statNative, towerMonLv, withStats } from '../src/data/mon-stats'
import { ENDLESS_DUNGEONS, towerFloor } from '../src/data/modes'
import { castLv, skillLvBonus } from '../src/data/mon-skill-scale'

const DEEP = DUNGEONS.filter((d) => d.level)
const kindsOf = (rooms: ReturnType<typeof towerFloor>) => rooms.flatMap((r) => [...r.spawn.map(([k]) => k), ...(r.miniPool ?? [])])

test('v125: every dungeon D1-D13 feeds the tower from floor 1 (no clear needed), and no Hell below floor 25', () => {
  assert.deepEqual(ENDLESS_DUNGEONS.map((d) => d.id), Array.from({ length: 13 }, (_, i) => `d${i + 1}`))
  const homes = new Set<string>()
  for (let i = 0; i < 300; i++) for (let f = 1; f < HELL.from; f++) {
    const rooms = towerFloor(f, 40)
    for (const k of kindsOf(rooms)) { const h = homeDungeon(k); if (h) homes.add(h) }
    assert.ok(rooms.every((r) => !r.hell), `floor ${f} hell`)
  }
  for (const d of ENDLESS_DUNGEONS) assert.ok(homes.has(d.id), `${d.id} never showed up below floor ${HELL.from}`)
})

test('v125: a pool limited to D7 only spawns D7 kinds (waves, minis, bosses)', () => {
  const only = DEEP.filter((d) => d.id === 'd7')
  for (let i = 0; i < 40; i++) for (let f = 1; f <= 60; f++) for (const k of kindsOf(towerFloor(f, 40, only))) assert.equal(homeDungeon(k), 'd7', `${k} on floor ${f}`)
})

test('v125 floor 100+: every kind in the room (D6+ too) is marked Hell', () => {
  let deep = 0
  for (let i = 0; i < 30; i++) for (let f = ENDLESS_HELL.from; f <= ENDLESS_HELL.from + 15; f++) for (const r of towerFloor(f, 40)) {
    for (const k of new Set([...r.spawn.map(([x]) => x), ...(r.miniPool ?? [])])) { assert.ok(r.hell?.includes(k), `floor ${f}: ${k} not Hell`); if (statNative(k)) deep++ }
  }
  assert.ok(deep > 0)
})

test('v125 floor 99 -> 100 gets harder: hard stat points on HP / ATK for a D1-D5 and a D6+ kind', () => {
  const d = MONSTERS.deathknight, home = withStats(d, 'deathknight', legacyLevel('deathknight', d, { id: 'd3' }))
  const lv = towerMonLv(100) + HELL.lv, plain = restatAt(home, 'deathknight', lv, true), hard = restatAt(home, 'deathknight', lv, true, true)
  assert.ok(hard.hp > plain.hp && hard.dmg > plain.dmg, `D3 boss hp ${hard.hp} vs ${plain.hp}`)
  const k = (Object.keys(MONSTERS) as MonsterKind[]).find((x) => statNative(x) && homeDungeon(x) === 'd12' && !MONSTERS[x].passive && MONSTERS[x].ai !== 'boss')!
  const base = deepAnchor(k), p = restatAt(base, k, lv, true), h = restatAt(base, k, lv, true, true)
  assert.ok(h.hp > p.hp && Math.max(h.dmg, h.matk ?? 0) > Math.max(p.dmg, p.matk ?? 0), `${k} hp ${h.hp} vs ${p.hp}`)
  assert.ok(towerMonLv(100) >= ENDLESS_HELL.minLv)
})

test('v125: with numbers, a D5 monster on floor 1 follows the tower Lv down (floors 1-5 at TOWER_LV.minLv)', () => {
  const k = (Object.keys(MONSTERS) as MonsterKind[]).find((x) => homeDungeon(x) === 'd5' && monTier(MONSTERS[x]) === 'normal' && !MONSTERS[x].passive && MONSTERS[x].statAlloc)!
  const home = withStats(MONSTERS[k], k, legacyLevel(k, MONSTERS[k], { id: 'd5' }))
  assert.equal(towerMonLv(1), TOWER_LV.minLv)
  const low = restatAt(home, k, towerMonLv(1), true)
  assert.equal(low.lv, TOWER_LV.minLv)
  assert.ok(low.hp < home.hp && low.dmg < home.dmg, `${k} hp ${low.hp} < ${home.hp}`)
})

test('Hell marks below floor 100: only D1-D5 kinds that are in the room, and they do show up', () => {
  let marked = 0
  for (let i = 0; i < 80; i++) for (let f = 25; f <= 60; f++) for (const r of towerFloor(f, 40)) {
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
  for (let i = 0; i < 40; i++) for (let f = HELL.allFrom; f <= HELL.allFrom + 20; f++) for (const r of towerFloor(f, 40)) {
    const old = [...new Set([...r.spawn.map(([k]) => k), ...(r.miniPool ?? [])])].filter((k) => !statNative(k))
    for (const k of old) assert.ok(r.hell?.includes(k), `floor ${f}: ${k} not Hell`)
  }
})

test('tower Lv: a D3 mini locked at its home Lv grows stats on deep floors (skill Lv: v124 skillLvBonus), HP / ATK untouched', () => {
  const d = MONSTERS.duelist, home = withStats(d, 'duelist', legacyLevel('duelist', d, { id: 'd3' }))
  const lv = towerMonLv(40) + HELL.lv
  assert.ok(lv > (home.lv ?? 0))
  const up = restatAt(home, 'duelist', lv)
  assert.equal(up.lv, lv)
  assert.equal(up.hp, home.hp)
  assert.equal(up.dmg, home.dmg)
  assert.ok((up.flee ?? 0) > (home.flee ?? 0) && (up.hit ?? 0) > (home.hit ?? 0), 'flee / hit grow')
  assert.ok(skillLvBonus('duelist', lv, d) > 0, 'skill Lv grows (cast time)')
  assert.equal(JSON.stringify(restatAt(home, 'duelist', 5)), JSON.stringify(home), 'D1-D5 never go below home Lv')
})

test('tower Lv: a D6+ monster follows the floor Lv down too (no Lv 90 kit on floor 25)', () => {
  const k = (Object.keys(MONSTERS) as MonsterKind[]).find((x) => statNative(x) && homeDungeon(x) === 'd10' && !MONSTERS[x].passive && MONSTERS[x].ai !== 'boss')!
  const base = deepAnchor(k), low = restatAt(base, k, towerMonLv(25))
  assert.equal(low.lv, towerMonLv(25))
  assert.equal(low.hp, base.hp)
  assert.ok((low.flee ?? 0) < (base.flee ?? 0), `${k} flee ${low.flee} < ${base.flee}`)
})

test('Hell bosses / minis never roll ตานรก (the tower gives them a sharper True Sight) and can roll เปลวนรก; normals never get เปลวนรก', () => {
  const boss = Object.values(MONSTERS).find((d) => d.ai === 'boss' && !d.mini && !d.passive)!, wolf = MONSTERS.wolf
  const bossTraits = new Set(Array.from({ length: 40 }, (_, i) => hellify(boss, i / 40).hellish))
  const wolfTraits = new Set(Array.from({ length: 40 }, (_, i) => hellify(wolf, i / 40).hellish))
  assert.ok(![...bossTraits].some((t) => t?.includes('ตานรก')))
  assert.ok([...bossTraits].some((t) => t?.includes('เปลวนรก')))
  assert.ok(![...wolfTraits].some((t) => t?.includes('เปลวนรก')))
  assert.equal(hellify(boss, HELL_TRAITS.filter((t) => t.bossOk).findIndex((t) => t.id === 'flame') / 3 + 0.01).onHit?.burn, 2)
})

test('v122 tower: numbers come from the stats at the floor Lv (no Hero Power); restatAt keeps them only when asked', () => {
  const d = MONSTERS.deathknight, home = withStats(d, 'deathknight', legacyLevel('deathknight', d, { id: 'd3' }))
  const lv = towerMonLv(45) + HELL.lv, kept = restatAt(home, 'deathknight', lv), lvd = restatAt(home, 'deathknight', lv, true)
  assert.equal(kept.dmg, home.dmg)
  assert.ok(lvd.dmg > home.dmg * 2 && lvd.hp > home.hp * 2, `Lv${lv} dmg ${lvd.dmg} hp ${lvd.hp}`)
  assert.equal(lvd.lv, lv)
})

test('v122 tower MVP: a boss rebuilt with numbers gets TOWER_LV.mvpPct of the hero points (normals / minis unchanged)', () => {
  const lv = towerMonLv(45) + HELL.lv
  const d = MONSTERS.deathknight, home = withStats(d, 'deathknight', legacyLevel('deathknight', d, { id: 'd3' }))
  const mvp = restatAt(home, 'deathknight', lv, true), plain = withStats(d, 'deathknight', lv)
  const pts = (b?: Record<string, number>) => Object.values(b ?? {}).reduce((a, n) => a + n - 1, 0)
  assert.ok(Math.abs(pts(mvp.base) - monPoints(lv, 'boss', false, TOWER_LV.mvpPct)) <= 7, `mvp points ${pts(mvp.base)}`)
  assert.ok(mvp.hp > plain.hp && mvp.dmg > plain.dmg)
  const m = MONSTERS.duelist, mh = withStats(m, 'duelist', legacyLevel('duelist', m, { id: 'd3' }))
  assert.equal(JSON.stringify(restatAt(mh, 'duelist', lv, true).base), JSON.stringify(withStats(m, 'duelist', lv).base), 'mini: no MVP bonus')
})

test('v123/v124 tower: ดาบมรณะ Lv78 is cast at Lv7 = base pow x 1.6, with STR above the Lv ref on top', () => {
  const d = MONSTERS.deathknight, home = withStats(d, 'deathknight', legacyLevel('deathknight', d, { id: 'd3' }))
  const lv = towerMonLv(45) + HELL.lv, up = restatAt(home, 'deathknight', lv, true)
  const h = home.skills!.find((s) => s.kind === 'strike')!, u = up.skills!.find((s) => s.kind === 'strike')!
  const cast = skillAtLv(u, castLv(u.lv ?? 1, skillLvBonus('deathknight', lv, d)))
  assert.equal(cast.lv, 7)
  assert.ok(Math.abs((cast.pow ?? 0) - (h.pow ?? 0) * 1.6) < 1e-9)
  assert.ok(skillMul(up, scaleOf(u)) >= skillMul(home, scaleOf(h)))
})
