// 🐴 Knight ใยชั้น 2 (design/second-jobs-v1.md §4). Node ids are save data: never rename.
import { node as n, type ClassTree } from '../tree-types'
import { KIT2 } from '../skill-math'

// v84 (design/second-jobs-v1.md §4 v84): numbers in KIT2.knight.tree, written per OLD level (max 3); data/tree.ts stretches them to 5.
const T = KIT2.knight.tree, pc = (x: number) => `${+(x * 100).toFixed(1)}%`, r1 = (x: number) => +x.toFixed(2)

export const tree2: ClassTree = {
  branches: [
    { id: 'kn_p', job: 'swordsman', job2: 'knight', name: 'หอกทะลวง', icon: '🗡️', blurb: 'Pierce · Spear Boomerang' },
    { id: 'kn_g', job: 'swordsman', job2: 'knight', name: 'ป้อม', icon: '🛡️', blurb: 'Auto Guard · เกราะเป็นแรง' },
    { id: 'kn_c', job: 'swordsman', job2: 'knight', name: 'เปโก', icon: '🐦', blurb: 'ความเร็ว · Charge Attack' },
    // v84: ★ here takes a ★ slot too (cap 2 of 5)
    { id: 'kn_o', job: 'swordsman', job2: 'knight', name: 'ธงศึก', icon: '🚩', blurb: 'โล่ต้นเวฟ · มอนใกล้ตายตีเบา · ★ บล็อกแล้วฮีล + Mana' },
    { id: 'kn_r', job: 'swordsman', job2: 'knight', name: 'กวาดทวน', icon: '🌀', blurb: 'ทุก 3 เทิร์นกวาดทวนทุกตัว · ดันเกจ · ★ เกราะแตก + มึน' },
  ],
  nodes: [
    n('kn_p1', 'kn_p', 1, '🔱', 'หอกหนัก', 3, (lv) => `สกิลหอกบวกดาเมจ HP สูงสุดอีก +${lv}%`, (lv) => ({ j2HpDmg: 0.01 * lv })),
    n('kn_p2', 'kn_p', 2, '🎯', 'Pierce+', 1, () => 'Pierce แทงเพิ่ม 1 ฮิต', () => ({ j2PierceHits: 1 })),
    n('kn_p3', 'kn_p', 3, '↩️', 'Spear Boomerang', 1, () => 'ต้นเทิร์น ถ้ามีมอนกำลังชาร์จ: ปาหอกใส่ 0.8x + HP สูงสุด แล้วขัดการชาร์จ (1 ครั้ง/เวฟ)', () => ({ j2Boomerang: 1 })),
    n('kn_p4', 'kn_p', 4, '🌀', 'Spiral Pierce', 1, () => 'Ult ข้าม DEF มอน 50%', () => ({ j2Spiral: 0.5 })),
    n('kn_g1', 'kn_g', 1, '🛡️', 'Auto Guard', 3, (lv) => `โอกาสบล็อกการโจมตีกายภาพ ${lv * 4}% (ไม่มีโล่ = ครึ่งเดียว)`, (lv) => ({ j2Guard: 0.04 * lv })),
    n('kn_g2', 'kn_g', 2, '⚙️', 'เกราะเป็นแรง', 3, (lv) => `P.ATK + P.DEF x ${(lv * 0.15).toFixed(2)}`, (lv) => ({ j2DefAtk: 0.15 * lv })),
    n('kn_g3', 'kn_g', 3, '🏰', 'ยืนตระหง่าน', 3, (lv) => `HP สูงสุด +${lv * 4}%`, (lv) => ({ j2HpPct: 0.04 * lv })),
    n('kn_g4', 'kn_g', 4, '↩️', 'Counter Attack', 1, () => 'สวนกลับคริทุกครั้ง', () => ({ j2CounterCrit: 1 })),
    n('kn_c1', 'kn_c', 1, '💨', 'เร่งเปโก', 3, (lv) => `ความเร็ว +${lv * 4}%`, (lv) => ({ aspd: 0.064 * lv })),
    n('kn_c2', 'kn_c', 2, '🐎', 'Charge Attack', 3, (lv) => `ฟันแรกของทุกเวฟ +${lv * 30}%`, (lv) => ({ j2Charge: 0.3 * lv })),
    n('kn_c3', 'kn_c', 3, '🦵', 'ขาเปโกแกร่ง', 3, (lv) => `Flee +${lv * 4} · Hit +${lv * 4}`, (lv) => ({ flee: 4 * lv, hit: 4 * lv })),
    n('kn_c4', 'kn_c', 4, '🚀', 'ทะยาน', 1, () => 'ทุกเวฟได้เทิร์นก่อนเสมอ และฟันแรก x3', () => ({ j2ChargeFirst: 1 })),
    // O: ธงศึก (banner)
    n('kn_o1', 'kn_o', 1, '🚩', 'ปักธง', 3, (lv) => `ต้นทุกเวฟได้โล่ ${pc(T.banner * lv)} HP สูงสุด (เติมให้เต็ม ไม่ซ้อน)`, (lv) => ({ j2Banner: T.banner * lv })),
    n('kn_o2', 'kn_o', 2, '😤', 'ข่มขวัญ', 3, (lv) => `มอน HP < ${pc(T.provokeAt)} ตีเราเบาลง −${pc(T.provoke * lv)}`, (lv) => ({ j2Provoke: T.provoke * lv })),
    n('kn_o3', 'kn_o', 3, '🎖️', 'ธงชัย', 3, (lv) => `ฆ่าได้ 1 ตัว → โล่ ${pc(T.bannerKill * lv)} HP`, (lv) => ({ j2BannerKill: T.bannerKill * lv })),
    n('kn_o4', 'kn_o', 4, '🏳️', 'ธงอมตะ', 1, () => `Auto Guard +${pc(T.auraGuard)} · บล็อกได้ทุกครั้ง: ฮีล ${pc(T.auraHeal)} HP + Mana/Rage +${T.auraRes}`, () => ({ j2BannerAura: 1, j2Guard: T.auraGuard })),
    // R: กวาดทวน (sweep every Nth hero turn)
    n('kn_r1', 'kn_r', 1, '🌀', 'ทวนวน', 3, (lv) => `ทุก ${T.sweepEvery} เทิร์น กวาดทวนฟรีใส่ทุกตัว ${r1(T.sweep * lv)}x P.ATK + HP สูงสุด`, (lv) => ({ j2Sweep: T.sweep * lv })),
    n('kn_r2', 'kn_r', 2, '💨', 'เหวี่ยง', 3, (lv) => `กวาดทวนดันเกจมอน −${r1(T.sweepPush * lv)}`, (lv) => ({ j2SweepPush: T.sweepPush * lv })),
    n('kn_r3', 'kn_r', 3, '⚡', 'ทวนเร็ว', 3, (lv) => `กวาดทวนฆ่าได้ตัวละ เกจเรา +${r1(T.sweepGauge * lv)} (ไม่เกิน 1 เทิร์น)`, (lv) => ({ j2SweepGauge: T.sweepGauge * lv })),
    n('kn_r4', 'kn_r', 4, '🌪️', 'พายุทวน', 1, () => `กวาดทวนทุบเกราะ ${T.sweepBreak} เทิร์น + มึน ${pc(T.sweepStun)} (บอส/มินิ: ดันเกจ)`, () => ({ j2SweepStar: 1 })),
  ],
  talents: [],
}
