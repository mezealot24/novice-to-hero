import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TALENT_NODE_COSTS,
  calcDungeonTalentRewards,
  respecTalentNodes,
  type TalentWallet,
} from '../src/data/meta/talent-economy';
import {
  createBiomeCombatState,
  onHeroSkillCastBiome,
  modifyHeroDirectHealBiome,
  onHeroShieldOrBlockBiome,
  onMonsterHitBiome,
  onTurnEndBiome,
} from '../src/data/biome-hazards';
import {
  ENDGAME_DUNGEONS_D11_D13,
} from '../src/data/dungeons/endgame-dungeons';
import {
  deriveSubSeed,
  getDailyRiftSeed,
  createSeededRng,
  buildRiftMonsterCatalog,
  generateRiftFloor,
  acceptRiftFloor,
  nextReadyActor,
  finalizeRiftRunOnDeath,
  type ScheduledActor,
  type RiftRunSaveState,
  type ProfileMetaSaveState,
} from '../src/battle/rift-engine';

test('💎 [Talent Economy] Node costs match RO M + PoE spec', () => {
  assert.equal(TALENT_NODE_COSTS.minor.runeDustCost, 150);
  assert.equal(TALENT_NODE_COSTS.minor.goldMedalCost, 0);

  assert.equal(TALENT_NODE_COSTS.notable.runeDustCost, 500);
  assert.equal(TALENT_NODE_COSTS.notable.goldMedalCost, 2);

  assert.equal(TALENT_NODE_COSTS.keystone.runeDustCost, 1500);
  assert.equal(TALENT_NODE_COSTS.keystone.goldMedalCost, 8);
});

test('💎 [Talent Economy] calcDungeonTalentRewards gives dust on partial clear, medals on Hell victory, and first clear bonus', () => {
  const wallet: TalentWallet = {
    zeny: 10000,
    runeDust: 0,
    goldMedals: 0,
    hellMedalPity: 0,
    firstClearFlags: [],
  };

  // Defeat midway (50% waves) -> gets partial dust, 0 medals
  const defeatRes = calcDungeonTalentRewards(
    {
      dungeonTier: 11,
      mode: 'hell',
      activeMutatorCount: 0,
      wavesClearedRatio: 0.5,
      isVictory: false,
    },
    wallet,
    () => 0.5
  );
  assert.ok(defeatRes.runeDustEarned > 0);
  assert.equal(defeatRes.goldMedalsEarned, 0);

  // Victory on Hell first clear -> gets first clear medals + boss roll
  const victoryRes = calcDungeonTalentRewards(
    {
      dungeonTier: 11,
      mode: 'hell',
      activeMutatorCount: 0,
      wavesClearedRatio: 1,
      isVictory: true,
    },
    wallet,
    () => 0.1 // Lucky roll -> gets boss medal
  );
  assert.ok(victoryRes.isFirstClearBonus);
  assert.equal(victoryRes.goldMedalsEarned, 3); // 2 first clear + 1 boss drop
});

test('💎 [Talent Economy] Hell Pity Counter guarantees Gold Medal on 4th run after 3 misses', () => {
  const wallet: TalentWallet = {
    zeny: 10000,
    runeDust: 0,
    goldMedals: 0,
    hellMedalPity: 3, // Already missed 3 times
    firstClearFlags: ['d11:hell'], // Already cleared once
  };

  const res = calcDungeonTalentRewards(
    {
      dungeonTier: 11,
      mode: 'hell',
      activeMutatorCount: 0,
      wavesClearedRatio: 1,
      isVictory: true,
    },
    wallet,
    () => 0.999 // Unlucky roll, but pity must trigger
  );

  assert.equal(res.pityTriggered, true);
  assert.equal(res.goldMedalsEarned, 1);
  assert.equal(res.updatedPity, 0);
});

test('💎 [Talent Economy] Respec refunds 100% Dust and Medals with Zeny fee', () => {
  const wallet: TalentWallet = {
    zeny: 6000,
    runeDust: 100,
    goldMedals: 1,
    hellMedalPity: 0,
    firstClearFlags: [],
  };

  const res = respecTalentNodes(
    ['minor', 'notable', 'keystone'],
    wallet,
    5000
  );

  assert.equal(res.ok, true);
  assert.equal(res.refundedDust, 150 + 500 + 1500); // 2150
  assert.equal(res.refundedMedals, 0 + 2 + 8); // 10
  assert.equal(wallet.zeny, 1000);
  assert.equal(wallet.runeDust, 2250);
  assert.equal(wallet.goldMedals, 11);

  // Insufficient Zeny fails cleanly
  const failRes = respecTalentNodes(['minor'], wallet, 5000);
  assert.equal(failRes.ok, false);
});

