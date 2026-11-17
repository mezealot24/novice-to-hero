// ===== Hero Skill Book (Q 2026-11-17 "ทำ engine, registry ให้มอนสเตอร์หรือบอสสามารถเลือกสกิลของฮีโร่ไปใช้ได้ · เพื่อเปิดทางให้สร้างเลเวลและความท้าทายใหม่ๆ") =====
// One registry entry per hero skill (5 base classes: ทักษะ 1 / the three ทักษะ 2 / Ult · 10 2nd jobs: ทักษะ 3 / Ult วิวัฒน์).
// Each entry says how that skill plays when a MONSTER casts it: a short list of ordinary MonSkill steps, so BattleScene runs it
// with the monster skill code that already exists (strike / bolt / heal / shield / warcry / curse / haste). No hero code runs on a monster.
//
// Names, icons and hero cooldowns are read from the hero data (jobs.ts / skill2.ts / jobs2.ts), so a renamed hero skill renames the
// monster copy too. Damage pows are "x the caster's own normal hit" (like every MonSkill), mirroring the hero ratio vs its basic attack,
// so a clone hits like the class it copies without padding its stats.
//
// A monster gets hero skills with MonsterDef.heroKit (a HeroKit below, or 'mirror' = copy the player's own class kit: D18 mirror boss).
// The engine that picks one each turn (mana, cooldowns, utility AI) is src/battle/hero-skill-engine.ts.
// Import rule: values only from jobs / jobs2 / skill2 (no game-data / monsters values: monsters.ts imports this file's types).
import type { HitFx, MonSkill } from './monsters'
import { JOBS, type JobId } from './jobs'
import { JOB2, type Job2Id } from './jobs2'
import { SKILL2, type Skill2Id } from './skill2'

export const BASE_CLASSES = ['swordsman', 'archer', 'mage', 'cleric', 'thief'] as const
export type BaseClass = (typeof BASE_CLASSES)[number]
export type HeroSlot = 's1' | 's2' | 's3' | 'ult'
/** What the skill is for: the engine only casts it when that makes sense (heal: someone is hurt · debuff: the hero lacks it ...). */
export type SkillRole = 'damage' | 'heal' | 'shield' | 'buff' | 'debuff'
/** ทักษะ 1 / Ult of a base class · a ทักษะ 2 id · ทักษะ 3 / Ult วิวัฒน์ of a 2nd job. */
export type HeroSkillId = `${BaseClass}.s1` | `${BaseClass}.ult` | Skill2Id | `${Job2Id}.s3` | `${Job2Id}.ult`

/** One step of a monster-cast hero skill: a MonSkill without its turn rhythm (the engine decides when). */
export type HeroStep = Omit<MonSkill, 'every' | 'name'> & { name?: string }

export interface HeroSkillEntry {
  id: HeroSkillId
  owner: JobId | Job2Id // the hero class it comes from
  slot: HeroSlot
  name: string; icon: string // from the hero data
  role: SkillRole
  cost: number // monster mana
  cd: number // monster turns between casts (the hero skill's own cooldown; ทักษะ 1 has none, so HERO_KIT_RULES.s1Cd)
  gain?: number // mana back after the cast (Thief ล้วงกระเป๋า)
  steps: HeroStep[] // cast in order; the first one that lands decides the cast happened
}

// ---------- monster-side resource + AI rules (tunable numbers live here, not in the scene) ----------
export const HERO_KIT_RULES = {
  mana: 100, // max mana of a kit that sets none
  startMana: 40, // mana at spawn
  regen: 12, // mana back at the start of each of its turns
  s1Cd: 2, // ทักษะ 1 cooldown (monster turns): the hero spams it, a monster still needs room for normal hits
  ultAfter: 3, // its Ult never comes before this many of its own turns (a fight never opens on a nuke)
  jitter: 0.6, // random 0..jitter added to every score: same kit, not the same script every fight
  cost: { s1: 12, s2: 22, s3: 28, ult: 45 } as Record<HeroSlot, number>,
  healBelow: 0.75, // heal only when some monster is under this share of max HP (BattleScene heals under 0.8)
  shieldBelow: 0.9, // shield only when it has no shield and is under this share of max HP
}

