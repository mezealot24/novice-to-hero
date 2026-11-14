# Expansion D11–D13 · Awakening Dungeons (design v1, 2026-11-14)

> สถานะ: **design only** · ยังไม่มีโค้ดในเกมจริง · ต้องให้คิวตอบคำถาม §9 ก่อนเริ่ม P1

## TL;DR (so what)

- D11–D13 = **บ้านของ Job3 (Awakening)** · Lv 90 → 99 (ชน Base cap) · ต่อจาก D10 แบบ `DungeonPack` เดิม (`dungeons/d11.ts` …)
- **แต่ละดันมีกลไกเด่น 1 อย่างทั้งดัน (biome hazard)** — นี่คือของใหม่จริงๆ ส่วนมอนใช้ field ที่ engine มีอยู่แล้ว
  - D11 ⚙️ **เกจความร้อน** → เล่นสกิลเป็นจังหวะ
  - D12 🌊 **แรงดันน้ำลึก** → ฮีลลด, โล่/บล็อก = คลื่นสวน
  - D13 🌘 **ม่านดารา** → มอนมีเกราะเป็นชั้น, หลายฮิตลอกเกราะ
- ⚠️ **ไฟล์ stub เดิม `src/data/dungeons/endgame-dungeons.ts` ตัวเลขผิดสเกล** (บอส D11 HP 145,000 vs บอส D10 จริง 23,772 ≈ ×6) → ใช้แค่ธีม/ชื่อ, ทิ้งตัวเลข
- ความยาก: ใช้กฎเดิม **×1.24 ต่อ tier** (เหมือน D9 → D10)
- แผน: P0 เคลียร์ stub → P1 D11 (ไม่มี hazard) → P2 hazard engine → P3 D12 → P4 D13

---

## 1. ทำไมถึงทำตอนนี้ (กลับคำแนะนำเดิม?)

research `endgame-content-after-d10.md` เคยบอก "ยังไม่ทำ D11" เพราะ loop หลัง D10 ยังไม่มี — ตอนนี้เปลี่ยนแล้ว:

| เดิม (11-08) | ตอนนี้ |
|---|---|
| ไม่มีอะไรให้ฟาร์มหลัง D10 | หอคอย D6+ (v114–117) · รายวันลึก (v118) มีแล้ว |
| Job3 ยังไม่มี | Job3 framework (P1) มีแล้ว · Job3 Lv 1–30 **ยังไม่มีที่ฟาร์มที่เหมาะ** |
| Base Lv 90 → 99 ไม่มีเหตุผลไป | D11–D13 = ปลายทาง Lv 90–99 |

➡️ D11–D13 แก้ปัญหา "Job3 ได้แล้วไปไหนต่อ" ไม่ใช่แค่เลื่อนปัญหาเดิม

---

## 2. ภาพรวม 3 ดัน

| | D11 | D12 | D13 |
|---|---|---|---|
| id | `d11` | `d12` | `d13` |
| ชื่อ | ⚙️ นรกจักรกลนิรันดร์ | 🌊 วิหารก้นสมุทรทมิฬ | 🌘 สุริยุปราคาดาราดับ |
| Lv band | 90–94 | 94–97 | 97–99 |
| unlock | `d10` | `d11` | `d12` |
| tier | 11 | 12 | 13 |
| hazard | `clockwork_heat` | `abyssal_pressure` | `astral_eclipse` |
| ทดสอบ | จังหวะสกิล / ขัดจังหวะชาร์จ | ตั้งรับ / โล่ / อยู่รอดยาว | หลายฮิต / DoT / ลูกน้อง |
| สายที่ได้เปรียบ | Berserker · Monk · Wizard (คริ/สกิลถี่) | Crusader · Knight · Paladin · Lord Knight | Rogue · Beastmaster · Innovator · Sage |
| บอส | โครนอส · ไททันเฟืองเวลา | เลวีอาธาน · เจ้าแห่งห้วงลึก | เซราฟสุริยคราส |
| turnLimit บอส | 58 | 60 | 62 |

