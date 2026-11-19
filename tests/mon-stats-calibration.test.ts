// v126 (Q 2026-11-19 "ปรับบาลานซ์มอน d1-d5 ให้ใช้ระบบเดียวกับ d6+ ยกเลิก legacy"): D1-D5 / event monsters are plain stat monsters now.
// Their bodyMul / speedMul / bonuses were calibrated once so that, at each one's home room Lv, statMonster gives what the old v76
// anchor (withStats) x BATTLE.monBuff gave. fixtures/d1-d5-v125-numbers.json = those old numbers (normal mode, home Lv). Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DUNGEONS, MONSTERS, type MonsterKind } from '../src/data/game-data'
import { applyPatch } from '../src/data/patch'
import { deepKind, statMonster } from '../src/data/mon-stats'

type Old = { lv: number; hp: number; dmg: number; matk: number; def: number; hit: number; flee: number; crit: number; combo: number; counter: number; speed: number }
const OLD: Record<string, Old> = JSON.parse(readFileSync('tests/fixtures/d1-d5-v125-numbers.json', 'utf8'))
const off = (a: number, b: number) => (b === 0 ? Math.abs(a) : Math.abs(a / b - 1))

test('every D1-D5 / event monster at its home Lv keeps its v125 numbers (HP / ATK / M.ATK / speed ±1%, DEF / Hit / Flee ±1, rates ±0.006)', () => {
  const bad: string[] = []
  for (const [k, o] of Object.entries(OLD)) {
    const m = statMonster(MONSTERS[k as MonsterKind], o.lv)
    for (const f of ['hp', 'dmg', 'matk', 'speed'] as const) if (!(m.passive && f !== 'hp' && f !== 'speed') && off(m[f] ?? 0, o[f]) > 0.01) // a passive one never attacks bad.push(`${k}.${f} ${o[f]} -> ${m[f]}`)
    for (const f of ['def', 'hit', 'flee'] as const) if (Math.abs((m[f] ?? 0) - o[f]) > 1) bad.push(`${k}.${f} ${o[f]} -> ${m[f]}`)
    for (const f of ['crit', 'combo', 'counter'] as const) if (Math.abs((m[f] ?? 0) - o[f]) > 0.006) bad.push(`${k}.${f} ${o[f]} -> ${m[f]}`)
  }
  assert.deepEqual(bad, [])
  assert.ok(Object.keys(OLD).length >= 40)
})

test('D1-D5 have a level band and every room a Lv; the home rooms sit at the old LEGACY Lv (normal -2 / mini -1 / boss)', () => {
  for (const id of ['d1', 'd2', 'd3', 'd4', 'd5']) {
    const dg = DUNGEONS.find((d) => d.id === id)!
    assert.ok(dg.level, id)
    for (const r of dg.rooms) assert.equal(r.lv, r.boss ? dg.level![1] : r.mini ? dg.level![1] - 1 : dg.level![0], `${id} ${r.title}`)
    assert.ok(!(dg.rooms.flatMap((r) => r.spawn.map(([k]) => k))).some(deepKind), `${id}: no D6+ kind`)
  }
})

test('stat edits move D1-D5 numbers exactly like on D6 (live-config patch path)', () => {
  const k0 = statMonster(MONSTERS.king, 5), w0 = statMonster(MONSTERS.wolf, 3)
  const r = applyPatch({ monsters: { 'king.statAlloc.str': 9, 'wolf.statAlloc.agi': 12, 'lich.bodyMul.hp': 3 } }, {})
  try {
    assert.ok(r.ok, JSON.stringify(r.errors))
    const k1 = statMonster(MONSTERS.king, 5), w1 = statMonster(MONSTERS.wolf, 3)
    assert.ok(k1.dmg > k0.dmg, `king dmg ${k0.dmg} -> ${k1.dmg}`)
    assert.ok((w1.flee ?? 0) > (w0.flee ?? 0) && (w1.speed ?? 0) > (w0.speed ?? 0), `wolf flee ${w0.flee} -> ${w1.flee}`)
    assert.ok(statMonster(MONSTERS.lich, 21).hp > OLD.lich.hp * 1.3)
  } finally { r.revert() }
  assert.equal(statMonster(MONSTERS.king, 5).dmg, k0.dmg, 'revert restores')
})

test('a D1-D5 monster grows with its Lv (echo / tower / daily follow the room Lv)', () => {
  for (const k of ['jellop', 'skeleton', 'lich'] as MonsterKind[]) {
    const lv = OLD[k].lv, a = statMonster(MONSTERS[k], lv), b = statMonster(MONSTERS[k], lv + 20)
    assert.ok(b.hp > a.hp && b.dmg > a.dmg && (b.def ?? 0) >= (a.def ?? 0), k)
  }
})
