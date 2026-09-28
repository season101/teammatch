# Build context is the repo root so packages/api-client is available.
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo/frontend

FROM base AS deps
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# local dev: frontend/ and packages/ are bind-mounted
FROM deps AS dev
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]

FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
# baked into the rewrites at build time; prod service name
ARG API_INTERNAL_URL=http://teammatch-api:8000
ENV API_INTERNAL_URL=$API_INTERNAL_URL
COPY packages /repo/packages
COPY frontend /repo/frontend
RUN pnpm build

FROM node:24-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /repo/frontend/.next/standalone ./
COPY --from=build --chown=node:node /repo/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=node:node /repo/frontend/public ./frontend/public
USER node
EXPOSE 3000
CMD ["node", "frontend/server.js"]
