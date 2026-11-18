# Changelog 2026-11-19

## ⚖️ balance(thief): เงาพริ้ว Ratio AGI (Q's pick, K = 2.0)
- Was `thUltAgi = 0.02 × AGI` (uncapped): damage = P.ATK × AGI, both grow with level -> early Thief weak, late runaway
  - Q's Lv 80 Rogue (AGI 238): ×5.74 per stab, 1311–2384/stab (crit 6317), ~90% of พายุมีด damage
- Now `thUltAgi = K × min(cap, AGI above start / stat pool)` · pool = `pointsPerLevel × Base Lv` (`statPool()`)
  - all-in AGI = ×3.0 at **every** Base Lv (Lv 20 ≈ +38% vs before · Lv 40 ≈ −11% · Lv 80 ≈ −48%)
  - gear / race / job AGI count, share cap 1.2 (×3.4 max)
- New `KIT.thiefUltAgiK` 2 · `KIT.thiefUltAgiShareCap` 1.2 (admin table `kit`, with Thai explain)
- `StatsInput.baseLevel` (optional; SaveData already has it) · no baseLevel -> pool = allocated points
- Status tab AGI line + เงาพริ้ว desc show the new rule · Mobster unaffected (ทวงหนี้ does not call shadowDance)
- Tests: `tests/thief-ult-agi.test.ts`
- Not bot-checked (Q playtests)

## 🐛 fix(rogue): พายุมีด knives ignored มีดบิน bonuses
- `BattleScene` storm threw `ultKnifeMul × h2` only: `j2KnifeMul` (มีดคม `rg_k1`, ใบมีดลับคม `rg_t2_knife`) did nothing in the Ult
- Now `(ultKnifeMul + ultKnifeJ2Share × j2KnifeMul) × h2` · new `KIT2.rogue.ultKnifeJ2Share` 0.75 (admin kit2 table)
- Small buff: Q's playtest says the knives are the weak part of พายุมีด (the stabs were the OP part, fixed by Ratio AGI)

## ✨ feat(rogue): Back Stab ignores lucky dodge · ★ คริเป็นมีด works on Back Stab
- RO Back Stab never misses: the forced crit already skipped Flee, but D6+ LUK monsters could still 🍀 lucky-dodge it -> new `backStabbing` flag skips `luckyDodge` (Maiden `fixedFlee` unchanged)
- `rg_x4` ★ คริเป็นมีด counted only basic / combo crits -> Back Stab (always a crit) now owes +1 มีดบิน, thrown right after the stab
- Texts: Back Stab desc + rg_x4 desc

## 📝 docs(design): Thief & Rogue rework Rev 4
- `design/thief-rogue-rework-v1.md` gets a "Rev 4 Delta" on top: shipped P1 (3 commits), Q's decisions, rules that override Rev 3 (Ult budget vs ×AGI, no magic numbers in BattleScene, Mobster impact, `resetTree()` migration, reused ids, unverified balance numbers, damage-amp bracket table)
- Removed 15 expired `vertexaisearch` redirect links · fixed `rg_c1` Tempo Lv1 (+12%, not +20%)
- Open for Q: Mobster path (A/B) · แทงพิษ `pskill`

## 🧹 fix(mobster): ทวงหนี้ debt kill no longer re-spreads the burst stacks
- Order is `damageMon()` (can kill -> `killMon` -> `poisonSpread` reads the stacks) then `m.poison = 0` -> a debt kill re-spread the stacks it just burst
- Now a `debtBursting` flag skips only the spread (first try cleared the stacks before the hit, but that also dropped กัดกร่อน `poisonAmp` on the burst: reverted) · Q: the spread on a debt kill was hardly ever used, so this is cleanup (Mobster tree / KIT2 untouched)

## ⚖️ balance(thief): แทงพิษ scales with STR (pskill), base 1.6 -> 1.0
- Other STR skills (Swordsman S1, Back Stab, ตัดเส้นเอ็น, Ults) multiply `(1 + pskill)`; แทงพิษ (+ its Double Strike) did not
- Now `KIT.thiefAuto × pow × (1 + pskill)` · `thiefAuto` 1.6 -> 1.0 so Q's Lv 80 (STR 121, pskill +60.5%) hits the same (1.6 vs 1.605)
- Trade-off (Q's pick): low-STR Thieves hit softer with แทงพิษ (STR 20: 1.6 -> 1.1, −31%) · early game leans on เงาพริ้ว (Ratio AGI) instead · Mobster gets the same change (Q chose path A)
- Skill info row + JOBS.thief.auto desc updated

## 📝 docs(design): Rev 4 damage-amp brackets + KIT key list (P2 prep)
- `design/thief-rogue-rework-v1.md` R4.6: map of every live damage amp (`strike()` / `roll()` / `damageMon()` / `srcMul()`, file:line) + 6 bracket rules for the Rev 3 amps
  - B1 Taken (Exposed, stabMark, Privileged, `poisonAmp`): additive, cap +0.60 · B2 vs-status: unchanged (`OUTSIDE_CAP`) · B3 conditional crit dmg: into `critDmgAdd`, cap +0.75 · B4 skill-own (rg_s3, Ambush): `1 + Σ`, Back Stab cap +0.75 · B5 poison power (Perfect Agony + vsPoison on Contaminate): cap +1.00 · B6 echo (Death Mark pop): no amps at all
  - Lv 80 Back Stab: live ×2.64 · Rev 3 multiplied ×12.05 · with brackets ×6.21 · Contaminate ×10.92 -> ×6.08 · `vsPoison` is already at its 0.70 cap from gear, so `thief_a2` +0.24 adds nothing there
  - Code facts Rev 3 got wrong: `dot=true` still takes `poisonAmp` / `marked` / `lateDmg` / masteries · `thExecute` ×1.5 loses its only source · talent row + Skill 2 are pick-one
- R4.7: 148 keys to add before P2/P3 (Thief `KIT` 76 · `S2P` 2 + `S2N` 25 · `KIT2.rogue` 45) with Thai admin labels + registration checklist (`KIT_INTS`/`KIT_NUMS`, `KIT_EXPLAIN`, `S2N_TH`, `J2_LABEL`, `J2_COL` prefixes, `INTISH`, no `Cost`/`Cd` suffix)
- 1-per-turn ICDs = flags (no key) · value-only changes on existing paths: `job.thief.auto.cost` 40 -> 45, `th_smoke` cost 40 -> 35
- Docs only · no code / test / bot run

## 🔀 chore(thief): P1 rebased onto main (Thief rework #120–#125 + VFX)
- Ratio AGI replaces main's `KIT.thiefUltAgi` (0.02/pt) with `thiefUltAgiK` / `thiefUltAgiShareCap` · admin test `thief-poison` checks the new knobs
- พายุมีด v2 `knifeStorm()` gets `ultKnifeJ2Share × j2KnifeMul` · Back Stab keeps main's Combo Points + `backstabFx`, adds lucky-dodge pierce + ★ crit knife
- ทวงหนี้: main's `poison.burstKeep` kept; `debtBursting` stops ระเบิดพิษ re-spreading on a debt kill (main's chain blast made it matter more)
- แทงพิษ `(1 + pskill)` on main's `venomStabFx` line
