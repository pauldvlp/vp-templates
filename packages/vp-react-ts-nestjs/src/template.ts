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

// The api entrypoint ships with two marker comments so Swagger can be wired in (or stripped out)
// without keeping a second copy of main.ts. `apps/api/src/main.ts` is matched by relative path below.
const MAIN_TS = path.join('apps', 'api', 'src', 'main.ts');
const SWAGGER_IMPORT = "import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'";

// app.module.ts carries marker comments so the optional ServeStaticModule (the `--serveWeb` flag, which
// makes the api serve the built web app) can be wired in or stripped without a second copy of the file.
const APP_MODULE = path.join('apps', 'api', 'src', 'app.module.ts');
const SERVEWEB_MODULE = [
  '    ServeStaticModule.forRoot({',
  '      // Serve the built web app. `import.meta.dirname` resolves the same for src/main.ts (dev) and',
  '      // dist/main.js (prod) — both sit two levels under apps/api, so ../../web/dist is apps/web/dist.',
  "      rootPath: join(import.meta.dirname, '..', '..', 'web', 'dist'),",
  "      exclude: ['/api/*path']",
  '    }),',
].join('\n');

// The README documents the optional Swagger/Docker features inside `<!-- TAG:START -->` … `<!-- TAG:END -->`
// blocks. When the feature is enabled we drop just the marker lines (keeping the docs); when disabled we
// drop the whole block, so a project never ships docs for a feature it doesn't have.
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
  swagger: boolean;
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
      message: 'Port the NestJS api listens on',
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
      key: 'swagger',
      type: 'boolean',
      message: 'Expose Swagger UI at /docs on the api',
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

    const swaggerSetup = [
      `const swaggerConfig = new DocumentBuilder().setTitle('${options.name} API').setVersion('1.0').build()`,
      `SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig), { jsonDocumentUrl: 'docs.json' })`,
    ].join('\n  ');

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

      // Wire (or strip) the optional Swagger setup in the api entrypoint.
      if (rel === MAIN_TS) {
        out = options.swagger
          ? out
              .replace('// __SWAGGER_IMPORT__', SWAGGER_IMPORT)
              .replace('// __SWAGGER_SETUP__', swaggerSetup)
          : out.replace(/^[ \t]*\/\/ __SWAGGER_(IMPORT|SETUP)__\n/gm, '');
      }

      // Wire (or strip) the optional ServeStaticModule that makes the api serve the built web app.
      if (rel === APP_MODULE) {
        out = options.serveWeb
          ? out
              .replace('// __SERVEWEB_PATH_IMPORT__', "import { join } from 'node:path'\n")
              .replace(
                '// __SERVEWEB_MODULE_IMPORT__',
                "import { ServeStaticModule } from '@nestjs/serve-static'",
              )
              .replace('    // __SERVEWEB_MODULE__', SERVEWEB_MODULE)
          : out.replace(/^[ \t]*\/\/ __SERVEWEB_[A-Z_]+__\n/gm, '');
      }

      // Keep or drop the README's optional feature docs to match the chosen flags.
      if (rel === 'README.md') {
        out = applyDocBlock(out, 'SWAGGER', options.swagger);
        out = applyDocBlock(out, 'SERVEWEB', options.serveWeb);
        out = applyDocBlock(out, 'DOCKER', options.docker);
      }
      return out;
    });

    // Pull in the optional Nest packages only when their feature is enabled. Re-sort dependencies so the
    // emitted package.json stays alphabetical (what oxfmt expects) without a formatting pass.
    if (options.swagger || options.serveWeb) {
      patchJson(files, 'apps/api/package.json', (pkg) => {
        const deps = { ...pkg.dependencies };
        if (options.swagger) deps['@nestjs/swagger'] = '^11';
        if (options.serveWeb) deps['@nestjs/serve-static'] = '^5';
        pkg.dependencies = Object.fromEntries(
          Object.entries(deps).sort(([a], [b]) => a.localeCompare(b)),
        );
      });
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
        `The web app proxies \`/api\` to the NestJS server on port ${options.apiPort}.`,
        ...(options.swagger
          ? [`Swagger UI: http://localhost:${options.apiPort}/docs (OpenAPI JSON at /docs.json).`]
          : []),
        ...(options.serveWeb
          ? [
              `--serveWeb is on: after \`vp run -r build\`, \`node apps/api/dist/main.js\` serves the web app from the api.`,
            ]
          : []),
        options.install
          ? `Run \`vp check\` to lint, format and type-check the whole workspace.`
          : `Skipped install. Run \`vp install\`, then \`vp run -r dev\`.`,
      ],
    };
  },
});
