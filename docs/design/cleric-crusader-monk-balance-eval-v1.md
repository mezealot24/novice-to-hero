# R1 Baseline Balance Evaluation: Cleric, Crusader/Paladin & Monk/Champion (v1 — BEFORE Polish)

> **สถานะเอกสาร:** M1 Baseline Evaluation (เก็บข้อมูลก่อนแก้สมดุล / Skill Polish ใน M2–M3 และแผน Rework S1/S2/S3-1 ใน M4)  
> **แหล่งข้อมูลหลัก:** การจำลองบอท Playwright Headless ผ่าน `tools/bot.cjs` + `tools/bot-matrix.mjs` รวม **1,040 runs**: ชุดสำรวจ `r1_matrix` (**40 configs × 20 runs = 800 runs**, `failedShards = 0`, `errors = 0`, `wallSec = 3243.7s`) + ชุดยืนยัน **100% Tree-Legal Baseline (`legal_matrix`, 12 configs × 20 runs = 240 runs**, `failedShards = 0`, `errors = 0`, `wallSec = 961.0s`, หลังแก้ `bot.cjs:79` เรื่อง `PL` + `STAR`) บน build ปัจจุบัน (`dist/index.html`) ร่วมกับการตรวจสูตรคำนวณจริงใน `src/data/` และ `src/scenes/BattleScene.ts`  
> **ขอบเขต (ตามคำสั่งผู้ใช้):** ประเมินเชิงลึกเฉพาะสาย **Cleric (เริ่มที่ S1, S2, Ult/Core, Talents, Stat Spreads) → Crusader & Paladin → Monk & Champion** ทั้งเทียบภายในสายเดียวกันและวินิจฉัยบั๊ก/จุดอ่อนเชิงโครงสร้าง (แนบ `CMP-01..07` จากชุด 800 runs เป็นบริบทอ้างอิงเท่านั้น — งดการเทียบข้ามคลาสเพิ่มเติมตามคำสั่งผู้ใช้)

---

## §0 Executive Summary (So What)

1. **Cleric Base (`CL-01..CL-14`) — สาย Faith & Dawn Light แข็งแรงมากใน Normal แต่มีบั๊ก 4 จุดใหญ่ + `CLASS_K.cleric = 1.8` ทำให้พังใน D6 HARD:**
   - **Build ที่เก่ง vs อ่อนใน D5 Normal:** `CL-03` (S1 Faith `cleric_c` + `cl_spear`) ทำ **`1,004.2` DPT** (`100%`, `34.1` เทิร์น) และ `CL-07` (Ult Dawn Light `cleric_d`) ทำ **`829.9` DPT** (`100%`, `41.3` เทิร์น) ขณะที่ `CL-06` (Ult Sanctuary `cleric_a`) ทำได้เพียง **`617.0` DPT** (`56.8` เทิร์น), `CL-04` (S2 `cl_renew`) ร่วงเหลือ **`656.2` DPT** (`52.8` เทิร์น), และ `CL-01` (Default bot `{wis:8,int:7}` ไม่อัป web) อยู่ที่ **`288.2` DPT** (`123.7` เทิร์น)
   - **4 บั๊กเชิงโครงสร้างของ Cleric ที่เจอในโค้ดจริง:**
     1. **`cleric_ultp` ไม่เพิ่ม `ultPow` (`tree.ts:266-274`)** — ออกแค่ `{ clUltAtk, clUltMana }` ทำให้ `st.ultPow = 0` ตลอดสาย (`ultLights`, `ultShield`, `powerParts()`, Crusader `gcPm`/`gcStr`/`gcBurn`, และ Monk `Tempest Bell`/`Asura` ไม่ได้สเกลจากโนด Ult เลย)
     2. **`cleric_t3_miracle` (`spellCrit`) คริ 0% บน S1/Ult (`trees/cleric.ts:72`, `BattleScene.ts:3943-3945`)** — ภายใต้ `CRIT_RULES`, S1 Smite/Judgement/Ult Holy Lights/Ult Holy ตกเป็น `isSkillHit()` ซึ่งเช็ก `if (skillCrit <= 0) return 0` ทำให้คริ `0%` ทั้งชุด (ติดแค่ `fireSpears` กับ `faithBurst`)
     3. **`cleric_b3s` (`ใจนิ่ง`) Over-Stretch เหลือฮีลที่ `15% HP` (`trees/cleric.ts:35`, `tree.ts:183-202`)** — โดน `class1Scale` ขยาย Lv 15 จน `healAt = 0.60` (`0.75 - 0.60 = 15% HP`) ทำให้ `CL-14` ใน D6 ช้าลง (`1,723.7 → 1,509.1` DPT) และแพ้/หมดเทิร์น `1/20`
     4. **`CLASS_K.cleric = 1.8` + `+0.3 sustain` (`power.ts:25,65`) ประเมินพลังสูงเกินจริง:** `CL-12` (`power = 963`) ผ่าน D6 Normal `20/20` (ปลดล็อกข้อสงสัยจาก `awakening-crusader-v1.md` ที่เดิมบอทไม่อัป web แล้วตาย `0/8`), **แต่ `CL-13` D6 `HARD=1` ตายยกชุด `0/20`** (`18` ตาย + `2` หมดเทิร์น, `meanMinHp = 7%`, `meanRoom = 8.0/15`)

2. **Crusader & Paladin (`CR-01..05`, `PA-01..05`) — ถึกสุดขั้วแต่พึ่งพา Ult สูงผิดปกติ (`68.5%–83.2%`) จนติด Time-out ใน D10 HARD:**
   - **Ult Over-Dominance:** ทุก config ของ Crusader/Paladin พึ่ง `Grand Cross` / `Gospel Cross` **`68.5%–83.2%`** ของดาเมจทั้งหมด (เช่น `PA-02` Pressure Pure = **`83.2%` Ult**, Non-Ult แค่ **`1,860.4` DPT** จาก `11,071.3` DPT) เทียบกับเป้าหมาย `17%–45%` ของสาย Swordsman
   - **สาเหตุแพ้ D10 HARD (`CR-04` `0/20`, `PA-04` `1/20`):** บอท **ไม่ได้ตาย** (`meanMinHp = 69%–70%` จบไฟต์เลือดแทบเต็ม `14k–20k`) แต่ **`17–18/20` รอบแพ้เพราะ Turn Limit Timeout** (`offense = 590–773` vs `survival = 113,988–245,217`) เนื่องจาก `holyVariant()` (`Shield Chain` / `Pressure`) ตัดส่วน `Pm` ของ `Holy Cross` ทิ้งเหลือแค่ P.ATK+DEF/HP และยังไม่ได้สเกลจาก `cleric_ultp`
   - **Hybrid ชนะ Pure ชัดเจน:** `PA-03` Hybrid (`Monk mk_c1:5 + mk_h1:5`) ดัน Non-Ult DPT จาก `1,860.4` เป็น **`2,793.4` DPT (`+50.1%`)** และรวม **`11,382.3` DPT**

3. **Monk & Champion (`MK-01..04`, `CH-01..04`) — Non-Ult แข็งแรงมาก (`Ult% 0%–26.9%`) แต่สกิล 3/Ult ยังมีจุดบอดและบั๊ก:**
   - **Monk Sub-builds (D6):** `MK-01` Combo + Tempest Bell (`2,718.2` DPT, `20/20`, `0%` direct Ult + `8.7%` Bell Ally) **ดีที่สุด**; `MK-03` Asura Strike (`2,297.3` DPT, `20/20`, `26.9%` Ult) โดนโทษ **`ง่อยแดก` Exhaust 3 เทิร์น** กด DPT ลง `-15.5%`; `MK-02` Haymaker (`1,659.9` DPT, `18/20`, 2 timeouts) ช้าเพราะ Grit ต้องรอโดนตีสะสม `15%–25% HP`
   - **Champion Variants (D10):** `CH-01` Variant A (`Tiger Knuckle`, `9,934.5` DPT, `19.6%` Ult, `20/20`) เหนือกว่า `CH-02` Variant B (`Chain Crush`, `6,667.8` DPT, `-32.9%`) และ `CH-03` Asura+Hybrid (`5,530.3` DPT, `18/20` 2 timeouts) อย่างขาดลอย
   - **4 บั๊กสำคัญของ Monk/Champion:** (1) `championVariant()` (`BattleScene.ts:1770-1802`) **ดูด `charges` ทิ้งโดยไม่เอามาคูณดาเมจ** และไม่สน `mk_s1` / `j2ThunderPer`; (2) `ult2()` ของ Monk (`3295, 3319`) **`return` ก่อนเรียก `clericUltExtras()`**; (3) `c_mk_band`, `c_mk_beads`, `cc_mk_gi`, `CLASS_LINES.monk` ยังติด stat ที่ปลดระวางแล้ว (`j2Es`, `j2Dark`, `j2Instill`, `j2NoLight`); (4) `J3_OF` (`skill-registry.ts:502`) ยังไม่มี `paladin` และ `champion`

---

## §1 Methodology, Bot Unblocks & Matrix Design

