// ===== ☀️ Dungeon days (Q 2026-11-18, Capybara Go pacing): a run is N days, N grows with the dungeon =====
// "ถ้าผ่าน D1 แล้ว D2, D3, ... จะมีมอนของด่านที่เคยผ่านปรากฏ · แต่ละดันเพิ่ม Phase จาก 6/6 ขึ้นเรื่อยๆ" -> Q picked the full day system.
//   day 1      : authored waves (first half) ............ + 🌙 day-end fight = the dungeon's own 1-1 duel
//   days 2..N-1: 🔁 echo waves (own normals + normals of EARLIER dungeons) + 🌙 day-end fight = a returning mini boss
//                (own pool + minis of earlier dungeons), or an elite echo wave when no mini exists yet (D2 / D3)
//   day N      : authored waves (second half) ........... + 👑 the dungeon boss
// Every wave / day-end fight leads to its post-wave event as before (a day-end fight gives `dayEndEvents` more), so a longer dungeon
// also hands out more events. No raw stat padding: a monster from an earlier dungeon is rebuilt at the room's Lv (BattleScene.echoDef).
// D1 (tutorial) keeps its own rooms. Pure data + pure functions; numbers are live-config tunable (tunables.ts `progression` -> days.*).
import { DUNGEONS, MONSTERS, type DungeonDef, type MonsterDef, type MonsterKind, type RoomDef } from './game-data'
import { monTier } from './mon-stats'
import { rng } from './mutators'
import { MINI_POOL } from './relics'

export const DUNGEON_DAYS = {
  /** 1 = on, 0 = off (every dungeon back to its authored 6 rooms). */
  on: 1,
  /** First dungeon number (1-based) that runs in days. */
  from: 2,
  /** Days at `from`, then +1 day every `every` dungeons, at most `max`: D2 3, D3 3, D4 4, D5 4, D6 5, D7 5, D8+ 6. */
  base: 3,
  every: 2,
  max: 6,
  /** Waves in a day before its day-end fight. */
  waves: 2,
  /** Monsters in an echo wave (the battle has 4 slots) / in an elite day-end wave. */
  size: 3,
  eliteSize: 4,
  /** Of an echo wave, how many are the dungeon's own normals (the rest come from earlier dungeons). */
  native: 1,
  /** 1 = middle day-end duels may draw mini bosses of earlier dungeons too. */
  returnMini: 1,
  /** D6+: Lv a day-end fight sits above the day's last wave (capped one below the boss). */
  dayEndLv: 2,
  /** Extra post-wave events after a day-end fight (the night at camp). */
  dayEndEvents: 1,
  /** Share of Max HP healed when a new day starts (on top of the normal wave heal). */
  dayHeal: 0.15,
}

export interface DayRoom extends RoomDef {
  /** 1-based day of this room / days in the run. */
  day?: number
  days?: number
  /** First room of its day (BattleScene shows the ☀️ new-day banner). */
  dayStart?: boolean
  /** Last fight of a day (not the boss). */
  dayEnd?: boolean
  /** Monsters here may come from earlier dungeons: rebuild them at this room's Lv. */
  echo?: boolean
  /** Day-end elite wave (no mini boss available): pays like the fork event's elite wave. */
  elite?: boolean
}

/** Days for dungeon number n (1-based); 0 = the dungeon keeps its authored rooms. */
export function dayCount(n: number): number {
  const D = DUNGEON_DAYS
  if (!D.on || n < D.from) return 0
  return Math.max(2, Math.min(D.max, Math.round(D.base) + Math.floor((n - D.from) / Math.max(1, D.every))))
}
export const daysOf = (dg: DungeonDef) => dayCount(DUNGEONS.findIndex((d) => d.id === dg.id) + 1)

const isWave = (r: RoomDef) => !r.boss && !r.mini && r.spawn.length > 0
const normalsOf = (d: DungeonDef): MonsterKind[] => [...new Set(d.rooms.filter(isWave).flatMap((r) => r.spawn.map(([k]) => k)))]
const minisOf = (d: DungeonDef): MonsterKind[] => d.rooms.filter((r) => r.mini).flatMap((r) => r.miniPool ?? MINI_POOL)

/** Normal monsters of the dungeons before index `idx`, per dungeon. */
export function echoPool(idx: number): { id: string; kinds: MonsterKind[] }[] {
  return DUNGEONS.slice(0, Math.max(0, idx)).map((d) => ({ id: d.id, kinds: normalsOf(d) })).filter((p) => p.kinds.length)
}
/** Mini bosses of the dungeons before index `idx`. */
export const echoMinis = (idx: number): MonsterKind[] => [...new Set(DUNGEONS.slice(0, Math.max(0, idx)).flatMap(minisOf))]

const tag = (id: string) => `D${DUNGEONS.findIndex((d) => d.id === id) + 1}`

/** An echo wave: `native` own normals + the rest from earlier dungeons (a dungeon first, then a kind, so old and new dungeons
 * come back as often as each other). */
function echoWave(dg: DungeonDef, pool: { id: string; kinds: MonsterKind[] }[], size: number, r: () => number): { spawn: [MonsterKind, number][]; from: string[] } {
  const pick = <T>(a: T[]) => a[Math.floor(r() * a.length) % a.length]
  const n = Math.max(1, Math.min(4, Math.round(size))), own = normalsOf(dg)
  const nOwn = !pool.length ? n : own.length ? Math.max(0, Math.min(n - 1, Math.round(DUNGEON_DAYS.native))) : 0
  const kinds: MonsterKind[] = [], from: string[] = []
  for (let i = 0; i < n - nOwn; i++) { const p = pick(pool); kinds.push(pick(p.kinds)); if (!from.includes(p.id)) from.push(p.id) }
  for (let i = 0; i < nOwn; i++) kinds.push(pick(own))
  const spawn: [MonsterKind, number][] = []
  for (const k of kinds) { const s = spawn.find((x) => x[0] === k); if (s) s[1]++; else spawn.push([k, 1]) }
  return { spawn, from }
}

