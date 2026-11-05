// One-off: create Better Auth tables + app tables (schema.sql) in the DB from .dev.vars. Safe to re-run.
import { readFileSync } from 'node:fs'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { getMigrations } from 'better-auth/db/migration'
import { createAuth } from '../src/auth.ts'

neonConfig.webSocketConstructor = ws
const env = Object.fromEntries(readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8').split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
const pool = new Pool({ connectionString: env.DATABASE_URL })
const auth = createAuth(env, pool)
const { runMigrations, toBeCreated, toBeAdded } = await getMigrations(auth.options)
console.log('auth: create', toBeCreated.map((t) => t.table), 'alter', toBeAdded.map((t) => t.table))
await runMigrations()
await pool.query(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'))
const { rows } = await pool.query("select table_name from information_schema.tables where table_schema = 'public' order by 1")
console.log('tables:', rows.map((r) => r.table_name).join(', '))
await pool.end()
