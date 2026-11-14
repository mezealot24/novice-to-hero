# Beastmaster Rework v1 — Gap Spec

> สถานะ: **Q ตัดสินแล้ว (§7) · เริ่ม Phase 0–1** · 2026-11-14
> ที่มา: ดีไซน์ "Awakening Beastmaster (Rework v1)" + โค้ด 8 ไฟล์ที่ส่งมา (เวอร์ชันเรียลไทม์)
> เทียบกับ: `src/battle/allies.ts`, `src/scenes/BattleScene.ts` (§ Phase 4 Archer), `src/data/trees2/beastmaster.ts`, `KIT2.beastmaster` ใน `src/data/skill-math.ts`, `docs/design/second-jobs-v1.md` §4

---

## 0. สรุปสั้น (so what)

- ดีไซน์ใหม่ **เขียนมาสำหรับเกมเรียลไทม์** (ASPD, วินาที, `update(dt)`) แต่เกมเรา **ผลัดกันเล่น** (เกจ, เทิร์น)
- กลไก ~70% **มีของเดิมรองรับอยู่แล้ว** (stun, poison=bleed, blind, huntMark, shield, cleanse, taunt) → ต้องแปลงหน่วยจาก "วินาที" เป็น "เทิร์น"
- ของใหม่จริง ๆ มี 4 อย่าง: **Grit gauge**, **แบ่งดาเมจเป็น %**, **สัตว์ครบ 3 ตัวตลอด**, **Ult แบบ Awakening หลายเทิร์น**
- โค้ด 8 ไฟล์ที่ส่งมา: **ห้ามคัดลอกทับ** ใช้ได้แค่เป็น reference เท่านั้น (ดู §5)

---

## 1. ตารางเทียบกลไก

ตัวย่อ: ✅ ใช้ของเดิม · 🔧 ต้องปรับ/ต่อเติม · 🆕 สร้างใหม่ · ❌ ตัด/ไม่แนะนำ

### 1.1 🐗 หมูป่า (Tank / Interceptor)

| กลไกในดีไซน์ | ตอนนี้ในเกม | ผล | แปลงเป็นระบบเทิร์น |
|---|---|---|---|
| HP ของตัวเอง = 120%+ ของ HP ฮีโร่ | `boarHp: 0.4` + `j2BoarHp` + ★ `boarEvoHp` | 🔧 | ปรับตัวเลขเท่านั้น (120% แรงกว่าเดิม 3 เท่า → ต้องลด HP หรือลดการรับดาเมจลง) |
| **รับดาเมจแทน X%** (แบ่งดาเมจทุกฮิต) | `taunt: 0.6` = **ทอยเต๋า** รับดาเมจ *ทั้งก้อน* หรือไม่รับเลย (`tauntTarget`) | 🆕 | เพิ่ม `share` ใน `AllyDef` → `allyTaunt()` แบ่ง `floor(dmg × share)` ไปที่หมูป่า ที่เหลือเข้าฮีโร่ |
| ดาเมจที่หมูป่ารับ −30% | หมูป่ารับดาเมจดิบ ไม่ผ่าน DEF (`hurtAlly`) | 🆕 | `× (1 − boarCut)` ก่อนเรียก `hurtAlly` |
| **Grit gauge** สะสมเมื่อโดนตี → เต็มแล้วพุ่งชน | พุ่งชนตามเวลา: ทุก `boarEvery: 3` เทิร์นฮีโร่ | 🆕 | เพิ่ม `grit` ใน `Ally` · `+= boarDmg / maxHp × gritK` · ≥100 → `act()` · **เลือก: แทนที่ หรือ ใช้คู่กับ** `boarEvery` (คำถาม Q3) |
| พุ่งชน = ดาเมจ + Stun 1.5s | `hitFront(boarMul)` + `stun(false)` | ✅ | stun 1.5s → "เสียเทิร์นถัดไป 1 เทิร์น" (ของเดิม) · บอส = `boarPush` เกจ |
| พุ่งชนให้ Shield ฮีโร่ | `j2BoarShield` (bm_b3) | ✅ | มีอยู่แล้ว |
| ตาย → พักฟื้น 6s แล้วฟื้นพร้อมพุ่งชน | ตาย = หายไปจนจบเวฟ | 🆕 | `recoverTurns` (เช่น 3 เทิร์นฮีโร่) แล้ว `dead=false`, `hp=maxHp`, `act()` 1 ครั้ง |
| HP หมูป่า >50% → ฮีโร่ได้ Status Resist | ไม่มี | 🔧 | ต่อกับระบบต้านดีบัฟของฮีโร่ (ต้องเช็คว่ามี `statusRes` ใน Stats หรือยัง) |
| แถบ HP + Grit ใต้ตัว | `syncAlly` แสดงแค่ไอคอน + ตัวเลข HP | 🔧 | เพิ่มแถบเล็ก ๆ ใน `syncAlly` หรือเติม `⚡NN` ต่อท้าย text ก็พอ (MVP) |
| ข้อความ `GUARD -XX` สีส้ม + เส้นเชื่อม | `damageNumber(..., '#bfe6ff')` | 🔧 | เปลี่ยนสี/ใส่ label เส้นเชื่อม = VFX ใหม่ (ไม่จำเป็นใน MVP) |

