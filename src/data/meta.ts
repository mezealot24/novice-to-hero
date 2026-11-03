// ===== Out-of-run (meta) game data: races, base stats, equipment, costumes, top-up packs. =====
// Everything a run starts from is computed by heroStats(save). Balance knobs live here.
import { PLAYER, type Stats } from './game-data'
import { talentMods, treeMods, type TalentSave, type TreeSave } from './tree'
import { JOBS, type JobId } from './jobs'
import { cardById, type EquipCard } from './cards'
import { CRAFT_ITEMS, GRADE, gradeItem, type CraftInfo } from './craft'

// ---------- base stats (Q's spec, 2026-11-02): 7 stats, points from Base Level ----------
export type BaseStat = 'str' | 'vit' | 'wis' | 'dex' | 'int' | 'luk' | 'agi'
// Stat spec v1 (design/stat-system-v1.md, approved by Q 2026-11-02). Flat values grow per point;
// % values use x/(x+K) so they never reach 100%. heroStats() below applies exactly these.
export const PER_POINT = {
  str: { atk: 2, pskill: 0.005 },
  dex: { hit: 1, minPct: 0.005 },
  vit: { maxHp: 10, maxHpPct: 0.005, def: 0.5, regen: 0.02, counterK: 300 },
  int: { matk: 2, maxRes: 3 },
  wis: { healAmp: 0.01, shieldAmp: 0.01, mdefK: 150, resRegen: 0.05, tenacityK: 200 },
  agi: { aspdPct: 0.015, flee: 1, comboK: 120 },
  luk: { crit: 0.01 / 3, /* Q: every 3 LUK = +1% crit (only stat that gives crit) */ dodgeK: 300, legendPer: 0.0007, legendCap: 0.1, dropPct: 0.005, dropCap: 0.5, eventPer: 0.005, eventCap: 0.3 },
}
export const BASE_STATS: { id: BaseStat; name: string; role: string; desc: string }[] = [
  { id: 'str', name: 'STR', role: 'พลังกาย', desc: 'P.ATK สูงสุด +2 · ดาเมจสกิลกายภาพ +0.5%' },
  { id: 'vit', name: 'VIT', role: 'ความอึด', desc: 'HP +10 และ +0.5% · P.DEF +0.5 · ฟื้น HP เล็กน้อย · สวนกลับนิดหน่อย' },
  { id: 'wis', name: 'WIS', role: 'ใจแข็ง', desc: 'ฮีล/โล่แรง +1% · M.DEF% · ต้านทาน (tenacity) · ฟื้นมานา' },
  { id: 'dex', name: 'DEX', role: 'ความแม่น', desc: 'Hit +1 · P.ATK ขั้นต่ำ +0.5% (ดาเมจนิ่งขึ้น)' },
  { id: 'int', name: 'INT', role: 'เวทมนตร์', desc: 'M.ATK +2 · Max Mana +3' },
  { id: 'luk', name: 'LUK', role: 'ดวง', desc: 'คริ +1% ต่อ 3 LUK · หลบโชคดี · พรตำนาน · อีเวนต์หายาก · ดรอปหายาก' },
  { id: 'agi', name: 'AGI', role: 'ความเร็ว', desc: 'ความเร็วเทิร์น +1.5% (ได้ตีบ่อยขึ้น) · Flee +1 · คอมโบ (ตีซ้ำ)' },
]
export const RESOURCES = {
  mana: { name: 'Mana', color: 0x5aa0ff, desc: 'ฟื้นเองตามเวลา (INT ช่วยให้ฟื้นไวขึ้น)' },
  rage: { name: 'Rage', color: 0xff5a4e, desc: 'ได้จากการตีและโดนตี ค่อยๆ ลดเมื่อไม่สู้' },
  energy: { name: 'Energy', color: 0xf2d24b, desc: 'ถังเล็ก ฟื้นไวคงที่' },
} as const
export const STAT_RULES = {
  start: 1, // every stat starts here (before race bonus)
  max: 99,
  pointsPerLevel: 3,
  baseXpNeed: (lv: number) => 25 + 15 * (lv - 1), // account EXP to go from lv to lv+1
  maxBaseLevel: 99,
}

// ---------- job + skills (Novice only for now; job change = M3) ----------
// Base Lv and Job Lv are separate (RO / Eden Eternal): Base Lv gives stat points, Job Lv gives skill points.
export const JOB_RULES = { maxJobLevel: 10, jobXpNeed: (lv: number) => 20 + 10 * (lv - 1), changeAt: 10 }
export type SkillId = 'smash' | 'firstaid' | 'tough'
export interface SkillDef { id: SkillId; name: string; icon: string; kind: 'active' | 'passive'; max: number; desc: (lv: number) => string; mod: (lv: number) => Partial<Stats> }
export const SKILLS: SkillDef[] = [
  { id: 'smash', name: 'ทุบ', icon: '💢', kind: 'active', max: 10, desc: (lv) => `ท่าไม้ตาย (กดเอง) ทุบทุกตัว คูลดาวน์ 4 เทิร์น แรง +${(lv - 1) * 15}%`, mod: (lv) => ({ smashMul: PLAYER.smashMul * 0.15 * (lv - 1) }) },
  { id: 'firstaid', name: 'ปฐมพยาบาล', icon: '🩹', kind: 'passive', max: 5, desc: (lv) => `ฟื้น HP ${(lv * 0.3).toFixed(1)}% ทุกเทิร์น (WIS ช่วยเพิ่ม)`, mod: (lv) => ({ regen: 0.2 * lv }) },
  { id: 'tough', name: 'ร่างกายแกร่ง', icon: '💪', kind: 'passive', max: 5, desc: (lv) => `HP สูงสุด +${lv * 12}`, mod: (lv) => ({ maxHp: 12 * lv }) },
]
// Certificate-style passive slots (Eden Eternal idea): open with Base Lv, filled after job change.
export const CERT_SLOTS_AT = [10, 20, 30, 40]

