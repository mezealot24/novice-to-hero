import { HARD_PASSIVES, HARD_SKILLS, type HitFx } from '../../data/game-data'
import { ARCH_TH, DUNGEON_LABEL, FX_NAME, FX_TH, STAT_TH, type FieldExplain } from './labels'
import { explainSkillLeaf } from './monsters'

const COMBO_EXPLAIN: Record<string, FieldExplain> = {
  baseCount: {
    label: 'จำนวนคอมโบพื้นฐานฮีโร่ (ฮิตเสริม)',
    effect: 'เพิ่ม = ฮีโร่ทุกคนเริ่มด้วยสิทธิ์คอมโบต่อชุดยาวขึ้น (ต้องลุ้นอัตราติดทีละฮิต)',
    detail: 'จำนวนฮิตเสริมสูงสุดพื้นฐาน (รวมกับ +จากอาวุธ/การ์ด) โดยทอยโอกาสติดต่อไปเรื่อย ๆ จนกว่าจะพลาด',
  },
  rateCap: {
    label: 'เพดานอัตราคอมโบ/สวนกลับรวม',
    effect: 'เพิ่ม = อนุญาตให้สะสม % คอมโบ/สวนกลับเกิน 100% ไปสู้กับค่าต้าน Ignore ของบอสได้สูงขึ้น',
    detail: '1.5 = ตันที่ 150% (ส่วนที่เกิน 100% มีประโยชน์ไว้หักล้างค่า ignore/ignoreCounter ของมินิบอสและบอส)',
  },
  dmgFloor: {
    label: 'พื้นต่ำสุดตัวคูณดาเมจ (Damage Floor)',
    effect: 'เพิ่ม = แม้เจอบอสลดดาเมจคอมโบ/สวนกลับหนักแค่ไหน ดาเมจก็ไม่ร่วงต่ำกว่าสัดส่วนนี้ (0.2 = อย่างน้อย 20%)',
    detail: 'ป้องกันไม่ให้สกิลตีปกติ/คอมโบ/สวนกลับเหลือ 0 ดาเมจ',
  },
  hardAdd: {
    label: 'โบนัสต้านทานของมอนในโหมด Hard/หอคอย',
    effect: 'เพิ่ม = มินิบอส/บอสใน Hard และหอคอยต้านคอมโบ/สวนกลับของฮีโร่เก่งขึ้น (+0.1 = +10%)',
    detail: 'บวกเพิ่มเข้าไปใน ignore, comboDR, ignoreCounter, counterDR ของฝั่งมอน',
  },
  defCap: {
    label: 'เพดานป้องกันคอมโบ/สวนกลับจาก Stats ฮีโร่',
    effect: 'เพิ่ม = ฮีโร่ที่อัป AGI/DEX/VIT สูง ๆ จะกันคอมโบ/สวนกลับมอนได้เกือบสมบูรณ์ (ตันที่ค่านี้, การ์ดบวกแยกต่างหาก)',
    detail: 'ค่าเริ่มต้น 0.3 (30%) สำหรับสูตร stat/(stat+defK)',
  },
  critDRCap: {
    label: 'เพดานลดดาเมจคริจาก LUK ฮีโร่',
    effect: 'เพิ่ม = ฮีโร่สาย LUK ลดความแรงคริของมอนได้ลึกกว่าเดิม (0.5 = ลดสูงสุด 50%)',
    detail: 'คูณกับ (monCritMul × (1 - critDR)) โดยไม่ต่ำกว่า 1×',
  },
  critShieldCap: {
    label: 'เพดานลดโอกาสคริมอนจาก LUK ฮีโร่ (แบบ RO)',
    effect: 'เพิ่ม = ฮีโร่สาย LUK ลดโอกาสที่มอนจะติดคริได้มากขึ้น (0.5 = ลดได้สูงสุด 50 จุด%)',
    detail: 'โอกาสคริมอน = max(0, คริมอน - min(cap, LUK × 0.2%)) · ใช้กับทุกการทอยคริของมอน (ตีปกติ/คอมโบ/สวนกลับ/Bullet Time/สกิล)',
  },
  defK: {
    label: 'ตัวหารโค้งต้านทานฮีโร่ (defK)',
    effect: 'ลดเลข = ฮีโร่ต้องการ AGI/DEX/VIT/LUK น้อยลงก็ถึงเพดานกันแล้ว · เพิ่ม = ต้องปั้นสเตตัสหนักขึ้น',
    detail: 'สูตร x / (x + defK) · เช่น defK 400 ต้องมี stat 400 เพื่อได้ครึ่งเดียวก่อนถึง Cap',
  },
}

const TIER_TH: Record<string, string> = { normal: 'มอนปกติ', mini: 'มินิบอส', boss: 'บอส (MVP)' }
export function explainCombo(path: string): FieldExplain {
  if (COMBO_EXPLAIN[path]) return COMBO_EXPLAIN[path]
  const [cat, tier] = path.split('.')
  const t = TIER_TH[tier] ?? tier
  if (cat === 'ignore') return { label: `มอนเมินคอมโบฮีโร่ · ${t}`, effect: `เพิ่ม = หักลบโอกาสคอมโบของฮีโร่เมื่อสู้กับ${t} (0.25 = หักออก 25%p)`, detail: 'ลดโอกาสติดคอมโบของฮีโร่โดยตรง (สะสม rate เกิน 100% ช่วยหักล้างได้)' }
  if (cat === 'basicDR') return { label: `มอนลดดาเมจตีปกติ/สวน · ${t}`, effect: `เพิ่ม = ${t}รับดาเมจจากการตีธรรมดาและสวนกลับเบาลง (ไม่กระทบสกิล)`, detail: 'นำไปหักลบในสูตร 1 + basicDmg - basicDR' }
  if (cat === 'comboDR') return { label: `มอนลดดาเมจฮิตคอมโบ · ${t}`, effect: `เพิ่ม = ${t}รับดาเมจเฉพาะฮิตคอมโบแถมเบาลง ลดความโกงของบิวท์ตีรัว`, detail: 'หักลบเพิ่มจาก basicDR ในฮิตคอมโบเท่านั้น' }
  if (cat === 'ignoreCounter') return { label: `มอนเมินสวนกลับฮีโร่ · ${t}`, effect: `เพิ่ม = ลดโอกาสฮีโร่สวนกลับเมื่อสู้กับ${t} (บีบสาย Counter)` }
  if (cat === 'counterDR') return { label: `มอนลดดาเมจฮิตสวนกลับ · ${t}`, effect: `เพิ่ม = ${t}โดนดาเมจจากท่าสวนกลับเบาลง`, detail: 'หักลบร่วมกับ basicDR เวลาฮีโร่ตีสวนกลับ' }
  return { label: path, effect: 'ค่าสูตรคอมโบ/สวนกลับ' }
}

export function explainHard(path: string): FieldExplain {
  const staticHard: Record<string, FieldExplain> = {
    hpGrow: { label: 'อัตราโต HP เกิน Lv 20 (ทบต้น/Lv)', effect: 'เพิ่ม = ผู้เล่น Lv 21–45 ลง Hard เจอบอสเลือดหนาขึ้นแบบทวีคูณ (1.08 = +8% ต่อ Lv)' },
    dmgGrow: { label: 'อัตราโต ATK เกิน Lv 20 (ทบต้น/Lv)', effect: 'เพิ่ม = ผู้เล่น Lv 21–45 ลง Hard เจอมอนตีแรงขึ้นทวีคูณ (1.04 = +4% ต่อ Lv)' },
    maxLv: { label: 'เพดาน Base Lv ที่ Hard สเกลตาม', effect: 'เพิ่ม = คนเลเวลสูงเกิน 45 ยังเจอมอนเก่งขึ้นเรื่อย ๆ ไม่ตันเร็ว · ลด = ฟาร์ม Hard ชิลขึ้นเมื่อ Lv สูง' },
    hp: { label: 'ตัวคูณ HP ฐานโหมด Hard', effect: 'เพิ่ม = มอนโหมด Hard เลือดเยอะขึ้นทันทีทุกระดับเลเวล (1.3 = +30% ทับกราฟ)' },
    atk: { label: 'ตัวคูณ ATK ฐานโหมด Hard', effect: 'เพิ่ม = มอนโหมด Hard ตีและยิงเวทแรงขึ้นทันทีทุกระดับ (1.3 = +30% ทับกราฟ)' },
    turnMul: { label: 'ตัวคูณเทิร์นจำกัดโหมด Hard', effect: 'เพิ่ม = ให้เวลาสู้ในโหมด Hard นานขึ้นตามเลือดที่หนาขึ้น (1.4 = +40% เทิร์น)' },
    reward: { label: 'ตัวคูณรางวัลโหมด Hard (Zeny / EXP)', effect: 'เพิ่ม = ลง Hard คุ้มค่ากว่าปกติมากขึ้น (ก่อนคูณ (อัตราส่วน HP)^rewardPow)' },
    mats: { label: 'ตัวคูณวัตถุดิบคราฟต์โหมด Hard', effect: 'เพิ่ม = ดรอปวัตถุดิบตีบวก/คราฟต์ในโหมด Hard เยอะขึ้น (ปัดขึ้น)' },
    rewardPow: { label: 'เลขยกกำลังโบนัสรางวัลตามความถึก (rewardPow)', effect: 'เพิ่ม = ยิ่งลง Hard ที่เลเวลสูง (มอนเลือดบวมกว่าเดิมมาก) รางวัลยิ่งคูณพุ่งแรงตามอัตราส่วน HP' },
    hitPerLv: { label: 'Hit ที่มอน Hard ได้เพิ่มต่อ Lv', effect: 'เพิ่ม = ยิ่งฮีโร่ Base Lv สูงกว่าดัน มอน Hard ยิ่งตีแม่นขึ้น แก้ทางสาย Flee หลบสบายเกินไป' },
  }
  if (staticHard[path]) return staticHard[path]
  const p = path.split('.')
  if (p[0] === 'recLv') {
    const d = DUNGEON_LABEL[p[1]] ?? p[1]
    return {
      label: `Lv แนะนำ · ${d}`,
      effect: 'เพิ่ม = จุดเริ่มคิดสเกล Hard สูงขึ้น (ฮีโร่ Lv ต่ำกว่านี้จะได้มอนเบาลงตามกราฟ)',
      detail: 'ถ้า Base Lv ฮีโร่ ≤ recLv มอน Hard จะสเกลตาม (hp/atk × ฐาน) เท่านั้น ไม่บวก Gap เพิ่ม',
    }
  }
  if (p[0] === 'curve') {
    const dName = ['D1 ทุ่งเยลลี่', 'D2 ป่าหมาป่าเงา', 'D3 วิหารร้าง', 'D4 บึงอสรพิษ', 'D5 ปราสาทจอมมาร'][Number(p[1])] ?? `จุดที่ ${p[1]}`
    const k = p[2]
    if (k === '0') return { label: `กราฟ Hard ${dName} · จุด Lv อ้างอิง`, effect: 'ปรับตำแหน่งจุดอ้างอิงบนแกน Base Lv ของกราฟไต่ระดับความโหด' }
    if (k === '1') return { label: `กราฟ Hard ${dName} · HP บอสอ้างอิง`, effect: 'เพิ่ม = ดึงความอึดของมอน Hard ช่วง Lv นี้ขึ้น · ลด = ช่วง Lv นี้บางลง (กราฟลากเส้นต่อจุด)' }
    if (k === '2') return { label: `กราฟ Hard ${dName} · ATK บอสอ้างอิง`, effect: 'เพิ่ม = ดึงดาเมจมอน Hard ช่วง Lv นี้ขึ้น · ลด = ตีเบาลง' }
  }
  return { label: path, effect: 'ค่าปรับสมดุลโหมด Hard' }
}

export function explainHardSkill(path: string): FieldExplain {
  const [idxStr, ...rest] = path.split('.')
  const i = Number(idxStr)
  const sk = HARD_SKILLS[i]
  const prefix = sk ? `${i} · ${sk.name} (${sk.kind})` : `สกิล Hard #${i}`
  return explainSkillLeaf(rest, prefix, sk)
}

