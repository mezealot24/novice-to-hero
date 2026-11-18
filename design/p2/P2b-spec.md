# P2b Spec — Thief Skill 2 (ม่านควัน / ล้วงกระเป๋า / แผลลึก)

> **ฐาน:** branch `claude/thief-ult-agi-ratio` · อ้างอิง `design/thief-rogue-rework-v1.md` (Rev 4 Delta ชนะ Rev 3) · เลขบรรทัด = โค้ดจริง ณ วันที่เขียน (ตรวจแล้ว)
> **ลำดับโค้ด:** P2a → **P2b (ไฟล์นี้)** → P2c → P2d · แต่ละ task = 1 commit · **ห้ามรัน `npm test` เต็มชุด** ใช้ `node tools/test.mjs <ส่วนของชื่อไฟล์>`

---

## 0. TL;DR

| เรื่อง | สรุป |
|---|---|
| ขอบเขต | Skill 2 ทั้ง 3 ท่า · สถานะมอนใหม่ `Exposed` / `Wound` / `Blind`(ใช้ร่วม) / `woundHealCut` · bracket **B1 Taken** (`takenAmp()`) · ทาเลนต์ `th_t4a` + `th_t1c` · D.Strike Gate (+Energy, `thiefStrikeLs`) |
| จำนวน task | **10 commit** (T1–T10) |
| Stat ใหม่ | `thStackHp`, `thCondTenacity`, `thPrivileged` (default 0 ใน `PLAYER`) |
| KIT ใหม่ | 8 key (R4.7.2) · S2P 2 key · S2N 25 key (R4.7.3) |
| ไม่แตะ | `src/data/trees2/mobster.ts` · `JOB2.mobster` · `KIT2.mobster` · `KIT2.crusader.blindHit` |
| ผลข้างเคียงต่อ Mobster | `th_t4a` เดิม (`poisonAmp` ผ่านทาเลนต์) หาย → ถูกแทนด้วย `thPrivileged` ใน B1 (cap 0.60) · Mobster ยังเลือก Skill 2 Thief ได้ → โดน rework นี้ด้วย → ต้องวัด `JOB2_K.mobster` ใหม่ (§5.4 ของ design · ทำหลัง P2c) |

---

## 1. ข้อเท็จจริงจากโค้ด (ตรวจแล้ว — ใช้เป็นฐานของทุก task)

| # | ข้อเท็จจริง | ที่อยู่ |
|---|---|---|
| F1 | Skill 2 ทั้ง 3 ท่าอยู่ใน `castSkill2()` | `BattleScene.ts:3332` (`th_smoke`) · `:3337` (`th_pick`) · `:3346` (`th_wound`) |
| F2 | `th_smoke` วันนี้มีแค่หลบแน่นอน + ฮีล · **ไม่มี `Shroud` / `raidReady` / `Exposed` เลย** | `:3332-3336` |
| F3 | `th_pick` เรียก `this.strike(m, S2N.pickMul(star))` ตรง ๆ — `src` = `'skill'` (ถูกห่อโดย `asSkill(...,'skill','s2')` `:3260`) → ใช้ crit สูตร skill | `:3340` · `critRateFor` skill branch `:2900-2901` |
| F4 | `S2N.pickMul` เป็น **function** (`star ? 1.6 : 1`) · `pickRes`/`woundPoison`/`smokeHeal`/`smokeDodges`/`woundMul` มีแล้ว | `skill-math.ts:347-349` |
| F5 | `S2P` วันนี้มีแค่ `smokeHeal`, `pickRes` ของ Thief | `skill-math.ts:320-326` |
| F6 | ค่าร่าย: `th_smoke` 40/CD 4 · `th_pick` 30/CD 3 · `th_wound` 35/CD 3 | `skill2.ts:58,60,62` |
| F7 | admin layout ของ Thief s2: `th_smoke`=`smokeHeal`, `th_pick`=`pickRes`+`s2n.pickPoison`, `th_wound` **ไม่มี ref** | `skill-registry.ts:127-129` |
| F8 | `Mon` interface ไม่มี `exposed`/`wound`/`woundHealCut` · มี `blind` (Crusader) | `BattleScene.ts:73-110` · `blind` `:96` |
| F9 | `Mon` literal มีที่เดียว (`blind: 0` อยู่ที่นี่) → เพิ่ม field ใหม่ที่นี่ที่เดียว tsc จับที่อื่นให้ | `:554-555` |
| F10 | `m.blind` ตัด Hit มอนด้วย `KIT2.crusader.blindHit` (**0.2** = `skill-math.ts:175`) · tick ต้น `monTurn` | ตัด Hit `:4430` · tick `:4090` |
| F11 | `healCut(m)` มี 2 branch (hell / burn) · `healMon` ใช้มัน | `:5190-5207` |
| F12 | amp พิษ `poisonAmp` ใช้ `m.poison >= 10` (**10 hardcode**) · ใช้กับ dot ด้วย | `:3905` |
| F13 | `th_t4a` วันนี้ = `poisonAmp` 0.15/0.25 · `th_t1c` วันนี้ = `maxHp` +40/+80 | `trees/thief.ts:42,52` |
| F14 | `thExecute`/`thief_c4` เดิมอยู่ที่ `:1247` (P2a จัดการ) | — |
| F15 | `damageMon(m, dmg, crit, color, dot)` — `dot=true` ยังโดน `marked`/`lateDmg`/`poisonAmp` | `:3885-3906` |
| F16 | `doubleAttack(m, mul)` = D.Strike · `lsMul = 0.33` **hardcode** · เรียกจาก `basicOnce` (thief auto `:3433`/mob `:3171`) | `:2980-2987` |
| F17 | `heroAct()` เริ่มที่ `:1017` · `skill2Turn()` ถูกเรียกที่ `:1044` · `monTurn()` `:4081` | — |
| F18 | `strike()` — จุดเดียวที่ทุกฮิตผ่าน (หลัง `damageMon` `:1264`) · มี `backStabbing` flag `:1682` | `:1223-1300` |
| F19 | `noPetCrit(fn)` มีอยู่แล้ว (ห้ามคริในฟังก์ชัน) — ใช้กับ Blade's End ที่ไม่ใช่ ★ | `:1345-1346` |
| F20 | `withSrc(src, fn)` ใช้ได้ · `Src` = `'basic'\|'combo'\|'counter'\|'skill'\|'ult'\|...\|'other'` | `:4716` · `perks.ts:14` |
| F21 | dropChance 💎 อยู่ที่ `killMon` | `:4064` |
| F22 | **ไม่มีคำว่า `maxHpCap` ในโค้ด** (Rev 3 §2.7 `th_t1c` อ้างถึง) → ตัดทิ้ง (ดู T9) | grep ทั้ง `src` ว่าง |
| F23 | Skill 2 "+" node = kind `s2plus` → **ไม่ผ่าน `stretchNode()`** (`n.kind` ออกก่อน) · ข้อความใช้ `tidy(desc(x), false)` เมื่อ `s2Lv` ไม่ใช่จำนวนเต็ม (`s2LvOf = lv×3/5` = 0.6, 1.2, 1.8, 2.4, 3.0) | `tree.ts:125-129` · `:154-156` · `:270-277` |
| F24 | `JOB2_K.mobster = 1.1` (first guess) | `power.ts:32` |
| F25 | Mobster `debt(m)` นับดีบัฟ 6 ชนิด (poison/burn/chill/weak/marked/armorBrk) — **ไม่นับ** Exposed/Wound → ไม่เปลี่ยน ห้ามเพิ่ม | `:2042-2046` |

**แก้ Rev 3 ที่ขัดโค้ด (P2b ใช้ค่าด้านขวา):**

| Rev 3 เขียน | โค้ดจริง / ที่ตกลง | เหตุผล |
|---|---|---|
| "Blind ลด monHit `BattleScene.ts:4423`" | `:4430` ใช้ `KIT2.crusader.blindHit` (0.2) ร่วมกัน | R4.6 ระบุแล้ว · **ไม่สร้าง key Blind ของ Thief** (ถ้า Crusader ปรับ blindHit Thief ตามไปด้วย — ยอมรับ) |
| "ทาเลนต์ `maxHpCap` cap" | ไม่มี cap นี้ | cap = `thiefStackHpMax` (20 stack) × `thStackHp` เท่านั้น |
| Exposed `+20/30%` คูณ (§2.4) | **บวกใน B1 cap 0.60** (R4.6) | R4.6 |
| `th_wound` Privileged "+12% ของ Poison, Wound, Basic, Skill" | บวกใน B1 · ใช้กับ dot ด้วย (ตรงกับ `poisonAmp` เดิมที่ใช้กับ dot) | R4.6 ตาราง B1 |

