# usage: python3 apply-cleric.py <game/src>  — re-applies the Priest (cleric) tree hooks onto the current source.
import sys, os, shutil
src = sys.argv[1]; here = os.path.dirname(os.path.abspath(__file__))
def edit(path, pairs):
    p = os.path.join(src, path); s = open(p).read()
    for a, b in pairs:
        if b in s: continue  # already applied
        assert s.count(a) == 1, (path, a[:60], s.count(a)); s = s.replace(a, b)
    open(p, 'w').write(s)
FLAGS = """  // ----- Cleric tree + talents (data/trees/cleric.ts) -----
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
  spellCrit: number // 0..1 crit chance for magic hits (Q 2026-11-03: magic crits only via talent/item/card), uses critMul
"""
DEF = "healAt: 0, atone: 0, judge: 0, smiteMul: 0, smiteVamp: 0, healShield: 0, spearStart: 0, spearRate: 0, spearMul: 0, spearHeal: 0, ultRegen: 0, ultHoly: 0, ultChargeShield: 0, bossShield: 0, lateDmg: 0, spellCrit: 0, "
gd = os.path.join(src, 'data/game-data.ts'); s = open(gd).read()
if 'healAt: number' not in s:
    i = s.index('export const PLAYER'); j = s.rindex('\n}', 0, i); s = s[:j] + '\n' + FLAGS.rstrip('\n') + s[j:]
    k = s.index('// Novice: cooldown only'); s = s[:k] + DEF + s[k:]
    open(gd, 'w').write(s)
