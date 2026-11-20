import test from 'node:test'
import assert from 'node:assert/strict'
import { chipGrid, comboBannerSpec, floatLane, hazardHudBadge, stagePill, statusChips, turnHitsHudText, turnQueueSpeedText, type HeroBuffs, type HeroDebuffs } from '../src/battle/hud-layout'
import { createBiomeCombatState } from '../src/data/biome-hazards'
import { PLAYER } from '../src/data/game-data'
import { derivedRows, estimateHitsPerTurn, turnRatioVsRef, turnSpeedOf } from '../src/data/stat-rows'
import { statLines } from '../src/data/statInfo'

const noDebuff: HeroDebuffs = { poison: 0, burn: 0, weaken: 0, armorBreak: 0, silence: 0, web: 0, slow: 0, thorn: 0, venomTurns: 0 }
const noBuff: HeroBuffs = { dawnWis: 0, bless: 0, kyrieHits: 0, gloria: false, guard: 0, blood: 0, hawk: 0, mshield: 0, renew: 0, s2Icon: '🙏', s2Name: 'พรแสง' }

test('chips: nothing on = no chips', () => {
  assert.deepEqual(statusChips(noDebuff, noBuff), [])
})

test('chips: debuffs first, then buffs, with counts', () => {
  const c = statusChips({ ...noDebuff, poison: 3, silence: 2 }, { ...noBuff, gcLeft: 2, bless: 4, kyrieHits: 3, gloria: true })
  assert.deepEqual(c.map((x) => [x.icon, x.n, x.kind]), [
    ['☠️', '3', 'debuff'], ['🤐', '2', 'debuff'],
    ['✝️', '2', 'buff'], ['🙏', '4', 'buff'], ['🛡️', '3', 'buff'], ['✨', '', 'buff'],
  ])
})

test('chips: Gloria only shows while the blessing is up; Dawn shows n/every', () => {
  const c = statusChips(noDebuff, { ...noBuff, gloria: true, dawn: { n: 1, every: 3 } })
  assert.deepEqual(c.map((x) => [x.icon, x.n]), [['🌄', '1/3']])
})

test('grid: wraps into rows of whole chips', () => {
  const g = chipGrid(10, 290, 28, 4) // 9 per row
  assert.equal(g.overflow, 0)
  assert.equal(g.pos.length, 10)
  assert.deepEqual(g.pos[8], { x: 256, y: 0 })
  assert.deepEqual(g.pos[9], { x: 0, y: 32 })
})

test('grid: past 2 rows the last slot becomes +N', () => {
  const g = chipGrid(25, 290, 28, 4) // cap 18 -> 17 shown + "+8"
  assert.equal(g.pos.length, 18)
  assert.equal(g.overflow, 8)
})

test('stage pill: level, mods, where, turns; warns at 3 turns left', () => {
  const base = { hard: false, hardK: { hp: 1, atk: 1 }, modIcons: '', where: 'ห้อง 6/6', fighting: true, left: 14, limit: 20 }
  assert.deepEqual(stagePill({ ...base, roomLv: 90, hard: true, modIcons: '💥🩸' }), { text: 'Lv90 🔥ยาก · 💥🩸 · ห้อง 6/6 · ⏳ 14/20', warn: false })
  assert.equal(stagePill({ ...base, left: 3 }).warn, true)
  assert.deepEqual(stagePill({ ...base, fighting: false, left: 0 }), { text: 'ห้อง 6/6 · ⏳ -', warn: false })
  assert.equal(stagePill({ ...base, hard: true, hardK: { hp: 2.04, atk: 1.5 } }).text, '🔥ยาก HP x2.0 ATK x1.5 · ห้อง 6/6 · ⏳ 14/20')
})

test('float lanes: only recent texts near the same spot count', () => {
  const recent = [{ x: 220, y: 280, t: 1000 }, { x: 225, y: 290, t: 1200 }, { x: 700, y: 280, t: 1200 }, { x: 220, y: 280, t: 100 }]
  assert.equal(floatLane(recent, 220, 280, 1300), 2)
})

test('hazardHudBadge: returns null for none and formats D11-D13 hazards in a non-overlapping slot', () => {
  assert.equal(hazardHudBadge(null), null)
  assert.equal(hazardHudBadge(createBiomeCombatState('none', ['m0'])), null)

  const d11 = createBiomeCombatState('clockwork_heat', ['m0'])
  d11.heat = 60
  const b11 = hazardHudBadge(d11, 960)!
  assert.equal(b11.tone, 'sweet')
  assert.equal(b11.x, 480)
  assert.equal(b11.y, 118)
  assert.match(b11.text, /60\/100.*Sweet Spot/)

  const d12 = createBiomeCombatState('abyssal_pressure', ['m0'])
  const b12 = hazardHudBadge(d12, 960)!
  assert.equal(b12.tone, 'neutral')
  assert.match(b12.text, /แรงดันก้นสมุทร.*ฮีล 70%/)

  const d13 = createBiomeCombatState('astral_eclipse', ['m0'], new Set(['m0']))
  const b13 = hazardHudBadge(d13, 960)!
  assert.equal(b13.tone, 'warn')
  assert.match(b13.text, /ม่านดารา 6 ชั้น/)
})

test('turnQueueSpeedText: formats hero vs monster speed ratio and ATB gauge', () => {
  assert.equal(turnQueueSpeedText(14.5, [10], 45), '⚡ เร็ว 14.5 vs มอน 10.0 (1.45x เทิร์น) · เกจ 45%')
  assert.equal(turnQueueSpeedText(10, [], 0), '⚡ ความเร็วเทิร์น 10.0 (เกจ ATB 100)')
  assert.equal(turnQueueSpeedText(12, [8], 130), '⚡ เร็ว 12.0 vs มอน 8.0 (1.50x เทิร์น) · เกจ 100%')
})

