// ===== 2nd jobs (design/second-jobs-v1.md, Q 2026-11-04/05) =====
// A base class at Job Lv 40 that has cleared ดัน 5 picks one of its two 2nd jobs. save.job stays the BASE class
// (every `job === 'swordsman'` check keeps working); save.job2 rides on top and adds:
//   signature passive · ทักษะ 3 (casts itself, like ทักษะ 2) · Ult วิวัฒน์ (replaces the base ult) · ใยชั้น 2 (data/trees2/)
// Job2 Lv 1..50 has its own web points (job2Points). Numbers live in skill-math.ts KIT2.
import type { Resource, Stats } from './game-data'
import type { JobId, JobSkill } from './jobs'
import { KIT2 } from './skill-math'

export type Job2Id = 'berserker' | 'knight' | 'rogue' | 'mobster' // Phase 1 Swordsman · Phase 2 Thief. Next: crusader/monk, beastmaster/innovator
  | 'wizard' | 'sage' // Phase 5 Mage
export type WeaponType = 'sword' | 'twohand' | 'spear' | 'dagger' | 'bow' | 'staff' | 'mace' | 'fist' | 'book'

export interface Job2Def {
  id: Job2Id; parent: JobId; name: string; icon: string; blurb: string; focus: string
  resource?: Resource // overrides the base class resource (Berserker: Rage)
  autoCost?: number // ทักษะ 1 cost in that resource
  mod: Partial<Stats>
  pct?: { maxHp?: number; aspd?: number } // % on top of the derived stats
  mastery: { weapon: string; ok: (it: { twoHand?: boolean; wtype?: WeaponType }) => boolean; mod: Partial<Stats>; pct?: { atk?: number } }
  signature: JobSkill
  skill3: JobSkill & { cost: number; cd: number }
  ult: JobSkill & { cd: number; cost?: number }
}

export const JOB2_RULES = { unlockJobLv: 40, unlockClear: 'd5', maxJobLevel: 50, repickGems: 30 }

const B = KIT2.berserker, K = KIT2.knight, R = KIT2.rogue, M = KIT2.mobster
const WZ = KIT2.wizard, SG = KIT2.sage
const pc = (n: number) => `${Math.round(n * 100)}%`

