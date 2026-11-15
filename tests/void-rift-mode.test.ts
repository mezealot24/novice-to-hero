import test from 'node:test'
import assert from 'node:assert/strict'

import { DUNGEONS } from '../src/data/game-data'
import { MATS, matById, matName } from '../src/data/materials'
import { TAINT_MAT } from '../src/data/taint'
import {
  ALL_MUTATORS,
  MUTATORS,
  RIFT_MUTATORS,
  foldMutators,
  mutatorById,
  type RiftMutatorId,
} from '../src/data/mutators'
import {
  RIFT_BIOMES,
  RIFT_BOON_IDS,
  RIFT_BOONS,
  RIFT_BRANCHES,
  RIFT_MATS,
  RIFT_TUNING,
  riftBoonById,
  riftBranchById,
  type RiftActiveRunState,
} from '../src/data/rift'
import {
  ALL_RIFT_MUTATORS,
  INCOMPATIBLE_MUTATOR_PAIRS,
  applyRiftBranchChoice,
  buildRiftMonsterCatalog,
  buildRiftMonsterCatalogFromPacks,
  getDailyRiftSeed,
  pickRiftBoons,
} from '../src/battle/rift-engine'
import {
  BOUNTY,
  DAILY,
  MODES,
  PANEL_MODES,
  bountyOf,
  dailyOf,
  riftFloorLoot,
  riftOk,
} from '../src/data/modes'
import { adopt, forgetForge, load, newSave, type SaveData } from '../src/save'

function withMemoryLocalStorage(fn: () => void): void {
  const store = new Map<string, string>()
  const prevDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const fakeStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v))
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => {
      store.clear()
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: fakeStorage,
    configurable: true,
    writable: true,
  })
  try {
    fn()
  } finally {
    if (prevDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', prevDescriptor)
    } else {
      delete (globalThis as { localStorage?: unknown }).localStorage
    }
  }
}

test('RIFT_MUTATORS: all 8 mutators registered cleanly without altering daily MUTATORS count', () => {
  assert.equal(Object.keys(MUTATORS).length, 9)
  const expectedIds: RiftMutatorId[] = [
    'frenzy_aura',
    'thorns_carapace',
    'no_heal',
    'blood_drain',
    'silence_aura',
    'skill_only_damage',
    'empower_elites',
    'volatile_death',
  ]
  assert.equal(Object.keys(RIFT_MUTATORS).length, expectedIds.length)
  assert.equal(Object.keys(ALL_MUTATORS).length, 9 + expectedIds.length)

  for (const id of expectedIds) {
    assert.ok(RIFT_MUTATORS[id], `missing RIFT_MUTATORS.${id}`)
    assert.equal(mutatorById(id)?.id, id)
  }

  const folded = foldMutators(expectedIds.map((id) => RIFT_MUTATORS[id]))
  assert.equal(folded.healMul, 0)
  assert.equal(folded.waveHeal, 0)
  assert.ok((folded.thornsMul ?? 0) > 0)
  assert.ok((folded.silenceEvery ?? 0) > 0)
  assert.equal(folded.skillOnly, true)
  assert.ok((folded.eliteMul ?? 1) > 1)
  assert.ok((folded.volatileDeath ?? 0) > 0)
  assert.ok((folded.bloodDrain ?? 0) > 0)
  assert.ok(folded.monSpeed > 1)
  assert.ok(folded.monAtk > 1)
  assert.ok(folded.monHp > 1)
})

test('RIFT_MATS & materials.ts: m_rift and b_rift registered in MATS', () => {
  assert.equal(RIFT_MATS.common, 'm_rift')
  assert.equal(RIFT_MATS.boss, 'b_rift')
  const common = matById('m_rift')
  const boss = matById('b_rift')
  assert.ok(common)
  assert.ok(boss)
  assert.equal(common.boss, false)
  assert.equal(boss.boss, true)
  assert.equal(matName('m_rift'), '🌀 เศษผลึกรอยแยก')
  assert.equal(matName('b_rift'), '💠 แก่นแท้อเวจี')
  assert.ok(MATS.some((m) => m.id === 'm_rift'))
  assert.ok(MATS.some((m) => m.id === 'b_rift'))
})

test('RIFT_BOONS & RIFT_BRANCHES: 12 boons and 3 branches defined cleanly', () => {
  assert.equal(RIFT_BOON_IDS.length, 12)
  for (const id of RIFT_BOON_IDS) {
    const b = riftBoonById(id)
    assert.ok(b)
    assert.equal(b.id, id)
    assert.ok(b.name.length > 0)
    assert.ok(b.desc.length > 0)
    assert.ok(RIFT_BOONS[id])
  }
  assert.ok(riftBranchById('elite_hunt'))
  assert.ok(riftBranchById('cursed_altar'))
  assert.ok(riftBranchById('safe_sanctuary'))
  assert.ok(RIFT_BRANCHES.cursed_altar.addsCurse)
  assert.ok(RIFT_BRANCHES.safe_sanctuary.healFrac > 0)
  assert.ok(RIFT_BRANCHES.elite_hunt.threatMul > 1)
})

