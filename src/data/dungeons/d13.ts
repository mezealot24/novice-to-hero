// ===== D13 🌘 สุริยุปราคาดาราดับ (Lv 97-99) — docs/design/dungeon-11-13-expansion-v1.md =====
// Awakening Tier 3 (Endgame Lv 99 cap): Astral Eclipse · Biome Hazard = 'astral_eclipse'.
// Only `import type` here (see dungeons/pack.ts).
import type { MonSkill } from '../game-data'
import type { DungeonPack } from './pack'

/** Every monster id of this dungeon (a union of string literals). */
export type D13Kind =
  | 'eclipsewraith'
  | 'voidastrologer'
  | 'cometlancer'
  | 'starlesshound'
  | 'nebulamoth'
  | 'fallenstar'
  | 'umbravalkyrie'
  | 'noctisshade'
  | 'seraph'
/** Its mini bosses (MonsterDef.mini). */
export type D13Mini = 'umbravalkyrie' | 'noctisshade'

const SERAPH_SKILLS: MonSkill[] = [
  { kind: 'curse', every: 4, name: 'สุริยคราสปิดผนึก', fx: { silence: 1, weaken: 2 } },
  { kind: 'bolt', every: 2, hits: 3, pow: 0.5, name: '🌟 ฝนดาวตกพิพากษา' },
]

