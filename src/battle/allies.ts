// ===== Ally entity (design/second-jobs-v1.md §2.8): built once, reused by Monk bell, Beastmaster pets, Innovator traps / turrets, summons =====
// Scene-agnostic: BattleScene owns the sprites and passes an AllyCtx (hits go through the hero's strike: no lifesteal, no combo — Q rule).
// Phase 3 MVP: hp / taunt / turns + an act on a trigger. Phase 4: own-turn gauge (speed), 'heroTurn' / 'monsterAct' triggers,
// one-shot uses (traps), soak counts (rubber chicken). Power reads hero Stats (no pet levels) x ally.pow. Allies reset every wave.
import type { Stats } from '../data/game-data'
import { bellMdefMul, KIT2 } from '../data/skill-math'

export type AllyKind = 'pet' | 'turret' | 'trap' | 'object' | 'summon'
/** ownTurn: own gauge in the turn queue (speed x hero speed) · heroBasic: every hero basic / combo swing · heroTurn: end of each hero turn · monsterAct: a monster starts its action (traps) */
export type AllyTrigger = 'ownTurn' | 'heroBasic' | 'heroTurn' | 'monsterAct'

/** What an ally can do: the scene implements these. */
export interface AllyCtx {
  ally: Ally; st: Stats; luk: number
  combo: boolean // heroBasic: this swing is a combo hit
  hitAll: (mul: number, magic: boolean, color: string) => void
  hitOne: (mul: number, magic: boolean, color: string, sure?: boolean) => void // sure = never misses (Blitz Beat)
  hitFront: (mul: number, color: string, bleed?: number) => void // physical on the front monster, + bleed (poison stacks)
  hitFoe: (mul: number, color: string) => void // physical on the monster that set it off ('monsterAct'), else the front one
  stun: (all: boolean) => void // the foe (else the front) loses its next turn (boss / mini: gauge push instead) · all = every monster
  chill: (turns: number, all: boolean) => void
  shield: (share: number) => void // hero shield, share of max HP
  say: (text: string, color: string) => void
}
export interface AllyDef {
  id: string; name: string; icon: string; kind: AllyKind
  hp?: (st: Stats) => number // none = can't be hit (trap, hawk)
  taunt?: number // chance a monster attack goes to it instead of the hero (needs hp or soaks)
  soaks?: number // breaks after taking this many attacks (rubber chicken), whatever the damage
  turns?: number // hero turns it lasts; none = the whole wave
  uses?: number // acts this many times, then gone (traps)
  speed?: (st: Stats) => number // 'ownTurn': share of hero speed
  trigger: AllyTrigger
  comboFollow?: boolean // also acts on hero combo hits (wolf)
  act: (ctx: AllyCtx) => void
  onBreak?: (ctx: AllyCtx) => void // its hp hit 0
  // ----- Beastmaster rework v1 🐗 Guardian (docs/design/beastmaster-rework-gap.md §7.3) -----
  share?: (st: Stats) => number // takes this share of every landed monster hit on the hero (after DEF), no taunt roll
  cut?: number // ... and shrugs off this much of its share
  rageK?: number // Rage += taken / max HP x this; 100 = charge now
  recover?: (st: Stats) => number // 0 HP = down this many hero turns, then back at full HP + charge (none = gone for the wave)
  charge?: (ctx: AllyCtx) => void // its special move (Rage full / back up)
}
/** down: hero turns left before it gets up (0 = in the fight) · rage: 0..100 */
export interface Ally { def: AllyDef; hp: number; maxHp: number; turns: number; pow: number; dead: boolean; gauge: number; acts: number; uses: number; soaks: number; rage: number; down: number }

