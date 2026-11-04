// Bundles tests/*.test.ts with esbuild (comes with vite) and runs them with node:test.
import { build } from 'esbuild'
import { readdirSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
const files = readdirSync('tests').filter((f) => f.endsWith('.test.ts')).map((f) => `tests/${f}`)
mkdirSync('node_modules/tests-out', { recursive: true })
await build({ entryPoints: files, bundle: true, platform: 'node', format: 'esm', outdir: 'node_modules/tests-out', outExtension: { '.js': '.mjs' }, logLevel: 'warning' })
const out = files.map((f) => resolve(`node_modules/tests-out/${f.slice(6, -3)}.mjs`))
process.exit(spawnSync(process.execPath, ['--test', ...out], { stdio: 'inherit' }).status ?? 1)
