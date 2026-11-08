// Game modes (design/game-modes-v1.md): every way to start a run is a GameMode that builds a RunConfig.
// BattleScene only reads the RunConfig (rooms, scaling, mutators, events, HUD text); mode rules live here.
import { DUNGEONS, HARD, hardMul, type DungeonDef, type MonsterKind, type RoomDef } from './game-data'
import { MINI_POOL } from './relics'
import { matOf } from './materials'
import { foldMutators, rng, rollMutators, type FoldedMutators, type MutatorDef } from './mutators'
import type { SaveData } from '../save'
import { heroParts, matchScale, TOWER_POWER, towerDamp, type PowerParts } from './power'
import { affixesAt, rollAffixes, type AffixId } from './affixes'
import { foldCorruptions, rollCorruptions, type FoldedCorruption } from './corruptions'
import { DEEP_ANCHOR, statNative } from './mon-stats'
import { hellChance } from './hell'

export type ModeId = 'dungeon' | 'hard' | 'tower' | 'daily'
/** v87 tower checkpoint record: the in-run level (and whether a relic was held) the first time a run cleared that floor. */
export interface TowerCp { lv: number; relic?: boolean }
export interface ModeRecord { bestFloor?: number; clears: number; lastSeed?: number; lastDeepSeed?: number /* v118 🌌 deep daily */; cp?: Record<number, TowerCp> /* v87: tower checkpoints, keyed by floor (10, 20, ...) */ }
export interface ModeArgs { mode?: ModeId; d?: number; hard?: boolean; seed?: number; deep?: boolean /* v118: 🌌 deep daily (D6-D10) */; startFloor?: number /* tower starts at this floor (set by startRun from skipTo; bot / test may pass it directly, no gems) */; skipTo?: number /* v87: tower checkpoint S picked in the hub: pay S gems at run start, first fight is floor S+1 */ }

/** A room of a run: a dungeon room + where it sits in the tower + the dungeon its monsters scale from. */
export interface RunRoom extends RoomDef {
  floor?: number; floorEnd?: boolean; src?: string
  /** Tower floor 20+ mixed fight: bosses / minis together with normal monsters. Each kind scales from its own dungeon (srcOf) and may carry an HP share (hpOf). */
  mixed?: 'boss' | 'mini' | 'minis' | 'bossAdds'
  srcOf?: Partial<Record<MonsterKind, string>>
  hpOf?: Partial<Record<MonsterKind, number>>
  /** v114 tower floor 25+: these D1-D5 kinds spawn as their 🔥 Hell copy (data/hell.ts) */
  hell?: MonsterKind[]
}
export interface MonScale { hp: number; atk: number; hit: number; speed: number }

export interface RunConfig {
  modeId: ModeId
  seed: number
  endless: boolean
  /** The i-th room, or null when the run is cleared. */
  roomAt(i: number): RunRoom | null
  /** The dungeon whose sky, materials and cards room i uses. */
  themeAt(i: number): DungeonDef
  /** Monster multipliers for a room on top of the normal defs (null = untouched; hard mode keeps its own path). */
  scale(room: RunRoom, kind?: MonsterKind): MonScale | null
  /** Bosses and minis roll the hard-mode extra skill + passive. */
  affix: boolean
  tint?: number
  /** v118: 🌌 deep daily run (D6-D10 pool, own reward record) */
  deepDaily?: boolean
  turnMul(room: RunRoom): number
  mutators: MutatorDef[]
  mut: FoldedMutators
  /** Post-wave events after room i (0 = none). */
  eventsAfter(i: number, room: RunRoom): number
  relicAfter(room: RunRoom, hasRelic: boolean): boolean
  /** HUD / pause line: where the hero is. */
  where(i: number): string
  /** Short tag in front of the HUD line. */
  tag: string
  /** v59 Hero Power, snapshot at run start (in-run picks / relics never change it). */
  power: number
  pp: PowerParts
  /** Tower: affixes live in this room (data/affixes.ts). */
  affixesAt?(room: RunRoom): AffixId[]
  /** 🔥 hard D6+: the run's PoE-style corruption (data/corruptions.ts). */
  corrupt?: FoldedCorruption
  /** Tower: monsters enrage after this many hero turns in one fight (0 = never). */
  enrageAfter?(room: RunRoom): number
}

