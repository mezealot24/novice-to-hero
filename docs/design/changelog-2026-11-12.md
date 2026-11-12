# 📜 Dev Log (2026-11-12): Refactor — แยกไฟล์เกิน 1000 บรรทัด

## 1. 🧹 Track D1 — admin/explain.ts

- **D1.1** ย้าย `TABLE_EXPLAIN` + types + label dictionaries → `src/admin/explain/labels.ts` (verbatim, ไม่เปลี่ยน behavior)
- **D1.2** ย้าย `BATTLE_STATIC` → `src/admin/explain/battle.ts` (verbatim, ไม่เปลี่ยน behavior)
- **D1.5** ย้าย `explainSkillLeaf` + `explainMonsterField` → `src/admin/explain/monsters.ts` (verbatim; ทำก่อน D1.3 เพราะ `explainHard*` เรียก `explainSkillLeaf` กัน import cycle)
- **D1.3** ย้าย `COMBO_EXPLAIN` / `explainHard*` / `MON_STAT_MAP` / `SKILL_SCALE_MAP` / `PROGRESSION_MAP` / `KIT_EXPLAIN` → `src/admin/explain/combo-kit.ts` (verbatim, ไม่เปลี่ยน behavior)
- **D1.4** ย้าย `S2P_TH` / `S2N_TH` / `J2_DETAIL_HINTS` / `explainKit2Effect` / `explainSkillTable` → `src/admin/explain/skills.ts` (verbatim; `explain.ts` เหลือแค่ imports + `explainField` / `explainTableGroup` + re-exports)

## 2. 🧹 Track B1 — data/meta.ts → barrel + data/meta/

- **B1.1** ย้าย `SELL_RATE` / `COSTUMES` / `GEM_PACKS` / `ZENY_PACKS` / `GEM_BUY_PACKS` / `SUPPORTER_PRICE` / `FREE_GEMS` (+ test flags) → `src/data/meta/economy.ts` (verbatim; `meta.ts` re-export ผ่าน `export *`, importers ไม่ต้องแก้)
- **B1.2** ย้าย `PER_POINT` / `BASE_STATS` / `RESOURCES` / `STAT_RULES` / `JOB_BONUS*` / `JOB_RULES` / `BASE_NAME` + `BaseStat` → `src/data/meta/stat-spec.ts` (verbatim; object เดิม ไม่ clone เพราะ `patch.ts` mutate in place)
- **B1.3** ย้าย `SKILLS` / `NOVICE_RULES` / `smashLv` / `NOVICE_PASSIVES` / `noviceSpent` / `noviceLeft` / `CERT_SLOTS_AT` → `src/data/meta/novice.ts` และ `RACES` → `src/data/meta/races.ts` (verbatim)
- **B1.4** ย้าย `Slot` / `EquipSlot` / `SLOTS` / `EQUIP_SLOTS` / `EMPTY_ITEM` / `BARE_ITEM` / `slotKind` / `ItemReq` / `Item` → `src/data/meta/item-types.ts`; เพิ่ม `export` ให้ `SW/AR/MG/CL/TH` (เดิม private) เพราะ items-*.ts ต้องใช้
- **B1.5** แยก `ITEMS` literal เป็น `WEAPONS` / `ARMOR` / `HEAD_OFF` → `src/data/meta/items-{weapons,armor,head-off}.ts` (verbatim; `meta.ts` ประกอบ `ITEMS` ด้วย spread ตามลำดับเดิม, ไม่ re-export 3 array นี้)
- **B1.6** ย้าย `ITEMS` (spread `WEAPONS`/`ARMOR`/`HEAD_OFF` + craft/cardforge/uniques/uniques3/class-gear/class-craft ตามลำดับเดิม) + `itemById` / `canWear` / `canWearAs` / `itemUnlocked` / `REQ_TEXT` → `src/data/meta/items.ts`; เช็ค id order 196 ตัวเหมือนเดิม
- **B1.8** (ทำก่อน B1.7 เพราะ `forgeTag` เรียก `splitStatLine`) ย้าย `STAT_LABEL` / `CLASS_STAT_LABEL` / `splitStatLine` / `itemStatLine` / `StatEntry` / `statEntries` / `cardStatLine` / `wearText` → `src/data/meta/stat-text.ts` (verbatim; label tables ยัง private)
- **B1.7** (ทำหลัง B1.8) ย้าย `slotCount` / `gradeOf` / `ForgeState` / `refineOf` / `isBroken` / `linesOf` / `isTainted` / `forged` / `forgeTag` → `src/data/meta/forge-state.ts` (verbatim)
- **B1.10** (ทำก่อน B1.9 เพื่อให้ `StatsInput` อยู่ที่เดียวกับ worn helpers ชั่วคราว ไม่ต้อง import ผ่าน barrel) ย้าย `StatsInput` / `gearBase` / `jobBonusBase` / `jobUpText` / `totalBase` / `applyBase` / `baseDefence` / `blessBase` / `heroStats` → `src/data/meta/hero-stats.ts` (function body verbatim; `meta.ts` เหลือแค่ barrel)
- **B1.9** (ทำหลัง B1.10) ย้าย `wornItems` / `offhandLocked` / `cardFits` / `socketed` / `wornCards` → `src/data/meta/worn.ts`; `import type { StatsInput }` จาก `hero-stats` (type-only, ไม่เกิด runtime cycle)

## 3. 🧹 Track B2 — data/game-data.ts → barrel

- **B2.1** ย้าย `TILE` / `COLS` / `ROWS` / `W` / `H` + `COLORS` / `FONT_UI` / `FONT_NUM` → `src/data/ui-tokens.ts` (verbatim, ไม่เปลี่ยน behavior; `game-data.ts` re-export ผ่าน `export *`, importers ไม่ต้องแก้)
