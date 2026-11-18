# Changelog 2026-11-18

## 🔧 feat(thief): P2a stat + KIT keys and admin registry
- 14 new `Stats` keys (default 0 in `PLAYER`): `thPoisonPen` `thToxicHold` `thStrikePoison` `thPlagueDeath` `thCondLeech` `thStackCrit` `thCritPoison` `thKillLeech` `thBloodKing` `thDodgeCdCut` `thDodgeCdIcd` `thStackCritTal` `thWeaveDmg` `thWeaveRes`
- 19 new `KIT` keys from R4.7.2 (INTS 9 · NUMS 10), Thai label + effect in `KIT_EXPLAIN`, listed in `SKILL_LAYOUT.thief` (`s1` + new `tree` column)
- No behavior yet (spec: `design/p2/P2a-spec.md` T1)

## ⚡ feat(thief): แทงพิษ cost 45, Energy floor 30, pure helpers
- `JOBS.thief.auto.cost` 40 → 45 (desc: "แล้วตีปกติ 1 เทิร์น (สลับคม)") · `autoCost()` floor for Thief (Rogue / Mobster too) = `KIT.thiefAutoMinCost` 30
- Pure helpers in `skill-math.ts`: `thiefS1Woven` `thiefStackCritAdd` `thiefCondLeechAdd` `thiefKillHeal` `thiefBossCritHeal` `thiefToxicHold` `thiefSpreadAmount` `thiefBloodKingOn`
- `autoInfo` Thief row "สลับคม"

## 🌐 feat(thief): P2a skill web a-line, core column, row-2 talents
- ☠️ พิษ (a-line): `thief_a1` เคลือบพิษอาบคม (poison + pen vs poisoned) · `thief_a2` พิษกัดลึก (poisonDmg + vsPoison, B2) · `thief_a3` พิษทนทาน (poisonCap + toxicSkin hold + D.Strike poison) · `thief_a4` ★ ระเบิดพิษลาม (spread 60% + Plague Burst)
- 🩸 new single core column `thief_core` replaces `thief_crit` + `thief_blood`: `thief_c1` คมเลือดซ้อนสถานะ · `thief_c2` จุดตายสะสม · `thief_c3` กระหายเลือด · `thief_c4` ★ ราชันย์โลหิต (ids `thief_c2..c4` reused, gated by the save migration) · `thief_b3`, `thief_l1..l4` removed
- Talents row 2: `th_t2a` ขโมยจังหวะ (+CD cut) · `th_t2b` จุดบอดซ้อนพิษ (crit per stack) · `th_t2c` จังหวะสลับมีด (weave bonus; no more `autoCostCut`)
- Tests: new `tests/thief-p2a.test.ts` · `admin-model` borrow tests no longer use removed Thief nodes
- Hooks come in the next commits (data only here)

## 🔁 feat(thief): s1Weave alternation and D.Strike energy
- สลับคม: after แทงพิษ the next hero action is a basic attack (`s1Weave`, cleared by any basic attack · a booked Ult keeps it) → S1 : Basic = 1 : 1 even with cost cuts (Rogue / Mobster too: `job.id` stays `thief`)
- Double Strike landing: Energy +`KIT.thiefStrikeRes` (4) · its leech share is `KIT.thiefStrikeLs` (was hardcoded 0.33)
- Test: 20-turn Energy simulation in `tests/thief-p2a.test.ts`
