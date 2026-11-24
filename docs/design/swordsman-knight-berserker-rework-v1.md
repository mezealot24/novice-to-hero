# ⚔️ Swordsman Class 1 & Class 2 (Knight / Berserker) Rework + Passive Constellation Rebalance v2

> **Status:** `proposal-v2` (Proposal-Only — ยังไม่แก้ `src/` หรือ `tests/`) · **Stack:** Phaser 3.90.0 + TypeScript strict + Vite single-file  
> **ขอบเขต:** รีเวิร์คสกิลและพาสซีฟที่ต่ำกว่ามาตรฐานของ **⚔️ Swordsman (Class 1)**, **🐴 Knight (Class 2A)**, และ **🪓 Berserker (Class 2B)** พร้อมปรับสมดุล **Swordsman Passive Constellation (`src/data/passives/swordsman.ts`)** และลดการพึ่งพาดาเมจ Ultimate เกินสมควร  
> **เอกสารอ้างอิงในโค้ดเบส:** `src/data/jobs.ts`, `src/data/jobs2.ts`, `src/data/skill2.ts`, `src/data/skill4.ts`, `src/data/skill-math.ts`, `src/data/skill-registry.ts`, `src/data/tunables.ts`, `src/data/battle-rules.ts`, `src/data/tree.ts`, `src/data/trees/swordsman.ts`, `src/data/trees2/knight.ts`, `src/data/trees2/berserker.ts`, `src/data/trees3/{lordknight,warlord}.ts`, `src/data/passives/swordsman.ts`, `src/data/passives/swordsman-awaken.ts`, `src/data/passive-battle.ts`, `src/data/meta/hero-stats.ts`, `src/data/mon-stats.ts`, `src/data/dungeon-defs.ts`, `src/data/d14.ts`, `src/data/combine-items.ts`, `src/save.ts`, `src/scenes/BattleScene.ts`

---

## 0. สรุปสั้น (So What)

- **ปัญหาหลัก 1 — Ult ครอบงำสมดุล (`52%–90%+` ของดาเมจทั้งหมดในสาย Swordsman / Knight):**  
  `swordCoatPct` (`src/data/jobs.ts:82-86`, `src/scenes/BattleScene.ts:1491`) แปลง **% HP ปัจจุบันของเป้าแบบไม่จำกัดเพดาน** เข้าไปบวกใน `mul` *ก่อน* `roll()` (`critMul`, `atkMul`, `j2Mul`) และคูณซ้ำด้วย `swordExecMul` (`+200%` ถึง `+310%`, บอสครึ่งเดียว) · สำหรับ **Knight (`Pierce of Judgement`)** `ult2()` รัน `swordAwaken` *ก่อน* `knightPierce()` (`BattleScene.ts:3227-3229`) ทำให้ **ทั้ง `4–5` ฮิตของ `Pierce` + `🔱 คลื่นทะลวง`** ได้ทั้ง `awakenStr`, `swAwAtk (+50%)`, `swordCoatPct` (บนบอส 556k HP อย่าง `protozero` เท่ากับ **`+32.46x P.ATK/ฮิต`** pre-execute หลังคิด `SWORD_MANA.awakenBigShare = 0.5` ตาม `BattleScene.ts:1491`, และพุ่งถึง `~+64.9x P.ATK/ฮิต` หลังคูณ `2.0x` boss execute ที่ missing HP ลึก) และ `1.0x` เต็มของ `swordExecMul` ส่งผลให้ Knight Endgame พึ่ง Ult ถึง **90.4%** ของดาเมจรวม (`S3 Brandish` เหลือ `1.8%`, `S4 Spiral Pierce` เหลือ `0.5%`)
- **ปัญหาหลัก 2 — บั๊กและกลไกที่ตาย/ขัดขากันเองใน Non-Ult Kit:**  
  1. **`CRIT_RULES.skillFromCrit = 0` (`battle-rules.ts:54`, `BattleScene.ts:3846-3849`)** ทำให้ `waveCrit = +20%` ของ Berserker `คลื่นดาบ` และ `ultCrit = +30%` ของ `บ้าระห่ำ` ตอนฟันหมู่ (`isSkillHit()`) ถูกตัดเป็น **0%** (แม้ `ultCrit` จะทำงานบน Basic/Combo/Counter ที่ `BattleScene.ts:1500` อยู่แล้วก็ตาม)  
  2. **`sw_blood` & `sw_k_bloodvamp` ตัดดาเมจสกิลเองสูงสุด -35%:** แม้ `S2N.bloodAtk = 0.20` (`sw_blood_x`) **ถูกอ่านและคูณใน `BattleScene.ts:6540` (`atkMul()`) อยู่แล้ว** (ทุก `roll()` ที่ `BattleScene.ts:5087`), แต่ `SPELL_VAMP.bloodCut = 0.15` (`jobs.ts:122`) และ `sw_k_bloodvamp` `skillDmgCut = 0.20` (`passives/swordsman.ts:689`) รวมกันตัดดาเมจสกิล/Ult สูงสุด **-35%** (`BattleScene.ts:3858`)  
  3. **`swordsman_s1p` `s1Pow`** ไม่ถูกคูณเข้า `swordS1()` (`BattleScene.ts:4632`) หรือ `autoInfo()` (`skill-math.ts:912`), ขณะที่ `base * baseLv` (`20..200 * 99 = 19,800`) สเกลเป็นค่าแบนสูงเกินเมื่อไม่มี soft cap หลัง Lv 35  
  4. **`swAwLeech` (`swordsman_a2`)** เช็กเฉพาะ `this.src === 'basic'` (`BattleScene.ts:1563`) จึงไม่ดูดเลือดจาก `combo` และ `counter`  
  5. **`swWaveAmp` (`BattleScene.ts:4536, 4598`)** และ **`j2RageTurn` (`trees2/berserker.ts:22`)** เป็นคีย์ตายที่ไม่มีตัวจ่าย/ตัวอ่านจริง  
  6. **`Auto Guard` vs `sw_guard`**: บล็อกที่ `BattleScene.ts:5805` return ก่อนถึง `guardPool += n` (`5841`) ทำให้ Auto Guard **อดสะสม `guardPool`** · **`skill3Turn` (`BattleScene.ts:2925`)** ไม่กัน Mana ไว้ให้ Ult ทำให้ `Brandish Spear` แย่ง Mana จนดีเลย์ `Pierce` · **`swordsman_a1..a4` & `d1, d3` (6 โหนดในใย Class 1 Ult)** ตายสนิทบน **Berserker** เพราะไม่เข้า `swAwaken`
- **แนวทางแก้ไขและผลลัพธ์เชิงตัวเลข (จำลองจากสูตรจริงของเกม — ทุก Scenario Ult% ลดลง & Non-Ult DPS เพิ่มขึ้น):**  
  - ปรับ `swordCoatPct` ให้เป็น **โบนัสหลัง `roll()` แบบมีเพดานอิง `P.ATK`** (`coatAtkCap = 1.25 × st.atk`, บอส `×0.5`, `knightPierce` multi-hit ได้ `coatShare = 0.5`, ไม่คูณ `critMul`/`swordExecMul`), จำกัด `knightPierce` ใช้ `execLineShare = 0.25` (ให้ `🔱 คลื่นทะลวง` ใช้ `1.0x` execute เป็นท่าปิดฉาก), และปรับ `swAwAtk` `0.50 → 0.15` (คงเฉพาะ `swAwaken > 0` ไม่ใส่ให้ `rampage`/Warlord)  
  - แก้บั๊ก `waveCrit`/`ultCrit` บน `isSkillHit()`, ถอดโทษ `bloodCut` & `skillDmgCut` (แลก `bloodTaken +10%` และ `def -15 / mdef -5%`), เชื่อม `Auto Guard` เข้า `guardPool` ด้วย `50%` ของดาเมจประมาณการหลัง mitigation (`mitigatedEst`), เปิด `swordsman_a1..a4` + `d1, d3` ให้ Berserker, แยก `waveCdJ2: 2` เฉพาะ Berserker (`this.st.j3Wl <= 0`) เพื่อไม่กระทบ Warlord, และปรับ 14 โหนดใน `src/data/passives/swordsman.ts` **โดยไม่เปลี่ยนหรือลบ Save-Data ID ใด ๆ ทั้งสิ้น**  
  - **ผลลัพธ์เชิงตัวเลข (§4.2):**
    - **Swordsman Mid:** `1a` Ult **`52.6% → 32.0%`** (Non-Ult DPS `1,884 → 2,359`) · `1b` (`3× hellknight` Lv 19) Ult **`52.4% → 30.4%`** (Non-Ult DPS `2,817 → 3,670`)
    - **Knight:** `2a` (`pharaoh`) Ult **`76.4% → 45.6%`** (Non-Ult DPS `5,680 → 9,690`) · `2b` (`protozero`) Ult **`90.4% → 41.3%`** (`S3` `34.3k → 190.4k`, `S4` `10.2k → 95.6k`, Non-Ult DPS `10,143 → 24,562`) · `2c` (`3× clonesword`) Ult **`83.8% → 44.4%`** (Non-Ult DPS `14,324 → 30,677`)
    - **Berserker:** `3a` (`pharaoh`) Ult **`35.3% → 19.2%`** (Non-Ult DPS `7,085 → 20,128`) · `3b` (`protozero`) Ult **`31.9% → 24.7%`** (Non-Ult DPS `16,442 → 57,261`, `S3 คลื่นดาบ` `593.3k` นำหน้า `S1` `248.1k`) · `3c` (`3× clonesword`) Ult **`24.3% → 16.9%`** (Non-Ult DPS `18,490 → 55,665`, `S3` `280.1k` vs `S1` `112.7k`)

---

## 1. การตรวจสอบครบทุกส่วนแบบราย ID (Complete Per-ID Inventory Audit — R1)

เกณฑ์สถานะ (`Verdict`):
- **`Keep`** — ทำงานถูกต้องและมีบทบาทชัดเจน คงค่าเดิม
- **`Tune`** — โครงสร้างดี แต่ต้องปรับตัวเลข/เงื่อนไข/คูลดาวน์/ค่าร่าย
- **`Rework`** — กลไกอ่อนเกินไป/ซ้ำซ้อน/หลุดคอนเซ็ปต์ ต้องปรับพฤติกรรมใหม่
- **`Fix Bug`** — มีบั๊กการเชื่อมค่าใน `BattleScene.ts` / `battle-rules.ts` / `skill-math.ts`
- **`Retired-Preserve-ID`** — ถูกแทนที่แล้วในระบบจริง (`jobTalents`/`job2Talents` ที่ถูก `hasPassiveTree('swordsman')` ปิดใช้งาน) คง ID ไว้เพื่อความเข้ากันได้ของเซฟ

### 1.1 Class 1: Swordsman (`swordsman`) — Base Kit, Skill Web 30 โหนด & 12 Retired Talents

#### A. Base Kit & Core Mechanics (`JOBS.swordsman`, `SWORD_S1`, `SWORD_MANA`)

| สัญลักษณ์ / ID | ชื่อในเกม | ไฟล์อ้างอิง | สถานะปัจจุบัน & ปัญหาที่พบ | Verdict |
|---|---|---|---|---|
| `JOBS.swordsman.mod` | นักดาบ (`maxHp +25, def +3, counter +2%`) | `src/data/jobs.ts:137`, `BattleScene.ts:4226` | โครงสร้างพื้นฐานดี แต่ Basic cleave (`BATTLE.cleave = 0.50`) ยังต่ำในต้นเกม → เพิ่ม `cleaveAdd: 0.10` (`1.6x` ตัวเดียว) | **Tune** |
| `SWORD_S1` (`swordsman.auto`) | ⚔️ ดาบสยบมนตร์ (`Mana 15, CD 5`) | `src/data/jobs.ts:70-98`, `BattleScene.ts:1268, 4632`, `skill-math.ts:912` | (1) `s1Pow` ส่วนเกินจาก `swordsman_s1p` ไม่ถูกคูณใน `swordS1()` และ `autoInfo()` · (2) `base * baseLv` โตเป็นค่าแบนสูงเกินที่ Lv 99 · (3) `!ultWaiting` กั๊ก S1 แม้ Mana เหลือพอ · (4) ไม่มี innate `skillCrit` | **Tune + Fix Bug** |
| `SWORD_MANA` (`swordsman.ult`) | 🗡️ ดาบพิพากษา (`Mana 25, CD 4`) | `src/data/jobs.ts:35-65, 82-111`, `BattleScene.ts:1488-1495` | `swordCoatPct` บวกเข้า `mul` ก่อน `roll()` แบบไร้เพดาน (`+32.46x` pre-execute บน `protozero`) และคูณ `critMul`/`swordExecMul`; `swWaveAmp` เป็น dead stat | **Rework + Fix Bug** |

#### B. Class 1 Skill Web (`30` โหนดครบทุก ID — `src/data/tree.ts:256-339`, `src/data/skill2.ts:32-37`, `src/data/trees/swordsman.ts:20-44`)

