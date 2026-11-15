# Dev log — 2026-11-15

## 1. 🗼🌀 หอคอย + รอยแยกไร้สิ้นสุด: มอน D1–D13 ปนกัน + ชั้น 100+ นรก (v125)

คำขอของ Q: "อยากให้มี Monster ตั้งแต่ D1-D13 รวมกันมาเลย · ตั้งแต่ชั้น 100 monster จะเป็น Hell Stat + lv100" · ตอบคำถาม: Lv curve = "ทำให้ตั้งแต่ชั้น 100 ยากขึ้น", pool = ทุกดันไม่ต้องเคลียร์

**🗼 หอคอย**
- เวฟ / มินิ / บอส สุ่มจาก D1–D13 ทุกดันตั้งแต่ชั้น 1 (เดิม: D2–D5 ตามธีม, D6+ เฉพาะดันที่เคลียร์แล้วและจากชั้น 25) · `ENDLESS_DUNGEONS`, `TOWER.poolMax` 13
- ลบ `TOWER.deepFrom/deepChance0/deepPerFloor/deepMax` + `deepChance()` · ธีมฉาก/วัตถุดิบชั้นยังเป็น D2–D5 เหมือนเดิม
- มอน D1–D5 ลด Lv ตามชั้นได้แล้ว (เดิมขึ้นอย่างเดียว) · `TOWER_LV.minLv` 8 = ชั้น 1–5 ยังเท่าเลเวลชั้น 1 เดิม

**🌀 รอยแยก**
- catalog รวม D1–D13 (`packMinDungeonNum` 1, `packMaxDungeonNum` 13), ทุกดันออกตั้งแต่ความลึก 1 (`packDepthStepPerDungeon` 0, เดิม D7–D13 ต้องลึกขึ้นทีละ 3)
- มอน D1–D5 ในรอยแยกสร้างที่ Lv ของห้อง (เหมือน D6+) · ไม่โดน monBuff / depth multiplier (D6+ ไม่เคยโดนอยู่แล้ว) · ได้แค่ mutator
- ⚠️ รันรอยแยกที่ค้างไว้ จะได้ชั้นใหม่ไม่เหมือนเดิมตอน resume (catalog เปลี่ยน)

**😈 ชั้น / ความลึก 100+ (`ENDLESS_HELL` from 100, minLv 100)**
- ทุกตัว (รวม D6+ และตัวที่ถูกเรียก) เป็นนรก: hellify + แต้มสเตตัส hard (+50%) ลง HP/ATK ด้วย (`withStats.hardNumbers`)
- Lv ไม่ต่ำกว่า 100 · หอคอยชั้น 100 = Lv 150 + นรก 10 = **Lv 160** · รอยแยก = max(Lv ห้อง, 100)

**💰 กันรางวัลรั่ว**
- มอนที่ Lv ต่ำกว่าบ้านตัวเอง (เช่น D13 ชั้น 1 Lv 8): EXP / zeny × Lv/`homeLv`, ไม่ดรอปการ์ด, ไม่ดรอปวัตถุดิบดันตัวเอง (ได้ของธีมแทน)

**ยังไม่ได้ทำ:** ยังไม่ได้เล่นจริง/รัน bot ที่ชั้น 100 · ตัวเลขทั้งหมดเป็น first guess

**ไฟล์:** `src/data/modes.ts`, `src/data/hell.ts`, `src/data/mon-stats.ts`, `src/data/rift.ts`, `src/battle/rift-engine.ts`, `src/scenes/BattleScene.ts`, `tests/tower-deep-hell.test.ts`, `tests/void-rift-mode.test.ts`
