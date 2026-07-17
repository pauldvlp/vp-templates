# Security Policy

## Reporting a vulnerability

Please report security issues **privately**, not as a public issue:

- **GitHub Security Advisories** (preferred) — [open a private advisory](https://github.com/pauldvlp/vp-templates/security/advisories/new)
- **Email** — johanpaulbarahona@gmail.com

You'll get an acknowledgement within 72 hours.

## Supported versions

All packages here are pre-1.0 and released independently. Only the latest published
version of each package is supported; fixes ship forward, not as backports.

## Scope

This repo publishes **project generators**. That shapes what counts as a vulnerability:

**In scope**

- Arbitrary code execution triggered by running a generator (`vp create @pauldvlp/vp-*`),
  including via crafted answers to its prompts.
- Path traversal — a generator writing outside the target directory.
- A generated project that ships a credential, a backdoor, or an insecure-by-default
  configuration that a reasonable developer wouldn't expect.
- Anything that would let a published package's contents be replaced without a
  maintainer's release (supply-chain integrity of this repo's own publishing).

**Out of scope**

- Vulnerabilities in the _dependencies a generated project installs_ — those belong
  upstream. Templates use version ranges, so a fresh generate pulls the current release;
  `template-install.yml` sweeps them weekly against the live registry.
- Vulnerabilities in Vite+, shadcn, NestJS, Hono or any other tool a template wires up.
  Report those to the respective project.
- Issues that require an attacker to already control the machine running the generator.

## Publishing integrity

Every package is published from CI via **npm trusted publishing (OIDC)** — there is no
long-lived npm token to steal, and each release carries provenance attestation. If you
see a version on npm without provenance pointing at this repo, treat it as suspicious
and report it.
