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

## 🩸 feat(thief): core hooks c1 / c3 / c4 (leech, kill heal, blood king)
- c1 คมเลือดซ้อนสถานะ: physical hits on a monster with poison / chill leech +`thCondLeech` (×`thiefCondLeechMulti` at 2 kinds); base lifesteal + this stays under the new `LIFESTEAL_CAP` 0.4 (`heroBuild` uses it too)
- c3 กระหายเลือด: kill heals `thKillLeech` + 0.5%/poison stack on the corpse (max +12%) + Energy `thiefKillRes` · first crit on a boss / mini per hero turn heals + Energy `thiefBossCritRes` (shares the gear once-per-turn flag)
- c4 ★ ราชันย์โลหิต: HP < 45% → lifesteal ×1.75 (gear ★ ×2 wins if both, never stacked) · D.Strike leech share 33% → 66%
- Gear / card `killHeal` Energy reads `KIT.thiefKillRes` (10, same as before) · c2 หมายหัว is main's, no new hook

## ⚡ feat(thief): row-2 talent hooks (dodge cooldown cut, stack crit, weave bonus)
- ⚡ ขโมยจังหวะ: a dodge also cuts Skill 2 (if its CD is the longer one) or the Ult CD by 1, then waits 3 / 2 hero turns (ICD, reset each wave) · Ult CD cut goes through the new single `cutUltCd()` (P2'c adds the global cap there)
- 🎯 จุดบอดซ้อนพิษ: physical crit / skillCrit +1.0 / 1.6% per poison stack on the target (counts up to `thiefStackCritTalMax` 14), under the usual crit caps
- 🧪 จังหวะสลับมีด: the basic swing right after แทงพิษ gets +25 / 40% in the basic bracket (all its basic / combo / D.Strike hits) and Energy +10 / 16

## 💾 feat(save): Thief rework v1 — free class 1 web + talent reset
- New `SaveData.thiefRogueRework` (version number, `THIEF_REWORK_VER` 1; new saves start at 1)
- Old Thief saves (Rogue / Mobster too, `job === 'thief'`): class 1 web + talents reset once with a full refund via `resetTree()` (cross-tier points back to their own pool) · 2nd-job web / talents / points untouched · corrupt `jobTree` entries are dropped, never crashes
- Other classes only get the flag · `tools/bot.cjs` sets the flag so bot saves keep their web (bot not run)
- Tests: migration cases in `tests/thief-p2a.test.ts` (refund, idempotent, Mobster / Rogue job2 kept, cross-tier, corrupt data, `load()` end to end)

## 🔧 feat(thief): P2'b B1 takenAmp helpers + keys (thresholds scale with the poison cap)
- Plan: `design/p2/MAIN-VS-REV4.md` §4 slice P2'b (status layer + Skill 2), on top of P2'a
- Pure helpers in `skill-math.ts`: `takenAmp()` (R4.6 B1: Exposed + Privileged + แผลลึก Privileged + gear กัดกร่อน, **added** under one cap) · `debuffKinds()` (narrow 4 / wide 8 kinds) · `poisonAt(share, cap)`
- New `KIT`: `thiefTakenCap` 0.6 · `thiefPrivShare` 0.6 · `thiefPoisonAmpShare` 0.5 · `thiefStackHpMax` 20 (admin `kit` + Thai labels)
- Stack thresholds are a share of the hero's poison cap (§5.1 #3): at cap 20 gear กัดกร่อน = 10 stacks (same as today), สถานะทับซ้อน = 12 · cap 29 → 15 / 18
- No behavior yet · tests: `tests/thief-p2b.test.ts`

## 🔧 feat(thief): P2'b Skill 2 numbers ม่านควัน / แผลลึก + admin labels
- `S2P.smokeRes` {10, 5} (ควันหอม Energy, rounded) · `S2P.woundMax` {6, 2/3} (แผลฉีก Wound cap, floored)
- 18 plain `S2N` numbers: Shroud (`smokeTurns` 2 · `smokeFlee` 0.25 · `smokeSkillCrit` 0.15 · ★ `smokeCritDmg` 0.25) · Sightless Raid `raidMul` 1.2 · Exposed 0.2 / ★ 0.3, 2 turns · Blind 2 turns · Wound 2 / ★ 3 stacks, 3 hero turns, D.Strike 50% · Blade's End at 3 Wound, 1.8x, heal cut 40% 2 turns · Privileged +12%
- All in admin `skills` (Thai labels in `S2N_TH` / `S2P_TH`) · ล้วงกระเป๋า untouched (main's steal)
- Numbers only: skill texts + behavior land with the ม่านควัน / แผลลึก commits

## 🔧 feat(thief): P2'b monster statuses Exposed / Wound / heal cut
- New monster fields: 👁️ Exposed (monster turns + B1 share) · 🩸 Wound (stacks, **hero** turns, ticks before Skill 2) · Blade's End heal cut + once-per-turn flag
- `healCut()` takes the bigger of burn / hellfire / Blade's End cut (never stacked) · Toxic Skin does not speed up Wound / Exposed
- thief_c1 คมเลือด status kinds = poison / Wound / Exposed / chill (`debuffKinds`) · th_t2b จุดบอดซ้อนพิษ counts poison + Wound stacks (texts updated)
- No source of Wound / Exposed yet (ม่านควัน / แผลลึก commits)

## ⚖️ feat(thief): P2'b B1 takenAmp in damageMon (replaces the flat poisonAmp line)
- `damageMon` line `poisonAmp && m.poison >= 10` → `takenAmpOf(m, dot)`: Exposed (hits only) + th_t4a Privileged + แผลลึก Privileged + gear / card / set กัดกร่อน, **added**, cap `KIT.thiefTakenCap` 0.6
- Gear กัดกร่อน threshold = `thiefPoisonAmpShare` 0.5 × the hero's poison cap: cap 20 → 10 stacks (same) · พิษสะสม cap 29 → 15 · dot still counts (as before)
- Only number change today: gear 0.45 + talent กัดกร่อน 0.25 = ×1.70 → capped ×1.60
- New `Stats.thPrivileged` (0 until the th_t4a commit) · stat / set / talent texts say "half the poison cap"

## ⚖️ feat(thief): P2'b talents สถานะทับซ้อน (th_t4a) + กายต้านพิษ (th_t1c) · save rework v2
- `th_t4a` กัดกร่อน → 🧫 **สถานะทับซ้อน**: monster with poison ≥ 60% of the poison cap (12 at cap 20) **or** ≥ 2 debuff kinds (poison / Wound / Exposed / chill / blind / armor break / weak) takes +18% / +30% damage, dot too · B1 (cap +60% with Exposed / gear)
- `th_t1c` หนังหนา (+40 / +80 HP) → 🩸 **กายต้านพิษ**: while any monster has poison / Wound: tenacity +8% / +14% · Max HP +8 / +14 per poison + Wound stack on the field (max 20 stacks = +160 / +280), delta-tracked, HP clamped when it fades
- New `Stats.thStackHp` / `thCondTenacity`
- Save: `THIEF_REWORK_VER` 1 → 2, same minimal reset (class 1 web + talents refunded once; job2 untouched) · bot save flag synced (not run)
