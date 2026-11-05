# v69 Priest ทักษะ 2: พรแสง (Blessing)
Replaces โล่แสง (shield) in the Priest ทักษะ 2 pick-1-of-3. Passive: always on during a fight, no Mana, never cast.
- T1 root (max 5): STR/DEX/INT/WIS +2 per level, Lv5 = +10 each.
- T2 "+" (max 3): พรร่างกาย, VIT +20 at Lv3 (7/13/20), cumulative on T1.
- T3 ★: พรปัญญา, M.ATK +30%, cumulative (needs T2 maxed, as before).
Numbers: `S2N.blessStat/blessVit/blessMatk` in src/data/skill-math.ts; applied in `heroStats` (meta.ts) before derived stats.
Old saves with cl_bless points keep the ids: root points now read as Blessing levels.
Bot (4 runs, full branch vs 1-pt ฟื้นฟู): D2 3/4 vs 1/4, D4 4/4 vs 0/4 -> strong at full investment; watch in playtest.
