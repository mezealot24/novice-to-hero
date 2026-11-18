# P2a — Thief Foundation · Implementation Spec

> **Slice:** P2a (แรกสุดของ P2 · P2b → P2c → P2d ต่อยอดจาก branch นี้)
> **Base:** `claude/thief-ult-agi-ratio` @ `67f8e34` · เลขบรรทัดทั้งหมดอ่านจากโค้ดจริงบน base นี้ (2026-11-18)
> **อ่านก่อน:** `design/thief-rogue-rework-v1.md` — Rev 4 Delta (R4.1–R4.7) ทับ Rev 3 · Rev 3 §2.2 / §2.3 1A / §2.6 / §2.7 (th_t2*)
> **ผู้เขียนสเปก (ไม่ได้แตะ `src/` `tests/` `tools/`)** · Baseline ที่ตรวจแล้ว: `npm run typecheck` ผ่าน · `node tools/test.mjs` ผ่านทั้งหมดที่ลอง ยกเว้น `admin-engine` (พังอยู่แล้ว 2 เทสต์ — ดู §3)

---

## 0) TL;DR (อ่านแค่นี้ก็เริ่มได้)

| เรื่อง | ค่า |
|---|---|
| จำนวน task (1 task = 1 commit) | **9** |
| ไฟล์ข้อมูลหลัก | `src/data/trees/thief.ts` (เขียนใหม่ทั้ง a-line + core + talent แถว 2) |
| KIT key ใหม่ | **19** (INTS 9 · NUMS 10) — มาจาก R4.7.2 ทั้งหมด ไม่มีเลขใหม่นอกลิสต์ |
| `Stats` key ใหม่ (default 0 ใน `PLAYER`) | **14** (ดู T1) |
| `INT_FIELDS` ใหม่ | **0** (P2a ไม่เพิ่ม · key ที่เป็น int ของ a-line คือ `poison` / `poisonCap` มีอยู่แล้ว) |
| Field ใหม่บน `Mon` | **0** (ไม่แตะ `interface Mon` `BattleScene.ts:73`) |
| Mobster | `trees2/mobster.ts` · `JOB2.mobster` · `KIT2.mobster` **ห้ามแตะ** ✅ (P2a ไม่แตะ) |
| ลำดับที่ปลอดภัย | T1 plumbing → T2 pure math → T3 ข้อมูล tree → T4–T7 BattleScene → T8 save → T9 bot/regress |
| คำถามเจ้าของ | **1 ข้อ** (ดู §4) |

---

## 1) Ordered task list

> กฎทุก task: ก่อน commit รัน `npm run typecheck` + `node tools/test.mjs <ส่วนของชื่อไฟล์>` (ห้าม `npm test` เต็มชุด — R4.3 ข้อ 6)
> ห้ามเลขมายากลใน `BattleScene` (R4.3 ข้อ 2 / `AGENTS.md`): ทุกเลขต้องเป็น `KIT.*` หรือ `mod` ของ node/talent

### T1 — Plumbing: `Stats` keys + 19 KIT keys + registry (ยังไม่มีพฤติกรรม)

**Commit:** `feat(thief): P2a stat + KIT keys and admin registry`

| ไฟล์ | บรรทัด (base) | แก้อะไร |
|---|---|---|
| `src/data/stats.ts` | interface `Stats` ใกล้ `:62` (`thUltAgi`) · `PLAYER` `:433-449` | เพิ่ม 14 key ด้านล่าง (ชนิด `number` · ค่าเริ่ม `0` ใน `PLAYER` ทุกตัว) |
| `src/data/skill-math.ts` | `KIT` `:84-88` (`thiefAuto…thiefUltAgiShareCap`) | เพิ่ม 19 key ด้านล่างต่อท้ายกลุ่ม thief (คอมเมนต์ `// P2a:` บรรทัดเดียว) |
| `src/data/tunables.ts` | `KIT_INTS` `:146` · `KIT_NUMS` `:147` | เพิ่มชื่อ key เข้า string (pipe-separated · match แบบ **exact** `patch.ts:35` → `thiefAuto` ไม่ชน `thiefAutoMinCost`) |
| `src/admin/explain/combo-kit.ts` | `KIT_EXPLAIN` `:187` · กลุ่ม thief `:251-257` | เพิ่ม `{ label, effect }` ต่อ key (ภาษาไทย ห้ามเหมือน fallback `ตัวคูณคิทคลาสหลัก`) |
| `src/data/skill-registry.ts` | `SKILL_LAYOUT.thief` `:124-132` · ช่อง `tree?: SkillRef[]` `:50` (Cleric ใช้อยู่) | `s1` ← `thiefAutoMinCost`, `thiefStrikeRes`, `thiefStrikeLs` · เพิ่ม `tree:` ของ thief ใส่ key ที่เหลือ (ตัวช่วย `kit(path,label)` `:57`) |

**`Stats` key ใหม่ (14)** — comment บรรทัดเดียวต่อ key ตามสไตล์ไฟล์

| key | ใช้โดย | หมายเหตุ |
|---|---|---|
| `thPoisonPen` | `thief_a1` | เจาะเกราะเมื่อเป้ามีพิษ (0.06 × oldLv) |
| `thToxicHold` | `thief_a3` | โอกาสพิษไม่ลดบน `toxicSkin` (0.25 × oldLv) |
| `thStrikePoison` | `thief_a3` | flag: D.Strike ติด → พิษ +1 |
| `thPlagueDeath` | `thief_a4 ★` | flag: Plague Burst + ใช้ share 0.6 |
| `thCondLeech` | `thief_c1` | ดูดเลือดเมื่อเป้ามีสถานะ (0.03 × oldLv) |
| `thStackCrit` | `thief_c2` | crit/skillCrit ต่อ stack (0.00625 × oldLv) |
| `thCritPoison` | `thief_c2` | flag: คริ → พิษ +1 |
| `thKillLeech` | `thief_c3` | ฮีลตอนฆ่า (0.04 × oldLv) — แยกจาก `killHeal` เดิม (gear/card/Mobster) |
| `thBloodKing` | `thief_c4 ★` | flag |
| `thDodgeCdCut` | `th_t2a` | ลด CD กี่เทิร์น (mod = 1) — **อยู่ใน talent mod ไม่ใช่ KIT** (แบบเดียวกับ `thDodgeShield` ที่ R4.7 ย้ายเข้า mod) |
| `thDodgeCdIcd` | `th_t2a` | ICD เทิร์นฮีโร่ (3 \| 2) |
| `thStackCritTal` | `th_t2b` | crit/skillCrit ต่อ stack (0.01 \| 0.016) |
| `thWeaveDmg` | `th_t2c` | Basic หลังแทงพิษแรงขึ้น (0.25 \| 0.40) |
| `thWeaveRes` | `th_t2c` | Energy คืน (10 \| 16) |

**KIT key ใหม่ (19)** — ค่า/ชนิด/ป้าย ตาม R4.7.2 (ไม่ได้ปรับ)

