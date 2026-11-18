# Godot Migration v1 — ย้ายจาก Phaser ไป Godot แบบค่อยๆ ย้าย (ไม่ big-bang)

Q 2026-11-15: อยากสเกลไป engine จริงจัง → ต้องการครบ 4 ข้อ: (ก) ขึ้น App Store / Play Store · (ข) ภาพ/เอฟเฟกต์สวยขึ้น · (ค) รองรับทีมที่ใหญ่ขึ้น · (ง) engine ระดับโปร
Status: 📝 draft · ใช้คู่กับ `party-battle-v1.md` (โหมดตี้ = ฟีเจอร์แรกบน Godot)

---

## 1. Decision

| เรื่อง | เลือก | เหตุผล |
|---|---|---|
| Engine | **Godot 4.7** (stable ล่าสุด 4.7.2) | 2D แท้, ฟรี (MIT) ไม่มีค่า license, เบา, มี editor ให้ artist/designer, export ได้ทั้ง Web / Android / iOS |
| ภาษา | **GDScript + static typing ทุกตัว** | C# ใน Godot 4 **export เว็บไม่ได้** และ Android/iOS ยัง experimental → ขัดกับข้อ (ก) และเว็บที่มีอยู่ |
| Type safety | เปิด warning `untyped_declaration`, `unsafe_*` เป็น **error** ใน `project.godot` | ใกล้เคียง TS strict ที่สุด (กฎข้อ 1 ใน AGENTS.md) |
| Backend | **ใช้ของเดิม**: Cloudflare Worker + Better Auth + `player_save` / `wallet` | ผู้เล่นใช้เซฟเดิมต่อได้ทันที ฝั่ง Godot ใช้ `HTTPRequest` |
| Unity | ❌ | ไม่ได้ทำ 3D และไม่ได้พึ่งโฆษณาเป็นหลัก ส่วนไฟล์เว็บก็หนักกว่า |

### ทำไมไม่ rewrite รวดเดียว
- โค้ด TS ประมาณ 27k บรรทัด, test 100+ ไฟล์ และบาลานซ์ที่จูนมาเป็นร้อยเวอร์ชัน → ถ้า rewrite รวดเดียว เกมจะไม่มีอะไรใหม่ออกเลยหลายเดือน และบาลานซ์จะเพี้ยนโดยไม่รู้ตัว
- ใช้วิธี **strangler** แทน: เกม Phaser ยังเปิดให้เล่น ส่วน Godot เริ่มจาก**ฟีเจอร์ใหม่** (โหมดตี้) แล้วค่อยย้ายระบบเก่าตามมาทีละส่วน

---

## 2. Architecture ช่วงเปลี่ยนผ่าน

```
                ┌────────────── Cloudflare Worker (เดิม) ──────────────┐
                │  Better Auth · /save (player_save) · /wallet · IAP  │
                └───────────▲───────────────────────────▲──────────────┘
                            │ same save JSON            │
          Phaser client (src/)                 Godot client (godot/)
          • ดัน/หอคอย/Rift เดิม                 • โหมดตี้ (ใหม่)
          • Hub / Forge / Shop                 • Hub/Character (G2)
          • maintenance + live tuning          • store builds (G4)
                            ▲
   src/data/*.ts ──tools/export-data.mjs──► godot/data/*.json   (ช่วงเปลี่ยนผ่าน TS ยังเป็นต้นฉบับ)
   src/**  ──tools/golden.mjs──► godot/tests/golden/*.json     (input → output ของสูตรสำคัญ)
```

### Repo layout (monorepo)
```
novice-to-hero/
├─ src/            Phaser client (เดิม)
├─ server/         Worker (ใช้ร่วมกัน)
├─ godot/          Godot project ใหม่
│  ├─ project.godot
│  ├─ core/        pure logic: ห้ามแตะ Node/scene (เทียบ src/party/)
│  ├─ data/        JSON ที่ generate มาจาก src/data (ห้ามแก้มือ)
│  ├─ scenes/      .tscn + script ของ scene
│  ├─ ui/          Theme, Control scenes
│  ├─ art/  sfx/   asset จริง (ข้อ ข)
│  └─ tests/       headless runner + golden tests
└─ tools/export-data.mjs · tools/golden.mjs
```

---

## 3. กันบาลานซ์เพี้ยน: golden parity tests

ความเสี่ยงอันดับ 1 คือ port สูตรแล้วตัวเลขออกมาไม่ตรงของเดิม วิธีกันคือ:

1. `tools/golden.mjs` เรียกฟังก์ชัน TS จริง (`heroStats`, `afterDef`, `hitChance`, `statMonster`, XP curve, refine rate…) ด้วย input ชุดใหญ่ แล้วเขียนผลลง `godot/tests/golden/*.json`
2. ฝั่ง Godot มี test headless ที่โหลด JSON ชุดเดียวกัน แล้วเทียบผลกับเวอร์ชัน GDScript (คลาดได้ไม่เกิน `1e-6`)
3. RNG: implement **mulberry32** ใน GDScript ให้ตรงกับ `src/party/rng.ts` bit ต่อ bit → seed เดียวกันได้ event log เดียวกันทั้งสองฝั่ง
4. CI (GitHub Actions) รันทั้ง `npm test` และ `godot --headless` test ทุก PR

ข้อมูลที่เป็นตารางล้วน (มอน, ดัน, ไอเทม, การ์ด) → export เป็น JSON
ข้อมูลที่เป็นฟังก์ชัน (เช่น `hp: (st) => …` ใน `AllyDef`) → port มือ แล้วคุมด้วย golden test

---

## 4. Phases

