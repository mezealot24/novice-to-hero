// 🗡️ Thief skill tree + talents. Owned by the thief design thread; edit freely, only this file.
// Spec: design/skill-tree-thief.md. Identity: "the more you dodge, the stronger you get" + poison to melt bosses.
// Class passive เงาบาง (fleeFloor 0.1 in JOBS.thief.mod): lowers the monster hit floor (FLEE_RULES: 20% -> 15%).
// Node and talent ids are save data: never rename or remove a shipped id (retire it by leaving it out of the UI instead).
// P2'a (design/p2/MAIN-VS-REV4.md §4): one core column thief_core (c1 / c2 หมายหัว / c3 / c4) replaces thief_crit + thief_blood;
// thief_c3 / thief_c4 / th_t2* get new meanings, gated by save.ts migrateThiefRogueRework (jobTree + talents reset). thief_b3 / thief_l1-l4 retired.
// P2'b: th_t4a / th_t1c new meanings + ม่านควัน / แผลลึก rework -> migrateThiefRogueRework v2 (same reset).
// P2'c: thief_b1-b4 = เกจเงา modifiers (thief_b3 back as เงาวนลูป) -> migrateThiefRogueRework v5 (same reset).
// P2'd: thief_v สายเล่นแร่พิษ (INT/เวท) + th_t4b วิถีพิษคริ (Perfect Agony) -> migrateThiefRogueRework v6 (same reset).
// Node mods are written per OLD level 1..3 (★ = 1): stretchNode() (data/tree.ts) shows 5 levels.
import { node as n, rk, talent as t, type ClassTree } from '../tree-types'
import { CRIT_RULES } from '../battle-rules'
import { doubleAtkChance } from '../game-data'
import { KIT, poisonAt, slowAtLv } from '../skill-math'

// Q 2026-11-03: RO style Double Strike gates ทักษะ 2 (max 5, Lv 5 = 60%; the extra hit CAN crit, unlike RO).
// Must be 5/5 before picking ม่านควัน / ล้วงกระเป๋า / แผลลึก. Id kept from v36 (was a 10-level core node; save.ts refunds the extra).
const s2Gate = n('thief_core1', 'thief_s2', 0, '🗡️', 'D.Strike', 5, (lv) => `Double Strike: ตีปกติ + แทงพิษ มีโอกาส ${Math.round(doubleAtkChance(lv) * 100)}% ตีเพิ่ม 1 ที (คริได้) · เป้าเดียว · เต็ม 5 แล้วเลือกทักษะ 2 ได้`, (lv) => ({ doubleAtk: lv }))