export interface RunResult { won: boolean; left: boolean; floor: number; /** v87: floors <= from were skipped (start floor - 1): they never count as cleared */ from?: number; bank: { zeny: number; mats: Record<string, number> } }
export interface ModeReward { gems: number; fortune: number; zeny: number; mats: Record<string, number>; lines: string[] }

export interface GameMode {
  id: ModeId
  name: string
  icon: string
  desc: string
  unlock(s: SaveData): { ok: boolean; why: string }
  record(s: SaveData): string
  buildRun(s: SaveData, a: ModeArgs): RunConfig
  /** Extra rewards + the save.modes record. dungeon / hard return null: BattleScene.settle keeps its old code for them. */
  reward(s: SaveData, cfg: RunConfig, r: RunResult): ModeReward | null
}

// ---------- shared ----------
const NO_MUT = foldMutators([])
const cleared = (s: SaveData, id: string) => ((s.clearsBy ?? { d1: s.clears })[id] ?? 0) > 0
export const modeRec = (s: SaveData, id: ModeId): ModeRecord => ((s.modes ??= {})[id] ??= { clears: 0 })
const dungeonName = (id: string) => DUNGEONS.find((d) => d.id === id)?.name ?? id

/** Level scaling both ways (tower / daily): the hard-mode boss curve at the hero's Base Lv over the curve at the
 * monster's own dungeon recLv, without hard mode's x1.3 base. A Lv 10 hero in a Lv 20 dungeon gets weaker monsters. */
export function levelScale(src: string, baseLv: number): MonScale {
  const gap = baseLv - (HARD.recLv[src] ?? 1), k = hardMul(src, gap)
  return { hp: k.hp / HARD.hp, atk: k.atk / HARD.atk, hit: HARD.hitPerLv * Math.min(25, Math.max(0, gap)), speed: 1 }
}

/** Dungeon runs: the dungeon's own rooms, untouched. 🔥 hard on a level dungeon (D6+) also rolls its corruption from `seed`. */
function dungeonRun(modeId: ModeId, dg: DungeonDef, hard: boolean, pp: PowerParts, seed = 0): RunConfig {
  const corrupt = hard && dg.level ? foldCorruptions(rollCorruptions(seed)) : undefined
  const mutators = corrupt?.mutators ?? [], mut = corrupt ? foldMutators(mutators) : NO_MUT
  const mi = dg.rooms.findIndex((r) => r.mini)
  const rooms = corrupt?.twinDuel && mi >= 0 ? [...dg.rooms.slice(0, mi + 1), { ...dg.rooms[mi], title: `${dg.rooms[mi].title} (รอบ 2)` }, ...dg.rooms.slice(mi + 1)] : dg.rooms
  return {
    modeId, seed, power: pp.power, pp, endless: false, affix: false, mutators, mut, tag: hard ? 'hard' : '', corrupt,
    roomAt: (i) => rooms[i] ?? null,
    themeAt: () => dg,
    scale: () => null,
    turnMul: () => mut.turnMul,
    eventsAfter: (i, r) => (r.boss || i >= rooms.length - 1 ? 0 : 1),
    relicAfter: () => true,
    where: (i) => `${dg.name} · ด่าน ${i + 1}/${rooms.length}`,
  }
}

