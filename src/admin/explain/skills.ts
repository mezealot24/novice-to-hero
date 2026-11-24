import { JOBS } from '../../data/jobs'
import { JOB2, type Job2Id } from '../../data/jobs2'
import type { Skill2Id } from '../../data/skill2'
import { CLS_TH, SKILL2_BY_ID, SLOT_TH, type FieldExplain } from './labels'

// ---------- Class skills (table `skills`) ----------
const S2P_TH: Record<string, [string, string]> = {
  guardCut: ['🛡️ ลดดาเมจเข้า', 'เพิ่ม = ขณะตั้งการ์ดลดดาเมจที่ฮีโร่โดนเยอะขึ้น'],
  guardBack: ['🛡️ สวนคืนดาเมจที่โดน', 'เพิ่ม = ตอนตั้งการ์ด สวนกลับแรงขึ้นตาม % ดาเมจที่โดนในเทิร์นนั้น'],
  guardDef: ['🛡️ สวน x P.DEF', 'เพิ่ม = ตอนตั้งการ์ด สวนกลับบวก P.DEF x ค่านี้'],
  bloodVamp: ['🩸 ดูดเลือดจากสกิล', 'เพิ่ม = ดูดเลือดจากดาเมจของทักษะ 2 + สู้ได้นานขึ้น'],
  tauntWeak: ['💢 ยั่วยุมอนตีเบาลง', 'เพิ่ม = มอนที่โดนยั่วยุจะโจมตีเบาลงตามสัดส่วนนี้'],
  rainMul: ['🌧️ ดาเมจฝนธนู × P.ATK', 'เพิ่ม = ฝนธนูยิงหมู่ทุกตัวแรงขึ้นชัดเจน'],
  hawkCrit: ['🦅 โอกาสคริเพิ่ม', 'เพิ่ม = บัฟตาเหยี่ยวบวก % คริให้ฮีโร่มากขึ้น'],
  trapPush: ['🕳️ ผลักเกจมอน (%)', 'เพิ่ม = กับดักถีบเกจมอนถอยหลังไปไกลขึ้น ทำให้มอนได้เทิร์นช้าลง'],
  mshieldTake: ['🔮 Mana Shield รับดาเมจแทน', 'เพิ่ม = แบ่งดาเมจที่โดนไปลงหลอด Mana แทนเลือดมากขึ้น (ระวัง Mana หมดไว)'],
  novaMul: ['❄️ ดาเมจ Frost Nova × พลังเวท', 'เพิ่ม = ระเบิดวงน้ำแข็งใส่ทุกตัวแรงขึ้น'],
  arcaneMul: ['✨ ดาเมจ Arcane Bolts × พลังเวท', 'เพิ่ม = ยิงกระสุนเวทแต่ละลูกแรงขึ้น'],
  renewHeal: ['💚 ฮีลต่อเนื่องต่อเทิร์น × M.ATK', 'เพิ่ม = ฮีล Renew เด้งเลือดแรงขึ้นทุกเทิร์น'],
  kyrieHp: ['🛡️ บาเรีย Kyrie % Max HP', 'เพิ่ม = เกราะ Kyrie ซับดาเมจได้หนาขึ้นตาม % เลือดสูงสุด'],
  spearPlus: ['🔱 หอกแสงแรงเพิ่มต่อ Lv × M.ATK', 'เพิ่ม = บวกตัวคูณความแรงให้หอกแสงทุกเล่มแรงขึ้น'],
  smokeHeal: ['💨 ฟื้น % HP ในระเบิดควัน', 'เพิ่ม = กดระเบิดควันแล้วเด้งเลือดคืนเยอะขึ้นตาม % Max HP'],
  pickRes: ['⚡ คืน Energy', 'เพิ่ม = กดสกิลนี้แล้วได้ Energy เด้งคืนมาใช้ท่าอื่นต่อทันที'],
  smokeRes: ['🌫️ ควันหอม: คืน Energy', 'เพิ่ม = ร่ายม่านควัน (เมื่อมี "+") แล้วได้ Energy คืนมากขึ้น (ปัดเป็นจำนวนเต็ม)'],
  woundMax: ['🔪 แผลฉีก: Wound สูงสุด', 'เพิ่ม = มอนติด Wound ซ้อนได้หนาขึ้น จุด Blade\'s End ได้ถี่ขึ้น (ปัดลงเป็นจำนวนเต็ม)'],
}

