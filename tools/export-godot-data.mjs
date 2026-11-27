// Exports the engine-free balance data in src/data/ to JSON for the Godot prototype (godot/data/*.json).
// The TS data stays the single source of truth: re-run this after changing it, and commit the JSON.
// usage: node tools/export-godot-data.mjs   (or npm run export:godot)
// Functions (e.g. AffixDef.mon) are dropped by JSON.stringify; the Godot side re-implements behaviour by id.
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'godot/data')
const tmp = resolve(root, '.tests-out/export-godot-data.mjs')

const entry = `
export { MONSTERS } from './src/data/monsters'
export { DUNGEONS } from './src/data/dungeon-defs'
export { AFFIXES } from './src/data/affixes'
`
await build({
  stdin: { contents: entry, resolveDir: root, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'error',
})
const data = await import(pathToFileURL(tmp).href + `?t=${Date.now()}`)

/** Keyed tables become arrays with an `id`, so Godot can iterate in a stable order. */
const monsters = Object.entries(data.MONSTERS).map(([id, def]) => ({ id, ...def }))
const tables = {
  monsters,
  dungeons: data.DUNGEONS,
  affixes: data.AFFIXES,
}

mkdirSync(outDir, { recursive: true })
for (const [name, rows] of Object.entries(tables)) {
  const file = resolve(outDir, `${name}.json`)
  writeFileSync(file, JSON.stringify({ version: 1, rows }, null, 1) + '\n')
  console.log(`godot/data/${name}.json  ${rows.length} rows`)
}
