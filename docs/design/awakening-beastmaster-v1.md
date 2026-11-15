# อาชีพขั้น 3 "Awakening": 🪶 Ranger (Beastmaster Awakening) — v1

> **Status**: Frozen Architecture & Balance Contract (Ready for Phase 2 Implementation)
> **Parent (Job 2)**: `beastmaster` (🐾 Beastmaster, Base Job `archer`)
> **Hybrid Sibling (Job 2)**: `innovator` (🔧 Innovator — Tier 1–2 nodes)
> **Awakened Job 3**: `ranger` (`🪶 Ranger`, Node Prefix `'rn'`)
> **Stack**: TypeScript (strict, zero `any`) + Phaser 3.90.0 + Vite singlefile (`AGENTS.md`)
> **Prerequisite**: Beastmaster Rework v2.1 (`docs/design/beastmaster-tree-rework-spec.md`)

---

## 1. ภาพรวมและอัตลักษณ์ (Identity & Class Rules)

**🪶 Ranger** คือร่างตื่นรู้ (Awakening 3rd Job) ของ **Beastmaster** ต่อยอดจากจุดยืนจอมทัพฝูงสัตว์ 3 ตัว (`🦅 Hawk` / `🐗 Boar` / `🐺 Wolf`) และระบบ Partner Stance (`save.pet`) โดยผสาน 2 แกนหลักเข้าด้วยกัน:
1. **RO Falconer + Warg Master**: เสริมพลังสัตว์ทุกตัวพร้อมเพดาน Auto-Blitz Beat (`Camouflage`), ยอดทักษะ 3 (`สั่งลุย`) แตกแขนงเป็น **2 รูปแบบ** เลือกสลับฟรีในเมือง (**Variant A: Arrow Storm** สำหรับสายนก/คุมฝูงกว้าง vs **Variant B: Aimed Warg** สำหรับสายหมาป่า/เจาะเกราะบอส) และยังมี **Boar Shield** + พลังฝูงครบทั้ง 3 ตัวเหมือนเดิม
2. **Primal Stampede (Ult วิวัฒน์ 2)**: อัปเกรด `🐾 Primeval Awakening` ให้ปล่อยฝูงสัตว์ **โจมตีประสาน 3 สัตว์พร้อมกัน** ทั้งจังหวะร่ายเปิดฉาก (เพิ่มขึ้นตามโหนด `★` และสเตตัส `j3GospelField`) และจังหวะปิดฉาก `endAwakening()`

### 1.1 กฎการปลดล็อก & ระบบพื้นฐาน (`JOB3_RULES`)
ใช้กฎเดียวกับ `paladin`, `lordknight`, `champion` ใน `src/data/jobs3.ts` และ `src/save.ts` ทุกประการ:
- **เงื่อนไขตื่นรู้ (`job3Ready`)**: `job2 === 'beastmaster'`, `job2Level >= 50`, เคลียร์ดันเจี้ยน `d10` (`clearsBy.d10 > 0`), และผ่าน **⚔️ Master Trial** (`d10` โหมด 🔥 Hard / 😈 Hell ตอน Job2 Lv 50 — นับย้อนหลังผ่าน `trialPassed`)
- **Level & Points**: `Job3 Lv 1–30` (`JOB3_RULES.maxJobLevel = 30`), ได้ `1` แต้มใยชั้น 3 ต่อ 1 เลเวล (`JOB3_POINTS_MAX = 29`)
- **ต้นทุน**: การเปลี่ยนอาชีพเป็น Ranger **ฟรี (0 เพชร)** · สลับ Variant A ↔ B **ฟรีตลอดเวลาในเมือง** · สลับสาย Pure ↔ Hybrid **ฟรีสัปดาห์ละ 1 ครั้ง** (`freeSwapDays: 7`) หรือ `30 💎` (`pathSwapGems: 30`)
- **Non-Destructive Layering**: ใยชั้น 1 (`archer`), ใยชั้น 2 (`beastmaster` 20 โหนด + 12 ทาเลนต์), Partner Stance (`save.pet`), และระบบ RO Falconer (`FALCON_MIX 85:15`) คงอยู่ครบทั้งหมด; หากเปลี่ยน `job2` ไปสายอื่น `save.job3` จะพักไว้ (`activeJob3(s) === undefined`) และคืนสถานะเดิมทันทีเมื่อกลับมาเป็น `beastmaster`

---

## 2. ข้อมูลหลัก `JOB3.ranger` และ Signature Passive

### 2.1 `src/data/jobs3.ts` (`JOB3.ranger`)
```ts
export type Job3Id = 'paladin' | 'lordknight' | 'champion' | 'ranger'
```
- `id`: `'ranger'`
- `parent`: `'beastmaster'`
- `sibling`: `'innovator'`
- `name`: `'Ranger'`
- `icon`: `'🪶'`
- `blurb`: `'Beastmaster ที่ตื่นรู้ · ฝูงสัตว์ทรงพลังยิ่งขึ้น · สั่งลุยแตกแขนง 2 สาย · ประสานพรานกับเหยี่ยวและหมาป่าไร้เทียมทาน'`
- `focus`: `'จ้าวฝูงพายุ · Primal Stampede'`
- `ultName`: `'Primal Stampede'`
- `ultDesc`: `'Primeval Awakening ปลดปล่อยฝูงสัตว์โจมตีประสานตอนเริ่มและจบ Awakening (+1 รอบจาก ★)'`
- `rootDesc`: `'ฝูงพายุชั้น 3 แรง'`
- `signature`:
  - `icon`: `'🎭'`
  - `name`: `'Camouflage'`
  - `desc`: `'สัตว์ทุกตัวแรง +15% · คริ +4% · FLEE +12 · เพดาน Blitz Beat +10%'`
