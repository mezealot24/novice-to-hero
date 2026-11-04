// ===== พร v2 (Q 2026-11-04, design/skills-v2.md): in-run picks = Trigger x Effect, 4 rarities, a "+" level on every card. =====
// Common (9 lines) and legendary cards come from level-ups; mythic = mini-boss pick (data/relics.ts); immortal = events only.
// Numbers are [base, +] pairs: the value the card has at level 1 and at level 2 (picking it again = "+").
// BattleScene owns the behaviour: proc hooks (procs()), damage source tags (Src) and the run-only PerkStats.
import { COMMON_PERKS, type Stats } from './game-data'
import type { JobId } from './jobs'

export type Line = 'storm' | 'fire' | 'ice' | 'holy' | 'venom' | 'guard' | 'life' | 'weapon' | 'focus' | 'common'
export type Rarity = 'common' | 'legend'
/** When a proc card fires. `hits` = every N basic/combo hits (run counter), `lowHp` = first drop under 30% HP in a fight. */
export type Trigger = 'turn' | 'every2' | 'fightStart' | 'basic' | 'hits' | 'ult' | 'counter' | 'hurt' | 'lowHp' | 'kill'
export type Effect = 'zap' | 'fireball' | 'firewave' | 'icespike' | 'icewave' | 'spear' | 'poison' | 'shield' | 'heal' | 'regen' | 'res'
/** Damage source tag (style-switch mythics and masteries multiply by it). */
export type Src = 'basic' | 'combo' | 'counter' | 'skill' | 'ult' | 'zap' | 'fire' | 'ice' | 'spear' | 'poison' | 'light' | 'other'
export const ELEM_SRC: ReadonlySet<Src> = new Set<Src>(['zap', 'fire', 'ice', 'spear', 'poison', 'light'])

type Two = [number, number]
export interface Proc {
  on: Trigger
  on2?: Trigger // the "+" level fires on this trigger instead (ลมหนาว / หอกรายเทิร์น: every 2 turns -> every turn)
  fx: Effect
  every?: Two // hits: every N hits
  chance?: Two // basic / hurt: chance per trigger
  count?: Two // zaps, fireballs, waves, spears, poison stacks
  amt?: Two // shield / heal share of max HP · Mana/Energy/Rage
  pow?: number // damage x magic power (default PROC_POW)
  burn?: Two // burn stacks a fire effect adds (default 1)
  freeze2?: boolean // "+" level: chilled normal monsters freeze for sure
}
/** Default damage of each effect, x magic power (Pm = 70% M.ATK + 30% P.ATK). */
export const PROC_POW: Partial<Record<Effect, number>> = { zap: 0.3, fireball: 1.0, firewave: 0.5, icespike: 0.5, icewave: 0.4 }
export const PROC_RULES = {
  burnTurns: 3, chillTurns: 2, freezeBase: 0.1, lowHpAt: 0.3, regenTurns: 3, spearShield: 0.03,
  /** Mage pays Mana for magic procs (spec default): per zap, per fire / ice effect */
  mageZap: 2, mageFire: 8, mageIce: 4,
}
/** Level-up offer: each of the 3 line slots comes from the job's own lines (JOB_LINES) this often, else from any line.
 *  พร v2 tuning: magic cards run on 70/30 magic power, so a physical job drew too many weak cards from a fully random pool. */
export const OFFER_RULES = { ownLine: 0.5, lean: 0.6 }

/** Run-only numbers the cards add (Stats stays the persistent hero sheet). */
export interface PerkStats {
  vsBurn: number; vsPoison: number; vsChill: number; chillWeak: number; spearShield: number
  basicDmg: number; counterDmg: number; overheal: number; fireStacks: number
  chain: number; zapCharge: number; execute: number; freeze: number; chillExtra: number; spearBurn: number
  harden: number; hardenCap: number; comboAtk: number; comboAtkCap: number; veteran: number; veteranCap: number
  openUlt: number; resTurn: number
}
export const newPerkStats = (): PerkStats => ({
  vsBurn: 0, vsPoison: 0, vsChill: 0, chillWeak: 0, spearShield: 0, basicDmg: 0, counterDmg: 0, overheal: 0, fireStacks: 0,
  chain: 0, zapCharge: 0, execute: 0, freeze: 0, chillExtra: 0, spearBurn: 0,
  harden: 0, hardenCap: 0, comboAtk: 0, comboAtkCap: 0, veteran: 0, veteranCap: 0, openUlt: 0, resTurn: 0,
})

