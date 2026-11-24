import test from 'node:test'
import assert from 'node:assert/strict'
import { branches2Of, branchesOf, lockReason, nodesOf, TREE, TREE2, TREE_RULES, type TreeNode, type TreeSave } from '../src/data/tree'
import { PLAYER, type Stats } from '../src/data/game-data'
import { SPELL_VAMP, SWORD_MANA } from '../src/data/jobs'
import { KIT, S2N, swordCullThreshold, swordHelixNeed, swordMultiHitDr } from '../src/data/skill-math'
import { heroStats } from '../src/data/meta'

const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage ??= {
  getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v }, removeItem: (k: string) => { delete mem[k] },
}
const { newSave, migrateSwordsmanRework, SWORDSMAN_REWORK_VER } = await import('../src/save')

// v84 point pools (plan): Swordsman 48 class points, Cleric 48, Knight 49 job2 points
const SWORD_POOL = 48, CLERIC_POOL = 48, KNIGHT_POOL = 49

const swordNodes = branchesOf('swordsman').flatMap((b) => nodesOf(b.id))
const clericNodes = branchesOf('cleric').flatMap((b) => nodesOf(b.id))
const knightNodes = branches2Of('knight').flatMap((b) => nodesOf(b.id))
const isStar = (n: TreeNode) => n.tier === 4 && !n.kind

/** Sum of max over the web, minus what can't be spent: ★ over the cap, and the 2 unpicked Skill 2 sets. */
function spendable(nodes: TreeNode[]) {
  const s2Roots = nodes.filter((n) => n.kind === 's2root').length
  const s2Set = (n: TreeNode) => n.kind === 's2root' || n.kind === 's2plus' || n.kind === 's2star'
  const s2PerSet = s2Roots ? nodes.filter(s2Set).reduce((a, n) => a + n.max, 0) / s2Roots : 0
  const blocked = Math.max(0, nodes.filter(isStar).length - TREE_RULES.capstones)
  return nodes.filter((n) => !s2Set(n)).reduce((a, n) => a + n.max, 0) + s2PerSet - blocked
}

test('spendable points stay above the pool (forced ★ choice)', () => {
  assert.equal(spendable(swordNodes), 94) // +15 from swordsman_core defend passives (3 nodes x Lv 5)
  assert.equal(spendable(clericNodes), 90) // v86: + 💠 แก่นศรัทธา core column (5 + 3 + 5) · v102: ☀️ แสงแตก 5 -> 3
  assert.equal(spendable(knightNodes), 79)
  assert.ok(spendable(swordNodes) >= SWORD_POOL)
  assert.ok(spendable(clericNodes) >= CLERIC_POOL)
  assert.ok(spendable(knightNodes) >= KNIGHT_POOL)
})

test('no duplicate ids, no duplicate names inside each web', () => {
  const ids = [...TREE, ...TREE2].map((n) => n.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const nodes of [swordNodes, clericNodes, knightNodes]) {
    const names = nodes.map((n) => n.name)
    assert.deepEqual(names.filter((x, i) => names.indexOf(x) !== i), [])
  }
})

test('4 ★ per class web (Knight 5 branches = 5 ★), a 3rd ★ is refused', () => {
  assert.equal(swordNodes.filter(isStar).length, 4)
  assert.equal(clericNodes.filter(isStar).length, 4)
  assert.equal(knightNodes.filter(isStar).length, 5)
  const fill = (branches: string[], skip: string) => {
    const t: TreeSave = {}
    for (const b of branches) for (const n of nodesOf(b)) t[n.id] = n.max
    delete t[skip]
    return t
  }
  // Swordsman: ★ in swordsman_a + swordsman_b, then try swordsman_c4 / swordsman_d4
  const s = fill(['swordsman_a', 'swordsman_b', 'swordsman_c', 'swordsman_d'], 'swordsman_c4')
  delete s.swordsman_d4
  const c4 = swordNodes.find((n) => n.id === 'swordsman_c4')!
  assert.match(lockReason(s, 'swordsman', c4), /★/)
  delete s.swordsman_b4
  assert.equal(lockReason(s, 'swordsman', c4), '')
  // Cleric
  const c = fill(['cleric_a', 'cleric_b', 'cleric_c', 'cleric_d'], 'cleric_dn4')
  delete c.cleric_c4
  const d4 = clericNodes.find((n) => n.id === 'cleric_dn4')!
  assert.match(lockReason(c, 'cleric', d4), /★/)
  delete c.cleric_a4x
  assert.equal(lockReason(c, 'cleric', d4), '')
  // Knight: ★ in kn_p + kn_g, then try kn_r4
  const k = fill(['kn_p', 'kn_g', 'kn_c', 'kn_o', 'kn_r'], 'kn_r4')
  delete k.kn_c4; delete k.kn_o4
  const r4 = knightNodes.find((n) => n.id === 'kn_r4')!
  assert.match(lockReason(k, 'swordsman', r4, 'knight'), /★/)
  delete k.kn_g4
  assert.equal(lockReason(k, 'swordsman', r4, 'knight'), '')
})

