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
