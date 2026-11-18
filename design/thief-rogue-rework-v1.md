# Thief & Rogue Rework v1 (Revision 4 — P1 commit แล้วบน branch (ยังไม่ push/merge) · P2/P3 รออนุมัติ)

## 🆕 Rev 4 Delta (2026-11-19) — อ่านส่วนนี้ก่อน · ถ้าขัดกับเนื้อหา Rev 3 ด้านล่าง ให้ถือ Rev 4 เป็นหลัก

### R4.1 สิ่งที่ commit แล้ว (branch `claude/thief-ult-agi-ratio` · ยังไม่ push · ยังไม่ได้เล่นทดสอบในเกม)
| Commit | งาน | แทนที่ Rev 3 |
|---|---|---|
| `9302177` | **Ratio AGI:** `thUltAgi = KIT.thiefUltAgiK (2.0) × min(KIT.thiefUltAgiShareCap (1.2), AGI ÷ statPool)` · `statPool = 3 × Base Lv` | `thUltAgi = 0.01 × AGI` (§2.5, §4, §7.1) |
| `d0ca9e9` | **พายุมีด อ่าน `j2KnifeMul`:** `(ultKnifeMul + KIT2.rogue.ultKnifeJ2Share (0.75) × j2KnifeMul) × h2` | สูตร `UltKnifeMul` §3.4 (ไม่คูณ ultPow ซ้ำ: `h2` มีอยู่แล้ว) |
| `f5c3f20`+ | **`ทวงหนี้` debt kill ไม่กระจายพิษซ้ำ** (flag `debtBursting` ข้ามเฉพาะ `poisonSpread` · ยังได้ `poisonAmp` ของกัดกร่อนครบ) | แถว CRITICAL ใน §6 |
| `4825e8a` | **Back Stab ทะลุ `luckyDodge`** (flag `backStabbing` แยกจาก `sureHit`) + **`rg_x4 ★` ปามีดเมื่อ Back Stab คริ** | §3.3 + `rg_x4` ส่วน Back Stab (ยังไม่รวม Plagiarism) |

### R4.2 สิ่งที่คิวตัดสินแล้ว
- **คิวเล่นจริง (Lv80 Rogue, AGI 238):** ที่แรงเกินคือ "แทง 7 ที" ของเงาพริ้ว (~90% ของดาเมจ Ult) ส่วนมีด 8 เล่มของพายุมีดอ่อน → แก้ด้วย Ratio AGI (−48% ที่ Lv80, ต้นเกม +38%)
- **พิษกระจายตอน `ทวงหนี้` ฆ่า:** แทบไม่ได้ใช้จริง → การสลับ `m.poison = 0` ก่อน `damageMon()` ถือเป็น cleanup ทำได้เลย (ไม่ใช่ "CRITICAL BUG FIX")
- **Mobster = ทาง A (2026-11-19):** ให้ Mobster เปลี่ยนตาม rework ของ Thief web แล้ววัด `JOB2_K.mobster` ใหม่ (ไม่ต้องคงโหนด flat ไว้ให้)
- **แทงพิษ (2026-11-19):** คูณ `(1 + pskill)` + `thiefAuto` 1.6 → 1.0 (Lv80 STR 121 เท่าเดิม) ✅ commit `422beb2`
- **ระบบ stat แบบ RO** (แต้มต่อเลเวลเพิ่มขึ้น + ลง stat แพงขึ้น) แยกไปทำใน `design/ro-stat-curve-v1.md` → ถ้าผ่าน ต้องแก้ `statPool()` ให้วัดจาก "แต้มที่จ่ายให้ AGI ÷ แต้มทั้งหมด"

### R4.3 กติกาใหม่ที่ทับ Rev 3
1. **Ult budget:** ทุกแหล่งที่เพิ่มฮิตเงาพริ้ว (`dexUltHits` +6, `th_t3b`, On-Hit `eff`, finisher) คูณ ×AGI (สูงสุด ×3.4) ด้วย → ดาเมจรวมของ Ult ที่ Lv80 ต้อง **≤ หลัง Ratio AGI** · *ข้อเสนอ (ยังไม่ได้ตัดสิน):* ลด `dexUltHits` cap เหลือ +3 และไม่บวก `thUltDex` เข้ากับ `thUltAgi` ตรง ๆ
2. **ห้าม magic number ใน `BattleScene`** (AGENTS.md): ทุกตัวเลขใน Rev 3 ที่บอกว่า "บวก base ใน BattleScene" (`0.38`, `0.24`, `0.65`, `1.5`/`0.6`, `0.35x`, `1.2x`, `25%` heal cap, ICD ต่าง ๆ) ต้องเป็น key ใน `KIT` / `KIT2.rogue` / `S2P` พร้อม label ใน `skill-registry.ts` + `src/admin/explain/combo-kit.ts`
3. **Mobster เปลี่ยนตาม (ทาง A):** Mobster ยืนอยู่บน web คลาส 1 ของ Thief → จะเสีย flat crit / critMul / lifesteal / HP / flee และเปลี่ยนจังหวะแทงพิษ → §5.4 ต้องวัด `JOB2_K.mobster` ด้วย · §6 "ห้ามแก้ Mobster" ยังใช้กับ `trees2/mobster.ts` / `JOB2.mobster` / `KIT2.mobster` เท่านั้น
4. **Migration:** ใช้ `resetTree(s)` (`save.ts:801`) ซึ่งคืนแต้ม `crossSpent.j2In1/j3In1` กลับ pool ที่ถูกต้องอยู่แล้ว + ล้าง `jobTalents` / `job2Talents`
5. **ID ที่ ship แล้ว:** Rev 3 นำ `thief_b3`/`c2`/`c3`/`c4`, `th_t*`, `rg_k2`/`rg_x3` ฯลฯ มาใช้ซ้ำในความหมายใหม่ → migration ต้อง gate ด้วย flag ทุก save (ห้ามมีทางข้าม) และต้องแก้ `tools/bot.cjs` (บรรทัด ~86 อ้าง `rg_k2`/`rg_k3`) ด้วย
6. **Balance ยังไม่มีหลักฐาน:** ตัวเลข `0.45x–0.90x`, `±15%`, "Simulation 20 เทิร์น" ใน Rev 3 = **ยังไม่ยืนยัน** · วัดจากคิวเล่นจริงเป็นหลัก (บอทประเมินผู้เล่นต่ำ) · ห้ามรัน `npm test` เต็มชุด ใช้ `node tools/test.mjs <ไฟล์>`
7. **Damage-amp bracket:** ต้องเพิ่มตารางใน §5 ว่า `vsPoison`, `Exposed`, `stabMark`, Privileged (`th_wound` + `th_t4a`), Perfect Agony บวกกันหรือคูณกัน ก่อนลงมือ P2
8. **แทงพิษ `(1 + pskill)`:** ✅ ทำแล้ว (`thiefAuto` 1.0) → สูตร §2.2 ข้อ 4 ให้ใช้ `thiefAuto` 1.0 ไม่ใช่ 1.6 · ต้นเกมแทงพิษเบาลง (STR 20: −31%) ให้เงาพริ้ว (Ratio AGI) แบกแทน

### R4.4 แผนที่เหลือ (ทำทีละ task · commit ละ 1 งาน)
| Phase | งาน | สถานะ |
|---|---|---|
| P1 | Ratio AGI · knife fix · Back Stab · ทวงหนี้ cleanup | ✅ commit (รอคิวเล่นทดสอบ) |
| P1b | แทงพิษ `pskill` ✅ · energy loop (`s1Weave`, floor cost) ⏸ ทำพร้อม P2 (talent `th_t2c` เปลี่ยน) |
| P2 | Thief web + talents ใหม่ + migration | ⏳ ปลดล็อกแล้ว (Mobster A) · ต้องทำตาราง bracket + KIT key list ก่อน |
| P3 | Rogue web (Marks, Voracity, Death Mark) | ⏸ หลัง P2 |
| P4 | Plagiarism | ⏸ PR แยก ทำท้ายสุด |

### R4.5 คำถามที่ค้างถึงคิว
- ไม่มี (ตอบครบ 2026-11-19: Mobster A · แทงพิษ pskill + ลด thiefAuto)

### R4.6 ตาราง Damage-amp bracket (ของจริงในโค้ด + ของใหม่ที่ Rev 3 เสนอ)

> **So what:** โค้ดวันนี้คูณ amp ต่อกันเกือบทุกตัว · ถ้าใส่ของใหม่ของ Rev 3 แบบเดียวกัน Back Stab ที่ Lv80 = **×12.05** (วันนี้ ×2.64) · ใช้ 6 กฎด้านล่าง → **×6.21** (−48%)
> เลขบรรทัดอ่านจากโค้ด 2026-11-19 (`BattleScene.ts` ถ้าไม่ระบุไฟล์) · เลขบรรทัดใน Rev 3 ด้านล่างเก่าแล้ว

#### R4.6.1 Pipeline จริง: amp ที่มีอยู่แล้ว
ลำดับ: `strike()` สร้าง `mul` → `roll()` → DEF → `damageMon()` → `srcMul()` → amp ใน `damageMon()`

| # | Amp ที่มีอยู่ | ที่อยู่ | แบบ | Cap / หมายเหตุ |
|---|---|---|---|---|
| 1 | `j3AfterBless` | `:1228` | × | — (คลาส 3) |
| 2 | `elemDmg` | `:1229` (เวท, src ไม่ใช่ธาตุ) · `:4741` (src ธาตุ) | × | — |
| 3 | `skillCut()` | `:1240` · def `:2909` | × `(1 − cut)` | cut ≤ 0.9 |
| 4 | `j2HpPunch` | `:1241` | **+** เข้า `mul` | Monk / Paladin |
| 5 | `j2Mul()` | `:1242` · def `:2075-2092` | × ทั้งก้อน · ข้างในคูณกันทุกตัว (frenzy, `j2BossCrit`, ดวล, Mobster `bossExecMul` ×2 `:2083` ฯลฯ) | ไม่มี cap · **Rogue ไม่มีบรรทัดใน `j2Mul`** |
| 6 | brittle = `max(st.brittle, px('vsChill'))` | `:1243-1244` | × เมื่อ `m.chill > 0` | `OUTSIDE_CAP.vsChill` |
| 7 | `arUltBreak` · `arLowHpBonus` | `:1245` · `:1246` | × | Archer |
| 8 | `thExecute` (★ เพชฌฆาต) | `:1247` | × **1.5 hardcode** (คริ + HP < **0.3** hardcode) | แหล่งเดียว = `thief_c4` เดิม (`trees/thief.ts:31`) → หลัง rework ไม่มีแหล่ง |
| 9 | `critDmgAdd` (falcon, stance mark, Warlord, `procCritMul`, light charge) | `:1250` | **+ เข้า `critMul`** | `roll()` `:3851`: `scaleCritMul(critMul + add, critPow())` · `critPow` = 1 เมื่อ `forceCrit` (`:2906`) |
| 10 | `atkMul()` (trinity, harvest, aegis, weaken, thorn, comboAtk, veteran, egg, Warlord) | ใน `roll()` `:3850` · def `:5116-5122` | × chain | แต่ละตัวมี cap ของตัวเอง |
| 11 | DEF · M.DEF · `critDR` · `toxicSkin` | `:1254` · `:1255` · `:1256` · `:1257-1261` | ตัด | คริกายภาพข้าม DEF |
| 12 | `srcMul()` masteries | `:3887` → `:4734` | × `1+amp` / `1−cut` · **ใช้กับ dot ด้วย** (ดูแค่ `src`) | — |
| 13 | `srcMul()` basic bracket | `:4736` (counter `:4737`) | **+** `1 + basicDmg + comboDmg − DR` = bracket เดียวที่บวกกันอยู่แล้ว | floor `COMBO.dmgFloor` |
| 14 | `srcMul()` relic wolf/wizard/queen · skill (biome, blood_pact, mana_overload) · glass · demon · `ultOpen` | `:4738-4753` | × | — |
| 15 | `vsBurn` · `vsPoison` | `:4749` · `:4750` | × · `!dot` เท่านั้น | `px()` `:4727` = `min(OUTSIDE_CAP[k], pk[k] + st[k])` → **`vsPoison` cap 0.70** (`perks.ts:201-205` = 2 × card `ven_brew`+ 0.35 `perks.ts:148`) · ค่าจาก tree / gear อยู่ใต้ cap เดียวกัน |
| 16 | `marked` (Cleric ตราบาป) | `:3901` | × **1.15 hardcode** · ใช้กับ dot ด้วย | — |
| 17 | `huntMark` (Archer / Beastmaster) | `:3902` | × · `!dot` | — |
| 18 | `swBreak` (Swordsman) | `:3903` | × · `!dot` | — |
| 19 | `lateDmg` (Cleric) | `:3904` | × · ใช้กับ dot ด้วย | — |
| 20 | `poisonAmp` (กัดกร่อน) | `:3905` | × เมื่อ `m.poison >= 10` (**10 hardcode**) · **ใช้กับ dot ด้วย** | แหล่ง: `th_t4a` เดิม 0.15/0.25 (`trees/thief.ts:52`) · card `venomqueen` 0.10 (`cards.ts:110`) · set 0.20 (`sets.ts:75`) · craft 0.15 (`craft.ts:65`) |
| 21 | relic executioner | `:3906` | × · `!dot` | — |
| 22 | `dotMul()` (bloodpact) | def `:2914` · tick พิษ `:4108` · ไฟ `:4104` / `:4113` · ทวงหนี้ `:2255` | × (ตัด) | — |

**โค้ดขัดกับ Rev 3 (ต้องแก้ใน P2/P3):**
- `dot = true` **ไม่ได้ข้าม amp ทุกตัว:** `marked` `:3901`, `lateDmg` `:3904`, `poisonAmp` `:3905`, masteries `:4734` ยังคูณ
  - → Death Mark pop แบบ `dot=true` (`rg_u1`) **ยังโดน `poisonAmp`** (Rev 3 เขียนว่าไม่โดน)
  - → pop ใช้ `this.src` ที่ค้างอยู่ ถ้าไม่ห่อด้วย `withSrc()`
- Contaminate (`src='poison'`, `dot=false`) ถ้าเรียก `damageMon()` ตรง ๆ → ได้ `vsPoison` + `poisonAmp` + mastery พิษ แต่ **ข้ามทุกอย่างใน `strike()`** (`j2Mul`, `critDmgAdd`, DEF)
- `thExecute` ×1.5 (`:1247`) ไม่มีแหล่งหลัง rework → ลบ หรือย้ายเข้า B3
- Blind ของ 2-1 ใช้ `m.blind` ร่วมกับ Crusader → ตัด Hit ด้วย `KIT2.crusader.blindHit` (`:4430` · Rev 3 อ้าง `:4423` = เลขเก่า)
- **ของที่ซ้อนกันไม่ได้** (ห้ามนับรวมใน max stack):
  - ทาเลนต์ 1 แถวเลือก 1 (`save.ts:83` `jobTalents` row → pick) → `th_t4a` Privileged ⟂ `th_t4b` Perfect Agony
  - Skill 2 เลือก 1 จาก 3 (`tree.ts:165`) → `Exposed` (`th_smoke`) ⟂ Privileged +12% ของ `th_wound`
  - `thPrivileged` = stat key ของ `th_t4a` (ตัวเดียวกัน ไม่ใช่ amp แยก)

#### R4.6.2 Bracket + กฎ 1 ข้อต่อ bracket

| Bracket | สมาชิก | กฎ (1 ข้อ) | วางที่ไหน |
|---|---|---|---|
| **B1 Taken** (ดีบัฟบนมอน → รับดาเมจเพิ่ม) | `Exposed` +0.20/0.30 (`!dot`) · `stabMark` +0.15 (คริ / Back Stab / พายุมีด / Basic) · Privileged `th_wound` +0.12 · `thPrivileged` (`th_t4a`) +0.18/0.30 · `poisonAmp` เดิม (gear) | **บวกกันใน bracket เดียว cap +0.60** (`KIT.thiefTakenCap`) · แต่ละตัวคง filter ของตัวเอง (`!dot`, crit-only ฯลฯ) | helper `takenAmp(m, dot, crit)` ใน `damageMon()` แทน `:3905` |
| **B2 vs-status** (ของเดิม) | `vsPoison` (+ `thief_a2` 0.08×lv) · `vsBurn` · `vsChill` | **ไม่แก้:** ค่า tree บวกเข้า `px()` ใต้ `OUTSIDE_CAP` เดิม (vsPoison 0.70) | `:4749-4750` เหมือนเดิม |
| **B3 Crit Dmg** (เงื่อนไข → ดาเมจคริ) | `thUltCondCritDmg` (`thief_u1` +0.30/ชนิด) · `thUltExecDmg` (`th_t3a` +0.35/0.60) · `thExecUlt` (`thief_u3` +0.51) · Shroud★ +0.25 · `j2HeartRend` (`rg_x2` +0.36) · `thExecute` เดิม (ถ้าเก็บ) | **บวกเข้า `critDmgAdd` (`:1250`) ห้ามคูณ `mul` · รวมเงื่อนไขใหม่ cap +0.75** (`KIT.thiefCondCritDmgCap`) | `:1250` |
| **B4 Skill-own** (สกิลนับดีบัฟ / สถานะเอง) | `j2StabDebuffAmp` (`rg_s3` +0.24/ชนิด) · Shadow Ambush ×1.25 · `j2ComboDebuff` (`rg_c2`) · `thWeaveDmg` (`th_t2c` → `basicDmg` bracket เดิม #13) | **บวกเข้า `mul` ของสกิลนั้นเป็น `1 + Σ` · cap ต่อสกิล** (Back Stab +0.75 `KIT2.rogue.stabAmpCap` · นับดีบัฟสูงสุด 3 ชนิด `stabDebuffMax`) | ตอนสร้าง `mul` ก่อน `strike()` |
| **B5 Poison power** (`src='poison'`: tick, Toxic Seep, Contaminate, Plague Burst) | Perfect Agony (`th_t4b`) · `vsPoison` (เฉพาะ Contaminate เพราะ `!dot`) | **บวกกัน cap +1.00** (= cap ของ PA, `KIT.thiefAgonyCap`) · ถ้าคริ ใช้ `critMul` แทน PA · mastery พิษ (`ven_L2`) คงคูณแยกแบบเดิม | Contaminate: ข้าม `:4750` แล้วรวม `vsPoison` ใน B5 |
| **B6 Echo** (ดาเมจที่สะท้อนดาเมจที่ amp แล้ว) | Death Mark pop (`rg_u1` 0.24 + 0.05×lv + `j2RgDeathMark` ≤ 0.59) + AoE | **ไม่รับ amp ใด ๆ** · flag ใหม่ `echo` ใน `damageMon()` ข้าม `srcMul` + `:3901-3906` · `withSrc('other')` · ไม่บันทึกเข้า Death Mark ซ้ำ · ไม่ดูดเลือด · ตัด "ทะลุ P.DEF 50%" (ค่าที่บันทึกผ่าน DEF แล้ว) | `damageMon(..., dot=true, echo=true)` |

- Bracket ยังคูณกันเอง (B1 × B2 × B3 × B4 × B5) แต่ **ทุกก้อนมี cap** → ไม่ระเบิดแบบไม่จำกัด
- **ผลข้างเคียง:**
  - Mobster: `poisonAmp` gear สูงสุด 0.45 < cap 0.60 → ไม่เปลี่ยน · ถ้าเลือก `th_t4a` ใหม่ (+0.30) → ชน cap: วันนี้ `th_t4a` R2 + gear = ×1.70 → หลัง rework สูงสุด ×1.60 → นับใน §5.4 ตอนวัด `JOB2_K.mobster`
  - Archer / Beastmaster / Cleric: B2, `huntMark`, `marked`, `lateDmg` ไม่แตะ → ไม่เปลี่ยน
  - cap ทุกตัว = key ใหม่ (ดู R4.7)

#### R4.6.3 ตัวอย่าง Lv80 (ตัวคูณ amp ล้วน · ไม่รวม P.ATK / skill mul / critMul ฐาน)
**สมมติ:** Rogue Lv80 · Skill 2 `th_smoke`★ · แถว 4 `th_t4a` R2 · `rg_s3` Lv5 · `rg_x2` Lv5 · poisonAmp 0.30 (venomqueen 0.10 + set 3 ชิ้น 0.20) · `st.critMul = 2.0` (สมมติ)
- `vsPoison` ชน cap 0.70 จาก gear/card อยู่แล้ว **ทั้ง 3 คอลัมน์** (`ven_brew`+ 0.35 + set 2 ชิ้น 0.10 `sets.ts:74` + card toad 0.10 `cards.ts:105` + craft 0.10 `class-craft.ts:65` + refine 0.07 `refine.ts:165`) → `thief_a2` (+0.24) **ไม่เพิ่มอะไรเมื่อชน cap** · บอส poison ≥ 10 + Exposed + Stripped + stabMark ยังอยู่ (CD Back Stab ถูกตัดด้วย Voracity) · ฮีโร่อยู่ใน Shroud

**Hit — Back Stab (คริแน่):**
| ตัวคูณ | วันนี้ (live) | Rev 3 แบบคูณ | กฎ R4.6 |
|---|---|---|---|
| `vsPoison` (B2) | ×1.70 | ×1.70 | ×1.70 |
| `poisonAmp` | ×1.55 (gear 0.30 + `th_t4a` เดิม 0.25) | ×1.30 | → B1 |
| `Exposed`★ · `stabMark` · `thPrivileged` R2 | — | ×1.30 · ×1.15 · ×1.30 | → B1 |
| **B1** | — | คูณกัน ×2.53 | `0.30+0.30+0.15+0.30 = 1.05 → cap 0.60` = **×1.60** |
| `rg_s3` (3 ชนิด) · Shadow Ambush | — | ×1.72 · ×1.25 (= ×2.15) | B4 `0.72+0.25 = 0.97 → cap 0.75` = **×1.75** |
| คริเงื่อนไข (Heart Rend 0.36 + Shroud★ 0.25) | — | `(2.0+0.61)/2.0` = ×1.305 | B3 `0.61 ≤ 0.75` = ×1.305 |
| **รวม** | **×2.64** | **×12.05** | **×6.21** (−48% · ×2.36 ของวันนี้) |

**Poison burst — Contaminate** (`dot=false`, ไม่คริ · แถว 4 = `th_t4b` แทน · run มี `ven_L2`+ mastery พิษ):
| ตัวคูณ | Rev 3 แบบคูณ | กฎ R4.6 |
|---|---|---|
| `Exposed`★ + `poisonAmp` 0.30 | ×1.30 × ×1.30 | B1 `0.60` → ×1.60 |
| `vsPoison` 0.70 + Perfect Agony (สมมติชน cap +1.00) | ×1.70 × ×2.00 | B5 `1.70 → cap 1.00` → ×2.00 |
| mastery `ven_L2`+ (เดิม) | ×1.90 | ×1.90 |
| **รวม** | **×10.92** | **×6.08** (−44%) |

- ยังสูงกว่าวันนี้ เพราะเป็นกลไกใหม่หลายชั้น → cap 0.60 / 0.75 / 1.00 = จุดเริ่ม · ปรับจากคิวเล่นจริง (R4.3 ข้อ 6)

### R4.7 KIT key list (no magic numbers in BattleScene)

> **So what:** 148 key (Thief `KIT` 76 · Skill 2 27 · Rogue `KIT2.rogue` 45) · `KIT` / `S2N` ที่ขาดการลงทะเบียน = test fail · `KIT2` ที่ขาด `J2_LABEL` = ไม่ fail แต่ admin โชว์ชื่อ key ดิบ

- **ขอบเขต:** เฉพาะตัวเลขที่ Rev 3 §2–§3 ให้ "บวก base ใน BattleScene" หรือฝังในสูตร
  - ไม่ list: ตัวคูณต่อ Lv ใน `mod(lv)` / `desc(lv)` ของ node / talent (อยู่ใน `src/data/trees/thief.ts` · `trees2/rogue.ts` = data อยู่แล้ว)
  - ย้ายเข้า talent `mod` แทน KIT: `th_t3c` โล่ตอนหลบ `(0.10 | 0.20) × FLEE` → stat ใหม่ `thDodgeShield: 0.10 | 0.20`
  - ไม่ list: §4 (WIS Melt, Shadow Ward, Toxic Overheal, LUK) · P4 Plagiarism
  - **ICD "1 ครั้ง/เทิร์น" = flag รีเซ็ตต่อเทิร์น ไม่ใช่ตัวเลข → ไม่มี key** (Contaminate ×2 สาย, Blade's End, Voracity pickup/kill, `thief_c3`, `rg_k4`, `rg_t2_voracity`, `th_t3c` shield) · ICD ที่ไม่ใช่ 1: `rg_c3` (มี key) · `th_t2a` (อยู่ใน `mod` `thDodgeCdIcd`)
- **ไม่ต้องมี key ใหม่ แค่เปลี่ยนค่า path เดิม:**
  - ค่าร่ายแทงพิษ `job.thief.auto.cost` 40 → 45 (`skill-registry.ts:125` · ห้ามมี `KIT.thiefAutoCost`: "1 path = 1 table" `tunables.ts:199`)
  - `th_smoke` cost 40 → 35 (`skill2.ts` `s('th_smoke', ..., 40, 4, ...)`)

#### R4.7.1 Checklist ลงทะเบียน
| Object | ต้องแก้ | Test ที่จับ |
|---|---|---|
| `KIT` (Thief) | 1) key ใน `KIT` (`skill-math.ts:74`) 2) ชื่อใน `KIT_INTS` (`int(0,50)`) หรือ `KIT_NUMS` (`num(0,20)`) (`tunables.ts:146-147`) 3) `KIT_EXPLAIN` (`src/admin/explain/combo-kit.ts`) 4) label ใน `SKILL_LAYOUT.thief` ด้วย `kit('key', 'label')` (helper `skill-registry.ts:57` · layout `:124-132` · ช่อง `tree?: SkillRef[]` `:50`) | `admin-engine.test.ts:39-54` (effect ห้ามเป็น fallback `ตัวคูณคิทคลาสหลัก`) · `skill-registry.test.ts:20-28` (ref ใน layout ต้อง whitelisted = อยู่ใน `KIT_INTS`/`KIT_NUMS` + ค่าเริ่มอยู่ในช่วง min..max) |
| `S2P` | `{ base, per }` (`skill-math.ts:320`) + `lin('key', label)` ใน `SKILL_LAYOUT.thief.s2` · `S2P_TH` (`explain/skills.ts:7`) ใส่หรือไม่ก็ได้ | — |
| `S2N` | **ตัวเลขล้วน ไม่ใช่ function** (`skill-math.ts:330`) + `sk('s2n.key', label, int/num)` ใน `SKILL_LAYOUT.thief.s2` + **`S2N_TH`** (`explain/skills.ts:24`) · `s2('th_wound')` วันนี้ยังไม่มี ref | `skill-registry.test.ts:23` (`typeof v === 'number'`) · `admin-engine.test.ts:50` (ไม่มี `S2N_TH` → fallback → fail) |
| `KIT2.rogue` | key ใน `skill-math.ts:159` + label `J2_LABEL` (`skill-registry.ts:139`) · effect มาจาก regex `explainKit2Effect` (`explain/skills.ts`) อัตโนมัติ | `admin-engine.test.ts:71-84` (เช็กแค่ label ไม่ว่าง → ไม่มี `J2_LABEL` ก็ผ่าน แต่โชว์ชื่อ key ดิบ) |

