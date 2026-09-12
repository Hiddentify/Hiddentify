# Hiddentify Hostinger deployment

This branch is prepared for a staged migration from the current deployment to a Hostinger VPS.

## What changed

- Existing server-authoritative game rules and Supabase/Postgres data model are preserved.
- Production Dockerfile added for the Next.js app.
- A dependency-free Node realtime gateway was added.
- Redis Pub/Sub fans room-change events across realtime gateway instances.
- The browser can use realtime Server-Sent Events (SSE) on Hostinger instead of polling the database every 2.5 seconds.
- A 30-second fallback refresh remains for resilience.
- Room subscriptions use short-lived signed tickets; the permanent player token is never placed in the realtime URL.
- `/api/health` checks the database and realtime gateway.
- Database pool size is configurable with `DATABASE_POOL_MAX`.

## Required private environment values

Copy `.env.example` to `.env.production` on the VPS. Never commit the production file.

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL` (Supabase transaction-pooler URL)
- `REALTIME_SECRET` (generate a random 32-byte or larger secret)
- `DATABASE_POOL_MAX=5` initially

The Docker Compose file supplies the internal Redis and realtime URLs automatically.

## Staging-first deployment

1. Point `staging.hiddentify.space` to the VPS IP.
2. Install Docker + Docker Compose and Nginx.
3. Put the repository in `/opt/hiddentify`.
4. Create `/opt/hiddentify/.env.production` with the private production values.
5. Restrict the environment file with `chmod 600 /opt/hiddentify/.env.production`.
6. Apply `supabase/001_hostinger_hardening.sql` once to the existing Supabase database. It makes simultaneous joins respect the ten-player capacity and case-insensitive name uniqueness.
7. Run `docker compose --env-file .env.production up -d --build`.
8. Install the Nginx config from `deploy/nginx/hiddentify.conf`.
9. Add HTTPS for `staging.hiddentify.space`.
10. Verify `https://staging.hiddentify.space/api/health`. Database, realtime, and Redis must all report healthy.
11. Test create room, join room, start game, role reveal, actions, voting, reconnect, and 3-10 simultaneous phones.
12. Install the health-check service and timer from `deploy/monitoring/`, then inspect it with `systemctl status hiddentify-health.timer` and `journalctl -t hiddentify-health`.
13. Only after staging is confirmed should `hiddentify.space` be switched to the VPS.

The included Nginx configuration limits request bodies, room creation, room joining, game actions, and realtime connections. Keep ports 3000 and 4000 bound to `127.0.0.1`; do not expose them through the VPS firewall.

## Realtime flow

1. The player joins/creates a room through the existing API.
2. The browser requests a short-lived realtime ticket from `/api/realtime-ticket/:code` using its player token in a request header.
3. Nginx proxies `/realtime/events` to the realtime gateway.
4. Mutating game API routes notify the internal realtime gateway after the Postgres write succeeds.
5. The gateway publishes a room-change event through Redis.
6. Every connected player in that room receives the event and refreshes the authoritative room state.

This is intentionally safer than moving all game rules into Redis immediately. Postgres remains the source of truth while Redis is used for real-time fan-out. Once production traffic warrants it, temporary room/presence state can be moved into Redis without changing the public client contract.

## Scale-up path

- Stage 1: one app container + one realtime gateway + Redis on one VPS.
- Stage 2: increase app/realtime replicas and place them behind Nginx; Redis Pub/Sub already allows cross-instance fan-out.
- Stage 3: move Redis to a managed/private Redis service so game server restarts do not affect realtime coordination.
- Stage 4: move ephemeral room/presence/timer state to Redis with TTLs; keep profiles, accounts, match history, and durable results in Supabase/Postgres.
- Stage 5: add load testing and horizontal scaling based on measured CPU, RAM, DB latency, connection count, and events/second.
