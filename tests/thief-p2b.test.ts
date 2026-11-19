// Thief P2'b status layer + Skill 2 (design/p2/MAIN-VS-REV4.md §4) on top of P2'a: B1 Taken bracket (R4.6), thresholds as a share
// of the poison cap, Exposed / Wound, talents th_t4a / th_t1c, ม่านควัน / แผลลึก numbers. Run: node tools/test.mjs thief-p2b
import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAYER, type Stats } from '../src/data/game-data'
import { nodeById, TALENTS } from '../src/data/tree'
import { SKILL2 } from '../src/data/skill2'
import { debuffKinds, KIT, poisonAt, skill2Info, thiefBloodKingOn, poisonCapOf, S2N, S2P, takenAmp, type DebuffFlags, type TakenIn } from '../src/data/skill-math'

const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)
const NO: DebuffFlags = { poison: false, wound: false, exposed: false, chill: false, stabMark: false, blind: false, armorBrk: false, weak: false }
const T0: TakenIn = { exposed: 0, stabMark: 0, woundPriv: 0, privileged: 0, poisonAmp: 0 }

test('B1 takenAmp: terms add (never multiply), one cap, empty = 0', () => {
  assert.equal(takenAmp(T0), 0)
  near(takenAmp({ ...T0, exposed: 0.2, privileged: 0.18 }), 0.38, 'under the cap: plain sum')
  // R4.6.3 worst case that can really happen (Exposed ⟂ woundPriv: one Skill 2) = Exposed ★ 0.30 + th_t4a 0.30 + gear 0.45 -> cap
  near(takenAmp({ ...T0, exposed: 0.3, privileged: 0.3, poisonAmp: 0.45 }), KIT.thiefTakenCap, 'cap')
  near(KIT.thiefTakenCap, 0.6)
  assert.equal(takenAmp({ ...T0, exposed: -1 }), 0, 'never below 0')
})

test('debuffKinds: narrow = poison / Wound / Exposed / chill, wide adds stabMark / blind / armorBrk / weak', () => {
  assert.equal(debuffKinds(NO, false), 0)
  const all: DebuffFlags = { poison: true, wound: true, exposed: true, chill: true, stabMark: true, blind: true, armorBrk: true, weak: true }
  assert.equal(debuffKinds(all, false), 4)
  assert.equal(debuffKinds(all, true), 8)
  assert.equal(debuffKinds({ ...NO, blind: true, weak: true }, false), 0, 'wide-only kinds do not count narrow')
  assert.equal(debuffKinds({ ...NO, blind: true, weak: true }, true), 2)
})

test('thresholds follow the poison cap (MAIN-VS-REV4 §5.1 #3): share x poisonMax(), rounded up, at least 1', () => {
  const base = poisonCapOf({ poisonCap: 0 }), a3 = poisonCapOf({ poisonCap: 9 }) // พิษสะสม Lv 5 = +9
  assert.equal(base, 20)
  assert.equal(poisonAt(KIT.thiefPoisonAmpShare, base), 10, 'gear กัดกร่อน at the base cap = the old 10 stacks')
  assert.equal(poisonAt(KIT.thiefPrivShare, base), 12)
  assert.equal(poisonAt(KIT.thiefPoisonAmpShare, a3), 15, 'cap 29 -> 15 (grows with the cap)')
  assert.equal(poisonAt(KIT.thiefPrivShare, a3), 18)
  assert.equal(poisonAt(0, base), 1)
  assert.ok(poisonAt(KIT.thiefPrivShare, a3) <= a3 && poisonAt(1, a3) === a3, 'never above the cap')
})

