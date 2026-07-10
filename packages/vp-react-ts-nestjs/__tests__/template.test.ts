import { describe, expect, it } from 'vitest'

import { produce } from '@pauldvlp/template-kit/testing'

import template from '../src/template.ts'

describe('vp-react-ts-nestjs — swagger/serveWeb/docker off', () => {
  it('substitutes name/scope/ports and strips all optional wiring', async () => {
    const files = await produce(template, {
      name: 'acme', scope: '@acme', apiPort: '4000', webPort: '4100', swagger: false, serveWeb: false, docker: false, install: true,
    })

    expect(JSON.parse(files['package.json']).name).toBe('acme')
    expect(JSON.parse(files.apps.api['package.json']).name).toBe('@acme/api')
    expect(JSON.parse(files.apps.web['package.json']).name).toBe('@acme/web')
    expect(JSON.parse(files.packages.contracts['package.json']).name).toBe('@acme/contracts')
    // scope rewrite reaches source imports on both ends
    expect(files.apps.api.src.items['items.controller.ts']).toMatch(/@acme\/contracts/)
    expect(files.apps.web.src['App.tsx']).toMatch(/@acme\/contracts/)
    // port substitution
    expect(files.apps.web['vite.config.ts']).toMatch(/localhost:4000/)
    expect(files.apps.web['vite.config.ts']).toMatch(/port: 4100/)
    expect(files.apps.api.src.config['env.ts']).toMatch(/z\.coerce\.number\(\), 4000\)/)
    // pino middleware uses the Express-5-safe named wildcard (no path-to-regexp warning)
    expect(files.apps.api.src['app.module.ts']).toMatch(/forRoutes: \['\*path'\]/)
    // swagger off: markers stripped, dep absent
    expect(files.apps.api.src['main.ts']).not.toMatch(/__SWAGGER/)
    expect(files.apps.api.src['main.ts']).not.toMatch(/SwaggerModule/)
    expect(JSON.parse(files.apps.api['package.json']).dependencies['@nestjs/swagger']).toBeUndefined()
    // serveWeb off: markers stripped, dep absent
    expect(files.apps.api.src['app.module.ts']).not.toMatch(/__SERVEWEB/)
    expect(files.apps.api.src['app.module.ts']).not.toMatch(/ServeStaticModule/)
    expect(JSON.parse(files.apps.api['package.json']).dependencies['@nestjs/serve-static']).toBeUndefined()
    // docker off: no Dockerfile, no root .dockerignore
    expect(files.apps.api['Dockerfile']).toBeUndefined()
    expect(files['.dockerignore']).toBeUndefined()
    // dotfiles renamed for publish-safety
    expect(files.apps.api['.env.example']).toBeTruthy()
  })
})

describe('vp-react-ts-nestjs — swagger/serveWeb/docker on', () => {
  it('wires swagger, serve-static and docker when enabled', async () => {
    const files = await produce(template, {
      name: 'acme', scope: '@acme', apiPort: '3000', webPort: '5173', swagger: true, serveWeb: true, docker: true, install: true,
    })

    // swagger on: markers replaced with real wiring (with docs.json), dep added
    expect(files.apps.api.src['main.ts']).toMatch(/SwaggerModule\.setup\('docs'/)
    expect(files.apps.api.src['main.ts']).toMatch(/jsonDocumentUrl: 'docs\.json'/)
    expect(files.apps.api.src['main.ts']).not.toMatch(/__SWAGGER/)
    expect(JSON.parse(files.apps.api['package.json']).dependencies['@nestjs/swagger']).toBeTruthy()
    // serveWeb on: ServeStaticModule wired, imports added, dep added
    expect(files.apps.api.src['app.module.ts']).toMatch(/ServeStaticModule\.forRoot/)
    expect(files.apps.api.src['app.module.ts']).toMatch(/from 'node:path'/)
    expect(files.apps.api.src['app.module.ts']).toMatch(/from '@nestjs\/serve-static'/)
    expect(files.apps.api.src['app.module.ts']).not.toMatch(/__SERVEWEB/)
    expect(JSON.parse(files.apps.api['package.json']).dependencies['@nestjs/serve-static']).toBeTruthy()
    // docker on: Dockerfile + root .dockerignore emitted
    expect(files.apps.api['Dockerfile']).toBeTruthy()
    expect(files['.dockerignore']).toBeTruthy()
  })
})