- **Unlock gate**: แค่เคลียร์ดันก่อนหน้า (เหมือนเดิม) — **ไม่บังคับ Job3** เพราะ Master Trial (P2 ของ Job3) ยังไม่เสร็จ → ถ้าบังคับ ไม่มีใครเข้าได้
- ต้องเพิ่ม `'d10' | 'd11' | 'd12'` ใน union `DungeonDef.unlock` (`src/data/dungeon-defs.ts:21`)

---

## 3. เป้าตัวเลข (vs D10)

กฎ: ค่า tier ละ ×1.24 (ตรงกับ D10 vs D9 คาด) · Lv ขึ้นน้อยเพราะชน 99 → ส่วนต่างต้องมาจาก `bodyMul` เป็นหลัก

| tier | D10 (จริง) | D11 เป้า | D12 เป้า | D13 เป้า |
|---|---|---|---|---|
| normal HP สูงสุด | 2,215 | ~2,750 | ~3,400 | ~4,200 |
| mini HP | 9,765 | ~12,100 | ~15,000 | ~18,600 |
| boss HP | 23,772 | ~29,500 | ~36,600 | ~45,400 |
| ดาเมจหลัก (normal) | ~476 | ~590 | ~730 | ~905 |

- ตัวเลขจริงคำนวณด้วย `statMonster` (data/mon-stats.ts) ตอน implement แล้วจด table แบบ doc D10 §"ตัวเลขที่ Lv ของห้อง"
- hazard ทำให้ยากขึ้นอีก ~10% → **ห้ามเพิ่มตัวเลขชดเชย** ให้ hazard เป็นตัวสร้างความยากแทน
- ⚠️ ต้องวัดด้วยบอทก่อน merge ทุกดัน (D10 ยังไม่ได้วัด — ควรวัด D10 ก่อนเป็น baseline)

---

## 4. Biome Hazards (กลไกใหม่)

มีโค้ด prototype ใน `src/data/biome-hazards.ts` แล้ว (ยังไม่ต่อกับ BattleScene) → **ใช้ต่อ แต่แก้ 3 เรื่อง**:

1. ย้ายตัวเลขทั้งหมดเข้า table `HAZARD_TUNING` (AGENTS.md: no magic numbers)
2. ตัวเลขบางตัวแรงเกิน (ดูตาราง)
3. เพิ่ม field `hazard?: BiomeHazardId` ใน `DungeonDef` → BattleScene อ่านจาก dungeon, ไม่ใช่ hardcode

### 4.1 D11 ⚙️ เกจความร้อน (`clockwork_heat`)

- ใช้สกิล = ความร้อน +20 · จบเทิร์น −15
- **Sweet spot 50–85**: คริดาเมจ +X · ดาเมจสกิล ×Y
- แตะ 100 = ระเบิด: เสีย HP % + ใบ้ 1 เทิร์น → รีเซ็ตเป็น 30
- HUD: แถบเกจใต้ HP ฮีโร่ มีโซนสีเขียว 50–85

| ค่า | prototype | เสนอ | เหตุผล |
|---|---|---|---|
| คริดาเมจ sweet spot | +60% | **+35%** | +60% + ดาเมจสกิล ×1.25 = burst ~×2 เกินเพดาน power |
| ดาเมจสกิล sweet spot | ×1.25 | **×1.2** | |
| ระเบิด HP | 15% | 15% | โอเค |

### 4.2 D12 🌊 แรงดันน้ำลึก (`abyssal_pressure`)

- ฮีลตรงลดลง · โล่/บล็อก/เคาน์เตอร์สำเร็จ = คลื่นน้ำ true damage ใส่ศัตรูทุกตัว

