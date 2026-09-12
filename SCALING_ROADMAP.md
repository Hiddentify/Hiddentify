# Hiddentify scaling roadmap

## Implemented in this package

- Hostinger-ready Docker deployment.
- Private Redis container (not exposed to the internet).
- Realtime room-update gateway with Redis Pub/Sub.
- Signed short-lived realtime subscription tickets.
- Realtime client refresh path behind a build-time feature flag.
- 30-second fallback refresh when realtime is enabled.
- Existing 2.5-second polling retained automatically when realtime is disabled, preserving the old deployment.
- Health endpoint for database + realtime checks.
- Configurable Postgres connection pool.
- Nginx reverse-proxy configuration with buffering disabled for SSE.

## Next after staging is stable

1. Add structured logs and uptime monitoring.
2. Add per-IP and per-player rate limits to create/join/action routes.
3. Add Redis presence keys with TTLs for online/offline status.
4. Move temporary timers and disposable room metadata to Redis.
5. Keep final match results, profiles, account data, and long-term stats in Postgres.
6. Run load tests at 50, 100, 250, 500, then 1,000 concurrent simulated clients.
7. Split app/realtime containers across more VPS instances only after measurements show a real bottleneck.
8. For 10,000 concurrent players, use a load balancer, multiple app/realtime instances, managed Redis, observability, and tuned Supabase/Postgres limits.
