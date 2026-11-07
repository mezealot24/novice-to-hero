// ===== 🔥 Hard-mode corruption for D6+ (Q 2026-11-04: "สุ่ม Penalty แบบ POE ดันเจียน corrupt") =====
// A hard run of a level dungeon rolls 2 minor + (40%) 1 major corruption from this pool, shown on the confirm card
// before the run (same seed -> same rolls, so a retry keeps them). Each one pays extra rewards (zeny / account EXP / mats).
// Pure data. Four kinds of effect, all read by existing systems so BattleScene stays thin:
//   affix   -> a tower affix (data/affixes.ts) on every monster        (BattleScene.aff)
//   mut     -> a run mutator field on the hero / turn limits           (RunConfig.mut, data/mutators.ts)
//   statMul -> x stat points the monsters get for that stat            (data/mon-stats.ts statMonster)
//   tyrant / twinDuel -> boss rolls a 2nd hard affix · the duel room happens twice
import type { AffixId } from './affixes'
import type { StatAlloc } from './mon-stats'
import { rng, type MutatorDef } from './mutators'

export type CorruptId = 'grievous' | 'armor' | 'hawkeye' | 'split' | 'swift' | 'vampire' | 'volatile'
  | 'mind' | 'jinx' | 'brittle' | 'seal' | 'hourglass' | 'tyrant' | 'twinDuel'

export interface CorruptDef {
  id: CorruptId
  icon: string
  name: string
  desc: string
  major: boolean
  weight: number
  affix?: AffixId
  mut?: Omit<MutatorDef, 'id' | 'icon' | 'name' | 'desc'>
  statMul?: StatAlloc
  tyrant?: boolean
  twinDuel?: boolean
}

export const CORRUPTIONS: CorruptDef[] = [
  // tower affixes, reused
  { id: 'grievous', icon: '🩸', name: 'แผลลึก', desc: 'ฮีลทุกอย่างของเราลด 30%', major: false, weight: 10, affix: 'grievous' },
  { id: 'armor', icon: '⛰️', name: 'เกราะหนา', desc: 'มอน DEF +25 และ HP +10%', major: false, weight: 10, affix: 'armor' },
  { id: 'hawkeye', icon: '🎯', name: 'ตาเหยี่ยว', desc: 'มอนทุกตัวหลบหลีกเราได้แค่ 2 ครั้ง แล้วตีโดนแน่นอน 3 เทิร์น', major: false, weight: 10, affix: 'hawkeye' },
  { id: 'swift', icon: '💨', name: 'ว่องไว', desc: 'มอนเร็วขึ้น 15%', major: false, weight: 10, affix: 'swift' },
  { id: 'vampire', icon: '🧛', name: 'ผีดูดเลือด', desc: 'มอนดูดเลือด 15% ของดาเมจที่ทำ', major: false, weight: 10, affix: 'vampire' },
  { id: 'volatile', icon: '💥', name: 'ระเบิดตาย', desc: 'มอนธรรมดาระเบิดใส่เราตอนตาย (เวท)', major: false, weight: 8, affix: 'volatile' },
  { id: 'split', icon: '🧬', name: 'แยกร่าง', desc: 'มอนธรรมดาตายแล้วแยกร่างกลับมา 1 ตัว (HP 40%)', major: true, weight: 8, affix: 'split' },
  // new: monster stats
  { id: 'mind', icon: '🧠', name: 'จิตแกร่ง', desc: 'มอนได้แต้ม WIS +30% (กันเวท ต้านดีบัฟ)', major: false, weight: 10, statMul: { wis: 1.3 } },
  { id: 'jinx', icon: '🍀', name: 'ดวงร้าย', desc: 'มอนได้แต้ม LUK +30% (คริ หลบโชคดี)', major: false, weight: 10, statMul: { luk: 1.3 } },
  // new: on the hero
  { id: 'hourglass', icon: '🌀', name: 'เวลาบีบ', desc: 'เทิร์นจำกัดลด 20%', major: false, weight: 8, mut: { turnMul: 0.8 } },
  { id: 'brittle', icon: '💀', name: 'คำสาปเปราะ', desc: 'HP สูงสุดของเราลด 20%', major: true, weight: 8, mut: { heroMul: { maxHp: 0.8 } } },
  { id: 'seal', icon: '🔇', name: 'ผนึกพลัง', desc: 'Mana / Energy ฟื้นช้าลง 40% · Rage ได้น้อยลง 40%', major: true, weight: 8, mut: { hero: { resRegenCut: 0.4, rageGain: -0.4 } } },
  // new: the dungeon itself
  { id: 'tyrant', icon: '👑', name: 'ทรราช', desc: 'บอส / มินิบอสสุ่มสกิล + passive เพิ่มอีกชุด', major: true, weight: 8, tyrant: true },
  { id: 'twinDuel', icon: '⚔️', name: 'สังเวียนคู่', desc: 'ห้องดวล 1-1 มีสองรอบติดกัน', major: true, weight: 6, twinDuel: true },
]

export const CORRUPT_RULES = { minor: 2, majorChance: 0.4, reward: { minor: 0.15, major: 0.35 } }
const CLASH: [CorruptId, CorruptId][] = [['split', 'volatile']]

const draw = (pool: CorruptDef[], rand: () => number) => {
  let r = rand() * pool.reduce((a, c) => a + c.weight, 0)
  for (const c of pool) if ((r -= c.weight) < 0) return c
  return pool[pool.length - 1]
}

/** The corruptions of one hard run (same seed -> same list). */
export function rollCorruptions(seed: number): CorruptDef[] {
  const rand = rng(seed), out: CorruptDef[] = []
  const ok = (c: CorruptDef) => !out.includes(c) && !out.some((o) => CLASH.some(([a, b]) => (a === o.id && b === c.id) || (b === o.id && a === c.id)))
  for (let i = 0; i < CORRUPT_RULES.minor; i++) { const pool = CORRUPTIONS.filter((c) => !c.major && ok(c)); if (pool.length) out.push(draw(pool, rand)) }
  if (rand() < CORRUPT_RULES.majorChance) { const pool = CORRUPTIONS.filter((c) => c.major && ok(c)); if (pool.length) out.push(draw(pool, rand)) }
  return out
}

/** Everything a run needs from its corruptions, folded. */
export function foldCorruptions(list: CorruptDef[]) {
  const statMul: StatAlloc = {}
  for (const c of list) for (const [k, v] of Object.entries(c.statMul ?? {}) as [keyof StatAlloc, number][]) statMul[k] = (statMul[k] ?? 1) * v
  return {
    list,
    affixes: list.flatMap((c) => (c.affix ? [c.affix] : [])),
    statMul,
    tyrant: list.some((c) => c.tyrant),
    twinDuel: list.some((c) => c.twinDuel),
    /** Mutators the run folds (hero-side numbers); shown together with the rest in the run-start banner. */
    mutators: list.map((c): MutatorDef => ({ id: 'swift', ...c.mut, icon: c.icon, name: c.name, desc: c.desc } as MutatorDef)),
    reward: 1 + list.reduce((a, c) => a + (c.major ? CORRUPT_RULES.reward.major : CORRUPT_RULES.reward.minor), 0),
  }
}
export type FoldedCorruption = ReturnType<typeof foldCorruptions>