// ---------- 🗼 Endless Tower ----------
export const TOWER = {
  unlock: 'd3',
  themeEvery: 10, themes: ['d2', 'd3', 'd4', 'd5'], // floors 1-10 d2, 11-20 d3, 21-30 d4, 31+ d5
  bossEvery: 5, gauntletEvery: 10,
  hitEvery: 5, // HP / ATK per floor: v59 power scaling (power.ts TOWER_POWER), was linear on Base Lv
  turnPerFloor: 0.015, turnMax: 1.6,
  extraMonFrom: 15,
  // Q 2026-11-04: from floor 20 a floor can mix monsters, bosses and mini bosses in one fight
  mixFrom: 20, mixChance0: 0.3, mixPerFloor: 0.02, mixMax: 0.65, // wave floors: chance to become a mixed fight
  mixMinisFrom: 25, // mini + mini (+1 add) from this floor
  bossAddsChance: 0.5, // boss floors 20+: the boss brings 1-2 adds
  mixBossHp: 0.6, mixMiniHp: 0.75, // a boss / mini sharing the fight with others has this share of its HP
  mixTurns: 6, // extra hero turns for a mixed fight
  eventEvery: 3,
  // v114 (Q 2026-11-08): from floor 25, monsters / minis / bosses of the D6+ dungeons the hero has cleared join the tower (anchored to D5, mon-stats deepAnchor)
  deepFrom: 25, deepChance0: 0.3, deepPerFloor: 0.02, deepMax: 0.6, // wave floors: chance to become a D6+ wave
  zeny: (f: number, lv: number) => Math.round((20 + 6 * f) * (1 + lv / 20)),
  fallKeep: 0.5, // falling keeps this share of the floor bank; leaving keeps all of it
  gems: [[10, 20], [25, 40], [50, 80]] as [number, number][], // first time reaching floor n
  // v87 floor skip (Q 2026-11-07): a checkpoint every skipEvery floors up to the best floor, paid in gems at run start.
  // A pure time-saver: skipped floors give no zeny / mats / first-time gems and never raise bestFloor.
  skipEvery: 10,
  skipGems: 1, // gems per skipped floor: S x skipGems
  skipLvPerFloor: 0.5, skipLvMax: 60, // old saves without a recorded checkpoint: in-run level guess = 1 + round(S x this), capped
}

// ---------- v87 tower floor skip (design/unique-taint-tower-skip-v1.md §1) ----------
/** Highest checkpoint the best floor allows (best 34 -> 30, best 29 -> 20, best 9 -> 0 = none). */
export const towerMaxCheckpoint = (best: number) => Math.floor(Math.max(0, best) / TOWER.skipEvery) * TOWER.skipEvery
/** Every checkpoint that can be picked: 10, 20, ... up to the max. */
export const towerCheckpoints = (best: number) => Array.from({ length: towerMaxCheckpoint(best) / TOWER.skipEvery }, (_, i) => (i + 1) * TOWER.skipEvery)
/** Gems for starting after floor S. */
export const towerSkipGems = (floor: number) => floor * TOWER.skipGems
/** Is S a checkpoint this save may skip to, and can it pay? */
export function towerSkipCheck(s: SaveData, floor: number): { ok: true } | { ok: false; why: 'locked' | 'gems' } {
  if (!towerCheckpoints(s.modes?.tower?.bestFloor ?? 0).includes(floor)) return { ok: false, why: 'locked' }
  return s.gems >= towerSkipGems(floor) ? { ok: true } : { ok: false, why: 'gems' }
}
/** What the hero starts with after a skip to S: the recorded level of that checkpoint, or the old-save guess. */
export function towerCatchUp(s: SaveData, floor: number): { lv: number; relic: boolean; est: boolean } {
  const rec = s.modes?.tower?.cp?.[floor]
  if (rec && rec.lv >= 1) return { lv: Math.floor(rec.lv), relic: !!rec.relic, est: false }
  return { lv: Math.max(1, Math.min(TOWER.skipLvMax, 1 + Math.round(floor * TOWER.skipLvPerFloor))), relic: true /* floor 10 is always a gauntlet = a relic pick */, est: true }
}
/** Spend the gems for a skip to S (call once, when the run starts). Null (nothing spent) when S is not allowed or gems are short. */
export function payTowerSkip(s: SaveData, floor: number): { lv: number; relic: boolean; est: boolean } | null {
  if (!towerSkipCheck(s, floor).ok) return null
  s.gems -= towerSkipGems(floor)
  return towerCatchUp(s, floor)
}
/** A run clears a checkpoint floor: keep the BEST level seen there across runs, and relic = true if any run held one (Q 2026-11-07, was first-run-only). True when the record changed. */
export function recordTowerCheckpoint(s: SaveData, floor: number, lv: number, relic: boolean): boolean {
  if (floor < TOWER.skipEvery || floor % TOWER.skipEvery !== 0) return false
  const rec = modeRec(s, 'tower'), cp = (rec.cp ??= {}), old = cp[floor], nlv = Math.max(1, Math.floor(lv))
  const best = Math.max(old?.lv ?? 0, nlv), keepRelic = !!old?.relic || relic
  if (old && old.lv === best && !!old.relic === keepRelic) return false
  cp[floor] = { lv: best, ...(keepRelic ? { relic: true } : {}) }
  return true
}