test('new branches hang under the right line', () => {
  const line = (job: 'swordsman' | 'cleric', id: string) => branchesOf(job).find((b) => b.id === id)?.line
  assert.equal(line('swordsman', 'swordsman_c'), 's1')
  assert.equal(line('swordsman', 'swordsman_d'), 'ult')
  assert.equal(line('cleric', 'cleric_c'), 's1')
  assert.equal(line('cleric', 'cleric_d'), 'ult')
  assert.equal(swordNodes.find((n) => n.id === 'swordsman_c1')?.parent, 'swordsman_s1p')
  assert.equal(swordNodes.find((n) => n.id === 'swordsman_d1')?.parent, 'swordsman_ultp')
  assert.equal(clericNodes.find((n) => n.id === 'cleric_c1')?.parent, 'cleric_s1p')
  assert.equal(clericNodes.find((n) => n.id === 'cleric_dn1')?.parent, 'cleric_ultp')
  assert.equal(knightNodes.find((n) => n.id === 'kn_o1')?.parent, undefined)
  assert.equal(knightNodes.find((n) => n.id === 'kn_r2')?.parent, 'kn_r1')
  // shipped nodes keep their ids
  for (const id of ['swordsman_a1', 'swordsman_b4', 'cleric_a1', 'cleric_a4x', 'cleric_b4j', 'kn_p1', 'kn_g1', 'kn_c4']) assert.ok(swordNodes.concat(clericNodes, knightNodes).some((n) => n.id === id), id)
})

test('each new node sets its field (default 0, grows with level, readable text)', () => {
  const want: Record<string, (keyof Stats)[]> = {
    swordsman_c1: ['swVsMute'], swordsman_c2: ['swS1Refund'], swordsman_c3: ['swS1Splash'], swordsman_c4: ['swS1Star'], // Q 2026-11-21: ทักษะ 1 right line = ⚔️ สยบมนตร์
    swordsman_b1: ['swS1Shield', 'swHelixMul'], swordsman_b2: ['swCcGuard', 'swMultiDr'], swordsman_b3: ['swMuteWeak', 'swHelixAmp', 'swHelixDef'], swordsman_b4: ['swS1Ctr', 'swS1CtrDmg', 'swHelixFast'], // ... left line = 🌀 พายุตั้งรับ
    swordsman_d1: ['swExecAdd'], swordsman_d2: ['swWaveRe', 'swWaveAmp'], swordsman_d3: ['swAwCleave'], swordsman_d4: ['swAwAtk', 'swAwStrPct', 'swAwTrue'], // Q 2026-11-21: Ult right line = ⚖️ คมพิพากษา
    swordsman_a1: ['swAwDr', 'swVengRate'], swordsman_a2: ['swAwLeech'], swordsman_a3: ['swAwCtr', 'swCullAdd'], swordsman_a4: ['swWaveShield', 'swCull'], // ... left line = 🔥 ดาบผลาญพิพากษา
    cleric_c1: ['clFaith'], cleric_c2: ['clFaithOver'], cleric_c3: ['clFaithHeal'], cleric_c4: ['clOverBurst'],
    cleric_dn1: ['clDawn'], cleric_dn2: ['clDawnHeal'], cleric_dn3: ['clDawnWis', 'clDawnWisTurns'], cleric_dn4: ['clDawnUlt', 'clDawnCrit'], // v92 🌄 รุ่งอรุณ
    kn_o1: ['j2Banner'], kn_o2: ['j2Provoke'], kn_o3: ['j2BannerKill'], kn_o4: ['j2BannerAura', 'j2Guard'],
    kn_r1: ['j2Sweep'], kn_r2: ['j2SweepPush'], kn_r3: ['j2SweepGauge'], kn_r4: ['j2SweepStar'],
  }
  const all = [...swordNodes, ...clericNodes, ...knightNodes]
  for (const [id, keys] of Object.entries(want)) {
    const n = all.find((x) => x.id === id)
    assert.ok(n, id)
    for (const k of keys) if (k !== 'j2Guard') assert.equal(PLAYER[k], 0, `${k} defaults to 0`)
    for (let lv = 1; lv <= n.max; lv++) {
      const m = n.mod(lv), d = n.desc(lv)
      for (const k of keys) assert.ok((m[k] ?? 0) > 0, `${id} lv${lv} ${k}`)
      assert.ok(d.length > 0 && !/undefined|NaN/.test(d), `${id} lv${lv} text: ${d}`)
    }
    if (n.max > 1) for (const k of keys) assert.ok((n.mod(n.max)[k] ?? 0) > (n.mod(1)[k] ?? 0), `${id} ${k} grows`)
  }
})

