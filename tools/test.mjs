// Bundles tests/*.test.ts with esbuild (comes with vite) and runs them with node:test.
import { build } from 'esbuild'
import { readdirSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
// v78: output in the repo's own .tests-out/ (not node_modules) so two worktrees sharing one node_modules junction never clash
const files = readdirSync('tests').filter((f) => f.endsWith('.test.ts')).map((f) => `tests/${f}`)
mkdirSync('.tests-out', { recursive: true })
await build({ entryPoints: files, bundle: true, platform: 'node', format: 'esm', outdir: '.tests-out', outExtension: { '.js': '.mjs' }, logLevel: 'warning' })
const out = files.map((f) => resolve(`.tests-out/${f.slice(6, -3)}.mjs`))
process.exit(spawnSync(process.execPath, ['--test', ...out], { stdio: 'inherit' }).status ?? 1)
