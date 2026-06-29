import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import * as prompts from '@clack/prompts'

/** Nested `files` shape: a directory is an object, a file is its string content. */
export type Tree = { [name: string]: string | Tree }

// Files shipped with a leading underscore so `npm publish` doesn't mangle dotfiles.
export const RENAME: Record<string, string> = {
  _gitignore: '.gitignore',
  _dockerignore: '.dockerignore',
  '_env.example': '.env.example'
}

// shadcn's curated "radix-nova" theme (neutral base, yellow accent, Space Grotesk / Outfit,
// large radius). Generated at https://ui.shadcn.com — used as the default when no preset is passed.
export const DEFAULT_PRESET = 'b30557okNu'

// Per icon library: the dependency added so a package can import icons directly (tree-shaken named
// imports). A barrel re-export from `ui` (`export * from '@hugeicons/core-free-icons'`) is avoided on
// purpose — hugeicons' icon set is huge and the wildcard barrel blows past Vite Task's run-cache
// serialization limit.
export const ICON_LIBS: Record<string, Record<string, string>> = {
  hugeicons: { '@hugeicons/react': '^1.1.9', '@hugeicons/core-free-icons': '^4.2.1' },
  lucide: { 'lucide-react': '^0' },
  radix: { '@radix-ui/react-icons': '^1' },
  tabler: { '@tabler/icons-react': '^3' }
}

// The template monorepo's `catalog:` entries (kept in sync with vp-react-ts-shadcn's
// template/pnpm-workspace.yaml). Generators that drop a package into an *existing* repo can't rely
// on the target's catalog, so they resolve `catalog:` specifiers to these concrete ranges.
export const CATALOG: Record<string, string> = {
  '@types/node': '^24',
  typescript: '^5',
  vite: 'npm:@voidzero-dev/vite-plus-core@latest',
  vitest: '4.1.9',
  'vite-plus': '^0.2.1',
  'babel-plugin-react-compiler': '^1.0.0',
  '@rolldown/plugin-babel': '^0.2.3'
}

/** `acme` → `@acme`; `@acme` → `@acme` (idempotent). */
export function toScope(name: string): string {
  const n = name.trim()
  return n.startsWith('@') ? n : `@${n}`
}

/** The folder name from a target directory path, falling back to `my-app` for `.`/empty. */
export function dirName(directory: string): string {
  const base = path.basename(directory || '')
  return base && base !== '.' ? base : 'my-app'
}

/**
 * Derive the workspace npm scope from the monorepo the cwd sits in: walk up to the nearest
 * `pnpm-workspace.yaml` and read its sibling `package.json` name (e.g. root `"acme"` → `@acme`,
 * `"@acme/root"` → `@acme`). Returns undefined outside a pnpm workspace.
 */
export function detectMonorepoScope(): string | undefined {
  let dir = process.cwd()
  for (let i = 0; i < 10; i++) {
    const hasWorkspace = fs.existsSync(path.join(dir, 'pnpm-workspace.yaml')) || fs.existsSync(path.join(dir, 'pnpm-workspace.yml'))
    const pkgPath = path.join(dir, 'package.json')
    if (hasWorkspace && fs.existsSync(pkgPath)) {
      try {
        const name = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).name
        if (typeof name === 'string' && name) {
          const head = name.startsWith('@') ? name.slice(1).split('/')[0]! : name
          return toScope(head)
        }
      } catch {
        // ignore malformed package.json and keep walking up
      }
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return undefined
}

/** Recursively read a directory into the nested `files` shape, applying a text transform. */
export function readTree(dir: string, transform: (relPath: string, content: string) => string, base = dir): Tree {
  const out: Tree = {}
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    const name = RENAME[entry.name] ?? entry.name
    if (entry.isDirectory()) {
      out[name] = readTree(abs, transform, base)
    } else {
      const rel = path.relative(base, abs)
      out[name] = transform(rel, fs.readFileSync(abs, 'utf8'))
    }
  }
  return out
}

