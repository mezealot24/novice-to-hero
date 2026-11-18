# Changelog 2026-11-18

## 🔧 feat(thief): P2'a stat + KIT keys and admin registry (plumbing, no behavior yet)
- Plan: `design/p2/MAIN-VS-REV4.md` §4 slice P2'a (on top of main's live rework: เกจเงา · หมายหัว · steal · poison cap 20)
- 14 new `KIT` keys (`thiefAutoMinCost` 30 · `thiefStrikeRes` 4 · `thiefStrikeLs` 0.33 · core c1 / c3 / c4 numbers · `thiefStackCritTalMax` 14), all in admin `kit` with Thai labels (skill registry s1 + new Thief `tree` column, `KIT_EXPLAIN`)
- 8 new `Stats` keys (`thCondLeech` `thKillLeech` `thBloodKing` `thDodgeCdCut` `thDodgeCdIcd` `thStackCritTal` `thWeaveDmg` `thWeaveRes`), 0 by default
- Dropped P2 keys (a-line pen / hold / plague, จุดตายสะสม) are not added: main's a-line + หมายหัว stay
- Docs: owner answers Q1–Q3 + save rule recorded in MAIN-VS-REV4 ("คำตอบของคิว")

## ⚖️ feat(thief): แทงพิษ cost 45, Energy floor 30, pure helpers
- `JOBS.thief.auto.cost` 40 → 45 (Rogue / Mobster use it too) · `autoCost()` floor for the Thief line = `KIT.thiefAutoMinCost` 30 (other classes keep floor 10 / own cost)
- New pure helpers in `skill-math.ts` (tested in `tests/thief-p2a.test.ts`): `thiefS1Woven` (Q3: never woven inside 👤 ร่างเงา) · `thiefStackCritAdd` (th_t2b only) · `thiefCondLeechAdd` · `thiefKillHeal` · `thiefBossCritHeal` · `thiefBloodKingOn`
- แทงพิษ text + Skill 1 info row "สลับคม" (behavior lands with the s1Weave commit)
