# ดันเจี้ยน 7 · ❄️ ยอดเขาน้ำแข็งนิรันดร์ (v79)

สถานะ: **data + texture พร้อม · ยังไม่ได้วัดด้วยบอท (รอคิวอนุญาต)** · ผู้เขียน: ตุ๊กตา · 2026-11-06
อ้างอิง: `dungeon-6-10-stat-monsters.md` §4 · D6 เป็นแม่แบบ · ไฟล์: `src/data/dungeons/d7.ts`, `src/gfx/tex/d7.ts`

## TL;DR (so what)

- Lv **50-60** · tier 7 · ปลดล็อกหลังเคลียร์ D6 · โครงเดิม: 4 เวฟ + ดวลมินิ (สุ่ม 1 ใน 2) + บอส
- โจทย์: **ต้านสถานะ (แข็ง ❄️ / ช้า 💙) + ฆ่าให้ไวก่อนโดนแช่แข็ง**
- ตัวเลขทุกตัวสูงกว่า D6 ตัวคู่กัน **~+17-27%** (HP / ATK) — ไม่มีอะไรกระโดดเกิน
- ใช้แต่กลไกที่มีอยู่แล้ว (onHit / bolt / curse / shield / iceSkin / shots / phases) — ไม่มี field ใหม่
- ของรางวัล: การ์ด 9 ใบ ธีม tenacity / debuffRes · วัตถุดิบ `m_d7` + `b_d7`

## ธีม · ทดสอบอะไร

| กลไก | มาจาก | สู้ยังไง |
|---|---|---|
| ❄️ freeze (เสียเกจเทิร์น) | เยติ (ตีโดน), ภูต (bolt), มินิ/บอส (ชาร์จ = 100) | `tenacity` ลดเกจที่เสีย · `debuffRes` ต้านทั้งก้อน |
| 💙 slow (ATK Speed x0.5) | หมาป่า (ตีโดน), หมอผี (curse 2 เทิร์น), บอส | `debuffRes` · ฆ่าหมอผีก่อน |
| หนามน้ำแข็ง (iceSkin) | โกเลม | ตีโกเลมแล้วดาเมจ -15% 2 เทิร์น → ตีตัวอื่นก่อน |
| ยิง 2 นัด | ฮาร์ปี้ | Flee หลบทีละนัด |

## Roster

| id | ชื่อ | ระดับ | alloc | กลไก |
|---|---|---|---|---|
| `yeti` | เยติคลั่งหิมะ | normal | bruiser | onHit freeze 30 · counter +0.1 · hp x1.2 · def +12 |
| `frostwolf` | หมาป่าลมเหนือ | normal | skirmisher | combo +0.12 · onHit slow 1 · hp x1.3 dmg x1.35 |
| `icewisp` | ภูตเกล็ดน้ำแข็ง | normal | caster (magic) | bolt ทุก 3 · pow 1.3 · freeze 40 · flee +15 |
| `icegolem` | โกเลมธารน้ำแข็ง | normal | tank | def +60 · iceSkin · shield ทุก 4 (scale VIT) · dmg x1.15 |
| `snowharpy` | ฮาร์ปี้พายุหิมะ | normal | assassin | shots 2 (นัดละ x0.5) · crit +0.06 · hp x1.3 |
| `frostshaman` | หมอผีหิมะ | normal (support) | support (magic) | heal ทุก 2 pow 0.15 · curse ทุก 4 slow 2 |
| `snowqueen` | เซลีน · ราชินีหิมะนิรันดร์ | mini | caster | bolt 3 ลูก freeze 30 · ชาร์จทุก 4 (เวท) freeze 100 · 50%: โล่ 0.15 + ภูต x2 · hp x1.28 matk x0.9 |
| `mammoth` | กรอมม์ · แมมมอธศึกงาเหล็ก | mini | {str4 vit4 dex1 agi1} | def +40 · ชาร์จทุก 3 กระทืบ freeze 100 + armorBreak 2 · 40%: speed 1.3 dmg 1.15 cleanse · hp x0.65 dmg x0.9 |
| `frostwyrm` | ไฮม์เฟรอส · จ้าวมังกรยอดหิมะ | boss | {str3 int3 vit3 wis2 agi1} | onHit slow 1 · ชาร์จ "ลมหายใจศูนย์สัมบูรณ์!" เวท freeze 100 · bolt 4 ลูก pow 0.45 freeze 25 · curse ทุก 5 armorBreak 2 + slow 2 · 60%: โล่ 0.12 + โกเลม 1 · 30%: speed 1.25 dmg 1.15 ชาร์จทุก 2 cleanse · speedMul 0.8 |

- bolt หลายลูก: ดีบัฟติดแค่ **ลูกแรกที่โดน** (BattleScene `monBolt`) → freeze ไม่ซ้อน 4 ชั้น

## ตัวเลขจริง (`statMonster` ที่ Lv ห้อง) เทียบ D6

