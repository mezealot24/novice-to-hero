// v78 D7-D10 dungeon packs (data/dungeons/dN.ts): every built pack is complete and climbs above the dungeon before it. Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DUNGEONS, MONSTERS, type MonsterKind } from '../src/data/game-data'
import { PACKS } from '../src/data/dungeons'
import { EQUIP_CARDS } from '../src/data/cards'
import { MATS } from '../src/data/materials'
import { MINI_RELICS, RELICS } from '../src/data/relics'
import { monTier, roomLevel, statMonster } from '../src/data/mon-stats'

const built = PACKS.filter((p) => p.dungeon)
const kindsOf = (d: NonNullable<(typeof PACKS)[number]['dungeon']>) => {
  const out = new Set<MonsterKind>()
  for (const r of d.rooms) for (const k of [...r.spawn.map((s) => s[0]), ...(r.miniPool ?? [])]) {
    out.add(k)
    const m = MONSTERS[k]
    if (m.summon) out.add(m.summon)
    for (const p of m.phases ?? []) if (p.summon) out.add(p.summon[0])
    for (const s of [...(m.skills ?? []), ...(m.phases ?? []).flatMap((p) => p.skills ?? [])]) if (s.summon) out.add(s.summon[0])
  }
  return [...out]
}

test('packs: ids unique across the game, unlock chain after D6', () => {
  const ids = DUNGEONS.map((d) => d.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const p of built) {
    const d = p.dungeon!, i = DUNGEONS.indexOf(d)
    assert.ok(i >= 6, `${d.id} sits after D6`)
    assert.equal(d.unlock, DUNGEONS[i - 1].id, `${d.id} unlocks after ${DUNGEONS[i - 1].id}`)
    assert.equal(d.tier, i + 1, `${d.id} tier`)
    assert.ok(d.level && d.level[0] < d.level[1], `${d.id} level band`)
  }
})

test('packs: every monster used exists, has its own statAlloc object, is stat-native', () => {
  for (const p of built) {
    const d = p.dungeon!
    for (const k of kindsOf(d)) {
      assert.ok(MONSTERS[k], `${d.id}: ${k} missing`)
      assert.ok(MONSTERS[k].statAlloc && typeof MONSTERS[k].statAlloc === 'object', `${d.id}: ${k} statAlloc`)
    }
    for (const k of Object.keys(p.monsters) as MonsterKind[]) assert.ok(kindsOf(d).includes(k), `${d.id}: ${k} defined but never spawned`)
  }
})

test('packs: room structure = 4 waves + duel (2 minis) + boss, levels inside the band', () => {
  for (const p of built) {
    const d = p.dungeon!, [lo, hi] = d.level!
    assert.equal(d.rooms.length, 6, d.id)
    const duel = d.rooms.find((r) => r.mini)!, boss = d.rooms[d.rooms.length - 1]
    assert.ok(duel?.miniPool?.length === 2, `${d.id} duel pool`)
    for (const k of duel.miniPool!) {
      assert.ok(MONSTERS[k].mini, `${k} is a mini`)
      assert.ok(MINI_RELICS[k]?.every((r) => RELICS[r]), `${k} signature relics`)
      assert.ok(p.miniHints[k as keyof typeof p.miniHints], `${k} duel hint`)
    }
    assert.ok(boss.boss && boss.spawn.length === 1 && monTier(MONSTERS[boss.spawn[0][0]]) === 'boss', `${d.id} boss room`)
    d.rooms.forEach((_, i) => { const lv = roomLevel(d.level!, d.rooms, i); assert.ok(lv >= lo && lv <= hi, `${d.id} room ${i} Lv${lv}`) })
  }
})

test('packs: 9 cards (6 normal / 2 mini / 1 boss) + 2 materials, all ids unique', () => {
  const ids = EQUIP_CARDS.map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length, 'card ids unique')
  assert.equal(new Set(MATS.map((m) => m.id)).size, MATS.length, 'material ids unique')
  for (const p of built) {
    const d = p.dungeon!
    const main = p.cards.filter((c) => !c.v2)
    assert.equal(main.length, 9, `${d.id} cards`)
    assert.deepEqual(['normal', 'mini', 'boss'].map((t) => main.filter((c) => c.tier === t).length), [6, 2, 1], `${d.id} card tiers`)
    for (const c of p.cards) { assert.equal(c.dungeon, d.id); assert.ok(MONSTERS[c.monster], c.id) }
    assert.deepEqual(p.mats.map((m) => m.id).sort(), [`b_${d.id}`, `m_${d.id}`], `${d.id} mats`)
  }
})

test('packs: numbers climb — boss > mini > normal HP, and every tier above the dungeon before', () => {
  const tierHp = (d: (typeof DUNGEONS)[number]) => {
    const best = { normal: 0, mini: 0, boss: 0 }
    d.rooms.forEach((r, i) => {
      const lv = roomLevel(d.level!, d.rooms, i)
      for (const k of [...r.spawn.map((s) => s[0]), ...(r.miniPool ?? [])]) {
        const m = statMonster(MONSTERS[k], lv), t = monTier(MONSTERS[k])
        best[t] = Math.max(best[t], m.hp)
      }
    })
    return best
  }
  for (const p of built) {
    const d = p.dungeon!, i = DUNGEONS.indexOf(d), now = tierHp(d), prev = tierHp(DUNGEONS[i - 1])
    assert.ok(now.boss > now.mini && now.mini > now.normal, `${d.id} ${JSON.stringify(now)}`)
    for (const t of ['normal', 'mini', 'boss'] as const) assert.ok(now[t] > prev[t], `${d.id} ${t} HP ${now[t]} > ${DUNGEONS[i - 1].id} ${prev[t]}`)
  }
})
