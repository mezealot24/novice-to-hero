import test from 'node:test'
import assert from 'node:assert/strict'
import { DUNGEONS, MONSTERS, type DungeonDef, type MonsterDef, type MonsterKind } from '../src/data/game-data'
import { PACKS } from '../src/data/dungeons'
import { D10 } from '../src/data/dungeons/d10'
import { D11 } from '../src/data/dungeons/d11'
import { D12 } from '../src/data/dungeons/d12'
import { D13 } from '../src/data/dungeons/d13'
import { ENDGAME_DUNGEONS_D11_D13 } from '../src/data/dungeons/endgame-dungeons'
import { monTier, roomLevel, statMonster } from '../src/data/mon-stats'
import {
  HAZARD_TUNING,
  createBiomeCombatState,
  modifyHeroDirectHealBiome,
  onHeroShieldOrBlockBiome,
  onHeroSkillCastBiome,
  onMonsterHitBiome,
  onTurnEndBiome,
} from '../src/data/biome-hazards'
import { activeJob3, JOB3, JOB3_RULES } from '../src/data/jobs3'
import { KIT3 } from '../src/data/skill-math'
import { nodeById, tree3Mods } from '../src/data/tree'
import {
  JOB3_BONUS,
  JOB3_BONUS_STATS,
  heroStats,
  jobBonusBase,
} from '../src/data/meta'
import { newSave, type SaveData } from '../src/save'
import {
  acceptRiftFloor,
  buildRiftMonsterCatalog,
  generateRiftFloor,
  pickRiftBoons,
} from '../src/battle/rift-engine'
import { RIFT_BOONS, RIFT_BOON_IDS } from '../src/data/rift'

const DUNGEON_PACKS = PACKS

function getDungeon(id: string): DungeonDef {
  const found = DUNGEONS.find((d) => d.id === id)
  assert.ok(found, `Expected dungeon ${id} in DUNGEONS`)
  return found
}

function getEffectiveAtk(m: MonsterDef): number {
  return m.magic ? (m.matk ?? m.dmg) : m.dmg
}

function computeDungeonTierPeaks(d: DungeonDef): {
  normal: { hp: number; atk: number }
  mini: { hp: number; atk: number }
  boss: { hp: number; atk: number }
} {
  assert.ok(d.level, `${d.id} must define a level band`)
  const peaks = {
    normal: { hp: 0, atk: 0 },
    mini: { hp: 0, atk: 0 },
    boss: { hp: 0, atk: 0 },
  }
  d.rooms.forEach((r, idx) => {
    const lv = roomLevel(d.level!, d.rooms, idx)
    const kinds: MonsterKind[] = [
      ...r.spawn.map((s) => s[0]),
      ...(r.miniPool ?? []),
    ]
    for (const k of kinds) {
      const base = MONSTERS[k]
      assert.ok(base, `${d.id}: missing monster ${k}`)
      const built = statMonster(base, lv)
      const tier = monTier(base)
      peaks[tier].hp = Math.max(peaks[tier].hp, built.hp)
      peaks[tier].atk = Math.max(peaks[tier].atk, getEffectiveAtk(built))
    }
  })
  return peaks
}

test('Awakening Dungeons D11–D13: unlock chain, level bands, hazards, and pack registration', () => {
  const d10 = getDungeon('d10')
  const d11 = getDungeon('d11')
  const d12 = getDungeon('d12')
  const d13 = getDungeon('d13')

  // Verify presence in DUNGEON_PACKS (PACKS)
  assert.ok(DUNGEON_PACKS.includes(D10 as (typeof DUNGEON_PACKS)[number]))
  assert.ok(DUNGEON_PACKS.includes(D11 as (typeof DUNGEON_PACKS)[number]))
  assert.ok(DUNGEON_PACKS.includes(D12 as (typeof DUNGEON_PACKS)[number]))
  assert.ok(DUNGEON_PACKS.includes(D13 as (typeof DUNGEON_PACKS)[number]))
  assert.equal(D11.dungeon?.id, 'd11')
  assert.equal(D12.dungeon?.id, 'd12')
  assert.equal(D13.dungeon?.id, 'd13')

  // Unlock chain: d10 -> d11 -> d12 -> d13
  assert.equal(d10.unlock, 'd9')
  assert.equal(d11.unlock, 'd10')
  assert.equal(d12.unlock, 'd11')
  assert.equal(d13.unlock, 'd12')

  // Tiers & level bands
  assert.equal(d11.tier, 11)
  assert.equal(d12.tier, 12)
  assert.equal(d13.tier, 13)
  assert.deepEqual(d11.level, [90, 94])
  assert.deepEqual(d12.level, [94, 97])
  assert.deepEqual(d13.level, [97, 99])

  // Biome hazards
  assert.equal(d11.hazard, 'clockwork_heat')
  assert.equal(d12.hazard, 'abyssal_pressure')
  assert.equal(d13.hazard, 'astral_eclipse')
})