test('🔥 [Biome Hazards] D11 Clockwork Heat Sweet Spot (50-85%) and Overheat (100%)', () => {
  const state = createBiomeCombatState('clockwork_heat', []);
  assert.equal(state.heat, 0);

  // Cast 1: 20 heat (below sweet spot)
  const c1 = onHeroSkillCastBiome(state, 1000);
  assert.equal(state.heat, 20);
  assert.equal(c1.critDmgBonus, 0);

  // Cast 2: 40 heat
  onHeroSkillCastBiome(state, 1000);

  // Cast 3: 60 heat (Sweet Spot: 50% - 85%)
  const c3 = onHeroSkillCastBiome(state, 1000);
  assert.equal(state.heat, 60);
  assert.equal(c3.critDmgBonus, 0.6);
  assert.equal(c3.skillDmgMultiplier, 1.25);
  assert.equal(c3.triggeredOverheat, false);

  // Cast 4: 80 heat (still sweet spot)
  const c4 = onHeroSkillCastBiome(state, 1000);
  assert.equal(c4.critDmgBonus, 0.6);

  // Cast 5: 100 heat -> Overheat explosion!
  const c5 = onHeroSkillCastBiome(state, 1000);
  assert.equal(c5.triggeredOverheat, true);
  assert.equal(c5.selfBurnDamage, 150); // 15% of 1000 HP
  assert.equal(state.overheatedSilenceTurns, 1);
  assert.equal(state.heat, 30); // reset to 30

  // Turn end cools down heat by 15 and reduces silence
  onTurnEndBiome(state);
  assert.equal(state.heat, 15);
  assert.equal(state.overheatedSilenceTurns, 0);
});

test('🌊 [Biome Hazards] D12 Abyssal Pressure reduces direct heal and triggers Shield AoE true damage wave', () => {
  const state = createBiomeCombatState('abyssal_pressure', []);
  const heal = modifyHeroDirectHealBiome(state, 500);
  assert.equal(heal, 250); // 50% cut

  const wave = onHeroShieldOrBlockBiome(state, 200, 1000);
  assert.equal(wave.triggeredWave, true);
  // floor(200 * 1.8 + 1000 * 0.08) = floor(360 + 80) = 440
  assert.equal(wave.aoeTrueDamage, 440);
});

test('✨ [Biome Hazards] D13 Astral Veil 5-layer reduction and Stagger on break', () => {
  const state = createBiomeCombatState('astral_eclipse', ['mob_1']);
  assert.equal(state.monsterAstralLayers['mob_1'], 5);

  // Hit with 5 layers: 5 * 15% = 75% reduction
  const h1 = onMonsterHitBiome(state, 'mob_1', 1000, 1);
  assert.equal(h1.finalDamage, 250);
  assert.equal(h1.remainingLayers, 4);
  assert.equal(h1.isStaggered, false);

  // Break all remaining 4 layers
  const h2 = onMonsterHitBiome(state, 'mob_1', 1000, 4);
  assert.equal(h2.remainingLayers, 0);
  assert.equal(h2.justBroken, true);
  assert.equal(h2.isStaggered, true);
  assert.equal(state.monsterStaggerTurns['mob_1'], 2);

  // Hit while Staggered: +50% damage
  const h3 = onMonsterHitBiome(state, 'mob_1', 1000, 1);
  assert.equal(h3.finalDamage, 1500);

  // End turn 1 of Stagger
  onTurnEndBiome(state);
  assert.equal(state.monsterStaggerTurns['mob_1'], 1);

  // End turn 2 of Stagger -> Stagger ends and 3 layers restored
  onTurnEndBiome(state);
  assert.equal(state.monsterStaggerTurns['mob_1'], 0);
  assert.equal(state.monsterAstralLayers['mob_1'], 3);
});

test('🏰 [Endgame Dungeons] D11–D13 catalog and boss telegraph definitions', () => {
  assert.equal(ENDGAME_DUNGEONS_D11_D13.length, 3);
  const [d11, d12, d13] = ENDGAME_DUNGEONS_D11_D13;

  assert.equal(d11.tier, 11);
  assert.equal(d11.biomeHazard, 'clockwork_heat');
  const d11Boss = d11.monsters.find((m) => m.rank === 'boss');
  assert.ok(d11Boss?.telegraph);
  assert.equal(d11Boss?.telegraph?.counterHint, 'interrupt_stun');

  assert.equal(d12.tier, 12);
  assert.equal(d12.biomeHazard, 'abyssal_pressure');
  const d12Boss = d12.monsters.find((m) => m.rank === 'boss');
  assert.ok(d12Boss?.telegraph);
  assert.equal(d12Boss?.telegraph?.counterHint, 'shield_or_guard');

  assert.equal(d13.tier, 13);
  assert.equal(d13.biomeHazard, 'astral_eclipse');
  const d13Boss = d13.monsters.find((m) => m.rank === 'boss');
  assert.ok(d13Boss?.telegraph);
  assert.equal(d13Boss?.telegraph?.counterHint, 'multi_hit_break');
});

