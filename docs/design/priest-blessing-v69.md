# v69 Priest ทักษะ 2: พรแสง (Blessing)
Replaces โล่แสง (shield) in the Priest ทักษะ 2 pick-1-of-3. Passive: always on during a fight, no Mana, never cast.
- T1 root (max 5): STR/DEX/INT/WIS +2 per level, Lv5 = +10 each.
- T2 "+" (max 3): พรร่างกาย, VIT +20 at Lv3 (7/13/20), cumulative on T1.
- T3 ★: พรปัญญา, M.ATK +30%, cumulative (needs T2 maxed, as before).
Numbers: `S2N.blessStat/blessVit/blessMatk` in src/data/skill-math.ts; applied in `heroStats` (meta.ts) before derived stats.
Old saves with cl_bless points keep the ids: root points now read as Blessing levels.
Bot (4 runs, full branch vs 1-pt ฟื้นฟู): D2 3/4 vs 1/4, D4 4/4 vs 0/4 -> strong at full investment; watch in playtest.

## v77 (Q อนุมัติ 2026-11-06): พรแสงกลับเป็น active
- ร่ายเอง: Mana 30 · คูลดาวน์ 4 · อยู่ 3 เทิร์นฮีโร่ · ร่ายเมื่อพรหมดและยังมีมอน
- 🔆 พรแสง: STR/DEX/INT/WIS +15 ระหว่างพร (derived stats เปลี่ยนจริงผ่าน `heroStats` `tempBase` → `BattleScene.syncBless`) + ล้างดีบัฟ 1 อย่างตอนร่าย
- 🛡️ Kyrie Eleison ("+" Lv1-3): บาเรีย 5/10/15% HP สูงสุด แตกเมื่อหมด HP หรือโดน 3 ฮิต · หายพร้อมพร
- ✨ Gloria (★): LUK +30 ระหว่างพร (คริ / หลบโชคดี / หอกแสง LUK ขึ้นตามสูตรปกติ)
- ลบโบนัสถาวรเดิม (stat +10, VIT +20, M.ATK +30%)
- ตัวเลข: `S2N.blessTurns/blessStat/blessCleanse/kyrieHp/kyrieHits/gloriaLuk`
- เซฟเก่า: id เดิม · ราก max 5 → 1 คืนแต้มส่วนเกิน (`migratePriestBless`)
- Hero Power: นับบัฟที่ uptime 3/5 (เดา ยังไม่รันบอท) · Kyrie ยังไม่นับ