---

## 2. Task list (1 task = 1 commit)

> กฎร่วม: ทุก commit ต้องผ่าน `npm run typecheck` + `node tools/test.mjs <ชื่อ>` ที่ระบุ · ห้าม `any` · ตัวเลข balance ไปอยู่ `KIT` / `S2N` / `S2P` เท่านั้น (AGENTS.md ข้อ 2)

### T1 — `feat(thief): B1 takenAmp + debuffKinds pure helpers + KIT keys`

**ทำไมก่อน:** helper เป็น pure function ใน `skill-math.ts` → เทสต์ได้โดยไม่ต้องมี Phaser (เทสต์ในโปรเจกต์นี้ import `data/` เท่านั้น เช่น `tests/thief-ult-agi.test.ts`)

**ก่อนเริ่ม (guard):** `grep -n "thiefKindsAt\|thiefTakenCap\|debuffKinds\|takenAmp" src` — ถ้า P2a สร้างบางตัวแล้วให้ **ขยาย** ไม่ใช่สร้างซ้ำ

**ไฟล์ + การแก้**

| ไฟล์ | การแก้ |
|---|---|
| `src/data/skill-math.ts` (ใน `KIT` ถัดจากบรรทัด `thiefUltAgiK…` `:88`) | เพิ่ม KIT 7 key ตาราง A ด้านล่าง |
| `src/data/skill-math.ts` (ใต้ `S2N`, ก่อน `// ---------- costs` `:352`) | เพิ่ม `DebuffFlags`, `debuffKinds()`, `TakenIn`, `takenAmp()` (โค้ดตัวอย่างด้านล่าง) |
| `src/data/tunables.ts:146-147` | เติมชื่อ INTS ใน `KIT_INTS` · NUMS ใน `KIT_NUMS` (ต่อท้าย string `\|key`) |
| `src/admin/explain/combo-kit.ts` (ท้าย `KIT_EXPLAIN` ต่อจาก `thiefUltDodge` `:257`) | เพิ่ม `{ label, effect }` ครบทุก key (effect ต้องไม่ตรง `GENERIC_FALLBACKS` `admin-engine.test.ts:25`) |
| `src/data/skill-registry.ts` (`SKILL_LAYOUT.thief` `:124-132`) | เพิ่ม `tree?: SkillRef[]` (ถ้า P2a ยังไม่ได้เพิ่ม) แล้ว `kit('key','label')` ครบทุก key |

**ตาราง A — KIT keys (ค่า/ชนิด/label ตาม R4.7.2)**

| Key | ค่า | ชนิด | Label (admin) | ใช้ใน |
|---|---|---|---|---|
| `thiefTakenCap` | 0.6 | NUMS | B1: ดาเมจที่มอนรับเพิ่ม สูงสุด | `takenAmp` |
| `thiefKindsAt` | 2 | INTS | "ดีบัฟหลายชนิด" = กี่ชนิดขึ้นไป | `th_t4a` (P2a `thief_c1` / P2c `th_t3a` ใช้ร่วม — **สร้างโดยใคร commit แรก**) |
| `thiefPrivAt` | 8 | INTS | Privileged: พิษขั้นต่ำ (stack) | `th_t4a` |
| `thiefStackHpMax` | 20 | INTS | กายต้านพิษ: นับ stack สูงสุด | `th_t1c` (T9) |
| `thiefStrikeRes` | 4 | INTS | D.Strike ติด: คืน Energy | T10 (guard: ข้ามถ้า P2a ทำแล้ว) |
| `thiefStrikeLs` | 0.33 | NUMS | D.Strike: สัดส่วนดูดเลือด | T10 (แทน `0.33` ที่ `:2984`) |
| `thiefPoisonAmpAt` | 10 | INTS | กัดกร่อน (gear/การ์ด): พิษขั้นต่ำ | `takenAmp` — **เสนอเพิ่มนอกลิสต์ R4.7** เพื่อกำจัด literal `10` ที่ `:3905` ที่ย้ายเข้า helper (AGENTS.md ห้าม magic number) |

> **ต้องมี label ใน `KIT_EXPLAIN` ครบ** — ไม่งั้น `admin-engine.test.ts:39-54` fail · ค่าเริ่มต้นต้องอยู่ในช่วง `KIT_INTS int(0,50)` / `KIT_NUMS num(0,20)` (`tunables.ts:146-147`, `skill-registry.test.ts:20-28`) — ทุกค่าด้านบนอยู่ในช่วง ✔

**โค้ดตัวอย่าง (pure, ใน `skill-math.ts`)**

```ts
/** B1 (R4.6): flags of the debuffs one monster carries; the Scene fills it, the math stays Phaser-free. */
export interface DebuffFlags { poison: boolean; wound: boolean; exposed: boolean; chill: boolean; stabMark: boolean; blind: boolean; armorBrk: boolean; weak: boolean }
/** How many different debuff kinds. `wide` = the th_t4a list (8 kinds); otherwise the thief_c1 list (Poison / Wound / Exposed / Chill). */
export const debuffKinds = (f: DebuffFlags, wide: boolean): number =>
  (f.poison ? 1 : 0) + (f.wound ? 1 : 0) + (f.exposed ? 1 : 0) + (f.chill ? 1 : 0) +
  (wide ? (f.stabMark ? 1 : 0) + (f.blind ? 1 : 0) + (f.armorBrk ? 1 : 0) + (f.weak ? 1 : 0) : 0)

/** B1 inputs: each term is already 0 when its own filter fails (Exposed is !dot, Privileged needs its condition ...). */
export interface TakenIn { exposed: number; stabMark: number; woundPriv: number; privileged: number; poisonAmp: number }
/** B1 Taken (R4.6): terms ADD, one cap. */
export const takenAmp = (i: TakenIn): number =>
  Math.min(KIT.thiefTakenCap, i.exposed + i.stabMark + i.woundPriv + i.privileged + i.poisonAmp)
```

> `stabMark` = 0 จนกว่า P3 (Rogue) ใส่ — ช่องเตรียมไว้เพื่อให้ P3 แก้ 1 บรรทัด ไม่ต้องเปลี่ยน signature

**เทสต์ (ไฟล์ใหม่ `tests/thief-p2b.test.ts`)**

| เทสต์ | ตรวจ |
|---|---|
| `takenAmp` cap | `{exposed .3, woundPriv 0, privileged .3, poisonAmp .45}` → `KIT.thiefTakenCap` (0.6) · ค่าน้อยกว่า cap บวกกันตรง (ไม่คูณ) |
| `takenAmp` ว่าง | ทุกเทอม 0 → 0 |
| `debuffKinds` | narrow นับ 4 ชนิด · `wide` นับ 8 · ชนิดซ้ำไม่นับซ้ำ (flag เป็น boolean) |
| Mobster regression | gear 0.30 + `th_t4a` เดิม 0.25 = ×1.55 (วันนี้) vs ใหม่ (privileged 0.30 + gear 0.30 → cap 0.60) = ×1.60 — assert เพื่อเก็บตัวเลขที่ R4.6 ระบุ |

**Verify:** `npm run typecheck` · `node tools/test.mjs thief-p2b` · `node tools/test.mjs admin-engine` · `node tools/test.mjs skill-registry`

---

### T2 — `feat(thief): Skill 2 numbers S2P/S2N + admin labels + text`

**ไฟล์ + การแก้**