| Node ID | สาขา / ชนิด | ไฟล์อ้างอิง | สถานะปัจจุบัน & ปัญหาที่พบ | Verdict |
|---|---|---|---|---|
| `swordsman_s1p` | `swordsman_s1` (`pow`) | `src/data/tree.ts:256-285` | เติม `swS1Lv` + `s1Pow` (`+12%/lv`) แต่ `swordS1()` & `autoInfo()` อ่านแค่ `swS1Lv` | **Fix Bug** (เชื่อม `swordS1ExcessPow`) |
| `swordsman_ultp` | `swordsman_ult` (`pow`) | `src/data/tree.ts:256-285` | เพิ่ม `swUltLv` + `ultPow` (`+12%/lv`) ใช้ใน `swordAwaken` & `wave` | **Tune** (ทำงานใต้เพดาน `SWORD_MANA` ใหม่) |
| `sw_guard` | `swordsman_s2` (`s2root`) | `src/data/skill2.ts:32`, `BattleScene.ts:5805, 5841` | `Auto Guard` บล็อก return ที่ `5805` ก่อน `guardPool += n` (`5841`) ทำให้อดสะสม `guardPool` | **Fix Bug + Tune** (`0.50 * mitigatedEst`) |
| `sw_guard_p` | `swordsman_s2` (`s2plus`) | `src/data/skill2.ts:32`, `skill-math.ts:478` | `guardCut` (40%+5%/lv, cap 60%), `guardBack` (50%+10%/lv), `guardDef: 2 + 0.5*lv` | **Tune** (`guardDef: 2.5 + 0.6*lv`) |
| `sw_guard_x` | `swordsman_s2` (`s2star`) | `src/data/skill2.ts:32`, `skill-math.ts:492-494` | นาน 3 เทิร์น, โล่ 18%, สวน 2 ครั้ง, +30% guardBack | **Keep** |
| `sw_blood` | `swordsman_s2` (`s2root`) | `src/data/skill2.ts:34`, `jobs.ts:122`, `BattleScene.ts:3858` | `SPELL_VAMP.bloodCut = 0.15` หักดาเมจสกิล/Ult ทำให้เสีย DPS เมื่อเปิดเลือดเดือด | **Rework** (`bloodCut: 0.15 → 0`, เพิ่ม `bloodTaken: 0.10`) |
| `sw_blood_p` | `swordsman_s2` (`s2plus`) | `src/data/skill2.ts:34`, `skill-math.ts:479` | ดูดเลือด + ดูดเลือดสกิล `+20% + 5%/lv` | **Keep** |
| `sw_blood_x` | `swordsman_s2` (`s2star`) | `src/data/skill2.ts:34`, `skill-math.ts:495`, `BattleScene.ts:6540` | `S2N.bloodAtk = 0.20` **ถูกอ่านและคูณใน `atkMul()` (`BattleScene.ts:6540`) อยู่แล้ว** | **Keep** |
| `sw_taunt` | `swordsman_s2` (`s2root`) | `src/data/skill2.ts:36`, `BattleScene.ts:4333-4342` | ลดพลังโจมตีมอน + เกราะแตกอย่างเดียว ขาดแรงจูงใจสายสวนกลับ | **Tune** (+20% ดาเมจสวนกลับใส่มอนที่ติดท้าทาย) |
| `sw_taunt_p` | `swordsman_s2` (`s2plus`) | `src/data/skill2.ts:36`, `skill-math.ts:479` | `20% + 5%/lv` weak (cap 40%) + armorBrk | **Keep** |
| `sw_taunt_x` | `swordsman_s2` (`s2star`) | `src/data/skill2.ts:36`, `skill-math.ts:497` | 3 เทิร์น, break 2 เทิร์น, +15 Res, โล่ 8% HP | **Tune** (โล่ `8% → 10%` Max HP) |
| `swordsman_core1` | `swordsman_core` (`tier 0`) | `src/data/trees/swordsman.ts:21` | `swCoreVit` (`4/lv`), `def` (`3/lv`), `swCoreHpPct` (`2%/lv`) | **Keep** |
| `swordsman_core2` | `swordsman_core` (`tier 0`) | `src/data/trees/swordsman.ts:22` | `mdef` (`3%/lv`), `tenacity` (`3%/lv`), `swVitToMdef` | **Keep** |
| `swordsman_core3` | `swordsman_core` (`tier 0`) | `src/data/trees/swordsman.ts:23` | `regen`, `healAmp` (`5%/lv`), `swLowRegenAmp` | **Keep** |
| `swordsman_a1` | `swordsman_a` (`tier 1`) | `src/data/trees/swordsman.ts:25` | `swAwDr` (`-5%/lv` dmg taken), ตายบน Berserker (`swAwaken > 0` เท่านั้น) | **Rework** (เปิดทำงานเมื่อ `swAwaken > 0 \|\| rampage > 0`) |
| `swordsman_a2` | `swordsman_a` (`tier 2`) | `src/data/trees/swordsman.ts:26`, `BattleScene.ts:1563` | `swAwLeech` เช็กแค่ `src === 'basic'` ข้าม `combo`/`counter` และตายบน Berserker | **Fix Bug + Rework** (`basic/combo/counter` + `rampage > 0`) |
| `swordsman_a3` | `swordsman_a` (`tier 3`) | `src/data/trees/swordsman.ts:27` | `swAwCtr` (`+6%/lv` counter), ตายบน Berserker | **Rework** (เปิดทำงานเมื่อ `swAwaken > 0 \|\| rampage > 0`) |
| `swordsman_a4` ★ | `swordsman_a` (`tier 4`) | `src/data/trees/swordsman.ts:28` | `swWaveShield` (`30%` ดาเมจคลื่น, cap `25%` HP), ตายบน Berserker | **Rework** (บน Berserker ได้โล่ `30%` จาก slash `บ้าระห่ำ` + `15%` จาก S3 `คลื่นดาบ` ระหว่าง `rampage > 0`, cap `25%` HP) |
| `swordsman_b1` | `swordsman_b` (`tier 1`) | `src/data/trees/swordsman.ts:30` | `swS1Shield` (`4%/oldLv` Max HP เมื่อกด S1) | **Keep** |
| `swordsman_b2` | `swordsman_b` (`tier 2`) | `src/data/trees/swordsman.ts:31` | `tenacity +5%/oldLv`, `swCcGuard` (กัน CC 1 เทิร์น) | **Keep** |
| `swordsman_b3` | `swordsman_b` (`tier 3`) | `src/data/trees/swordsman.ts:32` | `swMuteWeak` (`-6%/oldLv` ดาเมจจากมอนติดใบ้) | **Keep** |
| `swordsman_b4` ★ | `swordsman_b` (`tier 4`) | `src/data/trees/swordsman.ts:33` | `swS1Ctr: 2` สวนแน่นอนหลัง S1 | **Tune** (`counters: 2 → 3` + คีย์แยก `swS1CtrDmg: 0.25`) |
| `swordsman_c1` | `swordsman_c` (`tier 1`) | `src/data/trees/swordsman.ts:35` | `swVsMute` (`+10%/oldLv` ตีตัวร่าย/ติดใบ้) | **Keep** |
| `swordsman_c2` | `swordsman_c` (`tier 2`) | `src/data/trees/swordsman.ts:36` | `swS1Refund` ทำงานเฉพาะ `wasCasting` | **Tune** (คืน `50%` Mana เมื่อเป้าเป็นบอส/มินิหรือติดใบ้อยู่แล้ว) |
| `swordsman_c3` | `swordsman_c` (`tier 3`) | `src/data/trees/swordsman.ts:37` | `swS1Splash` (`0.20/oldLv`) | **Tune** (`0.20 → 0.25/oldLv`, `75%` ที่ Lv5 — รักษาไม่ให้ S1 AoE กลบ S3 คลาส 2) |
| `swordsman_c4` ★ | `swordsman_c` (`tier 4`) | `src/data/trees/swordsman.ts:38` | `swS1Star` (ฟันซ้ำ `60%` + ใบ้ `+1` เทิร์น) | **Keep** |
| `swordsman_d1` | `swordsman_d` (`tier 1`) | `src/data/trees/swordsman.ts:40`, `BattleScene.ts:1495` | `swExecAdd = 0.20/oldLv` และถูกบล็อกบน Berserker (`full ?`) | **Tune + Rework** (`0.20 → 0.12/oldLv`; ถอด `full ?` ให้ Berserker ใช้ผ่าน `execLineShare = 0.25`) |
| `swordsman_d2` | `swordsman_d` (`tier 2`) | `src/data/trees/swordsman.ts:41` | `swWaveRe` (`33%/oldLv` ยิงคลื่นซ้ำเมื่อฆ่าได้) | **Keep** (ล้างคีย์ตาย `swWaveAmp` ออกจาก `BattleScene.ts`/`skill-math.ts`) |
| `swordsman_d3` | `swordsman_d` (`tier 3`) | `src/data/trees/swordsman.ts:42`, `BattleScene.ts:4100` | `swAwCleave` (`+15%/oldLv`), ตายบน Berserker | **Rework** (ยิง `swordCleave()` 1 ครั้ง/เทิร์นหลัง `swingOnce()` แรกเมื่อ `rampage > 0`) |
| `swordsman_d4` ★ | `swordsman_d` (`tier 4`) | `src/data/trees/swordsman.ts:43` | `swAwAtk: 0.50` (+50% P.ATK) ปั่น `Pierce` เกินสมดุล | **Tune** (`0.50 → 0.15` และจำกัดเฉพาะ `swAwaken > 0` เพื่อไม่ให้พอง `Ult%` ของ Berserker/Warlord) |

#### C. Retired Class 1 Talents (`12` IDs ครบทุกตัว — `src/data/trees/swordsman.ts:46-62`, `Retired-Preserve-ID`)

| ID | แถว | ชื่อ | ผลเดิม (เมื่อก่อน `hasPassiveTree`) | Verdict |
|---|---|---|---|---|
| `sw_t1a` | Row 1 | 🌀 ฟันกวาด | `cleaveAdd: 0.3 / 0.6` | **Retired-Preserve-ID** (แทนที่โดย `sw_n_cleave` / `sw_k_cleavestorm`) |
| `sw_t1b` | Row 1 | 🎯 ตาเพชร | `hit: 10/16, combo: 0.08/0.12` | **Retired-Preserve-ID** (แทนที่โดย `sw_n_eagleeye`) |
| `sw_t1c` | Row 1 | 🛡️ ตั้งการ์ด | `waveShield: 0.05/0.08` | **Retired-Preserve-ID** (แทนที่โดย `sw_n_guardwall`) |
| `sw_t2a` | Row 2 | 🔥 เลือดร้อน | `startRage: 15/25` | **Retired-Preserve-ID** (แทนที่โดย `sw_n_hotblood`) |
| `sw_t2b` | Row 2 | 💢 แค้นฝังใจ | `rageOnHurtAdd: 3/5` | **Retired-Preserve-ID** (แทนที่โดย `sw_n_vengeance`) |
| `sw_t2c` | Row 2 | 🌪️ พายุโลหิต | `spellVamp: 0.15/0.25, skillDmgCut: 0.3` | **Retired-Preserve-ID** (แทนที่โดย `sw_k_bloodvamp`) |
| `sw_t3a` | Row 3 | 🏰 ปราการ | `ultShieldAdd: 0.15/0.2, ultMulAdd: -0.2` | **Retired-Preserve-ID** (แทนที่โดย `sw_k_juggernaut`) |
| `sw_t3b` | Row 3 | 💥 ฟันทลาย | `ultMulAdd: 1.0/1.4, ultShieldAdd: -0.15, ultVsCharge: 0.5` | **Retired-Preserve-ID** (แทนที่โดย `sw_k_cleavestorm`) |
| `sw_t3c` | Row 3 | 🔁 ท่าสวนพร้อม | `ultCounters: 2/3` | **Retired-Preserve-ID** (แทนที่โดย `sw_n_ultcounter`) |
| `sw_t4a` | Row 4 | 💀 ไม่ยอมล้ม | `revive: 1, reviveHp: 0.4/0.6` | **Retired-Preserve-ID** (แทนที่โดย `sw_n_undying`) |
| `sw_t4b` | Row 4 | 🩸 เลือดล้น | `overhealShield: 1, lifesteal: 0/0.05` | **Retired-Preserve-ID** (แทนที่โดย `sw_k_bloodvamp`) |
| `sw_t4c` | Row 4 | ⚙️ เหล็กกล้า | `counterRage: 5/8, counterShield: 0.03/0.05` | **Retired-Preserve-ID** (แทนที่โดย `sw_n_ironsteel`) |

---

### 1.2 Class 2A: Knight (`knight`) — Kit, Skill Web 22 โหนด & 12 Retired Talents

#### A. Base Kit & Active Skills (`JOB2.knight`, `KIT2.knight`)

| สัญลักษณ์ / ID | ชื่อในเกม | ไฟล์อ้างอิง | สถานะปัจจุบัน & ปัญหาที่พบ | Verdict |
|---|---|---|---|---|
| `JOB2.knight` (`ขี่เปโก` & Mastery) | `HP +10%`, `ASPD +5%`, `hpDmg 3%`, หอก `hit+10, atk+5%`, `mod: {}` | `src/data/jobs2.ts:51-56`, `skill-math.ts:261, 265` | เอกลักษณ์ "ถึกเป็นแรง" ชัด แต่ `hpDmg 3%` ยังต่ำเมื่อลด Coat ของ Ult (`mod: {}` คงเดิม, แสดงผลเทียบ Mana ใน §4.2) | **Tune** (`hpDmg: 0.03 → 0.04`) |
| `knight.skill3` (`Brandish Spear`) | กวาด 3 ตัวหน้า `1.5x + HP%` (`Mana 20, CD 3`) | `src/data/jobs2.ts:57`, `skill-math.ts:262`, `BattleScene.ts:2925, 3011-3016` | เบาใน 1v1 บอส (`1.5x`), Mana แพง (`20`), ผลักเกจแค่ตัวหน้า, คริ `0%`, และ `skill3Turn()` ไม่กัน Mana ให้ Ult | **Rework + Fix Bug** |
| `knight.skill4` (`Spiral Pierce`) | แทงเกลียว + ทุบโล่ + `Break 2t` + `🐍 Fang` (`Lv20, Mana 20, CD 4`) | `src/data/jobs2.ts:59`, `skill4.ts:1-43`, `BattleScene.ts:3029-3071` | เสียเทิร์นฮีโร่เต็มใบแต่ตีแค่ `2.0x`, ปลดช้า (Lv20), โดน `autoUlt` กั๊กเทิร์น, ไม่มี DEF pierce พื้นฐาน | **Rework / Buff** |
| `knight.ult` (`Pierce of Judgement`) | ปลุกหอก + `Pierce` 3–4+ ฮิต + `คลื่นทะลวง` (`Mana 50, CD 4`) | `src/data/jobs2.ts:61`, `skill-math.ts:263`, `BattleScene.ts:3227-3229` | ต้นตอ Ult 90.4%: `Pierce` ทุกฮิตได้ Coat ไร้เพดาน + `1.0x` full `swordExecMul` + `1.2x` base | **Rework / Nerf Burst** |

