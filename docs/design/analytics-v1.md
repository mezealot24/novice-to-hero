# 📊 Analytics v1 — anonymous play data สำหรับ beta go/stop

> ทำ 2026-11-08 · blocker #1 ของ Phase 0 (market-roadmap-nov2026 §6.3 + gaps part2 §4.2)
> โค้ด: `src/analytics.ts` · test: `tests/analytics.test.ts` · branch `feat/analytics-mvp`

## 0. สรุปสั้น (so what)

- ตอนนี้ฝังระบบเก็บข้อมูลได้แล้ว **แต่ยังปิดอยู่** จนกว่าจะใส่ `VITE_POSTHOG_KEY` (build ปกติทำงานเหมือนเดิมทุกอย่าง)
- **PDPA:** ถามครั้งแรกที่หน้า Title ถ้ายังไม่ตอบจะไม่ส่งอะไรออกจากเครื่องเลย ตอบ "ไม่ส่ง" = ลบ queue + ลืม id · เปลี่ยนใจได้ที่ปุ่ม 📊 หน้า Title
- **ไม่มี SDK:** ส่งเป็น batch JSON ไป PostHog capture API ตรง ๆ (ไม่ทำให้ single-file build ใหญ่ขึ้น)
- ได้ครบ 3 อย่างที่ roadmap ขอ: **step-level FTUE funnel** · **UTM ต่อช่องทาง (first touch)** · **purchase funnel**
- D1/D7 คำนวณใน PostHog จาก event `app_open` ต่อ `distinct_id` (anonymous id สร้างตอนกดยินยอม)

## 1. ต้องทำอะไรต่อ (คิวทำเอง ~15 นาที)

1. สมัคร PostHog (free 1M events/เดือน) → สร้าง project → copy **Project API key** (`phc_...` เป็น key สาธารณะแบบเขียนอย่างเดียว ใส่ใน client ได้)
2. GitHub repo → Settings → Variables → Actions → เพิ่ม `VITE_POSTHOG_KEY` (และ `VITE_POSTHOG_HOST` ถ้าเลือก EU: `https://eu.i.posthog.com`)
3. deploy ใหม่ → เปิดเกม → กด "ส่งได้เลย" → ดู Live events ใน PostHog
4. สร้าง insight 3 ตัว: Funnel FTUE (§3), Retention (`app_open` → `app_open`), Funnel ซื้อ (`shop_open` → `purchase` tap → `purchase` ok)

## 2. Event ที่ส่ง

| event | เมื่อไร | props |
|---|---|---|
| `app_open` | เปิดเกม | — |
| `consent` | กดยินยอม | `granted` |
| `screen` | ทุกครั้งที่เปลี่ยนหน้า (`ui.go`) | `name` |
| `ftue` | ครั้งแรกของแต่ละ step (ต่อเครื่อง) | `step` |
| `run_start` | เริ่ม/เริ่มใหม่รอบในดัน | `mode`, `dungeon` |
| `run_end` | จบรอบ (ชนะ/แพ้/ออก) | `mode`, `dungeon`, `won`, `room`, `zeny`, `xp` |
| `level_up` | Base / Job / Job2 ขึ้น | `kind`, `level` |
| `job_change` | เปลี่ยนอาชีพขั้น 1 / 2 | `tier`, `job`, `gems` |
| `shop_open` | เปิดร้านเพชร | `shop` |
| `purchase` | ซื้อด้วยเพชร | `stage` (tap/ok/fail), `sku`, `price`, `pay` (free_gem/paid_gem/iap), `reason` |
| `gacha_roll` | สุ่ม option (โรงตีเหล็ก) | `lines`, `locked`, `gems` |

**Props ที่ติดทุก event:** `app_version` (version@เวลา build) · `platform` (web/android) · `touch` · `base_lv` · `job` · `job_lv` · `job2` · `clears` · `cfg` (live config release) · `first_day` · `ch_utm_*` (ช่องทางตอนเปิดครั้งแรก) · `$session_id` (UUIDv7, ตัด session เมื่อเงียบ 30 นาที)

**ไม่ส่งเด็ดขาด:** ชื่อตัวละคร, อีเมล, user id ของ cloud save, save blob

## 3. FTUE funnel (ลำดับ step)

`title` → `create_open` → `char_created` → `hub_first` → `run1_start` → `run1_win` → `d1_clear` → `job1` → `job2`

- เกมยังไม่มี tutorial แยก → ใช้ "ก้าวแรก" ของเกมเป็น funnel แทน
- เกณฑ์ tutorial 60/80% ใน roadmap เป็น analyst proposal → **ตั้งเส้นจริงจากจุดที่หลุดมากสุดใน 50–300 คนแรก** (gaps part2 §4.1)

## 4. UTM / ช่องทาง

- ลิงก์แจกต่อช่องทาง เช่น `...?utm_source=openchat&utm_campaign=beta1` · KOL แต่ละคน = `utm_content` ไม่ซ้ำกัน
- เก็บ **first touch** เท่านั้น (ลิงก์ทีหลังไม่ทับ) · ติดเป็น `ch_utm_*` ทุก event + `$set_once` ที่ person

## 5. ทางเลือกที่ไม่ได้เลือก

| ทาง | ข้อดี | ข้อเสีย | ผล |
|---|---|---|---|
| **PostHog capture API ตรง (ที่ทำ)** | ไม่มี SDK, funnel/retention สำเร็จรูป, free tier พอ | ไม่มี session replay / autocapture | ✅ |
| posthog-js SDK | autocapture + replay | bundle ใหญ่ขึ้น, autocapture บน canvas ได้ข้อมูลน้อยอยู่แล้ว | ❌ |
| Worker + Postgres เอง | ข้อมูลอยู่บ้านเรา | ต้องเขียน retention/funnel query เอง · เปลือง DB | ❌ ตอนนี้ |
| Cloudflare Analytics Engine | ฟรี 100k writes/วัน | เหมาะ server event (เพชร/gacha ฝั่ง server) | ⏭️ ทำทีหลัง |

## 6. ยังไม่ทำ (งานต่อ)

- [ ] **Server events** (แจกเพชร / spend / receipt) ผ่าน Analytics Engine — ตัวเลขเงินต้องมาจาก server ไม่ใช่ client
- [ ] **Privacy policy page** + ระบุว่าข้อมูลไปเก็บที่ PostHog (US/EU = ส่งข้อมูลข้ามประเทศ ต้องเขียนไว้) — ทำคู่กับ blocker odds page
- [ ] คำขอลบข้อมูล: ตอนนี้ "ไม่ส่ง" = ลืม id ในเครื่อง · ลบฝั่ง PostHog ต้องทำมือจาก distinct_id (ใส่ช่องทางติดต่อใน privacy policy)
- [ ] `purchase` แบบ `iap` (ซื้อเพชรเงินจริง) เมื่อต่อ Google Play Billing
- [ ] crash/error event (`window.onerror`) — ใช้คู่กับ Android vitals ตอนทำ Capacitor
- [ ] Pre-register ตาราง gate + ขนาด cohort ลง doc ก่อนเปิด closed beta (gaps part2 §4.2)