/** The run's rooms for a dungeon in days (the authored rooms untouched when dayCount = 0). `seed` picks the echo monsters. */
export function buildDays(dg: DungeonDef, seed: number): DayRoom[] {
  const idx = DUNGEONS.findIndex((d) => d.id === dg.id), days = dayCount(idx + 1)
  const boss = dg.rooms.find((r) => r.boss), authored = dg.rooms.filter(isWave)
  if (!days || !boss || authored.length < 2) return dg.rooms
  const D = DUNGEON_DAYS, per = Math.max(1, Math.round(D.waves)), total = days * per
  const own = dg.rooms.find((r) => r.mini), pool = echoPool(idx)
  const minis = [...new Set([...(own ? own.miniPool ?? MINI_POOL : []), ...(D.returnMini ? echoMinis(idx) : [])])]
  const r = rng((seed ^ Math.imul(idx + 1, 0x9e3779b1)) >>> 0)
  // wave slots: first half of the authored waves open the run, second half lead to the boss, echo waves fill the middle
  const head = Math.ceil(authored.length / 2), tail = authored.length - head
  const slots: (RoomDef | null)[] = Array.from({ length: total }, (_, i) => (i < head ? authored[i] : i >= total - tail ? authored[authored.length - (total - i)] : null))
  // D6+: every wave slot gets a Lv, the authored ones keep theirs, echo slots climb between their authored neighbours
  const lvs = dg.level ? slotLevels(slots, dg.level) : []
  const out: DayRoom[] = []
  let echoN = 0
  for (let d = 1; d <= days; d++) {
    const at = out.length
    for (let w = 0; w < per; w++) {
      const i = (d - 1) * per + w, s = slots[i]
      const lv = dg.level ? { lv: lvs[i] } : {}
      if (s) out.push({ ...s, ...lv, day: d, days })
      else {
        const e = echoWave(dg, pool, D.size, r)
        out.push({ title: `🔁 เวฟ ${++echoN} · ${e.from.length ? `มอนจาก ${e.from.map(tag).join(' · ')}` : 'ฝูงเสียงสะท้อน'}`, spawn: e.spawn, echo: true, ...lv, day: d, days })
      }
    }
    out[at].dayStart = true
    const lastLv = out[out.length - 1].lv
    if (d === days) { out.push({ ...boss, ...(dg.level ? { lv: boss.lv ?? dg.level[1] } : {}), day: d, days }); break }
    const endLv = dg.level ? { lv: Math.min((boss.lv ?? dg.level[1]) - 1, (lastLv ?? dg.level[0]) + Math.round(D.dayEndLv)) } : {}
    if (d === 1 && own) out.push({ ...own, ...endLv, title: `🌙 ศึกท้ายวัน · ${own.title}`, day: d, days, dayEnd: true })
    else if (minis.length) out.push({ title: '🌙 ศึกท้ายวัน · มินิบอสหวนคืน', spawn: [], mini: true, miniPool: minis, turnLimit: own?.turnLimit ?? 45, echo: true, ...endLv, day: d, days, dayEnd: true })
    else {
      const e = echoWave(dg, pool, D.eliteSize, r)
      out.push({ title: `🌙 ศึกท้ายวัน · ฝูงหัวหน้า${e.from.length ? ` (มอนจาก ${e.from.map(tag).join(' · ')})` : ''}`, spawn: e.spawn, echo: true, elite: true, ...endLv, day: d, days, dayEnd: true })
    }
  }
  return out
}

/** Lv of each wave slot: authored slots keep their Lv (or the old spread), empty slots climb linearly between their neighbours. */
function slotLevels(slots: (RoomDef | null)[], level: [number, number]): number[] {
  const known = slots.map((s, i) => (s ? s.lv ?? Math.round(level[0] + ((level[1] - 2 - level[0]) * i) / Math.max(1, slots.length - 1)) : null))
  return known.map((v, i) => {
    if (v != null) return v
    let a = i - 1, b = i + 1
    while (a >= 0 && known[a] == null) a--
    while (b < known.length && known[b] == null) b++
    const lo = a >= 0 ? known[a]! : level[0], hi = b < known.length ? known[b]! : level[1] - 2
    const ia = a >= 0 ? a : -1, ib = b < known.length ? b : known.length
    return Math.round(lo + ((hi - lo) * (i - ia)) / (ib - ia))
  })
}

/** What a monster from an earlier dungeon pays here: EXP / zeny x (this dungeon's average for its tier / its own), so a Lv-raised
 * D1 monster in D7 pays like a D7 one. 1 / 1 when the dungeon has no monster of that tier to compare with. */
export function echoPay(dg: DungeonDef, d: MonsterDef): { xp: number; zeny: number } {
  const tier = monTier(d), own = (tier === 'normal' ? normalsOf(dg) : minisOf(dg)).map((k) => MONSTERS[k]).filter((m) => m && monTier(m) === tier)
  if (!own.length) return { xp: 1, zeny: 1 }
  const avg = (f: (m: MonsterDef) => number) => own.reduce((a, m) => a + f(m), 0) / own.length
  const z = (m: MonsterDef) => (m.zeny[0] + m.zeny[1]) / 2
  return { xp: d.xp > 0 ? avg((m) => m.xp) / d.xp : 1, zeny: z(d) > 0 ? avg(z) / z(d) : 1 }
}
