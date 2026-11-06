import type { Archetype, SkillScale, StatAlloc } from './mon-stats'
import type { BaseStat } from './meta'
import { PACKS, type D7Kind, type D7Mini, type D8Kind, type D8Mini, type D9Kind, type D9Mini, type D10Kind, type D10Mini } from './dungeons'
// ===== All tunable numbers live here, so balance changes never touch game logic. =====

export const TILE = 48
export const COLS = 20
export const ROWS = 12
export const W = TILE * COLS // 960
export const H = TILE * ROWS // 576

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
  dodgeHeal: number // share of max HP healed whenever a monster attack is dodged (Thief gear)
  waveShield: number // shield worth this share of max HP at the start of every wave (Swordsman / Cleric gear)
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
  thExecute: number // Thief ★ เพชฌฆาต: crit vs monster < 30% HP x1.5
  poisonLeech: number // Thief เลือดพิษ: heal this share of poison tick damage
  killHeal: number // Thief กระหายเลือด: kill heals this share of max HP
  bloodKing: number // Thief ★ ราชันย์โลหิต: HP < 40% -> lifesteal x2
  thUltAgi: number // Thief: เงาพริ้ว damage +this share (from AGI, meta.ts heroStats)
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
  poisonAmp: number // Thief talent: + damage taken by monsters with >= 10 poison
  lightHits: number // Mage: + hits of the single-target lightning ult (base 6)
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
  j2RageTurn: number // Berserker ★ ไม่รู้สึกเจ็บ flag: Rage 100 = an extra swing
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
  j2KnifeCrit: number // Rogue ★ flag: every basic / combo crit throws one more knife
  j2ExecAdd: number // Mobster: + Execute HP threshold
  j2DebtX2: number // Mobster ★ flag: every debuff counts as 2 debt
  j2ExecTurn: number // Mobster ★ flag: an Execute gives the hero an extra turn (once per hero turn)
  j2DebuffTurns: number // Mobster: + turns on ตัดเส้นเอ็น debuffs
  j2CrossAdd: number // Crusader: + Holy Cross / Grand Cross power
  j2PayCut: number // Crusader: Grand Cross pays this much less HP (share of the cost)
  j2BlindAdd: number // Crusader: + turns of Holy Cross blind
  j2GcTwice: number // Crusader ★ Grand Cross ซ้อน flag: fires twice, the 2nd one free
  j2ShieldBoom: number // Crusader Shield Boomerang: Holy Cross also throws the shield for P.DEF x this (needs an off-hand)
  j2Reflect: number // Crusader Reflect Shield: landed physical hits bounce this share back (capped by BATTLE.reflectCap)
  j2BlockShield: number // Crusader ★ ป้อมศรัทธา: a block gives this share of max HP as shield
  j2BlockHeal: number // Crusader: a block heals this share of max HP
  j2Martyr: number // Crusader ★ ผู้พลีชีพ flag: first lethal hit per wave leaves 1 HP + shield
  j2ChargeMax: number // Monk: + max power charges
  j2ThunderPer: number // Monk: + Falling Thunder power per charge
  j2Es: number // Monk Invoker Energy Shield: a hero turn without being hit gives this share of max HP as shield
  j2Chill: number // Monk Invoker: basic / combo hits chill chance
  j2Instill: number // Monk ★ Instill flag: full charges = every swing adds a lightning bolt
  j2Dark: number // Monk Chayula Darkness: shield of this share of max HP every hero turn
  j2NoLight: number // Monk ★ ไร้แสง flag: overheal becomes Darkness shield x KIT2.monk.noLightMul
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
  j2Hindsight: number // Sage ★ Hindsight flag: Auto Spell also on combo hits and counters
  j2EndowTurns: number // Sage: + Endow turns
  j2EndowAmp: number // Sage: + Endow damage
  j2EndowWave: number // Sage ★ flag: Endow lasts the whole wave
  j2MagicRod: number // Sage Magic Rod: Mana per magic hit taken
  j2RodBlock: number // Sage ★ Magic Rod flag: the first magic hit of each wave is absorbed
  // ----- Phase 4 Archer: Beastmaster / Innovator -----
  j2HawkChance: number // Beastmaster ฟ้า: + hawk Blitz Beat chance per hero swing
  j2HawkMul: number // Beastmaster: + hawk damage
  j2HawkHits: number // Beastmaster: + hawk targets per Blitz Beat
  j2HawkEvo: number // Beastmaster ★ เหยี่ยวทอง flag
  j2BoarHp: number // Beastmaster ป่า: + boar HP (share of hero max HP)
  j2BoarMul: number // Beastmaster: + boar charge damage
  j2BoarShield: number // Beastmaster: boar charge also shields the hero (share of max HP)
  j2BoarEvo: number // Beastmaster ★ หมูป่าเกราะ flag
  j2WolfMul: number // Beastmaster เขี้ยว: + wolf bite damage
  j2WolfBleed: number // Beastmaster: + bleed stacks per bite
  j2WolfSpeed: number // Beastmaster: + wolf speed (share of hero speed)
  j2WolfEvo: number // Beastmaster ★ ราชาหมาป่า flag
  j2PetPow: number // v82 Beastmaster ใจเดียวกัน: + every pet's power
  j2PetRes: number // v82 Beastmaster ประสานล่า: hero Energy per pet act
  j2CmdCut: number // v82 Beastmaster คำสั่งไว: สั่งลุย costs this much less
  j2Pack3: number // v82 Beastmaster ★ ฝูงพันธมิตร flag: all 3 pets every wave (non-main at KIT2.beastmaster.tree.pack3Pow)
  j2PackLead: number // v82 Beastmaster ผู้นำฝูง: + hero damage per live pet
  j2PetHeal: number // v82 Beastmaster เลียแผล: heal (share of max HP) per pet act
  j2Roar: number // v82 Beastmaster ขู่คำราม: wave start, every monster's gauge -this
  j2CritPet: number // v82 Beastmaster ★ พรานแห่งป่า flag: a hero crit sends the main pet in again (once per hero turn)
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
  clDawnAmp: number // + bonus damage (แสงแตก)
  clDawnUlt: number // ★ อรุณพิทักษ์ flag: the bonus is a sure crit
  clCoreBase: number // v86 💠 จิตสงบ: + STR and WIS (base stats, meta totalBase)
  clMindRegen: number // v86 💠 จิตสงบ: + resRegen per 10 points of the lower of STR / WIS (meta heroStats)
  clIntToStr: number // v86 💠 ศรัทธาสู่กาย: every this many INT = +1 STR (0 = off; meta totalBase)
  clManaGuard: number // v86 💠 มานาพิทักษ์: share of damage taken (before shields) gained as Mana
  clManaHeal: number // v86 💠 มานาพิทักษ์: share of Mana spent healed as HP
  clManaShield: number // v86 💠 มานาพิทักษ์: wave-start shield, share of Max Mana
  bossShield: number // shield (share of max HP) at the start of a boss fight
  lateDmg: number // + damage share from fight turn 12 on (anti turn-limit)
  strToInt: number // Mage node กายสู่เวท: share of STR (above base) that also counts as INT
  spearLuck: number // Cleric: chance per hero turn to call 1 light spear (from LUK, v37)
  s1Pow: number // skill web: ทักษะ 1 (auto) power share (replaces class skill levels)
  ultPow: number // skill web: Ult power share
  s2Lv: number // skill web: picked Skill 2's "+" node, 0..3 (v83: node Lv 1..5 x 3/5, so it can be fractional; Lv 5 = 3)
  s2Star: number // skill web: 1 = the picked Skill 2's ★ node
  spellCrit: number // 0..1 crit chance for magic hits (Q 2026-11-03: magic crits only via talent/item/card), uses critMul
}

export const PLAYER: Stats = {
  maxHp: 140, atk: 13, minPct: 0.5, matk: 10, pskill: 0, def: 0, mdef: 0, tenacity: 0, healAmp: 0, shieldAmp: 0,
  hit: 10, flee: 5, luckyDodge: 0, legendChance: 0.06, eventChance: 0.1, dropChance: 0.04, maxRes: 60, resRegen: 3,
  aspd: 1.6, range: 110, crit: 0, critMul: 1.4, /* Q: crit only from items, skill tree, talents (+ in-run cards) */ speed: 190,
  guard: 0, lifesteal: 0, regen: 0, fireEvery: 0, boltMul: 2, burnDps: 0, poison: 0, poisonDmg: 2,
  smashMul: 3, smashCd: 6000, smashCost: 0, revive: 0, counter: 0, combo: 0, dodgeHeal: 0, waveShield: 0,
  thorns: 0, rageGain: 0, autoCostCut: 0, ctrAoe: 0, berserk: 0, pierce: 0, lockOn: 0, dodgeStrike: 0, doubleAtk: 0, thExecute: 0, poisonLeech: 0, killHeal: 0, bloodKing: 0, thUltAgi: 0, lightMax: 0, overload: 0, lightLuck: 0, burnCap: 0, autoBurn: 0, fireSpread: 0, chillPlus: 0, brittle: 0, comboCount: 0, comboDmg: 0, ignoreCombo: 0, ignoreCounter: 0, comboDR: 0, counterDR: 0, critDR: 0, vsBurn: 0, vsChill: 0, vsPoison: 0, chillWeak: 0, spearShield: 0, counterDmg: 0, basicDmg: 0, resTurn: 0, shatter: 0, reviveHp: 0, smiteTargets: 0, holyCounter: 0, overhealShield: 0, poisonCap: 0, poisonSpread: 0, fleeFloor: 0, waveDodge: 0, dodgeEnergy: 0, ultDodge: 0, ultHits: 0, ultPoison: 0, poisonAmp: 0, lightHits: 0, lightChain: 0, burnTick: 0, chillSlow: 0, iceBarrier: 0, boltHits: 0, boltCharge: 0, stormSet: 0, mgLightAmp: 0, mgFireAmp: 0, mgIceAmp: 0, mgFirstCard: 0, mgFireStack: 0, mgWaveBarrier: 0, resRegenCut: 0, mgUltAmp: 0, elemWheel: 0, mgBarrierCut: 0, barrierBoom: 0, mgEmergency: 0, mgDoubleCast: 0, mgUltCd: 0, mgUltMana: 0, mgOverflow: 0, cleaveAdd: 0, startRage: 0, rageOnHurtAdd: 0, spellVamp: 0, skillDmgCut: 0, ultMulAdd: 0, ultAmp: 0, ultPierce: 0, poise: 0, ultShieldAdd: 0, ultVsCharge: 0, ultCounters: 0, counterRage: 0, counterShield: 0, arDodgeShield: 0, arUltBreak: 0, arWaveDodge: 0, arSnipeLow: 0, arLowHpBonus: 0, arVolley: 0, arAim: 0, arAimCrit: 0, arUltSplash: 0, arUltDodge: 0, arUltMulCut: 0, arHawk: 0, arStartFull: 0, arTurnRes: 0, arCritRes: 0, arDodgeRes: 0, arPoisonArrow: 0, arRicochet: 0, arPoisonS2: 0, arMark: 0, arMarkJump: 0, arKillCd: 0, arExecute: 0, debuffRes: 0, healAt: 0, atone: 0, judge: 0, smiteMul: 0, smiteVamp: 0, healShield: 0, spearStart: 0, spearRate: 0, spearMul: 0, spearHeal: 0, ultRegen: 0, ultHoly: 0, ultChargeShield: 0, clDawn: 0, clDawnCrit: 0, clDawnHeal: 0, clDawnAmp: 0, clDawnUlt: 0, clCoreBase: 0, clMindRegen: 0, clIntToStr: 0, clManaGuard: 0, clManaHeal: 0, clManaShield: 0, bossShield: 0, lateDmg: 0, spellCrit: 0, spearLuck: 0, strToInt: 0, s1Pow: 0, ultPow: 0, s2Lv: 0, s2Star: 0, clUltAtk: 0, clUltLights: 0, clSpearShield: 0, clPurify: 0, s3Pow: 0, ult2Pow: 0, j2FrenzyMax: 0, j2BossCrit: 0, j2Duel: 0, j2DuelExec: 0, j2LowHp: 0, j2RageTurn: 0, j2HpDmg: 0, j2PierceHits: 0, j2Boomerang: 0, j2Spiral: 0, j2Guard: 0, j2DefAtk: 0, j2HpPct: 0, j2CounterCrit: 0, j2Charge: 0, j2ChargeFirst: 0, j2KnifeAdd: 0, j2KnifeMul: 0, j2KnifeCrit: 0, j2ExecAdd: 0, j2DebtX2: 0, j2ExecTurn: 0, j2DebuffTurns: 0, j2CrossAdd: 0, j2PayCut: 0, j2BlindAdd: 0, j2GcTwice: 0, j2ShieldBoom: 0, j2Reflect: 0, j2BlockShield: 0, j2BlockHeal: 0, j2Martyr: 0, j2ChargeMax: 0, j2ThunderPer: 0, j2Es: 0, j2Chill: 0, j2Instill: 0, j2Dark: 0, j2NoLight: 0, // Novice: cooldown only (resources come with job change)
  j2MeteorMul: 0, j2Meteors: 0, j2LovMul: 0, j2LovStun: 0, j2LovHits: 0, j2GustMul: 0, j2QuickCast: 0, j2AutoChance: 0, j2AutoBolts: 0, j2Hindsight: 0, j2EndowTurns: 0, j2EndowAmp: 0, j2EndowWave: 0, j2MagicRod: 0, j2RodBlock: 0, // Phase 5 Wizard / Sage
  j2HawkChance: 0, j2HawkMul: 0, j2HawkHits: 0, j2HawkEvo: 0, j2BoarHp: 0, j2BoarMul: 0, j2BoarShield: 0, j2BoarEvo: 0, j2WolfMul: 0, j2WolfBleed: 0, j2WolfSpeed: 0, j2WolfEvo: 0, j2PetPow: 0, j2PetRes: 0, j2CmdCut: 0, j2Pack3: 0, j2PackLead: 0, j2PetHeal: 0, j2Roar: 0, j2CritPet: 0, j2Traps: 0, j2TrapMul: 0, j2Claymore: 0, j2BoxLuck: 0, j2BoxMul: 0, j2Reroll: 0, j2TurretMul: 0, j2TurretTurns: 0, j2TurretWave: 0, // Phase 4 Beastmaster / Innovator
  swFlow: 0, swFlowMana: 0, swFlowCrit: 0, swFlowStar: 0, swBreak: 0, swBreakLeech: 0, swBreakSpread: 0, swShatter: 0, // v84 Swordsman web
  clFaith: 0, clFaithOver: 0, clFaithHeal: 0, clOverBurst: 0, clUltWard: 0, clEmergency: 0, clUltMend: 0, clRevive: 0, // v84 Priest web
  j2Banner: 0, j2Provoke: 0, j2BannerKill: 0, j2BannerAura: 0, j2Sweep: 0, j2SweepPush: 0, j2SweepGauge: 0, j2SweepStar: 0, // v84 Knight ใยชั้น 2
}