### 1.1 สภาพแวดล้อมการทดสอบ & การปลดล็อก `tools/bot.cjs`
- **Hardware & Runtime:** Intel Core `i7-9700K` (8 logical cores @ 3.60 GHz), RAM `31.9 GB`, Windows, Node `v26.13.1`, Headless Google Chrome (ผ่าน Playwright)
- **การปรับปรุง `tools/bot.cjs` & `tools/bot-matrix.mjs` (ไม่แตะ `src/` หรือ `tests/`):**
  1. **Windows Browser Fallback (`launchBrowser`):** รองรับ `PLAYWRIGHT_EXECUTABLE_PATH`, `PLAYWRIGHT_CHANNEL`, Playwright Chromium, และ fallback อัตโนมัติไป `channel: 'chrome'` / `channel: 'msedge'`
  2. **Path Normalization & Fail-Fast Exit:** แปลง Windows/MSYS path ผ่าน `resolveHtmlUrl()` และบังคับ `process.exit(1)` เมื่อเปิดเบราว์เซอร์ไม่ได้, job ผิด, page crash, หรือมี `pageerror` (`ALLOW_PAGE_ERRORS=1` เพื่อผ่อน)
  3. **แก้ Preset & เพิ่มช่องพารามิเตอร์:**
     - แก้ `monk` preset จาก ID ที่ตายแล้ว (`mk_i1..3`) เป็นโนดจริง (`mk_s1/2`, `mk_u1`, `mk_c1..4`, `mk_h1..2`) และแก้ `sage` preset ไม่ให้เกิน cap (`sg_e1: 4, sg_e3: 1`)
     - เพิ่ม `J2_ALLOC` (`crusader: {str:5,vit:6,int:4}`, `monk: {str:5,agi:4,vit:3,wis:3}`) เพื่อไม่ให้ Crusader/Monk สืบทอด `{wis:8,int:7}` ของ base Cleric
     - เพิ่ม `preset3` สำหรับ `paladin`, `champion`, `lordknight`, `warlord` (29 pts, max 2 ★) และรองรับ `J2TAL`/`TAL2` (`save.job2Talents`)
  4. **Non-Invasive Runtime Telemetry (ใน `p.evaluate`):** Hook `B.damageMon`, `B.execute`, `B.heal`, `B.clog.push` และ `dawnBonus` / `faithBurst` / `releaseHaymaker` / `fireSpears` เพื่อวัด `totalDmg`, `ultPct`, `nonUltDpt`, `ultDpt`, `s1Pct`, `s3Pct`, `basicPct`, `counterPct`, `procPct`, `dotPct`, `allyPct`, `healedHp`, `shieldSoaked`, `blocks`, `dodges` โดยไม่แก้ `src/`
  5. **Parallel Coordinator (`tools/bot-matrix.mjs`):** แตกแต่ละ config (`N=20`) เป็น shard ละ `5` รอบ รันขนาน `8` workers (`LITE=1`, `PICK=smart`, `POLL=15`, `TMO=150000` / `180000` สำหรับ Tower)

### 1.2 ข้อจำกัดที่ต้องทราบในการอ่านตัวเลข (Telemetry & Bot Caveats)
1. **การแยกหมวดหมู่ `Tempest Bell` (`allyPct` vs `ultPct`):** ใน `BattleScene.ts:2105-2110, 3297-3318` ระฆัง `Tempest Bell` ถูกเสกโดย Ult2 ของ Monk แต่ตอนระฆังดังและระเบิดจะรันผ่าน `allyCtx` ด้วย `src = 'other'`, `skillSlot = null` ทำให้ telemetry นับดาเมจระฆังเข้า **`allyPct` (ส่วน `nonUlt`)** แทน `ultPct` (เฉพาะคลื่นระเบิดเพิ่มตอนกดของ Champion เท่านั้นที่ใช้ `withSrc('ult')`) ในตาราง Monk/Champion จึงต้องอ่าน `ultPct` คู่กับ `allyPct` เสมอ
2. **`BOT_SEED` Determinism Caveat:** `BOT_SEED` patch `Math.random` ด้วย `mulberry32` ต่อ run ในหน้าเบราว์เซอร์, แต่ `Phaser.Math.Between` ใช้ `Phaser.Math.RND` ที่ seed ตอน boot เกม และลูป `setTimeout(..., POLL)` มีความคลาดเคลื่อนตามเฟรมเวลา จึงใช้ `N=20` ต่อ config (รวม 800 runs) เพื่อควบคุม variance
3. **Bot AI Limit:** บอทใช้ `PICK=smart` และกฎ Auto-Ult มาตรฐาน (`!boss || boss.charging || ...`) ซึ่งไม่สามารถกั๊กเทิร์นหรือจัดการจังหวะ `Grand Cross` / `Asura Strike` ได้เนียนเท่าผู้เล่นจริง ดังนั้นต้องดู **DPT + Ult% + MinHP + Turn Limit Timeouts** ประกอบกันกับ **Win Rate**
4. **บริบท `D` mapping ใน `bot.cjs`:** `D=2 DUN=1` = ดัน 2 (Lv 10); `D=5` = ดัน 5 (Lv 20, `CRAFTED=1 EXTRA=1 GRADE=4 REFINE=5`); `D=6` = ดัน 6 (Lv 45, `CRAFTED=1 EXTRA=1 REFINE=7`); `D=10` = ดัน 10 (Lv 85, `CRAFTED=1 EXTRA=1 REFINE=7`); `MODE=tower TOWER_MAX=35` = หอคอยชั้น 1–35
5. **`r1_matrix` Sandbox / Super-Budget Caveat (800 runs):** ชุด `r1_matrix.json` แรกใช้ config แบบ unconstrained เพื่อสำรวจเพดานสกิลในแต่ละสาย (`CL-02..14` ใช้แต้ม Class-1/ทาเลนต์แถว 4 เกินงบจริงของ Job Lv, `CR-01/02/05` ใช้แต้ม Job2 `43–46/39`, บาง config ข้าม parent node เช่น `cleric_b4j`/`cleric_a4x`/`cr_c4`/`cr_s4`/`cr_d4`, และ config D10 ที่ส่ง `STAR=1` โดน `bot.cjs:79` เดิมบังคับ `PL=5`) — ดังนั้นจึงแก้ `bot.cjs:79` ให้รักษา `PL=10/15` แล้วรันชุด **100% Tree-Legal Baseline (`N=240`)** เพิ่มใน **§6** เพื่อตรวจสอบความสอดคล้องของข้อสรุปทั้งหมดบน build ที่อัปได้จริงในเกม

---

## §2 Class 1 Cleric Evaluation (Cleric First: S1, S2, Ult/Core, Talents & Stat Spreads)

### 2.1 ตารางผลลัพธ์เชิงปริมาณ `CL-01..CL-14` (`N=20` ต่อ config)