| key | ค่า | ชนิด | ใช้ใน | Label (admin · ใช้ทั้ง `kit()` และ `KIT_EXPLAIN`) |
|---|---|---|---|---|
| `thiefAutoMinCost` | 30 | INTS | T2/T4 | แทงพิษ: Energy ต่ำสุดหลังลด |
| `thiefStrikeRes` | 4 | INTS | T4 | D.Strike ติด: คืน Energy |
| `thiefStrikeLs` | 0.33 | NUMS | T4/T6 | D.Strike: สัดส่วนดูดเลือด (แทน hardcode `BattleScene.ts:2984`) |
| `thiefToxicHoldCap` | 0.75 | NUMS | T5 | พิษทนทาน: โอกาสพิษไม่ลด สูงสุด |
| `thiefSpreadShare` | 0.6 | NUMS | T5 | ระเบิดพิษลาม: สัดส่วนพิษที่กระจาย |
| `thiefPlagueAt` | 10 | INTS | T5 | Plague Burst: พิษขั้นต่ำ (stack) |
| `thiefPlagueTurns` | 1 | INTS | T5 | Plague Burst: ดาเมจ = กี่เทิร์นพิษ |
| `thiefKindsAt` | 2 | INTS | T6 | "ดีบัฟหลายชนิด" = กี่ชนิดขึ้นไป |
| `thiefCondLeechMulti` | 1.5 | NUMS | T6 | คมเลือด: × เมื่อดีบัฟหลายชนิด |
| `thiefStackCritMax` | 8 | INTS | T6 | จุดตายสะสม: stack สูงสุด |
| `thiefKillRes` | 10 | INTS | T6 | กระหายเลือด: ฆ่าได้ Energy (แทน `resGain(10)` hardcode `:4014`) |
| `thiefKillPoisonHeal` | 0.005 | NUMS | T6 | กระหายเลือด: ฮีลต่อพิษบนศพ |
| `thiefKillPoisonHealCap` | 0.12 | NUMS | T6 | กระหายเลือด: ฮีลโบนัสสูงสุด |
| `thiefBossCritLeech` | 0.375 | NUMS | T6 | กระหายเลือด: คริบอส ฮีลกี่ส่วน |
| `thiefBossCritRes` | 8 | INTS | T6 | กระหายเลือด: คริบอส Energy |
| `thiefBloodKingBelow` | 0.45 | NUMS | T6 | ราชันย์โลหิต: HP ต่ำกว่า |
| `thiefBloodKingMul` | 1.75 | NUMS | T6 | ราชันย์โลหิต: ดูดเลือด × |
| `thiefBloodKingStrikeLs` | 0.66 | NUMS | T6 | ราชันย์โลหิต: D.Strike ดูดเลือด |
| `thiefStackCritTalMax` | 14 | INTS | T7 | จุดบอดซ้อนพิษ: stack สูงสุด |

- Range ใน admin: INTS = `int(0,50)` · NUMS = `num(0,20)` (`tunables.ts:192`) → ค่าทั้งหมดอยู่ในช่วง ✅
- **ไม่มี key ใหม่** สำหรับค่าร่าย: เปลี่ยนค่า path เดิม `job.thief.auto.cost` เท่านั้น (R4.7 · ห้าม `KIT.thiefAutoCost`) → ทำใน T2
- **Verify:** `npm run typecheck` · `node tools/test.mjs skill-registry` · ตรวจป้าย admin ด้วยมือ (เทสต์ `admin-engine` พังอยู่ก่อน — ดู §3 ข้อ 6):
  `node -e` สคริปต์เล็ก ๆ เรียก `explainField('kit', '<key>')` ทุก key ใหม่ แล้วเช็กว่า `effect` ไม่เท่า `ตัวคูณคิทคลาสหลัก`

---

### T2 — Pure math + `autoCost` floor + ค่าร่าย 45

**Commit:** `feat(thief): แทงพิษ cost 45, Energy floor 30, pure helpers`

| ไฟล์:บรรทัด | แก้อะไร |
|---|---|
| `src/data/jobs.ts:84-89` (`thief.auto`) | `cost: 40` → `45` · แก้ข้อความ `desc` ที่เขียน `Energy 40` → `Energy 45` + ต่อท้าย "แล้วตีปกติ 1 เทิร์น (สลับคม)" |
| `src/data/skill-math.ts:353` `autoCost` | `Math.max(job.id === 'thief' ? KIT.thiefAutoMinCost : Math.min(10, job.auto.cost), job.auto.cost - st.autoCostCut)` (คอมเมนต์เดิม "floor 10…" ปรับให้บอก floor 30 ของโจร) |
| `src/data/skill-math.ts` ใกล้ `autoCost` | เพิ่ม **pure helpers** (รับตัวเลข ไม่รับ `Mon`/Phaser เพื่อเขียนเทสต์ได้ตรง ๆ) ตามตารางล่าง |
| `src/data/skill-math.ts:611-620` `autoInfo` (แถว thief) | เพิ่มแถว `{ label: 'สลับคม', value: 'หลังแทงพิษ ตีปกติ 1 เทิร์นก่อน' }` + ค่าร่ายใช้ `autoCost()` เดิมอยู่แล้ว ✅ |

**Pure helpers** (export จาก `skill-math.ts` · ไม่มีเลขมายากล ใช้ `KIT.*`):

| ฟังก์ชัน | สูตร | ใช้ใน |
|---|---|---|
| `thiefS1Woven(jobId, weave): boolean` | `jobId === 'thief' && weave` | T4 |
| `thiefStackCritAdd(st, stacks): number` | `st.thStackCrit × min(stacks, KIT.thiefStackCritMax) + st.thStackCritTal × min(stacks, KIT.thiefStackCritTalMax)` | T6/T7 |
| `thiefCondLeechAdd(st, kinds): number` | `kinds < 1 ? 0 : st.thCondLeech × (kinds >= KIT.thiefKindsAt ? KIT.thiefCondLeechMulti : 1)` | T6 |
| `thiefKillHeal(st, poisonOnCorpse): number` | `st.thKillLeech + min(KIT.thiefKillPoisonHealCap, poisonOnCorpse × KIT.thiefKillPoisonHeal)` (ส่วนพิษนับเมื่อ `thKillLeech > 0` เท่านั้น) | T6 |
| `thiefBossCritHeal(st): number` | `st.thKillLeech × KIT.thiefBossCritLeech` | T6 |
| `thiefToxicHold(st): number` | `min(KIT.thiefToxicHoldCap, st.thToxicHold)` | T5 |
| `thiefSpreadAmount(poison, plague): number` | `plague ? ceil(poison × KIT.thiefSpreadShare) : ceil(poison / 2)` (ค่า `/2` เดิมของ card `ven_L1` ต้องไม่เปลี่ยน — R4.7 แถว `thiefSpreadShare`) | T5 |
| `thiefBloodKingOn(st, hp, maxHp, inShroud): boolean` | `st.thBloodKing > 0 && (hp < maxHp × KIT.thiefBloodKingBelow \|\| inShroud)` | T6 |

**Verify:** `npm run typecheck` · `node tools/test.mjs thief-ult-agi` (เดิมต้องยังผ่าน) · เพิ่มเทสต์ของ helper ใน T3 รวมไฟล์ใหม่ `tests/thief-p2a.test.ts`

---

### T3 — Tree data: `thief_a` + `thief_core` + talents `th_t2a/b/c` + เทสต์ sync

**Commit:** `feat(thief): P2a skill web a-line, core column, row-2 talents`

**3.1 `src/data/trees/thief.ts`** (ไฟล์ทั้งไฟล์ 56 บรรทัด)

- เขียน node ใน **Old Lv `1..3` (★ = 1)** เสมอ — `stretchNode()` (`tree.ts:125`) ยืดเป็น `1..5` เอง (`x = lv×3/5`)
- ห้ามเปลี่ยน: `s2Gate` `thief_core1` (บรรทัด 10) · node `thief_b1` `thief_b2` `thief_b4` · talent `th_t1*` `th_t3*` `th_t4*` (เป็นของ P2b/P2c)
- **ลบ** branch `thief_crit` `thief_blood` (บรรทัด 18-19) และ node `thief_b3` `thief_c2` `thief_c3` `thief_c4` (เดิม, ใน `thief_crit`) · `thief_l1`–`thief_l4` (บรรทัด 28-35) — แทนด้วย branch เดียว `thief_core`
- ไม่ต้องแก้ `ATTACH` (`tree.ts:167-185`): `thief_a: "s1"` มีแล้ว · `thief_core` ไม่อยู่ใน ATTACH → `line = "core"` อัตโนมัติ (`tree.ts:296`) · `web-tier1.ts:125-136` วาด 1 คอลัมน์ต่อ core branch (row `0..3` ตามลำดับ tier) → คอลัมน์ทั้งหน้า = s1(1) + s2(3) + ult(1) + core(**1**) = 6 (เดิม 7) · ช่อง ≤ 8 คอลัมน์ ยังไม่ชน (P2c/P2d เติมอีก 2)
- อัปเดต `blurb` ของ branch `thief_a` เป็น "พิษสะสม + เจาะเกราะ · พิษลามตอนมอนตาย" และ header คอมเมนต์ไฟล์ (บรรทัด 1-4) ให้ตรงของใหม่

