# Craft Rules v2: ของแปลกจากโรงตีเหล็ก + หลอมคืน (Backend spec, 2026-11-07)

> สถานะ: **คิว Approve แล้ว 2026-11-07** (ทั้ง 4 ข้อท้ายไฟล์: MVP = Cardforge + Salvage · ใส่ได้ทุกอาชีพ · Salvage ตามที่เขียน · 3 โหมด/ไม่มี popup ตอนแตก) · ตัวเลขทุกตัวเป็น tunable (ร่าง จะปรับหลังรันบอท โดยถามคิวก่อนรันเสมอ)
> ต่อจาก: `docs/design/item-acquisition-v1.md` (กติกา forge เดิม ห้ามขัด) · คู่กับ `craft-ux-v1.md`
> กติกาเศรษฐกิจ: **ทุกฟีเจอร์ = zeny sink · ไม่มี zeny เข้าใหม่** · เพชรไม่มีที่ใช้ใหม่

## 0. TL;DR (so what)
- คิวอยากได้ **ของแปลก หลากหลาย** → ใช้ flag ที่ BattleScene **อ่านได้ทุกอาชีพอยู่แล้ว** (berserk, dodgeStrike, ctrAoe, thorns …) → **ไม่ต้องเขียนโค้ดต่อสู้ใหม่**
- **MVP = 2 อย่าง:**
  1. 🃏 **ผนึกการ์ด (Cardforge)**: การ์ดซ้ำ + วัตถุดิบ + zeny → ของ 8 ชิ้น มี "ลายเซ็น" (flag พิเศษ) + โทษเล็ก ๆ
  2. ♻️ **หลอมคืน (Salvage)**: ของ craft ที่ไม่ใช้ → คืนวัตถุดิบ 50% · **ไม่คืน zeny** · เสียค่าธรรมเนียม zeny
- เฟส 2: 🧩 **ชุดดัน (Set bonus)** · เฟส 3: 👑 **ปลุก Unique** (รอ data ของอีกเธรด)
- zeny: Cardforge ดูดตรง ~15k (8 ชิ้น) + เปิดเป้าใหม่ให้อัปขั้น/ตีบวก/สุ่มออปชัน (~12k+/ชิ้น) · การ์ดที่ใช้ = ไม่ถูกขาย (zeny เข้าลด ~2.5k)
- **zeny เข้า = 0** ทุกฟีเจอร์ (เช็กในข้อ 7)

---

## 1. ประเมินกลไกที่เป็นไปได้

| กลไก | ทำอะไร | zeny | ความเสี่ยง | ต้องเขียนโค้ดต่อสู้ | ตัดสิน |
|---|---|---|---|---|---|
| 🃏 **ผนึกการ์ด** | การ์ดซ้ำ + mats → ของมี flag พิเศษ | sink ✓ + ลดการขายการ์ด | flag ข้ามคลาสแรงไป (ตั้งโทษคู่) | ❌ ไม่ต้อง | **MVP** |
| ♻️ **หลอมคืน** | ของ craft → mats 50% | sink (ค่าธรรมเนียม) | loop ฟาร์ม (กันด้วย 50% + refineGems เดิม) | ❌ | **MVP** |
| 🧩 ชุดดัน (2/3 ชิ้น) | ใส่ของดันเดียวกันครบ → โบนัส | sink ทางอ้อม (ต้อง craft หลายชิ้น) | `heroStats` ต้องแก้ + UI หน้าอุปกรณ์ | ❌ (แค่ Stats) | เฟส 2 |
| 👑 ปลุก Unique | Unique + การ์ดบอส + mats → ลดคำสาป/เพิ่มค่า | sink ใหญ่ | ขึ้นกับกติกา Unique/Taint ของอีกเธรด | อาจต้อง | เฟส 3 |
| ⚗️ แปรธาตุ | mats ดัน A 3 → ดัน B 1 + zeny | sink ✓ | ข้ามการฟาร์มดันสูง | ❌ | ตัวเลือก เฟส 2 (ถ้าคิวอยาก) |
| 🃏→✨ ผงการ์ด | ย่อยการ์ดเป็นผง แลกการ์ดที่อยากได้ | กลาง | **เป็นแหล่งการ์ดใหม่** (ขายการ์ดได้ zeny = แหล่ง zeny ทางอ้อม) | ❌ | ❌ ตัด |
| 📌 ผนึกการ์ดถาวร | ฝังการ์ดในของ ปลดช่องว่าง | sink | power creep (ช่องการ์ดฟรี +1) | ❌ | ❌ ตัด |
| รวมของซ้ำ | 2 ชิ้นเดียวกัน → ชิ้นใหม่ | — | ขัดกฎ 1 ไอดี = 1 ชิ้น (`owned`) | — | ❌ ตัด (เคยตัดแล้วใน v1 3.4) |
| ใช้เพชรเร่ง/การันตี | — | — | ขัดกฎเพชร | — | ❌ ห้าม |