**กฎตั้งชื่อ `KIT2.rogue`:**
- คอลัมน์ (`skill-registry.ts:297`): `/^stab/` → ทักษะ 3 · `/^ult/` → Ult · ที่เหลือ → other
- ห้ามลงท้าย `Cost` / `Cd` → ถูกข้ามเงียบ ๆ (`:313`) → ใช้ `CdCut`
- เป็น int ใน admin เมื่อ **ชื่อ match `INTISH`** (`:306`: `Turns|Hits|Max|Keep|At|Stacks|Every|Boxes|Knives|Count|CdCut|PerSwing|PerCombo`) **และ** ค่าเริ่มเป็นจำนวนเต็ม · ไม่ match = `num` (ใช้ได้ แค่ admin ไม่บังคับจำนวนเต็ม)

#### R4.7.2 Thief — `KIT` (76 key · INTS 28 · NUMS 48)
| Key | ค่า | ชนิด | Rev 3 | Label (admin) |
|---|---|---|---|---|
| `thiefAutoMinCost` | 30 | INTS | §2.2 ข้อ 1 | แทงพิษ: Energy ต่ำสุดหลังลด |
| `thiefStrikeRes` | 4 | INTS | §2.4 Gate | D.Strike ติด: คืน Energy |
| `thiefStrikeLs` | 0.33 | NUMS | hardcode เดิม `:2984` | D.Strike: สัดส่วนดูดเลือด |
| `thiefToxicHoldCap` | 0.75 | NUMS | `thief_a3` | พิษทนทาน: โอกาสพิษไม่ลด สูงสุด |
| `thiefSpreadShare` | 0.6 | NUMS | `thief_a4` | ระเบิดพิษลาม: สัดส่วนพิษที่กระจาย (ใช้เมื่อ `thPlagueDeath > 0` · `:4022` `/2` ใช้ร่วมกับ card `ven_L1` ห้ามแก้) |
| `thiefPlagueAt` | 10 | INTS | `thief_a4` | Plague Burst: พิษขั้นต่ำ (stack) |
| `thiefPlagueTurns` | 1 | INTS | `thief_a4` | Plague Burst: ดาเมจ = กี่เทิร์นพิษ |
| `thiefVenomBasicShare` | 0.35 / 0.6 | NUMS | `thief_v1` | Venom Coating: Basic ได้กี่ส่วนของแทงพิษ |
| `thiefArcaneMatkPerInt` | 1 | NUMS | `thief_v1` (`heroBuild`) | Arcane Edge: M.ATK ต่อ INT |
| `thiefVenomIntAt` | 20 | INTS | `thief_v1` | แทงฉาบอาคม: INT ขั้นต่ำ ได้พิษ +1 |
| `thiefVenomIntPoison` | 1 | INTS | `thief_v1` | แทงฉาบอาคม: พิษเพิ่ม (stack) |
| `thiefDetAt` | 8 | INTS | `thief_v2` | Contaminate: พิษขั้นต่ำ (stack) |
| `thiefDetShare` | 0.4 | NUMS | `thief_v2` | Contaminate: ใช้พิษกี่ส่วน |
| `thiefDetMin` | 3 | INTS | `thief_v2` | Contaminate: ใช้พิษอย่างน้อย (stack) |
| `thiefDetPoisonBase` | 1.5 | NUMS | `thief_v2` | Contaminate: × poisonDmg ฐาน |
| `thiefDetPoisonLv` | 0.5 | NUMS | `thief_v2` | Contaminate: × poisonDmg ต่อ Lv |
| `thiefDetMatkLv` | 0.14 | NUMS | `thief_v2` | Contaminate: × M.ATK ต่อ stack ต่อ Lv |
| `thiefDetFlatBase` | 0.6 | NUMS | `thief_v2` | Contaminate: × M.ATK ก้อนฐาน |
| `thiefDetFlatLv` | 1 | NUMS | `thief_v2` | Contaminate: × M.ATK ก้อนต่อ Lv |
| `thiefDetSplash` | 0.5 | NUMS | `thief_v2` | Contaminate: AoE ตัวอื่น |
| `thiefDetLeechShare` | 0.5 | NUMS | `thief_v2` / `v4` | เลือดพิษจาก Contaminate (ไม่มี ★) |
| `thiefDetBossRefund` | 0.25 | NUMS | `thief_v4` ★ | ★ คืนพิษเมื่อระเบิดใส่บอส |
| `thiefAlchemyStab` | 0.9 | NUMS | `thief_v4` ★ | Alchemy Blade: Back Stab × M.ATK |
| `thiefAlchemyKnife` | 0.6 | NUMS | `thief_v4` ★ | Alchemy Blade: มีดพายุ × M.ATK |
| `thiefLeechLv` | 0.08 | NUMS | `thief_v3` | เลือดพิษ: อัตราต่อ Lv |
| `thiefLeechInt` | 0.015 | NUMS | `thief_v3` | เลือดพิษ: ขยายต่อ INT |
| `thiefLeechCap` | 0.6 | NUMS | `thief_v3` | เลือดพิษ: อัตราสูงสุด |
| `thiefLeechTurnCap` | 0.25 | NUMS | `thief_v3` | เลือดพิษ: ฮีลสูงสุด/เทิร์น (% Max HP) |
| `thiefUltDexEvery` | 15 | INTS | §2.5 | เงาพริ้ว: ทุกกี่ DEX ได้ +1 ที |
| `thiefUltDexHitCap` | 6 | INTS | §2.5 (R4.3 เสนอ 3) | เงาพริ้ว: ทีจาก DEX สูงสุด |
| `thiefUltDexPer` | 0.012 | NUMS | §2.5 `thUltDex` | เงาพริ้ว: แรงต่อ DEX |
| `thiefShroudBase` | 1 | INTS | Ghost Shroud ข้อ 1 | Ghost Shroud: ชาร์จฐาน |
| `thiefShroudEvery` | 2 | INTS | Ghost Shroud ข้อ 2 | Ghost Shroud: +1 ทุกกี่เทิร์น |
| `thiefShroudFlee` | 0.15 | NUMS | Ghost Shroud ข้อ 3 | Shadow Shield: × FLEE ฐาน |
| `thiefShroudHpCap` | 0.2 | NUMS | Ghost Shroud ข้อ 3 | Shadow Shield: สูงสุด % Max HP |
| `thiefUltCritShare` | 0.75 | NUMS | สาย A · `thief_u1` | เงาพริ้ว: รับ crit กี่ส่วน |
| `thiefUltCritCap` | 0.75 | NUMS | สาย A | เงาพริ้ว: คริสูงสุด |
| `thiefExecBelow` | 0.35 | NUMS | สาย A · `thief_u3` · `th_t3a` R2 | เพชฌฆาตเงา: HP ต่ำกว่า |
| `thiefUltCritResCap` | 24 | INTS | `thief_u3` | เพชฌฆาตเงา: Energy สูงสุด/Ult |
| `thiefOnHitBase` | 0.38 | NUMS | สาย B | On-Hit: eff ฐาน |
| `thiefOnHitTalHi` | 0.05 | NUMS | สาย B (`th_t3b` R2 + `u2`) | On-Hit: โบนัสทาเลนต์ R2 |
| `thiefOnHitTalLo` | 0.03 | NUMS | สาย B (`th_t3b` R1 + `u2`) | On-Hit: โบนัสทาเลนต์ R1 |
| `thiefOnHitCap` | 0.55 | NUMS | สาย B | On-Hit: eff สูงสุด |
| `thiefOnHitStrikeMax` | 2 | INTS | สาย B | On-Hit: D.Strike สูงสุด/Ult |
| `thiefCounterMul` | 0.8 | NUMS | `thief_b4` ★ | เงาสวน: × P.ATK |
| `thiefCounterExposedMul` | 1.1 | NUMS | `thief_b4` ★ | เงาสวน: × P.ATK เมื่อเป้า Exposed |
| `thiefFinisherAt` | 3 | INTS | `thief_u4` ★ | เงาพันคม: คริกี่ครั้งได้ฮิตปิด |
| `thiefFinisherMul` | 1.4 | NUMS | `thief_u4` ★ | เงาพันคม: ฮิตปิด × สูตร Ult |
| `thiefUltCdCutCap` | 2 | INTS | §3.4 · §5 ข้อ 1 (ใช้ร่วม Rogue) | ลด CD Ult สูงสุด/เทิร์น |
| `thiefUltCdFloor` | 1 | INTS | §5 ข้อ 1 | CD Ult ต่ำสุดหลังกด |
| `thiefDodgeBuffTurns` | 2 | INTS | `thief_b1` · `th_t4c` | บัฟหลังหลบ: นาน (เทิร์นมอน) |
| `thiefDodgeFleeTurns` | 2 | INTS | `th_t1a` | ก้าวเงา: FLEE หลังหลบ นาน (เทิร์นฮีโร่) |
| `thiefMistPoison` | 2 | INTS | `th_t4c` | ร่างเงาลวงตา: สะท้อนพิษ (stack) |
| `thiefKindsAt` | 2 | INTS | `thief_c1` · `th_t3a` · `th_t4a` | "ดีบัฟหลายชนิด" = กี่ชนิดขึ้นไป |
| `thiefCondLeechMulti` | 1.5 | NUMS | `thief_c1` | คมเลือด: × เมื่อดีบัฟหลายชนิด |
| `thiefStackCritMax` | 8 | INTS | `thief_c2` | จุดตายสะสม: stack สูงสุด |
| `thiefKillRes` | 10 | INTS | `thief_c3` | กระหายเลือด: ฆ่าได้ Energy |
| `thiefKillPoisonHeal` | 0.005 | NUMS | `thief_c3` | กระหายเลือด: ฮีลต่อพิษบนศพ |
| `thiefKillPoisonHealCap` | 0.12 | NUMS | `thief_c3` | กระหายเลือด: ฮีลโบนัสสูงสุด |
| `thiefBossCritLeech` | 0.375 | NUMS | `thief_c3` | กระหายเลือด: คริบอส ฮีลกี่ส่วน |
| `thiefBossCritRes` | 8 | INTS | `thief_c3` | กระหายเลือด: คริบอส Energy |
| `thiefBloodKingBelow` | 0.45 | NUMS | `thief_c4` ★ | ราชันย์โลหิต: HP ต่ำกว่า |
| `thiefBloodKingMul` | 1.75 | NUMS | `thief_c4` ★ | ราชันย์โลหิต: ดูดเลือด × |
| `thiefBloodKingStrikeLs` | 0.66 | NUMS | `thief_c4` ★ | ราชันย์โลหิต: D.Strike ดูดเลือด |
| `thiefStackHpMax` | 20 | INTS | `th_t1c` (cap 160/280 = 20 stack) | กายต้านพิษ: นับ stack สูงสุด |
| `thiefStackCritTalMax` | 14 | INTS | `th_t2b` | จุดบอดซ้อนพิษ: stack สูงสุด |
| `thiefUltExecBelow` | 0.5 | NUMS | `th_t3a` | เงาสังหาร: HP ต่ำกว่า |
| `thiefPrivAt` | 8 | INTS | `th_t4a` | Privileged: พิษขั้นต่ำ (stack) |
| `thiefAgonyFrom` | 1.4 | NUMS | `th_t4b` | Perfect Agony: นับ critMul ที่เกิน |
| `thiefAgonyWisAt` | 40 | INTS | `th_t4b` | Perfect Agony: WIS ขั้นต่ำ |
| `thiefAgonyWisPer` | 0.0045 | NUMS | `th_t4b` | Perfect Agony: ต่อ WIS |
| `thiefAgonyWisCap` | 0.55 | NUMS | `th_t4b` | Perfect Agony: ส่วน WIS สูงสุด |
| `thiefAgonyCap` | 1 | NUMS | `th_t4b` · B5 | Perfect Agony / B5: โบนัสพิษสูงสุด |
| `thiefAgonyHitCut` | 0.15 | NUMS | `th_t4b` | Perfect Agony: ฮิตไม่คริเบาลง |
| `thiefTakenCap` | 0.6 | NUMS | R4.6 B1 | B1: ดาเมจที่มอนรับเพิ่ม สูงสุด |
| `thiefCondCritDmgCap` | 0.75 | NUMS | R4.6 B3 | B3: ดาเมจคริจากเงื่อนไข สูงสุด |

#### R4.7.3 Skill 2 — `S2P` (2) + `S2N` (25)
| Key | ค่า | Skill 2 | Label (admin) |
|---|---|---|---|
| `S2P.smokeRes` | `{ base: 10, per: 5 }` | `th_smoke` + (เฉพาะ `s2Lv > 0`) | ควันหอม: คืน Energy |
| `S2P.woundMax` | `{ base: 6, per: 2/3 }` (floor) | `th_wound` + | แผลฉีก: Wound สูงสุด |
| `S2N.smokeTurns` | 2 | `th_smoke` | Shroud: นาน (เทิร์น) |
| `S2N.smokeFlee` | 0.25 | `th_smoke` | Shroud: FLEE +% (คูณ) |
| `S2N.smokeSkillCrit` | 0.15 | `th_smoke` | Shroud: skillCrit + |
| `S2N.smokeCritDmg` | 0.25 | `th_smoke` ★ | Shroud ★: ดาเมจคริ + (→ B3) |
| `S2N.raidMul` | 1.2 | `th_smoke` | Sightless Raid: × P.ATK |
| `S2N.exposedPct` | 0.2 | `th_smoke` | Exposed: รับดาเมจเพิ่ม (→ B1) |
| `S2N.exposedStar` | 0.3 | `th_smoke` ★ | Exposed ★: รับดาเมจเพิ่ม |
| `S2N.exposedTurns` | 2 | `th_smoke` | Exposed: นาน (เทิร์น) |
| `S2N.smokeBlindTurns` | 2 | `th_smoke` | Blind: นาน (ตัด Hit ใช้ `KIT2.crusader.blindHit` `:4430`) |
| `S2N.pickBase` | 1.3 | `th_pick` | ล้วงกระเป๋า: × P.ATK (แทน `pickMul()` function) |
| `S2N.pickStarMul` | 1.9 | `th_pick` ★ | จอมโจร: × P.ATK |
| `S2N.pickZeny` | 8 | `th_pick` | ปล้น Zeny ฐาน |
| `S2N.pickZenyDex` | 10 | `th_pick` | ปล้น Zeny +1 ทุกกี่ DEX |
| `S2N.plunderRes` | 10 | `th_pick` ★ | Plunder: Energy |
| `S2N.plunderDrop` | 0.05 | `th_pick` ★ | Plunder: drop +%/stack |
| `S2N.plunderMax` | 3 | `th_pick` ★ | Plunder: stack สูงสุด/เวฟ |
| `S2N.woundStacks` | 2 | `th_wound` | Wound ต่อการแทง |
| `S2N.woundStarStacks` | 3 | `th_wound` ★ | แผลมรณะ: Wound ต่อการแทง |
| `S2N.woundTurns` | 3 | `th_wound` | Wound นาน (เทิร์นฮีโร่) |
| `S2N.woundStrikeChance` | 0.5 | `th_wound` + | D.Strike แปะ Wound (โอกาส) |
| `S2N.bladeAt` | 3 | `th_wound` | Blade's End: Wound ขั้นต่ำ |
| `S2N.bladeMul` | 1.8 | `th_wound` | Blade's End: × P.ATK |
| `S2N.bladeHealCut` | 0.4 | `th_wound` | Blade's End: ตัดฮีลมอน |
| `S2N.bladeCutTurns` | 2 | `th_wound` | Blade's End: ตัดฮีลนาน (เทิร์น) |
| `S2N.woundPriv` | 0.12 | `th_wound` | Privileged: รับดาเมจเพิ่ม (→ B1) |

- `S2N.woundMul(star)` (1.2 / 2.0) · `woundPoison(lv)` · `pickRes` · `smokeHeal` · `smokeDodges` มีแล้ว ตรงกับ Rev 3

