/**
 * src/data/rift.ts — Void Rift tuning, materials, biomes, branching paths & roguelike boons
 * Data-driven balance table for the Endless Void Rift endgame mode (no magic numbers in engines/scenes).
 */
import type { BiomeHazardId } from './biome-hazards'
import type { Stats } from './stats'

export const RIFT_TUNING = {
  unlock: 'd10',
  baseBudget: 10,
  budgetPerDepth: 4,
  outOfDepthChance: 0.05,
  outOfDepthMax: 3,
  bossEvery: 5,
  minSafeTiles: 6,
  safeSpan: 6,
  bossSafeMin: 8,
  bossSafeSpan: 4,
  maxAttempts: 32,
  minSpawnCost: 4,
  maxSpawns: 12,
  fallKeep: 0.5,
  deathDustKeep: 0.7,
  turnEnergyCost: 100,
  depthHpPer: 0.055,
  depthAtkPer: 0.032,
  depthHitPer: 0.5,
  turnMulPerDepth: 0.012,
  turnMulMax: 1.5,
  matBase: 1,
  matBossEvery: 5,
  zenyBase: 45,
  zenyPerDepth: 14,
  dustBase: 20,
  dustPerDepth: 5,
  dailyGems: 30,
  dailyFortune: 30,
  mutatorStepDepth: 10,
  maxMutators: 3,
  boonOfferCount: 3,
  cursedAltBoons: 4,
  gems: [
    [5, 15],
    [10, 25],
    [20, 40],
    [35, 65],
    [50, 100],
  ] as readonly (readonly [number, number])[],
  rankThreatCost: {
    normal: 2,
    elite: 4,
    miniboss: 7,
    boss: 14,
  } as const,
  rankMinDepthOffset: {
    normal: 0,
    elite: 1,
    miniboss: 2,
    boss: 4,
  } as const,
  // v125 (Q 2026-11-15 "อยากให้มี Monster ตั้งแต่ D1-D13 รวมกันมาเลย"): the catalog takes D1-D13 (was D6+), all from depth 1
  // (was +3 depth per dungeon after D6). Every kind is built at the room Lv in battle (BattleScene endlessLv), so a D1 monster is not weak.
  packMinDungeonNum: 1,
  packMaxDungeonNum: 13,
  packDepthStepPerDungeon: 0,
  fastSpeedThreshold: 120,
  slowSpeedThreshold: 65,
} as const

export const RIFT_MATS = {
  common: 'm_rift',
  boss: 'b_rift',
} as const

export const RIFT_BIOMES: readonly BiomeHazardId[] = [
  'clockwork_heat',
  'abyssal_pressure',
  'astral_eclipse',
] as const

export type RiftBranchId = 'elite_hunt' | 'cursed_altar' | 'safe_sanctuary'

export interface RiftBranchDef {
  id: RiftBranchId
  name: string
  icon: string
  desc: string
  threatMul: number
  rewardMul: number
  boonChoices: number
  addsCurse: boolean
  healFrac: number
}

export const RIFT_BRANCHES: Record<RiftBranchId, RiftBranchDef> = {
  elite_hunt: {
    id: 'elite_hunt',
    name: 'เส้นทางล่าอีลิท',
    icon: '⚔️',
    desc: 'ศัตรูแข็งแกร่งขึ้น (+35% งบภัยคุกคาม) แต่รางวัล +60% และโอกาสเพิ่มดรอปแก่นแท้',
    threatMul: 1.35,
    rewardMul: 1.6,
    boonChoices: RIFT_TUNING.boonOfferCount,
    addsCurse: false,
    healFrac: 0,
  },
  cursed_altar: {
    id: 'cursed_altar',
    name: 'แท่นบูชาต้องสาป',
    icon: '🕯️',
    desc: 'รับคำสาปรอยแยก 1 อย่าง เพื่อแลกพรให้เลือกเพิ่ม +1 ตัวเลือก และรางวัล +45%',
    threatMul: 1.15,
    rewardMul: 1.45,
    boonChoices: RIFT_TUNING.cursedAltBoons,
    addsCurse: true,
    healFrac: 0,
  },
  safe_sanctuary: {
    id: 'safe_sanctuary',
    name: 'เขตสงบในรอยแยก',
    icon: '🌿',
    desc: 'ฟื้น HP 45% ลดภัยคุกคามชั้นถัดไป 15% แต่รางวัลลดลงเล็กน้อย (90%)',
    threatMul: 0.85,
    rewardMul: 0.9,
    boonChoices: RIFT_TUNING.boonOfferCount,
    addsCurse: false,
    healFrac: 0.45,
  },
}

