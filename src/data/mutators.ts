// Run mutators (design/game-modes-v1.md §4): rule changes a mode puts on one run. Pure data; BattleScene applies them
// through RunConfig (data/modes.ts), so no mode logic lives in the battle code.
import type { Stats } from './game-data'

export type DailyMutatorId = 'swift' | 'noheal' | 'events' | 'critonly' | 'lucky' | 'giant' | 'glass' | 'brutal' | 'rush'

export type RiftMutatorId =
  | 'frenzy_aura'
  | 'thorns_carapace'
  | 'no_heal'
  | 'blood_drain'
  | 'silence_aura'
  | 'skill_only_damage'
  | 'empower_elites'
  | 'volatile_death'

export type MutatorId = DailyMutatorId | RiftMutatorId

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
  /** Reflect fraction of melee/incoming damage back onto attacker (Rift thorns_carapace). */
  thornsMul?: number
  /** Silence hero skills every N turns (Rift silence_aura). */
  silenceEvery?: number
  /** Basic attacks deal reduced/zero damage; skills carry full power (Rift skill_only_damage). */
  skillOnly?: boolean
  /** Extra multiplier applied to elite/miniboss monsters (Rift empower_elites). */
  eliteMul?: number
  /** Fraction of monster max HP dealt on death as burst damage (Rift volatile_death). */
  volatileDeath?: number
  /** Fraction of hero HP drained periodically per turn (Rift blood_drain). */
  bloodDrain?: number
}

export const MUTATORS: Record<DailyMutatorId, MutatorDef> = {
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
export const RIFT_MUTATORS: Record<RiftMutatorId, MutatorDef> = {
  frenzy_aura: {
    id: 'frenzy_aura',
    icon: '⚡',
    name: 'ออร่าคลั่ง',
    desc: 'มอนสเตอร์เร็วขึ้น +35% และโจมตีแรงขึ้น +15%',
    mon: { speed: 1.35, atk: 1.15 },
    zenyMul: 1.15,
  },
  thorns_carapace: {
    id: 'thorns_carapace',
    icon: '🌵',
    name: 'กระดองหนามสะท้อน',
    desc: 'มอนสเตอร์สะท้อนดาเมจกลับ 18%',
    thornsMul: 0.18,
    zenyMul: 1.15,
  },
  no_heal: {
    id: 'no_heal',
    icon: '💔',
    name: 'ห้ามฟื้นฟู',
    desc: 'งดการฮีลทั้งหมดในรอยแยก (ระหว่างสู้และหลังเวฟ)',
    healMul: 0,
    waveHeal: 0,
    zenyMul: 1.25,
  },
  blood_drain: {
    id: 'blood_drain',
    icon: '🩸',
    name: 'สูบเลือดมิติ',
    desc: 'สูญเสีย 3% Max HP ทุกเทิร์นที่เคลื่อนไหว',
    bloodDrain: 0.03,
    zenyMul: 1.2,
  },
  silence_aura: {
    id: 'silence_aura',
    icon: '🔇',
    name: 'ออร่าใบ้มนตรา',
    desc: 'ฮีโร่ถูกใบ้สกิลทุก ๆ 4 เทิร์น',
    silenceEvery: 4,
    zenyMul: 1.2,
  },
  skill_only_damage: {
    id: 'skill_only_damage',
    icon: '✨',
    name: 'รับเฉพาะพลังสกิล',
    desc: 'โจมตีปกติเบาลง ต้องใช้สกิลและอัลติสร้างความเสียหายหลัก',
    skillOnly: true,
    zenyMul: 1.25,
  },
  empower_elites: {
    id: 'empower_elites',
    icon: '👑',
    name: 'เสริมพลังอีลิท',
    desc: 'มอนสเตอร์ระดับอีลิทและบอส HP/ATK แรงขึ้น +40%',
    eliteMul: 1.4,
    mon: { hp: 1.1 },
    zenyMul: 1.2,
  },
  volatile_death: {
    id: 'volatile_death',
    icon: '💥',
    name: 'ระเบิดพลีชีพ',
    desc: 'มอนสเตอร์ตายแล้วระเบิด 12% Max HP ของมันใส่ฮีโร่',
    volatileDeath: 0.12,
    zenyMul: 1.15,
  },
}

export const ALL_MUTATORS: Record<MutatorId, MutatorDef> = {
  ...MUTATORS,
  ...RIFT_MUTATORS,
}

export function mutatorById(id: string): MutatorDef | undefined {
  return (ALL_MUTATORS as Partial<Record<string, MutatorDef>>)[id]
}

export function rollMutators(rand: () => number, n: number): MutatorDef[] {
  const pool = Object.keys(MUTATORS) as DailyMutatorId[]
  const out: DailyMutatorId[] = []
  while (out.length < n && pool.length) {
    const id = pool.splice(Math.floor(rand() * pool.length), 1)[0]
    if (out.some((o) => CLASH.some(([a, b]) => (a === o && b === id) || (b === o && a === id)))) continue
    out.push(id)
  }
  return out.map((id) => MUTATORS[id])
}

/** Every mutator's multipliers folded into one (multipliers multiply, events take the max). */
export function foldMutators(list: MutatorDef[]) {
  const f: {
    monHp: number
    monAtk: number
    monSpeed: number
    healMul: number
    waveHeal: number
    events: number
    lukMul: number
    turnMul: number
    zenyMul: number
    heroMul: { maxHp: number; atk: number; matk: number }
    hero: Partial<Stats>
    thornsMul?: number
    silenceEvery?: number
    skillOnly?: boolean
    eliteMul?: number
    volatileDeath?: number
    bloodDrain?: number
  } = {
    monHp: 1,
    monAtk: 1,
    monSpeed: 1,
    healMul: 1,
    waveHeal: 1,
    events: 1,
    lukMul: 1,
    turnMul: 1,
    zenyMul: 1,
    heroMul: { maxHp: 1, atk: 1, matk: 1 },
    hero: {} as Partial<Stats>,
  }
  for (const m of list) {
    f.monHp *= m.mon?.hp ?? 1; f.monAtk *= m.mon?.atk ?? 1; f.monSpeed *= m.mon?.speed ?? 1
    f.healMul *= m.healMul ?? 1; f.waveHeal *= m.waveHeal ?? 1; f.events = Math.max(f.events, m.events ?? 1)
    f.lukMul *= m.lukMul ?? 1; f.turnMul *= m.turnMul ?? 1; f.zenyMul *= m.zenyMul ?? 1
    for (const k of ['maxHp', 'atk', 'matk'] as const) f.heroMul[k] *= m.heroMul?.[k] ?? 1
    for (const [k, v] of Object.entries(m.hero ?? {}) as [keyof Stats, number][]) f.hero[k] = (f.hero[k] ?? 0) + v
    if (m.thornsMul != null) f.thornsMul = (f.thornsMul ?? 0) + m.thornsMul
    if (m.silenceEvery != null) f.silenceEvery = f.silenceEvery == null ? m.silenceEvery : Math.min(f.silenceEvery, m.silenceEvery)
    if (m.skillOnly) f.skillOnly = true
    if (m.eliteMul != null) f.eliteMul = (f.eliteMul ?? 1) * m.eliteMul
    if (m.volatileDeath != null) f.volatileDeath = (f.volatileDeath ?? 0) + m.volatileDeath
    if (m.bloodDrain != null) f.bloodDrain = (f.bloodDrain ?? 0) + m.bloodDrain
  }
  return f
}
export type FoldedMutators = ReturnType<typeof foldMutators>
