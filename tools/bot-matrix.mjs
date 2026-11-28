#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BOT_CJS = path.join(__dirname, 'bot.cjs')

function parseArgs(argv) {
  const opts = {
    matrix: '',
    workers: Math.min(7, Math.max(1, os.cpus().length)),
    runs: 0,
    shard: 5,
    out: path.join(process.cwd(), 'r1_results'),
    seed: 10000,
    failFast: false,
    filter: '',
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--matrix') opts.matrix = argv[++i] || ''
    else if (a === '--workers') opts.workers = Math.max(1, Math.min(16, +(argv[++i] || opts.workers)))
    else if (a === '--runs') opts.runs = Math.max(0, +(argv[++i] || 0))
    else if (a === '--shard') opts.shard = Math.max(1, +(argv[++i] || 5))
    else if (a === '--out') opts.out = argv[++i] || opts.out
    else if (a === '--seed') opts.seed = +(argv[++i] || 10000)
    else if (a === '--fail-fast') opts.failFast = true
    else if (a === '--filter') opts.filter = argv[++i] || ''
    else {
      console.error(`Unknown arg: ${a}`)
      process.exit(1)
    }
  }
  if (!opts.matrix) {
    console.error('Usage: node tools/bot-matrix.mjs --matrix <matrix.json> [--workers 7] [--runs 20] [--shard 5] [--out <dir>] [--seed 10000] [--fail-fast] [--filter regex]')
    process.exit(1)
  }
  return opts
}

function splitShards(total, maxPerShard) {
  const count = Math.max(1, Math.ceil(total / maxPerShard))
  const base = Math.floor(total / count)
  const rem = total % count
  const out = []
  for (let i = 0; i < count; i++) out.push(base + (i < rem ? 1 : 0))
  return out
}

function runShard(task) {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      LITE: '1',
      PICK: 'smart',
      DEBUG: '1',
      ...task.env,
      BOT_SEED: String(task.botSeed),
    }
    const t0 = Date.now()
    const child = spawn(process.execPath, [BOT_CJS, task.html, task.job, String(task.runs)], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d.toString() })
    child.stderr.on('data', (d) => { stderr += d.toString() })
    child.on('close', (code) => {
      const wallMs = Date.now() - t0
      const lines = stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      let rawRuns = null
      let summary = null
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line)
          if (Array.isArray(parsed)) rawRuns = parsed
          else if (parsed && typeof parsed === 'object' && 'runs' in parsed && 'wins' in parsed) summary = parsed
        } catch {}
      }
      const errCount = summary?.errors ?? 0
      const ok = code === 0 && Array.isArray(rawRuns) && rawRuns.length === task.runs && errCount === 0
      resolve({
        task,
        ok,
        code,
        wallMs,
        rawRuns: rawRuns || [],
        summary,
        stderr: stderr.trim(),
        stdout: stdout.trim(),
      })
    })
  })
}

function aggregateConfig(cfg, shardResults) {
  const runs = shardResults.flatMap((r) => r.rawRuns)
  const n = runs.length
  const sum = (fn) => runs.reduce((a, x) => a + (fn(x) || 0), 0)
  const mean = (fn, dp = 1) => (n > 0 ? +(sum(fn) / n).toFixed(dp) : 0)
  const wins = runs.filter((x) => x.win).length
  const sumTurns = Math.max(1, sum((x) => x.totalTurns))
  const sumDmg = sum((x) => x.totalDmg)
  const sumUlt = sum((x) => x.ultDmg)
  const sumUltWin = sum((x) => x.ultWinDmg)
  const sumNonUlt = Math.max(0, sumDmg - sumUlt)
  const pct = (v) => (sumDmg > 0 ? +(100 * v / sumDmg).toFixed(1) : 0)
  const errors = shardResults.reduce((a, r) => a + (r.summary?.errors ?? (r.ok ? 0 : 1)), 0)
  const wallMs = shardResults.reduce((a, r) => a + r.wallMs, 0)
  return {
    id: cfg.id,
    name: cfg.name || cfg.id,
    group: cfg.group || '',
    job: cfg.job,
    job2: cfg.env?.JOB2 || '',
    job3: cfg.env?.JOB3 || '',
    n,
    wins,
    winRate: n > 0 ? +(100 * wins / n).toFixed(1) : 0,
    power: runs[0]?.power ?? 0,
    offense: runs[0]?.o ?? 0,
    survival: runs[0]?.s ?? 0,
    meanMinHp: Math.round(100 * (n > 0 ? sum((x) => x.minHp) / n : 0)),
    meanTurns: mean((x) => x.totalTurns, 1),
    meanPeak: mean((x) => x.peak, 1),
    meanRoom: mean((x) => (x.room ?? 0) + (x.win ? 1 : 0), 1),
    meanFloor: mean((x) => x.floor || 0, 1),
    totalDmg: Math.round(n > 0 ? sumDmg / n : 0),
    nonUltDmg: Math.round(n > 0 ? sumNonUlt / n : 0),
    ultDmg: Math.round(n > 0 ? sumUlt / n : 0),
    totalDpt: +(sumDmg / sumTurns).toFixed(1),
    nonUltDpt: +(sumNonUlt / sumTurns).toFixed(1),
    ultDpt: +(sumUlt / sumTurns).toFixed(1),
    ultPct: pct(sumUlt),
    ultWinPct: pct(sumUltWin),
    s1Pct: pct(sum((x) => x.s1Dmg)),
    s2Pct: pct(sum((x) => x.s2Dmg)),
    s3Pct: pct(sum((x) => x.s3Dmg)),
    s4Pct: pct(sum((x) => x.s4Dmg)),
    basicPct: pct(sum((x) => x.basicDmg)),
    counterPct: pct(sum((x) => x.counterDmg)),
    procPct: pct(sum((x) => x.procDmg)),
    dotPct: pct(sum((x) => x.dotDmg)),
    allyPct: pct(sum((x) => x.allyDmg)),
    dawnDmg: Math.round(n > 0 ? sum((x) => x.dawnDmg) / n : 0),
    faithDmg: Math.round(n > 0 ? sum((x) => x.faithDmg) / n : 0),
    haymakerDmg: Math.round(n > 0 ? sum((x) => x.haymakerDmg) / n : 0),
    spearDmg: Math.round(n > 0 ? sum((x) => x.spearDmg) / n : 0),
    healedHp: Math.round(n > 0 ? sum((x) => x.healedHp) / n : 0),
    shieldSoaked: Math.round(n > 0 ? sum((x) => x.shieldSoaked) / n : 0),
    blocks: mean((x) => x.blocks, 1),
    dodges: mean((x) => x.dodges, 1),
    timeouts: runs.filter((x) => x.to).length,
    jsTimeouts: runs.filter((x) => x.jsTimeout).length,
    errors,
    wallMs,
  }
}