const S2N_TH: Record<string, FieldExplain> = {
  guardAutoBlockShare: { label: '🛡️ ตั้งการ์ด: Auto Guard เติม guardPool', effect: 'เพิ่ม = เมื่อ Auto Guard บล็อกได้ระหว่างตั้งการ์ด จะเติมเข้า guardPool มากขึ้น (0.5 = 50% ของดาเมจที่ถูกกัน)' },
  bloodTaken: { label: '🩸 กระหายเลือด: โดนตีแรงขึ้น (ข้อเสีย)', effect: '⚠️ เพิ่ม = ระหว่างเปิดบัฟกระหายเลือด ฮีโร่โดนตีแรงขึ้นตามสัดส่วนนี้ (0.1 = +10%)' },
  tauntCtrAmp: { label: '💢 ยั่วยุ: สวนกลับใส่มอนติดท้าทายแรงขึ้น', effect: 'เพิ่ม = สวนกลับใส่มอนที่ติดดีบัฟยั่วยุแรงขึ้น (0.2 = +20%)' },
  tauntStarShield: { label: '💢 ★ ท้าซ้ำ: โล่ % HP', effect: 'เพิ่ม = ★ เมื่อท้าทายซ้ำ ได้โล่ป้องกันหนาขึ้นตาม % Max HP (0.1 = 10%)' },
  bloodTurns: { label: '🩸 กระหายเลือด: นาน (เทิร์น)', effect: 'เพิ่ม = บัฟดูดเลือด + ATK ของทักษะ 2 อยู่ได้นานหลายเทิร์นขึ้น' },
  bloodAtk: { label: '🩸 กระหายเลือด: +ATK (%)', effect: 'เพิ่ม = ระหว่างเปิดบัฟกระหายเลือด ตีกายภาพแรงขึ้น (+0.15 = +15%)' },
  hawkTurns: { label: '🦅 ตาเหยี่ยว: นาน (เทิร์น)', effect: 'เพิ่ม = บัฟคริ/ดาเมจคริจากเหยี่ยวอยู่นานขึ้น' },
  hawkCritDmg: { label: '🦅 ตาเหยี่ยว: +ดาเมจคริ', effect: 'เพิ่ม = เวลาติดคริระหว่างบัฟจะฟัน/ยิงแรงขึ้น (+0.3 = +30% Crit Dmg)' },
  trapMul: { label: '🕳️ กับดัก: ดาเมจ × P.ATK', effect: 'เพิ่ม = ดาเมจตอนกับดักทำงานใส่ศัตรูแรงขึ้น' },
  novaPush: { label: '❄️ Frost Nova: ผลักเกจ (%)', effect: 'เพิ่ม = ระเบิดน้ำแข็งถีบเกจเทิร์นมอนถอยหลังไกลขึ้น' },
  blessTurns: { label: '🙏 พรแสง: นาน (เทิร์น)', effect: 'เพิ่ม = บัฟสเตตัส +15 (STR/DEX/INT/WIS) อยู่ติดตัวนานขึ้น' },
  blessStat: { label: '🙏 พรแสง: +STR/DEX/INT/WIS', effect: 'เพิ่ม = กดพรแสงแล้วค่าสถานะหลัก 4 อย่างพุ่งขึ้นทันทีทั้ง ATK/M.ATK/Hit/Heal' },
  blessCleanse: { label: '🙏 พรแสง: ล้างดีบัฟ (จำนวน)', effect: 'เพิ่ม = กดร่ายแล้วลบสถานะผิดปกติออกจากตัวเองได้หลายอย่างในครั้งเดียว' },
  kyrieHits: { label: '🛡️ Kyrie: แตกหลังโดน (ฮิต)', effect: 'เพิ่ม = โล่ Kyrie รับการโจมตีได้หลายครั้งขึ้นก่อนสลาย' },
  gloriaLuk: { label: '✨ ★ Gloria: +LUK ระหว่างบัฟ', effect: 'เพิ่ม = ช่วงมีพรแสงจะได้ค่า LUK พุ่ง (เพิ่มคริ + หลบโชคดี + ดรอป)' },
  pickPoison: { label: '🐍 ล้วงกระเป๋า: พิษใส่เป้า (สแต็ก)', effect: 'เพิ่ม = แทงขโมย Energy แล้วยัดสแต็กพิษใส่มอนหนาขึ้น' },
  // P2'b Thief ม่านควัน / แผลลึก
  smokeTurns: { label: '🌫️ ม่านควัน: Shroud นาน (เทิร์น)', effect: 'เพิ่ม = อยู่ในม่านควัน (FLEE / skillCrit / ดาเมจคริ ★ / ราชันย์โลหิต) ได้นานหลายเทิร์นขึ้น' },
  smokeFlee: { label: '🌫️ Shroud: FLEE +% (คูณ)', effect: 'เพิ่ม = ระหว่างอยู่ในม่านควัน FLEE คูณสูงขึ้น หลบการโจมตีมอนได้บ่อยขึ้น (0.25 = ×1.25)' },
  smokeSkillCrit: { label: '🌫️ Shroud: skillCrit +', effect: 'เพิ่ม = ระหว่างอยู่ในม่านควัน สกิล/Ult ติดคริง่ายขึ้น (ยังอยู่ใต้เพดาน skillCrit)' },
  smokeCritDmg: { label: '👥 ★ ควันหนา: ดาเมจคริ + ใน Shroud', effect: 'เพิ่ม = มี ★ แล้วอยู่ในม่านควัน ติดคริแรงขึ้น (บวกเข้าดาเมจคริ ไม่คูณ)' },
  raidMul: { label: '🌫️ Sightless Raid: × P.ATK', effect: 'เพิ่ม = ฮิตแรกหลังร่ายม่านควันฟาดโบนัสแรงขึ้น' },
  exposedPct: { label: '👁️ Exposed: รับดาเมจเพิ่ม', effect: 'เพิ่ม = มอนที่โดน Sightless Raid รับดาเมจตรง (ไม่ใช่พิษ) แรงขึ้น (รวมกับโบนัสรับดาเมจอื่น ไม่เกินเพดาน B1)' },
  exposedStar: { label: '👁️ ★ Exposed: รับดาเมจเพิ่ม', effect: 'เพิ่ม = มี ★ ควันหนา แล้ว Exposed ดันดาเมจที่มอนรับได้สูงขึ้น' },
  exposedTurns: { label: '👁️ Exposed: นาน (เทิร์นมอน)', effect: 'เพิ่ม = มอนติด Exposed นานขึ้น ตีซ้ำได้หลายรอบขึ้น' },
  smokeBlindTurns: { label: '🌫️ Blind: นาน (เทิร์นมอน)', effect: 'เพิ่ม = มอนตาบอด (Hit ลดตาม Crusader blindHit) นานขึ้น ตีโจรพลาดบ่อยขึ้น' },
  woundStacks: { label: '🩸 แผลลึก: Wound ต่อการแทง', effect: 'เพิ่ม = แทงแผลลึกแปะ Wound หนาขึ้น จุด Blade\'s End ได้เร็วขึ้น' },
  woundStarStacks: { label: '⚰️ ★ แผลมรณะ: Wound ต่อการแทง', effect: 'เพิ่ม = มี ★ แล้วแทงแผลลึกแปะ Wound หนาขึ้น' },
  woundTurns: { label: '🩸 Wound นาน (เทิร์นฮีโร่)', effect: 'เพิ่ม = Wound อยู่บนมอนนานขึ้นก่อนหาย (รีเฟรชทุกครั้งที่แปะ)' },
  woundStrikeChance: { label: '🔪 แผลฉีก: D.Strike แปะ Wound (โอกาส)', effect: 'เพิ่ม = มี "+" แล้ว Double Strike แปะ Wound +1 บ่อยขึ้น' },
  bladeAt: { label: "🩸 Blade's End: Wound ขั้นต่ำ", effect: "⚠️ ลดเลข = จุด Blade's End ได้ง่ายขึ้น (ใช้ Wound เท่านี้ต่อครั้ง)" },
  bladeMul: { label: "🩸 Blade's End: × P.ATK", effect: "เพิ่ม = ระเบิดแผล Blade's End แรงขึ้น (ทะลุ DEF)" },
  bladeHealCut: { label: "🩸 Blade's End: ตัดฮีลมอน", effect: "เพิ่ม = หลัง Blade's End มอนฮีลตัวเองได้น้อยลง (ไม่ซ้อนกับตัดฮีลอื่น ใช้ค่าที่มากกว่า)" },
  bladeCutTurns: { label: "🩸 Blade's End: ตัดฮีลนาน (เทิร์นมอน)", effect: 'เพิ่ม = มอนโดนตัดฮีลนานขึ้น' },
  woundPriv: { label: '🩸 Privileged (แผลลึก): รับดาเมจเพิ่ม', effect: 'เพิ่ม = มอนที่ติดทั้งพิษและ Wound รับดาเมจทุกแบบ (รวมพิษ) แรงขึ้น (รวมในเพดาน B1)' },
}