**ทำไม MVP 2 อย่างนี้**
- ผนึกการ์ด = ตอบโจทย์ "ของแปลก" ตรงที่สุด + ใช้ระบบเดิม 100% (`CraftInfo`, `forgeItem`, การ์ดใน `s.cards`)
- หลอมคืน = มีในแผนเฟส 3 ของ v1 อยู่แล้ว (ข้อ 3.3) + ทำให้กล้า craft ของใหม่ (ไม่กลัวเสียเปล่า)
- 2 อย่างรวมกัน: ไฟล์ data ใหม่ 2 ไฟล์ + แก้ `forgeItem` 1 บรรทัด → เล็ก ทดสอบง่าย

---

## 2. 🃏 ผนึกการ์ด (Cardforge)

### 2.1 กติกา
- สูตร = **การ์ดในกระเป๋า** (ไม่นับที่เสียบอยู่) + วัตถุดิบดัน + zeny → ของ **★1** สำเร็จ 100% (เหมือน craft เดิม)
- ปลดสูตร: ชนะบอสดันนั้นครั้งแรก (`clearsBy[dg] > 0`) เหมือน craft เดิม
- ของที่ได้ = ของ craft ทุกอย่าง → อัปขั้นถึง ★5, ตีบวก, ได้บรรทัดสุ่ม, สุ่มออปชัน, Corrupt ได้ตามปกติ
- **ลายเซ็น (`sig`)** = flag/ค่าพิเศษ **ไม่ขยายตามขั้น/บวก** (กันพลังพุ่ง) · ติดตั้งแต่ ★1
- **โทษ (`mod` ค่าติดลบ)** = ไม่ขยายตามขั้นอยู่แล้ว (`forgeItem` ขยายเฉพาะ `v > 0`)
- ไม่ล็อกอาชีพ (ใส่ได้ทุกคน) = จุดขาย "ของแปลก" · ถ้าคลาสมี flag นั้นจากสกิลแล้ว UI บอก "(มีจากสกิลแล้ว)"
- จำนวนการ์ดต่อใบตาม tier: ธรรมดา 3 · มินิบอส 2 · บอส 1 (`CARDFORGE.cardsNeed`)

### 2.2 flag ที่ใช้ (ตรวจ `main:src/scenes/BattleScene.ts` แล้ว อ่านแบบไม่ล็อกอาชีพ)

| flag | ทำอะไร | BattleScene |
|---|---|---|
| `berserk` | HP < 30% → ATK +40%, ดูดเลือด x2 | L811 |
| `ctrAoe` | สวนกลับโดนทุกตัว 0.5x | L2424 |
| `dodgeStrike` | หลบได้ → ตีสวน 0.8x | L2588 |
| `overhealShield` | ฮีลเกิน → โล่ (สูงสุด 50% HP) | L2692 |
| `thorns` | สะท้อนดาเมจที่โล่รับไว้ | L2644 |
| `killHeal` | ล้มศัตรู → ฟื้น x% HP | L2246 |
| `poisonSpread` / `fireSpread` | มอนตาย → พิษ/ไฟลามไปตัวอื่น | L2250 / L2249 |
| `counterShield` | สวนกลับ → ได้โล่ x% HP | L2416 |

