import type { Archetype, SkillScale, StatAlloc } from './mon-stats'
import type { BaseStat } from './meta'
import { PACKS, type D7Kind, type D7Mini, type D8Kind, type D8Mini, type D9Kind, type D9Mini, type D10Kind, type D10Mini } from './dungeons'
import type { SkillFormula } from './mon-skill-scale'

export type MonsterKind = 'jellop' | 'wolf' | 'king' | 'minijellop' | 'bat' | 'shroom' | 'boar' | 'shadowwolf' | 'alpha'
  | 'skeleton' | 'wisp' | 'gargoyle' | 'duelist' | 'hunter' | 'gunner' | 'drainer' | 'deathknight'
  | 'toad' | 'lizardshaman' | 'hornet' | 'turtleguard' | 'bloater' | 'spiderling' | 'venomqueen' | 'frostgiant' | 'hydra'
  | 'hellknight' | 'hexwitch' | 'imp' | 'necropriest' | 'wraith' | 'shard' | 'mirage' | 'warlord' | 'lich'
  | 'dewsprite' | 'bonepriest'
  | 'mummy' | 'jackal' | 'sandscorp' | 'dunewraith' | 'scarab' | 'sunpriest' | 'sphinx' | 'jackallord' | 'pharaoh' // D6
  | 'maiden' // drainer's Summon Maiden (Q 2026-11-04)
  | D7Kind | D8Kind | D9Kind | D10Kind // v78: D7-D10 packs (data/dungeons/dN.ts)
  | 'mimic' | 'mimicking' | 'goldjellop' // event monsters (design/roadmap-and-events-v1.md): stats scale with the dungeon tier at spawn