| ค่า | prototype | เสนอ | เหตุผล |
|---|---|---|---|
| ฮีลตรง | ×0.5 | **×0.7** | ×0.5 ทำ Cleric/Priest สายฮีลเล่นไม่ได้เลย |
| คลื่น true dmg | DEF×1.8 + 8% MaxHP | **DEF×1.2 + 5% MaxHP** | true dmg ทุกตัว ไม่มีเพดาน = tank ฆ่าเร็วกว่า DPS |
| cooldown คลื่น | ไม่มี | **1 ครั้ง / เทิร์นฮีโร่** | กันบล็อกรัวๆ วนคลื่นไม่จบ |

### 4.3 D13 🌘 ม่านดารา (`astral_eclipse`)

- มอนทุกตัวเริ่มมี veil N ชั้น · ชั้นละลดดาเมจ % · ฮิตละลอก 1 ชั้น (รวมลูกน้อง/DoT)
- veil = 0 → **Stagger 2 เทิร์น** (รับดาเมจ +%) → หมดแล้วฟื้น 3 ชั้น

| ค่า | prototype | เสนอ | เหตุผล |
|---|---|---|---|
| ชั้นเริ่ม | 5 | **4** (บอส 6) | สายตีหนักฮิตเดียว (Knight) ไม่ตันเกินไป |
| ลดดาเมจ / ชั้น | 15% (cap 75%) | **12% (cap 60%)** | |
| Stagger bonus | +50% | **+40%** | |

- ⚠️ ต้องเช็ก `hitCount`: สกิลหลายฮิตลอกหลายชั้นทีเดียว — ต้องนับใน damage pipeline ให้ถูก (ไม่ใช่นับ 1 ต่อ action)

---

## 5. Telegraph ชาร์จ (ขัดจังหวะได้)

ตอนนี้บอส `charge: true` + `slamName` = เตือนแล้วตีอยู่แล้ว ✅ → เพิ่มแค่ "วิธีแก้" 1 อย่างต่อดัน:

| ดัน | `counter` | ถ้าผู้เล่นทำได้ระหว่างเทิร์นชาร์จ | ถ้าไม่ |
|---|---|---|---|
| D11 | `interrupt_stun` | ทำ stun/freeze ใส่ → ชาร์จยกเลิก | ตีเต็ม |
| D12 | `shield_or_guard` | มีโล่/guard ตอนโดน → ดาเมจ ×0.5 + คลื่นสวน | ทะลุ DEF |
| D13 | `multi_hit_break` | ลอก veil จนแตก → Stagger + ชาร์จยกเลิก | ตีเต็ม |

- field ใหม่ใน `MonsterDef`: `chargeCounter?: 'interrupt_stun' | 'shield_or_guard' | 'multi_hit_break'`
- ข้อความเตือนใช้ banner เดิม + บอกวิธีแก้ (เช่น `MINI_HINT`)

---

## 6. รายชื่อมอน (โครง 6 normal + 2 mini + 1 boss ต่อดัน)

ใช้ field ที่มีแล้ว (`statAlloc` · `bodyMul` · `fixedFlee` · `reflect` · `drainStats` · `trueSight` · `razor` · `deathBlast` · `phases` …) ยกเว้นที่ระบุ 🆕

### D11 ⚙️ นรกจักรกลนิรันดร์ (Lv 90–94)

| id | ชื่อ | บทบาท | กลไกหลัก |
|---|---|---|---|
| `cogsentinel` | ทหารยามเฟือง | tank | DEF สูง · reflect 6% · โล่ทุก 4 |
| `steamflayer` | นักเชือดไอน้ำ | assassin | crit · combo · ตีโดน = ไฟ 1 |
| `boilerimp` | ภูตหม้อต้ม | skirmisher | deathBlast 1.6 · ตาย = ความร้อนฮีโร่ +10 🆕 |
| `gearspider` | แมงมุมเฟือง | skirmisher | ตีโดน = slow (เกจ −) · trueSight |
| `oilpriest` | นักบวชน้ำมัน | support (เวท) | ฮีลพวก · สาป = ความร้อน +25 🆕 |
| `ticktockwisp` | วิญญาณนาฬิกา | caster (เวท) | ใบ้ 1 ทุก 3 |
| `overdrive` (มินิ) | ออโตมาตอนโอเวอร์ไดรฟ์ | bruiser | ชาร์จ "ปลดไอน้ำหลอมละลาย" `interrupt_stun` · 50%: เร็ว ×1.3 |
| `clockmaiden` (มินิ) | ตุ๊กตาไขลาน | caster | fixedFlee 30% · 50%: ซัมมอน wisp ×2 |
| `chronotitan` (บอส) | โครนอส · ไททันเฟืองเวลา | บอส | 3 เฟส: 70% โล่+sentinel ×2 · 40% "ย้อนเวลา" ฮีล 8% + ชาร์จถี่ · 15% เร็ว ×1.25 ชาร์จทุก 2 |