export const RULES = {
  arcDeg: 130, // swing cone
  hurtIframesMs: 800,
  healOnClear: 0.2, // share of max HP back after each room
  healOnLevel: 0.2,
  xpOnClear: 6,
  smashRadius: 140,
  runXpBase: 4, runXpStep: 3, // live-tunable (data/tunables.ts progression)
  xpNeed: (level: number): number => RULES.runXpBase + RULES.runXpStep * level, // xp to go from `level` to `level + 1`
}

export type Tag = 'crit' | 'speed' | 'guard' | 'blood' | 'fire' | 'venom' | 'holy' | 'storm' | 'common'
export const TAGS: Record<Tag, { name: string; icon: string; color: string }> = {
  crit: { name: 'คริ', icon: '💥', color: '#f2b84b' },
  speed: { name: 'เร็ว', icon: '⚡', color: '#7fd7ff' },
  guard: { name: 'อึด', icon: '🛡️', color: '#5fa8d3' },
  blood: { name: 'เลือด', icon: '🩸', color: '#ff6b7a' },
  fire: { name: 'ไฟ', icon: '🔥', color: '#ff8c42' },
  venom: { name: 'พิษ', icon: '☠️', color: '#a77be0' },
  holy: { name: 'ศักดิ์สิทธิ์', icon: '✨', color: '#f6e27a' },
  storm: { name: 'สายฟ้า', icon: '🌩️', color: '#bfe6ff' },
  common: { name: 'ทั่วไป', icon: '⭐', color: '#c9c9d6' },
}

export interface Perk { id: string; tag: Tag; name: string; desc: string; mod: Partial<Stats> }
/** Perk text names the player's own ult: '{ult}' becomes e.g. 'ท่าไม้ตาย 👤 เงาพริ้ว' (Thief) or 'ท่าไม้ตาย 💢 ทุบ' (Novice). */
export const perkDesc = (desc: string, ult?: { icon: string; name: string }) => desc.split('{ult}').join(ult ? `ท่าไม้ตาย ${ult.icon} ${ult.name}` : 'ท่าไม้ตาย')

// Pick 1 of 3 on every level up. 3 perks of one tag = set bonus (SET_BONUS).
export const PERKS: Perk[] = [
  { id: 'crit1', tag: 'crit', name: 'ตาเหยี่ยว', desc: 'โอกาสคริ +15%', mod: { crit: 0.15 } },
  { id: 'crit2', tag: 'crit', name: 'จุดตาย', desc: 'ดาเมจคริ +60%', mod: { critMul: 0.6 } },
  { id: 'crit3', tag: 'crit', name: 'มีดลับคม', desc: 'ATK +4 และโอกาสคริ +8%', mod: { atk: 4, crit: 0.08 } },
  { id: 'spd1', tag: 'speed', name: 'มือไว', desc: 'ความเร็วโจมตี +25%', mod: { aspd: 0.4 } },
  { id: 'spd2', tag: 'speed', name: 'ฝีเท้าเบา', desc: 'ตีเร็ว +15% · Flee +6', mod: { aspd: 0.24, flee: 6 } },
  { id: 'spd4', tag: 'speed', name: 'ฟันรัว', desc: 'โอกาสคอมโบ (ตีซ้ำ) +12%', mod: { combo: 0.12 } },
  { id: 'spd3', tag: 'speed', name: 'สมาธินิ่ง', desc: '{ult} คูลดาวน์ -1 เทิร์น · Flee +8', mod: { smashCd: -1500, flee: 8 } },
  { id: 'grd1', tag: 'guard', name: 'หนังหนา', desc: 'HP สูงสุด +50 (ฟื้นเท่าที่เพิ่ม)', mod: { maxHp: 50 } },
  { id: 'grd2', tag: 'guard', name: 'โล่ไม้', desc: 'รับดาเมจน้อยลง 15%', mod: { guard: 0.15 } },
  { id: 'grd3', tag: 'guard', name: 'ลมหายใจ', desc: 'ฟื้น HP 1.5% ทุกเทิร์น', mod: { regen: 1 } },
  { id: 'grd4', tag: 'guard', name: 'ท่าสวน', desc: 'โอกาสสวนกลับ +15% เมื่อโดนตี', mod: { counter: 0.15 } },
  { id: 'bld1', tag: 'blood', name: 'ดูดเลือด', desc: 'ตีธรรมดาฟื้น HP 6% ของดาเมจ', mod: { lifesteal: 0.06 } },
  { id: 'bld2', tag: 'blood', name: 'คลั่งเลือด', desc: 'ATK +6', mod: { atk: 6 } },
  { id: 'bld3', tag: 'blood', name: 'บดกระดูก', desc: 'ดาเมจ{ult} x2', mod: { smashMul: 3, ultAmp: 1 } },
  { id: 'fir1', tag: 'fire', name: 'ลูกไฟ', desc: 'ทุกการตีครั้งที่ 3 ยิงลูกไฟใส่ศัตรูที่ไกลที่สุด (x2 M.ATK)', mod: { fireEvery: 3 } },
  { id: 'fir2', tag: 'fire', name: 'เผาไหม้', desc: 'ลูกไฟติดไฟ เผา 6 ดาเมจ/เทิร์น 3 เทิร์น', mod: { burnDps: 6 } },
  { id: 'fir3', tag: 'fire', name: 'ลูกไฟใหญ่', desc: 'ลูกไฟแรงขึ้น +2x M.ATK', mod: { boltMul: 2 } },
  { id: 'stm1', tag: 'storm', name: 'Lightning Bolt', desc: 'ทุกเทิร์นยิงสายฟ้า 3 ฮิต ฮิตละ 0.3x M.ATK สุ่มเป้า (ได้ซ้ำ = เลเวลขึ้น +1 ฮิต สูงสุด Lv5)', mod: { boltHits: 3 } },
  { id: 'stm2', tag: 'storm', name: 'ฟ้าคะนอง', desc: 'Lightning Bolt +2 ฮิต', mod: { boltHits: 2 } },
  { id: 'stm3', tag: 'storm', name: 'ประจุสะสม', desc: 'ทุก 10 ฮิตสายฟ้า ฮิตถัดไปแรง 3x และผลักเทิร์นเป้า', mod: { boltCharge: 1 } },
  { id: 'ven1', tag: 'venom', name: 'เคลือบพิษ', desc: 'ทุก hit ติดพิษ 1 stack (2 ดาเมจ/stack/เทิร์น)', mod: { poison: 1 } },
  { id: 'ven2', tag: 'venom', name: 'พิษเข้มข้น', desc: 'พิษแรงขึ้น +2 ดาเมจ/stack/เทิร์น', mod: { poisonDmg: 2 } },
  { id: 'hol1', tag: 'holy', name: 'แสงอุ่น', desc: 'ฮีลแรง +20%', mod: { healAmp: 0.2 } },
  { id: 'hol2', tag: 'holy', name: 'โล่ศรัทธา', desc: 'โล่แรง +25% · P.DEF +5', mod: { shieldAmp: 0.25, def: 5 } },
  { id: 'hol3', tag: 'holy', name: 'ภาวนา', desc: 'ฟื้น HP 1.5%/เทิร์น · ฟื้น Mana +2/เทิร์น', mod: { regen: 1, resRegen: 0.7 } },
  { id: 'ven3', tag: 'venom', name: 'หนามพิษ', desc: 'ทุก hit ติดพิษเพิ่มอีก 1 stack และ ATK +2', mod: { poison: 1, atk: 2 } },
]

// Common cards: any job can roll them, one is always in the 1-of-3, and they stack (no set bonus).
export const COMMON_PERKS: Perk[] = [
  { id: 'c_hp', tag: 'common', name: 'ร่างกายกำยำ', desc: 'HP สูงสุด +35', mod: { maxHp: 35 } },
  { id: 'c_def', tag: 'common', name: 'ผิวหนา', desc: 'P.DEF +8', mod: { def: 8 } },
  { id: 'c_atk', tag: 'common', name: 'ฝึกฝน', desc: 'P.ATK +3 · M.ATK +3', mod: { atk: 3, matk: 3 } },
  { id: 'c_hit', tag: 'common', name: 'สายตาคม', desc: 'Hit +5 · คริ +3%', mod: { hit: 5, crit: 0.03 } },
  { id: 'c_flee', tag: 'common', name: 'ก้าวเบา', desc: 'Flee +6', mod: { flee: 6 } },
  { id: 'c_ctr', tag: 'common', name: 'ไหวพริบ', desc: 'โอกาสสวนกลับ +8%', mod: { counter: 0.08 } },
  { id: 'c_mdef', tag: 'common', name: 'จิตนิ่ง', desc: 'M.DEF +6%', mod: { mdef: 0.06 } },
  // one per run: offered only until picked, never doubled by legendary
  { id: 'c_revive', tag: 'common', name: 'ขนนกฟีนิกซ์', desc: 'ล้มครั้งแรกจะลุกขึ้นใหม่ HP 30% (1 ครั้ง/รอบ)', mod: { revive: 1 } },
]

