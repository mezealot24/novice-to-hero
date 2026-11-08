# Novice to Hero: Roadmap Strategy พ.ย. 2026 → Beta

_ผู้จัดทำ: Game Market Analyst | วันที่วิเคราะห์: 2026-11-07 | อ้างอิง [n] ดูท้ายรายงาน_

## สรุป 5 บรรทัดแรก: ไปทางไหน + ทำไม
- **ไปทาง: คง turn-based idle/roguelite (Capybara Go-like) + เปิด beta บน Android/web ในไทยก่อน; "ยังไม่ pivot" เป็น real-time ARPG** (Steam = ตัวเลือกเฟสหลัง ไม่ใช่เป้าหลัก)
- **ทำไม 1:** สมมติฐาน "Steam ตลาดแย่" ไม่ถูกเต็มตัว ตลาด *โต* แต่ *กระจุก*: เกม >$100k เพิ่มเป็น 5,863 เกมในปี 2025 [1] แต่ ~63% ของเกมใหม่ Q1 2026 มีรีวิว 0-9 อัน [2] และส่วนแบ่งรายได้ของเกมใหม่ลดเหลือ 21% [3] → เกม F2P gem/cosmetic ของ solo dev ไม่ใช่ลูกค้าธรรมชาติของ Steam
- **ทำไม 2:** ไม่มีข้อมูลที่ยืนยันได้ว่า ARPG-lite ให้ demand/retention/รายได้ดีกว่า idle; ToS บน PC แทบไร้ผู้เล่น (peak ล่าสุด ~187 CCU) [4]; real-time เพิ่มความเสี่ยง performance บนมือถือ low-end [5] และต้นทุน animation (ข้อสรุปนี้เป็น inference ไม่มีแหล่งเทียบต้นทุน)
- **ทำไม 3:** ไทยคือตลาดใช้จ่ายสูงสุดใน SEA ($162M IAP ใน Q1 2025) [6] แต่ผู้เล่นใช้เงินกับเกมค่ายใหญ่ และ Ragnarok nostalgia แออัด (Gravity ออก Ragnarok ใหม่หลายเกม รายได้ Origin/M Classic ใน SEA ลดลง Q2 2026) [7] → ใช้ไทยเป็น *beta market* ไม่ใช่ตัวเลข revenue forecast
- **Blocker ก่อน beta (เฟสปัจจุบัน = ปลาย Content → ก่อน Beta):** analytics, cloud save/identity, server-authoritative gems, หน้าแสดง odds (gacha disclosure), art จริงขั้นต่ำ, และ build/performance บน Android low-end

---

## 0. สถานะข้อมูล (อ่านก่อน)
- ตัวเลขส่วนใหญ่เป็น **ประมาณการบุคคลที่สาม** (Gamalytic, GameDiscoverCo, Alinea, AppMagic, Sensor Tower) ไม่ใช่ข้อมูล Valve/Apple/Google โดยตรง ยกเว้นที่ระบุ
- แท็ก: **[ยืนยัน]** = แหล่งปฐมภูมิ/ทางการ, **[รอง]** = ผ่านสื่อ/บล็อกสรุป, **[ไม่ยืนยัน]** = แหล่งอ่อน/โฆษณา/ขัดแย้ง, **[inference]** = ข้อสรุปของผู้วิเคราะห์ ไม่ใช่ข้อเท็จจริงจากแหล่ง
- **สิ่งที่ไม่รู้ (ระบุตรง ๆ):** payer conversion / ARPDAU / D1-D7-D30 เฉพาะ ARPG หรือ idle ปี 2025-26 ไม่มีข้อมูลน่าเชื่อถือ; ต้นทุน dev/art เปรียบเทียบสองแนวเกมไม่มีข้อมูล; ตัวเลข ARPU ไทยที่นิยามชัดเจนไม่มี; revenue/1k plays ของ Poki/CrazyGames ที่ยืนยันได้ไม่มี; ข้อมูลมือถือ iOS/Android ระดับตลาด (Sensor Tower รายประเทศไทยแยกแนวเกม) ไม่ได้เข้าถึง

---

## 1. Q1: ตลาด Steam PC indie "แย่" จริงไหม

**คำตอบสั้น: ไม่ใช่ "หดตัว" แต่ "แข่งขันสูงและกระจุก" — สมมติฐานทีมถูกครึ่งเดียว**

| ตัวชี้วัด | ตัวเลข | วันที่ | ความน่าเชื่อถือ | แหล่ง |
|---|---|---|---|---|
| เกมออกใหม่ปี 2025 | ~20,000-21,000 (ต่างกันตาม tracker: 20,008-21,344) | ม.ค.-ส.ค. 2026 | รอง (tracker ไม่ตรงกัน) | [8][9] |
| เกมออกใหม่ 2026 YTD | 16,115 (ถึง 20 ส.ค.), ~69.5/วัน | 2026-08-20 | รอง (SteamDB ผ่านสื่อ) | [9] |
| สัปดาห์สถิติ | 720 เกม (24-30 ส.ค.) 530 เกมมีรีวิว 0-9 | 2026-09 | รอง (ยังไม่มีเวลาสะสมรีวิว) | [10] |
| เกมรายได้ >$100k (ทั้ง catalog) | 5,863 ในปี 2025 vs ~3,000 ในปี 2020 | 2026-03-10 | ยืนยัน (Valve ที่ GDC ผ่านสื่อ) | [1] |
| สัดส่วนเกมที่ออกปี 2025 ที่ >$100k | ~8.5% (~1,700/~20k); 2024 ~7% | 2026-03-13 | ประมาณการ GameDiscoverCo | [11] |
| >$500k | ~3% (2025) vs ~2.5% (2024) | 2026-03-13 | ประมาณการ | [11] |
| >$1M | ~1.5% (~300 เกม) | 2026-11-02 | **ไม่ยืนยัน** (aggregator อ้างต่อ Alinea) | [12] |
| ใต้ $100 / ใต้ $1,000 | ~40% / ~65.9% | 2025-10-21 | ประมาณการ Gamalytic **ปีไม่จบ** → ประเมินหางต่ำเกินจริง | [13] |
| Median รายได้ | **ไม่ทราบ** ช่วงขัดแย้ง $249-$2,302 (วิธีต่างกัน ~7-11 เท่า) | 2025-26 | **ไม่ยืนยัน** | [12] |
| เกมถึง 1,000 รีวิว | 337 (2022) → 608 (2025), อัตราสำเร็จ 2.99% | 2026-01-27 | รอง (Zukowski/VGInsights) | [14] |
| ยอดตลาด Steam | H1 2026 ≈ $11.1B (+14.5% YoY) | 2026 | ประมาณการ Alinea | [3] |
| ส่วนแบ่งรายได้ของ "เกมใหม่" | 29% (H1 2024) → 27% → **21%** (H1 2026) | 2026 | ประมาณการ Alinea | [3] |
| Wishlist → ยอดขาย | copies/wishlist เดือนแรก 0.45 → **0.22** (2020-22 vs 2023-25); n=34 vs 126 | 2026-10-15 | ตัวอย่างเล็ก | [15] |
| First-week/wishlist (เกม ≥25k wishlists) | median 0.15x | 2025-11-03 | รอง (GameDiscoverCo) | [15][16] |
| ค่าธรรมเนียม | $100/เกม (คืนเมื่อ gross $1,000); 30% (25% >$10M, 20% >$50M); เฉลี่ยจริงปี 2025 = 24% | 2026-03 | ยืนยัน | [17][18] |

