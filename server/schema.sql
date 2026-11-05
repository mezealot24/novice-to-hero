-- App tables (Better Auth creates its own: run `npx @better-auth/cli migrate` against the same DB).
-- Access is only through the Worker, which always filters by the session's user_id; clients never hold DB credentials.
create table if not exists player_save (
  user_id text primary key,
  data jsonb not null,
  version int not null default 1,
  rev int not null default 1,
  updated_at timestamptz not null default now()
);
-- Real-money gems live ONLY here (never inside the client-editable save blob).
create table if not exists wallet (
  user_id text primary key,
  paid_gems int not null default 0 check (paid_gems >= 0),
  updated_at timestamptz not null default now()
);
-- Ledger. receipt_id is unique per store transaction => a receipt can only credit once. Spends use a client-chosen op id.
create table if not exists wallet_tx (
  id bigserial primary key,
  user_id text not null,
  kind text not null check (kind in ('purchase','spend')),
  delta int not null,
  sku text,
  receipt_id text unique,
  created_at timestamptz not null default now()
);
create index if not exists wallet_tx_user on wallet_tx (user_id, created_at desc);
create table if not exists cheat_flag (
  id bigserial primary key,
  user_id text not null,
  rule text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists cheat_flag_user on cheat_flag (user_id, created_at desc);
-- Live balance config (src/data/tunables.ts + patch.ts). Only the Worker writes it, only for ADMIN_EMAILS.
-- One row per release: 'draft' (being edited, at most one) -> 'live' (at most one, served by GET /config/live) -> 'archived'.
-- A rollback inserts a NEW live row copying an old patch, so ids / hashes only move forward (game caches by hash).
create table if not exists config_release (
  id bigserial primary key,
  schema_ver int not null,
  patch jsonb not null,
  guards jsonb not null default '{}'::jsonb,
  hash text not null,
  note text not null default '',
  status text not null check (status in ('draft','live','archived')),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_by text,
  published_at timestamptz,
  rollback_of bigint
);
create unique index if not exists config_release_one_live on config_release ((status)) where status = 'live';
create unique index if not exists config_release_one_draft on config_release ((status)) where status = 'draft';
create index if not exists config_release_recent on config_release (id desc);