#### R4.7.4 Rogue — `KIT2.rogue` (45 key · 46 admin leaf)
| Key | ค่า | คอลัมน์ | ชนิด | Rev 3 | Label (`J2_LABEL`) |
|---|---|---|---|---|---|
| `mastery.skillCrit` | 0.05 | other | num | §3.1 (**rename** `mastery.crit` 0.03 → ต้องแก้ `J2_LABEL['rogue.mastery.crit']` + จุดที่อ่าน) | ชำนาญมีด: skillCrit + |
| `knifePskillShare` | 0.5 | other | num | §3.2 ข้อ 1 (`throwKnives` `:2026` วันนี้ไม่มี pskill เลย) | 🔪 มีดบิน: ได้ pskill กี่ส่วน |
| `markMax` | 3 | other | int | §3.2 ข้อ 2 | 🔪 Dagger Mark: stack สูงสุด |
| `markTurns` | 2 | other | int | §3.2 ข้อ 2 | 🔪 Dagger Mark: นาน (เทิร์นมอน) |
| `markFocus` | 0.3 | other | num | §3.2 ข้อ 1 | 🔪 มีดบิน: โอกาสเล็งตัว Mark น้อย |
| `markSteelMul` | 0.35 | other | num | Sinister Steel | 🔪 เก็บมีด: × P.ATK ต่อ Mark |
| `markSteelSplash` | 0.6 | other | num | Sinister Steel | 🔪 เก็บมีด: ตัวอื่นโดนกี่ส่วน |
| `markRes` | 6 | other | num | §3.2 | 🔪 เก็บมีด: Energy ต่อ Mark |
| `markKillKnives` | 2 | other | int | §3.2 ข้อ 3 | 🔪 Kill Reset: มีดฟรี (เล่ม) |
| `markTwinMul` | 0.25 | other | num | §3.1 | 🔪 มีดคู่ Voracity: × P.ATK |
| `markTwinBounce` | 0.5 | other | num | §3.1 | 🔪 มีดคู่ Voracity: โอกาสปักต่อ |
| `knifeBounce` | 0.65 | other | num | `rg_k2` | 🔪 มีดชิ่ง: ความแรงฐาน |
| `knifeBounceAt` | 2 | other | int | `rg_k2` | 🔪 มีดชิ่ง: Mark ขั้นต่ำ |
| `comboTempoMax` | 5 | other | int | `rg_c1` | ⚡ Tempo: stack สูงสุด/เวฟ |
| `comboDebuffMax` | 4 | other | int | `rg_c2` | ⚡ แทงรัวซ้ำแผล: นับดีบัฟสูงสุด |
| `comboDodgeEvery` | 3 | other | int | `rg_c3` | ⚡ เงาพริ้วสลับร่าง: ทุกกี่ฮิตคอมโบ |
| `comboDodgeIcdTurns` | 2 | other | int | `rg_c3` | ⚡ เงาพริ้วสลับร่าง: ICD (เทิร์น) |
| `comboShadowMul` | 0.45 | other | num | `rg_c4` ★ | 👥 Living Shadow: แรงกี่ส่วนของ Back Stab |
| `comboShadowAt` | 3 | other | int | `rg_c4` ★ | 👥 Living Shadow: คอมโบขั้นต่ำ |
| `critAmbushHi` | 0.7 | other | num | `rg_x1` · `rg_t1_ambush` | 🎯 Ambush: HP ตั้งแต่ |
| `critAmbushLo` | 0.35 | other | num | `rg_x1` · `rg_t1_ambush` | 🎯 Ambush: HP ต่ำกว่า |
| `critLeechResMax` | 12 | other | int | `rg_x3` | 🎯 ดูดเลือดคมคริ: Energy สูงสุด/เทิร์น |
| `critKnifeMul` | 1.2 | other | num | `rg_x4` ★ | 🎯 ★ คริเป็นมีด: × P.ATK |
| `stabMarkAmp` | 0.15 | s3 | num | §3.3 | 🗡️ Backstab Mark: รับดาเมจเพิ่ม (→ B1) |
| `stabMarkTurns` | 2 | s3 | int | §3.3 | 🗡️ Backstab Mark: นาน (เทิร์นมอน) |
| `stabPickupAt` | 2 | s3 | int | §3.2 ข้อ 2 | 🗡️ เก็บ Mark กี่อัน ลด CD Back Stab |
| `stabPickupCdCut` | 1 | s3 | int | §3.2 ข้อ 2 | 🗡️ เก็บ Mark: ลด CD Back Stab (เทิร์น) |
| `stabStrip` | 0.2 | s3 | num | §3.3 | 🗡️ Strip Armor: ลด P.DEF ฐาน |
| `stabStripTurns` | 2 | s3 | int | §3.3 | 🗡️ Strip Armor: นาน (เทิร์น) |
| `stabStripTalTurns` | 1 | s3 | int | `rg_t3_strip` | 🗡️ ปลดอาวุธเต็มขั้น: Strip นานขึ้น (เทิร์น) |
| `stabStripDexEvery` | 5 | s3 | int | `rg_s1` | 🗡️ ฉีกเกราะ: ทุกกี่ DEX ลดเพิ่ม 1% |
| `stabStripDexCap` | 0.1 | s3 | num | `rg_s1` | 🗡️ ฉีกเกราะ: ส่วน DEX สูงสุด |
| `stabAmbushMul` | 0.25 | s3 | num | §3.3 Shadow Ambush | 🗡️ Shadow Ambush: แรงเพิ่ม (→ B4) |
| `stabAmbushRes` | 15 | s3 | num | §3.3 Shadow Ambush | 🗡️ Shadow Ambush: Energy |
| `stabDebuffMax` | 3 | s3 | int | `rg_s3` | 🗡️ ปิดฉากกลางหลัง: นับดีบัฟสูงสุด |
| `stabAmpCap` | 0.75 | s3 | num | R4.6 B4 | 🗡️ Back Stab: โบนัสเงื่อนไขรวมสูงสุด |
| `ultDexKnifeEvery` | 25 | ult | int | §3.4 ข้อ 2 | 🌪️ พายุมีด: ทุกกี่ DEX มีด +1 |
| `ultDexKnives` | 3 | ult | int | §3.4 ข้อ 2 | 🌪️ พายุมีด: มีดจาก DEX สูงสุด |
| `ultKnifePoison` | 0.5 | ult | num | §3.4 ข้อ 2 | 🌪️ พายุมีด: พิษต่อเล่ม (ส่วน) |
| `ultDeathMark` | 0.24 | ult | num | `rg_u1` | ☠️ Death Mark: ระเบิดฐาน (ส่วนของดาเมจที่บันทึก) |
| `ultDeathMarkTurns` | 2 | ult | int | `rg_u1` | ☠️ Death Mark: นาน (เทิร์นฮีโร่) |
| `ultDeathMarkAt` | 0.15 | ult | num | `rg_u1` | ☠️ Death Mark: ระเบิดเมื่อ HP ต่ำกว่า |
| `ultDeathMarkSplash` | `[0.35, 0.55]` | ult | num ×2 | `rg_t2_deathmark` R1/R2 | ☠️ Death Mark: AoE ตัวอื่น |
| `ultAbsorbMax` | 6 | ult | int | `rg_u2` | 🌪️ Voracity Storm: มีดจาก Mark สูงสุด |
| `ultCritKnives` | 2 | ult | int | `rg_x4` ★ (On-Hit Ult) | 🌪️ ★ คริเป็นมีด: สูงสุด/Ult |

---

> **สถานะเอกสาร:** DRAFT (Iteration 3 — ปรับสมดุล Off-Meta `WIS`/`INT`/`thUltAgi` เข้ากรอบ `0.45x–0.90x` บนบอสจริง + เก็บรายละเอียด `skill-registry`, `Plagiarism`, `rg_x4 ★`, `Sinister Steel`, `onShroudBreak`, `autoInfo`, และ Hygiene ครบถ้วน) — รออนุมัติจากเจ้าของโปรเจกต์ก่อนลงมือแก้ไขโค้ดจริงภายใต้ `src/` และ `tests/`  
> **ขอบเขต:** Rework คลาส 1 **Thief (`thief`)** และคลาส 2 **Rogue (`rogue`)** เต็มรูปแบบ  
> **ขอบเขตที่ยกเว้น:** **ห้ามแก้คลาส 2 Mobster (`mobster` — มาเฟีย)** โดยให้คงระบบของ Mobster ไว้ทั้งหมด และระบุ **Mobster Compatibility Notes** อย่างละเอียดในหัวข้อ `§6` สำหรับทุก Hook ที่ใช้ร่วมกับ Thief  
> **Save Migration (Beta):** ไม่ต้องรักษา Node ID หรือ Talent ID เดิมของ Thief/Rogue — เพิ่ม `thiefRogueRework: 1` ใน `newSave()` (`src/save.ts:133`) และเพิ่ม `migrateThiefRogueRework(s)` (แพทเทิร์นเดียวกับ `migrateSageRework`) เพื่อรีเซ็ต `jobTree`/`jobTalents` (เมื่อ `job === 'thief'`) และ `job2Tree`/`job2Talents` (เมื่อ `job2 === 'rogue'`) พร้อม **Refund แต้มคืนทั้งหมด** ให้ผู้เล่นอัปใหม่ 1 ครั้ง; หาก `job2 === 'mobster'` ให้รีเซ็ตและคืนแต้มเฉพาะ `jobTree`/`jobTalents` ของ Thief แล้วเก็บ `job2Tree`/`job2Talents` ของ Mobster ไว้ตามเดิม

---

## เป้าหมาย (Goals)

1. **ลบ Node/Talent ที่เป็น Flat-Stat Filler ออกทั้งหมด:** เปลี่ยนโครงสร้างสกิลและทาเลนต์ของทั้ง Thief และ Rogue จากการบวกค่าสถานะตรงๆ (`+HP`, `+ATK`, `+HIT`, `+FLEE`, `+Crit%`, `+Lifesteal%` แบบไร้เงื่อนไข) ให้เป็น **กลไกแบบมีเงื่อนไข (Conditional Mechanics)**, **จังหวะคอมโบ/หลบหลีก (Tempo & Dodge Loops)** และ **การประสานสถานะ (Multi-Status Synergies)**
2. **สร้างความหลากหลายของ Build ใน Thief (`s1` / `s2` / `ult`):**
   - **Skill 1 (`แทงพิษ` — Priority P2):** แตกเป็น **2 สายชัดเจน** (*สาย Envenom สะสมพิษ + เจาะเกราะ* vs *สาย Contaminate ระเบิดพิษ + Hybrid INT & ดูดเลือดพิษ*) พร้อมแก้ปัญหา Energy Loop ใน `autoSkill` (`25/turn`) ไม่ให้ `แทงพิษ` แย่ง `basicAttack()`/`combo`/`มีดบิน` จนใช้ไม่ได้
   - **Skill 2 (`D.Strike` → `2-1` / `2-2` / `2-3`):** ปรับสมดุล **`2-1 ม่านควัน`** (Shroud 2 เทิร์น + Sightless Raid + Exposed/Blind), **`2-2 ล้วงกระเป๋า`** (On-Hit Basic Strike + Gold/Energy Tempo), และ **`2-3 แผลลึก`** (Wound Stacking + Blade's End + Privileged Status) ให้ทำดาเมจและการใช้งานจริงใกล้เคียงกันภายใน **`±15%`**
   - **Ult (`เงาพริ้ว`):** เปิดทางเลือก **3 สไตล์หลัก** (*Crit Execution*, *On-Hit Weapon Strike แบบ Gangplank Q / Katarina R*, และ *Ghost Dance เงาหลบสะท้อน*)
3. **ทำให้ Stat รองทุกตัว (ทั้ง 7 Stat) มี Build นอกกระแสที่เล่นสนุกจริง (Off-Meta Scaling 0.45x–0.90x ของ Classic STR/AGI):**
   - **`DEX` → จำนวนฮิตของ `เงาพริ้ว` + มีดเสริมใน `พายุมีด` + On-Hit Ult Storm**
   - **`WIS` → เพดาน Max Poison Stacks + พิษซึมลึก `%MaxHP` + ต้านทานบอส `Shadow Ward`**
   - **`INT` → `เลือดพิษ` (Multiplicative INT Curve ไม่ตันตั้งแต่ Lv 1) + Hybrid `M.ATK` บน `แทงพิษ`/Venom Coating/Contaminate**
   - พร้อมกลไกเฉพาะตัวสำหรับ **`STR`**, **`AGI`**, **`LUK`**, **`VIT`** ที่มี Trade-off ชัดเจน
4. **ยกระดับ Rogue (Class 2) ให้มีเอกลักษณ์เฉพาะตัวระดับเดียวกับ Monk / Sage:**
   - อัปเกรด **`มีดบิน`** เป็นระบบ **Dagger Marks + Voracity Pickup/Reset**, เพิ่ม Sub-nodes ใต้ **`rogue_s3` (`Back Stab`)** และ **`rogue_u2` (`พายุมีด`)** (แก้บั๊ก `j2KnifeMul` ไม่ถูกอ่านใน `พายุมีด`), และออกแบบ 3 ก้าน + 4-Row Talents (`rg_t1`–`rg_t4`) ที่ขับเคลื่อนด้วย *Death Mark*, *Strip Armor*, *Living Shadow* และ *Plagiarism* (รองรับ D6–D14 ครบทุกมอน + `heroKit`)
5. **คงความเข้ากันได้ 100% กับ Codebase จริง:** เคารพข้อจำกัดของ `web-tier1.ts` (`≤ 8` คอลัมน์, `5` แถว), `web-tier2.ts` (`_s3`/`_u2` ไม่เกิน `tier 1..3`), `stretchNode()`/`tidy(s, whole)`, `CRIT_RULES`, `STAT_CAPS`, `INT_FIELDS`, `NO_STRETCH`, `tests/job2-talents.test.ts` (`v > 0`), `borrow.ts`/`admin-model.test.ts`, และ Mobster (`มาเฟีย`)

---

## 1) การอ้างอิง Codebase และงานวิจัย RPG / Roguelike (Grounding & External Research)

### 1.1 จุดยึดใน Codebase ปัจจุบัน

| ระบบ / ไฟล์ | สัญลักษณ์และข้อเท็จจริงที่ยืนยันจากโค้ด | ผลต่อการออกแบบ Rework |
|---|---|---|
| **Stats & Caps** (`src/data/stats.ts:48-115, 427-449`, `src/data/meta/hero-stats.ts:166-480`, `src/data/meta/stat-spec.ts:83-102`) | `PLAYER` (`stats.ts:433-449`), `STAT_CAPS` (`physPen/magPen: 0.75`, `elemDmg: 2.0`), `clampLinearCaps()` (`hero-stats.ts:460-476`: `lifesteal ≤ 0.4`, `spellVamp ≤ 0.4`, `dodgeHeal ≤ 0.1`, `fleeFloor ≤ 0.2`, `luckyDodge ≤ 0.25`, `combo ≤ 1.5`, `minPct ≤ 0.95`). `JOB_BONUS_STATS.thief = ['agi', 'str']`, `.rogue = ['agi', 'str', 'dex']` (`stat-spec.ts:89,94`). | Stat ใหม่ทุกตัวต้องประกาศค่าเริ่มต้น `0` ใน `PLAYER`; `thPoisonLeechLv` ใช้เพดานเฉพาะตัวแยกจาก `lifesteal`; `thUltAgi` ปรับเป็น `0.01 * d('agi')` คู่กับ `thUltDex = 0.012 * d('dex')`; Thief `WIS` เพิ่ม `poisonDmg +0.50/pt` และ `INT → M.ATK +1.0/pt` (เมื่อ `thS1Matk > 0`) ใน `heroBuild()` |
| **`stretchNode()` & `tidy(s, whole)`** (`src/data/tree.ts:68-153`) | `stretchNode()` ยืด `max: 3 -> 5` ด้วย `at(lv) = (lv * 3) / 5` (`[0.6, 1.2, 1.8, 2.4, 3.0]`). หาก Key ใดใน `n.mod(old)` อยู่ใน `INT_FIELDS` (`whole = true`) ฟังก์ชัน `tidy(s, true)` จะเรียก **`Math.round()` กับทุกเลขทศนิยม (`\d+\.\d+`) ในข้อความ `desc(x)`** และสูตร `base + step * lv` จะได้ค่าต่ำกว่าขั้นต่ำที่ `Lv1` (`x = 0.6`)! | **กฎเหล็ก:** 1) โหนดที่มี `INT_FIELDS` ห้ามเขียนทศนิยม `\d+\.\d+` ใน `desc(lv)` (ให้แสดงเป็น `%` จำนวนเต็มด้วย `Math.round(...)`) 2) ห้ามใช้ `base + step * lv` ใน `mod(lv)` บนโหนดที่ถูก stretch ให้ส่งเฉพาะ `step * lv` แล้วบวก `base` ใน `BattleScene` เมื่อ `stat > 0` |
| **Crit Channel & Pierce** (`src/data/battle-rules.ts:33-42`, `src/scenes/BattleScene.ts:1254-1255, 2876-2901`) | `crit` (cap `1.0`) ใช้กับตีปกติ/คอมโบ/สวน/`throwKnives`; Active Skill/Ult (`src='skill'`/`'ult'`) ใช้ `min(0.6, st.skillCrit + (st.crit + physAdd) * 0.5)`; `magic = true, src = 'skill'` ใช้ `min(0.6, st.skillCrit + st.spellCrit)` (`2894`). กายภาพที่คริ (`!magic && crit`) **ข้าม P.DEF 100% อยู่แล้ว** (`1254`) ส่วนเวท (`magic = true`) ใช้ `Pm = 0.7*M.ATK + 0.3*P.ATK` (`skill-math.ts:14`) | `thief_v1` ต้องแปลง `M.ATK` เป็นหน่วย `Pm` ผ่าน `matkToPmRatio(st)` (และ guard `if (st.matk > 0)`); `th_t2b` เปลี่ยนเป็นเจาะ **`magPen`** (ช่วยส่วนเวท `thief_v1`) แทน P.DEF บนกายภาพคริที่ซ้ำซ้อน; `th_pick` override `critRateFor` ให้ใช้ `100% st.crit`; `Back Stab` เพิ่ม flag ข้าม `luckyDodge` ที่ `1238` |
| **Skill 1 & Energy Loop** (`src/data/jobs.ts:84-89`, `src/data/skill-math.ts:348`, `BattleScene.ts:1041, 1085-1088, 3425-3427`) | Energy ฟื้นคงที่ `RES_RULES.energyPerTurn = 25`/เทิร์น (max `100`); `autoCost()` (`skill-math.ts:348`) hardcode เพดานต่ำสุด `10`; `แทงพิษ` เดิม `autoCost: 40` ไม่มี `(1 + st.pskill)` และไม่มี `s1Weave` | ปรับ `autoCost = 45`, แก้ `autoCost()` ให้ Thief มี floor `KIT.thiefAutoMinCost = 30`, เพิ่ม `(1 + st.pskill)` (รวมใน `autoInfo` ด้วย), และบังคับ **`s1Weave` สลับ 1:1** (`แทงพิษ` → `Basic` เสมอ โดย **ไม่มี** `res >= 80` bypass เพื่อไม่ให้ `2-2` หรือ `th_t2a` ทำ Rogue ขาด `Basic`/`combo`) |
| **Skill 2 & `healCut` & `debt`** (`src/data/skill2.ts:58-63`, `src/data/skill-math.ts:320,342-344`, `BattleScene.ts:2041-2044, 3325-3347, 5183`) | `thief_core1` (`D.Strike` max 5, `NO_STRETCH`) กั้น `th_smoke`, `th_pick`, `th_wound`; `healCut(m)` อ่านเฉพาะ `m.hell`/`m.burn`; `debt(m)` อ่านเฉพาะ `6` ดีบัฟ (`poison`, `burn`, `chill`, `weakTurns`, `marked`, `armorBrk`) | คง `thief_core1` + `S2N.smokeHeal`/`pickRes`/`woundPoison`; เพิ่มตัวเลขล้วนใน `S2P`/`S2N` ให้ `th_wound` สำหรับ `SKILL_LAYOUT`; อัปเดต `healCut(m)` เป็น `Math.max(existing, m.woundHealCut > 0 ? 0.40 : 0)`; คง `debt(m)` ไว้ที่ 6 ดีบัฟเดิมเพื่อไม่ให้ Mobster Execute เพี้ยน |
| **Poison, `damageMon`, `overhealShield`, `hurtHeroCore`** (`BattleScene.ts:1216, 1273, 3878-3941, 4085-4103, 4402, 4546-4555`) | `BattleScene.ts:1273` แปะ `st.poison` เต็มจำนวนทุก physical `strike()`; `damageMon()` คืน `void` และอาจโดน `maidenGuarded`/`parry`/`m.shield` ดูดเหลือ `0`; `poisonLeech` บรรทัด `4102` ข้าม `dotMul()`/`poisonAmp`; `dodged()` (`4402`) นับ `src.evaded`; `overhealShield` (`4548`) ชนกับ `pk.overheal` | เพิ่ม `poisonMul` คุม `1273` (ตั้ง `0` ใน `Sinister Steel` / non-on-hit `shadowDance`, ปัดเศษด้วย `Math.floor` ทั้งระบบ); แยก `onShroudBreak()` ออกจาก `dodged()` ไม่ให้ Shroud แตกไปเร่ง `trueSight`; คำนวณ `netHpDmg` หลังหัก `maiden`/`parry`/`m.shield` ใน `damageMon()` สำหรับ `เลือดพิษ` และ `Death Mark`; แยก **VIT Toxic Overheal** ออกเป็นสาขาเฉพาะใน `heal()` ผ่าน `addShield()` |
| **UI Web, Admin & Test Contracts** (`web-tier1.ts:73-150`, `web-tier2.ts:192-271`, `src/admin/borrow.ts:12-38`, `src/data/skill-registry.ts`, `src/data/tunables.ts`, `src/data/hero-skill-book.ts`) | **Tier 1:** `5` แถว, `≤ 8` คอลัมน์ (`cw1 = 70.875px`), `ATTACH` ลากเส้นทแยง; **Tier 2:** `_s3`/`_u2` ใช้ได้แค่ `tier 1..3` (`t2PanelH = 294`); `job2-talents.test.ts` บังคับทุกค่าใน `TALENTS2.mod(r)` `> 0`; `skill-registry.test.ts:23` บังคับทุก `SkillRef` คืน `typeof v === 'number'`; `borrow.ts` map เฉพาะ unconditional stats | จัด Thief พอดี 8 คอลัมน์, Rogue `_s3`/`_u2` พอดี `tier 1..3`, `TALENTS2` ทุกค่า `> 0`; อัปเดต `tests/admin-model.test.ts` ชี้โหนด unconditional ใหม่ (`เคลือบพิษอาบคม`, `D.Strike`, `จังหวะเร่ง`, ฯลฯ), อัปเดต `skill-registry.ts` (`S2N` numeric leaves, `'rogue.critKnifeMul'`, `INTISH` `(Knives\|Knife)$`), `tunables.ts`, `hero-skill-book.ts` และ `node-detail.ts` |

### 1.2 แรงบันดาลใจจาก RPG / Roguelike ภายนอก

