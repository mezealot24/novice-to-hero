# Dev log — 2026-11-14

## 1. 🐺 Beastmaster Rework v1 — gap spec (docs only)

ตุ๊กตาเทียบดีไซน์ "Awakening Beastmaster" + โค้ด 8 ไฟล์ที่ Q ส่งมา (เวอร์ชันเรียลไทม์) กับระบบเทิร์นของเกม · spec `docs/design/beastmaster-rework-gap.md`
- ไม่ copy ไฟล์ที่ส่งมา: เป็นระบบเรียลไทม์, ทับ VFX pixelfx, เปลี่ยน node ID ที่เป็น save data, เรียก API ที่ไม่มี
- คำตัดสินของ Q: สัตว์ครบ 3 ตัว + เชี่ยวชาญ 1 ตัวผ่านทาเลนต์แถว IV (เหยี่ยว True Damage / หมาป่า bleed %HP / หมูป่า stun ทั้งแถว) · Prey Mark ใช้ `huntMark` ร่วม · Rage หมูป่าใช้คู่กับพุ่งทุก N เทิร์น · Savage Crunch = heal แยก · Ult = Awakening หลายเทิร์น ไม่มีดาเมจก้อนใหญ่
- แผน 8 phase (0 pack lineup → 7 VFX boar-guard)

**ไฟล์:** `docs/design/beastmaster-rework-gap.md`
