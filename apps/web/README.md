# PrepPilot — Web

Next.js 16 (App Router, Turbopack, Cache Components) front end for PrepPilot.
All data comes from the PrepPilot API through the typed client in `@preppilot/shared`.

## Run locally

```bash
# from the repo root (deps are installed once for the whole monorepo)
cp apps/web/.env.example apps/web/.env.local   # optional, defaults shown below
npm run dev:api                                  # API on http://localhost:4000
npm run dev:web                                  # web on http://localhost:3000
```

| Variable  | Default                 | Purpose                                              |
| --------- | ----------------------- | ---------------------------------------------------- |
| `API_URL` | `http://localhost:4000` | Where `/api/v1/*` is proxied (see `next.config.ts`). |

The browser only ever calls same-origin `/api/v1/*`; Next rewrites it to `API_URL`, so the
httpOnly refresh-token cookie stays first-party. The access token is kept in memory only and the
session is restored on load via `POST /auth/refresh` + `GET /me`.

## Scripts

```bash
npm run dev -w @preppilot/web        # dev server
npm run build -w @preppilot/web      # production build (output: standalone)
npm run typecheck -w @preppilot/web  # tsc --noEmit
npm run lint -w @preppilot/web       # eslint
```

## Production / Docker

`output: "standalone"` with `outputFileTracingRoot` at the monorepo root, so the server is at
`apps/web/.next/standalone/apps/web/server.js`. Copy `apps/web/.next/static` to
`.next/standalone/apps/web/.next/static` (and `public/` if present), then run
`PORT=3000 HOSTNAME=0.0.0.0 node apps/web/server.js` from the standalone directory.

**`API_URL` must be set at build time** — rewrites are compiled into the standalone server.
The rewrite proxy timeout is raised to 120s because mock-interview and intake calls are slow,
synchronous AI requests.

## Layout

```
src/app/                 routes (App Router)
  page.tsx               marketing landing page
  (auth)/login|register  sign-in / sign-up
  (app)/…                authenticated area (RequireAuth + top nav)
    dashboard, settings, plans/new,
    plans/[planId], …/topics/[topicId], …/quizzes/[quizId], …/mocks/[mockId]
src/components/ui/       design-system primitives (Button, Card, Dialog, Tabs, …)
src/components/…         feature components (plans, topics, quizzes, mocks, settings)
src/lib/                 API client, auth context, React Query hooks, helpers
```

Data-driven pages are Client Components behind `<Suspense>` (required by Cache Components for
route params and client-only state); the marketing shell is prerendered.
