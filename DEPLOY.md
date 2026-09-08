# Draftix production deployment

Draftix is a Node.js 22 application serving a Vite-built React client and a
Socket.IO server from the same origin. The production host must support
long-lived WebSocket connections.

## Recommended split deployment

The React frontend can be deployed to Vercel while the persistent Node and
Socket.IO backend runs on a container host. Set `VITE_SOCKET_URL` in Vercel to
the backend's public HTTPS origin. On the backend, include every Vercel preview
and production frontend origin you intend to allow in `ALLOWED_ORIGINS`.

Local development does not require `VITE_SOCKET_URL`; the client uses its own
origin by default.

### Backend selection

The client supports two draft backends, selected at build time by
`src/socket/draftSocket.js`:

| Backend | When it is active | Reconnects / resume |
| --- | --- | --- |
| Supabase | `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` are set | Automatic — rooms persist in Postgres and rejoining restores roles via the anonymous auth UID |
| Socket.IO (this section) | Supabase variables absent | Resume tokens stored in `localStorage` re-key a player's seat within the reconnect grace window (see `test/test-resume.js`) |

Both paths expose the same client interface; the UI is unaware of which is
active. Do not set the Supabase variables if you intend to run the Node
backend — the Supabase client takes priority when both are configured.

## 1. Verify the release locally

```powershell
npm ci
npm run build
npm test
```

Both the build and integration suite must pass before deployment.

## 2. Configure the environment

Copy `.env.example` into the deployment provider's environment settings. Do
not commit a real `.env` file.

Required production values:

```text
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://draftix.tech,https://www.draftix.tech
TRUST_PROXY=1
ADMIN_STATS_TOKEN=<at-least-24-random-characters>
```

Generate the admin token with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The server intentionally refuses to start in production when
`ALLOWED_ORIGINS` is missing.

## 3. Container deployment

Build the image:

```powershell
docker build -t draftix:latest .
```

Run it locally with production settings:

```powershell
docker run --rm -p 3000:3000 --env-file .env draftix:latest
```

Check:

```text
http://localhost:3000/healthz
http://localhost:3000/readyz
```

Mount `/app/data` as a persistent volume. It stores issued room codes and the
last successful Valorant catalog cache.

## 4. Reverse proxy requirements

The proxy or hosting provider must:

- terminate HTTPS;
- forward `Upgrade` and `Connection` headers for WebSockets;
- preserve the client IP through `X-Forwarded-For`;
- allow requests to remain open for Socket.IO connections;
- route all paths to the same Node process.

Use one application instance until shared room storage is implemented. Running
multiple instances today can split players in the same room across different
in-memory session stores.

## 5. Domain launch

1. Deploy to a staging hostname first.
2. Set `ALLOWED_ORIGINS` to the staging URL and test two remote browsers.
3. Point the `draftix.tech` DNS records to the production host.
4. Enable HTTPS and choose one canonical hostname.
5. Update `ALLOWED_ORIGINS` with the final HTTPS hostname(s).
6. Verify `/healthz`, `/readyz`, room creation, reconnect, chat, and a complete veto.

## 6. Monitoring

Monitor `/readyz` every minute. Alert after two consecutive failures. Retain
server stdout/stderr logs and watch for:

- repeated catalog fallback warnings;
- rate-limit spikes;
- process restarts;
- memory growth;
- WebSocket connection failures.

The admin metrics route is disabled unless `ADMIN_STATS_TOKEN` contains at
least 24 characters. Prefer the `Authorization: Bearer <token>` header instead
of placing the token in a URL.

## 7. Rollback

Keep the previous container image or deployment revision. If post-deployment
checks fail, route traffic back to that revision and preserve the `/app/data`
volume.

## Supabase room retention

Run every SQL migration in `supabase/migrations` in filename order. Rooms renew
their expiry for two hours whenever a member performs a room action. The
`draftix-delete-expired-rooms` Cron job runs at minute 17 of every hour and
deletes up to 1,000 expired rooms. Related players and chat messages are removed
automatically through foreign-key cascades.

The `202609090001_activity_analytics.sql` migration is required for truthful
acquisition reporting. It records only timestamped product events (room created,
room completed, tournament created), never room content or player data. These
append-only events are not removed when expired rooms are cleaned up. The first
run backfills only rooms and tournaments that still exist; counts from rooms
already deleted before the migration cannot be recovered.

Check recent cleanup runs in the Supabase Cron job history. To test the cleanup
function without waiting for the schedule, run:

```sql
select public.draftix_delete_expired_rooms(1000);
```

## Known scaling boundary

Draft rooms are currently in process memory. Before running more than one
server instance, implement Redis-backed room state and the Socket.IO Redis
adapter. PostgreSQL is optional and only needed for permanent accounts or match
history.

## Asset optimization

Static images are shipped as resized WebP (quality 80) via
`npm run optimize:images`, and `public/music/bg-music.mp3` is encoded at
96 kbps. `scripts/sync-valorant-agents.mjs` downloads agent art directly as
WebP and preserves custom agents (miks, veto) that are not in the public API.
Re-run `npm run optimize:images` after adding new PNG assets.
