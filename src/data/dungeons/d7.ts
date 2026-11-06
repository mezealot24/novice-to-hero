// ===== D7 ❄️ ยอดเขาน้ำแข็งนิรันดร์ (Lv 50-60, v79) — docs/design/dungeon-7-ice-peak.md =====
// Test: status resistance (freeze / slow) + kill fast before you get frozen. Stat monsters like D6: hp / dmg = 1 placeholders,
// numbers come from statAlloc at the room's Lv (data/mon-stats.ts statMonster); def / hit / flee / crit / combo / counter are bonuses on top.
// Only `import type` here (see dungeons/pack.ts).
import type { DungeonPack } from './pack'

/** Every monster id of this dungeon (a union of string literals). */
export type D7Kind = 'yeti' | 'frostwolf' | 'icewisp' | 'icegolem' | 'snowharpy' | 'frostshaman' | 'snowqueen' | 'mammoth' | 'frostwyrm'
/** Its mini bosses (MonsterDef.mini). */
export type D7Mini = 'snowqueen' | 'mammoth'

export const D7: DungeonPack<D7Kind> = {
  monsters: {
    // ----- normals (bruiser / skirmisher / caster / tank / assassin / support) -----
    yeti: { name: 'เยติคลั่งหิมะ', tex: 'yeti', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, xp: 16, ai: 'hopper', moveSpeed: 210, radius: 18, zeny: [12, 17], idleMs: [700, 1200],
      bodyMul: { hp: 1.2 }, def: 12, onHit: { freeze: 30 }, counter: 0.1 },
    frostwolf: { name: 'หมาป่าลมเหนือ', tex: 'frostwolf', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 1, dmg: 1, xp: 13, ai: 'dasher', moveSpeed: 570, radius: 15, zeny: [10, 14], idleMs: [500, 900],
      bodyMul: { hp: 1.3, dmg: 1.35 }, combo: 0.12, onHit: { slow: 1 } },
    icewisp: { name: 'ภูตเกล็ดน้ำแข็ง', tex: 'icewisp', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 15, ai: 'dasher', moveSpeed: 500, radius: 13, zeny: [11, 15], idleMs: [500, 900], magic: true,
      flee: 15, skills: [{ kind: 'bolt', every: 3, pow: 1.3, name: '❄️ หอกเกล็ดน้ำแข็ง', fx: { freeze: 40 } }] },
    icegolem: { name: 'โกเลมธารน้ำแข็ง', tex: 'icegolem', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 1, dmg: 1, xp: 16, ai: 'hopper', moveSpeed: 160, radius: 18, zeny: [12, 17], idleMs: [900, 1400],
      bodyMul: { dmg: 1.15 }, def: 60, iceSkin: true, skills: [{ kind: 'shield', every: 4, pow: 0.12, name: 'เกราะธารน้ำแข็ง', scale: { stat: 'vit' } }] },
    snowharpy: { name: 'ฮาร์ปี้พายุหิมะ', tex: 'snowharpy', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 1, dmg: 1, xp: 15, ai: 'dasher', moveSpeed: 540, radius: 15, zeny: [11, 15], idleMs: [500, 900],
      bodyMul: { hp: 1.3, dmg: 0.5 }, def: 10, shots: 2, crit: 0.06 }, // 2 shots a turn (each rolls Flee + crit on its own): x0.5 each
    frostshaman: { name: 'หมอผีหิมะ', tex: 'frostshaman', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 1, dmg: 1, xp: 15, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [11, 15], idleMs: [700, 1200], magic: true,
      skills: [{ kind: 'heal', every: 2, pow: 0.15, name: 'มนต์หิมะสมานแผล' }, { kind: 'curse', every: 4, name: 'คำสาปลมเหนือ', fx: { slow: 2 } }] },
    // ----- minis (duel: one of the two) -----
    snowqueen: { name: 'เซลีน', title: 'ราชินีหิมะนิรันดร์', tex: 'snowqueen', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 26, ai: 'boss', mini: 'snowqueen', moveSpeed: 260, radius: 36, zeny: [110, 145], idleMs: [600, 900],
      bodyMul: { hp: 1.28, matk: 0.9 }, magic: true, slamMagic: true, def: 20, crit: 0.08, chargeEvery: 4, slamMul: 1.5, slamName: 'พายุหิมะนิรันดร์! แช่แข็งทั้งตัว', slamFx: { freeze: 100 }, slamAnim: 'cast', slamColor: 0xbfe8ff, charge: true,
      skills: [{ kind: 'bolt', every: 3, hits: 3, pow: 0.5, name: '❄️ เกล็ดน้ำแข็งสามดวง', fx: { freeze: 30 } }],
      phases: [{ at: 0.5, name: 'ม่านหิมะนิรันดร์! โล่น้ำแข็ง + ภูตเกล็ดน้ำแข็ง', shield: 0.15, summon: ['icewisp', 2] }] },
    mammoth: { name: 'กรอมม์', title: 'แมมมอธศึกงาเหล็ก', tex: 'mammoth', statAlloc: { str: 4, vit: 4, dex: 1, agi: 1 }, hp: 1, dmg: 1, xp: 26, ai: 'boss', mini: 'mammoth', moveSpeed: 240, radius: 40, zeny: [110, 145], idleMs: [700, 1000],
      bodyMul: { hp: 0.65, dmg: 0.9 }, // VIT-heavy body + def 40: P.DEF does the tanking, raw HP stays near the other mini
      def: 40, chargeEvery: 3, slamMul: 1.6, slamName: 'กระทืบธารน้ำแข็ง! พื้นแตก แข็งทั้งตัว', slamFx: { freeze: 100, armorBreak: 2 }, slamAnim: 'stomp', slamColor: 0x9fe3ff, charge: true,
      phases: [{ at: 0.4, name: 'คลั่งงาเหล็ก! เร็วขึ้น แรงขึ้น สลัดน้ำแข็ง', speed: 1.3, dmg: 1.15, cleanse: true }] },
    // ----- boss -----
    frostwyrm: { name: 'ไฮม์เฟรอส', title: 'จ้าวมังกรยอดหิมะ', tex: 'frostwyrm', statAlloc: { str: 3, int: 3, vit: 3, wis: 2, agi: 1 }, hp: 1, dmg: 1, xp: 0, ai: 'boss', moveSpeed: 240, radius: 48, zeny: [270, 360], idleMs: [700, 1000],
      speedMul: 0.8, def: 25, crit: 0.1, onHit: { slow: 1 }, slamName: 'ลมหายใจศูนย์สัมบูรณ์!', slamMul: 1.7, slamMagic: true, slamFx: { freeze: 100 }, slamAnim: 'cast', slamColor: 0xbfefff, charge: true,
      skills: [{ kind: 'bolt', every: 3, hits: 4, pow: 0.45, name: '❄️ พายุเกล็ดมังกร', fx: { freeze: 25 } }, { kind: 'curse', every: 5, name: 'คำสาปน้ำแข็งนิรันดร์', fx: { armorBreak: 2, slow: 2 } }],
      phases: [{ at: 0.6, name: 'เกล็ดมังกรแข็งตัว! โล่น้ำแข็ง + โกเลมเฝ้ารัง', shield: 0.12, summon: ['icegolem', 1] },
        { at: 0.3, name: 'ศูนย์สัมบูรณ์! เร็วขึ้น ชาร์จถี่', speed: 1.25, dmg: 1.15, chargeEvery: 2, cleanse: true }] },
  },
  dungeon: {
    id: 'd7', name: 'ยอดเขาน้ำแข็งนิรันดร์', boss: 'จ้าวมังกรไฮม์เฟรอส', tier: 7, sky: [0x14223e, 0xa8d4f0], hills: 0xdff2ff, unlock: 'd6', level: [50, 60],
    rooms: [
      { title: 'เวฟ 1 · เชิงเขาหิมะ', spawn: [['yeti', 2], ['frostwolf', 1]], lv: 50 },
      { title: 'เวฟ 2 · หุบผาเกล็ดน้ำแข็ง', spawn: [['icewisp', 2], ['snowharpy', 1], ['frostshaman', 1]], lv: 52 },
      { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['snowqueen', 'mammoth'], turnLimit: 45, lv: 56 },
      { title: 'เวฟ 3 · ธารน้ำแข็งพันปี', spawn: [['icegolem', 1], ['frostwolf', 2], ['icewisp', 1]], lv: 55 },
      { title: 'เวฟ 4 · ประตูรังมังกร', spawn: [['yeti', 1], ['icegolem', 1], ['frostshaman', 1]], lv: 58 },
      { title: 'ห้องบอส · จ้าวมังกรไฮม์เฟรอส', spawn: [['frostwyrm', 1]], boss: true, turnLimit: 50, lv: 60 },
    ],
  },
  // power ≈ D6 cards x1.15, themed on freeze / slow resistance
  cards: [
    { id: 'card_yeti', monster: 'yeti', slot: 'armor', tier: 'normal', dungeon: 'd7', mod: { maxHp: 140, tenacity: 0.06 }, base: { vit: 2 } },
    { id: 'card_frostwolf', monster: 'frostwolf', slot: 'weapon', tier: 'normal', dungeon: 'd7', mod: { aspd: 0.07 }, base: { agi: 2 } },
    { id: 'card_icewisp', monster: 'icewisp', slot: 'acc', tier: 'normal', dungeon: 'd7', mod: { matk: 16, vsChill: 0.06 } },
    { id: 'card_icegolem', monster: 'icegolem', slot: 'armor', tier: 'normal', dungeon: 'd7', mod: { def: 12, comboDR: 0.06 } },
    { id: 'card_snowharpy', monster: 'snowharpy', slot: 'weapon', tier: 'normal', dungeon: 'd7', mod: { crit: 0.04, critMul: 0.06 } },
    { id: 'card_frostshaman', monster: 'frostshaman', slot: 'acc', tier: 'normal', dungeon: 'd7', mod: { debuffRes: 0.06, healAmp: 0.05 }, base: { wis: 2 } },
    { id: 'card_snowqueen', monster: 'snowqueen', slot: 'acc', tier: 'mini', dungeon: 'd7', mod: { spellCrit: 0.05, tenacity: 0.1 }, base: { int: 4 } },
    { id: 'card_mammoth', monster: 'mammoth', slot: 'weapon', tier: 'mini', dungeon: 'd7', mod: { pskill: 0.1, counter: 0.06 }, base: { str: 3, vit: 1 } },
    { id: 'card_frostwyrm', monster: 'frostwyrm', slot: 'armor', tier: 'boss', dungeon: 'd7', mod: { debuffRes: 0.1, critDR: 0.1 }, pct: { maxHp: 0.1 } },
  ],
  mats: [
    { id: 'm_d7', name: 'ขนเยติน้ำแข็ง', icon: '🧶', dungeon: 'd7', boss: false },
    { id: 'b_d7', name: 'หัวใจมังกรน้ำแข็ง', icon: '💎', dungeon: 'd7', boss: true },
  ],
  miniRelics: { snowqueen: ['iceage', 'aegis'], mammoth: ['executioner', 'riposte'] },
  miniHints: {
    snowqueen: 'สายเวท M.DEF สูง (สายกายภาพได้เปรียบ) · เกล็ดน้ำแข็ง 3 ลูกทุก 3 เทิร์น ติดแข็ง · ชาร์จพายุหิมะ = แข็งทั้งเทิร์น · ครึ่งเลือดได้โล่ + เรียกภูตน้ำแข็ง 2 ตัว',
    mammoth: 'หนังหนา P.DEF สูง (เวท/คริทะลุ) · ทุก 3 เทิร์นชาร์จกระทืบ = แข็งทั้งเทิร์น + เกราะแตก เตรียมโล่ · ต่ำกว่า 40% คลั่ง เร็วขึ้น แรงขึ้น ล้างดีบัฟ',
  },
  holyFoes: [],
  monSpeed: { yeti: 10, frostwolf: 14, icewisp: 13, icegolem: 8, snowharpy: 15, frostshaman: 10, snowqueen: 12, mammoth: 11, frostwyrm: 11 },
}
