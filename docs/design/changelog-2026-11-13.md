# 📜 Dev Log (2026-11-13): Mage rework + ปั๊มเลเวล (test) + ปรับแสง

## 1. 🌙 ปรับแสงหน้าจอ (กลางคืน)

- ปุ่ม DOM ลอยมุมล่างซ้าย (นอก `#game` เลยไม่ถูกหรี่) กดวนทีละขั้น 100% → 80% → 60% → 45% → 100% ใช้ CSS `brightness()` กับ `#game` ตัวเดียว ไม่ต้องแก้ scene ไหน
- เก็บค่าใน `localStorage` key `nth_brightness` แยกจากไฟล์เซฟ (ไม่แตะ save schema) ค่าเสีย/ไม่มี = 100% · `initDisplay()` เรียกก่อน `await` ใน `boot()` จอจะไม่แวบสว่างตอนเปิด
- ไฟล์: `src/display.ts` (ใหม่) · `src/main.ts` · `tests/display.test.ts` (5 test)
- ยังไม่ได้ลองใน Hub / Battle / Dungeon / มือถือ (มุมล่างซ้ายอาจทับ HUD ของ Battle)
