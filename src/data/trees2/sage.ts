// 📖 Sage ใยชั้น 2 (design/sage-rework-v1.md): On-hit Elemental Perks + Auto Spell + Perk Crit + Endow + Magic Rod.
import { node as n, rk, talent as t, type ClassTree } from '../tree-types'
import { KIT2 } from '../skill-math'

const S = KIT2.sage, P = S.perk
const pc = (x: number) => `${Math.round(x * 100)}%`

export const tree2: ClassTree = {
  branches: [
    { id: 'sg_a', job: 'mage', job2: 'sage', name: 'Auto Spell', icon: '📖', blurb: 'Auto Spell · Perk Crit · ★ Hindsight' },
    { id: 'sg_f', job: 'mage', job2: 'sage', name: 'Fire Bolt ×hit', icon: '🔥', blurb: 'On-Hit ยิง Fire Bolt ซ้ำตามคอมโบ · ★ Inferno Overdrive' },
    { id: 'sg_l', job: 'mage', job2: 'sage', name: 'Chain Lightning', icon: '⚡', blurb: 'On-Hit สายฟ้าชิ่ง 3 เป้า + มึน · ★ Overload Tempest' },
    { id: 'sg_i', job: 'mage', job2: 'sage', name: 'Permafrost', icon: '❄️', blurb: 'On-Hit สะสม 4 ขั้นแตกแช่แข็ง + คริ · ★ Absolute Permafrost' },
    { id: 'sg_r', job: 'mage', job2: 'sage', name: 'Magic Rod', icon: '🛡️', blurb: 'ดูดเวทเป็น Mana/โล่ · กายปราชญ์ · ★ Magic Rod เต็มขั้น' },
  ],
  nodes: [
    // 🗡️ Under ทักษะ 3 (Endow)
    n('sg_e1', 'sage_s3', 1, '⏳', 'ธาตุติดทน', 2, (lv) => `Endow นาน +${lv} เทิร์น`, (lv) => ({ j2EndowTurns: lv })),
    n('sg_e2', 'sage_s3', 2, '🗡️', 'ธาตุคม', 3, (lv) => `Endow เพิ่มแรงตี/Auto/Perk +${lv * 6}% · P.ATK +${lv * 5}`, (lv) => ({ j2EndowAmp: 0.06 * lv, atk: 5 * lv })),
    n('sg_e3', 'sage_s3', 3, '♾️', 'อาวุธธาตุนิรันดร์', 1, () => 'Endow อยู่ทั้งเวฟ (ไม่ต้องร่ายซ้ำ)', () => ({ j2EndowWave: 1 })),

    // 🚫 Under Ult วิวัฒน์ (Dispell + Spell Breaker)
    n('sg_u1', 'sage_u2', 1, '🚫', 'ขโมยอาคม', 3, (lv) => `Spell Breaker ขโมย Mana +${lv * 6} · สกิลคริ +${lv * 3}%`, (lv) => ({ j2UltMana: 6 * lv, skillCrit: 0.03 * lv })),
    n('sg_u2', 'sage_u2', 2, '💥', 'ทลายเกราะเวท', 2, (lv) => `Spell Breaker เจาะเกราะ +${lv * 15}% · ทำลายเกราะ ${lv} เทิร์น`, (lv) => ({ ultPierce: 0.15 * lv, j2UltBreak: lv })),

    // 📖 Branch 1: Auto Spell & Perk Crit
    n('sg_a1', 'sg_a', 1, '📖', 'ร่ายไว', 3, (lv) => `Auto Spell โอกาส +${lv * 5}% · สกิลคริ +${lv * 2}%`, (lv) => ({ j2AutoChance: 0.05 * lv, skillCrit: 0.02 * lv })),
    n('sg_a2', 'sg_a', 2, '🎯', 'ปราชญ์เจาะจุดตาย', 3, (lv) => `เวทคริ +${Math.round(lv * 2.5)}% · ดาเมจคริ On-Hit/Auto +${lv * 12}%`, (lv) => ({ spellCrit: 0.025 * lv, procCritMul: 0.12 * lv })),
    n('sg_a3', 'sg_a', 3, '✨', 'Bolt คู่', 1, () => 'Auto Spell ยิง +1 ลูก · แรง +15%', () => ({ j2AutoBolts: 1, j2AutoMul: 0.15 })),
    n('sg_a4', 'sg_a', 4, '👁️', 'Hindsight', 1, () => 'Auto Spell & On-Hit Perk ติดได้ทั้งตอนคอมโบและสวนกลับ', () => ({ j2Hindsight: 1 })),

    // 🔥 Branch 2: On-Hit Perk — Fire Bolt × hit
    n('sg_f1', 'sg_f', 1, '🔥', 'Fire Bolt on Hit', 3, (lv) => `ทุกฮิตมีโอกาส ${Math.round((P.fireChance + P.firePerLv * (lv - 1)) * 100)}% ยิง Fire Bolt + เผา (ธาตุหลัก 🔥 100% / อื่น ${pc(P.offMul)})`, (lv) => ({ j2FirePerk: lv })),
    n('sg_f2', 'sg_f', 2, '☄️', 'เพลิงทวีคูณ', 3, (lv) => `Fire Bolt แรง +${lv * 12}% · เวทคริ +${lv * 2}%`, (lv) => ({ j2FireDmg: 0.12 * lv, spellCrit: 0.02 * lv })),
    n('sg_f3', 'sg_f', 3, '🔥', 'ไฟลามจุดตาย', 3, (lv) => `เวทคริ vs เป้าติดเผา +${lv * 4}% · เพดานเผา +${lv * 2}`, (lv) => ({ j2FireCrit: 0.04 * lv, burnCap: 2 * lv })),
    n('sg_f4', 'sg_f', 4, '💥', 'Inferno Overdrive', 1, () => `Fire Bolt ยิงครบ ${P.fireMaxBolts} ลูกใน 1 เทิร์น → ปะทุทุกตัว ${P.fireNovaMul}x Pm + เผา ${P.fireNovaBurn}`, () => ({ j2FireStar: 1 })),

    // ⚡ Branch 3: On-Hit Perk — Chain Lightning
    n('sg_l1', 'sg_l', 1, '⚡', 'Chain Lightning on Hit', 3, (lv) => `ทุกฮิตมีโอกาส ${Math.round((P.lightChance + P.lightPerLv * (lv - 1)) * 100)}% สายฟ้าชิ่ง ${P.lightTargetsBase + (lv >= 3 ? 1 : 0)} เป้า (เป้าเดียว ×4 · ธาตุหลัก ⚡ 100% / อื่น ${pc(P.offMul)})`, (lv) => ({ j2LightPerk: lv })),
    n('sg_l2', 'sg_l', 2, '🌩️', 'กระแสแรงสูง', 3, (lv) => `Chain Lightning แรง +${lv * 12}% · ความเร็วโจมตี +${lv * 4}%`, (lv) => ({ j2LightDmg: 0.12 * lv, aspd: 0.064 * lv })),
    n('sg_l3', 'sg_l', 3, '💫', 'สายฟ้าช็อตมึน', 3, (lv) => `ชิ่งแต่ละเป้ามีโอกาสมึน +${lv * 3}% (บอส: ผลักเกจ -${P.lightPush}) · สกิลคริ +${lv * 2}%`, (lv) => ({ j2LightStun: P.lightStunPerLv * lv, skillCrit: 0.02 * lv })),
    n('sg_l4', 'sg_l', 4, '🌩️', 'Overload Tempest', 1, () => 'ดาเมจสายฟ้าทุกชนิดฟื้น Mana +1/ฮิต · สายฟ้าคริสร้างดาเมจเวท 4% ของ HP ปัจจุบันศัตรู', () => ({ j2LightStar: 1 })),

    // ❄️ Branch 4: On-Hit Perk — Permafrost (Sejuani E)
    n('sg_i1', 'sg_i', 1, '❄️', 'Permafrost on Hit', 3, (lv) => `ทุกฮิตมีโอกาส ${Math.min(100, Math.round((P.iceChance + P.icePerLv * (lv - 1)) * 100))}% ซ้อนเยือกแข็ง (ครบ ${P.iceMax} ขั้น แตก+แช่แข็ง · ธาตุหลัก ❄️ 100% / อื่น ${pc(P.offMul)})`, (lv) => ({ j2IcePerk: lv })),
    n('sg_i2', 'sg_i', 2, '🧊', 'น้ำแข็งแตกร้าว', 3, (lv) => `Permafrost แตกแรง +${lv * 15}% · เป้าหนาวช้าลงอีก +${lv * 5}%`, (lv) => ({ j2IceDmg: P.iceDmgPerLv * lv, chillSlow: 0.05 * lv })),
    n('sg_i3', 'sg_i', 3, '🎯', 'จุดเยือกแข็งเปราะ', 3, (lv) => `ตีเป้าหนาว/แช่แข็ง: คริเวท+สกิล +${lv * 5}% · เจาะเวท +${lv * 4}%`, (lv) => ({ j2IceCrit: P.iceCritPerLv * lv, magPen: 0.04 * lv })),
    n('sg_i4', 'sg_i', 4, '❄️', 'Absolute Permafrost', 1, () => `Permafrost แตกใส่ทุกตัว ${P.iceStarMul}x Pm · การันตีคริ 100% · ดันเกจบอส -${P.iceStarPush}`, () => ({ j2IceStar: 1 })),

    // 🛡️ Branch 5: Magic Rod & Battle-Sage
    n('sg_r1', 'sg_r', 1, '🔮', 'Magic Rod', 3, (lv) => `โดนเวท = Mana +${lv * 3} (+VIT) + โล่เวท`, (lv) => ({ j2MagicRod: 3 * lv })),
    n('sg_r2', 'sg_r', 2, '🛡️', 'กายปราชญ์', 3, (lv) => `M.DEF +${lv * 3}% · HP สูงสุด +${lv * 35}`, (lv) => ({ mdef: 0.03 * lv, maxHp: 35 * lv })),
    n('sg_r3', 'sg_r', 3, '⚔️', 'แขนนักปราชญ์', 3, (lv) => `P.ATK +${lv * 5} · M.ATK +${lv * 5} · ต้านดีบัฟ +${lv * 4}%`, (lv) => ({ atk: 5 * lv, matk: 5 * lv, tenacity: 0.04 * lv })),
    n('sg_r4', 'sg_r', 4, '🌀', 'Magic Rod เต็มขั้น', 1, () => `เวทลูกแรกของทุกเวฟถูกดูดหาย + Mana ${S.rodBlockMana} (+VIT) และสวนกลับ Auto Spell`, () => ({ j2RodBlock: 1 })),
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
