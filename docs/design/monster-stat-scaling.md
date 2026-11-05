# มอน D1-5 ใช้ 7 Stat แบบ D6 + สกิลสเกลตาม Stat (v76)

ผู้เขียน: ตุ๊กตา · 2026-11-06 · ต่อจาก `monster-stats-all-v68.md`, `dungeon-6-10-stat-monsters.md`

## TL;DR
- มอน**ทุกตัว** (50 ตัว) มี `statAlloc` เป็น object ใน `MONSTERS` → แก้ได้ใน admin.html (`<kind>.statAlloc.str` …)
- D1-5 / อีเวนต์ ใช้สูตร `derive()` **ตัวเดียวกับ D6** แต่ **ยึด (anchor) กับค่าที่จูนไว้**
- ค่า default ของ build → ตัวเลข**ไม่ขยับเลย** (เทสต์ ±10% ผ่านแบบ 0%)
- แก้ `statAlloc` / `legacy.lv` / `MON_STAT` → ตัวเลขขยับตามสูตร D6
- สกิลใหม่ที่สเกล: **phase heal / phase shield (WIS)**, **razor (INT)** · ปรับ rate ได้ที่ `skillScale.fx.*.per`

## 1. ทำไมต้อง anchor (ไม่ใช้สูตร D6 ดิบ)
สูตรดิบที่เลเวลบ้านเกิด ห่างจากค่าจริง **41/41 ตัว** (เกิน ±10%)

| กลุ่ม | HP ดิบ vs จริง | ATK ดิบ vs จริง |
|---|---|---|
| D1-2 ธรรมดา | +60% ถึง +930% | +95% ถึง +540% |
| D3-5 ธรรมดา | -32% ถึง +74% | +50% ถึง +230% |
| มินิบอส | -43% ถึง -10% | +45% ถึง +185% |
| บอส | -31% ถึง +140% | +40% ถึง +153% |

- สาเหตุ: เลเวลต่ำ = แต้มน้อย → `levelBase` + `body` เป็นตัวหลัก, ไม่สะท้อน design รายตัว (หมูป่า DEF 60, เต่า DEF 120)
- ปรับด้วยตัวคูณรายดัน → ยังเพี้ยนรายตัว ±50% → **ไม่ผ่าน ±10%**
- เลยใช้ anchor ต่อตัว (ค่าที่จูนไว้ = ค่า ณ เลเวลบ้านเกิด + alloc default)
- ดูตารางเต็ม: `npm test` → `v76 calibration`

## 2. สูตร v76 (`src/data/mon-stats.ts` → `withStats`)

| ค่า | สูตร |
|---|---|
| hp / dmg / matk / speed | ค่าจูน × `derive(ตอนนี้)` / `derive(REF)` |
| def / hit / flee | ค่าจูน + (`derive(ตอนนี้)` − `derive(REF)`) |
| crit / combo / counter | เหมือนบรรทัดบน + cap |
| M.DEF, lucky dodge, tenacity, combo/counter DR | จาก stat ตรง ๆ (เหมือน v68) |

- `REF` = alloc + `LEGACY.lv` + `MON_STAT` ของ build → ถูก freeze ตอนโหลดโมดูล (ก่อน live-config patch)
- แก้ `<kind>.hp` ใน admin → เปลี่ยน anchor ตรง ๆ (linear)
- อีเวนต์ (ไม่มีดันบ้านเกิด): REF ที่เลเวลห้องปัจจุบัน → ขยับเฉพาะตอนแก้ `statAlloc`
- 🔥 ยาก: แต้ม +50% ใช้กับส่วน stat-only + การสเกลสกิลเท่านั้น · HP/ATK ยังให้ `hardDef` (Hero Power) คูณเหมือนเดิม → ไม่คูณซ้ำ
- D6 archetype string → object (`ARCHETYPES` ไม่ผูกกับ D6 แล้ว — แก้รายตัวแทน)

## 3. วิเคราะห์สกิล / กลไกทั้งหมด

สูตรกลาง: `mul = clamp(1 + per × (stat − ref), 0.8, 1.5)` · `ref` = stat ของมอนธรรมดาแบ่งเท่ากันที่เลเวลเดียวกัน

### ✅ สเกลแล้ว