| เกม | กลไกต้นแบบ | แหล่งอ้างอิง (ชื่อหน้า wiki — Rev 4 ลบลิงก์ redirect ที่หมดอายุ) | การประยุกต์ใช้ใน Rework นี้ |
|---|---|---|---|
| **Ragnarok Online** | *Envenom / Enchant Poison (-DEF) / Venom Splasher / Soul Destroyer (ATK+INT hybrid) / Back Stab (ไม่พลาด) / Snatch / Sightless Mind (+dmg taken + Blind) / Divest (Strip DEF) / Plagiarism* | ratemyserver.net (Envenom), ratemyserver.net (Enchant Poison), ratemyserver.net (Venom Splasher), ratemyserver.net (Soul Destroyer), fandom.com (Back Stab / Raid / Plagiarism) | Skill 1 แยกสาย *Envenom Shred* vs *Contaminate + INT Soul Destroyer*; `2-1 ม่านควัน` เพิ่ม *Sightless Raid*; Rogue ได้ *Back Stab ไม่พลาด (ข้าม luckyDodge)*, *Strip Armor*, และ *Plagiarism* (3-tier map) |
| **League of Legends** | *Gangplank Q (on-hit + crit)*, *AP Twitch (Contaminate E)* & *AP Malphite*, *Akali W (Shroud)*, *Talon P (Blade's End 3-stack Wound)*, *Katarina P & R (Voracity Pickup/Reset + Death Lotus)*, *Zed R (Death Mark + Living Shadow)* | fandom.com (GP Q), reddit.com (AP Twitch), fandom.com (Akali W), fandom.com (Talon P), fandom.com (Kat / Zed) | `เงาพริ้ว` สาย On-Hit (efficiency **40%–55%**), `2-3 แผลลึก` 3-stack *Blade's End* ปิดด้วย Basic/D.Strike/Back Stab, Rogue *Dagger Marks + Voracity* และ *Death Mark* (pure net-HP pop) |
| **Hades** | *Privileged Status (+dmg เมื่อมี 2+ status)*, *Splitting Headache (+crit/stack)*, *Exposed*, *Heart Rend* | fandom.com (Privileged Status), fextralife.com (Heart Rend) | Synergy ระหว่าง **Poison + Wound + Exposed** (*Privileged Status*), ทาเลนต์ *Splitting Headache*, และ *Heart Rend* ของ Rogue |
| **Path of Exile** | *Perfect Agony (Crit Multi → DoT, cap ชัดเจน)*, *Crimson Dance*, *Ghost Dance (Shroud → ES ก่อนโดนตี)*, *Noxious Strike*, *Ambush & Assassinate*, *One Step Ahead* | poedb.tw (Perfect Agony), poewiki.net (Ghost Dance), pathofexile.com (Assassin/Trickster) | ทาเลนต์ `th_t4b` *Perfect Agony*, ระบบ **Ghost Shroud** กันบอส `trueSight`, *Noxious Strike* ใน `thief_c3`, และ *Ambush & Assassinate* ใน Rogue `rg_x1` |

---

## 2) Thief (โจร — Class 1) Rework ฉบับเต็ม

### 2.1 โครงสร้างคอลัมน์ Skill Web (`web-tier1.ts` — 8 คอลัมน์, 5 แถว)

ความกว้างการ์ดใน `web-tier1.ts`: `cw1 = (602 - 5 × 7) / 8 = 70.875px` (`≥ 70px` ไม่ทับไอคอน/ดาว/ป้าย) จัดโครงสร้าง **8 คอลัมน์ × 5 แถว (`tier 0..4`)** ดังนี้:

| Col | กลุ่ม (`web-tier1.ts`) | Branch ID (`ATTACH`) | บทบาทหลัก |
|---|---|---|---|
| 0 | `🗡️ ทักษะ 1` | `thief_s1` + `thief_a` (`'s1'`) | **สายพิษสะสม & เจาะเกราะ (Envenom Stack & Shred)** — วางใต้ `thief_s1p` (row 0) |
| 1 | `🗡️ ทักษะ 1` | `thief_v` (`'s1'`) | **สายระเบิดพิษ & เล่นแร่ INT (Contaminate & Toxic Leech)** — เชื่อมทแยงจาก `thief_s1p` (`tree.ts:295`) |
| 2 | `🗡️ D.Strike → ทักษะ 2` | `thief_s2` (`th_smoke`) | **2-1 ม่านควัน (Twilight Shroud + Sightless Raid + Exposed/Blind)** |
| 3 | `🗡️ D.Strike → ทักษะ 2` | `thief_s2` (`th_pick` + `thief_core1` row 0) | **Gate `D.Strike` (5/5) + 2-2 ล้วงกระเป๋า (On-Hit Strike + Economy)** |
| 4 | `🗡️ D.Strike → ทักษะ 2` | `thief_s2` (`th_wound`) | **2-3 แผลลึก (3-Stack Wound + Blade's End + Privileged Status)** |
| 5 | `🔥 👥 Ult (แกนสะสม)` | `thief_ult` + `thief_b` (`'ult'`) | **สายเงาหมอก & เคาน์เตอร์ (Ghost Dance & Dodge Strike)** — วางใต้ `thief_ultp` (row 0) |
| 6 | `🔥 👥 Ult (แกนสะสม)` | `thief_u` (`'ult'`) | **สายเงาสังหาร & On-Hit (Crit Execution & Weapon Mastery)** — เชื่อมทแยงจาก `thief_ultp` |
| 7 | `🩸 โลหิตและจุดตาย` | `thief_core` (`line: 'core'`) | **Conditional Crit, Conditional Lifesteal, Noxious Kill & Blood King** (`tier 1..4` -> row `0..3`) |

> **งบประมาณแต้ม & `crossTierBonus()` (`src/data/tree.ts:51-63`):**  
> - **Thief Tier 1 Budget Constraint (39 แต้มที่ Job Lv 40):** ค่าใช้จ่ายรวมในการอัปเต็ม `s1 (21 แต้ม) + s2 (12 แต้ม) + ult (21 แต้ม) = 54 แต้ม > 39 แต้ม` (ยังไม่รวม `thief_core` อีก `16` แต้ม; รวมทั้งหมดใน 1 Build = `102` แต้ม จาก `116` แต้มทั้งเว็บ) — จึง **บังคับให้ผู้เล่นเลือกเน้น 1–2 ก้านหลักในคลาส 1** (เช่น `s1 + s2` หรือ `ult + s2`) ก่อนจะใช้แต้ม **Class 2 Cross-Tier (`j2In1`)** มาปิดสายที่เหลือหรือปลด Capstone เพิ่มทีหลัง  
> - **เกณฑ์ `SCALABLE_RULES` (`tree.ts:51-60`):** คอลัมน์ `s1` (`thief_s1p (5) + thief_a (16) + thief_v (16) = 37` max) และ `ult` (`thief_ultp (5) + thief_b (16) + thief_u (16) = 37` max) ยังคงใช้ `s1ScaleStart = 8`, `s1AwakenNeed = 14`, `ultOverdriveNeed = 12`, และ `ultResonanceCap = 0.30` (20 pts) ตามเดิมโดยไม่ต้องแก้ `SCALABLE_RULES` (เพราะ `37` แต้มต่อสายเพียงพอที่จะปลดได้ทั้ง 2 สายในสายเดียวหรือผสมข้ามสาย)

---

### 2.2 การแก้ปัญหา `autoSkill` Energy Loop & ค่าพื้นฐาน `JOBS.thief`

- **`JOBS.thief` (`src/data/jobs.ts:84-89`):**
  - `mod`: `{ flee: 10, aspd: 0.24, poison: 1, fleeFloor: 0.1 }` (คงเดิม).
  - **Basic Attack (`BattleScene.ts:3164`):** `0.6x + 0.6x P.ATK` + `D.Strike` (`0.6x`).
- **แก้ไข `แทงพิษ` Energy Trap (`BattleScene.ts:1085-1088` & `src/data/skill-math.ts:348`):**
  1. ตั้งค่า Energy ของ `แทงพิษ` เป็น **`45` Energy** (`KIT.thiefAutoCost = 45`), ตั้งเพดานลดต้นทุนต่ำสุด **`KIT.thiefAutoMinCost = 30`** และอัปเดต `autoCost()` (`skill-math.ts:348`) เป็น:
     ```ts
     export const autoCost = (job: JobDef, st: Stats) =>
       Math.max(job.id === 'thief' ? KIT.thiefAutoMinCost : Math.min(10, job.auto.cost), job.auto.cost - st.autoCostCut)
     ```
     *(เพื่อไม่ให้ไอเทม/การ์ดเก่าที่มี `autoCostCut` ลดค่า `แทงพิษ` ลงไปเหลือ `10` แล้วกลับไปติดลูป)*
  2. **ลบการลดค่า Energy ถาวรออกจาก `th_t2c`** แล้วเพิ่มสถานะ **`s1Weave` (`สลับคม`):**
     - หลังร่าย `แทงพิษ` ใน `autoSkill()` จะตั้ง `this.s1Weave = true`.
     - ใน `BattleScene.ts:1085` (โหมด Auto และ Manual เมื่อไม่กดจองทับ): **ถ้า `this.job.id === 'thief' && this.s1Weave` จะบังคับข้าม `autoSkill()` ไปร่าย `basicAttack()` 1 เทิร์น** แล้วล้าง `this.s1Weave = false` ใน `basicAttack()`.
     - **ยกเลิกกฎ `res >= 80` bypass สำหรับ Rogue (และถอดออกจากโหมด Auto ปกติ):** ยืนยันจาก Simulation 20 เทิร์นว่า `s1Weave` แบบสลับ 1:1 ให้สัดส่วน **`S1 : Basic = 1.00 : 1`** ทั้งใน Thief และ Rogue แม้ใช้ `2-2 ล้วงกระเป๋า` (`+30 Energy`) + `th_t2a` (`+25 Energy/หลบ`) ทำให้ `combo`, `D.Strike`, `Voracity Pickup` และ `มีดบิน` ทำงานครบทุกเทิร์นที่สลับ!
     - *(หมายเหตุ Manual Mode: ผู้เล่นที่กดปุ่ม `s1` เองเมื่อ `this.book.s1 === true` สามารถกดร่าย `แทงพิษ` ซ้ำได้หาก Energy พอ และจะติด `s1Weave` สำหรับเทิร์นถัดไปที่ไม่กดจอง)*
  3. **`skill3Turn()` (`BattleScene.ts:2128`) & `smashQueued`:** ตรวจสอบ `if (this.smashQueued && this.smashCdLeft <= 0 && this.res - cost < this.ultCost()) return` — เนื่องจาก `พายุมีด` มี `ultCost() === 0` Rogue จึง **ไม่** ถูกบล็อกการร่าย `Back Stab` ก่อน `พายุมีด`, ในขณะที่ยังปลอดภัยหากในอนาคตมี Relic ที่ทำให้ Ult เสีย Energy
  4. **อัปเดตสูตรดาเมจพื้นฐาน `แทงพิษ` (`BattleScene.ts:3426`)** ให้คูณ **`(1 + st.pskill)`** ด้วย (แก้บั๊กเดิมที่ `STR` ไม่สเกลกับ `แทงพิษ`):
     $$\text{AutoDmg} = \text{P.ATK} \times 1.6 \times (1 + \text{s1Pow}) \times (1 + \text{pskill}) \quad (+ \text{D.Strike roll})$$

---

### 2.3 Skill 1 (`แทงพิษ`) — แตก 2 สายชัดเจน (P2 Branching)

> **กฎการ Stretch (`stretchNode()` & `tidy(s, whole)` ใน `src/data/tree.ts:119-153`):**  
> 1. โหนด Tier 1–3 ที่ไม่ใช่ `NO_STRETCH` เขียนสูตรต่อ **Old Level (`1..3`)** และถูก `tree.ts` ยืดเป็น `1..5` (`x = lv * 3 / 5 = [0.6, 1.2, 1.8, 2.4, 3.0]`).  
> 2. **กฎห้าม `tidy` พังข้อความ:** โหนดใดที่มี Key ใน `INT_FIELDS` (`whole = true`) **ห้ามมีเลขทศนิยม `\d+\.\d+` ใน `desc(lv)`** โดยเด็ดขาด ให้แปลงตัวคูณ/เปอร์เซ็นต์เป็นจำนวนเต็มด้วย `Math.round(...)%` เสมอ  
> 3. **กฎห้าม `base + step * lv` Undershoot:** ห้ามเขียน `base + step * lv` ใน `mod(lv)` บนโหนดที่ถูก stretch; ให้ `mod(lv)` เก็บเฉพาะ `step * lv` แล้วให้ `BattleScene` บวก `base` เมื่อ `stat > 0`

#### สาย 1A: `thief_a` — **พิษสะสม & กัดกร่อน (Envenom Stack & Armor Shred)** *(ตีบอสยืนระยะ, RO Envenom/Enchant Poison)*
| ID | Tier (Max) | ชื่อ | กลไก, เงื่อนไข & สูตรตัวเลข (ต่อ Old Lv `1..3` → ยืด `1..5`) | `Stats` Keys & `INT_FIELDS` |
|---|---|---|---|---|
| `thief_a1` | T1 (3→5) | **เคลือบพิษอาบคม** | ทุก Physical hit ติดพิษเพิ่ม `+1*lv` stack (`1, 1, 2, 2, 3` ที่ Lv 1..5) · **Enchant Poison:** เมื่อโจมตีใส่เป้าที่ติดพิษ (`m.poison > 0`) ได้โบนัสเจาะเกราะกายภาพเฉพาะฮิตนั้น `+(6 * lv)%` (`4%, 7%, 11%, 14%, 18%`, อ่าน `st.thPoisonPen` ใน `BattleScene.ts:1254` ร่วมกับ `st.physPen` และ cap ที่ `STAT_CAPS.physPen = 0.75`) · *ข้อความ `desc` ใช้ `Math.round(6 * lv)%` ไม่มีทศนิยม* | `poison: lv` (**`INT_FIELDS`**), `thPoisonPen: 0.06 * lv` |
| `thief_a2` | T2 (3→5) | **พิษกัดลึก** | ดาเมจพิษฐาน `+lv` ต่อ stack (`+0.6..+3.0`, ไม่เป็น `INT_FIELDS` เพื่อรักษาสเกลต่อเนื่อง) · เป้าที่ติดพิษโดนดาเมจทุกชนิด (`!dot`) แรงขึ้น `+(8 * lv)%` (`+4.8%..+24%`, รวมใน `vsPoison` cap `OUTSIDE_CAP.vsPoison = 0.70`) | `poisonDmg: lv`, `vsPoison: 0.08 * lv` |
| `thief_a3` | T3 (3→5) | **พิษทนทาน** | เพดานพิษ `+3*lv` stack (`2, 4, 5, 7, 9` ที่ Lv 1..5) · **Anti-Boss Decay:** เมื่อมอนที่มี `toxicSkin` ลดพิษตอนจบเทิร์น (`BattleScene.ts:4086`) มีโอกาส `min(0.75, 0.25 * lv)` (`15%..75%`) ที่พิษ **ไม่ลด** · และเมื่อ `D.Strike` ติดสำเร็จ แปะพิษเพิ่มอีก `+1` stack (ใช้ flag `thStrikePoison` ใน `BattleScene`) | `poisonCap: 3 * lv` (**`INT_FIELDS`**), `thToxicHold: 0.25 * lv`, `thStrikePoison: 1` |
| `thief_a4` ★ | T4 (1) | **ระเบิดพิษลาม** | มอนตาย: กระจายพิษ `ceil(m.poison * 0.6)` ไปยังศัตรูที่เหลือทั้งหมด (`poisonSpread: 1`) · **Plague Burst:** หากมอนตายขณะมีพิษ `≥ 10` stack ระเบิดพิษใส่ตัวข้างเคียงทันที `1×` เทิร์นพิษ (`m.poison * m.poisonDmg * dotMul()`, `src = 'poison', dot = true`, **ห้ามทำงานเมื่อตายจาก `ทวงหนี้` ของ Mobster — ดู §6**) | `poisonSpread: 1`, `thPlagueDeath: 1` |

#### สาย 1B: `thief_v` — **ระเบิดสารพิษ & เล่นแร่ INT (Contaminate / Venom Splasher + Toxic Leech)** *(เคลียร์เวฟ + AP Twitch/Soul Destroyer)*
| ID | Tier (Max) | ชื่อ | กลไก, เงื่อนไข & สูตรตัวเลข (ต่อ Old Lv `1..3` → ยืด `1..5`) | `Stats` Keys & `INT_FIELDS` |
|---|---|---|---|---|
| `thief_v1` | T1 (3→5) | **แทงฉาบอาคม** | 1) `แทงพิษ` สร้าง **ดาเมจเวทเสริม (`magic = true`, `src = 'skill'`, guard `if (st.matk > 0)` เพื่อไม่ให้ `0 M.ATK` ออก floor `1` จาก `roll()`)** เท่ากับ **`+(0.60 * lv) × M.ATK`** (`+0.36..+1.80× M.ATK` ที่ Lv 1..5) โดยแปลงเป็นหน่วย `Pm` ผ่าน `matkToPmRatio(st) = st.matk / Math.max(1, magicPower(st))` ใน `strike()` · ใช้ `critRateFor` มาตรฐาน `min(0.6, st.skillCrit + st.spellCrit)` (`BattleScene.ts:2894`)<br>2) **Venom Coating & Arcane Edge:** ระหว่างที่ `thS1Matk > 0`, **`heroBuild()` เพิ่ม `M.ATK +1.0 × (INT - 1)`** (ช่วยให้สาย `INT` บนชุดมีดกายภาพล้วน `c_rg_hood`/`c_rg_ring` ยังสเกลได้ `0.60x+`) และ **`Basic Attack` / `D.Strike`** สร้างดาเมจเวทเสริม **`+(0.35 * lv) × M.ATK`** (`+0.21..+1.05× M.ATK` ต่อ Basic cycle, guard `if (st.matk > 0)`, ทำงาน 1 ครั้งต่อ `basicOnce` ฮิตแรก + 1 ครั้งต่อ `D.Strike`)<br>3) หาก `totalBase.int >= 20`: ทุกครั้งที่ร่าย `แทงพิษ` แปะพิษเพิ่ม **`+1` stack** (1 ครั้ง/การร่าย ไม่เบิ้ลบน `D.Strike`) | `thS1Matk: 0.60 * lv` (และ `thBasicMatk = thS1Matk * (0.35 / 0.60)` ใน `BattleScene`; `heroBuild` บวก `1.0 * d('int')` M.ATK เมื่อ `thS1Matk > 0`) |
| `thief_v2` | T2 (3→5) | **ระเบิดสารพิษ (Contaminate)** | เมื่อ **`แทงพิษ` หรือ `Basic Attack`** (ICD `1` ครั้ง/เทิร์นฮีโร่ รวมกัน) **หรือ `Back Stab`** (ICD `1` ครั้ง/เทิร์นฮีโร่ **แยกต่างหาก ไม่ชนกับ `Basic`/`แทงพิษ`**!) ตีโดนเป้าหลักที่มีพิษ `≥ 8` stack: **จุดระเบิดใช้ `40%` ของ stack (`det = max(3, floor(m.poison * 0.4))`)** สร้างดาเมจพิษทันที (`src = 'poison'`, ข้าม P.DEF 100%, `dot = false` เพื่อให้รับ `vsPoison` / `Exposed` / `Privileged`): $$\text{Burst} = \Big(\text{det} \times \big(m.\text{poisonDmg} \times (1.5 + 0.5 \times \text{lv}) + 0.14 \times \text{lv} \times \text{M.ATK}\big) + (0.6 + 1.0 \times \text{lv}) \times \text{M.ATK}\Big) \times \text{dotMul}()$$ (ที่ Lv5 `x = 3.0`: `det × (3.0×poisonDmg + 0.42×M.ATK) + 3.6×M.ATK`) และกระเด็น AoE `50%` ไปศัตรูตัวอื่นทุกตัว! *(คำนวณแบบ `0.14*lv` และ `1.0*lv` + unlock base `1.5`/`0.6` ใน `BattleScene` เมื่อ `thDetonate > 0` เพื่อไม่ให้ undershoot ที่ Lv 1!)* | `thDetonate: lv` (ค่า `0.6..3.0` ใช้เป็น `lv` ในสูตร `BattleScene`) |
| `thief_v3` | T3 (3→5) | **เลือดพิษ (Reworked INT-Scaled)** | **แทนที่ `thief_l2` แบบแบนๆ เดิม:** เมื่อ `thPoisonLeechLv > 0` ทุกครั้งที่พิษสร้างดาเมจ **จริงเข้า HP มอน (`netHpDmg`)** ทั้งจากติ๊กเทิร์นมอน **และ** จาก `ระเบิดสารพิษ` (ไม่นับ `ทวงหนี้` Mobster และหัก `maiden`/`parry`/`m.shield` แล้ว) จะฮีลฮีโร่ในอัตรา: $$\text{LeechRate} = \min\!\left(0.60,\; (0.08 \times \text{lv}) \times \big(1 + 0.015 \times \max(0, \text{INT} - 1)\big) + \text{st.poisonLeech}\right)$$ *(ตัวเลขจริง: `INT=1` = `4.8%..24.0%`, `INT=51` = `8.4%..42.0%`, `INT=81` = `10.6%..52.8%` เพิ่มขึ้นทุก Lv 1..5 ไม่ตันที่ Lv1!)* · **Unified Turn Cap:** จำกัดฮีลรวมจาก `เลือดพิษ` (ทั้งเทิร์นมอนและเทิร์นฮีโร่ `ระเบิดสารพิษ` AoE) ไม่เกิน **`25% Max HP` ต่อ 1 เทิร์น** (`poisonHealTurn` รีเซ็ตเมื่อเริ่มเทิร์นฮีโร่และเริ่มเทิร์นมอน) · `desc` แสดงผลเป็น `%` จำนวนเต็ม | `thPoisonLeechLv: lv` (ไม่ใส่ `INT_FIELDS` เพื่อให้ `0.6..3.0` สเกลต่อเนื่อง; `st.poisonLeech` คงไว้สำหรับไอเทม/การ์ดเก่า) |
| `thief_v4` ★ | T4 (1) | **นักเล่นแร่พิษ** | 1) `ระเบิดสารพิษ` **คริได้** (ใช้ `min(0.6, st.skillCrit + st.spellCrit)` และ `critMul` — **ไม่ซ้อนกับโบนัส `Perfect Agony` เมื่อติดคริ**)<br>2) `เลือดพิษ` ที่เกิดจาก `ระเบิดสารพิษ` ใช้ `100%` ของ `LeechRate` (แทน `50%` พื้นฐานใน `thief_v2` เมื่อยังไม่มี ★; อยู่ในเพดาน `25% Max HP/turn`)<br>3) เมื่อจุดระเบิดใส่ **Boss/Mini (`ai === 'boss'`)** คืน `25%` ของ stack ที่ใช้ (`ceil(det * 0.25)`) ทันที<br>4) **Alchemy Blade:** `Back Stab` สร้างดาเมจเวทเสริม **`0.90 × M.ATK`** และ `พายุมีด` (ช่วงมีดโปรย) สร้างดาเมจเวทเสริม **`0.60 × M.ATK`** ต่อเล่ม (guard `if (st.matk > 0)`, แปลงผ่าน `matkToPmRatio(st)`) ช่วยให้ Rogue สาย `INT` ทำดาเมจช่วงสกิล 3/Ult ได้เต็มที่แม้ถือมีดกายภาพ! | `thDetonateStar: 1` |

---

### 2.4 Skill 2 (`D.Strike` Gate + 3 ทางเลือกเทียบเท่ากันภายใน ±15%)

- **Gate `thief_core1` (`D.Strike`, `tier: 0`, `max: 5`, `NO_STRETCH`):**
  - คงการกั้น Skill 2 ที่ `5/5` (`tests/node-stretch.test.ts:86`): โอกาส `10% + 10% × lv` (`20%..60%`) ที่ `Basic` และ `แทงพิษ` จะแทงซ้ำ `0.6x` (คริได้, `lsMul = 0.33`, หากมี `thief_v1` ทริกเกอร์ Venom Coating ด้วย) · **ปรับปรุง:** ทุกครั้งที่ `D.Strike` ติดสำเร็จ ฟื้น **`+4` Energy** (ไม่เกิดซ้ำซ้อนบนฮิตของ `เงาพริ้ว`).

- **นิยามรวมของสถานะ `Exposed` vs `Backstab Mark` (แก้ความขัดแย้งเดิม 100%):**
  - **`Mon.exposed` (`Exposed`, จาก `2-1 ม่านควัน`):** เป้าหมายโดน **ดาเมจทุกชนิด (`!dot`) แรงขึ้น `+exposedPct`** (`+20%` พื้นฐาน, `+30%` ที่ `★`, นาน `2` เทิร์นมอน; Refresh เมื่อโดนซ้ำ).
  - **`Mon.stabMark` (`Backstab Mark`, จาก Rogue `Back Stab`):** เป้าหมายโดน **Critical Hits, `Back Stab`, `พายุมีด` และ `Basic` แรงขึ้น `+15%`** (นาน `2` เทิร์นมอน) — **แยกฟิลด์กับ `Mon.exposed`** เพื่อให้ `2-1 ม่านควัน` + `Back Stab` ซ้อนทับกันได้เต็มที่โดยไม่ทับสิทธิ์กัน!

