# Hero Skill Engine v1: monsters cast hero skills

Q 2026-11-17: "ทำ engine, registry ให้มอนสเตอร์หรือบอสสามารถเลือกสกิลของฮีโร่ไปใช้ได้ · เพื่อเปิดทางให้สร้างเลเวลและความท้าทายใหม่ๆ"
Foundation for the clone dungeons D15–D18 (D18 boss = a mirror of the player's own hero).

## Pieces

| File | What |
|---|---|
| `src/data/hero-skill-book.ts` | **Registry.** 45 hero skills: 5 base classes × (ทักษะ 1, three ทักษะ 2, Ult) + 10 2nd jobs × (ทักษะ 3, Ult วิวัฒน์). Each entry = role + mana cost + cooldown + a list of ordinary `MonSkill` steps. Names / icons / hero cooldowns come from `jobs.ts`, `skill2.ts`, `jobs2.ts`. |
| `src/battle/hero-skill-engine.ts` | **Engine.** Pure, no Phaser. Mana pool, cooldowns, utility-AI choice. |
| `MonsterDef.heroKit` | A loadout (`HeroKit`) or `'mirror'`. |
| `BattleScene.useHeroSkill` | Builds the context, asks the engine, casts the steps through `castMonSkill` (the old monster-skill code, now one function). |

## Using it in a dungeon pack

```ts
clonemage2: {
  // ...normal MonsterDef fields...
  heroKit: { skills: ['mage.s1', 'mg_nova', 'wizard.s3', 'wizard.ult'], style: 'aggressive' },
},
protomirror: { /* D18 boss */ heroKit: 'mirror' }, // copies the player's s1 + picked s2 + 2nd-job s3 + current Ult
```

Optional `HeroKit` fields: `mana`, `startMana`, `regen`, `lv` (skill Lv), `ultAfter`, `jitter`, `cdMul`.
Defaults live in `HERO_KIT_RULES`. `heroSkillsOf('knight')` lists what a class can use.

## How a monster turn goes

1. Start of its turn: `tickKit` (mana +regen, cooldowns −1).
2. `useSkill`: hero kit first. `chooseHeroSkill` scores every ready, affordable skill:
   - **heal**: only if some monster < 75% HP (more hurt = higher)
   - **shield**: only without a shield and < 90% HP
   - **buff**: only if its warcry ran out
   - **debuff**: only if the hero lacks at least one of its effects
   - **damage**: always; bonus when the hero is < 30% HP
   - + slot bonus (Ult > s3 > s2 > s1), × style weight (`balanced / aggressive / support / guardian`), + small random jitter.
   - Ult is never cast before its turn `ultAfter` (default 3).
3. Nothing fits → its normal `skills` list → normal attack, exactly as before.

## Balance rules

- Damage `pow` = × the caster's own normal hit, copying the hero skill's ratio vs its basic attack. No stat padding: the challenge is in what the monster does (heals, shields, debuffs, nukes on a cooldown you can read).
- Mana costs per slot: s1 12 · s2 22 · s3 28 · Ult 45; regen 12/turn; start 40 of 100.
- Monster level bonus (`skillLvBonus`) still applies to every step.

## Not in v1

- Hero-only mechanics with no monster equivalent (dodge charges, crit buffs, gauge push on the hero, Mana Shield) are approximated with shield / warcry / freeze.
- No monster uses a kit yet: D14 (PR #117) stays on its data-only MonSkill kits; D15–D18 build on this.
