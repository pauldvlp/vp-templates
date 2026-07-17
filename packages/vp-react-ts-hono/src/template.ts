import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  defineTemplate,
  dirName,
  patchJson,
  readTree,
  toScope,
  validateName,
  validateScope,
  type Tree,
} from '@pauldvlp/template-kit';

/** Reject a port that isn't a plain integer in the 1–65535 range (validated for both flags and prompts). */
function validatePort(value: string): string | undefined {
  return /^\d+$/.test(value) && Number(value) > 0 && Number(value) < 65536
    ? undefined
    : 'must be a number between 1 and 65535';
}

const TEMPLATE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'template');

// Read the package's own name/description at runtime rather than statically importing package.json:
// a static import makes esbuild inline the entire manifest — repository/homepage/bugs URLs included —
// into the published bundle, where they show up as stray URL strings. Resolves to the package root in
// both `node bin/index.ts` (dev) and the bundled `dist/index.js`, since each sits one level under it.
const { name: pkgName, description: pkgDescription } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { name: string; description: string };

// The Hono app (apps/api/src/app.ts) ships with marker comments so the optional OpenAPI/Swagger UI and
// static-serving features can be wired in (or stripped out) without keeping a second copy of the file.
const APP_TS = path.join('apps', 'api', 'src', 'app.ts');

const OPENAPI_IMPORT = [
  "import { swaggerUI } from '@hono/swagger-ui'",
  "import { openApiDocument } from './openapi'",
].join('\n');
const OPENAPI_SETUP = [
  "app.get('/docs.json', (c) => c.json(openApiDocument))",
  "app.get('/docs', swaggerUI({ url: '/docs.json' }))",
].join('\n');

const SERVEWEB_IMPORT = [
  "import { join } from 'node:path'",
  "import { serveStatic } from '@hono/node-server/serve-static'",
].join('\n');
// Registered AFTER the /api routes so those take precedence. `root` is an ABSOLUTE path derived from the
// running file (`import.meta.dirname`), so it's correct regardless of the process cwd — `vp run
// @app/api#start` runs from apps/api, the Dockerfile from the repo root. Both apps/api/src (dev) and
// apps/api/dist (the prod SSR bundle) sit two levels under apps/, so ../../web/dist is apps/web/dist.
const SERVEWEB_STATIC =
  "app.use('/*', serveStatic({ root: join(import.meta.dirname, '..', '..', 'web', 'dist') }))";

// The README documents the optional OpenAPI/ServeWeb/Docker features inside `<!-- TAG:START -->` …
// `<!-- TAG:END -->` blocks. When the feature is enabled we drop just the marker lines (keeping the
// docs); when disabled we drop the whole block, so a project never ships docs for a feature it lacks.
function applyDocBlock(text: string, tag: string, keep: boolean): string {
  return keep
    ? text.replace(new RegExp(`^<!-- ${tag}:(START|END) -->\\n`, 'gm'), '')
    : text.replace(new RegExp(`<!-- ${tag}:START -->\\n[\\s\\S]*?<!-- ${tag}:END -->\\n`, 'g'), '');
}

interface Options {
  name: string;
  scope: string;
  apiPort: string;
  webPort: string;
  openapi: boolean;
  serveWeb: boolean;
  docker: boolean;
  install: boolean;
}

