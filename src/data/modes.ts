// Game modes (design/game-modes-v1.md): every way to start a run is a GameMode that builds a RunConfig.
// BattleScene only reads the RunConfig (rooms, scaling, mutators, events, HUD text); mode rules live here.
import type { BiomeHazardId } from './biome-hazards'
import { DUNGEONS, HARD, hardMul, MONSTERS, type DungeonDef, type MonsterKind } from './game-data'
import { MINI_POOL } from './relics'
import { matName, matOf } from './materials'
import { TAINT_MAT } from './taint'
import { foldMutators, mutatorById, rng, rollMutators, type FoldedMutators, type MutatorDef } from './mutators'
import { RIFT_MATS, RIFT_TUNING } from './rift'
import {
  buildRiftMonsterCatalogFromPacks,
  deriveSubSeed,
  generateRiftFloor,
  getDailyRiftSeed,
  type RiftFloorSpec,
} from '../battle/rift-engine'
import type { SaveData } from '../save'
import { heroParts, matchScale, TOWER_POWER, towerDamp, type PowerParts } from './power'
import { affixesAt, rollAffixes, type AffixId } from './affixes'
import { foldCorruptions, rollCorruptions, type FoldedCorruption } from './corruptions'
import { DEEP_ANCHOR, statNative } from './mon-stats'
import { ENDLESS_HELL, endlessHell, hellChance } from './hell'
import { buildDays, DUNGEON_DAYS, type DayRoom } from './dungeon-days'

export type ModeId = 'dungeon' | 'hard' | 'tower' | 'daily' | 'bounty' | 'rift'
/** v87 tower checkpoint record: the in-run level (and whether a relic was held) the first time a run cleared that floor. */
export interface TowerCp { lv: number; relic?: boolean }
export interface ModeRecord {
  bestFloor?: number
  bestDepth?: number
  clears: number
  lastSeed?: number
  lastDeepSeed?: number /* v118 🌌 deep daily */
  lastRiftDailySeed?: number
  cp?: Record<number, TowerCp> /* v87: tower checkpoints, keyed by floor (10, 20, ...) */
}
export interface ModeArgs {
  mode?: ModeId
  d?: number
  hard?: boolean
  hell?: boolean /* 😈 hell mode (D6-D10, needs hard) */
  seed?: number
  deep?: boolean /* v118: 🌌 deep daily (D6-D10) */
  startFloor?: number /* tower starts at this floor (set by startRun from skipTo; bot / test may pass it directly, no gems) */
  skipTo?: number /* v87: tower checkpoint S picked in the hub: pay S gems at run start, first fight is floor S+1 */
  riftSeed?: string
  riftDaily?: boolean
  resumeRift?: boolean
}