test('Skill 2 numbers: ม่านควัน / แผลลึก plain numbers, "+" values whole at fractional s2Lv, no ล้วงกระเป๋า rework', () => {
  const nums = ['smokeTurns', 'smokeFlee', 'smokeSkillCrit', 'smokeCritDmg', 'raidMul', 'exposedPct', 'exposedStar', 'exposedTurns', 'smokeBlindTurns',
    'woundStacks', 'woundStarStacks', 'woundTurns', 'woundStrikeChance', 'bladeAt', 'bladeMul', 'bladeHealCut', 'bladeCutTurns', 'woundPriv'] as const
  for (const k of nums) assert.ok(typeof S2N[k] === 'number' && S2N[k] > 0, k)
  assert.ok(S2N.exposedStar >= S2N.exposedPct && S2N.woundStarStacks >= S2N.woundStacks)
  let prev = 0
  for (const lv of [0, 0.6, 1.2, 1.8, 2.4, 3, 3.6, 5]) {
    const w = S2N.woundMax(lv), r = S2N.smokeRes(lv)
    assert.ok(Number.isInteger(w) && Number.isInteger(r), `lv ${lv}: ${w} / ${r}`)
    assert.ok(w >= prev && w >= S2N.bladeAt, `woundMax never drops and reaches Blade's End (lv ${lv})`); prev = w
  }
  assert.equal(S2N.woundMax(0), 6); assert.equal(S2N.woundMax(3), 8); assert.equal(S2N.smokeRes(3), 25)
  assert.ok('smokeRes' in S2P && 'woundMax' in S2P)
  assert.equal(typeof S2N.pickMul, 'function', "th_pick = main's steal (not touched)")
  for (const k of ['pickBase', 'pickStarMul', 'pickZeny', 'plunderRes']) assert.ok(!(k in S2N), k)
})

test('status layer: thief_c1 counts Wound / Exposed kinds, th_t2b counts poison + Wound stacks (texts say so)', () => {
  const c1 = nodeById('thief_c1'), t2b = TALENTS.find((t) => t.id === 'th_t2b')
  assert.ok(c1 && t2b)
  assert.match(c1.desc(1), /Wound/); assert.match(c1.desc(1), /Exposed/)
  assert.match(t2b.desc(1), /พิษ \+ Wound/)
})

test('B1 worst cases stay under the cap (R4.6.3: one Skill 2, one row-4 talent)', () => {
  // ม่านควัน ★ Exposed + th_t4a r2 + gear 0.45 · แผลลึก Privileged + th_t4a r2 + gear 0.45 · dot = no Exposed
  near(takenAmp({ ...T0, exposed: S2N.exposedStar, privileged: 0.3, poisonAmp: 0.45 }), KIT.thiefTakenCap)
  near(takenAmp({ ...T0, woundPriv: S2N.woundPriv, privileged: 0.3, poisonAmp: 0.45 }), KIT.thiefTakenCap)
  near(takenAmp({ ...T0, exposed: 0, woundPriv: 0, privileged: 0.3 }), 0.3)
  // old flat line: gear 0.45 + old กัดกร่อน 0.25 = x1.70 -> now capped at x1.60
  near(1 + takenAmp({ ...T0, poisonAmp: 0.45 + 0.25 }), 1.6)
})

test('talents th_t4a สถานะทับซ้อน / th_t1c กายต้านพิษ: new Stats keys, every rank > 0, no old poisonAmp / maxHp', () => {
  const tal = (id: string) => { const t = TALENTS.find((x) => x.id === id); assert.ok(t, id); return t }
  for (const id of ['th_t4a', 'th_t1c']) {
    for (const r of [1, 2]) {
      const mod = tal(id).mod(r)
      for (const [k, v] of Object.entries(mod)) { assert.ok(k in PLAYER, `${id} ${k}`); assert.ok(typeof v === 'number' && v > 0, `${id} r${r} ${k}=${v}`) }
      assert.ok(!('poisonAmp' in mod) && !('maxHp' in mod), `${id} r${r}: old meaning gone`)
      assert.ok(!/undefined|NaN/.test(tal(id).desc(r)), tal(id).desc(r))
    }
  }
  assert.deepEqual(tal('th_t4a').mod(1), { thPrivileged: 0.18 }); assert.deepEqual(tal('th_t4a').mod(2), { thPrivileged: 0.3 })
  assert.deepEqual(tal('th_t1c').mod(2), { thCondTenacity: 0.14, thStackHp: 14 })
  assert.match(tal('th_t4a').desc(2), /12 จาก 20/)
  const zero: Partial<Stats> = { thPrivileged: PLAYER.thPrivileged, thStackHp: PLAYER.thStackHp, thCondTenacity: PLAYER.thCondTenacity }
  assert.deepEqual(zero, { thPrivileged: 0, thStackHp: 0, thCondTenacity: 0 })
  // full th_t1c = KIT.thiefStackHpMax stacks x 14 Max HP
  assert.equal(KIT.thiefStackHpMax * tal('th_t1c').mod(2).thStackHp!, 280)
})

