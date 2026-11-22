// 🔱 Knight ult rework (Q 2026-11-23): Pierce of Judgement = the whole ดาบพิพากษา kit (⚔️ ปลุก + ✨ + ult web) whose wave is ONE
// boss-first spear thrust that crits only with skillCrit, with the FULL ⚖️ execute curve like the job1 Swordsman (Berserker keeps execLineShare).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SWORD_MANA, swordAwakenUlt, swordExecMul } from '../src/data/jobs'
import { JOB2 } from '../src/data/jobs2'
import { JOB3 } from '../src/data/jobs3'
import { KIT2, ultInfo } from '../src/data/skill-math'
import { PLAYER } from '../src/data/stats'
import { nodeById } from '../src/data/tree'
import { DEFS, SWORD_PFX } from '../src/gfx/pixelfx'
import { createFrame, createFx, clearFrame } from '../src/vendor/pixelfx/core/index.js'

test('Knight ult is Pierce of Judgement: awaken + spear wave, boss first, crit only with skillCrit, execute at 30%', () => {
  const u = JOB2.knight.ult
  assert.equal(u.name, 'Pierce of Judgement')
  assert.equal(u.cost, SWORD_MANA.ult)
  for (const re of [/ปลุกหอก/, /คลื่นทะลวง/, /บอสก่อน/, /skillCrit/, /คำพิพากษา/, /30%/]) assert.match(u.desc, re)
  assert.doesNotMatch(u.desc, /Bowling/)
  assert.match(JOB3.lordknight.ultDesc, /คลื่นทะลวง/)
})

test('awaken + full execute: job1 and Knight yes, Berserker no', () => {
  assert.equal(swordAwakenUlt(undefined), true)
  assert.equal(swordAwakenUlt('knight'), true)
  assert.equal(swordAwakenUlt('berserker'), false)
})

test('ult detail: Knight shows the spear thrust rows and the full execute curve (×3 at ≤25%), Berserker keeps the share', () => {
  const st = { ...PLAYER, atk: 100 }
  const kn = ultInfo('swordsman', st, { str: 50, wis: 0 }, 'knight')
  const val = (rows: typeof kn, l: string) => rows.find((r) => r.label === l)?.value
  assert.ok(val(kn, '⚔️ ปลุกหอก'))
  assert.ok(val(kn, '🔱 คลื่นทะลวง/ฮิต (เป้าเดียว)'))
  assert.doesNotMatch(String(val(kn, '🔱 คลื่นทะลวง/ฮิต (เป้าเดียว)')), /คริ/) // no skillCrit = no crit
  const kc = ultInfo('swordsman', { ...st, skillCrit: 0.1 }, { str: 50, wis: 0 }, 'knight')
  assert.match(String(val(kc, '🔱 คลื่นทะลวง/ฮิต (เป้าเดียว)')), /คริ/) // skillCrit opens it
  assert.equal(val(kn, '🔱 จำนวนฮิต'), `${KIT2.knight.pierceHits} (บอส/มินิ ${KIT2.knight.pierceBigHits})`)
  assert.equal(kn.find((r) => r.label.startsWith('🌊 คลื่นดาบ')), undefined)
  assert.equal(val(kn, '⚖️ execute เป้า HP ≤25%'), `×${swordExecMul(0.25, false).toFixed(2)}`)
  const bz = ultInfo('swordsman', st, { str: 50, wis: 0 }, 'berserker')
  assert.equal(val(bz, '⚖️ execute เป้า HP ≤25%'), `×${swordExecMul(0.25, false, SWORD_MANA.execLineShare).toFixed(2)}`)
  assert.equal(bz.find((r) => r.label === 'โล่'), undefined) // the old 2nd-job ult shield row is gone
})

test('save safety: renamed Knight nodes keep their ids and effects', () => {
  assert.deepEqual(nodeById('kn_p2')?.mod(1), { j2PierceHits: 1 })
  assert.deepEqual(nodeById('kn_p4')?.mod(1), { j2Spiral: 0.5 })
  assert.match(nodeById('kn_p2')!.desc(1), /คลื่นทะลวง/)
  assert.ok(!('bashMul' in KIT2.knight)) // Bowling Bash is gone
})

test('🔱 spear wave pixelfx is registered, preloaded for the Swordsman line and draws a lit lance every frame', () => {
  assert.ok(DEFS.spearWave)
  assert.ok(SWORD_PFX.includes('spearWave'))
  const { mod } = DEFS.spearWave
  const { size: [w, h], origin: [ox, oy], duration } = mod.meta
  const fx = createFx(mod, { x: ox, y: oy })
  const frame = createFrame(w, h)
  for (let i = 0; i <= Math.round(duration / 0.05); i++) {
    if (i > 0) fx.update(0.05)
    clearFrame(frame); fx.draw(frame)
    let lit = 0, tip = 0
    for (let k = 0; k < w * h; k++) if (frame.color[k] !== 0) lit++
    for (let x = ox - 4; x <= ox; x++) if (frame.color[oy * w + x] !== 0) tip++
    assert.ok(lit > 600, `frame ${i}: ${lit} px`)
    assert.ok(tip > 0, `frame ${i}: the spear tip is at the origin`)
  }
})
