# RO Stat Curve v1 (DRAFT: รอคิวอนุมัติก่อนแก้โค้ด)

> Branch: `claude/ro-stat-curve` · ต้อง merge `claude/thief-ult-agi-ratio` ก่อน (ดู §6)
> บรรทัดที่อ้างอิงทั้งหมดมาจาก worktree นี้ ยกเว้นที่ขึ้นต้นด้วย `thief:` ซึ่งหมายถึง `claude/thief-ult-agi-ratio:<file>`

## สรุป (5 บรรทัด)
1. แต้มสถานะต่อ Base Lv จะโตขึ้นตามเลเวล: `3 + floor(Lv/5)` (Lv 80 = 19 แต้ม/เลเวล, รวม 856 แต้ม จากเดิม 240)
2. การอัป stat แพงขึ้นเรื่อยๆ: `costBase + floor((stat-1)/10)` แต้มต่อ +1 โดย A (RO แท้) ใช้ `costBase` 2 และ B (RO-lite, แนะนำ) ใช้ 1 ราคาคิดจากค่าที่ซื้อเองเท่านั้น ส่วน race / gear / job bonus ได้ฟรี
3. ผลคือ build ลงตัวเดียวหมดโดนตัดครึ่ง (AGI 238 ที่ Lv 80 เหลือ 117 ใน A และ 126 ใน B) ส่วน B: build 3 stat ช่วง Lv 1-30 ได้ค่าเท่าเดิม และ build กระจายได้มากกว่าเดิม
4. มอนสเตอร์ไม่เปลี่ยน: แยก `MON_STAT.pointsPerLv` ออกจาก `STAT_RULES` ให้เป็นเลข 3 ของตัวเอง
5. Save ทุกอันจะรีเซ็ต stat ฟรี 1 ครั้งและได้แต้มคืนตามกฎใหม่ (flag `statCurve`) ทำเป็น 3 phase โดย phase 1 ต้องไม่เปลี่ยนตัวเลขอะไรเลย

---

## 0) ตอนนี้เป็นยังไง (verified)

| เรื่อง | ค่าปัจจุบัน | ที่อยู่ |
|---|---|---|
| stat เริ่ม | 1 | `src/data/meta/stat-spec.ts:69` |
| max stat | 999 | `stat-spec.ts:70` |
| แต้มต่อ Base Lv | 3 (คงที่) | `stat-spec.ts:71` |
| Max Base Lv | 99 | `stat-spec.ts:76` |
| แต้มตอนสร้างตัว | `statPoints: 3` (hardcode) | `src/save.ts:145` |
| ได้แต้มตอนเลเวลอัปจริง | `+= pointsPerLevel` | `src/save.ts:584` |
| ได้แต้มตอนซื้อเลเวลด้วย gem (test) | `+= lv * pointsPerLevel` | `src/data/levelup.ts:38` |
| ราคาอัป stat | 1 แต้มต่อ +1 เสมอ | `src/scenes/character/status-tab.ts:84-91` |
| มอนดึงแต้มจาก hero | getter `MON_STAT.pointsPerLv` | `src/data/mon-stats.ts:29-30` |

- แต้มทั้งหมดที่ Lv L = `3L` (สร้างตัว 3 + เลเวลละ 3)
- ปัญหา: ลงตัวเดียวได้ทั้งหมด (Rogue ของคิว Lv 80 มี AGI 238 = 237 จาก 240 แต้ม)
- ผลต่อแต้มเป็นเส้นตรงตามเลเวล แล้วทบกับ P.ATK ที่โตตาม Lv อยู่แล้ว ดาเมจเลยโตราว Lv²

---

## 1) สูตรใหม่ (ปรับได้ทั้งหมด อยู่ใน `STAT_RULES`)

### 1.1 ค่าคงที่ใหม่ใน `STAT_RULES` (`stat-spec.ts:68-77`)

| field | Preset A: RO แท้ | Preset B: RO-lite (แนะนำ) | ความหมาย |
|---|---|---|---|
| `startPoints` | 3 | 3 | แต้มตอนสร้างตัว (เอาเลข 3 ออกจาก `save.ts:145`) |
| `pointsPerLevel` | 3 | 3 | แต้มพื้นฐานต่อเลเวล (**ใช้ชื่อเดิม** เพื่อให้ live patch และ test เดิมยังใช้ได้) |
| `pointsGrowEvery` | 5 | 5 | ได้แต้มเพิ่ม +1/เลเวล ทุกๆ N Base Lv |
| `costBase` | 2 | **1** | ราคา +1 ตอน stat อยู่ช่วงแรก |
| `costStep` | 10 | 10 | ราคาขึ้น +1 ทุกๆ N stat ที่ซื้อ |
| `curveVersion` | 1 | 1 | เวอร์ชันของกฎ ใช้ trigger migration (§6) |

- Preset "เหมือนวันนี้" (ใช้ใน Phase 1): `pointsGrowEvery: 999`, `costBase: 1`, `costStep: 999` จะได้ `3L` และราคา 1 เท่าเดิมทุกตัว
- step ทุกตัวต้องมีค่าอย่างน้อย 1 (ห้ามหารด้วย 0)

### 1.2 สูตร (pure functions, ไฟล์ใหม่ `src/data/meta/stat-curve.ts`)

