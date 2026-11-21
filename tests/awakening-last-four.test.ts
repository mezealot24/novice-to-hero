// The last four Awakenings (docs/design/awakening-last-four-v1.md): 🥷 Stalker · 🎩 Kingpin · 🌌 High Wizard · 🤖 Mechanic.
import test from 'node:test'
import assert from 'node:assert/strict'
import { changeJob3, job3Ready, newSave, setJob3Variant, setSave, type SaveData } from '../src/save'
import { activeJob3, JOB3, JOB3_IDS, job3Of, type Job3Id } from '../src/data/jobs3'
import { JOB2, JOB2_LIST, type Job2Id } from '../src/data/jobs2'
import { heroStats } from '../src/data/meta'
import { heroPower, JOB3_K } from '../src/data/power'
import { KIT2, KIT3, kingpinDebtAmp, kingpinTakeMul, stalkerMarkCap, wizCastTaken } from '../src/data/skill-math'
import { branches3Of, hybridBranchesOf, lockReason3, nodeById, nodesOf, tree3Mods } from '../src/data/tree'
import { JOB3_BONUS_STATS } from '../src/data/meta/stat-spec'
import { UNIQUE3_DROPS } from '../src/data/uniques3'
import { PLAYER } from '../src/data/stats'
const baseStats = () => ({ ...PLAYER })

const NEW: { id: Job3Id; job2: Job2Id; prefix: string }[] = [
  { id: 'stalker', job2: 'rogue', prefix: 'sk' }, { id: 'kingpin', job2: 'mobster', prefix: 'kp' },
  { id: 'highwizard', job2: 'wizard', prefix: 'hw' }, { id: 'mechanic', job2: 'innovator', prefix: 'mc' },
]

/** A 2nd-job hero at Job2 Lv 50 with ดัน 10 cleared; `tree2` = its ใยชั้น 2. */
function hero(job2: Job2Id, tree2: Record<string, number> = {}, extra: Partial<SaveData> = {}): SaveData {
  const s = newSave('t', 'human')
  Object.assign(s, { job: JOB2[job2].parent, jobLevel: 40, job2, job2Level: 50, job2Points: 0, gems: 100, clearsBy: { d1: 1, d5: 1, d10: 1 }, clears: 10, job2Tree: tree2, ...extra })
  setSave(s)
  return s
}
const awake = (id: Job3Id, tree3: Record<string, number> = {}, extra: Partial<SaveData> = {}): Partial<SaveData> => ({ job3: id, job3Level: 30, job3Trial: { [id]: 1 }, job3Tree: tree3, job3Path: 'pure', job3Var: 'a', ...extra })
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9

test('every 2nd job now has exactly one Awakening, and the four new ones hang off the right parents', () => {
  for (const j of JOB2_LIST) assert.ok(job3Of(j.id), `${j.id} has a 3rd job`)
  assert.equal(JOB3_IDS.length, JOB2_LIST.length)
  assert.equal(new Set(JOB3_IDS.map((id) => JOB3[id].parent)).size, JOB3_IDS.length, 'one Awakening per 2nd job')
  for (const n of NEW) {
    assert.equal(JOB3[n.id].parent, n.job2)
    assert.equal(JOB2[JOB3[n.id].sibling].parent, JOB2[n.job2].parent, 'the hybrid sibling is the other 2nd job of the same base class')
    assert.notEqual(JOB3[n.id].sibling, n.job2)
  }
})

