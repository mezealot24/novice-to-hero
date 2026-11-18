// Exports the engine-free balance data in src/data/ to JSON for the Godot game, which is a separate
// project (its own folder, not part of this repo). src/data stays the single source of truth for
// monster and dungeon stats: re-run this after changing it.
// usage: npm run export:godot -- "<path to the Godot project>/data"
//   e.g. npm run export:godot -- "D:/projects/Game Development/Novice to Hero/data"
// Functions (e.g. a monster's custom hooks) are dropped by JSON.stringify; Godot re-implements behaviour by id.
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outArg = process.argv[2]
if (!outArg) {
  console.error('usage: npm run export:godot -- "<path to the Godot project>/data"')
  process.exit(1)
}
const outDir = resolve(outArg)
const tmp = resolve(root, '.tests-out/export-godot-data.mjs')

const entry = `
export { MONSTERS } from './src/data/monsters'
export { DUNGEONS } from './src/data/dungeon-defs'
`
await build({
  stdin: { contents: entry, resolveDir: root, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'error',
})
const data = await import(pathToFileURL(tmp).href + `?t=${Date.now()}`)

/** Keyed tables become arrays of rows with an `id`, so Godot iterates them in a stable order. */
const tables = {
  monsters: Object.entries(data.MONSTERS).map(([id, def]) => ({ id, ...def })),
  dungeons: data.DUNGEONS,
}

mkdirSync(outDir, { recursive: true })
for (const [name, rows] of Object.entries(tables)) {
  // One row per line: small file, readable diffs.
  const body = rows.map((r) => ' ' + JSON.stringify(r)).join(',\n')
  writeFileSync(resolve(outDir, `${name}.json`), `{"version": 1, "rows": [\n${body}\n]}\n`)
  console.log(`${resolve(outDir, `${name}.json`)}  ${rows.length} rows`)
}