test('stretched levels: 3 -> 5, ★ stays 1', () => {
  for (const id of ['swordsman_c1', 'swordsman_d3', 'cleric_c2', 'kn_o2', 'kn_r1']) {
    const n = [...swordNodes, ...clericNodes, ...knightNodes].find((x) => x.id === id)!
    assert.equal(n.max, 5, id)
  }
  for (const id of ['swordsman_c4', 'swordsman_d4', 'cleric_c4', 'cleric_dn4', 'kn_o4', 'kn_r4']) {
    const n = [...swordNodes, ...clericNodes, ...knightNodes].find((x) => x.id === id)!
    assert.equal(n.max, 1, id)
  }
})

test('swordsman_core defend passives unlock at tier 0 and scale VIT/DEF/HP%/MDEF/Tenacity/Regen', () => {
  const coreNodes = swordNodes.filter((n) => n.branch === 'swordsman_core')
  assert.deepEqual(coreNodes.map((n) => n.id), ['swordsman_core1', 'swordsman_core2', 'swordsman_core3'])
  assert.equal(lockReason({}, 'swordsman', coreNodes[0]), '')
  const baseSave = newSave('sw', 'human')
  baseSave.job = 'swordsman'
  baseSave.stats.vit = 30
  const baseSt = heroStats(baseSave)
  const coreSave = newSave('sw', 'human')
  coreSave.job = 'swordsman'
  coreSave.stats.vit = 30
  coreSave.jobTree = { swordsman_core1: 5, swordsman_core2: 5, swordsman_core3: 5 }
  const coreSt = heroStats(coreSave)
  assert.ok(coreSt.maxHp > baseSt.maxHp + 80, 'Core 1 (+VIT & Max HP%) significantly boosts HP')
  assert.ok(coreSt.def - baseSt.def >= 3 * 3, 'Core 1 adds P.DEF')
  assert.ok(coreSt.mdef > baseSt.mdef + 0.14, 'Core 2 adds M.DEF + VIT->M.DEF conversion')
  assert.ok(coreSt.tenacity - baseSt.tenacity >= 0.089, 'Core 2 adds Tenacity')
  assert.ok(coreSt.regen - baseSt.regen >= 0.59, 'Core 3 adds HP Regen')
  assert.ok(coreSt.healAmp - baseSt.healAmp >= 0.149, 'Core 3 adds Heal Amp')
  assert.ok(coreSt.swLowRegenAmp >= KIT.swordCore.lowHpRegenPer * 3 - 1e-9, 'Core 3 adds low-HP regen amp')
})

