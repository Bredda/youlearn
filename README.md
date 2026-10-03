# YouLearn

Learning platform: **courses** (and soon programs) whose visibility depends on the **groups** an administrator gives
each user. There is no sign-up: administrators create the accounts.

## Project status

| Feature | Status |
|---|---|
| Accounts, roles (user, writer, admin), groups, event log | available |
| Writer area: courses, revisions (draft → preview → published → deprecated), Markdown lesson editor, images, review link | available |
| Learner catalog: published courses visible to the user, with search, filters, sorting and pagination | available (cards have no action yet) |
| Reading a course, enrollment and progress, programs, videos and large files | planned |

User documentation (in French) lives in [`docs/`](docs/README.md).

## Stack

- **pnpm 12 + Turborepo** monorepo, TypeScript everywhere.
- **Web**: Next.js 16 (App Router), shadcn/ui (base-ui), Tailwind 4, TanStack Form and Table.
- **API**: Fastify 5, Better Auth (admin plugin), zod.
- **Data**: PostgreSQL 18 with drizzle-orm; files in object storage through the S3 API (RustFS in development).
- **Quality**: Biome (lint and format), Husky (Git hooks).

## Requirements

Node.js 24 or later, pnpm 12, Docker (PostgreSQL and the S3 storage run with `docker compose`).

## Getting started

```sh
cp .env.example .env     # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
                         # and ADMIN_EMAIL / ADMIN_PASSWORD to create the first administrator
pnpm install
pnpm db:up               # PostgreSQL + S3 storage (docker/compose.yml, reads .env)
pnpm db:migrate          # apply the migrations
pnpm dev                 # web on :3000 and API on :3001
```

Open <http://localhost:3000> and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. When it starts, the API creates the
administrator if missing, the "Commun" system group, the groups listed in `DEFAULT_GROUPS` (first install only) and the
storage buckets. The storage console is at <http://localhost:9001>.

Every environment variable is described, with its default, in [`.env.example`](.env.example). `.env` is read at process
start: restart `pnpm dev` after changing it.

## Commands

Run them all from the repository root.

| Command | Purpose |
|---|---|
| `pnpm dev` | web and API in development mode |
| `pnpm build` | build every project |
| `pnpm check-types` | `tsc` in every project |
| `pnpm test` | unit tests (Vitest) of every project that has some |
| `pnpm lint:ci` | Biome on the whole repository, read-only |
| `pnpm format` | format the repository with Biome |
| `pnpm db:up` / `pnpm db:down` | start / stop PostgreSQL and the storage |
| `pnpm db:generate` | generate a migration after a schema change (`packages/db/src/schema`) |
| `pnpm db:migrate` | apply the migrations |
| `pnpm db:studio` | drizzle studio to browse the database |
| `pnpm --filter @youlearn/auth seed:admin` | create the administrator from `ADMIN_*` (the API already does it at startup) |

### Tests

Unit tests use [Vitest](https://vitest.dev) and sit next to the code (`*.test.ts`). They cover the pure logic only
(permission rules, slugs, content validation, image sniffing, the revision workflow, roles, URL state of the tables):
no database, no storage, no `.env`. Routes and pages are still checked by running them (`curl` with a session cookie).
Run one project with `pnpm --filter api test`, or watch with `pnpm --filter api exec vitest`.

### Git hooks

`pnpm install` sets up the Husky hooks. On commit, Biome fixes and formats the staged files; on push, `pnpm lint:ci`
then `pnpm check-types` and `pnpm test` must pass. When a hook fails, fix the cause rather than bypassing it.

### Continuous integration

`.github/workflows/ci.yml` runs the same three checks (`lint:ci`, `check-types`, `test`) with GitHub Actions on every push
to `main` and `dev` and on every pull request. It starts from a clean checkout with placeholder environment values, so it
needs no secret, database or storage.

## Repository layout

| Path | Role |
|---|---|
| `apps/web` | Next.js: the user interface (pages, forms, tables) |
| `apps/api` | Fastify: Better Auth on `/api/auth/*`, routes `/api/admin/*`, `/api/writer/*`, `/api/courses`, `/api/review/*` and course files |
| `packages/config` | loads the root `.env`, validates it with zod and exports `env` |
| `packages/db` | drizzle client, schema and migrations |
| `packages/storage` | S3 client for course files |
| `packages/events` | event log registry and recording |
| `packages/auth` | Better Auth instance, browser client, roles, administrator seed |
| `packages/types` | types shared by the API and the web app |
| `packages/typescript-config`, `packages/biome-config` | shared configurations |
| `docs` | user documentation |

Packages ship TypeScript sources with no build step: the web app consumes them through `transpilePackages`, the API
bundles them with tsdown.

## Contributing

Detailed conventions (UI, API, courses domain) are in [`AGENTS.md`](AGENTS.md) and in the skills under
[`.claude/skills/`](.claude/skills). The essentials:

- UI copy is in **French**; code, identifiers and comments are in **English**;
- commits follow Conventional Commits (`feat:`, `fix:`...), and `.env` is never committed;
- an applied migration is never edited: generate a new one;
- the app never deletes a stored file for good: it moves it to the "deprecated" bucket.