| ไฟล์ | การแก้ |
|---|---|
| `src/data/skill-math.ts:320-326` (`S2P`) | เพิ่ม `smokeRes: { base: 10, per: 5 }`, `woundMax: { base: 6, per: 2 / 3 }` |
| `src/data/skill-math.ts:330-350` (`S2N`) | เพิ่ม key ตาราง B (ตัวเลขล้วน) · **ลบ function `pickMul`** แทนด้วย `pickBase` / `pickStarMul` · เพิ่ม function `smokeRes(lv) = Math.round(lin(S2P.smokeRes, lv))`, `woundMax(lv) = Math.floor(lin(S2P.woundMax, lv))` (ดูหมายเหตุ) |
| `src/data/skill-math.ts:744-746` (`explainSkill2` ของ Thief) | เขียนบรรทัดแสดงผลใหม่ให้ตรงกลไกใหม่ (Shroud / Exposed / Wound ฯลฯ) |
| `src/data/skill2.ts:58-63` | ค่าร่าย `th_smoke` **40 → 35** (`:58`) · อัปเดต `desc` / `plus.desc(lv)` / `star.desc` ให้เรียก `S2N.*` (ห้ามฝังตัวเลข) |
| `src/data/skill-registry.ts:127-129` | `th_smoke` / `th_pick` / `th_wound` ใส่ `sk('s2n.<key>', label, int/num)` ครบ 25 ตัว + `...lin('smokeRes', …)` / `...lin('woundMax', …)` |
| `src/admin/explain/skills.ts:7-35` | `S2N_TH` เพิ่ม **ครบ 25 key** (บังคับ — ไม่มีแล้ว `admin-engine.test.ts:50` fail, ดู `:168`) · `S2P_TH` เพิ่ม `smokeRes`, `woundMax` (ไม่บังคับ แต่ทำเพื่อ effect ที่ดี `:158-162`) |
| `tests/skill-registry.test.ts:56-` (refactor guard) | เพิ่ม assert `S2N.smokeRes(lv) === Math.round(10 + 5*lv)` · `S2N.woundMax(lv) === Math.floor(6 + (2/3)*lv)` สำหรับ `lv ∈ {0,1,2,3,3.6,5}` |

> **หมายเหตุ `pickMul`:** grep แล้ว `pickMul` ถูกใช้แค่ `BattleScene.ts:3340` + `skill-math.ts:745` → ลบได้ปลอดภัย · **T2 ลบ `pickMul` แล้วแก้ทั้งสองจุดใน commit เดียวกัน** (`:3340` → `this.strike(m, (star ? S2N.pickStarMul : S2N.pickBase))` แบบชั่วคราวให้ compile; T7 เขียนทับด้วยโค้ดจริง) · commit T2 จึง compile ผ่านและพฤติกรรม `th_pick` เปลี่ยนเป็น 1.3x/1.9x ทันที (ตามสเปก)

**ตาราง B — S2P / S2N (R4.7.3; ค่า, สกิล, label)**

| Key | ค่า | สกิล | Admin def | Label |
|---|---|---|---|---|
| `S2P.smokeRes` | `{10, 5}` | smoke + | `lin` (COEF) | ควันหอม: คืน Energy |
| `S2P.woundMax` | `{6, 2/3}` | wound + | `lin` (COEF) | แผลฉีก: Wound สูงสุด |
| `S2N.smokeTurns` | 2 | smoke | `int(0,20)` | Shroud: นาน (เทิร์น) |
| `S2N.smokeFlee` | 0.25 | smoke | `num(0,5)` | Shroud: FLEE +% (คูณ) |
| `S2N.smokeSkillCrit` | 0.15 | smoke | `FRAC` | Shroud: skillCrit + |
| `S2N.smokeCritDmg` | 0.25 | smoke ★ | `num(0,5)` | Shroud ★: ดาเมจคริ + (→ B3) |
| `S2N.raidMul` | 1.2 | smoke | `MUL` | Sightless Raid: × P.ATK |
| `S2N.exposedPct` | 0.2 | smoke | `FRAC` | Exposed: รับดาเมจเพิ่ม (→ B1) |
| `S2N.exposedStar` | 0.3 | smoke ★ | `FRAC` | Exposed ★: รับดาเมจเพิ่ม |
| `S2N.exposedTurns` | 2 | smoke | `int(0,20)` | Exposed: นาน (เทิร์น) |
| `S2N.smokeBlindTurns` | 2 | smoke | `int(0,20)` | Blind: นาน (ตัด Hit ใช้ `KIT2.crusader.blindHit`) |
| `S2N.pickBase` | 1.3 | pick | `MUL` | ล้วงกระเป๋า: × P.ATK |
| `S2N.pickStarMul` | 1.9 | pick ★ | `MUL` | จอมโจร: × P.ATK |
| `S2N.pickZeny` | 8 | pick | `int(0,500)` | ปล้น Zeny ฐาน |
| `S2N.pickZenyDex` | 10 | pick | `int(1,100)` | ปล้น Zeny +1 ทุกกี่ DEX |
| `S2N.plunderRes` | 10 | pick ★ | `int(0,100)` | Plunder: Energy |
| `S2N.plunderDrop` | 0.05 | pick ★ | `FRAC` | Plunder: drop +%/stack |
| `S2N.plunderMax` | 3 | pick ★ | `int(0,20)` | Plunder: stack สูงสุด/เวฟ |
| `S2N.woundStacks` | 2 | wound | `int(0,20)` | Wound ต่อการแทง |
| `S2N.woundStarStacks` | 3 | wound ★ | `int(0,20)` | แผลมรณะ: Wound ต่อการแทง |
| `S2N.woundTurns` | 3 | wound | `int(0,20)` | Wound นาน (เทิร์นฮีโร่) |
| `S2N.woundStrikeChance` | 0.5 | wound + | `FRAC` | D.Strike แปะ Wound (โอกาส) |
| `S2N.bladeAt` | 3 | wound | `int(1,20)` | Blade's End: Wound ขั้นต่ำ |
| `S2N.bladeMul` | 1.8 | wound | `MUL` | Blade's End: × P.ATK |
| `S2N.bladeHealCut` | 0.4 | wound | `FRAC` | Blade's End: ตัดฮีลมอน |
| `S2N.bladeCutTurns` | 2 | wound | `int(0,20)` | Blade's End: ตัดฮีลนาน (เทิร์น) |
| `S2N.woundPriv` | 0.12 | wound | `FRAC` | Privileged: รับดาเมจเพิ่ม (→ B1) |

- ช่วง (`min..max`) ต้องครอบค่าเริ่มต้น (เทสต์ `skill-registry.test.ts:20-28`) — ตารางข้างบนครอบแล้ว (`COEF=0..200`, `MUL=0..20`, `FRAC=0..1`) · ถ้าต้องการ cap ที่ `FRAC` สำหรับ `smokeFlee` (0.25) ใช้ `num(0,5)` แทน
- **ต้องเป็นตัวเลขล้วน ไม่ใช่ function** (`skill-registry.test.ts:23` `typeof v === 'number'`) — `smokeRes()` / `woundMax()` ที่เป็น function ไม่ลงทะเบียนใน layout (ลงทะเบียนผ่าน `S2P` แทน เหมือน `smokeHeal`/`pickRes`)
- **ข้อความ + (`plus.desc(lv)`) ต้องออกจำนวนเต็มเมื่อ `s2Lv` เป็นเศษ** (F23): ใช้ `S2N.smokeRes(lv)` / `S2N.woundMax(lv)` / `S2N.woundPoison(lv)` ซึ่ง round/floor อยู่แล้ว · เปอร์เซ็นต์เขียน `Math.round(x*100)` · ห้ามเขียน `lv * 2 / 3` ในข้อความ (จะออกทศนิยมยาว → `tidy` ปัด 1 ตำแหน่ง ≠ ผลจริง)
- ข้อความ **ก่อน/หลัง** (ตัวอย่าง `th_smoke` desc): "ม่านควัน: หลบแน่นอน 1 ครั้ง + Shroud 2 เทิร์น (FLEE +25% · skillCrit +15%) · การโจมตีครั้งแรกหลังร่าย = Sightless Raid 1.2x + Exposed + Blind"

**Verify:** `npm run typecheck` · `node tools/test.mjs skill-registry` · `node tools/test.mjs admin-engine` · `node tools/test.mjs admin-model` · `node tools/test.mjs thief-p2b`

---

### T3 — `feat(thief): monster statuses Exposed / Wound / woundHealCut + ticks`

**พฤติกรรมใหม่: ยังไม่มีผู้เรียก** (ฟิลด์ + tick + แสดงไอคอน + `healCut`) → ปลอดภัยต่อ balance

**ไฟล์ + การแก้ (`src/scenes/BattleScene.ts`)**

