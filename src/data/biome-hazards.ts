/**
 * Awakened Biome Hazards (D11–D13 Battle Rules)
 * Applicable to BattleScene and Endless Rift modes.
 */

export type BiomeHazardId =
  | 'none'
  | 'clockwork_heat'     // D11: นรกจักรกล (Overheat Gauge)
  | 'abyssal_pressure'   // D12: วิหารใต้สมุทร (Shield/Guard Wave)
  | 'astral_eclipse';    // D13: สุริยุปราคาดารา (4/6-Layer Astral Veil)

/** Tunable hazard constants (live-config compatible plain object). */
export const HAZARD_TUNING = {
  clockwork_heat: {
    heatPerSkill: 20,
    coolPerTurn: 15,
    sweetMin: 50,
    sweetMax: 85,
    sweetCritDmg: 0.35,
    sweetSkillMul: 1.2,
    overheatAt: 100,
    resetHeat: 30,
    selfBurnPct: 0.15,
    silenceTurns: 1,
  },
  abyssal_pressure: {
    healMul: 0.7,
    waveDefMul: 1.2,
    waveHpPct: 0.05,
    maxWavesPerTurn: 1,
  },
  astral_eclipse: {
    normalLayers: 4,
    bossLayers: 6,
    drPerLayer: 0.12,
    drCap: 0.60,
    staggerTurns: 2,
    staggerDmgMul: 1.4,
    regenLayers: 3,
  },
};

export interface BiomeCombatState {
  hazard: BiomeHazardId;
  /** D11: ค่าความร้อนสะสม 0 - 100 */
  heat: number;
  /** D11: จำนวนเทิร์นที่ติดสถานะ Overheat Silence */
  overheatedSilenceTurns: number;
  /** D12: ปล่อยคลื่นแรงดันไปแล้วในเทิร์นนี้ (จำกัดต่อเทิร์นฮีโร่) */
  pressureWaveUsedThisTurn?: boolean;
  /** D13: จำนวนชั้นเกราะ Astral ของมอนสเตอร์แต่ละตัว (key = monsterInstanceId) */
  monsterAstralLayers: Record<string, number>;
  /** D13: จำนวนเทิร์นที่มอนสเตอร์ติดสถานะ Staggered รับดาเมจแรงขึ้น */
  monsterStaggerTurns: Record<string, number>;
}

/**
 * สร้างสถานะเริ่มต้นของสนามรบเมื่อเริ่มด่านหรือเริ่มชั้นใหม่ใน Rift
 */
export function createBiomeCombatState(
  hazard: BiomeHazardId,
  monsterInstanceIds: string[],
  bossIds?: ReadonlySet<string>
): BiomeCombatState {
  const monsterAstralLayers: Record<string, number> = {};
  const monsterStaggerTurns: Record<string, number> = {};
  const eclipse = HAZARD_TUNING.astral_eclipse;

  for (const id of monsterInstanceIds) {
    monsterAstralLayers[id] = hazard === 'astral_eclipse'
      ? (bossIds?.has(id) ? eclipse.bossLayers : eclipse.normalLayers)
      : 0;
    monsterStaggerTurns[id] = 0;
  }

  return {
    hazard,
    heat: 0,
    overheatedSilenceTurns: 0,
    pressureWaveUsedThisTurn: false,
    monsterAstralLayers,
    monsterStaggerTurns,
  };
}

/**
 * [D11: Clockwork Purgatory] เรียกเมื่อผู้เล่นกดใช้สกิล
 * - เพิ่มความร้อน (+heatPerSkill)
 * - หากอยู่ในช่วง Sweet Spot (sweetMin..sweetMax) รับโบนัส Crit DMG และ Skill DMG
 * - หากความร้อนแตะ overheatAt จะระเบิดตัวเอง เสีย % MaxHP และติดใบ้
 */
export function onHeroSkillCastBiome(
  state: BiomeCombatState,
  heroMaxHp: number
): {
  critDmgBonus: number;
  skillDmgMultiplier: number;
  selfBurnDamage: number;
  triggeredOverheat: boolean;
} {
  if (state.hazard !== 'clockwork_heat') {
    return {
      critDmgBonus: 0,
      skillDmgMultiplier: 1.0,
      selfBurnDamage: 0,
      triggeredOverheat: false,
    };
  }

  const cfg = HAZARD_TUNING.clockwork_heat;
  state.heat = Math.min(cfg.overheatAt, state.heat + cfg.heatPerSkill);

  if (state.heat >= cfg.overheatAt) {
    state.heat = cfg.resetHeat;
    state.overheatedSilenceTurns = cfg.silenceTurns;
    return {
      critDmgBonus: 0,
      skillDmgMultiplier: 1.0,
      selfBurnDamage: Math.floor(heroMaxHp * cfg.selfBurnPct),
      triggeredOverheat: true,
    };
  }

  if (state.heat >= cfg.sweetMin && state.heat <= cfg.sweetMax) {
    return {
      critDmgBonus: cfg.sweetCritDmg,
      skillDmgMultiplier: cfg.sweetSkillMul,
      selfBurnDamage: 0,
      triggeredOverheat: false,
    };
  }

  return {
    critDmgBonus: 0,
    skillDmgMultiplier: 1.0,
    selfBurnDamage: 0,
    triggeredOverheat: false,
  };
}