export type MiniKind = 'duelist' | 'hunter' | 'gunner' | 'drainer' | 'venomqueen' | 'frostgiant' | 'mirage' | 'warlord' | 'sphinx' | 'jackallord'
  | D7Mini | D8Mini | D9Mini | D10Mini

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
  magic?: boolean // strike: dealt as magic (vs M.DEF, Flee can't dodge) from ATK — death knight ดาบมรณะ
  alone?: number // strike: x this when no other monster stands with it
  drain?: number // strike (Q 2026-11-04, hunter): after it lands, drains this share of the hero's current HP as magic damage and heals itself by it
  hits?: number // bolt / strike: this many hits of pow each (each rolls its own crit; strike hits each roll Flee)
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
  trueSight?: { after: number; turns: number } // v56 anti-AGI: after the hero evades it `after` times, its physical hits ignore Flee + lucky dodge for `turns` of its turns
  shots?: number // each attack is this many small hits, each rolls hit/flee on its own
  // ----- Dungeon 4-5 -----
  onHit?: HitFx // every landed hit also puts this on the hero
  slamFx?: HitFx // boss: the charged attack also puts this on the hero
  skills?: MonSkill[]
  reflect?: number // reflects this share of every direct hit (strike / Smash) back as magic damage
  absorb?: number // stores this share of every direct hit; the charged attack fires it back as Soul Strike bolts (Q 2026-11-03, Mirage)
  deathBlast?: number // explodes on death: (dmg) x monDmgMul x this as magic (Flee / lucky dodge / shield all work)
  phases?: BossPhase[]
  passive?: boolean // event monster that never attacks (เจลล็อปทองคำ: it only runs)
  // ----- v49 combat stats (Q 2026-11-04: monsters get combo / counter / crit like the hero) -----
  crit?: number // chance a hit / spell crits: x BATTLE.monCritMul and can't be fled (lucky dodge / shield still work)
  combo?: number // after a normal attack: chance to chain another hit, up to BATTLE.comboMax extra (each x BATTLE.monComboMul)
  counter?: number // when the hero's basic attack lands on it: chance to strike back right away (normal hit x BATTLE.monCounterMul)
  // ----- 7 base stats (data/mon-stats.ts). D6+ (level dungeons): numbers come from the stats at the room's level.
  // v76 D1-5 / events: hp / dmg / matk / def / hit / flee / crit / combo / counter are the tuned values AT THE HOME LEVEL with the
  // default statAlloc; changing statAlloc, LEGACY.lv or MON_STAT moves them by the same stat formulas (mon-stats withStats) -----
  statAlloc?: Archetype | StatAlloc // how its stat points are split (archetype or own weights; objects so admin.html can edit them). D6+: def / hit / flee / crit / combo / counter are bonuses on top
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
  jellop: { name: 'เจลล็อป', tex: 'jellop', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 34, dmg: 7, xp: 3, ai: 'hopper', moveSpeed: 250, radius: 15, zeny: [1, 2], idleMs: [500, 1100] },
  minijellop: { name: 'เจลล็อปจิ๋ว', tex: 'jellop', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 18, dmg: 4, xp: 1, ai: 'hopper', moveSpeed: 300, radius: 11, zeny: [0, 1], idleMs: [350, 800] },
  wolf: { name: 'หมาป่าสีเทา', tex: 'wolf', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 55, dmg: 11, xp: 5, ai: 'dasher', moveSpeed: 560, radius: 16, zeny: [2, 3], idleMs: [700, 1300], flee: 18, hit: 20 },
  king: { name: 'ราชาเจลล็อป', tex: 'king', statAlloc: { vit: 4, str: 3, int: 2, wis: 1 }, hp: 860, dmg: 16, matk: 18, xp: 0, ai: 'boss', moveSpeed: 230, radius: 38, zeny: [15, 20], idleMs: [700, 1000], summon: 'minijellop', slamName: 'ชาร์จพลัง! ทุบตอนนี้เลย', slamMagic: true, slamAnim: 'stomp', slamColor: 0x9fe3ff, charge: true,
    phases: [{ at: 0.5, name: 'ร่างเยลลี่ยักษ์! เกราะวุ้น', shield: 0.1 }] }, // boss buff v1
  // ----- Dungeon 2: ป่าหมาป่าเงา. Each monster tests one stat (see design/dungeon-2-and-events.md) -----
  bat: { name: 'ค้างคาวถ้ำ', tex: 'bat', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 42, dmg: 15, xp: 4, ai: 'dasher', moveSpeed: 500, radius: 12, zeny: [2, 3], idleMs: [500, 900], flee: 30, hit: 26 },
  shroom: { name: 'เห็ดสปอร์', tex: 'shroom', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 80, dmg: 21, matk: 24, xp: 5, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [2, 4], idleMs: [700, 1200], magic: true,
    skills: [{ kind: 'bolt', every: 3, pow: 1.3, name: 'ปล่อยสปอร์พิษ', fx: { poison: 1 } }] },
  boar: { name: 'หมูป่าเขี้ยวเหล็ก', tex: 'boar', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 145, dmg: 24, xp: 7, ai: 'dasher', moveSpeed: 420, radius: 18, zeny: [3, 5], idleMs: [800, 1300], def: 60 },
  shadowwolf: { name: 'หมาป่าเงา', tex: 'shadowwolf', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 92, dmg: 22, xp: 6, ai: 'dasher', moveSpeed: 600, radius: 16, zeny: [3, 4], idleMs: [600, 1100], flee: 22, hit: 26 },
  // ----- Dungeon 3: ซากป้อมวีรชน. Waves -> 1v1 mini boss (random of 4) -> waves -> boss -----
  skeleton: { name: 'ทหารโครงกระดูก', tex: 'skeleton', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 210, dmg: 36, xp: 7, ai: 'hopper', moveSpeed: 220, radius: 15, zeny: [4, 6], idleMs: [700, 1200], def: 45, hit: 32 },
  wisp: { name: 'ดวงไฟผี', tex: 'wisp', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 110, dmg: 34, matk: 38, xp: 6, ai: 'dasher', moveSpeed: 520, radius: 13, zeny: [4, 5], idleMs: [500, 900], magic: true, flee: 30,
    skills: [{ kind: 'bolt', every: 3, pow: 1.4, name: 'ลูกไฟผี', fx: { burn: 1 } }] },
  gargoyle: { name: 'การ์กอยล์หิน', tex: 'gargoyle', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 340, dmg: 44, xp: 9, ai: 'hopper', moveSpeed: 180, radius: 18, zeny: [5, 7], idleMs: [900, 1400], def: 90, hit: 30 },
  duelist: { name: 'เซเลสต์', title: 'นักดาบดวลเงินจันทร์', tex: 'duelist', statAlloc: { agi: 4, dex: 3, str: 3, luk: 2 }, hp: 1600, dmg: 42, xp: 12, ai: 'boss', mini: 'duelist', moveSpeed: 300, radius: 30, zeny: [30, 40], idleMs: [600, 900], def: 20, flee: 30, hit: 38,
    phases: [{ at: 0.4, name: 'ดาบจันทร์เต็มดวง! เร็วและคมขึ้น', speed: 1.2, dmg: 1.15 }] },
  hunter: { name: 'กริมฟาง', title: 'หมาป่าคลั่งเลือด', tex: 'hunter', statAlloc: { str: 4, agi: 3, vit: 2, luk: 1 }, hp: 1750, dmg: 44, xp: 12, ai: 'boss', mini: 'hunter', moveSpeed: 300, radius: 34, zeny: [30, 40], idleMs: [600, 900], def: 15, flee: 15, hit: 34, lifesteal: 0.35, chargeEvery: 4, slamName: 'กลิ่นเลือด! กระโจนตะครุบ', slamAnim: 'pounce', slamColor: 0xc03050, charge: true },
  gunner: { name: 'ปิ๊กซี่', title: 'มือปืนพลุบ้าระห่ำ', tex: 'gunner', statAlloc: { dex: 5, agi: 2, luk: 2, int: 1 }, hp: 1500, dmg: 21, xp: 12, ai: 'boss', mini: 'gunner', moveSpeed: 300, radius: 30, zeny: [30, 40], idleMs: [600, 900], def: 5, flee: 20, hit: 36, shots: 3, slamMul: 3.4, slamScale: { stat: 'dex' }, slamName: 'จรวดยักษ์! ล็อกเป้าแล้ว', slamAnim: 'shot', slamColor: 0xff8c42, slamMagic: true, charge: true,
    phases: [{ at: 0.5, name: 'กระสุนเพลิง! ยิงติดไฟ', onHit: { burn: 1 } }] },
  drainer: { name: 'คาร์วอส', title: 'จอมเวทกาดำ', tex: 'drainer', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1700, dmg: 38, matk: 42, xp: 12, ai: 'boss', mini: 'drainer', moveSpeed: 300, radius: 32, zeny: [30, 40], idleMs: [600, 900], def: 20, hit: 34, magic: true, slamMagic: true, lifesteal: 0.3, slamMul: 1.9, slamName: 'กรงเล็บวิญญาณ! ดูดชีวิต', slamAnim: 'cast', slamColor: 0xc03050, charge: true,
    skills: [{ kind: 'curse', every: 4, name: 'มนต์ปิดปาก', fx: { silence: 1 } }] },
  deathknight: { name: 'อัศวินมรณะ', tex: 'deathknight', statAlloc: { str: 4, vit: 3, int: 2, wis: 1 }, hp: 3200, dmg: 50, matk: 58, xp: 0, ai: 'boss', moveSpeed: 240, radius: 42, zeny: [60, 80], idleMs: [700, 1000], def: 35, flee: 12, hit: 36, lifesteal: 0.2, summon: 'skeleton', slamName: 'ดาบมรณะ! ฟันกวาดวิญญาณ', slamAnim: 'cleave', slamColor: 0x9a6aff, slamMagic: true, charge: true,
    skills: [{ kind: 'revive', every: 4, pow: 0.5, name: 'ปลุกศพ' }],
    phases: [{ at: 0.35, name: '💀 Death Realm! ดูด All Stat ทุกเทิร์น', drainStats: 1 }] }, // Q 2026-11-04 Monster DB comment (was: speed x1.2, charge every 2)
  // ----- Dungeon 4: บึงพิษมรกต. Monsters that heal, shield, poison and explode (design/dungeon-4-5-brutal.md) -----
  toad: { name: 'คางคกพิษ', tex: 'toad', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 270, dmg: 40, xp: 8, ai: 'hopper', moveSpeed: 220, radius: 16, zeny: [5, 7], idleMs: [700, 1200], def: 25, hit: 34, onHit: { poison: 2 } },
  lizardshaman: { name: 'หมอผีกิ้งก่า', tex: 'lizardshaman', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 240, dmg: 34, matk: 38, xp: 9, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [5, 8], idleMs: [700, 1200], magic: true, hit: 34,
    skills: [{ kind: 'heal', every: 2, pow: 0.18, name: 'น้ำมนต์บึง' }, { kind: 'bolt', every: 3, pow: 1.3, name: 'สายฟ้าบึง' }] },
  hornet: { name: 'ต่อยักษ์', tex: 'hornet', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 170, dmg: 20, xp: 8, ai: 'dasher', moveSpeed: 520, radius: 13, zeny: [5, 7], idleMs: [500, 900], flee: 42, hit: 40, shots: 2, onHit: { poison: 1 } },
  turtleguard: { name: 'ทหารเต่าโล่', tex: 'turtleguard', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 430, dmg: 38, xp: 10, ai: 'hopper', moveSpeed: 160, radius: 18, zeny: [6, 9], idleMs: [900, 1400], def: 120, hit: 32,
    skills: [{ kind: 'shield', every: 4, pow: 0.1, name: 'กำแพงกระดอง', scale: { stat: 'vit' } }] },
  bloater: { name: 'คางคกพองลม', tex: 'bloater', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 210, dmg: 30, xp: 8, ai: 'hopper', moveSpeed: 180, radius: 17, zeny: [5, 7], idleMs: [800, 1300], hit: 30, deathBlast: 2, onHit: { poison: 1 } },
  spiderling: { name: 'ลูกแมงมุม', tex: 'spiderling', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 160, dmg: 26, xp: 3, ai: 'dasher', moveSpeed: 480, radius: 11, zeny: [1, 2], idleMs: [400, 800], flee: 30, hit: 36, onHit: { poison: 1 } },
  venomqueen: { name: 'เวโนมิร่า', title: 'ราชินีใยพิษ', tex: 'venomqueen', statAlloc: { int: 3, agi: 3, luk: 2, str: 2 }, hp: 2300, dmg: 44, matk: 48, xp: 14, ai: 'boss', mini: 'venomqueen', moveSpeed: 300, radius: 34, zeny: [45, 60], idleMs: [600, 900], def: 30, flee: 25, hit: 40,
    onHit: { poison: 2 }, chargeEvery: 4, slamMul: 1, slamName: '🕷️ Venom Strike! พิษทวีคูณ', slamAnim: 'shot', slamColor: 0xd8f0c0, slamMagic: true, charge: true,
    venom: { dmg: 30, turns: 4, dex: 40 }, toxicSkin: true, // Q 2026-11-04 Monster DB comment
    skills: [{ kind: 'curse', every: 3, name: '🕸️ พ่นใยมัดตัว', fx: { web: 2 } }],
    phases: [{ at: 0.5, name: 'ฟักไข่! ลูกแมงมุมออกมา', summon: ['spiderling', 2], speed: 1.15 }] },
  frostgiant: { name: 'กลาเซียร์', title: 'ยักษ์ธารน้ำแข็ง', tex: 'frostgiant', statAlloc: { vit: 4, str: 3, int: 2, wis: 1 }, hp: 2600, dmg: 50, matk: 54, xp: 14, ai: 'boss', mini: 'frostgiant', moveSpeed: 240, radius: 40, zeny: [45, 60], idleMs: [700, 1000], def: 100, flee: 5, hit: 34,
    onHit: { armorBreak: 2 }, chargeEvery: 3, slamMul: 1.7, slamName: 'ทุบธารน้ำแข็ง! แช่แข็งทั้งตัว', slamFx: { freeze: 100 }, slamAnim: 'stomp', slamColor: 0x9fe3ff, slamMagic: true, charge: true,
    iceSkin: true, // Q 2026-11-04 Monster DB comment
    phases: [{ at: 0.4, name: 'เกราะน้ำแข็งพันปี!', shield: 0.18, dmg: 1.2, cleanse: true }],
    skills: [{ kind: 'bolt', every: 5, pow: 1.2, name: 'หอกน้ำแข็ง', fx: { freeze: 40 } }] },
  hydra: { name: 'ไฮดรามรกต', tex: 'hydra', statAlloc: { vit: 4, str: 3, int: 2, wis: 1 }, hp: 4800, dmg: 54, matk: 56, xp: 0, ai: 'boss', moveSpeed: 240, radius: 46, zeny: [90, 120], idleMs: [700, 1000], def: 45, flee: 15, hit: 40,
    onHit: { poison: 2 }, slamName: 'กัดสามหัว! พิษเข้ากระแสเลือด', slamMul: 1.6, slamFx: { poison: 4 }, slamAnim: 'bite', slamColor: 0x6fd08c, charge: true,
    phases: [
      { at: 0.66, name: 'หัวที่สองงอก! ฟื้นตัว + ไข่ฟัก', heal: 0.1, summon: ['toad', 2], dmg: 1.15, cleanse: true, onHit: { poison: 2, burn: 2 } },
      { at: 0.33, name: 'หัวที่สาม! คลั่งพ่นกรด', speed: 1.3, chargeEvery: 2, slamFx: { poison: 4, armorBreak: 3 }, cleanse: true },
    ],
    skills: [{ kind: 'bolt', every: 4, pow: 1.3, name: 'พ่นกรด', fx: { armorBreak: 2 } }] },
  // ----- Dungeon 5: บัลลังก์อเวจี. Buffers, cursers, revivers, mirrors, bombers -----
  hellknight: { name: 'อัศวินนรก', tex: 'hellknight', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 560, dmg: 56, xp: 12, ai: 'hopper', moveSpeed: 220, radius: 18, zeny: [8, 11], idleMs: [700, 1200], def: 80, hit: 40, onHit: { armorBreak: 2 },
    skills: [{ kind: 'warcry', every: 3, pow: 0.3, turns: 3, name: 'โห่ร้องสงคราม' }] },
  hexwitch: { name: 'แม่มดคำสาป', tex: 'hexwitch', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 320, dmg: 48, matk: 52, xp: 11, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [7, 10], idleMs: [700, 1200], magic: true, hit: 40, onHit: { burn: 2 },
    skills: [{ kind: 'curse', every: 3, name: 'คำสาปอ่อนแรง', fx: { weaken: 3, burn: 2 } }] },
  imp: { name: 'ปีศาจระเบิด', tex: 'imp', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 200, dmg: 36, xp: 8, ai: 'dasher', moveSpeed: 560, radius: 12, zeny: [5, 7], idleMs: [400, 800], flee: 38, hit: 42, deathBlast: 2 },
  necropriest: { name: 'นักบวชมรณะ', tex: 'necropriest', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 380, dmg: 40, matk: 44, xp: 11, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [7, 10], idleMs: [700, 1200], magic: true, hit: 38,
    skills: [{ kind: 'revive', every: 3, pow: 0.5, name: 'ปลุกศพ' }, { kind: 'heal', every: 2, pow: 0.15, name: 'มนต์ดำฟื้นกาย' }] },
  wraith: { name: 'ภูตกระจก', tex: 'wraith', statAlloc: { int: 4, agi: 3, wis: 2, luk: 1 }, hp: 300, dmg: 46, matk: 50, xp: 10, ai: 'dasher', moveSpeed: 500, radius: 14, zeny: [6, 9], idleMs: [500, 900], magic: true, flee: 36, hit: 40, reflect: 0.1 }, // v49: 0.25 -> 0.1 (Q: reflect shields too annoying)
  // Q 2026-11-04 คาร์วอส Summon Maiden: HP / M.ATK copied from the drainer when she is called; no DEF / M.DEF, hero hits land only 50% of the time
  maiden: { name: 'เมเดน', title: 'ผีสาวพันธนาการ', tex: 'wraith', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1000, dmg: 30, matk: 40, xp: 0, ai: 'dasher', moveSpeed: 400, radius: 16, zeny: [0, 0], idleMs: [500, 900], magic: true, def: 0, hit: 40, fixedFlee: 0.5,
    skills: [{ kind: 'bolt', every: 1, pow: 1, name: '👻 คำสาปเมเดน', fx: { burn: 1 } }] },
  shard: { name: 'เศษกระจก', tex: 'shard', statAlloc: { int: 3, agi: 3, luk: 2, wis: 2 }, hp: 220, dmg: 30, matk: 34, xp: 3, ai: 'dasher', moveSpeed: 500, radius: 11, zeny: [1, 2], idleMs: [400, 800], magic: true, flee: 30, hit: 40, deathBlast: 1.8 },
  mirage: { name: 'มิราจ', title: 'ภูตกระจกพันหน้า', tex: 'mirage', statAlloc: { int: 4, wis: 3, agi: 2, luk: 1 }, hp: 2600, dmg: 52, matk: 56, xp: 16, ai: 'boss', mini: 'mirage', moveSpeed: 300, radius: 32, zeny: [60, 80], idleMs: [600, 900], magic: true, slamMagic: true, def: 20, flee: 34, hit: 44,
    absorb: 0.3, onHit: { weaken: 2 }, chargeEvery: 4, slamMul: 1.2, slamName: 'โซลสไตรค์กระจก! ยิงดาเมจที่เก็บไว้คืน', slamFx: { weaken: 3, silence: 1 }, slamAnim: 'cast', slamColor: 0xc9a8ff, charge: true,
    phases: [{ at: 0.5, name: 'แตกร่าง! เศษกระจกระเบิดได้ + เก็บดาเมจมากขึ้น', summon: ['shard', 2], absorb: 0.4 }] },
  warlord: { name: 'บารัค', title: 'ขุนศึกคลั่งโลหิต', tex: 'warlord', statAlloc: { str: 5, vit: 3, agi: 1, dex: 1 }, hp: 2700, dmg: 50, xp: 16, ai: 'boss', mini: 'warlord', moveSpeed: 300, radius: 36, zeny: [60, 80], idleMs: [600, 900], def: 60, flee: 15, hit: 44, lifesteal: 0.2,
    onHit: { armorBreak: 2 }, chargeEvery: 4, slamMul: 2, slamName: 'ขวานผ่าภูผา! ฟันทะลุเกราะ', slamAnim: 'cleave', slamColor: 0xff5a4e, charge: true,
    skills: [{ kind: 'warcry', every: 3, pow: 0.25, turns: 99, self: true, name: 'คลั่งเลือด (สะสม)' }],
    phases: [{ at: 0.3, name: 'โกรธจัด! เร็วขึ้นมาก', speed: 1.5, dmg: 1.1 }] },
  lich: { name: 'โมรเดคัส', title: 'จอมลิชนิรันดร์', tex: 'lich', statAlloc: { int: 5, wis: 3, vit: 2 }, hp: 6000, dmg: 62, matk: 66, xp: 0, ai: 'boss', moveSpeed: 240, radius: 44, zeny: [150, 200], idleMs: [700, 1000], magic: true, slamMagic: true, def: 50, flee: 18, hit: 44,
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
      { at: 0.35, name: 'พิธีกรรมสุดท้าย! เร็วขึ้น ชาร์จถี่', heal: 0.08, speed: 1.3, dmg: 1.15, chargeEvery: 2, cleanse: true, slamFx: { burn: 3, weaken: 2, silence: 2 }, summon: ['hellknight', 1] },
    ] },
  // ----- event monsters (data/events.ts eventMon scales hp / dmg / def by dungeon tier) -----
  mimic: { name: 'มิมิค', tex: 'mimic', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 60, dmg: 10, xp: 2, ai: 'hopper', moveSpeed: 260, radius: 16, zeny: [0, 0], idleMs: [600, 1000], hit: 28 },
  mimicking: { name: 'ราชามิมิค', title: 'หีบทองกินคน', tex: 'mimicking', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 360, dmg: 11, xp: 6, ai: 'boss', moveSpeed: 240, radius: 38, zeny: [0, 0], idleMs: [700, 1000], hit: 32,
    charge: true, chargeEvery: 3, slamName: 'งับทั้งตัว!', slamAnim: 'bite', slamColor: 0xf2b84b, slamMul: 1.5 },
  goldjellop: { name: 'เจลล็อปทองคำ', tex: 'goldjellop', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 100, dmg: 0, xp: 4, ai: 'hopper', moveSpeed: 320, radius: 15, zeny: [0, 0], idleMs: [300, 600], flee: 20, passive: true },
  // ----- Support monsters (Q 2026-11-04): heal / shield their friends, weak alone -----
  dewsprite: { name: 'ภูตน้ำค้าง', tex: 'dewsprite', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 70, dmg: 12, matk: 16, xp: 4, ai: 'dasher', moveSpeed: 420, radius: 12, zeny: [2, 3], idleMs: [500, 900], magic: true, flee: 26, hit: 26,
    skills: [{ kind: 'heal', every: 2, pow: 0.2, name: 'หยดน้ำค้างฟื้นพลัง' }, { kind: 'shield', every: 5, pow: 0.08, name: 'ม่านหมอก' }] },
  bonepriest: { name: 'นักบวชกระดูก', tex: 'bonepriest', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 180, dmg: 24, matk: 34, xp: 7, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [4, 6], idleMs: [700, 1200], magic: true, def: 20, hit: 32,
    skills: [{ kind: 'shield', every: 3, pow: 0.12, name: 'โล่กระดูก' }, { kind: 'heal', every: 4, pow: 0.15, name: 'มนต์ประสานกระดูก' }] },
  alpha: { name: 'จ่าฝูงเงา', tex: 'alpha', statAlloc: { str: 3, agi: 3, vit: 2, dex: 2 }, hp: 1600, dmg: 30, xp: 0, ai: 'boss', moveSpeed: 260, radius: 40, zeny: [35, 45], idleMs: [700, 1000], def: 25, flee: 12, hit: 30, summon: 'shadowwolf', slamName: 'หอนเรียกพลัง! กระโจนตาหน้า', slamAnim: 'pounce', slamColor: 0x8a7ab8, charge: true,
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
      { at: 0.3, name: 'สุริยคราส! เร็วขึ้น ชาร์จถี่', speed: 1.25, dmg: 1.15, chargeEvery: 2, cleanse: true, slamFx: { burn: 3, armorBreak: 3, silence: 1 } }] },
  // ----- D7-D10 (v78): one pack per dungeon, data/dungeons/dN.ts -----
  ...Object.assign({}, ...PACKS.map((p) => p.monsters)) as Record<D7Kind | D8Kind | D9Kind | D10Kind, MonsterDef>,
}

