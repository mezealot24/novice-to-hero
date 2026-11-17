// ===== D14 🧪 ห้องแล็บโคลน ชั้น 1 (Lv 100-102) — Q 2026-11-17 "D14-18 มอนแบบดันโคลน RO" =====
// Bio-lab clone dungeon: every monster is a lab-grown clone of a hero class and fights with that class's own trick
// (Swordsman counters, Archer multi-shot, Mage burst, Cleric heals / revives the party, Thief evades + poisons).
// Waves come as mixed "parties", so the hard part is target order, not bigger numbers.
// v125 (Q 2026-11-17 "Monster ใน D14 ได้รับสกิลทั้งหมดของคลาสนั้นๆ"): each class clone also casts EVERY hero skill of its class (heroKit { cls }),
// at HERO_KIT_RULES.classLv (min Lv 1, one knob in data/hero-skill-book.ts). Its own `skills` below stay as the fallback.
// Only `import type` here (see dungeons/pack.ts).
import type { MonSkill } from '../game-data'
import type { DungeonPack } from './pack'

/** Every monster id of this dungeon (a union of string literals). */
export type D14Kind =
  | 'clonesword'
  | 'clonearcher'
  | 'clonemage'
  | 'clonecleric'
  | 'clonethief'
  | 'clonereject'
  | 'cloneknight'
  | 'clonewizard'
  | 'protozero'
/** Its mini bosses (MonsterDef.mini). */
export type D14Mini = 'cloneknight' | 'clonewizard'

/** Prototype Zero: it was grown from all five 1st-class templates and casts a random one of their signature moves. */
const PROTO_ROTATION: MonSkill[] = [
  { kind: 'strike', every: 1, hits: 2, pow: 0.8, name: '⚔️ Bash คู่ (แม่แบบนักดาบ)', fx: { armorBreak: 1 } },
  { kind: 'strike', every: 1, hits: 4, pow: 0.38, name: '🏹 Double Strafe x2 (แม่แบบนักธนู)' },
  { kind: 'bolt', every: 1, hits: 3, pow: 0.5, name: '🔥 Fire Bolt x3 (แม่แบบจอมเวท)', fx: { burn: 1 } },
  { kind: 'curse', every: 1, name: '🗡️ Envenom (แม่แบบโจร)', fx: { poison: 3, weaken: 1 } },
]
const PROTO_SKILLS: MonSkill[] = [
  { kind: 'strike', every: 2, name: '🧬 สลับแม่แบบ', pick: PROTO_ROTATION },
  { kind: 'heal', every: 5, pow: 0.08, self: true, name: '✨ Heal (แม่แบบนักบวช)' },
]

