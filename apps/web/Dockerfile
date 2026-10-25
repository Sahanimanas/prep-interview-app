# syntax=docker/dockerfile:1
#
# PrepPilot web (Next.js standalone) image.
#
# Build from the MONOREPO ROOT:
#   docker build -f apps/web/Dockerfile --build-arg API_URL=http://api:4000 -t preppilot-web .
#
# Requirements on apps/web/next.config.ts:
#   output: "standalone"
#   outputFileTracingRoot: <monorepo root>   (path.join(__dirname, "../.."))
# With the tracing root at the monorepo root, Next emits the server at
# .next/standalone/apps/web/server.js and the traced node_modules at
# .next/standalone/node_modules - this Dockerfile relies on that layout.
#
# CAVEAT - API_URL is needed at BUILD time: rewrites() in next.config are
# evaluated during `next build` and serialised into the standalone output, so
# the /api/v1/* proxy target is baked into the image. Rebuild the image when
# the API's internal URL changes. API_URL is also set as a runtime ENV for any
# server code (route handlers / server components) that reads it at runtime.

ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------------------------
# Stage 1: install deps for the web workspace
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
# Recommended by Next.js for Alpine (glibc shims for some native packages).
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci -w @preppilot/web --no-audit --no-fund

# ---------------------------------------------------------------------------
# Stage 2: build
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
RUN apk add --no-cache libc6-compat
WORKDIR /app
ARG API_URL=http://api:4000
ENV API_URL=${API_URL} \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

COPY --from=deps /app ./
COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

RUN npm run build -w @preppilot/web \
 && test -f apps/web/.next/standalone/apps/web/server.js \
 || (echo "ERROR: expected apps/web/.next/standalone/apps/web/server.js - check output:'standalone' and outputFileTracingRoot in next.config" && exit 1)

# public/ is optional in Next; make sure the COPY below never fails.
RUN mkdir -p apps/web/public

# ---------------------------------------------------------------------------
# Stage 3: runtime
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ARG API_URL=http://api:4000
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    API_URL=${API_URL}

# Standalone server + traced node_modules (nested monorepo layout).
COPY --from=build /app/apps/web/.next/standalone ./
# Static assets and public/ are NOT included in standalone; copy them next to
# the nested server.js.
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

# Next writes its ISR/image cache under .next/cache at runtime.
RUN mkdir -p apps/web/.next/cache && chown -R node:node apps/web/.next/cache

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "apps/web/server.js"]