export interface PerkDef {
  id: string; line: Line; rarity: Rarity; icon: string; name: string
  desc: [string, string] // base / + text ('{ult}' = the job's ult name)
  max: number // 2 = has a "+", 1 = single, 99 = general cards (stack forever)
  proc?: Proc
  mod?: [Partial<Stats>, Partial<Stats>] // full value at level 1 / level 2
  pk?: [Partial<PerkStats>, Partial<PerkStats>]
  mastery?: { src: Src; amp: Two; cut: Two } // "X +amp, every other damage -cut"
  needsRes?: boolean // only for jobs with a resource
}

export const LINES: Record<Line, { name: string; icon: string; color: string }> = {
  storm: { name: 'สายฟ้า', icon: '⚡', color: '#bfe6ff' },
  fire: { name: 'ไฟ', icon: '🔥', color: '#ff8c42' },
  ice: { name: 'น้ำแข็ง', icon: '❄️', color: '#9fe3ff' },
  holy: { name: 'แสง', icon: '✨', color: '#f6e27a' },
  venom: { name: 'พิษ', icon: '☠️', color: '#a77be0' },
  guard: { name: 'ป้องกัน', icon: '🛡️', color: '#5fa8d3' },
  life: { name: 'ชีวิต', icon: '💚', color: '#6fd08c' },
  weapon: { name: 'อาวุธ', icon: '⚔️', color: '#f2b84b' },
  focus: { name: 'สมาธิ', icon: '💢', color: '#ff6b7a' },
  common: { name: 'ทั่วไป', icon: '⭐', color: '#c9c9d6' },
}
/** Lines that count as the job's own (others get the 🌀 พรต่างสาย label; every line can still roll). */
export const JOB_LINES: Record<JobId, Line[]> = {
  novice: ['weapon', 'guard', 'life', 'fire', 'venom', 'focus'],
  swordsman: ['guard', 'life', 'weapon', 'focus'],
  archer: ['weapon', 'focus', 'guard'], // พร v2 tuning: ⚡ is magic (70/30), so it is no longer an Archer line
  mage: ['fire', 'storm', 'ice', 'focus'],
  cleric: ['holy', 'guard', 'focus', 'weapon'], // v62: Priest is a melee hybrid (v58) and already heals; holy/guard/life alone timed out on D4-5 bosses
  thief: ['venom', 'weapon', 'life'],
}
/** Mage's basic attack is magic: on-hit poison and lifesteal cards never work for it. */
export const MAGE_SKIP = new Set(['ven_coat', 'lif_steal'])

const c = (id: string, line: Line, icon: string, name: string, desc: [string, string], o: Partial<PerkDef>): PerkDef =>
  ({ id, line, rarity: 'common', icon, name, desc, max: 2, ...o })
const L = (id: string, line: Line, icon: string, name: string, desc: [string, string], o: Partial<PerkDef>): PerkDef =>
  ({ id, line, rarity: 'legend', icon, name, desc, max: 2, ...o })

