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
  legendChance: number // 0..1 a level-up card rolls legendary, x2 effect (LUK)
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
  combo: number // 0..1 chance a basic attack chains another one, up to BATTLE.comboMax extra (AGI)
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
  doubleAtk: number // Thief passive Double Strike level (0-10): chance of +1 hit (can crit), see doubleAtkChance()
  lightMax: number // (retired) old lightning roll top
  overload: number // Mana refunded per lightning hit that rolls >= 1x
  lightLuck: number // flag: every lightning hit rolls twice, keeps the higher
  burnCap: number // + max fire stacks
  autoBurn: number // fire stacks the Mage auto skill applies (fire runs)
  fireSpread: number // flag: a dying monster's fire stacks jump to the others
  chillPlus: number // + chill turns
  brittle: number // +damage share against chilled monsters
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
  autoLifesteal: number // + lifesteal on the auto skill only
  ultMulAdd: number // + ult damage multiplier (can be negative)
  ultAmp: number // run pick บดกระดูก: job ult damage x(1 + ultAmp) (Novice uses smashMul instead)
  ultShieldAdd: number // + ult shield share of max HP (can be negative)
  ultVsCharge: number // + damage share of the ult on a charging boss
  ultCounters: number // after the ult, this many landed hits are counters for sure
  counterRage: number // Rage (or Mana) per counter
  counterShield: number // shield (share of max HP) per counter
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
  debuffRes: number // 0..1 chance to shrug off a monster debuff (poison, burn, curse, armor break, silence, freeze) · Dungeon 4-5 gear
  // ----- Cleric tree + talents (data/trees/cleric.ts) -----
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
  bossShield: number // shield (share of max HP) at the start of a boss fight
  lateDmg: number // + damage share from fight turn 12 on (anti turn-limit)
  spearLuck: number // Cleric: chance per hero turn to call 1 light spear (from LUK, v37)
  s1Pow: number // skill web: ทักษะ 1 (auto) power share (replaces class skill levels)
  ultPow: number // skill web: Ult power share
  s2Lv: number // skill web: level of the picked Skill 2's "+" node (0..3)
  s2Star: number // skill web: 1 = the picked Skill 2's ★ node
  spellCrit: number // 0..1 crit chance for magic hits (Q 2026-11-03: magic crits only via talent/item/card), uses critMul
}

export const PLAYER: Stats = {
  maxHp: 140, atk: 13, minPct: 0.5, matk: 10, pskill: 0, def: 0, mdef: 0, tenacity: 0, healAmp: 0, shieldAmp: 0,
  hit: 10, flee: 5, luckyDodge: 0, legendChance: 0.03, eventChance: 0.1, dropChance: 0.04, maxRes: 60, resRegen: 3,
  aspd: 1.6, range: 110, crit: 0, critMul: 1.4, /* Q: crit only from items, skill tree, talents (+ in-run cards) */ speed: 190,
  guard: 0, lifesteal: 0, regen: 0, fireEvery: 0, boltMul: 2, burnDps: 0, poison: 0, poisonDmg: 2,
  smashMul: 3, smashCd: 6000, smashCost: 0, revive: 0, counter: 0, combo: 0, dodgeHeal: 0, waveShield: 0,
  thorns: 0, rageGain: 0, autoCostCut: 0, ctrAoe: 0, berserk: 0, pierce: 0, lockOn: 0, dodgeStrike: 0, doubleAtk: 0, lightMax: 0, overload: 0, lightLuck: 0, burnCap: 0, autoBurn: 0, fireSpread: 0, chillPlus: 0, brittle: 0, shatter: 0, reviveHp: 0, smiteTargets: 0, holyCounter: 0, overhealShield: 0, poisonCap: 0, poisonSpread: 0, fleeFloor: 0, waveDodge: 0, dodgeEnergy: 0, ultDodge: 0, ultHits: 0, ultPoison: 0, poisonAmp: 0, lightHits: 0, lightChain: 0, burnTick: 0, chillSlow: 0, iceBarrier: 0, boltHits: 0, boltCharge: 0, stormSet: 0, mgLightAmp: 0, mgFireAmp: 0, mgIceAmp: 0, mgFirstCard: 0, mgFireStack: 0, mgWaveBarrier: 0, resRegenCut: 0, mgUltAmp: 0, elemWheel: 0, mgBarrierCut: 0, barrierBoom: 0, mgEmergency: 0, mgDoubleCast: 0, mgUltCd: 0, mgUltMana: 0, mgOverflow: 0, cleaveAdd: 0, startRage: 0, rageOnHurtAdd: 0, autoLifesteal: 0, ultMulAdd: 0, ultAmp: 0, ultShieldAdd: 0, ultVsCharge: 0, ultCounters: 0, counterRage: 0, counterShield: 0, arDodgeShield: 0, arUltBreak: 0, arWaveDodge: 0, arSnipeLow: 0, arLowHpBonus: 0, arVolley: 0, arAim: 0, arAimCrit: 0, arUltSplash: 0, arUltDodge: 0, arUltMulCut: 0, arHawk: 0, arStartFull: 0, arTurnRes: 0, arCritRes: 0, arDodgeRes: 0, debuffRes: 0, healAt: 0, atone: 0, judge: 0, smiteMul: 0, smiteVamp: 0, healShield: 0, spearStart: 0, spearRate: 0, spearMul: 0, spearHeal: 0, ultRegen: 0, ultHoly: 0, ultChargeShield: 0, bossShield: 0, lateDmg: 0, spellCrit: 0, spearLuck: 0, s1Pow: 0, ultPow: 0, s2Lv: 0, s2Star: 0, // Novice: cooldown only (resources come with job change)
}

