// v76: D1-5 / event monsters on the D6 stat model, anchored to their tuned numbers. Run: npm test
// Prints, per monster, today's tuned numbers vs (a) the anchored v76 result and (b) the RAW D6 formula at the home level,
// so the calibration each monster needs is visible. (a) must stay within TOL; (b) is information only (flagged, not asserted).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MONSTERS, type MonsterDef, type MonsterKind } from '../src/data/game-data'
import { applyPatch } from '../src/data/patch'
import { LEGACY, legacyLevel, MON_STAT, statMonster, statNative, withStats } from '../src/data/mon-stats'

const TOL = 0.1
const home = { id: '' }
const kinds = (Object.keys(MONSTERS) as MonsterKind[]).filter((k) => !statNative(k))
const at = (k: MonsterKind, d: MonsterDef = MONSTERS[k]) => withStats(d, k, legacyLevel(k, d, home))
const off = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 1) : a / b - 1)
const pct = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(0)}%`

test('anchored: every D1-5 / event monster keeps its tuned numbers within ±10%', () => {
  const bad: string[] = []
  for (const k of kinds) {
    const d = MONSTERS[k], o = at(k)
    for (const f of ['hp', 'dmg', 'matk'] as const) if (Math.abs(off(o[f] ?? 0, d[f] ?? 0)) > TOL) bad.push(`${k}.${f} ${d[f]} -> ${o[f]}`)
    for (const f of ['def', 'hit', 'flee', 'crit', 'combo', 'counter', 'speed'] as const) if (o[f] !== d[f]) bad.push(`${k}.${f} ${d[f]} -> ${o[f]}`)
  }
  assert.deepEqual(bad, [])
})

test('report: raw D6 formula at the home level vs tuned (calibration the anchor absorbs)', () => {
  const rows: string[] = [], flagged: string[] = []
  for (const k of kinds) {
    const d = MONSTERS[k], lv = legacyLevel(k, d, home)
    const raw = statMonster({ ...d, def: undefined, hit: undefined, flee: undefined, crit: undefined, combo: undefined, counter: undefined, bodyMul: undefined, phases: undefined, razor: undefined }, lv)
    const dh = off(raw.hp, d.hp), dd = off(raw.dmg, d.dmg)
    const line = `${k.padEnd(12)} Lv${String(lv).padStart(2)}  HP ${String(d.hp).padStart(5)} raw ${String(raw.hp).padStart(6)} (${pct(dh).padStart(5)})  ATK ${String(d.dmg).padStart(3)} raw ${raw.dmg.toFixed(0).padStart(4)} (${pct(dd).padStart(5)})  DEF ${String(d.def ?? 0).padStart(3)} raw ${raw.def}  Hit ${d.hit ?? 15} raw ${raw.hit}  Flee ${d.flee ?? 5} raw ${raw.flee}`
    rows.push(line)
    if (Math.abs(dh) > TOL || Math.abs(dd) > TOL) flagged.push(k)
  }
  console.log(`\n--- v76 calibration (tuned vs raw D6 formula) ---\n${rows.join('\n')}\nraw formula off by >±${TOL * 100}% (absorbed by the anchor): ${flagged.length}/${kinds.length}\n`)
  assert.ok(rows.length > 30)
})

test('stat edits move D1-5 numbers like on D6 (via the real live-config patch path)', () => {
  const k0 = at('king')
  const r = applyPatch({ monsters: { 'king.statAlloc.str': 9, 'wolf.statAlloc.agi': 12, 'lich.statAlloc.vit': 8 } }, {})
  try {
    assert.ok(r.ok, JSON.stringify(r.errors))
    const k1 = at('king'), w0 = MONSTERS.wolf, w1 = at('wolf'), l1 = at('lich')
    assert.ok(k1.dmg > k0.dmg, `king dmg ${k0.dmg} -> ${k1.dmg}`)
    assert.ok((w1.flee ?? 0) > (w0.flee ?? 5) && (w1.speed ?? 0) > 0, `wolf flee ${w0.flee} -> ${w1.flee}, speed ${w1.speed}`)
    assert.ok(l1.hp > MONSTERS.lich.hp, `lich hp ${MONSTERS.lich.hp} -> ${l1.hp}`)
  } finally { r.revert() }
  assert.deepEqual(at('king').dmg, k0.dmg, 'revert restores')
})

test('LEGACY.lv and MON_STAT move D1-5 too; hand hp stays the anchor', () => {
  const before = at('deathknight').hp, lv0 = LEGACY.lv.d3, body0 = MON_STAT.body.boss
  try {
    LEGACY.lv.d3 = lv0 + 4
    assert.ok(at('deathknight').hp > before)
    LEGACY.lv.d3 = lv0
    MON_STAT.body.boss = body0 * 1.5
    assert.equal(at('deathknight').hp, Math.round(before * 1.5))
  } finally { LEGACY.lv.d3 = lv0; MON_STAT.body.boss = body0 }
  const p = applyPatch({ monsters: { 'deathknight.hp': 4000 } }, {})
  try { assert.equal(at('deathknight').hp, 4000) } finally { p.revert() }
})

test('v76 extras: phase heal / shield from WIS, razor from INT', () => {
  const lich = at('lich'), base = MONSTERS.lich.phases ?? []
  const healed = (lich.phases ?? []).map((p, i) => [p.heal ?? 0, base[i]?.heal ?? 0])
  assert.ok(healed.some(([a, b]) => b > 0 && a > b), `lich phase heal ${JSON.stringify(healed)}`)
  assert.equal(MONSTERS.lich.phases, base, 'base def untouched')
  const hunter = at('hunter')
  assert.ok(hunter.razor !== undefined && Math.abs(hunter.razor / (MONSTERS.hunter.razor ?? 1) - 1) < 0.1, `hunter razor ${hunter.razor}`)
  console.log(`lich phase heal ${healed.map(([a, b]) => `${b}->${a.toFixed(3)}`).join(' ')} · king shield ${MONSTERS.king.phases?.[0].shield}->${at('king').phases?.[0].shield?.toFixed(3)} · hunter razor ${MONSTERS.hunter.razor}->${hunter.razor?.toFixed(3)}`)
})