| D7 | Lv | HP | ATK | M.ATK | DEF | M.DEF | Flee | Spd | เทียบ D6 | HP Δ | ATK Δ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| yeti | 50 | 962 | 248 | 185 | 54 | 0.01 | 13 | 11.1 | mummy Lv40 (804 / 201) | +20% | +23% |
| frostwolf | 50 | 703 | 273 | 185 | 31 | 0.01 | 36 | 14.5 | jackal Lv40 (599 / 231) | +17% | +18% |
| icewisp | 52 | 646 | 195 | 270 | 36 | 0.14 | 21 | 10.0 | dunewraith Lv42 (543 / M 219) | +19% | M +23% |
| snowharpy | 52 | 724 | 121 x2 | 192 | 42 | 0.01 | 29 | 13.4 | sandscorp Lv42 (620 / 198) | +17% | +22% (2 นัด) |
| frostshaman | 52 | 830 | 195 | 238 | 43 | 0.18 | 6 | 10.0 | sunpriest Lv42 (699 / M 195) | +19% | M +22% |
| icegolem | 55 | 1106 | 273 | 203 | 114 | 0.14 | 6 | 10.0 | scarab Lv45 (910 / 236) | +22% | +16% |
| snowqueen | 56 | 5030 | 209 | 335 | 63 | 0.25 | 6 | 10.0 | sphinx Lv46 (4177 / M 279) | +20% | M +20% |
| mammoth | 56 | 4927 | 307 | 206 | 107 | 0.01 | 23 | 12.5 | jackallord Lv46 (2289 / 256) | +18%* | +20% |
| frostwyrm | 60 | 12523 | 357 | 354 | 95 | 0.23 | 28 | 10.6 | pharaoh Lv50 (10266 / 298) | +22% | +20% |

- \* mammoth เทียบ HP กับ sphinx (มินิ HP สูงสุดของ D6) — คาห์รันเป็นมินิสาย AGI บอบบาง เทียบตรงไม่ได้ · ความถึกของกรอมม์อยู่ที่ DEF 107 (กายภาพ EHP ~x2) ส่วนเวทตีเข้าเต็ม
- frostwyrm: alloc มี AGI 1 → Spd 13.3 (+33%) เลยใส่ `speedMul: 0.8` ให้เหลือ ~10.6 (ใกล้ pharaoh 10)
- skill mul (INT/VIT เกิน ref): icewisp bolt x1.08 · snowqueen x1.21 · frostwyrm x1.16 · golem shield x1.09

## ห้อง

| # | ห้อง | Lv | มอน |
|---|---|---|---|
| 1 | เวฟ 1 · เชิงเขาหิมะ | 50 | yeti x2 · frostwolf x1 |
| 2 | เวฟ 2 · หุบผาเกล็ดน้ำแข็ง | 52 | icewisp x2 · snowharpy x1 · frostshaman x1 |
| 3 | สังเวียน · ดวล 1-1 (45 เทิร์น) | 56 | สุ่ม snowqueen / mammoth |
| 4 | เวฟ 3 · ธารน้ำแข็งพันปี | 55 | icegolem x1 · frostwolf x2 · icewisp x1 |
| 5 | เวฟ 4 · ประตูรังมังกร | 58 | yeti x1 · icegolem x1 · frostshaman x1 |
| 6 | ห้องบอส · จ้าวมังกรไฮม์เฟรอส (50 เทิร์น) | 60 | frostwyrm |

- ท้องฟ้า `0x14223e → 0xa8d4f0` · hills `0xdff2ff`
- holyFoes: ไม่มี (ไม่มีอันเดด)
- มินิ relic: เซลีน `iceage` + `aegis` · กรอมม์ `executioner` + `riposte`

## การ์ด (≈ D6 x1.15)

| การ์ด | ช่อง | ระดับ | ผล |
|---|---|---|---|
| `card_yeti` | armor | normal | maxHp +140 · tenacity +6% · VIT +2 |
| `card_frostwolf` | weapon | normal | aspd +0.07 · AGI +2 |
| `card_icewisp` | acc | normal | M.ATK +16 · ตีศัตรูเย็น +6% |
| `card_icegolem` | armor | normal | DEF +12 · comboDR +6% |
| `card_snowharpy` | weapon | normal | crit +4% · critMul +0.06 |
| `card_frostshaman` | acc | normal | debuffRes +6% · healAmp +5% · WIS +2 |
| `card_snowqueen` | acc | mini | spellCrit +5% · tenacity +10% · INT +4 |
| `card_mammoth` | weapon | mini | pskill +10% · counter +6% · STR +3 VIT +1 |
| `card_frostwyrm` | armor | boss | debuffRes +10% · critDR +10% · maxHp +10% |

## วัตถุดิบ

| id | ชื่อ | ไอคอน |
|---|---|---|
| `m_d7` | ขนเยติน้ำแข็ง | 🧶 |
| `b_d7` | หัวใจมังกรน้ำแข็ง (บอส) | 💎 |

- ยังไม่มีสูตรคราฟต์ที่ใช้ (เหมือน D6)

## ยังไม่ได้วัดด้วยบอท (รอคิวอนุญาต)

- เป้า: ปกติ ~75-80% ที่ Lv55 (`tools/bot.cjs` D=7 profile มีแล้ว)
- จุดที่ต้องดูตอนวัด
  - freeze ซ้อน: บอส bolt (freeze 25) + ชาร์จ (100) + เฟส 30% ชาร์จทุก 2 → อาจล็อกเทิร์นนานเกิน
  - slow: หมาป่า x2 + หมอผีในเวฟ 3-4 → ATK Speed ครึ่งนานไหม
  - ฮาร์ปี้ 2 นัด crit ต่อนัด → นักบวช / จอมเวท (Flee ต่ำ) เจ็บไหม
  - กรอมม์ DEF 107 → สายกายภาพ (นักดาบ / โจร) ทันเวลา 45 เทิร์นไหม