export const SET_BONUS: Partial<Record<Tag, { desc: string; mod: Partial<Stats> }>> = {
  holy: { desc: 'เซ็ตศักดิ์สิทธิ์: ฮีล/โล่แรงอีก +20%', mod: { healAmp: 0.2, shieldAmp: 0.2 } },
  crit: { desc: 'เซ็ตคริ: โอกาสคริ +20%', mod: { crit: 0.2 } },
  speed: { desc: 'เซ็ตเร็ว: ตีเร็ว +30%', mod: { aspd: 0.5 } },
  guard: { desc: 'เซ็ตอึด: รับดาเมจน้อยลงอีก 20%', mod: { guard: 0.2 } },
  blood: { desc: 'เซ็ตเลือด: ดูดเลือด +5% และ ATK +5', mod: { lifesteal: 0.05, atk: 5 } },
  storm: { desc: 'เซ็ตพายุ: สายฟ้าลงเป้าเดิมซ้ำในเทิร์นเดียว แรงขึ้น +10% ต่อครั้ง', mod: { stormSet: 1 } },
  fire: { desc: 'เซ็ตไฟ: ลูกไฟทุกการตีครั้งที่ 2', mod: { fireEvery: -1 } },
  venom: { desc: 'เซ็ตพิษ: พิษ +2 stack ต่อ hit', mod: { poison: 2 } },
}

export type MonsterKind = 'jellop' | 'wolf' | 'king' | 'minijellop' | 'bat' | 'shroom' | 'boar' | 'shadowwolf' | 'alpha'
  | 'skeleton' | 'wisp' | 'gargoyle' | 'duelist' | 'hunter' | 'gunner' | 'drainer' | 'deathknight'
  | 'toad' | 'lizardshaman' | 'hornet' | 'turtleguard' | 'bloater' | 'spiderling' | 'venomqueen' | 'frostgiant' | 'hydra'
  | 'hellknight' | 'hexwitch' | 'imp' | 'necropriest' | 'wraith' | 'shard' | 'mirage' | 'warlord' | 'lich'
  | 'dewsprite' | 'bonepriest'
  | 'mummy' | 'jackal' | 'sandscorp' | 'dunewraith' | 'scarab' | 'sunpriest' | 'sphinx' | 'jackallord' | 'pharaoh' // D6
  | 'maiden' // drainer's Summon Maiden (Q 2026-11-04)
  | D7Kind | D8Kind | D9Kind | D10Kind // v78: D7-D10 packs (data/dungeons/dN.ts)
  | 'mimic' | 'mimicking' | 'goldjellop' // event monsters (design/roadmap-and-events-v1.md): stats scale with the dungeon tier at spawn
export type MiniKind = 'duelist' | 'hunter' | 'gunner' | 'drainer' | 'venomqueen' | 'frostgiant' | 'mirage' | 'warlord' | 'sphinx' | 'jackallord'
  | D7Mini | D8Mini | D9Mini | D10Mini

// ----- Dungeon 4-5 (design/dungeon-4-5-brutal.md): data-driven monster skills, debuffs on the hero, boss phases -----
/** What a landed monster hit (or a skill / charged attack) puts on the hero. Turns count hero turns. */
export interface HitFx {
  poison?: number // + poison stacks: each hero turn lose 1.2% max HP per stack, then 1 stack fades (cap 10)
  burn?: number // burn for N hero turns: lose 3% max HP per turn, healing on the hero -40%
  weaken?: number // curse for N hero turns: hero damage -25%
  armorBreak?: number // N hero turns: P.DEF and M.DEF count half
  silence?: number // N hero turns: the ultimate / Smash can't be cast (it stays queued)
  freeze?: number // hero turn gauge lost (tenacity reduces it); 100 = skip a whole turn
  slow?: number // N hero turns (Q 2026-11-04, frostgiant Frozen Heart): hero attack speed x BATTLE.frozenHeart
  web?: number // N hero turns (Q 2026-11-04, venomqueen พ่นใยมัดตัว): Can't Evade (no Flee / lucky dodge) and AGI -50%
}
export type MonSkillKind = 'heal' | 'shield' | 'warcry' | 'curse' | 'summon' | 'revive' | 'haste' | 'bolt' | 'strike'
/** A monster turn spent on a skill instead of an attack: used on every `every`-th turn of that monster when it makes sense. */
export interface MonSkill {
  kind: MonSkillKind
  every: number
  name: string
  pow?: number // heal / shield: share of the target's max HP · warcry: + damage share · haste: gauge added · bolt: x M.ATK
  turns?: number // warcry: monster turns it lasts
  fx?: HitFx // curse: what lands on the hero (can't miss, debuffRes can resist) · bolt: rides on the spell if it lands
  summon?: [MonsterKind, number] // summon: kind, how many (free slots only)
  self?: boolean // heal / shield: only on itself
  magic?: boolean // strike: dealt as magic (vs M.DEF, Flee can't dodge) from ATK — death knight ดาบมรณะ
  alone?: number // strike: x this when no other monster stands with it
  drain?: number // strike (Q 2026-11-04, hunter): after it lands, drains this share of the hero's current HP as magic damage and heals itself by it
  hits?: number // bolt / strike: this many hits of pow each (each rolls its own crit; strike hits each roll Flee)
  pick?: MonSkill[] // cast a random one of these instead (spell rotation: Mordecus' elements)
  big?: boolean // legendary spell: big callout + screen flash
  scale?: SkillScale | false // v68: stat it scales with (default by kind, mon-stats SKILL_SCALE); false = flat
  lv?: number // v81 skill level (mon-stats skillAtLv, SKILL_SCALE.lv): 1 = as written; may pass the hero's max (RO style Lv 50)
}
/** Boss phase: entered once when HP drops under `at` (share of max HP). Effects stack with later phases. */
export interface BossPhase {
  at: number
  name: string
  speed?: number // x turn speed
  dmg?: number // x damage
  chargeEvery?: number // new charge rhythm
  heal?: number // heal this share of max HP on entering (heal cut applies)
  shield?: number // shield of this share of max HP on entering
  summon?: [MonsterKind, number]
  reflect?: number // from now on reflects this share of every direct hit
  absorb?: number // from now on stores this share of every direct hit for the Soul Strike
  skills?: MonSkill[] // replaces the skill list
  onHit?: HitFx // replaces the hit effect
  slamFx?: HitFx // replaces the charged attack's effect
  drainStats?: number // Death Realm (Q 2026-11-04): every one of its turns the hero loses this many points of every base stat for the rest of the fight; it gets +1% damage per point
  cleanse?: boolean // drops its burns / poison / chill on entering
}

export interface MonsterDef {
  name: string
  tex: string
  hp: number
  dmg: number // contact damage (physical) · also magic damage when matk is unset
  matk?: number // M.ATK: magic attacks, magic charges and bolt spells use this instead of dmg (Q 2026-11-04)
  ai: 'hopper' | 'dasher' | 'boss'
  moveSpeed: number // hop / dash speed
  radius: number // body circle
  zeny: [number, number]
  xp: number
  idleMs: [number, number] // rest between moves
  flee?: number // vs the hero's Hit (default 5)
  hit?: number // vs the hero's Flee (default 15)
  def?: number // P.DEF: physical hits deal dmg*100/(100+def); magic ignores it
  magic?: boolean // attacks are magic: the hero's M.DEF (WIS) reduces them, P.DEF does not
  summon?: MonsterKind // boss: calls 2 of these at 50% HP
  slamName?: string // boss: name of the charged attack
  slamMagic?: boolean // boss: the charged attack is magic (M.DEF) instead of physical (P.DEF)
  slamAnim?: 'stomp' | 'pounce' | 'cleave' | 'shot' | 'cast' | 'bite' // boss: how the charged attack looks (Q 2026-11-03: not every boss stomps)
  slamColor?: number // tint of its projectile / magic / burst
  charge?: boolean // boss: telegraphed charged attack every chargeEvery turns, then a slam (BREAK removed, Q 2026-11-03)
  // ----- Dungeon 3 (mini bosses, design/dungeon-3-miniboss.md) -----
  mini?: MiniKind // 1v1 mini boss archetype: its own turn script in BattleScene.miniTurn
  title?: string // epithet shown on the duel banner
  lifesteal?: number // heals this share of the damage it deals (heal cut from burn reduces it)
  chargeEvery?: number // boss: charges every Nth turn (default BATTLE.slamEvery)
  slamMul?: number // boss: charged attack = (dmg + 8) * monDmgMul * this (default 1.6)
  iceSkin?: boolean // frostgiant passive (BATTLE.iceSkin): a hero hit that lands leaves ice thorns: hero damage cut for a few turns
  toxicSkin?: boolean // venomqueen passive (BATTLE.toxicSkin): takes less damage, poisons whoever hits it, shrugs debuffs, softens crits
  venom?: { dmg: number; turns: number; dex: number } // charged attack (Venom Strike): adds `dex` to its M.ATK and leaves a magic DoT that doubles every hero turn
  vengeance?: boolean // death knight โล่แห่งความแค้น (BATTLE.vengeance)
  fixedFlee?: number // hero hits (physical, magic, crits) miss this share of the time, whatever Hit is (Maiden: 0.5)
  razor?: number // on-hit (Q 2026-11-04, hunter Blood Razor): each landed normal / combo hit adds magic damage = this share of the hero's current HP
  trueSight?: { after: number; turns: number } // v56 anti-AGI: after the hero evades it `after` times, its physical hits ignore Flee + lucky dodge for `turns` of its turns
  shots?: number // each attack is this many small hits, each rolls hit/flee on its own
  // ----- Dungeon 4-5 -----
  onHit?: HitFx // every landed hit also puts this on the hero
  slamFx?: HitFx // boss: the charged attack also puts this on the hero
  skills?: MonSkill[]
  reflect?: number // reflects this share of every direct hit (strike / Smash) back as magic damage
  absorb?: number // stores this share of every direct hit; the charged attack fires it back as Soul Strike bolts (Q 2026-11-03, Mirage)
  deathBlast?: number // explodes on death: (dmg) x monDmgMul x this as magic (Flee / lucky dodge / shield all work)
  phases?: BossPhase[]
  passive?: boolean // event monster that never attacks (เจลล็อปทองคำ: it only runs)
  // ----- v49 combat stats (Q 2026-11-04: monsters get combo / counter / crit like the hero) -----
  crit?: number // chance a hit / spell crits: x BATTLE.monCritMul and can't be fled (lucky dodge / shield still work)
  combo?: number // after a normal attack: chance to chain another hit, up to BATTLE.comboMax extra (each x BATTLE.monComboMul)
  counter?: number // when the hero's basic attack lands on it: chance to strike back right away (normal hit x BATTLE.monCounterMul)
  // ----- 7 base stats (data/mon-stats.ts). D6+ (level dungeons): numbers come from the stats at the room's level.
  // v76 D1-5 / events: hp / dmg / matk / def / hit / flee / crit / combo / counter are the tuned values AT THE HOME LEVEL with the
  // default statAlloc; changing statAlloc, LEGACY.lv or MON_STAT moves them by the same stat formulas (mon-stats withStats) -----
  statAlloc?: Archetype | StatAlloc // how its stat points are split (archetype or own weights; objects so admin.html can edit them). D6+: def / hit / flee / crit / combo / counter are bonuses on top
  bodyMul?: { hp?: number; dmg?: number; matk?: number } // x on the stat-built HP / ATK / M.ATK (a heavy body, a frail caster ...)
  pointsMul?: number // v81: x its stat point budget (Lv x tier share), so this one monster gets more / fewer stats at every level
  speedMul?: number // x on the AGI turn speed
  slamScale?: SkillScale // v68: stat the charged attack scales with (default STR, INT when slamMagic)
  // filled in by statMonster (never written by hand):
  lv?: number
  base?: Record<BaseStat, number>
  mdef?: number // M.DEF share (WIS): the hero's magic hits deal x (1 - mdef)
  luckyDodge?: number // LUK: chance the hero's physical hit misses outright
  tenacity?: number // WIS: debuff turns / freeze on it are shorter
  speed?: number // turn speed (AGI), replaces BATTLE.monSpeed
  statDef?: { ignoreCombo: number; ignoreCounter: number; comboDR: number; counterDR: number; critDR: number } // from AGI / DEX / VIT / LUK like the hero
}