```ts
statGain(lv)      = pointsPerLevel + floor(lv / pointsGrowEvery)          // แต้มที่ได้ตอน "ขึ้นถึง" Lv นี้ (lv >= 2)
statPointsAt(lv)  = startPoints + Σ statGain(l), l = 2..lv                 // แต้มทั้งหมดที่ควรมีที่ Lv นี้
statCost(x)       = costBase + floor((x - start) / costStep)               // ราคาจาก x ไป x+1 (x = ค่าที่ซื้อเอง)
statCostTo(x)     = Σ statCost(v), v = start..x-1                          // ราคารวมจาก 1 ไป x
statSpent(stats)  = Σ statCostTo(stats[k])
maxSingleAt(lv)   = x ที่มากที่สุดที่ statCostTo(x) <= statPointsAt(lv)  // ลงตัวเดียวหมดได้เท่าไร
buyStat(s, k, n)  = ซื้อได้สูงสุด n ขั้น ตามแต้มที่มีและ STAT_RULES.max; คืนจำนวนที่ซื้อได้จริง
```

- **การนับเลเวล:** `floor(lv/5)` ใช้ "เลเวลที่ขึ้นถึง" (แบบ rAthena: ถึง Lv 5 ได้ 4 แต้ม)
  - ถ้าใช้ "เลเวลที่เพิ่งผ่านมา" `floor((lv-1)/5)` ที่ Lv 99 จะได้ 1228 แต้ม แทน 1247 (ต่างกัน 19 แต้ม)
- ใช้ loop ธรรมดา (stat ≤ 999, Lv ≤ 99) ไม่ต้อง cache

### 1.3 แต้มที่ได้ต่อเลเวล

| ขึ้นถึง Lv | 2-4 | 5-9 | 10 | 20 | 40 | 60 | 80 | 95-99 |
|---|---|---|---|---|---|---|---|---|
| ได้แต้ม (ทั้ง A/B) | 3 | 4 | 5 | 7 | 11 | 15 | 19 | 22 |
| วันนี้ | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 |

### 1.4 ราคาต่อ +1 stat

| ค่าที่ซื้อแล้ว | 1-10 | 11-20 | 21-30 | 41-50 | 91-100 | 121-130 |
|---|---|---|---|---|---|---|
| A (RO แท้) | 2 | 3 | 4 | 6 | 11 | 14 |
| B (RO-lite) | 1 | 2 | 3 | 5 | 10 | 13 |
| วันนี้ | 1 | 1 | 1 | 1 | 1 | 1 |

- ราคารวมจาก 1 ไป 11 / 21 / 31 / 41 / 51: **A** 20 / 50 / 90 / 140 / 200 · **B** 10 / 30 / 60 / 100 / 150
- ราคารวมจาก 1 ไป 99: **A** 628 (ตรงกับ RO) · **B** 530 · วันนี้ 98

### 1.5 ได้ค่าสูงสุดเท่าไร (ค่าที่ซื้อเอง ยังไม่รวม race / gear / job)

`ทั้งหมด` = แต้มรวม · `1 ตัว` = ลงตัวเดียวหมด · `2 ตัว` / `3 ตัว` / `7 ตัว` = แบ่งเท่ากันทุกตัว (ค่าต่อตัว)

**วันนี้**

| Lv | ทั้งหมด | 1 ตัว | 2 ตัว | 3 ตัว | 7 ตัว |
|---|---|---|---|---|---|
| 10 | 30 | 31 | 16 | 11 | 5 |
| 20 | 60 | 61 | 31 | 21 | 9 |
| 40 | 120 | 121 | 61 | 41 | 18 |
| 60 | 180 | 181 | 91 | 61 | 26 |
| 80 | 240 | 241 | 121 | 81 | 35 |
| 99 | 297 | 298 | 149 | 100 | 43 |

**Preset A: RO แท้ (`costBase 2`)**

| Lv | ทั้งหมด | 1 ตัว | 2 ตัว | 3 ตัว | 7 ตัว |
|---|---|---|---|---|---|
| 10 | 37 | 16 | 10 | 7 | 3 |
| 20 | 94 | 31 | 20 | 14 | 7 |
| 40 | 268 | 60 | 39 | 30 | 17 |
| 60 | 522 | 89 | 59 | 46 | 27 |
| 80 | 856 | 117 | 79 | 62 | 37 |
| 99 | 1247 | 144 | 98 | 78 | 47 |

**Preset B: RO-lite (`costBase 1`) (แนะนำ)**

| Lv | ทั้งหมด | 1 ตัว | 2 ตัว | 3 ตัว | 7 ตัว |
|---|---|---|---|---|---|
| 10 | 37 | 23 | 15 | 12 | 6 |
| 20 | 94 | 39 | 26 | 21 | 12 |
| 40 | 268 | 69 | 47 | 38 | 23 |
| 60 | 522 | 98 | 68 | 55 | 34 |
| 80 | 856 | 126 | 88 | 71 | 45 |
| 99 | 1247 | 153 | 107 | 87 | 55 |

**ต้นเกม (D1-D5 ใช้ bot ที่ลง 2 ตัว เป็นตัวตั้งค่า)**

| Lv | 2 ตัว: วันนี้ / A / B | 3 ตัว: วันนี้ / A / B |
|---|---|---|
| 5 | 8 / **5** / 9 | 6 / **3** / 6 |
| 10 | 16 / **10** / 15 | 11 / **7** / 12 |
| 20 | 31 / **20** / 26 | 21 / **14** / 21 |

