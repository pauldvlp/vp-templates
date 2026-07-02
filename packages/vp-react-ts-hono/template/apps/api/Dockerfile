# Multi-stage image for @app/api. The build context must be the MONOREPO ROOT (the api is built from
# the whole workspace), e.g. from the repo root:
#
#   docker build -f apps/api/Dockerfile -t app-api .
#
# This is a pragmatic starting point — it ships the full installed workspace. For a slimmer image,
# look at `pnpm deploy --filter @app/api --prod`.
FROM node:22-slim AS build
# CI=true: pnpm purges a stale modules dir non-interactively instead of aborting (no TTY in a build).
# The prompt-disable lets corepack fetch pnpm without asking.
ENV CI=true
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# vite-plus's native core initializes an HTTPS client on startup and panics without system CA certs,
# which the -slim image omits.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo
COPY . .
# --ignore-scripts skips the `prepare` git-hooks lifecycle script (added when you opt into pre-commit
# hooks at `vp create`), which needs git/a repo and is pointless in an image. The build needs no
# install scripts.
RUN pnpm install --frozen-lockfile --ignore-scripts
# Build the whole workspace so apps/web/dist exists too (needed when the api serves the web app).
RUN pnpm -r run build

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /repo
# The api externalizes its dependencies in the SSR build, so node_modules must be present at runtime.
COPY --from=build /repo ./
EXPOSE __API_PORT__
CMD ["node", "apps/api/dist/main.js"]