| Skill 2 | ต้นทุน / CD | กลไกหลัก & เงื่อนไข | `+` Node (`s2Lv = 0..3`) | `★` Node (`s2Star = 1`) | Trade-off & Boss Rule |
|---|---|---|---|---|---|
| **2-1 `th_smoke` ม่านควัน** *(Akali W + RO Sightless Mind)* | `35` Energy / `CD 4` | ร่ายต้นเทิร์น: ได้หลบแน่นอน `1` ครั้ง (`dodgeCharges = max(dodgeCharges, 1)`) และเข้าสถานะ **`Shroud` (`shroudTurns = 2`, นับลงต้นเทิร์นฮีโร่ถัดไป — อยู่ครบ `2` เทิร์นเต็มและ `thief_b4 ★ Counter` ไม่ทำลาย `Shroud`!)**: ระหว่างอยู่ใน `Shroud` ได้ **`+25%` FLEE (multiplicative)**, **`+15% skillCrit`**, และ **`+25% Crit Damage` (★)** · ตั้ง `this.raidReady = true`: **การโจมตีแอคทีฟครั้งแรกหลังร่าย (`Basic` / `แทงพิษ` / `Back Stab` / `เงาพริ้ว`)** จะฟาดโบนัสฮิต **Sightless Raid (`+1.2x P.ATK × (1 + st.pskill)`, `src = 'other'`, ใช้ `st.crit`)** พร้อมแปะ **`Exposed (+20% dmg taken, 2 เทิร์น)`** และ **`Blind (-20% monHit, 2 เทิร์น)`** โดย **คงสถานะ `Shroud` ไว้จนครบเทิร์น** | **`ควันหอม`**: **เฉพาะเมื่อ `s2Lv > 0` (`if (lv > 0)`)**: คืน Energy `10 + round(lv * 5)` (`10..25`) + ฮีล `lv * 3%` Max HP (`0..9%`, คง `S2N.smokeHeal(lv)` เดิม!) | **`ควันหนา`**: ได้หลบแน่นอน `2` ครั้ง · `Exposed` เพิ่มเป็น **`+30%` ดาเมจ** · ระหว่าง `Shroud` ได้ **`+25%` Crit Damage** (ใช้ได้ทั้ง `Back Stab` และ `เงาพริ้ว`/`Basic` ใน 2 เทิร์นนั้น!) | `Blind` ลด `monHit` ของท่าปกติมอน (`BattleScene.ts:4423`); ไม่ลดท่า `monHit = 999` ของบอส แต่ **`Exposed (+20/30%)`, `Shroud`, `Sightless Raid (1.2x)` และ `dodgeCharges` ทำงานเต็ม 100% กับบอส** |
| **2-2 `th_pick` ล้วงกระเป๋า** *(GP Q + RO Snatch)* | `30` Energy / `CD 3` | แทงตัวหน้า **`1.3x` P.ATK** (`× (1 + st.pskill)`) โดยนับเป็น **On-Hit Basic Strike** (ตั้ง `critRateFor` ใช้ **`100% st.crit`** แทนสูตร `skill` ที่ cap 0.6, ตั้ง `lsMul = 1`, ทริกเกอร์ `D.Strike`, `เคลือบพิษอาบคม`, และการ์ด `procs('basic')` เทียบเท่า 1 สวิง!) + คืน Energy `15` + ปล้นโบนัส Zeny **`+8 + floor(DEX / 10)`** (สูงสุด `1` ครั้ง/มอน 1 ตัว) | **`มือไว`**: คืน Energy `15 + lv * 5` (`15..30`, คง `S2N.pickRes(lv)` เดิม) | **`จอมโจร`**: แทงแรงขึ้น `1.3x → 1.9x` + ติดพิษ `3` stack (`S2N.pickPoison`) + **Plunder:** เมื่อฆ่ามอนได้ (หรือตีบอสด้วย `ล้วงกระเป๋า`) ได้ Energy `+10` และเพิ่มโอกาส Drop/Chest `+5%/stack` (**จำกัด cap `+15%` (`3` stack) ต่อ 1 เวฟ**) | สาย **Tempo + On-Hit + Economy** ที่คงที่ที่สุด; ให้ดาเมจ 10 เทิร์นห่าง `2-1` และ `2-3` ไม่เกิน `10%` พร้อมช่วยจ่าย Energy ให้ `Back Stab` / `แทงพิษ` |
| **2-3 `th_wound` แผลลึก** *(Talon P + Crimson Dance + Hades)* | `35` Energy / `CD 3` | แทงตัวหน้า `1.2x` P.ATK (`× (1 + st.pskill)`, **`pierce = 1`** ทะลุ P.DEF 100%) + ติดพิษ `4` stack + แปะ **`Wound` `2` stack** (max `6`, นาน `3` เทิร์นฮีโร่ — **รีเฟรชกลับเป็น `3` เทิร์นทุกครั้งที่แปะเพิ่ม** และ `toxicSkin` ไม่เร่งลด `Wound`)<br>• **Blade's End:** เมื่อ `Basic`, `D.Strike`, หรือ `Back Stab` ตีโดนเป้าที่มี `Wound ≥ 3` จะจุดชนวนใช้ 3 stack (`1 ครั้ง/เทิร์น/เป้า`) ระเบิด **`1.8x P.ATK × (1 + pskill)` (`pierce = 1`, `src = 'other'`, `lsMul = 0`)** + แปะ **`m.woundHealCut = 0.40` นาน `2` เทิร์น** (`healCut(m)` คืน `Math.max(existing, m.woundHealCut > 0 ? 0.40 : 0)`)<br>• **Privileged Status (`th_wound`):** มอนที่ติดทั้ง **Poison (`≥ 1`) และ Wound (`≥ 1`)** โดนดาเมจจาก Poison, Wound, Basic, และ Skill แรงขึ้น **`+12%`** *(ปรับจาก 20% เป็น 12% เพื่อสมดุลเทียบ 2-1/2-2!)* | **`แผลฉีก`**: พิษ `4 + round(lv)` (`4..7`, คง `S2N.woundPoison(lv)` เดิม) · เพดาน `Wound` เพิ่มเป็น `6 + floor(lv * 2 / 3)` (`8` ที่ `s2Lv=3`) · `D.Strike` มีโอกาส `50%` แปะ `+1 Wound` | **`แผลมรณะ`**: แทงแรง `1.2x → 2.0x` ทะลุ DEF · แปะ `Wound` **`3` stack ทันที** · ระเบิด *Blade's End* **คริได้** (ใช้ `st.crit`; หากติดคริจะไม่ซ้อนกับ `Perfect Agony`!) | ระเบิด `Blade's End` จำกัด `1/turn/target`; `แทงพิษ` อย่างเดียวไม่จุดชนวน *Blade's End* บังคับให้สลับ `Basic` / `Back Stab` |

---

### 2.5 Ult (`เงาพริ้ว`) — 3 สาย + สเกลจำนวนฮิตจาก `DEX` + Unified Ghost Shroud

#### กฎพื้นฐานและสูตร `DEX → จำนวนทีแทง`
- **Base `เงาพริ้ว`:** `CD 4` เทิร์น, `Cost 0` Energy, ตั้ง `dodgeCharges = max(dodgeCharges, 2 + st.ultDodge)` (และได้ `+1` **Ghost Shroud** หาก `maxShroud > 0`), แล้วแทงสุ่มเป้าหมายที่รอดชีวิต (ถ้าเหลือบอสตัวเดียว = เข้าบอสทุกฮิต!):
  $$\text{TotalHits} = 4 + \text{dexUltHits}(\text{DEX}) + \text{st.ultHits}$$
  $$\text{dexUltHits}(\text{DEX}) = \min\!\left(6,\; \left\lfloor \frac{\max(0,\; \text{DEX} - 1)}{15} \right\rfloor\right)$$
- **ดาเมจพื้นฐานต่อฮิต (เพิ่ม `(1 + st.pskill)` และปรับสมดุล `thUltAgi` vs `thUltDex`):**
  $$\text{HitMul} = 0.7 \times (1 + \text{ultPow}) \times (1 + \text{ultAmp}) \times (1 + \text{ult2Pow}) \times (1 + \text{thUltAgi} + \text{thUltDex}) \times (1 + \text{pskill})$$
  โดย **`thUltAgi = 0.01 * (AGI - 1)`** (ลดจาก `0.02` เพื่อตัด Spike ที่ทำให้ Classic+Ult แซงสายอื่น `2.6x`) และ **`thUltDex = 0.012 * max(0, DEX - 1)`** (เพิ่มจาก `0.008` เพื่อดันสาย DEX เข้ากรอบ `0.54x–0.74x`!)

#### กฎรวม `Ghost Shroud` (Canonical Formula — ใช้ร่วมกันทั้ง §2.5, `thief_b2`, `th_t1a`, `th_t3c`, `rg_t4_leech`)
1. **เพดาน Shroud (`maxShroud`):** หากมีแหล่ง Shroud ใดๆ (`thief_b2`, `th_t1a`, `th_t3c`, หรือ `rg_t4_leech`) `> 0`, ค่าฐาน **`maxShroud = 1 + st.thGhostShroud`** (สูงสุด **`4`** ชาร์จเมื่อ `thief_b2` Lv5).
2. **การสะสม:** ได้ `+1` เมื่อกด `เงาพริ้ว`/`พายุมีด`, `+1` ทุก `2` เทิร์นฮีโร่ (เมื่อ `thief_b2 > 0`), `+1 | +2` ต้นเวฟ (`th_t1a`), `+1` เมื่อฆ่ามอน (`rg_t4_leech`).
3. **จังหวะทำงาน (`BattleScene.ts:4402-4421` `hurtHeroCore()`):**
   - `dodgeCharges > 0` ทำงานก่อนเสมอ (ไม่เสีย `Ghost Shroud`).
   - เมื่อ `dodgeCharges === 0` และฮีโร่ **กำลังจะโดนโจมตี** (ไม่ว่าจะผ่าน `EVADE!`/`LUCKY!` ไม่ติด, หรือเป็นท่า `trueSight` / `monHit >= 999` / `hx.web`): หาก `this.ghostShroud > 0` ให้ **ใช้ `1` Ghost Shroud ทันที ก่อนคำนวณ `raw` damage**:
     - สร้าง **Shadow Shield** ผ่าน `this.addShield(...)` ขนาด:
       $$\text{ShadowShield} = \min\!\left(0.20 \times \text{st.maxHp},\; (0.15 + \text{st.thShroudFleeRatio} + \text{st.thUltShroudRatio}) \times \text{st.flee}\right)$$
       *(ฐาน `15%` + `thief_b2` สูงสุด `+15%` + `th_t3c` สูงสุด `+10%` = สูงสุด `40% FLEE`, cap `20% Max HP`)* → โล่นี้จะซับดาเมจของท่า `trueSight`/`monHit 999` ที่กำลังพุ่งเข้ามาทันที!
     - เรียก helper **`onShroudBreak(src)`** แยกต่างหากจาก `dodged()` (`BattleScene.ts:4402`) เพื่อทริกเกอร์ `dodgeHeal` (`thief_b2`), `thief_b4 ★` (`เงาสวน` `0.8x` ไม่ทำลาย `Shroud`), `th_t1a` FLEE, และ `th_t2a`/`thief_b3` **โดยไม่เพิ่มตัวนับ `src.evaded`** (เพราะ Shroud แตกไม่ใช่การหลบ จึงไม่เร่งให้บอสเปิด `trueSight`!)

#### กฎเฉพาะของ 3 สไตล์ Ult + สูตรรวม On-Hit (`thief_u2` + `th_t3b` + `thief_u4 ★`)
1. **สาย A — `เงาสังหาร` (Crit Execution):** ใช้ `effCrit = min(0.75, st.skillCrit + st.crit * 0.75 + condCrit)`; คริใส่ `<35% HP` แรงตาม `thExecUlt`, คืน Energy `thUltCritRes` ต่อคริ (cap `+24`/Ult).
2. **สาย B — `คมมีดประสาน` (On-Hit Branch — Gangplank Q / Katarina R Style):**
   - **สูตรรวม `eff` เพียงสูตรเดียว (`eff ∈ [0.40, 0.55]`, Hard Cap `0.55`):**
     ```ts
     const hasOnHit = st.thUltOnHit > 0 || st.thUltOnHitTal > 0 || st.thUltOnHitStar > 0
     const baseEff = st.thUltOnHit > 0
       ? 0.38 + st.thUltOnHit + (st.thUltOnHitTal > 0 ? (st.thUltOnHitTal >= 0.5 ? 0.05 : 0.03) : 0)
       : st.thUltOnHitTal
     const eff = hasOnHit ? Math.min(0.55, baseEff + st.thUltOnHitStar) : 0
     ```
     - `thief_u2` เดี่ยวๆ (`0.04 * lv`): `40.4%` (Lv1) .. `50.0%` (Lv5)
     - `th_t3b` เดี่ยวๆ: `40%` (R1) | `50%` (R2)
     - `thief_u2` Lv5 + `thief_u4 ★` (+`5%`): `55.0%` (cap!)
     - `thief_u2` Lv5 + `th_t3b` R2 + `thief_u4 ★`: `55.0%` (Hard Cap `0.55`!)
   - **กฎ On-Hit ระดับฮิต:** ใช้ `min(1.0, st.crit)` โดยตรง, ฮีล `st.lifesteal * eff`, ทริกเกอร์ `D.Strike` โอกาส `doubleAtkChance(st.doubleAtk) * eff` (**max `2` ครั้ง/Ult**), แปะพิษ `max(1, floor(st.poison * eff))` ผ่าน `poisonMul = eff` ที่ `BattleScene.ts:1273` (ใช้ `Math.floor` เสมอสำหรับสัดส่วนพิษ), โอกาส `eff` แปะ `+1 Wound` (ถ้ามี `th_wound`), `procs('basic')` สูงสุด `1` ครั้ง/เป้าหมาย/Ult, และ `j2KnifeCrit` สูงสุด `2` มีด/Ult.
3. **สาย C — `เงาหมอกลวงตา` (Ghost Dance):** ขับเคลื่อนผ่านระบบ **Ghost Shroud** ที่นิยามไว้ด้านบน

#### โหนดใน Web ฝั่ง Ult (`thief_b` และ `thief_u`)
| Branch | ID | Tier (Max) | ชื่อ | กลไก, เงื่อนไข & สูตรตัวเลข (ต่อ Old Lv `1..3` → ยืด `1..5`) | `Stats` Keys & `INT_FIELDS` |
|---|---|---|---|---|---|
| `thief_b` | `thief_b1` | T1 (3→5) | **ย่องเบาในเงา** | เมื่อหลบได้ (นาน `2` เทิร์นมอน) หรือระหว่าง `Shroud`/`dodgeCharges > 0`: `FLEE +(6 * lv)` (`+3.6..+18` — ข้อความ `desc` แสดงผลปัดเป็นจำนวนเต็ม `+4..+18`), **`thShadowFloor: 0.02 * lv` ลด `fleeFloor` แบบมีเงื่อนไข** (`-1.2%..-6%`, รวมกับ `fleeFloor`/`thMistFloor` cap ที่ `0.20`), และลดดาเมจจากท่าข้าม Flee (`trueSight`/`monHit >= 999`) `-4%*lv` (`-2.4%..-12%`) | `thShadowFlee: 6 * lv`, `thShadowFloor: 0.02 * lv`, `thTrueDr: 0.04 * lv` |
| `thief_b` | `thief_b2` | T2 (3→5) | **หายใจในเงา (Ghost Dance)** | Ghost Shroud สูงสุด `+lv` ชาร์จ (`+1, +1, +2, +2, +3` → รวมฐาน `1` เป็น `2..4` ชาร์จ) · เมื่อหลบได้หรือ Shroud แตก: ฟื้น `Math.round(2 * lv)%` Max HP (`1.2%..6%`, cap `dodgeHeal 10%`) และเพิ่มตัวคูณ Shadow Shield `+Math.round(5 * lv)% FLEE` (`+3%..+15%` รวมฐาน `15%` = `18%..30% FLEE`, cap `20% Max HP`) · *ข้อความ `desc` ใช้จำนวนเต็มทั้งหมด!* | `thGhostShroud: lv` (**`INT_FIELDS`**), `dodgeHeal: 0.02 * lv`, `thShroudFleeRatio: 0.05 * lv` |
| `thief_b` | `thief_b3` | T3 (3→5) | **เงาวนลูป** | เมื่อหลบได้ (รวม Shroud แตก): มีโอกาส **`min(1, lv / 3)`** (`20%, 40%, 60%, 80%, 100%`) ลด CD `เงาพริ้ว` `-1` เทิร์น (นับรวมใน Global Ult CD Cap `-2/turn`) และทำให้การโจมตีถัดไปได้ `crit +(6 * lv)%` (`+3.6%..+18%`) | `thDodgeUltCd: Math.min(1, lv / 3)`, `thDodgeNextCrit: 0.06 * lv` |
| `thief_b` | `thief_b4` ★ | T4 (1) | **เงาสวน** | ทุกครั้งที่หลบสำเร็จ หรือ Ghost Shroud แตก: แทงสวน `0.8x P.ATK` ทันที (ติดพิษ `st.poison` + `1 Wound` ถ้ามี `th_wound`; **ไม่ทำลาย `Shroud` ของ `2-1`**) · หากเป้าติด `Exposed` แรงขึ้นเป็น `1.1x` | `dodgeStrike: 1`, `thCounterExposed: 1` |
| `thief_u` | `thief_u1` | T1 (3→5) | **เงาจุดตาย** | `เงาพริ้ว` ได้ `skillCrit +5%*lv` (`+3%..+15%`) และรับ `75%` ของ `st.crit` (แทน `50%`) · ต่อดีบัฟแต่ละชนิดบนเป้า (`Poison`/`Wound`/`Exposed`/`Chill`) ได้ `critMul +10%*lv` (`+6%..+30%`/ชนิด) | `thUltCrit: 0.05 * lv`, `thUltCondCritDmg: 0.10 * lv` |
| `thief_u` | `thief_u2` | T2 (3→5) | **เงาประสานอาวุธ (On-Hit)** | เปิดใช้ On-Hit Strike สำหรับ `เงาพริ้ว`: ประสิทธิภาพ `eff = 0.38 + thUltOnHit` (`40.4%, 42.8%, 45.2%, 47.6%, 50.0%` ที่ Lv 1..5, ใช้ `100% st.crit`, ทริกเกอร์ `lifesteal`/`D.Strike`/พิษ ตามกฎ On-Hit) | `thUltOnHit: 0.04 * lv` |
| `thief_u` | `thief_u3` | T3 (3→5) | **เพชฌฆาตเงา** | คริของ `เงาพริ้ว` (และ Basic) ใส่เป้า `HP < 35%` แรงขึ้น `+Math.round(17 * lv)%` (`+10%..+51%`) · และคริระหว่าง `เงาพริ้ว` คืน Energy `+2 * lv` (`1, 2, 4, 5, 6`/คริ, cap `+24`/Ult) · *ข้อความ `desc` ใช้ `%` จำนวนเต็มไม่มีทศนิยม!* | `thExecUlt: 0.17 * lv`, `thUltCritRes: 2 * lv` (**`INT_FIELDS`**) |
| `thief_u` | `thief_u4` ★ | T4 (1) | **เงาพันคม** | เพิ่ม `eff` ของ `เงาพริ้ว` On-Hit อีก `+5%` (`thUltOnHitStar: 0.05`, cap `0.55`) · และหาก `เงาพริ้ว` คริ `≥ 3` ครั้งในการร่าย จะแทงปิดท้ายเพิ่ม **`+1` ฮิตที่ `1.4x` สูตรฐาน `เงาพริ้ว`** (`1.4 × (1+ultPow) × (1+ultAmp) × (1+ult2Pow) × (1+thUltAgi+thUltDex) × (1+pskill)`, **`forceCrit = true`**, ไม่ทริกเกอร์ On-Hit/`D.Strike` ซ้ำ) | `thUltOnHitStar: 0.05`, `thUltFinisher: 1` |

---

### 2.6 `thief_core` — Conditional Crit & Conditional Blood (แทน `thief_crit` + `thief_blood` เดิม)

ไม่มีโหนดบวก `crit`/`critMul`/`lifesteal` แบบไร้เงื่อนไขอีกต่อไป ทุกโหนดในคอลัมน์ 7 (`thief_core`) ทำงานเมื่อเข้าเงื่อนไขเท่านั้น และมี `Stats` key ชัดเจน:

| ID | Tier (Max) | ชื่อ | เงื่อนไข & สูตรตัวเลข (ต่อ Old Lv `1..3` → ยืด `1..5`) | `Stats` Keys |
|---|---|---|---|---|
| `thief_c1` | T1 (3→5) | **คมเลือดซ้อนสถานะ** | ได้ `thCondLeech = +3%*lv` (`+1.8%..+9%`) **เฉพาะเมื่อ** ตีศัตรูที่ติดสถานะ (`Poison`, `Wound`, `Exposed`, หรือ `Chill`) **อย่างน้อย 1 ชนิด** (คูณ **`×1.5`** = สูงสุด `+13.5%` ถ้าติด `≥ 2` ชนิด) · รวมกับ `st.lifesteal` แล้ว clamp ที่ `0.40`; ใช้ `lsMul` ปกติ (`1.0` Basic/Combo, `0.33` `D.Strike`, `0` Skills) · **ไม่มีผลกับเป้าสะอาด** | `thCondLeech: 0.03 * lv` |
| `thief_c2` | T2 (3→5) | **จุดตายสะสม (Splitting Headache)** | ได้ **`+0.625%*lv` (`0.38%..1.88%` — ใช้ `.toFixed(2)` ใน `desc(lv)` เพื่อรักษารูปทศนิยม 2 ตำแหน่งภายใต้ `tidy(..., false)`!) `crit` และ `skillCrit` ต่อทุกๆ `1` stack พิษ/แผลฉีกบนเป้า** (`cap 8 stack` = **`+3%, +6%, +9%, +12%, +15%`** ที่ Lv 1..5 แม่นยำ!) · และทุกคริจาก Basic/Skill แปะพิษเพิ่ม `+1` stack | `thStackCrit: 0.00625 * lv`, `thCritPoison: 1` (เมื่อ `thStackCrit > 0`) |
| `thief_c3` | T3 (3→5) | **กระหายเลือด (Noxious Strike)** | เมื่อฆ่ามอน: ฟื้น `4%*lv` (`+2.4%..+12%`) Max HP + `+10` Energy **+ ฟื้นเพิ่ม `0.5%` Max HP ต่อ stack พิษบนมอนที่ตาย** (ส่วนโบนัสจำกัด `+12%`) · เมื่อคริใส่ **Boss/Mini** (`1` ครั้ง/เทิร์น): ฟื้น `0.375 × thKillLeech` (`1.5%*lv` = `+0.9%..+4.5%`) Max HP + `+8` Energy · *(ใช้ `thKillLeech` แยกจาก `st.killHeal` เดิมเพื่อไม่ให้กระทบ Mobster!)* | `thKillLeech: 0.04 * lv` |
| `thief_c4` ★ | T4 (1) | **ราชันย์โลหิต** | เมื่อ **`HP < 45%` หรือ อยู่ใน `Shroud`**: ผลดูดเลือด (`lifesteal` + `thCondLeech`) และ `เลือดพิษ` แรง **`×1.75`** (แทนที่และไม่ซ้อนทับ `bloodKing ×2` จากไอเทม/การ์ดเก่า, โดย `เลือดพิษ` ยังถูกคุมด้วยเพดาน `25% Max HP/turn`), และ `D.Strike` `lsMul` เพิ่มจาก `0.33 → 0.66` | `thBloodKing: 1` |