#### B. Knight Skill Web (`22` โหนดครบทุก ID — `src/data/tree.ts:396-410`, `src/data/trees2/knight.ts:17-40`)

| Node ID | สาขา / ชนิด | ไฟล์อ้างอิง | สถานะปัจจุบัน & ปัญหาที่พบ | Verdict |
|---|---|---|---|---|
| `knight_s3p` | `knight_s3` (`pow2`) | `src/data/tree.ts:396-410` | `s3Pow +12%/lv` (max 5 = `+60%`) | **Keep** |
| `knight_u2p` | `knight_u2` (`pow2`) | `src/data/tree.ts:396-410` | `ult2Pow +12%/lv` (max 5 = `+60%`) | **Keep** |
| `kn_p1` | `kn_p` (`tier 1`) | `src/data/trees2/knight.ts:18` | `j2HpDmg: +1%/oldLv` Max HP บนสกิลหอก | **Keep** |
| `kn_p2` | `kn_p` (`tier 2`) | `src/data/trees2/knight.ts:19` | `j2PierceHits: 1` (`+1` ฮิต Pierce) | **Keep** |
| `kn_p3` | `kn_p` (`tier 3`) | `src/data/trees2/knight.ts:20` | `Spear Boomerang` `0.8x` 1 ครั้ง/เวฟ ขัดร่ายบอสซ้ำในไฟต์ยาวไม่ได้ | **Tune** (`1.4x + HP%`, `CD 4 เทิร์น`) |
| `kn_p4` ★ | `kn_p` (`tier 4`) | `src/data/trees2/knight.ts:21` | `j2Spiral: 0.50` บน Ult เท่านั้น | **Tune** (เพิ่ม `+20%` DEF pierce ให้ `Brandish` & `Spiral Pierce`) |
| `kn_g1` | `kn_g` (`tier 1`) | `src/data/trees2/knight.ts:22` | `j2Guard: 4%/oldLv` (`20%` Lv5) ขัดขากับ `guardPool` | **Fix Bug** (ผ่าน `Auto Guard -> guardPool`) |
| `kn_g2` | `kn_g` (`tier 2`) | `src/data/trees2/knight.ts:23` | `j2DefAtk: 0.15/oldLv` (`0.45x` Lv5) | **Tune** (`0.15 → 0.20/oldLv` = `0.60x` Lv5) |
| `kn_g3` | `kn_g` (`tier 3`) | `src/data/trees2/knight.ts:24` | `j2HpPct: 4%/oldLv` (`+12%` Max HP Lv5) | **Keep** |
| `kn_g4` ★ | `kn_g` (`tier 4`) | `src/data/trees2/knight.ts:25` | `j2CounterCrit: 1` (สวนกลับคริแน่นอน) | **Keep** |
| `kn_c1` | `kn_c` (`tier 1`) | `src/data/trees2/knight.ts:26` | `aspd: +0.128/oldLv` (`+8% ASPD/oldLv`) | **Keep** |
| `kn_c2` | `kn_c` (`tier 2`) | `src/data/trees2/knight.ts:27` | `j2Charge: +50%/oldLv` ฟันแรกของเวฟ | **Keep** |
| `kn_c3` | `kn_c` (`tier 3`) | `src/data/trees2/knight.ts:28` | `j2HpPct +4%/lv, crit +3%/lv, hit +8/lv` | **Keep** |
| `kn_c4` ★ | `kn_c` (`tier 4`) | `src/data/trees2/knight.ts:29` | `j2ChargeFirst`: เปิดเทิร์นก่อน, `3x`, sure crit, `+35` เกจ, `+15` Mana | **Keep** |
| `kn_o1` | `kn_o` (`tier 1`) | `src/data/trees2/knight.ts:31` | `j2Banner: 8%/oldLv` โล่ต้นเวฟสะสมได้ | **Keep** |
| `kn_o2` | `kn_o` (`tier 2`) | `src/data/trees2/knight.ts:32` | `j2Provoke: 5%/oldLv` (`10%/lv` <50% HP) ลดดาเมจเข้า | **Keep** |
| `kn_o3` | `kn_o` (`tier 3`) | `src/data/trees2/knight.ts:33` | `j2BannerKill`: โล่ + เกจ `+20` + Mana `+10` เมื่อฆ่า (ครึ่งหนึ่งเมื่อบล็อก) | **Keep** |
| `kn_o4` ★ | `kn_o` (`tier 4`) | `src/data/trees2/knight.ts:34` | `j2BannerAura`: Auto Guard `+8%`, บล็อกแล้วฮีล `5%` + Mana `+10` | **Keep** |
| `kn_r1` | `kn_r` (`tier 1`) | `src/data/trees2/knight.ts:36`, `BattleScene.ts:4901` | `sweepEvery: 3`, `j2Sweep: 0.30/oldLv`, ไม่มี `skillCrit` | **Rework / Tune** (`sweepEvery: 3 → 2`, `sweep: 0.30 → 0.60/oldLv`, `+10%` sweep `skillCrit`) |
| `kn_r2` | `kn_r` (`tier 2`) | `src/data/trees2/knight.ts:37` | `j2SweepPush: 5/oldLv` (ผลักเกจมอน `-15` Lv5) | **Keep** |
| `kn_r3` | `kn_r` (`tier 3`) | `src/data/trees2/knight.ts:38`, `BattleScene.ts:801, 1056, 4915` | `nextActor()` (`801`) หัก `100` เกจก่อนเริ่มเทิร์น แล้ว `spearSweep()` (`1056`) แคป `Math.min(100, ...)` จึงไม่ overflow เกิน `100` แต่เกจส่วนเกินเมื่อรวมกับ `kn_c4`/`kn_o3` ถูกตัดทิ้งที่ `100` และใน 1v1 บอสได้เพียง `9` เกจ/3 เทิร์นโดยไม่ช่วย Mana | **Tune** (เพิ่ม `+5 Mana` ต่อการกวาด `spearSweep` 1 ครั้ง) |
| `kn_r4` ★ | `kn_r` (`tier 4`) | `src/data/trees2/knight.ts:39` | `j2SweepStar`: ทุบเกราะ 2 เทิร์น + มึน 25% (บอสผลักเกจ) | **Keep** |

#### C. Retired Knight Talents (`12` IDs ครบทุกตัว — `src/data/trees2/knight.ts:42-55`, `Retired-Preserve-ID`)

| ID | แถว | ชื่อ | ผลเดิม | Verdict |
|---|---|---|---|---|
| `kn_t1_hp` | Row 1 | 🏰 กายเหล็ก | `j2HpPct: 0.04 / 0.07` | **Retired-Preserve-ID** |
| `kn_t1_guard` | Row 1 | 🛡️ ตั้งโล่ | `j2Guard: 0.03 / 0.05` | **Retired-Preserve-ID** |
| `kn_t1_speed` | Row 1 | 💨 เปโกฝีเท้าดี | `aspd: 0.08 / 0.128` | **Retired-Preserve-ID** |
| `kn_t2_ult` | Row 2 | 🔱 แทงพิพากษา | `ult2Pow: 0.15 / 0.25` | **Retired-Preserve-ID** |
| `kn_t2_spiral` | Row 2 | 🌀 ปลายหอกเกลียว | `j2Spiral: 0.15 / 0.25` | **Retired-Preserve-ID** |
| `kn_t2_hp` | Row 2 | 🔱 หอกหนักอึ้ง | `j2HpDmg: 0.01 / 0.02` | **Retired-Preserve-ID** |
| `kn_t3_brand` | Row 3 | 🌀 Brandish หนัก | `s3Pow: 0.15 / 0.25` | **Retired-Preserve-ID** |
| `kn_t3_charge` | Row 3 | 🐎 เปิดศึก | `j2Charge: 0.30 / 0.50` | **Retired-Preserve-ID** |
| `kn_t3_armor` | Row 3 | ⚙️ เกราะคือดาบ | `j2DefAtk: 0.08 / 0.15` | **Retired-Preserve-ID** |
| `kn_t4_banner` | Row 4 | 🚩 ธงประจำตัว | `j2Banner: 0.05 / 0.08` | **Retired-Preserve-ID** |
| `kn_t4_provoke` | Row 4 | 😤 ข่มศัตรู | `j2Provoke: 0.08 / 0.12` | **Retired-Preserve-ID** |
| `kn_t4_kill` | Row 4 | 🎖️ ชัยชนะปกป้อง | `j2BannerKill: 0.04 / 0.08` | **Retired-Preserve-ID** |

---

### 1.3 Class 2B: Berserker (`berserker`) — Kit, Skill Web 14 โหนด & 12 Retired Talents

#### A. Base Kit & Active Skills (`JOB2.berserker`, `KIT2.berserker`)

| สัญลักษณ์ / ID | ชื่อในเกม | ไฟล์อ้างอิง | สถานะปัจจุบัน & ปัญหาที่พบ | Verdict |
|---|---|---|---|---|
| `JOB2.berserker` (`คลั่งเลือด` & Mastery) | `crit +5%`, 2H `{ crit +3%, atk +8% }`, `Frenzy` (`+6% ASPD, +8% CritDmg/stack`) | `src/data/jobs2.ts:43-47`, `skill-math.ts:253, 256` | มี **0% `skillCrit`** ทำให้ `S1`/`S3` แทบไม่คริและไม่ช่วยปั้น Frenzy | **Tune + Add `skillCrit`** |
| `berserker` Skill 1 (`stormCost`) | ⚔️ ดาบสยบมนตร์ (`Rage 35, CD 5`) | `src/data/jobs2.ts:45`, `skill-math.ts:257` | แพงกว่า `คลื่นดาบ` (`30 Rage`) ทั้งที่เป็นท่าเป้าเดี่ยวและไม่เชื่อม `Frenzy`/`rampage` | **Tune + Rework** |
| `berserker.skill3` (`คลื่นดาบ`) | Front `1.8x` / Back `1.2x` (`Rage 30, CD 3`, `waveCrit 0.20`) | `src/data/jobs2.ts:48`, `skill-math.ts:254`, `BattleScene.ts:3004-3008` | `waveCrit 0.20` ถูก `skillFromCrit = 0` ล้างเป็น `0%`, ขาดเลือดไหล/ปั้น Frenzy/คืน Rage ในเวฟฝูง; CD `3` (= ทุก 4 เทิร์น) ช้าเกินสำหรับสกิลหลักของสาย | **Fix Bug + Rework** |
| `berserker.ult` (`บ้าระห่ำ`) | ฟันหมู่ `1.2x` + 3 เทิร์น (`2 swings, crit +30%, taken +20%`, `exec 0.25`) | `src/data/jobs2.ts:49`, `skill-math.ts:255`, `BattleScene.ts:1500, 3084-3103` | `ultCrit 0.30` ทำงานบน Basic/Combo/Counter แล้ว แต่ถูก `skillFromCrit = 0` ล้างบนตัว Ult slash; `ultTaken +20%` หนักไป; `swordsman_a1..a4` & `d1, d3` ตายบน Berserker | **Rework + Fix Bug** |

#### B. Berserker Skill Web (`14` โหนดครบทุก ID — `src/data/tree.ts:396-410`, `src/data/trees2/berserker.ts:10-23`)

| Node ID | สาขา / ชนิด | ไฟล์อ้างอิง | สถานะปัจจุบัน & ปัญหาที่พบ | Verdict |
|---|---|---|---|---|
| `berserker_s3p` | `berserker_s3` (`pow2`) | `src/data/tree.ts:396-410` | `s3Pow +12%/lv` (max 5 = `+60%`) | **Keep** |
| `berserker_u2p` | `berserker_u2` (`pow2`) | `src/data/tree.ts:396-410` | `ult2Pow +12%/lv` (max 5 = `+60%`) | **Keep** |
| `bz_c1` | `bz_c` (`tier 1`) | `src/data/trees2/berserker.ts:11` | `crit +3%/oldLv` เท่านั้น (ไม่ช่วย `skillCrit`) | **Tune** (`crit +3%/oldLv` + `skillCrit +2%/oldLv`) |
| `bz_c2` | `bz_c` (`tier 2`) | `src/data/trees2/berserker.ts:12` | `critMul +10%/oldLv` (`+30%` Lv5) | **Keep** |
| `bz_c3` | `bz_c` (`tier 3`) | `src/data/trees2/berserker.ts:13` | `j2FrenzyMax +1/oldLv` (`+3` Lv5) | **Tune** (เพิ่ม `combo +5%/oldLv`, `comboDmg +5%/oldLv`) |
| `bz_c4` ★ | `bz_c` (`tier 4`) | `src/data/trees2/berserker.ts:14` | `j2BossCrit: 0.50` (`+50%` crit dmg vs บอส/มินิ) | **Keep** |
| `bz_d1` | `bz_d` (`tier 1`) | `src/data/trees2/berserker.ts:15` | `j2Duel: +8%/oldLv` vs ตัวเดียว/บอส | **Keep** |
| `bz_d2` | `bz_d` (`tier 2`) | `src/data/trees2/berserker.ts:16` | `aspd +4%/oldLv` (`0.064/oldLv`) อย่างเดียว | **Tune** (เพิ่ม `s3Pow +5%/oldLv` = `+15%` Lv5) |
| `bz_d3` | `bz_d` (`tier 3`) | `src/data/trees2/berserker.ts:17` | `def +3/oldLv, tenacity +5%/oldLv` อย่างเดียว | **Tune** (เพิ่ม `basicDmg +6%/oldLv` = `+18%` Lv5) |
| `bz_d4` ★ | `bz_d` (`tier 4`) | `src/data/trees2/berserker.ts:18` | `j2DuelExec: 0.50` (`+50%` dmg vs บอส/มินิ `<30% HP`) | **Keep** |
| `bz_r1` | `bz_r` (`tier 1`) | `src/data/trees2/berserker.ts:19` | `rageGain +10%/oldLv` (เริ่มเวฟที่ 0 Rage) | **Tune** (เพิ่ม `startRage +10/oldLv` = `+30` Lv5) |
| `bz_r2` | `bz_r` (`tier 2`) | `src/data/trees2/berserker.ts:20` | `j2LowHp +10%/oldLv * missingHP%` | **Keep** |
| `bz_r3` | `bz_r` (`tier 3`) | `src/data/trees2/berserker.ts:21` | `lifesteal +1%/oldLv` (`+3%` Lv5) | **Keep** |
| `bz_r4` ★ | `bz_r` (`tier 4`) | `src/data/trees2/berserker.ts:22`, `BattleScene.ts:865` | `Ignore Pain` รีเซ็ต **`1 ครั้ง/เวฟ`** ที่ `fight()` (`BattleScene.ts:865`) อยู่แล้ว, แต่ `j2RageTurn: 1` ตายสนิท (0 reads) | **Fix Bug + Tune** (คง `1 ครั้ง/เวฟ` + เชื่อม `j2RageTurn: 1 → 5`, `×2` ระหว่าง `ignorePainTurns > 0`) |

