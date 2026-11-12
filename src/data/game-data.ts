import { PACKS } from './dungeons'
import type { HitFx, MonSkill, MonsterKind } from './monsters'
export * from './ui-tokens'
export * from './stats'
export * from './perk-tags'
export * from './monsters'
// ===== All tunable numbers live here, so balance changes never touch game logic. =====

export interface RoomDef {
  title: string
  spawn: [MonsterKind, number][]
  boss?: boolean
  turnLimit?: number // hero turns before the fight is lost (default BATTLE.turnLimit)
  lv?: number // level dungeon (D6+): monster level in this room (default: spread over DungeonDef.level)
  mini?: boolean // 1v1 duel: spawn is ignored, one mini boss is drawn from MINI_POOL (data/relics.ts)
  miniPool?: MonsterKind[] // this duel draws from these instead of MINI_POOL (Dungeon 4-5)
}

export interface DungeonDef {
  id: string
  name: string
  boss: string
  tier: number // event rewards scale with this
  sky: [number, number] // gradient top, bottom
  hills: number // tint on the far hills / trees
  unlock: 'none' | 'job' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8' | 'd9' | 'd10' // 'job' = after the first job change, 'dN' = after clearing dungeon N
  rooms: RoomDef[]
  level?: [number, number] // D6+: fixed monster level band; its stat monsters use data/mon-stats.ts (no Hero Power scaling)
}