/** Set a nested path (e.g. "packages/ui/components.json") in a Tree. */
export function setPath(tree: Tree, relPath: string, content: string): void {
  const parts = relPath.split('/')
  let node = tree
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!
    if (typeof node[key] !== 'object') node[key] = {}
    node = node[key] as Tree
  }
  node[parts[parts.length - 1]!] = content
}

/** Parse, mutate and re-serialize a JSON file already present in a Tree. */
export function patchJson(tree: Tree, relPath: string, mutate: (json: any) => void): void {
  const parts = relPath.split('/')
  let node = tree
  for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]!] as Tree
  const key = parts[parts.length - 1]!
  const json = JSON.parse(node[key] as string)
  mutate(json)
  node[key] = `${JSON.stringify(json, null, 2)}\n`
}

/** Replace `catalog:` specifiers with concrete versions from `catalog` across a parsed package.json. */
export function resolveCatalogDeps(pkg: any, catalog: Record<string, string> = CATALOG): void {
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const deps = pkg[field]
    if (!deps) continue
    for (const [name, range] of Object.entries(deps)) {
      if ((range === 'catalog:' || range === 'catalog:default') && catalog[name]) deps[name] = catalog[name]
    }
  }
}

/** Merge the chosen icon library's dependency into a parsed package.json's `dependencies`. */
export function addIconDeps(pkg: any, iconLibrary: string): void {
  const iconDeps = ICON_LIBS[iconLibrary] ?? ICON_LIBS.hugeicons
  pkg.dependencies = { ...pkg.dependencies, ...iconDeps }
}

// ─── Validators for user-influenced option values ────────────────────────────
// Post-scaffold steps run WITHOUT a shell (see `runTemplateCLI`), so shell injection is structurally
// impossible. These keep the genuinely user-controlled fields to argv-safe shapes anyway: every value
// must start with an alphanumeric (never `-`, which a child CLI would read as a flag) and carry no
// whitespace or shell metacharacters. Each returns an error message, or undefined when valid — the
// shape `OptionDescriptor.validate` expects, so they guard both CLI flags and interactive prompts.

/** A lowercase-ish npm scope or package name: `@acme`, `acme`, `@acme/app`. */
export function validateScope(value: string): string | undefined {
  return /^@?[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value.trim()) ? undefined : 'must be a package scope/name, e.g. @acme'
}

/** A project / package name: same argv-safe shape as a scope. */
export function validateName(value: string): string | undefined {
  return /^@?[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value.trim()) ? undefined : 'must be a package name, e.g. my-app or @acme/app'
}

/** A shadcn preset: a style name or a ui.shadcn.com code (letters, digits, `-`, `_`). */
export function validatePreset(value: string): string | undefined {
  return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value.trim()) ? undefined : 'must be a style name or ui.shadcn.com code'
}

/** A comma-separated shadcn component list, each name lowercase letters/digits/`-`. */
export function validateComponents(value: string): string | undefined {
  const parts = value.split(',').map((c) => c.trim()).filter(Boolean)
  return parts.every((c) => /^[a-z0-9][a-z0-9-]*$/.test(c)) ? undefined : 'comma-separated component names, e.g. button,card,dialog'
}

/** Expand a comma-separated component list, always including `required` ones so the starter compiles. */
export function withRequiredComponents(csv: string, required: string[] = ['button', 'badge']): string[] {
  const requested = csv
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
  return Array.from(new Set([...required, ...requested]))
}

export type ShadcnTheme = {
  scope: string
  base: string
  cssVariables: boolean
  iconLibrary: string
  rtl: boolean
}

/**
 * `components.json` for the shared `ui` package. The shadcn preset (applied by `shadcn init`) is
 * authoritative for the theme; these baked values only seed the paths, base and icon library that
 * `init` needs up front. `init` rewrites the `ui` alias to `<scope>/ui/components/ui`, so
 * `shadcn add` writes to src/components/ui/*, resolved through the package `exports` map.
 */