- ✅ เช็กแล้วตอน build (v98): `OUTSIDE_CAP` ครอบเฉพาะ `OUTSIDE_KEYS` = vsBurn, vsChill, vsPoison, chillWeak, spearShield, counterDmg, basicDmg, resTurn (cap = 2 × ค่าสูงสุดของการ์ดพร) · flag ของ Cardforge (berserk, ctrAoe, dodgeStrike, overhealShield, thorns, killHeal, poisonSpread, fireSpread, waveShield) **ไม่อยู่ในรายการ ไม่มี cap** · ค่าที่อยู่ในรายการ: `vsBurn` 0.04 (cap 0.5), `vsPoison` 0.04 (cap 0.7), `counterDmg` 0.05 (ทะลุ cap ได้) → ไม่ถูกตัดทิ้ง แค่รวมกับการ์ด/พรแล้วชน cap ตามปกติ · BattleScene อ่าน flag เหล่านี้จาก `this.st.*` ไม่ผูกอาชีพ

### 2.3 ของ MVP 8 ชิ้น (ชื่อ/ผลของเราเอง · ตัวเลขร่าง)

| id | ช่อง | ชื่อ | ดัน | การ์ด | 🧱/💠 | zeny | ค่าพื้นฐาน (`base`/`mod`) | ✦ ลายเซ็น (`sig`) | โทษ | ★3 / ★5 ปลด (`bonus`) |
|---|---|---|---|---|---|---|---|---|---|---|
| `cf_jellthorn` | เกราะ | 🌵 เกราะหนามเยลลี่ | d1 | jellop×3 · king×1 | 8/2 | 400 | HP +50, DEF +6 | waveShield 4% + thorns 15% | Flee −3 | regen 0.3 / thorns +0.05 |
| `cf_shadowfang` | ประดับ | 🌑 จี้เขี้ยวเงา | d2 | shadowwolf×3 · bat×3 | 10/2 | 900 | AGI +2, Flee +5 | dodgeStrike | DEF −4 | dodgeHeal 0.02 / flee +6 |
| `cf_boarhelm` | หมวก | 🐗 หมวกเขี้ยวหมูป่า | d2 | boar×3 · shroom×3 | 10/2 | 900 | HP +40, DEF +5 | killHeal 2% | — | tenacity 0.05 / killHeal +0.01 |
| `cf_duelband` | ประดับ | 🤺 ปลอกแขนนักดวล | d3 | duelist×2 · skeleton×3 | 12/3 | 1,400 | สวนกลับ +5%, Hit +4 | ctrAoe | DEF −5 | counterDmg 0.05 / counter +0.04 |
| `cf_deathplate` | เกราะ | 💀 เกราะอัศวินมรณะ | d3 | deathknight×1 · gargoyle×3 | 12/3 | 1,400 | HP +90, DEF +8 | berserk | ASPD −0.1 | lifesteal 0.03 / maxHp +40 |
| `cf_plaguecharm` | ประดับ | ☠️ เครื่องรางพิษลาม | d4 | toad×3 · venomqueen×2 | 14/3 | 2,300 | พิษ +1 stack/hit, poisonDmg +1 | poisonSpread | ฮีลแรง −8% | vsPoison 0.04 / poisonCap +2 |
| `cf_lichveil` | หมวก | 👻 ผ้าคลุมวิญญาณลิช | d5 | lich×1 · wraith×3 | 16/4 | 3,800 | M.DEF +5%, Max Mana +10 | overhealShield | HP −6% (`pct.maxHp`) | healAmp 0.06 / regen 0.4 |
| `cf_emberring` | ประดับ | 🔥 แหวนเถ้าอเวจี | d5 | imp×3 · hexwitch×3 | 16/4 | 3,800 | INT +2, vsBurn +4% | fireSpread | M.DEF −3% | burnDps +2 / vsBurn +0.04 |

