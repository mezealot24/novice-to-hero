// ===== D12 🌊 วิหารก้นสมุทรทมิฬ (Lv 94-97) — docs/design/dungeon-11-13-expansion-v1.md =====
// Awakening Tier 2: Abyssal Sanctuary · Biome Hazard = 'abyssal_pressure'.
// Only `import type` here (see dungeons/pack.ts).
import type { MonSkill } from '../game-data'
import type { DungeonPack } from './pack'

/** Every monster id of this dungeon (a union of string literals). */
export type D12Kind =
  | 'abysssiren'
  | 'trenchcrusher'
  | 'anglerghoul'
  | 'drownedknight'
  | 'jellywraith'
  | 'tidepriest'
  | 'coraljaeger'
  | 'deepmatron'
  | 'leviathan'
/** Its mini bosses (MonsterDef.mini). */
export type D12Mini = 'coraljaeger' | 'deepmatron'

const LEVIATHAN_SKILLS: MonSkill[] = [
  { kind: 'curse', every: 4, name: 'คำสาปแรงดันสมุทร', fx: { weaken: 2, armorBreak: 2 } },
  { kind: 'bolt', every: 2, pow: 1.25, name: '🌊 คลื่นกระแทกมหาสมุทร', fx: { slow: 1 } },
]

