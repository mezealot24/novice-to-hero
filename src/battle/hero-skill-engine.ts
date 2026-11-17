// Hero-skill engine for monsters (Q 2026-11-17): a monster with MonsterDef.heroKit spends mana on hero skills from the
// Hero Skill Book (data/hero-skill-book.ts). Pure logic, no Phaser: BattleScene builds a KitCtx each monster turn, asks
// chooseHeroSkill for one id, casts its steps with the normal monster skill code, then calls spendKit.
//
// Turn order: tickKit (regen + cooldowns) at the start of the monster's turn -> chooseHeroSkill -> cast -> spendKit.
// Choice = utility AI: each ready, affordable skill whose role makes sense right now gets a score
//   (role base + situation bonus) x style weight + random jitter; the best one is cast. Nothing fits -> normal turn.
import { HERO_KIT_RULES, HERO_SKILL_BOOK, KIT_STYLE, type HeroKit, type HeroSkillEntry, type HeroSkillId } from '../data/hero-skill-book'
import type { HitFx, MonSkill } from '../data/monsters'

export interface KitState {
  mana: number; maxMana: number
  cd: Partial<Record<HeroSkillId, number>> // monster turns left
  casts: number
}

/** What the scene tells the engine about this moment (all HP values are shares of max HP, 0..1). */
export interface KitCtx {
  turn: number // the caster's own turn count (Mon.turns)
  selfHp: number
  selfShield: boolean
  selfBuffed: boolean // warcry (atkUp) still running on it
  lowestHp: number // lowest HP share among the monsters standing (itself included)
  heroHp: number
  heroFx: Partial<Record<keyof HitFx, number>> // debuffs already on the hero (turns / stacks)
}

export function newKitState(kit: HeroKit): KitState {
  const maxMana = kit.mana ?? HERO_KIT_RULES.mana
  return { mana: Math.min(maxMana, kit.startMana ?? HERO_KIT_RULES.startMana), maxMana, cd: {}, casts: 0 }
}

/** Start of the caster's turn: mana back, cooldowns down by one. */
export function tickKit(st: KitState, kit: HeroKit): void {
  st.mana = Math.min(st.maxMana, st.mana + (kit.regen ?? HERO_KIT_RULES.regen))
  for (const id of Object.keys(st.cd) as HeroSkillId[]) {
    const left = (st.cd[id] ?? 0) - 1
    if (left > 0) st.cd[id] = left
    else delete st.cd[id]
  }
}

const ready = (st: KitState, e: HeroSkillEntry) => !st.cd[e.id] && st.mana >= e.cost
const SLOT_BONUS = { s1: 0, s2: 0.4, s3: 0.8, ult: 1.5 } as const
/** Debuff keys a skill would put on the hero. */
function fxKeys(steps: readonly { fx?: HitFx; pick?: MonSkill[] }[]): (keyof HitFx)[] {
  const out = new Set<keyof HitFx>()
  for (const s of steps) {
    for (const k of Object.keys(s.fx ?? {}) as (keyof HitFx)[]) out.add(k)
    if (s.pick) for (const k of fxKeys(s.pick)) out.add(k)
  }
  return [...out]
}

/** The skill's score right now, or null when it can't / shouldn't be cast. */
export function scoreSkill(id: HeroSkillId, kit: HeroKit, st: KitState, ctx: KitCtx): number | null {
  const e = HERO_SKILL_BOOK[id]
  if (!e || !ready(st, e)) return null
  if (e.slot === 'ult' && ctx.turn < (kit.ultAfter ?? HERO_KIT_RULES.ultAfter)) return null
  let s: number
  switch (e.role) {
    case 'heal':
      if (ctx.lowestHp >= HERO_KIT_RULES.healBelow) return null
      s = 3 + 6 * (1 - ctx.lowestHp)
      break
    case 'shield':
      if (ctx.selfShield || ctx.selfHp >= HERO_KIT_RULES.shieldBelow) return null
      s = 2 + 3 * (1 - ctx.selfHp)
      break
    case 'buff':
      if (ctx.selfBuffed) return null
      s = 2.5
      break
    case 'debuff': {
      const keys = fxKeys(e.steps)
      if (keys.length && keys.every((k) => (ctx.heroFx[k] ?? 0) > 0)) return null // all of it is already on the hero
      s = 2.5
      break
    }
    default:
      s = 2 + (ctx.heroHp < 0.3 ? 1 : 0) // go for the kill
  }
  return (s + SLOT_BONUS[e.slot]) * KIT_STYLE[kit.style ?? 'balanced'][e.role]
}

/** The hero skill to cast this turn, or null (normal turn). `rng` returns 0..1 (tests pass a fixed one). */
export function chooseHeroSkill(kit: HeroKit, st: KitState, ctx: KitCtx, rng: () => number = Math.random): HeroSkillId | null {
  const jitter = kit.jitter ?? HERO_KIT_RULES.jitter
  let best: HeroSkillId | null = null, top = -Infinity
  for (const id of kit.skills) {
    const sc = scoreSkill(id, kit, st, ctx)
    if (sc === null) continue
    const v = sc + rng() * jitter
    if (v > top) { top = v; best = id }
  }
  return best
}

/** After a cast that happened: pay the mana, start the cooldown, refund any gain. */
export function spendKit(st: KitState, kit: HeroKit, id: HeroSkillId): void {
  const e = HERO_SKILL_BOOK[id]
  st.mana = Math.min(st.maxMana, Math.max(0, st.mana - e.cost) + (e.gain ?? 0))
  const cd = Math.max(1, Math.round(e.cd * (kit.cdMul ?? 1)))
  st.cd[id] = cd
  st.casts++
}
