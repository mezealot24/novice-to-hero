# ⚜️ Awakening: Crusader → Paladin (อาชีพขั้น 3 นำร่อง) v1 — design draft

> Q ยืนยัน 2026-11-08 10:40: "Awakening crusader ใช่" · ที่มา: รายงาน research "อาชีพคลาส 3 และดันเจียน D11" (2026-11-08)
> สถานะ: **spec ล็อกแล้ว · P0 ✅ P1 ✅ (2026-11-08, Q สั่ง "เริ่ม p0-p1") · ยังเล่นไม่ได้ (รอ P2 Master Trial + P3 content)** · ตัวเลขทุกตัวเป็นค่าเริ่มสำหรับจูนด้วย bot + save จริงของ Q ค่ะ
> อ้างอิงโค้ด: repo `f0ceb54` (v119) — `jobs2.ts`, `skill-math.ts KIT2.crusader`, `trees2/crusader.ts`, `trees/cleric.ts`, `tree.ts`, `power.ts`

## 0. สรุปสั้น (so what)

- **เฟสตอนนี้:** late Content → ก่อน Beta · เอกสารนี้คือ T0 (เขียน doc อย่างเดียว) · **ลงมือโค้ดหลัง closed beta** เพราะ blocker ของ beta 6 ข้อไม่มีข้อไหนเป็น content
- **Crusader ตื่นรู้เป็น ⚜️ Paladin** (ชื่อชั่วคราว ref RO: Crusader → Paladin → Royal Guard)
- **ไม่ลบ ไม่แก้ของเดิม:** ใยชั้น 1 (นักบวช) + ใยชั้น 2 (Crusader) + Grand Cross เดิม **อยู่ครบ** · ชั้น 3 เป็น add-on ล้วน (`save.job3` ซ้อนบน `save.job2` แบบเดียวกับที่ `job2` ซ้อนบน `job`)
- **ไม่เพิ่มปุ่ม:** ได้ Ult วิวัฒน์ครั้งที่ 2 + variant ของ Holy Cross + signature 1 ตัว + ใยชั้น 3
- **หัวใจของงานนี้ = "แต้มเก่ามีค่ามากขึ้น":** node ชั้น 3 อ่านแต้มที่ลงไว้ในสาย กางเขน / โล่ / อุทิศ / ศรัทธา แล้วขยายผล
- **ไม่มีของสุ่ม ไม่มีของขาย** → ไม่ต้อง disclose odds · ไม่ชนกฎ no-P2W

## 1. การตัดสินใจ / สมมติฐาน

| # | เรื่อง | สถานะ |
|---|---|---|
| A1 | **Job2 Lv 50 / Base 99 = เพดานสุดท้าย** · ชั้น 3 ไม่ขยาย Base Lv · power ชั้น 3 มาจาก Job3 Lv + ใยชั้น 3 เท่านั้น | ✅ Q ยืนยัน 2026-11-08 |
| A2 | **ไม่มีสไปรต์ใหม่:** ใช้ร่างนักบวชเดิม + ออร่าทอง ⚜️ + tint | ✅ Q ยืนยัน 2026-11-08 · ไม่ชน blocker art |
| A3 | `JOB2_K.crusader` ต้องวัดก่อนเริ่ม (งาน P0) | ✅ วัดแล้ว คง 1.05 (ดู §11) |

## 2. ปลดล็อกและเลเวล

