import { describe, expect, it } from 'vitest';

import { produce } from '@pauldvlp/template-kit/testing';

import template from '../src/template.ts';

const base = {
  name: 'acme-web',
  scope: '@acme',
  base: 'base' as const,
  preset: 'vega',
  iconLibrary: 'lucide' as const,
  cssVariables: true,
  rtl: false,
  pointer: false,
  components: 'button,badge,card',
  install: true,
};

describe('vp-react-ts-shadcn', () => {
  it('substitutes name/scope, wires the chosen icon lib and vp test', async () => {
    const files = await produce(template, base);

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

  it('bakes the non-default option set into components.json (radix base, no css vars, rtl on)', async () => {
    const files = await produce(template, {
      ...base,
      base: 'radix',
      iconLibrary: 'hugeicons',
      cssVariables: false,
      rtl: true,
      pointer: true,
    });

    const ui = JSON.parse(files.packages.ui['components.json']);
    expect(ui.style).toBe('radix-nova');
    expect(ui.base).toBe('radix');
    expect(ui.iconLibrary).toBe('hugeicons');
    expect(ui.rtl).toBe(true);
    expect(ui.tailwind.cssVariables).toBe(false);
    // hugeicons wired on both ends, lucide absent (the toggle is exclusive)
    const uiDeps = JSON.parse(files.packages.ui['package.json']).dependencies;
    expect(uiDeps['@hugeicons/react']).toBeTruthy();
    expect(uiDeps['@hugeicons/core-free-icons']).toBeTruthy();
    expect(uiDeps['lucide-react']).toBeUndefined();
  });

  const ICON_DEP: Record<string, string> = {
    hugeicons: '@hugeicons/react',
    lucide: 'lucide-react',
    radix: '@radix-ui/react-icons',
    tabler: '@tabler/icons-react',
  };
  for (const [lib, dep] of Object.entries(ICON_DEP)) {
    it(`wires the ${lib} icon dependency into ui + website`, async () => {
      const files = await produce(template, {
        ...base,
        iconLibrary: lib as typeof base.iconLibrary,
      });
      const uiDeps = JSON.parse(files.packages.ui['package.json']).dependencies;
      const webDeps = JSON.parse(files.apps.website['package.json']).dependencies;
      expect(uiDeps[dep]).toBeTruthy();
      expect(webDeps[dep]).toBeTruthy();
    });
  }
});