- 🧱/💠 = วัตถุดิบธรรมดา/บอสของดันนั้น (`matOf(dg, …)`) · เท่ากับ craft เดิมของดันเดียวกัน
- zeny = craft zeny **สูงสุด** ของดันนั้น × `CARDFORGE.zenyMul` แล้วปัดหลักร้อย → d1 250×1.5 = 375 → 400 · d2 600 → 900 · d3 900 → 1,350 → 1,400 · d4 1,500 → 2,250 → 2,300 · d5 2,500 → 3,750 → 3,800
- `cf_emberring` / `cf_plaguecharm`: desc ต้องบอก "ต้องมีแหล่งไฟ/พิษ" (plaguecharm มีพิษในตัวเองแล้ว)
- D6-D10: เพิ่มทีหลังตาม pattern เดียวกัน (การ์ดของ PACKS)

### 2.4 Data shapes (additive)

```ts
// src/data/craft.ts — ขยาย CraftInfo (optional ทุกช่อง: ของเดิมไม่กระทบ)
export interface CraftInfo {
  dg: string; common: number; boss: number; zeny: number; bonus: [Partial<Stats>, Partial<Stats>]
  /** Cardforge: bag cards eaten by the recipe, by card id */
  cards?: Record<string, number>
  /** Cardforge signature: added after grade/refine scaling, never scaled */
  sig?: Partial<Stats>
}

// src/data/cardforge.ts (ใหม่)
export const CARDFORGE = {
  zenyMul: 1.5,                                   // x craft zeny of the same dungeon
  cardsNeed: { normal: 3, mini: 2, boss: 1 } as Record<CardTier, number>,
  idPrefix: 'cf_',                                // ids are save data: never rename/remove
}
export const CARDFORGE_ITEMS: Item[] = [ /* 8 rows ตามตาราง 2.3, price: 0, craft: { …, cards, sig } */ ]

export interface CardforgeCost extends ForgeCost { cards: Record<string, number> }
```

### 2.5 Pure functions

| ฟังก์ชัน | ไฟล์ | ทำอะไร |
|---|---|---|
| `cardforgeCost(it): CardforgeCost` | `cardforge.ts` | mats + zeny + cards จาก `it.craft` |
| `bagCards(s, id): number` | `cardforge.ts` | `s.cards?.[id] ?? 0` (ในกระเป๋าเท่านั้น ไม่นับ `sockets`) |
| `canCardforge(s, it): { ok: boolean; short: string[] }` | `cardforge.ts` | ขาดอะไรบ้าง (ใช้ใน UI chip) |
| `cardforge(s, it): boolean` | `cardforge.ts` | จ่ายแบบ all-or-nothing → `owned.push(it.id)` · มีแล้ว/ยังไม่ปลด = false ไม่หักอะไร |
| `forgeItem` (แก้) | `craft.ts` | หลังรวม lines: `for (const [k, v] of Object.entries(it.craft?.sig ?? {})) mod[k] = r3((mod[k] ?? 0) + v)` (ไม่คูณ k) |
| `ALL_CRAFT` | `craft.ts` หรือ `meta.ts` | `[...CRAFT_ITEMS, ...CARDFORGE_ITEMS]` ให้ `ITEMS`/RecipeView ใช้ (ระวัง import วน: cards.ts ← meta.ts) |

- ⚠ import วน: `meta.ts` import `craft.ts` อยู่แล้ว · `cardforge.ts` ต้อง import `cards.ts` (ซึ่ง import type จาก meta) → ให้ `cardforge.ts` import แค่ **type** จาก meta และให้ meta เป็นคนรวม `CARDFORGE_ITEMS` เข้า `ITEMS` แบบเดียวกับ `CRAFT_ITEMS`

---

## 3. ♻️ หลอมคืน (Salvage)