export function explainHardPassive(path: string): FieldExplain {
  const [idxStr, ...rest] = path.split('.')
  const i = Number(idxStr)
  const hp = HARD_PASSIVES[i]
  const head = hp ? `${i} · ${hp.name}` : `พาสซีฟ Hard #${i}`
  const leaf = rest.join('.')
  if (rest[0] === 'onHit') {
    const fx = rest[1] as keyof HitFx
    return { label: `${head} · ตีติด${FX_NAME[fx]?.replace(/^ติด/, '') ?? fx}`, effect: `ตั้ง > 0 = บอส Hard ที่สุ่มได้พาสซีฟนี้จะยัดสถานะนี้ทุกครั้งที่ตีโดน`, detail: FX_TH[fx] }
  }
  switch (leaf) {
    case 'lifesteal': return { label: `${head} · ดูดเลือด`, effect: 'เพิ่ม = ตีโดนทีไรเด้งเลือดคืนมากขึ้น (0.15 = ดูด 15% ดาเมจที่ทำได้)' }
    case 'reflect': return { label: `${head} · สะท้อนดาเมจ`, effect: 'เพิ่ม = ตีมอนตัวนี้แล้วสะท้อนกลับใส่ฮีโร่แรงขึ้น (ตันที่ battle.reflectCap)' }
    case 'speed': return { label: `${head} · ความเร็ว ×`, effect: 'เพิ่ม = มอนที่ได้พาสซีฟนี้จะออกเทิร์นเร็วกว่าปกติ (1.2 = +20%)' }
    case 'enrage': return { label: `${head} · ดาเมจ × ตอนคลั่ง (<35% HP)`, effect: 'เพิ่ม = พอบอส Hard เลือดต่ำกว่า 35% จะตีแรงขึ้นมาก (แถมเร็วขึ้น +15% ตามสคริปต์)' }
    case 'def': return { label: `${head} · โบนัส P.DEF +`, effect: 'เพิ่ม = มอนได้เกราะกายภาพเพิ่มตรง ๆ (ช่วยกันสายกายภาพที่ไม่ติดคริ)' }
    default: return { label: `${head} · ${leaf}`, effect: 'พาสซีฟสุ่มในโหมด Hard' }
  }
}

const MON_STAT_MAP: Record<string, FieldExplain> = {
  'monStat.tierPct.normal': { label: 'สัดส่วนแต้ม stat · มอนปกติ', effect: 'เพิ่ม = มอนปกติใน D6+ ได้แต้มสเตตัสต่อเลเวลมากขึ้น (0.5 = ได้ 50% ของฮีโร่)' },
  'monStat.tierPct.mini': { label: 'สัดส่วนแต้ม stat · มินิบอส', effect: 'เพิ่ม = มินิบอสใน D6+ เก่งขึ้นรอบด้าน (1.0 = ได้แต้มเท่าฮีโร่)' },
  'monStat.tierPct.boss': { label: 'สัดส่วนแต้ม stat · บอส (MVP)', effect: 'เพิ่ม = บอส D6+ มีแต้มสเตตัสสูงขึ้นมาก (1.5 = 150% ของฮีโร่)' },
  'monStat.hardAdd': { label: 'โบนัสสัดส่วนแต้มในโหมด Hard/หอคอย', effect: 'เพิ่ม = มอน D6+ ในโหมด Hard บวกสัดส่วนแต้ม stat เพิ่มจากเดิม (+0.5 = +50%)' },
  'monStat.levelBase.hp': { label: 'ค่าฐาน HP ต่อ Lv (แทนค่าเกราะผู้เล่น)', effect: 'เพิ่ม = มอน D6+ เลือดพื้นฐานสูงขึ้นทุกตัวต่อ 1 เลเวล (นำไปคูณ body ด้วย!)' },
  'monStat.levelBase.atk': { label: 'ค่าฐาน P.ATK ต่อ Lv', effect: 'เพิ่ม = ดาเมจกายภาพพื้นฐานของมอนทุกตัวต่อเลเวลแรงขึ้น (เช่น Lv40 × 3.5 = +140 ATK)' },
  'monStat.levelBase.matk': { label: 'ค่าฐาน M.ATK ต่อ Lv', effect: 'เพิ่ม = ดาเมจเวทพื้นฐานของมอนทุกตัวต่อเลเวลแรงขึ้น' },
  'monStat.levelBase.def': { label: 'ค่าฐาน P.DEF ต่อ Lv', effect: 'เพิ่ม = ยิ่งดันลึกมอนยิ่งเกราะหนา (บีบให้ฮีโร่ต้องปั้นคริหรือเจาะเกราะ)' },
  'monStat.levelBase.hit': { label: 'ค่าฐาน Hit ต่อ Lv', effect: 'เพิ่ม = ยิ่งดันลึกมอนยิ่งตีแม่น (บีบสาย Flee ต้องอัปเลเวลเกียร์ตาม)' },
  'monStat.body.normal': { label: 'ตัวคูณรูปร่าง HP · มอนปกติ', effect: 'เพิ่ม = มอนปกติ D6+ ทุกตัวเลือดหนาขึ้นทั้งระบบ (ค่าปกติ 1)' },
  'monStat.body.mini': { label: 'ตัวคูณรูปร่าง HP · มินิบอส', effect: 'เพิ่ม = มินิบอส D6+ อึดขึ้นหลายเท่าเพื่อไม่ให้จบไวเกินไป (ค่าปกติ 5)' },
  'monStat.body.boss': { label: 'ตัวคูณรูปร่าง HP · บอส (MVP)', effect: 'เพิ่ม = บอส D6+ ทุกตัวอึดขึ้นมาก (ค่าปกติ 8 เท่าของสเตตัส+levelBase)' },
  'monStat.hpScale.normal': { label: 'HP ท้ายเกม · มอนปกติ', effect: 'คูณ HP เพิ่มจาก body ไต่จาก x1 ที่ fromLv ถึงเต็มที่ fullLv (ค่าปกติ 2)' },
  'monStat.hpScale.mini': { label: 'HP ท้ายเกม · มินิบอส', effect: 'คูณ HP มินิบอสเพิ่มจาก body (ค่าปกติ 4)' },
  'monStat.hpScale.boss': { label: 'HP ท้ายเกม · บอส (MVP)', effect: 'คูณ HP บอสเพิ่มจาก body (ค่าปกติ 10)' },
  'monStat.hpScale.fromLv': { label: 'HP ท้ายเกม · เริ่มที่ Lv', effect: 'Lv นี้ลงไปคูณ x1 (ค่าปกติ 21 = D1-D5 เหมือนเดิม) ตั้งเท่ากับ fullLv = เต็มทุกเลเวล' },
  'monStat.hpScale.fullLv': { label: 'HP ท้ายเกม · เต็มที่ Lv', effect: 'Lv นี้ขึ้นไปคูณเต็ม (ค่าปกติ 80 = D10+)' },
  'hell.bossHp': { label: '😈 นรก · ตัวคูณ HP บอส MVP', effect: 'คูณ Max HP บอส MVP โหมดนรก (ค่าปกติ 0.5 = เหลือครึ่ง) มินิบอส/มอนปกติไม่โดน' },
  'hell.bossHpCap': { label: '😈 นรก · เพดาน HP บอส MVP (เท่าของโหมดยาก)', effect: 'HP บอส MVP นรกไม่เกิน x เท่านี้ของบอสตัวเดียวกันในโหมดยากห้องเดียวกัน (ค่าปกติ 2.5, 0 = ไม่มีเพดาน)' },
  'monStat.vitHp': { label: 'HP ต่อ VIT ของมอน', effect: 'มอนได้ HP ต่อแต้ม VIT เท่านี้ (ค่าปกติ 10, ฮีโร่ได้ 25)' },
  'monStat.mdefCap': { label: 'เพดานกันเวท (M.DEF Cap) ของมอน', effect: 'เพิ่ม = มอนสาย WIS สูงสามารถลดดาเมจเวทได้ลึกขึ้น (0.75 = กันได้สูงสุด 75%)' },
  'monStat.luckyCap': { label: 'เพดานหลบโชคดี (Lucky Dodge) ของมอน', effect: 'เพิ่ม = มอนสาย LUK สูงหลบได้แม้แต่คริ/เวทถี่ขึ้น (0.25 = สูงสุด 25%)' },
  'monStat.rateCap': { label: 'เพดาน Crit / Combo / Counter มอน', effect: 'เพิ่ม = ยอมให้มอนสะสมเรตคอมโบ/สวนกลับเกิน 100% เพื่อสู้กับการต้านของฮีโร่ได้มากขึ้น' },
}
export function explainMonStat(path: string): FieldExplain {
  if (MON_STAT_MAP[path]) return MON_STAT_MAP[path]
  return { label: path, effect: 'ค่าสูตรสเตตัสมอน' }
}

export function explainArchetype(path: string): FieldExplain {
  const [arch, stat] = path.split('.')
  return {
    label: `${ARCH_TH[arch] ?? arch} · ${(stat ?? '').toUpperCase()}`,
    effect: `เพิ่ม = แม่แบบสาย ${arch} เน้น ${STAT_TH[stat] ?? stat} เยอะขึ้น (ใช้เป็นค่าสำรองถ้ามอนไม่ระบุ statAlloc เอง)`,
  }
}

export const SKILL_SCALE_MAP: Record<string, FieldExplain> = {
  per: { label: 'ตัวคูณแรงสกิลต่อ 1 แต้ม stat เกินค่ากลาง', effect: 'เพิ่ม = มอนที่อัป stat ตรงสาย (เช่น Mage อัป INT) จะร่ายสกิลแรงต่างจากมอนทั่วไปชัดเจน (0.003 = +0.3%/แต้ม)' },
  min: { label: 'ตัวคูณสเกลสกิลขั้นต่ำ (Floor)', effect: 'เพิ่ม = มอนที่ stat ต่ำกว่าเกณฑ์จะร่ายสกิลไม่เบาจนเกินไป (0.8 = อย่างน้อย 80%)' },
  max: { label: 'ตัวคูณสเกลสกิลสูงสุด (Cap)', effect: 'เพิ่ม = ปลดล็อกให้บอสสายเฉพาะทางที่ stat พุ่งแรงสามารถเบิร์สต์สกิลทะลุ ×1.5 ได้' },
  'fx.phaseHeal.per': { label: 'เฟสฮีลบอส: เพิ่มตาม WIS (/แต้ม)', effect: 'เพิ่ม = ยิ่งบอสมี WIS สูง ฮีลตอนเข้าเฟสจะเด้งเยอะกว่าเดิม' },
  'fx.phaseShield.per': { label: 'เฟสโล่บอส: เพิ่มตาม WIS (/แต้ม)', effect: 'เพิ่ม = ยิ่งบอสมี WIS สูง โล่ตอนเข้าเฟสจะหนากว่าเดิม' },
  'fx.razor.per': { label: 'Blood Razor: เพิ่มตาม INT (/แต้ม)', effect: 'เพิ่ม = มอนที่มี Blood Razor + INT สูงจะกัด % เลือดฮีโร่เจ็บขึ้น' },
  'lv.powPer': { label: 'เลเวลสกิลมอน: แรงขึ้นต่อ +1 Lv', effect: 'เพิ่ม = ทุก ๆ +1 เลเวลสกิลมอน (เช่นในหอคอยลึก ๆ) สกิลจะแรงพุ่งไวขึ้น (0.1 = +10%/Lv)' },
  'lv.hitsEvery': { label: 'เลเวลสกิลมอน: +1 ฮิตทุกกี่ Lv', effect: 'ลดเลข = มอนเลเวลสกิลสูง (หอคอย) จะได้จำนวนฮิตเพิ่มเร็วขึ้น! (0 = ปิดไม่เพิ่มฮิต)' },
  'lv.fxEvery': { label: 'เลเวลสกิลมอน: +1 สแต็กดีบัฟทุกกี่ Lv', effect: 'ลดเลข = พิษ/เผา/เกราะแตกจากสกิลมอนเพิ่มจำนวนชั้นเร็วขึ้นตามเลเวลสกิล (0 = ปิด)' },
  'lv.turnsEvery': { label: 'เลเวลสกิลมอน: +1 เทิร์น Warcry ทุกกี่ Lv', effect: 'ลดเลข = บัฟ Warcry ของมอนอยู่นานขึ้นเร็วกว่าเดิมตามเลเวลสกิล (0 = ปิด)' },
}

