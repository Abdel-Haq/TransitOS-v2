# One image, three entrypoints. API, worker and web run the same build, so a version
# skew between them is not possible.
#
# No bind mounts in compose: the container runs what CI built. For a fast inner loop,
# run `docker compose up` for the dependencies and `pnpm dev` on the host — see
# docs/RUNBOOK.md. Release images are built from a reviewed commit at Phase 5.2
# (19-security-operations-delivery.md, release procedure).

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/domain/package.json packages/domain/
COPY packages/ui/package.json packages/ui/
COPY packages/adapters/package.json packages/adapters/
COPY db/package.json db/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm -r --filter '!@dc/web' build
RUN pnpm --filter @dc/web build

FROM build AS api
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]

FROM build AS worker
ENV NODE_ENV=production
CMD ["node", "apps/worker/dist/main.js"]

FROM build AS web
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "@dc/web", "start"]

# The migration job of 19-…:65, run separately from API startup and never by it.
FROM build AS migrate
CMD ["pnpm", "--filter", "@dc/db", "migrate"]