export const DUNGEONS: DungeonDef[] = [{
  id: 'd1', name: 'ทุ่งเจลล็อป', boss: 'ราชาเจลล็อป', tier: 1, sky: [0x2c3a6e, 0xe9a46a], hills: 0xffffff, unlock: 'none',
  rooms: [
    { title: 'ห้อง 1 · ทุ่งหญ้า', spawn: [['jellop', 4]] },
    { title: 'ห้อง 2 · ทางเดินป่า', spawn: [['jellop', 3], ['wolf', 1]] },
    { title: 'ห้อง 3 · ฝูงหมาป่า', spawn: [['jellop', 3], ['wolf', 2]] },
    { title: 'ห้องบอส · ราชาเจลล็อป', spawn: [['king', 1]], boss: true, turnLimit: 34 }, // boss buff v1: limits grow with boss HP
  ],
}, {
  id: 'd2', name: 'ป่าหมาป่าเงา', boss: 'จ่าฝูงเงา', tier: 2, sky: [0x141a3a, 0x6a4a8a], hills: 0x8a7ab8, unlock: 'job',
  rooms: [
    { title: 'เวฟ 1 · ปากถ้ำค้างคาว', spawn: [['bat', 3], ['shroom', 1]] },
    { title: 'เวฟ 2 · ดงเห็ดสปอร์', spawn: [['shroom', 2], ['bat', 1], ['dewsprite', 1]] },
    { title: 'เวฟ 3 · ทางหมูป่า', spawn: [['boar', 1], ['shadowwolf', 1], ['bat', 1]] },
    { title: 'เวฟ 4 · ฝูงหมาป่าเงา', spawn: [['shadowwolf', 2], ['shroom', 1], ['dewsprite', 1]] },
    { title: 'เวฟ 5 · หน้าถ้ำจ่าฝูง', spawn: [['boar', 2], ['shadowwolf', 1], ['shroom', 1]] },
    { title: 'ห้องบอส · จ่าฝูงเงา', spawn: [['alpha', 1]], boss: true, turnLimit: 36 },
  ],
}, {
  id: 'd3', name: 'ซากป้อมวีรชน', boss: 'อัศวินมรณะ', tier: 3, sky: [0x1a0f22, 0x8a3a3a], hills: 0xb07a7a, unlock: 'd2',
  rooms: [
    { title: 'เวฟ 1 · ประตูป้อม', spawn: [['skeleton', 2], ['wisp', 1]] },
    { title: 'เวฟ 2 · ลานหิน', spawn: [['gargoyle', 1], ['skeleton', 1], ['wisp', 1], ['bonepriest', 1]] },
    { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, turnLimit: 40 },
    { title: 'เวฟ 3 · ระเบียงผี', spawn: [['wisp', 3], ['skeleton', 1]] },
    { title: 'เวฟ 4 · หน้าบัลลังก์', spawn: [['gargoyle', 2], ['skeleton', 1], ['bonepriest', 1]] },
    { title: 'ห้องบอส · อัศวินมรณะ', spawn: [['deathknight', 1]], boss: true, turnLimit: 46 },
  ],
}, {
  id: 'd4', name: 'บึงพิษมรกต', boss: 'ไฮดรามรกต', tier: 4, sky: [0x0f2a22, 0x5a8a3a], hills: 0x6ab07a, unlock: 'd3',
  rooms: [
    { title: 'เวฟ 1 · ริมบึง', spawn: [['toad', 2], ['lizardshaman', 1]] },
    { title: 'เวฟ 2 · รังต่อ', spawn: [['hornet', 2], ['turtleguard', 1]] },
    { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['venomqueen', 'frostgiant'], turnLimit: 45 },
    { title: 'เวฟ 3 · ดงคางคกระเบิด', spawn: [['bloater', 2], ['turtleguard', 1], ['hornet', 1]] },
    { title: 'เวฟ 4 · กำแพงกระดอง', spawn: [['turtleguard', 2], ['lizardshaman', 1], ['toad', 1]] },
    { title: 'ห้องบอส · ไฮดรามรกต', spawn: [['hydra', 1]], boss: true, turnLimit: 50 },
  ],
}, {
  id: 'd5', name: 'บัลลังก์อเวจี', boss: 'จอมลิชโมรเดคัส', tier: 5, sky: [0x0a0612, 0x6a1a3a], hills: 0x9a4a6a, unlock: 'd4',
  rooms: [
    { title: 'เวฟ 1 · ประตูนรก', spawn: [['hellknight', 1], ['imp', 1]] },
    { title: 'เวฟ 2 · โถงคำสาป', spawn: [['hexwitch', 1], ['necropriest', 1], ['imp', 1]] },
    { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['mirage', 'warlord'], turnLimit: 45 },
    { title: 'เวฟ 3 · ระเบียงกระจก', spawn: [['wraith', 2], ['imp', 1], ['hexwitch', 1]] },
    { title: 'เวฟ 4 · กองทัพศพ', spawn: [['hellknight', 2], ['necropriest', 1], ['imp', 1]] },
    { title: 'ห้องบอส · จอมลิชโมรเดคัส', spawn: [['lich', 1]], boss: true, turnLimit: 56 },
  ],
}, {
  // D6+ (Q 2026-11-04): fixed level band, monsters with 7 base stats (data/mon-stats.ts), no Hero Power scaling
  id: 'd6', name: 'สุสานทรายกษัตริย์', boss: 'ราชันย์ทรายเนเฟรู', tier: 6, sky: [0x3a2410, 0xe8b060], hills: 0xd8a860, unlock: 'd5', level: [40, 50],
  rooms: [
    { title: 'เวฟ 1 · ประตูสุสาน', spawn: [['mummy', 2], ['jackal', 1]], lv: 40 },
    { title: 'เวฟ 2 · ทางเดินอักษรภาพ', spawn: [['sandscorp', 2], ['dunewraith', 1], ['sunpriest', 1]], lv: 42 },
    { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['sphinx', 'jackallord'], turnLimit: 45, lv: 46 },
    { title: 'เวฟ 3 · ห้องเก็บสมบัติ', spawn: [['scarab', 1], ['jackal', 2], ['dunewraith', 1]], lv: 45 },
    { title: 'เวฟ 4 · หน้าห้องบรรทม', spawn: [['mummy', 1], ['scarab', 1], ['sunpriest', 1]], lv: 48 },
    { title: 'ห้องบอส · ราชันย์ทรายเนเฟรู', spawn: [['pharaoh', 1]], boss: true, turnLimit: 50, lv: 50 },
  ],
},
// D7-D10 (v78): each pack adds its dungeon once it is built (data/dungeons/dN.ts)
...PACKS.flatMap((p) => (p.dungeon ? [p.dungeon] : [])),
]
/** Old single-dungeon name (DungeonScene, the unused real-time prototype, still reads it). */
export const DUNGEON = DUNGEONS[0]