test('Swordsman Skill 2 rework + Wave 1 updates: Guard DEF/auto-block, Bloodlust vamp/taken, Taunt shield/ctrAmp, b4 ctrDmg', () => {
  assert.equal('ultShield' in SWORD_MANA, false) // Q 2026-11-24 cleanup: the Job1 Ult shield had no effect since 2026-11-22
  assert.equal(SPELL_VAMP.bloodCut, 0)
  assert.equal(S2N.guardShield(false), 0.1)
  assert.equal(S2N.guardShield(true), 0.18)
  assert.equal(S2N.guardDef(0), 2.5)
  assert.equal(S2N.bloodVamp(0), 0.2)
  assert.equal(S2N.bloodAtk, 0.2)
  assert.equal(S2N.bloodTaken, 0.1)
  assert.equal(S2N.tauntBreakTurns(false), 1)
  assert.equal(S2N.tauntBreakTurns(true), 2)
  assert.equal(S2N.tauntStarRes, 15)
  assert.equal(S2N.tauntStarShield, 0.1)
  assert.equal(S2N.tauntCtrAmp, 0.2)
  const b4 = swordNodes.find((n) => n.id === 'swordsman_b4')!
  assert.deepEqual(b4.mod(1), { swS1Ctr: 3, swS1CtrDmg: 0.25, swHelixFast: 1 })
})