test('Awakening Dungeons D11–D13: monster HP/ATK strictly climb (D10 < D11 < D12 < D13) and chargeCounter is set on minis/bosses', () => {
  const p10 = computeDungeonTierPeaks(getDungeon('d10'))
  const p11 = computeDungeonTierPeaks(getDungeon('d11'))
  const p12 = computeDungeonTierPeaks(getDungeon('d12'))
  const p13 = computeDungeonTierPeaks(getDungeon('d13'))

  for (const tier of ['normal', 'mini', 'boss'] as const) {
    assert.ok(
      p10[tier].hp < p11[tier].hp &&
        p11[tier].hp < p12[tier].hp &&
        p12[tier].hp < p13[tier].hp,
      `${tier} HP must climb strictly: D10(${p10[tier].hp}) < D11(${p11[tier].hp}) < D12(${p12[tier].hp}) < D13(${p13[tier].hp})`,
    )
    assert.ok(
      p10[tier].atk < p11[tier].atk &&
        p11[tier].atk < p12[tier].atk &&
        p12[tier].atk < p13[tier].atk,
      `${tier} ATK must climb strictly: D10(${p10[tier].atk}) < D11(${p11[tier].atk}) < D12(${p12[tier].atk}) < D13(${p13[tier].atk})`,
    )
  }

  // Verify chargeCounter on D11-D13 minis and bosses in MONSTERS / PACKS
  assert.equal(MONSTERS.overdrive.chargeCounter, 'interrupt_stun')
  assert.equal(MONSTERS.chronotitan.chargeCounter, 'interrupt_stun')
  assert.equal(MONSTERS.coraljaeger.chargeCounter, 'shield_or_guard')
  assert.equal(MONSTERS.leviathan.chargeCounter, 'shield_or_guard')
  assert.equal(MONSTERS.umbravalkyrie.chargeCounter, 'multi_hit_break')
  assert.equal(MONSTERS.seraph.chargeCounter, 'multi_hit_break')

  // Verify ENDGAME_DUNGEONS_D11_D13 telegraphs match the same counter hints and climb
  assert.equal(ENDGAME_DUNGEONS_D11_D13.length, 3)
  const expectedHints = ['interrupt_stun', 'shield_or_guard', 'multi_hit_break'] as const
  ENDGAME_DUNGEONS_D11_D13.forEach((ed, idx) => {
    const mini = ed.monsters.find((m) => m.rank === 'miniboss')
    const boss = ed.monsters.find((m) => m.rank === 'boss')
    assert.equal(mini?.telegraph?.counterHint, expectedHints[idx])
    assert.equal(boss?.telegraph?.counterHint, expectedHints[idx])
  })
})