/** Stat spec v1: hit chance = clamp(0.80 + (Hit - Flee) * 1%, 80%, 98%), both sides. */
/** Thief Double Strike: Lv 1 20% ... Lv 5 60% (Q: Lv 5 = RO Lv 10). */
export const doubleAtkChance = (lv: number) => (lv <= 0 ? 0 : 0.1 + 0.1 * Math.min(5, lv))
export const hitChance = (hit: number, flee: number, floor = 0.8) => Math.min(0.98, Math.max(floor, 0.8 + (hit - flee) * 0.01))
/** Stat spec v1: damage after DEF = dmg * 100 / (100 + DEF). Never subtract flat. */
export const afterDef = (dmg: number, def: number) => dmg * 100 / (100 + Math.max(0, def))

// ===== Turn-based side-scroll battle (BattleScene) =====
// Turn order: everyone fills a gauge by `speed` per tick; at 100 they act. Faster = more turns.
/** Hero combo, Capybara Go style (Q 2026-11-04 18:24 "เต็มสูตร + Combo DR"):
 * - each basic attack chains baseCount + st.comboCount extra hits; each needs a roll at (combo rate - target's Ignore Combo), stop on a miss
 * - combo rate has no 50% cap any more: it may pass 100% (rateCap) so it still lands vs high Ignore Combo
 * - hit damage: x max(dmgFloor, 1 + basicDmg (+ comboDmg on combo hits) - basicDR (- comboDR on combo hits))
 * Monster defence by tier (+hardAdd in hard mode / tower). Monster combos on the hero keep BATTLE.comboMax. */
export const COMBO = {
  baseCount: 1,
  rateCap: 1.5,
  dmgFloor: 0.2,
  ignore: { normal: 0, mini: 0.15, boss: 0.25 },
  basicDR: { normal: 0, mini: 0.05, boss: 0.1 },
  comboDR: { normal: 0, mini: 0.1, boss: 0.15 },
  hardAdd: 0.1, // Ignore Combo / Counter and Combo / Counter DR extra in hard mode / tower
  // Counter, same model (Q 2026-11-04 18:26): rate may pass 100% vs Ignore Counter; dmg x max(dmgFloor, 1 + basicDmg + counterDmg - basicDR - counterDR)
  ignoreCounter: { normal: 0, mini: 0.15, boss: 0.25 },
  counterDR: { normal: 0, mini: 0.1, boss: 0.15 },
  // hero side: stat x/(x+defK) (AGI Ignore Combo, DEX Ignore Counter, VIT Combo+Counter DR, LUK Crit DR) + gear; caps
  defK: 400, defCap: 0.3, critDRCap: 0.5,
}

/** Diminishing returns above soft cap: smoothly scales up to hard cap using x/(x+K). */
export const RESIST_RULES = {
  softCap: 0.70,
  hardCap: 0.85,
  k: 0.15,
}
export const softCapDiminish = (v: number, soft = RESIST_RULES.softCap, hard = RESIST_RULES.hardCap, k = RESIST_RULES.k) => {
  if (v <= soft) return Math.max(0, v)
  const x = v - soft
  return Math.min(hard, soft + (hard - soft) * (x / (x + k)))
}
/** Expected extra hits per basic attack for a combo rate and chain length (rolls stop on the first miss). */
export const comboExtra = (rate: number, count: number) => { const p = Math.max(0, Math.min(1, rate)); let e = 0, q = 1; for (let i = 0; i < count; i++) { q *= p; e += q } return e }