test('🌌 [Endless Rift] Deterministic Sub-seed and Mulberry32 stream reproducibility', () => {
  const seed = getDailyRiftSeed('2026-11-13');
  const catalog = buildRiftMonsterCatalog();

  const floorA = generateRiftFloor(seed, 7, catalog).spec;
  const floorB = generateRiftFloor(seed, 7, catalog).spec;

  assert.deepEqual(floorA, floorB);

  // Sub-seed remains deterministic across purposes
  const combatSubSeed1 = deriveSubSeed(seed, 'combat', 7, 0);
  const combatSubSeed2 = deriveSubSeed(seed, 'combat', 7, 0);
  assert.equal(combatSubSeed1, combatSubSeed2);
});

test('🌌 [Endless Rift] Floor Acceptance Checks test across 500 Seeds', () => {
  const catalog = buildRiftMonsterCatalog();
  const totalSeeds = 500;
  let rejectedTotal = 0;

  for (let s = 1; s <= totalSeeds; s++) {
    const depth = (s % 25) + 1;
    const { spec, rejectedCount } = generateRiftFloor(
      `TEST-SEED-${s}`,
      depth,
      catalog
    );
    rejectedTotal += rejectedCount;

    const check = acceptRiftFloor(spec, catalog);
    assert.equal(check.ok, true, `Seed ${s} must pass acceptance check`);

    // Verify safe start distances
    for (const spawn of spec.spawns) {
      assert.ok(spawn.spawnDistanceTiles >= 6);
    }
  }

  const rejectRatio = rejectedTotal / (totalSeeds + rejectedTotal);
  assert.ok(rejectRatio > 0 && rejectRatio < 0.4, `Reject ratio ${rejectRatio} is within healthy range`);
});

test('🌌 [Endless Rift] Energy Turn Scheduler produces 1 : 2 : 4 action ratio for speed 50 : 100 : 200', () => {
  const actors: ScheduledActor[] = [
    { id: 'slow_50', speed: 50, energy: 0 },
    { id: 'normal_100', speed: 100, energy: 0 },
    { id: 'fast_200', speed: 200, energy: 0 },
  ];

  const counts: Record<string, number> = {
    slow_50: 0,
    normal_100: 0,
    fast_200: 0,
  };

  for (let turn = 0; turn < 70; turn++) {
    const ready = nextReadyActor(actors);
    counts[ready.id] += 1;
  }

  assert.equal(counts.slow_50, 10);
  assert.equal(counts.normal_100, 20);
  assert.equal(counts.fast_200, 40);
});

test('🌌 [Endless Rift] Permadeath Save Split wipes run save and carries 70% dust + 100% medals to profile', () => {
  const runSave: RiftRunSaveState = {
    active: true,
    runSeed: 'PERMADEATH-SEED-1',
    currentDepth: 18,
    heroHp: 0,
    collectedPerks: ['crit_perk_1', 'speed_perk_2'],
    pendingRuneDust: 1000,
    pendingGoldMedals: 3,
  };

  const profileSave: ProfileMetaSaveState = {
    maxRiftDepthReached: 12,
    totalRiftRuns: 4,
    wallet: {
      zeny: 5000,
      runeDust: 0,
      goldMedals: 0,
      hellMedalPity: 0,
      firstClearFlags: [],
    },
  };

  const outcome = finalizeRiftRunOnDeath(runSave, profileSave);

  assert.equal(outcome.savedDust, 700); // 70% of 1000
  assert.equal(outcome.savedMedals, 3);
  assert.equal(outcome.newRecordDepth, true);

  // Run save state must be invalidated
  assert.equal(runSave.active, false);
  assert.equal(runSave.pendingRuneDust, 0);
  assert.equal(runSave.pendingGoldMedals, 0);
  assert.deepEqual(runSave.collectedPerks, []);

  // Profile save state updated
  assert.equal(profileSave.maxRiftDepthReached, 18);
  assert.equal(profileSave.totalRiftRuns, 5);
  assert.equal(profileSave.wallet.runeDust, 700);
  assert.equal(profileSave.wallet.goldMedals, 3);
});

