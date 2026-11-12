/**
 * Dual-Resource Talent Economy & Hell Mode Pity System
 * Compatible with Novice to Hero Class 2 Awakened / Class 3 progression.
 */

export type NodeTier = 'minor' | 'notable' | 'keystone';

export interface NodeCostSpec {
  tier: NodeTier;
  runeDustCost: number;
  goldMedalCost: number;
  description: string;
}

/**
 * Talent node cost table (Aesir Monument + Path of Exile style).
 */
export const TALENT_NODE_COSTS: Record<NodeTier, NodeCostSpec> = {
  minor: {
    tier: 'minor',
    runeDustCost: 150,
    goldMedalCost: 0,
    description: 'Small Travel Node: เพิ่มค่า Stat พื้นฐานตามเส้นทางเดิน',
  },
  notable: {
    tier: 'notable',
    runeDustCost: 500,
    goldMedalCost: 2,
    description: 'Notable Rune Node: ดัดแปลงการทำงานของสกิลประจำคลาส (Skill Modifier)',
  },
  keystone: {
    tier: 'keystone',
    runeDustCost: 1500,
    goldMedalCost: 8,
    description: 'Awakened Keystone: เปลี่ยนสมการการเล่นหรือปลดล็อกเมคานิกสูงสุดของ Class 2/3',
  },
};

export interface TalentWallet {
  zeny: number;
  runeDust: number;
  goldMedals: number;
  /** จำนวนครั้งที่เคลียร์โหมด Hell ติดต่อกันแล้วยังไม่ดรอป Gold Medal */
  hellMedalPity: number;
  /** บันทึกด่านและโหมดที่เคยเคลียร์ครั้งแรกไปแล้ว เช่น "d11:normal", "d11:hell" */
  firstClearFlags: string[];
}

export interface DungeonRewardInput {
  dungeonTier: number; // 1 ถึง 13
  mode: 'normal' | 'hard' | 'hell';
  activeMutatorCount: number;
  wavesClearedRatio: number; // 0.0 ถึง 1.0 (กรณีตายกลางทางยังได้ Rune Dust บางส่วน)
  isVictory: boolean;
}

export interface DungeonTalentRewardOutput {
  runeDustEarned: number;
  goldMedalsEarned: number;
  updatedPity: number;
  isFirstClearBonus: boolean;
  pityTriggered: boolean;
}

export const HELL_PITY_THRESHOLD = 3; // พลาดครบ 3 รอบ รอบที่ 4 การันตี 100%

/**
 * คำนวณรางวัล Rune Dust และ Gold Medal หลังจบดันเจี้ยน (หรือตายระหว่างทาง)
 */
export function calcDungeonTalentRewards(
  input: DungeonRewardInput,
  wallet: TalentWallet,
  rng: () => number = Math.random
): DungeonTalentRewardOutput {
  const modeMult =
    input.mode === 'hell' ? 2.2 : input.mode === 'hard' ? 1.45 : 1.0;
  const mutatorMult = 1 + 0.2 * Math.max(0, input.activeMutatorCount);
  const tierFactor = 1 + 0.18 * Math.max(1, input.dungeonTier);

  // Base Dust เติบโตตามระดับดันเจี้ยน
  const baseDust = 20 + input.dungeonTier * 8;
  const rawDust = baseDust * tierFactor * modeMult * mutatorMult;

  // หากแพ้กลางคัน จะได้ Rune Dust ตามสัดส่วน Wave ที่ผ่าน (ขั้นต่ำ 15% ถ้าผ่านอย่างน้อย 1 Wave)
  const completionRatio = input.isVictory
    ? 1.0
    : Math.max(0, Math.min(0.85, input.wavesClearedRatio * 0.75));

  const runeDustEarned = Math.max(
    0,
    Math.floor(rawDust * completionRatio)
  );

  let goldMedalsEarned = 0;
  let updatedPity = wallet.hellMedalPity;
  let isFirstClearBonus = false;
  let pityTriggered = false;

  if (!input.isVictory) {
    return {
      runeDustEarned,
      goldMedalsEarned: 0,
      updatedPity,
      isFirstClearBonus: false,
      pityTriggered: false,
    };
  }

  // 1. เช็กรางวัล First-Clear Milestone
  const clearKey = `d${input.dungeonTier}:${input.mode}`;
  if (!wallet.firstClearFlags.includes(clearKey)) {
    isFirstClearBonus = true;
    goldMedalsEarned += input.mode === 'hell' ? 2 : 1;
  }

  // 2. เช็กการดรอป Gold Medal จากบอสตามโหมด
  if (input.mode === 'hell' && input.dungeonTier >= 6) {
    if (updatedPity >= HELL_PITY_THRESHOLD) {
      // การันตี Pity ทันทีเมื่อพลาดครบ 3 รอบก่อนหน้า
      goldMedalsEarned += 1;
      updatedPity = 0;
      pityTriggered = true;
    } else {
      const baseHellChance = 0.35 + (input.dungeonTier - 6) * 0.05; // D6=35% -> D13=70%
      const mutatorBonus = input.activeMutatorCount * 0.1;
      const finalChance = Math.min(0.9, baseHellChance + mutatorBonus);

      if (rng() < finalChance) {
        goldMedalsEarned += 1;
        updatedPity = 0;
      } else {
        updatedPity += 1;
      }
    }
  } else if (input.dungeonTier >= 6) {
    // Normal / Hard ตั้งแต่ D6 ขึ้นไป มีโอกาสดรอปจากบอส
    const baseLateChance =
      (0.1 + (input.dungeonTier - 6) * 0.025) *
      (input.mode === 'hard' ? 1.35 : 1.0);
    if (rng() < Math.min(0.35, baseLateChance)) {
      goldMedalsEarned += 1;
    }
  }

  return {
    runeDustEarned,
    goldMedalsEarned,
    updatedPity,
    isFirstClearBonus,
    pityTriggered,
  };
}

/**
 * ระบบรีเซ็ตกระดาน Talent (Respec) คืนแต้ม Rune Dust และ Gold Medal ครบ 100%
 */
export function respecTalentNodes(
  unlockedTiers: NodeTier[],
  wallet: TalentWallet,
  zenyFee = 5000
): { ok: boolean; refundedDust: number; refundedMedals: number; reason?: string } {
  if (wallet.zeny < zenyFee) {
    return {
      ok: false,
      refundedDust: 0,
      refundedMedals: 0,
      reason: 'Zeny ไม่เพียงพอสำหรับการรีเซ็ตกระดาน Talent',
    };
  }

  let refundedDust = 0;
  let refundedMedals = 0;
  for (const tier of unlockedTiers) {
    const spec = TALENT_NODE_COSTS[tier];
    refundedDust += spec.runeDustCost;
    refundedMedals += spec.goldMedalCost;
  }

  wallet.zeny -= zenyFee;
  wallet.runeDust += refundedDust;
  wallet.goldMedals += refundedMedals;

  return { ok: true, refundedDust, refundedMedals };
}

