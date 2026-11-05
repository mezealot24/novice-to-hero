// usage: node bot.cjs <html> <job> <runs>   MODE=tower TOWER_MAX=15 (climb then leave) · MODE=daily SEED=yyyymmdd · START=n tower start floor · TMO=ms per run
// EVENT=id forces every post-wave event · PICK=smart takes the best-looking level-up card instead of a random one, PICK=last always the last card (the common / general one: same cards on old and new builds, for A/B) · พร v2: PERK=id[,id] puts that card in slot 1 of every level-up and the bot takes slot 1 · MYTHIC=id same as RELIC=id
// env: ALLOC='{"str":8,"int":7}' overrides the class stat spread · GEAR=1 class gear · D=2 dungeon 3 (Lv 10 hero, dungeon-2 gear) · D=4 Lv 15 hero for dungeon 4 · D=5 Lv 20 + หัวใจไฮดรา for dungeon 5 · DUN=index · RELIC=id force a pick
const { chromium } = require('playwright')
const [html, job, runsArg] = process.argv.slice(2)
const RUNS = +runsArg || 8
if (process.env.MYTHIC) process.env.RELIC = process.env.MYTHIC
const alloc = {
  swordsman: { str: 8, vit: 7 }, archer: { dex: 8, agi: 7 }, mage: { int: 8, wis: 7 },
  cleric: { wis: 8, int: 7 }, thief: process.env.TH_LUK ? { agi: 8, luk: 7 } : { agi: 8, str: 7 }, // Q 2026-11-03: Thief damage comes from STR
}[job]
if (process.env.ALLOC) { for (const k in alloc) delete alloc[k]; Object.assign(alloc, JSON.parse(process.env.ALLOC)) } // e.g. ALLOC='{"str":8,"int":7}'
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
if (D >= 6) { // D6 profile (Q 2026-11-04 level dungeons): Base Lv 45 (135 points), Job Lv 40, D5 gear; pair with CRAFTED=1 EXTRA=1 REFINE=7
  for (const key in stats) stats[key] = 1
  for (const key in alloc) stats[key] += alloc[key] * 9
  Object.assign(save, { baseLevel: +(process.env.BL || 45), jobLevel: 40, jobSkills: { auto: 10, ult: 10 }, clearsBy: { d1: 3, d2: 2, d3: 2, d4: 2, d5: 1 }, clears: 10 })
  if (!process.env.ACC) { save.owned.push('r_hydraheart'); save.equipped.acc = 'r_hydraheart' }
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
// SOCK='{"<item id>":["card id",...]}' slots cards (bag gets them too) · TAL='{"1":{"id":"th_t1c","rank":2}}' sets talents
if (process.env.BL) save.baseLevel = +process.env.BL // HARD=1 tests: scaling reads Base Lv
if (process.env.HARD) save.hardClearsBy = {}
if (process.env.SOCK) { save.sockets = JSON.parse(process.env.SOCK); save.cards = {}; for (const ids of Object.values(save.sockets)) for (const id of ids) save.cards[id] = (save.cards[id] ?? 0) + 1 }
if (process.env.TAL) save.jobTalents = JSON.parse(process.env.TAL)
// 2nd job (design/second-jobs-v1.md): JOB2=berserker|knight|rogue|mobster|wizard|sage · J2LV=n (default 30) · J2T='{"node":lv}' replaces the preset web, J2T=0 empty · J2W=<weapon id> (default the mastery weapon, J2W=0 keeps gear)
if (process.env.JOB2) {
  const j2 = process.env.JOB2
  const preset = {
    berserker: { berserker_s3p: 5, berserker_u2p: 5, bz_c1: 3, bz_c2: 3, bz_c3: 3, bz_c4: 1, bz_d1: 3, bz_d2: 3 },
    knight: { knight_s3p: 5, knight_u2p: 5, kn_p1: 3, kn_p2: 1, kn_g1: 3, kn_g2: 3, kn_g3: 3, kn_g4: 1 },
    rogue: { rogue_s3p: 5, rogue_u2p: 5, rg_c1: 3, rg_c2: 3, rg_c3: 3, rg_c4: 1, rg_k1: 3, rg_k2: 3, rg_k3: 3 },
    mobster: { mobster_s3p: 5, mobster_u2p: 5, mb_e1: 3, mb_e2: 3, mb_e3: 3, mb_e4: 1, mb_p1: 3, mb_p2: 3, mb_p3: 3 },
    wizard: { wizard_s3p: 5, wizard_u2p: 5, wz_i1: 3, wz_i2: 3, wz_i3: 3, wz_i4: 1, wz_m1: 3, wz_m2: 3, wz_m3: 3 }, // Phase 5 Mage
    sage: { sage_s3p: 5, sage_u2p: 5, sg_a1: 3, sg_a2: 3, sg_a3: 1, sg_a4: 1, sg_e1: 3, sg_e2: 3, sg_e3: 2, sg_r1: 3 },
  }[j2] || {}
  const t = process.env.J2T === '0' ? {} : process.env.J2T ? JSON.parse(process.env.J2T) : preset
  Object.assign(save, { job2: j2, job2Level: +(process.env.J2LV || 30), job2Xp: 0, job2Points: 0, job2Tree: t, jobLevel: 40 })
  save.clearsBy = { ...save.clearsBy, d5: Math.max(1, save.clearsBy.d5 || 0) }
  const w = process.env.J2W ?? { berserker: 'w_greatsword', knight: 'w_spear', rogue: 'w_assassin', mobster: 'w_assassin' }[j2] ?? { wizard: 'w_wizstaff', sage: 'w_sagebook' }[j2] // Phase 5 Mage
  if (w && w !== '0') { save.owned.push(w); save.equipped.weapon = w }
  const o = process.env.J2O ?? { rogue: 'o_rogueknife', mobster: 'o_mobknife' }[j2] // J2O=<off-hand id> (default the class dagger), J2O=0 keeps gear
  if (o && o !== '0') { save.owned.push(o); save.equipped.offhand = o }
}
if (process.env.REFINE) save.refine = Object.fromEntries(Object.values(save.equipped).map((id) => [id, +process.env.REFINE]))
if (process.env.BROKEN) save.broken = Object.values(save.equipped)
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage()
  let errors = 0
  p.on('pageerror', (e) => { errors++; if (process.env.DEBUG || process.env.MODE) console.error('pageerror', e.message, (e.stack || '').split('\n').slice(1, 4).join(' | ').slice(0, 400)) })
  await p.addInitScript((s) => { localStorage.setItem('novice-to-hero.save.v1', JSON.stringify(s)) }, save)
  await p.goto('file://' + html)
  await p.waitForFunction(() => window.__nth && window.__nth.scene.isActive('title'), null, { timeout: 30000 })
  await p.waitForFunction(() => window.__nth && window.__nth.scene.isActive('title'), null, { timeout: 30000 })
  const res = []
  for (let r = 0; r < RUNS; r++) {
    res.push(await p.evaluate(async ([first, RELIC, D, DUN, HARD, MODE, TOWER_MAX, SEED, TMO, START, PERK, EVENT, SMART, LAST]) => {
      const g = window.__nth, R = g.renderer
      R.preRender = () => {}; R.render = () => {}; R.postRender = () => {} // test only: skip drawing
      if (first) { g.scene.getScenes(true).forEach((s) => s.scene.stop()); g.scene.start('battle', MODE ? { mode: MODE, ...(SEED ? { seed: SEED } : {}), ...(START ? { startFloor: START } : {}) } : { d: DUN, hard: !!HARD }) }
      while (!window.__battle || !window.__battle.st) await new Promise((r) => setTimeout(r, 30))
      const B = window.__battle
      if (TMO === 1) return { power: B.run.power, o: Math.round(B.run.pp.offense), s: Math.round(B.run.pp.survival), st: Object.fromEntries(["maxHp","atk","minPct","crit","critMul","combo","aspd","doubleAtk","flee","luckyDodge","dodgeHeal","fleeFloor","def","pskill","s1Pow","ultPow","ultAmp","hit","regen"].map((k) => [k, +(+B.st[k]).toFixed(3)])) } // POWER=1: only print the Hero Power of this profile
      if (RELIC) B.testRelic = RELIC
      if (PERK) B.testPerk = PERK.split(',')
      if (EVENT) B.testEvent = EVENT
      if (MODE === 'tower') B.autoTower = TOWER_MAX // climb to this floor, then leave
      if (!first) B.startRun()
      await new Promise((r) => setTimeout(r, 60))
      const t0 = Date.now()
      while (!B.over && Date.now() - t0 < TMO) {
        B.time.timeScale = 15; B.tweens.timeScale = 15
        if (B.pendingPick) { // v48: 4 picks (old builds clamp) · PICK=smart: legendary > "+" > own line > general > other lines (พร v2 builds)
          const stuck = B.pendingPick === B.botLastPick; B.botLastPick = B.pendingPick // an event choice that slot 4 doesn't exist for: fall back to random
          const o = SMART && B.pendingOffers, score = (x) => (x.legend ? 4 : x.up ? 3 : x.own ? 2 : x.general ? 1 : 0) + Math.random() * 0.5
          B.pendingPick((B.miniWon && !B.relic && RELIC) || PERK ? 0 : o ? o.reduce((bi, x, i) => (score(x) > score(o[bi]) ? i : bi), 0) : LAST && !stuck && !(B.miniWon && !B.relic) ? 3 : Math.floor(Math.random() * 4))
        }
        const boss = B.alive().find((m) => m.def.ai === 'boss')
        // duelist never charges: ult when she is not in parry stance
        const want = !boss || boss.charging || (boss.def.mini === 'duelist' && !boss.parry && !boss.espadaArmed) || (boss.def.mini && !(boss.def.charge || boss.def.breakPct))
        if (!B.autoUltWant && B.smashCdLeft <= 0 && !B.smashQueued && want) B.queueSmash() // v55+: the game's auto ult (same rule) books it
        await new Promise((r) => setTimeout(r, 15))
      }
      const bm = B.mons.find((m) => m.def.ai === 'boss')
      return { power: B.run.power, enrage: B.enrageCount ?? 0, procHits: B.procHits ?? null, perks: B.perkList ? B.perkList() : '', imm: B.immortal ?? null, floor: B.towerFloor, mode: B.run.modeId, where: B.run.where(B.room), muts: B.run.mutators.map((m) => m.id).join('+'), mats: Object.values(B.runMats || {}).reduce((a, n) => a + n, 0), maxHp: Math.round(B.st.maxHp), minHp: B.minHpPct, mini: B.miniKind, miniWon: B.miniWon, relic: B.relic, parry: B.parryCount, frz: B.freezeCount, tl: (B.turnsLog || []).join('/'), win: B.over && B.hp > 0 && !B.timedOut, room: B.room, hp: Math.round(B.hp), bossHp: bm ? Math.max(0, Math.round(bm.hp)) : null, breaks: B.breakCount ?? 0, revived: B.revivedCount ?? 0, ctr: B.counterCount ?? 0, combo: B.comboCount ?? 0, el: B.job.id === 'mage' ? B.element : '', s2: B.s2Count ?? 0, to: !!B.timedOut, dbf: B.debuffCount ?? 0, peak: B.peakTurns ?? 0, ms: Date.now() - t0 }
    }, [r === 0, process.env.RELIC || '', D,  process.env.DUN ? +process.env.DUN : D >= 4 ? D - 1 : D, !!process.env.HARD, process.env.MODE || '', +(process.env.TOWER_MAX || 15), +(process.env.SEED || 0), +(process.env.POWER ? 1 : process.env.TMO || 120000), +(process.env.START || 0), process.env.PERK || '', process.env.EVENT || '', process.env.PICK === 'smart', process.env.PICK === 'last']))
  }
  if (process.env.POWER) { console.log(JSON.stringify({ job, D, ...res[0] })); await b.close(); return }
  if (process.env.DEBUG) console.log(JSON.stringify(res))
  const wins = res.filter((x) => x.win).length
  const minis = {}; for (const x of res) if (x.mini) { const k = x.mini; minis[k] = minis[k] || [0, 0, 0]; minis[k][0]++; if (x.miniWon) minis[k][1]++; if (x.win) minis[k][2]++ }
  const relics = {}; for (const x of res) if (x.relic) { relics[x.relic] = relics[x.relic] || [0, 0]; relics[x.relic][0]++; if (x.win) relics[x.relic][1]++ }
  if (process.env.MODE) console.log(JSON.stringify({ job, mode: process.env.MODE, seed: process.env.SEED, wins, runs: RUNS, power: res[0]?.power, floors: res.map((x) => x.floor).join(','), at: res.filter((x) => !x.win).map((x) => x.where + (x.to ? ' (หมดเทิร์น)' : '')), muts: res[0]?.muts, minHp: Math.round(100 * res.reduce((a, x) => a + x.minHp, 0) / res.length), errors }))
  console.log(JSON.stringify({ job, power: res[0]?.power, wins, runs: RUNS, minHp: Math.round(100 * res.reduce((a, x) => a + x.minHp, 0) / res.length), mats: res.map((x) => x.mats).join(','), ...(D >= 2 ? { minis, relics } : {}), deaths: res.filter((x) => !x.win).map((x) => `r${x.room + 1}[${x.maxHp}]` + (x.bossHp != null ? `(boss ${x.bossHp})` : '')), breaks: res.reduce((a, x) => a + x.breaks, 0), revives: res.reduce((a, x) => a + x.revived, 0), ctr: res.reduce((a, x) => a + (x.ctr || 0), 0), combo: res.reduce((a, x) => a + (x.combo || 0), 0), timeouts: res.filter((x) => x.to).length, debuffs: res.reduce((a, x) => a + (x.dbf || 0), 0), peakTurns: res.map((x) => x.peak).join(','), s2casts: res.reduce((a, x) => a + (x.s2 || 0), 0), els: res.map((x) => (x.el ? x.el[0] : '') + (x.win ? 'W' : 'L')).join(' '), errors }))
  await b.close()
})().catch((e) => { console.error(job, e.message); process.exit(1) })
