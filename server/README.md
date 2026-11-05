# server/ — cloud save API

Cloudflare Worker (Hono) + Better Auth (anonymous guest + Google / Apple / Facebook / LINE) + Neon Postgres.
The game stays on GitHub Pages and talks to this API only when built with `VITE_API_URL`.

## Setup (one time)
1. Neon: create a project, copy the connection string.
2. `cd server && npm install && cp .dev.vars.example .dev.vars` and fill it in.
3. Better Auth tables: `npx auth migrate` (or `npx auth generate`, then run the SQL). Then run `schema.sql` (save / wallet / ledger / cheat_flag).
4. Providers: set `*_CLIENT_ID/SECRET` for the ones you want (unset = disabled). Redirect URI: `<BETTER_AUTH_URL>/api/auth/callback/<provider>`.
   LINE is a built-in provider (`socialProviders.line`); one channel only (multi-country needs the generic OAuth `line()` helper).
5. `ALLOWED_ORIGINS` = the GitHub Pages origin (no path), e.g. `https://<user>.github.io`.
6. `npm run dev` (local) / `wrangler secret put ...` + `npm run deploy`.
7. Game: set repo variable `VITE_API_URL` (Settings → Variables) to the Worker URL; local: `VITE_API_URL=http://localhost:8787 npm run dev`.

## Endpoints
| Route | What |
|---|---|
| `/api/auth/*` | Better Auth |
| `GET /save` · `PUT /save {data, rev}` | cloud save, optimistic `rev` (409 = conflict) |
| `GET /wallet` · `POST /wallet/spend {sku, opId}` | paid gems (server-priced, idempotent) |
| `POST /webhook/store` | 501 until a Store receipt verifier exists |
| `GET /config/live` | live balance config (public, ETag); `/admin/*` = balance editor API for `ADMIN_EMAILS` (see `docs/design/live-tuning.md`) |

## Anti-cheat
- Level 1 (`src/sanity.ts`): **log-only** → rows in `cheat_flag`; tune `CAPS` from real data, then start rejecting.
- Level 2: `paid_gems` lives only in `wallet`, never in the save blob; credit only via `creditPurchase()` (unique `receipt_id`).

## Known risks
- Cookies are cross-site (`SameSite=None`): Safari/ITP may block them. Fix: put the API on a subdomain of the game's own domain.
- Free `gems` are still client-editable (they can buy costumes and, in test builds, zeny). Paid gems cannot be exchanged for zeny.