---

### 2.7 Thief 4-Row Talents (`th_t1`–`th_t4`: 4 แถว × 3 ตัวเลือก, ไม่มี Flat-Stat Filler)

| Row (Job Lv) | ID | ชื่อ | Max | Rank 1 → Rank 2 (เงื่อนไข, `Stats` Keys & สูตรชัดเจน) | Trade-off / หมายเหตุ |
|---|---|---|---|---|---|
| **Row 1 (Lv 5)** | `th_t1a` | **ก้าวเงา** | 2 | เริ่มทุกเวฟได้ Ghost Shroud `1 \| 2` ชาร์จ (เปิด `maxShroud >= 1`, cap ตาม `1 + thGhostShroud`) · หลังหลบได้ (`EVADE!`/`LUCKY!`/`dodgeCharges`/Shroud) รับ **`FLEE +12 \| +20`** นาน `2` เทิร์นฮีโร่ (Refresh, ไม่ซ้อน) (`thWaveShroud: 1\|2`, `thDodgeFlee: 12\|20`) | สายหลบยืนระยะ |
| **Row 1 (Lv 5)** | `th_t1b` | **เปิดฉากซุ่มโจมตี** | 2 | เริ่มทุกเวฟได้หลบแน่นอน `1 \| 2` ครั้ง (`waveDodge: 1\|2`) · และฮิตแรกของทุกเวฟ **การันตีคริ 100%** (Rank 2: ฮิตแรกแรงขึ้นอีก `+25%`, `thWaveOpenCrit: 1\|1.25`) | สายปิดเวฟไว / ระเบิดเปิดเกม |
| **Row 1 (Lv 5)** | `th_t1c` | **กายต้านพิษ** | 2 | ขณะมีศัตรูติด `Poison > 0` หรือ `Wound > 0` บนสนาม: ได้ `tenacity +8 \| +14%` และ Max HP ชั่วคราว `+8 \| +14` ต่อ stack พิษ/แผลฉีกบนสนาม (cap `+160 \| +280 HP`, คำนวณแบบ dynamic ไม่แก้ HP จริงเกิน maxHpCap) (`thCondTenacity: 0.08\|0.14`, `thStackHp: 8\|14`) | สายแทงค์พิษ/WIS |
| **Row 2 (Lv 10)** | `th_t2a` | **ขโมยจังหวะ** | 2 | เมื่อหลบได้: ฟื้น Energy `+15 \| +25` (`dodgeEnergy: 15\|25`) และลด CD `Skill 2` หรือ `Ult` ลง `1` เทิร์น (ICD `3 \| 2` เทิร์นฮีโร่; นับรวมใน Global Ult CD Cap `-2/turn`) (`thDodgeCdIcd: 3\|2`) | ขับเคลื่อนสกิลด้วยจังหวะหลบ |
| **Row 2 (Lv 10)** | `th_t2b` | **จุดบอดซ้อนพิษ** | 2 | ได้ `crit` และ `skillCrit` `+1.0 \| +1.6%` ต่อ stack พิษ/แผลฉีกบนเป้า (cap `+14 \| +22%` ที่ `14` stack) · และฮิตเวท (`thief_v1`/`v2`) ใส่เป้าที่ติด `Exposed` เจาะ **M.DEF (`magPen`) เพิ่ม `+10 \| +18%`** (cap `0.75`) (`thStackCritTal: 0.01\|0.016`, `thExposedMagPen: 0.10\|0.18`) | แทน `th_t2b` เดิม; ช่วยทั้งกายภาพคริและสาย INT เวท |
| **Row 2 (Lv 10)** | `th_t2c` | **จังหวะสลับมีด** | 2 | หลังร่าย `แทงพิษ`: `Basic Attack` ครั้งถัดไปแรงขึ้น **`+25 \| +40%`** (`basicDmg` bracket ทุกฮิตในสวิงนั้น) และคืน Energy **`+10 \| +16`** (`thWeaveDmg: 0.25\|0.40`, `thWeaveRes: 10\|16`) | แทน `autoCostCut` เดิม แก้ปัญหา Auto-spam! |
| **Row 3 (Lv 20)** | `th_t3a` | **เงาพริ้ว: เงาสังหาร** | 2 | `เงาพริ้ว` ได้ `skillCrit +12 \| +20%` และ Crit Dmg `+35 \| +60%` เมื่อเป้ามี `<50% HP` หรือ `≥ 2` ดีบัฟ · **Trade-off:** `ultDodge: -1` เพื่อเพิ่ม **`+1` ฮิตปิดท้าย**: Rank 1 แรง **`0.9x`**, Rank 2 แรง **`1.4x`** สูตรฐาน Ult (ถ้าเป้า `<35% HP` ที่ Rank 2 = `forceCrit = true`) (`thUltExecCrit: 0.12\|0.20`, `thUltExecDmg: 0.35\|0.60`, `thUltKillFinisher: 0.9\|1.4`, `ultDodge: -1`) | สาย Crit Execution |
| **Row 3 (Lv 20)** | `th_t3b` | **เงาพริ้ว: คมมีดประสาน** | 2 | `เงาพริ้ว` แทงเพิ่ม `+1 \| +2` ฮิต (`ultHits: 1\|2`) และเปิดใช้ On-Hit Strike ที่ **`eff = 40 \| 50%`** (หรือบวก `+3 \| +5%` ให้ `thief_u2`, **Hard Cap `0.55`** ตามสูตร §2.5) (`thUltOnHitTal: 0.40\|0.50`) | สาย On-Hit GP Q / Katarina R |
| **Row 3 (Lv 20)** | `th_t3c` | **เงาพริ้ว: เงาหมอกลวงตา** | 2 | `เงาพริ้ว` ได้หลบแน่นอน `+1 \| +2` ครั้ง (`ultDodge: 1\|2`), แปะพิษ `+2 \| +3` stack ต่อฮิต (`ultPoison: 2\|3`), เพิ่มอัตรา Shadow Shield ของ Shroud **`+5 \| +10% FLEE`** และเมื่อ `dodgeCharges` หลบได้สร้างโล่ `min(0.20*maxHp, (0.10\|0.20) * st.flee)` (ICD 1/เทิร์นมอน) (`thUltShroudRatio: 0.05\|0.10`) | สาย Ghost Dance / พิษล้วน |
| **Row 4 (Lv 30)** | `th_t4a` | **สถานะทับซ้อน (Privileged Status)** | 2 | ศัตรูที่มีพิษ `≥ 8` stack **หรือ** ติดดีบัฟต่างชนิด `≥ 2` อย่าง (Poison, Wound, Exposed, StabMark, Chill, Blind, ArmorBrk, Weak) รับดาเมจทุกชนิด **`+18 \| +30%`** (รวม Poison/Venom Melt — เป็น Keystone หลักของสาย `WIS`!) (`thPrivileged: 0.18\|0.30`) | สาย Multi-Status & Boss Melter (`WIS` หลัก) |
| **Row 4 (Lv 30)** | `th_t4b` | **วิถีพิษคริ (Perfect Agony)** | 2 | โบนัส `critMul` ที่เกิน `1.4x` (คูณ `50 \| 80%`) **รวมกับโบนัส `WIS >= 40`: `+min(0.55, 0.0045 * (WIS - 1))`** ถูกนำมาคูณดาเมจพิษติ๊ก (รวม `Toxic Seep`) และ DoT/ระเบิดที่ **ไม่คริ** โดยมี **Hard Cap โบนัส `+100%` (`min(1.00, max(0, st.critMul - 1.4) * rate + paWis)`)** · *(หาก `ระเบิดสารพิษ★` หรือ `Blade's End★` ติดคริ จะใช้ `critMul` ปกติและข้าม Perfect Agony ไม่ให้เบิ้ล)* · **Trade-off:** ฮิตที่ **ไม่คริ** (Basic/Skill/Knives) เบาลง **`-15%`** (`thPerfectAgony: 0.50\|0.80`) | แปลง Crit Dmg + `WIS` เป็น DoT Multi (Cap +100% ชัดเจน!) |
| **Row 4 (Lv 30)** | `th_t4c` | **ร่างเงาลวงตา (Mistwalker)** | 2 | เมื่ออยู่ใน `Shroud` หรือหลังหลบ (`2` เทิร์นมอน): `fleeFloor -6 \| -10%` (cap `-20%`) · และเมื่อโดนท่า `trueSight`/`monHit >= 999` ลดดาเมจเข้า **`-15 \| -25%`** + สะท้อนพิษ `2` stack (`thMistDr: 0.15\|0.25`, `thMistFloor: 0.06\|0.10`) | กันบอส Hard Mode `trueSight` |

---

## 3) Rogue (โร้ก — Class 2) Rework ฉบับเต็ม

### 3.1 Base Stats, Mastery & Signature (`JOB2.rogue`)

- **`JOB2_BONUS_STATS.rogue`:** `['agi', 'str', 'dex']` (`+1` ต่อ 10 Job2 Lv; สูงสุด +5 อย่างละตัวที่ Job2 Lv 50).
- **`JOB2.rogue.mod`:** `{ combo: 0.05, j2DaggerMark: 1 }` *(เปิดระบบ Dagger Marks ตั้งแต่วินาทีแรกที่เปลี่ยนอาชีพ)*.
- **Weapon Mastery (`ชำนาญมีดคู่`, `wtype === 'dagger'`):**
  - ถือมีดมือหลัก: `atkPct: +5%`, **`skillCrit: +5%`** (อัปเดตใน `skill-registry.ts` จาก `mastery.crit` เป็น `mastery.skillCrit`).
  - **Dual-Dagger Synergy (`dualKnife`: มือรองเป็น `dagger`):**
    - `มีดบิน` ออกเพิ่ม `+1` เล่มทุกชุดคอมโบ (`KIT2.rogue.dualKnife = 1`, คง `INT` 1 เล่ม).
    - เมื่อบริโภค **Dagger Mark** ด้วย `Voracity Pickup` ขณะถือมีดคู่: ฟาด **Twin-Blade Voracity** เพิ่ม **`+0.25x P.ATK × (1 + st.pskill)` คงที่ (1 ครั้งต่อการ Pickup, ไม่ใช่ต่อ 1 Mark)** และมีโอกาส `50%` ที่จะกระดอน *Grounded Dagger* ปักมอนตัวอื่น (`1` stack) — **หากสู้กับ Boss ตัวเดียวบนสนาม จะปักคืนลงบนตัว Boss นั้น `1` stack แทน**!

---

### 3.2 Signature Passive: `มีดบิน & ตราคมมีด (Flying Knives & Voracity Loop)`

1. **การปามีด (`throwKnives`):**
   - ทุกฮิตของ **Combo** (และฮิตคริเมื่อมี `rg_x4 ★`) ปา `มีดบิน` จำนวน `1 + (dualKnife ? 1 : 0) + st.j2KnifeAdd` เล่ม ใส่ศัตรูแบบสุ่ม (โอกาส `30%` โฟกัสเป้าที่มี Mark น้อยกว่า 3 เพื่อกระจาย Mark).
   - ดาเมจต่อเล่ม: `(0.40 + st.j2KnifeMul) × P.ATK × (1 + st.pskill * 0.5)` · ใช้ `st.crit`, แปะ `st.poison`, `lifesteal = 0` (ยกเว้น `rg_x3`).
2. **Dagger Mark (`ตราคมมีด` — สูงสุด `3` stack/ตัว + `j2RgMarkCap`, นาน `2` เทิร์นมอน, รีเฟรชเมื่อปักเพิ่ม):**
   - ทุก `มีดบิน` ที่โดนเป้า ปัก `1` **Dagger Mark**.
   - **จังหวะเก็บมีด (`Voracity Pickup`):** เมื่อฮีโร่โจมตีเป้าที่มี `Dagger Mark` ด้วย **Basic Attack (ทำงาน `1` ครั้งต่อ 1 `basicOnce` หลังฮิตแรก ไม่เบิ้ลบนฮิต 2 ของ Thief Basic), `แทงพิษ`, หรือ `Back Stab`** (รวมทั้งเมื่อฮิตนั้นฆ่าเป้าตาย — ให้เก็บ Mark **ก่อน** `killMon` ทำงาน!):
     - ระเบิดวงสวิงรอบตัว **Sinister Steel**: เป้าหลักโดน `0.35x P.ATK × marks × (1 + pskill)` + มอนตัวอื่นโดน `60%` ของวงสวิง (`src = 'other'`, ใช้ `st.crit`, **ตั้ง `poisonMul = 0` ชั่วคราวระหว่างสวิงนี้เพื่อไม่ให้ `BattleScene.ts:1273` แปะ `st.poison` ท่วมทั้งกระดาน**).
     - ฟื้น **`+6` Energy ต่อ Mark** ที่เก็บได้.
     - หากเก็บ **`≥ 2` Marks**: ลดคูลดาวน์ **`Back Stab` `-1` เทิร์น** (`ICD 1` ครั้ง/เทิร์นฮีโร่).
3. **Kill Reset (`Voracity` — Global Guard 1/Turn):**
   - เมื่อฆ่ามอนด้วย `มีดบิน` หรือฆ่ามอนที่ติด `Dagger Mark` (จำกัด **`1` ครั้ง/เทิร์นฮีโร่** ทั้งก้อนด้วย flag `voracityKillUsed` เพื่อกัน Kill-Chain ไร้สิ้นสุด!): ลด CD `Back Stab` `-1` เทิร์น + ลด CD `พายุมีด` `-1` เทิร์น (นับใน Global Ult CD Cap `-2/turn`) **และ** ปา `2` `มีดบิน` ฟรีใส่ตัวที่ HP ต่ำสุด!

---

### 3.3 Skill 3 (`Back Stab`) & Sub-Nodes (`rogue_s3`, Tier 1–3)

- **Active Skill 3 (`Back Stab`):** Cost `30` Energy, CD `3` เทิร์น (ร่ายอัตโนมัติต้นเทิร์นใน `skill3Turn()`).
- **กลไกพื้นฐาน:**
  - **Target Priority:** เล็งมอนที่มี **Dagger Mark สูงสุด** (เท่ากันเล็งตัวที่ HP สูงสุด).
  - **RO Back Stab:** **`sureHit = true`**, ข้าม Flee และ **ข้าม `m.def.luckyDodge` (`BattleScene.ts:1238` เพิ่ม `!this.sureHit`)**, **`forceCrit = true`** (ข้าม P.DEF 100%).
  - **Damage:** `2.2x P.ATK × (1 + s3Pow) × (1 + st.pskill)` (คูณ `critMul`), เก็บ `Dagger Mark` และแปะ **`Backstab Mark` (`m.stabMark`: `+15%` crit/backstab/basic dmg taken, 2 เทิร์น)** + **`Strip Armor` (`m.stripped`: `-20%` P.DEF, 2 เทิร์น)**.
  - **Shadow Ambush Bonus:** หากใช้ขณะอยู่ใน **`Shroud`** (`shroudTurns > 0`) หรือหลัง **Dodge** ในเทิร์นก่อนหน้า (`dodgedLastTurn`) → แรงขึ้น **`×1.25`** และคืน `15` Energy!

#### `rogue_s3` Sub-Nodes (`web-tier2.ts` คอลัมน์ 0, `tier 1..3` ใต้ `rogue_s3p`)
| ID | Tier (Max) | ชื่อ | กลไก, เงื่อนไข & สูตรตัวเลข (ต่อ Old Lv `1..3` → ยืด `1..5`) | `Stats` Keys & `INT_FIELDS` |
|---|---|---|---|---|
| `rg_s1` | T1 (3→5) | **ฉีกเกราะ (Divest Armor)** | `Strip Armor` ลด P.DEF เพิ่มเป็น `-(20 + Math.round(6 * lv))%` (`-24%..-38%`) + **DEX Scaling:** ลดเพิ่มอีก `min(10%, Math.floor((DEX - 1) / 5) * 1%)` (`1%` ต่อ `5 DEX`, เพดานรวม `-48%`) และขโมย Energy `+4 * lv` (`+2, +5, +7, +10, +12`) · *ข้อความ `desc` ใช้จำนวนเต็มทั้งหมด (`"ลดเพิ่ม 1% ต่อ 5 DEX"` ห้ามเขียน `"0.2%"` เพื่อไม่ให้ `tidy(s, true)` ปัดเป็น `0`!)* | `j2StabStrip: 0.06 * lv`, `j2StabEnergy: 4 * lv` (**`INT_FIELDS`**) |
| `rg_s2` | T2 (3→5) | **แทงแล้วพริ้ว** | *(ยืนยันใช้ `stretchNode()` `3 -> 5` + `INT_FIELDS` เท่านั้น ไม่มีทางแยก `NO_STRETCH`!)*<br>หลังใช้ `Back Stab` ได้ **`Shadow Step`** (`+Math.round(5 * lv)%` = **`+3%, +6%, +9%, +12%, +15%` multiplicative FLEE** ใน `hurtHeroCore()`, อยู่นาน `1` รอบจนเริ่มเทิร์นฮีโร่ถัดไป) และปา `มีดบิน` ซ้ำใส่เป้าเดิมทันที **`1 + Math.floor(lv / 2)`** เล่ม (`1, 1, 1, 2, 2` เล่มที่ Lv 1..5) · *ข้อความ `desc` ใช้ `%` จำนวนเต็ม!* | `j2StabStep: 0.05 * lv`, `j2StabKnives: 1 + Math.floor(lv / 2)` (**`INT_FIELDS`**) |
| `rg_s3` | T3 (3→5) | **ปิดฉากกลางหลัง** | เมื่อ `Back Stab` ใส่เป้าที่ติด `Dagger Mark` หรือ `Poison`/`Wound`: ดาเมจ `Sinister Steel` จากการเก็บ Mark แรงขึ้น `×(1 + 0.25 * lv)` (`×1.15..×1.75`) และ `Back Stab` แรงขึ้น `+8% * lv` (`+4.8%..+24%`) ต่อชนิดดีบัฟบนเป้า (cap `3` ชนิด = `+72%`) | `j2StabExec: 0.25 * lv`, `j2StabDebuffAmp: 0.08 * lv` |

---

### 3.4 Evolved Ult (`พายุมีด`) & Sub-Nodes (`rogue_u2`, Tier 1–3)

- **Evolved Ult (`พายุมีด`):** CD `4` เทิร์น, Cost `0` Energy (**Global Ult CD Reduction Cap:** รวมทุกแหล่งไม่เกิน **`-2` เทิร์น/เทิร์นฮีโร่** และ CD หลังกดร่ายห้ามต่ำกว่า `1` ในเทิร์นนั้น).
  1. เรียกใช้ `shadowDance(h2)` สืบทอดสาย `เงาพริ้ว`, `DEX` hit count, และ `th_t3` ครบทั้งหมด! *(ตั้ง `poisonMul` ตามกฎ On-Hit; สายที่ไม่ใช่ On-Hit ตั้ง `poisonMul = 0` ยกเว้น `ultPoison` จาก `th_t3c`)*.
  2. ตามด้วยโปรย **`8 + st.j2KnifeAdd + st.j2UltKnives + min(3, floor((DEX - 1) / 25))` `มีดบิน`** (ให้สาย `DEX` ได้มีดเสริมสูงสุด `+3` เล่มที่ `76 DEX` และ `rg_t2_ult` เพิ่มมีดเฉพาะ `พายุมีด` โดยไม่ปนกับคอมโบ!):
     - **แก้บั๊ก `j2KnifeMul` (`BattleScene.ts:2238`):**
       $$\text{UltKnifeMul} = (0.50 + 0.75 \times \text{st.j2KnifeMul}) \times (1 + \text{ultPow}) \times (1 + \text{ultAmp}) \times (1 + \text{ult2Pow})$$
     - มีดโปรยทั้งชุดใช้ `st.crit`, ปัก `Dagger Mark`, แปะพิษ **`max(1, floor(st.poison / 2))`** ต่อเล่ม (`poisonMul = 0.5` ใช้ `Math.floor` เสมอกับ §2.5), และไม่ทริกเกอร์ `D.Strike` ซ้ำ.

#### `rogue_u2` Sub-Nodes (`web-tier2.ts` คอลัมน์ 3, `tier 1..3` ใต้ `rogue_u2p`)
| ID | Tier (Max) | ชื่อ | กลไก, เงื่อนไข & สูตรตัวเลข (ต่อ Old Lv `1..3` → ยืด `1..5`) | `Stats` Keys |
|---|---|---|---|---|
| `rg_u1` | T1 (3→5) | **ตราความตาย (Death Mark)** | `พายุมีด` ประทับ **Death Mark** ใส่เป้าที่มี HP สูงสุด (เน้น Boss/Mini) นาน `2` เทิร์นฮีโร่: บันทึก **Net HP Damage จริง (`netHpDmg`)** จากทุกฮิต Rogue (`shadowDance`, มีดโปรย, `Basic`, `Combo`, `มีดบิน`, `Back Stab` — ไม่นับ DoT พิษ) · ระเบิดเมื่อครบ `2` เทิร์น **หรือ** เมื่อเป้า `HP < 15%` Max HP **หรือ** ทันทีก่อน `killMon(m)` หากตาย (ล้าง `m.deathMark = null` ก่อนระเบิด!) เป็น **Pure Pop** ที่ **`dot = true`** (ไม่ซ้ำ `vsPoison`/`Exposed`/`poisonAmp`), ทะลุ P.DEF `50%`, เท่ากับ **`(24% + 5%*lv + j2RgDeathMark)`** (`27%, 30%, 33%, 36%, 39%` ที่ Lv 1..5!) | `j2DeathMark: 0.05 * lv` (บวก `0.24` ใน `BattleScene` เมื่อ `> 0`) |
| `rg_u2` | T2 (3→5) | **พายุเก็บกวาด (Voracity Storm)** | เมื่อกด `พายุมีด` จะดูดบริโภค Dagger Marks ทั้งสนาม เพิ่มมีดโปรย `+1` เล่ม/Mark (cap `+6`) · และหากมีมอนตายระหว่าง `พายุมีด` มีโอกาส **`min(1, lv / 3)`** (`20%..100%`) ลด CD `พายุมีด` `-1` เทิร์น (นับใน Global Cap `-2/turn`) | `j2UltAbsorb: 1`, `j2UltKillCdChance: Math.min(1, lv / 3)` |
| `rg_u3` | T3 (3→5) | **พายุซ้อนเงา (Death Lotus)** | มีดโปรยทั้ง `8+` เล่มของ `พายุมีด` ได้ Crit Damage `+5%*lv` (`+3%..+15%`) ต่อ `1 dodgeCharge` ที่มี และดูดเลือด/แปะ Wound ที่ประสิทธิภาพ `10%*lv` (`6%..30%`) | `j2UltLotusCrit: 0.05 * lv`, `j2UltLotusEff: 0.10 * lv` |

