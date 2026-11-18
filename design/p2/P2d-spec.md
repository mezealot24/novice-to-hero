# P2d — Thief off-meta (INT / WIS / VIT / LUK) · Implementation Spec

> **ฐาน:** branch `claude/thief-ult-agi-ratio` (typecheck ✅ + `node tools/test.mjs thief-ult` ✅ 5/5 ตรวจเมื่อเขียนสเปก)
> **Source of truth:** `design/thief-rogue-rework-v1.md` — **Rev 4 Delta ก่อน** (R4.3 / R4.6 / R4.7) แล้วค่อย Rev 3 §2.3 (1B), §2.7 (`th_t4b`), §4
> **เลขบรรทัด** = ฐานปัจจุบัน (ก่อน P2a–P2c) → ตอนลงมือให้ `grep` หา anchor (ใส่ในวงเล็บ) · เลขจะเลื่อน
> **เขียนโดย:** agent สเปกเท่านั้น · ไม่ได้แก้ `src/` `tests/` `tools/`

---

## 0. TL;DR (อ่านแค่นี้ก็เริ่มได้)

| เรื่อง | คำตอบ |
|---|---|
| ทำอะไร | สาย `thief_v` (4 โหนด) + ทาเลนต์ `th_t4b` Perfect Agony + hook สเตตัส WIS / INT / LUK (VIT เลื่อนไป W2) |
| กี่ task / commit | **9** |
| Stats key ใหม่ | **7** (ค่าเริ่ม 0 ใน `PLAYER`) |
| KIT key ใหม่ | **24** (18 อยู่ใน R4.7 แล้ว · **6 ตัวใหม่นอก R4.7** ต้องตั้ง label เอง — ดู §2) |
| Mon field ใหม่ | **0** (ICD ทั้งหมดเป็น flag ของ scene รีเซ็ตใน `heroTurn()`) |
| Save schema | **ไม่เปลี่ยน** (ใช้ flag + migration ของ P2a) — ดู Risk R-S1 |
| ตัดออก (รอ W2) | Venom Melt + Toxic Seep · PA ส่วน WIS · Arcane Edge · VIT Toxic Overheal · Contaminate บน Back Stab · Alchemy Blade · INT≥20 พิษ+1 |
| คำถามบล็อก | **ไม่มี** (มี 2 ค่า default ที่เลือกให้แล้ว ดู §6) |

---

## 1. MVP cut — อะไรทำก่อน อะไรรอ

> **So what:** สูตร §4 ของ Rev 3 ทั้งหมด ≈ 60 key + 3 ระบบใหม่ใน BattleScene · เลือกตัวที่ **1 ระบบ = ไม่เกิน 4–5 key** ก่อน อีกครึ่งรอ W2 (หลังคิวเล่น + หลัง `ro-stat-curve` ตัดสิน)

### 1.1 Ship ใน P2d (M1)
| # | Hook | Stat | สูตร (ย่อ) | KIT key | ทำไมเข้า MVP |
|---|---|---|---|---|---|
| A | `thief_v1` แทงฉาบอาคม | INT | แทงพิษ + Basic ได้ดาเมจเวทเสริม × M.ATK | 1 | เป็นตัวเปิดสาย INT · พึ่ง `heroBuild` น้อย |
| B | `thief_v2` Contaminate | INT | ระเบิดพิษ `det` stack | 10 | ตัวตนของสาย 1B |
| C | `thief_v3` เลือดพิษ | **INT** | `rate = min(cap, 0.08·x·(1+0.015·INT) + poisonLeech)` + cap 25%/เทิร์น | 4 | INT ไม่ตันที่ Lv1 · แทน `thief_l2` (P2a ลบจาก web แล้ว) |
| D | `thief_v4 ★` | INT | Contaminate คริได้ · leech เต็ม · คืนพิษบอส | 1 (+ใช้ร่วม) | ปิดสาย |
| E | `th_t4b` Perfect Agony | critMul | พิษ non-crit × `min(1.0, (critMul−1.4)·rate)` · ฮิต non-crit −15% | 3 | B5 ตาม R4.6 |
| F | `wisPoisonCap` + WIS→`poisonDmg` | **WIS** | cap +1/8 WIS (สูงสุด +16) · poisonDmg +0.5/WIS | 3 | WIS มีตัวตนเลย ไม่ต้องรอ Melt |
| G | Shadow Ward | **WIS** | ลดดาเมจเข้าเฉพาะ magic / `monHit≥999` / `trueSight` | 2 | 1 บรรทัดใน `hurtHeroCore` |
| H | Gambler's Edge | **LUK** | `LUCKY!` → +6 Energy (ICD 1/เทิร์นฮีโร่) | 1 | 1 บรรทัดใน `dodged()` · ส่วน Rogue (มีดบิน) = P3 |

### 1.2 รอ W2 (ไม่ทำใน P2d)
| Hook | เหตุผลที่รอ | ปลดล็อกเมื่อ |
|---|---|---|
| **Venom Melt + Toxic Seep** (WIS) | 2 สูตร (hpMelt/flatMelt) + 2 cap + ICD + ยิง `dot=true` ผ่าน B5 · อ่าน `m.def.hp` · เสี่ยงเกินบอส | เล่นจริงแล้ว WIS (F+G) ยังจืด |
| PA ส่วน WIS (`thiefAgony{WisAt,WisPer,WisCap}`) | ผูกกับ Venom Melt เป็นชุด WIS | พร้อม Melt |
| **Arcane Edge** (INT→M.ATK +1/pt เมื่อ `thS1Matk>0`) | ต้องวางหลัง `add(m)` ใน `heroBuild` (hero-stats.ts:343-344) + แตะ RO-lite โดยตรง (ค่าต่อแต้ม) | `ro-stat-curve-v1` ตัดสิน |
| **VIT Toxic Overheal** | ต้อง flag `toxicHealing` ผ่านทุกแหล่งฮีลพิษ (รวม `thief_c3` ของ P2a) + แตะ `heal()` ที่ชน `overhealShield`/`pk.overheal` (BattleScene.ts:4555-4556) | หลัง P2a ผ่านคิว |
| Contaminate บน Back Stab (ICD แยก) | เป็นของฝั่ง Rogue → ไปกับ P3 (Rogue web) | P3 |
| Alchemy Blade (v4★ ข้อ 4) | แตะ Back Stab / พายุมีด = ชน Ult budget R4.3 #1 + P3 | P3 |
| INT≥20 → แทงพิษพิษ +1 (`thiefVenomInt*`) | ตัวเลข 2 key ไม่จำเป็นต่อ identity | W2 |
| `thiefDetMatkLv` (M.ATK ต่อ stack) | ตัดสูตร Contaminate จาก 5 เทอมเหลือ 4 · ดูข้อ B ด้านล่าง | W2 ถ้าจำเป็น |

