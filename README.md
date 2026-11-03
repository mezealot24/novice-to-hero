# Novice to Hero (game)

เวอร์ชันเกมจริง สร้างด้วย **Phaser 3 + TypeScript + Vite** (เบา รันบน browser ไม่ต้องใช้ Unity)
POC เก่า (vanilla JS) อยู่ที่ `../poc/` ใช้เป็น reference ของระบบอาชีพ การ์ด perk และตีบวก

## รันบนเครื่อง
```bash
npm install
npm run dev      # เปิด http://localhost:5173 แก้โค้ดแล้วหน้าเว็บรีโหลดเอง
npm run build    # ได้ dist/index.html ไฟล์เดียว (เกมทั้งเกม) + dist/artifact.html สำหรับแชร์
```

## โครงสร้าง
- `src/data/game-data.ts` ตัวเลขบาลานซ์ทั้งหมด (HP, ดาเมจ, มอน, ห้อง) แก้ตรงนี้ที่เดียว
- `src/entities/Hero.ts` ตัวผู้เล่น: เดิน, Dash, ยืนนิ่งแล้วตีอัตโนมัติ
- `src/entities/Monster.ts` AI มอน 3 แบบ: hopper (เจลล็อป), dasher (หมาป่า), boss (ราชาเจลล็อป)
- `src/scenes/DungeonScene.ts` ห้อง, ประตู, เหรียญ, HUD, จอยสติ๊กมือถือ, หน้าเริ่ม/แพ้/ชนะ
- `src/gfx/textures.ts` ภาพชั่วคราววาดด้วยโค้ด (เปลี่ยนเป็น sprite จริงทีหลังได้โดยใช้ key เดิม)
- `src/sfx.ts` เสียงสังเคราะห์ด้วย WebAudio

## Game flow (M3 shell)
Title → สร้างตัวละคร (เผ่า + ชื่อ) → เมือง (hub) → ผจญภัย / ตัวละคร / ร้านค้า / ร้านเพชร / ตั้งค่า
- `src/data/meta.ts` เผ่า, ค่าสถานะ 6 ค่า, สกิลโนวิส, อุปกรณ์, ชุดแต่งกาย, แพ็กเพชร (mock)
- `src/save.ts` เซฟ localStorage (Base Lv / Job Lv / zeny / เพชร / ของ)
- `src/ui.ts` ปุ่ม, panel, top bar, toast, confirm
- เติมเงินเป็นโหมดทดลอง ไม่ตัดเงินจริง เพชรซื้อได้แค่ของแต่งตัว และหาได้ฟรีในเกม

## Roadmap
1. ✅ ห้องดันบังคับได้จริง (M1)

3. เปลี่ยนอาชีพ + สกิล Q/W/E แบบ LoL
4. ร้าน การ์ด ตีบวก (ย้ายจาก POC)
5. ghost PvP