- `variants`:
  - `a`: `{ name: 'Arrow Storm', icon: '🌩️', desc: 'สั่งลุยยิงฝนธนูใส่ทุกตัว + เหยี่ยว Blitz Storm แปะ 🏷️ + โล่หมูป่า + เรียกฝูง · แรงขึ้นตามแต้มสาย 🦅 ฟ้า' }`
  - `b`: `{ name: 'Aimed Warg', icon: '🎯', desc: 'สั่งลุยยิงเจาะเกราะ 50% ใส่ตัวหลัก (บอสก่อน) + หมาป่าขย้ำ Bleed + โล่หมูป่า · แรงขึ้นตามแต้มสาย 🐺 เขี้ยว' }`

### 2.2 Signature Passive: `🎭 Camouflage`
เมื่อ `activeJob3(s) === 'ranger'`:
1. **`st.j3Rn = 1`**
2. **All-Pet Resonance**: `st.j2PetPow += KIT3.ranger.petPowAdd` (`+0.15`, เพิ่มพลังสัตว์ทุกตัว +15%)
3. **Ranger Critical Eye**: `st.crit += KIT3.ranger.critAdd` (`+0.04`, เพิ่มอัตราคริ +4% ช่วยกระตุ้น `bm_s4` ★ พรานแห่งป่า)
4. **Camouflage Evasion**: `st.flee += KIT3.ranger.fleeAdd` (`+12` FLEE)
5. **Falcon Mastery Cap (`src/battle/allies.ts` → `hawkChance`)**: ขยายเพดานโอกาสโฉบ Blitz Beat อีก `+0.10` (`KIT3.ranger.hawkCapAdd`):
   - ปกติ: `60% → 70%`
   - 🦅 Skyhunter Stance (`save.pet === 'hawk'`): `75% → 85%`

---

## 3. สกิลตื่นรู้: ทักษะ 3 Variants & Ult วิวัฒน์ 2

### 3.1 ทักษะ 3 (`📯 สั่งลุย` / `petCommand`) — เลือก 1 จาก 2 รูปแบบ
เมื่อ `this.st.j3Rn > 0`, `petCommand(pow)` เรียก `rangerVariant(pow)` โดย:
- `base = pow * (1 + this.st.j3VarMul)` โดย `st.j3VarMul = min(V.cap, V.per * branchPts(job2Tree, V.branch))` (`+2%` ต่อแต้ม สูงสุด `+20%` ที่ 10 แต้ม)
- `k = base * packScale` (`packPow * (1 + st.j2PetPow) * (st.j2Pack3 > 0 ? 1 + B.tree.pack3Pow : 1)`)
- **Heir Unlock**: `heirOn = this.st.j3Heir > 0 && branchPts(save().job2Tree, V.branch) >= KIT3.ranger.heirNeed` (`≥ 6` แต้ม)

#### Variant A (`job3Var === 'a'`): `🌩️ Arrow Storm`
- **สายที่อ่าน (`V.branch`)**: `bm_h` (`🦅 ฟ้า`) · `per = 0.02`, `cap = 0.20`
- **ลำดับการทำงาน**:
  1. **Arrow Storm Volley (Hero Physical AoE)**: ยิงฝนธนู (`arrowRainFx`) ใส่ศัตรูที่ยังมีชีวิต **ทุกตัว** ด้วยตัวคูณ `V.arrowMul * base * (1 + this.st.pskill)` (ติดคริได้ตามปกติ, ได้รับโบนัส `🏷️ Prey Mark`)
  2. **🦅 เหยี่ยวโฉบประสาน**: โจมตี `KIT2.beastmaster.cmdHawkHits + this.st.j2CmdHawkAdd` ครั้ง (`falconMul(st) * k`, `sureHit = true`, `pierce = 1`, `mark: true`)
  3. **👑 สืบสาน (`heirOn`, `bm_h >= 6`)**: ปล่อย **AoE Razor Gust** โฉบใส่ศัตรูที่ยังมีชีวิต **ทุกตัว** อีก 1 ครั้ง (`falconMul(st) * k`, `sureHit = true`, `pierce = 1`, `mark: true`) และแปะ **🙈 Blind `V.blindTurns` (2 เทิร์น)** ทุกตัว
  4. **🐗 หมูป่ากางโล่**: มอบโล่ฮีโร่ `this.st.maxHp * KIT2.beastmaster.cmdBoarShield * k` (สเกลตาม `shieldAmp` หากอยู่ใน Boar Stance)
  5. **🐺 เรียกฝูงหมาป่า**: เรียก `ALLIES.pack` จำนวน `KIT2.beastmaster.cmdPack` (2 ตัว) นาน `cmdPackTurns` เทิร์น ที่พลัง `cmdPackPow * k`

#### Variant B (`job3Var === 'b'`): `🎯 Aimed Warg`
- **สายที่อ่าน (`V.branch`)**: `bm_w` (`🐺 เขี้ยว`) · `per = 0.02`, `cap = 0.20`
- **เป้าหมายหลัก**: `t = this.bossTarget() ?? this.front()[0]` (เล็งบอส/มินิบอสก่อนเสมอ)
- **ลำดับการทำงาน**:
  1. **Aimed Bolt (Piercing Shot)**: ยิงศรเล็งจุดตาย (`pierceShotFx` / `arrowImpactFx`) ใส่ `t` ด้วยตัวคูณ `V.boltMul * base * (1 + this.st.pskill)` โดย **ข้าม DEF ศัตรู 50%** (`pierce = V.pierce = 0.50`) — หาก **`heirOn` (`bm_w >= 6`)** ยิงซ้ำ **2 นัด** (`shots = 2`)
  2. **🐺 Warg Pounce**: หมาป่าพุ่งขย้ำ `t` (`V.wargMul * k` P.ATK) พร้อมแปะ **`+V.bleedAdd` (+3 stacks) Bleed** — หาก **`heirOn`** การขย้ำนี้ติด **คริ 100% (`forceCrit = true`)** และฮีลฮีโร่ + หมูป่า `KIT2.beastmaster.crunchHeal` (`10%` ของดาเมจที่ทำได้)
  3. **🦅 เหยี่ยวชี้เป้า**: เหยี่ยวโฉบใส่ `t` 1 ครั้ง (`falconMul(st) * k`, `sureHit = true`, `pierce = 1`, `mark: true`) เพื่อแปะ/ต่อเวลา `🏷️ Prey Mark`
  4. **🐗 หมูป่าหนุนหลัง**: มอบโล่ฮีโร่ `this.st.maxHp * KIT2.beastmaster.cmdBoarShield * k` (และหาก `this.pet === 'boar'` ผลักเกจ `t.gauge -= V.boarPush` `-20` หน่วย)