export function uiComponentsJson(theme: ShadcnTheme): object {
  const { scope, base, cssVariables, iconLibrary, rtl } = theme
  return {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: `${base}-nova`,
    rsc: false,
    tsx: true,
    tailwind: { config: '', css: './src/styles/globals.css', baseColor: 'neutral', cssVariables },
    iconLibrary,
    rtl,
    base,
    aliases: {
      components: `${scope}/ui/components`,
      ui: `${scope}/ui/components`,
      lib: `${scope}/ui/lib`,
      utils: `${scope}/ui/lib/utils`,
      hooks: `${scope}/ui/hooks`
    }
  }
}

/** `components.json` for a consuming app (its own components live under `@/`, ui sourced from `<scope>/ui`). */
export function appComponentsJson(theme: ShadcnTheme & { cssPath: string }): object {
  const { scope, base, cssVariables, iconLibrary, rtl, cssPath } = theme
  return {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: `${base}-nova`,
    rsc: false,
    tsx: true,
    tailwind: { config: '', css: cssPath, baseColor: 'neutral', cssVariables },
    iconLibrary,
    rtl,
    aliases: {
      components: '@/components',
      hooks: '@/hooks',
      lib: '@/lib',
      utils: `${scope}/ui/lib/utils`,
      ui: `${scope}/ui/components`
    }
  }
}

export type ShadcnInitOpts = {
  base: string
  preset: string
  cssVariables: boolean
  rtl: boolean
  pointer: boolean
}

/**
 * Build the `shadcn init` argv shared by both generators. Returns a flat argument array (not a shell
 * string) so each value — including the user-supplied `--preset` — is passed as one literal token to
 * `execFileSync` with no shell, leaving no room for command injection.
 */
export function shadcnInitArgs(opts: ShadcnInitOpts): string[] {
  return [
    '--base', opts.base,
    '--preset', opts.preset,
    opts.cssVariables ? '--css-variables' : '--no-css-variables',
    opts.rtl ? '--rtl' : '--no-rtl',
    opts.pointer ? '--pointer' : '--no-pointer',
    '--no-reinstall',
    '-y',
    '-f'
  ]
}

// ─── Generator runtime ───────────────────────────────────────────────────────
// A small, self-contained replacement for the slice of Bingo these generators used:
// parse argv → resolve options (defaults + prompts) → produce() → write files →
// run post-scaffold scripts by phase → git init. Keeps generators free of Bingo (and
// of Zod), so their CLIs and prompt UX are owned here.

/** A single CLI option. `select` restricts to `choices` (no invalid value possible). */
export type OptionType = 'string' | 'boolean' | 'select'

/** Context passed to a dynamic `default`, so an option can derive from earlier answers and the target dir. */
export interface DefaultContext<O> {
  /** Options resolved so far (declaration order), so e.g. `scope` can read `name`. */
  options: Partial<O>
  /** The chosen target directory (e.g. so `name` can default to the folder the user typed). */
  directory: string
}

export interface OptionDescriptor<O = Record<string, unknown>> {
  key: string
  type: OptionType
  /** Prompt message, also used as the `--help` description. */
  message: string
  /** A static default, or one derived from earlier answers / the target directory. */
  default?: string | boolean | ((context: DefaultContext<O>) => string | boolean)
  /** Allowed values for `type: 'select'`. */
  choices?: readonly string[]
  /** Validate a string/select value (CLI flag *and* prompt). Return an error message, or undefined if valid. */
  validate?: (value: string) => string | undefined
}

/**
 * A batch of commands to run after scaffolding; lower `phase` runs first. Each command is an argv
 * array — `[program, ...args]` — run directly with no shell, so user-derived args can never be
 * interpreted as shell syntax. e.g. `['pnpm', '--filter', '@acme/ui', 'exec', 'shadcn', 'add', 'button']`.
 */
export interface Script {
  commands: string[][]
  phase: number
}

/** What a template's `produce()` returns. */
export interface Creation {
  files: Tree
  scripts?: Script[]
  suggestions?: string[]
}