**3.2 Node table** (`n(id, branch, tier, icon, name, max, desc, mod)`)

| ID | Branch · Tier · Max (old) | ชื่อ | `mod(lv)` (old lv) | กฎ `desc` (stretch-safe) |
|---|---|---|---|---|
| `thief_a1` | a · 1 · 3 | เคลือบพิษอาบคม *(เดิม "เคลือบพิษ")* | `{ poison: lv, thPoisonPen: 0.06 * lv }` | มี `poison` ∈ `INT_FIELDS` → **whole**: `desc` ห้ามมี `\d+\.\d+` · เขียน `+${Math.round(lv)} stack` และ `${Math.round(6 * lv)}%` (ผล: Lv1..5 = `1,1,2,2,3` stack · `4,7,11,14,18`%) |
| `thief_a2` | a · 2 · 3 | พิษกัดลึก *(เดิม "พิษเข้มข้น")* | `{ poisonDmg: lv, vsPoison: 0.08 * lv }` | ไม่ใช่ INT_FIELDS · เขียน `%` ด้วย `Math.round(8 * lv)` · คงข้อความ "INT ทุก 10 แต้ม +1/stack" (ตรง `hero-stats.ts:300` `0.1 × INT`) |
| `thief_a3` | a · 3 · 3 | พิษทนทาน *(เดิม "พิษสะสม")* | `{ poisonCap: 3 * lv, thToxicHold: 0.25 * lv, thStrikePoison: 1 }` | `poisonCap` ∈ INT_FIELDS → whole · `%` = `Math.round(25 * lv)` · `thStrikePoison` เป็น flag คงที่ (stretch ไม่ย่อ — `INT_FIELDS` ไม่มีมัน → ค่า `1` ทุกเลเวล ✅ เทสต์ "ไม่เกิน full" ผ่าน) |
| `thief_a4` ★ | a · 4 · 1 | ระเบิดพิษลาม *(เดิม "ระเบิดพิษ")* | `{ poisonSpread: 1, thPlagueDeath: 1 }` | tier 4 ไม่ stretch |
| `thief_c1` | core · 1 · 3 | คมเลือดซ้อนสถานะ | `{ thCondLeech: 0.03 * lv }` | `%` = `Math.round(3 * lv)` (ผล Lv1..5 = `2,4,5,7,9`%) |
| `thief_c2` | core · 2 · 3 | จุดตายสะสม | `{ thStackCrit: 0.00625 * lv, thCritPoison: 1 }` | ผลรวมที่ cap 8 stack = `0.05 × lv`: Lv1..5 = `3,6,9,12,15`% — เขียน `desc` เป็น "+X% ที่ 8 stack" ด้วย `Math.round(5 * lv)`… **ระวัง:** old-lv ต้องเป็น `x = 0.6..3.0` → `Math.round(5*0.6)=3` ✅ |
| `thief_c3` | core · 3 · 3 | กระหายเลือด | `{ thKillLeech: 0.04 * lv }` | `%` = `Math.round(4 * lv)`; บรรทัดข้อความต้องระบุ Energy `KIT.thiefKillRes` + โบนัสต่อพิษ + คริบอส (ดึงเลขจาก `KIT` ใน desc ได้ — `tree.ts` import `KIT` อยู่แล้ว `:10`) |
| `thief_c4` ★ | core · 4 · 1 | ราชันย์โลหิต | `{ thBloodKing: 1 }` | ใช้ `KIT.thiefBloodKingBelow/Mul/StrikeLs` ใน desc |

> ⚠️ Rev 3 §2.6 เขียน `thStackCrit: 0.00625 * lv` กับ "0.625%" **ปนกันสองหน่วย** — ใช้ค่าในตารางนี้ (ต่อ old-lv: Lv5 → x=3 → 0.01875/stack × 8 = **15%**; Lv1 → x=0.6 → 3%) ซึ่งตรงกับตัวเลขที่ Rev 3 ตั้งใจ

**3.3 Talents (`talent(id,row,icon,name,max,desc(r),mod(r))`)** — ทุกค่าใน `mod` ต้อง **> 0** ทั้ง r1 และ r2 (ธรรมเนียมเดียวกับ `tests/job2-talents.test.ts:21-27`, ซึ่งตรวจเฉพาะ `TALENTS2` แต่ให้คงไว้กับคลาส 1)

| ID | ชื่อ | r1 → r2 `mod` | `desc` |
|---|---|---|---|
| `th_t2a` | ขโมยจังหวะ | `{ dodgeEnergy: 15 \| 25, thDodgeCdCut: 1, thDodgeCdIcd: 3 \| 2 }` (`rk(r,…)` helper ใน `tree-types.ts`) | หลบได้ → Energy +15/25 · ลด CD ทักษะ 2 หรือ Ult 1 เทิร์น (ICD 3/2 เทิร์นฮีโร่) |
| `th_t2b` | จุดบอดซ้อนพิษ | `{ thStackCritTal: 0.01 \| 0.016 }` | crit/skillCrit +1.0/+1.6% ต่อ stack (สูงสุด 14 stack) — **ยังไม่มีส่วน `magPen`** (ต้องรอ Exposed ของ P2b + `thief_v1` ของ P2d — ดู §2) |
| `th_t2c` | จังหวะสลับมีด | `{ thWeaveDmg: 0.25 \| 0.40, thWeaveRes: 10 \| 16 }` | หลังแทงพิษ: Basic ถัดไปแรง +25/40% · Energy +10/16 |

- ลบ `autoCostCut` ออกจาก `th_t2c` เดิม (บรรทัด 46) — สต็อก `autoCostCut` ใน `Stats` ยังอยู่สำหรับ gear/card (Rev 3 §5 ข้อ 3)
- ไอคอน/ชื่อ ไทยตาม Rev 3 §2.7 · `th_t2a/b/c` ไอคอนเดิมได้ (⚡ 🎯 🧪)

**3.4 เทสต์ที่ต้องแก้/เพิ่มใน commit นี้**

| ไฟล์ | บรรทัด | งาน |
|---|---|---|
| `tests/admin-model.test.ts` | `:92-109` (borrow test) | `pick('มีดคู่')`→node ถูกลบ · `pick('คมเลือด')` ถูกลบ · `pick('เคลือบพิษ')`→`'เคลือบพิษอาบคม'` (`thief_a1` ยัง map `poison` ✅). เปลี่ยนส่วน crit/combo/lifesteal ให้เลือก node **ของคลาสอื่น** ที่ mod ปลดล็อกจริง: `heroClasses().flatMap(c=>c.srcs).filter(s=>'crit' in s.mod(s.max))` แล้ว **คำนวณค่าคาดหวังจาก `mod(max)` ของ node นั้นเอง** (ไม่ฝังเลข 0.15 อีก) |
| `tests/admin-model.test.ts` | `:143-152` (over-level) | `'มีดคู่'` `'จุดบอด'` หาย → ใช้ node growing ตัวอื่น (เช่น `D.Strike` ไม่ grow · เลือกจาก query ข้างบน) · assertion `talent.top === talent.max` ต้องใช้ talent ของคลาสที่ยัง unconditional (swordsman/archer) |
| `tests/node-stretch.test.ts` | `:86` | ไม่ต้องแก้ (`thief_core1` gate คงเดิม) · ตรวจว่าผ่านกับ node ใหม่ทั้งหมด |
| `tests/thief-p2a.test.ts` (**ใหม่**) | — | ดูตารางล่าง |

**`tests/thief-p2a.test.ts` — เคสแรก (เพิ่มทีละ task ที่เหลือ):**