**อ่านผล (so what):**
- **ฝั่ง "แย่":** ส่วนแบ่งของเกมใหม่ลดลง, wishlist yield ลดครึ่ง, Next Fest demos +66% YoY (4,382 ใน มิ.ย. 2026) [19]
- **ฝั่ง "ไม่แย่":** เกม >$100k เพิ่ม ~2 เท่าใน 5 ปี [1], อัตรา >$100k/>$500k ของรุ่นใหม่ขยับขึ้น [11], Zukowski เรียกว่า "อาจเป็น indie golden age" แต่ "3% ... ยังยากมาก" [14]
- **ใช้วางแผน:** ตั้งสมมติฐาน "top ~8% ถึง $100k gross" (≈ $70-76k net หลัง cut 24-30% ก่อนหักต้นทุน [inference จาก 11,18])
- **Rule ต่อ wishlist (คำนวณเอง ไม่ใช่ benchmark เผยแพร่):** 10k wishlists ≈ 1.5-2.2k copies เดือนแรก [inference จาก 15]
- **ไม่ครอบคลุม:** ไม่มีข้อมูล ARPG/dungeon-crawler เฉพาะบน Steam; roguelite บูมแต่กำลัง saturate (releases 432 → 1,926 ระหว่าง 2021-2025) [20] (Substack เดียว)

**ข้อสรุปสำหรับ Novice to Hero:** Steam เป็นตลาด hit-driven; เกมนี้เป็น F2P + gem/cosmetic บน browser/mobile ซึ่งไม่ตรงกับโมเดล premium ของ Steam → ไม่ใช่ช่องทางแรก (ดู §2) **ข้อสังเกตเรื่องการอ้างตัวเลข:** อย่าอ้าง "median" ในเอกสาร MKT จนกว่าจะมีข้อมูลที่ตรงกัน

---

## 2. Q2: เปรียบเทียบช่องทางปล่อยเกม

| ช่องทาง | ขนาดตลาด/ผู้ใช้ | ค่าธรรมเนียม | ความยากด้าน discoverability | ความเหมาะกับ Phaser web build |
|---|---|---|---|---|
| **Steam** | record 42M peak concurrent (client เปิด) ต้น 2026 [ไม่ยืนยัน: โน้ตวิจัยไม่ระบุต้นทางชัดเจน อย่าอ้างภายนอกจนกว่าจะเช็ก]; ~20k เกม/ปี [8] | 30% (เฉลี่ยจริง 24%) + $100/เกม [17][18] | **สูงมาก** (เกมใหม่ 63% รีวิว 0-9 [2]; thresholds ของ Popular Upcoming/Personal Calendar สูงขึ้น — Substack เดียว ไม่ใช่ Valve ยืนยัน [19]) | ต้องห่อ Electron/Tauri/NW.js — **ไม่มีแหล่งอ้างความยากง่าย**; โมเดล F2P+gem ไม่ใช่ที่นิยม (ไม่ได้วิจัย) |
| **Google Play (Android)** | ไม่มีข้อมูลขนาดตลาดระดับ store; SEA mobile IAP $625M ใน Q1 2025, ไทย $162M [รอง][6] | 10% ของ $1M แรก (+5% ถ้าใช้ Play Billing) มีผล 2026-06-30 เฉพาะ US/UK/EEA; ประเทศอื่นทยอยถึง ก.ย. 2027 → **ไทยน่าจะยังเรทเดิม** [inference] [22] | ปานกลาง-สูง (แข่งกับเกมค่ายใหญ่); ต้อง closed test 12 คน × 14 วัน (บัญชีใหม่หลัง 2023-11-13) [ยืนยัน][23] | ดี ผ่าน Capacitor; ต้องจัดการ canvas/touch/IAP plugin [24]; performance low-end เสี่ยง [5] |
| **App Store (iOS)** | ไม่มีข้อมูลตลาดที่ได้มา | 15% ถ้ารายได้ <$1M (Small Business Program) [ยืนยัน][25] | ปานกลาง-สูง | ต้องใช้ Mac/Xcode [24]; **Apple 4.2: แอปต้องมากกว่า "เว็บแพ็กใหม่"** → เสี่ยงถูกปฏิเสธถ้าเป็น wrapper ล้วน [ยืนยันข้อความ guideline; การประยุกต์กับเกม = inference] [26] |
| **Poki** | ไม่มีข้อมูล MAU ที่ยืนยัน | ad-only, **ไม่มี IAP**; 100% จากผู้เล่นที่เราพามา, 50/50 จากผู้เล่นที่ Poki พามา [ไม่ยืนยัน: บล็อกบุคคลที่สาม] [27] | ผ่านคัดเลือก: Soft Release 2-3 สัปดาห์ แล้ว Global อีก 2-3 สัปดาห์ ข้ามไม่ได้ [ยืนยัน][28] | **ไม่เหมาะ:** initial download <8 MB ตามบล็อกบุคคลที่สาม [ไม่ยืนยัน][27], เป้า "≥1 ad ต่อ DAU" [28], โมเดล gem IAP ใช้ไม่ได้ |
| **CrazyGames** | ไม่มีข้อมูล MAU | ไม่ระบุสัดส่วนในเอกสารทางการ (อ้าง 60% ads/70% IAP จากบล็อก [ไม่ยืนยัน]) [29][30] | ผ่านคัดเลือก: Basic Launch (ไม่มี monetization) → Full Launch เฉพาะเกมที่คัด [ยืนยัน][31] | พอใช้: IAP แบบ "Invite Only" ผ่าน Xsolla [31] |
| **itch.io** | ไม่ทราบ | revenue share ปริยาย 10% + processor fee (~$0.30+2.9%) [ยืนยัน][32] | ต่ำเรื่องการเข้า, **รายได้ต่ำ**: เกมเสียเงิน ~80% ได้ $0-50/เดือน [ไม่ยืนยัน][30] | ดีมาก (HTML5 ตรง ๆ) เหมาะ playtest/ demo |
| **Telegram Mini App** | Telegram >1B MAU (ประกาศ มี.ค. 2025, แหล่ง sponsored) [ไม่ยืนยัน][33] | Stars ~70% ถึง dev (ประมาณการ Telegram ผ่านบล็อก) [รอง][34] | ผู้ใช้เยอะแต่ **retention 5-20%, ARPU ต่ำ/ไม่เสถียร** (Helika Q4 2024; Helika เกี่ยวข้องกับ TON) [รอง][35] | ดี (web-embedded) แต่เป็นทดลอง acquisition ไม่ใช่ช่องรายได้ที่พิสูจน์แล้ว |
| **Discord Activity** | Apps/Activities เข้าถึง >25% ของ MAU (อ้างโดย Discord ผ่านบล็อก) [ไม่ยืนยัน][36] | 15% (≤$1M) / 30% [รอง — ต้องเช็กกับ docs Discord] [36] | ไม่มี storefront; ค้นพบผ่านเซิร์ฟเวอร์ | build ต้องไม่ยิง external request (CSP) [36]; เหมาะเกมสั้น/social ไม่ใช่ solo ARPG [inference] |