/**
 * [D12: Abyssal Sanctuary] ปรับลดค่าฮีลโดยตรงลงตาม healMul แต่ส่งเสริมการสร้างเกราะ/ตั้งโล่
 */
export function modifyHeroDirectHealBiome(
  state: BiomeCombatState,
  rawHealAmount: number
): number {
  if (state.hazard === 'abyssal_pressure') {
    return Math.floor(rawHealAmount * HAZARD_TUNING.abyssal_pressure.healMul);
  }
  return rawHealAmount;
}

/**
 * [D12: Abyssal Sanctuary] เรียกเมื่อผู้เล่นสร้าง Shield, กด Guard หรือติด Block/Counter สำเร็จ
 * จะปล่อยคลื่นน้ำแรงดันสูงทำ True Damage ใส่ศัตรูทุกตัวในสนาม (จำกัดตาม maxWavesPerTurn ต่อเทิร์น)
 */
export function onHeroShieldOrBlockBiome(
  state: BiomeCombatState,
  heroDef: number,
  heroMaxHp: number
): { aoeTrueDamage: number; triggeredWave: boolean } {
  const cfg = HAZARD_TUNING.abyssal_pressure;
  if (state.hazard !== 'abyssal_pressure' || cfg.maxWavesPerTurn <= 0 || state.pressureWaveUsedThisTurn) {
    return { aoeTrueDamage: 0, triggeredWave: false };
  }

  state.pressureWaveUsedThisTurn = true;
  const aoeTrueDamage = Math.floor(heroDef * cfg.waveDefMul + heroMaxHp * cfg.waveHpPct);
  return {
    aoeTrueDamage: Math.max(1, aoeTrueDamage),
    triggeredWave: true,
  };
}

/**
 * [D13: Astral Eclipse] เรียกเมื่อมอนสเตอร์ได้รับดาเมจ 1 ฮิต (รวมถึงฮิตจากลูกน้องและ DoT)
 * - ลอกเกราะ Astral ออกทีละ hitCount ชั้น (ลดดาเมจตาม drPerLayer สูงสุด drCap)
 * - เมื่อเกราะแตกเป็น 0 จะติด Staggered นาน staggerTurns เทิร์น (รับดาเมจคูณ staggerDmgMul)
 */
export function onMonsterHitBiome(
  state: BiomeCombatState,
  monsterId: string,
  rawDamage: number,
  hitCount = 1
): {
  finalDamage: number;
  remainingLayers: number;
  isStaggered: boolean;
  justBroken: boolean;
} {
  if (state.hazard !== 'astral_eclipse') {
    return {
      finalDamage: rawDamage,
      remainingLayers: 0,
      isStaggered: false,
      justBroken: false,
    };
  }

  const cfg = HAZARD_TUNING.astral_eclipse;
  const currentStagger = state.monsterStaggerTurns[monsterId] ?? 0;
  if (currentStagger > 0) {
    return {
      finalDamage: Math.floor(rawDamage * cfg.staggerDmgMul),
      remainingLayers: 0,
      isStaggered: true,
      justBroken: false,
    };
  }

  const currentLayers = state.monsterAstralLayers[monsterId] ?? 0;
  const dmgReduction = Math.min(cfg.drCap, currentLayers * cfg.drPerLayer);
  const finalDamage = Math.max(1, Math.floor(rawDamage * (1 - dmgReduction)));

  const nextLayers = Math.max(0, currentLayers - Math.max(1, hitCount));
  state.monsterAstralLayers[monsterId] = nextLayers;

  let justBroken = false;
  if (currentLayers > 0 && nextLayers === 0) {
    state.monsterStaggerTurns[monsterId] = cfg.staggerTurns;
    justBroken = true;
  }

  return {
    finalDamage,
    remainingLayers: nextLayers,
    isStaggered: nextLayers === 0,
    justBroken,
  };
}

/**
 * อัปเดตสถานะสนามรบเมื่อจบเทิร์น
 */
export function onTurnEndBiome(state: BiomeCombatState): void {
  if (state.hazard === 'clockwork_heat') {
    state.heat = Math.max(0, state.heat - HAZARD_TUNING.clockwork_heat.coolPerTurn);
    if (state.overheatedSilenceTurns > 0) {
      state.overheatedSilenceTurns -= 1;
    }
  }

  if (state.hazard === 'abyssal_pressure') {
    state.pressureWaveUsedThisTurn = false;
  }

  if (state.hazard === 'astral_eclipse') {
    for (const monsterId of Object.keys(state.monsterStaggerTurns)) {
      const turns = state.monsterStaggerTurns[monsterId];
      if (turns > 0) {
        state.monsterStaggerTurns[monsterId] = turns - 1;
        if (state.monsterStaggerTurns[monsterId] === 0) {
          state.monsterAstralLayers[monsterId] = HAZARD_TUNING.astral_eclipse.regenLayers;
        }
      }
    }
  }
}
