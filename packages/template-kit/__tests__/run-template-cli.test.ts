import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execFileSync = vi.fn();
vi.mock('node:child_process', () => ({
  execFileSync: (...args: unknown[]) => execFileSync(...args),
}));

const { runTemplateCLI } = await import('../src/index.ts');

// A minimal template whose only job is to emit one post-scaffold script, so the test can assert on
// how runTemplateCLI invokes it — this is the exact call that regressed once already (fixed for
// scripts/smoke-install.mjs in #28, but never mirrored here, which is what #34 reports).
const template = {
  options: [],
  git: false,
  produce: () => ({
    files: { 'placeholder.txt': 'x' },
    scripts: [{ commands: [['pnpm', 'install', '--silent']], phase: 0 }],
  }),
};

describe('runTemplateCLI — post-scaffold script execution', () => {
  let dir: string;
  let originalArgv: string[];
  let originalPlatform: NodeJS.Platform;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'template-kit-test-'));
    originalArgv = process.argv;
    originalPlatform = process.platform;
    execFileSync.mockClear();
  });

  afterEach(() => {
    process.argv = originalArgv;
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('enables shell on Windows so PATH-resolved .cmd shims (pnpm, npm) resolve', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    process.argv = ['node', 'cli.js', '--directory', dir];

    await runTemplateCLI(template as never);

    // Guards against parseArgv silently swallowing --directory (e.g. a stray flag ahead of it
    // consuming its value), which would scaffold into the fallback `my-app` instead of `dir`.
    expect(fs.existsSync(path.join(dir, 'placeholder.txt'))).toBe(true);
    expect(execFileSync).toHaveBeenCalledWith(
      'pnpm',
      ['install', '--silent'],
      expect.objectContaining({ shell: true }),
    );
  });

  it('keeps shell disabled elsewhere, so args can never be parsed as shell syntax', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    process.argv = ['node', 'cli.js', '--directory', dir];

    await runTemplateCLI(template as never);

    expect(execFileSync).toHaveBeenCalledWith(
      'pnpm',
      ['install', '--silent'],
      expect.objectContaining({ shell: false }),
    );
  });
});