### 3.1 กติกา
- หลอมได้: ของ **craft** (รวม Cardforge) ที่มีในกระเป๋า **ไม่ได้ใส่อยู่**
- หลอมไม่ได้: ของร้าน (ขายได้อยู่แล้ว) · ของเริ่มต้น · ของที่ใส่อยู่ · **Unique** (MVP) · ของแตก (ซ่อมก่อน: กันใช้หลอมคืนหนีค่าซ่อม)
- ได้คืน: วัตถุดิบ `floor(ที่ลงไป × 50%)` ต่อชนิด · **ที่ลงไป = สูตรสร้าง + อัปขั้นทุกขั้น** (คำนวณจากสูตร ไม่ต้องเก็บในเซฟ)
- **ไม่คืน:** zeny · การ์ดที่ใช้ผนึก · วัตถุดิบ/เชื้อ/zeny ที่ใช้ตีบวก · ค่าสุ่มออปชัน → ตีบวก/ออปชัน ยังเป็น sink เต็ม ๆ
- การ์ดที่ **เสียบ** อยู่ → เด้งกลับกระเป๋า (`unsocketAll` เดิม)
- จ่าย **ค่าธรรมเนียม zeny** (sink): `feeBase + feePerGrade × (ขั้น−1) + feePerRefine × บวก`
- หลังหลอม: เอาไอดีออกจาก `owned` + `forgetForge()` (เดิม: ล้างขั้น/บวก/บรรทัด/pity/rerollCount) · **`refineGems` ไม่ล้าง** (กฎเดิม) → สร้างใหม่แล้วตี +7/+10 ไม่ได้เพชรซ้ำ
- ของ Corrupt: หลอมได้ แต่คืน `SALVAGE.taintedReturn` (25%) → Corrupt ยังเสี่ยงจริง (คิว Approve 2026-11-07)
- สร้างใหม่ทีหลังได้ (สูตรไม่หาย)

### 3.2 ตัวอย่าง (`c_herosword` ดัน3 ★5 +7)
- ลงไป: สร้าง 🔩12 + 🔱3 · อัปขั้น 2→5 = 🔩34 + 🔱7 → รวม 🔩46 + 🔱10
- คืน 50%: 🔩23 + 🔱5
- ค่าธรรมเนียม: 50 + 50×4 + 25×7 = **425z**

### 3.3 Data + functions

```ts
// src/data/salvage.ts (ใหม่)
export const SALVAGE = {
  matReturn: 0.5,       // share of craft + grade mats given back (floor per mat)
  taintedReturn: 0.25,  // Corrupted items (Q 2026-11-07)
  cardReturn: 0,        // Cardforge cards are never given back
  feeBase: 50, feePerGrade: 50, feePerRefine: 25, // zeny sink
}
export interface SalvageResult { mats: Record<string, number>; fee: number; cards: string[] /* unsocketed */ }

export function investedMats(it: Item, grade: number): Record<string, number>   // craftCost + Σ gradeCost(2..grade)
export function salvageable(s: SaveData, it: Item): { ok: boolean; why?: 'worn' | 'notCraft' | 'unique' | 'broken' | 'notOwned' }
export function salvagePreview(s: SaveData, it: Item): SalvageResult            // pure, for the UI chips
export function salvage(s: SaveData, it: Item): SalvageResult | null            // pay fee, unsocket, addMat, forgetForge, remove from owned
```
- `salvage` ต้อง **ไม่แตะ `s.zeny` ในทางบวกเด็ดขาด** (เทสข้อ 9)
- isUnique / isTainted: `it.unique` และ `save.taint[id]` (v88/v89 บน `claude/unique-corrupt-tower-skip`) · Corrupt: `TAINT` = 3000z + ผลึกโลกันตร์ x2, 4 ผล (none/gold/curse/brick) ผลละ 25%

---

## 4. 🧩 ชุดดัน (เฟส 2, ร่าง)
- ใส่ของ craft ของดันเดียวกัน (ช่องต่างกัน) ครบ 2 / 3 ชิ้น → โบนัส · ของแตกไม่นับ · ใส่ผิดอาชีพไม่นับ (กติกา `wornItems` เดิม)
- ตัวอย่าง:

| ชุด | ชิ้น | 2 ชิ้น | 3 ชิ้น |
|---|---|---|---|
| 💧 ชุดเมือกใส | `c_jellring`, `c_jellcoat` / `cf_jellthorn`, `c_jellhood` | HP +40, regen 0.2 | waveShield +0.04 |
| 🌙 ชุดเงาจันทร์ | `c_moonfur`, `c_alphaclaw` / `cf_shadowfang`, `c_moonshield` / `c_moonquiver`, `cf_boarhelm` | Flee +6 | dodgeHeal +0.02 |