// ---------- races (placeholder: will be reshaped by the Eden Eternal / Trickster research) ----------
export type RaceId = 'human' | 'elf' | 'dwarf'
export interface Race { id: RaceId; name: string; icon: string; blurb: string; bonus: Partial<Record<BaseStat, number>>; trait: string; traitMod: Partial<Stats>; expMul: number }
export const RACES: Record<RaceId, Race> = {
  human: { id: 'human', name: 'มนุษย์', icon: '🧑', blurb: 'สายกลาง เก่งทุกอย่างนิดหน่อย โตไว', bonus: { str: 1, vit: 1, dex: 1, luk: 1 }, trait: 'ใฝ่รู้: EXP ที่ได้ +10%', traitMod: {}, expMul: 1.1 },
  elf: { id: 'elf', name: 'เอลฟ์', icon: '🧝', blurb: 'ว่องไว ตาไว แม่น แต่ตัวบาง', bonus: { agi: 2, int: 2, wis: 1, vit: -1 }, trait: 'สายตาพราน: Hit +6', traitMod: { hit: 6 }, expMul: 1 },
  dwarf: { id: 'dwarf', name: 'คนแคระ', icon: '🧔', blurb: 'ถึกทน ตีหนัก แต่ช้า', bonus: { str: 2, vit: 3, agi: -1 }, trait: 'กระดูกเหล็ก: P.DEF +8', traitMod: { def: 8 }, expMul: 1 },
}