### 1.3 ประตูเดียวสำหรับค่า stat (ตามที่ owner สั่ง: ให้ผ่าน RO-lite ได้)
```ts
// src/data/meta/hero-stats.ts (ใกล้ statPool ~:275) — ประตูเดียว: "stat k นับกี่แต้มสำหรับ hook นอกกระแส"
export const statEff = (b: Record<BaseStat, number>, k: BaseStat): number => Math.max(0, b[k] - STAT_RULES.start)
```
- **ทุกสูตร INT/WIS/LUK ของ P2d เรียก `statEff()` เท่านั้น** (ห้าม `b.wis - 1` / `d('wis')` ตรง ๆ ในไฟล์ hook ใหม่)
- RO-lite ภายหลัง: แก้เฉพาะตัว body ของ `statEff` (เช่น เปลี่ยนเป็น "แต้มที่จ่ายจริง ÷ ราคา") ไม่ต้องแตะสูตร
- ของที่ต้องอ่านตอนสู้ **bake เป็น `Stats` ใน `heroBuild`** (เช่น `thShadowWard`, `thPoisonLeech`) → `BattleScene` ไม่อ่าน WIS/INT ดิบ (ตอนนี้มันเก็บ `heroWis`/`sageInt` แต่ P2d **ไม่ใช้**) = ฐานเดียว ไม่ต้องไล่แก้ 2 ที่

---

## 2. KIT / Stats key ทั้งหมดของสไลซ์นี้

### 2.1 `Stats` ใหม่ (ค่าเริ่ม 0 ใน `PLAYER` · `src/data/stats.ts` interface ~:59 + `PLAYER` :433-439)
| Key | มาจาก | ชนิด | ความหมาย |
|---|---|---|---|
| `thS1Matk` | node `thief_v1` | non-INT | ตัวคูณ M.ATK ของแทงพิษ (`0.60·x`) |
| `thDetonate` | node `thief_v2` | non-INT | ระดับ Contaminate (`x`: 0.6…3.0) |
| `thDetonateStar` | node `thief_v4★` | flag 0/1 | ★ นักเล่นแร่พิษ |
| `thPoisonLeechLv` | node `thief_v3` | non-INT | ระดับเลือดพิษ (`x`: 0.6…3.0) |
| `thPoisonLeech` | **derived** ใน `heroBuild` | rate 0..cap | อัตราฮีลสุดท้าย (รวม INT + `poisonLeech` ของเกียร์) |
| `thPerfectAgony` | talent `th_t4b` | 0.5 / 0.8 | อัตราแปลง critMul → ดาเมจพิษ |
| `thShadowWard` | **derived** ใน `heroBuild` | 0..0.15 | ลดดาเมจเวท / `trueSight` / `monHit≥999` |

- ไม่มี key ใหม่ใน `INT_FIELDS` (`tree.ts:68`) — ทั้ง 5 key จากโหนดเป็นทศนิยมต่อเนื่อง · `poison` (ที่อยู่ใน `INT_FIELDS` อยู่แล้ว) **ไม่ได้ใช้ใน `thief_v`** → ไม่มีโหนด P2d ที่ `whole = true` → กฎ `tidy()` ข้อ 1 ไม่ถูกกระตุ้น (ยังต้องเขียน `desc` แบบ §5 กันพลาดอยู่ดี)
- `poisonCap` / `poisonDmg` (มีแล้ว `stats.ts:34,78`) ถูกเพิ่มโดย hook F → **ไม่ใช่ key ใหม่**

### 2.2 `KIT` ที่อยู่ใน R4.7.2 แล้ว (ชื่อ + ค่า + label ตามตาราง R4.7.2 เป๊ะ) — **18 key**
| กลุ่ม | key (ค่า) | จำนวน |
|---|---|---|
| v1 | `thiefVenomBasicShare` (**0.58** ≈ 0.35/0.6 — R4.7 เขียน "0.35 / 0.6" = อัตราส่วน Basic ต่อแทงพิษ; เก็บเป็นเลขเดียว) | 1 |
| v2 Contaminate | `thiefDetAt` 8 · `thiefDetShare` 0.4 · `thiefDetMin` 3 · `thiefDetPoisonBase` 1.5 · `thiefDetPoisonLv` 0.5 · `thiefDetFlatBase` 0.6 · `thiefDetFlatLv` 1 · `thiefDetSplash` 0.5 · `thiefDetLeechShare` 0.5 | 9 |
| v3 เลือดพิษ | `thiefLeechLv` 0.08 · `thiefLeechInt` 0.015 · `thiefLeechCap` 0.6 · `thiefLeechTurnCap` 0.25 | 4 |
| v4 ★ | `thiefDetBossRefund` 0.25 | 1 |
| `th_t4b` | `thiefAgonyFrom` 1.4 · `thiefAgonyCap` 1 · `thiefAgonyHitCut` 0.15 | 3 |

- **ไม่สร้างใน P2d** (อยู่ใน R4.7 แต่ตัดออกตาม MVP, 9 key): `thiefArcaneMatkPerInt` `thiefVenomIntAt` `thiefVenomIntPoison` `thiefDetMatkLv` `thiefAlchemyStab` `thiefAlchemyKnife` `thiefAgonyWisAt` `thiefAgonyWisPer` `thiefAgonyWisCap`
- อย่าใส่ key ใน `KIT` ก่อนมีโค้ดอ่าน (จะเป็น whitelist ที่ไม่มีผล + ต้องมี label)

### 2.3 `KIT` ใหม่ **นอก R4.7** (R4.7 ระบุ "ไม่ list §4") — **6 key** · ต้องตั้ง label เอง
| Key | ค่า | ชนิด (`tunables.ts:146-147`) | Hook | Label admin (Thai) |
|---|---|---|---|---|
| `thiefWisCapEvery` | 8 | `KIT_INTS` | F | WIS: ทุกกี่แต้ม เพดานพิษ +1 |
| `thiefWisCapMax` | 16 | `KIT_INTS` | F | WIS: เพดานพิษเพิ่มสูงสุด (stack) |
| `thiefWisPoisonDmg` | 0.5 | `KIT_NUMS` | F | WIS: ดาเมจพิษ +ต่อแต้ม (ต่อ stack) |
| `thiefWardPer` | 0.003 | `KIT_NUMS` | G | Shadow Ward: ลดดาเมจเวท/ตาเหยี่ยว ต่อ WIS |
| `thiefWardCap` | 0.15 | `KIT_NUMS` | G | Shadow Ward: ลดสูงสุด |
| `thiefLuckyRes` | 6 | `KIT_INTS` | H | Gambler's Edge: LUCKY! → Energy |