```ts
export interface ItemSet { id: string; name: string; icon: string; pieces: string[]; at: { n: number; mod: Partial<Stats> }[] }
export function setBonuses(worn: Item[]): { set: ItemSet; n: number; mod: Partial<Stats> }[] // pure, heroStats adds the mods
```
- ห้ามมีค่าเศรษฐกิจ (`dropChance`, `eventChance`, `legendChance`) ในโบนัสชุด

---

## 5. 👑 ปลุก Unique (เฟส 3, รอ data อีกเธรด)
- แนวคิด: Unique + การ์ดบอสของมัน ×1 + 💠×6 + zeny ก้อนใหญ่ (เช่น 5,000) → ลดโทษคำสาป 50% **ครั้งเดียว**
- ห้ามกับของ Corrupt (Corrupt = ล็อก)
- ตัวเลข/รูปแบบรอคิวดูกติกา Unique ก่อน ไม่ build ใน MVP

---

## 6. เข้ากับระบบเดิมยังไง

| ระบบ | Cardforge | หลอมคืน |
|---|---|---|
| ⬆️ อัปขั้น | ใช้ได้ ★1→5 (`gradeCap` = 5 เพราะมี `craft`) · `bonus` ปลด ★3/★5 | คืน 50% ของ mats อัปขั้น |
| ⚒️ ตีบวก | ใช้ได้ (`refinable` = มี `craft`) · `sig` ไม่ขยายตาม + | ไม่คืนอะไรจากตีบวก |
| 🎲 สุ่มออปชัน | ใช้ได้ปกติ · บรรทัดสุ่มกับ `sig` แยกกัน (`sig` สุ่มไม่ได้) | บรรทัดหายตาม `forgetForge` |
| ☠️ Corrupt | Corrupt ได้ตามกติกาอีกเธรด · `sig` ไม่ถูกแตะ (เสนอ) | คืน 25% |
| 👑 Unique | ไม่ใช่ Unique (ไม่นับโควตา 2 ชิ้น) | หลอมไม่ได้ (MVP) |
| 🃏 การ์ด | กินการ์ดในกระเป๋า · ช่องการ์ดตามปกติ (`slots: 1`) | การ์ดที่เสียบเด้งคืน |
| 💎 เพชร | **ไม่มีการใช้** | **ไม่มีการใช้** |
| 💔 แตก | — | ของแตกหลอมไม่ได้ |
| บอท | เพิ่ม env ได้ภายหลัง (`CARDFORGE=1` ใส่ของ cf) | ไม่เกี่ยว |

---

## 7. Economy check

**รายได้อ้างอิง (บอท v1):** ~46z/รอบดัน1 · ~213z/รอบดัน3 · ดันสูงกว่านี้ต้องวัดใหม่

| ฟีเจอร์ | zeny ออก (sink) ต่อครั้ง | ต่อชิ้น ตลอดอายุ | zeny เข้า |
|---|---|---|---|
| 🃏 Cardforge สร้าง | 400 – 3,800 (รวม 8 ชิ้น = **14,900z**) | + อัปขั้น 1,850 + ตีบวก ~8.7k ถึง +10 + ออปชัน 1,400×mul/ครั้ง ≈ **12k+** | **0** |
| 🃏 การ์ดที่ถูกกิน | — | ไม่ได้ขาย = zeny เข้าลด: ธรรมดา 30 · มินิ 150 · บอส 300 ต่อใบ (8 สูตร ≈ **2,490z**) | **0** (ลดลง) |
| ♻️ หลอมคืน | 50 – 500 ค่าธรรมเนียม | — | **0** (คืนแค่ mats) |
| 🧩 ชุด (เฟส 2) | ทางอ้อม: craft 2-3 ชิ้น/ดัน | ×2-3 ของ craft+อัปขั้น | **0** |
| ⚗️ แปรธาตุ (ถ้าทำ) | 60/ชิ้นที่ได้ | — | **0** |

