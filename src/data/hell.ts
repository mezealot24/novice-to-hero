// v114 (Q 2026-11-08): 🔥 Hell versions of D1-D5 monsters. They show up on tower floors 25+ (modes.ts towerFloor marks RunRoom.hell);
// BattleScene.addMon runs hellify() on a marked kind after the tower scaling. Pure data, no new textures: a dark-red tint + bigger numbers
// + one hell trait each. Worth more EXP, so the deep floors pay for the danger.
import type { MonsterDef } from './game-data'

export interface HellTrait { id: string; icon: string; name: string; apply: (d: MonsterDef) => void; bossOk?: boolean; bossOnly?: boolean }

export const HELL = {
  from: 25, // first tower floor that can roll Hell monsters
  chance0: 0.25, perFloor: 0.015, max: 0.6, // per D1-D5 kind in a room: chance it is Hell
  allFrom: 40, // v116 (Q 2026-11-08): from this floor every D1-D5 monster is Hell
  lv: 10, // v116: a Hell copy is this many Lv above the floor's tower Lv (stats + skill Lv, mon-stats restatAt)
  hp: 1.3, atk: 1.15, // on top of the tower's own scaling
  xp: 1.5,
  tint: 0xb8323a,
}

export const HELL_TRAITS: HellTrait[] = [
  { id: 'blood', icon: '🩸', name: 'กระหายเลือด', apply: (d) => { d.lifesteal = (d.lifesteal ?? 0) + 0.12 }, bossOk: true },
  { id: 'hide', icon: '⛓️', name: 'หนังนรก', apply: (d) => { d.def = (d.def ?? 0) + 20 }, bossOk: true },
  // v118: not for minis / bosses: the tower already gives them a sharper True Sight (HARD_POWER.bossSight), so this one did nothing
  { id: 'eye', icon: '👁️', name: 'ตานรก', apply: (d) => { d.trueSight ??= { after: 2, turns: 3 } } },
  { id: 'blast', icon: '💥', name: 'ระเบิดนรก', apply: (d) => { d.deathBlast = Math.max(d.deathBlast ?? 0, 0.8) } },
  // v118: minis / bosses only (replaces ตานรก for them): every hit sets the hero on fire 2 turns (3% max HP / turn, healing -40%)
  { id: 'flame', icon: '🔥', name: 'เปลวนรก', apply: (d) => { d.onHit = { ...(d.onHit ?? {}), burn: Math.max(d.onHit?.burn ?? 0, 2) } }, bossOk: true, bossOnly: true },
]

/** Chance that one D1-D5 kind on tower floor f is Hell (0 below HELL.from). */
export const hellChance = (f: number) => (f < HELL.from ? 0 : f >= HELL.allFrom ? 1 : Math.min(HELL.max, HELL.chance0 + HELL.perFloor * (f - HELL.from)))

/** A Hell copy of `d`: name, numbers, one trait (rand in [0,1) picks it). Never touches the passed def. */
export function hellify(d: MonsterDef, rand: number): MonsterDef {
  const pool = HELL_TRAITS.filter((t) => (d.ai === 'boss' ? t.bossOk : !t.bossOnly))
  const t = pool[Math.min(pool.length - 1, Math.floor(rand * pool.length))]
  const out: MonsterDef = { ...d, name: `${d.name}นรก`, hp: Math.round(d.hp * HELL.hp), dmg: d.dmg * HELL.atk, xp: Math.round(d.xp * HELL.xp), hellish: `${t.icon} ${t.name}` }
  if (d.matk !== undefined) out.matk = d.matk * HELL.atk
  t.apply(out)
  return out
}

// ===== 😈 Hell mode on D6-D10 (Q 2026-11-08 "เพิ่ม D6-D10 hell mode") =====
// The tier above 🔥 hard on a level dungeon: the same hard run (+50% stat points, boss affixes, corruption) with every monster a
// Hell copy (hellify: one trait, HP x1.3, ATK x1.15, EXP x1.5) at HELL_MODE.lv levels above its room. Opens per dungeon after a
// 🔥 hard clear of it. Pays more (zeny / EXP / mats, unique chance, +1 ผลึกโลกันตร์). No 💎 entry, no gem skip.
export const HELL_MODE = {
  lv: 10, // room Lv + this (same gap as tower Hell copies)
  reward: 1.5, mats: 1.5, // on top of the hard-mode reward
  uniqueRate: 0.2, // final-boss unique chance (hard 10%)
  taintAdd: 1, // + ผลึกโลกันตร์ from the final boss
  turnMul: 1.15, // a bit more time: Hell monsters are tankier
}
/** Hell mode is open on a level dungeon (D6+) once it has a 🔥 hard clear. */
export const hellOpen = (s: { hardClearsBy?: Record<string, number> }, dg: { id: string; level?: unknown }) => !!dg.level && ((s.hardClearsBy ?? {})[dg.id] ?? 0) > 0