### 2.4 ผลรวม + วิธีลงทะเบียน
- R4.7 ใช้ **18** + นอก R4.7 **6** = **KIT ใหม่ 24 key** (`KIT_INTS` 5: `thiefDetAt` `thiefDetMin` `thiefWisCapEvery` `thiefWisCapMax` `thiefLuckyRes` · `KIT_NUMS` 19)
- ค่าทุกตัวอยู่ในช่วง `int(0,50)` / `num(0,20)` ✅ (`thiefDetPoisonBase 1.5`, `thiefDetFlatLv 1` ฯลฯ)
- **ทุก key ต้องลง 4 ที่ใน commit เดียวกับที่โค้ดอ่าน** (ตาม R4.7.1):
  1. `KIT` (`skill-math.ts:84-88` บริเวณ `thiefAuto…thiefUltAgiShareCap`)
  2. `KIT_INTS` / `KIT_NUMS` (strings ใน `tunables.ts:146-147`) — **เป็น string `a|b|c` ต่อท้าย ไม่ใช่ array**
  3. `KIT_EXPLAIN` (`src/admin/explain/combo-kit.ts:187`, ตัวอย่าง `thiefUltAgiK` :255) — ไม่มี = `admin-engine.test.ts:39-54` fail
  4. `kit('key','label')` ใน `SKILL_LAYOUT.thief` — วางใน field `tree: [...]` (ตาม precedent Cleric `skill-registry.ts:107`; ถ้า P2a ยังไม่สร้าง `tree` ให้สร้างที่นี่) · ref ต้อง whitelisted + ค่าเริ่มอยู่ในช่วง (`skill-registry.test.ts:20-28`)

### 2.5 `S2P` / `S2N` / `KIT2.*`
**P2d ไม่แตะเลย** (Skill 2 = P2b · Rogue = P3). `JOB2.mobster` / `KIT2.mobster` / `trees2/mobster.ts` ห้ามแตะ (R4.3 ข้อ 3).

---

## 3. Task list (1 task = 1 commit · ทำตามลำดับ)

> **คำสั่งตรวจมาตรฐาน (ทุก task):** `npm run typecheck` + `node tools/test.mjs <ชื่อ>` (ห้ามรัน `npm test` เต็มชุด — R4.3 ข้อ 6)
> **เทสที่ต้องรันซ้ำทุก task ที่แตะ KIT:** `node tools/test.mjs admin-engine` · `node tools/test.mjs skill-registry`
> **ที่เก็บเทสใหม่:** `tests/thief-offmeta.test.ts` (ไฟล์เดียวทั้งสไลซ์ · เพิ่มทีละ `test()` ต่อ task)

### T1 · `feat(thief): statEff door + P2d Stats keys + matkToPmRatio`
| รายการ | ที่ไหน | เปลี่ยนอะไร |
|---|---|---|
| `Stats` + `PLAYER` | `src/data/stats.ts` interface (ใกล้ `poisonLeech` :59) + `PLAYER` (:439 บรรทัดยาว) | เพิ่ม 7 key ตาม §2.1 = `0` |
| `statEff()` | `src/data/meta/hero-stats.ts` ใกล้ `statPool` (:275) + export ผ่าน `meta` barrel (เช็ก `src/data/meta.ts`) | ตาม §1.3 |
| `matkToPmRatio` | `src/data/skill-math.ts` ต่อจาก `magicPower` (:16) | `export const matkToPmRatio = (st: Stats) => st.matk / Math.max(1, magicPower(st))` — แปลง "× M.ATK" เป็นหน่วย Pm สำหรับ `strike(..., magic=true)` (`roll()` ใช้ `magicBase`=Pm) |
| เทส | `tests/thief-offmeta.test.ts` | (1) `statEff` ≥0 · `b=1`→0 · (2) `matkToPmRatio` `matk=0`→0 (ไม่ NaN) · (3) key 7 ตัวอยู่ใน `PLAYER` = 0 |
- **KIT:** ไม่มี · **Mon:** ไม่มี
- **Verify:** `npm run typecheck` · `node tools/test.mjs thief-offmeta`

### T2 · `feat(thief): WIS hooks — poison cap, poison dmg, Shadow Ward`
| รายการ | ที่ไหน | เปลี่ยนอะไร |
|---|---|---|
| KIT 6 key | §2.3 | ลง 4 ที่ (§2.4) |
| pure math | `src/data/thief-offmeta.ts` (ไฟล์ใหม่ · import `KIT`) | `wisPoisonCap(eff) = Math.min(KIT.thiefWisCapMax, Math.floor(eff / KIT.thiefWisCapEvery))` · `wisPoisonDmg(eff) = KIT.thiefWisPoisonDmg * eff` · `shadowWard(eff) = Math.min(KIT.thiefWardCap, KIT.thiefWardPer * eff)` (ทุกตัวรับ `eff` = ผลของ `statEff`) |
| `heroBuild` | `hero-stats.ts:300-301` (ข้าง `poisonDmg += 0.1*d("int")`) | `if (job.id === "thief") { const w = statEff(b,'wis'); st.poisonCap += wisPoisonCap(w); st.poisonDmg += wisPoisonDmg(w); st.thShadowWard = shadowWard(w) }` · **คงบรรทัด INT 0.1** (Rev 3 เขียน 0.25 แต่ `statInfo.ts:51` + `thief_a2` desc ยืนยัน 0.1 → ดู §6) |
| Shadow Ward ใช้จริง | `BattleScene.hurtHeroCore` หลังคำนวณ `n` (:4458 anchor `let n = Math.max(1, Math.ceil(raw * (1 - this.st.guard)`) | `if (this.st.thShadowWard > 0 && (magic \|\| monHit >= 999 \|\| (src?.trueTurns ?? 0) > 0)) n = Math.max(1, Math.ceil(n * (1 - this.st.thShadowWard)))` — ใช้ `src.trueTurns` (field มีแล้ว `Mon.trueTurns`) ไม่สร้าง field |
| UI text | `statInfo.ts` `wis.byClass.thief` (ยังไม่มี → เพิ่ม) + `node-detail` ไม่แตะ | บรรทัด: `เพดานพิษ +…` / `ดาเมจพิษ +…/แต้ม` / `Shadow Ward …%` ใช้ `statEff`-compatible `d` |
| เทส | `thief-offmeta.test.ts` | (1) `wisPoisonCap` ที่ eff 0/7/8/127/999 = 0/0/1/15/16 (2) **เฉพาะ thief**: `heroStats({job:'archer', wis:80}).poisonCap` ไม่เพิ่ม (3) `shadowWard` cap 0.15 ที่ eff 50 / 51 (4) Mobster (`job:'thief', job2:'mobster'`) ได้ค่าเท่า Thief (ยืนยัน §6 ของ Rev 3: "บวกโดยตรง") |
- **Mon:** ไม่มี · **Verify:** `typecheck` · `thief-offmeta` · `admin-engine` · `skill-registry`

