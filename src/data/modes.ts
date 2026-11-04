// Game modes (design/game-modes-v1.md): every way to start a run is a GameMode that builds a RunConfig.
// BattleScene only reads the RunConfig (rooms, scaling, mutators, events, HUD text); mode rules live here.
import { DUNGEONS, HARD, hardMul, type DungeonDef, type MonsterKind, type RoomDef } from './game-data'
import { MINI_POOL } from './relics'
import { matOf } from './materials'
import { foldMutators, rng, rollMutators, type FoldedMutators, type MutatorDef } from './mutators'
import type { SaveData } from '../save'

export type ModeId = 'dungeon' | 'hard' | 'tower' | 'daily'
export interface ModeRecord { bestFloor?: number; clears: number; lastSeed?: number }
export interface ModeArgs { mode?: ModeId; d?: number; hard?: boolean; seed?: number; startFloor?: number /* bot / test only: tower starts at this floor */ }

/** A room of a run: a dungeon room + where it sits in the tower + the dungeon its monsters scale from. */
export interface RunRoom extends RoomDef {
  floor?: number; floorEnd?: boolean; src?: string
  /** Tower floor 20+ mixed fight: bosses / minis together with normal monsters. Each kind scales from its own dungeon (srcOf) and may carry an HP share (hpOf). */
  mixed?: 'boss' | 'mini' | 'minis' | 'bossAdds'
  srcOf?: Partial<Record<MonsterKind, string>>
  hpOf?: Partial<Record<MonsterKind, number>>
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
}

export interface RunResult { won: boolean; left: boolean; floor: number; bank: { zeny: number; mats: Record<string, number> } }
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

/** Old dungeon runs: the dungeon's own rooms, untouched. */
function dungeonRun(modeId: ModeId, dg: DungeonDef, hard: boolean): RunConfig {
  return {
    modeId, seed: 0, endless: false, affix: false, mutators: [], mut: NO_MUT, tag: hard ? 'hard' : '',
    roomAt: (i) => dg.rooms[i] ?? null,
    themeAt: () => dg,
    scale: () => null,
    turnMul: () => 1,
    eventsAfter: (i, r) => (r.boss || i >= dg.rooms.length - 1 ? 0 : 1),
    relicAfter: () => true,
    where: (i) => `${dg.name} · ด่าน ${i + 1}/${dg.rooms.length}`,
  }
}