| เรื่อง | ค่า | เหตุผล |
|---|---|---|
| เงื่อนไข | Job2 Lv 50 **และ** `clearsBy.d10 >= 1` **และ** ชนะ ⚔️ Master Trial | gate ด้วย clear ไม่ใช่ Base Lv (Q clear D10 ที่ Base 44 ขณะ band คือ 80–90 → Lv ไม่มีความหมาย) |
| Job3 Lv | เริ่ม 1 · **max 30** (`JOB3_RULES.maxJobLevel`) | ใช้ curve `jobXpNeed` เดิม: 1→30 ≈ 4,640 EXP ≈ ~12 รอบ D10 (ประมาณ ~380 EXP/รอบ) · สั้นไปค่อยขยาย |
| แต้มใยชั้น 3 | 1 แต้ม/Job3 Lv = **29** · แยกกองจากชั้น 1 (48) และชั้น 2 (49) | ของเดิมไม่หาย ไม่ต้องรีเซ็ต |
| EXP | หลังตื่นรู้ Job EXP ไหลเข้า Job3 | Job2 เต็มแล้ว |
| รีเซ็ตใยชั้น 3 | ฟรีในเมือง (เหมือนใยเดิม) | ไม่ลงโทษการลอง |
| สลับ path Pure ↔ Hybrid | **ฟรี 1 ครั้ง/สัปดาห์** · ครั้งต่อไป 💎30 | ต้องมีทางฟรีเสมอ (กฎ no-P2W) · 💎 = ความสะดวกเท่านั้น |
| เปลี่ยน job2 (💎30 เดิม) ตอนตื่นรู้แล้ว | ชั้น 3 **พักไว้** (เก็บ `job3Level` + แต้ม) กลับมา Crusader = ใช้ต่อได้ · ถ้า job2 ใหม่มี Awakening แล้ว = เลือกได้ฟรี | ไม่ทำให้ใครเสียแต้มถาวร (บทเรียน RO "never recover lost skill points") |

## 3. ⚔️ Master Trial (เควสต์ตื่นรู้)

- **ดวลเงาตัวเอง:** สร้างมอนจาก `heroStats` ของผู้เล่น ณ ตอนกด (HP x1.1) ใช้สกิลชุดเดียวกับเรา (Holy Cross / Grand Cross / Auto Guard)
- ใช้ engine duel ของ D10 ที่มีอยู่ · **turn budget 45 เทิร์น** (เท่า duel D10) · หมดเวลา = แพ้
- แพ้ได้ไม่จำกัด ไม่เสียอะไร · ชนะ = ปลด Paladin + title "⚜️ ผู้ตื่นรู้"
- reuse ได้กับทุก Awakening ในอนาคต (เขียนครั้งเดียว)

## 4. สิ่งที่ Paladin ได้ (4 อย่าง ไม่มีปุ่มใหม่)

### 4.1 Signature ⚜️ Prestige (ศักดิ์ศรีอัศวิน)
- เพดาน Auto Guard **40% → 50%** (`KIT2.crusader.guardCap` เดิมไม่แตะ · ชั้น 3 บวกเพดานผ่าน Stats flag `j3GuardCap`)
- ผลของการบล็อกที่ลงไว้ในใยชั้น 2 แรงขึ้น **+25%**: 🏰 ป้อมศรัทธา (`cr_s4`), 💚 บล็อกฟื้นฟู (`cr_d2`), ทาเลนต์ `cr_t4_*` · *(legacy: ไม่ได้ลงไว้ = ไม่ได้อะไร)*
- บล็อกได้ = 📿 ศรัทธา +1 (ระบบ Faith ของใยนักบวช `cleric_c`) · *(ทำงานเฉพาะถ้าลง `cleric_c1` ไว้)*

### 4.2 Ult วิวัฒน์ครั้งที่ 2 ✨ Gospel Cross (กางเขนพระวรสาร)
- **Grand Cross เดิมทั้งหมดยังอยู่:** จ่าย 20% HP, pulse ตาม `gcPulses`, เผา Mana, คืน HP เมื่อโดน ≥ 3 ตัว, buff จากใย Ult ของนักบวช, โหนด `cr_u*` (Guardian Angel ฯลฯ)
- **เพิ่ม:** pulse **+1 ครั้งทันทีที่ตื่นรู้** (rank แรกต้อง "เห็นผล" — บทเรียน HEXA Lv1 2% → 11%)
- **Gospel:** ทุก pulse ที่โดน ≥ 3 ตัว = 📿 ศรัทธา +1 → ศรัทธาเต็มระเบิดแสงกลาง Ult ได้ *(legacy กับ `cleric_c`)*
- root ใยชั้น 3 `crusader_u3p` (max 5, +12%/Lv แบบ root เดิม) คูณเฉพาะส่วนที่ชั้น 3 เพิ่ม
- ตัวเลข: `KIT3.paladin.gospelPulse = 1`, `gospelFaithAt = 3`