- **ทำไมแนะนำ B**
  - ช่วง Lv 1-30 build 3 ตัวได้ค่าเท่าวันนี้ ทำให้ D1-D5 ไม่ต้องตั้งค่าใหม่
  - A ทำให้ stat ต้นเกมเหลือราวครึ่งหนึ่ง เท่ากับต้อง re-tune D1-D5 ทั้งหมด
  - ทั้งสอง preset ตัด build ตัวเดียวที่ Lv 80 ลงราวครึ่งหนึ่ง (241 เหลือ 117/126)
  - ถ้าคิวอยากได้ RO แท้ เปลี่ยน `costBase` เป็น 2 ได้ตัวเดียว ไม่ต้องแก้โค้ด

### 1.6 Tunables (admin)
- เพิ่มใน `progression` table (`src/data/tunables.ts:178-189`) ต่อจาก `'stat.pointsPerLevel'` (`:182`)
  - `['stat.startPoints', int(0, 100)]`
  - `['stat.pointsGrowEvery|costStep', int(1, 999)]`
  - `['stat.costBase', int(1, 20)]`
- ไม่เปิดให้ tune `curveVersion` (ต้องเปลี่ยนในโค้ดและมี migration เท่านั้น)
- แก้ข้อความ `src/admin/explain/combo-kit.ts:175` (ตอนนี้บอกว่ากระทบมอน D6+ ด้วย ซึ่งจะไม่จริงแล้ว) และเพิ่มคำอธิบายของ field ใหม่

---

## 2) มอนสเตอร์: แยกออก ห้ามเปลี่ยนเงียบๆ

**ตอนนี้:** `MON_STAT.pointsPerLv` เป็น getter ที่ชี้ไป `STAT_RULES.pointsPerLevel` (`mon-stats.ts:29-30`)
- `monPoints = pointsPerLv × (Lv-1) × tierPct` (`:45-46`)
- `monBase` แจกแต้มแบบ 1 แต้ม = 1 stat (`:49-55`)

**ข้อเสนอ:**
- เปลี่ยน getter เป็นเลขของตัวเอง `pointsPerLv: 3` ใน `MON_STAT`
- เพิ่ม `['monStat.pointsPerLv', int(1, 20)]` ใน `monStat` table และลบ comment ที่ `tunables.ts:163`
- มอนไม่ใช้ราคาแบบ RO (`monBase` ยังเป็นเส้นตรง) เพราะงบแต้มของมอนตั้งผ่าน `tierPct` / `pointsMul` อยู่แล้ว
- จุดที่ต้องแก้ตาม:
  - comment ที่ `src/data/patch.ts:161` ("MON_STAT.pointsPerLv is a getter")
  - comment `mvpPct` ที่ `mon-stats.ts:337` ("hero's stat points" ให้เปลี่ยนเป็น "MON_STAT points")
  - `tests/xp-curves.test.ts:16-19` ตอนนี้ test ว่า "ตามกัน" ต้องกลับเป็น test ว่า **ไม่ตามกัน**
- ⚠️ ถ้า live config มี patch `stat.pointsPerLevel` อยู่ หลังแยกแล้วมอนจะไม่ตามอีก ให้เช็ค config ก่อน deploy

**ผลข้างเคียง (มอนไม่เปลี่ยน แต่ hero เปลี่ยน):** stat รวมของ hero เทียบกับแต้มมอน D6-D10

| Lv (D6-D10) | แต้มมอน normal / boss | hero 2 ตัว (stat รวม) วันนี้ / A / B | hero 3 ตัว (stat รวม) วันนี้ / A / B |
|---|---|---|---|
| 45 | 66 / 198 | 134 / 86 / 104 | 135 / 99 / 123 |
| 55 | 81 / 243 | 164 / 106 / 124 | 165 / 123 / 150 |
| 65 | 96 / 288 | 194 / 126 / 144 | 195 / 147 / 174 |
| 75 | 111 / 333 | 224 / 146 / 164 | 225 / 171 / 198 |
| 85 | 126 / 378 | 254 / 166 / 184 | 255 / 195 / 222 |

- **ปรับตัวเองได้:** ด่านที่ scale ตาม Hero Power ผ่าน `matchScale` / `heroParts`
  - tower (`src/data/modes.ts:302`), daily (`modes.ts:370`), hard บนด่านที่ไม่ใช่ level dungeon (`src/scenes/BattleScene.ts:376`)
- **ไม่ปรับตัวเอง:**
  - D6-D10 level dungeon: มอน stat คงที่ และ hard ข้าม `matchScale` เพราะมีเงื่อนไข `!this.dg.level` (`BattleScene.ts:376`)
  - ค่า `REC` ของ D1-D5 (`src/data/power.ts:86`) และ `TOWER_POWER.ref` (`power.ts:114`)
- ผลคือ build 2 ตัวที่ Lv 45-85 มี stat รวมน้อยลงราว 23-28% (B) ด่าน D6+ จะยากขึ้น
- ให้คิว playtest ก่อน แล้วค่อยลด `MON_STAT.tierPct` ถ้าจำเป็น (memory: bot เล่นแย่กว่าคน ห้าม nerf จากผล bot อย่างเดียว)

---

## 3) ผลต่อแต้ม (PER_POINT + off-stat) และ Hero Power