---

### 3.2 Ult วิวัฒน์ 2: `✨ Primal Stampede` (อัปเกรด `🐾 Primeval Awakening`)
เมื่อ `this.st.j3Rn > 0`, ทั้ง `primevalAwakening` (ตอนเริ่ม) และ `endAwakening` (ตอนจบ) จะถูกอัปเกรด:

1. **เปิดฉาก `primevalAwakening(ultPow)`**:
   - คงผลเดิมครบถ้วน (Cleanse ดีบัฟฮีโร่, ชุบ/ฟื้นเลือดหมูป่าเต็ม 100%, Stun ศัตรูทุกตัว / บอสผลักเกจ, ตั้งสถานะ `awakenTurns = 3 + j2UltAwakenAdd` และ `awakenUltPow = 1 + ult2Pow`)
   - จากนั้นปลดปล่อย **`Primal Stampede` จำนวน `KIT3.ranger.ultVolleys + this.st.j3GospelField` รอบ** (เริ่มต้น `1` รอบ, มี `rn_g4` ★ เป็น `2` รอบ, เพิ่มได้อีกจากอุปกรณ์ D10)
2. **โครงสร้าง 1 รอบ `runStampedeVolley()`** (ตัวคูณร่วม `k3 = (1 + this.st.u3Pow) * this.awakenUltPow`, ทำงานภายใต้ `withSrc('ult', ...)` + `stampedeFx`):
   - **🦅 Hawk Blitz**: โฉบโจมตีแบบสุ่มไม่ซ้ำสูงสุด `ultHawkTargets` (2) เป้าหมาย ด้วย `falconMul(st) * ultHawkMul * k3` (`sureHit = true`, `pierce = 1`, แปะ `🏷️ Prey Mark`)
   - **🐗 Boar Stampede**: พุ่งชน **ศัตรูที่ยังมีชีวิตทุกตัว** ด้วย `ultBoarMul * k3 * (1 + st.j2BoarMul)` (กายภาพ)
   - **🐺 Wolf Warg Strike**: ขย้ำเป้าหมายหลัก (`bossTarget() ?? front()[0]`) แบบ **คริ 100% (`forceCrit = true`)** ด้วย `ultWolfMul * k3 * (1 + st.j2WolfMul)` + แปะ **`+ultWolfBleed` (+2 stacks) Bleed**
   - **💚 `rn_g1` / `j3GospelHeal`**: ถ้าระดับ `st.j3GospelHeal > 0`, ฮีล **ฮีโร่** `st.maxHp * st.j3GospelHeal` และฮีล **หมูป่า** สัดส่วนเดียวกัน (`healBoar(st.j3GospelHeal)`) ต่อรอบ
3. **ระหว่าง Awakening (`awakenTurns > 0`)**:
   - **🪶 `rn_g3` / `j2Spiral`**: ใน `BattleScene.strike()` การโจมตีกายภาพที่ไม่ติดคริของฮีโร่และสัตว์ระหว่าง Awakening (รวมถึง Stampede) ได้รับโบนัสทะลุ DEF เพิ่ม `awPierce = this.st.j2Spiral` (`+10% / +20%` จาก `rn_g3`)
4. **ปิดฉาก `endAwakening()`**:
   - ก่อนมอบโล่ปิดฉาก, ปล่อย **Finale Stampede 1 รอบ (`runStampedeVolley()`)** แบบ synchronous พร้อม `stampedeFx`
   - มอบ Awakening End Shield ที่คูณรวม `this.awakenUltPow` (`*(1 + st.u3Pow)` หากเลือก หรือคงสูตร `awakenUltPow` เดิมแล้วให้ `u3Pow` เพิ่มพลัง Stampede 100% ตามมาตรฐาน Job3 เพื่อไม่ให้ End Shield เกินสมดุล — ล็อกให้ `End Shield` คงสูตร Rework v2.1 `max(maxHp * ultEndShieldMin, awakenAbsorbed * ultEndShield) * awakenUltPow`)
   - **🌅 `rn_g2` / `j3AfterBless`**: ถ้า `st.j3AfterBless > 0`, เปิดบัฟ `this.j3Bless = KIT3.common.afterTurns` (`2` เทิร์นฮีโร่) เพิ่มดาเมจทั้งหมดของ **ฮีโร่และสัตว์ทุกตัว** (`BattleScene.strike` บรรทัด `1013` คูณ `1 + st.j3AfterBless` ให้ทุก hit ทั้งฮีโร่และสัตว์โดยอัตโนมัติ!)

---

## 4. ผังสกิลชั้น 3 (`src/data/trees3/ranger.ts`) & Hybrid Path

### 4.1 โครงสร้างใยชั้น 3 (Pure: 1 Root + 12 Nodes)
ใน `src/data/tree.ts` เมื่อ `JOB3_TREES.ranger` ถูกประกอบ:
- **คอลัมน์ Root อัตโนมัติ (`ranger_u3`)**:
  - `ranger_u3p` (`tier: 0, kind: 'pow3', max: 5`): `✨ Primal Stampede` — `{ u3Pow: 0.12 * lv }` (`+12%` ถึง `+60%`)
  - *(หมายเหตุ UI: `web-tier3.ts` วาง `<j3>_u3` ที่คอลัมน์ index 2 ในโหมด Pure: `rn_l`, `rn_g`, `ranger_u3`, `rn_r`)*