### T3 · `feat(thief): thief_v branch + thief_v1 แทงฉาบอาคม`
| รายการ | ที่ไหน | เปลี่ยนอะไร |
|---|---|---|
| Branch + node | `src/data/trees/thief.ts` (P2a เขียนใหม่แล้ว: `branches` :14-20, `nodes` :21) | เพิ่ม `{ id: 'thief_v', job: 'thief', name: 'เล่นแร่พิษ', icon: '⚗️', blurb: '…' }` + `n('thief_v1','thief_v',1,'🔮','แทงฉาบอาคม',3, desc, mod)` |
| `ATTACH` | `src/data/tree.ts:167-185` | `thief_v: "s1"` (ลำดับ column มาจาก `webBranches` ที่ `:293` — ไม่มีไฟล์ web-tier1 ที่ hardcode thief → ตรวจ `web-tier1.ts:77-102` ว่า `lineCols1('s1')` เก็บทุกกิ่ง `line==='s1'`; ต้อง ≤ 8 คอลัมน์รวม) |
| node mod | — | `mod: (lv) => ({ thS1Matk: 0.6 * lv })` (**ห้าม** `base + step*lv` — Rev 3 §2.3 ข้อ 3) |
| node desc | — | `(lv) => \`แทงพิษ +${Math.round(60 * lv)}% M.ATK (เวท) · Basic +${Math.round(60 * lv * KIT.thiefVenomBasicShare)}%\`` (เลขเป็น `%` จำนวนเต็ม ไม่มี `\d+\.\d+`) |
| KIT | `thiefVenomBasicShare` 0.58 | §2.4 |
| BattleScene (s1) | `autoSkill` `case 'thief'` (:3432-3433 anchor `KIT.thiefAuto * pow * (1 + this.st.pskill)`) | หลัง `strike(m, mul)`+`doubleAttack`: `if (this.st.thS1Matk > 0 && this.st.matk > 0 && !m.dead) this.strike(m, this.st.thS1Matk * matkToPmRatio(this.st), true, '#c9a8ff')` — `magic=true` ⇒ ไม่ข้าม flee/ไม่คริ (ตาม doc ของ `strike()` :1221-1222) · ใช้ `src` เดิมของสกิล (อยู่ใน `asSkill`) |
| BattleScene (Basic) | `basicOnce` `kind === 'thief'` (:3162, anchor `this.strike(f, 0.6); this.strike(f, 0.6); this.doubleAttack`) | ต่อท้ายใน `lunge` callback: 1 ครั้ง/สวิง `if (st.thS1Matk>0 && st.matk>0) this.strike(f, st.thS1Matk * KIT.thiefVenomBasicShare * matkToPmRatio(st), true, '#c9a8ff')` |
| `autoInfo` | `skill-math.ts:616-618` | เพิ่ม `out.push({ label: 'เวทเสริม', value: … })` เมื่อ `st.thS1Matk>0` |
| เทส | `thief-offmeta.test.ts` + `node-stretch` | (1) stretch เต็มระดับ = old full (`node-stretch.test.ts` ครอบอัตโนมัติ — รันเพื่อยืนยัน) (2) `desc(1..5)` ไม่มี `/\d+\.\d+/` · ไม่มี NaN (3) `thS1Matk` Lv5 = 1.8 |
- **Mon:** ไม่มี · **Verify:** `typecheck` · `thief-offmeta` · `node-stretch` · `admin-engine` · `skill-registry`

### T4 · `feat(thief): thief_v2 Contaminate`
| รายการ | ที่ไหน | เปลี่ยนอะไร |
|---|---|---|
| node | `trees/thief.ts` | `thief_v2` (tier 2, max 3 → stretch เป็น 5): `mod: (lv) => ({ thDetonate: lv })` (เก็บ `lv` เปล่า = 0.6…3.0 · base 1.5/0.6 อยู่ใน KIT ไม่อยู่ใน `mod`) · desc ใช้ `Math.round` กับ `%` |
| KIT 9 key | §2.2 | ลง 4 ที่ |
| pure math | `thief-offmeta.ts` | `detonateStacks(poison) = Math.min(poison, Math.max(KIT.thiefDetMin, Math.floor(poison * KIT.thiefDetShare)))` · `detonateDmg(det, poisonDmg, x, matk) = det * poisonDmg * (KIT.thiefDetPoisonBase + KIT.thiefDetPoisonLv * x) + (KIT.thiefDetFlatBase + KIT.thiefDetFlatLv * x) * matk` |
| scene | `BattleScene` ใกล้ `doubleAttack` (:2980) → method ใหม่ `private contaminate(m: Mon)` | เงื่อนไข: `st.thDetonate>0 && !this.detUsed && !m.dead && m.poison >= KIT.thiefDetAt` → `detUsed=true` · `dmg = Math.max(1, Math.round(detonateDmg(...) * this.dotMul()))` · `this.withSrc('poison', () => this.damageMon(m, dmg, false, '#a77be0', false))` (**`dot=false`** ให้ `vsPoison`/Exposed/stabMark ติด ตาม Rev 3 + R4.6 B5) · **หัก `m.poison -= det` หลัง `damageMon` ถ้า `!m.dead`** (ลำดับนี้: `vsPoison` ที่ `srcMul` อ่าน `m.poison>0` :4750 + `takenAmp` ของ P2b อ่าน poison ≥ N ยังเห็นสแตกเต็ม) · splash: ทุกตัว `alive()` ≠ m → `damageMon(o, Math.round(dmg * KIT.thiefDetSplash), …)` (ไม่ลดพิษของตัวอื่น) |
| ICD | field `private detUsed = false` | รีเซ็ตใน `heroTurn()` บรรทัดต้น (anchor `this.tickFxCd()` :855) = **1 ครั้ง/เทิร์นฮีโร่ รวม Basic + แทงพิษ** (ตาม Rev 3 §2.3 1B) |
| จุดเรียก | `basicOnce` thief (หลัง hit เหมือน T3) + `autoSkill` thief | `this.contaminate(f)` หลังฮิตทั้งหมดของสวิง/สกิลจบ (ไม่เรียกจาก `strike()` เพื่อไม่ยิงซ้ำจาก `doubleAttack`/คอมโบ) |
| `thDetonate` crit / ★ | — | **ยังไม่คริ** (ทำใน T6) |
| เทส | `thief-offmeta.test.ts` | (1) `detonateStacks(8)=3` (`max(3,floor(3.2))`) · `(20)=8` · `(2)=2` (cap ด้วย poison) (2) `detonateDmg` Lv5 (x=3): `det·poisonDmg·3.0 + 3.6·matk` (3) ICD: เรียก 2 ครั้งในเทิร์นเดียว = ยิงครั้งเดียว (ทดสอบ pure helper `canDetonate(flag, poison, thDet)`) |
- **เทสนี้ทำ BattleScene ตรง ๆ ไม่ได้** (Phaser) → แยก predicate/สูตรเป็น pure fn ใน `thief-offmeta.ts` แล้วเทสตรงนั้น · พฤติกรรมในฉากตรวจด้วย `tools/bot.cjs` (R4.3 ข้อ 6)
- **Verify:** `typecheck` · `thief-offmeta` · `node-stretch` · `admin-engine` · `skill-registry`

