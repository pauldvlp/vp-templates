<p align="center">
  <img src="https://raw.githubusercontent.com/pauldvlp/vp-templates/main/assets/cover.webp" alt="@pauldvlp/vp-templates" width="100%" />
</p>

# @pauldvlp/create

The org manifest for [`@pauldvlp/vp-templates`](../../). `vp create @pauldvlp` reads the
`createConfig.templates` array in `package.json` and offers each entry.

```bash
vp create @pauldvlp                     # interactive picker
vp create @pauldvlp:vp-react-ts-shadcn  # run an entry directly, forwarding options after --
vp create @pauldvlp:vp-react-ts-shadcn -- --name my-app --base base --preset vega
vp create @pauldvlp:vp-pkg-shadcn       # add packages/ui into an existing repo
```

## Entries

| Entry                | Template (npm package)         | New project? | Description                                          |
| -------------------- | ------------------------------ | ------------ | ---------------------------------------------------- |
| `vp-react-ts-shadcn` | `@pauldvlp/vp-react-ts-shadcn` | yes          | Vite+ monorepo: website app + shared shadcn UI       |
| `vp-pkg-shadcn`      | `@pauldvlp/vp-pkg-shadcn`      | no           | Add a shared shadcn UI package into an existing repo |

To add an entry: publish the generator package, then append `{ name, description, template, monorepo? }`
to `createConfig.templates`, bump the version, and republish this package. `monorepo: true` marks a
new-project scaffold (hidden inside existing monorepos); omit it for "add into an existing repo"
generators. See the [root README](../../README.md#naming-convention-how-it-grows) for the convention.