1. id ใหม่ทั้งหมดมีอยู่ใน `TREE` / `TALENTS` · id เก่า `thief_crit` `thief_blood` `thief_l1..l4` ไม่มีใน `BRANCHES`/`TREE` · `branchesOf('thief')` มี `core` branch **ตัวเดียว** (`line === 'core'`)
2. ทุก key ใน `mod(lv)` ของ node/talent ใหม่ ∈ `PLAYER` และ finite · ทุกเลเวล `1..max` ของ a/core มีค่า `>= 0` และค่าสูงสุด `<= mod(max)` (ตรวจซ้ำแบบเดียวกับ `node-stretch`)
3. **กฎ stretch/tidy:** `thief_a1` `thief_a3` (มี INT_FIELDS) → ทุกเลเวล `desc(lv)` **ไม่มี** `/\d+\.\d+/` และไม่มี `NaN/undefined` · `mod(1).poison === 1`, `mod(5).poison === 3`, `mod(5).poisonCap === 9`, `mod(1).thPoisonPen ≈ 0.036`, `mod(5).thPoisonPen ≈ 0.18`
4. `thief_c2`: `thiefStackCritAdd` ที่ Lv5 (`mod(5)`), 8 stack = **0.15** (±1e-9) · Lv1 = **0.03**
5. helpers T2 ตามสูตร (ขอบเขต: `kinds` 0/1/2, `poison` 0/10/40, cap 0.12/0.75, `thiefSpreadAmount(7,false)=4`, `(10,true)=6`)
6. talents: ทุก `mod(r)` ค่า `> 0` r=1,2 · `desc(r)` ไม่ว่าง · `th_t2c.mod` **ไม่มี** `autoCostCut`
7. `autoCost(JOBS.thief, st)` = 45 เมื่อ `autoCostCut=0` · `= 30` เมื่อ `autoCostCut=40` (floor) · Mage ยัง = 5 (ไม่แตะ) · Rogue/Mobster (ใช้ `JOBS.thief`) = เท่ากัน

**Verify:** `npm run typecheck` · `node tools/test.mjs thief-p2a` · `node tools/test.mjs node-stretch` · `node tools/test.mjs admin-model` · `node tools/test.mjs talent-text` · `node tools/test.mjs skill-registry`

---

### T4 — Energy loop: `s1Weave` + D.Strike +Energy (+ `thiefStrikeLs`)

**Commit:** `feat(thief): s1Weave alternation and D.Strike energy`

| ไฟล์:บรรทัด | แก้อะไร |
|---|---|
| `BattleScene.ts` (ฟิลด์ ใกล้ `:1341` `firstSwing`) | `private s1Weave = false` · `private weaveBonus = 0` (ใช้ใน T7) |
| `:725` `fight()` init | `this.s1Weave = false; this.weaveBonus = 0` (ต่อท้ายบรรทัด `firstSwing = true`) |
| `:1073-1075` `castS1` | หลัง `await this.asSkill(() => this.autoSkill(), 'skill', 's1')` เพิ่ม `if (this.job.id === 'thief') this.s1Weave = true` |
| `:1085` เงื่อนไขร่าย S1 | เพิ่ม `&& !thiefS1Woven(this.job.id, this.s1Weave)` — ถ้า weave อยู่ ตกลงไป `basicAttack()` ที่ `:1089` เอง |
| `:3066` `basicAttack()` ต้นฟังก์ชัน | `const woven = thiefS1Woven(this.job.id, this.s1Weave); this.s1Weave = false` (ล้างทันที ไม่ว่าจะมี th_t2c หรือไม่) · ส่ง `woven` ให้ T7 ใช้ต่อ |
| `:2980-2987` `doubleAttack()` | แทน `this.lsMul = 0.33` → `KIT.thiefStrikeLs` (T6 สลับเป็น `thiefBloodKingStrikeLs` เมื่อ blood king) · เมื่อ D.Strike **ติด** (หลังผ่าน `Math.random()` ที่ `:2981`) และ `job.resource === 'energy'` → `this.resGain(KIT.thiefStrikeRes)` (`resGain` `:1209`) — เกิดแค่ Basic / แทงพิษ (call-site `:3171` `:3433`); **เงาพริ้วไม่เรียก `doubleAttack`** อยู่แล้ว → ตรงเงื่อนไข "ไม่เกิดซ้ำบนฮิตเงาพริ้ว" |

**พฤติกรรมที่ต้องการ (ตรวจด้วยเทสต์ pure):** Energy +25/เทิร์น (`RES_RULES.energyPerTurn` `jobs.ts:21` · `BattleScene.ts:1041`), S1 = 45, Basic เทิร์นถัดไป → **S1:Basic = 1:1** ไม่ว่าจะมี `autoCostCut`/`th_t2a`
- เทสต์จำลอง 20 เทิร์น (pure, ในเทสต์): `res += 25` ต้นเทิร์น · ถ้า `!thiefS1Woven && res >= autoCost` → ใช้ S1, ตั้ง weave · ไม่งั้น Basic, ล้าง weave → นับ S1 กับ Basic ต้อง `|S1−Basic| ≤ 1` ที่ `autoCostCut ∈ {0, 16, 40}` (ทดสอบ floor 30 ด้วย)
- Manual mode (`mayCast(!this.autoUlt, this.book.s1)` `:1074`): ผู้เล่นที่ไม่ได้กดจอง = Basic อยู่แล้ว → `basicAttack` ล้าง weave ตามปกติ ✅ ไม่ต้องแตะเพิ่ม
- Ult ที่ `ultWaiting` ตัดหน้า (`:1060`) → `return` ก่อนถึง Basic → weave **ค้างข้ามเทิร์น** (ตั้งใจ: "Basic ถัดไป")

**Mobster/Rogue:** `this.job.id` ยังเป็น `'thief'` (`job2` ผสมที่ `:390` เปลี่ยนแค่ `cost` ของ Berserker `jobs2.ts:44`) → ได้ weave ด้วย ✅ (Rev 3 §2.2 ต้องการ) · Rogue ผลต่างจริงคือ Basic/คอมโบ/มีดบินทำงานครบทุกเทิร์นที่สลับ

**Verify:** `npm run typecheck` · `node tools/test.mjs thief-p2a` (เทสต์จำลอง) · `node tools/test.mjs thief-ult-agi` · `node tools/test.mjs skill-hud` (HUD อ่าน `autoCost` `:6232`)

---

### T5 — a-line hooks (เจาะเกราะ · พิษทน · พิษหลัง D.Strike · ระเบิดพิษลาม)

**Commit:** `feat(thief): thief_a hooks pen, hold, strike poison, plague`

| Hook | ไฟล์:บรรทัด | แก้อะไร |
|---|---|---|
| **a1 เจาะเกราะ** | `BattleScene.ts:1254` (DEF ของฮิตกายภาพไม่คริ) | ใน `Math.max(0, 1 - this.st.physPen)` เปลี่ยนเป็น `Math.max(0, 1 - Math.min(STAT_CAPS.physPen, this.st.physPen + (m.poison > 0 ? this.st.thPoisonPen : 0)))` — import `STAT_CAPS` จาก `data/stats` (cap = 0.75 `stats.ts:428`) · คริข้าม DEF อยู่แล้ว (`!crit`) จึงไม่ต้องทำอะไรกับคริ |
| **a3 พิษไม่ลด** | `:4093` (บรรทัด `toxicSkin` decay `if (m.poison > 0) m.poison--`) | `if (m.poison > 0 && Math.random() >= thiefToxicHold(this.st)) m.poison--` · พิษบนมอนปกติไม่ decay อยู่แล้ว (ไม่มี `poison--` นอก toxicSkin) |
| **a3 D.Strike → พิษ +1** | `doubleAttack()` `:2980` (ต่อจาก T4) | เมื่อ D.Strike ติด และ `st.thStrikePoison > 0` และ `!m.dead` → (**ใช้ `this.addPoison(m, 1)` ที่ `:4896`** — private method มีอยู่แล้ว) |
| **a4 ★ spread** | `killMon()` `:4022` | `Math.ceil(m.poison / 2)` → `thiefSpreadAmount(m.poison, this.st.thPlagueDeath > 0)` · เงื่อนไข `!this.debtBursting` **คงไว้** (`:4022`, R4.1: ทวงหนี้ไม่กระจายซ้ำ) |
| **a4 ★ Plague Burst** | `killMon()` ต่อท้ายบรรทัด `:4022` | ถ้า `st.thPlagueDeath > 0 && m.poison >= KIT.thiefPlagueAt && !this.debtBursting && !this.plagueBursting` → ตั้ง `plagueBursting = true` (flag ใหม่ ป้องกัน chain ระเบิดซ้อนจากศพที่ถูกฆ่าด้วย burst) → `for (const o of others) this.withSrc('poison', () => this.damageMon(o, Math.max(1, Math.round(KIT.thiefPlagueTurns * m.poison * m.poisonDmg * this.dotMul())), false, '#a77be0', true))` → `finally { plagueBursting = false }` · `dot=true` (`damageMon` 5 พารามิเตอร์ ตามที่ `:2258` เรียก) |