/** A room of a run: a dungeon room + where it sits in the tower + the dungeon its monsters scale from. */
export interface RunRoom extends DayRoom {
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
  /** 😈 hell mode: a hard D6+ run where every monster is a Hell copy (data/hell.ts HELL_MODE) */
  hell?: boolean
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
  /** Void Rift: environmental hazard active in room i (data/biome-hazards.ts). */
  biomeAt?(i: number, room: RunRoom): BiomeHazardId
  /** Void Rift flag and run metadata. */
  riftMode?: boolean
  riftDepthBase?: number
  riftSeed?: string
  riftDaily?: boolean
  riftFloorAt?(i: number): RiftFloorSpec | null
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
function dungeonRun(modeId: ModeId, dg: DungeonDef, hard: boolean, pp: PowerParts, seed = 0, hell = false): RunConfig {
  const corrupt = hard && dg.level ? foldCorruptions(rollCorruptions(seed)) : undefined
  const mutators = corrupt?.mutators ?? [], mut = corrupt ? foldMutators(mutators) : NO_MUT
  const days: RunRoom[] = buildDays(dg, seed) // ☀️ D2+: the run in days (data/dungeon-days.ts); D1 / days off = the authored rooms
  const mi = days.findIndex((r) => r.mini)
  const rooms = corrupt?.twinDuel && mi >= 0 ? [...days.slice(0, mi + 1), { ...days[mi], title: `${days[mi].title} (รอบ 2)`, dayEnd: false }, ...days.slice(mi + 1)] : days
  return {
    modeId, seed, power: pp.power, pp, endless: false, affix: false, mutators, mut, tag: hell ? '😈' : hard ? 'hard' : '', corrupt, hell: hell && hard && !!dg.level,
    roomAt: (i) => rooms[i] ?? null,
    themeAt: () => dg,
    scale: () => null,
    turnMul: () => mut.turnMul,
    eventsAfter: (i, r) => (r.boss || i >= rooms.length - 1 ? 0 : 1 + (r.dayEnd ? Math.max(0, Math.round(DUNGEON_DAYS.dayEndEvents)) : 0)),
    relicAfter: (r, has) => !r.echo || !has, // a returning mini only offers 👑 when the run has none yet (no forced swap)
    where: (i) => { const r = rooms[Math.min(i, rooms.length - 1)]; return `${dg.name}${r?.days ? ` · วัน ${r.day}/${r.days}` : ''} · ด่าน ${i + 1}/${rooms.length}` },
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
  // v125 (Q 2026-11-15 "อยากให้มี Monster ตั้งแต่ D1-D13 รวมกันมาเลย"): waves / minis / bosses come from every dungeon D1-D13
  // from floor 1, cleared or not (was: D2-D5 by theme, D6+ only once cleared and only from floor 25). Every kind is rebuilt at the
  // floor's tower Lv (BattleScene.legacyStats -> restatAt), so a D13 monster on floor 3 is a Lv 5 monster with a D13 kit.
  poolMax: 13,
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

const BOSSES: { kind: MonsterKind; src: string; turnLimit: number; title: string }[] = DUNGEONS
  .filter((d) => d.rooms.some((x) => x.boss))
  .map((d) => {
    const r = d.rooms.find((x) => x.boss)!
    return { kind: r.spawn[0][0], src: d.id, turnLimit: r.turnLimit ?? 30, title: r.title }
  })
/** v125: D1-D13, the dungeons every endless pool (tower waves / minis / bosses, rift catalog) draws from. */
const dungeonNum = (d: DungeonDef) => (/^d\d+$/.test(d.id) ? Number(d.id.slice(1)) : NaN)
export const ENDLESS_DUNGEONS = DUNGEONS.filter((d) => dungeonNum(d) >= 1 && dungeonNum(d) <= TOWER.poolMax)
/** Where a kind from dungeon d scales from in the tower (D6+ anchored to D5, see mon-stats deepAnchor). */
const srcFor = (d: DungeonDef) => (d.level ? DEEP_ANCHOR : d.id)
export const towerTheme = (f: number) => DUNGEONS.find((d) => d.id === TOWER.themes[Math.min(TOWER.themes.length - 1, Math.floor((f - 1) / TOWER.themeEvery))])!
export const floorKind = (f: number): 'gauntlet' | 'boss' | 'wave' => (f % TOWER.gauntletEvery === 0 ? 'gauntlet' : f % TOWER.bossEvery === 0 ? 'boss' : 'wave')

/** Level scaling turns every boss into "the boss of your level", so it also gets that boss's turn limit. */
const bossTurns = (lv: number) => {
  const d = [...DUNGEONS].reverse().find((x) => (HARD.recLv[x.id] ?? 1) <= lv) ?? DUNGEONS[0]
  return d.rooms.find((r) => r.boss)?.turnLimit ?? 30
}

/** v114: one tower floor, then 🔥 Hell marks: D1-D5 kinds from floor 25 (HELL), every kind from floor 100 (v125 ENDLESS_HELL).
 *  `pool` = the dungeons it draws from (v125: all of D1-D13; tests may pass fewer). */
export function towerFloor(f: number, lv: number, pool: DungeonDef[] = ENDLESS_DUNGEONS): RunRoom[] {
  const rooms = towerFloorBase(f, lv, pool.length ? pool : ENDLESS_DUNGEONS)
  const p = hellChance(f), all = endlessHell(f)
  if (p > 0 || all) for (const r of rooms) {
    const kinds = [...new Set([...r.spawn.map(([k]) => k), ...(r.miniPool ?? [])])].filter((k) => all || (!statNative(k) && Math.random() < p))
    if (kinds.length) r.hell = kinds
  }
  return rooms
}

function towerFloorBase(f: number, lv: number, dgs: DungeonDef[]): RunRoom[] {
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
  const th = towerTheme(f), kind = floorKind(f)
  // v125: minis / bosses / waves of every pool dungeon (D6+ ones scale as D5, src DEEP_ANCHOR)
  const seen = new Set<MonsterKind>()
  const MINIS_HERE = dgs.flatMap((d) => d.rooms.filter((r) => r.mini).flatMap((r) => (r.miniPool ?? MINI_POOL).map((k) => ({ kind: k, src: srcFor(d) }))))
    .filter((m) => !seen.has(m.kind) && !!seen.add(m.kind))
  if (!MINIS_HERE.length) MINIS_HERE.push(...MINI_POOL.map((k) => ({ kind: k, src: 'd3' })))
  if (kind === 'gauntlet') {
    const pool = [...MINIS_HERE], n = f >= 30 ? 3 : 2, out: RunRoom[] = []
    for (let k = 0; k < n; k++) {
      const m = pool.splice(Math.floor(Math.random() * pool.length), 1)[0] ?? MINIS_HERE[0]
      out.push({ title: `🗼 ชั้น ${f} · ดวลต่อเนื่อง ${k + 1}/${n}`, spawn: [], mini: true, miniPool: [m.kind], turnLimit: 42, floor: f, floorEnd: k === n - 1, src: m.src })
    }
    return out
  }
  const waveDgs = dgs.filter((d) => d.rooms.some((r) => !r.boss && !r.mini && r.spawn.length))
  const wavesOf = (d: DungeonDef) => d.rooms.filter((r) => !r.boss && !r.mini && r.spawn.length)
  const adds = (n: number) => Array.from({ length: n }, () => pick(pick(wavesOf(pick(waveDgs))).spawn)[0])
  const bossPool = BOSSES.filter((b) => dgs.some((d) => d.id === b.src)).map((b) => ({ ...b, src: srcFor(DUNGEONS.find((d) => d.id === b.src)!) }))
  if (!bossPool.length) bossPool.push(...BOSSES.slice(0, 1))
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
    const minis = [...MINIS_HERE], r = Math.random()
    if (f >= TOWER.mixMinisFrom && r < 0.3) {
      const a = minis.splice(Math.floor(Math.random() * minis.length), 1)[0], b = pick(minis)
      return [mixed('minis', [{ kind: a.kind, src: a.src, hp: TOWER.mixMiniHp }, { kind: b.kind, src: b.src, hp: TOWER.mixMiniHp }], adds(1), '⚔️ มินิบอสคู่!', 42)]
    }
    if (r < 0.65) { const m = pick(minis); return [mixed('mini', [{ kind: m.kind, src: m.src, hp: TOWER.mixMiniHp }], adds(2), '⚔️ มินิบอสคุมฝูง!', 42)] }
    const b = pick(bossPool)
    return [mixed('boss', [{ kind: b.kind, src: b.src, hp: TOWER.mixBossHp }], adds(2), `👹 ${b.title.replace('ห้องบอส · ', '')} บุกกลางฝูง!`, bossTurns(lv))]
  }
  // v125: a wave from any pool dungeon D1-D13 (each dungeon equally likely; D6+ monsters keep their own kit + EXP and drop their own mats).
  // From TOWER.extraMonFrom the extra monster comes from any dungeon too, so one fight can mix D1 and D13.
  const dd = pick(waveDgs), w = pick(wavesOf(dd)), spawn = w.spawn.map(([k, n]) => [k, n] as [MonsterKind, number])
  if (f >= TOWER.extraMonFrom) { const extra = adds(1)[0]; const at = spawn.find((x) => x[0] === extra); if (at) at[1]++; else if (spawn.length < 4) spawn.push([extra, 1]) }
  return [{ title: `🗼 ชั้น ${f} · ${dd.id !== th.id ? `${dd.level ? '🌌 ' : ''}${dd.name} · ` : ''}${w.title.replace(/^(เวฟ|ห้อง) \d+ · /, '')}`, spawn, turnLimit: w.turnLimit, floor: f, floorEnd: true, src: srcFor(dd) }]
}

/** v59 tower scaling: monsters start at TOWER_POWER.start x the hero (matchScale on the monster's own dungeon) and compound per floor. */
export function towerScale(pp: PowerParts, src: string, f: number, baseLv: number): MonScale {
  const P = TOWER_POWER, m = matchScale(pp, src), k = P.start * towerDamp(pp.power)
  return { hp: k * m.hp * P.hpGrow ** (f - 1), atk: k * m.atk * P.atkGrow ** (f - 1), hit: levelScale(src, baseLv).hit + Math.floor(f / TOWER.hitEvery), speed: 1 }
}

function towerRun(s: SaveData, start = 1): RunConfig {
  const rooms: RunRoom[] = [], lv = s.baseLevel, pp = heroParts(s), power = pp.power, order = rollAffixes()
  let floors = Math.max(0, start - 1)
  const roomAt = (i: number) => { while (rooms.length <= i) rooms.push(...towerFloor(++floors, lv)); return rooms[i] } // v125: D1-D13, cleared or not
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
const deepDungeons = () => DUNGEONS.filter((d) => d.level)
const isEndgameCleared = (s: SaveData, d: DungeonDef) => {
  const num = Number(d.id.replace(/\D+/g, ''))
  return !Number.isFinite(num) || num <= 10 || cleared(s, d.id)
}

export const DAILY = {
  unlock: 'd2', pool: ['d2', 'd3', 'd4', 'd5'], gems: 15, fortune: 25,
  // v118 (research ①): 🌌 deep daily, the same idea on D6+ at their own level band. Opens after D10 and dynamically includes cleared D11-D13 once added.
  deepUnlock: 'd10',
  get deepPool(): string[] { return deepDungeons().map((d) => d.id) },
  deepGems: 25, deepFortune: 25,
}
export const deepDailyOk = (s: SaveData) => cleared(s, DAILY.deepUnlock)
export const dailySeed = (d = new Date()) => +d.toISOString().slice(0, 10).replace(/-/g, '')
/** The day's challenge: the same for every player with the same seed. */
export function dailyOf(seed: number, deep = false, s?: SaveData) {
  const rand = rng(deep ? seed + 1 : seed) // v118: the deep daily draws its own stream (not the same rules as today's normal one)
  const pool = deep
    ? (s ? deepDungeons().filter((d) => isEndgameCleared(s, d)).map((d) => d.id) : DAILY.deepPool)
    : DAILY.pool
  const activePool = pool.length > 0 ? pool : DAILY.deepPool
  const id = activePool[Math.floor(rand() * activePool.length)] // draw once (not inside find: that would re-roll per dungeon)
  const dg = DUNGEONS.find((d) => d.id === id)!
  const n = 2 + Math.floor(rand() * 2)
  return { dg, mutators: rollMutators(rand, n) }
}

/** deep = 🌌 D6+: a level dungeon, so BattleScene builds its monsters at the room's level (statDef) with the mutators; scale() is not read. */
function dailyRun(s: SaveData, seed: number, deep = false): RunConfig {
  const { dg, mutators } = dailyOf(seed, deep, s), mut = foldMutators(mutators), lv = s.baseLevel
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

// ---------- 🎯 Weekly Boss Bounty ----------
export const BOUNTY = {
  unlock: 'd6',
  get pool(): string[] { return deepDungeons().map((d) => d.id) },
  gems: 50,
  fortune: 50,
  taintCrystals: 5,
  bossMats: 3,
  zeny: 5000,
}
export const bountyOk = (s: SaveData) => cleared(s, BOUNTY.unlock)

/** Year + ISO week number, e.g. 202645 for week 45 of 2026 */
export function weeklySeed(d = new Date()): number {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNr = (target.getUTCDay() + 6) % 7 // Monday = 0, Sunday = 6
  target.setUTCDate(target.getUTCDate() - dayNr + 3) // Nearest Thursday
  const firstThursday = target.valueOf()
  target.setUTCMonth(0, 1)
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7)
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
  return target.getUTCFullYear() * 100 + week
}

export function bountyOf(seed: number, s?: SaveData) {
  const rand = rng(seed)
  const available = s ? DUNGEONS.filter((d) => d.level && cleared(s, d.id)).map((d) => d.id) : BOUNTY.pool
  const pool = available.length > 0 ? available : BOUNTY.pool
  const id = pool[Math.floor(rand() * pool.length)]
  const dg = DUNGEONS.find((d) => d.id === id)!
  const mutators = rollMutators(rand, 2)
  return { dg, mutators }
}

function bountyRun(s: SaveData, seed: number): RunConfig {
  const { dg, mutators } = bountyOf(seed, s), mut = foldMutators(mutators)
  const waves = dg.rooms.filter((r) => !r.boss && !r.mini && r.spawn.length)
  const mini = dg.rooms.find((r) => r.mini) ?? waves[1] ?? waves[0]
  const boss = dg.rooms.find((r) => r.boss)!
  const rooms: RunRoom[] = [
    { ...waves[0], title: `🎯 ล่าค่าหัว · ${waves[0].title.replace(/^เวฟ \d+ · /, '')}`, src: dg.id },
    { ...mini, title: `🎯 ล่าค่าหัว · ${mini.title.replace(/^เวฟ \d+ · /, '')}`, src: dg.id },
    { ...boss, title: `👹 บอสเป้าหมาย · ${boss.title.replace(/^ห้องบอส · /, '')}`, src: dg.id },
  ]
  const pp = heroParts(s)
  return {
    modeId: 'bounty', seed, endless: false, affix: true, mutators, mut, tag: '🎯', tint: 0xffa07a,
    roomAt: (i) => (rooms[i] ? { ...rooms[i], src: dg.id } : null),
    themeAt: () => dg,
    scale: () => null,
    turnMul: () => mut.turnMul,
    eventsAfter: (i, r) => (r.boss || i >= rooms.length - 1 ? 0 : 1),
    relicAfter: () => true,
    where: (i) => `🎯 ล่าค่าหัว สัปดาห์ ${String(seed).slice(4)} · ${dg.name} · ด่าน ${i + 1}/${rooms.length}`,
    power: pp.power,
    pp,
  }
}

// ---------- the modes ----------
const none: ModeReward = { gems: 0, fortune: 0, zeny: 0, mats: {}, lines: [] }

export const MODES: Record<ModeId, GameMode> = {
  dungeon: {
    id: 'dungeon', name: 'ดันเจี้ยน', icon: '⚔️', desc: 'ดันปกติ',
    unlock: () => ({ ok: true, why: '' }), record: (s) => `เคลียร์ ${s.clears} ครั้ง`,
    buildRun: (s, a) => dungeonRun('dungeon', DUNGEONS[a.d ?? 0] ?? DUNGEONS[0], false, heroParts(s), a.seed ?? Math.floor(Math.random() * 1e9)), // seed: ☀️ echo monsters
    reward: () => null,
  },
  hard: {
    id: 'hard', name: 'โหมดยาก', icon: '🔥', desc: 'ดันที่เคลียร์แล้ว มอนแกร่งตาม Hero Power',
    unlock: () => ({ ok: true, why: '' }), record: (s) => `เคลียร์ ${Object.values(s.hardClearsBy ?? {}).reduce((a, n) => a + n, 0)} ครั้ง`,
    buildRun: (s, a) => dungeonRun('hard', DUNGEONS[a.d ?? 0] ?? DUNGEONS[0], true, heroParts(s), a.seed ?? Math.floor(Math.random() * 1e9), !!a.hell),
    reward: () => null,
  },
  tower: {
    id: 'tower', name: 'หอคอยไร้สิ้นสุด', icon: '🗼',
    desc: `ไต่ชั้นไปเรื่อยๆ มอน D1–D13 ปนกันทุกชั้น เลเวลตามชั้น · ชั้น ${ENDLESS_HELL.from}+ มอนนรกทั้งหมด (สเตตัสนรก) · กฎพิเศษเพิ่มทุก 10 ชั้น · บอสทุก ${TOWER.bossEvery} ชั้น · ดวลต่อเนื่องทุก ${TOWER.gauntletEvery} ชั้น\nออกระหว่างชั้น = เก็บรางวัลชั้นครบ · ล้ม = ได้ครึ่งเดียว`,
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
  bounty: {
    id: 'bounty', name: 'ล่าค่าหัวประจำสัปดาห์', icon: '🎯',
    desc: `บอส D6-D10 ติดกฎพิเศษ 2 อย่าง หมุนเวียนทุกสัปดาห์ (3 ห้องกระชับ)\nเคลียร์ครั้งแรกของสัปดาห์ 💎${BOUNTY.gems} · 🍀${BOUNTY.fortune} · ${matName(TAINT_MAT)} x${BOUNTY.taintCrystals}`,
    unlock: (s) => (bountyOk(s) ? { ok: true, why: '' } : { ok: false, why: `ปลดล็อกหลังเคลียร์${dungeonName(BOUNTY.unlock)}` }),
    record: (s) => {
      const r = s.modes?.bounty, week = weeklySeed()
      return `${r?.lastSeed === week ? '✅ สัปดาห์นี้พิชิตแล้ว' : 'สัปดาห์นี้ยังไม่พิชิต'} · รวม ${r?.clears ?? 0} ครั้ง`
    },
    buildRun: (s, a) => bountyRun(s, a.seed ?? weeklySeed()),
    reward: (s, cfg, r) => {
      const rec = modeRec(s, 'bounty')
      if (!r.won) return { ...none, lines: [] }
      const dg = cfg.themeAt(0)
      const bossMat = matOf(dg.id, true)
      if (rec.lastSeed === cfg.seed) {
        return {
          ...none,
          mats: { [bossMat]: 1 },
          lines: ['🎯 สัปดาห์นี้รับรางวัลค่าหัวพิเศษไปแล้ว (เล่นซ้ำได้วัตถุดิบบอสปกติ)'],
        }
      }
      rec.lastSeed = cfg.seed
      rec.clears++
      return {
        ...none,
        gems: BOUNTY.gems,
        fortune: BOUNTY.fortune,
        zeny: BOUNTY.zeny,
        mats: { [TAINT_MAT]: BOUNTY.taintCrystals, [bossMat]: BOUNTY.bossMats },
        lines: [
          `🎯 พิชิตค่าหัวสัปดาห์นี้! +${BOUNTY.gems} เพชร · 🍀 +${BOUNTY.fortune}`,
          `🔻 ได้รับ ${matName(TAINT_MAT)} x${BOUNTY.taintCrystals} (สำหรับใส่คำสาป)`,
          `📦 ได้รับวัตถุดิบบอส ${matName(bossMat)} x${BOUNTY.bossMats}`,
        ],
      }
    },
  },
  rift: {
    id: 'rift',
    name: 'รอยแยกไร้สิ้นสุด',
    icon: '🌀',
    desc: `ดันเจี้ยนอเวจีแบบ Roguelike ไร้ขีดจำกัด · มอน D1–D13 ปนกัน · สุ่มภูมิประเทศ (D11–D13), กฎพิเศษ และพรประจำรัน\nชั้น ${ENDLESS_HELL.from}+ มอนนรก Lv ${ENDLESS_HELL.minLv}+ ·บอสทุก ${RIFT_TUNING.bossEvery} ชั้น · ออกระหว่างชั้นรับรางวัลครบ · ล้มเสียรันปัจจุบันและเก็บส่วนหนึ่งเข้าบัญชีถาวร`,
    unlock: (s) =>
      riftOk(s)
        ? { ok: true, why: '' }
        : { ok: false, why: `ปลดล็อกหลังเคลียร์${dungeonName(RIFT_TUNING.unlock)}` },
    record: (s) => {
      const r = s.modes?.rift
      const best = r?.bestDepth ?? r?.bestFloor ?? 0
      const active = s.riftRun ? ` · 🌀 ค้างอยู่ชั้น ${s.riftRun.depth}` : ''
      return best ? `ลึกสุด ชั้น ${best}${active}` : `ยังไม่เคยลงรอยแยก${active}`
    },
    buildRun: (s, a) => riftRun(s, a),
    reward: (s, cfg, r) => {
      const rec = modeRec(s, 'rift')
      const before = rec.bestDepth ?? rec.bestFloor ?? 0
      const fromFloor = r.from ?? cfg.riftDepthBase ?? 0
      const clearedDepth = r.floor > fromFloor ? r.floor : 0
      const keep = r.left ? 1 : RIFT_TUNING.fallKeep
      const out: ModeReward = { ...none, mats: {}, lines: [] }

      const hasBank = r.bank.zeny > 0 || Object.keys(r.bank.mats).length > 0
      if (hasBank) {
        out.zeny = Math.round(r.bank.zeny * keep)
        for (const [id, n] of Object.entries(r.bank.mats)) {
          const kept = Math.floor(n * keep)
          if (kept > 0) out.mats[id] = kept
        }
      } else if (clearedDepth > 0) {
        let sumZeny = 0
        for (let d = fromFloor + 1; d <= clearedDepth; d++) {
          const loot = riftFloorLoot(d)
          sumZeny += loot.zeny
          for (const [id, n] of Object.entries(loot.mats)) {
            out.mats[id] = (out.mats[id] ?? 0) + n
          }
        }
        out.zeny = Math.round(sumZeny * keep)
        for (const id of Object.keys(out.mats)) {
          const kept = Math.floor(out.mats[id] * keep)
          if (kept > 0) out.mats[id] = kept
          else delete out.mats[id]
        }
      }

      // Talent wallet dust & medals settlement (70% dust kept on fall, 100% on safe exit)
      s.talentWallet ??= {
        zeny: 0,
        runeDust: 0,
        goldMedals: 0,
        hellMedalPity: 0,
        firstClearFlags: [],
      }
      let rawDust = 0
      for (let d = fromFloor + 1; d <= clearedDepth; d++) {
        rawDust += RIFT_TUNING.dustBase + RIFT_TUNING.dustPerDepth * d
      }
      const dustKeep = r.left ? 1 : RIFT_TUNING.deathDustKeep
      const earnedDust = Math.floor(rawDust * dustKeep)
      const earnedMedals = Math.max(
        0,
        Math.floor(clearedDepth / RIFT_TUNING.bossEvery) -
          Math.floor(fromFloor / RIFT_TUNING.bossEvery)
      )
      if (earnedDust > 0) s.talentWallet.runeDust += earnedDust
      if (earnedMedals > 0) s.talentWallet.goldMedals += earnedMedals

      for (const [f, g] of RIFT_TUNING.gems) {
        if (clearedDepth >= f && before < f) {
          out.gems += g
          out.lines.push(`🏆 พิชิตความลึกชั้น ${f} ครั้งแรก! +${g} เพชร`)
        }
      }

      if (cfg.riftDaily && clearedDepth > 0 && rec.lastRiftDailySeed !== cfg.seed) {
        rec.lastRiftDailySeed = cfg.seed
        out.gems += RIFT_TUNING.dailyGems
        out.fortune += RIFT_TUNING.dailyFortune
        out.lines.push(
          `🌀 เคลียร์รอยแยกประจำวัน! +${RIFT_TUNING.dailyGems} เพชร · 🍀 +${RIFT_TUNING.dailyFortune}`
        )
      }

      if (clearedDepth > before) {
        rec.bestDepth = clearedDepth
        rec.bestFloor = clearedDepth
        out.lines.push(`🌀 สถิติความลึกใหม่! ชั้น ${clearedDepth}`)
      }
      if (r.left && clearedDepth > 0) rec.clears++

      if (earnedDust > 0 || earnedMedals > 0) {
        out.lines.push(
          `✨ กระเป๋ารูนถาวร: +${earnedDust} Rune Dust${earnedMedals > 0 ? ` · +${earnedMedals} เหรียญทอง` : ''}`
        )
      }
      if (out.zeny > 0) {
        out.lines.unshift(
          `🌀 รางวัลรอยแยก: +${out.zeny} zeny${r.left ? '' : ` (ล้ม ได้ ${Math.round(keep * 100)}%)`}`
        )
      }

      // Roguelike permanence rule: active Rift run checkpoint is always wiped upon settlement
      delete s.riftRun
      return out
    },
  },
}

// ---------- 🌀 Endless Void Rift ----------
export const riftOk = (s: SaveData) => cleared(s, RIFT_TUNING.unlock)

export function riftFloorLoot(depth: number): {
  zeny: number
  mats: Record<string, number>
  dust: number
  medals: number
} {
  const isBoss = depth % RIFT_TUNING.bossEvery === 0
  const mats: Record<string, number> = {
    [RIFT_MATS.common]: RIFT_TUNING.matBase + Math.floor(depth / RIFT_TUNING.matBossEvery),
  }
  if (isBoss) {
    mats[RIFT_MATS.boss] = 1
    mats[TAINT_MAT] = 1
  }
  return {
    zeny: Math.round(RIFT_TUNING.zenyBase + RIFT_TUNING.zenyPerDepth * depth),
    mats,
    dust: RIFT_TUNING.dustBase + RIFT_TUNING.dustPerDepth * depth,
    medals: isBoss ? 1 : 0,
  }
}

function resolveRiftRoomKind(
  monsterId: string,
  isBoss: boolean,
  dg: DungeonDef,
  fallbackPool: DungeonDef[],
  subSeed: number
): MonsterKind {
  if (Object.prototype.hasOwnProperty.call(MONSTERS, monsterId)) {
    return monsterId as MonsterKind
  }
  const bossKinds = dg.rooms.filter((x) => x.boss).flatMap((x) => x.spawn.map(([k]) => k))
  const miniKinds = dg.rooms.flatMap((x) => x.miniPool ?? [])
  const waveKinds = dg.rooms.filter((x) => !x.boss && !x.mini).flatMap((x) => x.spawn.map(([k]) => k))
  const pool = isBoss
    ? bossKinds
    : [...waveKinds, ...miniKinds]
  if (pool.length > 0) {
    return pool[subSeed % pool.length]
  }
  const alt = fallbackPool[subSeed % Math.max(1, fallbackPool.length)]
  const altPool = alt?.rooms.flatMap((x) => x.spawn.map(([k]) => k)) ?? ['jellop']
  return altPool[subSeed % altPool.length]
}

function riftRun(s: SaveData, a: ModeArgs = {}): RunConfig {
  const utcDate = new Date().toISOString().slice(0, 10)
  const isDaily = !!a.riftDaily || !!(a.resumeRift && s.riftRun?.daily)
  const riftSeed =
    a.resumeRift && s.riftRun
      ? s.riftRun.seed
      : a.riftSeed ??
        (isDaily
          ? getDailyRiftSeed(utcDate)
          : a.seed != null
            ? `RIFT-${a.seed}`
            : `RIFT-${dailySeed()}-${Math.floor(Math.random() * 1e9)}`)
  const depthBase =
    a.startFloor != null
      ? Math.max(0, a.startFloor - 1)
      : a.resumeRift && s.riftRun
        ? Math.max(0, s.riftRun.depth - 1)
        : 0
  const numericSeed = a.seed ?? deriveSubSeed(riftSeed, 'rift_mode', depthBase)

  const deepPool = deepDungeons()
  const clearedDeep = deepPool.filter((d) => cleared(s, d.id))
  const themePool =
    clearedDeep.length > 0 ? clearedDeep : deepPool.length > 0 ? deepPool : DUNGEONS
  const catalog = buildRiftMonsterCatalogFromPacks()
  const pp = heroParts(s)

  const floorCache = new Map<number, RiftFloorSpec>()
  const roomCache = new Map<number, RunRoom>()
  const themeCache = new Map<number, DungeonDef>()

  const getFloorData = (i: number) => {
    let spec = floorCache.get(i)
    let room = roomCache.get(i)
    let dg = themeCache.get(i)
    if (!spec || !room || !dg) {
      const depth = depthBase + i + 1
      const branch = i === 0 && a.resumeRift ? s.riftRun?.lastBranch : undefined
      spec = generateRiftFloor(riftSeed, depth, catalog, branch).spec
      const themeIdx = deriveSubSeed(riftSeed, 'rift_theme', depth) % themePool.length
      dg = themePool[themeIdx]

      const spawnMap = new Map<MonsterKind, number>()
      spec.spawns.forEach((sp, idx) => {
        const monSpec = catalog.get(sp.monsterId)
        const isBossRank = monSpec?.rank === 'boss' || (spec!.isBossFloor && idx === 0)
        const kind = resolveRiftRoomKind(
          sp.monsterId,
          isBossRank,
          dg!,
          themePool,
          deriveSubSeed(riftSeed, 'rift_kind', depth, idx)
        )
        spawnMap.set(kind, (spawnMap.get(kind) ?? 0) + 1)
      })

      const refRoom =
        dg.rooms.find((r) => (spec!.isBossFloor ? r.boss : !r.boss && !r.mini && r.spawn.length)) ??
        dg.rooms[0]
      room = {
        title: `🌀 รอยแยก ชั้น ${depth}${spec.isBossFloor ? ' · บอสอเวจี' : ''} · ${dg.name}`,
        spawn: Array.from(spawnMap.entries()),
        boss: spec.isBossFloor,
        floor: depth,
        floorEnd: true,
        src: dg.id,
        turnLimit: refRoom?.turnLimit,
        lv: refRoom?.lv ?? dg.level?.[1],
      }
      floorCache.set(i, spec)
      roomCache.set(i, room)
      themeCache.set(i, dg)
    }
    return { spec, room, dg }
  }

  const firstFloor = getFloorData(0).spec
  const initialMutIds = Array.from(
    new Set([
      ...firstFloor.mutatorIds,
      ...(a.resumeRift && s.riftRun ? s.riftRun.curses : []),
    ])
  ).filter((id) => !(firstFloor.biomeHazard === 'abyssal_pressure' && id === 'no_heal'))
  const mutators = initialMutIds
    .map((id) => mutatorById(id))
    .filter((m): m is MutatorDef => !!m)
  const mut = foldMutators(mutators)

  return {
    modeId: 'rift',
    seed: numericSeed,
    riftSeed,
    riftDaily: isDaily,
    riftMode: true,
    riftDepthBase: depthBase,
    endless: true,
    affix: true,
    mutators,
    mut,
    tag: isDaily ? '🌀🎲' : '🌀',
    tint: 0x9b6dff,
    power: pp.power,
    pp,
    roomAt: (i) => getFloorData(i).room,
    themeAt: (i) => getFloorData(i).dg,
    biomeAt: (i) => getFloorData(i).spec.biomeHazard,
    riftFloorAt: (i) => getFloorData(i).spec,
    scale: (r) => {
      const d = Math.max(0, (r.floor ?? 1) - 1)
      return {
        hp: (1 + d * RIFT_TUNING.depthHpPer) * mut.monHp,
        atk: (1 + d * RIFT_TUNING.depthAtkPer) * mut.monAtk,
        hit: Math.round(d * RIFT_TUNING.depthHitPer),
        speed: mut.monSpeed,
      }
    },
    turnMul: (r) =>
      Math.min(
        RIFT_TUNING.turnMulMax,
        (1 + RIFT_TUNING.turnMulPerDepth * Math.max(0, (r.floor ?? 1) - 1)) * mut.turnMul
      ),
    eventsAfter: () => 0,
    relicAfter: () => true,
    where: (i) => {
      const { spec, dg } = getFloorData(i)
      return `🌀 รอยแยกไร้สิ้นสุด · ชั้น ${spec.depth} · ${dg.name}`
    },
  }
}

/** dungeon / hard keep their old entry args ({ d, hard }); new modes pass { mode }. */
export const modeOf = (a: ModeArgs): ModeId => a.mode ?? (a.hard ? 'hard' : 'dungeon')
export const buildRun = (s: SaveData, a: ModeArgs) => MODES[modeOf(a)].buildRun(s, a)
/** Modes listed in the 🎮 panel (dungeon / hard stay in the adventure list). */
export const PANEL_MODES: ModeId[] = ['tower', 'daily', 'bounty', 'rift']
