# Changelog 2026-11-18

## 🔧 feat(thief): P2'a stat + KIT keys and admin registry (plumbing, no behavior yet)
- Plan: `design/p2/MAIN-VS-REV4.md` §4 slice P2'a (on top of main's live rework: เกจเงา · หมายหัว · steal · poison cap 20)
- 14 new `KIT` keys (`thiefAutoMinCost` 30 · `thiefStrikeRes` 4 · `thiefStrikeLs` 0.33 · core c1 / c3 / c4 numbers · `thiefStackCritTalMax` 14), all in admin `kit` with Thai labels (skill registry s1 + new Thief `tree` column, `KIT_EXPLAIN`)
- 8 new `Stats` keys (`thCondLeech` `thKillLeech` `thBloodKing` `thDodgeCdCut` `thDodgeCdIcd` `thStackCritTal` `thWeaveDmg` `thWeaveRes`), 0 by default
- Dropped P2 keys (a-line pen / hold / plague, จุดตายสะสม) are not added: main's a-line + หมายหัว stay
- Docs: owner answers Q1–Q3 + save rule recorded in MAIN-VS-REV4 ("คำตอบของคิว")