**เช็กว่าไม่มี zeny เข้าใหม่ (ทุกข้อต้องจริง)**
- [ ] ของ Cardforge `price: 0` → `SELL_RATE × 0 = 0` และร้านไม่โชว์ (`price > 0` filter ใน ShopScene)
- [ ] `salvage()` ไม่เพิ่ม `s.zeny` · ไม่คืนการ์ด (การ์ดขายได้ = zeny ทางอ้อม)
- [ ] `sig` / ชุด ไม่มี `dropChance` `eventChance` `legendChance` (กองค่าสุ่มเดิมก็ห้ามอยู่แล้ว)
- [ ] วัตถุดิบขายไม่ได้ (คงเดิม) → คืน mats ไม่กลายเป็น zeny
- [ ] หลอมคืนแล้วสร้างใหม่ ไม่ได้เพชร +7/+10 ซ้ำ (`refineGems` ไม่ล้าง)

**⚠ FYI นอกขอบเขต (คิวรู้ไว้):** `meta.ts` มี `GEM_TO_ZENY_TEST = true` (ZENY_PER_GEM 50) = แหล่ง zeny ช่วงเทสต์ · ถ้า zeny เฟ้อตอนนี้ ตัวนี้อาจมีส่วน

---

## 8. Tunables (ทุกตัวเลขอยู่ที่นี่)

| key | ค่าเริ่ม | ไฟล์ | ผล |
|---|---|---|---|
| `CARDFORGE.zenyMul` | 1.5 | `cardforge.ts` | zeny สร้าง = craft zeny ดันเดียวกัน × ค่านี้ |
| `CARDFORGE.cardsNeed.normal` | 3 | `cardforge.ts` | การ์ดธรรมดาต่อสูตร |
| `CARDFORGE.cardsNeed.mini` | 2 | `cardforge.ts` | การ์ดมินิบอส |
| `CARDFORGE.cardsNeed.boss` | 1 | `cardforge.ts` | การ์ด MVP |
| ค่า `sig` / `mod` / `bonus` ต่อชิ้น | ตาราง 2.3 | `cardforge.ts` | ความแรงแต่ละชิ้น |
| `SALVAGE.matReturn` | 0.5 | `salvage.ts` | สัดส่วน mats ที่คืน |
| `SALVAGE.taintedReturn` | 0.25 | `salvage.ts` | ของ Corrupt |
| `SALVAGE.cardReturn` | 0 | `salvage.ts` | การ์ดผนึกที่คืน (ห้ามเกิน 0 ถ้าการ์ดยังขายได้) |
| `SALVAGE.feeBase` | 50 | `salvage.ts` | ค่าธรรมเนียมฐาน |
| `SALVAGE.feePerGrade` | 50 | `salvage.ts` | ต่อขั้นเหนือ ★1 |
| `SALVAGE.feePerRefine` | 25 | `salvage.ts` | ต่อ +1 |
| `SETS[].at[].mod` | ตาราง 4 | `sets.ts` (เฟส 2) | โบนัสชุด |
| `TRANSMUTE.ratio` / `feePer` | 3 / 60 | (เฟส 2 ถ้าทำ) | แปรธาตุ |

- ถ้าอยากปรับสดได้: ผูกกับ `src/data/tunables.ts` แบบเดียวกับค่า progression ที่มีอยู่

---

## 9. Save fields (additive, optional ทั้งหมด · ไม่ต้อง migrate)

| field | ชนิด | ใช้ทำ |
|---|---|---|
| — | — | Cardforge ใช้ `owned`, `cards`, `mats` เดิม ไม่ต้องเพิ่ม |
| — | — | หลอมคืน ใช้ `forgetForge` เดิม ไม่ต้องเพิ่ม |
| `forgePin?` | `string` | 📌 สูตรที่ปักหมุด (UX) |
| `forgeFast?` | `1` | ⚡ ตีเร็ว (UX) ถ้าไม่อยากใช้ localStorage |
| `salvaged?` | `number` | (ไม่บังคับ) นับจำนวนครั้ง สำหรับสถิติ/achievement |

---

