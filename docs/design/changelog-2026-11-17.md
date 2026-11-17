# Changelog 2026-11-17

## 🎓 feat(sage): Professor class-3 awakening (MVP)
- Sage → **Professor**: 🏷️ element marks + ⚗️ reactions (♨️ Vaporize · 💥 Overload · 🧲 Superconduct)
- Signature **Double Casting** (off-element perk 65% → 85% · Mana ≥ 70% echoes reactions) · Ult **Soul Burst** (burn all Mana + ignite every mark)
- Skill 3 variants on top of Endow: 👊 Spell Fist · 🌋 Elemental Field
- ใยชั้น 3 `pf_*` (12 nodes, no raw stats) · `JOB3_K.professor = 1.32` (not bot-calibrated yet)
- Sage / Professor element pick drops ✨ Arcane
- MVP only: no own uniques / class-craft / costume yet
- Doc: `docs/design/awakening-professor-v1.md` · tests: `tests/jobs3.test.ts`

## 🐛 fix(mage): กายสู่เวท regen was 3x its own text
- `strToInt` added "% of Max Mana per turn" into `resRegen`, which is per second and x3 per hero turn -> 3x too much (Q's Lv 99 Sage: 759 Mana/turn on 989 max, always full -> Double Casting / Soul Change always on, Hero Power blind to it)
- Now divided by `RES_RULES.manaPerTurnMul` so it matches the node text

## ⚖️ balance(mage): กายสู่เวท -> % of MISSING Mana per 20 STR (tunable)
- New `KIT.mageCore` (admin table `kit`): `regenStep` 20 · `regenMissing` 1 (0 = old % of Max) · `matkStep` 10 · `matkPer` 300
- Missing mode: `Stats.strManaMiss` = node share x steps, BattleScene adds it x (max - current Mana) each hero turn · stat row shows "+N% ที่หาย"
- Q's Lv 99 Sage (STR 61, Max 989): 297/turn flat -> 15% of missing (0 full · 45 at 70% · 148 empty)
