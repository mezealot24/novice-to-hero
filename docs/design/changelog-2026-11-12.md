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
- **B2.2** ย้าย `Resource` / `Stats` / `PLAYER` / `RULES` → `src/data/stats.ts` (verbatim; ไม่มี import เลย, `RULES` ไม่ clone เพราะ `patch.ts` mutate in place; `BaseStat` type ที่ `MonsterDef` ใช้ยังอยู่ใน `game-data.ts`)
- **B2.3** ย้าย `Tag` / `TAGS` / `Perk` / `perkDesc` / `PERKS` / `COMMON_PERKS` / `SET_BONUS` → `src/data/perk-tags.ts` (verbatim; `import type { Stats }` จาก `./stats` เท่านั้น)
- **B2.7** (ทำก่อน B2.4/B2.5/B2.6 เพราะ `HARD_SKILLS` / `DungeonDef` ต้องใช้ type `MonSkill` / `MonsterKind` กัน import ผ่าน barrel) ย้าย `MonsterKind` / `MiniKind` / `HitFx` / `MonSkillKind` / `MonSkill` / `BossPhase` / `MonsterDef` / `MONSTERS` + `KITS` (+ loop `Object.assign`) + `hasFx` + default-fill loop → `src/data/monsters.ts` (verbatim; ลำดับ load-time เดิม: `MONSTERS` → `KITS` loop → default-fill loop, อ่าน `PACKS` จาก `./dungeons` ตรง)
- **B2.4** (ทำหลัง B2.7) ย้าย `HARD` / `hardCurve` (ยัง private) / `hardGap` / `hardMul` / `HARD_SKILLS` / `HardPassive` / `HARD_PASSIVES` → `src/data/hard-mode.ts` (verbatim; `import type { HitFx, MonSkill }` จาก `./monsters`, object เดิม ไม่ clone เพราะ `patch.ts` mutate in place)
- **B2.5** (ทำหลัง B2.4/B2.7) ย้าย `doubleAtkChance` / `hitChance` / `afterDef` / `COMBO` / `RESIST_RULES` / `softCapDiminish` / `comboExtra` / `BATTLE` → `src/data/battle-rules.ts` (verbatim; `BATTLE.monSpeed` อ่าน `PACKS` จาก `./dungeons` ตรง + `import type { MonsterKind }`; `COMBO` / `BATTLE` ไม่ clone เพราะ `patch.ts` mutate in place)
- **B2.6** (ทำหลัง B2.7/B2.5) ย้าย `RoomDef` / `DungeonDef` / `DUNGEONS` / `DUNGEON` → `src/data/dungeon-defs.ts` (verbatim; `DUNGEONS` อ่าน `PACKS` จาก `./dungeons` ตรง, `DUNGEON = DUNGEONS[0]` อยู่หลัง `DUNGEONS` เหมือนเดิม); `game-data.ts` เหลือเป็น barrel ล้วน (`export *` 7 บรรทัด)
- ลำดับทำจริง: B2.1 → B2.2 → B2.3 → B2.7 → B2.4 → B2.5 → B2.6 (ไม่มีไฟล์ใหม่ import จาก barrel `./game-data`); `./dungeons/*` import `../game-data` แบบ `import type` เท่านั้น (เช็คแล้ว ไม่มี runtime cycle)

## 4. 🧹 Track C — CharacterScene.ts → scenes/character/

- หมายเหตุ: ไม่มี C2 (`CharCtx`) — ใช้การส่ง scene เข้าไปเป็น parameter แรกของ free function แทน (`fooTab(scene, ...)`) เพื่อให้ diff เป็น mechanical; ตั้งชื่อ param ว่า `scene` ไม่ใช่ `s` เพราะเกือบทุก method มี local `const s = save()` ชนกัน; state ทั้งหมดยังอยู่บน scene instance (field/method ที่ถูกเรียกข้ามไฟล์ถอด `private`)
- **C1** ย้าย `DetailRow` / `nodeDetail` / `clip` / `clipW` → `src/scenes/character/node-detail.ts` (verbatim; เพิ่ม `export` ให้ `clip` / `clipW`; `CharacterScene.ts` ยัง `export { nodeDetail }` ต่อผ่าน re-export)
- **C3** ย้าย `statusTab` / `statDesc` → `src/scenes/character/status-tab.ts` (verbatim; `this` → `scene`, `this.statDesc(...)` → `statDesc(scene, ...)`; ถอด `private` ของ `body` / `redraw`)
- **C4** ย้าย `talentTab` → `src/scenes/character/talent-tab.ts` (verbatim; ถอด `private` ของ `talent2`)
- **C5** ย้าย `ultModal` / `drawUltEvolutionSidebar` → `src/scenes/character/ult-modal.ts` (verbatim; ถอด `private` ของ `showUlt` / `render` / `modal`)
- **C6** ย้าย `drawPreview` / `drawSkillHeroStrip` → `src/scenes/character/preview.ts` (verbatim; `BRANCH_PET` ไม่ได้ย้าย เพราะมีแค่ `unifiedWebTab` ที่ใช้; ถอด `private` ของ `preview` / `tab` / `skillBasic`)
- **C7** ย้าย `cardTab` / `cardBagView` / `cardBookView` → `src/scenes/character/cards-tab.ts` (verbatim; ถอด `private` ของ `cardPage` / `cardBook` / `bookDg` / `bookV2`)
- **C8** ย้าย `equipTab` / `takeOff` → `src/scenes/character/equip-tab.ts` (verbatim; ถอด `private` ของ `slot` / `bagPage`)
- **C9** ย้าย `skillTab` (novice/basic view) → `src/scenes/character/skill-basic.ts` (verbatim; ไม่ต้องถอด `private` เพิ่ม)
- **C10** ย้าย `renderSelectedNodeFooter` / `nodeFooter` / `nodeModal` → `src/scenes/character/node-footer.ts` (verbatim; `nodeFooter` เก็บ positional params เดิมทั้งหมด แค่เติม `scene` เป็นตัวแรก; ถอด `private` ของ `selNode` / `previewJob2Idx` / `showDetail`)
- **C11** ย้าย scroll cluster (`scrollToWebY` / `webActive` / `webTier` / `applyWebScroll` / `webPointerDown` / `webPointerMove` / `webPointerUp` / `webThumbTo`) → `src/scenes/character/web-scroll.ts` (verbatim; tween ยังใช้ scene เป็น target โดย `killTweensOf(scene)` / `targets: scene` animate `webScrollY` บน scene เหมือนเดิม; ถอด `private` ของ `webScrollY` / `webMaxScroll` / `webC` / `webView` / `webThumb` / `webSb` / `webHits` / `webPills` / `webDrag` / `tierOffsets`; input handler ใน `create()` เรียก free function ด้วย `this` ลำดับ event เดิม)