export const BATTLE = {
  turnLimit: 20, // Q 2026-11-03: hero turns per wave fight; run out = the run is lost (stops pure-tank stalling)
  bossTurnLimit: 30, // boss fights (bot: damage builds 10-23 turns, pure tanks 36-43)
  heroSpeed: 10, // at base attack speed (PLAYER.aspd); AGI / speed perks scale it with aspd
  monSpeed: { jellop: 8, minijellop: 9, wolf: 13, king: 8, bat: 16, shroom: 7, boar: 9, shadowwolf: 14, alpha: 11,
    skeleton: 10, wisp: 14, gargoyle: 7, duelist: 15, hunter: 13, gunner: 14, drainer: 10, deathknight: 11,
    toad: 10, lizardshaman: 9, hornet: 17, turtleguard: 7, bloater: 8, spiderling: 15, venomqueen: 14, frostgiant: 9, hydra: 11,
    hellknight: 10, hexwitch: 11, imp: 17, necropriest: 9, wraith: 15, maiden: 11, shard: 14, mirage: 14, warlord: 12, lich: 11, dewsprite: 13, bonepriest: 9, mimic: 11, mimicking: 10, goldjellop: 12,
    mummy: 10, jackal: 14, sandscorp: 13, dunewraith: 13, scarab: 8, sunpriest: 10, sphinx: 12, jackallord: 14, pharaoh: 11 /* D6: fallback only, stat monsters use def.speed (AGI) */,
    ...Object.assign({}, ...PACKS.map((p) => p.monSpeed)) /* D7-D10 packs (v78) */ } as Record<MonsterKind, number>,
  monDmgMul: 0.55, // monster hit = def.dmg * this
  // v56 (Q: "มอนกากไป"): every spawned monster's HP / ATK / M.ATK and every turn limit, by dungeon tier 1..5
  monBuff: { hp: [1.05, 1.1, 1.18, 1.45, 1.45], dmg: [1.05, 1.1, 1.18, 1.36, 1.4], turns: [1, 1.04, 1.08, 1.16, 1.2] },
  cleave: 0.5, // hero's swing also hits the 2nd monster for this share
  regenPerTurn: 1.5, // regen stat (%/s in real-time) -> % of max HP per hero turn
  resPerTurn: 1, // resRegen multiplier per hero turn
  slamEvery: 3, // boss charges every Nth turn, slams on the next
  slamStun: 45, // gauge the hero loses when slammed (tenacity reduces it)
  stepMs: 520, // one action's animation at x1
  msPerTurn: 1500, // smashCd (ms) -> hero turns of cooldown
  comboMax: 2, // monsters: extra basic attacks a combo can chain (heroes use COMBO below)
  counterMul: 0.8, // a counter hit = basic attack x this
  reviveHp: 0.3, // Phoenix card: share of max HP the hero gets back
  // ----- Dungeon 3 mini bosses -----
  parryEvery: 5, // duelist Riposte (Q 2026-11-04): stance every Nth turn, immortal until her next turn
  parryMul: 1.4, // (legacy) riposte damage x the duelist's normal hit
  // Q 2026-11-04 Celeste kit (Monster DB comment): vital-point passive, Riposte, Grandado Espada
  duel: {
    vitalEvery: 3, vitalPct: 0.08, vitalLvMul: 0.03, // every 3rd turn: true dmg = 8% hero max HP + ATK x lv x 0.03 (lv = dungeon recLv)
    healTurns: 3, // vital / espada damage dealt is healed back over 3 of her turns
    ripostePct: 0.8, riposteCap: 0.15, // Riposte: each blocked hit answered with 80% of it as true dmg, at most 15% hero max HP per stance in total, never lethal
    espadaEvery: 10, espadaHits: 4, espadaMin: 0.03, espadaMax: 0.1, // phase 2: mark turn (immortal), then 4 crit thrusts of 3-10% hero max HP (Q asked 4-16%: bot died to it)
  },
  frenzyAt: 0.5, frenzySpeed: 1.4, frenzyLifesteal: 0.6, // hunter below 50% HP
  toxicSkin: { dr: 0.05, poison: 1, tenacity: 0.5, critCut: 0.5 }, // venomqueen (Q 2026-11-04): -5% P/M damage taken, 1 poison on the hero per landed hit, debuffs on it wear off 2x as fast, crit bonus vs it halved
  web: { agi: 0.5 },
  frozenHeart: 0.5, // hero attack speed x this while slowed
  iceSkin: { turns: 2, dmgCut: 0.15 }, // frostgiant (Q 2026-11-04): hitting it = ❄️ หนามน้ำแข็ง, hero damage -15% for 2 hero turns (refreshes) // พ่นใยมัดตัว: hero AGI x this while webbed
  vengeance: { share: 0.5, turns: 3, cd: 3, dotPct: 0.03, dotMatk: 0.3 }, // death knight (Q 2026-11-04): 50% of a hit it lands -> shield for 3 of its turns (then 3-turn cooldown); while it holds, hero takes 3% max HP + M.ATK x 0.3 magic each of its turns
  maiden: { at: 0.5, turns: 22, tint: 0xff9ad0 }, // drainer: under 50% HP she turns immortal and calls the Maiden (same max HP / M.ATK); +22 turns to the limit (bot timed out at +12)
  bulletTime: { at: 0.25, countdown: 3, hits: 25, bonusMin: 0.01, bonusMax: 0.25 }, // gunner (Q 2026-11-04): under 25% HP, 3-turn countdown, then 25 shots of her normal shot x (1 + 1-25%)
  scentAt: 0.5, scentSpeed: 1.75, scentCombo: 0.5, // hunter กลิ่นเลือด (Q 2026-11-04): hero below 50% HP -> turn speed +75%, combo +50%
  demonAt: 0.5, demonRegen: 0.02, // drainer below 50% HP: regen share of max HP per turn
  // ----- Dungeon 4-5: debuffs on the hero (HitFx) -----
  poisonPct: 0.01, poisonCap: 8, // per stack per hero turn, share of max HP (Lv-15 bot: 1.2%/cap 10 killed Thief in wave 1-2)
  burnPct: 0.03, burnHealCut: 0.4,
  weakenMul: 0.75, armorBreakMul: 0.5,
  monCritMul: 1.6, monComboMul: 0.7, monCounterMul: 0.8, // v49 monster crit / combo / counter
  shieldCap: 1, // hero shield (all jobs but Priest, who keeps CLERIC_KIT.shieldCap): max share of max HP; the closer to it, the less each new shield adds (stack-math shieldGain)
  reflectCap: 0.04, // reflect / thorns: one reflected hit deals at most this share of hero max HP, and can't knock the hero out
  soulBolts: 5, soulCap: 0.4, // Mirage Soul Strike: stored damage fires as N magic bolts, total capped at this share of hero max HP
}