### 4.3 Variant ของ Holy Cross (เลือก 1 จาก 2 · สลับฟรีในเมือง)
คงค่าเดิม Mana 22 / cd 2 / 🙈 ตาบอด · แต่ละ variant **ผูกกับสายชั้น 2 คนละสาย** → build เดิมกำหนดว่า variant ไหนคุ้ม

| | 🔗 A: Shield Chain | ⚖️ B: Pressure |
|---|---|---|
| ผล | 3 ฮิต เด้งตัวหน้า → ตัวสุ่ม 2 ตัว · ฮิตละ 0.7x P.ATK + 0.4x P.DEF ของโล่ | 1 ฮิต ข้าม DEF · 1.6x P.ATK + 4% HP สูงสุด · ตาบอด +1 เทิร์น |
| ต้องมี | โล่มือรอง (ไม่มี = 70%) | — |
| legacy | +2% ต่อแต้มในสาย 🛡️ โล่ (`cr_s`, สูงสุด +20%) | +2% ต่อแต้มในสาย 🙏 อุทิศ (`cr_d`, สูงสุด +20%) |
| เหมาะกับ | AoE / ฟาร์มเวฟ | บอส / Abyss tier |

### 4.4 ใยชั้น 3 (`line: 'job3'`, ไฟล์ `src/data/trees3/paladin.ts`, id `pa_*` = save data ห้าม rename)

กฎ `lockReason` / `perTier` / ★ เดิมใช้ได้ · ★ ได้ 2 ดวง · ตัวเลขทั้งหมดอยู่ `KIT3.paladin` (กฎ v57: ตัวเลขอยู่ที่เดียว)

| สาย | id | ชื่อ | max | ผล (ค่าที่ Lv เต็ม) | Stats flag |
|---|---|---|---|---|---|
| ⚜️ ตำนาน (Legacy) | pa_l1 | รากกางเขน | 3 | Grand Cross / Gospel +0.5%/Lv **ต่อแต้มในสาย ✝️ กางเขน (`cr_c`)** · เพดาน +15% | `j3LegCross` |
| | pa_l2 | โล่บรรพชน | 3 | Auto Guard +0.2%/Lv **ต่อแต้มในสาย 🛡️ โล่ (`cr_s`)** · เพดาน +6% | `j3LegGuard` |
| | pa_l3 | กายบรรพชน | 3 | HP สูงสุด +0.3%/Lv **ต่อแต้มในสาย 🙏 อุทิศ (`cr_d`)** · เพดาน +9% | `j3LegHp` |
| | pa_l4 ★ | สืบสาน | 1 | ลงสายที่ผูกกับ variant ≥ 6 แต้ม: A เด้ง +1 ตัว / B ตาบอดกระจายทุกตัว | `j3Heir` |
| ✨ พระวรสาร (Ult) | pa_g1 | แสงพระวรสาร | 3 | Gospel ทุก pulse ฮีล 1%/Lv HP ต่อมอนที่โดน (สูงสุด 5 ตัว) | `j3GospelHeal` |
| | pa_g2 | พรหลังศึก | 3 | Grand Cross จบ → 2 เทิร์น P.ATK / M.ATK +5%/Lv | `j3AfterBless` |
| | pa_g3 | ศรัทธาเร่ง | 2 | Gospel ได้ศรัทธา +1/Lv ต่อ pulse | `j3GospelFaith` |
| | pa_g4 ★ | สนามพระวรสาร | 1 | pulse +1 อีกครั้ง (ไม่จ่าย HP ไม่เผา Mana) | `j3GospelField` |
| 🏰 ราชองครักษ์ (Tank) | pa_r1 | Shield Press | 3 | บล็อกได้ = ฟาดโล่ใส่ตัวที่ตี P.DEF x0.3/Lv | `j3Press` |
| | pa_r2 | Banding | 3 | ดาเมจเข้า −2%/Lv ต่อมอนที่ยังอยู่ (นับสูงสุด 5) | `j3Banding` |
| | pa_r3 | Earth Drive | 3 | ต้นเวฟ AoE P.DEF x0.4/Lv + เกราะแตก 1 เทิร์น | `j3EarthDrive` |
| | pa_r4 ★ | Inspiration | 1 | 1 ครั้ง/ไฟต์ HP < 30%: 3 เทิร์น Auto Guard = เพดาน + บล็อกฮีล 3% | `j3Inspire` |