### 1.2 🐺 หมาป่า (Bleed DPS / Finisher)

| กลไกในดีไซน์ | ตอนนี้ในเกม | ผล | แปลงเป็นระบบเทิร์น |
|---|---|---|---|
| ขย้ำตาม ASPD ฮีโร่ | `trigger: 'ownTurn'` × `wolfSpeed` × ความเร็วฮีโร่ | ✅ | **ตรงกันแล้ว** (AGI = ASPD ของเกมเรา) |
| Bleed ซ้อนได้ 5 ชั้น | `poison` stacks (`wolfBleed: 2`, `j2WolfBleed`) | ✅ | Bleed = poison เดิม · cap 5 = **เลือก** (poison ตอนนี้ไม่มี cap?) |
| Bloodscent Frenzy: +ASPD ต่อชั้น Bleed (ฮีโร่ + สัตว์) | ไม่มี | 🆕 | `speedMul` ฮีโร่ + `speed()` หมาป่า อ่านจาก `front.poison` · **ระวัง** speed ฮีโร่กระทบทั้งเกม (balance) |
| Savage Crunch: ทุกฮิตที่ 3 / เป้าติด Mark / HP<35% → คริ 100% + ดูดเลือด | ไม่มี (มี ★ พรานแห่งป่า: ฮีโร่คริ → สัตว์ตีซ้ำ) | 🆕 | ใช้ `a.acts % 3` · เช็ค `m.huntMark > 0` · `m.hp/def.hp < 0.35` · heal ฮีโร่ + หมูป่า · **Q rule: ally hit ไม่มี lifesteal** → ต้องเป็น heal ตรงแยก (คำถาม Q4) |
| ตามฮีโร่ตอนคอมโบ | `comboFollow: true` | ✅ | มีอยู่แล้ว |

### 1.3 🦅 เหยี่ยว (Mark / Disrupt)

| กลไกในดีไซน์ | ตอนนี้ในเกม | ผล | แปลงเป็นระบบเทิร์น |
|---|---|---|---|
| โฉบทุก 3.4s | Blitz Beat: **โอกาส %** ทุกครั้งที่ฮีโร่ตี (`heroBasic`, `hawkChance` + LUK) | 🔧 | คง Blitz Beat เดิมไว้ (อัตลักษณ์ RO + LUK build) · **ไม่แนะนำ** เปลี่ยนเป็นตามเวลา |
| ไม่มี HP, ตีไม่โดน | `hp` ไม่มี = ตีไม่ได้ · `sure` = ไม่พลาด | ✅ | ตรงกันแล้ว |
| Prey Mark: +Crit DMG ที่ได้รับ, −DEF 15% | `huntMark` (Archer หมายหัว: +`arMark` ดาเมจที่ได้รับ) + `armorBrk` (🦴) | 🔧 | ใช้ `huntMark` ซ้ำ หรือแยก `preyMark` (คำถาม Q2) · ลด DEF ใช้ `armorBrk` ที่มีอยู่ |
| Razor Gust: ทุกครั้งที่ 3 → Blind | `blind` (Crusader: Hit −`blindHit`) | ✅ | ใช้ `m.blind` เดิม (มี icon 🙈 + ลดเทิร์นให้แล้ว) · "โอกาสพลาด 35%" ≈ Hit ลด → ไม่ต้องสร้าง miss roll ใหม่ |
| Apex Spotter: Mark สำเร็จ → หมาป่ารีเซ็ตคูลดาวน์ + Crit ทีม +15% | ไม่มี | 🆕 | "รีเซ็ตคูลดาวน์" = `wolf.gauge = 100` (ได้เทิร์นทันที) · Crit +15% = stat modifier ปกติ |