| ID | Config / จุดโฟกัส | Gear / Mode | Win | Power (O / S) | MinHP | Turns (Peak) | Total DPT | **Non-Ult DPT** | **Ult%** | S1% | Basic% | Proc% | Dawn / Faith / Spear Dmg | Healed / Shield |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **CL-01** | Default Bot Baseline (`{wis:8,int:7}`, no tree) | D5 Crafted+5 | **20/20** | 395 (133 / 3,862) | 67% | 123.7 (40.9) | **288.2** | 182.1 | 36.8% | 42.0% | 11.8% | 7.4% | 0 / 0 / 2,004 | 2,593 / 2,854 |
| **CL-02** | S1 Judgement (`cleric_b`) + `cl_spear` + Miracle | D5 Crafted+5 | **20/20** | 633 (218 / 6,068) | 83% | 48.2 (16.6) | **710.4** | 501.1 | 29.5% | 47.6% | 9.6% | 11.5% | 0 / 0 / 3,787 | 924 / 1,306 |
| **CL-03** | **S1 Faith (`cleric_c`) + `cl_spear`** | D5 Crafted+5 | **20/20** | 572 (191 / 5,664) | 87% | **34.1 (11.5)** | **1,004.2** | **771.1** | **23.2%** | 26.6% | 6.5% | **42.4%** | 0 / **7,609** / 2,146 | 682 / 1,077 |
| **CL-04** | S2 `cl_renew` (`cleric_b`, vs Spear/Bless) | D5 Crafted+5 | **20/20** | 633 (218 / 6,068) | 85% | 52.8 (16.8) | **656.2** | 425.2 | 35.2% | 48.5% | 11.2% | 4.1% | 0 / 0 / 978 | 956 / 1,557 |
| **CL-05** | S2 `cl_bless` (Kyrie + Gloria, `cleric_b`) | D5 Crafted+5 | **20/20** | **710** (260 / 6,420) | 85% | 46.4 (14.6) | **735.7** | 480.1 | 34.7% | 46.9% | 12.0% | 5.6% | 0 / 0 / 1,270 | 601 / 1,432 |
| **CL-06** | Ult Sanctuary (`cleric_a`, `{str:5,vit:4,wis:3,int:3}`) | D5 Crafted+5 | **20/20** | 586 (177 / 6,426) | **88%** | 56.8 (18.9) | **617.0** | 360.2 | **41.6%** | 25.8% | 11.0% | 19.1% | 0 / 0 / 5,016 | 274 / 2,165 |
| **CL-07** | **Ult Dawn Light (`cleric_d`, `{str:6,wis:6,int:3}`)** | D5 Crafted+5 | **20/20** | 652 (234 / 6,001) | 87% | **41.3 (11.9)** | **829.9** | **565.1** | 31.9% | 25.7% | 11.5% | **29.5%** | **7,334** / 0 / 2,359 | 463 / 989 |
| **CL-08** | Stat Spread: Pure `{wis:8,int:7}` (`cleric_b`+core3) | D5 Crafted+5 | **20/20** | 617 (203 / 6,199) | 82% | 51.5 (16.6) | **693.3** | 483.0 | 30.3% | 44.8% | 8.1% | 15.9% | 0 / 0 / 5,100 | 788 / 1,576 |
| **CL-09** | Stat Spread: Hybrid `{str:6,vit:4,wis:5}` (`cleric_d`) | D5 Crafted+5 | **20/20** | 655 (207 / 6,832) | **88%** | 50.0 (15.2) | **710.0** | 473.9 | 33.3% | 22.5% | 12.0% | 30.0% | 7,530 / 0 / 2,996 | 414 / 1,440 |
| **CL-10** | Shop Gear D5 (no crafted, `cleric_b`) | D5 Shop | **20/20** | 340 (165 / 2,316) | 61% | 62.9 (21.9) | **561.9** | 398.4 | 29.1% | 44.9% | 9.5% | 15.3% | 0 / 0 / 4,414 | 1,070 / 2,325 |
| **CL-11** | Early D2 (`DUN=1`, Lv 10) | D2 Shop | **20/20** | 157 (75 / 1,084) | 87% | 22.9 (9.7) | **202.2** | 151.3 | 25.2% | 48.1% | 17.1% | 7.5% | 0 / 0 / 346 | 119 / 408 |
| **CL-12** | **D6 Anomaly Check (Base 45, Full Tree)** | D6 Crafted+7 | **20/20** | 963 (341 / 8,995) | 80% | 85.0 (36.0) | **1,723.7** | 1,334.1 | 22.6% | 30.0% | 5.8% | 41.1% | 27,014 / 0 / 23,692 | 1,610 / 4,846 |
| **CL-13** | **D6 `HARD=1` (`CLASS_K=1.8`)** | D6 HARD+7 | **0/20** | **963** (341 / 8,995) | **7%** | 74.5 (31.8) | **1,349.4** | 1,004.8 | 25.5% | 28.2% | 5.0% | 40.7% | 19,478 / 0 / 14,898 | 10,121 / 8,389 |
| **CL-14** | `cleric_b3s` Over-Stretch Check (D6) | D6 Crafted+7 | **19/20** | 993 (341 / 9,569) | 72% | 99.0 (40.6) | **1,509.1** | 1,100.2 | 27.1% | 35.4% | 7.4% | 29.6% | 10,185 / 0 / 27,055 | 3,025 / 5,676 |
| *CMP-01* | *บริบท: Swordsman Base D5 (`sw_guard`)* | *D5 Crafted+5* | *20/20* | *719 (200 / 8,516)* | *92%* | *60.4 (15.4)* | *585.3* | *441.1* | *24.6%* | *11.8%* | *25.5%* | *1.2%* | *—* | *280 / 1,542* |
| *CMP-02* | *บริบท: Mage Base D5 (`mg_mshield`)* | *D5 Crafted+5* | *20/20* | *481 (411 / 1,861)* | *90%* | *55.4 (15.2)* | *623.7* | *460.7* | *26.1%* | *19.6%* | *0.0%* | *50.9%* | *—* | *139 / 1,170* |

### 2.2 การวิเคราะห์เชิงลึกทีละสายสกิลของ Cleric

#### A. S1 (`cleric_s1p` + `cleric_b` ตัดสิน vs `cleric_c` ศรัทธา)
1. **ทำไม `cleric_c` (`CL-03`, `1,004.2` DPT) ทิ้งขาด `cleric_b` (`CL-02`, `710.4` DPT) ถึง +41.4%:**
   - **เหตุผลทางคณิตศาสตร์ใน `BattleScene.ts`:**
     - `cleric_b` (`CL-02`) ยิง `holyLight` (`1.4x Pm`, `BattleScene.ts:4569`) และทุกครั้งที่ 3 ยิง `วันพิพากษา` (`2.2x Pm` + `marked +15%`, `4564`) แต่ **ทั้งคู่รันด้วย `src = 'skill'` และไม่เคยห่อด้วย `withSrc('light')`** → ภายใต้ `CRIT_RULES` (`BattleScene.ts:3837-3839, 3943-3945`) จึงตกเป็น `isSkillHit()` ซึ่งเมื่อ `st.skillCrit === 0` จะคืนค่า **`0%` คริติคอลเสมอ**
     - ในทางกลับกัน `cleric_c` (`CL-03`) สะสม Faith ครบ 5 แล้วปล่อย `faithBurst()` (`BattleScene.ts:5056`) ซึ่งห่อด้วย **`this.withSrc('light', ...)`** → `ELEM_SRC.has('light') === true` (`perks.ts:15`) → ตกเป็น `isProcHit()` และได้ `spellCrit` จากเกียร์/ทาเลนต์ แถม `clFaith = 2.0x Pm` (Lv5) กระจายทุกตัว + ฮีล `clFaithHeal` + `clOverBurst` (`faithDmg: 7,609` = `42.4%` proc ใน D5)!
   - **ความเหลื่อมล้ำระหว่างสาย S1:** Judgement (`cleric_b`) ถูกออกแบบเป็นตัวโจมตี S1 โดยตรงแต่คริไม่ได้, ขณะที่ Faith (`cleric_c`) ได้ทั้ง AoE Burst คริได้, ฮีลแรงขึ้น (`+6%/stack` max `+30%`), และ `clOverBurst`
2. **บั๊ก `cleric_b3s` (`ใจนิ่ง`) Over-Stretch เหลือ `15% HP` (`trees/cleric.ts:35`, `tree.ts:183-202, 354`):**
   - `cleric_b3s` กำหนด `healAt: 0.1 * lv` (สเกลเก่า max 3 → threshold `75% - 30% = 45% HP`) และ **ไม่อยู่ใน `NO_STRETCH`** เมื่อผ่าน `stretchNode()` (`max 5`) + `class1Scale()` (`tree.ts:188, 201`) ที่ Job2 (`eff = 7.5`) threshold ลดเหลือ `75% - 45% = 30% HP`, และที่ Job3 (`eff = 10`) threshold ลดเหลือ **`75% - 60% = 15% HP`!**
   - ผลวัดจริงจาก `CL-14` (`D6`, `cleric_b3s:5`) เทียบกับ `CL-12`: แม้ `cleric_b3s` จะเพิ่ม `healAmp +50%` (ทำให้ `power` ขึ้น `963 → 993`) แต่ **DPT ตกจาก `1,723.7` เหลือ `1,509.1` (`-12.5%`)**, เทิร์นเฉลี่ยยืดจาก `85.0 → 99.0`, `meanMinHp` ลดจาก `80% → 72%`, และเกิด **1 loss (battle timeout ที่ห้อง 15 บอส)** เพราะแบ่งแต้มออกจาก `cleric_dn3/dn4` และดีเลย์จังหวะฮีล/สะสม Faith ใน D6
3. **เงื่อนไข `!ultWaiting` (`BattleScene.ts:1269`) ขัดขวาง S1 เกินจำเป็น:**
   - ในขณะที่ Swordsman (`1277`) ยอมร่าย S1 ถ้ารีซอร์สหลังหักค่าร่ายยังพอรอ Ult (`this.res - cost >= ultCost - regen`), Cleric (`1269`) ใช้ `!ultWaiting` แบบแข็ง ทำให้เทิร์นที่ Ult ถูกจองไว้ (โดยเฉพาะเมื่อ Mana เกือบเต็มแต่รอจังหวะบอสร่าย) Cleric จะ **งดทั้งฮีลฉุกเฉินและ Smite** ไปทั้งเทิร์น
4. **บั๊ก `cleric_t3_miracle` (`ปาฏิหาริย์`) (`trees/cleric.ts:72`):**
   - คำอธิบายเขียนว่า *"แสงและหอกแสงคริได้ 10%/18%"* แต่โค้ดให้ `{ spellCrit: 0.1 / 0.18 }` เท่านั้น ไม่มี `skillCrit` → ทำให้ **S1 Smite, S1 วันพิพากษา, Ult หอกแสง และ `ultHoly` คริ 0%** ขัดกับคำอธิบายตรงๆ และ `cl_bless_x` (`Gloria +30 LUK`) ก็เพิ่มเฉพาะ basic `crit`, `luckyDodge`, `critShield`, `spearLuck` โดยไม่ช่วยให้สกิลคริได้เลย

