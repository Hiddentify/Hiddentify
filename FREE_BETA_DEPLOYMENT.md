# Hiddentify free-beta deployment

This path keeps the current `hiddentify.space` production deployment unchanged while a separate beta is tested.

## Architecture

- Vercel Hobby: Next.js UI and authoritative game API
- Supabase Free: email authentication and durable PostgreSQL data
- Render Free: realtime SSE gateway
- Upstash Free: Redis Pub/Sub
- `staging.hiddentify.space`: beta website
- `realtime-staging.hiddentify.space`: beta realtime gateway

The free tiers are suitable for an early private beta. Render can sleep after inactivity, and Vercel Hobby is for personal/non-commercial use. Upgrade before monetizing or advertising the game.

## 1. Supabase database and authentication

1. Keep the existing Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql` once for a new database. For an existing database, first inspect duplicate player names, then run `supabase/001_hostinger_hardening.sql`.
3. Open **Authentication → Providers → Email** and enable email/password sign-in.
4. Keep **Confirm email** enabled.
5. Open **Authentication → URL Configuration**.
6. Keep the current production Site URL unchanged until beta passes.
7. Add these Redirect URLs:
   - `https://staging.hiddentify.space/auth/callback`
   - `https://staging.hiddentify.space/reset-password`
   - the exact Vercel preview URL followed by `/auth/callback`
   - the exact Vercel preview URL followed by `/reset-password`
8. Do not place the database password or connection string in GitHub.

The public `accounts` table is expected to be empty until a confirmed Supabase Auth user finishes choosing a Hiddentify username. Supabase Auth users appear under **Authentication → Users**, not only in Table Editor.

## 2. Upstash Redis

1. Create one free Redis database in an EU region.
2. Copy its TLS Redis connection URL (`rediss://...`) into a private password manager.
3. Never commit it. Enter it only as Render's private `REDIS_URL` variable.

## 3. Realtime gateway on Render

1. Connect the GitHub repository to Render.
2. Create the service from `render.yaml` using the Free plan.
3. Enter private values when Render asks:
   - `REDIS_URL`: the Upstash TLS Redis URL
   - `REALTIME_SECRET`: one long random secret (at least 32 random bytes)
4. Set `ALLOWED_ORIGINS` to the staging and production HTTPS origins.
5. Deploy and verify `https://YOUR-RENDER-SERVICE.onrender.com/health` reports `status: ok` and `redis: true`.
6. Add `realtime-staging.hiddentify.space` as the Render custom domain, but do not change the production apex domain.

## 4. Next.js app on Vercel

1. Import the same GitHub repository into Vercel.
2. The included `vercel.json` selects the production Next.js build.
3. Add these environment variables for Preview and Production:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `DATABASE_URL` (Supabase transaction-pooler URL, port 6543)
   - `DATABASE_POOL_MAX=1`
   - `NEXT_PUBLIC_REALTIME_ENABLED=true`
   - `NEXT_PUBLIC_REALTIME_URL=https://realtime-staging.hiddentify.space`
   - `REALTIME_INTERNAL_URL=https://realtime-staging.hiddentify.space`
   - `REALTIME_SECRET` (exactly the same private value used by Render)
4. Deploy to the generated Vercel address first.
5. Verify `/api/health` reports `authentication: true`, `database: true`, `schema: true`, `realtime: true`, and `redis: true`.
6. Only after the generated URL works, add `staging.hiddentify.space` as the Vercel custom domain and add its DNS record.

## 5. Required functional test

Use separate private/incognito windows or separate phones:

1. Create and confirm one email account.
2. Log out and log back in.
3. Create a room as that account.
4. Join with a guest from a second phone.
5. Join with another confirmed account from a third phone.
6. Confirm the player list updates without manual refresh.
7. Test duplicate names, invalid room code, reconnect, background/foreground, game modes, killer count, roles, evidence, Detective actions, voting, reveal, and replay.
8. Inspect Vercel, Render, Supabase, and Upstash logs/usage after the test.

Do not move `hiddentify.space` until every critical test passes and a rollback plan is recorded.

## 6. Phone-app path

The website includes an installable PWA manifest and service worker. Android users can install it from the browser, and iPhone users can use **Safari → Share → Add to Home Screen**. After the beta is stable, package the same PWA for Google Play using a Trusted Web Activity. App Store distribution requires a native wrapper and an Apple Developer account.