// ---------- equipment (bought with zeny; nothing here is sold for real money) ----------
// Slot = what kind of item it is (shop tab, card type). EquipSlot = where it is worn: 6 places, two of them
// accessories (acc + acc2, both take 'acc' items). 'acc' keeps its old key so older saves still load.
export type Slot = 'weapon' | 'armor' | 'acc' | 'head' | 'offhand'
export type EquipSlot = Slot | 'acc2'
export const SLOTS: { id: Slot; name: string; icon: string }[] = [
  { id: 'weapon', name: 'อาวุธ', icon: '🗡️' },
  { id: 'offhand', name: 'มือรอง', icon: '🛡️' },
  { id: 'armor', name: 'เกราะ', icon: '🥋' },
  { id: 'head', name: 'หมวก', icon: '🪖' },
  { id: 'acc', name: 'ประดับ', icon: '💍' },
]
/** Equipment screen order: left column head / weapon / armor, right column off-hand / acc L / acc R. */
export const EQUIP_SLOTS: { id: EquipSlot; kind: Slot; name: string; icon: string }[] = [
  { id: 'head', kind: 'head', name: 'หมวก', icon: '🪖' },
  { id: 'weapon', kind: 'weapon', name: 'อาวุธ', icon: '🗡️' },
  { id: 'armor', kind: 'armor', name: 'ชุดเกราะ', icon: '🥋' },
  { id: 'offhand', kind: 'offhand', name: 'มือรอง', icon: '🛡️' },
  { id: 'acc', kind: 'acc', name: 'ประดับ (ซ้าย)', icon: '💍' },
  { id: 'acc2', kind: 'acc', name: 'ประดับ (ขวา)', icon: '💍' },
]
/** The empty item of each kind (weapon/armor always hold something). */
export const EMPTY_ITEM: Partial<Record<Slot, string>> = { acc: 'none', head: 'none_head', offhand: 'none_off' }
export const slotKind = (sl: EquipSlot): Slot => (sl === 'acc2' ? 'acc' : sl)
// Gear gives base stats (STR/VIT/...) that run through the stat spec like spent points, plus direct
// stats (Hit, Flee, Counter, Combo, lifesteal, shields...). One item per slot, so nothing stacks.
// jobs = who can wear it (none = everyone). req = when the shop sells it: 'job' after the first job change,
// 'd2' after beating ป่าหมาป่าเงา. Item ids are save data: never rename or remove one.
export type ItemReq = 'job' | 'd2' | 'd3' | 'd4'
export interface Item { id: string; slot: Slot; name: string; icon: string; price: number; desc: string; base?: Partial<Record<BaseStat, number>>; mod: Partial<Stats>; jobs?: JobId[]; req?: ItemReq; slots?: number; twoHand?: boolean; craft?: CraftInfo }
const SW: JobId[] = ['swordsman'], AR: JobId[] = ['archer'], MG: JobId[] = ['mage'], CL: JobId[] = ['cleric'], TH: JobId[] = ['thief']
export const ITEMS: Item[] = [
  // ----- weapons: everyone -----
  { id: 'knife', slot: 'weapon', name: 'มีดโนวิส', icon: '🔪', price: 0, desc: 'ของติดตัวตอนเริ่ม', mod: {} },
  { id: 'shortsword', slot: 'weapon', name: 'ดาบสั้น', icon: '🗡️', price: 80, desc: 'อาวุธพื้นฐาน ใช้ได้ทุกอาชีพ', mod: { atk: 5 } },
  { id: 'twinknife', slot: 'weapon', name: 'มีดคู่', icon: '⚔️', price: 220, desc: 'เบา ตีไว', base: { agi: 2 }, mod: { atk: 3, aspd: 0.32 } },
  { id: 'hammer', slot: 'weapon', name: 'ค้อนไม้โอ๊ก', icon: '🔨', price: 260, desc: 'ของโนวิส ทุบแรงขึ้น', base: { str: 1 }, mod: { atk: 6, smashMul: 1 } },
  { id: 'longsword', slot: 'weapon', name: 'ดาบยาว', icon: '🗡️', price: 420, desc: 'หนัก ตีแรงแต่ช้าลงนิด', base: { str: 2 }, mod: { atk: 10, pskill: 0.05, aspd: -0.15 } },
  { id: 'staff', slot: 'weapon', name: 'คทาฝึกหัด', icon: '🪄', price: 380, desc: 'คทาแรกของสายเวท', base: { int: 2 }, mod: { matk: 8, smashMul: 1 } },
  // ----- weapons: Swordsman (lifesteal / counter) -----
  { id: 'w_bloodblade', slot: 'weapon', name: 'ดาบกระหายเลือด', icon: '🩸', price: 520, desc: 'สายดูดเลือด ตียิ่งเยอะยิ่งอึด', base: { str: 3 }, mod: { atk: 8, lifesteal: 0.06 }, jobs: SW, req: 'job' },
  { id: 'w_guardblade', slot: 'weapon', name: 'ดาบผู้พิทักษ์', icon: '🛡️', price: 560, desc: 'สายแทงก์ โดนตีแล้วสวนกลับ', base: { vit: 3 }, mod: { atk: 5, def: 4, counter: 0.12 }, jobs: SW, req: 'job' },
  { id: 'w_berserkaxe', slot: 'weapon', name: 'ขวานคลั่งศึก', icon: '🪓', price: 1100, twoHand: true, desc: 'ของดัน 2 · อาวุธ 2 มือ (ใส่มือรองไม่ได้): ฟันพายุแรงขึ้น + ดูดเลือด', base: { str: 5 }, mod: { atk: 17, pskill: 0.15, lifesteal: 0.04 }, jobs: SW, req: 'd2' },
  // ----- weapons: Archer (crit -> shield / combo) -----
  { id: 'w_huntbow', slot: 'weapon', name: 'ธนูพราน', icon: '🏹', price: 520, desc: 'แม่นและคริบ่อย (คริ = ทะลุเกราะ โดนแน่)', base: { dex: 3 }, mod: { atk: 6, hit: 8, crit: 0.05 }, jobs: AR, req: 'job' },
  { id: 'w_hawkbow', slot: 'weapon', name: 'ธนูเหยี่ยวลม', icon: '🪶', price: 560, desc: 'ยิงรัว คริบ่อยขึ้น', base: { agi: 3 }, mod: { atk: 4, combo: 0.08, crit: 0.04 }, jobs: AR, req: 'job' },
  { id: 'w_starbow', slot: 'weapon', name: 'ธนูดาวตก', icon: '🌠', price: 1100, desc: 'ของดัน 2: คริแรงมาก', base: { dex: 5 }, mod: { atk: 10, critMul: 0.35, crit: 0.03 }, jobs: AR, req: 'd2' },
  // ----- weapons: Mage (M.ATK / Mana Shield) -----
  { id: 'w_gemstaff', slot: 'weapon', name: 'คทาอัญมณี', icon: '💎', price: 520, desc: 'สายตีแรง', base: { int: 3 }, mod: { matk: 10 }, jobs: MG, req: 'job' },
  { id: 'w_wardstaff', slot: 'weapon', name: 'คทาวงเวทป้องกัน', icon: '🔮', price: 560, desc: 'สาย Mana ยาว: Mana เยอะ ฟื้นไว ร่ายสกิลได้บ่อย', base: { wis: 3 }, mod: { matk: 5, maxRes: 30, resRegen: 1 }, jobs: MG, req: 'job' },
  { id: 'w_archstaff', slot: 'weapon', name: 'คทาจอมปราชญ์', icon: '🪄', price: 1100, desc: 'ของดัน 2: เวทแรง Mana ฟื้นไว', base: { int: 5 }, mod: { matk: 16, resRegen: 1 }, jobs: MG, req: 'd2' },
  // ----- weapons: Cleric (heal / shield) -----
  { id: 'w_holymace', slot: 'weapon', name: 'กระบองศักดิ์สิทธิ์', icon: '🔱', price: 520, desc: 'ฮีลแรงขึ้น', base: { wis: 3 }, mod: { atk: 4, matk: 6, healAmp: 0.15 }, jobs: CL, req: 'job' },
  { id: 'w_lightbook', slot: 'weapon', name: 'คัมภีร์แสง', icon: '📖', price: 560, desc: 'โล่หนา ฟื้น HP ทุกเทิร์น', base: { int: 2, wis: 1 }, mod: { matk: 4, shieldAmp: 0.15, regen: 0.5 }, jobs: CL, req: 'job' },
  { id: 'w_sunmace', slot: 'weapon', name: 'ค้อนตะวัน', icon: '☀️', price: 1100, desc: 'ของดัน 2: ได้โล่ทุกเวฟ', base: { wis: 5 }, mod: { matk: 10, healAmp: 0.15, waveShield: 0.06 }, jobs: CL, req: 'd2' },
  // ----- weapons: Thief (poison / dodge) -----
  { id: 'w_venomdagger', slot: 'weapon', name: 'กริชพิษ', icon: '🧪', price: 520, desc: 'พิษติดเยอะขึ้น', base: { agi: 2 }, mod: { atk: 6, poison: 1, poisonDmg: 1 }, jobs: TH, req: 'job' },
  { id: 'w_shadowdagger', slot: 'weapon', name: 'มีดเงา', icon: '🌑', price: 560, desc: 'หลบแล้วได้ฟื้น HP', base: { luk: 3 }, mod: { atk: 5, flee: 6, dodgeHeal: 0.03 }, jobs: TH, req: 'job' },
  { id: 'w_twinfang', slot: 'weapon', name: 'เขี้ยวงูคู่', icon: '🐍', price: 1100, desc: 'ของดัน 2: แทงรัว คริบ่อย', base: { agi: 5 }, mod: { atk: 9, combo: 0.1, crit: 0.05 }, jobs: TH, req: 'd2' },
  // ----- armor -----
  { id: 'cloth', slot: 'armor', name: 'เสื้อผ้าฝ้าย', icon: '👕', price: 0, desc: 'ของติดตัวตอนเริ่ม', mod: {} },
  { id: 'leather', slot: 'armor', name: 'เสื้อหนัง', icon: '🦺', price: 90, desc: 'เกราะพื้นฐาน ใช้ได้ทุกอาชีพ', mod: { maxHp: 30, def: 5 } },
  { id: 'robe', slot: 'armor', name: 'เสื้อคลุมนักเวท', icon: '🧥', price: 240, desc: 'กันเวท ฟื้น Mana', base: { wis: 1 }, mod: { maxHp: 15, mdef: 0.1, resRegen: 1 } },
  { id: 'chain', slot: 'armor', name: 'เกราะโซ่', icon: '⛓️', price: 450, desc: 'หนา ทนตีกายภาพ', base: { vit: 2 }, mod: { maxHp: 60, def: 15 } },
  { id: 'a_plate', slot: 'armor', name: 'เกราะเหล็กหนัก', icon: '🛡️', price: 700, desc: 'ถึกสุด แต่ช้าลงนิด', base: { vit: 4 }, mod: { maxHp: 80, def: 20, counter: 0.06, aspd: -0.08 }, jobs: ['swordsman', 'cleric'], req: 'job' },
  { id: 'a_thornmail', slot: 'armor', name: 'เกราะหนามเลือด', icon: '🌹', price: 750, desc: 'ดูดเลือด + สวนกลับ', base: { str: 2 }, mod: { maxHp: 50, def: 10, lifesteal: 0.04, counter: 0.05 }, jobs: SW, req: 'job' },
  { id: 'a_huntvest', slot: 'armor', name: 'เสื้อนักล่า', icon: '🥾', price: 650, desc: 'เบา หลบง่าย ตีซ้ำได้', base: { agi: 3 }, mod: { maxHp: 30, flee: 6, combo: 0.05 }, jobs: ['archer', 'thief'], req: 'job' },
  { id: 'a_eaglecloak', slot: 'armor', name: 'ผ้าคลุมตาเหยี่ยว', icon: '🦅', price: 700, desc: 'แม่นขึ้น หลบเก่งขึ้น', base: { dex: 3 }, mod: { maxHp: 35, hit: 6, flee: 5 }, jobs: AR, req: 'job' },
  { id: 'a_sagerobe', slot: 'armor', name: 'เสื้อคลุมปราชญ์', icon: '🧙', price: 650, desc: 'กันเวท Mana เยอะ', base: { wis: 3 }, mod: { maxHp: 30, mdef: 0.08, maxRes: 20, resRegen: 1 }, jobs: ['mage', 'cleric'], req: 'job' },
  { id: 'a_runerobe', slot: 'armor', name: 'เสื้อคลุมรูน', icon: '🌀', price: 750, desc: 'ตัวหนาขึ้น กันเวท Mana เยอะ', base: { int: 3 }, mod: { maxHp: 55, maxRes: 20, mdef: 0.06 }, jobs: MG, req: 'job' },
  { id: 'a_lightvestment', slot: 'armor', name: 'อาภรณ์แสง', icon: '🕊️', price: 700, desc: 'ได้โล่ทุกเวฟ ฮีลแรงขึ้น', base: { wis: 2, vit: 2 }, mod: { maxHp: 50, healAmp: 0.1, waveShield: 0.05 }, jobs: CL, req: 'job' },
  { id: 'a_nightsuit', slot: 'armor', name: 'ชุดจอมโจรราตรี', icon: '🌒', price: 700, desc: 'หลบเก่ง หลบแล้วฟื้น HP', base: { luk: 3 }, mod: { maxHp: 30, flee: 8, luckyDodge: 0.03, dodgeHeal: 0.02 }, jobs: TH, req: 'job' },
  // ----- accessories: everyone (pick the one stat your build needs) -----
  { id: 'none', slot: 'acc', name: 'ว่าง', icon: '▫️', price: 0, desc: 'ยังไม่ใส่อะไร', mod: {} },
  { id: 'clover', slot: 'acc', name: 'แหวนใบโคลเวอร์', icon: '🍀', price: 150, desc: 'ดวงดี', base: { luk: 1 }, mod: { crit: 0.06, dropChance: 0.03 } },
  { id: 'owl', slot: 'acc', name: 'ต่างหูนกฮูก', icon: '🦉', price: 200, desc: 'ตาไว ตีไม่ค่อยพลาด', base: { dex: 2 }, mod: { hit: 8 } },
  { id: 'turtle', slot: 'acc', name: 'เข็มกลัดเต่า', icon: '🐢', price: 320, desc: 'ฟื้น HP ช้าๆ ทุกเทิร์น', base: { vit: 1 }, mod: { regen: 0.7 } },
  { id: 'r_stone', slot: 'acc', name: 'สร้อยหินผา', icon: '🪨', price: 340, desc: 'มึนน้อยลงตอนบอสทุบ กันเวท', base: { wis: 1 }, mod: { tenacity: 0.15, mdef: 0.05 } },
  { id: 'r_feather', slot: 'acc', name: 'ขนนกเบา', icon: '🪽', price: 360, desc: 'หลบเก่ง หลบแล้วฟื้นนิด', base: { agi: 1 }, mod: { flee: 8, dodgeHeal: 0.015 } },
  { id: 'r_fist', slot: 'acc', name: 'แหวนสวนหมัด', icon: '🥊', price: 380, desc: 'สวนกลับบ่อยขึ้น', base: { vit: 1 }, mod: { counter: 0.1 } },
  { id: 'r_beads', slot: 'acc', name: 'ลูกประคำ', icon: '📿', price: 380, desc: 'ฮีลและโล่แรงขึ้น', base: { wis: 1 }, mod: { healAmp: 0.1, shieldAmp: 0.1 } },
  { id: 'r_wind', slot: 'acc', name: 'กำไลลมกรด', icon: '🌪️', price: 400, desc: 'คอมโบ ตีซ้ำบ่อยขึ้น', base: { agi: 2 }, mod: { combo: 0.08 } },
  { id: 'r_mana', slot: 'acc', name: 'จี้มานา', icon: '🔷', price: 420, desc: 'Mana เยอะ ฟื้นไว (อาชีพที่ใช้ Mana)', base: { int: 2 }, mod: { maxRes: 20, resRegen: 1 }, req: 'job' },
  { id: 'fang', slot: 'acc', name: 'สร้อยเขี้ยวหมาป่า', icon: '🦷', price: 480, desc: 'ดูดเลือด', mod: { lifesteal: 0.05, atk: 3 } },
  { id: 'r_alphafang', slot: 'acc', name: 'เขี้ยวจ่าฝูงเงา', icon: '🐺', price: 1200, desc: 'ของดัน 2: ทุกค่าสถานะ +2', base: { str: 2, vit: 2, wis: 2, dex: 2, int: 2, luk: 2, agi: 2 }, mod: { crit: 0.03 }, req: 'd2' },
  // ----- Dungeon 4-5 prep: resist the new debuffs (design/dungeon-4-5-brutal.md) -----
  { id: 'r_amulet', slot: 'acc', name: 'เครื่องรางล้างพิษ', icon: '🧿', price: 1600, desc: 'ของดัน 3: กันสถานะผิดปกติ (เตรียมลุยบึงพิษ)', base: { vit: 2, wis: 2 }, mod: { debuffRes: 0.35, maxHp: 40, mdef: 0.04 }, req: 'd3' },
  { id: 'r_hydraheart', slot: 'acc', name: 'หัวใจไฮดรา', icon: '💚', price: 2600, desc: 'ของดัน 4: ทุกค่าสถานะ +3 · ฟื้น HP ทุกเทิร์น · กันสถานะผิดปกติ', base: { str: 3, vit: 3, wis: 3, dex: 3, int: 3, luk: 3, agi: 3 }, mod: { regen: 0.5, debuffRes: 0.25 }, req: 'd4' },
  // ----- headgear (equipment screen v1, design/equipment-screen-v1.md): lighter than armor -----
  { id: 'none_head', slot: 'head', name: 'ว่าง', icon: '▫️', price: 0, desc: 'ยังไม่ใส่หมวก', mod: {} },
  { id: 'h_bandana', slot: 'head', name: 'ผ้าโพกหัว', icon: '🎀', price: 120, desc: 'หมวกแรกของนักผจญภัย', mod: { maxHp: 15, def: 2 } },
  { id: 'h_cap', slot: 'head', name: 'หมวกนักผจญภัย', icon: '🧢', price: 260, desc: 'บังแดด ตาไว', base: { dex: 1 }, mod: { hit: 4, flee: 2 } },
  { id: 'h_ribbon', slot: 'head', name: 'โบว์ดวงดี', icon: '🎗️', price: 300, desc: 'ดวงดี คริบ่อย', base: { luk: 2 }, mod: { crit: 0.03, dropChance: 0.02 } },
  { id: 'h_helm', slot: 'head', name: 'หมวกเหล็ก', icon: '⛑️', price: 520, desc: 'หนา มึนน้อยลง', base: { vit: 2 }, mod: { maxHp: 35, def: 6, tenacity: 0.08 }, jobs: ['swordsman', 'cleric'], req: 'job' },
  { id: 'h_ranger', slot: 'head', name: 'หมวกพราน', icon: '🤠', price: 520, desc: 'เล็งแม่น คริบ่อย', base: { dex: 2 }, mod: { hit: 5, crit: 0.03 }, jobs: AR, req: 'job' },
  { id: 'h_witch', slot: 'head', name: 'หมวกแม่มดดาว', icon: '🎩', price: 520, desc: 'เวทแรงขึ้น Mana เยอะขึ้น', base: { int: 2 }, mod: { matk: 5, maxRes: 15 }, jobs: MG, req: 'job' },
  { id: 'h_halo', slot: 'head', name: 'รัศมีศักดิ์สิทธิ์', icon: '😇', price: 520, desc: 'ฮีลแรงขึ้น กันเวท', base: { wis: 2 }, mod: { healAmp: 0.06, mdef: 0.04 }, jobs: CL, req: 'job' },
  { id: 'h_hood', slot: 'head', name: 'ฮู้ดเงา', icon: '🥷', price: 520, desc: 'หลบเก่ง หลบโชคดี', base: { agi: 2 }, mod: { flee: 5, luckyDodge: 0.02 }, jobs: TH, req: 'job' },
  { id: 'h_crown', slot: 'head', name: 'มงกุฎวีรชน', icon: '👑', price: 1500, desc: 'ของดัน 3: ทุกค่าสถานะ +2', base: { str: 2, vit: 2, wis: 2, dex: 2, int: 2, luk: 2, agi: 2 }, mod: { maxHp: 30 }, req: 'd3' },
  // ----- off-hand: every class has its own kind (shield / quiver / orb / parrying dagger) -----
  { id: 'none_off', slot: 'offhand', name: 'ว่าง', icon: '▫️', price: 0, desc: 'มือรองว่าง', mod: {} },
  { id: 'o_buckler', slot: 'offhand', name: 'บัคเลอร์ไม้', icon: '🪵', price: 180, desc: 'โล่เบา ใช้ได้ทุกอาชีพ', mod: { maxHp: 15, def: 4 } },
  { id: 'o_ironshield', slot: 'offhand', name: 'โล่เหล็ก', icon: '🛡️', price: 420, desc: 'โล่หนัก ทนแต่ช้าลงนิด', base: { vit: 2 }, mod: { maxHp: 30, def: 8, counter: 0.04, aspd: -0.05 }, jobs: ['novice', 'swordsman', 'cleric'] },
  { id: 'o_holyshield', slot: 'offhand', name: 'โล่ศักดิ์สิทธิ์', icon: '✨', price: 560, desc: 'โล่แรงขึ้น กันเวท', base: { wis: 2 }, mod: { def: 5, shieldAmp: 0.1, mdef: 0.04 }, jobs: CL, req: 'job' },
  { id: 'o_tower', slot: 'offhand', name: 'โล่ปราการ', icon: '🏰', price: 1100, desc: 'ของดัน 2: กำแพงเหล็ก สวนกลับบ่อย', base: { vit: 3 }, mod: { maxHp: 50, def: 12, counter: 0.06, tenacity: 0.1 }, jobs: SW, req: 'd2' },
  { id: 'o_quiver', slot: 'offhand', name: 'กระบอกธนูหนัง', icon: '🎯', price: 480, desc: 'ลูกธนูคม ยิงแม่น', base: { dex: 2 }, mod: { hit: 5, crit: 0.02 }, jobs: AR, req: 'job' },
  { id: 'o_windquiver', slot: 'offhand', name: 'กระบอกธนูลมกรด', icon: '🌬️', price: 1100, desc: 'ของดัน 2: ยิงรัว คริแรง', base: { agi: 2 }, mod: { combo: 0.05, crit: 0.03, critMul: 0.1 }, jobs: AR, req: 'd2' },
  { id: 'o_orb', slot: 'offhand', name: 'ลูกแก้วเวท', icon: '🫧', price: 480, desc: 'เวทแรงขึ้น Mana เยอะขึ้น', base: { int: 2 }, mod: { matk: 4, maxRes: 15 }, jobs: MG, req: 'job' },
  { id: 'o_starorb', slot: 'offhand', name: 'ลูกแก้วดวงดาว', icon: '🌟', price: 1100, desc: 'ของดัน 2: เวทแรง เวทคริ Mana ฟื้นไว', base: { int: 3 }, mod: { matk: 8, spellCrit: 0.03, resRegen: 1 }, jobs: MG, req: 'd2' },
  { id: 'o_maingauche', slot: 'offhand', name: 'มีดปัด', icon: '🔪', price: 480, desc: 'ปัดป้อง แทงซ้ำ', base: { agi: 1 }, mod: { flee: 4, combo: 0.04 }, jobs: TH, req: 'job' },
  { id: 'o_scorpion', slot: 'offhand', name: 'เหล็กในแมงป่อง', icon: '🦂', price: 1100, desc: 'ของดัน 2: พิษแรง แทงรัว', base: { luk: 2 }, mod: { poisonDmg: 1, combo: 0.05, dodgeHeal: 0.01 }, jobs: TH, req: 'd2' },
  // ----- forge only (data/craft.ts) -----
  ...CRAFT_ITEMS,
]
export const itemById = (id: string) => ITEMS.find((i) => i.id === id) ?? ITEMS[0]
/** Can this job wear it? (no `jobs` list = everyone) */
/** Card slots (design/equipment-cards.md): starter gear 0, dungeon 2+ weapons 2, everything else 1. */
export function slotCount(it: Item, grade = 1): number {
  const n = it.slots !== undefined ? it.slots : it.price === 0 ? 0 : it.slot === 'weapon' && it.req && it.req !== 'job' ? 2 : 1
  return grade >= GRADE.slotAt ? Math.max(n, Math.min(GRADE.slotMax, n + 1)) : n // forge grade 4: +1 card slot
}
/** Forge grade of an owned item (1 = never upgraded). */
export const gradeOf = (s: { grade?: Record<string, number> }, id: string) => s.grade?.[id] ?? 1
export const canWear = (it: Item, job: JobId) => !it.jobs || it.jobs.includes(job)
/** Is it on sale yet? */
export function itemUnlocked(it: Item, s: { job: JobId; clearsBy?: Record<string, number> }) {
  if (it.req === 'job') return s.job !== 'novice'
  if (it.req === 'd2') return (s.clearsBy?.d2 ?? 0) > 0
  if (it.req === 'd3') return (s.clearsBy?.d3 ?? 0) > 0
  if (it.req === 'd4') return (s.clearsBy?.d4 ?? 0) > 0
  return true
}
export const REQ_TEXT: Record<ItemReq, string> = { job: 'ขายหลังเปลี่ยนอาชีพ', d2: 'ขายหลังล้มบอสป่าหมาป่าเงา', d3: 'ขายหลังล้มอัศวินมรณะ', d4: 'ขายหลังล้มไฮดรามรกต' }

