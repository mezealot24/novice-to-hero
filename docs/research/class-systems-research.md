# วิจัยระบบคลาส: Eden Eternal และ Trickster Online

เตรียมโดย ตุ๊กตา สำหรับ Novice to Hero (ระบบคลาสแนว RO, auto-battle, ไม่ pay-to-win)

## สรุปสั้นๆ

- **แหล่งข้อมูลส่วนใหญ่เก่ามาก** (wiki mirror ปี 2011–2015) ค่าตัวเลขและ race/job ของ global ปัจจุบันอาจไม่ตรง
- **ยืนยันแล้ว:** โครง base class → advanced class, class level แยกจาก character level, skill แบ่งเป็นชั้น, passive แบบ slot ตามเลเวล
- **ยังไม่ยืนยัน:** stat point ต่อเลเวล, ค่า stat จริง, เงื่อนไขการ reset คลาส
- ควรเปิด fandom wiki หรือ client guide เพื่อยืนยันก่อนนำไปใช้จริง

## 1. Eden Eternal

### 1.1 คลาสและการเปลี่ยนคลาส

| คลาส | บทบาท | ระดับ |
|---|---|---|
| Warrior | Melee tank | Base |
| Knight, Templar | Melee tank สายต่อ | Advanced (อนุมาน) |
| Thief | Melee DPS เร็ว | Base |
| Martial Artist, Blade Dancer | Melee DPS สายต่อ | Advanced (อนุมาน) |
| Hunter | Ranged DPS (ธนู/ปืน) | Base |
| Engineer, Ranger | Ranged DPS สายต่อ | Advanced (อนุมาน) |
| Magician | Magic DPS, AoE | Base |
| Illusionist, Warlock | Magic buff/debuff | Advanced (อนุมาน) |
| Cleric | Healer, คลาสเดียวที่ revive ได้ | Base |
| Bard, Shaman | Support/heal สายต่อ | Advanced (อนุมาน) |

หมายเหตุ: แหล่งต่างกันนับจำนวนคลาสได้ 15–21 คลาส

กฎการเปลี่ยนคลาส (ยังไม่ยืนยัน):
- เริ่มด้วย Warrior หรือ Magician
- ปลดคลาสใหม่ราวทุก 10 เลเวล
- เปลี่ยนคลาสนอกการต่อสู้ได้ มี cooldown 20 วินาที ในการต่อสู้เปลี่ยนไม่ได้
- class level ไม่เกิน character level
- class level up ให้ expertise point ใช้ได้เฉพาะคลาสปัจจุบัน

### 1.2 Stat, skill, passive

| ระบบ | ข้อมูลที่ได้ |
|---|---|
| Stat หลัก | STR, WIS มีข้อมูลบ้าง ส่วนที่เหลือยังไม่ยืนยัน |
| Stat point ต่อเลเวล | ไม่ยืนยัน แหล่งหนึ่งระบุว่า "ไม่มีการ allocate stat เอง" |
| Class skill | ปลดทุก 5 class level ถึง 30 แล้วทุก 10 ถึง 60 อัปด้วย Class Points |
| Branch skill | 5 สาย: Defense, Melee DPS, Ranged DPS, Support, Magic DPS ปลดตาม character level อัปด้วยเงินในเกม |
| Certificate (passive) | 2 ช่องที่เลเวล 10 เพิ่มทุก 10 เลเวล ครบ 7 ช่องที่เลเวล 60 อัปเกรดแทนของเดิมที่ 40/50/60 |
| Knowledge Point (Expertise) | 1 แต้มต่อ class level ใช้กับคลาสปัจจุบัน บาง node ต้องใช้แต้มถึงเกณฑ์ |

ตัวอย่าง Warrior: CQC Training (+1% ต่อเลเวล สูงสุด 20), Iron Armor I/II (DEF +5%/+10%), Taunt I/II

## 2. Trickster Online

### 2.1 Type, job และ stat

| Type | Animal (เพศ) | 2nd job | 3rd job |
|---|---|---|---|
| Power | Bunny (F) | Boxer | Champion / Duelist |
| Power | Polar Bear (F) | Veterinarian | Zoologist |
| Power | Buffalo (M) | Warrior | Gladiator / Mercenary |
| Magic | Sheep (F) | Bard | Soul Master / Witch |
| Magic | Dragon (M) | Magician | Dark Lord / Priest / Wizard |
| Sense | Fox (F) | Explorer | Thief Master / Hunter Lord |
| Sense | Lion (M) | Inventor | Scientist / Cyber Hunter |
| Charm | Cat (F) | Entertainer | Primadonna / Diva |
| Charm | Raccoon (M) | Card Master | Gambler / Duke |