---

### 3.5 ก้านสกิล Class 2 ทั้ง 3 สาย (`rg_k`, `rg_c`, `rg_x` — Zero Flat-Stat Filler)

| Branch | ID | Tier (Max) | ชื่อ | กลไก, เงื่อนไข & สูตรตัวเลข + `Stats` Keys |
|---|---|---|---|---|
| `rg_k` *(มีด)* | `rg_k1` | T1 (3→5) | **มีดคมปักลึก** | `มีดบิน` และ `พายุมีด` แรงขึ้น `j2KnifeMul +10%*lv` (`+6%..+30%`) · และเมื่อเก็บ **Dagger Mark** ฮิตนั้นได้ `crit +6%*lv` (`+3.6%..+18%`, `j2MarkCrit`) |
| `rg_k` *(มีด)* | `rg_k2` | T2 (3→5) | **มีดชิ่งสังหาร** | เมื่อ `มีดบิน` (ไม่ใช่มีดที่ชิ่งมาแล้ว — ตั้ง flag **`noRebounce = true`** กันลูปอนันต์!) ตีโดนเป้าที่มี `Dagger Mark ≥ 2` หรือฆ่าเป้าได้ มีดจะชิ่งไปตัวข้างเคียง `1` ตัวที่ความแรง **`(65% + j2KnifeBounce)`** (`71%, 77%, 83%, 89%, 95%` ที่ Lv 1..5, `j2KnifeBounce: 0.10 * lv`) |
| `rg_k` *(มีด)* | `rg_k3` | T3 (3→5) | **มีดอาบสถานะ** | `มีดบิน` มีโอกาส **`20%*lv` (`12%..60%`)** แปะ `+1 Wound` (ถ้ามี `th_wound`) **หรือ** ต่อเวลา `Exposed`/แปะ `+1` พิษหากเป้าติดพิษอยู่แล้ว (`j2KnifeStatus: 0.20 * lv`) |
| `rg_k` *(มีด)* | `rg_k4` ★ | T4 (1) | **ห่ามีดวนลูป** | `มีดบิน` `+1` เล่มทุกครั้ง (`j2KnifeAdd: 1` — **`INT_FIELDS`**) · การเก็บ **Dagger Mark** ลด CD `Skill 2` / `Skill 3` `-1` (1/เทิร์น) + ถ้าทั้งสนามไม่มี Mark ปาเปิดเทิร์นฟรี `1` เล่ม (`j2KnifeLoop: 1`) |
| `rg_c` *(คอมโบ)* | `rg_c1` | T1 (3→5) | **จังหวะเร่ง (One Step Ahead)** | `combo +3%*lv` (`+1.8%..+9%`) **และ** ทุกฮิตคอมโบมอบ `1` **Tempo** stack (`rgTempo: 0.04 * lv`, สูงสุด `5` stack/เวฟ = เพิ่ม **`heroSpeed()`** ใน `BattleScene.ts:677` สูงสุด `+12%..+60%` (Rev 4 แก้: `0.04×0.6×5 = 12%` ที่ Lv1) เพื่อให้ `previewQueue()` ตรง!) |
| `rg_c` *(คอมโบ)* | `rg_c2` | T2 (3→5) | **แทงรัวซ้ำแผล** | `comboDmg +5%*lv` (`+3%..+15%`) **และ** แรงขึ้นอีก `+4%*lv` (`+2.4%..+12%`) ต่อชนิดดีบัฟ/Dagger Mark บนเป้า (`j2ComboDebuff: 0.04 * lv`, cap `4` ชนิด) |
| `rg_c` *(คอมโบ)* | `rg_c3` | T3 (3→5) | **เงาพริ้วสลับร่าง** | ทุกๆ `3` ฮิตคอมโบมอบ `1` `dodgeCharges` (ICD `2` เทิร์น) **และ** เพิ่ม `FLEE +6*lv` (`+3.6..+18`) จนจบเทิร์นมอนถัดไป (`j2ComboDodge: 6 * lv`) |
| `rg_c` *(คอมโบ)* | `rg_c4` ★ | T4 (1) | **คอมโบไม่จบ & เงาเลียนแบบ** | `comboCount: 1` (**`INT_FIELDS`**) · เมื่อจบเชนคอมโบที่ `≥ 3` ฮิต เงา **Living Shadow** พุ่งแทง **`Back Stab` ซ้ำที่พลัง `45%`** (`forceCrit = true`, `lsMul = 0`, เก็บ Dagger Marks ที่เหลือ 1 ครั้ง, **ไม่ทริกเกอร์ `rg_t3_shadow`, `rg_s2`, `rg_x4 ★`, หรือ `combo` ซ้ำ**) (`j2LivingShadow: 1`) |
| `rg_x` *(คริ)* | `rg_x1` | T1 (3→5) | **จุดตายเป้าอ่อน (Ambush)** | ได้ `crit` และ `skillCrit` **`+4%*lv` (`+2.4%..+12%`)** เฉพาะเมื่อตีมอนที่ `HP ≥ 70%` หรือ `HP < 35%` หรือติด `Exposed` (`j2AmbushCrit: 0.04 * lv`) |
| `rg_x` *(คริ)* | `rg_x2` | T2 (3→5) | **ใจสลาย (Heart Rend)** | ได้ `critMul +12%*lv` (`+7.2%..+36%`) เฉพาะเมื่อคริใส่มอนที่ติดดีบัฟ (`Poison`, `Wound`, `Exposed`, `Stripped`, `Chill`) (`j2HeartRend: 0.12 * lv`) |
| `rg_x` *(คริ)* | `rg_x3` | T3 (3→5) | **ดูดเลือดจากคมคริ** | เมื่อ **ติดคริ** หรือ **เก็บ Dagger Mark**: ฟื้น HP `Math.round(2 * lv)%` (`1.2%..6%`) ของดาเมจฮิตนั้น + ฟื้น Energy `+lv` (`+1, +1, +2, +2, +3`, cap `+12`/เทิร์นฮีโร่) · *ข้อความ `desc` ใช้ `%` จำนวนเต็มไม่มีทศนิยม!* | `j2CritLeech: 0.02 * lv`, `rgCritEnergy: lv` (**`INT_FIELDS`**) |
| `rg_x` *(คริ)* | `rg_x4` ★ | T4 (1) | **คริเป็นมีด & ลอกเลียน (Plagiarism)** | `j2KnifeCrit: 1`: ตีปกติ (`basic`), คอมโบ (`combo`), หรือ `Back Stab` (`skill3Turn` โดยใช้ flag `this.isBackStab` ร่วมกับ `BattleScene.ts:1289` ที่เดิมเช็กแค่ `'basic' \| 'combo'` แล้วเรียก `comboKnives(false)` หลังแทง!) คริ = ปา `มีดบิน` เพิ่ม `+1` เล่มที่ตัวคูณ **`(1.2 + st.j2KnifeMul) × P.ATK`** (`KIT2.rogue.critKnifeMul = 1.2`, แก้ `comboKnives` `BattleScene.ts:2036` ให้ปามีดชุดคริแยกที่ `KIT2.rogue.critKnifeMul + st.j2KnifeMul`, cap `2` เล่ม/Ult On-Hit) · **Plagiarism (`j2Plagiarize: 1`):** ก๊อปปี้ความสามารถเด่นของมอนตาม **ตาราง 3 ระดับ (D6–D14 + `heroKit`)** ด้านล่าง! |

#### ตารางก๊อปปี้สกิล `Plagiarism` (`rg_x4 ★` + `rg_t4_plagiarize` — Grounded ใน D6–D14 & `heroKit`)
- **เงื่อนไขการก๊อปปี้:** `1` ครั้ง/เวฟ (หรือ `2` ครั้ง/เวฟเมื่อมี `rg_t4_plagiarize` Rank 2, **โดยเก็บ Buff ล่าสุดหรือสูงสุด `1 | 2` ช่องในเวฟนั้น**) เมื่อโดนสกิลมอน **หรือ** กด `Back Stab` ใส่เป้าหมาย; **โบนัส `+20%` (`×1.20`)** คูณทับค่าสถานะของ Buff ที่ก๊อปปี้ได้ และถ้ามี `rg_t4_plagiarize` เดี่ยวๆ โดยไม่ได้อัป `rg_x4 ★` จะปลดล็อกเฉพาะการก๊อปปี้เมื่อกด `Back Stab` ใส่ **Boss/Mini** + ดาเมจ `+10 | +18%` ใส่เป้าหมายที่ถูกก๊อปปี้!
- **กฎเลือก Buff เมื่อ `Back Stab` ก่อนมอนมี `heroKit` ออกสกิล:** หากก๊อปปี้จากการโดนสกิลมอน ให้ใช้ `HERO_SKILL_BOOK[id].role` ของสกิลที่โดนตรงๆ; หากก๊อปปี้จาก `Back Stab` ใส่ `m.heroKit.skills[]` ให้คัดตัวแรกใน array ตามลำดับความสำคัญ **`damage` > `debuff` > `buff` > `shield` > `heal`** (Deterministic 100%)
- **ลำดับการคัดแยก 3 ระดับ (ไม่มียิงว่าวบน D6–D14 และรองรับ D15–D18 `heroKit`):**

| ลำดับ | แหล่งที่ตรวจบน `Mon` (`monsters.ts` / `d7..d14.ts`) | เอฟเฟกต์ที่ได้ทั้งเวฟ (รวมโบนัส `+20%` จาก `★`) | ตัวอย่างมอน D6–D14 |
|---|---|---|---|
| **Priority 1A** | `m.heroKit` (`D15–D18` Mirror) | อ่าน `HERO_SKILL_BOOK[id].role` (ครบทั้ง 5 role): `damage` → `+14% ATK & +7% crit`; `debuff` → `+3 poison & +14% vsPoison`; `buff` (`sw_blood`, `ar_hawk`, `cl_bless`, `sage.s3`, `beastmaster.ult`) → `+12% ATK, +10% ASPD & +10% crit`; `shield`/`heal` → `+14% maxHp shield & +12% healAmp` | Mirror Clones |
| **Priority 1B** | Active `skills` / `slamFx` / `venom` ที่มี **Poison / Burn / Freeze / Slow** | **Poison:** `+3 poison, +18% vsPoison` · **Burn:** `+2 autoBurn, +18% vsBurn` · **Freeze/Slow:** `+18% vsChill, +10% FLEE` (มีดบินแปะ `Chill 1` เทิร์น) | `pharaoh`, `frostwyrm`, `lavatitan`, `ifrit`, `deepmatron`, `clonemage` |
| **Priority 1C** | Active `skills` / `slamFx` ที่มี **ArmorBreak / Weaken / Silence / Heal / Shield / Warcry** | **Break/Weaken/Silence:** `+18% physPen, +12% skillCrit` · **Heal/Shield/Warcry/Revive:** `+14% ATK, +12% Shield/HealAmp` | `sphinx`, `omnicore`, `starweaver`, `sunpriest`, `repairbot`, `protozero` |
| **Priority 2** | มอนไร้ `skills` → ตรวจ `onHit` หรือ Passive (`iceSkin`, `reflect`, `lifesteal`, `razor`, `fixedFlee`, `trueSight`, `shots >= 2`, `combo`, `deathBlast`, `def >= 60`) | **Elemental `onHit`:** ใช้กฎ Priority 1B · **`reflect`/`def>=60`:** `+18% physPen` + สะท้อน `12%` · **`lifesteal`/`razor`:** `+6% lifesteal` · **`fixedFlee`/`trueSight`/`shots`/`combo`:** `+10% crit, +12% ASPD` · **`deathBlast`:** ฆ่ามอนระเบิด AoE `1.2x ATK` | `sandscorp`, `yeti`, `salamander`, `icegolem`, `obsidiangolem`, `drownedknight`, `voidstalker`, `clonethief` |
| **Priority 3** | มอนกายภาพล้วนที่ไม่มี tag ใดเลย | **Assassin Copy Fallback:** `+14% P.ATK` (`atkPct` ใน fight) + `+7% crit` ทั้งเวฟ | `jackal`, normal mobs ทั่วไป |

---

### 3.6 Rogue 4-Row Talents (`rg_t1`–`rg_t4`: `v > 0` Compliant กับ `job2-talents.test.ts`)

> **ข้อบังคับ `tests/job2-talents.test.ts:21`:** ทุก Key ใน `t.mod(rank)` ต้องมีอยู่ใน `PLAYER` (`stats.ts`) และมีค่า **`> 0`** ทั้ง Rank 1 และ Rank 2

| Row | ID | ชื่อ | Max | Rank 1 → Rank 2 (กลไก & `mod(r)`) |
|---|---|---|---|---|
| **Row 1** | `rg_t1_mark` | **ปักตราไว** | 2 | เริ่มเวฟปา `มีดบิน` เปิดฉากฟรี `1 \| 2` เล่ม · ขยายเพดาน Dagger Mark `3 → 4 \| 5` (`j2RgWaveKnife: 1\|2`, `j2RgMarkCap: 1\|2`) |
| **Row 1** | `rg_t1_ambush` | **สายตาจู่โจม** | 2 | ได้ `crit` และ `skillCrit` `+6 \| +10%` เมื่อเป้า `HP ≥ 70%` หรือ `< 35%` (`j2RgAmbushCrit: 0.06\|0.10`) |
| **Row 1** | `rg_t1_evade` | **หลบแล้วสะบัดมีด** | 2 | ทุกครั้งที่หลบได้ ปา `มีดบิน` สวน `1 \| 2` เล่ม + ได้ `FLEE +6 \| +10` นาน `1` เทิร์น (`j2RgDodgeKnife: 1\|2`, `j2RgDodgeFlee: 6\|10`) |
| **Row 2** | `rg_t2_ult` | **พายุมีดคลั่ง** | 2 | `พายุมีด` แรง `+15 \| +25%` (`ult2Pow: 0.15\|0.25`) + โปรยมีดเพิ่มเฉพาะ `พายุมีด` `+2 \| +3` เล่ม (`j2UltKnives: 2\|3` — ไม่บวกเข้า `j2KnifeAdd` เพื่อไม่ให้เฟ้อในคอมโบปกติ) |
| **Row 2** | `rg_t2_deathmark` | **ตราความตายขยายผล** | 2 | `Death Mark` บวกอัตราส่วนระเบิดเพิ่ม `+12 \| +20%` (additive เข้ากับ `24% + 5%*lv`) และสาด AoE `35 \| 55%` ไปมอนรอบข้าง (`j2RgDeathMark: 0.12\|0.20`) |
| **Row 2** | `rg_t2_voracity` | **พายุล้มแล้วต่อ** | 2 | เมื่อฆ่ามอนด้วย `พายุมีด` หรือ `มีดบิน`: คืน Energy `+15 \| +25` และลด CD `พายุมีด` `-1` เทิร์น (ICD `1`/เทิร์น, นับใน Global Cap `-2/turn`) (`j2RgKillUltCd: 1`, `j2RgKillRes: 15\|25`) |
| **Row 3** | `rg_t3_stab` | **แทงหลังทะลุโล่** | 2 | `Back Stab` แรง `+15 \| +25%` (`s3Pow: 0.15\|0.25`) และเจาะทะลุเกราะโล่ (Shield) มอน `50 \| 100%` (`j2RgShieldPierce: 0.5\|1`) |
| **Row 3** | `rg_t3_strip` | **ปลดอาวุธเต็มขั้น** | 2 | `Back Stab` ลด P.ATK/M.ATK มอน `-10 \| -18%` และเพิ่มเวลา `Strip Armor` `+1` เทิร์น (`j2RgStripAtk: 0.10\|0.18`) |
| **Row 3** | `rg_t3_shadow` | **แทงหลังควบพิษ** | 2 | หากเป้าติดพิษอยู่แล้ว `Back Stab` (จาก `skill3Turn` เท่านั้น, ไม่นับจาก `Living Shadow`) ร่าย `แทงพิษ` ตามทันทีที่พลัง `50 \| 80%` (ไม่เสีย Energy, ไม่ติด `s1Weave`) (`j2RgStabS1: 0.50\|0.80`) |
| **Row 4** | `rg_t4_combo` | **เชนมีดเร่งพลัง** | 2 | แต่ละฮิตคอมโบในเทิร์นเดียวเพิ่มดาเมจให้ `มีดบิน` ชุดนั้น `+15 \| +25%` (`j2RgKnifeRamp: 0.15\|0.25`) + `comboDmg +8 \| +14%` (`comboDmg: 0.08\|0.14`) |
| **Row 4** | `rg_t4_plagiarize` | **ปรมาจารย์ลอกเลียน** | 2 | ก๊อปปี้ด้วย *Plagiarism* ได้ `1 \| 2` ครั้ง/เวฟ (ปลดล็อก standalone บน `Back Stab` vs Boss/Mini หากไม่เลือก `rg_x4 ★`) และสร้างดาเมจใส่ Boss/Mini ที่ถูกก๊อปแรงขึ้น `+10 \| +18%` (`j2RgPlagiarize: 1\|2`) |
| **Row 4** | `rg_t4_leech` | **ปลิดชีพดูดเงา** | 2 | เมื่อเก็บ Dagger Mark หรือฆ่ามอน ฮีล `2 \| 4%` Max HP (`j2RgMarkHeal: 0.02\|0.04`) และฆ่าได้ `+1` **Ghost Shroud** (เปิด `maxShroud >= 1`) (`j2RgKillShroud: 1`) |

---

## 4) Stat มีค่าทุกตัว (7-Stat Scaling & Off-Meta Viability 0.45x–0.90x)

| Stat | ผลพื้นฐานเดิม (`stat-spec.ts`) | กลไก Rework เฉพาะ Thief / Rogue (สูตร & Cap) | Build นอกกระแส & Trade-off |
|---|---|---|---|
| **STR** | `+2 P.ATK/pt`, `+0.5% pskill/pt` | ขับเคลื่อน `แทงพิษ`, `Blade's End`, `Back Stab`, `มีดบิน`, `Sinister Steel`, และ `เงาพริ้ว` (`1+pskill`) | **Classic Burst:** ดาเมจพื้นฐานสูงสุด (1.00x) แต่ไม่มีเพดานพิษ/ฮิต Ult สูง/ต้านเวท |
| **AGI** | `+1.5% ASPD/pt`, `+1 FLEE/pt`, `combo`, `thUltAgi` | เพิ่ม **`thUltAgi` (`+1%/pt`, `0.01 * (AGI - 1)` — ลดจาก `2%` เพื่อสมดุลสายอื่น)**, ขับเคลื่อน `Ghost Shroud` shield (`0.15..0.40 * FLEE`), เร่งความถี่คอมโบ `มีดบิน` | **Tempo / Evasion:** ออกเทิร์นถี่ หลบเก่ง |
| **DEX** | `+1 HIT/pt`, `minPct +0.5%/pt` | **1) `เงาพริ้ว` Hits:** $+\min(6, \lfloor(\text{DEX}-1)/15\rfloor)$ + **Shadow Blade Affinity:** **`thUltDex = +1.2%/pt`**<br>**2) `พายุมีด` Bonus Knives:** $+\min(3, \lfloor(\text{DEX}-1)/25\rfloor)$ เล่ม<br>**3) `th_pick` Zeny:** $+1/\text{10 DEX}$ & **Rogue `Strip Armor`:** $-\min(10\%, \lfloor(\text{DEX}-1)/5\rfloor \times 1\%)$ | **Off-Meta: พายุเงา DEX (`DEX Ult Storm` — `0.54x–0.74x` Classic):** ปา `เงาพริ้ว` ถึง 10–12 ฮิต + On-Hit `55%` + `Death Mark` ระเบิดเดียว!<br>*Trade-off:* เสีย ASPD/P.ATK จาก STR/AGI |
| **WIS** | `healAmp`, `shieldAmp`, `M.DEF`, `Tenacity` | **1) `wisPoisonCap(WIS)` (Gate เฉพาะ `job.id === 'thief'`):** $+\min(16, \lfloor(\text{WIS}-1)/8\rfloor)$ (`12 → 28 → 37`!)<br>**2) พิษฐาน `WIS` (Thief):** **`+0.50/pt` `poisonDmg`** + **Venom Melt** (`WIS >= 20` & `thief_a` active): เทิร์นมอนบวก $\max(\text{hpMelt}, \text{flatMelt})$ โดย $\text{hpMelt} = \min(0.018 \times m.\text{def.hp},\; m.\text{poison} \times \min(0.0007 \times m.\text{def.hp},\; 0.000011(\text{WIS}-1)m.\text{def.hp}))$ และ **P.ATK-Independent Floor:** $\text{flatMelt} = \min(0.15 \times m.\text{def.hp},\; m.\text{poison} \times 0.85 \times (\text{WIS}-1))$; บวก **Toxic Seep (`ICD 1/เทิร์นฮีโร่`):** `แทงพิษ`/`Back Stab` ใส่ `m.poison >= 8` ซึมพิษทันที `0.50 × (m.poison × poisonDmg × paMul + min(VenomMelt, 32 × (WIS - 1)))` (`dot = true`)<br>**3) `Shadow Ward` (Scoped):** ลดดาเมจเฉพาะ **`magic || monHit >= 999 || trueSight`** $+\min(0.15, 0.003(\text{WIS}-1))$ | **Off-Meta: แทงค์พิษ WIS (`WIS Toxic Juggernaut` — `0.49x–0.89x` Classic กับ `th_t4a`, `0.45x–0.86x` กับ `th_t4b`):** อึดเวท ต้านดีบัฟสูง ปั้นพิษ `37` stack ละลายบอสทั้ง `starweaver 23.7k`, `D10 80k`, และ `250k`!<br>*Trade-off:* เคลียร์เวฟ 4 ตัวช้ากว่า STR/Crit |
| **INT** | `+2 M.ATK/pt`, `poisonDmg` | **1) `เลือดพิษ` (`thief_v3`):** $\min(0.60, (0.08 \times \text{lv})(1 + 0.015(\text{INT}-1)) + \text{st.poisonLeech})$ (cap `25% Max HP`/เทิร์น)<br>**2) `poisonDmg` (Thief):** **`+0.25/pt`** + **Arcane Edge (`heroBuild` เมื่อ `thS1Matk > 0`):** **`+1.0 × (INT - 1)` `M.ATK`** (ช่วยให้ชุดมีดกายภาพล้วน `c_rg_hood`/`c_rg_ring` สเกลได้ `0.60x–0.65x`!)<br>**3) `thief_v1`/`v2`/`v4 ★`:** `แทงพิษ` (`+1.8x M.ATK`), `Basic Venom Coating` (`+1.05x M.ATK`), `Contaminate` (`det × (3.0×poisonDmg + 0.42×M.ATK) + 3.6×M.ATK`, ออกได้ทั้ง `Basic`/`แทงพิษ` 1/turn **และ** `Back Stab` 1/turn แยก ICD), และ `Alchemy Blade` (`+0.90x M.ATK` บน `Back Stab` / `+0.60x M.ATK` บน `พายุมีด`) | **Off-Meta: AP Twitch / Drain-Alchemist (`0.73x–0.83x` Hybrid / `0.60x–0.65x` Physical Rogue Gear):** ระเบิดสารพิษสเกล `M.ATK` + ดูดเลือดพิษ 50%+ ยืนสู้บอสแทบอมตะ + AoE เคลียร์เวฟไว!<br>*Trade-off:* พึ่งพิษ `≥ 8` stack และบางกว่าสาย VIT/WIS |
| **LUK** | `crit (+1%/3)`, `luckyDodge` | **Gambler's Edge:** เมื่อติด `LUCKY!` dodge (`ICD 1` ครั้งต่อ **เทิร์นฮีโร่**): Thief ฟื้น `+6` Energy; **Rogue ฟื้น `+6` Energy และปา `1` `มีดบิน` สวนฟรี** | **Crit / Gambler:** พึ่งดวง + ป้อน `Perfect Agony` |
| **VIT** | `Max HP`, `P.DEF`, `regen`, `counter` | **Toxic Overheal:** เพิ่มสาขาเฉพาะใน `BattleScene.heal()` (เมื่อ `this.toxicHealing === true` จาก `เลือดพิษ` / `thief_c3`, **แยกจาก `else if (pk.overheal)`**) แปลงส่วนเกินเป็นโล่ผ่าน `addShield()` สูงสุด $\min(0.25, 0.10 + 0.0015 \times \text{VIT}) \times \text{MaxHP}$ | **Bruiser Drain-Tank:** คู่ `VIT+INT`/`WIS` กัน One-shot บอส |