// Labels for the auto-built stat line on every item card (so desc and numbers can never disagree).
const pc = (n: number) => `${Math.round(n * 1000) / 10}%`
const STAT_LABEL: Partial<Record<keyof Stats, [string, (n: number) => string]>> = {
  maxHp: ['HP', (n) => `${n}`], atk: ['P.ATK', (n) => `${n}`], matk: ['M.ATK', (n) => `${n}`], pskill: ['สกิลกายภาพ', pc],
  def: ['P.DEF', (n) => `${n}`], mdef: ['M.DEF', pc], tenacity: ['ต้านทาน', pc], healAmp: ['ฮีลแรง', pc], shieldAmp: ['โล่แรง', pc],
  hit: ['Hit', (n) => `${n}`], flee: ['Flee', (n) => `${n}`], luckyDodge: ['หลบโชคดี', pc], dropChance: ['ดรอปหายาก', pc],
  maxRes: ['Max Mana', (n) => `${n}`], resRegen: ['ฟื้น Mana', (n) => `${Math.round(n * 3 * 10) / 10}/เทิร์น`], aspd: ['เร็ว', (n) => pc(n / PLAYER.aspd)],
  crit: ['คริ', pc], spellCrit: ['เวทคริ', pc], critMul: ['ดาเมจคริ', pc], guard: ['ลดดาเมจ', pc], lifesteal: ['ดูดเลือด', pc], regen: ['ฟื้น HP/เทิร์น', (n) => pc(n * 1.5 / 100)],
  poison: ['พิษ stack/hit', (n) => `${n}`], poisonDmg: ['พิษแรง', (n) => `${n}`], smashMul: ['ทุบ(โนวิส)', (n) => `${n}x`],
  counter: ['สวนกลับ', pc], combo: ['คอมโบ', pc],
  dodgeHeal: ['หลบ→ฟื้น HP', pc], revive: ['ลุกใหม่', (n) => `${n} ครั้ง/รอบ`],
  burnDps: ['ติดไฟ', (n) => `${n}/เทิร์น`], healShield: ['ฮีลแล้วได้โล่', pc], dodgeEnergy: ['หลบ→Energy', (n) => `${n}`], counterRage: ['สวนกลับ→Rage', (n) => `${n}`],
  mgUltAmp: ['ult ธาตุแรง', pc], thorns: ['โล่สะท้อนดาเมจ', pc], holyCounter: ['สวนกลับเป็นเวท (ใช้ M.ATK)', () => ''], rageGain: ['ได้ Rage', pc], startRage: ['เริ่มเวฟมี Rage', (n) => `${n}`],
  pierce: ['ult ทะลวงเกราะ', pc], arUltBreak: ['ult ใส่บอสที่ชาร์จ', pc], mgUltMana: ['ร่าย ult คืน Mana', (n) => `${n}`], ultAmp: ['ult แรง', pc], ultShieldAdd: ['โล่จาก ult', (n) => `${pc(n)} HP`],
  ultPoison: ['ult ติดพิษ', (n) => `${n} stack`], arDodgeShield: ['หลบ→โล่', (n) => `${pc(n)} HP`], arCritRes: ['คริ→Energy', (n) => `${n}`], counterShield: ['สวนกลับ→โล่', (n) => `${pc(n)} HP`],
  poisonAmp: ['ดาเมจใส่มอนพิษ 10+ stack', pc], ultMulAdd: ['ult ตัวคูณ', (n) => `${n}x`], ultVsCharge: ['ult ใส่บอสที่กำลังชาร์จ', pc], ultRegen: ['หลัง ult ฟื้น HP/เทิร์น (3 เทิร์น)', pc],
  autoCostCut: ['สกิลออโต้ใช้ resource ลดลง', (n) => `${n}`], autoLifesteal: ['สกิลออโต้ดูดเลือด', pc], spearRate: ['ได้หอกแสงต่อเทิร์น', pc], spearMul: ['หอกแสงแรง', (n) => `${n}x M.ATK`],
  arLowHpBonus: ['ดาเมจใส่มอน HP<50%', pc], ultDodge: ['ult หลบแน่นอน', (n) => `${n} ครั้ง`], ultHits: ['ult แทง', (n) => `${n} ที`], mgUltCd: ['คูลดาวน์ ult', (n) => `${n} เทิร์น`],
  resRegenCut: ['ฟื้น Mana ลดลง', pc], mgWaveBarrier: ['ต้นเวฟได้บาเรีย', (n) => `${n}x M.ATK`], debuffRes: ['กันสถานะผิดปกติ', pc], waveShield: ['โล่ต้นเวฟ', (n) => `${pc(n)} HP`],
  smashCd: ['คูลดาวน์ท่าไม้ตาย', (n) => `${Math.round(n / 1500)} เทิร์น`], berserk: ['HP<30%: ATK +40% ดูดเลือด x2', () => ''], overhealShield: ['ฮีลเกินเต็มกลายเป็นโล่', () => ''], ctrAoe: ['สวนกลับโดนมอนทุกตัว 0.5x', () => ''],
}
export const BASE_NAME: Record<BaseStat, string> = { str: 'STR', vit: 'VIT', wis: 'WIS', dex: 'DEX', int: 'INT', luk: 'LUK', agi: 'AGI' }
/** "STR +3 · P.ATK +8 · ดูดเลือด +6%" */
export function itemStatLine(it: { base?: Item['base']; mod: Partial<Stats> }): string {
  const parts: string[] = []
  const b = it.base ?? {}
  const keys = Object.keys(b) as BaseStat[]
  if (keys.length === 7 && keys.every((k) => b[k] === b.str)) parts.push(`ทุกค่าสถานะ +${b.str}`)
  else for (const k of keys) parts.push(`${BASE_NAME[k]} ${b[k]! > 0 ? '+' : ''}${b[k]}`)
  for (const k of Object.keys(it.mod) as (keyof Stats)[]) {
    const L = STAT_LABEL[k], v = it.mod[k]!
    if (!L) continue
    const num = L[1](Math.abs(v))
    parts.push(num ? `${L[0]} ${k === 'resRegenCut' ? '' : v > 0 ? '+' : '-'}${num}` : L[0])
  }
  return parts.join(' · ')
}
/** Card effect line, including the "% of max HP / ATK" part. */
export function cardStatLine(cd: EquipCard): string {
  const p = cd.pct ?? {}, sg = (n: number) => `${n > 0 ? '+' : '-'}${pc(Math.abs(n))}`
  const extra = [p.maxHp ? `HP สูงสุด ${sg(p.maxHp)}` : '', p.atk ? `P.ATK ${sg(p.atk)}` : '', p.matk ? `M.ATK ${sg(p.matk)}` : ''].filter(Boolean)
  return [...extra, itemStatLine(cd)].filter(Boolean).join(' · ')
}
/** "นักดาบ, นักบวช" or "ทุกอาชีพ" */
export const wearText = (it: Item) => it.jobs ? it.jobs.map((j) => `${JOBS[j].icon}${JOBS[j].name}`).join(' ') : 'ทุกอาชีพ'
export const SELL_RATE = 0.5

