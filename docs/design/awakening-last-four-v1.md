# 🥷🎩🌌🤖 Awakening: 4 อาชีพสุดท้าย v1

> Q 2026-11-19 "yolo awakening class" · ใช้ framework เดียวกับ ⚜️ Paladin / 🐉 Lord Knight (`docs/design/awakening-crusader-v1.md`, `awakening-lordknight-v1.md`)
> โค้ด: `src/data/jobs3.ts`, `src/data/trees3/{stalker,kingpin,highwizard,mechanic}.ts`, `KIT3.*` ใน `src/data/skill-math.ts`, battle hook ใน `src/scenes/BattleScene.ts` · test: `tests/awakening-last-four.test.ts`

## 0. สรุปสั้น (so what)

- อาชีพขั้น 2 **ครบทั้ง 10 อาชีพมี Awakening แล้ว** (เดิมขาด Rogue / Mobster / Wizard / Innovator ขึ้นปุ่ม "🔒 ขั้น 3 เร็วๆ นี้")
- เงื่อนไขปลดล็อกเหมือนเดิมทุกอย่าง: Job2 Lv 50 + เคลียร์ดัน 10 + Master Trial (D10 🔥 / 😈 ที่เคยเคลียร์นับให้)
- ไม่มี save key ใหม่ ไม่มี migration: `save.job3` แค่รับ id ใหม่ 4 ตัว
- หลักออกแบบ: **กลไกบนคิตเดิม ไม่ใช่บวกสเตตัสดิบ** · variant ละ 2 แบบ (หมู่ / เดี่ยว) · ตัวเลขอยู่ในกรอบ Awakening เดิม (variant +2%/แต้ม เพดาน 20%, legacy เพดาน 15% / 9%, `JOB3_K` 1.32)

## 1. แต่ละอาชีพได้อะไร

| | 🥷 Stalker (Rogue) | 🎩 Kingpin (Mobster) | 🌌 High Wizard (Wizard) | 🤖 Mechanic (Innovator) |
|---|---|---|---|---|
| Signature | **Preserve**: ตราคมมีดสูงสุด +2 · ตรานาน +1 เทิร์น · มีดโดนตัวตราเต็ม = Energy +3 | **Loan Shark**: หนี้ 1 ก้อน = ดาเมจฮิต +2.5% (นับสูงสุด 6) · Execute = Energy +10 | **Mystical Amplification**: Storm Gust / Ult ลงแล้ว = Amplify 2 เทิร์น เวท +12% · ระหว่างชาร์จโดนแรงขึ้นแค่ครึ่งเดียว | **Overclock**: กับดักต้นเวฟ +1 · กับดัก/หุ่นจิ๋ว +15% · ใช้กล่องสุ่ม = ความเร็ว +15% 2 เทิร์น |
| ✨ Ult วิวัฒน์ 2 | **Phantom Storm**: พายุมีดจบ → มีดเล็ง 3 เล่ม (1.2x ของมีดพายุ) ใส่ตัวตรามากสุด | **Hostile Takeover**: ทวงหนี้จบ → ฟันซ้ำทุกตัวที่รอด 0.5x (+10%/หนี้) แล้วเช็ก Execute อีกรอบ | **Gravitation Field**: มหาเวทจบ → บดทุกตัว 0.7x Pm ข้าม M.DEF 30% + ผลักเกจบอส | **Arm Cannon**: สิ่งประดิษฐ์จบ → มิสไซล์ 4 ลูก 0.9x (ตัวเปียก/ช้า +25%) |
| ทักษะ 3 แบบ A (หมู่) | 🌀 **Fan of Knives**: กรีดทุกตัว 1.0x คริแน่นอน + ตรา +1 ทุกตัว (สาย 🔪 มีด) | 💰 **Shakedown**: ฟันทุกตัว 0.8x + เกราะแตก + ช้าทั้งแถว (สาย ⛓️ ดีบัฟ) | ❄️ **Frost Nova**: Storm Gust +1 ฮิต · ตัวติดช้า/แช่แข็ง +25% (สาย ❄️) | 🚀 **Rocket Barrage**: กล่องเดิม + จรวด 3 ลูก 0.8x (สาย 🎲 ประดิษฐ์) |
| ทักษะ 3 แบบ B (เดี่ยว) | 🎯 **Assassinate**: บอสก่อน 2.6x ข้าม DEF 50% · ฆ่าได้ = คูลดาวน์คืน (สาย 💥 คริ) | 📜 **Hit Contract**: บอสก่อน 2.0x + พิษ +3 + อ่อนแรง 20% (สาย 🧪 พิษ) | ⚡ **Jupitel Thunder**: บอสก่อน 6 ลูก x0.7 Pm ผลักเกจทุกลูก (สาย ⚡) | 🏰 **Fortress Mode**: กล่องเดิม + หุ่นจิ๋ว 1 ตัว + โล่ 10% HP (สาย 🤖 ป้อมปืน) |
| Hybrid ยืมใย | Mobster ชั้น 1–2 | Rogue ชั้น 1–2 | Sage ชั้น 1–2 | Beastmaster ชั้น 1–2 |

- Back Stab ของ Stalker ยังใช้ Combo Point + Shadow Ambush เหมือนเดิม (variant แค่เปลี่ยนรูปแบบฮิต)
- ❄️ Ult ธาตุน้ำแข็งของ Wizard (Storm Gust ฟรี) **ไม่**ใช้ variant: variant ผูกกับทักษะ 3 เท่านั้น
- crit rule เดิม: สกิลกายภาพคริได้ด้วย `skillCrit` เท่านั้น ยกเว้นท่าที่ระบุว่าคริแน่นอน (Fan of Knives / Assassinate สืบจาก Back Stab) · ไม่มีคริข้าม DEF

