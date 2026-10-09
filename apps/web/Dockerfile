# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv
# Build from the repository root: docker build -f apps/web/Dockerfile .
# `API_URL` is baked in at build time (Next.js freezes the rewrites to the API), see issue #32.

FROM node:24-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH HUSKY=0 CI=true NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@12.3.4
WORKDIR /repo
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
ARG API_URL=http://api:3001
ARG WEB_URL=http://localhost:3000
# `@youlearn/config` validates the whole environment as soon as next.config.ts imports it. Only well-formed
# placeholders are needed here (nothing is contacted while building); they live in this stage only, not in the
# final image (hence the skipped secrets check above).
ENV API_URL=$API_URL \
    WEB_URL=$WEB_URL \
    DATABASE_URL=postgres://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-only-secret-not-used-anywhere-0123456789 \
    S3_ENDPOINT=http://localhost:9000 \
    S3_BUCKET=youlearn-build \
    S3_ACCESS_KEY=BUILD \
    S3_SECRET_KEY=BUILD
RUN pnpm --filter web build

FROM node:24-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