| Branch | Node ID | Tier | Icon | ชื่อโหนด | Max | Effect & Stat Modifiers |
|---|---|---|---|---|---|---|
| **`rn_l` 🦅 ตำนาน** | `rn_l1` | 1 | `🐾` | สายใยบรรพชน | 3 | Awakening / Primal Stampede `+0.5%/Lv` ต่อแต้มสาย `🤝 ผูกพัน (bm_k)` สูงสุด `+15%` → `{ j3LegCross: 0.005 * lv }` |
| *(อ่านแต้มจากใย Beastmaster)* | `rn_l2` | 2 | `🐗` | หนังศิลาบรรพชน | 3 | หมูป่ารับดาเมจแทน `+0.2%/Lv` ต่อแต้มสาย `🐗 ป่า (bm_b)` สูงสุด `+6%` → `{ j3LegGuard: 0.002 * lv }` |
| | `rn_l3` | 3 | `🌿` | สัญชาตญาณบรรพชน | 3 | HP สูงสุด `+0.3%/Lv` ต่อแต้มสาย `🌿 สัญชาตญาณ (bm_s)` สูงสุด `+9%` → `{ j3LegHp: 0.003 * lv }` |
| | `rn_l4` ★ | 4 | `👑` | สืบสาน | 1 | สายของ Variant ≥ `6` แต้ม (`bm_h` หรือ `bm_w`): 🌩️ ฝนธนูเพิ่มลมกรด `🙈` ทุกตัว · 🎯 Aimed ยิง 2 นัด + หมาป่าขย้ำคริ 100% → `{ j3Heir: 1 }` |
| **`rn_g` 🐾 พายุฝูง** | `rn_g1` | 1 | `💚` | สายเลือดผสาน | 3 | ทุกรอบ Primal Stampede ฮีลฮีโร่และหมูป่า `lv%` Max HP → `{ j3GospelHeal: 0.01 * lv }` |
| *(Ult วิวัฒน์ 2)* | `rn_g2` | 2 | `🌅` | พรหลังศึก | 3 | Awakening จบ → `2` เทิร์น ฮีโร่และสัตว์แรง `+(lv * 5)%` → `{ j3AfterBless: 0.05 * lv }` |
| | `rn_g3` | 3 | `🪶` | ศรทะลวงวิญญาณ | 2 | ระหว่าง Awakening + Stampede ข้าม DEF มอนเพิ่ม `lv * 10%` → `{ j2Spiral: 0.1 * lv }` |
| | `rn_g4` ★ | 4 | `🌪️` | พายุสรรพสัตว์ | 1 | Primal Stampede ปลดปล่อยฝูงสัตว์เพิ่มอีก `+1` รอบ → `{ j3GospelField: 1 }` |
| **`rn_r` 🎭 จ้าวพนา** | `rn_r1` | 1 | `🏹` | ซุ่มยิงเปิดฉาก | 3 | ยิงแรกของทุกเวฟแรง `+(lv * 20)%` → `{ j2Charge: 0.2 * lv }` |
| *(ยุทธวิธี & ป้องกัน)* | `rn_r2` | 2 | `🤝` | Banding | 3 | ดาเมจเข้า `−(lv * 2)%` ต่อมอนที่ยังอยู่ (นับสูงสุด `5` ตัว = `-30%` ที่ Lv 3) → `{ j3Banding: 0.02 * lv }` |
| | `rn_r3` | 3 | `💥` | Arrow Ambush | 3 | เทิร์นแรกของไฟต์ ยิงฝูงทุกตัว `P.ATK × (0.4 * lv)` + เกราะแตก `1` เทิร์น → `{ j3EarthDrive: 0.4 * lv }` |
| | `rn_r4` ★ | 4 | `🎭` | พรางตัว (Camouflage) | 1 | `1` ครั้ง/ไฟต์เมื่อ `HP < 30%`: `3` เทิร์น หลบหลีกพิเศษ `50%` (ไม่สน `trueSight` แบบกายภาพ) + หลบฮีล `3%` HP → `{ j3Inspire: 1 }` |

**ตรวจสอบงบประมาณแต้ม Pure**: `5 (u3p) + 10 (rn_l) + 9 (rn_g) + 10 (rn_r) = 34` แต้มรวม มีให้ลง `29` แต้ม (`Lv 30`) และเลือก `★` ได้สูงสุด `2` ดวง (`TREE_RULES.capstones = 2`) — เข้ากัน 100% กับ `Paladin`, `Lord Knight`, `Champion`

### 4.2 Hybrid Path (`sibling: 'innovator'`)
เมื่อเลือกสาย **Hybrid (`job3Path === 'hybrid'`)**:
- เปิด `rn_l1..2`, `rn_g1..2`, `rn_r1..2`, `ranger_u3p` และยืมใยชั้น 2 Tier 1–2 ของ **🔧 Innovator** (`in_t1`, `in_t2`, `in_g1`, `in_g2`, `in_r1`, `in_r2`):
  - `in_t1` (`ดินปืนเกรดดี`, stretched max 5): `j2TrapMul: +20%..+100%`
  - `in_t2` (`วางเพิ่ม`, stretched max 4): `j2Traps: +1..+2` กับดักต้นเวฟ
  - **Combat Hook บังคับใน `BattleScene.waveAllies()`**: เปลี่ยนจาก `if (this.j2?.id === 'innovator')` เป็น:
    ```ts
    const trapBase = this.j2?.id === 'innovator' ? KIT2.innovator.traps : 0
    for (let i = 0; i < trapBase + this.st.j2Traps; i++) {
      this.layTrap(TRAP_IDS[Phaser.Math.Between(0, TRAP_IDS.length - 1)])
    }
    ```
    เพื่อให้ **Ranger Trap Hybrid** วางกับดัก (Land Mine / Ankle Snare / Freezing Trap) ร่วมกับสัตว์ทั้ง 3 ตัวได้จริงทุกเวฟ! *(หมายเหตุ: `in_g` ของขวัญสุ่ม และ `in_r` หุ่นจิ๋ว ยังไม่มีตัวจุดชนวนใน Hybrid Tier 1–2 เพราะ Gadget Box และโรงงานถาวรอยู่นอกขอบเขต/Tier 4 ซึ่งสอดคล้องกับหลักการ Hybrid ของอาชีพอื่น เช่น LK ยืมได้เฉพาะพาสซีฟ/สแตตที่ทำงานได้)*