#### C. Retired Berserker Talents (`12` IDs ครบทุกตัว — `src/data/trees2/berserker.ts:25-38`, `Retired-Preserve-ID`)

| ID | แถว | ชื่อ | ผลเดิม | Verdict |
|---|---|---|---|---|
| `bz_t1_rage` | Row 1 | 😡 เลือดเดือด | `startRage: 20 / 35` | **Retired-Preserve-ID** |
| `bz_t1_crit` | Row 1 | 🎯 สัญชาตญาณฆ่า | `crit: 0.04 / 0.07` | **Retired-Preserve-ID** |
| `bz_t1_hide` | Row 1 | ⛰️ หนังเหนียว | `def: 5/9, tenacity: 0.08/0.14` | **Retired-Preserve-ID** |
| `bz_t2_ult` | Row 2 | 👹 คลั่งสุดขีด | `ult2Pow: 0.15 / 0.25` | **Retired-Preserve-ID** |
| `bz_t2_duel` | Row 2 | 👁️ จ้องตาย | `j2Duel: 0.08 / 0.14` | **Retired-Preserve-ID** |
| `bz_t2_low` | Row 2 | 🩹 ยิ่งเจ็บยิ่งแรง | `j2LowHp: 0.08 / 0.14` | **Retired-Preserve-ID** |
| `bz_t3_wave` | Row 3 | 🌊 คลื่นดาบคม | `s3Pow: 0.15 / 0.25` | **Retired-Preserve-ID** |
| `bz_t3_rage` | Row 3 | 💢 โทสะไหลเวียน | `rageGain: 0.12 / 0.20` | **Retired-Preserve-ID** |
| `bz_t3_gore` | Row 3 | 🩸 เลือดพุ่ง | `critMul: 0.12 / 0.20` | **Retired-Preserve-ID** |
| `bz_t4_frenzy` | Row 4 | 🔥 คลั่งไม่หยุด | `j2FrenzyMax: 1 / 2` | **Retired-Preserve-ID** |
| `bz_t4_exec` | Row 4 | ☠️ ปลิดชีพ | `j2DuelExec: 0.20 / 0.35` | **Retired-Preserve-ID** |
| `bz_t4_leech` | Row 4 | 🧛 สูบเลือด | `lifesteal: 0.03 / 0.05` | **Retired-Preserve-ID** |

---

## 2. ข้อกำหนดการรีเวิร์คฉบับสมบูรณ์ (Rework Specification — R1 & R3)

> **Save-Data ID Invariant:** โครงสร้าง ID ทั้งหมดใน `src/save.ts`, `JOBS`, `JOB2`, `SKILL2`, `TREE`, `TREE2`, และ `SWORDSMAN_PASSIVE_TREE` **คงชื่อเดิม 100%** · ปรับเฉพาะค่าตัวเลขใน `src/data/` และลอจิกใน `src/scenes/BattleScene.ts` / `src/data/skill-math.ts` / `src/data/skill4.ts`

### 2.1 การคุมเพดาน Ult และแก้บั๊กระบบกลาง (`SWORD_MANA`, `CRIT_RULES`, `BattleScene.ts`)

| เป้าหมาย | ไฟล์ / คีย์ | Before (ปัจจุบัน) | After (ข้อเสนอ v2) | เหตุผลเชิงระบบ |
|---|---|---|---|---|
| **✨ เคลือบดาบสวรรค์ (`swordCoatPct`)** | `src/data/jobs.ts` (`SWORD_MANA`) + `BattleScene.ts:1491` | `awakenHpPct: 0.035`, `awakenHpLv: 0.005`, `awakenHpLvHi: 0.0025`, `awakenStrPct: 0.005` บวกเข้า `mul` **ก่อน `roll()`** (ไร้เพดาน, คูณซ้ำ `critMul * atkMul * swordExecMul` → `+32.46x` pre-execute บน `protozero`) | `awakenHpPct: 0.025`, `awakenHpLv: 0.003`, `awakenHpLvHi: 0.0015`, `awakenStrStep: 25`, `awakenStrPct: 0.0025` · **ย้ายเป็นโบนัสหลัง `roll()` แบบมีเพดาน `coatAtkCap = 1.25`:** `coatFlat = Math.min(coatPct * monHpNow * bigShare, 1.25 * st.atk * coatShare * bigShare)` (`coatShare = 0.5` สำหรับ multi-hit `knightPierce()`, `1.0` อื่นๆ) แล้วคูณเฉพาะ `skillCutMul * j2Mul` (ไม่คูณ `critMul`/`swordExecMul`) | คงธีม "ฟันมอน HP สูงยิ่งเข้าเนื้อ" โดยไม่ให้ 1% HP บนบอส 556k กลบสกิล S1/S3/S4 และไม่คูณทบกับคริ/execute |
| **⚖️ คำพิพากษา (`SWORD_MANA.exec*` & `awakenStr`)** | `src/data/jobs.ts:45, 54-58`, `BattleScene.ts:1495`, `skill-math.ts:999` | `awakenStr: [20, 25, 30, 35, 50, 55..100]`, `execMax: 2.0`, `execCapMiss: 0.75`, `execBigShare: 0.5`, `execLineShare: 0.25`; `Pierce` ใช้ `1.0x` เต็ม | `awakenStr: [15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85]`, `execMax: 1.5`, `execCapMiss: 0.75`, `execBigShare: 0.5`, `execLineShare: 0.25` · **Knight `knightPierce()` ใช้ `execLineShare = 0.25`**, ส่วน **`🔱 คลื่นทะลวง` & `🌊 คลื่นดาบ` ใช้ `1.0x` เต็ม** | แยกบทบาทชัดเจน: `Pierce` เป็นคอมโบเปิดหลายฮิต ส่วน `คลื่นทะลวง` คือท่าปิดฉาก execute จริง |
| **`swordsman_d1` (`คมพิพากษา`)** | `src/data/skill-math.ts:205` (`KIT.swordUltTree.execAdd`), `BattleScene.ts:1495`, `skill-math.ts:999` | `execAdd: 0.20/oldLv` (`+0.60` Lv5, `+0.90` Lv10, `+1.20` Lv15); กั้น `(full ? st.swExecAdd : 0)` ทำให้ Berserker เป็น `0` | **`execAdd: 0.12/oldLv`** (`+0.36` Lv5, `+0.54` Lv10, `+0.72` Lv15); **ถอด `full ?` gate** ออกทั้งใน `BattleScene.ts:1495` และ `skill-math.ts:999` (ใช้ `st.swExecAdd` ผ่าน `execShare`: `0.25` สำหรับ `knightPierce` & `Berserker`, `1.0` สำหรับ `spearWaveCheck`/`swordWaveCheck`) | ลดการปั่น execute บน Knight และเปิดให้ Berserker ได้สัดส่วน `0.25x` ตาม `execLineShare` อย่างเป็นธรรม |
| **`swordsman_a1..a4` ★ (Class 1 Ult Defensive บน Berserker)** | `src/data/trees/swordsman.ts:25-28`, `BattleScene.ts:3084-3104` | อ่านเฉพาะ `swAwaken > 0` (`a1` `swAwDr`, `a2` `swAwLeech` เฉพาะ `basic`, `a3` `swAwCtr`, `a4` ★ `swWaveShield`) → **ตายสนิทบน Berserker** | เปิดให้ **`swAwaken > 0 \|\| rampage > 0`** ใช้ `a1`/`a2`/`a3` ได้ทั้งคู่ (และแก้ `swAwLeech` ใน `1563` ให้รองรับ `basic \|\| combo \|\| counter`) · **`swordsman_a4` ★ (`swWaveShield`):** บน Berserker เติมโล่ `30%` ของดาเมจ AoE slash `บ้าระห่ำ` (`ult2`) + `15%` ของดาเมจ `คลื่นดาบ` (S3) ระหว่าง `rampage > 0` (เพดานรวม `25%` Max HP; ไม่เพิ่มดาเมจ Ult) + อัปเดต `ultInfo()` | ให้สายป้องกันในใย Ult Class 1 ทำงานบน Berserker จริงโดยไม่เพิ่ม `Ult%` |
| **`swordsman_d3` (`ฟันกวาดตื่น`)** | `src/data/skill-math.ts:205`, `BattleScene.ts:4100-4104, 4611` | `swAwCleave: 0.15/oldLv` เฉพาะ `swAwaken > 0` | คง `0.15/oldLv`; เปลี่ยน `BattleScene.ts:4100` เป็น `(this.swAwaken > 0 \|\| this.rampage > 0) ? this.front()[0] : undefined` → **ยิง `swordCleave(swFirst)` 1 ครั้งต่อเทิร์น `basicAttack()` หลัง `swingOnce()` แรกเท่านั้น** (ไม่ยิงซ้ำบน `swingOnce()` ที่ 2 ของ `rampage` และไม่ยุ่ง `BATTLE.cleave`) | เชื่อม `d3` ให้ Berserker แบบคุมจังหวะสะอาด ไม่คูณเบิ้ล |
| **`swordsman_d4` ★ (`ดาบตื่นเต็มพลัง`)** | `src/data/skill-math.ts:205` (`KIT.swordUltTree.awAtk`), `BattleScene.ts:1490` | `awAtk: 0.50` (+50% P.ATK เฉพาะ `swAwaken`) | **`awAtk: 0.15`** (+15% P.ATK) และ **จำกัดเฉพาะ `swAwaken > 0` เท่านั้น** (ไม่นำไปใส่ใน Berserker `rampage` หรือ Warlord `Undying Bloodlust`) | ลด Ult Burst ของ Knight ลงตาม R3 และป้องกัน Ult% ของ Berserker/Warlord พองตัว |
| **🎯 Skill Crit Override (`skillCritAdd`)** | `src/scenes/BattleScene.ts:1500, 3846-3849` | `CRIT_RULES.skillFromCrit = 0` ล้าง `this.critAdd` (`waveCrit`) และ `ultCrit` บน `isSkillHit()` เป็น `0%` | คง `CRIT_RULES.skillFromCrit = 0`, เพิ่ม **`kitSkillCritAdd`** เฉพาะโบนัสสกิลที่ระบุชัดใน Kit (`waveCrit`, `ultCrit` บน slash, `S1`/`S3`/`S4`/`ทวนวน` kit crit) ใต้เพดาน `CRIT_RULES.cap.skillCrit = 0.60` | ทำให้โบนัสคริของสกิลทำงานจริงโดยไม่เปิดช่องให้ basic `crit` รั่วเข้าสกิล |
| **🧹 ล้าง Dead Stat `swWaveAmp` & เชื่อม `swAwLeech`** | `BattleScene.ts:1563, 4536, 4598`, `skill-math.ts:980, 986` | `swWaveAmp` อ่านค่าเปล่า (=0); `swAwLeech` เช็กแค่ `src === 'basic'` | ถอด `swWaveAmp` ออกจากสูตรคลื่น (คงฟิลด์ใน `Stats` ค่า `0`) · แก้ `swAwLeech` เป็น `(src === 'basic' \|\| src === 'combo' \|\| src === 'counter')` | คอมโบและสวนกลับดูดเลือดได้ตามคำอธิบาย `swordsman_a2` |

### 2.2 การยกระดับ Class 1 (`swordsman`) — Basic, Skill 1, Skill 2, และ Skill Web