test('turnHitsHudText: shows estimate before first turn, live hits during turn, and last/avg/peak after', () => {
  assert.equal(
    turnHitsHudText({ activeTurnHits: 0, lastTurnHits: 0, totalHits: 0, turnsTaken: 0, peakHits: 0, estAvg: 2.6, estMax: 4, inTurn: false }),
    '⚔️ Hits/เทิร์น (ประเมิน): เฉลี่ย 2.6 · สูงสุด 4 ฮิต',
  )
  assert.equal(
    turnHitsHudText({ activeTurnHits: 5, lastTurnHits: 2, totalHits: 9, turnsTaken: 2, peakHits: 4, estAvg: 2.6, estMax: 4, inTurn: true }),
    '⚔️ เทิร์นนี้: 5 HIT! · เฉลี่ย 4.5/เทิร์น (สูงสุด 5)',
  )
  assert.equal(
    turnHitsHudText({ activeTurnHits: 0, lastTurnHits: 3, totalHits: 12, turnsTaken: 4, peakHits: 5, estAvg: 2.6, estMax: 4, inTurn: false }),
    '⚔️ Hits/เทิร์น: ล่าสุด 3 · เฉลี่ย 3.0 (สูงสุด 5)',
  )
})

test('stat-rows: estimateHitsPerTurn, turnSpeedOf, turnRatioVsRef, and derivedRows', () => {
  const nov = estimateHitsPerTurn({ ...PLAYER, combo: 0 }, 'novice')
  assert.equal(nov.baseHitsPerSwing, 1)
  assert.equal(nov.avgHits, 1)
  assert.equal(nov.maxHits, 1)

  const thief = estimateHitsPerTurn({ ...PLAYER, doubleAtk: 5, combo: 0.5, comboCount: 1 }, 'thief')
  assert.equal(thief.baseHitsPerSwing, 2)
  assert.ok(Math.abs(thief.avgHitsPerSwing - 2.6) < 1e-9)
  assert.equal(thief.maxHitsPerSwing, 3)
  assert.equal(thief.maxSwings, 3)
  assert.equal(thief.maxHits, 9)
  assert.ok(thief.avgHits > 4 && thief.avgHits < 5)

  const rogue = estimateHitsPerTurn({ ...PLAYER, doubleAtk: 5, combo: 0.5, comboCount: 1, j2KnifeAdd: 1, j2LivingShadow: 1 }, 'thief', 'rogue')
  assert.equal(rogue.maxHits, 9 + 2 * 2 + 1)

  const fastSt = { ...PLAYER, aspd: PLAYER.aspd * 1.5 }
  assert.ok(Math.abs(turnSpeedOf(fastSt) - 15) < 1e-9)
  assert.ok(Math.abs(turnRatioVsRef(fastSt) - 1.5) < 1e-9)

  const rows = derivedRows({ ...PLAYER, aspd: PLAYER.aspd * 1.5, combo: 0.5 }, 'thief')
  const hitsRow = rows.find(([label]) => label === 'Hits / เทิร์น (ตีปกติ)')
  const spdRow = rows.find(([label]) => label === 'ความเร็วเทิร์น (เกจ 100)')
  assert.ok(hitsRow && hitsRow[1].includes('เฉลี่ย') && hitsRow[1].includes('สูงสุด'))
  assert.ok(spdRow && spdRow[1] === '15.0 (~1.50x มอน)')
})

test('statInfo: AGI lines explain ATB 100 turn speed, Flee, Combo, and Ignore Monster Combo', () => {
  const lines = statLines('agi', 'thief', 41, undefined, 40)
  const joined = lines.generic.join(' | ')
  assert.match(joined, /ความเร็วเทิร์น \+1\.5%\/แต้ม.*ตอนนี้ \+60%.*ATB 100/)
  assert.match(joined, /Flee \+1\/แต้ม.*ตอนนี้ \+41/)
  assert.match(joined, /คอมโบ 10%.*กันมอนคอมโบ 9%/)
})

test('comboBannerSpec: builds fighting-game rank tiers, hit pluralization, and formatted total damage', () => {
  assert.equal(comboBannerSpec(0, 0), null)

  const h1 = comboBannerSpec(1, 120)!
  assert.equal(h1.hitsLabel, '1 HIT!')
  assert.equal(h1.dmgLabel, 'TOTAL 120 DMG')
  assert.equal(h1.rankLabel, '')

  const h2 = comboBannerSpec(2, 350)!
  assert.equal(h2.hitsLabel, '2 HITS!')
  assert.equal(h2.rankLabel, '⚔️ COMBO!')

  const h3 = comboBannerSpec(3, 600)!
  assert.equal(h3.hitsLabel, '3 HITS!')
  assert.equal(h3.rankLabel, '✨ RUSH!')

  const h5 = comboBannerSpec(5, 1250)!
  assert.equal(h5.hitsLabel, '5 HITS!')
  assert.equal(h5.dmgLabel, 'TOTAL 1,250 DMG')
  assert.equal(h5.rankLabel, '💥 GREAT!')

  const h7 = comboBannerSpec(7, 2400)!
  assert.equal(h7.hitsLabel, '7 HITS!')
  assert.equal(h7.rankLabel, '⚡ SUPER COMBO!')

  const h10 = comboBannerSpec(10, 5000)!
  assert.equal(h10.hitsLabel, '10 HITS!')
  assert.equal(h10.dmgLabel, 'TOTAL 5,000 DMG')
  assert.equal(h10.rankLabel, '🔥 ULTRA COMBO!!')
})
