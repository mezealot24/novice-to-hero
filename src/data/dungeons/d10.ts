// ===== D10 🌌 ห้วงนิทราไร้ดาว (v83, Lv 80-90, the final dungeon) — docs/design/dungeon-10-starless-dream.md =====
// Test (final exam): everything together — silence / weaken that shut kits down · stat drain · fixed flee · revive · 3-phase boss.
// Stat monsters like D6: hp / dmg = 1 placeholders, numbers come from statAlloc at the room's Lv (data/mon-stats.ts statMonster);
// def / hit / flee / crit / combo / counter here are BONUSES on top, bodyMul multiplies HP / ATK / M.ATK.
// Only `import type` here (see dungeons/pack.ts).
import type { MonSkill } from '../game-data'
import type { DungeonPack } from './pack'

/** Every monster id of this dungeon (a union of string literals). */
export type D10Kind = 'nightmarehound' | 'voidstalker' | 'dreameater' | 'starcolossus' | 'shade' | 'lullabymoth' | 'nightqueen' | 'eclipseknight' | 'starweaver'
/** Its mini bosses (MonsterDef.mini). */
export type D10Mini = 'nightqueen' | 'eclipseknight'

/** โนคทิส' star spells (a random one per cast, like Mordecus' elements). */
const STAR_SPELLS: MonSkill[] = [
  { kind: 'bolt', every: 1, pow: 1.2, name: '🌠 ดาวตกเพลิงม่วง', fx: { burn: 1 } },
  { kind: 'bolt', every: 1, pow: 1.1, name: '🌑 หอกจันทร์ดับ', fx: { freeze: 30 } },
  { kind: 'bolt', every: 1, hits: 3, pow: 0.42, name: '💫 ฝนสะเก็ดดาว' },
]