---

## 5. สมดุลคณิตศาสตร์และสูตรคำนวณ (RPG Balance & Power Math)

ตามแนวทาง `.agents/skills/rpg/SKILL.md`:
1. **Hero Power & `JOB3_K`**:
   - `powerParts` (`src/data/power.ts`) ไม่วัดพลังสัตว์เลี้ยง (`j2PetPow`, `j2HawkMul`, `j2WolfMul`, `j2BoarMul`), `ult2Pow`, และ `s3Pow` โดยตรง
   - ตั้งค่า **`JOB3_K.ranger = 1.15`** (เทียบเท่า `lordknight: 1.15` และ `champion: 1.15` สำหรับสายที่พลังแฝงอยู่นอก `powerParts`)
   - ที่ **Job3 Lv 1** (เพิ่งตื่นรู้): `sqrt(1.15) ≈ +7.24%` จาก `JOB3_K` + Signature `crit +4%, flee +12` (`~+3–4%`) → รวม Hero Power เพิ่มขึ้น **`~+10%`** (สอดคล้องกับเป้าหมาย `+8–11%` ของ `awakening-crusader-v1.md`) และสัตว์แรงขึ้นทันที `+15%`
   - ที่ **Job3 Lv 30** (29 แต้ม): ได้ `u3Pow +60%`, `leg` (`ult2Pow +15%`, `j2BoarShare +6%`, `maxHp +9%`), `j3VarMul +20%`, `j3Banding -30% dmg taken`, `j2Charge +60%`, `j3AfterBless +15%`, และ `j2Spiral +20% DEF pierce` → รวม Effective Combat Power พุ่งขึ้น **`+20–25%`** ใน D10 Hard/Hell และ Tower
2. **Legacy & Safety Caps**:
   - `leg.cross` (`bm_k`): `0.005 * 3 = 0.015`/pt → แตะเพดาน `0.15` ที่ `10` แต้มใน `bm_k` (เพดานstretch ของ `bm_k` คือ 16 แต้ม)
   - `leg.guard` (`bm_b`): `0.002 * 3 = 0.006`/pt → แตะเพดาน `0.06` ที่ `10` แต้มใน `bm_b` → ส่งเข้า **`st.j2BoarShare`** (`hero-stats.ts`) เพื่อไม่ให้ Archer เกิด `Auto Guard 🛡️ BLOCK!` แบบ Knight; ใน `src/battle/allies.ts` `guardHit` ให้จำกัดเพดาน `Math.min(0.80, share)` เมื่อไม่ได้อยู่ใน Awakening (ส่วน Awakening ใช้ `ultBoarShare = 0.70` คงเดิม)
   - `leg.hp` (`bm_s`): `0.003 * 3 = 0.009`/pt → แตะเพดาน `0.09` ที่ `10` แต้มใน `bm_s` → ส่งเข้า `j2pct.maxHp` (เพิ่มเลือดทั้งฮีโร่และหมูป่า!)
   - `varA` (`bm_h`): `0.02`/pt สูงสุด `0.20` (10 แต้มจากสูงสุด 12 แต้ม) · `heirNeed = 6`
   - `varB` (`bm_w`): `0.02`/pt สูงสุด `0.20` (10 แต้มจากสูงสุด 16 แต้ม) · `heirNeed = 6`
3. **ข้อควรระวัง Refinement Pool (ประสาน Rework v2.1)**:
   - ใน `src/data/refine.ts` บรรทัด `196`, `BASE_OFF.int` ปัจจุบันใส่ `'archer'` อยู่ (ทำให้ออฟ `+INT` สุ่มติดน้อย x0.25 สำหรับ Archer) — หาก Phase 1 ไม่ได้ปลดล็อกให้ Beastmaster/Ranger, แนะนำให้ Phase 2 ทบทวนการถอด `'archer'` หรือปรับน้ำหนักเฉพาะ `beastmaster`/`ranger` เพื่อให้สาย RO Falconer (`INT/LUK`) รีโรล `+INT` ได้เต็มน้ำหนัก (บันทึกไว้เป็น Tuning Note เพื่อไม่ให้กระทบสายยิงเพียวโดยไม่ตั้งใจ)

---

## 6. อุปกรณ์ D10, Uniques, Refine, Visuals & UI

### 6.1 D10 Class Craft Suite (`src/data/class-craft.ts` → `JOB3_CRAFT_ITEMS`)
ต้องวางใน **`JOB3_CRAFT_ITEMS`** (`src/data/class-craft.ts`) โดยใช้ `craft: { ...D10, ... }` *(ห้ามใส่ใน `src/data/class-gear.ts` เพราะ `tests/class-gear.test.ts:36` ล็อก `CLASS_GEAR.filter(i => i.j3)` ไว้เฉพาะ 2 ชิ้นของ Paladin)*:

1. **`cc_rn_helm`** (`head`, `'หน้ากากปีกเหยี่ยวเรนเจอร์'`, `'🪶'`, `jobs: AR, j2: ['beastmaster'], j3: ['ranger'], req: 'job3', slots: 1`):
   - `base: { dex: 5, luk: 5, int: 4 }`
   - `mod: { maxHp: 130, atk: 14, matk: 14, hit: 16, j2HawkMul: 0.12, j3AfterBless: 0.04 }`
   - `craft: { ...D10, bonus: [{ j3GospelField: 1 }, { j3Banding: 0.01, critMul: 0.15 }] }`
2. **`cc_rn_cloak`** (`armor`, `'เสื้อคลุมพรานพงไพรไพรมัล'`, `'🧥'`, `jobs: AR, j2: ['beastmaster'], j3: ['ranger'], req: 'job3', slots: 1`):
   - `base: { agi: 6, vit: 6, luk: 3 }`
   - `mod: { maxHp: 240, def: 18, flee: 14, tenacity: 0.12, j2BoarHp: 0.15, j3Banding: 0.02 }`
   - `craft: { ...D10, bonus: [{ j3EarthDrive: 0.3 }, { j3Inspire: 1, flee: 10 }] }`
3. **`cc_rn_crest`** (`acc`, `'เข็มกลัดจ้าวฝูงสรรพสัตว์'`, `'🐾'`, `jobs: AR, j2: ['beastmaster'], j3: ['ranger'], req: 'job3', slots: 1`):
   - `base: { dex: 4, int: 4, agi: 4, luk: 4 }`
   - `mod: { atk: 16, matk: 16, maxHp: 100, crit: 0.04, j2Charge: 0.2, j3GospelHeal: 0.01 }`
   - `craft: { ...D10, bonus: [{ j3AfterBless: 0.05 }, { j2PetPow: 0.12, j2PetHeal: 0.004 }] }`
4. **`cc_rn_bow`** (`weapon`, `wtype: 'bow'`, `'คันธนูพายุสรรพสัตว์เรนเจอร์'`, `'🏹'`, `jobs: AR, j2: ['beastmaster'], j3: ['ranger'], req: 'job3', slots: 2`):
   - `base: { dex: 7, luk: 6, int: 5, agi: 4 }`
   - `mod: { atk: 38, matk: 32, maxHp: 150, hit: 20, crit: 0.06, aspd: 0.14, pskill: 0.12, j2PetPow: 0.22 }`
   - `craft: { ...D10, bonus: [{ j3GospelField: 1 }, { j3GospelHeal: 0.015, pierce: 0.2 }] }`

### 6.2 D10 Uniques (`src/data/uniques3.ts` → `RANGER_UNIQUES`)
เพิ่ม `RANGER_UNIQUES` 3 ชิ้น (`head`, `armor`, `acc`, `unique: { dg: 'd10' }, req: 'job3', price: 0, slots: 1`) รวมใน `UNIQUE3_ITEMS` (`9 → 12` ชิ้น) และ `UNIQUE3_DROPS.ranger`:

1. **`u_rn_falconberet`** (`head`, `'หมวกขนนกเหยี่ยวราชัน'`, `'🦅'`, `jobs: ['archer'], j2: ['beastmaster'], j3: ['ranger']`):
   - `desc`: `'ยูนีคเรนเจอร์ · หมวก: Primal Stampede เพิ่มรอบ โฉบเหยี่ยวและพรหลังศึกแรงขึ้น แต่ DEF ลดลงนิด'`
   - `base: { int: 7, luk: 7, dex: 4 }`
   - `mod: { matk: 26, hit: 18, crit: 0.05, j3GospelField: 1, j2HawkMul: 0.20, j3AfterBless: 0.06, def: -8 }`
   - `pct: { maxHp: 0.06 }`
2. **`u_rn_primalhide`** (`armor`, `'เกราะหนังสัตว์บรรพกาล'`, `'🐺'`, `jobs: ['archer'], j2: ['beastmaster'], j3: ['ranger']`):
   - `desc`: `'ยูนีคเรนเจอร์ · เกราะ: สัตว์ทุกตัวและหมาป่าไวขึ้น Banding หนา แต่ Hit ลดลงนิด'`
   - `base: { vit: 8, agi: 6, str: 4 }`
   - `mod: { maxHp: 260, def: 22, flee: 14, j2PetPow: 0.18, j3Banding: 0.02, j2WolfSpeed: 0.12, hit: -10 }`
   - `pct: { maxHp: 0.12 }`
3. **`u_rn_wildheart`** (`acc`, `'หัวใจแห่งพงไพรนิรันดร์'`, `'🌿'`, `jobs: ['archer'], j2: ['beastmaster'], j3: ['ranger']`):
   - `desc`: `'ยูนีคเรนเจอร์ · เครื่องประดับ: Primal Stampede ฮีลแรง ฟื้น Energy เมื่อสัตว์ลงมือ แต่ Energy สูงสุดลดลงนิด'`
   - `base: { luk: 6, int: 5, agi: 5, dex: 4 }`
   - `mod: { atk: 18, matk: 18, critMul: 0.18, j3GospelHeal: 0.015, j3AfterBless: 0.08, j2Charge: 0.25, j2PetRes: 1, maxRes: -10 }`
- `UNIQUE3_DROPS.ranger`: `['u_rn_falconberet', 'u_rn_primalhide', 'u_rn_wildheart', 'u_c3_awakencrown', 'u_c3_awakenplate', 'u_c3_awakenring']`

### 6.3 Refine Lines (`src/data/refine.ts` → `CLASS_LINES`)
```ts
{ j3: 'ranger', lines: [['j2PetPow', [0.05, 0.08, 0.12]], ['j3Banding', [0.01, 0.02, 0.03]], ['j3GospelHeal', [0.005, 0.01, 0.015]], ['j3AfterBless', [0.03, 0.05, 0.08]]] },
```