export const RULES = {
  arcDeg: 130, // swing cone
  hurtIframesMs: 800,
  healOnClear: 0.2, // share of max HP back after each room
  healOnLevel: 0.2,
  xpOnClear: 6,
  smashRadius: 140,
  xpNeed: (level: number) => 4 + 3 * level, // xp to go from `level` to `level + 1`
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
  { id: 'bld1', tag: 'blood', name: 'ดูดเลือด', desc: 'ฟื้น HP 12% ของดาเมจที่ทำได้', mod: { lifesteal: 0.12 } },
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
  blood: { desc: 'เซ็ตเลือด: ดูดเลือด +10% และ ATK +5', mod: { lifesteal: 0.1, atk: 5 } },
  storm: { desc: 'เซ็ตพายุ: สายฟ้าลงเป้าเดิมซ้ำในเทิร์นเดียว แรงขึ้น +10% ต่อครั้ง', mod: { stormSet: 1 } },
  fire: { desc: 'เซ็ตไฟ: ลูกไฟทุกการตีครั้งที่ 2', mod: { fireEvery: -1 } },
  venom: { desc: 'เซ็ตพิษ: พิษ +2 stack ต่อ hit', mod: { poison: 2 } },
}

export type MonsterKind = 'jellop' | 'wolf' | 'king' | 'minijellop' | 'bat' | 'shroom' | 'boar' | 'shadowwolf' | 'alpha'
  | 'skeleton' | 'wisp' | 'gargoyle' | 'duelist' | 'hunter' | 'gunner' | 'drainer' | 'deathknight'
  | 'toad' | 'lizardshaman' | 'hornet' | 'turtleguard' | 'bloater' | 'spiderling' | 'venomqueen' | 'frostgiant' | 'hydra'
  | 'hellknight' | 'hexwitch' | 'imp' | 'necropriest' | 'wraith' | 'shard' | 'mirage' | 'warlord' | 'lich'
export type MiniKind = 'duelist' | 'hunter' | 'gunner' | 'drainer' | 'venomqueen' | 'frostgiant' | 'mirage' | 'warlord'

