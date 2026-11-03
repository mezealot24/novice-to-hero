// usage: node bot.cjs <html> <job> <runs>   env: GEAR=1 class gear · D=2 dungeon 3 (Lv 10 hero, dungeon-2 gear) · D=4 Lv 15 hero for dungeon 4 · D=5 Lv 20 + หัวใจไฮดรา for dungeon 5 · DUN=index · RELIC=id force a pick
const { chromium } = require('playwright')
const [html, job, runsArg] = process.argv.slice(2)
const RUNS = +runsArg || 8
const alloc = {
  swordsman: { str: 8, vit: 7 }, archer: { dex: 8, agi: 7 }, mage: { int: 8, wis: 7 },
  cleric: { wis: 8, int: 7 }, thief: process.env.TH_LUK ? { agi: 8, luk: 7 } : { agi: 8, str: 7 }, // Q 2026-11-03: Thief damage comes from STR
}[job]
const D = +(process.env.D || 1)
const stats = { str: 1, vit: 1, wis: 1, dex: 1, int: 1, luk: 1, agi: 1 }
for (const k in alloc) stats[k] += alloc[k]
if (D === 2 && !process.env.LO) { for (const k in alloc) stats[k] += alloc[k]; stats.vit += 3 } // ~Base Lv 10: 30 points
const save = {
  v: 1, name: 'Bot', race: 'human', baseLevel: 5, baseXp: 0, statPoints: 0, jobLevel: 1, jobXp: 0, skillPoints: 0,
  skills: { smash: 1, firstaid: 0, tough: 0 }, job, jobSkills: { auto: 1, ult: 1 }, stats, zeny: 0, gems: 0,
  owned: ['knife', 'cloth', 'none', 'shortsword', 'leather'], equipped: { weapon: 'shortsword', armor: 'leather', acc: 'none' },
  ...(process.env.GEAR ? (() => { const [w, a, c] = { swordsman: ['w_bloodblade', 'a_thornmail', 'r_fist'], archer: ['w_hawkbow', 'a_eaglecloak', 'r_wind'], mage: ['w_wardstaff', 'a_runerobe', 'r_mana'], cleric: ['w_holymace', 'a_lightvestment', 'r_beads'], thief: ['w_shadowdagger', 'a_nightsuit', 'r_feather'] }[job]; return { owned: ['knife', 'cloth', 'none', w, a, c], equipped: { weapon: w, armor: a, acc: c } } })() : {}),
  costumes: ['default'], costume: 'default', supporter: false, clears: 1, bestRoom: 0, clearsBy: { d1: 1 }, lastDaily: '2099-01-01', muted: true,
}
if (D === 2 && !process.env.LO) {
  const [w, a] = { swordsman: ['w_berserkaxe', 'a_thornmail'], archer: ['w_starbow', 'a_eaglecloak'], mage: ['w_archstaff', 'a_runerobe'], cleric: ['w_sunmace', 'a_lightvestment'], thief: ['w_twinfang', 'a_nightsuit'] }[job]
  Object.assign(save, { baseLevel: 10, jobLevel: 8, jobSkills: { auto: 3, ult: 3 }, owned: ['knife', 'cloth', 'none', w, a, 'r_alphafang'], equipped: { weapon: w, armor: a, acc: 'r_alphafang' }, clearsBy: { d1: 3, d2: 1 }, clears: 4 })
}
if (D >= 4) { // Dungeon 4-5 profiles: Lv 15 (45 points) / Lv 20 (60 points) + dungeon-2 class gear
  const k = D === 4 ? 3 : 4
  for (const key in stats) stats[key] = 1
  for (const key in alloc) stats[key] += alloc[key] * k
  const [w, a] = { swordsman: ['w_berserkaxe', 'a_thornmail'], archer: ['w_starbow', 'a_eaglecloak'], mage: ['w_archstaff', 'a_runerobe'], cleric: ['w_sunmace', 'a_lightvestment'], thief: ['w_twinfang', 'a_nightsuit'] }[job]
  const acc = process.env.ACC || (D === 4 ? 'r_alphafang' : 'r_hydraheart')
  Object.assign(save, { baseLevel: D === 4 ? 15 : 20, jobLevel: D === 4 ? 15 : 20, jobSkills: { auto: D === 4 ? 5 : 7, ult: D === 4 ? 5 : 7 }, owned: ['knife', 'cloth', 'none', w, a, acc], equipped: { weapon: w, armor: a, acc }, clearsBy: { d1: 3, d2: 2, d3: 2, d4: D === 5 ? 1 : 0 }, clears: 8 })
}
// skill web (v27): old class skill levels -> +power nodes (12%/lv); S2=<skill2 id> learns that Skill 2 (+ PL "+" levels, STAR=1 its ★)
{
  const lvTo = (lv) => Math.min(5, Math.round(((lv || 1) - 1) * 10 / 12))
  const t = { [`${job}_s1p`]: lvTo(save.jobSkills.auto), [`${job}_ultp`]: lvTo(save.jobSkills.ult) }
  if (process.env.S2) { t[process.env.S2] = 1; t[process.env.S2 + '_p'] = +(process.env.PL ?? 0); if (process.env.STAR) { t[process.env.S2 + '_p'] = 3; t[process.env.S2 + '_x'] = 1 } }
  if (process.env.TREEX) Object.assign(t, JSON.parse(process.env.TREEX)) // extra web nodes, e.g. {"thief_core1":5}
  Object.assign(save, { web: 1, jobTree: t, jobSkills: { auto: 1, ult: 1 } })
}
// EXTRA=1: also wear headgear + off-hand for the class and a second accessory (equipment screen v1)
if (process.env.EXTRA) {
  const hi = D >= 2
  const [h, o] = { swordsman: ['h_helm', hi ? 'o_tower' : 'o_ironshield'], archer: ['h_ranger', hi ? 'o_windquiver' : 'o_quiver'], mage: ['h_witch', hi ? 'o_starorb' : 'o_orb'], cleric: ['h_halo', 'o_holyshield'], thief: ['h_hood', hi ? 'o_scorpion' : 'o_maingauche'] }[job]
  const a2 = hi ? 'fang' : 'clover'
  save.owned = [...save.owned, h, o, a2]
  save.equipped = { ...save.equipped, head: h, offhand: o, acc2: a2 }
}
// CRAFTED=1: forged kit for the class (d3 craft weapon, emerald mail, lich ring at D5) at GRADE 4 / REFINE 5 unless set; pair with EXTRA=1
if (process.env.CRAFTED) {
  const w = { swordsman: 'c_herosword', archer: 'c_sealbow', mage: 'c_sealstaff', cleric: 'c_dawnmace', thief: 'c_rustfang' }[job]
  process.env.WEAPON ||= w; process.env.ARMOR ||= 'c_emeraldmail'; if (D >= 5) process.env.ACC ||= 'c_lichring'
  process.env.GRADE ||= '4'; process.env.REFINE ||= '5'
}
// forge (design/item-acquisition-v1.md): WEAPON / ARMOR / ACC / HEAD / OFF=<item id> swap gear in, GRADE=n puts every worn item at grade n
for (const [env, slot] of [['WEAPON', 'weapon'], ['ARMOR', 'armor'], ['ACC', 'acc'], ['HEAD', 'head'], ['OFF', 'offhand']]) if (process.env[env]) { save.owned.push(process.env[env]); save.equipped[slot] = process.env[env] }
if (process.env.GRADE) save.grade = Object.fromEntries(Object.values(save.equipped).map((id) => [id, +process.env.GRADE]))
// refine (phase 2): REFINE=n puts every worn item at +n (no bonus lines), BROKEN=1 marks them all broken
if (process.env.REFINE) save.refine = Object.fromEntries(Object.values(save.equipped).map((id) => [id, +process.env.REFINE]))
if (process.env.BROKEN) save.broken = Object.values(save.equipped)
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage()
  p.on('pageerror', (e) => { if (process.env.DEBUG) console.error('pageerror', e.message) })
  await p.addInitScript((s) => { localStorage.setItem('novice-to-hero.save.v1', JSON.stringify(s)) }, save)
  await p.goto('file://' + html)
  await p.waitForFunction(() => window.__nth && window.__nth.scene.isActive('title'), null, { timeout: 30000 })
  await p.waitForFunction(() => window.__nth && window.__nth.scene.isActive('title'), null, { timeout: 30000 })
  const res = []
  for (let r = 0; r < RUNS; r++) {
    res.push(await p.evaluate(async ([first, RELIC, D, DUN]) => {
      const g = window.__nth, R = g.renderer
      R.preRender = () => {}; R.render = () => {}; R.postRender = () => {} // test only: skip drawing
      if (first) { g.scene.getScenes(true).forEach((s) => s.scene.stop()); g.scene.start('battle', { d: DUN }) }
      while (!window.__battle || !window.__battle.st) await new Promise((r) => setTimeout(r, 30))
      const B = window.__battle
      if (RELIC) B.testRelic = RELIC
      if (!first) B.startRun()
      await new Promise((r) => setTimeout(r, 60))
      const t0 = Date.now()
      while (!B.over && Date.now() - t0 < 120000) {
        B.time.timeScale = 15; B.tweens.timeScale = 15
        if (B.pendingPick) B.pendingPick(B.miniWon && !B.relic && RELIC ? 0 : Math.floor(Math.random() * 3))
        const boss = B.alive().find((m) => m.def.ai === 'boss')
        // duelist never charges: ult when she is not in parry stance
        const want = !boss || boss.charging || (boss.def.mini === 'duelist' && !boss.parry) || (boss.def.mini && !(boss.def.charge || boss.def.breakPct))
        if (B.smashCdLeft <= 0 && !B.smashQueued && want) B.queueSmash()
        await new Promise((r) => setTimeout(r, 15))
      }
      const bm = B.mons.find((m) => m.def.ai === 'boss')
      return { mats: Object.values(B.runMats || {}).reduce((a, n) => a + n, 0), maxHp: Math.round(B.st.maxHp), minHp: B.minHpPct, mini: B.miniKind, miniWon: B.miniWon, relic: B.relic, parry: B.parryCount, frz: B.freezeCount, tl: (B.turnsLog || []).join('/'), win: B.over && B.hp > 0 && !B.timedOut, room: B.room, hp: Math.round(B.hp), bossHp: bm ? Math.max(0, Math.round(bm.hp)) : null, breaks: B.breakCount ?? 0, revived: B.revivedCount ?? 0, ctr: B.counterCount ?? 0, combo: B.comboCount ?? 0, el: B.job.id === 'mage' ? B.element : '', s2: B.s2Count ?? 0, to: !!B.timedOut, dbf: B.debuffCount ?? 0, peak: B.peakTurns ?? 0, ms: Date.now() - t0 }
    }, [r === 0, process.env.RELIC || '', D, process.env.DUN ? +process.env.DUN : D >= 4 ? D - 1 : D]))
  }
  if (process.env.DEBUG) console.log(JSON.stringify(res))
  const wins = res.filter((x) => x.win).length
  const minis = {}; for (const x of res) if (x.mini) { const k = x.mini; minis[k] = minis[k] || [0, 0, 0]; minis[k][0]++; if (x.miniWon) minis[k][1]++; if (x.win) minis[k][2]++ }
  const relics = {}; for (const x of res) if (x.relic) { relics[x.relic] = relics[x.relic] || [0, 0]; relics[x.relic][0]++; if (x.win) relics[x.relic][1]++ }
  console.log(JSON.stringify({ job, wins, runs: RUNS, mats: res.map((x) => x.mats).join(','), ...(D >= 2 ? { minis, relics } : {}), deaths: res.filter((x) => !x.win).map((x) => `r${x.room + 1}[${x.maxHp}]` + (x.bossHp != null ? `(boss ${x.bossHp})` : '')), breaks: res.reduce((a, x) => a + x.breaks, 0), revives: res.reduce((a, x) => a + x.revived, 0), ctr: res.reduce((a, x) => a + (x.ctr || 0), 0), combo: res.reduce((a, x) => a + (x.combo || 0), 0), timeouts: res.filter((x) => x.to).length, debuffs: res.reduce((a, x) => a + (x.dbf || 0), 0), peakTurns: res.map((x) => x.peak).join(','), s2casts: res.reduce((a, x) => a + (x.s2 || 0), 0), els: res.map((x) => (x.el ? x.el[0] : '') + (x.win ? 'W' : 'L')).join(' ') }))
  await b.close()
})().catch((e) => { console.error(job, e.message); process.exit(1) })
