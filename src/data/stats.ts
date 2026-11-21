// Hero stats. Perks add to these (see PERKS). All numbers are per-run, nothing persists yet.
export type Resource = 'mana' | 'rage' | 'energy'
export interface Stats {
  maxHp: number
  atk: number // P.ATK max
  minPct: number // P.ATK min as a share of max (DEX)
  matk: number // M.ATK: fire bolt, burn (INT)
  pskill: number // bonus % on physical skills, e.g. Smash (STR)
  def: number // flat damage taken off every hit, physical and magic (VIT)
  mdef: number // 0..1 magic damage reduction (WIS)
  tenacity: number // 0..1 shorter knockback (VIT)
  healAmp: number // 0..1 more healing from every source (WIS)
  shieldAmp: number // 0..1 stronger shields (WIS; shields come with jobs)
  hit: number // Hit points (DEX); vs Flee, see hitChance()
  flee: number // Flee points (AGI)
  luckyDodge: number // 0..1 dodge a hit completely (LUK)
  legendChance: number // 0..1 each level-up slot rolls a 🟠 legendary card (พร v2: needs a card of that line) (LUK)
  eventChance: number // 0..1 a room hides a treasure chest (LUK)
  dropChance: number // 0..1 a kill drops a rare item (LUK)
  maxRes: number // Mana / Rage / Energy cap
  resRegen: number // per second (Mana: INT; Energy: fixed; Rage: decays instead)
  aspd: number // attacks per second
  range: number // px from hero centre
  crit: number // 0..1
  critMul: number
  speed: number // walk speed
  guard: number // 0..1 share of damage blocked
  lifesteal: number // 0..1 of damage dealt
  regen: number // % of max HP per second
  fireEvery: number // 0 = off; every Nth hit also throws a fire bolt
  boltMul: number // fire bolt damage as a multiple of atk
  burnDps: number // ignite damage per second on bolt targets
  poison: number // poison stacks added per hit (0 = off)
  poisonDmg: number // damage per stack per second
  smashMul: number // the manual skill, as a multiple of atk
  smashCd: number // ms
  smashCost: number // resource per Smash
  revive: number // times the hero gets back up this run (Phoenix card)
  counter: number // 0..1 chance to hit back when a monster's attack lands (cards/gear major, VIT minor)
  combo: number // combo rate (AGI + gear): chance per extra hit, may pass 100% to beat monster Ignore Combo (COMBO.rateCap)
  comboCount: number // extra combo hits on top of COMBO.baseCount (rare: wolf relic, เชี่ยวชาญคอมโบ, 2nd jobs)
  comboDmg: number // combo hits: added inside the basic-damage bracket (1 + basicDmg + comboDmg - DR)
  // Hero defence vs monster combos / counters / crits (Q 2026-11-04 18:41): AGI / DEX / VIT / LUK minor, gear major
  ignoreCombo: number; ignoreCounter: number; comboDR: number; counterDR: number; critDR: number
  critShield: number // Q 2026-11-21 "แบบ RO": share taken off every monster crit chance (LUK x PER_POINT.luk.critShield, cap COMBO.critShieldCap; battle-rules monCritRate)
  dodgeHeal: number // share of max HP healed whenever a monster attack is dodged (Thief gear)
  waveShield: number // shield worth this share of max HP at the start of every wave (Swordsman / Cleric gear)
  wis: number // hero's total WIS (used for Tempest Bell scaling, etc.)
  // ----- skill tree hooks (data/tree.ts; 0 = off). Flags are 0/1. -----
  thorns: number // share of damage a shield absorbs that is reflected to the attacker
  rageGain: number // +share of Rage gained
  autoCostCut: number // auto skill costs this much less
  ctrAoe: number // flag: counters also hit every other monster at 0.5x
  berserk: number // flag: HP < 30% -> ATK +40%, lifesteal x2
  pierce: number // 0..1 of monster P.DEF the Archer ult ignores
  lockOn: number // flag: Archer basic hits on the same target stack +10% (max 5)
  dodgeStrike: number // flag: every dodge strikes back at 0.8x
  doubleAtk: number // Thief Double Strike level (0-5): chance of +1 hit (can crit), see doubleAtkChance()
  thExecute: number // retired (old Thief ★ เพชฌฆาต, no source since P2'a; P2'c removed its hardcoded x1.5): key kept for old data
  poisonLeech: number // Thief เลือดพิษ: heal this share of poison tick damage
  killHeal: number // Thief กระหายเลือด: kill heals this share of max HP
  bloodKing: number // Thief ★ ราชันย์โลหิต: HP < 40% -> lifesteal x2
  thUltAgi: number // Thief: เงาพริ้ว damage +this share (from AGI, meta.ts heroStats)
  thCondLeech: number // Thief thief_c1: lifesteal when the target has a status (x KIT.thiefCondLeechMulti at KIT.thiefKindsAt kinds)
  thKillLeech: number // Thief thief_c3: kill heals this share of max HP (separate from killHeal of gear / card / Mobster)
  thBloodKing: number // Thief thief_c4 ★ flag: low HP -> lifesteal x KIT.thiefBloodKingMul
  thDodgeCdCut: number // Thief th_t2a: dodge cuts Skill 2 or Ult cooldown by this many turns
  thDodgeCdIcd: number // Thief th_t2a: hero turns between two dodge cooldown cuts
  thStackCritTal: number // Thief th_t2b: crit / skillCrit per stack on the target (max KIT.thiefStackCritTalMax stacks)
  thWeaveDmg: number // Thief th_t2c: basic attack right after แทงพิษ +this (basic bracket)
  thWeaveRes: number // Thief th_t2c: Energy back on that basic attack
  thPrivileged: number // Thief th_t4a สถานะทับซ้อน: + damage taken by monsters with >= KIT.thiefPrivShare of the poison cap or >= KIT.thiefKindsAt debuff kinds (B1)
  thStackHp: number // Thief th_t1c กายต้านพิษ: temporary Max HP per poison + Wound stack on the field (max KIT.thiefStackHpMax stacks)
  thCondTenacity: number // Thief th_t1c: tenacity while any monster has poison / Wound
  // P2'c Ult x เกจเงา (thief_u + th_t3*): numbers in KIT, pure math in skill-math thiefUlt*
  thUltCrit: number // Thief thief_u1: Ult-only skillCrit
  thUltCondCritDmg: number // Thief thief_u1: Ult crit dmg per debuff kind on the target (B3, max KIT.thiefUltKindsMax kinds)
  thUltOnHit: number // Thief thief_u2: Ult On-Hit share (+ KIT.thiefOnHitBase)
  thUltOnHitTal: number // Thief th_t3b: On-Hit share from the talent
  thExecUlt: number // Thief thief_u3: crit dmg vs HP < KIT.thiefExecBelow (Ult in the Ult cap · basic / combo straight into B3)
  thUltCritRes: number // Thief thief_u3: Energy per Ult crit (max KIT.thiefUltCritResCap per cast)
  thUltFinisher: number // Thief thief_u4 ★ flag: KIT.thiefFinisherAt crits -> closing stab x KIT.thiefFinisherMul (sure crit)
  thUltExecCrit: number // Thief th_t3a: Ult-only skillCrit
  thUltExecDmg: number // Thief th_t3a: Ult crit dmg vs HP < KIT.thiefUltExecBelow or >= KIT.thiefKindsAt kinds (B3, Ult cap)
  thUltKillFinisher: number // Thief th_t3a: closing stab x this (rolls crit)
  thShadowFill: number // Thief thief_b1: chance a dodge fills the shadow gauge +1 more
  thShadowFlee: number // Thief thief_b1: Flee + while ร่างเงา
  thShadowShield: number // Thief thief_b2: shield = this x Flee on entering ร่างเงา (max KIT.thiefShadowShieldHpCap of max HP)
  thShadowDodgeCd: number // Thief thief_b3: chance a dodge inside ร่างเงา cuts the Ult CD 1 (Global Ult CD cap)
  thShadowTurns: number // Thief thief_b4 ★: + hero turns of ร่างเงา
  thWaveGauge: number // Thief th_t1a: shadow gauge + at every wave start
  thDodgeFlee: number // Thief th_t1a: Flee + for KIT.thiefDodgeFleeTurns hero turns after a dodge
  thWaveOpenCrit: number // Thief th_t1b flag: the first physical hit of each wave is a sure crit
  thWaveOpenCritDmg: number // Thief th_t1b R2: that hit's crit dmg + (B3)
  thUltGauge: number // Thief th_t3c: shadow gauge + per เงาพริ้ว cast
  thS1Matk: number // Thief thief_v1: bonus magic hit on แทงพิษ (x M.ATK; basic gets KIT.thiefVenomBasicShare of this)
  thDetonate: number // Thief thief_v2: Contaminate level (0 = off)
  thDetonateStar: number // Thief thief_v4 ★ flag: นักเล่นแร่พิษ (Contaminate crits, full leech, boss stack refund)
  thPoisonLeechLv: number // Thief thief_v3: เลือดพิษ level (scaled by INT in heroBuild)
  thPoisonLeech: number // Thief thief_v3 derived in heroBuild: total poison leech share (incl. gear poisonLeech, capped)
  thPerfectAgony: number // Thief th_t4b วิถีพิษคริ: converts critMul above KIT.thiefAgonyFrom into flat poison bonus (B5)
  thShadowWard: number // Thief WIS Shadow Ward derived in heroBuild: DR vs magic / monHit >= 999 / trueSight
  // ----- PoE Passive Tree Phase 1: Thief-Line Constellation (data/passives/thief.ts) -----
  thDeathMark: number // Death Mark Keystone: echo ratio (e.g. 0.35) of non-DoT hero net HP dmg dealt during mark turns as pure B6 burst
  thUltCdAdd: number // Death Mark Keystone downside: + Ult cooldown turns (wired into ultCooldown)
  tankDr: number // 🛡️ tank class bulk (data/tank-scale.ts): damage taken -this on every landed hit
  tankSkillDr: number // 🛡️ tank class bulk: monster skill damage taken -this more (multiplies with tankDr)
  thMistDr: number // Mistwalker Keystone: DR vs magic / monHit >= 999 / trueSight (e.g. 0.25)
  thDefShieldCut: number // Mistwalker Keystone downside: -30% P.DEF in heroBuild & -30% shields gained in BattleScene
  thFlurryDmgCut: number // Blade Flurry Keystone downside: -10% Ult per-hit multiplier (wired into thiefUltBudget & BattleScene)
  thMobFlurry: number // Blade Flurry Keystone Mobster bonus: +1 extra slash on ทวงหนี้ at KIT.thiefMobFlurryMul (0.5x)
  thEldritchVenom: number // Eldritch Venom Keystone flag: M.ATK -> poison synergy + Toxic Overheal to shield (cap KIT.thiefOverhealCap)
  thPhysLeechCut: number // Eldritch Venom Keystone downside: -50% normal physical lifesteal
  thS3ShieldPierce: number // Shieldbreaker Notable: Skill 3 ignores this share of monster Shield (1.0 = 100%)
  thLuckyKnife: number // Lucky Reprisal Notable: LUK LUCKY! dodge triggers Rogue 1 free knife / Mobster +KIT.thiefLuckyPoison poison
  lightMax: number // (retired) old lightning roll top
  overload: number // Mana refunded per lightning hit that rolls >= 1x
  lightLuck: number // flag: every lightning hit rolls twice, keeps the higher
  burnCap: number // + max fire stacks
  autoBurn: number // fire stacks the Mage auto skill applies (fire runs)
  fireSpread: number // flag: a dying monster's fire stacks jump to the others
  chillPlus: number // + chill turns
  brittle: number // +damage share against chilled monsters
  // พร v2 values that also come from gear lines / monster cards (Q 2026-11-04). In a run: perk + these, capped (perks.ts outsideCap).
  vsBurn: number; vsChill: number; vsPoison: number; chillWeak: number; spearShield: number; counterDmg: number; basicDmg: number; resTurn: number
  shatter: number // flag: freezing shatters (1.5x on it, 0.75x on the rest)
  reviveHp: number // revive HP share when higher than the default (tree)
  smiteTargets: number // + Cleric holy light targets
  holyCounter: number // flag: counters use M.ATK (magic)
  overhealShield: number // flag: healing past full HP becomes shield
  poisonCap: number // + max poison stacks
  poisonSpread: number // flag: a dying monster's poison jumps to the others
  fleeFloor: number // Thief: lowers the 80% minimum hit chance monsters have against the hero (cap 0.2)
  waveDodge: number // Thief talent: sure dodges at every wave start
  dodgeEnergy: number // Thief talent: Energy gained per dodge
  ultDodge: number // Thief talent: + sure dodges from the ult
  ultHits: number // Thief talent: + stabs in the ult
  ultPoison: number // Thief talent: poison stacks per ult stab
  poisonAmp: number // gear / cards / sets กัดกร่อน: + damage taken by monsters with >= KIT.thiefPoisonAmpShare of the poison cap (B1 Taken since P2'b)
  poisonSlow: number // Thief พิษชา (thief_a2 Lv): poisoned monsters get chilled (KIT.poison.slowAt)
  poisonOverflow: number // Mobster พิษล้น (mb_p4): stacks over the cap burst at once (KIT.poison.overflowMul)
  poisonHpPct: number // every hero poison: per stack, share of the monster's max HP per tick while it is above KIT.poison.hpAbove (hero-stats: hpPct + hpPctInt per 10 INT)
  thMark: number // Thief หมายหัว (thief_c2 Lv): Malice release crit dmg x KIT.thiefMark.dmg per Lv
  lightHits: number // Mage: + hits of the single-target lightning ult (base 6)
  lightChargeLv: number // Mage mage_l3 ประจุ: rank 1..3 (+3/4/5% spellCrit per stack up to 5, +20/40/60% spell crit dmg at 5 stacks then reset)
  lightChain: number // Mage: chance a lightning hit forks into 1 extra hit on a random enemy
  burnTick: number // Mage: + fire-stack tick per stack (x M.ATK, base 0.12)
  chillSlow: number // Mage: + speed cut while chilled (base 40%)
  iceBarrier: number // Mage: + ult barrier (x M.ATK) on ice runs
  boltHits: number // Mage card: Lightning Bolt hits per hero turn (random targets)
  boltCharge: number // flag: every 10 lightning hits -> next one 3x + gauge -15
  stormSet: number // flag: storm set, repeat lightning hits on one target +10% each per turn
  mgLightAmp: number // Mage talent: lightning ult +share
  mgFireAmp: number // Mage talent: fire ult +share
  mgIceAmp: number // Mage talent: ice ult +share
  mgFirstCard: number // Mage talent: 1 = first level-up offers Lightning Bolt, 2 = offers fireball
  mgFireStack: number // Mage talent: + fire ult stacks
  mgWaveBarrier: number // Mage talent: barrier (x M.ATK) at wave start
  resRegenCut: number // share of Mana regen lost
  mgUltAmp: number // Mage talent: all ult +share (can be negative)
  elemWheel: number // flag: Mage ult element rotates after every cast
  mgBarrierCut: number // Mage ult barrier -share
  barrierBoom: number // barrier breaking explodes for x M.ATK on all (>=1.6 also gauge -20)
  mgEmergency: number // 1 = first drop under 30% HP refills Mana, 2 = also barrier 2x M.ATK
  mgStatic: number // Mage passive ⚡ Static Mirage rank 0-5 (counter-shock when hit / on dodge) — KIT.mageDef
  mgMolten: number // Mage passive 🔥 Molten Mantle rank 0-5 (fire thorns + Burn, Flame Ward from burn ticks)
  mgGlacial: number // Mage passive ❄️ Glacial Aegis rank 0-5 (periodic ice barrier, Chill, Shatter Nova)
  mgHex: number // Mage core passive 🕯️ มนต์ถดถอย: share of damage a monster hit by ลูกไฟระเบิด loses on its own hits (0 = off)
  mgAura: number // Mage core passive 🔮 ออร่าเวท: ลูกไฟระเบิด / ult damage +this for the first MAGE_PASSIVE.aura.turns hero turns of every wave (0 = off)
  mgDoubleCast: number // Mage ult cast twice at this power each (0 = off)
  mgUltCd: number // + ult cooldown turns (negative = faster)
  mgUltMana: number // Mana gained per ult cast
  mgOverflow: number // auto skill x this when Mana >= 90% at turn start
  // ----- Swordsman talents (data/trees/swordsman.ts) -----
  cleaveAdd: number // + share of the basic swing's 2nd-monster cleave
  startRage: number // Rage at every wave start (Swordsman on Mana: Mana refilled at wave start)
  rageOnHurtAdd: number // + Rage when hit (Mana job: flat Mana when hit)
  spellVamp: number // Q 2026-11-04: heals this share of SKILL damage (Skill 1, Skill 2, ult); hits on several monsters heal 1/3. Cap 40%
  skillDmgCut: number // drawback paired with big spellVamp sources: skill/ult damage -x (0..0.9)
  ultMulAdd: number // + ult damage multiplier (can be negative)
  ultAmp: number // run pick บดกระดูก: job ult damage x(1 + ultAmp) (Novice uses smashMul instead)
  ultPierce: number // v78 run pick บดกระดูก: ult / Novice smash ignores this share of monster P.DEF / M.DEF
  poise: number // v78 run pick 🧘 Poise: immune to freeze / slam stun / silence, a Mage chant never breaks
  ultShieldAdd: number // + ult shield share of max HP (can be negative)
  ultVsCharge: number // + damage share of the ult on a charging boss
  ultCounters: number // after the ult, this many landed hits are counters for sure
  counterRage: number // Rage (or Mana) per counter
  counterShield: number // shield (share of max HP) per counter
  counterPct: number // run picks (ไหวพริบ / ท่าสวน): + this share OF the hero's counter rate, diminishing (stack-math counterRate)
  pickHpPct: number; pickAtkPct: number; pickMatkPct: number // run picks: +% max HP / P.ATK / M.ATK of the current value, applied when picked (BattleScene.applyMod)
  // ----- v84 Swordsman web: ⚔️ จังหวะดาบ / 🔨 ทลายเกราะ (data/trees/swordsman.ts, numbers KIT.swordTree) -----
  swFlow: number // ไหลลื่น: ฟันพายุ casts in a row stack momentum (max KIT.swordTree.flowMax), + ฟันพายุ damage per stack (0 = off)
  swFlowMana: number // ลมหายใจ: Mana back per momentum stack on each ฟันพายุ
  swFlowCrit: number // เฉือนคม: + crit chance per momentum stack during ฟันพายุ
  swFlowStar: number // ★ พันดาบ flag: at max stacks ฟันพายุ swings KIT.swordTree.stormHits times, sure crit, then stacks reset
  swBreak: number // ทุบเกราะ: the ult breaks armor on every monster (Mon.armorBrk) + damage taken from hero hits on broken monsters (0 = off)
  swBreakLeech: number // ซ้ำรอย: hero hits on a broken monster heal this share of the damage
  swBreakSpread: number // ร้าวลาม: a broken monster dies -> the break spreads to the others + this much Mana
  swShatter: number // ★ หักท่า flag: the ult interrupts every charging monster (charge lost + gauge push)
  arDodgeShield: number // Archer tree โล่ลม: shield (share of max HP) per dodge, capped at 3x
  arUltBreak: number // Archer: ult deals this much extra damage to a charging boss (was BREAK share)
  arWaveDodge: number // Archer talent ก้าวถอย: sure dodges at every wave start
  arSnipeLow: number // Archer talent เก็บตัวเปราะ: basic shot aims at the lowest-HP monster
  arLowHpBonus: number // Archer talent: + damage to monsters under 50% HP
  arVolley: number // Archer talent ศรสามดอก: auto fires 3 shots at this multiplier (0 = off)
  arAim: number // Archer talent ศรเล็ง: auto fires 2 shots at the front monster at this multiplier (0 = off)
  arAimCrit: number // Archer talent ศรเล็ง: + crit during the aimed auto
  arUltSplash: number // Archer talent ศรเจาะทะลุ: ult also hits every other monster at this multiplier
  arUltDodge: number // Archer talent ถอยยาว: extra sure dodges from the ult
  arUltMulCut: number // Archer talent ถอยยาว: ult multiplier lost
  arHawk: number // Archer talent เหยี่ยวคู่ใจ: every 3rd hero turn a hawk hits a random monster (magic, never misses)
  arStartFull: number // Archer talent สมาธิพราน: start every wave with full Energy
  arTurnRes: number // Archer talent สมาธิพราน r2: + Energy per hero turn
  arCritRes: number // Archer talent ลมหายใจนักล่า: Energy per crit
  arDodgeRes: number // Archer tree ยิงถอย: Energy per dodge
  arPoisonArrow: number // v82 Archer ศรอาบพิษ: chance each ยิงคู่ arrow adds poison
  arRicochet: number // v82 Archer ศรเด้ง: a ยิงคู่ kill fires one free shot at this multiplier (0 = off)
  arPoisonS2: number // v82 Archer ★ หมอกพิษ flag: ฝนธนู / กับดัก poison what they hit
  arMark: number // v82 Archer หมายหัว: ศรทะลวง marks its target, + damage taken from every hit (0 = off)
  arMarkJump: number // v82 Archer ไล่ล่า: Energy for killing the marked monster (the mark jumps on)
  arKillCd: number // v82 Archer ล่าต่อ: chance a kill takes 1 off the ult cooldown
  arExecute: number // v82 Archer ★ ศรประหาร flag: ศรทะลวง executes a normal monster under 25% HP (boss / mini: + damage)
  debuffRes: number // 0..1 chance to shrug off a monster debuff (poison, burn, curse, armor break, silence, freeze) · Dungeon 4-5 gear
  // ----- Cleric tree + talents (data/trees/cleric.ts) -----
  clUltAtk: number // v58 Ult web node พรคุ้มครอง: + share of the ult's P.ATK smash
  clUltLights: number // v58 พรอุ่นไอ: extra Holy Light on the ult
  clSpearShield: number // v58 เกราะแสง: shield (share of max HP) after each light spear volley
  // ----- v84 Priest web: 🙏 ศรัทธา / ⛪ ฟื้นคืน (data/trees/cleric.ts, numbers KIT.clericTree) -----
  clFaith: number // สวดภาวนา: Skill 1 / skill heals build Faith; full Faith = holy burst on every monster at this x Pm (0 = off)
  clFaithOver: number // ล้นศรัทธา: chance an overheal (>= KIT.clericTree.overMin max HP) gives +1 Faith
  clFaithHeal: number // พรเกื้อ: a Faith burst heals this share of max HP per stack spent
  clOverBurst: number // ★ แสงล้นฟ้า flag: overheal hits the front monster for x KIT.clericTree.overBurst
  clUltWard: number // ม่านพร: after the ult, damage taken −this for KIT.clericTree.wardTurns hero turns
  clEmergency: number // ฉุกเฉิน: first drop under 30% HP each wave heals this share of max HP
  clUltMend: number // ชุบชีวา: the ult heals this share of missing HP (skill heal)
  clRevive: number // ★ คืนชีพ flag: once per run a lethal hit leaves the Priest at KIT.clericTree.reviveHp + shield, debuffs cleared
  // ----- 2nd jobs (design/second-jobs-v1.md, data/jobs2.ts): ใยชั้น 2 nodes -----
  s3Pow: number // ทักษะ 3 +power node
  ult2Pow: number // Ult วิวัฒน์ +power node
  j2FrenzyMax: number // Berserker: extra Frenzy stacks
  j2BossCrit: number // Berserker ★ หน้าแหก: crit damage bonus vs boss / mini
  j2Duel: number // Berserker ดวล: damage bonus when 1 monster is left or vs a boss
  j2DuelExec: number // Berserker ★ ดวลตาย: bonus vs a boss under 30% HP
  j2LowHp: number // Berserker คลั่ง: damage x (1 + this x missing HP share)
  j2RageTurn: number // Berserker ★ ไม่รู้สึกเจ็บ flag (legacy)
  j2IgnorePain: number // Berserker ★ ไม่รู้สึกเจ็บ: immortal 3 turns at 1 HP on lethal, then regen 30%/turn x2 from damage dealt
  j2HpDmg: number // Knight: extra share of max HP added to spear skills
  j2PierceHits: number // Knight: extra Pierce hits
  j2Boomerang: number // Knight Spear Boomerang flag: interrupt one charge per wave
  j2Spiral: number // Knight ★ Spiral Pierce: ult ignores this share of monster DEF
  j2Guard: number // Knight Auto Guard: chance to block a physical hit
  j2DefAtk: number // Knight: P.ATK + DEF x this
  j2HpPct: number // max HP % (Knight node)
  j2CounterCrit: number // Knight ★ Counter Attack flag: counters always crit
  j2Charge: number // Knight Charge Attack: first swing of each wave +this
  j2ChargeFirst: number // Knight ★ ทะยาน flag: first swing x3 + the hero acts first
  j2Banner: number // v84 Knight ปักธง: wave-start shield (share of max HP, tops up, never stacks)
  j2Provoke: number // v84 Knight ข่มขวัญ: hits from a monster under KIT2.knight.tree.provokeAt HP deal −this
  j2BannerKill: number // v84 Knight ธงชัย: a kill gives this share of max HP as shield
  j2BannerAura: number // v84 Knight ★ ธงอมตะ flag: every Auto Guard block heals + Mana / Rage
  j2Sweep: number // v84 Knight ทวนวน: every KIT2.knight.tree.sweepEvery hero turns a free spear sweep on all at this x P.ATK (+ max HP share) (0 = off)
  j2SweepPush: number // v84 Knight เหวี่ยง: the sweep pushes every monster's gauge back this much
  j2SweepGauge: number // v84 Knight ทวนเร็ว: hero gauge + this per monster the sweep kills (capped at one turn)
  j2SweepStar: number // v84 Knight ★ พายุทวน flag: the sweep breaks armor + stun chance
  j2KnifeAdd: number // Rogue: extra flying knives per throw
  j2KnifeMul: number // Rogue: + flying knife damage (added to KIT2.rogue.knifeMul)
  j2KnifeCrit: number // Rogue ★ flag: every basic / combo / Back Stab crit throws one more knife (x KIT2.rogue.critKnifeMul)
  j2Disarm: number // Rogue rg_d1 ปลดอาวุธ lv: Back Stab on a target with >= divest.marks Marks -> weak + its next turn hits x(1 - divest.disarm)
  j2StripPlus: number // Rogue rg_d2 ถอดเกราะเปลือย: + Strip Armor P.DEF cut · > 0 also turns a full-Mark Back Stab into Exposed
  j2Snatch: number // Rogue rg_d3 ฉกบัฟ lv: Back Stab steals one monster buff (war cry / shield / reflect / vengeance), the hero keeps snatchShare of it
  j2BreakCast: number // Rogue rg_d4 ★ ตัดจังหวะ flag: Back Stab goes for a casting monster with >= divest.breakMarks Marks, spends them, cancels / pushes back the cast
  j3SkPrey: number // 🥷 Stalker sk_d1 เหยื่อเปลือย: + hit damage per strip kind on the target (stalkerPreyAmp)
  j3SkPlag: number // 🥷 sk_d2 ลอกท่า: ⛓️ break / ✋ snatch -> hero damage + this for KIT3.stalker.divest.plagTurns hero turns
  j3SkRes: number // 🥷 sk_d3 ถอดซ้ำ: Lv, eases the boss repeat-strip penalty (stalkerResMul)
  j3SkStrip: number // 🥷 sk_d4 ★ ปลดเปลือยหมดตัว flag: Phantom Storm strips every monster, 1/wave
  j2MarkCrit: number // P3'a Rogue rg_k1: + crit on a basic / combo hit that picks up Dagger Marks
  j2KnifeBounce: number // P3'a Rogue rg_k2 มีดชิ่ง: + bounce share (on KIT2.rogue.knifeBounce; > 0 = on)
  j2KnifeStatus: number // P3'a Rogue rg_k3 มีดอาบสถานะ: chance a landed knife adds Wound / extends Exposed / adds poison
  j2KnifeLoop: number // P3'a Rogue rg_k4 ★ flag: a pickup cuts Skill 2 / Skill 3 CD (1 per hero turn) · no Mark on the field = a free knife at turn start
  j2Tempo: number // P3'a Rogue rg_c1 Tempo: hero speed + this per stack (1 per combo hit, KIT2.rogue.comboTempoMax per wave)
  j2ComboDebuff: number // P3'a Rogue rg_c2: combo hit dmg + this per debuff kind on the target (KIT2.rogue.comboDebuffMax kinds)
  j2ComboDodge: number // P3'a Rogue rg_c3: FLEE + this after a combo hit (until the next hero turn) · every KIT2.rogue.comboDodgeEvery combo hits +1 dodge (ICD)
  j2LivingShadow: number // P3'a Rogue rg_c4 ★ flag: a chain of KIT2.rogue.comboShadowAt+ hits ends with a shadow Back Stab
  j2AmbushCrit: number // P3'a Rogue rg_x1: + crit / skillCrit vs a monster at high HP, low HP, or Exposed
  j2HeartRend: number // P3'a Rogue rg_x2: + crit dmg when a crit lands on a debuffed monster
  j2CritLeech: number // P3'a Rogue rg_x3: heal this share of a crit / pickup hit
  j2CritEnergy: number // P3'a Rogue rg_x3: Energy per crit / pickup hit (KIT2.rogue.critLeechResMax per hero turn)
  j2ExecAdd: number // Mobster: + Execute HP threshold
  j2DebtX2: number // Mobster ★ flag: every debuff counts as 2 debt
  j2ExecTurn: number // Mobster ★ flag: an Execute gives the hero an extra turn (once per hero turn)
  j2DebuffTurns: number // Mobster: + turns on ตัดเส้นเอ็น debuffs
  j2CrossAdd: number // Crusader: + Holy Cross / Grand Cross power
  j2PayCut: number // Crusader: Grand Cross pays this much less HP (share of the cost)
  j2BlindAdd: number // Crusader: + turns of Holy Cross blind
  j2GcTwice: number // Crusader ★ Grand Cross ซ้อน flag: fires twice, the 2nd one free
  j2GcLv: number // v109 Crusader Ult วิวัฒน์ node Lv (Grand Cross pulses KIT2.crusader.gcPulses[Lv])
  j2GcAngel: number // v119 Crusader 🪽 Guardian Angel: damage taken -this per Grand Cross pulse still left (capped KIT2.crusader.angelCap)
  j2GcShield: number // v119 Crusader: every Grand Cross pulse gives this share of max HP as shield
  j2GcGuard: number // v119 Crusader: + Auto Guard while Grand Cross pulses are left
  j2HcVit: number // v119 Crusader: max Holy Cross VIT stacks (each landed cast +KIT2.crusader.hcVit VIT)
  j2ShieldBoom: number // Crusader Shield Boomerang: Holy Cross also throws the shield for P.DEF x this (needs an off-hand)
  j2Reflect: number // Crusader Reflect Shield: landed physical hits bounce this share back (capped by BATTLE.reflectCap)
  j2BlockShield: number // Crusader ★ ป้อมศรัทธา: a block gives this share of max HP as shield
  j2BlockHeal: number // Crusader: a block heals this share of max HP
  j2GuardOver: number // v116 Crusader: Auto Guard above guardCap (not a stat to give: meta.ts sets it) -> block shield / heal x (1 + over x guardOverMul)
  j2Martyr: number // Crusader ★ ผู้พลีชีพ flag: first lethal hit per wave leaves 1 HP + shield
  j2ChargeMax: number // Monk: + max power charges
  // ----- 3rd job Paladin (design/awakening-crusader-v1.md, numbers KIT3.paladin) -----
  u3Pow: number // ใยชั้น 3 root: the extra Gospel Cross pulses hit harder
  j3On: number // 1 = Paladin is the active 3rd job (Prestige + Gospel Cross)
  j3Lk: number // 1 = Lord Knight is the active 3rd job (Aura Blade + Hundred Spear)
  j3Ch: number // 1 = Champion is the active 3rd job (Ki Translation + Supreme Asura)
  j3Rn: number // 1 = Ranger is the active 3rd job (Camouflage + Primal Stampede)
  j3Wl: number // 1 = Warlord is the active 3rd job (Undying Warlord + Undying Bloodlust)
  j3WlBlitz: number // Warlord Blitz Charges: + crit chance per Frenzy stack
  strManaMiss: number // 💪 Mage กายสู่เวท (missing mode): share of MISSING Mana regained each hero turn
  j3Pf: number // 1 = Professor is the active 3rd job (Double Casting: element marks + reactions · Soul Burst)
  j3PfLegFire: number // 🎓 ⚔️ ตำราเพลิง: max extra burn a 🔥 reaction leaves (1 per KIT3.professor.legFireStep sg_f points)
  j3PfLegLight: number // 🎓 ⚔️ ตำราอัสนี: max extra bounces a ⚡ reaction makes (1 per legLightStep sg_l points)
  j3PfLegIce: number // 🎓 ⚔️ ตำราเยือกแข็ง: max extra Permafrost stacks a ❄️ reaction adds (1 per legIceStep sg_i points)
  j3PfMarkTurns: number // 🎓 🏷️ ตราฝังลึก: + mark turns
  j3PfResidue: number // 🎓 🏷️ ตราฝังลึก: chance the mark stays after a reaction
  j3PfChain: number // 🎓 💥 ลูกโซ่ธาตุ: a reaction kill hands the mark to a neighbour
  j3PfCritMana: number // 🎓 🎯 จุดอ่อนธาตุ: reactions use procCritMul · a reaction crit gives this Mana
  j3PfTrinity: number // 🎓 🔺 สมการตรีธาตุ: all 3 reactions in one wave -> Convergence
  j3PfSoulChange: number // 🎓 💧 Soul Change Lv: Mana past max -> ward
  j3PfMemorize: number // 🎓 📜 Memorize Lv: boss wave starts with a free Endow (Lv 2: Endow costs no Mana that wave)
  j3PfDcAt: number // 🎓 🔁 Double Casting threshold cut (0.7 - this)
  j3PfDcMul: number // 🎓 🔁 Double Casting echo power +
  j3PfForesight: number // 🎓 🔮 Foresight: Soul Burst keeps Mana · high-Mana cast cuts the Ult CD
  j3Sk: number // 1 = Stalker is the active 3rd job (Preserve + Phantom Storm)
  j3Kp: number // 1 = Kingpin is the active 3rd job (Loan Shark + Hostile Takeover)
  j3Hw: number // 1 = High Wizard is the active 3rd job (Mystical Amplification + Gravitation Field)
  j3Mc: number // 1 = Mechanic is the active 3rd job (Overclock + Arm Cannon)
  j3Pierce: number // 🥷🌌🤖 the Awakening move ignores this share of DEF / M.DEF (knives · Gravitation · missiles)
  j3KpDebtAmp: number // 🎩 Loan Shark: + hit damage per debt
  j3HwDrain: number // 🌌 Soul Drain: Mana per monster a Gravitation wave hits
  j3HwAmp: number // 🌌 Amplify: + magic damage while it is up
  j3McOver: number // 🤖 Overclock: + hero speed while it is up
  j3LegCross: number // ⚜️ รากกางเขน: Holy Cross / Grand Cross + this per point in the Crusader กางเขน branch (meta.ts multiplies, capped)
  j3LegGuard: number // ⚜️ โล่บรรพชน: Auto Guard + this per point in the โล่ศักดิ์สิทธิ์ branch
  j3LegHp: number // ⚜️ กายบรรพชน: max HP % + this per point in the อุทิศ branch
  j3Heir: number // ★ สืบสาน flag: the variant's own branch >= heirNeed points -> A +1 bounce / B blind every monster
  j3VarMul: number // Holy Cross variant bonus from its branch points (meta.ts sets it)
  j3GospelHeal: number // แสงพระวรสาร: every Gospel pulse heals this share of max HP per monster hit
  j3AfterBless: number // พรหลังศึก: Grand Cross ends -> outgoing damage + this for KIT3.paladin.afterTurns hero turns
  j3GospelFaith: number // ศรัทธาเร่ง: + Faith per Gospel pulse
  j3GospelField: number // ★ สนามพระวรสาร: + this many free pulses
  j3Press: number // Shield Press: a block hits the attacker for P.DEF x this
  j3Banding: number // Banding: damage taken - this per monster alive (KIT3.paladin.bandingMax)
  j3EarthDrive: number // Earth Drive: first hero turn of a fight hits all for P.DEF x this + เกราะแตก
  j3Inspire: number // ★ Inspiration flag
  j2ThunderPer: number // Monk: + Falling Thunder power per charge
  j2Es: number // Monk Invoker Energy Shield: a hero turn without being hit gives this share of max HP as shield
  j2Chill: number // Monk Invoker: basic / combo hits chill chance
  j2Instill: number // Monk ★ Instill flag: full charges = every swing adds a lightning bolt
  j2Dark: number // Monk Chayula Darkness: shield of this share of max HP every hero turn
  j2NoLight: number // Monk ★ ไร้แสง flag: overheal becomes Darkness shield x KIT2.monk.noLightMul
  // ----- Monk rework: Combo / M.DEF-HP Haymaker / Asura Strike -----
  j2ComboRamp: number // Monk คอมโบ: + damage share per combo step (comboLevel >= 2 -> +this * (comboLevel - 1))
  j2ComboFinish: number // Monk ★ พายุหมัดปิดฉาก flag: spend 1 charge on >=2-hit chain for heavy finisher + armor break + CD cut
  j2ThunderAtk: number // Monk หมัดอัสนี (Falling Thunder root): + share of P.ATK added to Falling Thunder / Combo Thunder
  j2ComboThunder: number // Monk ฟ้าฟาดคอมโบ flag: >=3-hit chain + >=2 charges triggers free mini Falling Thunder
  j2BellMdef: number // Monk กังวานเหล็ก (Ult root): Tempest Bell & Asura M.DEF scaling bonus
  j2MdefDmg: number // Monk ปราณเหล็กใน: physical hits x (1 + mdef x this)
  j2HpPunch: number // Monk หมัดเลือดนักสู้: physical hits add this share of max HP
  j2GritRate: number // Monk สะสมแรงฮึด: store this share of incoming post-DEF damage into stored rage (pre-shield)
  j2HaymakerStar: number // Monk ★ หมัดพิพากษา flag: higher rage cap, lower threshold, full rage shield, AoE True Damage + gauge push + DR
  j2AsuraMdef: number // Monk เจาะเกราะปราณ: + M.DEF x max HP scaling bonus for Asura Strike
  j2AsuraPow: number // Monk ตั้งจิตอสุรา: + Asura Strike final damage multiplier
  j2Asura: number // Monk ★ อาชูร่าสไตรก์ flag: Ult becomes Asura Strike (min 3 charges, burns all charges + Mana -> huge burst + exhaust)
  // ----- Phase 5 Mage: Wizard / Sage -----
  j2MeteorMul: number // Wizard: + Meteor Storm damage per meteor
  j2Meteors: number // Wizard ★: + meteors
  j2LovMul: number // Wizard: + Lord of Vermilion damage per hit
  j2LovStun: number // Wizard: + LoV stun chance per hit
  j2LovHits: number // Wizard ★: + LoV hits
  j2GustMul: number // Wizard: + Storm Gust damage per hit
  j2QuickCast: number // Wizard ★ Quagmire flag: no charge turn at high Mana
  j2AutoChance: number // Sage: + Auto Spell chance
  j2AutoBolts: number // Sage: + bolts per Auto Spell
  j2AutoMul: number // Sage: + Auto Spell bolt damage multiplier
  j2Hindsight: number // Sage ★ Hindsight flag: Auto Spell & On-Hit Perks also on combo hits and counters
  j2EndowTurns: number // Sage: + Endow turns
  j2EndowAmp: number // Sage: + Endow damage
  j2EndowWave: number // Sage ★ flag: Endow lasts the whole wave
  j2MagicRod: number // Sage Magic Rod: Mana per magic hit taken
  j2RodBlock: number // Sage ★ Magic Rod flag: the first magic hit of each wave is absorbed
  j2UltMana: number // Sage Spell Breaker: + extra Mana stolen
  j2UltBreak: number // Sage Spell Breaker: armor break turns
  j2FirePerk: number // Sage 🔥 Fire Bolt on-hit perk rank (scales chance & bolts/hit)
  j2FireDmg: number // Sage 🔥 Fire Bolt damage bonus
  j2FireCrit: number // Sage 🔥 bonus spellCrit vs burning targets
  j2FireStar: number // Sage ★ Inferno Overdrive flag (AoE fire nova after 3+ bolts in a turn)
  j2LightPerk: number // Sage ⚡ Chain Lightning on-hit perk rank (scales chance & jumps)
  j2LightDmg: number // Sage ⚡ Chain Lightning damage bonus
  j2LightStun: number // Sage ⚡ Chain Lightning stun chance per bounce
  j2LightStar: number // Sage ★ Overload Tempest flag (crit restores Mana & echoes 100% back)
  j2IcePerk: number // Sage ❄️ Permafrost on-hit perk rank (Sejuani E style stacks 1..4)
  j2IceDmg: number // Sage ❄️ Permafrost shatter damage bonus
  j2IceCrit: number // Sage ❄️ bonus spellCrit/skillCrit vs chilled or frozen targets
  j2IceStar: number // Sage ★ Absolute Permafrost flag (AoE shatter, sure crit, boss gauge push)
  // ----- Phase 4 Archer: Beastmaster / Innovator -----
  j2HawkChance: number // Beastmaster ฟ้า: + hawk Blitz Beat chance per hero swing
  j2HawkMul: number // Beastmaster: + hawk damage
  j2HawkHits: number // Beastmaster: + hawk targets per Blitz Beat
  j2HawkEvo: number // Beastmaster ★ เหยี่ยวทอง flag
  j2MarkPierceFlee: number // Beastmaster bm_h1 / Hawk Stance: ignore share of enemy Flee on Prey Mark targets
  j2HawkIntAdd: number // Beastmaster bm_h2 Steel Crow: + this * INT to Falcon Power
  j2HawkDexToMatk: number // Beastmaster Hawk Stance: + floor(this * DEX) to Falcon Power
  j2PreyMarkAdd: number // Beastmaster bm_h2 / Hawk Stance: + extra damage taken on Prey Mark
  j2PreyTurns: number // Beastmaster bm_h2: + extra turns on Prey Mark duration
  j2BoarHp: number // Beastmaster ป่า: + boar HP (share of hero max HP)
  j2BoarMul: number // Beastmaster: + boar charge damage
  j2BoarShield: number // Beastmaster: boar charge also shields the hero (share of max HP)
  j2BoarEvo: number // Beastmaster ★ หมูป่าเกราะ flag
  j2BoarShare: number // Beastmaster bm_b1 / Boar Stance: + extra damage share absorbed by boar
  j2BoarCut: number // Beastmaster bm_b1: + extra damage cut on boar's absorbed damage
  j2BoarRageK: number // Beastmaster bm_b2: + extra boar Grit/Rage gain factor
  j2BoarGuardDr: number // Beastmaster bm_b3: physical DR while boar HP > 50%
  j2BoarDownCut: number // Beastmaster bm_b4: reduces boar down turns + revive shield flag
  j2WolfMul: number // Beastmaster เขี้ยว: + wolf bite damage
  j2WolfBleed: number // Beastmaster: + bleed stacks per bite
  j2WolfSpeed: number // Beastmaster: + wolf speed (share of hero speed)
  j2Gust: number // Beastmaster 🪶 Razor Gust flag (bm_h3)
  j2WolfEvo: number // Beastmaster ★ ราชาหมาป่า flag (+ rework v1 🦷 Savage Crunch)
  j2WolfPierceBleed: number // Beastmaster bm_w1: wolf bite ignores share of enemy P.DEF on Bleed targets
  j2BleedDmg: number // Beastmaster bm_w2 / Wolf Stance: + Bleed DoT damage amplification
  j2Frenzy: number // Beastmaster 🩸 Bloodscent Frenzy: hero speed + per poison stack on the front monster (KIT2.beastmaster.frenzyCap)
  j2PetPow: number // v82 Beastmaster ใจเดียวกัน: + every pet's power
  j2PetStatScale: number // Beastmaster bm_k1: + pet ATK bonus from hero's highest STR/DEX/AGI
  j2PetRes: number // v82 Beastmaster ประสานล่า: hero Energy per pet act
  j2WolfRallyStep: number // Beastmaster bm_k2: hero basic attack advances wolf turn gauge
  j2CmdCut: number // v82 Beastmaster คำสั่งไว: สั่งลุย costs this much less
  j2CmdHawkAdd: number // Beastmaster bm_k3: + extra Hawk Blitz Beat count during สั่งลุย
  j2Pack3: number // Beastmaster ★ ฝูงพันธมิตร flag: rework v1 = every pet +KIT2.beastmaster.tree.pack3Pow (Phase 4: Tri-Beast Harmony chain)
  j2PackLead: number // v82 Beastmaster ผู้นำฝูง: + hero damage per live pet
  j2PetHeal: number // v82 Beastmaster เลียแผล: heal (share of max HP) per pet act
  j2PetHealLow: number // Beastmaster bm_s2: flag > 0 doubles j2PetHeal when hero HP < 35%
  j2Roar: number // v82 Beastmaster ขู่คำราม: wave start, every monster's gauge -this
  j2RoarWeaken: number // Beastmaster bm_s3: wave start weakens enemies' P.ATK for 2 turns
  j2CritPet: number // v82 Beastmaster ★ พรานแห่งป่า flag: a hero crit sends the partner pet in again (once per hero turn)
  j2UltAwakenAdd: number // Beastmaster bm_t2_ult: + extra hero turns on Primeval Awakening
  j2HawkBonusHits: number // Beastmaster bm_t4_hawk Blitz Storm: + min & max Blitz Beat hits
  j2HawkCritShare: number // Beastmaster bm_t4_hawk Blitz Storm: Falcon Crit rate share of hero crit on Prey Mark
  j2HawkCapAdd: number // Beastmaster Hawk Stance: + extra Blitz Beat chance cap
  j2StanceMarkCritDmg: number // Beastmaster Hawk Stance: + crit damage vs Prey Mark targets
  j2StanceGritShield: number // Beastmaster Boar Stance: emergency shield share of Max HP on Rage 100
  j2StanceWoundLeech: number // Beastmaster Wolf Stance: hero lifesteal vs targets with Bleed >= 3
  j2FrenzyCapAdd: number // Beastmaster Wolf Stance: + extra Bloodscent Frenzy stack cap
  j2HawkTrue: number // Beastmaster 🦅 IV talent (legacy): Blitz Beat deals True Damage (ignores DEF)
  j2WolfBleedPct: number // Beastmaster 🐺 IV talent: Bleed ticks deal +% target Max HP (capped vs boss)
  j2BoarStunAll: number // Beastmaster 🐗 IV talent: Boar charge stuns the entire enemy row
  j2Traps: number // Innovator กับดัก: + traps at wave start
  j2TrapMul: number // Innovator: + trap damage
  j2Claymore: number // Innovator ★ Claymore flag: Land Mine hits every monster
  j2BoxLuck: number // Innovator ประดิษฐ์: x rare gadget weight
  j2BoxMul: number // Innovator: + gadget damage
  j2Reroll: number // Innovator ★ flag: a common gadget rerolls once
  j2TurretMul: number // Innovator ป้อมปืน: + robot turret damage
  j2TurretTurns: number // Innovator: + robot turret turns
  j2TurretWave: number // Innovator ★ flag: the robot turret stays the whole wave
  clPurify: number // v58 ไฟชำระ flag: the ult cleanses every debuff and heals CLERIC_KIT.purifyHeal x M.ATK
  healAt: number // auto skill heals below (0.75 - this) of max HP
  atone: number // share of every skill heal (incl. overheal) dealt as holy damage to the front monster
  judge: number // flag: every 3rd holy light hits all 2.2x + mark (+15% damage taken, 2 turns)
  smiteMul: number // + holy light damage share
  smiteVamp: number // holy light heals this share of its damage
  healShield: number // skill heals also give a shield of this share of the heal
  spearStart: number // light spears at every fight start
  spearRate: number // light spears per hero turn (0.5 = every 2nd turn)
  spearMul: number // + light spear damage (x M.ATK, base 0.3)
  spearHeal: number // share of max HP healed per spear fired
  ultRegen: number // after the ult: heal this share of max HP each hero turn for 3 turns
  ultHoly: number // the ult also hits every monster for this x M.ATK
  ultChargeShield: number // + ult shield share when a boss is charging
  clDawn: number // v92 🌄 แสงรุ่งอรุณ: share of (STR + WIS + dawn.matk x M.ATK) added as magic damage to each Ult smash target
  clDawnCrit: number // + crit dmg on that bonus (★ อรุณพิทักษ์)
  clDawnHeal: number // heal share of the bonus dealt to the front monster (อรุณสมานแผล)
  clDawnWis: number // v102 ☀️ แสงแตก: + share of WIS for clDawnWisTurns hero turns after the Dawn Light bonus hits
  clDawnWisTurns: number // v102 ☀️ แสงแตก: hero turns the WIS buff lasts (refreshed by every Dawn Light bonus)
  clDawnUlt: number // ★ อรุณพิทักษ์ flag: the bonus is a sure crit
  clInt: number // 🌟 แสงคม: + INT (base stat, meta totalBase)
  clCoreBase: number // v86 💠 จิตสงบ: + STR and WIS (base stats, meta totalBase)
  clMindRegen: number // v86 💠 จิตสงบ: + resRegen per 10 points of the lower of STR / WIS (meta heroStats)
  clIntToStr: number // v86 💠 ศรัทธาสู่กาย: every this many INT = +1 STR (0 = off; meta totalBase)
  clWisToVit: number // v102 💠 ศรัทธาสู่กาย: every this many WIS = +1 VIT (0 = off; meta totalBase)
  clUltMana: number // v102: + Mana the base Cleric ult costs (Ult node Lv: 30/35/40/45/50)
  clManaGuard: number // v86 💠 มานาพิทักษ์: share of damage taken (before shields) gained as Mana
  clManaHeal: number // v86 💠 มานาพิทักษ์: share of Mana spent healed as HP
  clManaShield: number // v86 💠 มานาพิทักษ์: wave-start shield, share of Max Mana
  bossShield: number // shield (share of max HP) at the start of a boss fight
  lateDmg: number // + damage share from fight turn 12 on (anti turn-limit)
  strToInt: number // Mage node กายสู่เวท: share of STR (above base) that also counts as INT
  spearLuck: number // Cleric: chance per hero turn to call 1 light spear (from LUK, v37)
  s1Pow: number // skill web: ทักษะ 1 (auto) power share (replaces class skill levels)
  // ⚔️ Swordsman ดาบสยบมนตร์ (Q 2026-11-21): swS1Lv = ทักษะ 1 "+" node Lv · web 🛡️ (left, swordsman_b) swS1Shield shield share of max HP on cast,
  // swCcGuard CC-immune hero turns after the cleanse (+ tenacity on the node), swMuteWeak silenced monsters hit weaker, swS1Ctr ★ sure counters
  // · web ⚔️ (right, swordsman_c) swVsMute + dmg vs a casting / silenced target, swS1Refund Mana back on a cut cast (+ CD -1), swS1Splash share on the others, swS1Star ★ 2nd cut + silence +1
  swS1Lv: number; swS1Shield: number; swCcGuard: number; swMuteWeak: number; swS1Ctr: number; swVsMute: number; swS1Refund: number; swS1Splash: number; swS1Star: number
  ultPow: number // skill web: Ult power share
  s2Lv: number // skill web: picked Skill 2's "+" node, 0..3 (v83: node Lv 1..5 x 3/5, so it can be fractional; Lv 5 = 3)
  s2Star: number // skill web: 1 = the picked Skill 2's ★ node
  spellCrit: number // 0..1 crit chance for magic basics + on-hit procs / Auto Spell (Sage rework v1: no longer fed by `crit`), uses critMul
  skillCrit: number // 0..1 crit chance for active skills / Ult (Sage rework v1: split from basic crit, see CRIT_RULES)
  procCritMul: number // extra crit damage on on-hit procs / Auto Spell only (Sage), added to critMul
  physPen: number // 0..0.75 physical armor penetration fraction
  magPen: number // 0..0.75 magic defense penetration fraction
  elemDmg: number // bonus elemental damage multiplier (e.g. 0.15 = +15%)
  // ----- Swordsman Core Defend Passives (swordsman_core) -----
  swCoreVit: number // flat VIT added in totalBase() before derived stats
  swCoreHpPct: number // Max HP % bonus added in heroBuild()
  swVitToMdef: number // ratio converting total VIT -> raw M.DEF (capped by KIT.swordCore.vitToMdefCap)
  swLowRegenAmp: number // bonus multiplier to HP Regen ticks when HP < 50%
}

