// Skill registry: which numbers each class's ทักษะ 1 / ทักษะ 2 / Ult shows in admin.html "⚔️ สกิลอาชีพ" (design/skill-admin-engine-v1.md).
// It is a MAP, not a second copy of the numbers: a ref points at a path of the `kit` table (already whitelisted) or of the
// new `skills` table (tunables.ts builds its whitelist from the refs below). Adding a skill number = add one ref here.
// Round 1: the 5 base classes (skill 1 / 2 / Ult). Round 2: 2nd-job classes + skill 3.
// Import rule: type-only imports from ./tunables (tunables imports this file), values only from jobs / skill2 / skill-math.
import { JOBS, MAGE_SPELL, SWORD_MANA } from './jobs'
import type { Skill2Id } from './skill2'
import { SKILL2 } from './skill2'
import { S2N, S2P } from './skill-math'
import type { FieldDef } from './tunables'

export const SKILL_CLASSES = ['swordsman', 'archer', 'mage', 'cleric', 'thief'] as const
export type SkillClass = (typeof SKILL_CLASSES)[number]
/** Slots that carry a crit switch. Skill 3 exists only for 2nd-job classes (round 2). */
export const CRIT_SLOTS = ['s1', 's2', 'ult'] as const
export type CritSlot = (typeof CRIT_SLOTS)[number]

/** Per-skill crit switch: 1 = the skill's own hits may roll a crit (today's behaviour, every skill), 0 = they never roll one.
 *  A sure crit (forceCrit: Swordsman ★ พันดาบ ...) and on-hit procs (zap / fire / ice / spear / light ...) are not governed by it.
 *  Tunable as skills `crit.<class>.<slot>`. */
export const SKILL_CRIT: Record<SkillClass, Record<CritSlot, number>> = {
  swordsman: { s1: 1, s2: 1, ult: 1 }, archer: { s1: 1, s2: 1, ult: 1 }, mage: { s1: 1, s2: 1, ult: 1 },
  cleric: { s1: 1, s2: 1, ult: 1 }, thief: { s1: 1, s2: 1, ult: 1 },
}
/** false only when the admin switched this class's slot off. Jobs without an entry (novice, 2nd-job slots not covered yet) = allowed. */
export function canRollCrit(job: string, slot: CritSlot): boolean {
  const row = (SKILL_CRIT as Partial<Record<string, Record<CritSlot, number>>>)[job]
  return row?.[slot] !== 0
}

// ---------- field refs ----------
export interface SkillRef { table: 'kit' | 'skills'; path: string; label: string }
/** A `skills`-table ref carries its own range (tunables.ts builds the whitelist from these). */
export interface SkillOwnRef extends SkillRef { table: 'skills'; def: FieldDef }
export interface ClassLayout {
  s1: SkillRef[]
  /** The three Skill 2 choices of the class; each also gets its cost / cooldown refs (see skill2Refs). */
  s2: { id: Skill2Id; refs: SkillRef[] }[]
  ult: SkillRef[]
}

const num = (min: number, max: number): FieldDef => ({ kind: 'num', min, max })
const int = (min: number, max: number): FieldDef => ({ kind: 'int', min, max })
const COST = int(0, 200), CD = int(1, 30), MUL = num(0, 20), FRAC = num(0, 1), COEF = num(0, 200)

const kit = (path: string, label: string): SkillRef => ({ table: 'kit', path, label })
const sk = (path: string, label: string, def: FieldDef): SkillOwnRef => ({ table: 'skills', path, label, def })
/** Skill 2 "+" node: value = base + per x level (S2P). */
const lin = (key: keyof typeof S2P, what: string): SkillOwnRef[] => [
  sk(`s2p.${key}.base`, `${what} · ฐาน`, COEF), sk(`s2p.${key}.per`, `${what} · เพิ่มต่อเลเวล "+"`, COEF),
]
const s2cost = (id: Skill2Id): SkillOwnRef[] => [sk(`skill2.${id}.cost`, 'ค่าร่าย', COST), sk(`skill2.${id}.cd`, 'คูลดาวน์ (เทิร์น)', CD)]
const s2 = (id: Skill2Id, ...more: SkillRef[]) => ({ id, refs: [...s2cost(id), ...more] })