export const PERKS_V2: PerkDef[] = [
  // ---------- ⚡ storm ----------
  c('stm_roar', 'storm', '⚡', 'ฟ้าคำราม', ['ทุกเทิร์นผ่าสายฟ้า 3 ครั้ง (ครั้งละ 0.3x พลังเวท สุ่มเป้า)', 'ทุกเทิร์นผ่าสายฟ้า 5 ครั้ง'], { proc: { on: 'turn', fx: 'zap', count: [3, 5] } }),
  c('stm_open', 'storm', '🌩️', 'ฟ้าเปิดศึก', ['เริ่มทุกไฟต์ ผ่าสายฟ้า 4 ครั้ง', 'เริ่มทุกไฟต์ ผ่าสายฟ้า 7 ครั้ง'], { proc: { on: 'fightStart', fx: 'zap', count: [4, 7] } }),
  c('stm_hits', 'storm', '⚡', 'ฟ้าตามฮิต', ['ทุก 4 ฮิต (ตีปกติ/คอมโบ) ผ่าสายฟ้า 1 ครั้ง', 'ทุก 3 ฮิต ผ่าสายฟ้า 1 ครั้ง'], { proc: { on: 'hits', fx: 'zap', every: [4, 3], count: [1, 1] } }),
  c('stm_ult', 'storm', '🌩️', 'ท่าไม้ตายเรียกฟ้า', ['ใช้{ult}แล้ว ผ่าสายฟ้า 3 ครั้ง', 'ใช้{ult}แล้ว ผ่าสายฟ้า 5 ครั้ง'], { proc: { on: 'ult', fx: 'zap', count: [3, 5] } }),
  c('stm_arm', 'storm', '🗡️', 'อาวุธอสนี', ['ตีธรรมดา 25% ผ่าสายฟ้า 2 ครั้ง', 'ตีธรรมดา 40% ผ่าสายฟ้า 2 ครั้ง'], { proc: { on: 'basic', fx: 'zap', chance: [0.25, 0.4], count: [2, 2] } }),
  // ---------- 🔥 fire ----------
  c('fir_ball', 'fire', '🔥', 'ลูกไฟ', ['ทุกตีที่ 3 ยิงลูกไฟ 1.5x พลังเวท + ไฟลุก', 'ทุกตีที่ 2 ยิงลูกไฟ'], { proc: { on: 'hits', fx: 'fireball', every: [3, 2], pow: 1.5 } }),
  c('fir_orbit', 'fire', '☄️', 'วงไฟหมุน', ['ทุกเทิร์นยิงลูกไฟ 1 ลูก (1x พลังเวท + ไฟลุก)', 'ทุกเทิร์นยิงลูกไฟ 2 ลูก'], { proc: { on: 'turn', fx: 'fireball', count: [1, 2] } }),
  c('fir_rain', 'fire', '🌋', 'ฝนไฟ', ['เริ่มทุกไฟต์ คลื่นไฟใส่ทุกตัว + ไฟลุก 2 stack', 'เริ่มทุกไฟต์ คลื่นไฟ + ไฟลุก 3 stack'], { proc: { on: 'fightStart', fx: 'firewave', burn: [2, 3] } }),
  c('fir_armor', 'fire', '🔥', 'เกราะเพลิง', ['โดนตี 30% ยิงลูกไฟใส่ตัวที่ตี', 'โดนตี 45% ยิงลูกไฟใส่ตัวที่ตี'], { proc: { on: 'hurt', fx: 'fireball', chance: [0.3, 0.45] } }),
  c('fir_ult', 'fire', '🌋', 'ท่าไม้ตายเพลิง', ['ใช้{ult}แล้ว คลื่นไฟ 2 ระลอก', 'ใช้{ult}แล้ว คลื่นไฟ 3 ระลอก'], { proc: { on: 'ult', fx: 'firewave', count: [2, 3] } }),
  c('fir_fuel', 'fire', '🛢️', 'เชื้อเพลิง', ['ตีศัตรูที่ติดไฟแรงขึ้น +15%', 'ตีศัตรูที่ติดไฟแรงขึ้น +25%'], { pk: [{ vsBurn: 0.15 }, { vsBurn: 0.25 }] }),
  // ---------- ❄️ ice ----------
  c('ice_edge', 'ice', '❄️', 'คมน้ำแข็ง', ['ตีธรรมดา 25% เรียกหนามน้ำแข็ง (0.5x + เย็น ช้าลง 40%)', 'ตีธรรมดา 40% เรียกหนามน้ำแข็ง'], { proc: { on: 'basic', fx: 'icespike', chance: [0.25, 0.4] } }),
  c('ice_hits', 'ice', '🧊', 'หนามตามฮิต', ['ทุก 5 ฮิต เรียกหนามน้ำแข็ง', 'ทุก 4 ฮิต เรียกหนามน้ำแข็ง'], { proc: { on: 'hits', fx: 'icespike', every: [5, 4] } }),
  c('ice_wind', 'ice', '🌬️', 'ลมหนาว', ['ทุก 2 เทิร์น หนามน้ำแข็งใส่ทุกตัว (0.4x + เย็น)', 'ทุกเทิร์น หนามน้ำแข็งใส่ทุกตัว'], { proc: { on: 'every2', on2: 'turn', fx: 'icewave' } }),
  c('ice_ult', 'ice', '🏔️', 'ท่าไม้ตายเหมันต์', ['ใช้{ult}แล้ว หนามน้ำแข็งใส่ทุกตัว (0.6x + เย็น)', 'ใช้{ult}แล้ว หนามทุกตัว + ตัวที่เย็นอยู่แช่แข็งแน่นอน (ไม่ใช่บอส)'], { proc: { on: 'ult', fx: 'icewave', pow: 0.6, freeze2: true } }),
  c('ice_brittle', 'ice', '💎', 'เปราะน้ำแข็ง', ['ศัตรูที่เย็นอยู่รับดาเมจ +15%', 'ศัตรูที่เย็นอยู่รับดาเมจ +25%'], { pk: [{ vsChill: 0.15 }, { vsChill: 0.25 }] }),
  c('ice_bite', 'ice', '🥶', 'กัดเย็น', ['ศัตรูที่เย็นอยู่ตีเบาลง 15%', 'ศัตรูที่เย็นอยู่ตีเบาลง 25%'], { pk: [{ chillWeak: 0.15 }, { chillWeak: 0.25 }] }),
  // ---------- ✨ holy ----------
  c('hol_dawn', 'holy', '🌅', 'หอกรุ่งอรุณ', ['เริ่มทุกไฟต์ได้หอกแสง 3 เล่ม (เล่มละ 0.3x พลังเวท ทุกตัว ยิงท้ายเทิร์น)', 'เริ่มทุกไฟต์ได้หอกแสง 5 เล่ม'], { proc: { on: 'fightStart', fx: 'spear', count: [3, 5] } }),
  c('hol_turn', 'holy', '🔱', 'หอกรายเทิร์น', ['ทุก 2 เทิร์นได้หอกแสง 1 เล่ม', 'ทุกเทิร์นได้หอกแสง 1 เล่ม'], { proc: { on: 'every2', on2: 'turn', fx: 'spear', count: [1, 1] } }),
  c('hol_ctr', 'holy', '🔱', 'หอกสวนกลับ', ['สวนกลับแล้วได้หอกแสง 1 เล่ม', 'สวนกลับแล้วได้หอกแสง 2 เล่ม'], { proc: { on: 'counter', fx: 'spear', count: [1, 2] } }),
  c('hol_ult', 'holy', '🌟', 'หอกท่าไม้ตาย', ['ใช้{ult}แล้วได้หอกแสง 2 เล่ม', 'ใช้{ult}แล้วได้หอกแสง 3 เล่ม'], { proc: { on: 'ult', fx: 'spear', count: [2, 3] } }),
  c('hol_guard', 'holy', '🛡️', 'หอกคุ้มกาย', ['หอกแสงแต่ละเล่ม 20% ได้โล่ 3% HP', 'หอกแสงแต่ละเล่ม 30% ได้โล่ 3% HP'], { pk: [{ spearShield: 0.2 }, { spearShield: 0.3 }] }),
  c('hol_warm', 'holy', '💛', 'แสงอุ่น', ['ฮีลแรง +20%', 'ฮีลแรง +35%'], { mod: [{ healAmp: 0.2 }, { healAmp: 0.35 }] }),
  // ---------- ☠️ venom ----------
  c('ven_coat', 'venom', '🧪', 'เคลือบพิษ', ['ทุกฮิตกายภาพติดพิษ 1 stack', 'ทุกฮิตกายภาพติดพิษ 2 stack'], { mod: [{ poison: 1 }, { poison: 2 }] }),
  c('ven_strong', 'venom', '☠️', 'พิษเข้มข้น', ['พิษแรง +2 ต่อ stack', 'พิษแรง +4 ต่อ stack'], { mod: [{ poisonDmg: 2 }, { poisonDmg: 4 }] }),
  c('ven_brew', 'venom', '⚗️', 'นักปรุงยา', ['ตีศัตรูที่ติดพิษแรงขึ้น +20%', 'ตีศัตรูที่ติดพิษแรงขึ้น +35%'], { pk: [{ vsPoison: 0.2 }, { vsPoison: 0.35 }] }),
  c('ven_ult', 'venom', '💀', 'ท่าไม้ตายพิษ', ['ใช้{ult}แล้ว ศัตรูทุกตัวติดพิษ 3 stack', 'ใช้{ult}แล้ว ศัตรูทุกตัวติดพิษ 5 stack'], { proc: { on: 'ult', fx: 'poison', count: [3, 5] } }),
  c('ven_thorn', 'venom', '🌵', 'หนามพิษ', ['โดนตีแล้ว คนตีติดพิษ 2 stack', 'โดนตีแล้ว คนตีติดพิษ 3 stack'], { proc: { on: 'hurt', fx: 'poison', count: [2, 3] } }),
  // ---------- 🛡️ guard ----------
  c('grd_open', 'guard', '🛡️', 'โล่เปิดศึก', ['เริ่มทุกไฟต์ได้โล่ 10% HP', 'เริ่มทุกไฟต์ได้โล่ 15% HP'], { proc: { on: 'fightStart', fx: 'shield', amt: [0.1, 0.15] } }),
  c('grd_ult', 'guard', '🛡️', 'โล่ท่าไม้ตาย', ['ใช้{ult}แล้วได้โล่ 10% HP', 'ใช้{ult}แล้วได้โล่ 15% HP'], { proc: { on: 'ult', fx: 'shield', amt: [0.1, 0.15] } }),
  c('grd_basic', 'guard', '🔰', 'โล่ตีธรรมดา', ['ตีธรรมดา 15% ได้โล่ 4% HP', 'ตีธรรมดา 25% ได้โล่ 4% HP'], { proc: { on: 'basic', fx: 'shield', chance: [0.15, 0.25], amt: [0.04, 0.04] } }),
  c('grd_low', 'guard', '🆘', 'โล่คับขัน', ['HP ต่ำกว่า 30% ครั้งแรกในไฟต์ ได้โล่ 25% HP', 'HP ต่ำกว่า 30% ได้โล่ 35% HP'], { proc: { on: 'lowHp', fx: 'shield', amt: [0.25, 0.35] } }),
  c('grd_tough', 'guard', '🪨', 'แกร่ง', ['รับดาเมจน้อยลง 12%', 'รับดาเมจน้อยลง 20%'], { mod: [{ guard: 0.12 }, { guard: 0.2 }] }),
  c('grd_hp', 'guard', '🐘', 'หนังหนา', ['HP สูงสุด +60', 'HP สูงสุด +110'], { mod: [{ maxHp: 60 }, { maxHp: 110 }] }),
  // ---------- 💚 life ----------
  c('lif_breath', 'life', '🍃', 'ลมหายใจ', ['ฟื้น HP 1.5% ทุกเทิร์น', 'ฟื้น HP 2.5% ทุกเทิร์น'], { mod: [{ regen: 1 }, { regen: 5 / 3 }] }),
  c('lif_hits', 'life', '💗', 'ฮิตฟื้นกาย', ['ทุก 4 ฮิต ฟื้น HP 3%', 'ทุก 3 ฮิต ฟื้น HP 4%'], { proc: { on: 'hits', fx: 'heal', every: [4, 3], amt: [0.03, 0.04] } }),
  c('lif_low', 'life', '🌱', 'ฟื้นยามคับขัน', ['HP ต่ำกว่า 30% ครั้งแรกในไฟต์ ฟื้น 8%/เทิร์น 3 เทิร์น', 'HP ต่ำกว่า 30% ฟื้น 12%/เทิร์น 3 เทิร์น'], { proc: { on: 'lowHp', fx: 'regen', amt: [0.08, 0.12] } }),
  c('lif_ult', 'life', '💖', 'ท่าไม้ตายฟื้นกาย', ['ใช้{ult}แล้วฟื้น HP 5%', 'ใช้{ult}แล้วฟื้น HP 8%'], { proc: { on: 'ult', fx: 'heal', amt: [0.05, 0.08] } }),
  c('lif_reap', 'life', '🌾', 'เก็บเกี่ยว', ['ล้มศัตรูแล้วฟื้น HP 3%', 'ล้มศัตรูแล้วฟื้น HP 5%'], { proc: { on: 'kill', fx: 'heal', amt: [0.03, 0.05] } }),
  c('lif_steal', 'life', '🩸', 'ดูดเลือด', ['ตีปกติ+คอมโบ ดูดเลือด 6% ของดาเมจ', 'ดูดเลือด 10% (เพดาน 40%)'], { mod: [{ lifesteal: 0.06 }, { lifesteal: 0.1 }] }),
  // ---------- ⚔️ weapon ----------
  c('wpn_eye', 'weapon', '🎯', 'ตาเหยี่ยว', ['โอกาสคริ +15%', 'โอกาสคริ +25%'], { mod: [{ crit: 0.15 }, { crit: 0.25 }] }),
  c('wpn_vital', 'weapon', '💥', 'จุดตาย', ['ดาเมจคริ +60%', 'ดาเมจคริ +100%'], { mod: [{ critMul: 0.6 }, { critMul: 1 }] }),
  c('wpn_flurry', 'weapon', '🌀', 'ฟันรัว', ['โอกาสคอมโบ +12%', 'โอกาสคอมโบ +20% (เพดาน 50%)'], { mod: [{ combo: 0.12 }, { combo: 0.2 }] }),
  c('wpn_ctr', 'weapon', '🤺', 'ท่าสวน', ['โอกาสสวนกลับ +15%', 'โอกาสสวนกลับ +24%'], { mod: [{ counter: 0.15 }, { counter: 0.24 }] }),
  c('wpn_heavy', 'weapon', '🔨', 'สวนหนัก', ['ดาเมจสวนกลับ +30%', 'ดาเมจสวนกลับ +50%'], { pk: [{ counterDmg: 0.3 }, { counterDmg: 0.5 }] }),
  c('wpn_drill', 'weapon', '🗡️', 'ฝึกตี', ['ตีปกติ (และคอมโบ) แรง +20%', 'ตีปกติแรง +35%'], { pk: [{ basicDmg: 0.2 }, { basicDmg: 0.35 }] }),
  c('wpn_quick', 'weapon', '💨', 'มือไว', ['ความเร็วเทิร์น +20%', 'ความเร็วเทิร์น +32%'], { mod: [{ aspd: 0.32 }, { aspd: 0.512 }] }),
  // ---------- 💢 focus ----------
  c('foc_calm', 'focus', '🧘', 'สมาธินิ่ง', ['{ult} คูลดาวน์ −1 เทิร์น · Flee +8', ''], { max: 1, mod: [{ smashCd: -1500, flee: 8 }, { smashCd: -1500, flee: 8 }] }),
  c('foc_bone', 'focus', '🦴', 'บดกระดูก', ['ดาเมจ{ult} +60%', 'ดาเมจ{ult} +100%'], { mod: [{ ultAmp: 0.6, smashMul: 1.8 }, { ultAmp: 1, smashMul: 3 }] }),
  c('foc_wake', 'focus', '🔋', 'ปลุกพลัง', ['เริ่มทุกไฟต์ Mana/Energy/Rage +25', 'เริ่มทุกไฟต์ +45'], { needsRes: true, proc: { on: 'fightStart', fx: 'res', amt: [25, 45] } }),
  c('foc_pray', 'focus', '🙏', 'ภาวนา', ['ทุกเทิร์น Mana/Energy/Rage +2', 'ทุกเทิร์น +4'], { needsRes: true, pk: [{ resTurn: 2 }, { resTurn: 4 }] }),

  // ---------- 🟠 legendary: offered only with a common card of the same line ----------
  L('stm_L1', 'storm', '🌩️', 'ฟ้าแตกแขนง', ['สายฟ้ามีโอกาส 35% ผ่าต่ออีก 1 ครั้ง (ไม่ต่อซ้ำ)', 'โอกาสผ่าต่อ 50%'], { pk: [{ chain: 0.35 }, { chain: 0.5 }] }),
  L('stm_L2', 'storm', '👑', 'เชี่ยวชาญอสนี', ['สายฟ้าจากพร +60% · ดาเมจอื่น −10%', 'สายฟ้าจากพร +90% · ดาเมจอื่น −15%'], { mastery: { src: 'zap', amp: [0.6, 0.9], cut: [0.1, 0.15] } }),
  L('stm_L3', 'storm', '🔋', 'ประจุสะสม', ['ทุก 10 ฮิตสายฟ้า ฮิตถัดไป x3 + ผลักเทิร์นเป้า', 'ทุก 7 ฮิตสายฟ้า'], { pk: [{ zapCharge: 10 }, { zapCharge: 7 }] }),
  L('fir_L1', 'fire', '👑', 'เชี่ยวชาญเพลิง', ['ไฟจากพร + ไฟลุก +60% · ดาเมจอื่น −10%', 'ไฟ +90% · ดาเมจอื่น −15%'], { mastery: { src: 'fire', amp: [0.6, 0.9], cut: [0.1, 0.15] } }),
  L('fir_L2', 'fire', '🔥', 'ไฟสามชั้น', ['ลูกไฟ/คลื่นไฟติดไฟลุก 3 stack แทน 1', 'ติดไฟลุก 4 stack'], { pk: [{ fireStacks: 3 }, { fireStacks: 4 }] }),
  L('ice_L1', 'ice', '☠️', 'สัมผัสมรณะ', ['หนามน้ำแข็งมีโอกาส 6% ประหารมอนธรรมดาที่ HP < 30%', 'โอกาสประหาร 10%'], { pk: [{ execute: 0.06 }, { execute: 0.1 }] }),
  L('ice_L2', 'ice', '🧊', 'หนาวลึก', ['หนามใส่ตัวที่เย็นอยู่ แช่แข็ง 25% (เดิม 10%) · เย็นนาน +1 เทิร์น', 'แช่แข็ง 35%'], { pk: [{ freeze: 0.25, chillExtra: 1 }, { freeze: 0.35, chillExtra: 1 }] }),
  L('hol_L1', 'holy', '👑', 'เชี่ยวชาญหอก', ['หอกแสง +60% · ดาเมจอื่น −10%', 'หอกแสง +90% · ดาเมจอื่น −15%'], { mastery: { src: 'spear', amp: [0.6, 0.9], cut: [0.1, 0.15] } }),
  L('hol_L2', 'holy', '🔥', 'หอกเพลิง', ['หอกแสงทุกเล่มติดไฟลุก 1 stack', 'ติดไฟลุก 2 stack'], { pk: [{ spearBurn: 1 }, { spearBurn: 2 }] }),
  L('ven_L1', 'venom', '🦠', 'โรคระบาด', ['มอนติดพิษตาย พิษครึ่งหนึ่งกระจายไปทุกตัว', ''], { max: 1, mod: [{ poisonSpread: 1 }, { poisonSpread: 1 }] }),
  L('ven_L2', 'venom', '👑', 'เชี่ยวชาญพิษ', ['พิษ +60% · ดาเมจอื่น −10%', 'พิษ +90% · ดาเมจอื่น −15%'], { mastery: { src: 'poison', amp: [0.6, 0.9], cut: [0.1, 0.15] } }),
  L('grd_L1', 'guard', '🏰', 'ยิ่งรบยิ่งแกร่ง', ['รับดาเมจน้อยลง +2% ทุกเทิร์น สูงสุด 20% ต่อไฟต์', '+3% ทุกเทิร์น สูงสุด 30%'], { pk: [{ harden: 0.02, hardenCap: 0.2 }, { harden: 0.03, hardenCap: 0.3 }] }),
  L('lif_L1', 'life', '💠', 'ฮีลล้นเป็นโล่', ['ฮีลที่เกิน HP เต็ม กลายเป็นโล่ สูงสุด 15% HP', 'สูงสุด 25% HP'], { pk: [{ overheal: 0.15 }, { overheal: 0.25 }] }),
  L('wpn_L1', 'weapon', '🌪️', 'เชี่ยวชาญคอมโบ', ['คอมโบ +10% · คอมโบต่อได้ +1 ฮิต · ทุกฮิตคอมโบ ATK +3% จนจบไฟต์ (สูงสุด +30%)', 'ทุกฮิตคอมโบ ATK +4% (สูงสุด +40%)'], { mod: [{ combo: 0.1, comboCount: 1 }, { combo: 0.1, comboCount: 1 }], pk: [{ comboAtk: 0.03, comboAtkCap: 0.3 }, { comboAtk: 0.04, comboAtkCap: 0.4 }] }),
  L('wpn_L2', 'weapon', '🎖️', 'ทหารผ่านศึก', ['ATK/M.ATK +3% ทุกเทิร์น สูงสุด +30% ต่อไฟต์', '+4% ทุกเทิร์น สูงสุด +40%'], { pk: [{ veteran: 0.03, veteranCap: 0.3 }, { veteran: 0.04, veteranCap: 0.4 }] }),
  L('foc_L1', 'focus', '💢', 'เปิดฉากเต็มแรง', ['{ult}ครั้งแรกในไฟต์ +100% · ครั้งต่อไป −25%', 'ครั้งแรก +150%'], { pk: [{ openUlt: 1 }, { openUlt: 1.5 }] }),
]

