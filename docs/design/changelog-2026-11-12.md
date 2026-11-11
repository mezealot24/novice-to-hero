# 📜 Dev Log (2026-11-12): Refactor — แยกไฟล์เกิน 1000 บรรทัด

## 1. 🧹 Track D1 — admin/explain.ts

- **D1.1** ย้าย `TABLE_EXPLAIN` + types + label dictionaries → `src/admin/explain/labels.ts` (verbatim, ไม่เปลี่ยน behavior)
- **D1.2** ย้าย `BATTLE_STATIC` → `src/admin/explain/battle.ts` (verbatim, ไม่เปลี่ยน behavior)
