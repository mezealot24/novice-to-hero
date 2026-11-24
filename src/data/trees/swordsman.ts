// ⚔️ Swordsman skill tree + talents. Owned by the swordsman design thread; edit freely, only this file.
// Spec: design/skill-tree-swordsman.md. Identity: "getting hit is an advantage" (counter, lifesteal). Rage left with v26: the Swordsman runs on Mana (design/swordsman-mana-nerf.md).
// Node and talent ids are save data: never rename or remove a shipped id (retire it by leaving it out of the UI instead).
import { node as n, talent as t, type ClassTree } from '../tree-types'
import { KIT } from '../skill-math'

// v84 (design/skill-tree-swordsman.md v84): numbers in KIT.swordCore / swordS1Tree / swordUltTree (admin ⚔️ สกิลอาชีพ → 🌳 Skill tree), written per OLD level (max 3); data/tree.ts stretches them to 5.
const C = KIT.swordCore, S = KIT.swordS1Tree, U = KIT.swordUltTree, pc = (x: number) => `${+(x * 100).toFixed(1)}%`, r1 = (x: number) => +x.toFixed(1)

export const tree: ClassTree = {
  branches: [
    { id: 'swordsman_core', job: 'swordsman', name: 'แก่นป้องกัน', icon: '🛡️', blurb: 'VIT · P.DEF · M.DEF · ฟื้นตัว' },
    { id: 'swordsman_a', job: 'swordsman', name: 'ดาบตื่นพิทักษ์', icon: '🛡️', blurb: 'ระหว่างปลุกดาบ: โดนเบาลง · ตีปกติดูดเลือด · สวนกลับง่าย · ★ คลื่นดาบให้โล่' }, // Q 2026-11-21: Ult left line = Defensive (was ป้อมเหล็ก)
    { id: 'swordsman_b', job: 'swordsman', name: 'ตั้งรับสยบ', icon: '🛡️', blurb: 'ดาบสยบมนตร์: โล่ตอนกด · กัน CC · มอนติดใบ้ตีเบา · ★ สวนกลับแน่นอน' }, // Q 2026-11-21: ทักษะ 1 left line = Defensive (was 🩸 โลหิต)
    // v84: ATTACH in data/tree.ts: swordsman_b/c under ทักษะ 1, swordsman_a/d under Ult
    { id: 'swordsman_c', job: 'swordsman', name: 'สยบมนตร์', icon: '⚔️', blurb: 'ดาบสยบมนตร์: ตีตัวร่าย/ติดใบ้แรง · ตัดร่ายคืน Mana/CD · เฉือนตัวอื่น · ★ ฟันคู่' }, // Q 2026-11-21: ทักษะ 1 right line = Utility + Dmg (was ⚔️ จังหวะดาบ)
    { id: 'swordsman_d', job: 'swordsman', name: 'คมพิพากษา', icon: '⚖️', blurb: 'execute แรงขึ้น · คลื่นดาบฆ่าได้ลุ้นได้อีกลูก · ฟันตัวถัดไปแรงขึ้น · ★ ระหว่างปลุก P.ATK +50%' }, // Q 2026-11-21: Ult right line = Utility + Dmg (was ทลายเกราะ)
  ],
  nodes: [
    // Core: 🛡️ แก่นป้องกัน — tier 0, always open at start so VIT-focused tanks survive phys + magic hits
    n('swordsman_core1', 'swordsman_core', 0, '🪨', 'กายเหล็ก', 3, (lv) => `VIT +${Math.round(C.vitPer * lv)} · P.DEF +${r1(C.defPer * lv)} · Max HP +${pc(C.hpPctPer * lv)}`, (lv) => ({ swCoreVit: C.vitPer * lv, def: C.defPer * lv, swCoreHpPct: C.hpPctPer * lv })),
    n('swordsman_core2', 'swordsman_core', 0, '💠', 'เกราะจิตอึด', 3, (lv) => `M.DEF +${pc(C.mdefPer * lv)} · ต้านทาน +${pc(C.tenacityPer * lv)} · VIT ทุก 1 แต้มเพิ่ม M.DEF +${pc(C.vitToMdefPer * lv)} (ส่วน VIT→M.DEF สูงสุด +${pc(C.vitToMdefCap)})`, (lv) => ({ mdef: C.mdefPer * lv, tenacity: C.tenacityPer * lv, swVitToMdef: C.vitToMdefPer * lv })),
    n('swordsman_core3', 'swordsman_core', 0, '❤️‍🩹', 'ฟื้นฟูนักรบ', 3, (lv) => `ฟื้น HP/เทิร์น +${pc((C.regenPer * lv * 1.5) / 100)} · ฮีลแรง +${pc(C.healAmpPer * lv)} · เลือด < ${pc(C.lowHpAt)} Regen แรงขึ้น +${pc(C.lowHpRegenPer * lv)}`, (lv) => ({ regen: C.regenPer * lv, healAmp: C.healAmpPer * lv, swLowRegenAmp: C.lowHpRegenPer * lv })),
    // 🗡️ ดาบพิพากษา left line (Q 2026-11-21): Defensive while ⚔️ ปลุกดาบ is up (ids kept: save data)
    n('swordsman_a1', 'swordsman_a', 1, '🛡️', 'ใจดาบ', 3, (lv) => `ระหว่างปลุกดาบ โดนตีเบาลง −${pc(U.dr * lv)}`, (lv) => ({ swAwDr: U.dr * lv })),
    n('swordsman_a2', 'swordsman_a', 2, '🩸', 'ดาบกระหายเลือด', 3, (lv) => `ระหว่างปลุกดาบ ตีปกติ/ฟันตัวถัดไป ดูดเลือด ${pc(U.leech * lv)}`, (lv) => ({ swAwLeech: U.leech * lv })),
    n('swordsman_a3', 'swordsman_a', 3, '🔁', 'ตื่นสวน', 3, (lv) => `ระหว่างปลุกดาบ สวนกลับ +${pc(U.ctr * lv)}`, (lv) => ({ swAwCtr: U.ctr * lv })),
    n('swordsman_a4', 'swordsman_a', 4, '🌊', 'ปราการคลื่น', 1, () => `คลื่นดาบให้โล่ ${pc(U.waveShield)} ของดาเมจที่ทำ (ไม่เกิน ${pc(U.waveShieldCap)} HP)`, () => ({ swWaveShield: 1 })),
    // B (left, Q 2026-11-21): 🛡️ ตั้งรับสยบ, Defensive on ดาบสยบมนตร์ (ids kept: save data; the old 🩸 โลหิต effects are gone)
    n('swordsman_b1', 'swordsman_b', 1, '🛡️', 'ตั้งรับ', 3, (lv) => `กดดาบสยบมนตร์ ได้โล่ ${pc(S.shield * lv)} ของ HP สูงสุด`, (lv) => ({ swS1Shield: S.shield * lv })),
    n('swordsman_b2', 'swordsman_b', 2, '🧘', 'ใจไม่หวั่น', 3, (lv) => `ต้านทาน +${pc(S.tenacity * lv)} · ล้าง CC แล้วกัน ใบ้/ใยมัด/ช้า ${S.guardTurns} เทิร์น`, (lv) => ({ tenacity: S.tenacity * lv, swCcGuard: lv })),
    n('swordsman_b3', 'swordsman_b', 3, '🤐', 'ปิดปาก', 3, (lv) => `มอนที่ติดใบ้ ตีเราเบาลง −${pc(S.muteWeak * lv)}`, (lv) => ({ swMuteWeak: S.muteWeak * lv })),
    n('swordsman_b4', 'swordsman_b', 4, '🔁', 'สวนเงียบ', 1, () => `หลังกดดาบสยบมนตร์: โดนตี ${S.counters} ครั้งถัดไป สวนกลับแน่นอน`, () => ({ swS1Ctr: S.counters })),
    // C (right, Q 2026-11-21): ⚔️ สยบมนตร์, Utility + Dmg (ids kept: save data; the old จังหวะดาบ flow is gone)
    n('swordsman_c1', 'swordsman_c', 1, '🎯', 'เจาะจังหวะ', 3, (lv) => `ตีตัวที่กำลังร่าย หรือติดใบ้ แรง +${pc(S.vsMute * lv)} (ทุกการตี)`, (lv) => ({ swVsMute: S.vsMute * lv })),
    n('swordsman_c2', 'swordsman_c', 2, '⏳', 'ตัดจังหวะ', 3, (lv) => `ดาบสยบมนตร์ขัดร่ายได้: Mana +${r1(S.refund * lv)} · คูลดาวน์ −1`, (lv) => ({ swS1Refund: S.refund * lv })),
    n('swordsman_c3', 'swordsman_c', 3, '🌀', 'ฟันเฉือน', 3, (lv) => `ดาบสยบมนตร์เฉือนมอนตัวอื่น ${pc(S.splash * lv)} ของฮิต (ไม่ติดใบ้)`, (lv) => ({ swS1Splash: S.splash * lv })),
    n('swordsman_c4', 'swordsman_c', 4, '⚔️', 'ดาบสยบคู่', 1, () => `ดาบสยบมนตร์ฟันซ้ำอีกครั้ง ${pc(S.starHit)} · ใบ้ +1 เทิร์น`, () => ({ swS1Star: 1 })),
    // 🗡️ ดาบพิพากษา right line (Q 2026-11-21): Utility + Dmg (ids kept: save data)
    n('swordsman_d1', 'swordsman_d', 1, '⚖️', 'คมพิพากษา', 3, (lv) => `⚖️ execute สูงสุด +${pc(U.execAdd * lv)} (คลื่นดาบ)`, (lv) => ({ swExecAdd: U.execAdd * lv })),
    n('swordsman_d2', 'swordsman_d', 2, '🌊', 'คลื่นซ้ำ', 3, (lv) => `คลื่นดาบฆ่ามอนได้ → โอกาส ${pc(Math.min(1, U.reChance * lv))} ได้คลื่นอีกลูก (1 ครั้ง/ปลุก)`, (lv) => ({ swWaveRe: Math.min(1, U.reChance * lv) })), // Q 2026-11-22: was คลื่นคม
    n('swordsman_d3', 'swordsman_d', 3, '⚔️', 'ฟันกวาดตื่น', 3, (lv) => `ระหว่างปลุกดาบ ฟันตัวถัดไปแรง +${pc(U.cleave * lv)} ของฮิต`, (lv) => ({ swAwCleave: U.cleave * lv })),
    n('swordsman_d4', 'swordsman_d', 4, '⚔️', 'ดาบตื่นเต็มพลัง', 1, () => `ระหว่างปลุกดาบ P.ATK +${pc(U.awAtk)}`, () => ({ swAwAtk: U.awAtk })), // Q 2026-11-22: was ★ คลื่นซ้ำ
  ],
  talents: [
    // ----- row 1 · Job Lv 5 · basic swing -----
    t('sw_t1a', 1, '🌀', 'ฟันกวาด', 2, (r) => `ฟันตัวที่ 2 แรงขึ้น 0.5x → ${(0.5 + 0.3 * r).toFixed(1)}x`, (r) => ({ cleaveAdd: 0.3 * r })),
    t('sw_t1b', 1, '🎯', 'ตาเพชร', 2, (r) => `Hit +${r === 1 ? 10 : 16} · คอมโบ +${r === 1 ? 8 : 12}%`, (r) => ({ hit: r === 1 ? 10 : 16, combo: r === 1 ? 0.08 : 0.12 })),
    t('sw_t1c', 1, '🛡️', 'ตั้งการ์ด', 2, (r) => `ต้นทุกเวฟได้โล่ ${r === 1 ? 5 : 8}% HP สูงสุด`, (r) => ({ waveShield: r === 1 ? 0.05 : 0.08 })),
    // ----- row 2 · Job Lv 10 · Mana rhythm (ids keep their Rage-era names: they are save data) -----
    t('sw_t2a', 2, '🔥', 'เลือดร้อน', 2, (r) => `ต้นทุกเวฟฟื้น Mana +${r === 1 ? 15 : 25}`, (r) => ({ startRage: r === 1 ? 15 : 25 })),
    t('sw_t2b', 2, '💢', 'แค้นฝังใจ', 2, (r) => `โดนตีได้ Mana +${r === 1 ? 3 : 5}`, (r) => ({ rageOnHurtAdd: r === 1 ? 3 : 5 })),
    t('sw_t2c', 2, '🌪️', 'พายุโลหิต', 2, (r) => `ดูดเลือดสกิล +${r === 1 ? 15 : 25}% (ตีหลายตัวได้ 1/3) · แลกกับดาเมจสกิล/ult −30%`, (r) => ({ spellVamp: r === 1 ? 0.15 : 0.25, skillDmgCut: 0.3 })),
    // ----- row 3 · Job Lv 20 · ดาบพิพากษา (ult) -----
    t('sw_t3a', 3, '🏰', 'ปราการ', 2, (r) => `ult: ได้โล่ ${r === 1 ? 15 : 20}% HP · คลื่นดาบ 1.5x → 1.3x (คลื่นทะลวง −0.2x/ฮิต)`, (r) => ({ ultShieldAdd: r === 1 ? 0.15 : 0.2, ultMulAdd: -0.2 })),
    t('sw_t3b', 3, '💥', 'ฟันทลาย', 2, (r) => `ult: คลื่นดาบ 1.5x → ${r === 1 ? '2.5' : '2.9'}x (คลื่นทะลวง +${r === 1 ? '1.0' : '1.4'}x/ฮิต) · ตัวที่กำลังร่ายโดน x1.5`, (r) => ({ ultMulAdd: r === 1 ? 1.0 : 1.4, ultShieldAdd: -0.15, ultVsCharge: 0.5 })),
    t('sw_t3c', 3, '🔁', 'ท่าสวนพร้อม', 2, (r) => `หลังกด ult: โดนตี ${r === 1 ? 2 : 3} ครั้งถัดไป สวนกลับแน่นอน`, (r) => ({ ultCounters: r === 1 ? 2 : 3 })),
    // ----- row 4 · Job Lv 30 · keystone -----
    t('sw_t4a', 4, '💀', 'ไม่ยอมล้ม', 2, (r) => `ล้มครั้งแรกต่อรอบ ลุกขึ้นมาพร้อม HP ${r === 1 ? 40 : 60}%`, (r) => ({ revive: 1, reviveHp: r === 1 ? 0.4 : 0.6 })),
    t('sw_t4b', 4, '🩸', 'เลือดล้น', 2, (r) => `ฮีล/ดูดเลือดเกิน HP เต็ม กลายเป็นโล่${r === 2 ? ' · ดูดเลือด +5%' : ''}`, (r) => ({ overhealShield: 1, lifesteal: r === 2 ? 0.05 : 0 })),
    t('sw_t4c', 4, '⚙️', 'เหล็กกล้า', 2, (r) => `สวนกลับทุกครั้ง: Mana +${r === 1 ? 5 : 8} และโล่ ${r === 1 ? 3 : 5}% HP`, (r) => ({ counterRage: r === 1 ? 5 : 8, counterShield: r === 1 ? 0.03 : 0.05 })),
  ],
}
