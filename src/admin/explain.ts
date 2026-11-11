// Pure Thai explanations for every tunable field in the Balance Engine ("ปรับแล้วได้อะไร" + increase/decrease effects + formula hints).
import { HARD_PASSIVES, HARD_SKILLS, MONSTERS, type MonsterKind } from '../data/game-data'
import type { TableId } from '../data/tunables'
import {
  DUNGEON_LABEL, TABLE_EXPLAIN,
  type FieldExplain, type TableExplain,
} from './explain/labels'
import { BATTLE_STATIC } from './explain/battle'
import {
  explainArchetype, explainCombo, explainHard, explainHardPassive, explainHardSkill, explainMonStat,
  KIT_EXPLAIN, PROGRESSION_MAP, SKILL_SCALE_MAP,
} from './explain/combo-kit'
import { explainMonsterField } from './explain/monsters'
import { explainSkillTable } from './explain/skills'

export { TABLE_EXPLAIN }
export type { FieldExplain, TableExplain }

// ---------- Public API ----------
export function explainField(t: TableId, path: string, ctx?: { native?: boolean; defaultLabel?: string }): FieldExplain {
  switch (t) {
    case 'monsters': return explainMonsterField(path, !!ctx?.native, ctx?.defaultLabel)
    case 'battle': {
      if (BATTLE_STATIC[path]) return { ...BATTLE_STATIC[path], label: ctx?.defaultLabel ?? BATTLE_STATIC[path].label }
      if (path.startsWith('monSpeed.')) {
        const k = path.slice('monSpeed.'.length) as MonsterKind
        const name = MONSTERS[k]?.name ?? k
        return {
          label: `ความเร็ว · ${name}`,
          effect: 'เพิ่ม = มอนตัวนี้เกจเทิร์นวิ่งเร็วขึ้น ออกเทิร์นถี่ขึ้น (ค่าอ้างอิงกลางฮีโร่ = 10)',
          detail: 'มอน D6+ ใช้ค่า speed จาก AGI แทน (ใช้ค่านี้เป็น fallback เท่านั้น) ส่วน D1–5 อ่านค่านี้โดยตรง',
        }
      }
      if (path.startsWith('monBuff.')) {
        const [, kind, idxStr] = path.split('.')
        const dg = `D${Number(idxStr) + 1}`
        const dgName = DUNGEON_LABEL[dg.toLowerCase()] ?? dg
        if (kind === 'hp') return { label: `บัฟ HP มอนทั้งดัน · ${dgName}`, effect: 'เพิ่ม = มอนทุกตัวในดันเจี้ยนนี้ (ปกติ/มินิ/บอส) เลือดหนาขึ้นตามตัวคูณนี้' }
        if (kind === 'dmg') return { label: `บัฟ ATK/M.ATK มอนทั้งดัน · ${dgName}`, effect: 'เพิ่ม = มอนทุกตัวในดันเจี้ยนนี้ตีและสกิลแรงขึ้นตามตัวคูณนี้' }
        if (kind === 'turns') return { label: `คูณเทิร์นจำกัดของดัน · ${dgName}`, effect: 'เพิ่ม = ยืดเวลาเทิร์นจำกัดของห้องในดันเจี้ยนนี้ให้สู้ได้นานขึ้น' }
      }
      return { label: ctx?.defaultLabel ?? path, effect: 'ตัวคูณระบบต่อสู้ (BATTLE)' }
    }
    case 'combo': return explainCombo(path)
    case 'hard': return explainHard(path)
    case 'hardSkills': return explainHardSkill(path)
    case 'hardPassives': return explainHardPassive(path)
    case 'monStat': return explainMonStat(path)
    case 'archetypes': return explainArchetype(path)
    case 'skillScale': return SKILL_SCALE_MAP[path] ?? { label: path, effect: 'ค่าสเกลสกิลมอน' }
    case 'progression': return PROGRESSION_MAP[path] ?? { label: path, effect: 'ค่าความก้าวหน้าและ EXP' }
    case 'kit': return { ...(KIT_EXPLAIN[path] ?? { label: path, effect: 'ตัวคูณคิทคลาสหลัก' }), label: ctx?.defaultLabel ?? KIT_EXPLAIN[path]?.label ?? path }
    case 'skills': return explainSkillTable(path, ctx?.defaultLabel)
  }
}