export const D10: DungeonPack<D10Kind> = {
  monsters: {
    // ----- normals (skirmisher / assassin / caster / tank / assassin / support) -----
    nightmarehound: { name: 'สุนัขฝันร้าย', tex: 'nightmarehound', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 1, dmg: 1, xp: 21, ai: 'dasher', moveSpeed: 570, radius: 15, zeny: [16, 22], idleMs: [500, 900],
      bodyMul: { hp: 1.55, dmg: 1.5 }, combo: 0.12, onHit: { weaken: 1 } },
    voidstalker: { name: 'นักล่าห้วงมืด', tex: 'voidstalker', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 1, dmg: 1, xp: 21, ai: 'dasher', moveSpeed: 600, radius: 15, zeny: [16, 22], idleMs: [400, 800],
      bodyMul: { hp: 1.45, dmg: 1.25 }, crit: 0.12, trueSight: { after: 2, turns: 3 } },
    dreameater: { name: 'ภูตกลืนฝัน', tex: 'dreameater', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 23, ai: 'dasher', moveSpeed: 480, radius: 15, zeny: [18, 24], idleMs: [600, 1000], magic: true,
      bodyMul: { hp: 1.25, matk: 1.15 }, razor: 0.03,
      skills: [{ kind: 'curse', every: 3, name: 'กลืนกินความฝัน', fx: { silence: 1, weaken: 2 } }] },
    starcolossus: { name: 'ยักษ์ดาวดับ', tex: 'starcolossus', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 1, dmg: 1, xp: 25, ai: 'hopper', moveSpeed: 160, radius: 18, zeny: [19, 26], idleMs: [900, 1400],
      bodyMul: { hp: 1.25, dmg: 1.4 }, def: 80, reflect: 0.08,
      skills: [{ kind: 'shield', every: 4, pow: 0.12, name: 'เปลือกดาวดับ', scale: { stat: 'vit' } }] },
    shade: { name: 'เงาไร้ร่าง', tex: 'shade', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 1, dmg: 1, xp: 20, ai: 'dasher', moveSpeed: 580, radius: 14, zeny: [15, 21], idleMs: [400, 800],
      bodyMul: { hp: 1.15, dmg: 1.25 }, fixedFlee: 0.35, deathBlast: 1.5 },
    lullabymoth: { name: 'ผีเสื้อกล่อมนิทรา', tex: 'lullabymoth', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 1, dmg: 1, xp: 23, ai: 'dasher', moveSpeed: 440, radius: 15, zeny: [18, 24], idleMs: [500, 900], magic: true,
      bodyMul: { hp: 1.2, matk: 1.15 },
      // curse first: on turn 4 / 8 / ... the sleep dust wins over the heal (every other even turn it heals)
      skills: [{ kind: 'curse', every: 4, name: 'ผงนิทรา', fx: { freeze: 50 } }, { kind: 'heal', every: 2, pow: 0.15, name: 'ละอองฝันสมานแผล' }] },
    // ----- minis (duel: one of the two) -----
    nightqueen: { name: 'นิกซ์', title: 'ราชินีฝันร้าย', tex: 'nightqueen', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 39, ai: 'boss', mini: 'nightqueen', moveSpeed: 260, radius: 36, zeny: [170, 220], idleMs: [600, 900],
      bodyMul: { hp: 1.7, matk: 1.15 }, magic: true, slamMagic: true, def: 25, chargeEvery: 4, slamMul: 1.5, slamName: 'ฝันร้ายนิรันดร์! บทเพลงกล่อมสู่ความมืด', slamFx: { weaken: 2 }, slamAnim: 'cast', slamColor: 0x9a5aff, charge: true,
      skills: [{ kind: 'curse', every: 3, name: 'บทเพลงปิดปาก', fx: { silence: 2 } }],
      phases: [{ at: 0.5, name: 'ราตรีกลืนกิน! ดูดค่าสถานะทุกเทิร์น + เงาไร้ร่าง 2 ตัว', drainStats: 1, summon: ['shade', 2] }] },
    eclipseknight: { name: 'อัศวินสุริยคราส', title: 'ดาบแห่งแสงที่ดับสูญ', tex: 'eclipseknight', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, xp: 39, ai: 'boss', mini: 'eclipseknight', moveSpeed: 300, radius: 38, zeny: [170, 220], idleMs: [600, 900],
      // slamMagic from a STR body: M.ATK x1.9 + slam scales with STR, so the eclipse cleave hits like its sword but through M.DEF
      bodyMul: { hp: 1, dmg: 1.15, matk: 1.9 }, def: 35, lifesteal: 0.15, onHit: { armorBreak: 2 }, trueSight: { after: 2, turns: 3 },
      chargeEvery: 4, slamMul: 1.8, slamMagic: true, slamScale: { stat: 'str' }, slamName: 'ดาบสุริยคราส! ฟันทั้งแสงและเงา', slamAnim: 'cleave', slamColor: 0xffc04a, charge: true,
      phases: [{ at: 0.4, name: 'สุริยคราสเต็มดวง! เร็วขึ้น แรงขึ้น ปลุกพลังสะสม', speed: 1.3, dmg: 1.15,
        skills: [{ kind: 'warcry', every: 3, pow: 0.15, turns: 99, self: true, name: 'เงาสุริยคราส (สะสม)' }] }] },
    // ----- boss -----
    starweaver: { name: 'โนคทิส', title: 'ผู้กลืนดวงดาว', tex: 'starweaver', statAlloc: { int: 4, vit: 3, str: 2, wis: 2, luk: 1 }, hp: 1, dmg: 1, xp: 0, ai: 'boss', moveSpeed: 240, radius: 52, zeny: [420, 550], idleMs: [700, 1000],
      bodyMul: { hp: 1.22, matk: 1.1 }, magic: true, slamMagic: true, def: 35, crit: 0.1, slamName: 'ดาวตกล้างนิทรา!', slamMul: 1.7, slamFx: { armorBreak: 2 }, slamAnim: 'cast', slamColor: 0x8a5aff, charge: true,
      // first match wins: curse every 4 · revive (a fallen add) every 5 · a star spell every 2 (default charge every 3 -> odd multiples of 3)
      skills: [
        { kind: 'curse', every: 4, name: 'คำสาปราตรีไร้ดาว', fx: { weaken: 2, silence: 1 } },
        { kind: 'revive', every: 5, pow: 0.5, name: 'ปลุกฝันร้ายจากความตาย' },
        { kind: 'bolt', every: 2, name: 'เวทดวงดาว', pick: STAR_SPELLS },
      ],
      phases: [{ at: 0.7, name: 'ม่านราตรี! โล่ + สะท้อน + เงาไร้ร่าง 2 ตัว', shield: 0.12, reflect: 0.05, summon: ['shade', 2] },
        { at: 0.4, name: 'สุริยคราสนิรันดร์! ดูดค่าสถานะทุกเทิร์น + เร็วขึ้น', drainStats: 1, speed: 1.2 },
        // star spells move to every 3 so the every-2 charge really fires (with spells every 2 it would never charge)
        { at: 0.15, name: 'ดาวดับ! ฟื้นตัว แรงขึ้น ชาร์จถี่ + สุนัขฝันร้าย 2 ตัว', heal: 0.1, dmg: 1.2, chargeEvery: 2, cleanse: true, summon: ['nightmarehound', 2],
          skills: [{ kind: 'bolt', every: 3, name: 'เวทดวงดาว', pick: STAR_SPELLS }] }] },
  },
  dungeon: {
    // D10 (v83): fixed level band, stat monsters (data/mon-stats.ts), no Hero Power scaling
    id: 'd10', name: 'ห้วงนิทราไร้ดาว', boss: 'ผู้กลืนดวงดาวโนคทิส', tier: 10, sky: [0x05030f, 0x3a1f6a], hills: 0x24163f, unlock: 'd9', level: [80, 90],
    rooms: [
      { title: 'เวฟ 1 · ขอบฝันร้าย', spawn: [['nightmarehound', 2], ['shade', 1]], lv: 80 },
      { title: 'เวฟ 2 · ทุ่งละอองนิทรา', spawn: [['dreameater', 1], ['voidstalker', 1], ['lullabymoth', 1], ['shade', 1]], lv: 82 },
      { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['nightqueen', 'eclipseknight'], turnLimit: 45, lv: 86 },
      { title: 'เวฟ 3 · ซากดาวที่ดับแล้ว', spawn: [['starcolossus', 1], ['nightmarehound', 2], ['dreameater', 1]], lv: 85 },
      { title: 'เวฟ 4 · ประตูห้วงไร้ดาว', spawn: [['starcolossus', 1], ['voidstalker', 1], ['lullabymoth', 1]], lv: 88 },
      { title: 'ห้องบอส · ผู้กลืนดวงดาวโนคทิส', spawn: [['starweaver', 1]], boss: true, turnLimit: 56, lv: 90 },
    ],
  },
  // power ≈ D8 cards x1.3, themed on what this dungeon throws at you (debuffs, crits, drain); the boss card is the endgame reward
  cards: [
    { id: 'card_nightmarehound', monster: 'nightmarehound', slot: 'weapon', tier: 'normal', dungeon: 'd10', mod: { comboDmg: 0.13, debuffRes: 0.04 }, base: { agi: 3 } },
    { id: 'card_voidstalker', monster: 'voidstalker', slot: 'weapon', tier: 'normal', dungeon: 'd10', mod: { critMul: 0.17, crit: 0.03 } },
    { id: 'card_dreameater', monster: 'dreameater', slot: 'acc', tier: 'normal', dungeon: 'd10', mod: { matk: 23, debuffRes: 0.05 } },
    { id: 'card_starcolossus', monster: 'starcolossus', slot: 'armor', tier: 'normal', dungeon: 'd10', mod: { def: 17, critDR: 0.08 } },
    { id: 'card_shade', monster: 'shade', slot: 'acc', tier: 'normal', dungeon: 'd10', mod: { flee: 10, luckyDodge: 0.03 }, base: { agi: 2 } },
    { id: 'card_lullabymoth', monster: 'lullabymoth', slot: 'armor', tier: 'normal', dungeon: 'd10', mod: { maxHp: 210, tenacity: 0.08 }, base: { wis: 3 } },
    { id: 'card_nightqueen', monster: 'nightqueen', slot: 'acc', tier: 'mini', dungeon: 'd10', mod: { spellCrit: 0.07, debuffRes: 0.08 }, base: { int: 6 } },
    { id: 'card_eclipseknight', monster: 'eclipseknight', slot: 'weapon', tier: 'mini', dungeon: 'd10', mod: { lifesteal: 0.07, pskill: 0.13 }, base: { str: 5 } },
    { id: 'card_starweaver', monster: 'starweaver', slot: 'armor', tier: 'boss', dungeon: 'd10', mod: { debuffRes: 0.15, tenacity: 0.1 }, pct: { maxHp: 0.15, atk: 0.05, matk: 0.05 } },
  ],
  mats: [
    { id: 'm_d10', name: 'ผงดาวดับ', icon: '✨', dungeon: 'd10', boss: false },
    { id: 'b_d10', name: 'ดวงตาห้วงนิทรา', icon: '👁️', dungeon: 'd10', boss: true },
  ],
  miniRelics: {
    nightqueen: ['harvest', 'storm'],
    eclipseknight: ['executioner', 'trinity'],
  },
  miniHints: {
    nightqueen: 'ทุก 3 เทิร์นร้องเพลงใบ้ 2 เทิร์น (ท่าไม้ตายติด) ต้านสถานะช่วยมาก · ชาร์จฝันร้าย = อ่อนแรง · ครึ่งเลือดดูดค่าสถานะเราทุกเทิร์น + เรียกเงาไร้ร่าง 2 ตัว (หลบ 35% · ตายแล้วระเบิด) จบให้ไว',
    eclipseknight: 'หลบมัน 2 ครั้งแล้วมันตีโดนแน่นอน 3 เทิร์น · ดูดเลือด 15% · ตีโดน = เกราะแตก · ชาร์จฟันสุริยคราสเป็นเวท (M.DEF กัน) · ต่ำกว่า 40% เร็วขึ้น แรงขึ้น บัฟสะสมทุก 3 เทิร์น',
  },
  holyFoes: ['shade', 'dreameater', 'nightqueen', 'starweaver'],
  monSpeed: { nightmarehound: 14, voidstalker: 15, dreameater: 12, starcolossus: 7, shade: 15, lullabymoth: 11, nightqueen: 12, eclipseknight: 12, starweaver: 10 },
}