**สรุปช่องทาง [inference จากตารางข้างบน]:**
- **เบต้าหลัก:** Google Play closed test (บังคับอยู่แล้ว ใช้เป็น tech beta ฟรี) + web build (domain เอง/itch.io unlisted) + ชุมชน Facebook/Discord ไทย
- **ไม่ทำตอนนี้:** Poki (monetization/ขนาด/โมเดลไม่ตรง), Telegram (retention + ความเสี่ยง crypto-hype), Discord Activity
- **รอทีหลัง:** iOS (Apple 4.2 + ต้อง Mac), Steam (ถ้าจะทำต้องเปลี่ยนโมเดล/ใช้เวลาสะสม wishlist)
- **หมายเหตุสำคัญ:** Apple link-out fee ยังไม่ final (ยื่นเสนอ 15%/10%/5% วันที่ 2026-08-13) [รอง][37] → อย่าวางแผนจ่ายผ่านเว็บเลี่ยง store

---

## 3. Q3: เทียบแนวเกม

| เกณฑ์ | Turn-based idle/roguelite (Capybara Go-like) | Action ARPG-lite (ToS-like, top-down real-time) |
|---|---|---|
| **Demand (หลักฐาน)** | Capybara Go (Habby) >$100M player spend ใน ~3.5 เดือนหลัง soft launch (AppMagic ผ่าน PocketGamer.biz; ก.พ. 2025) [รอง][38]; ~$19M/เดือน (DoF ก.ค. 2025) [รอง][39]; Steam: Idle/Incremental 27 เกมถึง 1,000 รีวิวในปี 2025 [14] | **ไม่มีข้อมูลยืนยัน** สำหรับ ARPG/dungeon-crawler เฉพาะ; Diablo Immortal $100M ใน ~2 เดือน (2022, เก่า, IP ใหญ่) [40] |
| **คู่แข่ง** | Habby ทำ follow-up (PunBall, SSSnaker) ยังไม่เกิน $1.5M/เดือน → แม้ค่ายที่พิสูจน์แล้วก็พลาดบ่อย [39]; Vampire Survivors-likes "หลายร้อย" เกม [41 — หัวข่าวเท่านั้น] | Tree of Savior (PC, JP) ~187 CCU ปัจจุบัน, peak 2,144 (2020-05) [4]; ToS NEO (มือถือ) เปิด 2025-05-31 ไม่มีข้อมูลรายได้ [42]; Ragnarok family ครอง SEA [7]; "dude with a sword" มีคู่แข่ง production สูง (Crimson Desert) ไม่แนะนำเป็นโปรเจกต์แรก [2] |
| **ต้นทุน art/dev** | **ไม่มีข้อมูลเทียบ** [inference: UI/ตัวเลขเป็นหลัก ใช้ static art ได้ — Capybara Go เองเน้น UI] | **ไม่มีข้อมูลเทียบ** [inference: ต้อง animation set, hitbox, balance ต่อ class; แต่ไม่ต้อง netcode ถ้า single-player] |
| **ความเสี่ยงทางเทคนิค** | ต่ำ-กลาง: sprite น้อย รับ 30 FPS ได้ [inference] | สูงกว่า: Phaser 3.87 กระตุกบน Galaxy M04 ใน WebView (ฟอรัม ธ.ค. 2024; ลดได้บางส่วนด้วย cap 30 FPS) [รอง][5]; ไม่มี benchmark entity count |
| **Retention** | **ไม่พบ D1/D7/D30 ของ Capybara Go หรือ genre**; ใช้ median ทุกแนว: D1 ~22%, D7 ~4%, D30 ~0.7% (GameAnalytics ข้อมูลปี 2025 เผยแพร่ 2026-06) [รอง][43][44] | ไม่มีข้อมูล เหมือนกัน |
| **รายได้ต่อผู้เล่น** | Archero lifetime rev/download ~$4, Archero 2 >$11 (DoF 2025-07) [รอง][39]; Capybara Go ~80% IAP / ~20% ads (ตัวเลขผู้เขียน UA case ธ.ค. 2024 ไม่ระบุวิธี) [ไม่ยืนยัน][45]. **ทั้งหมดอาศัย UA งบมหาศาล + ตลาดเกาหลี/ไต้หวัน** (KR 28%, TW 17%, US 15%) [38] | ไม่มีข้อมูล ARPG payer conversion ที่เชื่อถือได้; RPG ~3% daily payer conversion (top 15% ปี 2018-19, **เก่า 7 ปี**) [ไม่ยืนยัน][46] |
| **เข้ากับกฎ no pay-to-win** | ใช้ได้ แต่ ads/IAP ผลักรายได้ (ข้อสังเกต Playio: ad ขึ้น payer conversion ลดใน top games) [รอง][46] | ใช้ได้ |

**ข้อสรุป [inference]:** ทั้งสองแนวไม่มีข้อมูลรองรับตัวเลขรายได้ของ solo dev; ตัวตัดสินจึงเป็น **ต้นทุน/ความเสี่ยงในการ ship** (idle ต่ำกว่า) และ **ความเร็วสู่ตัวเลข retention จริง** ซึ่งชนะด้วย turn-based เพราะ meta systems เสร็จแล้ว

---

## 4. ตัวเลือกเชิงกลยุทธ์ (Platform × Genre)