/** พร v2 numbers that gear refine lines + monster cards also give (Q 2026-11-04 grill: gear ~1/4 of the card, monster card ~1/2).
 *  In a run the hero uses card + gear/cards, capped at capMul x the card's "+" value, so stacking never runs away. */
export const OUTSIDE_KEYS = ['vsBurn', 'vsChill', 'vsPoison', 'chillWeak', 'spearShield', 'counterDmg', 'basicDmg', 'resTurn'] as const
export type OutsideKey = (typeof OUTSIDE_KEYS)[number]
export const OUTSIDE_RULES = { capMul: 2, uncapped: ['counterDmg'] as string[] } // Q 2026-11-04 17:51: "Counter Dmg ทะลุ Cap ได้"
export const OUTSIDE_CAP = Object.fromEntries(OUTSIDE_KEYS.map((k) =>
  [k, OUTSIDE_RULES.uncapped.includes(k) ? Infinity : OUTSIDE_RULES.capMul * Math.max(0, ...PERKS_V2.map((p) => p.pk?.[1]?.[k] ?? 0))])) as Record<OutsideKey, number>

/** ⭐ general cards (always the 4th slot): the v1 common cards, stack forever (ขนนกฟีนิกซ์ once per run). */
export const GENERAL_PERKS: PerkDef[] = COMMON_PERKS.map((p) => ({
  id: p.id, line: 'common', rarity: 'common', icon: '⭐', name: p.name, desc: [p.desc, p.desc], max: p.mod.revive ? 1 : 99, mod: [p.mod, p.mod],
}))
export const perkById = (id: string) => PERKS_V2.find((p) => p.id === id) ?? GENERAL_PERKS.find((p) => p.id === id)
/** Stat delta for taking a card to level `lv` (1 = base, 2 = "+"; general cards add their base every time). */
export function levelDelta<T extends object>(pair: [Partial<T>, Partial<T>] | undefined, lv: number, repeat: boolean): Partial<T> {
  if (!pair) return {}
  if (lv <= 1 || repeat) return pair[0]
  const out: Partial<T> = {}
  for (const k of Object.keys(pair[1]) as (keyof T)[]) out[k] = (((pair[1][k] as number) ?? 0) - ((pair[0][k] as number) ?? 0)) as T[keyof T]
  return out
}

