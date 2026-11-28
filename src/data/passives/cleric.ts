// ✨ Cleric-Line PoE Passive Constellation (Phase 3: Cleric / Monk / Crusader / Champion / Paladin).
// 85 nodes: 1 origin + 38 minors + 22 notables + 6 keystones across 4 sectors + Inner Ring Highway + 4 Outer Bridges + 4 Outer Wheels
// + 4 💎 jewel sockets (one past each bridge) + 14 🌟 Awakening ring nodes (cleric-awaken.ts: Champion / Paladin, 3rd job only).
// Same graph layout as the Swordsman constellation (proven spacing / bridges), new content:
//   north = 👊 Monk (fist NW · ki NE) · south + east wheel = ✝️ Crusader (aegis SE · holy SW, shared with the base Cleric's light / heals).
// 3 keystones per 2nd job, one per skill-web branch: Monk คอมโบ / หมัดแค้น / อสุรา · Crusader กางเขน / โล่ศักดิ์สิทธิ์ / อุทิศ.
// Only stats already wired in battle: no new battle hooks. Keystone downsides reuse the class-neutral
// swUltCdAdd / swIronDr / swIronAspdCut / swNoFlee stats (read in skill-math ultCooldown, hero-stats, BattleScene for every job).
// Replaces the Cleric / Monk / Crusader talents (cleric_t* · mk_t* · cr_t*): their effects live on nodes here.
// Node IDs are save data (`SaveData.passiveNodes`): never rename or remove a shipped ID.
import type { PassiveCtx, PassiveKind, PassiveNode, PassiveSector, PassiveTreeDef } from '../passive-tree'
import type { Stats } from '../stats'
import { CLERIC_AWAKEN_NODES } from './cleric-awaken'

type Mod = Partial<Stats>
type Variant = readonly [desc: string, mod: Mod]
const SOCKET_DESC = 'ใส่ Jewel 1 เม็ด: ได้ค่าทุกบรรทัดของ Jewel (สร้าง Jewel จากการ์ดที่แท็บการ์ด)'

/** Plain node: same text and stats for every class of the line. */
const fixed = (
  id: string, kind: PassiveKind, sector: PassiveSector, x: number, y: number, edges: readonly string[],
  icon: string, name: string, tags: readonly string[], text: string, mod: Mod,
): PassiveNode => ({ id, job: 'cleric', kind, sector, x, y, edges, icon, name, desc: () => text, mod: () => ({ ...mod }), tags })

/** Adaptive Job2 notable: the base Cleric, Monk and Crusader each get their own line (changeJob2 keeps the node). */
const adaptive = (
  id: string, sector: PassiveSector, x: number, y: number, edges: readonly string[],
  icon: string, name: string, tags: readonly string[], v: { base: Variant; monk: Variant; crusader: Variant },
): PassiveNode => {
  const pick = (ctx?: PassiveCtx): Variant => (ctx?.job2 === 'monk' ? v.monk : ctx?.job2 === 'crusader' ? v.crusader : v.base)
  return { id, job: 'cleric', kind: 'notable', sector, x, y, edges, icon, name, desc: (ctx) => pick(ctx)[0], mod: (ctx) => ({ ...pick(ctx)[1] }), tags }
}

/** Keystone: build-defining, always an upside AND an explicit downside. */
const keystone = (
  id: string, sector: PassiveSector, x: number, y: number, edges: readonly string[],
  icon: string, name: string, tags: readonly string[], upside: string, downside: string, mod: Mod,
): PassiveNode => ({ ...fixed(id, 'keystone', sector, x, y, edges, icon, name, tags, `${upside} | ข้อเสีย: ${downside}`, mod), upside, downside })

const socket = (
  id: string, sector: PassiveSector, x: number, y: number, edges: readonly string[],
  icon: string, name: string, tags: readonly string[],
): PassiveNode => fixed(id, 'socket', sector, x, y, edges, icon, name, tags, SOCKET_DESC, {})

