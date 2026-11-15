/**
 * Endless Rift Engine ("The Void Labyrinth" - Roguelike Architecture)
 * Deterministic Sub-seeds, Energy Turn Scheduler, Spawn Budget,
 * Floor Acceptance Checks, and Run vs Profile Save Split.
 */

import type { BiomeHazardId } from '../data/biome-hazards';
import {
  type EndgameMonsterSpec,
  ENDGAME_DUNGEONS_D11_D13,
} from '../data/dungeons/endgame-dungeons';
import { DUNGEONS, MONSTERS, type MonsterKind } from '../data/game-data';
import type { TalentWallet } from '../data/meta/talent-economy';
import { statMonster } from '../data/mon-stats';
import type { RiftMutatorId } from '../data/mutators';
import {
  RIFT_BIOMES,
  RIFT_BOONS,
  RIFT_BOON_IDS,
  RIFT_BRANCHES,
  RIFT_TUNING,
  type RiftActiveRunState,
  type RiftBoonDef,
  type RiftBranchDef,
  type RiftBranchId,
} from '../data/rift';

export interface RiftFloorSpec {
  depth: number;
  attemptIndex: number;
  floorSubSeed: number;
  biomeHazard: BiomeHazardId;
  mutatorIds: string[];
  spawns: Array<{
    monsterId: string;
    spawnDistanceTiles: number;
    isOutOfDepth: boolean;
  }>;
  isBossFloor: boolean;
  branchChoices: Array<'elite_hunt' | 'cursed_altar' | 'safe_sanctuary'>;
}

/**
 * 1. Deterministic Sub-seed Hash (FNV-1a 32-bit)
 * การันตีว่า Seed เดียวกันจะได้ตัวเลขเดิมเสมอทุกเครื่อง ไม่พึ่งพา random hash ของระบบ
 */