// ===== Hard mode (v47, Q 2026-11-04): replay a cleared dungeon, monsters scale with the hero's Base Lv =====
// Monsters are pulled up to the strength of "the dungeon made for your level", read off the normal dungeons' own boss curve
// (HARD.curve: Base Lv -> boss HP / damage), then x the hard base:
//   L = max(Base Lv, recLv) · HP x hp * curveHp(L)/curveHp(recLv) · ATK / M.ATK x atk * curveDmg(L)/curveDmg(recLv) · Hit + hitPerLv * (L - recLv)
// e.g. dungeon 1 at Lv 20: HP x1.3*7.0 = 9.1, ATK x1.3*3.9 = 5.0 (~ dungeon 5 boss numbers). Past Lv 20 the curve keeps
// growing by hpGrow / dmgGrow per level (capped at maxLv). Every monster (waves, minis, bosses, summons) scales.
// Rewards (zeny / account EXP) x reward * (HP ratio)^rewardPow, forge materials x mats (rounded up).
// In-run EXP / level-up picks are NOT scaled (more picks would make it easier).
export const HARD = {
  recLv: { d1: 5, d2: 10, d3: 12, d4: 15, d5: 20 } as Record<string, number>, // the Base Lv each dungeon is tuned for (bot profiles)
  curve: [[5, 860, 16], [10, 1600, 30], [12, 3200, 50], [15, 4800, 54], [20, 6000, 62]] as [number, number, number][], // [Lv, boss HP, boss dmg] of d1..d5
  hpGrow: 1.08, dmgGrow: 1.04, maxLv: 45, // past Lv 20
  hp: 1.3, atk: 1.3, // hard base on top of the curve (also the whole bonus at the recommended level)
  hitPerLv: 1,
  turnMul: 1.4, // more HP -> longer fights: turn limits grow too
  reward: 1.5, rewardPow: 0.7,
  mats: 1.5,
  tint: 0xff8a6a, // hard-mode monsters glow red
}
const hardCurve = (lv: number): [number, number] => {
  const c = HARD.curve, last = c[c.length - 1]
  lv = Math.min(HARD.maxLv, lv)
  if (lv >= last[0]) return [last[1] * HARD.hpGrow ** (lv - last[0]), last[2] * HARD.dmgGrow ** (lv - last[0])]
  if (lv <= c[0][0]) return [c[0][1], c[0][2]]
  const i = c.findIndex((p) => p[0] > lv), [l0, h0, d0] = c[i - 1], [l1, h1, d1] = c[i], t = (lv - l0) / (l1 - l0)
  return [h0 + (h1 - h0) * t, d0 + (d1 - d0) * t]
}
/** Levels the hero is above the dungeon's recommended Base Lv (0 = at or under it). */
export const hardGap = (dungeonId: string, baseLevel: number) => Math.max(0, baseLevel - (HARD.recLv[dungeonId] ?? 1))
export const hardMul = (dungeonId: string, gap: number) => {
  const rec = HARD.recLv[dungeonId] ?? 1, [h0, d0] = hardCurve(rec), [h1, d1] = hardCurve(rec + gap)
  return { hp: HARD.hp * h1 / h0, atk: HARD.atk * d1 / d0, reward: HARD.reward * (h1 / h0) ** HARD.rewardPow }
}