- **แต้ม:** root 5 + 3 สาย (10 + 9 + 10) = 34 · ★ 3 ดวงได้ 2 → ลงได้ **33 vs pool 29** (ถมไม่หมด = มีทางเลือกจริง)
- **กันภาษีบังคับ:** legacy ทุกตัวมี **เพดาน** และอ่านแต้มที่ "ลงแล้ว" เท่านั้น ไม่บังคับให้ต้อง respec ใยเก่า
- helper ใหม่ใน `tree.ts`: `branchPts(tree, branchId)` = รวมแต้มของสาย (ใช้กับ legacy ทุกตัว + Awakening ในอนาคต)

## 5. Path: Pure / Hybrid (กฎแตกแขนงชั้น 3)

| | Pure ⚜️ | Hybrid 👊 |
|---|---|---|
| ใยชั้น 3 ของตัวเอง | ครบทุก tier + ★ | tier 1–2 เท่านั้น (pa_*1, pa_*2) |
| ใยชั้น 2 ของ sibling (Monk) | — | **ครึ่งแรก (tier 1–2)** ของ `trees2/monk.ts` |
| แต้มที่ลงได้ | 33 | root 5 + 18 + Monk 18 = **41** vs pool 29 |
| เหมาะกับ | ลงลึก Grand Cross / Tank | Crusader ที่อยากได้คอมโบ / โล่ต้นเทิร์น |

**Node Monk ที่ Hybrid ใช้ได้ (ต้อง audit hook ก่อน):**

| id | ผล | ใช้กับ Crusader ได้ไหม |
|---|---|---|
| mk_c1 หมัดไว | คอมโบ +9% | ✅ generic stat |
| mk_c2 หมัดหนัก | ฮิตคอมโบ +15% | ✅ generic stat |
| mk_i1 Meditate | Energy Shield เทิร์นที่ไม่โดนตี | ⚠️ เช็กว่า `j2Es` ไม่ได้ผูก `job2 === 'monk'` |
| mk_i2 ฝ่ามือธาตุ | ตีติดช้า | ⚠️ เช็ก hook เหมือนกัน |
| mk_d1 Darkness | ต้นเทิร์นโล่มืด | ⚠️ เช็ก `j2Dark` |
| mk_d2 กลืนเงา | ฆ่าแล้วฮีล | ✅ (`killHeal` generic) |

- ห้ามเปิด node ที่ต้องใช้ 🔵 ลูกพลัง / Falling Thunder / Tempest Bell (tier 3–4 อยู่แล้ว ไม่เข้าข่าย)
- กฎโค้ด: `treeMods()` ต้องอ่าน node ของ sibling ได้ · hook ต้องเช็ก **Stats flag** ไม่ใช่ `job2 ===`

## 6. Architecture (โค้ด) — เลียนแบบ job2 ทุกจุด

| ไฟล์ | สิ่งที่เพิ่ม |
|---|---|
| `src/data/jobs3.ts` (ใหม่) | `Job3Id = 'paladin'` (เพิ่มทีละตัว) · `JOB3: Record<Job3Id, Job3Def>` (`parent2: Job2Id`, signature, ult3, variants) · `JOB3_RULES = { maxJobLevel: 30, pointPerLv: 1, unlockClear: 'd10', pathSwapGems: 30, freeSwapPerWeek: 1 }` |
| `src/data/skill-math.ts` | `KIT3.paladin` (ตัวเลขทุกตัวของ §4) |
| `src/data/trees3/paladin.ts` (ใหม่) | ใยชั้น 3 · `line: 'job3'` ใน `WebLine` |
| `src/data/tree.ts` | root `crusader_u3p` · `TREE3`, `tree3Mods` · `branchPts()` · `lockReason(..., j3, path)` รองรับ Hybrid |
| `src/save.ts` | `job3? / job3Level? / job3Xp? / job3Points? / job3Tree? / job3Path?: 'pure' \| 'hybrid' / job3Var?: 'a' \| 'b' / job3SwapWeek?` · save เก่า = `undefined` ไม่ต้อง migrate · `job3Ready`, `changeJob3`, `resetTree3` · `addXp()` แตกไป job3 |
| `src/data/meta.ts heroStats()` | บวก `tree3Mods` + signature flag |
| `BattleScene.ts` | **ห้ามเพิ่ม if กระจาย** · เสียบผ่าน hook เดิม (`onBlock`/`hurtHero`, `ult2()` → อ่าน `j3*`, `skill3Turn()` → variant) |
| `JobScene` / `CharacterScene` | โหมด `{ job3: true }` · แท็บย่อย "ชั้น 1 / ชั้น 2 / ชั้น 3" · ตัวเลือก variant + path |
| `power.ts` | `JOB3_K: { paladin: 1.0 }` · legacy + Gospel ต้องนับใน `offense`/`survival` ไม่งั้น hard/tower/daily สเกลผิด |
| `tools/bot.cjs` | `JOB3=paladin J3LV= J3T= J3P=pure\|hybrid J3V=a\|b` |