### T5 · `feat(thief): thief_v3 เลือดพิษ (INT leech, net HP, per-turn cap)`
| รายการ | ที่ไหน | เปลี่ยนอะไร |
|---|---|---|
| node | `trees/thief.ts` | `thief_v3` (T3): `mod: (lv) => ({ thPoisonLeechLv: lv })` · desc `%` จำนวนเต็ม |
| KIT 4 key | §2.2 | ลง 4 ที่ |
| pure math | `thief-offmeta.ts` | `leechRate(x, intEff, gear) = Math.min(KIT.thiefLeechCap, KIT.thiefLeechLv * x * (1 + KIT.thiefLeechInt * intEff) + gear)` |
| `heroBuild` | **หลัง** `for (const m of treeMods…) add(m)` (`hero-stats.ts:343-344`) — ต้องหลังเพราะ `thPoisonLeechLv` มาจาก tree | `if (job.id==='thief' && st.thPoisonLeechLv > 0) st.thPoisonLeech = leechRate(st.thPoisonLeechLv, statEff(b,'int'), st.poisonLeech)` |
| tick | `BattleScene` monTurn poison tick (:4108-4109 anchor `this.st.poisonLeech > 0) this.heal(m.poison * m.poisonDmg`) | ถ้า `st.thPoisonLeech > 0`: `const hp0 = m.hp` ก่อน `damageMon` → `net = hp0 - Math.max(0, m.hp)` → `this.leechHeal(net * st.thPoisonLeech)` · **ไม่งั้นคงสูตรเดิม** (gear-only) · ห้ามทำสองทาง (กันฮีลซ้ำ เพราะ `thPoisonLeech` รวม `poisonLeech` แล้ว) |
| cap ต่อเทิร์น | field `private leechLeft = 0` · `private leechHeal(n)` | `heal(Math.min(n, this.leechLeft), true); this.leechLeft -= …` · รีเซ็ต `leechLeft = maxHp * KIT.thiefLeechTurnCap` ที่ `heroTurn()` ต้น (จุดเดียว: ครอบทั้งเทิร์นฮีโร่ + ติ๊กมอนจนถึงเทิร์นฮีโร่ถัดไป — **ย่อจาก Rev 3** ที่ให้รีเซ็ต 2 จุด) |
| Contaminate ฮีล | `contaminate()` (T4) | `leechHeal(net * st.thPoisonLeech * KIT.thiefDetLeechShare)` (ไม่ ★ = 50%) |
| ไม่ฮีลจาก | `ทวงหนี้` (:2258) | ไม่ต้องทำอะไร — คนละ path (ไม่เรียก tick) · มีเทสยืนยัน |
| เทส | `thief-offmeta.test.ts` | (1) `leechRate` ที่ INT eff 0/50/80/100 × x=3.0: 0.24 / 0.42 / 0.528 / 0.60(cap) ← ตรงตัวอย่าง Rev 3 (2) `x=0`→gear เท่านั้น (3) สร้าง `heroStats` thief ที่ INT สูง: `thPoisonLeech` เปลี่ยนตาม INT (ยืนยัน wiring) (4) **RO-lite guard:** เทสไม่อ้าง `b.int - 1` ตรง ๆ — เรียกผ่าน `statEff` |
- **Verify:** `typecheck` · `thief-offmeta` · `node-stretch` · `admin-engine` · `skill-registry`

### T6 · `feat(thief): thief_v4 ★ นักเล่นแร่พิษ`
| รายการ | ที่ไหน | เปลี่ยนอะไร |
|---|---|---|
| node | `trees/thief.ts` | `thief_v4` tier 4 max 1 (ไม่ถูก stretch: `tree.ts:127` `n.tier === 4`): `mod: () => ({ thDetonateStar: 1 })` |
| KIT | `thiefDetBossRefund` | §2.2 |
| ★1 คริ | `contaminate()` | `const crit = st.thDetonateStar>0 && Math.random() < Math.min(0.6, st.skillCrit + st.spellCrit)` (ตรง Rev 3 + `critRateFor` magic branch :2894) → `dmg *= st.critMul` (**ใช้ `st.critMul` ตรง** ไม่ผ่าน `scaleCritMul`/skill slot เพราะ Contaminate ไม่ใช่สกิลที่มี crit switch) · ส่ง `crit` เข้า `damageMon(..., crit, …)` (ให้ T8 B5 ข้าม PA เมื่อ crit) |
| ★2 leech เต็ม | `contaminate()` | share = `thDetonateStar>0 ? 1 : KIT.thiefDetLeechShare` |
| ★3 คืนพิษบอส | `contaminate()` หลังหักพิษ | `if (star && !m.dead && (m.def.ai==='boss' \|\| !!m.def.mini)) m.poison = Math.min(this.poisonMax(), m.poison + Math.ceil(det * KIT.thiefDetBossRefund))` (pattern เดียวกับ :1265) |
| ตัดออก | Alchemy Blade (ข้อ 4 ของ Rev 3) | → P3 (§1.2) · เขียนใน desc ของ ★ เฉพาะ 3 ข้อ |
| เทส | `thief-offmeta.test.ts` | (1) refund `ceil(8·0.25)=2` (2) share ★=1 / ไม่★=0.5 (3) tier-4 ไม่ถูก stretch (`node-stretch` ครอบ) |
- **Verify:** เหมือน T5

