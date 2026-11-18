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