// ---------- 🗼 Endless Tower ----------
export const TOWER = {
  unlock: 'd3',
  themeEvery: 10, themes: ['d2', 'd3', 'd4', 'd5'], // floors 1-10 d2, 11-20 d3, 21-30 d4, 31+ d5
  bossEvery: 5, gauntletEvery: 10,
  hp0: 0.8, hpPerFloor: 0.06, atk0: 0.85, atkPerFloor: 0.03, hitEvery: 5,
  turnPerFloor: 0.015, turnMax: 1.6,
  extraMonFrom: 15,
  // Q 2026-11-04: from floor 20 a floor can mix monsters, bosses and mini bosses in one fight
  mixFrom: 20, mixChance0: 0.3, mixPerFloor: 0.02, mixMax: 0.65, // wave floors: chance to become a mixed fight
  mixMinisFrom: 25, // mini + mini (+1 add) from this floor
  bossAddsChance: 0.5, // boss floors 20+: the boss brings 1-2 adds
  mixBossHp: 0.6, mixMiniHp: 0.75, // a boss / mini sharing the fight with others has this share of its HP
  mixTurns: 6, // extra hero turns for a mixed fight
  eventEvery: 3,
  zeny: (f: number, lv: number) => Math.round((20 + 6 * f) * (1 + lv / 20)),
  fallKeep: 0.5, // falling keeps this share of the floor bank; leaving keeps all of it
  gems: [[10, 20], [25, 40], [50, 80]] as [number, number][], // first time reaching floor n
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

function towerFloor(f: number, lv: number): RunRoom[] {
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
  const th = towerTheme(f), kind = floorKind(f)
  if (kind === 'gauntlet') {
    const pool = MINIS.filter((m) => f >= m.from), n = f >= 30 ? 3 : 2, out: RunRoom[] = []
    for (let k = 0; k < n; k++) {
      const m = pool.splice(Math.floor(Math.random() * pool.length), 1)[0] ?? MINIS[0]
      out.push({ title: `🗼 ชั้น ${f} · ดวลต่อเนื่อง ${k + 1}/${n}`, spawn: [], mini: true, miniPool: [m.kind], turnLimit: 42, floor: f, floorEnd: k === n - 1, src: m.src })
    }
    return out
  }
  const waves = th.rooms.filter((r) => !r.boss && !r.mini)
  const adds = (n: number) => { const ks = waves.flatMap((w) => w.spawn.map(([k]) => k)); return Array.from({ length: n }, () => pick(ks)) }
  const bossPool = BOSSES.slice(0, Math.min(BOSSES.length, DUNGEONS.indexOf(th) + 2))
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
    const minis = MINIS.filter((m) => f >= m.from), r = Math.random()
    if (f >= TOWER.mixMinisFrom && r < 0.3) {
      const a = minis.splice(Math.floor(Math.random() * minis.length), 1)[0], b = pick(minis)
      return [mixed('minis', [{ kind: a.kind, src: a.src, hp: TOWER.mixMiniHp }, { kind: b.kind, src: b.src, hp: TOWER.mixMiniHp }], adds(1), '⚔️ มินิบอสคู่!', 42)]
    }
    if (r < 0.65) { const m = pick(minis); return [mixed('mini', [{ kind: m.kind, src: m.src, hp: TOWER.mixMiniHp }], adds(2), '⚔️ มินิบอสคุมฝูง!', 42)] }
    const b = pick(bossPool)
    return [mixed('boss', [{ kind: b.kind, src: b.src, hp: TOWER.mixBossHp }], adds(2), `👹 ${b.title.replace('ห้องบอส · ', '')} บุกกลางฝูง!`, bossTurns(lv))]
  }
  const w = pick(waves), spawn = w.spawn.map(([k, n]) => [k, n] as [MonsterKind, number])
  if (f >= TOWER.extraMonFrom) { const extra = pick(pick(waves).spawn)[0]; const at = spawn.find((x) => x[0] === extra); if (at) at[1]++; else spawn.push([extra, 1]) }
  return [{ title: `🗼 ชั้น ${f} · ${w.title.replace(/^เวฟ \d+ · /, '')}`, spawn, turnLimit: w.turnLimit, floor: f, floorEnd: true, src: th.id }]
}

