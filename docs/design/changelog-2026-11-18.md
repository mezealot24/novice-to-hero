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

## 🌳 feat(thief): P2'a core column + row-2 talents (web data)
- `thief_crit` + `thief_blood` → one core column `thief_core` 🩸 เลือด·คริ: c1 คมเลือดซ้อนสถานะ (lifesteal vs a target with poison / chill, ×1.5 at 2 kinds) · c2 🔻 หมายหัว (main's, unchanged) · c3 🦇 กระหายเลือด (kill heal + poison on the corpse + Energy · first boss / mini crit each turn heals) · c4 ★ 👑 ราชันย์โลหิต (HP < 45%: lifesteal ×1.75, D.Strike leech 33% → 66%)
- Retired: มีดคู่ · คมเลือด · เลือดพิษ · old กระหายเลือด / ราชันย์โลหิต (`thief_l*`) · คริชาร์จ · เพชฌฆาต — no flat filler left in the column
- Row 2 talents: ⚡ ขโมยจังหวะ (dodge Energy + CD cut, ICD) · 🎯 จุดบอดซ้อนพิษ (crit / skillCrit per poison stack, max 14) · 🧪 จังหวะสลับมีด (basic after แทงพิษ +25/40% · Energy +10/16, no more autoCostCut)
- a-line (main's poison rework), เงา column, row 1/3/4 talents untouched · hooks come in the next commits (data only here)
- Tests: `tests/thief-p2a.test.ts` (web + talents) · `admin-model` borrow tests pick crit / lifesteal nodes from any class

## 🔁 feat(thief): s1Weave alternation (Q3) and D.Strike Energy
- สลับคม: after แทงพิษ the next hero action is a basic attack (`s1Weave`, cleared by any basic attack, reset each wave) → outside 👤 ร่างเงา S1 : basic = 1:1 whatever the cost cut
- Q3: a free ร่างเงา แทงพิษ does not set the weave, and the weave never blocks a cast inside ร่างเงา (free S1 spam stays like live)
- An ult or a booked-but-not-castable turn leaves the weave pending ("the next basic attack"); manual mode is unchanged (no booking = basic)
- D.Strike landing: Energy +`KIT.thiefStrikeRes` 4 (Energy classes only) · its lifesteal share reads `KIT.thiefStrikeLs` 0.33 (was a hardcoded 0.33, same number)
- Rogue / Mobster share it (`job.id === 'thief'`)