export const SKILL_LAYOUT: Record<SkillClass, ClassLayout> = {
  swordsman: {
    s1: [sk('sword.auto', 'ค่า Mana', COST), sk('sword.autoMul', 'ดาเมจ × P.ATK (ทุกตัว)', MUL)],
    s2: [
      s2('sw_guard', ...lin('guardCut', 'ดาเมจเข้าลด')),
      s2('sw_blood', ...lin('bloodVamp', 'ดูดเลือดสกิล'), sk('s2n.bloodTurns', 'นาน (เทิร์น)', int(0, 20)), sk('s2n.bloodAtk', 'ATK เพิ่ม', FRAC)),
      s2('sw_taunt', ...lin('tauntWeak', 'มอนตีเบาลง')),
    ],
    ult: [sk('sword.ult', 'ค่า Mana', COST), sk('job.swordsman.ult.cd', 'คูลดาวน์ (เทิร์น)', CD), sk('sword.ultMul', 'ดาเมจ × P.ATK (ทุกตัว)', MUL), sk('sword.ultShield', 'โล่ % HP สูงสุด', FRAC)],
  },
  archer: {
    s1: [sk('job.archer.auto.cost', 'ค่า Energy', COST), kit('archerAuto', 'ดาเมจต่อดอก ×'), kit('archerAutoShots', 'จำนวนดอก'), kit('archerVolleyShots', 'จำนวนดอก (ศรสาด)')],
    s2: [
      s2('ar_rain', ...lin('rainMul', 'ดาเมจฝนธนู ×')),
      s2('ar_hawk', ...lin('hawkCrit', 'คริเพิ่ม'), sk('s2n.hawkTurns', 'นาน (เทิร์น)', int(0, 20)), sk('s2n.hawkCritDmg', 'ดาเมจคริเพิ่ม', num(0, 2))),
      s2('ar_trap', sk('s2n.trapMul', 'ดาเมจกับดัก ×', MUL), ...lin('trapPush', 'ผลักเทิร์น')),
    ],
    ult: [sk('job.archer.ult.cd', 'คูลดาวน์ (เทิร์น)', CD), kit('archerUlt', 'ดาเมจศรทะลวง ×')],
  },
  mage: {
    s1: [sk('job.mage.auto.cost', 'ค่า Mana', COST), kit('cast.fireMul', 'ดาเมจลูกไฟ × M.ATK')],
    s2: [
      s2('mg_mshield', ...lin('mshieldTake', 'Mana รับดาเมจแทน')),
      s2('mg_nova', ...lin('novaMul', 'ดาเมจวงน้ำแข็ง ×'), sk('s2n.novaPush', 'ผลักเทิร์น', COEF)),
      s2('mg_arcane', ...lin('arcaneMul', 'ดาเมจต่อฮิต ×')),
    ],
    ult: [
      sk('job.mage.ult.cost', 'ค่า Mana', COST), sk('job.mage.ult.cd', 'คูลดาวน์ (เทิร์น)', CD), kit('cast.ultMul', 'พลังตอนปล่อย × (ทุกธาตุ)'), kit('cast.brokenUltCd', 'คูลดาวน์เมื่อร่ายแตก (เทิร์น)'),
      sk('mage.barrier', 'บาเรีย × M.ATK', MUL),
      kit('mageFire', '🔥 ไฟ ×'), kit('mageFireStacks', '🔥 เผาซ้อน (stack)'), kit('mageIce', '❄️ น้ำแข็ง ×'), kit('mageIceChill', '❄️ ช้า (เทิร์น)'),
      kit('mageLightHits', '⚡ จำนวนฮิต'), kit('mageLightLo', '⚡ ต่ำสุดต่อฮิต ×'), kit('mageLightHi', '⚡ สูงสุดต่อฮิต ×'),
    ],
  },
  cleric: {
    s1: [sk('job.cleric.auto.cost', 'ค่า Mana', COST), kit('cleric.heal', 'ฮีล × M.ATK'), kit('clericHealBelow', 'ฮีลเมื่อ HP ต่ำกว่า'), kit('cleric.smite', 'แสงตกใส่ × M.ATK'), kit('clericSmiteTargets', 'แสงตกกี่ตัว')],
    s2: [
      s2('cl_renew', ...lin('renewHeal', 'ฮีลต่อเทิร์น × M.ATK')),
      s2('cl_bless', sk('s2n.blessTurns', 'นาน (เทิร์น)', int(0, 20)), sk('s2n.blessStat', 'STR/DEX/INT/WIS +', int(0, 200)), sk('s2n.blessCleanse', 'ล้างดีบัฟ (อย่าง)', int(0, 10)),
        sk('s2n.kyrieHits', 'Kyrie แตกหลังโดน (ครั้ง)', int(0, 20)), sk('s2n.gloriaLuk', 'Gloria LUK +', int(0, 200)), ...lin('kyrieHp', 'Kyrie บาเรีย % HP')),
      s2('cl_spear', ...lin('spearPlus', 'หอกแรงเพิ่ม'), kit('spearBase', 'ดาเมจหอกพื้นฐาน × M.ATK'), kit('spearMax', 'หอกสูงสุด (เล่ม)')),
    ],
    ult: [
      kit('cleric.ultMana', 'ค่า Mana'), sk('job.cleric.ult.cd', 'คูลดาวน์ (เทิร์น)', CD), kit('cleric.ultAtk', 'ทุบทุกตัว × P.ATK'),
      kit('cleric.ultLights', 'Holy Light (ลูก)'), kit('cleric.ultLight', 'Holy Light ต่อลูก × M.ATK'), kit('cleric.ultShield', 'โล่ % HP สูงสุด'), kit('cleric.ultShieldTurns', 'โล่นาน (เทิร์น)'), kit('cleric.purifyHeal', 'ไฟชำระฮีล × M.ATK'),
    ],
  },
  thief: {
    s1: [sk('job.thief.auto.cost', 'ค่า Energy', COST), kit('thiefAuto', 'ดาเมจแทง ×'), kit('thiefAutoPoison', 'พิษ (stack)')],
    s2: [
      s2('th_smoke', ...lin('smokeHeal', 'ฟื้น % HP')),
      s2('th_pick', ...lin('pickRes', 'คืน Energy'), sk('s2n.pickPoison', 'พิษ (stack)', int(0, 20))),
      s2('th_wound'),
    ],
    ult: [sk('job.thief.ult.cd', 'คูลดาวน์ (เทิร์น)', CD), kit('thiefUlt', 'ดาเมจต่อทีแทง ×'), kit('thiefUltHits', 'จำนวนทีแทง'), kit('thiefUltDodge', 'หลบแน่นอน (ครั้ง)')],
  },
}

