// ===== Ally entity (design/second-jobs-v1.md §2.8): built once, reused by Monk bell, Beastmaster pets, Innovator traps / turrets, summons =====
// Scene-agnostic: BattleScene owns the sprites and passes an AllyCtx (hits go through the hero's strike: no lifesteal, no combo — Q rule).
// MVP (phase 3): hp / taunt / turns + an act on a trigger. Power reads hero Stats (no pet levels). Numbers live in skill-math KIT2.
import type { Stats } from '../data/game-data'
import { KIT2 } from '../data/skill-math'

export type AllyKind = 'pet' | 'turret' | 'trap' | 'object' | 'summon'
export type AllyTrigger = 'ownTurn' | 'heroBasic' | 'monsterAct'

/** What an ally can do: the scene implements these. */
export interface AllyCtx {
  ally: Ally; st: Stats
  hitAll: (mul: number, magic: boolean, color: string) => void
  hitOne: (mul: number, magic: boolean, color: string) => void
  say: (text: string, color: string) => void
}
export interface AllyDef {
  id: string; name: string; icon: string; kind: AllyKind
  hp?: (st: Stats) => number // none = can't be hit (trap)
  taunt?: number // chance a monster attack goes to it instead of the hero (needs hp)
  turns?: number // hero turns it lasts; none = the whole wave
  trigger: AllyTrigger
  act: (ctx: AllyCtx) => void
  onBreak?: (ctx: AllyCtx) => void // its hp hit 0
}
export interface Ally { def: AllyDef; hp: number; maxHp: number; turns: number; pow: number; dead: boolean }

export function makeAlly(def: AllyDef, st: Stats, pow = 1): Ally {
  const hp = Math.max(1, Math.round(def.hp?.(st) ?? 0))
  return { def, hp, maxHp: hp, turns: def.turns ?? Infinity, pow, dead: false }
}
export const liveAllies = (all: Ally[]) => all.filter((a) => !a.dead)
/** A monster attack: the ally (with hp + taunt) that takes it instead of the hero, if any. Taunts add up (capped by the roll). */
export function tauntTarget(all: Ally[], roll = Math.random()): Ally | undefined {
  let acc = 0
  for (const a of all) {
    if (a.dead || !a.def.hp || !a.def.taunt) continue
    acc += a.def.taunt
    if (roll < acc) return a
  }
  return undefined
}
/** Damage an ally; true when this hit broke it. */
export function hurtAlly(a: Ally, n: number): boolean {
  if (a.dead) return false
  a.hp = Math.max(0, a.hp - Math.max(1, Math.round(n)))
  if (a.hp > 0) return false
  a.dead = true
  return true
}
/** End of a hero turn: every ally ages; returns the ones that just expired. */
export function tickAllies(all: Ally[]): Ally[] {
  const out: Ally[] = []
  for (const a of all) if (!a.dead && --a.turns <= 0) { a.dead = true; out.push(a) }
  return out
}

const MK = KIT2.monk
export const ALLIES = {
  // 👊 Monk Tempest Bell: soaks hits, rings on every hero swing, bursts when broken
  tempestBell: { id: 'tempestBell', name: 'Tempest Bell', icon: '🔔', kind: 'object', trigger: 'heroBasic', hp: (st) => st.maxHp * MK.bellHp, taunt: MK.bellTaunt, turns: MK.bellTurns,
    act: (c) => c.hitAll(MK.bellRing * c.ally.pow, true, '#bfe6ff'),
    onBreak: (c) => { c.say('🔔 ระฆังแตก!', '#ffe08a'); c.hitAll(MK.bellBoom * c.ally.pow, true, '#ffe08a') } },
} satisfies Record<string, AllyDef>