### D12 🌊 วิหารก้นสมุทรทมิฬ (Lv 94–97)

| id | ชื่อ | บทบาท | กลไกหลัก |
|---|---|---|---|
| `abysssiren` | ไซเรนห้วงลึก | caster (เวท) | สาป: ใบ้ + อ่อนแรง · ฮีลพวก |
| `trenchcrusher` | ยักษ์บดร่องลึก | tank | ช้ามาก · ATK สูง · armorBreak |
| `anglerghoul` | ปีศาจตกเบ็ด | assassin | razor 3% · trueSight |
| `drownedknight` | อัศวินจมน้ำ | bruiser | lifesteal 12% · counter |
| `jellywraith` | ภูตแมงกะพรุน | skirmisher | ตีโดน = poison · deathBlast |
| `tidepriest` | นักบวชกระแสน้ำ | support | โล่ให้พวก · ลบบัฟฮีโร่ (cleanse ฝั่งศัตรู) 🆕? |
| `coraljaeger` (มินิ) | นักล่าปะการัง | bruiser | ชาร์จ "หอกน้ำแรงดัน" `shield_or_guard` |
| `deepmatron` (มินิ) | มารดาแห่งห้วงลึก | caster | 50%: ดูดค่าสถานะ 1 + ซัมมอน jellywraith ×2 |
| `leviathan` (บอส) | เลวีอาธาน · เจ้าแห่งห้วงลึก | บอส | 3 เฟส: 70% น้ำวน (ทุกเทิร์น −% HP ถ้าไม่มีโล่) · 40% reflect 6% + ซัมมอน · 15% ชาร์จทุก 2 |

### D13 🌘 สุริยุปราคาดาราดับ (Lv 97–99)

| id | ชื่อ | บทบาท | กลไกหลัก |
|---|---|---|---|
| `eclipsewraith` | ภูตสุริยคราส | assassin | fixedFlee 30% (veil + หลบ = ต้องหลายฮิตจริง) |
| `voidastrologer` | โหราจารย์ห้วงมืด | caster (เวท) | สาป: weaken 2 · ฟื้น veil พวก +2 🆕 |
| `cometlancer` | ทหารหอกดาวหาง | bruiser | combo · armorBreak |
| `starlesshound` | หมาไร้ดาว | skirmisher | ตีโดน = weaken · combo |
| `nebulamoth` | ผีเสื้อเนบิวลา | support | ผงนิทรา · ฮีล |
| `fallenstar` | ดาวตกที่ตายแล้ว | tank | reflect 8% · deathBlast 2 |
| `umbravalkyrie` (มินิ) | วาลคีรีเงา | assassin | ชาร์จ "ฝนดารา" `multi_hit_break` |
| `noctisshade` (มินิ) | เงาของโนคทิส | caster | ข้ามสะพานเนื้อเรื่องจาก D10 · revive · drainStats |
| `seraph` (บอส) | เซราฟสุริยคราส | บอส | veil 6 · 3 เฟส: 70% veil เต็ม + ซัมมอน · 40% drainStats 1 · 15% "ซูเปอร์โนวา" ชาร์จทุก 2 (แตก veil = ยกเลิก) |

- ชื่อ id ทั้งหมด **เป็น save data** (การ์ด/วัตถุดิบอ้างถึง) → ตั้งครั้งเดียว ห้าม rename
- id สั้นแบบ D10 (`nightqueen`) ไม่ใช้ prefix `d11_` แบบ stub

