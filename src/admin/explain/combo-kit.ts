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
  'monStat.mdefCap': { label: 'เพดานกันเวท (M.DEF Cap) ของมอน', effect: 'เพิ่ม = มอนสาย WIS สูงสามารถลดดาเมจเวทได้ลึกขึ้น (0.75 = กันได้สูงสุด 75%)' },
  'monStat.luckyCap': { label: 'เพดานหลบโชคดี (Lucky Dodge) ของมอน', effect: 'เพิ่ม = มอนสาย LUK สูงหลบได้แม้แต่คริ/เวทถี่ขึ้น (0.25 = สูงสุด 25%)' },
  'monStat.rateCap': { label: 'เพดาน Crit / Combo / Counter มอน', effect: 'เพิ่ม = ยอมให้มอนสะสมเรตคอมโบ/สวนกลับเกิน 100% เพื่อสู้กับการต้านของฮีโร่ได้มากขึ้น' },
  'levelGap.free': { label: 'ระยะห่าง Lv ปลอดการหักรางวัล', effect: 'เพิ่ม = ฮีโร่เวลเกินดัน D6+ ได้หลายเลเวลขึ้นโดยยังได้ของ/EXP เต็ม 100%' },
  'levelGap.per': { label: 'หักรางวัลต่อ Lv ที่เกิน (%)', effect: 'เพิ่ม = พอเวลเกินระยะปลอดภาษีปุ๊บ รางวัลร่วงฮวบไวขึ้น (-0.1 = -10%/Lv)' },
  'levelGap.min': { label: 'พื้นต่ำสุดรางวัลเมื่อเวลเกินเยอะ', effect: 'เพิ่ม = ต่อให้เวลทิ้งห่างแค่ไหนก็ยังได้รางวัลขั้นต่ำเท่านี้ (0.4 = อย่างน้อย 40%)' },
  'legacy.tierDrop.normal': { label: 'Lv ลดหลั่นของมอนปกติ (D1–5)', effect: 'เพิ่ม = มอนลูกกระจ๊อกใน D1–5 จะมีเลเวลต่ำกว่าบอสในดันนั้นมากขึ้น (คำนวณ stat อ่อนลง)' },
  'legacy.tierDrop.mini': { label: 'Lv ลดหลั่นของมินิบอส (D1–5)', effect: 'เพิ่ม = มินิบอสใน D1–5 มีเลเวลอ้างอิงต่ำกว่าบอสดันนั้นมากขึ้น' },
  'legacy.tierDrop.boss': { label: 'Lv ลดหลั่นของบอส (D1–5)', effect: 'ปกติ 0 = บอส D1–5 ใช้เลเวลเต็มของ legacy.lv ดันเจี้ยนนั้น' },
}
export function explainMonStat(path: string): FieldExplain {
  if (MON_STAT_MAP[path]) return MON_STAT_MAP[path]
  if (path.startsWith('legacy.lv.')) {
    const d = path.slice('legacy.lv.'.length)
    return {
      label: `Lv อ้างอิงของ ${DUNGEON_LABEL[d] ?? d} (D1–5)`,
      effect: 'เพิ่ม = มอนในดันนี้ได้แต้มสเตตัสคำนวณ M.DEF / Tenacity / Skill Scale มากขึ้น',
      detail: 'มีผลกับค่า stat เสริม (M.DEF/Lucky/Skill Scale) ของมอน D1–5 โดยคง HP/ATK จุดอ้างอิงเดิมไว้',
    }
  }
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
  'run.healOnClear': { label: 'ฮีลหลังผ่านห้อง (% Max HP)', effect: 'เพิ่ม = ยืนระยะในดันเจี้ยนยาว ๆ ง่ายขึ้น หลังจบห้องเด้งเลือดคืนเยอะ (0.2 = 20%)' },
  'run.healOnLevel': { label: 'ฮีลเมื่ออัป Lv ในรัน (% Max HP)', effect: 'เพิ่ม = จังหวะเวลอัปในดันช่วยกู้สถานการณ์เลือดใกล้หมดได้ดีขึ้น (0.2 = 20%)' },
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
}