## 2. ใยชั้น 3 (`sk_*` `kp_*` `hw_*` `mc_*` = save data ห้าม rename)

ทุกอาชีพ: root `<id>_u3p` (คูณเฉพาะส่วนที่ Ult วิวัฒน์ 2 เพิ่ม) + 3 สาย x 4 โหนด

| สาย | 🥷 Stalker | 🎩 Kingpin | 🌌 High Wizard | 🤖 Mechanic |
|---|---|---|---|---|
| ⚔️ ตำนาน (อ่านแต้มใยชั้น 2) | Ult ← 🔪 มีด · **FLEE** ← 🔁 คอมโบ (เพดาน 12) · HP ← 💥 คริ | Ult ← 🧪 พิษ · **เกณฑ์ Execute** ← ⚰️ เก็บงาน (เพดาน 3%) · HP ← ⛓️ ดีบัฟ | Ult · **M.DEF** (เพดาน 6%) · HP ← สายธาตุที่ลงมากสุด | Ult ← 🎲 · **กับดักแรง** ← 💣 (เพดาน 30%) · HP ← 🤖 |
| สาย Ult | 👻 ภูตมีด: ฮีลต่อมีด · พรหลังศึก · มีดข้าม DEF · ★ +2 เล่ม | 🏦 ยึดกิจการ: ฮีลต่อตัว · พรหลังศึก · ดอกเบี้ย +0.75%/Lv · ★ ฟันอีกรอบ | 🌌 แรงโน้มถ่วง: Soul Drain (Mana) · พรหลังศึก · ข้าม M.DEF · ★ อีกระลอก | 🚀 ปืนใหญ่: Repair ฮีล · พรหลังศึก · หัวรบเจาะเกราะ · ★ +2 ลูก |
| สายตัวตน | 🌑 ย่องเงา: Ambush ปามีดเปิดไฟต์ · Tunnel Drive · คริ · ★ Hide (หลบ 50%) | 🕴️ แก๊ง: ค่าคุ้มครอง (พิษ+ช้าเปิดไฟต์) · บอดี้การ์ด · พิษ/คริ · ★ Untouchable | 🔮 ขยายเวท: Fire Pillar เปิดไฟต์ · Energy Coat · Amplify +4%/Lv · ★ Safety Wall | ⚙️ Overclock: Deploy กับดักเปิดไฟต์ · Neutral Barrier · เร่งเครื่อง +5%/Lv · ★ Auto-Repair |

- legacy "guard" ของ 4 อาชีพนี้ **ไม่ลง Auto Guard** (ไม่เข้าธีม) แต่ลงสเตตัสของคลาสเองตามตาราง
- ★ สืบสาน (สายของ variant ≥ 6 แต้ม): Fan ตรา +2 + Strip ทุกตัว / Assassinate ไม่ตายก็ CD -1 · Shakedown + อ่อนแรง / Hit Contract ฟัน 2 ครั้ง · Frost Nova +1 ฮิตอีก / Jupitel ลูกสุดท้ายมึน · Rocket +2 ลูก / Fortress +1 หุ่น

## 3. ผล bot (cloud, D10 ปกติ, GEAR+EXTRA+CRAFTED REFINE=7, Job2 Lv 50, ใยชั้น 3 preset 29 แต้ม, 2 รอบ/แบบ = smoke เท่านั้น)

| | ขั้น 2 | Awakening A | Awakening B | Hero Power |
|---|---|---|---|---|
| Rogue → Stalker | 2/2 | 1/2 | 2/2 | 1173 → 1511 (+29%) |
| Mobster → Kingpin | 0/2 | 1/2 | 2/2 | 955 → 1213 (+27%) |
| Wizard → High Wizard | 0/2 (ตายห้อง 1) | 0/2 · D7: 1/2 | 0/2 · D7: 1/2 | 752 → 1008 (+34%) |
| Innovator → Mechanic | 2/2 | 2/2 | 2/2 | 997 → 1344 (+35%) |

- ทุกรอบ `errors: 0` · เทียบ Awakening เดิม profile เดียวกัน: Lord Knight +25%, Warlord +29%, Ranger +24%, Professor +21%
- High Wizard / Mechanic กระโดดสูงกว่าเพื่อนนิดหน่อย (โหมด 🔥 มอนสเกลตาม power อยู่แล้ว) · รอ Q playtest ก่อนขยับ `JOB3_K` (ห้าม nerf จาก bot 2 รอบ)
- Wizard profile ของ bot บางเกินสำหรับ D10 ทั้งก่อนและหลังตื่นรู้: ไม่ใช่ผลจาก PR นี้

คำสั่ง (รันทีละตัวบนเครื่อง Q):

```
HARD=1 JOB2=rogue J2LV=50 JOB3=stalker J3V=a tools/bot-lite.sh 10 3 thief
HARD=1 JOB2=mobster J2LV=50 JOB3=kingpin J3V=b tools/bot-lite.sh 10 3 thief
HARD=1 JOB2=wizard J2LV=50 JOB3=highwizard J3V=a tools/bot-lite.sh 10 3 mage
HARD=1 JOB2=innovator J2LV=50 JOB3=mechanic J3V=b tools/bot-lite.sh 10 3 archer
```

## 4. ยังไม่ทำ

- [ ] Q playtest + จูน `JOB3_K` / ตัวเลข variant
- [ ] Unique ขั้น 3 เฉพาะอาชีพ (ตอนนี้ดรอปชุด Awakening กลางเหมือน Professor)
- [ ] Costume / VFX เฉพาะ (ตอนนี้ใช้ร่างเดิม + ออร่าสี, VFX ยืมของเดิม)
- [ ] ทาเลนต์ชั้น 3
