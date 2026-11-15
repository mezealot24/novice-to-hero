import test from 'node:test'
import assert from 'node:assert/strict'
import { heroStats, itemById, totalBase } from '../src/data/meta'
import {
  BM_CRIT_COUNTER,
  BM_STANCE,
  FALCON_MIX,
  KIT2,
  KIT3,
  boarCutOf,
  boarRageKOf,
  boarRecoverTurnsOf,
  boarShareOf,
  falconMul,
  falconPower,
  falconRatio,
  frenzyCapOf,
  hawkBlitzMul,
  hawkChance,
  preyMarkOf,
  preyTurnsOf,
} from '../src/data/skill-math'
import { tree2 as bmRawTree2 } from '../src/data/trees2/beastmaster'
import { branches2Of, NO_STRETCH, nodesOf, talents2Of } from '../src/data/tree'
import { PET_DOSSIER_I18N as JOBS2_PET_DOSSIER } from '../src/data/jobs2'
import { PET_DOSSIER_I18N } from '../src/data/pet-dossier'
import { rollLine } from '../src/data/refine'

const mem: Record<string, string> = {}
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v },
  removeItem: (k: string) => { delete mem[k] },
}
const { load, migrateBeastmasterRework, newSave, resetTree2, setSave, wipe } = await import('../src/save')
type SaveData = ReturnType<typeof newSave>

function mkBmSave(over: Partial<SaveData> = {}): SaveData {
  const s = newSave('bm', 'human')
  Object.assign(s, {
    job: 'archer',
    jobLevel: 1,
    job2: 'beastmaster',
    job2Level: 1,
    job2Tree: {},
    job2Talents: {},
    equipped: { weapon: 'knife', armor: 'cloth', acc: 'none', head: 'none_head', offhand: 'none_off', acc2: 'none' },
    ...over,
  })
  return s
}

test('Case 2.1: Hawk Stance (Skyhunter) derives LUK +15, cap 75% (85% Ranger), HIT, Crit and DEX-to-MATK resonance', () => {
  const sHawk = mkBmSave({
    pet: 'hawk',
    stats: { str: 1, vit: 1, wis: 1, dex: 59, int: 1, luk: 39, agi: 1 }, // human bonus +1 dex, +1 luk -> 60 dex, 40 base luk (+15 stance = 55)
  })
  const bHawk = totalBase(sHawk)
  assert.equal(bHawk.dex, 60)
  assert.equal(bHawk.luk, 40 + BM_STANCE.hawk.luk)

  const stHawk = heroStats(sHawk)
  // Compare against Beastmaster in Boar Stance with same post-stance LUK (boar stance does not alter hit, crit, or hawk fields)
  const sRef = mkBmSave({
    pet: 'boar',
    stats: { str: 1, vit: 1, wis: 1, dex: 59, int: 1, luk: 39 + BM_STANCE.hawk.luk, agi: 1 },
  })
  const stRef = heroStats(sRef)
  const expectedHitGain = BM_STANCE.hawk.hitFlat + Math.floor(BM_STANCE.hawk.hitPerDex * bHawk.dex)
  const expectedCritGain = Math.min(BM_STANCE.hawk.critCap, BM_STANCE.hawk.critBase + BM_STANCE.hawk.critPerLuk * bHawk.luk)
  assert.equal(expectedHitGain, 30)
  assert.ok(Math.abs(expectedCritGain - 0.0875) < 1e-9)
  assert.equal(stHawk.hit - stRef.hit, expectedHitGain)
  assert.ok(Math.abs((stHawk.crit - stRef.crit) - expectedCritGain) < 1e-9)
  assert.equal(stHawk.j2HawkCapAdd, BM_STANCE.hawk.capAdd)
  assert.equal(stHawk.j2HawkDexToMatk, BM_STANCE.hawk.dexToMatk)
  assert.equal(Math.floor(stHawk.j2HawkDexToMatk * bHawk.dex), 12)
  assert.equal(stHawk.j2PreyMarkAdd, BM_STANCE.hawk.preyMarkAdd)
  assert.equal(stHawk.j2MarkPierceFlee, BM_STANCE.hawk.markPierceFlee)
  assert.equal(stHawk.j2StanceMarkCritDmg, BM_STANCE.hawk.markCritDmg)

  // Hawk chance caps: 0.60 base -> 0.75 Skyhunter -> 0.70 Ranger -> 0.85 Ranger + Skyhunter
  const noStanceSt = { ...stRef, j2HawkCapAdd: 0, j3Rn: 0 }
  assert.ok(Math.abs(hawkChance(noStanceSt, 200) - 0.60) < 1e-9)
  assert.ok(Math.abs(hawkChance(stHawk, 200) - 0.75) < 1e-9)
  assert.ok(Math.abs(hawkChance({ ...noStanceSt, j3Rn: 1 }, 200) - 0.70) < 1e-9)
  assert.ok(Math.abs(hawkChance({ ...stHawk, j3Rn: 1 }, 200) - 0.85) < 1e-9)
})