| ระบบ / ID | Before (ปัจจุบัน) | After (ข้อเสนอ v2) | เหตุผล |
|---|---|---|---|
| **Basic Cleave (`JOBS.swordsman.mod`)** | `{ maxHp: 25, def: 3, counter: 0.02 }` (`BATTLE.cleave = 0.50`) | **`{ maxHp: 25, def: 3, counter: 0.02, cleaveAdd: 0.10 }`** (ตัวเดียวตี **`1.60x`**) | ยกระดับฟันธรรมดาของทั้งสาย Swordsman ตั้งแต่ Lv 1 |
| **`SWORD_S1` (⚔️ ดาบสยบมนตร์)** | `atkPct: [1.20, 1.40, 1.60, 1.80, 2.00, 2.15, 2.30, 2.45, 2.60, 2.75, 2.90, 3.05, 3.20, 3.35, 3.50]`<br>`str: [0.25, 0.50, 0.75, 1.00, 1.25, 1.40, 1.55, 1.70, 1.85, 2.00, 2.15, 2.30, 2.45, 2.60, 2.75]`<br>`base: [20, 40, 60, 80, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]`<br>`cd: 5, mana: 15`, โดน `!ultWaiting` กั๊ก, ไม่คูณ `s1Pow` เกิน | **`atkPct` (Lv 1–15):** `[0.80, 0.90, 1.00, 1.10, 1.20, 1.26, 1.32, 1.38, 1.44, 1.50, 1.56, 1.62, 1.68, 1.74, 1.80]`<br>**`str` (Lv 1–15):** `[0.10, 0.15, 0.20, 0.25, 0.30, 0.33, 0.36, 0.39, 0.42, 0.45, 0.48, 0.51, 0.54, 0.57, 0.60]`<br>**`base` (Lv 1–15):** `[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]`<br>**Soft-taper `baseLv`:** `baseLvSoft: 35, baseLvAfterScale: 0.20` (`effBaseLv = blv <= 35 ? blv : 35 + (blv - 35) * 0.20` ใน `swordS1Raw()`)<br>`mana: 15`, `cd: 5`, **`skillCritAdd: 0.08`** · ผ่อนปรน `!ultWaiting` (`BattleScene.ts:1268`): กดได้หาก `!ultWaiting \|\| res - cost >= ultCost - resRegen * RES_RULES.manaPerTurnMul` · เชื่อม **`swordS1ExcessPow(st)`** = `1 + Math.max(0, st.s1Pow - TREE_RULES.powPer * Math.max(0, st.swS1Lv))` ในทั้ง **`BattleScene.ts:4632`** และ **`skill-math.ts:912` (`autoInfo()`)** | Soft-taper หลัง Lv 35 ช่วยให้ Class 1 ช่วงกลางเกมแรงขึ้น (`2,359` / `3,670` Non-Ult DPS) โดยไม่ปล่อยให้ `base * 99` ลาก S1 แซง S3 ของ Knight/Berserker ใน Endgame |
| **`swordsman_b4` ★ (`สวนเงียบ`)** | `S.counters = 2` | **`S.counters = 3`** + คีย์สถิติแยก **`swS1CtrDmg: 0.25`** (tracker `s1CtrDmgLeft` รีเซ็ตที่เริ่มเวฟและเมื่อ `ctrCharges === 0`; ไม่ชนกับ `sw_n_ultcounter` ที่บวก `swS1Ctr: 1` เพิ่มเป็น `3 + 1 = 4` ครั้ง) | สายป้องกัน S1 มีช่วงสวนกลับที่แรงขึ้นเฉพาะสกิลนี้โดยไม่เกิด collision กับ Passive Tree |
| **`swordsman_c2` (`ตัดจังหวะ`)** | คืน Mana + CD-1 เฉพาะ `wasCasting` | ขัดร่ายได้ = คืน Mana เต็ม (`4/oldLv`) + `CD -1`; **ถ้าเป้าเป็นบอส/มินิหรือติดใบ้อยู่แล้ว** คืน **`Math.round(swS1Refund * 0.5)`** (`6` Mana ที่ Lv5) | S1 ไม่แห้งเมื่อเจอมอนที่ไม่ร่ายเวท |
| **`swordsman_c3` (`ฟันเฉือน`)** | `splash: 0.20/oldLv` (`60%` ที่ Lv5) | **`splash: 0.25/oldLv`** (`75%` ที่ Lv5) | เพิ่มพลังเคลียร์เวฟให้สาย S1 พอเหมาะโดยไม่แซง `Brandish`/`คลื่นดาบ` |
| **`sw_guard` (`🛡️ ตั้งการ์ด`)** | `Auto Guard` บล็อกแล้ว return ก่อน `guardPool += n` (`BattleScene.ts:5805`); `guardDef: 2 + 0.5*s2Lv` | แยกฟังก์ชัน `mitigatedGuardHit(...)` คำนวณ **`mitigatedEst`** (หลัง DEF / `guard` / `sw_guard` / `tankDr` / `provoke`, `BattleScene.ts:5822-5832`) แล้วเติม **`this.guardPool += Math.round(mitigatedEst * 0.50)`** ตอน `Auto Guard` บล็อกขณะ `buf.guard > 0 && s2.id === 'sw_guard'` (คง `heroTurn()` reset `guardPool = 0` และคง `sw_k_thornguard` `5507` เป็นตัวทริกเกอร์ counter-on-block) · **`guardDef: 2.5 + 0.6 * s2Lv`** | ใช้ค่า *หลัง mitigation* (`0.50 * mitigatedEst`) แทนค่าดิบก่อนหักเกราะ ป้องกันบั๊กบล็อกแล้วได้ `guardPool` มากกว่าโดนตีจริง 4.2x |
| **`sw_blood` (`🩸 เลือดเดือด`)** | `+20% + 5%/lv` vamp, **`SPELL_VAMP.bloodCut = 0.15`**, `S2N.bloodAtk = 0.20` (ทำงานอยู่แล้วใน `BattleScene.ts:6540`) | คง `S2N.bloodAtk = 0.20` (`atkMul()` ที่ `BattleScene.ts:6540`), **แก้ `SPELL_VAMP.bloodCut: 0.15 → 0`** (`jobs.ts:122`), เพิ่ม **`S2N.bloodTaken = 0.10`** (`+10%` ดาเมจที่ได้รับใน `takenMul()` ที่ `BattleScene.ts:6147`) | ปลดล็อกให้สายดูดเลือดกด `S1 / S3 / S4` ได้เต็มดาเมจโดยแลกความเสี่ยงจากดาเมจเข้า `+10%` |
| **`sw_taunt` (`📣 ท้าทาย`)** | weak `-20..40%` + `armorBrk` (`★ ท้าซ้ำ` โล่ `8%` + `15` Res) | คง weak + armorBrk, เพิ่ม **`tauntCtrAmp: 0.20`** (มอนติดท้าทายโดนดาเมจสวนกลับ `+20%`) และ **`tauntStarShield: 0.08 → 0.10`** | แยกบทบาท `sw_taunt` ให้เกื้อหนุนสาย Counter/Bruiser ชัดเจน |

### 2.3 การยกระดับ Class 2A (`knight`) — Spear / Shield / Counter / Break Bruiser-Tank

| คีย์ / ID | Before (ปัจจุบัน) | After (ข้อเสนอ v2) | ผลต่อ Loop ของ Knight |
|---|---|---|---|
| `JOB2.knight` (`ขี่เปโก` & `hpDmg`) | `mod: {}`, `hpPct: 0.10`, `aspdPct: 0.05`, `hpDmg: 0.03` | คง **`JOB2.knight.mod = {}`**, คง `hpPct: 0.10`, `aspdPct: 0.05`, ปรับ **`hpDmg: 0.03 → 0.04`** (`4%` Max HP) | สกิลหอกทุกสกิล (`S1`, `Brandish`, `S4`, `ทวนวน`, `Boomerang`) สเกลกับ HP จริงจังขึ้น ขณะที่คง Mana ฐาน `60 / 9/t` เพื่อขับเน้นค่าคุ้มของ `sw_n_vitality` (ดูตาราง Mana Economy §4.2) |
| `KIT2.knight.brand*` (`Brandish Spear` S3) | `cost: 20, cd: 3, brandMul: 1.5`, ผลักเฉพาะตัวหน้า `-15`, `0% skillCrit` | **`brandCost: 14`**, `brandCd: 3`, **`brandMul: 3.4`**, **`brandCritAdd: 0.15`**, **`brandLowTargetAmp: 0.45`** (เมื่อเป้าที่โดน `<= 2` ตัว เช่น 1v1 บอส ตัวหน้าแรงขึ้น `×1.45` = `4.93x`!), ผลักทุกตัวที่โดน `-15` (ตัวหน้า `-20`) | ทำให้ `Brandish Spear` กลายเป็นท่าหลักที่เก่งทั้งเวฟ 3 ตัวและดวลบอส 1v1 |
| `skill3Turn()` Mana Guard | ไม่กัน Mana ให้ Ult | เพิ่มเงื่อนไขเดียวกับ `skill2Turn`: หาก `smashQueued && smashCdLeft <= 0 && res - cost < ultCost` ให้รอ Ult ก่อน (`del = 0`) | ป้องกันอาการ `Brandish` กิน Mana จน `Pierce of Judgement` ดีเลย์ |
| `KIT2.knight.s4` (`Spiral Pierce` S4) | `unlockLv: 20, cost: 20, cd: 4, mul: 2.0` (`LK 3×0.8=2.4`), `shatterAmp: 0.30`, `0% DEF pierce` | **`unlockLv: 15`**, **`cost: 15`**, **`cd: 3`**, **`mul: 4.8`** (`LK: 3 × 1.65 = 4.95x`), **`shatterAmp: 0.45`**, **`defPierce: 0.50`** (`LK` ฮิตสุดท้าย `0.75`), **`critAdd: 0.25`**, และ **`spBreak` (`2` เทิร์น): เป้าโดนดาเมจกายภาพจาก Knight แรงขึ้น `+15%`** *(สโคปเฉพาะ `m.spBreak` จาก `Spiral Pierce` เท่านั้น — ไม่กระทบ `cb_breakkris` `break_hit` ของ Mobster/Thief!)* | คุ้มกับการเสีย 1 เทิร์นฮีโร่เต็มใบ: เจาะเกราะ `50%`, ทุบโล่, ตัดร่าย, และเปิดหน้าต่าง `+15%` physical dmg |
| `KIT2.knight.pierce*` / `ultMana` (`Pierce of Judgement`) | `ultMana: 50, pierceMul: 1.2, waveMul: 2.0`, `Pierce` ใช้ `exec 1.0x` + Coat ไร้เพดาน | **`ultMana: 40`**, **`pierceMul: 0.55`**, **`waveMul: 1.3`**, `Pierce` ใช้ **`execLineShare = 0.25`** และ **`coatShare = 0.50`** (`🔱 คลื่นทะลวง` ใช้ `1.0x` exec + `1.0x` Coat cap) | ลด Ult Share จาก `90.4% → 41.3%` บน `protozero` และทำรอบ `S1 + S3 + S4 + Ult` ไหลลื่น |
| `kn_p3` (`Spear Boomerang`) | `0.8x + HP%`, `1 ครั้ง/เวฟ` | **`1.4x + HP%`**, **`คูลดาวน์ 4 เทิร์น`** (ใช้ซ้ำในบอสไฟต์ได้) | ขัดร่ายบอสได้สม่ำเสมอตลอดไฟต์ยาว |
| `kn_p4` ★ (`หอกเกลียวพิพากษา`) | `j2Spiral: 0.50` บน Ult เท่านั้น | คง `j2Spiral: 0.50` บน Ult + **เพิ่ม `+20%` DEF pierce ให้ `Brandish Spear` & `Spiral Pierce`** | ขยายคุณค่า ★ ให้หนุน S3/S4 โดยตรง |
| `kn_g2` (`เกราะเป็นแรง`) | `0.15/oldLv` (`0.45x` Lv5) | **`0.20/oldLv`** (`0.60x` Lv5) | สาย DEF ปั้น `P.ATK` เพื่อสกิลหอกได้แรงขึ้น |
| `kn_r1..kn_r4` (`กวาดทวน`) | `sweepEvery: 3`, `sweep: 0.30/oldLv`, `kn_r3` ให้แค่เกจ | **`sweepEvery: 2`** (ทุก 2 เทิร์นฮีโร่), **`sweep: 0.60/oldLv`** (`1.80x` Lv5), **`sweepCritAdd: 0.10`**, **`kn_r3` เพิ่ม `+5 Mana` ต่อการกวาด `spearSweep()`** (+ เกจหลังหัก 100 แคปที่ 100) | เปลี่ยน `กวาดทวน` เป็นเครื่องยนต์ AoE + เติม Mana ให้ Knight ทุก 2 เทิร์น |

### 2.4 การยกระดับ Class 2B (`berserker`) — 2H / Frenzy / Rage / Cleave-Execute (Zero Warlord Spillover)