import re
bs = open(os.path.join(src, 'scenes/BattleScene.ts')).read()
mt = re.search(r"        if \(this\.hp < this\.st\.maxHp \* 0\.75\) \{ this\.heal\(this\.st\.maxHp \* 0\.22 \* pow\); this\.burst\(HERO_X, GROUND - 40, 0x6fd08c, 18, 160\) \}\n        else for \(const m of live\.slice\(0, 2 \+ this\.st\.smiteTargets\)\) await this\.shoot\(m, 0xf6e27a, \(\) => this\.strike\(m, ([0-9.]+) \* pow, true, '#f6e27a'\)\)[^\n]*", bs)
AUTO_OLD = mt.group(0) if mt else 'ALREADY'
SM = mt.group(1) if mt else '2'
edit('scenes/BattleScene.ts', [
("  burn: number; burnTurns: number; poison: number; poisonDmg: number; dotTxt?: Phaser.GameObjects.Text\n",
 "  burn: number; burnTurns: number; poison: number; poisonDmg: number; dotTxt?: Phaser.GameObjects.Text\n  marked?: number // Cleric ★ judgement: turns of +15% damage taken\n"),
("    if (this.st.waveShield > 0) { // gear: tops the shield up (never stacks) at every wave start",
 "    if (this.st.bossShield > 0 && this.mons.some((m) => !m.dead && m.def.ai === 'boss')) this.addShield(this.st.maxHp * this.st.bossShield) // cleric talent: ร่างพร\n    if (this.st.spearStart > 0) this.spears += this.st.spearStart // cleric talent: หอกเปิดศึก\n    if (this.st.waveShield > 0) { // gear: tops the shield up (never stacks) at every wave start"),
("  private async heroTurn() {\n    if (this.st.regen > 0)",
 """  private async heroTurn() {
    await this.heroAct()
    if (this.job.id !== 'cleric') return
    if (this.ultRegenTurns > 0) { this.ultRegenTurns--; this.heal(this.st.maxHp * this.st.ultRegen) } // cleric talent: พรยืนยาว
    this.spearAcc += this.st.spearRate
    while (this.spearAcc >= 1) { this.spearAcc--; this.spears++ }
    await this.fireSpears()
  }

  // ---------- Cleric: light spears (design/skill-tree-priest.md 3.1) ----------
  private spears = 0
  private spearAcc = 0
  private ultRegenTurns = 0
  private smiteCount = 0
  private async fireSpears() {
    const n = Math.min(8, this.spears); this.spears = 0
    if (!n || !this.alive().length || this.hp <= 0) return
    this.floatText(HERO_X + 30, GROUND - 140, `🔱 x${n}`, '#f6e27a')
    this.burst(700, GROUND - 40, 0xf6e27a, 10 + n * 2, 200)
    for (let i = 0; i < n; i++) {
      for (const m of this.alive()) this.strike(m, 0.3 + this.st.spearMul, true, '#f6e27a')
      if (this.st.spearHeal > 0) this.heal(this.st.maxHp * this.st.spearHeal, true)
    }
    await this.wait(BATTLE.stepMs * 0.3)
  }
  /** Skill heal (auto / ult): talents/tree turn it into shield and damage too. */
  private skillHeal(n: number) {
    const eff = n * (1 + this.st.healAmp)
    this.heal(n)
    if (this.st.healShield > 0) this.addShield(eff * this.st.healShield, true)
    const f = this.front()[0]
    if (this.st.atone > 0 && f) this.damageMon(f, Math.max(1, Math.round(eff * this.st.atone)), false, '#ffe08a') // tree ★A: ไฟชำระ
  }

  private async heroAct() {
    if (this.st.regen > 0)"""),
("  private damageMon(m: Mon, dmg: number, crit: boolean, color?: string) {\n",
 "  private damageMon(m: Mon, dmg: number, crit: boolean, color?: string) {\n    if ((m.marked ?? 0) > 0) dmg = Math.round(dmg * 1.15) // cleric ★B: ตราบาป\n    if (this.st.lateDmg > 0 && this.fightTurns >= 12) dmg = Math.round(dmg * (1 + this.st.lateDmg)) // cleric talent: อรุณรุ่ง\n"),
("  private async monTurn(m: Mon) {\n    m.turns++", "  private async monTurn(m: Mon) {\n    m.turns++\n    if ((m.marked ?? 0) > 0) m.marked!--"),
(AUTO_OLD,
"""        if (this.hp < this.st.maxHp * (0.75 - this.st.healAt)) { this.skillHeal(this.st.maxHp * 0.22 * pow); this.burst(HERO_X, GROUND - 40, 0x6fd08c, 18, 160) }
        else if (this.st.judge > 0 && ++this.smiteCount % 3 === 0) { // tree ★B: วันพิพากษา
          this.callout('⚖️ พิพากษา!', W / 2, 170); this.burst(700, GROUND - 30, 0xf6e27a, 30, 320)
          for (const m of live) { const d = this.strike(m, 2.2 * pow * (1 + this.st.smiteMul), true, '#f6e27a'); if (!m.dead) m.marked = 2; if (this.st.smiteVamp > 0) this.heal(d * this.st.smiteVamp, true) }
        } else for (const m of live.slice(0, 2 + this.st.smiteTargets)) await this.shoot(m, 0xf6e27a, () => { const d = this.strike(m, """ + SM + """ * pow * (1 + this.st.smiteMul), true, '#f6e27a'); if (this.st.smiteVamp > 0) this.heal(d * this.st.smiteVamp, true) })"""),
("""        this.addShield(this.st.maxHp * 0.35 * pow)
        this.heal(this.st.maxHp * 0.15 * pow)
        this.burst(HERO_X, GROUND - 50, 0xf6e27a, 24, 200)""",
"""        this.addShield(this.st.maxHp * 0.35 * pow * (this.alive().some((m) => m.charging) ? 1 + this.st.ultChargeShield : 1)) // talent: ใต้ปีกเทพ
        this.skillHeal(this.st.maxHp * 0.15 * pow)
        this.burst(HERO_X, GROUND - 50, 0xf6e27a, 24, 200)
        if (this.st.ultHoly > 0) for (const m of this.alive()) this.strike(m, this.st.ultHoly, true, '#f6e27a') // talent: แสงลงทัณฑ์
        if (this.st.ultRegen > 0) this.ultRegenTurns = 3 // talent: พรยืนยาว
        this.spears += 2 // every cleric: the ult calls 2 light spears"""),
("    const crit = !magic && Math.random() < this.st.crit\n", "    const crit = Math.random() < (magic ? this.st.spellCrit : this.st.crit) // magic crits only with spellCrit (talent/item/card)\n"),
("this.revivedCount = 0;", "this.revivedCount = 0; this.spears = 0; this.spearAcc = 0; this.ultRegenTurns = 0; this.smiteCount = 0;"),
])
shutil.copy(os.path.join(here, 'cleric.ts.ready'), os.path.join(src, 'data/trees/cleric.ts'))
print('cleric applied')
