import path from "node:path";
import type { NextConfig } from "next";

/**
 * Where the PrepPilot API lives. The browser always talks to same-origin `/api/v1/*`
 * and Next proxies it here, so the refresh-token cookie stays first-party.
 *
 * NOTE: rewrites are resolved at build time and serialised into the standalone
 * server, so `API_URL` must be set when running `next build` (e.g. as a Docker build arg).
 */
const apiUrl = (process.env.API_URL ?? "http://localhost:4000").replace(/\/+$/, "");

/**
 * Directory of this config file. Next loads next.config.ts as CommonJS by default (where
 * `__dirname` exists), but on Node >= 22.18 it may use Node's native TS/ESM loader where it
 * does not; `typeof` is safe in both. Next always runs with cwd = the app dir as a fallback.
 */
const configDir = typeof __dirname === "string" ? __dirname : process.cwd();

/** Monorepo root: standalone output lands at `.next/standalone/apps/web/server.js`. */
const monorepoRoot = path.join(configDir, "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  // Trace files from the monorepo root so `@preppilot/shared` and hoisted deps land in the standalone bundle.
  outputFileTracingRoot: monorepoRoot,
  // `@preppilot/shared` ships TypeScript source.
  transpilePackages: ["@preppilot/shared"],
  // Cache Components + Partial Prefetching: marketing pages are prerendered into a static shell;
  // every authenticated, data-driven view is a Client Component behind a <Suspense> boundary
  // (required because they read route params and client-side query state at request time).
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    // Mock-interview and intake calls are synchronous AI calls that can take up to ~60s.
    // The rewrite proxy defaults to a 30s timeout, which would cut them off.
    proxyTimeout: 120_000,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
  turbopack: {
    root: monorepoRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
