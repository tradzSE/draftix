# Draftix

Real-time Valorant map veto and agent draft software built with React,
Express, and Socket.IO.

## Features

- Private room codes with reconnect-safe player tokens
- Team and captain assignment
- Configurable map veto, side selection, and agent bans
- Server-authoritative turn timers and automatic bans
- Undo, reset, rematch, room chat, and result export
- Local map artwork and responsive React interfaces
- Health, readiness, and protected admin metrics endpoints

## Requirements

- Node.js 20 or newer; Node.js 22 is used in CI and Docker
- npm

## Local development

```powershell
npm install
npm run build
npm start
```

Open `http://localhost:3000`.

For frontend-only Vite development:

```powershell
npm run dev:react
```

The real-time room features still require `server.js` on port 3000.

## Verification

```powershell
npm run build
npm test
npx playwright install chromium
npm run test:smoke
```

The integration tests start isolated servers with deterministic catalogs and
cover reconnect identity, captain authorization, map veto completion, and room
reset behavior. The browser smoke tests use a local Socket.IO room and mocked
Supabase tournament responses, so they do not write to production services.

## Environment

Copy the values from `.env.example` into the hosting provider. Real secrets
must never be committed. `ALLOWED_ORIGINS` is mandatory when
`NODE_ENV=production`.

## Production

See [DEPLOY.md](DEPLOY.md) for Docker, environment, domain, health-check,
monitoring, rollback, and scaling requirements.

## Architecture

```text
Browser (React)
       |
HTTPS / Socket.IO
       |
Express + in-memory room engine
       |
data/ (issued codes + catalog cache)
```

The current release should run as a single server instance. Redis-backed room
state is required before horizontal scaling.

## External data

Agent metadata is loaded from valorant-api.com. Map artwork is served locally.
The last successful catalog is cached in `data/catalog-cache.json` so a later
third-party outage does not prevent startup.

Draftix is an unofficial community project and is not endorsed by Riot Games.

## License

MIT. See [LICENSE](LICENSE).