export interface TemplateConfig<O> {
  about?: { name?: string; description?: string }
  options: readonly OptionDescriptor<O>[]
  /** Whether to `git init` + initial commit after scaffolding. Default true; skipped inside an existing repo. */
  git?: boolean
  produce: (context: { options: O }) => Creation | Promise<Creation>
}

export type Template<O = Record<string, unknown>> = TemplateConfig<O>

/** Identity factory: keeps `options`/`produce` on the returned object for both the runtime and the smoke tests. */
export function defineTemplate<O>(config: TemplateConfig<O>): TemplateConfig<O> {
  return config
}

/** Write a nested `files` tree to disk under `dir`, never escaping the target root. */
export function writeTree(node: Tree, dir: string, root: string = path.resolve(dir)): void {
  for (const [name, value] of Object.entries(node)) {
    const p = path.resolve(dir, name)
    // Guard against a tree key like `..` or an absolute path writing outside the chosen target
    // directory: the resolved destination must stay within `root`.
    const rel = path.relative(root, p)
    if (rel === '' || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
      throw new Error(`Refusing to write outside the target directory: ${name}`)
    }
    if (typeof value === 'string') {
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.writeFileSync(p, value)
    } else {
      fs.mkdirSync(p, { recursive: true })
      writeTree(value, p, root)
    }
  }
}

/** Minimal argv parser: `--key value`, `--key=value`, boolean `--key` / `--no-key`. */
function parseArgv(argv: string[], descriptors: readonly OptionDescriptor<any>[]): { values: Record<string, string | boolean>; directory?: string } {
  const booleanKeys = new Set(descriptors.filter((d) => d.type === 'boolean').map((d) => d.key))
  const values: Record<string, string | boolean> = {}
  let directory: string | undefined

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (!arg.startsWith('--')) continue
    let body = arg.slice(2)

    // Boolean negation: `--no-install` → install=false.
    if (body.startsWith('no-') && booleanKeys.has(body.slice(3))) {
      values[body.slice(3)] = false
      continue
    }

    let inline: string | undefined
    const eq = body.indexOf('=')
    if (eq !== -1) {
      inline = body.slice(eq + 1)
      body = body.slice(0, eq)
    }

    if (body === 'directory') {
      directory = inline ?? argv[++i]
      continue
    }
    if (booleanKeys.has(body)) {
      values[body] = inline === undefined ? true : inline !== 'false'
      continue
    }
    values[body] = inline ?? argv[++i] ?? ''
  }

  return { values, directory }
}

function resolveDefault<O>(d: OptionDescriptor<O>, options: Partial<O>, directory: string): string | boolean | undefined {
  return typeof d.default === 'function' ? d.default({ options, directory }) : d.default
}

/** Render the right clack prompt for an option, pre-filled with its default. */
async function promptForOption(d: OptionDescriptor<any>, def: string | boolean | undefined): Promise<string | boolean | symbol> {
  if (d.type === 'boolean') {
    return prompts.confirm({ message: d.message, initialValue: def === undefined ? false : Boolean(def) })
  }
  if (d.type === 'select') {
    return prompts.select({
      message: d.message,
      options: (d.choices ?? []).map((c) => ({ value: c, label: c })),
      initialValue: def as string | undefined
    }) as Promise<string | symbol>
  }
  const fallback = def === undefined ? undefined : String(def)
  return prompts.text({
    message: d.message,
    placeholder: fallback,
    defaultValue: fallback,
    // When a default exists, an empty submit means "use the default" — don't run validation on it,
    // otherwise a rule like the port check would reject pressing Enter to accept 3000.
    validate: d.validate ? (value) => (!value && fallback !== undefined ? undefined : d.validate!(value ?? '')) : undefined
  }) as Promise<string | symbol>
}

function printHelp(template: TemplateConfig<any>): void {
  const lines: string[] = []
  if (template.about?.name) lines.push(template.about.name)
  if (template.about?.description) lines.push(template.about.description)
  lines.push('', 'Options:', '  --directory <dir>      Where to scaffold')
  for (const d of template.options) {
    const hint =
      d.type === 'select' && d.choices ? ` <${d.choices.join('|')}>` : d.type === 'boolean' ? ` / --no-${d.key}` : ' <value>'
    lines.push(`  --${d.key}${hint}      ${d.message}`)
  }
  console.log(lines.join('\n'))
}

