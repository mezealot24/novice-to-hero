// Thief P2'c Ult x เกจเงา (design/p2/MAIN-VS-REV4.md §4 / §5.2 + owner answers Q1 / Q2): Ult budget in 2 states (ร่างเงา on / off),
// Global Ult CD cap, B3 crit-dmg bracket, thief_b = gauge modifiers, thief_u line, talents rows 1 / 3. Run: node tools/test.mjs thief-p2c
import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAYER, type Stats } from '../src/data/game-data'
import { CRIT_RULES } from '../src/data/battle-rules'
import { readFileSync } from 'node:fs'
import { branchesOf, nodeById, TALENTS } from '../src/data/tree'
import { condCritB3, KIT, thiefOnHitEff, ultInfo, thiefUltBudget, thiefUltCondCritDmg, thiefUltCritRate, thiefUltFinisher, thiefUltHitCount, ultCdCut, type UltHero } from '../src/data/skill-math'

const near = (a: number, b: number, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} != ${b}`)
const st = (o: Partial<Stats> = {}): Stats => ({ ...PLAYER, ...o })
/** Live ceiling (Q2): main's best เงาพริ้ว = th_t3b มีดรัว R2 (+3 stabs = 7), no P2'c stats, same hero, same gauge state. */
const LIVE_T3B_R2 = 3
const ceiling = (h: UltHero, shadow: boolean, gearHits = 0) => thiefUltBudget(st({ ultHits: LIVE_T3B_R2 + gearHits }), h, shadow)

test('budget model: without P2\'c stats it is the live Ult (n stabs x expected crit), ร่างเงา = every stab a full crit', () => {
  const h: UltHero = { skillCrit: 0.2, critMul: 2 }
  near(thiefUltBudget(st(), h, false), 4 * (1 + 0.2 * 1), 'off: 4 stabs, p = skillCrit')
  near(thiefUltBudget(st(), h, true), 4 * 2, 'on: 4 sure crits')
  near(ceiling(h, false), 7 * 1.2); near(ceiling(h, true), 14)
  near(thiefUltBudget(st(), { skillCrit: 0, critMul: 3 }, false), 4, 'crit rework: no skillCrit = a physical Ult never crits')
})

test('Ult crit rate: thief_u1 / th_t3a count as skillCrit, skill cap holds', () => {
  assert.equal(thiefUltCritRate(0, st()), 0)
  near(thiefUltCritRate(0, st({ thUltCrit: 0.05 })), 0.05, 'Ult bonus alone opens Ult crits')
  near(thiefUltCritRate(0.1, st({ thUltCrit: 0.05, thUltExecCrit: 0.08 })), 0.23)
  near(thiefUltCritRate(0.58, st({ thUltCrit: 0.05 })), CRIT_RULES.cap.skillCrit, 'cap')
})

test('Ult-own conditional crit dmg: kinds count up to the max, low-HP terms, one cap', () => {
  const s = st({ thUltCondCritDmg: 0.02, thExecUlt: 0.04, thUltExecDmg: 0.1 })
  assert.equal(thiefUltCondCritDmg(st(), 4, 0), 0)
  near(thiefUltCondCritDmg(st({ thUltCondCritDmg: 0.02 }), 5, 1), 0.02 * KIT.thiefUltKindsMax, 'kinds capped')
  near(thiefUltCondCritDmg(st({ thExecUlt: 0.04 }), 0, KIT.thiefExecBelow - 0.01), 0.04)
  assert.equal(thiefUltCondCritDmg(st({ thExecUlt: 0.04 }), 0, KIT.thiefExecBelow), 0, 'not at the line')
  near(thiefUltCondCritDmg(st({ thUltExecDmg: 0.1 }), KIT.thiefKindsAt, 1), 0.1, 'th_t3a: kinds open it at full HP')
  near(thiefUltCondCritDmg(s, 3, 0), KIT.thiefUltCondCap, 'everything -> cap')
})

test('On-Hit share and the closing stab', () => {
  assert.equal(thiefOnHitEff(st()), 0)
  near(thiefOnHitEff(st({ thUltOnHit: 0.12 })), KIT.thiefOnHitBase + 0.12)
  near(thiefOnHitEff(st({ thUltOnHit: 0.12, thUltOnHitTal: 0.05 })), KIT.thiefOnHitCap, 'cap')
  assert.deepEqual(thiefUltFinisher(st(), 9), { mul: 0, sure: false })
  assert.deepEqual(thiefUltFinisher(st({ thUltFinisher: 1 }), KIT.thiefFinisherAt - 1), { mul: 0, sure: false })
  assert.deepEqual(thiefUltFinisher(st({ thUltFinisher: 1 }), KIT.thiefFinisherAt), { mul: KIT.thiefFinisherMul, sure: true })
  assert.deepEqual(thiefUltFinisher(st({ thUltKillFinisher: 0.5 }), 0), { mul: 0.5, sure: false }, 'th_t3a: always, rolls crit')
  assert.equal(thiefUltHitCount(st({ ultHits: 2 })), KIT.thiefUltHits + 2)
})

test('Global Ult CD cap: per hero turn budget, floor in the cast turn, never negative', () => {
  assert.equal(KIT.thiefUltCdCutCap, 2)
  assert.equal(ultCdCut(4, 1, 2, false), 1)
  assert.equal(ultCdCut(4, 3, 2, false), 2, 'turn cap')
  assert.equal(ultCdCut(1, 2, 2, false), 1, 'not below 0')
  assert.equal(ultCdCut(0, 1, 2, false), 0)
  assert.equal(ultCdCut(4, 1, 0, false), 0, 'budget spent')
  assert.equal(ultCdCut(4, 5, 5, true), 4 - KIT.thiefUltCdFloor, 'cast turn: CD floor')
  assert.equal(ultCdCut(KIT.thiefUltCdFloor, 1, 2, true), 0)
  // three sources in one turn (th_t2a + thief_b3 + Rogue Kill Reset) share one budget
  let cd = 6, left = KIT.thiefUltCdCutCap
  for (const want of [1, 1, 1]) { const c = ultCdCut(cd, want, left, false); cd -= c; left -= c }
  assert.equal(cd, 6 - KIT.thiefUltCdCutCap)
})

test('B3 crit dmg bracket (R4.6): terms add, one cap, never negative · hardcoded thExecute x1.5 is gone', () => {
  assert.equal(condCritB3([]), 0)
  near(condCritB3([0.25, 0.15]), 0.4)
  near(condCritB3([0.25, 0.36, 0.15]), KIT.thiefCondCritDmgCap, 'Shroud ★ + rg_x2 Lv5 + Ult-own -> cap 0.75')
  near(condCritB3([-1, 0.1]), 0.1)
  const scene = readFileSync('src/scenes/BattleScene.ts', 'utf8')
  assert.ok(!/thExecute/.test(scene), 'BattleScene no longer reads the retired thExecute')
  // the Ult budget sees the other B3 terms on both sides: the Ult-own share shrinks near the cap
  const h: UltHero = { skillCrit: 0, critMul: 2, b3Other: 0.7 }
  near(thiefUltBudget(st({ thUltCondCritDmg: 0.05 }), h, true), 4 * (2 + 0.75))
})

const node = (id: string) => { const n = nodeById(id); assert.ok(n, id); return n }
const lvs = (id: string) => Array.from({ length: node(id).max }, (_, i) => node(id).mod(i + 1))

test('thief_b = เกจเงา modifiers (Q1: one gauge): fill faster · shield on entering · dodge in ร่างเงา cuts Ult CD · longer ร่างเงา', () => {
  for (const id of ['thief_b1', 'thief_b2', 'thief_b3', 'thief_b4']) {
    const n = node(id)
    assert.equal(n.branch, 'thief_b', id)
    for (let lv = 1; lv <= n.max; lv++) assert.ok(!/undefined|NaN/.test(n.desc(lv)), n.desc(lv))
  }
  assert.equal(node('thief_b1').max, 5)
  assert.deepEqual(lvs('thief_b1').map((m) => Math.round((m.thShadowFill ?? 0) * 100)), [20, 40, 60, 80, 100])
  near(lvs('thief_b1')[4].thShadowFlee ?? 0, 18)
  near(lvs('thief_b2')[4].dodgeHeal ?? 0, 0.06); near(lvs('thief_b2')[4].thShadowShield ?? 0, 0.3)
  assert.equal(lvs('thief_b3')[4].thShadowDodgeCd, 1)
  assert.deepEqual(node('thief_b4').mod(1), { dodgeStrike: 1, thShadowTurns: 1 })
  assert.match(node('thief_b3').desc(5), new RegExp(`${KIT.thiefUltCdCutCap}/เทิร์น`))
  assert.ok(!/ร่างเงา/.test(node('thief_b1').name + node('thief_b2').name + node('thief_b3').name + node('thief_b4').name), 'node names do not reuse the state name')
  assert.ok(!/Ghost Shroud|Shroud/.test(lvs('thief_b2').map((_, i) => node('thief_b2').desc(i + 1)).join()), 'no second shadow resource')
})

/** Stats of a build: web nodes at a level + talents at a rank, mods summed like heroBuild. */
const build = (nodes: [string, number][], tals: [string, number][] = [], base: Partial<Stats> = {}): Stats => {
  const out: Stats = st(base)
  const add = (m: Partial<Stats>) => { for (const [k, v] of Object.entries(m) as [keyof Stats, number][]) (out[k] as number) += v }
  for (const [id, lv] of nodes) add(node(id).mod(lv))
  for (const [id, r] of tals) { const t = TALENTS.find((x) => x.id === id); assert.ok(t, id); add(t.mod(r)) }
  return out
}
const U_FULL: [string, number][] = [['thief_u1', 5], ['thief_u2', 5], ['thief_u3', 5], ['thief_u4', 1]]
const SC = [0, 0.1, 0.2, 0.3, 0.45, 0.55, 0.6], CM = [1.4, 1.8, 2.2, 2.6, 3], B3 = [0, 0.25, 0.61]
/** Worst ratio build / live ceiling over every hero profile and both gauge states. */
const worst = (b: Stats, gearHits = 0) => {
  let w = 0
  for (const skillCrit of SC) for (const critMul of CM) for (const b3Other of B3) for (const shadow of [false, true]) {
    const h: UltHero = { skillCrit, critMul, b3Other }
    w = Math.max(w, thiefUltBudget({ ...b, ultHits: b.ultHits + gearHits }, h, shadow) / ceiling(h, shadow, gearHits))
  }
  return w
}

test('thief_u line: second Ult branch, node values L1..L5, INT Energy, texts clean', () => {
  const ult = branchesOf('thief').filter((b) => b.line === 'ult').map((b) => b.id)
  assert.ok(ult.includes('thief_b') && ult.includes('thief_u'), ult.join())
  assert.equal(node('thief_u1').parent, 'thief_ultp')
  for (const id of ['thief_u1', 'thief_u2', 'thief_u3', 'thief_u4']) for (let lv = 1; lv <= node(id).max; lv++) assert.ok(!/undefined|NaN/.test(node(id).desc(lv)), node(id).desc(lv))
  assert.deepEqual(lvs('thief_u1').map((m) => Math.round((m.thUltCrit ?? 0) * 1000)), [10, 20, 30, 40, 50])
  assert.deepEqual(lvs('thief_u3').map((m) => m.thUltCritRes), [1, 2, 4, 5, 6], 'INT_FIELDS: whole Energy')
  near(lvs('thief_u3')[4].thExecUlt ?? 0, 0.15)
  near(thiefOnHitEff(build([['thief_u2', 5]])), 0.5); near(thiefOnHitEff(build([['thief_u2', 1]])), 0.404)
  assert.ok(!/\d+\.\d+/.test(node('thief_u3').desc(1)), 'whole numbers on an INT_FIELDS node')
  const rows = ultInfo('thief', build(U_FULL))
  for (const k of ['สกิลคริ', 'ดาเมจคริเงื่อนไข', 'On-Hit', 'ทีปิด']) assert.ok(rows.some((r) => r.label.includes(k)), k)
  assert.ok(rows.every((r) => !/undefined|NaN/.test(r.label + r.value)))
})

test('Ult budget (Q2): thief_u full stays under the live ceiling in both gauge states, every hero profile', () => {
  assert.ok(worst(build(U_FULL)) <= 1, `u full ${worst(build(U_FULL))}`)
  assert.ok(worst(build(U_FULL), 1) <= 1, 'with card เงาพันหน้า (ultHits +1) on both sides')
})

const tal = (id: string) => { const t = TALENTS.find((x) => x.id === id); assert.ok(t, id); return t }

test('talents rows 1 / 3 (P2\'c) + th_t4c renamed: texts clean, values > 0 except th_t3a\'s dodge trade-off', () => {
  for (const id of ['th_t1a', 'th_t1b', 'th_t3a', 'th_t3b', 'th_t3c', 'th_t4c']) {
    const t = tal(id)
    for (const r of [1, 2]) {
      assert.ok(!/undefined|NaN/.test(t.desc(r)), t.desc(r))
      for (const [k, v] of Object.entries(t.mod(r))) {
        assert.ok(k in PLAYER, `${id} ${k}`)
        if (!(id === 'th_t3a' && k === 'ultDodge')) assert.ok((v as number) > 0, `${id} r${r} ${k}=${v}`)
      }
    }
  }
  assert.equal(tal('th_t3a').mod(2).ultDodge, -1)
  assert.ok(KIT.thiefUltDodge + (tal('th_t3a').mod(2).ultDodge ?? 0) >= 1, 'never below 1 sure dodge')
  assert.notEqual(tal('th_t4c').name, 'ร่างเงา', 'name no longer clashes with the 👤 gauge state')
  for (const t of TALENTS.filter((x) => x.job === 'thief')) assert.notEqual(t.name, 'ร่างเงา', t.id)
  assert.equal(tal('th_t3b').mod(2).ultHits, 2, 're-cut: +1 | +2 stabs (live was +2 | +3)')
  assert.deepEqual(tal('th_t1b').mod(1), { waveDodge: 1, thWaveOpenCrit: 1 })
  near(tal('th_t1b').mod(2).thWaveOpenCritDmg ?? 0, KIT.thiefOpenCritDmg)
})

/** Reference heroes per level (crit rework: skillCrit only from gear / cards / mastery / th_t2b). */
const LV: Record<number, UltHero> = { 20: { skillCrit: 0, critMul: 1.4 }, 40: { skillCrit: 0.1, critMul: 1.8 }, 80: { skillCrit: 0.25, critMul: 2.2 } }
const ROGUE80: UltHero = { skillCrit: 0.3, critMul: 2.2 } // + ชำนาญมีด skillCrit 0.05 · พายุมีด = the same dance x h2 (cancels), knives outside the budget
const BUILDS: Record<string, Stats> = {
  'th_t3b R2': build([], [['th_t3b', 2]]),
  'th_t3a R2 + u full': build(U_FULL, [['th_t3a', 2]]),
  'th_t3b R2 + u full (max)': build(U_FULL, [['th_t3b', 2]]),
  'th_t3c R2 + u full': build(U_FULL, [['th_t3c', 2]]),
}

test('Ult budget table (Q2): every build <= live ceiling at Lv 20 / 40 / 80 and for Rogue, gauge off AND on', () => {
  for (const [name, b] of Object.entries(BUILDS)) {
    for (const h of [...Object.values(LV), ROGUE80]) for (const shadow of [false, true]) {
      const r = thiefUltBudget(b, h, shadow) / ceiling(h, shadow)
      assert.ok(r <= 1, `${name} ${JSON.stringify(h)} shadow=${shadow}: ${r.toFixed(3)}`)
    }
    assert.ok(worst(b) <= 1, `${name}: worst over every profile ${worst(b).toFixed(3)}`)
    assert.ok(worst(b, 1) <= 1, `${name} + card ultHits`)
  }
  assert.ok(worst(BUILDS['th_t3b R2 + u full (max)']) >= 0.9, 'max stack still close to live (not cut to death)')
})
// ---------- save migration thiefRogueRework v5 (localStorage mock for load()) ----------
const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}
const { migrateThiefRogueRework, newSave, THIEF_REWORK_VER } = await import('../src/save')
type SaveData = ReturnType<typeof newSave>

test('migration v5: a v3 Thief / Rogue gets class 1 web + talents back once · Rogue job2 web + talents untouched', () => {
  assert.ok(THIEF_REWORK_VER >= 5) // P2'd bumped it to 6 (tests/thief-p2d.test.ts)
  const s = newSave('rg', 'human')
  Object.assign(s, { job: 'thief', job2: 'rogue', thiefRogueRework: 3, skillPoints: 2, jobTree: { thief_core1: 5, thief_b1: 3, thief_b4: 1 }, jobTalents: { 3: { id: 'th_t3b', rank: 2 } },
    job2Points: 1, job2Tree: { rogue_s3p: 5, rg_k1: 2 }, job2Talents: { 1: { id: 'rg_t1_combo', rank: 2 } } } as Partial<SaveData>)
  migrateThiefRogueRework(s)
  assert.equal(s.thiefRogueRework, THIEF_REWORK_VER)
  assert.deepEqual(s.jobTree, {}); assert.deepEqual(s.jobTalents, {})
  assert.equal(s.skillPoints, 2 + 9)
  assert.deepEqual(s.job2Tree, { rogue_s3p: 5, rg_k1: 2 }, 'Rogue web: P3\'a already reset it at v3')
  assert.equal(s.job2Points, 1)
  assert.deepEqual(s.job2Talents, { 1: { id: 'rg_t1_combo', rank: 2 } })
  s.jobTree = { thief_b1: 1 }
  migrateThiefRogueRework(s)
  assert.deepEqual(s.jobTree, { thief_b1: 1 }, 'idempotent')
  const v4 = newSave('x', 'human'); Object.assign(v4, { job: 'thief', thiefRogueRework: 4, jobTree: { thief_b2: 2 } })
  migrateThiefRogueRework(v4)
  assert.deepEqual(v4.jobTree, {}, 'a v4 save (Rogue P3\'b) still gets the P2\'c reset')
  const fresh = newSave('n', 'human')
  assert.equal(fresh.thiefRogueRework, THIEF_REWORK_VER)
  const bad = newSave('b', 'human'); Object.assign(bad, { job: 'thief', thiefRogueRework: 3, jobTree: { thief_b1: 'x', thief_b2: -1, thief_b3: 2 } as unknown as SaveData['jobTree'], skillPoints: Number.NaN })
  assert.doesNotThrow(() => migrateThiefRogueRework(bad))
  assert.equal(bad.skillPoints, 2, 'corrupt entries dropped, refund finite')
})