export const MONSTERS: Record<MonsterKind, MonsterDef> = {
  jellop: { name: 'เจลล็อป', tex: 'jellop', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 34, dmg: 7, xp: 3, ai: 'hopper', moveSpeed: 250, radius: 15, zeny: [1, 2], idleMs: [500, 1100] },
  minijellop: { name: 'เจลล็อปจิ๋ว', tex: 'jellop', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 18, dmg: 4, xp: 1, ai: 'hopper', moveSpeed: 300, radius: 11, zeny: [0, 1], idleMs: [350, 800] },
  wolf: { name: 'หมาป่าสีเทา', tex: 'wolf', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 55, dmg: 11, xp: 5, ai: 'dasher', moveSpeed: 560, radius: 16, zeny: [2, 3], idleMs: [700, 1300], flee: 18, hit: 20 },
  king: { name: 'ราชาเจลล็อป', tex: 'king', statAlloc: { vit: 4, str: 3, int: 2, wis: 1 }, hp: 860, dmg: 16, matk: 18, xp: 0, ai: 'boss', moveSpeed: 230, radius: 38, zeny: [15, 20], idleMs: [700, 1000], summon: 'minijellop', slamName: 'ชาร์จพลัง! ทุบตอนนี้เลย', slamMagic: true, slamAnim: 'stomp', slamColor: 0x9fe3ff, charge: true,
    phases: [{ at: 0.5, name: 'ร่างเยลลี่ยักษ์! เกราะวุ้น', shield: 0.1 }] }, // boss buff v1
  // ----- Dungeon 2: ป่าหมาป่าเงา. Each monster tests one stat (see design/dungeon-2-and-events.md) -----
  bat: { name: 'ค้างคาวถ้ำ', tex: 'bat', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 42, dmg: 15, xp: 4, ai: 'dasher', moveSpeed: 500, radius: 12, zeny: [2, 3], idleMs: [500, 900], flee: 30, hit: 26 },
  shroom: { name: 'เห็ดสปอร์', tex: 'shroom', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 80, dmg: 21, matk: 24, xp: 5, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [2, 4], idleMs: [700, 1200], magic: true,
    skills: [{ kind: 'bolt', every: 3, pow: 1.3, name: 'ปล่อยสปอร์พิษ', fx: { poison: 1 } }] },
  boar: { name: 'หมูป่าเขี้ยวเหล็ก', tex: 'boar', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 145, dmg: 24, xp: 7, ai: 'dasher', moveSpeed: 420, radius: 18, zeny: [3, 5], idleMs: [800, 1300], def: 60 },
  shadowwolf: { name: 'หมาป่าเงา', tex: 'shadowwolf', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 92, dmg: 22, xp: 6, ai: 'dasher', moveSpeed: 600, radius: 16, zeny: [3, 4], idleMs: [600, 1100], flee: 22, hit: 26 },
  // ----- Dungeon 3: ซากป้อมวีรชน. Waves -> 1v1 mini boss (random of 4) -> waves -> boss -----
  skeleton: { name: 'ทหารโครงกระดูก', tex: 'skeleton', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 210, dmg: 36, xp: 7, ai: 'hopper', moveSpeed: 220, radius: 15, zeny: [4, 6], idleMs: [700, 1200], def: 45, hit: 32 },
  wisp: { name: 'ดวงไฟผี', tex: 'wisp', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 110, dmg: 34, matk: 38, xp: 6, ai: 'dasher', moveSpeed: 520, radius: 13, zeny: [4, 5], idleMs: [500, 900], magic: true, flee: 30,
    skills: [{ kind: 'bolt', every: 3, pow: 1.4, name: 'ลูกไฟผี', fx: { burn: 1 } }] },
  gargoyle: { name: 'การ์กอยล์หิน', tex: 'gargoyle', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 340, dmg: 44, xp: 9, ai: 'hopper', moveSpeed: 180, radius: 18, zeny: [5, 7], idleMs: [900, 1400], def: 90, hit: 30 },
  duelist: { name: 'เซเลสต์', title: 'นักดาบดวลเงินจันทร์', tex: 'duelist', statAlloc: { agi: 4, dex: 3, str: 3, luk: 2 }, hp: 1600, dmg: 42, xp: 12, ai: 'boss', mini: 'duelist', moveSpeed: 300, radius: 30, zeny: [30, 40], idleMs: [600, 900], def: 20, flee: 30, hit: 38,
    phases: [{ at: 0.4, name: 'ดาบจันทร์เต็มดวง! เร็วและคมขึ้น', speed: 1.2, dmg: 1.15 }] },
  hunter: { name: 'กริมฟาง', title: 'หมาป่าคลั่งเลือด', tex: 'hunter', statAlloc: { str: 4, agi: 3, vit: 2, luk: 1 }, hp: 1750, dmg: 44, xp: 12, ai: 'boss', mini: 'hunter', moveSpeed: 300, radius: 34, zeny: [30, 40], idleMs: [600, 900], def: 15, flee: 15, hit: 34, lifesteal: 0.35, chargeEvery: 4, slamName: 'กลิ่นเลือด! กระโจนตะครุบ', slamAnim: 'pounce', slamColor: 0xc03050, charge: true },
  gunner: { name: 'ปิ๊กซี่', title: 'มือปืนพลุบ้าระห่ำ', tex: 'gunner', statAlloc: { dex: 5, agi: 2, luk: 2, int: 1 }, hp: 1500, dmg: 21, xp: 12, ai: 'boss', mini: 'gunner', moveSpeed: 300, radius: 30, zeny: [30, 40], idleMs: [600, 900], def: 5, flee: 20, hit: 36, shots: 3, slamMul: 3.4, slamScale: { stat: 'dex' }, slamName: 'จรวดยักษ์! ล็อกเป้าแล้ว', slamAnim: 'shot', slamColor: 0xff8c42, slamMagic: true, charge: true,
    phases: [{ at: 0.5, name: 'กระสุนเพลิง! ยิงติดไฟ', onHit: { burn: 1 } }] },
  drainer: { name: 'คาร์วอส', title: 'จอมเวทกาดำ', tex: 'drainer', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1700, dmg: 38, matk: 42, xp: 12, ai: 'boss', mini: 'drainer', moveSpeed: 300, radius: 32, zeny: [30, 40], idleMs: [600, 900], def: 20, hit: 34, magic: true, slamMagic: true, lifesteal: 0.3, slamMul: 1.9, slamName: 'กรงเล็บวิญญาณ! ดูดชีวิต', slamAnim: 'cast', slamColor: 0xc03050, charge: true,
    skills: [{ kind: 'curse', every: 4, name: 'มนต์ปิดปาก', fx: { silence: 1 } }] },
  deathknight: { name: 'อัศวินมรณะ', tex: 'deathknight', statAlloc: { str: 4, vit: 3, int: 2, wis: 1 }, hp: 3200, dmg: 50, matk: 58, xp: 0, ai: 'boss', moveSpeed: 240, radius: 42, zeny: [60, 80], idleMs: [700, 1000], def: 35, flee: 12, hit: 36, lifesteal: 0.2, summon: 'skeleton', slamName: 'ดาบมรณะ! ฟันกวาดวิญญาณ', slamAnim: 'cleave', slamColor: 0x9a6aff, slamMagic: true, charge: true,
    skills: [{ kind: 'revive', every: 4, pow: 0.5, name: 'ปลุกศพ' }],
    phases: [{ at: 0.35, name: '💀 Death Realm! ดูด All Stat ทุกเทิร์น', drainStats: 1 }] }, // Q 2026-11-04 Monster DB comment (was: speed x1.2, charge every 2)
  // ----- Dungeon 4: บึงพิษมรกต. Monsters that heal, shield, poison and explode (design/dungeon-4-5-brutal.md) -----
  toad: { name: 'คางคกพิษ', tex: 'toad', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 270, dmg: 40, xp: 8, ai: 'hopper', moveSpeed: 220, radius: 16, zeny: [5, 7], idleMs: [700, 1200], def: 25, hit: 34, onHit: { poison: 2 } },
  lizardshaman: { name: 'หมอผีกิ้งก่า', tex: 'lizardshaman', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 240, dmg: 34, matk: 38, xp: 9, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [5, 8], idleMs: [700, 1200], magic: true, hit: 34,
    skills: [{ kind: 'heal', every: 2, pow: 0.18, name: 'น้ำมนต์บึง' }, { kind: 'bolt', every: 3, pow: 1.3, name: 'สายฟ้าบึง' }] },
  hornet: { name: 'ต่อยักษ์', tex: 'hornet', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 170, dmg: 20, xp: 8, ai: 'dasher', moveSpeed: 520, radius: 13, zeny: [5, 7], idleMs: [500, 900], flee: 42, hit: 40, shots: 2, onHit: { poison: 1 } },
  turtleguard: { name: 'ทหารเต่าโล่', tex: 'turtleguard', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 430, dmg: 38, xp: 10, ai: 'hopper', moveSpeed: 160, radius: 18, zeny: [6, 9], idleMs: [900, 1400], def: 120, hit: 32,
    skills: [{ kind: 'shield', every: 4, pow: 0.1, name: 'กำแพงกระดอง', scale: { stat: 'vit' } }] },
  bloater: { name: 'คางคกพองลม', tex: 'bloater', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 210, dmg: 30, xp: 8, ai: 'hopper', moveSpeed: 180, radius: 17, zeny: [5, 7], idleMs: [800, 1300], hit: 30, deathBlast: 2, onHit: { poison: 1 } },
  spiderling: { name: 'ลูกแมงมุม', tex: 'spiderling', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 160, dmg: 26, xp: 3, ai: 'dasher', moveSpeed: 480, radius: 11, zeny: [1, 2], idleMs: [400, 800], flee: 30, hit: 36, onHit: { poison: 1 } },
  venomqueen: { name: 'เวโนมิร่า', title: 'ราชินีใยพิษ', tex: 'venomqueen', statAlloc: { int: 3, agi: 3, luk: 2, str: 2 }, hp: 2300, dmg: 44, matk: 48, xp: 14, ai: 'boss', mini: 'venomqueen', moveSpeed: 300, radius: 34, zeny: [45, 60], idleMs: [600, 900], def: 30, flee: 25, hit: 40,
    onHit: { poison: 2 }, chargeEvery: 4, slamMul: 1, slamName: '🕷️ Venom Strike! พิษทวีคูณ', slamAnim: 'shot', slamColor: 0xd8f0c0, slamMagic: true, charge: true,
    venom: { dmg: 30, turns: 4, dex: 40 }, toxicSkin: true, // Q 2026-11-04 Monster DB comment
    skills: [{ kind: 'curse', every: 3, name: '🕸️ พ่นใยมัดตัว', fx: { web: 2 } }],
    phases: [{ at: 0.5, name: 'ฟักไข่! ลูกแมงมุมออกมา', summon: ['spiderling', 2], speed: 1.15 }] },
  frostgiant: { name: 'กลาเซียร์', title: 'ยักษ์ธารน้ำแข็ง', tex: 'frostgiant', statAlloc: { vit: 4, str: 3, int: 2, wis: 1 }, hp: 2600, dmg: 50, matk: 54, xp: 14, ai: 'boss', mini: 'frostgiant', moveSpeed: 240, radius: 40, zeny: [45, 60], idleMs: [700, 1000], def: 100, flee: 5, hit: 34,
    onHit: { armorBreak: 2 }, chargeEvery: 3, slamMul: 1.7, slamName: 'ทุบธารน้ำแข็ง! แช่แข็งทั้งตัว', slamFx: { freeze: 100 }, slamAnim: 'stomp', slamColor: 0x9fe3ff, slamMagic: true, charge: true,
    iceSkin: true, // Q 2026-11-04 Monster DB comment
    phases: [{ at: 0.4, name: 'เกราะน้ำแข็งพันปี!', shield: 0.18, dmg: 1.2, cleanse: true }],
    skills: [{ kind: 'bolt', every: 5, pow: 1.2, name: 'หอกน้ำแข็ง', fx: { freeze: 40 } }] },
  hydra: { name: 'ไฮดรามรกต', tex: 'hydra', statAlloc: { vit: 4, str: 3, int: 2, wis: 1 }, hp: 4800, dmg: 54, matk: 56, xp: 0, ai: 'boss', moveSpeed: 240, radius: 46, zeny: [90, 120], idleMs: [700, 1000], def: 45, flee: 15, hit: 40,
    onHit: { poison: 2 }, slamName: 'กัดสามหัว! พิษเข้ากระแสเลือด', slamMul: 1.6, slamFx: { poison: 4 }, slamAnim: 'bite', slamColor: 0x6fd08c, charge: true,
    phases: [
      { at: 0.66, name: 'หัวที่สองงอก! ฟื้นตัว + ไข่ฟัก', heal: 0.1, summon: ['toad', 2], dmg: 1.15, cleanse: true, onHit: { poison: 2, burn: 2 } },
      { at: 0.33, name: 'หัวที่สาม! คลั่งพ่นกรด', speed: 1.3, chargeEvery: 2, slamFx: { poison: 4, armorBreak: 3 }, cleanse: true },
    ],
    skills: [{ kind: 'bolt', every: 4, pow: 1.3, name: 'พ่นกรด', fx: { armorBreak: 2 } }] },
  // ----- Dungeon 5: บัลลังก์อเวจี. Buffers, cursers, revivers, mirrors, bombers -----
  hellknight: { name: 'อัศวินนรก', tex: 'hellknight', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 560, dmg: 56, xp: 12, ai: 'hopper', moveSpeed: 220, radius: 18, zeny: [8, 11], idleMs: [700, 1200], def: 80, hit: 40, onHit: { armorBreak: 2 },
    skills: [{ kind: 'warcry', every: 3, pow: 0.3, turns: 3, name: 'โห่ร้องสงคราม' }] },
  hexwitch: { name: 'แม่มดคำสาป', tex: 'hexwitch', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 320, dmg: 48, matk: 52, xp: 11, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [7, 10], idleMs: [700, 1200], magic: true, hit: 40, onHit: { burn: 2 },
    skills: [{ kind: 'curse', every: 3, name: 'คำสาปอ่อนแรง', fx: { weaken: 3, burn: 2 } }] },
  imp: { name: 'ปีศาจระเบิด', tex: 'imp', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 200, dmg: 36, xp: 8, ai: 'dasher', moveSpeed: 560, radius: 12, zeny: [5, 7], idleMs: [400, 800], flee: 38, hit: 42, deathBlast: 2 },
  necropriest: { name: 'นักบวชมรณะ', tex: 'necropriest', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 380, dmg: 40, matk: 44, xp: 11, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [7, 10], idleMs: [700, 1200], magic: true, hit: 38,
    skills: [{ kind: 'revive', every: 3, pow: 0.5, name: 'ปลุกศพ' }, { kind: 'heal', every: 2, pow: 0.15, name: 'มนต์ดำฟื้นกาย' }] },
  wraith: { name: 'ภูตกระจก', tex: 'wraith', statAlloc: { int: 4, agi: 3, wis: 2, luk: 1 }, hp: 300, dmg: 46, matk: 50, xp: 10, ai: 'dasher', moveSpeed: 500, radius: 14, zeny: [6, 9], idleMs: [500, 900], magic: true, flee: 36, hit: 40, reflect: 0.1 }, // v49: 0.25 -> 0.1 (Q: reflect shields too annoying)
  // Q 2026-11-04 คาร์วอส Summon Maiden: HP / M.ATK copied from the drainer when she is called; no DEF / M.DEF, hero hits land only 50% of the time
  maiden: { name: 'เมเดน', title: 'ผีสาวพันธนาการ', tex: 'wraith', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1000, dmg: 30, matk: 40, xp: 0, ai: 'dasher', moveSpeed: 400, radius: 16, zeny: [0, 0], idleMs: [500, 900], magic: true, def: 0, hit: 40, fixedFlee: 0.5,
    skills: [{ kind: 'bolt', every: 1, pow: 1, name: '👻 คำสาปเมเดน', fx: { burn: 1 } }] },
  shard: { name: 'เศษกระจก', tex: 'shard', statAlloc: { int: 3, agi: 3, luk: 2, wis: 2 }, hp: 220, dmg: 30, matk: 34, xp: 3, ai: 'dasher', moveSpeed: 500, radius: 11, zeny: [1, 2], idleMs: [400, 800], magic: true, flee: 30, hit: 40, deathBlast: 1.8 },
  mirage: { name: 'มิราจ', title: 'ภูตกระจกพันหน้า', tex: 'mirage', statAlloc: { int: 4, wis: 3, agi: 2, luk: 1 }, hp: 2600, dmg: 52, matk: 56, xp: 16, ai: 'boss', mini: 'mirage', moveSpeed: 300, radius: 32, zeny: [60, 80], idleMs: [600, 900], magic: true, slamMagic: true, def: 20, flee: 34, hit: 44,
    absorb: 0.3, onHit: { weaken: 2 }, chargeEvery: 4, slamMul: 1.2, slamName: 'โซลสไตรค์กระจก! ยิงดาเมจที่เก็บไว้คืน', slamFx: { weaken: 3, silence: 1 }, slamAnim: 'cast', slamColor: 0xc9a8ff, charge: true,
    phases: [{ at: 0.5, name: 'แตกร่าง! เศษกระจกระเบิดได้ + เก็บดาเมจมากขึ้น', summon: ['shard', 2], absorb: 0.4 }] },
  warlord: { name: 'บารัค', title: 'ขุนศึกคลั่งโลหิต', tex: 'warlord', statAlloc: { str: 5, vit: 3, agi: 1, dex: 1 }, hp: 2700, dmg: 50, xp: 16, ai: 'boss', mini: 'warlord', moveSpeed: 300, radius: 36, zeny: [60, 80], idleMs: [600, 900], def: 60, flee: 15, hit: 44, lifesteal: 0.2,
    onHit: { armorBreak: 2 }, chargeEvery: 4, slamMul: 2, slamName: 'ขวานผ่าภูผา! ฟันทะลุเกราะ', slamAnim: 'cleave', slamColor: 0xff5a4e, charge: true,
    skills: [{ kind: 'warcry', every: 3, pow: 0.25, turns: 99, self: true, name: 'คลั่งเลือด (สะสม)' }],
    phases: [{ at: 0.3, name: 'โกรธจัด! เร็วขึ้นมาก', speed: 1.5, dmg: 1.1 }] },
  lich: { name: 'โมรเดคัส', title: 'จอมลิชนิรันดร์', tex: 'lich', statAlloc: { int: 5, wis: 3, vit: 2 }, hp: 6000, dmg: 62, matk: 66, xp: 0, ai: 'boss', moveSpeed: 240, radius: 44, zeny: [150, 200], idleMs: [700, 1000], magic: true, slamMagic: true, def: 50, flee: 18, hit: 44,
    onHit: { burn: 2 }, slamName: 'ดวงดาวมรณะ! ทุกอย่างมอดไหม้', slamMul: 1.7, slamFx: { burn: 3, weaken: 2 }, slamAnim: 'cast', slamColor: 0xff5a2a, charge: true,
    skills: [ // v49: every Mage element + legendary spells (first match wins: legendary every 6, curse every 4, element every 2)
      { kind: 'bolt', every: 6, name: 'เวทตำนาน', pick: [
        { kind: 'bolt', every: 1, big: true, hits: 4, pow: 0.55, name: '☄️ อุกกาบาตล้างโลก', fx: { burn: 1 } },
        { kind: 'bolt', every: 1, big: true, hits: 3, pow: 0.6, name: '🌨️ พายุหิมะนิรันดร์', fx: { freeze: 35 } },
        { kind: 'bolt', every: 1, big: true, hits: 5, pow: 0.42, name: '🌩️ เพลิงสายฟ้าพิโรธสวรรค์', fx: { silence: 1 } },
      ] },
      { kind: 'curse', every: 4, name: 'คำสาปจอมลิช', fx: { weaken: 3, armorBreak: 3 } },
      { kind: 'bolt', every: 2, name: 'เวทธาตุ', pick: [
        { kind: 'bolt', every: 1, pow: 1.2, name: '🔥 ลูกไฟอเวจี', fx: { burn: 1 } },
        { kind: 'bolt', every: 1, pow: 1.1, name: '❄️ หอกน้ำแข็งมรณะ', fx: { freeze: 30 } },
        { kind: 'bolt', every: 1, hits: 3, pow: 0.42, name: '⚡ สายฟ้าโซ่ตรวน' },
      ] },
    ],
    phases: [
      { at: 0.7, name: 'โล่กระดูก! สะท้อนดาเมจเบาๆ + ปีศาจระเบิด', shield: 0.1, reflect: 0.06, summon: ['imp', 2] }, // v49: reflect 0.2 -> 0.06
      { at: 0.35, name: 'พิธีกรรมสุดท้าย! เร็วขึ้น ชาร์จถี่', heal: 0.08, speed: 1.3, dmg: 1.15, chargeEvery: 2, cleanse: true, slamFx: { burn: 3, weaken: 2, silence: 2 }, summon: ['hellknight', 1] },
    ] },
  // ----- event monsters (data/events.ts eventMon scales hp / dmg / def by dungeon tier) -----
  mimic: { name: 'มิมิค', tex: 'mimic', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 60, dmg: 10, xp: 2, ai: 'hopper', moveSpeed: 260, radius: 16, zeny: [0, 0], idleMs: [600, 1000], hit: 28 },
  mimicking: { name: 'ราชามิมิค', title: 'หีบทองกินคน', tex: 'mimicking', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 360, dmg: 11, xp: 6, ai: 'boss', moveSpeed: 240, radius: 38, zeny: [0, 0], idleMs: [700, 1000], hit: 32,
    charge: true, chargeEvery: 3, slamName: 'งับทั้งตัว!', slamAnim: 'bite', slamColor: 0xf2b84b, slamMul: 1.5 },
  goldjellop: { name: 'เจลล็อปทองคำ', tex: 'goldjellop', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 100, dmg: 0, xp: 4, ai: 'hopper', moveSpeed: 320, radius: 15, zeny: [0, 0], idleMs: [300, 600], flee: 20, passive: true },
  // ----- Support monsters (Q 2026-11-04): heal / shield their friends, weak alone -----
  dewsprite: { name: 'ภูตน้ำค้าง', tex: 'dewsprite', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 70, dmg: 12, matk: 16, xp: 4, ai: 'dasher', moveSpeed: 420, radius: 12, zeny: [2, 3], idleMs: [500, 900], magic: true, flee: 26, hit: 26,
    skills: [{ kind: 'heal', every: 2, pow: 0.2, name: 'หยดน้ำค้างฟื้นพลัง' }, { kind: 'shield', every: 5, pow: 0.08, name: 'ม่านหมอก' }] },
  bonepriest: { name: 'นักบวชกระดูก', tex: 'bonepriest', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 180, dmg: 24, matk: 34, xp: 7, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [4, 6], idleMs: [700, 1200], magic: true, def: 20, hit: 32,
    skills: [{ kind: 'shield', every: 3, pow: 0.12, name: 'โล่กระดูก' }, { kind: 'heal', every: 4, pow: 0.15, name: 'มนต์ประสานกระดูก' }] },
  alpha: { name: 'จ่าฝูงเงา', tex: 'alpha', statAlloc: { str: 3, agi: 3, vit: 2, dex: 2 }, hp: 1600, dmg: 30, xp: 0, ai: 'boss', moveSpeed: 260, radius: 40, zeny: [35, 45], idleMs: [700, 1000], def: 25, flee: 12, hit: 30, summon: 'shadowwolf', slamName: 'หอนเรียกพลัง! กระโจนตาหน้า', slamAnim: 'pounce', slamColor: 0x8a7ab8, charge: true,
    phases: [{ at: 0.4, name: 'หอนคลั่ง! เร็วขึ้น กัดแล้วอ่อนแรง', speed: 1.25, onHit: { weaken: 1 } }] },
  // ----- Dungeon 6: สุสานทรายกษัตริย์ (Lv 40-50). Stat monsters: hp / dmg / matk come from statAlloc at the room's Lv (data/mon-stats.ts);
  // def / hit / flee / crit / combo / counter written here are bonuses on top of the stat numbers -----
  mummy: { name: 'มัมมี่ทหารเฝ้าสุสาน', tex: 'mummy', statAlloc: { str: 4, vit: 3, dex: 2, agi: 1 }, hp: 1, dmg: 1, xp: 14, ai: 'hopper', moveSpeed: 200, radius: 17, zeny: [10, 14], idleMs: [700, 1200],
    bodyMul: { hp: 1.2 }, def: 10, onHit: { weaken: 1 }, counter: 0.1, skills: [{ kind: 'warcry', every: 4, pow: 0.25, turns: 3, name: 'คำสาปฟาโรห์ปลุกใจ' }] },
  jackal: { name: 'หมาไนทะเลทราย', tex: 'jackal', statAlloc: { agi: 4, dex: 3, luk: 2, str: 1 }, hp: 1, dmg: 1, xp: 11, ai: 'dasher', moveSpeed: 560, radius: 14, zeny: [8, 11], idleMs: [500, 900],
    bodyMul: { hp: 1.3, dmg: 1.4 }, combo: 0.1 },
  sandscorp: { name: 'แมงป่องเพลิงทราย', tex: 'sandscorp', statAlloc: { agi: 3, luk: 3, str: 3, dex: 1 }, hp: 1, dmg: 1, xp: 13, ai: 'dasher', moveSpeed: 480, radius: 15, zeny: [9, 13], idleMs: [500, 900],
    bodyMul: { hp: 1.3 }, def: 15, onHit: { poison: 2 }, crit: 0.05 },
  dunewraith: { name: 'วิญญาณพายุทราย', tex: 'dunewraith', statAlloc: { int: 5, wis: 3, dex: 1, vit: 1 }, hp: 1, dmg: 1, xp: 13, ai: 'dasher', moveSpeed: 500, radius: 14, zeny: [9, 13], idleMs: [500, 900], magic: true,
    flee: 15, skills: [{ kind: 'bolt', every: 3, pow: 1.3, name: 'พายุทรายบาดตา', fx: { silence: 1 } }] },
  scarab: { name: 'ด้วงสคารับทองแดง', tex: 'scarab', statAlloc: { vit: 5, wis: 3, str: 2 }, hp: 1, dmg: 1, xp: 14, ai: 'hopper', moveSpeed: 170, radius: 17, zeny: [10, 14], idleMs: [900, 1400],
    bodyMul: { dmg: 1.2 }, def: 50, counter: 0.15, skills: [{ kind: 'shield', every: 4, pow: 0.12, name: 'กระดองทองแดง', scale: { stat: 'vit' } }] },
  sunpriest: { name: 'นักบวชสุริยะดับ', tex: 'sunpriest', statAlloc: { wis: 4, int: 3, vit: 3 }, hp: 1, dmg: 1, xp: 13, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [9, 13], idleMs: [700, 1200], magic: true,
    skills: [{ kind: 'heal', every: 2, pow: 0.15, name: 'แสงสุริยะดับฟื้นกาย' }, { kind: 'shield', every: 3, pow: 0.1, name: 'ม่านทรายทอง' }] },
  sphinx: { name: 'เนฟธีส', title: 'สฟิงซ์ผู้ถามปริศนา', tex: 'sphinx', statAlloc: { int: 4, wis: 3, vit: 2, dex: 1 }, hp: 1, dmg: 1, xp: 22, ai: 'boss', mini: 'sphinx', moveSpeed: 260, radius: 38, zeny: [90, 120], idleMs: [600, 900],
    magic: true, slamMagic: true, def: 20, crit: 0.1, chargeEvery: 4, slamMul: 1.5, slamName: 'ปริศนามรณะ! ตอบไม่ทัน = ใบ้', slamFx: { silence: 2, weaken: 2 }, slamAnim: 'cast', slamColor: 0xf2d27a, charge: true,
    skills: [{ kind: 'bolt', every: 3, hits: 3, pow: 0.5, name: '🔺 ลำแสงพีระมิด' }, { kind: 'curse', every: 5, name: 'คำสาปปริศนา', fx: { armorBreak: 2 } }],
    phases: [{ at: 0.5, name: 'ดวงตาสุริยะเปิด! เวทแรงขึ้น', dmg: 1.15, shield: 0.12, cleanse: true }] },
  jackallord: { name: 'คาห์รัน', title: 'จ้าวหมาไนสองดาบ', tex: 'jackallord', statAlloc: { agi: 4, str: 3, luk: 2, dex: 1 }, hp: 1, dmg: 1, xp: 22, ai: 'boss', mini: 'jackallord', moveSpeed: 320, radius: 34, zeny: [90, 120], idleMs: [600, 900],
    bodyMul: { hp: 0.9 }, def: 15, combo: 0.05, trueSight: { after: 2, turns: 3 }, chargeEvery: 4, slamMul: 1.8, slamName: 'ระบำสองดาบ! ฟันรัวไม่ยั้ง', slamAnim: 'pounce', slamColor: 0xffb35a, charge: true,
    skills: [{ kind: 'strike', every: 3, hits: 3, pow: 0.5, name: '🗡️ สามคมจันทร์เสี้ยว', fx: { armorBreak: 1 } }],
    phases: [{ at: 0.5, name: 'หอนเรียกฝูง! หมาไนมาช่วย', summon: ['jackal', 2], speed: 1.15 }] },
  pharaoh: { name: 'เนเฟรู', title: 'ราชันย์ทรายนิรันดร์', tex: 'pharaoh', statAlloc: { str: 3, int: 3, vit: 3, wis: 2, dex: 1 }, hp: 1, dmg: 1, xp: 0, ai: 'boss', moveSpeed: 240, radius: 46, zeny: [220, 300], idleMs: [700, 1000],
    def: 25, crit: 0.1, lifesteal: 0.1, summon: 'mummy', slamName: 'คำพิพากษาสุริยะ! ทรายทองถล่ม', slamMul: 1.7, slamMagic: true, slamFx: { burn: 2, armorBreak: 2 }, slamAnim: 'stomp', slamColor: 0xf2b84b, charge: true,
    skills: [{ kind: 'bolt', every: 3, pow: 1.2, name: '☀️ เปลวสุริยะ', fx: { burn: 1 } }, { kind: 'curse', every: 5, name: 'คำสาปสุสาน', fx: { weaken: 3, poison: 2 } }, { kind: 'revive', every: 4, pow: 0.5, name: 'ปลุกองครักษ์' }],
    phases: [{ at: 0.6, name: 'ตื่นจากโลง! โล่ทรายทอง + มัมมี่องครักษ์', shield: 0.12, summon: ['mummy', 2] },
      { at: 0.3, name: 'สุริยคราส! เร็วขึ้น ชาร์จถี่', speed: 1.25, dmg: 1.15, chargeEvery: 2, cleanse: true, slamFx: { burn: 3, armorBreak: 3, silence: 1 } }] },
  // ----- D7-D10 (v78): one pack per dungeon, data/dungeons/dN.ts -----
  ...Object.assign({}, ...PACKS.map((p) => p.monsters)) as Record<D7Kind | D8Kind | D9Kind | D10Kind, MonsterDef>,
}

