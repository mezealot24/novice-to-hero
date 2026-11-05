import { betterAuth } from 'better-auth'
import { anonymous } from 'better-auth/plugins'
import { Pool } from '@neondatabase/serverless'

export interface Env {
  DATABASE_URL: string; BETTER_AUTH_SECRET: string; BETTER_AUTH_URL: string; ALLOWED_ORIGINS: string
  GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string
  APPLE_CLIENT_ID?: string; APPLE_CLIENT_SECRET?: string
  FACEBOOK_CLIENT_ID?: string; FACEBOOK_CLIENT_SECRET?: string
  LINE_CLIENT_ID?: string; LINE_CLIENT_SECRET?: string
  ADMIN_EMAILS?: string // comma list: who may edit the live balance config (admin.html). Google sign-in only.
}

export const origins = (env: Env) => env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)

/** Only providers whose credentials are set are enabled (missing ones are skipped, not broken). */
function providers(env: Env) {
  const p: Record<string, { clientId: string; clientSecret: string }> = {}
  const add = (name: string, id?: string, secret?: string) => { if (id && secret) p[name] = { clientId: id, clientSecret: secret } }
  add('google', env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET)
  add('apple', env.APPLE_CLIENT_ID, env.APPLE_CLIENT_SECRET)
  add('facebook', env.FACEBOOK_CLIENT_ID, env.FACEBOOK_CLIENT_SECRET)
  add('line', env.LINE_CLIENT_ID, env.LINE_CLIENT_SECRET) // built-in provider (better-auth docs: authentication/line)
  return p
}

export function createAuth(env: Env, pool: Pool) {
  return betterAuth({
    database: pool,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [...origins(env), 'https://appleid.apple.com'],
    socialProviders: providers(env),
    account: { accountLinking: { enabled: true, trustedProviders: ['google', 'apple', 'facebook', 'line'] } },
    // game (GitHub Pages) and API are different sites: cookies must be SameSite=None; Secure.
    // Safari/ITP may still block them: move the API to a subdomain of the game's domain when one exists.
    advanced: { defaultCookieAttributes: { sameSite: 'none', secure: true } },
    plugins: [
      anonymous({
        // Signing in with a social account that already has its own user: carry the guest's progress over
        // unless that account already has a save (then the existing one wins, the guest save is dropped).
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          const a = anonymousUser.user.id, b = newUser.user.id
          await pool.query('update player_save set user_id = $2 where user_id = $1 and not exists (select 1 from player_save where user_id = $2)', [a, b])
          await pool.query('insert into wallet (user_id, paid_gems) select $2, paid_gems from wallet where user_id = $1 on conflict (user_id) do update set paid_gems = wallet.paid_gems + excluded.paid_gems', [a, b])
          await pool.query('delete from wallet where user_id = $1', [a])
        },
      }),
    ],
  })
}