### 3.1 `PER_POINT` (`stat-spec.ts:8-44`) ถูก apply ใน `applyBase` (`src/data/meta/hero-stats.ts:206-242`)

| กลุ่ม | ค่า | โดนแค่ไหน | ทำอะไรใน Phase 1-2 |
|---|---|---|---|
| เส้นตรง ไม่มี cap | `str.atk` `str.pskill` `dex.hit` `vit.def` `vit.regen` `int.matk` `int.maxRes` `wis.healAmp/shieldAmp/resRegen` `agi.flee` `luk.crit` | ค่าสูงๆ ลดลงมาก (เพราะ stat ลด) | **ไม่แก้**: curve คือตัว nerf อยู่แล้ว |
| ทบคูณ | `vit.maxHp × (1+maxHpPct×VIT)` (`hero-stats.ts:217`) · `agi.aspdPct` คูณ aspd (`:227`) | โตเร็วกว่าเส้นตรง โดนลดมากที่สุด (ดีแล้ว) | ไม่แก้ |
| ratio `x/(x+K)` | `wis.mdefK` `wis.tenacityK` `agi.comboK` `vit.counterK` `luk.dodgeK` | ค่าสูงๆ มี soft-cap อยู่แล้ว โดนน้อย | ไม่แก้ |
| มี cap | `dex.minPct` (0.95) `luk.legend/drop/event` `luk.spear` (cap 25%) | ถึง cap ช้าลง | ไม่แก้ |

- ตัวอย่าง LUK ลงตัวเดียวที่ Lv 80: crit จาก LUK (`luk.crit` = 1/3% ต่อแต้ม) จาก ~80% (LUK 241) เหลือ ~42% (LUK 126, B)

### 3.2 off-stat และ class ใน `heroBuild()` / `totalBase()` (worktree lines)

| ที่อยู่ | ใช้ | แบบ | ต้อง re-tune? |
|---|---|---|---|
| `hero-stats.ts:281` | Thief INT → poison `0.1 × d(int)` | เส้นตรง | ไม่แก้สูตร แต่ **0.1 เป็น magic number** ให้ย้ายไป `PER_POINT.off` |
| `hero-stats.ts:282` | Thief AGI → เงาพริ้ว | ถูกแทนด้วย Ratio AGI (`thief:301`) | **ต้องแก้** ดู §3.3 |
| `:284` | Swordsman DEX → counter | เส้นตรง | ไม่แก้ (off-stat ลงน้อย และ 10 แต้มแรกราคา 1 ใน B) |
| `:285` | Archer STR → ultAmp | เส้นตรง | ไม่แก้ |
| `:286` | Cleric DEX → spearMul | เส้นตรง | ไม่แก้ |
| `:288` | Mage LUK → spellCrit | เส้นตรง | ไม่แก้ |
| `:287-301` | Mage กายสู่เวท: ต่อทุก `regenStep` / `matkStep` STR | แบบขั้น | **เฝ้าดู**: STR 41 ราคา 100 แต้ม (เดิม 40) ถ้าคิวตั้งใจให้ลง 40+ ให้ลด step |
| `:302-303` | Cleric LUK → spearLuck (cap) | cap | ไม่แก้ |
| `:304-311` | Cleric จิตสงบ: ต่อ 10 ของ min(STR, WIS) | แบบขั้น | **เฝ้าดู** เหมือน Mage |
| `:334-337` | Sage DEX / WIS / LUK (มี cap ทุกตัว) | cap | ดูว่ายังถึง cap ได้ไหมที่ Lv 60+ |
| `:433` | Crusader VIT → Auto Guard (ส่วนที่เกิน cap ไปเป็นโล่) | cap + overflow | overflow น้อยลง ไม่แก้ |
| `:456` | Swordsman VIT → M.DEF (cap) | cap | ไม่แก้ |
| `:67-89` | Beastmaster stance (LUK crit, DEX hit, VIT def, AGI atk) | เส้นตรง / cap | ไม่แก้ |
| `:186-199` | Cleric INT→STR, WIS→VIT (ทุก N แต้ม) | แปลงฟรี | ไม่แก้ (ได้ฟรี ไม่ผ่านราคา) |

- หลักการ: off-stat ปกติลงน้อย (10-20 แต้ม) ใน B ช่วงนี้ราคา 1-2 จึงแทบไม่โดน
- ตัวที่โดนจริงคือแบบ "ต่อ N แต้ม" ที่ต้องลงเยอะ (Mage / Cleric) ให้รอผล playtest ก่อน (Phase 3)

### 3.3 Thief Ratio AGI: `statPool()` ต้องเปลี่ยน
**ตอนนี้ (`thief:275-289`)**
- `pool = pointsPerLevel × baseLevel`
- ถ้าไม่มี baseLevel ใช้ `Σ(stat - start)` แทน (`thief:279-282`)
- `share = AGI รวมที่เกิน start ÷ pool` (นับ gear / race / job ด้วย) โดย cap ที่ 1.2

**invariant ที่ต้องรักษา** (`thief:tests/thief-ult-agi.test.ts`)
- ลงหมดได้ bonus = K ทุก Lv
- ลงครึ่งได้ครึ่ง
- AGI ฟรีนับรวม แต่ไม่เกิน cap