#### B. S2 (`cl_renew` ฟื้นฟู vs `cl_bless` พรแสง vs `cl_spear` หอกแสง)
- **เปรียบเทียบ `CL-04` (`cl_renew`), `CL-05` (`cl_bless`), `CL-02` (`cl_spear`) บนฐาน `cleric_b` เหมือนกัน:**
  - **`cl_bless` (`CL-05`):** **`735.7` DPT** (`46.4` เทิร์น, `power: 710`) — `+15 STR/DEX/INT/WIS` (uptime 3/5 เทิร์น = 60%), ล้างดีบัฟ 1, `Kyrie` โล่ `15%–25% HP` (3 ฮิต), ★ `Gloria +30 LUK` (`spearLuck +15%`, `crit +10%`) ที่ **30 Mana / CD 4** — เก่งรอบด้านที่สุดและปั่น `Hero Power` สูงสุด (`BLESS_UPTIME = 0.6` ใน `power.ts:73`)
  - **`cl_spear` (`CL-02`):** **`710.4` DPT** (`48.2` เทิร์น, `power: 633`, `spearDmg: 3,787`) — **20 Mana / CD 3** ถูกที่สุดและยิงหอกแสง 2–4 เล่มสาด `50%` รอบตัว (`off-stat +0.3%/DEX` ที่ `hero-stats.ts:351`) ร่วมกับ `cleric_t4_spear` ที่ฮีล `1% HP/เล่ม` ทำให้ sustain ดีในตัวโดยไม่ต้องร่าย `cl_renew`
  - **`cl_renew` (`CL-04`):** **`656.2` DPT** (`52.8` เทิร์น, `power: 633`) — **40 Mana / CD 5** แพงกว่า Ult (`30` Mana)! ฮีล `0.45x M.ATK` นาน 4–6 เทิร์น **เฉพาะเมื่อ `hp < maxHp`** และไม่มีผลเชิงรุกใดๆ (เว้นแต่พ่วง `cleric_c4` ★ `clOverBurst` ตอนเลือดเต็ม ซึ่งเงื่อนไข `hp < maxHp` ใน `BattleScene.ts:4411` ก็ไม่ค่อยเปิดให้ overheal อยู่ดี) → **เป็น S2 ที่อ่อนที่สุดชัดเจน (`-10.8%` DPT เทียบ `cl_bless`)**

#### C. Ult (`cleric_ultp`, `cleric_a` แสงคุ้มครอง vs `cleric_d` รุ่งอรุณ) & Core (`cleric_core1..3`)
1. **CRITICAL BUG — `cleric_ultp` ไม่เพิ่ม `ultPow` (`tree.ts:266-274`):**
   - `cleric_ultp` คืนค่า `{ clUltAtk: 0.15 * lv, clUltMana: 0 }` แทน `{ ultPow: 0.12 * lv }`
   - ผลกระทบลูกโซ่ที่ตรวจพบในโค้ด:
     - `clericUlt` (`BattleScene.ts:4955-4956`): `ultLights` ใช้ `hitPow = (1 + st.ultPow) * (1 + st.ultAmp)` และ `ultShield` ใช้ `pow = 1 + st.ultPow` → **ไม่ได้โบนัสแม้แต่ 1% จากการอัป `cleric_ultp`!**
     - `powerParts()` (`power.ts:55`): อ่าน `st.ultPow`, ไม่อ่าน `st.clUltAtk` → การอัป `cleric_ultp` ได้ **0 Hero Power**
     - `ult2()` ของ Job2 (`BattleScene.ts:3236, 3258, 3300, 3305`): ทั้ง **Crusader `Grand Cross`** (`gcPm`, `gcStr`, `gcBurn`, `ultShield`), **Monk `Tempest Bell`** (HP, เสียงระฆัง, ระเบิด), และ **Monk `Asura Strike`** รับ `p2`/`h2` จาก `st.ultPow` → **ไม่ได้สเกลจาก `cleric_ultp` เช่นกัน** (มีเพียง `gcAtk` ที่อ่าน `st.clUltAtk / g.n` ใน `BattleScene.ts:4922`)
2. **`cleric_a` (`CL-06`) vs `cleric_d` (`CL-07`):**
   - `cleric_d` (`CL-07`, `829.9` DPT, `41.3` เทิร์น, `dawnDmg: 7,334`) **แรงกว่า `cleric_a` (`CL-06`, `617.0` DPT, `56.8` เทิร์น) ถึง +34.5%** เพราะ `cleric_dn1..4` เปลี่ยนทุก 3 ฮิต basic/combo เป็นเวท `(STR + WIS + 0.1*M.ATK) * clDawn` (`clDawn = 2.0x` ที่ Lv5, `4.0x` ที่ Lv15) พร้อม ★ `cleric_dn4` คริแน่นอน `+50% critDmg` + บัฟ `WIS` (`cleric_dn3`)
   - ส่วน `cleric_a` (`41.6%` Ult) มีจุดติดขัดจริง 2 จุดคือ (1) `cleric_a3t` (`st.thorns` `25%–75%`) ทำงานที่ `BattleScene.ts:6101` (`absorbed * this.st.thorns` — **ไม่ได้ถูกเพดาน `BATTLE.reflectCap` จำกัด**เหมือน `j2Reflect` ที่ `6077` หรือ monster mirror reflect `m.reflect` ที่ `5352`), แต่จะทำงานเฉพาะดาเมจที่โดนดูดซับเข้า `this.shield` *หลังจาก* ผ่าน `this.kyrie` (`BattleScene.ts:6085-6102`) ทำให้เมื่อโล่หมดหรือมี `kyrie` กันอยู่หนามไม่ทำงาน และ (2) `cleric_a1` (`ultLights +1..5`) ไม่ได้แรงตาม `cleric_ultp` เพราะบั๊ก `ultPow` ข้างต้น
3. **Dead v84 Cleric Fields:** `clUltWard`, `clUltMend`, `clEmergency`, `clRevive` (`BattleScene.ts:4845-4846, 5070, 6402`) ยังค้างในเอนจินโดยไม่มีโหนดใดใน `trees/cleric.ts` มอบค่าให้
4. **Stat Spreads & `CLASS_K.cleric = 1.8` (`CL-08..CL-13`):**
   - `cleric_core1` + `cleric_core2` (`INT -> STR`, `WIS -> VIT`) ช่วยให้สาย caster (`CL-08` `{wis:8,int:7}` `693.3` DPT) เล่นคู่กับสมดุล `{wis:6,int:6,str:3}` (`CL-02` `710.4` DPT) และ bruiser `{str:6,vit:4,wis:5}` (`CL-09` `710.0` DPT, `meanMinHp 88%`) ได้ใกล้เคียงกันมาก
   - **D6 Normal vs HARD (`CL-12` vs `CL-13`):** ใน D6 Normal เมื่อใส่ build จริง (`CL-12`), Cleric ชนะ **`20/20`** (`1,723.7` DPT, `meanMinHp 80%`) ยืนยันว่าผล `0/8` ใน `awakening-crusader-v1.md` มาจาก bot preset เก่าที่ไม่อัป web/S2/talents **แต่ใน D6 `HARD=1` (`CL-13`) Cleric ตาย `0/20` (`18` ตาย, `2` หมดเทิร์น, `meanMinHp 7%`, จบเฉลี่ยห้อง `8.0/15`)** ทั้งที่ `Hero Power = 963` (`offense 341`, `survival 8,995`) — สะท้อนว่า **`CLASS_K.cleric = 1.8` + `+0.3 sustain` (`power.ts:25,65`) ปั่นตัวเลข Power สูงเกินขีดความสามารถจริงเมื่อเจอมอน `+50%` stats + `escalationAt` ใน HARD** (และทำให้ `overpowerMul` หักรางวัลใน Normal ทั้งที่ build ยังไม่ overgeared จริง)

---

## §3 Crusader & Paladin Evaluation (`CR-01..05` & `PA-01..05`)

### 3.1 ตารางผลลัพธ์เชิงปริมาณ Crusader & Paladin (`N=20` ต่อ config)

