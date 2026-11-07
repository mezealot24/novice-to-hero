// ===== D8 แกนภูเขาไฟ (v80, Lv 60-70) — docs/design/dungeon-8-volcano-core.md =====
// Test: endurance + healing under burn (burn on the hero cuts healing 40%) · death explosions · reflect (reckless hitting hurts).
// Stat monsters like D6: hp / dmg = 1 placeholders, numbers come from statAlloc at the room's Lv (data/mon-stats.ts statMonster);
// def / hit / flee / crit / combo / counter here are BONUSES on top, bodyMul multiplies HP / ATK / M.ATK.
// Only `import type` here (see dungeons/pack.ts).
import type { DungeonPack } from './pack'

/** Every monster id of this dungeon (a union of string literals). */
export type D8Kind = 'magmaslime' | 'salamander' | 'emberbat' | 'obsidiangolem' | 'flamecaller' | 'ashpriestess' | 'ifrit' | 'forgelord' | 'lavatitan'
/** Its mini bosses (MonsterDef.mini). */
export type D8Mini = 'ifrit' | 'forgelord'

export const D8: DungeonPack<D8Kind> = {
  monsters: {
    // ----- normals -----
    magmaslime: { name: 'สไลม์แมกมา', tex: 'magmaslime', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 1, dmg: 1, xp: 17, ai: 'hopper', moveSpeed: 190, radius: 16, zeny: [13, 18], idleMs: [800, 1300],
      bodyMul: { dmg: 1.15 }, onHit: { burn: 1 }, deathBlast: 2 },
    salamander: { name: 'ซาลาแมนเดอร์เพลิง', tex: 'salamander', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 1, dmg: 1, xp: 16, ai: 'dasher', moveSpeed: 560, radius: 15, zeny: [12, 17], idleMs: [500, 900],
      bodyMul: { hp: 1.3, dmg: 1.3 }, combo: 0.1, onHit: { burn: 1 } },
    emberbat: { name: 'ค้างคาวถ่านลุก', tex: 'emberbat', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 1, dmg: 1, xp: 15, ai: 'dasher', moveSpeed: 600, radius: 13, zeny: [11, 16], idleMs: [400, 800],
      bodyMul: { hp: 1.2, dmg: 0.55 }, shots: 2, crit: 0.08, deathBlast: 1.5 },
    obsidiangolem: { name: 'โกเลมออบซิเดียน', tex: 'obsidiangolem', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 1, dmg: 1, xp: 19, ai: 'hopper', moveSpeed: 160, radius: 18, zeny: [15, 20], idleMs: [900, 1400],
      bodyMul: { dmg: 1.2 }, def: 70, reflect: 0.1 },
    flamecaller: { name: 'นักเวทเปลวอัคคี', tex: 'flamecaller', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 18, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [14, 19], idleMs: [700, 1200], magic: true,
      skills: [{ kind: 'bolt', every: 3, pow: 1.3, name: '🔥 ลูกไฟอัคคี', fx: { burn: 2 } }, { kind: 'curse', every: 4, name: 'คำสาปเถ้าร้อน', fx: { weaken: 2 } }] },
    ashpriestess: { name: 'นักบวชเถ้าถ่าน', tex: 'ashpriestess', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 1, dmg: 1, xp: 18, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [14, 19], idleMs: [700, 1200], magic: true,
      skills: [{ kind: 'warcry', every: 3, pow: 0.2, turns: 3, name: 'บทสวดเพลิงปลุกใจ' }, { kind: 'shield', every: 4, pow: 0.1, name: 'ม่านเถ้าถ่าน' }] },
    // ----- mini bosses (1v1 duel) -----
    ifrit: { name: 'อิฟรีต', title: 'เปลวพิโรธแห่งกัลป์', tex: 'ifrit', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 30, ai: 'boss', mini: 'ifrit', moveSpeed: 280, radius: 36, zeny: [130, 170], idleMs: [600, 900],
      bodyMul: { hp: 1.3 }, magic: true, slamMagic: true, def: 20, absorb: 0.25, onHit: { burn: 2 }, chargeEvery: 4, slamMul: 1.3, slamName: 'อัคนีพิโรธ! ปลดปล่อยไฟที่กลืนไว้', slamFx: { burn: 3, silence: 1 }, slamAnim: 'cast', slamColor: 0xff7a2a, charge: true,
      phases: [{ at: 0.5, name: 'ร่างเพลิงแตก! สไลม์แมกมา + กลืนไฟมากขึ้น', summon: ['magmaslime', 2], absorb: 0.35 }] },
    forgelord: { name: 'วัลคราน', title: 'ช่างตีเหล็กลาวา', tex: 'forgelord', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, xp: 30, ai: 'boss', mini: 'forgelord', moveSpeed: 300, radius: 38, zeny: [130, 170], idleMs: [600, 900],
      bodyMul: { hp: 0.85 }, def: 30, lifesteal: 0.15, onHit: { armorBreak: 2 }, chargeEvery: 4, slamMul: 1.9, slamName: 'ค้อนหลอมโลก! ทุบทะลุเกราะ', slamAnim: 'cleave', slamColor: 0xff8a3a, charge: true,
      skills: [{ kind: 'warcry', every: 3, pow: 0.2, turns: 99, self: true, name: 'ตีเหล็กร้อน (สะสม)' }],
      phases: [{ at: 0.3, name: 'เตาหลอมเดือด! เร็วขึ้นมาก', speed: 1.4 }] },
    // ----- boss -----
    lavatitan: { name: 'อัคนิส', title: 'ไททันใจกลางพิภพ', tex: 'lavatitan', statAlloc: { str: 4, vit: 3, int: 2, wis: 1 }, hp: 1, dmg: 1, xp: 0, ai: 'boss', moveSpeed: 220, radius: 50, zeny: [320, 420], idleMs: [700, 1000],
      bodyMul: { hp: 0.9, dmg: 0.85, matk: 1.1 }, def: 30, crit: 0.1, onHit: { burn: 1 }, slamName: 'ภูเขาไฟระเบิด!', slamMul: 1.7, slamMagic: true, slamFx: { burn: 3, armorBreak: 2 }, slamAnim: 'stomp', slamColor: 0xff5a1a, charge: true,
      skills: [{ kind: 'bolt', every: 3, hits: 3, pow: 0.5, name: '🌋 ฝนหินหลอมเหลว', fx: { burn: 1 } }],
      phases: [{ at: 0.66, name: 'เปลือกออบซิเดียน! สะท้อน + โล่ + โกเลมคุ้มกัน', reflect: 0.08, shield: 0.1, summon: ['obsidiangolem', 1] },
        { at: 0.33, name: 'แกนพิภพปะทุ! เร็วขึ้น ชาร์จถี่ + ค้างคาวถ่านลุก', speed: 1.3, dmg: 1.2, chargeEvery: 2, cleanse: true, summon: ['emberbat', 2] }] },
  },
  dungeon: {
    // D8 (v80): fixed level band, stat monsters (data/mon-stats.ts), no Hero Power scaling
    id: 'd8', name: 'แกนภูเขาไฟ', boss: 'ไททันอัคนิส', tier: 8, sky: [0x2a0806, 0xe0582a], hills: 0xb04a2a, unlock: 'd7', level: [60, 70],
    rooms: [
      { title: 'เวฟ 1 · ปากปล่องลาวา', spawn: [['magmaslime', 2], ['salamander', 1]], lv: 60 },
      { title: 'เวฟ 2 · โถงเถ้าถ่าน', spawn: [['flamecaller', 1], ['emberbat', 2], ['ashpriestess', 1]], lv: 62 },
      { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['ifrit', 'forgelord'], turnLimit: 45, lv: 66 },
      { title: 'เวฟ 3 · ธารลาวาไหล', spawn: [['obsidiangolem', 1], ['salamander', 2], ['magmaslime', 1]], lv: 65 },
      { title: 'เวฟ 4 · ประตูแกนพิภพ', spawn: [['obsidiangolem', 1], ['flamecaller', 1], ['ashpriestess', 1]], lv: 68 },
      { title: 'ห้องบอส · ไททันอัคนิส', spawn: [['lavatitan', 1]], boss: true, turnLimit: 52, lv: 70 },
    ],
  },
  cards: [
    { id: 'card_magmaslime', monster: 'magmaslime', slot: 'armor', tier: 'normal', dungeon: 'd8', mod: { maxHp: 160, debuffRes: 0.04 }, base: { vit: 2 } },
    { id: 'card_salamander', monster: 'salamander', slot: 'weapon', tier: 'normal', dungeon: 'd8', mod: { comboDmg: 0.1, vsBurn: 0.05 }, base: { agi: 2 } },
    { id: 'card_emberbat', monster: 'emberbat', slot: 'acc', tier: 'normal', dungeon: 'd8', mod: { critMul: 0.13, crit: 0.02 } },
    { id: 'card_obsidiangolem', monster: 'obsidiangolem', slot: 'armor', tier: 'normal', dungeon: 'd8', mod: { def: 13, thorns: 0.08 } },
    { id: 'card_flamecaller', monster: 'flamecaller', slot: 'weapon', tier: 'normal', dungeon: 'd8', mod: { matk: 18, vsBurn: 0.06 } },
    { id: 'card_ashpriestess', monster: 'ashpriestess', slot: 'acc', tier: 'normal', dungeon: 'd8', mod: { healAmp: 0.1, debuffRes: 0.05 }, base: { wis: 2 } },
    { id: 'card_ifrit', monster: 'ifrit', slot: 'acc', tier: 'mini', dungeon: 'd8', mod: { spellCrit: 0.05, vsBurn: 0.1 }, base: { int: 5 } },
    { id: 'card_forgelord', monster: 'forgelord', slot: 'weapon', tier: 'mini', dungeon: 'd8', mod: { lifesteal: 0.05, pskill: 0.1 }, base: { str: 4 } },
    { id: 'card_lavatitan', monster: 'lavatitan', slot: 'armor', tier: 'boss', dungeon: 'd8', mod: { debuffRes: 0.1, healAmp: 0.1 }, pct: { maxHp: 0.12 } },
  ],
  mats: [
    { id: 'm_d8', name: 'หินหลอมเหลว', icon: '⛰️', dungeon: 'd8', boss: false },
    { id: 'b_d8', name: 'แกนอัคนีไททัน', icon: '🌋', dungeon: 'd8', boss: true },
  ],
  miniRelics: {
    ifrit: ['hellfire', 'thornaura'],
    forgelord: ['bloodpact', 'executioner'],
  },
  miniHints: {
    ifrit: 'กลืนดาเมจที่โดน 25% (🔮) แล้วชาร์จยิงคืน + ไฟ 3 + ใบ้ · ไฟ/พิษไม่ถูกกลืน · ตีโดนเราติดไฟ (ฮีลลด 40%) · ครึ่งเลือดกลืน 35% + สไลม์แมกมา 2 ตัว (ตายแล้วระเบิด)',
    forgelord: 'ทุก 3 เทิร์นตีเหล็กร้อน แรงขึ้นสะสม! ต้องจบไว · ดูดเลือด 15% (ไฟตัดฮีลมันได้) · ตีโดน = เกราะแตก · ต่ำกว่า 30% เร็วมาก',
  },
  holyFoes: [],
  monSpeed: { magmaslime: 8, salamander: 14, emberbat: 17, obsidiangolem: 7, flamecaller: 10, ashpriestess: 10, ifrit: 12, forgelord: 12, lavatitan: 10 },
}
