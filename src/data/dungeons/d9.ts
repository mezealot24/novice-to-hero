// ===== D9 ⚙️ ป้อมจักรกลลอยฟ้า (v81, Lv 70-80) — docs/design/dungeon-9-sky-fortress.md =====
// Test: target choice (high P.DEF machines next to high M.DEF machines in the same wave) · Hit / DEX (fixed flee, multi-shot) ·
// trueSight vs AGI builds. Stat monsters like D6: hp / dmg = 1 placeholders, numbers come from statAlloc at the room's Lv
// (data/mon-stats.ts statMonster); def / hit / flee / crit / combo / counter here are BONUSES on top, bodyMul multiplies HP / ATK / M.ATK.
// Only `import type` here (see dungeons/pack.ts).
import type { DungeonPack } from './pack'

/** Every monster id of this dungeon (a union of string literals). */
export type D9Kind = 'clockknight' | 'gundrone' | 'sparkcoil' | 'steamtank' | 'sawbot' | 'repairbot' | 'gearmarshal' | 'aethermage' | 'omnicore'
/** Its mini bosses (MonsterDef.mini). */
export type D9Mini = 'gearmarshal' | 'aethermage'

export const D9: DungeonPack<D9Kind> = {
  monsters: {
    // ----- normals (bruiser / skirmisher / caster / tank / assassin / support) -----
    clockknight: { name: 'อัศวินเฟือง', tex: 'clockknight', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, xp: 20, ai: 'hopper', moveSpeed: 210, radius: 18, zeny: [15, 21], idleMs: [700, 1200],
      bodyMul: { hp: 1.3, dmg: 1.2 }, def: 80, counter: 0.15, onHit: { armorBreak: 1 } },
    gundrone: { name: 'โดรนปืนกล', tex: 'gundrone', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 1, dmg: 1, xp: 18, ai: 'dasher', moveSpeed: 560, radius: 14, zeny: [14, 19], idleMs: [500, 900],
      bodyMul: { hp: 1.25, dmg: 0.47 }, shots: 3, fixedFlee: 0.25 }, // 3 shots a turn (each the full hit): x0.47 each · 25% of hero hits miss whatever Hit is
    sparkcoil: { name: 'คอยล์สายฟ้า', tex: 'sparkcoil', statAlloc: { int: 4, wis: 4, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 19, ai: 'hopper', moveSpeed: 180, radius: 15, zeny: [15, 20], idleMs: [800, 1300], magic: true,
      bodyMul: { hp: 1.1, matk: 1.15 }, skills: [{ kind: 'bolt', every: 3, hits: 3, pow: 0.5, name: '⚡ สายฟ้าสามขด', fx: { silence: 1 } }] },
    steamtank: { name: 'รถถังไอน้ำ', tex: 'steamtank', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 1, dmg: 1, xp: 21, ai: 'hopper', moveSpeed: 150, radius: 19, zeny: [16, 22], idleMs: [900, 1400],
      bodyMul: { hp: 1.1, dmg: 1.3 }, def: 120, skills: [{ kind: 'shield', every: 4, pow: 0.1, name: 'ม่านไอน้ำแรงดันสูง', scale: { stat: 'vit' } }] },
    sawbot: { name: 'หุ่นใบเลื่อย', tex: 'sawbot', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 1, dmg: 1, xp: 18, ai: 'dasher', moveSpeed: 580, radius: 15, zeny: [14, 19], idleMs: [400, 800],
      bodyMul: { hp: 1.35, dmg: 1.2 }, crit: 0.1, onHit: { armorBreak: 2 }, trueSight: { after: 2, turns: 2 } },
    repairbot: { name: 'หุ่นซ่อมบำรุง', tex: 'repairbot', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 1, dmg: 1, xp: 19, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [15, 20], idleMs: [700, 1200], magic: true,
      bodyMul: { hp: 1.1, matk: 1.1 }, skills: [{ kind: 'heal', every: 2, pow: 0.15, name: 'ซ่อมด่วน' }, { kind: 'revive', every: 4, pow: 0.4, name: 'รีบูตระบบ' }] },
    // ----- minis (duel: one of the two) -----
    gearmarshal: { name: 'บรอนซ์', title: 'จอมพลฟันเฟือง', tex: 'gearmarshal', statAlloc: { dex: 5, agi: 2, luk: 2, str: 1 }, hp: 1, dmg: 1, xp: 34, ai: 'boss', mini: 'gearmarshal', moveSpeed: 300, radius: 36, zeny: [150, 195], idleMs: [600, 900],
      bodyMul: { hp: 2, dmg: 0.48 }, speedMul: 0.85, def: 30, shots: 3, trueSight: { after: 2, turns: 3 }, // DEX/LUK/AGI body is frail: HP x2 · 3 shots a turn: x0.48 each · AGI 46 is fast: x0.85
      chargeEvery: 4, slamMul: 5.2, slamScale: { stat: 'dex' }, slamName: 'ปืนใหญ่รางเหล็ก! ล็อกเป้าแล้ว', slamFx: { armorBreak: 2 }, slamAnim: 'shot', slamColor: 0xffc04a, charge: true,
      phases: [{ at: 0.5, name: 'เรียกฝูงโดรน! โดรนปืนกล 2 ลำ', summon: ['gundrone', 2] }] },
    aethermage: { name: 'ยูเรีย', title: 'นักประดิษฐ์อีเธอร์', tex: 'aethermage', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 34, ai: 'boss', mini: 'aethermage', moveSpeed: 280, radius: 36, zeny: [150, 195], idleMs: [600, 900],
      bodyMul: { hp: 1.5, matk: 1.08 }, magic: true, slamMagic: true, def: 20, absorb: 0.3, reflect: 0.08,
      chargeEvery: 4, slamMul: 1.25, slamName: 'ปืนอีเธอร์โอเวอร์โหลด! ยิงพลังที่เก็บไว้คืน', slamAnim: 'cast', slamColor: 0x7ad8ff, charge: true,
      skills: [{ kind: 'curse', every: 5, name: 'คลื่นรบกวนสัญญาณ', fx: { silence: 2 } }], // every 5, not 4: a skill on a charge turn eats the charge (BattleScene monTurn)
      phases: [{ at: 0.5, name: 'สนามพลังอีเธอร์! โล่ 15%', shield: 0.15 }] },
    // ----- boss -----
    omnicore: { name: 'ออมนิคอร์', title: 'หัวใจป้อมลอยฟ้า', tex: 'omnicore', statAlloc: { str: 3, int: 3, vit: 3, dex: 2, wis: 2 }, hp: 1, dmg: 1, xp: 0, ai: 'boss', moveSpeed: 220, radius: 52, zeny: [370, 480], idleMs: [700, 1000],
      bodyMul: { hp: 1.2, dmg: 0.6, matk: 1.15 }, def: 35, crit: 0.08, shots: 2, // 2 shots a turn: x0.6 each
      chargeEvery: 4, slamName: 'ลำแสงทำลายล้าง!', slamMul: 1.6, slamMagic: true, slamFx: { armorBreak: 2 }, slamAnim: 'cast', slamColor: 0x7ad8ff, charge: true,
      skills: [{ kind: 'strike', every: 3, hits: 3, pow: 0.9, name: '⚙️ หมัดลูกสูบสามจังหวะ', fx: { armorBreak: 1 } }],
      phases: [{ at: 0.6, name: 'โหมดอีเธอร์! ยิงเวท + สะท้อน + หุ่นซ่อมบำรุง', reflect: 0.1, summon: ['repairbot', 1],
        skills: [{ kind: 'bolt', every: 3, hits: 3, pow: 0.5, name: '🔷 ลำแสงอีเธอร์สามสาย' }] }, // every 3 vs charge every 4: meets only on turn 12, 24 ...
        { at: 0.3, name: 'โอเวอร์ไดรฟ์! เร็วขึ้น ชาร์จถี่ + หุ่นใบเลื่อย', speed: 1.35, dmg: 1.15, chargeEvery: 2, cleanse: true, summon: ['sawbot', 2] }] },
  },
  dungeon: {
    // D9 (v81): fixed level band, stat monsters (data/mon-stats.ts), no Hero Power scaling
    id: 'd9', name: 'ป้อมจักรกลลอยฟ้า', boss: 'ออมนิคอร์', tier: 9, sky: [0x1a2a44, 0x8fb4d8], hills: 0xb08a4a, unlock: 'd8', level: [70, 80],
    rooms: [
      { title: 'เวฟ 1 · ลานจอดเรือเหาะ', spawn: [['clockknight', 2], ['gundrone', 1]], lv: 70 },
      { title: 'เวฟ 2 · ห้องหม้อไอน้ำ', spawn: [['sparkcoil', 1], ['steamtank', 1], ['repairbot', 1], ['gundrone', 1]], lv: 72 },
      { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['gearmarshal', 'aethermage'], turnLimit: 45, lv: 76 },
      { title: 'เวฟ 3 · สายพานเฟืองยักษ์', spawn: [['sawbot', 2], ['clockknight', 1], ['sparkcoil', 1]], lv: 75 },
      { title: 'เวฟ 4 · ประตูแกนพลัง', spawn: [['steamtank', 1], ['sawbot', 1], ['repairbot', 1]], lv: 78 },
      { title: 'ห้องบอส · ออมนิคอร์', spawn: [['omnicore', 1]], boss: true, turnLimit: 54, lv: 80 },
    ],
  },
  // power ≈ D8 cards x1.15, themed on Hit / multi-shot / P.DEF vs M.DEF
  cards: [
    { id: 'card_clockknight', monster: 'clockknight', slot: 'armor', tier: 'normal', dungeon: 'd9', mod: { def: 15, counterDR: 0.08 } },
    { id: 'card_gundrone', monster: 'gundrone', slot: 'weapon', tier: 'normal', dungeon: 'd9', mod: { hit: 10, aspd: 0.05 }, base: { dex: 2 } },
    { id: 'card_sparkcoil', monster: 'sparkcoil', slot: 'acc', tier: 'normal', dungeon: 'd9', mod: { matk: 20, mdef: 0.03 } },
    { id: 'card_steamtank', monster: 'steamtank', slot: 'armor', tier: 'normal', dungeon: 'd9', mod: { maxHp: 185, shieldAmp: 0.06 }, base: { vit: 2 } },
    { id: 'card_sawbot', monster: 'sawbot', slot: 'weapon', tier: 'normal', dungeon: 'd9', mod: { critMul: 0.1, pskill: 0.06 }, base: { str: 2 } },
    { id: 'card_repairbot', monster: 'repairbot', slot: 'acc', tier: 'normal', dungeon: 'd9', mod: { healAmp: 0.12, debuffRes: 0.05 }, base: { wis: 2 } },
    { id: 'card_gearmarshal', monster: 'gearmarshal', slot: 'weapon', tier: 'mini', dungeon: 'd9', mod: { hit: 14, aspd: 0.06 }, base: { dex: 5 } },
    { id: 'card_aethermage', monster: 'aethermage', slot: 'acc', tier: 'mini', dungeon: 'd9', mod: { spellCrit: 0.05, mdef: 0.05 }, base: { int: 5 } },
    { id: 'card_omnicore', monster: 'omnicore', slot: 'armor', tier: 'boss', dungeon: 'd9', mod: { def: 12, mdef: 0.05, debuffRes: 0.1 }, pct: { maxHp: 0.13 } },
  ],
  mats: [
    { id: 'm_d9', name: 'เฟืองทองเหลือง', icon: '⚙️', dungeon: 'd9', boss: false },
    { id: 'b_d9', name: 'แกนพลังอีเธอร์', icon: '🔷', dungeon: 'd9', boss: true },
  ],
  miniRelics: { gearmarshal: ['storm', 'haste'], aethermage: ['thornaura', 'iceage'] },
  miniHints: {
    gearmarshal: 'ยิง 3 นัดทุกเทิร์น (Flee ต้านได้ทีละนัด) แต่หลบ 2 ครั้ง = ตาเหยี่ยว ตีโดนแน่ 3 เทิร์น · ทุก 4 เทิร์นชาร์จปืนใหญ่รางเหล็ก (หลบไม่ได้ + เกราะแตก) เตรียมโล่ · ครึ่งเลือดเรียกโดรนปืนกล 2 ลำ',
    aethermage: 'กลืนดาเมจ 30% (🔮) แล้วชาร์จยิงคืน + สะท้อน 8% (🪞) · ตีแรงทีเดียว = เจ็บเอง ใช้ DoT ดีกว่า · ทุก 4 เทิร์นสาปใบ้ 2 เทิร์น · ครึ่งเลือดได้โล่ 15%',
  },
  holyFoes: [],
  monSpeed: { clockknight: 10, gundrone: 15, sparkcoil: 9, steamtank: 7, sawbot: 15, repairbot: 10, gearmarshal: 13, aethermage: 12, omnicore: 10 },
}