| คีย์ / ID | Before (ปัจจุบัน) | After (ข้อเสนอ v2) | ผลต่อ Loop ของ Berserker |
|---|---|---|---|
| `JOB2.berserker` & Mastery | `mod: { crit: 0.05 }`, Mastery 2H: `{ atkPct: 0.08, crit: 0.03 }` (`skillCrit: 0`) | `mod: { crit: 0.05 }`, Mastery 2H: **`{ atkPct: 0.12, crit: 0.05, skillCrit: 0.05 }`** | อาวุธ 2 มือได้ `skillCrit +5%` พื้นฐานให้ `คลื่นดาบ` & `S1` ปั้น `Frenzy` ได้จริง |
| `KIT2.berserker.stormCost` (`S1`) | `35 Rage` | **`25 Rage`**, และระหว่าง `frenzy >= 3 \|\| rampage > 0` S1 แรงขึ้น **`+15%`** | ใช้ได้บ่อยขึ้นโดยไม่แย่ง Rage ของ `คลื่นดาบ` |
| `KIT2.berserker.wave*` (`คลื่นดาบ` S3) | `waveCost: 30, waveCd: 3, waveFront: 1.8, waveBack: 1.2`, **`waveCrit: 0.20` (ตายเป็น 0%)** | **`waveCost: 25`**, คง `waveCd: 3` ในระดับ global (เพื่อ **ไม่กระทบ Class 3 Warlord**) และเพิ่ม **`waveCdJ2: 2`** ที่ทำงาน **เฉพาะเมื่อ `j2.id === 'berserker' && this.st.j3Wl <= 0`**, **`waveHits: 2`**, **`waveFront: 1.65`** (`3.30x` รวม), **`waveBack: 1.20`** (`2.40x` รวม), **`waveCrit: 0.25`** (ผ่าน `kitSkillCritAdd` + คริแล้วปั้น `Frenzy +1`), **แปะเลือดไหล (Gore) `0.50x P.ATK × 2 เทิร์น`**, และ **โดน `2+` ตัวคืน `+10 Rage`** *(Warlord `warlordVariant()` ไม่ได้อ่าน `waveHits`/`waveFront`/`waveBack` จึงปลอดภัย 100%)* | `คลื่นดาบ` กลายเป็นตัวเอกของ Berserker ทั้งบอส (`3.30x` + Gore + Crit + Frenzy) และเวฟ 3 ตัว (`+10 Rage` + AoE กวาด) ชนะ `S1` ทุกสถานการณ์ |
| `KIT2.berserker.ult*` (`บ้าระห่ำ`) | `ultMul: 1.2, ultTurns: 3, ultCrit: 0.30` (ตายบน slash), `ultTaken: 0.20` | **`ultMul: 1.2 → 0.70`** (ลด burst ต้นตาม R3), **รวม `ultCrit: 0.30 → 0.25`** ให้เป็นค่าเดียวทั้ง Basic/Combo/Counter (`physCritAdd`) **และ** initial Ult slash (`kitSkillCritAdd`), **`ultTaken: 0.20 → 0.10`**, คืน **`+20 Rage`** ทันทีที่กด, และ **ไม่ใส่ `swAwAtk`** ให้ `rampage` | ลด Ult% ใน `3a/3b/3c` ลงชัดเจน (`35.3%→19.2%`, `31.9%→24.7%`, `24.3%→16.9%`) ขณะที่เปิดทางให้ `คลื่นดาบ` + `Basic/Combo` พา DPS พุ่ง 2.5x–3x |
| `bz_c1` (`คมสับ`) | `crit +3%/oldLv` | **`crit +3%/oldLv` + `skillCrit +2%/oldLv`** (`+9% crit, +6% skillCrit` Lv5) | สายคริหนุนทั้งฟันธรรมดาและ `คลื่นดาบ` |
| `bz_c3` (`ฟันซ้ำแผล`) | `j2FrenzyMax +1/oldLv` | **`j2FrenzyMax +1/oldLv` + `combo +5%/oldLv` + `comboDmg +5%/oldLv`** (`+15%` Lv5) | Frenzy สูงต่อยอดเป็น Combo Chain เจาะบอสที่มี `Ignore Combo` |
| `bz_d2` (`ไล่ล่า`) | `aspd +4%/oldLv` (`0.064/oldLv`) | **`aspd +4%/oldLv` + `s3Pow +5%/oldLv`** (`+15%` `คลื่นดาบ` Lv5) | สายดวลช่วยเร่งดาเมจ `คลื่นดาบ` ในไฟต์เดี่ยว |
| `bz_d3` (`ใจเด็ด`) | `def +3/oldLv, tenacity +5%/oldLv` | **`def +3/oldLv, tenacity +5%/oldLv` + `basicDmg +6%/oldLv`** (`+18%` Basic/Combo/Counter Lv5) | ปรับให้สายป้องกันฝั่งดวลช่วย Sustained Basic/Combo DPS จริง |
| `bz_r1` (`เดือดดาล`) | `rageGain +10%/oldLv` | **`rageGain +10%/oldLv` + `startRage +10/oldLv`** (`+30 startRage` Lv5) | เปิดเวฟด้วย Rage พร้อมปล่อย `คลื่นดาบ`/`S1` ตั้งแต่เทิร์นแรก |
| `bz_r4` ★ (`ไม่รู้สึกเจ็บ`) | `{ j2IgnorePain: 1, j2RageTurn: 1 }` (`1 ครั้ง/เวฟ` ที่ `BattleScene.ts:865`, `j2RageTurn` ตาย) | **คงกติกา `1 ครั้ง/เวฟ` (`this.ignorePainUsed = false` ใน `fight()` ที่ `BattleScene.ts:865`)** + **เชื่อม `j2RageTurn: 1 → 5`** ใน `heroAct()` (`BattleScene.ts:1218`: ฟื้น `+5 Rage/เทิร์น`, และ **`×2` = `+10 Rage/เทิร์น` ระหว่าง `ignorePainTurns > 0`**) | แก้คีย์ตาย `j2RageTurn` ให้ชัดเจนแบบไม่มีข้อยกเว้น, ปั้น Rage ต่อเนื่องใน 1v1 บอส |

### 2.5 การคงรหัสเซฟเกม (`src/save.ts` Save-Data ID Preservation)
- **ไม่มีการเปลี่ยนชื่อหรือลบ ID ใด ๆ ใน `SaveData` (`novice-to-hero.save.v1`):**
  - `job`: `'swordsman'` · `job2`: `'knight' | 'berserker'` · `job3`: `'lordknight' | 'warlord'`
  - `jobTree`: ครบทั้ง 30 โหนดใน §1.1B (`swordsman_s1p`, `swordsman_ultp`, `sw_guard*`, `sw_blood*`, `sw_taunt*`, `swordsman_core1..3`, `swordsman_a1..a4`, `swordsman_b1..b4`, `swordsman_c1..c4`, `swordsman_d1..d4`)
  - `job2Tree`: ครบทั้ง 22 โหนด Knight + 14 โหนด Berserker ใน §1.2B และ §1.3B
  - `jobTalents` / `job2Talents`: ครบทั้ง 36 ID (`sw_t1a..t4c`, `kn_t1_hp..kn_t4_kill`, `bz_t1_rage..bz_t4_leech`) ในสถานะ `Retired-Preserve-ID`
  - `passiveNodes` / `jewelSock`: ครบทั้ง 71 โหนดฐาน + 14 Awakening ใน `SWORDSMAN_PASSIVE_TREE`

---

## 3. การปรับสมดุล Swordsman Passive Constellation และ Synergy Map (`src/data/passives/swordsman.ts` — R2)

### 3.1 การตรวจเช็กขอบเขต Class 3 (Non-Duplication Audit)
ตรวจสอบเทียบกับ `src/data/passives/swordsman-awaken.ts` (14 โหนด), `src/data/trees3/lordknight.ts` (`lk_*`), และ `src/data/trees3/warlord.ts` (`wl_*`) แล้ว:
- Class 3 ครอบครองกลไกเฉพาะ: `u3Pow`, `j3GospelField`, `j3GospelHeal`, `j3Banding`, `j3AfterBless`, `j3WlBlitz`, `j3EarthDrive`, `j3Inspire`, `j3Heir`, `j3Leg*`
- การปรับโหนดฐาน 71 โหนดใน `passives/swordsman.ts` ด้านล่าง **ไม่ซ้ำซ้อน** กับกลไก Class 3 และ **ไม่ซ้ำบทบาท** ระหว่างโหนดด้วยกันเอง แต่กระจายพลังสู่สาย Non-Ult (`Basic/Cleave/Combo`, `Counter/Guard`, `S1`, `S2`, `S3`, `S4`, `Rage/Frenzy`) โดย **ถอด `s1Pow` ออกจาก `sw_n_warblade` และ `sw_n_adapt_edge (BZ)`** เพื่อให้ `S3` ของ Knight/Berserker นำหน้า `S1` เสมอ

### 3.2 ตารางตรวจสอบ 71 โหนดฐาน & แผนปรับสมดุล (`src/data/passives/swordsman.ts`)

#### A. โหนดที่เสนอปรับค่า (14 โหนดสำคัญ — Node Adjustments)

| Node ID | Sector / Kind | Before `mod` | After `mod` (ข้อเสนอ v2) | Upside / Downside & Rationale |
|---|---|---|---|---|
| `sw_k_cleavestorm` | `vanguard` / **keystone** | `{ ultMulAdd: 1.0, ultVsCharge: 0.5, cleaveAdd: 0.4, ultShieldAdd: -0.15, swCleaveTaken: 0.10 }` | **`{ cleaveAdd: 0.60, basicDmg: 0.20, s3Pow: 0.25, ultVsCharge: 0.35, ultMulAdd: -0.25, swCleaveTaken: 0.10 }`** | **ลด Ult Burst (`+1.0x → -0.25x`)** · เปลี่ยนเป็น Keystone สาย **ฟันกวาด + ทักษะ 3 AoE** (`cleave +0.6x, basic +20%, S3 +25%`) แลก Ult `-0.25x` และรับดาเมจ `+10%` |
| `sw_k_judgment` | `vanguard` / **keystone** | `{ swExecBonus: 0.50, swS1CdCut: 1, physPen: 0.08, swUltCdAdd: 1 }` | **`{ swExecBonus: 0.20, swS1CdCut: 2, s1Pow: 0.25, skillCrit: 0.10, physPen: 0.10, swUltCdAdd: 1, ultPow: -0.15 }`** | ลด `swExecBonus` (`+50% → +20%`) และแลก `ultPow -15%` + `Ult CD +1` เพื่อดัน **S1 (`CD -2`, `+25%`) + Skill Crit `+10%` + Pen `+10%`** |
| `sw_k_bloodvamp` | `warblood` / **keystone** | `{ overhealShield: 1, spellVamp: 0.22, skillDmgCut: 0.20 }` | **`{ overhealShield: 1, spellVamp: 0.20, lifesteal: 0.04, def: -15, mdef: -0.05 }`** | **ถอดโทษ `-20% skillDmgCut` ที่ทำร้าย S1/S3/S4/Ult** · เปลี่ยนข้อเสียเป็น **เกราะบางลง (`P.DEF -15, M.DEF -5%`)** แลก Overheal Shield + ดูดเลือด 2 ทาง |
| `sw_k_juggernaut` | `bastion` / **keystone** | `{ swIronDr: 0.15, ultShieldAdd: 0.15, tenacity: 0.15, swIronAspdCut: 0.15, ultMulAdd: -0.20 }` | **`{ swIronDr: 0.15, ultShieldAdd: 0.15, tenacity: 0.15, counterDmg: 0.20, swIronAspdCut: 0.15, ultMulAdd: -0.20 }`** | เพิ่ม **`counterDmg +20%`** ให้สายถึกป้อมเหล็กโต้กลับแรงขึ้นระหว่างยอมลด ASPD/Ult |
| `sw_k_thornguard` | `bastion` / **keystone** | `{ swCounterDefMul: 1.2, counter: 0.15, swBlockCounter: 1, swNoFlee: 1 }` | **`{ swCounterDefMul: 1.5, counter: 0.15, swBlockCounter: 1, swNoFlee: 1 }`** | เพิ่ม `swCounterDefMul` `1.2x → 1.5x` ให้สาย DEF + Auto Guard + Counter ทำดาเมจข้ามเกราะสมน้ำสมเนื้อกับข้อเสีย FLEE = 0 |
| `sw_n_adapt_ult` | `fury` / **notable** (adaptive) | Base `{ ultPow: 0.18, ultShieldAdd: 0.06, startRage: 10 }` · KN `{ ult2Pow: 0.20, j2Guard: 0.05, j2Banner: 0.06 }` · BZ `{ ult2Pow: 0.20, j2FrenzyMax: 2, rageGain: 0.15 }` | **Base:** `{ s1Pow: 0.15, ultPow: 0.10, ultShieldAdd: 0.08, startRage: 15 }` · **KN:** `{ s3Pow: 0.15, j2Sweep: 0.20, j2Guard: 0.06, ult2Pow: 0.10 }` · **BZ:** `{ s3Pow: 0.15, skillCrit: 0.05, j2FrenzyMax: 2, rageGain: 0.15 }` | เกลี่ยพลังจาก `ult2Pow` (`0.20 → 0.10` / `0`) ไปหนุน **S1 / Brandish / ทวนวน / คลื่นดาบ / Skill Crit** ตามอัตลักษณ์คลาส 2 |
| `sw_n_adapt_edge` | `vanguard` / **notable** (adaptive) | Base `{ pskill: 0.12, basicDmg: 0.10 }` · KN `{ j2HpDmg: 0.015, j2Charge: 0.40 }` · BZ `{ j2Duel: 0.14, critMul: 0.15 }` | **Base:** `{ pskill: 0.12, basicDmg: 0.12, s1Pow: 0.12 }` · **KN:** `{ j2HpDmg: 0.02, j2Charge: 0.50, s3Pow: 0.12 }` · **BZ:** `{ j2Duel: 0.16, critMul: 0.18 }` | เติม S1 ให้ Swordsman และ S3 ให้ Knight, ขณะที่คงจุดแข็ง Duel + CritDmg ของ Berserker (ไม่ดัน S1 แซงคลื่นดาบ) |
| `sw_n_ultcounter` | `bastion` / **notable** | `{ ultCounters: 3, counterDmg: 0.15, ctrAoe: 1 }` | **`{ ultCounters: 2, swS1Ctr: 1, counterDmg: 0.20, ctrAoe: 1 }`** | ลดการผูกมัดกับ Ult: กด **S1** ก็ได้สวนกลับแน่นอน `+1` ครั้ง (+ `ctrAoe` และ `counterDmg +20%`) |
| `sw_n_breaker` | `vanguard` / **notable** | `{ swS3ArmorBreak: 1, s3Pow: 0.15, physPen: 0.06 }` | **`{ swS3ArmorBreak: 1, s3Pow: 0.20, physPen: 0.08 }`** (ให้ `S4 Spiral Pierce` แปะ `armorBrk` ร่วมด้วย) | หนุนทั้ง S1, S3 (`Brandish`/`คลื่นดาบ`), และ S4 (`Spiral Pierce`) |
| `sw_n_warblade` | `vanguard` / **notable** | `{ physPen: 0.10, skillCrit: 0.05, s3Pow: 0.12 }` | **`{ physPen: 0.10, skillCrit: 0.08, s3Pow: 0.15 }`** | Outer Notable สายคมดาบหนุน `physPen +10%`, `skillCrit +8%`, และ `S3 +15%` (ช่วยให้ Class 2 `S3` นำหน้า `S1` ชัดเจน) |
| `sw_m_bridge_n` | `vanguard` / **minor** | `{ counter: 0.04, ultPow: 0.06 }` | **`{ counter: 0.04, s1Pow: 0.08 }`** | เชื่อมสะพานบนเข้าสาย S1 + Counter แทน Ult |
| `sw_m_van6` | `vanguard` / **minor** | `{ skillCrit: 0.03, physPen: 0.04 }` | **`{ skillCrit: 0.05, physPen: 0.04 }`** | เปิดทาง `skillCrit` ให้สาย S1/S3/S4 เร็วขึ้น |
| `sw_m_fur6` | `fury` / **minor** | `{ atk: 10, skillCrit: 0.03 }` | **`{ atk: 10, skillCrit: 0.05 }`** | เปิดทาง `skillCrit` ฝั่ง Fury ให้ Berserker เร็วขึ้น |
| `sw_n_vitality` | `warblood` / **notable** | `{ mdef: 0.08, resRegen: 2, maxRes: 20, shieldAmp: 0.08 }` | **`{ mdef: 0.08, resRegen: 3, maxRes: 25, shieldAmp: 0.10 }`** | เพิ่ม Mana regen (`+6 → +9/turn`) + Max Mana (`+20 → +25`) ช่วย Knight ร่าย `S1+S3+S4+Ult` เต็มรอบ |