export interface RoomDef {
  title: string
  spawn: [MonsterKind, number][]
  boss?: boolean
  turnLimit?: number // hero turns before the fight is lost (default BATTLE.turnLimit)
  lv?: number // level dungeon (D6+): monster level in this room (default: spread over DungeonDef.level)
  mini?: boolean // 1v1 duel: spawn is ignored, one mini boss is drawn from MINI_POOL (data/relics.ts)
  miniPool?: MonsterKind[] // this duel draws from these instead of MINI_POOL (Dungeon 4-5)
}

export interface DungeonDef {
  id: string
  name: string
  boss: string
  tier: number // event rewards scale with this
  sky: [number, number] // gradient top, bottom
  hills: number // tint on the far hills / trees
  unlock: 'none' | 'job' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8' | 'd9' | 'd10' // 'job' = after the first job change, 'dN' = after clearing dungeon N
  rooms: RoomDef[]
  level?: [number, number] // D6+: fixed monster level band; its stat monsters use data/mon-stats.ts (no Hero Power scaling)
}

export const DUNGEONS: DungeonDef[] = [{
  id: 'd1', name: 'ทุ่งเจลล็อป', boss: 'ราชาเจลล็อป', tier: 1, sky: [0x2c3a6e, 0xe9a46a], hills: 0xffffff, unlock: 'none',
  rooms: [
    { title: 'ห้อง 1 · ทุ่งหญ้า', spawn: [['jellop', 4]] },
    { title: 'ห้อง 2 · ทางเดินป่า', spawn: [['jellop', 3], ['wolf', 1]] },
    { title: 'ห้อง 3 · ฝูงหมาป่า', spawn: [['jellop', 3], ['wolf', 2]] },
    { title: 'ห้องบอส · ราชาเจลล็อป', spawn: [['king', 1]], boss: true, turnLimit: 34 }, // boss buff v1: limits grow with boss HP
  ],
}, {
  id: 'd2', name: 'ป่าหมาป่าเงา', boss: 'จ่าฝูงเงา', tier: 2, sky: [0x141a3a, 0x6a4a8a], hills: 0x8a7ab8, unlock: 'job',
  rooms: [
    { title: 'เวฟ 1 · ปากถ้ำค้างคาว', spawn: [['bat', 3], ['shroom', 1]] },
    { title: 'เวฟ 2 · ดงเห็ดสปอร์', spawn: [['shroom', 2], ['bat', 1], ['dewsprite', 1]] },
    { title: 'เวฟ 3 · ทางหมูป่า', spawn: [['boar', 1], ['shadowwolf', 1], ['bat', 1]] },
    { title: 'เวฟ 4 · ฝูงหมาป่าเงา', spawn: [['shadowwolf', 2], ['shroom', 1], ['dewsprite', 1]] },
    { title: 'เวฟ 5 · หน้าถ้ำจ่าฝูง', spawn: [['boar', 2], ['shadowwolf', 1], ['shroom', 1]] },
    { title: 'ห้องบอส · จ่าฝูงเงา', spawn: [['alpha', 1]], boss: true, turnLimit: 36 },
  ],
}, {
  id: 'd3', name: 'ซากป้อมวีรชน', boss: 'อัศวินมรณะ', tier: 3, sky: [0x1a0f22, 0x8a3a3a], hills: 0xb07a7a, unlock: 'd2',
  rooms: [
    { title: 'เวฟ 1 · ประตูป้อม', spawn: [['skeleton', 2], ['wisp', 1]] },
    { title: 'เวฟ 2 · ลานหิน', spawn: [['gargoyle', 1], ['skeleton', 1], ['wisp', 1], ['bonepriest', 1]] },
    { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, turnLimit: 40 },
    { title: 'เวฟ 3 · ระเบียงผี', spawn: [['wisp', 3], ['skeleton', 1]] },
    { title: 'เวฟ 4 · หน้าบัลลังก์', spawn: [['gargoyle', 2], ['skeleton', 1], ['bonepriest', 1]] },
    { title: 'ห้องบอส · อัศวินมรณะ', spawn: [['deathknight', 1]], boss: true, turnLimit: 46 },
  ],
}, {
  id: 'd4', name: 'บึงพิษมรกต', boss: 'ไฮดรามรกต', tier: 4, sky: [0x0f2a22, 0x5a8a3a], hills: 0x6ab07a, unlock: 'd3',
  rooms: [
    { title: 'เวฟ 1 · ริมบึง', spawn: [['toad', 2], ['lizardshaman', 1]] },
    { title: 'เวฟ 2 · รังต่อ', spawn: [['hornet', 2], ['turtleguard', 1]] },
    { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['venomqueen', 'frostgiant'], turnLimit: 45 },
    { title: 'เวฟ 3 · ดงคางคกระเบิด', spawn: [['bloater', 2], ['turtleguard', 1], ['hornet', 1]] },
    { title: 'เวฟ 4 · กำแพงกระดอง', spawn: [['turtleguard', 2], ['lizardshaman', 1], ['toad', 1]] },
    { title: 'ห้องบอส · ไฮดรามรกต', spawn: [['hydra', 1]], boss: true, turnLimit: 50 },
  ],
}, {
  id: 'd5', name: 'บัลลังก์อเวจี', boss: 'จอมลิชโมรเดคัส', tier: 5, sky: [0x0a0612, 0x6a1a3a], hills: 0x9a4a6a, unlock: 'd4',
  rooms: [
    { title: 'เวฟ 1 · ประตูนรก', spawn: [['hellknight', 1], ['imp', 1]] },
    { title: 'เวฟ 2 · โถงคำสาป', spawn: [['hexwitch', 1], ['necropriest', 1], ['imp', 1]] },
    { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['mirage', 'warlord'], turnLimit: 45 },
    { title: 'เวฟ 3 · ระเบียงกระจก', spawn: [['wraith', 2], ['imp', 1], ['hexwitch', 1]] },
    { title: 'เวฟ 4 · กองทัพศพ', spawn: [['hellknight', 2], ['necropriest', 1], ['imp', 1]] },
    { title: 'ห้องบอส · จอมลิชโมรเดคัส', spawn: [['lich', 1]], boss: true, turnLimit: 56 },
  ],
}, {
  // D6+ (Q 2026-11-04): fixed level band, monsters with 7 base stats (data/mon-stats.ts), no Hero Power scaling
  id: 'd6', name: 'สุสานทรายกษัตริย์', boss: 'ราชันย์ทรายเนเฟรู', tier: 6, sky: [0x3a2410, 0xe8b060], hills: 0xd8a860, unlock: 'd5', level: [40, 50],
  rooms: [
    { title: 'เวฟ 1 · ประตูสุสาน', spawn: [['mummy', 2], ['jackal', 1]], lv: 40 },
    { title: 'เวฟ 2 · ทางเดินอักษรภาพ', spawn: [['sandscorp', 2], ['dunewraith', 1], ['sunpriest', 1]], lv: 42 },
    { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, miniPool: ['sphinx', 'jackallord'], turnLimit: 45, lv: 46 },
    { title: 'เวฟ 3 · ห้องเก็บสมบัติ', spawn: [['scarab', 1], ['jackal', 2], ['dunewraith', 1]], lv: 45 },
    { title: 'เวฟ 4 · หน้าห้องบรรทม', spawn: [['mummy', 1], ['scarab', 1], ['sunpriest', 1]], lv: 48 },
    { title: 'ห้องบอส · ราชันย์ทรายเนเฟรู', spawn: [['pharaoh', 1]], boss: true, turnLimit: 50, lv: 50 },
  ],
},
// D7-D10 (v78): each pack adds its dungeon once it is built (data/dungeons/dN.ts)
...PACKS.flatMap((p) => (p.dungeon ? [p.dungeon] : [])),
]
/** Old single-dungeon name (DungeonScene, the unused real-time prototype, still reads it). */
export const DUNGEON = DUNGEONS[0]

