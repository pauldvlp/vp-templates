import { describe, expect, it } from 'vitest';

import { produce } from '@pauldvlp/template-kit/testing';

import template from '../src/template.ts';

describe('vp-pkg-shadcn', () => {
  it('emits the ui package at the tree root with resolved catalog specifiers', async () => {
    const files = await produce(template, {
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

    // Add-into-existing: emits the UI package contents at the ROOT of the tree (the runtime nests them
    // under the chosen --directory). No `packages/ui` wrapper, no apps, no root-monorepo package.json.
    expect(files.packages).toBeUndefined(); // would double to packages/ui/packages/ui
    expect(files.apps).toBeUndefined();
    expect(files['package.json']).toBeTruthy();
    expect(files['components.json']).toBeTruthy();
    expect(files.src?.styles?.['globals.css']).toBeTruthy();
    const uiPkg = JSON.parse(files['package.json']);
    expect(uiPkg.name).toBe('@acme/ui');
    expect(uiPkg.dependencies['lucide-react']).toBeTruthy();
    // catalog: specifiers must be resolved (no root catalog in a target repo).
    const allRanges = Object.values({ ...uiPkg.dependencies, ...uiPkg.devDependencies });
    expect(allRanges.some((r) => String(r).startsWith('catalog:'))).toBe(false);
    expect(uiPkg.devDependencies['vite-plus']).toBe('^0.2.4');
    expect(files['components.json']).toMatch(/"style": "base-nova"/);
    expect(files['components.json']).toMatch(/@acme\/ui\/components/);
    // vp test wired and gated in `ready`, with a cn smoke test shipped alongside the components
    expect(files['package.json']).toMatch(/"test": "vp test"/);
    expect(uiPkg.scripts.ready).toMatch(/vp test/);
    expect(files.src?.lib?.['cn.test.ts']).toBeTruthy();
  });

  it('bakes the non-default option set (radix base, no css vars, rtl on, hugeicons)', async () => {
    const files = await produce(template, {
      scope: '@acme',
      base: 'radix',
      preset: 'vega',
      iconLibrary: 'hugeicons',
      cssVariables: false,
      rtl: true,
      pointer: true,
      components: 'button',
      install: true,
    });

    const cj = JSON.parse(files['components.json']);
    expect(cj.style).toBe('radix-nova');
    expect(cj.base).toBe('radix');
    expect(cj.iconLibrary).toBe('hugeicons');
    expect(cj.rtl).toBe(true);
    expect(cj.tailwind.cssVariables).toBe(false);

    const deps = JSON.parse(files['package.json']).dependencies;
    expect(deps['@hugeicons/react']).toBeTruthy();
    expect(deps['@hugeicons/core-free-icons']).toBeTruthy();
    expect(deps['lucide-react']).toBeUndefined();
  });

  const ICON_DEP: Record<string, string> = {
    hugeicons: '@hugeicons/react',
    lucide: 'lucide-react',
    radix: '@radix-ui/react-icons',
    tabler: '@tabler/icons-react',
  };
  for (const [lib, dep] of Object.entries(ICON_DEP)) {
    it(`wires the ${lib} icon dependency`, async () => {
      const files = await produce(template, {
        scope: '@acme',
        base: 'base',
        preset: 'vega',
        iconLibrary: lib as 'hugeicons' | 'lucide' | 'radix' | 'tabler',
        cssVariables: true,
        rtl: false,
        pointer: false,
        components: 'button',
        install: true,
      });
      expect(JSON.parse(files['package.json']).dependencies[dep]).toBeTruthy();
    });
  }
});