| จุด | การแก้ |
|---|---|
| `interface Mon` `:73-110` (ถัดจาก `blind` `:96`) | `exposed: number; exposedPct: number` (turns มอนที่เหลือ · % ที่ติด) · `wound: number; woundTurns: number` (stack · เทิร์นฮีโร่ที่เหลือ) · `woundCut: number; woundCutTurns: number` · `bladeSpent?: boolean` · `robbed?: boolean` (T7 ใช้) |
| Mon literal `:554-555` | `exposed: 0, exposedPct: 0, wound: 0, woundTurns: 0, woundCut: 0, woundCutTurns: 0` (ถัดจาก `blind: 0`) |
| `monTurn()` ใกล้ `:4090` (ถัดจาก `blind`) | `if (m.exposed > 0 && --m.exposed === 0) { m.exposedPct = 0; this.dotIcon(m) }` · `if (m.woundCutTurns > 0 && --m.woundCutTurns === 0) { m.woundCut = 0 }` |
| `heroAct()` `:1017` (บรรทัดแรก ๆ คู่กับ `execTurnUsed` reset) | for ทุก `this.alive()`: `m.bladeSpent = false` · `if (m.woundTurns > 0 && --m.woundTurns === 0) { m.wound = 0; this.dotIcon(m) }` — **tick ก่อน `skill2Turn()` `:1044`** (Wound นับเทิร์นฮีโร่ · รีเฟรชทุกครั้งที่แปะ) |
| `healCut()` `:5190-5195` | รวมเป็น `Math.max(เดิม, m.woundCutTurns > 0 ? m.woundCut : 0)` — **ไม่ทับ** ผล hellfire/burn เดิม (ใช้ max ตามที่ Rev 3 ระบุ) |
| `dotIcon()` ข้อความ `:4569` | เพิ่ม `${m.exposed > 0 ? '👁️' : ''}${m.wound > 0 ? '🩸' + m.wound : ''}` |
| `toxicSkin` ที่ `:4092` | **ไม่แตะ** (Wound ไม่เร่งลดตาม Rev 3 "toxicSkin ไม่เร่งลด Wound") — ใส่ comment 1 บรรทัดกันคนเพิ่มทีหลัง |

**หมายเหตุ:** `Exposed` นับ **เทิร์นมอน** (เหมือน `blind` / `marked` `:4090`/`:4087`) · `Wound` นับ **เทิร์นฮีโร่** (ตาม §2.4) — สองระบบนับต่างกันโดยตั้งใจ

**เทสต์:** ไม่มีเทสต์ Phaser (BattleScene ไม่มีเทสต์ unit) → ครอบด้วย typecheck + เทสต์ pure ใน T1 · เพิ่ม **smoke test ด้วยบอท** ในขั้น verify ปลายทาง (§4)

**Verify:** `npm run typecheck`

---

### T4 — `feat(thief): B1 takenAmp in damageMon (replaces the flat poisonAmp line)`

**ไฟล์ + การแก้**

| ไฟล์ | การแก้ |
|---|---|
| `src/data/stats.ts:86` (interface) | `thPrivileged: number // Thief th_t4a: + damage taken by monsters with >= thiefPrivAt poison or >= thiefKindsAt debuff kinds (B1)` |
| `src/data/stats.ts` `PLAYER` literal `:439` | ต่อท้ายด้วย `thPrivileged: 0` (ในบรรทัดยาวเดียวกับ `poisonAmp: 0`) |
| `BattleScene.ts:3905` | แทนบรรทัด `if (this.st.poisonAmp > 0 && m.poison >= 10) …` ด้วย `const amp = this.takenAmpOf(m, dot); if (amp > 0) dmg = Math.ceil(dmg * (1 + amp))` |
| `BattleScene.ts` (เมธอดใหม่ใกล้ `srcMul` `:4731`) | `private takenAmpOf(m: Mon, dot: boolean): number` — ประกอบ `TakenIn` จากสถานะจริง (ตัวอย่างด้านล่าง) แล้วเรียก `takenAmp()` |
| `BattleScene.ts` helper | `private debuffFlags(m: Mon): DebuffFlags` — `poison: m.poison > 0`, `wound: m.wound > 0`, `exposed: m.exposed > 0`, `chill: m.chill > 0`, `stabMark: false` (P3), `blind: m.blind > 0`, `armorBrk: m.armorBrk > 0`, `weak: m.weakTurns > 0` |

```ts
private takenAmpOf(m: Mon, dot: boolean): number {
  const f = this.debuffFlags(m)
  const priv = this.st.thPrivileged > 0 && (m.poison >= KIT.thiefPrivAt || debuffKinds(f, true) >= KIT.thiefKindsAt) ? this.st.thPrivileged : 0
  return takenAmp({
    exposed: !dot && m.exposed > 0 ? m.exposedPct : 0,       // Exposed = !dot (§2.4)
    stabMark: 0,                                              // P3 (Rogue) fills this
    woundPriv: this.s2?.id === 'th_wound' && m.poison > 0 && m.wound > 0 ? S2N.woundPriv : 0, // 2-3 Privileged (all damage incl. dot)
    privileged: priv,
    poisonAmp: this.st.poisonAmp > 0 && m.poison >= KIT.thiefPoisonAmpAt ? this.st.poisonAmp : 0, // gear / cards / sets keep the old 10-stack rule
  })
}
```

**พฤติกรรมที่ต้องรักษา**
- `dot=true` ยังโดน `poisonAmp` / `thPrivileged` / `woundPriv` (ตรงกับของเดิมที่ `:3905` ใช้กับ dot) · `Exposed` ข้าม dot
- ทวงหนี้ (Mobster) `debtBursting` เรียก `damageMon(..., dot=true)` ที่ `:2257` → ยังอ่าน `m.poison` ก่อนเคลียร์ → เหมือนเดิม (commit `f21211b`)
- วันนี้ `th_t4a` ยังส่ง `poisonAmp` อยู่ → T4 เดี่ยว ๆ **ไม่เปลี่ยนตัวเลขใด** (ยกเว้น cap 0.60 ที่ชนเมื่อ gear สูงสุด 0.45 + `th_t4a` 0.25 = 0.70 → ถูกตัดเป็น 0.60) → บันทึกไว้ใน commit message

**เทสต์:** ต่อยอด `tests/thief-p2b.test.ts` จาก T1 (cap · ตัวอย่าง R4.6.3 B1 = `0.30+0.30+0.15+0.30=1.05 → ×1.60`)

**Verify:** `npm run typecheck` · `node tools/test.mjs thief-p2b`

---

### T5 — `feat(thief): th_t4a Privileged Status talent`

| ไฟล์ | การแก้ |
|---|---|
| `src/data/trees/thief.ts:52` | แทน `th_t4a` ทั้งบรรทัด — ชื่อ **สถานะทับซ้อน (Privileged Status)** · mod `{ thPrivileged: r === 1 ? 0.18 : 0.30 }` · desc: `ศัตรูที่พิษ ≥ ${KIT.thiefPrivAt} stack หรือติดดีบัฟต่างชนิด ≥ ${KIT.thiefKindsAt} อย่าง รับดาเมจ +${r === 1 ? 18 : 30}%` (**ห้ามเอา `poisonAmp` กลับมา**) · **ไม่เปลี่ยน id `th_t4a`** (id = save data ตามหัวไฟล์ `thief.ts:4`) |
| `src/data/trees/thief.ts` import | `import { KIT } from '../skill-math'` (ถ้ายังไม่มี) |

- **ทาเลนต์ 1 แถว เลือก 1** (`save.ts:83`) → `th_t4a` ⟂ `th_t4b` — **ห้ามนับ amp ของ P2d (`th_t4b` B5) รวมกับ `thPrivileged`** (R4.6 "ของที่ซ้อนกันไม่ได้")
- Skill 2 เลือก 1 จาก 3 → `Exposed` (smoke) ⟂ `woundPriv` (wound) ไม่อยู่ด้วยกัน — เทสต์ B1 worst case ต้องไม่รวมทั้งสองพร้อมกัน (ใช้ worst case จริง: Exposed★ 0.30 + privileged 0.30 + gear 0.45 → cap 0.60)
- **save safety:** id ไม่เปลี่ยน · ผู้เล่นที่ลง `th_t4a` เดิมไว้จะได้ความหมายใหม่ทันที → **ต้องพึ่ง migration ของ P2a** (`migrateThiefRogueRework` รีเซ็ต `jobTalents` ตาม R4.3 ข้อ 5) — ถ้า P2a ยังไม่ merge ก่อน P2b ห้ามปล่อยเด็ดขาด
- **เทสต์:** `tests/talent-text.test.ts` (วนทุก `TALENTS` — ข้อความต้องตรง rank) วิ่งอัตโนมัติ · `tests/job2-talents.test.ts` วน `TALENTS2` เท่านั้น แต่ทำตามกฎเดียวกัน: **ทุก mod ต้อง `v > 0` ทุก rank** (`thPrivileged` 0.18/0.30 ✔)
- เพิ่มเทสต์ใน `thief-p2b`: `th_t4a` ไม่มี `poisonAmp` ใน mod ทุก rank · `thPrivileged ∈ {0.18, 0.30}`