| ตัวเลือก | สูตร share | ลงหมด | ลง 2 ตัว (B, Lv 80) | gear +10 AGI (B, Lv 80) | ผ่าน invariant |
|---|---|---|---|---|---|
| 1. แต้มที่ซื้อ AGI ÷ แต้มที่ได้ | `statCostTo(bought) / statPointsAt(Lv)` | ~0.99 (เศษที่เหลือ) | 0.49 | **ไม่นับ** | ❌ ไม่นับ AGI ฟรี |
| 2. AGI ดิบ ÷ ลงหมดได้เท่าไร | `(AGI−1) / (maxSingleAt(Lv)−1)` | 1.00 | 0.70 | 1.08 | ⚠️ ลงครึ่งได้ 70% |
| **3. ราคาของ AGI รวม ÷ ราคาของการลงหมด (แนะนำ)** | `statCostTo(1+agiAbove) / statCostTo(maxSingleAt(Lv))` | **1.00** | **0.50** | 1.16 (ไม่เกิน cap 1.2) | ✅ ถ้าไม่มี AGI ฟรี (ดูตารางล่าง) |

**AGI ฟรี (job bonus + gear) ใน option 3 มีค่ามากกว่าวันนี้** เพราะคิดราคาที่ช่วงบนของ curve (B, Lv 80)

| AGI ที่ซื้อ + ฟรี | share ใน option 3 | share วันนี้ (build เดียวกัน) |
|---|---|---|
| 126 + 0 (ลงหมด) | 1.00 | 0.99 |
| 88 + 0 (ลง 2 ตัว) | 0.50 | 0.50 |
| 88 + 10 | 0.62 | 0.54 |
| 88 + 30 | 0.88 | 0.63 |
| 71 + 30 (ลง 3 ตัว) | 0.65 | 0.46 |

- ถ้ามี AGI ฟรีเยอะ เงาพริ้วจะแรงกว่าวันนี้ราว +0.1 ถึง +0.5 ของ K
- ปุ่มที่ใช้ปรับคือ `KIT.thiefUltAgiK` และ `KIT.thiefUltAgiShareCap` ใน Phase 3 หลังคิว playtest
- อีกทาง: นับ AGI ฟรีแบบดิบ คือ `(statCostTo(bought) + free × statCost(bought)) / pool` ซึ่งซับซ้อนกว่า ไม่แนะนำสำหรับ MVP

- ทางที่แนะนำ: signature `thiefUltAgiBonus(agiAboveStart, pool)` คงเดิม
  - ข้างในแปลงตัวตั้งเป็น `statCostTo(start + agiAboveStart)`
  - `statPool(s)` คืน `statCostTo(maxSingleAt(baseLevel))`
  - ถ้าไม่มี baseLevel ใช้ `statSpent(s.stats)` (แทน `Σ(v-start)` ที่ `thief:279-282`)
- ใช้กับ preset "เหมือนวันนี้" ได้ผลเท่าเดิมทุกค่า: `statCostTo(x) = x-1` และ `maxSingle = 1+3L` ทำให้ pool = 3L
- มอนไม่โดน: `statPool` / `thiefUltAgiBonus` ถูกเรียกแค่ใน `heroBuild` ตอน job thief (`thief:301`), `statInfo.ts` และ `status-tab.ts:218` (git grep บน Thief branch) ไม่มีทางที่ `mon-stats.ts` / `hero-skill-book.ts` / `mon-skill-scale.ts` จะเรียกถึง
- `statInfo.ts` (`thief:` diff) และ `status-tab.ts` (`thief:218`) ส่ง `statPool(save())` อยู่แล้ว จึงไม่ต้องแก้ตรงที่เรียก

### 3.4 Hero Power (`src/data/power.ts`)
- `powerParts` อ่านจาก Stats ที่คำนวณแล้ว (`power.ts:47-70`) Power จึงเปลี่ยนตามเองโดยไม่ต้องแก้สูตร
- `CLASS_K` (`:25`) / `JOB2_K` (`:32-34`) / `JOB3_K` (`:41`) คือ "สิ่งที่ Stats มองไม่เห็น" (heal, AoE, pet) ไม่ขึ้นกับว่า stat เป็นเส้นตรงหรือไม่ จึง **ไม่แก้ใน Phase 1-2**
  - JOB3_K มีงาน calibration ค้างอยู่แล้ว ให้ทำหลัง Phase 2 ทีเดียว
- จุดเสี่ยงจาก calibration:
  - `REC` d1-d5 (`:86`): วัดจาก bot ที่ลง 2 ตัว ใน B ช่วง Lv 15-20 2 ตัวต่ำกว่าเดิมราว 10-16% (A ราว 35-40%)
  - `TOWER_POWER.ref: 330` (`:114`): ตั้งจาก Thief Lv 44 ของคิว
- Phase 1 เพิ่ม test ที่พิมพ์ `heroPower` ของ save ตัวอย่าง 3 แบบ (ลงตัวเดียว / 2 ตัว / 3 ตัว) ที่ Lv 20 / 45 / 80 เทียบ preset ตัวเลขจะได้วัดจริง ไม่ต้องเดา

---

## 4) Stat ฟรี (job / race / gear) กับราคา