### 1.4 🤝 Synergy

| กลไกในดีไซน์ | ตอนนี้ในเกม | ผล | หมายเหตุ |
|---|---|---|---|
| สัตว์ **ครบ 3 ตัวในสนามตลอด** | เลือก 1 ตัวหลัก (`this.pet`) + ★★ ตัวที่ 2 (`secondPow 0.5`) หรือ ★ `bm_k4` ฝูงพันธมิตร (ครบ 3 ตัว, ตัวรองแรง 35%) | ❌/🔧 | **ใหญ่สุด** — เปลี่ยน identity ของคลาส (คำถาม Q1) |
| Tri-Beast Harmony: ATK +X% ต่อสัตว์ที่อยู่ | `j2PetPow` (ใจเดียวกัน) + `j2PackLead` (ผู้นำฝูง: ฮีโร่แรงต่อสัตว์ที่อยู่) | ✅ | มีอยู่แล้ว 2 node |
| ลูกโซ่: เหยี่ยว Mark → หมาป่าโจมตีเป้า Mark → ฮีลหมูป่า | ไม่มี | 🆕 | ต้องมี 1.1 (หมูป่ามี HP ให้ฮีล) + 1.3 (Mark) ก่อน |

### 1.5 👑 Ultimate

| กลไกในดีไซน์ | ตอนนี้ในเกม | ผล | แปลงเป็นระบบเทิร์น |
|---|---|---|---|
| ระเบิดครั้งเดียว → **Awakening 8s** | 🐾 Stampede: 3 สัตว์ตี 1 ครั้ง + pierce shot (`stampede()`) | 🆕 | 8s → **N เทิร์นฮีโร่** (เสนอ 3) · ต้องมี state `awakenTurns` ในฉาก |
| คำราม: Cleanse ฮีโร่, Stun ศัตรูทุกตัว, ฮีลหมูป่า 100% | มี `cleanseOne()`, `stunMon()`, `beastRoarFx` | ✅ | ประกอบจากของเดิม |
| ระหว่าง Awakening: หมูป่ารับแทน 70% + สะท้อน | — | 🆕 | ต้องมี `share` จาก 1.1 ก่อน · สะท้อนดาเมจมีตัวอย่างใน `m.reflect` / 🔁 กระจก |
| เหยี่ยว ×2, Mark ไม่ลดเวลา | — | 🔧 | `hawkChance × 2` ตอน awaken · ไม่ลดเวลา `huntMark` ขณะ `awakenTurns > 0` |
| หมาป่าตามทุกการตีปกติของฮีโร่ | `comboFollow` (ตามแค่ตอนคอมโบ) | 🔧 | ขณะ awaken: หมาป่าเป็น `heroBasic` ด้วย |
| ท่าปิด Tri-Beast Finisher: ดาเมจ + โบนัสตาม Bleed + ดาเมจที่หมูป่ารับไว้ | Stampede เดิม ≈ ท่าปิดนี้อยู่แล้ว | 🔧 | ย้าย `stampede()` ไปเล่นตอน awaken หมด · บวก `poison × k` + `absorbed` |

---

## 2. Skill tree / Save data

| เรื่อง | ไฟล์ที่ส่งมา | ข้อเท็จจริง | ข้อเสนอ |
|---|---|---|---|
| Schema | `BeastSkillNode` แบบ custom (`descFn`, `mechanics`) | เกมใช้ `ClassTree` (`node()`, `talent()`) + stat keys `j2*` | **คง `ClassTree`** · เพิ่ม stat keys ใหม่ใน `Stats` |
| Node IDs | `bm_boar_guardian`, `bm_wolf_crunch`, ... | ID เดิม `bm_h1..bm_s4` + talents **เป็น save data — ห้ามเปลี่ยนชื่อ** | **คง ID เดิม** เปลี่ยนแค่ชื่อ/คำอธิบาย/สิ่งที่ node ให้ |
| โครงสาย | 3 สายสัตว์ + synergy + ult (11 node) | 5 สาย × 4 node + 12 talents | map สายใหม่ลงสายเดิม (ดูตารางด้านล่าง) |
| Active skill ใน tree | Tusks of Fury / Razor Gust (มี CD, mana) | Active อยู่ที่ skill 3 (📯 สั่งลุย, Energy) ไม่ใช่ใน tree | กลไกพวกนี้ทำเป็น **passive proc** แทน |

Mapping ที่เสนอ (ID เดิม → ความหมายใหม่):

