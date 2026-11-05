# Live tuning (v74): ปรับสเตตัสมอน / มินิบอส / บอส แบบไม่ต้อง deploy เกม

## ภาพรวม
- `admin.html`: หน้าแก้ค่า (อยู่ข้าง ๆ `index.html` บน GitHub Pages, ไม่มีลิงก์จากในเกม)
- แก้ได้เฉพาะช่องใน `src/data/tunables.ts` (whitelist + ช่วง min/max)
- Server (`server/src/config.ts`) ตรวจทุก patch ด้วย `src/data/patch.ts` ตัวเดียวกับเกม → ค่าผิด = ปฏิเสธ
- เกมโหลด `GET /config/live` ก่อนเปิด Phaser (`src/live-config.ts`) → ไม่มี live = ใช้ค่า default ของ build
- Flow: แก้ → 💾 บันทึก draft → ▶ ทดสอบในเกม → 🚀 Publish

## ตั้งค่าครั้งแรก
1. ใส่ secret รายชื่อ admin (Google email, คั่นด้วย `,`):
   - `cd server && npx wrangler secret put ADMIN_EMAILS` → พิมพ์ `wiriya.on@gmail.com`
   - local: ใส่ใน `server/.dev.vars` → `ADMIN_EMAILS=wiriya.on@gmail.com`
2. สร้างตาราง `config_release` (idempotent, รันซ้ำได้):
   - `cd server && node scripts/migrate.mjs` (ใช้ `DATABASE_URL` จาก `server/.dev.vars`)
   - หรือรันส่วน `config_release` ใน `server/schema.sql` ผ่าน Neon SQL editor
3. Deploy worker: `cd server && npm run deploy`
4. เกม: push เข้า `main` → GitHub Actions build `index.html` + `admin.html` ให้เอง
5. Google OAuth: ต้องเปิด provider Google อยู่แล้ว (`GOOGLE_CLIENT_ID/SECRET`)

## ใครเป็น admin ได้
- ล็อกอินด้วย Google (ไม่ใช่ guest) + email verified + อยู่ใน `ADMIN_EMAILS`
- ไม่ผ่าน → `401` (ยังไม่ล็อกอิน) / `403` (ไม่ใช่ admin) → หน้า admin ขึ้นสถานะ "ไม่ใช่ admin"
- คำสั่งเขียน (PUT/POST) ต้องมาจาก origin ใน `ALLOWED_ORIGINS` + เป็น JSON (กัน CSRF เพราะ cookie เป็น `SameSite=None`)

## ใช้งาน
- 👾 มอนสเตอร์: แยกตามดันเจี้ยน → บอส (MVP) / มินิบอส / ปกติ, มีช่องค้นหา
  - แต่ละช่อง: ค่า default (build) · ค่า live · ช่องแก้ (clamp ตาม min/max)
  - ขอบส้ม = ต่างจาก live (จะเปลี่ยนตอน publish) · ขอบฟ้า = ต่างจาก default
  - `↺` กลับเป็นค่า live · `×` กลับเป็นค่า default
- 📊 ตารางอื่น: `monStat`, `archetypes`, `skillScale`, `hard`, `battle`, ... (สร้างจาก `TABLES` อัตโนมัติ)
- 📝 สรุป: diff draft vs live + ผลตรวจ, ปุ่มบันทึก / Publish / ทิ้ง draft
- ▶ ทดสอบในเกม:
  - build จริง → บันทึก draft แล้วเปิดเกม `?cfg=draft` (ใช้ cookie admin, ไม่ cache)
  - dev / PREVIEW build → เขียน draft ลง `localStorage` (`LOCAL_KEY`) แล้วเปิด `?cfg=local`

## Publish / Rollback
- 🚀 Publish: ใส่โน้ต → draft กลายเป็น live (live เดิม → `archived`), log `config.publish` พร้อม email คนกด
- ผู้เล่นได้ค่าใหม่ตอนเปิดเกมครั้งถัดไป (`Cache-Control: max-age=60`)
- 🕘 ประวัติ → เปิด release เก่า → ⏪ Rollback = สร้าง live row ใหม่ที่ใช้ patch เดิม (id เดินหน้าเสมอ)
- `📥 โหลดเข้า draft` = เอา release เก่ามาแก้ต่อ
- `⏻ ปิด live config` = ทุกคนกลับไปใช้ค่า default ของ build (draft ไม่หาย)
- ดู log: `cd server && npx wrangler tail` → หา `config.publish` / `config.rollback` / `config.unpublish`

## API (server/src/config.ts)
| Route | สิทธิ์ | ทำอะไร |
|---|---|---|
| `GET /config/live` | public | Release ปัจจุบัน (ETag + cache 60s), ไม่มี = `releaseId: null` |
| `GET /admin/state` | admin | `{ me, draft, live }` |
| `GET /admin/draft/preview` | admin | draft ในรูป Release (เกม `?cfg=draft`) |
| `PUT /admin/draft` | admin | `{ patch, note }` → ตรวจ + คำนวณ guards ฝั่ง server |
| `POST /admin/draft/discard` | admin | ลบ draft |
| `POST /admin/publish` | admin | `{ draftId, note }` |
| `POST /admin/rollback` | admin | `{ id, note }` |
| `POST /admin/unpublish` | admin | ปิด live |
| `GET /admin/releases` · `GET /admin/release/:id` | admin | ประวัติ |

## ข้อควรรู้
- body จำกัด 512 KB, patch สูงสุด 5000 ช่อง (`MAX_ENTRIES`)
- เปลี่ยนความหมายของ path ใน `tunables.ts` → bump `CONFIG_SCHEMA`
- ช่วง min/max แคบลงทีหลัง → rollback ไป release เก่าที่เกินช่วงจะถูกปฏิเสธ (กันเกม reject ทั้ง release)
- Stat monster (D6+): `hp/dmg = 1` เป็นค่าวาง → ปรับ `bodyMul` / `statAlloc` / `MON_STAT` แทน