const S4_EFFECT: Record<string, string> = {
  cost: '⚠️ ลดเลข = กด Spiral Pierce ได้ถี่ขึ้น · เพิ่ม = เปลือง Mana มากขึ้น (แย่ง Mana กับ Ult)',
  cd: '⚠️ ลดเลข = Spiral Pierce วนกลับมาเร็วขึ้น (ทุบโล่ / ตัดร่ายบ่อยขึ้น)',
  unlockLv: '⚠️ ลดเลข = Knight ได้ Skill 4 เร็วขึ้น (Job2 Lv ต่ำลง)',
  mul: 'เพิ่ม = แทงเกลียวแรงขึ้น (× P.ATK + % Max HP จากถึกเป็นแรง)',
  shatterAmp: 'เพิ่ม = ทุบโล่มอนได้แล้วแทงแรงขึ้นอีก',
  defPierce: 'เพิ่ม = Spiral Pierce ข้าม P.DEF ของเป้าหมายมากขึ้น (รวมกับ ★ ทะลวงเกลียว)',
  critAdd: 'เพิ่ม = Spiral Pierce มีโอกาสติดคริสกิลสูงขึ้น (บวกเข้าโอกาสคริสกิลโดยตรง)',
  spBreakAmp: 'เพิ่ม = เป้าที่ติด Break จาก Spiral Pierce โดนสกิล/โจมตีกายภาพของ Knight แรงขึ้น',
  bossShield: 'เพิ่ม = โล่บอส/เฟสหายมากขึ้นต่อการแทง (1 = หายหมด)',
  bossGauge: 'เพิ่ม = บอสโดนตัดร่ายแล้วเกจถอยหลังมากขึ้น',
  fang: 'เพิ่ม = 🐍 ทุกฮิตของฮีโร่ตีโล่มอนหายเร็วขึ้น (เฉพาะส่วนโล่)',
  breakTurns: 'เพิ่ม = ⛓️ Break ปิด passive มอน (สะท้อน / ดูดเลือด / ติดสถานะ ...) นานขึ้น',
  lkHits: 'เพิ่ม = Lord Knight แทงเกลียวหลายครั้งขึ้น',
  lkMul: 'เพิ่ม = Lord Knight แต่ละแทงแรงขึ้น',
  lkPierce: 'เพิ่ม = แทงสุดท้ายของ Lord Knight ข้าม DEF มากขึ้น',
}

const J2_DETAIL_HINTS: Record<string, string> = {
  'berserker.ignorePainTurns': '★ ไม่รู้สึกเจ็บ: ฮีโร่เลือดเหลือ 1 HP อมตะตามจำนวนเทิร์นนี้ (ฮีล/ดูดเลือดไม่ทำงาน) ก่อนเข้าช่วง regen',
  'berserker.ignorePainRegenPct': '★ หลังจบช่วงอมตะ 1 HP ฮีโร่จะฮีลคืนจากสัดส่วนของดาเมจตรง (ไม่รวม DoT) ที่ตัวเองทำได้',
  'berserker.waveCdJ2': 'ใช้เฉพาะ Berserker ขั้น 2 เท่านั้น · Class 3 Warlord ยังใช้คูลดาวน์คลื่นดาบ 3 เทิร์น (waveCd / JOB2.berserker.skill3.cd)',
  'berserker.stormFrenzyAt': 'เมื่อ Frenzy ถึงเกณฑ์นี้ หรือกำลังอยู่ในสถานะบ้าระห่ำ ดาบสยบมนตร์ของ Berserker จะแรงขึ้นตาม stormFrenzyAmp',
  'knight.boomerangTurns': 'Spear Boomerang จะยิงซ้ำเมื่อครบคูลดาวน์จำนวนเทิร์นฮีโร่นี้ (ไม่ใช่ 1 ครั้งต่อเวฟ)',
  'knight.spiralS3S4Pierce': '★ ทะลวงเกลียว (kn_p4) บวกการเจาะเกราะนี้ให้ทั้ง Brandish Spear และทุกฮิตของ Spiral Pierce (เพดาน 100%)',
  'knight.s4.spBreakAmp': 'มีผลเฉพาะโจมตีกายภาพของ Knight ต่อเป้าที่ยังติดสถานะ spBreak จาก Spiral Pierce เท่านั้น',
  'knight.tree.sweepRes': 'ได้รับ Mana ทันทีทุกครั้งที่ทวนวนทำงานร่วมกับโนด ⚡ ทวนเร็ว (kn_r3)',
  'crusader.gcPay': 'หัก HP ปัจจุบัน (ไม่ใช่ Max HP) เพื่อร่าย Grand Cross และนำจำนวน HP ที่เสียไปบวกกับ Mana ที่เผาเป็นโบนัส gcBurn',
  'crusader.gcBurn': 'สูตรโบนัสเวทต่อเป้า = gcBurn × (Mana ที่เผาทิ้งทั้งหมด + HP ที่จ่ายไป)',
  'crusader.guardCap': 'Paladin (ขั้น 3) บวกเพดานนี้เพิ่มอีก +10% (จาก 40% → 50%)',
  'monk.asuraSlow': '⚠️ อาชูร่าสไตรก์: เพิ่ม = ติดสถานะ 😵 ง่อยแดกแล้วเดินช้าลงมากขึ้น',
  'monk.asuraWeak': '⚠️ อาชูร่าสไตรก์: เพิ่ม = ติดสถานะ 😵 ง่อยแดกแล้วตีธรรมดาเบาลงมากขึ้น',
  'monk.asuraExhaustTurns': '⚠️ อาชูร่าสไตรก์: เพิ่ม = หลังปล่อยอสุราแล้วติด 😵 ง่อยแดก (0 Mana/ลูกพลัง/ล็อกสกิล) นานขึ้น',
  'monk.haymakerAt': 'ลดเลข = หมัดแค้นปล่อยออกง่ายขึ้น (สะสมแรงฮึดถึงเกณฑ์ไวขึ้น)',
  'monk.haymakerStarAt': 'ลดเลข = ★ หมัดพิพากษา ปล่อยออกง่ายขึ้นอีก (สะสมแรงฮึดถึงเกณฑ์ไวขึ้น)',
  'monk.haymakerMdefHp': 'รวมสูตร True Damage จากค่า M.DEF (0..0.75) × Max HP ของมังค์',
  'monk.asuraMdefHp': 'รวมสูตรเบิร์สจากค่า M.DEF (0..0.75) × Max HP ของมังค์ เพิ่มเข้ากับ P.ATK + Mana ที่เผา',
  'monk.comboFinishCdCut': 'เพิ่ม = ★ พายุหมัดปิดฉากช่วยหั่นคูลดาวน์ Skill 3 และ Ult กลับมามากขึ้น',
  'sage.basicMul': 'Sage ใช้หนังสือตีประชิดเป็น P.ATK (แทนที่จะยิงลูกเวทเล็ก 0.6× แบบ Mage) เพื่อกระตุ้น Auto Spell',
  'innovator.mirrorCap': 'สะท้อนดาเมจกลับใส่มอนตาม % ดาเมจที่โดน แต่ไม่เกินเพดาน battle.reflectCap × Max HP',
  'innovator.wetAmp': '☁️ เมฆฝนทำให้มอนที่ติดเปียกรับดาเมจแรงขึ้นจากทุกฮิตของฮีโร่',
}

