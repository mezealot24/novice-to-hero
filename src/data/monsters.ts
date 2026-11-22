import type { Archetype, SkillScale, StatAlloc } from './mon-stats'
import type { BaseStat } from './meta'
import {
  PACKS,
  type D7Kind, type D7Mini,
  type D8Kind, type D8Mini,
  type D9Kind, type D9Mini,
  type D10Kind, type D10Mini,
  type D11Kind, type D11Mini,
  type D12Kind, type D12Mini,
  type D13Kind, type D13Mini,
  type D14Kind, type D14Mini,
} from './dungeons'
import type { SkillFormula } from './mon-skill-scale'
import type { HeroKitSpec } from './hero-skill-book'

export type MonsterKind = 'jellop' | 'wolf' | 'king' | 'minijellop' | 'bat' | 'shroom' | 'boar' | 'shadowwolf' | 'alpha'
  | 'skeleton' | 'wisp' | 'gargoyle' | 'duelist' | 'hunter' | 'gunner' | 'drainer' | 'deathknight'
  | 'toad' | 'lizardshaman' | 'hornet' | 'turtleguard' | 'bloater' | 'spiderling' | 'venomqueen' | 'frostgiant' | 'hydra'
  | 'hellknight' | 'hexwitch' | 'imp' | 'necropriest' | 'wraith' | 'shard' | 'mirage' | 'warlord' | 'lich'
  | 'dewsprite' | 'bonepriest'
  | 'mummy' | 'jackal' | 'sandscorp' | 'dunewraith' | 'scarab' | 'sunpriest' | 'sphinx' | 'jackallord' | 'pharaoh' // D6
  | 'maiden' // drainer's Summon Maiden (Q 2026-11-04)
  | D7Kind | D8Kind | D9Kind | D10Kind | D11Kind | D12Kind | D13Kind | D14Kind // v78+: D7-D13 packs (data/dungeons/dN.ts)
  | 'mimic' | 'mimicking' | 'goldjellop' // event monsters (design/roadmap-and-events-v1.md): stats scale with the dungeon tier at spawn
export type MiniKind = 'duelist' | 'hunter' | 'gunner' | 'drainer' | 'venomqueen' | 'frostgiant' | 'mirage' | 'warlord' | 'sphinx' | 'jackallord'
  | D7Mini | D8Mini | D9Mini | D10Mini | D11Mini | D12Mini | D13Mini | D14Mini

// ----- Dungeon 4-5 (design/dungeon-4-5-brutal.md): data-driven monster skills, debuffs on the hero, boss phases -----
/** What a landed monster hit (or a skill / charged attack) puts on the hero. Turns count hero turns. */
export interface HitFx {
  poison?: number // + poison stacks: each hero turn lose 1.2% max HP per stack, then 1 stack fades (cap 10)
  burn?: number // burn for N hero turns: lose 3% max HP per turn, healing on the hero -40%
  weaken?: number // curse for N hero turns: hero damage -25%
  armorBreak?: number // N hero turns: P.DEF and M.DEF count half
  silence?: number // N hero turns: the ultimate / Smash can't be cast (it stays queued)
  freeze?: number // hero turn gauge lost (tenacity reduces it); 100 = skip a whole turn
  slow?: number // N hero turns (Q 2026-11-04, frostgiant Frozen Heart): hero attack speed x BATTLE.frozenHeart
  web?: number // N hero turns (Q 2026-11-04, venomqueen พ่นใยมัดตัว): Can't Evade (no Flee / lucky dodge) and AGI -50%
}
export type MonSkillKind = 'heal' | 'shield' | 'warcry' | 'curse' | 'summon' | 'revive' | 'haste' | 'bolt' | 'strike'
/** A monster turn spent on a skill instead of an attack: used on every `every`-th turn of that monster when it makes sense. */
export interface MonSkill {
  kind: MonSkillKind
  every: number
  name: string
  pow?: number // heal / shield: share of the target's max HP · warcry: + damage share · haste: gauge added · bolt: x M.ATK
  turns?: number // warcry: monster turns it lasts
  fx?: HitFx // curse: what lands on the hero (can't miss, debuffRes can resist) · bolt: rides on the spell if it lands
  summon?: [MonsterKind, number] // summon: kind, how many (free slots only)
  self?: boolean // heal / shield: only on itself
  magic?: boolean // strike: dealt as magic (vs M.DEF, Flee can't dodge) from ATK
  alone?: number // strike: x this when no other monster stands with it
  drain?: number // strike (Q 2026-11-04, hunter): after it lands, drains this share of the hero's current HP as magic damage and heals itself by it
  hits?: number // bolt / strike: this many hits of pow each (strike hits each roll Flee; with `crit` each rolls its own crit)
  crit?: boolean // bolt / strike: may also roll the monster's basic crit (battle-rules monSkillCritRate). Default off: a skill rolls only MonsterDef.skillCrit (0 = never)
  pick?: MonSkill[] // cast a random one of these instead (spell rotation: Mordecus' elements)
  big?: boolean // legendary spell: big callout + screen flash
  scale?: SkillScale | false // v68: stat it scales with (default by kind, mon-stats SKILL_SCALE); false = flat
  lv?: number // v81 skill level (mon-stats skillAtLv, SKILL_SCALE.lv): 1 = as written; may pass the hero's max (RO style Lv 50)
  f?: SkillFormula // v124 bolt / strike: multi-ratio damage per hit (mon-skill-scale.ts, LoL / Dota / RO style); no f = pow path
}
/** Boss phase: entered once when HP drops under `at` (share of max HP). Effects stack with later phases. */
export interface BossPhase {
  at: number
  name: string
  speed?: number // x turn speed
  dmg?: number // x damage
  chargeEvery?: number // new charge rhythm
  heal?: number // heal this share of max HP on entering (heal cut applies)
  shield?: number // shield of this share of max HP on entering
  summon?: [MonsterKind, number]
  reflect?: number // from now on reflects this share of every direct hit
  absorb?: number // from now on stores this share of every direct hit for the Soul Strike
  skills?: MonSkill[] // replaces the skill list
  onHit?: HitFx // replaces the hit effect
  slamFx?: HitFx // replaces the charged attack's effect
  drainStats?: number // Death Realm (Q 2026-11-04): every one of its turns the hero loses this many points of every base stat for the rest of the fight; it gets +1% damage per point
  cleanse?: boolean // drops its burns / poison / chill on entering
}