export const COLORS = {
  night: 0x14172b,
  gold: 0xf2b84b,
  hp: 0xe5484d,
  hpBack: 0x3a1a24,
  cream: 0xf6eedc,
  telegraph: 0xff5a4e,
}

export const FONT_UI = '"Mali", "Leelawadee UI", "Noto Sans Thai", sans-serif'
export const FONT_NUM = '"Pixelify Sans", "Mali", monospace'

/** Stat spec v1: hit chance = clamp(0.80 + (Hit - Flee) * 1%, 80%, 98%), both sides. */
/** Thief Double Strike: Lv 1 20% ... Lv 5 60% (Q: Lv 5 = RO Lv 10). */
export const doubleAtkChance = (lv: number) => (lv <= 0 ? 0 : 0.1 + 0.1 * Math.min(5, lv))
export const hitChance = (hit: number, flee: number, floor = 0.8) => Math.min(0.98, Math.max(floor, 0.8 + (hit - flee) * 0.01))
/** Stat spec v1: damage after DEF = dmg * 100 / (100 + DEF). Never subtract flat. */
export const afterDef = (dmg: number, def: number) => dmg * 100 / (100 + Math.max(0, def))

// ===== Turn-based side-scroll battle (BattleScene) =====
// Turn order: everyone fills a gauge by `speed` per tick; at 100 they act. Faster = more turns.
/** Hero combo, Capybara Go style (Q 2026-11-04 18:24 "เต็มสูตร + Combo DR"):
 * - each basic attack chains baseCount + st.comboCount extra hits; each needs a roll at (combo rate - target's Ignore Combo), stop on a miss
 * - combo rate has no 50% cap any more: it may pass 100% (rateCap) so it still lands vs high Ignore Combo
 * - hit damage: x max(dmgFloor, 1 + basicDmg (+ comboDmg on combo hits) - basicDR (- comboDR on combo hits))
 * Monster defence by tier (+hardAdd in hard mode / tower). Monster combos on the hero keep BATTLE.comboMax. */