const BOSSES: { kind: MonsterKind; src: string; turnLimit: number; title: string }[] = DUNGEONS.map((d) => {
  const r = d.rooms.find((x) => x.boss)!
  return { kind: r.spawn[0][0], src: d.id, turnLimit: r.turnLimit ?? 30, title: r.title }
})
const MINIS: { kind: MonsterKind; src: string; from: number }[] = [
  ...MINI_POOL.map((kind) => ({ kind, src: 'd3', from: 1 })),
  { kind: 'venomqueen', src: 'd4', from: 20 }, { kind: 'frostgiant', src: 'd4', from: 20 },
  { kind: 'mirage', src: 'd5', from: 30 }, { kind: 'warlord', src: 'd5', from: 30 },
]
export const towerTheme = (f: number) => DUNGEONS.find((d) => d.id === TOWER.themes[Math.min(TOWER.themes.length - 1, Math.floor((f - 1) / TOWER.themeEvery))])!
export const floorKind = (f: number): 'gauntlet' | 'boss' | 'wave' => (f % TOWER.gauntletEvery === 0 ? 'gauntlet' : f % TOWER.bossEvery === 0 ? 'boss' : 'wave')

/** Level scaling turns every boss into "the boss of your level", so it also gets that boss's turn limit. */
const bossTurns = (lv: number) => {
  const d = [...DUNGEONS].reverse().find((x) => (HARD.recLv[x.id] ?? 1) <= lv) ?? DUNGEONS[0]
  return d.rooms.find((r) => r.boss)?.turnLimit ?? 30
}

/** v114: chance a tower wave floor becomes a D6+ wave (0 below TOWER.deepFrom). */
export const deepChance = (f: number) => (f < TOWER.deepFrom ? 0 : Math.min(TOWER.deepMax, TOWER.deepChance0 + TOWER.deepPerFloor * (f - TOWER.deepFrom)))

/** v114: one tower floor, then 🔥 Hell marks on its D1-D5 kinds (floor 25+). `deep` = cleared D6+ dungeons. */
export function towerFloor(f: number, lv: number, deep: DungeonDef[] = []): RunRoom[] {
  const rooms = towerFloorBase(f, lv, f >= TOWER.deepFrom ? deep : [])
  const p = hellChance(f)
  if (p > 0) for (const r of rooms) {
    const kinds = [...new Set([...r.spawn.map(([k]) => k), ...(r.miniPool ?? [])])].filter((k) => !statNative(k) && Math.random() < p)
    if (kinds.length) r.hell = kinds
  }
  return rooms
}

