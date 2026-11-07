import test from 'node:test'
import assert from 'node:assert/strict'
import { chipGrid, floatLane, stagePill, statusChips, type HeroBuffs, type HeroDebuffs } from '../src/battle/hud-layout'

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
