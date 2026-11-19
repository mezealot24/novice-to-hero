// v68 monster stats + stat-scaled skills. Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DUNGEONS, MONSTERS, type MonsterKind } from '../src/data/game-data'
import { PACKS } from '../src/data/dungeons'
import { deepKind, homeDungeon, homeLv, monPoints, scaleOf, skillMul, slamScaleOf, SKILL_SCALE, statMonster, statNative } from '../src/data/mon-stats'

const kinds = Object.keys(MONSTERS) as MonsterKind[]
const d1 = DUNGEONS[0]

test('every monster has its own statAlloc object (admin.html can edit it)', () => {
  const bad = kinds.filter((k) => !MONSTERS[k].statAlloc || typeof MONSTERS[k].statAlloc === 'string')
  assert.deepEqual(bad, [])
  const d6 = ['dunewraith', 'jackal', 'jackallord', 'mummy', 'pharaoh', 'sandscorp', 'scarab', 'sphinx', 'sunpriest']
  const packs = PACKS.filter((p) => p.dungeon).flatMap((p) => Object.keys(p.monsters)) // v78 D7-D10: every built pack monster is stat-native
  assert.deepEqual(kinds.filter(deepKind).sort(), [...d6, ...packs].sort())
  assert.deepEqual(kinds.filter((k) => !statNative(k)), [], 'v126: every monster is a stat monster')
})

test('D1-D5 / event monsters: hp / dmg are 1 placeholders, the numbers come from the 7 stats (like D6+)', () => {
  for (const k of kinds.filter((x) => !deepKind(x))) {
    const d = MONSTERS[k], o = statMonster(d, homeLv(k))
    assert.equal(d.hp, 1, `${k}.hp`); assert.equal(d.dmg, 1, `${k}.dmg`); assert.equal(d.matk, undefined, `${k}.matk`)
    assert.ok(o.base && o.lv, k)
    assert.equal(Object.keys(o.base!).length, 7, k)
    assert.ok((o.mdef ?? 0) <= 0.75 && (o.luckyDodge ?? 0) <= 0.25, k)
  }
})

test('home dungeon levels: boss > mini > normal, D1 < D5', () => {
  assert.equal(homeDungeon('jellop'), 'd1')
  assert.equal(homeDungeon('lich'), 'd5')
  assert.equal(homeDungeon('maiden'), 'd3')
  assert.equal(homeDungeon('spiderling'), 'd4')
  const room = (id: string, f: (r: (typeof d1.rooms)[number]) => boolean) => DUNGEONS.find((d) => d.id === id)!.rooms.find(f)!.lv!
  assert.ok(room('d5', (r) => !!r.boss) > room('d5', (r) => !!r.mini) && room('d5', (r) => !!r.mini) > room('d5', (r) => !r.boss && !r.mini))
  assert.ok(room('d1', (r) => !!r.boss) < room('d5', (r) => !!r.boss))
  assert.equal(homeLv('mimic'), d1.level![0]) // an event monster (no home) counts as a D1 one
})

test('caster gets M.DEF from WIS, hard mode adds points', () => {
  const lich = MONSTERS.lich, lv = 21
  const n = statMonster(lich, lv), h = statMonster(lich, lv, { hard: true })
  assert.ok((n.mdef ?? 0) > 0.1, `lich mdef ${n.mdef}`)
  assert.ok(h.base!.int > n.base!.int && (h.mdef ?? 0) > (n.mdef ?? 0))
})

test('skillMul: 1 without stats, grows with the stat, clamped', () => {
  const bolt = { kind: 'bolt' as const, every: 3, name: 'x', pow: 1.3 }
  assert.equal(skillMul(MONSTERS.shroom, scaleOf(bolt)), 1) // raw def: no stats yet
  const lich = statMonster(MONSTERS.lich, 21), lichHard = statMonster(MONSTERS.lich, 21, { hard: true })
  const m = skillMul(lich, scaleOf(bolt))
  assert.ok(m > 1 && m <= SKILL_SCALE.max, `lich bolt x${m}`)
  assert.ok(skillMul(lichHard, scaleOf(bolt)) > m)
  // a strength fighter's bolt is weaker than a caster's at the same level
  const war = statMonster(MONSTERS.warlord, 21)
  assert.ok(skillMul(war, scaleOf(bolt)) < m)
  assert.ok(skillMul(war, scaleOf({ kind: 'strike', every: 3, name: 'y' })) > 1)
  // flat override + curse never scale
  assert.equal(skillMul(lich, scaleOf({ ...bolt, scale: false })), 1)
  assert.equal(scaleOf({ kind: 'curse', every: 3, name: 'z' }), undefined)
  // clamp
  const big = { ...lich, base: { ...lich.base!, int: 9999 } }
  assert.equal(skillMul(big, scaleOf(bolt)), SKILL_SCALE.max)
})

test('skill overrides: turtle shields from VIT, gunner rocket from DEX', () => {
  assert.equal(scaleOf(MONSTERS.turtleguard.skills![0])?.stat, 'vit')
  assert.equal(slamScaleOf(MONSTERS.gunner).stat, 'dex')
  assert.equal(slamScaleOf(MONSTERS.lich).stat, 'int')
  assert.equal(slamScaleOf(MONSTERS.warlord).stat, 'str')
})

test('D6 stat monsters scale skills too', () => {
  const ph = statMonster(MONSTERS.pharaoh, 50)
  const m = skillMul(ph, scaleOf(ph.skills![0]))
  assert.ok(m > 1, `pharaoh bolt x${m}`)
  assert.ok(monPoints(50, 'boss') > monPoints(50, 'normal'))
})
