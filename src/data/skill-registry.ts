// Skill registry: which numbers each class's ทักษะ 1 / ทักษะ 2 / Ult shows in admin.html "⚔️ สกิลอาชีพ" (design/skill-admin-engine-v1.md).
// It is a MAP, not a second copy of the numbers: a ref points at a path of the `kit` table (already whitelisted) or of the
// new `skills` table (tunables.ts builds its whitelist from the refs below). Adding a skill number = add one ref here.
// Round 1: the 5 base classes (skill 1 / 2 / Ult). Round 2: 2nd-job classes + skill 3.
// Import rule: type-only imports from ./tunables (tunables imports this file), values only from jobs / skill2 / skill-math.
import { JOBS, MAGE_SPELL, SWORD_MANA } from './jobs'
import { JOB2, type Job2Id } from './jobs2'
import type { Skill2Id } from './skill2'
import { SKILL2 } from './skill2'
import { KIT2, S2N, S2P } from './skill-math'
import type { FieldDef } from './tunables'

export const SKILL_CLASSES = ['swordsman', 'archer', 'mage', 'cleric', 'thief'] as const
export type SkillClass = (typeof SKILL_CLASSES)[number]
/** Slots that carry a crit switch. Skill 3 exists only for 2nd-job classes (round 2). */
export const CRIT_SLOTS = ['s1', 's2', 'ult'] as const
export type CritSlot = (typeof CRIT_SLOTS)[number]

/** Per-skill crit power (Q 2026-11-08): 1 = the skill's own hits crit as today (every skill), 0 = they never roll a crit,
 *  in between (0.5) = they still roll the crit but only that share of the crit BONUS lands: x = 1 + (critMul - 1) * power.
 *  A sure crit (forceCrit: Swordsman ★ พันดาบ ...) and on-hit procs (zap / fire / ice / spear / light ...) are not governed by it.
 *  Tunable as skills `crit.<class>.<slot>` (kept the old 0/1 switch's path: a published 0 or 1 means the same). */
export const SKILL_CRIT: Record<SkillClass, Record<CritSlot, number>> = {
  swordsman: { s1: 1, s2: 1, ult: 1 }, archer: { s1: 1, s2: 1, ult: 1 }, mage: { s1: 1, s2: 1, ult: 1 },
  cleric: { s1: 1, s2: 1, ult: 1 }, thief: { s1: 1, s2: 1, ult: 1 },
}
const critRow = (job: string) => (SKILL_CRIT as Partial<Record<string, Record<CritSlot, number>>>)[job]
/** false only when the admin switched this class's slot off (power 0). Jobs without an entry (novice, 2nd-job slots not covered yet) = allowed. */
export function canRollCrit(job: string, slot: CritSlot): boolean {
  return critRow(job)?.[slot] !== 0
}
/** Share (0..1) of the crit bonus this class's slot keeps; 1 for jobs without an entry. */
export function critPower(job: string, slot: CritSlot): number {
  const v = critRow(job)?.[slot]
  return typeof v === 'number' ? Math.min(1, Math.max(0, v)) : 1
}
/** The crit multiplier a skill hit really gets: only `power` of the bonus above x1 (power 1 = the full critMul). */
export const scaleCritMul = (critMul: number, power: number): number => 1 + (critMul - 1) * power

