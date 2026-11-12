/**
 * Awakened Biome Hazards (D11–D13 Battle Rules)
 * Applicable to BattleScene and Endless Rift modes.
 */

export type BiomeHazardId =
  | 'none'
  | 'clockwork_heat'     // D11: นรกจักรกล (Overheat Gauge)
  | 'abyssal_pressure'   // D12: วิหารใต้สมุทร (Shield/Guard Wave)
  | 'astral_eclipse';    // D13: สุริยุปราคาดารา (5-Layer Astral Veil)

export interface BiomeCombatState {
  hazard: BiomeHazardId;
  /** D11: ค่าความร้อนสะสม 0 - 100 */
  heat: number;
  /** D11: จำนวนเทิร์นที่ติดสถานะ Overheat Silence */
  overheatedSilenceTurns: number;
  /** D13: จำนวนชั้นเกราะ Astral ของมอนสเตอร์แต่ละตัว (key = monsterInstanceId) */
  monsterAstralLayers: Record<string, number>;
  /** D13: จำนวนเทิร์นที่มอนสเตอร์ติดสถานะ Staggered รับดาเมจแรงขึ้น +50% */
  monsterStaggerTurns: Record<string, number>;
}

/**
 * สร้างสถานะเริ่มต้นของสนามรบเมื่อเริ่มด่านหรือเริ่มชั้นใหม่ใน Rift
 */
export function createBiomeCombatState(
  hazard: BiomeHazardId,
  monsterInstanceIds: string[]
): BiomeCombatState {
  const monsterAstralLayers: Record<string, number> = {};
  const monsterStaggerTurns: Record<string, number> = {};

  for (const id of monsterInstanceIds) {
    monsterAstralLayers[id] = hazard === 'astral_eclipse' ? 5 : 0;
    monsterStaggerTurns[id] = 0;
  }

  return {
    hazard,
    heat: 0,
    overheatedSilenceTurns: 0,
    monsterAstralLayers,
    monsterStaggerTurns,
  };
}

/**
 * [D11: Clockwork Purgatory] เรียกเมื่อผู้เล่นกดใช้สกิล
 * - เพิ่มความร้อน +20%
 * - หากอยู่ในช่วง Sweet Spot (50% - 85%) รับโบนัส Crit DMG +60% และ Skill DMG +25%
 * - หากความร้อนแตะ 100% จะระเบิดตัวเอง เสีย 15% MaxHP และติดใบ้ 1 เทิร์น
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

  state.heat = Math.min(100, state.heat + 20);

  if (state.heat >= 100) {
    state.heat = 30; // รีเซ็ตลงมาที่ 30% หลังระเบิดระบายความร้อน
    state.overheatedSilenceTurns = 1;
    return {
      critDmgBonus: 0,
      skillDmgMultiplier: 1.0,
      selfBurnDamage: Math.floor(heroMaxHp * 0.15),
      triggeredOverheat: true,
    };
  }

  // Sweet Spot: 50% ถึง 85%
  if (state.heat >= 50 && state.heat <= 85) {
    return {
      critDmgBonus: 0.6,
      skillDmgMultiplier: 1.25,
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
 * [D12: Abyssal Sanctuary] ปรับลดค่าฮีลโดยตรงลง 50% แต่ส่งเสริมการสร้างเกราะ/ตั้งโล่
 */
export function modifyHeroDirectHealBiome(
  state: BiomeCombatState,
  rawHealAmount: number
): number {
  if (state.hazard === 'abyssal_pressure') {
    return Math.floor(rawHealAmount * 0.5);
  }
  return rawHealAmount;
}

/**
 * [D12: Abyssal Sanctuary] เรียกเมื่อผู้เล่นสร้าง Shield, กด Guard หรือติด Block/Counter สำเร็จ
 * จะปล่อยคลื่นน้ำแรงดันสูงทำ True Damage ใส่ศัตรูทุกตัวในสนาม
 */
export function onHeroShieldOrBlockBiome(
  state: BiomeCombatState,
  heroDef: number,
  heroMaxHp: number
): { aoeTrueDamage: number; triggeredWave: boolean } {
  if (state.hazard !== 'abyssal_pressure') {
    return { aoeTrueDamage: 0, triggeredWave: false };
  }

  const aoeTrueDamage = Math.floor(heroDef * 1.8 + heroMaxHp * 0.08);
  return {
    aoeTrueDamage: Math.max(1, aoeTrueDamage),
    triggeredWave: true,
  };
}

/**
 * [D13: Astral Eclipse] เรียกเมื่อมอนสเตอร์ได้รับดาเมจ 1 ฮิต (รวมถึงฮิตจากลูกน้องและ DoT)
 * - ลอกเกราะ Astral ออกทีละ 1 ชั้น (แต่ละชั้นลดดาเมจ 15%)
 * - เมื่อเกราะแตกเป็น 0 จะติด Staggered นาน 2 เทิร์น (รับดาเมจแรงขึ้น +50%)
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

  const currentStagger = state.monsterStaggerTurns[monsterId] ?? 0;
  if (currentStagger > 0) {
    return {
      finalDamage: Math.floor(rawDamage * 1.5),
      remainingLayers: 0,
      isStaggered: true,
      justBroken: false,
    };
  }

  const currentLayers = state.monsterAstralLayers[monsterId] ?? 0;
  const dmgReduction = Math.min(0.75, currentLayers * 0.15);
  const finalDamage = Math.max(1, Math.floor(rawDamage * (1 - dmgReduction)));

  const nextLayers = Math.max(0, currentLayers - Math.max(1, hitCount));
  state.monsterAstralLayers[monsterId] = nextLayers;

  let justBroken = false;
  if (currentLayers > 0 && nextLayers === 0) {
    state.monsterStaggerTurns[monsterId] = 2;
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
    state.heat = Math.max(0, state.heat - 15);
    if (state.overheatedSilenceTurns > 0) {
      state.overheatedSilenceTurns -= 1;
    }
  }

  if (state.hazard === 'astral_eclipse') {
    for (const monsterId of Object.keys(state.monsterStaggerTurns)) {
      const turns = state.monsterStaggerTurns[monsterId];
      if (turns > 0) {
        state.monsterStaggerTurns[monsterId] = turns - 1;
        // เมื่อหมดเวลา Stagger ให้ฟื้นเกราะกลับมา 3 ชั้น
        if (state.monsterStaggerTurns[monsterId] === 0) {
          state.monsterAstralLayers[monsterId] = 3;
        }
      }
    }
  }
}