export const D13: DungeonPack<D13Kind> = {
  monsters: {
    // ----- normals (assassin / caster / bruiser / skirmisher / support / tank) -----
    eclipsewraith: {
      name: 'ภูตสุริยคราส', tex: 'eclipsewraith',
      statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 1, dmg: 1, xp: 34, ai: 'dasher', moveSpeed: 600, radius: 15, zeny: [26, 35], idleMs: [400, 800],
      bodyMul: { hp: 2.35, dmg: 2.0 }, fixedFlee: 0.3, crit: 0.12, onHit: { silence: 1 },
    },
    voidastrologer: {
      name: 'โหราจารย์ห้วงมืด', tex: 'voidastrologer',
      statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 36, ai: 'dasher', moveSpeed: 480, radius: 15, zeny: [27, 36], idleMs: [550, 950], magic: true,
      bodyMul: { hp: 2.15, matk: 1.9 },
      skills: [
        { kind: 'curse', every: 3, name: 'พยากรณ์กาลดับ', fx: { weaken: 2, armorBreak: 1 } },
        { kind: 'shield', every: 4, pow: 0.15, name: 'ม่านดาราคืนรูป', scale: { stat: 'int' } },
      ],
    },
    cometlancer: {
      name: 'ทหารหอกดาวหาง', tex: 'cometlancer',
      statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, xp: 36, ai: 'dasher', moveSpeed: 480, radius: 16, zeny: [27, 36], idleMs: [550, 950],
      bodyMul: { hp: 2.05, dmg: 2.05 }, combo: 0.2, onHit: { armorBreak: 2 },
      skills: [{ kind: 'strike', every: 3, hits: 2, pow: 0.72, name: '☄️ แทงดาวหางคู่', fx: { armorBreak: 1 } }],
    },
    starlesshound: {
      name: 'หมาไร้ดาว', tex: 'starlesshound',
      statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 1, dmg: 1, xp: 34, ai: 'dasher', moveSpeed: 620, radius: 15, zeny: [25, 34], idleMs: [400, 800],
      bodyMul: { hp: 2.5, dmg: 2.25 }, combo: 0.22, onHit: { weaken: 1 },
    },
    nebulamoth: {
      name: 'ผีเสื้อเนบิวลา', tex: 'nebulamoth',
      statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 1, dmg: 1, xp: 35, ai: 'dasher', moveSpeed: 450, radius: 15, zeny: [26, 35], idleMs: [500, 900], magic: true,
      bodyMul: { hp: 2.15, matk: 1.95 },
      skills: [
        { kind: 'curse', every: 4, name: 'ผงเนบิวลานิทรา', fx: { freeze: 55 } },
        { kind: 'heal', every: 2, pow: 0.16, name: 'ละอองดาราสมานแผล' },
      ],
    },
    fallenstar: {
      name: 'ดาวตกที่ตายแล้ว', tex: 'fallenstar',
      statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 1, dmg: 1, xp: 38, ai: 'hopper', moveSpeed: 160, radius: 19, zeny: [28, 38], idleMs: [850, 1350],
      bodyMul: { hp: 2.15, dmg: 2.15 }, def: 110, reflect: 0.08, deathBlast: 2.0,
    },
    // ----- minis (duel: one of the two) -----
    umbravalkyrie: {
      name: 'วาลคีรีเงา', title: 'ปีกมืดแห่งสุริยคราส', tex: 'umbravalkyrie',
      statAlloc: { str: 3, agi: 3, vit: 2, dex: 2 }, hp: 1, dmg: 1, xp: 62, ai: 'boss', mini: 'umbravalkyrie',
      moveSpeed: 310, radius: 38, zeny: [280, 360], idleMs: [550, 850],
      bodyMul: { hp: 2.05, dmg: 2.0 }, def: 45, combo: 0.25, trueSight: { after: 2, turns: 3 },
      charge: true, chargeEvery: 4, chargeCounter: 'multi_hit_break',
      slamMul: 1.9, slamName: 'ฝนดาราพิฆาต! (รัวหลายฮิตลอก Veil)', slamFx: { armorBreak: 2, silence: 1 }, slamAnim: 'cleave', slamColor: 0xc084fc,
      phases: [{
        at: 0.45, name: 'ปีกสุริยคราส! เร็วขึ้น + คมปีกสามดารา', speed: 1.25,
        skills: [{ kind: 'strike', every: 3, hits: 3, pow: 0.55, name: '✨ คมปีกสามดารา' }],
      }],
    },
    noctisshade: {
      name: 'เงาของโนคทิส', title: 'เศษเสี้ยวผู้กลืนดวงดาว', tex: 'noctisshade',
      statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 62, ai: 'boss', mini: 'noctisshade',
      moveSpeed: 260, radius: 38, zeny: [280, 360], idleMs: [600, 900],
      bodyMul: { hp: 2.88, matk: 1.9 }, magic: true, slamMagic: true, def: 45,
      charge: true, chargeEvery: 4, slamMul: 1.75, slamName: 'นิทรากลืนแสง!', slamFx: { weaken: 2, silence: 1 }, slamAnim: 'cast', slamColor: 0x7c3aed,
      skills: [
        { kind: 'revive', every: 5, pow: 0.5, name: 'ปลุกเงาห้วงนิทรา' },
        { kind: 'bolt', every: 2, hits: 2, pow: 0.72, name: '🌑 ศรนิทราคู่', fx: { burn: 1 } },
      ],
      phases: [{ at: 0.5, name: 'ราตรีสืบทอด! ดูดค่าสถานะ + เรียกภูตสุริยคราส 2 ตัว', drainStats: 1, summon: ['eclipsewraith', 2] }],
    },
    // ----- boss -----
    seraph: {
      name: 'เซราฟสุริยคราส', title: 'ทูตสวรรค์แห่งดาราดับ', tex: 'seraph',
      statAlloc: { vit: 4, int: 3, str: 2, wis: 2, dex: 1 }, hp: 1, dmg: 1, xp: 0, ai: 'boss',
      moveSpeed: 250, radius: 56, zeny: [720, 920], idleMs: [700, 1000],
      bodyMul: { hp: 1.6, matk: 1.9, dmg: 1.85 }, magic: true, slamMagic: true, def: 55, crit: 0.12,
      charge: true, chargeCounter: 'multi_hit_break',
      slamName: 'ซูเปอร์โนวาดาราดับ! (แตก Veil เพื่อยกเลิก)', slamMul: 2.0, slamFx: { armorBreak: 2, weaken: 2 }, slamAnim: 'cast', slamColor: 0xf472b6,
      skills: SERAPH_SKILLS,
      phases: [
        { at: 0.7, name: 'ม่านดาราศักดิ์สิทธิ์! โล่ 14% + ภูตสุริยคราส 2 ตัว', shield: 0.14, summon: ['eclipsewraith', 2] },
        { at: 0.4, name: 'ดับสิ้นแสงสวรรค์! ดูดค่าสถานะทุกเทิร์น + เร็วขึ้น', drainStats: 1, speed: 1.2 },
        { at: 0.15, name: 'ซูเปอร์โนวา! แรงขึ้น ร่ายทุก 2 เทิร์น + หมาไร้ดาว 2 ตัว', dmg: 1.2, chargeEvery: 2, cleanse: true, summon: ['starlesshound', 2],
          skills: [{ kind: 'bolt', every: 3, hits: 3, pow: 0.52, name: '🌟 ฝนดาวตกพิพากษา' }] },
      ],
    },
  },
  dungeon: {
    id: 'd13', name: 'สุริยุปราคาดาราดับ', boss: 'เซราฟสุริยคราส', tier: 13,
    sky: [0x090418, 0x3b134e], hills: 0x200a30, unlock: 'd12', level: [97, 99], hazard: 'astral_eclipse',
    rooms: [
      { title: 'เวฟ 1 · ระเบียงดาราดับ', spawn: [['eclipsewraith', 1], ['starlesshound', 2], ['voidastrologer', 1]], lv: 97 },
      { title: 'เวฟ 2 · สะพานดาวหาง', spawn: [['cometlancer', 2], ['nebulamoth', 1], ['eclipsewraith', 1]], lv: 97 },
      { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['umbravalkyrie', 'noctisshade'], turnLimit: 50, lv: 98 },
      { title: 'เวฟ 3 · สุสานดาวฤกษ์', spawn: [['fallenstar', 1], ['cometlancer', 1], ['voidastrologer', 1], ['starlesshound', 1]], lv: 98 },
      { title: 'เวฟ 4 · ประตูสุริยคราสนิรันดร์', spawn: [['fallenstar', 1], ['eclipsewraith', 1], ['nebulamoth', 1], ['cometlancer', 1]], lv: 98 },
      { title: 'ห้องบอส · เซราฟสุริยคราส', spawn: [['seraph', 1]], boss: true, turnLimit: 62, lv: 99 },
    ],
  },
  cards: [
    { id: 'card_eclipsewraith', monster: 'eclipsewraith', slot: 'weapon', tier: 'normal', dungeon: 'd13', mod: { comboDmg: 0.18, luckyDodge: 0.04 }, base: { agi: 3 } },
    { id: 'card_voidastrologer', monster: 'voidastrologer', slot: 'acc', tier: 'normal', dungeon: 'd13', mod: { matk: 36, spellCrit: 0.06 }, base: { int: 3 } },
    { id: 'card_cometlancer', monster: 'cometlancer', slot: 'weapon', tier: 'normal', dungeon: 'd13', mod: { aspd: 0.09, combo: 0.06 }, base: { str: 3 } },
    { id: 'card_starlesshound', monster: 'starlesshound', slot: 'acc', tier: 'normal', dungeon: 'd13', mod: { comboDmg: 0.17, crit: 0.04 }, base: { agi: 3 } },
    { id: 'card_nebulamoth', monster: 'nebulamoth', slot: 'armor', tier: 'normal', dungeon: 'd13', mod: { maxHp: 280, debuffRes: 0.08 }, base: { wis: 3 } },
    { id: 'card_fallenstar', monster: 'fallenstar', slot: 'armor', tier: 'normal', dungeon: 'd13', mod: { def: 28, thorns: 0.1 }, base: { vit: 3 } },
    { id: 'card_umbravalkyrie', monster: 'umbravalkyrie', slot: 'weapon', tier: 'mini', dungeon: 'd13', mod: { comboDmg: 0.22, critMul: 0.24 }, base: { agi: 6 } },
    { id: 'card_noctisshade', monster: 'noctisshade', slot: 'acc', tier: 'mini', dungeon: 'd13', mod: { spellCrit: 0.09, burnTick: 0.05 }, base: { int: 6 } },
    { id: 'card_seraph', monster: 'seraph', slot: 'armor', tier: 'boss', dungeon: 'd13', mod: { debuffRes: 0.16, comboDmg: 0.22, critMul: 0.22 }, pct: { maxHp: 0.22, atk: 0.08, matk: 0.08 } },
  ],
  mats: [
    { id: 'm_d13', name: 'เศษดาราสุริยคราส', icon: '🌘', dungeon: 'd13', boss: false },
    { id: 'b_d13', name: 'มงกุฎเซราฟทมิฬ', icon: '👑', dungeon: 'd13', boss: true },
  ],
  miniRelics: {
    umbravalkyrie: ['wolf', 'trinity'],
    noctisshade: ['harvest', 'queen'],
  },
  miniHints: {
    umbravalkyrie: 'หลบ 2 ครั้งแล้วตีโดนแน่ 3 เทิร์น · ร่ายฝนดารา (รัวหลายฮิตลอก Astral Veil เพื่อสั่ง Stagger + ยกเลิก) · ต่ำกว่า 45% เร็วขึ้นและฟัน 3 ฮิต',
    noctisshade: 'เงาของโนคทิส: ยิงศรนิทรา 2 ฮิตติดไฟ + ชุบลูกน้อง · ครึ่งเลือดดูดค่าสถานะ + เรียกภูตสุริยคราส 2 ตัว (หลบคงที่ 30%) จบให้ไว',
  },
  holyFoes: ['eclipsewraith', 'voidastrologer', 'noctisshade', 'seraph'],
  monSpeed: {
    eclipsewraith: 15, voidastrologer: 12, cometlancer: 13, starlesshound: 16, nebulamoth: 12, fallenstar: 7,
    umbravalkyrie: 13, noctisshade: 12, seraph: 11,
  },
}