export const D12: DungeonPack<D12Kind> = {
  monsters: {
    // ----- normals (caster / tank / assassin / bruiser / skirmisher / support) -----
    abysssiren: {
      name: 'ไซเรนห้วงลึก', tex: 'abysssiren',
      statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 31, ai: 'dasher', moveSpeed: 480, radius: 15, zeny: [23, 31], idleMs: [550, 950], magic: true,
      bodyMul: { hp: 1.75, matk: 1.55 },
      skills: [
        { kind: 'curse', every: 3, name: 'เสียงเพรียกก้นสมุทร', fx: { silence: 1, weaken: 2 } },
        { kind: 'heal', every: 4, pow: 0.15, name: 'ทำนองวารีสมานแผล' },
      ],
    },
    trenchcrusher: {
      name: 'ยักษ์บดร่องลึก', tex: 'trenchcrusher',
      statAlloc: { vit: 5, str: 3, wis: 2 }, hp: 1, dmg: 1, xp: 33, ai: 'hopper', moveSpeed: 150, radius: 19, zeny: [25, 34], idleMs: [900, 1400],
      bodyMul: { hp: 1.78, dmg: 1.75 }, speedMul: 0.78, def: 105, onHit: { armorBreak: 2 },
      skills: [{ kind: 'strike', every: 3, pow: 1.4, name: 'ก้ามบดมหาสมุทร', fx: { armorBreak: 2 } }],
    },
    anglerghoul: {
      name: 'ปีศาจตกเบ็ด', tex: 'anglerghoul',
      statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 1, dmg: 1, xp: 30, ai: 'dasher', moveSpeed: 590, radius: 15, zeny: [22, 30], idleMs: [400, 800],
      bodyMul: { hp: 1.9, dmg: 1.72 }, razor: 0.03, trueSight: { after: 2, turns: 3 },
    },
    drownedknight: {
      name: 'อัศวินจมน้ำ', tex: 'drownedknight',
      statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, xp: 32, ai: 'dasher', moveSpeed: 450, radius: 16, zeny: [24, 32], idleMs: [600, 1000],
      bodyMul: { hp: 1.72, dmg: 1.68 }, def: 60, lifesteal: 0.12, counter: 0.15,
    },
    jellywraith: {
      name: 'ภูตแมงกะพรุน', tex: 'jellywraith',
      statAlloc: { agi: 4, dex: 3, luk: 2, int: 1 }, hp: 1, dmg: 1, xp: 29, ai: 'dasher', moveSpeed: 540, radius: 14, zeny: [22, 29], idleMs: [450, 850],
      bodyMul: { hp: 2.05, dmg: 1.88 }, onHit: { poison: 2 }, deathBlast: 1.45,
    },
    tidepriest: {
      name: 'นักบวชกระแสน้ำ', tex: 'tidepriest',
      statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 1, dmg: 1, xp: 31, ai: 'dasher', moveSpeed: 440, radius: 15, zeny: [23, 31], idleMs: [550, 950], magic: true,
      bodyMul: { hp: 1.75, matk: 1.6 },
      skills: [
        { kind: 'shield', every: 3, pow: 0.16, name: 'ม่านคลื่นสมุทร', scale: { stat: 'wis' } },
        { kind: 'bolt', every: 4, pow: 1.15, name: 'กระแสน้ำเชี่ยว', fx: { slow: 2 } },
      ],
    },
    // ----- minis (duel: one of the two) -----
    coraljaeger: {
      name: 'นักล่าปะการัง', title: 'หอกวารีแรงดันคลั่ง', tex: 'coraljaeger',
      statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, xp: 54, ai: 'boss', mini: 'coraljaeger',
      moveSpeed: 290, radius: 38, zeny: [240, 310], idleMs: [600, 900],
      bodyMul: { hp: 1.39, dmg: 1.62 }, def: 55, counter: 0.15,
      charge: true, chargeEvery: 4, chargeCounter: 'shield_or_guard',
      slamMul: 1.9, slamName: 'หอกน้ำแรงดันสูง! (ใช้ Shield หรือ Guard ต้าน)', slamFx: { armorBreak: 2 }, slamAnim: 'cleave', slamColor: 0x38bdf8,
      phases: [{ at: 0.45, name: 'เกราะปะการังคลั่ง! โล่ + เร็วขึ้น', shield: 0.14, speed: 1.25 }],
    },
    deepmatron: {
      name: 'มารดาแห่งห้วงลึก', title: 'แม่มดร่องสมุทรทมิฬ', tex: 'deepmatron',
      statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 54, ai: 'boss', mini: 'deepmatron',
      moveSpeed: 250, radius: 38, zeny: [240, 310], idleMs: [600, 900],
      bodyMul: { hp: 2.4, matk: 1.55 }, magic: true, slamMagic: true, def: 40,
      charge: true, chargeEvery: 4, slamMul: 1.65, slamName: 'พายุแมงกะพรุนพิษ!', slamFx: { poison: 3, weaken: 2 }, slamAnim: 'cast', slamColor: 0x22d3ee,
      skills: [{ kind: 'curse', every: 3, name: 'สาปความกดดันลึก', fx: { weaken: 2, slow: 1 } }],
      phases: [{ at: 0.5, name: 'ความมืดก้นเหว! ดูดค่าสถานะ + เรียกภูตแมงกะพรุน 2 ตัว', drainStats: 1, summon: ['jellywraith', 2] }],
    },
    // ----- boss -----
    leviathan: {
      name: 'เลวีอาธาน', title: 'เจ้าแห่งห้วงลึก', tex: 'leviathan',
      statAlloc: { vit: 4, str: 3, int: 2, wis: 2, dex: 1 }, hp: 1, dmg: 1, xp: 0, ai: 'boss',
      moveSpeed: 240, radius: 56, zeny: [600, 780], idleMs: [700, 1000],
      bodyMul: { hp: 1.32, dmg: 1.7, matk: 1.65 }, def: 60, crit: 0.1, lifesteal: 0.08,
      charge: true, slamMagic: true, chargeCounter: 'shield_or_guard',
      slamName: 'น้ำวนอเวจี! (มี Shield/Guard ลดครึ่ง + สวนคลื่น)', slamMul: 1.9, slamFx: { armorBreak: 2, weaken: 2 }, slamAnim: 'stomp', slamColor: 0x0ea5e9,
      skills: LEVIATHAN_SKILLS,
      phases: [
        { at: 0.7, name: 'น้ำวนแห่งห้วงลึก! โล่ 14% + สะท้อน', shield: 0.14, reflect: 0.05 },
        { at: 0.4, name: 'เกล็ดสะท้อนวารี! สะท้อน 6% + อัศวินจมน้ำ 2 ตัว', reflect: 0.06, summon: ['drownedknight', 2] },
        { at: 0.15, name: 'พิโรธจ้าวสมุทร! เร็วขึ้น แรงขึ้น ร่ายทุก 2 เทิร์น', speed: 1.25, dmg: 1.2, chargeEvery: 2, cleanse: true,
          skills: [{ kind: 'bolt', every: 3, pow: 1.3, name: '🌊 คลื่นกระแทกมหาสมุทร', fx: { slow: 1 } }] },
      ],
    },
  },
  dungeon: {
    id: 'd12', name: 'วิหารก้นสมุทรทมิฬ', boss: 'เลวีอาธาน · เจ้าแห่งห้วงลึก', tier: 12,
    sky: [0x031120, 0x0b3954], hills: 0x072438, unlock: 'd11', level: [94, 97], hazard: 'abyssal_pressure',
    rooms: [
      { title: 'เวฟ 1 · ซุ้มประตูปะการังมืด', spawn: [['abysssiren', 1], ['drownedknight', 1], ['jellywraith', 2]], lv: 94 },
      { title: 'เวฟ 2 · ร่องน้ำลึกทมิฬ', spawn: [['trenchcrusher', 1], ['anglerghoul', 2], ['tidepriest', 1]], lv: 95 },
      { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['coraljaeger', 'deepmatron'], turnLimit: 48, lv: 95 },
      { title: 'เวฟ 3 · สุสานเรืออัปปาง', spawn: [['trenchcrusher', 1], ['drownedknight', 1], ['abysssiren', 1], ['jellywraith', 1]], lv: 96 },
      { title: 'เวฟ 4 · แท่นบูชาคลื่นแรงดัน', spawn: [['anglerghoul', 2], ['tidepriest', 1], ['drownedknight', 1]], lv: 96 },
      { title: 'ห้องบอส · เลวีอาธาน · เจ้าแห่งห้วงลึก', spawn: [['leviathan', 1]], boss: true, turnLimit: 60, lv: 97 },
    ],
  },
  cards: [
    { id: 'card_abysssiren', monster: 'abysssiren', slot: 'acc', tier: 'normal', dungeon: 'd12', mod: { matk: 31, debuffRes: 0.07 }, base: { int: 3 } },
    { id: 'card_trenchcrusher', monster: 'trenchcrusher', slot: 'armor', tier: 'normal', dungeon: 'd12', mod: { def: 24, guard: 0.05 }, base: { vit: 3 } },
    { id: 'card_anglerghoul', monster: 'anglerghoul', slot: 'weapon', tier: 'normal', dungeon: 'd12', mod: { critMul: 0.22, flee: 12 }, base: { agi: 3 } },
    { id: 'card_drownedknight', monster: 'drownedknight', slot: 'weapon', tier: 'normal', dungeon: 'd12', mod: { lifesteal: 0.05, counter: 0.08 }, base: { str: 3 } },
    { id: 'card_jellywraith', monster: 'jellywraith', slot: 'acc', tier: 'normal', dungeon: 'd12', mod: { vsPoison: 0.09, luckyDodge: 0.04 }, base: { agi: 2 } },
    { id: 'card_tidepriest', monster: 'tidepriest', slot: 'armor', tier: 'normal', dungeon: 'd12', mod: { shieldAmp: 0.14, mdef: 0.05 }, base: { wis: 3 } },
    { id: 'card_coraljaeger', monster: 'coraljaeger', slot: 'armor', tier: 'mini', dungeon: 'd12', mod: { def: 28, shieldAmp: 0.18, counter: 0.1 }, base: { vit: 6 } },
    { id: 'card_deepmatron', monster: 'deepmatron', slot: 'acc', tier: 'mini', dungeon: 'd12', mod: { maxHp: 300, healAmp: 0.18, mdef: 0.06 }, base: { wis: 6 } },
    { id: 'card_leviathan', monster: 'leviathan', slot: 'armor', tier: 'boss', dungeon: 'd12', mod: { def: 26, shieldAmp: 0.2, debuffRes: 0.12 }, pct: { maxHp: 0.19, atk: 0.06, matk: 0.06 } },
  ],
  mats: [
    { id: 'm_d12', name: 'เกล็ดปะการังทมิฬ', icon: '🐚', dungeon: 'd12', boss: false },
    { id: 'b_d12', name: 'หัวใจเลวีอาธาน', icon: '🔱', dungeon: 'd12', boss: true },
  ],
  miniRelics: {
    coraljaeger: ['aegis', 'riposte'],
    deepmatron: ['iceage', 'purify'],
  },
  miniHints: {
    coraljaeger: 'ร่ายหอกน้ำแรงดันสูง! ใช้ Shield หรือ Guard ต้านเพื่อลดดาเมจครึ่งหนึ่ง + ปล่อยคลื่นน้ำสวน · มีสวนกลับ 15% · ต่ำกว่า 45% กางโล่ + เร็วขึ้น',
    deepmatron: 'สาปความกดดันลึก (อ่อนแรง + ช้า) · ร่ายพายุพิษเป็นเวท (M.DEF กัน) · ครึ่งเลือดดูดค่าสถานะ + เรียกภูตแมงกะพรุน 2 ตัว (ตายแล้วระเบิด)',
  },
  holyFoes: ['abysssiren', 'drownedknight', 'jellywraith', 'deepmatron'],
  monSpeed: {
    abysssiren: 12, trenchcrusher: 6, anglerghoul: 15, drownedknight: 12, jellywraith: 14, tidepriest: 11,
    coraljaeger: 12, deepmatron: 11, leviathan: 10,
  },
}