export const COMBO = {
  baseCount: 1,
  rateCap: 1.5,
  dmgFloor: 0.2,
  ignore: { normal: 0, mini: 0.15, boss: 0.25 },
  basicDR: { normal: 0, mini: 0.05, boss: 0.1 },
  comboDR: { normal: 0, mini: 0.1, boss: 0.15 },
  hardAdd: 0.1, // Ignore Combo / Counter and Combo / Counter DR extra in hard mode / tower
  // Counter, same model (Q 2026-11-04 18:26): rate may pass 100% vs Ignore Counter; dmg x max(dmgFloor, 1 + basicDmg + counterDmg - basicDR - counterDR)
  ignoreCounter: { normal: 0, mini: 0.15, boss: 0.25 },
  counterDR: { normal: 0, mini: 0.1, boss: 0.15 },
  // hero side: stat x/(x+defK) (AGI Ignore Combo, DEX Ignore Counter, VIT Combo+Counter DR, LUK Crit DR) + gear; caps
  defK: 400, defCap: 0.3, critDRCap: 0.5,
}
/** Expected extra hits per basic attack for a combo rate and chain length (rolls stop on the first miss). */
export const comboExtra = (rate: number, count: number) => { const p = Math.max(0, Math.min(1, rate)); let e = 0, q = 1; for (let i = 0; i < count; i++) { q *= p; e += q } return e }

export const BATTLE = {
  turnLimit: 20, // Q 2026-11-03: hero turns per wave fight; run out = the run is lost (stops pure-tank stalling)
  bossTurnLimit: 30, // boss fights (bot: damage builds 10-23 turns, pure tanks 36-43)
  heroSpeed: 10, // at base attack speed (PLAYER.aspd); AGI / speed perks scale it with aspd
  monSpeed: { jellop: 8, minijellop: 9, wolf: 13, king: 8, bat: 16, shroom: 7, boar: 9, shadowwolf: 14, alpha: 11,
    skeleton: 10, wisp: 14, gargoyle: 7, duelist: 15, hunter: 13, gunner: 14, drainer: 10, deathknight: 11,
    toad: 10, lizardshaman: 9, hornet: 17, turtleguard: 7, bloater: 8, spiderling: 15, venomqueen: 14, frostgiant: 9, hydra: 11,
    hellknight: 10, hexwitch: 11, imp: 17, necropriest: 9, wraith: 15, maiden: 11, shard: 14, mirage: 14, warlord: 12, lich: 11, dewsprite: 13, bonepriest: 9, mimic: 11, mimicking: 10, goldjellop: 12,
    mummy: 10, jackal: 14, sandscorp: 13, dunewraith: 13, scarab: 8, sunpriest: 10, sphinx: 12, jackallord: 14, pharaoh: 11 /* D6: fallback only, stat monsters use def.speed (AGI) */,
    ...Object.assign({}, ...PACKS.map((p) => p.monSpeed)) /* D7-D10 packs (v78) */ } as Record<MonsterKind, number>,
  monDmgMul: 0.55, // monster hit = def.dmg * this
  // v56 (Q: "มอนกากไป"): every spawned monster's HP / ATK / M.ATK and every turn limit, by dungeon tier 1..5
  monBuff: { hp: [1.05, 1.1, 1.18, 1.45, 1.45], dmg: [1.05, 1.1, 1.18, 1.36, 1.4], turns: [1, 1.04, 1.08, 1.16, 1.2] },
  cleave: 0.5, // hero's swing also hits the 2nd monster for this share
  regenPerTurn: 1.5, // regen stat (%/s in real-time) -> % of max HP per hero turn
  resPerTurn: 1, // resRegen multiplier per hero turn
  slamEvery: 3, // boss charges every Nth turn, slams on the next
  slamStun: 45, // gauge the hero loses when slammed (tenacity reduces it)
  stepMs: 520, // one action's animation at x1
  msPerTurn: 1500, // smashCd (ms) -> hero turns of cooldown
  comboMax: 2, // monsters: extra basic attacks a combo can chain (heroes use COMBO below)
  counterMul: 0.8, // a counter hit = basic attack x this
  reviveHp: 0.3, // Phoenix card: share of max HP the hero gets back
  // ----- Dungeon 3 mini bosses -----
  parryEvery: 5, // duelist Riposte (Q 2026-11-04): stance every Nth turn, immortal until her next turn
  parryMul: 1.4, // (legacy) riposte damage x the duelist's normal hit
  // Q 2026-11-04 Celeste kit (Monster DB comment): vital-point passive, Riposte, Grandado Espada
  duel: {
    vitalEvery: 3, vitalPct: 0.08, vitalLvMul: 0.03, // every 3rd turn: true dmg = 8% hero max HP + ATK x lv x 0.03 (lv = dungeon recLv)
    healTurns: 3, // vital / espada damage dealt is healed back over 3 of her turns
    ripostePct: 0.8, riposteCap: 0.15, // Riposte: each blocked hit answered with 80% of it as true dmg, at most 15% hero max HP per stance in total, never lethal
    espadaEvery: 10, espadaHits: 4, espadaMin: 0.03, espadaMax: 0.1, // phase 2: mark turn (immortal), then 4 crit thrusts of 3-10% hero max HP (Q asked 4-16%: bot died to it)
  },
  frenzyAt: 0.5, frenzySpeed: 1.4, frenzyLifesteal: 0.6, // hunter below 50% HP
  toxicSkin: { dr: 0.05, poison: 1, tenacity: 0.5, critCut: 0.5 }, // venomqueen (Q 2026-11-04): -5% P/M damage taken, 1 poison on the hero per landed hit, debuffs on it wear off 2x as fast, crit bonus vs it halved
  web: { agi: 0.5 },
  frozenHeart: 0.5, // hero attack speed x this while slowed
  iceSkin: { turns: 2, dmgCut: 0.15 }, // frostgiant (Q 2026-11-04): hitting it = ❄️ หนามน้ำแข็ง, hero damage -15% for 2 hero turns (refreshes) // พ่นใยมัดตัว: hero AGI x this while webbed
  vengeance: { share: 0.5, turns: 3, cd: 3, dotPct: 0.03, dotMatk: 0.3 }, // death knight (Q 2026-11-04): 50% of a hit it lands -> shield for 3 of its turns (then 3-turn cooldown); while it holds, hero takes 3% max HP + M.ATK x 0.3 magic each of its turns
  maiden: { at: 0.5, turns: 22, tint: 0xff9ad0 }, // drainer: under 50% HP she turns immortal and calls the Maiden (same max HP / M.ATK); +22 turns to the limit (bot timed out at +12)
  bulletTime: { at: 0.25, countdown: 3, hits: 25, bonusMin: 0.01, bonusMax: 0.25 }, // gunner (Q 2026-11-04): under 25% HP, 3-turn countdown, then 25 shots of her normal shot x (1 + 1-25%)
  scentAt: 0.5, scentSpeed: 1.75, scentCombo: 0.5, // hunter กลิ่นเลือด (Q 2026-11-04): hero below 50% HP -> turn speed +75%, combo +50%
  demonAt: 0.5, demonRegen: 0.02, // drainer below 50% HP: regen share of max HP per turn
  // ----- Dungeon 4-5: debuffs on the hero (HitFx) -----
  poisonPct: 0.01, poisonCap: 8, // per stack per hero turn, share of max HP (Lv-15 bot: 1.2%/cap 10 killed Thief in wave 1-2)
  burnPct: 0.03, burnHealCut: 0.4,
  weakenMul: 0.75, armorBreakMul: 0.5,
  monCritMul: 1.6, monComboMul: 0.7, monCounterMul: 0.8, // v49 monster crit / combo / counter
  reflectCap: 0.04, // reflect / thorns: one reflected hit deals at most this share of hero max HP, and can't knock the hero out
  soulBolts: 5, soulCap: 0.4, // Mirage Soul Strike: stored damage fires as N magic bolts, total capped at this share of hero max HP
}

