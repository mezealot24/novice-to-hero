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