| ID เดิม | ตอนนี้ | → Rework |
|---|---|---|
| `bm_b1` | หนังหนา (HP) | Guardian: share % + HP |
| `bm_b2` | เขี้ยวงัด (แรงพุ่งชน) | Tusks of Fury: แรงพุ่งชน + Grit เร็วขึ้น |
| `bm_b3` | คุ้มกันนาย (โล่) | คงเดิม |
| `bm_b4` ★ | หมูป่าเกราะ | Ironhide Recovery: ฟื้นคืนชีพ + status resist |
| `bm_w1` / `bm_w2` / `bm_w3` | กัดแรง / bleed / เร็ว | คงเดิม · `bm_w3` เพิ่ม Frenzy |
| `bm_w4` ★ | ราชาหมาป่า | Savage Crunch |
| `bm_h1` / `bm_h2` | โอกาส / แรง | คงเดิม |
| `bm_h3` | โฉบฝูง (+1 เป้า) | Razor Gust (ครั้งที่ 3 → Blind) |
| `bm_h4` ★ | เหยี่ยวทอง | Apex Spotter (Prey Mark → หมาป่าได้เทิร์น) |
| `bm_k4` ★ | ฝูงพันธมิตร | Tri-Beast Harmony chain |
| `bm_t2_ult` | ฝูงคลั่ง | Awakening แรงขึ้น / นานขึ้น |

> ⚠️ ถ้าเปลี่ยนความหมาย node ที่ผู้เล่นลงแต้มไปแล้ว → แต้มยังอยู่ แต่ได้ผลคนละแบบ · พิจารณา **รีเซ็ตแต้มสาย Beastmaster ฟรี 1 ครั้ง** (save migration guard ตาม AGENTS.md)

---

## 3. ตัวเลข (data-driven)

- ตัวเลขทุกตัวไปอยู่ใน `KIT2.beastmaster` (ห้ามเขียนตายใน `allies.ts`/ฉาก แบบไฟล์ที่ส่งมา)
- Key ใหม่ที่เสนอ (ค่าเป็นแค่จุดเริ่ม ต้องจูนต่อ):

| key | ความหมาย | ค่าเริ่ม |
|---|---|---|
| `boarShare` / `boarShareMax` | สัดส่วนดาเมจที่หมูป่ารับ | 0.35 / 0.5 |
| `boarCut` | หมูป่าลดดาเมจที่รับ | 0.3 |
| `gritK` | Grit ต่อ (ดาเมจที่รับ / maxHp) | 140 |
| `boarRecoverTurns` | เทิร์นพักฟื้น | 3 (★ 2) |
| `bleedCap` | ชั้น bleed สูงสุด | 5 |
| `frenzySpd` | speed ต่อชั้น bleed | 0.03 |
| `crunchEvery` / `crunchLowHp` | ทุกครั้งที่ N / เกณฑ์ HP | 3 / 0.35 |
| `gustEvery` | Blind ทุกการโฉบครั้งที่ N | 3 |
| `awakenTurns` / `awakenShare` | ระยะ Ult / หมูป่ารับแทน | 3 / 0.7 |

---

## 4. VFX

| ไฟล์ | ตอนนี้ | ไฟล์ที่ส่งมา | ข้อเสนอ |
|---|---|---|---|
| `gfx/fx/beast/hawk-dive.ts` | pixelfx 404 บรรทัด (baked) | Phaser Graphics 123 บรรทัด | **คงของเดิม** |
| `claw-slash.ts` | pixelfx 188 | Graphics 109 | คงของเดิม · ถ้าอยากได้ "เขี้ยวขบ" ของ Savage Crunch → ทำเป็น palette/variant ใน pixelfx |
| `boar-charge.ts` | pixelfx 358 | Graphics 156 (+ `playBoarGuardVfx`) | คงของเดิม · **ของใหม่ที่ควรทำ:** `boar-guard` (โล่หกเหลี่ยม) เป็นโมดูล pixelfx ใหม่ |
| `beast-roar.ts` | pixelfx 256 | Graphics 56 | คงของเดิม · banner "PRIMEVAL AWAKENING!" ใช้ `callout()` ที่มีอยู่ |
| `stampede.ts` | pixelfx 374 | Graphics 63 | คงของเดิม |
| `battle/ranger-vfx.ts` | `playPfx` + `RANGER_FX` | `triggerBeastSkillVfx` + `Record<string, any>` | คงของเดิม · เพิ่ม `boarGuardFx()` อย่างเดียว |