/** The crit-switch ref of one slot (always shown first in its column). */
export const critRef = (c: SkillClass, slot: CritSlot): SkillOwnRef => sk(`crit.${c}.${slot}`, 'คริได้ไหม (1 = ได้ · 0 = ไม่คริ)', int(0, 1))

/** Every `skills` ref (incl. crit switches), de-duplicated by path: tunables.ts turns these into the table's whitelist. */
export function skillTableFields(): [string, FieldDef][] {
  const out = new Map<string, FieldDef>()
  const add = (r: SkillRef) => { if (r.table === 'skills' && 'def' in r && !out.has(r.path)) out.set(r.path, (r as SkillOwnRef).def) }
  for (const c of SKILL_CLASSES) {
    const l = SKILL_LAYOUT[c]
    for (const slot of CRIT_SLOTS) add(critRef(c, slot))
    l.s1.forEach(add); l.ult.forEach(add); l.s2.forEach((x) => x.refs.forEach(add))
  }
  return [...out.entries()]
}

let root: object | null = null
/** The object the `skills` table patches in place: refs to the real consts, so writes reach the game's data. Built on first use (module cycles). */
export function skillRoot(): object {
  return (root ??= {
    job: JOBS, sword: SWORD_MANA, mage: MAGE_SPELL, s2p: S2P, s2n: S2N, crit: SKILL_CRIT,
    skill2: Object.fromEntries(SKILL2.map((s) => [s.id, s])), // keyed by id: a patch path never depends on array order
  })
}