const SWORD_S1_LV: Record<string, [string, string]> = {
  atkPct: ['× P.ATK', 'เพิ่ม = ดาบสยบมนตร์ Lv นี้ฟันแรงขึ้นตาม P.ATK'],
  str: ['× STR', 'เพิ่ม = ดาบสยบมนตร์ Lv นี้บวกดาเมจตาม STR มากขึ้น (สาย STR ได้เปรียบ)'],
  base: ['ดาเมจฐาน × Base Lv', 'เพิ่ม = ดาบสยบมนตร์ Lv นี้บวกดาเมจคงที่ตาม Base Lv มากขึ้น (แปลงเป็นหน่วย P.ATK ในไฟต์)'],
}

/** Q 2026-11-24 Awakening (KIT3) keys: Lord Knight / Warlord. */
function explainKit3Effect(key: string): string {
  if (/\.per$/.test(key)) return 'เพิ่ม = ร่างแปลงสกิล 3 แรงขึ้นต่อแต้มที่ลงในสายที่ผูกไว้ (ชนเพดาน cap)'
  if (/\.cap$|Cap$/.test(key)) return 'เพิ่ม = ปลดเพดานโบนัสให้ลงแต้มสายเดิมแล้วได้ผลต่อ'
  if (key === 'heirNeed') return '⚠️ ลดเลข = ปลดโบนัสทายาท (ฮิตเพิ่ม / ผลพิเศษ) ได้ง่ายขึ้น · เพิ่ม = ต้องลงแต้มสายนั้นเยอะขึ้น'
  if (/Taken$/.test(key)) return '⚠️ เพิ่ม = ฮีโร่โดนตีแรงขึ้นเป็นข้อเสียแลกพลัง (ลด = ปลอดภัยขึ้น)'
  if (/Turns$|\.burn$/.test(key)) return 'เพิ่ม = ผล/สถานะนี้อยู่นานขึ้น (เทิร์น)'
  if (/hits$|Hits$/.test(key)) return 'เพิ่ม = จำนวนฮิตมากขึ้น ดาเมจรวมพุ่ง'
  if (/push$|Push$/.test(key)) return 'เพิ่ม = ผลักเกจเทิร์นมอนถอยหลังไกลขึ้น'
  if (/[Rr]age/.test(key)) return 'เพิ่ม = ได้/ใช้ Rage ในเงื่อนไขนี้มากขึ้น'
  if (/[Hh]eal|shield|hp|Hp/.test(key)) return 'เพิ่ม = ฮีล / โล่ / ส่วน Max HP ที่บวกเข้าท่านี้มากขึ้น'
  if (/pierce/.test(key)) return 'เพิ่ม = ข้าม P.DEF มอนได้มากขึ้น (ตีบอสเกราะหนาแรงขึ้น)'
  return 'เพิ่ม = ตัวคูณ/โบนัสของ Awakening ท่านี้แรงขึ้น'
}