- **กฎ (แบบ RO):** ราคาคิดจาก `s.stats[k]` คือค่าที่ **ซื้อเอง** อย่างเดียว
- `totalBase()` (`hero-stats.ts:166-202`) บวกสิ่งเหล่านี้ทีหลัง จึงไม่ทำให้ราคาขึ้น:
  - race bonus (`RACES[race].bonus`)
  - gear / card base (`gearBase`, `:106-112`)
  - job bonus (`jobBonusBase`, `:114-138`: `JOB_BONUS_STATS`, `JOB2_BONUS_STATS`, `JOB3_BONUS` จาก `stat-spec.ts:79-109`)
  - Swordsman core VIT, Cleric INT→STR / WIS→VIT, Hawk LUK
  - buff ระหว่างสู้ `tempBase` (พรแสง)
- ผลคือ stat ฟรีมีค่ามากขึ้น เพราะ +1 ฟรีที่ AGI 120 เท่ากับประหยัดได้ 12-13 แต้ม
  - job bonus เป็นค่าคงที่ (+1 ต่อ 10 Job Lv, Job3 +2) จึงไม่ต้องแก้
- race ติดลบ (เช่น −2) ไม่ทำให้ราคาถูกลง เพราะราคาดูจากค่าที่ซื้อ
- Thief share (§3.3) นับ AGI ฟรีด้วยราคาช่วงบนของ curve ซึ่งตั้งใจไว้ และมี cap 1.2 กันไว้

---

## 5) UI: จุดที่ต้องแก้

| ที่อยู่ | ตอนนี้ | ต้องเป็น |
|---|---|---|
| `status-tab.ts:44` | `แต้มสถานะเหลือ: N` | คงเดิม |
| `status-tab.ts:55` | `ได้ 3 แต้มทุก Base Lv` | `Lv นี้ได้ {statGain(lv+1)} แต้ม/เลเวล · ค่าอัปขึ้นทุก {costStep} stat` |
| `status-tab.ts:68` (แต่ละแถว) | ค่ารวม | เพิ่ม `ถัดไป {statCost(s.stats[k])} แต้ม` |
| `status-tab.ts:84-91` `add(n)` | `min(n, statPoints, max−stat)` แล้วหัก n | เรียก `buyStat(s, k, n)` (จ่ายทีละขั้นตามราคา) |
| `status-tab.ts:95` / `:100` | เปิดปุ่มเมื่อ `statPoints > 0` / `> 1` | เปิดเมื่อ `statPoints >= statCost(stat)` |
| `status-tab.ts:93-101` ปุ่ม | `+1` `+5` | `+1` `+10` (ซื้อเท่าที่จ่ายไหว) เพราะหลัง migration ต้องลงใหม่ ~850 แต้ม |
| `status-tab.ts:179-198` รีเซ็ต | คืน `Σ(v−start)` | `statPoints = statPointsAt(baseLevel)` (คิดจากเลเวล ไม่ขึ้นกับราคาเก่า) ถ้าใช้ Σ(v−start) เดิม **แต้มจะหาย** |
| `src/data/statInfo.ts:14-42` | `+2/แต้ม` | คำว่า "แต้ม" จะสับสนกับแต้มสถานะ ให้เปลี่ยนเป็น `/1 STR` (แก้ข้อความอย่างเดียว) |
| `src/scenes/GemShopScene.ts:90` | `+3 stat point/เลเวล` | `+{statGain} stat point/เลเวล` |
| `src/scenes/HubScene.ts:63` | `มีแต้มสถานะ N` | คงเดิม และเพิ่มข้อความแจ้ง 1 ครั้งแบบ `webRefund` (`HubScene.ts:220-222`) |
| `src/preview-kit.ts:23` | `statPoints: 57` (hardcode) | คำนวณจาก `statPointsAt(20)` แทนเลข hardcode |
| `src/save.ts:145` | `statPoints: 3` | `STAT_RULES.startPoints` |
| `src/save.ts:584` | `+= pointsPerLevel` | `+= statGain(s.baseLevel)` (หลัง `baseLevel++`) |
| `src/data/levelup.ts:38` | `+= lv × pointsPerLevel` | `+= statPointsAt(new) − statPointsAt(old)` |

- `tools/bot.cjs:12-45` ตั้ง stat ตรงๆ แบบ `3×(Lv−1)` ซึ่งจะผิดกฎใหม่ ต้องเปลี่ยนให้ซื้อผ่าน `statCostTo` ไม่อย่างนั้นผล bot ใช้ไม่ได้ (ต้องถามคิวก่อนรัน bot)
- ที่อื่นที่ยุ่งกับ stat ของ hero (จาก grep `s.stats[` และ `stats: {`; ยังไม่ได้ไล่ครบทุก pattern ให้ grep ซ้ำตอนทำ Phase 1):
  - `src/scenes/BattleScene.ts:368` (mutator ดวงพุ่ง คูณ LUK ที่ซื้อ) และ `:5288` (คูณ AGI ที่ซื้อ) เป็นการคูณชั่วคราวตอนคำนวณ stat ไม่ได้ใช้ราคา จึงไม่ต้องแก้ แต่ผลจะลดลงตาม stat ที่ซื้อได้น้อยลง
  - `src/preview-kit.ts:23` ใช้ `newSave` + เขียนทับ `statPoints` (อยู่ในตารางแล้ว)
  - `src/save.ts:162` (`newSave`) และ `:200` (fallback WIS)

---

## 6) Save migration

**Dependency:** commit Ratio AGI (`9302177`) ยังไม่อยู่ใน branch นี้ ต้อง merge `claude/thief-ult-agi-ratio` ก่อน Phase 1 ไม่อย่างนั้นจะ conflict ที่ `hero-stats.ts`, `statInfo.ts`, `status-tab.ts`

