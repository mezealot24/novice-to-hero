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

## 3. 🔮 Mage — passive สเกลสถานะ + ⚡ หลบเป็นครั้ง + rework auto + passive ใหม่ 2 สกิล

ตัวเลขทั้งหมดเป็นค่าเดา (first guess) ยังไม่ได้เล่นจริงหรือรัน bot (บอทประเมินผู้เล่นต่ำ + เครื่องอ่อน)

**3.1 passive 3 ธาตุ (T1 ของแต่ละสาย: `mage_l1` ⚡ / `mage_f1` 🔥 / `mage_i1` ❄️, Lv ที่โชว์ = rank 1-5)** · spec `docs/passive_mage_3.md`
- `MAGE_DEF` + helper ใน `skill-math.ts` · stat `mgStatic` / `mgMolten` / `mgGlacial` · hook ใน `BattleScene` (`staticCounter`, `mageOnHit`, `glacialNova`, `raiseGlacial`, burn-tick ward)
- **สเกล INT + WIS + Base Lv** (`MAGE_DEF.scale`, `mageDefPower()`): INT → ดาเมจ counter (⚡ shock · 🔥 thorns · ❄️ Nova) · WIS → ขนาดบาเรีย ❄️ / Flame Ward 🔥 / โอกาสชะงัก ⚡ (cap 90%) · Base Lv → โบนัสเล็กทุกกลุ่ม · โค้งนุ่ม `stat/(stat+K)` เหมือน WIS→M.DEF · defensive stat (dodge/guard/mdef/def) ยังขึ้นกับ rank อย่างเดียว
- **⚡ อาภรณ์อัสนี: หลบ % → หลบแน่นอนเป็นครั้ง** (Q: หลบไม่ไหว) rank 1-5 → 1/1/2/2/3 ครั้งต่อเวฟ (ใช้ `dodgeCharges` ร่วมกับ Smoke ของ Thief · stack กับ talent พริบตา) · หลบสำเร็จยังยิง counter-shock · ถอด `luckyDodge` 3%/rank
- ⚠️ INT ถูกนับซ้ำ (ผ่าน M.ATK) และบาเรียได้ WIS สองชั้น (`shieldAmp` + โบนัสใหม่) → ต้อง balance pass

**3.2 rework ลูกไฟระเบิด (Skill 1)** (Q: มานาไม่ค่อยพอ)
- Mana 36 → **5** · ดาเมจ 1.0 → **0.45** (ร่ายเกือบทุกเทิร์น) · สเกล **90% M.ATK : 10% P.ATK** เฉพาะ auto นี้ (`MAGE_AUTO_MIX`, `mageAutoRatio`; ฮิตเวทอื่นยัง 70:30) · Wizard 0.9 → 0.4 รักษาอัตราส่วนเดิม (Wizard / Sage ใช้ cost ร่วมกับ Mage)
- `autoCost` เพดาน 10 → ใช้ cost ของคลาสเองถ้าต่ำกว่า 10 (คลาสอื่นไม่เปลี่ยน)
- talent `mg_t1b` "ร่ายไว": ลด cost 7/13 (ไร้ผลแล้ว) → ลูกไฟแรง +12%/+20% · ฟื้น Mana −10% (ไอดีเดิม)
- ⚠️ พลังล้น (Mana ≥ 90% → ×1.5/1.8) น่าจะเปิดเกือบถาวรเพราะ regen > cost · คลังมานา/สมาธิ/Max Mana คุณค่าลดลง

**3.3 passive ใหม่ 2 สกิล (คอลัมน์ แก่นเวท · tier 0 · เก็บได้ทั้งคู่)** · `MAGE_PASSIVE`
- `mage_core4` 🕯️ มนต์ถดถอย (Debuff): มอนที่โดนลูกไฟระเบิดตีเบาลง 7%/lv (Lv5 = 21%, cap 35%) นาน 2 เทิร์นของมัน ไม่ซ้อน (ใช้ `weakTurns/weakPct` เดิม)
- `mage_core5` 🔮 ออร่าเวท (Buff): 4 เทิร์นแรกของทุกเวฟ ลูกไฟระเบิด + ult แรง +10%/lv (Lv5 = +30%) เฉพาะดาเมจ (บาเรีย/ฮีลไม่เพิ่ม)
- stat ใหม่ `mgHex` / `mgAura` · ตัดส่วน "ฟื้น Mana" ของไอเดียเดิม (ซึมซับมานา) เมื่อ Q ขอเปลี่ยนเป็น Debuff

**ไฟล์:** `skill-math.ts` · `jobs.ts` · `stats.ts` · `trees/mage.ts` · `BattleScene.ts` · `docs/passive_mage_3.md` (ยังเขียน "เพิ่มโอกาสหลบ" ต้องแก้ตาม 3.1) · tests: `mage-passive-def` (15) · `mage-auto` (12) · `mage-cast-focus` (ปรับค่า fireMul)
