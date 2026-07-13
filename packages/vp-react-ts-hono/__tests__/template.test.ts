import { describe, expect, it } from 'vitest';

import { produce } from '@pauldvlp/template-kit/testing';

import template from '../src/template.ts';

describe('vp-react-ts-hono — openapi/serveWeb/docker off', () => {
  it('substitutes name/scope/ports and strips all optional wiring', async () => {
    const files = await produce(template, {
      name: 'acme',
      scope: '@acme',
      apiPort: '4000',
      webPort: '4100',
      openapi: false,
      serveWeb: false,
      docker: false,
      install: true,
    });

    expect(JSON.parse(files['package.json']).name).toBe('acme');
    expect(JSON.parse(files.apps.api['package.json']).name).toBe('@acme/api');
    expect(JSON.parse(files.apps.web['package.json']).name).toBe('@acme/web');
    expect(JSON.parse(files.packages.contracts['package.json']).name).toBe('@acme/contracts');
    // scope rewrite reaches source imports on both ends
    expect(files.apps.api.src.routes['items.ts']).toMatch(/@acme\/contracts/);
    expect(files.apps.web.src['App.tsx']).toMatch(/@acme\/contracts/);
    // RPC wiring: api exports AppType + validates with sValidator; web consumes it via hc, no raw fetch
    expect(files.apps.api.src['app.ts']).toMatch(/export type AppType = typeof routes/);
    expect(files.apps.api.src.routes['items.ts']).toMatch(/sValidator\('json', createItemSchema\)/);
    expect(
      JSON.parse(files.apps.api['package.json']).dependencies['@hono/standard-validator'],
    ).toBeTruthy();
    expect(files.apps.web.src['App.tsx']).toMatch(/hc<AppType>/);
    expect(files.apps.web.src['App.tsx']).toMatch(/from '@acme\/api'/);
    expect(files.apps.web.src['App.tsx']).not.toMatch(/fetch\('\/api/);
    expect(JSON.parse(files.apps.web['package.json']).devDependencies['@acme/api']).toBe(
      'workspace:*',
    );
    expect(JSON.parse(files.apps.web['package.json']).dependencies.hono).toBeTruthy();
    // the hand-rolled validate bridge is gone
    expect(files.apps.api.src.lib).toBeUndefined();
    // port substitution
    expect(files.apps.web['vite.config.ts']).toMatch(/localhost:4000/);
    expect(files.apps.web['vite.config.ts']).toMatch(/port: 4100/);
    expect(files.apps.api.src['env.ts']).toMatch(/z\.coerce\.number\(\), 4000\)/);
    // openapi off: markers stripped, dep absent, doc module dropped
    expect(files.apps.api.src['app.ts']).not.toMatch(/__OPENAPI/);
    expect(files.apps.api.src['app.ts']).not.toMatch(/swaggerUI/);
    expect(files.apps.api.src['openapi.ts']).toBeUndefined();
    expect(
      JSON.parse(files.apps.api['package.json']).dependencies['@hono/swagger-ui'],
    ).toBeUndefined();
    // serveWeb off: markers stripped from the Node entry (main.ts); app.ts never carries the static mount
    expect(files.apps.api.src['main.ts']).not.toMatch(/__SERVEWEB/);
    expect(files.apps.api.src['main.ts']).not.toMatch(/serveStatic/);
    expect(files.apps.api.src['app.ts']).not.toMatch(/serveStatic/);
    // docker off: no Dockerfile, no root .dockerignore
    expect(files.apps.api['Dockerfile']).toBeUndefined();
    expect(files['.dockerignore']).toBeUndefined();
    // dotfiles renamed for publish-safety
    expect(files.apps.api['.env.example']).toBeTruthy();
  });
});

describe('vp-react-ts-hono — openapi/serveWeb/docker on', () => {
  it('wires swagger UI, serveStatic and docker when enabled', async () => {
    const files = await produce(template, {
      name: 'acme',
      scope: '@acme',
      apiPort: '3000',
      webPort: '5173',
      openapi: true,
      serveWeb: true,
      docker: true,
      install: true,
    });

    // openapi on: swaggerUI wired (docs + docs.json), dep added, doc module kept
    expect(files.apps.api.src['app.ts']).toMatch(/swaggerUI\(\{ url: '\/docs\.json' \}\)/);
    expect(files.apps.api.src['app.ts']).toMatch(/app\.get\('\/docs\.json'/);
    expect(files.apps.api.src['app.ts']).not.toMatch(/__OPENAPI/);
    expect(files.apps.api.src['openapi.ts']).toBeTruthy();
    expect(
      JSON.parse(files.apps.api['package.json']).dependencies['@hono/swagger-ui'],
    ).toBeTruthy();
    // serveWeb on: serveStatic wired into the Node entry (main.ts), cwd-independent root — kept OUT of
    // app.ts so its exported AppType stays Node-free for the web's RPC import
    expect(files.apps.api.src['main.ts']).toMatch(
      /serveStatic\(\{ root: join\(import\.meta\.dirname, '\.\.', '\.\.', 'web', 'dist'\) \}\)/,
    );
    expect(files.apps.api.src['main.ts']).toMatch(/from '@hono\/node-server\/serve-static'/);
    expect(files.apps.api.src['main.ts']).toMatch(/import \{ join \} from 'node:path'/);
    expect(files.apps.api.src['main.ts']).not.toMatch(/__SERVEWEB/);
    expect(files.apps.api.src['app.ts']).not.toMatch(/serveStatic/);
    expect(files.apps.api.src['app.ts']).not.toMatch(/node:path/);
    // docker on: Dockerfile + root .dockerignore emitted
    expect(files.apps.api['Dockerfile']).toBeTruthy();
    expect(files['.dockerignore']).toBeTruthy();
  });
});
