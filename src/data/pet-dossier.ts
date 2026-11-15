import type { PetId } from './jobs2'

/** UI dossier & Partner Passive Stance copy for Beastmaster pets (docs/design/beastmaster-tree-rework-spec.md §4.2). */
export interface PetDossierEntry {
  name: string
  title: string
  roleTag: string
  stanceName: string
  stanceDesc: string
  critReaction: string
  packContribution: string
  activeBadge: string
  inactiveBadge: string
}

export const PET_DOSSIER_I18N: Record<PetId, PetDossierEntry> = {
  hawk: {
    name: '🦅 เหยี่ยวเวหา',
    title: 'เจ้าเวหาสายนก RO',
    roleTag: 'โอกาสออกตาม LUK · แรงจาก INT (M.ATK) · ทะลุ DEF 🏷️',
    stanceName: '🏹 สถิตเวหา (Skyhunter Stance)',
    stanceDesc:
      'เพิ่ม LUK +15 (ขยายเพดานนกโฉบ 75%), HIT +15 (+0.25*DEX), Crit +6%\nแปลง 20% DEX เสริมพลังนก · ตีเป้า 🏷️ เมิน Flee และคริแรง +18%',
    critReaction: '⚡ โฉบ RO True DMG (หลักจาก INT/M.ATK ทะลุ DEF/MDEF) + แปะ 🏷️ Mark 2 เทิร์น',
    packContribution:
      'โอกาสโฉบขึ้นกับ LUK · ดาเมจหลักมาจาก INT/M.ATK ทะลุเกราะ 100% · ฮิตที่ 3 ติด 🙈 ตาบอด · แปะ Mark สั่งหมาป่าลุยทันที',
    activeBadge: '✅ คู่หูพรานประจำการ',
    inactiveBadge: '🐾 สัตว์ร่วมฝูง (กดเลือกเป็นคู่หูหลัก)',
  },
  boar: {
    name: '🐗 หมูป่าศิลา',
    title: 'ปราการพิทักษ์พงไพร',
    roleTag: 'แทงค์ผู้พิทักษ์ · แบ่งดาเมจ 🛡️ · แรงฮึด 💢',
    stanceName: '🏹 สถิตศิลา (Iron Tusk Stance)',
    stanceDesc:
      'เพิ่ม P.DEF +15% (+0.35*VIT) และเพิ่มการรับแทนเป็น 45%\nเพิ่มความหนาของโล่ +20% · เมื่อ Rage เต็ม 100 ฮีโร่ได้โล่ 8% HP',
    critReaction: '⚡ พุ่งชนเป้าหน้าสร้างดาเมจหนัก ผลักเกจศัตรู -20 และมอบโล่ 5% HP ให้ฮีโร่',
    packContribution:
      'แบ่งรับดาเมจแทนฮีโร่และลดทอนเข้าตัว · สะสมเกจ Grit พุ่งชน Stun · สลบแล้วฟื้นเองได้',
    activeBadge: '✅ คู่หูพรานประจำการ',
    inactiveBadge: '🐾 สัตว์ร่วมฝูง (กดเลือกเป็นคู่หูหลัก)',
  },
  wolf: {
    name: '🐺 หมาป่าโลหิต',
    title: 'มัจจุราชเขี้ยวทมิฬ',
    roleTag: 'DPS ต่อเนื่อง · เลือดไหล 🩸 · ขย้ำปลิดชีพ 🦷',
    stanceName: '🏹 สถิตเขี้ยวอำมหิต (Bloodpack Stance)',
    stanceDesc:
      'เพิ่ม P.ATK +10% (+0.30*AGI) และดาเมจ Bleed แรงขึ้น +25%\nดูดเลือด 4% เมื่อตีศัตรูที่มี Bleed 3+ ชั้น · ขยาย Frenzy เป็น 7 สแตก',
    critReaction: '⚡ กระโจนกัดเป้าหมายทันที แปะ Bleed +2 ชั้น และเร่งเกจตัวเอง +50%',
    packContribution:
      'กัดศัตรูตามรอบความเร็วและช่วยกัดตอนฮีโร่คอมโบ · ขย้ำคริ 100% และฮีลทีมเมื่อเป้าติด Mark',
    activeBadge: '✅ คู่หูพรานประจำการ',
    inactiveBadge: '🐾 สัตว์ร่วมฝูง (กดเลือกเป็นคู่หูหลัก)',
  },
}
