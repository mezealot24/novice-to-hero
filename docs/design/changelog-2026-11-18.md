# Changelog 2026-11-18

## 🔧 feat(thief): P2a stat + KIT keys and admin registry
- 14 new `Stats` keys (default 0 in `PLAYER`): `thPoisonPen` `thToxicHold` `thStrikePoison` `thPlagueDeath` `thCondLeech` `thStackCrit` `thCritPoison` `thKillLeech` `thBloodKing` `thDodgeCdCut` `thDodgeCdIcd` `thStackCritTal` `thWeaveDmg` `thWeaveRes`
- 19 new `KIT` keys from R4.7.2 (INTS 9 · NUMS 10), Thai label + effect in `KIT_EXPLAIN`, listed in `SKILL_LAYOUT.thief` (`s1` + new `tree` column)
- No behavior yet (spec: `design/p2/P2a-spec.md` T1)

## ⚡ feat(thief): แทงพิษ cost 45, Energy floor 30, pure helpers
- `JOBS.thief.auto.cost` 40 → 45 (desc: "แล้วตีปกติ 1 เทิร์น (สลับคม)") · `autoCost()` floor for Thief (Rogue / Mobster too) = `KIT.thiefAutoMinCost` 30
- Pure helpers in `skill-math.ts`: `thiefS1Woven` `thiefStackCritAdd` `thiefCondLeechAdd` `thiefKillHeal` `thiefBossCritHeal` `thiefToxicHold` `thiefSpreadAmount` `thiefBloodKingOn`
- `autoInfo` Thief row "สลับคม"
