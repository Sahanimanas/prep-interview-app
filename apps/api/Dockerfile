# syntax=docker/dockerfile:1
#
# PrepPilot API (+ worker) image.
#
# Build from the MONOREPO ROOT so npm workspaces and @preppilot/shared resolve:
#   docker build -f apps/api/Dockerfile -t preppilot-api .
#
# The same image runs:
#   API server   : node dist/server.js        (default CMD)
#   AI worker    : node dist/worker.js        (command override)
#   Migrations   : node dist/migrate.js       (command override, one-shot)

ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------------------------
# Stage 1: install all deps (incl. dev) for the API workspace and build it
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /app

# Manifests first for layer caching. Every workspace package.json must be
# present so `npm ci` can validate the lockfile against the workspace graph.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/

# Only install the dependency tree of the API workspace (+ linked shared pkg).
RUN npm ci -w @preppilot/api --no-audit --no-fund

# Sources needed for the bundle. @preppilot/shared is inlined by esbuild.
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

RUN npm run build -w @preppilot/api

# ---------------------------------------------------------------------------
# Stage 2: production dependencies only
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
# Runtime deps are pure JS (pg, bcryptjs, express, ...), so lifecycle scripts
# are skipped. @preppilot/shared is bundled into dist/ and not needed at runtime.
# apps/api/node_modules only exists if npm had to nest a conflicting version;
# create it so the COPY below never fails.
RUN npm ci -w @preppilot/api --omit=dev --ignore-scripts --no-audit --no-fund \
 && mkdir -p apps/api/node_modules \
 && npm cache clean --force

# ---------------------------------------------------------------------------
# Stage 3: runtime
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app

# Hoisted workspace node_modules live at /app/node_modules; the API resolves
# them by walking up from /app/apps/api/dist. Files stay root-owned (read-only
# for the `node` user) so the running process cannot modify its own code.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./package.json
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
# package.json carries "type": "module" so dist/*.js load as ESM.
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
# Migrations are resolved as ../migrations relative to dist/.
COPY --from=build /app/apps/api/migrations ./apps/api/migrations

WORKDIR /app/apps/api
USER node
EXPOSE 4000

# Liveness only (no DB check). Uses Node's built-in fetch, no curl/wget needed.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "dist/server.js"]
