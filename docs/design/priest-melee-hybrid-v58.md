# Priest melee hybrid (v58, Q 2026-11-04)

Numbers live in `src/data/jobs.ts` (CLERIC_KIT) and `src/data/skill-math.ts` (KIT per-level values); the skill detail panel reads them.

## Stats
- STR -> P.ATK: basic attack (walk in, hop, mace/book smash 1.1x P.ATK) and the ult smash.
- INT -> M.ATK: holy light, light spear, Holy Light, and **every Priest heal**.
- WIS -> heal amp (+1%/pt, unchanged). VIT/Max HP -> shield size.

## Heals (Q 09:50): x M.ATK, then x (1 + heal amp)
- Skill 1 heal 0.7x M.ATK (was 12% max HP) · ฟื้นฟู 0.3x +0.05x/lv per turn (was 6% +1%/lv max HP) · ไฟชำระ 1.0x.
- Not changed: talents พรยืนยาว (ultRegen, shared with the hydra card) and หอกศักดิ์สิทธิ์ spear heal stay % max HP.

## Shields (Priest only)
- Built from max HP. Every Priest shield lasts 3 hero turns, then fades. Total shield is capped at 50% max HP.
- Done with shield layers in BattleScene (`syncShieldLayers` / `tickShieldLayers`). `this.shield` stays the single number every hit path reads; hits eat the oldest layer first.

## Ult พรคุ้มครอง (cd 4)
- 150% P.ATK smash on every monster (x pskill, x ultAmp) + Holy Light x3 on random monsters (0.8x M.ATK each) + shield 14% max HP.
- Dropped: ult heal 8% and the 2 free light spears.

## Ult column
- พรคุ้มครอง (pow node): ult smash +10% P.ATK/lv (Lv5 +50%), replaces the generic +12%/lv.
- พรอุ่นไอ (max 3 -> 5): counter +2.5%/lv, Holy Light +1/lv (Lv5: +12.5%, 8 lights).
- เกราะแสง: shield 2%/lv max HP after each light spear volley (Lv3 6%).
- หนามแสง: unchanged.
- ไฟชำระ ★: ult cleanses every hero debuff + heals 1.0x M.ATK. Old overheal->shield + atone removed.

## Gear
Priest weapons gained P.ATK: กระบองศักดิ์สิทธิ์ atk 8, คัมภีร์แสง atk 5, ค้อนตะวัน atk 14, คทาแสงอรุณ (craft) atk 16 + STR.

## Bot (6 runs each, tools/bot.cjs; D3 = D=2 profile)
| | D1 | D2 | D3 | D4 shop | D5 shop | D4 crafted | D5 crafted |
|---|---|---|---|---|---|---|---|
| before (WIS/INT) | 6 | 6 | 1 | 0 | 0 | 5 | 4 |
| after, WIS/INT | 6 | 6 | 4 | 0 | 0 | 5 | 6 |
| after, STR6/INT5/WIS4 (`ALLOC`) | 6 | 6 | 1 | 0 | 0 | 6 | 6 |