**Verify:** `npm run typecheck` · `node tools/test.mjs talent` · `node tools/test.mjs thief-p2b` · `node tools/test.mjs job2-talents`

---

### T6 — `feat(thief): th_smoke — Shroud + Sightless Raid + Exposed + Blind`

**ไฟล์ + การแก้ (`BattleScene.ts`)**

| จุด | การแก้ |
|---|---|
| fields ใกล้ `dodgeCharges` `:1104` | `private shroudTurns = 0` · `private raidReady = false` |
| reset ต้นไฟต์/รัน `:404` (ที่ `this.dodgeCharges = 0`) | `this.shroudTurns = 0; this.raidReady = false` |
| `heroAct()` `:1017` (ก่อน `skill2Turn` `:1044`) | `if (this.shroudTurns > 0) this.shroudTurns--` — ร่ายที่เทิร์น N ตั้ง = 2 → ต้นเทิร์น N+1 = 1 → ต้น N+2 = 0 ⇒ ครอบการตีของมอน 2 รอบเต็ม + เทิร์นฮีโร่ N และ N+1 (ตรงกับ "อยู่ครบ 2 เทิร์นเต็ม") |
| `castSkill2` `case 'th_smoke'` `:3332-3336` | ดูโค้ดด้านล่าง |
| Flee: `hurtHeroCore` `:4437` | แทน `this.st.flee` ด้วย `this.fleeNow()` — `private fleeNow() { return this.st.flee * (this.shroudTurns > 0 ? 1 + S2N.smokeFlee : 1) }` (คูณ ตามสเปก "FLEE +25% multiplicative") · **อย่าแก้ `st.flee` ตรง ๆ** (P2c `Shadow Shield` จะอ่าน `fleeNow()` — ดู §3) |
| skillCrit: `critRateFor` `:2901` | ใน skill branch บวก `(this.shroudTurns > 0 ? S2N.smokeSkillCrit : 0)` เข้า `this.st.skillCrit` (ยังถูก clamp ด้วย `C.skillCrit`) |
| Crit Dmg ★: `strike()` `:1250` (`critDmgAdd`) | บวก `const condCritDmg = (this.shroudTurns > 0 && this.st.s2Star > 0 && this.s2?.id === 'th_smoke' ? S2N.smokeCritDmg : 0)` เข้า `critDmgAdd` — **B3 (R4.6)**: บวกเข้า `critDmgAdd` ห้ามคูณ `mul` · cap ร่วม `thiefCondCritDmgCap` เป็นของ P2c → ตัวแปรชื่อ `condCritDmg` ให้ P2c ต่อ `+=` ได้ |
| Sightless Raid | hook ใน `strike()` **หลัง `damageMon` `:1264`** (ดูโค้ด) |

```ts
case 'th_smoke':
  this.dodgeCharges = Math.max(this.dodgeCharges, S2N.smokeDodges(star))
  this.shroudTurns = S2N.smokeTurns; this.raidReady = true
  if (lv > 0) { this.heal(this.st.maxHp * S2N.smokeHeal(lv)); this.resGain(S2N.smokeRes(lv)) } // "+" ควันหอม (Energy: resGain, same call as sw_taunt ★ :3274)
  this.floatText(HERO_X, GROUND - 190, `🌫️ Shroud ${this.shroudTurns}`, '#c9c9d6')
  this.burst(HERO_X, GROUND - 40, 0xc9c9d6, 16, 180)
  break
```

```ts
// strike(), right after this.damageMon(m, r.dmg, r.crit, color) (:1264)
if (this.raidReady && !magic && !this.allyHitting && (this.src === 'basic' || this.src === 'combo' || this.src === 'skill' || this.src === 'ult') && !m.dead) {
  this.raidReady = false // first active hit after the cast only (flag off BEFORE the bonus hit, so it can't recurse)
  m.exposed = S2N.exposedTurns; m.exposedPct = star ? S2N.exposedStar : S2N.exposedPct
  m.blind = Math.max(m.blind, S2N.smokeBlindTurns); this.dotIcon(m)
  this.withSrc('other', () => this.strike(m, S2N.raidMul * (1 + this.st.pskill), false, '#e6e6f2'))
}
```
(`star = this.st.s2Star > 0` — ตรงกับ `castSkill2` `:3263`)

**ข้อควรระวัง**
- `src='counter'` / ally / zap ไม่เปิด Raid (filter ด้านบน) · `raidReady` ค้างข้ามเทิร์นได้จนกว่าจะโจมตีจริง (ตามสเปก "การโจมตีแอคทีฟครั้งแรกหลังร่าย")
- Raid เป็น `src='other'` → ใช้ crit ปกติ (`st.crit`) ถ้าอยู่นอก `asSkill` · ถ้าเรียกระหว่างสกิล (`skillSlot !== null`) `critRateFor` `:2900` จะเข้า skill branch — ยอมรับ (ต่าง ≤ cap)
- Exposed/Blind ใช้กับบอสเต็ม 100% (Blind ไม่กระทบ `monHit = 999` — พฤติกรรม `:4430` เดิม)
- ค่าร่าย 35 (T2) · Shroud ไม่ถูกทำลายโดยการโจมตี/สวน (P2c `thief_b4 ★` ต้องไม่แตะ `shroudTurns`)

**Verify:** `npm run typecheck` · `node tools/test.mjs thief-p2b` · บอท smoke (§4)

---

### T7 — `feat(thief): th_pick — On-Hit basic strike + Zeny + Plunder`

| จุด | การแก้ |
|---|---|
| fields | `private plunderStacks = 0` (reset ต้นเวฟ `:529` ถัดจาก `waveDodge`; และที่ `:404`) |
| `castSkill2` `case 'th_pick'` `:3337-3345` | แทนด้วยโค้ดด้านล่าง |
| `killMon` `:4064` | `Math.random() < this.st.dropChance + this.plunderStacks * S2N.plunderDrop` (💎 ของหายาก — ดูหมายเหตุ) |
| `skill-math.ts` ลบ `pickMul` + แก้ `:745` ให้ใช้ `S2N.pickBase` / `pickStarMul` (ถ้ายังไม่ได้ทำใน T2) | — |

```ts
case 'th_pick': {
  const m = front(); if (!m) break
  const mul = (star ? S2N.pickStarMul : S2N.pickBase) * (1 + this.st.pskill)
  const prevLs = this.lsMul
  await this.lunge(m, () => this.withSrc('basic', () => {   // counts as ONE basic swing: basic crit (st.crit), basic bracket, D.Strike, cards procs('basic')
    this.lsMul = 1
    this.strike(m, mul); this.doubleAttack(m, mul)
    if (star && !m.dead) { m.poison = Math.min(this.poisonMax(), m.poison + S2N.pickPoison); m.poisonDmg = Math.max(m.poisonDmg, this.st.poisonDmg); this.dotIcon(m) }
    if (!m.robbed) { m.robbed = true; this.coinsFly(m.spr.x, m.spr.y, S2N.pickZeny + Math.floor(this.heroDex / S2N.pickZenyDex), true) } // ปล้น Zeny, once per monster
  }))
  this.lsMul = prevLs
  if (this.alive().length) await this.procs('basic')
  this.resGain(S2N.pickRes(lv))
  if (star && (m.dead || m.def.ai === 'boss') && this.plunderStacks < S2N.plunderMax) { this.plunderStacks++; this.resGain(S2N.plunderRes) } // Plunder
  break
}
```
> Plunder เช็ก "ฆ่าได้ **หรือ** ตีบอส" (`m.dead || m.def.ai === 'boss'`) ตามสเปก Rev 3 §2.4 · stack สูงสุด `plunderMax`/เวฟ