function toCsvCell(v) {
  const s = String(v ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const matrixPath = path.resolve(opts.matrix)
  const spec = JSON.parse(fs.readFileSync(matrixPath, 'utf8'))
  const defaults = spec.defaults || {}
  const defaultHtml = path.resolve(defaults.html || 'dist/index.html')
  const filterRe = opts.filter ? new RegExp(opts.filter) : null
  const configs = (spec.configs || []).filter((c) => !filterRe || filterRe.test(c.id))
  if (!configs.length) {
    console.error('No matching configs in matrix.')
    process.exit(1)
  }

  const tasks = []
  const byConfig = new Map()
  configs.forEach((cfg, cfgIdx) => {
    const totalRuns = opts.runs > 0 ? opts.runs : (cfg.runs || defaults.runs || 20)
    const shardSize = cfg.shard || defaults.shard || opts.shard
    const shards = splitShards(totalRuns, shardSize)
    const html = path.resolve(cfg.html || defaultHtml)
    const mergedEnv = { ...(defaults.env || {}), ...(cfg.env || {}) }
    byConfig.set(cfg.id, { cfg, expectedShards: shards.length, results: [] })
    shards.forEach((n, shardIdx) => {
      tasks.push({
        cfgId: cfg.id,
        cfgIdx,
        shardIdx,
        shardTotal: shards.length,
        html,
        job: cfg.job,
        runs: n,
        env: mergedEnv,
        botSeed: opts.seed + cfgIdx * 10000 + shardIdx * 100,
      })
    })
  })

  fs.mkdirSync(opts.out, { recursive: true })
  console.error(`[bot-matrix] configs=${configs.length} shards=${tasks.length} workers=${opts.workers} seed=${opts.seed} out=${opts.out}`)

  let nextIdx = 0
  let completed = 0
  let failed = 0
  let stopEarly = false
  const tStart = Date.now()

  async function workerLoop() {
    while (true) {
      if (stopEarly) return
      const idx = nextIdx++
      if (idx >= tasks.length) return
      const task = tasks[idx]
      const res = await runShard(task)
      completed++
      byConfig.get(task.cfgId).results.push(res)
      if (!res.ok) {
        failed++
        console.error(`[FAIL ${completed}/${tasks.length}] ${task.cfgId} shard ${task.shardIdx + 1}/${task.shardTotal} code=${res.code} runs=${res.rawRuns.length}/${task.runs} stderr=${res.stderr.slice(0, 300)}`)
        if (opts.failFast) stopEarly = true
      } else {
        const s = res.summary
        console.error(`[${completed}/${tasks.length}] ${task.cfgId} (${task.shardIdx + 1}/${task.shardTotal}) wins=${s.wins}/${s.runs} pwr=${s.power} dpt=${s.totalDpt} ult=${s.ultPct}% ${(res.wallMs / 1000).toFixed(1)}s`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(opts.workers, tasks.length) }, () => workerLoop()))

  const summaries = []
  const rawByConfig = {}
  for (const cfg of configs) {
    const entry = byConfig.get(cfg.id)
    entry.results.sort((a, b) => a.task.shardIdx - b.task.shardIdx)
    summaries.push(aggregateConfig(cfg, entry.results))
    rawByConfig[cfg.id] = entry.results.flatMap((r) => r.rawRuns)
  }

  const resultsJsonPath = path.join(opts.out, 'results.json')
  const summaryCsvPath = path.join(opts.out, 'summary.csv')
  const payload = {
    generatedAt: new Date().toISOString(),
    wallMs: Date.now() - tStart,
    workers: opts.workers,
    baseSeed: opts.seed,
    failedShards: failed,
    summaries,
    runs: rawByConfig,
  }
  fs.writeFileSync(resultsJsonPath, JSON.stringify(payload, null, 2))

  const cols = Object.keys(summaries[0])
  const csvLines = [
    cols.join(','),
    ...summaries.map((row) => cols.map((c) => toCsvCell(row[c])).join(',')),
  ]
  fs.writeFileSync(summaryCsvPath, csvLines.join('\n') + '\n')

  console.log(JSON.stringify({
    configs: summaries.length,
    totalRuns: summaries.reduce((a, s) => a + s.n, 0),
    failedShards: failed,
    wallSec: +((Date.now() - tStart) / 1000).toFixed(1),
    resultsJson: resultsJsonPath,
    summaryCsv: summaryCsvPath,
  }))

  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error('bot-matrix fatal:', e)
  process.exit(1)
})