test('rift-engine helpers: pickRiftBoons, applyRiftBranchChoice, and pack catalog integration', () => {
  const b1 = pickRiftBoons('SEED-BOON', 3, [])
  const b2 = pickRiftBoons('SEED-BOON', 3, [])
  assert.equal(b1.length, RIFT_TUNING.boonOfferCount)
  assert.deepEqual(
    b1.map((x) => x.id),
    b2.map((x) => x.id)
  )

  const ownedSome = RIFT_BOON_IDS.slice(0, 10)
  const remaining = pickRiftBoons('SEED-BOON', 4, ownedSome, 3)
  assert.equal(remaining.length, 3)
  assert.equal(new Set(remaining.map((x) => x.id)).size, 3)

  const packCat = buildRiftMonsterCatalogFromPacks()
  assert.ok(packCat.has('mummy'))
  assert.ok(packCat.has('pharaoh'))
  const catalog = buildRiftMonsterCatalog()
  const firstEndgameId = Array.from(catalog.keys())[0]
  assert.ok(firstEndgameId && packCat.has(firstEndgameId))
  const runState: RiftActiveRunState = {
    seed: 'BRANCH-CHECK',
    depth: 4,
    boons: ['rift_spellblade'],
    curses: [],
    bankZeny: 120,
    bankMats: { m_rift: 3 },
    startedAt: 1000,
  }
  const altar = applyRiftBranchChoice(runState, 'cursed_altar', catalog, 5)
  assert.equal(altar.floor.depth, 5)
  assert.equal(altar.floor.isBossFloor, true)
  assert.equal(altar.boonChoices.length, RIFT_BRANCHES.cursed_altar.boonChoices)
  assert.equal(runState.lastBranch, 'cursed_altar')
  assert.ok(altar.addedCurse && ALL_RIFT_MUTATORS.includes(altar.addedCurse))
  assert.equal(runState.curses.length, 1)
  if (altar.floor.biomeHazard === 'abyssal_pressure') {
    assert.notEqual(altar.addedCurse, 'no_heal')
  }
  for (const [mA, mB] of INCOMPATIBLE_MUTATOR_PAIRS) {
    const combined = [...altar.floor.mutatorIds, ...runState.curses]
    assert.ok(!(combined.includes(mA) && combined.includes(mB)))
  }

  const safe = applyRiftBranchChoice(runState, 'safe_sanctuary', catalog, 6)
  assert.ok(safe.healFrac > 0)
  assert.ok(safe.threatMul < 1)
})

test('MODES.rift & dynamic endgame pools: panel, unlock, biomes, scaling, rewards & wipe', () => {
  assert.ok(PANEL_MODES.includes('rift'))

  const lockedSave: SaveData = { ...newSave('โนวิส', 'human'), clearsBy: { d9: 1 } }
  assert.equal(riftOk(lockedSave), false)
  assert.equal(MODES.rift.unlock(lockedSave).ok, false)

  const unlockedSave: SaveData = {
    ...newSave('โนวิส', 'human'),
    clearsBy: { d6: 1, d7: 1, d8: 1, d9: 1, d10: 1 },
  }
  assert.equal(riftOk(unlockedSave), true)
  assert.equal(MODES.rift.unlock(unlockedSave).ok, true)

  // Dynamic sync on DAILY.deepPool & BOUNTY.pool
  const levelDungeonIds = DUNGEONS.filter((d) => d.level).map((d) => d.id)
  assert.deepEqual(DAILY.deepPool, levelDungeonIds)
  assert.deepEqual(BOUNTY.pool, levelDungeonIds)
  assert.ok(dailyOf(20261115, true, unlockedSave).dg.level)
  assert.ok(bountyOf(202646, unlockedSave).dg.level)

  const dailySeedStr = getDailyRiftSeed('2026-11-15')
  const cfgA = MODES.rift.buildRun(unlockedSave, {
    mode: 'rift',
    riftSeed: dailySeedStr,
    riftDaily: true,
  })
  const cfgB = MODES.rift.buildRun(unlockedSave, {
    mode: 'rift',
    riftSeed: dailySeedStr,
    riftDaily: true,
  })
  assert.equal(cfgA.riftMode, true)
  assert.equal(cfgA.seed, cfgB.seed)
  assert.equal(cfgA.endless, true)

  const seenBiomes = new Set<string>()
  for (let i = 0; i < 20; i++) {
    const r = cfgA.roomAt(i)!
    assert.ok(r)
    assert.ok(r.spawn.length > 0)
    assert.equal(r.floor, i + 1)
    const b = cfgA.biomeAt?.(i, r)
    assert.ok(b && RIFT_BIOMES.includes(b))
    seenBiomes.add(b)
    const spec = cfgA.riftFloorAt?.(i)
    assert.ok(spec)
    if (spec.biomeHazard === 'abyssal_pressure') {
      assert.equal(spec.mutatorIds.includes('no_heal'), false)
    }
  }
  assert.ok(seenBiomes.size >= 2)

  const r1 = cfgA.roomAt(0)!
  const r10 = cfgA.roomAt(9)!
  assert.equal(r10.boss, true)
  const s1 = cfgA.scale(r1)!
  const s10 = cfgA.scale(r10)!
  assert.ok(s10.hp > s1.hp)
  assert.ok(s10.atk > s1.atk)

  const floor5Loot = riftFloorLoot(5)
  assert.ok((floor5Loot.mats[RIFT_MATS.common] ?? 0) > 0)
  assert.equal(floor5Loot.mats[RIFT_MATS.boss], 1)
  assert.equal(floor5Loot.mats[TAINT_MAT], 1)
  assert.equal(floor5Loot.medals, 1)

  // Active riftRun gets wiped on settlement; talentWallet receives dust & medals
  unlockedSave.riftRun = {
    seed: dailySeedStr,
    depth: 5,
    daily: true,
    boons: ['rift_spellblade'],
    curses: [],
    bankZeny: 0,
    bankMats: {},
    startedAt: 12345,
  }
  const reward = MODES.rift.reward(unlockedSave, cfgA, {
    won: false,
    left: false,
    floor: 5,
    bank: { zeny: 300, mats: { m_rift: 6, b_rift: 1, [TAINT_MAT]: 1 } },
  })
  assert.ok(reward)
  assert.equal(unlockedSave.riftRun, undefined)
  assert.equal(reward.zeny, Math.round(300 * RIFT_TUNING.fallKeep))
  assert.equal(reward.mats.m_rift, Math.floor(6 * RIFT_TUNING.fallKeep))
  assert.equal(unlockedSave.modes?.rift?.bestDepth, 5)
  // First-time depth 5 milestone (15) + daily gems (30) = 45
  assert.equal(reward.gems, 15 + RIFT_TUNING.dailyGems)
  assert.equal(reward.fortune, RIFT_TUNING.dailyFortune)
  assert.ok((unlockedSave.talentWallet?.runeDust ?? 0) > 0)
  assert.equal(unlockedSave.talentWallet?.goldMedals, 1)
})