export interface MonsterDef {
  hellish?: string // v114 tower Hell copy (data/hell.ts): its trait label; also marks the tint
  escTag?: string // v127 🔥 hard escalation (data/hard-escalation.ts): icons of its rolled perks / blessings
  escNames?: string // ... and their names (boss / mini callout)
  name: string
  tex: string
  hp: number
  dmg: number // contact damage (physical) · also magic damage when matk is unset
  matk?: number // M.ATK: magic attacks, magic charges and bolt spells use this instead of dmg (Q 2026-11-04)
  ai: 'hopper' | 'dasher' | 'boss'
  moveSpeed: number // hop / dash speed
  radius: number // body circle
  zeny: [number, number]
  xp: number
  idleMs: [number, number] // rest between moves
  flee?: number // vs the hero's Hit (default 5)
  hit?: number // vs the hero's Flee (default 15)
  def?: number // P.DEF: physical hits deal dmg*100/(100+def); magic ignores it
  magic?: boolean // attacks are magic: the hero's M.DEF (WIS) reduces them, P.DEF does not
  summon?: MonsterKind // boss: calls 2 of these at 50% HP
  slamName?: string // boss: name of the charged attack
  slamMagic?: boolean // boss: the charged attack is magic (M.DEF) instead of physical (P.DEF)
  slamAnim?: 'stomp' | 'pounce' | 'cleave' | 'shot' | 'cast' | 'bite' // boss: how the charged attack looks (Q 2026-11-03: not every boss stomps)
  slamColor?: number // tint of its projectile / magic / burst
  charge?: boolean // boss: telegraphed charged attack every chargeEvery turns, then a slam (BREAK removed, Q 2026-11-03)
  chargeCounter?: 'interrupt_stun' | 'shield_or_guard' | 'multi_hit_break' // D11-D13 boss/mini charge telegraph counter hint
  // ----- Dungeon 3 (mini bosses, design/dungeon-3-miniboss.md) -----
  mini?: MiniKind // 1v1 mini boss archetype: its own turn script in BattleScene.miniTurn
  title?: string // epithet shown on the duel banner
  lifesteal?: number // heals this share of the damage it deals (heal cut from burn reduces it)
  chargeEvery?: number // boss: charges every Nth turn (default BATTLE.slamEvery)
  slamMul?: number // boss: charged attack = (dmg + 8) * monDmgMul * this (default 1.6)
  iceSkin?: boolean // frostgiant passive (BATTLE.iceSkin): a hero hit that lands leaves ice thorns: hero damage cut for a few turns
  toxicSkin?: boolean // venomqueen passive (BATTLE.toxicSkin): takes less damage, poisons whoever hits it, shrugs debuffs, softens crits
  venom?: { dmg: number; turns: number; dex: number } // charged attack (Venom Strike): adds `dex` to its M.ATK and leaves a magic DoT that doubles every hero turn
  vengeance?: boolean // death knight โล่แห่งความแค้น (BATTLE.vengeance)
  fixedFlee?: number // hero hits (physical, magic, crits) miss this share of the time, whatever Hit is (Maiden: 0.5)
  razor?: number // on-hit (Q 2026-11-04, hunter Blood Razor): each landed normal / combo hit adds magic damage = this share of the hero's current HP
  trueSight?: { after: number; turns: number } // v56 anti-AGI: after the hero evades it `after` times, its physical hits get + FLEE_RULES.trueSightHit Hit for `turns` of its turns (Q 2026-11-21, was a sure hit)
  shots?: number // each attack is this many small hits, each rolls hit/flee on its own
  // ----- Dungeon 4-5 -----
  onHit?: HitFx // every landed hit also puts this on the hero
  slamFx?: HitFx // boss: the charged attack also puts this on the hero
  skills?: MonSkill[]
  heroKit?: HeroKitSpec // v125 hero skills (data/hero-skill-book.ts, battle/hero-skill-engine.ts): mana + cooldown utility AI, tried before `skills` · { cls } = every skill of a class · 'mirror' = the player's own class kit
  reflect?: number // reflects this share of every direct hit (strike / Smash) back as magic damage
  absorb?: number // stores this share of every direct hit; the charged attack fires it back as Soul Strike bolts (Q 2026-11-03, Mirage)
  deathBlast?: number // explodes on death: (dmg) x monDmgMul x this as magic (Flee / lucky dodge / shield all work)
  phases?: BossPhase[]
  passive?: boolean // event monster that never attacks (เจลล็อปทองคำ: it only runs)
  // ----- v49 combat stats (Q 2026-11-04: monsters get combo / counter / crit like the hero) -----
  crit?: number // chance a basic hit / combo / counter crits: x BATTLE.monCritMul and can't be fled (lucky dodge / shield still work); skills use skillCrit
  skillCrit?: number // Q 2026-11-21: chance a SKILL hit (strike / bolt) crits, x BATTLE.monCritMul; default 0 = skills never crit (battle-rules monSkillCritRate)
  combo?: number // after a normal attack: chance to chain another hit, up to BATTLE.comboMax extra (each x BATTLE.monComboMul)
  counter?: number // when the hero's basic attack lands on it: chance to strike back right away (normal hit x BATTLE.monCounterMul)
  // ----- 7 base stats (data/mon-stats.ts). Every dungeon (v126: D1-D5 too): numbers come from the stats at the room's level;
  // hp / dmg are 1 placeholders, bodyMul multiplies HP / ATK / M.ATK, def / hit / flee / crit / combo / counter are bonuses on top -----
  statAlloc?: Archetype | StatAlloc // how its stat points are split (archetype or own weights; objects so admin.html can edit them)
  bodyMul?: { hp?: number; dmg?: number; matk?: number } // x on the stat-built HP / ATK / M.ATK (a heavy body, a frail caster ...)
  pointsMul?: number // v81: x its stat point budget (Lv x tier share), so this one monster gets more / fewer stats at every level
  speedMul?: number // x on the AGI turn speed
  slamScale?: SkillScale // v68: stat the charged attack scales with (default STR, INT when slamMagic)
  // filled in by statMonster (never written by hand):
  lv?: number
  base?: Record<BaseStat, number>
  mdef?: number // M.DEF share (WIS): the hero's magic hits deal x (1 - mdef)
  luckyDodge?: number // LUK: chance the hero's physical hit misses outright
  tenacity?: number // WIS: debuff turns / freeze on it are shorter
  speed?: number // turn speed (AGI), replaces BATTLE.monSpeed
  statDef?: { ignoreCombo: number; ignoreCounter: number; comboDR: number; counterDR: number; critDR: number } // from AGI / DEX / VIT / LUK like the hero
}

