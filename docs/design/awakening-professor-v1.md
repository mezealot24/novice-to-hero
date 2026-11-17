# 🎓 Awakening: Sage → Professor v1

> Q 2026-11-17 (แผน grill Q1–Q8 + "สร้าง class 3 sage") · framework เดียวกับ ⚜️ Paladin / 🪓 Warlord
> โค้ด: `src/data/jobs3.ts`, `src/data/trees3/professor.ts`, `KIT3.professor` + helper ใน `src/data/skill-math.ts`, `BattleScene.ts` (บล็อก 🎓 Professor) · test: `tests/jobs3.test.ts`

## 0. สรุปสั้น (so what)

- Sage (Job2 Lv 50 + Master Trial) ตื่นรู้เป็น **🎓 Professor** ได้แล้ว
- จุดอ่อน Sage (ธาตุรองโดนหัก) → แกนใหม่: **🏷️ ตราธาตุ → ⚗️ Reaction**
- Mana เหลือช่วงเลท → **🔁 Double Casting** (ทุก reaction) + **💎 Soul Burst** (เผาทีเดียว)
- **ไม่มีโหนด stat ดิบ** (test บังคับ)
- **ตัด ✨ Arcane** ออกจากหน้าเลือกธาตุของ Sage/Professor (Mage + Wizard ไม่แตะ)

## 1. Kit

| ส่วน | ผล |
|---|---|
| 🎓 Signature **Double Casting** | ปลดตราธาตุ + reaction · perk ธาตุรอง 65% → **85%** · Mana ≥ 70%: reaction จ่าย Mana 6 ยิงซ้ำ 50% (ยิงซ้ำไม่ซ้ำต่อ) |
| 💎 Ult วิวัฒน์ 2 **Soul Burst** | Dispell + ขโมย Mana → เผา Mana ทั้งหมด: ตัวหน้าโดน P.ATK 2.2x + พลังเวท (1.2 + 0.04 × Mana ที่เผา)x · จุดตราทุกตัว (ตัวไม่มีตรา = แปะตรา Endow) · root ใย 3 คูณ |
| 👊 Skill 3 A **Spell Fist** | Endow ยังอยู่ + ตีปกติ 3 ครั้งถัดไปหมุน 🔥→⚡→❄️ · reaction ของหมัดแรง +2%/แต้ม 📖 `sg_a` (cap 20%) |
| 🌋 Skill 3 B **Elemental Field** | Endow ยังอยู่ + ทุ่งธาตุ Endow 3 pulse (ตอนร่าย + ต้นเทิร์น 2 ครั้ง) แปะตราทุกตัว · reaction ของทุ่งแรง +2%/แต้ม สาย perk ธาตุ Endow (cap 20%) |
| 🔀 Hybrid | ยืมใย **Wizard** ชั้น 1–2 |

### 1.1 ตราธาตุ
- แหล่ง: Auto Spell · Fire Bolt · Chain Lightning · Permafrost · ตีประชิดขณะ Endow · Spell Fist · Field · Soul Burst
- มอน 1 ตัว = 1 ตรา (`m.mark`) อยู่ 2 เทิร์นมอน · ธาตุเดียวกัน = รีเฟรช · ธาตุต่าง = reaction แล้วตราหาย
- reaction เองไม่แปะตรา (`reacting` guard)

### 1.2 Reaction (ช่อง spellCrit · Endow คูณ 1 ครั้ง)

| คู่ | Reaction | ผล |
|---|---|---|
| 🔥+❄️ | ♨️ Vaporize | ตัวเดียว 2.0x Pm · เป้าแช่แข็ง ×1.5 แล้วปลด freeze |
| 🔥+⚡ | 💥 Overload | ทุกตัว 0.9x Pm + เกราะแตก 1 เทิร์น |
| ⚡+❄️ | 🧲 Superconduct | 1.0x Pm + DEF/M.DEF −25% (sunder) 2 เทิร์น + เกจบอส −15 |

## 2. ใยชั้น 3 (`pf_*` = save data ห้าม rename)