test('Case 2.2: Boar Stance (Iron Tusk) derives DEF bonus, 45% boarShare, +20% shieldAmp, 8% gritShield', () => {
  const sBoar = mkBmSave({
    pet: 'boar',
    stats: { str: 1, vit: 79, wis: 1, dex: 1, int: 1, luk: 1, agi: 1 }, // human +1 vit -> 80 vit
  })
  const bBoar = totalBase(sBoar)
  assert.equal(bBoar.vit, 80)

  const stRef = heroStats({ ...sBoar, job2: 'innovator' })
  const stBoar = heroStats(sBoar)
  const expectedDefGain = Math.floor(BM_STANCE.boar.defBasePct * stRef.def) + Math.floor(BM_STANCE.boar.defPerVit * bBoar.vit)
  assert.equal(stBoar.def - stRef.def, expectedDefGain)
  assert.ok(Math.abs(boarShareOf(stBoar) - 0.45) < 1e-9)
  assert.ok(Math.abs((stBoar.shieldAmp - stRef.shieldAmp) - BM_STANCE.boar.shieldAmp) < 1e-9)
  assert.ok(Math.abs(stBoar.j2StanceGritShield - BM_STANCE.boar.gritShield) < 1e-9)
})

test('Case 2.3: Wolf Stance (Bloodpack) derives P.ATK bonus, frenzyCap 7, +25% bleedDmg, 4% woundLeech', () => {
  const sWolf = mkBmSave({
    pet: 'wolf',
    stats: { str: 1, vit: 1, wis: 1, dex: 1, int: 1, luk: 1, agi: 70 },
  })
  const bWolf = totalBase(sWolf)
  assert.equal(bWolf.agi, 70)

  const stRef = heroStats({ ...sWolf, job2: 'innovator' })
  const stWolf = heroStats(sWolf)
  const expectedAtkGain = Math.floor(BM_STANCE.wolf.atkBasePct * stRef.atk) + Math.floor(BM_STANCE.wolf.atkPerAgi * bWolf.agi)
  assert.equal(stWolf.atk - stRef.atk, expectedAtkGain)
  assert.equal(frenzyCapOf(stRef), 5)
  assert.equal(frenzyCapOf(stWolf), 7)
  assert.ok(Math.abs(stWolf.j2BleedDmg - BM_STANCE.wolf.bleedDmgAdd) < 1e-9)
  assert.ok(Math.abs(stWolf.j2StanceWoundLeech - BM_STANCE.wolf.woundLeech) < 1e-9)
})

test('Case 2.4: Hunter Instinct (bm_s4) and BM_CRIT_COUNTER constants match v2.1 spec', () => {
  const s4 = branches2Of('beastmaster').flatMap((b) => nodesOf(b.id)).find((n) => n.id === 'bm_s4')!
  assert.deepEqual(s4.mod(1), { j2CritPet: 1 })
  assert.deepEqual(BM_CRIT_COUNTER.hawk, { mul: 1.0, markTurns: 2 })
  assert.deepEqual(BM_CRIT_COUNTER.boar, { mul: 0.8, push: 20, shieldPct: 0.05, shieldTurns: 2 })
  assert.deepEqual(BM_CRIT_COUNTER.wolf, { mul: 0.7, bleed: 2, gaugeGain: 50 })
})