export const tree: ClassTree = {
  s2Gate,
  branches: [
    { id: 'thief_a', job: 'thief', name: 'พิษ', icon: '☠️', blurb: `พิษซ้อนหนา ล้มบอสช้าแต่ชัวร์ · พิษ 1 stack = DEF มอน −${Math.round(KIT.poison.defPer * 100)}% (สูงสุด −${Math.round(KIT.poison.defCap * 100)}%) · ระเบิดพิษ` },
    { id: 'thief_b', job: 'thief', name: 'เงา', icon: '👤', blurb: 'ปรับเกจเงา: เติมไว · โล่ตอนเข้าร่างเงา · หลบในร่างเงาลด CD · ร่างเงานาน' },
    // P2'a: one core column (no ATTACH in data/tree.ts -> line 'core'); replaces thief_crit + thief_blood
    { id: 'thief_core', job: 'thief', name: 'เลือด·คริ', icon: '🩸', blurb: 'ดูดเลือดตามสถานะ · หมายหัว · ฆ่าแล้วฟื้น' },
    // P2'c: second Ult branch (data/tree.ts ATTACH thief_u: 'ult'); numbers cut for the Ult budget (thiefUltBudget, gauge on / off)
    { id: 'thief_u', job: 'thief', name: 'เงาสังหาร', icon: '🗡️', blurb: 'เงาพริ้ว: คริ · On-Hit · ทีปิด' },
    // P2'd: off-meta INT/magic poison alchemy branch (data/tree.ts ATTACH thief_v: 's1')
    { id: 'thief_v', job: 'thief', name: 'เล่นแร่พิษ', icon: '⚗️', blurb: 'สาย INT/เวท: แทงฉาบอาคม · ระเบิดสารพิษ · เลือดพิษ' },
  ],
  nodes: [
    n('thief_a1', 'thief_a', 1, '🧪', 'เคลือบพิษ', 3, (lv) => `พิษ +${lv} stack ต่อ hit`, (lv) => ({ poison: lv })),
    n('thief_a2', 'thief_a', 2, '🐌', 'พิษชา', 3, (lv) => `ดาเมจพิษ +${lv}/stack · 🐌 มอนติดพิษ ≥ ${slowAtLv(lv)} stack ช้าลง (ติดช้า ${KIT.poison.slowTurns} เทิร์นทุกครั้งที่พิษกัด) · พิษโจร +${Math.round(KIT.poison.atkPer * 100)}% P.ATK +${Math.round(KIT.poison.matkPer * 100)}% M.ATK/stack`, (lv) => ({ poisonDmg: lv, poisonSlow: lv })),
    n('thief_a3', 'thief_a', 3, '🏺', 'พิษสะสม', 3, (lv) => `เพดานพิษ ${KIT.poison.baseCap} → ${KIT.poison.baseCap + lv * 3} stack`, (lv) => ({ poisonCap: 3 * lv })),
    n('thief_a4', 'thief_a', 4, '💣', 'ระเบิดพิษ', 1, () => `มอนตาย: พิษ ${Math.round(KIT.poison.spreadShare * 100)}% กระจายไปทุกตัวที่เหลือ + ระเบิดใส่ทุกตัว (stack × ดาเมจ/stack × ${KIT.poison.spreadBurst}) · ฆ่าได้ = ระเบิดต่อเป็นลูกโซ่`, () => ({ poisonSpread: 1 })),
    // P2'c (MAIN-VS-REV4 U1 + Q1): thief_b = 👤 เกจเงา modifiers (one shadow gauge; Rev 3 Ghost Shroud merged into it). ids kept, reset by migration v5
    n('thief_b1', 'thief_b', 1, '🌫️', 'ย่องเบาในเงา', 3, (lv) => `หลบได้: โอกาส ${Math.round(Math.min(1, lv / 3) * 100)}% เกจเงา +1 เพิ่ม · ในร่างเงา Flee +${Math.round(6 * lv)}`, (lv) => ({ thShadowFill: Math.min(1, lv / 3), thShadowFlee: 6 * lv })),
    n('thief_b2', 'thief_b', 2, '🌙', 'หายใจในเงา', 3, (lv) => `หลบได้แล้วฟื้น ${Math.round(lv * 2)}% HP สูงสุด · เข้าร่างเงา: โล่เงา ${Math.round(lv * 10)}% ของ Flee (สูงสุด ${Math.round(KIT.thiefShadowShieldHpCap * 100)}% HP)`, (lv) => ({ dodgeHeal: 0.02 * lv, thShadowShield: 0.1 * lv })),
    n('thief_b3', 'thief_b', 3, '🌀', 'เงาวนลูป', 3, (lv) => `ในร่างเงา หลบได้: โอกาส ${Math.round(Math.min(1, lv / 3) * 100)}% ลด CD เงาพริ้ว 1 เทิร์น (รวมทุกแหล่งไม่เกิน ${KIT.thiefUltCdCutCap}/เทิร์น)`, (lv) => ({ thShadowDodgeCd: Math.min(1, lv / 3) })), // P2'c re-adds the id retired in P2'a (มีดคู่)
    n('thief_c1', 'thief_core', 1, '🩸', 'คมเลือดซ้อนสถานะ', 3, (lv) => `ตีเป้าที่ติดสถานะ (พิษ · ช้า · Wound · Exposed): ดูดเลือด +${Math.round(3 * lv)}% (ติด ${KIT.thiefKindsAt} ชนิดขึ้นไป ×${KIT.thiefCondLeechMulti}) · กายภาพเท่านั้น`, (lv) => ({ thCondLeech: 0.03 * lv })),
    n('thief_c2', 'thief_core', 2, '🔻', 'หมายหัว', 3, (lv) => `หมายมอน HP มากสุด · ตีตัวที่หมาย = Malice +1 · เต็ม ${KIT.thiefMark.max}: ทีถัดไปคริแน่ ดาเมจ +${Math.round(KIT.thiefMark.dmg * lv * 100)}% · ตัวที่หมายตาย = ย้ายหมาย`, (lv) => ({ thMark: lv })),
    n('thief_c3', 'thief_core', 3, '🦇', 'กระหายเลือด', 3, (lv) => `ฆ่ามอน: ฟื้น ${Math.round(4 * lv)}% HP + พิษบนศพ ${+(KIT.thiefKillPoisonHeal * 100).toFixed(1)}%/stack (สูงสุด +${Math.round(KIT.thiefKillPoisonHealCap * 100)}%) · Energy +${KIT.thiefKillRes} · คริบอส/มินิครั้งแรกของเทิร์น: ฟื้น ${+(4 * lv * KIT.thiefBossCritLeech).toFixed(1)}% HP + Energy +${KIT.thiefBossCritRes}`, (lv) => ({ thKillLeech: 0.04 * lv })),
    n('thief_c4', 'thief_core', 4, '👑', 'ราชันย์โลหิต', 1, () => `HP ต่ำกว่า ${Math.round(KIT.thiefBloodKingBelow * 100)}% หรืออยู่ในม่านควัน: ดูดเลือด ×${KIT.thiefBloodKingMul} · D.Strike ดูดเลือด ${Math.round(KIT.thiefStrikeLs * 100)}% → ${Math.round(KIT.thiefBloodKingStrikeLs * 100)}% (ไม่ซ้อนกับราชันย์โลหิตของใส่)`, () => ({ thBloodKing: 1 })),
    n('thief_u1', 'thief_u', 1, '🎯', 'เงาจุดตาย', 3, (lv) => `เงาพริ้ว: สกิลคริ +${Math.round((5 / 3) * lv)}% · ดาเมจคริ +${Math.round((5 / 3) * lv)}% ต่อชนิดดีบัฟบนเป้า (สูงสุด ${KIT.thiefUltKindsMax} ชนิด · ดาเมจคริเงื่อนไขของ Ult รวมไม่เกิน +${Math.round(KIT.thiefUltCondCap * 100)}%)`, (lv) => ({ thUltCrit: (0.05 / 3) * lv, thUltCondCritDmg: (0.05 / 3) * lv })),
    n('thief_u2', 'thief_u', 2, '🩸', 'เงาประสานอาวุธ', 3, (lv) => `เงาพริ้ว On-Hit ${Math.round((KIT.thiefOnHitBase + 0.04 * lv) * 100)}%: ทีแทงดูดเลือดตามสัดส่วนนี้ · โอกาสเท่ากันแปะ Wound 1 (ทักษะ 2 แผลลึก)`, (lv) => ({ thUltOnHit: 0.04 * lv })),
    n('thief_u3', 'thief_u', 3, '💀', 'เพชฌฆาตเงา', 3, (lv) => `คริใส่เป้า HP < ${Math.round(KIT.thiefExecBelow * 100)}%: ดาเมจคริ +${Math.round(5 * lv)}% (เงาพริ้ว + ตีปกติ/คอมโบ) · เงาพริ้วคริ: Energy +${Math.round(2 * lv)} (สูงสุด ${KIT.thiefUltCritResCap}/ครั้ง)`, (lv) => ({ thExecUlt: 0.05 * lv, thUltCritRes: 2 * lv })),
    n('thief_u4', 'thief_u', 4, '🗡️', 'เงาพันคม', 1, () => `เงาพริ้วคริ ≥ ${KIT.thiefFinisherAt} ที: แทงปิดท้ายอีก 1 ที ${KIT.thiefFinisherMul}x ของทีปกติ (คริแน่) ใส่ตัว HP น้อยสุด`, () => ({ thUltFinisher: 1 })),
    n('thief_b4', 'thief_b', 4, '👤', 'เงาสวน', 1, () => `หลบได้ทุกครั้ง = แทงสวน 0.8x (ติดพิษได้) · ร่างเงานานขึ้น +1 เทิร์น`, () => ({ dodgeStrike: 1, thShadowTurns: 1 })),
    // P2'd: thief_v สาย INT/เวท (เล่นแร่พิษ)
    n('thief_v1', 'thief_v', 1, '🔮', 'แทงฉาบอาคม', 3, (lv) => `แทงพิษ +${Math.round(60 * lv)}% M.ATK (เวท) · ตีปกติ +${Math.round(60 * lv * KIT.thiefVenomBasicShare)}% M.ATK (เวท)`, (lv) => ({ thS1Matk: 0.6 * lv })),
    n('thief_v2', 'thief_v', 2, '☣️', 'ระเบิดสารพิษ', 3, (lv) => `ตีปกติ/แทงพิษใส่เป้าพิษ ≥ ${Math.round(KIT.thiefDetAtShare * 100)}% เพดาน (${poisonAt(KIT.thiefDetAtShare, KIT.poison.baseCap)} จาก ${KIT.poison.baseCap}): ระเบิดพิษ ${Math.round(KIT.thiefDetShare * 100)}% (ขั้นต่ำ ${KIT.thiefDetMin}) ทำดาเมจ ${Math.round((KIT.thiefDetPoisonBase + KIT.thiefDetPoisonLv * lv) * 100)}%/stack + สาดตัวอื่น ${Math.round(KIT.thiefDetSplash * 100)}% (1 ครั้ง/เทิร์น)`, (lv) => ({ thDetonate: lv })),
    n('thief_v3', 'thief_v', 3, '💉', 'เลือดพิษ', 3, (lv) => `ดูดเลือดจากพิษ ${Math.round(KIT.thiefLeechLv * lv * 100)}% ของ HP ที่มอนเสียจริง (ขยาย +${(KIT.thiefLeechInt * 100).toFixed(1)}%/INT สูงสุด ${Math.round(KIT.thiefLeechCap * 100)}% · ไม่เกิน ${Math.round(KIT.thiefLeechTurnCap * 100)}% HP/เทิร์น · ระเบิดสารพิษได้ ${Math.round(KIT.thiefDetLeechShare * 100)}%)`, (lv) => ({ thPoisonLeechLv: lv })),
    n('thief_v4', 'thief_v', 4, '⚗️', 'นักเล่นแร่พิษ', 1, () => `ระเบิดสารพิษคริได้ (โอกาสจากสกิลคริ+เวทคริ สูงสุด ${Math.round(CRIT_RULES.cap.skillCrit * 100)}%) · เลือดพิษจากระเบิดสารพิษเต็ม 100% · ใส่บอส/มินิบอส คืนพิษ ${Math.round(KIT.thiefDetBossRefund * 100)}% ของที่ระเบิด`, () => ({ thDetonateStar: 1 })),
  ],
  talents: [
    // ----- row 1 · Job Lv 5 · ตั้งตัว -----
    // P2'c (ids kept, reset by migrateThiefRogueRework v5): row 1 ก้าวเงา / เปิดฉากซุ่มโจมตี · row 3 = the 3 Ult styles · th_t4c renamed (its old name = the gauge state)
    t('th_t1a', 1, '🐈', 'ก้าวเงา', 2, (r) => `เริ่มทุกเวฟ เกจเงา +${rk(r, 1, 2)} · หลบได้: Flee +${rk(r, 12, 20)} นาน ${KIT.thiefDodgeFleeTurns} เทิร์น`, (r) => ({ thWaveGauge: rk(r, 1, 2), thDodgeFlee: rk(r, 12, 20) })),
    t('th_t1b', 1, '💨', 'เปิดฉากซุ่มโจมตี', 2, (r) => `เริ่มทุกเวฟ หลบแน่นอน ${r} ครั้ง · การโจมตีแรกของเวฟคริแน่${r >= 2 ? ` + ดาเมจคริ +${Math.round(KIT.thiefOpenCritDmg * 100)}%` : ''} (กายภาพ)`, (r) => (r >= 2 ? { waveDodge: r, thWaveOpenCrit: 1, thWaveOpenCritDmg: KIT.thiefOpenCritDmg } : { waveDodge: r, thWaveOpenCrit: 1 })),
    t('th_t1c', 1, '🩸', 'กายต้านพิษ', 2, (r) => `มีมอนติดพิษ/Wound บนสนาม: ต้านทาน +${rk(r, 8, 14)}% · Max HP +${rk(r, 8, 14)} ต่อ stack พิษ/Wound บนสนาม (สูงสุด ${KIT.thiefStackHpMax} stack)`, (r) => ({ thCondTenacity: rk(r, 0.08, 0.14), thStackHp: rk(r, 8, 14) })), // P2'b; id kept (save data, reset by migrateThiefRogueRework v2)
    // ----- row 2 · Job Lv 10 · จังหวะ -----
    t('th_t2a', 2, '⚡', 'ขโมยจังหวะ', 2, (r) => `หลบได้ → Energy +${rk(r, 15, 25)} · ลด CD ทักษะ 2 หรือ Ult 1 เทิร์น (ทุก ${rk(r, 3, 2)} เทิร์น)`, (r) => ({ dodgeEnergy: rk(r, 15, 25), thDodgeCdCut: 1, thDodgeCdIcd: rk(r, 3, 2) })),
    t('th_t2b', 2, '🎯', 'จุดบอดซ้อนพิษ', 2, (r) => `คริ + คริสกิล +${rk(r, 1, 1.6).toFixed(1)}% ต่อ stack พิษ + Wound บนเป้า (สูงสุด ${KIT.thiefStackCritTalMax} stack) · กายภาพ`, (r) => ({ thStackCritTal: rk(r, 0.01, 0.016) })),
    t('th_t2c', 2, '🧪', 'จังหวะสลับมีด', 2, (r) => `หลังแทงพิษ: ตีปกติถัดไปแรง +${rk(r, 25, 40)}% · Energy +${rk(r, 10, 16)}`, (r) => ({ thWeaveDmg: rk(r, 0.25, 0.4), thWeaveRes: rk(r, 10, 16) })),
    // ----- row 3 · Job Lv 20 · เงาพริ้ว (ult) -----
    t('th_t3a', 3, '💀', 'เงาสังหาร', 2, (r) => `เงาพริ้ว: สกิลคริ +${rk(r, 5, 8)}% · ดาเมจคริ +${rk(r, 10, 15)}% ใส่เป้า HP < ${Math.round(KIT.thiefUltExecBelow * 100)}% หรือติดดีบัฟ ≥ ${KIT.thiefKindsAt} ชนิด · แทงปิดท้าย 1 ที ${rk(r, 0.35, 0.5)}x ใส่ตัว HP น้อยสุด · หลบแน่นอน −1 ครั้ง`, (r) => ({ thUltExecCrit: rk(r, 0.05, 0.08), thUltExecDmg: rk(r, 0.1, 0.15), thUltKillFinisher: rk(r, 0.35, 0.5), ultDodge: -1 })),
    t('th_t3b', 3, '🌪️', 'คมมีดประสาน', 2, (r) => `เงาพริ้ว แทง ${KIT.thiefUltHits} → ${KIT.thiefUltHits + r} ที · On-Hit +${rk(r, 3, 5)}% (ไม่มีเงาประสานอาวุธ = ${Math.round((KIT.thiefOnHitBase + rk(r, 0.03, 0.05)) * 100)}%)`, (r) => ({ ultHits: r, thUltOnHitTal: rk(r, 0.03, 0.05) })),
    t('th_t3c', 3, '🌫️', 'เงาหมอกลวงตา', 2, (r) => `เงาพริ้ว: หลบแน่นอน ${KIT.thiefUltDodge} → ${KIT.thiefUltDodge + r} ครั้ง · แต่ละทีติดพิษ +${rk(r, 2, 3)} stack · เกจเงา +1 ต่อการกด`, (r) => ({ ultDodge: r, ultPoison: rk(r, 2, 3), thUltGauge: 1 })),
    // ----- row 4 · Job Lv 30 · ล้มบอส -----
    t('th_t4a', 4, '🧫', 'สถานะทับซ้อน', 2, (r) => `ศัตรูที่พิษ ≥ ${Math.round(KIT.thiefPrivShare * 100)}% ของเพดานพิษ (${poisonAt(KIT.thiefPrivShare, KIT.poison.baseCap)} จาก ${KIT.poison.baseCap}) หรือติดดีบัฟต่างชนิด ≥ ${KIT.thiefKindsAt} อย่าง รับดาเมจ +${rk(r, 18, 30)}% (รวมพิษ · รวมกับโบนัสรับดาเมจอื่นไม่เกิน +${Math.round(KIT.thiefTakenCap * 100)}%)`, (r) => ({ thPrivileged: rk(r, 0.18, 0.3) })), // P2'b Privileged Status (B1); id kept (save data, reset by migrateThiefRogueRework v2)
    t('th_t4b', 4, '🗡️', 'วิถีพิษคริ', 2, (r) => `แปลงดาเมจคริส่วนที่เกิน ${Math.round(KIT.thiefAgonyFrom * 100)}% เป็นโบนัสดาเมจพิษ ${rk(r, 50, 80)}% (เฉพาะพิษไม่คริ ไม่รวม %HP · รวม vsPoison สูงสุด +${Math.round(KIT.thiefAgonyCap * 100)}%) · ฮิตกายภาพไม่คริเบาลง ${Math.round(KIT.thiefAgonyHitCut * 100)}%`, (r) => ({ thPerfectAgony: rk(r, 0.5, 0.8) })),
    t('th_t4c', 4, '🌑', 'หมอกลวงตา', 2, (r) => `มอนตีโดนขั้นต่ำ −${r === 1 ? 2.5 : 4}% (ต่ำสุด 10%)`, (r) => ({ fleeFloor: r === 1 ? 0.05 : 0.08 })),
  ],
}