export type KitStyle = 'balanced' | 'aggressive' | 'support' | 'guardian'
/** x on a role's score per style (aggressive clones nuke, support clones heal first ...). */
export const KIT_STYLE: Record<KitStyle, Record<SkillRole, number>> = {
  balanced: { damage: 1, heal: 1, shield: 1, buff: 1, debuff: 1 },
  aggressive: { damage: 1.35, heal: 0.7, shield: 0.7, buff: 1.1, debuff: 1 },
  support: { damage: 0.8, heal: 1.5, shield: 1.2, buff: 1.3, debuff: 1 },
  guardian: { damage: 0.9, heal: 1, shield: 1.5, buff: 1, debuff: 1.2 },
}

/** A monster's hero-skill loadout (MonsterDef.heroKit). */
export interface HeroKit {
  skills: HeroSkillId[]
  style?: KitStyle
  mana?: number; startMana?: number; regen?: number
  lv?: number // skill Lv of every step (mon-stats skillAtLv; the monster's level bonus still adds on top)
  ultAfter?: number; jitter?: number
  cdMul?: number // x every cooldown (0.5 = a frantic clone)
}

// ---------- the book ----------
type Spec = { role: SkillRole; steps: HeroStep[]; gain?: number }
const fx = (f: HitFx) => f
const strike = (pow: number, more: Partial<HeroStep> = {}): HeroStep => ({ kind: 'strike', pow, ...more })
const bolt = (pow: number, more: Partial<HeroStep> = {}): HeroStep => ({ kind: 'bolt', pow, ...more })
const selfShield = (pow: number): HeroStep => ({ kind: 'shield', pow, self: true })