export const MONSTERS: Record<MonsterKind, MonsterDef> = {
  // ----- D1-D5 / events / support (v126): stat monsters like D6+. bodyMul / speedMul / def..counter bonuses were calibrated once so each
  // one at its home room Lv (DungeonDef rooms lv) fights like the old hand-tuned numbers x monBuff did (tests/mon-stats-calibration) -----
  jellop: { name: 'เจลล็อป', tex: 'jellop', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 1, dmg: 1, bodyMul: { hp: 0.194, dmg: 0.288, matk: 0.359 }, speedMul: 0.8, def: -3, hit: 2, flee: -1, counter: -0.01, xp: 3, ai: 'hopper', moveSpeed: 250, radius: 15, zeny: [1, 2], idleMs: [500, 1100] },
  minijellop: { name: 'เจลล็อปจิ๋ว', tex: 'jellop', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 1, dmg: 1, bodyMul: { hp: 0.102, dmg: 0.165, matk: 0.205 }, speedMul: 0.9, def: -3, hit: 2, flee: -1, counter: -0.01, xp: 1, ai: 'hopper', moveSpeed: 300, radius: 11, zeny: [0, 1], idleMs: [350, 800] },
  wolf: { name: 'หมาป่าสีเทา', tex: 'wolf', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 0.352, dmg: 0.492, matk: 0.563 }, speedMul: 1.281, def: -2, hit: 6, flee: 11, crit: 0.07, xp: 5, ai: 'dasher', moveSpeed: 560, radius: 16, zeny: [2, 3], idleMs: [700, 1300]},
  king: { name: 'ราชาเจลล็อป', tex: 'king', statAlloc: { vit: 4, str: 3, int: 2, wis: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 0.437, dmg: 0.415, matk: 0.532 }, speedMul: 0.8, def: -7, flee: -1, crit: 0.06, counter: -0.02, xp: 0, ai: 'boss', moveSpeed: 230, radius: 38, zeny: [15, 20], idleMs: [700, 1000], summon: 'minijellop', slamName: 'รวมพลัง! ทุบตอนนี้เลย', slamMagic: true, slamAnim: 'stomp', slamColor: 0x9fe3ff, charge: true,
    phases: [{ at: 0.5, name: 'ร่างเยลลี่ยักษ์! เกราะวุ้น', shield: 0.1 }] }, // boss buff v1
  // ----- Dungeon 2: ป่าหมาป่าเงา. Each monster tests one stat (see design/dungeon-2-and-events.md) -----
  bat: { name: 'ค้างคาวถ้ำ', tex: 'bat', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 0.224, dmg: 0.384, matk: 0.434 }, speedMul: 1.509, def: -5, hit: 6, flee: 20, crit: -0.01, combo: 0.14, xp: 4, ai: 'dasher', moveSpeed: 500, radius: 12, zeny: [2, 3], idleMs: [500, 900]},
  shroom: { name: 'เห็ดสปอร์', tex: 'shroom', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 0.407, dmg: 0.563, matk: 0.528 }, speedMul: 0.7, def: -6, hit: -3, flee: -1, xp: 5, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [2, 4], idleMs: [700, 1200], magic: true,
    skills: [{ kind: 'bolt', every: 3, pow: 1.3, name: 'ปล่อยสปอร์พิษ', fx: { poison: 1 } }] },
  boar: { name: 'หมูป่าเขี้ยวเหล็ก', tex: 'boar', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 0.675, dmg: 0.539, matk: 0.695 }, speedMul: 0.887, def: 53, hit: -4, flee: -2, crit: 0.1, counter: -0.01, xp: 7, ai: 'dasher', moveSpeed: 420, radius: 18, zeny: [3, 5], idleMs: [800, 1300]},
  shadowwolf: { name: 'หมาป่าเงา', tex: 'shadowwolf', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 0.493, dmg: 0.515, matk: 0.637 }, speedMul: 1.34, def: -5, hit: 8, flee: 13, crit: 0.04, combo: 0.19, xp: 6, ai: 'dasher', moveSpeed: 600, radius: 16, zeny: [3, 4], idleMs: [600, 1100]},
  // ----- Dungeon 3: ซากป้อมวีรชน. Waves -> 1v1 mini boss (random of 4) -> waves -> boss -----
  skeleton: { name: 'ทหารโครงกระดูก', tex: 'skeleton', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 0.873, dmg: 0.669, matk: 0.876 }, speedMul: 0.971, def: 35, hit: 9, flee: -3, combo: -0.01, counter: 0.08, xp: 7, ai: 'hopper', moveSpeed: 220, radius: 15, zeny: [4, 6], idleMs: [700, 1200]},
  wisp: { name: 'ดวงไฟผี', tex: 'wisp', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 0.52, dmg: 0.779, matk: 0.695 }, speedMul: 1.4, def: -8, hit: -7, flee: 24, counter: -0.01, xp: 6, ai: 'dasher', moveSpeed: 520, radius: 13, zeny: [4, 5], idleMs: [500, 900], magic: true,
    skills: [{ kind: 'bolt', every: 3, pow: 1.4, name: 'ลูกไฟผี', fx: { burn: 1 } }] },
  gargoyle: { name: 'การ์กอยล์หิน', tex: 'gargoyle', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 1, dmg: 1, bodyMul: { hp: 1.261, dmg: 0.903, matk: 1.071 }, speedMul: 0.7, def: 79, hit: 10, flee: -1, counter: 0.12, xp: 9, ai: 'hopper', moveSpeed: 180, radius: 18, zeny: [5, 7], idleMs: [900, 1400]},
  duelist: { name: 'เซเลสต์', title: 'นักดาบดวลเงินจันทร์', tex: 'duelist', statAlloc: { agi: 4, dex: 3, str: 3, luk: 2 }, hp: 1, dmg: 1, bodyMul: { hp: 1.595, dmg: 0.698, matk: 0.953 }, speedMul: 1.288, def: 12, hit: 9, flee: 13, crit: 0.1, combo: -0.03, counter: 0.15, xp: 12, ai: 'boss', mini: 'duelist', moveSpeed: 300, radius: 30, zeny: [30, 40], idleMs: [600, 900],
    phases: [{ at: 0.4, name: 'ดาบจันทร์เต็มดวง! เร็วและคมขึ้น', speed: 1.2, dmg: 1.15 }] },
  hunter: { name: 'กริมฟาง', title: 'หมาป่าคลั่งเลือด', tex: 'hunter', statAlloc: { str: 4, agi: 3, vit: 2, luk: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 1.314, dmg: 0.641, matk: 0.999 }, speedMul: 1.13, def: 4, hit: 13, flee: -1, crit: 0.14, combo: 0.12, counter: -0.02, xp: 12, ai: 'boss', mini: 'hunter', moveSpeed: 300, radius: 34, zeny: [30, 40], idleMs: [600, 900], lifesteal: 0.35, chargeEvery: 4, slamName: 'กลิ่นเลือด! กระโจนตะครุบ', slamAnim: 'pounce', slamColor: 0xc03050, charge: true },
  gunner: { name: 'ปิ๊กซี่', title: 'มือปืนพลุบ้าระห่ำ', tex: 'gunner', statAlloc: { dex: 5, agi: 2, luk: 2, int: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 1.495, dmg: 0.451, matk: 0.427 }, speedMul: 1.267, def: -3, hit: -2, flee: 7, crit: 0.12, combo: -0.02, xp: 12, ai: 'boss', mini: 'gunner', moveSpeed: 300, radius: 30, zeny: [30, 40], idleMs: [600, 900], shots: 3, slamMul: 3.4, slamScale: { stat: 'dex' }, slamName: 'จรวดยักษ์! ล็อกเป้าแล้ว', slamAnim: 'shot', slamColor: 0xff8c42, slamMagic: true, charge: true,
    phases: [{ at: 0.5, name: 'กระสุนเพลิง! ยิงติดไฟ', onHit: { burn: 1 } }] },
  drainer: { name: 'คาร์วอส', title: 'จอมเวทกาดำ', tex: 'drainer', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 1.489, dmg: 0.815, matk: 0.576 }, def: 11, hit: 10, flee: -1, crit: 0.1, counter: -0.01, xp: 12, ai: 'boss', mini: 'drainer', moveSpeed: 300, radius: 32, zeny: [30, 40], idleMs: [600, 900], magic: true, slamMagic: true, lifesteal: 0.3, slamMul: 1.9, slamName: 'กรงเล็บวิญญาณ! ดูดชีวิต', slamAnim: 'cast', slamColor: 0xc03050, charge: true,
    skills: [{ kind: 'curse', every: 4, name: 'มนต์ปิดปาก', fx: { silence: 1 } }] },
  deathknight: { name: 'อัศวินมรณะ', tex: 'deathknight', statAlloc: { str: 4, vit: 3, int: 2, wis: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 1.099, dmg: 0.576, matk: 0.883 }, speedMul: 1.1, def: 19, hit: 15, flee: 6, crit: 0.1, counter: 0.1, xp: 0, ai: 'boss', moveSpeed: 240, radius: 42, zeny: [60, 80], idleMs: [700, 1000], lifesteal: 0.2, summon: 'skeleton', slamName: 'ดาบมรณะ! ฟันกวาดวิญญาณ', slamAnim: 'cleave', slamColor: 0x9a6aff, charge: true, // Q 2026-11-22: every move physical (slam: ATK + STR, vs DEF, Hit vs Flee)
    skills: [{ kind: 'revive', every: 4, pow: 0.5, name: 'ปลุกศพ' }],
    phases: [{ at: 0.35, name: '💀 Death Realm! ดูด All Stat ทุกเทิร์น', drainStats: 1 }] }, // Q 2026-11-04 Monster DB comment (was: speed x1.2, charge every 2)
  // ----- Dungeon 4: บึงพิษมรกต. Monsters that heal, shield, poison and explode (design/dungeon-4-5-brutal.md) -----
  toad: { name: 'คางคกพิษ', tex: 'toad', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 1.229, dmg: 0.697, matk: 0.922 }, speedMul: 0.971, def: 13, hit: 8, flee: -3, combo: -0.01, counter: -0.02, xp: 8, ai: 'hopper', moveSpeed: 220, radius: 16, zeny: [5, 7], idleMs: [700, 1200], onHit: { poison: 2 } },
  lizardshaman: { name: 'หมอผีกิ้งก่า', tex: 'lizardshaman', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 1, dmg: 1, bodyMul: { hp: 1.091, dmg: 0.746, matk: 0.728 }, speedMul: 0.9, def: -12, hit: 12, flee: -1, counter: -0.02, xp: 9, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [5, 8], idleMs: [700, 1200], magic: true,
    skills: [{ kind: 'heal', every: 2, pow: 0.18, name: 'น้ำมนต์บึง' }, { kind: 'bolt', every: 3, pow: 1.3, name: 'สายฟ้าบึง' }] },
  hornet: { name: 'ต่อยักษ์', tex: 'hornet', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 0.976, dmg: 0.412, matk: 0.461 }, speedMul: 1.518, def: -9, hit: 12, flee: 28, crit: -0.02, combo: 0.28, xp: 8, ai: 'dasher', moveSpeed: 520, radius: 13, zeny: [5, 7], idleMs: [500, 900], shots: 2, onHit: { poison: 1 } },
  turtleguard: { name: 'ทหารเต่าโล่', tex: 'turtleguard', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 1, dmg: 1, bodyMul: { hp: 1.71, dmg: 0.738, matk: 0.876 }, speedMul: 0.7, def: 106, hit: 10, flee: -1, counter: 0.12, xp: 10, ai: 'hopper', moveSpeed: 160, radius: 18, zeny: [6, 9], idleMs: [900, 1400],
    skills: [{ kind: 'shield', every: 4, pow: 0.1, name: 'กำแพงกระดอง', scale: { stat: 'vit' } }] },
  bloater: { name: 'คางคกพองลม', tex: 'bloater', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 1, dmg: 1, bodyMul: { hp: 0.836, dmg: 0.583, matk: 0.692 }, speedMul: 0.8, def: -14, hit: 8, flee: -1, counter: -0.03, xp: 8, ai: 'hopper', moveSpeed: 180, radius: 17, zeny: [5, 7], idleMs: [800, 1300], deathBlast: 2, onHit: { poison: 1 } },
  spiderling: { name: 'ลูกแมงมุม', tex: 'spiderling', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 0.917, dmg: 0.478, matk: 0.599 }, speedMul: 1.376, def: -9, hit: 12, flee: 18, crit: -0.02, combo: 0.18, xp: 3, ai: 'dasher', moveSpeed: 480, radius: 11, zeny: [1, 2], idleMs: [400, 800], onHit: { poison: 1 } },
  venomqueen: { name: 'เวโนมิร่า', title: 'ราชินีใยพิษ', tex: 'venomqueen', statAlloc: { int: 3, agi: 3, luk: 2, str: 2 }, hp: 1, dmg: 1, bodyMul: { hp: 2.558, dmg: 0.734, matk: 0.738 }, speedMul: 1.172, def: 20, hit: 17, flee: 6, crit: 0.05, combo: 0.22, xp: 14, ai: 'boss', mini: 'venomqueen', moveSpeed: 300, radius: 34, zeny: [45, 60], idleMs: [600, 900],
    onHit: { poison: 2 }, chargeEvery: 4, slamMul: 1, slamName: '🕷️ Venom Strike! พิษทวีคูณ', slamAnim: 'shot', slamColor: 0xd8f0c0, slamMagic: true, charge: true,
    venom: { dmg: 30, turns: 4, dex: 40 }, toxicSkin: true, // Q 2026-11-04 Monster DB comment
    skills: [{ kind: 'curse', every: 3, name: '🕸️ พ่นใยมัดตัว', fx: { web: 2 } }],
    phases: [{ at: 0.5, name: 'ฟักไข่! ลูกแมงมุมออกมา', summon: ['spiderling', 2], speed: 1.15 }] },
  frostgiant: { name: 'กลาเซียร์', title: 'ยักษ์ธารน้ำแข็ง', tex: 'frostgiant', statAlloc: { vit: 4, str: 3, int: 2, wis: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 1.646, dmg: 0.743, matk: 0.936 }, speedMul: 0.9, def: 82, hit: 11, flee: -1, counter: 0.1, xp: 14, ai: 'boss', mini: 'frostgiant', moveSpeed: 240, radius: 40, zeny: [45, 60], idleMs: [700, 1000],
    onHit: { armorBreak: 2 }, chargeEvery: 3, slamMul: 1.7, slamName: 'ทุบธารน้ำแข็ง! แช่แข็งทั้งตัว', slamFx: { freeze: 100 }, slamAnim: 'stomp', slamColor: 0x9fe3ff, slamMagic: true, charge: true,
    iceSkin: true, // Q 2026-11-04 Monster DB comment
    phases: [{ at: 0.4, name: 'เกราะน้ำแข็งพันปี!', shield: 0.18, dmg: 1.2, cleanse: true }],
    skills: [{ kind: 'bolt', every: 5, pow: 1.2, name: 'หอกน้ำแข็ง', fx: { freeze: 40 } }] },
  hydra: { name: 'ไฮดรามรกต', tex: 'hydra', statAlloc: { vit: 4, str: 3, int: 2, wis: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 1.461, dmg: 0.674, matk: 0.81 }, speedMul: 1.1, def: 21, hit: 16, flee: 9, combo: 0.3, counter: -0.08, xp: 0, ai: 'boss', moveSpeed: 240, radius: 46, zeny: [90, 120], idleMs: [700, 1000],
    onHit: { poison: 2 }, slamName: 'กัดสามหัว! พิษเข้ากระแสเลือด', slamMul: 1.6, slamFx: { poison: 4 }, slamAnim: 'bite', slamColor: 0x6fd08c, charge: true,
    phases: [
      { at: 0.66, name: 'หัวที่สองงอก! ฟื้นตัว + ไข่ฟัก', heal: 0.1, summon: ['toad', 2], dmg: 1.15, cleanse: true, onHit: { poison: 2, burn: 2 } },
      { at: 0.33, name: 'หัวที่สาม! คลั่งพ่นกรด', speed: 1.3, chargeEvery: 2, slamFx: { poison: 4, armorBreak: 3 }, cleanse: true },
    ],
    skills: [{ kind: 'bolt', every: 4, pow: 1.3, name: 'พ่นกรด', fx: { armorBreak: 2 } }] },
  // ----- Dungeon 5: บัลลังก์อเวจี. Buffers, cursers, revivers, mirrors, bombers -----
  hellknight: { name: 'อัศวินนรก', tex: 'hellknight', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 2.126, dmg: 0.772, matk: 1.025 }, speedMul: 0.957, def: 64, hit: 9, flee: -4, crit: 0.1, combo: -0.01, counter: 0.12, xp: 12, ai: 'hopper', moveSpeed: 220, radius: 18, zeny: [8, 11], idleMs: [700, 1200], onHit: { armorBreak: 2 },
    skills: [{ kind: 'warcry', every: 3, pow: 0.3, turns: 3, name: 'โห่ร้องสงคราม' }] },
  hexwitch: { name: 'แม่มดคำสาป', tex: 'hexwitch', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 1.428, dmg: 0.845, matk: 0.697 }, speedMul: 1.1, def: -13, hit: 11, flee: -1, counter: -0.01, xp: 11, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [7, 10], idleMs: [700, 1200], magic: true, onHit: { burn: 2 },
    skills: [{ kind: 'curse', every: 3, name: 'คำสาปอ่อนแรง', fx: { weaken: 3, burn: 2 } }] },
  imp: { name: 'ปีศาจระเบิด', tex: 'imp', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 0.99, dmg: 0.528, matk: 0.659 }, speedMul: 1.518, def: -12, hit: 13, flee: 24, crit: -0.03, combo: -0.02, xp: 8, ai: 'dasher', moveSpeed: 560, radius: 12, zeny: [5, 7], idleMs: [400, 800], deathBlast: 2 },
  necropriest: { name: 'นักบวชมรณะ', tex: 'necropriest', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 1, dmg: 1, bodyMul: { hp: 1.442, dmg: 0.704, matk: 0.666 }, speedMul: 0.9, def: -16, hit: 12, flee: -1, counter: -0.03, xp: 11, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [7, 10], idleMs: [700, 1200], magic: true,
    skills: [{ kind: 'revive', every: 3, pow: 0.5, name: 'ปลุกศพ' }, { kind: 'heal', every: 2, pow: 0.15, name: 'มนต์ดำฟื้นกาย' }] },
  wraith: { name: 'ภูตกระจก', tex: 'wraith', statAlloc: { int: 4, agi: 3, wis: 2, luk: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 1.485, dmg: 0.81, matk: 0.711 }, speedMul: 1.339, def: -12, hit: 14, flee: 22, crit: 0.09, combo: -0.02, xp: 10, ai: 'dasher', moveSpeed: 500, radius: 14, zeny: [6, 9], idleMs: [500, 900], magic: true, reflect: 0.1 }, // v49: 0.25 -> 0.1 (Q: reflect shields too annoying)
  // Q 2026-11-04 คาร์วอส Summon Maiden: HP / M.ATK copied from the drainer when she is called; no DEF / M.DEF, hero hits land only 50% of the time
  maiden: { name: 'เมเดน', title: 'ผีสาวพันธนาการ', tex: 'wraith', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 4.72, dmg: 0.687, matk: 0.732 }, speedMul: 1.1, def: -8, hit: 18, flee: -1, counter: -0.01, xp: 0, ai: 'dasher', moveSpeed: 400, radius: 16, zeny: [0, 0], idleMs: [500, 900], magic: true, fixedFlee: 0.5,
    skills: [{ kind: 'bolt', every: 1, pow: 1, name: '👻 คำสาปเมเดน', fx: { burn: 1 } }] },
  shard: { name: 'เศษกระจก', tex: 'shard', statAlloc: { int: 3, agi: 3, luk: 2, wis: 2 }, hp: 1, dmg: 1, bodyMul: { hp: 1.089, dmg: 0.528, matk: 0.515 }, speedMul: 1.25, def: -12, hit: 14, flee: 16, crit: -0.02, combo: -0.02, xp: 3, ai: 'dasher', moveSpeed: 500, radius: 11, zeny: [1, 2], idleMs: [400, 800], magic: true, deathBlast: 1.8 },
  mirage: { name: 'มิราจ', title: 'ภูตกระจกพันหน้า', tex: 'mirage', statAlloc: { int: 4, wis: 3, agi: 2, luk: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 2.507, dmg: 0.877, matk: 0.622 }, speedMul: 1.202, def: 7, hit: 17, flee: 17, crit: 0.13, combo: -0.03, xp: 16, ai: 'boss', mini: 'mirage', moveSpeed: 300, radius: 32, zeny: [60, 80], idleMs: [600, 900], magic: true, slamMagic: true,
    absorb: 0.3, onHit: { weaken: 2 }, chargeEvery: 4, slamMul: 1.2, slamName: 'โซลสไตรค์กระจก! ยิงดาเมจที่เก็บไว้คืน', slamFx: { weaken: 3, silence: 1 }, slamAnim: 'cast', slamColor: 0xc9a8ff, charge: true,
    phases: [{ at: 0.5, name: 'แตกร่าง! เศษกระจกระเบิดได้ + เก็บดาเมจมากขึ้น', summon: ['shard', 2], absorb: 0.4 }] },
  warlord: { name: 'บารัค', title: 'ขุนศึกคลั่งโลหิต', tex: 'warlord', statAlloc: { str: 5, vit: 3, agi: 1, dex: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 1.572, dmg: 0.497, matk: 0.875 }, speedMul: 1.101, def: 39, hit: 11, flee: 3, crit: 0.15, combo: 0.13, counter: 0.15, xp: 16, ai: 'boss', mini: 'warlord', moveSpeed: 300, radius: 36, zeny: [60, 80], idleMs: [600, 900], lifesteal: 0.2,
    onHit: { armorBreak: 2 }, chargeEvery: 4, slamMul: 2, slamName: 'ขวานผ่าภูผา! ฟันทะลุเกราะ', slamAnim: 'cleave', slamColor: 0xff5a4e, charge: true,
    skills: [{ kind: 'warcry', every: 3, pow: 0.25, turns: 99, self: true, name: 'คลั่งเลือด (สะสม)' }],
    phases: [{ at: 0.3, name: 'โกรธจัด! เร็วขึ้นมาก', speed: 1.5, dmg: 1.1 }] },
  lich: { name: 'โมรเดคัส', title: 'จอมลิชนิรันดร์', tex: 'lich', statAlloc: { int: 5, wis: 3, vit: 2 }, hp: 1, dmg: 1, bodyMul: { hp: 2.098, dmg: 1.004, matk: 0.533 }, speedMul: 1.1, def: 28, hit: 16, flee: 12, crit: 0.15, counter: -0.06, xp: 0, ai: 'boss', moveSpeed: 240, radius: 44, zeny: [150, 200], idleMs: [700, 1000], magic: true, slamMagic: true,
    onHit: { burn: 2 }, slamName: 'ดวงดาวมรณะ! ทุกอย่างมอดไหม้', slamMul: 1.7, slamFx: { burn: 3, weaken: 2 }, slamAnim: 'cast', slamColor: 0xff5a2a, charge: true,
    skills: [ // v49: every Mage element + legendary spells (first match wins: legendary every 6, curse every 4, element every 2)
      { kind: 'bolt', every: 6, name: 'เวทตำนาน', pick: [
        { kind: 'bolt', every: 1, big: true, hits: 4, pow: 0.55, name: '☄️ อุกกาบาตล้างโลก', fx: { burn: 1 } },
        { kind: 'bolt', every: 1, big: true, hits: 3, pow: 0.6, name: '🌨️ พายุหิมะนิรันดร์', fx: { freeze: 35 } },
        { kind: 'bolt', every: 1, big: true, hits: 5, pow: 0.42, name: '🌩️ เพลิงสายฟ้าพิโรธสวรรค์', fx: { silence: 1 } },
      ] },
      { kind: 'curse', every: 4, name: 'คำสาปจอมลิช', fx: { weaken: 3, armorBreak: 3 } },
      { kind: 'bolt', every: 2, name: 'เวทธาตุ', pick: [
        { kind: 'bolt', every: 1, pow: 1.2, name: '🔥 ลูกไฟอเวจี', fx: { burn: 1 } },
        { kind: 'bolt', every: 1, pow: 1.1, name: '❄️ หอกน้ำแข็งมรณะ', fx: { freeze: 30 } },
        { kind: 'bolt', every: 1, hits: 3, pow: 0.42, name: '⚡ สายฟ้าโซ่ตรวน' },
      ] },
    ],
    phases: [
      { at: 0.7, name: 'โล่กระดูก! สะท้อนดาเมจเบาๆ + ปีศาจระเบิด', shield: 0.1, reflect: 0.06, summon: ['imp', 2] }, // v49: reflect 0.2 -> 0.06
      { at: 0.35, name: 'พิธีกรรมสุดท้าย! เร็วขึ้น ร่ายถี่', heal: 0.08, speed: 1.3, dmg: 1.15, chargeEvery: 2, cleanse: true, slamFx: { burn: 3, weaken: 2, silence: 2 }, summon: ['hellknight', 1] },
    ] },
  // ----- event monsters (data/events.ts eventMon scales hp / dmg / def by dungeon tier) -----
  mimic: { name: 'มิมิค', tex: 'mimic', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 0.358, dmg: 0.412, matk: 0.512 }, speedMul: 1.1, def: -3, hit: 14, flee: -1, xp: 2, ai: 'hopper', moveSpeed: 260, radius: 16, zeny: [0, 0], idleMs: [600, 1000]},
  mimicking: { name: 'ราชามิมิค', title: 'หีบทองกินคน', tex: 'mimicking', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 0.2, dmg: 0.26, matk: 0.42 }, speedMul: 0.971, def: -6, hit: 13, flee: -3, combo: -0.01, counter: -0.02, xp: 6, ai: 'boss', moveSpeed: 240, radius: 38, zeny: [0, 0], idleMs: [700, 1000],
    charge: true, chargeEvery: 3, slamName: 'งับทั้งตัว!', slamAnim: 'bite', slamColor: 0xf2b84b, slamMul: 1.5 },
  goldjellop: { name: 'เจลล็อปทองคำ', tex: 'goldjellop', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 1, dmg: 1, bodyMul: { hp: 0.636 }, speedMul: 1.182, def: -2, hit: 1, flee: 13, crit: -0.01, xp: 4, ai: 'hopper', moveSpeed: 320, radius: 15, zeny: [0, 0], idleMs: [300, 600], passive: true },
  // ----- Support monsters (Q 2026-11-04): heal / shield their friends, weak alone -----
  dewsprite: { name: 'ภูตน้ำค้าง', tex: 'dewsprite', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 1, dmg: 1, bodyMul: { hp: 0.325, dmg: 0.322, matk: 0.4 }, speedMul: 1.3, def: -7, hit: 9, flee: 20, counter: -0.01, xp: 4, ai: 'dasher', moveSpeed: 420, radius: 12, zeny: [2, 3], idleMs: [500, 900], magic: true,
    skills: [{ kind: 'heal', every: 2, pow: 0.2, name: 'หยดน้ำค้างฟื้นพลัง' }, { kind: 'shield', every: 5, pow: 0.08, name: 'ม่านหมอก' }] },
  bonepriest: { name: 'นักบวชกระดูก', tex: 'bonepriest', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 1, dmg: 1, bodyMul: { hp: 0.747, dmg: 0.55, matk: 0.686 }, speedMul: 0.9, def: 10, hit: 12, flee: -1, counter: -0.02, xp: 7, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [4, 6], idleMs: [700, 1200], magic: true,
    skills: [{ kind: 'shield', every: 3, pow: 0.12, name: 'โล่กระดูก' }, { kind: 'heal', every: 4, pow: 0.15, name: 'มนต์ประสานกระดูก' }] },
  alpha: { name: 'จ่าฝูงเงา', tex: 'alpha', statAlloc: { str: 3, agi: 3, vit: 2, dex: 2 }, hp: 1, dmg: 1, bodyMul: { hp: 0.71, dmg: 0.458, matk: 0.733 }, speedMul: 0.932, def: 14, hit: 3, flee: -6, crit: 0.1, combo: 0.22, counter: -0.03, xp: 0, ai: 'boss', moveSpeed: 260, radius: 40, zeny: [35, 45], idleMs: [700, 1000], summon: 'shadowwolf', slamName: 'หอนเรียกพลัง! กระโจนตาหน้า', slamAnim: 'pounce', slamColor: 0x8a7ab8, charge: true,
    phases: [{ at: 0.4, name: 'หอนคลั่ง! เร็วขึ้น กัดแล้วอ่อนแรง', speed: 1.25, onHit: { weaken: 1 } }] },
  // ----- Dungeon 6: สุสานทรายกษัตริย์ (Lv 40-50). Stat monsters: hp / dmg / matk come from statAlloc at the room's Lv (data/mon-stats.ts);
  // def / hit / flee / crit / combo / counter written here are bonuses on top of the stat numbers -----
  mummy: { name: 'มัมมี่ทหารเฝ้าสุสาน', tex: 'mummy', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, xp: 14, ai: 'hopper', moveSpeed: 200, radius: 17, zeny: [10, 14], idleMs: [700, 1200],
    bodyMul: { hp: 1.2 }, def: 10, onHit: { weaken: 1 }, counter: 0.1, skills: [{ kind: 'warcry', every: 4, pow: 0.25, turns: 3, name: 'คำสาปฟาโรห์ปลุกใจ' }] },
  jackal: { name: 'หมาไนทะเลทราย', tex: 'jackal', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 1, dmg: 1, xp: 11, ai: 'dasher', moveSpeed: 560, radius: 14, zeny: [8, 11], idleMs: [500, 900],
    bodyMul: { hp: 1.3, dmg: 1.4 }, combo: 0.1 },
  sandscorp: { name: 'แมงป่องเพลิงทราย', tex: 'sandscorp', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 1, dmg: 1, xp: 13, ai: 'dasher', moveSpeed: 480, radius: 15, zeny: [9, 13], idleMs: [500, 900],
    bodyMul: { hp: 1.3 }, def: 15, onHit: { poison: 2 }, crit: 0.05 },
  dunewraith: { name: 'วิญญาณพายุทราย', tex: 'dunewraith', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 13, ai: 'dasher', moveSpeed: 500, radius: 14, zeny: [9, 13], idleMs: [500, 900], magic: true,
    flee: 15, skills: [{ kind: 'bolt', every: 3, pow: 1.3, name: 'พายุทรายบาดตา', fx: { silence: 1 } }] },
  scarab: { name: 'ด้วงสคารับทองแดง', tex: 'scarab', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 1, dmg: 1, xp: 14, ai: 'hopper', moveSpeed: 170, radius: 17, zeny: [10, 14], idleMs: [900, 1400],
    bodyMul: { dmg: 1.2 }, def: 50, counter: 0.15, skills: [{ kind: 'shield', every: 4, pow: 0.12, name: 'กระดองทองแดง', scale: { stat: 'vit' } }] },
  sunpriest: { name: 'นักบวชสุริยะดับ', tex: 'sunpriest', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 1, dmg: 1, xp: 13, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [9, 13], idleMs: [700, 1200], magic: true,
    skills: [{ kind: 'heal', every: 2, pow: 0.15, name: 'แสงสุริยะดับฟื้นกาย' }, { kind: 'shield', every: 3, pow: 0.1, name: 'ม่านทรายทอง' }] },
  sphinx: { name: 'เนฟธีส', title: 'สฟิงซ์ผู้ถามปริศนา', tex: 'sphinx', statAlloc: { int: 4, wis: 3, vit: 2, dex: 1 }, hp: 1, dmg: 1, xp: 22, ai: 'boss', mini: 'sphinx', moveSpeed: 260, radius: 38, zeny: [90, 120], idleMs: [600, 900],
    magic: true, slamMagic: true, def: 20, crit: 0.1, chargeEvery: 4, slamMul: 1.5, slamName: 'ปริศนามรณะ! ตอบไม่ทัน = ใบ้', slamFx: { silence: 2, weaken: 2 }, slamAnim: 'cast', slamColor: 0xf2d27a, charge: true,
    skills: [{ kind: 'bolt', every: 3, hits: 3, pow: 0.5, name: '🔺 ลำแสงพีระมิด' }, { kind: 'curse', every: 5, name: 'คำสาปปริศนา', fx: { armorBreak: 2 } }],
    phases: [{ at: 0.5, name: 'ดวงตาสุริยะเปิด! เวทแรงขึ้น', dmg: 1.15, shield: 0.12, cleanse: true }] },
  jackallord: { name: 'คาห์รัน', title: 'จ้าวหมาไนสองดาบ', tex: 'jackallord', statAlloc: { agi: 4, str: 3, luk: 2, dex: 1 }, hp: 1, dmg: 1, xp: 22, ai: 'boss', mini: 'jackallord', moveSpeed: 320, radius: 34, zeny: [90, 120], idleMs: [600, 900],
    bodyMul: { hp: 0.9 }, def: 15, combo: 0.05, trueSight: { after: 2, turns: 3 }, chargeEvery: 4, slamMul: 1.8, slamName: 'ระบำสองดาบ! ฟันรัวไม่ยั้ง', slamAnim: 'pounce', slamColor: 0xffb35a, charge: true,
    skills: [{ kind: 'strike', every: 3, hits: 3, pow: 0.5, name: '🗡️ สามคมจันทร์เสี้ยว', fx: { armorBreak: 1 } }],
    phases: [{ at: 0.5, name: 'หอนเรียกฝูง! หมาไนมาช่วย', summon: ['jackal', 2], speed: 1.15 }] },
  pharaoh: { name: 'เนเฟรู', title: 'ราชันย์ทรายนิรันดร์', tex: 'pharaoh', statAlloc: { str: 3, int: 3, vit: 3, wis: 2, dex: 1 }, hp: 1, dmg: 1, xp: 0, ai: 'boss', moveSpeed: 240, radius: 46, zeny: [220, 300], idleMs: [700, 1000],
    def: 25, crit: 0.1, lifesteal: 0.1, summon: 'mummy', slamName: 'คำพิพากษาสุริยะ! ทรายทองถล่ม', slamMul: 1.7, slamMagic: true, slamFx: { burn: 2, armorBreak: 2 }, slamAnim: 'stomp', slamColor: 0xf2b84b, charge: true,
    skills: [{ kind: 'bolt', every: 3, pow: 1.2, name: '☀️ เปลวสุริยะ', fx: { burn: 1 } }, { kind: 'curse', every: 5, name: 'คำสาปสุสาน', fx: { weaken: 3, poison: 2 } }, { kind: 'revive', every: 4, pow: 0.5, name: 'ปลุกองครักษ์' }],
    phases: [{ at: 0.6, name: 'ตื่นจากโลง! โล่ทรายทอง + มัมมี่องครักษ์', shield: 0.12, summon: ['mummy', 2] },
      { at: 0.3, name: 'สุริยคราส! เร็วขึ้น ร่ายถี่', speed: 1.25, dmg: 1.15, chargeEvery: 2, cleanse: true, slamFx: { burn: 3, armorBreak: 3, silence: 1 } }] },
  // ----- D7-D13 (v78+): one pack per dungeon, data/dungeons/dN.ts -----
  ...Object.assign({}, ...PACKS.map((p) => p.monsters)) as Record<D7Kind | D8Kind | D9Kind | D10Kind | D11Kind | D12Kind | D13Kind | D14Kind, MonsterDef>,
}

