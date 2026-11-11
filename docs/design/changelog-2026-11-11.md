# 📜 Dev Log (2026-11-11): Cleric Line Rework, Holy Perks Tuning & Skill Web UI

## 1. ✨ Cleric / Priest Skill & Battle Mechanics Rework
- **หอกแสง (Lance of Light)**:
  - ทักษะ 1 (ฮีล / แสงศักดิ์สิทธิ์) และท่าไม้ตาย Ult (พรคุ้มครอง) ปรับเอฟเฟกต์และกลไกเป็น **หอกแสง** พุ่งจากฟ้าใส่เป้าหมาย + ดาเมจกระจายข้างเคียง 50% (`KIT.spearSplash`)
  - เพิ่มเมธอด `lanceHit()` และแอนิเมชัน `lanceFx()` ทิ้งหอกทองคำพร้อมเอฟเฟกต์ smite pixelfx
- **ระบบสวดภาวนา (Faith & Healing Stacks)**:
  - การถือแต้ม 🙏ศรัทธา แต่ละแต้มช่วยเพิ่มพลังฮีล +6% ต่อแต้ม (`KIT.clericTree.faithHealAmp`)
  - โหนด `cleric_b1` (แสงคม): เพิ่มค่าสเตตัสพื้นฐาน INT ให้กับ Cleric เพื่อให้ส่งผลต่อดาเมจเวทและแรงฮีลทุกสกิล
  - ทักษะ 2 `cl_renew` (ฟื้นฟูต่อเนื่อง): อัปเดตคำอธิบายและตัวคูณ M.ATK
  - รีลิค `magicspear` (หอกเวท): ปรับจูนตัวคูณเป็น x1.8 ให้สมดุลกับระบบ splash ใหม่

## 2. 🌟 Holy Perks Tuning (v121)
- **ปรับสมดุลสาย Holy ให้เล่นได้ทุกอาชีพ (Theme Consistent & Stat-friendly)**:
  - `hol_dawn` (หอกรุ่งอรุณ): หอกแสง 2 เล่ม (สุ่มเป้า + ตัวข้างๆ 50%) พร้อมเพิ่ม Max HP +4% / +7%
  - `hol_turn` (หอกรายเทิร์น): ทุก 2 เทิร์นได้หอกแสง 1 เล่ม + Regen HP 1% / 1.5% ทุกเทิร์น
  - `hol_ctr` (หอกสวนกลับ): สวนกลับแล้วได้หอกแสง 1 เล่ม + เพิ่มโอกาสสวนกลับ +25% / +40%
  - `hol_ult` (หอกท่าไม้ตาย): เพิ่มโอกาสคริ +6% / +10%
  - `hol_guard` (หอกคุ้มกาย): เพิ่มประสิทธิภาพโล่ +10% / +20%
  - `hol_warm` (แสงอุ่น): เพิ่มการลดดาเมจรับเข้า (Guard) 5% / 8%
  - `hol_L1` (เชี่ยวชาญหอก): เพิ่มความแรงฮีล/โล่ +15% / +25%
  - `hol_L2` (แสงชำระ): เปลี่ยนจากหอกเพลิง (ผิดธีม) เป็น ต้านทานดีบัฟ + หอกแสงฮีล HP

## 3. 🎨 Skill Web UI & UX Architecture (CharacterScene)
- **Fluid & Performant Vertical Scroll Engine**:
  - เปลี่ยนจากการ `render()` ใหม่ทั้งหน้าจอทุกเฟรมระหว่าง drag/wheel มาเป็นการขยับ container `webC` และ thumb graphics โดยตรง (`applyWebScroll()`) ป้องกันปัญหา Frame drop และกระตุก
  - รองรับ gesture swipe ได้ทั่วทั้ง viewport แม้อยู่บนตำแหน่งโหนด
  - เพิ่ม Momentum Inertia Scrolling (`webPointerMove`, `webPointerUp`) และ Smooth Scrollbar Drag
- **Node Detail & Ultimate Evolution Panel**:
  - ย้ายคำอธิบายโหนดที่เลือกมาไว้ที่แผงด้านซ้ายแทนที่การแสดงสถิติเดิม
  - เพิ่มหน้าต่าง Modal ป๊อปอัป "🔥 รวมผล Ult" (`ultModal()`) เมื่อกดปุ่ม เพื่อดูการสืบทอดพลัง Ultimate ข้ามขั้นได้อย่างชัดเจน ไม่เบียดบังพื้นที่
  - ซ่อนตารางตัวเลขในโหนดที่ไม่มีตัวเลขสเกล (`hasRows`) เพื่อความสะอาดตา