### T7 · `feat(thief): th_t4b Perfect Agony + B5 poison-power bracket`
| รายการ | ที่ไหน | เปลี่ยนอะไร |
|---|---|---|
| talent | `trees/thief.ts` th_t4b (:53 เดิม "นักฆ่า" critMul) | **เขียนความหมายใหม่ id เดิม** (Beta ไม่ต้องรักษา id — ดู R-S1): `t('th_t4b',4,'🗡️','วิถีพิษคริ',2, desc, (r)=>({ thPerfectAgony: r===1?0.5:0.8 }))` · ทุกค่า `> 0` ✓ (บังคับโดย `job2-talents.test.ts:17-23` เฉพาะ `TALENTS2` แต่ทำตามเป็นกฎเดียวกัน) |
| KIT 3 key | §2.2 | `thiefAgonyFrom` `thiefAgonyCap` `thiefAgonyHitCut` |
| pure math | `thief-offmeta.ts` | `agonyBonus(critMul, rate) = Math.min(KIT.thiefAgonyCap, Math.max(0, critMul - KIT.thiefAgonyFrom) * rate)` · `poisonPowerBonus(agony, vsPoison) = Math.min(KIT.thiefAgonyCap, agony + vsPoison)` |
| B5 ใน `damageMon` | `BattleScene.damageMon` (:3885) ต่อจากบรรทัด `srcMul` (:3887 anchor `dmg = Math.ceil(dmg * this.srcMul(m, dot))`) | `if (this.src === 'poison' && !this.debtBursting) { const pa = crit ? 0 : agonyBonus(this.st.critMul, this.st.thPerfectAgony); const vp = dot ? 0 : this.px('vsPoison'); const b = poisonPowerBonus(pa, vp); if (b > 0) dmg = Math.ceil(dmg * (1 + b)) }` |
| กัน vsPoison ซ้ำ | `srcMul` :4750 (`if (!dot && m.poison > 0) k *= 1 + this.px('vsPoison')`) | เพิ่ม `&& src !== 'poison'` — ไม่งั้น Contaminate โดน `vsPoison` 2 ชั้น (srcMul + B5) · **ตรวจ `grep "withSrc('poison'"`**: ผู้เรียก `src='poison'` + `dot=false` ปัจจุบัน = ไม่มี (มีแค่ :2258 และ :4108 ที่ `dot=true`) → แก้นี้ไม่กระทบของเดิม |
| `debtBursting` guard | `damageMon` | `ทวงหนี้` ใช้ `src='poison', dot=true` (:2258) → ถ้าไม่กัน จะได้ PA ฟรี = เปลี่ยนสมดุล Mobster ที่ไม่ได้อยู่ใน B5 (R4.6: สมาชิก = tick/Seep/Contaminate/Plague) → ใช้ flag เดิม `debtBursting` (:1681) |
| ฮิต non-crit −15% | `strike()` หลัง `crit` ถูก roll (:1234 anchor `const crit = this.forceCrit ||`) | `if (!crit && !magic && this.st.thPerfectAgony > 0 && this.src !== 'poison') mul *= 1 - KIT.thiefAgonyHitCut` — ใช้กับ Basic/Skill/Knives ตาม Rev 3 · **ไม่ใช้กับ magic** (v1 เวทเสริมไม่คริอยู่แล้ว → ไม่ควรโดนหักทุกครั้ง) |
| Bracket | R4.6 B5 | cap `thiefAgonyCap`=1.0 · **ไม่รวมใน B1** (`takenAmp` ของ P2b ทำที่ `:3905`; PA อยู่ bracket ของมันเอง) · mastery พิษ `ven_L2` ยังคูณแยกใน `srcMul` ตามเดิม |
| ซ้อนกันไม่ได้ | `th_t4a` ⟂ `th_t4b` | เลือก 1 ต่อแถว (`save.ts:83`) → เทสต้องไม่รวมทั้งคู่ใน build เดียว (R4.6.1 ท้ายตาราง) |
| เทส | `thief-offmeta.test.ts` | (1) `agonyBonus(1.4,.5)=0` · `(2.0,0.5)=0.3` · `(4.0,0.8)=1.0`(cap) (2) `poisonPowerBonus(0.7, 0.7)=1.0` (3) crit → PA=0 (ตรวจใน predicate `paApplies(crit,debtBursting)`) (4) **ตัวเลข R4.6.3 Contaminate:** `B5 = min(1, 0.7+1.0)` ⇒ ×2.00 |
- **Verify:** `typecheck` · `thief-offmeta` · `job2-talents` · `admin-engine` · `skill-registry` · `node-stretch`

### T8 · `feat(thief): LUK Gambler's Edge`
| รายการ | ที่ไหน | เปลี่ยนอะไร |
|---|---|---|
| KIT | `thiefLuckyRes` 6 | §2.3 |
| scene | `hurtHeroCore → dodged()` ท้ายฟังก์ชัน (:4425 anchor `if (this.st.dodgeEnergy > 0 && this.job.resource === 'energy')`) | `if (label === 'LUCKY!' && this.job.id === 'thief' && !this.luckyIcd) { this.luckyIcd = true; this.res = Math.min(this.resMax(), this.res + KIT.thiefLuckyRes) }` · `private luckyIcd = false` รีเซ็ตใน `heroTurn()` (ICD "1 ครั้ง/เทิร์นฮีโร่" = flag ไม่ใช่เลข ตาม R4.7) |
| Rogue (มีดบิน ฟรี) | — | **ไม่ทำ** → P3 · ใน P2d เงื่อนไข `job.id==='thief'` ครอบ Rogue/Mobster (job1 = thief) ด้วย Energy ล้วน · ถ้า P3 ต้องการ knife ให้ต่อท้าย `if (this.j2?.id==='rogue')` |
| ใช้ LUK ผ่าน helper? | — | **ไม่ต้อง** — ไม่มีสูตรขึ้นกับแต้ม LUK (LUCKY! chance มาจาก `st.luckyDodge` เดิม) → ผ่าน RO-lite โดยอัตโนมัติ |
| UI | `statInfo.ts:61` `luk.byClass.thief` | ต่อท้ายบรรทัด: `หลบโชคดีสำเร็จ +6 Energy (1 ครั้ง/เทิร์น)` (อ่านจาก `KIT.thiefLuckyRes`) |
| เทส | `thief-offmeta.test.ts` | predicate `luckyRes(label, job, icd)`: `LUCKY!`+thief+!icd → 6 · `EVADE!` → 0 · icd → 0 · archer → 0 |
- **Verify:** `typecheck` · `thief-offmeta` · `admin-engine` · `skill-registry`

### T9 · `chore(thief): P2d integration — registry sweep, bot sync, measurement notes`
| รายการ | ที่ไหน | เปลี่ยนอะไร |
|---|---|---|
| Registry sweep | `skill-registry.ts` `SKILL_LAYOUT.thief.tree` | ตรวจว่าทั้ง 24 key ปรากฏ 1 ครั้ง (ไม่ซ้ำ ไม่ขาด) |
| เทส sweep | `thief-offmeta.test.ts` | วนทุก key ใน §2.2/§2.3 → `fieldFor('kit', key)` ไม่ undefined · `explain` มี label (ซ้ำกับ admin-engine แต่ล็อกรายชื่อ P2d) |
| bot | `tools/bot.cjs` (:75 `TAL=`, :54 `TREEX`) | ไม่มี id ของ P2d อยู่ที่นั่น — ตรวจ `grep -n "thief_v\|th_t4b" tools/bot.cjs` ต้องว่าง; เพิ่มตัวอย่างคอมเมนต์ `TREEX='{"thief_v1":5,"thief_v2":5,"thief_v3":5,"thief_v4":1}'` |
| `power.ts` | `src/data/power.ts` `powerParts()` | **ยังไม่แตะ** — ต้องวัดก่อนตาม Rev 3 §5 ข้อ 4 + `JOB2_K.mobster` (ดู Risk R-M2) |
| node-detail | `src/scenes/character/node-detail.ts` | ไม่จำเป็นสำหรับ MVP (ไม่มี row ใหม่) |
- **Verify (final):** `npm run typecheck` · `node tools/test.mjs thief-offmeta` · `node tools/test.mjs node-stretch` · `node tools/test.mjs admin-engine` · `node tools/test.mjs skill-registry` · `node tools/test.mjs job2-talents` · `node tools/test.mjs thief-ult`

---

## 4. Interfaces