- Trickster ใช้คำว่า "type" แทน race ค่ะ
- 2nd job ล็อกตาม type และเพศ
- 3rd job เลือกแบบ **pure** (สาย skill ล้วน) หรือ **hybrid** (ผสม)
- เลื่อนขั้น 2nd job ต้องใช้ base Lv 50 และ TM Lv 40
- stat มี 4 หมวด (Power, Magic, Sense, Charm) หมวดละ 3 attribute ผลต่อ attribute ยังไม่ยืนยัน
- Base level up ได้ 4 แต้ม (แหล่งหนึ่งบอก 13 ซึ่งขัดกับ 3×4=12)
- Sense โบนัสการเจาะ ระยะไกล และการใช้ปืน, Charm โบนัส evasion/defense

### 2.2 Skill และ talent

| ประเภท skill | ทำอะไร | ตัวอย่าง |
|---|---|---|
| Active On/Off | โจมตีหรือ action ครั้งเดียว | Shockwave, Burning Rave |
| Timer | buff/debuff มีเวลา | Bull's Eye, Armor Breaker |
| Passive | ทำงานตลอด ไม่ใช้ MP | Crazy Drilling |
| Special | ได้จาก quest/event | Match Lighting |

- ทุก TM level ได้ 1 skill point ใช้เรียนหรืออัป skill ได้
- เรียน skill ต้องซื้อ skill card จาก skill master ที่ shrine
- skill ระดับ 1–10 แล้วถึง Master (ต้องใช้ไอเทมและ TM point เพิ่ม)
- มี prerequisite เช่น Hyper Beat ต้องมี Bull's Eye และ Burning Rave Lv10
- **ไม่พบ** talent tree หรือระบบ respec ในแหล่งที่อ่านได้

## 3. เทียบกับ RO job tree

| หัวข้อ | RO | Eden Eternal | Trickster |
|---|---|---|---|
| โครงคลาส | Novice → 1st → 2nd → Transcend | Base → Advanced, 5 สาย | Type → 2nd job → 3rd job (pure/hybrid) |
| ระดับ | Base Lv + Job Lv | Character Lv + Class Lv | Base Lv + TM Lv |
| Skill point | แยกตาม job | แยกตามสาย + CP | 1 แต้มต่อ TM level |
| Passive | Skill passive | Certificate ที่มี slot | Passive skill ที่ไม่ใช้ MP |
| เปลี่ยนคลาส | ต้องไป NPC | เปลี่ยนนอกการต่อสู้ มี cooldown | ผูกกับ type และ promotion |

## 4. Ideas to borrow (สำหรับ Novice to Hero)

1. **Job level แยกจาก base level** (จาก Eden/RO) ทำให้เปลี่ยนคลาสแล้วไม่ต้องเริ่มใหม่ และยังมีอะไรให้ grind ต่อ
2. **Branch skill 5 สาย** ตรงกับ perk tag ที่มีอยู่แล้ว (6 tags) ลองจับคู่ให้ perk ของแต่ละคลาสอยู่ในสายเดียวกัน
3. **Certificate เป็น slot ตามเลเวล** เหมาะกับระบบ perk ที่เลือกตอนเลเวลอัป เพิ่มช่องเมื่อเลเวลสูงขึ้น
4. **3rd job แบบ pure/hybrid** ให้ผู้เล่นเลือกทางเดินที่ชัด เหมาะกับ M3 (job change) ของเรา
5. **Skill ระดับ 1–10 + Master** ให้ความรู้สึก grind ที่มีเป้าหมาย โดยไม่ต้องจ่ายเงิน
6. **Timer / On-Off / Passive** แบ่งชนิด skill ชัดเจน ช่วยให้ auto-battle เข้าใจง่าย
7. **ห้ามจ่ายเงินเพื่อ stat หรือ skill** ตามแนวทางของ Q; ใช้ตัวเงินในเกมและเวลาแทน
8. **Class switch นอกการต่อสู้พร้อม cooldown** เป็นกฎที่กันการสลับคลาสมั่วระหว่างรบ

## 5. ยังไม่ยืนยัน และข้อแนะนำต่อไป

- ค่า stat จริง, stat point ต่อเลเวล, เงื่อนไข reset คลาส
- รายการคลาสของ global เวอร์ชันปัจจุบัน
- เปิด fandom wiki ของ Eden Eternal (Class, Class Expertise, Character stat) และ Trickster wiki ใหม่ด้วยเบราว์เซอร์เพื่อยืนยัน

## แหล่งข้อมูล

- https://en.wikipedia.org/wiki/Eden_Eternal
- https://en.wikipedia.org/wiki/Trickster_Online
- https://edeneternal.fandom.com/wiki/Class_Branches
- https://guidescroll.com/2011/06/eden-eternal-classes-information-guide/
- https://guidescroll.com/2011/06/eden-eternal-class-skills-and-knowledge-points-guide/
- https://edeneternalgameguide.yolasite.com/eden-eternal-classes.php
- https://edeneternalgameguide.yolasite.com/warrior-class.php
- https://wikimirror.lifeto.co/wiki.ggftw.com/trickster/Power_Skills.html
- https://wikimirror.lifeto.co/wiki.ggftw.com/trickster/Special_Skills.html
- https://wikimirror.lifeto.co/wiki.ggftw.com/trickster/Explorer_Skills.html