export type RiftBoonId =
  | 'rift_spellblade'
  | 'rift_lightning'
  | 'rift_bloodharvest'
  | 'rift_echo'
  | 'rift_manaoverdrive'
  | 'rift_titanheart'
  | 'rift_voidpen'
  | 'rift_frostguard'
  | 'rift_critstorm'
  | 'rift_burnaura'
  | 'rift_thornsurge'
  | 'rift_sanctum'

export interface RiftBoonEffect {
  kind:
    | 'spellblade'
    | 'chain_lightning'
    | 'blood_harvest'
    | 'echo_cast'
    | 'mana_overdrive'
    | 'titan_heart'
    | 'void_pen'
    | 'frost_guard'
    | 'crit_shred'
    | 'burn_aura'
    | 'thorn_surge'
    | 'sanctum_ward'
  power: number
  secondary?: number
}

export interface RiftBoonDef {
  id: RiftBoonId
  name: string
  icon: string
  tag: 'offense' | 'arcane' | 'defense' | 'sustain'
  desc: string
  stats: Partial<Stats>
  effect: RiftBoonEffect
}

export const RIFT_BOONS: Record<RiftBoonId, RiftBoonDef> = {
  rift_spellblade: {
    id: 'rift_spellblade',
    name: 'คมเวทสะท้อน (Spellblade)',
    icon: '⚔️✨',
    tag: 'arcane',
    desc: 'ATK +18 · MATK +24 · โจมตีปกติยิงศรเวทตามอีก 1 ดอก (+35% MATK)',
    stats: { atk: 18, matk: 24, boltHits: 1 },
    effect: { kind: 'spellblade', power: 0.35 },
  },
  rift_lightning: {
    id: 'rift_lightning',
    name: 'สายฟ้าฟาดชิ่ง (Stormcaller)',
    icon: '⚡',
    tag: 'offense',
    desc: 'ASPD +14% · Crit +12% · การโจมตีชิ่งสายฟ้า 2 เป้าหมาย (40% ดาเมจ)',
    stats: { aspd: 0.14, crit: 0.12 },
    effect: { kind: 'chain_lightning', power: 0.4, secondary: 2 },
  },
  rift_bloodharvest: {
    id: 'rift_bloodharvest',
    name: 'เกี่ยวเลือดอเวจี (Blood Harvest)',
    icon: '🩸',
    tag: 'sustain',
    desc: 'ดูดเลือด +8% · ดูดเลือดเวท +6% · ฆ่ามอนฟื้น HP +120',
    stats: { lifesteal: 0.08, spellVamp: 0.06, killHeal: 120 },
    effect: { kind: 'blood_harvest', power: 0.08, secondary: 120 },
  },
  rift_echo: {
    id: 'rift_echo',
    name: 'ก้องกังวานมิติ (Temporal Echo)',
    icon: '🌀',
    tag: 'arcane',
    desc: 'Combo +15% · Combo DMG +25% · สกิลมีโอกาส 30% ร่ายซ้ำทันที (50% พลัง)',
    stats: { combo: 0.15, comboDmg: 0.25, pskill: 0.1 },
    effect: { kind: 'echo_cast', power: 0.3, secondary: 0.5 },
  },
  rift_manaoverdrive: {
    id: 'rift_manaoverdrive',
    name: 'โอเวอร์ไดรฟ์มานา (Mana Overdrive)',
    icon: '🔮',
    tag: 'arcane',
    desc: 'Max Resource +40 · ฟื้นมานา/เทิร์น +5 · Ult DMG +22%',
    stats: { maxRes: 40, resRegen: 5, ultAmp: 0.22 },
    effect: { kind: 'mana_overdrive', power: 0.22, secondary: 40 },
  },
  rift_titanheart: {
    id: 'rift_titanheart',
    name: 'หัวใจไททัน (Titan Heart)',
    icon: '🛡️',
    tag: 'defense',
    desc: 'Max HP +420 · DEF +25 · MDEF +25 · Tenacity +10%',
    stats: { maxHp: 420, def: 25, mdef: 25, tenacity: 0.1 },
    effect: { kind: 'titan_heart', power: 0.18 },
  },
  rift_voidpen: {
    id: 'rift_voidpen',
    name: 'ทะลวงความว่างเปล่า (Void Piercer)',
    icon: '🕳️',
    tag: 'offense',
    desc: 'เจาะเกราะ +18% · Ult เจาะเกราะ +20% · Crit DMG +15%',
    stats: { pierce: 0.18, ultPierce: 0.2, critMul: 0.15 },
    effect: { kind: 'void_pen', power: 0.18 },
  },
  rift_frostguard: {
    id: 'rift_frostguard',
    name: 'เกราะน้ำแข็งนิรันดร์ (Glacial Ward)',
    icon: '❄️',
    tag: 'defense',
    desc: 'โล่เปิดเวฟ +160 · ความแรงโล่ +20% · Guard +15% · ชิลสโลว์ +18%',
    stats: { waveShield: 160, shieldAmp: 0.2, guard: 0.15, chillSlow: 0.18 },
    effect: { kind: 'frost_guard', power: 0.18, secondary: 160 },
  },
  rift_critstorm: {
    id: 'rift_critstorm',
    name: 'พายุคริติคอล (Crit Rupture)',
    icon: '🎯',
    tag: 'offense',
    desc: 'Crit +16% · Spell Crit +16% · Crit DMG +30% · คริลดเกราะ 15%',
    stats: { crit: 0.16, spellCrit: 0.16, critMul: 0.3 },
    effect: { kind: 'crit_shred', power: 0.15 },
  },
  rift_burnaura: {
    id: 'rift_burnaura',
    name: 'ออร่าเพลิงอเวจี (Hellfire Aura)',
    icon: '🔥',
    tag: 'offense',
    desc: 'เผาอัตโนมัติ +32 · ดาเมจเผา +85/วิ · เปราะแตก +12%',
    stats: { autoBurn: 32, burnDps: 85, brittle: 0.12 },
    effect: { kind: 'burn_aura', power: 85, secondary: 32 },
  },
  rift_thornsurge: {
    id: 'rift_thornsurge',
    name: 'หนามสะท้อนออบซิเดียน (Thorn Surge)',
    icon: '🌵',
    tag: 'defense',
    desc: 'สะท้อนดาเมจ +65 · โอกาสสวนกลับ +18% · ดาเมจสวนกลับ +35%',
    stats: { thorns: 65, counter: 0.18, counterDmg: 0.35 },
    effect: { kind: 'thorn_surge', power: 0.35, secondary: 65 },
  },
  rift_sanctum: {
    id: 'rift_sanctum',
    name: 'วิหารคุ้มภัยอมตะ (Undying Sanctum)',
    icon: '🕊️',
    tag: 'sustain',
    desc: 'คืนชีพ +1 ครั้ง (40% HP) · แรงฮีล +18% · ต้านดีบัฟ +20% · รีเจน +30',
    stats: { revive: 1, reviveHp: 0.4, healAmp: 0.18, debuffRes: 0.2, regen: 30 },
    effect: { kind: 'sanctum_ward', power: 0.4 },
  },
}

export const RIFT_BOON_IDS: readonly RiftBoonId[] = Object.keys(RIFT_BOONS) as RiftBoonId[]

export function riftBoonById(id: string): RiftBoonDef | undefined {
  return (RIFT_BOONS as Partial<Record<string, RiftBoonDef>>)[id]
}

export function riftBranchById(id: string): RiftBranchDef | undefined {
  return (RIFT_BRANCHES as Partial<Record<string, RiftBranchDef>>)[id]
}

/** Active Void Rift run checkpoint stored in SaveData. Wiped upon death or exit. */
export interface RiftActiveRunState {
  seed: string
  depth: number
  daily?: boolean
  boons: string[]
  curses: string[]
  bankZeny: number
  bankMats: Record<string, number>
  lastBranch?: RiftBranchId
  startedAt: number
}