test('each new ใยชั้น 3: Ult root + 3 branches x 4 nodes, own id prefix, a legacy branch with ★ สืบสาน', () => {
  for (const n of NEW) {
    const br = branches3Of(n.id)
    assert.equal(br.length, n.id === 'stalker' ? 5 : 4, `${n.id}: root + 3 branches (Stalker +🧤 sk_d ปลดเปลือย)`)
    assert.ok(nodeById(`${n.id}_u3p`), 'Ult วิวัฒน์ 2 root')
    for (const b of br.filter((x) => !x.id.endsWith('_u3'))) {
      assert.ok(b.id.startsWith(`${n.prefix}_`), b.id)
      const nodes = nodesOf(b.id)
      assert.deepEqual(nodes.map((x) => x.tier).sort(), [1, 2, 3, 4], `${b.id} tiers`)
      assert.ok(nodes.every((x) => x.id.startsWith(`${n.prefix}_`)), 'ids are save data')
      assert.equal(nodes.reduce((a, x) => a + x.max, 0), 10 - (nodes.some((x) => x.tier === 3 && x.max === 2) ? 1 : 0), `${b.id} point budget`)
      for (const x of nodes) for (let lv = 1; lv <= x.max; lv++) { assert.ok(x.desc(lv).length > 0); assert.ok(Object.keys(x.mod(lv)).every((k) => k in baseStats()), `${x.id} mod keys are Stats`) }
    }
    assert.equal(nodeById(`${n.prefix}_l4`)!.mod(1).j3Heir, 1)
    assert.ok(hybridBranchesOf(n.id).length > 0, 'hybrid borrows the sibling web')
  }
})

test('unlock: same rule as the other Awakenings (Job2 Lv 50 + ดัน 10 + Master Trial); old saves without job3 fields just work', () => {
  for (const n of NEW) {
    const s = hero(n.job2)
    assert.equal(job3Ready(s, n.id), false, 'no trial yet')
    s.hardClearsBy = { d10: 1 }
    assert.equal(job3Ready(s, n.id), true)
    assert.equal(changeJob3(n.id), true)
    assert.equal(activeJob3(s), n.id)
    assert.deepEqual([s.job3Level, s.job3Path, s.job3Var], [1, 'pure', 'a'])
    assert.equal(setJob3Variant('b'), true)
    assert.ok(Number.isFinite(heroPower(s)))
    assert.ok(JOB3_K[n.id]! > 1 && JOB3_BONUS_STATS[n.id as keyof typeof JOB3_BONUS_STATS].length === 3 && UNIQUE3_DROPS[n.id].length > 0)
  }
})

test('only the active Awakening sets its flag; a full ใยชั้น 3 raises Hero Power', () => {
  const flag = { stalker: 'j3Sk', kingpin: 'j3Kp', highwizard: 'j3Hw', mechanic: 'j3Mc' } as const
  for (const n of NEW) {
    const plain = hero(n.job2), st0 = heroStats(plain)
    const st = heroStats(hero(n.job2, {}, awake(n.id)))
    for (const [id, key] of Object.entries(flag)) { assert.equal(st[key], id === n.id ? 1 : 0, `${n.id}: ${key}`); assert.equal(st0[key], 0) }
    assert.equal(st.j3On + st.j3Lk + st.j3Ch + st.j3Rn + st.j3Wl + st.j3Pf, 0, 'no other 3rd job flag')
    const full: Record<string, number> = { [`${n.id}_u3p`]: 5 }
    for (const b of branches3Of(n.id)) for (const x of nodesOf(b.id)) full[x.id] = x.max
    assert.ok(heroPower(hero(n.job2, {}, awake(n.id, full))) > heroPower(hero(n.job2)), `${n.id} power`)
    // a parked 3rd job (2nd job re-picked) gives nothing
    const sib = JOB3[n.id].sibling
    assert.equal(heroStats(hero(sib, {}, awake(n.id)))[flag[n.id as keyof typeof flag]], 0, 'parked = off')
  }
})