| | **A. Android + Web, turn-based (แนะนำ)** | **B. Steam, turn-based/ปรับให้ premium-ish** | **C. Pivot real-time ARPG, ออกมือถือ/เว็บ** |
|---|---|---|---|
| **ข้อดี** | ใช้ของที่มี (meta เสร็จ); Google Play closed test บังคับอยู่แล้ว = beta ฟรี [23]; fee ต่ำสุดสำหรับรายเล็ก (Google 10% US/UK/EEA; ไทยยังไม่ยืนยัน) [22]; ไทยเป็นตลาดใช้จ่ายสูง SEA [6]; Facebook/KOL คือช่องค้นพบหลัก (>70% ผู้เล่นไทย, Antom 2025-11) [รอง][47] | ตลาดโตและมีเพดานสูง [1][3]; Playtest ฟรี ไม่ต้อง NDA [48] | ใกล้ภาพลักษณ์ ToS/Ragnarok ตามที่ทีมสนใจ; ต่างจากคู่แข่ง idle |
| **ข้อเสีย** | ไม่มีข้อมูลรายได้ genre; ผู้เล่นไทยเงินส่วนใหญ่ไปเกมค่ายใหญ่ [inference]; art โค้ด ต้องปรับให้ผ่าน store; iOS ล่าช้า | Discoverability ยากมาก [2][10]; wishlist yield ลดครึ่ง [15]; ไม่ใช่โมเดล F2P gem; ไม่ได้วิจัย F2P บน Steam; cut 24-30% [18] | ต้นทุน art/animation สูงขึ้น [inference]; performance risk [5]; ToS ไร้แรงฉุดบน PC [4]; ไม่มีหลักฐาน demand; ทำให้ beta เลื่อน; solo dev |
| **เวลาไป beta [inference]** | สั้นที่สุด | กลาง (store page + wishlist สะสมหลายเดือน) | ยาวที่สุด |
| **ความเสี่ยงหลัก** | อาจเจอ "ตลาดแออัด/ไม่มี UA" | รายได้ใกล้ศูนย์ถ้าไม่มี wishlists | ไม่เสร็จ/ไม่ ship |
| **คำตัดสิน** | **เลือก** | เก็บเป็นทางเลือกเฟสหลัง หลังมีข้อมูล retention | **ไม่ทำก่อน beta**; ทำเป็น prototype/mode แยก ถ้า D7 ผ่านและมีเวลา |

---

## 5. Q4: กลุ่มเป้าหมาย SEA/ไทย (ความเป็นไปได้ของ nostalgia Ragnarok/ToS)

| ประเด็น | ข้อมูล | ความน่าเชื่อถือ | แหล่ง |
|---|---|---|---|
| มูลค่าไทย | ~฿36.1B (~$1B) มูลค่าตลาดในประเทศ (Kasikorn, 2025) vs "ใช้จ่ายผู้เล่น >$2B ในปี 2026" (Niko, 2026-08-05) → ต่างเพราะนิยาม | รอง; ขัดแย้งตามนิยาม | [49][50] |
| ผู้เล่นไทย | 32-42M ตามแหล่ง | รอง | [49][51] |
| ใช้จ่ายไทย Q1 2025 | $162M IAP (-6% QoQ); อินโดฯ $118M, มาเลเซีย $103M | รอง (Sensor Tower ผ่านสื่อ; ไม่รวม web shop) | [6] |
| SEA-6 | $5.6B (2025), +4.7% YoY, เติบโตเฉลี่ย 4.8% ถึง $7.0B ปี 2030 | รอง | [50] |
| MMORPG | รายได้ MMORPG ดั้งเดิมในภูมิภาคลด ~17-20% (Q1 2025) | รอง | [6] |
| การชำระเงิน | บัตรใช้ ~20% ของ online purchase ไทย; PromptPay/TrueMoney หลัก; >35% ชอบจ่ายนอกแอป | รอง (Xsolla 2025-06, Niko 2026-08) | [50][52] |
| การค้นพบเกม | >70% ผ่าน Facebook/KOL livestream; Discord/Facebook Groups ช่วย retention | รอง | [47][53] |
| Ragnarok | เกมไทยเดิมเปิดปี 2002 (ปิด 2016 โดย Asiasoft) [54]; Gravity Q2 2026: รายได้ Origin / M Classic / Idle Adventure Plus ใน SEA ลดลง, แต่ Ragnarok Online ใน TH/TW/HK/MO เพิ่ม; เปิดใหม่หลายเกมถึง 2027 [7] | รอง | [7][54] |
| Tree of Savior ใน SEA | ไม่มีข้อมูลปัจจุบัน (มีแค่กระทู้ 2016: ผู้เล่นส่วนใหญ่ SEA/ใต้ตอนใต้) | **ไม่ยืนยัน/เก่า** | [55] |
| Thai-made | 2-3% ของรายได้ในประเทศ; ยอดขายเกมไทยในประเทศ -43.6% ปี 2024 | รอง (Wikipedia / Kasikorn) | [49][56] |

**ประเมินโอกาส [inference]:**
- **โอกาสจริง:** ชุมชนไทยที่ใช้จ่ายสูง, ช่องทางชุมชน (Facebook/Discord) ถูกกว่า UA, ภาษาไทยเป็นจุดต่างจากเกมนำเข้า
- **ข้อจำกัด:** nostalgia Ragnarok *ถูกทำเป็นสินค้าอยู่แล้ว* ("Classic"/"Origin Classic") และรายได้บางเกมใน SEA ลด [7] → เกมเราไม่มี IP ต้องขายที่ *loop/ระบบ* ไม่ใช่ชื่อ; อายุผู้เล่น RO ~35-45 ปีเป็นการคำนวณจากปีเปิดตัว ไม่ใช่สถิติ
- **อย่าใช้ตลาดรวมทำ forecast:** เพดานคือ discoverability ไม่ใช่ขนาดตลาด [inference]
- **ไม่ทราบ:** ขนาดกลุ่ม nostalgia, อายุ/รายได้ผู้เล่นไทย, ความทนต่อ gacha (ไม่มีแบบสำรวจไทย), ค่าจ้าง KOL, ARPU ไทยที่นิยามชัด (ตัวเลข $393/player ของ Antom และ $1,010 ของ Xsolla ขัดกัน ไม่ควรอ้าง)
- **ขยายเฟสถัดไป:** อินโดนีเซีย (>126M gamers, Niko 2026-08) และฟิลิปปินส์ (inference จากแหล่งเดียวกัน) [50]

---

## 6. Q5: กลยุทธ์ Beta

### 6.1 ที่ไหน / ปิด-เปิด

| ขั้น | ขนาด | ที่ไหน | เป้าหมาย | ความเชื่อถือ |
|---|---|---|---|---|
| Alpha/Closed | 12-50 | Google Play closed test (บังคับ 12 คน/14 วันต่อเนื่อง) + web build ผ่าน Discord ไทย | Bug, FTUE, crash, sanity ของ economy | 12 คน/14 วัน = ยืนยัน [23]; ขนาดชั้น = inference |
| Closed+ | 100-300 | Facebook Group/Discord + Play closed/open test | Funnel drop-off, economy | inference; อ่านได้แค่ทิศทาง |
| Open/soft launch | ≥1,000 installs/cohort | Google Play (ไทย) + web | D1/D7, payer เบื้องต้น | ~896 installs เพื่ออ่าน D1 ≈30% ±3 จุดที่ 95% [รอง][57] |

