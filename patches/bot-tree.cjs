// usage: node bot.cjs <html> <job> <runs>
const { chromium } = require('playwright')
const [html, job, runsArg] = process.argv.slice(2)
const RUNS = +runsArg || 8
const alloc = {
  swordsman: { str: 8, vit: 7 }, archer: { dex: 8, agi: 7 }, mage: { int: 8, wis: 7 },
  cleric: { wis: 8, int: 7 }, thief: { agi: 8, luk: 7 },
}[job]
const stats = { str: 1, vit: 1, wis: 1, dex: 1, int: 1, luk: 1, agi: 1 }
for (const k in alloc) stats[k] += alloc[k]
const save = {
  v: 1, name: 'Bot', race: 'human', baseLevel: 5, baseXp: 0, statPoints: 0, jobLevel: 1, jobXp: 0, skillPoints: 0,
  skills: { smash: 1, firstaid: 0, tough: 0 }, job, jobSkills: { auto: 1, ult: 1 }, stats, zeny: 0, gems: 0,
  owned: ['knife', 'cloth', 'none', 'shortsword', 'leather'], equipped: { weapon: 'shortsword', armor: 'leather', acc: 'none' },
  ...(process.env.GEAR ? (() => { const [w, a, c] = { swordsman: ['w_bloodblade', 'a_thornmail', 'r_fist'], archer: ['w_hawkbow', 'a_eaglecloak', 'r_wind'], mage: ['w_wardstaff', 'a_runerobe', 'r_mana'], cleric: ['w_holymace', 'a_lightvestment', 'r_beads'], thief: ['w_shadowdagger', 'a_nightsuit', 'r_feather'] }[job]; return { owned: ['knife', 'cloth', 'none', w, a, c], equipped: { weapon: w, armor: a, acc: c } } })() : {}),
  ...(process.env.JL ? { jobLevel: +process.env.JL } : {}), ...(process.env.BL ? { baseLevel: +process.env.BL } : {}), ...(process.env.JS ? { jobSkills: JSON.parse(process.env.JS) } : {}), ...(process.env.TREE ? { jobTree: JSON.parse(process.env.TREE) } : {}), ...(process.env.TAL ? { jobTalents: JSON.parse(process.env.TAL) } : {}), costumes: ['default'], costume: 'default', supporter: false, clears: 1, bestRoom: 0, clearsBy: { d1: 1, d2: 1 }, lastDaily: '2099-01-01', muted: true,
}
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage()
  await p.addInitScript((d) => { window.__D = d }, process.env.D || 1)
  await p.addInitScript((s) => { localStorage.setItem('novice-to-hero.save.v1', JSON.stringify(s)) }, save)
  await p.goto('file://' + html)
  await p.waitForFunction(() => window.__nth && window.__nth.scene.isActive('title'), null, { timeout: 30000 })
  await p.waitForFunction(() => window.__nth && window.__nth.scene.isActive('title'), null, { timeout: 30000 })
  const res = []
  for (let r = 0; r < RUNS; r++) {
    res.push(await p.evaluate(async (first) => {
      const g = window.__nth, R = g.renderer
      R.preRender = () => {}; R.render = () => {}; R.postRender = () => {} // test only: skip drawing
      if (first) { g.scene.getScenes(true).forEach((s) => s.scene.stop()); g.scene.start('battle', { d: +(window.__D || 1) }) }
      while (!window.__battle || !window.__battle.st) await new Promise((r) => setTimeout(r, 30))
      const B = window.__battle
      if (!first) B.startRun()
      await new Promise((r) => setTimeout(r, 60))
      const t0 = Date.now()
      while (!B.over && Date.now() - t0 < 120000) {
        B.time.timeScale = 15; B.tweens.timeScale = 15
        if (B.pendingPick) B.pendingPick(Math.floor(Math.random() * 3))
        const boss = B.alive().find((m) => m.def.ai === 'boss')
        if (B.smashCdLeft <= 0 && !B.smashQueued && (!boss || boss.charging)) B.queueSmash()
        await new Promise((r) => setTimeout(r, 15))
      }
      const bm = B.mons.find((m) => m.def.ai === 'boss')
      return { tl: (B.turnsLog || []).join('/'), win: B.over && B.hp > 0 && !B.timedOut, room: B.room, hp: Math.round(B.hp), bossHp: bm ? Math.max(0, Math.round(bm.hp)) : null, breaks: B.breakCount ?? 0, revived: B.revivedCount ?? 0, ctr: B.counterCount ?? 0, combo: B.comboCount ?? 0, el: B.job.id === 'mage' ? B.element : '', to: !!B.timedOut, peak: B.peakTurns ?? 0, ms: Date.now() - t0 }
    }, r === 0))
  }
  if (process.env.DEBUG) console.log(JSON.stringify(res))
  const wins = res.filter((x) => x.win).length
  console.log(JSON.stringify({ job, wins, runs: RUNS, deaths: res.filter((x) => !x.win).map((x) => `r${x.room + 1}` + (x.bossHp != null ? `(boss ${x.bossHp})` : '')), breaks: res.reduce((a, x) => a + x.breaks, 0), revives: res.reduce((a, x) => a + x.revived, 0), ctr: res.reduce((a, x) => a + (x.ctr || 0), 0), combo: res.reduce((a, x) => a + (x.combo || 0), 0), timeouts: res.filter((x) => x.to).length, peakTurns: res.map((x) => x.peak).join(','), els: res.map((x) => (x.el ? x.el[0] : '') + (x.win ? 'W' : 'L')).join(' ') }))
  await b.close()
})().catch((e) => { console.error(job, e.message); process.exit(1) })
