import type { HitFx } from '../../data/game-data'
import { SKILL2 } from '../../data/skill2'
import type { TableId } from '../../data/tunables'

export interface TableExplain {
  label: string
  short: string
  summary: string
}

export interface FieldExplain {
  label: string
  /** Concise single-line answer to "ปรับแล้วได้อะไร" (always shown below field label). */
  effect: string
  /** Detailed formula / increase-vs-decrease / caveat (shown on expand or tooltip). */
  detail?: string
}

export const TABLE_EXPLAIN: Record<TableId, TableExplain> = {
  monsters: {
    label: '👾 มอนสเตอร์ / มินิบอส / บอส',
    short: 'มอนสเตอร์',
    summary: 'ปรับค่าพลัง รางวัล สัดส่วนสเตตัส ความสามารถพิเศษ สกิล และเฟสของมอนสเตอร์แต่ละตัว (D1–5 เป็นค่าฐานยึดระดับบ้านเกิด, D6+ สร้างจากสเตตัสล้วน + โบนัส)',
  },
  battle: {
    label: '⚔️ ระบบต่อสู้และกิมมิกมอน (BATTLE)',
    short: 'ระบบต่อสู้',
    summary: 'ตั้งค่าเทิร์นจำกัด ความเร็วฮีโร่/มอน ตัวคูณดาเมจรวม บัฟดัน 1–5 สกิลสคริปต์มินิบอส (Celeste / Hunt / Gunner / Karvos) และสถานะผิดปกติ',
  },
  combo: {
    label: '🔁 คอมโบและสวนกลับ (COMBO)',
    short: 'คอมโบ/สวนกลับ',
    summary: 'สูตรคำนวณโอกาสคอมโบ/สวนกลับ เพดานอัตรา และระบบเจาะเกราะ/ลดดาเมจแยกตามระดับมอนสเตอร์',
  },
  hard: {
    label: '🔥 โหมด Hard (HARD)',
    short: 'โหมด Hard',
    summary: 'กำหนดกราฟความเก่งมอนโหมด Hard ตาม Base Lv ฮีโร่ อัตราโตเกิน Lv20 ตัวคูณรางวัล และเทิร์นที่ยืดเพิ่ม',
  },
  hardSkills: {
    label: '💢 สกิลสุ่มโหมด Hard (HARD_SKILLS)',
    short: 'สกิล Hard',
    summary: 'สกิลพิเศษที่มินิบอส/บอสในโหมด Hard สุ่มติดตัว 1 สกิล (แก้ความถี่ ความแรง จำนวนฮิต หรือสถานะดีบัฟได้)',
  },
  hardPassives: {
    label: '🧬 พาสซีฟสุ่มโหมด Hard (HARD_PASSIVES)',
    short: 'พาสซีฟ Hard',
    summary: 'พาสซีฟสุ่ม 1–2 อย่างที่มินิบอส/บอสโหมด Hard ได้รับตอนเริ่มสู้ (ดูดเลือด สะท้อน เร็วขึ้น พิษติดตัว คลั่ง ผิวเหล็ก)',
  },
  monStat: {
    label: '📐 สูตรสเตตัสมอน (MON_STAT / LEGACY)',
    short: 'สูตร stat มอน',
    summary: 'ควบคุมสูตรแปลง Base Lv → แต้มสเตตัส → HP/ATK/M.ATK/DEF/Hit ของมอน D6+ และ D1–5 รวมถึงการลดรางวัลเมื่อเลเวลห่างเกินไป',
  },
  archetypes: {
    label: '🧩 แม่แบบสเตตัสมอน (ARCHETYPES)',
    short: 'แม่แบบสเตตัส',
    summary: 'น้ำหนักสเตตัสสำรอง 6 สาย (ปัจจุบันตั้งแต่ v76 มอนทุกตัวมี statAlloc ของตัวเอง แม่แบบนี้ใช้เฉพาะตัวที่ไม่ได้ระบุสัดส่วน)',
  },
  skillScale: {
    label: '📈 สเกลสกิลมอน (SKILL_SCALE)',
    short: 'สเกลสกิลมอน',
    summary: 'กำหนดว่าสกิลมอนและท่าเฟสบอสแรงขึ้นตามสเตตัสเท่าไร และแต่ละเลเวลสกิล (+Lv) เพิ่มพลัง/ฮิต/สแต็กเร็วแค่ไหน',
  },
  progression: {
    label: '🌱 การเติบโตและ EXP (Progression)',
    short: 'EXP / ฟื้นฟู',
    summary: 'แต้มสเตตัสต่อ Base Lv เส้นโค้ง EXP (Base / Job / ในรอบวิ่ง) และการฮีลเมื่อผ่านห้องหรืออัปเลเวลในดันเจี้ยน',
  },
  kit: {
    label: '🎒 ตัวคูณคลาสหลักและร่ายเวท (KIT)',
    short: 'คิทคลาสหลัก',
    summary: 'ตัวคูณสกิลคลาส 1 (Archer / Mage / Cleric / Thief) กฎขัดการร่ายเวท และตัวเลขใยแมงมุมพระ (Cleric tree)',
  },
  skills: {
    label: '⚔️ สกิลอาชีพและอาชีพขั้น 2 (SKILLS)',
    short: 'สกิลอาชีพ',
    summary: 'ค่าร่าย คูลดาวน์ อัตราคริของสกิล ทักษะ 2 (base/per Lv) ทักษะ 3, Ult วิวัฒน์ และตัวเลขพาสซีฟของทั้ง 10 อาชีพขั้น 2',
  },
}