- **ข้อควรระวัง:** Google อาจปฏิเสธหลัง 14 วันถ้า engagement ต่ำ ไม่ใช่แค่จำนวนคน (แหล่งบล็อกชุมชน) [ไม่ยืนยัน][58]; อย่าใช้บริการ tester จ้าง (คุณภาพ/นโยบายไม่ยืนยัน)
- **Payer 1,000 installs ≈ 20-50 คน** (payer share 2% casual / 5% midcore, a16z ต.ค. 2023) [รอง][59] → ตัดสิน go/stop ด้วย funnel + D1/D7 ไม่ใช่รายได้
- **D30:** ใช้ทิศทางเท่านั้น จนกว่าจะมีหลักพัน installs [inference จาก 44,59]
- **Soft-launch ตลาด:** ผู้เชี่ยวชาญแนะ Philippines/Indonesia สำหรับทดสอบ ad tolerance ของเกม hypercasual; midcore แนะ Poland/Türkiye/Brazil/ประเทศอังกฤษ [PocketGamer.biz 2026-01-06][60] ไม่มีแหล่งเรื่องไทยเป็นตลาด soft-launch แต่ a16z บอกให้เลือกตลาดตรงกลุ่มเป้าหมาย [59] → **ใช้ไทยเป็นตลาดเบต้าหลัก** [inference], ตลาดราคาถูกอาจ *ประเมิน payer conversion ต่ำเกิน* (ไม่ยืนยัน)
- **Steam Playtest:** ข้ามไปก่อน ใช้เมื่อเลือก Steam เท่านั้น [48]

### 6.2 Metrics และ benchmark (ตัวเลขตลาด = GameAnalytics ปี 2025, เผยแพร่ 2026-06-04; mobile, 16,262 เกม MAU ≥1,000) [44]

| Metric | Stop/rework | Continue-fix | Go | หมายเหตุสถานะ |
|---|---|---|---|---|
| D1 | <22% | 22-30% | ≥30% | median ~22% [43]; top 25% ~30%, top 10% ~40% [44]. เกณฑ์ = **เสนอเอง** |
| D7 | <4% | 4-7% | ≥7% | median <4%, top 25% 6-7%, top 10% 11-12% [44]. เกณฑ์ = **เสนอเอง** |
| D30 | <0.8% | 0.8-1.8% | ≥1.8% | median 0.69-0.79%, top 25% 1.6-1.8% [44]; **ตัวอย่างน้อย อ่านเป็นทิศทาง** |
| Crash (user-perceived) | ≥1.09% | 0.5-1.09% | <0.5% | 1.09% = เส้น bad behavior ของ Google (ยืนยัน) [61]; 0.5% = **ข้อเสนอเอง** |
| ANR | ≥0.47% | 0.2-0.47% | <0.2% | 0.47% = Google [61]; 0.2% = **ข้อเสนอเอง** |
| Payer conversion | <1% | 1-3% | ≥3% | **อ่อนมาก**: RPG 2018-19 + a16z 2-5% [46][59]; ตีความเป็น directional |
| Session length | <3 นาที | 3-5 | ≥5 | top 25% ~5.2 นาที [44]; idle ควรดู sessions/day (top 25% 5.3-5.7) แทน [44] |
| Tutorial completion | <60% | 60-80% | ≥80% | **ไม่มีแหล่ง** (วิจารณญาณ) |
| k-factor | — | — | >0.3 = โบนัส | **ไม่มี benchmark** |

- หมายเหตุ: กฎ 40/20/10 ล้าสมัย; ผู้สรุปเสนอ 35/15/5 (ไม่ใช่ของ GameAnalytics) [43]
- **ห้าม nerf จาก bot อย่างเดียว** (ตามกฎโปรเจกต์); bot ใช้ทดสอบ crash, exploit economy, pacing — ไม่ใช่ความสนุก

### 6.3 Analytics stack ที่เหมาะ (solo + Cloudflare)
- PostHog free: 1M events, 5K session recordings/เดือน, retention 1 ปี [ยืนยัน][62] สำหรับ client funnel
- Cloudflare Workers Analytics Engine: free 100k writes/วัน [ยืนยัน][63] สำหรับ server events (แจกเพชร, gacha roll, ซื้อ) — **ต้อง sample/batch** ถ้าผู้เล่นหลักพัน
- ต้อง **anonymous player ID ตั้งแต่ session แรก** (ไม่งั้น D1/D7 ผิด) [inference]
- PDPA ไทย: ต้องมี consent ชัดเจน ณ จุดเก็บ; <10 ปีต้องให้ผู้ปกครองยินยอม (PDPC 2022-09-07) [64]; Apple 5.1.1 ต้องมี privacy policy + ลบบัญชีในแอป [26]

---

## 7. Roadmap ตามเฟส (เริ่ม พ.ย. 2026) พร้อมเกณฑ์ Go/Stop

> เฟสปัจจุบันตามโปรเจกต์ = **ปลาย Content → เตรียม Beta** (core loop และ meta ครบ)
> ระยะเวลาเป็นประมาณการของผู้วิเคราะห์ [inference] แต่ละชิ้นแบ่งให้จบใน 1 session

