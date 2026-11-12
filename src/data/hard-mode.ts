import type { HitFx, MonSkill } from './monsters'

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