function towerFloorBase(f: number, lv: number, deep: DungeonDef[]): RunRoom[] {
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
  const th = towerTheme(f), kind = floorKind(f)
  // v114: D6+ minis / bosses of cleared dungeons, scaled as D5 ones (src DEEP_ANCHOR)
  const deepMinis = deep.flatMap((d) => d.rooms.filter((r) => r.mini).flatMap((r) => r.miniPool ?? [])).map((k) => ({ kind: k, src: DEEP_ANCHOR, from: TOWER.deepFrom }))
  const deepBosses = BOSSES.filter((b) => deep.some((d) => d.id === b.src)).map((b) => ({ ...b, src: DEEP_ANCHOR }))
  const MINIS_HERE = [...MINIS, ...deepMinis]
  if (kind === 'gauntlet') {
    const pool = MINIS_HERE.filter((m) => f >= m.from), n = f >= 30 ? 3 : 2, out: RunRoom[] = []
    for (let k = 0; k < n; k++) {
      const m = pool.splice(Math.floor(Math.random() * pool.length), 1)[0] ?? MINIS[0]
      out.push({ title: `🗼 ชั้น ${f} · ดวลต่อเนื่อง ${k + 1}/${n}`, spawn: [], mini: true, miniPool: [m.kind], turnLimit: 42, floor: f, floorEnd: k === n - 1, src: m.src })
    }
    return out
  }
  const waves = th.rooms.filter((r) => !r.boss && !r.mini)
  const adds = (n: number) => { const ks = waves.flatMap((w) => w.spawn.map(([k]) => k)); return Array.from({ length: n }, () => pick(ks)) }
  // v114: old pool stops at D5 (it used to reach the D6 boss on floors 31+, which has no tower numbers); D6+ bosses come from `deep`
  const bossPool = [...BOSSES.filter((b) => !DUNGEONS.find((d) => d.id === b.src)?.level).slice(0, DUNGEONS.indexOf(th) + 2), ...deepBosses]
  /** One mixed fight: normal monsters stand in front (the hero hits the front first), the big ones behind. */
  const mixed = (type: NonNullable<RunRoom['mixed']>, big: { kind: MonsterKind; src: string; hp: number }[], front: MonsterKind[], title: string, turns: number): RunRoom => {
    const spawn: [MonsterKind, number][] = []
    for (const k of [...front, ...big.map((b) => b.kind)]) { const at = spawn.find((x) => x[0] === k); if (at) at[1]++; else spawn.push([k, 1]) }
    return { title: `🗼 ชั้น ${f} · ${title}`, spawn: spawn.slice(0, 4), boss: true, mixed: type, turnLimit: turns + TOWER.mixTurns, floor: f, floorEnd: true, src: th.id,
      srcOf: Object.fromEntries(big.map((b) => [b.kind, b.src])), hpOf: Object.fromEntries(big.map((b) => [b.kind, b.hp])) }
  }
  if (kind === 'boss') {
    const b = pick(bossPool)
    if (f >= TOWER.mixFrom && Math.random() < TOWER.bossAddsChance)
      return [mixed('bossAdds', [{ kind: b.kind, src: b.src, hp: 1 }], adds(f >= 30 ? 2 : 1), `${b.title.replace('ห้องบอส · ', 'บอส ')} + ลูกสมุน`, Math.max(b.turnLimit, bossTurns(lv)))]
    return [{ title: `🗼 ชั้น ${f} · ${b.title.replace('ห้องบอส · ', 'บอส ')}`, spawn: [[b.kind, 1]], boss: true, turnLimit: Math.max(b.turnLimit, bossTurns(lv)), floor: f, floorEnd: true, src: b.src }]
  }
  if (f >= TOWER.mixFrom && Math.random() < Math.min(TOWER.mixMax, TOWER.mixChance0 + TOWER.mixPerFloor * (f - TOWER.mixFrom))) {
    const minis = MINIS_HERE.filter((m) => f >= m.from), r = Math.random()
    if (f >= TOWER.mixMinisFrom && r < 0.3) {
      const a = minis.splice(Math.floor(Math.random() * minis.length), 1)[0], b = pick(minis)
      return [mixed('minis', [{ kind: a.kind, src: a.src, hp: TOWER.mixMiniHp }, { kind: b.kind, src: b.src, hp: TOWER.mixMiniHp }], adds(1), '⚔️ มินิบอสคู่!', 42)]
    }
    if (r < 0.65) { const m = pick(minis); return [mixed('mini', [{ kind: m.kind, src: m.src, hp: TOWER.mixMiniHp }], adds(2), '⚔️ มินิบอสคุมฝูง!', 42)] }
    const b = pick(bossPool)
    return [mixed('boss', [{ kind: b.kind, src: b.src, hp: TOWER.mixBossHp }], adds(2), `👹 ${b.title.replace('ห้องบอส · ', '')} บุกกลางฝูง!`, bossTurns(lv))]
  }
  // v114: a D6+ wave from a cleared deep dungeon, scaled as D5 (its monsters keep their own kit + EXP, and drop their own mats)
  const deepWave = deep.length > 0 && Math.random() < deepChance(f)
  const dd = deepWave ? pick(deep) : th, pool = deepWave ? dd.rooms.filter((r) => !r.boss && !r.mini && r.spawn.length) : waves
  const w = pick(pool), spawn = w.spawn.map(([k, n]) => [k, n] as [MonsterKind, number])
  if (f >= TOWER.extraMonFrom) { const extra = pick(pick(pool).spawn)[0]; const at = spawn.find((x) => x[0] === extra); if (at) at[1]++; else spawn.push([extra, 1]) }
  return [{ title: `🗼 ชั้น ${f} · ${deepWave ? `🌌 ${dd.name} · ` : ''}${w.title.replace(/^เวฟ \d+ · /, '')}`, spawn, turnLimit: w.turnLimit, floor: f, floorEnd: true, src: deepWave ? DEEP_ANCHOR : th.id }]
}