test('Biome Hazards (HAZARD_TUNING): clockwork_heat, abyssal_pressure, and astral_eclipse exact rules', () => {
  // 1. clockwork_heat: sweet spot (50..85 -> +35% critDmg, x1.2 skill dmg) & overheat (>=100 -> 15% burn, 1 turn silence, reset to 30)
  const heatCfg = HAZARD_TUNING.clockwork_heat
  assert.equal(heatCfg.sweetMin, 50)
  assert.equal(heatCfg.sweetMax, 85)
  assert.equal(heatCfg.sweetCritDmg, 0.35)
  assert.equal(heatCfg.sweetSkillMul, 1.2)
  assert.equal(heatCfg.overheatAt, 100)
  assert.equal(heatCfg.selfBurnPct, 0.15)
  assert.equal(heatCfg.silenceTurns, 1)
  assert.equal(heatCfg.resetHeat, 30)

  const heatState = createBiomeCombatState('clockwork_heat', [])
  // Test boundary 50..85 sweet spot directly
  heatState.heat = 30 // +20 -> 50 (lower sweet spot inclusive)
  const sweetLow = onHeroSkillCastBiome(heatState, 2000)
  assert.equal(heatState.heat, 50)
  assert.equal(sweetLow.critDmgBonus, 0.35)
  assert.equal(sweetLow.skillDmgMultiplier, 1.2)
  assert.equal(sweetLow.triggeredOverheat, false)

  heatState.heat = 65 // +20 -> 85 (upper sweet spot inclusive)
  const sweetHigh = onHeroSkillCastBiome(heatState, 2000)
  assert.equal(heatState.heat, 85)
  assert.equal(sweetHigh.critDmgBonus, 0.35)
  assert.equal(sweetHigh.skillDmgMultiplier, 1.2)
  assert.equal(sweetHigh.triggeredOverheat, false)

  // Next cast: 85 + 20 -> 100 (overheat)
  const overheat = onHeroSkillCastBiome(heatState, 2000)
  assert.equal(overheat.triggeredOverheat, true)
  assert.equal(overheat.selfBurnDamage, Math.floor(2000 * 0.15)) // 300
  assert.equal(overheat.critDmgBonus, 0)
  assert.equal(overheat.skillDmgMultiplier, 1.0)
  assert.equal(heatState.overheatedSilenceTurns, 1)
  assert.equal(heatState.heat, 30)

  onTurnEndBiome(heatState)
  assert.equal(heatState.heat, 30 - heatCfg.coolPerTurn)
  assert.equal(heatState.overheatedSilenceTurns, 0)

  // 2. abyssal_pressure: 0.7x heal, 1.2x DEF + 5% MaxHP wave max once per turn via pressureWaveUsedThisTurn, reset on onTurnEndBiome
  const abyssCfg = HAZARD_TUNING.abyssal_pressure
  assert.equal(abyssCfg.healMul, 0.7)
  assert.equal(abyssCfg.waveDefMul, 1.2)
  assert.equal(abyssCfg.waveHpPct, 0.05)
  assert.equal(abyssCfg.maxWavesPerTurn, 1)

  const abyssState = createBiomeCombatState('abyssal_pressure', [])
  assert.equal(modifyHeroDirectHealBiome(abyssState, 1000), 700)
  assert.equal(abyssState.pressureWaveUsedThisTurn, false)

  const wave1 = onHeroShieldOrBlockBiome(abyssState, 150, 2000)
  assert.equal(wave1.triggeredWave, true)
  assert.equal(wave1.aoeTrueDamage, Math.floor(150 * 1.2 + 2000 * 0.05)) // 180 + 100 = 280
  assert.equal(abyssState.pressureWaveUsedThisTurn, true)

  const wave2 = onHeroShieldOrBlockBiome(abyssState, 150, 2000)
  assert.equal(wave2.triggeredWave, false)
  assert.equal(wave2.aoeTrueDamage, 0)

  onTurnEndBiome(abyssState)
  assert.equal(abyssState.pressureWaveUsedThisTurn, false)
  const waveAfterReset = onHeroShieldOrBlockBiome(abyssState, 150, 2000)
  assert.equal(waveAfterReset.triggeredWave, true)
  assert.equal(waveAfterReset.aoeTrueDamage, 280)

  // 3. astral_eclipse: 4 layers normal, 6 layers boss via bossIds, 12%/layer DR cap 60%, break -> 2 turns stagger x1.4 dmg, regen 3 layers
  const eclipseCfg = HAZARD_TUNING.astral_eclipse
  assert.equal(eclipseCfg.normalLayers, 4)
  assert.equal(eclipseCfg.bossLayers, 6)
  assert.equal(eclipseCfg.drPerLayer, 0.12)
  assert.equal(eclipseCfg.drCap, 0.6)
  assert.equal(eclipseCfg.staggerTurns, 2)
  assert.equal(eclipseCfg.staggerDmgMul, 1.4)
  assert.equal(eclipseCfg.regenLayers, 3)

  const eclipseState = createBiomeCombatState(
    'astral_eclipse',
    ['normal_1', 'boss_1'],
    new Set(['boss_1']),
  )
  assert.equal(eclipseState.monsterAstralLayers.normal_1, 4)
  assert.equal(eclipseState.monsterAstralLayers.boss_1, 6)

  // Boss at 6 layers: 6 * 12% = 72% -> capped at 60% DR -> 400 damage
  const bossHit1 = onMonsterHitBiome(eclipseState, 'boss_1', 1000, 1)
  assert.equal(bossHit1.finalDamage, 400)
  assert.equal(bossHit1.remainingLayers, 5)
  assert.equal(bossHit1.isStaggered, false)

  // Normal at 4 layers: 4 * 12% = 48% DR -> 520 damage, 4-hit break -> 0 layers -> stagger 2 turns
  const normalBreak = onMonsterHitBiome(eclipseState, 'normal_1', 1000, 4)
  assert.equal(normalBreak.finalDamage, 520)
  assert.equal(normalBreak.remainingLayers, 0)
  assert.equal(normalBreak.justBroken, true)
  assert.equal(normalBreak.isStaggered, true)
  assert.equal(eclipseState.monsterStaggerTurns.normal_1, 2)

  // Hit while staggered -> x1.4 damage (1400)
  const staggeredHit = onMonsterHitBiome(eclipseState, 'normal_1', 1000, 2)
  assert.equal(staggeredHit.finalDamage, 1400)
  assert.equal(staggeredHit.isStaggered, true)
  assert.equal(staggeredHit.justBroken, false)

  // Turn 1 end -> 1 stagger turn left
  onTurnEndBiome(eclipseState)
  assert.equal(eclipseState.monsterStaggerTurns.normal_1, 1)
  assert.equal(eclipseState.monsterAstralLayers.normal_1, 0)

  // Turn 2 end -> stagger expires, regenerates 3 layers
  onTurnEndBiome(eclipseState)
  assert.equal(eclipseState.monsterStaggerTurns.normal_1, 0)
  assert.equal(eclipseState.monsterAstralLayers.normal_1, 3)
})

