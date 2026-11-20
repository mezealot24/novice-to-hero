// ===== D11 ⚙️ นรกจักรกลนิรันดร์ (Lv 90-94) — docs/design/dungeon-11-13-expansion-v1.md =====
// Awakening Tier 1 (Job3 home): Clockwork Purgatory · Biome Hazard = 'clockwork_heat'.
// Only `import type` here (see dungeons/pack.ts).
import type { MonSkill } from '../game-data'
import type { DungeonPack } from './pack'

/** Every monster id of this dungeon (a union of string literals). */
export type D11Kind =
  | 'cogsentinel'
  | 'steamflayer'
  | 'boilerimp'
  | 'gearspider'
  | 'oilpriest'
  | 'ticktockwisp'
  | 'overdrive'
  | 'clockmaiden'
  | 'chronotitan'
/** Its mini bosses (MonsterDef.mini). */
export type D11Mini = 'overdrive' | 'clockmaiden'

const CHRONO_SKILLS: MonSkill[] = [
  { kind: 'curse', every: 4, name: 'บิดเบือนเข็มเวลา', fx: { slow: 2, weaken: 2 } },
  { kind: 'strike', every: 2, hits: 2, pow: 0.72, name: '⚙️ ฟันเฟืองบดขยี้' },
]

export const D11: DungeonPack<D11Kind> = {
  monsters: {
    // ----- normals (tank / assassin / skirmisher / skirmisher / support / caster) -----
    cogsentinel: {
      name: 'ทหารยามเฟือง', tex: 'cogsentinel',
      statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 1, dmg: 1, xp: 28, ai: 'hopper', moveSpeed: 170, radius: 18, zeny: [21, 29], idleMs: [800, 1300],
      bodyMul: { hp: 1.48, dmg: 1.48 }, def: 95, reflect: 0.06,
      skills: [{ kind: 'shield', every: 4, pow: 0.14, name: 'เกราะเฟืองนิรันดร์', scale: { stat: 'vit' } }],
    },
    steamflayer: {
      name: 'นักเชือดไอน้ำ', tex: 'steamflayer',
      statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 1, dmg: 1, xp: 26, ai: 'dasher', moveSpeed: 590, radius: 15, zeny: [19, 26], idleMs: [400, 800],
      bodyMul: { hp: 1.58, dmg: 1.45 }, crit: 0.14, combo: 0.15, onHit: { burn: 1 },
    },
    boilerimp: {
      name: 'ภูตหม้อต้ม', tex: 'boilerimp',
      statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 1, dmg: 1, xp: 26, ai: 'dasher', moveSpeed: 560, radius: 14, zeny: [19, 26], idleMs: [450, 850],
      bodyMul: { hp: 1.65, dmg: 1.55 }, deathBlast: 1.6,
      skills: [{ kind: 'bolt', every: 3, pow: 1.15, name: 'ปะทุไอน้ำเดือด', fx: { burn: 1 } }],
    },
    gearspider: {
      name: 'แมงมุมเฟือง', tex: 'gearspider',
      statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 1, dmg: 1, xp: 27, ai: 'dasher', moveSpeed: 610, radius: 15, zeny: [20, 27], idleMs: [400, 800],
      bodyMul: { hp: 1.72, dmg: 1.6 }, onHit: { slow: 2 }, trueSight: { after: 2, turns: 3 },
    },
    oilpriest: {
      name: 'นักบวชน้ำมัน', tex: 'oilpriest',
      statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 1, dmg: 1, xp: 27, ai: 'dasher', moveSpeed: 450, radius: 15, zeny: [20, 28], idleMs: [550, 950], magic: true,
      bodyMul: { hp: 1.45, matk: 1.32 },
      skills: [
        { kind: 'heal', every: 3, pow: 0.16, name: 'หล่อลื่นฟื้นฟู' },
        { kind: 'curse', every: 4, name: 'สาปน้ำมันเดือด', fx: { burn: 2, weaken: 1 } },
      ],
    },
    ticktockwisp: {
      name: 'วิญญาณนาฬิกา', tex: 'ticktockwisp',
      statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 27, ai: 'dasher', moveSpeed: 500, radius: 14, zeny: [20, 27], idleMs: [500, 900], magic: true,
      bodyMul: { hp: 1.48, matk: 1.3 },
      skills: [
        { kind: 'curse', every: 3, name: 'เข็มวินาทีตัดจังหวะ', fx: { silence: 1 } },
        { kind: 'bolt', every: 2, pow: 1.15, name: 'คลื่นติ๊กต็อก' },
      ],
    },
    // ----- minis (duel: one of the two) -----
    overdrive: {
      name: 'ออโตมาตอนโอเวอร์ไดรฟ์', title: 'เตาหลอมคลั่งนิรันดร์', tex: 'overdrive',
      statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, xp: 48, ai: 'boss', mini: 'overdrive',
      moveSpeed: 290, radius: 38, zeny: [210, 270], idleMs: [600, 900],
      bodyMul: { hp: 1.16, dmg: 1.35 }, def: 45, crit: 0.12,
      charge: true, chargeEvery: 4, chargeCounter: 'interrupt_stun',
      slamMul: 1.8, slamName: 'ปลดไอน้ำหลอมละลาย! (Stun/Freeze ขัดจังหวะได้)', slamFx: { burn: 2, armorBreak: 1 }, slamAnim: 'stomp', slamColor: 0xff7b32,
      phases: [{ at: 0.5, name: 'โอเวอร์คล็อก! เร็วขึ้น ×1.3 + ตีแรงขึ้น', speed: 1.3, dmg: 1.15 }],
    },
    clockmaiden: {
      name: 'ตุ๊กตาไขลาน', title: 'เรือนเวลาต้องสาป', tex: 'clockmaiden',
      statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 48, ai: 'boss', mini: 'clockmaiden',
      moveSpeed: 260, radius: 36, zeny: [210, 270], idleMs: [600, 900],
      bodyMul: { hp: 2.0, matk: 1.3 }, magic: true, slamMagic: true, fixedFlee: 0.3, def: 30,
      charge: true, chargeEvery: 4, slamMul: 1.65, slamName: 'ลานนาฬิกาวิปลาส! สะท้อนกาลเวลา', slamFx: { silence: 1, slow: 2 }, slamAnim: 'cast', slamColor: 0xffc857,
      skills: [{ kind: 'curse', every: 3, name: 'ไขลานสะกดจิต', fx: { silence: 1, weaken: 1 } }],
      phases: [{ at: 0.5, name: 'ปลุกเรือนเวลา! เรียกวิญญาณนาฬิกา 2 ตัว', summon: ['ticktockwisp', 2] }],
    },
    // ----- boss -----
    chronotitan: {
      name: 'โครนอส', title: 'ไททันเฟืองเวลา', tex: 'chronotitan',
      statAlloc: { vit: 4, str: 3, int: 2, wis: 2, dex: 1 }, hp: 1, dmg: 1, xp: 0, ai: 'boss',
      moveSpeed: 240, radius: 54, zeny: [520, 680], idleMs: [700, 1000],
      bodyMul: { hp: 1.1, dmg: 1.42, matk: 1.35 }, def: 50, crit: 0.1,
      charge: true, chargeCounter: 'interrupt_stun',
      slamName: 'ลูกตุ้มพิพากษากาลเวลา! (Stun/Freeze ขัดจังหวะ)', slamMul: 1.85, slamFx: { armorBreak: 2, slow: 2 }, slamAnim: 'stomp', slamColor: 0xff9a3c,
      skills: CHRONO_SKILLS,
      phases: [
        { at: 0.7, name: 'เกราะจักรกล! โล่ + ทหารยามเฟือง 2 ตัว', shield: 0.12, summon: ['cogsentinel', 2] },
        { at: 0.4, name: 'ย้อนเวลา! ฟื้น HP 8% + ร่ายถี่ขึ้น', heal: 0.08, chargeEvery: 3, cleanse: true },
        { at: 0.15, name: 'โอเวอร์ไดรฟ์นิรันดร์! เร็วขึ้น แรงขึ้น ร่ายทุก 2 เทิร์น', speed: 1.25, dmg: 1.2, chargeEvery: 2,
          skills: [{ kind: 'strike', every: 3, hits: 2, pow: 0.75, name: '⚙️ ฟันเฟืองบดขยี้' }] },
      ],
    },
  },
  dungeon: {
    id: 'd11', name: 'นรกจักรกลนิรันดร์', boss: 'โครนอส · ไททันเฟืองเวลา', tier: 11,
    sky: [0x1a0b06, 0x703012], hills: 0x3b1a0c, unlock: 'd10', level: [90, 94], hazard: 'clockwork_heat',
    rooms: [
      { title: 'เวฟ 1 · เตาหลอมหน้าด่าน', spawn: [['cogsentinel', 1], ['steamflayer', 2], ['boilerimp', 1]], lv: 90 },
      { title: 'เวฟ 2 · รางเฟืองน้ำมันเดือด', spawn: [['gearspider', 2], ['oilpriest', 1], ['ticktockwisp', 1]], lv: 91 },
      { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['overdrive', 'clockmaiden'], turnLimit: 46, lv: 92 },
      { title: 'เวฟ 3 · โถงหม้อไอน้ำคลั่ง', spawn: [['cogsentinel', 1], ['steamflayer', 1], ['boilerimp', 2]], lv: 92 },
      { title: 'เวฟ 4 · หอนาฬิกานิรันดร์', spawn: [['cogsentinel', 1], ['gearspider', 1], ['oilpriest', 1], ['ticktockwisp', 1]], lv: 93 },
      { title: 'ห้องบอส · โครนอส · ไททันเฟืองเวลา', spawn: [['chronotitan', 1]], boss: true, turnLimit: 58, lv: 94 },
    ],
  },
  cards: [
    { id: 'card_cogsentinel', monster: 'cogsentinel', slot: 'armor', tier: 'normal', dungeon: 'd11', mod: { def: 20, thorns: 0.08 }, base: { vit: 3 } },
    { id: 'card_steamflayer', monster: 'steamflayer', slot: 'weapon', tier: 'normal', dungeon: 'd11', mod: { critMul: 0.2, crit: 0.04 }, base: { str: 2 } },
    { id: 'card_boilerimp', monster: 'boilerimp', slot: 'weapon', tier: 'normal', dungeon: 'd11', mod: { pskill: 0.14, vsBurn: 0.08 }, base: { agi: 3 } },
    { id: 'card_gearspider', monster: 'gearspider', slot: 'acc', tier: 'normal', dungeon: 'd11', mod: { aspd: 0.07, hit: 14 }, base: { dex: 3 } },
    { id: 'card_oilpriest', monster: 'oilpriest', slot: 'acc', tier: 'normal', dungeon: 'd11', mod: { healAmp: 0.16, debuffRes: 0.06 }, base: { wis: 3 } },
    { id: 'card_ticktockwisp', monster: 'ticktockwisp', slot: 'weapon', tier: 'normal', dungeon: 'd11', mod: { matk: 27, spellCrit: 0.04 }, base: { int: 3 } },
    { id: 'card_overdrive', monster: 'overdrive', slot: 'weapon', tier: 'mini', dungeon: 'd11', mod: { critMul: 0.24, pskill: 0.15 }, base: { str: 6 } },
    { id: 'card_clockmaiden', monster: 'clockmaiden', slot: 'acc', tier: 'mini', dungeon: 'd11', mod: { spellCrit: 0.08, flee: 12 }, base: { int: 6 } },
    { id: 'card_chronotitan', monster: 'chronotitan', slot: 'armor', tier: 'boss', dungeon: 'd11', mod: { critMul: 0.25, tenacity: 0.12 }, pct: { maxHp: 0.17, atk: 0.06, matk: 0.06 } },
  ],
  mats: [
    { id: 'm_d11', name: 'เฟืองไหม้นิรันดร์', icon: '⚙️', dungeon: 'd11', boss: false },
    { id: 'b_d11', name: 'แกนนาฬิกาโครนอส', icon: '⏳', dungeon: 'd11', boss: true },
  ],
  miniRelics: {
    overdrive: ['executioner', 'asura'],
    clockmaiden: ['haste', 'wizard'],
  },
  miniHints: {
    overdrive: 'ร่ายปลดไอน้ำหลอมละลาย! (Stun หรือ Freeze ขัดจังหวะได้) · ตีคริแรง + เกราะแตก · ต่ำกว่า 50% เร็วขึ้น ×1.3 และตีแรงขึ้น',
    clockmaiden: 'หลบคงที่ 30% + ต้านใบ้ช่วยมาก · ร่ายลานนาฬิกาสะกดเวลา (M.DEF กัน) · ครึ่งเลือดเรียกวิญญาณนาฬิกา 2 ตัว จบให้ไว',
  },
  holyFoes: ['ticktockwisp', 'clockmaiden'],
  monSpeed: {
    cogsentinel: 7, steamflayer: 15, boilerimp: 14, gearspider: 15, oilpriest: 11, ticktockwisp: 13,
    overdrive: 12, clockmaiden: 12, chronotitan: 10,
  },
}
