import { describe, expect, it } from 'vitest';

import { produce } from '@pauldvlp/template-kit/testing';

import template from '../src/template.ts';

describe('vp-react-ts-shadcn', () => {
  it('substitutes name/scope, wires the chosen icon lib and vp test', async () => {
    const files = await produce(template, {
      name: 'acme-web',
      scope: '@acme',
      base: 'base',
      preset: 'vega',
      iconLibrary: 'lucide',
      cssVariables: true,
      rtl: false,
      pointer: false,
      components: 'button,badge,card',
      install: true,
    });

    expect(JSON.parse(files['package.json']).name).toBe('acme-web');
    expect(JSON.parse(files.packages.ui['package.json']).name).toBe('@acme/ui');
    expect(files.apps.website.src['App.tsx']).toMatch(/@acme\/ui\/components\/ui\/button/);
    const uiDeps = JSON.parse(files.packages.ui['package.json']).dependencies;
    const webDeps = JSON.parse(files.apps.website['package.json']).dependencies;
    expect(uiDeps['lucide-react']).toBeTruthy();
    expect(webDeps['lucide-react']).toBeTruthy();
    // vp test wired at the root and gated in `ready`, with a cn smoke test shipped in the ui package
    expect(files['package.json']).toMatch(/"test": "vp test"/);
    expect(JSON.parse(files['package.json']).scripts.ready).toMatch(/vp test/);
    expect(files.packages.ui.src.lib['cn.test.ts']).toBeTruthy();
  });
});
