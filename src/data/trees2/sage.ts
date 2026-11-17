// 📖 Sage ใยชั้น 2 (design/sage-rework-v1.md): On-hit Elemental Perks + Auto Spell + Perk Crit + Endow + Magic Rod.
import { node as n, rk, talent as t, type ClassTree } from '../tree-types'
import { KIT2 } from '../skill-math'

const S = KIT2.sage, P = S.perk
const pc = (x: number) => `${Math.round(x * 100)}%`

export const tree2: ClassTree = {
  branches: [
    { id: 'sg_a', job: 'mage', job2: 'sage', name: 'Auto Spell', icon: '📖', blurb: 'เพิ่มโอกาสร่าย Auto Spell · คริเวทแรงขึ้น · ★ ร่ายตอนสวนกลับ/คอมโบ' },
    { id: 'sg_f', job: 'mage', job2: 'sage', name: 'Fire Bolt ×hit', icon: '🔥', blurb: 'ตีโดนมีโอกาสยิง Fire Bolt ซ้ำหลายลูก + เผา · ★ ระเบิดไฟหมู่' },
    { id: 'sg_l', job: 'mage', job2: 'sage', name: 'Chain Lightning', icon: '⚡', blurb: 'ตีโดนปล่อยสายฟ้าชิ่งหลายเป้า + มึน · ★ ฟื้น Mana & ดาเมจ %HP' },
    { id: 'sg_i', job: 'mage', job2: 'sage', name: 'Permafrost', icon: '❄️', blurb: 'ตีโดนสะสมน้ำแข็ง 4 ขั้นแล้วแตกแช่แข็ง · ★ แตกใส่ทุกตัวคริ 100%' },
    { id: 'sg_r', job: 'mage', job2: 'sage', name: 'Magic Rod', icon: '🛡️', blurb: 'โดนเวทแล้วดูดเป็น Mana + โล่เวท · เพิ่มถึก · ★ ดูดเวทแรกของเวฟฟรี' },
  ],
  nodes: [
    // 🗡️ Under ทักษะ 3 (Endow)
    n('sg_e1', 'sage_s3', 1, '⏳', 'ธาตุติดทน', 2, (lv) => `Endow อยู่นานขึ้น +${lv} เทิร์น`, (lv) => ({ j2EndowTurns: lv })),
    n('sg_e2', 'sage_s3', 2, '🗡️', 'ธาตุคม', 3, (lv) => `ระหว่างมี Endow: ฟัน/Auto Spell/เวทเสริมแรงขึ้น +${lv * 6}% · P.ATK +${lv * 5}`, (lv) => ({ j2EndowAmp: 0.06 * lv, atk: 5 * lv })),
    n('sg_e3', 'sage_s3', 3, '♾️', 'อาวุธธาตุนิรันดร์', 1, () => 'Endow อยู่ถาวรทั้งเวฟ (ไม่ต้องกดร่ายซ้ำ)', () => ({ j2EndowWave: 1 })),

    // 🚫 Under Ult วิวัฒน์ (Dispell + Spell Breaker)
    n('sg_u1', 'sage_u2', 1, '🚫', 'ขโมยอาคม', 3, (lv) => `Spell Breaker ขโมย Mana +${lv * 6} · คริสกิล +${lv * 3}%`, (lv) => ({ j2UltMana: 6 * lv, skillCrit: 0.03 * lv })),
    n('sg_u2', 'sage_u2', 2, '💥', 'ทลายเกราะเวท', 2, (lv) => `Spell Breaker เจาะเกราะ +${lv * 15}% · ทำลายเกราะ ${lv} เทิร์น`, (lv) => ({ ultPierce: 0.15 * lv, j2UltBreak: lv })),

    // 📖 Branch 1: Auto Spell & Perk Crit
    n('sg_a1', 'sg_a', 1, '📖', 'ร่ายไว', 3, (lv) => `โอกาสติด Auto Spell +${lv * 5}% · คริสกิล +${lv * 2}%`, (lv) => ({ j2AutoChance: 0.05 * lv, skillCrit: 0.02 * lv })),
    n('sg_a2', 'sg_a', 2, '🎯', 'ปราชญ์เจาะจุดตาย', 3, (lv) => `คริเวท +${(lv * 2.5).toFixed(lv % 2 === 1 ? 1 : 0)}% · ดาเมจคริของ Auto Spell/เวทเสริม +${lv * 12}%`, (lv) => ({ spellCrit: 0.025 * lv, procCritMul: 0.12 * lv })),
    n('sg_a3', 'sg_a', 3, '✨', 'Bolt คู่', 1, () => 'Auto Spell ยิงเพิ่ม +1 ลูก · แรงขึ้น +15%', () => ({ j2AutoBolts: 1, j2AutoMul: 0.15 })),
    n('sg_a4', 'sg_a', 4, '👁️', 'Hindsight', 1, () => 'Auto Spell และเวทเสริมธาตุ ติดได้ทั้งตอนคอมโบและตอนสวนกลับ', () => ({ j2Hindsight: 1 })),

    // 🔥 Branch 2: On-Hit Perk — Fire Bolt × hit
    n('sg_f1', 'sg_f', 1, '🔥', 'Fire Bolt on Hit', 3, (lv) => `เมื่อตีโดนมีโอกาส ${Math.round((P.fireChance + P.firePerLv * (lv - 1)) * 100)}% ยิง Fire Bolt ซ้ำ (สูงสุด ${P.fireMaxBolts} ลูก) + เผา · ธาตุหลัก 🔥 100% / รอง ${pc(P.offMul)}`, (lv) => ({ j2FirePerk: lv })),
    n('sg_f2', 'sg_f', 2, '☄️', 'เพลิงทวีคูณ', 3, (lv) => `Fire Bolt แรงขึ้น +${lv * 12}% · คริเวท +${lv * 2}%`, (lv) => ({ j2FireDmg: 0.12 * lv, spellCrit: 0.02 * lv })),
    n('sg_f3', 'sg_f', 3, '🔥', 'ไฟลามจุดตาย', 3, (lv) => `คริเวทใส่เป้าติดเผา +${lv * 4}% · ซ้อนเผาสูงสุด +${lv * 2} ชั้น`, (lv) => ({ j2FireCrit: 0.04 * lv, burnCap: 2 * lv })),
    n('sg_f4', 'sg_f', 4, '💥', 'Inferno Overdrive', 1, () => `Fire Bolt ยิงครบ ${P.fireMaxBolts} ลูกใน 1 เทิร์น → ระเบิดไฟใส่ทุกตัว ${P.fireNovaMul}x พลังเวท + เผา ${P.fireNovaBurn} ชั้น`, () => ({ j2FireStar: 1 })),

    // ⚡ Branch 3: On-Hit Perk — Chain Lightning
    n('sg_l1', 'sg_l', 1, '⚡', 'Chain Lightning on Hit', 3, (lv) => `เมื่อตีโดนมีโอกาส ${Math.round((P.lightChance + P.lightPerLv * (lv - 1)) * 100)}% ปล่อยสายฟ้าชิ่ง ${P.lightTargetsBase + (lv >= 3 ? 1 : 0)} เป้า (เหลือศัตรู 1 ตัว = แรง ×4) · ธาตุหลัก ⚡ 100% / รอง ${pc(P.offMul)}`, (lv) => ({ j2LightPerk: lv })),
    n('sg_l2', 'sg_l', 2, '🌩️', 'กระแสแรงสูง', 3, (lv) => `Chain Lightning แรงขึ้น +${lv * 12}% · ความเร็วโจมตี +${lv * 4}%`, (lv) => ({ j2LightDmg: 0.12 * lv, aspd: 0.064 * lv })),
    n('sg_l3', 'sg_l', 3, '💫', 'สายฟ้าช็อตมึน', 3, (lv) => `สายฟ้าชิ่งแต่ละเป้ามีโอกาสมึน +${lv * 3}% (บอส: ดันเกจ -${P.lightPush}) · คริสกิล +${lv * 2}%`, (lv) => ({ j2LightStun: P.lightStunPerLv * lv, skillCrit: 0.02 * lv })),
    n('sg_l4', 'sg_l', 4, '🌩️', 'Overload Tempest', 1, () => 'ดาเมจสายฟ้าทุกชนิดฟื้น Mana +1/ฮิต · สายฟ้าคริสร้างดาเมจเวทเสริม 4% ของ HP ปัจจุบันศัตรู', () => ({ j2LightStar: 1 })),

    // ❄️ Branch 4: On-Hit Perk — Permafrost (Sejuani E)
    n('sg_i1', 'sg_i', 1, '❄️', 'Permafrost on Hit', 3, (lv) => `เมื่อตีโดนมีโอกาส ${Math.min(100, Math.round((P.iceChance + P.icePerLv * (lv - 1)) * 100))}% สะสมน้ำแข็ง (ครบ ${P.iceMax} ขั้น แตก+แช่แข็ง) · ธาตุหลัก ❄️ 100% / รอง ${pc(P.offMul)}`, (lv) => ({ j2IcePerk: lv })),
    n('sg_i2', 'sg_i', 2, '🧊', 'น้ำแข็งแตกร้าว', 3, (lv) => `Permafrost แตกแรงขึ้น +${lv * 15}% · ศัตรูที่ติดหนาวช้าลงอีก +${lv * 5}%`, (lv) => ({ j2IceDmg: P.iceDmgPerLv * lv, chillSlow: 0.05 * lv })),
    n('sg_i3', 'sg_i', 3, '🎯', 'จุดเยือกแข็งเปราะ', 3, (lv) => `ตีเป้าที่หนาว/แช่แข็ง: คริเวทและคริสกิล +${lv * 5}% · เจาะเกราะเวท +${lv * 4}%`, (lv) => ({ j2IceCrit: P.iceCritPerLv * lv, magPen: 0.04 * lv })),
    n('sg_i4', 'sg_i', 4, '❄️', 'Absolute Permafrost', 1, () => `Permafrost แตกใส่ทุกตัว ${P.iceStarMul}x พลังเวท · การันตีคริ 100% · ดันเกจบอส -${P.iceStarPush}`, () => ({ j2IceStar: 1 })),

    // 🛡️ Branch 5: Magic Rod & Battle-Sage
    n('sg_r1', 'sg_r', 1, '🔮', 'Magic Rod', 3, (lv) => `เมื่อโดนเวทโจมตี: ดูดเป็น Mana +${lv * 3} (+โบนัสจาก VIT) และสร้างโล่เวท`, (lv) => ({ j2MagicRod: 3 * lv })),
    n('sg_r2', 'sg_r', 2, '🛡️', 'กายปราชญ์', 3, (lv) => `M.DEF +${lv * 3}% · HP สูงสุด +${lv * 35}`, (lv) => ({ mdef: 0.03 * lv, maxHp: 35 * lv })),
    n('sg_r3', 'sg_r', 3, '⚔️', 'แขนนักปราชญ์', 3, (lv) => `P.ATK +${lv * 5} · M.ATK +${lv * 5} · ต้านดีบัฟ +${lv * 4}%`, (lv) => ({ atk: 5 * lv, matk: 5 * lv, tenacity: 0.04 * lv })),
    n('sg_r4', 'sg_r', 4, '🌀', 'Magic Rod เต็มขั้น', 1, () => `เวทลูกแรกของทุกเวฟถูกดูดหายไร้ผล + ได้ Mana ${S.rodBlockMana} (+VIT) และสวนกลับ Auto Spell ทันที`, () => ({ j2RodBlock: 1 })),
  ],
  talents: [
    // v119 ทาเลนต์ชั้น 2 · I stats · II Ult วิวัฒน์ · III ทักษะ 3 & 1 · IV ตัวตน
    t('sg_t1_auto', 1, '📖', 'ร่ายเร็ว', 2, (r) => `Auto Spell โอกาส +${rk(r, 5, 8)}%`, (r) => ({ j2AutoChance: rk(r, 0.05, 0.08) })),
    t('sg_t1_crit', 1, '🎯', 'จังหวะปราชญ์', 2, (r) => `เวทคริ +${rk(r, 3, 5)}% · สกิลคริ +${rk(r, 3, 5)}%`, (r) => ({ spellCrit: rk(r, 0.03, 0.05), skillCrit: rk(r, 0.03, 0.05) })),
    t('sg_t1_hybrid', 1, '⚔️', 'นักรบตำรา', 2, (r) => `P.ATK +${rk(r, 5, 9)} · M.ATK +${rk(r, 5, 9)}`, (r) => ({ atk: rk(r, 5, 9), matk: rk(r, 5, 9) })),
    t('sg_t2_ult', 2, '🚫', 'ทำลายเวท', 2, (r) => `Dispell + Spell Breaker แรง +${rk(r, 15, 25)}%`, (r) => ({ ult2Pow: rk(r, 0.15, 0.25) })),
    t('sg_t2_rod', 2, '🔮', 'ไม้ดูดเวท', 2, (r) => `โดนเวท = Mana +${rk(r, 3, 5)} · M.DEF +${rk(r, 4, 7)}%`, (r) => ({ j2MagicRod: rk(r, 3, 5), mdef: rk(r, 0.04, 0.07) })),
    t('sg_t2_proccrit', 2, '💥', 'คริอาคมสังหาร', 2, (r) => `ดาเมจคริ On-Hit/Auto Spell +${rk(r, 15, 28)}%`, (r) => ({ procCritMul: rk(r, 0.15, 0.28) })),
    t('sg_t3_endow', 3, '🗡️', 'Endow ลึก', 2, (r) => `Endow แรง +${rk(r, 6, 10)}% · นาน +${rk(r, 1, 2)} เทิร์น`, (r) => ({ j2EndowAmp: rk(r, 0.06, 0.1), j2EndowTurns: rk(r, 1, 2) })),
    t('sg_t3_s1', 3, '📖', 'ศาสตราวุธแกร่ง', 2, (r) => `ทักษะ 1 (ศาสตราวุธธาตุ) แรง +${rk(r, 15, 25)}%`, (r) => ({ s1Pow: rk(r, 0.15, 0.25) })),
    t('sg_t3_pow', 3, '✨', 'คมธาตุ', 2, (r) => `Endow (ทักษะ 3) แรง +${rk(r, 15, 25)}% · เจาะเวท +${rk(r, 4, 7)}%`, (r) => ({ s3Pow: rk(r, 0.15, 0.25), magPen: rk(r, 0.04, 0.07) })),
    t('sg_t4_hp', 4, '❤️', 'กายนักรบเวท', 2, (r) => `HP สูงสุด +${rk(r, 45, 80)} · P.DEF +${rk(r, 4, 7)}`, (r) => ({ maxHp: rk(r, 45, 80), def: rk(r, 4, 7) })),
    t('sg_t4_crit', 4, '💥', 'ปรมาจารย์คริ', 2, (r) => `เวทคริ +${rk(r, 4, 7)}% · ดาเมจคริรวม +${rk(r, 10, 18)}%`, (r) => ({ spellCrit: rk(r, 0.04, 0.07), critMul: rk(r, 0.1, 0.18) })),
    t('sg_t4_aspd', 4, '💨', 'ร่ายพริ้ว', 2, (r) => `ความเร็วโจมตี +${rk(r, 8, 14)}% · Mana สูงสุด +${rk(r, 12, 22)}`, (r) => ({ aspd: rk(r, 0.128, 0.224), maxRes: rk(r, 12, 22) })),
  ],
}