export function explainTableGroup(t: TableId, key: string): { title: string; desc?: string } {
  if (t === 'hardSkills') {
    const sk = HARD_SKILLS[Number(key)]
    if (sk) return { title: `${key} · ${sk.name} (${sk.kind})`, desc: `สกิลสุ่มโหมด Hard สำหรับมินิบอสและบอส` }
  }
  if (t === 'hardPassives') {
    const hp = HARD_PASSIVES[Number(key)]
    if (hp) return { title: `${key} · ${hp.name}`, desc: `พาสซีฟสุ่มโหมด Hard (บอสดัน 3+ สุ่มติด 2 อย่าง)` }
  }
  const MAP: Partial<Record<TableId, Record<string, { title: string; desc?: string }>>> = {
    battle: {
      monSpeed: { title: '⚡ monSpeed · ความเร็วมอนรายตัว', desc: 'ความเร็วเทิร์นเกจพื้นฐานเทียบกับ heroSpeed (10)' },
      monBuff: { title: '🏰 monBuff · ตัวคูณทั้งดันเจี้ยน D1–D5', desc: 'ปรับ HP / ดาเมจ / เทิร์นทั้งดันพร้อมกัน (0 = D1 .. 4 = D5)' },
      duel: { title: '🎯 duel · กิมมิก Celeste (มินิบอส D3)', desc: 'ค่ากลางสคริปต์ Into Arena, Riposte, Grandado Espada' },
      toxicSkin: { title: '🧪 toxicSkin · พาสซีฟผิวพิษ (มินิบอส)', desc: 'ลดดาเมจ ต้านดีบัฟ ลดคริ และสะท้อนพิษใส่คนตี' },
      iceSkin: { title: '❄️ iceSkin · หนามน้ำแข็ง (Frost Giant)', desc: 'ตีโดนแล้วลดดาเมจฮีโร่' },
      vengeance: { title: '🛡️ vengeance · โล่แห่งความแค้น (Death Knight)', desc: 'แปลงดาเมจเป็นโล่และปล่อย DoT เวททุกเทิร์น' },
      bulletTime: { title: '⏱️ bulletTime · ยิงรัว (Gunner)', desc: 'นับถอยหลังและกระหน่ำยิงเมื่อเลือดต่ำกว่าเกณฑ์' },
      maiden: { title: '👻 maiden · เรียกเมเดน (Karvos)', desc: 'เงื่อนไขเรียกเมเดนและโควตาเทิร์นจำกัดเพิ่มเติม' },
      web: { title: '🕸️ web · สถานะใยพันตัว', desc: 'สัดส่วนการลด AGI ของมอน/ฮีโร่ที่ติดใยแมงมุม' },
    },
    combo: {
      ignore: { title: '🚫 ignore · มอนเมินคอมโบฮีโร่ (%)', desc: 'หักลบโอกาสคอมโบของผู้เล่นแยกตามระดับมอน' },
      basicDR: { title: '🛡️ basicDR · มอนลดดาเมจตีปกติ/สวนกลับ', desc: 'ลดความแรงตีปกติและสวนกลับแยกตามระดับมอน' },
      comboDR: { title: '🛡️ comboDR · มอนลดดาเมจฮิตคอมโบแถม', desc: 'ลดความแรงเฉพาะฮิตคอมโบที่แถมเพิ่ม' },
      ignoreCounter: { title: '🚫 ignoreCounter · มอนเมินสวนกลับฮีโร่ (%)', desc: 'หักลบโอกาสสวนกลับของผู้เล่นแยกตามระดับมอน' },
      counterDR: { title: '🛡️ counterDR · มอนลดดาเมจฮิตสวนกลับ', desc: 'ลดความแรงเมื่อฮีโร่ตีสวนกลับ' },
    },
    hard: {
      recLv: { title: '📏 recLv · Base Lv แนะนำต่อดัน D1–D5', desc: 'จุดเริ่มต้นการไต่ระดับความยากของโหมด Hard' },
      curve: { title: '📈 curve · กราฟความเก่งมอน Hard (D1–D5)', desc: '0 = Lv อ้างอิง · 1 = HP บอสอ้างอิง · 2 = ATK บอสอ้างอิง' },
    },
    monStat: {
      monStat: { title: '📐 monStat · สูตรสเตตัสมอน D6+', desc: 'สัดส่วนแต้ม stat, levelBase, ตัวคูณ body และเพดาน' },
      levelGap: { title: '⚖️ levelGap · ลดรางวัลเมื่อเวลเกินดัน', desc: 'ชะลอการฟาร์มดันต่ำกว่าตัวเกินควรใน D6+' },
      legacy: { title: '🏚️ legacy · ค่าอ้างอิงเลเวล D1–D5', desc: 'ใช้คำนวณสเตตัสเสริมและสกิลของมอน D1–5' },
    },
    skillScale: {
      fx: { title: '💫 fx · สกิลพิเศษในเฟส / Blood Razor', desc: 'ตัวคูณเพิ่มเติมตาม WIS (เฟสบอส) และ INT (Blood Razor)' },
      lv: { title: '⭐ lv · โบนัสเมื่อมอนมีเลเวลสกิล (+Lv)', desc: 'สเกลความแรง ฮิต จำนวนสแต็ก และเทิร์นเมื่อสกิล > Lv1' },
    },
    progression: {
      stat: { title: '📊 stat · Base Lv & แต้ม Stat', desc: 'แต้มต่อเลเวลและโค้ง Account EXP' },
      job: { title: '🎭 job · Job Lv & โค้ง Job EXP', desc: 'ความเร็วในการอัป Job Lv เพื่อเปลี่ยนอาชีพ' },
      run: { title: '🏃 run · EXP และฮีลในรอบดันเจี้ยน', desc: 'ค่าประสบการณ์ในรันและการฟื้นเลือดหลังจบห้อง' },
    },
    kit: {
      cast: { title: '🔮 cast · ระบบร่ายเวท (Mage)', desc: 'โอกาสร่ายแตก คืน Mana และลูกไฟพื้นฐาน' },
      cleric: { title: '✝️ cleric · ตัวคูณและโล่หลัก (Cleric)', desc: 'ค่าร่าย Ult, ฮีล, แสงตก, โล่ และเพดานโล่พระ' },
      clericTree: { title: '🕸️ clericTree · ใยแมงมุมพระ (รุ่งอรุณ / แก่นศรัทธา)', desc: 'ตัวเลขโนดในสกิลทรีของนักบวช' },
    },
    skills: {
      crit: { title: '💥 crit · ตัวคูณความแรงคริแยกสกิลคลาสหลัก', desc: '1 = ปกติ, 0.5 = โบนัสคริครึ่ง, 0 = ไม่คริ' },
      job: { title: '🎭 job · ค่าร่าย/คูลดาวน์สกิลคลาส 1', desc: 'ค่าร่ายและคูลดาวน์ใน JOBS' },
      skill2: { title: '2️⃣ skill2 · ค่าร่าย/คูลดาวน์ทักษะ 2 (ทั้ง 15 ท่า)', desc: 'cost และ cd ของทักษะ 2' },
      s2p: { title: '📈 s2p · สูตรทักษะ 2 (base + per × Lv "+")', desc: 'ปรับฐานและอัตราเพิ่มต่อเลเวลของทักษะ 2' },
      s2n: { title: '🔢 s2n · ค่าคงที่เฉพาะทักษะ 2', desc: 'จำนวนเทิร์น สแต็ก บัฟสเตตัส และโบนัสเสริม' },
      sword: { title: '⚔️ sword · ตัวเลขเฉพาะ Swordsman', desc: 'Mana และตัวคูณฟันพายุ / Ult' },
      mage: { title: '🔮 mage · ตัวเลขเฉพาะ Mage', desc: 'บาเรีย M.ATK หลังปล่อยเวท' },
      job2: { title: '🌟 job2 · ค่าร่าย/คูลดาวน์ 10 อาชีพขั้น 2', desc: 'cost/cd ของทักษะ 3 และ cd ของ Ult วิวัฒน์' },
      kit2: { title: '🛠️ kit2 · พารามิเตอร์สกิล/พาสซีฟ/ทรี 10 อาชีพขั้น 2', desc: 'ตัวคูณทั้งหมดของทั้ง 10 อาชีพขั้น 2' },
    },
  }
  return MAP[t]?.[key] ?? { title: key }
}