const SPEC: Record<HeroSkillId, Spec> = {
  // ⚔️ Swordsman
  'swordsman.s1': { role: 'damage', steps: [strike(1.25)] }, // ฟันพายุ
  sw_guard: { role: 'shield', steps: [selfShield(0.12)] },
  sw_blood: { role: 'buff', steps: [{ kind: 'warcry', pow: 0.2, turns: 3, self: true }] },
  sw_taunt: { role: 'debuff', steps: [{ kind: 'curse', fx: fx({ weaken: 2, armorBreak: 1 }) }] },
  'swordsman.ult': { role: 'damage', steps: [strike(1.2), selfShield(0.2)] }, // ดาบพิทักษ์
  // 🏹 Archer
  'archer.s1': { role: 'damage', steps: [strike(0.9, { hits: 2 })] }, // ยิงคู่
  ar_rain: { role: 'damage', steps: [strike(0.3, { hits: 3 })] },
  ar_hawk: { role: 'buff', steps: [{ kind: 'warcry', pow: 0.2, turns: 3, self: true }] },
  ar_trap: { role: 'damage', steps: [strike(0.6), { kind: 'curse', fx: fx({ freeze: 30 }) }] },
  'archer.ult': { role: 'damage', steps: [selfShield(0.08), strike(2.4, { big: true })] }, // ศรทะลวง
  // 🔮 Mage
  'mage.s1': { role: 'damage', steps: [bolt(0.9, { fx: fx({ burn: 1 }) })] }, // ลูกไฟระเบิด
  mg_mshield: { role: 'shield', steps: [selfShield(0.15)] },
  mg_nova: { role: 'damage', steps: [bolt(0.8, { fx: fx({ slow: 2 }) })] },
  mg_arcane: { role: 'damage', steps: [bolt(0.5, { hits: 3 })] },
  'mage.ult': { role: 'damage', steps: [{ kind: 'bolt', big: true, pick: [ // เวทธาตุ: one element at random
    { kind: 'bolt', every: 1, name: '🔥 เวทไฟ', pow: 2, fx: fx({ burn: 3 }) },
    { kind: 'bolt', every: 1, name: '❄️ เวทน้ำแข็ง', pow: 1.6, fx: fx({ freeze: 50, slow: 2 }) },
    { kind: 'bolt', every: 1, name: '⚡ เวทสายฟ้า', pow: 0.35, hits: 6 },
  ] }, selfShield(0.1)] },
  // ✨ Cleric
  'cleric.s1': { role: 'heal', steps: [{ kind: 'heal', pow: 0.15 }] }, // ฮีล
  cl_renew: { role: 'heal', steps: [{ kind: 'heal', pow: 0.2 }] },
  cl_bless: { role: 'buff', steps: [{ kind: 'warcry', pow: 0.15, turns: 3 }] },
  cl_spear: { role: 'damage', steps: [bolt(0.7, { hits: 2 })] },
  'cleric.ult': { role: 'damage', steps: [strike(1.5), { kind: 'shield', pow: 0.14 }] }, // พรคุ้มครอง
  // 🗡️ Thief
  'thief.s1': { role: 'damage', steps: [strike(1.3, { fx: fx({ poison: 3 }) })] }, // แทงพิษ
  th_smoke: { role: 'shield', steps: [selfShield(0.12)] },
  th_pick: { role: 'damage', steps: [strike(1)], gain: 15 },
  th_wound: { role: 'damage', steps: [strike(1.2, { fx: fx({ poison: 4, armorBreak: 1 }) })] },
  'thief.ult': { role: 'damage', steps: [selfShield(0.1), strike(0.7, { hits: 4 })] }, // เงาพริ้ว
  // 🪓 Berserker · 🐴 Knight (Swordsman)
  'berserker.s3': { role: 'damage', steps: [strike(1.7, { fx: fx({ armorBreak: 1 }) })] },
  'berserker.ult': { role: 'damage', steps: [strike(1.4), { kind: 'warcry', pow: 0.3, turns: 3, self: true }] },
  'knight.s3': { role: 'damage', steps: [strike(1.6, { fx: fx({ freeze: 30 }) })] },
  'knight.ult': { role: 'damage', steps: [strike(0.6, { hits: 3 }), selfShield(0.15)] },
  // 🔪 Rogue · 🕴️ Mobster (Thief)
  'rogue.s3': { role: 'damage', steps: [strike(2)] },
  'rogue.ult': { role: 'damage', steps: [selfShield(0.1), strike(0.4, { hits: 6 })] },
  'mobster.s3': { role: 'damage', steps: [strike(1.2, { fx: fx({ slow: 2, armorBreak: 2 }) })] },
  'mobster.ult': { role: 'damage', steps: [strike(1.4, { fx: fx({ poison: 4 }), drain: 0.1 })] },
  // ✝️ Crusader · 👊 Monk (Cleric)
  'crusader.s3': { role: 'damage', steps: [strike(0.7, { hits: 2, magic: true })] },
  'crusader.ult': { role: 'damage', steps: [bolt(0.6, { hits: 3, big: true })] },
  'monk.s3': { role: 'damage', steps: [bolt(1.8)] },
  'monk.ult': { role: 'damage', steps: [selfShield(0.2), strike(0.5, { hits: 3 })] },
  // 🧙 Wizard · 📖 Sage (Mage)
  'wizard.s3': { role: 'damage', steps: [bolt(0.5, { hits: 3, fx: fx({ freeze: 40, slow: 2 }) })] },
  'wizard.ult': { role: 'damage', steps: [{ kind: 'bolt', big: true, pick: [
    { kind: 'bolt', every: 1, name: '🔥 Meteor Storm', pow: 0.6, hits: 4, fx: fx({ burn: 2 }) },
    { kind: 'bolt', every: 1, name: '⚡ Lord of Vermilion', pow: 0.45, hits: 5, fx: fx({ freeze: 20 }) },
    { kind: 'bolt', every: 1, name: '❄️ Storm Gust', pow: 0.6, hits: 3, fx: fx({ slow: 3 }) },
  ] }, selfShield(0.12)] },
  'sage.s3': { role: 'buff', steps: [{ kind: 'warcry', pow: 0.25, turns: 3, self: true }] },
  'sage.ult': { role: 'debuff', steps: [{ kind: 'curse', fx: fx({ silence: 2, weaken: 1 }) }, bolt(1)] },
  // 🐺 Beastmaster · 🛠️ Innovator (Archer)
  'beastmaster.s3': { role: 'damage', steps: [{ kind: 'haste', pow: 30 }, strike(0.6, { hits: 2 })] },
  'beastmaster.ult': { role: 'buff', steps: [{ kind: 'warcry', pow: 0.2, turns: 3 }, { kind: 'shield', pow: 0.1 }] },
  'innovator.s3': { role: 'damage', steps: [{ kind: 'bolt', pick: [
    { kind: 'bolt', every: 1, name: '🎲 กล่องระเบิด', pow: 1.2 },
    { kind: 'curse', every: 1, name: '🎲 กล่องแก๊สพิษ', fx: fx({ poison: 3, weaken: 1 }) },
    { kind: 'heal', every: 1, name: '🎲 กล่องยา', pow: 0.12, self: true },
  ] }] },
  'innovator.ult': { role: 'damage', steps: [{ kind: 'curse', fx: fx({ slow: 2, web: 2 }) }, strike(2)] },
}

