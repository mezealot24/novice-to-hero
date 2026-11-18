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