**field ใหม่ใน `SaveData`** (ต่อจาก `sageRework` ที่ `save.ts:81`)
- `statCurve?: number`: เวอร์ชันของกฎที่ save นี้ migrate แล้ว (เป็น number เพื่อให้ re-tune ครั้งหน้า bump แล้ว reset ได้อีกรอบ)
- `statRefund?: number`: แต้มที่คืน ใช้แสดงครั้งเดียวในเมือง

**`migrateStatCurve(s)`** เรียกใน `load()` ต่อจาก `migrateSageRework(s)` (`save.ts:215`) ทำตามแบบ `migrateSageRework` (`save.ts:482-497`)
```ts
if (!s || typeof s !== "object") return;
const v = typeof s.statCurve === "number" && Number.isFinite(s.statCurve) ? s.statCurve : 0;
if (v >= STAT_RULES.curveVersion) return;
const lv = clampInt(s.baseLevel, 1, STAT_RULES.maxBaseLevel);   // NaN / string / ทศนิยม / ติดลบ -> ตัดให้อยู่ในช่วง
s.baseLevel = lv;
s.stats = { str: start, vit: start, wis: start, dex: start, int: start, luk: start, agi: start }; // สร้างใหม่ทั้ง object (key หาย / ค่าเสีย ไม่ใช่ปัญหา)
s.statPoints = statPointsAt(lv);    // คิดจากเลเวลอย่างเดียว ไม่ใช้แต้มเก่าที่ลงไว้
s.statRefund = s.statPoints;
s.statCurve = STAT_RULES.curveVersion;
```
- `newSave()` ใส่ `statCurve: STAT_RULES.curveVersion` (แบบ `sageRework: 1` ที่ `save.ts:140`) และ `statPoints: STAT_RULES.startPoints`
- ทำซ้ำได้ (idempotent): ถ้ายังไม่ได้ persist migration จะรันซ้ำ ซึ่งไม่มีผลเสีย เพราะ stat ยังเป็น 1 อยู่ และพอลงแต้มก็จะ `persist()` ซึ่งเซฟ flag ไปด้วย
- hardening เล็กๆ: `save.ts:200` อ่าน `s.stats.wis` โดยไม่เช็คก่อน ถ้า `stats` หายจะ throw ใน try แล้วทั้ง save กลายเป็น `null` ให้เพิ่ม `if (!s.stats || typeof s.stats !== "object") s.stats = {...start}` ไว้ก่อนบรรทัดนั้น
- HubScene แสดง `♻️ รีเซ็ตสเตตัสฟรี: ได้แต้มคืน {n} ลงใหม่ได้เลย` 1 ครั้ง แล้ว `delete s.statRefund; persist()` (ทำแบบ `HubScene.ts:220-222`)

**ค่าที่คาดว่าจะลด (Rogue Lv 80 ของคิว, AGI 238)**

| ลงใหม่แบบ | A (RO แท้) | B (RO-lite) | ลดลงจากเดิม (B) |
|---|---|---|---|
| แต้มที่ได้คืน | 856 | 856 | (เดิม 240) |
| AGI ตัวเดียว | 117 | 126 | −47% |
| AGI + STR | 79 / 79 | 88 / 88 | AGI −63% |
| AGI + STR + DEX | 62 × 3 | 71 × 3 | AGI −70% |

- ค่านี้ยังไม่รวม job bonus / gear AGI ซึ่งได้เท่าเดิม
- เงาพริ้ว (option 3): ลง AGI ตัวเดียว bonus ยังเท่ากับ K (2.0) ลง AGI+STR ได้ ~1.0 แต่ถ้ามี AGI ฟรีจะได้มากกว่าวันนี้ (ตารางใน §3.3)

---

## 7) ความเสี่ยง, Rollout, Tests

### 7.1 ความเสี่ยง

| # | ความเสี่ยง | ลดยังไง |
|---|---|---|
| 1 | D6-D10 ยากขึ้น (มอนคงที่ hero อ่อนลง, §2) | คิว playtest ก่อน แล้วค่อยลด `MON_STAT.tierPct` ห้ามดูจาก bot อย่างเดียว |
| 2 | ใช้ Preset A แล้ว D1-D5 ยากขึ้นมาก | ใช้ B เป็นค่าเริ่ม หรือ re-measure `REC` |
| 3 | bot สร้าง build ผิดกฎ | แก้ `tools/bot.cjs` ให้ซื้อผ่าน curve ใน Phase 2 (ถามคิวก่อนรัน) |
| 4 | merge conflict กับ Thief branch | merge Thief ก่อน แล้วค่อยเริ่ม Phase 1 |
| 5 | live patch `stat.pointsPerLevel` ไม่พามอนไปด้วยแล้ว | เช็ค live config ก่อน deploy |
| 6 | tune ราคาสดๆ หลัง migration แล้ว แต้มไม่ตรงกัน | ใช้ reset แบบ `statPointsAt(baseLevel)` ถ้าเปลี่ยนกฎใหญ่ให้ bump `curveVersion` |
| 7 | ผู้เล่นรู้สึกโดน nerf | แจ้งข้อความครั้งเดียว + reset ฟรีตลอดอยู่แล้ว (`status-tab.ts:170-203`) |
| 8 | ถ้าวันหน้ามีแต้มสถานะจากแหล่งอื่น (quest, item) reset แบบ `statPointsAt` จะทำให้แต้มนั้นหาย | ตอนนี้ไม่มี (grep แล้ว: มีแค่ `save.ts:584`, `levelup.ts:38`, `newSave`) ถ้ามีวันหน้าให้เก็บ `bonusStatPoints` แยก |