---

## 5) กรณีพิเศษ, Guardrails & ตาราง `INT_FIELDS` (`src/data/tree.ts`)

1. **Global Ult CD Reduction Cap:** การลดคูลดาวน์ `เงาพริ้ว`/`พายุมีด` จากทุกแหล่งรวมกัน (`Voracity` + `rg_u2` + `rg_t2_voracity` + `thief_b3` + `th_t2a`) **จำกัดไม่เกิน `-2` เทิร์นต่อ 1 เทิร์นฮีโร่** และ CD หลังกดร่ายห้ามลดต่ำกว่า `1` ในเทิร์นนั้น
2. **`INT_FIELDS` ใหม่ทั้งหมดที่ต้องเพิ่มใน `src/data/tree.ts:68`:**
   - เดิมที่คงอยู่: `'poison'`, `'poisonCap'`, `'doubleAtk'`, `'comboCount'`, `'waveDodge'`, `'ultDodge'`, `'ultHits'`, `'ultPoison'`, `'j2KnifeAdd'`
   - ใหม่ของ Thief & Rogue (`13` คีย์): **`'thGhostShroud'`**, **`'thUltCritRes'`**, **`'j2StabKnives'`**, **`'j2StabEnergy'`**, **`'rgCritEnergy'`**, **`'j2RgWaveKnife'`**, **`'j2RgMarkCap'`**, **`'j2RgDodgeKnife'`**, **`'j2RgKillUltCd'`**, **`'j2RgKillRes'`**, **`'j2RgPlagiarize'`**, **`'j2RgKillShroud'`**, **`'j2UltKnives'`**
   - *(ยืนยัน: ทุกโหนดที่มี Key ข้างบนเขียน `desc(lv)` ด้วยจำนวนเต็ม ไม่มี `\d+\.\d+` เลยสักตัว!)*
3. **คงคีย์เดิมสำหรับ Gear / Card / Relic:** คง `poisonLeech`, `poisonAmp`, `autoCostCut`, `ultDodge`, `ultHits`, `ultPoison`, `dodgeEnergy`, `dodgeHeal`, `killHeal`, `thExecute`, `bloodKing`, `arCritRes` ไว้ใน `PLAYER` และ `BattleScene.ts` (และประกาศคีย์ใหม่ทั้งหมดรวมถึง `thStrikePoison`, `thShadowFloor`, `j2UltKnives` เป็น `0` ใน `PLAYER`) เพื่อไม่ให้ `cf_shadowfang`, `cf_plaguecharm`, `venomqueen`, `mirage`, `taint.ts` พัง (`thief_c4 ★` ใช้ `thBloodKing` แยกต่างหาก)
4. **Power Budget (`CLASS_K` / `JOB2_K`):** คงเป้า `CLASS_K.thief ≈ 1.10–1.15` และ `JOB2_K.rogue ≈ 1.10` โดยอัปเดต `powerParts()` (`src/data/power.ts`) แล้ววัดซ้ำด้วย `tools/bot.cjs`

---

## 6) Mobster Compatibility Notes (ผลกระทบต่อคลาส 2 มาเฟีย — ห้าม Rework Mobster)

> **กฎเหล็ก:** `src/data/trees2/mobster.ts`, `JOB2.mobster`, และ `KIT2.mobster` จะ **ไม่ถูกแก้ไข** ในการ Rework นี้

| Shared Thief Hook | พฤติกรรมใหม่หลัง Rework | ผลกระทบต่อ Mobster (`มาเฟีย`) & มาตรการแก้ไขบั๊ก |
|---|---|---|
| **`ทวงหนี้` vs `thief_a4 ★` (CRITICAL BUG FIX)** | ปัจจุบัน `BattleScene.ts:2251-2252` เรียก `damageMon()` (ซึ่งเรียก `killMon()` ทันทีที่ `2251`) **ก่อน** `m.poison = 0` ที่ `2252`! | **ต้องแก้ลำดับใน `BattleScene.ts:2251-2252`:** เก็บ `const p = m.poison; m.poison = 0; this.dotIcon(m)` **ก่อน** เรียก `this.damageMon(m, dmg, ...)` (พร้อมตั้ง `this.burstingDebt = true`) เพื่อป้องกันไม่ให้ `thief_a4 ★` (`Plague Burst` + `60% poisonSpread`) ทำงานซ้อนเมื่อ Mobster ฆ่ามอนด้วย `ทวงหนี้`! |
| **`สมุดหนี้` (`debt(m)`, `BattleScene.ts:2041-2044`)** | `debt(m)` อ่านเฉพาะ 6 ดีบัฟเดิม (`poison`, `burn`, `chill`, `weakTurns`, `marked`, `armorBrk`); `Privileged Status` (`th_t4a`) เป็นบัฟฝั่งผู้เล่น **ไม่ใช่** ดีบัฟบนมอน | **คง `debt(m)` ไว้ที่ 6 ดีบัฟเดิม 100%** (ไม่เพิ่ม `Wound`/`Exposed`/`Blind` เข้า `debt(m)` เพื่อรักษา Execute threshold ของ Mobster ตาม R1) — Mobster ได้ประโยชน์ตามธรรมชาติจาก `Poison` ของ `thief_a`/`th_pick`/`th_wound` และ `armorBrk`/`weakTurns` จากการ์ด/ไอเทม |
| **`JOBS.thief` (`s1Weave`, `autoCost()`, `1+pskill`)** | `แทงพิษ` เป็น `45` Energy + สลับ `1:1` กับ `Basic`, คูณ `(1+pskill)` | **ปลอดภัย & ดีขึ้น:** Mobster ได้ `Basic (2×0.6)` + `D.Strike` ร่วมกับ `แทงพิษ` แรงขึ้น; `fleeFloor` คงที่ `0.1` |
| **`WIS → wisPoisonCap()` & `เลือดพิษ`** | `wisPoisonCap()` gate เฉพาะ `job.id === 'thief'` (ไม่ล้นไป Beastmaster/Archer!) | **บวกโดยตรง:** Mobster (`job === 'thief'`) ที่ลง `WIS` ได้เพดานพิษสูงขึ้นให้ `ทวงหนี้` เบิร์สต์แรงขึ้น; `เลือดพิษ` ไม่ทำงานบน `ทวงหนี้` |
| **`shadowDance()` vs `ทวงหนี้` & `crossTierBonus()`** | `s1` และ `ult` มี `37` แต้ม/สาย; `ทวงหนี้` ไม่เรียก `shadowDance()` | **แยกขาด:** `dexUltHits`/`th_t3` ไม่กระทบ `ทวงหนี้`; `crossTierBonus()` ยังเสริม `ตัดเส้นเอ็น` และ `ทวงหนี้` ตามเดิม |

---

## 7) แผนการลงมือพัฒนาและตรวจสอบความถูกต้องในอนาคต (Implementation & Verification Plan)

### 7.1 รายชื่อไฟล์ที่จะแก้ไขเมื่อได้รับอนุมัติ

1. **Data, Registry & Formulas:**
   - `src/data/stats.ts` — เพิ่ม `Stats` keys ใหม่ทั้งหมดของ Thief & Rogue (`thStrikePoison`, `thShadowFloor`, `j2UltKnives`, ฯลฯ) และตั้งค่า `0` ใน `PLAYER`
   - `src/data/skill-math.ts` — เพิ่ม `KIT.thiefAutoMinCost = 30`, แก้ `autoCost()` (`348`), เพิ่ม `matkToPmRatio`, `dexUltHits`, `wisPoisonCap`, `intPoisonLeech`, `KIT2.rogue.critKnifeMul = 1.2`, อัปเดต `autoInfo` (`611-614`, เพิ่ม `(1 + st.pskill)` + `thief_v1`), อัปเดต `ultInfo` (`708-711`, เพิ่ม `thUltDex`, `dexUltHits` และ `job2 === 'rogue'`), อัปเดต **`S2N.pickMul = (star) => (star ? 1.9 : 1.3)`** (`343`) และเพิ่มตัวเลขล้วนใน **`S2P`/`S2N`** (`S2P.woundPoison = { base: 4, per: 1 }`, `S2P.woundMax = { base: 6, per: 2 / 3 }` เป็น plain numeric leaves สำหรับ `th_wound`)
   - `src/data/jobs.ts` & `src/data/jobs2.ts` — อัปเดต `JOBS.thief` (`auto.cost = 45`) และ `JOB2.rogue` (`mod`, `mastery.skillCrit`, `signature`, `skill3`, `ult`)
   - `src/data/skill2.ts` — อัปเดต **`th_smoke.cost = 35`** (`58`) และคำอธิบาย `th_smoke`, `th_pick`, `th_wound`
   - `src/data/tree.ts` — อัปเดต `ATTACH` (`thief_v: 's1'`, `thief_u: 'ult'`) และเพิ่มทั้ง **`13` คีย์ใหม่** (รวม `'j2UltKnives'`) เข้า `INT_FIELDS` (`68`)
   - `src/data/trees/thief.ts` & `src/data/trees2/rogue.ts` — เขียนโหนดและทาเลนต์ใหม่ทั้งหมดตาม `§2` และ `§3`
   - `src/data/meta/hero-stats.ts` — อัปเดต **`thUltAgi = 0.01 * d('agi')`** (`282`), เพิ่ม **`thUltDex = 0.012 * d('dex')`**, `dexUltHits`, `wisPoisonCap` (gate `job.id === 'thief'`), `Shadow Ward`, `poisonDmg` (`0.25 * d('int') + 0.50 * d('wis')` สำหรับ Thief), `INT → M.ATK +1.0 * d('int')` เมื่อ `thS1Matk > 0`, และ `Rogue mastery skillCrit`
   - `src/data/skill-registry.ts` — อัปเดต `SKILL_LAYOUT.thief` (`124-132`, เพิ่ม `th_wound` ผ่าน numeric `S2P`/`S2N` leaves ให้ `typeof v === 'number'` ผ่าน `tests/skill-registry.test.ts:23` และเพิ่ม `thiefAutoMinCost`), `J2_COL.rogue` (`296`), `J2_LABEL` (`167-170`, เปลี่ยน `'rogue.mastery.crit' -> 'rogue.mastery.skillCrit'` และเพิ่ม **`'rogue.critKnifeMul'`**), และ `INTISH` (`305`, เปลี่ยน `Knives` เป็น **`(Knives|Knife)$`** เพื่อจับ `dualKnife` และ `j2UltKnives` โดยไม่โดน `critKnifeMul`)
   - `src/data/tunables.ts` — อัปเดต `KIT_INTS` / `KIT_NUMS` (`146-147`) ให้ตรงกับ `SKILL_LAYOUT.thief` (รวม `thiefAutoMinCost`)
   - `src/data/hero-skill-book.ts` — คง ID (`thief.s1`, `th_smoke`, `th_pick`, `th_wound`, `thief.ult`, `rogue.s3`, `rogue.ult`) เพื่อรักษา `mirrorKit`, และอัปเดต `SPEC` (`110-122`) ให้สะท้อนสกิลใหม่
   - `src/data/power.ts` & `src/data/statInfo.ts` — ซิงค์ `powerParts()` และคำอธิบาย stat
2. **Runtime, UI & Save:**
   - `src/scenes/BattleScene.ts` — เพิ่มฟิลด์บน `Mon` (`wound`, `exposed`, `exposedPct`, `stabMark`, `stripped`, `daggerMark`, `deathMark`, `woundHealCut`), เพิ่ม `Ghost Shroud` (พร้อม **`onShroudBreak()`** แยกจาก `dodged()` ที่ `4402`), `s1Weave`, `poisonMul` (`1273`, ตั้ง `0` ใน `Sinister Steel` และ non-on-hit `shadowDance`, ปัดเศษด้วย `Math.floor`), `luckyDodge` bypass (`1238`), **`isBackStab`** ที่ `1289` + `comboKnives(false)` (`rg_x4 ★`), `Venom Melt` + `Toxic Seep`, `Contaminate` บน `Back Stab` (แยก ICD), `netHpDmg` (`3915`), `healCut(m)` (`5183`), `VIT Toxic Overheal` (`heal()`), `Plagiarism` 3-tier engine (ครบ 5 `SkillRole` รวม `'buff'`), Global Ult CD Cap `-2/turn`, และ **แก้ลำดับ `m.poison = 0` ก่อน `damageMon()` ใน `ทวงหนี้` (`2251-2252`)**
   - `src/scenes/character/node-detail.ts` — เพิ่ม rows สำหรับ `Back Stab`, `มีดบิน`, `พายุมีด`, `dexUltHits`, `wisPoisonCap`, `intPoisonLeech`
   - `src/save.ts` — เพิ่ม `thiefRogueRework: 1` ใน `newSave()` (`133`) และ `migrateThiefRogueRework(s)`

### 7.2 ลำดับขั้นตอนการลงมือ (Phased Rollout)

1. **Phase 1 — Schema, Formulas & Pure Math (`stats.ts`, `skill-math.ts`, `hero-stats.ts`, `tree.ts`):** → รัน `npm run typecheck`
2. **Phase 2 — Trees, Registry, Skill2 & Save Migration (`trees/thief.ts`, `trees2/rogue.ts`, `skill2.ts`, `jobs.ts`, `jobs2.ts`, `skill-registry.ts`, `tunables.ts`, `save.ts`):** → อัปเดตเทส sync (`admin-model`, `node-stretch`, `skill-registry`) → รัน `npm run typecheck && npm test`
3. **Phase 3 — BattleScene Combat, Plagiarism & Mirror (`BattleScene.ts`, `hero-skill-book.ts`, `node-detail.ts`):** → รันเทสใหม่ทั้งหมด
4. **Phase 4 — Balance & Regression Check (`power.ts`, `tools/bot.cjs`):** ตรวจ Off-Meta parity (`0.45x–0.90x`), S2 parity (`±15%`), และ Mobster/Class K

### 7.3 การอัปเดตเทสเดิม & รายการ Unit Test ใหม่ที่ต้องเขียน

- **คำสั่งตรวจสอบมาตรฐาน (หลังได้รับอนุมัติ):**
  - `npm run typecheck` (`tsc --noEmit` ต้องผ่าน `0` errors)
  - `npm test` (`node tools/test.mjs`)
- **เทสเดิมที่ต้องปรับซิงค์กับ Rework (สำคัญ — แก้ไขตาม `borrow.ts` จริง!):**
  - `tests/admin-model.test.ts` (`97-112, 143-152`): เนื่องจาก `มีดคู่` ถูกลบ และ `คมเลือดซ้อนสถานะ`/`จุดบอดซ้อนพิษ` เป็นโหนด conditional จึง **ไม่อยู่ใน `HERO_TO_MON`** (`src/admin/borrow.ts:12-22`) — ต้องเปลี่ยนเป้าหมายใน `borrow` test ของ Thief เป็นโหนด unconditional ที่ map ได้จริง ได้แก่ `'เคลือบพิษอาบคม'` (`thief_a1` → `poison`, `top === 50`), `'D.Strike'` (`thief_core1` → `doubleAtk`), และทดสอบ `OVER_MAX = 50` + cap ที่ Rogue `'จังหวะเร่ง'` (`rg_c1` → `combo`, `top === 50`) ส่วนการตรวจ `talent.top === talent.max` ให้เลือก talent ของคลาสอื่นที่มี key ใน `HERO_TO_MON` (เช่น `swordsman`/`archer`) เพราะทาเลนต์ Thief/Rogue ใหม่ทั้งหมดเป็นแบบมีเงื่อนไข!
  - `tests/node-stretch.test.ts`: คง `thief_core1: 5` gate + `S2N.smokeHeal`/`pickRes`/`woundPoison`; เพิ่ม assert ว่าทุก stretched node ที่มี `INT_FIELDS` **ไม่มีเลขทศนิยม `\d+\.\d+` ใน `desc(lv)`** (กัน `tidy(s, true)` ปัดเป็น `×1`/`0`)
  - `tests/job2-talents.test.ts`: ยืนยัน `rg_t1..rg_t4` ทุกตัวมี `key in PLAYER` และค่า `> 0` ทั้ง Rank 1–2
  - `tests/skill-registry.test.ts`: ยืนยัน `SKILL_LAYOUT.thief` (`th_wound` numeric leaves), `J2_COL.rogue`, `J2_LABEL` (`rogue.critKnifeMul`, `rogue.mastery.skillCrit`), `INTISH` (`(Knives|Knife)$`), และ `KIT_INTS`/`KIT_NUMS` ครบถ้วน
- **Unit Tests ใหม่ (`tests/thief-rogue-rework.test.ts`):**
  1. `test_stretch_node_tidy_no_decimal_truncation`: รัน `stretchNode()` ครบทุกโหนดของ Thief & Rogue Lv 1..5 ยืนยันไม่มี `INT_FIELDS` node ใดเกิด `×1` หรือ `0` ผิดเพี้ยน และ `thief_u2`, `rg_u1`, `rg_k2`, `thief_b3`, `rg_u2`, `thief_c2`, `rg_s1`, `rg_s2` ตรงตามตารางเป๊ะ
  2. `test_thief_dex_ult_hits_and_storm_knives`: ตรวจ `dexUltHits(1)=0`, `(16)=1`, `(91)=6`, `(200)=6`, `thUltDex = 0.012 * (DEX - 1)`, `thUltAgi = 0.01 * (AGI - 1)`, และโบนัสมีด `พายุมีด` สูงสุด `+3` ที่ `DEX >= 76`
  3. `test_thief_wis_poison_cap_thief_only_and_melt`: ตรวจ `wisPoisonCap` และ `poisonDmg +0.50/WIS` ทำงานเฉพาะ `job === 'thief'` (ไม่ล้นไป Beastmaster/Archer), `Shadow Ward` จำกัดเฉพาะ magic/`monHit>=999`/`trueSight`, และ `Venom Melt` (`hpMelt` + `flatMelt` + `Toxic Seep` ICD 1/turn) ถูกต้อง
  4. `test_thief_int_poison_leech_multiplicative_and_cap`: ตรวจ `intPoisonLeech` ที่ `INT = 1, 51, 81, 101` เพิ่มขึ้นทุก Lv 1..5 (ไม่ตันที่ Lv1!), `lv=0` คืน `0`, `st.matk > 0` guard (ไม่เกิด 1-dmg floor), `Arcane Edge` (`+1.0/INT` M.ATK เมื่อ `thS1Matk > 0`), และฮีลรวมต่อเทิร์น (ทั้ง tick + `ระเบิดสารพิษ`) ไม่เกิน `25% Max HP`
  5. `test_thief_s1_weave_auto_cost_floor_30_no_rogue_starvation`: ตรวจ `autoCost()` floor `30` และจำลอง 20 เทิร์นกับ `2-2 ล้วงกระเป๋า` + `th_t2a` ยืนยัน `S1 : Basic = 1:1` (ไม่มี `res >= 80` bypass!)
  6. `test_thief_ghost_shroud_and_smoke_timing`: ตรวจ `Shroud` อยู่ครบ `2` เทิร์นไม่ถูก `thief_b4 ★ Counter` ทำลาย, `Ghost Shroud` สร้าง Shield **ก่อน** รับดาเมจ `trueSight`/`monHit 999` (ไม่ทำงานซ้อนเมื่อ `dodgeCharges > 0`), และ **`onShroudBreak()` ไม่เพิ่ม `src.evaded`**
  7. `test_thief_ult_onhit_combine_cap_and_perfect_agony_no_double_dip`: ตรวจ `thief_u2 + th_t3b + thief_u4 ★` clamp ที่ `0.55`, และ `Perfect Agony` (`critMul` + `WIS`) cap `+100%` ไม่เบิ้ลบนคริของ `ระเบิดสารพิษ★`/`Blade's End★`
  8. `test_rogue_loops_deathmark_and_plagiarism_3tier`: ตรวจ `rg_k2` 1-bounce, `Voracity Kill` 1/turn, `Sinister Steel` `poisonMul = 0`, `Back Stab` `critKnives` (`1.2 + j2KnifeMul`), Global Ult CD Cap `-2/turn`, `rg_c4 ★` ไม่ทริกเกอร์ `rg_t3_shadow`/`rg_s2`/`rg_x4 ★`, `Death Mark` `dot=true` ไม่ double-dip, และ `Plagiarism` ครอบคลุม D6–D14 ทุกมอน + `heroKit` (ครบ 5 `SkillRole` + deterministic pick)
  9. `test_mobster_compatibility_and_debt_kill_order`: ตรวจ `save.job === 'thief', save.job2 === 'mobster'` หลัง `migrateThiefRogueRework()` ไม่รีเซ็ต Mobster, `debt(m)` คง 6 ดีบัฟเดิม, และ `ทวงหนี้` ตั้ง `m.poison = 0` ก่อน `damageMon()` เพื่อไม่ให้ `thief_a4 ★` ลั่นซ้อน!