| ID | Build / Variant / Mode | Tier / Gear | Win | Power (O / S) | MinHP | Turns (Peak) | Total DPT | **Non-Ult DPT** | **Ult%** | S1% | **S3%** | Basic% | Healed / Shield | Blocks / Ctr |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **CR-01** | Guard/Devotion (`cr_s+cr_d`) | D6 Crafted+7 | **20/20** | 2,744 (458 / 54,382) | 86% | 50.4 (16.8) | **3,130.9** | 939.9 | **70.0%** | 6.6% | 15.4% | 3.7% | 16,885 / 1,418 | 13.8 / 10.9 |
| **CR-02** | Cross/GC (`cr_c+cr_u`) | D6 Crafted+7 | **20/20** | 2,419 (557 / 34,709) | 90% | **33.1 (9.6)** | **4,490.7** | 1,413.2 | **68.5%** | 8.9% | 13.1% | 2.4% | 4,388 / 1,101 | 13.7 / 5.3 |
| **CR-03** | Crusader Baseline (`J2LV=50`) | D10 Crafted+7 | **19/20** *(1 TO)* | 4,512 (590 / 113,988) | 85% | 80.9 (30.3) | **7,477.0** | 1,643.2 | **78.0%** | 4.8% | 11.3% | 2.3% | 28,645 / 6,453 | 23.9 / 24.1 |
| **CR-04** | Crusader `HARD=1` | D10 HARD+7 | **0/20** *(17 TO, 2 JS, 1 death)* | 4,512 (590 / 113,988) | **69%** | 146.6 (73.5) | **5,408.5** | 1,375.6 | **74.6%** | 6.7% | 12.5% | 2.0% | 65,852 / 48,814 | 86.5 / 47.4 |
| **CR-05** | Crusader Tower (`F1–F35`) | D6 Tower | **18/20** *(F25, F27)* | 2,744 (458 / 54,382) | 71% | 127.0 (34.6) | **3,828.6** | 860.3 | **77.5%** | 5.8% | 9.8% | 2.7% | 39,122 / 10,120 | 38.1 / 27.0 |
| **PA-01** | Paladin Var A (`Shield Chain`, Pure) | D10 Paladin+7 | **20/20** | 7,574 (773 / 245,217) | 83% | 74.0 (26.4) | **8,855.0** | 1,855.7 | **79.0%** | 4.2% | 10.4% | 1.9% | 37,994 / 4,616 | 28.1 / 23.9 |
| **PA-02** | Paladin Var B (`Pressure`, Pure) | D10 Paladin+7 | **20/20** | 7,574 (773 / 245,217) | 83% | 56.6 (16.3) | **11,071.3** | 1,860.4 | **83.2%** | 3.4% | 9.0% | 1.6% | 28,226 / 3,655 | 25.6 / 23.3 |
| **PA-03** | **Paladin Hybrid (`Monk mk_c1/h1`)** | D10 Paladin+7 | **20/20** | 7,909 (**842** / 245,697) | 83% | **54.0 (16.6)** | **11,382.3** | **2,793.4** | **75.5%** | 3.1% | **14.5%** | 2.8% | 26,007 / 3,048 | 23.0 / 18.6 |
| **PA-04** | Paladin `HARD=1` (Var B) | D10 HARD+7 | **1/20** *(18 TO, 1 JS)* | 7,574 (773 / 245,217) | **70%** | 184.8 (80.9) | **8,666.3** | 1,855.2 | **78.6%** | 3.8% | 12.7% | 1.3% | 103,061 / 43,077 | 125.3 / 52.1 |
| **PA-05** | Paladin Tower (`F1–F35`) | D10 Tower | **20/20** | 7,574 (773 / 245,217) | 86% | 89.2 (20.9) | **6,189.9** | 1,400.6 | **77.4%** | 4.1% | 11.5% | 1.9% | 37,622 / 3,512 | 44.9 / 32.6 |
| *CMP-03* | *บริบท: Knight D6 (`Brandish/Spiral`)* | *D6 Crafted+7* | *20/20* | *3,501 (765 / 52,942)* | *90%* | *30.3 (6.8)* | *4,782.9* | *3,465.5* | *27.5%* | *5.6%* | *22.1%* | *4.8%* | *1,334 / 892* | *6.0 / 25.8* |
| *CMP-05* | *บริบท: Lord Knight D10 (`Joint Beat`)* | *D10 LK+7* | *20/20* | *14,121 (3,191 / 206,603)* | *84%* | *42.0 (6.2)* | *13,705.0* | *8,948.9* | *34.7%* | *7.3%* | *16.7%* | *6.7%* | *5,016 / 1,200* | *2.8 / 10.3* |

### 3.2 ข้อค้นพบหลักของ Crusader & Paladin
1. **ปัญหาใหญ่ที่สุด: `Ult% 68.5%–83.2%` และ Non-Ult DPT ต่ำมาก (`940–1,860` DPT):**
   - `Grand Cross` / `Gospel Cross` (`BattleScene.ts:3234-3248, 4917-4948`) กินสัดส่วนดาเมจ **~70% (Job2)** และ **75.5%–83.2% (Job3)** เพราะยิง `4–6` pulses × `2` ครั้งต่อ pulse (`cr_c4` ★ ซ้อน) คิดทั้ง `gcPm`, `gcAtk`, `gcStr`, และเผา Mana + HP
   - ในทางกลับกัน **Non-Ult DPT** ของ Paladin Pure (`PA-01: 1,855.7`, `PA-02: 1,860.4`) ต่ำกว่า `CR-03` เพียงเล็กน้อย (แค่ `+13%`) และต่ำกว่า Knight/LK ชัดเจน (`CMP-03: 3,465.5` ใน D6, `CMP-05: 8,948.9` ใน D10) เพราะ `Holy Cross` (`1.0x P.ATK + 1.0x Pm` × 2 ฮิต) + `Basic` (`1.1x P.ATK`) ไม่ค่อยแรงและคริสกิลไม่ได้
2. **`CR-04` (`0/20`) และ `PA-04` (`1/20`) ใน D10 `HARD=1` — ไม่ตายแต่หมดเทิร์นยกแผง:**
   - ใน D10 HARD, `CR-04` มี `17` battle timeouts + `2` JS timeouts (`meanMinHp = 69%`, เหลือเลือด `8.5k–15.8k` ตอนหมดเทิร์น โดย `10/17` รอบต่ำกว่า `14.7k`) และ `PA-04` มี `18` battle timeouts + `1` JS timeout (`meanMinHp = 70%`, เหลือเลือด `12.4k–20.2k`)!
   - สาเหตุมาจาก **Offense/Survival Imbalance สุดขั้ว**: `PA-04` มี `survival = 245,217` (บล็อกเฉลี่ย `125.3` ครั้ง/รอบ, ฮีล `103,061`!) แต่ **`offense = 773`** เมื่อบวกกับ `+50%` monster stats + `escalationAt` ใน D10 HARD (`BattleScene.ts:636-637`) ทำให้บอทอยู่รอดได้ไม่จำกัดแต่ **ตีมอนไม่ทัน Turn Limit (`peak = 75–94` เทิร์น/ห้อง!)**
3. **Paladin Variant A (`Shield Chain`) vs Variant B (`Pressure`) vs Hybrid:**
   - `PA-02` (`Pressure`, `11,071.3` DPT, `56.6` เทิร์น) เร็วกว่า `PA-01` (`Shield Chain`, `8,855.0` DPT, `74.0` เทิร์น) `+25.0%` เพราะ `Pressure` เจาะ `100% DEF` (`pierce = 1`) ใส่บอส/มินิบอสที่มี DEF สูงใน D10 ได้ดีกว่า `Shield Chain` ที่โดนหัก DEF
   - **ข้อบกพร่องร่วมกันของ `holyVariant()` (`BattleScene.ts:2059-2084`):** ทั้ง Variant A และ B **เปลี่ยนจาก Hybrid `P.ATK + Pm` ของ Holy Cross เป็น Physical ล้วน**, ทิ้ง `M.ATK`/`INT`/`WIS` ที่สาย Cleric/Crusader ปั้นมา
   - **Hybrid (`PA-03`) ชนะ Pure (`PA-02`):** การหยิบ `mk_c1:5` (`+15%` combo) และ `mk_h1:5` (`+3% M.DEF`, `j2MdefDmg = +200% M.DEF` บนทุกฮิตกายภาพ) ดัน **Non-Ult DPT เพิ่ม `+50.1%` (`1,860.4 → 2,793.4`)** และ `s3Pct` จาก `9.0% → 14.5%` ลด `Ult%` จาก `83.2% → 75.5%`
4. **`CR-01` vs `CR-02` (D6) & ช่องโหว่อื่นๆ:**
   - `CR-02` (`cr_c + cr_u`, `4,490.7` DPT, `33.1` เทิร์น) เร็วกว่า `CR-01` (`cr_s + cr_d`, `3,130.9` DPT, `50.4` เทิร์น) **`+43.4%`** ด้วย `cr_c4` (GC 2 ครั้ง/pulse) + `cr_c1`
   - `crusader` ยังไม่ได้รับ `ultPow` จาก `cleric_ultp` (`tree.ts:271`), และ `skill-registry.ts:502` ยังไม่มี `paladin` ใน `J3_OF`

---

## §4 Monk & Champion Evaluation (`MK-01..04` & `CH-01..04`)

### 4.1 ตารางผลลัพธ์เชิงปริมาณ Monk & Champion (`N=20` ต่อ config)