VFX ใหม่ที่ต้องมีจริง: **boar-guard** (ตอนแบ่งดาเมจ) + **prey-mark** (หรือใช้ `huntMarkOn` เดิม)

---

## 5. ไฟล์ 8 ไฟล์ที่ส่งมา — ใช้อะไรได้บ้าง

| ไฟล์ | ใช้ได้ | ใช้ไม่ได้ เพราะ |
|---|---|---|
| `allies.ts` (BeastPackController) | สูตรแบ่งดาเมจ, Grit, การนับ Crunch → เอาไป **reference** | real-time `update(dt)`, ไม่มี turn/gauge, ทับไฟล์ ally กลางที่ Monk/Innovator ใช้ร่วม |
| `beastmaster.ts` (tree) | ชื่อสกิล + ไอเดียคำอธิบาย | schema ผิด, ID ใหม่ทำเซฟพัง |
| `ranger-vfx.ts` | — | ทับฟังก์ชันที่ฉากเรียกอยู่ (`petHitFx`, `stampedeFx`, …), ใช้ `any` |
| 5 ไฟล์ VFX | ไอเดีย boar-guard / jaw clamp | คุณภาพต่ำกว่าของเดิม (pixelfx) |
| snippet BattleScene | — | `hero.getSkillLv`, `hero.jobId`, `showFloatingText`, `aspdMultiplier`, `update(time, delta)` **ไม่มีในโค้ด** |

---

## 6. ลำดับทำที่เสนอ (ถ้าอนุมัติ)

| # | Phase | ขอบเขต | ขึ้นกับ |
|---|---|---|---|
| 0 ✅ | Pack lineup | สัตว์ครบ 3 ตัวทุกเวฟ · ลด `pow` ต่อตัว · ปิดทาง "2★ = ตัวที่ 2" / `bm_k4` เดิม | — |
| 1 ✅ | Boar Guardian | `share` + `boarCut` + Grit + พักฟื้น + แถบ Grit | 0 |
| 2 ✅ | Wolf | Frenzy + Savage Crunch (bleed cap = `poisonMax` เดิม, ไม่ตั้ง 5 ใหม่) | — |
| 3 | Hawk | Prey Mark + Razor Gust (blind) + Apex Spotter | — |
| 4 | Synergy chain | Mark → Crunch → ฮีลหมูป่า | 1–3 |
| 5 | Ult Awakening | `awakenTurns` + finisher (ใช้ `stampede()` เดิม) | 1–3 |
| 6 | Tree text + migration | ชื่อ/คำอธิบาย node + รีเซ็ตแต้มฟรี | 1–5 |
| 7 | VFX boar-guard | โมดูล pixelfx ใหม่ | 1 |

แต่ละ phase = 1 commit + test เฉพาะไฟล์ (`tests/` ตามที่มี) + `npm run typecheck`

---

## 7. ✅ คำตัดสินของ Q (2026-11-14)

| # | คำตัดสิน | ผลต่อสเปก |
|---|---|---|
| **Q1** | **ครบ 3 ตัวตลอด** + เลือกเชี่ยวชาญ 1 ตัวได้ | ดู §7.1 |
| **Q2** | ตามที่ตุ๊กตาแนะนำ | **ใช้ `huntMark` ร่วม** (timer, icon 🏷️, `huntMarkOn` VFX) · แต่โบนัสดาเมจตอนนี้อ่าน `st.arMark` อย่างเดียว (BattleScene ~L2808) → Beastmaster ไม่มี node นั้น = 0% · แก้เป็น `max(st.arMark, preyMark)` โดย `preyMark` = key ใหม่ใน `KIT2.beastmaster` ที่ได้เมื่อเหยี่ยวแปะ · ลด DEF ใช้ `armorBrk` เดิม |
| **Q3** | **ใช้คู่กัน** | หมูป่ายังพุ่งทุก `boarEvery` เทิร์น **และ** พุ่งเพิ่มเมื่อเกจเต็ม (เกจไม่รีเซ็ตตอนพุ่งตามรอบ) |
| **Q4** | **Heal แยก** | Savage Crunch ฮีลฮีโร่ + หมูป่า = `crunchHeal × ดาเมจ` ผ่าน `heal()` ตรง ไม่ใช่ lifesteal (กฎ ally ไม่มี lifesteal ยังอยู่) |
| **Q5** | **Awakening แบบใหม่** · ไม่เอาดาเมจก้อนใหญ่ | ค่าของ Ult มาจาก **สถานะหลายเทิร์น** ไม่ใช่ตัวเลขปิดท้าย · ดู §7.2 |