export const JOB2: Record<Job2Id, Job2Def> = {
  berserker: {
    id: 'berserker', parent: 'swordsman', name: 'เบอร์เซิร์กเกอร์', icon: '🪓', focus: 'STR · AGI · LUK',
    blurb: `อาวุธ 2 มือ สับคริหน้าแหก · Rage กลับมา: ตี/โดนตีแล้วเดือด (ฟันพายุ Rage ${B.stormCost}) · ยิ่งคริยิ่งเร็ว เก่งดวลบอส`,
    resource: 'rage', autoCost: B.stormCost, mod: { crit: 0.05 },
    mastery: { weapon: 'อาวุธ 2 มือ', ok: (it) => !!it.twoHand, mod: { crit: B.mastery.crit }, pct: { atk: B.mastery.atkPct } },
    signature: { name: 'คลั่งเลือด', icon: '🔥', desc: `คริ 1 ครั้ง = Frenzy +1 (สูงสุด ${B.frenzyMax}): ความเร็ว +${pc(B.frenzyAspd)} · ดาเมจคริ +${pc(B.frenzyCritDmg)} ต่อ stack · ไม่คริ ${B.frenzyKeep} เทิร์นติด stack หาย` },
    skill3: { name: 'คลื่นดาบ', icon: '🌊', cost: B.waveCost, cd: B.waveCd, desc: `Rage ${B.waveCost} · คูลดาวน์ ${B.waveCd}: คลื่นพุ่งทะลุแถว ตัวหน้า ${B.waveFront}x ตัวหลัง ${B.waveBack}x P.ATK · คริ +${pc(B.waveCrit)} (ไม่ใช่อาวุธ 2 มือ แรง ${pc(B.waveOffWeapon)})` },
    ult: { name: 'บ้าระห่ำ', icon: '👹', cd: 4, desc: `ฟันทุกตัว ${B.ultMul}x แล้ว ${B.ultTurns} เทิร์น: ตีธรรมดาเป็น 2 ฮิต · คริ +${pc(B.ultCrit)} · ดาเมจเข้า +${pc(B.ultTaken)}` },
  },
  knight: {
    id: 'knight', parent: 'swordsman', name: 'อัศวิน', icon: '🐴', focus: 'STR · VIT',
    blurb: 'สายหอกขี่เปโกแบบ RO · ถึกเป็นแรง: สกิลหอกบวกดาเมจตาม HP สูงสุด · หอก 1 มือใส่โล่ได้ หอก 2 มือแรงกว่า',
    mod: {}, pct: { maxHp: K.hpPct, aspd: K.aspdPct },
    mastery: { weapon: 'หอก', ok: (it) => it.wtype === 'spear', mod: { hit: K.mastery.hit }, pct: { atk: K.mastery.atkPct } },
    signature: { name: 'ขี่เปโก', icon: '🐦', desc: `HP สูงสุด +${pc(K.hpPct)} · ความเร็ว +${pc(K.aspdPct)} · ถึกเป็นแรง: ฟันพายุ / Brandish / Pierce บวกดาเมจ ${pc(K.hpDmg)} ของ HP สูงสุด` },
    skill3: { name: 'Brandish Spear', icon: '🌀', cost: K.brandCost, cd: K.brandCd, desc: `Mana ${K.brandCost} · คูลดาวน์ ${K.brandCd}: กวาดหอก ${K.brandTargets} ตัวหน้า ${K.brandMul}x P.ATK + ${pc(K.hpDmg)} HP สูงสุด · ผลักตัวหน้าถอย` },
    ult: { name: 'Pierce + Bowling Bash', icon: '🎯', cd: 4, cost: 25, desc: `Mana 25: แทงเป้าเดียว ${K.pierceHits} ฮิต (บอส/มินิ ${K.pierceBigHits}) ฮิตละ ${K.pierceMul}x + HP สูงสุด แล้วกระแทกตัวถัดไป ${K.bashMul}x · โล่แบบดาบพิทักษ์` },
  },
  rogue: {
    id: 'rogue', parent: 'thief', name: 'โร้ก', icon: '🔪', focus: 'AGI · STR · LUK',
    blurb: 'สายมีด + คอมโบ + คริ · ทุกฮิตคอมโบปามีดบินใส่มอนสุ่ม · ถือมีดมือรอง = มีดบินเพิ่ม',
    mod: { combo: 0.03 },
    mastery: { weapon: 'มีด', ok: (it) => it.wtype === 'dagger', mod: { crit: R.mastery.crit }, pct: { atk: R.mastery.atkPct } },
    signature: { name: 'มีดบิน', icon: '🔪', desc: `ทุกฮิตคอมโบ ปามีด ${R.knifePerCombo} เล่มใส่มอนสุ่ม ${R.knifeMul}x P.ATK (คริได้ ไม่ดูดเลือด) · มือรองเป็นมีด +${R.dualKnife} เล่ม` },
    skill3: { name: 'Back Stab', icon: '🗡️', cost: R.stabCost, cd: R.stabCd, desc: `Energy ${R.stabCost} · คูลดาวน์ ${R.stabCd}: แทงหลังตัวที่ HP มากสุด ${R.stabMul}x P.ATK คริแน่นอน` },
    ult: { name: 'พายุมีด', icon: '🌪️', cd: 4, desc: `เงาพริ้วเดิม แล้วโปรยมีดบิน ${R.ultKnives} เล่มใส่มอนสุ่ม เล่มละ ${R.ultKnifeMul}x` },
  },
  mobster: {
    id: 'mobster', parent: 'thief', name: 'มาเฟีย', icon: '🕴️', focus: 'AGI · STR · INT',
    blurb: 'สายพิษ / ดีบัฟ / เก็บงาน · ดีบัฟบนมอน = หนี้ · HP ต่ำพอ = ตายทันที (บอสโดนหนักแทน)',
    mod: { poison: 1 },
    mastery: { weapon: 'มีด', ok: (it) => it.wtype === 'dagger', mod: { poisonDmg: M.mastery.poisonDmg }, pct: { atk: M.mastery.atkPct } },
    signature: { name: 'สมุดหนี้', icon: '📒', desc: `ดีบัฟ 1 ชนิดบนมอน (พิษ ไฟ ช้า อ่อนแรง ตราบาป เกราะแตก) = หนี้ 1 · HP ต่ำกว่า ${pc(M.execBase)} + ${pc(M.execPer)}/หนี้ = ⚰️ ตายทันที · บอส/มินิ: ดาเมจ x${M.bossExecMul} แทน` },
    skill3: { name: 'ตัดเส้นเอ็น', icon: '⛓️', cost: M.cutCost, cd: M.cutCd, desc: `Energy ${M.cutCost} · คูลดาวน์ ${M.cutCd}: ฟันตัวหน้า (บอสก่อน) ${M.cutMul}x · เกราะแตก DEF -${pc(M.armorBrk)} + ช้า ${M.cutTurns} เทิร์น` },
    ult: { name: 'ทวงหนี้', icon: '💀', cd: 4, desc: `ฟันทุกตัว ${M.ultSlash}x แล้วจุดระเบิดพิษ (ดาเมจพิษ ${M.burstTurns} เทิร์น x${M.burstMul} ออกทันที แล้วล้างพิษ) → เช็ก Execute · เก็บได้ = ult คูลดาวน์ -${M.ultCdRefund}` },
  },
  // ----- Phase 5 Mage -----
  wizard: {
    id: 'wizard', parent: 'mage', name: 'วิซาร์ด', icon: '🌩️', focus: 'INT · WIS · DEX',
    blurb: 'เวทพื้นที่ใหญ่แบบ RO · ร่ายนาน 1 เทิร์น (วงเวทแบบบอสชาร์จ) แล้วระเบิดใหญ่ · Ult ตามธาตุที่เลือก: Meteor Storm / Lord of Vermilion / Storm Gust',
    mod: { maxRes: 10 },
    mastery: { weapon: 'ไม้เท้า', ok: (it) => it.wtype === 'staff', mod: { matk: WZ.mastery.matk, spellCrit: WZ.mastery.spellCrit } },
    signature: { name: 'ร่ายใหญ่', icon: '🔮', desc: `Storm Gust กับ Ult ใช้ 1 เทิร์นชาร์จ (วงเวทใต้เท้า) แล้วระเบิดต้นเทิร์นถัดไป · โดนตีระหว่างชาร์จไม่หลุด แต่ดาเมจเข้า +${pc(WZ.castTaken)}` },
    skill3: { name: 'Storm Gust', icon: '❄️', cost: WZ.gustCost, cd: WZ.gustCd, desc: `Mana ${WZ.gustCost} · คูลดาวน์ ${WZ.gustCd}: ชาร์จ 1 เทิร์น → พายุน้ำแข็งทุกตัว ${WZ.gustHits} ฮิต ฮิตละ ${WZ.gustMul}x Pm · ฮิตสุดท้ายแช่แข็ง (บอส/มินิ: ช้า + ดันเกจ)` },
    ult: { name: 'มหาเวทธาตุ', icon: '☄️', cd: 5, desc: `Mana 30 · ชาร์จ 1 เทิร์น ตามธาตุที่เลือก: 🔥 Meteor Storm อุกกาบาต ${WZ.meteors} ลูกสุ่ม ลูกละ ${WZ.meteorMul}x + เผา ${WZ.meteorBurn} · ⚡ Lord of Vermilion ทุกตัว ${WZ.lovHits} ฮิต ฮิตละ ${WZ.lovMul}x มึน ${pc(WZ.lovStun)}/ฮิต · ❄️ Storm Gust ฟรี + บาเรีย x${WZ.iceBarrier} · ทุกธาตุได้บาเรียแบบจอมเวท` },
  },
  sage: {
    id: 'sage', parent: 'mage', name: 'เซจ', icon: '📖', focus: 'INT · STR · DEX',
    blurb: 'battle mage แบบ RO · ตีใกล้ด้วย P.ATK แล้ว Auto Spell ร่ายเวทเอง · Endow ติดธาตุอาวุธ · Dispell ลบบัฟ/โล่ ขัดบอสชาร์จ · STR ช่วยจริง (70/30)',
    mod: { maxHp: 30, def: 4 },
    mastery: { weapon: 'หนังสือ / ไม้เท้า', ok: (it) => it.wtype === 'book' || it.wtype === 'staff', mod: { matk: SG.mastery.matk }, pct: { atk: SG.mastery.atkPct } },
    signature: { name: 'Auto Spell', icon: '📖', desc: `ตีธรรมดาเป็นตีใกล้ ${SG.basicMul}x P.ATK · ทุกครั้งที่ตีธรรมดา มีโอกาส ${pc(SG.autoChance)} (+${SG.autoInt * 100}%/INT สูงสุด ${pc(SG.autoCap)}) ร่าย Bolt ธาตุของรอบฟรี ${SG.autoMul}x Pm` },
    skill3: { name: 'Endow', icon: '🗡️', cost: SG.endowCost, cd: SG.endowCd, desc: `Mana ${SG.endowCost} · คูลดาวน์ ${SG.endowCd}: ติดธาตุอาวุธ ${SG.endowTurns} เทิร์น · ตีธรรมดา / คอมโบ / Auto Spell แรง +${pc(SG.endowAmp)}` },
    ult: { name: 'Dispell + Spell Breaker', icon: '🚫', cd: 4, cost: SG.ultCost, desc: `Mana ${SG.ultCost}: ลบบัฟ/โล่/โล่สะท้อนของมอนทุกตัว + ขัดบอสที่กำลังชาร์จ · ขโมย Mana ${SG.ultMana} · ฟาดตัวที่ชาร์จ (ไม่งั้นตัวหน้า) ${SG.ultAtk}x P.ATK + ${SG.ultPm}x Pm` },
  },
}
export const JOB2_LIST = Object.values(JOB2)
export const job2Of = (job: JobId) => JOB2_LIST.filter((j) => j.parent === job)
