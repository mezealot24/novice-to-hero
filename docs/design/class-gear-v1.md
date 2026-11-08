# Class Gear + Equip Page v1 (v125)

คำขอของคิว 2026-11-08 (4 ข้อ): ปุ่มถอด · 2H แทนมือรอง · buff ดาบ 2 มือ · Gear คลาส 2/3 + option เฉพาะคลาส
สถานะ: **ทำเสร็จ, ตัวเลขทั้งหมดเป็นค่าเดา ยังไม่ได้รัน bot / ยังไม่มีข้อมูลผู้เล่นจริง** (อย่า nerf/buff จาก bot อย่างเดียว)

## 1) ปุ่ม "✋ ถอด"
- หน้าอุปกรณ์: ปุ่มถอดที่หัวสล็อต + ปุ่มที่แถว "ใส่อยู่" (`CharacterScene`)
- `unequip(s, slot)` / `canUnequip(s, slot)` ใน `src/save.ts`
- ถอดแล้ว: ของยังอยู่ในกระเป๋า (`owned`), การ์ดที่เสียบอยู่ยังติดชิ้นนั้น (key ตาม item id)
- weapon → กลับเป็น `knife`, armor → `cloth` (ไม่มีสล็อตว่าง) — `BARE_ITEM` ใน `meta.ts`

## 2) อาวุธ 2 มือ = ใช้ทั้งสองมือ
- `Item.twoHand` + `offhandLocked(s)`; ใส่ 2H → ของมือรองเดิมกลับกระเป๋า (ยังเป็นของเรา)
- ช่องมือรองแสดงภาพอาวุธ 2 มือแบบ mirror ("🔒 อาวุธ 2 มือ: ใช้ทั้งสองมือ") ไม่ได้ copy ข้อมูล → ค่าไม่ถูกนับซ้ำ
- ระหว่างถือ 2H: ใส่มือรองไม่ได้ (`equipBlock` = `'twohand'` + toast); เปลี่ยนเป็นอาวุธ 1 มือแล้วปลดล็อกเอง
- เซฟเก่าที่มี 2H + โล่พร้อมกัน: `migrateGear` ย้ายโล่กลับกระเป๋าตอนโหลด

## 3) Buff ดาบ 2 มือ (ชดเชยที่ไม่มีค่าจากมือรอง ≈ 70% ของโล่ tier เดียวกัน)
| ชิ้น | base | mod |
|---|---|---|
| `w_berserkaxe` | str 5, vit 2 | atk 17, pskill 0.15, lifesteal 0.02, maxHp 40, def 8 |
| `w_greatsword` | str 6, vit 2 | atk 22, crit 0.05, aspd -0.1, maxHp 60, def 10 |
| `w_lance` | str 5, vit 3 | atk 24, maxHp 90, def 10, hit 6, counter 0.04, tenacity 0.06 |
| `w_monkstaff` | str 4, wis 3, vit 2 | atk 22, matk 10, combo 0.04, maxHp 30, def 8, mdef 0.03 |
| `c_berserkcleaver` (คราฟ) | str 8, agi 3, vit 3 | + maxHp 80, def 12 |
- test กันตก: 2H ทุกชิ้นต้องมี maxHp ≥ 30 และ def ≥ 8 (`tests/equip-twohand.test.ts`)

## 4) Gear คลาส 2 / 3 (หมวก + เครื่องประดับ)
- ไฟล์: `src/data/class-gear.ts` (22 ชิ้น) · เป็น **สูตรคราฟ** (ไม่ขายในร้าน) · id = save data ห้ามเปลี่ยน/ลบ
- ล็อกคลาสจริงด้วย `Item.j2` / `Item.j3` (`canWear(it, job, job2, job3)`); UI ใช้ `canWearAs(it, s)`
  - ของเดิม (อาวุธ/มือรอง job2) **ยังไม่ล็อก job2** ย้อนหลัง
- ราคาคราฟ: คลาส 2 = D5 (`common 18, boss 4, zeny 2500`), Paladin = D10 (`24, 6, 6000`) — ปลดหลังเป็นอาชีพขั้น 3
- **อัพขั้น (★3 / ★5)** = `craft.bonus` เป็น flag เฉพาะคลาสนั้น
- วัตถุดิบตีบวก/เกรด/สุ่ม ของ job3 ใช้ชุดเดียวกับ job2 (`JOB2_MATS`)