/** `git init` + an initial commit, unless the target is already inside a git repo. */
function initGit(dir: string): void {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: dir, stdio: 'ignore' })
    return // already inside a repo — leave it alone
  } catch {
    // not a repo: fall through and initialize one
  }
  try {
    execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' })
    execFileSync('git', ['add', '-A'], { cwd: dir, stdio: 'ignore' })

    // Supply a fallback identity only when the environment has none, so the initial commit never fails
    // on a freshly-set-up machine without overriding a user's configured name/email.
    let identity: string[] = []
    try {
      execFileSync('git', ['config', 'user.email'], { cwd: dir, stdio: 'ignore' })
    } catch {
      identity = ['-c', 'user.name=create', '-c', 'user.email=create@users.noreply.github.com']
    }
    execFileSync('git', [...identity, 'commit', '-m', 'feat: initialize project', '--no-gpg-sign'], { cwd: dir, stdio: 'ignore' })
  } catch {
    // git is optional; never fail the scaffold over it
  }
}

/**
 * Run a template as an interactive CLI: resolve options from flags + prompts, scaffold the file tree,
 * run its post-scaffold scripts, and (unless disabled) initialize a git repo. Returns the exit status
 * (0 success, 1 error, 2 cancelled).
 */
export async function runTemplateCLI<O>(template: TemplateConfig<O>): Promise<number> {
  const argv = process.argv.slice(2)

  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp(template)
    return 0
  }

  const interactive = Boolean(process.stdout.isTTY) && !argv.includes('--no-interactive')
  const { values, directory: dirArg } = parseArgv(argv, template.options)

  prompts.intro(template.about?.name ?? 'create')

  // Resolve the target directory.
  let directory = dirArg
  if (!directory) {
    if (interactive) {
      const answer = await prompts.text({ message: 'Where should we create your project?', placeholder: 'my-app', defaultValue: 'my-app' })
      if (prompts.isCancel(answer)) {
        prompts.cancel('Cancelled.')
        return 2
      }
      directory = answer || 'my-app'
    } else {
      directory = 'my-app'
    }
  }

  // Resolve options in declaration order so later defaults can read earlier answers.
  const options: Record<string, unknown> = {}
  for (const d of template.options) {
    const def = resolveDefault(d, options as Partial<O>, directory)

    if (d.key in values) {
      const value = values[d.key]!
      if (d.validate && typeof value === 'string') {
        const error = d.validate(value)
        if (error) {
          prompts.cancel(`Invalid --${d.key}: ${error}`)
          return 1
        }
      }
      options[d.key] = value
      continue
    }

    if (interactive) {
      const answer = await promptForOption(d, def)
      if (prompts.isCancel(answer)) {
        prompts.cancel('Cancelled.')
        return 2
      }
      // An empty text submit falls back to the default (e.g. accepting the placeholder port).
      options[d.key] = answer === '' && def !== undefined ? def : answer
    } else {
      options[d.key] = def
    }
  }

  const creation = await template.produce({ options: options as O })

  writeTree(creation.files, directory)

  if (creation.scripts?.length) {
    for (const step of [...creation.scripts].sort((a, b) => a.phase - b.phase)) {
      for (const [program, ...commandArgs] of step.commands) {
        if (!program) continue
        // No shell: the program and each argument are passed literally, so user-derived values
        // (scope, preset, component names) can never be parsed as shell syntax.
        execFileSync(program, commandArgs, { cwd: directory, stdio: 'inherit' })
      }
    }
  }

  if (template.git !== false) initGit(directory)

  if (creation.suggestions?.length) {
    prompts.note(creation.suggestions.join('\n'), 'Next steps')
  }
  prompts.outro('Done!')
  return 0
}