### 4.1 ต้องการจาก slice ก่อนหน้า (assume ว่ามีแล้ว)
| จาก | ของ | P2d ใช้ที่ไหน | ถ้าไม่มี |
|---|---|---|---|
| **P2a** | `src/data/trees/thief.ts` เขียนใหม่: `thief_a` + `thief_core` (ลบ `thief_crit`/`thief_blood`) | T3 เพิ่ม `thief_v` ในไฟล์เดียวกัน · `thief_l2` เดิม (`poisonLeech`) หายจาก web → `thief_v3` ไม่ซ้ำ | merge conflict เฉพาะ `branches`/`nodes` array |
| **P2a** | `ATTACH` (`tree.ts:167`) ไม่มี `thief_crit`/`thief_blood` (core = ไม่อยู่ใน `ATTACH`) | T3 เพิ่ม `thief_v: "s1"` | — |
| **P2a** | migration `migrateThiefRogueRework` + flag (ใช้ `resetTree(s)` `save.ts:801`) ล้าง `jobTree`/`jobTalents` ของ Thief | `thief_v1-4` เป็น id ใหม่; `th_t4b` เปลี่ยนความหมาย → ต้องอยู่ภายใต้การรีเซ็ตเดียวกัน (R-S1) | ดู R-S1 |
| **P2a** | `thPoisonSpread`/`thPlagueDeath` + KIT `thiefSpreadShare`… | ไม่ใช้โดยตรง (Contaminate **ไม่เกี่ยว** poisonSpread) | — |
| **P2a** | ค่า `thiefAutoMinCost` + `s1Weave` | `contaminate()` เรียกท้าย `autoSkill` thief — ต้องอยู่หลัง `s1Weave = true` (ไม่ขัด) | — |
| **P2b** | `takenAmp(m, dot, crit)` (B1) แทน `:3905` | Contaminate `dot=false` ได้ Exposed/stabMark/Privileged ผ่าน helper · P2d **ไม่เรียก/ไม่แก้** helper | ถ้า P2b ยังไม่ merge: Contaminate ได้แค่ `poisonAmp` เดิม — ไม่พัง |
| **P2b** | `m.woundHealCut` / `healCut()` | ไม่ใช้ | — |
| **P2c** | `th_t3*` + `onShroudBreak()` + Global Ult CD cap | **ไม่ใช้** · แต่ Shadow Ward (T2) อ่าน `src.trueTurns` ที่ P2c ไม่ได้เปลี่ยนความหมาย · จุดที่แตะร่วม: `hurtHeroCore` (P2c เพิ่ม Shroud shield **ก่อนรับดาเมจ trueSight**) → ลำดับ: Shroud shield → `n` คำนวณ (Ward ลดที่นี่) → shield absorb | ถ้า P2c แก้ `n` อยู่แล้ว ให้ Ward อยู่ใน **บรรทัดเดียวกับ `n`** ก่อน `this.lastHurt = n` |
| **P2c** | `dodged()` แก้เพิ่ม (Shroud/`th_t1a` flee) | T8 ต่อท้ายฟังก์ชัน ไม่ชน | merge: ใช้ anchor `dodgeEnergy` |

### 4.2 P2d ให้ slice ถัดไป / P3 / Mobster
| ให้ | รายละเอียด |
|---|---|
| `statEff(b, k)` | ประตู stat เดียว — P3 (Rogue) + W2 (Venom Melt, Arcane Edge, Toxic Overheal) ต้องใช้ · RO-lite เปลี่ยนที่เดียว |
| `matkToPmRatio(st)` | P3 Alchemy Blade (`Back Stab`/`พายุมีด` × M.ATK) ใช้ต่อ |
| `thief-offmeta.ts` | pure math ทั้งหมด (เทสได้โดยไม่ต้อง Phaser) · W2 เพิ่ม `venomMelt`/`toxicSeep`/`overhealShield` ที่นี่ |
| `src === 'poison'` B5 hook ใน `damageMon` | Toxic Seep / Plague Burst (P2a) / Death Mark (P3, B6 = `echo` ข้าม) ต้องผ่านจุดนี้ · **ลำดับ**: ถ้า P3 เพิ่ม flag `echo` (B6) ให้ `echo` ข้าม B5 ด้วย |
| `thPoisonLeech` / `leechHeal()` | W2 `Toxic Overheal` ต่อท้าย `leechHeal` ได้ตรง ๆ |
| flag scene (รีเซ็ตใน `heroTurn()`) | `detUsed` · `leechLeft` · `luckyIcd` — P3 ที่เพิ่ม ICD ของ Rogue ใช้จุดรีเซ็ตเดียวกัน |

---

## 5. กฎข้อความ / stretch / tidy (§2.3 box) ที่ P2d ต้องทำตาม

| กฎ | ผลกับ P2d |
|---|---|
| `INT_FIELDS` โหนด → ห้ามทศนิยมใน `desc` (`tree.ts:119` `tidy(whole=true)` ปัดทุก `\d+\.\d+`) | โหนด P2d **ไม่มี key ใน `INT_FIELDS`** → `whole=false` · `tidy` ปัดเฉพาะเลข >2 ตำแหน่ง → **เลข 1–2 ตำแหน่ง (เช่น `0.58`) ไม่ถูกแตะ** · แต่ยังบังคับเขียน `Math.round(x*100)%` เพื่อความชัวร์ |
| `mod(lv)` ห้าม `base + step*lv` (undershoot ที่ Lv1: `at(1)=0.6`) | `thS1Matk: 0.6*lv`, `thDetonate: lv`, `thPoisonLeechLv: lv` = ตัวคูณล้วน · **base อยู่ใน KIT** (`thiefDetPoisonBase` ฯลฯ) |
| tier 4 (★) ไม่ stretch (`tree.ts:127`) | `thief_v4` max 1 ✓ |
| `node-stretch.test.ts` full level = old full | `thief_v1-3` ผ่านอัตโนมัติถ้า `mod`/`desc` เป็นฟังก์ชันของ `lv` ที่ทำงานกับเลขไม่เต็ม (เช่น `lv=0.6`) — **เขียน `desc` ให้รับ `lv` ทศนิยมได้** |
| `job2-talents` ทุกค่า `> 0` | `th_t4b` rank 1/2 = 0.5/0.8 ✓ (เทสนี้วน `TALENTS2` แต่ `ids unique` วน `TALENTS+TALENTS2`) |

---

## 6. Risks (เรียงตามความเสียหาย)

