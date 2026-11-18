# Pivot proposal v1: Roguelike ARPG + MOBA kit + MMO-lite บน Godot

_วันที่: 2026-11-18 · สถานะ: **ข้อเสนอ รอ Q ตัดสินใจ** · ยังไม่มีโค้ดเปลี่ยน_

## TL;DR (อ่านแค่นี้ก็พอ)
- **ข้อเสนอ:** อย่าเพิ่ง port ทั้งเกม ทำ **Godot vertical slice 2 สัปดาห์** (1 อาชีพ, 1 ดัน, 1 บอส, คุมเองแบบ real-time) แล้วให้เพื่อนๆ เล่นตัดสินว่า "มีจิตวิญญาณ" จริงไหม ค่อยลงทุนต่อ
- **Web เกม (Phaser) แช่แข็ง** รับแค่ bugfix ระหว่างทดลอง ไม่ลบ ไม่ revert (PR #124 dungeon days คงไว้ตามเดิม)
- **ของที่เอาไปได้จริง:** ตัวเลข/ข้อมูลใน `src/data/` (~15.8k บรรทัด, ไม่มี import Phaser เลยสักไฟล์) export เป็น JSON ได้, design ทั้งหมด (อาชีพ 3 ขั้น, สกิล, perk, affix, การ์ด, unique, ดัน D1–D14), server cloud save/auth
- **ของที่ต้องทำใหม่:** combat loop ทั้งหมด (ตอนนี้เป็น turn-based ตาม AGI gauge), AI มอน, art (ตอนนี้วาดด้วยโค้ด ต้องมี sprite + animation หลายทิศ), HUD, netcode
- **"MMO" ใน MVP = hub เมืองที่เห็นคนอื่น + ปาร์ตี้ co-op 2–4 คน** ไม่ใช่ open world MMO (solo dev ทำไม่ไหว และไม่จำเป็นต่อการพิสูจน์ความสนุก)

---

## 1. ตอนนี้เกมเป็นอะไร (สิ่งที่อ่านจาก repo)
| ส่วน | สภาพปัจจุบัน |
|---|---|
| Engine | Phaser 3.90 + TS strict + Vite single-file, deploy GitHub Pages |
| Combat | side-scroll **turn-based** ตามความเร็ว (Capybara Go-like) ผู้เล่นเลือก build + กดสกิลจังหวะ (`src/scenes/BattleScene.ts` 6.8k บรรทัด) |
| อาชีพ | Novice → 5 สาย (Swordsman/Archer/Mage/Cleric/Thief) → 2nd job 10 ตัว (Knight, Rogue, Wizard, Sage, Beastmaster ฯลฯ) → 3rd 6 ตัว + awakening |
| Skill engine | `hero-skill-book.ts` + `battle/hero-skill-engine.ts` (PR #118) ให้มอนใช้สกิลฮีโร่ได้ |
| Content | ดัน D1–D14 (+ D15–D18 วางแผน), modes: dungeon/hard/tower/daily/bounty/rift, hell, corruptions (PoE-style), dungeon days (PR #124) |
| Loot | affixes, uniques, cards, relics, materials, refine, cardforge, craft |
| Art/VFX | texture วาดด้วยโค้ด (`src/gfx/tex/*`), VFX แบบ pixelfx (Thief/Ranger/Sword/Lightning) |
| Backend | Cloudflare Worker (Hono) + Better Auth + Neon Postgres: cloud save, wallet, live-config |

ข้อสังเกต: เกม **ออกแบบมาเป็น roguelite + loot หนักแบบ POE อยู่แล้ว** สิ่งที่ "ขาดจิตวิญญาณ" คือ **การควบคุม** (turn-based/auto) ไม่ใช่ระบบ ดังนั้น pivot = เปลี่ยน "มือ" ของผู้เล่น ไม่ใช่ทิ้ง design

---

## 2. Core loop ของแนวเกมใหม่
```
Hub เมือง (MMO-lite: เห็นผู้เล่นอื่น, ตั้งปาร์ตี้, ตีบวก/การ์ด/ร้าน)
  → เลือกดัน + ความยาก (corruption/hell เดิม)
  → RUN 15–20 นาที (roguelike)
      ห้องเชื่อมกันแบบสุ่ม 8–12 ห้อง → มินิบอส → บอส
      ในรัน: เลเวล 1→12 แบบ MOBA (อัพสกิล Q/W/E/R ทีละแต้ม) + perk 1-of-3 (ของเดิม)
      มอนดรอป gear ที่มี affix (POE/Diablo) ใส่ได้ทันทีกลางรัน
  → ตาย = เสียของในรันที่ยังไม่ "bank" / ชนะ = ถอนของกลับเมือง
  → Meta: Job Lv, เปลี่ยนอาชีพ, ตีบวก, การ์ด, stash
```
**ความรู้สึกที่ต้องได้ (pillars)**
1. **คุมเอง ลื่น มือถึง** แบบ Diablo/POE: เดิน, dodge, เล็ง skillshot
2. **Kit แบบ MOBA:** 4 สกิล + ult ต่ออาชีพ, combo/cooldown ชัด, อัพสกิลในรัน (เหมือน lane phase ย่อส่วน)
3. **Build/Loot แบบ POE:** ของมี affix, unique เปลี่ยนวิธีเล่นสกิล (ของเดิมมีครบ)
4. **Roguelike:** ทุกรันไม่เหมือนกัน, ตายมีราคา

ตัด (ไม่ทำใน MVP): lane/tower PvP จริงแบบ MOBA, open world, ตลาดซื้อขายผู้เล่น, guild, PvP

---

## 3. Reuse vs Rebuild
| ระบบ | ผล | วิธี |
|---|---|---|
| ตัวเลขบาลานซ์ `src/data/*` (มอน, ดัน, ของ, affix, card, unique, relic, mat) | ♻️ **reuse** | เขียน `tools/export-data.mjs` แปลง TS → JSON, Godot โหลดเป็น Resource (`.tres`) |
| Design อาชีพ 3 ขั้น + tree + awakening | ♻️ reuse (concept) | map สกิลเดิมเข้า slot Q/W/E/R; ตัวเลขต้อง retune จาก "ต่อเทิร์น" เป็น "ต่อวินาที" |
| Perk 1-of-3, corruption, hell, mutators | ♻️ reuse | ใช้เป็น in-run boons/modifiers เกือบตรงๆ |
| Skill math (`skill-math.ts` 850 บรรทัด) | 🔁 rewrite เป็น GDScript | สูตรดาเมจ/คริ/resist คงได้, ส่วนที่ผูกกับ gauge/turn ทิ้ง |
| Hero skill engine (PR #118) | 🔁 ใช้ concept | "สกิลเป็นข้อมูล + engine กลาง" ยิ่งสำคัญใน real-time: มอน/บอส D15–D18 ใช้ kit ฮีโร่ได้เลย |
| Dungeon days (PR #124) | 🗃️ คงไว้ใน web | ไอเดีย "ยิ่งดันลึก รันยิ่งยาว + มอนเก่ากลับมา scale Lv + ดรอปของบ้านตัวเอง" → แปลงเป็น **acts/floors ในรัน** ได้ |
| BattleScene, Hero.ts, Monster.ts, HUD | ❌ rebuild | turn-based ไปไม่ได้ |
| Texture วาดด้วยโค้ด + VFX | ⚠️ บางส่วน | `tools/pfx-sheet.mjs` render เป็น PNG sheet ได้ ใช้เป็น placeholder ใน slice ได้ แต่ real-time ต้องมี sprite เดิน/ตี/ตาย อย่างน้อย 4–8 ทิศ |
| Save (`save.ts`) | 🔁 schema ใหม่ | ห้ามแตะ save key เดิมใน web; Godot ใช้ save ใหม่แยก (มี migrate ทีหลังถ้าจำเป็น) |
| Server (Worker + Better Auth + Neon) | ♻️ reuse | cloud save/auth/wallet/live-config ใช้ต่อได้ผ่าน HTTP |
| Co-op/hub realtime | 🆕 ใหม่ | Godot high-level multiplayer (ENet/WebSocket) แบบ host-based ก่อน; dedicated server ทีหลัง |

---

## 4. ทาง migration (เปรียบเทียบ)
| ทาง | ข้อดี | ข้อเสีย |
|---|---|---|
| **A. Godot slice ก่อน (แนะนำ)** | เสี่ยงต่ำ, ได้คำตอบเร็ว 2 สัปดาห์, web ยังอยู่ | ต้องดูแล 2 codebase ช่วงสั้นๆ |
| B. Port ทั้งเกมไป Godot เลย | ไปทางเดียว ไม่แตกโฟกัส | 2–3 เดือนก่อนเล่นได้เท่าเดิม, ถ้า real-time ไม่สนุกคือเสียหมด |
| C. ทำ ARPG ใน Phaser ต่อ | ไม่ต้องเรียน engine ใหม่, reuse TS ตรงๆ | Phaser ไม่เด่นเรื่อง netcode/mobile native/tooling; เพื่อนๆ แนะ Godot |
| D. ยังไม่ pivot | ไม่เสียอะไร | ปัญหา "สูญเสียจิตวิญญาณ" ยังอยู่ |

**Tech choice ถ้าไป Godot:** Godot 4.x + **GDScript (static typing)** — export ได้ทั้ง Web, Android, PC; C# ยังมีข้อจำกัดเรื่อง web export จึงไม่แนะนำตอนนี้ วางโปรเจกต์ใน `godot/` ใน repo เดียวกัน (data export อ่านจาก `src/data/` ได้ตรง)

---

## 5. MVP scope + milestones (ทาง A)
| Milestone | เวลา (ประมาณ) | ส่งมอบ | Gate |
|---|---|---|---|
| **M0 Scaffold** | 2–3 วัน | `godot/` project, `tools/export-data.mjs` (มอน D1 + ของ + affix → JSON), headless test ใน CI | โหลด JSON ได้, test ผ่าน |
| **M1 Feel slice** | ~2 สัปดาห์ | 1 อาชีพ (**Rogue** เพราะ VFX ใหม่สุด: พายุมีด), top-down เดิน+dodge, Q/W/E/R, มอน D1 3 แบบ + บอส 1, arena 1 ห้อง, hit-stop/shake | **เพื่อนๆ เล่น 10 นาทีแล้วบอกว่าสนุกกว่าเวอร์ชัน web ไหม** → go / no-go |
| M2 Run | 2–3 สัปดาห์ | ห้องสุ่ม 8–12 ห้อง, in-run Lv + อัพสกิล, perk 1-of-3, ดรอปของมี affix, ตาย/ถอน | รันจบได้ 15–20 นาที |
| M3 Meta | 2–3 สัปดาห์ | Hub, save + cloud save (server เดิม), 3 อาชีพ (Rogue/Knight/Wizard) | เล่นวนได้หลายวัน |
| M4 Co-op + hub online | 3–4 สัปดาห์ | ปาร์ตี้ 2–4 คน (host-based), hub เห็นคนอื่น | 4 คนเล่นรันเดียวกันได้ไม่หลุด |
| ภายหลัง | — | อาชีพครบ, D2–D18, dedicated server, mobile controls | — |

ระหว่าง M0–M1: web เกม = feature freeze

---

## 6. ความเสี่ยง
1. **Scope ระเบิด** (ARPG + MOBA + MMO สำหรับ solo dev) → กั้นด้วย gate ทุก milestone, "MMO" = hub + co-op เท่านั้น
2. **Art คือคอขวดใหญ่สุด** real-time ต้องการ animation มากกว่า turn-based หลายเท่า → slice ใช้ placeholder + asset pack ที่ license ชัด, ค่อยลงทุน art หลังผ่าน M1
3. **บาลานซ์ทั้งหมดต้อง retune** (ต่อเทิร์น → ต่อวินาที, AGI gauge → attack speed) → export ตัวเลขเป็นจุดเริ่ม แต่จะไม่ตรง 1:1
4. **Market research เดิม (2026-11-07) แนะนำว่า "ยังไม่ pivot เป็น real-time ARPG"** เพราะไม่มีข้อมูลยืนยันว่ารายได้/retention ดีกว่า และเสี่ยงเรื่อง performance มือถือ low-end → นี่คือเหตุผลที่แนะนำ slice + playtest ก่อน แทนที่จะ port เลย
5. **Netcode/โกง** เมื่อมี co-op → เริ่ม host-based แบบเพื่อนเล่นกัน, ของ paid ยังอยู่ฝั่ง server เดิม
6. **ผู้เล่น web ปัจจุบัน** → ไม่ลบ ไม่ทำลาย save เดิม

---

## 7. คำแนะนำของตุ๊กตา
- เลือก **A: Godot slice 2 สัปดาห์ (Rogue + D1)** แล้ววัดผลด้วยเพื่อนๆ ชุดเดิมที่ให้ feedback
- Web เกม: feature freeze, PR #124 คงไว้ (merge แล้ว ไม่ต้อง revert) เก็บไอเดีย day/act ไว้ใช้ใน M2
- งานแรกที่ทำได้ทันทีหลัง Q ตกลง: M0 (scaffold `godot/` + `tools/export-data.mjs`)

## คำถามที่รอ Q ตัดสิน
1. ทางไหน: A / B / C / D (ตุ๊กตาแนะนำ A)
2. อาชีพของ slice: Rogue (แนะนำ) หรืออื่น
3. มุมกล้อง: top-down 2D (แนะนำ: เร็ว, art ถูกกว่า) หรือ isometric/3D แบบ Diablo