### 6.4 Visuals & UI Touchpoints
- **`src/gfx/hero-visual.ts` (`heroRigSpec`)**: สำหรับ `job === 'archer'` (เมื่อ `activeJob3(s) === 'ranger'`), คืนค่า `auraTex: 'aura_gold'`, `auraTint: 0x9fe08a` (ออร่าทองอมเขียวมรกต · ตรวจสอบให้ `auraTex === undefined` เมื่อเปลี่ยน `job2` เป็น `innovator` และ Ranger ถูกพักไว้); `heroTex(s)` คง `'hero_archer'` ตามแนวทาง P0 เช่นเดียวกับ `paladin`/`champion`
- **`src/scenes/JobScene.ts:142`**: ปรับสีพรีวิว `.setTint(...)` ให้ผูกตาม `d.id` (เช่น `ranger: 0xc8ffb8`, อื่นๆ `0xffe7a0`) แทนการฮาร์ดโค้ดสีทองของ LK ทับทุกคลาส
- **UI ที่รองรับอัตโนมัติ (Data-Driven)**: `web-tier3.ts`, `skill-web.ts`, `node-footer.ts`, `node-detail.ts`, `ult-modal.ts`, `preview.ts`, `HubScene.ts`, `GemShopScene.ts`, `src/save.ts`, `src/data/levelup.ts`, `src/data/meta/items.ts`, `src/data/craft.ts`, `src/data/cardforge.ts` อ่านจาก `JOB3`, `JOB3_TREES`, `JOB3_PREFIX` โดยตรง ไม่ต้องแก้ลอจิกพิเศษ

---

## 7. Frozen TypeScript Interface & Node ID Contract

ส่วนนี้คือ **Single Source of Truth** ที่ล็อกสัญญาเพื่อไม่ให้เกิดความขัดแย้งระหว่าง `@data-core`, ทีม Combat (`BattleScene`/`allies.ts`), UI, และ Tests:

```ts
// 1. src/data/jobs3.ts
export type Job3Id = 'paladin' | 'lordknight' | 'champion' | 'ranger'

// 2. src/data/tree.ts
const JOB3_PREFIX: Record<Job3Id, string> = {
  paladin: 'pa',
  lordknight: 'lk',
  champion: 'ch',
  ranger: 'rn',
}
// Auto-generated branch/node IDs in tree.ts:
// - Branch: 'ranger_u3'
// - Node:   'ranger_u3p' (tier: 0, kind: 'pow3', max: 5, mod: lv => ({ u3Pow: 0.12 * lv }))
// - Hybrid: branches2Of('innovator') excluding '_s3' and '_u2' -> 'in_t', 'in_g', 'in_r' (tier <= 2)

// 3. src/data/trees3/ranger.ts (exact IDs & caps — never rename)
// Branch IDs: 'rn_l', 'rn_g', 'rn_r'
// Node IDs:
//   'rn_l1' (max: 3 -> { j3LegCross: 0.005 * lv })
//   'rn_l2' (max: 3 -> { j3LegGuard: 0.002 * lv })
//   'rn_l3' (max: 3 -> { j3LegHp: 0.003 * lv })
//   'rn_l4' (max: 1 -> { j3Heir: 1 })
//   'rn_g1' (max: 3 -> { j3GospelHeal: 0.01 * lv })
//   'rn_g2' (max: 3 -> { j3AfterBless: 0.05 * lv })
//   'rn_g3' (max: 2 -> { j2Spiral: 0.1 * lv })
//   'rn_g4' (max: 1 -> { j3GospelField: 1 })
//   'rn_r1' (max: 3 -> { j2Charge: 0.2 * lv })
//   'rn_r2' (max: 3 -> { j3Banding: 0.02 * lv })
//   'rn_r3' (max: 3 -> { j3EarthDrive: 0.4 * lv })
//   'rn_r4' (max: 1 -> { j3Inspire: 1 })

// 4. src/data/stats.ts (additive to Rework v2.1 Stats)
export interface Stats {
  // ...existing fields + Rework v2.1 fields...
  j3Rn: number // 1 = Ranger is the active 3rd job (Camouflage + Primal Stampede)
}

// 5. src/data/skill-math.ts (KIT3.ranger exact shape)
export const KIT3_RANGER_CONTRACT = {
  petPowAdd: 0.15,
  critAdd: 0.04,
  fleeAdd: 12,
  hawkCapAdd: 0.10,
  ultVolleys: 1,
  ultHawkMul: 0.90,
  ultHawkTargets: 2,
  ultBoarMul: 1.10,
  ultWolfMul: 1.35,
  ultWolfBleed: 2,
  varA: { arrowMul: 0.85, blindTurns: 2, per: 0.02, cap: 0.20, branch: 'bm_h' as const },
  varB: { boltMul: 1.50, pierce: 0.50, wargMul: 1.10, bleedAdd: 3, boarPush: 20, per: 0.02, cap: 0.20, branch: 'bm_w' as const },
  leg: { crossCap: 0.15, guardCap: 0.06, hpCap: 0.09, cross: 'bm_k' as const, guard: 'bm_b' as const, hp: 'bm_s' as const },
  heirNeed: 6,
  gospelHealMax: 3,
} as const

// 6. src/data/power.ts
// JOB3_K.ranger = 1.15

// 7. src/data/class-craft.ts (JOB3_CRAFT_ITEMS) & src/data/uniques3.ts (RANGER_UNIQUES)
// Craft IDs:  'cc_rn_helm' | 'cc_rn_cloak' | 'cc_rn_crest' | 'cc_rn_bow'
// Unique IDs: 'u_rn_falconberet' | 'u_rn_primalhide' | 'u_rn_wildheart'
```

---

## 8. รายชื่อไฟล์ทั้งหมดใน Repo ที่เกี่ยวข้องกับ Job3 (`git grep`) และแผนทดสอบ

