// Boss mana (Q 2026-11-23 "ให้ boss มีหลอดมานา และบังคับใช้ mana สำหรับสกิล Active"): every boss / mini boss (ai 'boss') has a mana bar,
// and each of its active skills (MonsterDef.skills: heal / shield / bolt / curse ...) costs mana. A skill it can't pay for is skipped
// that turn (the next skill in its list is tried, else a normal attack). The boss ⚠️ charge / slam cast and the HP-threshold summon stay free.
// A boss with a hero kit (heroKit) already pays mana in battle/hero-skill-engine.ts: its bar shows that kit mana, nothing here applies.
import type { MonSkill, MonSkillKind } from './monsters'

export const MON_MANA = {
  max: 100,
  start: 50, // mana at spawn
  regen: 15, // mana back at the start of each of its turns
  phaseRefill: 0.5, // entering a boss phase gives back this share of max mana
  big: 50, // a ☄️ legendary spell (MonSkill.big) costs this, whatever its kind
  cost: { heal: 30, shield: 30, warcry: 25, haste: 20, curse: 25, bolt: 30, strike: 30, summon: 35, revive: 40 } as Record<MonSkillKind, number>,
}

export interface ManaPool { mana: number; maxMana: number }

export const newManaPool = (): ManaPool => ({ mana: Math.min(MON_MANA.max, MON_MANA.start), maxMana: MON_MANA.max })

/** The mana a resolved skill costs (MonSkill.mp overrides). */
export function skillManaCost(sk: MonSkill): number {
  if (sk.mp !== undefined) return Math.max(0, sk.mp)
  return sk.big ? MON_MANA.big : MON_MANA.cost[sk.kind] ?? 30
}

/** Start of its turn: mana back. */
export function regenMana(p: ManaPool, n = MON_MANA.regen) { p.mana = Math.min(p.maxMana, p.mana + n) }

export const canPay = (p: ManaPool, sk: MonSkill) => p.mana >= skillManaCost(sk)

/** After the skill really happened (or its cast started): pay for it. */
export function payMana(p: ManaPool, sk: MonSkill) { p.mana = Math.max(0, p.mana - skillManaCost(sk)) }
