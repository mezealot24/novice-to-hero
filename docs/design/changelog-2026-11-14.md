# Dev log — 2026-11-14

## 1. 🐺 Beastmaster Rework v1 — gap spec (docs only)

ตุ๊กตาเทียบดีไซน์ "Awakening Beastmaster" + โค้ด 8 ไฟล์ที่ Q ส่งมา (เวอร์ชันเรียลไทม์) กับระบบเทิร์นของเกม · spec `docs/design/beastmaster-rework-gap.md`
- ไม่ copy ไฟล์ที่ส่งมา: เป็นระบบเรียลไทม์, ทับ VFX pixelfx, เปลี่ยน node ID ที่เป็น save data, เรียก API ที่ไม่มี
- คำตัดสินของ Q: สัตว์ครบ 3 ตัว + เชี่ยวชาญ 1 ตัวผ่านทาเลนต์แถว IV (เหยี่ยว True Damage / หมาป่า bleed %HP / หมูป่า stun ทั้งแถว) · Prey Mark ใช้ `huntMark` ร่วม · Rage หมูป่าใช้คู่กับพุ่งทุก N เทิร์น · Savage Crunch = heal แยก · Ult = Awakening หลายเทิร์น ไม่มีดาเมจก้อนใหญ่
- แผน 8 phase (0 pack lineup → 7 VFX boar-guard)

**ไฟล์:** `docs/design/beastmaster-rework-gap.md`

## 2. 🐺 Beastmaster Rework — Phase 0 (ฝูง 3 ตัว) + Phase 1 (🐗 Guardian)

ค่าทั้งหมดเป็น first guess ยังไม่ได้เล่นจริง/รัน bot

**Phase 0: สัตว์ครบ 3 ตัวทุกเวฟ (Q1)**
- `waveAllies`: เหยี่ยว + หมูป่า + หมาป่า ทุกเวฟ ตัวละ `packPow` 0.7 × ใจเดียวกัน · ลบทาง "2★ = ตัวที่ 2" (`secondPow` หายไป)
- ★ `bm_k4` ฝูงพันธมิตร (ID เดิม) ชั่วคราว = สัตว์ทุกตัวแรง +20% (`tree.pack3Pow` 0.35 → 0.2) · Phase 4 จะเปลี่ยนเป็น Tri-Beast Harmony chain
- `save.pet` ไม่ได้เลือก lineup แล้ว · เหลือหน้าที่เดียว = คู่หูที่ ★ พรานแห่งป่า ส่งไปตีซ้ำ (field เซฟไม่แตะ)
- ⚠️ บัฟใหญ่: 3 ตัวพร้อมกัน → สั่งลุย (skill 3) ได้ผลครบ 3 ตัวเสมอ · ผู้นำฝูงนับ 3 ตัว

**Phase 1: 🐗 Guardian (หมูป่ารับดาเมจแทน)**
- เลิก taunt (ทอยรับทั้งก้อน) → แบ่ง **ฮิตที่โดนจริง** (หลัง dodge/block/DEF, ก่อน Kyrie/โล่): หมูป่ารับ `boarShare` 35% (★ +10%) ลดลง `boarCut` 30% · DoT ไม่ถูกแบ่ง · Bell / ไก่ยางยังใช้ taunt เดิม
- **เกจโกรธ 💢** (`rage`, ชื่อไม่ชนแรงฮึดของ Monk): += ดาเมจที่รับ / HP หมูป่า × 140 · เต็ม 100 = พุ่งชนเพิ่ม · **ยังพุ่งทุก N เทิร์นเหมือนเดิม** (Q3 ใช้คู่กัน)
- **HP หมด = พักฟื้น** `boarDown` 3 เทิร์น (★ 2) ไม่ตาย · ไอคอนจาง 💤N · ฟื้นแล้ว HP เต็ม + พุ่งชนทันที
- HP หมูป่า `boarHp` 0.4 → 0.6
- ใหม่ใน `allies.ts`: `guardHit()` · `reviveAllies()` · `readyAllies()` · `AllyDef.share/cut/rageK/recover/charge` · `Ally.rage/down`

