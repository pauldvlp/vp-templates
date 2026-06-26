#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

import * as prompts from '@clack/prompts'
import { detectMonorepoScope, toScope } from '@pauldvlp/template-kit'
import { runTemplateCLI, type Template } from 'bingo'

import template from '../src/template.ts'

const DOCS_URL = 'https://github.com/pauldvlp/vp-templates/blob/main/packages/vp-pkg-shadcn/README.md'

function getArg(argv: string[], name: string): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (arg === `--${name}`) return argv[i + 1]
    if (arg.startsWith(`--${name}=`)) return arg.slice(name.length + 3)
  }
  return undefined
}

const argv = process.argv.slice(2)
const isHelp = argv.some((arg) => arg === '--help' || arg === '-h')
const isInteractive = process.stdout.isTTY && !argv.includes('--no-interactive')

// Default the target directory to `ui`. Bingo hard-codes its directory prompt's default to
// `my-<template-slug>` and exposes no template API to change it, so inject `--directory ui` when the
// caller didn't pass one: `vp create @pauldvlp:vp-pkg-shadcn` then lands the package at
// `<chosen-parent>/ui` (e.g. `packages/ui`) without the noisy default. An explicit `--directory`
// still wins; skip injection for help so `--help` doesn't create a `ui/` folder.
if (!getArg(argv, 'directory') && !isHelp) {
  process.argv.push('--directory', 'ui')
}

// runTemplateCLI accepts the base `Template` type, which is wider than the
// strongly typed template returned by createTemplate(). Cast through `unknown`
// to bridge the two.
const status = await runTemplateCLI(template as unknown as Template)
process.exitCode = status

const finalArgv = process.argv.slice(2)
const targetDir = getArg(finalArgv, 'directory')

// Bingo always initializes a fresh git repo (`git init` + an initial commit) in the scaffolded
// directory unless it detects it's already inside one — so adding the package to a non-git repo
// leaves a nested `.git` inside it, which we never want for an "add into an existing repo" generator.
// There's no Bingo flag to skip this, and its git step runs after the template's scripts, so clean it
// up here once the CLI has finished. Guard against ever touching the cwd or a `.`/root directory.
if (!isHelp && targetDir && targetDir !== '.' && path.resolve(targetDir) !== process.cwd()) {
  fs.rmSync(path.join(targetDir, '.git'), { recursive: true, force: true })
}

// The post-scaffold wiring steps are owned here (the template returns no Bingo `suggestions`, whose
// plain text the host buries under its own prompts). Always render them as a highlighted, colored
// note; on interactive runs add an acknowledge-to-continue prompt so they aren't scrolled past.
if (!isHelp && (status === 0 || status === undefined)) {
  const ui = `${toScope(getArg(finalArgv, 'scope') || detectMonorepoScope() || 'app')}/ui`
  prompts.note(
    [
      `1. Workspace         glob the dir you chose (e.g. packages/*) so ${ui} is linked`,
      `2. Depend on it      ${'"' + ui + '": "workspace:*"'}  in your app's package.json`,
      `3. Tailwind v4       pnpm --filter <app> add -D @tailwindcss/vite tailwindcss`,
      `                     then add tailwindcss() to the app's vite.config plugins`,
      `4. Import the styles import '${ui}/globals.css'  in the app entry (e.g. src/main.tsx)`,
      ``,
      `Add components  pnpm --filter ${ui} exec shadcn add <name>`,
      `Docs            ${DOCS_URL}`
    ].join('\n'),
    `Wire ${ui} into your app`
  )
  if (isInteractive) {
    const ack = await prompts.confirm({ message: 'Got it — continue?', initialValue: true })
    if (prompts.isCancel(ack)) prompts.cancel('Okay — see the docs link above when you’re ready.')
  }
}