/** v59 tower scaling: monsters start at TOWER_POWER.start x the hero (matchScale on the monster's own dungeon) and compound per floor. */
export function towerScale(pp: PowerParts, src: string, f: number, baseLv: number): MonScale {
  const P = TOWER_POWER, m = matchScale(pp, src), k = P.start * towerDamp(pp.power)
  return { hp: k * m.hp * P.hpGrow ** (f - 1), atk: k * m.atk * P.atkGrow ** (f - 1), hit: levelScale(src, baseLv).hit + Math.floor(f / TOWER.hitEvery), speed: 1 }
}

function towerRun(s: SaveData, start = 1): RunConfig {
  const rooms: RunRoom[] = [], lv = s.baseLevel, pp = heroParts(s), power = pp.power, order = rollAffixes()
  const deep = DUNGEONS.filter((d) => d.level && cleared(s, d.id)) // v114: D6+ dungeons this hero has cleared join floors 25+
  let floors = Math.max(0, start - 1)
  const roomAt = (i: number) => { while (rooms.length <= i) rooms.push(...towerFloor(++floors, lv, deep)); return rooms[i] }
  return {
    modeId: 'tower', seed: 0, endless: true, affix: true, mutators: [], mut: NO_MUT, tag: '🗼', power, pp,
    roomAt,
    themeAt: (i) => towerTheme(roomAt(i).floor ?? 1),
    scale: (r, kind) => {
      // v122 (Q 2026-11-08 "ตัด class penalty ออก แล้วไป scale stat, scale monster แทน"): no Hero Power here any more. HP / ATK / Hit
      // come from each monster's stats at the floor's tower Lv (BattleScene.legacyStats -> restatAt numbers), like D6+ level dungeons.
      const share = (kind && r.hpOf?.[kind]) ?? ((r.boss || r.mini) && !r.mixed ? TOWER_POWER.bossHp : 1) // solo bosses / gauntlet minis: lighter, they were the walls
      return { hp: share, atk: 1, hit: 0, speed: 1 }
    },
    affixesAt: (r) => affixesAt(order, r.floor ?? 1),
    enrageAfter: (r) => (r.boss || r.mini ? TOWER_POWER.enrageBoss : TOWER_POWER.enrageWave),
    turnMul: (r) => Math.min(TOWER.turnMax, 1 + TOWER.turnPerFloor * ((r.floor ?? 1) - 1)),
    eventsAfter: (_i, r) => (r.floorEnd && !r.boss && !r.mini && (r.floor ?? 0) % TOWER.eventEvery === 0 ? 1 : 0),
    relicAfter: (r, has) => !!r.floorEnd && !has,
    where: (i) => { const r = roomAt(i); return `🗼 หอคอยไร้สิ้นสุด · ชั้น ${r.floor} · ${towerTheme(r.floor ?? 1).name}` },
  }
}

/** What one cleared floor adds to the tower bank. */
export function towerFloorLoot(f: number, lv: number, room?: RunRoom): { zeny: number; mats: Record<string, number> } {
  const th = towerTheme(f).id, kind = floorKind(f), mats: Record<string, number> = { [matOf(th, false)]: 1 }
  const big = kind === 'gauntlet' ? 2 : kind === 'boss' ? 1 : 0, mix = room?.mixed ? (room.mixed === 'minis' ? 2 : 1) : 0
  if (big + (kind === 'wave' ? mix : 0)) mats[matOf(th, true)] = big + (kind === 'wave' ? mix : 0)
  return { zeny: Math.round(TOWER.zeny(f, lv) * (room?.mixed ? 1.3 : 1)), mats }
}

// ---------- 🎲 Daily Challenge ----------
export const DAILY = {
  unlock: 'd2', pool: ['d2', 'd3', 'd4', 'd5'], gems: 15, fortune: 25,
  // v118 (research ①): 🌌 deep daily, the same idea on D6-D10 at their own level band. Opens after D10 so everyone who has it can play every pick.
  deepUnlock: 'd10', deepPool: ['d6', 'd7', 'd8', 'd9', 'd10'], deepGems: 25, deepFortune: 25,
}
export const deepDailyOk = (s: SaveData) => cleared(s, DAILY.deepUnlock)
export const dailySeed = (d = new Date()) => +d.toISOString().slice(0, 10).replace(/-/g, '')
/** The day's challenge: the same for every player with the same seed. */
export function dailyOf(seed: number, deep = false) {
  const rand = rng(deep ? seed + 1 : seed) // v118: the deep daily draws its own stream (not the same rules as today's normal one)
  const pool = deep ? DAILY.deepPool : DAILY.pool
  const id = pool[Math.floor(rand() * pool.length)] // draw once (not inside find: that would re-roll per dungeon)
  const dg = DUNGEONS.find((d) => d.id === id)!
  const n = 2 + Math.floor(rand() * 2)
  return { dg, mutators: rollMutators(rand, n) }
}