- ตรวจแล้ว: `this.heroDex` มีใช้ที่ `:2428` · `resGain()` ใช้ที่ `:3274` · `coinsFly` `:6560` (ส่ง `n` zeny) — **อ่านค่า zeny จริงของ coinsFly ก่อนเขียน** (ฟังก์ชัน `splitZeny` อาจบวก `this.zeny` ตอนเหรียญถึง — ตรวจ `:6570-6580` ให้แน่ใจว่าไม่นับซ้ำ)
- **Rev 3 ว่า "Drop/Chest +5%"** แต่โค้ดมี gem drop (`dropChance` `:4064`) อย่างเดียวที่เป็น `st`-scaled chance; `rollCard/rollMat/rollUnique` มีกลไกของตัวเอง → **P2b ผูก Plunder กับ 💎 `dropChance` เท่านั้น** (ไม่แตะ rolls อื่น — เสี่ยงต่ำ) · แจ้งไว้ใน commit message
- `procs('basic')` = 1 ครั้งต่อสวิง (ตามสเปก "เทียบเท่า 1 สวิง") · เทิร์น-นับ: ล้วงกระเป๋าเป็น Skill 2 (free action) ไม่ใช้เทิร์น
- Blade's End (T8) จะจุดชนวนจาก `th_pick` ด้วย (src = `'basic'`) — ไม่เป็นปัญหา เพราะ Skill 2 เลือกได้ท่าเดียว (`th_wound` ≠ `th_pick`) → Wound มาจากแหล่งอื่น (P2c On-Hit / `thief_b4`) เท่านั้น

**Verify:** `npm run typecheck` · `node tools/test.mjs skill-registry` · `node tools/test.mjs admin-engine` · บอท smoke (§4)

---

### T8 — `feat(thief): th_wound — Wound stacks + Blade's End + healCut + D.Strike Wound`

| จุด | การแก้ |
|---|---|
| helper ใหม่ | `private addWound(m: Mon, n: number)` — `if (m.dead \|\| n <= 0) return; m.wound = Math.min(S2N.woundMax(this.st.s2Lv), m.wound + n); m.woundTurns = S2N.woundTurns; this.dotIcon(m)` (**รีเฟรชเป็น 3 ทุกครั้งที่แปะ**) — **P2c เรียกใช้** (On-Hit Ult / `thief_b4 ★`) |
| `castSkill2` `case 'th_wound'` `:3346-3353` | หลัง `this.strike(m, S2N.woundMul(star), false, '#ff7a7a', 1)` + พิษเดิม: `this.addWound(m, star ? S2N.woundStarStacks : S2N.woundStacks)` |
| `doubleAttack()` `:2980-2987` | หลัง `this.strike(m, mul)`: `if (this.s2?.id === 'th_wound' && this.st.s2Lv > 0 && !m.dead && Math.random() < S2N.woundStrikeChance) this.addWound(m, 1)` |
| Blade's End | hook ใน `strike()` ต่อจาก Raid hook (T6) หลัง `damageMon` ดูโค้ด |

```ts
// strike(), after the Raid hook
if (this.s2?.id === 'th_wound' && !magic && !m.dead && m.wound >= S2N.bladeAt && !m.bladeSpent && !this.allyHitting
    && (this.src === 'basic' || this.src === 'combo' || this.backStabbing)) { // แทงพิษ (src 'skill') alone never detonates
  m.bladeSpent = true; m.wound -= S2N.bladeAt // 1 / turn / target
  m.woundCut = Math.max(m.woundCut, S2N.bladeHealCut); m.woundCutTurns = S2N.bladeCutTurns
  const prevLs = this.lsMul; this.lsMul = 0
  const blade = () => this.withSrc('other', () => this.strike(m, S2N.bladeMul * (1 + this.st.pskill), false, '#ff7a7a', 1))
  if (this.st.s2Star > 0) blade(); else this.noPetCrit(blade) // ★ แผลมรณะ: Blade's End can crit
  this.lsMul = prevLs; this.dotIcon(m)
}
```

**ข้อควรระวัง**
- `bladeSpent` ถูกตั้ง **ก่อน** ยิง → ไม่ recurse · รีเซ็ตต้นเทิร์นฮีโร่ (T3)
- `noPetCrit` (F19) ปิดคริเฉพาะ Blade's End ที่ไม่ใช่ ★ · `forceCrit` (เช่น Back Stab) ยัง override ได้ (`:1234`) → Back Stab ที่ force คริ จะทำให้ Blade's End คริด้วย **เฉพาะเมื่อ `forceCrit` ยังเปิดอยู่ตอนยิง** — ยอมรับ (ตั้งใจแล้วก็ไม่เสียหาย; ถ้าอยาก strict ให้ปิด `forceCrit` ภายใน `blade()`)
- Privileged +12% (B1) = `takenAmpOf` อ่าน `this.s2?.id === 'th_wound'` แล้ว (T4) ✔ · พิษ ≥ 1 + Wound ≥ 1
- `woundMul(star)` (1.2 / 2.0) + pierce 1 ไม่เปลี่ยน (F4) · `Wound` cap = `S2N.woundMax(s2Lv)` (6 → 8 ที่ `s2Lv=3`) — **`s2Lv` เป็นเศษได้** → `floor` ใน `woundMax` แล้ว
- ตัดฮีล: `healMon()` `:5196` เรียก `healCut()` อยู่แล้ว (T3) → ใช้งานได้ทันที

**เทสต์:** pure — เพิ่มใน `thief-p2b`: `S2N.woundMax(0..5)` เป็นจำนวนเต็มเสมอ · `woundMax(3) === 8` · `woundMax` ไม่ลดเมื่อ lv เพิ่ม

**Verify:** `npm run typecheck` · `node tools/test.mjs thief-p2b` · บอท smoke (§4)

---

### T9 — `feat(thief): th_t1c กายต้านพิษ (stack-scaled tenacity + HP)`

| ไฟล์ | การแก้ |
|---|---|
| `src/data/stats.ts` interface + `PLAYER` `:439` | `thStackHp: number` (Max HP ต่อ stack) · `thCondTenacity: number` (ต้านทานเมื่อมีพิษ/แผลบนสนาม) — default 0 ทั้งคู่ |
| `src/data/trees/thief.ts:42` | `th_t1c` (id เดิม) → ชื่อ **กายต้านพิษ** · mod `{ thCondTenacity: r === 1 ? 0.08 : 0.14, thStackHp: r === 1 ? 8 : 14 }` · desc: `มีมอนติดพิษ/แผลบนสนาม: ต้านทาน +${r===1?8:14}% · Max HP +${r===1?8:14} ต่อ stack (สูงสุด ${KIT.thiefStackHpMax} stack)` |
| `BattleScene.ts` fields | `private thHpBonus = 0; private thTenBonus = 0` |
| `BattleScene.ts` `heroAct()` `:1017` (หลัง tick Wound ของ T3) + `killMon` ท้าย | `this.syncStackBody()` |

```ts
/** th_t1c: stacks of poison + wound on the field -> temporary tenacity + Max HP (delta-tracked so the base never drifts). */
private syncStackBody() {
  if (this.st.thStackHp <= 0 && this.st.thCondTenacity <= 0) return
  const live = this.alive()
  const n = Math.min(KIT.thiefStackHpMax, live.reduce((s, m) => s + m.poison + m.wound, 0))
  const wantHp = n * this.st.thStackHp, wantTen = live.some((m) => m.poison > 0 || m.wound > 0) ? this.st.thCondTenacity : 0
  const dHp = wantHp - this.thHpBonus
  this.st.maxHp += dHp; this.thHpBonus = wantHp
  this.hp = dHp > 0 ? this.hp + dHp : Math.min(this.hp, this.st.maxHp) // grow with the bonus, never above Max HP when it fades
  this.st.tenacity += wantTen - this.thTenBonus; this.thTenBonus = wantTen
}
```
- **ไม่มี `maxHpCap`** (F22) → cap = `thiefStackHpMax` (20) × `thStackHp` = 160 / 280 ตามสเปก
- ข้อควรระวัง: `this.st.maxHp` ถูก mutate ที่อื่นด้วย (`applyMod` `:4591`, mutator `:370`) → ใช้ **delta** เท่านั้น (ห้าม assign) · `hp` ไม่หายเมื่อโบนัสลด แต่ถูก clamp
- `tenacity` มี soft cap ที่ `applyMod` `:4600` (ตอนบวกผ่าน `applyMod`) — เราบวกตรง ๆ → ผลสูงสุด `0.14` เล็กน้อย ยอมรับ
- **save safety:** id `th_t1c` เดิม (เดิม = `maxHp` +40/+80) → คนที่ลงไว้ต้องถูกรีเซ็ตโดย P2a migration (เหมือน T5)
- **Mobster:** ไม่ได้รับผลโดยตรง (ทาเลนต์ Thief ติดไปกับ job1 ของ Mobster ตามปกติ — ตรวจแล้ว) แต่ได้ป้องกันเพิ่ม → รวมใน §5.4

**เทสต์:** `talent-text` (วิ่งเอง) · เพิ่มใน `thief-p2b`: mod ของ `th_t1c` ทุก rank `v > 0` และเป็น `Stats` key จริง (`k in PLAYER`)