export function makeAlly(def: AllyDef, st: Stats, pow = 1, turns = def.turns): Ally {
  const hp = Math.max(1, Math.round(def.hp?.(st) ?? 0))
  return { def, hp, maxHp: hp, turns: turns ?? Infinity, pow, dead: false, gauge: 0, acts: 0, uses: def.uses ?? Infinity, soaks: def.soaks ?? Infinity, rage: 0, down: 0 }
}
export const liveAllies = (all: Ally[]) => all.filter((a) => !a.dead)
/** In the fight right now: alive and not down (a downed boar keeps its slot but does nothing). */
export const readyAllies = (all: Ally[]) => all.filter((a) => !a.dead && a.down <= 0)
/** A monster attack: the ally (with hp or soaks + taunt) that takes it instead of the hero, if any. Taunts add up (capped by the roll). */
export function tauntTarget(all: Ally[], roll = Math.random()): Ally | undefined {
  let acc = 0
  for (const a of all) {
    if (a.dead || a.down > 0 || !(a.def.hp || a.def.soaks) || !a.def.taunt) continue
    acc += a.def.taunt
    if (roll < acc) return a
  }
  return undefined
}
/** Damage an ally; true when this hit broke it. Soak allies break on their Nth hit whatever the damage. */
export function hurtAlly(a: Ally, n: number): boolean {
  if (a.dead) return false
  if (a.def.soaks) { if (--a.soaks > 0) return false }
  else { a.hp = Math.max(0, a.hp - Math.max(1, Math.round(n))); if (a.hp > 0) return false }
  a.dead = true
  return true
}
export interface GuardHit { ally: Ally; hero: number; took: number; broke: boolean; full: boolean }
/** 🐗 Guardian split of a landed hit n (after DEF): the first ready sharing ally takes floor(n x share), minus its cut.
 *  hero = what is left for the hero · full = Rage hit 100 (reset, caller charges) · broke = 0 HP (down, Rage reset). */
export function guardHit(all: Ally[], n: number, st: Stats, share?: number): GuardHit | undefined {
  const a = all.find((x) => !x.dead && x.down <= 0 && x.hp > 0 && x.def.share)
  if (!a || n <= 0) return undefined
  const part = Math.min(n, Math.floor(n * (share ?? a.def.share!(st))))
  if (part <= 0) return undefined
  const took = Math.max(1, Math.round(part * (1 - (a.def.cut ?? 0))))
  a.hp = Math.max(0, a.hp - took)
  a.rage = Math.min(100, a.rage + (took / a.maxHp) * (a.def.rageK ?? 0))
  const broke = a.hp <= 0
  if (broke) {
    a.rage = 0
    const t = Math.round(a.def.recover?.(st) ?? 0)
    if (t > 0) a.down = t; else a.dead = true
  }
  const full = !broke && a.rage >= 100
  if (full) a.rage = 0
  return { ally: a, hero: n - part, took, broke, full }
}
/** End of a hero turn: downed allies count down; returns the ones back up (full HP). */
export function reviveAllies(all: Ally[]): Ally[] {
  const out: Ally[] = []
  for (const a of all) if (!a.dead && a.down > 0 && --a.down <= 0) { a.down = 0; a.hp = a.maxHp; out.push(a) }
  return out
}
/** One act used up (traps): true when that was its last. */
export function useAlly(a: Ally): boolean {
  if (--a.uses > 0) return false
  a.dead = true
  return true
}
/** Turn queue: own-turn allies fill their gauge alongside the hero (heroStep = the hero's gauge gain this step). */
export function fillAllies(all: Ally[], st: Stats, heroStep: number) { for (const a of all) if (!a.dead && a.def.trigger === 'ownTurn') a.gauge += heroStep * (a.def.speed?.(st) ?? 1) }
/** End of a hero turn: every ally ages; returns the ones that just expired. */
export function tickAllies(all: Ally[]): Ally[] {
  const out: Ally[] = []
  for (const a of all) if (!a.dead && --a.turns <= 0) { a.dead = true; out.push(a) }
  return out
}