test('save.ts: backward compatibility, corrupt guards & forgetForge cleanup for endgame fields', () => {
  withMemoryLocalStorage(() => {
    const legacy = newSave('โนวิส', 'human')
    assert.equal(adopt(legacy), true)
    const loadedLegacy = load()
    assert.ok(loadedLegacy)
    assert.equal(loadedLegacy.imbue, undefined)
    assert.equal(loadedLegacy.awakened, undefined)
    assert.equal(loadedLegacy.riftRun, undefined)
    assert.equal(loadedLegacy.talentWallet, undefined)

    const validRun: RiftActiveRunState = {
      seed: 'SAVE-TEST',
      depth: 7,
      daily: false,
      boons: ['rift_lightning', 'rift_voidpen'],
      curses: ['blood_drain'],
      bankZeny: 420,
      bankMats: { m_rift: 5, b_rift: 1 },
      lastBranch: 'elite_hunt',
      startedAt: 99999,
    }
    const rich: SaveData = {
      ...newSave('โนวิส', 'human'),
      imbue: { wp1: 'aspect_ember', wp2: 'aspect_frost' },
      awakened: { unq1: 1 },
      riftRun: validRun,
      talentWallet: {
        zeny: 1000,
        runeDust: 250,
        goldMedals: 3,
        hellMedalPity: 2,
        firstClearFlags: ['d11_first'],
      },
    }
    assert.equal(adopt(rich), true)
    const loadedRich = load()!
    assert.deepEqual(loadedRich.imbue, { wp1: 'aspect_ember', wp2: 'aspect_frost' })
    assert.deepEqual(loadedRich.awakened, { unq1: 1 })
    assert.equal(loadedRich.riftRun?.seed, 'SAVE-TEST')
    assert.equal(loadedRich.riftRun?.depth, 7)
    assert.equal(loadedRich.talentWallet?.runeDust, 250)
    assert.deepEqual(loadedRich.talentWallet?.firstClearFlags, ['d11_first'])

    forgetForge(loadedRich, 'wp1')
    forgetForge(loadedRich, 'unq1')
    assert.equal(loadedRich.imbue?.wp1, undefined)
    assert.equal(loadedRich.imbue?.wp2, 'aspect_frost')
    assert.equal(loadedRich.awakened?.unq1, undefined)

    // Corrupt endgame fields should never crash load/adopt
    const corrupt = {
      ...newSave('โนวิส', 'human'),
      imbue: ['not-an-object'],
      awakened: { bad: -99, ok: 2 },
      riftRun: { seed: 123, depth: 'bad' },
      talentWallet: 'corrupt',
    }
    assert.equal(adopt(corrupt), true)
    const sanitized = load()!
    assert.equal(sanitized.imbue, undefined)
    assert.equal(sanitized.awakened?.bad, undefined)
    assert.equal(sanitized.awakened?.ok, 2)
    assert.equal(sanitized.riftRun, undefined)
    assert.equal(sanitized.talentWallet, undefined)
  })
})
