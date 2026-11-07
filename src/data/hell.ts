// v114 (Q 2026-11-08): 🔥 Hell versions of D1-D5 monsters. They show up on tower floors 25+ (modes.ts towerFloor marks RunRoom.hell);
// BattleScene.addMon runs hellify() on a marked kind after the tower scaling. Pure data, no new textures: a dark-red tint + bigger numbers
// + one hell trait each. Worth more EXP, so the deep floors pay for the danger.
import type { MonsterDef } from './game-data'

export interface HellTrait { id: string; icon: string; name: string; apply: (d: MonsterDef) => void; bossOk?: boolean }

export const HELL = {
  from: 25, // first tower floor that can roll Hell monsters
  chance0: 0.25, perFloor: 0.015, max: 0.6, // per D1-D5 kind in a room: chance it is Hell
  hp: 1.3, atk: 1.15, // on top of the tower's own scaling
  xp: 1.5,
  tint: 0xb8323a,
}

export const HELL_TRAITS: HellTrait[] = [
  { id: 'blood', icon: '🩸', name: 'กระหายเลือด', apply: (d) => { d.lifesteal = (d.lifesteal ?? 0) + 0.12 }, bossOk: true },
  { id: 'hide', icon: '⛓️', name: 'หนังนรก', apply: (d) => { d.def = (d.def ?? 0) + 20 }, bossOk: true },
  { id: 'eye', icon: '👁️', name: 'ตานรก', apply: (d) => { d.trueSight ??= { after: 2, turns: 3 } }, bossOk: true },
  { id: 'blast', icon: '💥', name: 'ระเบิดนรก', apply: (d) => { d.deathBlast = Math.max(d.deathBlast ?? 0, 0.8) } },
]

/** Chance that one D1-D5 kind on tower floor f is Hell (0 below HELL.from). */
export const hellChance = (f: number) => (f < HELL.from ? 0 : Math.min(HELL.max, HELL.chance0 + HELL.perFloor * (f - HELL.from)))

/** A Hell copy of `d`: name, numbers, one trait (rand in [0,1) picks it). Never touches the passed def. */
export function hellify(d: MonsterDef, rand: number): MonsterDef {
  const pool = HELL_TRAITS.filter((t) => d.ai !== 'boss' || t.bossOk)
  const t = pool[Math.min(pool.length - 1, Math.floor(rand * pool.length))]
  const out: MonsterDef = { ...d, name: `${d.name}นรก`, hp: Math.round(d.hp * HELL.hp), dmg: d.dmg * HELL.atk, xp: Math.round(d.xp * HELL.xp), hellish: `${t.icon} ${t.name}` }
  if (d.matk !== undefined) out.matk = d.matk * HELL.atk
  t.apply(out)
  return out
}