// ===== v49 monster kits (Q 2026-11-04: "ให้แต่ละตัวมี stat combo, counter, cri, สกิลโหดๆ"): merged into MONSTERS below =====
// skills are appended after the monster's own (own skills keep priority on shared turns).
const KITS: Partial<Record<MonsterKind, Pick<MonsterDef, 'crit' | 'combo' | 'counter' | 'trueSight' | 'razor' | 'vengeance'> & { add?: MonSkill[] }>> = {
  // v126: D1-D5 crit / combo / counter moved onto each monster as stat bonuses (like D6+)
  hornet: { trueSight: { after: 3, turns: 2 } }, hellknight: { trueSight: { after: 3, turns: 2 } },
  // bosses / mini bosses: stats + a signature skill
  king: { add: [{ kind: 'strike', every: 5, pow: 1.6, name: '🟢 ทับแบน', fx: { freeze: 30 } }] },
  alpha: { trueSight: { after: 2, turns: 3 }, add: [{ kind: 'strike', every: 4, hits: 3, pow: 0.6, name: '🐺 กรงเล็บพายุ' }] },
  duelist: { trueSight: { after: 2, turns: 3 }, add: [{ kind: 'strike', every: 5, hits: 3, pow: 0.55, name: '🤺 แทงสามจังหวะ' }] },
  hunter: { trueSight: { after: 2, turns: 3 }, razor: 0.05, add: [{ kind: 'strike', every: 4, pow: 2.5, drain: 0.1, name: '🩸 ตะปบจุดตาย' }] }, // Q 2026-11-04 Monster DB comment
  gunner: { trueSight: { after: 2, turns: 3 }, add: [{ kind: 'strike', every: 4, hits: 4, pow: 0.4, name: '🔫 ระดมยิง', scale: { stat: 'dex' } }] },
  drainer: { add: [{ kind: 'bolt', every: 4, pow: 1.3, name: '🌑 ดูดวิญญาณ', fx: { weaken: 2 } }] },
  deathknight: { trueSight: { after: 2, turns: 3 }, vengeance: true, add: [{ kind: 'strike', every: 5, pow: 2.2, alone: 1.5, name: '⚔️ ดาบมรณะ' }] }, // Q 2026-11-22: physical (was magic since 2026-11-04; vs DEF, rolls Hit vs Flee, no longer a cast), stronger with no undead at its side · Q 2026-11-19: pow 2.8 -> 2.2, alone x2 -> x1.5 (was 6x its basic hit, one-shot 75% HP)
  venomqueen: { add: [{ kind: 'strike', every: 2, hits: 2, pow: 0.7, name: '🦂 เหล็กใน', fx: { poison: 4 } }] }, // Q: no ตาเหยี่ยว (the web does that job)
  frostgiant: { add: [{ kind: 'strike', every: 5, pow: 1.6, name: '🧊 ทุบธารน้ำแข็ง', fx: { freeze: 50 } }, { kind: 'curse', every: 4, name: '💙 Frozen Heart', fx: { slow: 2 } }] }, // Q: Frozen Heart replaces ตาเหยี่ยว
  hydra: { trueSight: { after: 2, turns: 3 }, add: [{ kind: 'bolt', every: 4, hits: 3, pow: 0.5, name: '🐍 พ่นพิษสามหัว', fx: { poison: 1 } }] },
  mirage: { add: [{ kind: 'bolt', every: 5, hits: 2, pow: 0.7, name: '🔁 ภาพลวงสองเงา' }] },
  warlord: { trueSight: { after: 2, turns: 3 }, add: [{ kind: 'strike', every: 5, hits: 2, pow: 0.9, name: '🪓 ขวานคู่ผ่าฟ้า', fx: { armorBreak: 1 } }] },
}
for (const [k, kit] of Object.entries(KITS) as [MonsterKind, NonNullable<(typeof KITS)[MonsterKind]>][]) {
  const { add, ...stats } = kit
  Object.assign(MONSTERS[k], stats)
  if (add) MONSTERS[k].skills = [...(MONSTERS[k].skills ?? []), ...add]
}

// v81 (admin.html "ยืมจาก Hero tree"): every monster gets its OWN empty hit-effect / body objects, so a live-config patch can add
// e.g. onHit.poison to a monster that had none (a patch only writes into objects that exist). Empty = no effect: applyFx skips
// absent / 0 keys and bodyMul reads `?? 1`. So test "has an effect" with hasFx(), never with `if (d.onHit)`.
// venom / trueSight are NOT pre-made: their numbers are required, an empty one would break the monster.
export const hasFx = (fx: HitFx | undefined): boolean => !!fx && Object.values(fx).some((v) => !!v)
for (const d of Object.values(MONSTERS)) {
  d.onHit ??= {}
  d.bodyMul ??= {}
  if (d.ai === 'boss') d.slamFx ??= {}
}