| ID | Build / Variant / Mode | Tier / Gear | Win | Power (O / S) | MinHP | Turns (Peak) | Total DPT | **Non-Ult DPT** | **Ult%** | **Ally%** | S1% | **S3%** | Basic% | Proc% | Dawn / Spear |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **MK-01** | **Monk Combo + Bell (`mk_c+mk_s`)** | D6 Crafted+7 | **20/20** | 3,575 (1,663 / 25,407) | 91% | **54.3 (16.6)** | **2,718.2** | 2,718.2 | 0.0%* | **8.7%** | 6.8% | **16.1%** | 33.2% | **43.8%** | 29,811 / 8,886 |
| **MK-02** | Monk Haymaker (`mk_h+mk_c`) | D6 Crafted+7 | **18/20** *(2 TO r15)* | 3,723 (906 / 50,577) | 88% | 96.7 (34.3) | **1,659.9** | 1,659.9 | 0.0%* | **9.0%** | 15.2% | **18.9%** | 43.0% | 21.3% | 0 / 10,763 |
| **MK-03** | Monk Asura (`mk_a+mk_c`) | D6 Crafted+7 | **20/20** | 2,874 (1,604 / 17,028) | 92% | 61.8 (14.2) | **2,297.3** | 1,679.9 | **26.9%** | 0.0% | 15.7% | 13.7% | 15.3% | 28.1% | 26,273 / 8,547 |
| **MK-04** | Monk Baseline (`J2LV=50`) | D10 Crafted+7 | **19/20** *(1 TO r18)* | 9,545 (4,088 / 73,678) | 93% | 82.9 (27.9) | **7,615.8** | 7,615.8 | 0.0%* | **7.9%** | 3.9% | 10.9% | **44.6%** | 40.6% | 130,216 / 15,673 |
| **CH-01** | **Champion Var A (`Tiger Knuckle`, Pure)** | D10 Monk+7 | **20/20** | 13,089 (5,523 / 102,549) | 90% | **61.0 (20.5)** | **9,934.5** | **7,984.0** | **19.6%** | **4.1%** | 3.2% | **9.6%** | **37.4%** | 30.1% | 104,762 / 8,652 |
| **CH-02** | Champion Var B (`Chain Crush`, Pure) | D10 Monk+7 | **20/20** | 13,136 (2,580 / 221,072) | 87% | 93.7 (34.1) | **6,667.8** | 4,961.6 | **25.6%** | **5.0%** | 5.3% | **7.3%** | 24.6% | 36.9% | 133,341 / 14,523 |
| **CH-03** | Champion Asura + Hybrid (`cr_s/d`) | D10 Monk+7 | **18/20** *(2 TO r18)* | 12,236 (5,538 / 89,376) | 89% | 105.4 (32.2) | **5,530.3** | 4,417.0 | **20.1%** | 0.0% | 8.4% | 6.7% | 26.7% | 37.9% | 189,579 / 18,276 |
| **CH-04** | Champion Tower (`F1–F35`) | D10 Tower | **20/20** | 13,089 (5,523 / 102,549) | 94% | 82.6 (17.1) | **6,273.5** | 4,930.1 | **21.4%** | **3.3%** | 3.7% | 12.3% | 33.0% | 29.5% | 93,869 / 8,634 |
| *CMP-04* | *บริบท: Berserker D6* | *D6 Crafted+7* | *20/20* | *4,236 (2,937 / 20,199)* | *88%* | *27.7 (5.3)* | *4,958.6* | *4,146.8* | *16.4%* | *0%* | *8.9%* | *40.8%* | *30.8%* | *0.9%* | *—* |
| *CMP-06* | *บริบท: Warlord D10 (`Guillotine`)* | *D10 WL+7* | *20/20* | *21,191 (15,413 / 96,319)* | *88%* | *23.2 (5.0)* | *23,313.4* | *21,381.2* | *8.3%* | *0%* | *3.1%* | *14.2%* | *19.7%* | *52.9%* | *—* |
| *CMP-07* | *บริบท: Stalker D10 (`Assassinate`)* | *D10 Rogue+7* | *20/20* | *5,758 (20,248 / 5,414)* | *89%* | *29.0 (4.8)* | *20,051.7* | *13,291.0* | *33.7%* | *0%* | *7.0%* | *20.3%* | *4.6%* | *34.3%* | *—* |

*\*หมายเหตุ: ใน `MK-01`, `MK-02`, `MK-04` ระฆัง `Tempest Bell` ออกผ่าน `allyCtx` (`allyPct = 7.9%–9.0%`) จึงไม่ถูกรวมในคอลัมน์ `Ult%`*

### 4.2 ข้อค้นพบหลักของ Monk & Champion
1. **สัดส่วน Ult vs Non-Ult ดีต่อสุขภาพที่สุดในสาย Cleric, แต่ Non-Ult D6/D10 ยังตามหลังสาย DPS แท้:**
   - Monk (`MK-01` `0%+8.7%`, `MK-03` `26.9%`) และ Champion (`CH-01` `19.6%+4.1%`, `CH-02` `25.6%+5.0%`) ไม่พึ่ง Ult เกินขอบเขต (ต่างจาก Crusader/Paladin ที่ `68.5%–83.2%`), **แต่ Total DPT ใน D6 (`1,660–2,718`) และ D10 (`5,530–9,935`) ยังตามหลัง Crusader D6 (`4,491`) และ Job3 DPS (`13.7k–23.3k`)** ส่วนหนึ่งเพราะ Champion ไม่มี D10 Awakening crafted set เหมือน Lord Knight / Paladin / Ranger / Warlord และอีกส่วนจากบั๊ก S3/Ult ด้านล่าง
2. **`MK-01` (Combo + Bell) vs `MK-02` (Haymaker) vs `MK-03` (Asura):**
   - **`MK-01` (`2,718.2` DPT, `20/20`):** Synergy ระหว่าง `mk_c` (Combo +1 ฮิต, ramp `+20%/hit`, finisher `mk_c4`), `mk_s2` (Combo Thunder ฟรีเมื่อ ≥3 ฮิต), `cleric_d` (`dawnDmg: 29,811` ทุก 3 basic/combo hits!), และ `Tempest Bell` (`8.7% allyPct` + taunt 50%) ทำงานลื่นไหลที่สุด
   - **`MK-02` (`1,659.9` DPT, `18/20` 2 timeouts):** แพ้เวลาที่ Room 15 Boss (`60` turns peak!) เพราะ `Haymaker` (`BattleScene.ts:1740-1741`) ต้องรอโดนตีสะสม Grit ให้ครบ `15%–25% Max HP` ก่อน จึงไม่ทำงานถี่ในไฟต์บอสที่มี `cleric_a` + M.DEF + โล่คอยกันดาเมจ (ทั้งนี้ `tools/bot.cjs:250, 296` จับ `releaseHaymaker` โดยตรงและยืนยันว่า `haymakerDmg === 0` ตลอดทั้ง `20` รอบ เพราะการดึงมอนของ `Tempest Bell` (`9.0% allyPct`) ร่วมกับโล่และ `M.DEF` ทำให้ `minHp` เฉลี่ยอยู่ที่ `88%` จนแรงฮึด `monkGrit` สะสมไม่ถึง `triggerAt`)
   - **`MK-03` (`2,297.3` DPT, `20/20`):** แม้ `Asura Strike` จะยิง True Damage `26.9%` แต่ **โทษ `asuraExhaust = 4` (`3` เทิร์นเต็มที่ `ง่อยแดก`: 0 Mana/charge gain, `-40%` speed, `-35%` basic/combo, ล็อก S2/S3/Ult)** ทำให้เมื่อบอทกด Asura อัตโนมัติทุกคูลดาวน์ ดาเมจช่วงพักจะร่วงหนักกว่าปล่อย Bell (`-15.5%` DPT เทียบ `MK-01`)
3. **Champion Variant A (`CH-01`, `9,934.5`) vs Variant B (`CH-02`, `6,667.8`) vs Asura+Hybrid (`CH-03`, `5,530.3`):**
   - `CH-01` (`Tiger Knuckle`) ชนะขาดเพราะจับคู่ `mk_c` + `ch_l4` Stun + Combo/Dawn ต่อเนื่อง แม้จะมีบั๊ก S3 ก็ยังทำ Basic/Combo (`37.4%`) + Dawn (`104,762`) ได้เร็ว (`61.0` เทิร์น)
   - `CH-02` (`Chain Crush`) ทำได้แค่ `6,667.8` DPT (`-32.9%`) เพราะสูตร `Chain Crush` (`BattleScene.ts:1778-1780`) เป็น True Damage `(atk * 1.0 * base + mdef * maxHp * 0.04 + hpBonus)` ที่ **ไม่คูณ `pskill`, `j2MdefDmg`, `j2HpPunch`, `critMul` และทิ้ง `charges` กับ `mk_s1`**
   - `CH-03` (Asura + Crusader Hybrid) ต่ำสุด (`5,530.3` DPT, `18/20` 2 timeouts Room 18) เพราะเสียทั้ง `ch_l4` / `ch_g4` / `ch_r3` และโดน Exhaust `3` เทิร์นซ้ำๆ
4. **4 บั๊กสำคัญในโค้ดของ Monk & Champion:**
   - **บั๊ก #1 `championVariant()` ทิ้ง `charges` & `mk_s1` (`BattleScene.ts:1770-1802`):** บรรทัด `1772-1773` อ่าน `const n = this.charges; this.addCharges(-n)` แล้ว **ไม่เคยเอา `n`, `thunderAtkAdd()` (`mk_s1`), หรือ `j2ThunderPer` มาคำนวณดาเมจเลย** (แค่เอา `n` ไปโชว์ใน float text `Chain Crush x${n}`!) ทำให้การสะสม `🔵` สูงสุดถึง `9` ลูกของ Champion ไร้ค่าเมื่อกด Skill 3!
   - **บั๊ก #2 `ult2()` ของ Monk ข้าม `clericUltExtras()` (`BattleScene.ts:3295, 3319`):** ทั้งสาย Asura และสาย Tempest Bell `return` ทันทีโดยไม่เรียก `await this.clericUltExtras()` ทำให้ `clPurify` (ไฟชำระ), `ultHoly` (แสงลงทัณฑ์), และ `ultRegen` (พรยืนยาว) **ไม่ทำงานเลยบน Monk/Champion**
   - **บั๊ก #3 Retired Invoker/Chayula Stats บนของ Monk (`class-gear.ts:68-75`, `class-craft.ts:79-85`, `refine.ts:185`):** `c_mk_band`, `c_mk_beads`, `cc_mk_gi`, และ `CLASS_LINES.monk` ยังคงแจก `j2Es` (Energy Shield), `j2Dark` (Chaos/Dark), `j2Instill`, `j2NoLight` ที่ถูกถอดระบบออกไปแล้ว
   - **บั๊ก #4 `J3_OF` & Skill Info Gaps:** `skill-registry.ts:502` มีแค่ `{ knight: 'lordknight', berserker: 'warlord' }` ขาดทั้ง `paladin` และ `champion` และ `skill-math.ts` ยังไม่มี `skill3Info()` สำหรับแสดงตัวเลขจริงของ Skill 3 / Awakening Variants บนหน้าต่างสกิล

