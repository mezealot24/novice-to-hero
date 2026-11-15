// 🐺 Beastmaster ใยชั้น 2 (docs/design/beastmaster-tree-rework-spec.md v2.1). Node ids are save data: never rename.
// All 3 pets spawn every wave (battle/allies.ts); save.pet sets Hero Passive Stance + ★ พรานแห่งป่า crit counter.
import { node as n, rk, talent as t, type ClassTree } from '../tree-types'
import { KIT2 } from '../skill-math'

const B = KIT2.beastmaster, T = B.tree
const pc = (x: number) => `${+(x * 100).toFixed(1)}%`
const n1 = (x: number) => `${+x.toFixed(1)}`

export const tree2: ClassTree = {
  branches: [
    { id: 'bm_h', job: 'archer', job2: 'beastmaster', name: 'ฟ้า', icon: '🦅', blurb: 'RO Falconer: โอกาส LUK · แรงจาก INT (M.ATK) · 🏷️ Mark / 🙈 ตาบอด · ★ เหยี่ยวทอง' },
    { id: 'bm_b', job: 'archer', job2: 'beastmaster', name: 'ป่า', icon: '🐗', blurb: 'ปราการศิลา: แบ่งรับดาเมจ · แรงฮึด Grit · โล่พิทักษ์ · ★ หมูป่าเกราะ' },
    { id: 'bm_w', job: 'archer', job2: 'beastmaster', name: 'เขี้ยว', icon: '🐺', blurb: 'คมเขี้ยวโลหิต: เจาะ DEF · เลือดไหล DoT · คลั่งความเร็ว · ★ ราชาหมาป่า' },
    { id: 'bm_k', job: 'archer', job2: 'beastmaster', name: 'ผูกพัน', icon: '🤝', blurb: 'สเกลสเตตัส · คืน Energy · สั่งลุยแรง · ★ ลูกโซ่ Tri-Beast Harmony' },
    { id: 'bm_s', job: 'archer', job2: 'beastmaster', name: 'สัญชาตญาณ', icon: '🌿', blurb: 'ฮีโร่แรงตามฝูง · ฮีลฉุกเฉิน · ขู่ลด ATK มอน · ★ คู่หูคริโต้กลับ' },
  ],
  nodes: [
    n('bm_h1', 'bm_h', 1, '🦅', 'ตาเหยี่ยว', 3, (lv) => `Blitz Beat โอกาส +${pc(T.hawkChance * lv)} · ฮีโร่ HIT +${n1(T.hawkHit * lv)} · การโจมตีใส่เป้า 🏷️ เมิน Flee ศัตรู ${pc(T.markPierceFlee * lv)}`, (lv) => ({ j2HawkChance: T.hawkChance * lv, hit: T.hawkHit * lv, j2MarkPierceFlee: T.markPierceFlee * lv })),
    n('bm_h2', 'bm_h', 2, '🪶', 'กรงเล็บเหล็ก', 3, (lv) => `เหยี่ยวแรง +${pc(T.hawkMul * lv)} (หลักจาก INT/M.ATK) · กรงเล็บเหล็ก: +${(T.hawkIntAdd * lv).toFixed(1)}×INT ต่อฮิต · 🏷️ Mark แรงขึ้น +${pc(T.preyMarkAdd * lv)}${lv >= T.preyTurnsAtLv ? ' · อยู่นาน +1 เทิร์น' : ''}`, (lv) => ({ j2HawkMul: T.hawkMul * lv, j2HawkIntAdd: T.hawkIntAdd * lv, j2PreyMarkAdd: T.preyMarkAdd * lv, j2PreyTurns: lv >= T.preyTurnsAtLv ? 1 : 0 })),
    n('bm_h3', 'bm_h', 3, '🌪️', 'โฉบฝูง', 1, () => `Blitz Beat ฟาดเพิ่ม +1 เป้าหมาย · 🪶 ลมกรด: ทุกการโฉบครั้งที่ ${B.gustEvery} ศัตรูทุกตัวที่โดนติดสถานะ 🙈 ตาบอด ${B.gustBlind} เทิร์น (Hit -${B.blindHit})`, () => ({ j2HawkHits: 1, j2Gust: 1 })),
    n('bm_h4', 'bm_h', 4, '✨', 'เหยี่ยวทอง', 1, () => `วิวัฒน์เหยี่ยวทอง: แรง +${pc(B.hawkEvoMul)} ฟาดเพิ่ม ${B.hawkEvoHits} เป้าหมาย · คริ +${pc(B.spotCrit)} · 👁️ จุดตาย: แปะ 🏷️ สำเร็จ = ระดมหมาป่าได้เกจ 100 ทันที`, () => ({ j2HawkEvo: 1, crit: B.spotCrit })),
    n('bm_b1', 'bm_b', 1, '🐗', 'พันธะศิลา', 3, (lv) => `หมูป่า HP +${pc(T.boarHp * lv)} ของฮีโร่ · แบ่งรับดาเมจแทนฮีโร่เพิ่มเป็น ${pc(B.boarShare + T.boarShare * lv)} · ดาเมจที่หมูป่ารับเข้าตัวลดลงอีก -${pc(T.boarCut * lv)}`, (lv) => ({ j2BoarHp: T.boarHp * lv, j2BoarShare: T.boarShare * lv, j2BoarCut: T.boarCut * lv })),
    n('bm_b2', 'bm_b', 2, '💥', 'เขี้ยวงัดพายุ', 3, (lv) => `พุ่งชนแรง +${pc(T.boarMul * lv)} P.ATK · 💢 แรงฮึด: สะสมเกจความโกรธเร็วขึ้น +${n1(T.boarRageK * lv)} หน่วยต่อดาเมจที่รับแทน`, (lv) => ({ j2BoarMul: T.boarMul * lv, j2BoarRageK: T.boarRageK * lv })),
    n('bm_b3', 'bm_b', 3, '🛡️', 'ปราการพิทักษ์', 2, (lv) => `หมูป่าพุ่งชนมอบโล่ให้ฮีโร่ ${pc(T.boarShield * lv)} Max HP · ขณะหมูป่า HP > ${pc(B.boarGuardHpPct)}: ฮีโร่ลดดาเมจที่ได้รับลง -${pc(T.boarGuardDr * lv)}`, (lv) => ({ j2BoarShield: T.boarShield * lv, j2BoarGuardDr: T.boarGuardDr * lv })),
    n('bm_b4', 'bm_b', 4, '🐗', 'หมูป่าเกราะ', 1, () => `วิวัฒน์หมูป่าเกราะ: HP +${pc(B.boarEvoHp)} · พุ่งชนทุก ${B.boarEvoEvery} เทิร์น · ฟื้นจากสลบไวขึ้น (เหลือ ${B.boarRecoverTurns - T.boarDownCut} เทิร์น) และเมื่อตื่นจะมอบโล่ ${pc(B.boarReviveShield)} HP ให้ฮีโร่ทันที`, () => ({ j2BoarEvo: 1, j2BoarDownCut: T.boarDownCut })),
    n('bm_w1', 'bm_w', 1, '🐺', 'คมเขี้ยวฉีกเนื้อ', 3, (lv) => `หมาป่ากัดแรง +${pc(T.wolfMul * lv)} P.ATK · การกัดใส่ศัตรูที่มีสแตก Bleed จะเมิน DEF ศัตรู ${pc(T.wolfPierceBleed * lv)}`, (lv) => ({ j2WolfMul: T.wolfMul * lv, j2WolfPierceBleed: T.wolfPierceBleed * lv })),
    n('bm_w2', 'bm_w', 2, '🩸', 'แผลลึกโลหิต', 3, (lv) => `การกัดแปะ Bleed เพิ่ม +${T.wolfBleed * lv} stack · ความเสียหายต่อรอบของ Bleed แรงขึ้น +${pc(T.bleedDmg * lv)}`, (lv) => ({ j2WolfBleed: T.wolfBleed * lv, j2BleedDmg: T.bleedDmg * lv })),
    n('bm_w3', 'bm_w', 3, '💨', 'ฝีเท้าคลั่ง', 3, (lv) => `หมาป่าเร็ว +${pc(T.wolfSpeed * lv)} · 🩸 คลั่งเลือด: ทุก 1 stack ของ Bleed บนตัวหน้า = ฮีโร่และหมาป่าเร็วขึ้น +${pc(B.frenzySpd * lv)} (สูงสุด ${B.frenzyCap} stacks)`, (lv) => ({ j2WolfSpeed: T.wolfSpeed * lv, j2Frenzy: B.frenzySpd * lv })),
    n('bm_w4', 'bm_w', 4, '👑', 'ราชาหมาป่า', 1, () => `วิวัฒน์ราชาหมาป่า: กัดแรง +${pc(B.wolfEvoMul)} เร็ว +${pc(B.wolfEvoSpeed)} · 🦷 ขย้ำปลิดชีพ: กัดฮิตที่ ${B.crunchEvery} / เป้าติด 🏷️ / เลือด < ${pc(B.crunchLow)} = คริ 100% + ฮีลฮีโร่และหมูป่า ${pc(B.crunchHeal)} ของดาเมจ`, () => ({ j2WolfEvo: 1 })),
    n('bm_k1', 'bm_k', 1, '🐾', 'ใจเดียวกัน', 3, (lv) => `สัตว์ทุกตัวแรงขึ้น +${pc(T.petPow * lv)} · สัตว์ได้รับโบนัส ATK เพิ่มตาม ${pc(T.petStatScale * lv)} ของสเตตัสสูงสุดของฮีโร่ (STR/DEX/AGI)`, (lv) => ({ j2PetPow: T.petPow * lv, j2PetStatScale: T.petStatScale * lv })),
    n('bm_k2', 'bm_k', 2, '🔋', 'ประสานล่า', 3, (lv) => `สัตว์ลงมือ 1 ครั้ง = คืน Energy +${n1(T.petRes * lv)} · ฮีโร่โจมตีปกติ = เร่งเกจหมาป่า +${n1(T.wolfRallyStep * lv)}`, (lv) => ({ j2PetRes: T.petRes * lv, j2WolfRallyStep: T.wolfRallyStep * lv })),
    n('bm_k3', 'bm_k', 3, '📯', 'คำสั่งจ่าฝูง', 3, (lv) => `สกิลสั่งลุยใช้ Energy −${n1(T.cmdCut * lv)} (${B.cmdCost} → ${n1(B.cmdCost - T.cmdCut * lv)})${lv >= T.cmdHawkLv ? ' · สั่งลุยทำให้เหยี่ยวโฉบเพิ่มเป็น 2 ครั้ง' : ''}`, (lv) => ({ j2CmdCut: T.cmdCut * lv, j2CmdHawkAdd: lv >= T.cmdHawkLv ? 1 : 0 })),
    n('bm_k4', 'bm_k', 4, '🦁', 'ฝูงพันธมิตร', 1, () => `สัตว์ทุกตัวแรง +${pc(T.pack3Pow)} · 🤝 ลูกโซ่ 3 สัตว์: เหยี่ยวแปะ 🏷️ Mark → หมาป่ากัดเป้าหมายแรงขึ้น +${pc(B.harmonyWolf)} และฮีลหมูป่า ${pc(B.harmonyBoarHeal)} Max HP`, () => ({ j2Pack3: 1 })),
    n('bm_s1', 'bm_s', 1, '🎯', 'กลิ่นอายจ่าฝูง', 3, (lv) => `ฮีโร่แรง +${pc(T.packLead * lv)} P.ATK ต่อสัตว์ที่มีชีวิตในสนาม (สัตว์ 3 ตัว = สูงสุด +${pc(T.packLead * 3 * lv)})`, (lv) => ({ j2PackLead: T.packLead * lv })),
    n('bm_s2', 'bm_s', 2, '🩹', 'เยียวยาพงไพร', 3, (lv) => `สัตว์ลงมือ 1 ครั้ง = ฮีลฮีโร่ ${pc(T.petHeal * lv)} Max HP · หากฮีโร่เลือดต่ำกว่า ${pc(B.petHealLowHp)} ปริมาณการฮีลเพิ่มเป็น 2 เท่า`, (lv) => ({ j2PetHeal: T.petHeal * lv, j2PetHealLow: T.petHealLow })),
    n('bm_s3', 'bm_s', 3, '🐺', 'เสียงขู่พงไพร', 3, (lv) => `เริ่มเวฟ: ผลักเกจมอนสเตอร์ทุกตัว −${n1(T.roar * lv)} · ลดพลังโจมตีของมอนสเตอร์ลง -${pc(T.roarWeaken * lv)} ใน ${B.roarWeakenTurns} เทิร์นแรก`, (lv) => ({ j2Roar: T.roar * lv, j2RoarWeaken: T.roarWeaken * lv })),
    n('bm_s4', 'bm_s', 4, '🏹', 'พรานแห่งป่า', 1, () => 'ฮีโร่โจมตีติดคริติคอล → สัตว์คู่หูพรานที่เลือกไว้ (save.pet) จะพุ่งเข้าโจมตีซ้ำทันที (1 ครั้ง/เทิร์นฮีโร่) พร้อมเปิดใช้งานท่าโต้กลับเฉพาะตัว', () => ({ j2CritPet: 1 })),
  ],
  talents: [
    t('bm_t1_pet', 1, '🐾', 'พลังพงไพร', 2, (r) => `สัตว์ทุกตัวแรงขึ้น +${rk(r, 8, 12)}%`, (r) => ({ j2PetPow: rk(r, 0.08, 0.12) })),
    t('bm_t1_hit', 1, '🎯', 'เล็งจุดตาย', 2, (r) => `ฮีโร่ได้รับค่า HIT +${rk(r, 15, 25)}`, (r) => ({ hit: rk(r, 15, 25) })),
    t('bm_t1_crit', 1, '⚡', 'คริติคอลพราน', 2, (r) => `ฮีโร่ได้รับอัตราคริติคอล +${rk(r, 4, 6)}%`, (r) => ({ crit: rk(r, 0.04, 0.06) })),
    t('bm_t2_ult', 2, '👑', 'ปลุกชีพฝูง', 2, (r) => `Awakening สะท้อน & โล่แรง +${rk(r, 15, 25)}%${r >= 2 ? ' · อยู่นานขึ้น +1 เทิร์น' : ''}`, (r) => ({ ult2Pow: rk(r, 0.15, 0.25), ...(r >= 2 ? { j2UltAwakenAdd: 1 } : {}) })),
    t('bm_t2_lead', 2, '🚩', 'ผู้นำที่แท้จริง', 2, (r) => `โบนัสพลังโจมตีฮีโร่จากจ่าฝูงแรงขึ้นอีก +${rk(r, 3, 5)}% ต่อสัตว์ 1 ตัว`, (r) => ({ j2PackLead: rk(r, 0.03, 0.05) })),
    t('bm_t2_heal', 2, '💧', 'หยาดน้ำทิพย์', 2, (r) => `การฮีลจากสัตว์แรงขึ้น +${rk(r, 0.4, 0.7)}% Max HP`, (r) => ({ j2PetHeal: rk(r, 0.004, 0.007) })),
    t('bm_t3_cmd', 3, '📯', 'เสียงสังหาร', 2, (r) => `สกิลสั่งลุยทำดาเมจแรงขึ้น +${rk(r, 20, 30)}%`, (r) => ({ s3Pow: rk(r, 0.2, 0.3) })),
    t('bm_t3_cut', 3, '⚡', 'สมาธิไว', 2, (r) => `สกิลสั่งลุยลดการใช้ Energy ลงอีก −${rk(r, 4, 7)} (ต่ำสุด ${B.cmdMinCost})`, (r) => ({ j2CmdCut: rk(r, 4, 7) })),
    t('bm_t3_res', 3, '🔋', 'พลังงานไหลเวียน', 2, (r) => `สัตว์ลงมือคืน Energy เพิ่มขึ้นอีก +${rk(r, 1, 2)}`, (r) => ({ j2PetRes: rk(r, 1, 2) })),
    t('bm_t4_hawk', 4, '🦅', 'พายุจิกสวรรค์', 2, (r) => `🦅 Blitz Storm: ฮิตขั้นต่ำ&สูงสุด +${rk(r, 1, 2)} ฮิต · แรง +${rk(r, 12, 20)}% · โอกาส +${rk(r, 5, 8)}% · เป้า 🏷️ ติด Falcon Crit (×1.5) ได้ ${rk(r, 50, 50)}% ของคริฮีโร่`, (r) => ({ j2HawkBonusHits: rk(r, 1, 2), j2HawkMul: rk(r, 0.12, 0.2), j2HawkChance: rk(r, 0.05, 0.08), j2HawkCritShare: rk(r, 0.5, 0.5) })),
    t('bm_t4_boar', 4, '🐗', 'ปฐพีสะเทือน', 2, (r) => `🐗 พุ่งชน Stun ทั้งแถว (บอส: ผลักเกจ) · HP +${rk(r, 10, 18)}% · พุ่งชนแรง +${rk(r, 15, 25)}%`, (r) => ({ j2BoarStunAll: 1, j2BoarHp: rk(r, 0.1, 0.18), j2BoarMul: rk(r, 0.15, 0.25) })),
    t('bm_t4_wolf', 4, '🐺', 'เขี้ยวสูบโลหิต', 2, (r) => `🐺 Bleed ทำดาเมจ +${rk(r, 0.4, 0.7)}% Max HP ศัตรู/stack (เพดาน ${B.wolfBleedCap}× P.ATK) · กัดแรง +${rk(r, 12, 20)}% · เร็ว +${rk(r, 8, 12)}%`, (r) => ({ j2WolfBleedPct: rk(r, 0.004, 0.007), j2WolfMul: rk(r, 0.12, 0.2), j2WolfSpeed: rk(r, 0.08, 0.12) })),
  ],
}
