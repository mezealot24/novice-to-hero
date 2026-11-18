# P2c — Thief Ult (เงาพริ้ว) · Implementation Spec

> **สถานะ:** spec สำหรับโค้ดทีหลัง P2a → P2b → **P2c** → P2d · เขียนจาก branch `claude/thief-ult-agi-ratio` (HEAD `67f8e34`) · ตรวจโค้ดจริงแล้ว (typecheck ✅ · `thief-ult` 5/5 ✅ · `skill-registry` 10/10 ✅ ก่อนเริ่ม)
> **อ่านก่อน:** `design/thief-rogue-rework-v1.md` Rev 4 Delta (R4.3 #1 = Ult budget · R4.6 = bracket B3 · R4.7 = KIT keys) → §2.5 / §2.7 (Rev 3)
> **กติกา:** 1 task = 1 commit · ห้ามแตะ `src/data/trees2/mobster.ts` · `JOB2.mobster` · `KIT2.mobster`

---

## 0) TL;DR

| เรื่อง | คำตอบ |
|---|---|
| ทำอะไร | โหนด `thief_b` (b1–b4★) + `thief_u` (u1–u4★) · ทาเลนต์ `th_t1a` `th_t1b` `th_t3a` `th_t3b` `th_t3c` `th_t4c` · `onShroudBreak()` · Global Ult CD cap · B3 crit-dmg bracket |
| จำนวน task | **11 commits** (T1–T11) |
| ข้อจำกัดใหญ่สุด | **Ult budget:** ทุก build ที่ Lv 80 ≤ 100% ของ "วันนี้หลัง Ratio AGI" → ดูตาราง §2 (สูงสุด **99%**) |
| ตัวเลขที่ cut จาก Rev 3 | ดู §2.3 — ฮิตเพิ่มนับ ×0.5 · DEX hit cap 3 · crit cap 0.42 · cond crit dmg ult 0.30 · finisher 0.3 · On-Hit D.Strike 1/Ult |
| ไม่ทำใน P2c | `poisonMul` (Rev 3 ตั้ง 0 ให้ non-on-hit) · `(1 + pskill)` บนฮิตเงาพริ้ว (ดู §2.4) |

---

## 1) ข้อเท็จจริงที่ตรวจในโค้ดจริง (อ้างอิง file:line)

| # | ข้อเท็จจริง | ที่อยู่ |
|---|---|---|
| F1 | `shadowDance(hitPow)` ใช้ร่วม Thief (`:3508`) + Rogue พายุมีด (`:2242`) · ฮิตละ `KIT.thiefUlt × hitPow × (1 + thUltAgi)` · **ไม่มี `(1 + pskill)`** | `BattleScene.ts:3714-3731` |
| F2 | จำนวนฮิต = `KIT.thiefUltHits (4) + st.ultHits` · หลบแน่น = `KIT.thiefUltDodge (2) + st.ultDodge` · `ultPoison` ติดต่อฮิต | `:3715-3724` |
| F3 | ฮิตเงาพริ้ว `src='ult'` → คริ = `min(0.6, skillCrit + (crit + physAdd) × 0.5)` (`CRIT_RULES.skillFromCrit` 0.5 · cap 0.6) | `:2893-2904` · `battle-rules.ts:38-43` |
| F4 | `critDmgAdd` สร้างที่ `:1250` ส่งเข้า `roll()` → `scaleCritMul(critMul + add, critPow())` (`:3851`) → **B3 = บวกเข้าตรงนี้** | `:1250` · `:3851` |
| F5 | `thExecute` ×1.5 hardcode (`m.hp < 30%`) อยู่ที่ `:1247` · แหล่งเดียวคือ `thief_c4` เดิม (`trees/thief.ts:31`) · ไม่มี gear/card ตั้งค่านี้ (grep ทั้ง `src/`) | `:1247` |
| F6 | ถูกแทงแล้วหลบ: `dodgeCharges` (`:4428`) → LUCKY (`:4436`) → EVADE (`:4437`) · ฟังก์ชันย่อย `dodged()` (`:4409-4427`) รวม counter / dodgeHeal / dodgeEnergy / `src.evaded++` (trueSight) | `:4407-4437` |
| F7 | เกราะ (`this.shield`) หักที่ท้าย `hurtHeroCore` (หลังคำนวณ `n`) → โล่ที่สร้างก่อนบรรทัด guard/block ทันกิน | `:4486+` · `addShield` `:3838` (cap `BATTLE.shieldCap`) |
| F8 | CD ult = `smashCdLeft` · ลด 1 ต้นเทิร์นฮีโร่ `:1033` · ตั้งตอนกด `:1062` · **ไม่มี cap กลาง** (ที่ลดตรงๆ: `:2263` Mobster, `:2876`, `:3131`, `:3634`, `:4040`, `:5716`) | `:1033` `:1062` |
| F9 | เริ่มเวฟ: `waveDodge` ที่ `spawnRoom` | `:528-529` |
| F10 | `monTurn(m)` = ฟังก์ชันที่มอน **แต่ละตัว** ใช้ตอนถึงคิว (gauge, ไม่ใช่รอบเดียวกัน) | `:4081` · loop `:775-781` |
| F11 | `strike()` ใช้ `mul` ของ caller · พิษ `st.poison` ติดทุก physical hit (`:1273`) → **ฮิตเงาพริ้ววันนี้ติดพิษเต็มอยู่แล้ว** | `:1273` |
| F12 | Ratio AGI = `thiefUltAgiBonus(agiAboveStart, pool)` · `heroBuild` `:301` · test เดิม `tests/thief-ult-agi.test.ts` | `hero-stats.ts:286-289, 301` |
| F13 | `Stats` key ใหม่ต้องประกาศ 2 ที่: type (`stats.ts:~62`) + `PLAYER` (`:436-439`) · `INT_FIELDS` ที่ `tree.ts:68` · `ATTACH` ที่ `tree.ts:176-186` (`thief_b: "ult"` มีแล้ว, `thief_u` ยังไม่มี) · `stretch = {1:3, 2:4, 3:5}` และ tier 4 / `NO_STRETCH` ไม่ยืด (`tree.ts:43`, `:127`) | — |
| F14 | web ult-line สร้างจาก `ATTACH`: branch ที่ 1 ของ `line: 'ult'` ใช้คอลัมน์เดียวกับ root, branch ที่ 2 = คอลัมน์ใหม่ (`web-tier1.ts:73-96`) → ไม่ต้องแก้ UI · โหนดแรกของแต่ละ branch `parent = thief_ultp` (`tree.ts:~296`) | `web-tier1.ts:73-96` |
| F15 | `th_t*` ทาเลนต์ class 1 อยู่ใน `TALENTS` (`tree.ts:508`) — test `job2-talents` ตรวจเฉพาะ `TALENTS2` · แต่ `talent-text.test.ts` ตรวจ desc ทุก `TALENTS` | `tree.ts:508` |
| F16 | Mobster = `job === 'thief'` + `job2 === 'mobster'` · ult ของ Mobster ไม่เรียก `shadowDance` (ทวงหนี้ `:2250-2264`) แต่ใช้ `smashCdLeft` ร่วม และ refund เอง (`:2263`) | `:2250-2264` |

---

## 2) 🔴 Ult damage budget — Lv 80

### 2.1 กติกา (R4.3 #1) และวิธีวัด
- **เพดาน (ceiling)** = Ult วันนี้หลัง Ratio AGI ของ build ที่แรงสุด = `th_t3b` R2 (+3 ที = 7 ที) · AGI 238 · DEX 1
- **หน่วย:** `U` = ดาเมจเงาพริ้ว ÷ (ฮิตละ `0.7 × hitPow × (1 + A)` ไม่คริ) · `abs = U × 0.7 × (1 + A)` (หน่วย P.ATK × hitPow · ตัด hitPow ออกเพราะเท่ากันทุกแถว)
- **ฮีโร่อ้างอิง:** Lv 80 · pool 240 · `crit 0.40` · `skillCrit 0.05` · `critMul 2.0` → คริเงาพริ้ววันนี้ `p = min(0.6, 0.05 + 0.40×0.5) = 0.25` · `C = 1 + p(critMul − 1) = 1.25`
- **เงื่อนไขแย่สุด (worst case):** เป้า HP < 35% · ดีบัฟ ≥ 2 ชนิด · finisher ยิงทุกครั้ง · On-Hit ครบ
- โค้ดจริงวัดด้วยฟังก์ชัน pure `thiefUltBudget()` (T2) → test ล็อกว่า ≤ 100% (+2% tolerance)
- สคริปต์จำลอง (ไม่เข้า repo): `scratchpad/budget2.mjs` · พารามิเตอร์สุดท้ายอยู่ใน §2.3

### 2.2 ตาราง Lv 80 (ฮีโร่อ้างอิง · crit 0.40 / critMul 2.0)
| Build | ฮิต (+finisher) | คริ `p` | cond crit dmg | `C` | On-Hit `eff` | D.Strike เพิ่ม (U) | `U` | `abs` | % ของเพดาน |
|---|---|---|---|---|---|---|---|---|---|
| **วันนี้ T0** (ไม่มี talent) | 4 | 0.25 | 0 | 1.25 | – | – | 5.00 | 10.5 | 57% |
| **วันนี้ T1 ★เพดาน** (`th_t3b` R2 +3) | 7 | 0.25 | 0 | 1.25 | – | – | 8.75 | **18.3** | **100%** |
| N0 base (ไม่มีอะไร) | 4 | 0.25 | 0 | 1.25 | – | – | 5.00 | 10.5 | 57% |
| NA Crit Execution: `u1`L5 + `u3`L5 + `th_t3a`R2 | 4 + 0.3 | 0.39 | 0.30 | 1.51 | – | – | 6.48 | 13.5 | 74% |
| NB On-Hit: `u2`L5 + `u4★` + `th_t3b`R2 | 6 + 0.3 | 0.29 | 0 | 1.29 | 0.55 | 0.40 | 7.46 | 15.6 | 85% |
| NC Ghost Dance: `thief_b` เต็ม + `th_t3c`R2 | 4 | 0.25 | 0 | 1.25 | – | – | 5.00 | 10.5 | 57% ← ตั้งใจ (ได้ utility แทน) |
| ND ทุกโหนด u + `th_t3b`R2 (**max-stack**) | 6 + 0.3 | 0.36 | 0.30 | 1.46 | 0.55 | 0.40 | 8.41 | 17.6 | **96%** |
| NE ทุกโหนด u + `th_t3a`R2 | 4 + 0.3 | 0.39 | 0.30 | 1.51 | 0.55 | 0.40 | 7.13 | 14.9 | 82% |
| NF ทุกโหนด u + `th_t3c`R2 | 4 + 0.3 | 0.36 | 0.30 | 1.46 | 0.55 | 0.40 | 6.95 | 14.5 | 79% |
| NG DEX hybrid (AGI 194 / DEX 46) + `th_t3b`R2 | 7 | 0.29 | 0 | 1.29 | 0.50 | 0.44 | 7.52 | 14.4 | 79% |
| NH DEX hybrid + ทุกโหนด u + `th_t3b`R2 | 7 + 0.3 | 0.36 | 0.30 | 1.46 | 0.55 | 0.44 | 9.18 | 17.6 | **96%** |
| NI DEX hybrid + ทุกโหนด u + `th_t3a`R2 | 7 + 0.3 | 0.39 | 0.30 | 1.51 | 0.55 | 0.44 | 9.44 | 18.0 | **99%** |

- A: AGI 238 → `1 + A = 2.99` · hybrid AGI 194 / DEX 46 → `2.73` (DEX นับเข้า Ratio ด้วยน้ำหนัก `thiefUltDexW 0.3`)
- เพดานเท่ากันหมดทุกแถว (18.3) = "วันนี้ที่แรงสุด **ทุกการแบ่ง stat**" · เทียบเฉพาะ AGI เดียวกัน: hybrid แรงกว่า "วันนี้ที่ AGI 194" (ซึ่งไม่ได้ฮิตจาก DEX) ได้ถึง +12% แต่ยัง ≤ เพดานสัมบูรณ์ ✅

**Stress test (ฮีโร่ crit สูงกว่า)** — แถวที่แย่สุดต่อโปรไฟล์:
| โปรไฟล์ฮีโร่ | เพดาน `abs` | build แย่สุด | % |
|---|---|---|---|
| crit 0.40 / critMul 2.0 (อ้างอิง) | 18.3 | NI | **99%** |
| crit 0.55 / critMul 2.6 | 22.2 | ND / NH / NI | **98%** |
| crit 0.20 / critMul 1.8 | 16.4 | NI | 95% |
| crit 0.70 / critMul 3.0 | 26.3 | NB..NI | 92% |

- เพดาน AGI จาก gear (share cap 1.2 → `1 + A = 3.4`): ทุกแถวคูณ A เท่ากันกับเพดาน → % เท่าเดิม · DEX นับ **ในเพดาน `thiefUltAgiShareCap`** → gear AGI + DEX ไม่ทะลุ ×3.4

### 2.3 ตัวเลข Rev 3 → ที่ cut (ใช้ค่าคอลัมน์ขวา)
| ตัวเลข | Rev 3 / R4.7 | **P2c (cut)** | เหตุผล |
|---|---|---|---|
| ฮิตจาก DEX | `min(6, ⌊DEX÷15⌋)` ฮิตเต็ม | `min(3, ⌊d(DEX)÷15⌋)` · **นับ ×0.5** · รวมกับ `th_t3b` ไม่เกิน **7 ฮิตทั้งหมด** | R4.3 ข้อเสนอ (cap 3) + budget |
| `th_t3b` ฮิตเพิ่ม | `ultHits +1/+2` | `thUltExtraHits +1/+2` (นับ ×0.5) | วันนี้ +2/+3 ฮิตเต็ม (+75%) → +25% |
| `thUltDex` (เพิ่ม `thUltAgi`) | `0.012×DEX` บวกตรง | **ตัดทิ้ง** · แทนด้วย `DEX × 0.3` นับเข้า share ของ Ratio AGI (ภายใต้ cap 1.2) | ไม่ให้ทะลุ ×3.4 (R4.3 ข้อเสนอ) |
| `thiefUltDexHitCap` / `thiefUltDexPer` (R4.7) | 6 / 0.012 | **3** / ลบ key → ใช้ `thiefUltDexW 0.3` | ↑ |
| คริเงาพริ้ว share | `thiefUltCritShare 0.75` / cap `0.75` | **0.6 / 0.42** | ไม่ยกเพดานคริของสกิลเกิน 0.6 มาก |
| `thief_u1` skillCrit | `0.05×lv` (L5 +15%) | `(0.05 ÷ 3)×lv` (**L5 +5%**) | budget |
| `thief_u1` crit dmg ต่อชนิด | `0.10×lv` (L5 +30%) | `0.04×lv` (**L5 +12%**) | budget (+ cap ult-own 0.30) |
| `thief_u3` crit dmg vs HP<35% | `0.17×lv` (L5 +51%) | `0.06×lv` (**L5 +18%**) | budget |
| `th_t3a` skillCrit / crit dmg | 0.12\|0.20 / 0.35\|0.60 | **0.03\|0.05 / 0.10\|0.20** | budget |
| finisher `th_t3a` | 0.9\|1.4× | **0.25\|0.30×** | budget |
| finisher `thief_u4★` (`thiefFinisherMul`) | 1.4× | **0.3×** (คริแน่ · ต้องคริ ≥ 3) | budget |
| B3 cap ult-own (**key ใหม่** `thiefUltCondCap`) | – | **0.30** (ก่อนเข้า B3 รวม `thiefCondCritDmgCap` 0.75) | กัน u1+u3+t3a ซ้อนกัน |
| On-Hit D.Strike ต่อ Ult (`thiefOnHitStrikeMax`) | 2 | **1** | budget |
| On-Hit คริ (**key ใหม่** `thiefOnHitCritShare`) | `min(1, st.crit)` ตรงๆ | `p += max(0, st.crit − p) × eff × 0.5` | Rev 3 กำกวม + budget |

> **ใช้ได้ทันที / ปรับจากคิวเล่น:** ทุกตัวเลขข้างบนเป็น KIT / stat → admin ปรับได้ · อย่าเพิ่มตัวคูณก่อนวัดซ้ำด้วย `thiefUltBudget()`

### 2.4 สิ่งที่ **ไม่** เอาจาก Rev 3 (เพราะชน budget)
- ❌ `(1 + pskill)` บนฮิตเงาพริ้ว (§2.5 Rev 3) → วันนี้ไม่มี (F1) · ใส่ = +60% ที่ STR 121 → ชน budget ทันที
- ❌ `poisonMul = 0` สำหรับ shadowDance ที่ไม่ใช่ On-Hit → เปลี่ยนพฤติกรรมพิษของผู้เล่นทุกคนโดยไม่มีเหตุผล budget (F11) · `poisonMul` ถ้าจะทำ = งาน P3 (Sinister Steel)
- ❌ ตัดกฎ On-Hit ที่บอก `procs('basic')` "1/เป้า/Ult" ออกไม่ได้ → คงไว้ (ดาเมจจากการ์ดอยู่นอก budget · เสี่ยง ดู §5)

---

## 3) Task list (ลำดับ commit)

> **ทุก task ต้องผ่าน:** `npm run typecheck` + คำสั่ง test ของ task · ห้าม `npm test` เต็มชุด
> **Merge conflict ที่คาด:** `trees/thief.ts` · `skill-math.ts` KIT · `tunables.ts` strings · `stats.ts` — rebase ต่อ branch P2b โดยต่อท้ายของเดิม (ห้ามเรียงใหม่)

### T1 · ลงทะเบียน KIT + Stats keys (ยังไม่เปลี่ยนพฤติกรรม)
`feat(thief): register P2c ult/shroud KIT + stat keys`

**ไฟล์ / บรรทัด**
| ไฟล์ | แก้ |
|---|---|
| `src/data/skill-math.ts:84-88` | เพิ่ม key ในบล็อก `thief*` ของ `KIT` ตามตาราง KIT ด้านล่าง |
| `src/data/tunables.ts:146-147` | ต่อท้าย `KIT_INTS` / `KIT_NUMS` (ใช้ `\|` ต่อ · ห้ามลบของ P2a/P2b) |
| `src/data/skill-registry.ts:131` | ต่อ `kit('key','label')` ใน `SKILL_LAYOUT.thief.ult` (ชุด Ult/Shroud) · ที่เหลือ (dodge / cap) ใส่ `SKILL_LAYOUT.thief.tree` ถ้ามี field `tree?: SkillRef[]` (`:50`) |
| `src/admin/explain/combo-kit.ts:253-257` | `KIT_EXPLAIN[key] = { label, effect }` ทุก key (ห้ามใช้ fallback `ตัวคูณคิทคลาสหลัก`) |
| `src/data/stats.ts:~62` + `:436-439` | เพิ่ม type + `PLAYER` ค่า `0` ทุก Stats key ด้านล่าง |
| `src/data/tree.ts:68` | `INT_FIELDS` เพิ่ม `'thGhostShroud'`, `'thUltCritRes'` |

**KIT keys (ชนิด INT = `int(0,50)` / NUM = `num(0,20)` · ✱ = ไม่อยู่ใน R4.7)**
| Key | ค่า | ชนิด | Label (admin · Thai) |
|---|---|---|---|
| `thiefUltDexEvery` | 15 | INT | เงาพริ้ว: ทุกกี่ DEX ได้ +1 ที |
| `thiefUltDexHitCap` | **3** (R4.7=6) | INT | เงาพริ้ว: ทีจาก DEX สูงสุด |
| `thiefUltDexW` ✱ (แทน `thiefUltDexPer`) | 0.3 | NUM | เงาพริ้ว: DEX นับเป็นกี่ส่วนของ AGI (สัดส่วน Ratio) |
| `thiefUltHitCap` ✱ | 7 | INT | เงาพริ้ว: ทีจาก DEX/ทาเลนต์ รวมกับฐานไม่เกิน |
| `thiefUltExtraW` ✱ | 0.5 | NUM | เงาพริ้ว: ทีเพิ่ม (DEX / `th_t3b`) แรงกี่ส่วนของทีปกติ |
| `thiefShroudBase` | 1 | INT | Ghost Shroud: ชาร์จฐาน |
| `thiefShroudEvery` | 2 | INT | Ghost Shroud: +1 ทุกกี่เทิร์นฮีโร่ |
| `thiefShroudFlee` | 0.15 | NUM | Shadow Shield: × FLEE ฐาน |
| `thiefShroudHpCap` | 0.2 | NUM | Shadow Shield: สูงสุด % Max HP |
| `thiefUltCritShare` | **0.6** (R4.7=0.75) | NUM | เงาพริ้ว (สาย u1): รับ crit กี่ส่วน |
| `thiefUltCritCap` | **0.42** (R4.7=0.75) | NUM | เงาพริ้ว: คริสูงสุดหลังโบนัส (ไม่ต่ำกว่าฐานเดิม) |
| `thiefUltCondCap` ✱ | 0.30 | NUM | เงาพริ้ว: ดาเมจคริเงื่อนไขของ Ult รวมสูงสุด (ก่อนเข้า B3) |
| `thiefExecBelow` | 0.35 | NUM | เพชฌฆาตเงา: HP ต่ำกว่า |
| `thiefUltExecBelow` | 0.5 | NUM | เงาสังหาร (`th_t3a`): HP ต่ำกว่า |
| `thiefUltCritResCap` | 24 | INT | เพชฌฆาตเงา: Energy สูงสุด/Ult |
| `thiefOnHitBase` | 0.38 | NUM | On-Hit: eff ฐาน |
| `thiefOnHitTalHi` | 0.05 | NUM | On-Hit: โบนัสทาเลนต์ R2 |
| `thiefOnHitTalLo` | 0.03 | NUM | On-Hit: โบนัสทาเลนต์ R1 |
| `thiefOnHitCap` | 0.55 | NUM | On-Hit: eff สูงสุด |
| `thiefOnHitStrikeMax` | **1** (R4.7=2) | INT | On-Hit: D.Strike สูงสุด/Ult |
| `thiefOnHitCritShare` ✱ | 0.5 | NUM | On-Hit: คริฮิตเงาพริ้วขยับเข้าหาคริตีปกติ กี่ส่วนของ eff |
| `thiefCounterMul` | 0.8 | NUM | เงาสวน: × P.ATK |
| `thiefCounterExposedMul` | 1.1 | NUM | เงาสวน: × P.ATK เมื่อเป้า Exposed |
| `thiefFinisherAt` | 3 | INT | เงาพันคม: คริกี่ครั้งได้ฮิตปิด |
| `thiefFinisherMul` | **0.3** (R4.7=1.4) | NUM | เงาพันคม: ฮิตปิด × สูตร Ult |
| `thiefUltCdCutCap` | 2 | INT | ลด CD Ult สูงสุด/เทิร์น (ใช้ร่วม Rogue) |
| `thiefUltCdFloor` | 1 | INT | CD Ult ต่ำสุดในเทิร์นที่เพิ่งกด |
| `thiefDodgeBuffTurns` | 2 | INT | บัฟหลังหลบ: นาน (จำนวนครั้งที่มอนลงมือ) |
| `thiefDodgeFleeTurns` | 2 | INT | ก้าวเงา: FLEE หลังหลบ นาน (เทิร์นฮีโร่) |
| `thiefMistPoison` | 2 | INT | ร่างเงาลวงตา: สะท้อนพิษ (stack) |
| `thiefFloorCap` ✱ | 0.2 | NUM | fleeFloor รวมโบนัสชั่วคราว สูงสุด (เท่า clamp `hero-stats.ts:489`) |
| `thiefCondCritDmgCap` | 0.75 | NUM | B3: ดาเมจคริเงื่อนไขรวมทุกแหล่ง สูงสุด (**P2c เป็นเจ้าของ**) |
| `thiefKindsAt` | 2 | INT | **ใช้ร่วม** · ถ้า P2a ยังไม่ได้เพิ่ม → เพิ่มที่นี่ (label: ดีบัฟหลายชนิด = กี่ชนิดขึ้นไป) |

**`Stats` keys ใหม่ (default `0` ใน `PLAYER`)** — ใส่ `// P2c` comment ต่อกลุ่ม
`thGhostShroud` (INT_FIELDS) · `thShroudFleeRatio` · `thShadowFlee` · `thShadowFloor` · `thTrueDr` · `thDodgeUltCd` · `thDodgeNextCrit` · `thCounterExposed` · `thUltCrit` · `thUltCondCritDmg` · `thUltOnHit` · `thUltOnHitTal` · `thUltOnHitStar` · `thExecUlt` · `thUltCritRes` (INT_FIELDS) · `thUltFinisher` · `thUltExtraHits` · `thWaveShroud` · `thDodgeFlee` · `thWaveOpenCrit` · `thWaveOpenCritDmg` · `thUltExecCrit` · `thUltExecDmg` · `thUltKillFinisher` · `thUltShroudRatio` · `thDodgeShield` · `thMistFloor` · `thMistDr` (= 28 keys)
- `thExecute` (เดิม): **ยังอยู่** แต่ใส่ comment `// retired: no source after P2a` (ไม่ลบ key → ไม่กระทบ save / stat-text)

**Test / verify:** `npm run typecheck` · `node tools/test.mjs skill-registry` · `node tools/test.mjs admin-engine`
- `skill-registry.test.ts:20-28`: ทุก `kit()` ref ต้องอยู่ใน `KIT_INTS`/`KIT_NUMS` + ค่าเริ่มอยู่ใน min..max (`int 0–50`, `num 0–20`)
- `admin-engine.test.ts:39-54`: ทุก field ต้องมี `KIT_EXPLAIN` ที่ไม่ใช่ fallback

---

### T2 · เมธอด pure + test งบ Ult
`feat(thief): pure ult plan math + budget test`

**ไฟล์:** `src/data/skill-math.ts` (ต่อท้ายส่วน thief · ก่อน `ultInfo` `:626`) · `tests/thief-ult-budget.test.ts` (ใหม่)

**ฟังก์ชัน pure (ไม่ import Phaser):**
```ts
thiefUltHits(st): { full: number; extra: number }
  // full = KIT.thiefUltHits + st.ultHits (gear/card · นับเต็ม)
  // extra = min(st.thUltExtraHits, max(0, KIT.thiefUltHitCap - full))   (ฮิตพวกนี้ ×KIT.thiefUltExtraW)
thiefOnHitEff(st): number
  // hasOn = thUltOnHit>0 || thUltOnHitTal>0 || thUltOnHitStar>0 ; 0 ถ้าไม่มี
  // base = thUltOnHit>0 ? thiefOnHitBase + thUltOnHit + (thUltOnHitTal>0 ? (thUltOnHitTal>=0.5 ? TalHi : TalLo) : 0) : thUltOnHitTal
  // min(thiefOnHitCap, base + thUltOnHitStar)
thiefUltCritRate(base, st, basicCrit, eff): number
  // ถ้า thUltCrit>0 หรือ thUltExecCrit>0 → add = thUltCrit + thUltExecCrit(เมื่อเข้าเงื่อนไข) + basicCrit×(thiefUltCritShare − CRIT_RULES.skillFromCrit)
  // eff>0 → add += max(0, basicCrit − p) × eff × thiefOnHitCritShare
  // return max(base, min(thiefUltCritCap, base + add))          ← ห้ามต่ำกว่าฐานเดิม (กัน crit สูงโดนตัด)
thiefUltCondCritDmg(st, f:{kinds:number; hpBelowExec:boolean; hpBelowT3a:boolean}): number
  // min(thiefUltCondCap, thUltCondCritDmg×min(kinds,4) + (hpBelowExec? thExecUlt:0) + (hpBelowT3a||kinds>=thiefKindsAt ? thUltExecDmg:0))
thiefUltBudget(st, hero:{crit,skillCrit,critMul}, ratioA): number   // = โมเดลใน §2 (U หน่วย hit-eq)
```
- `thiefUltBudget` ต้องเรียก 5 ฟังก์ชันข้างบนเอง (ห้ามคัดลอกสูตร) เพื่อให้ BattleScene กับ test ใช้สูตรเดียวกัน
- เพดานทดสอบ = `thiefUltBudget(today-best)` ที่ `KIT.thiefUltHits + 3` ฮิตเต็ม, `th_t3b` วันนี้ = `ultHits: 3`

**Test ที่เพิ่ม (`thief-ult-budget.test.ts`):**
1. ทุกแถว NA–NI ใน §2.2 ≤ `1.02 × ceiling` · แถว ND/NH/NI ≥ 0.9 (กัน cut เกินจน build ตาย)
2. โปรไฟล์ crit 0.2/1.8 · 0.55/2.6 · 0.7/3.0 ≤ `1.02 ×` เพดานของโปรไฟล์นั้น
3. `thiefUltHits`: gear `ultHits 3` + `thUltExtraHits 5` → `extra = 0` (รวม 7) · `ultHits 0` + 5 → `extra = 3`
4. `thiefUltCritRate`: ฐาน 0.55 + ไม่มีโหนด → 0.55 (ไม่โดนตัดที่ 0.42)
5. `thiefOnHitEff`: `u2`L5 → 0.50 · +★ → 0.55 · `th_t3b`R2 อย่างเดียว → 0.50 · `u2`L5+`th_t3b`R2+★ → 0.55 (cap)

**Verify:** `npm run typecheck` · `node tools/test.mjs thief-ult-budget`

---

### T3 · Ratio AGI + DEX · ฮิตจาก DEX
`feat(thief): DEX counts toward Ratio AGI and adds ult stabs`

**ไฟล์:** `src/data/meta/hero-stats.ts:286-289, 301` · `tests/thief-ult-agi.test.ts` · `src/data/statInfo.ts:69`
- `thiefUltAgiBonus(agiAboveStart, pool, dexAboveStart = 0)` → `share = (max(0,agi) + KIT.thiefUltDexW × max(0,dex)) / max(pointsPerLevel, pool)` · พารามิเตอร์ที่ 3 default 0 = test เดิมผ่านไม่ต้องแก้
- `:301` → `thiefUltAgiBonus(d('agi'), statPool(s), d('dex'))`
- เพิ่มใน `heroBuild` (job `thief`): `st.thUltExtraHits += Math.min(KIT.thiefUltDexHitCap, Math.floor(Math.max(0, d('dex')) / KIT.thiefUltDexEvery))` (ตรงกับสูตร Rev 3 `⌊(DEX−1)÷15⌋`)
- `statInfo.ts:69`: ต่อข้อความ DEX line ของ thief: "DEX ช่วยเพิ่มสัดส่วน + ทีแทง"
- **ห้ามแตะ** `STAT_RULES.pointsPerLevel` · `statPool()` (R4.2: งาน RO-stat แยก)

**Test (แก้ `tests/thief-ult-agi.test.ts` ต่อท้าย):**
- `(237, 240, 0)` = เดิม · `(194, 240, 45)` = `K × (194 + 0.3×45)/240` ≈ 1.73 · gear ล้น → ≤ `K × shareCap` (**DEX ไม่ทะลุ ×3.4**)
- `heroStats` thief: DEX 46 → `thUltExtraHits === 3` · DEX 1 → 0 · archer → 0

**Verify:** `npm run typecheck` · `node tools/test.mjs thief-ult`

---

### T4 · โหนด `thief_b` (b1–b4★) + `thief_u` (u1–u4★)
`feat(thief): web nodes thief_b (Ghost Dance) + thief_u (Crit/On-Hit)`

**ไฟล์:** `src/data/trees/thief.ts` (ต่อท้าย `branches` + `nodes`) · `src/data/tree.ts:180-181` (เพิ่ม `thief_u: "ult"`)
- branch ใหม่: `{ id: 'thief_u', job: 'thief', name: 'เงาสังหาร', icon: '🗡️', blurb: 'คริ · On-Hit · ฮิตปิด' }` · `thief_b` มีอยู่แล้ว → เปลี่ยน blurb เป็น `'Ghost Dance · หลบ · Shroud · สวน'`
- **ก่อนเพิ่ม:** ตรวจว่า P2a ลบ `thief_b3` (เดิม branch `thief_crit` · มีดคู่) แล้ว — id ซ้ำจะทำให้ `nodeById` ชน
- เขียน `thief_b1`, `thief_b2`, `thief_b4` ใหม่ (id เดิมความหมายใหม่) + เพิ่ม `thief_b3`, `thief_u1–u4`
- `stretchNode` ทำงานกับ T1–T3 (max 3 → 5) ส่วน ★ (tier 4, max 1) ไม่ยืด · `mod(lv)` รับ `lv` = `0.6 … 3.0`

**ตารางโหนด (ค่าที่ L1 / L2 / L3 / L4 / L5 = lv 0.6 / 1.2 / 1.8 / 2.4 / 3.0)**
| ID | T | ชื่อ | `mod(lv)` | ค่า L1→L5 | `desc` กฎ | `INT_FIELDS` |
|---|---|---|---|---|---|---|
| `thief_b1` | 1 (3→5) | ย่องเบาในเงา | `{ thShadowFlee: 6*lv, thShadowFloor: 0.02*lv, thTrueDr: 0.04*lv }` | flee 4→18 · floor 1.2%→6% · DR 2.4%→12% | เฉพาะ `Math.round()` · **เงื่อนไข "ใน Shadow window" อยู่ใน BattleScene (T6)** | – |
| `thief_b2` | 2 | หายใจในเงา | `{ thGhostShroud: lv, dodgeHeal: 0.02*lv, thShroudFleeRatio: 0.05*lv }` | Shroud +1,+1,+2,+2,+3 · heal 1.2%→6% · ratio 3%→15% | ทุกเลข `Math.round` | ✅ `thGhostShroud` |
| `thief_b3` | 3 | เงาวนลูป | `{ thDodgeUltCd: Math.min(1, lv/3), thDodgeNextCrit: 0.06*lv }` | โอกาสลด CD 20%→100% · คริถัดไป 3.6%→18% | `Math.round` | – |
| `thief_b4` ★ | 4 (1) | เงาสวน | `{ dodgeStrike: 1, thCounterExposed: 1 }` | — | ข้อความ: แทงสวน 0.8x · Exposed 1.1x · **ไม่ทำลาย Shroud ของ th_smoke** | – |
| `thief_u1` | 1 | เงาจุดตาย | `{ thUltCrit: (0.05/3)*lv, thUltCondCritDmg: 0.04*lv }` | skillCrit +1%→5% · crit dmg/ชนิด +2.4%→12% | `Math.round(lv*5/3)` ฯลฯ | – |
| `thief_u2` | 2 | เงาประสานอาวุธ | `{ thUltOnHit: 0.04*lv }` | eff 0.38 + (2.4%→12%) = **40.4%→50.0%** | integer % | – |
| `thief_u3` | 3 | เพชฌฆาตเงา | `{ thExecUlt: 0.06*lv, thUltCritRes: 2*lv }` | crit dmg vs HP<35%: +3.6%→**+18%** · Energy/คริ 1,2,4,5,6 | **ห้ามทศนิยมใน desc** (มี INT key) | ✅ `thUltCritRes` |
| `thief_u4` ★ | 4 (1) | เงาพันคม | `{ thUltOnHitStar: 0.05, thUltFinisher: 1 }` | eff +5% · คริ ≥ `thiefFinisherAt` → ฮิตปิด `thiefFinisherMul` | — | – |

- **desc เขียนแบบ INT-safe ทุกโหนดที่มี key ใน `INT_FIELDS`:** `Math.round(...)%` เท่านั้น · ไม่ใส่ `\d+\.\d+` ลงใน template (กัน `tidy(s, true)` ปัดทศนิยมทั้งก้อน — §2.3 box)
- **ห้ามใช้ `base + step*lv` ใน `mod`** (undershoot ที่ L1 หลัง stretch) → `thief_u2` เก็บแค่ `0.04*lv` · `0.38` อยู่ใน `KIT.thiefOnHitBase`
- `th_t3a` ฯลฯ เป็นทาเลนต์ (ไม่ถูก stretch) → ใช้ rank 1/2 ตรงๆ ใน T5

**Test (ใหม่ `tests/thief-ult-web.test.ts` + รัน `node-stretch`):**
1. ทุกโหนด b/u: `mod(max)` ครบ · `desc(1..max)` ไม่มี `undefined|NaN` · key ∈ `PLAYER` · ค่า finite
2. โหนดที่มี `thGhostShroud` / `thUltCritRes`: `desc(lv)` ทุกระดับไม่มี `\d+\.\d+` · mod เป็นจำนวนเต็ม ≥ 1 ที่ L1
3. `thief_b2.mod(1..5).thGhostShroud === [1,1,2,2,3]` · `thief_u3.mod(1..5).thUltCritRes === [1,2,4,5,6]`
4. chain parent: `nodeById('thief_b1').parent === 'thief_ultp'` · `thief_u1.parent === 'thief_ultp'` · `thief_u4★` ต้องผ่าน `lockReason` เมื่อ `thief_u1..3` ครบ (capstone rule `TREE_RULES.capstoneNeed`)
5. `thief_u: ult` ใน `ATTACH` → `TREE` มี branch line `ult` 2 อัน (web col 5, 6)

**Verify:** `npm run typecheck` · `node tools/test.mjs thief-ult-web` · `node tools/test.mjs node-stretch` · `node tools/test.mjs admin-model`

---

### T5 · ทาเลนต์ `th_t1a` `th_t1b` `th_t3a` `th_t3b` `th_t3c` `th_t4c`
`feat(thief): ult-side talents (rows 1, 3, 4c)`

**ไฟล์:** `src/data/trees/thief.ts` `talents` (id เดิม ความหมายใหม่ · ต่อกับของ P2a/P2b ที่แก้ `th_t2*` `th_t1c` `th_t4a`)
| ID | Rank 1 → 2 | `mod(r)` | ข้อสังเกต |
|---|---|---|---|
| `th_t1a` ก้าวเงา | Shroud เปิดเวฟ 1\|2 · FLEE +12\|+20 หลังหลบ | `{ thWaveShroud: r, thDodgeFlee: r===1?12:20 }` | |
| `th_t1b` เปิดฉากซุ่ม | หลบแน่น 1\|2 เปิดเวฟ · ฮิตแรกของเวฟ คริแน่ (R2 +25%) | `{ waveDodge: r, thWaveOpenCrit: 1, thWaveOpenCritDmg: r===1?0:0.25 }` | `thWaveOpenCritDmg` เป็นสมาชิก B3 |
| `th_t3a` เงาสังหาร | skillCrit +3\|5% (ult) · crit dmg +10\|20% เมื่อ HP<50% หรือดีบัฟ ≥ 2 · ฮิตปิด 0.25\|0.30× · **ultDodge −1** | `{ thUltExecCrit: r===1?0.03:0.05, thUltExecDmg: r===1?0.10:0.20, thUltKillFinisher: r===1?0.25:0.30, ultDodge: -1 }` | ค่าลบ `ultDodge`: ตรงกับ Rev 3 · `ultDodge` ไม่ใช่ INT-stretch (ทาเลนต์) |
| `th_t3b` คมมีดประสาน | ทีเพิ่ม +1\|+2 (นับ ×0.5) · On-Hit eff 40\|50% | `{ thUltExtraHits: r, thUltOnHitTal: r===1?0.40:0.50 }` | **เปลี่ยนจากเดิม** `ultHits 2\|3` → 0.5 weight |
| `th_t3c` เงาหมอกลวงตา | หลบแน่น +1\|+2 · พิษ +2\|+3 ต่อทีหลบ · Shroud shield `+5\|10%` FLEE · โล่หลบ `10\|20%` FLEE | `{ ultDodge: r, ultPoison: r===1?2:3, thUltShroudRatio: r===1?0.05:0.10, thDodgeShield: r===1?0.10:0.20 }` | โล่หลบ ICD 1/เทิร์นฮีโร่ = flag (R4.7: ไม่ใช่ตัวเลข) |
| `th_t4c` ร่างเงาลวงตา | fleeFloor −6\|−10% · DR trueSight/`monHit≥999` −15\|25% · สะท้อนพิษ `thiefMistPoison` | `{ thMistFloor: r===1?0.06:0.10, thMistDr: r===1?0.15:0.25 }` | |

- `desc(r)` ต้องตรง `talentRankText` (`talent-text.test.ts`: `now === desc(r)`)
- ค่าทุกตัวใน `mod` ที่ ≠ `ultDodge` ต้อง **> 0** (กฎเดียวกับ `job2-talents`, ใช้ตรวจเองใน test ใหม่เพราะ test เดิมตรวจแค่ `TALENTS2`)

**Test:** ต่อ `thief-ult-web.test.ts`: ทาเลนต์ 6 ตัว · ทุก key ∈ `PLAYER` · ค่า > 0 ยกเว้น `ultDodge` ของ `th_t3a` = −1 · แถว 3 เลือกได้ 1 จาก 3 (`save.ts:83` ไม่ซ้อน)
**Verify:** `npm run typecheck` · `node tools/test.mjs thief-ult-web` · `node tools/test.mjs talent` · `node tools/test.mjs job2-talents`

---

### T6 · Ghost Shroud + `onShroudBreak()` + แยก `dodgeFx()`
`feat(thief): Ghost Shroud charges, Shadow Shield, onShroudBreak (not a dodge)`

**ไฟล์:** `src/scenes/BattleScene.ts` (scene fields ใกล้ `dodgeCharges`) · `hurtHeroCore` `:4407-4437` · `spawnRoom` `:528-529` · `heroAct` `:1033`
1. **fields (private):** `ghostShroud = 0` · `shroudTurnTick = 0` · `shadowWin = 0` (นับ monTurn) · `dodgeFleeTurns = 0` · `shroudShieldTurn = -1` · reset ใน reset-run ที่ `:380` (บรรทัดเดียวกับ `smashCdLeft = 0`)
2. `maxShroud()` = `anySrc ? KIT.thiefShroudBase + st.thGhostShroud : 0` โดย `anySrc = thGhostShroud>0 || thWaveShroud>0 || thUltShroudRatio>0` · **P3 `rg_t4_leech` เพิ่มเงื่อนไขทีหลัง**
3. `gainShroud(n)` → `min(maxShroud(), +n)` · เรียกจาก: กดเงาพริ้ว (+1, ใน `shadowDance` ต้นฟังก์ชัน) · `heroAct` ทุก `KIT.thiefShroudEvery` เทิร์นเมื่อ `thGhostShroud>0` · `spawnRoom` เมื่อ `thWaveShroud>0` (ต่อท้าย `:529`)
4. **แยก `dodgeFx(src)`** ออกจาก `dodged()` (`:4410-4426`): ย้าย counter / `staticCounter` / `dodgeHeal` / `arDodge*` / `dodgeEnergy` + hook ของ P2a (`th_t2a` CD cut) เข้า `dodgeFx` · `dodged()` = `[label+evadeJuice]` + trueSight counter (`:4412-4415` **เหลือใน `dodged()` เท่านั้น**) + `dodgeFx(src)`
   - `dodgeFx` เพิ่ม: เปิด `shadowWin = KIT.thiefDodgeBuffTurns` · `dodgeFleeTurns = KIT.thiefDodgeFleeTurns` (เมื่อ `thDodgeFlee>0`) · `thDodgeNextCrit` → `nextCrit` (T8) · `thDodgeUltCd` → `cutUltCd(1,'thief_b3')` เมื่อ `Math.random() < thDodgeUltCd`
   - `thief_b4★` counter: ใช้ `dodgeStrike` เดิม (gear ใช้ตัวเดียวกัน) → ถ้า `st.thCounterExposed>0 && src.exposed>0` ใช้ `KIT.thiefCounterExposedMul` ไม่งั้น `KIT.thiefCounterMul` (ทั้งคู่ 0.8 = `BATTLE.counterMul` เดิมเมื่อไม่ Exposed → gear ไม่เปลี่ยน) · เพิ่ม param `mul` ให้ `dashStrike(m, mul = BATTLE.counterMul)` `:4241-4254`
5. **จุดใช้ Shroud:** แทรก **หลัง `:4437` ก่อน block/guard `:4438`** (ก่อนคำนวณ `raw`):
   ```ts
   if (src && !src.dead && this.ghostShroud > 0) { this.ghostShroud--; this.addShield(min(KIT.thiefShroudHpCap*maxHp, (KIT.thiefShroudFlee + st.thShroudFleeRatio + st.thUltShroudRatio) * this.fleeNow()), true); this.onShroudBreak(src) }
   ```
   - ใช้เฉพาะมีมอนโจมตี (`src` มีค่า) · **DoT / hazard (src undefined) ไม่กิน**
   - `dodgeCharges > 0` ทำงานก่อน (`:4428`) ไม่กิน Shroud ✓ (ตรง Rev 3)
   - Shield ขึ้นก่อน `this.shield > 0` absorb ที่ท้ายฟังก์ชัน (F7) → ซับท่า `trueSight` / `monHit ≥ 999` ที่กำลังเข้า
6. `onShroudBreak(src)` = `floatText('🌫️ Shroud แตก')` + `dodgeFx(src)` **โดยไม่ `src.evaded++`** → ไม่เร่ง `trueSight`
7. `thDodgeShield` (`th_t3c`): ใน `dodgeCharges` branch `:4428` ก่อน `return dodged(...)`: ถ้า `st.thDodgeShield>0 && shroudShieldTurn !== this.fightTurns` → `addShield(min(0.2·maxHp, thDodgeShield × fleeNow()))` แล้วตั้ง `shroudShieldTurn = fightTurns` (ICD flag)

**Test:** ต่อ `tests/thief-ult-web.test.ts` ไม่ได้ (BattleScene ใช้ Phaser) → คงตรรกะ pure ใน `skill-math.ts`: `thiefShroudShield(st, flee, maxHp)` + `thiefMaxShroud(st)` แล้ว test pure 2 ตัวนี้ (cap 0.2·maxHp · base 0.15 + ratio · max 4 ที่ b2 L5 + base 1)
**Verify:** `npm run typecheck` · `node tools/test.mjs thief-ult-web`
**Manual (บอกคิว):** เล่นบอสที่มี `trueSight` (Hell/Hard) · เช็ก Shroud ไม่ทำให้ `evaded` นับ

---

### T7 · Shadow window: `thief_b1` · `th_t1a` FLEE · `th_t4c` · `fleeNow()` · `th_t1b`
`feat(thief): shadow window (flee/floor/DR) + wave-open crit`

**ไฟล์:** `BattleScene.ts` `:4437` (flee/floor) · หลัง `n` คำนวณ `:~4458` · `monTurn` `:4081` · `heroAct` `:1033` · `strike()` `:1233` · `spawnRoom` `:528`
- `inShadow()` = `shadowWin > 0 || dodgeCharges > 0 || this.shroudTurns > 0` (**`shroudTurns` = สถานะ Shroud ของ `th_smoke` จาก P2b** — ดู §4)
- `fleeNow()` = `st.flee + (dodgeFleeTurns>0 ? st.thDodgeFlee : 0) + (inShadow() ? st.thShadowFlee : 0)` → แทน `this.st.flee` ที่ `:4437` (ที่เดียวที่ใช้กับ hit-roll มอน · `:5944` เป็นแค่ HUD)
- floor: `0.8 − Math.min(KIT.thiefFloorCap, st.fleeFloor + (inShadow() ? st.thShadowFloor + st.thMistFloor : 0))`
- DR ท่าข้าม Flee: เมื่อ `monHit >= 999 || src.trueTurns>0 (กายภาพ)` และ `inShadow()` → `n = ceil(n × (1 − thTrueDr − thMistDr))` (cap รวม 0.9) + `th_t4c`: `src.poison = min(poisonMax, +KIT.thiefMistPoison)` · `m.poisonDmg = max(...)`
- `monTurn` ต้นฟังก์ชัน: `if (this.shadowWin > 0) this.shadowWin--` (**นับเมื่อมอน "ตัวใดก็ได้" ลงมือ** — ดู §6 คำถาม 2) · `heroAct` ต้นเทิร์น: `if (this.dodgeFleeTurns > 0) this.dodgeFleeTurns--`
- `th_t1b`: `waveOpenArmed = st.thWaveOpenCrit > 0` ใน `spawnRoom`; ฮิตแรกของเวฟที่ `strike()` (`:1234`) → `forceCrit`-เทียบเท่า (ใช้ `crit = true`) แล้ว disarm · ไม่นับ pet/ally (`this.allyHitting`)

**Test:** pure: `thiefFloorNow(st, inShadow)` ใน `skill-math.ts` (cap 0.2) · `thiefTrueDr(st)` (cap 0.9) · เพิ่มใน `thief-ult-budget.test.ts` หรือไฟล์ `thief-ult-web.test.ts`
**Verify:** `npm run typecheck` · `node tools/test.mjs thief-ult`

---

### T8 · Global Ult CD cap `cutUltCd()`
`feat(thief): global ult cooldown cut cap (-2 per hero turn, floor 1 after cast)`

**ไฟล์:** `BattleScene.ts` `:1033` (reset ต้นเทิร์น) · `:1062` (ตั้ง `ultJustCast`) · helper ใหม่ ถัดจาก `ultTurns()` `:1109`
```ts
private ultCdCutLeft = 0; private ultJustCast = false
private cutUltCd(n: number, tag: string) {
  if (this.job.id !== 'thief' || this.smashCdLeft <= 0 || this.ultCdCutLeft <= 0) return 0
  const floor = this.ultJustCast ? KIT.thiefUltCdFloor : 0
  const cut = Math.min(n, this.ultCdCutLeft, Math.max(0, this.smashCdLeft - floor))
  ...
}
```
- `heroAct` `:1033`: `this.ultCdCutLeft = KIT.thiefUltCdCutCap; this.ultJustCast = false` ก่อน `smashCdLeft--`
- `:1062` ตอนกด: `this.ultJustCast = true`
- **นับเฉพาะ source ที่ route ผ่าน `cutUltCd`:** `thief_b3` (T6) · `th_t2a` (P2a → **rewire ตอน T8**: ค้น `smashCdLeft -` ที่ P2a เพิ่ม · แทนด้วย `cutUltCd(1,'th_t2a')`) · P3 (Voracity / `rg_u2` / `rg_t2_voracity`) ใช้ helper เดียวกัน
- **ไม่แตะ** ที่ลด CD เดิมของ relic/archer/monk/Mobster (`:2263` ฯลฯ) — เป็นการ์ด/ท่าคลาสอื่น ไม่ใช่ใน list Rev 3 §5.1 → Mobster ทวงหนี้ refund ยังทำงานเหมือนเดิม
- `ultCooldown()` (`skill-math.ts:357`) **ไม่แตะ** (static cd) · cap อยู่ที่ runtime เท่านั้น

**Test:** pure `ultCdCut(cdLeft, want, budget, justCast, floor)` ใน `skill-math.ts` → test: want 2 budget 2 → 2 · budget 1 → 1 · justCast + cd 1 → 0 · cd 0 → 0 · เรียกซ้ำใน 1 เทิร์นรวม ≤ `thiefUltCdCutCap`
**Verify:** `npm run typecheck` · `node tools/test.mjs thief-ult`

---

### T9 · `shadowDance()` ใหม่ (ฮิต · คริ · On-Hit · finisher · พิษ · Energy)
`feat(thief): shadowDance extra-hit weight, ult crit/on-hit/finisher, shroud charge`

**ไฟล์:** `BattleScene.ts:3714-3731` · `critRateFor` `:2893` (ผ่าน flag) · `ultInfo` `skill-math.ts:713-716`
```ts
private async shadowDance(hitPow: number) {
  this.gainShroud(1)                                  // T6 · ต้นฟังก์ชัน
  this.dodgeCharges = Math.max(this.dodgeCharges, KIT.thiefUltDodge + this.st.ultDodge) // วันนี้ "="; max ตาม Rev 3 §2.5
  const { full, extra } = thiefUltHits(this.st), eff = thiefOnHitEff(this.st)
  this.shadowFiring = { eff, crits: 0, res: 0, strikes: 0 }
  ...ลูป full + extra ฮิต; ฮิตที่ index >= full ใช้ mul × KIT.thiefUltExtraW
  ...เรียก thiefUltCritRate() ผ่าน this.ultCritOverride = ... (ดูล่าง)
  ...finisher หลังลูป
}
```
- `Math.max(dodgeCharges, …)`: วันนี้เป็น `=` (`:3715`) → เปลี่ยนเป็น `max` ตาม Rev 3 ได้ แต่ถ้ามี `waveDodge` เหลือ ไม่ลดลง — **พฤติกรรมเปลี่ยนเล็กน้อย (ดีขึ้นกับผู้เล่น)** · Rogue ใช้ร่วม
- **คริ:** ฮิตเงาพริ้วเรียก `critRateFor()` ตามปกติ (F3) → ตั้ง `this.ultCritAdd = thiefUltCritRate(baseRate, …) − baseRate` แล้วให้ `critRateFor` (`:2900` ในกิ่ง `skill`) บวก `ultCritAdd` เมื่อ `this.shadowFiring` · cap ตาม `max(base, min(thiefUltCritCap, base+add))` (T2)
- **On-Hit** (`eff > 0`): ต่อฮิต → `this.lsMul = eff` (ดูดเลือดตาม `st.lifesteal`) · `thUltOnHitTal>0` ฯลฯ ไม่มีเอฟเฟกต์เพิ่มเกิน `thiefOnHitStrikeMax` · D.Strike: `Math.random() < doubleAtkChance(st.doubleAtk) × eff` และ `strikes < KIT.thiefOnHitStrikeMax` → `this.withSrc('basic', () => this.doubleAttack(m, 0.6…))` ·`procs('basic')` ≤ 1 / เป้า / Ult (Set ต่อ cast) · `thWound` +1 ด้วยโอกาส `eff` **เมื่อ `st.s2Lv>0` และ s2 = `th_wound` (P2b)** · ห้ามเรียก `poisonMul` (§2.4)
- **พิษ:** `ultPoison` เดิมไม่เปลี่ยน (`:3723`)
- **Energy `thUltCritRes`:** คริแต่ละครั้ง `res += st.thUltCritRes` สะสมไม่เกิน `KIT.thiefUltCritResCap` ต่อ cast (ใช้ `this.shadowFiring.res`)
- **finisher** (1 ฮิต/Ult · เอาตัวที่แรงกว่า): `th_t3a` → `st.thUltKillFinisher` (R2 + เป้า HP < `thiefExecBelow` → `forceCrit`) · `thief_u4★` → เมื่อ `crits >= KIT.thiefFinisherAt` → `KIT.thiefFinisherMul` + `forceCrit` · สูตรฮิต `KIT.thiefUlt × hitPow × (1 + thUltAgi) × mul` (×A ตาม R4.3 ✓) · ไม่ทริกเกอร์ On-Hit ซ้ำ
- **ห้าม** เพิ่ม `(1 + pskill)` · ห้ามเปลี่ยน `KIT.thiefUlt` (0.7)
- `ultInfo` `:713-716`: แสดง `แทง ${full} + ${extra}×${W} ที` · คริ/On-Hit/finisher บรรทัดใหม่ (`InfoRow`) · `skill-math.ts:714` ใช้ `hitText()` เดิม
- Rogue: `shadowDance(h2)` เรียกเหมือนเดิม (`:2242`) · `thUltAgi` ใช้ stat เดียวกัน · `throwKnives` หลังจากนั้นไม่แตะ

**Test:** pure ครบแล้วใน T2 · เพิ่ม integration แบบ light: `tests/thief-ult-budget.test.ts` → `ultInfo('thief', st).some(r => r.label.includes('แทง'))` ไม่ throw ด้วย `st` ทุก build
**Verify:** `npm run typecheck` · `node tools/test.mjs thief-ult` · `node tools/test.mjs skill-hud`
**Manual (บอกคิว):** Lv 80 Rogue AGI 238 (build เดิมของคิว) → ดาเมจต่อ Ult ต้อง ≤ ก่อนหน้า (เทียบ combat log)

---

### T10 · B3 aggregator (`condCritDmg`) + ลบ `thExecute` ×1.5
`feat(thief): B3 conditional crit-dmg bracket (cap 0.75), drop thExecute x1.5`

**ไฟล์:** `BattleScene.ts:1247, 1250` · helper ถัดจาก `critPow()` `:2908`
- `:1247` **ลบ** บรรทัด `thExecute` (F5 · ไม่มีแหล่ง) · `Stats.thExecute` คง (T1)
- `:1250` `critDmgAdd` += `this.condCritDmg(m)` โดย
  ```ts
  private condCritDmg(m: Mon): number {
    const ult = this.src === 'ult' ? thiefUltCondCritDmg(this.st, { kinds: this.ultKinds(m), hpBelowExec: m.hp < m.def.hp*KIT.thiefExecBelow, hpBelowT3a: m.hp < m.def.hp*KIT.thiefUltExecBelow }) : 0
    const basicExec = (this.src==='basic'||this.src==='combo') && m.hp < m.def.hp*KIT.thiefExecBelow ? this.st.thExecUlt : 0   // u3: "และ Basic"
    return Math.min(KIT.thiefCondCritDmgCap, ult + basicExec + this.st.thWaveOpenCritDmg×(first hit) + this.shroudCritDmg() /*P2b*/ + this.nextCritAdd /*b3*/)
  }
  ```
- `ultKinds(m)` = นับ Poison(`m.poison>0`) / Wound(`m.wound>0`, P2b) / Exposed(`m.exposed>0`, P2b) / Chill(`m.chill>0 || m.frozen`) — **4 ชนิด · ของ P2c เอง** (`thiefKindsAt` ใช้ตรวจ ≥ 2) · ไม่พึ่ง `debuffKinds()` ของ P2a (คนละชุด: P2a/P2b นับ 8 ชนิดตาม R4.6)
- ลำดับ cap: **ult-own ≤ `thiefUltCondCap` 0.30** (ใน `thiefUltCondCritDmg`) → รวมกับสมาชิกอื่นของ B3 → **≤ `thiefCondCritDmgCap` 0.75**
- `nextCritAdd` (`thief_b3`): ตั้งใน `dodgeFx` = `thDodgeNextCrit` → ใช้กับ **ฮิตคริถัดไป 1 ครั้ง** แล้วเคลียร์ (ไม่ใช่ crit rate; Rev 3 เขียน "crit +x%" → ตีความเป็น crit **dmg** เพื่อเข้า B3 · ดู §6 คำถาม 1)
- ห้ามคูณเข้า `mul` (R4.6 B3: บวกเข้า `critDmgAdd`)

**Test:** pure `thiefUltCondCritDmg` (T2) + `condCritCap(parts, cap)` (เพิ่มใน T10): `[0.30, 0.25 smoke★, 0.36 heartRend]` → 0.75 · ไม่ติดลบ
**Verify:** `npm run typecheck` · `node tools/test.mjs thief-ult` · `node tools/test.mjs crit-split`

---

### T11 · sync เครื่องมือ + เอกสาร
`chore(thief): bot.cjs ids + P2c status in design doc`

- `tools/bot.cjs`: ค้น id ที่ P2c เปลี่ยนความหมาย (`th_t1a/b`, `th_t3a/b/c`, `th_t4c`, `thief_b1–b4`) · ตอนนี้ bot ใช้ `thief_core1` เท่านั้น (`:54` TREEX comment) และ `TAL` ตัวอย่าง `th_t1c` (`:75`) → อัปเดตตัวอย่าง comment + ถ้ามี preset thief ให้ใส่ node ใหม่ (ตรวจแล้วไม่มี preset ที่อ้าง id เหล่านี้ใน HEAD · P2a อาจเพิ่ม)
- `design/thief-rogue-rework-v1.md` R4.4: ติ๊ก P2c (ถ้าเจ้าของอนุญาต — **นี่เป็นไฟล์ design ไม่ใช่ src/tests/tools**)
- `docs`: ตาราง §2.2 ใน spec นี้ ← อัปเดตเลขถ้าคิวปรับ KIT

**Verify:** `npm run typecheck` · `node tools/test.mjs thief` · `node tools/test.mjs skill-registry` · `node tools/test.mjs admin-engine` · `node tools/test.mjs node-stretch` · `node tools/test.mjs talent` · `node tools/test.mjs job2-talents`

---

## 4) Interfaces

### 4.1 P2c **ต้องการ** จาก slice ก่อนหน้า
| จาก | ต้องมี | ใช้ที่ | ถ้าไม่มี |
|---|---|---|---|
| **P2a** | `migrateThiefRogueRework` + flag (reset `jobTree` / `jobTalents` · **ต้องคืนแต้ม**) | ทุก id ที่ความหมายเปลี่ยน (T4/T5) | ห้ามเริ่ม T4 |
| P2a | ลบ node `thief_b3` / `c2` / `c3` / `c4` เดิม (branch `thief_crit` / `thief_blood`) · ลบ `thief_crit` `thief_blood` ออกจาก `branches` | T4 กัน id ซ้ำ | T4 fail `nodeById` |
| P2a | `thief_core` c1–c4 (c4 ใช้ "อยู่ใน Shroud" = **`shroudTurns` จาก P2b**) | — | ไม่พึ่ง |
| P2a | KIT `thiefKindsAt` (R4.7) | T1/T10 | T1 เพิ่มเอง |
| P2a | `th_t2a` (`dodgeEnergy` + ลด CD Skill2/Ult) ใน `dodged()` | T6 ย้ายเข้า `dodgeFx` · T8 rewire เป็น `cutUltCd` | ถ้า P2a ใส่ใน `dodged()` → ย้ายตอน T6 |
| P2a | `s1Weave` + `autoCost` floor | ไม่พึ่ง | — |
| **P2b** | `Mon.exposed` (turns, number) · `Mon.wound` (number) | T6 (`src.exposed`) · T9 (`ultKinds`) · T10 | ถ้าชื่อต่าง → แก้เฉพาะ `ultKinds()` + T6 counter |
| P2b | `private shroudTurns` (Shroud ของ `th_smoke`) | `inShadow()` (T7) | ใช้ `this.shroudTurns ?? 0` + TODO |
| P2b | method `shroudCritDmg(): number` (Shroud★ +0.25 ← `S2N.smokeCritDmg`) · **ห้าม P2b บวกเข้า `critDmgAdd` ตรง** → P2c รวมใน B3 | T10 | ถ้า P2b บวกตรงไว้แล้ว → T10 ย้ายเข้า aggregator + ตรวจ cap |
| P2b | helper `takenAmp()` (B1) | ไม่พึ่ง (คนละ bracket) | — |

### 4.2 P2c **ให้** slice หลัง (P2d / P3)
| สิ่งที่ให้ | ชื่อ | ผู้ใช้ |
|---|---|---|
| Hook หลบ | `private dodgeFx(src?: Mon)` · `private onShroudBreak(src: Mon)` | P2d Gambler's Edge (LUCKY! → เรียก `dodgeFx` หรือ branch ใน `dodged()` ก่อนส่ง) · P3 `rg_t3_dodge` / `rg_c3` |
| Shroud | `gainShroud(n)` · `maxShroud()` (+ แหล่ง P3 `rg_t4_leech`) | P3 |
| CD cap | `cutUltCd(n, tag)` | P3 Voracity / `rg_u2` / `rg_t2_voracity` |
| B3 | `condCritDmg(m)` + `KIT.thiefCondCritDmgCap` | P3 `j2HeartRend` (`rg_x2`) ต่อท้าย aggregator |
| On-Hit | `thiefOnHitEff(st)` | P3 `rg_x4★` (On-Hit Ult knives ≤ 2) |
| window | `inShadow()` · `fleeNow()` | P2d Shadow Ward / Toxic Overheal |
| KIT | ทุก key ใน T1 | admin |
| DEX | `thUltExtraHits` ← DEX (job thief) | P3 `ultDexKnives` (คนละ key) |

### 4.3 สมมติฐานที่ตัดสินเอง (เพราะ scope list ไม่ระบุ)
- **DEX → ฮิตเงาพริ้ว** อยู่ใน **P2c** (P2d list ไม่มี DEX · §2.5 Rev 3 อยู่ในหมวด Ult)
- `thief_u3` ใช้กับ **Basic ด้วย** (Rev 3 §2.5) · งบ Basic อยู่นอกการวัดนี้ แต่ติด cap B3

---

## 5) ⚠️ ความเสี่ยง (Risks)

### 5.1 Mobster (`job === 'thief'` + `job2 === 'mobster'`)
| จุด | ผล | มาตรการ |
|---|---|---|
| Ult nodes `u1–u4` / `th_t3a/b/c` | **ไม่มีผลกับทวงหนี้** (ไม่เรียก `shadowDance` · F16) แต่ `thief_u3` ทำให้ **Basic คริ** ของ Mobster แรงขึ้นกับ HP<35% (+18% สูงสุด · ใต้ cap B3) | ยอมรับ · วัดใน §5.4 (`JOB2_K.mobster` วัดใหม่ ทาง A) |
| `thief_b3` / `th_t2a` ลด CD ult | Mobster ลด CD **ทวงหนี้** ได้ผ่าน dodge (cap −2/เทิร์น) · `:2263` refund เดิมไม่ผ่าน cap → ซ้อนได้ | สอดคล้อง Rev 3 §5.1 (ไม่ list `:2263`) · ถ้าแรงเกิน → route `:2263` ผ่าน `cutUltCd` (ไม่ทำใน P2c) |
| Ghost Shroud / b1–b2 / `th_t1a` | ทำงานเต็มกับ Mobster (ไม่เกี่ยว ult) | ตั้งใจ |
| ไม่แตะ `trees2/mobster.ts` · `JOB2.mobster` · `KIT2.mobster` | ✅ P2c ไม่มีบรรทัดแตะ | ตรวจ diff ก่อน PR |

### 5.2 Rogue (shadowDance ใช้ร่วม)
- `th_t3b` วันนี้ +3 ฮิตเต็ม (7 ฮิต) → ใหม่ +2 × 0.5 = 5 hit-eq (+ On-Hit คริเล็กน้อย) · **Rogue ที่ใช้ `th_t3b` อย่างเดียวจะ Ult เบาลง ~25–30%** (18.3 → ~13) จนกว่าจะลง u-line (ถึง 96%) · P3 ปรับ `ultDexKnives` / Death Mark ชดเชยได้ · คิวต้องรู้ก่อนเล่น
- `Math.max` ใน `dodgeCharges` (T9) กระทบ Rogue ด้วย (ไม่แย่ลง)

### 5.3 Save safety
- P2c **ไม่แก้ `save.ts`** — พึ่ง `migrateThiefRogueRework` ของ P2a · id ที่เปลี่ยนความหมาย: `thief_b1/b2/b4`, `th_t1a/b`, `th_t3a/b/c`, `th_t4c` (+ ใหม่ `thief_b3`, `thief_u1–u4`)
- ถ้าผู้เล่นข้าม migration (flag ไม่ตั้ง) → `thief_b3` เดิม (มีดคู่) จะอ่านเป็น "เงาวนลูป" → **P2a ต้อง gate ทุก save** (R4.3 #5)
- `Stats` ใหม่ทั้งหมดเป็น 0 ใน `PLAYER` · `thExecute` คง key → loader เก่าไม่พัง
- `th_t3a` `ultDodge: -1` : `KIT.thiefUltDodge + st.ultDodge` ต่ำสุด = 1 (gear ไม่มี ultDodge ลบ) → ไม่ติดลบ

### 5.4 `stretchNode()` / `INT_FIELDS` / `tidy()` (§2.3 box)
- `thGhostShroud` · `thUltCritRes` ∈ `INT_FIELDS` → โหนด `thief_b2` / `thief_u3` มี `whole = true` → **`desc(lv)` ห้ามมี `\d+\.\d+`** (ใช้ `Math.round`) · mod ของ key ที่ไม่ใช่ INT (เช่น `dodgeHeal`, `thExecUlt`) **ไม่ถูกปัด** (`tree.ts:137-143`)
- **ห้าม `base + step*lv`** → `thief_u2` `0.04*lv` + base 0.38 ใน `KIT` · `thief_u1` `(0.05/3)*lv`
- `thief_b3` ใช้ `Math.min(1, lv/3)` → `mod(max) = 1` = `raw.mod(3) = 1` ✓ (`node-stretch.test.ts` "full level = old full value")
- ★ (`thief_b4`, `thief_u4`) tier 4 ไม่ยืด → ค่าตรง

### 5.5 R4.6 brackets
| Bracket | P2c สร้าง/แตะ | จุดเสี่ยง |
|---|---|---|
| **B3** Crit Dmg | aggregator `condCritDmg` + cap `0.75` · ult-own cap `0.30` | P2b `Shroud★ +0.25` / P3 `rg_x2 +0.36` เข้ามาบวก → ชน cap 0.75 = ตั้งใจ · **ต้องไม่บวกตรงเข้า `critDmgAdd` นอก aggregator** |
| B1 Taken | ไม่แตะ · `Exposed` ใช้อ่านใน counter (×1.1) ซึ่งเป็น **mul ของสกิลเอง** ไม่ใช่ amp บน `mul` รวม | — |
| B4 Skill-own | `th_t3a/b` finisher / extra hit = ฮิตแยก ไม่ซ้อน `mul` | — |
| Pipeline `:1247` `thExecute` ×1.5 | ลบ (T10) | ยืนยัน grep `thExecute` ใน `src/` เหลือแค่ `stats.ts` |

### 5.6 Test contracts
- `job2-talents.test.ts` (`v > 0`): **ตรวจเฉพาะ `TALENTS2`** → P2c ไม่กระทบ แต่รันซ้ำยืนยัน · ทาเลนต์ class 1 ตรวจเองใน `thief-ult-web.test.ts` (ยกเว้น `ultDodge −1`)
- `skill-registry.test.ts:20-28` (T1): ทุก `kit()` ใน `SKILL_LAYOUT.thief` ต้อง whitelisted + default ∈ min..max → ค่า `thiefUltCdCutCap` ฯลฯ ต้องเป็น INT จริง
- `admin-engine.test.ts:39-54` (T1): `KIT_EXPLAIN` ครบทุก key · **ถ้า P2c เพิ่ม key ใน `KIT_INTS` แต่ลืม explain → fail**
- `talent-text.test.ts`: `desc(r)` ของทาเลนต์ P2c = `talentRankText(t, r).now`
- `node-stretch.test.ts:69-` (T4): `mod` เป็นจำนวนเต็ม + ≥ 1 สำหรับ `INT_FIELDS` ที่ L1 · ค่า ≤ full ทุกระดับ
- `thief-ult-agi.test.ts` (T3): พารามิเตอร์ที่ 3 default 0 → test เดิมผ่าน
- ห้าม `npm test` เต็มชุด (R4.3 #6) — ใช้ `node tools/test.mjs <name>`

### 5.7 อื่นๆ
- **`procs('basic')` ของการ์ด** ใน On-Hit (≤ 1/เป้า/Ult) = ดาเมจนอก budget → วัดเมื่อคิวมีการ์ด proc
- **budget ไม่นับ:** ฮีล On-Hit · พิษ · โล่ (utility) · ดาเมจ Rogue knives
- หน้าต่าง `shadowWin` นับ "มอนลงมือ" (F10) → เวฟ 4 ตัวหมดเร็ว · ยังไม่ได้เล่นทดสอบ
- ตัวเลข balance ทั้งหมด **ยังไม่ได้เล่นจริง** (R4.3 #6) — §2 เป็นโมเดลคำนวณ ไม่ใช่ผล simulation ในเกม

---

## 6) คำถามถึงเจ้าของ (ไม่ block · มี default แล้ว)
1. **`thief_b3` "คริถัดไป +x%"** — ตีความเป็น **Crit Damage +x% (เข้า B3)** ไม่ใช่ crit rate เพื่อไม่ให้ทะลุ cap 0.42/0.6 · โอเคไหม? (default: โอเค)
2. **หน้าต่าง "2 เทิร์นมอน" (b1 / `th_t4c`)** — นับ "การลงมือของมอนตัวใดก็ได้" (default) หรือ "ต่อเทิร์นฮีโร่"? (เวฟหลายตัว = สั้นกว่ามาก)

---

## 7) Checklist ก่อนส่งต่อ slice ถัดไป
- [ ] `npm run typecheck` ผ่าน
- [ ] `node tools/test.mjs` ผ่านทั้ง: `thief-ult` · `skill-registry` · `admin-engine` · `admin-model` · `node-stretch` · `talent` · `job2-talents` · `crit-split`
- [ ] `grep -rn "thExecute" src` เหลือเฉพาะ `stats.ts`
- [ ] `git diff --stat` ไม่มี `trees2/mobster.ts` · `jobs2.ts` (mobster) · `KIT2.mobster`
- [ ] ตาราง §2.2 ตรงกับ `thiefUltBudget()` (test ผ่าน)
