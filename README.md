# PrepPilot

AI-powered interview preparation. A candidate answers a short set of AI-generated
intake questions about the interview they are preparing for, and PrepPilot uses
Anthropic Claude to build a **day-by-day study plan**. Each plan
then grows into:

- **Learning docs** - AI-generated study material per topic
- **Question bank** - likely interview questions you can track and mark up
- **Quizzes** - generated quizzes with scored attempts
- **Mock interviews** - an interactive interview where the AI asks, you answer, and you get feedback when it ends

PrepPilot ships as a REST API, a Next.js web app and an Expo mobile app that
share one TypeScript contract.

---

## Architecture

```
  +------------------+      +-------------------------+
  |  Mobile (Expo)   |      |   Web (Next.js 16)      |
  |  iOS / Android   |      |   /api/v1/* proxied to  |
  |  SecureStore     |      |   API_URL (same-origin) |
  +--------+---------+      +------------+------------+
           |  HTTPS + Bearer JWT         |  HTTP (server-side)
           +--------------+--------------+
                          v
              +-----------------------+           +----------------------+
              |   API (Express 5)     |---------->|  Anthropic Claude    |
              |   /api/v1, auth, CRUD |           |  (server key or      |
              |   enqueues AI jobs    |           |   per-user key)      |
              +-----------+-----------+           +----------^-----------+
                          |  SQL (pg)                        |
                          v                                  |
              +-----------------------+   poll/claim  +------+---------------+
              |   PostgreSQL 17       |<------------->|  Worker (Node)       |
              |   app data + jobs     |    jobs table |  AI generation jobs  |
              +-----------------------+               +----------------------+
```

- Long-running AI work (plans, learning docs, quizzes...) is written to a
  Postgres **jobs table** and processed by the **worker**. Clients poll
  `GET /api/v1/jobs/:id`.
- The worker can run as a separate process/container (recommended in
  production) or inside the API process with `RUN_WORKER=true` (default for
  local development).

## Tech stack

| Area      | Technology |
|-----------|------------|
| API       | Node.js 22+, Express 5, TypeScript (ESM), `pg`, zod, pino, helmet, express-rate-limit, bcryptjs, jsonwebtoken, Anthropic SDK; bundled with esbuild |
| Database  | PostgreSQL 17, plain SQL migrations (`apps/api/migrations/*.sql`) |
| Web       | Next.js 16 (App Router, standalone output), React 19, TanStack Query, Tailwind CSS 4 |
| Mobile    | Expo SDK 58, React Native, expo-router, expo-secure-store, TanStack Query; built with EAS |
| Shared    | `@preppilot/shared` - zod schemas, DTO types and typed API client (TS source, no build step) |
| Tooling   | npm workspaces, vitest + supertest, Docker / Docker Compose, GitHub Actions |

## Monorepo layout

```
preppilot/
├── apps/
│   ├── api/                 @preppilot/api - Express API + worker
│   │   ├── src/             server.ts, worker.ts, db/migrate-cli.ts, ...
│   │   ├── migrations/      *.sql (shipped next to dist/ at runtime)
│   │   ├── build.mjs        esbuild -> dist/server.js, dist/worker.js, dist/migrate.js
│   │   ├── Dockerfile
│   │   └── .env.example
│   ├── web/                 @preppilot/web - Next.js app (+ Dockerfile)
│   └── mobile/              @preppilot/mobile - Expo app (EAS builds)
├── packages/
│   └── shared/              @preppilot/shared - API contract (zod + types + client)
├── .github/workflows/ci.yml
├── docker-compose.yml       production-style stack
├── docker-compose.dev.yml   Postgres for local development
└── .env.example             env for docker-compose.yml
```

## Local development

Prerequisites: Node.js >= 22.12, npm, Docker (for Postgres).