test('Case 2.5: Save node IDs preservation, 20 nodes + 12 talents, resetTree2 refund, and corrupt-guarded migration v1 -> v2', () => {
  const bmNodes = branches2Of('beastmaster').flatMap((b) => nodesOf(b.id)).filter((n) => !n.kind)
  const expectedIds = [
    'bm_h1', 'bm_h2', 'bm_h3', 'bm_h4',
    'bm_b1', 'bm_b2', 'bm_b3', 'bm_b4',
    'bm_w1', 'bm_w2', 'bm_w3', 'bm_w4',
    'bm_k1', 'bm_k2', 'bm_k3', 'bm_k4',
    'bm_s1', 'bm_s2', 'bm_s3', 'bm_s4',
  ]
  assert.deepEqual(bmNodes.map((n) => n.id), expectedIds)
  assert.equal('bm_h3' in NO_STRETCH, true)
  assert.equal(bmNodes.find((n) => n.id === 'bm_h3')?.max, 1)
  for (const starId of ['bm_h4', 'bm_b4', 'bm_w4', 'bm_k4', 'bm_s4']) {
    assert.equal(bmNodes.find((n) => n.id === starId)?.max, 1)
  }

  const bmTalents = [1, 2, 3, 4].flatMap((row) => talents2Of('beastmaster', row))
  assert.equal(bmTalents.length, 12)
  for (const t of bmTalents) assert.equal(t.max, 2)
  assert.equal(bmRawTree2.talents?.filter((t) => t.row === 4).length, 3)

  // resetTree2 refunds 100% of spent points
  const s = mkBmSave({ job2Points: 3, job2Tree: { bm_h1: 5, bm_h2: 5, bm_h3: 1, bm_h4: 1, bm_b1: 2 } })
  const refunded = resetTree2(s)
  assert.equal(refunded, 14)
  assert.deepEqual(s.job2Tree, {})

  // Corrupt / NaN / null save migration guard
  const corrupt = mkBmSave({ bmRework: 1, job2Points: Number.NaN, job2Tree: { bm_h1: 3, bm_w2: 2 } })
  migrateBeastmasterRework(corrupt)
  assert.equal(corrupt.bmRework, 2)
  assert.equal(corrupt.job2Points, 5)
  assert.deepEqual(corrupt.job2Tree, {})

  const nullTree = mkBmSave({ bmRework: 1, job2Points: 4 })
  ;(nullTree as { job2Tree?: unknown }).job2Tree = null
  migrateBeastmasterRework(nullTree)
  assert.equal(nullTree.bmRework, 2)
  assert.equal(nullTree.job2Points, 4)

  // load() handles corrupt JSON safely and resets invalid pet
  wipe()
  localStorage.setItem('novice-to-hero.save.v1', '{broken json')
  assert.equal(load(), null)
  const badPet = mkBmSave({ pet: 'wyvern' as never })
  localStorage.setItem('novice-to-hero.save.v1', JSON.stringify(badPet))
  assert.equal(load()?.pet, undefined)
  wipe()
  setSave(newSave('bm', 'human'))
})