**ไฟล์:** `allies.ts` · `BattleScene.ts` · `skill-math.ts` · `skill-registry.ts` · `jobs2.ts` · `stats.ts` · `trees2/beastmaster.ts` · tests: `allies` (8) · ผ่าน `archer-bm-tree` / `skill-registry` / `job2-talents` / `monk-rework` · typecheck ผ่าน
**ยังไม่ทำ:** UI เลือกคู่หูในเมือง (`character/web-tier2.ts`) ยังเขียนเหมือนเลือก lineup · VFX boar-guard (Phase 7)

**Fix ตาม review (Phase 0–1)**
- 💤N ของหมูป่าอัปเดตทุกเทิร์น (เดิมค้างที่ตัวเลขแรก) · ตัวเลข GUARD / 💢 เต็ม ขึ้นเหนือช่องหมูป่าเอง (เดิมขึ้นช่องแรก = เหยี่ยว)
- ปุ่มในเมือง `character/web-tier2.ts`: "🐾 เลือก" → "🏹 ตั้งคู่หูพราน" + toast บอกว่าสัตว์ 3 ตัวสู้ทุกเวฟเสมอ
- Admin: key ที่หายไป (`secondPow`, `boarTaunt`) ไม่อยู่ใน whitelist แล้ว = override เก่าถูกข้าม (tests `admin` 22 ผ่าน) · ⚠️ **Q เช็คหน้า admin:** ถ้าเคย override `tree.pack3Pow` หรือ `boarHp` ไว้ ความหมาย/สเกลเปลี่ยนแล้ว

## 3. 🐺 Beastmaster Rework — Phase 2 (หมาป่า)

ค่าเป็น first guess ยังไม่ได้เล่นจริง
- **Bleed = poison เดิม** ใช้ cap เดิม `poisonMax()` (12 + poisonCap) · **ไม่ตั้ง cap 5 ใหม่** เพราะจะชนกับ talent/ศรพิษของ Archer · "5" เหลือแค่เพดานที่ Frenzy นับ
- **🩸 คลั่งเลือด (Bloodscent Frenzy)** ผูกกับ `bm_w3` ฝีเท้าป่า (ID เดิม, stat ใหม่ `j2Frenzy`): poison บนตัวหน้า 1 stack = ความเร็วฮีโร่ +1%/Lv (Lv3 = +3%/stack, สูงสุด +15% ที่ 5 stack) · หมาป่าเร็วตามไปด้วย (เกจหมาป่าคิดจาก step ของฮีโร่)
- **🦷 ขย้ำปลิดชีพ (Savage Crunch)** ผูกกับ ★ `bm_w4` ราชาหมาป่า (โบนัสวิวัฒน์เดิมยังอยู่): กัดครั้งที่ 3 / ตัวหน้าติด 🏷️ `huntMark` / HP ตัวหน้า < 35% → **คริแน่นอน** + ฮีลฮีโร่และหมูป่า 10% ของดาเมจ (Q4: เป็น heal ตรง ไม่ใช่ lifesteal)
- `AllyCtx`: `hitFront` คืนดาเมจ + รับ `crit` · ใหม่ `frontInfo()` · `healPack()`
- ⚠️ ตอนนี้ 🏷️ ติดจาก Archer หมายหัวเท่านั้น · Phase 3 ให้เหยี่ยวแปะเอง
- ⚠️ ความเร็วฮีโร่กระทบทั้งเกม (คอมโบ, เทิร์นต่อเวฟ) → balance pass

**ไฟล์:** `allies.ts` · `BattleScene.ts` · `skill-math.ts` · `skill-registry.ts` · `stats.ts` · `trees2/beastmaster.ts` · tests: `allies` (11) · ผ่าน `archer-bm-tree` / `job2-talents` / `skill-registry` · typecheck ผ่าน
