# Endgame Content หลัง D10 (research, 2026-11-08)

> โจทย์จากคิว: เคลียร์ D10 แล้ว แต่ Job Lv ยังไม่ตัน → หลัง D10 ควรมี content อะไร

## TL;DR

- **ปัญหาจริงไม่ใช่ "EXP ช้า"** แต่เป็น **"เคลียร์ D10 แล้วไม่มีเป้าให้ฟาร์ม D10 ซ้ำ"**
- โหมด endgame ที่มีอยู่ (🗼 หอคอย / 🎲 รายวัน) **ใช้แค่มอน D2–D5** → มอน D6–D10 ไม่ได้ถูกใช้ซ้ำเลย
- **ยังไม่ควรทำ D11** — ทำ loop ที่ใช้ของเดิม (D6–D10) ก่อน คุ้มกว่ามาก
- ลำดับแนะนำ: ① ขยายหอคอย/รายวันไป D6–D10 → ② บอสประจำสัปดาห์ + Bounty → ③ ระดับฝันร้าย (Heat) → ④ บททดสอบ Job2 Lv 50

---

## 1. ช่องว่างใหญ่แค่ไหน (คำนวณจากโค้ด)

| รายการ | ค่า | ที่มา |
|---|---|---|
| EXP ต่อ Job Lv | `20 + 10 × (lv − 1)` | [meta.ts:54](../../src/data/meta.ts) |
| Job2 max | Lv 50 (แต้มใยชั้น 2 = 49) | [jobs2.ts:25](../../src/data/jobs2.ts) |
| EXP รวม Job2 Lv 1 → 50 | **12,740** | คำนวณ |
| EXP Job2 Lv 30 → 50 | 8,100 | คำนวณ |
| EXP Job2 Lv 40 → 50 | 4,550 | คำนวณ |
| EXP ต่อรอบ D10 ปกติ (ประมาณ) | **~380** (มอน 14 ตัว ~310 + mini 39 + clear ห้องละ 6) | [d10.ts](../../src/data/dungeons/d10.ts) |
| มนุษย์ | ×1.1 | `RACES.human.expMul` |
| Hard / Corruption | คูณ EXP เพิ่มอยู่แล้ว | [BattleScene.ts settle()](../../src/scenes/BattleScene.ts) |

**แปลว่า:** Job2 Lv 30 → 50 ≈ **~21 รอบ D10 ปกติ** · Lv 40 → 50 ≈ **~12 รอบ**

- ตัวเลขนี้ **ไม่โหด** สำหรับเกมแนว grind (RO ฟาร์มหนักกว่านี้มาก)
- แต่ถ้าแต่ละรอบ "เหมือนเดิมเป๊ะ" ผู้เล่นจะเบื่อก่อนตัน → ต้องมี **เหตุผลให้กลับมาเล่น** ไม่ใช่แค่ลด EXP curve

> ⚠️ ข้อสังเกต balance: design บอก Job2 Lv 50 ใยเต็ม ≈ +40–50% power
> คิวเคลียร์ D10 ได้ก่อนตัน = D10 อาจง่ายกว่าที่ตั้งใจ (ตรงกับ memory: bot ประเมินผู้เล่นต่ำไป) — **อย่าเพิ่ง nerf จากข้อนี้อย่างเดียว**

### 1.1 อัปเดตจากเซฟคิว (Crusader · Base 44 · Job2 Lv 35 · Hero Power 825)

| เป้า | EXP ที่ขาด | ≈ รอบ D10 ปกติ |
|---|---|---|
| **Job2 35 → 50 (ตัน)** | **6,450** | **~17** (Hard/Corruption น้อยกว่านี้) |
| Base 44 → 99 | 59,125 | ~155 |

- Base กับ Job ได้ EXP ก้อนเดียวกัน → ทั้งสาย Job (Novice 10 + อาชีพแรก 40 + Job2 50 = 21,470 EXP) **ตันที่ประมาณ Base Lv 53**
- 🚨 **D10 ออกแบบไว้ที่ Lv 80–90 แต่คิวผ่านที่ Base 44** → เลเวลตามหลัง content ~2 เท่า
- ถ้าผู้เล่นเลเวลถึง band จริง Job2 จะตันตั้งแต่ราว D7 → ปัญหาคือ **ผ่านดันได้โดยไม่ต้องฟาร์ม** ไม่ใช่ curve Job ยาวเกิน
- D7 (band 50–60) คิวผ่านที่ Base 43 → จาก D7 ถึง D10 ได้แค่ +1 Base Lv = เล่นน้อยรอบมาก ไม่ต้องฟาร์ม
- ความแกร่งมาจากเกียร์/การ์ด ไม่ใช่เลเวล → **ตัวเลข level band ของดันไม่ได้สะท้อนความยากจริง**