// ----- Dungeon 4-5 (design/dungeon-4-5-brutal.md): data-driven monster skills, debuffs on the hero, boss phases -----
/** What a landed monster hit (or a skill / charged attack) puts on the hero. Turns count hero turns. */
export interface HitFx {
  poison?: number // + poison stacks: each hero turn lose 1.2% max HP per stack, then 1 stack fades (cap 10)
  burn?: number // burn for N hero turns: lose 3% max HP per turn, healing on the hero -40%
  weaken?: number // curse for N hero turns: hero damage -25%
  armorBreak?: number // N hero turns: P.DEF and M.DEF count half
  silence?: number // N hero turns: the ultimate / Smash can't be cast (it stays queued)
  freeze?: number // hero turn gauge lost (tenacity reduces it); 100 = skip a whole turn
}
export type MonSkillKind = 'heal' | 'shield' | 'warcry' | 'curse' | 'summon' | 'revive' | 'haste'
/** A monster turn spent on a skill instead of an attack: used on every `every`-th turn of that monster when it makes sense. */
export interface MonSkill {
  kind: MonSkillKind
  every: number
  name: string
  pow?: number // heal / shield: share of the target's max HP · warcry: + damage share · haste: gauge added
  turns?: number // warcry: monster turns it lasts
  fx?: HitFx // curse: what lands on the hero (can't miss, debuffRes can resist)
  summon?: [MonsterKind, number] // summon: kind, how many (free slots only)
  self?: boolean // heal / shield: only on itself
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
  cleanse?: boolean // drops its burns / poison / chill on entering
}

export interface MonsterDef {
  name: string
  tex: string
  hp: number
  dmg: number // contact damage
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
  shots?: number // each attack is this many small hits, each rolls hit/flee on its own
  // ----- Dungeon 4-5 -----
  onHit?: HitFx // every landed hit also puts this on the hero
  slamFx?: HitFx // boss: the charged attack also puts this on the hero
  skills?: MonSkill[]
  reflect?: number // reflects this share of every direct hit (strike / Smash) back as magic damage
  absorb?: number // stores this share of every direct hit; the charged attack fires it back as Soul Strike bolts (Q 2026-11-03, Mirage)
  deathBlast?: number // explodes on death: (dmg) x monDmgMul x this as magic (Flee / lucky dodge / shield all work)
  phases?: BossPhase[]
}