**Verify:** `npm run typecheck` · `node tools/test.mjs talent` · `node tools/test.mjs thief-p2b`

---

### T10 — `feat(thief): D.Strike Gate — +Energy on hit, thiefStrikeLs`

**Guard ก่อนเริ่ม:** `grep -n "thiefStrikeRes\|thiefStrikeLs" src` — ถ้า P2a ทำไปแล้วให้ **ข้าม task นี้** (§2.4 อยู่ใต้หัวข้อ Skill 2 แต่ไม่ถูกระบุในสโคป P2a)

| ไฟล์ | การแก้ |
|---|---|
| `skill-math.ts` KIT | `thiefStrikeRes`/`thiefStrikeLs` (ลงทะเบียนครบตั้งแต่ T1) |
| `BattleScene.ts:2984` | `this.lsMul = 0.33` → `this.lsMul = KIT.thiefStrikeLs` |
| `doubleAttack()` `:2982` | หลังข้อความ `'DOUBLE!'` และ `strike()`: `if (this.job.resource === 'energy' && this.src !== 'ult') this.res = Math.min(this.resMax(), this.res + KIT.thiefStrikeRes)` — "ไม่เกิดซ้ำซ้อนบนฮิตของเงาพริ้ว" (`doubleAttack` ไม่ถูกเรียกในเงาพริ้ว `:3722` อยู่แล้ว — เช็ก `src !== 'ult'` กันไว้เผื่อ P2c) |
| Gate text `thief.ts:10` | `(lv) => …` ใส่ "ติดสำเร็จ: +Energy" โดยอ่าน `KIT.thiefStrikeRes` (`thief_core1` เป็น `NO_STRETCH` `tree.ts:105-107` — **ห้ามเอาออกจาก `NO_STRETCH`**; `tests/node-stretch.test.ts:86` ล็อกไว้) |

- Energy loop: ยืนยันกับ P2a ว่า `autoCost` floor (`thiefAutoMinCost` 30) ไม่ถูกแย่งโดยการคืน Energy นี้ → ไม่มีผลข้างเคียงต่อสูตร (บวกหลังจ่ายค่าร่ายแล้ว)

**Verify:** `npm run typecheck` · `node tools/test.mjs node-stretch` · `node tools/test.mjs thief-p2b`

---

## 3. Interfaces

### 3.1 ต้องการจาก P2a (ก่อน P2b)

| ของ | ใช้ที่ | ถ้า P2a ไม่มี |
|---|---|---|
| Migration `migrateThiefRogueRework` + flag (รีเซ็ต `jobTalents` ของ Thief) | T5, T9 (id `th_t4a`/`th_t1c` เปลี่ยนความหมาย) | **ห้ามปล่อย P2b ก่อน** (save เก่าจะได้ความหมายใหม่แบบเงียบ) |
| `tree?: SkillRef[]` ใน `SKILL_LAYOUT.thief` | T1 | P2b สร้างเอง |
| KIT `thiefKindsAt` (ถ้า `thief_c1` ใช้) | T1 | P2b สร้าง (guard grep) |
| `thief_core` ลบ `thExecute` ที่ `:1247` | — | ไม่เกี่ยว P2b |

> **ข้อควรระวังข้ามสไลซ์:** `thief_c1` (P2a) ต้องนับ "ดีบัฟ ≥1 ชนิด (Poison, Wound, Exposed, Chill)" แต่ `Wound`/`Exposed` เกิดใน P2b → **P2a ต้องเขียนแบบอ่านเฉพาะ `m.poison`/`m.chill` (หรือ helper stub) แล้ว P2b T4 เปลี่ยนเป็น `debuffFlags()`+`debuffKinds(f, false)`** — ถ้า P2a ไม่ได้ stub ให้ P2b T4 ครอบคลุม (grep `thCondLeech` ที่ใช้ `m.poison` ตรง ๆ แล้วแทนด้วย helper) · เช่นเดียวกับ `thief_c4`/`thief_b*` ที่อ่าน "อยู่ใน Shroud" → ใช้ `this.shroudTurns > 0` ของ T6 (P2a อย่าสร้างตัวแปรชื่อชนกัน)

### 3.2 P2b ให้กับ P2c / P2d / P3

| ของ | ลายเซ็น | ผู้ใช้ |
|---|---|---|
| `Mon.exposed / exposedPct` | turns มอน · ค่า % | P2c (`thief_b4 ★` ดาเมจ ×1.1 เมื่อเป้า Exposed · `thief_u1` นับชนิด) · P2d (`th_t2b`/Arcane Edge เจาะ M.DEF เมื่อ Exposed) |
| `Mon.wound / woundTurns`, `addWound(m, n)` | — | P2c (On-Hit Ult: `eff` โอกาส +1 Wound · `thief_b4 ★` +1 Wound) · P2a `thief_c1`/`thief_c2` (นับ stack พิษ+แผล) |
| `this.shroudTurns` (+ `fleeNow()`) | `number` / `() => number` | P2c: Ghost Shroud `Shadow Shield` = `... × this.fleeNow()` (ใช้ FLEE ที่รวม Shroud แล้ว) · `thief_c4` "อยู่ใน Shroud" · `th_t4c` |
| `condCritDmg` (ตัวแปรใน `strike()` `:1250`) | `number` | P2c ต่อ `+=` (`thUltCondCritDmg`, `thUltExecDmg`, `thExecUlt`, Heart Rend) แล้วครอบ `Math.min(KIT.thiefCondCritDmgCap, …)` |
| `takenAmpOf(m, dot)` / `takenAmp(TakenIn)` | pure + Scene | P3 (`stabMark` = 1 บรรทัด) · P2d (`thPrivileged` ใช้แล้ว; **B5 Perfect Agony แยก ไม่เข้า B1**) |
| `debuffFlags(m)` / `debuffKinds(f, wide)` | — | P2a `thief_c1` · P2c `th_t3a` (≥ `thiefKindsAt`) |
| `Mon.bladeSpent` | — | P3 (Back Stab) ไม่ต้องทำอะไร — Blade's End ตรวจ `backStabbing` อยู่แล้ว |
| KIT `thiefTakenCap`, `thiefKindsAt`, `thiefPrivAt` | — | P2c/P2d |
| `S2N.exposedPct/Star` | — | P2c อ่านถ้าต้องการค่าเทียบ |

### 3.3 สิ่งที่ P2b **ไม่** ทำ (ไม่ให้ซ้ำกับสไลซ์อื่น)
Ghost Shroud (ชาร์จ) `onShroudBreak()` Global Ult CD cap · `th_t1a/b` `th_t3*` `th_t4c` (P2c) · `th_t4b` Perfect Agony B5 (P2d) · `th_t2a/b/c` (P2a) · `stabMark` (P3).

---

## 4. Verification plan (ทั้งสไลซ์)

| ขั้น | คำสั่ง | ผ่านเมื่อ |
|---|---|---|
| ทุก commit | `npm run typecheck` | 0 error |
| T1 | `node tools/test.mjs thief-p2b` · `admin-engine` · `skill-registry` | ผ่าน |
| T2 | + `admin-model` | ผ่าน |
| T5, T9 | `node tools/test.mjs talent` · `job2-talents` | ผ่าน |
| T10 | `node tools/test.mjs node-stretch` | ผ่าน |
| ปลายสไลซ์ | `tools/bot.cjs` (Thief, D6 Hard) 1 รอบ ตรวจไม่ crash + `th_smoke` / `th_pick` / `th_wound` แต่ละท่า (ตั้งผ่าน `TREEX` / `TAL` ตาม `bot.cjs:54,75`) | ไม่มี exception · ตัวเลขดาเมจไม่เป็น `NaN` |
| **ห้าม** | `npm test` เต็มชุด (R4.3 ข้อ 6) | — |

> baseline ที่ตรวจแล้ว: `npm ci` + `node tools/test.mjs skill-registry` = 10/10 ผ่านก่อนเริ่มเขียน spec

---

## 5. Risks

### 5.1 Mobster (path A — ห้ามแตะ `trees2/mobster.ts` · `JOB2.mobster` · `KIT2.mobster`)

