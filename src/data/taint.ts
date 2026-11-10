// Taint (v89, design/unique-taint-tower-skip-v1.md §3): a one-shot PoE-style "Corrupt" gamble on one item at the Forge.
// Code name is `taint` because data/corruptions.ts is the hard-mode DUNGEON corruption. Players see "คำสาป" / Corrupt.
// This file is data + pure helpers only (type imports from meta, so meta.ts can import it); the save action is tryTaint() in refine.ts.
// Money rule (Q 2026-11-07): taint is a pure zeny sink. No outcome returns zeny.
import type { Stats } from './game-data'
import type { Item } from './meta'

export type TaintKind = 'none' | 'gold' | 'curse' | 'brick'
/** save.taint[itemId]: a record = the item is tainted (locked). `curse` = the id in CURSES when kind is 'curse'. */
export interface TaintRec { kind: TaintKind; curse?: string }

export const TAINT_MAT = 'x_taint'
export const TAINT = {
  zeny: 3000, // one price for every item
  crystals: 2, // x ผลึกโลกันตร์ (drops from D6+ final bosses, MAT_RULES.taintBoss)
  odds: { none: 0.25, gold: 0.25, curse: 0.25, brick: 0.25 } as Record<TaintKind, number>, // must sum to 1
  minDungeon: 6, // the crystal drops from this dungeon's final boss up
}
export const TAINT_KINDS: TaintKind[] = ['none', 'gold', 'curse', 'brick']

/** Which outcome a roll in [0,1) picks, using the odds in order none / gold / curse / brick. */
export function pickTaintKind(r: number): TaintKind {
  let acc = 0
  for (const k of TAINT_KINDS) { acc += TAINT.odds[k]; if (r < acc) return k }
  return 'brick'
}

/** A curse line: a strong bonus AND a downside, added on top of the item as worn (not scaled by grade / refine). */
export interface CurseDef { id: string; name: string; icon: string; mod: Partial<Stats>; pct?: NonNullable<Item['pct']> }
export const CURSES: CurseDef[] = [
  // ----- Classic Curses (Upgraded with high-impact stats) -----
  { id: 'glass', name: 'แก้วร้าว', icon: '💎', mod: { critMul: 0.4, crit: 0.06 }, pct: { maxHp: -0.15 } },
  { id: 'thirst', name: 'กระหายเลือด', icon: '🩸', mod: { lifesteal: 0.12, spellVamp: 0.08, healAmp: -0.25 } },
  { id: 'fury', name: 'คลั่ง', icon: '💢', mod: { def: -6, pskill: 0.10 }, pct: { atk: 0.25 } },
  { id: 'haste', name: 'ไวเกินตัว', icon: '⚡', mod: { aspd: 0.35, combo: 0.08 }, pct: { maxHp: -0.08 } },
  { id: 'thorn', name: 'หนามคม', icon: '🌵', mod: { counter: 0.20, ctrAoe: 1, flee: -6 } },
  { id: 'arcane', name: 'เวทต้องห้าม', icon: '🔮', mod: { mdef: -0.06, maxRes: 30 }, pct: { matk: 0.25 } },

  // ----- Corrupted Keystones (Game-changing signatures) -----
  { id: 'phoenix', name: 'เพลิงอมตะ', icon: '🐦‍🔥', mod: { revive: 1, maxHp: 100, maxRes: -15 } },
  { id: 'berserk', name: 'โลหิตบ้าคลั่ง', icon: '🪓', mod: { berserk: 1, atk: 20, def: -8 } },
  { id: 'aegis', name: 'ปราการศักดิ์สิทธิ์', icon: '🛡️', mod: { overhealShield: 1, waveShield: 0.08, flee: -10 } },
  { id: 'mirage', name: 'เงาลวงตา', icon: '🥷', mod: { dodgeStrike: 1, luckyDodge: 0.08, flee: 15, def: -6 } },
  { id: 'vampire', name: 'เขี้ยวสูบวิญญาณ', icon: '🧛', mod: { killHeal: 0.06, lifesteal: 0.08, healAmp: -0.25 } },
  { id: 'titan', name: 'ไททันบรรพกาล', icon: '🗿', mod: { tenacity: 0.20, aspd: -0.20 }, pct: { maxHp: 0.25 } },
  { id: 'inferno', name: 'อเวจีลุกลาม', icon: '🔥', mod: { fireSpread: 1, burnDps: 4, mdef: -0.05 } },
  { id: 'venom', name: 'พิษมรณะแพร่พันธุ์', icon: '☠️', mod: { poisonSpread: 1, poisonDmg: 3, healAmp: -0.15 } },
]
export const curseById = (id: string | undefined) => CURSES.find((c) => c.id === id)

const r3 = (n: number) => Math.round(n * 1000) / 1000
/** The item with a curse added on top (a copy; the input is untouched). */
export function applyCurse(it: Item, id: string | undefined): Item {
  const c = curseById(id)
  if (!c) return it
  const mod: Partial<Stats> = { ...it.mod }
  for (const [k, v] of Object.entries(c.mod) as [keyof Stats, number][]) mod[k] = r3((mod[k] ?? 0) + v)
  const pct: NonNullable<Item['pct']> = { ...(it.pct ?? {}) }
  for (const [k, v] of Object.entries(c.pct ?? {}) as [keyof typeof pct, number][]) pct[k] = r3((pct[k] ?? 0) + v)
  return { ...it, mod, pct }
}