/** deep = 🌌 D6-D10: a level dungeon, so BattleScene builds its monsters at the room's level (statDef) with the mutators; scale() is not read. */
function dailyRun(s: SaveData, seed: number, deep = false): RunConfig {
  const { dg, mutators } = dailyOf(seed, deep), mut = foldMutators(mutators), lv = s.baseLevel
  return {
    modeId: 'daily', seed, endless: false, ...(() => { const pp = heroParts(s); return { pp, power: pp.power } })(), affix: false, mutators, mut, tag: deep ? '🌌' : '🎲', tint: 0xb0a0ff, deepDaily: deep,
    roomAt: (i) => (dg.rooms[i] ? { ...dg.rooms[i], src: dg.id } : null),
    themeAt: () => dg,
    scale: (r) => { const k = levelScale(r.src ?? dg.id, lv); return { hp: k.hp * mut.monHp, atk: k.atk * mut.monAtk, hit: k.hit, speed: mut.monSpeed } },
    turnMul: () => mut.turnMul,
    eventsAfter: (i, r) => (r.boss || i >= dg.rooms.length - 1 ? 0 : mut.events),
    relicAfter: () => true,
    where: (i) => `${deep ? '🌌 รายวันลึก' : '🎲 รายวัน'} ${String(seed).slice(4, 6)}/${String(seed).slice(6)} · ${dg.name} · ด่าน ${i + 1}/${dg.rooms.length}`,
  }
}

// ---------- the modes ----------
const none: ModeReward = { gems: 0, fortune: 0, zeny: 0, mats: {}, lines: [] }