export const MONSTERS: Record<MonsterKind, MonsterDef> = {
  jellop: { name: 'เจลล็อป', tex: 'jellop', hp: 34, dmg: 7, xp: 3, ai: 'hopper', moveSpeed: 250, radius: 15, zeny: [1, 2], idleMs: [500, 1100] },
  minijellop: { name: 'เจลล็อปจิ๋ว', tex: 'jellop', hp: 18, dmg: 4, xp: 1, ai: 'hopper', moveSpeed: 300, radius: 11, zeny: [0, 1], idleMs: [350, 800] },
  wolf: { name: 'หมาป่าสีเทา', tex: 'wolf', hp: 55, dmg: 11, xp: 5, ai: 'dasher', moveSpeed: 560, radius: 16, zeny: [2, 3], idleMs: [700, 1300], flee: 18, hit: 20 },
  king: { name: 'ราชาเจลล็อป', tex: 'king', hp: 860, dmg: 16, xp: 0, ai: 'boss', moveSpeed: 230, radius: 38, zeny: [15, 20], idleMs: [700, 1000], summon: 'minijellop', slamName: 'ชาร์จพลัง! ทุบตอนนี้เลย', slamMagic: true, slamAnim: 'stomp', slamColor: 0x9fe3ff, charge: true,
    phases: [{ at: 0.5, name: 'ร่างเยลลี่ยักษ์! เกราะวุ้น', shield: 0.1 }] }, // boss buff v1
  // ----- Dungeon 2: ป่าหมาป่าเงา. Each monster tests one stat (see design/dungeon-2-and-events.md) -----
  bat: { name: 'ค้างคาวถ้ำ', tex: 'bat', hp: 42, dmg: 15, xp: 4, ai: 'dasher', moveSpeed: 500, radius: 12, zeny: [2, 3], idleMs: [500, 900], flee: 30, hit: 26 },
  shroom: { name: 'เห็ดสปอร์', tex: 'shroom', hp: 80, dmg: 21, xp: 5, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [2, 4], idleMs: [700, 1200], magic: true },
  boar: { name: 'หมูป่าเขี้ยวเหล็ก', tex: 'boar', hp: 145, dmg: 24, xp: 7, ai: 'dasher', moveSpeed: 420, radius: 18, zeny: [3, 5], idleMs: [800, 1300], def: 60 },
  shadowwolf: { name: 'หมาป่าเงา', tex: 'shadowwolf', hp: 92, dmg: 22, xp: 6, ai: 'dasher', moveSpeed: 600, radius: 16, zeny: [3, 4], idleMs: [600, 1100], flee: 22, hit: 26 },
  // ----- Dungeon 3: ซากป้อมวีรชน. Waves -> 1v1 mini boss (random of 4) -> waves -> boss -----
  skeleton: { name: 'ทหารโครงกระดูก', tex: 'skeleton', hp: 210, dmg: 36, xp: 7, ai: 'hopper', moveSpeed: 220, radius: 15, zeny: [4, 6], idleMs: [700, 1200], def: 45, hit: 32 },
  wisp: { name: 'ดวงไฟผี', tex: 'wisp', hp: 110, dmg: 34, xp: 6, ai: 'dasher', moveSpeed: 520, radius: 13, zeny: [4, 5], idleMs: [500, 900], magic: true, flee: 30 },
  gargoyle: { name: 'การ์กอยล์หิน', tex: 'gargoyle', hp: 340, dmg: 44, xp: 9, ai: 'hopper', moveSpeed: 180, radius: 18, zeny: [5, 7], idleMs: [900, 1400], def: 90, hit: 30 },
  duelist: { name: 'เซเลสต์', title: 'นักดาบดวลเงินจันทร์', tex: 'duelist', hp: 1900, dmg: 42, xp: 12, ai: 'boss', mini: 'duelist', moveSpeed: 300, radius: 30, zeny: [30, 40], idleMs: [600, 900], def: 20, flee: 30, hit: 38,
    phases: [{ at: 0.4, name: 'ดาบจันทร์เต็มดวง! เร็วและคมขึ้น', speed: 1.2, dmg: 1.15 }] },
  hunter: { name: 'กริมฟาง', title: 'หมาป่าคลั่งเลือด', tex: 'hunter', hp: 1750, dmg: 44, xp: 12, ai: 'boss', mini: 'hunter', moveSpeed: 300, radius: 34, zeny: [30, 40], idleMs: [600, 900], def: 15, flee: 15, hit: 34, lifesteal: 0.35, chargeEvery: 4, slamName: 'กลิ่นเลือด! กระโจนตะครุบ', slamAnim: 'pounce', slamColor: 0xc03050, charge: true },
  gunner: { name: 'ปิ๊กซี่', title: 'มือปืนพลุบ้าระห่ำ', tex: 'gunner', hp: 1500, dmg: 21, xp: 12, ai: 'boss', mini: 'gunner', moveSpeed: 300, radius: 30, zeny: [30, 40], idleMs: [600, 900], def: 5, flee: 20, hit: 36, shots: 3, slamMul: 3.4, slamName: 'จรวดยักษ์! ล็อกเป้าแล้ว', slamAnim: 'shot', slamColor: 0xff8c42, slamMagic: true, charge: true,
    phases: [{ at: 0.5, name: 'กระสุนเพลิง! ยิงติดไฟ', onHit: { burn: 1 } }] },
  drainer: { name: 'คาร์วอส', title: 'จอมเวทกาดำ', tex: 'drainer', hp: 1700, dmg: 38, xp: 12, ai: 'boss', mini: 'drainer', moveSpeed: 300, radius: 32, zeny: [30, 40], idleMs: [600, 900], def: 20, hit: 34, magic: true, slamMagic: true, lifesteal: 0.3, slamMul: 1.9, slamName: 'กรงเล็บวิญญาณ! ดูดชีวิต', slamAnim: 'cast', slamColor: 0xc03050, charge: true,
    skills: [{ kind: 'curse', every: 4, name: 'มนต์ปิดปาก', fx: { silence: 1 } }] },
  deathknight: { name: 'อัศวินมรณะ', tex: 'deathknight', hp: 3200, dmg: 50, xp: 0, ai: 'boss', moveSpeed: 240, radius: 42, zeny: [60, 80], idleMs: [700, 1000], def: 35, flee: 12, hit: 36, lifesteal: 0.2, summon: 'skeleton', slamName: 'ดาบมรณะ! ฟันกวาดวิญญาณ', slamAnim: 'cleave', slamColor: 0x9a6aff, slamMagic: true, charge: true,
    skills: [{ kind: 'revive', every: 4, pow: 0.5, name: 'ปลุกศพ' }],
    phases: [{ at: 0.35, name: 'วิญญาณมรณะตื่น! เร็วขึ้น ชาร์จถี่', speed: 1.2, chargeEvery: 2 }] },
  // ----- Dungeon 4: บึงพิษมรกต. Monsters that heal, shield, poison and explode (design/dungeon-4-5-brutal.md) -----
  toad: { name: 'คางคกพิษ', tex: 'toad', hp: 270, dmg: 40, xp: 8, ai: 'hopper', moveSpeed: 220, radius: 16, zeny: [5, 7], idleMs: [700, 1200], def: 25, hit: 34, onHit: { poison: 2 } },
  lizardshaman: { name: 'หมอผีกิ้งก่า', tex: 'lizardshaman', hp: 240, dmg: 34, xp: 9, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [5, 8], idleMs: [700, 1200], magic: true, hit: 34,
    skills: [{ kind: 'heal', every: 2, pow: 0.18, name: 'น้ำมนต์บึง' }] },
  hornet: { name: 'ต่อยักษ์', tex: 'hornet', hp: 170, dmg: 20, xp: 8, ai: 'dasher', moveSpeed: 520, radius: 13, zeny: [5, 7], idleMs: [500, 900], flee: 42, hit: 40, shots: 2, onHit: { poison: 1 } },
  turtleguard: { name: 'ทหารเต่าโล่', tex: 'turtleguard', hp: 430, dmg: 38, xp: 10, ai: 'hopper', moveSpeed: 160, radius: 18, zeny: [6, 9], idleMs: [900, 1400], def: 120, hit: 32,
    skills: [{ kind: 'shield', every: 4, pow: 0.1, name: 'กำแพงกระดอง' }] },
  bloater: { name: 'คางคกพองลม', tex: 'bloater', hp: 210, dmg: 30, xp: 8, ai: 'hopper', moveSpeed: 180, radius: 17, zeny: [5, 7], idleMs: [800, 1300], hit: 30, deathBlast: 2, onHit: { poison: 1 } },
  spiderling: { name: 'ลูกแมงมุม', tex: 'spiderling', hp: 160, dmg: 26, xp: 3, ai: 'dasher', moveSpeed: 480, radius: 11, zeny: [1, 2], idleMs: [400, 800], flee: 30, hit: 36, onHit: { poison: 1 } },
  venomqueen: { name: 'เวโนมิร่า', title: 'ราชินีใยพิษ', tex: 'venomqueen', hp: 2300, dmg: 44, xp: 14, ai: 'boss', mini: 'venomqueen', moveSpeed: 300, radius: 34, zeny: [45, 60], idleMs: [600, 900], def: 30, flee: 25, hit: 40,
    onHit: { poison: 2 }, chargeEvery: 4, slamMul: 1.5, slamName: 'ห่อใยพิษ! จะโดนมัด', slamFx: { freeze: 100, poison: 3 }, slamAnim: 'shot', slamColor: 0xd8f0c0, slamMagic: true, charge: true,
    skills: [{ kind: 'curse', every: 3, name: 'พ่นใยปิดปาก', fx: { silence: 2 } }],
    phases: [{ at: 0.5, name: 'ฟักไข่! ลูกแมงมุมออกมา', summon: ['spiderling', 2], speed: 1.15 }] },
  frostgiant: { name: 'กลาเซียร์', title: 'ยักษ์ธารน้ำแข็ง', tex: 'frostgiant', hp: 2600, dmg: 50, xp: 14, ai: 'boss', mini: 'frostgiant', moveSpeed: 240, radius: 40, zeny: [45, 60], idleMs: [700, 1000], def: 100, flee: 5, hit: 34,
    onHit: { armorBreak: 2 }, chargeEvery: 3, slamMul: 1.7, slamName: 'ทุบธารน้ำแข็ง! แช่แข็งทั้งตัว', slamFx: { freeze: 100 }, slamAnim: 'stomp', slamColor: 0x9fe3ff, slamMagic: true, charge: true,
    phases: [{ at: 0.4, name: 'เกราะน้ำแข็งพันปี!', shield: 0.18, dmg: 1.2, cleanse: true }] },
  hydra: { name: 'ไฮดรามรกต', tex: 'hydra', hp: 4800, dmg: 54, xp: 0, ai: 'boss', moveSpeed: 240, radius: 46, zeny: [90, 120], idleMs: [700, 1000], def: 45, flee: 15, hit: 40,
    onHit: { poison: 2 }, slamName: 'กัดสามหัว! พิษเข้ากระแสเลือด', slamMul: 1.6, slamFx: { poison: 4 }, slamAnim: 'bite', slamColor: 0x6fd08c, charge: true,
    phases: [
      { at: 0.66, name: 'หัวที่สองงอก! ฟื้นตัว + ไข่ฟัก', heal: 0.1, summon: ['toad', 2], dmg: 1.15, cleanse: true, onHit: { poison: 2, burn: 2 } },
      { at: 0.33, name: 'หัวที่สาม! คลั่งพ่นกรด', speed: 1.3, chargeEvery: 2, slamFx: { poison: 4, armorBreak: 3 }, cleanse: true },
    ] },
  // ----- Dungeon 5: บัลลังก์อเวจี. Buffers, cursers, revivers, mirrors, bombers -----
  hellknight: { name: 'อัศวินนรก', tex: 'hellknight', hp: 560, dmg: 56, xp: 12, ai: 'hopper', moveSpeed: 220, radius: 18, zeny: [8, 11], idleMs: [700, 1200], def: 80, hit: 40, onHit: { armorBreak: 2 },
    skills: [{ kind: 'warcry', every: 3, pow: 0.3, turns: 3, name: 'โห่ร้องสงคราม' }] },
  hexwitch: { name: 'แม่มดคำสาป', tex: 'hexwitch', hp: 320, dmg: 48, xp: 11, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [7, 10], idleMs: [700, 1200], magic: true, hit: 40, onHit: { burn: 2 },
    skills: [{ kind: 'curse', every: 3, name: 'คำสาปอ่อนแรง', fx: { weaken: 3, burn: 2 } }] },
  imp: { name: 'ปีศาจระเบิด', tex: 'imp', hp: 200, dmg: 36, xp: 8, ai: 'dasher', moveSpeed: 560, radius: 12, zeny: [5, 7], idleMs: [400, 800], flee: 38, hit: 42, deathBlast: 2 },
  necropriest: { name: 'นักบวชมรณะ', tex: 'necropriest', hp: 380, dmg: 40, xp: 11, ai: 'hopper', moveSpeed: 200, radius: 15, zeny: [7, 10], idleMs: [700, 1200], magic: true, hit: 38,
    skills: [{ kind: 'revive', every: 3, pow: 0.5, name: 'ปลุกศพ' }, { kind: 'heal', every: 2, pow: 0.15, name: 'มนต์ดำฟื้นกาย' }] },
  wraith: { name: 'ภูตกระจก', tex: 'wraith', hp: 300, dmg: 46, xp: 10, ai: 'dasher', moveSpeed: 500, radius: 14, zeny: [6, 9], idleMs: [500, 900], magic: true, flee: 36, hit: 40, reflect: 0.25 },
  shard: { name: 'เศษกระจก', tex: 'shard', hp: 220, dmg: 30, xp: 3, ai: 'dasher', moveSpeed: 500, radius: 11, zeny: [1, 2], idleMs: [400, 800], magic: true, flee: 30, hit: 40, deathBlast: 1.8 },
  mirage: { name: 'มิราจ', title: 'ภูตกระจกพันหน้า', tex: 'mirage', hp: 2600, dmg: 52, xp: 16, ai: 'boss', mini: 'mirage', moveSpeed: 300, radius: 32, zeny: [60, 80], idleMs: [600, 900], magic: true, slamMagic: true, def: 20, flee: 34, hit: 44,
    absorb: 0.3, onHit: { weaken: 2 }, chargeEvery: 4, slamMul: 1.2, slamName: 'โซลสไตรค์กระจก! ยิงดาเมจที่เก็บไว้คืน', slamFx: { weaken: 3, silence: 1 }, slamAnim: 'cast', slamColor: 0xc9a8ff, charge: true,
    phases: [{ at: 0.5, name: 'แตกร่าง! เศษกระจกระเบิดได้ + เก็บดาเมจมากขึ้น', summon: ['shard', 2], absorb: 0.4 }] },
  warlord: { name: 'บารัค', title: 'ขุนศึกคลั่งโลหิต', tex: 'warlord', hp: 2700, dmg: 50, xp: 16, ai: 'boss', mini: 'warlord', moveSpeed: 300, radius: 36, zeny: [60, 80], idleMs: [600, 900], def: 60, flee: 15, hit: 44, lifesteal: 0.2,
    onHit: { armorBreak: 2 }, chargeEvery: 4, slamMul: 2, slamName: 'ขวานผ่าภูผา! ฟันทะลุเกราะ', slamAnim: 'cleave', slamColor: 0xff5a4e, charge: true,
    skills: [{ kind: 'warcry', every: 3, pow: 0.25, turns: 99, self: true, name: 'คลั่งเลือด (สะสม)' }],
    phases: [{ at: 0.3, name: 'โกรธจัด! เร็วขึ้นมาก', speed: 1.5, dmg: 1.1 }] },
  lich: { name: 'โมรเดคัส', title: 'จอมลิชนิรันดร์', tex: 'lich', hp: 6000, dmg: 62, xp: 0, ai: 'boss', moveSpeed: 240, radius: 44, zeny: [150, 200], idleMs: [700, 1000], magic: true, slamMagic: true, def: 50, flee: 18, hit: 44,
    onHit: { burn: 2 }, slamName: 'ดวงดาวมรณะ! ทุกอย่างมอดไหม้', slamMul: 1.7, slamFx: { burn: 3, weaken: 2 }, slamAnim: 'cast', slamColor: 0xff5a2a, charge: true,
    skills: [{ kind: 'curse', every: 4, name: 'คำสาปจอมลิช', fx: { weaken: 3, armorBreak: 3 } }],
    phases: [
      { at: 0.7, name: 'โล่กระดูก! สะท้อนดาเมจ + ปีศาจระเบิด', shield: 0.12, reflect: 0.2, summon: ['imp', 2] },
      { at: 0.35, name: 'พิธีกรรมสุดท้าย! เร็วขึ้น ชาร์จถี่', heal: 0.08, speed: 1.3, dmg: 1.15, chargeEvery: 2, cleanse: true, slamFx: { burn: 3, weaken: 2, silence: 2 }, summon: ['hellknight', 1] },
    ] },
  alpha: { name: 'จ่าฝูงเงา', tex: 'alpha', hp: 1600, dmg: 30, xp: 0, ai: 'boss', moveSpeed: 260, radius: 40, zeny: [35, 45], idleMs: [700, 1000], def: 25, flee: 12, hit: 30, summon: 'shadowwolf', slamName: 'หอนเรียกพลัง! กระโจนตาหน้า', slamAnim: 'pounce', slamColor: 0x8a7ab8, charge: true,
    phases: [{ at: 0.4, name: 'หอนคลั่ง! เร็วขึ้น กัดแล้วอ่อนแรง', speed: 1.25, onHit: { weaken: 1 } }] },
}