// Hard-mode boss affixes (Q 2026-11-04 "เพิ่มสกิล, passive ให้ m.boss, boss ให้หลากหลาย"): every mini boss and boss rolls
// 1 extra skill + 1 passive per run (final bosses of dungeon 3+ roll 2 passives), so each replay plays differently.
export const HARD_SKILLS: MonSkill[] = [
  { kind: 'bolt', every: 4, name: '🔥 ลูกไฟนรก', pow: 1.2 },
  { kind: 'curse', every: 4, name: '☠️ หมอกพิษ', fx: { poison: 3 } },
  { kind: 'curse', every: 5, name: '😰 คำสาปอ่อนแรง', fx: { weaken: 2 } },
  { kind: 'curse', every: 5, name: '💔 ทุบเกราะ', fx: { armorBreak: 2 } },
  { kind: 'curse', every: 5, name: '❄️ ลมเยือกแข็ง', fx: { freeze: 60 } },
  { kind: 'warcry', every: 5, name: '💢 คำรามเดือด', pow: 0.25, turns: 3, self: true },
  { kind: 'shield', every: 5, name: '🛡️ เกราะเวท', pow: 0.1, self: true },
  { kind: 'heal', every: 6, name: '💚 ฟื้นพลัง', pow: 0.08, self: true },
]
export interface HardPassive { id: string; name: string; lifesteal?: number; reflect?: number; speed?: number; onHit?: HitFx; enrage?: number; def?: number }
export const HARD_PASSIVES: HardPassive[] = [
  { id: 'leech', name: '🩸 ดูดเลือด', lifesteal: 0.15 },
  { id: 'thorns', name: '🌵 หนาม', reflect: 0.05 },
  { id: 'swift', name: '💨 ว่องไว', speed: 1.2 },
  { id: 'venom', name: '🐍 พิษติดตัว', onHit: { poison: 1 } },
  { id: 'enrage', name: '😡 คลั่ง', enrage: 1.35 }, // below 35% HP: x1.35 damage, x1.15 speed
  { id: 'iron', name: '⛰️ ผิวเหล็ก', def: 25 },
]
