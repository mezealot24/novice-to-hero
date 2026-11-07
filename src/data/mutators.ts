// Run mutators (design/game-modes-v1.md §4): rule changes a mode puts on one run. Pure data; BattleScene applies them
// through RunConfig (data/modes.ts), so no mode logic lives in the battle code.
import type { Stats } from './game-data'

export type MutatorId = 'swift' | 'noheal' | 'events' | 'critonly' | 'lucky' | 'giant' | 'glass' | 'brutal' | 'rush'

export interface MutatorDef {
  id: MutatorId
  icon: string
  name: string
  desc: string
  mon?: { hp?: number; atk?: number; speed?: number } // monster multipliers
  hero?: Partial<Stats> // added to the hero's stats at run start
  heroMul?: { maxHp?: number; atk?: number; matk?: number } // multiplies the hero's starting stats
  healMul?: number // every heal on the hero x this
  waveHeal?: number // the heal after a wave x this (0 = none)
  events?: number // post-wave events per wave (default 1)
  lukMul?: number // allocated LUK points x this
  turnMul?: number // turn limits x this
  zenyMul?: number // zeny at the end x this
}

export const MUTATORS: Record<MutatorId, MutatorDef> = {
  swift: { id: 'swift', icon: '💨', name: 'มอนใจร้อน', desc: 'มอนเร็วขึ้น x1.3', mon: { speed: 1.3 } },
  noheal: { id: 'noheal', icon: '🩹', name: 'แผลเรื้อรัง', desc: 'ฟื้น HP x0.5 · ไม่ฟื้นหลังจบเวฟ', healMul: 0.5, waveHeal: 0 },
  events: { id: 'events', icon: '🎪', name: 'เทศกาลเหตุการณ์', desc: 'เหตุการณ์ 2 ครั้งหลังทุกเวฟ', events: 2 },
  critonly: { id: 'critonly', icon: '🎯', name: 'คริหรือศูนย์', desc: 'คริทุกฮิต แต่ ATK / M.ATK x0.6', hero: { crit: 1 }, heroMul: { atk: 0.6, matk: 0.6 } },
  lucky: { id: 'lucky', icon: '🍀', name: 'ดวงพุ่ง', desc: 'LUK ที่ลงแต้มไว้ x2', lukMul: 2 },
  giant: { id: 'giant', icon: '🐘', name: 'มอนยักษ์', desc: 'มอน HP x1.5 แต่ช้าลง x0.85 · zeny x1.3', mon: { hp: 1.5, speed: 0.85 }, zenyMul: 1.3 },
  glass: { id: 'glass', icon: '🗡️', name: 'ปืนใหญ่กระจก', desc: 'ATK / M.ATK x1.4 แต่ HP สูงสุด x0.6', heroMul: { atk: 1.4, matk: 1.4, maxHp: 0.6 } },
  brutal: { id: 'brutal', icon: '💢', name: 'มอนเดือด', desc: 'มอนตีแรงขึ้น x1.3 · zeny x1.2', mon: { atk: 1.3 }, zenyMul: 1.2 },
  rush: { id: 'rush', icon: '⏳', name: 'รีบเร่ง', desc: 'เทิร์นจำกัด x0.75 · zeny x1.3', turnMul: 0.75, zenyMul: 1.3 },
}

/** Pairs that make a run unwinnable or pointless together. */
const CLASH: [MutatorId, MutatorId][] = [['glass', 'noheal'], ['critonly', 'glass'], ['giant', 'rush']]

/** Deterministic PRNG (mulberry32): the same seed gives every player the same daily. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** n mutators drawn from the seed, never a clashing pair. */
export function rollMutators(rand: () => number, n: number): MutatorDef[] {
  const pool = Object.keys(MUTATORS) as MutatorId[]
  const out: MutatorId[] = []
  while (out.length < n && pool.length) {
    const id = pool.splice(Math.floor(rand() * pool.length), 1)[0]
    if (out.some((o) => CLASH.some(([a, b]) => (a === o && b === id) || (b === o && a === id)))) continue
    out.push(id)
  }
  return out.map((id) => MUTATORS[id])
}

/** Every mutator's multipliers folded into one (multipliers multiply, events take the max). */
export function foldMutators(list: MutatorDef[]) {
  const f = { monHp: 1, monAtk: 1, monSpeed: 1, healMul: 1, waveHeal: 1, events: 1, lukMul: 1, turnMul: 1, zenyMul: 1, heroMul: { maxHp: 1, atk: 1, matk: 1 }, hero: {} as Partial<Stats> }
  for (const m of list) {
    f.monHp *= m.mon?.hp ?? 1; f.monAtk *= m.mon?.atk ?? 1; f.monSpeed *= m.mon?.speed ?? 1
    f.healMul *= m.healMul ?? 1; f.waveHeal *= m.waveHeal ?? 1; f.events = Math.max(f.events, m.events ?? 1)
    f.lukMul *= m.lukMul ?? 1; f.turnMul *= m.turnMul ?? 1; f.zenyMul *= m.zenyMul ?? 1
    for (const k of ['maxHp', 'atk', 'matk'] as const) f.heroMul[k] *= m.heroMul?.[k] ?? 1
    for (const [k, v] of Object.entries(m.hero ?? {}) as [keyof Stats, number][]) f.hero[k] = (f.hero[k] ?? 0) + v
  }
  return f
}
export type FoldedMutators = ReturnType<typeof foldMutators>