export const PROGRESSION_MAP: Record<string, FieldExplain> = {
  'stat.pointsPerLevel': { label: 'แต้ม Stat ต่อ Base Lv (ฮีโร่ + มอน)', effect: 'เพิ่ม = ฮีโร่เก่งไวขึ้นทุกเวล + ⚠️ ส่งผลให้แต้มสเตตัสมอน D6+ (MON_STAT.pointsPerLv) พุ่งตามด้วย!' },
  'stat.xpBase': { label: 'Account EXP ที่ต้องใช้ Lv แรก', effect: 'เพิ่ม = ผู้เล่นเลเวลอัปช่วงต้นเกมช้าลง ต้องฟาร์มมากขึ้น' },
  'stat.xpStep': { label: 'Account EXP ที่เพิ่มต่อเลเวล', effect: 'เพิ่ม = กราฟเก็บเวลช่วงกลาง–ท้ายเกมชันขึ้น (อัป Base Lv ยากขึ้น)' },
  'job.xpBase': { label: 'Job EXP ที่ต้องใช้ Lv แรก', effect: 'เพิ่ม = ปลดล็อกจุดเปลี่ยนอาชีพ (Job Lv 10) ช้าลง' },
  'job.xpStep': { label: 'Job EXP ที่เพิ่มต่อเลเวล', effect: 'เพิ่ม = อัป Job Lv แต่ละขั้นยากขึ้น' },
  'run.runXpBase': { label: 'EXP ในรอบวิ่ง (Lv 1)', effect: 'เพิ่ม = ในแต่ละรอบดันเจี้ยน ฮีโร่ได้เลือกอัปสกิล/การ์ดรอบแรกรอนานขึ้น' },
  'run.runXpStep': { label: 'EXP ในรอบวิ่ง (+ต่อ Lv)', effect: 'เพิ่ม = ท้ายดันเจี้ยนได้เลือกสกิลอัปในรันน้อยครั้งลง' },
  'run.xpOnClear': { label: 'EXP ในรันที่ได้ทันทีเมื่อเคลียร์ห้อง', effect: 'เพิ่ม = การันตี EXP โบนัสทุกห้อง ช่วยให้เลเวลในรันพุ่งแม้เจอห้องมอนน้อยตัว' },
  'run.failXpMul': { label: 'EXP เมื่อตาย/ล้มเหลวใน Dxx (× Base + Job EXP)', effect: 'เพิ่ม = ตายแล้วยังได้ EXP เยอะ (0.25 = ได้ 1/4 · 1 = เต็มแบบเดิม) · zeny / ของดรอปไม่โดนลด' },
  'run.hellDeathBase': { label: '😈 ตายในโหมดนรก: เสีย Base EXP (% ของหลอด Lv ปัจจุบัน)', effect: 'เพิ่ม = ตายใน Hell แล้วเสีย Base EXP มากขึ้น (ไม่ลดเลเวล)' },
  'run.hellDeathJob': { label: '😈 ตายในโหมดนรก: เสีย Job EXP (% ของหลอด Job Lv ปัจจุบัน)', effect: 'เพิ่ม = ตายใน Hell แล้วเสีย Job EXP มากขึ้น (ไม่ลดเลเวล)' },
  'run.healOnClear': { label: 'ฮีลหลังผ่านห้อง (% Max HP)', effect: 'เพิ่ม = ยืนระยะในดันเจี้ยนยาว ๆ ง่ายขึ้น หลังจบห้องเด้งเลือดคืนเยอะ (0.2 = 20%)' },
  'run.healOnLevel': { label: 'ฮีลเมื่ออัป Lv ในรัน (% Max HP)', effect: 'เพิ่ม = จังหวะเวลอัปในดันช่วยกู้สถานการณ์เลือดใกล้หมดได้ดีขึ้น (0.2 = 20%)' },
  // ☀️ dungeon days (data/dungeon-days.ts)
  'days.on': { label: '☀️ ระบบวัน: เปิด (1) / ปิด (0)', effect: '0 = ทุกดันกลับไปเป็น 6 ด่านเดิม ไม่มีมอนดันเก่า' },
  'days.from': { label: '☀️ เริ่มใช้ระบบวันตั้งแต่ดันที่', effect: '2 = D1 ยังเป็นดันสอนเล่นแบบเดิม D2 ขึ้นไปเป็นวัน' },
  'days.base': { label: '☀️ จำนวนวันของดันแรกที่ใช้ระบบ', effect: 'เพิ่ม = ทุกดันยาวขึ้นทันที (1 วัน = เวฟ × waves + ศึกท้ายวัน 1)' },
  'days.every': { label: '☀️ +1 วันทุกๆ กี่ดัน', effect: 'ลด = ความยาวดันโตเร็วขึ้นตามเลขดัน (1 = ทุกดันยาวขึ้น 1 วัน)' },
  'days.max': { label: '☀️ จำนวนวันสูงสุด', effect: 'เพดานความยาวดัน (6 วัน × 3 = 18 ด่าน)' },
  'days.waves': { label: '☀️ เวฟต่อวัน (ก่อนศึกท้ายวัน)', effect: 'เพิ่ม = วันยาวขึ้น ได้อีเวนต์ต่อวันเยอะขึ้น' },
  'days.size': { label: '☀️ มอนต่อเวฟเสียงสะท้อน', effect: 'จำนวนมอนในเวฟแทรกกลางดัน (สูงสุด 4 ช่อง)' },
  'days.eliteSize': { label: '☀️ มอนในศึกท้ายวันแบบฝูงหัวหน้า', effect: 'ใช้เมื่อยังไม่มีมินิบอสให้ดึง (D2-D3)' },
  'days.native': { label: '☀️ มอนดันนี้ในเวฟเสียงสะท้อน (ตัว)', effect: 'ที่เหลือเป็นมอนจากดันที่ผ่านมา (ปรับ Lv ตามห้องนี้) · เพิ่ม = มอนเก่าน้อยลง' },
  'days.returnMini': { label: '☀️ มินิบอสดันเก่าหวนคืน (1/0)', effect: '1 = ศึกท้ายวันกลางดันสุ่มมินิบอสจากดันเก่าด้วย' },
  'days.dayEndLv': { label: '☀️ D6+: Lv ศึกท้ายวันสูงกว่าเวฟสุดท้ายของวัน', effect: 'เพิ่ม = ศึกท้ายวันโหดขึ้น (ไม่เกิน Lv บอส - 1)' },
  'days.dayEndEvents': { label: '☀️ อีเวนต์เพิ่มหลังศึกท้ายวัน', effect: 'เพิ่ม = คืนกองไฟได้อีเวนต์มากขึ้น ฮีโร่แกร่งขึ้นระหว่างทาง' },
  'days.dayHeal': { label: '☀️ ฮีลตอนเริ่มวันใหม่ (% Max HP)', effect: 'เพิ่ม = ดันยาวๆ ยืนระยะง่ายขึ้น (0.15 = 15%)' },
}