const isJob2 = (o: string): o is Job2Id => o in JOB2
function source(id: HeroSkillId): Omit<HeroSkillEntry, 'role' | 'cost' | 'steps' | 'gain'> {
  const s2 = SKILL2.find((x) => x.id === id)
  if (s2) return { id, owner: s2.job, slot: 's2', name: s2.name, icon: s2.icon, cd: s2.cd }
  const [owner, slot] = id.split('.') as [string, 's1' | 's3' | 'ult']
  if (isJob2(owner)) {
    const j = JOB2[owner], k = slot === 's3' ? j.skill3 : j.ult
    return { id, owner, slot, name: k.name, icon: k.icon, cd: k.cd }
  }
  const j = JOBS[owner as BaseClass]
  return slot === 's1'
    ? { id, owner: j.id, slot, name: j.auto.name, icon: j.auto.icon, cd: HERO_KIT_RULES.s1Cd }
    : { id, owner: j.id, slot: 'ult', name: j.ult.name, icon: j.ult.icon, cd: j.ult.cd }
}

export const HERO_SKILL_IDS = Object.keys(SPEC) as HeroSkillId[]
export const HERO_SKILL_BOOK = Object.fromEntries(HERO_SKILL_IDS.map((id) => {
  const src = source(id), sp = SPEC[id]
  return [id, { ...src, role: sp.role, cost: HERO_KIT_RULES.cost[src.slot], steps: sp.steps, ...(sp.gain ? { gain: sp.gain } : {}) }]
})) as Record<HeroSkillId, HeroSkillEntry>

export const isHeroSkillId = (s: string): s is HeroSkillId => s in SPEC
/** Every hero skill a class can use (a 2nd job also gets its parent's). */
export function heroSkillsOf(owner: JobId | Job2Id): HeroSkillId[] {
  const parent = isJob2(owner) ? JOB2[owner].parent : owner
  return HERO_SKILL_IDS.filter((id) => { const o = HERO_SKILL_BOOK[id].owner; return o === owner || o === parent })
}

/** The steps as MonSkills the scene can cast (every 1; a step without a name shows the hero skill's name). */
export function heroSkillSteps(id: HeroSkillId, lv?: number): MonSkill[] {
  const e = HERO_SKILL_BOOK[id]
  return e.steps.map((s) => ({ ...s, every: 1, name: s.name ?? `${e.icon} ${e.name}`, ...(lv && lv > 1 ? { lv } : {}) }))
}

const MIRROR_STYLE: Record<BaseClass, KitStyle> = { swordsman: 'guardian', archer: 'aggressive', mage: 'aggressive', cleric: 'support', thief: 'aggressive' }
/** D18 mirror boss: the player's own kit (ทักษะ 1 + the picked ทักษะ 2 + the 2nd job's ทักษะ 3 + the Ult they have now).
 *  Novice (no skills) gets an empty kit: it just fights normally. */
export function mirrorKit(job: JobId, s2?: Skill2Id, job2?: Job2Id, more: Partial<HeroKit> = {}): HeroKit {
  if (job === 'novice') return { skills: [], ...more }
  const base = job as BaseClass
  const j2 = job2 && JOB2[job2]?.parent === job ? job2 : undefined
  const skills: HeroSkillId[] = [`${base}.s1`]
  if (s2 && SKILL2.some((x) => x.id === s2 && x.job === job)) skills.push(s2)
  if (j2) skills.push(`${j2}.s3`)
  skills.push(j2 ? `${j2}.ult` : `${base}.ult`)
  return { skills, style: MIRROR_STYLE[base], ...more }
}