test('legacy nodes read the 2nd-job web with caps and land on a stat that fits the class', () => {
  const diff = (job2: Job2Id, id: Job3Id, t2: Record<string, number>, t3: Record<string, number>, key: 'ult2Pow' | 'flee' | 'j2ExecAdd' | 'mdef' | 'j2TrapMul' | 'maxHp') =>
    heroStats(hero(job2, t2, awake(id, t3)))[key] - heroStats(hero(job2, t2, awake(id)))[key]
  // 🥷 Stalker: rg_k -> Ult · rg_c -> FLEE (never Auto Guard) · rg_x -> HP
  assert.ok(near(diff('rogue', 'stalker', { rg_k1: 3, rg_k2: 2 }, { sk_l1: 3 }, 'ult2Pow'), 0.075))
  assert.ok(near(diff('rogue', 'stalker', { rg_c1: 3, rg_c2: 2 }, { sk_l2: 3 }, 'flee'), 6))
  assert.ok(diff('rogue', 'stalker', { rg_c1: 3, rg_c2: 3, rg_c3: 3, rg_c4: 1 }, { sk_l2: 3 }, 'flee') <= KIT3.stalker.leg.guardCap + 1e-9)
  assert.equal(heroStats(hero('rogue', { rg_c1: 3 }, awake('stalker', { sk_l2: 3 }))).j2Guard, 0, 'no Auto Guard on a thief')
  assert.ok(diff('rogue', 'stalker', { rg_x1: 3 }, { sk_l3: 3 }, 'maxHp') > 0)
  // 🎩 Kingpin: mb_e -> Execute line
  assert.ok(near(diff('mobster', 'kingpin', { mb_e1: 3, mb_e2: 3, mb_e3: 3, mb_e4: 1 }, { kp_l2: 3 }, 'j2ExecAdd'), KIT3.kingpin.leg.guardCap))
  assert.ok(near(diff('mobster', 'kingpin', {}, { kp_l2: 3 }, 'j2ExecAdd'), 0), 'no points in the branch = nothing')
  // 🌌 High Wizard: whichever element branch has the most points
  for (const t2 of [{ wz_m1: 3, wz_m2: 1 }, { wz_l1: 3, wz_l2: 1 }, { wz_i1: 3, wz_i2: 1, wz_m1: 2 }]) {
    assert.ok(near(diff('wizard', 'highwizard', t2, { hw_l1: 3 }, 'ult2Pow'), 0.06), JSON.stringify(t2))
    assert.ok(near(diff('wizard', 'highwizard', t2, { hw_l2: 3 }, 'mdef'), 0.024))
  }
  // 🤖 Mechanic: in_t -> trap power
  assert.ok(near(diff('innovator', 'mechanic', { in_t1: 3, in_t2: 2 }, { mc_l2: 3 }, 'j2TrapMul'), 0.15))
})

test('Skill 3 variant bonus follows the variant branch (2% per point, capped 20%)', () => {
  const vm = (job2: Job2Id, id: Job3Id, t2: Record<string, number>, v: 'a' | 'b') => heroStats(hero(job2, t2, awake(id, {}, { job3Var: v }))).j3VarMul
  assert.ok(near(vm('rogue', 'stalker', { rg_k1: 3, rg_k2: 2 }, 'a'), 0.1)); assert.equal(vm('rogue', 'stalker', { rg_k1: 3 }, 'b'), 0)
  assert.ok(near(vm('rogue', 'stalker', { rg_x1: 3, rg_x2: 3, rg_x3: 3, rg_x4: 1 }, 'b'), 0.2))
  assert.ok(near(vm('mobster', 'kingpin', { mb_d1: 2 }, 'a'), 0.04)); assert.ok(near(vm('mobster', 'kingpin', { mb_p1: 3 }, 'b'), 0.06))
  assert.ok(near(vm('wizard', 'highwizard', { wz_i1: 3 }, 'a'), 0.06)); assert.ok(near(vm('wizard', 'highwizard', { wz_l1: 3 }, 'b'), 0.06))
  assert.ok(near(vm('innovator', 'mechanic', { in_g1: 3 }, 'a'), 0.06)); assert.ok(near(vm('innovator', 'mechanic', { in_r1: 3 }, 'b'), 0.06))
})