### 7.2 Phased rollout
- **Phase 0:** merge `claude/thief-ult-agi-ratio`
- **Phase 1 (refactor, ตัวเลขไม่เปลี่ยน, 1 commit)**
  - เพิ่ม `stat-curve.ts` + field ใหม่ใน `STAT_RULES` ตั้งเป็น preset "เหมือนวันนี้"
  - ย้ายจุดที่เรียกทั้งหมด (`save.ts:145`, `:584`, `levelup.ts:38`, `status-tab.ts:84-101`, `statPool`) มาใช้ฟังก์ชันใหม่
  - ปุ่มรีเซ็ตยังคงเป็น `Σ(v−start)` เหมือนเดิม (ใน preset นี้ได้ค่าเท่ากัน) ส่วนการเปลี่ยนเป็น `statPointsAt(baseLevel)` ไปทำใน Phase 2
  - แยก `MON_STAT.pointsPerLv` + tunables
  - test พิสูจน์ว่าทุกค่าเท่าเดิม
- **Phase 2 (เปิดใช้จริง, 1 PR Major)**
  - เปลี่ยนค่าเป็น preset ที่คิวเลือก
  - `migrateStatCurve` + `statCurve` ใน `newSave`
  - UI (ราคาถัดไป, `+10`, reset, ข้อความ) + แก้ `tools/bot.cjs`
- **Phase 3 (re-tune หลังคิว playtest)**
  - off-stat แบบขั้น (Mage / Cleric), `REC`, `TOWER_POWER.ref`, `MON_STAT.tierPct` ถ้า D6+ ยากเกิน, `JOB3_K`
  - ย้าย `0.1` ของ Thief poison ไป `PER_POINT.off`

### 7.3 Tests (รันทีละไฟล์: `node tools/test.mjs <name>` ห้ามรันพร้อมกัน ห้ามรัน suite เต็ม)
- **ใหม่ `tests/stat-curve.test.ts`**
  - ค่า `statGain` / `statPointsAt` / `statCost` / `statCostTo` / `maxSingleAt` ตรงกับตาราง §1.3-1.5 (B และ A)
  - preset "เหมือนวันนี้": `statPointsAt(L) = 3L`, `statCostTo(x) = x−1`, `maxSingleAt(L) = 1+3L` สำหรับ L = 1..99
  - `buyStat`: ไม่จ่ายเกินแต้ม, ไม่เกิน `STAT_RULES.max`, n ที่ ≤ 0 / NaN / ทศนิยม คืน 0, แต้มไม่ติดลบ
  - step = 1 ไม่พัง, ไม่มี NaN
- **ใหม่ `tests/stat-curve-migrate.test.ts`**
  - Lv 80 AGI 238 → stat ทั้งหมด = 1, `statPoints = statPointsAt(80)`, ตั้ง flag แล้ว
  - รันซ้ำไม่เปลี่ยนอะไร (idempotent), `newSave` ไม่โดน migrate
  - save เสีย: `stats` หาย / ค่า NaN / string / key หาย / `baseLevel` เป็น NaN, 0, 150, "80" ต้องไม่ throw และค่าอยู่ในช่วง
  - `statCurve` เก่ากว่า `curveVersion` ต้องรันใหม่
- **แก้ test เดิม**
  - `tests/levelup.test.ts:18` → `statPointsAt(6) − statPointsAt(1)`
  - `tests/xp-curves.test.ts:16-19` → มอน **ไม่** ตาม `STAT_RULES.pointsPerLevel` และ `monPoints` เท่าค่าเดิม
  - `tests/thief-ult-agi.test.ts` (มาจาก Thief branch) → ลงหมดที่ทุก Lv = K, ลง 2 ตัว ≈ K/2, ใส่ gear เกินแล้วติด cap
- **ต้องผ่านเหมือนเดิม:** `mon-stats`, `mon-stats-calibration`, `job-bonus`
- ปิดงานด้วย `npm run typecheck` 1 ครั้ง (ถามคิวก่อน เพราะเครื่องช้า)

---

## 8) คำถามสำหรับคิว (ตอบแค่นี้พอ แล้วเริ่ม Phase 0-1 ได้)

1. **Preset ราคา:** จะเอา **B: RO-lite** (`costBase 1`, ต้นเกมเท่าเดิม, แนะนำ) หรือ **A: RO แท้** (`costBase 2`, stat ต้นเกมเหลือราวครึ่ง ต้อง re-tune D1-D5) คะ?
2. **D6-D10:** ปล่อยมอนไว้เท่าเดิมแล้วคิว playtest ก่อน (แนะนำ) หรือจะลด `MON_STAT.tierPct` ไปพร้อมกับ Phase 2 เลยคะ?
3. **หลัง reset:** ให้ผู้เล่นลง ~850 แต้มเองด้วยปุ่ม `+1/+10` (MVP แนะนำ) หรืออยากได้ปุ่ม "ลงตามสัดส่วน build เดิม" ด้วยคะ?