// ---------- costumes (gems): looks only, zero stats ----------
export interface Costume { id: string; name: string; tint: number; price: number }
export const COSTUMES: Costume[] = [
  { id: 'default', name: 'ชุดโนวิส', tint: 0xffffff, price: 0 },
  { id: 'sakura', name: 'ชุดซากุระ', tint: 0xffb3d1, price: 60 },
  { id: 'night', name: 'ชุดราตรี', tint: 0xa58bff, price: 60 },
  { id: 'snow', name: 'ชุดหิมะ', tint: 0x9fe3ff, price: 80 },
  { id: 'forest', name: 'ชุดผู้พิทักษ์ป่า', tint: 0x8fe39a, price: 80 },
  { id: 'gold', name: 'ชุดทองคำ', tint: 0xffd36b, price: 150 },
]

// ---------- top-up (MOCK: no real payment is ever taken) ----------
export const GEM_PACKS = [
  { id: 'p1', gems: 60, bonus: 0, price: '฿35' },
  { id: 'p2', gems: 300, bonus: 30, price: '฿169' },
  { id: 'p3', gems: 980, bonus: 150, price: '฿529' },
]
export const SUPPORTER_PRICE = 300 // gems: badge + gold name, no stats
// free gem sources, so nothing in the gem shop is locked behind money
export const FREE_GEMS = { firstClear: 50, clear: 5, levelUp: 10, daily: 20 }