test('signatures: 🥷 Mark cap · 🎩 debt interest · 🌌 charge penalty · 🤖 devices', () => {
  const z = baseStats()
  assert.equal(stalkerMarkCap(z), KIT2.rogue.markMax)
  assert.equal(stalkerMarkCap({ ...z, j3Sk: 1 }), KIT2.rogue.markMax + KIT3.stalker.markMaxAdd)
  assert.equal(kingpinDebtAmp(z, 4), 0, 'Mobster without the Awakening: no interest')
  const kp = { ...z, j3Kp: 1 }
  assert.ok(near(kingpinDebtAmp(kp, 2), 0.05)); assert.ok(near(kingpinDebtAmp(kp, 12), KIT3.kingpin.debtCap * KIT3.kingpin.debtAmp), 'ดอกเบี้ยทบต้น x2 still stops at the cap')
  assert.ok(near(kingpinDebtAmp({ ...kp, j3KpDebtAmp: 0.015 }, 6), 0.24)); assert.equal(kingpinDebtAmp(kp, -1), 0)
  assert.ok(near(kingpinTakeMul(0), KIT3.kingpin.takeMul)); assert.ok(kingpinTakeMul(3) > kingpinTakeMul(1)); assert.equal(kingpinTakeMul(99), kingpinTakeMul(KIT3.kingpin.debtCap))
  assert.equal(wizCastTaken(z), KIT2.wizard.castTaken); assert.ok(near(wizCastTaken({ ...z, j3Hw: 1 }), KIT2.wizard.castTaken * KIT3.highwizard.castTakenMul))
  const inn = heroStats(hero('innovator')), mc = heroStats(hero('innovator', {}, awake('mechanic')))
  assert.equal(mc.j2Traps - inn.j2Traps, KIT3.mechanic.trapsAdd)
  assert.ok(near(mc.j2TrapMul - inn.j2TrapMul, KIT3.mechanic.deviceMul)); assert.ok(near(mc.j2TurretMul - inn.j2TurretMul, KIT3.mechanic.deviceMul))
})

test('pure vs hybrid: the sibling web opens on hybrid only, tier 1-2', () => {
  const mb = nodeById('mb_p1')!, mb3 = nodeById('mb_p3')!
  assert.equal(lockReason3({}, 'thief', mb, 'stalker', 'pure'), 'เฉพาะสาย Hybrid')
  assert.equal(lockReason3({}, 'thief', mb, 'stalker', 'hybrid'), '')
  assert.match(lockReason3({ mb_p1: 3, mb_p2: 3 }, 'thief', mb3, 'stalker', 'hybrid'), /Hybrid/)
  assert.equal(lockReason3({}, 'thief', nodeById('wz_m1')!, 'stalker', 'hybrid'), 'ไม่ใช่ใยของอาชีพนี้')
  assert.deepEqual(tree3Mods({ mb_p1: 2, sk_p3: 2 }, 'stalker', 'hybrid').map((m) => Object.keys(m)[0]), ['poisonDmg'], 'own tier 3 off on hybrid, borrowed tier 1 on')
  assert.equal(tree3Mods({ mb_p1: 2 }, 'stalker', 'pure').length, 0)
})

test('balance guard: the new kits stay inside the band of the existing Awakenings', () => {
  for (const n of NEW) {
    const P = KIT3[n.id]
    assert.equal(P.varA.per, 0.02); assert.equal(P.varA.cap, 0.2); assert.equal(P.varB.per, 0.02); assert.equal(P.varB.cap, 0.2)
    assert.equal(P.leg.crossCap, 0.15); assert.equal(P.leg.hpCap, 0.09); assert.equal(P.heirNeed, 6)
    assert.equal(JOB3_K[n.id], JOB3_K.lordknight)
  }
  assert.ok(KIT3.kingpin.debtCap * (KIT3.kingpin.debtAmp + 0.015) <= 0.25, 'Loan Shark at full nodes <= +25% (Warlord Aspect of Carnage is +15% always-on plus crit)')
  assert.ok(KIT3.highwizard.amp + 0.12 <= 0.25, 'Amplify at full nodes <= +25%, and only while it is up')
  assert.ok(KIT3.stalker.varB.mul <= KIT2.rogue.stabMul * 1.25 && KIT3.stalker.varA.mul <= KIT2.rogue.stabMul * 0.5)
})