export interface RoomDef {
  title: string
  spawn: [MonsterKind, number][]
  boss?: boolean
  turnLimit?: number // hero turns before the fight is lost (default BATTLE.turnLimit)
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
  unlock: 'none' | 'job' | 'd2' | 'd3' | 'd4' // 'job' = after the first job change, 'dN' = after clearing dungeon N
  rooms: RoomDef[]
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
    { title: 'เวฟ 2 · ดงเห็ดสปอร์', spawn: [['shroom', 2], ['bat', 2]] },
    { title: 'เวฟ 3 · ทางหมูป่า', spawn: [['boar', 1], ['shadowwolf', 1], ['bat', 1]] },
    { title: 'เวฟ 4 · ฝูงหมาป่าเงา', spawn: [['shadowwolf', 3], ['shroom', 1]] },
    { title: 'เวฟ 5 · หน้าถ้ำจ่าฝูง', spawn: [['boar', 2], ['shadowwolf', 1], ['shroom', 1]] },
    { title: 'ห้องบอส · จ่าฝูงเงา', spawn: [['alpha', 1]], boss: true, turnLimit: 36 },
  ],
}, {
  id: 'd3', name: 'ซากป้อมวีรชน', boss: 'อัศวินมรณะ', tier: 3, sky: [0x1a0f22, 0x8a3a3a], hills: 0xb07a7a, unlock: 'd2',
  rooms: [
    { title: 'เวฟ 1 · ประตูป้อม', spawn: [['skeleton', 2], ['wisp', 1]] },
    { title: 'เวฟ 2 · ลานหิน', spawn: [['gargoyle', 1], ['skeleton', 1], ['wisp', 1]] },
    { title: 'สังเวียน · ดวล 1-1', spawn: [], mini: true, turnLimit: 40 },
    { title: 'เวฟ 3 · ระเบียงผี', spawn: [['wisp', 3], ['skeleton', 1]] },
    { title: 'เวฟ 4 · หน้าบัลลังก์', spawn: [['gargoyle', 2], ['skeleton', 1], ['wisp', 1]] },
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
}]
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
/** Thief Double Strike (RO Double Attack): Lv 1 20%, +4%/Lv, Lv 10 60%. */
export const doubleAtkChance = (lv: number) => (lv <= 0 ? 0 : lv >= 10 ? 0.6 : 0.16 + 0.04 * lv)
export const hitChance = (hit: number, flee: number, floor = 0.8) => Math.min(0.98, Math.max(floor, 0.8 + (hit - flee) * 0.01))
/** Stat spec v1: damage after DEF = dmg * 100 / (100 + DEF). Never subtract flat. */
export const afterDef = (dmg: number, def: number) => dmg * 100 / (100 + Math.max(0, def))

