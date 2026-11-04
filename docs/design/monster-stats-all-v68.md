# มอนทุกตัวมี 7 Stat + สกิลสเกลตาม Stat (v68)

ผู้เขียน: ตุ๊กตา · 2026-11-04 · คำขอคิว: "ให้มอน บอส มินิบอส ที่ยังไม่มี main status มีด้วย แล้วให้สกิลสเกลตาม stat ได้ด้วย"

## TL;DR

- มอน D1-5, อีเวนต์ และ support **41 ตัว** ได้ STR/VIT/WIS/DEX/INT/LUK/AGI ครบ (ตาราง `LEGACY_ALLOC` ใน `src/data/mon-stats.ts`)
- **ไม่เปลี่ยนความยากหลัก**: HP / ATK / M.ATK / DEF / Hit / Flee / คริ / คอมโบ / สวนกลับ ยังเป็นค่าที่จูนไว้ (Hero Power, hard, tower, monBuff ยังคูณเหมือนเดิม)
- stat ให้ของที่ "มาจาก stat อย่างเดียว" ตามสูตรฮีโร่: WIS → M.DEF + ต้านทาน · LUK → หลบโชคดี + ลดดาเมจคริ · AGI/DEX/VIT → Ignore Combo / Ignore Counter / Combo-Counter DR
- **สกิลมอนทุกตัว (รวม D6)** คูณด้วย stat ของผู้ร่าย: `x (1 + 0.5% x (stat - ref))` ช่วง x0.8-x1.5

## เลเวลของมอนเก่า

เลเวลมาจาก "ดันบ้านเกิด" (ดันแรกที่มอนโผล่ รวม summon และ duel pool) · บอสใช้เลเวลนี้ มินิ -1 ธรรมดา -2

| ดัน | D1 | D2 | D3 | D4 | D5 |
|---|---|---|---|---|---|
| Lv บอส | 5 | 10 | 13 | 16 | 21 |

แต้มใช้สูตรเดียวกับ D6: `3 x (Lv-1) x tierPct` (ธรรมดา 50% / มินิ 100% / บอส 150%, 🔥ยาก +50%) แล้วแบ่งตาม archetype หรือน้ำหนักของมอนตัวนั้น

## สกิลสเกลตาม stat

```
mul = clamp(1 + per x (stat - ref), 0.8, 1.5)
ref = 1 + แต้มของมอน "ธรรมดา" เลเวลเดียวกัน / 7     (stat ของมอนที่แบ่งแต้มเท่ากันทุกตัว)
per = 0.5% ต่อแต้ม                                    (SKILL_SCALE ใน mon-stats.ts)
```

ผล: มอนสายเฉพาะ (INT สูง), บอส (แต้ม 150%), โหมดยาก (+50%) ร่ายแรงกว่า · มอนที่ร่ายสกิลนอกสายตัวเอง (เช่นสาย STR ร่ายเวท) เบากว่านิดหน่อย

| ชนิดสกิล | stat เริ่มต้น | คูณอะไร |
|---|---|---|
| bolt (เวท) | INT | ดาเมจ |
| strike (ท่าตี) | STR | ดาเมจ |
| heal / shield / revive | WIS | % HP ที่ฮีล / โล่ / ชุบ (ชุบไม่เกิน 100%) |
| warcry | STR | % ATK ที่บัฟ |
| haste | AGI | เกจที่เพิ่มให้เพื่อน |
| ท่าชาร์จบอส (slam) | STR (เวท: INT) | ดาเมจ |
| curse / summon | — | ไม่สเกล (จำนวนเทิร์นดีบัฟ/จำนวนลูกน้องคงที่) |

override ได้รายสกิล: `scale: { stat: 'vit' }` (ทหารเต่า/ด้วงสคารับ โล่จาก VIT) · `scale: false` = ค่าคงที่ · บอส `slamScale` (ปิ๊กซี่ จรวดจาก DEX, ระดมยิงจาก DEX)

ตัวอย่าง (ปกติ / 🔥ยาก): ลิช INT 46 → เวททุกอัน x1.20 / x1.28, M.DEF 16% / 20% · บารัค STR 30 → ขวาน x1.12 / x1.19 · ราชาเจลล็อป x1.02 · เนเฟรู (D6 Lv50) เวท x1.2

## โค้ด

- `src/data/mon-stats.ts`: `LEGACY_ALLOC`, `LEGACY`, `homeDungeon`, `legacyLevel`, `withStats`, `SKILL_SCALE`, `scaleOf`, `slamScaleOf`, `skillMul`
- `src/data/game-data.ts`: `MonSkill.scale`, `MonsterDef.slamScale`
- `src/scenes/BattleScene.ts`: `legacyStats()` ก่อน buffDef, `skPow()` ในทุกสกิล, slam คูณ `skillMul`
- เทส: `npm test` (`tests/mon-stats.test.ts`) เช็กว่ามอนทุกตัวมี stat, ค่าที่จูนไว้ไม่เปลี่ยน, สเกลถูกทิศ

## ยังไม่ได้ทำ (ถ้าคิวอยากได้)

- แปลงมอน D1-5 ให้ HP/ATK มาจาก stat เต็มแบบ D6 (= รีบาลานซ์ D1-5 ใหม่ทั้งหมด)
- แสดง stat มอนในเกม (ตอนนี้ดูได้ใน Monster DB)
- สคริปต์ duel ของมินิบอส (miniTurn) ที่ตัวเลขเขียนตรงในโค้ด ยังไม่สเกล