// ---------- save migration thiefRogueRework v2 (localStorage mock for load()) ----------
test('ม่านควัน: cost 35, texts + info rows read S2N, ราชันย์โลหิต also on inside Shroud', () => {
  const sk = SKILL2.find((x) => x.id === 'th_smoke'); assert.ok(sk)
  assert.equal(sk.cost, 35)
  assert.match(sk.desc, /Shroud 2 เทิร์น/); assert.match(sk.desc, /Sightless Raid 1\.2x/); assert.match(sk.star.desc, /30%/)
  for (const lv of [0, 0.6, 3]) assert.ok(!/undefined|NaN/.test(sk.plus.desc(lv)), sk.plus.desc(lv))
  assert.match(sk.plus.desc(3), /Energy 25/)
  for (const [s2Lv, s2Star] of [[0, 0], [3, 1]]) {
    const rows = skill2Info(sk, { ...PLAYER, s2Lv, s2Star })
    assert.ok(rows.some((r) => /Shroud/.test(r.label)) && rows.some((r) => /Exposed/.test(r.label)), JSON.stringify(rows))
    assert.ok(rows.every((r) => !/undefined|NaN/.test(r.label + r.value)))
  }
  const bk: Stats = { ...PLAYER, thBloodKing: 1 }
  assert.equal(thiefBloodKingOn(bk, 100, 100, true), true, 'full HP inside Shroud')
  assert.equal(thiefBloodKingOn(bk, 100, 100, false), false)
  assert.equal(thiefBloodKingOn(PLAYER, 1, 100, true), false, 'needs the node')
  assert.match(nodeById('thief_c4')!.desc(1), /ม่านควัน/)
})

test('แผลลึก: texts + info rows read S2N (Wound, Blade\'s End, Privileged), whole numbers at fractional "+" Lv', () => {
  const sk = SKILL2.find((x) => x.id === 'th_wound'); assert.ok(sk)
  assert.match(sk.desc, /Wound 2 stack \(สูงสุด 6/); assert.match(sk.desc, /Blade's End 1\.8x/); assert.match(sk.desc, /\+12%/)
  for (const lv of [0, 0.6, 1.8, 3]) { const d = sk.plus.desc(lv); assert.ok(!/undefined|NaN|\.\d{2,}/.test(d), d) }
  assert.match(sk.plus.desc(3), /Wound สูงสุด 8/)
  assert.match(sk.star.desc, /Wound 3 stack/)
  const rows = skill2Info(sk, { ...PLAYER, s2Lv: 3, s2Star: 1 })
  for (const k of ['Wound', "Blade's End", 'Privileged']) assert.ok(rows.some((r) => r.label.includes(k)), k)
  assert.ok(rows.every((r) => !/undefined|NaN/.test(r.label + r.value)))
})

const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}
const { migrateThiefRogueRework, newSave, THIEF_REWORK_VER } = await import('../src/save')
type SaveData = ReturnType<typeof newSave>

test('migration v2: a P2\'a (v1) Thief gets web + talents back once, v2 saves are left alone', () => {
  assert.ok(THIEF_REWORK_VER >= 2) // P3'a bumped it to 3 (tests/rogue-p3a.test.ts)
  const s = newSave('th', 'human')
  Object.assign(s, { job: 'thief', thiefRogueRework: 1, skillPoints: 1, jobTree: { thief_core1: 5, th_wound: 1 }, jobTalents: { 1: { id: 'th_t1c', rank: 2 }, 4: { id: 'th_t4a', rank: 2 } } } as Partial<SaveData>)
  migrateThiefRogueRework(s)
  assert.equal(s.thiefRogueRework, THIEF_REWORK_VER)
  assert.deepEqual(s.jobTree, {}); assert.deepEqual(s.jobTalents, {})
  assert.equal(s.skillPoints, 1 + 6)
  s.jobTree = { thief_a1: 1 }
  migrateThiefRogueRework(s)
  assert.deepEqual(s.jobTree, { thief_a1: 1 }, 'idempotent')
  const fresh = newSave('n', 'human')
  assert.equal(fresh.thiefRogueRework, THIEF_REWORK_VER)
  Object.assign(fresh, { job: 'thief', jobTree: { thief_a1: 2 } })
  migrateThiefRogueRework(fresh)
  assert.deepEqual(fresh.jobTree, { thief_a1: 2 })
  const arc = newSave('a', 'human'); Object.assign(arc, { job: 'archer', thiefRogueRework: 1, jobTree: { archer_a1: 3 } })
  migrateThiefRogueRework(arc)
  assert.deepEqual(arc.jobTree, { archer_a1: 3 }); assert.equal(arc.thiefRogueRework, THIEF_REWORK_VER)
})