| ทางแก้ | ผลดี | ผลเสีย |
|---|---|---|
| ก) เพิ่ม EXP มอน D6–D10 | เลเวลไล่ทัน band | ผู้เล่นยิ่งแกร่ง D10 ยิ่งง่าย |
| ข) คง curve + ทำ loop ①–② | ฟาร์ม Lv 44→99 มีที่ไป | ต้องทำ mode ใหม่ |
| ค) ข + EXP โบนัสเคลียร์ครั้งแรกต่อดัน | จบ D10 ใกล้ Job ตัน + มี loop ต่อ | แตะ 2 ระบบ |

---

## 2. เกมอื่นแก้ปัญหานี้ยังไง

| เกม | ระบบ endgame | บทเรียนสำหรับเรา |
|---|---|---|
| **Hades** | Pact of Punishment: เลือกเงื่อนไขยากเอง (Heat) ได้ Bounty ต่ออาวุธ × ระดับ Heat | ผู้เล่น **เลือกความยากเอง** + รางวัลครั้งแรกต่อ combo = ฟาร์มซ้ำมีเป้า · นักพัฒนา balance ถึงแค่ Heat ~40 → **ไม่ต้อง balance ทุกระดับ** |
| **Capybara Go** | Star Challenge (เล่นบทที่ผ่านแล้วซ้ำเอาเพชร), Dreamland (run + checkpoint), event หมุนเวียน 7 วัน | ใช้ content เก่า + รางวัล milestone + หมุนเวียนตามรอบเวลา |
| **Ragnarok Online** | ไล่ Job 50/70, MVP boss ดรอปการ์ดหายาก, instance | **การ์ดบอสหายาก** = เป้าฟาร์มระยะยาวที่คลาสสิก (เรามีการ์ดบอส D10 แล้ว) |
| **Echo Bloom** (postmortem) | endgame ว่าง บอสสุดท้ายไม่มี payoff | ⛔ ตัวอย่างความล้มเหลว — ผู้เล่นที่ไปถึงท้ายเกมคือคนที่น่าเก็บไว้ที่สุด |
| **Destiny 2** (คำวิจารณ์) | modifier ตายตัว → ทุกรอบเหมือนกัน | ✅ **หมุน modifier รายสัปดาห์** ให้แต่ละสัปดาห์รู้สึกต่าง |

---

## 3. ไอเดีย Content (เรียงตามความคุ้ม)

| # | Content | ทำอะไร | ใช้ของเดิม | ขนาด |
|---|---|---|---|---|
| ① | **หอคอยตามดันที่เคลียร์** (แก้ 2026-11-08) | ธีมหอคอย = 5 ดันสูงสุดที่เคลียร์แล้ว (เคลียร์ D10 → ชั้น 1–10 D6 … 41+ D10) · ความยากเท่าเดิม (scale ตาม Hero Power อยู่แล้ว) · ได้ EXP/mats ของดันสูง · `DAILY.pool` เพิ่ม D6–D10 | 100% (มอน/การ์ด/mats) | **S–M** |
| ② | **👹 บอสประจำสัปดาห์ + Bounty** | บอส D6–D10 หมุนทุกสัปดาห์ + mutator 1 ตัวตายตัว · เคลียร์ครั้งแรกของสัปดาห์ = เพชร + mats บอส + โอกาสการ์ดบอส | seed แบบ `dailySeed` + `MUTATORS` | **S–M** |
| ③ | **🌑 ระดับฝันร้าย (Heat)** | ผู้เล่นเลือก mutator/corruption ซ้อนเองบน D6–D10 · แต่ละระดับ = EXP/zeny/mats เพิ่ม · Bounty ครั้งแรกต่ออาชีพขั้น 2 × ระดับ | `mutators.ts` + `corruptions.ts` มีอยู่แล้ว · อยู่ใน "Later" ของ game-modes-v1 | **M** |
| ④ | **⚔️ บททดสอบปรมาจารย์ (Job2 Lv 50)** | ปลดที่ Job2 Lv 50: ดวลกับ "เงาของตัวเอง" (copy stat/สกิลผู้เล่น) · รางวัล: ฉายา + ★ ดวงพิเศษ / สีชุด | 1v1 arena (สังเวียน mini) มีแล้ว | **M** |
| ⑤ | **💀 Boss Rush D6–D10** | บอส 5 ตัวต่อกัน HP ไม่เต็ม · จับเวลา/เทิร์น ทำสถิติ | gauntlet ของหอคอยมีแล้ว | **M** |
| ⑥ | **D11 ดันใหม่** | มอนใหม่ 6–8 ตัว + บอส + การ์ด + art | ต้องทำใหม่หมด | **L** |
| ⑦ | **หลังตัน: Master Lv (แบบ Paragon)** | Job2 Lv 50 แล้ว EXP ไม่สูญ → แต้มเล็ก ๆ ไม่จำกัด (เช่น +0.5% stat ต่อ Lv) | ระบบ EXP เดิม | **S** แต่ **ทำทีหลัง** |