export function deriveSubSeed(
  runSeed: string,
  purpose: string,
  depth = 0,
  attempt = 0
): number {
  const key = `${runSeed}::${purpose}::${depth}::${attempt}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * สร้าง Seed ประจำวัน (UTC Daily Run Seed) เพื่อให้ผู้เล่นทุกคนแข่งในด่านเดียวกัน
 */
export function getDailyRiftSeed(utcDateString: string): string {
  return `DAILY-RIFT-${utcDateString.trim()}`;
}

/**
 * PRNG แบบ Mulberry32 ที่แยก Stream อิสระต่อกัน
 */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ALL_RIFT_MUTATORS = [
  'frenzy_aura',
  'thorns_carapace',
  'no_heal',
  'blood_drain',
  'silence_aura',
  'skill_only_damage',
  'empower_elites',
  'volatile_death',
] as const;

export const INCOMPATIBLE_MUTATOR_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['no_heal', 'blood_drain'],
  ['silence_aura', 'skill_only_damage'],
];

/**
 * 2. Floor Acceptance Checks
 * ตรวจสอบว่าชั้นที่สุ่มออกมาไม่เป็นด่านตันหรือฆ่าผู้เล่นตั้งแต่เทิร์นแรก (No Cheap Deaths)
 */
export function acceptRiftFloor(
  spec: RiftFloorSpec,
  monsterLookup: ReadonlyMap<string, EndgameMonsterSpec>
): { ok: boolean; reason?: string } {
  if (spec.spawns.length === 0) {
    return { ok: false, reason: 'empty_spawns' };
  }

  // กฎ Safe Start: ห้ามมีมอนสเตอร์เกิดใกล้จุดเริ่มต้นเกิน minSafeTiles ช่อง และห้ามมีตัวใช้ท่าสังหารทันทีในเทิร์นที่ 1
  for (const spawn of spec.spawns) {
    if (spawn.spawnDistanceTiles < RIFT_TUNING.minSafeTiles) {
      return { ok: false, reason: 'spawn_too_close_to_start' };
    }
    const mon = monsterLookup.get(spawn.monsterId);
    if (!mon) {
      return { ok: false, reason: 'unknown_monster_id' };
    }
    if (mon.firstTurnLethalBurst) {
      return { ok: false, reason: 'first_turn_lethal_burst' };
    }
  }

  // เช็กว่าไม่มีคู่ Mutator ที่ขัดแย้งกันเอง
  for (const [mA, mB] of INCOMPATIBLE_MUTATOR_PAIRS) {
    if (spec.mutatorIds.includes(mA) && spec.mutatorIds.includes(mB)) {
      return { ok: false, reason: `incompatible_mutators:${mA}+${mB}` };
    }
  }

  // ห้ามสุ่มเจอ no_heal ในด่าน Abyssal Pressure ที่ลดฮีลอยู่แล้ว
  if (
    spec.biomeHazard === 'abyssal_pressure' &&
    spec.mutatorIds.includes('no_heal')
  ) {
    return { ok: false, reason: 'abyssal_pressure_with_no_heal' };
  }

  return { ok: true };
}

/**
 * รวมรายชื่อมอนสเตอร์จาก D11–D13 สำหรับใช้เป็น Pool ในโหมด Endless Rift
 */
export function buildRiftMonsterCatalog(): Map<string, EndgameMonsterSpec> {
  const map = new Map<string, EndgameMonsterSpec>();
  for (const dungeon of ENDGAME_DUNGEONS_D11_D13) {
    for (const mon of dungeon.monsters) {
      map.set(mon.id, mon);
    }
  }
  return map;
}

/**
 * รวมมอนสเตอร์จาก DUNGEONS D6+ จริงในเกม (และ D11-D13 เมื่อถูกผสานเข้า DUNGEONS)
 * พร้อม fallback รวมกับ ENDGAME_DUNGEONS_D11_D13 สำหรับเชื่อมต่อกับ BattleScene
 */
export function buildRiftMonsterCatalogFromPacks(options?: {
  minDungeonNum?: number;
  includeEndgameD11ToD13?: boolean;
}): Map<string, EndgameMonsterSpec> {
  const minNum = options?.minDungeonNum ?? RIFT_TUNING.packMinDungeonNum;
  const map = new Map<string, EndgameMonsterSpec>();

  for (const dg of DUNGEONS) {
    if (!dg.level) continue;
    const dNum = Number(dg.id.replace(/\D+/g, ''));
    if (!Number.isFinite(dNum) || dNum < minNum) continue;

    const dungeonOffset = Math.max(0, dNum - minNum) * RIFT_TUNING.packDepthStepPerDungeon;

    for (const room of dg.rooms) {
      const kinds: MonsterKind[] = [
        ...room.spawn.map(([k]) => k),
        ...(room.miniPool ?? []),
      ];
      const lv = room.lv ?? dg.level[1];

      for (const kind of kinds) {
        const base = MONSTERS[kind];
        if (!base) continue;

        const rank: EndgameMonsterSpec['rank'] =
          room.boss || base.ai === 'boss'
            ? 'boss'
            : room.mini || base.mini
              ? 'miniboss'
              : base.ai === 'dasher'
                ? 'elite'
                : 'normal';

        const st = statMonster(base, lv);
        const turnSpeed = st.speed ?? st.moveSpeed;
        const speed: 50 | 100 | 200 =
          turnSpeed >= RIFT_TUNING.fastSpeedThreshold
            ? 200
            : turnSpeed <= RIFT_TUNING.slowSpeedThreshold
              ? 50
              : 100;

        const entry: EndgameMonsterSpec = {
          id: kind,
          name: base.name,
          rank,
          threatCost: RIFT_TUNING.rankThreatCost[rank],
          minDepth: 1 + dungeonOffset + RIFT_TUNING.rankMinDepthOffset[rank],
          hp: Math.max(1, Math.round(st.hp)),
          atk: Math.max(1, Math.round(Math.max(st.dmg, st.matk ?? 0))),
          def: Math.max(0, Math.round(st.def ?? 0)),
          speed,
        };

        const prev = map.get(kind);
        if (!prev || (rank === 'boss' && prev.rank !== 'boss')) {
          map.set(kind, entry);
        }
      }
    }
  }

  if (options?.includeEndgameD11ToD13 !== false) {
    for (const dungeon of ENDGAME_DUNGEONS_D11_D13) {
      for (const mon of dungeon.monsters) {
        if (!map.has(mon.id)) {
          map.set(mon.id, mon);
        }
      }
    }
  }

  return map;
}

/**
 * 3. สร้างข้อมูลชั้นของ Endless Rift ด้วย Threat Budget + Out-of-depth Spikes
 */
export function generateRiftFloor(
  runSeed: string,
  depth: number,
  catalog: ReadonlyMap<string, EndgameMonsterSpec> = buildRiftMonsterCatalog(),
  branchId?: RiftBranchId
): { spec: RiftFloorSpec; rejectedCount: number } {
  const allMonsters = Array.from(catalog.values());
  const normalAndElites = allMonsters.filter(
    (m) => m.rank === 'normal' || m.rank === 'elite' || m.rank === 'miniboss'
  );
  const bosses = allMonsters.filter((m) => m.rank === 'boss');
  const isBossFloor = depth % RIFT_TUNING.bossEvery === 0;
  const threatMul = branchId ? RIFT_BRANCHES[branchId].threatMul : 1;

  const biomes: BiomeHazardId[] = [...RIFT_BIOMES];

  let rejectedCount = 0;

  for (let attempt = 0; attempt < RIFT_TUNING.maxAttempts; attempt++) {
    const floorSubSeed = deriveSubSeed(runSeed, 'rift_floor', depth, attempt);
    const rng = createSeededRng(floorSubSeed);

    // สุ่ม Biome
    const biomeHazard = biomes[Math.floor(rng() * biomes.length)];

    // จำนวน Mutator เพิ่มขึ้นทุกๆ mutatorStepDepth ชั้น (สูงสุด maxMutators ชิ้น)
    const mutatorCount = Math.min(
      RIFT_TUNING.maxMutators,
      1 + Math.floor((depth - 1) / RIFT_TUNING.mutatorStepDepth)
    );
    const mutatorIds: string[] = [];
    const poolCopy = [...ALL_RIFT_MUTATORS];
    for (let i = 0; i < mutatorCount && poolCopy.length > 0; i++) {
      const idx = Math.floor(rng() * poolCopy.length);
      mutatorIds.push(poolCopy[idx]);
      poolCopy.splice(idx, 1);
    }

    // คำนวณ Threat Budget ตามความลึกของชั้น
    const baseBudget = RIFT_TUNING.baseBudget + depth * RIFT_TUNING.budgetPerDepth;
    let remainingBudget = branchId
      ? Math.max(RIFT_TUNING.minSpawnCost, Math.round(baseBudget * threatMul))
      : baseBudget;
    const spawns: RiftFloorSpec['spawns'] = [];

    if (isBossFloor && bosses.length > 0) {
      const boss = bosses[Math.floor(rng() * bosses.length)];
      spawns.push({
        monsterId: boss.id,
        spawnDistanceTiles:
          RIFT_TUNING.bossSafeMin + Math.floor(rng() * RIFT_TUNING.bossSafeSpan),
        isOutOfDepth: false,
      });
      remainingBudget = Math.max(0, remainingBudget - boss.threatCost);
    }

    // สุ่มมอนสเตอร์เข้าชั้นตามงบที่เหลือ
    let guard = 0;
    while (remainingBudget >= RIFT_TUNING.minSpawnCost && guard < RIFT_TUNING.maxSpawns) {
      guard++;
      // โอกาสเกิด Out-of-depth spawn
      const isOutOfDepth = rng() < RIFT_TUNING.outOfDepthChance;
      const maxAllowedDepth = isOutOfDepth ? depth + RIFT_TUNING.outOfDepthMax : depth;

      const eligible = normalAndElites.filter(
        (m) => m.minDepth <= maxAllowedDepth && m.threatCost <= remainingBudget
      );
      const fallbackPool =
        eligible.length > 0
          ? eligible
          : normalAndElites.filter((m) => m.threatCost <= remainingBudget);

      if (fallbackPool.length === 0) break;

      const chosen = fallbackPool[Math.floor(rng() * fallbackPool.length)];
      spawns.push({
        monsterId: chosen.id,
        spawnDistanceTiles:
          RIFT_TUNING.minSafeTiles + Math.floor(rng() * RIFT_TUNING.safeSpan),
        isOutOfDepth,
      });
      remainingBudget -= chosen.threatCost;
    }

    const candidate: RiftFloorSpec = {
      depth,
      attemptIndex: attempt,
      floorSubSeed,
      biomeHazard,
      mutatorIds,
      spawns,
      isBossFloor,
      branchChoices: ['elite_hunt', 'cursed_altar', 'safe_sanctuary'],
    };

    const check = acceptRiftFloor(candidate, catalog);
    if (check.ok) {
      return { spec: candidate, rejectedCount };
    }
    rejectedCount++;
  }

  throw new Error(`Failed to generate valid Rift floor at depth ${depth}`);
}

/**
 * 3.5 Roguelike Boon Picker & Branch Transition Helpers
 */
export function pickRiftBoons(
  runSeed: string,
  depth: number,
  ownedBoons: readonly string[],
  count: number = RIFT_TUNING.boonOfferCount
): RiftBoonDef[] {
  const owned = new Set(ownedBoons);
  const rng = createSeededRng(deriveSubSeed(runSeed, 'rift_boon', depth));
  const unownedPool = RIFT_BOON_IDS.filter((id) => !owned.has(id));
  const fallbackPool = RIFT_BOON_IDS.filter((id) => owned.has(id));
  const picked: RiftBoonDef[] = [];

  while (picked.length < count && unownedPool.length > 0) {
    const idx = Math.floor(rng() * unownedPool.length);
    const [id] = unownedPool.splice(idx, 1);
    picked.push(RIFT_BOONS[id]);
  }
  while (picked.length < count && fallbackPool.length > 0) {
    const idx = Math.floor(rng() * fallbackPool.length);
    const [id] = fallbackPool.splice(idx, 1);
    picked.push(RIFT_BOONS[id]);
  }
  return picked;
}

function isMutatorCompatibleWith(
  candidate: string,
  activeIds: readonly string[],
  biomeHazard: BiomeHazardId
): boolean {
  if (biomeHazard === 'abyssal_pressure' && candidate === 'no_heal') return false;
  for (const active of activeIds) {
    if (active === candidate) return false;
    for (const [mA, mB] of INCOMPATIBLE_MUTATOR_PAIRS) {
      if ((mA === candidate && mB === active) || (mB === candidate && mA === active)) {
        return false;
      }
    }
  }
  return true;
}

export function applyRiftBranchChoice(
  runState: RiftActiveRunState,
  branchId: RiftBranchId,
  catalog: ReadonlyMap<string, EndgameMonsterSpec> = buildRiftMonsterCatalog(),
  targetDepth = runState.depth + 1
): {
  branch: RiftBranchDef;
  floor: RiftFloorSpec;
  rejectedCount: number;
  boonChoices: RiftBoonDef[];
  addedCurse?: RiftMutatorId;
  healFrac: number;
  threatMul: number;
  rewardMul: number;
} {
  const branch = RIFT_BRANCHES[branchId];
  runState.lastBranch = branchId;

  const { spec: floor, rejectedCount } = generateRiftFloor(
    runState.seed,
    targetDepth,
    catalog,
    branchId
  );

  let addedCurse: RiftMutatorId | undefined;
  if (branch.addsCurse) {
    const curseRng = createSeededRng(deriveSubSeed(runState.seed, 'rift_curse', targetDepth));
    const activeIds = [...floor.mutatorIds, ...runState.curses];
    const eligibleCurses = ALL_RIFT_MUTATORS.filter((id) =>
      isMutatorCompatibleWith(id, activeIds, floor.biomeHazard)
    );
    if (eligibleCurses.length > 0) {
      addedCurse = eligibleCurses[Math.floor(curseRng() * eligibleCurses.length)];
      runState.curses.push(addedCurse);
    }
  }

  const boonChoices = pickRiftBoons(
    runState.seed,
    targetDepth,
    runState.boons,
    branch.boonChoices
  );

  return {
    branch,
    floor,
    rejectedCount,
    boonChoices,
    addedCurse,
    healFrac: branch.healFrac,
    threatMul: branch.threatMul,
    rewardMul: branch.rewardMul,
  };
}

/**
 * 4. Energy Turn Scheduler (Standard Roguelike Pattern)
 * ให้พลังงานในรอบแยกต่างหาก เพื่อไม่ให้ตัวละครลำดับแรกแย่งเทิร์นตัวอื่นที่ความเร็วเท่ากัน
 */
export interface ScheduledActor {
  id: string;
  speed: 50 | 100 | 200;
  energy: number;
}

export const TURN_ENERGY_COST = RIFT_TUNING.turnEnergyCost;

export function nextReadyActor(
  actors: ScheduledActor[],
  actionCost = TURN_ENERGY_COST
): ScheduledActor {
  if (actors.length === 0) {
    throw new Error('Cannot schedule turn with zero actors');
  }
  while (true) {
    // Pass 1: เสิร์ฟตัวละครที่มีพลังงานพร้อมแล้วตามลำดับเสถียร
    for (const actor of actors) {
      if (actor.energy >= TURN_ENERGY_COST) {
        actor.energy -= actionCost;
        return actor;
      }
    }
    // Pass 2: ยังไม่มีใครพร้อม -> บวกพลังงานให้ทุกคนพร้อมกัน
    for (const actor of actors) {
      actor.energy += actor.speed;
    }
  }
}

/**
 * 5. โครงสร้างแยกเซฟ Run State (ลบเมื่อตาย) vs Profile State (คงอยู่ถาวร)
 */
export interface RiftRunSaveState {
  active: boolean;
  runSeed: string;
  currentDepth: number;
  heroHp: number;
  collectedPerks: string[];
  pendingRuneDust: number;
  pendingGoldMedals: number;
}

export interface ProfileMetaSaveState {
  maxRiftDepthReached: number;
  totalRiftRuns: number;
  wallet: TalentWallet;
}

/**
 * เมื่อตัวละครตายในโหมด Endless Rift:
 * - ล้างข้อมูล RiftRunSaveState ทันที (ป้องกัน Save-scumming)
 * - โอนแต้ม Rune Dust 70% และ Gold Medal ที่เก็บได้จากบอสเข้า Profile ถาวร
 */
export function finalizeRiftRunOnDeath(
  runSave: RiftRunSaveState,
  profileSave: ProfileMetaSaveState
): { savedDust: number; savedMedals: number; newRecordDepth: boolean } {
  const savedDust = Math.floor(runSave.pendingRuneDust * RIFT_TUNING.deathDustKeep);
  const savedMedals = runSave.pendingGoldMedals;
  const newRecordDepth =
    runSave.currentDepth > profileSave.maxRiftDepthReached;

  if (newRecordDepth) {
    profileSave.maxRiftDepthReached = runSave.currentDepth;
  }
  profileSave.totalRiftRuns += 1;
  profileSave.wallet.runeDust += savedDust;
  profileSave.wallet.goldMedals += savedMedals;

  // Invalidate Run Save ทันที
  runSave.active = false;
  runSave.pendingRuneDust = 0;
  runSave.pendingGoldMedals = 0;
  runSave.collectedPerks = [];

  return { savedDust, savedMedals, newRecordDepth };
}