export const FX_TH: Record<keyof HitFx, string> = {
  poison: 'พิษ (ลด % HP/เทิร์น ซ้อนสแต็ก)',
  burn: 'เผาไหม้ (ลด % HP/เทิร์น + ตัดฮีลฮีโร่)',
  weaken: 'อ่อนแรง (ฮีโร่ตีเบาลงตาม weakenMul)',
  armorBreak: 'เกราะแตก (P.DEF / M.DEF ฮีโร่ลดตาม armorBreakMul)',
  silence: 'ใบ้ (ฮีโร่กดใช้สกิลไม่ได้)',
  slow: 'ช้า (ความเร็วโจมตี/เกจฮีโร่ลดตาม frozenHeart)',
  web: 'ใยพันตัว (AGI ฮีโร่ถูกคูณด้วย web.agi ลดหลบ/คอมโบ/ไว)',
  freeze: 'แช่แข็ง (สะสมเกจถึง 100 จะถูกแช่แข็งขยับไม่ได้)',
}

export const FX_NAME: Record<string, string> = {
  poison: 'ติดพิษ', burn: 'ติดเผาไหม้', weaken: 'ติดอ่อนแรง', armorBreak: 'ติดเกราะแตก',
  silence: 'ติดใบ้', slow: 'ติดช้า', web: 'ติดใยพันตัว', freeze: 'สะสมเกจแช่แข็ง',
}

export const STAT_TH: Record<string, string> = {
  str: 'STR (เพิ่ม ATK / พลังสกิลกายภาพ)',
  vit: 'VIT (เพิ่ม Max HP / DEF / ต้านสวนกลับ)',
  wis: 'WIS (เพิ่ม M.DEF / ต้านดีบัฟ / ฮีลและโล่)',
  dex: 'DEX (เพิ่ม Hit / ความเสถียรดาเมจ / ต้านสวนกลับ)',
  int: 'INT (เพิ่ม M.ATK / พลังเวท)',
  luk: 'LUK (เพิ่ม Crit / หลบโชคดี / ลดคริที่โดน)',
  agi: 'AGI (เพิ่ม Speed / Flee / คอมโบ)',
}

export const DUNGEON_LABEL: Record<string, string> = {
  d1: 'D1 ทุ่งเยลลี่', d2: 'D2 ป่าหมาป่าเงา', d3: 'D3 วิหารร้าง', d4: 'D4 บึงอสรพิษ', d5: 'D5 ปราสาทจอมมาร',
}

export const ARCH_TH: Record<string, string> = {
  bruiser: 'Bruiser (นักสู้สมดุล STR+VIT)',
  skirmisher: 'Skirmisher (พลิ้วไว AGI+DEX+LUK)',
  assassin: 'Assassin (นักฆ่าคริแรง ตัวบาง)',
  caster: 'Caster (จอมเวท INT+WIS)',
  tank: 'Tank (แทงก์อึด VIT+WIS)',
  support: 'Support (ซัพพอร์ต/ฮีล WIS+INT)',
}

export const CLS_TH: Record<string, string> = {
  swordsman: 'นักดาบ', archer: 'นักธนู', mage: 'นักเวท', cleric: 'นักบวช', thief: 'โจร',
}

export const SLOT_TH: Record<string, string> = {
  s1: 'ทักษะ 1 (สกิลหลัก)', s2: 'ทักษะ 2 (ทั้ง 3 ท่า)', ult: 'Ult (ท่าไม้ตาย)',
}

export const SKILL2_BY_ID = new Map(SKILL2.map((s) => [s.id, s]))
