/**
 * Endgame Dungeons D11–D13 Catalog & Boss Telegraphs
 * For Class 2 Awakened / Class 3 progression.
 */

import type { BiomeHazardId } from '../biome-hazards';

export interface BossTelegraphSpec {
  skillId: string;
  skillName: string;
  warningText: string;
  counterHint: 'interrupt_stun' | 'shield_or_guard' | 'multi_hit_break';
  damageMultiplier: number;
}

export interface EndgameMonsterSpec {
  id: string;
  name: string;
  rank: 'normal' | 'elite' | 'miniboss' | 'boss';
  threatCost: number;
  minDepth: number;
  hp: number;
  atk: number;
  def: number;
  speed: 50 | 100 | 200; // 50=slow, 100=normal, 200=fast (Energy Scheduler)
  firstTurnLethalBurst?: boolean;
  telegraph?: BossTelegraphSpec;
}

export interface EndgameDungeonDef {
  id: string;
  tier: number;
  name: string;
  thaiTitle: string;
  recommendedAwakenedLevel: number;
  biomeHazard: BiomeHazardId;
  favoredClasses: string[];
  monsters: EndgameMonsterSpec[];
}

export const ENDGAME_DUNGEONS_D11_D13: EndgameDungeonDef[] = [
  {
    id: 'd11_clockwork_purgatory',
    tier: 11,
    name: 'Clockwork Purgatory',
    thaiTitle: 'D11: นรกจักรกลนิรันดร์',
    recommendedAwakenedLevel: 75,
    biomeHazard: 'clockwork_heat',
    favoredClasses: ['Berserker', 'Monk', 'Champion', 'Wizard'],
    monsters: [
      {
        id: 'd11_clockwork_sentinel',
        name: 'Clockwork Sentinel',
        rank: 'normal',
        threatCost: 4,
        minDepth: 1,
        hp: 18500,
        atk: 620,
        def: 310,
        speed: 100,
      },
      {
        id: 'd11_steam_flayer',
        name: 'Steam Flayer',
        rank: 'elite',
        threatCost: 7,
        minDepth: 2,
        hp: 26000,
        atk: 790,
        def: 260,
        speed: 200,
      },
      {
        id: 'd11_overdrive_automaton',
        name: 'Overdrive Automaton',
        rank: 'miniboss',
        threatCost: 12,
        minDepth: 4,
        hp: 58000,
        atk: 1050,
        def: 450,
        speed: 100,
        telegraph: {
          skillId: 'molten_discharge',
          skillName: 'Molten Discharge',
          warningText: 'กำลังอัดแรงดันไอน้ำร้อนจัด! (ขัดจังหวะด้วย Stun หรือเบิร์สให้เกราะแตก)',
          counterHint: 'interrupt_stun',
          damageMultiplier: 2.4,
        },
      },
      {
        id: 'd11_chronos_gear_titan',
        name: 'Chronos Gear-Titan',
        rank: 'boss',
        threatCost: 25,
        minDepth: 5,
        hp: 145000,
        atk: 1420,
        def: 620,
        speed: 100,
        telegraph: {
          skillId: 'doomsday_pendulum',
          skillName: 'Doomsday Pendulum',
          warningText: 'ฟันเฟืองยักษ์กำลังหมุนย้อนเวลา! เลี้ยงเกจ Heat 50-85% เพื่อตีเจาะเกราะ!',
          counterHint: 'interrupt_stun',
          damageMultiplier: 3.0,
        },
      },
    ],
  },
  {
    id: 'd12_abyssal_sanctuary',
    tier: 12,
    name: 'Abyssal Sanctuary',
    thaiTitle: 'D12: วิหารก้นสมุทรทมิฬ',
    recommendedAwakenedLevel: 85,
    biomeHazard: 'abyssal_pressure',
    favoredClasses: ['Crusader', 'Paladin', 'Knight', 'Lord Knight', 'Cleric'],
    monsters: [
      {
        id: 'd12_abyss_siren',
        name: 'Abyssal Siren',
        rank: 'normal',
        threatCost: 5,
        minDepth: 3,
        hp: 22000,
        atk: 710,
        def: 290,
        speed: 100,
      },
      {
        id: 'd12_trench_crusher',
        name: 'Trench Crusher',
        rank: 'elite',
        threatCost: 8,
        minDepth: 5,
        hp: 38000,
        atk: 940,
        def: 520,
        speed: 50,
      },
      {
        id: 'd12_coral_jaeger',
        name: 'Abyssal Coral Jaeger',
        rank: 'miniboss',
        threatCost: 14,
        minDepth: 7,
        hp: 76000,
        atk: 1220,
        def: 590,
        speed: 100,
        telegraph: {
          skillId: 'hydro_lance',
          skillName: 'Hydro Piercing Lance',
          warningText: 'กำลังควบแน่นหอกน้ำแรงดันสูง! ตั้ง Shield หรือ Guard เพื่อสะท้อนคลื่นน้ำ!',
          counterHint: 'shield_or_guard',
          damageMultiplier: 2.5,
        },
      },
      {
        id: 'd12_leviathan_of_the_deep',
        name: 'Leviathan of the Deep',
        rank: 'boss',
        threatCost: 30,
        minDepth: 10,
        hp: 195000,
        atk: 1680,
        def: 740,
        speed: 100,
        telegraph: {
          skillId: 'abyssal_maelstrom',
          skillName: 'Abyssal Maelstrom',
          warningText: 'น้ำวนยักษ์กำลังก่อตัว! หากไม่มีสถานะ Shield/Guard จะรับดาเมจทะลุเกราะ 200%!',
          counterHint: 'shield_or_guard',
          damageMultiplier: 3.2,
        },
      },
    ],
  },
  {
    id: 'd13_astral_eclipse',
    tier: 13,
    name: 'Astral Eclipse',
    thaiTitle: 'D13: สุริยุปราคาดาราดับ',
    recommendedAwakenedLevel: 95,
    biomeHazard: 'astral_eclipse',
    favoredClasses: ['Rogue', 'Beastmaster', 'Innovator', 'Mobster', 'Sage'],
    monsters: [
      {
        id: 'd13_eclipse_wraith',
        name: 'Eclipse Wraith',
        rank: 'normal',
        threatCost: 6,
        minDepth: 6,
        hp: 27500,
        atk: 860,
        def: 350,
        speed: 200,
      },
      {
        id: 'd13_void_astrologer',
        name: 'Void Astrologer',
        rank: 'elite',
        threatCost: 9,
        minDepth: 8,
        hp: 44000,
        atk: 1090,
        def: 410,
        speed: 100,
      },
      {
        id: 'd13_umbra_valkyrie',
        name: 'Umbra Valkyrie',
        rank: 'miniboss',
        threatCost: 16,
        minDepth: 11,
        hp: 98000,
        atk: 1450,
        def: 640,
        speed: 200,
        telegraph: {
          skillId: 'starfall_volley',
          skillName: 'Starfall Volley',
          warningText: 'กำลังกางม่านดารา 5 ชั้น! รัวโจมตีหลายฮิตหรือใช้ลูกน้องช่วยตีให้เกราะแตก!',
          counterHint: 'multi_hit_break',
          damageMultiplier: 2.6,
        },
      },
      {
        id: 'd13_eclipsed_seraph',
        name: 'Eclipsed Seraph',
        rank: 'boss',
        threatCost: 35,
        minDepth: 15,
        hp: 260000,
        atk: 1980,
        def: 880,
        speed: 200,
        telegraph: {
          skillId: 'supernova_collapse',
          skillName: 'Supernova Collapse',
          warningText: 'เซราฟกำลังรวมพลังงานสุริยุปราคา! ทำลาย Astral Veil ทั้ง 5 ชั้นเพื่อสั่ง Stagger ทันที!',
          counterHint: 'multi_hit_break',
          damageMultiplier: 3.5,
        },
      },
    ],
  },
];