| กลไก | Stat | สเกลอะไร | ตั้งแต่ |
|---|---|---|---|
| bolt | INT | ดาเมจ | v68 |
| strike | STR | ดาเมจ | v68 |
| heal / shield / revive | WIS (เต่า/สคารับ: VIT) | % HP | v68 |
| warcry | STR | % ATK บัฟ | v68 |
| haste | AGI | เกจที่เพิ่ม | v68 |
| ท่าชาร์จ (slam) | STR / INT (ปิ๊กซี่: DEX) | ดาเมจ | v68 |
| HARD_SKILLS (bolt/warcry/shield/heal) | ตาม kind | เหมือนบรรทัดบน | v68 |
| **phase heal** | **WIS** | % HP ที่ฮีลตอนเข้า phase | **v76** |
| **phase shield** | **WIS** | % HP โล่ตอนเข้า phase | **v76** |
| **razor (กริมฟาง)** | **INT** | % HP ปัจจุบันของเรา | **v76** |
| venom (เวโนมิร่า) | INT (ผ่าน M.ATK) | DoT เริ่มต้น | ผ่าน `matkScale` อยู่แล้ว |
| deathBlast | STR (ผ่าน dmg) | ระเบิดตอนตาย | ผ่าน dmg อยู่แล้ว |
| crit / combo / counter | LUK / AGI / VIT·DEX | อัตรา | **v76** (delta จาก stat) |
| Flee / Hit / DEF / ความเร็ว | AGI / DEX / VIT / AGI | ค่าตรง | **v76** |

- ตัวอย่างค่า default: ลิช phase heal 0.08 → **0.085** · ราชาเจลล็อป shield 0.10 → 0.10 · กริมฟาง razor 0.05 → 0.05
- rate: `SKILL_SCALE.fx.{phaseHeal, phaseShield, razor}.per` = 0.003 (ตั้ง 0 = ปิด) ใน admin แท็บ `skillScale`

### 💡 ข้อเสนอ (ยังไม่ทำ — ความเสี่ยงสูงหรือต้องแก้ BattleScene)

| กลไก | Stat | สูตรที่เสนอ | ทำไมยังไม่ทำ |
|---|---|---|---|
| curse / onHit / slamFx (poison, burn, weaken…) | DEX | จำนวนเทิร์น +1 เมื่อ mul ≥ 1.25 | เป็นจำนวนเต็ม → ขยับแบบกระโดด |
| freeze (เกจ) | INT | freeze × mul | ใกล้ 100 = ข้ามเทิร์น · ต้องจูนด้วยบอท |
| lifesteal (มอน + passive ดูดเลือด) | VIT | × mul | 0.35 × 1.5 = 0.52 → บอสฮีลไม่หยุด |
| reflect / absorb | WIS | × mul | ลงโทษคลาสตีแรงหนักขึ้น |
| chargeEvery | AGI | −1 เมื่อ AGI สูง | จำนวนเต็ม · เปลี่ยนจังหวะทั้งไฟต์ |
| trueSight.after | DEX | −1 เมื่อ DEX สูง | เป็นตัวกัน AGI build ที่จูนไว้แล้ว |
| summon (จำนวน) | INT/WIS | +1 เมื่อ mul ≥ 1.3 | กระทบเทิร์นลิมิต |
| strike.drain (กริมฟาง) | INT | × mul | ซ้อนกับ razor → แรงเกิน |
| phase speed / dmg | AGI / STR | × mul | ซ้อนกับ speed/dmg จาก stat แล้ว |
| HARD_PASSIVES def (+25) | VIT | × mul | ทำใน `hardAffix` (BattleScene) |
| HARD_PASSIVES speed / enrage | AGI / STR | × mul | เหมือนบรรทัดบน |
| fixedFlee (เมเดน), shots, slamMul | LUK / DEX / STR | × mul | กลไกเฉพาะตัว จูนด้วยมือดีกว่า |
| iceSkin / toxicSkin / vengeance | — | ค่ากลางใน `BATTLE` | เป็น passive ของทั้งเกม ไม่ใช่รายตัว |

## 4. เทสต์
- `tests/mon-stats-calibration.test.ts`
  - anchor: ทุกตัว hp/dmg/matk ±10%, def/hit/flee/crit/combo/counter/speed เท่าเดิม
  - พิมพ์ตาราง tuned vs สูตรดิบ (flag ตัวที่เกิน ±10%)
  - patch `statAlloc` ผ่าน `applyPatch` จริง → ตัวเลขขยับถูกทิศ, revert คืนค่า
  - `LEGACY.lv`, `MON_STAT.body` ขยับ D1-5 ได้ · patch `hp` = anchor ใหม่
- `tests/mon-stats.test.ts`: มอนทุกตัวมี `statAlloc` object, D6 native = 9 ตัว
- ยังไม่ได้รันบอท (เครื่องคิวช้า) → ค่า default ไม่ขยับ ยกเว้น phase heal/shield + razor (เล็กน้อย เช่น ลิช heal +6%, clamp 0.8-1.5)