const MK = KIT2.monk, BM = KIT2.beastmaster, IN = KIT2.innovator
/** 🐗 charge: front monster + stun (+ ★ คุ้มกันนาย shield). Every N hero turns, on full Rage, on getting back up. */
const boarCharge = (c: AllyCtx) => {
  c.say(c.st.j2BoarEvo ? '🐗🛡️ พุ่งชน!' : '🐗 พุ่งชน!', '#e0b07a')
  c.hitFront((BM.boarMul + c.st.j2BoarMul) * c.ally.pow, '#e0b07a'); c.stun(false)
  if (c.st.j2BoarShield > 0) c.shield(c.st.j2BoarShield * c.ally.pow)
}
export const hawkMul = (st: Stats) => BM.hawkMul + st.j2HawkMul + (st.j2HawkEvo ? BM.hawkEvoMul : 0)
export const wolfMul = (st: Stats) => BM.wolfMul + st.j2WolfMul + (st.j2WolfEvo ? BM.wolfEvoMul : 0)
export const hawkChance = (st: Stats, luk: number) => Math.min(BM.hawkCap, BM.hawkChance + BM.hawkLuk * luk + st.j2HawkChance)
export const ALLIES = {
  // 👊 Monk Tempest Bell: soaks hits, rings on every hero swing, bursts when broken (HP scales with WIS & M.DEF)
  tempestBell: { id: 'tempestBell', name: 'Tempest Bell', icon: '🔔', kind: 'object', trigger: 'heroBasic',
    hp: (st) => st.maxHp * (MK.bellHp + (st.wis ?? 0) * (MK.bellWis ?? 0.008)) * bellMdefMul(st), taunt: MK.bellTaunt, turns: MK.bellTurns,
    act: (c) => c.hitAll(MK.bellRing * c.ally.pow * bellMdefMul(c.st), true, '#bfe6ff'),
    onBreak: (c) => { c.say('🔔 ระฆังแตก!', '#ffe08a'); c.hitAll(MK.bellBoom * c.ally.pow * bellMdefMul(c.st), true, '#ffe08a') } },
  // ----- Phase 4 🐺 Beastmaster pets (rework v1: all 3 spawn every wave at KIT2.beastmaster.packPow, x ally.pow) · ★ evolutions read Stats flags -----
  hawk: { id: 'hawk', name: 'เหยี่ยว', icon: '🦅', kind: 'pet', trigger: 'heroBasic', // RO Blitz Beat: no HP, can't be hit
    act: (c) => {
      const st = c.st, evo = st.j2HawkEvo ? BM.hawkEvoHits : 0
      if (c.combo || Math.random() >= hawkChance(st, c.luk)) return
      const n = Math.min(BM.hawkHitsMax + evo, BM.hawkHits + st.j2HawkHits + evo + Math.floor(Math.random() * 3)) // 1-3 targets
      c.say(st.j2HawkEvo ? '🦅✨ Blitz Beat!' : '🦅 Blitz Beat!', '#f2d24b')
      for (let i = 0; i < n; i++) c.hitOne(hawkMul(st) * c.ally.pow, false, '#f2d24b', true)
    } },
  boar: { id: 'boar', name: 'หมูป่า', icon: '🐗', kind: 'pet', trigger: 'heroTurn', hp: (st) => st.maxHp * (BM.boarHp + st.j2BoarHp + (st.j2BoarEvo ? BM.boarEvoHp : 0)),
    share: (st) => BM.boarShare + (st.j2BoarEvo ? BM.boarEvoShare : 0), cut: BM.boarCut, rageK: BM.boarRageK,
    recover: (st) => (st.j2BoarEvo ? BM.boarEvoDown : BM.boarDown),
    act: (c) => { if (++c.ally.acts % (c.st.j2BoarEvo ? BM.boarEvoEvery : BM.boarEvery) === 0) boarCharge(c) }, // Q3: the timer stays, Rage adds extra charges
    charge: boarCharge },
  wolf: { id: 'wolf', name: 'หมาป่า', icon: '🐺', kind: 'pet', trigger: 'ownTurn', comboFollow: true,
    speed: (st) => BM.wolfSpeed + st.j2WolfSpeed + (st.j2WolfEvo ? BM.wolfEvoSpeed : 0),
    act: (c) => c.hitFront(wolfMul(c.st) * c.ally.pow, '#c9c9d6', BM.wolfBleed + c.st.j2WolfBleed) },
  pack: { id: 'pack', name: 'ฝูงหมาป่า', icon: '🐺', kind: 'summon', trigger: 'ownTurn', turns: BM.cmdPackTurns, speed: (st) => BM.wolfSpeed + st.j2WolfSpeed,
    act: (c) => c.hitFront(wolfMul(c.st) * c.ally.pow, '#c9c9d6', 1) },
  // ----- Phase 4 🔧 Innovator: traps (one-shot, set off when a monster acts), robot turret, rubber chicken -----
  mine: { id: 'mine', name: 'Land Mine', icon: '💣', kind: 'trap', trigger: 'monsterAct', uses: 1,
    act: (c) => { c.say('💣 Land Mine!', '#ff8c42'); const k = (IN.mineMul + c.st.j2TrapMul) * c.ally.pow; if (c.st.j2Claymore) c.hitAll(k, false, '#ff8c42'); else c.hitFoe(k, '#ff8c42') } },
  snare: { id: 'snare', name: 'Ankle Snare', icon: '🕳️', kind: 'trap', trigger: 'monsterAct', uses: 1,
    act: (c) => { c.say('🕳️ Ankle Snare!', '#e0b07a'); c.stun(false) } },
  freeze: { id: 'freeze', name: 'Freezing Trap', icon: '❄️', kind: 'trap', trigger: 'monsterAct', uses: 1,
    act: (c) => { c.say('❄️ Freezing Trap!', '#9fe3ff'); c.hitFoe((IN.freezeMul + c.st.j2TrapMul) * c.ally.pow, '#9fe3ff'); c.chill(IN.freezeChill, false); c.stun(false) } },
  turret: { id: 'turret', name: 'หุ่นจิ๋ว', icon: '🤖', kind: 'turret', trigger: 'heroTurn', turns: IN.turretTurns,
    act: (c) => c.hitOne((IN.turretMul + c.st.j2TurretMul) * c.ally.pow, false, '#9fd0ff') },
  chicken: { id: 'chicken', name: 'ไก่ยาง', icon: '🐔', kind: 'object', trigger: 'heroTurn', soaks: IN.chickenSoaks, taunt: 1,
    act: () => {}, onBreak: (c) => c.say('🐔 ก๊าบ! ไก่ยางแตก', '#f6eedc') },
} satisfies Record<string, AllyDef>
export const TRAP_IDS = ['mine', 'snare', 'freeze'] as const