const J2_EXACT_EFFECT: Record<string, string> = {
  'knight.brandPushOther': 'เพิ่ม = Brandish Spear ผลักเกจมอนตัวรอง (ตัวที่ 2–3) ถอยหลังไกลขึ้น',
  'knight.brandCritAdd': 'เพิ่ม = Brandish Spear มีโอกาสติดคริสกิลสูงขึ้น (บวกเข้าโอกาสคริของสกิลโดยตรง)',
  'knight.brandLowTargetAmp': 'เพิ่ม = เมื่อมอนเหลือ ≤ 2 ตัว Brandish Spear แทงตัวหน้าแรงขึ้นตามสัดส่วนนี้',
  'knight.boomerangTurns': '⚠️ ลดเลข = Spear Boomerang ยิงซ้ำได้ถี่ขึ้น · เพิ่ม = รอคูลดาวน์นานขึ้น (เทิร์น)',
  'knight.spiralS3S4Pierce': 'เพิ่ม = ★ ทะลวงเกลียวช่วยให้ Brandish Spear และ Spiral Pierce ข้าม P.DEF มอนได้มากขึ้น',
  'knight.tree.sweepCritAdd': 'เพิ่ม = ทวนวนมีโอกาสติดคริสกิลสูงขึ้น (บวกเข้าโอกาสคริของสกิลโดยตรง)',
  'knight.tree.sweepRes': 'เพิ่ม = ทวนเร็วฟื้น Mana ให้ฮีโร่มากขึ้นทุกครั้งที่ทวนวนกวาดออก',
  'berserker.stormFrenzyAmp': 'เพิ่ม = เมื่อ Frenzy ถึงเกณฑ์ (หรือกำลังบ้าระห่ำ) ดาบสยบมนตร์ฟันแรงขึ้นตามสัดส่วนนี้',
  'berserker.stormFrenzyAt': '⚠️ ลดเลข = สะสม Frenzy น้อยลงก็ปลดโบนัสดาบสยบมนตร์แรงขึ้น · เพิ่ม = ต้องเก็บ Frenzy เยอะขึ้น',
  'berserker.waveCdJ2': '⚠️ ลดเลข = คลื่นดาบของ Berserker วนกลับมาใช้ได้ถี่ขึ้น · เพิ่ม = รอคูลดาวน์นานขึ้น (Warlord ใช้ CD 3)',
  'berserker.waveHits': 'เพิ่ม = คลื่นดาบฟันซ้ำหลายฮิตขึ้นต่อการกดใช้ 1 ครั้ง',
  'berserker.waveGoreAtk': 'เพิ่ม = ดีบัฟเลือดไหล (Gore) จากคลื่นดาบกัด DoT ต่อเทิร์นแรงขึ้น (× P.ATK)',
  'berserker.waveGoreTurns': 'เพิ่ม = ดีบัฟเลือดไหล (Gore) จากคลื่นดาบกัดต่อเนื่องหลายเทิร์นขึ้น',
  'berserker.waveMultiRage': 'เพิ่ม = เมื่อคลื่นดาบฟันโดนหลายตัวตามเกณฑ์ จะได้ Rage คืนมากขึ้น',
  'berserker.waveMultiAt': '⚠️ ลดเลข = โดนมอนน้อยตัวลงก็ได้ Rage คืนจากคลื่นดาบ · เพิ่ม = ต้องโดนมอนหลายตัวขึ้น',
  'berserker.ultRageGain': 'เพิ่ม = กดใช้ Ult บ้าระห่ำแล้วได้รับ Rage ทันทีมากขึ้น',
}

function explainKit2Effect(id: Job2Id, key: string, j2Name: string): string {
  const exact = J2_EXACT_EFFECT[`${id}.${key}`]
  if (exact) return exact
  if (key.startsWith('s4.')) return S4_EFFECT[key.slice(3)] ?? 'เพิ่ม = 🌀 Spiral Pierce (Skill 4) แรงขึ้น'
  if (key.startsWith('tree.')) return `ปรับพลังโนด Skill tree ของ ${j2Name} (ตัวคูณ/ผลต่อ Lv เดิม หรือ ★ สำคัญ)`
  if (key.startsWith('mastery.')) {
    if (key.endsWith('atkPct')) return `เพิ่ม = โบนัส P.ATK (%) จากพาสซีฟชำนาญอาวุธของ ${j2Name} สูงขึ้น`
    if (key.endsWith('matk')) return `เพิ่ม = โบนัส M.ATK พื้นฐานของ ${j2Name} สูงขึ้น`
    if (key.endsWith('crit')) return `เพิ่ม = โบนัสโอกาสคริพื้นฐานจากพาสซีฟอาวุธของ ${j2Name} สูงขึ้น`
    if (key.endsWith('skillCrit')) return `เพิ่ม = โบนัสโอกาสคริสกิลจากพาสซีฟอาวุธของ ${j2Name} สูงขึ้น`
    if (key.endsWith('hit')) return `เพิ่ม = โบนัสความแม่น (Hit) ของ ${j2Name} สูงขึ้น`
    if (key.endsWith('def')) return `เพิ่ม = โบนัสเกราะ P.DEF ของ ${j2Name} สูงขึ้น`
    if (key.endsWith('combo')) return `เพิ่ม = โบนัสโอกาสคอมโบของ ${j2Name} สูงขึ้น`
    if (key.endsWith('spellCrit')) return `เพิ่ม = โบนัสเวทคริของ ${j2Name} สูงขึ้น`
    if (key.endsWith('poisonDmg')) return `เพิ่ม = พิษทุกสแต็กกัดมอนแรงขึ้นต่อชั้น`
  }
  if (/^(asuraSlow|asuraWeak|asuraExhaustTurns)$/.test(key)) return '⚠️ ข้อเสียหลังปล่อยอาชูร่า: เพิ่ม = ติดสถานะง่อยแดกหนัก/นานขึ้น (ลดเลข = ฟื้นตัวไวขึ้น)'
  if (/Dr$/.test(key)) return 'เพิ่ม = ลดดาเมจที่ฮีโร่ได้รับลงตามสัดส่วนนี้ (ถึกขึ้น)'
  if (/MdefHp$/.test(key)) return 'เพิ่ม = โบนัสดาเมจที่คำนวณจาก M.DEF × Max HP แรงขึ้นชัดเจน'
  if (/Turns$|Grace$/.test(key)) return 'เพิ่ม = บัฟ/สถานะหรือเอฟเฟกต์นี้คงอยู่นานขึ้นกี่เทิร์น'
  if (/Hits$|MaxHits$|Knives$|Boxes$|Meteors$|Pulses/.test(key) || key.startsWith('gcPulses.')) return 'เพิ่ม = จำนวนฮิต/ลูก/กระแทกมากขึ้น (เพิ่มดาเมจรวมและการทริกเกอร์เอฟเฟกต์)'
  if (/Push$/.test(key) || key === 'roar') return 'เพิ่ม = ผลักเกจเทิร์นมอนถอยหลังไปไกลขึ้น ทำให้ฮีโร่ได้เปรียบเทิร์น'
  if (/Every$/.test(key)) return '⚠️ ลดเลข = ออกท่าอัตโนมัตินี้ถี่ขึ้น (เก่งขึ้น) · เพิ่มเลข = นาน ๆ ออกที'
  if (/Cap$/.test(key)) return 'เพิ่ม = ปลดเพดานสูงสุดของเอฟเฟกต์ให้ปั้นสเตตัส/โล่ต่อได้สูงขึ้น'
  if (/Chance$|Crit$|Stun$|Taunt$|Guard$|Bleed$|Burn$|Chill$|Break$/.test(key)) return 'เพิ่ม = โอกาสติดผลหรือจำนวนชั้นดีบัฟมากขึ้น'
  if (/Taken$/.test(key)) return '⚠️ เพิ่ม = ฮีโร่รับดาเมจหนักขึ้นเป็นข้อเสียแลกบัฟ (ลด = เสี่ยงน้อยลง)'
  if (/Pay$/.test(key)) return '⚠️ เพิ่ม = เสีย % HP ปัจจุบันตอนกดร่ายมากขึ้น (แรงกับ gcBurn มากขึ้น แต่เสี่ยงเลือดลด)'
  if (/Refund|CdRefund/.test(key)) return 'เพิ่ม = คืนทรัพยากร (HP / คูลดาวน์) กลับมามากขึ้นเมื่อเข้าเงื่อนไข'
  if (/Speed$|Aspd/.test(key)) return 'เพิ่ม = ออกเทิร์นเร็วขึ้น / ได้จังหวะไวขึ้น'
  if (/Mana$/.test(key)) return 'เพิ่ม = ปริมาณ Mana ที่ได้/ขโมย/ต้องการในเงื่อนไขมากขึ้น'
  if (/Hp$|Shield$|Heal$/.test(key)) return 'เพิ่ม = ปริมาณเลือด/เกราะของฮีโร่หรือซัมมอนหนาขึ้น'
  return `เพิ่ม = เพิ่มพลังหรือตัวคูณของสกิลนี้ในสายอาชีพ ${j2Name}`
}