function towerRun(s: SaveData, start = 1): RunConfig {
  const rooms: RunRoom[] = [], lv = s.baseLevel
  let floors = Math.max(0, start - 1)
  const roomAt = (i: number) => { while (rooms.length <= i) rooms.push(...towerFloor(++floors, lv)); return rooms[i] }
  return {
    modeId: 'tower', seed: 0, endless: true, affix: true, mutators: [], mut: NO_MUT, tag: '🗼',
    roomAt,
    themeAt: (i) => towerTheme(roomAt(i).floor ?? 1),
    scale: (r, kind) => {
      const f = r.floor ?? 1, k = levelScale((kind && r.srcOf?.[kind]) ?? r.src ?? 'd2', lv), share = (kind && r.hpOf?.[kind]) ?? 1
      return { hp: share * k.hp * (TOWER.hp0 + TOWER.hpPerFloor * (f - 1)), atk: k.atk * (TOWER.atk0 + TOWER.atkPerFloor * (f - 1)), hit: k.hit + Math.floor(f / TOWER.hitEvery), speed: 1 }
    },
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
export const DAILY = { unlock: 'd2', pool: ['d2', 'd3', 'd4', 'd5'], gems: 15, fortune: 25 }
export const dailySeed = (d = new Date()) => +d.toISOString().slice(0, 10).replace(/-/g, '')
/** The day's challenge: the same for every player with the same seed. */
export function dailyOf(seed: number) {
  const rand = rng(seed)
  const id = DAILY.pool[Math.floor(rand() * DAILY.pool.length)] // draw once (not inside find: that would re-roll per dungeon)
  const dg = DUNGEONS.find((d) => d.id === id)!
  const n = 2 + Math.floor(rand() * 2)
  return { dg, mutators: rollMutators(rand, n) }
}

function dailyRun(s: SaveData, seed: number): RunConfig {
  const { dg, mutators } = dailyOf(seed), mut = foldMutators(mutators), lv = s.baseLevel
  return {
    modeId: 'daily', seed, endless: false, affix: false, mutators, mut, tag: '🎲', tint: 0xb0a0ff,
    roomAt: (i) => (dg.rooms[i] ? { ...dg.rooms[i], src: dg.id } : null),
    themeAt: () => dg,
    scale: (r) => { const k = levelScale(r.src ?? dg.id, lv); return { hp: k.hp * mut.monHp, atk: k.atk * mut.monAtk, hit: k.hit, speed: mut.monSpeed } },
    turnMul: () => mut.turnMul,
    eventsAfter: (i, r) => (r.boss || i >= dg.rooms.length - 1 ? 0 : mut.events),
    relicAfter: () => true,
    where: (i) => `🎲 รายวัน ${String(seed).slice(4, 6)}/${String(seed).slice(6)} · ${dg.name} · ด่าน ${i + 1}/${dg.rooms.length}`,
  }
}

// ---------- the modes ----------
const none: ModeReward = { gems: 0, fortune: 0, zeny: 0, mats: {}, lines: [] }

export const MODES: Record<ModeId, GameMode> = {
  dungeon: {
    id: 'dungeon', name: 'ดันเจี้ยน', icon: '⚔️', desc: 'ดันปกติ',
    unlock: () => ({ ok: true, why: '' }), record: (s) => `เคลียร์ ${s.clears} ครั้ง`,
    buildRun: (_s, a) => dungeonRun('dungeon', DUNGEONS[a.d ?? 0] ?? DUNGEONS[0], false),
    reward: () => null,
  },
  hard: {
    id: 'hard', name: 'โหมดยาก', icon: '🔥', desc: 'ดันที่เคลียร์แล้ว มอนแกร่งตามเลเวล',
    unlock: () => ({ ok: true, why: '' }), record: (s) => `เคลียร์ ${Object.values(s.hardClearsBy ?? {}).reduce((a, n) => a + n, 0)} ครั้ง`,
    buildRun: (_s, a) => dungeonRun('hard', DUNGEONS[a.d ?? 0] ?? DUNGEONS[0], true),
    reward: () => null,
  },
  tower: {
    id: 'tower', name: 'หอคอยไร้สิ้นสุด', icon: '🗼',
    desc: `ไต่ชั้นไปเรื่อยๆ มอนแกร่งขึ้นทุกชั้น · บอสทุก ${TOWER.bossEvery} ชั้น · ดวลต่อเนื่องทุก ${TOWER.gauntletEvery} ชั้น\nออกระหว่างชั้น = เก็บรางวัลชั้นครบ · ล้ม = ได้ครึ่งเดียว`,
    unlock: (s) => (cleared(s, TOWER.unlock) ? { ok: true, why: '' } : { ok: false, why: `ปลดล็อกหลังเคลียร์${dungeonName(TOWER.unlock)}` }),
    record: (s) => { const r = s.modes?.tower; return r?.bestFloor ? `สูงสุด ชั้น ${r.bestFloor}` : 'ยังไม่เคยไต่' },
    buildRun: (s, a) => towerRun(s, a.startFloor),
    reward: (s, _cfg, r) => {
      const rec = modeRec(s, 'tower'), before = rec.bestFloor ?? 0, cleared = Math.max(0, r.floor)
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
    record: (s) => { const r = s.modes?.daily; return `${r?.lastSeed === dailySeed() ? '✅ วันนี้เคลียร์แล้ว' : 'วันนี้ยังไม่เคลียร์'} · รวม ${r?.clears ?? 0} วัน` },
    buildRun: (s, a) => dailyRun(s, a.seed ?? dailySeed()),
    reward: (s, cfg, r) => {
      const rec = modeRec(s, 'daily')
      if (!r.won) return { ...none, lines: [] }
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
