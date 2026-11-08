// Unique items (v88, design/unique-taint-tower-skip-v1.md §2): rare final-boss drops that change a build, some with a
// curse (negative mods in the same item). They reuse existing Stats flags, no new battle hook.
// Item ids are save data: never rename or remove one. Pure data + rules, no scene code.
// Money rule (Q 2026-11-07): nothing here may create zeny. A duplicate drop pays boss materials, never zeny, and a unique can't be sold.
import type { Item } from './meta'
import type { JobId } from './jobs'
import { matOf } from './materials'
import { HELL_MODE } from './hell'

export const UNIQUE = {
  maxEquipped: 2, // worn at the same time (counted by slot, enforced in save.ts equip)
  dropRate: 0.05, // per final-boss kill, normal dungeon (Q 2026-11-07 "~5%")
  dropRateHard: 0.1, // per final-boss kill, hard mode
  dupeBoss: 4, // a duplicate pays this many of that dungeon's boss materials (a normal boss kill pays 2). Never zeny.
  sell: 0, // sell value. Uniques are not in the shop, so there is no sell button at all; this documents the rule.
}

const SW: JobId[] = ['swordsman'], TH: JobId[] = ['thief'], AR: JobId[] = ['archer'], MG: JobId[] = ['mage'], CL: JobId[] = ['cleric']

/** price 0 = not in the shop. `unique.dg` = the dungeon whose materials it uses (grade / refine / duplicate payout). */
export const UNIQUE_ITEMS: Item[] = [
  // ----- cursed (a strong effect + a downside in the same item) -----
  { id: 'u_bloodfang', slot: 'weapon', name: 'เขี้ยวกระหายเลือด', icon: '🩸', price: 0, slots: 1, unique: { dg: 'd2' }, jobs: [...SW, ...TH],
    desc: 'ดูดเลือดแรงมาก แต่แผลของเจ้าของไม่ยอมสมาน', base: { str: 2, agi: 2 }, mod: { atk: 12, lifesteal: 0.12, healAmp: -0.5 } },
  { id: 'u_glasscrown', slot: 'head', name: 'มงกุฎแก้วแตกร้าว', icon: '💎', price: 0, slots: 1, unique: { dg: 'd1' },
    desc: 'คริหนักขึ้นเท่าตัว แต่ใส่แล้วเปราะบางมาก', mod: { critMul: 0.8, crit: 0.04 }, pct: { maxHp: -0.3 } },
  { id: 'u_cactus', slot: 'offhand', name: 'โล่กระบองเพชร', icon: '🌵', price: 0, slots: 1, unique: { dg: 'd6' }, jobs: [...SW, ...CL],
    desc: 'ใครตีมาโดนสวนกลับทั้งฝูง แต่โล่หนามหนักจนแขนช้าลง', base: { vit: 2 }, mod: { counter: 0.3, ctrAoe: 1, def: 4, aspd: -0.32 } },
  { id: 'u_berserkaxe', slot: 'weapon', name: 'ขวานเลือดเดือด', icon: '🪓', price: 0, slots: 1, unique: { dg: 'd3' }, jobs: SW,
    desc: 'ยิ่งเจ็บยิ่งคลั่ง (HP<30%: ATK +40% ดูดเลือด x2) แต่เกราะบางลง', base: { str: 4 }, mod: { atk: 20, berserk: 1, def: -6 }, pct: { maxHp: -0.1 } },
  // ----- clean (no downside) -----
  { id: 'u_halo', slot: 'acc', name: 'ห่วงผู้พิทักษ์', icon: '👼', price: 0, slots: 1, unique: { dg: 'd1' },
    desc: 'ฮีลเกินเลือดเต็มกลายเป็นโล่ และฟื้นตัวทุกเทิร์น', base: { wis: 2 }, mod: { overhealShield: 1, healAmp: 0.15, regen: 0.3 } },
  { id: 'u_ghostcloak', slot: 'armor', name: 'ผ้าคลุมไร้เงา', icon: '👻', price: 0, slots: 1, unique: { dg: 'd2' }, jobs: [...TH, ...AR],
    desc: 'หลบแล้วฟื้นเลือด หลบโชคดีบ่อยขึ้น', base: { agi: 3 }, mod: { maxHp: 40, dodgeHeal: 0.04, luckyDodge: 0.06, flee: 10 } },
  { id: 'u_hawkeye', slot: 'head', name: 'ตาเหยี่ยวราชัน', icon: '🦅', price: 0, slots: 1, unique: { dg: 'd5' },
    desc: 'ตาไว คริบ่อย (คริ = ทะลุเกราะ โดนแน่)', base: { dex: 3 }, mod: { crit: 0.06, hit: 10 } },
  { id: 'u_mirrorshield', slot: 'offhand', name: 'โล่กระจกสะท้อน', icon: '🔁', price: 0, slots: 1, unique: { dg: 'd7' }, jobs: [...SW, ...CL],
    desc: 'โล่ที่แตกสะท้อนดาเมจกลับ ได้โล่ทุกต้นเวฟ', base: { vit: 2 }, mod: { thorns: 0.3, waveShield: 0.04, def: 6 } },
  { id: 'u_soulstaff', slot: 'weapon', name: 'คทาดูดวิญญาณ', icon: '🔮', price: 0, slots: 1, unique: { dg: 'd5' }, jobs: [...MG, ...CL], wtype: 'staff',
    desc: 'สกิลที่ร่ายออกไปดูดเลือดกลับมา Mana เยอะ', base: { int: 3 }, mod: { matk: 14, maxRes: 20, spellVamp: 0.1 } },
  { id: 'u_titanheart', slot: 'armor', name: 'หัวใจไททัน', icon: '💗', price: 0, slots: 1, unique: { dg: 'd8' },
    desc: 'เลือดล้น ถึกทน ไม่ติดสถานะง่าย', base: { vit: 4 }, mod: { maxHp: 80, tenacity: 0.1 }, pct: { maxHp: 0.15 } },
]