---

## §5 Prioritized Action Feed for M2, M3 & M4

ตารางจัดลำดับความสำคัญจากหลักฐาน Bot Run (800 runs) + โค้ดจริง เพื่อส่งต่อให้ **M2 (Cleric)**, **M3 (Crusader/Paladin & Monk/Champion)**, และ **M4 (Rework Plan S1/S2/S3-1)**:

| Priority | Target Milestone | ปัญหาที่พบ (Code + Evidence) | แนวทางแก้ไขที่แนะนำ |
|---|---|---|---|
| **P0** | **M2 (Cleric)** | `cleric_ultp` ให้ `clUltAtk` แทน `ultPow` (`tree.ts:271`) → `ultLights`, `ultShield`, `powerParts()`, GC/Asura/Bell ไม่สเกล | ให้ `cleric_ultp` ออก **`ultPow` ควบคู่ `clUltAtk`** (หรือปรับสูตร `clericUlt`/`ult2` ให้ไม่ double-dip smash) |
| **P0** | **M2 (Cleric)** | `cleric_t3_miracle` ให้แค่ `spellCrit` (`trees/cleric.ts:72`) → S1 Smite/Judgement/Ult Lights ติด `0%` crit (`BattleScene.ts:3943-3945`) | เพิ่ม **`skillCrit`** ใน `cleric_t3_miracle` (และตรวจ `Gloria` / `withSrc('light')` ตามเกณฑ์ `CRIT_RULES`) |
| **P0** | **M2 (Cleric)** | `cleric_b3s` (`ใจนิ่ง`) `healAt` โดน `class1Scale` ยืดเหลือฮีลที่ **`15% HP`** ที่ Lv 15 (`CL-14` DPT ตก `-12.5%` + 1 timeout) | จำกัด `healAt` ด้วย `NO_STRETCH` หรือ cap ที่ `0.30` (ไม่ต่ำกว่า `45% HP`) และให้เฉพาะ `healAmp` เติบโตต่อหลัง Lv 5 |
| **P0** | **M3 (Monk/Champ)** | `championVariant()` (`BattleScene.ts:1770-1802`) ล้าง `charges` ทิ้งโดยไม่สเกล `n`, `mk_s1`, `j2ThunderPer` + `Chain Crush` (`s3Pct 7.3%`) อ่อนกว่า `Tiger Knuckle` (`-32.9%`) | ให้ทั้ง `Tiger Knuckle` และ `Chain Crush` สเกลตาม **`charges` ที่จ่าย**, `j2ThunderPer`, และ `mk_s1` (`thunderAtkAdd()`) พร้อมปรับสูตร `Chain Crush` |
| **P0** | **M3 (Monk/Champ)** | `ult2()` ของ Monk (`BattleScene.ts:3295, 3319`) ข้าม `clericUltExtras()` (`clPurify`, `ultHoly`, `ultRegen` ดับ) | เรียก `await this.clericUltExtras()` ก่อน `return` ทั้งสองสาย (`Asura` และ `Tempest Bell`) |
| **P1** | **M2 / M1-Calib** | `CLASS_K.cleric = 1.8` + `+0.3 sustain` (`power.ts:25,65`) ปั่น Hero Power จน `CL-13` (D6 HARD) ตาย **`0/20`** และ `CR-04`/`PA-04` (D10 HARD) Timeout **`17–18/20`** | ปรับเทียบ `CLASS_K.cleric` (และ `JOB2_K`/`JOB3_K` หลัง M2/M3) ให้สะท้อน DPS จริง และลดความเหลื่อมล้ำ `offense vs survival` |
| **P1** | **M2 (Cleric)** | ความสมดุล S1/S2/Ult: `cl_renew` (`40` Mana, `656.2` DPT) แพ้ `cl_bless` (`735.7`) & `cl_spear` (`710.4`); `cleric_a` (`617.0`) แพ้ `cleric_d` (`829.9`); `cleric_b` (`710.4`) แพ้ `cleric_c` (`1,004.2`); `!ultWaiting` ล็อก S1 แบบแข็ง | ลด Mana `cl_renew` / เพิ่ม utility; ปรับ `cleric_a` (ปลดล็อก `ultPow` ให้ `cleric_ultp` + เพิ่ม offense/counter หรือปรับจังหวะหนามที่ติดเงื่อนไข `shield` หลัง `kyrie`) & เติมพลัง `cleric_b`; ผ่อน `!ultWaiting` แบบเดียวกับ Swordsman |
| **P1** | **M3 (Crusader/Pal)** | **`Ult% 68.5%–83.2%`** สูงเกินไป, Non-Ult DPT ต่ำ (`940–1,860`), และ Paladin `holyVariant()` ทิ้ง `Pm` ทำให้ D10 HARD หมดเทิร์น (`0/20`, `1/20`) | ย้ายน้ำหนักดาเมจจาก `Grand/Gospel Cross` มาที่ **Non-Ult (`Holy Cross`, `Shield Chain`, `Pressure`, `Shield Press`, `Earth Drive`)**, คืน hybrid `Pm` หรือเพิ่มตัวคูณ/DEF-Scaling ที่สมดุล |
| **P1** | **M3 (Monk/Champ)** | `MK-02` Haymaker (`1,659.9` DPT, `18/20` 2 timeouts) Trigger ช้าเมื่อมีโล่/ฮีล, และ `MK-03`/`CH-03` Asura `ง่อยแดก` 3 เทิร์นกด DPT หนัก | ปรับจังหวะ Grit / threshold ของ Haymaker ให้คล่องตัวขึ้น และทบทวนความหนัก/ระยะเวลา Exhaust หรือผลตอบแทนของ Asura |
| **P2** | **M3 (Data/UI)** | Retired stats (`j2Es`/`j2Dark`/`j2Instill`/`j2NoLight`) บน Monk gear/craft/refine (`class-gear.ts:68-75`, `class-craft.ts:79-85`, `refine.ts:185`), `J3_OF` ขาด `paladin`/`champion`, และ dead v84 Cleric fields | แทนที่ stat ปลดระวางด้วย stat Monk จริง (`j2MdefDmg`, `j2GritRate`, `j2HpPunch`, `j2BellMdef`, `j2AsuraPow`, `j2ComboRamp`), เพิ่ม `paladin`/`champion` ใน `J3_OF`, เพิ่ม `skill3Info()` + เก็บกวาด dead v84 fields |
| **P1** | **M4 (Rework Plan)** | วางแผน Rework ระยะยาวสำหรับ **S1, S2 และ S3-1 (Cleric → Crusader/Paladin → Monk/Champion)** พร้อมคง Save-Data IDs และเทียบผล Before/After Bot Runs | ออกแบบ Before/After spec รายโหนดใน `docs/design/cleric-crusader-monk-rework-v1.md` + รัน Bot Matrix ซ้ำหลัง M2–M3 จบ |

---

## §6 Tree-Legal Baseline Verification (`N=240` Runs, Post-`bot.cjs:79` Fix)

เพื่อยืนยันว่าข้อค้นพบทั้งหมดจาก `r1_matrix` (800 runs) ไม่ได้เกิดจากงบแต้มเกิน/ข้าม parent node หรือบั๊ก `bot.cjs:79` ที่เคยลด `PL=10/15` เหลือ `5` เมื่อใส่ `STAR=1`, ได้สร้าง `legal_matrix.json` จำนวน **12 configs × 20 runs = 240 runs** (`failedShards = 0`, `errors = 0`, `wallSec = 961.0s`) โดยตรวจผ่าน `esbuild` script กับ `src/data/tree.ts`, `src/data/jobs3.ts`, และ `src/save.ts` (`lockReason` / `lockReason3` / `syncClass1` / `TALENT_RULES` / `NO_STRETCH`) พบ **`TOTAL_VIOLATIONS = 0`** ทุก config:

- **งบแต้มที่ใช้จริง:** `D=5` (`jobLv=20`) ใช้ Class-1 **`19/19`** และ Talent แถว 1–3 **`4/4`** (แถว 4 ล็อก); `D=6` Cleric (`jobLv=40`) ใช้ Class-1 **`39/39`** และ Talent แถว 1–4 **`8/8`**; `D=6` Job2 (`J2LV=40`) ใช้ Class-1 **`78/78`** (จาก `syncClass1`) + Job2 **`39/39`** + `PL=10`; `D=10` Job2 (`J2LV=50`) ใช้ Class-1 **`88/88`** + Job2 **`49/49`** + `PL=10`; `D=10` Job3 (`J2LV=50 J3LV=30`) ใช้ Class-1 **`117/117`** + Job2 **`49/49`** + Job3 **`29/29`** + `PL=15`

### 6.1 ตารางผลลัพธ์ Tree-Legal Baseline (`N=20` ต่อ config)