| ID | ความเสี่ยง | ระดับ | มาตรการ |
|---|---|---|---|
| **R-S1** | **Save safety:** `th_t4b` ใช้ id เดิมกับความหมายใหม่ (นักฆ่า critMul → Perfect Agony) + `thief_v*` id ใหม่ | 🔴 | สมมติฐาน: P2a–P2d merge เข้า main **ด้วยกันก่อนผู้เล่นเห็น** และ migration ของ P2a ล้าง `jobTalents` ทุก save (R4.3 ข้อ 5) · **ถ้า P2a ออกก่อนแยก** → ผู้เล่นที่เลือก `th_t4b` เก่าหลัง migrate จะเปลี่ยนความหมายเงียบ ๆ → ให้ P2a ทำ flag เป็นเลข (`thiefRogueRework: 1,2…`) แล้ว P2d ยก flag + re-run `resetTree` เฉพาะ thief (เสนอใน §7) · save เก่าไม่มี key ใหม่ → `PLAYER` default 0 = ปลอดภัย (`save.ts` ไม่เก็บ `Stats`) |
| **R-M1** | **Mobster:** `job.id === 'thief'` ครอบ Mobster (job1) → ได้ WIS cap/poisonDmg/Ward/LUCKY Energy/`thief_v` ทั้งหมด (**ตั้งใจ** — ทาง A) · แต่ **Contaminate หัก `m.poison`** → ลด `ทวงหนี้` burst (`m.poison * m.poisonDmg * burstTurns` :2255) | 🟠 | ไม่แตะ `trees2/mobster.ts` / `JOB2.mobster` / `KIT2.mobster` · PA ข้าม `ทวงหนี้` ด้วย `debtBursting` (T7) · บันทึกใน §measure |
| **R-M2** | `JOB2_K.mobster` ต้องวัดใหม่ (R4.3 ข้อ 3) — P2d เพิ่ม: WIS poisonDmg (+0.5/pt), WIS cap, `thief_v` ทั้งสาย | 🟠 | **ห้ามแก้ใน P2d** · ใส่ใน checklist วัดหลัง P2c (บอท `GEAR=1 ALLOC=...`) |
| **R-B1** | `thiefWisPoisonDmg 0.5` = ตัวเลขที่เสี่ยงที่สุด (WIS 120 → +60/stack vs INT 0.1/pt · `thief_a2` +lv/stack) · Rev 3 "ยังไม่ยืนยัน" (R4.3 ข้อ 6) | 🟠 | ค่าเริ่ม = Rev 3 · อยู่ใน admin (`KIT_NUMS`) ปรับสดได้ · **วัดตัวแรกตอนเล่นจริง** (WIS-all-in Lv 80) |
| **R-B2** | R4.6 brackets: Contaminate ผ่าน B1 (P2b) × B5 (T7) × `srcMul` mastery พิษ `ven_L2` — ตัวอย่าง R4.6.3 = ×6.08 | 🟡 | ทำตามกฎ: `vsPoison` ไม่ซ้ำ (T7 `src !== 'poison'`) · PA cap 1.0 · ไม่บวก B1 เข้า B5 |
| **R-B3** | PA ข้ามเมื่อ crit (Contaminate ★) — ถ้า `damageMon` ถูกเรียกด้วย `crit` ผิด (เช่น false ทั้งที่คริ) จะได้ PA ซ้อน crit | 🟡 | `contaminate()` ส่ง `crit` จริง · เทส predicate `paApplies` |
| **R-T1** | `tunables.ts` whitelist เป็น **string `a\|b\|c`** — พิมพ์ผิด/ลืม key = `fieldFor` undefined (`skill-registry.test.ts:20`) | 🟡 | T9 เทส sweep รายชื่อ 24 key |
| **R-T2** | `admin-engine.test.ts:39-54`: key ที่ whitelisted ต้องมี `KIT_EXPLAIN` เฉพาะ (ไม่ใช่ fallback `ตัวคูณคิทคลาสหลัก`) | 🟡 | ลงใน commit เดียวกับ KIT (ทุก task) |
| **R-T3** | `INTISH`/`J2_LABEL` (Rogue) **ไม่เกี่ยว** — P2d ไม่แตะ `KIT2` | ✅ | — |
| **R-A1** | ทำ BattleScene ผ่านเทสอัตโนมัติไม่ได้ (Phaser) | 🟡 | แยก pure fn ใน `thief-offmeta.ts` + `tools/bot.cjs` ดูผล (บอทประเมินผู้เล่นต่ำ — R4.3 ข้อ 6) · คิวเล่นจริงเป็นตัวตัดสิน |
| **R-A2** | Ult budget (R4.3 ข้อ 1) | ✅ | P2d **ไม่เพิ่มฮิตเงาพริ้ว** (Alchemy Blade/DEX ฮิต = P2c/P3) |
| **R-O1** | RO-lite (`ro-stat-curve-v1`) เปลี่ยน `statPool()` + ราคา stat | 🟡 | ใช้ `statEff` ทุกที่ (§1.3) · `thUltAgi` เดิมใช้ `d("agi")`+`statPool` — **ไม่แตะใน P2d** (ปล่อยให้ RO-lite ตามแก้) |

---

## 7. ข้อเสนอต่อ P2a (ไม่บล็อก — ถ้าไม่ทำ P2d ยังทำได้)
- ทำ flag migration เป็น **เลขเวอร์ชัน** (`thiefRogueRework: number`) ไม่ใช่ boolean → สไลซ์หลัง ๆ (P2d/P3) ยก `2` ได้ถ้าต้อง re-reset id ที่เปลี่ยนความหมายในรอบ release ถัดไป

## 8. คำถามถึงเจ้าของ
**ไม่มีข้อบล็อก** · 2 ค่า default ที่เลือกให้ (คัดค้านได้ตอนรีวิว):
1. **INT → `poisonDmg` ใช้ 0.1/pt (โค้ด + `statInfo.ts:51` + desc `thief_a2`)** ไม่ใช่ 0.25 ตาม Rev 3 §4 · เหตุผล: เปลี่ยนเป็น 0.25 จะ buff ทุก Thief/Mobster INT เงียบ ๆ นอกสโคป · INT ได้ตัวตนจาก `thief_v` อยู่แล้ว
2. **ลำดับรีเซ็ต `leechLeft` = จุดเดียวที่ต้นเทิร์นฮีโร่** (Rev 3 ให้ 2 จุด) · ผลต่างน้อย, โค้ดสั้นกว่า

---

## 9. Checklist วัดหลังลงมือ (ให้ owner/บอท)
| วัด | ทำยังไง | เป้า |
|---|---|---|
| WIS-all-in Lv 80 บอส D10 | `ALLOC` เทียบ STR-all-in | 0.45x–0.90x (Rev 3 §4 — ยังไม่ยืนยัน) |
| INT + `thief_v1-3` | `TREEX='{"thief_v1":5,"thief_v2":5,"thief_v3":5}'` | ไม่ตายง่ายกว่า STR · ฮีลไม่เกิน 25% Max HP/เทิร์น |
| Mobster + WIS | `job2=mobster` | `ทวงหนี้` ไม่ลดลงเกิน ~ (วัดก่อน/หลัง) → ปรับ `JOB2_K.mobster` |
| `th_t4b` | ตรวจ log ว่า PA ไม่ติดบน `ทวงหนี้` และ Contaminate คริ | PA = 0 ตอน crit |