export default defineTemplate<Options>({
  about: {
    name: pkgName,
    description: pkgDescription,
  },

  options: [
    // Default the name to the target directory the user chose, so they don't retype it.
    {
      key: 'name',
      type: 'string',
      message: 'Root project / package name',
      default: ({ directory }) => dirName(directory),
      validate: validateName,
    },
    // Lazily default the package scope to `@<name>` (prefixing `@` unless the name already has one),
    // so it tracks the project name instead of a fixed value. Falls back to `@app` when no name is set.
    {
      key: 'scope',
      type: 'string',
      message: 'npm scope for workspace packages, e.g. @acme (defaults to @<name>)',
      default: ({ options }) => (options.name ? toScope(options.name) : '@app'),
      validate: validateScope,
    },
    // Ports stay strings (validated as integers): they're only ever substituted into config files as text.
    {
      key: 'apiPort',
      type: 'string',
      message: 'Port the Hono api listens on',
      default: '3000',
      validate: validatePort,
    },
    {
      key: 'webPort',
      type: 'string',
      message: 'Port the web dev server listens on',
      default: '5173',
      validate: validatePort,
    },
    {
      key: 'openapi',
      type: 'boolean',
      message: 'Expose Swagger UI at /docs (OpenAPI doc generated from the Zod contracts)',
      default: false,
    },
    {
      key: 'serveWeb',
      type: 'boolean',
      message: 'Have the api serve the built web app (single deployable)',
      default: false,
    },
    {
      key: 'docker',
      type: 'boolean',
      message: 'Add a multi-stage Dockerfile for the api',
      default: false,
    },
    { key: 'install', type: 'boolean', message: 'Install deps after scaffolding', default: true },
  ],

  async produce({ options }) {
    const scope = toScope(options.scope || options.name || 'app');

    // Read the static monorepo skeleton, rewriting the @app scope, project name and ports.
    const files = readTree(TEMPLATE_DIR, (rel, content) => {
      let out = content
        .split('@app')
        .join(scope)
        .split('__PROJECT_NAME__')
        .join(options.name)
        .split('__API_PORT__')
        .join(options.apiPort)
        .split('__WEB_PORT__')
        .join(options.webPort);

      // Wire (or strip) the optional OpenAPI/Swagger UI and static-serving features in the Hono app.
      if (rel === APP_TS) {
        out = options.openapi
          ? out
              .replace('// __OPENAPI_IMPORT__', OPENAPI_IMPORT)
              .replace('// __OPENAPI_SETUP__', OPENAPI_SETUP)
          : out.replace(/^[ \t]*\/\/ __OPENAPI_[A-Z_]+__\n/gm, '');

        out = options.serveWeb
          ? out
              .replace('// __SERVEWEB_IMPORT__', SERVEWEB_IMPORT)
              .replace('// __SERVEWEB_STATIC__', SERVEWEB_STATIC)
          : out.replace(/^[ \t]*\/\/ __SERVEWEB_[A-Z_]+__\n/gm, '');
      }

      // Keep or drop the README's optional feature docs to match the chosen flags.
      if (rel === 'README.md') {
        out = applyDocBlock(out, 'OPENAPI', options.openapi);
        out = applyDocBlock(out, 'SERVEWEB', options.serveWeb);
        out = applyDocBlock(out, 'DOCKER', options.docker);
      }
      return out;
    });

    // The OpenAPI feature is the only one that needs an extra dependency (Swagger UI). Re-sort the deps
    // so the emitted package.json stays alphabetical (what oxfmt expects) without a formatting pass.
    // When it's off, drop the generated doc module too — otherwise it's an unused, uncompiled file.
    if (options.openapi) {
      patchJson(files, 'apps/api/package.json', (pkg) => {
        const deps = { ...pkg.dependencies, '@hono/swagger-ui': '^0.6.1' };
        pkg.dependencies = Object.fromEntries(
          Object.entries(deps).sort(([a], [b]) => a.localeCompare(b)),
        );
      });
    } else {
      delete (((files.apps as Tree).api as Tree).src as Tree)['openapi.ts'];
    }

    // Drop the Docker assets unless requested. The .dockerignore lives at the project root because the
    // image's build context is the monorepo root (see apps/api/Dockerfile).
    if (!options.docker) {
      delete (files as Tree)['.dockerignore'];
      delete ((files.apps as Tree).api as Tree)['Dockerfile'];
    }

    const scripts = options.install
      ? [{ commands: [['pnpm', 'install', '--silent']], phase: 0 }]
      : [];

    return {
      files,
      scripts,
      suggestions: [
        `cd into the project and run \`vp run -r dev\` to start web + api together.`,
        `The web app proxies \`/api\` to the Hono server on port ${options.apiPort}.`,
        ...(options.openapi
          ? [`Swagger UI: http://localhost:${options.apiPort}/docs (OpenAPI JSON at /docs.json).`]
          : []),
        ...(options.serveWeb
          ? [
              `--serveWeb is on: after \`vp run -r build\`, \`vp run @app/api#start\` serves the web app from the api.`,
            ]
          : []),
        options.install
          ? `Run \`vp check\` to lint, format and type-check the whole workspace.`
          : `Skipped install. Run \`vp install\`, then \`vp run -r dev\`.`,
      ],
    };
  },
});