| ID | Legal Config (Budget) | Tier / Gear | Win | Power (O / S) | MinHP | Turns (Peak) | Total DPT | **Non-Ult DPT** | **Ult%** | Ally% | S1% | S3% | Basic% | Proc% | Dawn / Faith / Spear | Heal / Shield / Blk / Ctr |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **CL-L02** | Cleric D5 S1 Judgement (`19/19`, T1–3 `4/4`) | D5 Crafted+5 | **20/20** | 492 (159 / 5,039) | 83% | 69.3 (21.6) | **514.5** | 327.0 | 36.4% | 0% | 32.3% | 0% | 11.7% | 18.2% | 0 / 0 / 5,012 | 990 / 1,916 / 0 / 5.4 |
| **CL-L03** | **Cleric D5 S1 Faith (`19/19`, T1–3 `4/4`)** | D5 Crafted+5 | **20/20** | 465 (146 / 4,896) | 83% | **53.4 (18.0)** | **644.4** | **466.7** | **27.6%** | 0% | 27.0% | 0% | 9.2% | **34.4%** | 0 / **2,809** / 3,770 | 1,107 / 1,462 / 0 / 5.3 |
| **CL-L06** | Cleric D5 Ult Sanctuary (`19/19`, T1–3 `4/4`) | D5 Crafted+5 | **20/20** | 493 (131 / 6,154) | 87% | 83.9 (26.9) | **418.1** | 264.0 | 36.9% | 0% | 17.6% | 0% | 15.2% | 27.6% | 0 / 0 / 7,352 | 542 / 3,128 / 0 / 10.1 |
| **CL-L07** | **Cleric D5 Ult Dawn Light (`19/19`, `cl_bless`)** | D5 Crafted+5 | **20/20** | 459 (169 / 4,113) | 83% | 64.8 (19.9) | **548.8** | 360.1 | 34.4% | 0% | 25.1% | 0% | 14.8% | 23.1% | **3,447** / 0 / 4,372 | 533 / 1,790 / 0 / 6.4 |
| **CL-L12** | Cleric D6 Normal (`39/39`, T1–4 `8/8`) | D6 Crafted+7 | **18/20** *(2 TO r15)* | 934 (312 / 9,225) | 78% | 102.5 (39.9) | **1,517.0** | 1,066.0 | 29.7% | 0% | 28.8% | 0% | 6.6% | 34.4% | 18,829 / 0 / 27,488 | 2,213 / 5,381 / 0 / 4.8 |
| **CL-L13** | **Cleric D6 `HARD=1` (`39/39`, T1–4 `8/8`)** | D6 HARD+7 | **0/20** *(14D, 6TO)* | **934** (312 / 9,225) | **14%** | 106.5 (46.5) | **1,154.7** | 794.2 | 31.2% | 0% | 26.1% | 0% | 4.6% | 37.7% | 13,944 / 0 / 25,770 | 11,099 / 11,357 / 0 / 7.5 |
| **CR-L02** | Crusader D6 Cross/GC (`78/78`, `J2 39/39`, `PL=10`) | D6 Crafted+7 | **20/20** | 2,920 (714 / 39,460) | 90% | 27.8 (7.0) | **5,573.5** | 1,469.9 | **73.6%** | 0% | 8.2% | 9.9% | 1.7% | 5.7% | 0 / 0 / 6,207 | 4,943 / 964 / 10.8 / 7.8 |
| **CR-L03** | Crusader D10 (`88/88`, `J2 49/49`, `PL=10`) | D10 Crafted+7 | **20/20** | 6,328 (952 / 139,037) | 87% | 62.3 (20.1) | **10,391.1** | 2,298.5 | **77.9%** | 0% | 7.9% | 9.7% | 1.7% | 1.8% | 0 / 0 / 9,579 | 27,852 / 4,784 / 18.9 / 24.6 |
| **PA-L02** | Paladin Var B Pressure (`117/117`, `J3 29/29`, `PL=15`) | D10 Paladin+7 | **20/20** | 11,807 (1,397 / 329,915) | 88% | 41.8 (12.0) | **15,146.7** | 2,743.8 | **81.9%** | 0% | 5.9% | 8.0% | 1.1% | 2.2% | 0 / 0 / 5,848 | 27,797 / 2,315 / 22.6 / 21.4 |
| **MK-L01** | **Monk D6 Combo+Bell (`78/78`, `J2 39/39`, `PL=10`)** | D6 Crafted+7 | **20/20** | 5,131 (2,130 / 40,873) | 91% | **46.5 (14.4)** | **3,161.0** | 3,161.0 | 0.0%* | **6.3%** | 7.3% | 14.3% | 28.8% | 49.3% | 45,285 / 0 / 8,366 | 356 / 468 / 0 / 1.3 |
| **MK-L02** | Monk D6 Haymaker (`78/78`, `J2 39/39`, `PL=10`) | D6 Crafted+7 | **20/20** | 5,345 (1,249 / 75,600) | 90% | 83.8 (31.2) | **1,865.1** | 1,865.1 | 0.0%* | **9.1%** | 17.8% | 15.1% | 44.4% | 20.1% | 0 / 0 / 8,456 | 619 / 1,562 / 0 / 10.1 |
| **CH-L01** | **Champion Var A Tiger Knuckle (`117/117`, `PL=15`)** | D10 Monk+7 | **20/20** | 20,980 (8,752 / 166,249) | 89% | **45.1 (14.6)** | **13,635.2** | **11,641.5** | **14.6%** | **2.2%** | 4.4% | 8.5% | 28.8% | 43.6% | 206,893 / 0 / 7,070 | 904 / 367 / 0.2 / 0.4 |

### 6.2 เปรียบเทียบ Legal vs Sandbox & ข้อสรุปที่ยืนยันตรงกันสำหรับ M2 / M3 / M4

1. **ลำดับความเก่ง-อ่อนของ Cleric D5 ยังคงเดิม 100% (M2):**
   - `CL-L03` Faith (`644.4` DPT) > `CL-L07` Dawn Light (`548.8` DPT) > `CL-L02` Judgement (`514.5` DPT) > `CL-L06` Sanctuary (`418.1` DPT) — ยืนยันว่า `cleric_c` แซง `cleric_b` (`+25.2%`) และ `cleric_d` แซง `cleric_a` (`+31.3%`) แม้ใส่งบแต้มจริง `19/19` + แค่ Talent แถว 1–3 (`4/4`) ส่วน `cleric_b` และ `cleric_a` ยังถูกบั๊ก `cleric_ultp` (`ultPow = 0`) และ `cleric_t3_miracle` (`skillCrit = 0`) กดไว้เช่นเดิม
2. **Cleric D6 (`CL-L12` vs `CL-L13`) ยิ่งตอกย้ำปัญหา `CLASS_K.cleric = 1.8` (M2):**
   - เมื่อลดแต้ม Class-1 จากชุด sandbox `50` แต้มมาอยู่ในงบจริง **`39/39`**, แม้แต่ `CL-L12` (Normal) ยังมี **`2/20` Turn-Limit Timeouts ที่ห้อง 15 บอส** (`1,517.0` DPT vs `1,723.7`) และ `CL-L13` (`HARD=1`) ยังคงแพ้ **`0/20`** (`14` ตาย + `6` หมดเทิร์น, `meanMinHp = 14%`, จบเฉลี่ยห้อง `8.4/15`) — ยืนยันว่า `CLASS_K.cleric` สูงเกินจริง
3. **Crusader / Paladin (`CR-L02`, `CR-L03`, `PA-L02`) ยังพึ่ง Ult `73.6%–81.9%` แม้แก้ `PL=10/15` และใช้แต้ม Class-1 เต็มงบ (M3):**
   - เมื่อเปิด `PL=10/15` และลง Class-1 ครบ `78/88/117` แต้ม, Power และ DPT เพิ่มขึ้นชัดเจน (`PA-L02` `15,146.7` vs `PA-02` `11,071.3`; `CR-L03` `10,391.1` vs `CR-03` `7,477.0`) และชนะ `20/20` ใน D10 Normal, **แต่สัดส่วน Ult% ยังค้างอยู่ที่ `73.6%–81.9%`** (Non-Ult DPT แค่ `1,470–2,744`) ซึ่งตอกย้ำภารกิจ M3 ในการย้ายน้ำหนักดาเมจกลับมาที่ `Holy Cross` / `Shield Chain` / `Pressure` / `Shield Press` / `Earth Drive`
4. **Monk / Champion (`MK-L01`, `MK-L02`, `CH-L01`) ยืนยันคอขวด Haymaker & Champion S3 (M3):**
   - `MK-L01` Combo+Bell (`3,161.0` DPT, `0%` direct Ult + `6.3%` Ally) ชนะ `MK-L02` Haymaker (`1,865.1` DPT, `83.8` เทิร์น, **`-41.0%`**) และ **`haymakerDmg` ยังคงเป็น `0` ตลอด 20 รอบ** เพราะ `Bell` taunt + `Kyrie` (`PL=10` = `22.5% HP`) + `M.DEF` รักษา `meanMinHp = 90%` จน `monkGrit` ไม่เคยถึง `triggerAt`
   - `CH-L01` Tiger Knuckle (`13,635.2` DPT, `11,641.5` Non-Ult, `14.6%` Ult) มีสัดส่วน Ult สุขภาพดีที่สุดในสาย Cleric และทำ Non-Ult สูงกว่า `PA-L02` ถึง `4.24x` แต่ `s3Pct` อยู่ที่ **`8.5%`** เท่านั้นเพราะ `championVariant()` ยังทิ้ง `charges` โดยไม่สเกล — ชุด `legal_matrix.json` นี้จึงพร้อมใช้เป็น **Before Baseline สำหรับเปรียบเทียบใน M4** ได้ทันที
