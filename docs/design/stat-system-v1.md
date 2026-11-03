# Stat System v1 — รีวิวจากตุ๊กตา + สเปกที่แนะนำ

ต้นฉบับ: สเปกของคิว (2026-11-02) · บริบท: auto-battle สไตล์ Capybara Go, 3 แต้ม/Base Lv, รีเซ็ตฟรี

## TL;DR

- โครงดีค่ะ แยก P/M ชัด, STR=เพดาน / DEX=ความนิ่ง แบบ RO คือถูกทาง
- ต้องแก้ 4 จุด: **VIT ทำเยอะเกิน**, **AGI = แค่ speed ไม่มีความหมายในเกมเดินเอง**, **LUK เสี่ยงเป็นแต้มทิ้ง**, **ค่า % ทุกตัวต้องมี diminishing returns**
- Mana/Rage/Energy เก็บไว้ทำตอนเปลี่ยนอาชีพ (M3) Novice ใช้คูลดาวน์ไปก่อน

## รีวิวรายตัว

| Stat | สเปกคิว | ปัญหา | ที่แนะนำ |
|---|---|---|---|
| STR | P.ATK max, P.Skill dmg | ไม่มี | คงเดิม |
| DEX | Accuracy, min P.ATK | Accuracy เป็นแค่ "ภาษีกันพลาด" ถ้าพลาดบ่อยในเกม auto จะหงุดหงิด | คงเดิม + hit chance มี floor 80% + **อาวุธระยะไกลใช้ DEX แทน STR** (สายธนูมี stat หลัก) |
| VIT | HP, flat DEF P+M, regen, tenacity | ทำ 4 อย่าง ในเกม auto ที่ "รอด = ชนะ" VIT จะกลายเป็นคำตอบเดียว | เหลือ HP, P.DEF, HP regen · ย้าย M.DEF + tenacity ไป WIS |
| WIS | Heal/Shield amp, M.DEF% | ดีแล้ว แต่บางไปหน่อยสำหรับคนที่ไม่ใช่ซัพ | + Mana regen (ย้ายจาก INT) + tenacity → WIS = "ใจแข็ง" สายป้องกันเวท/ซัพ/ยืนนาน |
| INT | M.ATK, Mana regen | — | M.ATK + Max Mana (INT = ยิงแรง, WIS = ยิงได้นาน) |
| AGI | Speed | ตัวละครเดินเอง move speed ไร้ค่า | **ASPD + Flee** |
| LUK | Legendary skill, rare event, lucky evasion, rare drop | ไม่มีพลังต่อสู้ตรงๆ = แต้มทิ้ง หรือถ้าแรงไปก็ snowball ฟาร์ม | + Crit (ที่มีอยู่แล้ว) · ทุกอย่างมี cap |

## สูตรตัวอย่าง (ต่อ 1 แต้ม, ปรับได้)

หลักการ: ค่าแบน (HP, ATK) โตเส้นตรง · ค่า % ใช้ `x / (x + K)` ไม่มีวันถึง 100%

- **STR**: P.ATK max +2 · P.skill dmg +0.5%
- **DEX**: Hit +1 · minRatio = `min(0.95, 0.5 + DEX*0.005)` (dmg สุ่ม min..max) · ranged ATK +2
- **VIT**: HP +10 และ +0.5% maxHP · P.DEF +0.5 · HP regen +0.02% maxHP/วิ
- **INT**: M.ATK +2 · Max Mana +3
- **WIS**: Heal/Shield amp +1% · M.DEF% = `WIS/(WIS+150)` · Mana regen +0.05/วิ · Tenacity = `WIS/(WIS+200)`
- **AGI**: ASPD +1.5% (attack interval ต่ำสุด 0.3s) · Flee +1
- **LUK**: Crit +0.3% · Lucky dodge = `LUK/(LUK+300)` · โอกาส Legendary ใน 1-of-3: base 3% → สูงสุด 10% · Rare drop +0.5% (cap +50%)

## สูตรรวม

- Hit chance = `clamp(0.80 + (Hit - Flee) * 0.01, 0.80, 0.98)` ใช้ทั้งฝั่งเราและมอน
- ดาเมจหลัง DEF = `dmg * 100 / (100 + DEF)` (ห้ามลบตรงๆ ไม่งั้นมอนตีไม่เข้า = 0)
- ลำดับเช็ก: Lucky dodge → Hit/Flee → Crit → DEF
- Crit damage x1.5 คงที่ (เพิ่มได้จากของ/การ์ด ไม่ผูก stat)

## Resource (ทำตอนเปลี่ยนอาชีพ)

- **Mana** (สายเวท/ซัพ): Max จาก INT, regen จาก WIS
- **Rage** (สายนักรบ): 0–100 ได้จากการตี/โดนตี, ลดเองเมื่อไม่สู้
- **Energy** (สายโจร/ธนู): 100 คงที่ regen เร็วแบบแบน ไม่ผูก stat
- ใน auto-battle: AI ร่ายสกิลเมื่อ resource พอ, ultimate ให้ผู้เล่นกด

## ลำดับทำ (MVP)

1. เปลี่ยน desc + `heroStats()` ใน `data/meta.ts` ตามตาราง (เพิ่ม `wis` เป็น stat ที่ 7)
2. เพิ่ม hit/flee + DEF formula ใน combat
3. LUK hook ตอนสุ่มสกิล 1-of-3 (legendary weight)
4. Resource ไปพร้อม M3 job change

> อัปเดต 2026-11-03 (คิวสั่ง): คริมาจาก ไอเทม / ต้นสกิล / ทาเลนต์ / การ์ดเลือกตามด่าน เท่านั้น — LUK ให้คริ +1% ต่อ 3 LUK (แก้ตามคิวอีกรอบ), คริฐาน 0%, ตัดคริจากอาชีพ (นักธนู/โจร) และเอลฟ์ (เปลี่ยนเป็น Hit +6). คริแบบ RO: กายภาพเท่านั้น โดนแน่ ทะลุ DEF, ATK สูงสุด x1.4 + โบนัสดาเมจคริ, ไม่มีคริ→โล่