---

## 7. รางวัล

| ของ | กฎ |
|---|---|
| การ์ด 9 ใบ / ดัน | power ≈ ดันก่อนหน้า ×1.15 · ธีมตาม hazard (D11 = คริ/สกิล, D12 = DEF/โล่/HP, D13 = หลายฮิต/DoT/ลูกน้อง) |
| วัตถุดิบ | `m_d11..13` (normal) · `b_d11..13` (มินิ/บอส) |
| อุปกรณ์ Job3 | mats ไล่ D11 → D13 (แบบ v114 ทำกับ Job2) — ผูกกับ class-gear |
| EXP | ไหลเข้า Job3 (routing มีแล้วใน jobs3) · Base ถึง 99 ประมาณรอบที่ ~X (คำนวณตอน P1) |
| พรมินิ | 2 relics / มินิ (`miniRelics`) — ใช้ของที่มีก่อน ไม่ต้องสร้าง relic ใหม่ใน v1 |

---

## 8. แผนงาน (MVP-first)

| Phase | ทำอะไร | ไฟล์ | ต้องมี engine ใหม่? |
|---|---|---|---|
| **P0** | ล้าง stub: ลบตัวเลขผิดสเกลใน `endgame-dungeons.ts` หรือ mark `@deprecated` · รัน bot วัด D10 เป็น baseline | `endgame-dungeons.ts` · `rift-engine.ts` | ❌ |
| **P1** | D11 pack **ไม่มี hazard** + การ์ด/mats/tex · unlock union | `dungeons/d11.ts` · `gfx/tex/d11.ts` · `dungeons/index.ts` · `dungeon-defs.ts` | ❌ (field เดิมล้วน) |
| **P2** | hazard engine: `DungeonDef.hazard` · `HAZARD_TUNING` · ต่อ biome-hazards เข้า BattleScene · HUD เกจ/veil · `chargeCounter` · unit tests | `biome-hazards.ts` · `BattleScene.ts` · `tests/` | ✅ |
| **P3** | D12 pack + เปิด hazard D11/D12 | `dungeons/d12.ts` · `gfx/tex/d12.ts` | ใช้ของ P2 |
| **P4** | D13 pack + veil | `dungeons/d13.ts` · `gfx/tex/d13.ts` | ใช้ของ P2 |
| P5 | ขยายหอคอย/รายวันลึก ให้รวม D11–D13 | `modes.ts` | ❌ |

- Save: ไม่ต้องเปลี่ยน schema (clear flags เก็บตาม dungeon id อยู่แล้ว) → เช็กใน P1 ว่า `save.ts` ไม่มี list ดันแบบ hardcode
- ทุก phase: `npm run typecheck` + `npm test` + bot run

---

## 9. คำถามถึงคิว

1. **Gate**: เข้า D11 แค่เคลียร์ D10 (แนะนำ) หรือบังคับ Job3 ด้วย? (บังคับตอนนี้ = ไม่มีใครเข้าได้จนกว่า Master Trial เสร็จ)
2. **Hazard ตัวเลข**: โอเคกับค่าที่ลดลงจาก prototype (§4) ไหม หรืออยากให้โหดตามเดิม?
3. **ไฟล์ stub `endgame-dungeons.ts` + `rift-engine.ts`**: ลบทิ้ง หรือเก็บไว้เป็นโหมด Endless Rift แยกในอนาคต?

---

## อ้างอิง

- D10 format/ตัวเลข: `docs/design/dungeon-10-starless-dream.md` · `src/data/dungeons/d10.ts`
- Pack format: `src/data/dungeons/pack.ts`
- Hazard prototype: `src/data/biome-hazards.ts`
- Stub เดิม: `src/data/dungeons/endgame-dungeons.ts`
- Job3: `src/data/jobs3.ts` · `docs/design/awakening-*.md`
- Endgame research: `docs/research/endgame-content-after-d10.md`