test('RO Falconer Blitz Beat skill math: 85:15 FALCON_MIX, Steel Crow bm_h2, Blitz Storm bm_t4_hawk, and derivation helpers', () => {
  assert.deepEqual(FALCON_MIX, { matk: 0.85, atk: 0.15 })

  const stIntBuild = heroStats(mkBmSave({
    pet: 'hawk',
    stats: { str: 1, vit: 1, wis: 1, dex: 20, int: 80, luk: 110, agi: 1 },
    job2Level: 30,
    job2Tree: { bm_h1: 5, bm_h2: 5 },
    job2Talents: { '4': { id: 'bm_t4_hawk', rank: 2 } },
  }))
  const stDexBuild = heroStats(mkBmSave({
    pet: 'hawk',
    stats: { str: 1, vit: 1, wis: 1, dex: 80, int: 1, luk: 20, agi: 1 },
    job2Level: 30,
    job2Tree: { bm_h1: 5, bm_h2: 5 },
    job2Talents: { '4': { id: 'bm_t4_hawk', rank: 2 } },
  }))

  // INT/LUK build has higher auto-blitz chance & significantly higher Falcon Power / Blitz Beat multiplier
  const chanceInt = hawkChance(stIntBuild, 110 + BM_STANCE.hawk.luk)
  const chanceDex = hawkChance(stDexBuild, 20 + BM_STANCE.hawk.luk)
  assert.ok(chanceInt > chanceDex)
  assert.ok(Math.abs(chanceInt - 0.75) < 1e-9, 'hits Skyhunter 75% cap')

  const pwrInt = falconPower(stIntBuild, 80, 20)
  const pwrDex = falconPower(stDexBuild, 1, 80)
  assert.ok(pwrInt > pwrDex * 1.5, `INT/M.ATK build (${pwrInt}) scales much harder than DEX build (${pwrDex})`)

  const mulInt = falconMul(stIntBuild, hawkBlitzMul(stIntBuild), 80, 20)
  const expectedMulInt = hawkBlitzMul(stIntBuild) * falconRatio(stIntBuild, 80, 20)
  assert.ok(Math.abs(mulInt - expectedMulInt) < 1e-9)

  // Steel Crow (bm_h2 Lv5 = old Lv3) + Skyhunter Stance Prey Mark & Blitz Storm (bm_t4_hawk Rank 2)
  assert.ok(Math.abs(stIntBuild.j2HawkIntAdd - 1.5) < 1e-9)
  assert.ok(Math.abs(preyMarkOf(stIntBuild) - (0.10 + 0.09 + 0.05)) < 1e-9)
  assert.equal(preyTurnsOf(stIntBuild), 3)
  assert.equal(stIntBuild.j2HawkBonusHits, 2)
  assert.equal(stIntBuild.j2HawkCritShare, 0.5)

  // Boar helpers with bm_b1, bm_b2, bm_b4 + Boar Stance
  const stBoarFull = heroStats(mkBmSave({
    pet: 'boar',
    job2Tree: { bm_b1: 5, bm_b2: 5, bm_b3: 4, bm_b4: 1 },
  }))
  assert.ok(Math.abs(boarShareOf(stBoarFull) - (0.35 + 0.09 + 0.10)) < 1e-9)
  assert.ok(Math.abs(boarCutOf(stBoarFull) - (0.30 + 0.15)) < 1e-9)
  assert.equal(boarRageKOf(stBoarFull), 200)
  assert.equal(boarRecoverTurnsOf(stBoarFull), 2)
})

test('PET_DOSSIER_I18N covers all 3 Beastmaster pets and re-exports cleanly via jobs2.ts', () => {
  assert.equal(PET_DOSSIER_I18N, JOBS2_PET_DOSSIER)
  for (const pet of ['hawk', 'boar', 'wolf'] as const) {
    const entry = PET_DOSSIER_I18N[pet]
    assert.ok(entry, pet)
    for (const key of ['name', 'title', 'roleTag', 'stanceName', 'stanceDesc', 'critReaction', 'packContribution', 'activeBadge', 'inactiveBadge'] as const) {
      assert.ok(entry[key].trim().length > 0, `${pet}.${key} non-empty`)
    }
  }
})

test('refine.ts: Beastmaster and Ranger roll INT without the pure-archer 0.25 penalty', () => {
  const it = itemById('c_bm_feather')
  const countInt = (cls: { job2?: 'beastmaster' | 'innovator'; job3?: 'ranger' }) => {
    let n = 0
    let seed = 123456789
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296
    }
    for (let k = 0; k < 4000; k++) {
      if (rollLine(it, k % 3, 'archer', rnd, cls).stat === 'int') n++
    }
    return n
  }
  const pureIn = countInt({ job2: 'innovator' })
  const bm = countInt({ job2: 'beastmaster' })
  const rn = countInt({ job2: 'beastmaster', job3: 'ranger' })
  assert.ok(bm >= pureIn * 2, `Beastmaster INT rolls (${bm}) > penalized Innovator (${pureIn})`)
  assert.ok(rn >= pureIn * 2, `Ranger INT rolls (${rn}) > penalized Innovator (${pureIn})`)
})