// ---------- combine everything into the hero's starting stats ----------
export interface StatsInput { race: RaceId; stats: Record<BaseStat, number>; equipped: Partial<Record<EquipSlot, string>>; skills: Record<SkillId, number>; job?: JobId; jobTree?: TreeSave; jobTalents?: TalentSave; jobLevel?: number; sockets?: Record<string, string[]>; grade?: Record<string, number> }

/** Items the hero actually gets stats from (gear for another job stays on but does nothing). */
export function wornItems(s: StatsInput): Item[] {
  const job = s.job ?? 'novice'
  const locked = offhandLocked(s)
  return (Object.keys(s.equipped) as EquipSlot[]).filter((sl) => !(sl === 'offhand' && locked)).map((sl) => itemById(s.equipped[sl]!)).filter((it) => canWear(it, job)).map((it) => gradeItem(it, gradeOf(s, it.id)))
}
/** A two-handed weapon in hand turns the off-hand slot off (its item stays on but gives nothing). */
export const offhandLocked = (s: { equipped: Partial<Record<EquipSlot, string>> }) => !!itemById(s.equipped.weapon ?? '').twoHand
/** Headgear and off-hand take armor cards for now (no head/shield cards yet); both accessory slots take acc cards. */
export const cardFits = (cd: EquipCard, it: Item) => cd.slot === it.slot || (cd.slot === 'armor' && (it.slot === 'head' || it.slot === 'offhand'))
/** Cards slotted in this item (unknown ids and extra cards past the slot count are ignored). */
export function socketed(s: { sockets?: Record<string, string[]>; grade?: Record<string, number> }, it: Item): EquipCard[] {
  return (s.sockets?.[it.id] ?? []).slice(0, slotCount(it, gradeOf(s, it.id))).map(cardById).filter((x): x is EquipCard => !!x)
}
/** Cards in worn gear the hero gets stats from. */
export const wornCards = (s: StatsInput) => wornItems(s).flatMap((it) => socketed(s, it))
/** Base stats from gear only (shown as "+N ของ" on the status tab). */
export function gearBase(s: StatsInput): Record<BaseStat, number> {
  const out = { str: 0, vit: 0, wis: 0, dex: 0, int: 0, luk: 0, agi: 0 }
  for (const it of [...wornItems(s), ...wornCards(s)]) for (const k of Object.keys(it.base ?? {}) as BaseStat[]) out[k] += it.base![k]!
  return out
}
/** Spent points + race + gear: what every derived stat is computed from. */
export function totalBase(s: StatsInput): Record<BaseStat, number> {
  const out = { ...s.stats }
  const bonus = RACES[s.race].bonus, gear = gearBase(s)
  for (const k of Object.keys(out) as BaseStat[]) out[k] = Math.max(1, out[k] + (bonus[k] ?? 0) + gear[k])
  return out
}