export function explainSkillTable(path: string, defaultLabel?: string): FieldExplain {
  const p = path.split('.')

  if (p[0] === 'crit') {
    const cls = p[1], slot = p[2]
    return {
      label: defaultLabel ?? `ความแรงคริ · ${CLS_TH[cls] ?? cls} (${SLOT_TH[slot] ?? slot})`,
      effect: '1 = คริเต็ม 100% · 0.5 = ยังติดคริแต่โบนัส (critMul−1) เหลือครึ่ง · 0 = สกิลนี้ไม่ม้วนคริเลย',
      detail: 'ใช้ควบคุมสมดุลระหว่างสายคริกับสายเวท/ตีคงที่ (ไม่รวมคริการันตี ★ พันดาบ และ on-hit procs) มีผลถึงอาชีพขั้น 2 ด้วย',
    }
  }

  if (p[0] === 'job') {
    const cls = p[1], slot = p[2], prop = p[3]
    const job = JOBS[cls as keyof typeof JOBS]
    const skName = slot === 'auto' ? job?.auto.name : job?.ult.name
    if (prop === 'cost') {
      const res = job?.resource === 'energy' ? 'Energy' : job?.resource === 'rage' ? 'Rage' : 'Mana'
      return {
        label: defaultLabel ?? `ค่าร่าย ${skName ?? slot} (${res})`,
        effect: `⚠️ ลดเลข = กดใช้${skName ?? 'สกิล'}ได้ถี่และคุ้มทรัพยากรมากขึ้น · เพิ่ม = กิน ${res} เยอะขึ้น`,
        detail: `ถ้าปรับสำหรับคลาสหลัก ค่าร่ายของ ${job?.name ?? cls} จะเปลี่ยนตามจริงทันที (ข้อความคำอธิบายต้อง build ใหม่)`,
      }
    }
    if (prop === 'cd') {
      return {
        label: defaultLabel ?? `คูลดาวน์ ${skName ?? slot} (เทิร์น)`,
        effect: '⚠️ ลดเลข = วนกลับมาใช้ Ult ได้เร็วขึ้น (ต่ำสุด 2 เทิร์น) · เพิ่ม = รอนานขึ้น',
      }
    }
  }

  if (p[0] === 'job2') {
    const id = p[1] as Job2Id, slot = p[2], prop = p[3]
    const j2 = JOB2[id]
    if (slot === 'autoCost') {
      return {
        label: defaultLabel ?? `${j2?.name ?? id} · ค่าร่ายทักษะ 1`,
        effect: `⚠️ ลดเลข = ${j2?.name ?? id} กดทักษะ 1 (ดาบสยบมนตร์) ได้ถี่ขึ้น · เพิ่ม = ต้องเก็บ ${j2?.resource === 'rage' ? 'Rage' : 'ทรัพยากร'} นานขึ้นก่อนกด`,
      }
    }
    const skName = slot === 'skill3' ? j2?.skill3.name : j2?.ult.name
    if (prop === 'cost') {
      return {
        label: defaultLabel ?? `${j2?.name ?? id} · ค่าร่าย ${skName ?? 'ทักษะ 3'}`,
        effect: '⚠️ ลดเลข = กดใช้ทักษะ 3 ได้บ่อยขึ้น · เพิ่ม = เปลือง Mana/Energy/Rage มากขึ้น',
      }
    }
    if (prop === 'cd') {
      return {
        label: defaultLabel ?? `${j2?.name ?? id} · คูลดาวน์ ${skName ?? slot}`,
        effect: '⚠️ ลดเลข = สกิลวนกลับมาใช้ได้เร็วขึ้น · เพิ่ม = คูลดาวน์นานขึ้น',
      }
    }
  }

  if (p[0] === 'skill2') {
    const id = p[1] as Skill2Id, prop = p[2]
    const s2 = SKILL2_BY_ID.get(id)
    const name = s2 ? `${s2.icon} ${s2.name}` : id
    if (prop === 'cost') {
      return {
        label: defaultLabel ?? `ค่าร่าย ${name}`,
        effect: '⚠️ ลดเลข = กดใช้ทักษะ 2 ท่านี้ได้ถี่และประหยัดมากขึ้น · เพิ่ม = จ่ายทรัพยากรแพงขึ้น',
      }
    }
    if (prop === 'cd') {
      return {
        label: defaultLabel ?? `คูลดาวน์ ${name} (เทิร์น)`,
        effect: '⚠️ ลดเลข = ทักษะ 2 ท่านี้พร้อมใช้ไวขึ้น (ขั้นต่ำ 1 เทิร์น) · เพิ่ม = รอนานขึ้น',
      }
    }
  }

  if (p[0] === 's2p') {
    const key = p[1], part = p[2]
    const info = S2P_TH[key]
    const baseName = info?.[0] ?? key
    const baseEff = info?.[1] ?? 'เพิ่ม = ความแรงหรือค่าผลของทักษะ 2 สูงขึ้น'
    return {
      label: defaultLabel ?? `${baseName} · ${part === 'base' ? 'ฐาน (Lv0)' : 'เพิ่มต่อเลเวล "+"'}`,
      effect: part === 'base' ? `${baseEff} (ฐานตั้งต้นก่อนบวก +ต่อ Lv)` : `${baseEff} (สเกลเติบโตเมื่ออัปปุ่ม "+" เพิ่มเลเวล)`,
      detail: 'สูตรคำนวณจริงในเกม: base + (per × ระดับเลเวล "+" ของทักษะ 2)',
    }
  }

  if (p[0] === 's2n' && S2N_TH[p[1]]) return { ...S2N_TH[p[1]], label: defaultLabel ?? S2N_TH[p[1]].label }

  const staticSkills: Record<string, FieldExplain> = {
    'sword.ult': { label: defaultLabel ?? 'Swordsman · ค่าร่าย Mana Ult ผ่าสวรรค์', effect: '⚠️ ลดเลข = ใช้ Mana กด Ult น้อยลง (ซิงค์เข้า jobs)' },
    'sword.ultMul': { label: defaultLabel ?? 'Swordsman · Ult 🌊 คลื่นดาบ × P.ATK', effect: 'เพิ่ม = 🌊 คลื่นดาบ (Ult นักดาบ ฟันทุกตัว) แรงขึ้น' },
    'swordS1.mana': { label: defaultLabel ?? 'Swordsman · ⚔️ ดาบสยบมนตร์ ค่า Mana (ทุก Lv)', effect: 'ลด = ใช้สกิล 1 ได้ถี่ขึ้น (Mana เท่ากันทุก Lv · Berserker จ่าย Rage คงที่ ไม่ใช้ค่านี้)' },
    'swordS1.cd': { label: defaultLabel ?? 'Swordsman · ⚔️ ดาบสยบมนตร์ คูลดาวน์', effect: 'ลด = กดสกิล 1 (ล้าง CC + ใบ้ + ขัดร่าย) ได้ถี่ขึ้น (5 = ทุก 5 เทิร์น)' },
    'swordS1.silenceTurns': { label: defaultLabel ?? 'Swordsman · ⚔️ ดาบสยบมนตร์ ใบ้กี่เทิร์น', effect: 'เพิ่ม = มอนที่โดนใช้สกิล/ร่ายไม่ได้นานขึ้น (นับเฉพาะเทิร์นที่มอนได้เล่น)' },
    'swordS1.baseLvSoft': { label: defaultLabel ?? 'Swordsman · ⚔️ ดาบสยบมนตร์ Base Lv จุดเริ่มชะลอ', effect: 'เพิ่ม = Base Lv ยิ่งสูงขึ้นก่อนดาเมจฐานต่อ Base Lv ของดาบสยบมนตร์จะเริ่มชะลอตัว (35 = ชะลอหลัง Lv 35)' },
    'swordS1.baseLvAfterScale': { label: defaultLabel ?? 'Swordsman · ⚔️ ดาบสยบมนตร์ สเกลหลังจุดชะลอ', effect: 'เพิ่ม = หลังเลย Base Lv จุดเริ่มชะลอ ดาเมจฐานต่อ Lv ของดาบสยบมนตร์ยังโตต่อมากขึ้น (0.2 = คิด 20% ต่อ Lv ที่เกิน)' },
    'swordS1.skillCritAdd': { label: defaultLabel ?? 'Swordsman · ⚔️ ดาบสยบมนตร์ โอกาสคริสกิลเพิ่ม', effect: 'เพิ่ม = ดาบสยบมนตร์มีโอกาสติดคริสูงขึ้น (บวกเข้าโอกาสคริสกิลโดยตรง)' },
    'sword.execMax': { label: defaultLabel ?? 'Swordsman · ⚖️ คำพิพากษา แรงเพิ่มสูงสุด', effect: 'เพิ่ม = 🌊 คลื่นดาบ / 🔱 Pierce of Judgement ปิดงานแรงขึ้น (1.5 = +150% เมื่อ HP มอนหายถึงจุดตัน · Ult อื่นในสายได้แค่สัดส่วน)' },
    'sword.execCapMiss': { label: defaultLabel ?? 'Swordsman · ⚖️ HP หายเท่านี้ = โบนัสตัน', effect: 'ลด = โบนัสเต็มเร็วขึ้น (0.75 = HP หาย 75% ได้เต็ม)' },
    'sword.execLow': { label: defaultLabel ?? 'Swordsman · 🌊 เส้นปล่อยคลื่นดาบ', effect: 'เพิ่ม = คลื่นดาบปล่อยเร็วขึ้น (0.3 = มีมอน HP < 30% ก็ปล่อย)' },
    'sword.execBigShare': { label: defaultLabel ?? 'Swordsman · ⚖️ บอส/มินิ ได้สัดส่วนโบนัส', effect: 'เพิ่ม = execute แรงกับบอส/มินิมากขึ้น (0.5 = ครึ่งเดียว)' },
    'sword.execLineShare': { label: defaultLabel ?? 'Swordsman · ⚖️ Ult job2/3 ได้สัดส่วนโบนัส', effect: 'เพิ่ม = บ้าระห่ำ/Undying/Pierce ได้ execute แรงขึ้น (คลื่นทะลวง Pierce of Judgement ได้เต็มแบบนักดาบ) (0.25 = สูงสุด +37.5%)' },
    'sword.awakenTurns': { label: defaultLabel ?? 'Swordsman · ⚔️ ปลุกดาบ นาน (เทิร์น)', effect: 'เพิ่ม = บัฟหลังกด Ult อยู่นานขึ้น และคลื่นดาบรอจังหวะได้นานขึ้น' },
    'sword.awakenAtk': { label: defaultLabel ?? 'Swordsman · ⚔️ ปลุกดาบ P.ATK เพิ่ม', effect: 'เพิ่ม = ระหว่างปลุกดาบ ตีกายภาพทุกอย่างแรงขึ้น (0.2 = +20%)' },
    'sword.cleaveShare': { label: defaultLabel ?? 'Swordsman · ⚔️ ปลุกดาบ ฟันตัวถัดไป', effect: 'เพิ่ม = ตีปกติระหว่างปลุกดาบฟันมอนตัวที่ 2 แรงขึ้น (0.5 = 50% ของหนึ่งฮิต)' },
    'sword.awakenHpPct': { label: defaultLabel ?? 'Swordsman · ✨ เคลือบดาบสวรรค์ % HP ที่เหลือ', effect: 'เพิ่ม = ระหว่างปลุกดาบ ทุกฮิตกายภาพตัด % HP ที่เหลือของเป้าเยอะขึ้น (0.025 = 2.5% · ไม่เกินเพดาน coatAtkCap × P.ATK)' },
    'sword.awakenHpLv': { label: defaultLabel ?? 'Swordsman · ✨ เคลือบดาบสวรรค์ +% ต่อ Lv (Lv 2-5)', effect: 'เพิ่ม = เคลือบดาบ % HP ที่เหลือของเป้าโตเร็วขึ้นตอนอัป Ult Lv 2-5' },
    'sword.awakenHpLvHi': { label: defaultLabel ?? 'Swordsman · ✨ เคลือบดาบสวรรค์ +% ต่อ Lv (Lv 6-15)', effect: 'เพิ่ม = เคลือบดาบโตเร็วขึ้นตอนอัป Ult Lv 6-15 (Job2 / Awakening)' },
    'sword.awakenStrStep': { label: defaultLabel ?? 'Swordsman · ✨ เคลือบดาบสวรรค์ ทุกกี่ STR', effect: '⚠️ ลดเลข = STR น้อยลงก็ได้ขั้นโบนัสเคลือบดาบ (สาย STR แรงขึ้นมาก) · เพิ่ม = ต้องปั้น STR เยอะขึ้น' },
    'sword.awakenStrPct': { label: defaultLabel ?? 'Swordsman · ✨ เคลือบดาบสวรรค์ +% ต่อขั้น STR', effect: 'เพิ่ม = ทุกขั้น STR บวก % HP ที่เหลือของเป้าเข้าเคลือบดาบมากขึ้น' },
    'sword.awakenBigShare': { label: defaultLabel ?? 'Swordsman · ✨ เคลือบดาบสวรรค์ บอส/มินิ', effect: 'เพิ่ม = บอส/มินิโดน % HP ที่เหลือเต็มขึ้น (1 = เท่ามอนปกติ)' },
    'sword.coatAtkCap': { label: defaultLabel ?? 'Swordsman · ✨ เคลือบดาบสวรรค์ เพดานต่อฮิต (× P.ATK)', effect: 'เพิ่ม = เพดานดาเมจเคลือบดาบสวรรค์ (% HP มอน) สูงขึ้นตาม P.ATK (1.25 = สูงสุด 125% P.ATK ต่อฮิต)' },
    'sword.coatMultiShare': { label: defaultLabel ?? 'Swordsman · ✨ เคลือบดาบสวรรค์ สัดส่วนเพดานท่าหลายฮิต', effect: 'เพิ่ม = ท่าหลายฮิต (เช่น Pierce) ได้เพดานเคลือบดาบสวรรค์ต่อฮิตมากขึ้น (0.5 = ครึ่งหนึ่งของฮิตเดี่ยว)' },
    'mage.barrier': { label: defaultLabel ?? 'Mage · บาเรียเมื่อปล่อย Ult (× M.ATK)', effect: 'เพิ่ม = หลังปล่อยเวทใหญ่ของ Mage/Wizard จะได้โล่หนากันตัวตามค่า M.ATK' },
  }
  if (staticSkills[path]) return staticSkills[path]

  // Q 2026-11-24: ⚔️ ดาบสยบมนตร์ damage table / ⚔️ ปลุกดาบ STR, one value per skill Lv
  const lv = Number(p[2]) + 1
  if (p[0] === 'swordS1' && p.length === 3 && SWORD_S1_LV[p[1]]) {
    const [what, eff] = SWORD_S1_LV[p[1]]
    return { label: defaultLabel ?? `Swordsman · ⚔️ ดาบสยบมนตร์ Lv ${lv}: ${what}`, effect: eff, detail: 'สูตร: P.ATK × atkPct + STR × str + base × Base Lv (ทั้งสาย Swordsman / Knight / Berserker · Lv = แต้มโนด "+" ทักษะ 1, เพดาน 5 / 10 / 15)' }
  }
  if (p[0] === 'sword' && p[1] === 'awakenStr' && p.length === 3) {
    return { label: defaultLabel ?? `Swordsman · ⚔️ ปลุกดาบ Lv ${lv}: STR เพิ่ม`, effect: 'เพิ่ม = ระหว่างปลุกดาบได้ STR มากขึ้น (P.ATK ขึ้น และนับเข้าขั้น STR ของ ✨ เคลือบดาบสวรรค์)', detail: 'Lv = แต้มโนดราก Ult (เพดาน 5 / 10 / 15)' }
  }

  if (p[0] === 'kit3') {
    const id = p[1], key = p.slice(2).join('.')
    return {
      label: defaultLabel ?? `${id} · ${key}`,
      effect: explainKit3Effect(key),
      detail: 'ตัวเลขอาชีพขั้น 3 (Awakening) · มีผลกับตัวที่ปลด Awakening แล้วเท่านั้น',
    }
  }

  if (p[0] === 'kit2') {
    const id = p[1] as Job2Id, key = p.slice(2).join('.')
    const j2 = JOB2[id]
    const effect = explainKit2Effect(id, key, j2?.name ?? id)
    return {
      label: defaultLabel ?? `${j2?.name ?? id} · ${key}`,
      effect,
      detail: J2_DETAIL_HINTS[`${id}.${key}`],
    }
  }

  return { label: defaultLabel ?? path, effect: 'ตัวเลขปรับสมดุลสกิลอาชีพ' }
}