| สาย | T1 | T2 | T3 | ★ |
|---|---|---|---|---|
| ⚔️ ตำนาน | 🔥 ตำราเพลิง (เผา +1 / 3 แต้ม `sg_f`, max Lv) | ⚡ ตำราอัสนี (Superconduct ชิ่ง +1 / 4 แต้ม `sg_l`) | ❄️ ตำราเยือกแข็ง (Permafrost +1 / 3 แต้ม `sg_i`) | 👑 สืบสาน |
| ⚗️ ลูกโซ่ | 🏷️ ตราฝังลึก | 💥 ลูกโซ่ธาตุ | 🎯 จุดอ่อนธาตุ | 🔺 สมการตรีธาตุ |
| 📚 ศาสตราจารย์ | 💧 Soul Change | 📜 Memorize | 🔁 Double Casting ลึก | 🔮 Foresight |

## 3. ตัวเลขที่ตุ๊กตาเลือกเอง (แผนเว้นไว้ · ปรับได้ใน `KIT3.professor`)

| เรื่อง | ค่า | เหตุผล |
|---|---|---|
| 💧 Soul Change | 1 Mana ล้น = โล่ `2.2 × 0.5 × Lv` | อิง `rodVitShield` ตามแผน · Lv 3 ≈ 3.3/Mana |
| 👑 สืบสาน A | ฮิตที่ 3 → reaction ที่เกิดจากหมัดนั้นคริแน่ | ตอนหมัดโดนแล้วค่อยรู้ธาตุ เลยคริที่ reaction |
| ⚡ ตำราอัสนี | ใช้กับ Superconduct (Overload โดนทุกตัวอยู่แล้ว) | กันซ้อนซ้ำ |
| ❄️ ตำราเยือกแข็ง | Permafrost ไม่เกิน 3/4 | ให้การแตกเป็นหน้าที่ perk เดิม |
| 🔮 Foresight | วัด Mana ก่อนจ่ายค่า Ult | ตามแผน "ใช้ตอน Mana ≥ 90%" |
| Skill 3 | Endow ยังร่ายตามปกติ + variant ซ้อน | ให้โหนด `sg_e*` / Memorize / Endow amp ยังมีผล |
| 📜 Memorize | ให้แค่ Endow (ไม่เปิด Spell Fist / Field) | variant เปิดตอนร่าย Skill 3 จริงเท่านั้น |
| แรง variant (+2%/แต้ม) | คูณเฉพาะ reaction ที่เกิดจากหมัด / pulse ของทุ่ง | ไม่ไปคูณ reaction จาก perk อื่น |
| `JOB3_K.professor` | 1.32 | เท่าคลาส 3 อื่นตอนนี้ · รอผล bot |

## 4. ผล bot
- [ ] ยังไม่รัน (เครื่อง Q) · คำสั่งอยู่ในข้อความใน thread / ข้างล่าง

`tools/bot-lite.sh` (Git Bash · ทีละงาน · default CRAFTED=1 EXTRA=1 REFINE=7 · D=10 = Base 85) · 😈 ใช้ `HARD=hell`

```bash
HARD=1 JOB2=sage J2LV=50 J2T='<ดูข้อ 5>' tools/bot-lite.sh 10 3 mage
SKIP_BUILD=1 HARD=1 JOB2=sage J2LV=50 J2T='<ดูข้อ 5>' JOB3=professor J3V=a tools/bot-lite.sh 10 3 mage
SKIP_BUILD=1 HARD=1 JOB2=sage J2LV=50 J2T='<ดูข้อ 5>' JOB3=professor J3V=b tools/bot-lite.sh 10 3 mage
```

## 5. J2T สำหรับเทียบ (49 แต้ม · มี perk ครบ 3 ธาตุ)
preset Sage เดิมใน bot ไม่มีแต้ม perk เลย → ไม่มี reaction · ใช้ชุดนี้ทั้ง Sage และ Professor:
`{"sage_s3p":5,"sage_u2p":5,"sg_a1":5,"sg_a2":5,"sg_f1":5,"sg_f2":4,"sg_l1":5,"sg_l2":4,"sg_i1":5,"sg_i2":4,"sg_e1":2}`

## 6. ยังไม่ทำ (แยกงาน · Q-A)
- [ ] สูตร class-craft + ไอเท็ม unique ของ Professor (ตอนนี้ดรอปแค่ชุด Awakening กลาง)
- [ ] ร่าง/ชุด Professor (ตอนนี้ออร่าม่วง + afterimage ม่วง)
- [ ] VFX reaction เฉพาะ (ตอนนี้ pixelfx เดิม + tint · Q-B)
- [ ] ตัวเลข reaction บนหน้า skill info
- [ ] Q playtest + calibrate `JOB3_K.professor`