export function heroStats(s: StatsInput): Stats {
  const st: Stats = { ...PLAYER }
  const b = totalBase(s)
  const d = (k: BaseStat) => b[k] - STAT_RULES.start
  const P = PER_POINT
  const job = JOBS[s.job ?? 'novice']
  // ranged jobs draw P.ATK from DEX instead of STR (stat spec v1); Thief draws it from AGI (design/thief-buff-v1.md, Q OK 2026-11-03)
  st.atk += P.str.atk * d(job.attack === 'ranged' ? 'dex' : job.id === 'thief' ? 'agi' : 'str'); st.pskill += P.str.pskill * b.str
  st.hit += P.dex.hit * b.dex; st.minPct = Math.min(0.95, st.minPct + P.dex.minPct * b.dex)
  st.maxHp = (st.maxHp + P.vit.maxHp * d('vit')) * (1 + P.vit.maxHpPct * b.vit); st.def += P.vit.def * b.vit; st.regen += P.vit.regen * b.vit
  st.matk += P.int.matk * d('int'); st.maxRes += P.int.maxRes * d('int')
  st.healAmp += P.wis.healAmp * b.wis; st.shieldAmp += P.wis.shieldAmp * b.wis
  st.mdef += b.wis / (b.wis + P.wis.mdefK); st.tenacity += b.wis / (b.wis + P.wis.tenacityK); st.resRegen += P.wis.resRegen * b.wis
  st.aspd *= 1 + P.agi.aspdPct * d('agi'); st.flee += P.agi.flee * b.agi; st.combo += d('agi') / (d('agi') + P.agi.comboK)
  st.counter += d('vit') / (d('vit') + P.vit.counterK) // VIT = minor counter; cards/gear are the major source
  st.crit += P.luk.crit * b.luk; st.luckyDodge += b.luk / (b.luk + P.luk.dodgeK)
  st.legendChance = Math.min(P.luk.legendCap, st.legendChance + P.luk.legendPer * b.luk)
  st.dropChance *= 1 + Math.min(P.luk.dropCap, P.luk.dropPct * b.luk)
  st.eventChance = Math.min(P.luk.eventCap, st.eventChance + P.luk.eventPer * b.luk)
  st.maxHp = Math.round(st.maxHp)
  // Q: crit from talents/items/cards/tree also counts for magic (spellCrit); LUK crit above stays physical only
  const add = (mod: Partial<Stats>) => { for (const k of Object.keys(mod) as (keyof Stats)[]) { st[k] += mod[k]!; if (k === 'crit') st.spellCrit += mod[k]! } }
  add(RACES[s.race].traitMod)
  add(job.mod)
  for (const m of treeMods(s.jobTree, job.id)) add(m)
  for (const m of talentMods(s.jobTalents, job.id, s.jobLevel ?? 1)) add(m)
  for (const it of wornItems(s)) add(it.mod)
  const cards = wornCards(s)
  for (const cd of cards) add(cd.mod)
  const pct = { maxHp: 0, atk: 0, matk: 0 }
  for (const cd of cards) for (const k of Object.keys(cd.pct ?? {}) as (keyof typeof pct)[]) pct[k] += cd.pct![k]!
  st.maxHp = Math.max(1, Math.round(st.maxHp * (1 + pct.maxHp))); st.atk *= 1 + pct.atk; st.matk *= 1 + pct.matk
  for (const sk of SKILLS) if (s.skills[sk.id] > 0 && (sk.id !== 'smash' || job.id === 'novice')) add(sk.mod(s.skills[sk.id]))
  st.smashCd = Math.max(2500, st.smashCd)
  st.aspd = Math.max(0.6, st.aspd)
  st.minPct = Math.min(0.95, st.minPct)
  st.mdef = Math.min(0.75, st.mdef)
  st.tenacity = Math.min(0.75, st.tenacity)
  st.luckyDodge = Math.min(0.25, st.luckyDodge)
  st.counter = Math.min(0.6, st.counter)
  st.combo = Math.min(0.5, st.combo)
  st.lifesteal = Math.min(0.4, st.lifesteal)
  st.dodgeHeal = Math.min(0.1, st.dodgeHeal)
  st.fleeFloor = Math.min(0.2, st.fleeFloor) // Thief: monsters still hit at least 60%
  st.waveShield = Math.min(0.2, st.waveShield)
  return st
}