### 8.1 รายชื่อไฟล์ทั้งหมดที่จัดการ Job3 (Verified `git grep`)
1. **Docs (6)**: `docs/class-skills/awakening-crusader-v1.md`, `docs/design/Novice to Hero Bestiary.html`, `docs/design/awakening-crusader-v1.md`, `docs/design/awakening-lordknight-v1.md`, `docs/design/changelog-2026-11-12.md`, `docs/design/class-gear-v1.md` (+ เอกสารนี้ `docs/design/awakening-beastmaster-v1.md`)
2. **Data & Analytics (22)**: `src/analytics.ts`, `src/data/cardforge.ts`, `src/data/class-craft.ts`, `src/data/class-gear.ts`, `src/data/craft.ts`, `src/data/jobs3.ts`, `src/data/levelup.ts`, `src/data/meta/hero-stats.ts`, `src/data/meta/item-types.ts`, `src/data/meta/items.ts`, `src/data/meta/stat-text.ts`, `src/data/meta/worn.ts`, `src/data/power.ts`, `src/data/refine.ts`, `src/data/skill-math.ts`, `src/data/stats.ts`, `src/data/tree-types.ts`, `src/data/tree.ts`, `src/data/trees3/champion.ts`, `src/data/trees3/lordknight.ts`, `src/data/trees3/paladin.ts`, `src/data/uniques3.ts` (+ ใหม่ `src/data/trees3/ranger.ts`)
3. **Gfx & Save (3)**: `src/gfx/hero-visual.ts`, `src/gfx/textures.ts`, `src/save.ts` *(+ `src/battle/allies.ts` สำหรับ `hawkChance` cap และ `guardHit` cap)*
4. **Scenes (11)**: `src/scenes/BattleScene.ts`, `src/scenes/GemShopScene.ts`, `src/scenes/HubScene.ts`, `src/scenes/JobScene.ts`, `src/scenes/character/node-detail.ts`, `src/scenes/character/node-footer.ts`, `src/scenes/character/preview.ts`, `src/scenes/character/skill-web.ts`, `src/scenes/character/ult-modal.ts`, `src/scenes/character/web-build.ts`, `src/scenes/character/web-tier3.ts`
5. **Tests (7)**: `tests/class-craft.test.ts`, `tests/class-gear.test.ts`, `tests/hero-visual.test.ts`, `tests/jobs3.test.ts`, `tests/levelup.test.ts`, `tests/monk-rework.test.ts`, `tests/unique-class3.test.ts`
6. **Tools (1)**: `tools/bot.cjs` *(รองรับ `JOB3=ranger` อัตโนมัติทันทีที่ลง `JOB3.ranger`)*

### 8.2 แผนการอัปเดตเทสต์และตรวจสอบสมดุล
1. **`tests/jobs3.test.ts`**:
   - อัปเดต regex บรรทัด `134` เป็น `/^(paladin_u3p|lordknight_u3p|champion_u3p|ranger_u3p|pa_|lk_|ch_|rn_)/`
   - เพิ่มเทสต์ `Beastmaster awakens into Ranger`: ตรวจ `job3Of('beastmaster')?.id === 'ranger'`, `JOB3.ranger.sibling === 'innovator'`, `st.j3Rn === 1`, `st.j2PetPow` เพิ่ม `+0.15`, `st.crit` เพิ่ม `+0.04`, `st.flee` เพิ่ม `+12`
   - ตรวจ Legacy caps (`rn_l1` → `ult2Pow` cap `0.15`, `rn_l2` → `j2BoarShare` cap `0.06` โดย **ไม่เพิ่ม `st.j2Guard`**, `rn_l3` → `maxHp`) และ `j3VarMul` (`bm_h` สำหรับ `a`, `bm_w` สำหรับ `b`)
   - ตรวจ Hybrid (`innovator`): `pure` ล็อก `in_t1`; `hybrid` เปิด `in_t1`/`in_t2` (Tier ≤ 2) และล็อก `rn_g3` (Tier 3+) รวมถึงล็อก `mk_c1` (`ไม่ใช่ใยของอาชีพนี้`)
2. **`tests/allies.test.ts`**:
   - ตรวจ `hawkChance(st, luk)` กับ `st.j3Rn = 1` ได้เพดาน `0.70` (ปกติ) และ `0.85` (Hawk Stance)
3. **`tests/unique-class3.test.ts`**:
   - อัปเดต `UNIQUE3_ITEMS.length` จาก `9` → `12`
   - เพิ่มการตรวจ `RANGER_UNIQUES` 3 ชิ้น (`head`, `armor`, `acc`), `canWear` lock (`beastmaster` + `ranger` เท่านั้น), และ `rollUnique3Drop('ranger', ...)`
4. **`tests/class-craft.test.ts`**:
   - อัปเดต `JOB3_CRAFT_ITEMS.length` จาก `6` → `10`
   - เพิ่ม assertion `rn` slots `['acc', 'armor', 'head', 'weapon']`
5. **`tests/hero-visual.test.ts`**:
   - เพิ่มเคส `{ job: 'archer', job2: 'beastmaster', job3: 'ranger' }` ได้ `auraTex: 'aura_gold'`, `auraTint: 0x9fe08a` และเมื่อ `job2: 'innovator', job3: 'ranger'` (parked) ได้ `auraTex: undefined`
6. **รันตรวจสอบ Gate & Bot Simulation**:
   - `npm run typecheck` (`tsc --noEmit` ต้อง 0 errors)
   - `npm test` (ทุกชุดเทสต์ผ่าน 100%)
   - `tools/bot.cjs` headless D10 🔥 Hard / 😈 Hell เปรียบเทียบ Hero Power & Winrate ระหว่าง `JOB2=beastmaster` vs `JOB2=beastmaster JOB3=ranger PET=hawk|boar|wolf J3V=a|b` และปรับจูน `JOB3_K.ranger` หากจำเป็น