## 7. งบพลัง (power budget)

- **ตื่นรู้ Lv 1 ≈ +8% Hero Power** (pulse +1 + Prestige) → รู้สึกได้ทันที
- **Job3 Lv 30 ใยเต็ม ≈ +20%** (ราวครึ่งของงบชั้น 2 ที่ +40–50%)
- power มาจาก "ขยายของเก่า" (legacy, pulse, เพดานบล็อก) **ไม่มี stat layer ใหม่** (บทเรียน RO Trait → rebalance 2 รอบ)
- **ห้าม nerf จาก bot อย่างเดียว** (bot เล่นแย่กว่าคน · Q clear D10 ก่อน Job2 max) → ต้องดู playtest ของ Q คู่กันเสมอ

## 8. Store / monetization check

- ✅ ปลด Paladin / Master Trial / แต้มชั้น 3 = **หาได้จากการเล่นเท่านั้น** · ไม่มี skip ด้วย 💎
- ✅ ไม่มีของสุ่มในระบบนี้ → ไม่ต้องเพิ่มใน odds page
- ✅ สลับ path มีทางฟรี (1 ครั้ง/สัปดาห์) · 💎30 = ความสะดวก
- ⚠️ ถ้าต่อ cap-break `powMax` 5→7 ด้วย Abyss Shard (งาน T10) ต้อง earn-only · **ห้ามขายใน shop** (= P2W)
- ⚠️ สไปรต์/ออร่าทองขายเป็น cosmetic ได้ทีหลัง แต่ร่างพื้นฐานต้องได้ฟรีตอนตื่นรู้

## 9. แผนงาน (หลัง closed beta · 1 แถว = 1 session)

| # | งาน | Done เมื่อ |
|---|---|---|
| P0 | วัด `JOB2_K.crusader` ด้วย bot + เทียบ save Q (งาน T3 ในรายงาน) | ค่าไม่ใช่ "first guess" แล้ว |
| P1 | Framework ชั้น 3: `jobs3.ts`, save fields, `job3Ready`, EXP → Job3, แท็บ "ชั้น 3", `JOB3_K = 1.0`, bot flags (ยังไม่มี content) | save เก่าโหลดได้ · bot รันผ่าน |
| P2 | ⚔️ Master Trial (duel เงา reuse engine D10) | ชนะแล้วปลด Paladin |
| P3 | Prestige + Gospel Cross + root `crusader_u3p` | bot clear D10 · ตัวเลขโชว์ในหน้าสกิล |
| P4 | Holy Cross variant A/B + UI เลือก | สลับในเมืองได้ · bot `J3V=a\|b` |
| P5 | ใยชั้น 3 `pa_*` 12 โหนด + `branchPts()` legacy | ทุกโหนดมีผลใน battle log |
| P6 | Hybrid: เปิด Monk tier 1–2 + audit hook `j2Es` / `j2Dark` / `j2Chill` | Crusader Hybrid ใช้ node Monk ได้จริง |
| P7 | Calibrate `JOB3_K.paladin` (bot + Q playtest) | ≈ +20% ที่ max · อัปเดต doc นี้ |

ถ้า P3 หรือ P5 เกิน 1 session → แยก signature/Ult ออกจากใย แบบที่ rollout ชั้น 2 ทำ

## 10. คำถามเปิด