| ชิ้น | สล็อต | คลาส | mod | ★3 · ★5 |
|---|---|---|---|---|
| 👹 `c_bz_helm` | หมวก | berserker | maxHp 70, def 6, crit 0.03, j2LowHp 0.06 | j2Duel 0.06 · j2LowHp 0.08, critMul 0.1 |
| 🩸 `c_bz_fang` | acc | berserker | atk 8, critMul 0.1, lifesteal 0.02, j2Duel 0.06 | j2FrenzyMax 1 · j2LowHp 0.08, lifesteal 0.02 |
| 🪖 `c_kn_helm` | หมวก | knight | maxHp 90, def 10, j2Guard 0.02, j2HpDmg 0.01 | j2Provoke 0.05 · j2Guard 0.03, tenacity 0.08 |
| 🚩 `c_kn_banner` | acc | knight | maxHp 60, def 6, counter 0.06, j2Banner 0.03 | j2HpDmg 0.01 · j2BannerKill 0.03, j2Banner 0.03 |
| 🥷 `c_rg_hood` | หมวก | rogue | flee 8, crit 0.03, j2KnifeMul 0.1 | combo 0.04 · j2KnifeMul 0.12, critMul 0.1 |
| 💍 `c_rg_ring` | acc | rogue | atk 8, combo 0.05, crit 0.03, j2KnifeMul 0.1 | critMul 0.1 · j2KnifeMul 0.15, crit 0.03 |
| 🎩 `c_mb_fedora` | หมวก | mobster | maxHp 50, def 5, poisonDmg 1, j2ExecAdd 0.01 | vsPoison 0.06 · j2ExecAdd 0.015, debuffRes 0.1 |
| ⏱️ `c_mb_watch` | acc | mobster | atk 6, poison 1, poisonCap 2, j2ExecAdd 0.01 | j2DebuffTurns 1 · j2ExecAdd 0.015, vsPoison 0.08 |
| ✝️ `c_cr_crown` | หมวก | crusader | maxHp 80, def 8, mdef 0.04, j2CrossAdd 0.08 | j2PayCut 0.1 · j2CrossAdd 0.1, j2Guard 0.02 |
| 📿 `c_cr_pendant` | acc | crusader | maxHp 50, j2Guard 0.03, j2BlockHeal 0.01 | j2Reflect 0.05 · j2BlockShield 0.03, j2BlockHeal 0.01 |
| 🧘 `c_mk_band` | หมวก | monk | maxHp 40, matk 8, combo 0.04, j2ThunderPer 0.08 | j2Es 0.02 · j2ThunderPer 0.1, j2Dark 0.01 |
| 🔵 `c_mk_beads` | acc | monk | atk 8, combo 0.05, j2Es 0.02, j2Dark 0.01 | j2ChargeMax 1 · j2ThunderPer 0.12, combo 0.04 |
| 🧙 `c_wz_hat` | หมวก | wizard | matk 10, maxRes 20, spellCrit 0.03, j2GustMul 0.08 | j2MeteorMul 0.08 · j2LovMul 0.1, mgUltAmp 0.08 |
| 🔮 `c_wz_crystal` | acc | wizard | matk 8, maxRes 15, resRegen 0.5, j2MeteorMul 0.08, j2LovMul 0.08 | spellCrit 0.04 · j2GustMul 0.12, mgUltAmp 0.1 |
| 🎓 `c_sg_cap` | หมวก | sage | matk 8, atk 5, maxRes 15, j2AutoChance 0.04 | j2EndowAmp 0.05 · j2AutoChance 0.05, spellCrit 0.03 |
| 🧿 `c_sg_charm` | acc | sage | matk 6, atk 6, j2EndowAmp 0.05, j2MagicRod 2 | j2AutoChance 0.04 · j2MagicRod 3, j2EndowAmp 0.05 |
| 🦅 `c_bm_feather` | หมวก | beastmaster | hit 8, crit 0.03, j2PetPow 0.06 | j2PetHeal 0.004 · j2PetPow 0.08, j2HawkMul 0.1 |
| 🦷 `c_bm_tooth` | acc | beastmaster | atk 8, hit 6, j2PetPow 0.05, j2PetHeal 0.003 | j2WolfMul 0.1 · j2PetPow 0.08, critMul 0.1 |
| 🥽 `c_in_goggles` | หมวก | innovator | hit 8, crit 0.03, j2TrapMul 0.12 | j2BoxLuck 0.15 · j2TurretMul 0.15, crit 0.03 |
| ⚙️ `c_in_gear` | acc | innovator | atk 6, critMul 0.1, j2TurretMul 0.1, j2BoxLuck 0.15 | j2TrapMul 0.12 · j2BoxMul 0.1, j2BoxLuck 0.1 |
| ⚜️ `c_pl_crown` | หมวก | paladin (D10) | maxHp 140, def 14, mdef 0.06, j2Guard 0.03, j3Press 0.15 | j3Banding 0.01 · j3GospelHeal 0.005, j2CrossAdd 0.1 |
| 🏅 `c_pl_brooch` | acc | paladin (D10) | maxHp 90, def 8, j2BlockShield 0.03, j2BlockHeal 0.01, j3AfterBless 0.03 | j3Press 0.15 · j3AfterBless 0.04, j3Banding 0.01 |