export const MODES: Record<ModeId, GameMode> = {
  dungeon: {
    id: 'dungeon', name: 'ดันเจี้ยน', icon: '⚔️', desc: 'ดันปกติ',
    unlock: () => ({ ok: true, why: '' }), record: (s) => `เคลียร์ ${s.clears} ครั้ง`,
    buildRun: (s, a) => dungeonRun('dungeon', DUNGEONS[a.d ?? 0] ?? DUNGEONS[0], false, heroParts(s)),
    reward: () => null,
  },
  hard: {
    id: 'hard', name: 'โหมดยาก', icon: '🔥', desc: 'ดันที่เคลียร์แล้ว มอนแกร่งตาม Hero Power',
    unlock: () => ({ ok: true, why: '' }), record: (s) => `เคลียร์ ${Object.values(s.hardClearsBy ?? {}).reduce((a, n) => a + n, 0)} ครั้ง`,
    buildRun: (s, a) => dungeonRun('hard', DUNGEONS[a.d ?? 0] ?? DUNGEONS[0], true, heroParts(s), a.seed ?? Math.floor(Math.random() * 1e9)),
    reward: () => null,
  },
  tower: {
    id: 'tower', name: 'หอคอยไร้สิ้นสุด', icon: '🗼',
    desc: `ไต่ชั้นไปเรื่อยๆ มอนเริ่มที่ ~80% Hero Power แล้วแกร่งขึ้นทุกชั้น · กฎพิเศษเพิ่มทุก 10 ชั้น · บอสทุก ${TOWER.bossEvery} ชั้น · ดวลต่อเนื่องทุก ${TOWER.gauntletEvery} ชั้น\nออกระหว่างชั้น = เก็บรางวัลชั้นครบ · ล้ม = ได้ครึ่งเดียว`,
    unlock: (s) => (cleared(s, TOWER.unlock) ? { ok: true, why: '' } : { ok: false, why: `ปลดล็อกหลังเคลียร์${dungeonName(TOWER.unlock)}` }),
    record: (s) => { const r = s.modes?.tower; return r?.bestFloor ? `สูงสุด ชั้น ${r.bestFloor}` : 'ยังไม่เคยไต่' },
    buildRun: (s, a) => towerRun(s, a.startFloor),
    reward: (s, _cfg, r) => {
      const rec = modeRec(s, 'tower'), before = rec.bestFloor ?? 0, cleared = r.floor > (r.from ?? 0) ? r.floor : 0 // v87: a skipped floor is never a clear
      const out: ModeReward = { ...none, mats: {}, lines: [] }
      const keep = r.left ? 1 : TOWER.fallKeep
      out.zeny = Math.round(r.bank.zeny * keep)
      for (const [id, n] of Object.entries(r.bank.mats)) { const k = Math.floor(n * keep); if (k > 0) out.mats[id] = k }
      for (const [f, g] of TOWER.gems) if (cleared >= f && before < f) { out.gems += g; out.lines.push(`🏆 ถึงชั้น ${f} ครั้งแรก! +${g} เพชร`) }
      if (cleared > before) { rec.bestFloor = cleared; out.lines.push(`🗼 สถิติใหม่! ชั้น ${cleared}`) }
      if (r.left) rec.clears++
      if (r.bank.zeny) out.lines.unshift(`🗼 รางวัลชั้น: +${out.zeny} zeny${r.left ? '' : ` (ล้ม ได้ ${Math.round(keep * 100)}%)`}`)
      return out
    },
  },
  daily: {
    id: 'daily', name: 'ท้าทายรายวัน', icon: '🎲',
    desc: `ดัน + กฎพิเศษ 2-3 อย่าง สุ่มจากวันที่ · ทุกคนได้โจทย์เดียวกัน\nมอนแกร่งตามเลเวลเรา · เคลียร์ครั้งแรกของวัน 💎${DAILY.gems} + 🍀${DAILY.fortune}`,
    unlock: (s) => (cleared(s, DAILY.unlock) ? { ok: true, why: '' } : { ok: false, why: `ปลดล็อกหลังเคลียร์${dungeonName(DAILY.unlock)}` }),
    record: (s) => {
      const r = s.modes?.daily, today = dailySeed()
      return `${r?.lastSeed === today ? '✅ วันนี้เคลียร์แล้ว' : 'วันนี้ยังไม่เคลียร์'}${deepDailyOk(s) ? ` · 🌌 ${r?.lastDeepSeed === today ? '✅' : '—'}` : ''} · รวม ${r?.clears ?? 0} วัน`
    },
    buildRun: (s, a) => dailyRun(s, a.seed ?? dailySeed(), !!a.deep),
    reward: (s, cfg, r) => {
      const rec = modeRec(s, 'daily')
      if (!r.won) return { ...none, lines: [] }
      if (cfg.deepDaily) { // v118 🌌: its own once-a-day reward, does not touch the normal daily's record
        if (rec.lastDeepSeed === cfg.seed) return { ...none, lines: ['🌌 วันนี้รับรางวัลรายวันลึกไปแล้ว (เล่นซ้ำได้ของปกติ)'] }
        rec.lastDeepSeed = cfg.seed
        return { ...none, mats: {}, gems: DAILY.deepGems, fortune: DAILY.deepFortune, lines: [`🌌 เคลียร์รายวันลึก! +${DAILY.deepGems} เพชร · 🍀 +${DAILY.deepFortune}`] }
      }
      if (rec.lastSeed === cfg.seed) return { ...none, lines: ['🎲 วันนี้รับรางวัลรายวันไปแล้ว (เล่นซ้ำได้ของปกติ)'] }
      rec.lastSeed = cfg.seed; rec.clears++
      return { ...none, mats: {}, gems: DAILY.gems, fortune: DAILY.fortune, lines: [`🎲 เคลียร์ท้าทายรายวัน! +${DAILY.gems} เพชร · 🍀 +${DAILY.fortune}`] }
    },
  },
}

/** dungeon / hard keep their old entry args ({ d, hard }); new modes pass { mode }. */
export const modeOf = (a: ModeArgs): ModeId => a.mode ?? (a.hard ? 'hard' : 'dungeon')
export const buildRun = (s: SaveData, a: ModeArgs) => MODES[modeOf(a)].buildRun(s, a)
/** Modes listed in the 🎮 panel (dungeon / hard stay in the adventure list). */
export const PANEL_MODES: ModeId[] = ['tower', 'daily']