#### B. โหนดอีก 57 โหนดที่คงเดิม (Keep — ไม่มีซ้ำซ้อน)
- **Origin & Inner Ring (9):** `sw_origin`, `sw_m_van1`, `sw_m_bas1`, `sw_m_fur1`, `sw_m_bld1`, `sw_m_ring_n`, `sw_m_ring_e`, `sw_m_ring_s`, `sw_m_ring_w`
- **Bridges & Sockets (7):** `sw_m_bridge_e`, `sw_m_bridge_s`, `sw_m_bridge_w`, `sw_sock_n`, `sw_sock_e`, `sw_sock_s`, `sw_sock_w`
- **Vanguard (8):** `sw_n_cleave`, `sw_m_van2`, `sw_n_eagleeye`, `sw_m_van3`, `sw_m_van4`, `sw_m_van5`, `sw_n_blademaster`, `sw_m_van7` *(8 โหนดคงเดิม + 7 โหนดปรับใน Vanguard = 15 โหนด; รวม `sw_m_van1` ใน Inner Ring และ `sw_sock_n` ใน Sockets = 17 โหนดฝั่ง Vanguard)*
- **Bastion (11):** `sw_n_guardwall`, `sw_m_bas2`, `sw_n_ironsteel`, `sw_m_bas3`, `sw_m_bas4`, `sw_m_bas5`, `sw_m_bas6`, `sw_n_citadel`, `sw_m_bas7`, `sw_m_bas8`, `sw_n_aegis` *(11 คงเดิม + 3 ปรับใน Bastion = 14 โหนด)*
- **Fury (11):** `sw_n_hotblood`, `sw_m_fur2`, `sw_n_vengeance`, `sw_m_fur3`, `sw_n_execute`, `sw_k_berserkpact`, `sw_m_fur4`, `sw_m_fur5`, `sw_n_warlord_fury`, `sw_m_fur7`, `sw_n_reaver` *(11 คงเดิม + 2 ปรับใน Fury = 13 โหนด)*
- **Warblood (11):** `sw_n_bloodthirst`, `sw_m_bld2`, `sw_m_bld3`, `sw_n_undying`, `sw_m_bld4`, `sw_m_bld5`, `sw_m_bld6`, `sw_n_immortal_body`, `sw_m_bld7`, `sw_m_bld8`, `sw_n_sanguine_lord` *(11 คงเดิม + 2 ปรับใน Warblood = 13 โหนด)*

*(ตรวจยอดรวม: `9 + 7 + 8 + 11 + 11 + 11 = 57` โหนดคงเดิม + `14` โหนดที่ปรับ = **`71` โหนดฐานครบ 100%** + `14` โหนด Class 3 Awakening ใน `swordsman-awaken.ts` = `85` โหนดทั้งหมด)*

### 3.3 Synergy Matrix (Skill / Branch ↔ `passives/swordsman.ts` Nodes)

| สกิล / สายการเล่นที่รีเวิร์ค | โหนดหลักใน `passives/swordsman.ts` ที่เชื่อมโยง | กลไกที่เสริมร่วมกัน (Synergy Loop) |
|---|---|---|
| **Basic + Cleave + Combo** (`swordsman` / `kn_c` / `bz_c3` / `bz_d3`) | `sw_n_cleave`, `sw_m_van2`, `sw_n_eagleeye`, `sw_m_van3`, `sw_m_van5`, `sw_n_blademaster`, `sw_k_cleavestorm` | `cleaveAdd` (+0.35 + 0.60), `combo` (+14% + `bz_c3` +15%), `comboDmg` (+15% + `bz_c3` +15%), `basicDmg` (+39% + `bz_d3` +18%) → ฟัน 1v1 แรงและสาดเวฟได้ |
| **Counter + Auto Guard + `sw_guard` / `sw_taunt`** | `sw_m_ring_n`, `sw_m_bridge_n`, `sw_n_ironsteel`, `sw_n_ultcounter`, `sw_m_bas4`, `sw_m_bas5`, `sw_n_citadel`, `sw_k_thornguard`, `sw_k_juggernaut` | บล็อก/สวนกลับได้ทั้ง `counterRage +8`, `counterShield 5%`, `ctrAoe 0.5x`, `1.5x P.DEF` true dmg, และ `Auto Guard` เติม `0.50 × mitigatedEst` เข้า `guardPool` ของ `sw_guard` |
| **S1: ⚔️ ดาบสยบมนตร์ (`swordsman_b/c`)** | `sw_m_bridge_n`, `sw_n_breaker`, `sw_n_adapt_edge` (Base), `sw_n_adapt_ult` (Base), `sw_k_judgment`, `sw_n_ultcounter`, `sw_m_van6` | `swS1CdCut -2`, `s1Pow` ส่วนเกิน (`+45%` Mid / `+33%` Knight), `skillCrit +15%..+23%`, `swS3ArmorBreak`, `swS1Ctr +1` → S1 ออกทุก 3 เทิร์น พร้อมใบ้+เกราะแตก+สวนแน่นอน |
| **S2: `sw_blood` (🩸 เลือดเดือด)** | `sw_n_bloodthirst`, `sw_n_immortal_body`, `sw_n_sanguine_lord`, `sw_k_bloodvamp`, `sw_k_berserkpact` | ถอด `bloodCut` (`0.15 → 0`) และ `skillDmgCut` (`0.20 → 0`) → กด `S1/S3/S4` ดูดเลือดเต็มดาเมจและแปลงส่วนเกินเป็น **Overheal Shield 50% HP** |
| **Knight S3 (`Brandish`) + `ทวนวน` (`kn_r`)** | `sw_n_breaker`, `sw_n_adapt_edge` (KN), `sw_n_adapt_ult` (KN), `sw_m_van7`, `sw_n_warblade`, `sw_k_cleavestorm`, `sw_n_vitality` | `s3Pow` (`1.66`–`1.90`), `j2Sweep +0.20`, `j2HpDmg +2%`, `skillCrit +15%..+23%`, `resRegen +3` (+9 Mana/turn) → หมุน `Brandish` (`3.4x`/`4.93x`) + `ทวนวน` ทุก 2 เทิร์นต่อเนื่อง |
| **Knight S4 (`Spiral Pierce` + `Break`)** | `sw_n_breaker`, `sw_m_van6`, `sw_n_warblade`, `sw_n_execute`, `sw_k_judgment`, `sw_m_fur6` | ได้ `skillCrit` (`+23%` + `25%` innate = `48%`), `physPen`, `critMul`, `swS3ArmorBreak`, `defPierce 50%` (+`20%` จาก `kn_p4`), และ `spBreak` เปิด `+15%` Knight physical dmg |
| **Berserker S3 (`คลื่นดาบ`) + `Frenzy` + `บ้าระห่ำ`** | `sw_n_hotblood`, `sw_n_vengeance`, `sw_n_adapt_edge` (BZ), `sw_n_adapt_ult` (BZ), `sw_n_execute`, `sw_k_berserkpact`, `sw_m_fur6`, `sw_n_reaver`, `sw_n_warblade` | `waveCrit +25%` + `skillCrit +39%` = คริ 60% (cap) ปั้น `Frenzy` (`max 10`) เต็มไว, `s3Pow` (`1.69`–`1.93`), `swordsman_a4` ★ ได้โล่จาก `บ้าระห่ำ` (`30%`) + `คลื่นดาบ` (`15%`), `startRage 55` |
| **Ult (`ดาบพิพากษา` / `Pierce` / `บ้าระห่ำ`)** | `sw_n_execute`, `sw_k_berserkpact`, `sw_n_reaver`, `sw_k_judgment` (ลดสัดส่วน) | ลดสัดส่วนจาก `52%–90%` ลงมาอยู่ที่ **`16.9%–45.6%`** ของ DPS รวมโดยไม่ลดความเสถียรของไฟต์ |

---

## 4. การวิเคราะห์เชิงปริมาณ Before vs After (Ult vs Non-Ult — R3)

### 4.1 พารามิเตอร์การจำลองที่ตรวจสอบซ้ำได้ 100% (Reproducible Simulation Spec)

ทุกตัวเลขใน §4.2 คำนวณด้วย **Deterministic Expected-Value Turn-by-Turn Formula Engine** ที่ถอดสูตรตรงจาก `src/data/mon-stats.ts`, `src/data/jobs.ts`, `src/data/jobs2.ts`, `src/data/skill-math.ts`, `src/data/battle-rules.ts`, `src/data/passives/swordsman.ts`, และ `src/scenes/BattleScene.ts`:

1. **ค่ามอนสเตอร์จาก `statMonster(MONSTERS.*, lv)`:**
   - `lich` (D5 Boss Lv 21, `dungeon-defs.ts:74`): `8,701 HP`, `86.85 DMG`, `50 DEF`, `44 HIT`, `18 FLEE`, `speed 11`
   - `hellknight` (D5 Mob Lv 19 — ห้องปกติใน `dungeon-defs.ts:69,73`): **`812 HP`, `78.36 DMG`, `80 DEF`, `40 HIT`, `5 FLEE`, `speed 10`** *(หมายเหตุ: `hellknight` Lv 20 ห้อง Mini ใน `dungeon-defs.ts:71` = `854 HP, 82.60 DMG, 81 DEF, 5 FLEE`)*
   - `pharaoh` (D6 Boss Lv 50, `dungeon-defs.ts:85`): `55,678 HP`, `298 DMG`, `83 DEF`, `69 HIT`, `6 FLEE`, `speed 10`
   - `protozero` (D14 Boss Lv 102, `d14.ts:137`): `556,471 HP`, `1,174.2 DMG`, `204 DEF`, `134 HIT`, `47 FLEE`, `speed 16.15`
   - `clonesword` (D14 Mob Lv 100, `d14.ts:132`): `8,299 HP`, `990.15 DMG`, `211 DEF`, `106 HIT`, `21 FLEE`, `speed 12.25`

2. **กติกาเทิร์น, HP Reset, และการโจมตีของมอนสเตอร์:**
   - **HP Reset / Wave-Crawl Rule:** ในหน้าต่างจำลองหลายเทิร์น (`8t–18t`) เมื่อมอนสเตอร์ที่เหลืออยู่ทั้งหมดลดลง `<= 0 HP`, บอสหรือฝูงมอน 3 ตัวจะ respawn ที่ `100% HP` เพื่อให้ `hpFrac` หมุนเวียนตามจริงแทนการค้างที่ `0%`; `firstSwing = true` (สำหรับ `Charge Attack / ทะยาน`) รีเซ็ตเฉพาะเมื่อ respawn เวฟมอนธรรมดา (ไม่รีเซ็ตระหว่างบอสไฟต์).
   - **`monHitsPerTurn`:** `1.0` (`lich`, `pharaoh`, และเวฟ 3 ตัวคิด aggro เฉลี่ย `1.8x` ต่อเทิร์น), `1.2` (`protozero` vs Berserker), `1.35` (`protozero` vs Knight); **`chargeEvery`:** `4` เทิร์น (`lich`), `3` เทิร์น (`pharaoh`, `protozero`).
   - **S1 `baseLv` & `s1Pow` excess:** Before ใช้ `swordS1Raw()` เดิม; After ใช้ `effBaseLv = blv <= 35 ? blv : 35 + (blv - 35) * 0.20` และคูณ `swordS1ExcessPow(st)` (`1 + Math.max(0, st.s1Pow - 0.12 * st.swS1Lv)`).

3. **ชุด Passive Constellation ที่ใช้ในแต่ละ Build (รหัสโหนดครบทุกจุดใน `SWORDSMAN_PASSIVE_TREE`):**
   - **`sw_mid` (`20` แต้ม + Origin):** `sw_origin`, `sw_m_van1`, `sw_n_cleave`, `sw_m_van2`, `sw_n_eagleeye`, `sw_m_ring_n`, `sw_n_ironsteel`, `sw_m_bridge_n`, `sw_m_bas1`, `sw_m_bas2`, `sw_n_ultcounter`, `sw_m_bas4`, `sw_k_thornguard`, `sw_m_van3`, `sw_n_breaker`, `sw_m_van6`, `sw_n_adapt_edge`, `sw_k_judgment`, `sw_m_bld1`, `sw_m_bld2`, `sw_n_vitality`
   - **`kn_mid` / `kn_end` (`30` แต้ม + Origin):** `sw_mid` + `sw_n_guardwall`, `sw_m_bas3`, `sw_k_juggernaut`, `sw_m_bridge_e`, `sw_n_adapt_ult`, `sw_m_van7`, `sw_n_warblade`, `sw_m_bas5`, `sw_m_bas6`, `sw_n_citadel`
   - **`bz_mid` / `bz_end` (`28` แต้ม + Origin):** `sw_origin`, `sw_m_van1`, `sw_n_cleave`, `sw_m_van2`, `sw_n_eagleeye`, `sw_m_van3`, `sw_n_breaker`, `sw_n_adapt_edge`, `sw_m_van6`, `sw_m_van7`, `sw_n_warblade`, `sw_m_fur1`, `sw_n_hotblood`, `sw_m_fur2`, `sw_n_vengeance`, `sw_m_fur3`, `sw_n_adapt_ult`, `sw_n_execute`, `sw_m_fur4`, `sw_m_fur5`, `sw_n_warlord_fury`, `sw_m_fur6`, `sw_m_fur7`, `sw_n_reaver`, `sw_m_bld1`, `sw_n_bloodthirst`, `sw_m_bld2`, `sw_n_undying`, `sw_k_bloodvamp`

4. **ตารางค่า Derived Build Totals (Before → After):**