// ===== Hard mode (v47, Q 2026-11-04): replay a cleared dungeon, monsters scale with the hero's Base Lv =====
// Monsters are pulled up to the strength of "the dungeon made for your level", read off the normal dungeons' own boss curve
// (HARD.curve: Base Lv -> boss HP / damage), then x the hard base:
//   L = max(Base Lv, recLv) · HP x hp * curveHp(L)/curveHp(recLv) · ATK / M.ATK x atk * curveDmg(L)/curveDmg(recLv) · Hit + hitPerLv * (L - recLv)
// e.g. dungeon 1 at Lv 20: HP x1.3*7.0 = 9.1, ATK x1.3*3.9 = 5.0 (~ dungeon 5 boss numbers). Past Lv 20 the curve keeps
// growing by hpGrow / dmgGrow per level (capped at maxLv). Every monster (waves, minis, bosses, summons) scales.
// Rewards (zeny / account EXP) x reward * (HP ratio)^rewardPow, forge materials x mats (rounded up).
// In-run EXP / level-up picks are NOT scaled (more picks would make it easier).
export const HARD = {
  recLv: { d1: 5, d2: 10, d3: 12, d4: 15, d5: 20 } as Record<string, number>, // the Base Lv each dungeon is tuned for (bot profiles)
  curve: [[5, 860, 16], [10, 1600, 30], [12, 3200, 50], [15, 4800, 54], [20, 6000, 62]] as [number, number, number][], // [Lv, boss HP, boss dmg] of d1..d5
  hpGrow: 1.08, dmgGrow: 1.04, maxLv: 45, // past Lv 20
  hp: 1.3, atk: 1.3, // hard base on top of the curve (also the whole bonus at the recommended level)
  hitPerLv: 1,
  turnMul: 1.4, // more HP -> longer fights: turn limits grow too
  reward: 1.5, rewardPow: 0.7,
  mats: 1.5,
  tint: 0xff8a6a, // hard-mode monsters glow red
}
const hardCurve = (lv: number): [number, number] => {
  const c = HARD.curve, last = c[c.length - 1]
  lv = Math.min(HARD.maxLv, lv)
  if (lv >= last[0]) return [last[1] * HARD.hpGrow ** (lv - last[0]), last[2] * HARD.dmgGrow ** (lv - last[0])]
  if (lv <= c[0][0]) return [c[0][1], c[0][2]]
  const i = c.findIndex((p) => p[0] > lv), [l0, h0, d0] = c[i - 1], [l1, h1, d1] = c[i], t = (lv - l0) / (l1 - l0)
  return [h0 + (h1 - h0) * t, d0 + (d1 - d0) * t]
}
/** Levels the hero is above the dungeon's recommended Base Lv (0 = at or under it). */
export const hardGap = (dungeonId: string, baseLevel: number) => Math.max(0, baseLevel - (HARD.recLv[dungeonId] ?? 1))
export const hardMul = (dungeonId: string, gap: number) => {
  const rec = HARD.recLv[dungeonId] ?? 1, [h0, d0] = hardCurve(rec), [h1, d1] = hardCurve(rec + gap)
  return { hp: HARD.hp * h1 / h0, atk: HARD.atk * d1 / d0, reward: HARD.reward * (h1 / h0) ** HARD.rewardPow }
}

// Hard-mode boss affixes (Q 2026-11-04 "เพิ่มสกิล, passive ให้ m.boss, boss ให้หลากหลาย"): every mini boss and boss rolls
// 1 extra skill + 1 passive per run (final bosses of dungeon 3+ roll 2 passives), so each replay plays differently.
export const HARD_SKILLS: MonSkill[] = [
  { kind: 'bolt', every: 4, name: '🔥 ลูกไฟนรก', pow: 1.2 },
  { kind: 'curse', every: 4, name: '☠️ หมอกพิษ', fx: { poison: 3 } },
  { kind: 'curse', every: 5, name: '😰 คำสาปอ่อนแรง', fx: { weaken: 2 } },
  { kind: 'curse', every: 5, name: '💔 ทุบเกราะ', fx: { armorBreak: 2 } },
  { kind: 'curse', every: 5, name: '❄️ ลมเยือกแข็ง', fx: { freeze: 60 } },
  { kind: 'warcry', every: 5, name: '💢 คำรามเดือด', pow: 0.25, turns: 3, self: true },
  { kind: 'shield', every: 5, name: '🛡️ เกราะเวท', pow: 0.1, self: true },
  { kind: 'heal', every: 6, name: '💚 ฟื้นพลัง', pow: 0.08, self: true },
]
export interface HardPassive { id: string; name: string; lifesteal?: number; reflect?: number; speed?: number; onHit?: HitFx; enrage?: number; def?: number }
export const HARD_PASSIVES: HardPassive[] = [
  { id: 'leech', name: '🩸 ดูดเลือด', lifesteal: 0.15 },
  { id: 'thorns', name: '🌵 หนาม', reflect: 0.05 },
  { id: 'swift', name: '💨 ว่องไว', speed: 1.2 },
  { id: 'venom', name: '🐍 พิษติดตัว', onHit: { poison: 1 } },
  { id: 'enrage', name: '😡 คลั่ง', enrage: 1.35 }, // below 35% HP: x1.35 damage, x1.15 speed
  { id: 'iron', name: '🪨 ผิวเหล็ก', def: 25 },
]

// ===== v49 monster kits (Q 2026-11-04: "ให้แต่ละตัวมี stat combo, counter, cri, สกิลโหดๆ"): merged into MONSTERS below =====
// skills are appended after the monster's own (own skills keep priority on shared turns).
const KITS: Partial<Record<MonsterKind, Pick<MonsterDef, 'crit' | 'combo' | 'counter' | 'trueSight' | 'razor' | 'vengeance'> & { add?: MonSkill[] }>> = {
  wolf: { crit: 0.08 }, boar: { crit: 0.1 }, shadowwolf: { combo: 0.2, crit: 0.05 }, bat: { combo: 0.15 },
  skeleton: { counter: 0.1 }, gargoyle: { counter: 0.15 }, hornet: { combo: 0.3, trueSight: { after: 3, turns: 2 } }, turtleguard: { counter: 0.15 },
  hellknight: { counter: 0.15, crit: 0.1, trueSight: { after: 3, turns: 2 } }, wraith: { crit: 0.1 }, spiderling: { combo: 0.2 },
  // bosses / mini bosses: stats + a signature skill
  king: { crit: 0.06, add: [{ kind: 'strike', every: 5, pow: 1.6, name: '🟢 ทับแบน', fx: { freeze: 30 } }] },
  alpha: { combo: 0.25, crit: 0.1, trueSight: { after: 2, turns: 3 }, add: [{ kind: 'strike', every: 4, hits: 3, pow: 0.6, name: '🐺 กรงเล็บพายุ' }] },
  duelist: { counter: 0.15, crit: 0.12, trueSight: { after: 2, turns: 3 }, add: [{ kind: 'strike', every: 5, hits: 3, pow: 0.55, name: '🤺 แทงสามจังหวะ' }] },
  hunter: { crit: 0.15, combo: 0.15, trueSight: { after: 2, turns: 3 }, razor: 0.05, add: [{ kind: 'strike', every: 4, pow: 2.5, drain: 0.1, name: '🩸 ตะปบจุดตาย' }] }, // Q 2026-11-04 Monster DB comment
  gunner: { crit: 0.15, trueSight: { after: 2, turns: 3 }, add: [{ kind: 'strike', every: 4, hits: 4, pow: 0.4, name: '🔫 ระดมยิง', scale: { stat: 'dex' } }] },
  drainer: { crit: 0.1, add: [{ kind: 'bolt', every: 4, pow: 1.3, name: '🌑 ดูดวิญญาณ', fx: { weaken: 2 } }] },
  deathknight: { counter: 0.15, crit: 0.1, trueSight: { after: 2, turns: 3 }, vengeance: true, add: [{ kind: 'strike', every: 5, pow: 2.8, magic: true, alone: 2, name: '⚔️ ดาบมรณะ' }] }, // Q 2026-11-04: magic, x2 with no undead at its side
  venomqueen: { combo: 0.25, crit: 0.08, add: [{ kind: 'strike', every: 2, hits: 2, pow: 0.7, name: '🦂 เหล็กใน', fx: { poison: 4 } }] }, // Q: no ตาเหยี่ยว (the web does that job)
  frostgiant: { counter: 0.15, add: [{ kind: 'strike', every: 5, pow: 1.6, name: '🧊 ทุบธารน้ำแข็ง', fx: { freeze: 50 } }, { kind: 'curse', every: 4, name: '💙 Frozen Heart', fx: { slow: 2 } }] }, // Q: Frozen Heart replaces ตาเหยี่ยว
  hydra: { combo: 0.3, trueSight: { after: 2, turns: 3 }, add: [{ kind: 'bolt', every: 4, hits: 3, pow: 0.5, name: '🐍 พ่นพิษสามหัว', fx: { poison: 1 } }] },
  mirage: { crit: 0.15, add: [{ kind: 'bolt', every: 5, hits: 2, pow: 0.7, name: '🪞 ภาพลวงสองเงา' }] },
  warlord: { counter: 0.2, crit: 0.15, combo: 0.15, trueSight: { after: 2, turns: 3 }, add: [{ kind: 'strike', every: 5, hits: 2, pow: 0.9, name: '🪓 ขวานคู่ผ่าฟ้า', fx: { armorBreak: 1 } }] },
  lich: { crit: 0.15 },
}
for (const [k, kit] of Object.entries(KITS) as [MonsterKind, NonNullable<(typeof KITS)[MonsterKind]>][]) {
  const { add, ...stats } = kit
  Object.assign(MONSTERS[k], stats)
  if (add) MONSTERS[k].skills = [...(MONSTERS[k].skills ?? []), ...add]
}

// v81 (admin.html "ยืมจาก Hero tree"): every monster gets its OWN empty hit-effect / body objects, so a live-config patch can add
// e.g. onHit.poison to a monster that had none (a patch only writes into objects that exist). Empty = no effect: applyFx skips
// absent / 0 keys and bodyMul reads `?? 1`. So test "has an effect" with hasFx(), never with `if (d.onHit)`.
// venom / trueSight are NOT pre-made: their numbers are required, an empty one would break the monster.
export const hasFx = (fx: HitFx | undefined): boolean => !!fx && Object.values(fx).some((v) => !!v)
for (const d of Object.values(MONSTERS)) {
  d.onHit ??= {}
  d.bodyMul ??= {}
  if (d.ai === 'boss') d.slamFx ??= {}
}