## 10. Test plan (ไฟล์เป้าหมาย · รันทีละไฟล์ ห้ามรันทั้งชุดบนเครื่องคิว)

| ไฟล์ | ทดสอบอะไร |
|---|---|
| `tests/cardforge.test.ts` | นับเฉพาะการ์ดในกระเป๋า (ไม่นับที่เสียบ) · จ่ายครบหรือไม่จ่ายเลย · ยังไม่ปลด/มีแล้ว = false + เซฟไม่เปลี่ยน · ได้ไอดีเดียว |
| `tests/forge-sig.test.ts` | `forgeItem` บวก `sig` แบบไม่ขยาย (★5 +10 ค่า sig เท่า ★1) · โทษติดลบไม่ขยาย · ของเดิม (ไม่มี sig) ผลเท่าเดิมทุกชิ้น (snapshot `CRAFT_ITEMS`) |
| `tests/salvage.test.ts` | `investedMats` ตรงกับ craftCost + gradeCost · floor 50% · ค่าธรรมเนียม · การ์ดที่เสียบเด้งคืน · `forgetForge` ล้างแต่ `refineGems` อยู่ · ปฏิเสธ worn/unique/broken/ของร้าน |
| `tests/forge-zeny-invariant.test.ts` | สุ่มเซฟ 500 แบบ (seeded) × ทุก action ใหม่ → `zeny หลัง ≤ zeny ก่อน` เสมอ · craft→salvage→craft ไม่ได้ mats เพิ่ม |
| `tests/item-sets.test.ts` (เฟส 2) | 2/3 ชิ้นนับถูก · ของแตก/ผิดอาชีพไม่นับ · ไม่มีค่าเศรษฐกิจ |
| `tests/option-gacha.test.ts` (เดิม) | ยังผ่าน (Cardforge ใช้ reroll ได้) |

- `tools/test.mjs` ตอนนี้ bundle **ทุกไฟล์** ใน `tests/` → เสนอเพิ่ม filter ง่าย ๆ: `node tools/test.mjs salvage` (กรองชื่อไฟล์จาก `process.argv[2]`) ให้รันไฟล์เดียวได้บนเครื่องคิว

---

## 11. ลำดับ build (หลัง branch Unique/Taint merge)
1. `craft.ts`: เพิ่ม `cards?`, `sig?` ใน `CraftInfo` + บรรทัด sig ใน `forgeItem` → `forge-sig.test.ts`
2. `cardforge.ts` + รวมเข้า `ITEMS` → `cardforge.test.ts`
3. `salvage.ts` → `salvage.test.ts` + `forge-zeny-invariant.test.ts`
4. UI ตาม `craft-ux-v1.md` เฟส P5
5. (ถามคิวก่อน) รันบอท 1 คลาสพร้อม `cf_deathplate` / `cf_shadowfang` ดูว่าแรงเกินไหม

---

## คำถามถึงคิว (คิวตอบ Approve ทั้ง 4 ข้อ 2026-11-07)
1. **MVP = ผนึกการ์ด + หลอมคืน** โอเคไหมคะ? (ชุดดัน = เฟส 2 · ปลุก Unique = เฟส 3)
2. **ของผนึกการ์ดใส่ได้ทุกอาชีพ** (เช่น นักดาบได้ "หลบแล้วตีสวน") โอเคไหม? หนูแนะนำ **ได้** เพราะเป็นจุดขาย "ของแปลก" และมีโทษคู่ทุกชิ้น
3. **หลอมคืน**: คืนวัตถุดิบ 50% · ไม่คืน zeny/การ์ด/ค่าตีบวก · เสียค่าธรรมเนียม 50-500z · ของ Corrupt คืน 25% · Unique หลอมไม่ได้ → โอเคไหม?
4. **UX**: 5 แท็บ → 3 โหมด (ทั่ง/สูตร/คลัง) + ตีแตกไม่เด้ง popup แล้ว (โชว์บนทั่งแทน) → โอเคไหม?
- (ไม่มีการใช้เพชรใหม่ · ไม่ต้องตัดสินเรื่องเพชร)