```bash
# 1. Start Postgres 17 (host port 5434 -> avoids clashing with a local Postgres)
docker compose -f docker-compose.dev.yml up -d

# 2. Configure the API
cp apps/api/.env.example apps/api/.env
#    - set JWT_ACCESS_SECRET and ENCRYPTION_KEY (generation commands are in the file)
#    - set ANTHROPIC_API_KEY, or AI_MOCK=true to develop without a key

# 3. Install all workspaces
npm install

# 4. Create the schema
npm run db:migrate

# 5. Run the apps (separate terminals)
npm run dev:api       # http://localhost:4000  (runs the worker in-process by default)
npm run dev:web       # http://localhost:3000
npm run dev:mobile    # Expo dev server
```

Optional: `npm run dev:worker` runs the worker as its own process (set
`RUN_WORKER=false` in `apps/api/.env` first).

The web app reads `API_URL` (server-side, default `http://localhost:4000`) for
its `/api/v1/*` proxy. The mobile app reads `EXPO_PUBLIC_API_URL`, e.g.
`http://<your-LAN-IP>:4000` for a physical device (`localhost` only works in
simulators/emulators on the same machine; Android emulator uses `10.0.2.2`).

Dev database: `postgres://preppilot:preppilot@localhost:5434/preppilot`.
If host port 5434 is already taken, start it on another port
(`DEV_DB_PORT=5435 docker compose -f docker-compose.dev.yml up -d`) and update
`DATABASE_URL` in `apps/api/.env` to match.
Stop it with `docker compose -f docker-compose.dev.yml down` (add `-v` to wipe data).

If port 4000 is already used by another local service, set `PORT=4100` (any free port) in
`apps/api/.env`, `API_URL=http://localhost:4100` in `apps/web/.env.local`, and the same port in
`EXPO_PUBLIC_API_URL` in `apps/mobile/.env`.

**Tests** use their own database, `preppilot_test` on the same server: vitest creates and
migrates it automatically (`apps/api/tests/global-setup.ts`) and always runs with `AI_MOCK=true`,
so tests never touch your dev data, never collide with a running dev worker, and never call Claude.
Override with `DATABASE_URL=... npm test`.

### Useful scripts (root)

| Script | What it does |
|--------|--------------|
| `npm run dev:api` / `dev:worker` / `dev:web` / `dev:mobile` | Dev servers |
| `npm run db:migrate` | Apply SQL migrations using `apps/api/.env` |
| `npm run typecheck` | `tsc --noEmit` in every workspace (shared, api, web, mobile) |
| `npm test` | Tests in every workspace (API: vitest + supertest against Postgres) |
| `npm run build:api` / `build:web` | Production builds |

## API configuration