- ฟิลด์ใหม่ `private plagueBursting = false` ใกล้ `debtBursting` `:1681`
- **ข้อสังเกต R4.6:** burst เป็น `dot=true` → ยังโดน `poisonAmp` / `marked` / `lateDmg` (R4.6.1 บรรทัด 20) — ยอมรับตามสเปก Rev 4 (ไม่ใช่ B5; B5 เป็นของ P2d)
- `thief_a2` `vsPoison` ไม่ต้องแก้ BattleScene (`srcMul` `:4750` อ่าน `px('vsPoison')` = `min(OUTSIDE_CAP.vsPoison, pk + st)` ✅ B2 ไม่เปลี่ยน)

**เทสต์เพิ่ม (thief-p2a):** `thiefToxicHold` (0.25×3 → 0.75 cap, gear 1.0 → 0.75) · `thiefSpreadAmount` ตามตาราง · (ตรรกะ `killMon`/`damageMon` ไม่มี harness เทสต์ Phaser — ครอบด้วย pure helper + รีวิวโค้ด · ดู §3 ข้อ 7)

**Verify:** `npm run typecheck` · `node tools/test.mjs thief-p2a`

---

### T6 — core hooks (คมเลือด · จุดตายสะสม · กระหายเลือด · ราชันย์โลหิต)

**Commit:** `feat(thief): thief_core hooks leech, stack crit, kill heal, blood king`

เพิ่ม helper ใน `BattleScene` (private):
`statusKinds(m): number` = `(m.poison > 0 ? 1 : 0) + (m.chill > 0 ? 1 : 0)` — **extension point** (P2b เติม Wound/Exposed — ดู §2) · `stackCountOf(m): number` = `m.poison` (P2b เติม `+ wound`)

| Hook | ไฟล์:บรรทัด | แก้อะไร |
|---|---|---|
| **c1 ดูดเลือดตามสถานะ** | `strike()` `:1275-1277` (`ls = …`) | `const condLs = !magic ? thiefCondLeechAdd(this.st, this.statusKinds(m)) : 0` บวกเข้า `ls` · จำกัดผลรวมด้วยค่า cap เดิม **`0.4`** ที่ `hero-stats.ts:486` — **export ค่าเป็นค่าคงที่ใน `stats.ts`/`hero-stats.ts` แล้ว import** (ห้ามก๊อปเลข 0.4 ลง BattleScene) · `lsMul` เดิมคุม D.Strike/สกิล (`0` = ไม่ดูด) ✅ |
| **c1 `st.lifesteal` base** | — | `thCondLeech` ไม่เข้า `st.lifesteal` เพราะต้องเช็กเป้าต่อฮิต |
| **c2 crit ต่อ stack** | `critRateFor()` `:2893-2905` | รับ `target` อยู่แล้ว: `const sc = target ? thiefStackCritAdd(this.st, this.stackCountOf(target)) : 0` · สกิล/ult (`:2901` `Math.min(C.skillCrit, this.st.skillCrit + iceBonus + …)`) → บวก `sc` เข้า `st.skillCrit` · Basic/combo (`:2902` `Math.min(C.crit, this.st.crit + physAdd)`) → บวก `sc` ใน `physAdd` · เวท (`magic`) **ไม่บวก** (Rev 3: crit + skillCrit กายภาพ) · ผ่าน cap `C.crit/C.skillCrit` เดิม |
| **c2 คริ → พิษ +1** | `strike()` หลัง `damageMon` `:1273` (ใกล้ `r.crit` block) | `if (r.crit && !magic && this.st.thCritPoison > 0 && !m.dead) +1 พิษ` (ใช้ `this.addPoison(m, 1)` `:4896`) |
| **c3 ฆ่า → ฮีล/Energy** | `killMon()` `:4012-4015` | คง `killHeal` เดิม (gear/card/Mobster) · เพิ่มบล็อกใหม่ถ้า `st.thKillLeech > 0 && hp > 0` → `this.heal(maxHp × thiefKillHeal(st, m.poison))` + `resGain(KIT.thiefKillRes)` · **แทนที่ `this.resGain(10)` hardcode `:4014`** ด้วย `KIT.thiefKillRes` (ผลเท่าเดิม: ค่า default 10 และยังเรียกเมื่อ `killHeal > 0`) |
| **c3 คริบอส/มินิ** | `strike()` `:1265-1268` (`killHealCritUsed`) | เพิ่ม `else if (r.crit && !this.killHealCritUsed && this.st.thKillLeech > 0 && (boss/mini))` → `heal(maxHp × thiefBossCritHeal(st))` + `resGain(KIT.thiefBossCritRes)` + set `killHealCritUsed = true` (flag รีเซ็ตทุกเทิร์นที่ `:1018` ✅) · **ห้ามแก้บรรทัด `0.25` เดิมของ `killHeal`** (Mobster/gear ใช้ร่วม) |
| **c4 ราชันย์โลหิต** | `strike()` `:1277` | `bk = thiefBloodKingOn(st, hp, maxHp, this.inShroud())` · ตัวคูณดูดเลือด: `bk ? KIT.thiefBloodKingMul : (st.bloodKing>0 && hp<maxHp*0.4 ? 2 : 1)` → **ใช้ `max(ทั้งสอง)` ไม่ซ้อนกัน** (Rev 3 §2.6: "แทนที่และไม่ซ้อนทับ `bloodKing ×2`") · เลข `0.4`/`2` ของ gear เดิมคงไว้ ไม่แตะ |
| **c4 D.Strike lsMul** | `doubleAttack()` | `this.lsMul = bk ? KIT.thiefBloodKingStrikeLs : KIT.thiefStrikeLs` |
| **`inShroud()`** | helper ใหม่ | `return false` + คอมเมนต์ `// P2b: return this.shroudTurns > 0` (**extension point**) |

> **Rev 3 §2.6 c4:** `เลือดพิษ` ×1.75 ด้วย — `thief_v3` เลือดพิษใหม่อยู่ **P2d** → P2a ไม่ทำ (ดู §2) · `poisonLeech` เดิม (`:4109`) ไม่แตะ

**เทสต์เพิ่ม:** `thiefCondLeechAdd` (kinds 0/1/2 · Lv5 `0.09 × 1.5 = 0.135` สอดคล้อง Rev 3 "สูงสุด 13.5%") · `thiefKillHeal` (poison 0/10/40 → cap 0.12) · `thiefBossCritHeal` (Lv5 `0.12×0.375 = 0.045`) · `thiefBloodKingOn` (ขอบเขต 0.45 · shroud) · `thiefStackCritAdd` ซ้ำ

**Verify:** `npm run typecheck` · `node tools/test.mjs thief-p2a` · `node tools/test.mjs crit-split` (แตะ `critRateFor`) · `node tools/test.mjs shield-counter-caps`

---

### T7 — Talent hooks (`th_t2a` / `th_t2b` / `th_t2c`)

**Commit:** `feat(thief): row-2 talents dodge cooldown, stack crit, weave bonus`