/** Lifesteal cap (heroBuild clamps st.lifesteal; P2'a thief_c1 per-hit leech stays under it too). */
export const LIFESTEAL_CAP = 0.4

export const STAT_CAPS = {
  physPen: 0.75,
  magPen: 0.75,
  elemDmg: 2.0,
} as const

export const PLAYER: Stats = {
  maxHp: 140, atk: 13, minPct: 0.5, matk: 10, pskill: 0, def: 0, mdef: 0, tenacity: 0, healAmp: 0, shieldAmp: 0, wis: 0,
  hit: 10, flee: 5, luckyDodge: 0, legendChance: 0.06, eventChance: 0.1, dropChance: 0.04, maxRes: 60, resRegen: 3,
  aspd: 1.6, range: 110, crit: 0, critMul: 1.4, /* Q: crit only from items, skill tree, talents (+ in-run cards) */ speed: 190,
  guard: 0, lifesteal: 0, regen: 0, fireEvery: 0, boltMul: 2, burnDps: 0, poison: 0, poisonDmg: 2,
  smashMul: 3, smashCd: 6000, smashCost: 0, revive: 0, counter: 0, combo: 0, dodgeHeal: 0, waveShield: 0,
  thorns: 0, rageGain: 0, autoCostCut: 0, ctrAoe: 0, berserk: 0, pierce: 0, lockOn: 0, dodgeStrike: 0, doubleAtk: 0, thExecute: 0, poisonLeech: 0, killHeal: 0, bloodKing: 0, thUltAgi: 0, thCondLeech: 0, thKillLeech: 0, thBloodKing: 0, thDodgeCdCut: 0, thDodgeCdIcd: 0, thStackCritTal: 0, thWeaveDmg: 0, thWeaveRes: 0, thPrivileged: 0, thStackHp: 0, thCondTenacity: 0, thUltCrit: 0, thUltCondCritDmg: 0, thUltOnHit: 0, thUltOnHitTal: 0, thExecUlt: 0, thUltCritRes: 0, thUltFinisher: 0, thUltExecCrit: 0, thUltExecDmg: 0, thUltKillFinisher: 0, thShadowFill: 0, thShadowFlee: 0, thShadowShield: 0, thShadowDodgeCd: 0, thShadowTurns: 0, thWaveGauge: 0, thDodgeFlee: 0, thWaveOpenCrit: 0, thWaveOpenCritDmg: 0, thUltGauge: 0, thS1Matk: 0, thDetonate: 0, thDetonateStar: 0, thPoisonLeechLv: 0, thPoisonLeech: 0, thPerfectAgony: 0, thShadowWard: 0, lightMax: 0, overload: 0, lightLuck: 0, burnCap: 0, autoBurn: 0, fireSpread: 0, chillPlus: 0, brittle: 0, comboCount: 0, comboDmg: 0, ignoreCombo: 0, ignoreCounter: 0, comboDR: 0, counterDR: 0, critDR: 0, critShield: 0, vsBurn: 0, vsChill: 0, vsPoison: 0, chillWeak: 0, spearShield: 0, counterDmg: 0, basicDmg: 0, resTurn: 0, shatter: 0, reviveHp: 0, smiteTargets: 0, holyCounter: 0, overhealShield: 0, poisonCap: 0, poisonSpread: 0, fleeFloor: 0, waveDodge: 0, dodgeEnergy: 0, ultDodge: 0, ultHits: 0, ultPoison: 0, poisonAmp: 0, poisonSlow: 0, poisonOverflow: 0, poisonHpPct: 0, thMark: 0, lightHits: 0, lightChain: 0, lightChargeLv: 0, burnTick: 0, chillSlow: 0, iceBarrier: 0, boltHits: 0, boltCharge: 0, stormSet: 0, mgLightAmp: 0, mgFireAmp: 0, mgIceAmp: 0, mgFirstCard: 0, mgFireStack: 0, mgWaveBarrier: 0, resRegenCut: 0, mgUltAmp: 0, elemWheel: 0, mgBarrierCut: 0, barrierBoom: 0, mgEmergency: 0, mgStatic: 0, mgMolten: 0, mgGlacial: 0, mgHex: 0, mgAura: 0, mgDoubleCast: 0, mgUltCd: 0, mgUltMana: 0, mgOverflow: 0, cleaveAdd: 0, startRage: 0, rageOnHurtAdd: 0, spellVamp: 0, skillDmgCut: 0, ultMulAdd: 0, ultAmp: 0, ultPierce: 0, poise: 0, ultShieldAdd: 0, ultVsCharge: 0, ultCounters: 0, counterRage: 0, counterShield: 0, counterPct: 0, pickHpPct: 0, pickAtkPct: 0, pickMatkPct: 0, arDodgeShield: 0, arUltBreak: 0, arWaveDodge: 0, arSnipeLow: 0, arLowHpBonus: 0, arVolley: 0, arAim: 0, arAimCrit: 0, arUltSplash: 0, arUltDodge: 0, arUltMulCut: 0, arHawk: 0, arStartFull: 0, arTurnRes: 0, arCritRes: 0, arDodgeRes: 0, arPoisonArrow: 0, arRicochet: 0, arPoisonS2: 0, arMark: 0, arMarkJump: 0, arKillCd: 0, arExecute: 0, debuffRes: 0, healAt: 0, atone: 0, judge: 0, smiteMul: 0, smiteVamp: 0, healShield: 0, spearStart: 0, spearRate: 0, spearMul: 0, spearHeal: 0, ultRegen: 0, ultHoly: 0, ultChargeShield: 0, clDawn: 0, clDawnCrit: 0, clDawnHeal: 0, clDawnWis: 0, clDawnWisTurns: 0, clDawnUlt: 0, clInt: 0, clCoreBase: 0, clMindRegen: 0, clIntToStr: 0, clWisToVit: 0, clUltMana: 0, clManaGuard: 0, clManaHeal: 0, clManaShield: 0, bossShield: 0, lateDmg: 0, spellCrit: 0, skillCrit: 0, procCritMul: 0, spearLuck: 0, strToInt: 0, s1Pow: 0, swS1Lv: 0, swS1Shield: 0, swCcGuard: 0, swMuteWeak: 0, swS1Ctr: 0, swVsMute: 0, swS1Refund: 0, swS1Splash: 0, swS1Star: 0, ultPow: 0, s2Lv: 0, s2Star: 0, clUltAtk: 0, clUltLights: 0, clSpearShield: 0, clPurify: 0, s3Pow: 0, ult2Pow: 0, j2FrenzyMax: 0, j2BossCrit: 0, j2Duel: 0, j2DuelExec: 0, j2LowHp: 0, j2RageTurn: 0, j2IgnorePain: 0, j2HpDmg: 0, j2PierceHits: 0, j2Boomerang: 0, j2Spiral: 0, j2Guard: 0, j2DefAtk: 0, j2HpPct: 0, j2CounterCrit: 0, j2Charge: 0, j2ChargeFirst: 0, j2KnifeAdd: 0, j2KnifeMul: 0, j2KnifeCrit: 0, j2Disarm: 0, j2StripPlus: 0, j2Snatch: 0, j2BreakCast: 0, j3SkPrey: 0, j3SkPlag: 0, j3SkRes: 0, j3SkStrip: 0, j2MarkCrit: 0, j2KnifeBounce: 0, j2KnifeStatus: 0, j2KnifeLoop: 0, j2Tempo: 0, j2ComboDebuff: 0, j2ComboDodge: 0, j2LivingShadow: 0, j2AmbushCrit: 0, j2HeartRend: 0, j2CritLeech: 0, j2CritEnergy: 0, j2ExecAdd: 0, j2DebtX2: 0, j2ExecTurn: 0, j2DebuffTurns: 0, j2CrossAdd: 0, j2PayCut: 0, j2BlindAdd: 0, j2GcTwice: 0, j2GcLv: 0, j2GcAngel: 0, j2GcShield: 0, j2GcGuard: 0, j2HcVit: 0, j2ShieldBoom: 0, j2Reflect: 0, j2BlockShield: 0, j2BlockHeal: 0, j2GuardOver: 0, j2Martyr: 0, j2ChargeMax: 0, j2ThunderPer: 0, j2Es: 0, j2Chill: 0, j2Instill: 0, j2Dark: 0, j2NoLight: 0, u3Pow: 0, j3On: 0, j3Lk: 0, j3Ch: 0, j3Rn: 0, j3LegCross: 0, j3LegGuard: 0, j3LegHp: 0, j3Heir: 0, j3VarMul: 0, j3GospelHeal: 0, j3AfterBless: 0, j3GospelFaith: 0, j3GospelField: 0, j3Press: 0, j3Banding: 0, j3EarthDrive: 0, j3Inspire: 0, // Novice: cooldown only (resources come with job change)
  j2MeteorMul: 0, j2Meteors: 0, j2LovMul: 0, j2LovStun: 0, j2LovHits: 0, j2GustMul: 0, j2QuickCast: 0, j2AutoChance: 0, j2AutoBolts: 0, j2AutoMul: 0, j2Hindsight: 0, j2EndowTurns: 0, j2EndowAmp: 0, j2EndowWave: 0, j2MagicRod: 0, j2RodBlock: 0, j2UltMana: 0, j2UltBreak: 0, j2FirePerk: 0, j2FireDmg: 0, j2FireCrit: 0, j2FireStar: 0, j2LightPerk: 0, j2LightDmg: 0, j2LightStun: 0, j2LightStar: 0, j2IcePerk: 0, j2IceDmg: 0, j2IceCrit: 0, j2IceStar: 0, // Phase 5 Wizard / Sage
  j2HawkChance: 0, j2HawkMul: 0, j2HawkHits: 0, j2HawkEvo: 0, j2MarkPierceFlee: 0, j2HawkIntAdd: 0, j2HawkDexToMatk: 0, j2PreyMarkAdd: 0, j2PreyTurns: 0, j2BoarHp: 0, j2BoarMul: 0, j2BoarShield: 0, j2BoarEvo: 0, j2BoarShare: 0, j2BoarCut: 0, j2BoarRageK: 0, j2BoarGuardDr: 0, j2BoarDownCut: 0, j2WolfMul: 0, j2WolfBleed: 0, j2WolfSpeed: 0, j2WolfEvo: 0, j2WolfPierceBleed: 0, j2BleedDmg: 0, j2Gust: 0, j2Frenzy: 0, j2PetPow: 0, j2PetStatScale: 0, j2PetRes: 0, j2WolfRallyStep: 0, j2CmdCut: 0, j2CmdHawkAdd: 0, j2Pack3: 0, j2PackLead: 0, j2PetHeal: 0, j2PetHealLow: 0, j2Roar: 0, j2RoarWeaken: 0, j2CritPet: 0, j2UltAwakenAdd: 0, j2HawkBonusHits: 0, j2HawkCritShare: 0, j2HawkCapAdd: 0, j2StanceMarkCritDmg: 0, j2StanceGritShield: 0, j2StanceWoundLeech: 0, j2FrenzyCapAdd: 0, j2HawkTrue: 0, j2WolfBleedPct: 0, j2BoarStunAll: 0, j2Traps: 0, j2TrapMul: 0, j2Claymore: 0, j2BoxLuck: 0, j2BoxMul: 0, j2Reroll: 0, j2TurretMul: 0, j2TurretTurns: 0, j2TurretWave: 0, // Phase 4 Beastmaster / Innovator
  swFlow: 0, swFlowMana: 0, swFlowCrit: 0, swFlowStar: 0, swBreak: 0, swBreakLeech: 0, swBreakSpread: 0, swShatter: 0, swCoreVit: 0, swCoreHpPct: 0, swVitToMdef: 0, swLowRegenAmp: 0, // v84 Swordsman web + Core Defend passives
  clFaith: 0, clFaithOver: 0, clFaithHeal: 0, clOverBurst: 0, clUltWard: 0, clEmergency: 0, clUltMend: 0, clRevive: 0, // v84 Priest web
  j2Banner: 0, j2Provoke: 0, j2BannerKill: 0, j2BannerAura: 0, j2Sweep: 0, j2SweepPush: 0, j2SweepGauge: 0, j2SweepStar: 0, // v84 Knight ใยชั้น 2
  j2ComboRamp: 0, j2ComboFinish: 0, j2ThunderAtk: 0, j2ComboThunder: 0, j2BellMdef: 0, j2MdefDmg: 0, j2HpPunch: 0, j2GritRate: 0, j2HaymakerStar: 0, j2AsuraMdef: 0, j2AsuraPow: 0, j2Asura: 0, // Monk rework
  physPen: 0, magPen: 0, elemDmg: 0,
  j3Wl: 0, j3WlBlitz: 0,
  j3Sk: 0, j3Kp: 0, j3Hw: 0, j3Mc: 0, j3Pierce: 0, j3KpDebtAmp: 0, j3HwDrain: 0, j3HwAmp: 0, j3McOver: 0, // 🥷🎩🌌🤖 the last four Awakenings
  strManaMiss: 0, j3Pf: 0, j3PfLegFire: 0, j3PfLegLight: 0, j3PfLegIce: 0, j3PfMarkTurns: 0, j3PfResidue: 0, j3PfChain: 0, j3PfCritMana: 0, j3PfTrinity: 0, j3PfSoulChange: 0, j3PfMemorize: 0, j3PfDcAt: 0, j3PfDcMul: 0, j3PfForesight: 0, // 🎓 Professor
  thDeathMark: 0, thUltCdAdd: 0, thMistDr: 0, tankDr: 0, tankSkillDr: 0, thDefShieldCut: 0, thFlurryDmgCut: 0, thMobFlurry: 0, thEldritchVenom: 0, thPhysLeechCut: 0, thS3ShieldPierce: 0, thLuckyKnife: 0, // PoE Passive Tree Phase 1: Thief-Line
}

export const RULES = {
  arcDeg: 130, // swing cone
  hurtIframesMs: 800,
  healOnClear: 0.2, // share of max HP back after each room
  healOnLevel: 0.2,
  xpOnClear: 6,
  hellDeathBase: 0.05, hellDeathJob: 0.1, // v128 (Q 2026-11-19) 😈 death in hell mode: lose this share of the current Base / Job Lv bar (RO style, never de-levels)
  failXpMul: 0.25, // Dxx run lost (dead / timeout / left early): account Base + Job EXP x this · zeny / loot unchanged (Q 2026-11-18, live-tunable)
  smashRadius: 140,
  runXpBase: 4, runXpStep: 3, // live-tunable (data/tunables.ts progression)
  xpNeed: (level: number): number => RULES.runXpBase + RULES.runXpStep * level, // xp to go from `level` to `level + 1`
}

/** Account EXP (Base + Job) banked at the end of a run: a lost Dxx run (normal / hard / hell) keeps only RULES.failXpMul of it. */
export const bankedRunXp = (xp: number, won: boolean, dxx: boolean): number => (won || !dxx ? xp : Math.round(xp * RULES.failXpMul))
