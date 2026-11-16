# Sage Rework v1 (DRAFT — รออนุมัติก่อนแก้โค้ด)

Beta: ไม่ต้อง migrate save → bump tree version แล้ว **refund skill points** ทั้ง Sage tree

## เป้าหมาย
1. Sage = สาย **On-hit / Skill / Perk-crit** (identity: ปราชญ์ผสมธาตุ แบบ Sage RO)
2. สกิล 1 ของ Mage (bolt เล็ก 0.6×) ถูกแทนด้วย **On-hit Perk ตามธาตุหลัก**
3. Stat ทุกตัวมีค่ากับ Sage
4. แยก crit ออกเป็น 3 ช่องทาง → nerf สายอื่นที่ perk/skill crit แรงเกิน

## 1) แยก Crit (ต้องทำก่อน เพราะกระทบทุกสาย)

ปัจจุบัน `hero-stats.ts:309-313` โบนัส `crit` จาก talent/item/card/tree ถูกบวกเข้า `spellCrit` ด้วย → สกิลกับตีธรรมดาแชร์ crit เดียวกัน

| Stat | ใช้กับ | แหล่ง |
|---|---|---|
| `crit` | ตีธรรมดา / combo / counter เท่านั้น | LUK, gear `crit`, talent `crit` |
| `skillCrit` (ใหม่) | สกิล active / Ult | gear/talent/card `skillCrit` |
| `spellCrit` (เดิม) | Auto Spell / On-hit perk proc | LUK (mage), card/talent `spellCrit` |

- ลบการ map `crit → spellCrit` (บรรทัด 313)
- การ์ดเดิมที่ให้ `crit` กับเวท → ย้ายเป็น `spellCrit`/`skillCrit` ตามความตั้งใจ (ตรวจ audit script)
- สายอื่น: ไม่ได้ `skillCrit` ฟรีจาก `crit` อีก = nerf โดยธรรมชาติ
- Cap แยก: `crit` 60%, `skillCrit` 60%, `spellCrit` 75% (Sage ได้ cap สูงสุด)
- Crit dmg: ค่าเริ่ม 1.5×; Sage perk-crit ได้ +0.25× เฉพาะ proc/perk

## 2) On-hit Perk (แทนสกิล 1 Mage)

เลือก 1 perk line ตอน specialise ใน tree; ผูกกับ `runElement`
- ธาตุหลัก = 100% effect, ธาตุอื่น = 50%

| ธาตุ | Perk | กลไก (ค่าเริ่ม, ย้ายไป `KIT2.sage.perk.*`) |
|---|---|---|
| Fire | **Fire Bolt ×hit** | ทุก hit proc 35% ยิง bolt 0.55×Pm; hit ถัดไปของ combo +1 bolt (cap 3); ติด burn 1 stack |
| Lightning | **Chain Lightning** | proc 30% กระโดด 3 เป้า, dmg ลด 25% ต่อกระโดด, stun 8% |
| Water/Ice | **Permafrost** | ทุก hit ซ้อน chill 1; ครบ 4 → freeze 1 เทิร์น (boss: ดัน gauge); โจมตีเป้า freeze = crit chance +20% |
| Arcane | ไม่มี perk พิเศษ (Sage proc ธาตุ Arcane ธรรมดา) — ไม่ลบธาตุ, ผู้ใช้จะปรับ VFX เอง | |

> ไม่มีธาตุ Earth/Wind ในเกม (ธาตุจริง: lightning/fire/ice/arcane)

Proc chance = `base + INT*autoInt` (cap `autoCap`), roll crit ด้วย `spellCrit`

## 3) Stat มีค่าทุกตัว (Sage)

| Stat | ผลต่อ Sage |
|---|---|
| INT | proc chance, Pm |
| STR | P.ATK ตีประชิด (basicMul 1.0) |
| DEX | จำนวน hit / combo chance, Hit |
| AGI | ASPD → จำนวน on-hit ต่อเวฟ |
| VIT | HP + Magic Rod mana gain |
| WIS | Mana max/regen → Endow/Ult ถี่ขึ้น |
| LUK | `spellCrit` (+ perk-crit dmg) |

## 4) Buff perk ต่อสายธาตุ (ปรับ tree เดิม)
- ก้านเดิม `sg_a` (Auto), `sg_e` (Endow), `sg_r` (Rod) เก็บไว้ แต่ node stat ล้วน → แทนด้วย node perk ต่อธาตุ
- Endow: เพิ่ม +X% ให้ perk proc ของธาตุที่ endow; ธาตุหลักได้ ×1.0, อื่น ×0.5
- Hindsight เก็บ (proc ตอน combo/counter) — คู่กับ on-hit identity

## 5) เป้า Power
- `JOB2_K.sage` เป้า ≈ 1.0 (expected value เท่า job2 อื่น), variance สูงกว่า, เด่นเมื่อ crit stack
- ตรวจด้วย `npm run typecheck`, `npm test` + power/bot script; ตาราง row ต่อ level (HP, dmg, hits-to-kill, EV proc/hit)

## ลำดับลงมือ
1. แยก crit + audit การ์ด/gear (typecheck + test)
2. Perk data ใน `src/data/` + logic ใน `BattleScene` (แทน basic Mage bolt)
3. Rebuild Sage tree + refund points
4. Balance script + ปรับ `JOB2_K`

## ตัดสินใจแล้ว
- Perk 3 ธาตุ (fire/lightning/ice); Arcane คงไว้ ไม่มี perk พิเศษ
- gear/card เดิมที่ให้ `crit` กับ Mage → แปลงเป็น `skillCrit`; class อื่นคง `crit` ธรรมดา