1. ~~Job2 Lv 50 / Base 99 เป็นเพดานสุดท้ายไหม~~ → ✅ ใช่ (Q 2026-11-08)
2. ~~ใช้ร่างเดิม + ออร่าทอง ⚜️ ไปก่อนได้ไหม~~ → ✅ ได้ (Q 2026-11-08)

ชื่อ "Paladin" เป็นชื่อชั่วคราว Q เปลี่ยนได้เลยค่ะ (ตัวเลือก ref RO: Royal Guard / Imperial Guard)

**สถานะ:** spec พร้อมแล้ว · รอหลัง closed beta แล้วเริ่มที่ P0

## 11. บันทึกผล P0–P1 (2026-11-08)

### P0 — วัด `JOB2_K.crusader` ด้วย bot
- ตั้งค่า: `D=6 CRAFTED=1 EXTRA=1 REFINE=7 TMO=150000` · Base 45 · Job2 Lv 50 preset web · 6 รอบ/แถว

| build | Hero Power | โหมด | ชนะ | minHp เฉลี่ย | ฟื้น |
|---|---|---|---|---|---|
| Priest (ไม่มีขั้น 2) | 379 | D6 ปกติ | 0/8 | 0% | — |
| Priest (ไม่มีขั้น 2) | 379 | D6 HARD | 0/6 (ตายห้อง 1) | 0% | — |
| Crusader | 476 | D6 ปกติ | 6/6 | 62% | 0 |
| Crusader | 476 | D6 HARD | 6/6 | 21% | 2 |
| Knight (อ้างอิง, K=1) | 759 | D6 HARD | 5/6 | 35% | 2 |

- HARD สเกลมอนตาม Hero Power → ถ้า K ถูก ทุกสายควรชนะใกล้กัน · Crusader 6/6 vs Knight 5/6 = **ต่างกัน 1 รอบ อยู่ใน noise → คง 1.05**
- ⚠️ เจอระหว่างทาง (ไม่ใช่งานนี้): **Priest ขั้น 1 ที่ D6 แพ้หมดทั้งปกติและ HARD** → `CLASS_K.cleric` 1.8 น่าจะนับสูงไป หรือชุด bot ของ Priest อ่อน · ห้าม nerf/buff จาก bot อย่างเดียว ต้องดู playtest จริงประกอบ
- n=6 ยังน้อย · Crusader ของ Q (Power 825 clear D10 ที่ Base 44) บอกว่าคนจริงเล่นได้แรงกว่า bot อยู่แล้ว

### P1 — Framework ชั้น 3 (ยังไม่มี content)
- `src/data/jobs3.ts`: `Job3Id = 'paladin'`, `JOB3`, `JOB3_RULES` (Job2 Lv 50 + ดัน 10 + Master Trial · Job3 Lv max 30 · สลับ path ฟรี 7 วัน/ครั้ง ไม่งั้น 💎30), `activeJob3()`
- `src/save.ts`: field `job3 / job3Level / job3Xp / job3Points / job3Tree / job3Path / job3Var / job3SwapAt / job3Trial` (save เก่า = undefined ไม่ต้อง migrate) · `job3Ready`, `job3Lock`, `changeJob3`, `resetTree3`, `job3SwapCost`, `setJob3Path`, `setJob3Variant`
- EXP: ตื่นรู้แล้ว Job EXP ไหลเข้า Job3 (1 แต้ม/Lv) · เปลี่ยน job2 = ชั้น 3 **พักไว้** (ไม่ได้ EXP, ไม่หาย) กลับมาก็ใช้ต่อ
- `power.ts`: `JOB3_K = { paladin: 1 }` คูณใน `powerParts` (ยังไม่เพิ่ม power จนกว่าจะมี content)
- analytics: `level_up` kind `job3` + FTUE step `job3`
- bot: `JOB3=paladin J3LV= J3P=pure|hybrid J3V=a|b J3T=` (ตั้ง Master Trial + ดัน 10 ให้เอง)
- test: `tests/jobs3.test.ts` (5) · ทั้งชุด 218/218 ผ่าน
- **ย้ายไปทำทีหลัง:** UI (JobScene ปุ่มตื่นรู้, แท็บ "ชั้น 3") → ทำพร้อม P2/P5 เพราะตอนนี้ยังไม่มีใครปลดล็อกได้ (ต้องชนะ Master Trial ก่อน)