| Talent | ไฟล์:บรรทัด | แก้อะไร |
|---|---|---|
| **`th_t2a` Energy** | `dodged()` `:4425` | `dodgeEnergy` คงเดิม (**ไม่แตะ**) |
| **`th_t2a` ลด CD** | `dodged()` ต่อจาก `:4425` | ถ้า `st.thDodgeCdCut > 0 && this.dodgeCdIcd <= 0` → เลือกเป้า: ทักษะ 2 ถ้า `this.s2Cd > 0` และ ≥ CD Ult · ไม่งั้น Ult ถ้า `this.smashCdLeft > 0` → ลด `st.thDodgeCdCut` เทิร์น (min 0) · ตั้ง `this.dodgeCdIcd = st.thDodgeCdIcd` · **การลด CD Ult ต้องผ่าน helper เดียว** `cutUltCd(n)` (private ใหม่ — วันนี้ = `smashCdLeft = Math.max(0, smashCdLeft - n)`; **P2c เติม Global cap `-2/turn` + floor 1 ที่นี่ที่เดียว**) |
| **ICD counter** | `heroAct()` `:1017-1018` | `if (this.dodgeCdIcd > 0) this.dodgeCdIcd--` ต้นเทิร์นฮีโร่ · ฟิลด์ `private dodgeCdIcd = 0` (reset ใน `fight()` `:725`) |
| **`th_t2b`** | — | ไม่มี code เพิ่ม: ใช้ `thiefStackCritAdd` ที่ T6 ทำไว้แล้ว (บวก `thStackCritTal` ใน helper เดียวกัน) · ตรวจว่า cap stack = `KIT.thiefStackCritTalMax` |
| **`th_t2c` Basic แรงขึ้น** | `srcMul()` `:4736` (basic bracket) | `1 + this.px('basicDmg') + (c ? this.st.comboDmg : 0)` → เพิ่ม `+ this.weaveBonus` (**นอก `px()` cap ตั้งใจ — R4.6 B4: `thWeaveDmg` เข้า basicDmg bracket #13 ที่เป็นผลบวกอยู่แล้ว**) · ฟิลด์ `weaveBonus` ตั้งใน `basicAttack()` ต้นฟังก์ชัน: `this.weaveBonus = woven ? this.st.thWeaveDmg : 0` · รีเซ็ต `= 0` ท้าย `basicAttack()` (ก่อน `goHome()` `:3158`) · ครอบ **ทุกฮิตในสวิง** (รวมฮิตคอมโบ + D.Strike ที่ `src` เป็น `'basic'/'combo'`) |
| **`th_t2c` Energy** | `basicAttack()` | `if (woven && this.st.thWeaveRes > 0) this.resGain(this.st.thWeaveRes)` |

- `counter` (`:4737`) ใช้ bracket เดียวกัน แต่ weave ไม่ตั้งสำหรับ counter (ไม่ได้อยู่ใน `basicAttack`) → ไม่ต้องกัน
- `thWeaveDmg` ไม่ใช่ amp แยกชั้น → **ไม่เกี่ยว B1** (`takenAmp` ของ P2b ไม่ต้องรู้)

**เทสต์เพิ่ม:** `th_t2a.mod(1/2)` = `{15,1,3}` / `{25,1,2}` · `th_t2b.mod` = 0.01 / 0.016 · `th_t2c.mod` = 0.25,10 / 0.40,16 · cap ของ `thiefStackCritAdd` ที่ 14 stack ผ่าน `thStackCritTal` · `desc(r)` ผ่าน `talent-text`

**Verify:** `npm run typecheck` · `node tools/test.mjs thief-p2a` · `node tools/test.mjs talent-text`

---

### T8 — Save migration `migrateThiefRogueRework` + flag

**Commit:** `feat(save): thief rework v1 free web and talent reset`

| ไฟล์:บรรทัด | แก้อะไร |
|---|---|
| `src/save.ts:81` (`SaveData`) | `thiefRogueRework?: number` — **เวอร์ชันเลข ไม่ใช่ boolean** (แพทเทิร์นเดียวกับ `bmRework` `:80`) · คอมเมนต์: 1 = P2a Thief Class 1 reset |
| ใกล้ `:482` (ต่อท้าย `migrateSageRework`) | `export const THIEF_REWORK_VER = 1` และ `export function migrateThiefRogueRework(s: SaveData)` |
| `newSave()` `:133-141` | เพิ่ม `thiefRogueRework: THIEF_REWORK_VER` (ถัดจาก `sageRework: 1`) — save ใหม่ข้าม migration |
| `load()` `:214-215` | เรียก `migrateThiefRogueRework(s)` ต่อจาก `migrateSageRework(s)` (หลัง `migrateNodeStretch` `:210` เพื่อให้ stretch ทำงานก่อน — ลำดับสำคัญ) |

**พฤติกรรม `migrateThiefRogueRework(s)`:**

1. `if (!s || typeof s !== 'object') return` (guard JSON เสีย — `AGENTS.md` §3)
2. `const v = Number.isFinite(s.thiefRogueRework) ? s.thiefRogueRework! : 0; if (v >= THIEF_REWORK_VER) return`
3. `s.thiefRogueRework = THIEF_REWORK_VER` **ก่อน** ทำงานอื่น (idempotent แม้ครึ่งทาง)
4. `if (s.job !== 'thief') return` ← ผู้เล่น Rogue/Mobster ที่ `job === 'thief'` เข้าเงื่อนไขนี้ด้วย ✅ (job2 ไม่เกี่ยว)
5. `s.skillPoints += resetTree(s)` (`save.ts:801` — คืนแต้ม `crossSpent.j2In1/j3In1` เข้า `job2Points/job3Points` ให้เองแล้ว · ห้ามคำนวณซ้ำ) · guard `s.skillPoints` ไม่ใช่ตัวเลข → ใช้ `?? 0`
6. `s.jobTalents = {}` (Talent Points คิดจากการเลือก → คืนอัตโนมัติ `tree-types`/`save.ts:83`)
7. **ห้ามแตะ** `job2Tree` `job2Talents` `job2Points` ของ Mobster/Rogue (ส่วน Rogue เป็นของ P3 — ดู §2)
8. `s.jobTree` เป็น `undefined/null/ไม่ใช่ object` → `resetTree` ทน (ใช้ `?? {}` `:802`)

**ทำไมเป็น version:** P3 (Rogue) จะเพิ่ม `if (v < 2) { …reset job2Tree/job2Talents เมื่อ job2 === 'rogue'… }` + bump `THIEF_REWORK_VER = 2` — ถ้าเป็น boolean ผู้เล่นที่ migrate ที่ P2a จะข้าม Rogue reset ตลอดกาล

**เทสต์ (thief-p2a):** แพทเทิร์นเดียวกับ `tests/sage-rework.test.ts:119-127` และ `tests/node-stretch.test.ts:103-125`

| เคส | คาดหวัง |
|---|---|
| thief เก่า (`thiefRogueRework` ไม่มี) · `jobTree` {a: 3, core1: 5, …} · `jobTalents` มี · `skillPoints=2` | `skillPoints = 2 + ผลรวม jobTree` · `jobTree = {}` · `jobTalents = {}` · flag = 1 |
| รันซ้ำ | ไม่มีการเปลี่ยน (idempotent) |
| `newSave` | flag = 1 · `jobTree` ที่ใส่เองไม่โดนล้าง |
| `job = 'archer'` | ไม่แตะ `jobTree` · flag = 1 |
| Mobster (`job:'thief', job2:'mobster'`, `job2Tree`, `job2Talents`, `job2Points`) | `job2*` **เท่าเดิมทุกค่า** · Class 1 reset |
| Rogue (`job2:'rogue'`) | `job2Tree` เท่าเดิม (P3) |
| `crossSpent.j2In1 = 4` · total 10 | `skillPoints += 6` · `job2Points += 4` · `crossSpent.j2In1 = 0` |
| ข้อมูลเสีย: `jobTree: null`, `thiefRogueRework: 'x'`, `jobTalents: undefined`, `skillPoints: undefined` | ไม่ throw · ผลลัพธ์ finite |
| `load()` end-to-end ด้วย `localStorage` mock (แพทเทิร์น `tests/beastmaster-rework.test.ts:35`) | migrate หนึ่งครั้ง |

**Verify:** `npm run typecheck` · `node tools/test.mjs thief-p2a` · `node tools/test.mjs node-stretch` · `node tools/test.mjs sage-rework` · `node tools/test.mjs beastmaster-rework`

---

### T9 — `tools/bot.cjs` id sync + regression ปิดงาน

**Commit:** `chore(bot): sync thief web ids and rework flag`

| ไฟล์:บรรทัด | แก้อะไร |
|---|---|
| `tools/bot.cjs:55` | `Object.assign(save, { web: 1, stretch: 1, bmRework: 2, … })` → เพิ่ม `thiefRogueRework: 1` ❗ **ถ้าลืม**: บอทโหลด save แล้ว `load()` ล้าง `jobTree` ที่บอทตั้ง (เพราะ `job === 'thief'`) → บอท Thief/Rogue/Mobster เล่นโดยไม่มีแต้มเลย · คอมเมนต์ท้ายบรรทัด "stretch / bmRework / thiefRogueRework: skip migrations" |
| `tools/bot.cjs:54` · `:75` (คอมเมนต์ตัวอย่าง `TREEX` / `TAL`) | ตัวอย่างใช้ id ใหม่ เช่น `TREEX='{"thief_core1":5,"thief_a1":5}'` · `TAL='{"2":{"id":"th_t2c","rank":2}}'` (`:75` เดิมอ้าง `th_t1c` ยังมีอยู่ ✅ แค่ไม่ใช่ของ P2a) |
| `tools/bot.cjs:86` | **ไม่แตะ** `rogue` preset (`rg_k2`/`rg_k3`) — เป็นของ P3 (R4.3 ข้อ 5) |
| preset Thief | วันนี้ bot ไม่มี preset node ของ Thief (มีแค่ `*_s1p`/`*_ultp` `:51` + `TREEX`) → **ไม่เพิ่ม preset** (เกินสโคป) ใช้ `TREEX` |

**Regression ปิด slice (ทุกอันต้องผ่าน):**
`npm run typecheck` · `node tools/test.mjs thief-p2a` · `node tools/test.mjs node-stretch` · `node tools/test.mjs admin-model` · `node tools/test.mjs skill-registry` · `node tools/test.mjs talent-text` · `node tools/test.mjs thief-ult-agi` · `node tools/test.mjs job2-talents` · `node tools/test.mjs sage-rework` · `node tools/test.mjs beastmaster-rework` · `node tools/test.mjs crit-split` · `node tools/test.mjs skill-hud`
(ห้าม `npm test` เต็มชุด) · `admin-engine` ดู §3 ข้อ 6

---

## 2) Interfaces

### 2.1 P2a **ต้องการ** จาก slice ก่อนหน้า
ไม่มี — P2a เป็น slice แรก (ฐานคือ `claude/thief-ult-agi-ratio`: `thiefUltAgiBonus` `hero-stats.ts:286`, `debtBursting` `BattleScene.ts:1681`, `backStabbing`, `thiefAuto = 1` `skill-math.ts:84`)

### 2.2 P2a **ให้** slice ถัดไป

| สิ่งที่สร้าง | ที่อยู่ | ผู้ใช้ | หมายเหตุ |
|---|---|---|---|
| `thiefRogueRework` + `THIEF_REWORK_VER` + `migrateThiefRogueRework` | `save.ts` | P2c/P2d (ถ้าแยก release) · **P3** (Rogue reset) | เพิ่ม `if (v < N)` ท่อนใหม่ + bump const |
| `Stats` keys 14 ตัว | `stats.ts` | P2b ใช้ `thStackCritTal`/`thStackCrit` (นับ Wound) | |
| `KIT` 19 keys · `thiefKindsAt` ใช้ร่วม `thief_c1` · `th_t3a` · `th_t4a` | `skill-math.ts` | P2c, P2d | อย่าเพิ่มซ้ำ |
| `statusKinds(m)` / `stackCountOf(m)` | BattleScene (T6) | **P2b ต้องเติม** `Wound` / `Exposed` (+ `m.wound` + `m.exposed` ที่ P2b สร้าง) | วันนี้นับเฉพาะ `poison` `chill` |
| `inShroud()` | BattleScene (T6) | **P2b** เปลี่ยนเป็น `shroudTurns > 0` (ม่านควัน) | วันนี้ return `false` → ราชันย์โลหิตเปิดเฉพาะ HP < 45% |
| `cutUltCd(n)` | BattleScene (T7) | **P2c** ใส่ Global Ult CD cap (`KIT.thiefUltCdCutCap` / `thiefUltCdFloor`) | `th_t2a` เรียกผ่านตัวนี้เท่านั้น |
| `thWeaveDmg` ใน basic bracket (`srcMul` `:4736`) | BattleScene | R4.6 B4 | อย่าดึงไปรวม B1 |
| `plagueBursting` / Plague Burst ใน `killMon` | BattleScene (T5) | **P2d** (`thief_v2` Contaminate: อย่าให้ chain ซ้อนกับ Plague) | ใช้ guard เดียวกัน |
| `thief_core1` `s2Gate`, `thief_b1/b2/b4`, `th_t1*`, `th_t3*`, `th_t4*` | `trees/thief.ts` | P2b (t1c, t4a), P2c (b1–b4, t1a/b, t3, t4c), P2d (t4b) | **P2a ไม่แตะ** — เก่าอยู่จนกว่า slice เจ้าของจะเขียนทับ |
| `th_t2b` ยังไม่มีส่วน `magPen` (Exposed) | `trees/thief.ts` | **P2b/P2d** เติม `thExposedMagPen` ใน `mod` + key ใน `Stats`/`PLAYER` | key นี้ **P2a ไม่สร้าง** |
| `thExecute` (`BattleScene.ts:1247`) | ยังอยู่ ไม่มีแหล่งแล้ว | **P2c** (B3: ลบหรือย้าย) | P2a ไม่แตะ |

### 2.3 P2a **ไม่ทำ** (กันซ้ำซ้อนกับ slice อื่น)
- `Exposed` / `Wound` / `Blind` / `woundHealCut` / `takenAmp()` (B1) / `healCut` → **P2b**
- `thGhostShroud` / `onShroudBreak()` / Ult cap / `thief_b*` `thief_u*` → **P2c**
- `thief_v*` / Venom Melt / `wisPoisonCap` / `เลือดพิษ` `thPoisonLeechLv` / Perfect Agony → **P2d**
- Rogue web / Plagiarism → **P3/P4**
- การวัด `JOB2_K.mobster` / `CLASS_K.thief` (`power.ts:25,32`) → หลัง P2d (ต้องมีครบทั้งเว็บถึงวัดได้)

---

## 3) Risks

| # | ความเสี่ยง | ระดับ | มาตรการ / หลักฐาน |
|---|---|---|---|
| 1 | **Mobster เสียของ** — Mobster ยืนบน web Thief; migration ล้าง `jobTree` (flat crit/critMul/lifesteal/HP/flee หายไป) · `แทงพิษ` 40→45 และมี weave → จังหวะ Energy เปลี่ยน | กลาง | ตั้งใจ (path A R4.3 ข้อ 3) · `job2Tree/job2Talents/job2Points` ไม่ถูกแตะ (เทสต์ T8) · `ทวงหนี้` ยังคง `debtBursting` (`:2257`) ครอบทั้ง spread **และ** Plague Burst ใหม่ · `debt(m)` ไม่แตะ (6 ดีบัฟ) · **ไม่ได้วัด K ใน P2a** → บันทึกใน PR ว่า `JOB2_K.mobster` ยังไม่วัด |
| 2 | **Save safety** — flag เป็นตัวเลข optional · migration idempotent · ไม่ throw กับ JSON เสีย · refund ผ่าน `resetTree` เท่านั้น | ต่ำ | เทสต์ T8 ครอบ null/ชนิดผิด · ลำดับ `load()` หลัง `migrateNodeStretch` · id ที่ถูกลบ/ใช้ซ้ำ (`thief_b3` `thief_c2–c4`) ปลอดภัยเพราะ jobTree ถูกล้างก่อนใช้ความหมายใหม่ |
| 3 | **ความหมาย id ซ้ำ** ระหว่าง slice: ผู้เล่นที่ migrate ที่ P2a แล้วใช้ `thief_b1/b2/b4` (เก่า) จะเห็นความหมายเปลี่ยนตอน P2c ลง | กลาง | ถ้า 4 slice ออกพร้อมกัน → ไม่เป็นปัญหา · ถ้าแยก → bump `THIEF_REWORK_VER` ที่ slice ที่เปลี่ยนความหมายอีก (§4) |
| 4 | **`stretchNode()` / `INT_FIELDS` / `tidy()`** | สูง | `thief_a1` (`poison`) `thief_a3` (`poisonCap`) เป็น whole → `desc` ต้องไม่มี `\d+\.\d+` และต้องใช้ `Math.round` ในข้อความ (`tree.ts:119-123`) · `mod(lv)` ใช้ `k × lv` ล้วน **ห้าม `base + step×lv`** (§2.3 กฎ 3) · `thief_c2` ใช้ `0.00625×lv` ไม่มี base ✅ · เทสต์ T3 ข้อ 3 จับ regex ทุกเลเวล · `thStrikePoison:1` / `thPlagueDeath:1` เป็น flag ไม่อยู่ใน `INT_FIELDS` → ไม่ถูก round → ✅ · **ไม่เพิ่ม key เข้า `INT_FIELDS`** (ไม่จำเป็นใน P2a; ถ้าเพิ่ม `thCritPoison` เข้าจะเปลี่ยนพฤติกรรม stretch ของ `thief_c2` → ห้าม) |
| 5 | **Damage-amp bracket R4.6** | กลาง | P2a **ไม่เพิ่ม amp แบบคูณใหม่เลย**: `thWeaveDmg` → B4 บวกใน basic bracket (`:4736`) ✅ · `vsPoison` (a2) อยู่ B2 ใต้ `OUTSIDE_CAP` เดิม ✅ · `thPoisonPen` เป็น pen ไม่ใช่ amp (ผ่าน `STAT_CAPS.physPen`) · Plague Burst `dot=true` ได้ `poisonAmp` ตามที่ R4.6.1 บันทึกไว้แล้ว · `thCondLeech` เป็น leech ไม่ใช่ดาเมจ |
| 6 | **Test contracts** | สูง | (a) `job2-talents` `v > 0` ตรวจแค่ `TALENTS2` (`tests/job2-talents.test.ts:21`) — talent Thief ไม่ถูกจับ → เทสต์ใหม่ของ P2a ตรวจเอง (T3 ข้อ 6) · (b) `skill-registry` numeric leaves: ทุก ref ใน `SKILL_LAYOUT` ต้องอ่านเป็น number + default อยู่ในช่วง + มีแถวใน admin fields (`tests/skill-registry.test.ts:19-28`) → ต้องลง `KIT_INTS/KIT_NUMS` ครบ (T1) · (c) **`admin-engine` พังอยู่แล้ว 2 เทสต์** (`kit.mageCore.regenStep` fallback · `kit.mageCore` group title) — ไม่ใช่ของ P2a · เทสต์ explain **หยุดที่ key แรกที่พัง** → key ใหม่ของ Thief ถูกบัง → ต้องตรวจป้าย `KIT_EXPLAIN` ด้วยสคริปต์เองทุก key (T1 verify) · (d) `admin-model` อ้างชื่อ node ที่ถูกลบ (`มีดคู่` `คมเลือด` `จุดบอด`) → T3 ต้องแก้ · (e) `node-stretch` 5/5 ผ่านก่อนเริ่ม |
| 7 | **BattleScene ไม่มี harness เทสต์** — ตรรกะใน T4–T7 ทดสอบตรงไม่ได้ | กลาง | ดึงสูตรเป็น pure helper (T2) + จำลอง Energy loop · ผู้เขียนโค้ดต้อง `grep` ว่าไม่มีเลขใหม่ใน BattleScene: `git diff src/scenes/BattleScene.ts \| grep -E '^\+.*[^A-Za-z_.][0-9]+\.[0-9]+'` (ยกเว้นคอมเมนต์) |
| 8 | **`autoCost` floor** กระทบ Rogue/Mobster (ใช้ `JOBS.thief`) และ `skill-hud` (`:6232`) | ต่ำ | เทสต์ T3 ข้อ 7 · live-config patch ที่ override `job.thief.auto.cost` เดิม (=40) จะค้าง — ไม่ต้อง bump `CONFIG_SCHEMA` (ค่าเปลี่ยน ไม่ใช่ความหมาย) |
| 9 | **Chain Plague Burst** (burst ฆ่าตัวอื่นที่พิษ ≥ 10 → burst ต่อ) | กลาง | flag `plagueBursting` กัน chain · ยังให้ spread ตามปกติ · ถ้าเจ้าของอยากให้ chain → ปรับ playtest |
| 10 | **ราชันย์โลหิต + gear `bloodKing`** | ต่ำ | ใช้ `max()` ไม่ซ้อน (ตีความ "แทนที่และไม่ซ้อน") — ถ้าเจ้าของอยากให้ `thBloodKing` แทนที่เด็ดขาด (1.75 < 2) แจ้งตอนรีวิว |
| 11 | **เลข `0.4` lifesteal cap** อยู่ใน `hero-stats.ts:486` ฝังตรง ๆ | ต่ำ | T6 export เป็นค่าคงที่เดียว (`STAT_CAPS`-style) แล้ว import ใน BattleScene — ห้ามก๊อปเลข |

---

## 4) Questions for owner (1 ข้อ)

**Q1 — ปล่อย P2a–P2d (และ P3) เป็นรอบเดียวหรือแยกรอบ?**
- ผมออกแบบ `thiefRogueRework` เป็น **เลขเวอร์ชัน** (P2a = 1) แล้วถ้าทั้ง 4 slice ออกพร้อมกัน → ผู้เล่นรีเซ็ต **ครั้งเดียว** · ถ้า P2c/P2d ปล่อยแยกหลังจากผู้เล่นเริ่มใช้ P2a → ต้อง bump เป็น 2, 3 (ผู้เล่นรีเซ็ตซ้ำ เพราะ `thief_b*` `thief_u*` ใช้ id เดิมความหมายใหม่)
- **ค่า default ที่ผมสมมติ:** รอบเดียว (Beta ตามหัวเอกสาร Rev 3) → ไม่ bump ใน P2b–P2d · ถ้าเจ้าของตอบว่าแยกรอบ ให้ P2c/P2d เพิ่ม `if (v < N)` ท่อนใหม่ (โครงรองรับแล้ว)

### การตัดสินใจที่ผมทำเองระหว่างเขียน (แก้ได้ตอนรีวิว ไม่ block)
1. `thDodgeCdCut` ไป talent `mod` ไม่ใช่ KIT (เลข "1 เทิร์น" ไม่อยู่ใน R4.7.2 · ตาม precedent `thDodgeShield`)
2. เลือกลด CD "ทักษะ 2 ก่อนถ้า CD เหลือ ≥ Ult · ไม่งั้น Ult" — Rev 3 บอกแค่ "หรือ"
3. `th_t2b` ส่วน `magPen` เลื่อนไป P2b/P2d (ต้องมี Exposed + `thief_v1` ก่อน)
4. `thiefStrikeRes` (D.Strike +4 Energy, §2.4 Gate) เป็น Skill-2 gate ที่ scope P2b ไม่ได้ระบุ → ผมรวมไว้ใน P2a (T4) เพราะอยู่ใน `doubleAttack` เดียวกับ s1Weave · ถ้า P2b spec ก็อ้างเหมือนกัน ให้ตัดออกจากฝั่ง P2b
