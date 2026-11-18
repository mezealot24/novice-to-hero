# P2 Integration — กติกากลางของ 4 spec (อ่านก่อนเขียนโค้ดทุกสไลซ์)

> ไฟล์นี้ **ชนะ** spec รายสไลซ์เมื่อขัดกัน · คิวมอบให้ตัดสินแทน (2026-11-19 "เอาไงก็ได้จัดมา")

## 1) ลำดับ + branch
| ขั้น | branch | ทำอะไร |
|---|---|---|
| P2a → P2b → P2c → P2d | `claude/thief-p2` (branch เดียว · commit ต่อกันเป็นทอด) | 1 task = 1 commit ตาม spec ของสไลซ์ |
| ปล่อยของ | PR `claude/thief-p2` → `claude/thief-ult-agi-ratio` (หลัง P1 merge แล้ว rebase เข้า `main`) | **รีเซ็ต save ครั้งเดียว** ตอนปล่อยทั้งก้อน |

## 2) ข้อตัดสินจุดที่ spec ทับกัน
| เรื่อง | ใครทำ | หมายเหตุ |
|---|---|---|
| D.Strike +Energy + `thiefStrikeLs` (Gate §2.4) | **P2a T4** | P2b **ข้าม T10** ทั้ง task |
| `th_t2b` ส่วน `magPen` vs Exposed | **P2d** (หลังมี `thief_v1` + Exposed จาก P2b) | P2a ทำแค่ส่วน crit/skillCrit ต่อ stack |
| Migration flag | **P2a T8** เป็นเลขเวอร์ชัน `thiefRogueRework = 1` | P2b–P2d **ไม่ bump** (ปล่อยรอบเดียว) · P3 Rogue เพิ่มท่อน job2 ใน `if (v < 1)` เดิมก่อนปล่อย หรือ bump เป็น 2 ถ้าปล่อยแยก |
| KIT key นอก R4.7 ที่แต่ละ spec เพิ่ม (`thiefPoisonAmpAt` ฯลฯ) | สไลซ์ที่เสนอ | อนุมัติทั้งหมด · ต้องมี label ใน registry + `combo-kit.ts` |
| DEX เข้า Ratio AGI (`thiefUltDexW` 0.3, P2c) | **P2c** | อยู่ใน `thiefUltAgiShareCap` เดิม (×3.4 ไม่ทะลุ) |
| INT → `poisonDmg` | **คง 0.1/pt** (P2d default) | ไม่ใช้ 0.25 ของ Rev 3 |

## 3) คำถามใน spec → ค่าที่เลือก (ใช้ default ทั้งหมด)
- P2a Q1 ปล่อยรอบเดียว ✅
- P2b Plunder → ผูก 💎 `dropChance` อย่างเดียว ✅ · `thiefPoisonAmpAt` = 10 ✅
- P2c `thief_b3` "คริถัดไป" = Crit Damage (B3) ✅ · หน้าต่าง "2 เทิร์นมอน" = นับการลงมือของมอนตัวใดก็ได้ ✅
- P2d INT 0.1/pt ✅ · รีเซ็ต `leechLeft` ต้นเทิร์นฮีโร่จุดเดียว ✅

## 4) กติกาที่ทุกสไลซ์ต้องทำ
- ห้ามแก้ `src/data/trees2/mobster.ts`, `JOB2.mobster`, `KIT2.mobster` (Mobster เปลี่ยนตาม web คลาส 1 เท่านั้น)
- ห้าม magic number ใน `BattleScene` (R4.7) · ทุก amp ใหม่เข้าตาม bracket R4.6
- จบแต่ละ task: `npm run typecheck` + `node tools/test.mjs <ไฟล์ที่เกี่ยว>` · จบสไลซ์: `npm test` เต็มชุด (รันบน cloud เท่านั้น)
- ห้ามรัน `tools/bot.cjs` (คิวเล่นทดสอบเอง)
- ทุก commit ต่อท้าย entry ใน `docs/design/changelog-YYYY-MM-DD.md` ของวันนั้น
- ถ้า spec ผิดจากโค้ดจริง: แก้ตามโค้ดจริง แล้วจดใน `design/p2/NOTES.md` (อย่าเดา)