### ทำไม ① ต้องมาก่อน

- ตอนนี้หลัง D10 ผู้เล่นมีแค่ 2 ทาง: เล่น D10 ซ้ำ หรือหอคอยที่เป็นมอน D2–D5 (ไม่ตื่นเต้น)
- **คิวยังผ่านชั้น 30 ไม่ได้ (Base 44, HP 825)** → หอคอยคือ content ที่ยากที่สุดสำหรับคิวตอนนี้ แต่รางวัลอ่อนที่สุด:

| | หอคอยตอนนี้ (ธีม D2–D5) | D10 |
|---|---|---|
| ความยาก | scale ตาม Hero Power → ยากจริง | band ตายตัว |
| EXP ต่อมอน | 3–14 (บอสย่อย ~22) | 20–25 (mini 39) |
| mats | D2–D5 (ไม่มีค่าแล้ว) | D10 |

- → ย้ายธีมให้ตามความคืบหน้า = ความยากเท่าเดิม แต่รางวัลคุ้ม → ฟาร์ม Job2 ในหอคอยได้
- ⚠️ ต้องเช็ก `towerScale` / `matchScale` กับมอน D6+ ที่เป็น stat monster (mon-stats.ts) · ⚠️ save เก่า: bestFloor/checkpoint ไม่กระทบ (ธีมไม่ได้เก็บใน save)

### ทำไมไม่ทำ D11 ก่อน

| | D11 ใหม่ | Loop ①–③ |
|---|---|---|
| แรงที่ลง | สูง (art + มอน + การ์ด + balance) | ต่ำ (data + mode) |
| เล่นได้นานกี่รอบ | ~10–20 รอบแล้วเจอปัญหาเดิม | ไม่จำกัด |
| แก้ปัญหา "ไม่มีเป้า" | ❌ แค่เลื่อนออกไป | ✅ ตรงจุด |

---

## 4. แผนทำ (ถ้าคิวอนุมัติ)

1. **v114** · ① ธีมหอคอยตามดันที่เคลียร์ (5 ดันสูงสุด) · รายวันเพิ่ม pool D6–D10
2. **v115** · ② บอสประจำสัปดาห์ (seed รายสัปดาห์ + reward ครั้งแรก)
3. **v116+** · ③ ระดับฝันร้าย — ต้องมี design doc แยก (เลือก mutator อะไรบ้าง, ตัวคูณรางวัล)
4. **รอ** · ④ ⑤ ⑦ หลังมีคนอื่นเล่นถึง D10 แล้วเก็บ feedback
5. **ยังไม่ทำ** · ⑥ D11

---

## 5. คำถามถึงคิว

1. ตอนนี้ **Job2 Lv เท่าไหร่** และ Base Lv เท่าไหร่? (ใช้ประเมินว่าช่องว่างจริงกี่รอบ)
2. อยากให้ **Job2 ตันประมาณตอนไหน**: ก) พร้อม D10 ข) หลัง D10 อีกสักพัก (เป็น post-game grind) — ตุ๊กตาแนะนำ **ข** + ทำ loop ①–②

---

## อ้างอิง

- Hades Pact of Punishment / Heat / Bounty: [rpgsite](https://rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards) · [Kotaku endgame](https://kotaku.com/everything-you-need-to-know-about-hades-endgame-1845239105) · [Meta-progression](https://saschb2b.github.io/game-mechanics/games/hades/meta-progression)
- Capybara Go: [Star Challenge](https://theriagames.com/?p=90678) · [Dreamland Challenge](https://theriagames.com/?p=85174) · [Growth Events](https://theriagames.com/?p=75018)
- Ragnarok Online: [MVP hunting](https://guildorder.com/es/games/ragnarok_online/wiki/mvp-hunting-and-guild-farming) · [mein-mmo class system](https://mein-mmo.de/mmorpg-ragnarok-online-bestes-klassen-system/)
- Retention / endgame: [Roguelike early access postmortem (Echo Bloom)](https://www.wayline.io/blog/roguelike-early-access-retention-postmortem) · [Destiny 2 rotating modifiers](https://www.playstationlifestyle.net/?p=852656) · [Progression systems (cadence)](https://skillselion.com/skills/omer-metin/skills-for-antigravity/progression-systems) · [Revenant Survivors boss progression](https://www.fixgamingchannel.com/fix-stories-revenant-survivors-boss-progression/)
- ⚠️ แหล่งส่วนใหญ่เป็น guide/บล็อก ไม่ใช่ข้อมูล retention ที่วัดจริง — ใช้เป็นแนวคิด ไม่ใช่ตัวเลข