## 5) Option สุ่มเฉพาะคลาส (ตีบวก +5/+7/+10 และ gacha)
- `CLASS_LINES` ใน `src/data/refine.ts` → `CLASS_LINE_POOL`; เข้ากองสุ่ม **เฉพาะ** ฮีโร่ที่มี job2 (Paladin ได้ทั้งของ Crusader + Paladin) กับของชิ้นไหนก็ได้
- น้ำหนักต่อคลาสเท่ากัน (`CLASS_LINE_W = 3`) → คลาสที่มี 4 บรรทัดไม่ได้เปรียบคลาสที่มี 1 บรรทัด; pool ปกติหนัก ~18.7 → class line ≈ 3 / 21.7 ≈ 14% ของการสุ่ม (ก่อนคูณ bias สล็อต/อาชีพ; test กันไว้ไม่ให้เกิน 20%) — ถ้า playtest แล้วรู้สึกเยอะไปให้ลด `CLASS_LINE_W`
- ค่าบรรทัด [เล็ก/กลาง/ใหญ่] ≈ ครึ่ง / 1 / 1.5 เลเวลของ node ใยชั้น 2/3; gold ปัดเลขเต็มสำหรับ stat จำนวนเต็ม (`INT_STATS`)
- ล็อกบรรทัดด้วยเพชรใช้เหมือนเดิม (ไม่เปลี่ยนกติกา monetization)
| คลาส | บรรทัด (เล็ก / กลาง / ใหญ่) |
|---|---|
| berserker | j2Duel .04/.06/.10 · j2LowHp .04/.07/.10 |
| knight | j2HpDmg .005/.01/.015 · j2Provoke .03/.05/.08 · j2Banner .02/.03/.05 |
| rogue | j2KnifeMul .05/.10/.15 |
| mobster | j2ExecAdd .005/.01/.015 · j2DebuffTurns 1/1/2 |
| crusader | j2CrossAdd .05/.10/.15 · j2BlockHeal .01/.02/.03 · j2PayCut .05/.10/.15 · j2Reflect .03/.05/.08 |
| monk | j2ThunderPer .05/.10/.15 · j2Es .015/.03/.045 · j2Dark .01/.02/.03 |
| wizard | j2MeteorMul · j2LovMul · j2GustMul (.05/.10/.15 ทั้งสาม) |
| sage | j2AutoChance .03/.05/.08 · j2EndowAmp .03/.05/.08 · j2MagicRod 2/3/5 |
| beastmaster | j2PetPow .04/.06/.10 · j2PetHeal .003/.005/.008 |
| innovator | j2TrapMul .1/.2/.3 · j2TurretMul .08/.15/.22 · j2BoxLuck .1/.2/.3 |
| paladin | j3Press .15/.30/.45 · j3Banding .01/.02/.03 · j3GospelHeal .005/.01/.015 · j3AfterBless .03/.05/.08 |

## ผลข้างเคียง / ข้อควรรู้
- เพิ่ม label ให้ flag j2*/j3* (`CLASS_STAT_LABEL`) → ของ job2 เดิมที่มี flag พวกนี้จะ **เริ่มโชว์บรรทัดสถิติเพิ่ม** (ค่าเดิม ไม่ได้เปลี่ยน)
- `equip()` ไม่เช็กคลาสเอง (เหมือนเดิม) — UI กรองด้วย `canWearAs` และ `wornItems` ตัดค่าของที่ใส่ไม่ได้ ไม่มีค่ารั่ว
- Tests: `tests/equip-twohand.test.ts` (8) · `tests/class-gear.test.ts` (9)

## ยังไม่ได้ทำ / next
- Playtest + ดูข้อมูลจริงก่อนจูนตัวเลข (power budget ของหมวก/acc คลาสเทียบ acc ธรรมดา)
- ล็อก job2 ย้อนหลังให้อาวุธ/มือรอง job2 เดิม (ถ้าต้องการ — ตอนนี้ไม่ทำเพื่อไม่ทำเซฟเดิมพัง)