function makeChampionSave(
  pts = 0,
  tree3: Record<string, number> = {},
  extra: Partial<SaveData> = {},
): SaveData {
  const s = newSave('champ', 'human')
  const fill = (ids: string[], n: number) => {
    const out: Record<string, number> = {}
    let rem = n
    for (const id of ids) {
      const max = nodeById(id)!.max
      const put = Math.min(rem, max)
      out[id] = put
      rem -= put
    }
    return out
  }
  Object.assign(s, {
    job: 'cleric',
    jobLevel: 40,
    job2: 'monk',
    job2Level: 50,
    job3: 'champion',
    job3Level: JOB3_RULES.maxJobLevel,
    job3Path: 'pure',
    job3Var: 'a',
    job3Trial: { champion: 1 },
    clearsBy: { d1: 1, d5: 1, d10: 1 },
    job2Tree: {
      ...fill(['mk_c1', 'mk_c2', 'mk_c3'], pts),
      ...fill(['mk_h1', 'mk_h2', 'mk_h3'], pts),
      ...fill(['mk_a1', 'mk_a2', 'mk_a3'], pts),
    },
    job3Tree: tree3,
    ...extra,
  })
  return s
}

test('Champion Job3 & JOB3_BONUS_STATS: ch_l1, ch_l2, ch_r3 (earthDrivePer = 0.8), and JOB3_BONUS active vs parked', () => {
  assert.equal(JOB3.champion.parent, 'monk')
  assert.equal(KIT3.champion.earthDrivePer, 0.8)
  assert.deepEqual(JOB3_BONUS_STATS.champion, ['str', 'agi', 'wis'])
  assert.equal(JOB3_BONUS.every, 10)
  assert.equal(JOB3_BONUS.perStep, 2)

  // ch_l1: +0.5%/lv per mk_c point into ult2Pow, capped at crossCap (0.15)
  const base5 = heroStats(makeChampionSave(5, {}))
  const l1At5 = heroStats(makeChampionSave(5, { ch_l1: 3 }))
  assert.ok(Math.abs(l1At5.ult2Pow - base5.ult2Pow - 0.015 * 5) < 1e-9)
  const base99 = heroStats(makeChampionSave(99, {}))
  const l1At99 = heroStats(makeChampionSave(99, { ch_l1: 3 }))
  assert.ok(Math.abs(l1At99.ult2Pow - base99.ult2Pow - KIT3.champion.leg.crossCap) < 1e-9)

  // ch_l2: +0.2%/lv per mk_h point into j2Guard, capped at guardCap (0.06)
  const l2At5 = heroStats(makeChampionSave(5, { ch_l2: 3 }))
  assert.ok(Math.abs(l2At5.j2Guard - base5.j2Guard - 0.006 * 5) < 1e-9)
  const l2At99 = heroStats(makeChampionSave(99, { ch_l2: 3 }))
  assert.ok(Math.abs(l2At99.j2Guard - base99.j2Guard - KIT3.champion.leg.guardCap) < 1e-9)

  // ch_r3: earthDrivePer = 0.8 per level (Lv 1 = 0.8, Lv 2 = 1.6, Lv 3 = 2.4)
  for (const lv of [1, 2, 3]) {
    const mods = tree3Mods({ ch_r3: lv }, 'champion', 'pure')
    assert.equal(mods.length, 1)
    assert.ok(Math.abs((mods[0].j3EarthDrive ?? 0) - 0.8 * lv) < 1e-9)
    const st = heroStats(makeChampionSave(0, { ch_r3: lv }))
    assert.ok(Math.abs(st.j3EarthDrive - 0.8 * lv) < 1e-9)
  }

  // JOB3_BONUS: +2 STR/AGI/WIS per 10 Job3 levels when activeJob3(s) is active, 0 when parked
  const monkOnly = makeChampionSave(0, {}, { job3: undefined, job3Level: undefined })
  const jbMonk = jobBonusBase(monkOnly)

  for (const [lv, expectedAdd] of [
    [9, 0],
    [10, 2],
    [19, 2],
    [20, 4],
    [30, 6],
  ] as const) {
    const active = makeChampionSave(0, {}, { job3Level: lv })
    assert.equal(activeJob3(active), 'champion')
    const jb = jobBonusBase(active)
    assert.equal(jb.str - jbMonk.str, expectedAdd, `STR at Job3 Lv ${lv}`)
    assert.equal(jb.agi - jbMonk.agi, expectedAdd, `AGI at Job3 Lv ${lv}`)
    assert.equal(jb.wis - jbMonk.wis, expectedAdd, `WIS at Job3 Lv ${lv}`)
  }

  // When parked (job2 switched to crusader while job3 remains 'champion'), activeJob3 is undefined and Champion bonus is 0
  const parked = makeChampionSave(0, {}, { job2: 'crusader', job3: 'champion', job3Level: 30 })
  assert.equal(activeJob3(parked), undefined)
  const crusaderNoJ3 = makeChampionSave(0, {}, { job2: 'crusader', job3: undefined, job3Level: undefined })
  assert.deepEqual(jobBonusBase(parked), jobBonusBase(crusaderNoJ3))
})