| Build | BaseLv / S1Lv / UltLv | P.ATK | STR / DEF / MaxHP | `pskill` / `crit` / `skillCrit` / `critMul` | `combo` / `counter` | `s1PowTot` / `s3Pow` / `ultPow` / `ult2Pow` | `maxRes` / `resTurn` |
|---|---|---:|---:|---:|---:|---:|---:|
| **Swordsman Mid (`sw_mid`)** | `35 / 5 / 5` | `260 → 260` | `90 / 48 / 3,200` | `0.45 / 12% / 3%→15% / 1.55` | `20% / 40%` | `0.60→1.05 / 0.15→0.20 / 0.66→0.45 / 0` | `80→85 / 15→18` (`sw_guard`) |
| **Knight Mid-High (`kn_mid`)** | `60 / 8 / 8` | `447 → 460` | `120 / 90 / 9,200` | `0.60 / 18% / 8%→23% / 1.60` | `20% / 45%` | `0.96→1.29 / 1.31→1.66 / 1.02→0.81 / 0.80→0.70` | `80→85 / 15→18` (`sw_guard`) |
| **Knight Endgame (`kn_end`)** | `99 / 10 / 10` | `1,072 → 1,096` | `220 / 160 / 21,000` | `1.10 / 25% / 8%→23% / 1.75` | `28% / 45%` | `1.20→1.53 / 1.55→1.90 / 1.26→1.05 / 0.80→0.70` | `80→85 / 15→18` (`sw_guard`) |
| **Berserker Mid-High (`bz_mid`)** | `60 / 8 / 8` | `480 → 498` | `130 / 36→21 / 6,800` | `0.60 / 58.5%→60.5% / 16%→39% / 2.35→2.38` | `20%→35% / 20%` | `0.96→0.96 / 1.31→1.69 / 0.96→0.96 / 0.80→0.60` | `100 Rage` (`sw_blood`, `startRage 25→55`) |
| **Berserker Endgame (`bz_end`)** | `99 / 10 / 10` | `1,150 → 1,193` | `240 / 71→56 / 14,500` | `1.20 / 63.5%→65.5% / 16%→39% / 2.70→2.73` | `28%→43% / 20%` | `1.20→1.20 / 1.55→1.93 / 1.20→1.20 / 0.80→0.60` | `100 Rage` (`sw_blood`, `startRage 25→55`) |

- **การจัดหมวดหมู่ Ult vs Non-Ult:**
  - **`Ult (incl. Δ)`:** ดาเมจตรงจาก `🌊 คลื่นดาบ` / `Pierce` + `🔱 คลื่นทะลวง` / `บ้าระห่ำ` slash **รวมส่วนต่างดาเมจ (`Δ Awaken` / `swordCoatPct` / `swAwAtk`) ที่เพิ่มเข้ามาใน Basic/Combo/Counter** และ **ฮิตที่ 2 ของ `rampage`**
  - **`Non-Ult`:** `Basic+Combo+Cleave (ฐาน)` + `Counter (รวม sw_guard & ถึกสะท้อน)` + `S1 (ดาบสยบมนตร์)` + `S3 (Brandish / ทวนวน / Boomerang / คลื่นดาบ)` + `S4 (Spiral Pierce)`

### 4.2 ตารางเปรียบเทียบ Before vs After (ครบทั้ง 8 Scenarios + Knight Mana Economy Matrix)

| Scenario | State | Total Dmg | DPS/t | **Non-Ult DPS/t** | Basic+Combo | Counter | S1 | S3 (+Proc) | S4 | **Ult (incl. Δ)** | **Ult %** | **Non-Ult %** |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **1a. Swordsman Mid** (`lich` 8.7k, 12t) | Before | 47,674 | 3,973 | 1,884 | 1,144 | 3,493 | 17,965 | — | — | 25,072 | **52.6%** | **47.4%** |
| | **After** | 41,625 | 3,469 | **2,359** | 986 | 4,907 | 22,410 | — | — | 13,322 | **32.0%** | **68.0%** |
| **1b. Swordsman Mid** (`3× hellknight` Lv19, 8t) | Before | 47,356 | 5,919 | 2,817 | 1,403 | 5,198 | 15,934 | — | — | 24,821 | **52.4%** | **47.6%** |
| | **After** | 42,158 | 5,270 | **3,670** | 1,193 | 7,036 | 21,130 | — | — | 12,799 | **30.4%** | **69.6%** |
| **2a. Knight Mid-High** (`pharaoh` 55.7k, 14t) | Before | 336,649 | 24,046 | 5,680 | 3,653 | 12,836 | 47,161 | 12,074 | 3,799 | 257,126 | **76.4%** | **23.6%** |
| | **After** | 249,347 | 17,810 | **9,690** | 2,886 | 18,379 | 41,897 | **54,199** | 18,300 | 113,686 | **45.6%** | **54.4%** |
| **2b. Knight Endgame** (`protozero` 556k, 18t) | Before | 1,896,128 | 105,340 | 10,143 | 8,540 | 40,768 | 88,686 | 34,336 | 10,241 | 1,713,557 | **90.4%** | **9.6%** |
| | **After** | 752,759 | 41,820 | **24,562** | 7,526 | 62,850 | 85,707 | **190,400** | **95,641** | 310,635 | **41.3%** | **58.7%** |
| **2c. Knight Endgame** (`3× clonesword`, 8t) | Before | 707,418 | 88,427 | 14,324 | 14,707 | 32,315 | 35,828 | 26,975 | 4,770 | 592,823 | **83.8%** | **16.2%** |
| | **After** | 441,186 | 55,148 | **30,677** | 4,818 | 48,337 | 51,224 | **99,180** | 41,855 | 195,772 | **44.4%** | **55.6%** |
| **3a. Berserker Mid-High** (`pharaoh` 55.7k, 12t) | Before | 131,478 | 10,956 | 7,085 | 15,913 | 0 | 55,136 | 13,968 | — | 46,461 | **35.3%** | **64.7%** |
| | **After** | 299,035 | 24,920 | **20,128** | 19,896 | 1,893 | 108,757 | **110,995** | — | 57,494 | **19.2%** | **80.8%** |
| **3b. Berserker Endgame** (`protozero` 556k, 16t) | Before | 386,186 | 24,137 | 16,442 | 40,763 | 0 | 178,834 | 43,479 | — | 123,110 | **31.9%** | **68.1%** |
| | **After** | 1,216,007 | 76,000 | **57,261** | 71,156 | 3,652 | 248,053 | **593,314** | — | 299,831 | **24.7%** | **75.3%** |
| **3c. Berserker Endgame** (`3× clonesword`, 8t) | Before | 195,363 | 24,420 | 18,490 | 17,409 | 6,645 | 105,970 | 17,899 | — | 47,440 | **24.3%** | **75.7%** |
| | **After** | 535,855 | 66,982 | **55,665** | 31,265 | 21,255 | 112,718 | **280,084** | — | 90,533 | **16.9%** | **83.1%** |

#### Knight Mana Economy Matrix (`2b` `protozero` 18t After — Base Mana vs `sw_n_vitality`)

| รูปแบบ Mana ของ Knight | Casts (`U / S1 / S3 / S4 / Bas`, `ultDelayed`) | Total Dmg | `S1` / `S3` / `S4` | `Ult %` | ผลการประเมิน |
|---|---|---:|---:|---:|---|
| 1. Base (`60 / 9/turn`) + บอสกายภาพ (`kn_o4 + kn_r3`) | `4 / 4 / 4 / 5 / 5`, `del = 0` | `661,490` | `76.6k / 138.0k / 67.1k` | `47.7%` | Ult **ไม่ดีเลย์** (`skill3Turn` reserve ทำงาน), เสียอย่างละ 1 cast (`-91k`) |
| 2. **`sw_n_vitality` (`85 / 18/turn`)** + บอสกายภาพ | `4 / 5 / 5 / 6 / 3`, `del = 0` | **`752,759`** | `85.7k / 190.4k / 95.6k` | **`41.3%`** | รอบสกิลเต็มสูบ (`+1` S1/S3/S4) |
| 3. Base (`60 / 9/turn`) + บอสเวท 0-block | `4 / 3 / 4 / 4 / 7`, `del = 0` | `603,083` | `57.4k / 137.4k / 51.9k` | `50.8%` | ขาด Mana ร่าย `S1/S4` (`-137k` Non-Ult) |
| 4. **`sw_n_vitality` (`85 / 18/turn`)** + บอสเวท 0-block | `4 / 5 / 5 / 6 / 3`, `del = 0` | **`739,908`** | `88.2k / 188.2k / 91.8k` | **`41.5%`** | ร่ายสกิลลื่นไหลเต็มรอบแม้บล็อก `0` ครั้ง |

### 4.3 ข้อสรุปเชิงตัวเลขจากการจำลอง
1. **ลด `Ult%` ผ่านเกณฑ์ R3 ครบทั้ง 8 Scenarios:** Swordsman Mid (`52.6%→32.0%`, `52.4%→30.4%`), Knight (`76.4%→45.6%`, `90.4%→41.3%`, `83.8%→44.4%`), และ Berserker (`35.3%→19.2%`, `31.9%→24.7%`, `24.3%→16.9%`).
2. **Non-Ult DPS เพิ่มขึ้นทุก Scenario:** Swordsman `+25%` ถึง `+30%`, Knight `+71%` ถึง `+142%` (`protozero` `S3` พุ่ง `5.5x` และ `S4` พุ่ง `9.3x`), และ Berserker พุ่ง `2.8x–3.5x`.
3. **Class 2 `S3` นำหน้า Class 1 `S1` ครบทั้ง 6 Scenarios ของ Class 2:** Knight (`2a: 54.2k vs 41.9k`, `2b: 190.4k vs 85.7k`, `2c: 99.2k vs 51.2k`) และ Berserker (`3a: 111.0k vs 108.8k`, `3b: 593.3k vs 248.1k`, `3c: 280.1k vs 112.7k`).

---

## 5. แผนการนำไปอิมพลีเมนต์และตรวจรับ (Implementation & Verification Checklist)

เมื่อนำข้อเสนอนี้ไปลงโค้ดจริงในขั้นถัดไป (ไม่อยู่ในขอบเขต Proposal รอบนี้):
1. **Data (`src/data/`):**
   - อัปเดต `SWORD_MANA`, `SWORD_S1` (ครบ 15 เลเวล + `baseLvSoft` / `baseLvAfterScale`), `SPELL_VAMP.bloodCut = 0`, `JOBS.swordsman.mod` (`cleaveAdd: 0.10`) ใน `src/data/jobs.ts` (คง `JOB2.knight.mod = {}` และ `S2N.bloodAtk = 0.20` ตามเดิม)
   - อัปเดต `KIT.swordS1Tree`, `KIT.swordUltTree`, `KIT2.knight`, `KIT2.berserker`, `S2P.guardDef`, `S2N.bloodTaken`, `S2N.tauntCtrAmp`, `S2N.tauntStarShield`, และ `autoInfo()` (`swordS1ExcessPow` + ลบ `swWaveAmp`) ใน `src/data/skill-math.ts`
   - อัปเดต `src/data/trees/swordsman.ts`, `src/data/trees2/{knight,berserker}.ts`, `src/data/passives/swordsman.ts` (14 โหนด), `src/data/skill4.ts` (`spBreak`), และซิงก์ tunable keys / whitelist ใน **`src/data/tunables.ts`** และ **`src/data/skill-registry.ts`** (เพิ่ม `swS1CtrDmg`, `bloodTaken`, `s4.defPierce`, `s4.spBreakAmp`, `waveCdJ2`, ถอด `swordVampDmgCut` ออกจาก `sw_k_bloodvamp`) โดย **ห้ามแก้/ลบ Save-Data ID ใด ๆ**
2. **Engine (`src/scenes/BattleScene.ts`):**
   - ย้าย `swordCoatPct` ออกมาเป็นโบนัสหลัง `roll()` แบบมี `coatAtkCap = 1.25 * st.atk` + `coatShare = 0.5` (`knightPierce()`), แยก `execLineShare = 0.25` ให้ `knightPierce()` และถอด `full ?` gate ที่ `1495` (ให้ Berserker ใช้ `swExecAdd`)
   - เพิ่มช่อง `kitSkillCritAdd` ใน `strike()`/`critRateFor()` สำหรับ `waveCrit`, `ultCrit` (slash), `S1`/`S3`/`S4`/`ทวนวน`
   - เชื่อม `swordS1ExcessPow(st)` ใน `swordS1()` (`4632`), ผ่อนปรน `!ultWaiting` (`1268`), แยก `s1CtrDmgLeft` สำหรับ `swordsman_b4` ★, เชื่อม `mitigatedGuardHit()` (`0.50 * mitigatedEst`) เข้า `guardPool` ตอน `Auto Guard` บล็อก (`5805`), เพิ่ม `S2N.bloodTaken` ใน `takenMul()` (`6147`)
   - เชื่อม `skill3Turn()` Ult Mana reservation (`2925`), `m.spBreak` (`Spiral Pierce` +15% Knight physical dmg, ไม่กระทบ `cb_breakkris`), `kn_r1..r4` (`sweepEvery: 2`, `+5 Mana`), `swordsman_a1..a4` & `d3` บน `rampage > 0`, `waveCdJ2: 2` เฉพาะ `j2.id === 'berserker' && this.st.j3Wl <= 0` (ไม่กระทบ Warlord), และ `j2RageTurn: 5` (`×2` ระหว่าง `ignorePainTurns > 0`, คง `1/wave` ที่ `865`)
3. **Tests & Balance Run:**
   - อัปเดต/เพิ่ม Unit Tests ใน **`tests/sword-engine.test.ts`**, **`tests/knight-judgement.test.ts`**, **`tests/sword-execute.test.ts`**, **`tests/skill4.test.ts`**, **`tests/passive-swordsman.test.ts`**, **`tests/passive-battle.test.ts`** สำหรับค่าคงที่ที่ปรับใหม่ (`SWORD_S1.cd`, `KIT2.knight.ultMana`, `KIT2.knight.s4.*`, `KIT.swordVampDmgCut`, `KIT.swordUltTree.awAtk`, `KIT.swordS1CdCut`)
   - รัน `npm run typecheck`, `npm test`, และ `tools/bot.cjs` เทียบ D5/D6/D10/D14 เพื่อยืนยัน Win Rate จริงหลังลงโค้ด
