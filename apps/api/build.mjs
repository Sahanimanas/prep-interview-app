// Bundles the API for production. The workspace package @preppilot/shared (TypeScript source) is
// inlined; every other dependency stays external and is installed from package.json at runtime.
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies).filter((dep) => dep !== '@preppilot/shared');

await build({
  entryPoints: {
    server: 'src/server.ts',
    worker: 'src/worker.ts',
    migrate: 'src/db/migrate-cli.ts',
  },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  splitting: true,
  external: [...external, ...external.map((dep) => `${dep}/*`)],
  logLevel: 'info',
});