All variables are documented in [`apps/api/.env.example`](apps/api/.env.example).

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `PORT` | `4000` | HTTP port |
| `DATABASE_URL` | - (required) | Postgres connection string |
| `DATABASE_SSL` | `false` | TLS to Postgres |
| `DATABASE_POOL_MAX` | `10` | pg pool size per process |
| `JWT_ACCESS_SECRET` | - (required) | JWT signing secret, >= 32 chars |
| `ACCESS_TOKEN_TTL_SECONDS` | `900` | Access token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | Refresh token lifetime |
| `ENCRYPTION_KEY` | - (required) | 64 hex chars (32 bytes), AES-256-GCM key for stored user API keys |
| `CORS_ORIGINS` | - | Comma-separated allowed origins (Expo web / other front-ends) |
| `ANTHROPIC_API_KEY` | - | Optional server-wide Anthropic key |
| `AI_MODEL` | `claude-opus-5-5` | Claude model |
| `AI_MOCK` | `false` | Deterministic fake AI (no key, no cost) |
| `AI_RATE_LIMIT_PER_HOUR` | `60` | AI requests per user per hour |
| `RUN_WORKER` | `true` | Run the job worker inside the API process |
| `WORKER_CONCURRENCY` | `2` | Concurrent AI jobs per worker |
| `MIGRATE_ON_START` | `false` | Apply migrations on API start |
| `TRUST_PROXY` | `1` | Express `trust proxy` hop count |
| `LOG_LEVEL` | `info` | pino log level |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"  # JWT_ACCESS_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"        # ENCRYPTION_KEY
```

## AI configuration

- **Server key vs. per-user keys.** Set `ANTHROPIC_API_KEY` to give every user
  AI access through one server-wide key. Users can also add their own Anthropic
  key in **Settings** (`PUT /api/v1/me/api-key`, removed with `DELETE`). User
  keys are encrypted at rest with AES-256-GCM using `ENCRYPTION_KEY` and are
  never returned by the API. Keep `ENCRYPTION_KEY` stable - changing it makes
  stored keys undecryptable (users would need to re-enter them).
- **Mock mode.** `AI_MOCK=true` swaps Claude for a deterministic fake AI, so
  no API key is needed and nothing is billed. Used by CI/tests and handy for
  local UI work.
- **Model.** `AI_MODEL` selects the Claude model (default `claude-opus-5-5`).
- **Limits.** `AI_RATE_LIMIT_PER_HOUR` caps AI generation requests per user;
  `WORKER_CONCURRENCY` caps parallel jobs per worker process.
- **Failures.** A failed plan generation can be retried with
  `POST /api/v1/plans/:id/retry`.

## Production deployment (Docker Compose)

`docker-compose.yml` runs the full stack:

| Service | Image | Purpose |
|---------|-------|---------|
| `postgres` | `postgres:17-alpine` | Database (volume `pgdata`, not published to the host) |
| `migrate` | API image, `node dist/migrate.js` | One-shot migrations; must succeed before `api`/`worker` start |
| `api` | API image, `node dist/server.js` | REST API on port 4000, `RUN_WORKER=false` |
| `worker` | API image, `node dist/worker.js` | AI job worker |
| `web` | web image | Next.js on port 3000, proxies `/api/v1/*` to `http://api:4000` |

```bash
cp .env.example .env        # fill in POSTGRES_PASSWORD, JWT_ACCESS_SECRET, ENCRYPTION_KEY, ...
docker compose up -d --build
docker compose ps           # api should become "healthy"
docker compose logs -f api worker
```

Upgrading: `git pull && docker compose up -d --build` - the `migrate` service
re-runs and applies any new migrations before the API and worker restart.

Notes:

- **Images.** Both Dockerfiles build from the repository root (`docker build -f apps/api/Dockerfile .`).
  The API image is multi-stage, runs as the non-root `node` user, contains only
  production dependencies plus `dist/` and `migrations/`, and has a
  `HEALTHCHECK` on `GET /healthz` (`GET /readyz` additionally checks the DB).
  The same image runs the API, the worker and migrations.
- **Web `API_URL` is baked in at build time.** Next.js evaluates `rewrites()`
  during `next build`, so the proxy target is fixed in the standalone output.
  Compose passes `WEB_API_URL` (default `http://api:4000`) as both a build arg
  and a runtime env var; rebuild the `web` image if it changes.
- **TLS / reverse proxy.** Put a TLS-terminating proxy (Caddy, nginx, a cloud
  load balancer) in front of `web` (and `api` if mobile clients call it
  directly) and keep `TRUST_PROXY` equal to the number of proxy hops.
- **Postgres password** is embedded in `DATABASE_URL`; avoid URL-reserved
  characters or URL-encode them.
- **Backups.** Back up the `pgdata` volume / use `pg_dump`. The `ENCRYPTION_KEY`
  must be backed up with the data, or stored user API keys are lost.

## Mobile builds (EAS)

The Expo app is not containerised; build it with [EAS](https://docs.expo.dev/build/introduction/):

```bash
npm install -g eas-cli
cd apps/mobile
eas login
eas build:configure                     # first time: creates eas.json
# Point the app at your public API (EXPO_PUBLIC_* vars are inlined at build time)
eas env:create --name EXPO_PUBLIC_API_URL --value https://api.example.com --environment production
eas build --platform all --profile production
eas submit --platform ios               # / android
```

`EXPO_PUBLIC_API_URL` must be the public HTTPS URL of the API (the mobile app
calls `/api/v1` directly with bearer tokens).

## Security

- **Passwords** hashed with bcrypt.
- **Access tokens** are short-lived JWTs (`ACCESS_TOKEN_TTL_SECONDS`, 15 min by default).
- **Refresh tokens** are rotated on every `POST /auth/refresh`, with **reuse
  detection**: presenting an already-used refresh token is treated as theft
  and the session is revoked.
- **Web** keeps the refresh token in an `httpOnly` cookie (not readable from
  JavaScript); **mobile** stores tokens in the OS keychain/keystore via
  `expo-secure-store`.
- **helmet** security headers, **CORS** allow-list (`CORS_ORIGINS`) and
  **rate limiting** (express-rate-limit), including a per-user hourly cap on
  AI generation (`AI_RATE_LIMIT_PER_HOUR`).
- **User Anthropic API keys** are encrypted at rest with **AES-256-GCM**
  (`ENCRYPTION_KEY`) and never sent back to clients.
- Containers run as non-root; secrets come from the environment and are
  excluded from images via `.dockerignore`.

## API reference

All endpoints are under `/api/v1`. Apart from the `auth/*` endpoints, requests
need an access token (`Authorization: Bearer <token>`). Health checks live
outside the prefix: `GET /healthz` (liveness) and `GET /readyz` (database
readiness).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create an account |
| POST | `/auth/login` | Log in, returns access + refresh token |
| POST | `/auth/refresh` | Rotate refresh token, get a new access token |
| POST | `/auth/logout` | Revoke the refresh token |
| GET | `/me` | Current user profile |
| PATCH | `/me` | Update profile |
| PUT | `/me/api-key` | Save (encrypted) personal Anthropic API key |
| DELETE | `/me/api-key` | Remove personal API key |
| POST | `/intake/questions` | Get AI intake questions for a target role/interview |
| GET | `/plans` | List my plans |
| POST | `/plans` | Create a plan from intake answers (async AI job) |
| GET | `/plans/:id` | Plan with its day-by-day schedule |
| DELETE | `/plans/:id` | Delete a plan |
| POST | `/plans/:id/retry` | Retry a failed plan generation |
| GET | `/topics/:id` | Topic with its learning doc |
| PATCH | `/topics/:id` | Update a topic (e.g. progress/completion) |
| POST | `/topics/:id/generate` | Generate the topic's learning doc (async AI job) |
| GET | `/plans/:id/questions` | Question bank for a plan |
| PATCH | `/questions/:id` | Update a question (e.g. status/notes) |
| GET | `/plans/:id/quizzes` | List quizzes for a plan |
| POST | `/plans/:id/quizzes` | Generate a quiz (async AI job) |
| GET | `/quizzes/:id` | Quiz with questions |
| POST | `/quizzes/:id/attempts` | Submit answers, returns score |
| GET | `/plans/:id/mocks` | List mock interviews for a plan |
| POST | `/plans/:id/mocks` | Start a mock interview |
| GET | `/mocks/:id` | Mock interview transcript/state |
| POST | `/mocks/:id/answer` | Answer the current question, get the next one |
| POST | `/mocks/:id/end` | End the mock interview and get feedback |
| GET | `/jobs/:id` | Status of an async AI job |

Request/response schemas are defined with zod in
[`packages/shared`](packages/shared/src) and shared by the API, web and mobile apps.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push to
`main` and every pull request: Node 22 with npm cache, `npm ci`, a Postgres 17
service container, `npm run typecheck` (all workspaces incl. mobile),
`npm run db:migrate`, `npm test` (with `AI_MOCK=true`, `NODE_ENV=test`),
`npm run build:api` and `npm run build:web`.