test('migrateSwordsmanRework: 1-time reset & refund for Swordsman/Knight/Berserker, idempotent, non-Swordsman untouched, newSave initialized', () => {
  const fresh = newSave('fresh', 'human')
  assert.equal(fresh.swordsmanRework, SWORDSMAN_REWORK_VER)

  const sampleJewel = { id: 'j_1', cardId: 'card_poring', tier: 1 as const, stat: 'str' as const, val: 5 }

  // 1. Legacy Swordsman + Knight save
  const kn = newSave('legacy_kn', 'human')
  delete kn.swordsmanRework
  kn.job = 'swordsman'
  kn.job2 = 'knight'
  kn.skillPoints = 2
  kn.job2Points = 3
  kn.jobTree = { swordsman_s1p: 5, swordsman_c1: 3 }
  kn.job2Tree = { kn_p1: 4, kn_g2: 5 }
  kn.jobTalents = { '1': { id: 'sw_t1a', rank: 2 } }
  kn.job2Talents = { '1': { id: 'kn_t1_hp', rank: 2 } }
  kn.passiveNodes = ['sw_root', 'sw_1']
  kn.jewels = [sampleJewel]
  kn.jewelSock = { sw_sock_1: 'j_1' }

  migrateSwordsmanRework(kn)
  assert.equal(kn.swordsmanRework, SWORDSMAN_REWORK_VER)
  assert.equal(kn.skillPoints, 2 + 5 + 3)
  assert.equal(kn.job2Points, 3 + 4 + 5)
  assert.deepEqual(kn.jobTree, {})
  assert.deepEqual(kn.job2Tree, {})
  assert.deepEqual(kn.jobTalents, {})
  assert.deepEqual(kn.job2Talents, {})
  assert.deepEqual(kn.passiveNodes, [])
  assert.deepEqual(kn.jewelSock, {})
  assert.deepEqual(kn.jewels, [sampleJewel])

  // Idempotent on second run (even after re-spending points)
  kn.jobTree = { swordsman_s1p: 2 }
  kn.job2Tree = { kn_g2: 1 }
  kn.passiveNodes = ['sw_root']
  migrateSwordsmanRework(kn)
  assert.equal(kn.skillPoints, 10)
  assert.equal(kn.job2Points, 12)
  assert.deepEqual(kn.jobTree, { swordsman_s1p: 2 })
  assert.deepEqual(kn.job2Tree, { kn_g2: 1 })
  assert.deepEqual(kn.passiveNodes, ['sw_root'])

  // 2. Legacy Berserker save
  const bz = newSave('legacy_bz', 'human')
  delete bz.swordsmanRework
  bz.job = 'swordsman'
  bz.job2 = 'berserker'
  bz.skillPoints = 0
  bz.job2Points = 1
  bz.jobTree = { swordsman_ultp: 4 }
  bz.job2Tree = { bz_c1: 3, bz_r4: 1 }
  bz.jobTalents = { '2': { id: 'sw_t2a', rank: 1 } }
  bz.job2Talents = { '2': { id: 'bz_t2_ult', rank: 1 } }
  bz.passiveNodes = ['sw_root']
  bz.jewels = [sampleJewel]
  bz.jewelSock = { sw_sock_1: 'j_1' }

  migrateSwordsmanRework(bz)
  assert.equal(bz.swordsmanRework, SWORDSMAN_REWORK_VER)
  assert.equal(bz.skillPoints, 4)
  assert.equal(bz.job2Points, 1 + 3 + 1)
  assert.deepEqual(bz.jobTree, {})
  assert.deepEqual(bz.job2Tree, {})
  assert.deepEqual(bz.jobTalents, {})
  assert.deepEqual(bz.job2Talents, {})
  assert.deepEqual(bz.passiveNodes, [])
  assert.deepEqual(bz.jewelSock, {})
  assert.deepEqual(bz.jewels, [sampleJewel])

  // 3. Base Swordsman (no job2)
  const sw = newSave('legacy_sw', 'human')
  delete sw.swordsmanRework
  sw.job = 'swordsman'
  sw.skillPoints = 1
  sw.jobTree = { swordsman_core1: 3 }
  sw.jobTalents = { '1': { id: 'sw_t1b', rank: 1 } }
  migrateSwordsmanRework(sw)
  assert.equal(sw.swordsmanRework, SWORDSMAN_REWORK_VER)
  assert.equal(sw.skillPoints, 4)
  assert.deepEqual(sw.jobTree, {})
  assert.deepEqual(sw.jobTalents, {})

  // 4. Non-Swordsman save untouched
  const cl = newSave('legacy_cl', 'human')
  delete cl.swordsmanRework
  cl.job = 'cleric'
  cl.job2 = 'crusader'
  cl.skillPoints = 5
  cl.job2Points = 6
  cl.jobTree = { cleric_s1p: 5 }
  cl.job2Tree = { cr_u1: 3 }
  cl.jobTalents = { '1': { id: 'cleric_t1a', rank: 1 } }
  cl.job2Talents = { '1': { id: 'cr_t1_hp', rank: 2 } }
  cl.passiveNodes = ['cl_root']
  cl.jewels = [sampleJewel]
  cl.jewelSock = { cl_sock_1: 'j_1' }

  migrateSwordsmanRework(cl)
  assert.equal(cl.swordsmanRework, SWORDSMAN_REWORK_VER)
  assert.equal(cl.skillPoints, 5)
  assert.equal(cl.job2Points, 6)
  assert.deepEqual(cl.jobTree, { cleric_s1p: 5 })
  assert.deepEqual(cl.job2Tree, { cr_u1: 3 })
  assert.deepEqual(cl.jobTalents, { '1': { id: 'cleric_t1a', rank: 1 } })
  assert.deepEqual(cl.job2Talents, { '1': { id: 'cr_t1_hp', rank: 2 } })
  assert.deepEqual(cl.passiveNodes, ['cl_root'])
  assert.deepEqual(cl.jewelSock, { cl_sock_1: 'j_1' })
  assert.deepEqual(cl.jewels, [sampleJewel])
})

test('Swordsman left-branch math helpers: พายุสวนกลับ, เกราะไม่สะทก, ดาบผ่าชีพ', () => {
  assert.equal(swordHelixNeed(0), KIT.swordS1Tree.helixHits)
  assert.equal(swordHelixNeed(1), KIT.swordS1Tree.helixHitsStar)
  assert.ok(swordHelixNeed(1) < swordHelixNeed(0))
  assert.equal(swordMultiHitDr(0, 0.18), 0)
  assert.ok(Math.abs(swordMultiHitDr(1, 0.18) - 0.18) < 1e-9)
  assert.ok(Math.abs(swordMultiHitDr(2, 0.18) - 0.36) < 1e-9)
  assert.equal(swordMultiHitDr(10, 0.18), KIT.swordS1Tree.multiDrCap)
  assert.ok(Math.abs(swordCullThreshold(false, 0.06) - (KIT.swordUltTree.cullPct + 0.06)) < 1e-9)
  assert.ok(Math.abs(swordCullThreshold(true, 0.06) - (KIT.swordUltTree.cullBossPct + 0.03)) < 1e-9)
})