| เฟส | ช่วง (ประมาณ) | Milestones | Go criteria | Stop/Rework criteria |
|---|---|---|---|---|
| **0. Now: Pre-beta hardening** | พ.ย.-ธ.ค. 2026 (4-6 สัปดาห์) | 1) analytics (PostHog + Analytics Engine) + anonymous ID 2) cloud save ผูก Better Auth 3) gems/zeny/gacha ตัดสินที่ server 4) หน้า odds ต่อ outcome + นโยบายความเป็นส่วนตัว 5) art จริงขั้นต่ำ (UI, ไอคอน, ตัวละครหลัก, จอ title/hub) 6) เก็บ tester list 12+ คน | Crash <1.09% ในเครื่อง test; cloud save ทดสอบสลับเครื่องผ่าน; odds screen ครบ; FTUE ผ่านโดยคนนอก 5 คนโดยไม่ช่วย | Economy exploit ที่ client ยังแก้ได้; save หายใน WebView/Capacitor |
| **1. Prototype/Decision spike** | ม.ค. 2027 (2-3 สัปดาห์) | Capacitor Android build บนเครื่อง low-end จริง; (ถ้าสนใจ) real-time combat เป็น *prototype จำกัดขอบเขต* แยก branch ไม่ใช่ pivot | Android build ≥30 FPS บนเครื่อง low-end ที่เลือก; ถ้าลอง real-time: ≥30 FPS ที่ entity จำนวนเป้าหมาย | FPS <30 ใน turn-based เอง → แก้ก่อนเข้า beta; real-time FPS ไม่ผ่าน → **ตัดทิ้ง** |
| **2. Closed beta** | ก.พ.-มี.ค. 2027 (≥14 วัน + ต่อ) | Google Play closed test (≥12 testers, 14 วันต่อเนื่อง [23]) + web build; 50-300 คน; Discord/Facebook Group ไทย; feedback form | Crash <1.09% และ ANR <0.47% [61]; tutorial completion ≥60% (เสนอเอง); D1 ≥22% (ไม่ต่ำกว่า median [44]); ไม่มี P0 economy/exploit | D1 <22% ติดกัน 2 รอบหลังแก้ FTUE → **หยุดเพิ่มคอนเทนต์ ย้อนแก้ core loop**; Google ปฏิเสธ production access → ขยายกลุ่มและเพิ่ม engagement |
| **3. Open beta/soft launch (ไทย)** | เม.ย.-มิ.ย. 2027 | เปิด Google Play production (ไทย) + web; ≥1,000 installs/cohort [57]; เริ่มทดลอง ads/IAP gem แบบ cosmetic; KOL ไทยเล็ก ๆ (ไม่มีข้อมูลราคา) | D1 ≥30%, D7 ≥7% (top-25%) **หรือ** D1 22-30% + D7 4-7% และแนวโน้มดีขึ้นรอบต่อรอบ; payer ≥1% (directional); ไม่มี complaint เรื่อง P2W/gacha ที่มีนัย | D7 <4% หลัง 2 รอบแก้ → **stop scaling/UA**; ย้อนเฟส 2 หรือพิจารณา reposition; อย่าตัดสินด้วย D30 ถ้า installs <หลักพัน |
| **4. (หลัง gate) ขยาย** | H2 2027+ | iOS (หลังตรวจ Apple 4.2), Indonesia/PH, Steam/อื่นถ้าข้อมูลหนุน, พิจารณา real-time mode | Unit economics อ่านได้ในตลาดเดียวก่อน (แนวทาง PocketGamer.biz) [60] | ยังไม่มี LTV/CPI อ่านได้ → ไม่ขยาย |

**กฎการตัดสิน (สรุป):**
- ผ่านเฟส 2→3 ต้องผ่าน **เสถียรภาพ (crash/ANR) + FTUE + D1 ≥ median**
- ผ่านเฟส 3→4 ต้องผ่าน **D7 ≥ 4% ขึ้นไป + payer มีสัญญาณ + ไม่มี policy/complaint blocker**
- เกณฑ์ตัวเลขทั้งหมดเป็น **ข้อเสนอที่อิง median/quartile ทั้งตลาดทุกแนว** ไม่ใช่มาตรฐานเฉพาะ ARPG/idle (ไม่มีแหล่ง)

---

## 8. ความเสี่ยงหลัก และมาตรการ

| # | ความเสี่ยง | หลักฐาน/สถานะ | ผลกระทบ | มาตรการ |
|---|---|---|---|---|
| 1 | **Loot-box / gacha disclosure** (+ gem "lock line" + Zeny reroll) | Apple 3.1.1: ต้องแจ้ง odds ของแต่ละประเภทไอเทม "ก่อนซื้อ" และ Google Play Payments policy ข้อ 7: ต้องแจ้งล่วงหน้าและใกล้จุดซื้อ — **ยืนยันจากหน้าทางการเมื่อ 2026-11-07** (หน้า Google ไม่แสดงวันที่อัปเดต) [26][65]; ไทย: คณะกรรมการกระทรวงมหาดไทย (รายงาน 2026-03-06) ว่ากล่องสุ่มที่ไม่แลกเงินจริงไม่เป็นการพนัน — ตอบเฉพาะคำถามเดียว ไม่ได้ระบุว่าผูกมัดทั่วไป [รอง][66]; ร่าง พ.ร.บ.เกม (จดทะเบียน/จัดเรต) สถานะ พ.ย. 2026 **ไม่ยืนยัน** [67] | Store reject / ความเสี่ยงกฎหมายภูมิภาค | แสดง odds ต่อ outcome; ห้ามซื้อสุ่มด้วยเงินจริงตรง ๆ; ห้าม cash-out/ซื้อขายไอเทมเป็นเงินจริง; เช็กว่า Zeny ซื้อด้วยเงินจริงได้หรือไม่ [inference]; ปรึกษาทนายก่อน launch (ไม่ใช่คำแนะนำทางกฎหมาย) |
| 2 | **localStorage-only save vs cloud save** | WebView/iframe อาจเสียข้อมูล [inference]; ไม่มี anonymous ID → D1/D7 ผิด [inference]; ต้อง server-authoritative gems เป็นเงื่อนไขของช่องทางเงินจริง (กฎโปรเจกต์) | ผู้เล่นเสียของ, metrics เพี้ยน, exploit | ทำ cloud save ผ่าน Better Auth/Workers ก่อน beta; ตั้ง ID ตั้งแต่ session แรก; migrate localStorage → cloud; เตรียม account deletion (Apple 5.1.1 [26]) |
| 3 | **Poki fit ต่ำ** | ไม่มี IAP [27], ขนาด <8MB (บล็อก) [27], Soft Release ข้ามไม่ได้ [28], เป้า ≥1 ad/DAU [28] | ใช้เวลา 5-8 สัปดาห์ [รอง inference] โดยโมเดลไม่ตรง | ไม่ทำ Poki ใน roadmap นี้; ถ้าอยากลอง ใช้ CrazyGames Basic Launch (SDK optional) เป็น audience test หลัง beta [31] |
| 4 | **Discoverability ต่ำ** | Steam: 63% เกมใหม่รีวิว 0-9 [2]; ไทย: Facebook/KOL คือช่องหลัก [47]; ไม่มีข้อมูลค่า KOL | Beta ได้คนไม่พอ → อ่านตัวเลขไม่ได้ | สร้างชุมชน Facebook Group/Discord ไทยตั้งแต่เฟส 0; ใช้ devlog ภาษาไทย; จุดขายเป็นระบบ (Cardforge/unique/tower) ไม่ใช่ IP; อย่าเสียเงิน UA ก่อน D1/D7 ผ่าน |
| 5 | **ต้นทุน pivot สำหรับ solo dev** | ไม่มีข้อมูลต้นทุนเทียบ; performance risk บน low-end [5]; ToS demand ต่ำ [4] | Beta ล่าช้า, เกมไม่จบ (ตรงข้ามกับเป้า "ship") | ห้าม pivot ก่อน beta; ทำเป็น spike ≤2-3 สัปดาห์ในเฟส 1 พร้อมเกณฑ์ FPS/ต้นทุน art; ตัดสินหลังมีข้อมูล D7 |
| 6 (เสริม) | **Apple 4.2 / wrapper ถูกปฏิเสธ** | Guideline: ต้องมากกว่าเว็บแพ็กใหม่ [26] | iOS ไม่ผ่าน | ออก Android + web ก่อน; เพิ่ม native feature (push, IAP native) ก่อนยื่น iOS |
| 7 (เสริม) | **PDPA / ผู้เยาว์** | PDPC 2022: <10 ปีต้องได้ความยินยอมผู้ปกครอง [64]; Niko: 67.5% ผู้เล่น SEA สนับสนุน 18+ age verification [50] | ปรับ onboarding/เรตอายุ | ใส่ consent screen + นโยบายความเป็นส่วนตัว; เช็ก cross-border transfer (Cloudflare/PostHog) กับที่ปรึกษา — ยังไม่ได้ตรวจสอบ |

