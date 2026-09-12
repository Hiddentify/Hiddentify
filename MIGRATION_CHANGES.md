# Scalability migration changes

This package is based on the saved `hiddentify-netlify-supabase.zip` project.

## Code changes already made

- Preserved existing Hiddentify UI, game rules, Supabase Auth, and Postgres schema.
- Added best-effort realtime room-change notifications to room creation, joining, and all mutating game actions.
- Added authenticated short-lived realtime tickets (`/api/realtime-ticket/[code]`).
- Added a dependency-free Node realtime gateway using Server-Sent Events (SSE).
- Added Redis Pub/Sub support to the realtime gateway so multiple gateway instances can share room events.
- Replaced aggressive polling with push-based room refreshes when `NEXT_PUBLIC_REALTIME_ENABLED=true`.
- Kept 30-second fallback polling in realtime mode and the original 2.5-second polling when realtime is disabled.
- Added `/api/health`.
- Made Postgres pool size configurable (`DATABASE_POOL_MAX`, default 5, capped at 20).
- Added Dockerfiles, Docker Compose, private Redis, and Nginx configuration.
- Added Hostinger deployment and scaling documentation.
- Added a zero-cost beta path using Vercel, Render, Upstash, and the existing Supabase project.
- Added a dedicated Supabase email/OAuth callback so confirmation links return to Hiddentify instead of ChatGPT/Sites.
- Added cross-origin realtime support for a separately hosted SSE gateway.
- Added an installable PWA manifest, service worker, Android icons, and a maskable app icon.
- Updated Next.js to the security-fixed 16.3.5 release and verified zero production dependency audit findings.
- Added Nginx request/body limits, endpoint rate limits, realtime connection limits, request IDs, and JSON access logs.
- Added container health checks, resource ceilings, log rotation, non-root application users, and no-new-privileges restrictions.
- Extended `/api/health` so a disconnected Redis subscriber makes staging health degrade instead of reporting a false success.
- Added duplicate-name and room-capacity database enforcement for simultaneous joins.
- Added a recurring VPS health-check timer template for application health, disk, memory, and load visibility.

## Important architecture choice

The game remains server-authoritative and Postgres remains the source of truth. Redis is introduced first for realtime fan-out rather than immediately moving all game state into Redis. This reduces migration risk. Ephemeral room state, presence, and timers can be moved to Redis after the Hostinger staging build is validated under load.

## Verification performed here

- `node --check realtime-gateway/server.mjs` passed.
- The realtime gateway was started locally with Redis disabled.
- A valid signed ticket opened an SSE stream.
- A publish request produced a `room_changed` event on that stream.
- The Next.js 16.3.5 production build, lint, and all automated tests pass in ChatGPT Work.
- Production dependencies report zero known vulnerabilities through `npm audit --omit=dev`.

The Docker image build and Redis-backed integration tests still need to run on the staging VPS, because Docker is not available in the ChatGPT Work runtime.