// ===== Turn-based side-scroll battle (BattleScene) =====
// Turn order: everyone fills a gauge by `speed` per tick; at 100 they act. Faster = more turns.
export const BATTLE = {
  turnLimit: 20, // Q 2026-11-03: hero turns per wave fight; run out = the run is lost (stops pure-tank stalling)
  bossTurnLimit: 30, // boss fights (bot: damage builds 10-23 turns, pure tanks 36-43)
  heroSpeed: 10, // at base attack speed (PLAYER.aspd); AGI / speed perks scale it with aspd
  monSpeed: { jellop: 8, minijellop: 9, wolf: 13, king: 8, bat: 16, shroom: 7, boar: 9, shadowwolf: 14, alpha: 11,
    skeleton: 10, wisp: 14, gargoyle: 7, duelist: 15, hunter: 13, gunner: 14, drainer: 10, deathknight: 11,
    toad: 10, lizardshaman: 9, hornet: 17, turtleguard: 7, bloater: 8, spiderling: 15, venomqueen: 14, frostgiant: 9, hydra: 11,
    hellknight: 10, hexwitch: 11, imp: 17, necropriest: 9, wraith: 15, shard: 14, mirage: 14, warlord: 12, lich: 11 } as Record<MonsterKind, number>,
  monDmgMul: 0.55, // monster hit = def.dmg * this
  cleave: 0.5, // hero's swing also hits the 2nd monster for this share
  regenPerTurn: 1.5, // regen stat (%/s in real-time) -> % of max HP per hero turn
  resPerTurn: 1, // resRegen multiplier per hero turn
  slamEvery: 3, // boss charges every Nth turn, slams on the next
  slamStun: 45, // gauge the hero loses when slammed (tenacity reduces it)
  stepMs: 520, // one action's animation at x1
  msPerTurn: 1500, // smashCd (ms) -> hero turns of cooldown
  comboMax: 2, // extra basic attacks a combo can chain
  counterMul: 0.8, // a counter hit = basic attack x this
  reviveHp: 0.3, // Phoenix card: share of max HP the hero gets back
  // ----- Dungeon 3 mini bosses -----
  parryEvery: 3, // duelist: stance every Nth turn; the next hero hit is parried (0 dmg) and riposted
  parryMul: 1.4, // riposte damage x the duelist's normal hit
  frenzyAt: 0.5, frenzySpeed: 1.4, frenzyLifesteal: 0.6, // hunter below 50% HP
  demonAt: 0.5, demonRegen: 0.02, // drainer below 50% HP: regen share of max HP per turn
  // ----- Dungeon 4-5: debuffs on the hero (HitFx) -----
  poisonPct: 0.01, poisonCap: 8, // per stack per hero turn, share of max HP (Lv-15 bot: 1.2%/cap 10 killed Thief in wave 1-2)
  burnPct: 0.03, burnHealCut: 0.4,
  weakenMul: 0.75, armorBreakMul: 0.5,
  soulBolts: 5, soulCap: 0.4, // Mirage Soul Strike: stored damage fires as N magic bolts, total capped at this share of hero max HP
}