export const D14: DungeonPack<D14Kind> = {
  monsters: {
    // ----- normals: one clone per 1st class + the failed experiment -----
    clonesword: {
      heroKit: { cls: 'swordsman', style: 'guardian' }, // every swordsman hero skill (classKit, Lv HERO_KIT_RULES.classLv)
      name: 'โคลนนักดาบ #S-01', tex: 'clonesword',
      statAlloc: { str: 4, vit: 4, dex: 1, agi: 1 }, hp: 1, dmg: 1, xp: 38, ai: 'dasher', moveSpeed: 420, radius: 16, zeny: [29, 39], idleMs: [600, 1000],
      bodyMul: { hp: 2.35, dmg: 2.05 }, def: 120, counter: 0.3, combo: 0.12,
      skills: [{ kind: 'strike', every: 3, hits: 2, pow: 0.75, name: '⚔️ Bash ทุบเกราะ', fx: { armorBreak: 1 } }],
    },
    clonearcher: {
      heroKit: { cls: 'archer', style: 'aggressive' }, // every archer hero skill (classKit, Lv HERO_KIT_RULES.classLv)
      name: 'โคลนนักธนู #A-02', tex: 'clonearcher',
      statAlloc: { dex: 5, agi: 3, luk: 2 }, hp: 1, dmg: 1, xp: 37, ai: 'dasher', moveSpeed: 520, radius: 15, zeny: [28, 38], idleMs: [500, 900],
      bodyMul: { hp: 2.0, dmg: 2.2 }, shots: 3, crit: 0.14, trueSight: { after: 2, turns: 2 },
      skills: [{ kind: 'strike', every: 3, hits: 3, pow: 0.5, name: '🏹 Arrow Shower', fx: { slow: 1 } }],
    },
    clonemage: {
      heroKit: { cls: 'mage', style: 'aggressive' }, // every mage hero skill (classKit, Lv HERO_KIT_RULES.classLv)
      name: 'โคลนจอมเวท #M-03', tex: 'clonemage',
      statAlloc: { int: 5, wis: 3, dex: 2 }, hp: 1, dmg: 1, xp: 38, ai: 'dasher', moveSpeed: 460, radius: 15, zeny: [29, 39], idleMs: [550, 950], magic: true,
      bodyMul: { hp: 1.75, matk: 2.15 },
      skills: [
        { kind: 'bolt', every: 2, hits: 3, pow: 0.55, name: '🔥 Fire Bolt สามดอก', fx: { burn: 1 } },
        { kind: 'curse', every: 5, name: '❄️ Frost Diver', fx: { freeze: 60 } },
      ],
    },
    clonecleric: {
      heroKit: { cls: 'cleric', style: 'support' }, // every cleric hero skill (classKit, Lv HERO_KIT_RULES.classLv)
      name: 'โคลนนักบวช #C-04', tex: 'clonecleric',
      statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 1, dmg: 1, xp: 39, ai: 'dasher', moveSpeed: 430, radius: 15, zeny: [30, 40], idleMs: [600, 1000], magic: true,
      bodyMul: { hp: 2.1, matk: 1.6 }, def: 60,
      skills: [
        { kind: 'heal', every: 2, pow: 0.18, name: '✨ Heal เพื่อนโคลน' },
        { kind: 'revive', every: 4, pow: 0.45, name: '🕊️ Resurrection ปลุกโคลนที่ล้ม' },
        { kind: 'shield', every: 5, pow: 0.1, name: '🛡️ Kyrie Eleison ทั้งปาร์ตี้' },
      ],
    },
    clonethief: {
      heroKit: { cls: 'thief', style: 'aggressive' }, // every thief hero skill (classKit, Lv HERO_KIT_RULES.classLv)
      name: 'โคลนโจร #T-05', tex: 'clonethief',
      statAlloc: { agi: 5, luk: 3, str: 2 }, hp: 1, dmg: 1, xp: 37, ai: 'dasher', moveSpeed: 640, radius: 15, zeny: [28, 38], idleMs: [400, 800],
      bodyMul: { hp: 2.2, dmg: 2.05 }, fixedFlee: 0.3, combo: 0.3, crit: 0.1, onHit: { poison: 1 },
    },
    clonereject: {
      name: 'ร่างโคลนล้มเหลว', tex: 'clonereject',
      statAlloc: { vit: 5, str: 3, wis: 2 }, hp: 1, dmg: 1, xp: 36, ai: 'hopper', moveSpeed: 180, radius: 18, zeny: [27, 37], idleMs: [800, 1300],
      bodyMul: { hp: 2.5, dmg: 1.9 }, def: 80, deathBlast: 2.2, onHit: { weaken: 1 },
    },
    // ----- minis: 2nd-class prototypes (duel: one of the two) -----
    cloneknight: {
      heroKit: { cls: 'knight', style: 'guardian' }, // every knight hero skill (classKit, Lv HERO_KIT_RULES.classLv)
      name: 'โคลนอัศวิน K-07', title: 'ต้นแบบนักรบขี่เปโก', tex: 'cloneknight',
      statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, xp: 66, ai: 'boss', mini: 'cloneknight',
      moveSpeed: 300, radius: 38, zeny: [300, 380], idleMs: [550, 850],
      bodyMul: { hp: 2.2, dmg: 2.05 }, def: 70, counter: 0.25, combo: 0.15,
      charge: true, chargeEvery: 4, chargeCounter: 'shield_or_guard',
      slamMul: 2.0, slamName: 'Brandish Spear! (ตั้งโล่ / Guard รับไว้)', slamFx: { armorBreak: 2 }, slamAnim: 'cleave', slamColor: 0x5eead4,
      skills: [{ kind: 'strike', every: 3, hits: 3, pow: 0.5, name: '🎯 Pierce สามฮิต' }],
      phases: [{ at: 0.5, name: 'ปลดล็อกแม่แบบ! เร็วขึ้น + เรียกโคลนนักดาบ 2 ตัว', speed: 1.2, summon: ['clonesword', 2] }],
    },
    clonewizard: {
      heroKit: { cls: 'wizard', style: 'aggressive' }, // every wizard hero skill (classKit, Lv HERO_KIT_RULES.classLv)
      name: 'โคลนวิซาร์ด W-09', title: 'ต้นแบบนักเวทพายุ', tex: 'clonewizard',
      statAlloc: { int: 5, wis: 3, dex: 2 }, hp: 1, dmg: 1, xp: 66, ai: 'boss', mini: 'clonewizard',
      moveSpeed: 260, radius: 38, zeny: [300, 380], idleMs: [600, 900],
      bodyMul: { hp: 2.75, matk: 2.0 }, magic: true, slamMagic: true, def: 45,
      charge: true, chargeEvery: 4, chargeCounter: 'interrupt_stun',
      slamMul: 1.9, slamName: 'Storm Gust! (สตั๊น / ขัดจังหวะเพื่อยกเลิก)', slamFx: { freeze: 80, slow: 2 }, slamAnim: 'cast', slamColor: 0x93c5fd,
      skills: [
        { kind: 'bolt', every: 2, hits: 4, pow: 0.42, name: '⚡ Jupitel Thunder' },
        { kind: 'shield', every: 5, pow: 0.12, self: true, name: '🔮 Safety Wall' },
      ],
      phases: [{ at: 0.5, name: 'โอเวอร์โหลดเวท! เรียกโคลนจอมเวท 2 ตัว', summon: ['clonemage', 2] }],
    },
    // ----- boss -----
    protozero: {
      name: 'ต้นแบบหมายเลขศูนย์', title: 'โคลนรวมแม่แบบทั้งห้าอาชีพ', tex: 'protozero',
      statAlloc: { str: 3, vit: 4, int: 2, agi: 1, dex: 1 }, hp: 1, dmg: 1, xp: 0, ai: 'boss',
      moveSpeed: 260, radius: 56, zeny: [760, 960], idleMs: [700, 1000],
      bodyMul: { hp: 1.7, dmg: 1.9, matk: 1.9 }, def: 60, crit: 0.12, counter: 0.15,
      charge: true, chargeCounter: 'multi_hit_break',
      slamName: 'ซิงโครไนซ์ทุกแม่แบบ! (รัวหลายฮิตเพื่อยกเลิก)', slamMul: 2.1, slamFx: { armorBreak: 2, silence: 1 }, slamAnim: 'cleave', slamColor: 0x34d399,
      skills: PROTO_SKILLS,
      phases: [
        { at: 0.7, name: 'เปิดหลอดเพาะเลี้ยง! โคลนนักบวช 2 ตัวมาฮีลให้', summon: ['clonecleric', 2] },
        { at: 0.4, name: 'แม่แบบโจร! หลบคงที่ + เร็วขึ้น + โคลนโจร 2 ตัว', speed: 1.2, summon: ['clonethief', 2] },
        { at: 0.15, name: 'ระบบล่ม! แรงขึ้น ชาร์จทุก 2 เทิร์น + ร่างล้มเหลว 2 ตัว', dmg: 1.2, chargeEvery: 2, cleanse: true, summon: ['clonereject', 2] },
      ],
    },
  },
  dungeon: {
    id: 'd14', name: 'ห้องแล็บโคลน ชั้น 1', boss: 'ต้นแบบหมายเลขศูนย์', tier: 14,
    sky: [0x03110d, 0x0f3b33], hills: 0x0b2a24, unlock: 'd13', level: [100, 102],
    rooms: [
      { title: 'เวฟ 1 · ห้องเพาะเลี้ยง (ปาร์ตี้โคลน)', spawn: [['clonesword', 1], ['clonecleric', 1], ['clonearcher', 1], ['clonereject', 1]], lv: 100 },
      { title: 'เวฟ 2 · ระเบียงหลอดแก้ว', spawn: [['clonethief', 2], ['clonemage', 1], ['clonecleric', 1]], lv: 100 },
      { title: 'สังเวียน · ดวลต้นแบบ 1-1', spawn: [], mini: true, miniPool: ['cloneknight', 'clonewizard'], turnLimit: 52, lv: 101 },
      { title: 'เวฟ 3 · ปาร์ตี้ครบทีม', spawn: [['clonesword', 1], ['clonemage', 1], ['clonearcher', 1], ['clonecleric', 1]], lv: 101 },
      { title: 'เวฟ 4 · กองซากทดลอง', spawn: [['clonereject', 2], ['clonethief', 1], ['clonemage', 1]], lv: 101 },
      { title: 'ห้องบอส · ต้นแบบหมายเลขศูนย์', spawn: [['protozero', 1]], boss: true, turnLimit: 64, lv: 102 },
    ],
  },
  cards: [
    { id: 'card_clonesword', monster: 'clonesword', slot: 'armor', tier: 'normal', dungeon: 'd14', mod: { def: 28, counter: 0.08 }, base: { vit: 3 } },
    { id: 'card_clonearcher', monster: 'clonearcher', slot: 'weapon', tier: 'normal', dungeon: 'd14', mod: { crit: 0.05, critMul: 0.2 }, base: { dex: 3 } },
    { id: 'card_clonemage', monster: 'clonemage', slot: 'acc', tier: 'normal', dungeon: 'd14', mod: { matk: 38, spellCrit: 0.06 }, base: { int: 3 } },
    { id: 'card_clonecleric', monster: 'clonecleric', slot: 'armor', tier: 'normal', dungeon: 'd14', mod: { healAmp: 0.15, shieldAmp: 0.12 }, base: { wis: 3 } },
    { id: 'card_clonethief', monster: 'clonethief', slot: 'weapon', tier: 'normal', dungeon: 'd14', mod: { comboDmg: 0.18, luckyDodge: 0.04 }, base: { agi: 3 } },
    { id: 'card_clonereject', monster: 'clonereject', slot: 'acc', tier: 'normal', dungeon: 'd14', mod: { maxHp: 300, debuffRes: 0.08 }, base: { vit: 3 } },
    { id: 'card_cloneknight', monster: 'cloneknight', slot: 'weapon', tier: 'mini', dungeon: 'd14', mod: { counter: 0.12, critMul: 0.24 }, base: { str: 6 } },
    { id: 'card_clonewizard', monster: 'clonewizard', slot: 'acc', tier: 'mini', dungeon: 'd14', mod: { matk: 46, spellCrit: 0.09 }, base: { int: 6 } },
    { id: 'card_protozero', monster: 'protozero', slot: 'armor', tier: 'boss', dungeon: 'd14', mod: { debuffRes: 0.16, counter: 0.1, comboDmg: 0.22 }, pct: { maxHp: 0.23, atk: 0.08, matk: 0.08 } },
  ],
  mats: [
    { id: 'm_d14', name: 'เซลล์โคลนเรืองแสง', icon: '🧪', dungeon: 'd14', boss: false },
    { id: 'b_d14', name: 'แกนแม่แบบหมายเลขศูนย์', icon: '🧬', dungeon: 'd14', boss: true },
  ],
  miniRelics: {
    cloneknight: ['riposte', 'aegis'],
    clonewizard: ['storm', 'iceage'],
  },
  miniHints: {
    cloneknight: 'โคลนอัศวิน: สวนกลับบ่อย · ชาร์จ Brandish Spear (ตั้งโล่ / Guard รับไว้) · Pierce 3 ฮิต · ครึ่งเลือดเร็วขึ้น + เรียกโคลนนักดาบ 2 ตัว',
    clonewizard: 'โคลนวิซาร์ด: Jupitel 4 ฮิต · ชาร์จ Storm Gust แช่แข็ง (สตั๊น / ขัดจังหวะเพื่อยกเลิก) · ครึ่งเลือดเรียกโคลนจอมเวท 2 ตัว ฆ่าตัวเล็กก่อน',
  },
  holyFoes: [],
  monSpeed: {
    clonesword: 12, clonearcher: 14, clonemage: 12, clonecleric: 12, clonethief: 16, clonereject: 8,
    cloneknight: 13, clonewizard: 12, protozero: 12,
  },
}
