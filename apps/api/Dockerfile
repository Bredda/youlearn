# syntax=docker/dockerfile:1
# Build from the repository root: docker build -f apps/api/Dockerfile .
# The same image runs the API (default command) and the one-shot migrations (`node dist/migrate.mjs`).

FROM node:24-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH HUSKY=0 CI=true
RUN npm install --global pnpm@12.3.4
WORKDIR /repo
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter api build
# Production dependencies only (workspace packages are bundled into dist by tsdown).
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm --filter api deploy --prod /out
# better-auth lists Next.js among its optional peers and pnpm resolves it into this graph; nothing here imports it.
RUN cd /out/node_modules/.pnpm \
    && rm -rf next@* @next+* @img+* @rolldown+* @esbuild+* esbuild@* drizzle-kit@* typescript@*

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
COPY --from=build --chown=node:node /repo/packages/db/drizzle ./drizzle
USER node
EXPOSE 3001
CMD ["node", "dist/index.mjs"]