| ความเสี่ยง | ระดับ | การจัดการ |
|---|---|---|
| Mobster ยืนบน web Thief คลาส 1 → ได้ Skill 2 ใหม่ + `th_t1c`/`th_t4a` ใหม่ (ตั้งใจ — path A) | กลาง | วัด `JOB2_K.mobster` ใหม่ (`power.ts:32` = 1.1 first guess) **หลัง P2c** ไม่ใช่ตอนนี้ |
| `th_t4a` เดิม `poisonAmp` 0.25 + gear 0.45 = ×1.70 → ใหม่ cap 0.60 = ×1.60 | ต่ำ | ตามที่ R4.6 ระบุ (−6%) · มีเทสต์ใน T1 |
| ทวงหนี้ (`:2257`) เป็น `dot=true` → ยังโดน `woundPriv` (+12%, ถ้า Mobster เลือก `th_wound`) | ต่ำ | ยอมรับ · อยู่ใต้ cap B1 |
| `debt(m)` `:2042` **ไม่นับ** Exposed/Wound | — | **ห้ามเพิ่ม** (จะเปลี่ยน Execute line ของ Mobster) |
| Blind ใช้ `KIT2.crusader.blindHit` ร่วม | ต่ำ | Crusader ปรับ → Thief เปลี่ยนตาม · จดไว้ใน label admin |
| Mobster `debuffKinds` (Mobster Skill 3 ฯลฯ) | — | ไม่ใช้ `debuffKinds` ของเรา |

### 5.2 Save safety
- **ไม่มี schema ใหม่ใน `src/save.ts` ใน P2b** (Wound/Exposed เป็น state ในไฟต์ ไม่ถูก persist) → ไม่ต้อง migration เพิ่ม
- แต่ id `th_t1c` / `th_t4a` เปลี่ยนความหมาย → **ต้องมี migration ของ P2a ก่อน** (R4.3 ข้อ 5: gate ด้วย flag ทุก save ห้ามมีทางข้าม)
- Skill 2 id (`th_smoke`/`th_pick`/`th_wound`) ไม่เปลี่ยน → `jobTree` ของผู้เล่นเดิมยังโหลดได้ · `s2Lv`/`s2Star` ความหมายคงเดิม

### 5.3 `stretchNode()` / `INT_FIELDS` / `tidy()` (§2.3 box)
| ข้อ | กฎ | ใน P2b |
|---|---|---|
| Skill 2 "+" / ★ เป็น `kind: 's2plus' / 's2star'` → ไม่ผ่าน `stretchNode()` (`tree.ts:127`) | ข้อความผ่าน `tidy(desc(x), false)` เมื่อ `s2Lv` ไม่ใช่จำนวนเต็ม (`:270-277`) | `S2N.smokeRes` ใช้ `Math.round` · `S2N.woundMax` ใช้ `Math.floor` · ข้อความอ่านผ่าน S2N เสมอ (text = effect) |
| ตัวเลขในข้อความ | ทศนิยม ≤ 2 ตำแหน่ง คงไว้ · >2 ตำแหน่งถูกปัด 1 ตำแหน่ง | ห้ามเขียน `lv * 2 / 3` ลงข้อความ |
| `INT_FIELDS` (`tree.ts:68`) | ใช้กับ **node** ที่ผ่าน `stretchNode` เท่านั้น | P2b ไม่เพิ่ม node → **ไม่เพิ่ม** key ใน `INT_FIELDS` (talents `th_t1c/th_t4a` ไม่ถูก stretch) |
| `thief_core1` D.Strike | อยู่ใน `NO_STRETCH` (`tree.ts:106`) | T10 ห้ามเอาออก |
| ข้อความทาเลนต์ | `talent-text.test.ts` เทียบ `desc(r)` กับการ์ด | desc ใช้จำนวนเต็ม/เปอร์เซ็นต์เต็ม |

### 5.4 R4.6 brackets
| Bracket | ใน P2b | เสี่ยง |
|---|---|---|
| **B1 Taken** | Exposed + woundPriv + thPrivileged + gear poisonAmp บวกกัน cap 0.60 (T1/T4) | ต้องไม่หลุดไปคูณเป็นบรรทัดแยก (ห้ามเขียน `dmg *= 1 + exposed` ที่อื่น) · `Exposed` ต้อง `!dot` |
| **B2 vs-status** (`vsPoison`) | **ไม่แตะ** (`:4750`) | — |
| **B3 Crit Dmg** | Shroud★ +0.25 บวกเข้า `critDmgAdd` (`:1250`) ห้ามคูณ `mul` | cap `thiefCondCritDmgCap` ยังไม่มีจนกว่า P2c · 0.25 < 0.75 → ปลอดภัย |
| B4 | ไม่เกี่ยว | — |
| B5 | ไม่เกี่ยว (P2d) | `th_t4a` ⟂ `th_t4b` เลือกได้อย่างเดียว |
| ซ้อนไม่ได้ | `Exposed` ⟂ `woundPriv` (Skill 2 เลือก 1) · `th_t4a` ⟂ `th_t4b` (แถวเลือก 1) | เทสต์ worst case ต้องไม่รวมคู่เหล่านี้ |
| `thExecute` ×1.5 `:1247` | P2a เป็นคนจัดการ | อย่าเอามาเป็น B3 ซ้ำ |

### 5.5 Test contracts (ต้องผ่านทุก commit ที่เกี่ยว)
| สัญญา | ที่ | ผล |
|---|---|---|
| ทุก KIT ref ใน layout ต้อง whitelisted + ค่าเริ่มอยู่ในช่วง | `skill-registry.test.ts:20-28` | key ใหม่ต้องอยู่ใน `KIT_INTS`/`KIT_NUMS` (`tunables.ts:146-147`) · S2N ต้องเป็น number ไม่ใช่ function |
| admin explain ต้อง specific | `admin-engine.test.ts:39-54` | `KIT_EXPLAIN` (`combo-kit.ts:187`) + `S2N_TH` (`skills.ts:24`) ครบ **ทุก key** · `S2P_TH` ไม่บังคับ |
| ทาเลนต์ v > 0 ทุก rank | `job2-talents.test.ts:18-24` (วน `TALENTS2`) + แนวเดียวกับ `TALENTS` ของเรา | `thPrivileged`/`thStackHp`/`thCondTenacity` > 0 ✔ · และเป็น key ใน `PLAYER` (`k in BASE_STATS`) |
| ข้อความทาเลนต์ = rank ที่แสดง | `talent-text.test.ts` | — |
| Skill 2 formulas v83 guard | `skill-registry.test.ts:56-` | **ห้ามแก้ `S2N.smokeHeal`/`pickRes`** (ยัง assert อยู่) |
| `thief_core1` ไม่ stretch | `node-stretch.test.ts:86` | T10 ห้ามแตะ `NO_STRETCH` |
| Mon literal ครบ field | typecheck | T3 เพิ่ม field → tsc ชี้จุดที่ลืม |

### 5.6 อื่น ๆ
| ความเสี่ยง | การจัดการ |
|---|---|
| Hook ใน `strike()` (Raid/Blade) recursion | ตั้ง flag (`raidReady=false`, `bladeSpent=true`) **ก่อน** ยิงบวกนัส · Raid ใช้ `src='other'` → ไม่ผ่านเงื่อนไข src ของตัวเอง |
| `hero-skill-book.ts:111-113` (`th_*` ของ "คิทมอน mirror") hardcode ตัวเลขเก่า | **ไม่แก้ใน P2b** — เป็นคิทมอนที่ร่ายสกิลฮีโร่ (ไม่ใช่ตัวฮีโร่) · จดเป็นหนี้ |
| `heroDex` / `coinsFly` ตรวจรายละเอียดตอนเขียน T7 | ระบุใน task แล้ว |
| คนนอก P2b อ่าน `this.st.flee` ตรง ๆ (Shroud ไม่มีผล) | grep แล้ว `st.flee` ใช้แค่ `:4437` + `:5944` (log) → แก้จุดเดียว |

---

## 6. คำถามถึงเจ้าของ (ไม่บล็อกการเขียนโค้ด — ตอบทีหลังได้)

1. **Plunder (`th_pick ★`) "Drop/Chest +5%/stack"** — โค้ดมีแค่ 💎 `dropChance` (`:4064`) ที่เป็นเลขเดียวให้บวกได้ · P2b ผูกกับ 💎 เท่านั้น · ต้องการให้ครอบ `rollCard/rollMat/rollUnique` ด้วยไหม? (ถ้า "ไม่ตอบ" = ผูก 💎 อย่างเดียว)
2. **KIT key นอกลิสต์ R4.7: `thiefPoisonAmpAt` (10)** — เพิ่มเพื่อกำจัด literal `10` ที่ย้ายเข้า helper (AGENTS.md ห้าม magic number) · โอเคไหม? (ถ้า "ไม่ตอบ" = เพิ่ม)