### 7.1 สัตว์ครบ 3 + ความเชี่ยวชาญ (Q1)

- **ทุกเวฟ:** เหยี่ยว + หมูป่า + หมาป่า อยู่ครบ · `pow` ต่อตัวต้องลด (ครบ 3 ตัวที่แรงเต็ม = บัฟใหญ่)
- **ช่องเชี่ยวชาญ = ทาเลนต์แถว IV** (เลือกได้ 1 จาก 3 อยู่แล้ว, ID เดิม → เซฟปลอดภัย):

| ทาเลนต์ (ID เดิม) | ตอนนี้ | → เชี่ยวชาญ |
|---|---|---|
| `bm_t4_hawk` | Blitz Beat โอกาส + แรง | 🦅 Blitz Beat เป็น **True Damage** (ไม่ผ่าน DEF) |
| `bm_t4_wolf` | กัดแรง + เร็ว | 🐺 Bleed ทำดาเมจ **+% Max HP ศัตรู** · **cap ต่อบอส** (เช่น ≤ X × P.ATK) |
| `bm_t4_boar` | HP + พุ่งชนแรง | 🐗 พุ่งชน **Stun ทั้งแถว** (`stun(true)`, บอสยังเป็น gauge push) |

- **ของเก่าที่หมดหน้าที่ (ห้ามลบ field ที่เป็นเซฟ):**
  - `s.pet` (ตัวเลือกใน `character/web-tier2.ts`) → ไม่ใช้เลือก lineup แล้ว · เก็บ field ไว้ · ตัวเลือก UI ซ่อน/เปลี่ยนเป็นแค่ข้อมูล
  - `secondPow` + ทาง "2★ = ตัวที่ 2" ใน `waveAllies` → ลบ logic (ไม่ใช่ข้อมูลเซฟ)
  - `bm_k4` ★ ฝูงพันธมิตร (`j2Pack3`) → เปลี่ยนเป็น **Tri-Beast Harmony chain** (Phase 4)
  - ★ วิวัฒน์ 3 สาย (`bm_h4/b4/w4`) ยังเป็นอัปเกรดของแต่ละตัว (cap 2★ เดิม)

### 7.2 Ult — Call of the Primeval Pack (Q5)

- **เปิด:** `beastRoarFx` · cleanse ฮีโร่ · ฮีลหมูป่าเต็ม / ปลุกจาก `down` · stun ทุกตัว (บอส = gauge push)
- **`awakenTurns` เทิร์นฮีโร่ (เสนอ 3):**
  - 🐗 รับแทน `awakenShare` (70%) + สะท้อนคลื่นกระแทก (cap `BATTLE.reflectCap`)
  - 🦅 Blitz Beat โอกาส ×2 · `huntMark` ไม่ลดเวลา
  - 🐺 กัดตามทุกการตีปกติของฮีโร่
- **ปิด:** ไม่มีดาเมจก้อนใหญ่ · ปิดด้วย **utility** (เช่น โล่ฮีโร่ตาม % ดาเมจที่หมูป่ารับไว้) + `stampedeFx` เป็นแค่ภาพ
- `stampede()` เดิม (ตี 3 ครั้ง + pierce) → ถูกแทนที่

### 7.3 กับดักที่เจอตอนอ่านโค้ด (Phase 1)

- **จุดแบ่งดาเมจ:** `allyTaunt()` รันก่อน dodge/blind/block แล้วกลืนทั้งฮิต → **คงไว้สำหรับ Bell / ไก่ยาง** · หมูป่าเลิกใช้ `taunt` แล้วไปแบ่งหลังคำนวณ `n` (ฮิตโดนจริง) → ส่วนของฮีโร่ยังผ่าน Kyrie/shield ตามปกติ · ต้องมี `src` เสมอ (DoT ไม่ถูกแบ่ง)
- **พักฟื้นห้ามใช้ `dead`:** `liveAllies()` กรองทิ้ง + `syncAlly` ลบ text → ใช้ state `down` + นับถอยหลังแยก · `tauntTarget`/ทางแบ่งดาเมจ/`livePets()` ต้องข้ามตัวที่ `down`
- **ชื่อชน:** `monkGrit` / `j2GritRate` (Monk แรงฮึด) มีอยู่แล้ว → เกจหมูป่าใช้ชื่อ **`rage`** (`boarRage*`)