test('500-Seed Roguelike Acceptance Check: 500 seeds x depths (1, 5, 10, 15) pass 100%, never pair abyssal_pressure with no_heal, and pickRiftBoons is deterministic', () => {
  const catalog = buildRiftMonsterCatalog()
  const depths = [1, 5, 10, 15] as const
  let totalGenerated = 0

  for (let i = 1; i <= 500; i++) {
    const seed = `ROGUELIKE-500-SEED-${i}`
    for (const depth of depths) {
      const { spec } = generateRiftFloor(seed, depth, catalog)
      const check = acceptRiftFloor(spec, catalog)
      assert.equal(
        check.ok,
        true,
        `Seed ${seed} at depth ${depth} failed acceptance: ${check.reason ?? 'unknown'}`,
      )
      assert.equal(spec.depth, depth)
      assert.equal(spec.isBossFloor, depth % 5 === 0)
      assert.ok(spec.spawns.length > 0)

      // Never combine abyssal_pressure with no_heal
      if (spec.biomeHazard === 'abyssal_pressure') {
        assert.equal(
          spec.mutatorIds.includes('no_heal'),
          false,
          `Seed ${seed} depth ${depth} combined abyssal_pressure with no_heal`,
        )
      }

      // Deterministic pickRiftBoons with 3 distinct valid boons
      const pickedHistory = i % 2 === 0 ? ['rift_spellblade', 'rift_titanheart'] : []
      const boonsA = pickRiftBoons(seed, depth, pickedHistory)
      const boonsB = pickRiftBoons(seed, depth, pickedHistory)
      assert.equal(boonsA.length, 3)
      assert.deepEqual(boonsA, boonsB)

      const distinctIds = new Set(boonsA.map((b) => b.id))
      assert.equal(distinctIds.size, 3, `Seed ${seed} depth ${depth} must offer 3 distinct boons`)
      for (const b of boonsA) {
        assert.ok(RIFT_BOON_IDS.includes(b.id))
        assert.equal(RIFT_BOONS[b.id], b)
        assert.equal(
          pickedHistory.includes(b.id),
          false,
          `Unowned pool has enough boons so already-picked ${b.id} must not repeat`,
        )
      }

      totalGenerated++
    }
  }

  assert.equal(totalGenerated, 2000)
})
