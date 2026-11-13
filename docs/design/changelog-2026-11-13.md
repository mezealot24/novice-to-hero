# 📜 Dev Log (2026-11-13): Mage rework + ปั๊มเลเวล (test) + ปรับแสง

## 1. 🌙 ปรับแสงหน้าจอ (กลางคืน)

- ปุ่ม DOM ลอยมุมล่างซ้าย (นอก `#game` เลยไม่ถูกหรี่) กดวนทีละขั้น 100% → 80% → 60% → 45% → 100% ใช้ CSS `brightness()` กับ `#game` ตัวเดียว ไม่ต้องแก้ scene ไหน
- เก็บค่าใน `localStorage` key `nth_brightness` แยกจากไฟล์เซฟ (ไม่แตะ save schema) ค่าเสีย/ไม่มี = 100% · `initDisplay()` เรียกก่อน `await` ใน `boot()` จอจะไม่แวบสว่างตอนเปิด
- ไฟล์: `src/display.ts` (ใหม่) · `src/main.ts` · `tests/display.test.ts` (5 test)
- ยังไม่ได้ลองใน Hub / Battle / Dungeon / มือถือ (มุมล่างซ้ายอาจทับ HUD ของ Battle)

## 2. 🧪 ร้านเพชร — ปั๊มเลเวล (TEST ONLY)

- แท็บใหม่ "🧪 ปั๊มเลเวล" ในร้านเพชร: ซื้อ Base Lv (💎20/เลเวล · +3 stat point) และ Job Lv (💎15/เลเวล · +1 skill point) แพ็ก +1 / +5 / +10
- Job Lv เลือก track เหมือน `save.addXp`: Job3 > Job2 > base class (เพดานของ track นั้น) · คิดเงินเฉพาะเลเวลที่ใส่ได้จริง · EXP ของเลเวลนั้นรีเซ็ต · ไม่แจกเพชรฟรีตอน Base Lv อัป (ราคา 20 > FREE_GEMS.levelUp 10)
- เปิดด้วย flag `GEM_TO_LEVEL_TEST = true` ใน `meta/economy.ts` (production build ก็เห็นแท็บนี้) ⚠️ ปิดคู่กับ `GEM_TO_ZENY_TEST` ก่อนปล่อยจริง (กฎร้าน: เพชรซื้อได้แค่ของแต่งตัว)
- ไฟล์: `src/data/levelup.ts` (ใหม่ pure functions) · `src/data/meta/economy.ts` · `src/scenes/GemShopScene.ts` · `tests/levelup.test.ts` (7 test)