const NODES: readonly PassiveNode[] = [
  // ========== CENTER ORIGIN (1) ==========
  fixed('cl_origin', 'origin', 'core', 0, 0, ['cl_m_fist1', 'cl_m_ki1', 'cl_m_aeg1', 'cl_m_holy1'], '✨', 'หัวใจนักบวช', ['fist', 'ki', 'aegis', 'holy', 'heal'], 'จุดเริ่มต้นสายอาชีพนักบวช (ฟรี · ไม่เสียแต้ม) — เชื่อมออกสู่ 4 เขตพลัง: หมัด · ปราณ · โล่ศรัทธา · แสงศักดิ์สิทธิ์', {}),

  // ========== INNER RING HIGHWAY (8 minors) ==========
  fixed('cl_m_fist1', 'minor', 'fist', -85, -75, ['cl_origin', 'cl_m_ring_n', 'cl_m_ring_w', 'cl_n_swift', 'cl_m_fist2'], '👊', 'หมัดเริ่มต้น', ['fist'], 'P.ATK +6 · คอมโบ +2%', { atk: 6, combo: 0.02 }),
  fixed('cl_m_ki1', 'minor', 'ki', 85, -75, ['cl_origin', 'cl_m_ring_n', 'cl_m_ring_e', 'cl_n_meditate', 'cl_m_ki2'], '🔵', 'ลมปราณแรก', ['ki'], 'Max HP +50 · M.DEF +2%', { maxHp: 50, mdef: 0.02 }),
  fixed('cl_m_aeg1', 'minor', 'aegis', 85, 75, ['cl_origin', 'cl_m_ring_e', 'cl_m_ring_s', 'cl_n_bulwark', 'cl_m_aeg2'], '🛡️', 'โล่ตั้งศรัทธา', ['aegis'], 'P.DEF +5 · Max HP +45', { def: 5, maxHp: 45 }),
  fixed('cl_m_holy1', 'minor', 'holy', -85, 75, ['cl_origin', 'cl_m_ring_s', 'cl_m_ring_w', 'cl_n_radiance', 'cl_m_holy2'], '✝️', 'ประกายแสง', ['holy', 'heal'], 'M.ATK +6 · ฮีลแรง +4%', { matk: 6, healAmp: 0.04 }),
  fixed('cl_m_ring_n', 'minor', 'core', 0, -95, ['cl_m_fist1', 'cl_m_ki1', 'cl_n_focus', 'cl_n_innerki'], '🌀', 'วงแหวนหมัดปราณ', ['fist', 'ki'], 'คอมโบ +2% · Max Mana +10 (ทางเชื่อม หมัด ↔ ปราณ)', { combo: 0.02, maxRes: 10 }),
  fixed('cl_m_ring_e', 'minor', 'core', 115, 0, ['cl_m_ki1', 'cl_m_aeg1'], '🌀', 'วงแหวนปราณโล่', ['ki', 'aegis'], 'M.DEF +2% · P.DEF +4 (ทางเชื่อม ปราณ ↔ โล่ศรัทธา)', { mdef: 0.02, def: 4 }),
  fixed('cl_m_ring_s', 'minor', 'core', 0, 95, ['cl_m_aeg1', 'cl_m_holy1', 'cl_n_retribution', 'cl_n_grace'], '🌀', 'วงแหวนโล่แสง', ['aegis', 'holy'], 'Max HP +50 · โล่แรง +5% (ทางเชื่อม โล่ศรัทธา ↔ แสง)', { maxHp: 50, shieldAmp: 0.05 }),
  fixed('cl_m_ring_w', 'minor', 'core', -115, 0, ['cl_m_holy1', 'cl_m_fist1'], '🌀', 'วงแหวนแสงหมัด', ['holy', 'fist'], 'P.ATK +4 · M.ATK +5 (ทางเชื่อม แสง ↔ หมัด)', { atk: 4, matk: 5 }),

  // ========== 4 OUTER CROSS-BUILD BRIDGES (4 minors) ==========
  fixed('cl_m_bridge_n', 'minor', 'fist', 0, -195, ['cl_n_focus', 'cl_n_innerki', 'cl_k_asura'], '🌉', 'สะพานหมัดปราณ', ['fist', 'ki'], 'ฮิตคอมโบแรง +6% · M.DEF +3% (เชื่อมเขต หมัด ↔ ปราณ รอบนอก)', { comboDmg: 0.06, mdef: 0.03 }),
  fixed('cl_m_bridge_e', 'minor', 'ki', 305, 0, ['cl_m_ki3', 'cl_k_bastion', 'cl_m_aeg3', 'cl_n_adapt_guard'], '🌉', 'สะพานปราณเหล็ก', ['ki', 'aegis'], 'P.DEF +6 · Max HP +60 (เชื่อมเขต ปราณ ↔ โล่ศรัทธา รอบนอก)', { def: 6, maxHp: 60 }),
  fixed('cl_m_bridge_s', 'minor', 'aegis', 0, 200, ['cl_n_retribution', 'cl_k_martyr', 'cl_n_grace', 'cl_m_holy4'], '🌉', 'สะพานโล่ศักดิ์สิทธิ์', ['aegis', 'holy', 'heal'], 'โล่แรง +8% · ฮีลแรง +6% (เชื่อมเขต โล่ศรัทธา ↔ แสง รอบนอก)', { shieldAmp: 0.08, healAmp: 0.06 }),
  fixed('cl_m_bridge_w', 'minor', 'holy', -305, 0, ['cl_m_fist3', 'cl_n_breaker', 'cl_m_holy3'], '🌉', 'สะพานแสงนักสู้', ['holy', 'fist'], 'P.ATK +6 · M.ATK +8 (เชื่อมเขต แสง ↔ หมัด รอบนอก)', { atk: 6, matk: 8 }),

  // ========== 👊 FIST (NW): Monk combo / physical · Asura burst ==========
  fixed('cl_n_swift', 'notable', 'fist', -175, -75, ['cl_m_fist1', 'cl_m_fist2', 'cl_m_fist3'], '💨', 'ระบำหมัด', ['fist'], 'คอมโบ +6% · ฮิตคอมโบแรง +10%', { combo: 0.06, comboDmg: 0.1 }),
  fixed('cl_m_fist2', 'minor', 'fist', -145, -155, ['cl_m_fist1', 'cl_n_swift', 'cl_n_focus', 'cl_n_adapt_fist'], '🎯', 'หมัดแม่น', ['fist'], 'HIT +8 · ตีปกติ/คอมโบแรง +5%', { hit: 8, basicDmg: 0.05 }),
  fixed('cl_n_focus', 'notable', 'fist', -75, -180, ['cl_m_ring_n', 'cl_m_fist2', 'cl_m_bridge_n', 'cl_k_asura'], '👁️', 'เนตรนักสู้', ['fist'], 'HIT +14 · คริ +4% · ดาเมจคริ +10%', { hit: 14, crit: 0.04, critMul: 0.1 }),
  fixed('cl_m_fist3', 'minor', 'fist', -260, -85, ['cl_n_swift', 'cl_n_breaker', 'cl_m_bridge_w'], '🦶', 'ฝีเท้าไว', ['fist'], 'ความเร็วโจมตี +0.05 · FLEE +4', { aspd: 0.05, flee: 4 }),
  fixed('cl_n_breaker', 'notable', 'fist', -340, -135, ['cl_m_fist3', 'cl_m_bridge_w', 'cl_k_storm'], '🔨', 'หมัดทะลวงเกราะ', ['fist'], 'เจาะเกราะกายภาพ +10% · ตีปกติ/คอมโบแรง +8% · P.ATK +8', { physPen: 0.1, basicDmg: 0.08, atk: 8 }),
  adaptive('cl_n_adapt_fist', 'fist', -230, -195, ['cl_m_fist2', 'cl_k_storm', 'cl_k_asura'], '🥋', 'วิถีนักสู้', ['fist', 'holy', 's3'], {
    base: ['ปรับตามสาย ✨ Cleric: ตีปกติ/คอมโบแรง +10% · ทักษะ 1 แรง +10% · P.ATK +8', { basicDmg: 0.1, s1Pow: 0.1, atk: 8 }],
    monk: ['ปรับตามสาย 👊 Monk: ลูกพลังสูงสุด +1 · คอมโบไต่ระดับ +4%/ฮิต · ฮิตคอมโบแรง +8%', { j2ChargeMax: 1, j2ComboRamp: 0.04, comboDmg: 0.08 }],
    crusader: ['ปรับตามสาย ✝️ Crusader: Holy Cross / Grand Cross แรง +10% · ดาเมจสกิลกายภาพ +8% · P.ATK +8', { j2CrossAdd: 0.1, pskill: 0.08, atk: 8 }],
  }),
  keystone('cl_k_storm', 'fist', -345, -225, ['cl_n_breaker', 'cl_n_adapt_fist'], '🌪️', 'พายุหมัดไร้เงา', ['fist'],
    'คอมโบ +12% · ฮิตคอมโบแรง +20% · ตีปกติ/คอมโบแรง +15% · ความเร็วโจมตี +0.08',
    'ทักษะ 3 แรง −20% · Ult และ Ult วิวัฒน์แรง −15%',
    { combo: 0.12, comboDmg: 0.2, basicDmg: 0.15, aspd: 0.08, s3Pow: -0.2, ultPow: -0.15, ult2Pow: -0.15 }),
  keystone('cl_k_asura', 'fist', -75, -260, ['cl_n_focus', 'cl_n_adapt_fist', 'cl_m_bridge_n'], '💥', 'จิตอสุรา', ['fist', 'ki', 'ult'],
    'Ult และ Ult วิวัฒน์แรง +25% · Ult เจาะเกราะ +15% · สกิลคริ +10%',
    'คูลดาวน์ Ult +1 เทิร์น · ตีปกติ/คอมโบแรง −10%',
    { ultPow: 0.25, ult2Pow: 0.25, ultPierce: 0.15, skillCrit: 0.1, swUltCdAdd: 1, basicDmg: -0.1 }),
  fixed('cl_m_fist4', 'minor', 'fist', -420, -155, ['cl_n_breaker', 'cl_n_ironfist', 'cl_m_fist5'], '✊', 'กำปั้นหนัก', ['fist'], 'P.ATK +8 · ดาเมจสกิลกายภาพ +4%', { atk: 8, pskill: 0.04 }),
  fixed('cl_m_fist5', 'minor', 'fist', -440, -235, ['cl_m_fist4', 'cl_k_storm', 'cl_n_ironfist'], '👊', 'หมัดไม่ขาดสาย', ['fist'], 'คอมโบ +3% · ฮิตคอมโบแรง +6%', { combo: 0.03, comboDmg: 0.06 }),
  fixed('cl_n_ironfist', 'notable', 'fist', -495, -195, ['cl_m_fist4', 'cl_m_fist5'], '🥊', 'หมัดเหล็กพันชั่ง', ['fist'], 'P.ATK +14 · ดาเมจสกิลกายภาพ +8% · ดาเมจคริ +12%', { atk: 14, pskill: 0.08, critMul: 0.12 }),
  fixed('cl_m_fist6', 'minor', 'fist', -255, -285, ['cl_n_adapt_fist', 'cl_k_storm', 'cl_n_thunder'], '🎯', 'จุดตาย', ['fist'], 'สกิลคริ +5% · เจาะเกราะกายภาพ +4%', { skillCrit: 0.05, physPen: 0.04 }),
  fixed('cl_m_fist7', 'minor', 'fist', -165, -325, ['cl_k_asura', 'cl_m_fist6', 'cl_n_thunder'], '⚡', 'ปราณสายฟ้า', ['fist', 's3'], 'ทักษะ 3 แรง +8% · Max Mana +10', { s3Pow: 0.08, maxRes: 10 }),
  adaptive('cl_n_thunder', 'fist', -245, -360, ['cl_m_fist6', 'cl_m_fist7'], '🌩️', 'อัสนีบาต', ['fist', 's3'], {
    base: ['ปรับตามสาย ✨ Cleric: ทักษะ 1 แรง +12% · สกิลคริ +6% · M.ATK +8', { s1Pow: 0.12, skillCrit: 0.06, matk: 8 }],
    monk: ['ปรับตามสาย 👊 Monk: Falling Thunder แรง +15% · +8% ต่อลูกพลัง · บวก P.ATK +20%', { s3Pow: 0.15, j2ThunderPer: 0.08, j2ThunderAtk: 0.2 }],
    crusader: ['ปรับตามสาย ✝️ Crusader: Holy Cross แรง +15% · ตาบอดนาน +1 เทิร์น · สกิลคริ +6%', { s3Pow: 0.15, j2BlindAdd: 1, skillCrit: 0.06 }],
  }),

  // ========== 🔵 KI (NE): Monk M.DEF / Max HP / Mana · grit ==========
  fixed('cl_n_meditate', 'notable', 'ki', 175, -75, ['cl_m_ki1', 'cl_m_ki2', 'cl_m_ki3'], '🧘', 'นั่งสมาธิ', ['ki', 'heal'], 'ฟื้น Mana +6/เทิร์น · Max Mana +20 · ฟื้น HP +0.2%/วิ', { resRegen: 2, maxRes: 20, regen: 0.2 }),
  fixed('cl_m_ki2', 'minor', 'ki', 145, -155, ['cl_m_ki1', 'cl_n_meditate', 'cl_n_innerki', 'cl_n_resolve', 'cl_m_ki4'], '🔵', 'ปราณคุ้มกาย', ['ki'], 'M.DEF +3% · Max HP +55', { mdef: 0.03, maxHp: 55 }),
  fixed('cl_n_innerki', 'notable', 'ki', 80, -180, ['cl_m_ring_n', 'cl_m_ki2', 'cl_m_bridge_n', 'cl_m_ki4'], '☯️', 'พลังปราณภายใน', ['ki', 'fist'], 'M.DEF +5% · ตีกายภาพ ×(1 + 20%×M.DEF)', { mdef: 0.05, j2MdefDmg: 0.2 }),
  fixed('cl_m_ki3', 'minor', 'ki', 260, -85, ['cl_n_meditate', 'cl_n_resolve', 'cl_m_bridge_e', 'cl_k_bastion'], '🪨', 'จิตมั่น', ['ki'], 'M.DEF +3% · ต้านทาน +5%', { mdef: 0.03, tenacity: 0.05 }),
  adaptive('cl_n_resolve', 'ki', 255, -165, ['cl_m_ki2', 'cl_m_ki3', 'cl_k_ironbody'], '😤', 'แรงฮึดนักสู้', ['ki', 'aegis', 'counter'], {
    base: ['ปรับตามสาย ✨ Cleric: สวนกลับ +6% · ดาเมจสวนกลับ +15% · Max HP +80', { counter: 0.06, counterDmg: 0.15, maxHp: 80 }],
    monk: ['ปรับตามสาย 👊 Monk: สะสมแรงฮึด +20% · Max HP +80 · M.DEF +4%', { j2GritRate: 0.2, maxHp: 80, mdef: 0.04 }],
    crusader: ['ปรับตามสาย ✝️ Crusader: โดนตีกายภาพสะท้อน +4% · สวนกลับ +6% · Max HP +80', { j2Reflect: 0.04, counter: 0.06, maxHp: 80 }],
  }),
  fixed('cl_m_ki4', 'minor', 'ki', 165, -245, ['cl_n_innerki', 'cl_m_ki2', 'cl_k_ironbody'], '💧', 'บ่อปราณ', ['ki'], 'Max HP +70 · Max Mana +10', { maxHp: 70, maxRes: 10 }),
  keystone('cl_k_ironbody', 'ki', 275, -245, ['cl_m_ki4', 'cl_n_resolve'], '🗿', 'กายเหล็กไหล', ['ki', 'fist'],
    'M.DEF +10% · Max HP +200 · ตีกายภาพบวก +0.6% Max HP · ตีกายภาพ ×(1 + 30%×M.DEF)',
    'FLEE กลายเป็น 0 (ไม่หลบการโจมตีปกติ) · ความเร็วโจมตี −10%',
    { mdef: 0.1, maxHp: 200, j2HpPunch: 0.006, j2MdefDmg: 0.3, swNoFlee: 1, swIronAspdCut: 0.1 }),
  fixed('cl_m_ki5', 'minor', 'ki', 205, -330, ['cl_m_ki4', 'cl_k_ironbody', 'cl_n_spiritwell'], '🌬️', 'ลมหายใจยาว', ['ki'], 'Max Mana +15 · ฟื้น Mana +3/เทิร์น', { maxRes: 15, resRegen: 1 }),
  fixed('cl_m_ki6', 'minor', 'ki', 350, -300, ['cl_k_ironbody', 'cl_n_spiritwell', 'cl_m_aeg8'], '🔷', 'เกราะปราณ', ['ki'], 'M.DEF +4% · Max HP +60', { mdef: 0.04, maxHp: 60 }),
  adaptive('cl_n_spiritwell', 'ki', 285, -365, ['cl_m_ki5', 'cl_m_ki6'], '🌊', 'มหาสมุทรปราณ', ['ki', 'ult'], {
    base: ['ปรับตามสาย ✨ Cleric: Max Mana +25 · ฟื้น Mana +6/เทิร์น · Ult แรง +10%', { maxRes: 25, resRegen: 2, ultPow: 0.1 }],
    monk: ['ปรับตามสาย 👊 Monk: Max Mana +25 · อาชูร่าสไตรก์แรง +15% · Tempest Bell & อาชูร่า รับผล M.DEF +20%', { maxRes: 25, j2AsuraPow: 0.15, j2BellMdef: 0.2 }],
    crusader: ['ปรับตามสาย ✝️ Crusader: Max Mana +25 · Grand Cross แรง +10% · จ่าย HP น้อยลง 8%', { maxRes: 25, ult2Pow: 0.1, j2PayCut: 0.08 }],
  }),

  // ========== 🛡️ AEGIS (SE + east wheel): Crusader guard / shields / counter ==========
  keystone('cl_k_bastion', 'aegis', 355, -125, ['cl_m_ki3', 'cl_m_bridge_e'], '🏯', 'กำแพงพิทักษ์ธรรม', ['aegis'],
    'ลดดาเมจที่ได้รับทั้งหมด −12% · โล่แรง +20% · ต้านทาน +15% · โล่สะท้อนดาเมจ +30%',
    'ความเร็วโจมตี −15% · ดาเมจคริ −20%',
    { swIronDr: 0.12, shieldAmp: 0.2, tenacity: 0.15, thorns: 0.3, swIronAspdCut: 0.15, critMul: -0.2 }),
  fixed('cl_n_bulwark', 'notable', 'aegis', 175, 75, ['cl_m_aeg1', 'cl_m_aeg2', 'cl_m_aeg3'], '🧱', 'กำแพงศรัทธา', ['aegis'], 'ต้นเวฟได้โล่ 8% Max HP · เริ่มไฟต์บอสได้โล่ 12% Max HP · โล่แรง +8%', { waveShield: 0.08, bossShield: 0.12, shieldAmp: 0.08 }),
  fixed('cl_m_aeg2', 'minor', 'aegis', 145, 155, ['cl_m_aeg1', 'cl_n_bulwark', 'cl_n_retribution', 'cl_n_mirror'], '🛡️', 'เกราะนักบุญ', ['aegis'], 'P.DEF +6 · Max HP +60', { def: 6, maxHp: 60 }),
  fixed('cl_n_retribution', 'notable', 'aegis', 80, 180, ['cl_m_ring_s', 'cl_m_aeg2', 'cl_m_bridge_s', 'cl_k_martyr'], '🔁', 'สวนกลับศักดิ์สิทธิ์', ['aegis', 'counter'], 'สวนกลับ +6% · ดาเมจสวนกลับ +15% · สวนกลับแล้วได้โล่ 4% Max HP', { counter: 0.06, counterDmg: 0.15, counterShield: 0.04 }),
  fixed('cl_m_aeg3', 'minor', 'aegis', 260, 85, ['cl_n_bulwark', 'cl_m_bridge_e', 'cl_n_adapt_guard'], '✴️', 'หนามศรัทธา', ['aegis', 'counter'], 'P.DEF +5 · โล่สะท้อนดาเมจ +15%', { def: 5, thorns: 0.15 }),
  adaptive('cl_n_adapt_guard', 'aegis', 355, 125, ['cl_m_aeg3', 'cl_m_bridge_e', 'cl_n_mirror'], '⚔️', 'วิถีผู้พิทักษ์', ['aegis', 'ki'], {
    base: ['ปรับตามสาย ✨ Cleric: ต้นเวฟได้โล่ 6% Max HP · P.DEF +8 · สวนกลับ +5%', { waveShield: 0.06, def: 8, counter: 0.05 }],
    monk: ['ปรับตามสาย 👊 Monk: HP สูงสุด +5% · M.DEF +4% · P.DEF +6', { j2HpPct: 0.05, mdef: 0.04, def: 6 }],
    crusader: ['ปรับตามสาย ✝️ Crusader: Auto Guard +5% · บล็อกได้ฮีล 1% + โล่ 2% Max HP', { j2Guard: 0.05, j2BlockHeal: 0.01, j2BlockShield: 0.02 }],
  }),
  fixed('cl_n_mirror', 'notable', 'aegis', 240, 195, ['cl_m_aeg2', 'cl_n_adapt_guard', 'cl_k_martyr'], '🪞', 'โล่สะท้อนบาป', ['aegis', 'counter'], 'โล่สะท้อนดาเมจ +35% · P.DEF +10 · ดาเมจสวนกลับ +12%', { thorns: 0.35, def: 10, counterDmg: 0.12 }),
  keystone('cl_k_martyr', 'aegis', 75, 260, ['cl_n_retribution', 'cl_n_mirror', 'cl_m_bridge_s'], '🕊️', 'ผู้พลีกายเพื่อแสง', ['aegis', 'holy', 'heal'],
    'ฮีลแรง +25% · ฮีลส่วนที่เกิน HP เต็มแปลงเป็นโล่ (สูงสุด 50% Max HP) · ฟื้น HP +0.5%/วิ · ตั้งแต่เทิร์น 12 ของไฟต์ ดาเมจ +15%',
    'ตีปกติ/คอมโบแรง −12% · ดาเมจสกิลกายภาพ −10%',
    { healAmp: 0.25, overhealShield: 1, regen: 0.5, lateDmg: 0.15, basicDmg: -0.12, pskill: -0.1 }),
  fixed('cl_m_aeg8', 'minor', 'aegis', 425, -215, ['cl_m_ki6', 'cl_k_bastion', 'cl_n_diamond'], '❤️', 'ร่างพลีอุทิศ', ['aegis'], 'Max HP +90 · P.DEF +7', { maxHp: 90, def: 7 }),
  fixed('cl_m_aeg9', 'minor', 'aegis', 435, -125, ['cl_k_bastion', 'cl_m_bridge_e', 'cl_n_diamond'], '🪨', 'ใจไม่หวั่น', ['aegis', 'ki'], 'M.DEF +5% · ต้านทาน +6%', { mdef: 0.05, tenacity: 0.06 }),
  fixed('cl_n_diamond', 'notable', 'aegis', 495, -175, ['cl_m_aeg8', 'cl_m_aeg9'], '💠', 'เกราะเพชรศักดิ์สิทธิ์', ['aegis'], 'Max HP +160 · P.DEF +14 · M.DEF +8% · ต้านทาน +10%', { maxHp: 160, def: 14, mdef: 0.08, tenacity: 0.1 }),
  fixed('cl_m_aeg4', 'minor', 'aegis', 435, 125, ['cl_n_adapt_guard', 'cl_m_bridge_e', 'cl_n_fortress'], '🛡️', 'โล่หนา', ['aegis'], 'P.DEF +6 · Max HP +70', { def: 6, maxHp: 70 }),
  fixed('cl_m_aeg5', 'minor', 'aegis', 420, 215, ['cl_n_adapt_guard', 'cl_n_mirror', 'cl_n_fortress'], '🔰', 'ม่านพิทักษ์', ['aegis'], 'โล่แรง +8% · กด Ult ตอนบอสร่าย: โล่จาก Ult +30%', { shieldAmp: 0.08, ultChargeShield: 0.3 }),
  adaptive('cl_n_fortress', 'aegis', 495, 175, ['cl_m_aeg4', 'cl_m_aeg5'], '🏰', 'ป้อมปราการเดินได้', ['aegis'], {
    base: ['ปรับตามสาย ✨ Cleric: P.DEF +14 · Max HP +140 · โล่แรง +12%', { def: 14, maxHp: 140, shieldAmp: 0.12 }],
    monk: ['ปรับตามสาย 👊 Monk: P.DEF +12 · Max HP +140 · ตีกายภาพบวก +0.4% Max HP', { def: 12, maxHp: 140, j2HpPunch: 0.004 }],
    crusader: ['ปรับตามสาย ✝️ Crusader: Auto Guard +5% · Holy Cross ปาโล่ P.DEF x0.4 (ต้องถือมือรอง) · P.DEF +12', { j2Guard: 0.05, j2ShieldBoom: 0.4, def: 12 }],
  }),
  fixed('cl_m_aeg6', 'minor', 'aegis', 285, 275, ['cl_n_mirror', 'cl_m_aeg5', 'cl_n_templar'], '🔁', 'ตั้งรับสวน', ['aegis', 'counter'], 'Max HP +80 · สวนกลับ +3%', { maxHp: 80, counter: 0.03 }),
  fixed('cl_m_aeg7', 'minor', 'aegis', 165, 315, ['cl_k_martyr', 'cl_m_aeg6', 'cl_n_templar'], '💚', 'โล่ปลอบประโลม', ['aegis', 'heal'], 'P.DEF +6 · ฮีลแรง +5%', { def: 6, healAmp: 0.05 }),
  adaptive('cl_n_templar', 'aegis', 255, 355, ['cl_m_aeg6', 'cl_m_aeg7'], '⚜️', 'อัศวินเทมพลาร์', ['aegis', 'ult'], {
    base: ['ปรับตามสาย ✨ Cleric: Max HP +150 · P.DEF +10 · ฮีลแรง +10%', { maxHp: 150, def: 10, healAmp: 0.1 }],
    monk: ['ปรับตามสาย 👊 Monk: Max HP +150 · P.DEF +10 · ดูดเลือด +3%', { maxHp: 150, def: 10, lifesteal: 0.03 }],
    crusader: ['ปรับตามสาย ✝️ Crusader: Max HP +150 · Grand Cross ทุก pulse ได้โล่ 1% Max HP · ลดดาเมจ 1% ต่อ pulse ที่เหลือ', { maxHp: 150, j2GcShield: 0.01, j2GcAngel: 0.01 }],
  }),

  // ========== ✝️ HOLY (SW): light / spears / heals / cross ==========
  fixed('cl_n_radiance', 'notable', 'holy', -175, 75, ['cl_m_holy1', 'cl_m_holy2', 'cl_m_holy3'], '🌟', 'รัศมีศักดิ์สิทธิ์', ['holy'], 'M.ATK +12 · ดาเมจแสง +10% · แสง/หอกแสงคริได้ +5%', { matk: 12, smiteMul: 0.1, spellCrit: 0.05 }),
  fixed('cl_m_holy2', 'minor', 'holy', -145, 155, ['cl_m_holy1', 'cl_n_radiance', 'cl_n_grace', 'cl_n_angel'], '💗', 'พรสมานแผล', ['holy', 'heal'], 'ฮีลแรง +6% · ฟื้น HP +0.2%/วิ', { healAmp: 0.06, regen: 0.2 }),
  fixed('cl_n_grace', 'notable', 'holy', -80, 180, ['cl_m_ring_s', 'cl_m_holy2', 'cl_m_bridge_s', 'cl_m_holy4'], '🤲', 'พระคุณหลั่งไหล', ['holy', 'heal', 'aegis'], 'ฮีลแรง +12% · ฮีลจากสกิลแถมโล่ 15% ของที่ฮีล · ฟื้น Mana +4.5/เทิร์น', { healAmp: 0.12, healShield: 0.15, resRegen: 1.5 }),
  fixed('cl_m_holy3', 'minor', 'holy', -260, 85, ['cl_n_radiance', 'cl_m_bridge_w', 'cl_n_angel'], '📖', 'คัมภีร์แสง', ['holy'], 'M.ATK +8 · Max Mana +10', { matk: 8, maxRes: 10 }),
  fixed('cl_n_angel', 'notable', 'holy', -255, 180, ['cl_m_holy2', 'cl_m_holy3', 'cl_k_zeal'], '👼', 'เทวทูตคุ้มครอง', ['holy', 'heal'], 'ล้มแล้วลุกใหม่ 1 ครั้ง/รอบ ที่ HP 40% · ต้านทาน +6%', { revive: 1, reviveHp: 0.4, tenacity: 0.06 }),
  fixed('cl_m_holy4', 'minor', 'holy', -160, 250, ['cl_n_grace', 'cl_m_bridge_s', 'cl_k_zeal'], '💧', 'บ่อศรัทธาลึก', ['holy'], 'Max Mana +15 · ฟื้น Mana +3/เทิร์น', { maxRes: 15, resRegen: 1 }),
  keystone('cl_k_zeal', 'holy', -295, 255, ['cl_n_angel', 'cl_m_holy4'], '🔥', 'กางเขนเพลิงศรัทธา', ['holy', 's3', 'ult'],
    'M.ATK +30 · ดาเมจแสง +20% · ทักษะ 3 แรง +20% · แสง/หอกแสงคริได้ +10% · เจาะเกราะเวท +10%',
    'ฮีลแรง −20% · P.DEF −12',
    { matk: 30, smiteMul: 0.2, s3Pow: 0.2, spellCrit: 0.1, magPen: 0.1, healAmp: -0.2, def: -12 }),
  fixed('cl_m_holy5', 'minor', 'holy', -365, 135, ['cl_m_bridge_w', 'cl_n_angel', 'cl_n_spearlord'], '🔱', 'ปลายหอกแสง', ['holy'], 'หอกแสงแรง +5% M.ATK · หอกแต่ละเล่มฮีล 0.5% HP', { spearMul: 0.05, spearHeal: 0.005 }),
  fixed('cl_m_holy6', 'minor', 'holy', -415, 215, ['cl_m_holy5', 'cl_k_zeal', 'cl_n_spearlord'], '🍀', 'ปาฏิหาริย์น้อย', ['holy', 'heal'], 'แสง/หอกแสงคริได้ +4% · แสงฮีลตัวเอง 3% ของดาเมจ', { spellCrit: 0.04, smiteVamp: 0.03 }),
  fixed('cl_n_spearlord', 'notable', 'holy', -480, 170, ['cl_m_holy5', 'cl_m_holy6'], '🔱', 'จ้าวหอกแสง', ['holy'], 'เริ่มทุกไฟต์ด้วยหอกแสง 2 เล่ม · ได้หอกแสง 1 เล่มทุก 2 เทิร์น · หอกแสงแรง +10% M.ATK', { spearStart: 2, spearRate: 0.5, spearMul: 0.1 }),
  fixed('cl_m_holy7', 'minor', 'holy', -240, 335, ['cl_k_zeal', 'cl_m_holy4', 'cl_n_sanctum'], '☀️', 'แสงแทงทะลุ', ['holy'], 'เจาะเกราะเวท +4% · M.ATK +8', { magPen: 0.04, matk: 8 }),
  fixed('cl_m_holy8', 'minor', 'holy', -120, 330, ['cl_m_holy4', 'cl_m_bridge_s', 'cl_n_sanctum'], '💖', 'อ้อมกอดแสง', ['holy', 'heal'], 'ฮีลแรง +6% · Max HP +70', { healAmp: 0.06, maxHp: 70 }),
  adaptive('cl_n_sanctum', 'holy', -185, 380, ['cl_m_holy7', 'cl_m_holy8'], '⛪', 'วิหารแสงนิรันดร์', ['holy', 'heal', 'ult'], {
    base: ['ปรับตามสาย ✨ Cleric: Ult แถมดาเมจ 0.8x M.ATK ใส่ทุกตัว · หลัง Ult ฟื้น 2% HP/เทิร์น 3 เทิร์น · M.ATK +10', { ultHoly: 0.8, ultRegen: 0.02, matk: 10 }],
    monk: ['ปรับตามสาย 👊 Monk: ดูดเลือด +3% · ฮีลแรง +10% · Max Mana +20', { lifesteal: 0.03, healAmp: 0.1, maxRes: 20 }],
    crusader: ['ปรับตามสาย ✝️ Crusader: Holy Cross / Grand Cross แรง +12% · Grand Cross แถมดาเมจ 0.8x M.ATK ใส่ทุกตัว · หลัง Ult ฟื้น 2% HP/เทิร์น 3 เทิร์น', { j2CrossAdd: 0.12, ultHoly: 0.8, ultRegen: 0.02 }],
  }),

  // ========== 💎 JEWEL SOCKETS (one past each bridge) ==========
  socket('cl_sock_n', 'fist', 0, -300, ['cl_m_bridge_n'], '💎', 'ช่อง Jewel เหนือ (หมัด)', ['jewel']),
  socket('cl_sock_e', 'ki', 400, 0, ['cl_m_bridge_e'], '💎', 'ช่อง Jewel ตะวันออก (ปราณ)', ['jewel']),
  socket('cl_sock_s', 'aegis', 0, 305, ['cl_m_bridge_s'], '💎', 'ช่อง Jewel ใต้ (โล่ศรัทธา)', ['jewel']),
  socket('cl_sock_w', 'holy', -400, 0, ['cl_m_bridge_w'], '💎', 'ช่อง Jewel ตะวันตก (แสง)', ['jewel']),
]

export const CLERIC_PASSIVE_TREE: PassiveTreeDef = {
  job: 'cleric',
  title: 'กลุ่มดาวพาสซีฟสายนักบวช (Cleric Constellation)',
  originId: 'cl_origin',
  quadrants: ['fist', 'ki', 'aegis', 'holy'],
  filters: [
    { tag: 'fist', icon: '👊', label: 'หมัด' },
    { tag: 'ki', icon: '🔵', label: 'ปราณ' },
    { tag: 'aegis', icon: '🛡️', label: 'โล่' },
    { tag: 'holy', icon: '✝️', label: 'แสง' },
    { tag: 'heal', icon: '💖', label: 'ฮีล' },
  ],
  nodes: [...NODES, ...CLERIC_AWAKEN_NODES], // 🌟 + Awakening ring (cleric-awaken.ts, 3rd job only)
}