/** Final-boss drop pools, 2-3 uniques per dungeon (shared across neighbours). */
export const UNIQUE_DROPS: Record<string, string[]> = {
  d1: ['u_halo', 'u_glasscrown'],
  d2: ['u_bloodfang', 'u_ghostcloak'],
  d3: ['u_berserkaxe', 'u_mirrorshield', 'u_bloodfang'],
  d4: ['u_titanheart', 'u_ghostcloak', 'u_halo'],
  d5: ['u_soulstaff', 'u_glasscrown', 'u_hawkeye'],
  d6: ['u_cactus', 'u_hawkeye', 'u_titanheart'],
  d7: ['u_mirrorshield', 'u_soulstaff', 'u_cactus'],
  d8: ['u_berserkaxe', 'u_glasscrown', 'u_titanheart'],
  d9: ['u_hawkeye', 'u_bloodfang', 'u_ghostcloak'],
  d10: ['u_halo', 'u_cactus', 'u_soulstaff'],
}

export type UniqueDrop =
  | { kind: 'none' }
  | { kind: 'new'; id: string }
  | { kind: 'dupe'; id: string; mats: Record<string, number> }

/** One final-boss kill of dungeon `dg`. `owned` = ids the player already has (plus any dropped earlier in this run).
 * A duplicate pays that dungeon's boss materials, NEVER zeny. `rnd` is injectable for tests. */
/** hard = 🔥 hard, 'hell' = 😈 hell mode (hell.ts HELL_MODE.uniqueRate). */
export function rollUniqueDrop(dg: string, hard: boolean | 'hell', owned: readonly string[], rnd: () => number = Math.random): UniqueDrop {
  const pool = UNIQUE_DROPS[dg]
  if (!pool?.length || rnd() >= (hard === 'hell' ? HELL_MODE.uniqueRate : hard ? UNIQUE.dropRateHard : UNIQUE.dropRate)) return { kind: 'none' }
  const id = pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))]
  return owned.includes(id) ? { kind: 'dupe', id, mats: { [matOf(dg, true)]: UNIQUE.dupeBoss } } : { kind: 'new', id }
}