export const KIT_EXPLAIN: Record<string, FieldExplain> = {
  archerAutoShots: { label: 'Archer · ทักษะ 1: จำนวนศรปกติ', effect: 'เพิ่ม = ยิงหลายดอกต่อเทิร์น (ทริกเกอร์คริ/พิษ/เหยี่ยวได้ถี่ขึ้น)' },
  archerVolleyShots: { label: 'Archer · ทักษะ 1 (ศรสาด): จำนวนศร', effect: 'เพิ่ม = โหมดกระจายเป้าโดนมอนมากขึ้น/ฮิตเยอะขึ้นต่อการกด 1 ครั้ง' },
  archerAuto: { label: 'Archer · ทักษะ 1: ดาเมจต่อดอก × P.ATK', effect: 'เพิ่ม = การยิงทุกดอกของนักธนูแรงขึ้นโดยตรง (ทักษะหลักใช้บ่อยสุด)' },
  archerUlt: { label: 'Archer · Ult: ศรทะลวง × P.ATK', effect: 'เพิ่ม = Ult ศรทะลวงเป้าหมายเดี่ยวเบิร์สต์บอสแรงขึ้น (ส่งผลถึง Beastmaster/Innovator Stampede ด้วย)' },
  mageFire: { label: 'Mage · Ult ไฟ: ความแรง × พลังเวท (Pm)', effect: 'เพิ่ม = ระเบิดไฟ (Hellfire) เผาทั้งกลุ่มแรงขึ้น' },
  mageFireStacks: { label: 'Mage · Ult ไฟ: จำนวนสแต็กเผาไหม้', effect: 'เพิ่ม = มอนติดไฟเผาแรงขึ้นต่อเทิร์นและโดนตัดฮีลนานขึ้น' },
  mageIce: { label: 'Mage · Ult น้ำแข็ง: ความแรง × พลังเวท', effect: 'เพิ่ม = พายุน้ำแข็ง (Blizzard) ทำดาเมจสูงขึ้น' },
  mageIceChill: { label: 'Mage · Ult น้ำแข็ง: ติดช้านาน (เทิร์น)', effect: 'เพิ่ม = ศัตรูทั้งกลุ่มเดินเกจช้าลงนานขึ้น มีเวลาทำดาเมจมากขึ้น' },
  mageLightHits: { label: 'Mage · Ult สายฟ้า: จำนวนฮิตสุ่ม', effect: 'เพิ่ม = สายฟ้าฟาด (Lightning Wrath) ตกลงมาเยอะลูกขึ้นต่อรอบ' },
  mageLightLo: { label: 'Mage · Ult สายฟ้า: ตัวคูณต่ำสุดต่อลูก', effect: 'เพิ่ม = ยกพื้นความแรงขั้นต่ำของสายฟ้าแต่ละฮิตให้เสถียรขึ้น' },
  mageLightHi: { label: 'Mage · Ult สายฟ้า: ตัวคูณสูงสุดต่อลูก', effect: 'เพิ่ม = เพิ่มเพดานลูกที่ฟาดโดนแรงสุดของสายฟ้า (สายสุ่มเบิร์สต์)' },
  'cast.breakBase': { label: 'Mage ร่ายเวท: โอกาสพื้นฐานโดนตีแล้วร่ายแตก', effect: 'เพิ่ม = ถ้านักเวทโดนตีระหว่างชาร์จ Ult จะถูกขัดการร่ายง่ายขึ้น (0.25 = 25%)' },
  'cast.breakDex': { label: 'Mage ร่ายเวท: DEX ช่วยกันร่ายแตก (/แต้ม)', effect: 'เพิ่ม = อัป DEX นิดเดียวก็ลดโอกาสโดนตีแล้วเวทแตกได้เยอะ' },
  'cast.breakMinHp': { label: 'Mage ร่ายเวท: ขั้นต่ำ % HP ที่เสี่ยงแตก', effect: 'เพิ่ม = ต้องโดนตีแรงทะลุสัดส่วน HP นี้เท่านั้นจึงจะเช็กโอกาสแตก (0.06 = ≥6% Max HP)' },
  'cast.breakRefund': { label: 'Mage ร่ายเวท: คืน % Mana เมื่อร่ายแตก', effect: 'เพิ่ม = ต่อให้โดนขัดร่ายก็ไม่เสีย Mana ฟรีทั้งหมด (0.6 = คืน 60%)' },
  'cast.fireMul': { label: 'Mage · ทักษะ 1: ลูกไฟระเบิด × พลังเวท', effect: 'เพิ่ม = ท่าโจมตีพื้นฐาน (ร่ายทันที) ของนักเวทแรงขึ้น' },
  'cast.ultMul': { label: 'Mage ร่ายเวท: ตัวคูณความแรงตอนปล่อยชาร์จ', effect: 'เพิ่ม = รางวัลความเสี่ยงจากการร่าย 1 เทิร์นสูงขึ้น (1.3 = แรง ×1.3 ทุกธาตุ)' },
  'cast.brokenUltCd': { label: 'Mage ร่ายเวท: CD เมื่อร่ายแตก (เทิร์น)', effect: 'ลดเลข = ถึงร่ายโดนตีแตกก็วนกลับมาร่าย Ult ใหม่ได้ไวขึ้น (ปกติ 2 เทิร์น)' },
  'cast.boltMana': { label: 'Mage ตีธรรมดา: ฟื้น Mana เมื่อปาลูกเวทเล็ก', effect: 'เพิ่ม = จังหวะกดตีปกติตอน Mana หมดฟื้น Mana กลับมาใช้สกิลไวขึ้น' },
  'monCast.breakBase': { label: 'บอสร่ายเวท: โอกาสพื้นฐานตีแล้วร่ายแตก', effect: 'เพิ่ม = ตีบอส/มินิบอสที่กำลังร่ายแรง ๆ แล้วขัดการร่ายได้ง่ายขึ้น (0.25 = 25% ก่อนหักต้าน)' },
  'monCast.breakMinHp': { label: 'บอสร่ายเวท: ขั้นต่ำ % Max HP มอนที่เสี่ยงแตก', effect: 'เพิ่ม = ต้องตีเข้าเลือดบอสแรงทะลุสัดส่วนนี้ต่อฮิตจึงจะเช็กโอกาสร่ายแตก (0.015 = ≥1.5% Max HP)' },
  'monCast.hardResist': { label: 'บอสร่ายเวท: ต้านร่ายแตกเพิ่มในโหมด Hard/Hell', effect: 'เพิ่ม = ในโหมดยาก บอสร่ายแตกยากขึ้น (หักจากโอกาสพื้นฐาน)' },
  'monCast.resist.normal': { label: 'บอสร่ายเวท: ต้านร่ายแตก · มอนทั่วไป', effect: 'เพิ่ม = มอนธรรมดาที่ร่ายท่าใหญ่ถูกขัดยากขึ้น (หักจากโอกาสพื้นฐาน)' },
  'monCast.resist.mini': { label: 'บอสร่ายเวท: ต้านร่ายแตก · มินิบอส', effect: 'เพิ่ม = มินิบอสร่ายแตกยากขึ้น (0.05 = โอกาส −5%)' },
  'monCast.resist.boss': { label: 'บอสร่ายเวท: ต้านร่ายแตก · บอส', effect: 'เพิ่ม = บอสใหญ่ร่ายแตกยากขึ้น (0.1 = โอกาส −10%)' },
  'monCast.pushGauge': { label: 'บอสร่ายเวท: เกจเทิร์นถอยเมื่อร่ายแตก', effect: 'เพิ่ม = ตีร่ายแตกแล้วบอสเสียจังหวะนานขึ้น ได้เทิร์นตีต่อเยอะขึ้น' },
  'monCast.steady': { label: 'บอสร่ายเวท: ร่ายถัดไปไม่แตกหลังโดนขัด (1 = เปิด)', effect: 'เปิด = ร่ายแตกแล้ว ร่ายครั้งต่อไปของตัวนั้นตีไม่แตก (เหมือนนักเวทตั้งสติ) · 0 = ขัดได้ทุกครั้ง' },
  'monCast.steadyDmg': { label: 'บอสร่ายเวท: ความแรงของร่ายถัดไปหลังร่ายแตก', effect: 'ลด = ร่ายรอบใหม่ (ที่ตีไม่แตก) หลังโดนขัดเบาลง (0.5 = แรงแค่ 50%) · 1 = แรงเท่าเดิม' },
  'monCast.skillMinPow': { label: 'บอสร่ายเวท: ความแรงสกิลเวทขั้นต่ำที่ต้องร่าย (pow × hits)', effect: 'ลด = สกิลเวทของบอส/มินิบอสที่เบากว่าก็ต้องร่าย 1 เทิร์นก่อนปล่อย (ตีแตกได้) · เพิ่ม = เฉพาะสกิลเวทแรงจริง ๆ ที่ร่าย' },
  'monCast.skillFreeTurn': { label: 'บอสร่ายเวท: ร่ายสกิลเวทให้ฮีโร่ได้เทิร์นตอบ (1 = เปิด)', effect: 'เปิด = บอสเริ่มร่ายสกิลเวทแล้วฮีโร่ได้เทิร์นทันทีเหมือนท่าร่ายใหญ่ · 0 = ไม่ได้เทิร์นฟรี' },
  clericHealBelow: { label: 'Cleric · ทักษะ 1: เกณฑ์ % HP ที่จะฮีล', effect: 'เพิ่ม = พอเลือดพร่องจากจุดนี้ Cleric จะสลับมาฮีลตัวเองเร็วขึ้น (เช่น 0.75 = ฮีลเมื่อ HP < 75%)' },
  clericSmiteTargets: { label: 'Cleric · ทักษะ 1: แสงตกใส่กี่เป้าหมาย', effect: 'เพิ่ม = เวลาไม่ต้องฮีล ทักษะ 1 จะฟาดแสงโดนมอนหลายตัวพร้อมกันมากขึ้น' },
  'cleric.heal': { label: 'Cleric · ทักษะ 1: ฮีล × M.ATK', effect: 'เพิ่ม = กดฮีลทีนึงเลือดเด้งเยอะขึ้น (สเกลด้วย M.ATK + WIS healAmp)' },
  'cleric.smite': { label: 'Cleric · ทักษะ 1: แสงตก × M.ATK', effect: 'เพิ่ม = ดาเมจเวทเวลาใช้ทักษะ 1 โจมตีแรงขึ้น' },
  'cleric.basic': { label: 'Cleric · ตีธรรมดา: ตัวคูณ P.ATK', effect: 'เพิ่ม = ตีปกติของนักบวช/สายทุบแรงขึ้น (มีผลกับคอมโบและกระบอง)' },
  'cleric.ultAtk': { label: 'Cleric · Ult: ทุบทุกตัว × P.ATK', effect: 'เพิ่ม = ฮิตทุบกายภาพหมู่ของ Ult พรคุ้มครองแรงขึ้น' },
  'cleric.ultLight': { label: 'Cleric · Ult: Holy Light ต่อลูก × M.ATK', effect: 'เพิ่ม = ลูกบอลแสงที่โปรยใส่มอนหลังทุบแรงขึ้น (ทริกเกอร์ทั้งฮีล/โล่ได้ตามสาย)' },
  'cleric.ultLights': { label: 'Cleric · Ult: จำนวน Holy Light', effect: 'เพิ่ม = จำนวนลูกแสงที่ยิงแถมใน Ult เยอะขึ้น' },
  'cleric.ultShield': { label: 'Cleric · Ult: โล่ % Max HP', effect: 'เพิ่ม = กด Ult แล้วได้เกราะป้องกันหนากว่าเดิม (0.14 = 14% Max HP)' },
  'cleric.ultShieldTurns': { label: 'Cleric · Ult: เกราะอยู่นาน (เทิร์น)', effect: 'เพิ่ม = เกราะจาก Ult อยู่คุ้มครองนานขึ้นกี่เทิร์น' },
  'cleric.shieldTurns': { label: 'Cleric: ระยะเวลาเกราะสกิลมาตรฐาน (เทิร์น)', effect: 'เพิ่ม = โล่จากสกิลเสริมของ Cleric อยู่นานขึ้น' },
  'cleric.shieldCap': { label: 'Cleric: เพดานเกราะป้องกัน (% Max HP)', effect: 'เพิ่ม = นักบวชสะสมโล่ซ้อนทับกันได้หนายิ่งกว่าสายอื่น (ค่าปกติ 0.5 = 50% Max HP)' },
  'cleric.purifyHeal': { label: 'Cleric: ไฟชำระฮีล × M.ATK', effect: 'เพิ่ม = เอฟเฟกต์เสริมไฟชำระฟื้น HP เยอะขึ้นตาม M.ATK' },
  'cleric.ultMana': { label: 'Cleric · Ult: ค่าร่าย Mana พื้นฐาน', effect: 'ลดเลข = นักบวชกด Ult ได้บ่อยและประหยัด Mana มากขึ้น (ซิงค์ไปยัง JOBS.cleric.ult.cost)' },
  'cleric.ultManaLv': { label: 'Cleric tree · ราก: Mana Ult เพิ่มต่อ Lv', effect: 'เพิ่ม = ยิ่งอัปโนดราก Ult สูงขึ้นจะยิ่งกิน Mana แพงขึ้นแลกกับพลังทุบ (0 = ไม่กินเพิ่ม)' },
  clericUltAtkLv: { label: 'Cleric tree · ราก: ทุบ Ult +P.ATK ต่อ Lv', effect: 'เพิ่ม = แต่ละ Lv ของโนดรากทำให้ Ult ทุบแรงขึ้น (+0.15 = +15% P.ATK ต่อ Lv)' },
  clericJudgeEvery: { label: 'Cleric (ค่าเก่า Judgement): ทุกกี่เทิร์น', effect: 'ตัวนับเก่าสำหรับสกิล Judgement (ระบบปัจจุบันใช้ใยแมงมุม/แสงแตกเป็นหลัก)' },
  clericJudge: { label: 'Cleric (ค่าเก่า Judgement): ตัวคูณ', effect: 'ตัวคูณเก่าสำหรับ Judgement (ตรวจสอบสคริปต์ก่อนปรับใช้งาน)' },
  clericWarmCounterLv: { label: 'Cleric tree: พรอุ่นไอ +สวนกลับต่อ Lv', effect: 'เพิ่ม = อัปโนดพรอุ่นไอแล้วได้โอกาสสวนกลับสูงขึ้น (0.025 = +2.5% ต่อ Lv)' },
  clericWarmLightLv: { label: 'Cleric tree: พรอุ่นไอ +Holy Light ต่อ Lv', effect: 'เพิ่ม = อัปพรอุ่นไอแล้วเพิ่มจำนวนลูกแสงใน Ult มากขึ้น (+1 ลูก/Lv)' },
  clericSpearShieldLv: { label: 'Cleric tree: เกราะแสง +โล่ (% Max HP/Lv)', effect: 'เพิ่ม = ทุกครั้งที่หอกแสงพุ่ง ฮีโร่ได้โล่ % Max HP หนาขึ้น' },
  spearBase: { label: 'Cleric · หอกแสง: ดาเมจพื้นฐาน × M.ATK', effect: 'เพิ่ม = หอกแสง (passive/สกิล 2) ที่พุ่งยิงอัตโนมัติแรงขึ้นทุกเล่ม' },
  spearMax: { label: 'Cleric · หอกแสง: จำนวนเล่มสะสมสูงสุด', effect: 'เพิ่ม = สะสมหอกแสงไว้รอบตัวได้เยอะเล่มขึ้นก่อนปลดปล่อย/ตัน' },
  'clericTree.dawn.every': { label: 'Cleric tree · รุ่งอรุณ: ออกทุกกี่ฮิต', effect: 'ลดเลข = โบนัสแสงรุ่งอรุณทำงานถี่ขึ้นทุก ๆ N ฮิต (ตีปกติ/คอมโบ)' },
  'clericTree.dawn.matk': { label: 'Cleric tree · รุ่งอรุณ: × M.ATK ในสูตร', effect: 'เพิ่ม = สายเวท (M.ATK) ได้โบนัสแสงรุ่งอรุณแรงขึ้นควบคู่ STR+WIS' },
  'clericTree.dawn.share': { label: 'Cleric tree · รุ่งอรุณ: ตัวคูณโบนัส/Lv เดิม', effect: 'เพิ่ม = ดาเมจเวทแถม (STR + WIS + M.ATK%) ต่อ Lv แรงขึ้นชัดเจน' },
  'clericTree.dawn.heal': { label: 'Cleric tree · สมานแผล: ฮีลตามดาเมจ/Lv เดิม', effect: 'เพิ่ม = สัดส่วนที่ฮีลตัวเองจากโบนัสรุ่งอรุณที่ฟันใส่ตัวหน้าสูงขึ้น' },
  'clericTree.dawn.weak': { label: 'Cleric tree · สมานแผล: ตัวคูณกับมอนปกติ', effect: 'เพิ่ม = ดูดเลือด/ฮีลจากมอนลูกน้องได้เยอะขึ้น (0.6 = ได้ 60% เทียบกับตีบอส)' },
  'clericTree.dawn.wis.0': { label: 'Cleric tree · แสงแตก Lv1: เปลี่ยนดาเมจเป็น +WIS', effect: 'เพิ่ม = โบนัสรุ่งอรุณที่ทำได้แปลงเป็นบัฟ WIS เยอะขึ้นที่โนด Lv1' },
  'clericTree.dawn.wis.1': { label: 'Cleric tree · แสงแตก Lv2: เปลี่ยนดาเมจเป็น +WIS', effect: 'เพิ่ม = โบนัสรุ่งอรุณที่ทำได้แปลงเป็นบัฟ WIS เยอะขึ้นที่โนด Lv2' },
  'clericTree.dawn.wis.2': { label: 'Cleric tree · แสงแตก Lv3: เปลี่ยนดาเมจเป็น +WIS', effect: 'เพิ่ม = โบนัสรุ่งอรุณที่ทำได้แปลงเป็นบัฟ WIS เยอะขึ้นที่โนด Lv3' },
  'clericTree.dawn.wisTurns.0': { label: 'Cleric tree · แสงแตก Lv1: ระยะเวลา (เทิร์น)', effect: 'เพิ่ม = บัฟ +WIS จากแสงแตกอยู่ติดตัวนานขึ้นที่ Lv1' },
  'clericTree.dawn.wisTurns.1': { label: 'Cleric tree · แสงแตก Lv2: ระยะเวลา (เทิร์น)', effect: 'เพิ่ม = บัฟ +WIS จากแสงแตกอยู่ติดตัวนานขึ้นที่ Lv2' },
  'clericTree.dawn.wisTurns.2': { label: 'Cleric tree · แสงแตก Lv3: ระยะเวลา (เทิร์น)', effect: 'เพิ่ม = บัฟ +WIS จากแสงแตกอยู่ติดตัวนานขึ้นที่ Lv3' },
  'clericTree.dawn.crit': { label: 'Cleric tree · ★ อรุณพิทักษ์: +ดาเมจคริ', effect: 'เพิ่ม = โบนัสรุ่งอรุณ (ซึ่งติดคริ 100%) ระเบิดความแรงคริสูงขึ้น' },
  'clericTree.core.base': { label: 'Cleric tree · จิตสงบ: +STR/+WIS ต่อ Lv เดิม', effect: 'เพิ่ม = นักบวชได้ STR+WIS ตั้งต้นจากโนดแก่นศรัทธามากขึ้น' },
  'clericTree.core.regen': { label: 'Cleric tree · จิตสงบ: ฟื้น Mana ต่อ Lv เดิม', effect: 'เพิ่ม = ฟื้น Mana ต่อเทิร์นมากขึ้นตามค่าต่ำสุดของ STR/WIS (1 หน่วย = 3 Mana/เทิร์น)' },
  'clericTree.core.intPer.0': { label: 'Cleric tree · ศรัทธาสู่กาย Lv1: ทุกกี่แต้ม', effect: '⚠️ ลดเลข = แปลง INT→STR และ WIS→VIT ได้ไวขึ้น! · เพิ่ม = แลกแต้มได้ช้าลง' },
  'clericTree.core.intPer.1': { label: 'Cleric tree · ศรัทธาสู่กาย Lv2: ทุกกี่แต้ม', effect: '⚠️ ลดเลข = แปลง INT→STR และ WIS→VIT ได้ไวขึ้น! · เพิ่ม = แลกแต้มได้ช้าลง' },
  'clericTree.core.intPer.2': { label: 'Cleric tree · ศรัทธาสู่กาย Lv3: ทุกกี่แต้ม', effect: '⚠️ ลดเลข = แปลง INT→STR และ WIS→VIT ได้ไวขึ้น! · เพิ่ม = แลกแต้มได้ช้าลง' },
  'clericTree.core.guard': { label: 'Cleric tree · มานาพิทักษ์: ดูดดาเมจเป็น Mana/Lv เดิม', effect: 'เพิ่ม = เวลาโดนมอนตี (เข้าเนื้อหรือโล่) ได้ Mana เด้งคืนมามากขึ้น' },
  'clericTree.core.wisAmp': { label: 'Cleric tree · มานาพิทักษ์: ขยายผลต่อ 1 WIS', effect: 'เพิ่ม = ยิ่งปั้น WIS เยอะ มานาพิทักษ์ยิ่งปั๊ม Mana ให้เยอะขึ้นตาม' },
  'clericTree.core.heal': { label: 'Cleric tree · มานาพิทักษ์: จ่าย Mana คืน HP', effect: 'เพิ่ม = ทุกครั้งที่ Cleric กดสกิลเสีย Mana จะแปลงกลับมาเป็นฮีล HP เยอะขึ้น' },
  'clericTree.core.shield': { label: 'Cleric tree · มานาพิทักษ์: โล่ต้นเวฟ × Max Mana/Lv', effect: 'เพิ่ม = เริ่มแต่ละห้องได้เกราะเปิดฉากหนาขึ้นตาม Max Mana ที่มี' },
  thiefAuto: { label: 'Thief · ทักษะ 1: ดาเมจแทง × P.ATK', effect: 'เพิ่ม = สกิล 1 ของโจรแทงแรงขึ้นทันที' },
  thiefAutoPoison: { label: 'Thief · ทักษะ 1: พิษใส่เป้า (สแต็ก)', effect: 'เพิ่ม = ทักษะ 1 ยัดสแต็กพิษใส่มอนเยอะขึ้นต่อครั้ง (ซินเนอร์จี้กับ Mobster)' },
  thiefUlt: { label: 'Thief · Ult: ดาเมจต่อฮิต × P.ATK', effect: 'เพิ่ม = แต่ละทีในชุดรัวมีด (Ult) แรงขึ้น' },
  thiefUltHits: { label: 'Thief · Ult: จำนวนทีแทง', effect: 'เพิ่ม = รัวแทงหลายฮิตมากขึ้นต่อ 1 Ult (เพิ่มโอกาสทริกเกอร์พิษ/คริ/หลบ)' },
  thiefUltDodge: { label: 'Thief · Ult: โควตาหลบแน่นอน (ครั้ง)', effect: 'เพิ่ม = หลังกด Ult โจรจะหลบการโจมตีของมอนได้ชัวร์หลายครั้งขึ้น' },
  thiefAutoMinCost: { label: 'Thief · แทงพิษ: Energy ต่ำสุดหลังลด', effect: 'เพิ่ม = ของลดค่าร่าย (autoCostCut) ลดแทงพิษได้น้อยลง (ค่าร่ายไม่ต่ำกว่านี้)' },
  thiefStrikeRes: { label: 'Thief · D.Strike ติด: คืน Energy', effect: 'เพิ่ม = ตีเพิ่มจาก Double Strike แต่ละครั้งคืน Energy มากขึ้น วนแทงพิษ/Ult เร็วขึ้น' },
  thiefStrikeLs: { label: 'Thief · D.Strike: สัดส่วนดูดเลือด', effect: 'เพิ่ม = ฮิตเพิ่มของ Double Strike ดูดเลือดได้มากขึ้น (1 = เท่าตีปกติ)' },
  thiefKindsAt: { label: 'Thief · "ดีบัฟหลายชนิด" = กี่ชนิดขึ้นไป', effect: 'เพิ่ม = ต้องติดสถานะหลายชนิดขึ้นก่อนโบนัส "หลายชนิด" (คมเลือด ฯลฯ) ทำงาน' },
  thiefCondLeechMulti: { label: 'Thief · คมเลือด: × เมื่อดีบัฟหลายชนิด', effect: 'เพิ่ม = ดูดเลือดตามสถานะแรงขึ้นเมื่อเป้าติดหลายชนิด' },
  thiefKillRes: { label: 'Thief · กระหายเลือด: ฆ่าได้ Energy', effect: 'เพิ่ม = ฆ่ามอนแล้วได้ Energy คืนมากขึ้น (ใช้กับ killHeal ของใส่/การ์ดด้วย)' },
  thiefKillPoisonHeal: { label: 'Thief · กระหายเลือด: ฮีลต่อพิษบนศพ', effect: 'เพิ่ม = ฆ่ามอนที่พิษหนาแล้วฟื้น HP มากขึ้น' },
  thiefKillPoisonHealCap: { label: 'Thief · กระหายเลือด: ฮีลโบนัสสูงสุด', effect: 'เพิ่ม = ฮีลโบนัสจากพิษบนศพไปได้สูงขึ้น (% Max HP)' },
  thiefBossCritLeech: { label: 'Thief · กระหายเลือด: คริบอส ฮีลกี่ส่วน', effect: 'เพิ่ม = คริใส่บอส/มินิบอสครั้งแรกของเทิร์นฟื้น HP มากขึ้น' },
  thiefBossCritRes: { label: 'Thief · กระหายเลือด: คริบอส Energy', effect: 'เพิ่ม = คริใส่บอส/มินิบอสครั้งแรกของเทิร์นได้ Energy มากขึ้น' },
  thiefBloodKingBelow: { label: 'Thief · ราชันย์โลหิต: HP ต่ำกว่า', effect: 'เพิ่ม = ราชันย์โลหิตเปิดเร็วขึ้น (เปิดตอนเลือดยังเหลือเยอะกว่า)' },
  thiefBloodKingMul: { label: 'Thief · ราชันย์โลหิต: ดูดเลือด ×', effect: 'เพิ่ม = ตอนราชันย์โลหิตเปิด ดูดเลือดแรงขึ้น' },
  thiefBloodKingStrikeLs: { label: 'Thief · ราชันย์โลหิต: D.Strike ดูดเลือด', effect: 'เพิ่ม = ตอนราชันย์โลหิตเปิด ฮิต Double Strike ดูดเลือดมากขึ้น' },
  thiefStackCritTalMax: { label: 'Thief · จุดบอดซ้อนพิษ: stack สูงสุด', effect: 'เพิ่ม = ทาเลนต์จุดบอดซ้อนพิษนับ stack บนเป้าได้มากขึ้น คริสูงขึ้น' },
  thiefTakenCap: { label: 'Thief · B1: ดาเมจที่มอนรับเพิ่ม สูงสุด', effect: 'เพิ่ม = Exposed / สถานะทับซ้อน / Privileged แผลลึก / กัดกร่อนของใส่ รวมกันแล้วดันดาเมจที่มอนรับได้สูงขึ้น (0.6 = สูงสุด +60%)' },
  thiefPrivShare: { label: 'Thief · สถานะทับซ้อน: พิษขั้นต่ำ (สัดส่วนเพดานพิษ)', effect: 'เพิ่ม = ทาเลนต์สถานะทับซ้อนต้องสะสมพิษบนเป้าหนาขึ้นก่อนเปิดโบนัส (0.6 = 60% ของเพดานพิษ เช่น 12 จาก 20)' },
  thiefPoisonAmpShare: { label: 'Thief · กัดกร่อน (ของใส่/การ์ด): พิษขั้นต่ำ (สัดส่วนเพดานพิษ)', effect: 'เพิ่ม = โบนัสกัดกร่อนจากของใส่/การ์ด/เซ็ตต้องรอพิษบนเป้าหนาขึ้น (0.5 = ครึ่งเพดาน เช่น 10 จาก 20)' },
  thiefStackHpMax: { label: 'Thief · กายต้านพิษ: นับ stack สูงสุด', effect: 'เพิ่ม = พิษ+Wound บนสนามนับเป็น Max HP ชั่วคราวได้มากขึ้น (ทาเลนต์กายต้านพิษ)' },
  thiefUltAgiK: { label: 'Thief · Ult: โบนัส AGI เมื่อลง AGI เต็มสัดส่วน (+×)', effect: 'เพิ่ม = เงาพริ้วแรงขึ้นตามสัดส่วน AGI ต่อแต้มทั้งหมด (2 = ลง AGI หมดตัวแรง +200% ทุกเลเวล)' },
  thiefUltAgiShareCap: { label: 'Thief · Ult: เพดานสัดส่วน AGI', effect: 'เพิ่ม = AGI จากของใส่ดันโบนัสเงาพริ้วเกินลงเต็มได้มากขึ้น (1.2 = สูงสุด K × 1.2)' },
  thiefUltAgiPoolMin: { label: 'Thief · Ult: แต้มขั้นต่ำที่ใช้หารสัดส่วน AGI', effect: 'เพิ่ม = เลเวลต่ำต้องลง AGI เยอะขึ้นกว่าจะได้โบนัสเงาพริ้วเต็ม (60 = เท่าแต้มของ Lv 20) · ลด = ต้นเกมเงาพริ้วแรงเร็วขึ้น' },
  thiefUltCondCap: { label: 'Thief · เงาพริ้ว: ดาเมจคริเงื่อนไขของ Ult รวมสูงสุด', effect: 'เพิ่ม = เงาจุดตาย / เพชฌฆาตเงา / เงาสังหาร รวมกันดันดาเมจคริของ Ult ได้สูงขึ้น (ทุกทีในร่างเงาคริแน่ → ระวังเกินงบ Ult)' },
  thiefUltKindsMax: { label: 'Thief · เงาจุดตาย: นับดีบัฟสูงสุด (ชนิด)', effect: 'เพิ่ม = เป้าที่ติดสถานะหลายชนิดให้ดาเมจคริ Ult เพิ่มได้มากขึ้น' },
  thiefExecBelow: { label: 'Thief · เพชฌฆาตเงา: HP เป้าต่ำกว่า', effect: 'เพิ่ม = โบนัสดาเมจคริใส่เป้าเลือดน้อยเปิดเร็วขึ้น' },
  thiefUltExecBelow: { label: 'Thief · เงาสังหาร: HP เป้าต่ำกว่า', effect: 'เพิ่ม = ทาเลนต์เงาสังหารได้ดาเมจคริเพิ่มเร็วขึ้น (เป้ายังเลือดเยอะกว่า)' },
  thiefOnHitBase: { label: 'Thief · On-Hit: สัดส่วนฐาน', effect: 'เพิ่ม = ทีแทงเงาพริ้วดูดเลือด / แปะ Wound ได้มากขึ้นเมื่อมี On-Hit' },
  thiefOnHitCap: { label: 'Thief · On-Hit: สัดส่วนสูงสุด', effect: 'เพิ่ม = เงาประสานอาวุธ + คมมีดประสาน รวมกันได้ On-Hit สูงขึ้น' },
  thiefFinisherAt: { label: 'Thief · เงาพันคม: คริกี่ครั้งได้ทีปิด', effect: 'ลดเลข = ★ เงาพันคมแทงปิดท้ายบ่อยขึ้น (ร่างเงาคริแน่ = ติดทุกครั้ง)' },
  thiefFinisherMul: { label: 'Thief · เงาพันคม: ทีปิด × ทีปกติ', effect: 'เพิ่ม = ทีแทงปิดท้ายของ ★ เงาพันคมแรงขึ้น (คริแน่)' },
  thiefUltCdCutCap: { label: 'Thief · ลด CD Ult สูงสุดต่อเทิร์น (รวมทุกแหล่ง)', effect: 'เพิ่ม = ขโมยจังหวะ / เงาวนลูป / Kill Reset (Rogue) ลด CD Ult รวมกันได้มากขึ้นต่อ 1 เทิร์นฮีโร่' },
  thiefUltCdFloor: { label: 'Thief · CD Ult ต่ำสุดในเทิร์นที่เพิ่งกด', effect: 'ลดเลข = ลด CD จนกด Ult ติดกันได้ไวขึ้น (2 = ต้องเว้นอย่างน้อย 1 เทิร์น)' },
  thiefCondCritDmgCap: { label: 'Thief · B3: ดาเมจคริจากเงื่อนไข รวมสูงสุด', effect: 'เพิ่ม = Shroud ★ / ใจสลาย (Rogue) / โหนด-ทาเลนต์เงาพริ้ว / เพชฌฆาตเงา / เปิดฉากซุ่มโจมตี รวมกันดันดาเมจคริได้สูงขึ้น (0.75 = สูงสุด +0.75 critMul)' },
  thiefShadowShieldHpCap: { label: 'Thief · หายใจในเงา: โล่ร่างเงาสูงสุด (% Max HP)', effect: 'เพิ่ม = โล่ที่ได้ตอนเข้าร่างเงา (ตาม Flee) หนาได้มากขึ้น' },
  thiefUltCritResCap: { label: 'Thief · เพชฌฆาตเงา: Energy จากคริเงาพริ้วสูงสุดต่อครั้ง', effect: 'เพิ่ม = Ult ที่คริหลายที (เช่นในร่างเงา) คืน Energy ได้มากขึ้น' },
  thiefDodgeFleeTurns: { label: 'Thief · ก้าวเงา: Flee หลังหลบ นาน (เทิร์นฮีโร่)', effect: 'เพิ่ม = หลบได้แล้ว Flee ของทาเลนต์ก้าวเงาค้างนานขึ้น' },
  thiefOpenCritDmg: { label: 'Thief · เปิดฉากซุ่มโจมตี R2: ดาเมจคริ + (B3)', effect: 'เพิ่ม = ฮิตแรกของเวฟ (คริแน่) แรงขึ้น' },
  thiefVenomBasicShare: { label: 'Thief · แทงฉาบอาคม: ตีปกติได้กี่ส่วนของแทงพิษ', effect: 'เพิ่ม = ดาเมจเวทเสริมบนตีปกติของสายเล่นแร่พิษแรงขึ้น' },
  thiefDetAtShare: { label: 'Thief · ระเบิดสารพิษ: พิษขั้นต่ำ (สัดส่วนเพดานพิษ)', effect: 'เพิ่ม = ต้องสะสมพิษบนเป้าหนาขึ้นก่อนระเบิดสารพิษทำงาน (0.5 = 50% ของเพดานพิษ)' },
  thiefDetShare: { label: 'Thief · ระเบิดสารพิษ: ใช้พิษกี่ส่วน', effect: 'เพิ่ม = ดึงพิษมาระเบิดแต่ละครั้งแรงขึ้น แต่พิษที่เหลือบนเป้าลดลงเร็วขึ้น' },
  thiefDetMin: { label: 'Thief · ระเบิดสารพิษ: ใช้พิษอย่างน้อย (stack)', effect: 'เพิ่ม = จำนวน stack ขั้นต่ำที่ดึงมาคำนวณดาเมจเมื่อพิษถึงเกณฑ์' },
  thiefDetPoisonBase: { label: 'Thief · ระเบิดสารพิษ: × ดาเมจพิษ (ฐาน)', effect: 'เพิ่ม = ตัวคูณฐานต่อ stack ของระเบิดสารพิษแรงขึ้นทุกระดับ' },
  thiefDetPoisonLv: { label: 'Thief · ระเบิดสารพิษ: × ดาเมจพิษ (ต่อ Lv เดิม)', effect: 'เพิ่ม = การอัปเลเวลโนดระเบิดสารพิษเร่งดาเมจแรงขึ้น' },
  thiefDetSplash: { label: 'Thief · ระเบิดสารพิษ: สาดตัวอื่นกี่ส่วน', effect: 'เพิ่ม = มอนตัวอื่นในเวฟโดนดาเมจสาดจากระเบิดสารพิษแรงขึ้น' },
  thiefDetLeechShare: { label: 'Thief · ระเบิดสารพิษ: สัดส่วนดูดเลือดพิษ (ไม่มี ★)', effect: 'เพิ่ม = เลือดพิษดูด HP จากดาเมจระเบิดสารพิษได้มากขึ้นก่อนปลด ★' },
  thiefLeechLv: { label: 'Thief · เลือดพิษ: อัตราฐานต่อ Lv เดิม', effect: 'เพิ่ม = ดูดเลือดจาก HP ที่มอนเสียเพราะพิษได้สูงขึ้น' },
  thiefLeechInt: { label: 'Thief · เลือดพิษ: ขยายต่อ 1 INT', effect: 'เพิ่ม = แต้ม INT ช่วยเร่งอัตราดูดเลือดพิษให้สูงขึ้นตามระดับเลท' },
  thiefLeechCap: { label: 'Thief · เลือดพิษ: อัตราดูดเลือดสูงสุด', effect: 'เพิ่ม = เพดานอัตราดูดเลือดพิษรวม (โหนด + INT + ของใส่) ไปได้สูงขึ้น' },
  thiefLeechTurnCap: { label: 'Thief · เลือดพิษ: ฮีลสูงสุดต่อเทิร์น (% Max HP)', effect: 'เพิ่ม = 1 เทิร์นฮีโร่ดูดเลือดพิษรวมได้หลายเปอร์เซ็นต์ของ Max HP มากขึ้น' },
  thiefDetBossRefund: { label: 'Thief · ★ นักเล่นแร่พิษ: คืนพิษใส่บอส', effect: 'เพิ่ม = หลังระเบิดสารพิษใส่บอส/มินิบอส เหลือพิษติดตัวไว้ต่อสู้ต่อเนื่องมากขึ้น' },
  thiefAgonyFrom: { label: 'Thief · วิถีพิษคริ: นับดาเมจคริที่เกิน', effect: 'ลดเลข = เริ่มนับโบนัสดาเมจคริเป็นพิษเร็วขึ้น (1.4 = นับส่วนที่เกิน 140%)' },
  thiefAgonyCap: { label: 'Thief · B5 วิถีพิษคริ + vsPoison: โบนัสพิษสูงสุด', effect: 'เพิ่ม = วิถีพิษคริและ vsPoison บนระเบิดสารพิษดันดาเมจพิษได้สูงขึ้น (1 = สูงสุด +100%)' },
  thiefAgonyHitCut: { label: 'Thief · วิถีพิษคริ: ฮิตไม่คริเบาลง', effect: 'ลดเลข = ข้อเสียของวิถีพิษคริ (ตี/สกิลกายภาพที่ไม่คริเบาลง) น้อยลง' },
  thiefWardPer: { label: 'Thief · Shadow Ward: ลดดาเมจต่อ 1 WIS', effect: 'เพิ่ม = แต้ม WIS ลดดาเมจเวท / ตาเหยี่ยว / ท่าตีโดนแน่ได้เร็วขึ้น' },
  thiefWardCap: { label: 'Thief · Shadow Ward: ลดดาเมจสูงสุด', effect: 'เพิ่ม = เพดานลดดาเมจเวท / ตาเหยี่ยว / ท่าตีโดนแน่จาก WIS สูงขึ้น' },
  thiefLuckyRes: { label: 'Thief · Gambler\'s Edge: LUCKY! คืน Energy', effect: 'เพิ่ม = หลบแบบโชคดี (LUCKY!) แล้วได้ Energy คืนมากขึ้น (1 ครั้ง/เทิร์น)' },
  thiefDeathMarkTurns: { label: 'Thief Passive · ตราความตาย: เก็บดาเมจ (เทิร์นฮีโร่)', effect: 'เพิ่ม = ตราความตาย (Death Mark) เก็บดาเมจฮิตฮีโร่ได้หลายเทิร์นขึ้นก่อนระเบิด True Dmg' },
  thiefDeathMarkAt: { label: 'Thief Passive · ตราความตาย: เกณฑ์ระเบิดก่อนกำหนด (% HP)', effect: 'เพิ่ม = ตราความตายระเบิดปิดฉากเร็วขึ้นเมื่อ HP เป้าต่ำกว่าสัดส่วนนี้ (0.15 = 15% HP)' },
  thiefDeathMarkEcho: { label: 'Thief Passive · ตราความตาย: สัดส่วนสะท้อน True Dmg', effect: 'เพิ่ม = ระเบิดตราความตาย (B6 Echo) สะท้อนดาเมจสะสมเป็น True Dmg แรงขึ้น (0.35 = 35%)' },
  thiefMistDr: { label: 'Thief Passive · หมอกลวงตา: ลดดาเมจเวท/ตาเหยี่ยว', effect: 'เพิ่ม = คีย์สโตนหมอกลวงตาลดดาเมจเวท / ตาเหยี่ยว / ท่าตีโดนแน่ได้ลึกขึ้น (0.25 = −25%)' },
  thiefMistDefCut: { label: 'Thief Passive · หมอกลวงตา: ข้อเสียลด P.DEF & โล่', effect: 'ลดเลข = ข้อเสียของคีย์สโตนหมอกลวงตา (ตัด P.DEF และโล่ที่ได้รับทุกแหล่ง) เบาลง (0.3 = −30%)' },
  thiefFlurryDmgCut: { label: 'Thief Passive · คมมีดประสาน: ข้อเสียลดดาเมจต่อที Ult', effect: 'ลดเลข = ข้อเสียของคีย์สโตนคมมีดประสาน (ลดความแรงต่อฮิตเงาพริ้ว) เบาลง (0.1 = −10%)' },
  thiefMobFlurryMul: { label: 'Thief Passive · คมมีดประสาน (Mobster): ตัวคูณฟันเพิ่มทวงหนี้', effect: 'เพิ่ม = ฟันรอบเสริมของ Mobster จากคมมีดประสานในท่าทวงหนี้แรงขึ้น (0.5 = 50%)' },
  thiefOverhealCap: { label: 'Thief Passive · สัญญาเล่นแร่: เพดานโล่จากฮีลเกินพิษ (% HP)', effect: 'เพิ่ม = ฮีลเกินจากเลือดพิษสามารถสะสมเป็นเกราะโล่ได้หนาขึ้น (0.2 = สูงสุด 20% Max HP)' },
  thiefEldritchMatkShare: { label: 'Thief Passive · สัญญาเล่นแร่: โบนัส M.ATK เสริมพิษ', effect: 'เพิ่ม = คีย์สโตนสัญญาเล่นแร่ดึง M.ATK มาเพิ่มดาเมจพิษต่อ stack แรงขึ้น (0.5 = +50% ของ poison.matkPer)' },
  thiefPhysLeechCut: { label: 'Thief Passive · สัญญาเล่นแร่: ข้อเสียลดดูดเลือดกายภาพ', effect: 'ลดเลข = ข้อเสียของสัญญาเล่นแร่ (หักดูดเลือดกายภาพปกติ) เบาลง (0.5 = −50%)' },
  thiefLuckyPoison: { label: 'Thief Passive · มือแห่งโชคชะตา: พิษจาก LUCKY! (Mobster)', effect: 'เพิ่ม = เมื่อ Mobster หลบแบบ LUCKY! จะยัดสแต็กพิษสวนใส่มอนมากขึ้น (ค่าปกติ 2 stack)' },
  swordS1CdCut: { label: 'Swordsman Passive · ตราพิพากษา: ลด CD ดาบสยบมนตร์ (เทิร์น)', effect: 'เพิ่ม = คีย์สโตนตราพิพากษาลดคูลดาวน์ท่าดาบสยบมนตร์ลงอีก (2 = −2 เทิร์น · ต่ำสุด 2 เทิร์น)' },
  swordS3BreakTurns: { label: 'Swordsman Passive · ทลายเกราะศึก: เกราะแตก (เทิร์น)', effect: 'เพิ่ม = ทักษะ 1 และทักษะ 3 สายนักดาบแปะเกราะแตกใส่มอนนานขึ้น' },
  swordIronDr: { label: 'Swordsman Passive · ป้อมเหล็กไร้พ่าย: ลดดาเมจเข้า', effect: 'เพิ่ม = คีย์สโตนป้อมเหล็กไร้พ่ายลดดาเมจที่ได้รับทุกแหล่งลึกขึ้น (0.15 = −15%)' },
  swordIronAspdCut: { label: 'Swordsman Passive · ป้อมเหล็กไร้พ่าย: ข้อเสียลด ASPD', effect: 'ลดเลข = ข้อเสียของป้อมเหล็กไร้พ่าย (ลดความเร็วโจมตี) เบาลง (0.15 = −15%)' },
  swordCounterDefMul: { label: 'Swordsman Passive · เกราะสะท้อนคม: ดาเมจสวนกลับ × P.DEF', effect: 'เพิ่ม = สวนกลับบวกดาเมจคงที่ตาม P.DEF แรงขึ้น (1.5 = +150% P.DEF ข้ามเกราะมอน)' },
  swordCleaveTaken: { label: 'Swordsman Passive · คมดาบผ่าทัพ: ข้อเสียโดนตีแรงขึ้น', effect: 'ลดเลข = ข้อเสียของคีย์สโตนคมดาบผ่าทัพ (รับดาเมจทุกแหล่งแรงขึ้น) เบาลง (0.1 = +10%)' },
  swordExecBonus: { label: 'Swordsman Passive · ตราพิพากษา: โบนัสคำพิพากษา Execute', effect: 'เพิ่ม = เพิ่มเพดานตัวคูณคำพิพากษาของ Ult สายนักดาบทุกคลาส (0.2 = +20% ฐาน)' },
  swordBloodFuryAt: { label: 'Swordsman Passive · สัญญาคลั่งเลือด: เกณฑ์ % HP ทำงาน', effect: 'เพิ่ม = คีย์สโตนสัญญาคลั่งเลือดเริ่มทำงานเมื่อ HP ต่ำกว่าสัดส่วนนี้เร็วขึ้น (0.6 = < 60% HP)' },
  swordBloodFuryDmg: { label: 'Swordsman Passive · สัญญาคลั่งเลือด: ดาเมจกายภาพเพิ่ม', effect: 'เพิ่ม = เมื่อ HP ต่ำกว่าเกณฑ์ ฮิตกายภาพทุกฮิตแรงขึ้น (0.3 = +30%)' },
  swordBloodFurySelf: { label: 'Swordsman Passive · สัญญาคลั่งเลือด: ข้อเสียเสีย % HP ปัจจุบัน', effect: 'ลดเลข = ข้อเสียจ่าย HP ปัจจุบันเมื่อกดสกิล/Ult น้อยลง (0.04 = เสีย 4% ไม่ถึงตาย)' },
  // Q 2026-11-24 Swordsman web nodes (data/trees/swordsman.ts)
  'swordCore.vitPer': { label: 'Swordsman tree · 🪨 กายเหล็ก: VIT ต่อ Lv เดิม', effect: 'เพิ่ม = โนดกายเหล็กให้ VIT มากขึ้น (HP + ถึก)' },
  'swordCore.defPer': { label: 'Swordsman tree · 🪨 กายเหล็ก: P.DEF ต่อ Lv เดิม', effect: 'เพิ่ม = โนดกายเหล็กให้ P.DEF มากขึ้น โดนตีกายภาพเบาลง' },
  'swordCore.hpPctPer': { label: 'Swordsman tree · 🪨 กายเหล็ก: Max HP % ต่อ Lv เดิม', effect: 'เพิ่ม = โนดกายเหล็กเพิ่ม % HP สูงสุดมากขึ้น' },
  'swordCore.mdefPer': { label: 'Swordsman tree · 💠 เกราะจิตอึด: M.DEF % ต่อ Lv เดิม', effect: 'เพิ่ม = โดนเวทเบาลง (M.DEF สูงขึ้น)' },
  'swordCore.tenacityPer': { label: 'Swordsman tree · 💠 เกราะจิตอึด: ต้านทานต่อ Lv เดิม', effect: 'เพิ่ม = ติดสถานะ (CC) สั้นลง / ติดยากขึ้น' },
  'swordCore.vitToMdefPer': { label: 'Swordsman tree · 💠 เกราะจิตอึด: VIT → M.DEF ต่อ Lv เดิม', effect: 'เพิ่ม = ทุกแต้ม VIT แปลงเป็น M.DEF มากขึ้น (สายถึก VIT ต้านเวทดีขึ้น)' },
  'swordCore.vitToMdefCap': { label: 'Swordsman tree · 💠 เกราะจิตอึด: เพดาน M.DEF จาก VIT', effect: 'เพิ่ม = ปลดเพดาน M.DEF ที่ได้จาก VIT ให้สูงขึ้น' },
  'swordCore.regenPer': { label: 'Swordsman tree · ❤️‍🩹 ฟื้นฟูนักรบ: ฟื้น HP ต่อ Lv เดิม', effect: 'เพิ่ม = ฟื้น HP ทุกเทิร์นมากขึ้น' },
  'swordCore.healAmpPer': { label: 'Swordsman tree · ❤️‍🩹 ฟื้นฟูนักรบ: ฮีลแรงขึ้นต่อ Lv เดิม', effect: 'เพิ่ม = ฮีล / ดูดเลือดที่ได้รับแรงขึ้น' },
  'swordCore.lowHpAt': { label: 'Swordsman tree · ❤️‍🩹 ฟื้นฟูนักรบ: เกณฑ์เลือดต่ำ', effect: 'เพิ่ม = โบนัสฟื้นตอนเลือดต่ำเริ่มทำงานเร็วขึ้น (เลือดยังเหลือเยอะก็ติด)' },
  'swordCore.lowHpRegenPer': { label: 'Swordsman tree · ❤️‍🩹 ฟื้นฟูนักรบ: ฟื้นเพิ่มตอนเลือดต่ำต่อ Lv เดิม', effect: 'เพิ่ม = ตอนเลือดต่ำกว่าเกณฑ์ ฟื้น HP แรงขึ้นอีก' },
  'swordS1Tree.shield': { label: 'Swordsman tree · 🌀 พายุสวนกลับ: โล่ % HP ต่อ Lv เดิม', effect: 'เพิ่ม = กดดาบสยบมนตร์แล้วได้โล่หนาขึ้น' },
  'swordS1Tree.helixHits': { label: 'Swordsman tree · 🌀 พายุสวนกลับ: จำนวนฮิตที่โดนก่อนหมุน', effect: 'ลดเลข = โดนตีน้อยครั้งลงก็หมุนฟัน AoE แล้ว' },
  'swordS1Tree.helixHitsStar': { label: 'Swordsman tree · 🌪️ ★ จักรผันสะท้าน: จำนวนฮิตก่อนหมุน', effect: 'ลดเลข = หมุนพายุสวนกลับถี่ขึ้นเมื่ออัป ★' },
  'swordS1Tree.helixMul': { label: 'Swordsman tree · 🌀 พายุสวนกลับ: ตัวคูณ P.ATK ต่อ Lv เดิม', effect: 'เพิ่ม = หมุนพายุสวนกลับ AoE แรงขึ้น' },
  'swordS1Tree.multiDr': { label: 'Swordsman tree · 🛡️ เกราะไม่สะทก: ลดดาเมจฮิตซ้ำต่อ Lv เดิม', effect: 'เพิ่ม = โดนมอนตีรัวหลายฮิตในเทิร์นเดียว ฮิตที่ 2+ เบาลงมาก' },
  'swordS1Tree.multiDrCap': { label: 'Swordsman tree · 🛡️ เกราะไม่สะทก: เพดานลดดาเมจฮิตซ้ำ', effect: 'เพิ่ม = ลดดาเมจฮิตซ้ำสูงสุดได้มากขึ้น' },
  'swordS1Tree.helixAmp': { label: 'Swordsman tree · ⚔️ คมสะท้อน: เพิ่มแรงพายุสวนกลับต่อ Lv เดิม', effect: 'เพิ่ม = พายุสวนกลับฟันแรงขึ้นเป็น %' },
  'swordS1Tree.helixDef': { label: 'Swordsman tree · ⚔️ คมสะท้อน: โบนัสดาเมจตาม P.DEF ต่อ Lv เดิม', effect: 'เพิ่ม = พายุสวนกลับบวกดาเมจจาก P.DEF มากขึ้น' },
  'swordS1Tree.helixStarShield': { label: 'Swordsman tree · 🌪️ ★ จักรผันสะท้าน: โล่ % HP เมื่อหมุน', effect: 'เพิ่ม = หมุนพายุสวนกลับแต่ละครั้งได้โล่หนาขึ้น' },
  'swordS1Tree.helixStarMana': { label: 'Swordsman tree · 🌪️ ★ จักรผันสะท้าน: คืน Mana เมื่อหมุน', effect: 'เพิ่ม = หมุนพายุสวนกลับแต่ละครั้งฟื้น Mana มากขึ้น' },
  'swordS1Tree.tenacity': { label: 'Swordsman tree · 🛡️ เกราะไม่สะทก: ต้านทานต่อ Lv เดิม', effect: 'เพิ่ม = ต้านทาน CC มากขึ้น' },
  'swordS1Tree.guardTurns': { label: 'Swordsman tree · 🛡️ เกราะไม่สะทก: กัน CC (เทิร์น)', effect: 'เพิ่ม = ล้าง CC แล้วกัน ใบ้ / ใยมัด / ช้า ได้นานขึ้น' },
  'swordS1Tree.muteWeak': { label: 'Swordsman tree · ⚔️ คมสะท้อน: มอนติดใบ้ตีเบาลงต่อ Lv เดิม', effect: 'เพิ่ม = มอนที่ติดใบ้จากดาบสยบมนตร์ตีเราเบาลง' },
  'swordS1Tree.counters': { label: 'Swordsman tree · 🌪️ ★ จักรผันสะท้าน: สวนกลับแน่นอน (ครั้ง)', effect: 'เพิ่ม = หลังกดดาบสยบมนตร์ สวนกลับแน่นอนได้หลายครั้งขึ้น' },
  'swordS1Tree.ctrDmg': { label: 'Swordsman tree · 🌪️ ★ จักรผันสะท้าน: ดาเมจสวนกลับเพิ่ม', effect: 'เพิ่ม = หลังกดดาบสยบมนตร์ โควตาสวนกลับแน่นอนจะฟันแรงขึ้น (+0.25 = แรงขึ้น +25%)' },
  'swordS1Tree.vsMute': { label: 'Swordsman tree · 🎯 เจาะจังหวะ: ตีตัวร่าย/ติดใบ้แรงขึ้นต่อ Lv เดิม', effect: 'เพิ่ม = ทุกการตีใส่มอนที่กำลังร่ายหรือติดใบ้แรงขึ้น' },
  'swordS1Tree.refund': { label: 'Swordsman tree · ⏳ ตัดจังหวะ: คืน Mana ต่อ Lv เดิม', effect: 'เพิ่ม = ดาบสยบมนตร์ขัดร่ายได้แล้วคืน Mana มากขึ้น (+ คูลดาวน์ −1)' },
  'swordS1Tree.splash': { label: 'Swordsman tree · 🌀 ฟันเฉือน: เฉือนตัวอื่นต่อ Lv เดิม', effect: 'เพิ่ม = ดาบสยบมนตร์เฉือนมอนตัวอื่นแรงขึ้น (สัดส่วนของฮิต)' },
  'swordS1Tree.starHit': { label: 'Swordsman tree · ⚔️ ★ ดาบสยบคู่: ฟันซ้ำ % ของฮิต', effect: 'เพิ่ม = ฟันซ้ำครั้งที่ 2 ของดาบสยบมนตร์แรงขึ้น' },
  'swordUltTree.dr': { label: 'Swordsman tree · 🛡️ ใจเหล็กกล้า: โดนเบาลงต่อ Lv เดิม', effect: 'เพิ่ม = ระหว่างปลุกดาบ/บ้าระห่ำโดนตีเบาลง' },
  'swordUltTree.vengRate': { label: 'Swordsman tree · 🔥 ใจเหล็กกล้า: สะสมเพลิงแค้นต่อ Lv เดิม', effect: 'เพิ่ม = เปลี่ยนดาเมจที่โดนเป็นเกจเพลิงแค้นได้ไวขึ้น' },
  'swordUltTree.vengCap': { label: 'Swordsman tree · 🔥 ใจเหล็กกล้า: เพดานเพลิงแค้น (% Max HP)', effect: 'เพิ่ม = เก็บสะสมเพลิงแค้นสูงสุดได้มากขึ้น' },
  'swordUltTree.vengDmg': { label: 'Swordsman tree · 🔥 ใจเหล็กกล้า: ดาเมจระเบิดเพลิงแค้น', effect: 'เพิ่ม = ระเบิดเพลิงแค้นตอนใช้ Ult แรงขึ้น' },
  'swordUltTree.vengShield': { label: 'Swordsman tree · 🔥 ใจเหล็กกล้า: โล่จากเพลิงแค้น', effect: 'เพิ่ม = ระเบิดเพลิงแค้นตอนใช้ Ult ได้โล่หนาขึ้น' },
  'swordUltTree.leech': { label: 'Swordsman tree · 🩸 ดาบกระหายเลือด: ดูดเลือดต่อ Lv เดิม', effect: 'เพิ่ม = ระหว่างปลุกดาบ/บ้าระห่ำ ตีปกติ/คอมโบ/สวนกลับ/พายุสวนกลับดูดเลือดมากขึ้น' },
  'swordUltTree.ctr': { label: 'Swordsman tree · 🔁 ตื่นสวนสะท้าน: สวนกลับต่อ Lv เดิม', effect: 'เพิ่ม = ระหว่างปลุกดาบ/บ้าระห่ำ โอกาสสวนกลับสูงขึ้น' },
  'swordUltTree.cullAdd': { label: 'Swordsman tree · 🔁 ตื่นสวนสะท้าน: เกณฑ์ดาบผ่าชีพเพิ่มต่อ Lv เดิม', effect: 'เพิ่ม = ประหารศัตรูด้วยดาบผ่าชีพได้ที่ HP สูงขึ้น' },
  'swordUltTree.cullPct': { label: 'Swordsman tree · 🪓 ★ ดาบผ่าชีพ: เกณฑ์ประหารมอนทั่วไป (% HP)', effect: 'เพิ่ม = ประหารมอนทั่วไปทันทีได้ที่ HP สูงขึ้น' },
  'swordUltTree.cullBossPct': { label: 'Swordsman tree · 🪓 ★ ดาบผ่าชีพ: เกณฑ์ประหารบอส/มินิ (% HP)', effect: 'เพิ่ม = ประหารบอส/มินิบอสทันทีได้ที่ HP สูงขึ้น' },
  'swordUltTree.cullBonusAt': { label: 'Swordsman tree · 🪓 ★ ดาบผ่าชีพ: เกณฑ์ผ่าเกราะบอส/มินิ (% HP)', effect: 'เพิ่ม = บอส/มินิที่เลือดต่ำกว่านี้จะโดนโบนัสผ่าเกราะก่อนถึงเกณฑ์ประหาร' },
  'swordUltTree.cullBonusMul': { label: 'Swordsman tree · 🪓 ★ ดาบผ่าชีพ: ตัวคูณ P.ATK ผ่าเกราะบอส', effect: 'เพิ่ม = โบนัสดาเมจผ่าเกราะใส่บอส/มินิแรงขึ้น' },
  'swordUltTree.cullMana': { label: 'Swordsman tree · 🪓 ★ ดาบผ่าชีพ: คืน Mana เมื่อประหารสำเร็จ', effect: 'เพิ่ม = ฆ่าด้วยดาบผ่าชีพแล้วฟื้น Mana มากขึ้น' },
  'swordUltTree.cullCdCut': { label: 'Swordsman tree · 🪓 ★ ดาบผ่าชีพ: ลด Ult CD เมื่อประหารสำเร็จ', effect: 'เพิ่ม = ฆ่าด้วยดาบผ่าชีพแล้ว Ult กลับมาไวขึ้น' },
  'swordUltTree.cullAtk': { label: 'Swordsman tree · 🪓 ★ ดาบผ่าชีพ: บัฟ P.ATK เพลิงชัยชนะ', effect: 'เพิ่ม = หลังประหารสำเร็จ P.ATK พุ่งสูงขึ้น' },
  'swordUltTree.cullDef': { label: 'Swordsman tree · 🪓 ★ ดาบผ่าชีพ: บัฟ P.DEF เพลิงชัยชนะ', effect: 'เพิ่ม = หลังประหารสำเร็จ P.DEF สูงขึ้น' },
  'swordUltTree.cullBuffTurns': { label: 'Swordsman tree · 🪓 ★ ดาบผ่าชีพ: ระยะเวลาเพลิงชัยชนะ (เทิร์น)', effect: 'เพิ่ม = บัฟเพลิงชัยชนะอยู่ได้นานขึ้น' },
  'swordUltTree.waveShield': { label: 'Swordsman tree · 🪓 ★ ดาบผ่าชีพ: โล่ % ของดาเมจคลื่น', effect: 'เพิ่ม = คลื่นดาบ/บ้าระห่ำให้โล่จากดาเมจที่ทำมากขึ้น' },
  'swordUltTree.waveShieldCap': { label: 'Swordsman tree · 🪓 ★ ดาบผ่าชีพ: เพดานโล่ (% Max HP)', effect: 'เพิ่ม = ปลดเพดานโล่จากคลื่นดาบให้หนาได้มากขึ้น' },
  'swordUltTree.rampageWaveShield': { label: 'Swordsman tree · 🪓 ★ ดาบผ่าชีพ: โล่ % จาก S3 คลื่นดาบระหว่างบ้าระห่ำ', effect: 'เพิ่ม = Berserker กด S3 คลื่นดาบระหว่างบ้าระห่ำได้โล่หนาขึ้น (อิงเพดาน waveShieldCap)' },
  'swordUltTree.execAdd': { label: 'Swordsman tree · ⚖️ คมพิพากษา: execute สูงสุดต่อ Lv เดิม', effect: 'เพิ่ม = ⚖️ คำพิพากษาของคลื่นดาบแรงสุดได้มากขึ้น' },
  'swordUltTree.reChance': { label: 'Swordsman tree · 🌊 คลื่นซ้ำ: โอกาสต่อ Lv เดิม', effect: 'เพิ่ม = คลื่นดาบฆ่ามอนได้แล้วมีโอกาสได้คลื่นอีกลูกสูงขึ้น' },
  'swordUltTree.waveAmp': { label: 'Swordsman tree · 🌊 คลื่นซ้ำ: แรงคลื่นเพิ่มต่อ Lv เดิม', effect: 'เพิ่ม = คลื่นดาบ/คลื่นทะลวงแรงขึ้นและสเกลต่อได้แม้เกิน Lv 5' },
  'swordUltTree.cleave': { label: 'Swordsman tree · ⚔️ ฟันกวาดตื่น: ฟันตัวถัดไปต่อ Lv เดิม', effect: 'เพิ่ม = ระหว่างปลุกดาบ ฟันตัวถัดไปแรงขึ้น' },
  'swordUltTree.awAtk': { label: 'Swordsman tree · ⚔️ ★ ดาบตื่นเต็มพลัง: P.ATK ระหว่างปลุกดาบ', effect: 'เพิ่ม = ระหว่างปลุกดาบ P.ATK สูงขึ้น (0.2 = +20%)' },
  'swordUltTree.awStrPct': { label: 'Swordsman tree · ⚔️ ★ ดาบตื่นเต็มพลัง: Bonus STR % ระหว่างปลุกดาบ', effect: 'เพิ่ม = ระหว่างปลุกดาบได้โบนัส STR เพิ่มเป็น % ของ STR ตัวเอง (0.2 = +20%)' },
  'poison.atkPer': { label: 'Poison · ดาเมจ/stack +× P.ATK (สายโจร)', effect: 'เพิ่ม = พิษโตตาม P.ATK แรงขึ้นช่วงเลท · 0 = พิษ flat แบบเดิม' },
  'thiefShadow.max': { label: 'Shadow · เกจเงาเต็มที่', effect: 'ลดเลข = เข้าร่างเงาบ่อยขึ้น' },
  'thiefShadow.turns': { label: 'Shadow · ร่างเงาอยู่กี่เทิร์น', effect: 'เพิ่ม = ช่วงคริแน่ + ทักษะ 1 ฟรีนานขึ้น' },
  'thiefShadow.dodge': { label: 'Shadow · เกจต่อการหลบ 1 ครั้ง', effect: 'เพิ่ม = สายหลบเข้าร่างเงาไวขึ้น' },
  'thiefShadow.double': { label: 'Shadow · เกจต่อ DOUBLE 1 ครั้ง', effect: 'เพิ่ม = สาย Double Strike เข้าร่างเงาไวขึ้น' },
  'thiefShadow.ult': { label: 'Shadow · เกจต่อการกดเงาพริ้ว', effect: 'เพิ่ม = Ult เติมเกจเงามากขึ้น' },
  'thiefMark.max': { label: 'Mark · Malice ที่ต้องสะสม', effect: 'ลดเลข = ปล่อยคริหมายหัวบ่อยขึ้น' },
  'thiefMark.dmg': { label: 'Mark · ดาเมจปลดหมายหัว + ต่อ Lv โนด', effect: 'เพิ่ม = ฮิตปลดหมายหัวแรงขึ้น (0.3 = +30%/Lv)' },
  'poison.slowAt': { label: 'Poison · พิษชา: stack ที่ต้องมี (Lv1)', effect: 'ลดเลข = มอนติดช้าจากพิษได้ง่ายขึ้น' },
  'poison.slowStep': { label: 'Poison · พิษชา: stack ที่ลดลงต่อ Lv', effect: 'เพิ่ม = ลงโนดพิษชาเยอะแล้วติดช้าง่ายขึ้นมาก' },
  'poison.slowTurns': { label: 'Poison · พิษชา: ติดช้ากี่เทิร์น', effect: 'เพิ่ม = มอนช้านานขึ้นทุกครั้งที่พิษกัด' },
  'poison.hpAbove': { label: 'Poison · กัด %HP: ทำงานเมื่อ HP มอนมากกว่า', effect: '0.5 = มอนเลือดเกิน 50% เท่านั้น · เพิ่ม = ช่วงที่กัด %HP สั้นลง' },
  'poison.hpPct': { label: 'Poison · กัด %HP สูงสุดต่อ stack', effect: 'เพิ่ม = พิษกัดบอสเลือดเยอะแรงขึ้นมาก (0.005 = 0.5%/stack/เทิร์น)' },
  'poison.hpPctInt': { label: 'Poison · กัด %HP + ต่อ INT 10 แต้ม', effect: 'เพิ่ม = INT ทำให้พิษ %HP แรงขึ้น (0.001 = +0.1%/stack ทุก INT 10)' },
  'poison.hpFlat': { label: 'Poison · กัด %HP: บวกตายตัวต่อ stack', effect: 'เพิ่ม = พิษส่วน %HP ได้ดาเมจขั้นต่ำเพิ่ม' },
  'poison.spreadShare': { label: 'Poison · ระเบิดพิษ: สัดส่วน stack ที่กระจาย', effect: '1 = ส่งต่อพิษทั้งหมด · 0.5 = ครึ่งเดียวแบบเดิม' },
  'poison.spreadBurst': { label: 'Poison · ระเบิดพิษ: ตัวคูณระเบิดใส่ทุกตัว', effect: 'เพิ่ม = มอนตายแล้วพิษระเบิดใส่ตัวอื่นแรงขึ้น · 0 = ไม่ระเบิด' },
  'poison.overflowMul': { label: 'Poison · พิษล้น: ตัวคูณระเบิดส่วนเกิน (Mafia)', effect: 'เพิ่ม = พิษที่เกินเพดานระเบิดแรงขึ้น' },
  'thiefSteal.turns': { label: 'Steal · บัฟที่ขโมยอยู่กี่เทิร์น', effect: 'เพิ่ม = บัฟ P.ATK / คริ ที่ขโมยมาอยู่นานขึ้น' },
  'thiefSteal.atk': { label: 'Steal · มอน STR: P.ATK +%', effect: 'เพิ่ม = ขโมยจากมอนสายแรงได้ P.ATK มากขึ้น' },
  'thiefSteal.res': { label: 'Steal · มอน AGI: Energy คืน', effect: 'เพิ่ม = ขโมยจากมอนสายเร็วได้ Energy มากขึ้น' },
  'thiefSteal.poison': { label: 'Steal · มอน INT: พิษ (stack)', effect: 'เพิ่ม = ขโมยขวดยาจากมอนสายเวทแล้วติดพิษหนาขึ้น' },
  'thiefSteal.brkTurns': { label: 'Steal · มอน VIT: เกราะแตก (เทิร์น)', effect: 'เพิ่ม = มอนสายถึกโดนลด DEF นานขึ้น' },
  'thiefSteal.heal': { label: 'Steal · มอน WIS: ฮีล % HP สูงสุด', effect: 'เพิ่ม = ขโมยจากมอนสายซัพพอร์ตแล้วฮีลมากขึ้น' },
  'thiefSteal.crit': { label: 'Steal · มอน LUK/DEX: คริ +%', effect: 'เพิ่ม = ขโมยดวงแล้วคริบ่อยขึ้น' },
  'poison.matkPer': { label: 'Poison · ดาเมจ/stack +× M.ATK (สายโจร)', effect: 'เพิ่ม = INT / M.ATK จากของ การ์ด บัฟ ทำให้พิษแรงขึ้นด้วย · 0 = ปิด' },
  'poison.defPer': { label: 'Poison · ลด DEF มอนต่อ stack (สายโจร)', effect: 'เพิ่ม = มอนติดพิษหนา ๆ DEF ละลายเร็วขึ้น ฮิตกายภาพเข้าแรงขึ้น (0.01 = 1%/stack)' },
  'poison.defCap': { label: 'Poison · เพดานลด DEF รวม', effect: 'เพิ่ม = พิษลด DEF ได้ลึกขึ้น (0.4 = สูงสุด −40%) · 0 = ปิด' },
  'poison.intPer': { label: 'Poison · ดาเมจ/stack + ต่อ INT 1 แต้ม (Thief)', effect: 'เพิ่ม = INT ทำให้พิษโจรแรงขึ้น (0.1 = +1/stack ทุก INT 10)' },
  'poison.baseCap': { label: 'Poison · เพดาน stack ตั้งต้น', effect: 'เพิ่ม = มอนติดพิษได้หนาขึ้นก่อนบวกโนด/ของ (เดิม 12)' },
  'poison.burstKeep': { label: 'Poison · ทวงหนี้: stack ที่เหลือหลังระเบิด', effect: 'เพิ่ม = หลังทวงหนี้พิษยังเหลือกัดต่อ (0.5 = เหลือครึ่ง · 0 = ล้างหมดแบบเดิม)' },
  'mageCore.regenStep': { label: 'Mage · กายสู่เวท: STR ต่อขั้นฟื้น Mana', effect: 'ลดเลข = ทุก STR น้อยลงก็ได้ขั้นฟื้น Mana แล้ว' },
  'mageCore.regenMissing': { label: 'Mage · กายสู่เวท: ฟื้นจาก Mana ที่หายไป (1) / Max Mana (0)', effect: '1 = ฟื้น % ของ Mana ที่หายไป (เบาลงตอน Mana เกือบเต็ม) · 0 = % ของ Max Mana แบบเดิม' },
  'mageCore.matkStep': { label: 'Mage · กายสู่เวท: STR ต่อขั้น M.ATK', effect: 'ลดเลข = STR แปลงเป็น M.ATK ถี่ขึ้น' },
  'mageCore.matkPer': { label: 'Mage · กายสู่เวท: M.ATK ต่อขั้น', effect: 'เพิ่ม = แต่ละขั้น STR ได้ M.ATK มากขึ้น' },
}