// ===== v49 monster kits (Q 2026-11-04: "ให้แต่ละตัวมี stat combo, counter, cri, สกิลโหดๆ"): merged into MONSTERS below =====
// skills are appended after the monster's own (own skills keep priority on shared turns).
const KITS: Partial<Record<MonsterKind, Pick<MonsterDef, 'crit' | 'combo' | 'counter' | 'trueSight' | 'razor' | 'vengeance'> & { add?: MonSkill[] }>> = {
  wolf: { crit: 0.08 }, boar: { crit: 0.1 }, shadowwolf: { combo: 0.2, crit: 0.05 }, bat: { combo: 0.15 },
  skeleton: { counter: 0.1 }, gargoyle: { counter: 0.15 }, hornet: { combo: 0.3, trueSight: { after: 3, turns: 2 } }, turtleguard: { counter: 0.15 },
  hellknight: { counter: 0.15, crit: 0.1, trueSight: { after: 3, turns: 2 } }, wraith: { crit: 0.1 }, spiderling: { combo: 0.2 },
  // bosses / mini bosses: stats + a signature skill
  king: { crit: 0.06, add: [{ kind: 'strike', every: 5, pow: 1.6, name: '🟢 ทับแบน', fx: { freeze: 30 } }] },
  alpha: { combo: 0.25, crit: 0.1, trueSight: { after: 2, turns: 3 }, add: [{ kind: 'strike', every: 4, hits: 3, pow: 0.6, name: '🐺 กรงเล็บพายุ' }] },
  duelist: { counter: 0.15, crit: 0.12, trueSight: { after: 2, turns: 3 }, add: [{ kind: 'strike', every: 5, hits: 3, pow: 0.55, name: '🤺 แทงสามจังหวะ' }] },
  hunter: { crit: 0.15, combo: 0.15, trueSight: { after: 2, turns: 3 }, razor: 0.05, add: [{ kind: 'strike', every: 4, pow: 2.5, drain: 0.1, name: '🩸 ตะปบจุดตาย' }] }, // Q 2026-11-04 Monster DB comment
  gunner: { crit: 0.15, trueSight: { after: 2, turns: 3 }, add: [{ kind: 'strike', every: 4, hits: 4, pow: 0.4, name: '🔫 ระดมยิง', scale: { stat: 'dex' } }] },
  drainer: { crit: 0.1, add: [{ kind: 'bolt', every: 4, pow: 1.3, name: '🌑 ดูดวิญญาณ', fx: { weaken: 2 } }] },
  deathknight: { counter: 0.15, crit: 0.1, trueSight: { after: 2, turns: 3 }, vengeance: true, add: [{ kind: 'strike', every: 5, pow: 2.8, magic: true, alone: 2, name: '⚔️ ดาบมรณะ' }] }, // Q 2026-11-04: magic, x2 with no undead at its side
  venomqueen: { combo: 0.25, crit: 0.08, add: [{ kind: 'strike', every: 2, hits: 2, pow: 0.7, name: '🦂 เหล็กใน', fx: { poison: 4 } }] }, // Q: no ตาเหยี่ยว (the web does that job)
  frostgiant: { counter: 0.15, add: [{ kind: 'strike', every: 5, pow: 1.6, name: '🧊 ทุบธารน้ำแข็ง', fx: { freeze: 50 } }, { kind: 'curse', every: 4, name: '💙 Frozen Heart', fx: { slow: 2 } }] }, // Q: Frozen Heart replaces ตาเหยี่ยว
  hydra: { combo: 0.3, trueSight: { after: 2, turns: 3 }, add: [{ kind: 'bolt', every: 4, hits: 3, pow: 0.5, name: '🐍 พ่นพิษสามหัว', fx: { poison: 1 } }] },
  mirage: { crit: 0.15, add: [{ kind: 'bolt', every: 5, hits: 2, pow: 0.7, name: '🔁 ภาพลวงสองเงา' }] },
  warlord: { counter: 0.2, crit: 0.15, combo: 0.15, trueSight: { after: 2, turns: 3 }, add: [{ kind: 'strike', every: 5, hits: 2, pow: 0.9, name: '🪓 ขวานคู่ผ่าฟ้า', fx: { armorBreak: 1 } }] },
  lich: { crit: 0.15 },
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