| Phase | เนื้อหา | ผ่านเมื่อ (exit criteria) |
|---|---|---|
| **G0 Spike** | สร้างโปรเจกต์ `godot/` · export Web + Android · login + โหลด cloud save · วาดฮีโร่ 1 ตัว + มอน 1 ตัว | วัด **ขนาดไฟล์เว็บ** และ**เวลาโหลดบนมือถือระดับกลาง**ได้ตัวเลขจริง · APK เปิดบนเครื่องจริงได้ · ถ้าเว็บช้าเกินรับไหว → ให้ Phaser เป็นเว็บ lite ต่อไป |
| **G1 Party mode** | สร้าง `party-battle-v1` บน Godot เป็นฟีเจอร์แรก (`godot/core/party/`) · ใช้ตัวละครจากเซฟเดิม | golden + engine tests ผ่าน · เล่นตี้เคลียร์ D1-D5 ได้ · เพื่อนๆ playtest แล้วบอกว่าสนุก |
| **G2 Hub & Character** | เมือง, หน้าตัวละคร, ใส่ของ, โรงเตี๊ยม · save schema เดิม (อ่าน/เขียน field ที่ Phaser ไม่รู้จักได้ปลอดภัย) | เล่นสลับ Phaser ↔ Godot ด้วยเซฟเดียวกันได้ไม่พัง |
| **G3 Content port** | ดัน/มอน/การ์ด/ตีบวก/forge ตามลำดับความนิยม (ดูจาก `analytics.ts`) | golden tests ของ forge / refine / drop ผ่านครบ |
| **G4 Store release** | Android (Google Play Billing plugin) → iOS (StoreKit, ต้องใช้ macOS) · ตรวจ receipt ที่ Worker (`wallet_tx.receipt_id` มีอยู่แล้ว) | ผ่าน internal testing ทั้งสอง store · ซื้อเพชรเครดิตได้ครั้งเดียวต่อ receipt |
| **G5 Sunset** | ปิดโหมดที่ port ครบแล้วใน Phaser · เหลือเว็บ lite หรือปิดไปเลย (ตัดสินจากผล G0) | ผู้เล่นทั้งหมดอยู่บน Godot |

> **ผลต่อ PR #114:** engine ของโหมดตี้จะเขียนเป็น GDScript ใน `godot/core/party/` ไม่ใช่ `src/party/` ส่วน types, rules, events ตามสเปกเดิมทั้งหมด (`Unit` → `class_name Unit extends RefCounted`, `BattleEvent` → Dictionary ที่มี type กำกับ หรือเป็น class ย่อย)

---

## 5. แต่ละเป้าหมายได้อะไร

- **(ก) Store:** Godot export ได้ทั้ง Android/iOS · IAP ผ่าน plugin ทางการ · ตรวจ receipt ที่ server เดิม
- **(ข) ภาพ/เอฟเฟกต์:** `GPUParticles2D`, shader (`canvas_item`), `AnimationPlayer` / `AnimationTree`, `Skeleton2D` · เปลี่ยนจากภาพที่วาดด้วยโค้ด (`src/gfx/textures.ts`) มาเป็น asset จริง ต้องมี style guide ก่อน (ใช้ skill `create-game-assets`)
- **(ค) ทีม:** artist/designer ทำงานใน editor ได้เอง · scene `.tscn` แยกไฟล์ทำให้ merge ง่าย · design doc ใน `docs/design/` เดิม · ตั้ง CODEOWNERS + PR template
- **(ง) ระดับโปร:** มี editor, profiler, debugger, ระบบ animation และรองรับ export หลาย platform ครบ

---

## 6. Risks

| ความเสี่ยง | ผลกระทบ | ทางแก้ |
|---|---|---|
| ทำงานซ้อนสอง client ช่วงเปลี่ยนผ่าน | ช้าลง | Phaser = maintenance + live tuning อย่างเดียว ฟีเจอร์ใหม่ทั้งหมดไปลง Godot |
| บาลานซ์เพี้ยน | ผู้เล่นโวย, เศรษฐกิจในเกมพัง | golden tests (§3) |
| เซฟพังเมื่อเล่นสลับ client | ของหาย | field ใหม่เป็น additive · ทั้งสอง client เก็บ field ที่ไม่รู้จักไว้ ไม่ลบทิ้ง · เพิ่ม `v` เมื่อจำเป็นจริงเท่านั้น |
| ไฟล์เว็บ Godot ใหญ่ | คนกดลิงก์แล้วไม่รอ | วัดใน G0 · ถ้าไม่ผ่าน ให้ Phaser เป็นเว็บ lite ต่อไป |
| GDScript type หลวมกว่า TS | bug หลุด | warning → error (§1) · ห้ามใช้ `Variant` ลอยๆ |
| iOS ต้องใช้ Mac | build ไม่ได้ | CI ใช้ macOS runner ตอน G4 |

---

## 7. Open questions
1. เมื่อ port มาครบแล้ว ระบบต่อสู้เดิม (ตัวเดียว semi-auto) จะ**อยู่คู่**กับโหมดตี้ หรือโหมดตี้จะ**แทนที่**?
2. ทีม: จะมีคนวาดภาพเข้ามาเมื่อไหร่? (ต้องกำหนด style guide ก่อน G1 ถ้าอยากให้ภาพโหมดตี้เป็นภาพจริงตั้งแต่แรก)
3. Store ไหนก่อน? (เสนอ Android: ไม่ต้องใช้ Mac และรีวิวเร็วกว่า)
4. ต้องอัปเดต `AGENTS.md` ให้มีกฎของ Godot เมื่อเริ่ม G0
