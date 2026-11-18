# Main rework vs Rev 4 / P2 — เทียบกลไก + แผน reuse (P2')

> **ฐาน:** branch `claude/thief-p2-v2` · tree = `origin/main` เป๊ะ (P1 merge แล้วผ่าน PR #129 `5a48d17`) · 2026-11-19
> **เลขบรรทัด** = โค้ดปัจจุบันใน worktree นี้ (`BattleScene.ts` ถ้าไม่ระบุไฟล์) · ฝั่ง P2 อ้าง **section** ของ spec (เลขบรรทัดใน R4.6 / spec เป็นของ base เก่า `c4327f5` ใช้ไม่ได้แล้ว)
> **ไฟล์นี้ชนะ** `INTEGRATION.md` และ P2a–P2d-spec เมื่อขัดกัน · spec ใหม่ของ P2' ต้องเขียนจากไฟล์นี้

## สรุป (5 บรรทัด)
1. main (live) ทำ "พิษ + เงา" ไปเยอะแล้ว: พิษสเกล P.ATK/M.ATK · %HP bite · cap 20 · DEF shred · ระเบิดพิษ chain · 👤 เกจเงา/ร่างเงา · 🔻 หมายหัว · 💰 steal · 🔁 Rogue Combo Point
2. 36 กลไก: **ซ้ำ 8 · ชน 9 · เสริม 6 · เฉพาะ main 2 · เฉพาะ P2 11** (+ 18 id legacy ที่ P2 ใช้ซ้ำ แยกตาราง §1.8 ไม่นับรวม)
3. Default = **เก็บ main** · เอาจาก P2 เฉพาะที่ main ไม่มี: core column รวม · status layer (Exposed/Wound/B1) · ม่านควัน/แผลลึก · ult-line + talents แทน flat · สาย INT
4. โค้ด P2 เก่า (`origin/claude/thief-p2`): ไม่มี commit ไหน cherry-pick ได้ตรง ๆ · เอา `src/` ไปได้เกือบทั้งก้อน 3 ตัว · rewrite 12 · ทิ้ง 3 (+ P1 ฉบับเก่า 12 ตัว)
5. ⚠️ ร่างเงาคริแน่ทำ Ult ×1.6 ตอนเปิด → ตาราง budget P2c ใช้ไม่ได้ · เกณฑ์ stack 8/10/14 ที่ตั้งตอน cap 12 กลายเป็น flat → **P2' = 4 สไลซ์ 26 commit (เดิม 39)**

---

## 0) Legend

| Verdict | ความหมาย |
|---|---|
| `ซ้ำ` | ไอเดียเดียวกัน → เก็บของ main · ทิ้งส่วนของ P2 |
| `ชน` | id เดียวกัน หรือช่องเดียวกัน แต่ออกแบบต่างกัน → ต้องตัดสิน (§2) |
| `เสริม` | ใช้ด้วยกันได้ |
| `เฉพาะ main` | main มี P2 ไม่มี → P2' ต้องเคารพ / ใช้ร่วม |
| `เฉพาะ P2` | main ไม่มี → P2' ทำต่อได้ |

---

## 1) Mechanic map

### 1.1 พิษ (Poison)
| # | main (live) · file:line | P2 / Rev 4 · section | Verdict | ทำอะไร |
|---|---|---|---|---|
| P1 | พิษ/stack = `poisonDmg` + `atkPer` 0.04 × P.ATK + `matkPer` 0.04 × M.ATK · `skill-math.ts:111-112` · `thiefPoisonPerStack` `:173` | P2d `thief_v2` Contaminate มีเทอม M.ATK แยก (`thiefDetMatkLv`, `thiefDetFlatBase/Lv`) · P2d §1.1 B | `ซ้ำ` | ทิ้งเทอม M.ATK ของ Contaminate (M.ATK เข้าพิษผ่าน `matkPer` แล้ว) |
| P2 | `KIT.poison.intPer` 0.1 `skill-math.ts:113` | P2d §8 ข้อ 1 (INT → `poisonDmg` 0.1/pt) | `ซ้ำ` | ตรงกันแล้ว · ใช้ key ของ main |
| P3 | `baseCap` 20 `skill-math.ts:114` · `poisonCapOf` `:180` | P2d §1.1 F `wisPoisonCap` +1/8 WIS (≤ +16) | `ชน` | §2 |
| P4 | DEF shred 1%/stack cap 40% · `poisonDefCut` `skill-math.ts:176` · ใช้ที่ `BattleScene.ts:1358` | P2a §T3 `thief_a1` `thPoisonPen` +6%/lv (Enchant Poison) | `ซ้ำ` | ทิ้ง `thPoisonPen` |
| P5 | %HP bite: stack × (0.5% + 0.1%/10 INT) × max HP + 2 ขณะ HP > 50% · `skill-math.ts:120` · tick `:4273` · `hero-stats.ts:301` | P2d §1.2 Venom Melt + Toxic Seep (W2) | `ซ้ำ` | ทิ้ง Venom Melt / Toxic Seep ถาวร |
| P6 | 💣 `thief_a4` ระเบิดพิษ: ส่ง 100% + blast ×1.5 ลูกโซ่ได้ · `trees/thief.ts:26` · `skill-math.ts:123` · `:4182-4188` | P2a §T3/T5 ระเบิดพิษลาม (0.6 + Plague Burst ไม่ chain) | `ซ้ำ` | เก็บ main · ทิ้ง `thiefSpreadShare`, `thiefPlague*`, `plagueBursting` |
| P7 | 🐌 `thief_a2` พิษชา: `poisonDmg` + chill เมื่อ stack ≥ `slowAtLv` · `trees/thief.ts:24` · `skill-math.ts:116` · `:4277` | P2a §T3 `thief_a2` พิษกัดลึก (`poisonDmg` + `vsPoison` 0.08/lv) | `ชน` | §2 |
| P8 | `thief_a3` พิษสะสม `poisonCap` +3/lv · `trees/thief.ts:25` | P2a §T3 พิษทนทาน (cap + `thToxicHold` + `thStrikePoison`) | `ซ้ำ` | เก็บ main · ทิ้ง hold + strikePoison |
| P9 | `thief_a1` เคลือบพิษ พิษ +lv/hit · `trees/thief.ts:23` | P2a §T3 เคลือบพิษอาบคม (ส่วนพิษ) | `ซ้ำ` | เก็บ main (ส่วน pen ดู P4) |
| P10 | `addPoison()` ประตูเดียว + overflow · `:5065-5073` | — | `เฉพาะ main` | ทุก stack ใหม่ของ P2' ต้องผ่าน `addPoison()` |
| P11 | 💥 `mb_p4` พิษล้น · `trees2/mobster.ts` · `overflowMul` `skill-math.ts:117` | — | `เฉพาะ main` | ห้ามแตะ (กติกา Mobster) · cap ที่ใหญ่ขึ้น = overflow น้อยลง |
| P12 | ทวงหนี้ `burstKeep` 0.5 `skill-math.ts:124` · `:2410-2412` | P1 `debtBursting` (live) | `เสริม` | ✅ อยู่ด้วยกันแล้ว |
| P13 | `thief_l2` เลือดพิษ `poisonLeech` ไม่มี cap · `trees/thief.ts:34` · `:4276` | P2d §1.1 C `thief_v3` เลือดพิษ INT + net HP + cap 25%/เทิร์น | `เฉพาะ P2` | แทน legacy `thief_l2` (id ใหม่) · cap จำเป็นขึ้นเพราะ tick โตตาม P.ATK |

### 1.2 Skill 1 / D.Strike
| # | main · file:line | P2 · section | Verdict | ทำอะไร |
|---|---|---|---|---|
| S1 | 👤 ร่างเงา: แทงพิษฟรี · `:1136` · `:6437` | P2a §T2 ค่าร่าย 45 / floor 30 · §T4 `s1Weave` (Rev 3 §2.2) | `ชน` | §2 + Q3 |
| S2 | DOUBLE → เกจเงา +1 · `:3136` | P2a §T4 D.Strike +Energy `thiefStrikeRes` · `thiefStrikeLs` | `เสริม` | ทำทั้งคู่ |

### 1.3 Skill 2
| # | main · file:line | P2 · section | Verdict | ทำอะไร |
|---|---|---|---|---|
| K1 | 💰 `th_pick` ขโมยตาม stat เด่นของมอน · `KIT.thiefSteal` `skill-math.ts:92-100` · `stealFrom` `:1304-1312` · case `:3492-3500` · `skill2.ts:60` | P2b §T7 On-Hit basic + Zeny + Plunder 💎 | `ชน` | §2 |
| K2 | `th_smoke` = หลบแน่ + ฮีล + `smokeBombFx` · `:3487-3491` | P2b §T6 Shroud + Sightless Raid + Exposed + Blind | `เฉพาะ P2` | ทำ P2b · ใช้ VFX ของ main |
| K3 | `th_wound` = แทงทะลุ DEF + พิษ + `venomStabFx` · `:3502-3509` | P2b §T8 Wound + Blade's End + healCut | `เฉพาะ P2` | ทำ P2b · ใช้ VFX ของ main |
| K4 | `poisonAmp` คูณตรง `m.poison >= 10` hardcode · `:4064` | P2b §T1/T4 B1 `takenAmp` cap 0.60 (R4.6.2) | `เฉพาะ P2` | ทำ · เกณฑ์ stack ต้อง rescale (§5) |

### 1.4 เงา / Ult
| # | main · file:line | P2 · section | Verdict | ทำอะไร |
|---|---|---|---|---|
| U1 | 👤 เกจเงา: หลบ +1 / DOUBLE +1 / Ult +2 · เต็ม 5 = ร่างเงา 2 เทิร์น · `KIT.thiefShadow` `skill-math.ts:102-106` · `addShadow` `:1286-1294` · เติม `:3136` `:3873` `:4594` `:5429-5430` · หมด `:918` | P2c §T6 Ghost Shroud (Rev 3 §2.5 "กฎรวม Ghost Shroud") + P2b Shroud | `ชน` | §2 + Q1 |
| U2 | ร่างเงา = ทุกฮิตกายภาพคริแน่ + critPow เต็ม · `:1335-1336` · `:1353-1354` · ครอบ Ult `:3881` + มีดพายุ `:2181` | P2c §2 Ult budget (สมมติ `p` 0.25) + u-line ที่เพิ่มโอกาสคริ | `ชน` | §2 + Q2 |
| U3 | d79b0c6 เคยทำ `KIT.thiefUltAgi` 2%/AGI | P1 Ratio AGI · `hero-stats.ts:286` `:302` · `skill-math.ts:88` | `ซ้ำ` | ✅ จบแล้ว (P1 แทนบน main) |
| U4 | — | P2c §T4 `thief_u` u1–u4★ · §T8 Global Ult CD cap `cutUltCd()` | `เฉพาะ P2` | ทำ · ตัดตัวเลขใหม่ (§5) |

### 1.5 Core (คริ / เลือด)
| # | main · file:line | P2 · section | Verdict | ทำอะไร |
|---|---|---|---|---|
| C1 | 🔻 `thief_c2` หมายหัว + Malice · `trees/thief.ts:30` · `KIT.thiefMark` `skill-math.ts:109` · `ensureMark` `:1296` · `:1332-1334` · `:1378-1382` | P2a §T3 `thief_c2` จุดตายสะสม | `ชน` | §2 |
| C2 | หมายหัวปล่อย = `mul *= 1 + 0.3 × thMark` (Lv5 ×1.9 คูณตรง) · `:1334` | R4.6.2 B3 (คริเงื่อนไข บวก cap 0.75) | `ชน` | §2 |
| C3 | 2 คอลัมน์ `thief_crit` + `thief_blood` · `trees/thief.ts:19-20` | P2a §T3 รวมเป็น `thief_core` คอลัมน์เดียว (ว่าง 1 ช่องให้ `thief_v`/`thief_u`) | `เฉพาะ P2` | ทำ · c2 = หมายหัว (§2) |

### 1.6 Rogue / ของใช้ร่วม
| # | main · file:line | P2 · section | Verdict | ทำอะไร |
|---|---|---|---|---|
| R1 | 🔁 Combo Point: ฮิตคอมโบ +1 (max 5) · Back Stab ใช้หมด +20%/แต้ม (คูณ) · `skill-math.ts:209` · `:3254` · `:2329-2333` | P3: Dagger Mark / Voracity (Rev 3 §3.2–3.3) + B4 `stabAmpCap` 0.75 (R4.6.2) | `ชน` | §2 (ตัดสินใน spec P3) |
| R2 | 🌪️ พายุมีด VFX v2 `d8a449f` · `:2171-2181` | P1 มีดพายุอ่าน `j2KnifeMul` `:2399` | `เสริม` | ✅ live |
| R3 | Back Stab gold `backstabFx` `:2333` | P1 ทะลุ lucky dodge `:1340` | `เสริม` | ✅ live |
| R4 | Thief VFX `ce9846a` (`src/battle/thief-vfx.ts`) | proc ใหม่ของ P2 (Raid, Blade's End, Contaminate) ยังไม่มี VFX | `เสริม` | ใช้ `daggerCross` / `shadowSlash` / `venomStab` ซ้ำ |
| R5 | ชื่อสกิลไม่ซ้ำกัน (`68ff052`) | ชื่อใหม่ใน P2 | `เสริม` | กติกา: ชื่อใหม่ต้องไม่ซ้ำ (ดู §1.8 `th_t4c`) |

### 1.7 เฉพาะ P2 (main ไม่มีเลย)
| # | P2 · section | Verdict | หมายเหตุ |
|---|---|---|---|
| O1 | `thief_v1` แทงฉาบอาคม (ดาเมจเวทเสริมบนแทงพิษ) · P2d §T3 | `เฉพาะ P2` | เป็นฮิต ไม่ใช่พิษ → ไม่ double-dip |
| O2 | `thief_v2` Contaminate (กดระเบิดพิษเอง) · P2d §T4 | `เฉพาะ P2` | ตัดเทอม M.ATK (P1) · ใช้ stack แลก = ลด %HP bite / DEF shred เอง (trade-off ดี) |
| O3 | `thief_v4` ★ นักเล่นแร่พิษ · P2d §T6 | `เฉพาะ P2` | — |
| O4 | `th_t4b` Perfect Agony B5 · P2d §T7 | `เฉพาะ P2` | ⚠️ ห้ามคูณ %HP bite (§5) |
| O5 | WIS Shadow Ward · LUK Gambler's Edge · P2d §1.1 G/H | `เฉพาะ P2` | WIS ได้ตัวตนจาก Ward แทน cap |

**นับ:** ซ้ำ 8 (P1 P2 P4 P5 P6 P8 P9 U3) · ชน 9 (P3 P7 S1 K1 U1 U2 C1 C2 R1) · เสริม 6 (P12 S2 R2 R3 R4 R5) · เฉพาะ main 2 (P10 P11) · เฉพาะ P2 11 (P13 K2 K3 K4 U4 C3 O1–O5) = **36**

### 1.8 id legacy ที่ P2 ใช้ซ้ำความหมายใหม่ (นิยามคือ `ชน` · **ไม่นับใน 36**)
main ไม่ได้ rework id พวกนี้ (เปลี่ยนแค่ชื่อบางตัว) → ให้ P2 แทนได้ · migration รีเซ็ตอยู่แล้ว

| id | main ตอนนี้ (`trees/thief.ts`) | P2 ใหม่ | หมายเหตุ |
|---|---|---|---|
| `thief_b1` `b2` `b4` | ย่องเบา / หายใจในเงา / เงาสวน (flat) `:27-28` `:37` | b-line Rev 3 §2.5 | ต้องผูกกับเกจเงา (Q1) |
| `thief_b3` | มีดคู่ (flat combo + crit) `:29` | เงาวนลูป (ย้ายเข้า `thief_b`) | — |
| `thief_c3` | คริชาร์จ `arCritRes` `:31` | กระหายเลือด | — |
| `thief_c4` | เพชฌฆาต `thExecute` ×1.5 `:32` · ใช้ที่ `:1349` | ราชันย์โลหิต | ×1.5 hardcode ลบใน P2'c |
| `th_t1a/b/c` | Flee / waveDodge / HP flat `:41-43` | ก้าวเงา / เปิดฉากซุ่มโจมตี / กายต้านพิษ | `th_t1b` main เปลี่ยนชื่อเป็น "ควันตั้งต้น" แล้ว |
| `th_t2a/b/c` | dodgeEnergy / crit / autoCostCut `:45-47` | ขโมยจังหวะ / จุดบอดซ้อนพิษ / จังหวะสลับมีด | "ขโมยจังหวะ" ซ้ำกับข้อความ steal AGI `:1307` → เปลี่ยนข้อความ steal |
| `th_t3a/b/c` | ultDodge / ultHits / ultPoison `:49-51` | เงาสังหาร / คมมีดประสาน / เงาหมอกลวงตา | `th_t3b` main เปลี่ยนชื่อเป็น "มีดรัว" แล้ว |
| `th_t4a/b/c` | poisonAmp / critMul / fleeFloor `:53-55` | Privileged / Perfect Agony / Mistwalker | ⚠️ `th_t4c` ชื่อ "ร่างเงา" ชนกับสถานะร่างเงาของเกจ → ตั้งชื่อใหม่ (เช่น "หมอกลวงตา") |

- `68ff052` เปลี่ยนความหมาย `thief_c2` (จุดตาย → หมายหัว) **โดยไม่มี migration** → ยืนยันว่า P2' ต้องมี migration (18 id เปลี่ยนความหมาย ไม่ใช่ 1)
- id ที่เลิกใช้ (ไม่ reuse): `thief_l1`–`l4`, branch `thief_crit` / `thief_blood`

---

## 2) ข้อตัดสินต่อ `ชน` (default = เก็บ main)

| # | เลือก | ทำยังไง | เหตุผล (1 บรรทัด) |
|---|---|---|---|
| P3 cap 20 vs WIS cap | **keep main** | ทิ้ง `wisPoisonCap` + 3 key · WIS ได้ Shadow Ward (O5) | stack เพิ่ม = %HP bite เพิ่มตรง ๆ (§5) |
| P7 `thief_a2` | **keep main** (พิษชา) | ทิ้งพิษกัดลึก · chill จากพิษชานับเป็น 1 ชนิดใน `debuffKinds` (c1 / Privileged) | `vsPoison` ชน cap 0.70 จาก gear อยู่แล้ว (R4.6.3) · slow = utility ที่ main เล่นแล้ว |
| S1 S1 loop | **merge** | ค่าร่าย 45 + floor 30 + `s1Weave` นอกร่างเงา · **ระหว่างร่างเงาหยุด weave** (Q3) | แก้ S1 แย่ง Basic ได้ โดยไม่แตะความรู้สึก "ร่างเงา = แทงพิษฟรี" ของ live |
| K1 `th_pick` | **keep main** (steal) | ทิ้ง P2b T7 ทั้ง task + key `pickBase` `pickStarMul` `pickZeny*` `plunder*` | steal live + เล่นแล้ว + Zeny/💎 แตะเศรษฐกิจ |
| U1 เกจเงา vs Ghost Shroud | **merge** | ทรัพยากรเงามี **อันเดียว = เกจเงา** · b-line = ตัวปรับเกจ (เติมเร็วขึ้น / ร่างเงานานขึ้น / ได้ Shadow Shield ตอนเข้าร่างเงา / หลบในร่างเงาลด CD Ult) · ทิ้ง counter `ghostShroud` + key `thiefShroud*` · `th_smoke` Shroud คงเป็นสถานะของสกิล 2 (คนละอย่างกับร่างเงา) | 2 ทรัพยากรเงา = UI รก + ต้นทุนสองเท่า (Q1) |
| U2 คริแน่ vs Ult budget | **keep main** + วัดใหม่ | เพดาน = Ult live **รวมร่างเงา** · budget test 2 สถานะ (เปิด/ปิด) · u-line ส่วน "เพิ่มโอกาสคริ" เปลี่ยนเป็นเงื่อนไขอื่น หรือลดเหลือเล็กน้อย (Q2) | ไม่ nerf live · ตัวเลข P2c §2 ผิดฐานแล้ว (§5) |
| C1 `thief_c2` | **keep main** (หมายหัว) | ย้าย `thief_c2` เข้า branch `thief_core` (tier 2) · ทิ้ง node จุดตายสะสม (`thStackCrit`, `thCritPoison`, `thiefStackCritMax`) · คริต่อ stack อยู่ที่ talent `th_t2b` ตัวเดียว | id ใช้แล้วบน live · จุดตายสะสมซ้ำกับ `th_t2b` อยู่แล้ว |
| C2 หมายหัว ×1.9 | **keep main** | จัดหมายหัวเป็น **B4 (ฮิตของตัวเอง 1 ครั้ง/5 ฮิต)** ใน R4.6 · B3 cap 0.75 ใช้กับเงื่อนไขใหม่ของ P2 เท่านั้น | ย้ายเข้า B3 = เหลือ ×1.45 (nerf live) |
| R1 Combo Point vs Dagger Mark | **keep main** | P3: Dagger Mark ให้ CP / ลด CD / Energy · **ไม่บวกดาเมจ Back Stab ซ้ำ** · B4 Back Stab ต้องนับ CP: cap ≥ +1.0 (CP เต็ม) หรือ CP อยู่นอก B4 แล้ว cap ส่วนที่เหลือ 0.75 | CP ×2.0 ใหญ่กว่า B4 ทั้งก้อน (+0.75) แล้ว |

**ซ้ำ → ทิ้งฝั่ง P2:** `thPoisonPen` · `thToxicHold` · `thStrikePoison` · `thPlagueDeath` + `thiefSpreadShare` `thiefPlagueAt` `thiefPlagueTurns` `thiefToxicHoldCap` · เทอม M.ATK ของ Contaminate · Venom Melt / Toxic Seep

---

## 3) Reuse list — โค้ดเก่าบน `origin/claude/thief-p2`

### 3.1 สถานะจริง
| Slice | โค้ดแล้ว | ไม่ได้โค้ด |
|---|---|---|
| P2a | T1–T9 ครบ (`3e47e7b`…`49467dd`) + `0bbbd1b` | — |
| P2b | T1–T8 (`296e378`…`d4521f7`) | T9 `th_t1c` · T10 ข้าม (ตาม INTEGRATION §2 ย้ายไป P2a T4) |
| P2c / P2d | — | ทั้งหมด |
| P1 ฉบับเก่า | `9302177` `d0ca9e9` `f5c3f20` `f21211b` `4825e8a` `422beb2` `69db1e8` + 5 docs (`f30e291` `1f78325` `5069c24` `022e72c` `67f8e34`) = 12 | **ทิ้ง** · ฉบับ rebase อยู่บน main แล้ว (#129) |

### 3.2 ทดสอบด้วย `git merge-tree` กับ HEAD (read-only)
- **ทุก commit exit=1** → ไม่มีตัวไหน `cherry-pick` ได้ตรง ๆ
- ทดสอบทีละ commit เดี่ยว ๆ บน HEAD (ไม่ได้ลง commit ก่อนหน้า) → conflict บางจุดมาจากบรรทัดของ commit P2a ข้าง ๆ ไม่ใช่ของ main
- `docs/design/changelog-2026-11-18.md` **ไม่มีบน main** → ทุก commit ชนไฟล์นี้ (กติกา changelog ใน `INTEGRATION.md` §4 เก่าแล้ว: ให้เขียนลง changelog ของวันที่ commit จริง)
- `tests/thief-p2a.test.ts` / `thief-p2b.test.ts` ถูกสร้างทีละ commit และไม่มีบน HEAD → **เอาจากปลาย branch** (`git show origin/claude/thief-p2:tests/thief-p2a.test.ts`) แล้วตัดเคสของกลไกที่ทิ้ง

### 3.3 ตาราง commit
| Commit | งาน | ผลกับ HEAD | Verdict | หมายเหตุ |
|---|---|---|---|---|
| `f574d3e` | save migration `thiefRogueRework` v1 | ชนแค่ changelog / NOTES / test | **เอา src ได้** | `git diff f574d3e^ f574d3e -- src/save.ts \| git apply -3` · เทสต์ migration เอาจากปลาย branch |
| `49467dd` | `tools/bot.cjs` flag + id | ชนแค่ changelog | **เอา src ได้** | `git diff 49467dd^ 49467dd -- tools/bot.cjs \| git apply -3` · ตัวอย่าง `TREEX` แก้ id ที่ทิ้ง |
| `fdd5d8d` | `th_t4a` Privileged talent | ชนแค่ changelog / test | **เอา src ได้** | `-- src/data/trees/thief.ts` · ต้องมี KIT `thiefPrivAt` (`296e378`) + Stats `thPrivileged` (`35f5d2d`) ก่อน · ค่าเกณฑ์ใหม่ (§5) |
| `3e47e7b` | Stats + KIT + registry | ชน `skill-math.ts` `stats.ts` `combo-kit.ts` | **rewrite** | พิมพ์ใหม่บน main · ตัด key ที่ทิ้ง (§2) |
| `ba672be` | ค่าร่าย 45 · floor 30 · pure helpers | ชน `skill-math.ts` | **rewrite** | เก็บ `autoCost` floor · `thiefS1Woven` · `thiefCondLeechAdd` · `thiefKillHeal` · `thiefBossCritHeal` · `thiefBloodKingOn` · ทิ้ง `thiefSpreadAmount` `thiefToxicHold` · `thiefStackCritAdd` เหลือส่วน `th_t2b` |
| `ecaf11d` | tree data a/core/t2 + test | ชน `trees/thief.ts` | **rewrite** | a-line = main ไม่แตะ · core: c1 / **c2 หมายหัว** / c3 / c4 · แก้ `admin-model.test.ts` นำไปใช้ได้ |
| `e1ecefc` | `s1Weave` + D.Strike Energy | ชน `BattleScene.ts` (บรรทัด `castS1` / cost ร่างเงา `:1136`) | **rewrite** (เล็ก) | logic เดิมใช้ได้ + เงื่อนไขร่างเงา (Q3) |
| `0085cf4` | core hooks c1–c4 + `LIFESTEAL_CAP` | ชน `BattleScene.ts` | **rewrite** | เก็บ c1 / c3 / c4 · ทิ้ง c2 (`thCritPoison`) |
| `381dfae` | hooks `th_t2a/b/c` + `cutUltCd` | ชน `BattleScene.ts` (`dodged()` มี `addShadow` แล้ว) | **rewrite** (เล็ก) | logic ใช้ได้ทั้งหมด |
| `296e378` | B1 `takenAmp` + `debuffKinds` + keys | ชน `skill-math.ts` `skill-registry.ts` `tunables.ts` `combo-kit.ts` | **rewrite** (เล็ก) | pure helpers ใช้ได้ตรง · เกณฑ์ `thiefPrivAt` / `thiefPoisonAmpAt` ใหม่ |
| `49b97d3` | S2P/S2N + labels | ชน `skill-math.ts` `skill2.ts` `BattleScene.ts` | **rewrite** | ตัด key `th_pick` ทั้งหมด · เก็บ smoke / exposed / wound / blade |
| `9545414` | สถานะ Exposed / Wound / woundCut | ชน `trees/thief.ts` (ข้อความ c2) `BattleScene.ts` | **rewrite** (เล็ก) | logic `BattleScene` ใช้ได้ (พิมพ์ใหม่) · c2 เป็นหมายหัวแล้ว |
| `35f5d2d` | `takenAmp` ใน `damageMon` + Stats `thPrivileged` ฯลฯ | ชน `stats.ts` (บรรทัด `PLAYER`) `BattleScene.ts` | **rewrite** (เล็ก) | แทน `:4064` · ต้องมาก่อน `fdd5d8d` |
| `6d335c8` | `th_smoke` Shroud + Raid | ชน `BattleScene.ts` + `trees/thief.ts` | **rewrite** | คง `smokeBombFx` · Raid ใช้ `daggerCross` |
| `d4521f7` | `th_wound` Wound + Blade's End | ชน `BattleScene.ts` (case `th_wound` มี `venomStabFx`) | **rewrite** (เล็ก) | `addWound` / `bladesEnd` ใช้ได้ตรง |
| `4c9f593` | a-line hooks (pen · hold · strikePoison · Plague) | — | **ทิ้ง** | ซ้ำ P4 P6 P8 |
| `9acc833` | `th_pick` On-Hit + Zeny + Plunder | — | **ทิ้ง** | K1 keep main |
| `0bbbd1b` | label `mageCore` | ชน `explain.ts` | **ทิ้ง** | main ทำแล้วใน `d79b0c6` |
| `d75630b` + merge docs | INTEGRATION / specs | — | ไฟล์ copy มาแล้ว | ใช้เป็นประวัติ · ไฟล์นี้ชนะ |

**นับ:** เอา src ได้ 3 · rewrite 12 · ทิ้ง 3 = 18 commit (ไม่นับ P1 ฉบับเก่า + docs)

---

## 4) แผนสไลซ์ใหม่ P2' (ปล่อยรอบเดียว · migration v1 ครั้งเดียว)

> branch เดียว `claude/thief-p2-v2` · 1 task = 1 commit · คอลัมน์สุดท้าย: s1 2 (`thief_a` + `thief_v`) · s2 3 · ult 2 (`thief_b` + `thief_u`) · core 1 = **8** ✅

| Slice | Commit | ขอบเขต | ที่มา |
|---|---|---|---|
| **P2'a Foundation + core** | 7 | keys (ตัดแล้ว) · ค่าร่าย 45/floor 30 · `s1Weave` + D.Strike Energy (กฎร่างเงา) · core column (c1 / c2 หมายหัว / c3 / c4) · hooks c1/c3/c4 · talents แถว 2 + `cutUltCd` · migration v1 + bot · **a-line ไม่แตะ** | rewrite `3e47e7b` `ba672be` `ecaf11d` `e1ecefc` `0085cf4` `381dfae` · apply `f574d3e` `49467dd` |
| **P2'b Status + Skill 2** | 7 | B1 helpers (เกณฑ์ตาม cap) · S2 numbers (ไม่มี pick) · Exposed / Wound / woundCut · `takenAmp` แทน `:4064` · talents `th_t4a` + `th_t1c` · `th_smoke` · `th_wound` · **`th_pick` = main ไม่แตะ** | rewrite `296e378` `49b97d3` `9545414` `35f5d2d` `6d335c8` `d4521f7` · apply `fdd5d8d` · `th_t1c` ใหม่ |
| **P2'c Ult × เกจเงา** | 7 | budget fn 2 สถานะ + test · b-line = ตัวปรับเกจ · u-line ตัดตัวเลขใหม่ · talents แถว 1/3 + `th_t4c` (ชื่อใหม่) · Global Ult CD cap · B3 aggregator (ลบ `thExecute` `:1349` · Shroud★) + หมายหัว = B4 · sync tools/docs | spec ใหม่ (จาก P2c) |
| **P2'd สาย INT (lite)** | 5 | `statEff` + `thief_v1` · `thief_v2` Contaminate (ไม่มีเทอม M.ATK) · `thief_v3` เลือดพิษ (แทน `thief_l2`, cap/เทิร์น) + `thief_v4`★ · `th_t4b` PA (เฉพาะส่วน flat) · WIS Shadow Ward + LUK Gambler's Edge | spec ใหม่ (จาก P2d) · ทิ้ง WIS cap · Venom Melt · Arcane Edge |

- รวม **26 commit** (เดิม 39: P2a 9 · P2b 10 · P2c 11 · P2d 9)
- หลังปล่อย: คิวเล่นทดสอบ → วัด `JOB2_K.mobster` (Mobster ได้ร่างเงา + core ใหม่ด้วย เพราะ `job === 'thief'`)
- P3 Rogue: เริ่มจาก R1 (CP อยู่ · Mark ให้ CP/CD)

---

## 5) Balance sanity

### 5.1 พิษ: จุดที่ P2 จะ double-dip กับ main
| # | main ตอนนี้ | P2 เดิมจะเพิ่ม | ความเสี่ยง | ทำอะไร |
|---|---|---|---|---|
| 1 | cap 20 + `thief_a3` Lv5 9 = **29 stack** · %HP bite 0.5%/stack → **14.5% max HP/tick** ขณะ HP > 50% (ไม่เห็น boss check ที่ `:4273` และต้น `damageMon` `:4044-4066`) | WIS cap +16 → 45 stack → 22.5%/tick | 🔴 สูง | ทิ้ง WIS cap · ตัวเลขบนบอส = **ต้องวัด** |
| 2 | gear `poisonAmp` ≥ 10 stack (`:4064`) | — | cap 20 → แทบติดตลอด | B1 cap 0.60 คุมได้ ✅ |
| 3 | — | เกณฑ์ที่ตั้งตอน cap 12: `thiefPrivAt` 8 · `thiefPoisonAmpAt` 10 · `thiefDetAt` 8 · `th_t2b` 14 stack · `thiefStackHpMax` 20 | 🟠 กลายเป็น flat (ขัด Goal 1) | ตั้งเป็นสัดส่วนของ `poisonMax()` (เช่น 0.6 × cap) หรือ ×1.67 (8→13 · 10→17) |
| 4 | tick = (stack × perStack + **hpBite**) × `dotMul` `:4275` | B5 Perfect Agony คูณ src `poison` ทั้งก้อน (สูงสุด +100%) | 🔴 คูณ %HP ซ้ำ | PA คูณเฉพาะ `m.poison × m.poisonDmg` ไม่รวม hpBite |
| 5 | INT → พิษ 3 ทาง: `intPer` · `hpPctInt` · M.ATK (`matkPer`) | Contaminate เทอม M.ATK อีก 2 ตัว | 🟠 ทางที่ 4 | ตัดเทอม (P1) · `thief_v1` เป็นฮิตเวท ไม่ใช่พิษ → OK |
| 6 | `poisonLeech` 10%/lv ของ tick flat ไม่มี cap `:4276` (tick โตตาม P.ATK) | `thief_v3` cap 25% max HP/เทิร์น | 🟢 P2 ช่วยลด | ทำ |
| 7 | DEF shred 1%/stack (`:1358`) ใช้กับฮิตไม่คริเท่านั้น | `thPoisonPen` | ซ้ำ + ในร่างเงาไม่มีผล (คริข้าม DEF) | ทิ้ง |
| 8 | stack เพิ่มต่อฮิต: `thStrikePoison` +1 · `thCritPoison` +1 | — | ถึง cap อยู่แล้ว → แค่ป้อน Mobster พิษล้น | ทิ้งทั้งคู่ |
| 9 | ระเบิดพิษ chain `:4182` | Contaminate ฆ่า → ลูกโซ่ | 🟠 | Contaminate ICD 1/เทิร์น (ตาม spec) · ไม่ต้อง guard chain เพิ่ม (main ตั้งใจให้ chain) |

### 5.2 Ult budget (R4.3 ข้อ 1)
- ✅ **Ratio AGI ยังอยู่:** ฮิตเงาพริ้ว = `KIT.thiefUlt × hitPow × (1 + thUltAgi)` `:3881` · `thUltAgi` จาก `hero-stats.ts:302` → ข้อเสนอ "DEX cap 3 + นับ DEX ใน share" ยังใช้ได้
- 🔴 **ของใหม่จาก main = ร่างเงา:**
  - กด Ult = เกจ +2 **ก่อน** ฮิต (`:3873`) → เกจ ≥ 3 ตอนกด = ทุกฮิตคริแน่
  - critPow เต็ม (`:1353` · thief `ult: 1` ที่ `skill-registry.ts:25`)
  - ฮีโร่อ้างอิง P2c §2.2 (crit 0.40 · critMul 2.0): `C` 1.25 → **2.0 = ×1.6**
  - เพดาน T1 (7 ฮิต) = 8.75U → **14.0U** ตอนร่างเงาเปิด
- **ผลกับ u-line ของ P2c:**
  - ส่วนเพิ่มโอกาสคริ (u1 skillCrit, `th_t3a`) = **0 ค่า** ตอนร่างเงา
  - ส่วนคริดาเมจ (B3) ได้เต็มทุกฮิต · finisher "คริ ≥ 3" ติดทุกครั้ง
  - ตัวอย่าง NI ตอนร่างเงา: (7 + 0.3) × (2.0 + 0.30) ≈ **16.8U** (ยังไม่รวม On-Hit) vs 14.0U = **~120% เกินเพดาน**
- **Rogue:** พายุมีด = `shadowDance` + มีด 8 เล่มผ่าน `strike()` (`:2181`) → คริแน่ทั้งชุดตอนร่างเงา · Back Stab `forceCrit` อยู่แล้ว (CP ×2.0 ไม่เกี่ยว)
- **ทำ:** `thiefUltBudget()` ต้องเช็ก 2 สถานะ (ปิด: `p` จริง · เปิด: `p = 1`) · ทุก build ≤ live ทั้ง 2 สถานะ · uptime ร่างเงา = **ต้องวัด** (คิวเล่น)

---

## 6) คำถามถึงคิว (3 ข้อ · มี default ที่ไม่แตะ live)

| # | คำถาม | Default (แนะนำ) | ทางเลือก |
|---|---|---|---|
| Q1 | เงามี 2 ระบบ (👤 เกจเงา live + Ghost Shroud ของเรา) → รวมเป็นอันเดียวไหม? | **รวม:** เกจเงาอันเดียว · สาย `thief_b` เป็นตัวปรับเกจ (เติมเร็ว / ร่างเงานาน / โล่ตอนเข้าร่างเงา) | แยก 2 ระบบตาม Rev 3 (UI + key เพิ่ม ~6) |
| Q2 | ร่างเงาคริแน่ทำ Ult แรง ×1.6 → เพดาน Ult ของ P2' นับจากไหน? | **เพดาน = live รวมร่างเงา** (ไม่ nerf ของที่เล่นอยู่) · u-line ต้องไม่เกิน live ทั้งตอนเปิด/ปิดร่างเงา | Ult ไม่ได้คริแน่จากร่างเงา (nerf live · u-line ออกแบบง่ายขึ้น) |
| Q3 | ระหว่างร่างเงา (แทงพิษฟรี) ให้ `s1Weave` บังคับสลับ แทงพิษ → ตีปกติ ไหม? | **ไม่บังคับ:** ร่างเงาแทงพิษฟรีรัวได้เหมือน live · weave ใช้นอกร่างเงาเท่านั้น | บังคับเสมอ (Rogue ได้คอมโบ / CP / มีดบินมากขึ้น แต่ความรู้สึกร่างเงาเปลี่ยน) |

---

## คำตอบของคิว (2026-11-19)

| # | คำตอบ | ทำที่ไหน |
|---|---|---|
| Q1 | **รวม** เกจเงา กับ Ghost Shroud เป็นเกจเดียว · สาย `thief_b` เป็นตัวปรับเกจ | P2'c (จดไว้ก่อน) |
| Q2 | เพดาน budget Ult = ดาเมจ live วันนี้ **รวมร่างเงา** (ไม่ nerf live) | P2'c (จดไว้ก่อน) |
| Q3 | ในร่างเงา `s1Weave` **ไม่บังคับ** สลับ S1/ตีปกติ (แทงพิษฟรีรัวได้เหมือน live) · นอกร่างเงา สลับ 1:1 | **P2'a** (ทำในสไลซ์นี้) |
| Save | Beta เล่นเอาฟีล → migration เล็กที่สุด: เลขเวอร์ชัน `thiefRogueRework` · ต่ำกว่าเวอร์ชัน = รีเซ็ต web คลาส 1 + talents ของโจร คืนแต้มเต็ม (`resetTree(s)` คืนแต้มข้ามเทียร์ให้แล้ว) · ข้อมูลเสียห้าม crash แต่ไม่ต้องทำเกิน · สไลซ์ถัดไป bump เวอร์ชันได้ | **P2'a** (commit migration) |