---

## 9. สิ่งที่ยังไม่รู้ และงานวิจัยที่แนะนำต่อ
- ARPG vs idle: ต้นทุนจริง, retention, payer conversion 2025-26 → ใช้ข้อมูล beta ของเราเองแทน
- Sensor Tower/AppMagic รายประเทศไทย แยกแนว (ต้องซื้อ/ใช้ free tier)
- Google Play ไทยใช้ fee ใหม่เมื่อไร (สันนิษฐานก่อน ก.ย. 2027) [22]
- สถานะ พ.ร.บ.เกมไทย พ.ย. 2026; OCPB/กฎ gacha ของไทย อินโดฯ เวียดนาม ฟิลิปปินส์
- Steam: นโยบาย loot-box/F2P gem; ความยาก wrapper
- ค่า KOL/Facebook Ads ไทย; ขนาดกลุ่ม nostalgia Ragnarok/ToS
- Median รายได้ Steam รุ่น 2025-26 ที่ปรับวิธีให้ตรงกัน

---

## 10. รายการอ้างอิง
(วันที่ = วันที่เผยแพร่/เข้าถึงตามโน้ตวิจัย; "รอง" = แหล่งตัวกลาง)

1. PC Gamer, "Valve says over 5,000 games made over $100k on Steam last year", 2026-03-11 — https://www.pcgamer.com/gaming-industry/valve-says-over-5000-games-made-over-usd100k-on-steam-last-year
2. How To Market A Game (Zukowski), "2026 Q1 games", 2026-05-14 — https://howtomarketagame.com/2026/05/14/2026-q1-games/
3. Alinea Analytics, "Steam is having another record year" (+ GameDevReports) — https://alineaanalytics.substack.com/p/steam-is-having-another-record-year ; https://gamedevreports.substack.com/p/alinea-analytics-steam-reached-highest
4. SteamDB, Tree of Savior (Japanese Ver.) charts (ไม่ระบุวันที่ snapshot) — https://steamdb.info/app/1175730/charts
5. Phaser forum, "Performance issues in low end mobile devices", 2024-12-18 — https://phaser.discourse.group/t/performance-issues-in-low-end-mobile-devices/15002
6. Sensor Tower via GameDev Reports, SEA mobile Q1 2025, 2025-06-13 — https://gamedevreports.substack.com/p/sensor-tower-southeast-asia-mobile
7. Inven Global, "Gravity reports Q2 2026 results", 2026 — https://www.invenglobal.com/articles/24573/gravity-reports-q2-2026-results-operating-profit-up-402-year-on-year
8. HowToMarketAGame, "How many games were released in 2025", 2026-01-08 — https://howtomarketagame.com/2026/01/08/how-many-games-were-released-in-2025/
9. Notebookcheck, "Steam averages almost 70 new games a day in 2026", 2026-08 — https://www.notebookcheck.net/Steam-averages-almost-70-new-games-a-day-in-2026.1374113.0.html
10. LevelUp, "More than 700 new games debuted on Steam last week", 2026-09-06 — https://www.levelup.com/en/news/more-than-700-new-games-debuted-on-steam-last-week-but-almost-nobody-played-them/
11. GameDiscoverCo, "What Steam's 2026 biz update tells", 2026-03-13 — https://newsletter.gamediscover.co/p/what-steams-2026-biz-update-tells
12. steampageanalyzer.com, "Median Steam game 2026", updated 2026-11-02 (aggregator, ไม่ยืนยัน) — https://www.steampageanalyzer.com/blog/median-steam-game-2026
13. OpenCritic/DualShockers, 2025-10-21 — https://opencritic.com/news/22399/only-8-of-steam-games-gross-over-100-thousand-40-make-less-than-steam-listing-fees ; PC Gamer 2025-10-23 — https://www.pcgamer.com/games/with-over-13-000-new-games-on-steam-this-year-so-far-over-a-third-of-them-havent-even-made-enough-to-break-even-on-valves-submission-fee
14. HowToMarketAGame, "What the hell happened in 2025", 2026-01-27 — https://howtomarketagame.com/2026/01/27/what-the-hell-happened-in-2025/
15. Inven Global, "Steam wishlist inflation", 2026-10-15 — https://www.invenglobal.com/articles/27273/steam-wishlist-inflation-value-of-1-wishlist-cut-in-half-but-predictive-power-remains-unchanged
16. GameDiscoverCo via GameDevReports, "State of Steam", 2025-11-03 — https://gamedevreports.substack.com/p/gamediscoverco-the-state-of-steam
17. Steamworks docs, app fee — https://partner.steamgames.com/doc/gettingstarted/appfee
18. GameDiscoverCo, "Revealed: the numbers behind Steam's…", Valve year-in-review 2026-03-06 — https://newsletter.gamediscover.co/p/revealed-the-numbers-behind-steams
19. Recognizing Patterns, "The roguelite cull hasn't happened", 2026 — https://recognizingpatterns.substack.com/p/the-roguelite-cull-hasnt-happened
20. (ใช้แหล่งเดียวกับข้อ 19 สำหรับข้อมูล roguelite releases/revenue ไม่ใช่แหล่งแยก)
21. TechSpot, Valve GDC talk, 2026-03 — https://www.techspot.com/news/111663-game-developers-cash-steam-sees-5863-titles-earn.html
22. MacRumors, "Google Play store fee change", 2026-06-24 — https://macrumors.com/2026/06/24/google-play-store-fee-change/
23. Google Play Console Help, closed testing requirement — https://support.google.com/googleplay/android-developer/answer/14151465?hl=en
24. Phaser tutorial, Capacitor iOS/Android — https://phaser.io/tutorials/bring-your-phaser-game-to-ios-and-android-with-capacitor
25. Apple Developer, Small Business Program — https://developer.apple.com/app-store/small-business-program/
26. Apple App Store Review Guidelines (3.1.1, 4.2, 5.1.1, 2.3.6) — https://developer.apple.com/app-store/review/guidelines/
27. Cinevva, Poki guide (บุคคลที่สาม) — https://app.cinevva.com/guides/publish-game-poki
28. Poki release process — https://sdk.poki.com/releaseprocess.html
29. CrazyGames docs FAQ — https://docs.crazygames.com/faq/
30. Cinevva, web game monetization guide (ไม่ยืนยัน) — https://app.cinevva.com/guides/web-game-monetization
31. CrazyGames docs, requirements — https://docs.crazygames.com/requirements/intro/
32. itch.io docs, payments — https://itch.io/docs/creators/payments
33. The Block (sponsored), Telegram 1B MAU, 2025-03-28 — https://www.theblock.co/post/348630/telegram-surpasses-1-billion-monthly-active-users
34. DEV Community, Telegram Stars monetization — https://dev.to/ton-adoption/monetizing-telegram-mini-apps-stars-revenue-and-ton-payments-24fk
35. The Block, Helika Q4 2024 report, 2025-02-07 — https://www.theblock.co/news/web3/2025-02-07-telegram-games-had-trouble-earning-revenue-retaining-users-in-q4-report-339563
36. Cinevva, Discord Activities guide (รอง) — https://app.cinevva.com/guides/publish-game-discord-activities ; Discord docs — https://docs.discord.com/developers/monetization/overview
37. MacRumors, Apple link-out fees, 2026-08-13 — https://www.macrumors.com/2026/08/13/app-store-fees-apple-link-outs/
38. PocketGamer.biz, "Habby's Capybara Go surpasses $100M" (AppMagic), 2025-02 — https://www.pocketgamer.biz/habbys-capybara-go-surpasses-100m-in-gross-player-spending
39. Deconstructor of Fun, "Habby's hybridcasual empire", 2025-07-31 — https://www.deconstructoroffun.com/blog/2025/7/31/habbys-hybridcasual-empire-the-template-that-built-a-powerhouse
40. Sensor Tower, Diablo Immortal $100M (2022, หัวข้อเท่านั้น) — https://sensortower.com/blog/diablo-immortal-mobile-100-million-revenue
41. GamesRadar, Vampire Survivors knock-offs (หัวข้อเท่านั้น) — https://gamesradar.com/games/roguelike/vampire-survivors-creator-admits-his-success-was-lucky-amid-a-wave-of-cheap-mobile-knock-offs-for-everyone-else-they-have-to-stand-out-among-the-hundreds
42. GamingonPhone, Tree of Savior: NEO launch, 2025-05 — https://gamingonphone.com/news/neocrafts-latest-mmo-tree-of-savior-neo-launches-globally-on-may-31
43. InvestGame, mobile retention benchmarks, 2026-01-20 — https://investgame.net/news/pdf/2026-01-20-mobile_retention_benchmarks_2026/
44. GameDevReports, GameAnalytics benchmarks (ข้อมูลปี 2025, 2026-06-04) — https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game
45. GameIndustryLibrary, Capybara Go UA case, 2024-12-03 — https://gameindustrylibrary.com/documents/brutally-honest-capybara-go-global-launch-ua-case
46. Playio, ARPPU article (รอง; ข้อมูล GameAnalytics 2018-19, AppsFlyer 2026) — https://blog.playio.co/arppu-mobile-games
47. Antom, Thailand gaming payment trends, 2025-11-12 — https://knowledge.antom.com/thailand-gaming-payment-trends-report-unveiling-southeast-asias-second-largest-gaming-market
48. Steamworks, Playtest docs — https://partner.steamgames.com/doc/features/playtest
49. Digital in Asia, Thailand gaming market (Kasikorn/Newzoo/Sensor Tower รอง), 2026-07-10, อัปเดต 2026-10-31 — https://digitalinasia.com/thailand-gaming-market/
50. Niko Partners, "$7 billion in 2030", 2026-08-05 — https://substack.nikopartners.com/p/7-billion-in-2030-opportunities-in
51. Wikipedia, Indie game development in Thailand — https://en.wikipedia.org/wiki/Indie_game_development_in_Thailand
52. Xsolla, Thailand localized payments, 2025-06-13 — https://xsolla.com/blog/tap-into-thailand-gaming-market-with-localized-payments
53. ContentGrip/Ampverse playbook, 2026-04-15 — https://www.contentgrip.com/sea-gaming-market-ampverse-playbook/
54. Asiasoft/Asphere IR, RO Thailand service end, 2016-04-01 — https://investor.asphere.co/en/newsroom/press-releases/518615/asiasoft-announces-to-ended-the-service-of-ragnarok-online-in-thailand
55. Tree of Savior forum, population check, 2016-08 (anecdotal) — https://forum.treeofsavior.com/t/population-check/322681
56. (ใช้แหล่งเดียวกับข้อ 49 และ 51 สำหรับข้อมูล Thai-made share/ยอดขายท้องถิ่น ไม่ใช่แหล่งแยก)
57. Game Growth Advisor, soft launch/UA 2026, 2026-05-18 (อัปเดต 2026-08-01) — https://gamegrowthadvisor.com/blog/2026-05-18-midcore-mobile-game-strategy-ua-monetization-2026/
58. DEV Community, Google Play rejection after 14 days — https://dev.to/testerscommunity/google-play-rejected-my-app-after-14-days-of-testing-here-is-what-i-did-wrong-3c21
59. a16z, "Mobile game soft launch", 2023-10 — https://a16z.com/mobile-game-soft-launch/
60. PocketGamer.biz, "Soft launch is changing in 2026", 2026-01-06 — https://www.pocketgamer.biz/soft-launch-is-changing-in-2026-how-and-where-should-you-release-your-game
61. Google Play Console Help, bad behavior thresholds — https://support.google.com/googleplay/android-developer/answer/9844486
62. PostHog pricing — https://posthog.com/pricing
63. Cloudflare Analytics Engine pricing — https://developers.cloudflare.com/analytics/analytics-engine/pricing
64. Tilleke & Gibbins, PDPC consent guidelines, 2022-09 — https://www.tilleke.com/insights/thailand-issues-guidelines-on-pdpa-consent-and-notification-requirements
65. Google Play policy (loot box odds) — https://support.google.com/googleplay/android-developer/answer/9858738
66. Tilleke & Gibbins, "Thailand confirms in-game loot boxes do not constitute gambling", 2026-03-06 — https://www.tilleke.com/insights/thailand-confirms-in-game-loot-boxes-do-not-constitute-gambling ; Mondaq — https://www.mondaq.com/gaming/1757142/thailand-confirms-in-game-loot-boxes-do-not-constitute-gambling
67. Tilleke & Gibbins, Draft online game promotion act, 2025-01-23 — https://www.tilleke.com/insights/thailand-advances-draft-act-to-promote-online-gaming-industry/12/