// ---------- field refs ----------
export interface SkillRef { table: 'kit' | 'skills'; path: string; label: string }
/** A `skills`-table ref carries its own range (tunables.ts builds the whitelist from these). */
export interface SkillOwnRef extends SkillRef { table: 'skills'; def: FieldDef }
export interface ClassLayout {
  s1: SkillRef[]
  /** The three Skill 2 choices of the class; each also gets its cost / cooldown refs (see skill2Refs). */
  s2: { id: Skill2Id; refs: SkillRef[] }[]
  ult: SkillRef[]
  /** v107 round 2: skill-tree node numbers of the class web (shown as its own column). */
  tree?: SkillRef[]
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
    tree: [ // v107: numbers the Cleric web nodes read at run time (kit `clericTree.*`)
      kit('cleric.ultManaLv', '🙏 ราก: Mana Ult เพิ่มต่อ Lv (เหนือ Lv1 · 0 = คงที่)'), kit('clericUltAtkLv', '🙏 ราก: Ult ทุบแรง × P.ATK ต่อ Lv'), kit('clericTree.dawn.every', '🌄 passive: ทุกกี่ฮิต (ตีธรรมดา/คอมโบ)'),
      kit('clericTree.dawn.share', '🌄 โบนัส: share ต่อ Lv เดิม (× STR+WIS+M.ATK)'), kit('clericTree.dawn.matk', '🌄 โบนัส: × M.ATK ในฐาน'),
      kit('clericTree.dawn.heal', '💛 สมานแผล: ฮีลต่อ Lv เดิม'), kit('clericTree.dawn.weak', '💛 สมานแผล: มอนธรรมดา ×'),
      kit('clericTree.dawn.wis.0', '☀️ แสงแตก Lv1: WIS = × ดาเมจ'), kit('clericTree.dawn.wis.1', '☀️ แสงแตก Lv2: WIS = × ดาเมจ'), kit('clericTree.dawn.wis.2', '☀️ แสงแตก Lv3: WIS = × ดาเมจ'),
      kit('clericTree.dawn.wisTurns.0', '☀️ แสงแตก Lv1: เทิร์น'), kit('clericTree.dawn.wisTurns.1', '☀️ แสงแตก Lv2: เทิร์น'), kit('clericTree.dawn.wisTurns.2', '☀️ แสงแตก Lv3: เทิร์น'),
      kit('clericTree.dawn.crit', '★ อรุณพิทักษ์: ดาเมจคริเพิ่ม'),
      kit('clericTree.core.base', '🧘 จิตสงบ: STR/WIS ต่อ Lv เดิม'), kit('clericTree.core.regen', '🧘 จิตสงบ: ฟื้น Mana ต่อ Lv เดิม (หน่วย /3 ต่อเทิร์น)'),
      kit('clericTree.core.intPer.0', '💪 ศรัทธาสู่กาย Lv1: ทุกกี่แต้ม'), kit('clericTree.core.intPer.1', '💪 ศรัทธาสู่กาย Lv2: ทุกกี่แต้ม'), kit('clericTree.core.intPer.2', '💪 ศรัทธาสู่กาย Lv3: ทุกกี่แต้ม'),
      kit('clericTree.core.guard', '💠 มานาพิทักษ์: Mana จากดาเมจต่อ Lv เดิม'), kit('clericTree.core.wisAmp', '💠 มานาพิทักษ์: ขยายต่อ WIS'),
      kit('clericTree.core.heal', '💠 มานาพิทักษ์: ใช้ Mana คืน HP'), kit('clericTree.core.shield', '💠 มานาพิทักษ์: โล่ต้นเวฟต่อ Lv เดิม × Max Mana'),
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

// ---------- v107 round 2: 2nd jobs (KIT2 + JOB2 skill 3 / Ult วิวัฒน์) ----------
export const JOB2_IDS = Object.keys(JOB2) as Job2Id[]
export interface Job2Layout { s3: SkillRef[]; ult: SkillRef[]; other: SkillRef[] }
/** Hand-written Thai labels; any other KIT2 number shows its key. */
const J2_LABEL: Record<string, string> = {
  'crusader.guard': '🛡️ Auto Guard: บล็อก', 'crusader.guardVit': '🛡️ บล็อกเพิ่มต่อ VIT', 'crusader.guardCap': '🛡️ บล็อกสูงสุด', 'crusader.guardOverMul': '🛡️ บล็อกเกิน Cap: โล่/ฮีลบล็อก × ต่อ 1', 'crusader.holyVs': 'ศรัทธา: แรงใส่อันเดด/ปีศาจ',
  'crusader.crossHits': '✝️ จำนวนฮิต', 'crusader.crossMul': '✝️ ต่อฮิต × (P.ATK + Pm)', 'crusader.blindTurns': '🙈 ตาบอด (เทิร์น)', 'crusader.blindHit': '🙈 Hit มอนลด',
  'crusader.gcPay': '✨ จ่าย HP % ปัจจุบัน', 'crusader.gcPm': '✨ ต่อ pulse × พลังเวท', 'crusader.gcAtk': '✨ ต่อ pulse × P.ATK', 'crusader.gcStr': '✨ ต่อ pulse × STR (flat)', 'crusader.gcPulses.0': '✨ pulse ที่ Lv0', 'crusader.gcPulses.1': '✨ pulse ที่ Lv1', 'crusader.gcPulses.2': '✨ pulse ที่ Lv2', 'crusader.gcPulses.3': '✨ pulse ที่ Lv3', 'crusader.gcPulses.4': '✨ pulse ที่ Lv4', 'crusader.gcPulses.5': '✨ pulse ที่ Lv5', 'crusader.gcRefund': '✨ คืน HP % ของที่จ่าย',
  'crusader.gcRefundAt': '✨ คืน HP เมื่อโดนกี่ตัวขึ้นไป', 'crusader.gcBurn': '🔥 โบนัส × (Mana ที่เผา + HP ที่จ่าย)', 'crusader.angelCap': '🪽 Guardian Angel ลดดาเมจสูงสุด', 'crusader.hcVit': '✝️ Holy Cross VIT ต่อ stack', 'crusader.hcVitGrace': '✝️ VIT อยู่ต่อหลังคูลดาวน์หมด (เทิร์น)',
  'crusader.martyrShield': '★ ผู้พลีชีพ: โล่ % HP', 'crusader.mastery.atkPct': 'ชำนาญอาวุธ: ATK %', 'crusader.mastery.def': 'ชำนาญอาวุธ: DEF',
}
/** Which column a KIT2 key goes to. Skill 3 Mana / cooldown are NOT here: jobs2.ts copies them at import, so they are tuned on JOB2 (job2.<id>.skill3.cost / cd). */
const J2_COL: Partial<Record<Job2Id, { s3: RegExp; ult: RegExp }>> = { crusader: { s3: /^(cross|blind)/, ult: /^gc/ } }
const INTISH = /(Turns|Hits|Max|Keep|At|Stacks|Every|Boxes|Knives|Count|Per(Swing|Combo))$/
function j2Leaves(id: Job2Id): SkillOwnRef[] {
  const out: SkillOwnRef[] = []
  const walk = (o: Record<string, unknown>, pre: string) => {
    for (const [k, v] of Object.entries(o)) {
      const key = pre ? `${pre}.${k}` : k
      if (typeof v === 'number') {
        if (/(Cost|Cd)$/.test(k)) continue // copied into JOB2 at import (see above)
        const hi = Math.max(10, Math.ceil(Math.abs(v) * 10))
        out.push(sk(`kit2.${id}.${key}`, J2_LABEL[`${id}.${key}`] ?? key, INTISH.test(k) && Number.isInteger(v) ? int(0, hi) : num(0, hi)))
      } else if (Array.isArray(v) && v.every((x) => typeof x === 'number')) { // v109: number lists (Grand Cross pulses per Lv)
        v.forEach((x: number, i: number) => out.push(sk(`kit2.${id}.${key}.${i}`, J2_LABEL[`${id}.${key}.${i}`] ?? `${key}[${i}]`, Number.isInteger(x) ? int(0, Math.max(10, x * 10)) : num(0, Math.max(10, Math.ceil(x * 10))))))
      } else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v as Record<string, unknown>, key)
    }
  }
  walk(KIT2[id] as unknown as Record<string, unknown>, '')
  return out
}
export function job2Layout(id: Job2Id): Job2Layout {
  const col = J2_COL[id], leaves = j2Leaves(id), key = (r: SkillRef) => r.path.split('.').slice(2).join('.')
  const s3 = leaves.filter((r) => col?.s3.test(key(r))), ult = leaves.filter((r) => col?.ult.test(key(r)))
  return {
    s3: [sk(`job2.${id}.skill3.cost`, 'ค่าร่าย', COST), sk(`job2.${id}.skill3.cd`, 'คูลดาวน์ (เทิร์น)', CD), ...s3],
    ult: [sk(`job2.${id}.ult.cd`, 'คูลดาวน์ (เทิร์น)', CD), ...ult],
    other: leaves.filter((r) => !s3.includes(r) && !ult.includes(r)),
  }
}

/** The crit-power ref of one slot (always shown first in its column). */
export const critRef = (c: SkillClass, slot: CritSlot): SkillOwnRef => sk(`crit.${c}.${slot}`, 'ความแรงคริ (1 = ปกติ · 0.5 = โบนัสคริเหลือครึ่ง · 0 = ไม่คริ)', num(0, 1))

/** Every `skills` ref (incl. crit switches), de-duplicated by path: tunables.ts turns these into the table's whitelist. */
export function skillTableFields(): [string, FieldDef][] {
  const out = new Map<string, FieldDef>()
  const add = (r: SkillRef) => { if (r.table === 'skills' && 'def' in r && !out.has(r.path)) out.set(r.path, (r as SkillOwnRef).def) }
  for (const c of SKILL_CLASSES) {
    const l = SKILL_LAYOUT[c]
    for (const slot of CRIT_SLOTS) add(critRef(c, slot))
    l.s1.forEach(add); l.ult.forEach(add); l.s2.forEach((x) => x.refs.forEach(add)); l.tree?.forEach(add)
  }
  for (const id of JOB2_IDS) { const l = job2Layout(id); [...l.s3, ...l.ult, ...l.other].forEach(add) }
  return [...out.entries()]
}

let root: object | null = null
/** The object the `skills` table patches in place: refs to the real consts, so writes reach the game's data. Built on first use (module cycles). */
export function skillRoot(): object {
  return (root ??= {
    job: JOBS, sword: SWORD_MANA, mage: MAGE_SPELL, s2p: S2P, s2n: S2N, crit: SKILL_CRIT, job2: JOB2, kit2: KIT2, // v107: 2nd jobs
    skill2: Object.fromEntries(SKILL2.map((s) => [s.id, s])), // keyed by id: a patch path never depends on array order
  })
}