// ---------- 🌈 immortal: events only, 1 per run (design/skills-v2.md §5) ----------
export type ImmortalId = 'angel' | 'demon' | 'egg'
export const IMMORTALS: Record<ImmortalId, { name: string; icon: string; desc: string }> = {
  angel: { name: 'พรนางฟ้า', icon: '👼', desc: '6 เทิร์นแรกของทุกไฟต์: ตีธรรมดาปล่อยแสงเพิ่ม 1x พลังเวท + ฟื้น HP 3%' },
  demon: { name: 'เงาปีศาจ', icon: '😈', desc: 'HP ต่ำกว่า 50% ครั้งแรกในไฟต์ → ร่างปีศาจจนจบไฟต์: ดาเมจ +50% · ตีธรรมดาติดพิษ 2 stack' },
  egg: { name: 'ไข่ทองคำ', icon: '🥚', desc: 'จบแต่ละห้อง: ATK / M.ATK / P.DEF +4% สะสม (สูงสุด 10 ครั้ง)' },
}
export const IMMORTAL_RULES = { angelTurns: 6, angelMul: 1, angelHeal: 0.03, demonAt: 0.5, demonDmg: 0.5, demonPoison: 2, demonHpCost: 0.2, eggStep: 0.04, eggMax: 10 }