/** 🔧 Innovator กล่องสุ่มประหลาด: 10 gadgets (design §4). rare weight x (1 + LUK x rareLuk, capped) x (1 + j2BoxLuck). Effects: BattleScene.gadget(). */
export type GadgetId = 'chicken' | 'banana' | 'rocket' | 'robot' | 'magnet' | 'mirror' | 'cola' | 'balloon' | 'cloud' | 'jackpot'
export const GADGETS: { id: GadgetId; icon: string; name: string; w: number; rare?: boolean }[] = [
  { id: 'chicken', icon: '🐔', name: 'ไก่ยาง', w: 12 }, { id: 'banana', icon: '🍌', name: 'เปลือกกล้วย', w: 12 }, { id: 'rocket', icon: '🚀', name: 'จรวดขวด', w: 12 },
  { id: 'robot', icon: '🤖', name: 'หุ่นจิ๋ว', w: 8, rare: true }, { id: 'magnet', icon: '🧲', name: 'แม่เหล็ก', w: 6, rare: true }, { id: 'mirror', icon: '🔁', name: 'กระจก', w: 6, rare: true },
  { id: 'cola', icon: '🥤', name: 'โคล่าระเบิด', w: 12 }, { id: 'balloon', icon: '🎈', name: 'ลูกโป่ง', w: 12 }, { id: 'cloud', icon: '☁️', name: 'เมฆฝน', w: 10 },
  { id: 'jackpot', icon: '💥', name: 'แจ็คพอต', w: 1.5, rare: true },
]
export const gadgetById = (id: GadgetId) => GADGETS.find((g) => g.id === id) ?? GADGETS[0]
export function rollGadget(st: Stats, luk: number, roll: () => number = Math.random): GadgetId {
  const rareK = (1 + Math.min(IN.rareLukCap, IN.rareLuk * luk)) * (1 + st.j2BoxLuck)
  const ws = GADGETS.map((g) => g.w * (g.rare ? rareK : 1)), total = ws.reduce((a, b) => a + b, 0)
  const pick = () => {
    let r = roll() * total
    for (let i = 0; i < GADGETS.length; i++) { r -= ws[i]; if (r < 0) return GADGETS[i] }
    return GADGETS[GADGETS.length - 1]
  }
  const g = pick()
  return !g.rare && st.j2Reroll > 0 ? pick().id : g.id // ★ ทอยใหม่: a common roll gets one more try
}
